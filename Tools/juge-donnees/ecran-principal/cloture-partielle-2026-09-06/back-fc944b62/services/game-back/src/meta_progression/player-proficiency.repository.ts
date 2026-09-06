// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (`DelegationRatchetModule`
//             scaffold — module + repositories) + C7 ("`PlayerProficiencySeeder` ← `GraduationCommittedEvent`:
//             frozen copy of mastery at graduation (D8)"; "`RecallDebtSessionSubscriber` ← `SessionClosedEvent`:
//             accrual per DELEGATED category — `LEAST(cap, …)` + `last_accrued_session_id` idempotency guard
//             …; recovery decrement (rows > 0) + `RecallDebtRecoveredEvent` at zero").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §3 (`player_
//             proficiency` — frozen-then-realized per (player,category), D8/D9) + §10.1 (freeze) + §10.2
//             (accrual) + §10.4 (recovery decrement).
//             Decisions: D8 (frozen mastery copy) / D9 (session-close subscriber, no scheduler slot,
//             no Redis) / D14 (idempotency day-keyed / event-keyed — "the accrual UPDATE is guarded by a
//             `last_accrued_session_id` column so a replayed event is a zero-write").
//             Pattern (winner-gate atomic conditional UPDATE … RETURNING, single statement, no read-then-
//             write): `mastery-score.repository.ts#flipToDelegated` (THIS lot's own C5 precedent — the
//             SAME idiom, here guarding on `last_accrued_session_id IS DISTINCT FROM` instead of
//             `delegation_state = 'SELF'`). Pattern (set-based `UPDATE … FROM … WHERE …`, parameterized,
//             never a per-row loop): `buffer-bloat.repository.ts#applyEstimates`/`#syncBufferLoad`.
//             -- P3-F C1 -- 2026-07-18 (scaffold) / C7 -- 2026-07-19 (freeze/accrual/recovery writers)
//
// `PlayerProficiencyRepository` — the ONLY write path onto `player_proficiency` (mig 0135). Three writers,
// each a SINGLE atomic statement (0-TOCTOU, no read-then-write — the task's own mandate):
//   1. `freezeAtGraduation` — the D8 freeze INSERT (upsert, since a re-graduation after a FUTURE C8 recall
//      hits an EXISTING row — a fresh freeze always resets debt/recovery/guard to their zero state, this
//      is a NEW competence snapshot, not an accrual).
//   2. `accrueForSession` — the D9/D14 accrual UPDATE: set-based over EVERY `DELEGATED` category of the
//      player in ONE statement (`UPDATE … FROM mastery_score …`), `LEAST(cap, …)`, guarded by
//      `last_accrued_session_id IS DISTINCT FROM sessionId` (DB-level — the concurrency proof, never
//      app-checked).
//   3. `decrementRecoveryForSession` — the D9/§10.4 recovery-decrement UPDATE: set-based over every row
//      with `recovery_period_remaining > 0`, guarded by the SAME idempotency column (a row is EITHER
//      accruing (DELEGATED) OR recovering (SELF, post-recall) — never both at once per the design's own
//      state machine, so ONE shared guard column correctly serializes both operations per session).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProficiency, type PlayerProficiencyRow } from '../db/schema/delegation_ratchet';
import { masteryScore } from '../db/schema/player_progression_state';

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom —
 *  `cue-stack-execution.repository.ts#rowsOf`, copied verbatim per convention: no shared extraction
 *  across repositories). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** One row's post-write state, as `RETURNING` reports it — the accrual/recovery writers' own proof
 *  surface (the caller never needs a second read to know what actually moved). */
export interface CategoryValueRow {
  readonly categoryId: number;
  readonly value: number;
}

@Injectable()
export class PlayerProficiencyRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-F C3 — the player projection's `recovery` field (design §11): the (player, category) row, or `null`
   * if none. A pure read, NEVER lazy-seeds a row (mirrors `LieutenantProjectionService`'s own autonomy/
   * signal-drift/standing-order "never lazy-seed" projection discipline).
   */
  async getRow(playerId: string, categoryId: number): Promise<PlayerProficiencyRow | null> {
    const rows = await this.db
      .select()
      .from(playerProficiency)
      .where(and(eq(playerProficiency.player_id, playerId), eq(playerProficiency.category_id, categoryId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * D8 freeze — `PlayerProficiencySeeder`'s ONLY write. `ON CONFLICT (player_id, category_id) DO UPDATE`:
   * the common case (this category's FIRST graduation) is a plain INSERT; a re-graduation after a future
   * C8 recall (the SAME PK, an EXISTING row from the prior cycle) gets a genuinely FRESH snapshot — the
   * frozen `player_proficiency` value is overwritten with the NEW `mastery_at_event`, and `recall_debt_
   * total`/`recovery_period_remaining`/`last_accrued_session_id` all reset to their zero/NULL starting
   * state (a new delegation cycle starts with zero accrued debt — design §10.3's own "the debt is
   * REALIZED... re-delegation restarts naturally at 0" reasoning, applied here to the freeze side of the
   * SAME state machine). Single statement, no read-then-write.
   */
  async freezeAtGraduation(playerId: string, categoryId: number, masteryAtEvent: number): Promise<void> {
    await this.db
      .insert(playerProficiency)
      .values({ player_id: playerId, category_id: categoryId, player_proficiency: masteryAtEvent })
      .onConflictDoUpdate({
        target: [playerProficiency.player_id, playerProficiency.category_id],
        set: {
          player_proficiency: masteryAtEvent,
          recall_debt_total: 0,
          recovery_period_remaining: 0,
          last_accrued_session_id: null,
          updated_at: sql`now()`,
        },
      });
  }

  /**
   * D9/D14 accrual — ONE set-based atomic `UPDATE … FROM mastery_score … WHERE …` over EVERY `DELEGATED`
   * category of `playerId`, guarded by `last_accrued_session_id IS DISTINCT FROM sessionId` (DB-level —
   * the task's own concurrency mandate: enforced in the atomic UPDATE's WHERE clause, never app-checked).
   * A replayed `SessionClosedEvent` for a sessionId this row already stamped matches ZERO rows (D14 — "a
   * replayed event is a zero-write"). `cap` is the LIVE `meta.recall_debt_max` getter value (never a
   * re-derived constant — hot-reload safe, D9). Returns the categories that ACTUALLY moved (empty array
   * on a genuine no-op: no DELEGATED category, or every DELEGATED row already stamped THIS sessionId).
   */
  async accrueForSession(playerId: string, sessionId: string, accum: number, cap: number): Promise<CategoryValueRow[]> {
    const result = await this.db.execute(sql`
      UPDATE ${playerProficiency} AS pp
      SET recall_debt_total = LEAST(${cap}::smallint, pp.recall_debt_total + ${accum}::smallint),
          last_accrued_session_id = ${sessionId}::uuid,
          updated_at = now()
      FROM ${masteryScore} AS ms
      WHERE pp.player_id = ms.player_id
        AND pp.category_id = ms.category_id
        AND pp.player_id = ${playerId}::uuid
        AND ms.delegation_state = 'DELEGATED'
        AND pp.last_accrued_session_id IS DISTINCT FROM ${sessionId}::uuid
      RETURNING pp.category_id AS category_id, pp.recall_debt_total AS value
    `);
    return rowsOf(result).map((r) => ({ categoryId: Number(r.category_id), value: Number(r.value) }));
  }

  /**
   * D9/§10.4 recovery decrement — ONE set-based atomic UPDATE over every row of `playerId` with
   * `recovery_period_remaining > 0`, guarded by the SAME `last_accrued_session_id` idempotency column
   * (see file header — a row is either accruing OR recovering, never both, so one shared guard column
   * correctly serializes whichever operation applies for THIS session). Returns the categories that
   * ACTUALLY decremented (empty array in the overwhelming common case — no C8 writer exists yet to ever
   * set `recovery_period_remaining > 0` on this base, so this is organically a no-op until C8 ships,
   * mirroring `PROMOTION_LOCK_TICK`'s own "organic no-op with no active windows" posture). The caller
   * emits `RecallDebtRecoveredEvent` for every returned row whose `value === 0` (badge lifts).
   */
  /**
   * P3-F C8 (design §10.3, "same tx" as the recall's §9.1 step 4) — the RECALL REALIZATION write: ONE
   * atomic UPDATE, `recall_debt_total := 0` (divergence #20 — "the debt is REALIZED — spent into the
   * recovery period"; the resulting recovery period is ALREADY computed by the caller from the debt value
   * read just before this call — the caller-side read is safe here because it happens strictly AFTER the
   * `mastery_score` winner gate has already flipped this category off `DELEGATED`, and `accrueForSession`'s
   * own WHERE clause only ever touches `DELEGATED` categories — so no concurrent accrual can race this
   * row between the read and this write, the SAME "no further writer can reach a just-won row" guarantee
   * the graduation winner gate's own post-flip sequence relies on) + `recovery_period_remaining :=
   * recoveryPeriodRemaining` (`recovery-period.ts#recoveryPeriodRemainingSessions`, computed by the
   * caller). `last_accrued_session_id` is UNTOUCHED (a real session close AFTER this recall must still be
   * able to accrue/decrement — the idempotency guard column belongs to THAT mechanism, not this one-shot
   * realization). Single statement, no read-then-write ON THIS CALL (the read that informed
   * `recoveryPeriodRemaining` already happened, safely, before this method is invoked).
   */
  async realizeAtRecall(playerId: string, categoryId: number, recoveryPeriodRemaining: number): Promise<void> {
    await this.db
      .update(playerProficiency)
      .set({ recall_debt_total: 0, recovery_period_remaining: recoveryPeriodRemaining, updated_at: sql`now()` })
      .where(and(eq(playerProficiency.player_id, playerId), eq(playerProficiency.category_id, categoryId)));
  }

  /**
   * P3-F C9 (design §10.4, D11) — the `DegradedCategoryPressureProducer`'s OWN eligibility read: every
   * (player, category) row currently RECOVERING (`recovery_period_remaining > 0`), category_id ascending
   * (deterministic — the producer's own per-category loop iterates in this exact order). A pure read,
   * NEVER lazy-seeds a row (mirrors `getRow`'s own "never lazy-seed" projection discipline) — additive,
   * no existing method touched (R7/C0-reanchor §6).
   */
  async listRecoveringForPlayer(playerId: string): Promise<CategoryValueRow[]> {
    const rows = await this.db
      .select({ category_id: playerProficiency.category_id, recovery_period_remaining: playerProficiency.recovery_period_remaining })
      .from(playerProficiency)
      .where(and(eq(playerProficiency.player_id, playerId), sql`${playerProficiency.recovery_period_remaining} > 0`))
      .orderBy(playerProficiency.category_id);
    return rows.map((r) => ({ categoryId: r.category_id, value: r.recovery_period_remaining }));
  }

  async decrementRecoveryForSession(playerId: string, sessionId: string): Promise<CategoryValueRow[]> {
    const result = await this.db.execute(sql`
      UPDATE ${playerProficiency} AS pp
      SET recovery_period_remaining = pp.recovery_period_remaining - 1,
          last_accrued_session_id = ${sessionId}::uuid,
          updated_at = now()
      WHERE pp.player_id = ${playerId}::uuid
        AND pp.recovery_period_remaining > 0
        AND pp.last_accrued_session_id IS DISTINCT FROM ${sessionId}::uuid
      RETURNING pp.category_id AS category_id, pp.recovery_period_remaining AS value
    `);
    return rowsOf(result).map((r) => ({ categoryId: Number(r.category_id), value: Number(r.value) }));
  }
}

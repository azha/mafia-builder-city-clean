// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C5 (governor `commit()`
//             seam — same-tx counter + audit-row activation)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §6 (governor) +
//             §3 (data model — `structural_decisions_audit` REUSE, `session_ref` recorded INSIDE
//             `after_state._session`, no column add) + ★ C5-fix addendum (D8, atomic reservation).
//             Decisions: §1.8 D8 (★ C5-fix, ⊥ IMPORTANT-1 — the ORIGINAL "audit rows written in the
//             SAME transaction as the mutation" prose is corrected: the reservation is now its OWN
//             atomic pre-mutation UPDATE, not part of the post-mutation same-tx write) + §1.10 D10
//             (counter REUSE).
//             Schema (R9.3 — REUSE unchanged, dormant activation): `structural_decisions_audit`
//             (`db/schema/progression_structural.ts:123-144`) + `player_progression_state.
//             structural_decisions_this_session` (`:21`) + `gameplay_sessions.structural_commits`/
//             `.decisions_made` (`db/schema/sessions_and_audit.ts:44-45`).
//             Pattern (cross-table same-tx write): `session/session.repository.ts`'s `openFresh` —
//             the SAME shape (gameplay_sessions + player_progression_state written together in ONE
//             `db.transaction`), mirrored here for the governor's post-mutation write (1 counter pair +
//             1 audit insert). Pattern (atomic conditional reservation): a SINGLE `UPDATE … WHERE …
//             RETURNING` is atomic in Postgres without needing an explicit transaction — concurrent
//             UPDATEs to the SAME row serialize via the row-level lock, so a second racer's WHERE
//             re-evaluates against the FIRST racer's already-committed increment (the ⊥ IMPORTANT-1 fix).
//             — P3-A C5 — 2026-07-10 / C5-fix (⊥ IMPORTANT-1) — 2026-07-10
//
// `StructuralDecisionGovernorRepository` — TWO seams:
//
// 1. `reserveStructuralSlot(playerId, cap)` — ★ C5-fix (⊥ IMPORTANT-1): the ATOMIC cap-check-and-claim.
//    ONE conditional `UPDATE … SET structural_decisions_this_session = structural_decisions_this_session
//    + 1 WHERE player_id = $1 AND structural_decisions_this_session < $2 RETURNING …` — the WHERE's own
//    read of the CURRENT row value and the SET's increment happen as ONE atomic statement under the
//    row's lock, closing the read-check-then-later-write race window the ORIGINAL C5 code had (a
//    separate `getStructuralDecisionsThisSession` read followed by a LATER `recordCommit` increment —
//    two concurrent callers could both read "0 < cap" before either write landed). Returns `true` iff a
//    row was actually updated (the slot was claimed); `false` iff the cap was already exhausted (zero
//    rows matched the `< cap` predicate) — the caller (governor SERVICE) 409s on `false`, WITHOUT ever
//    running `mutateFn`.
//
// 2. `compensateStructuralSlot(playerId)` — the reservation's UNDO: decrements by 1, `GREATEST(…, 0)`
//    floor (never underflows below 0 even under a pathological double-compensate). Called by the
//    governor SERVICE ONLY when a RESERVED commit's `mutateFn` throws — the reservation must not leak a
//    permanently-burned slot on a failed mutation (the C5 atomicity proof, scenario C: net counter
//    change = 0, zero audit rows, for an induced mutation failure).
//
// 3. `recordCommit(rec)` — the POST-mutation write (unchanged shape from the original C5 landing, MINUS
//    the `structural_decisions_this_session` increment — ★ C5-fix: that counter is now claimed by
//    `reserveStructuralSlot` BEFORE `mutateFn` ever runs, so this method must NOT re-increment it, or
//    every session-bound commit would double-count). Session-bound (`rec.sessionId !== null`):
//    increments `gameplay_sessions.{structural_commits,decisions_made}` (D2 analytics counters) THEN
//    inserts the `structural_decisions_audit` row — SAME transaction (still true for THIS pair).
//    Sessionless (`rec.sessionId === null`, D9 pass-through): ONLY the audit row, `after_state._session`
//    already `null` (the governor SERVICE sets it).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { playerProgressionState } from '../../db/schema/player_progression_state';
import { gameplaySessionRow } from '../../db/schema/sessions_and_audit';
import { structuralDecisionAuditRow } from '../../db/schema/progression_structural';

/** The D8 post-mutation commit-record write: `sessionId: null` ⇒ sessionless (D9) — ONLY the audit row
 *  is written. `structural_decisions_this_session` is NOT touched here (★ C5-fix — claimed earlier by
 *  `reserveStructuralSlot`). */
export interface StructuralDecisionCommitRecord {
  readonly playerId: string;
  readonly sessionId: string | null;
  /** The catalogue `code` int — written verbatim to `structural_decisions_audit.decision_type` (GDD-verbatim
   *  int raw catalogue, BO-only). */
  readonly decisionType: number;
  /** Compact before-ref (2-5 fields, NEVER a full snapshot — F4/decisions §1.8). */
  readonly before: Record<string, unknown>;
  /** Compact after-ref, ALREADY carrying `_session` (the governor SERVICE sets it — this repository
   *  writes it through verbatim; no column add, design §3). */
  readonly after: Record<string, unknown>;
  /**
   * P3-F C8 (design D7 — "the audit row carries `triggered_recall_debt=true` — the FIRST writer of the
   * dormant column P3-A left honest-false"). OPTIONAL, additive — every pre-C8 call site omits it, which
   * defaults to `false` below, BYTE-IDENTICAL to the column's own pre-C8 `default(false)` behavior (zero
   * regression: no existing structural site's audit row changes shape or value). ONLY
   * `PromotionLockService.requestRecall`'s own `TASK_RECALL` commit passes `true` — this is the ONE new
   * per-call flag P3-A itself reserved this column for (C0-reanchor §5 R10 — the column has existed,
   * honest-`false`, since P3-A; this lot is its named FIRST writer, design §1 D7).
   */
  readonly triggeredRecallDebt?: boolean;
}

@Injectable()
export class StructuralDecisionGovernorRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * ★ C5-fix (⊥ IMPORTANT-1) — ATOMIC reserve-or-refuse. See file header for the full contract.
   * `cap` is resolved by the CALLER (the D8 `structuralCapForPlayer` getter) BEFORE this call — the
   * getter itself never touches the DB row, only this UPDATE's WHERE clause does the comparison.
   */
  async reserveStructuralSlot(playerId: string, cap: number): Promise<boolean> {
    const updated = await this.db
      .update(playerProgressionState)
      .set({
        structural_decisions_this_session: sql`${playerProgressionState.structural_decisions_this_session} + 1`,
      })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          lt(playerProgressionState.structural_decisions_this_session, cap),
        ),
      )
      .returning({ n: playerProgressionState.structural_decisions_this_session });
    return updated.length > 0;
  }

  /** ★ C5-fix — the reservation's compensating decrement (mutateFn failed AFTER a successful reserve).
   *  `GREATEST(…, 0)` floors at 0 — never underflows.
   *
   *  ★ TD-204 (⊥ C5 reviewer note, allocated at C9 closeout) — this WHERE is scoped by `playerId` ONLY,
   *  not by the specific reservation being undone. If the player's session closes and a NEW one opens
   *  (resetting the counter to 0, D10) in the narrow window between a failed `mutateFn` and this
   *  decrement landing, the stale compensate hits the NEW session's counter instead of the old one —
   *  bounded by real request latency, not exercised by the existing E2E floor, not fixed this lot. A
   *  session-scoped decrement (keyed by `(player_id, session_id)`) would close it. */
  async compensateStructuralSlot(playerId: string): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({
        structural_decisions_this_session: sql`GREATEST(${playerProgressionState.structural_decisions_this_session} - 1, 0)`,
      })
      .where(eq(playerProgressionState.player_id, playerId));
  }

  async recordCommit(rec: StructuralDecisionCommitRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (rec.sessionId !== null) {
        // Session-bound: the D2 per-session analytics counters (gameplay_sessions) — SAME transaction
        // as the audit insert below. `structural_decisions_this_session` is NOT incremented here (★
        // C5-fix — `reserveStructuralSlot` already claimed it, atomically, BEFORE mutateFn ran).
        await tx
          .update(gameplaySessionRow)
          .set({
            structural_commits: sql`${gameplaySessionRow.structural_commits} + 1`,
            decisions_made: sql`${gameplaySessionRow.decisions_made} + 1`,
          })
          .where(and(eq(gameplaySessionRow.player_id, rec.playerId), isNull(gameplaySessionRow.ended_at)));
      }
      // Sessionless (rec.sessionId === null): NO counter write (D2/D9 — "no active session → counters
      // simply don't increment"); ONLY the audit row below, with `after._session` already null.

      await tx.insert(structuralDecisionAuditRow).values({
        player_id: rec.playerId,
        decision_type: rec.decisionType,
        before_state: rec.before,
        after_state: rec.after,
        // P3-F C8 — the ONE new per-call flag (see StructuralDecisionCommitRecord's own header). `?? false`
        // is BYTE-IDENTICAL to the column's pre-existing `default(false)` for every OTHER structural site.
        triggered_recall_debt: rec.triggeredRecallDebt ?? false,
      });
    });
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (org_stress
//             writes + none->warning transition I1 + deferral I6 + W/14 quiet-decay — the guarded-UPDATE
//             discipline)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.1 (clamp +
//             gel 'active', D6) + §9.2 (none->warning + deferral) + §8.3 (quiet-week decay + ★#6 floor).
//             Decisions: I1 (partial-UNIQUE, DB-enforced) ; I5 (gated upstream by SessionService's OWN
//             guarded close, subscriber-isolated) ; I6 (single guarded UPDATE, deferral_count=0 -> 1) ;
//             DD-E-schema (schema_player_progression_state.md §"Activation P3-E" — ZERO migration on
//             `player_progression_state`; the ceiling 100 is an APPLICATION clamp via `LEAST` in-SQL, the
//             floor >= 0 is the EXISTING mig 0002 CHECK, `mastery_score §4.2` precedent).
//             Pattern: `FrictionBudgetRepository.applyOrRevertPenalty` (single guarded UPDATE, exactly-once
//             transition shape) + `ReplacementOptionRepository.resolveAndClosePair` (I9 — guard-then-
//             diagnose-on-refusal, the SAME 2-step "atomic guard first, THEN a separate read to pick the
//             right 409 reason" shape this file's `diagnoseDeferralRefusal` copies) + `FlagWeeklyResetTick
//             Service`/`FlagDisciplineRepository#resetTokensToMaxForEpoch` (the epoch-guard-and-claim, SAME
//             UPDATE statement, D3 un-raceable shape this file's `applyQuietDecay` copies onto the NEW
//             `compression_decay_state` table).
//             — P3-E C6 — 2026-07-17
//
// `CompressionWeekRepository` — the ONLY writer this chunk of `player_progression_state.org_stress`/
// `compression_week_state` (activation of the 2 dormant columns) + `compression_events` (open-row
// creation, deferral bookkeeping) + `compression_decay_state` (the W/14 watermark, mig 0134). 3 guarded
// single-statement writers, each its OWN transaction:
//   - `applyStressIncrement` — the session-close update (§8.1, D6 froze via the WHERE clause itself) +,
//     conditionally, the `'none' -> 'warning'` transition + `compression_events` OPEN row (I1 — the SAME
//     transaction's own 2nd guarded UPDATE makes this exactly-once even under concurrent callers).
//   - `applyDeferral` — I6: `deferral_count 0 -> 1` AND `org_stress < forceEngagementThreshold`, BOTH IN
//     the SAME WHERE clause (a subquery — no separate read-then-decide TOCTOU window) + the +10 stress
//     bump, one transaction.
//   - `applyQuietDecay` — the W/14 epoch-guarded decay (mirrors `resetTokensToMaxForEpoch` byte-for-byte,
//     onto the NEW `compression_decay_state` table instead — DD-E-schema forbids touching
//     `player_progression_state`'s OWN schema, but writing its EXISTING `org_stress` column is untouched
//     by that ruling, only ALTERing the table is).
//
// ★ C6-fix (⊥ floor finding): `player_progression_state` is created LAZILY by `ProgressionRepository.
// ensureRow` — production only guarantees the row exists via `SessionService.open()`'s own call to it
// (session.service.ts:121, BEFORE a session can ever be opened, hence BEFORE it can ever be closed). A
// caller that reaches `org_stress`/`compression_week_state` WITHOUT that upstream guarantee (a player who
// never opened a session yet — reachable via `POST /v1/compression/defer` with a bare JWT, or a scheduler
// tick over ALL players) must not silently misbehave: an UPDATE against a missing row is a harmless
// 0-write, but `applyDeferral`'s own correlated subquery `(SELECT org_stress FROM player_progression_
// state WHERE …)` evaluates to SQL NULL against a missing row — `NULL < threshold` is NULL (neither true
// nor false), so the whole guarded WHERE clause's AND short-circuits FALSE, silently misreporting a
// genuinely-eligible (stress=0) deferral as refused. Each of the 3 public methods below now calls
// `ProgressionRepository.ensureRow` FIRST (mirrors `FrictionBudgetRepository.ensureRow`'s own established
// "each domain's tick/verb is self-sufficient, never assumes a DIFFERENT module already prepared its
// target row" precedent, friction-budget.repository.ts) — idempotent (`onConflictDoNothing`), so this is
// a correctness fix, not merely a test-fixture workaround: a player who legitimately never accumulated
// stress now deterministically reads/writes against a REAL row at its documented defaults (org_stress=0,
// compression_week_state='none'), instead of an absent row producing SQL-NULL-shaped surprises.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { playerProgressionState } from '../../db/schema/player_progression_state';
import { compressionEvent, compressionProblemEntry, compressionDecayState } from '../../db/schema/demolition_compression';
import { ProgressionRepository } from '../../progression/progression.repository';

/** The Drizzle transaction-callback client type (`money-holding.repository.ts:46`'s own local `Tx` alias
 *  precedent, extracted via `Parameters<...>` — never guessed). */
type CompressionTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export interface StressTriggered {
  readonly compressionEventId: string;
  readonly stressAtFire: number;
}

export interface StressIncrementResult {
  /** false = frozen (`compression_week_state = 'active'`, D6) or no progression row for this player yet. */
  readonly applied: boolean;
  readonly orgStressAfter: number | null;
  readonly weekStateAfter: string | null;
  /** non-null exactly when THIS call flipped `'none' -> 'warning'` (I1 exactly-once). */
  readonly triggered: StressTriggered | null;
}

export type DeferralRefusalReason = 'NO_OPEN_CYCLE' | 'DEFERRAL_EXHAUSTED' | 'FORCED_ENGAGEMENT';

export interface DeferralResult {
  readonly deferred: boolean;
  readonly reason: DeferralRefusalReason | null;
}

export interface QuietDecayResult {
  /** false = the epoch-guard matched 0 rows (already decayed this week-epoch — idempotent 0-write). */
  readonly applied: boolean;
  readonly orgStressAfter: number | null;
}

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CompressionWeekRepository {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // DemolitionModule-style cross-module EXPORT consumption (ProgressionModule EXPORTS ProgressionRepository)
    // — ★ C6-fix, see file header: each of the 3 public methods below calls `ensureRow` FIRST.
    private readonly progressionRepo: ProgressionRepository,
  ) {}

  /**
   * §8.1 session-close update. `increment` is ALREADY rounded to an integer by the caller
   * (`CompressionStressReaderService.computeIncrement`). The WHERE clause's OWN `!= 'active'` predicate
   * IS the D6 freeze (a row currently `'active'` matches 0 rows — `applied: false`, ZERO mutation, exactly
   * the "gel pendant 'active'" design requirement) — `LEAST(100, ...)` is the D17 ceiling clamp (DD-E-
   * schema: application discipline, not a NEW DB CHECK). If the post-increment `org_stress` crosses
   * `triggerThreshold` AND the row was `'none'` (not already `'warning'`/`'active'`), a 2ND guarded UPDATE
   * (`WHERE compression_week_state = 'none'`) flips the phase marker — exactly-once even under a
   * concurrent caller racing the SAME player (the 2nd racer's OWN attempt at this 2nd UPDATE matches 0
   * rows, since the 1st racer's UPDATE already committed `'warning'` inside the SAME transaction boundary)
   * — the `compression_events` OPEN row (I1 partial-UNIQUE, DB-enforced FROM THE START) is inserted ONLY
   * on the winning branch.
   */
  async applyStressIncrement(
    playerId: string,
    increment: number,
    gameMinute: number,
    triggerThreshold: number,
    decisionsBudget: number,
  ): Promise<StressIncrementResult> {
    // ★ C6-fix — guarantee the row exists BEFORE the guarded UPDATE below (see file header). Idempotent
    // (onConflictDoNothing) — a row ALREADY prepared by SessionService.open() (the common production path)
    // is untouched.
    await this.progressionRepo.ensureRow(playerId);
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(playerProgressionState)
        .set({ org_stress: sql`LEAST(100, ${playerProgressionState.org_stress} + ${increment})` })
        .where(and(eq(playerProgressionState.player_id, playerId), sql`${playerProgressionState.compression_week_state} != 'active'`))
        .returning({ org_stress: playerProgressionState.org_stress, compression_week_state: playerProgressionState.compression_week_state });

      const row = updated[0];
      if (!row) {
        return { applied: false, orgStressAfter: null, weekStateAfter: null, triggered: null };
      }

      let triggered: StressTriggered | null = null;
      if (row.compression_week_state === 'none' && row.org_stress >= triggerThreshold) {
        const flipped = await tx
          .update(playerProgressionState)
          .set({ compression_week_state: 'warning' })
          .where(and(eq(playerProgressionState.player_id, playerId), eq(playerProgressionState.compression_week_state, 'none')))
          .returning({ player_id: playerProgressionState.player_id });

        if (flipped.length > 0) {
          const [opened] = await tx
            .insert(compressionEvent)
            .values({
              player_id: playerId,
              state: 'open',
              opened_at_tick: gameMinute,
              decisions_budget: decisionsBudget,
              stress_at_fire: row.org_stress,
            })
            .returning({ id: compressionEvent.id });
          triggered = { compressionEventId: opened!.id, stressAtFire: row.org_stress };
        }
      }

      return {
        applied: true,
        orgStressAfter: row.org_stress,
        weekStateAfter: triggered ? 'warning' : row.compression_week_state,
        triggered,
      };
    });
  }

  /**
   * I6 — the single-use deferral. BOTH refusal conditions (`deferral_count` already 1, OR `org_stress >=
   * forceEngagementThreshold`) live in the SAME guarded UPDATE's WHERE clause (a correlated subquery for
   * the stress read — no separate SELECT-then-decide TOCTOU window between reading stress and claiming
   * the deferral). On success: `+penaltyStress` to `org_stress` (clamped [0,100]) in the SAME transaction.
   * On refusal: `diagnoseDeferralRefusal` (a SEPARATE, non-atomic read) picks the exact 409/404 reason —
   * this diagnostic read's own non-atomicity is harmless (it only affects WHICH error message a refused
   * caller sees, never whether the guarded UPDATE above actually let anything through).
   *
   * ★ C6-fix (see file header): without a guaranteed row, the correlated subquery above reads SQL NULL
   * for a player who never opened a session — `NULL < forceEngagementThreshold` is NULL, not true, so the
   * WHERE clause's AND would silently refuse a genuinely-eligible (stress=0) deferral. `ensureRow` FIRST
   * makes the subquery read a REAL `0` in that case.
   */
  async applyDeferral(playerId: string, penaltyStress: number, forceEngagementThreshold: number): Promise<DeferralResult> {
    await this.progressionRepo.ensureRow(playerId);
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(compressionEvent)
        .set({ deferral_count: 1 })
        .where(
          and(
            eq(compressionEvent.player_id, playerId),
            eq(compressionEvent.state, 'open'),
            eq(compressionEvent.deferral_count, 0),
            sql`(SELECT org_stress FROM player_progression_state WHERE player_id = ${playerId}::uuid) < ${forceEngagementThreshold}`,
          ),
        )
        .returning({ id: compressionEvent.id });

      if (updated.length === 0) {
        return { deferred: false, reason: await this.diagnoseDeferralRefusal(tx, playerId, forceEngagementThreshold) };
      }

      await tx
        .update(playerProgressionState)
        .set({ org_stress: sql`LEAST(100, ${playerProgressionState.org_stress} + ${penaltyStress})` })
        .where(eq(playerProgressionState.player_id, playerId));

      return { deferred: true, reason: null };
    });
  }

  /** Picks the exact refusal reason for a 0-row `applyDeferral` guard (mirrors `ReplacementOptionRepository`'s
   *  own guard-then-diagnose 409 shape). Priority: FORCED_ENGAGEMENT (the more specific business rule) >
   *  NO_OPEN_CYCLE (no non-terminal cycle at all) > DEFERRAL_EXHAUSTED (an open cycle exists, already deferred). */
  private async diagnoseDeferralRefusal(tx: CompressionTx, playerId: string, forceEngagementThreshold: number): Promise<DeferralRefusalReason> {
    const progRows = await tx
      .select({ org_stress: playerProgressionState.org_stress })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    if ((progRows[0]?.org_stress ?? 0) >= forceEngagementThreshold) return 'FORCED_ENGAGEMENT';

    const eventRows = await tx
      .select({ deferral_count: compressionEvent.deferral_count })
      .from(compressionEvent)
      .where(and(eq(compressionEvent.player_id, playerId), eq(compressionEvent.state, 'open')))
      .limit(1);
    if (!eventRows[0]) return 'NO_OPEN_CYCLE';
    return 'DEFERRAL_EXHAUSTED';
  }

  /**
   * §8.3 W/14 quiet-decay. CALLER (`CompressionQuietDecayTickService`) already established `quiet===true`
   * via `CompressionStressReaderService.readStress` — this method's ONLY job is the epoch-guard + the
   * bounded decay write, NOTHING touched at all if the epoch-guard matches 0 rows (a live-signal week
   * never even reaches this call — see the tick service). `floorIfCriticalResidue` applies ONLY while
   * `hasCriticalPersistedResidue` finds ≥1 row (★#6 — organically false this chunk, C7 is the first
   * writer of `compression_problem_entry`; the query is real/forward-compatible, not a hardcoded false).
   *
   * ★ C6-fix (see file header): `compression_decay_state`'s OWN row is lazily ensured below, but its FK
   * is to `player`, not to `player_progression_state` — the 2 rows are INDEPENDENT. Without THIS
   * guarantee, a player who never opened a session could have the epoch-watermark claimed (a real write)
   * while the final `org_stress` decay UPDATE silently matches 0 rows — `applied: true` with nothing
   * actually decayed. `ensureRow` FIRST keeps the 2 writes consistent.
   */
  async applyQuietDecay(playerId: string, weekEpoch: number, decayAmount: number, floorIfCriticalResidue: number): Promise<QuietDecayResult> {
    await this.progressionRepo.ensureRow(playerId);
    return this.db.transaction(async (tx) => {
      // Lazily create the 1-1 watermark row (mirrors `FrictionBudgetRepository.ensureRow` — idempotent
      // upsert, no-ops on conflict) BEFORE the epoch-guarded UPDATE below, which needs an existing row.
      await tx.insert(compressionDecayState).values({ player_id: playerId }).onConflictDoNothing({ target: compressionDecayState.player_id });

      const epochClaimed = await tx
        .update(compressionDecayState)
        .set({ last_quiet_decay_week_epoch: weekEpoch })
        .where(and(eq(compressionDecayState.player_id, playerId), sql`${compressionDecayState.last_quiet_decay_week_epoch} < ${weekEpoch}`))
        .returning({ player_id: compressionDecayState.player_id });

      if (epochClaimed.length === 0) {
        return { applied: false, orgStressAfter: null };
      }

      const floor = (await this.hasCriticalPersistedResidue(tx, playerId)) ? floorIfCriticalResidue : 0;
      const decayed = await tx
        .update(playerProgressionState)
        .set({ org_stress: sql`GREATEST(${floor}, ${playerProgressionState.org_stress} - ${decayAmount})` })
        .where(eq(playerProgressionState.player_id, playerId))
        .returning({ org_stress: playerProgressionState.org_stress });

      return { applied: true, orgStressAfter: decayed[0]?.org_stress ?? null };
    });
  }

  /**
   * P3-E C8 — the ONE read behind BOTH `GET /v1/compression/state` (design §15) AND the session-open
   * `compression_glance` (design §15/§9.2b) — a SINGLE query shape, zero drift between the 2 callers
   * (mirrors `CompressionStressReaderService.readStress`'s own "ONE read, both callers derive from it"
   * discipline). Reads `player_progression_state.org_stress`/`compression_week_state` (defaults for a
   * player with no row yet — `org_stress=0`/`weekState='none'`, the SAME empty-state honesty `flag_review`
   * /`settling_glance` already establish) + `forced` off the player's OWN non-terminal `compression_events`
   * row (`state IN ('open','active')` — I1 guarantees at most one; `false` when no such row exists, since
   * `forced` only EVER flips true together with `engageForced`'s own `state -> 'active'` write) +
   * `deferral_count`/`state` off that SAME row, to derive `deferralAvailable` (an OPEN, never-deferred
   * cycle, stress still under the force-engagement threshold — i.e. would `POST /v1/compression/defer`
   * currently succeed). Plain SELECTs (no `ensureRow` needed — a read against a missing row is a harmless
   * empty result, unlike the 3 WRITE methods above whose correlated-subquery guards need a REAL row).
   */
  async getStateProjection(playerId: string, forceEngagementThreshold: number): Promise<{
    orgStress: number;
    weekState: string;
    forced: boolean;
    deferralAvailable: boolean;
  }> {
    const [progRows, eventRows] = await Promise.all([
      this.db
        .select({ org_stress: playerProgressionState.org_stress, compression_week_state: playerProgressionState.compression_week_state })
        .from(playerProgressionState)
        .where(eq(playerProgressionState.player_id, playerId))
        .limit(1),
      this.db
        .select({ state: compressionEvent.state, forced: compressionEvent.forced, deferral_count: compressionEvent.deferral_count })
        .from(compressionEvent)
        .where(and(eq(compressionEvent.player_id, playerId), sql`${compressionEvent.state} IN ('open','active')`))
        .limit(1),
    ]);

    const orgStress = progRows[0]?.org_stress ?? 0;
    const weekState = progRows[0]?.compression_week_state ?? 'none';
    const event = eventRows[0];
    const deferralAvailable = event != null && event.state === 'open' && event.deferral_count === 0 && orgStress < forceEngagementThreshold;

    return { orgStress, weekState, forced: event?.forced ?? false, deferralAvailable };
  }

  /** ★#6 tooth (iii) — ≥1 `compression_problem_entry` `tier='critical' AND persisted=true` row for this
   *  player (design §10.4). Organically 0 rows THIS chunk (C7 is the first writer of that table) — the
   *  query is real/forward-compatible, mirrors C2/C4's own "fixture-only today, real query regardless"
   *  posture for the damaged/seized périmètre branches. */
  private async hasCriticalPersistedResidue(tx: CompressionTx, playerId: string): Promise<boolean> {
    const result = await tx.execute(sql`
      SELECT 1 AS hit
      FROM ${compressionProblemEntry}
      WHERE player_id = ${playerId}::uuid AND tier = 'critical' AND persisted = true
      LIMIT 1
    `);
    return rowsOf(result).length > 0;
  }
}

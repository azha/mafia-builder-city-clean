// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (engage volontaire
//             + FORCÉ + fire ≥100 severity ; `decide` I7 budget + entry guard)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §9.2
//             (b/c — engage/fire transitions) + §10.2 (I7 budget guarded UPDATE, verbatim).
//             Decisions: I7 (`UPDATE … WHERE decisions_used < budget RETURNING`, exactly-once under
//             concurrency).
//             Pattern: `CompressionWeekRepository#applyStressIncrement`/`applyDeferral` (the SAME
//             guard-then-diagnose-on-refusal 2-step shape, single-statement guarded UPDATE — REPLICATED
//             here, NOT imported: this repository owns a DIFFERENT set of `compression_events` columns
//             — `state`/`forced`/`severity_multiplier_applied`/`decisions_used` — than C6's OWN `org_
//             stress`/`compression_week_state`/`deferral_count` writers, zero overlap, zero touch to
//             that file).
//             — P3-E C7 — 2026-07-18
//
// `CompressionBoardRepository` — the engage/fire (state → 'active') + decide-budget (I7) writers this
// chunk owns on `compression_events`, plus the entry-addressed guard on `compression_problem_entry`.
// Lives ONLY in `CompressionModule` (unlike `CompressionFinalizeRepository`/`CompressionResidueException
// Producer`, which are duplicate-provided in `DemolitionModule` too — see those files' own headers for
// why: THIS repository's callers (`compression-board.service.ts`) always run inside `CompressionModule`).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { compressionEvent, compressionProblemEntry, type CompressionEventRow } from '../../db/schema/demolition_compression';

/** The Drizzle transaction-callback client type (`compression-week.repository.ts`'s own local `Tx` alias
 *  precedent, extracted via `Parameters<...>` — never guessed, REPLICATED here). */
type CompressionBoardTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export interface EngageResult {
  readonly engaged: boolean;
  readonly compressionEventId: string | null;
}

export type DecideBudgetRefusalReason = 'NO_ACTIVE_BOARD' | 'BUDGET_EXHAUSTED';

export interface DecideBudgetResult {
  readonly claimed: boolean;
  readonly compressionEventId: string | null;
  readonly decisionsUsed: number | null;
  readonly decisionsBudget: number | null;
  readonly reason: DecideBudgetRefusalReason | null;
}

@Injectable()
export class CompressionBoardRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** `GET /v1/compression/board`'s own ownership anchor — the player's CURRENT `'active'` cycle (I1: at
   *  most one non-terminal row). `null` when no board is open. */
  async getActiveEvent(playerId: string): Promise<CompressionEventRow | null> {
    const rows = await this.db
      .select()
      .from(compressionEvent)
      .where(and(eq(compressionEvent.player_id, playerId), eq(compressionEvent.state, 'active')))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * §9.2(b) voluntary engage — `POST /v1/compression/engage`. Guarded `compression_events.state`
   * `'open' -> 'active'` (DD-E2 — the ROW's OWN 4-value CHECK `IN ('open','active','finalized','expired')`
   * is a SEPARATE state machine from `player_progression_state.compression_week_state`'s 3-value
   * `'none'|'warning'|'active'` phase marker; C6's `applyStressIncrement` opens the row at `state='open'`
   * when it flips the PHASE marker to `'warning'`, design §9.1/§13.2). BOTH columns move together HERE,
   * same tx (`compression_week_state -> 'active'` is what ACTUALLY engages C6's own D6 freeze —
   * `CompressionWeekRepository#applyStressIncrement`'s guard is `compression_week_state != 'active'`, NOT
   * this row's OWN `state` column). No stress condition — any `'open'` cycle may be voluntarily engaged.
   * `forced`/`severity_multiplier_applied` stay at their column defaults (`false`).
   */
  async engageVoluntary(playerId: string, gameMinute: number): Promise<EngageResult> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(compressionEvent)
        .set({ state: 'active', fired_at_tick: gameMinute })
        .where(and(eq(compressionEvent.player_id, playerId), eq(compressionEvent.state, 'open')))
        .returning({ id: compressionEvent.id });
      if (updated.length === 0) return { engaged: false, compressionEventId: null };
      await this.flipWeekStateToActive(tx, playerId);
      return { engaged: true, compressionEventId: updated[0]!.id };
    });
  }

  /** §9.2(b) FORCED engage — session-open, `org_stress >= forceEngagementThreshold` (95 default). BOTH
   *  the phase guard (`state='open'`) AND the stress condition (a correlated subquery — no separate
   *  read-then-decide TOCTOU window, mirrors `CompressionWeekRepository#applyDeferral`'s own shape) live
   *  in the SAME WHERE clause. Same `compression_week_state -> 'active'` companion write as
   *  `engageVoluntary` above (see that method's own header for why BOTH columns must move together). */
  async engageForced(playerId: string, gameMinute: number, forceEngagementThreshold: number): Promise<EngageResult> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(compressionEvent)
        .set({ state: 'active', fired_at_tick: gameMinute, forced: true })
        .where(
          and(
            eq(compressionEvent.player_id, playerId),
            eq(compressionEvent.state, 'open'),
            sql`(SELECT org_stress FROM player_progression_state WHERE player_id = ${playerId}::uuid) >= ${forceEngagementThreshold}`,
          ),
        )
        .returning({ id: compressionEvent.id });
      if (updated.length === 0) return { engaged: false, compressionEventId: null };
      await this.flipWeekStateToActive(tx, playerId);
      return { engaged: true, compressionEventId: updated[0]!.id };
    });
  }

  /** §9.2(c) severity fire — `org_stress = 100` (design: "stress = 100 → fire avec severity"), realized
   *  as `>= compressionMaxSeverityThreshold` (the D17 ceiling getter — clamp code never lets `org_stress`
   *  EXCEED 100, so `>=` and `=` are equivalent in practice; `>=` is the defensive form). Same guarded
   *  shape as `engageForced`, PLUS `severity_multiplier_applied = true` (§9.2c, the seed-tier-+1 signal
   *  `ProblemAggregatorService.seedBoard`'s caller reads back off THIS return value). Same
   *  `compression_week_state -> 'active'` companion write. */
  async fireAtMaxSeverity(playerId: string, gameMinute: number, maxSeverityThreshold: number): Promise<EngageResult> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(compressionEvent)
        .set({ state: 'active', fired_at_tick: gameMinute, severity_multiplier_applied: true })
        .where(
          and(
            eq(compressionEvent.player_id, playerId),
            eq(compressionEvent.state, 'open'),
            sql`(SELECT org_stress FROM player_progression_state WHERE player_id = ${playerId}::uuid) >= ${maxSeverityThreshold}`,
          ),
        )
        .returning({ id: compressionEvent.id });
      if (updated.length === 0) return { engaged: false, compressionEventId: null };
      await this.flipWeekStateToActive(tx, playerId);
      return { engaged: true, compressionEventId: updated[0]!.id };
    });
  }

  /** The `player_progression_state.compression_week_state -> 'active'` companion write EVERY engage path
   *  above shares (DD-E2 — the row flip above ALREADY proved eligibility via ITS OWN guarded UPDATE; this
   *  2nd statement, inside the SAME tx, is unconditional — a plain UPDATE, not a 2nd guard — since the
   *  row-level guard above is already the SOLE source of exactly-once truth for this transition). */
  private async flipWeekStateToActive(tx: CompressionBoardTx, playerId: string): Promise<void> {
    await tx.execute(sql`UPDATE player_progression_state SET compression_week_state = 'active' WHERE player_id = ${playerId}::uuid`);
  }

  /**
   * I7 — the ONE guarded budget-claim UPDATE (design §10.2 verbatim): `decisions_used + 1` WHERE
   * `state='active' AND decisions_used < decisions_budget`. Under 6 concurrent callers at budget 5,
   * exactly 5 `claimed: true` (DB-serialized row-level contention on the SAME `compression_events` row —
   * no application-level lock needed, the guarded WHERE clause itself is the concurrency proof).
   */
  async consumeDecisionBudget(playerId: string): Promise<DecideBudgetResult> {
    const updated = await this.db
      .update(compressionEvent)
      .set({ decisions_used: sql`${compressionEvent.decisions_used} + 1` })
      .where(and(eq(compressionEvent.player_id, playerId), eq(compressionEvent.state, 'active'), sql`${compressionEvent.decisions_used} < ${compressionEvent.decisions_budget}`))
      .returning({ id: compressionEvent.id, decisions_used: compressionEvent.decisions_used, decisions_budget: compressionEvent.decisions_budget });

    const row = updated[0];
    if (!row) {
      const reason = await this.diagnoseBudgetRefusal(playerId);
      return { claimed: false, compressionEventId: null, decisionsUsed: null, decisionsBudget: null, reason };
    }
    return { claimed: true, compressionEventId: row.id, decisionsUsed: row.decisions_used, decisionsBudget: row.decisions_budget, reason: null };
  }

  /** Picks the exact 0-row refusal reason (mirrors `CompressionWeekRepository#diagnoseDeferralRefusal`'s
   *  own non-atomic, diagnostic-only 2nd read — harmless: it only decides WHICH error a refused caller
   *  sees, never whether the guarded UPDATE above let anything through). */
  private async diagnoseBudgetRefusal(playerId: string): Promise<DecideBudgetRefusalReason> {
    const rows = await this.db.select({ id: compressionEvent.id }).from(compressionEvent).where(and(eq(compressionEvent.player_id, playerId), eq(compressionEvent.state, 'active'))).limit(1);
    return rows.length > 0 ? 'BUDGET_EXHAUSTED' : 'NO_ACTIVE_BOARD';
  }

  /** Guard the entry itself: `addressed_at IS NULL` (a 2nd decide on the SAME entry, or a stale/foreign
   *  entryId, both refuse here — 0 rows). Called AFTER `consumeDecisionBudget` claims the decision
   *  (design §10.2's own literal ordering — "budget d'abord, puis résolution": the decision is consumed
   *  REGARDLESS of whether the targeted entry turns out valid, the SAME "skip consumes a decision with
   *  zero effect" honesty the design already establishes for the no-fix choice). */
  async markEntryAddressed(compressionEventId: string, playerId: string, entryId: string, decisionRef: Record<string, unknown>) {
    const updated = await this.db
      .update(compressionProblemEntry)
      .set({ addressed_at: sql`now()`, decision_ref: decisionRef })
      .where(
        and(
          eq(compressionProblemEntry.id, entryId),
          eq(compressionProblemEntry.compression_event_id, compressionEventId),
          eq(compressionProblemEntry.player_id, playerId),
          sql`${compressionProblemEntry.addressed_at} IS NULL`,
        ),
      )
      .returning();
    return updated[0] ?? null;
  }
}

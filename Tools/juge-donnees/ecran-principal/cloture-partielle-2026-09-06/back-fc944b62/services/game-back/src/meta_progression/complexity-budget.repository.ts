// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C4 ("ONE-statement recompute
//             UPDATE (D1)... `GET /v1/meta/complexity-budget`").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §1 D1 ("`used`
//             recompute = ONE single-statement UPDATE `complexity_budget_used = :computed` (recompute-
//             from-truth, idempotent, race-convergent... `ensureRow` first, the Phase-17 precedent).
//             Effective cap = the column (`complexity_budget_cap`, per-player, BO-overridable)") +
//             decisions §4 #18 ("the COLUMN is the cap — divergence #18... value-sensitivity preserved:
//             BO PATCH of the column flips affordability").
//             Pattern (a small dedicated repository owning ONE table's write concern, single-statement
//             UPDATE, no read-then-write): `mastery-score.repository.ts` (`applyDelta`'s own atomic
//             `LEAST(100, GREATEST(0, ...))` UPDATE shape, here simpler still — the computed value IS the
//             truth, never a delta, so no row-lock/CAS is needed: any prior value from any source is
//             simply overwritten).
//             — P3-G C4 — 2026-07-20
//
// `ComplexityBudgetRepository` — the ONLY write path onto `player_progression_state.complexity_budget_
// used` (D1's recompute-from-truth column) + the read path for `complexity_budget_cap` (D1's "the column
// IS the cap"). Deliberately narrow (two methods) and deliberately NOT `ProgressionRepository` (which owns
// `rule_vocabulary_tier`/`taught_signals` — a DIFFERENT single-writer-per-column concern, Phase-17-owned):
// `complexity_budget_used`'s writer is `BudgetRecomputeService`, via ITS OWN repository, keeping the
// "exactly one writer per column" discipline honestly scoped per column, not per table.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';

/** Mirrors the column's own schema default (`player_progression_state.ts:17`,
 *  `.notNull().default(100)`) — the fallback `getCap` returns for a player with no row yet (never a
 *  throw: a brand-new player's budget must be fully computable before they have ever opened a session,
 *  design §10.2's own fresh-player falsifiable). */
const DEFAULT_CAP = 100;

@Injectable()
export class ComplexityBudgetRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * D1 recompute-from-truth — ONE single-statement UPDATE, no WHERE-guard beyond `player_id` (the
   * computed value IS the current truth, not a delta — any prior value, however it got there, is simply
   * overwritten; race-convergent under any event interleaving by construction, since two concurrent
   * callers both re-derive the SAME value from the SAME underlying state and the later UPDATE just
   * repeats the SAME write). Callers MUST call `ProgressionRepository.ensureRow` first (the Phase-17
   * precedent design §10.1 names) so this UPDATE always matches a real row — an UPDATE with no matching
   * row is silently a no-op, which would leave the recompute lost.
   */
  async setUsed(playerId: string, used: number): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({ complexity_budget_used: used })
      .where(eq(playerProgressionState.player_id, playerId));
  }

  /** D1 — "Effective cap = the column" (divergence #18): the per-player, BO-overridable source of truth
   *  (no runtime `meta.*` tunable exists for it — the dual-source sync-bug class the divergence register
   *  explicitly removes). Defaults to the column's OWN schema default (100) for a player with no row yet. */
  async getCap(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ cap: playerProgressionState.complexity_budget_cap })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    return rows[0]?.cap ?? DEFAULT_CAP;
  }

  /**
   * P3-G C10 (design §14 — `PATCH /v1/admin/players/:id/complexity-budget-cap`, the D1 BO-override
   * surface, divergence #18's own "column IS the cap" proof site). ONE single-statement UPDATE — the SAME
   * "no read-then-write, no CAS needed" shape `setUsed` above documents (a direct write, never a delta:
   * whatever the prior value was, this write simply replaces it). Callers MUST call `ProgressionRepository.
   * ensureRow` first (mirrors `setUsed`'s own contract) — an UPDATE against a non-existent row is a silent
   * no-op, which would leave the PATCH lost. Value-range validation (non-negative integer) is the
   * CALLER'S job (the admin controller) — this repository performs zero business validation, mirroring
   * `setUsed`'s own "caller-derived amount, repository never buckets" discipline.
   */
  async setCap(playerId: string, cap: number): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({ complexity_budget_cap: cap })
      .where(eq(playerProgressionState.player_id, playerId));
  }
}

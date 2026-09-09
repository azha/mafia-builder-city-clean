// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C4 ("The shared pure
//             `computeUsed` (catalogue × delegation states — design D2)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §1 D2 ("Cost model
//             = catalogue-derived, always-active LIVE categories... a category with no `mastery_score`
//             row OR `delegation_state='SELF'` costs `meta.base_cost_unscripted_task`... `DELEGATED` costs
//             `meta.residual_cost_delegated_task`... `RETIRED` (no writer exists on this base) costs
//             residual too (defensive, documented); RESERVED source + successor categories cost 0") +
//             §10.1 ("`used = Σ cost`... both [the recompute write AND the projection read] derive from
//             the SAME pure function, divergence-proof by construction: one shared `computeUsed`") + §10.2
//             (`delegation_hints` — "each SELF LIVE category would free `base − residual`").
//             ★#4 RATIFIED arithmetic (decisions §6): fresh player `used = 4×10 = 40`, `free = 60`; each
//             graduation frees `10−2=8` units.
//             Pattern (a context bundle + pure dispatch function, no DI, callable from BOTH a write-path
//             service and a read-path service without a second implementation): `predicate-evaluators.ts`
//             (`PredicateEvalContext` + `evaluatePredicateClause`).
//             — P3-G C4 — 2026-07-20
//
// `computeUsed`/`computeDelegationHints` — the ONE shared pure cost model both `BudgetRecomputeService.
// recompute` (the event-driven WRITE onto `complexity_budget_used`) and `BudgetRecomputeService.
// getProjection`/`getPendingOpportunities` (the READ paths, recomputed fresh on every call — design §10.1's
// own "display freshness" clause: a fresh player who has never fired a single event still shows the
// correct `used=40`, never the column's stale schema-default `0`) call. Deterministic given the SAME DB
// state + tunable values (the only "impurity" is the DB read itself — mirrors `predicate-evaluators.ts`'s
// own "pure reads, no rng, no write" posture).

import { TASK_CATEGORY_CATALOGUE, type TaskCategoryKey } from './task-category-catalogue';
import { metaProgressionTunables } from './meta-progression-tunables';
import { MasteryScoreRepository } from './mastery-score.repository';

/** Everything `computeUsed`/`computeDelegationHints` need to read (mirrors `PredicateEvalContext`'s own
 *  "bundled once per call" shape). */
export interface BudgetCostContext {
  readonly masteryScoreRepo: MasteryScoreRepository;
}

/** `delegation_hints` projection entry (design §10.2) — `would_free` is the SAME `base − residual` for
 *  every SELF LIVE category (the cost model is a GLOBAL per-category weight, never per-category-tuned —
 *  design §15 — so this figure does not vary by `category_key`). */
export interface DelegationHint {
  readonly category_key: TaskCategoryKey;
  readonly would_free: number;
}

/**
 * D2's cost model. `used = Σ over TASK_CATEGORY_CATALOGUE.live:true`: a category with NO `mastery_score`
 * row, OR `delegation_state === 'SELF'`, costs `meta.base_cost_unscripted_task` (default 10); any OTHER
 * state (`DELEGATED`, or the defensive `RETIRED` — no writer exists on this base, design D2) costs
 * `meta.residual_cost_delegated_task` (default 2). RESERVED source + successor categories are
 * STRUCTURALLY excluded (the `.filter(live)` below) — they contribute exactly 0, never evaluated, never
 * even read: divergence #20's own falsifiable (a successor `mastery_score` row a REAL graduation installs,
 * design §8.4, is always a RESERVED-category row on this base — `computeUsed` never queries it, whatever
 * state it carries).
 *
 * Fresh player (zero `mastery_score` rows at all): every LIVE category falls into the SELF/missing-row
 * branch → `used = 4 × base` (defaults: 4×10 = 40 — the ★#4-ratified arithmetic, design §6, NOT a
 * 100-free start).
 */
export async function computeUsed(ctx: BudgetCostContext, playerId: string): Promise<number> {
  const liveCategories = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
  const rows = await Promise.all(liveCategories.map((c) => ctx.masteryScoreRepo.getRow(playerId, c.code)));
  const base = metaProgressionTunables.baseCostUnscriptedTask;
  const residual = metaProgressionTunables.residualCostDelegatedTask;
  return rows.reduce((sum, row) => {
    const state = row?.delegation_state ?? 'SELF';
    return sum + (state === 'SELF' ? base : residual);
  }, 0);
}

/**
 * `delegation_hints` (design §10.2) — every SELF LIVE category (delegation_state `'SELF'`, or no row at
 * all — the SAME zero-state default `computeUsed` uses), each with `would_free = base − residual`
 * (defaults: 10−2 = 8). A category already DELEGATED (or RETIRED) is NOT a hint — it is already at its
 * freed state, nothing further to gain by delegating it again.
 */
export async function computeDelegationHints(ctx: BudgetCostContext, playerId: string): Promise<DelegationHint[]> {
  const liveCategories = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
  const rows = await Promise.all(liveCategories.map((c) => ctx.masteryScoreRepo.getRow(playerId, c.code)));
  const wouldFree = metaProgressionTunables.baseCostUnscriptedTask - metaProgressionTunables.residualCostDelegatedTask;
  const hints: DelegationHint[] = [];
  liveCategories.forEach((entry, i) => {
    const state = rows[i]?.delegation_state ?? 'SELF';
    if (state === 'SELF') hints.push({ category_key: entry.key, would_free: wouldFree });
  });
  return hints;
}

/** One itemized row of `computeUsedBreakdown` (P3-G C10, design §14 — the admin `complexity-budget` P5
 *  inversion's "per-category cost breakdown"). */
export interface UsedBreakdownRow {
  readonly category_key: TaskCategoryKey;
  readonly delegation_state: string;
  readonly cost: number;
}

/**
 * P3-G C10 (design §14 — admin `GET /v1/admin/players/:id/complexity-budget`'s own "per-category cost
 * breakdown", the raw itemized P5 inversion of `computeUsed`'s folded scalar). Reuses the EXACT SAME
 * per-category read + base/residual branch `computeUsed` performs above — never a second, independently-
 * maintained cost model, a deliberate small duplication of the read/branch shape rather than a refactor of
 * that already-⊥-approved C4 function (mirrors `IsostaticDebtService.applyPassiveDecay`'s own "duplicate
 * the shape, don't touch the approved sibling" C8 precedent) — itemized per LIVE task category instead of
 * folded into one number. `rows.reduce((s,r) => s + r.cost, 0) === computeUsed(ctx, playerId)`'s own return
 * value for the SAME (ctx, playerId) by construction (both walk the SAME `TASK_CATEGORY_CATALOGUE.
 * filter(live)` rows with the SAME branch). BO-only (never a player-facing surface — the player's own
 * `GET /v1/meta/complexity-budget` shows `free_units`/`cap`/`delegation_hints` ONLY, §13 ALLOWED_KEYS).
 */
export async function computeUsedBreakdown(ctx: BudgetCostContext, playerId: string): Promise<UsedBreakdownRow[]> {
  const liveCategories = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
  const rows = await Promise.all(liveCategories.map((c) => ctx.masteryScoreRepo.getRow(playerId, c.code)));
  const base = metaProgressionTunables.baseCostUnscriptedTask;
  const residual = metaProgressionTunables.residualCostDelegatedTask;
  return liveCategories.map((entry, i) => {
    const state = rows[i]?.delegation_state ?? 'SELF';
    return { category_key: entry.key, delegation_state: state, cost: state === 'SELF' ? base : residual };
  });
}

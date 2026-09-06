// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2 ("FrictionBudget
//             Bucket / per-node buckets (band mapping §4.3 — qualitative bands, R2.2; the raw scalars
//             stay server-side)")
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.3
//             ("Buckets (R2.2) : FrictionBudgetBucket = light | balanced | strained | overloaded ...
//             mapping par fractions du seuil ... v1 : 3 seuils 0.5 / 0.85 / 1.0 du ratio total/threshold ;
//             4 bandes → 3 seuils, règle N-1. Per-node : OutputValueBucket, FrictionLoadBucket,
//             OutputToFrictionRatioBucket, DecommissionCostBucket — qualitatifs STRICTS.").
//             Pattern: `sinuosity-stress-bucket.ts` (the PURE, no-DB, getter-backed bucket derivation shape).
//             — P3-E C2 — 2026-07-17
//
// `frictionBudgetBucket` — the AGGREGATE bucket (design §4.3), the qualitative wall over
// `friction_budget_state.friction_budget_total / friction_threshold` (R2.2 — the raw ratio/total/threshold
// scalars never cross to the client; only this 4-value band does). The 3 cut-points are ALWAYS
// getter-resolved by the caller (`coreLoopsTunables.demolitionFrictionBucketLightUpperBound`/
// `...BalancedUpperBound`/`...StrainedUpperBound`, C1) — never inlined here (R2.3).
//
// SCOPE NOTE (C2, flagged for reviewer/C4-C5-C8 reconcile): design §4.3/§6.1 names 4 DISTINCT per-node
// bucket types for the `GET /v1/friction/nodes/:buildingId` panel — `OutputValueBucket`,
// `FrictionLoadBucket`, `OutputToFrictionRatioBucket`, `DecommissionCostBucket`. That panel endpoint is
// C4/C5/C8 scope (design §6.1 step 1 — the decommission flow's OWN GET, needing per-type OUTPUT value +
// DECOMMISSION COST basis, neither of which C2 computes or owns). C2 owns ONLY the per-node
// `friction_load` this chunk's tick already derives (§4.2) — so ONLY `FrictionLoadBucket` is realized
// here; the other 3 (output/cost-dependent) are deliberately left to the chunk that owns their inputs,
// rather than fabricated against data this chunk has no basis for (anti-fig-leaf). `frictionLoadBucket`
// below is a CODER-REALIZED divergence (no per-node cut-points are given by canon — only the AGGREGATE
// ratio's 3 thresholds are numbered): it reuses the SAME 3 threshold getters against the node's own
// `friction_load` relative to its "fair share" of the org's total threshold
// (`friction_threshold / friction_org_size`) — the same qualitative vocabulary as the aggregate bucket,
// zero NEW tunables. Mirrors this exact codebase's own established honesty convention for coder-realized
// bands (`demolition_friction_bucket_*_upper_bound`'s own C1 doc-comments: "ranges are coder-realized
// bands, no canon numeric range given").

export type FrictionBudgetBucket = 'light' | 'balanced' | 'strained' | 'overloaded';
export type FrictionLoadBucket = FrictionBudgetBucket;

/**
 * Map a `total/threshold` ratio to its `FrictionBudgetBucket` (design §4.3, verbatim: `light < 0.5`,
 * `balanced [0.5, 0.85)`, `strained [0.85, 1.0)`, `overloaded >= 1.0` at the DEFAULT cut-points — the
 * ACTUAL cut-points are always the 3 getter args below, DB-override-flippable like every other tunable).
 */
export function frictionBudgetBucket(
  ratio: number,
  lightUpperBound: number,
  balancedUpperBound: number,
  strainedUpperBound: number,
): FrictionBudgetBucket {
  if (ratio < lightUpperBound) return 'light';
  if (ratio < balancedUpperBound) return 'balanced';
  if (ratio < strainedUpperBound) return 'strained';
  return 'overloaded';
}

/**
 * Per-node `FrictionLoadBucket` (C2 scope note above) — the SAME 3 cut-points applied to
 * `nodeFrictionLoad / fairShareOfThreshold` (`fairShareOfThreshold = friction_threshold /
 * friction_org_size`, the org's total threshold budget divided evenly across its own perimeter — a
 * node carrying more than its "fair share" reads `strained`/`overloaded`, exactly mirroring the
 * aggregate bucket's own semantics at node granularity). Degenerate guard: an org with `orgSize === 0`
 * (so `fairShareOfThreshold <= 0`) has no nodes to bucket at all — never called by the tick in that case
 * (an empty perimeter has zero rows to iterate), but returns `light` defensively rather than dividing by
 * zero (a `0` load node is trivially `light`; this function is never asked to bucket a NEGATIVE load).
 */
export function frictionLoadBucket(
  nodeFrictionLoad: number,
  fairShareOfThreshold: number,
  lightUpperBound: number,
  balancedUpperBound: number,
  strainedUpperBound: number,
): FrictionLoadBucket {
  if (fairShareOfThreshold <= 0) return 'light';
  return frictionBudgetBucket(nodeFrictionLoad / fairShareOfThreshold, lightUpperBound, balancedUpperBound, strainedUpperBound);
}

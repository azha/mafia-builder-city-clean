// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C8 ("`computePenaltyBucket`
//             constants (design §12.4)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.4 ("`compute
//             PenaltyBucket` constants (D12 — gdd/14 invariant rows): NONE(0) / MILD(0<d≤5) / MODERATE
//             (5<d≤10) / SEVERE(>10). Player projection `GET /v1/meta/capability-debts`: rows with
//             `structural_debt ≥ meta.debt_visibility_threshold` ONLY, `{capability_key, debt_bucket}` —
//             bucket, never a number").
//             Pattern (pure, registry-free bucket-derivation file — no DI, a closed union + one pure
//             lookup function, fixed GDD-verbatim cut points never a tunable): `mastery-bucket.ts` /
//             `severance-bucket.ts`.
//             — P3-G C8 — 2026-07-23
//
// `penalty-bucket.ts` — the design §12.4/D12 Isostatic Debt penalty band (`PenaltyBucket`), derived from a
// raw `capability_debts.structural_debt` value. GDD-verbatim cut points (canon invariant rows, NOT
// tunables — mirrors `mastery-bucket.ts`'s own "fixed cuts, not a knob" posture for the SAME reason: a DB
// override here would let an admin silently rebalance a fixed GDD number, never the intent). NONE(0) /
// MILD(0<d≤5) / MODERATE(5<d≤10) / SEVERE(>10) — closed, exhaustive, total over every non-negative debt
// value (the `capability_debts_structural_debt_chk` CHECK already guarantees `structural_debt >= 0`, mig
// 0137). Two debts in the SAME band are byte-identical outputs (the C8/C9 falsifiable: debt 8 vs debt 7,
// both MODERATE → identical `{capability_key, debt_bucket}` rows) — true by construction, not coincidence
// of the cut points chosen (the SAME "pure fold, guaranteed byte-identical within a band" shape
// `progressBandForMasteryBucket` establishes for a different domain).

export type PenaltyBucket = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';

/** NONE/MILD cut (canon-fixed, GDD-verbatim — NOT a tunable, design §12.4). Exactly 0 is NONE; anything
 *  above 0 up to and including this bound is MILD. */
const MILD_UPPER = 5;
/** MILD/MODERATE cut (canon-fixed, GDD-verbatim — NOT a tunable, design §12.4). Anything above
 *  `MILD_UPPER` up to and including this bound is MODERATE; anything above it is SEVERE. */
const MODERATE_UPPER = 10;

/**
 * `PenaltyBucket` derivation (design §12.4/D12): NONE at exactly 0, MILD `(0, 5]`, MODERATE `(5, 10]`,
 * SEVERE `(10, ∞)`. Pure, total function of the raw `structural_debt` value — never a second independent
 * read, never registry-backed (mirrors `deriveMasteryBucket`'s own "fixed cuts inline" posture).
 */
export function computePenaltyBucket(structuralDebt: number): PenaltyBucket {
  if (structuralDebt <= 0) return 'NONE';
  if (structuralDebt <= MILD_UPPER) return 'MILD';
  if (structuralDebt <= MODERATE_UPPER) return 'MODERATE';
  return 'SEVERE';
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C3 (mycelial decay + stress
//             dérivé + slowdown)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.3 (stress —
//             derived, never stored, D4) + §5.5 (stress_streak, the NIGHTLY consecutive-eval counter).
//             Decisions: §1.4 D4 (multiplicateur DÉRIVÉ, jamais stocké — the 04f-A `lapse_phase` "cached
//             column NEVER the penalty input" precedent, durci).
//             — P3-C C3 — 2026-07-12
//
// `mycelial-stress.ts` — the ONE reusable derivation the design's D4 principle names: `stressed` is a
// PURE function of `debt_load` vs `core_loops.mycelial_stress_threshold`, computed at READ time,
// NEVER cached in a column. TWO call sites this chunk share this SAME derivation (never duplicated):
//   (1) `MycelialDecayTickService` (the NIGHTLY/25 tick) — derives `stressed` from the POST-decay
//       `debt_load` to decide whether `stress_streak` increments or resets to 0 (set-based, in the
//       SAME statement as decay — see `leg.repository.ts applyNightlyDecayAndStressEval`).
//   (2) `DistributionService.dispatch` — derives `stressed` from the leg's LIVE `debt_load` AT DISPATCH
//       TIME to compute the FROZEN `route.mycelial_transit_stress_multiplier` (design §5.3, migration
//       0126 — see that file's own header for why this is a `route` column, not a live re-derivation).
//
// Pure, no DB, no Math.random, no Date.now — every input is a plain number the caller already resolved
// (getter-sourced tunables + a read debt_load). Mirrors `distribution-tunables.ts`'s own
// `vehicleTransitTicks` "pure formula, plain exported function" shape (no NestJS injectable needed).

/**
 * `isStressed` (design §5.3 verbatim): `stressed ⇔ debt_load > threshold`. Strict `>` (a leg sitting
 * EXACTLY at the threshold is not yet stressed — matches every OTHER strict-threshold bucket boundary
 * this codebase uses, e.g. `backpressureCriticalThreshold`'s own bucket cut).
 */
export function isStressed(debtLoad: number, stressThreshold: number): boolean {
  return debtLoad > stressThreshold;
}

/**
 * `transitStressMultiplier` (design §5.3 verbatim): `1.0` when NOT stressed (the floor — never speeds
 * up transit); `1 / (1 - throughputPenaltyAtStressPct / 100)` when stressed (≈ ×1.43 at the 30%
 * default) — "the throughput per unit time drops X% WITHOUT inventing a cargo capacity that doesn't
 * exist" (design §5.3's own gloss). `throughputPenaltyAtStressPct` is ALWAYS a getter-resolved value
 * (`core_loops.mycelial_throughput_penalty_at_stress_pct`, clamped 10..60 — CORE_LOOPS_TUNABLE_CAPS),
 * so the denominator `(1 - pct/100)` is always in (0.4, 0.9] — never zero, never negative.
 */
export function transitStressMultiplier(stressed: boolean, throughputPenaltyAtStressPct: number): number {
  if (!stressed) return 1.0;
  return 1 / (1 - throughputPenaltyAtStressPct / 100);
}

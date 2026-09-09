// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C8 ("Projections
//             consolidation + R2.2/P5 wall" — "the horizon timeline contract ... StabilityBucketEnum" +
//             "band tests: two stability counters in one `StabilityBucketEnum` -> byte-identical rows").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md D5 ("Display bucket
//             `StabilityBucketEnum` (LOW/BUILDING/READY_TO_ADVANCE) derived at read from the counter vs the
//             tier-target threshold (P5 — the raw count is BO-only)") + §10/D15 ("the `StabilityBucketEnum`
//             ... never the raw counter" / "the player MAY see: the `StabilityBucketEnum`").
//             Pattern (a threshold-relative closed band, never a tunable — mirrors the SAME "map a raw
//             scalar -> its closed enum band" shape): `drift-bucket.ts#driftBucketFor` (itself mirroring
//             `erlang-stash.service.ts#blockingBand`).
//             — P3-H C8 — 2026-07-24
//
// `stability-bucket.ts` — the PURE `consecutive_no_deviation_cycles -> StabilityBucket` derivation (design
// D5/§10 — P5: the raw counter NEVER reaches the player payload, only this closed 3-value band). Design
// names the band members (LOW/BUILDING/READY_TO_ADVANCE) and the axis ("vs the tier-target threshold").
//
// UNLIKE `driftBucketFor`'s fully coder-chosen thirds split, the READY_TO_ADVANCE boundary here is NOT
// arbitrary: it is EXACTLY the same `counter >= threshold` condition `HorizonTierAdvancementService.advance`
// gates the REAL `POST /v1/meta/horizon/advance-tier` mutation on (422 `STABILITY_COUNTER_INSUFFICIENT`
// below it, `horizon-tier-ladder.ts#scriptStabilityThresholdForTargetTier` the SHARED threshold read) — so
// "READY_TO_ADVANCE" genuinely means "the advance endpoint would succeed right now for this lieutenant",
// never a cosmetic approximation. The LOW/BUILDING split BELOW that line is the ONE coder-disclosed choice
// (design names no sub-cut for the two below-threshold bands): half-of-threshold, the SAME "make the
// threshold itself the reference scale" idea `driftBucketFor` uses.

/** `StabilityBucketEnum` (design D5/§10) — the closed player-facing band. */
export type StabilityBucket = 'LOW' | 'BUILDING' | 'READY_TO_ADVANCE';

/**
 * `stabilityBucketFor` — READY_TO_ADVANCE at/above the tier-target threshold (the EXACT gate condition,
 * never approximated); BUILDING from half the threshold up to (excl.) the threshold; LOW below half. Two
 * counters landing in the same band -> byte-identical bucket (the falsifiable's own "byte-identical rows"
 * proof). Pure, deterministic, no RNG.
 */
export function stabilityBucketFor(consecutiveNoDeviationCycles: number, threshold: number): StabilityBucket {
  const t = threshold > 0 ? threshold : 1; // defensive floor — never 0/negative in practice (tier2/tier3 ranges are 5..40).
  if (consecutiveNoDeviationCycles >= t) return 'READY_TO_ADVANCE';
  if (consecutiveNoDeviationCycles >= t / 2) return 'BUILDING';
  return 'LOW';
}

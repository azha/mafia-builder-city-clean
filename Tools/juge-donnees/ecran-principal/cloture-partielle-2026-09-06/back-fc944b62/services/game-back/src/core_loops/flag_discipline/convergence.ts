// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C5 ("evaluateConvergence:
//             window query over `flagged_items` → `ConvergenceBucket` per design §7 formula INCLUDING
//             low-tenure leniency — pure function direct-importable, getter-backed weights" +
//             "`FlagFrequencyBand` (last-7-game-days) — band mapper, R2.2-safe")
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §7 (Convergence +
//             bands) + §1 D12 (R2.2 walls, low-tenure leniency).
//             Pattern: `generators/deviation-scores.ts`'s own header — "PURE composite module —
//             deterministic, NO DB/I/O/RNG/Date.now... a Playwright spec importing one of these functions
//             transitively pulls in every top-level statement of the file it lives in — esbuild CANNOT
//             parse a file containing a NestJS parameter-decorated constructor". Same discipline here:
//             `flag_weekly_convergence.spec.ts` direct-imports `evaluateConvergence`/`frequencyBand` from
//             THIS file (never from `flag-convergence.service.ts`, which injects `FlagDisciplineRepository`
//             via `@Inject`-free but still `@Injectable()`-decorated constructor parameter properties).
//             — P3-B C5 — 2026-07-11
//
//             P3-B C6 ADDS `trustBudgetBucket` (design §7/§1 D12 — the token-budget band the lieutenant
//             projection + the `GET /v1/flag-review` card both surface). SAME file, SAME decorator-free
//             discipline (co-located with its sibling band functions rather than a new file) — REUSE C5's
//             `frequencyBand` pattern verbatim: thresholds passed in, pure, direct-importable by
//             `flag_review_surface.spec.ts`'s own precompute floor.
// — P3-B C6 — 2026-07-11
//
// The pure functions design §7 specifies, each a PURE function of caller-supplied counts + getter-
// sourced thresholds (never reads a getter itself — every threshold is a PARAMETER, the SAME "thresholds
// passed in" discipline `tenure-inertia.ts#bucketForStreak` / `deviation-scores.ts` establish).
// Deterministic, no RNG, no clock, no DB — `flag_weekly_convergence.spec.ts`/`flag_review_surface.spec.ts`'s
// own precompute floors call these DIRECTLY to derive the expected bucket/band BEFORE comparing against the
// REAL `FlagConvergenceService` output (driven through the test seams / the real HTTP surfaces) — a formula
// drift here would fail that comparison, never silently pass.

/** `ConvergenceBucket` (canon-verbatim, design §7/§14) — client-facing NEVER (BO-side only, D12). */
export type ConvergenceBucket = 'still_calibrating' | 'converging' | 'converged' | 'over_calibrated';

/** `FlagFrequencyBand` (design §7/§14) — client-facing (lieutenant projection, C6). */
export type FlagFrequencyBand = 'none' | 'occasional' | 'frequent';

/** `TrustBudgetBucket` (canon-verbatim, design §7/§14) — client-facing (lieutenant projection C6 + the
 *  `GET /v1/flag-review` card's own `trust_budget_bucket` field, design §8). */
export type TrustBudgetBucket = 'low' | 'standard' | 'high';

/** The resolved-flag history sample `evaluateConvergence` scores (the caller's OWN window query over
 *  `flagged_items` resolves these — see `FlagDisciplineRepository#getConvergenceSampleForLieutenant`). */
export interface ConvergenceSample {
  /** Count of resolved flags (`resolution != 'pending'`) in the evaluation window — the denominator. */
  readonly sample: number;
  /** Count of those with `resolution = 'dismissed'` — the numerator ("over-flagging burns tokens", canon
   *  §Invariants). `timed_out` rows count toward `sample` (a real resolved data point) but NEVER toward
   *  this numerator — sub-decision #3's own reasoning ("no calibration signal ⇒ no penalty") carries
   *  through here: a timeout is not evidence the lieutenant over-flagged, only that the PLAYER was away. */
  readonly dismissedCount: number;
  /** Whether the flagging lieutenant's Phase-11 tenure bucket is FRESH or ACCLIMATED (design §7 —
   *  the leniency multiplier applies ONLY to these 2 low-tenure buckets, never SEASONED/SENIOR/ENTRENCHED). */
  readonly isLowTenure: boolean;
}

/** Getter-backed thresholds (`flag-discipline-tunables.ts`) — PASSED IN, never read here (R2.3 discipline:
 *  a pure formula file never resolves its own registry keys, mirrors `deviation-scores.ts`). */
export interface ConvergenceThresholds {
  readonly minSample: number;
  readonly overThreshold: number;
  readonly convergedThreshold: number;
  readonly lowTenureMultiplier: number;
}

/**
 * `evaluateConvergence` (design §7) — the exact ladder, in order:
 *   1. `sample < minSample` → `still_calibrating` (not enough history to say anything yet).
 *   2. `dismissalShare > overThreshold × (isLowTenure ? lowTenureMultiplier : 1)` → `over_calibrated`
 *      (the low-tenure leniency WIDENS the over-flag tolerance for FRESH/ACCLIMATED lieutenants — design
 *      §7/canon "low-tenure may over-flag initially"; every OTHER bucket gets the bare `overThreshold`).
 *   3. `dismissalShare < convergedThreshold` → `converged` (rarely dismissed — well-calibrated).
 *   4. else → `converging` (the default middle band).
 * PURE — a total function of (sample, thresholds), no clock/RNG/DB. `dismissalShare` is only ever
 * computed once `sample >= minSample` (never a division-by-zero path — `minSample` is registry-clamped
 * to >= 3, `flag-discipline-tunables.ts`).
 */
export function evaluateConvergence(input: ConvergenceSample, thresholds: ConvergenceThresholds): ConvergenceBucket {
  if (input.sample < thresholds.minSample) return 'still_calibrating';

  const dismissalShare = input.dismissedCount / input.sample;
  const effectiveOverThreshold = input.isLowTenure
    ? thresholds.overThreshold * thresholds.lowTenureMultiplier
    : thresholds.overThreshold;

  if (dismissalShare > effectiveOverThreshold) return 'over_calibrated';
  if (dismissalShare < thresholds.convergedThreshold) return 'converged';
  return 'converging';
}

/**
 * `frequencyBand` (design §7) — flags RAISED (any resolution, including still-`pending`) over the last 7
 * game-days: `0` → `'none'`; below `frequentMin` → `'occasional'`; at/above `frequentMin` → `'frequent'`.
 * PURE — `frequentMin` is the caller's OWN getter-resolved value (`flag_frequency_band_frequent_min`,
 * `flag-discipline-tunables.ts`), never re-read here.
 */
export function frequencyBand(count: number, frequentMin: number): FlagFrequencyBand {
  if (count <= 0) return 'none';
  if (count < frequentMin) return 'occasional';
  return 'frequent';
}

/** Getter-backed thresholds for `trustBudgetBucket` (`flag-discipline-tunables.ts`) — PASSED IN, never
 *  read here (the SAME "thresholds passed in" discipline every other function in this file honors). */
export interface TrustBudgetThresholds {
  readonly lowRatio: number;
  readonly highRatio: number;
}

/**
 * `trustBudgetBucket` (design §7 D12) — `tokens / maxTokens` → the closed 3-value band: `< lowRatio` →
 * 'low'; `> highRatio` → 'high'; else → 'standard'. PURE — thresholds passed in, no clock/RNG/DB.
 * `maxTokens` is always the registry-clamped `flag_credibility_tokens_max_per_lieutenant` getter (>= 2,
 * `flag-discipline-tunables.ts`) — never a division-by-zero path. Ratios expressed as FRACTIONS of max
 * (design §1 D12 — "so a tunable max change doesn't silently reshape bands").
 */
export function trustBudgetBucket(tokens: number, maxTokens: number, thresholds: TrustBudgetThresholds): TrustBudgetBucket {
  const ratio = tokens / maxTokens;
  if (ratio < thresholds.lowRatio) return 'low';
  if (ratio > thresholds.highRatio) return 'high';
  return 'standard';
}

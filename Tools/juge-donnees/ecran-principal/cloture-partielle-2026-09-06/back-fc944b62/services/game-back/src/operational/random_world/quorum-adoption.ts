// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C4 (quorum_on_stadler_row —
//             adoption accumulation, seeded Normal threshold, cascade excess/locality)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.5.6
//             (quorum_on_stadler_row) + §3.4 ("Hysteresis (quorum): pas time-driven — position IS the
//             adoption state variable itself") + §3.7 (D11 revised adjacency, the cascade locality
//             payoff this module's `cascadeExcess`/`isNearOwnThresholdFromBelow` feed)
//             — 04g-B C4 — 2026-07-15
//
// `quorum-adoption.ts` — the PURE math for `quorum_on_stadler_row` (design §3.5.6): the per-district
// adoption accumulator, the seeded Normal-distribution threshold draw, and the cascade excess/eligibility
// predicates. Zero I/O, zero registry reads (R2.3 — every numeric coefficient is an explicit
// caller-supplied parameter) — directly importable for precompute-then-observe E2E assertions, mirrors
// `district-hum-weighting.ts`/`recovery-curve.ts`'s own C1/C2 posture. The CALLER
// (`random-world-event-generator.service.ts`'s `applyQuorumAdoptionAndFlips`, C4) owns ALL I/O: fetching
// hum observations (S13), yesterday's persisted adoption (`random_world_daily_run.quorum_adoption`), the
// active-quorum-events set, and the D11 adjacency graph (`district-adjacency.ts`, C3 — REUSED, never
// re-derived here).
//
// ★ "variance" coder judgment call (documented, not silently assumed): CATALOGUE_REPORT.md :630 calls
// `quorum_threshold_variance` (default 0.15) a "variance", but the registered clamp domain (design §3.5.6
// "clampé 0.2..0.8") is EXACTLY `quorum_threshold_mean`(0.5) ± 2×`quorum_threshold_variance`(0.15) =
// [0.2, 0.8] — this arithmetic only makes sense if the tunable is consumed as a STANDARD DEVIATION (a
// true variance of 0.15 ⇒ σ≈0.387, which would clamp-saturate almost every draw to the domain edges, a
// degenerate near-bimodal distribution the design's own "drawn from a per-neighborhood distribution"
// prose does not read as intended). This file therefore treats `quorum_threshold_variance` as σ directly
// (a common colloquial "variance" ⇒ "spread" usage) — the SAME value, UNSQUARED, feeds the Box-Muller
// transform below.

import type { Rng } from '../../common/seeded-rng';
import { medianOf } from './district-hum-weighting';

/** clamp v to [0,1] — the adoption domain (mirrors `ambient-attend.service.ts`'s own `clamp01`,
 *  per-file self-containment, the established convention this codebase already follows for this exact
 *  3-line helper). */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** One district's hum observation — decoupled input shape (mirrors `district-hum-weighting.ts`'s own
 *  `DistrictHumObservation`, intentionally duplicated here rather than imported: this module wants ZERO
 *  import coupling to that file beyond the shared `medianOf` helper). */
export interface DistrictHumObservation {
  readonly districtId: number;
  readonly avgHeat: number;
}

/**
 * The quorum adoption "signal" (design §3.5.6: "excès normalisé du baseline hum district vs médiane
 * ville"). UNLIKE `district-hum-weighting.ts`'s own hailstorm weight (floored at 0 — only ABOVE-median
 * districts get boosted), this signal is SIGNED: a district below the city median produces a NEGATIVE
 * signal (design "décroît du même taux quand l'excès est négatif" — adoption must be able to fall, not
 * just rise). Same "excess = raw difference, never a ratio" shape as the hailstorm weight (a ratio
 * degenerates on a median of 0 — the common freshly-seeded-world case).
 */
export function districtAdoptionSignal(
  observations: readonly DistrictHumObservation[],
  allDistrictIds: readonly number[],
  districtId: number,
): number {
  const heatByDistrict = new Map(observations.map((o) => [o.districtId, o.avgHeat]));
  const heats = allDistrictIds.map((id) => heatByDistrict.get(id) ?? 0);
  const median = medianOf(heats);
  const heat = heatByDistrict.get(districtId) ?? 0;
  return heat - median;
}

/**
 * One day's adoption update (design §3.5.6: "adoption += quorum_adoption_accumulation_rate × signal ...
 * décroît du même taux quand l'excès est négatif; clamp 0..1"). Pure — the caller supplies
 * `prevAdoption` (read back from YESTERDAY's `random_world_daily_run.quorum_adoption`, 0 if no prior
 * row / first day ever — a district with no accumulated history starts neutral, never fabricated).
 */
export function nextAdoption(prevAdoption: number, accumulationRate: number, signal: number): number {
  return clamp01(prevAdoption + accumulationRate * signal);
}

/**
 * `drawStandardNormal` — Box-Muller transform (one z-score per call, consumes EXACTLY 2 `rng.next()`
 * draws, deterministic draw-count regardless of the sampled value). `Math.max(u1, Number.EPSILON)`
 * guards `Math.log(0) = -Infinity` — a structurally-unreachable edge given mulberry32's `[0,1)` range
 * excludes exactly `0` with overwhelming probability; kept as a defensive floor, never changes the
 * consumed-draw-count.
 */
function drawStandardNormal(rng: Rng): number {
  const u1 = Math.max(rng.next(), Number.EPSILON);
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * The per-district seeded threshold draw (design §3.5.6/plan AC7: "threshold tiré seedé par district
 * `quorum:{district_id}` de Normal(mean, variance), clampé 0.2..0.8" — see file-header ★ note on the
 * variance-vs-stddev reading). Callers construct `rng = makeRng('quorum:' + districtId)` (a STABLE
 * per-campaign seed, no `game_day` component — design §8 "stable campagne") and pass it here; the
 * result is computed FRESH on demand every time it is needed (never persisted — the SAME seed always
 * reproduces the SAME threshold, so no storage is needed, extending design D10's own "no dedicated
 * 18-float table" spirit one step further: not even for the threshold itself).
 */
export function drawQuorumThreshold(
  rng: Rng,
  mean: number,
  stddev: number,
  clampMin: number,
  clampMax: number,
): number {
  const z = drawStandardNormal(rng);
  return Math.min(clampMax, Math.max(clampMin, mean + stddev * z));
}

/** The flipped district's OWN excess over ITS OWN threshold (design §3.5.6: "l'excédent du flippé") —
 *  always ≥ 0 by construction when called at the moment `adoption >= threshold` is first observed;
 *  floored defensively regardless. */
export function cascadeExcess(newAdoption: number, threshold: number): number {
  return Math.max(0, newAdoption - threshold);
}

/**
 * Whether `districtId` is "already near its own threshold" FROM BELOW (design §3.5.6 canon "already
 * near its own threshold; otherwise dampens" — the plan's own C4 AC8 worked example fixes the exact
 * direction: "adoption = threshold(D′) − 0.05 (dans la bande 0.1)", i.e. adoption sits BELOW threshold
 * by at most `band` — the scenario a cascade nudge could plausibly tip over). A district AT or ABOVE
 * its own threshold is never boosted here (it has either already flipped independently this SAME tick,
 * or is already `active` — the caller excludes already-active districts before calling this).
 */
export function isNearOwnThresholdFromBelow(adoption: number, threshold: number, band: number): boolean {
  const gap = threshold - adoption;
  return gap >= 0 && gap <= band;
}

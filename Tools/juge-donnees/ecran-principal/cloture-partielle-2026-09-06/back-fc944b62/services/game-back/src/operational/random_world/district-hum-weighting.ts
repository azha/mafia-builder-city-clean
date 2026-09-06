// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (halgren_tannery_hailstorm
//             activation — hum-weighted district selection)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.5.1
//             ("district cible tiré pondéré par « district condition » = baseline hum du district
//             relative à la médiane ville (S13 aggregateAvgHeatByDistrict — un district plus chaud que
//             sa médiane est plus vulnérable ; poids `1 + hum_condition_weight × excès normalisé`)")
//             Seam S13: operational/ambient/constant-hum.repository.ts's `aggregateAvgHeatByDistrict()`
//             — READ-only consumption (D7), never a write into `ambient_micro_event`/`constant_hum_cell`.
//             — 04g-B C2 — 2026-07-15
//
// `district-hum-weighting.ts` — the hum-weighted district draw (design §3.5.1). PURE: zero I/O, zero
// registry reads — the caller fetches `aggregateAvgHeatByDistrict()`'s REAL rows + `randomWorldTunables.
// hailstormHumConditionWeight` and passes them in (R2.3). Directly importable for precompute-then-observe
// E2E assertions (mirrors `scar-polygon.ts`/`ambient-micro-event.service.ts`'s exported pure draws).
//
// "excès normalisé" (design prose, not further numerically pinned) — this module's own micro-decision,
// documented here rather than silently assumed: an ADDITIVE excess above the city-wide median
// (`max(0, districtAvgHeat - cityMedianHeat)`), never a RATIO (a ratio degenerates to a divide-by-zero /
// all-weights-collapse-to-1 case whenever the median itself is 0 — the common case for a freshly-seeded
// world where most districts have zero buildings). A district AT OR BELOW the city median keeps the
// BASELINE weight 1 (never penalized below base — design only says hotter districts are "more
// vulnerable", never that colder ones are LESS likely than baseline); a district ABOVE the median is
// boosted proportionally to `hailstorm_hum_condition_weight × its absolute excess`. Weight is floored at
// 0 (never negative) — with `hailstorm_hum_condition_weight` clamped to `[0, 2.0]` (registry range) this
// floor is structurally inert in practice, kept only as a defensive bound.

import type { Rng } from '../../common/seeded-rng';

/** One district's hum observation (mirrors `ConstantHumRepository.DistrictHeatObservation`, decoupled
 *  here so this module has zero import dependency on the ambient repository's own types). */
export interface DistrictHumObservation {
  readonly districtId: number;
  readonly avgHeat: number;
}

/** One district's resolved draw weight (diagnostic — exposed via the `read-hum-weights` test probe so
 *  an E2E can precompute the exact expected winner from the SAME live observations, never a
 *  re-implementation of the aggregate query itself). */
export interface DistrictWeight {
  readonly districtId: number;
  readonly weight: number;
}

// EXPORTED (04g-B C4, additive visibility widening — function body untouched): `quorum-adoption.ts`'s
// `districtAdoptionSignal` reuses this SAME median helper (the quorum template's own "excès normalisé
// du baseline hum district vs médiane ville" signal, design §3.5.6, is the SAME phrase/computation
// shape as this file's own hailstorm weight — just without the `Math.max(0, …)` floor, since quorum
// needs a SIGNED excess). `drawWeightedDistrict`/`districtHumWeights` below are unaffected.
export function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Resolve every district's draw weight (design §3.5.1). `allDistrictIds` is the FULL 18-district
 * roster (a district with zero buildings never appears in `observations` — `aggregateAvgHeatByDistrict`
 * never emits an empty GROUP BY row, `constant-hum.repository.ts`'s own doc — and is treated as
 * `avgHeat = 0` here, the coldest possible reading).
 */
export function districtHumWeights(
  observations: readonly DistrictHumObservation[],
  allDistrictIds: readonly number[],
  humConditionWeight: number,
): readonly DistrictWeight[] {
  const heatByDistrict = new Map(observations.map((o) => [o.districtId, o.avgHeat]));
  const heats = allDistrictIds.map((id) => heatByDistrict.get(id) ?? 0);
  const median = medianOf(heats);

  return allDistrictIds.map((districtId) => {
    const heat = heatByDistrict.get(districtId) ?? 0;
    const excess = Math.max(0, heat - median);
    const weight = Math.max(0, 1 + humConditionWeight * excess);
    return { districtId, weight };
  });
}

/**
 * ONE seeded weighted draw over `weights` (a roulette-wheel selection — cumulative weight vs. a SINGLE
 * `rng.next()` draw, deterministic tie-break by array order on floating-point edge cases). Falls back to
 * a uniform `rng.int` draw ONLY in the structurally-unreachable case where every weight is exactly 0
 * (never happens given the floor-at-1-for-at-or-below-median shape above, kept as a defensive guard —
 * still consumes exactly one `rng` draw either way, so the stream position is deterministic regardless
 * of branch).
 */
export function drawWeightedDistrict(weights: readonly DistrictWeight[], rng: Rng): number {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) {
    return weights[rng.int(0, weights.length - 1)]!.districtId;
  }
  const u = rng.next() * total;
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (u < cumulative) return w.districtId;
  }
  return weights[weights.length - 1]!.districtId; // floating-point safety net (cumulative rounding).
}

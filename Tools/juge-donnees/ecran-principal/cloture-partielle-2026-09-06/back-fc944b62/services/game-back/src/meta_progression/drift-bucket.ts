// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C6 ("the player payload
//             shows `DriftBucketEnum` only (two accumulator pcts in one bucket -> byte-identical rows)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §9.2 ("Player sees
//             only `DriftBucketEnum` (LOW/MODERATE/HIGH derived from the accumulator vs the threshold —
//             P5)") + §10 (the GET .../benchmark contract — `{metric_key, drift_bucket}`, never the raw pct).
//             Pattern (a threshold-relative closed band, never a tunable — mirrors `blockingBand`'s own
//             "map a raw scalar -> its closed enum band" shape): `erlang-stash.service.ts#blockingBand`.
//             — P3-H C6 — 2026-07-24
//
// `drift-bucket.ts` — the PURE `drift_accumulator -> DriftBucket` derivation (design §9.2/§10 — P5: the
// raw accumulator pct NEVER reaches the player payload, only this closed 3-value band). Design names the
// band members (LOW/MODERATE/HIGH) and the axis ("vs the threshold") but not exact cut points — ★
// coder-disclosed realization (no existing precedent pins a specific split for THIS metric, unlike
// `blockingBand`'s own `stash.blocking_alert_threshold` single-cut precedent): thirds-of-threshold, the
// same "make the threshold itself the reference scale" idea `blockingBand` uses, generalized to 3 bands
// since design names 3 (not `blockingBand`'s 4). `benchmark_auto_update_threshold_pct`'s own domain (10..40,
// always > 0) makes the division below always well-defined; the defensive floor-at-1 guard below only
// matters for a pathological zero override, never a real tunable value.

/** `DriftBucketEnum` (design §9.2/§10) — the closed player-facing band. */
export type DriftBucket = 'LOW' | 'MODERATE' | 'HIGH';

/**
 * `driftBucketFor` — LOW below a third of the auto-update threshold, MODERATE below two-thirds, HIGH at or
 * above two-thirds (approaching the silent auto-update, design §9.2's own "vs the threshold" axis). Two
 * accumulator pcts landing in the same third -> byte-identical bucket (the falsifiable's own "byte-identical
 * rows" proof). Pure, deterministic, no RNG.
 */
export function driftBucketFor(driftAccumulator: number, autoUpdateThresholdPct: number): DriftBucket {
  const threshold = autoUpdateThresholdPct > 0 ? autoUpdateThresholdPct : 1; // defensive — never 0/negative in practice (tunable range 10..40).
  if (driftAccumulator >= (2 * threshold) / 3) return 'HIGH';
  if (driftAccumulator >= threshold / 3) return 'MODERATE';
  return 'LOW';
}

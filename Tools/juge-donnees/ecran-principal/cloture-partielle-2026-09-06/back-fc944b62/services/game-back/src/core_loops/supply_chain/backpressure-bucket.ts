// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 ("Buckets canon (silent/
//             mild/warm/critical) — pure fn, getter-backed boundaries, R2.2-ready (consumed C9)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.2 ("Buckets canon
//             (`silent <0.10 | mild | warm ≥0.40 | critical >0.75`, backpressure_trace.md:56-60), seuils
//             tunables.").
//             Canon: docs/tech/05_player_core_loops/backpressure_trace.md — the doc's OWN two self-
//             contradicting critical cut-points ("index >= 0.85 (critical bucket)", line 54, vs "critical:
//             > 0.75", line 60) are resolved by ITS OWN §Tunables table (line 152: `core_loops.
//             backpressure_critical_threshold` default `0.85`) — the registered getter (C1) is the
//             AUTHORITATIVE value (R9.3, registry-first); this module reads ONLY the getters, never a
//             literal 0.75/0.85.
//             — P3-C C5 — 2026-07-12
//
// `backpressureBucket` — the PURE (no DB, no RNG) canon bucket derivation, getter-backed boundaries. The
// OPERATOR SHAPE is design §6.2's own literal wording, verbatim: `silent < mild` (strict), `mild` covers
// `[mild, warm)`, `warm` covers `[warm, critical)`, `critical` is STRICTLY `> critical` (design's own
// asymmetric phrasing — every OTHER boundary is inclusive-at-its-own-floor, critical alone is exclusive;
// mirrors the SAME strict-`>` convention `mycelial-stress.ts#isStressed`'s own header already anticipated
// for "backpressureCriticalThreshold's own bucket cut"). R2.2-ready: this is the ONLY thing C9's player
// projection will ever surface — never the raw `backpressure_index`.

export type BackpressureBucket = 'silent' | 'mild' | 'warm' | 'critical';

/**
 * Map a raw `backpressure_index` ∈ [0,1] to its qualitative `BackpressureBucket` (design §6.2). Boundaries
 * are ALWAYS getter-resolved (`coreLoopsTunables.backpressureMildThreshold`/`...WarmThreshold`/
 * `...CriticalThreshold`) — never inlined here (R2.3).
 */
export function backpressureBucket(
  index: number,
  mildThreshold: number,
  warmThreshold: number,
  criticalThreshold: number,
): BackpressureBucket {
  if (index > criticalThreshold) return 'critical';
  if (index >= warmThreshold) return 'warm';
  if (index >= mildThreshold) return 'mild';
  return 'silent';
}

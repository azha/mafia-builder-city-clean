// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C9 ("projections joueur ...
//             en BUCKETS uniquement ... SinuosityStressBucket")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.6 ("P3-C AJOUTE la
//             projection canonique joueur `SinuosityStressBucket = pristine | stressed | critical |
//             severed` dérivée des tunables : `pristine < stress_warning (2.0)` [...] ; `stressed [2.0,
//             2.4)` ; `critical ≥ 2.4 & state≠severed` [...] ; `severed = state`.") + §13 (R2.2/P5 wall —
//             NEVER raw `sinuosity_index`).
//             Pattern: `backpressure-bucket.ts` (the PURE, no-DB, getter-backed bucket derivation shape).
//             — P3-C C9 — 2026-07-13
//
// `sinuosityStressBucket` — the player-projection wall for a route's `sinuosity_index`/`state` (design
// §7.6). The literal cut-points this function reads are `core_loops.sinuosity_stress_warning_threshold`
// (its OWN C1 doc-comment: "also the `SinuosityStressBucket.stressed` LOWER bound", default 2.0) and
// `core_loops.sinuosity_stressed_bucket_upper_bound` (its OWN C1 doc-comment: "= collapse_threshold by
// canon construction", default 2.4) — matching design §7.6's literal formula verbatim.
//
// ★ FOUND, NOT SILENTLY RESOLVED (flagged for reviewer / C10 reconcile — mirrors this lot's OWN "C1-fold
// reconcile" precedent, decisions §5): TWO other C1-authored getters carry `SinuosityStressBucket`-labeled
// doc-comments this function does NOT consume — `sinuosity_pristine_bucket_upper_bound` (default 1.5,
// commented "pristine upper bound ... the canon 1.5-2.0 gap absorbed into pristine") and
// `sinuosity_critical_bucket_upper_bound` (default 3.0, commented "critical upper bound ... a route past
// this is severed by construction"). Both are INTERNALLY INCONSISTENT with design §7.6's own literal
// prose as implemented here: if `sinuosityPristineBucketUpperBound` (1.5) were the real pristine/stressed
// cut, the 1.5-2.0 gap would NOT be "absorbed into pristine" (it would be absorbed into NEITHER bucket,
// or into `stressed` instead) — only `sinuosityStressWarningThreshold` (2.0) makes that literal design
// sentence true. Likewise `sinuosityCriticalBucketUpperBound` describes a ceiling with no 5th bucket to
// transition into (`critical` is already this function's terminal non-severed branch) — its own comment
// concedes this is definitionally unreachable ("a route past this is severed BY CONSTRUCTION"). This
// function implements design §7.6's LITERAL boundary formula (the binding spec for this chunk) rather
// than silently re-purposing either orphaned getter to manufacture a fake consumption — a routing note
// (both getters' apparent C1 comment/formula mismatch) is due at C10 closeout, the SAME "prose-count vs
// implementation verbatim" pattern the C1-fold TD already tracks for D11's cash-plate count.

export type SinuosityStressBucket = 'pristine' | 'stressed' | 'critical' | 'severed';

/**
 * Map a route's `state` + raw `sinuosity_index` to its qualitative `SinuosityStressBucket` (design §7.6).
 * `severed` is checked FIRST (a severed route's SI is no longer diagnostically meaningful — the collapse
 * already happened, K4). `pristineStressedCut`/`stressedCriticalCut` are ALWAYS getter-resolved by the
 * caller (`coreLoopsTunables.sinuosityStressWarningThreshold`/`...StressedBucketUpperBound`) — never
 * inlined here (R2.3).
 */
export function sinuosityStressBucket(
  state: 'draft' | 'active' | 'saturated' | 'severed',
  sinuosityIndex: number,
  pristineStressedCut: number,
  stressedCriticalCut: number,
): SinuosityStressBucket {
  if (state === 'severed') return 'severed';
  if (sinuosityIndex < pristineStressedCut) return 'pristine';
  if (sinuosityIndex < stressedCriticalCut) return 'stressed';
  return 'critical';
}

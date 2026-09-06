// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C3 ("bucket derivation
//             ELIGIBLE-first so a threshold below 40 can't produce a phantom PRACTICED; `progress_band`
//             coarse thirds").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §0(a)/§11 (the
//             `NASCENT|LEARNING|PRACTICED|ELIGIBLE` derived buckets, canon invariant `ELIGIBLE ⟺ raw_score
//             >= threshold`, no stored eligibility flag) + §13 ("bucket bounds 20/40... GDD-verbatim
//             mechanics constants — a knob here would let a DB override silently rebalance a fixed GDD
//             number, never the intent" — NOT tunables, hardcoded here exactly as canon fixes them).
//             Canon: docs/tech/06_meta_progression/graduated_retirement_pivot.md §Composites
//             `MasteryBucketEnum` verbatim — NASCENT [0..20) / LEARNING [20..40) / PRACTICED [40..threshold)
//             / ELIGIBLE [threshold..100]. §Composites also names `recall_debt_signal`'s own LOW/MEDIUM/HIGH
//             thirds vocabulary (design §10.2) — REUSED here for `progress_band` (same coarse-band idiom,
//             same design doc, not a new invention).
//             — P3-F C3 — 2026-07-18
//
// `mastery-bucket.ts` — pure, registry-free derivation functions (mirrors `tenure-inertia.ts`'s own "small,
// parameterized, no DI, no DB" posture) for the TWO closed-domain surfaces the player-facing projection
// (C3) exposes over a raw `mastery_score.mastery_score` value: `MasteryBucket` (the canon 4-value enum,
// GDD-verbatim) and `ProgressBand` (the R2.2-hardened divergence from canon's raw "percentage" — design §11
// explicitly bans the raw/percentage and asks for "coarse thirds toward threshold" instead; a 3-value band
// derived FROM the bucket, never a second independent raw-score computation, so it is BY CONSTRUCTION
// byte-identical whenever the bucket itself is byte-identical — see `progressBandForMasteryBucket`).
//
// ELIGIBLE-FIRST (plan C3's own falsifiable wording): the threshold check MUST run before the fixed 20/40
// cut points are consulted. `meta.mastery_retirement_threshold` ranges 30..80 (meta-progression-tunables.ts
// CAPS), so it CAN sit below the 40 cut — checking ELIGIBLE first means a raw score that has already
// crossed a sub-40 threshold can never be mis-bucketed into PRACTICED (or, in `deriveProgressBand`, into a
// phantom MEDIUM) on its way through the fixed cut points. `GraduationService.validateGraduationEligible`
// (C5+) re-derives eligibility server-side via the SAME `raw >= threshold` comparison this file's
// `deriveMasteryBucket` performs — never trusted from the client (design §8.1 step 1).

/** The canon `MasteryBucketEnum` (graduated_retirement_pivot.md §Composites, GDD-verbatim, no `PROFICIENT`). */
export type MasteryBucket = 'NASCENT' | 'LEARNING' | 'PRACTICED' | 'ELIGIBLE';

/** The R2.2-hardened "coarse thirds toward threshold" band (design §11) — replaces canon's raw
 *  bucket+percentage progress bar with a closed 3-value band, never the raw/percentage (P5). Reuses the
 *  SAME LOW/MEDIUM/HIGH vocabulary design §10.2 already establishes for `recall_debt_signal`. */
export type ProgressBand = 'LOW' | 'MEDIUM' | 'HIGH';

/** NASCENT/LEARNING cut (canon-fixed, GDD-verbatim — NOT a tunable, design §13). */
const NASCENT_LEARNING_CUT = 20;
/** LEARNING/PRACTICED cut (canon-fixed, GDD-verbatim — NOT a tunable, design §13). */
const LEARNING_PRACTICED_CUT = 40;

/**
 * `MasteryBucket` derivation — ELIGIBLE-first (see file header): `raw >= threshold` is checked BEFORE the
 * fixed 20/40 cuts, so a threshold configured below 40 (the tunable's range floor is 30) can never produce
 * a phantom PRACTICED (or LEARNING) result for an already-eligible raw score. Below threshold, the fixed
 * canon cuts apply verbatim.
 */
export function deriveMasteryBucket(rawScore: number, threshold: number): MasteryBucket {
  if (rawScore >= threshold) return 'ELIGIBLE';
  if (rawScore < NASCENT_LEARNING_CUT) return 'NASCENT';
  if (rawScore < LEARNING_PRACTICED_CUT) return 'LEARNING';
  return 'PRACTICED';
}

/**
 * `ProgressBand` derivation — a PURE fold of the already-derived `MasteryBucket`, never a second
 * independent raw/threshold computation (NASCENT → LOW, LEARNING → MEDIUM, {PRACTICED, ELIGIBLE} → HIGH —
 * "the final third" of the progress bar, whether approaching the threshold or already past it). Because
 * this is a function purely OF the bucket, two raw scores that land in the SAME bucket (e.g. 21 and 39,
 * both LEARNING under any threshold >= 40) are GUARANTEED byte-identical progress bands too — the plan C3
 * falsifiable "two internal states in the same band → byte-identical projection rows" invariant holds by
 * construction, not by coincidence of the cut points chosen.
 */
export function progressBandForMasteryBucket(bucket: MasteryBucket): ProgressBand {
  switch (bucket) {
    case 'NASCENT':
      return 'LOW';
    case 'LEARNING':
      return 'MEDIUM';
    case 'PRACTICED':
    case 'ELIGIBLE':
      return 'HIGH';
  }
}

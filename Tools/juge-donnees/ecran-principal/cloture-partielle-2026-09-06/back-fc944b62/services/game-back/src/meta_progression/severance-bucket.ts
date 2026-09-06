// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("PromotionLockService
//             per design §9 ... severance buckets from tenure bands (R2 branch)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §9.1 step 2
//             ("severance_bucket from the recalled lieutenant's tenure band (Phase-11 REUSE —
//             LOW/MEDIUM/HIGH/RUINOUS; +1 band on re-delegation history D12)").
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md
//             divergence #23 ("Severance ∝ tenure — bucket only, no formula ... concretization over the
//             REAL tenure substrate; exact band bounds = C8 constants documented in gdd/14 as invariant
//             rows (not knobs — canon gives none)") + divergence #17/D12 (the ×3 COST-multiplier reading
//             — realized here as a ONE-band escalation, never a count cap).
//             Pattern: `operational/lieutenant/tenure-inertia.ts` (`TenureInertiaBucketComposite` —
//             FRESH|ACCLIMATED|SEASONED|SENIOR|ENTRENCHED, the REAL Phase-11 tenure band this module
//             concretizes into the ch06 `SeveranceBucket` vocabulary).
//             — P3-F C8 — 2026-07-19
//
// `SeveranceBucket` (design §2 row "ReversalCostComposite ... SeveranceBucket (LOW|MEDIUM|HIGH|RUINOUS)")
// — the canon 4-band severance vocabulary, concretized here from the REAL 5-band Phase-11 tenure bucket
// (`bucketForStreak`, `tenure-inertia.ts`). Canon gives no exact mapping (divergence #23: "bucket only, no
// formula") — the 5→4 collapse below is a NEW, coder-discretion constant, LOUD-documented (never a fig-
// leaf ratio): a lieutenant recalled EARLY in their tenure (FRESH/ACCLIMATED — canon "peu de temps
// investi") owes the least severance; ENTRENCHED (the longest-tenured, most org-invested) owes the
// RUINOUS ceiling. `escalateSeveranceBucket` realizes D12's "re-delegation ×3" as a ONE-band step-up
// (★#2 ruled: the canon COST multiplier, NOT a count cap — decisions §6), capped at RUINOUS (never
// wraps/overflows past the ceiling — the SAME "cap, never wrap" discipline `MasteryScoreRepository.
// applyDelta`'s `LEAST(100, ...)` establishes for a different domain).

import type { TenureInertiaBucketComposite } from '../operational/lieutenant/tenure-inertia';

export type SeveranceBucket = 'LOW' | 'MEDIUM' | 'HIGH' | 'RUINOUS';

/** Ordered LOW→RUINOUS — the escalation ladder `escalateSeveranceBucket` steps along. */
const SEVERANCE_BAND_ORDER: readonly SeveranceBucket[] = ['LOW', 'MEDIUM', 'HIGH', 'RUINOUS'];

/** The 5-band Phase-11 tenure bucket → the 4-band ch06 severance bucket (coder-discretion mapping, see
 *  file header — canon supplies no formula, divergence #23). FRESH and ACCLIMATED both collapse to LOW
 *  (both are "short-tenure, low org-investment" in Phase-11's own §Effects table — COST_1/COST_2, the two
 *  cheapest script-revision bands); SEASONED → MEDIUM; SENIOR → HIGH; ENTRENCHED (Phase-11's own ceiling,
 *  COST_MAX/DISRUPT_MAX/BONUS_CAP) → RUINOUS (this module's ceiling). */
const TENURE_TO_SEVERANCE: Readonly<Record<TenureInertiaBucketComposite, SeveranceBucket>> = {
  FRESH: 'LOW',
  ACCLIMATED: 'LOW',
  SEASONED: 'MEDIUM',
  SENIOR: 'HIGH',
  ENTRENCHED: 'RUINOUS',
};

/** Concretize a Phase-11 tenure bucket into its ch06 severance band (pure lookup). */
export function severanceBucketForTenure(tenureBucket: TenureInertiaBucketComposite): SeveranceBucket {
  return TENURE_TO_SEVERANCE[tenureBucket];
}

/**
 * D12's "re-delegation ×3" cost realization: escalate ONE band up the LOW→MEDIUM→HIGH→RUINOUS ladder.
 * Capped at RUINOUS (a category already at the ceiling from tenure alone stays RUINOUS on a THIRD+
 * recall cycle — never overflows past the closed vocabulary).
 */
export function escalateSeveranceBucket(bucket: SeveranceBucket): SeveranceBucket {
  const idx = SEVERANCE_BAND_ORDER.indexOf(bucket);
  return SEVERANCE_BAND_ORDER[Math.min(idx + 1, SEVERANCE_BAND_ORDER.length - 1)]!;
}

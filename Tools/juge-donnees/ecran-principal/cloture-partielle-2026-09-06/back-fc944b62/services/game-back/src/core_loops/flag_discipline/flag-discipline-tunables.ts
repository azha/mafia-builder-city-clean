// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md C1 (R2.3 — registry-first
//             `core_loops.flag_*` tunables, gdd/14 §Flag Discipline normalized same commit)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §10 (the tunables
//             catalogue, verbatim defaults/ranges) + §1 D3 (why the token CAP is a getter clamp, NOT a
//             DB CHECK).
//             Decisions: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-decisions.md §1.3 (D3) +
//             §1.8 (D8 — `flag_weekly_reset_day_of_week` REFUSED as a store key) + §6 RULING (sub-decision
//             #5 WEEKLY cadence RATIFIED — the invariant-row posture below is final, not provisional).
//             Registry: gdd/14_tunable_constants.md §"Core loops — Flag Discipline" (this chunk, same
//             commit — R2.3 registry-FIRST; the 4 legacy unprefixed rows :225-228 are NORMALIZED to the
//             prefixed canonical form here, not duplicated — the mapping-table rows :4444-4447 point HERE).
//             Pattern: mirrors `core-loops-tunables.ts` (CAPS map + clamp function + frozen getters) — the
//             sibling module this design calls for verbatim (design §10: "NEW `flag-discipline-tunables.ts`").
//             — P3-B C1 — 2026-07-11
//
// `flag-discipline-tunables.ts` — registry-mirrored getters for the P3-B ch05 Loop 2 tunable catalogue:
// token economy (max/regen/window/dismissal-penalty), convergence dynamics (window/leniency/sample/
// thresholds), deviation detection (base threshold + 5 per-bucket tenure-conservatism multipliers +
// exhaustion urgency), routine-item bookkeeping (per-generator cap + retention), and the 2 client-facing
// band boundaries (trust-budget ratios + frequency-band minimum). R2.3 (NO inline numeric balance/config):
// every default below is verbatim from the design's own §10 catalogue (6 canonical-renamed legacy keys +
// 15 honest `[PROV-Y26Q3]` additions canon gives no numbers for) — the single source of truth is gdd/14.
// If a registry value changes, update gdd/14 + this file in the SAME commit (R9.3).
//
// ★ Count reconciliation (R2.3 honesty, mirrors `core-loops-tunables.ts`'s own header precedent + gdd/14's
// established "N → M tunables" reconciliation convention, `gdd/14:2398`): the design's own prose rounds
// this catalogue to "~18 keys" (§10/§Statut) because it folds the 5 per-bucket `flag_tenure_conservatism_*`
// keys into one bullet ("fresh/acclimated/seasoned/senior/entrenched"); COUNTED verbatim (6 canonical +
// 15 `[PROV-Y26Q3]`, the 5 tenure-conservatism keys each a REAL separate store key — design §1.5's own
// value-sensitivity proof requires them independently addressable) the catalogue was **21 physical keys**
// at C1. **C3 adds ONE MORE** (`flag_stash_reorder_fill_point_grams` — the STASH_REORDER deviation-source
// gap C0 §8.5(a) surfaced: `product_storage`/`buildings` carry no fill-point/capacity column for the
// product-storage warehouse this generator targets; C0 found only the UNRELATED cash-holding "stash"
// concept, `stashRatioPermille`/`capacityCentsForTier`, `operational/insurance/*`). A separate, ORPHANED
// gdd/14 pair was considered and REJECTED as the grounding: `product_storage.stash_tier_1_capacity_kg_
// brindle`/`stash_tier_5_capacity_kg_brindle` (04a/product_storage.md:30/:42) exist in the registry but
// are wired to NO code getter anywhere (grep-verified zero hits) and only bracket tiers 1/5 — tiers 2-4
// have no registered value, so a full per-tier capacity model would have to INVENT 3 numbers (R2.3
// violation). The new key below is instead a flat, tier-agnostic grams threshold, `[PROV-Y26Q3]` like
// every other C1 honest-gap addition, but its DEFAULT is deliberately GROUNDED at the Tier-1 canon
// figure (5 kg = 5000 g, `product_storage.md:30`) rather than picked arbitrarily. The catalogue is now
// **22 physical keys**; all 22 are registered below, none silently dropped to match a headline count.
//
// ★ `flag_weekly_reset_day_of_week` is DELIBERATELY NOT a key here (D8, sub-decision #5 RATIFIED): the
// canon key is degenerate under the scheduler's WEEKLY cadence (which already fires every 7 game-days —
// the natural reset boundary) — encoding it as a live 0..6 store key would require a NIGHTLY-keyed
// `game_day % 7 === offset` mechanism built solely to animate a knob (decisions §1.8 "knob-worship").
// gdd/14 registers it as a design-invariant row instead (same commit, §Flag Discipline section).

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `CoreLoopsTunableRange`'s shape). */
export interface FlagDisciplineTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `FLAG_DISCIPLINE_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the design
 * §10 catalogue. Used internally by every numeric getter below (defense-in-depth: the getter itself never
 * returns an out-of-bounds value even if a raw DB override was written out of range) — this is the SAME
 * discipline the migration's own header explains for why `lieutenant_flag_state.credibility_tokens` has
 * NO upper-bound DB CHECK: the ceiling lives HERE (the `LEAST()` clamp of every crediting statement, C2),
 * not in the schema.
 */
export const FLAG_DISCIPLINE_TUNABLE_CAPS: Record<string, FlagDisciplineTunableRange> = {
  // ── Token economy (canonicalized gdd/14 §"Core loops — Flag Discipline" legacy rows :225-228) ────────
  'core_loops.flag_credibility_tokens_max_per_lieutenant':      { min: 2,    max: 10  },
  'core_loops.flag_token_regen_per_day':                        { min: 0,    max: 3   },
  'core_loops.flag_batch_confirm_window_real_hours':            { min: 8,    max: 24  },
  'core_loops.flag_dismissal_trust_penalty_modifier':           { min: -5,   max: 0   },
  // ── Convergence dynamics (canon window/leniency numbered; thresholds honest-gap [PROV-Y26Q3]) ────────
  'core_loops.flag_convergence_evaluation_window_days':         { min: 14,   max: 90  },
  'core_loops.flag_low_tenure_overflag_tolerance_multiplier':   { min: 1.0,  max: 2.0 },
  'core_loops.flag_convergence_min_sample':                     { min: 3,    max: 20  },
  'core_loops.flag_convergence_over_threshold':                 { min: 0.2,  max: 0.8 },
  'core_loops.flag_convergence_converged_threshold':            { min: 0.05, max: 0.3 },
  // ── Deviation detection (D5 — all [PROV-Y26Q3], canon gives no numbers) ─────────────────────────────
  'core_loops.flag_deviation_threshold_base':                   { min: 0.1,  max: 0.9 },
  'core_loops.flag_tenure_conservatism_fresh':                  { min: 0.5,  max: 2.0 },
  'core_loops.flag_tenure_conservatism_acclimated':              { min: 0.5,  max: 2.0 },
  'core_loops.flag_tenure_conservatism_seasoned':                { min: 0.5,  max: 2.0 },
  'core_loops.flag_tenure_conservatism_senior':                  { min: 0.5,  max: 2.0 },
  'core_loops.flag_tenure_conservatism_entrenched':              { min: 0.5,  max: 2.0 },
  'core_loops.flag_exhaustion_exception_urgency_threshold':      { min: 0.5,  max: 1.0 },
  // ── Routine-item bookkeeping (D4 — [PROV-Y26Q3]) ────────────────────────────────────────────────────
  'core_loops.flag_routine_items_per_generator_daily_cap':       { min: 3,    max: 50  },
  'core_loops.flag_routine_items_retention_days':                { min: 1,    max: 30  },
  // ── STASH_REORDER deviation-source gap (C3 — the C0 §8.5(a) honest gap, grounded at the Tier-1 canon
  //    figure; see the file header's count-reconciliation note for why this is a NEW flat key rather
  //    than a per-tier capacity model) ─────────────────────────────────────────────────────────────────
  'core_loops.flag_stash_reorder_fill_point_grams':              { min: 1000, max: 20000 },
  // ── Client-facing band boundaries (D12 — [PROV-Y26Q3], R2.2 fraction-of-max convention) ─────────────
  'core_loops.flag_trust_budget_low_ratio':                      { min: 0.1,  max: 0.6 },
  'core_loops.flag_trust_budget_high_ratio':                     { min: 0.6,  max: 1.0 },
  'core_loops.flag_frequency_band_frequent_min':                 { min: 2,    max: 10  },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors
 * `clampCoreLoopsTunableToRange`). Returns the value unchanged if no range is registered for the key.
 */
export function clampFlagDisciplineTunableToRange(key: string, value: number): number {
  const range = FLAG_DISCIPLINE_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for the P3-B ch05 Loop 2 `core_loops.flag_*` catalogue (design §10). */
export const flagDisciplineTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Token economy (D2/D3, canon legacy rows :225-228 normalized here — R2.3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** flag_credibility_tokens_max_per_lieutenant — the token cap C2's `LEAST()` clamps regen/return against (NOT a DB CHECK, D3). Default 5, 2..10. */
  get flagCredibilityTokensMaxPerLieutenant(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_credibility_tokens_max_per_lieutenant',
      TunablesStore.resolveInt('core_loops.flag_credibility_tokens_max_per_lieutenant', 'FLAG_CREDIBILITY_TOKENS_MAX_PER_LIEUTENANT', 5));
  },

  /** flag_token_regen_per_day — tokens regenerated per game-day (D7 tick step 3, in-row day-guarded). Default 1, 0..3. */
  get flagTokenRegenPerDay(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_token_regen_per_day',
      TunablesStore.resolveInt('core_loops.flag_token_regen_per_day', 'FLAG_TOKEN_REGEN_PER_DAY', 1));
  },

  /** flag_batch_confirm_window_real_hours — the real-hours PENDING→timed_out window (D7 tick step 2, divergence #9: checked at NIGHTLY granularity). Default 20, 8..24. */
  get flagBatchConfirmWindowRealHours(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_batch_confirm_window_real_hours',
      TunablesStore.resolveInt('core_loops.flag_batch_confirm_window_real_hours', 'FLAG_BATCH_CONFIRM_WINDOW_REAL_HOURS', 20));
  },

  /** flag_dismissal_trust_penalty_modifier — net-token-delta of a dismissal (sub-decision #2 default): total cost = |value| (default 2 = the flag's own token + 1 more). Default −2, −5..0. */
  get flagDismissalTrustPenaltyModifier(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_dismissal_trust_penalty_modifier',
      TunablesStore.resolveInt('core_loops.flag_dismissal_trust_penalty_modifier', 'FLAG_DISMISSAL_TRUST_PENALTY_MODIFIER', -2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Convergence dynamics (D12 — window/leniency canon-numbered; thresholds [PROV-Y26Q3])
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** flag_convergence_evaluation_window_days — the C5 `ConvergenceBucket` lookback window. Default 30, 14..90. */
  get flagConvergenceEvaluationWindowDays(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_convergence_evaluation_window_days',
      TunablesStore.resolveInt('core_loops.flag_convergence_evaluation_window_days', 'FLAG_CONVERGENCE_EVALUATION_WINDOW_DAYS', 30));
  },

  /** flag_low_tenure_overflag_tolerance_multiplier — leniency multiplier on the over-flag threshold for FRESH/ACCLIMATED lieutenants (canon-numbered). Default 1.3, 1.0..2.0. */
  get flagLowTenureOverflagToleranceMultiplier(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_low_tenure_overflag_tolerance_multiplier',
      TunablesStore.resolveFloat('core_loops.flag_low_tenure_overflag_tolerance_multiplier', 'FLAG_LOW_TENURE_OVERFLAG_TOLERANCE_MULTIPLIER', 1.3));
  },

  /** flag_convergence_min_sample — below this resolved-flag count, `ConvergenceBucket` = 'still_calibrating' (C5). Default 5, 3..20 [PROV-Y26Q3]. */
  get flagConvergenceMinSample(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_convergence_min_sample',
      TunablesStore.resolveInt('core_loops.flag_convergence_min_sample', 'FLAG_CONVERGENCE_MIN_SAMPLE', 5));
  },

  /** flag_convergence_over_threshold — dismissal-share boundary above which (× the leniency multiplier for low tenure) `ConvergenceBucket` = 'over_calibrated' (C5). Default 0.4, 0.2..0.8 [PROV-Y26Q3]. */
  get flagConvergenceOverThreshold(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_convergence_over_threshold',
      TunablesStore.resolveFloat('core_loops.flag_convergence_over_threshold', 'FLAG_CONVERGENCE_OVER_THRESHOLD', 0.4));
  },

  /** flag_convergence_converged_threshold — dismissal-share boundary below which `ConvergenceBucket` = 'converged' (C5). Default 0.15, 0.05..0.3 [PROV-Y26Q3]. */
  get flagConvergenceConvergedThreshold(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_convergence_converged_threshold',
      TunablesStore.resolveFloat('core_loops.flag_convergence_converged_threshold', 'FLAG_CONVERGENCE_CONVERGED_THRESHOLD', 0.15));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Deviation detection (D5 — [PROV-Y26Q3], the tenure-modulated threshold model)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** flag_deviation_threshold_base — the base threshold every generator's `deviation_score` is compared against (× the tenure-bucket multiplier below). Default 0.5, 0.1..0.9 [PROV-Y26Q3]. */
  get flagDeviationThresholdBase(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_deviation_threshold_base',
      TunablesStore.resolveFloat('core_loops.flag_deviation_threshold_base', 'FLAG_DEVIATION_THRESHOLD_BASE', 0.5));
  },

  /** flag_tenure_conservatism_fresh — FRESH bucket multiplier (flags MORE readily, <1.0 — canon "low-tenure may over-flag initially"). Default 0.8, 0.5..2.0 [PROV-Y26Q3]. */
  get flagTenureConservatismFresh(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_tenure_conservatism_fresh',
      TunablesStore.resolveFloat('core_loops.flag_tenure_conservatism_fresh', 'FLAG_TENURE_CONSERVATISM_FRESH', 0.8));
  },

  /** flag_tenure_conservatism_acclimated — ACCLIMATED bucket multiplier (neutral baseline). Default 1.0, 0.5..2.0 [PROV-Y26Q3]. */
  get flagTenureConservatismAcclimated(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_tenure_conservatism_acclimated',
      TunablesStore.resolveFloat('core_loops.flag_tenure_conservatism_acclimated', 'FLAG_TENURE_CONSERVATISM_ACCLIMATED', 1.0));
  },

  /** flag_tenure_conservatism_seasoned — SEASONED bucket multiplier. Default 1.1, 0.5..2.0 [PROV-Y26Q3]. */
  get flagTenureConservatismSeasoned(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_tenure_conservatism_seasoned',
      TunablesStore.resolveFloat('core_loops.flag_tenure_conservatism_seasoned', 'FLAG_TENURE_CONSERVATISM_SEASONED', 1.1));
  },

  /** flag_tenure_conservatism_senior — SENIOR bucket multiplier. Default 1.2, 0.5..2.0 [PROV-Y26Q3]. */
  get flagTenureConservatismSenior(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_tenure_conservatism_senior',
      TunablesStore.resolveFloat('core_loops.flag_tenure_conservatism_senior', 'FLAG_TENURE_CONSERVATISM_SENIOR', 1.2));
  },

  /** flag_tenure_conservatism_entrenched — ENTRENCHED bucket multiplier (flags LESS readily, >1.0 — canon invariant #7 "high-tenure lieutenants flag conservatively"). Default 1.3, 0.5..2.0 [PROV-Y26Q3]. */
  get flagTenureConservatismEntrenched(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_tenure_conservatism_entrenched',
      TunablesStore.resolveFloat('core_loops.flag_tenure_conservatism_entrenched', 'FLAG_TENURE_CONSERVATISM_ENTRENCHED', 1.3));
  },

  /**
   * conservatismForBucket(bucket) — the D5 seam every generator's flag-decision calls:
   * `threshold = flagDeviationThresholdBase * conservatismForBucket(bucketForStreak(...))`. ONE place
   * maps the Phase-11 `TenureInertiaBucketComposite` to its registry multiplier — C3 (generators) never
   * hardcodes a bucket→multiplier switch of its own.
   */
  conservatismForBucket(bucket: 'FRESH' | 'ACCLIMATED' | 'SEASONED' | 'SENIOR' | 'ENTRENCHED'): number {
    switch (bucket) {
      case 'FRESH':       return flagDisciplineTunables.flagTenureConservatismFresh;
      case 'ACCLIMATED':  return flagDisciplineTunables.flagTenureConservatismAcclimated;
      case 'SEASONED':    return flagDisciplineTunables.flagTenureConservatismSeasoned;
      case 'SENIOR':       return flagDisciplineTunables.flagTenureConservatismSenior;
      case 'ENTRENCHED':   return flagDisciplineTunables.flagTenureConservatismEntrenched;
    }
  },

  /** flag_exhaustion_exception_urgency_threshold — the D9 spine-fallback urgency floor (0 tokens + score ≥ this → Exception, else dropped silently). Default 0.8, 0.5..1.0 [PROV-Y26Q3]. */
  get flagExhaustionExceptionUrgencyThreshold(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_exhaustion_exception_urgency_threshold',
      TunablesStore.resolveFloat('core_loops.flag_exhaustion_exception_urgency_threshold', 'FLAG_EXHAUSTION_EXCEPTION_URGENCY_THRESHOLD', 0.8));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Routine-item bookkeeping (D4 — [PROV-Y26Q3])
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** flag_routine_items_per_generator_daily_cap — per-(player, generator, day) stable top-K cap (C3/C4). Default 10, 3..50 [PROV-Y26Q3]. */
  get flagRoutineItemsPerGeneratorDailyCap(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_routine_items_per_generator_daily_cap',
      TunablesStore.resolveInt('core_loops.flag_routine_items_per_generator_daily_cap', 'FLAG_ROUTINE_ITEMS_PER_GENERATOR_DAILY_CAP', 10));
  },

  /** flag_routine_items_retention_days — terminal `routine_items` rows are pruned past this age (C4 tick step 5; never a row referenced by a PENDING flag). Default 2, 1..30 [PROV-Y26Q3]. */
  get flagRoutineItemsRetentionDays(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_routine_items_retention_days',
      TunablesStore.resolveInt('core_loops.flag_routine_items_retention_days', 'FLAG_ROUTINE_ITEMS_RETENTION_DAYS', 2));
  },

  /** flag_stash_reorder_fill_point_grams — the STASH_REORDER generator's per-(building,substance) grams
   *  threshold (C3, the C0 §8.5(a) honest gap): `fillRatio = quantity_grams / this`, floor 0.1. Default
   *  5000 (grounded at the Tier-1 canon figure 5 kg, `product_storage.md:30`), 1000..20000 [PROV-Y26Q3]. */
  get flagStashReorderFillPointGrams(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_stash_reorder_fill_point_grams',
      TunablesStore.resolveInt('core_loops.flag_stash_reorder_fill_point_grams', 'FLAG_STASH_REORDER_FILL_POINT_GRAMS', 5000));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Client-facing band boundaries (D12 — R2.2 fraction-of-max convention, [PROV-Y26Q3])
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** flag_trust_budget_low_ratio — tokens/max below this ratio → `TrustBudgetBucket = 'low'` (C6 projection). Default 0.4, 0.1..0.6 [PROV-Y26Q3]. */
  get flagTrustBudgetLowRatio(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_trust_budget_low_ratio',
      TunablesStore.resolveFloat('core_loops.flag_trust_budget_low_ratio', 'FLAG_TRUST_BUDGET_LOW_RATIO', 0.4));
  },

  /** flag_trust_budget_high_ratio — tokens/max above this ratio → `TrustBudgetBucket = 'high'` (C6 projection). Default 0.8, 0.6..1.0 [PROV-Y26Q3]. */
  get flagTrustBudgetHighRatio(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_trust_budget_high_ratio',
      TunablesStore.resolveFloat('core_loops.flag_trust_budget_high_ratio', 'FLAG_TRUST_BUDGET_HIGH_RATIO', 0.8));
  },

  /** flag_frequency_band_frequent_min — flags-raised-over-7-game-days count at/above which `FlagFrequencyBand = 'frequent'` (below it and >0 → 'occasional'; 0 → 'none', C6 projection). Default 4, 2..10 [PROV-Y26Q3]. */
  get flagFrequencyBandFrequentMin(): number {
    return clampFlagDisciplineTunableToRange('core_loops.flag_frequency_band_frequent_min',
      TunablesStore.resolveInt('core_loops.flag_frequency_band_frequent_min', 'FLAG_FREQUENCY_BAND_FREQUENT_MIN', 4));
  },
};

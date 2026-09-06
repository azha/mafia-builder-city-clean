// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C2 (tunables)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md :237-256
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Lawyer (C2 04d-A 2026-06-30)
//             Decision #7 (ratified): Cost-ladder unification — Tier-1 GRATUIT, ladder in registry.
//             — 04d-A C2 — 2026-06-30
//
// `lawyer.tunables.ts` — Registry-mirrored getters for all `lawyer.*` tunable keys.
//
// R2.3 (NO inline numeric value for any lawyer.* key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults
// cited here are verbatim from gdd/14 §Lawyer / Internal Affairs — the single source of truth.
// If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter.
// The 3 existing keys (tier1_auto_assign_window_hours, tier3_payoff_drop_charge_cost_cents,
// tier3_payoff_drop_charge_success_probability_bucket) are REUSED at verbatim gdd/14 defaults.
// The 18 NEW keys (17 canon :237-256 + 1 [PROV-Y26Q2] burn_elevated_threshold) are added
// gdd/14-first in this same commit (R2.3 same-commit rule).
//
// Cost-ladder (decision #7 ratified 2026-06-30):
//   Tier-1: GRATUIT ($0) — no cost key; no debit at LAWYER_UP (C4 removes the debit).
//   Tier-2: per-case from tier2_per_case_cost_cents_min .. _max + retainer monthly cost.
//   Tier-3: tier3_corruption_lawyer_base_cost_cents (base $40k).
//   `distribution.caught_lawyer_up_cost_cents` (25000) is RETIRED from the caught-courier path
//   (C4 removes the call; see @deprecated on distributionDetectionTunables.lawyerUpCostCents).
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
//
// Pattern: mirrors services/game-back/src/operational/conflict/rival/rival-ai.tunables.ts exactly.

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';

// ── Range constants for numeric keys (used by LAWYER_TUNABLE_CAPS) ──────────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by LAWYER_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `LAWYER_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-clamp` route and by C3+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 *
 * NOTE: composite keys have no numeric range (they are named buckets, not raw floats).
 *       Only numeric scalar keys appear here.
 */
export const LAWYER_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── REUSE keys (gdd/14 ch16 backport) ───────────────────────────────────────────────────────────
  'lawyer.tier1_auto_assign_window_hours':           { min: 1,       max: 48         },
  'lawyer.tier3_payoff_drop_charge_cost_cents':      { min: 500000,  max: 10000000   },

  // ── NEW scalar keys (04d-A C2 2026-06-30, gdd/14 §Lawyer) ──────────────────────────────────────
  'lawyer.tier1_info_leak_rate':                     { min: 0.02,    max: 0.12       },
  'lawyer.tier2_info_leak_reduction':                { min: 0.20,    max: 0.60       },
  'lawyer.tier3_info_leak_reduction':                { min: 0.50,    max: 0.95       },
  'lawyer.tier2_case_duration_multiplier':           { min: 1.10,    max: 1.60       },
  'lawyer.tier3_burn_risk_per_use':                  { min: 0.05,    max: 0.25       },
  'lawyer.tier3_burn_threshold':                     { min: 0.50,    max: 0.90       },
  'lawyer.tier3_burn_elevated_threshold':            { min: 0.30,    max: 0.70       },
  'lawyer.plea_down_probability_tier2':              { min: 0.10,    max: 0.40       },
  'lawyer.dismiss_probability_tier3_low_severity':   { min: 0.30,    max: 0.80       },
  'lawyer.tier3_corruption_lawyer_base_cost_cents':  { min: 2000000, max: 10000000   },
  'lawyer.tier2_per_case_cost_cents_min':            { min: 200000,  max: 1000000    },
  'lawyer.tier2_per_case_cost_cents_max':            { min: 1000000, max: 3000000    },
  'lawyer.tier2_retainer_monthly_cost_cents':        { min: 100000,  max: 500000     },
  'lawyer.tier3_payoff_burn_risk_increment':         { min: 0.05,    max: 0.30       },

  // ── Lieutenant charge_severity cuts [PROV-Y26Q2] ───────────────────────────────────────────
  'lawyer.lt_charge_tenure_high_threshold':          { min: 100,     max: 5000       },
  'lawyer.lt_charge_tenure_low_threshold':           { min: 0,       max: 1000       },
  'lawyer.lt_charge_role_high_threshold':            { min: 5,       max: 13         },
  'lawyer.lt_charge_role_low_threshold':             { min: 1,       max: 10         },

  // ── Courier charge_severity cuts [PROV-Y26Q2] (C4 re-wire) ─────────────────────────────────
  'lawyer.courier_charge_cargo_cents_threshold':     { min: 1000,    max: 500000     },
  'lawyer.courier_charge_reputation_threshold':      { min: 1,       max: 100        },

  // ── Conviction base probabilities [PROV-Y26Q2] (C8 registry-fication carry-forward) ─────────
  'lawyer.conviction_base_probability_tier1':        { min: 0.40,    max: 0.95       },
  'lawyer.conviction_base_probability_tier2':        { min: 0.20,    max: 0.80       },
  'lawyer.conviction_base_probability_tier3':        { min: 0.05,    max: 0.60       },

  // ── LeakBandBucket cut-points [PROV-Y26Q2] (C9 LegalProjectionService) ─────────────────────
  'lawyer.leak_band_cut_silent':                     { min: 0.01,    max: 0.30       },
  'lawyer.leak_band_cut_low':                        { min: 0.20,    max: 0.80       },
  'lawyer.leak_band_cut_significant':                { min: 0.80,    max: 2.50       },
  // composite keys are excluded (named buckets, no numeric range)
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-clamp route + C3+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 */
export function clampLawyerToRange(key: string, value: number): number {
  const range = LAWYER_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `lawyer.*` tunable keys consumed by C3+ mechanics. */
export const lawyerTunables = {

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // REUSE keys — gdd/14 §Lawyer (ch16 backport, verbatim defaults)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.tier1_auto_assign_window_hours` — hours before Tier-1 is auto-assigned.
   * Canon :109 / gdd/14:4058. VERBATIM "default 6 in-game hours". Default 6, range 1..48.
   * Used by C3 createCase (window before which the player can upgrade to Tier-2/3).
   */
  get tier1AutoAssignWindowHours(): number {
    return TunablesStore.resolveInt(
      'lawyer.tier1_auto_assign_window_hours',
      'LAWYER_TIER1_AUTO_ASSIGN_WINDOW_HOURS',
      6,
    );
  },

  /**
   * `lawyer.tier3_payoff_drop_charge_cost_cents` — cost to issue a Tier-3 payoff action.
   * Canon :135 / gdd/14:4059. VERBATIM "2000000 = $20k". Default 2000000, range 500000..10000000.
   * Used by C8 LawyerService.issueTier3Payoff (drop low-severity charge via corrupt-clerk path).
   */
  get tier3PayoffDropChargeCostCents(): number {
    return TunablesStore.resolveInt(
      'lawyer.tier3_payoff_drop_charge_cost_cents',
      'LAWYER_TIER3_PAYOFF_DROP_CHARGE_COST_CENTS',
      2000000,
    );
  },

  /**
   * `lawyer.tier3_payoff_drop_charge_success_probability_bucket` — composite bucket (R2.2).
   * Canon :137 / gdd/14:4060. VERBATIM "composite STANDARD". Never a raw float (P5).
   * Used by C8 LawyerService.issueTier3Payoff (success probability from the composite).
   */
  get tier3PayoffDropChargeSuccessProbabilityBucket(): string {
    return TunablesStore.resolveString(
      'lawyer.tier3_payoff_drop_charge_success_probability_bucket',
      'LAWYER_TIER3_PAYOFF_DROP_CHARGE_SUCCESS_PROBABILITY_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Tier info-leak rates + tier effects (canon :237-240, gdd/14 §Lawyer C2 04d-A)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.tier1_info_leak_rate` — per-tick probability of leaking one knowledge item (Tier-1).
   * Canon :237. Default 0.05, range 0.02..0.12.
   * Used by C3 createCase (sets info_leak_rate for new cases), C5 reassignCase (Tier-1 restore).
   */
  get tier1InfoLeakRate(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier1_info_leak_rate',
      'LAWYER_TIER1_INFO_LEAK_RATE',
      0.05,
    );
  },

  /**
   * `lawyer.tier2_info_leak_reduction` — multiplicative leak reduction for Tier-2 vs Tier-1.
   * Canon :238. Default 0.40 (−40%). Range 0.20..0.60.
   * Tier-2 rate = tier1_info_leak_rate × (1 − tier2_info_leak_reduction).
   * Used by C5 LawyerService.reassignCase / hire (Tier-2).
   */
  get tier2InfoLeakReduction(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier2_info_leak_reduction',
      'LAWYER_TIER2_INFO_LEAK_REDUCTION',
      0.40,
    );
  },

  /**
   * `lawyer.tier3_info_leak_reduction` — multiplicative leak reduction for Tier-3 vs Tier-1.
   * Canon :239. Default 0.80 (−80%). Range 0.50..0.95.
   * Tier-3 rate = tier1_info_leak_rate × (1 − tier3_info_leak_reduction).
   * Used by C5 LawyerService.reassignCase / hire (Tier-3).
   */
  get tier3InfoLeakReduction(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier3_info_leak_reduction',
      'LAWYER_TIER3_INFO_LEAK_REDUCTION',
      0.80,
    );
  },

  /**
   * `lawyer.tier2_case_duration_multiplier` — case duration extension factor for Tier-2.
   * Canon :240. Default 1.30 (+30%). Range 1.10..1.60.
   * Tier-2 duration = base_duration × tier2_case_duration_multiplier.
   * Used by C5 LawyerService.reassignCase (mid-case reassign extends ticks_remaining).
   */
  get tier2CaseDurationMultiplier(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier2_case_duration_multiplier',
      'LAWYER_TIER2_CASE_DURATION_MULTIPLIER',
      1.30,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Tier-3 burn mechanics (canon :241-242, gdd/14 §Lawyer C2 04d-A)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.tier3_burn_risk_per_use` — burn_risk_score increment per Tier-3 case opened.
   * Canon :241. Default 0.10, range 0.05..0.25.
   * Used by C8 LawyerService.evaluateBurnRisk (NIGHTLY accumulation).
   */
  get tier3BurnRiskPerUse(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier3_burn_risk_per_use',
      'LAWYER_TIER3_BURN_RISK_PER_USE',
      0.10,
    );
  },

  /**
   * `lawyer.tier3_burn_threshold` — burn_risk_score above which the lawyer "flips".
   * Canon :242. Default 0.70, range 0.50..0.90.
   * When burn_risk_score > this threshold, evaluateBurnRisk (C8 NIGHTLY) emits LawyerBurnedEvent.
   * This is the IA-B §13 hook entry-point: B fires on discovery of a `lawyer` target.
   */
  get tier3BurnThreshold(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier3_burn_threshold',
      'LAWYER_TIER3_BURN_THRESHOLD',
      0.70,
    );
  },

  /**
   * `lawyer.tier3_burn_elevated_threshold` — lower bound for BurnRiskBucket 'elevated' band.
   * [PROV-Y26Q2] — canon-silent magnitude (gdd/14 §Lawyer C2 04d-A). Default 0.50, range 0.30..0.70.
   * BurnRiskBucket derivation (C9 LegalProjectionService):
   *   'none'     → burn_risk_score < tier3_burn_elevated_threshold
   *   'elevated' → tier3_burn_elevated_threshold ≤ score < tier3_burn_threshold
   *   'critical' → score ≥ tier3_burn_threshold (LawyerBurnedEvent imminent / fired)
   * R2.2/P5: the player sees ONLY the band (qualitative Exception) — never the raw float.
   */
  get tier3BurnElevatedThreshold(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier3_burn_elevated_threshold',
      'LAWYER_TIER3_BURN_ELEVATED_THRESHOLD',
      0.50,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Resolution probabilities (canon :243-244, gdd/14 §Lawyer C2 04d-A)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.plea_down_probability_tier2` — probability of charge reduction (plea_down) with Tier-2.
   * Canon :243. Default 0.20, range 0.10..0.40.
   * Used by C7 LegalCaseService.resolveCase (NIGHTLY seeded roll).
   */
  get pleaDownProbabilityTier2(): number {
    return TunablesStore.resolveFloat(
      'lawyer.plea_down_probability_tier2',
      'LAWYER_PLEA_DOWN_PROBABILITY_TIER2',
      0.20,
    );
  },

  /**
   * `lawyer.dismiss_probability_tier3_low_severity` — probability of dismissal for Tier-3 + low severity.
   * Canon :244. Default 0.55, range 0.30..0.80.
   * Applies ONLY to misdemeanor + felony_low charges with Tier-3 representation.
   * Used by C7 LegalCaseService.resolveCase (NIGHTLY seeded roll).
   */
  get dismissProbabilityTier3LowSeverity(): number {
    return TunablesStore.resolveFloat(
      'lawyer.dismiss_probability_tier3_low_severity',
      'LAWYER_DISMISS_PROBABILITY_TIER3_LOW_SEVERITY',
      0.55,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Cost ladder (Tier-2 + Tier-3, canon :245,247-249, gdd/14 §Lawyer C2 04d-A)
  //
  // Decision #7 ratified 2026-06-30: unified cost ladder.
  //   Tier-1: GRATUIT ($0) — NO cost key; no debit at LAWYER_UP (C4 removes the 25000 debit).
  //   Tier-2: per-case fee in [tier2_per_case_cost_cents_min .. tier2_per_case_cost_cents_max]
  //           OR monthly retainer `tier2_retainer_monthly_cost_cents`.
  //   Tier-3: base fee `tier3_corruption_lawyer_base_cost_cents`.
  //   `distribution.caught_lawyer_up_cost_cents` (25000) is DEPRECATED (see @deprecated getter).
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.tier3_corruption_lawyer_base_cost_cents` — base case fee for a Tier-3 lawyer ($40k).
   * Canon :245. Default 4000000, range 2000000..10000000.
   * Used by C5 LawyerService.hire (Tier-3 case fee debit on hire).
   * 04e-A1 C5: GLOBAL lever, body-wrapped — no signature change, zero call-site churn; empty overlay →
   * base byte-identical (design §2.2).
   */
  get tier3CorruptionLawyerBaseCostCents(): number {
    const base = TunablesStore.resolveInt(
      'lawyer.tier3_corruption_lawyer_base_cost_cents',
      'LAWYER_TIER3_CORRUPTION_LAWYER_BASE_COST_CENTS',
      4000000,
    );
    return EffectOverlayStore.applyModifiers('lawyer.tier3_corruption_lawyer_base_cost_cents', base);
  },

  /**
   * `lawyer.tier2_per_case_cost_cents_min` — minimum per-case fee for Tier-2 ($5k).
   * Canon :247. Default 500000, range 200000..1000000.
   * Used by C5 LawyerService.hire (Tier-2 fee: draw from [min, max] per-case).
   */
  get tier2PerCaseCostCentsMin(): number {
    return TunablesStore.resolveInt(
      'lawyer.tier2_per_case_cost_cents_min',
      'LAWYER_TIER2_PER_CASE_COST_CENTS_MIN',
      500000,
    );
  },

  /**
   * `lawyer.tier2_per_case_cost_cents_max` — maximum per-case fee for Tier-2 ($15k).
   * Canon :248. Default 1500000, range 1000000..3000000.
   * Used by C5 LawyerService.hire (Tier-2 fee: draw from [min, max] per-case).
   */
  get tier2PerCaseCostCentsMax(): number {
    return TunablesStore.resolveInt(
      'lawyer.tier2_per_case_cost_cents_max',
      'LAWYER_TIER2_PER_CASE_COST_CENTS_MAX',
      1500000,
    );
  },

  /**
   * `lawyer.tier2_retainer_monthly_cost_cents` — monthly retainer fee for Tier-2 ($2k/month).
   * Canon :249. Default 200000, range 100000..500000.
   * Used by C5 LawyerService.setRetainer (monthly debit when retainer_active=true).
   */
  get tier2RetainerMonthlyCostCents(): number {
    return TunablesStore.resolveInt(
      'lawyer.tier2_retainer_monthly_cost_cents',
      'LAWYER_TIER2_RETAINER_MONTHLY_COST_CENTS',
      200000,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Tier-3 payoff burn increment (canon :252, gdd/14 §Lawyer C2 04d-A)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.tier3_payoff_burn_risk_increment` — burn_risk += this value per payoff issued.
   * Canon :252. Default 0.15, range 0.05..0.30.
   * Used by C8 LawyerService.issueTier3Payoff (burn_risk_score accumulation after each payoff).
   */
  get tier3PayoffBurnRiskIncrement(): number {
    return TunablesStore.resolveFloat(
      'lawyer.tier3_payoff_burn_risk_increment',
      'LAWYER_TIER3_PAYOFF_BURN_RISK_INCREMENT',
      0.15,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Case duration composites (canon :253-256, gdd/14 §Lawyer C2 04d-A) [PROV-Y26Q2]
  //
  // R2.2: these are COMPOSITE buckets (named references, never raw tick counts).
  // The actual numeric tick resolution happens via the composite resolver (not inlined here).
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.case_duration_misdemeanor_ticks` — case duration bucket for misdemeanor charges.
   * Canon :253. Default `composite:duration_short`. [PROV-Y26Q2] — never a raw int.
   * Used by C3 LegalCaseService.createCase (sets case_duration_ticks from the composite resolver).
   */
  get caseDurationMisdemeanorTicks(): string {
    return TunablesStore.resolveString(
      'lawyer.case_duration_misdemeanor_ticks',
      'LAWYER_CASE_DURATION_MISDEMEANOR_TICKS',
      'composite:duration_short',
    );
  },

  /**
   * `lawyer.case_duration_felony_low_ticks` — case duration bucket for felony_low charges.
   * Canon :254. Default `composite:duration_medium`. [PROV-Y26Q2] — never a raw int.
   * Used by C3 LegalCaseService.createCase (sets case_duration_ticks from the composite resolver).
   */
  get caseDurationFelonyLowTicks(): string {
    return TunablesStore.resolveString(
      'lawyer.case_duration_felony_low_ticks',
      'LAWYER_CASE_DURATION_FELONY_LOW_TICKS',
      'composite:duration_medium',
    );
  },

  /**
   * `lawyer.case_duration_felony_high_ticks` — case duration bucket for felony_high charges.
   * Canon :255. Default `composite:duration_long`. [PROV-Y26Q2] — never a raw int.
   * Used by C3 LegalCaseService.createCase (sets case_duration_ticks from the composite resolver).
   */
  get caseDurationFelonyHighTicks(): string {
    return TunablesStore.resolveString(
      'lawyer.case_duration_felony_high_ticks',
      'LAWYER_CASE_DURATION_FELONY_HIGH_TICKS',
      'composite:duration_long',
    );
  },

  /**
   * `lawyer.case_duration_major_crime_ticks` — case duration bucket for major_crime charges.
   * Canon :256. Default `composite:duration_very_long`. [PROV-Y26Q2] — never a raw int.
   * Used by C3 LegalCaseService.createCase (sets case_duration_ticks from the composite resolver).
   */
  get caseDurationMajorCrimeTicks(): string {
    return TunablesStore.resolveString(
      'lawyer.case_duration_major_crime_ticks',
      'LAWYER_CASE_DURATION_MAJOR_CRIME_TICKS',
      'composite:duration_very_long',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Lieutenant charge_severity derivation cuts (C3 createCase, [PROV-Y26Q2])
  //
  // These 4 keys define the tenure×role cut thresholds used by LegalCaseService.createCase
  // when the defendant_type is 'lieutenant' (BuildingRaidedEvent / tail_subpoena MIS path).
  //
  // Derivation (pure function, no RNG):
  //   role_id >= lt_charge_role_high OR tenure_score >= lt_charge_tenure_high → 'major_crime'
  //   role_id <  lt_charge_role_low  AND tenure_score <  lt_charge_tenure_low → 'felony_low'
  //   else                                                                     → 'felony_high'
  //
  // All 4 are [PROV-Y26Q2] — canon gives "tenure×role" as the input pair; the cut magnitudes
  // are not canon-chiffré and are proposed here for reviewer ⊥ ratification.
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.lt_charge_tenure_high_threshold` — tenure_score at or above which charge escalates to
   * `major_crime` (combined with role gate). [PROV-Y26Q2]. Default 1000, range 100..5000.
   * Used by C3 LegalCaseService.createCase (lieutenant charge_severity derivation).
   */
  get ltChargeTenureHighThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.lt_charge_tenure_high_threshold',
      'LAWYER_LT_CHARGE_TENURE_HIGH_THRESHOLD',
      1000,
    );
  },

  /**
   * `lawyer.lt_charge_tenure_low_threshold` — tenure_score below which charge may be reduced to
   * `felony_low` (requires role also below low threshold). [PROV-Y26Q2]. Default 300, range 0..1000.
   * Used by C3 LegalCaseService.createCase (lieutenant charge_severity derivation).
   */
  get ltChargeTenureLowThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.lt_charge_tenure_low_threshold',
      'LAWYER_LT_CHARGE_TENURE_LOW_THRESHOLD',
      300,
    );
  },

  /**
   * `lawyer.lt_charge_role_high_threshold` — role_id at or above which charge escalates to
   * `major_crime` (combined with tenure gate). [PROV-Y26Q2]. Default 10, range 5..13.
   * Used by C3 LegalCaseService.createCase (lieutenant charge_severity derivation).
   */
  get ltChargeRoleHighThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.lt_charge_role_high_threshold',
      'LAWYER_LT_CHARGE_ROLE_HIGH_THRESHOLD',
      10,
    );
  },

  /**
   * `lawyer.lt_charge_role_low_threshold` — role_id below which charge may be reduced to
   * `felony_low` (requires tenure also below low threshold). [PROV-Y26Q2]. Default 5, range 1..10.
   * Used by C3 LegalCaseService.createCase (lieutenant charge_severity derivation).
   */
  get ltChargeRoleLowThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.lt_charge_role_low_threshold',
      'LAWYER_LT_CHARGE_ROLE_LOW_THRESHOLD',
      5,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Courier charge_severity derivation cuts (C4 re-wire, [PROV-Y26Q2])
  //
  // Used by LegalCaseService.deriveChargeSeverityForCourier (called from the LAWYER_UP re-wire
  // in CourierDetectionService.resolveCaughtException — the re-wire stamp, RATIFIÉ 2026-06-30 #3).
  //
  // Derivation (pure function, no RNG):
  //   reputation_at_catch >= courier_charge_reputation_threshold
  //     OR cargo_cents >= courier_charge_cargo_cents_threshold
  //     → 'felony_low'
  //   else → 'misdemeanor'
  //
  // Both cuts are [PROV-Y26Q2]: canon gives "cargo + reputation_at_catch" as the inputs;
  // the magnitudes are not canon-chiffré and are proposed here for reviewer ⊥ ratification.
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.courier_charge_cargo_cents_threshold` — cargo value (in cents) at or above which
   * the courier's charge escalates to `felony_low`. Below this + below the reputation threshold →
   * `misdemeanor`. [PROV-Y26Q2]. Default 50000 ($500 in-game cargo). Range 1000..500000.
   * Used by C4 LegalCaseService.deriveChargeSeverityForCourier (LAWYER_UP re-wire).
   */
  get courierChargeCargoCentsThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.courier_charge_cargo_cents_threshold',
      'LAWYER_COURIER_CHARGE_CARGO_CENTS_THRESHOLD',
      50000,
    );
  },

  /**
   * `lawyer.courier_charge_reputation_threshold` — reputation_at_catch (sessions_active snapshot)
   * at or above which the courier's charge escalates to `felony_low`. [PROV-Y26Q2].
   * Default 10 (10 prior deliveries = experienced enough to know the network). Range 1..100.
   * Used by C4 LegalCaseService.deriveChargeSeverityForCourier (LAWYER_UP re-wire).
   */
  get courierChargeReputationThreshold(): number {
    return TunablesStore.resolveInt(
      'lawyer.courier_charge_reputation_threshold',
      'LAWYER_COURIER_CHARGE_REPUTATION_THRESHOLD',
      10,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — Conviction base probabilities (C7→C8 carry-forward, registry-fication [PROV-Y26Q2])
  //
  // Replaces the inline CONVICTED_PROB map in LegalCaseService.resolveSingleCase (C7).
  // R2.3: these structural orderings must NOT be inline scalars — they are registry getters.
  // gdd/14 §Lawyer, Note NEW C8 04d-A (2026-06-30) — 3 clés [PROV-Y26Q2].
  //
  // Ordering invariant (structural): Tier1 > Tier2 > Tier3 (better lawyer → lower conviction).
  // The reviewer ⊥ ratifies the magnitudes; the ordering is canonical from the tier model.
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.conviction_base_probability_tier1` — base conviction probability for Tier-1
   * (public_defender) after the plea/dismiss decision tree misses. Default 0.70, range 0.40..0.95.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C8 04d-A. Used by C8 LegalCaseService.resolveSingleCase.
   */
  get convictionBaseProbabilityTier1(): number {
    return TunablesStore.resolveFloat(
      'lawyer.conviction_base_probability_tier1',
      'LAWYER_CONVICTION_BASE_PROBABILITY_TIER1',
      0.70,
    );
  },

  /**
   * `lawyer.conviction_base_probability_tier2` — base conviction probability for Tier-2
   * (boutique) after plea_down miss. Default 0.50, range 0.20..0.80.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C8 04d-A. Used by C8 LegalCaseService.resolveSingleCase.
   */
  get convictionBaseProbabilityTier2(): number {
    return TunablesStore.resolveFloat(
      'lawyer.conviction_base_probability_tier2',
      'LAWYER_CONVICTION_BASE_PROBABILITY_TIER2',
      0.50,
    );
  },

  /**
   * `lawyer.conviction_base_probability_tier3` — base conviction probability for Tier-3
   * (corruption_pipeline) after dismiss miss. Default 0.30, range 0.05..0.60.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C8 04d-A. Used by C8 LegalCaseService.resolveSingleCase.
   */
  get convictionBaseProbabilityTier3(): number {
    return TunablesStore.resolveFloat(
      'lawyer.conviction_base_probability_tier3',
      'LAWYER_CONVICTION_BASE_PROBABILITY_TIER3',
      0.30,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — LeakBandBucket cut-points (C9 LegalProjectionService, [PROV-Y26Q2])
  //
  // R2.2/P5: `info_leak_total` is SERVER-ONLY. The player never sees the raw float.
  // LegalProjectionService.toLegalPanel maps info_leak_total → LeakBandBucket using these 3 cuts:
  //
  //   info_leak_total <  leakBandCutSilent                          → 'silent'
  //   leakBandCutSilent  ≤ info_leak_total < leakBandCutLow        → 'low'
  //   leakBandCutLow     ≤ info_leak_total < leakBandCutSignificant → 'significant'
  //   info_leak_total >= leakBandCutSignificant                     → 'full_dump'
  //
  // Magnitude rationale [PROV-Y26Q2] (canon-silent; ratification by reviewer ⊥ expected):
  //   info_leak_total accumulates KnowledgeItem.importance per leaked item.
  //   Courier knowledge-set max ≈ 1.2 (route_detail:0.2 + cargo_detail:0.4 + network_exposure:0.6).
  //   Lieutenant knowledge-set max ≈ 3.1 (operation_detail:0.3 + stash_location:0.5 +
  //     lieutenant_network:0.7 + financial_flows:0.6 + boss_identity:1.0).
  //   Cut-points chosen so a fully-leaked courier case reaches 'full_dump' (≥ 1.20).
  // gdd/14 §Lawyer, Note NEW C9 04d-A (2026-06-30) — 3 clés [PROV-Y26Q2].
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `lawyer.leak_band_cut_silent` — `info_leak_total` below which LeakBandBucket = 'silent'.
   * Default 0.10, range 0.01..0.30.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C9 04d-A. Used by C9 LegalProjectionService.toLegalPanel.
   * R2.2/P5: the player sees only the band name, never the raw float.
   */
  get leakBandCutSilent(): number {
    return TunablesStore.resolveFloat(
      'lawyer.leak_band_cut_silent',
      'LAWYER_LEAK_BAND_CUT_SILENT',
      0.10,
    );
  },

  /**
   * `lawyer.leak_band_cut_low` — `info_leak_total` above silent-cut and below this → 'low'.
   * Default 0.50, range 0.20..0.80.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C9 04d-A. Used by C9 LegalProjectionService.toLegalPanel.
   */
  get leakBandCutLow(): number {
    return TunablesStore.resolveFloat(
      'lawyer.leak_band_cut_low',
      'LAWYER_LEAK_BAND_CUT_LOW',
      0.50,
    );
  },

  /**
   * `lawyer.leak_band_cut_significant` — `info_leak_total` at or above this → 'full_dump'.
   * Default 1.20, range 0.80..2.50.
   * [PROV-Y26Q2] — gdd/14 §Lawyer C9 04d-A. Used by C9 LegalProjectionService.toLegalPanel.
   * At default 1.20 a fully-leaked courier case (max ≈ 1.2) enters 'full_dump'.
   */
  get leakBandCutSignificant(): number {
    return TunablesStore.resolveFloat(
      'lawyer.leak_band_cut_significant',
      'LAWYER_LEAK_BAND_CUT_SIGNIFICANT',
      1.20,
    );
  },

};

// ── NestJS Injectable wrapper (same pattern as RivalAiTunables in rival-ai.tunables.ts) ─────────

/** Named alias used in NestJS DI (C2). Wraps `lawyerTunables` so services can inject it. */
export class LawyerTunables {
  // Expose all getters as instance methods so NestJS can inject the class.
  // The underlying implementation delegates to the module-level object above.

  // ── REUSE ────────────────────────────────────────────────────────────────────────────────────
  get tier1AutoAssignWindowHours()                    { return lawyerTunables.tier1AutoAssignWindowHours; }
  get tier3PayoffDropChargeCostCents()                { return lawyerTunables.tier3PayoffDropChargeCostCents; }
  get tier3PayoffDropChargeSuccessProbabilityBucket() { return lawyerTunables.tier3PayoffDropChargeSuccessProbabilityBucket; }

  // ── Tier leak rates ───────────────────────────────────────────────────────────────────────────
  get tier1InfoLeakRate()                             { return lawyerTunables.tier1InfoLeakRate; }
  get tier2InfoLeakReduction()                        { return lawyerTunables.tier2InfoLeakReduction; }
  get tier3InfoLeakReduction()                        { return lawyerTunables.tier3InfoLeakReduction; }
  get tier2CaseDurationMultiplier()                   { return lawyerTunables.tier2CaseDurationMultiplier; }

  // ── Burn risk ─────────────────────────────────────────────────────────────────────────────────
  get tier3BurnRiskPerUse()                           { return lawyerTunables.tier3BurnRiskPerUse; }
  get tier3BurnThreshold()                            { return lawyerTunables.tier3BurnThreshold; }
  get tier3BurnElevatedThreshold()                    { return lawyerTunables.tier3BurnElevatedThreshold; }

  // ── Resolution probabilities ──────────────────────────────────────────────────────────────────
  get pleaDownProbabilityTier2()                      { return lawyerTunables.pleaDownProbabilityTier2; }
  get dismissProbabilityTier3LowSeverity()            { return lawyerTunables.dismissProbabilityTier3LowSeverity; }

  // ── Cost ladder (Tier-2/3; Tier-1 = GRATUIT = no key) ───────────────────────────────────────
  get tier3CorruptionLawyerBaseCostCents()            { return lawyerTunables.tier3CorruptionLawyerBaseCostCents; }
  get tier2PerCaseCostCentsMin()                      { return lawyerTunables.tier2PerCaseCostCentsMin; }
  get tier2PerCaseCostCentsMax()                      { return lawyerTunables.tier2PerCaseCostCentsMax; }
  get tier2RetainerMonthlyCostCents()                 { return lawyerTunables.tier2RetainerMonthlyCostCents; }

  // ── Tier-3 payoff burn increment ──────────────────────────────────────────────────────────────
  get tier3PayoffBurnRiskIncrement()                  { return lawyerTunables.tier3PayoffBurnRiskIncrement; }

  // ── Case duration composites [PROV-Y26Q2] ────────────────────────────────────────────────────
  get caseDurationMisdemeanorTicks()                  { return lawyerTunables.caseDurationMisdemeanorTicks; }
  get caseDurationFelonyLowTicks()                    { return lawyerTunables.caseDurationFelonyLowTicks; }
  get caseDurationFelonyHighTicks()                   { return lawyerTunables.caseDurationFelonyHighTicks; }
  get caseDurationMajorCrimeTicks()                   { return lawyerTunables.caseDurationMajorCrimeTicks; }

  // ── Lieutenant charge_severity cuts [PROV-Y26Q2] ─────────────────────────────────────────────
  get ltChargeTenureHighThreshold()                   { return lawyerTunables.ltChargeTenureHighThreshold; }
  get ltChargeTenureLowThreshold()                    { return lawyerTunables.ltChargeTenureLowThreshold; }
  get ltChargeRoleHighThreshold()                     { return lawyerTunables.ltChargeRoleHighThreshold; }
  get ltChargeRoleLowThreshold()                      { return lawyerTunables.ltChargeRoleLowThreshold; }

  // ── Courier charge_severity cuts [PROV-Y26Q2] (C4 re-wire) ──────────────────────────────────
  get courierChargeCargoCentsThreshold()              { return lawyerTunables.courierChargeCargoCentsThreshold; }
  get courierChargeReputationThreshold()              { return lawyerTunables.courierChargeReputationThreshold; }

  // ── Conviction base probabilities [PROV-Y26Q2] (C8 carry-forward registry-fication) ─────────
  get convictionBaseProbabilityTier1()               { return lawyerTunables.convictionBaseProbabilityTier1; }
  get convictionBaseProbabilityTier2()               { return lawyerTunables.convictionBaseProbabilityTier2; }
  get convictionBaseProbabilityTier3()               { return lawyerTunables.convictionBaseProbabilityTier3; }

  // ── LeakBandBucket cut-points [PROV-Y26Q2] (C9 LegalProjectionService) ─────────────────────
  get leakBandCutSilent()                            { return lawyerTunables.leakBandCutSilent; }
  get leakBandCutLow()                               { return lawyerTunables.leakBandCutLow; }
  get leakBandCutSignificant()                       { return lawyerTunables.leakBandCutSignificant; }
}

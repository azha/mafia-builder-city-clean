// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C1 (R2.3 — ~35 NEW `maintenance.*`
//             keys registered gdd/14-first + getters)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §11 (Tunables) + §3
//             (data model — the D1 anchor these getters DERIVE the phase/curve/roll formulas against, C2+)
//             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.10 (D10 —
//             schedule_cost_pct_of_setup) / §1.7 (D7 — failure_repair_heat_magnitude_band) / §6 sub-decision
//             #6 (window_days NOT created — REUSE conversion.initial_maintenance_interval_days)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Maintenance (04f) (36 keys
//             backported SAME commit, R2.3 registry-FIRST)
//             Canon: docs/tech/04f_maintenance_decay_recruitment/building_maintenance_decay.md §Tunables
//             référencés (34 canon rows; this file registers 33 of them verbatim — `window_days` is the ONE
//             canon row deliberately NOT re-created here, sub-decision #6 — PLUS 3 NEW [PROV-Y26Q2] additions
//             the canon registry omitted: schedule_cost_pct_of_setup / failure_repair_heat_magnitude_band /
//             perf_budget.04f_max_kb_per_player = 33 + 3 = 36 total getters below).
//             Pattern: mirrors services/game-back/src/operational/liveops/live-ops.tunables.ts (CAPS map +
//             clamp function + frozen getter object; the "register ALL keys at the registry-first chunk even
//             though most are unconsumed until later chunks" precedent — C1 is a pure data-model + tunables
//             chunk, the phase engine / rolls / pricing / heat / pin consumers land C2-C8).
//             — 04f-A C1 — 2026-07-10
//
// `maintenance-tunables.ts` — registry-mirrored getters for the 36 `maintenance.*` / `perf_budget.04f_*` keys
// the 04f-A lot needs (R2.3: NO inline numeric balance/config anywhere downstream — every default below is
// verbatim from gdd/14 §Maintenance (04f), which is itself verbatim from the tech doc's own registry table,
// modulo the 3 honest additions and the 1 deliberate omission). If a registry value ever changes, update
// gdd/14 + this file in the SAME commit (R9.3).
//
// ★ `maintenance.window_days` is NOT a key here (sub-decision #6, decisions §1.10/§6 item 6): the tech doc's
// own registry proposes it, but the codebase ALREADY owns `conversion.initial_maintenance_interval_days`
// (conversion-tunables.ts, default 30, range 7..90) seeding the EXACT same semantics (the per-building
// maintenance interval, `building_operational_state.maintenance_due_in_days`) at convert-time — creating a
// second key here would be a two-sources-of-truth drift the registry itself would introduce. Any C2+ consumer
// that needs "the window" imports `conversionTunables.initialMaintenanceIntervalDays` DIRECTLY — never
// re-declares it under a `maintenance.*` name.
//
// ★ Sign convention (output_reduction_*_pct_per_week): the canon registry table records these as NEGATIVE
// (`-5`, `-15` — "a reduction of N points"), range column written in canon's own "less-negative..more-negative"
// order (`-2..-10` / `-10..-25`) rather than ascending min..max. This file's CAPS entries use the
// mathematically-ascending {min, max} the clamp helper needs (min = the more-negative bound); the getter
// itself returns the SIGNED value verbatim (never re-signed) — the C2 consumer's own formula (D5,
// decisions §1.5) is responsible for how it folds the sign into `soft_mult`/`hard_mult`.
//
// ★ Per-tier lab baselines (14-18): the tech doc gives 5 DISTINCT registry rows (`equipment_failure_baseline_
// lab_tier{1..5}_per_week`) keyed to `building_operational_state.equipment_tier` (1..5, the `lab` type's
// per-building tier column — design §5). Exposed BOTH as 5 individual getters (registry-parity, one row = one
// getter, matching every other module's convention) AND as a single parametrized
// `equipmentFailureBaselineLabTierPerWeek(tier)` accessor (mirrors the `vehicleCapacityGramsFor('foot')` /
// `vehiclePurchaseRequiredTier('bike')` pattern already established in gdd/14 for other per-variant tunable
// families) — the C4 roll consumer calls the parametrized form, never re-implements the tier→key switch.

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `LIVE_OPS_TUNABLE_CAPS`'s shape). */
export interface MaintenanceTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `MAINTENANCE_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the gdd/14 Range
 * column (ascending min/max — see the sign-convention note above for the 2 `output_reduction_*` keys, whose
 * canon range column is written in the opposite, "less-negative..more-negative" order). Used internally by
 * every numeric getter below (defense-in-depth: the getter itself never returns an out-of-bounds value even
 * if a raw DB override was written out of range). `failure_repair_heat_magnitude_band` is a composite STRING
 * key (a band vocabulary, not a scalar) — excluded, mirrors `LIVE_OPS_TUNABLE_CAPS`'s own exclusion of
 * `aggression_score_bucket_thresholds`.
 */
export const MAINTENANCE_TUNABLE_CAPS: Record<string, MaintenanceTunableRange> = {
  // ── Phase thresholds (§4 — overdue-offset form; the registered values stay canon-absolute) ────────────
  'maintenance.lapse_soft_degradation_start_day':      { min: 21,   max: 45   },
  'maintenance.lapse_hard_degradation_start_day':      { min: 31,   max: 60   },
  'maintenance.lapse_critical_start_day':              { min: 60,   max: 120  },
  'maintenance.repair_cost_curve_exponent':            { min: 1.0,  max: 2.5  },
  // ── Output penalty (D5 — multiplicative weekly compounding) ─────────────────────────────────────────
  'maintenance.output_reduction_soft_pct_per_week':    { min: -10,  max: -2   },
  'maintenance.output_reduction_hard_pct_per_week':    { min: -25,  max: -10  },
  'maintenance.output_ceiling_critical_pct':           { min: 20,   max: 50   },
  // ── Heat couple (D7) ─────────────────────────────────────────────────────────────────────────────────
  'maintenance.heat_additive_soft_per_week':           { min: 0.01, max: 0.05 },
  'maintenance.heat_additive_hard_per_week':            { min: 0.03, max: 0.10 },
  // ── Audit-Pin couple (D6) ────────────────────────────────────────────────────────────────────────────
  'maintenance.audit_pin_probability_hard_pct':        { min: 5,    max: 25   },
  // ── Equipment-failure multipliers + critical daily prob (D11) ───────────────────────────────────────
  'maintenance.equipment_failure_multiplier_soft':     { min: 1.2,  max: 2.0  },
  'maintenance.equipment_failure_multiplier_hard':     { min: 2.0,  max: 5.0  },
  'maintenance.equipment_failure_critical_daily_prob': { min: 0.04, max: 0.15 },
  // ── Equipment-failure per-type/per-tier baselines (§5 — 13 keys, 9 real types + 5 lab tiers − none dup) ─
  'maintenance.equipment_failure_baseline_lab_tier1_per_week':          { min: 0.02,   max: 0.12  },
  'maintenance.equipment_failure_baseline_lab_tier2_per_week':          { min: 0.02,   max: 0.08  },
  'maintenance.equipment_failure_baseline_lab_tier3_per_week':          { min: 0.02,   max: 0.07  },
  'maintenance.equipment_failure_baseline_lab_tier4_per_week':          { min: 0.015,  max: 0.06  },
  'maintenance.equipment_failure_baseline_lab_tier5_per_week':          { min: 0.01,   max: 0.06  },
  'maintenance.equipment_failure_baseline_front_shop_per_week':        { min: 0.005,  max: 0.05  },
  'maintenance.equipment_failure_baseline_cash_safehouse_per_week':    { min: 0.005,  max: 0.03  },
  'maintenance.equipment_failure_baseline_stash_per_week':             { min: 0.005,  max: 0.04  },
  'maintenance.equipment_failure_baseline_refinery_per_week':          { min: 0.015,  max: 0.08  },
  'maintenance.equipment_failure_baseline_press_house_per_week':       { min: 0.015,  max: 0.07  },
  'maintenance.equipment_failure_baseline_distribution_hub_per_week':  { min: 0.01,   max: 0.06  },
  'maintenance.equipment_failure_baseline_office_per_week':            { min: 0.001,  max: 0.02  },
  'maintenance.equipment_failure_baseline_money_holding_per_week':     { min: 0.0005, max: 0.005 },
  // ── Facility manager auto-schedule (D9) ─────────────────────────────────────────────────────────────
  'maintenance.auto_schedule_window_before_due_days':  { min: 3,    max: 14   },
  // ── Repair cost/time (§6 atomic-5) ───────────────────────────────────────────────────────────────────
  'maintenance.repair_cost_pct_of_setup_min':          { min: 10,   max: 30   },
  'maintenance.repair_cost_pct_of_setup_max':          { min: 25,   max: 70   },
  'maintenance.repair_time_days_min':                  { min: 1,    max: 7    },
  'maintenance.repair_time_days_max':                  { min: 5,    max: 14   },
  'maintenance.repair_slow_cost_multiplier':            { min: 0.4,  max: 0.8  },
  // ── Pricing (D10) ─────────────────────────────────────────────────────────────────────────────────────
  'maintenance.emergency_maintenance_cost_multiplier': { min: 1.2,  max: 2.0  },
  'maintenance.schedule_cost_pct_of_setup':            { min: 2,    max: 10   }, // [PROV-Y26Q2] — D10, the omitted base-cost key.
  // ── F4 perf budget ────────────────────────────────────────────────────────────────────────────────────
  'perf_budget.04f_max_kb_per_player':                 { min: 1,    max: 5    }, // [PROV-Y26Q2] — memory_budget_maintenance.md.
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors `clampLiveOpsTunableToRange`). Used
 * internally by every numeric getter below. Returns the value unchanged if no range is registered for the key.
 */
export function clampMaintenanceTunableToRange(key: string, value: number): number {
  const range = MAINTENANCE_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** The 5 `equipment_tier` values a `lab` building can carry (§5 — "Lab Tier N" per-tier baselines). */
export type LabEquipmentTier = 1 | 2 | 3 | 4 | 5;

/** Registry-mirrored getters for all 36 `maintenance.*` / `perf_budget.04f_*` keys (C1). */
export const maintenanceTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Phase thresholds (§4 — canon-absolute; the engine compares days-overdue in offset form, C2)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** lapse_soft_degradation_start_day — absolute day soft degradation begins. Default 31, 21..45. */
  get lapseSoftDegradationStartDay(): number {
    return clampMaintenanceTunableToRange('maintenance.lapse_soft_degradation_start_day',
      TunablesStore.resolveInt('maintenance.lapse_soft_degradation_start_day', 'MAINTENANCE_LAPSE_SOFT_DEGRADATION_START_DAY', 31));
  },
  /** lapse_hard_degradation_start_day — absolute day hard degradation begins. Default 46, 31..60. */
  get lapseHardDegradationStartDay(): number {
    return clampMaintenanceTunableToRange('maintenance.lapse_hard_degradation_start_day',
      TunablesStore.resolveInt('maintenance.lapse_hard_degradation_start_day', 'MAINTENANCE_LAPSE_HARD_DEGRADATION_START_DAY', 46));
  },
  /** lapse_critical_start_day — absolute day critical state begins. Default 91, 60..120. */
  get lapseCriticalStartDay(): number {
    return clampMaintenanceTunableToRange('maintenance.lapse_critical_start_day',
      TunablesStore.resolveInt('maintenance.lapse_critical_start_day', 'MAINTENANCE_LAPSE_CRITICAL_START_DAY', 91));
  },
  /** repair_cost_curve_exponent — the SAME exponent both the repair-cost curve (D10) and the equipment-failure overdue_factor (§5) use. Default 1.5, 1.0..2.5. */
  get repairCostCurveExponent(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_cost_curve_exponent',
      TunablesStore.resolveFloat('maintenance.repair_cost_curve_exponent', 'MAINTENANCE_REPAIR_COST_CURVE_EXPONENT', 1.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Output penalty (D5 — multiplicative weekly compounding, critical fixed ceiling)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** output_reduction_soft_pct_per_week — SIGNED (negative = reduction), verbatim canon. Default -5, range [-10..-2]. */
  get outputReductionSoftPctPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.output_reduction_soft_pct_per_week',
      TunablesStore.resolveInt('maintenance.output_reduction_soft_pct_per_week', 'MAINTENANCE_OUTPUT_REDUCTION_SOFT_PCT_PER_WEEK', -5));
  },
  /** output_reduction_hard_pct_per_week — SIGNED (negative = reduction), verbatim canon. Default -15, range [-25..-10]. */
  get outputReductionHardPctPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.output_reduction_hard_pct_per_week',
      TunablesStore.resolveInt('maintenance.output_reduction_hard_pct_per_week', 'MAINTENANCE_OUTPUT_REDUCTION_HARD_PCT_PER_WEEK', -15));
  },
  /** output_ceiling_critical_pct — the FIXED critical-phase output ceiling (D5, "drops to 30% output ceiling"). Default 30, 20..50. */
  get outputCeilingCriticalPct(): number {
    return clampMaintenanceTunableToRange('maintenance.output_ceiling_critical_pct',
      TunablesStore.resolveInt('maintenance.output_ceiling_critical_pct', 'MAINTENANCE_OUTPUT_CEILING_CRITICAL_PCT', 30));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Heat couple (D7 — MAINTENANCE_NEGLECT weekly additive)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** heat_additive_soft_per_week — buildings.heat weekly additive while SOFT-lapsed. Default 0.02, 0.01..0.05. */
  get heatAdditiveSoftPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.heat_additive_soft_per_week',
      TunablesStore.resolveFloat('maintenance.heat_additive_soft_per_week', 'MAINTENANCE_HEAT_ADDITIVE_SOFT_PER_WEEK', 0.02));
  },
  /** heat_additive_hard_per_week — buildings.heat weekly additive while HARD/CRITICAL-lapsed. Default 0.05, 0.03..0.10. */
  get heatAdditiveHardPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.heat_additive_hard_per_week',
      TunablesStore.resolveFloat('maintenance.heat_additive_hard_per_week', 'MAINTENANCE_HEAT_ADDITIVE_HARD_PER_WEEK', 0.05));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Audit-Pin couple (D6 — per-building emergence-rate shift for HARD/CRITICAL buildings)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** audit_pin_probability_hard_pct — the E-POL-09-style rate-shift magnitude (×(1+pct/100)). Default 12, 5..25. */
  get auditPinProbabilityHardPct(): number {
    return clampMaintenanceTunableToRange('maintenance.audit_pin_probability_hard_pct',
      TunablesStore.resolveInt('maintenance.audit_pin_probability_hard_pct', 'MAINTENANCE_AUDIT_PIN_PROBABILITY_HARD_PCT', 12));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Equipment-failure multipliers + critical daily prob (D11 — seeded, no Math.random)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** equipment_failure_multiplier_soft — phase_mult while SOFT. Default 1.5, 1.2..2.0. [PROV-Y26Q2] (canon "rises" interpolation). */
  get equipmentFailureMultiplierSoft(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_multiplier_soft',
      TunablesStore.resolveFloat('maintenance.equipment_failure_multiplier_soft', 'MAINTENANCE_EQUIPMENT_FAILURE_MULTIPLIER_SOFT', 1.5));
  },
  /** equipment_failure_multiplier_hard — phase_mult while HARD (canon "3× more likely"). Default 3.0, 2.0..5.0. */
  get equipmentFailureMultiplierHard(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_multiplier_hard',
      TunablesStore.resolveFloat('maintenance.equipment_failure_multiplier_hard', 'MAINTENANCE_EQUIPMENT_FAILURE_MULTIPLIER_HARD', 3.0));
  },
  /** equipment_failure_critical_daily_prob — FLAT daily prob replacing the weekly roll while CRITICAL (D11 — GDD wins over the tech doc's "×8" note). Default 0.08, 0.04..0.15. */
  get equipmentFailureCriticalDailyProb(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_critical_daily_prob',
      TunablesStore.resolveFloat('maintenance.equipment_failure_critical_daily_prob', 'MAINTENANCE_EQUIPMENT_FAILURE_CRITICAL_DAILY_PROB', 0.08));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Equipment-failure baselines — per-type (9 real types; grow_house/dealer_spot_front/specialized_lab
  // EXCLUDED at launch, sub-decision #2, C4 skip-list) + per-lab-tier (5 keys, §5)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get equipmentFailureBaselineLabTier1PerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_lab_tier1_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_lab_tier1_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_LAB_TIER1_PER_WEEK', 0.05));
  },
  /** [PROV-Y26Q2] — GDD §1.2 only names Tier1+Tier5 explicitly; Tier2 interpolated (linear log-scale). */
  get equipmentFailureBaselineLabTier2PerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_lab_tier2_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_lab_tier2_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_LAB_TIER2_PER_WEEK', 0.04));
  },
  /** [PROV-Y26Q2] — interpolated (see Tier2 note). */
  get equipmentFailureBaselineLabTier3PerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_lab_tier3_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_lab_tier3_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_LAB_TIER3_PER_WEEK', 0.035));
  },
  /** [PROV-Y26Q2] — interpolated (see Tier2 note). */
  get equipmentFailureBaselineLabTier4PerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_lab_tier4_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_lab_tier4_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_LAB_TIER4_PER_WEEK', 0.03));
  },
  get equipmentFailureBaselineLabTier5PerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_lab_tier5_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_lab_tier5_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_LAB_TIER5_PER_WEEK', 0.025));
  },
  /**
   * `equipmentFailureBaselineLabTierPerWeek(tier)` — the parametrized accessor a `lab` building's roll site
   * (C4) calls, resolving to the ONE per-tier getter above for the building's `equipment_tier` (1..5). Never
   * re-implements a tier→value switch elsewhere (mirrors `vehicleCapacityGramsFor('foot')`, gdd/14).
   */
  equipmentFailureBaselineLabTierPerWeek(tier: LabEquipmentTier): number {
    switch (tier) {
      case 1: return this.equipmentFailureBaselineLabTier1PerWeek;
      case 2: return this.equipmentFailureBaselineLabTier2PerWeek;
      case 3: return this.equipmentFailureBaselineLabTier3PerWeek;
      case 4: return this.equipmentFailureBaselineLabTier4PerWeek;
      case 5: return this.equipmentFailureBaselineLabTier5PerWeek;
    }
  },

  get equipmentFailureBaselineFrontShopPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_front_shop_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_front_shop_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_FRONT_SHOP_PER_WEEK', 0.02));
  },
  get equipmentFailureBaselineCashSafehousePerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_cash_safehouse_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_cash_safehouse_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_CASH_SAFEHOUSE_PER_WEEK', 0.01));
  },
  get equipmentFailureBaselineStashPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_stash_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_stash_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_STASH_PER_WEEK', 0.015));
  },
  get equipmentFailureBaselineRefineryPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_refinery_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_refinery_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_REFINERY_PER_WEEK', 0.035));
  },
  get equipmentFailureBaselinePressHousePerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_press_house_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_press_house_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_PRESS_HOUSE_PER_WEEK', 0.03));
  },
  get equipmentFailureBaselineDistributionHubPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_distribution_hub_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_distribution_hub_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_DISTRIBUTION_HUB_PER_WEEK', 0.025));
  },
  /** office has a canon baseline but NO M1 acquisition path (real-estate.service.ts M1_TYPES — office absent) — honest-inert until an office acquisition path exists. */
  get equipmentFailureBaselineOfficePerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_office_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_office_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_OFFICE_PER_WEEK', 0.005));
  },
  get equipmentFailureBaselineMoneyHoldingPerWeek(): number {
    return clampMaintenanceTunableToRange('maintenance.equipment_failure_baseline_money_holding_per_week',
      TunablesStore.resolveFloat('maintenance.equipment_failure_baseline_money_holding_per_week', 'MAINTENANCE_EQUIPMENT_FAILURE_BASELINE_MONEY_HOLDING_PER_WEEK', 0.001));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Facility manager auto-schedule (D9)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** auto_schedule_window_before_due_days — the default DSL rule threshold (`days_until_maintenance_due <= this`). Default 7, 3..14. */
  get autoScheduleWindowBeforeDueDays(): number {
    return clampMaintenanceTunableToRange('maintenance.auto_schedule_window_before_due_days',
      TunablesStore.resolveInt('maintenance.auto_schedule_window_before_due_days', 'MAINTENANCE_AUTO_SCHEDULE_WINDOW_BEFORE_DUE_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Repair cost/time (§6 atomic-5 — IMMEDIATE=min days, SLOW=max days per D4/§5)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get repairCostPctOfSetupMin(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_cost_pct_of_setup_min',
      TunablesStore.resolveInt('maintenance.repair_cost_pct_of_setup_min', 'MAINTENANCE_REPAIR_COST_PCT_OF_SETUP_MIN', 15));
  },
  get repairCostPctOfSetupMax(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_cost_pct_of_setup_max',
      TunablesStore.resolveInt('maintenance.repair_cost_pct_of_setup_max', 'MAINTENANCE_REPAIR_COST_PCT_OF_SETUP_MAX', 40));
  },
  /** repair_time_days_min — the IMMEDIATE repair option's fixed duration (D4/§6). Default 3, 1..7. */
  get repairTimeDaysMin(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_time_days_min',
      TunablesStore.resolveInt('maintenance.repair_time_days_min', 'MAINTENANCE_REPAIR_TIME_DAYS_MIN', 3));
  },
  /** repair_time_days_max — the SLOW repair option's fixed duration (D4/§6). Default 7, 5..14. */
  get repairTimeDaysMax(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_time_days_max',
      TunablesStore.resolveInt('maintenance.repair_time_days_max', 'MAINTENANCE_REPAIR_TIME_DAYS_MAX', 7));
  },
  /** repair_slow_cost_multiplier — SLOW repair option cost fraction (60% of full cost). Default 0.6, 0.4..0.8. */
  get repairSlowCostMultiplier(): number {
    return clampMaintenanceTunableToRange('maintenance.repair_slow_cost_multiplier',
      TunablesStore.resolveFloat('maintenance.repair_slow_cost_multiplier', 'MAINTENANCE_REPAIR_SLOW_COST_MULTIPLIER', 0.6));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Pricing (D10 — one curve, no double-count)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** emergency_maintenance_cost_multiplier — the D10 curve floor while overdue (`max(curve(d), this)`). Default 1.5, 1.2..2.0. */
  get emergencyMaintenanceCostMultiplier(): number {
    return clampMaintenanceTunableToRange('maintenance.emergency_maintenance_cost_multiplier',
      TunablesStore.resolveFloat('maintenance.emergency_maintenance_cost_multiplier', 'MAINTENANCE_EMERGENCY_MAINTENANCE_COST_MULTIPLIER', 1.5));
  },
  /** schedule_cost_pct_of_setup — [PROV-Y26Q2] (D10) the base-cost key the tech doc's own registry omitted: `base = this_pct × the M1 conversion-cost reference`. Default 5, 2..10. */
  get scheduleCostPctOfSetup(): number {
    return clampMaintenanceTunableToRange('maintenance.schedule_cost_pct_of_setup',
      TunablesStore.resolveInt('maintenance.schedule_cost_pct_of_setup', 'MAINTENANCE_SCHEDULE_COST_PCT_OF_SETUP', 5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Heat magnitude band (D7 — [PROV-Y26Q2], string band vocabulary — no CAPS entry)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** failure_repair_heat_magnitude_band — [PROV-Y26Q2] (D7): canon gives no number for the repair-window spike; a band string (the existing `HeatInjectionMagnitude` vocabulary) rather than an invented float. Default 'MEDIUM'. */
  get failureRepairHeatMagnitudeBand(): string {
    return TunablesStore.resolveString('maintenance.failure_repair_heat_magnitude_band', 'MAINTENANCE_FAILURE_REPAIR_HEAT_MAGNITUDE_BAND', 'MEDIUM');
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // F4 perf budget
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** perf_budget.04f_max_kb_per_player — [PROV-Y26Q2] (memory_budget_maintenance.md) — the F4 alert threshold for 04f-A's ~720 B/player envelope. Default 3, 1..5. */
  get perfBudget04fMaxKbPerPlayer(): number {
    return clampMaintenanceTunableToRange('perf_budget.04f_max_kb_per_player',
      TunablesStore.resolveInt('perf_budget.04f_max_kb_per_player', 'PERF_BUDGET_04F_MAX_KB_PER_PLAYER', 3));
  },
};

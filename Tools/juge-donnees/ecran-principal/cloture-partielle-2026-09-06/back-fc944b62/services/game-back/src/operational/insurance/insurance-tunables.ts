// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (5 canon tunables :75-80,184-188)
//             docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.2 (4 canon tunables :119-122,189-192)
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — insurance (registry-first)
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — insurance §4.2 canon tunables C0
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 0 (C0)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 0 (C0)
//             — Insurance C0 — 2026-06-17
//             — Insurance Drift C0 — 2026-06-18
//
// `insurance-tunables.ts` — registry-mirrored getters for the 5 §4.1 canon `insurance.*` keys.
//
// Pattern mirrors `market-tunables.ts` and `reputation-tunables.ts` exactly.
//
// R2.3 (NO inline numeric value for any `insurance.*` key beyond the registry-default fallback):
// all values route through TunablesStore.resolve* with the registry key name as the first arg.
// The defaults cited here are VERBATIM from insurance_mechanics.md §4.1 (:75-80,184-188) — the
// single source of truth. If the registry values change, update gdd/14 + this file SAME commit.
//
// Anti-fabrication contract (C4): no non-deterministic RNG in this file — the insurance
// lot reuses MarketRngService.seedFromDay for all deterministic draws; this file is pure config.
//
// C0 exposed the 5 §4.1 canon tunables. C1 ADDS the 8 NEW [PROPOSED DEFAULT][PROV-Y26Q2] getters
// (registry rows landed in gdd/14 §Operational chain — insurance NEW tunables C1, 2026-06-17).
// ⚠️ CORRIGÉ 2026-08-13 — cette note groupait les 2 clés "(calibrate)" sous un même comportement de
// défaut. Ce n'est plus vrai pour les deux : `courierLawyerFeePayoutCents` retourne bien 0 tant que
// non calibré (voir son getter) ; `courierInterceptHeatThreshold` retourne 0.5 depuis OQ-8 (getter
// ci-dessous) — son tick de production N'EST PAS inerte au défaut livré. Chaque "(calibrate)" flag
// reste honnête sur son PROPRE getter ; ne pas en déduire un comportement de groupe.
//
// The 5 §4.1 canon tunables (registry-first in gdd/14 §Operational chain — insurance):
//
// | Key                                                   | Default | Range     | Canon source          |
// |-------------------------------------------------------|---------|-----------|-----------------------|
// | insurance.underwriting_walk_duration_days             | 3       | 2..7      | :76,184               |
// | insurance.underwriting_base_premium_pct_of_insured_value_per_cycle | 4 | 1..10 | :77,185          |
// | insurance.underwriting_c_i_per_finding_min            | 0.1     | 0.1..0.6  | :78,186 (range min)   |
// | insurance.underwriting_c_i_per_finding_max            | 0.6     | 0.1..0.6  | :78,186 (range max)   |
// | insurance.underwriting_fraud_penalty_multiplier       | 5       | 3..10     | :79,187               |
// | insurance.underwriting_almanac_persistence_days_post_lapse | 90  | 30..365  | :80,188               |
//
// NOTE: `underwriting_c_i_per_finding` is a per-finding-type coefficient range [0.1..0.6].
// The registry exposes two keys (min/max) so TunablesStore can resolve each independently.
// The clipboard formula (C4) applies a per-finding weight; the range bounds are canon-public (:54).

import { TunablesStore } from '../../config/tunables-store';

/** Registry-mirrored getters for the 5 §4.1 canon `insurance.*` tunable keys. */
export const insuranceTunables = {
  // ── §4.1 Underwriting Walk — 5 canon keys (insurance_mechanics.md:75-80,184-188) ─────────────

  /**
   * `insurance.underwriting_walk_duration_days` — multi-day walk duration.
   * DD-WALK: the walk runs for exactly `duration` in-game days; `computePremium` is guarded on
   * `day == duration` (C3). Canon `:76,184`: "3-day walk by default".
   * Default 3, range 2..7 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_WALK_DURATION_DAYS (test-only).
   */
  get walkDurationDays(): number {
    return TunablesStore.resolveInt(
      'insurance.underwriting_walk_duration_days',
      'INSURANCE_UNDERWRITING_WALK_DURATION_DAYS',
      3,
    );
  },

  /**
   * `insurance.underwriting_base_premium_pct_of_insured_value_per_cycle` — base premium as a
   * percentage of the insured value per coverage cycle.
   * Canon `:77,185`: "4% of insured value per cycle".
   * Default 4, range 1..10 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_BASE_PREMIUM_PCT (test-only).
   */
  get basePremiumPctOfInsuredValue(): number {
    return TunablesStore.resolveInt(
      'insurance.underwriting_base_premium_pct_of_insured_value_per_cycle',
      'INSURANCE_UNDERWRITING_BASE_PREMIUM_PCT',
      4,
    );
  },

  /**
   * `insurance.underwriting_c_i_per_finding_min` — minimum `c_i` clipboard coefficient per finding type.
   * Canon `:78,186`: "c_i ∈ [0.1, 0.6] per finding type" (clipboard coefficients are public BY DESIGN :54).
   * Default 0.1, range 0.1..0.6 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_C_I_MIN (test-only).
   */
  get cIPerFindingMin(): number {
    return TunablesStore.resolveFloat(
      'insurance.underwriting_c_i_per_finding_min',
      'INSURANCE_UNDERWRITING_C_I_MIN',
      0.1,
    );
  },

  /**
   * `insurance.underwriting_c_i_per_finding_max` — maximum `c_i` clipboard coefficient per finding type.
   * Canon `:78,186`: "c_i ∈ [0.1, 0.6] per finding type" (clipboard coefficients are public BY DESIGN :54).
   * Default 0.6, range 0.1..0.6 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_C_I_MAX (test-only).
   */
  get cIPerFindingMax(): number {
    return TunablesStore.resolveFloat(
      'insurance.underwriting_c_i_per_finding_max',
      'INSURANCE_UNDERWRITING_C_I_MAX',
      0.6,
    );
  },

  /**
   * `insurance.underwriting_fraud_penalty_multiplier` — fraud penalty multiplier (5× default).
   * Canon `:79,187`: "5× penalty multiplier for fraud + FRAUDED status + almanac POISONED".
   * Legacy row: `14_tunable_constants.md:1001` (`underwriting_fraud_penalty_multiplier` 5×).
   * NEW concrete `insurance.*` row in gdd/14 §Operational chain — insurance (registry-add).
   * C13 will reconcile the legacy row with this concrete registry key (note the alias).
   * Default 5, range 3..10 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_FRAUD_PENALTY_MULTIPLIER (test-only).
   */
  get fraudPenaltyMultiplier(): number {
    return TunablesStore.resolveInt(
      'insurance.underwriting_fraud_penalty_multiplier',
      'INSURANCE_UNDERWRITING_FRAUD_PENALTY_MULTIPLIER',
      5,
    );
  },

  /**
   * `insurance.underwriting_almanac_persistence_days_post_lapse` — almanac persistence horizon.
   * Canon `:80,188`: "90 days post-lapse persistence; at max 365 days = poison horizon (DD-FRAUD-POISON)".
   * Also used as the `poisoned_until_tick` deadline (C10 fraud penalty).
   * Default 90, range 30..365 (gdd/14 §Operational chain — insurance).
   * Env-override: INSURANCE_UNDERWRITING_ALMANAC_PERSISTENCE_DAYS (test-only).
   */
  get almanacPersistenceDaysPostLapse(): number {
    return TunablesStore.resolveInt(
      'insurance.underwriting_almanac_persistence_days_post_lapse',
      'INSURANCE_UNDERWRITING_ALMANAC_PERSISTENCE_DAYS',
      90,
    );
  },

  // ── C1: 8 NEW [PROPOSED DEFAULT][PROV-Y26Q2] tunables (gdd/14 §Operational chain — insurance NEW tunables C1) ──
  //
  // Canon §4.1 is SILENT on these magnitudes. Defaults from design §7, anchored on canon structure.
  // All flagged [PROPOSED DEFAULT][PROV-Y26Q2] — not canon-verbatim, not silently inlined.
  // ⚠️ CORRIGÉ 2026-08-13 (re-revue ⊥, BLOCKING-2) — même défaut que la note `:24-28` ci-dessus,
  // survivant 121 lignes plus bas dans une SECONDE formulation que le premier correctif n'avait pas
  // reconnue comme le même énoncé. Chaque "(calibrate)" flag reste honnête sur son PROPRE getter ;
  // ne pas en déduire un comportement de groupe — `courierInterceptHeatThreshold` (ci-dessous, getter
  // dans ce même fichier) rend 0.5, pas 0, depuis OQ-8.

  /**
   * `insurance.property_coverage_fraction` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Fraction of PROPERTY damage covered (default 0.60, range 0.30..0.90).
   * Canon :62: "building damage + forfeiture" — no fraction given (partial coverage, design §7 §1.3).
   * Env-override: INSURANCE_PROPERTY_COVERAGE_FRACTION (test-only).
   */
  get propertyCoverageFraction(): number {
    return TunablesStore.resolveFloat(
      'insurance.property_coverage_fraction',
      'INSURANCE_PROPERTY_COVERAGE_FRACTION',
      0.60,
    );
  },

  /**
   * `insurance.stash_coverage_fraction` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Fraction of seized cash/product covered (default 0.50, range 0.20..0.80).
   * Canon :63: "fraction of seized cash/product" — no fraction given (design §7 §1.3).
   * Env-override: INSURANCE_STASH_COVERAGE_FRACTION (test-only).
   */
  get stashCoverageFraction(): number {
    return TunablesStore.resolveFloat(
      'insurance.stash_coverage_fraction',
      'INSURANCE_STASH_COVERAGE_FRACTION',
      0.50,
    );
  },

  /**
   * `insurance.courier_lawyer_fee_payout_cents` — [PROPOSED DEFAULT][PROV-Y26Q2] (calibrate).
   * Fixed lawyer fee payout in cents on COURIER_ARREST. Canon :64: "lawyer fees" — no amount given.
   * CALIBRATE AT C13 CLOSEOUT: align with ch17 lawyer cost on the existing cost scale.
   * Returns 0 as sentinel until calibrated. Env-override: INSURANCE_COURIER_LAWYER_FEE_PAYOUT_CENTS.
   */
  get courierLawyerFeePayoutCents(): number {
    return TunablesStore.resolveInt(
      'insurance.courier_lawyer_fee_payout_cents',
      'INSURANCE_COURIER_LAWYER_FEE_PAYOUT_CENTS',
      0, // calibrate at C13 closeout — 0 = no payout until calibrated
    );
  },

  /**
   * `insurance.courier_cargo_recovery_fraction` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Fraction of courier_shift.cargo_cents recovered on arrest (default 0.40, range 0.10..0.70).
   * Canon :64: "partial cargo recovery" — no fraction given (design §7 §1.3).
   * Env-override: INSURANCE_COURIER_CARGO_RECOVERY_FRACTION (test-only).
   */
  get courierCargoRecoveryFraction(): number {
    return TunablesStore.resolveFloat(
      'insurance.courier_cargo_recovery_fraction',
      'INSURANCE_COURIER_CARGO_RECOVERY_FRACTION',
      0.40,
    );
  },

  /**
   * `insurance.fence_throughput_loss_compensation_fraction` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Fraction of throughput_in_per_hour × window compensated on FENCE_DEFAULT.
   * Default 0.50, range 0.20..0.80. Canon :65: "laundering throughput loss" — no fraction given.
   * Env-override: INSURANCE_FENCE_THROUGHPUT_LOSS_COMPENSATION_FRACTION (test-only).
   */
  get fenceThroughputLossCompensationFraction(): number {
    return TunablesStore.resolveFloat(
      'insurance.fence_throughput_loss_compensation_fraction',
      'INSURANCE_FENCE_THROUGHPUT_LOSS_COMPENSATION_FRACTION',
      0.50,
    );
  },

  /**
   * `insurance.courier_intercept_heat_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2] (calibrate).
   * Heat/patrol threshold above which a courier_shift in_transit is intercepted (C7 producer).
   * CALIBRATE AT C13 CLOSEOUT: align with the existing heat scale in the game.
   * ⚠️ CORRIGÉ 2026-08-13 : cette ligne annonçait un retour neutralisant tant que non calibré — le
   * corps rend 0.5 depuis OQ-8, CINQ LIGNES PLUS BAS. Un docblock qui contredit le `return` de sa
   * propre fonction est le pire des énoncés datés : il est lu à la place du code qu'il surplombe.
   * Env-override: INSURANCE_COURIER_INTERCEPT_HEAT_THRESHOLD.
   */
  get courierInterceptHeatThreshold(): number {
    return TunablesStore.resolveFloat(
      'insurance.courier_intercept_heat_threshold',
      'INSURANCE_COURIER_INTERCEPT_HEAT_THRESHOLD',
      // OQ-8 (System 9 C2, 2026-06-21): set positive so the live MINUTE/21 consumer fires in prod.
      // [PROV-Y26Q2] default 0.5 (calibration target vs the [0,1] patrol_heat scale C4 produces).
      // The prior 0 sentinel was inert (no interception); 0.5 means patrol_heat ≥ 50% → catches.
      // Calibrate at C13 closeout (align with the real patrol load distribution in prod play).
      0.5,
    );
  },

  /**
   * `insurance.fence_default_exposure_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * buffer_load / current_occupancy threshold above which a laundering node defaults (C8 producer).
   * Default 0.80, range 0.50..0.95. Anchored on the [0..1] scale of buffer_load (pipeline_and_laundering.ts).
   * Env-override: INSURANCE_FENCE_DEFAULT_EXPOSURE_THRESHOLD (test-only).
   */
  get fenceDefaultExposureThreshold(): number {
    return TunablesStore.resolveFloat(
      'insurance.fence_default_exposure_threshold',
      'INSURANCE_FENCE_DEFAULT_EXPOSURE_THRESHOLD',
      0.80,
    );
  },

  /**
   * `insurance.wary_premium_surcharge_multiplier` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Premium multiplier when wary_active = true (DD-WARY, C5). Default 1.25, range 1.05..1.50.
   * Follows the ±25% trend-multiplier pattern from D1b/D1c (DD7 — wary_premium_surcharge_multiplier).
   * Env-override: INSURANCE_WARY_PREMIUM_SURCHARGE_MULTIPLIER (test-only).
   */
  get waryPremiumSurchargeMultiplier(): number {
    return TunablesStore.resolveFloat(
      'insurance.wary_premium_surcharge_multiplier',
      'INSURANCE_WARY_PREMIUM_SURCHARGE_MULTIPLIER',
      1.25,
    );
  },

  // ── Drift C0: 4 §4.2 canon tunables (gdd/14 §Operational chain — insurance §4.2 canon tunables C0) ──
  //
  // Canon §4.2 :119-122,189-192 — VERBATIM defaults and ranges. These are NOT [PROPOSED DEFAULT]:
  // the values come directly from insurance_mechanics.md §4.2 table entries.
  // The 4 keys drive: α → true_loss_prob (C10) + renewal escalation (C11); decay → WEEKLY hazard decay (C10);
  // tiers → coverage tier count (C1/C13); window_days → BehaviourFingerprint window (C3) + anti-exploit (C12).
  // See gdd/14 §Operational chain — insurance §4.2 canon tunables C0 for full provenance.

  /**
   * `insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point` — α sensitivity.
   * Canon `:119,189`: α in `true_loss_prob = base_loss_prob · (1 + α · hazard_shift)` (C10)
   * AND the renewal escalated premium `escalatedPremium = basePremium · (1 + α · hazard_shift)` (C11).
   * Default 0.05, range 0.02..0.10 (insurance_mechanics.md :119,189 — VERBATIM).
   * Alias legacy: `coverage_hazard_sensitivity_alpha` (gdd/14 :1002, T.insurance.* :3984) — KEEP refs.
   * Env-override: INSURANCE_COVERAGE_DRIFT_ALPHA (test-only).
   */
  get coverageDriftAlpha(): number {
    return TunablesStore.resolveFloat(
      'insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point',
      'INSURANCE_COVERAGE_DRIFT_ALPHA',
      0.05,
    );
  },

  /**
   * `insurance.coverage_drift_shift_decay_per_week` — hazard_shift decay per WEEKLY tick.
   * Canon `:120,190`: `hazard_shift ← max(0, hazard_shift − decay)` each WEEKLY tick (C10).
   * Default 1, range 0..3 (insurance_mechanics.md :120,190 — VERBATIM).
   * Env-override: INSURANCE_COVERAGE_DRIFT_SHIFT_DECAY (test-only).
   */
  get coverageDriftShiftDecayPerWeek(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_shift_decay_per_week',
      'INSURANCE_COVERAGE_DRIFT_SHIFT_DECAY',
      1,
    );
  },

  /**
   * `insurance.coverage_drift_coverage_tiers` — number of distinct coverage tiers.
   * Canon `:121,191`: number of coverage tiers. Cap REUSE `T.bo.economic.coverage_tier_max` `3`.
   * Default 3, range 2..5 (insurance_mechanics.md :121,191 — VERBATIM).
   * Env-override: INSURANCE_COVERAGE_DRIFT_COVERAGE_TIERS (test-only).
   */
  get coverageDriftCoverageTiers(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_coverage_tiers',
      'INSURANCE_COVERAGE_DRIFT_COVERAGE_TIERS',
      3,
    );
  },

  /**
   * `insurance.coverage_drift_behaviour_fingerprint_window_days` — BehaviourFingerprint window.
   * Canon `:122,192`: the measurement window in game-days for `BehaviourFingerprint` (C3) AND
   * the anti-exploit almanac re-issue window (C12 — `[needs reviewer⊥]`: dual usage flagged).
   * Default 30, range 14..60 (insurance_mechanics.md :122,192 — VERBATIM).
   * Env-override: INSURANCE_COVERAGE_DRIFT_FINGERPRINT_WINDOW_DAYS (test-only).
   */
  get coverageDriftFingerprintWindowDays(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_behaviour_fingerprint_window_days',
      'INSURANCE_COVERAGE_DRIFT_FINGERPRINT_WINDOW_DAYS',
      30,
    );
  },

  // ── C3: 6 per-finding c_i coefficients (gdd/14 §Operational chain — insurance per-finding c_i C3) ──
  //
  // Canon §4.1 :78,186 gives range [0.1..0.6] per finding type but NO per-finding values.
  // These are [PROPOSED DEFAULT][PROV-Y26Q2] assignments within the canon range.
  // Rationale: higher c_i = higher risk signal. All reviewed/flagged for C13 closeout.
  // The premium formula: premiumCents = round(base × Π_i (1 + c_i × finding_i))
  // where finding_i = 1 if the FindingType bit is set in findings_bitmask.

  /**
   * `insurance.c_i_idle_dealers_observed` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.IDLE_DEALERS_OBSERVED (bit 0). Default 0.2, range 0.1..0.6.
   * Canon :49 names "idle dealers" (moderate operational exposure signal).
   * Env-override: INSURANCE_C_I_IDLE_DEALERS_OBSERVED (test-only).
   */
  get cIIdleDealersObserved(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_idle_dealers_observed',
      'INSURANCE_C_I_IDLE_DEALERS_OBSERVED',
      0.2,
    );
  },

  /**
   * `insurance.c_i_heat_smoke_observed` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.HEAT_SMOKE_OBSERVED (bit 1). Default 0.4, range 0.1..0.6.
   * Canon :49 names "heat/smoke" (high risk signal — building heat = concrete danger).
   * Env-override: INSURANCE_C_I_HEAT_SMOKE_OBSERVED (test-only).
   */
  get cIHeatSmokeObserved(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_heat_smoke_observed',
      'INSURANCE_C_I_HEAT_SMOKE_OBSERVED',
      0.4,
    );
  },

  /**
   * `insurance.c_i_lieutenant_uniform_disciplined` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.LIEUTENANT_UNIFORM_DISCIPLINED (bit 2). Default 0.1, range 0.1..0.6.
   * Canon :49 names "lieutenant uniform" (cross-cue — minimum signal, absence of lieutenant).
   * Range minimum value: the cross-cue is a weak secondary signal.
   * Env-override: INSURANCE_C_I_LIEUTENANT_UNIFORM_DISCIPLINED (test-only).
   */
  get cILieutenantUniformDisciplined(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_lieutenant_uniform_disciplined',
      'INSURANCE_C_I_LIEUTENANT_UNIFORM_DISCIPLINED',
      0.1,
    );
  },

  /**
   * `insurance.c_i_stash_queue_deep` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.STASH_QUEUE_DEEP (bit 3). Default 0.3, range 0.1..0.6.
   * Canon :49 names "stash queue depth" (moderate — deep inventory = risk exposure).
   * Env-override: INSURANCE_C_I_STASH_QUEUE_DEEP (test-only).
   */
  get cIStashQueueDeep(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_stash_queue_deep',
      'INSURANCE_C_I_STASH_QUEUE_DEEP',
      0.3,
    );
  },

  /**
   * `insurance.c_i_slate_membership_stable` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.SLATE_MEMBERSHIP_STABLE (bit 4). Default 0.2, range 0.1..0.6.
   * Canon :49 names "slate membership" (distribution activity = traceability risk).
   * Env-override: INSURANCE_C_I_SLATE_MEMBERSHIP_STABLE (test-only).
   */
  get cISlateMembershipStable(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_slate_membership_stable',
      'INSURANCE_C_I_SLATE_MEMBERSHIP_STABLE',
      0.2,
    );
  },

  /**
   * `insurance.c_i_hostage_shelf_state` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * c_i for FindingType.HOSTAGE_SHELF_STATE (bit 5). Default 0.5, range 0.1..0.6.
   * Canon :49 names "hostage shelf state" (high laundering exposure — buffer_load high = significant default risk).
   * Env-override: INSURANCE_C_I_HOSTAGE_SHELF_STATE (test-only).
   */
  get cIHostageShelfState(): number {
    return TunablesStore.resolveFloat(
      'insurance.c_i_hostage_shelf_state',
      'INSURANCE_C_I_HOSTAGE_SHELF_STATE',
      0.5,
    );
  },

  /**
   * `insurance.fence_claim_cooldown_hours` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Minimum GAME-hours between consecutive FENCE_DEFAULT payouts for the same (contract, node).
   * Unit: GAME-hours (not wall-clock hours). Converted to game-minutes in ClaimsService:
   *   cooldownGameMinutes = fenceClaimCooldownHours × 60.
   * Throttle rule: one PAID claim per (contract, node) per cooldown window. A genuinely
   * separated later loss (gap > N game-hours, measured via filed_tick) can claim again.
   * FENCE_DEFAULT fires EVERY nightly cycle when buffer_load > threshold; default 24 game-hours
   * (= 1 nightly cycle) deduplicates consecutive ticks in the same ongoing episode.
   * Range 12..168 (half-cycle to 7 game-days). [PROV-Y26Q2] — flag for reviewer⊥/C13 calibration.
   * Env-override: INSURANCE_FENCE_CLAIM_COOLDOWN_HOURS (test-only).
   */
  get fenceClaimCooldownHours(): number {
    return TunablesStore.resolveInt(
      'insurance.fence_claim_cooldown_hours',
      'INSURANCE_FENCE_CLAIM_COOLDOWN_HOURS',
      24,
    );
  },

  /**
   * `getCiForFinding(findingType)` — returns the c_i for a given FindingType (C3 premium formula).
   *
   * All values are within the canon range [0.1..0.6] (canon :78,186 — cIPerFindingMin/Max).
   * Each routes through a per-finding registry key (R2.3 — no inline coefficient).
   * [PROPOSED DEFAULT][PROV-Y26Q2] for all 6 values — flagged for reviewer⊥.
   *
   * Used by computePremium: premiumCents = round(base × Π_i (1 + c_i × finding_i))
   */
  getCiForFinding(findingType: number): number {
    switch (findingType) {
      case 0: return insuranceTunables.cIIdleDealersObserved;
      case 1: return insuranceTunables.cIHeatSmokeObserved;
      case 2: return insuranceTunables.cILieutenantUniformDisciplined;
      case 3: return insuranceTunables.cIStashQueueDeep;
      case 4: return insuranceTunables.cISlateMembershipStable;
      case 5: return insuranceTunables.cIHostageShelfState;
      default:
        // Unknown finding type — use the range minimum as a safe fallback.
        // Anti-fabrication: do not silently inline a value for unknown types.
        return insuranceTunables.cIPerFindingMin;
    }
  },

  // ── C2: 10 NEW §4.2 Coverage-Induced Drift tunables ─────────────────────────────────────────────
  //
  // [PROPOSED DEFAULT][PROV-Y26Q2] — design §7 table (NOT canon). Canon §4.2 names the mechanic
  // but does NOT provide magnitudes for margins/thresholds/term/base_loss_prob.
  // Each is flagged for reviewer⊥ (plan Task 2 "Flag for reviewer⊥").
  // DD-LESS-CAUTIOUS: 4 per-feature margin tunables (stash/courier/deal/lookout).
  // DD-RENEWAL: coverage_drift_contract_term_days (anchored on WEEKLY cycle = 7 game-days).
  // TiltLevelBucket: 3 threshold tunables ([needs reviewer⊥] registry-vs-presentation).
  // base_loss_prob_permille: (calibrate) sentinel — null until calibrated at C15.
  // All 10 keys are registry-FIRST (gdd/14 §Operational chain — insurance §4.2 NEW tunables C2).

  /**
   * `insurance.coverage_drift_stash_hotter_margin_factor` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Stash-hotter margin: `current ≥ baseline × factor` → less cautious (DD-LESS-CAUTIOUS stash).
   * Default 2.0 — anchored on canon "stash now 2× as hot" (`insurance_mechanics.md :98`).
   * Range 1.2..3.0 (design §7). Flagged for reviewer⊥.
   * Env-override: INSURANCE_COVERAGE_DRIFT_STASH_HOTTER_MARGIN_FACTOR (test-only).
   */
  get coverageDriftStashHotterMarginFactor(): number {
    return TunablesStore.resolveFloat(
      'insurance.coverage_drift_stash_hotter_margin_factor',
      'INSURANCE_COVERAGE_DRIFT_STASH_HOTTER_MARGIN_FACTOR',
      2.0,
    );
  },

  /**
   * `insurance.coverage_drift_courier_cadence_slower_margin_days` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Courier-cadence margin (game-days): `current ≥ baseline + margin_days` → less cautious.
   * Polarity: LONGER interval between rotations = less prudent.
   * Default 2, range 1..7 (design §7). Canon :94 "mean days between rotations" w/o delta.
   * Env-override: INSURANCE_COVERAGE_DRIFT_COURIER_CADENCE_SLOWER_MARGIN_DAYS (test-only).
   */
  get coverageDriftCourierCadenceSlowerMarginDays(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_courier_cadence_slower_margin_days',
      'INSURANCE_COVERAGE_DRIFT_COURIER_CADENCE_SLOWER_MARGIN_DAYS',
      2,
    );
  },

  /**
   * `insurance.coverage_drift_marginal_deal_rate_margin_permille` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Marginal-deal rate margin (per-mille): `current ≥ baseline + margin_permille` → less cautious.
   * Default 150, range 50..400 (design §7). Canon :95 "fraction" w/o delta. Flagged reviewer⊥.
   * Env-override: INSURANCE_COVERAGE_DRIFT_MARGINAL_DEAL_RATE_MARGIN_PERMILLE (test-only).
   */
  get coverageDriftMarginalDealRateMarginPermille(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_marginal_deal_rate_margin_permille',
      'INSURANCE_COVERAGE_DRIFT_MARGINAL_DEAL_RATE_MARGIN_PERMILLE',
      150,
    );
  },

  /**
   * `insurance.coverage_drift_marginal_deal_heat_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Heat-level threshold (building heat bucket) at or above which a deal tick is classified marginal
   * regardless of price. Calibrated to avoid classifying any-selling-at-all as marginal.
   * Design says "low-margin OR HIGH-heat" (design :95 "high-heat" without value).
   * Default 5, range 1..20 (design §7). [needs reviewer⊥] — calibration and heat scale.
   * Env-override: INSURANCE_COVERAGE_DRIFT_MARGINAL_DEAL_HEAT_THRESHOLD (test-only).
   */
  get coverageDriftMarginalDealHeatThreshold(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_marginal_deal_heat_threshold',
      'INSURANCE_COVERAGE_DRIFT_MARGINAL_DEAL_HEAT_THRESHOLD',
      5,
    );
  },

  /**
   * `insurance.coverage_drift_lookout_rate_margin_permille` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Lookout-rate margin (per-mille): `current ≤ baseline − margin_permille` → less cautious.
   * Polarity: FEWER lookouts = less prudent.
   * Default 150, range 50..400 (design §7). Canon :96 "fraction" w/o delta. Flagged reviewer⊥.
   * Env-override: INSURANCE_COVERAGE_DRIFT_LOOKOUT_RATE_MARGIN_PERMILLE (test-only).
   */
  get coverageDriftLookoutRateMarginPermille(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_lookout_rate_margin_permille',
      'INSURANCE_COVERAGE_DRIFT_LOOKOUT_RATE_MARGIN_PERMILLE',
      150,
    );
  },

  /**
   * `insurance.coverage_drift_stash_safe_fill_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Safe-fill threshold (per-mille of capacity) above which stash is "hot" (C3/C4).
   * Default 750, range 500..950 (design §7). Canon :93 "exceeds safe-fill threshold" w/o value.
   * Env-override: INSURANCE_COVERAGE_DRIFT_STASH_SAFE_FILL_THRESHOLD (test-only).
   */
  get coverageDriftStashSafeFillThreshold(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_stash_safe_fill_threshold',
      'INSURANCE_COVERAGE_DRIFT_STASH_SAFE_FILL_THRESHOLD',
      750,
    );
  },

  /**
   * `insurance.coverage_drift_contract_term_days` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Contract renewal term length in game-days (DD-RENEWAL, C11).
   * Default 7 (1 drift cycle = 1 WEEKLY cadence). Range 7..30 (design §7).
   * Anchored on the WEEKLY cycle (7 game-days = 1 WEEKLY tick).
   * Env-override: INSURANCE_COVERAGE_DRIFT_CONTRACT_TERM_DAYS (test-only).
   */
  get coverageDriftContractTermDays(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_contract_term_days',
      'INSURANCE_COVERAGE_DRIFT_CONTRACT_TERM_DAYS',
      7,
    );
  },

  /**
   * `insurance.coverage_drift_tilt_slight_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * hazard_shift threshold for `slight_tilt` bucket (TiltLevelBucket, C13).
   * Below this: `level`. At or above: `slight_tilt`. On [0..255] scale.
   * Default 20, range 5..60 (design §7). `[needs reviewer⊥]` — registry-vs-presentation.
   * Env-override: INSURANCE_COVERAGE_DRIFT_TILT_SLIGHT_THRESHOLD (test-only).
   */
  get coverageDriftTiltSlightThreshold(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_tilt_slight_threshold',
      'INSURANCE_COVERAGE_DRIFT_TILT_SLIGHT_THRESHOLD',
      20,
    );
  },

  /**
   * `insurance.coverage_drift_tilt_significant_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * hazard_shift threshold for `significant_tilt` bucket (TiltLevelBucket, C13).
   * At or above: `significant_tilt`. On [0..255] scale.
   * Default 80, range 40..150 (design §7). `[needs reviewer⊥]` — registry-vs-presentation.
   * Env-override: INSURANCE_COVERAGE_DRIFT_TILT_SIGNIFICANT_THRESHOLD (test-only).
   */
  get coverageDriftTiltSignificantThreshold(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_tilt_significant_threshold',
      'INSURANCE_COVERAGE_DRIFT_TILT_SIGNIFICANT_THRESHOLD',
      80,
    );
  },

  /**
   * `insurance.coverage_drift_tilt_red_threshold` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * hazard_shift threshold for `red` bucket (TiltLevelBucket, C13).
   * At or above: `red` (the red icon, canon :108). On [0..255] scale.
   * Default 160, range 100..255 (design §7). `[needs reviewer⊥]` — registry-vs-presentation.
   * Env-override: INSURANCE_COVERAGE_DRIFT_TILT_RED_THRESHOLD (test-only).
   */
  get coverageDriftTiltRedThreshold(): number {
    return TunablesStore.resolveInt(
      'insurance.coverage_drift_tilt_red_threshold',
      'INSURANCE_COVERAGE_DRIFT_TILT_RED_THRESHOLD',
      160,
    );
  },

  // ── C14 (DD-LAYER1-PROB, 2026-06-22): Layer-1 probabilistic interception max prob ────────────────
  //
  // DD-LAYER1-PROB (design §14.4, lot 9a) — ONE new [PROV-Y26Q2] key, co-located with the threshold
  // it pairs with (insurance.courier_intercept_heat_threshold, :222). The Layer-1 arrest consumer
  // stays in InsuranceModule (DIV-1), so the magnitude it reads is also Insurance-namespaced.
  // Cap owner: INSURANCE_TUNABLE_CAPS (mirror the threshold entry). Calibration TD (System 9 TD).

  /**
   * `insurance.courier_intercept_max_prob` — [PROV-Y26Q2] DD-LAYER1-PROB.
   * The interception probability at MAXIMUM patrol (`patrol_heat = 1.0`).
   * Layer-1 formula: `intercept_prob = clamp(0, this, this × patrol_heat)`.
   *   • At `patrol_heat = 0`:   `intercept_prob = 0.0 EXACTLY` (patrol-gate — parity with DD-BLOCK-RHO v2).
   *   • At `patrol_heat = 1.0`: `intercept_prob = this` (the survival cap, STRICTLY < 1.0).
   *   • Default 0.25 → 75 % survival at saturated patrol (canon "low-prob mais possible" :229).
   * Range `0.05..0.50` — the range top keeps `intercept_prob < 1.0` at the registry boundary
   * (a structural guarantee: you cannot tune Layer 1 back to a certain catch).
   * Getter-sourced (never inlined). [PROV-Y26Q2]. Calibration TD (System 9 calibration TD).
   * Env-override: INSURANCE_COURIER_INTERCEPT_MAX_PROB (test-only).
   */
  get courierInterceptMaxProb(): number {
    return TunablesStore.resolveFloat(
      'insurance.courier_intercept_max_prob',
      'INSURANCE_COURIER_INTERCEPT_MAX_PROB',
      0.25,
    );
  },

  /**
   * `insurance.coverage_drift_base_loss_prob_permille` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * base_loss_prob (per-mille) used in `true_loss_prob = base_loss_prob · (1 + α · hazard_shift)` (C10).
   * Canon :102 names the scalar WITHOUT providing a value — calibrate per coverage type at closeout (C15).
   * Sentinel: returns null when uncalibrated (env `INSURANCE_COVERAGE_DRIFT_BASE_LOSS_PROB_PERMILLE` unset
   * and no registry row with a numeric value). NEVER silently returns a fabricated default.
   * The (calibrate) flag in gdd/14 is carried here — callers MUST handle null (deferred until C15).
   */
  get coverageDriftBaseLossProbPermille(): number | null {
    const env = process.env['INSURANCE_COVERAGE_DRIFT_BASE_LOSS_PROB_PERMILLE'];
    if (env !== undefined && env !== '') {
      const parsed = parseInt(env, 10);
      if (!isNaN(parsed)) return parsed;
    }
    // Attempt registry lookup — if not set, return null (calibrate sentinel).
    // TunablesStore.resolveInt throws or returns the default; we use a sentinel pattern here
    // instead: check the registry-override table; if absent, null.
    const override = TunablesStore.resolveInt(
      'insurance.coverage_drift_base_loss_prob_permille',
      '', // no env var — already checked above
      -1, // sentinel default = uncalibrated
    );
    return override === -1 ? null : override;
  },

  // ── W6a C5 (DD-MAGNITUDE-BOUND): insured_value_cents clamp — design §3/C5 + §D5 ─────────────────
  //
  // `issueContract`'s `insuredValueCents` (contract.service.ts:116) was a caller-supplied magnitude
  // with NO bound — a validation defect, not the authorization defect W6a's other chunks close (D5:
  // "ce ne sont pas des défauts d'autorisation mais de validation d'entrée"). Canon §4.1 is SILENT on
  // an absolute ceiling/floor for insured_value_cents itself (it only bounds the premium % and the c_i
  // coefficients — see the canon table above). [PROPOSED DEFAULT][PROV-Y26Q2], anchored on MEASURED
  // usage: every existing E2E fixture uses 500_000..2_000_000 cents ($5k-$20k — grep
  // `tests/e2e/**/*.ts` for `insuredValueCents:`, 2026-08-09). The ceiling below gives ~250× headroom
  // above that observed legitimate range (room for a high-value contract) while still rejecting
  // `Number.MAX_SAFE_INTEGER`-class attacks by 6 orders of magnitude. The floor avoids a degenerate
  // zero/near-zero insured value (premiumCents would round to 0 — a free "active" contract).
  // Clamp idiom REUSED from `lek-memory.service.ts:264` (`Math.min(MAX, Math.max(MIN, Math.round(x)))`).

  /**
   * `insurance.insured_value_cents_floor` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Lower clamp bound for `issueContract`'s caller-supplied `insuredValueCents`.
   * Default 100 ($1.00) — avoids a degenerate near-zero insured value. Range 0..100_000 (reviewer-set
   * at gate — the tunable's OWN adjustable range, not the clamp target's range).
   * Env-override: INSURANCE_INSURED_VALUE_CENTS_FLOOR (test-only).
   */
  get insuredValueCentsFloor(): number {
    return TunablesStore.resolveInt(
      'insurance.insured_value_cents_floor',
      'INSURANCE_INSURED_VALUE_CENTS_FLOOR',
      100,
    );
  },

  /**
   * `insurance.insured_value_cents_ceiling` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Upper clamp bound for `issueContract`'s caller-supplied `insuredValueCents`.
   * Default 500_000_000 ($5,000,000) — anchored on measured E2E/legit usage (500_000..2_000_000
   * cents, i.e. $5k-$20k) with ~250× headroom. Range 10_000_000..2_000_000_000 (reviewer-set at gate).
   * Env-override: INSURANCE_INSURED_VALUE_CENTS_CEILING (test-only).
   */
  get insuredValueCentsCeiling(): number {
    return TunablesStore.resolveInt(
      'insurance.insured_value_cents_ceiling',
      'INSURANCE_INSURED_VALUE_CENTS_CEILING',
      500_000_000,
    );
  },
};

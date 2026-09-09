// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 4 (C4)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5 §7 (canon :228-240)
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — forensic signaling §7.1
//             — Forensic C4 — 2026-06-19
//
// `forensic-tunables.ts` — registry-mirrored getters for the T.forensic.* tunable keys.
//
// Pattern mirrors `insurance-tunables.ts` and `reputation-tunables.ts` exactly.
//
// R2.3 (NO inline numeric value beyond the registry-default fallback):
// all values route through TunablesStore.resolve* with the LEGACY registry key as the first arg.
// The defaults cited here are VERBATIM from forensic_signaling_mechanics.md §7 (:228-240) — the
// single source of truth. If the registry values change, update gdd/14 + this file SAME commit.
//
// DIV-3/OQ-3: the 12 legacy ids (T.forensic.benford_chi2_threshold_H etc.) are REUSED as-is
// as the runtime keys. They are NOT renamed to the canon-doc long names. The alias block at
// gdd/14:3964-3975 stays intact (REUSE refs — noted-not-mutated).
//
// OQ-11 (composite): benford_hard_audit_softflags_window is the single EXISTING row carrying
// BOTH count (3) AND window (60d). Two getters split them:
//   benfordHardAuditSoftflagsCount → reads T.forensic.benford_hard_audit_softflags_window → default 3
//   benfordHardAuditWindowDays → reads T.forensic.benford_hard_audit_softflags_window → default 60
// reviewer⊥ ratifies 1-row composite vs 2 rows.
//
// OQ-9 (days_per_month): genuinely NEW — no clock.* months helper exists (verified: gdd/14 only
// has *_freq_per_month legacy keys + electoral_cycle_days). NEW T.forensic.days_per_month key.
//
// §7.2 NEW keys: flagged [PROPOSED DEFAULT][PROV-Y26Q2] — reviewer⊥ ratifies per OQ-12 (buckets).
//
// Anti-fabrication: NO Math.random in this file — pure config getters, no stochastic logic.
// Zero-regression invariant (§1.3): this file is pure config; no mechanic logic here.
//
// §7.1 materialized (12 existing rows — canon-verbatim):
//
// | Legacy runtime key (T.forensic.*)                | Default | Range        | Canon |
// |--------------------------------------------------|---------|--------------|-------|
// | T.forensic.benford_chi2_threshold_H              | 14.0    | 8.0..24.0    | :67   |
// | T.forensic.benford_ring_buffer_length            | 64      | 32..256      | :68   |
// | T.forensic.benford_bookkeeper_cut_pct            | 7       | 3..15        | :69   |
// | T.forensic.benford_audit_tick_days               | 7       | 3..14        | :70   |
// | T.forensic.benford_hard_audit_softflags_window   | 3/60    | 2..5/30..120 | :71   |
// | T.forensic.effluent_sigma_inspector_threshold    | 1.5     | 0.8..3.0     | :112  |
// | T.forensic.effluent_window_days                  | 14      | 7..30        | :114  |
// | T.forensic.effluent_recipe_count                 | 6       | 3..12        | :115  |
// | T.forensic.standing_gap_G_threshold_mult         | 1.8     | 1.3..3.0     | :154  |
// | T.forensic.standing_gap_consecutive_months       | 2       | 1..4         | :155  |
// | T.forensic.standing_gap_typical_savings_rate     | 0.25    | 0.10..0.40   | :156  |
// | T.forensic.standing_gap_tail_ramp_weeks          | 6       | 3..12        | :157  |
//
// §7.1 + missing canon key (1 new row — canon-anchored, absent from original 12):
// | T.forensic.effluent_baseline_per_district_normalised | 1.0 | 0.4..2.0 | :113 |
//
// §7.2 NEW dispatcher/projection keys ([PROPOSED DEFAULT][PROV-Y26Q2]):
// | T.forensic.front_dark_weeks_min                          | 2    | 1..4       | :54                   |
// | T.forensic.front_dark_weeks_max                          | 4    | 2..8       | :54                   |
// | T.forensic.days_per_month                                | 30   | 28..31     | OQ-9                  |
// | T.forensic.dispatch_effluent_priority_high_deviation     | 2.5  | 1.5..4.0   | §4.3                  |
// | T.forensic.hard_audit_seizure_pct  (C9 NEW)             | 0.25 | 0.05..0.75 | C9 DD-SEIZURE-MAGNITUDE |
// (3 bucket-threshold rows are [PROPOSED DEFAULT] / calibrate at C24 — no numeric getter here)

import { TunablesStore } from '../../config/tunables-store';

/** Registry-mirrored getters for the T.forensic.* tunable keys (§5 Forensic Signaling). */
export const forensicTunables = {

  // ── §7.1 — 12 existing rows materialized (canon-verbatim defaults — forensic_signaling_mechanics.md :228-240) ─

  /**
   * `T.forensic.benford_chi2_threshold_H` — χ² threshold for the Benford's Law audit.
   * WEEKLY/9 tick: χ² > H → soft-flag (`forensic_soft_flag_ring.soft_flag_count++`).
   * Canon `:67,228`: "14.0 (range 8.0..24.0)".
   * Legacy runtime key: `T.forensic.benford_chi2_threshold_H` (REUSE — not renamed).
   * Default 14.0, range 8.0..24.0 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_BENFORD_CHI2_THRESHOLD_H (test-only).
   */
  get benfordChi2ThresholdH(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.benford_chi2_threshold_H',
      'FORENSIC_BENFORD_CHI2_THRESHOLD_H',
      14.0,
    );
  },

  /**
   * `T.forensic.benford_ring_buffer_length` — FIFO ring-buffer length for Benford χ² computation.
   * OQ-10: stores first-digit (1..9), not raw amount (reviewer⊥ ratifies digit-only vs raw).
   * Canon `:68,229`: "64 (range 32..256)".
   * Legacy runtime key: `T.forensic.benford_ring_buffer_length` (REUSE — not renamed).
   * Default 64, range 32..256 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_BENFORD_RING_BUFFER_LENGTH (test-only).
   */
  get benfordRingBufferLength(): number {
    return TunablesStore.resolveInt(
      'T.forensic.benford_ring_buffer_length',
      'FORENSIC_BENFORD_RING_BUFFER_LENGTH',
      64,
    );
  },

  /**
   * `T.forensic.benford_bookkeeper_cut_pct` — Bookkeeper lieutenant cash cut (%).
   * Applied in `BookkeeperLieutenantService.injectStructurallyRealisticNoise` (C10).
   * Canon `:69,230`: "7%" (cross-ref `:31`). "Bookkeeper cut 7%".
   * Legacy runtime key: `T.forensic.benford_bookkeeper_cut_pct` (REUSE — not renamed).
   * Default 7, range 3..15 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_BENFORD_BOOKKEEPER_CUT_PCT (test-only).
   */
  get benfordBookkeeperCutPct(): number {
    return TunablesStore.resolveInt(
      'T.forensic.benford_bookkeeper_cut_pct',
      'FORENSIC_BENFORD_BOOKKEEPER_CUT_PCT',
      7,
    );
  },

  /**
   * `T.forensic.benford_audit_tick_days` — WEEKLY/9 audit tick period in game-days.
   * Default 7 = 1 WEEKLY cycle (the cadence at which χ² is computed per ring).
   * Canon `:70,231`: "7 (range 3..14)".
   * Legacy runtime key: `T.forensic.benford_audit_tick_days` (REUSE — not renamed).
   * Default 7, range 3..14 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_BENFORD_AUDIT_TICK_DAYS (test-only).
   */
  get benfordAuditTickDays(): number {
    return TunablesStore.resolveInt(
      'T.forensic.benford_audit_tick_days',
      'FORENSIC_BENFORD_AUDIT_TICK_DAYS',
      7,
    );
  },

  /**
   * `T.forensic.benford_hard_audit_softflags_window` (OQ-11 composite — COUNT getter).
   * The existing single row carries BOTH count (3) AND window (60d).
   * This getter returns the COUNT: 3 soft-flags within the window → hard-audit trigger (C9).
   * Canon `:71,232`: "3 in 60 days (count range 2..5)".
   * Legacy runtime key: `T.forensic.benford_hard_audit_softflags_window` (REUSE — not renamed).
   * Default 3 (count), full range 2..5. Env-override: FORENSIC_BENFORD_HARD_AUDIT_SOFTFLAGS_COUNT.
   * reviewer⊥ ratifies 1-row composite vs 2 rows (OQ-11).
   */
  get benfordHardAuditSoftflagsCount(): number {
    return TunablesStore.resolveInt(
      'T.forensic.benford_hard_audit_softflags_window',
      'FORENSIC_BENFORD_HARD_AUDIT_SOFTFLAGS_COUNT',
      3,
    );
  },

  /**
   * `T.forensic.benford_hard_audit_softflags_window` (OQ-11 composite — WINDOW getter).
   * The existing single row carries BOTH count (3) AND window (60d).
   * This getter returns the WINDOW in days: flags within 60 days trigger hard-audit (C9).
   * Canon `:71,232`: "3 in 60 days (window range 30..120)".
   * Legacy runtime key: `T.forensic.benford_hard_audit_softflags_window` (REUSE — not renamed).
   * Default 60 (days), full range 30..120. Env-override: FORENSIC_BENFORD_HARD_AUDIT_WINDOW_DAYS.
   * reviewer⊥ ratifies 1-row composite vs 2 rows (OQ-11).
   */
  get benfordHardAuditWindowDays(): number {
    return TunablesStore.resolveInt(
      'T.forensic.benford_hard_audit_softflags_window',
      'FORENSIC_BENFORD_HARD_AUDIT_WINDOW_DAYS',
      60,
    );
  },

  /**
   * `T.forensic.effluent_sigma_inspector_threshold` — σ threshold for environmental inspector scan.
   * NIGHTLY/9: `deviation = (block_effluent − baseline) / baseline`; if `> σ` → `EffluentFlagDetected`.
   * Canon `:112,233`: "1.5σ (range 0.8..3.0)".
   * Legacy runtime key: `T.forensic.effluent_sigma_inspector_threshold` (REUSE — not renamed).
   * Default 1.5, range 0.8..3.0 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_EFFLUENT_SIGMA_INSPECTOR_THRESHOLD (test-only).
   */
  get effluentSigmaInspectorThreshold(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.effluent_sigma_inspector_threshold',
      'FORENSIC_EFFLUENT_SIGMA_INSPECTOR_THRESHOLD',
      1.5,
    );
  },

  /**
   * `T.forensic.effluent_baseline_per_district_normalised` — effluent baseline normalization factor.
   * Scan baseline (C14): `baseline = effluentBaselinePerDistrictNormalised · seedFromDay(dayId)`.
   * Canon `:113,234`: "1.0 (range 0.4..2.0)".
   * NOTE: this key was ABSENT from the original 12 T.forensic.* rows (:3964-3975) but IS defined
   *   in canon (:113/:234). Added as a NEW registry row (registry-honest, not fabricated).
   * NEW runtime key: `T.forensic.effluent_baseline_per_district_normalised` (canon-defined, new).
   * Default 1.0, range 0.4..2.0 (gdd/14 §Operational chain — forensic signaling §7.1 missing canon key).
   * Env-override: FORENSIC_EFFLUENT_BASELINE_PER_DISTRICT_NORMALISED (test-only).
   */
  get effluentBaselinePerDistrictNormalised(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.effluent_baseline_per_district_normalised',
      'FORENSIC_EFFLUENT_BASELINE_PER_DISTRICT_NORMALISED',
      1.0,
    );
  },

  /**
   * `T.forensic.effluent_window_days` — rolling window (days) for `block_effluent_register`.
   * `EffluentStoichiometryService.updateBlockEffluentRegister` (C13) sums workshops over this window.
   * Canon `:114,235`: "14 days (range 7..30)".
   * Legacy runtime key: `T.forensic.effluent_window_days` (REUSE — not renamed).
   * Default 14, range 7..30 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_EFFLUENT_WINDOW_DAYS (test-only).
   */
  get effluentWindowDays(): number {
    return TunablesStore.resolveInt(
      'T.forensic.effluent_window_days',
      'FORENSIC_EFFLUENT_WINDOW_DAYS',
      14,
    );
  },

  /**
   * `T.forensic.effluent_recipe_count` — number of stoichiometry recipes in `recipe_stoichiometry_table`.
   * 4 day-1 substances (brindle/crick/hush/ash, OQ-5); extensible to 6.
   * Canon `:115,236`: "6 (range 3..12)".
   * Legacy runtime key: `T.forensic.effluent_recipe_count` (REUSE — not renamed).
   * Default 6, range 3..12 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_EFFLUENT_RECIPE_COUNT (test-only).
   */
  get effluentRecipeCount(): number {
    return TunablesStore.resolveInt(
      'T.forensic.effluent_recipe_count',
      'FORENSIC_EFFLUENT_RECIPE_COUNT',
      6,
    );
  },

  /**
   * `T.forensic.standing_gap_G_threshold_mult` — G multiplier for standing-gap threshold.
   * Monthly tick (C17): `G = declared_cut · G_threshold_mult`; `gap > G` → flag.
   * Canon `:154,237`: "1.8× declared cut (range 1.3..3.0)".
   * Legacy runtime key: `T.forensic.standing_gap_G_threshold_mult` (REUSE — not renamed).
   * Default 1.8, range 1.3..3.0 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_STANDING_GAP_G_THRESHOLD_MULT (test-only).
   */
  get standingGapGThresholdMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.standing_gap_G_threshold_mult',
      'FORENSIC_STANDING_GAP_G_THRESHOLD_MULT',
      1.8,
    );
  },

  /**
   * `T.forensic.standing_gap_consecutive_months` — consecutive flagged months threshold → tail spawn.
   * Monthly tick (C17): if `flag_count >= consecutiveMonths` → `tail_ramp_stage = 'passive'`.
   * Canon `:155,238`: "2 (range 1..4)".
   * NOTE: legacy row `:1021` (`standing_gap_consecutive_months, value 2, unspecified — legacy`) is
   *   noted-not-mutated. The authoritative runtime key is this `T.forensic.*` row.
   * Legacy runtime key: `T.forensic.standing_gap_consecutive_months` (REUSE — not renamed).
   * Default 2, range 1..4 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_STANDING_GAP_CONSECUTIVE_MONTHS (test-only).
   */
  get standingGapConsecutiveMonths(): number {
    return TunablesStore.resolveInt(
      'T.forensic.standing_gap_consecutive_months',
      'FORENSIC_STANDING_GAP_CONSECUTIVE_MONTHS',
      2,
    );
  },

  /**
   * `T.forensic.standing_gap_typical_savings_rate` — lieutenant typical savings rate.
   * Gap formula (C16/C17): `gap = visible_standard_cost − declared_cut · (1 − savings_rate)`.
   * Canon `:156,239`: "0.25 (range 0.10..0.40)".
   * Legacy runtime key: `T.forensic.standing_gap_typical_savings_rate` (REUSE — not renamed).
   * Default 0.25, range 0.10..0.40 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_STANDING_GAP_TYPICAL_SAVINGS_RATE (test-only).
   */
  get standingGapTypicalSavingsRate(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.standing_gap_typical_savings_rate',
      'FORENSIC_STANDING_GAP_TYPICAL_SAVINGS_RATE',
      0.25,
    );
  },

  /**
   * `T.forensic.standing_gap_tail_ramp_weeks` — tail ramp total duration (weeks).
   * Tail ramp (C18): `passive → tailing → subpoena` over `tailRampWeeks` game-weeks.
   * Canon `:157,240`: "6 weeks (range 3..12)". Cross-ref `:54` "6 weeks".
   * Legacy runtime key: `T.forensic.standing_gap_tail_ramp_weeks` (REUSE — not renamed).
   * Default 6, range 3..12 (gdd/14 §Operational chain — forensic signaling §7.1).
   * Env-override: FORENSIC_STANDING_GAP_TAIL_RAMP_WEEKS (test-only).
   */
  get standingGapTailRampWeeks(): number {
    return TunablesStore.resolveInt(
      'T.forensic.standing_gap_tail_ramp_weeks',
      'FORENSIC_STANDING_GAP_TAIL_RAMP_WEEKS',
      6,
    );
  },

  // ── §7.2 — NEW dispatcher/projection keys ([PROPOSED DEFAULT][PROV-Y26Q2]) ──────────────────────

  /**
   * `T.forensic.front_dark_weeks_min` — minimum front-dark duration (weeks) after hard-audit.
   * Canon `:54`: "2-4 weeks" front dark. Min bound = 2.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Anchored on canon "2-4 weeks" range lower bound.
   * NEW key (not in the 12 legacy rows). Default 2, range 1..4.
   * Env-override: FORENSIC_FRONT_DARK_WEEKS_MIN (test-only).
   */
  get frontDarkWeeksMin(): number {
    return TunablesStore.resolveInt(
      'T.forensic.front_dark_weeks_min',
      'FORENSIC_FRONT_DARK_WEEKS_MIN',
      2,
    );
  },

  /**
   * `T.forensic.front_dark_weeks_max` — maximum front-dark duration (weeks) after hard-audit.
   * Canon `:54`: "2-4 weeks" front dark. Max bound = 4.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Anchored on canon "2-4 weeks" range upper bound.
   * NEW key (not in the 12 legacy rows). Default 4, range 2..8.
   * Env-override: FORENSIC_FRONT_DARK_WEEKS_MAX (test-only).
   */
  get frontDarkWeeksMax(): number {
    return TunablesStore.resolveInt(
      'T.forensic.front_dark_weeks_max',
      'FORENSIC_FRONT_DARK_WEEKS_MAX',
      4,
    );
  },

  /**
   * `T.forensic.days_per_month` — number of game-days per month (for monthly tick computation).
   * DD-MONTHLY-ON-NIGHTLY: `month_id = floor(gameDay / daysPerMonth)` (C17).
   * OQ-9: genuinely NEW — no clock.* months helper exists in gdd/14 (verified: only
   *   *_freq_per_month legacy keys + electoral_cycle_days; no generic month-length tunable).
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 30, range 28..31.
   * Env-override: FORENSIC_DAYS_PER_MONTH (test-only).
   */
  get daysPerMonth(): number {
    return TunablesStore.resolveInt(
      'T.forensic.days_per_month',
      'FORENSIC_DAYS_PER_MONTH',
      30,
    );
  },

  /**
   * `T.forensic.dispatch_effluent_priority_high_deviation` — deviation threshold for HIGH priority dispatch.
   * Dispatcher (C22): `deviation > threshold` → HIGH priority; else MEDIUM (§4.3 routing).
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 2.5, range 1.5..4.0.
   * Env-override: FORENSIC_DISPATCH_EFFLUENT_PRIORITY_HIGH_DEVIATION (test-only).
   */
  get dispatchEffluentPriorityHighDeviation(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.dispatch_effluent_priority_high_deviation',
      'FORENSIC_DISPATCH_EFFLUENT_PRIORITY_HIGH_DEVIATION',
      2.5,
    );
  },

  /**
   * `T.forensic.hard_audit_seizure_pct` — fraction of the player's cash-clear wallet seized on hard-audit.
   * Hard-audit (C9 `triggerHardAudit`): `seized = floor(economy_states.cash_cents * hardAuditSeizurePct)`.
   * Base = the player's `economy_states.cash_cents` wallet (the only structurally-grounded clean-cash
   * balance; no front-scoped clean-cash column exists in `pipeline_and_laundering.ts`).
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 0.25 (25%), range 0.05..0.75.
   * The fraction is a calibration target; the tunable drives the magnitude — NEVER an inline scalar.
   * NEW key (not in the 12 legacy rows). Added at C9 (C4 predates this key — materialized here).
   * Env-override: FORENSIC_HARD_AUDIT_SEIZURE_PCT (test-only).
   */
  get hardAuditSeizurePct(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.hard_audit_seizure_pct',
      'FORENSIC_HARD_AUDIT_SEIZURE_PCT',
      0.25,
    );
  },

  /**
   * `T.forensic.effluent_baseline_day_perturbation_band` — ± fractional day-seed perturbation amplitude
   * around the normalised effluent baseline (C14 inspector scan, DD-BASELINE-PERTURBATION).
   *
   * Canonical formula:
   *   `baseline = effluentBaselinePerDistrictNormalised × (1 − band + 2·band·daySeed)`
   *   where `daySeed = seedFromDay(dayId, districtId) ∈ [0,1)`.
   * At default `band = 0.2`: `baseline ∈ [0.8, 1.2) × normaliser` — byte-identical to the previously
   * inline `normaliser × (0.8 + 0.4 × daySeed)`. The band MUST be sourced via this getter; the
   * inline scalars `0.8`/`0.4` are BANNED in the baseline computation.
   *
   * Numerical-stability guard: naive `normaliser × seedFromDay` → baseline ≈ 0 when `daySeed ≈ 0`
   * → `deviation = (effluent − baseline)/baseline` blows up; the band keeps baseline a bounded
   * fraction of the normaliser.
   *
   * Canon `:186` mandates the day-seed *mechanic*; `:113` sources only the *normaliser*. The band
   * amplitude is canon-silent → `[PROPOSED DEFAULT][PROV-Y26Q2]` (calibration TD, C26).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 0.2, range 0.0..0.5.
   * NEW key (not in the 12 legacy rows). Added at C14 fix (DD-BASELINE-PERTURBATION).
   * Env-override: FORENSIC_EFFLUENT_BASELINE_DAY_PERTURBATION_BAND (test-only).
   */
  get effluentBaselineDayPerturbationBand(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.effluent_baseline_day_perturbation_band',
      'FORENSIC_EFFLUENT_BASELINE_DAY_PERTURBATION_BAND',
      0.2,
    );
  },

  /**
   * `T.forensic.standing_gap_visible_standard_cents_per_index` — cost per visible-standard index step (cents).
   *
   * DD-VISIBLE-STANDARD-COST (canon-silent): the tier table (index→cost mapping) is NOWHERE defined
   * in canon/design §7/gdd14. Resolution: PROVISIONAL linear model (precedent-exact after
   * DD-SEIZURE-MAGNITUDE C9 + DD-BASELINE-PERTURBATION C14):
   *   `visible_standard_cost = visible_standard_index × standingGapVisibleStandardCentsPerIndex`
   * Default 10000 = $100/tier step. NOT canon — the real tier table is the calibration-TD at C26.
   * MUST source this getter; NEVER inline `× 10000`.
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 10000, range 5000..50000.
   * NEW key (not in the 12 legacy rows, not in §7.1/§7.2 original set). Added at C16 (DD-VISIBLE-STANDARD-COST).
   * Env-override: FORENSIC_STANDING_GAP_VISIBLE_STANDARD_CENTS_PER_INDEX (test-only).
   */
  get standingGapVisibleStandardCentsPerIndex(): number {
    return TunablesStore.resolveInt(
      'T.forensic.standing_gap_visible_standard_cents_per_index',
      'FORENSIC_STANDING_GAP_VISIBLE_STANDARD_CENTS_PER_INDEX',
      10000,
    );
  },

  // NOTE: the 3 bucket-threshold rows (OQ-12: audit_risk_bucket_thresholds,
  //   effluent_visibility_bucket_thresholds, lifestyle_alarm_bucket_thresholds) are
  //   [PROPOSED DEFAULT] / (calibrate) — no numeric getter here; ForensicProjectionService (C24)
  //   will consume them with calibrated values once reviewer⊥ ratifies registry-vs-presentation.

  /**
   * `T.forensic.benford_chi2_band_medium_mult` — χ² band low→medium boundary multiplier.
   * DD-SEVERITY-BAND (A): bandFromChiSquare — chi2 ≥ medium_mult × benfordChi2ThresholdH → band 'medium'.
   * 'low' = at flag boundary chi2 ≥ H (no NEW magnitude). Monotone: 1.0 < medium_mult < high_mult < critical_mult.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 1.5, range 1.05..2.0.
   * Env-override: FORENSIC_BENFORD_CHI2_BAND_MEDIUM_MULT (test-only).
   */
  get benfordChi2BandMediumMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.benford_chi2_band_medium_mult',
      'FORENSIC_BENFORD_CHI2_BAND_MEDIUM_MULT',
      1.5,
    );
  },

  /**
   * `T.forensic.benford_chi2_band_high_mult` — χ² band medium→high boundary multiplier.
   * DD-SEVERITY-BAND (A): chi2 ≥ high_mult × H → band 'high'. Monotone: medium_mult < high_mult < critical_mult.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 2.5, range 1.5..4.0.
   * Env-override: FORENSIC_BENFORD_CHI2_BAND_HIGH_MULT (test-only).
   */
  get benfordChi2BandHighMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.benford_chi2_band_high_mult',
      'FORENSIC_BENFORD_CHI2_BAND_HIGH_MULT',
      2.5,
    );
  },

  /**
   * `T.forensic.benford_chi2_band_critical_mult` — χ² band high→critical boundary multiplier.
   * DD-SEVERITY-BAND (A): chi2 ≥ critical_mult × H → band 'critical'. Monotone: high_mult < critical_mult.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 4.0, range 2.5..8.0.
   * Env-override: FORENSIC_BENFORD_CHI2_BAND_CRITICAL_MULT (test-only).
   */
  get benfordChi2BandCriticalMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.benford_chi2_band_critical_mult',
      'FORENSIC_BENFORD_CHI2_BAND_CRITICAL_MULT',
      4.0,
    );
  },

  /**
   * `T.forensic.effluent_deviation_band_medium_mult` — deviation band low→medium boundary multiplier (× σ).
   * DD-SEVERITY-BAND (B): dev ≥ medium_mult × σ → band 'medium'. 'low' = at flag boundary dev ≥ σ.
   * 'high' REUSES dispatchEffluentPriorityHighDeviation (2.5) — no 2nd magnitude for same point.
   * Default 1.33 → 1.33 × 1.5 ≈ 2.0.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 1.33, range 1.05..1.66.
   * Env-override: FORENSIC_EFFLUENT_DEVIATION_BAND_MEDIUM_MULT (test-only).
   */
  get effluentDeviationBandMediumMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.effluent_deviation_band_medium_mult',
      'FORENSIC_EFFLUENT_DEVIATION_BAND_MEDIUM_MULT',
      1.33,
    );
  },

  /**
   * `T.forensic.effluent_deviation_band_critical_mult` — deviation band high→critical boundary multiplier (× σ).
   * DD-SEVERITY-BAND (B): dev ≥ critical_mult × σ → band 'critical'. Default 2.33 → 2.33 × 1.5 ≈ 3.5.
   * Invariant (defaults): critical_mult×σ (3.5) > dispatchEffluentPriorityHighDeviation (2.5) ✓.
   * [PROPOSED DEFAULT][PROV-Y26Q2]. Default 2.33, range 1.66..4.0.
   * Env-override: FORENSIC_EFFLUENT_DEVIATION_BAND_CRITICAL_MULT (test-only).
   */
  get effluentDeviationBandCriticalMult(): number {
    return TunablesStore.resolveFloat(
      'T.forensic.effluent_deviation_band_critical_mult',
      'FORENSIC_EFFLUENT_DEVIATION_BAND_CRITICAL_MULT',
      2.33,
    );
  },

};

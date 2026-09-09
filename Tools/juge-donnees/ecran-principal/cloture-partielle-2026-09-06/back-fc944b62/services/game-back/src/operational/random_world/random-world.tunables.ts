// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1 (random-world.tunables.ts,
//             registry-first getters, R2.3)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §5 (tunables)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §"Ambient World Event
//             Templates — Random world" (4 REUSE keys pre-registered 2026-05-23, [PROV-Y26Q2] flags
//             LIFTED same-commit — this chunk is their FIRST code reader) + the 43 NEW keys this chunk
//             ADDS (SAME commit — R2.3 registry-FIRST).
//             Pattern: mirrors services/game-back/src/operational/ambient/ambient.tunables.ts (CAPS map
//             + clamp function; ALL getters for the whole 04g-B design built upfront at C1, even though
//             most are not consumed until C2/C3/C4 — the SAME "N getters at C1, consumers land later"
//             precedent 04g-A/04e-B C1 established).
//             — 04g-B C1 — 2026-07-15
//
// `randomWorldTunables` — registry-mirrored getters for every `random_world.*` key this lot's whole
// design needs (47 total: 4 REUSE + 43 NEW). R2.3 (NO inline numeric balance/config in services):
// every default below is verbatim from gdd/14 §"Ambient World Event Templates — Random world". If a
// registry value changes, update gdd/14 + this file in the SAME commit (R9.3).
//
// Namespace `random_world.*` (matches gdd/14's existing REUSE rows — NOT `random_world_templates.*`,
// disjunction load-bearing same as 04g-A's `liveops_templates.*` vs `liveops.*` split, design §1).

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `AMBIENT_TUNABLE_CAPS`'s shape). */
interface RandomWorldTunableRange { readonly min: number; readonly max: number; }

export const RANDOM_WORLD_TUNABLE_CAPS: Record<string, RandomWorldTunableRange> = {
  // ── REUSE (4, gdd/14:1706-1715 pre-registered) ─────────────────────────────────────────────────
  'random_world.daily_activation_evaluation_batch_size':              { min: 10,    max: 30   },
  'random_world.sideways_failure_coupling_probability_baseline':      { min: 0.01,  max: 0.15  },
  'random_world.coupling_discoveries_per_player_per_30days_cap':      { min: 1,     max: 6     },
  'random_world.recovery_curve_exponent_default':                    { min: 1.0,   max: 2.0   },
  // ── NEW — global caps (design §5) ──────────────────────────────────────────────────────────────
  'random_world.district_activation_cooldown_days':                  { min: 7,     max: 90    },
  'random_world.max_concurrent_active_events':                       { min: 2,     max: 14    },
  // ── NEW — halgren_tannery_hailstorm (§3.5.1) ───────────────────────────────────────────────────
  'random_world.hailstorm_activation_probability_daily':             { min: 0.002, max: 0.05  },
  'random_world.hailstorm_hum_condition_weight':                     { min: 0,     max: 2.0   },
  'random_world.hailstorm_diffusion_days':                           { min: 7,     max: 14    },
  'random_world.hailstorm_recovery_half_life_days':                  { min: 180,   max: 540   },
  'random_world.hailstorm_permanent_residue_magnitude':              { min: 0.01,  max: 0.08  },
  'random_world.hailstorm_cohesion_drag_factor':                     { min: 0.1,   max: 0.8   },
  'random_world.hailstorm_inspection_intensity_factor':              { min: 0.1,   max: 1.0   },
  'random_world.hailstorm_bpd_attention_factor':                     { min: 0.05,  max: 0.4   },
  'random_world.hailstorm_scar_block_count':                         { min: 3,     max: 12    },
  'random_world.hailstorm_detection_threshold':                      { min: 0.02,  max: 0.15  },
  'random_world.hailstorm_max_duration_days':                        { min: 360,   max: 720   },
  // ── NEW — permanent_residue (§3.5.2) ───────────────────────────────────────────────────────────
  'random_world.permanent_residue_successor_probability':            { min: 0.1,   max: 0.7   },
  'random_world.permanent_residue_modifier_magnitude':                { min: 0.02,  max: 0.15  },
  'random_world.permanent_residue_lever_count':                       { min: 1,     max: 3     },
  // ── NEW — apparent_recovery (§3.5.3) ───────────────────────────────────────────────────────────
  'random_world.apparent_recovery_successor_probability':             { min: 0.05,  max: 0.6   },
  'random_world.apparent_recovery_bounce_amplitude':                  { min: 0.1,   max: 0.6   },
  'random_world.apparent_recovery_dip_amplitude':                     { min: 0.1,   max: 0.6   },
  'random_world.apparent_recovery_duration_weeks':                    { min: 16,    max: 22    },
  'random_world.apparent_recovery_plateau_amplifier':                 { min: 1.0,   max: 3.0   },
  'random_world.apparent_recovery_residual_floor_delta':              { min: 0.02,  max: 0.15  },
  'random_world.apparent_recovery_permanent_drag':                    { min: 0,     max: 0.05  },
  // ── NEW — hollow_at_the_corner (§3.5.4) ────────────────────────────────────────────────────────
  'random_world.hollow_activation_probability_daily':                 { min: 0.001, max: 0.02  },
  'random_world.hollow_cohesion_drop_magnitude':                      { min: 0.05,  max: 0.3   },
  'random_world.hollow_reweave_probability':                          { min: 0.3,   max: 0.8   },
  'random_world.hollow_closure_window_weeks':                         { min: 3,     max: 8     },
  'random_world.hollow_funeral_reweave_bonus':                        { min: 0.05,  max: 0.25  },
  'random_world.hollow_bpd_thinning_factor':                          { min: 0.02,  max: 0.25  },
  'random_world.hollow_drift_permanent_drag':                         { min: 0,     max: 0.05  },
  // ── NEW — sideways_failure (§3.5.5/§3.6) ───────────────────────────────────────────────────────
  'random_world.sideways_primary_magnitude':                          { min: 0.03,  max: 0.25  },
  'random_world.sideways_secondary_magnitude_ratio':                  { min: 0.3,   max: 1.0   },
  'random_world.sideways_primary_duration_days':                      { min: 1,     max: 7     },
  'random_world.sideways_secondary_duration_days':                    { min: 3,     max: 14    },
  'random_world.sideways_p2_detection_window_days':                   { min: 3,     max: 21    },
  // ── NEW — quorum_on_stadler_row (§3.5.6) ───────────────────────────────────────────────────────
  'random_world.quorum_adoption_accumulation_rate':                   { min: 0.005, max: 0.08  },
  'random_world.quorum_threshold_mean':                                { min: 0.3,   max: 0.7   },
  'random_world.quorum_threshold_variance':                            { min: 0.05,  max: 0.3   },
  'random_world.quorum_hysteresis_floor':                              { min: 0.1,   max: 0.45  },
  'random_world.quorum_cascade_dampening':                             { min: 0.2,   max: 0.9   },
  'random_world.quorum_near_threshold_band':                           { min: 0.02,  max: 0.25  },
  'random_world.quorum_bpd_attention_factor':                          { min: 0.02,  max: 0.25  },
  'random_world.quorum_cohesion_shift_factor':                         { min: 0.02,  max: 0.25  },
};

/** Clamp a numeric value to the registered range for the given key. Used internally by every getter
 *  below. Returns the value unchanged if no range is registered (defensive — every key above IS
 *  registered, so this branch is dead in practice, mirrors `clampAmbientTunableToRange`). */
export function clampRandomWorldTunableToRange(key: string, value: number): number {
  const range = RANDOM_WORLD_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for every `random_world.*` key (47 total — 4 REUSE + 43 NEW, C1). */
export const randomWorldTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // REUSE (4) — gdd/14:1706-1715 pre-registered 2026-05-23; this chunk is their FIRST code reader,
  // [PROV-Y26Q2] flags LIFTED same-commit (precedent 04g-A/04e-B C1).
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** daily_activation_evaluation_batch_size — templates evaluated per daily-tick batch (F4 perf
   *  budget). Default 14, 10..30. */
  get dailyActivationEvaluationBatchSize(): number {
    return clampRandomWorldTunableToRange('random_world.daily_activation_evaluation_batch_size',
      TunablesStore.resolveInt('random_world.daily_activation_evaluation_batch_size', 'RANDOM_WORLD_DAILY_ACTIVATION_EVALUATION_BATCH_SIZE', 14));
  },

  /** sideways_failure_coupling_probability_baseline — per tight-coupling-pair daily activation
   *  probability. Default 0.05, 0.01..0.15. */
  get sidewaysFailureCouplingProbabilityBaseline(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_failure_coupling_probability_baseline',
      TunablesStore.resolveFloat('random_world.sideways_failure_coupling_probability_baseline', 'RANDOM_WORLD_SIDEWAYS_FAILURE_COUPLING_PROBABILITY_BASELINE', 0.05));
  },

  /** coupling_discoveries_per_player_per_30days_cap — anti-overload cap on Coupling Discovery
   *  Cascade emissions per player per 30 days. Default 3, 1..6. */
  get couplingDiscoveriesPerPlayerPer30DaysCap(): number {
    return clampRandomWorldTunableToRange('random_world.coupling_discoveries_per_player_per_30days_cap',
      TunablesStore.resolveInt('random_world.coupling_discoveries_per_player_per_30days_cap', 'RANDOM_WORLD_COUPLING_DISCOVERIES_PER_PLAYER_PER_30DAYS_CAP', 3));
  },

  /** recovery_curve_exponent_default — the shared `RecoveryCurve` exponent `k` (higher = slower
   *  initial recovery). Default 1.3, 1.0..2.0. */
  get recoveryCurveExponentDefault(): number {
    return clampRandomWorldTunableToRange('random_world.recovery_curve_exponent_default',
      TunablesStore.resolveFloat('random_world.recovery_curve_exponent_default', 'RANDOM_WORLD_RECOVERY_CURVE_EXPONENT_DEFAULT', 1.3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — global caps (§5, D6 — the anti-pileup gates phase 3/4 of the generator consume, C2)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** district_activation_cooldown_days — no district receives 2 activations inside this rolling
   *  window (D6). [PROV-Y26Q3]. Default 30, 7..90. */
  get districtActivationCooldownDays(): number {
    return clampRandomWorldTunableToRange('random_world.district_activation_cooldown_days',
      TunablesStore.resolveInt('random_world.district_activation_cooldown_days', 'RANDOM_WORLD_DISTRICT_ACTIVATION_COOLDOWN_DAYS', 30));
  },

  /** max_concurrent_active_events — global cap on simultaneously `active` events (F4 garde phase 2).
   *  [PROV-Y26Q3]. Default 6, 2..14. */
  get maxConcurrentActiveEvents(): number {
    return clampRandomWorldTunableToRange('random_world.max_concurrent_active_events',
      TunablesStore.resolveInt('random_world.max_concurrent_active_events', 'RANDOM_WORLD_MAX_CONCURRENT_ACTIVE_EVENTS', 6));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — halgren_tannery_hailstorm (§3.5.1, C2 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** hailstorm_activation_probability_daily — daily seeded roll threshold. [PROV-Y26Q3] (canon gives
   *  no number, "low-probability infrastructural roll"). Default 0.01, 0.002..0.05. */
  get hailstormActivationProbabilityDaily(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_activation_probability_daily',
      TunablesStore.resolveFloat('random_world.hailstorm_activation_probability_daily', 'RANDOM_WORLD_HAILSTORM_ACTIVATION_PROBABILITY_DAILY', 0.01));
  },

  /** hailstorm_hum_condition_weight — district-condition weighting via hum baseline (D7).
   *  [PROV-Y26Q3]. Default 0.5, 0..2.0. */
  get hailstormHumConditionWeight(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_hum_condition_weight',
      TunablesStore.resolveFloat('random_world.hailstorm_hum_condition_weight', 'RANDOM_WORLD_HAILSTORM_HUM_CONDITION_WEIGHT', 0.5));
  },

  /** hailstorm_diffusion_days — CATALOGUE_REPORT.md verbatim ("diffusion days (default 10)").
   *  Default 10, 7..14. */
  get hailstormDiffusionDays(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_diffusion_days',
      TunablesStore.resolveInt('random_world.hailstorm_diffusion_days', 'RANDOM_WORLD_HAILSTORM_DIFFUSION_DAYS', 10));
  },

  /** hailstorm_recovery_half_life_days — CATALOGUE_REPORT.md "recovery half-life months (default 9)"
   *  at 30 days/month. Default 270, 180..540. */
  get hailstormRecoveryHalfLifeDays(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_recovery_half_life_days',
      TunablesStore.resolveInt('random_world.hailstorm_recovery_half_life_days', 'RANDOM_WORLD_HAILSTORM_RECOVERY_HALF_LIFE_DAYS', 270));
  },

  /** hailstorm_permanent_residue_magnitude — CATALOGUE_REPORT.md verbatim ("permanent residue
   *  magnitude (default 0.03)"). Default 0.03, 0.01..0.08. */
  get hailstormPermanentResidueMagnitude(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_permanent_residue_magnitude',
      TunablesStore.resolveFloat('random_world.hailstorm_permanent_residue_magnitude', 'RANDOM_WORLD_HAILSTORM_PERMANENT_RESIDUE_MAGNITUDE', 0.03));
  },

  /** hailstorm_cohesion_drag_factor — magnitude of the cohesion-recovery drag during contamination.
   *  [PROV-Y26Q3]. Default 0.4, 0.1..0.8. */
  get hailstormCohesionDragFactor(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_cohesion_drag_factor',
      TunablesStore.resolveFloat('random_world.hailstorm_cohesion_drag_factor', 'RANDOM_WORLD_HAILSTORM_COHESION_DRAG_FACTOR', 0.4));
  },

  /** hailstorm_inspection_intensity_factor — inspection-queue-cap intensity during contamination.
   *  [PROV-Y26Q3]. Default 0.5, 0.1..1.0. */
  get hailstormInspectionIntensityFactor(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_inspection_intensity_factor',
      TunablesStore.resolveFloat('random_world.hailstorm_inspection_intensity_factor', 'RANDOM_WORLD_HAILSTORM_INSPECTION_INTENSITY_FACTOR', 0.5));
  },

  /** hailstorm_bpd_attention_factor — raid-target-temperature reduction during contamination.
   *  [PROV-Y26Q3]. Default 0.15, 0.05..0.4. */
  get hailstormBpdAttentionFactor(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_bpd_attention_factor',
      TunablesStore.resolveFloat('random_world.hailstorm_bpd_attention_factor', 'RANDOM_WORLD_HAILSTORM_BPD_ATTENTION_FACTOR', 0.15));
  },

  /** hailstorm_scar_block_count — ScarPolygon size (BFS-seeded contiguous blocks). [PROV-Y26Q3].
   *  Default 6, 3..12. */
  get hailstormScarBlockCount(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_scar_block_count',
      TunablesStore.resolveInt('random_world.hailstorm_scar_block_count', 'RANDOM_WORLD_HAILSTORM_SCAR_BLOCK_COUNT', 6));
  },

  /** hailstorm_detection_threshold — contamination(d) below this ⇒ resolved. [PROV-Y26Q3] (canon
   *  threshold unnumbered). Default 0.05, 0.02..0.15. */
  get hailstormDetectionThreshold(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_detection_threshold',
      TunablesStore.resolveFloat('random_world.hailstorm_detection_threshold', 'RANDOM_WORLD_HAILSTORM_DETECTION_THRESHOLD', 0.05));
  },

  /** hailstorm_max_duration_days — hard event-expiry ceiling (canon asymptote top, ~18 months).
   *  [PROV-Y26Q3]. Default 540, 360..720. */
  get hailstormMaxDurationDays(): number {
    return clampRandomWorldTunableToRange('random_world.hailstorm_max_duration_days',
      TunablesStore.resolveInt('random_world.hailstorm_max_duration_days', 'RANDOM_WORLD_HAILSTORM_MAX_DURATION_DAYS', 540));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — permanent_residue (§3.5.2, C2 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** permanent_residue_successor_probability — daily seeded roll (post-parent-resolution).
   *  [PROV-Y26Q3]. Default 0.35, 0.1..0.7. */
  get permanentResidueSuccessorProbability(): number {
    return clampRandomWorldTunableToRange('random_world.permanent_residue_successor_probability',
      TunablesStore.resolveFloat('random_world.permanent_residue_successor_probability', 'RANDOM_WORLD_PERMANENT_RESIDUE_SUCCESSOR_PROBABILITY', 0.35));
  },

  /** permanent_residue_modifier_magnitude — CATALOGUE_REPORT.md verbatim ("modifier magnitude
   *  (default ±0.08)") — sign drawn per-row, seeded. Default 0.08, 0.02..0.15. */
  get permanentResidueModifierMagnitude(): number {
    return clampRandomWorldTunableToRange('random_world.permanent_residue_modifier_magnitude',
      TunablesStore.resolveFloat('random_world.permanent_residue_modifier_magnitude', 'RANDOM_WORLD_PERMANENT_RESIDUE_MODIFIER_MAGNITUDE', 0.08));
  },

  /** permanent_residue_lever_count — CATALOGUE_REPORT.md verbatim ("operations the modifier affects
   *  (default 1-3)"). Default 2, 1..3. */
  get permanentResidueLeverCount(): number {
    return clampRandomWorldTunableToRange('random_world.permanent_residue_lever_count',
      TunablesStore.resolveInt('random_world.permanent_residue_lever_count', 'RANDOM_WORLD_PERMANENT_RESIDUE_LEVER_COUNT', 2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — apparent_recovery (§3.5.3, C4 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** apparent_recovery_successor_probability — daily seeded roll (post-parent-resolution).
   *  [PROV-Y26Q3]. Default 0.25, 0.05..0.6. */
  get apparentRecoverySuccessorProbability(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_successor_probability',
      TunablesStore.resolveFloat('random_world.apparent_recovery_successor_probability', 'RANDOM_WORLD_APPARENT_RECOVERY_SUCCESSOR_PROBABILITY', 0.25));
  },

  /** apparent_recovery_bounce_amplitude — the "sharp visible bounce" multiplier bonus.
   *  [PROV-Y26Q3]. Default 0.3, 0.1..0.6. */
  get apparentRecoveryBounceAmplitude(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_bounce_amplitude',
      TunablesStore.resolveFloat('random_world.apparent_recovery_bounce_amplitude', 'RANDOM_WORLD_APPARENT_RECOVERY_BOUNCE_AMPLITUDE', 0.3));
  },

  /** apparent_recovery_dip_amplitude — the "real recovery dip" multiplier depth. [PROV-Y26Q3].
   *  Default 0.3, 0.1..0.6. */
  get apparentRecoveryDipAmplitude(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_dip_amplitude',
      TunablesStore.resolveFloat('random_world.apparent_recovery_dip_amplitude', 'RANDOM_WORLD_APPARENT_RECOVERY_DIP_AMPLITUDE', 0.3));
  },

  /** apparent_recovery_duration_weeks — CATALOGUE_REPORT.md ("resolves over 16-22 weeks"), midpoint
   *  default. Default 19, 16..22. */
  get apparentRecoveryDurationWeeks(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_duration_weeks',
      TunablesStore.resolveInt('random_world.apparent_recovery_duration_weeks', 'RANDOM_WORLD_APPARENT_RECOVERY_DURATION_WEEKS', 19));
  },

  /** apparent_recovery_plateau_amplifier — the plateau-weeks activation-probability multiplier for
   *  OTHER templates on the same district (canon "secondary triggers … land at amplified weight"; 1.0
   *  = disabled). [PROV-Y26Q3]. Default 1.5, 1.0..3.0. */
  get apparentRecoveryPlateauAmplifier(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_plateau_amplifier',
      TunablesStore.resolveFloat('random_world.apparent_recovery_plateau_amplifier', 'RANDOM_WORLD_APPARENT_RECOVERY_PLATEAU_AMPLIFIER', 1.5));
  },

  /** apparent_recovery_residual_floor_delta — CATALOGUE_REPORT.md verbatim ("residual floor delta
   *  (default -0.08)") — applied as a negative one-time mutation. Default 0.08, 0.02..0.15. */
  get apparentRecoveryResidualFloorDelta(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_residual_floor_delta',
      TunablesStore.resolveFloat('random_world.apparent_recovery_residual_floor_delta', 'RANDOM_WORLD_APPARENT_RECOVERY_RESIDUAL_FLOOR_DELTA', 0.08));
  },

  /** apparent_recovery_permanent_drag — the structural drag (D9) that keeps passive cohesion recovery
   *  from re-filling the residual step. [PROV-Y26Q3]. Default 0.02, 0..0.05. */
  get apparentRecoveryPermanentDrag(): number {
    return clampRandomWorldTunableToRange('random_world.apparent_recovery_permanent_drag',
      TunablesStore.resolveFloat('random_world.apparent_recovery_permanent_drag', 'RANDOM_WORLD_APPARENT_RECOVERY_PERMANENT_DRAG', 0.02));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — hollow_at_the_corner (§3.5.4, C4 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** hollow_activation_probability_daily — daily seeded roll per eligible district. [PROV-Y26Q3]
   *  (canon "long-serving public character dies", frequency unnumbered). Default 0.005,
   *  0.001..0.02. */
  get hollowActivationProbabilityDaily(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_activation_probability_daily',
      TunablesStore.resolveFloat('random_world.hollow_activation_probability_daily', 'RANDOM_WORLD_HOLLOW_ACTIVATION_PROBABILITY_DAILY', 0.005));
  },

  /** hollow_cohesion_drop_magnitude — CATALOGUE_REPORT.md verbatim ("cohesion drop magnitude
   *  (default -0.18)") — applied as a negative immediate mutation. Default 0.18, 0.05..0.3. */
  get hollowCohesionDropMagnitude(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_cohesion_drop_magnitude',
      TunablesStore.resolveFloat('random_world.hollow_cohesion_drop_magnitude', 'RANDOM_WORLD_HOLLOW_COHESION_DROP_MAGNITUDE', 0.18));
  },

  /** hollow_reweave_probability — CATALOGUE_REPORT.md verbatim ("recovery probability
   *  (default 55%)") — the base p before the funeral-attendance bonus. Default 0.55, 0.3..0.8. */
  get hollowReweaveProbability(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_reweave_probability',
      TunablesStore.resolveFloat('random_world.hollow_reweave_probability', 'RANDOM_WORLD_HOLLOW_REWEAVE_PROBABILITY', 0.55));
  },

  /** hollow_closure_window_weeks — CATALOGUE_REPORT.md verbatim ("closure window (default 5
   *  weeks)"). Default 5, 3..8. */
  get hollowClosureWindowWeeks(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_closure_window_weeks',
      TunablesStore.resolveInt('random_world.hollow_closure_window_weeks', 'RANDOM_WORLD_HOLLOW_CLOSURE_WINDOW_WEEKS', 5));
  },

  /** hollow_funeral_reweave_bonus — CATALOGUE_REPORT.md verbatim ("funeral-attendance bonus
   *  (default +12% to recovery)"). Default 0.12, 0.05..0.25. */
  get hollowFuneralReweaveBonus(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_funeral_reweave_bonus',
      TunablesStore.resolveFloat('random_world.hollow_funeral_reweave_bonus', 'RANDOM_WORLD_HOLLOW_FUNERAL_REWEAVE_BONUS', 0.12));
  },

  /** hollow_bpd_thinning_factor — raid-target-temperature increase during the window ("BPD informant
   *  flow thins"). [PROV-Y26Q3]. Default 0.1, 0.02..0.25. */
  get hollowBpdThinningFactor(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_bpd_thinning_factor',
      TunablesStore.resolveFloat('random_world.hollow_bpd_thinning_factor', 'RANDOM_WORLD_HOLLOW_BPD_THINNING_FACTOR', 0.1));
  },

  /** hollow_drift_permanent_drag — the "residual cohesion floor permanent" drag on the DRIFT fork
   *  outcome. [PROV-Y26Q3]. Default 0.02, 0..0.05. */
  get hollowDriftPermanentDrag(): number {
    return clampRandomWorldTunableToRange('random_world.hollow_drift_permanent_drag',
      TunablesStore.resolveFloat('random_world.hollow_drift_permanent_drag', 'RANDOM_WORLD_HOLLOW_DRIFT_PERMANENT_DRAG', 0.02));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — sideways_failure (§3.5.5/§3.6, C3 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** sideways_primary_magnitude — the primary district-X shift magnitude ("noticeable, hours").
   *  [PROV-Y26Q3]. Default 0.1, 0.03..0.25. */
  get sidewaysPrimaryMagnitude(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_primary_magnitude',
      TunablesStore.resolveFloat('random_world.sideways_primary_magnitude', 'RANDOM_WORLD_SIDEWAYS_PRIMARY_MAGNITUDE', 0.1));
  },

  /** sideways_secondary_magnitude_ratio — CATALOGUE_REPORT.md verbatim ("secondary-shift magnitude
   *  relative to primary (default 0.6)"). Default 0.6, 0.3..1.0. */
  get sidewaysSecondaryMagnitudeRatio(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_secondary_magnitude_ratio',
      TunablesStore.resolveFloat('random_world.sideways_secondary_magnitude_ratio', 'RANDOM_WORLD_SIDEWAYS_SECONDARY_MAGNITUDE_RATIO', 0.6));
  },

  /** sideways_primary_duration_days — the primary shift's duration (canon "decays normally").
   *  [PROV-Y26Q3]. Default 3, 1..7. */
  get sidewaysPrimaryDurationDays(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_primary_duration_days',
      TunablesStore.resolveInt('random_world.sideways_primary_duration_days', 'RANDOM_WORLD_SIDEWAYS_PRIMARY_DURATION_DAYS', 3));
  },

  /** sideways_secondary_duration_days — the secondary shift's duration (canon "subtle, days").
   *  [PROV-Y26Q3]. Default 7, 3..14. */
  get sidewaysSecondaryDurationDays(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_secondary_duration_days',
      TunablesStore.resolveInt('random_world.sideways_secondary_duration_days', 'RANDOM_WORLD_SIDEWAYS_SECONDARY_DURATION_DAYS', 7));
  },

  /** sideways_p2_detection_window_days — freshness window for the P2 `off_hours_drift_detection`
   *  substrate row (04g-A). [PROV-Y26Q3]. Default 7, 3..21. */
  get sidewaysP2DetectionWindowDays(): number {
    return clampRandomWorldTunableToRange('random_world.sideways_p2_detection_window_days',
      TunablesStore.resolveInt('random_world.sideways_p2_detection_window_days', 'RANDOM_WORLD_SIDEWAYS_P2_DETECTION_WINDOW_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — quorum_on_stadler_row (§3.5.6, C4 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** quorum_adoption_accumulation_rate — per-day adoption accumulation/decay rate (canon "continuous
   *  accumulation"). [PROV-Y26Q3]. Default 0.02, 0.005..0.08. */
  get quorumAdoptionAccumulationRate(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_adoption_accumulation_rate',
      TunablesStore.resolveFloat('random_world.quorum_adoption_accumulation_rate', 'RANDOM_WORLD_QUORUM_ADOPTION_ACCUMULATION_RATE', 0.02));
  },

  /** quorum_threshold_mean — CATALOGUE_REPORT.md verbatim ("mean threshold (default 0.5)") — the
   *  per-district Normal-distribution mean the seeded threshold draw uses. Default 0.5, 0.3..0.7. */
  get quorumThresholdMean(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_threshold_mean',
      TunablesStore.resolveFloat('random_world.quorum_threshold_mean', 'RANDOM_WORLD_QUORUM_THRESHOLD_MEAN', 0.5));
  },

  /** quorum_threshold_variance — CATALOGUE_REPORT.md verbatim. Default 0.15, 0.05..0.3. */
  get quorumThresholdVariance(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_threshold_variance',
      TunablesStore.resolveFloat('random_world.quorum_threshold_variance', 'RANDOM_WORLD_QUORUM_THRESHOLD_VARIANCE', 0.15));
  },

  /** quorum_hysteresis_floor — CATALOGUE_REPORT.md verbatim ("hysteresis floor (default 0.3)") — the
   *  adoption level below which the event resolves (path-back ≠ path-in). Default 0.3, 0.1..0.45. */
  get quorumHysteresisFloor(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_hysteresis_floor',
      TunablesStore.resolveFloat('random_world.quorum_hysteresis_floor', 'RANDOM_WORLD_QUORUM_HYSTERESIS_FLOOR', 0.3));
  },

  /** quorum_cascade_dampening — CATALOGUE_REPORT.md verbatim ("cascade dampening factor
   *  (default 0.6)"). Default 0.6, 0.2..0.9. */
  get quorumCascadeDampening(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_cascade_dampening',
      TunablesStore.resolveFloat('random_world.quorum_cascade_dampening', 'RANDOM_WORLD_QUORUM_CASCADE_DAMPENING', 0.6));
  },

  /** quorum_near_threshold_band — how close (in adoption units) a neighbor must be to its OWN
   *  threshold to receive the cascade dampening bonus (canon "already near its own threshold",
   *  unnumbered). [PROV-Y26Q3]. Default 0.1, 0.02..0.25. */
  get quorumNearThresholdBand(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_near_threshold_band',
      TunablesStore.resolveFloat('random_world.quorum_near_threshold_band', 'RANDOM_WORLD_QUORUM_NEAR_THRESHOLD_BAND', 0.1));
  },

  /** quorum_bpd_attention_factor — raid-target-temperature reduction on flip ("BPD attention
   *  reallocates"). [PROV-Y26Q3]. Default 0.1, 0.02..0.25. */
  get quorumBpdAttentionFactor(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_bpd_attention_factor',
      TunablesStore.resolveFloat('random_world.quorum_bpd_attention_factor', 'RANDOM_WORLD_QUORUM_BPD_ATTENTION_FACTOR', 0.1));
  },

  /** quorum_cohesion_shift_factor — cohesion-recovery-rate increase on flip ("neighborhood cohesion
   *  shifts structurally"). [PROV-Y26Q3]. Default 0.1, 0.02..0.25. */
  get quorumCohesionShiftFactor(): number {
    return clampRandomWorldTunableToRange('random_world.quorum_cohesion_shift_factor',
      TunablesStore.resolveFloat('random_world.quorum_cohesion_shift_factor', 'RANDOM_WORLD_QUORUM_COHESION_SHIFT_FACTOR', 0.1));
  },
};

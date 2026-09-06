// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 2 (C2)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §10
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md:450-478
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Combat / conflict layer — rival_ai
//             — Rival AI Foundation C2 — 2026-06-24 —
//
// `rival-ai.tunables.ts` — Registry-mirrored getters for all `rival_ai.*` tunable keys.
//
// R2.3 (NO inline numeric value for any `rival_ai.*` key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults
// cited here are verbatim from gdd/14 §Combat / conflict layer — rival_ai — the single source
// of truth. If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter.
// The canon ~29 keys (rival_ai_mechanics.md:450-478) are REUSED at verbatim defaults.
// The NEW [PROV-Y26Q2] keys are canon-silent magnitudes (OQ-A1/A2/A11), provisory.
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
//
// Pattern: mirrors services/game-back/src/operational/reputation/reputation-tunables.ts exactly.

import { TunablesStore } from '../../../config/tunables-store';

// ── Range constants for each key (used by RIVAL_AI_TUNABLE_CAPS) ────────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by RIVAL_AI_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `RIVAL_AI_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-clamp` route and by C3+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 */
export const RIVAL_AI_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── Canon REUSE keys (rival_ai_mechanics.md:450-478) ──────────────────────────────────────
  'rival_ai.regime_recompute_interval_game_hours': { min: 6, max: 24 },
  // regime_pressure_threshold_per_rival_bucket: composite — no numeric cap
  'rival_ai.regime_pressure_decay_rate_peaceful_per_day': { min: -5, max: 0 },
  'rival_ai.regimes_count_per_rival': { min: 4, max: 6 },
  'rival_ai.coil_observe_interval_ticks': { min: 1, max: 3 },
  'rival_ai.tarcum_commit_delay_ticks': { min: 1, max: 4 },
  'rival_ai.iron_throat_observe_interval_ticks': { min: 3, max: 8 },
  // cohesion_tempo_penalty_threshold_bucket: composite — no numeric cap
  // saturation_trained_threshold_bucket: composite — no numeric cap
  // saturation_suppression_threshold_bucket: composite — no numeric cap
  'rival_ai.saturation_passive_decay_rate_per_tick': { min: 0.02, max: 0.12 },
  'rival_ai.saturation_suppression_duration_ticks': { min: 8, max: 36 },
  'rival_ai.saturation_recompute_interval_game_hours': { min: 3, max: 12 },
  'rival_ai.distributed_hold_reroute_window_ticks': { min: 2, max: 8 },
  // distributed_hold_reroute_efficiency_penalty_when_alternative_exists_bucket: composite
  // distributed_hold_route_integrity_retreat_threshold_bucket: composite
  'rival_ai.distributed_hold_max_route_graph_size_coil': { min: 6, max: 20 },
  // trophic_secondary_rival_capacity_bonus_on_gap_bucket: composite
  'rival_ai.trophic_gap_duration_ticks': { min: 6, max: 30 },
  'rival_ai.trophic_restoration_rate_per_tick': { min: 0.02, max: 0.15 },
  // adaptive_skin_*_adaptation_rate_bucket: composite
  'rival_ai.adaptive_skin_resistance_decay_when_unused_per_tick': { min: 0.005, max: 0.03 },
  'rival_ai.adaptive_skin_novelty_effectiveness_multiplier': { min: 1.2, max: 2.0 },
  // intel_mode_switch_threshold_per_rival_bucket: composite
  // intel_mode_push_filter_strength_bucket: composite
  'rival_ai.intel_mode_pull_adaptation_speed_multiplier': { min: 1.0, max: 2.0 },

  // ── NEW [PROV-Y26Q2] keys (OQ-A2 pressure weights) — range 0.0..3.0 ──────────────────────
  'rival_ai.regime_pressure_weight_territory': { min: 0.0, max: 3.0 },
  'rival_ai.regime_pressure_weight_casualty': { min: 0.0, max: 3.0 },
  'rival_ai.regime_pressure_weight_revenue': { min: 0.0, max: 3.0 },

  // ── NEW [PROV-Y26Q2] keys (OQ-A1 Saltline tempo) — range 1..8 ────────────────────────────
  'rival_ai.saltline_tempo_observe_ticks': { min: 1, max: 8 },
  'rival_ai.saltline_tempo_orient_ticks': { min: 1, max: 8 },
  'rival_ai.saltline_tempo_commit_ticks': { min: 1, max: 8 },

  // ── NEW [PROV-Y26Q2] keys (OQ-A11 band cuts) — range 0..100 ──────────────────────────────
  'rival_ai.regime_band_silent_max': { min: 0, max: 100 },
  'rival_ai.regime_band_mounting_max': { min: 0, max: 100 },

  // ── NEW [PROV-Y26Q2] keys (OQ-A12 magnitude deltas) — range 0..100 ──────────────────────────────
  'rival_ai.regime_pressure_magnitude_delta_silent':   { min: 0, max: 100 },
  'rival_ai.regime_pressure_magnitude_delta_mounting': { min: 0, max: 100 },
  'rival_ai.regime_pressure_magnitude_delta_crushing': { min: 0, max: 100 },
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-clamp route + C3+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 */
export function clampToRange(key: string, value: number): number {
  const range = RIVAL_AI_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `rival_ai.*` tunable keys consumed by C3-C8 mechanics. */
export const rivalAiTunables = {

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.1 Regime Switching — canon keys (rival_ai_mechanics.md:450-453)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.regime_recompute_interval_game_hours` — regime pressure recompute cadence (hours).
   * Canon :450 / :71 gdd/14 §rival_ai. Default 12, range 6..24.
   * Maps to Cadence.TWELVE_H (DD-CADENCE §6.1). VERBATIM canon.
   */
  get regimeRecomputeIntervalGameHours(): number {
    return TunablesStore.resolveInt(
      'rival_ai.regime_recompute_interval_game_hours',
      'RIVAL_AI_REGIME_RECOMPUTE_INTERVAL_GAME_HOURS',
      12,
    );
  },

  /**
   * `rival_ai.regime_pressure_threshold_per_rival_bucket` — flip threshold on the 0-100 float.
   * Canon :451. composite:STANDARD (ref 70, never exposed — R2.2). VERBATIM-composite.
   * NOTE: composite — sourced as string, not a float. The mechanic reads this as a named bucket.
   */
  get regimePressureThresholdPerRivalBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.regime_pressure_threshold_per_rival_bucket',
      'RIVAL_AI_REGIME_PRESSURE_THRESHOLD_PER_RIVAL_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.regime_pressure_decay_rate_peaceful_per_day` — peaceful-decay on pressure per day.
   * Canon :452. Default -2, range 0..-5 (negative = decay). VERBATIM canon.
   */
  get regimePressureDecayRatePeacefulPerDay(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_decay_rate_peaceful_per_day',
      'RIVAL_AI_REGIME_PRESSURE_DECAY_RATE_PEACEFUL_PER_DAY',
      -2,
    );
  },

  /**
   * `rival_ai.regimes_count_per_rival` — number of distinct operational regimes per rival.
   * Canon :453. Default 5, range 4..6. VERBATIM canon.
   */
  get regimesCountPerRival(): number {
    return TunablesStore.resolveInt(
      'rival_ai.regimes_count_per_rival',
      'RIVAL_AI_REGIMES_COUNT_PER_RIVAL',
      5,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.2 Tempo Exposure — per-rival tempo keys (rival_ai_mechanics.md:455-458)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.coil_observe_interval_ticks` — Coil observe interval (ticks).
   * Canon :455 / :127. Default 1, range 1..3. VERBATIM canon.
   */
  get coilObserveIntervalTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.coil_observe_interval_ticks',
      'RIVAL_AI_COIL_OBSERVE_INTERVAL_TICKS',
      1,
    );
  },

  /**
   * `rival_ai.tarcum_commit_delay_ticks` — Tarcum commit delay (ticks).
   * Canon :456 / :128. Default 1, range 1..4. VERBATIM canon.
   */
  get tarcumCommitDelayTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.tarcum_commit_delay_ticks',
      'RIVAL_AI_TARCUM_COMMIT_DELAY_TICKS',
      1,
    );
  },

  /**
   * `rival_ai.iron_throat_observe_interval_ticks` — Iron Throat observe interval (ticks).
   * Canon :457 / :129. Default 5, range 3..8. VERBATIM canon.
   */
  get ironThroatObserveIntervalTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.iron_throat_observe_interval_ticks',
      'RIVAL_AI_IRON_THROAT_OBSERVE_INTERVAL_TICKS',
      5,
    );
  },

  /**
   * `rival_ai.cohesion_tempo_penalty_threshold_bucket` — cohesion cutoff lengthening orient_latency.
   * Canon :458 / :142. composite:STANDARD (ref 0.40, R2.2). VERBATIM-composite.
   */
  get cohesionTempoPenaltyThresholdBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.cohesion_tempo_penalty_threshold_bucket',
      'RIVAL_AI_COHESION_TEMPO_PENALTY_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.3 Saturation Blindness — keys (rival_ai_mechanics.md:459-463)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.saturation_trained_threshold_bucket` — saturation cut for 'trained' band.
   * Canon :459. composite:STANDARD (ref 0.3, R2.2). VERBATIM-composite.
   */
  get saturationTrainedThresholdBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.saturation_trained_threshold_bucket',
      'RIVAL_AI_SATURATION_TRAINED_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.saturation_suppression_threshold_bucket` — saturation cut for 'suppressed' band.
   * Canon :460. composite:STANDARD (ref 1.4, R2.2). VERBATIM-composite.
   */
  get saturationSuppressionThresholdBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.saturation_suppression_threshold_bucket',
      'RIVAL_AI_SATURATION_SUPPRESSION_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.saturation_passive_decay_rate_per_tick` — passive pressure decay per tick.
   * Canon :461 / :170 / gdd/14. Default 0.05, range 0.02..0.12. VERBATIM canon.
   */
  get saturationPassiveDecayRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.saturation_passive_decay_rate_per_tick',
      'RIVAL_AI_SATURATION_PASSIVE_DECAY_RATE_PER_TICK',
      0.05,
    );
  },

  /**
   * `rival_ai.saturation_suppression_duration_ticks` — duration in 'suppressed' state (ticks).
   * Canon :462. Default 18, range 8..36. VERBATIM canon.
   *
   * NOTE: the timed-suppression phase (counting ticks and auto-releasing from 'suppressed' after
   * this many ticks) is DEFERRED. The C4 model is accumulator + biphasic-threshold + passive-decay
   * ONLY. When B-lot wires the timed-suppression phase, this getter will be consumed by the
   * suppression-phase counter in SaturationBlindnessService. Until then, this getter exists as
   * canon-correct scaffolding — it is intentionally unconsumed (deferred, not a fig-leaf).
   */
  get saturationSuppressionDurationTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.saturation_suppression_duration_ticks',
      'RIVAL_AI_SATURATION_SUPPRESSION_DURATION_TICKS',
      18,
    );
  },

  /**
   * `rival_ai.saturation_recompute_interval_game_hours` — saturation recompute cadence (hours).
   * Canon :463 / :170 / gdd/14. Default 6, range 3..12. VERBATIM canon.
   * Resolved as HOURLY + gameMinute % 360 == 0 guard (DD-CADENCE §6.1).
   *
   * NOTE: the `% 360` guard in RivalTickService.runSaturationTick is LOCKED at 6h by DD-CADENCE
   * (DIV-A1, §6.1 design freeze). This getter's range (3..12) is documented for future calibration
   * but is intentionally NOT wired to the guard — changing the cadence requires a deliberate design
   * decision, not just a tunable override. The getter is NOT a forgotten fig-leaf.
   */
  get saturationRecomputeIntervalGameHours(): number {
    return TunablesStore.resolveInt(
      'rival_ai.saturation_recompute_interval_game_hours',
      'RIVAL_AI_SATURATION_RECOMPUTE_INTERVAL_GAME_HOURS',
      6,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.4 Distributed Hold — keys (rival_ai_mechanics.md:464-467)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.distributed_hold_reroute_window_ticks` — reroute evaluation window (ticks).
   * Canon :464. Default 4, range 2..8. VERBATIM canon.
   */
  get distributedHoldRerouteWindowTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.distributed_hold_reroute_window_ticks',
      'RIVAL_AI_DISTRIBUTED_HOLD_REROUTE_WINDOW_TICKS',
      4,
    );
  },

  /**
   * `rival_ai.distributed_hold_reroute_efficiency_penalty_when_alternative_exists_bucket`
   * Canon :465. composite:STANDARD (ref 0.5, R2.2). VERBATIM-composite.
   */
  get distributedHoldRerouteEfficiencyPenaltyBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.distributed_hold_reroute_efficiency_penalty_when_alternative_exists_bucket',
      'RIVAL_AI_DISTRIBUTED_HOLD_REROUTE_EFFICIENCY_PENALTY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.distributed_hold_route_integrity_retreat_threshold_bucket`
   * Canon :466. composite:STANDARD (ref 0.5, R2.2). VERBATIM-composite.
   */
  get distributedHoldRouteIntegrityRetreatThresholdBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.distributed_hold_route_integrity_retreat_threshold_bucket',
      'RIVAL_AI_DISTRIBUTED_HOLD_ROUTE_INTEGRITY_RETREAT_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.distributed_hold_max_route_graph_size_coil` — max Coil route graph node count.
   * Canon :467. Default 12, range 6..20. VERBATIM canon.
   */
  get distributedHoldMaxRouteGraphSizeCoil(): number {
    return TunablesStore.resolveInt(
      'rival_ai.distributed_hold_max_route_graph_size_coil',
      'RIVAL_AI_DISTRIBUTED_HOLD_MAX_ROUTE_GRAPH_SIZE_COIL',
      12,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.5 Trophic Gap — keys (rival_ai_mechanics.md:468-470)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.trophic_secondary_rival_capacity_bonus_on_gap_bucket`
   * Canon :468. composite:STANDARD (ref +0.25, R2.2). VERBATIM-composite.
   */
  get trophicSecondaryRivalCapacityBonusOnGapBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.trophic_secondary_rival_capacity_bonus_on_gap_bucket',
      'RIVAL_AI_TROPHIC_SECONDARY_RIVAL_CAPACITY_BONUS_ON_GAP_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.trophic_gap_duration_ticks` — trophic gap duration (ticks).
   * Canon :469. Default 12, range 6..30. VERBATIM canon.
   */
  get trophicGapDurationTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.trophic_gap_duration_ticks',
      'RIVAL_AI_TROPHIC_GAP_DURATION_TICKS',
      12,
    );
  },

  /**
   * `rival_ai.trophic_restoration_rate_per_tick` — restoration rate per tick post-gap.
   * Canon :470. Default 0.05, range 0.02..0.15. VERBATIM canon.
   */
  get trophicRestorationRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.trophic_restoration_rate_per_tick',
      'RIVAL_AI_TROPHIC_RESTORATION_RATE_PER_TICK',
      0.05,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.6 Adaptive Skin — keys (rival_ai_mechanics.md:471-475)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.adaptive_skin_iron_throat_adaptation_rate_bucket`
   * Canon :471. composite:HIGH (ref 0.15, R2.2). VERBATIM-composite.
   */
  get adaptiveSkinIronThroatAdaptationRateBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.adaptive_skin_iron_throat_adaptation_rate_bucket',
      'RIVAL_AI_ADAPTIVE_SKIN_IRON_THROAT_ADAPTATION_RATE_BUCKET',
      'composite:HIGH',
    );
  },

  /**
   * `rival_ai.adaptive_skin_coil_adaptation_rate_bucket`
   * Canon :472. composite:STANDARD (ref 0.10, R2.2). VERBATIM-composite.
   */
  get adaptiveSkinCoilAdaptationRateBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.adaptive_skin_coil_adaptation_rate_bucket',
      'RIVAL_AI_ADAPTIVE_SKIN_COIL_ADAPTATION_RATE_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.adaptive_skin_tarcum_adaptation_rate_bucket`
   * Canon :473. composite:LOW (ref 0.05, R2.2). VERBATIM-composite.
   */
  get adaptiveSkinTarcumAdaptationRateBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.adaptive_skin_tarcum_adaptation_rate_bucket',
      'RIVAL_AI_ADAPTIVE_SKIN_TARCUM_ADAPTATION_RATE_BUCKET',
      'composite:LOW',
    );
  },

  /**
   * `rival_ai.adaptive_skin_resistance_decay_when_unused_per_tick` — unused-pattern resistance decay.
   * Canon :474. Default 0.01, range 0.005..0.03. VERBATIM canon.
   */
  get adaptiveSkinResistanceDecayWhenUnusedPerTick(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.adaptive_skin_resistance_decay_when_unused_per_tick',
      'RIVAL_AI_ADAPTIVE_SKIN_RESISTANCE_DECAY_WHEN_UNUSED_PER_TICK',
      0.01,
    );
  },

  /**
   * `rival_ai.adaptive_skin_novelty_effectiveness_multiplier` — novelty effectiveness multiplier.
   * Canon :475. Default 1.5, range 1.2..2.0. VERBATIM canon.
   */
  get adaptiveSkinNoveltyEffectivenessMultiplier(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.adaptive_skin_novelty_effectiveness_multiplier',
      'RIVAL_AI_ADAPTIVE_SKIN_NOVELTY_EFFECTIVENESS_MULTIPLIER',
      1.5,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §3.7 Reconnaissance Regime Classifier — keys (rival_ai_mechanics.md:476-478)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `rival_ai.intel_mode_switch_threshold_per_rival_bucket`
   * Canon :476. composite:STANDARD (ref 0.7, R2.2). VERBATIM-composite.
   */
  get intelModeSwitchThresholdPerRivalBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.intel_mode_switch_threshold_per_rival_bucket',
      'RIVAL_AI_INTEL_MODE_SWITCH_THRESHOLD_PER_RIVAL_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.intel_mode_push_filter_strength_bucket`
   * Canon :477. composite:STANDARD (ref 0.65, R2.2). VERBATIM-composite.
   */
  get intelModePushFilterStrengthBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.intel_mode_push_filter_strength_bucket',
      'RIVAL_AI_INTEL_MODE_PUSH_FILTER_STRENGTH_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.intel_mode_pull_adaptation_speed_multiplier` — PULL mode adaptation speed multiplier.
   * Canon :478. Default 1.3, range 1.0..2.0. VERBATIM canon.
   */
  get intelModePullAdaptationSpeedMultiplier(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.intel_mode_pull_adaptation_speed_multiplier',
      'RIVAL_AI_INTEL_MODE_PULL_ADAPTATION_SPEED_MULTIPLIER',
      1.3,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — canon-silent magnitudes (OQ-A1 / OQ-A2 / OQ-A11)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Each has a gdd/14 row (registry-FIRST, above) with [PROV-Y26Q2] and a range.
  // Magnitudes are provisory calibration targets — sourced via TunablesStore, NEVER inlined.

  // ── OQ-A2 — regime pressure per-source weights ───────────────────────────────────────────────

  /**
   * `rival_ai.regime_pressure_weight_territory` [PROV-Y26Q2] — OQ-A2.
   * Weight for territory-loss pressure input in recomputeRegimePressure.
   * Default 1.0 (equal weight), range 0.0..3.0. Calibration TD.
   */
  get regimePressureWeightTerritory(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_weight_territory',
      'RIVAL_AI_REGIME_PRESSURE_WEIGHT_TERRITORY',
      1.0,
    );
  },

  /**
   * `rival_ai.regime_pressure_weight_casualty` [PROV-Y26Q2] — OQ-A2.
   * Weight for lieutenant-casualty pressure input.
   * Default 1.0 (equal weight), range 0.0..3.0. Calibration TD.
   */
  get regimePressureWeightCasualty(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_weight_casualty',
      'RIVAL_AI_REGIME_PRESSURE_WEIGHT_CASUALTY',
      1.0,
    );
  },

  /**
   * `rival_ai.regime_pressure_weight_revenue` [PROV-Y26Q2] — OQ-A2.
   * Weight for revenue-degradation pressure input.
   * Default 1.0 (equal weight), range 0.0..3.0. Calibration TD.
   */
  get regimePressureWeightRevenue(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_weight_revenue',
      'RIVAL_AI_REGIME_PRESSURE_WEIGHT_REVENUE',
      1.0,
    );
  },

  /**
   * `rival_ai.regime_flip_tiebreak_seeded` [PROV-Y26Q2] — C4 tie-break seeding gate.
   * 1 = use seeded tie-break on borderline flip; 0 = no tie-break (just skip).
   * Default 1 (seeded — no Math.random()). Range 0..1.
   */
  get regimeFlipTiebreakSeeded(): boolean {
    return TunablesStore.resolveBool(
      'rival_ai.regime_flip_tiebreak_seeded',
      'RIVAL_AI_REGIME_FLIP_TIEBREAK_SEEDED',
      true,
    );
  },

  // ── OQ-A1 — Saltline canon-silent defaults ───────────────────────────────────────────────────

  /**
   * `rival_ai.saltline_initial_regime` [PROV-Y26Q2] — OQ-A1.
   * Saltline's initial operational regime (canon-silent). Default 'consolidating'.
   * Used by RivalSeedService when materializing Saltline's baseline row.
   */
  get saltlineInitialRegime(): string {
    return TunablesStore.resolveString(
      'rival_ai.saltline_initial_regime',
      'RIVAL_AI_SALTLINE_INITIAL_REGIME',
      'consolidating',
    );
  },

  /**
   * `rival_ai.saltline_tempo_observe_ticks` [PROV-Y26Q2] — OQ-A1.
   * Saltline observe interval (ticks, canon-silent). Default 3, range 1..8.
   */
  get saltlineTempoObserveTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.saltline_tempo_observe_ticks',
      'RIVAL_AI_SALTLINE_TEMPO_OBSERVE_TICKS',
      3,
    );
  },

  /**
   * `rival_ai.saltline_tempo_orient_ticks` [PROV-Y26Q2] — OQ-A1.
   * Saltline orient latency (ticks, canon-silent). Default 2, range 1..8.
   */
  get saltlineTempoOrientTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.saltline_tempo_orient_ticks',
      'RIVAL_AI_SALTLINE_TEMPO_ORIENT_TICKS',
      2,
    );
  },

  /**
   * `rival_ai.saltline_tempo_commit_ticks` [PROV-Y26Q2] — OQ-A1.
   * Saltline commit delay (ticks, canon-silent). Default 2, range 1..8.
   */
  get saltlineTempoCommitTicks(): number {
    return TunablesStore.resolveInt(
      'rival_ai.saltline_tempo_commit_ticks',
      'RIVAL_AI_SALTLINE_TEMPO_COMMIT_TICKS',
      2,
    );
  },

  /**
   * `rival_ai.saltline_adaptation_rate_bucket` [PROV-Y26Q2] — OQ-A1.
   * Saltline adaptation rate (composite:STANDARD, ref 0.10 not exposed — R2.2).
   * Canon-silent; mirrors the STANDARD tier used by Coil. VERBATIM-composite.
   */
  get saltlineAdaptationRateBucket(): string {
    return TunablesStore.resolveString(
      'rival_ai.saltline_adaptation_rate_bucket',
      'RIVAL_AI_SALTLINE_ADAPTATION_RATE_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `rival_ai.saltline_intel_mode` [PROV-Y26Q2] — OQ-A1.
   * Saltline initial intel mode (canon-silent). Default 'push'. Enum: pull | push.
   */
  get saltlineIntelMode(): string {
    return TunablesStore.resolveString(
      'rival_ai.saltline_intel_mode',
      'RIVAL_AI_SALTLINE_INTEL_MODE',
      'push',
    );
  },

  // ── OQ-A11 — RegimePressureBucket band cuts ──────────────────────────────────────────────────

  /**
   * `rival_ai.regime_band_silent_max` [PROV-Y26Q2] — OQ-A11.
   * Upper cut for 'silent' band on the 0-100 regime_pressure float.
   * Default 33, range 0..100. Used by RivalProjectionService. Calibration TD.
   */
  get regimeBandSilentMax(): number {
    return TunablesStore.resolveInt(
      'rival_ai.regime_band_silent_max',
      'RIVAL_AI_REGIME_BAND_SILENT_MAX',
      33,
    );
  },

  /**
   * `rival_ai.regime_band_mounting_max` [PROV-Y26Q2] — OQ-A11.
   * Upper cut for 'mounting' band on the 0-100 float (above = 'crushing').
   * Default 66, range 0..100. Used by RivalProjectionService. Calibration TD.
   */
  get regimeBandMountingMax(): number {
    return TunablesStore.resolveInt(
      'rival_ai.regime_band_mounting_max',
      'RIVAL_AI_REGIME_BAND_MOUNTING_MAX',
      66,
    );
  },

  // ── OQ-A12 — regime pressure INPUT magnitude deltas (DD-REGIME-PRESSURE-MAGNITUDE) ─────────────
  // These are the DELTA step driven into the pressure accrual by a single hostile action of the
  // given magnitude. Distinct from the OUTPUT band cuts (OQ-A11) above. NEVER cross-wire these.

  /**
   * `rival_ai.regime_pressure_magnitude_delta_silent` [PROV-Y26Q2] — OQ-A12 (DD-REGIME-PRESSURE-MAGNITUDE).
   * Pressure DELTA added per silent-magnitude source action (step into the 0-100 accrual domain).
   * Default 5 (small — 3 sources × weight 1.0 = 15, well below threshold 70). Range 0..100.
   */
  get regimePressureMagnitudeDeltaSilent(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_magnitude_delta_silent',
      'RIVAL_AI_REGIME_PRESSURE_MAGNITUDE_DELTA_SILENT',
      5,
    );
  },

  /**
   * `rival_ai.regime_pressure_magnitude_delta_mounting` [PROV-Y26Q2] — OQ-A12.
   * Pressure DELTA added per mounting-magnitude source action.
   * Default 20 (medium — 3 sources × weight 1.0 = 60, approaches threshold 70). Range 0..100.
   */
  get regimePressureMagnitudeDeltaMounting(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_magnitude_delta_mounting',
      'RIVAL_AI_REGIME_PRESSURE_MAGNITUDE_DELTA_MOUNTING',
      20,
    );
  },

  /**
   * `rival_ai.regime_pressure_magnitude_delta_crushing` [PROV-Y26Q2] — OQ-A12.
   * Pressure DELTA added per crushing-magnitude source action.
   * Default 40 (large — 3 sources × weight 1.0 = 120 > threshold 70 → flip). Range 0..100.
   */
  get regimePressureMagnitudeDeltaCrushing(): number {
    return TunablesStore.resolveFloat(
      'rival_ai.regime_pressure_magnitude_delta_crushing',
      'RIVAL_AI_REGIME_PRESSURE_MAGNITUDE_DELTA_CRUSHING',
      40,
    );
  },
};

/** Named alias used in NestJS DI (C2). */
export class RivalAiTunables {
  // Expose all getters as instance methods so NestJS can inject the class.
  // The underlying implementation delegates to the module-level object above.

  get regimeRecomputeIntervalGameHours() { return rivalAiTunables.regimeRecomputeIntervalGameHours; }
  get regimePressureThresholdPerRivalBucket() { return rivalAiTunables.regimePressureThresholdPerRivalBucket; }
  get regimePressureDecayRatePeacefulPerDay() { return rivalAiTunables.regimePressureDecayRatePeacefulPerDay; }
  get regimesCountPerRival() { return rivalAiTunables.regimesCountPerRival; }
  get coilObserveIntervalTicks() { return rivalAiTunables.coilObserveIntervalTicks; }
  get tarcumCommitDelayTicks() { return rivalAiTunables.tarcumCommitDelayTicks; }
  get ironThroatObserveIntervalTicks() { return rivalAiTunables.ironThroatObserveIntervalTicks; }
  get cohesionTempoPenaltyThresholdBucket() { return rivalAiTunables.cohesionTempoPenaltyThresholdBucket; }
  get saturationTrainedThresholdBucket() { return rivalAiTunables.saturationTrainedThresholdBucket; }
  get saturationSuppressionThresholdBucket() { return rivalAiTunables.saturationSuppressionThresholdBucket; }
  get saturationPassiveDecayRatePerTick() { return rivalAiTunables.saturationPassiveDecayRatePerTick; }
  get saturationSuppressionDurationTicks() { return rivalAiTunables.saturationSuppressionDurationTicks; }
  get saturationRecomputeIntervalGameHours() { return rivalAiTunables.saturationRecomputeIntervalGameHours; }
  get distributedHoldRerouteWindowTicks() { return rivalAiTunables.distributedHoldRerouteWindowTicks; }
  get distributedHoldRerouteEfficiencyPenaltyBucket() { return rivalAiTunables.distributedHoldRerouteEfficiencyPenaltyBucket; }
  get distributedHoldRouteIntegrityRetreatThresholdBucket() { return rivalAiTunables.distributedHoldRouteIntegrityRetreatThresholdBucket; }
  get distributedHoldMaxRouteGraphSizeCoil() { return rivalAiTunables.distributedHoldMaxRouteGraphSizeCoil; }
  get trophicSecondaryRivalCapacityBonusOnGapBucket() { return rivalAiTunables.trophicSecondaryRivalCapacityBonusOnGapBucket; }
  get trophicGapDurationTicks() { return rivalAiTunables.trophicGapDurationTicks; }
  get trophicRestorationRatePerTick() { return rivalAiTunables.trophicRestorationRatePerTick; }
  get adaptiveSkinIronThroatAdaptationRateBucket() { return rivalAiTunables.adaptiveSkinIronThroatAdaptationRateBucket; }
  get adaptiveSkinCoilAdaptationRateBucket() { return rivalAiTunables.adaptiveSkinCoilAdaptationRateBucket; }
  get adaptiveSkinTarcumAdaptationRateBucket() { return rivalAiTunables.adaptiveSkinTarcumAdaptationRateBucket; }
  get adaptiveSkinResistanceDecayWhenUnusedPerTick() { return rivalAiTunables.adaptiveSkinResistanceDecayWhenUnusedPerTick; }
  get adaptiveSkinNoveltyEffectivenessMultiplier() { return rivalAiTunables.adaptiveSkinNoveltyEffectivenessMultiplier; }
  get intelModeSwitchThresholdPerRivalBucket() { return rivalAiTunables.intelModeSwitchThresholdPerRivalBucket; }
  get intelModePushFilterStrengthBucket() { return rivalAiTunables.intelModePushFilterStrengthBucket; }
  get intelModePullAdaptationSpeedMultiplier() { return rivalAiTunables.intelModePullAdaptationSpeedMultiplier; }
  // NEW [PROV-Y26Q2] keys
  get regimePressureWeightTerritory() { return rivalAiTunables.regimePressureWeightTerritory; }
  get regimePressureWeightCasualty() { return rivalAiTunables.regimePressureWeightCasualty; }
  get regimePressureWeightRevenue() { return rivalAiTunables.regimePressureWeightRevenue; }
  get regimeFlipTiebreakSeeded() { return rivalAiTunables.regimeFlipTiebreakSeeded; }
  get saltlineInitialRegime() { return rivalAiTunables.saltlineInitialRegime; }
  get saltlineTempoObserveTicks() { return rivalAiTunables.saltlineTempoObserveTicks; }
  get saltlineTempoOrientTicks() { return rivalAiTunables.saltlineTempoOrientTicks; }
  get saltlineTempoCommitTicks() { return rivalAiTunables.saltlineTempoCommitTicks; }
  get saltlineAdaptationRateBucket() { return rivalAiTunables.saltlineAdaptationRateBucket; }
  get saltlineIntelMode() { return rivalAiTunables.saltlineIntelMode; }
  get regimeBandSilentMax() { return rivalAiTunables.regimeBandSilentMax; }
  get regimeBandMountingMax() { return rivalAiTunables.regimeBandMountingMax; }
  // OQ-A12 magnitude deltas (DD-REGIME-PRESSURE-MAGNITUDE)
  get regimePressureMagnitudeDeltaSilent() { return rivalAiTunables.regimePressureMagnitudeDeltaSilent; }
  get regimePressureMagnitudeDeltaMounting() { return rivalAiTunables.regimePressureMagnitudeDeltaMounting; }
  get regimePressureMagnitudeDeltaCrushing() { return rivalAiTunables.regimePressureMagnitudeDeltaCrushing; }
}

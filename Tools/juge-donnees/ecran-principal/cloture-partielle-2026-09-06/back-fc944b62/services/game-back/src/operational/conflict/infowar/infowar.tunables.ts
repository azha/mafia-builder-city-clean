// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 2 (C2)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §10
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md (13 keys :69-143)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md
//                       §Combat / conflict layer — diplomacy (info_warfare.* rows, C2 04b-C 2026-06-26)
//             — Diplomacy & Information Warfare C C2 — 2026-06-26 —
//
// `infowar.tunables.ts` — Registry-mirrored getters for all `info_warfare.*` keys.
//
// R2.3 (NO inline numeric value for any info_warfare.* key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults cited
// here are verbatim from gdd/14 §Combat / conflict layer — diplomacy (info_warfare.* section).
// If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter.
// The 13 canon keys (information_warfare_mechanics.md:69-143) are REUSED at verbatim defaults.
// The 2 NEW [PROV-Y26Q2] keys are canon-silent seed prefixes (OQ-C2 — observation + purge draws).
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
//
// Pattern: mirrors services/game-back/src/operational/conflict/rival/rival-ai.tunables.ts exactly.

import { TunablesStore } from '../../../config/tunables-store';

// ── Range constants for numeric keys (used by INFOWAR_TUNABLE_CAPS) ─────────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by INFOWAR_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `INFOWAR_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-clamp` route and by C4+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 *
 * NOTE: composite keys have no numeric range (they are named buckets, not raw floats).
 *       Only numeric scalar keys appear here.
 */
export const INFOWAR_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── §8.1 Dead Reckoning (information_warfare_mechanics.md:69, 71) ─────────────────────────────
  'info_warfare.dead_reckoning_monitoring_rate_per_assigned_lieutenant_per_tick': { min: 0.01, max: 0.12 },
  'info_warfare.dead_reckoning_belief_state_decay_rate_per_tick': { min: 0.005, max: 0.08 },

  // ── §8.2 Dual-Use Signal (information_warfare_mechanics.md:93, 94) ───────────────────────────
  'info_warfare.dual_use_interpretation_lag_ticks': { min: 1, max: 4 },
  'info_warfare.dual_use_attack_bias_decay_per_clean_tick': { min: 0.01, max: 0.08 },
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-clamp route + C4+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 */
export function clampInfowarToRange(key: string, value: number): number {
  const range = INFOWAR_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `info_warfare.*` keys consumed by C4+ mechanics. */
export const infoWarTunables = {

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §8.1 Dead Reckoning — canon keys (information_warfare_mechanics.md:69-71)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `info_warfare.dead_reckoning_monitoring_rate_per_assigned_lieutenant_per_tick` — scalar (float).
   * Canon :69. Default 0.04, range 0.01..0.12. Taux monitoring/tick par lieutenant assigné.
   * VERBATIM canon. used_by: DeadReckoningService.
   */
  get deadReckoningMonitoringRatePerAssignedLieutenantPerTick(): number {
    return TunablesStore.resolveFloat(
      'info_warfare.dead_reckoning_monitoring_rate_per_assigned_lieutenant_per_tick',
      'INFO_WARFARE_DEAD_RECKONING_MONITORING_RATE_PER_ASSIGNED_LIEUTENANT_PER_TICK',
      0.04,
    );
  },

  /**
   * `info_warfare.dead_reckoning_coil_deception_corruption_magnitude_bucket` — composite (R2.2).
   * Canon :70. Default composite:HIGH (ref 0.6). Magnitude corruption Coil deception.
   * VERBATIM-composite. used_by: DeadReckoningService.
   */
  get deadReckoningCoilDeceptionCorruptionMagnitudeBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.dead_reckoning_coil_deception_corruption_magnitude_bucket',
      'INFO_WARFARE_DEAD_RECKONING_COIL_DECEPTION_CORRUPTION_MAGNITUDE_BUCKET',
      'composite:HIGH',
    );
  },

  /**
   * `info_warfare.dead_reckoning_belief_state_decay_rate_per_tick` — scalar (float).
   * Canon :71. Default 0.02, range 0.005..0.08. Taux décroissance belief_state/tick (P5 noise).
   * VERBATIM canon. used_by: DeadReckoningService.
   */
  get deadReckoningBeliefStateDecayRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'info_warfare.dead_reckoning_belief_state_decay_rate_per_tick',
      'INFO_WARFARE_DEAD_RECKONING_BELIEF_STATE_DECAY_RATE_PER_TICK',
      0.02,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §8.2 Dual-Use Signal — canon keys (information_warfare_mechanics.md:92-94)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `info_warfare.dual_use_familiarity_interpretation_weight_bucket` — composite (R2.2).
   * Canon :92. Default composite:STANDARD (ref 0.45). Poids familiarité interprétation Bayésienne.
   * VERBATIM-composite. used_by: DualUseSignalService.
   */
  get dualUseFamiliarityInterpretationWeightBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.dual_use_familiarity_interpretation_weight_bucket',
      'INFO_WARFARE_DUAL_USE_FAMILIARITY_INTERPRETATION_WEIGHT_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `info_warfare.dual_use_interpretation_lag_ticks` — scalar (integer).
   * Canon :93. Default 2, range 1..4. Lag interprétation rival (ticks).
   * VERBATIM canon. used_by: DualUseSignalService.
   */
  get dualUseInterpretationLagTicks(): number {
    return TunablesStore.resolveInt(
      'info_warfare.dual_use_interpretation_lag_ticks',
      'INFO_WARFARE_DUAL_USE_INTERPRETATION_LAG_TICKS',
      2,
    );
  },

  /**
   * `info_warfare.dual_use_attack_bias_decay_per_clean_tick` — scalar (float).
   * Canon :94. Default 0.04, range 0.01..0.08. Décroissance biais attaque/tick sans signal combat.
   * VERBATIM canon. used_by: DualUseSignalService.
   */
  get dualUseAttackBiasDecayPerCleanTick(): number {
    return TunablesStore.resolveFloat(
      'info_warfare.dual_use_attack_bias_decay_per_clean_tick',
      'INFO_WARFARE_DUAL_USE_ATTACK_BIAS_DECAY_PER_CLEAN_TICK',
      0.04,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §8.3 Observation-Disturbance Cost — canon keys (information_warfare_mechanics.md:117-119)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `info_warfare.observation_detection_probability_per_tick_bucket` — composite (R2.2).
   * Canon :117. Default composite:STANDARD (ref 0.05). Probabilité détection/tick surveillance active.
   * Seeded draw (OQ-C2) — the seed prefix is sourced via observationDetectionSeedPrefix.
   * VERBATIM-composite. used_by: ObservationDisturbanceService.
   */
  get observationDetectionProbabilityPerTickBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.observation_detection_probability_per_tick_bucket',
      'INFO_WARFARE_OBSERVATION_DETECTION_PROBABILITY_PER_TICK_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `info_warfare.observation_data_corruption_on_detection_bucket` — composite (R2.2).
   * Canon :118. Default composite:HIGH (ref 0.7). Corruption données sur détection.
   * VERBATIM-composite. used_by: ObservationDisturbanceService.
   */
  get observationDataCorruptionOnDetectionBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.observation_data_corruption_on_detection_bucket',
      'INFO_WARFARE_OBSERVATION_DATA_CORRUPTION_ON_DETECTION_BUCKET',
      'composite:HIGH',
    );
  },

  /**
   * `info_warfare.observation_pulsed_detection_reduction_vs_sustained_bucket` — composite (R2.2).
   * Canon :119. Default composite:STANDARD (ref 0.4). Réduction détection pulsé vs soutenu.
   * VERBATIM-composite. used_by: ObservationDisturbanceService.
   */
  get observationPulsedDetectionReductionVsSustainedBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.observation_pulsed_detection_reduction_vs_sustained_bucket',
      'INFO_WARFARE_OBSERVATION_PULSED_DETECTION_REDUCTION_VS_SUSTAINED_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §8.4 Purge Trap — canon keys (information_warfare_mechanics.md:140-143)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `info_warfare.purge_suspicion_increase_per_signal_bucket` — composite (R2.2).
   * Canon :140. Default composite:STANDARD (ref +0.15). Augmentation suspicion/signal.
   * VERBATIM-composite. used_by: PurgeTrapService.
   */
  get purgeSuspicionIncreasePerSignalBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.purge_suspicion_increase_per_signal_bucket',
      'INFO_WARFARE_PURGE_SUSPICION_INCREASE_PER_SIGNAL_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `info_warfare.purge_threshold_bucket` — composite (R2.2).
   * Canon :141. Default composite:STANDARD (ref 0.55). Seuil déclenchement purge.
   * VERBATIM-composite. used_by: PurgeTrapService.
   */
  get purgeThresholdBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.purge_threshold_bucket',
      'INFO_WARFARE_PURGE_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `info_warfare.purge_capacity_drain_per_tick_bucket` — composite (R2.2).
   * Canon :142. Default composite:STANDARD (ref -0.04). Drainage capacité rival/tick en purge active.
   * VERBATIM-composite. used_by: PurgeTrapService.
   */
  get purgeCapacityDrainPerTickBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.purge_capacity_drain_per_tick_bucket',
      'INFO_WARFARE_PURGE_CAPACITY_DRAIN_PER_TICK_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `info_warfare.purge_bluff_detection_probability_per_tick_bucket` — composite (R2.2).
   * Canon :143. Default composite:STANDARD (ref 0.10). Probabilité détection bluff/tick.
   * Seeded draw (OQ-C2) — the seed prefix is sourced via purgeBluffDiscoverySeedPrefix.
   * VERBATIM-composite. used_by: PurgeTrapService.
   */
  get purgeBluffDetectionProbabilityPerTickBucket(): string {
    return TunablesStore.resolveString(
      'info_warfare.purge_bluff_detection_probability_per_tick_bucket',
      'INFO_WARFARE_PURGE_BLUFF_DETECTION_PROBABILITY_PER_TICK_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — OQ-C2 seeded-draw seed prefixes (observation + purge)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Canon-silent magnitudes — sourced via TunablesStore, NEVER inlined.
  // Used as: makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`)

  /**
   * `info_warfare.observation_detection_seed_prefix` [PROV-Y26Q2] — OQ-C2.
   * Seed prefix for Observation-Disturbance detection draw.
   * Default 'obs_detect'. No Math.random(). Calibration TD.
   */
  get observationDetectionSeedPrefix(): string {
    return TunablesStore.resolveString(
      'info_warfare.observation_detection_seed_prefix',
      'INFO_WARFARE_OBSERVATION_DETECTION_SEED_PREFIX',
      'obs_detect',
    );
  },

  /**
   * `info_warfare.purge_bluff_discovery_seed_prefix` [PROV-Y26Q2] — OQ-C2.
   * Seed prefix for Purge-Trap bluff-discovery draw.
   * Default 'purge_bluff'. No Math.random(). Calibration TD.
   */
  get purgeBluffDiscoverySeedPrefix(): string {
    return TunablesStore.resolveString(
      'info_warfare.purge_bluff_discovery_seed_prefix',
      'INFO_WARFARE_PURGE_BLUFF_DISCOVERY_SEED_PREFIX',
      'purge_bluff',
    );
  },

};

/** Named alias used in NestJS DI (C2). */
export class InfoWarTunables {
  // Expose all getters as instance methods so NestJS can inject the class.
  // The underlying implementation delegates to the module-level object above.

  // §8.1 Dead Reckoning
  get deadReckoningMonitoringRatePerAssignedLieutenantPerTick() { return infoWarTunables.deadReckoningMonitoringRatePerAssignedLieutenantPerTick; }
  get deadReckoningCoilDeceptionCorruptionMagnitudeBucket() { return infoWarTunables.deadReckoningCoilDeceptionCorruptionMagnitudeBucket; }
  get deadReckoningBeliefStateDecayRatePerTick() { return infoWarTunables.deadReckoningBeliefStateDecayRatePerTick; }
  // §8.2 Dual-Use Signal
  get dualUseFamiliarityInterpretationWeightBucket() { return infoWarTunables.dualUseFamiliarityInterpretationWeightBucket; }
  get dualUseInterpretationLagTicks() { return infoWarTunables.dualUseInterpretationLagTicks; }
  get dualUseAttackBiasDecayPerCleanTick() { return infoWarTunables.dualUseAttackBiasDecayPerCleanTick; }
  // §8.3 Observation-Disturbance Cost
  get observationDetectionProbabilityPerTickBucket() { return infoWarTunables.observationDetectionProbabilityPerTickBucket; }
  get observationDataCorruptionOnDetectionBucket() { return infoWarTunables.observationDataCorruptionOnDetectionBucket; }
  get observationPulsedDetectionReductionVsSustainedBucket() { return infoWarTunables.observationPulsedDetectionReductionVsSustainedBucket; }
  // §8.4 Purge Trap
  get purgeSuspicionIncreasePerSignalBucket() { return infoWarTunables.purgeSuspicionIncreasePerSignalBucket; }
  get purgeThresholdBucket() { return infoWarTunables.purgeThresholdBucket; }
  get purgeCapacityDrainPerTickBucket() { return infoWarTunables.purgeCapacityDrainPerTickBucket; }
  get purgeBluffDetectionProbabilityPerTickBucket() { return infoWarTunables.purgeBluffDetectionProbabilityPerTickBucket; }
  // NEW [PROV-Y26Q2] OQ-C2 seeds
  get observationDetectionSeedPrefix() { return infoWarTunables.observationDetectionSeedPrefix; }
  get purgeBluffDiscoverySeedPrefix() { return infoWarTunables.purgeBluffDiscoverySeedPrefix; }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 2 (C2)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §10
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md:402-433 §Tunables
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md:182-202 §Tunables
//             Canon: docs/tech/04b_combat_and_conflict/de_escalation_mechanics.md:122-134 §Tunables
//             Canon: docs/tech/04b_combat_and_conflict/retaliation_mechanics.md:112-123 §Tunables
//             Canon: docs/tech/04b_combat_and_conflict/mechanics_interlock.md:163-171 §Tunables
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Combat / conflict layer — combat-B
//             — Combat & Escalation B C2 — 2026-06-25 —
//
// `combat-tunables.ts` — Registry-mirrored getters for all combat/escalation/de_escalation/
// retaliation/interlock tunable keys.
//
// R2.3 (NO inline numeric value for any key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults
// cited here are verbatim from gdd/14 §Combat / conflict layer — combat-B — the single
// source of truth. If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter.
// The ~57 canon keys (combat_mechanics.md + escalation_mechanics.md + de_escalation_mechanics.md
// + retaliation_mechanics.md + mechanics_interlock.md §Tunables) are REUSED at verbatim defaults.
// The NEW [PROV-Y26Q2] keys are canon-silent magnitudes (OQ-B1/B4 + OQ-A1), provisory.
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
// getDivergenceOutcome: a pure registry lookup (NOT RNG, NOT a code-baked switch of magic outcomes).
// The divergence-table cells are sourced via TunablesStore — NOT hardcoded outcomes.
//
// Pattern: mirrors services/game-back/src/operational/conflict/rival/rival-ai.tunables.ts exactly.

import { TunablesStore } from '../../../config/tunables-store';

// ── CombatOutcomeBucket — the outcome type for getDivergenceOutcome ───────────────────────────────
// Valid outcome values for the DD-DIVERGENCE-TABLE.
// The SHAPE is frozen; cells are [PROV-Y26Q2] (calibration TD).
//
// W6.1 C6/B-1 (design §4 C4 dependency + §6 B-1): tuple `as const` SOURCE + derived type + a
// `ReadonlySet<string>` (not `<CombatOutcomeBucket>`) + a type predicate — the house
// `(typeof tupleVar)[number]` idiom (`player_progression_state.ts:31-33` names it) applied to a
// plain tuple instead of a pgEnum. A 6th member can no longer exist in the type without also
// existing in the Set (both derive from ONE array), and `getDivergenceOutcome` below narrows a
// registry-sourced `string` to this type via `isCombatOutcomeBucket` — never an `as` cast (the
// previous form required TWO `as` here; a `ReadonlySet<CombatOutcomeBucket>.has()` cannot accept a
// raw `string` argument without one).

/** The 5 divergence-table outcome values — the SINGLE source the type, the domain Set, and every
 *  E2E spec in this lot import (never a locally recopied list, never the Set — design §6 B-1). */
export const COMBAT_OUTCOME_BUCKETS = [
  'retreat',
  'hold',
  'contested',
  'advance',
  'breakthrough',
] as const;

export type CombatOutcomeBucket = (typeof COMBAT_OUTCOME_BUCKETS)[number];

/**
 * Valid CombatOutcomeBucket values — used to validate registry-sourced cell values.
 * `ReadonlySet<string>` (widened, NOT `<CombatOutcomeBucket>`): `.has()` must accept a raw `string`
 * (a registry read, a DB column) with NO cast. The domain check this widening drops (a hypothetical
 * `VALID_COMBAT_OUTCOME_BUCKETS.has(x)` call on an already-typed `CombatOutcomeBucket` would no
 * longer error on a wrong literal) is unused today — this Set's only call site already reads a raw
 * `string` and casts (below); `isCombatOutcomeBucket` is the public narrowing API (design §6 B-1/F-2).
 */
export const VALID_COMBAT_OUTCOME_BUCKETS: ReadonlySet<string> = new Set(COMBAT_OUTCOME_BUCKETS);

/**
 * `isCombatOutcomeBucket` — the ONLY way to narrow a `string` (registry read, DB column) to
 * `CombatOutcomeBucket`. Replaces the `as CombatOutcomeBucket` cast this design closes (§6 B-1):
 * the predicate's `v is CombatOutcomeBucket` signature makes the compiler do the narrowing, so
 * there is no conversion left to write with `as`.
 */
export function isCombatOutcomeBucket(v: string): v is CombatOutcomeBucket {
  return VALID_COMBAT_OUTCOME_BUCKETS.has(v);
}

// ── Range constants for each key (used by COMBAT_TUNABLE_CAPS) ───────────────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by COMBAT_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `COMBAT_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-combat-clamp` route and by C4+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 * Composite-bucket keys have no numeric cap (excluded from this map).
 */
export const COMBAT_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── §2.1 Percolation Break — combat.percolation_* ────────────────────────────────────────────
  // combat.percolation_threshold_bucket: composite — no numeric cap
  'combat.percolation_node_rebuild_rate_per_tick':         { min: 0, max: 5 },
  'combat.percolation_assault_node_removal_per_hit':       { min: 2, max: 8 },
  'combat.percolation_economic_attrition_efficiency_pct':  { min: 20, max: 70 },
  'combat.percolation_recompute_interval_game_hours':      { min: 3, max: 12 },

  // ── §2.2 Friction Budget — combat.friction_* ─────────────────────────────────────────────────
  'combat.friction_base_per_action_unit':        { min: 0.05, max: 0.25 },
  'combat.friction_complexity_multiplier':       { min: 1.2, max: 2.0 },
  // combat.friction_to_failure_breakpoint_bucket: composite — no numeric cap
  'combat.friction_tenure_reduction_per_tier':   { min: 0.05, max: 0.30 },
  // [PROV-Y26Q2] C4: per-action friction cost caps
  'combat.assault_friction_cost':                { min: 0.05, max: 0.40 },
  'combat.hold_friction_cost':                   { min: 0.02, max: 0.25 },
  'combat.degrade_register_friction_cost':       { min: 0.04, max: 0.35 },

  // ── §2.3 Ephemeral Architecture — combat.ephemeral_* ─────────────────────────────────────────
  'combat.ephemeral_state_persistence_window_ticks':               { min: 1, max: 10 },
  'combat.ephemeral_lieutenant_recall_loss_at_window_close_pct':   { min: 70, max: 100 },
  // combat.ephemeral_audit_trail_disabled_during_ephemeral: boolean — no numeric cap
  'combat.ephemeral_operation_setup_cost_multiplier':              { min: 1.1, max: 2.0 },

  // ── §2.4 Erosion Register — combat.erosion_* ─────────────────────────────────────────────────
  // combat.erosion_registers_count: stable design constant (4..7) — included for completeness
  'combat.erosion_registers_count':                              { min: 4, max: 7 },
  'combat.erosion_dominance_register_threat_weight':             { min: 0.30, max: 0.60 },
  // combat.erosion_vulnerable_axis_regime_shift_threshold_bucket: composite
  // combat.erosion_register_independent_degradation: boolean

  // ── §2.5 Oxbow Severance — combat.oxbow_* ────────────────────────────────────────────────────
  // combat.oxbow_severance_threshold_bucket: composite
  'combat.oxbow_hold_duration_ticks':                       { min: 2, max: 8 },
  'combat.oxbow_orphan_decay_ticks_to_zero_capacity':       { min: 4, max: 20 },
  'combat.oxbow_reintegration_cost_pct_of_zone_value':      { min: 30, max: 100 },

  // ── §2.6 Cumulative Attrition — combat.cpi_* ─────────────────────────────────────────────────
  // combat.cpi_crossing_threshold_bucket: composite
  'combat.cpi_resource_pressure_drain_above_threshold_per_tick': { min: 0.05, max: 0.25 },
  'combat.cpi_decay_rate_per_tick':                              { min: 0.02, max: 0.15 },
  // combat.cpi_resistance_floor_bucket: composite
  'combat.cpi_k_rolling_window_ticks':                           { min: 6, max: 24 },

  // ── §5 Escalation — escalation.* ─────────────────────────────────────────────────────────────
  // escalation.sandpile_cascade_threshold_bucket: composite
  // escalation.sandpile_cascade_sensitivity_bucket: composite
  // escalation.sandpile_cascade_propagation_probability_bucket: composite
  'escalation.sandpile_global_decay_rate_per_idle_tick':                    { min: 0.005, max: 0.04 },
  'escalation.maladaptive_depth_per_conflict':                              { min: 1, max: 2 },
  'escalation.maladaptive_tension_increment_penalty_per_depth_pct':         { min: 5, max: 20 },
  // escalation.maladaptive_hostile_memory_floor_bucket: composite
  // escalation.maladaptive_depth_decay_per_quiet_ticks: composite
  // escalation.resonance_threshold_bucket: composite
  // escalation.resonance_amplification_per_resonant_cycle_bucket: composite
  'escalation.resonance_desynchronization_decay_rate_per_tick':             { min: 0.05, max: 0.20 },
  // escalation.oscillation_extraction_threshold_for_collapse_bucket: composite
  'escalation.oscillation_yield_recovery_rate_per_tick':                    { min: 0.02, max: 0.15 },
  // escalation.oscillation_re_invasion_threshold_bucket: composite
  'escalation.oscillation_cycle_period_estimate_ticks':                     { min: 4, max: 24 },

  // ── §6 De-escalation — de_escalation.* ──────────────────────────────────────────────────────
  'de_escalation.familiarity_accrual_rate_per_tick':   { min: 0.01, max: 0.05 },
  // de_escalation.familiarity_threshold_for_discount_bucket: composite
  // de_escalation.familiarity_intrusion_reduction_at_max_bucket: composite
  // de_escalation.familiarity_vacuum_fill_volatility_multiplier_bucket: composite
  // de_escalation.downstream_regime_transition_threshold_bucket: composite
  // de_escalation.downstream_standing_mode_aggression_suppression_bucket: composite
  'de_escalation.downstream_clear_decay_per_tick':     { min: 0.02, max: 0.10 },

  // ── §7 Retaliation — retaliation.* ───────────────────────────────────────────────────────────
  // retaliation.dead_hand_trigger_threshold_tarcum_bucket: composite
  // retaliation.dead_hand_trigger_threshold_coil_bucket: composite
  // retaliation.dead_hand_trigger_threshold_iron_throat_bucket: composite
  // retaliation.dead_hand_reserve_fraction_bucket: composite
  'retaliation.dead_hand_cache_refresh_ticks': { min: 4, max: 16 },
  // retaliation.intelligence_cache_detection_probability_per_intel_action_bucket: composite

  // ── §9 Interlock — interlock.* ───────────────────────────────────────────────────────────────
  // interlock.pattern_intel_leakage_on_elimination_bucket: composite
  'interlock.cascade_atomic_transaction_timeout_ms': { min: 1000, max: 30000 },
  // interlock.elimination_compounding_penalty_aggregate_bucket: composite
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-combat-clamp route + C4+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 * C4: no Math.random(), no Date.now().
 */
export function clampCombatToRange(key: string, value: number): number {
  const range = COMBAT_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

// ── Module-level getter object ────────────────────────────────────────────────────────────────────

/** Registry-mirrored getters for all combat/escalation/de_escalation/retaliation/interlock keys. */
export const combatTunables = {

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.1 Percolation Break — combat.percolation_* (combat_mechanics.md:406-412)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.percolation_threshold_bucket` — fragmentation cliff.
   * Canon :408 / gdd/14. composite:STANDARD (ref 0.52, R2.2). VERBATIM-composite.
   */
  get percolationThresholdBucket(): string {
    return TunablesStore.resolveString(
      'combat.percolation_threshold_bucket',
      'COMBAT_PERCOLATION_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.percolation_node_rebuild_rate_per_tick` — node rebuild rate per tick.
   * Canon :409 / gdd/14. Default 2, range 0..5. VERBATIM canon.
   */
  get percolationNodeRebuildRatePerTick(): number {
    return TunablesStore.resolveInt(
      'combat.percolation_node_rebuild_rate_per_tick',
      'COMBAT_PERCOLATION_NODE_REBUILD_RATE_PER_TICK',
      2,
    );
  },

  /**
   * `combat.percolation_assault_node_removal_per_hit` — nodes removed per assault hit.
   * Canon :410 / gdd/14. Default 4, range 2..8. VERBATIM canon.
   */
  get percolationAssaultNodeRemovalPerHit(): number {
    return TunablesStore.resolveInt(
      'combat.percolation_assault_node_removal_per_hit',
      'COMBAT_PERCOLATION_ASSAULT_NODE_REMOVAL_PER_HIT',
      4,
    );
  },

  /**
   * `combat.percolation_economic_attrition_efficiency_pct` — pacifist counterpart efficiency.
   * Canon :411 / gdd/14. Default 40, range 20..70. VERBATIM canon.
   */
  get percolationEconomicAttritionEfficiencyPct(): number {
    return TunablesStore.resolveInt(
      'combat.percolation_economic_attrition_efficiency_pct',
      'COMBAT_PERCOLATION_ECONOMIC_ATTRITION_EFFICIENCY_PCT',
      40,
    );
  },

  /**
   * `combat.percolation_recompute_interval_game_hours` — recompute cadence (hours).
   * Canon :412 / gdd/14. Default 6, range 3..12. VERBATIM canon.
   */
  get percolationRecomputeIntervalGameHours(): number {
    return TunablesStore.resolveInt(
      'combat.percolation_recompute_interval_game_hours',
      'COMBAT_PERCOLATION_RECOMPUTE_INTERVAL_GAME_HOURS',
      6,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.2 Friction Budget — combat.friction_* (combat_mechanics.md:413-416)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.friction_base_per_action_unit` — base friction per action unit.
   * Canon :413 / gdd/14. Default 0.10, range 0.05..0.25. VERBATIM canon.
   */
  get frictionBasePerActionUnit(): number {
    return TunablesStore.resolveFloat(
      'combat.friction_base_per_action_unit',
      'COMBAT_FRICTION_BASE_PER_ACTION_UNIT',
      0.10,
    );
  },

  /**
   * `combat.friction_complexity_multiplier` — complexity multiplier for friction.
   * Canon :414 / gdd/14. Default 1.5, range 1.2..2.0. VERBATIM canon.
   */
  get frictionComplexityMultiplier(): number {
    return TunablesStore.resolveFloat(
      'combat.friction_complexity_multiplier',
      'COMBAT_FRICTION_COMPLEXITY_MULTIPLIER',
      1.5,
    );
  },

  /**
   * `combat.friction_to_failure_breakpoint_bucket` — friction breakpoint (divergence-table input).
   * Canon :415 / gdd/14. composite:STANDARD (ref 0.85, R2.2). VERBATIM-composite.
   */
  get frictionToFailureBreakpointBucket(): string {
    return TunablesStore.resolveString(
      'combat.friction_to_failure_breakpoint_bucket',
      'COMBAT_FRICTION_TO_FAILURE_BREAKPOINT_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.friction_tenure_reduction_per_tier` — friction reduction per lieutenant tenure tier.
   * Canon :416 / gdd/14. Default 0.15, range 0.05..0.30. VERBATIM canon.
   */
  get frictionTenureReductionPerTier(): number {
    return TunablesStore.resolveFloat(
      'combat.friction_tenure_reduction_per_tier',
      'COMBAT_FRICTION_TENURE_REDUCTION_PER_TIER',
      0.15,
    );
  },

  /**
   * `combat.assault_friction_cost` — friction cost per assault action.
   * [PROV-Y26Q2] C4. Default 0.15. range 0.05..0.40. used_by: FrictionBudgetService.commitActionWithFriction
   */
  get assaultFrictionCost(): number {
    return TunablesStore.resolveFloat(
      'combat.assault_friction_cost',
      'COMBAT_ASSAULT_FRICTION_COST',
      0.15,
    );
  },

  /**
   * `combat.hold_friction_cost` — friction cost per hold action.
   * [PROV-Y26Q2] C4. Default 0.08. range 0.02..0.25. used_by: FrictionBudgetService.commitActionWithFriction
   */
  get holdFrictionCost(): number {
    return TunablesStore.resolveFloat(
      'combat.hold_friction_cost',
      'COMBAT_HOLD_FRICTION_COST',
      0.08,
    );
  },

  /**
   * `combat.degrade_register_friction_cost` — friction cost per degrade_register action.
   * [PROV-Y26Q2] C4. Default 0.12. range 0.04..0.35. used_by: FrictionBudgetService.commitActionWithFriction
   */
  get degradeRegisterFrictionCost(): number {
    return TunablesStore.resolveFloat(
      'combat.degrade_register_friction_cost',
      'COMBAT_DEGRADE_REGISTER_FRICTION_COST',
      0.12,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.3 Ephemeral Architecture — combat.ephemeral_* (combat_mechanics.md:417-420)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.ephemeral_state_persistence_window_ticks` — state persistence window (ticks).
   * Canon :417 / gdd/14. Default 4, range 1..10. VERBATIM canon.
   */
  get ephemeralStatePersistenceWindowTicks(): number {
    return TunablesStore.resolveInt(
      'combat.ephemeral_state_persistence_window_ticks',
      'COMBAT_EPHEMERAL_STATE_PERSISTENCE_WINDOW_TICKS',
      4,
    );
  },

  /**
   * `combat.ephemeral_lieutenant_recall_loss_at_window_close_pct` — recall loss at window close.
   * Canon :418 / gdd/14. Default 100, range 70..100. VERBATIM canon.
   */
  get ephemeralLieutenantRecallLossAtWindowClosePct(): number {
    return TunablesStore.resolveInt(
      'combat.ephemeral_lieutenant_recall_loss_at_window_close_pct',
      'COMBAT_EPHEMERAL_LIEUTENANT_RECALL_LOSS_AT_WINDOW_CLOSE_PCT',
      100,
    );
  },

  /**
   * `combat.ephemeral_audit_trail_disabled_during_ephemeral` — audit trail disabled flag.
   * Canon :419 / gdd/14. Default true. VERBATIM canon.
   */
  get ephemeralAuditTrailDisabledDuringEphemeral(): boolean {
    return TunablesStore.resolveBool(
      'combat.ephemeral_audit_trail_disabled_during_ephemeral',
      'COMBAT_EPHEMERAL_AUDIT_TRAIL_DISABLED_DURING_EPHEMERAL',
      true,
    );
  },

  /**
   * `combat.ephemeral_operation_setup_cost_multiplier` — setup cost multiplier.
   * Canon :420 / gdd/14. Default 1.3, range 1.1..2.0. VERBATIM canon.
   */
  get ephemeralOperationSetupCostMultiplier(): number {
    return TunablesStore.resolveFloat(
      'combat.ephemeral_operation_setup_cost_multiplier',
      'COMBAT_EPHEMERAL_OPERATION_SETUP_COST_MULTIPLIER',
      1.3,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.4 Erosion Register — combat.erosion_* (combat_mechanics.md:421-424)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.erosion_registers_count` — number of erosion registers.
   * Canon :421 / gdd/14. Default 5, range 4..7. VERBATIM canon.
   */
  get erosionRegistersCount(): number {
    return TunablesStore.resolveInt(
      'combat.erosion_registers_count',
      'COMBAT_EROSION_REGISTERS_COUNT',
      5,
    );
  },

  /**
   * `combat.erosion_dominance_register_threat_weight` — threat weight of dominance register.
   * Canon :422 / gdd/14. Default 0.45, range 0.30..0.60. VERBATIM canon.
   */
  get erosionDominanceRegisterThreatWeight(): number {
    return TunablesStore.resolveFloat(
      'combat.erosion_dominance_register_threat_weight',
      'COMBAT_EROSION_DOMINANCE_REGISTER_THREAT_WEIGHT',
      0.45,
    );
  },

  /**
   * `combat.erosion_vulnerable_axis_regime_shift_threshold_bucket` — regime-shift trigger.
   * Canon :423 / gdd/14. composite:STANDARD (ref 0.30, R2.2). VERBATIM-composite.
   */
  get erosionVulnerableAxisRegimeShiftThresholdBucket(): string {
    return TunablesStore.resolveString(
      'combat.erosion_vulnerable_axis_regime_shift_threshold_bucket',
      'COMBAT_EROSION_VULNERABLE_AXIS_REGIME_SHIFT_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.erosion_register_independent_degradation` — registers degrade independently.
   * Canon :424 / gdd/14. Default true. VERBATIM canon.
   */
  get erosionRegisterIndependentDegradation(): boolean {
    return TunablesStore.resolveBool(
      'combat.erosion_register_independent_degradation',
      'COMBAT_EROSION_REGISTER_INDEPENDENT_DEGRADATION',
      true,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.5 Oxbow Severance — combat.oxbow_* (combat_mechanics.md:425-428)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.oxbow_severance_threshold_bucket` — neck-width severance threshold.
   * Canon :425 / gdd/14. composite:STANDARD (ref 0.3 max, R2.2). VERBATIM-composite.
   */
  get oxbowSeveranceThresholdBucket(): string {
    return TunablesStore.resolveString(
      'combat.oxbow_severance_threshold_bucket',
      'COMBAT_OXBOW_SEVERANCE_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.oxbow_hold_duration_ticks` — neck hold duration (ticks).
   * Canon :426 / gdd/14. Default 4, range 2..8. VERBATIM canon.
   */
  get oxbowHoldDurationTicks(): number {
    return TunablesStore.resolveInt(
      'combat.oxbow_hold_duration_ticks',
      'COMBAT_OXBOW_HOLD_DURATION_TICKS',
      4,
    );
  },

  /**
   * `combat.oxbow_orphan_decay_ticks_to_zero_capacity` — orphan zone decay to zero.
   * Canon :427 / gdd/14. Default 8, range 4..20. VERBATIM canon.
   */
  get oxbowOrphanDecayTicksToZeroCapacity(): number {
    return TunablesStore.resolveInt(
      'combat.oxbow_orphan_decay_ticks_to_zero_capacity',
      'COMBAT_OXBOW_ORPHAN_DECAY_TICKS_TO_ZERO_CAPACITY',
      8,
    );
  },

  /**
   * `combat.oxbow_reintegration_cost_pct_of_zone_value` — reintegration cost as pct of zone value.
   * Canon :428 / gdd/14. Default 60, range 30..100. VERBATIM canon.
   */
  get oxbowReintegrationCostPctOfZoneValue(): number {
    return TunablesStore.resolveInt(
      'combat.oxbow_reintegration_cost_pct_of_zone_value',
      'COMBAT_OXBOW_REINTEGRATION_COST_PCT_OF_ZONE_VALUE',
      60,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §2.6 Cumulative Attrition — combat.cpi_* (combat_mechanics.md:429-433)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `combat.cpi_crossing_threshold_bucket` — CPI threshold triggering drain.
   * Canon :429 / gdd/14. composite:STANDARD (ref 0.60, R2.2). VERBATIM-composite.
   */
  get cpiCrossingThresholdBucket(): string {
    return TunablesStore.resolveString(
      'combat.cpi_crossing_threshold_bucket',
      'COMBAT_CPI_CROSSING_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.cpi_resource_pressure_drain_above_threshold_per_tick` — drain rate above threshold.
   * Canon :430 / gdd/14. Default 0.10, range 0.05..0.25. VERBATIM canon.
   */
  get cpiResourcePressureDrainAboveThresholdPerTick(): number {
    return TunablesStore.resolveFloat(
      'combat.cpi_resource_pressure_drain_above_threshold_per_tick',
      'COMBAT_CPI_RESOURCE_PRESSURE_DRAIN_ABOVE_THRESHOLD_PER_TICK',
      0.10,
    );
  },

  /**
   * `combat.cpi_decay_rate_per_tick` — CPI decay rate per tick.
   * Canon :431 / gdd/14. Default 0.05, range 0.02..0.15. VERBATIM canon.
   */
  get cpiDecayRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'combat.cpi_decay_rate_per_tick',
      'COMBAT_CPI_DECAY_RATE_PER_TICK',
      0.05,
    );
  },

  /**
   * `combat.cpi_resistance_floor_bucket` — CPI resistance floor.
   * Canon :432 / gdd/14. composite:STANDARD (ref 0.20, R2.2). VERBATIM-composite.
   */
  get cpiResistanceFloorBucket(): string {
    return TunablesStore.resolveString(
      'combat.cpi_resistance_floor_bucket',
      'COMBAT_CPI_RESISTANCE_FLOOR_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `combat.cpi_k_rolling_window_ticks` — CPI rolling window (ticks).
   * Canon :433 / gdd/14. Default 12, range 6..24. VERBATIM canon.
   */
  get cpiKRollingWindowTicks(): number {
    return TunablesStore.resolveInt(
      'combat.cpi_k_rolling_window_ticks',
      'COMBAT_CPI_K_ROLLING_WINDOW_TICKS',
      12,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §5.1 Sandpile State — escalation.sandpile_* (escalation_mechanics.md:184-187)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `escalation.sandpile_cascade_threshold_bucket` — criticality cascade trigger.
   * Canon :184 / gdd/14. composite:HIGH (ref 0.8, R2.2). VERBATIM-composite.
   */
  get sandpileCascadeThresholdBucket(): string {
    return TunablesStore.resolveString(
      'escalation.sandpile_cascade_threshold_bucket',
      'ESCALATION_SANDPILE_CASCADE_THRESHOLD_BUCKET',
      'composite:HIGH',
    );
  },

  /**
   * `escalation.sandpile_cascade_sensitivity_bucket` — cascade sensitivity.
   * Canon :185 / gdd/14. composite:STANDARD (ref 0.5, R2.2). VERBATIM-composite.
   */
  get sandpileCascadeSensitivityBucket(): string {
    return TunablesStore.resolveString(
      'escalation.sandpile_cascade_sensitivity_bucket',
      'ESCALATION_SANDPILE_CASCADE_SENSITIVITY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.sandpile_cascade_propagation_probability_bucket` — propagation probability.
   * Canon :186 / gdd/14. composite:STANDARD (ref 0.45, R2.2 — seeded draw OQ-B4). VERBATIM-composite.
   */
  get sandpileCascadePropagationProbabilityBucket(): string {
    return TunablesStore.resolveString(
      'escalation.sandpile_cascade_propagation_probability_bucket',
      'ESCALATION_SANDPILE_CASCADE_PROPAGATION_PROBABILITY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.sandpile_global_decay_rate_per_idle_tick` — global criticality decay per tick.
   * Canon :187 / gdd/14. Default 0.015, range 0.005..0.04. VERBATIM canon.
   */
  get sandpileGlobalDecayRatePerIdleTick(): number {
    return TunablesStore.resolveFloat(
      'escalation.sandpile_global_decay_rate_per_idle_tick',
      'ESCALATION_SANDPILE_GLOBAL_DECAY_RATE_PER_IDLE_TICK',
      0.015,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §5.2 Maladaptive Memory — escalation.maladaptive_* (escalation_mechanics.md:188-191)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `escalation.maladaptive_depth_per_conflict` — conflict_memory depth increment per conflict.
   * Canon :188 / gdd/14. Default 1, range 1..2. VERBATIM canon.
   */
  get maladaptiveDepthPerConflict(): number {
    return TunablesStore.resolveInt(
      'escalation.maladaptive_depth_per_conflict',
      'ESCALATION_MALADAPTIVE_DEPTH_PER_CONFLICT',
      1,
    );
  },

  /**
   * `escalation.maladaptive_tension_increment_penalty_per_depth_pct` — tension penalty per depth.
   * Canon :189 / gdd/14. Default 10, range 5..20. VERBATIM canon.
   */
  get maladaptiveTensionIncrementPenaltyPerDepthPct(): number {
    return TunablesStore.resolveInt(
      'escalation.maladaptive_tension_increment_penalty_per_depth_pct',
      'ESCALATION_MALADAPTIVE_TENSION_INCREMENT_PENALTY_PER_DEPTH_PCT',
      10,
    );
  },

  /**
   * `escalation.maladaptive_hostile_memory_floor_bucket` — hostile memory floor at depth 7.
   * Canon :190 / gdd/14. composite:STANDARD (ref 0.20, R2.2). VERBATIM-composite.
   */
  get maladaptiveHostileMemoryFloorBucket(): string {
    return TunablesStore.resolveString(
      'escalation.maladaptive_hostile_memory_floor_bucket',
      'ESCALATION_MALADAPTIVE_HOSTILE_MEMORY_FLOOR_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.maladaptive_depth_decay_per_quiet_ticks` — depth decay per quiet ticks.
   * Canon :191 / gdd/14. Default 1 (per 10 ticks). VERBATIM canon.
   */
  get maladaptiveDepthDecayPerQuietTicks(): number {
    return TunablesStore.resolveInt(
      'escalation.maladaptive_depth_decay_per_quiet_ticks',
      'ESCALATION_MALADAPTIVE_DEPTH_DECAY_PER_QUIET_TICKS',
      1,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §5.3 Resonant Cadence — escalation.resonance_* (escalation_mechanics.md:192-194)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `escalation.resonance_threshold_bucket` — resonance lock threshold.
   * Canon :192 / gdd/14. composite:STANDARD (ref 0.70, R2.2). VERBATIM-composite.
   */
  get resonanceThresholdBucket(): string {
    return TunablesStore.resolveString(
      'escalation.resonance_threshold_bucket',
      'ESCALATION_RESONANCE_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.resonance_amplification_per_resonant_cycle_bucket` — amplification per cycle.
   * Canon :193 / gdd/14. composite:STANDARD (ref +0.25, R2.2). VERBATIM-composite.
   */
  get resonanceAmplificationPerResonantCycleBucket(): string {
    return TunablesStore.resolveString(
      'escalation.resonance_amplification_per_resonant_cycle_bucket',
      'ESCALATION_RESONANCE_AMPLIFICATION_PER_RESONANT_CYCLE_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.resonance_desynchronization_decay_rate_per_tick` — desync decay per tick.
   * Canon :194 / gdd/14. Default 0.10, range 0.05..0.20. VERBATIM canon.
   */
  get resonanceDesynchronizationDecayRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'escalation.resonance_desynchronization_decay_rate_per_tick',
      'ESCALATION_RESONANCE_DESYNCHRONIZATION_DECAY_RATE_PER_TICK',
      0.10,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §5.4 Oscillation Trap — escalation.oscillation_* (escalation_mechanics.md:195-198 + 201)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `escalation.oscillation_extraction_threshold_for_collapse_bucket` — extraction → collapse.
   * Canon :195 / gdd/14. composite:STANDARD (ref 0.75, R2.2). VERBATIM-composite.
   */
  get oscillationExtractionThresholdForCollapseBucket(): string {
    return TunablesStore.resolveString(
      'escalation.oscillation_extraction_threshold_for_collapse_bucket',
      'ESCALATION_OSCILLATION_EXTRACTION_THRESHOLD_FOR_COLLAPSE_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.oscillation_yield_recovery_rate_per_tick` — yield recovery rate per tick.
   * Canon :196 / gdd/14. Default 0.05, range 0.02..0.15. VERBATIM canon.
   */
  get oscillationYieldRecoveryRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'escalation.oscillation_yield_recovery_rate_per_tick',
      'ESCALATION_OSCILLATION_YIELD_RECOVERY_RATE_PER_TICK',
      0.05,
    );
  },

  /**
   * `escalation.oscillation_re_invasion_threshold_bucket` — re-invasion threshold.
   * Canon :197 / gdd/14. composite:STANDARD (ref 0.60, R2.2). VERBATIM-composite.
   */
  get oscillationReInvasionThresholdBucket(): string {
    return TunablesStore.resolveString(
      'escalation.oscillation_re_invasion_threshold_bucket',
      'ESCALATION_OSCILLATION_RE_INVASION_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `escalation.oscillation_cycle_period_estimate_ticks` — cycle period estimate.
   * Canon :198 / gdd/14. Default 10, range 4..24. VERBATIM canon.
   */
  get oscillationCyclePeriodEstimateTicks(): number {
    return TunablesStore.resolveInt(
      'escalation.oscillation_cycle_period_estimate_ticks',
      'ESCALATION_OSCILLATION_CYCLE_PERIOD_ESTIMATE_TICKS',
      10,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §6.1 Familiarity Discount — de_escalation.familiarity_* (de_escalation_mechanics.md:128-131)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `de_escalation.familiarity_accrual_rate_per_tick` — familiarity accrual rate per tick.
   * Canon :128 / gdd/14. Default 0.02, range 0.01..0.05. VERBATIM canon.
   */
  get familiarityAccrualRatePerTick(): number {
    return TunablesStore.resolveFloat(
      'de_escalation.familiarity_accrual_rate_per_tick',
      'DE_ESCALATION_FAMILIARITY_ACCRUAL_RATE_PER_TICK',
      0.02,
    );
  },

  /**
   * `de_escalation.familiarity_threshold_for_discount_bucket` — dear-enemy discount threshold.
   * Canon :129 / gdd/14. composite:STANDARD (ref 0.50, R2.2). VERBATIM-composite.
   */
  get familiarityThresholdForDiscountBucket(): string {
    return TunablesStore.resolveString(
      'de_escalation.familiarity_threshold_for_discount_bucket',
      'DE_ESCALATION_FAMILIARITY_THRESHOLD_FOR_DISCOUNT_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `de_escalation.familiarity_intrusion_reduction_at_max_bucket` — max reduction at peak.
   * Canon :130 / gdd/14. composite:STANDARD (ref 0.30, R2.2). VERBATIM-composite.
   */
  get familiarityIntrusionReductionAtMaxBucket(): string {
    return TunablesStore.resolveString(
      'de_escalation.familiarity_intrusion_reduction_at_max_bucket',
      'DE_ESCALATION_FAMILIARITY_INTRUSION_REDUCTION_AT_MAX_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `de_escalation.familiarity_vacuum_fill_volatility_multiplier_bucket` — vacuum fill volatility.
   * Canon :131 / gdd/14. composite:STANDARD (ref 1.40, R2.2). VERBATIM-composite.
   */
  get familiarityVacuumFillVolatilityMultiplierBucket(): string {
    return TunablesStore.resolveString(
      'de_escalation.familiarity_vacuum_fill_volatility_multiplier_bucket',
      'DE_ESCALATION_FAMILIARITY_VACUUM_FILL_VOLATILITY_MULTIPLIER_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §6.2 Downstream Gate — de_escalation.downstream_* (de_escalation_mechanics.md:132-134)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `de_escalation.downstream_regime_transition_threshold_bucket` — hydraulic-jump threshold.
   * Canon :132 / gdd/14. composite:STANDARD (ref 0.6, R2.2). VERBATIM-composite.
   */
  get downstreamRegimeTransitionThresholdBucket(): string {
    return TunablesStore.resolveString(
      'de_escalation.downstream_regime_transition_threshold_bucket',
      'DE_ESCALATION_DOWNSTREAM_REGIME_TRANSITION_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `de_escalation.downstream_standing_mode_aggression_suppression_bucket`
   * Canon :133 / gdd/14. composite:STANDARD (ref 0.85, R2.2). VERBATIM-composite.
   */
  get downstreamStandingModeAggressionSuppressionBucket(): string {
    return TunablesStore.resolveString(
      'de_escalation.downstream_standing_mode_aggression_suppression_bucket',
      'DE_ESCALATION_DOWNSTREAM_STANDING_MODE_AGGRESSION_SUPPRESSION_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `de_escalation.downstream_clear_decay_per_tick` — downstream condition decay per tick.
   * Canon :134 / gdd/14. Default 0.04, range 0.02..0.10. VERBATIM canon.
   */
  get downstreamClearDecayPerTick(): number {
    return TunablesStore.resolveFloat(
      'de_escalation.downstream_clear_decay_per_tick',
      'DE_ESCALATION_DOWNSTREAM_CLEAR_DECAY_PER_TICK',
      0.04,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §7.1 Dead Hand Cache — retaliation.dead_hand_* (retaliation_mechanics.md:116-123)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `retaliation.dead_hand_trigger_threshold_tarcum_bucket` — Tarcum Dead Hand trigger.
   * Canon :118 / gdd/14. composite:LOW (ref 0.20, R2.2). VERBATIM-composite.
   */
  get deadHandTriggerThresholdTarcumBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_trigger_threshold_tarcum_bucket',
      'RETALIATION_DEAD_HAND_TRIGGER_THRESHOLD_TARCUM_BUCKET',
      'composite:LOW',
    );
  },

  /**
   * `retaliation.dead_hand_trigger_threshold_coil_bucket` — Coil Dead Hand trigger.
   * Canon :119 / gdd/14. composite:MINIMAL (ref 0.10, R2.2). VERBATIM-composite.
   */
  get deadHandTriggerThresholdCoilBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_trigger_threshold_coil_bucket',
      'RETALIATION_DEAD_HAND_TRIGGER_THRESHOLD_COIL_BUCKET',
      'composite:MINIMAL',
    );
  },

  /**
   * `retaliation.dead_hand_trigger_threshold_iron_throat_bucket` — Iron Throat Dead Hand trigger.
   * Canon :120 / gdd/14. composite:MEDIUM (ref 0.15, R2.2). VERBATIM-composite.
   */
  get deadHandTriggerThresholdIronThroatBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_trigger_threshold_iron_throat_bucket',
      'RETALIATION_DEAD_HAND_TRIGGER_THRESHOLD_IRON_THROAT_BUCKET',
      'composite:MEDIUM',
    );
  },

  /**
   * `retaliation.dead_hand_reserve_fraction_bucket` — Dead Hand reserve fraction.
   * Canon :121 / gdd/14. composite:STANDARD (ref 0.12, R2.2). VERBATIM-composite.
   */
  get deadHandReserveFractionBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_reserve_fraction_bucket',
      'RETALIATION_DEAD_HAND_RESERVE_FRACTION_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `retaliation.dead_hand_cache_refresh_ticks` — Dead Hand cache refresh interval.
   * Canon :122 / gdd/14. Default 8, range 4..16. VERBATIM canon.
   */
  get deadHandCacheRefreshTicks(): number {
    return TunablesStore.resolveInt(
      'retaliation.dead_hand_cache_refresh_ticks',
      'RETALIATION_DEAD_HAND_CACHE_REFRESH_TICKS',
      8,
    );
  },

  /**
   * `retaliation.intelligence_cache_detection_probability_per_intel_action_bucket`
   * Canon :123 / gdd/14. composite:STANDARD (ref 0.55, R2.2 — seeded draw OQ-B4). VERBATIM-composite.
   */
  get intelligenceCacheDetectionProbabilityPerIntelActionBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.intelligence_cache_detection_probability_per_intel_action_bucket',
      'RETALIATION_INTELLIGENCE_CACHE_DETECTION_PROBABILITY_PER_INTEL_ACTION_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §9 Mechanics Interlock — interlock.* (mechanics_interlock.md:163-171)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `interlock.pattern_intel_leakage_on_elimination_bucket` [PROV-Y26Q2]
   * Canon :169 / gdd/14. composite:STANDARD (Adaptive Skin leakage, R2.2). [PROV-Y26Q2].
   */
  get patternIntelLeakageOnEliminationBucket(): string {
    return TunablesStore.resolveString(
      'interlock.pattern_intel_leakage_on_elimination_bucket',
      'INTERLOCK_PATTERN_INTEL_LEAKAGE_ON_ELIMINATION_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `interlock.cascade_atomic_transaction_timeout_ms` — atomic cascade tx budget.
   * Canon :170 / gdd/14. Default 5000, range 1000..30000. VERBATIM canon (F4).
   */
  get cascadeAtomicTransactionTimeoutMs(): number {
    return TunablesStore.resolveInt(
      'interlock.cascade_atomic_transaction_timeout_ms',
      'INTERLOCK_CASCADE_ATOMIC_TRANSACTION_TIMEOUT_MS',
      5000,
    );
  },

  /**
   * `interlock.elimination_compounding_penalty_aggregate_bucket` [PROV-Y26Q2]
   * Canon :171 / gdd/14. composite:HIGH (4-penalty §9.2 multiplier, R2.2). [PROV-Y26Q2].
   */
  get eliminationCompoundingPenaltyAggregateBucket(): string {
    return TunablesStore.resolveString(
      'interlock.elimination_compounding_penalty_aggregate_bucket',
      'INTERLOCK_ELIMINATION_COMPOUNDING_PENALTY_AGGREGATE_BUCKET',
      'composite:HIGH',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — seeded-draw seed prefixes (OQ-B4)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `escalation.sandpile_cascade_seed_prefix` [PROV-Y26Q2] — OQ-B4.
   * Seed prefix for deterministic Sandpile cascade propagation draw.
   * makeRng(`${prefix}:${rivalKey}:${gameDay}`). Default 'cascade'. NO Math.random().
   */
  get sandpileCascadeSeedPrefix(): string {
    return TunablesStore.resolveString(
      'escalation.sandpile_cascade_seed_prefix',
      'ESCALATION_SANDPILE_CASCADE_SEED_PREFIX',
      'cascade',
    );
  },

  /**
   * `retaliation.dead_hand_detection_seed_prefix` [PROV-Y26Q2] — OQ-B4.
   * Seed prefix for deterministic Dead Hand detection draw.
   * makeRng(`${prefix}:${rivalKey}:${gameDay}`). Default 'deadhand'. NO Math.random().
   */
  get deadHandDetectionSeedPrefix(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_detection_seed_prefix',
      'RETALIATION_DEAD_HAND_DETECTION_SEED_PREFIX',
      'deadhand',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — Saltline Dead-Hand trigger (inherits OQ-A1)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `retaliation.dead_hand_trigger_threshold_saltline_bucket` [PROV-Y26Q2] — OQ-A1.
   * Saltline Dead Hand trigger threshold (canon-silent — inherits Tarcum LOW pattern, ref 0.20, R2.2).
   * Calibration TD. composite:LOW.
   */
  get deadHandTriggerThresholdSaltlineBucket(): string {
    return TunablesStore.resolveString(
      'retaliation.dead_hand_trigger_threshold_saltline_bucket',
      'RETALIATION_DEAD_HAND_TRIGGER_THRESHOLD_SALTLINE_BUCKET',
      'composite:LOW',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // DD-DIVERGENCE-TABLE — getDivergenceOutcome (OQ-B1 + DD-DIVERGENCE-TABLE)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // The divergence-table cells are sourced from the registry (getter-sourced) — NOT a code-baked
  // magic switch of outcomes. The SHAPE is frozen; cell values are [PROV-Y26Q2] and route to
  // the conflict-layer calibration TD. NO Math.random(), NO Date.now().

  /**
   * `combat.divergence_table.<frictionBand>.<actionType>` — registry-sourced cell lookup.
   * [PROV-Y26Q2] OQ-B1 DD-DIVERGENCE-TABLE. Pure deterministic lookup (C4 anti-dice).
   * Returns the CombatOutcomeBucket for the given (frictionBand, actionType) pair.
   * Per-cell defaults mirror gdd/14 exactly (C4 default-mirror fix — NOT a blanket 'hold').
   * NO Math.random(), NO Date.now().
   */
  getDivergenceOutcome(frictionBand: string, actionType: string): CombatOutcomeBucket {
    // Per-cell defaults from gdd/14 — the C4 default-mirror fix.
    // Blanket 'hold' default replaced with a per-cell lookup that mirrors gdd/14 exactly.
    const CELL_DEFAULTS: Readonly<Record<string, CombatOutcomeBucket>> = {
      'low.assault':              'hold',
      'low.hold':                 'contested',
      'low.degrade_register':     'retreat',
      'medium.assault':           'contested',
      'medium.hold':              'advance',
      'medium.degrade_register':  'hold',
      'high.assault':             'advance',
      'high.hold':                'breakthrough',
      'high.degrade_register':    'contested',
    };
    const cellKey = `${frictionBand}.${actionType}`;
    const cellDefault: CombatOutcomeBucket = CELL_DEFAULTS[cellKey] ?? 'hold';
    const key = `combat.divergence_table.${frictionBand}.${actionType}`;
    const envVar = `COMBAT_DIVERGENCE_TABLE_${frictionBand.toUpperCase()}_${actionType.toUpperCase()}`;
    const raw = TunablesStore.resolveString(key, envVar, cellDefault);
    // Validate the sourced value is a known CombatOutcomeBucket member — the predicate narrows a
    // raw `string` to `CombatOutcomeBucket`, no `as` cast (design §6 B-1).
    if (isCombatOutcomeBucket(raw)) {
      return raw;
    }
    // Unknown value from registry — fall back to the per-cell default (safe, never throws).
    return cellDefault;
  },
};

/** Named class for NestJS DI (C2). Exposes all getters as instance methods. */
export class CombatTunables {
  // §2.1 Percolation Break
  get percolationThresholdBucket() { return combatTunables.percolationThresholdBucket; }
  get percolationNodeRebuildRatePerTick() { return combatTunables.percolationNodeRebuildRatePerTick; }
  get percolationAssaultNodeRemovalPerHit() { return combatTunables.percolationAssaultNodeRemovalPerHit; }
  get percolationEconomicAttritionEfficiencyPct() { return combatTunables.percolationEconomicAttritionEfficiencyPct; }
  get percolationRecomputeIntervalGameHours() { return combatTunables.percolationRecomputeIntervalGameHours; }
  // §2.2 Friction Budget
  get frictionBasePerActionUnit() { return combatTunables.frictionBasePerActionUnit; }
  get frictionComplexityMultiplier() { return combatTunables.frictionComplexityMultiplier; }
  get frictionToFailureBreakpointBucket() { return combatTunables.frictionToFailureBreakpointBucket; }
  get frictionTenureReductionPerTier() { return combatTunables.frictionTenureReductionPerTier; }
  // [PROV-Y26Q2] C4: per-action friction cost getters
  get assaultFrictionCost() { return combatTunables.assaultFrictionCost; }
  get holdFrictionCost() { return combatTunables.holdFrictionCost; }
  get degradeRegisterFrictionCost() { return combatTunables.degradeRegisterFrictionCost; }
  // §2.3 Ephemeral Architecture
  get ephemeralStatePersistenceWindowTicks() { return combatTunables.ephemeralStatePersistenceWindowTicks; }
  get ephemeralLieutenantRecallLossAtWindowClosePct() { return combatTunables.ephemeralLieutenantRecallLossAtWindowClosePct; }
  get ephemeralAuditTrailDisabledDuringEphemeral() { return combatTunables.ephemeralAuditTrailDisabledDuringEphemeral; }
  get ephemeralOperationSetupCostMultiplier() { return combatTunables.ephemeralOperationSetupCostMultiplier; }
  // §2.4 Erosion Register
  get erosionRegistersCount() { return combatTunables.erosionRegistersCount; }
  get erosionDominanceRegisterThreatWeight() { return combatTunables.erosionDominanceRegisterThreatWeight; }
  get erosionVulnerableAxisRegimeShiftThresholdBucket() { return combatTunables.erosionVulnerableAxisRegimeShiftThresholdBucket; }
  get erosionRegisterIndependentDegradation() { return combatTunables.erosionRegisterIndependentDegradation; }
  // §2.5 Oxbow Severance
  get oxbowSeveranceThresholdBucket() { return combatTunables.oxbowSeveranceThresholdBucket; }
  get oxbowHoldDurationTicks() { return combatTunables.oxbowHoldDurationTicks; }
  get oxbowOrphanDecayTicksToZeroCapacity() { return combatTunables.oxbowOrphanDecayTicksToZeroCapacity; }
  get oxbowReintegrationCostPctOfZoneValue() { return combatTunables.oxbowReintegrationCostPctOfZoneValue; }
  // §2.6 Cumulative Attrition
  get cpiCrossingThresholdBucket() { return combatTunables.cpiCrossingThresholdBucket; }
  get cpiResourcePressureDrainAboveThresholdPerTick() { return combatTunables.cpiResourcePressureDrainAboveThresholdPerTick; }
  get cpiDecayRatePerTick() { return combatTunables.cpiDecayRatePerTick; }
  get cpiResistanceFloorBucket() { return combatTunables.cpiResistanceFloorBucket; }
  get cpiKRollingWindowTicks() { return combatTunables.cpiKRollingWindowTicks; }
  // §5 Escalation
  get sandpileCascadeThresholdBucket() { return combatTunables.sandpileCascadeThresholdBucket; }
  get sandpileCascadeSensitivityBucket() { return combatTunables.sandpileCascadeSensitivityBucket; }
  get sandpileCascadePropagationProbabilityBucket() { return combatTunables.sandpileCascadePropagationProbabilityBucket; }
  get sandpileGlobalDecayRatePerIdleTick() { return combatTunables.sandpileGlobalDecayRatePerIdleTick; }
  get maladaptiveDepthPerConflict() { return combatTunables.maladaptiveDepthPerConflict; }
  get maladaptiveTensionIncrementPenaltyPerDepthPct() { return combatTunables.maladaptiveTensionIncrementPenaltyPerDepthPct; }
  get maladaptiveHostileMemoryFloorBucket() { return combatTunables.maladaptiveHostileMemoryFloorBucket; }
  get maladaptiveDepthDecayPerQuietTicks() { return combatTunables.maladaptiveDepthDecayPerQuietTicks; }
  get resonanceThresholdBucket() { return combatTunables.resonanceThresholdBucket; }
  get resonanceAmplificationPerResonantCycleBucket() { return combatTunables.resonanceAmplificationPerResonantCycleBucket; }
  get resonanceDesynchronizationDecayRatePerTick() { return combatTunables.resonanceDesynchronizationDecayRatePerTick; }
  get oscillationExtractionThresholdForCollapseBucket() { return combatTunables.oscillationExtractionThresholdForCollapseBucket; }
  get oscillationYieldRecoveryRatePerTick() { return combatTunables.oscillationYieldRecoveryRatePerTick; }
  get oscillationReInvasionThresholdBucket() { return combatTunables.oscillationReInvasionThresholdBucket; }
  get oscillationCyclePeriodEstimateTicks() { return combatTunables.oscillationCyclePeriodEstimateTicks; }
  // §6 De-escalation
  get familiarityAccrualRatePerTick() { return combatTunables.familiarityAccrualRatePerTick; }
  get familiarityThresholdForDiscountBucket() { return combatTunables.familiarityThresholdForDiscountBucket; }
  get familiarityIntrusionReductionAtMaxBucket() { return combatTunables.familiarityIntrusionReductionAtMaxBucket; }
  get familiarityVacuumFillVolatilityMultiplierBucket() { return combatTunables.familiarityVacuumFillVolatilityMultiplierBucket; }
  get downstreamRegimeTransitionThresholdBucket() { return combatTunables.downstreamRegimeTransitionThresholdBucket; }
  get downstreamStandingModeAggressionSuppressionBucket() { return combatTunables.downstreamStandingModeAggressionSuppressionBucket; }
  get downstreamClearDecayPerTick() { return combatTunables.downstreamClearDecayPerTick; }
  // §7 Retaliation
  get deadHandTriggerThresholdTarcumBucket() { return combatTunables.deadHandTriggerThresholdTarcumBucket; }
  get deadHandTriggerThresholdCoilBucket() { return combatTunables.deadHandTriggerThresholdCoilBucket; }
  get deadHandTriggerThresholdIronThroatBucket() { return combatTunables.deadHandTriggerThresholdIronThroatBucket; }
  get deadHandReserveFractionBucket() { return combatTunables.deadHandReserveFractionBucket; }
  get deadHandCacheRefreshTicks() { return combatTunables.deadHandCacheRefreshTicks; }
  get intelligenceCacheDetectionProbabilityPerIntelActionBucket() { return combatTunables.intelligenceCacheDetectionProbabilityPerIntelActionBucket; }
  // §9 Interlock
  get patternIntelLeakageOnEliminationBucket() { return combatTunables.patternIntelLeakageOnEliminationBucket; }
  get cascadeAtomicTransactionTimeoutMs() { return combatTunables.cascadeAtomicTransactionTimeoutMs; }
  get eliminationCompoundingPenaltyAggregateBucket() { return combatTunables.eliminationCompoundingPenaltyAggregateBucket; }
  // NEW [PROV-Y26Q2]
  get sandpileCascadeSeedPrefix() { return combatTunables.sandpileCascadeSeedPrefix; }
  get deadHandDetectionSeedPrefix() { return combatTunables.deadHandDetectionSeedPrefix; }
  get deadHandTriggerThresholdSaltlineBucket() { return combatTunables.deadHandTriggerThresholdSaltlineBucket; }
  // DD-DIVERGENCE-TABLE
  getDivergenceOutcome(frictionBand: string, actionType: string): CombatOutcomeBucket {
    return combatTunables.getDivergenceOutcome(frictionBand, actionType);
  }
}

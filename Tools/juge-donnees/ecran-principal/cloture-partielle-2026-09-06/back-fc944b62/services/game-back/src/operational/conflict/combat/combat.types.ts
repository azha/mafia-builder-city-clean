// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 1 (C1) Step 6
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9.1-9.5
//             — Combat & Escalation B C1 — 2026-06-25 —
//
// Shared TypeScript types for the 04b-B combat lot.
//
// REUSE: RivalKey / ErosionRegisterId imported from rival-ai.types (NO re-declare).
//        ResistanceBucket imported from adaptive-skin.service (as noted in C0 carry-forward).
//
// R2.2 / P6: all raw scalar fields are SERVER-ONLY. Player-facing surfaces use only bucket strings.
// Anti-fabrication: no Math.random(), no non-deterministic values. Types only.
// Zero-regression: ADDITIVE only (no existing type modified).

// ─── REUSE from A's types (no re-declare) ─────────────────────────────────────────────────────

export type { RivalKey } from '../rival/rival-ai.types';
export type { ResistanceBucket } from '../rival/adaptive-skin.service';

// ─── New B-domain enums (closed-domain strings — match pgEnum values) ─────────────────────────

/** `CombatEventType` — the 3 combat event categories. Canon: combat_mechanics.md :363. */
export type CombatEventType = 'assault' | 'hold' | 'degrade_register';

/** `PartitionState` — network partition status (the B-added rival_state column). */
export type PartitionState = 'integrated' | 'fragmented';

/** `FlowRegime` — the hydraulic-jump downstream gate regime. Canon: de_escalation_mechanics.md :95. */
export type FlowRegime = 'running' | 'standing';

// ─── P6-safe bucket types (server-side derivation — never expose raw scalars) ─────────────────

/**
 * `FrictionBand` — banded client view of base_friction_load.
 * low:    friction < 0.30 (below breakpoint clip)
 * medium: 0.30 <= friction < 0.70
 * high:   friction >= 0.70 (near failure breakpoint)
 * Derived server-side; raw float never forwarded (P6).
 */
export type FrictionBand = 'low' | 'medium' | 'high';

/**
 * `CombatOutcomeBucket` — the divergence-table output (DD-DIVERGENCE-TABLE).
 * Qualitative outcome band — never a raw scalar.
 *
 * REUSE (W6.1 C6/B-1, design §0.11/§6 B-1): re-exported from `combat-tunables.ts` — the SAME
 * `NO re-declare` convention this file's own header already applies to `RivalKey`/`ResistanceBucket`
 * above. This WAS a locally-declared, homonymous, dead 3-value type (`inconclusive | partial |
 * decisive` — nothing in this repo ever produced those values); `combat-tunables.ts` is the module
 * that PRODUCES the value (`getDivergenceOutcome`, `COMBAT_OUTCOME_BUCKETS`). A re-export makes a
 * re-declaration IN THIS MODULE compile-fatal — it does not by itself prevent a homonym in a
 * different file (that guard is the repository-wide static assertion design §4 C6 adds).
 */
export type { CombatOutcomeBucket } from './combat-tunables';

/**
 * `CpiCrossingBucket` — the Cumulative-Attrition CPI band.
 * below:    CPI < crossing_threshold (no crossing)
 * crossing: at or above threshold
 */
export type CpiCrossingBucket = 'below' | 'crossing';

// ─── Repository row shapes ─────────────────────────────────────────────────────────────────────

/** `CombatOperationRow` — the full combat_operation DB row. */
export interface CombatOperationRow {
  operation_id: string;
  player_id: string;
  rival_key: string;
  base_friction_load: number;
  shared_friction_pool: number;
  ephemeral_mode: boolean;
  state_persistence_window_ticks: number;
}

/** `CombatEventRow` — the full combat_event DB row. */
export interface CombatEventRow {
  id: string;
  player_id: string;
  type: CombatEventType;
  target_rival_key: string;
  target_block_id: number | null;
  target_register_id: string | null;
  lieutenant_id: string | null;
  friction_consumed_bucket: string | null;
  outcome_bucket: string | null;
  heat_increment_bucket: string | null;
  // created_at_minute: game-minute this event was recorded. Added migration 0093.
  // Provides stable insertion-order sorting (uuid v4 id is random, not time-ordered).
  // All INSERT callers must pass this. Default 0 for pre-0093 rows (zero-regression).
  created_at_minute: number;
}

/** `EscalationGlobalRow` — the escalation_global_state single row. */
export interface EscalationGlobalRow {
  id: number;
  system_criticality: number;
  cascade_threshold: number;
}

/** `EscalationPairRow` — escalation_pair_state row. */
export interface EscalationPairRow {
  player_id: string;
  rival_key: string;
  conflict_memory_depth: number;
  resonance_factor: number;
  player_response_history: unknown[];
}

/** `OscillationLekRow` — oscillation_lek_state row. */
export interface OscillationLekRow {
  player_id: string;
  tile_id: number;
  rival_key: string;
  extraction_rate: number;
  yield_state: number;
  oscillation_locked: boolean;
}

/** `DeescalationPairRow` — deescalation_pair_state row. */
export interface DeescalationPairRow {
  player_id: string;
  rival_key: string;
  familiarity_index: number;
  mutual_calibration: boolean;
  vacuum_volatility: number;
}

/** `ConflictFlowRow` — conflict_flow_state row. */
export interface ConflictFlowRow {
  player_id: string;
  rival_key: string;
  flow_regime: FlowRegime;
  downstream_condition: number;
}

/** `DeadHandCacheRow` — dead_hand_cache_state row. */
export interface DeadHandCacheRow {
  player_id: string;
  rival_key: string;
  cache_script_ref: string;
  dead_hand_reserve: number;
  trigger_threshold: number;
  intelligence_revealed: boolean;
}

// ─── B-owned rival_state combat columns (OQ-B2) ───────────────────────────────────────────────

/**
 * `RivalStateCombatCols` — the 5 B-owned columns added to rival_state via migration 0085.
 * Written by B; reserved+declared by A (OQ-B2 / OQ-A8).
 * All are SERVER-ONLY (P6 hidden).
 */
export interface RivalStateCombatCols {
  active_link_fraction: number | null;
  operational_graph_node_count: number | null;
  partition_state: PartitionState | null;
  cumulative_pressure_index: number | null;
  resource_pressure: number | null;
}

// ─── Bus events (distinct from System 6's InspectionCascadeTriggeredEvent) ────────────────────

/**
 * `AssaultCascadeCompletedEvent` — emitted by ConflictOrchestratorService when the §9.1
 * 5-layer cascade completes (one SERIALIZABLE tx, all layers applied or all rolled back).
 *
 * RENAMED from the stale `CascadeTriggeredEvent` (type: 'cascade_triggered') to avoid the
 * discriminant collision with the sandpile `CascadeTriggeredEvent` already present in
 * city-event-bus.ts (type: 'cascade_triggered', sandpile 12h tick — DISTINCT origin + payload).
 *
 * Type discriminant: 'assault_cascade_completed' (NEW, ADDITIVE — no existing type modified).
 * DISTINCT from:
 *   - city-event-bus.ts CascadeTriggeredEvent (sandpile variant, type='cascade_triggered')
 *   - System 6's InspectionCascadeTriggeredEvent (type='inspection_cascade_triggered')
 *
 * Carries qualitative cascade results (P5 / R2.2 — no raw scalars on the bus).
 * Canvas: ConflictOrchestratorService -> CityEventBus (C-cas chunk).
 */
export interface AssaultCascadeCompletedEvent {
  readonly type: 'assault_cascade_completed';
  readonly playerId: string;
  readonly rivalKey: string;
  readonly assaultEventId: string;
  readonly gameMinute: number;
  /** Whether the heat layer fired (Layer 1 — always true when not a dedup no-op). */
  readonly heat_propagated: boolean;
  /** Qualitative sandpile delta (Layer 2 — 'elevated' or 'stable'). R2.2: never the raw delta. */
  readonly sandpile_delta_bucket: string;
  /** Maladaptive depth increment (Layer 3 — integer, 0 on dedup no-op). */
  readonly maladaptive_depth_increment: number;
  /** Whether the Adaptive Skin pattern was logged (Layer 4). */
  readonly adaptive_skin_pattern_logged: boolean;
  /** Burn-trust impact (Layer 5 — C forward slot, 'none' in B). */
  readonly burn_trust_impact_bucket: string;
}

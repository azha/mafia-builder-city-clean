// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 1 (C1) Step 2
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9.4-9.5
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md §4-§6
//             docs/tech/04b_combat_and_conflict/de_escalation_mechanics.md §5
//             docs/tech/09_data_model/schema_conflict_escalation.md §2 (R9.3 backport — same-commit)
//             — Combat & Escalation B C1 — 2026-06-25 —
//
// TABLES (6 NEW escalation/de-escalation/dead-hand entities — migrations 0087-0089):
//
//   escalation_global_state — single global row sentinel for Sandpile criticality (§4.1).
//     PK: integer id DEFAULT 1 (single-row convention — one global row, no per-player partition).
//     system_criticality: HIDDEN server-only P6 (band derived for player).
//     cascade_threshold: real — the criticality threshold above which cascade fires.
//
//   escalation_pair_state — per-(player_id, rival_key) maladaptive/resonant state (§4.2/4.3).
//     PK composite: (player_id, rival_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     player_response_history: jsonb [] — game-time tick list (HIDDEN — server reads, never forwarded).
//
//   oscillation_lek_state — per-(player_id, tile_id) contested lek oscillation (§4.4; OQ-B6).
//     PK composite: (player_id, tile_id).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     tile_id: SOFT-REF (NO FK to deal_leks — 9b soft-ref discipline).
//     rival_key: enum (which rival the lek contest is associated with).
//
//   deescalation_pair_state — per-(player_id, rival_key) familiarity+calibration state (§5.1).
//     PK composite: (player_id, rival_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     familiarity_index: HIDDEN server-only P6.
//
//   conflict_flow_state — per-(player_id, rival_key) hydraulic-jump downstream gate (§5.2).
//     PK composite: (player_id, rival_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     downstream_condition: server-side real scalar; player sees bucket string derived by CombatProjectionService.
//
//   dead_hand_cache_state — per-(player_id, rival_key) dead-hand reserve (§6).
//     PK composite: (player_id, rival_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     cache_script_ref / dead_hand_reserve / trigger_threshold: all HIDDEN (P6).
//     intelligence_revealed: the ONLY P5-partial field exposed to the player (canon :81).
//
// ENUMS (1 NEW closed-domain type — migration 0088):
//   flow_regime — running | standing (canon de_escalation_mechanics.md :95)
//
// R9.3: this file matches migrations 0087-0089 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_conflict_escalation.md (created same-commit).
// R2.2: system_criticality / familiarity_index / dead_hand_reserve / trigger_threshold /
//       cache_script_ref / player_response_history are SERVER-ONLY (P6 hidden).
//       intelligence_revealed is the ONLY P5-partial exception in dead_hand_cache_state.
// Soft-ref discipline: oscillation_lek_state.tile_id has NO FK to deal_leks (9b discipline).
// Anti-fabrication (C1): no Math.random(); no non-deterministic value in schema defaults.
// Zero-regression invariant: no existing tables modified. ADDITIVE only.

import {
  pgTable,
  pgEnum,
  uuid,
  real,
  integer,
  boolean,
  varchar,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { player } from './player';
import { rivalKey } from './conflict_rival';

// ===== pgEnum: flow_regime =====

/**
 * `flow_regime` — the hydraulic-jump downstream gate regime.
 * Canon: de_escalation_mechanics.md :95 — the two downstream-gate states.
 * running:  the downstream condition is in normal flow (conflict is progressing).
 * standing: the downstream condition has stalled (hydraulic jump — de-escalation gate active).
 */
export const flowRegime = pgEnum('flow_regime', ['running', 'standing']);

// ===== Table: escalation_global_state =====

/**
 * `escalation_global_state` — single global row for Sandpile system criticality (§4.1).
 *
 * PK: integer id DEFAULT 1 — single-row sentinel convention (like city_sim_clock).
 * There is exactly ONE row in this table (enforced by the PK + application-layer upsert on id=1).
 *
 * system_criticality: the Sandpile criticality accumulator.
 *   P6 (SERVER-ONLY): the raw float is NEVER forwarded to the player.
 *   The player-facing form is a bucket string derived server-side.
 *
 * cascade_threshold: the criticality level at which the §9.1 cascade fires.
 *   Default 0 — calibrated at C-esc (the threshold is a canon-chiffré tunable).
 */
export const escalationGlobalState = pgTable('escalation_global_state', {
  id: integer('id').primaryKey().default(1),

  // ─── System criticality (SERVER-ONLY / P6-hidden) ────────────────────────────────────────
  system_criticality: real('system_criticality').notNull().default(0),

  cascade_threshold: real('cascade_threshold').notNull().default(0),
});

// ===== Table: escalation_pair_state =====

/**
 * `escalation_pair_state` — per-player × per-rival maladaptive/resonant escalation state (§4.2/4.3).
 *
 * PK composite: (player_id, rival_key) — one row per active conflict pair.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * conflict_memory_depth: tick count since the conflict entered the resonance zone.
 *   Drives the Maladaptive Coupling mechanic (§4.2 — the longer, the more entrenched).
 *
 * resonance_factor: the Resonant Escalation multiplier (§4.3 — amplifies cascade intensity).
 *   Server-only scalar — band derived in CombatProjectionService.
 *
 * player_response_history: jsonb array of game-time tick values when the player acted.
 *   Used by the resonance classifier to detect rhythmic response patterns (§4.3 :88).
 *   HIDDEN (P6 — server reads only; the player never sees the raw history).
 */
export const escalationPairState = pgTable(
  'escalation_pair_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    conflict_memory_depth: integer('conflict_memory_depth').notNull().default(0),

    // resonance_factor: Resonant Escalation multiplier (§4.3). Default 0 (no resonance).
    resonance_factor: real('resonance_factor').notNull().default(0),

    // player_response_history: array of game-time timestamps (jsonb). Default empty array.
    // HIDDEN (P6): server reads history to classify resonance; player never sees raw array.
    player_response_history: jsonb('player_response_history').notNull().default([]),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: oscillation_lek_state =====

/**
 * `oscillation_lek_state` — per-player × per-lek contested lek oscillation (§4.4; OQ-B6).
 *
 * PK composite: (player_id, tile_id) — one row per contested lek per player.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * Soft-ref discipline (9b corridor_debt.block_id precedent — migration 0076):
 *   tile_id: integer — SOFT-REF to deal_leks (NO DB FK).
 *   The lek tile is referenced by integer ID. No cascade coupling to the deal_lek table.
 *   This follows the same soft-ref discipline as corridor_debt.block_id and rival_holding.block_id.
 *
 * rival_key: which rival the contested lek is associated with.
 *
 * extraction_rate: the per-tile extraction rate (real). Server-only accumulator.
 *   The player sees only the qualitative band derived in CombatProjectionService.
 *
 * yield_state: the current yield oscillation state (real). Oscillates between 0 and 1
 *   as the lek is contested and released.
 *
 * oscillation_locked: true when the yield oscillation has been clamped to a fixed value
 *   (the Ossification sub-mechanic — §4.4 :112).
 */
export const oscillationLekState = pgTable(
  'oscillation_lek_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    // tile_id: SOFT-REF to deal_leks.tile_id (NO DB FK — 9b soft-ref discipline).
    tile_id: integer('tile_id').notNull(),

    rival_key: rivalKey('rival_key').notNull(),

    extraction_rate: real('extraction_rate').notNull().default(0),
    yield_state:     real('yield_state').notNull().default(0),
    oscillation_locked: boolean('oscillation_locked').notNull().default(false),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.tile_id] }),
  }),
);

// ===== Table: deescalation_pair_state =====

/**
 * `deescalation_pair_state` — per-player × per-rival familiarity + calibration state (§5.1).
 *
 * PK composite: (player_id, rival_key) — one row per active conflict pair.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * familiarity_index: the Familiarity Ratchet accumulator (§5.1 :21).
 *   P6 (SERVER-ONLY): raw float — NEVER forwarded to the player.
 *   The player sees only the qualitative indicator derived in CombatProjectionService.
 *
 * mutual_calibration: true when both sides have reached the calibration threshold (§5.1 :48).
 *   This is the ONLY boolean visible-to-player indicator in this table (P5 partial exception).
 *
 * vacuum_volatility: the power-vacuum volatility accumulator (§5.1 :61 — set when a rival
 *   lieutenant is removed and the de-escalation pressure creates instability).
 */
export const deescalationPairState = pgTable(
  'deescalation_pair_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // familiarity_index: HIDDEN (P6). Server reads; player sees derived band only.
    familiarity_index:  real('familiarity_index').notNull().default(0),
    mutual_calibration: boolean('mutual_calibration').notNull().default(false),
    vacuum_volatility:  real('vacuum_volatility').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: conflict_flow_state =====

/**
 * `conflict_flow_state` — per-player × per-rival hydraulic-jump downstream gate (§5.2).
 *
 * PK composite: (player_id, rival_key) — one row per active conflict pair.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * flow_regime: the current hydraulic-jump regime (running | standing). Default 'running'.
 *   Canon: de_escalation_mechanics.md :95.
 *   The flow_regime is visible to the player as a band string (P5 partial exception via projection).
 *
 * downstream_condition: the server-side downstream pressure scalar (§5.2 :104).
 *   The player-facing form is a bucket string derived in CombatProjectionService.
 *   The raw float is NOT forwarded (P6-adjacent — the condition band is derived server-side).
 */
export const conflictFlowState = pgTable(
  'conflict_flow_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    flow_regime: flowRegime('flow_regime').notNull().default('running'),
    downstream_condition: real('downstream_condition').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: dead_hand_cache_state =====

/**
 * `dead_hand_cache_state` — per-player × per-rival dead-hand reserve (§6).
 *
 * PK composite: (player_id, rival_key) — one row per rival's dead-hand posture.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * P6 (SERVER-ONLY — the following are NEVER forwarded to the player):
 *   cache_script_ref:  server-side script reference for the dead-hand activation sequence.
 *   dead_hand_reserve: sequestered budget reserved for the dead-hand activation (real).
 *   trigger_threshold: the per-rival canonical threshold at which dead-hand fires (canon :34-38).
 *
 * intelligence_revealed: the ONLY P5-partial field in this table (canon :81).
 *   When true, the player can see that this rival has a dead-hand cache prepared.
 *   The budget, script, and threshold remain HIDDEN (P6) even after intelligence_revealed=true.
 */
export const deadHandCacheState = pgTable(
  'dead_hand_cache_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // ─── HIDDEN (P6-only) columns ────────────────────────────────────────────────────────────
    cache_script_ref:  varchar('cache_script_ref').notNull().default(''),
    dead_hand_reserve: real('dead_hand_reserve').notNull().default(0),
    trigger_threshold: real('trigger_threshold').notNull().default(0),

    // ─── P5-partial exception (the ONLY projected field) ────────────────────────────────────
    // intelligence_revealed: true → player can see the dead-hand cache exists (canon :81).
    intelligence_revealed: boolean('intelligence_revealed').notNull().default(false),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

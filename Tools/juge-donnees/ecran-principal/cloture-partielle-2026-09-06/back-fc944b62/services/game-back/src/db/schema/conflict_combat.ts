// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 1 (C1) Step 1
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9.1-9.3
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §7 (CombatModule)
//             docs/tech/09_data_model/schema_conflict_combat.md §2 (R9.3 backport — same-commit)
//             — Combat & Escalation B C1 — 2026-06-25 —
//
// TABLES (2 NEW combat entities — migrations 0085-0086):
//
//   combat_operation — per-player × per-rival operational context (friction + ephemeral-mode state).
//     PK: operation_id uuid (standalone PK — no composite, operation is addressed by its own ID).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     base_friction_load / shared_friction_pool: HIDDEN/BO-only (P6 — server-side reals, band derived).
//     ephemeral_mode: boolean — Ephemeral Mode flag (C5 — false until MUSCLE DSL activates it).
//     state_persistence_window_ticks: smallint — DD-SPW retention window (canon default 4 ticks).
//
//   combat_event — per-player event log for assault/hold/degrade_register actions.
//     PK: id uuid.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     Soft-ref discipline:
//       target_block_id: integer nullable — SOFT-REF (NO FK to blocks; 9b discipline).
//       lieutenant_id: uuid nullable — SOFT-REF (no FK; C3 MUSCLE wiring placeholder).
//     target_register_id: erosion_register_id nullable — enum soft-ref from conflict_rival.
//     P6: friction_consumed_bucket / outcome_bucket / heat_increment_bucket are P6-safe bucket strings
//       (raw scalars are server-only; the player sees only the derived band).
//
// ENUMS (2 NEW closed-domain types):
//   combat_event_type  — assault | hold | degrade_register (canon combat_mechanics.md :363)
//   partition_state    — integrated | fragmented (OQ-B2 rival_state combat column — migration 0085)
//
// R9.3: this file matches migrations 0085-0086 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_conflict_combat.md (created same-commit).
// R2.2: base_friction_load / shared_friction_pool are SERVER-ONLY (P6 hidden per design §9.1).
//       friction_consumed_bucket / outcome_bucket / heat_increment_bucket are P6-safe bucket strings.
// Soft-ref discipline: target_block_id has NO FK to blocks. lieutenant_id has NO FK to lieutenant.
//   These follow the corridor_debt.block_id precedent (migration 0076).
// Anti-fabrication (C1): no Math.random(); no non-deterministic value in schema defaults.
// Zero-regression invariant: no existing tables modified. ADDITIVE only.
// HP/damage field names: FORBIDDEN. These tables use friction/outcome/heat bucket vocabulary only.

import {
  pgTable,
  pgEnum,
  uuid,
  real,
  smallint,
  integer,
  boolean,
  bigint,
  varchar,
} from 'drizzle-orm/pg-core';
import { player } from './player';
import { rivalKey, erosionRegisterId, partitionState } from './conflict_rival';

// ===== pgEnums (2 closed-domain enum types for the combat entity) =====

/**
 * `combat_event_type` — the 3 combat event categories.
 * Canon: combat_mechanics.md :363 — the three action types the Muscle archetype can request.
 * assault:          direct kinetic action on a rival position (the primary combat event).
 * hold:             positional hold order (maintain contested block without assault).
 * degrade_register: targeted erosion of a specific rival capacity register.
 */
export const combatEventType = pgEnum('combat_event_type', [
  'assault',
  'hold',
  'degrade_register',
]);

/**
 * `partition_state` — network partition status for the B-owned rival_state column (OQ-B2).
 * Declared in conflict_rival.ts (to avoid a circular import) and re-exported here for
 * consumers of the combat schema module (one-way dep: combat imports from rival, not vice versa).
 * Canon: combat_mechanics.md §2 (Operational Graph — B-owned rival_state combat column).
 */
export { partitionState } from './conflict_rival';

// ===== Table: combat_operation =====

/**
 * `combat_operation` — per-player × per-rival operational context.
 *
 * PK: operation_id uuid (standalone PK — operation is addressed by its own UUID).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * One operational context per (player_id, rival_key) pair. The standalone PK supports
 * future multi-operation addressing (parallel operations — C-cls deferred).
 *
 * P6 (SERVER-ONLY columns — never forwarded to the player client):
 *   base_friction_load: the raw per-rival friction accumulator (band derived server-side).
 *   shared_friction_pool: the cross-rival shared friction pool (band derived server-side).
 *
 * ephemeral_mode: false at C1 (Ephemeral Mode is a C5 mechanic — the column is declared now
 *   so C5 can write it without a schema migration).
 *
 * state_persistence_window_ticks: 4 default (DD-SPW — state-persistence window; canon :34).
 */
export const combatOperation = pgTable('combat_operation', {
  operation_id: uuid('operation_id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  rival_key: rivalKey('rival_key').notNull(),

  // ─── Friction (SERVER-ONLY / P6-hidden) ──────────────────────────────────────────────────
  // base_friction_load: per-rival friction accumulator. Default 0 (no friction at rest).
  // R2.2: raw float is NEVER forwarded to client; the player sees only the FrictionBand bucket.
  base_friction_load:  real('base_friction_load').notNull().default(0),

  // shared_friction_pool: the cross-rival friction band (derived from all active rivals).
  // R2.2: server-only scalar — band derived in CombatProjectionService.
  shared_friction_pool: real('shared_friction_pool').notNull().default(0),

  // ─── Ephemeral mode (C5 — placeholder at C1) ────────────────────────────────────────────
  // false until the Ephemeral Mode DSL action activates it (C5 mechanic).
  ephemeral_mode: boolean('ephemeral_mode').notNull().default(false),

  // ─── State-persistence window (DD-SPW) ──────────────────────────────────────────────────
  // Retention window in ticks for combat_event rows before purge. Default 4 (canon :34).
  state_persistence_window_ticks: smallint('state_persistence_window_ticks').notNull().default(4),
});

// ===== Table: combat_event =====

/**
 * `combat_event` — per-player event log for combat actions.
 *
 * PK: id uuid (standalone — each event has its own identity).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * Soft-ref discipline (9b corridor_debt.block_id precedent — migration 0076):
 *   target_block_id:  integer nullable — SOFT-REF to blocks.id (NO DB FK).
 *   lieutenant_id:    uuid nullable — SOFT-REF to lieutenant (NO DB FK; C3 MUSCLE wiring placeholder).
 *   Both avoid coupling this per-player combat event table to global geography or the
 *   lieutenant per-player table (additive, no implicit cascade).
 *
 * P6 / R2.2: friction_consumed_bucket / outcome_bucket / heat_increment_bucket are P6-safe bucket
 *   strings. The raw scalars (friction consumed, heat increment) live on combat_operation and
 *   the server's in-memory computation. Only the qualitative band string is stored here.
 *
 * target_register_id: erosion_register_id nullable enum — references the 5 erosion registers
 *   (muscle/finance/intel/infrastructure/leadership). Used only for degrade_register events.
 *
 * C1: the event log is declared here. The population logic (requestAssault → insertCombatEvent)
 *   lands at C3 (MUSCLE archetype — OQ-B8 = option (ii): Muscle resolves EXECUTE_DEFAULT).
 */
export const combatEvent = pgTable('combat_event', {
  id: uuid('id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  type: combatEventType('type').notNull(),
  target_rival_key: rivalKey('target_rival_key').notNull(),

  // ─── Target (soft-refs — NO DB FK) ──────────────────────────────────────────────────────
  // target_block_id: the contested block (SOFT-REF to blocks.id — no DB FK, 9b discipline).
  target_block_id: integer('target_block_id'),

  // target_register_id: the erosion register axis (only set for degrade_register events).
  target_register_id: erosionRegisterId('target_register_id'),

  // lieutenant_id: the Muscle lieutenant (SOFT-REF — no DB FK; wired at C3).
  lieutenant_id: uuid('lieutenant_id'),

  // ─── P6-safe bucket strings (raw scalars are server-side only) ───────────────────────────
  // friction_consumed_bucket: qualitative band string for friction drawn for this event.
  friction_consumed_bucket: varchar('friction_consumed_bucket'),

  // outcome_bucket: divergence-table output — the live vocabulary is `CombatOutcomeBucket`
  // (`combat-tunables.ts` COMBAT_OUTCOME_BUCKETS: retreat/hold/contested/advance/breakthrough),
  // written by COMBAT_RESOLUTION_TICK (W6.1 C2). NULL = scheduled, not yet resolved (P3).
  outcome_bucket: varchar('outcome_bucket'),

  // heat_increment_bucket: qualitative heat increment band (P6 — raw heat scalar is hidden).
  heat_increment_bucket: varchar('heat_increment_bucket'),

  // created_at_minute: the game-minute this event was recorded (bigint NOT NULL DEFAULT 0).
  // Provides stable insertion-order sorting — uuid v4 id is random, NOT time-ordered.
  // Set by every INSERT caller (PercolationService, CombatService, OxbowSeveranceService,
  // ErosionRegisterService, CombatTestController.insertEvent).
  // P6: game-minute is server-only (not wall-clock); never forwarded to player.
  // Zero-regression: existing rows default 0. R9.3: mirrored in schema_conflict_combat.md.
  created_at_minute: bigint('created_at_minute', { mode: 'number' }).notNull().default(0),
});

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.1-§4.4
//             docs/tech/09_data_model/schema_conflict_infowar.md (R9.3 backport — same-commit)
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// 4 NEW info-warfare tables (migration 0096):
//   dead_reckoning_belief    — per-player × per-rival 6-component Dead-Reckoning belief vector
//   dual_use_signal_state    — per-player × per-rival Dual-Use Signal interpretation state
//   surveillance_op          — per-player × per-rival Observation-Disturbance state
//   purge_trap_state         — per-player × per-rival Purge Trap infiltration state
//
// R2.2 / P6: raw scalars (detection_probability, rival_interpretation_bias,
//   suspected_infiltration_level) are SERVER-ONLY. Player sees ONLY banded projections.
// REUSE: A's `rivalKey` pgEnum (imported from conflict_rival.ts — NOT redeclared).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only. No existing tables modified.

import {
  pgTable,
  uuid,
  boolean,
  integer,
  bigint,
  real,
  varchar,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { player } from './player';
import { rivalKey } from './conflict_rival';

// ===== dead_reckoning_belief =====

/**
 * `dead_reckoning_belief` — the player's Dead-Reckoning 6-component belief vector for a given rival.
 *
 * PK composite: (player_id, rival_key).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * 6 bands mirror SideChannelSignatureComposite (information_warfare_mechanics.md :43).
 * NOISY ESTIMATES — never the rival's true state (DD-P5-REALIZATION).
 * coil_corruption_applied: true when Coil's deception corrupted the belief vector.
 * last_updated_tick: game-minute of last update (for decay idempotence).
 *
 * R2.2 / P6: never forwarded raw to the player client.
 */
export const deadReckoningBelief = pgTable(
  'dead_reckoning_belief',
  {
    player_id:                     uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key:                     rivalKey('rival_key').notNull(),
    operational_tempo_band:        varchar('operational_tempo_band').notNull().default('low'),
    resource_mobilization_band:    varchar('resource_mobilization_band').notNull().default('dormant'),
    personnel_concentration_band:  varchar('personnel_concentration_band').notNull().default('dispersed'),
    communication_pattern_band:    varchar('communication_pattern_band').notNull().default('silent'),
    territorial_reach_band:        varchar('territorial_reach_band').notNull().default('contracting'),
    logistics_intensity_band:      varchar('logistics_intensity_band').notNull().default('minimal'),
    coil_corruption_applied:       boolean('coil_corruption_applied').notNull().default(false),
    last_updated_tick:             bigint('last_updated_tick', { mode: 'number' }).notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `infowar.repository.ts#upsertBelief` exige déjà `last_updated_tick` dans `BeliefUpdate` (zéro changement de comportement). DDL SQL garde `DEFAULT 0`.
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== dual_use_signal_state =====

/**
 * `dual_use_signal_state` — Dual-Use Signal interpretation state for (player × rival).
 *
 * PK composite: (player_id, rival_key).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * action_type: last recorded action ('neutral' | 'combat' | 'territorial' | 'economic').
 * rival_interpretation_bias: hidden float [0..1] — accumulated attack-bias.
 * interpretation_badge: derived badge ('posture' | 'preparation' | 'ambiguous').
 * last_bpd_prior_mass: BPD totalMass at last interpretation (READ — no BPD write).
 * last_updated_tick: game-minute of last update.
 *
 * R2.2 / P6: rival_interpretation_bias SERVER-ONLY.
 */
export const dualUseSignalState = pgTable(
  'dual_use_signal_state',
  {
    player_id:                  uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key:                  rivalKey('rival_key').notNull(),
    action_type:                varchar('action_type').notNull().default('neutral'),
    rival_interpretation_bias:  real('rival_interpretation_bias').notNull().default(0.0),
    interpretation_badge:       varchar('interpretation_badge').notNull().default('ambiguous'),
    last_bpd_prior_mass:        real('last_bpd_prior_mass').notNull().default(0.0),
    last_updated_tick:          bigint('last_updated_tick', { mode: 'number' }).notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `infowar.repository.ts#upsertDualUseState` exige déjà `last_updated_tick` dans `DualUseUpdate` (zéro changement de comportement). DDL SQL garde `DEFAULT 0`.
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== surveillance_op =====

/**
 * `surveillance_op` — Observation-Disturbance surveillance state for (player × rival).
 *
 * PK composite: (player_id, rival_key).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * active: whether a live surveillance op is running.
 * detection_probability: accumulated probability (incremented per-tick by 0.01).
 * last_detection_game_day: game-day of last detection draw.
 * last_disinfo_landed: whether the last detected run's disinfo landed.
 * last_updated_tick: game-minute of last update.
 *
 * R2.2 / P6: detection_probability SERVER-ONLY.
 */
export const surveillanceOp = pgTable(
  'surveillance_op',
  {
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key:               rivalKey('rival_key').notNull(),
    active:                  boolean('active').notNull().default(false),
    detection_probability:   real('detection_probability').notNull().default(0.0),
    last_detection_game_day: integer('last_detection_game_day').notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `infowar.repository.ts#upsertSurveillanceOp` exige déjà la colonne dans `SurveillanceUpdate` (zéro changement de comportement). DDL SQL garde `DEFAULT 0`.
    last_disinfo_landed:     boolean('last_disinfo_landed').notNull().default(false),
    last_updated_tick:       bigint('last_updated_tick', { mode: 'number' }).notNull(), // W1.1-d C1.2 — idem last_detection_game_day ci-dessus.
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== purge_trap_state =====

/**
 * `purge_trap_state` — Purge Trap embed-presence infiltration state for (player × rival).
 *
 * PK composite: (player_id, rival_key).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * suspected_infiltration_level: hidden float [0..1] (0.15 per signal, purge at >= 0.55).
 * internal_purge_active: rival triggered internal purge (embed presence disrupted).
 * bluff_active: player has a live bluff embed.
 * bluff_discovered: bluff was discovered (credibility damage).
 * last_updated_tick: game-minute of last update.
 *
 * R2.2 / P6: suspected_infiltration_level SERVER-ONLY.
 */
export const purgeTrapState = pgTable(
  'purge_trap_state',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key:                    rivalKey('rival_key').notNull(),
    suspected_infiltration_level: real('suspected_infiltration_level').notNull().default(0.0),
    internal_purge_active:        boolean('internal_purge_active').notNull().default(false),
    bluff_active:                 boolean('bluff_active').notNull().default(false),
    bluff_discovered:             boolean('bluff_discovered').notNull().default(false),
    last_updated_tick:            bigint('last_updated_tick', { mode: 'number' }).notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `infowar.repository.ts#upsertPurgeTrapState` exige déjà `last_updated_tick` dans `PurgeUpdate` (zéro changement de comportement). DDL SQL garde `DEFAULT 0`.
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

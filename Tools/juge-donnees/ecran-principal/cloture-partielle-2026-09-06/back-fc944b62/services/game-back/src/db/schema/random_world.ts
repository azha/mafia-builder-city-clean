// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1 (mig 0128 + schema)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §4 (data model)
//             R9.3: docs/tech/09_data_model/schema_random_world.md (created same-commit)
//             — 04g-B C1 — 2026-07-15
//
// TABLES (3 NEW — migration 0128) + 1 pgEnum:
//
//   random_world_event_active — city-global RANDOM-WORLD event instance ledger (design §4.1). The
//     world events arrive TO the city (inversion key canon, random_world_templates.md:20 invariant
//     3) — one shared active-event set, same city-global posture as political_event_active /
//     live_ops_event_active. `template_id` is a soft-ref (text) to the static
//     `RandomWorldTemplateRegistry` TS entry (random-world-template-registry.ts, C1 — 14 entries,
//     no DB-side RandomWorldTemplate table). `status` is a genuine terminal write ('active' →
//     'resolved') — NOT a NULL-expiry proxy: permanent (`permanent_residue`) and state-driven
//     (`quorum_on_stadler_row`) events stay `active` forever with `expires_at_game_day` NULL (D13).
//     `parent_event_id` chains successor templates (`apparent_recovery` ← a resolved cohesion-drop
//     parent; `permanent_residue` ← a resolved `halgren_tannery_hailstorm`).
//
//   coupling_discovery_cascade — per-player Sideways-Failure coupling EXPOSURE ledger (design §4.2).
//     The row itself IS the "coupling exposed" flag (canon: "whether discovered couplings can later
//     be forgotten (default never)" — never purged, never mutated after insert, C3 scope).
//     UNIQUE (player_id, pair_key): a player discovers a given `TightCouplingPair` at most once.
//
//   random_world_daily_run — the daily-tick claim + diagnostics + rolling state ledger (design §4.3,
//     mirrors `PoliticalEventRepository.claimGameDay`'s S10 idempotency shape). PK `game_day`
//     (not uuid) — the claim IS the row (`INSERT … ON CONFLICT DO NOTHING`, C2 phase 0).
//     `quorum_adoption` / `saturated_district_ids` are ROLLING per-district vectors read back by the
//     next day's tick (D10 — no dedicated 18-float table for a vector this small; C2/C3/C4 scope).
//
// ENUM (1 NEW — migration 0128):
//   random_world_event_status — active | resolved (design §4.1, D13).
//
// R9.3: this file matches migration 0128 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_random_world.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults anywhere in this file.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0128's PART 1 (this
//   file). The effect_modifier 3rd-parent surgery (DD-RW1, design §3.3/§4.4) lives in
//   effect_modifier.ts (same migration 0128, PART 2 — additive-only touch there too, mirrors DD-B2).
// FK convention: `district_id` → `districts(id)` ON DELETE RESTRICT (NOT CASCADE — districts are
//   GLOBAL static rows, effectively never deleted; RESTRICT is deliberate here, stronger than the
//   ambient_world.ts CASCADE precedent, because an accidental district delete must never silently
//   cascade-delete a LIVE world event — design §4.1). `player_id` → `player(player_id)` ON DELETE
//   CASCADE (R9.3 per-player convention — a player delete removes their own discovery ledger rows).
//   `parent_event_id`/`source_event_id` self/cross-reference `random_world_event_active(id)`.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { districts } from './world_geography';
import { player } from './player';

// ===== Enum PG natif (1 NEW — migration 0128) =====

/** active → resolved (design §4.1/D13). Permanent (`permanent_residue`) and state-driven
 *  (`quorum_on_stadler_row`) events stay `active` with `expires_at_game_day` NULL — `resolved` is a
 *  genuine terminal write, never inferred from a NULL expiry. */
export const randomWorldEventStatus = pgEnum('random_world_event_status', ['active', 'resolved']);

// ===== Table 1: random_world_event_active — the RANDOM-WORLD event ledger (migration 0128) =====
export const randomWorldEventActive = pgTable(
  'random_world_event_active',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Soft-ref (text) to the static `RandomWorldTemplateRegistry` entry (e.g.
     *  'halgren_tannery_hailstorm') — no DB FK, same posture as political_event_active.event_id. */
    template_id: text('template_id').notNull(),
    /** The event's PRIMARY district — all 6 LIVE templates are district-anchored (design §3.5).
     *  RESTRICT (not CASCADE, design §4.1 note above). */
    district_id: integer('district_id').notNull().references(() => districts.id, { onDelete: 'restrict' }),
    status: randomWorldEventStatus('status').notNull().default('active'),
    started_at_game_day: integer('started_at_game_day').notNull(),
    /** NULL = permanent (permanent_residue) OR state-driven (quorum) — canon gdd/15:1853. */
    expires_at_game_day: integer('expires_at_game_day'),
    /** 0..1 normalized (design §3.4) — `numeric()` string-mode, mirrors `effect_modifier.magnitude`'s
     *  no-float-drift choice. Exposed to projections (bands, R2.2) and BO (raw, diagnostic). */
    recovery_curve_position: numeric('recovery_curve_position').notNull().default('0'),
    /** Chains successor templates (apparent_recovery ← resolved cohesion-drop parent; permanent_residue
     *  ← resolved halgren_tannery_hailstorm). Self-reference — standard Drizzle lazy-callback idiom. */
    parent_event_id: uuid('parent_event_id')
      .references((): AnyPgColumn => randomWorldEventActive.id, { onDelete: 'set null' }),
    /** Per-template typed state (TS side): ScarPolygon block ids, secondary_fires_at_game_day/
     *  secondary_district_id/pair_key, funeral_attended_by[], fork outcome, materialized seeded draws
     *  (permanent_residue levers/signs) — design §4.1. */
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // resolve-expired sweep (C2 phase 1) + BO diagnostic.
    index('random_world_event_active_status_idx').on(t.status),
    // successor eligibility windows (permanent_residue, apparent_recovery — C2/C4) + BO per-template history.
    index('random_world_event_active_template_started_idx').on(t.template_id, t.started_at_game_day),
    // the D6 per-district 30-day activation cooldown gate (C2 phase 3).
    index('random_world_event_active_district_started_idx').on(t.district_id, t.started_at_game_day),
  ],
);

// NOTE: no reverse `many(couplingDiscoveryCascade)` side declared here (mirrors live_ops_event_active.ts's
// own documented precedent) — no consumer in this codebase uses Drizzle's relational query API
// (`db.query.<table>.findMany({with})`) on either table today, and `couplingDiscoveryCascade` is
// declared LATER in this same file (a forward reference here would be a needless TDZ risk for a
// typing convenience nothing consumes).
export const randomWorldEventActiveRelations = relations(randomWorldEventActive, ({ one }) => ({
  district: one(districts, { fields: [randomWorldEventActive.district_id], references: [districts.id] }),
  parentEvent: one(randomWorldEventActive, {
    fields: [randomWorldEventActive.parent_event_id],
    references: [randomWorldEventActive.id],
    relationName: 'random_world_event_successor',
  }),
}));

export type RandomWorldEventActiveRow = typeof randomWorldEventActive.$inferSelect;
export type RandomWorldEventActiveInsert = typeof randomWorldEventActive.$inferInsert;

// ===== Table 2: coupling_discovery_cascade — per-player exposure ledger (migration 0128, C3 scope) =====
export const couplingDiscoveryCascade = pgTable(
  'coupling_discovery_cascade',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    /** Soft-ref (text) to the static `tight-coupling-pairs.ts` registry (e.g. 'erlang_stash__deal_lek'). */
    pair_key: text('pair_key').notNull(),
    /** The sideways_failure event whose secondary shift exposed this coupling. */
    source_event_id: uuid('source_event_id')
      .notNull()
      .references(() => randomWorldEventActive.id, { onDelete: 'cascade' }),
    /** The axis of the 30-day rolling cascade cap (design §3.6). */
    discovered_at_game_day: integer('discovered_at_game_day').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Exposure permanente: a player discovers a given pair at most once (design §4.2).
    uniqueIndex('coupling_discovery_cascade_player_pair_unique').on(t.player_id, t.pair_key),
    // The E2E-RW-02 30-day rolling cascade cap count (C3).
    index('coupling_discovery_cascade_player_discovered_idx').on(t.player_id, t.discovered_at_game_day),
  ],
);

export const couplingDiscoveryCascadeRelations = relations(couplingDiscoveryCascade, ({ one }) => ({
  player: one(player, { fields: [couplingDiscoveryCascade.player_id], references: [player.player_id] }),
  sourceEvent: one(randomWorldEventActive, {
    fields: [couplingDiscoveryCascade.source_event_id],
    references: [randomWorldEventActive.id],
  }),
}));

export type CouplingDiscoveryCascadeRow = typeof couplingDiscoveryCascade.$inferSelect;
export type CouplingDiscoveryCascadeInsert = typeof couplingDiscoveryCascade.$inferInsert;

// ===== Table 3: random_world_daily_run — claim + diagnostics + rolling state (migration 0128) =====
export const randomWorldDailyRun = pgTable('random_world_daily_run', {
  /** PK — the claim IS the row (`INSERT … ON CONFLICT DO NOTHING`, S10 mirror, C2 phase 0). */
  game_day: integer('game_day').primaryKey(),
  /** E2E-RW-04 batch observability (design §3.2 phase 3, ≤ `daily_activation_evaluation_batch_size`). */
  evaluated_template_count: smallint('evaluated_template_count').notNull().default(0),
  activation_count: smallint('activation_count').notNull().default(0),
  /** E2E-RW-02 "7 gated attempts" observable (design §3.6 — silently-gated but COUNTED cascade attempts). */
  gated_cascade_attempts: smallint('gated_cascade_attempts').notNull().default(0),
  /** The stash-FULL districts observed THIS run — the P1 pair's "sustained 2-day" window reads the
   *  PRIOR day's row (design §3.6). */
  saturated_district_ids: jsonb('saturated_district_ids').notNull().default(sql`'[]'::jsonb`),
  /** Rolling per-district adoption vector for quorum_on_stadler_row (design §3.5.6/D10) — read back +
   *  written forward by the SAME phase-2 step each tick, no dedicated 18-float table. */
  quorum_adoption: jsonb('quorum_adoption').notNull().default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RandomWorldDailyRunRow = typeof randomWorldDailyRun.$inferSelect;
export type RandomWorldDailyRunInsert = typeof randomWorldDailyRun.$inferInsert;

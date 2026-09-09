// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.2 (Composition Telegraph)
//             docs/tech/09_data_model/schema_market_buyer_roster_entry.md §2 (R9.3 backport)
//             — D1b C3 — 2026-06-16
//
// `buyer_roster_entry` — rolling 24-slot buyer attribution roster per (player_id × region_id).
// `buyer_roster_daily_state` — per-player/region daily inference result (q_inferred — server-side only, R2.2).
//
// R9.3: this file matches the SQL migration 0039_market_buyer_roster_entry.sql byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_market_buyer_roster_entry.md.

import { pgTable, uuid, integer, smallint, real, timestamp, check, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { player } from './player';

// ===== Table: buyer_roster_entry — rolling 24-slot buyer attribution per player × region =====
//
// Rolling slot assignment: slot_index = attributed_at_tick % compositionRosterSlots (modular).
// Each slot holds exactly one entry; the slot with the same modular index is overwritten on the
// next cycle after 24 attributions (oldest entry → overwritten naturally).
//
// PK: composite (player_id, region_id, slot_index).
// FK: player_id → player(player_id) ON DELETE CASCADE.
// region_id = district_id used as market region id in D1b.
// slot_index CHECK: < 48 to cover the full tunable range (12..48) for compositionRosterSlots.
//   The runtime modular index is computed from marketTunables.compositionRosterSlots; the DB
//   constraint is a conservative guard (any slot within 0..47 is valid — flagged as design decision).
//   [DESIGN DECISION — SLOT_CHECK]: DB CHECK uses < 48 (tunable max) not < 24 (current default)
//   to avoid a constraint violation if the tunable is raised. The guard is intentionally looser than
//   the current registry default (market_mechanics.md:89 "2 B/slot × 24 slots = 64 B").
export const buyerRosterEntry = pgTable(
  'buyer_roster_entry',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    region_id: integer('region_id').notNull(),
    slot_index: smallint('slot_index').notNull(),
    buyer_tier: smallint('buyer_tier').notNull(),
    attributed_at_tick: integer('attributed_at_tick').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.region_id, table.slot_index] }),
    slot_index_chk: check(
      'buyer_roster_entry_slot_index_chk',
      sql`${table.slot_index} >= 0 AND ${table.slot_index} < 48`,
    ),
    buyer_tier_chk: check(
      'buyer_roster_entry_buyer_tier_chk',
      sql`${table.buyer_tier} >= 1 AND ${table.buyer_tier} <= 4`,
    ),
  }),
);

// ===== Table: buyer_roster_daily_state — per player × region daily inference result =====
//
// Updated by the daily inference tick (CompositionTelegraphService.runDailyInferenceTick → NIGHTLY/4).
// q_inferred: server-side ONLY (R2.2 P5 invariant — NEVER forwarded to client).
//   The player projection = q_inferred_bucket (via MarketProjectionService.toBuckets).
// last_day_id: the in-game day for which q_inferred was last computed (C4 — same dayId → same result).
export const buyerRosterDailyState = pgTable(
  'buyer_roster_daily_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    region_id: integer('region_id').notNull(),
    /**
     * q_inferred — the daily inferred buyer-quality score (server-side ONLY — R2.2 P5 invariant).
     * Computed as: q_inferred = Σ(tier_w[slot.tier]) / N + ε  (uniform recency weights, Box-Muller noise).
     * Default 2.0 — neutral (mid-tier weighted average before any roster data).
     * NEVER forwarded to the client; only q_inferred_bucket is exposed.
     */
    q_inferred: real('q_inferred').notNull().default(2.0),
    /** last_day_id — the in-game day for which q_inferred was last computed. Default 0. */
    last_day_id: integer('last_day_id').notNull().default(0),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.region_id] }),
  }),
);

// ===== Inferred Drizzle types =====
export type BuyerRosterEntryRow = typeof buyerRosterEntry.$inferSelect;
export type BuyerRosterEntryInsert = typeof buyerRosterEntry.$inferInsert;
export type BuyerRosterDailyStateRow = typeof buyerRosterDailyState.$inferSelect;
export type BuyerRosterDailyStateInsert = typeof buyerRosterDailyState.$inferInsert;

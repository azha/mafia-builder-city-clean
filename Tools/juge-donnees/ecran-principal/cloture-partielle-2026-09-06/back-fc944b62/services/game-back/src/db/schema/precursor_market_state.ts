// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 2 (B2)
//             docs/tech/04a_operational_systems/precursors_supply_chain.md §7 Table 1
//             docs/tech/09_data_model/schema_precursor_market_state.md §2 (R9.3 backport)
//             — D1c B2 — 2026-06-16
//
// TABLES:
//   precursor_market_state — 1 row per precursor_type (GLOBAL, non per-player — DD-ENT).
//     Carries the server-side hidden market state for the precursor buy market:
//       price_trend: UP/STABLE/DOWN — the endogenous demand-driven trend (R2.2 — banded, never raw).
//       demand_accumulator: rolling order-volume accumulator (hidden server-side, R2.2).
//       scarcity_active: boolean flag set by SupplyDisruptionEvent (DD-S).
//       disruption_event_id: uuid of the active SupplyDisruptionEvent (null if no disruption).
//       last_inference_day: idempotence guard for the daily inferDailyTrend tick.
//     PK: precursor_type (1 row per enum member — global city-wide state, not per-player).
//     Seeded at migration time with STABLE/0/false for pyralin/thalmite/garnet_salt.
//
//   precursor_supplier_pressure — per player × supplier pressure side-table (DD-ENT/DD-SP).
//     Carries the observable-only pressure counter per (player_id, supplier_id).
//     supplier_id is a UUID identity (no FK to a supplier table — supplier entity deferred, flagged
//     for reviewer⊥: no production supplier table exists yet; see §4 Décisions DD-ENT/DD-SP).
//     PK: composite (player_id, supplier_id).
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//
// R9.3: this file matches the SQL migrations 0042 + 0043 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_precursor_market_state.md.
// R2.2: demand_accumulator, price_trend (scalaire), pressure_counter are NEVER forwarded to the client.
//       Player surface: price_trend_bucket (banded), scarcity_active (flag), supplier_pressure_bucket (banded).

import {
  pgTable,
  uuid,
  integer,
  real,
  boolean,
  timestamp,
  primaryKey,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { precursorType } from './operational_chain';
import { player } from './player';

// ===== Enum: price_trend — UP/STABLE/DOWN =====
//
// The server-side price-trend enum for the precursor buy market.
// NEVER forwarded raw to the client (R2.2) — projected as price_trend_bucket via PrecursorMarketStateService.
// Members: UP / STABLE / DOWN (precursors_supply_chain.md:129).
export const priceTrend = pgEnum('price_trend', ['UP', 'STABLE', 'DOWN']);

// ===== Table 1: precursor_market_state — 1 row per precursor type (global, not per-player) =====
//
// DD-ENT: global because citywide demand is a global aggregate of the type
//   (precursors_supply_chain.md:102 "somme de tous les gangs") — exactly as district_capacity_state
//   is 1 row per district (schema_market_district_capacity_state.md §4 D1).
// The 3 Brindle precursor types (pyralin/thalmite/garnet_salt) are seeded at migration time
//   with the neutral baseline: price_trend=STABLE, demand_accumulator=0, scarcity_active=false.
//   This is the zero-regression floor B6's selling rewire depends on ($150/unit = STABLE + no scarcity).
// Extensible to secondary precursors (verdant_root_extract/lull_resin/glass_lily) by inserting new rows.
//
// R2.2 HARD INVARIANT: demand_accumulator, price_trend (scalaire), scarcity_active in context of
//   hidden accumulator are NEVER forwarded raw to the client.
//   Player surface: price_trend_bucket via PrecursorMarketStateService.toProjection() (R2.2 P5 wall).
//   BO true-state: GET /admin/precursors/market-state (role ops, full scalars visible for live-ops).
export const precursorMarketState = pgTable('precursor_market_state', {
  /**
   * precursor_type — the precursor type enum value (PK).
   * REUSE the existing `precursor_type` enum (operational_chain.ts — 6 members).
   * One state row per precursor type (global, not per-player — DD-ENT).
   * Seeded for pyralin/thalmite/garnet_salt at migration time (the 3 Brindle precursors).
   */
  precursor_type: precursorType('precursor_type').primaryKey(),

  /**
   * price_trend — UP / STABLE / DOWN.
   * The endogenous demand-driven trend (precursors_supply_chain.md:129).
   * Default: STABLE (the neutral baseline / zero-regression invariant §0.2).
   * Server-side only — projected as price_trend_bucket (R2.2 P5).
   */
  price_trend: priceTrend('price_trend').notNull().default('STABLE'),

  /**
   * demand_accumulator — rolling order-volume accumulator (DD-T).
   * B3 will populate/update this on the daily inferDailyTrend tick.
   * Hidden server-side — NEVER forwarded to the client (R2.2).
   * Initialized to 0 at seed time (neutral baseline).
   */
  demand_accumulator: real('demand_accumulator').notNull().default(0),

  /**
   * scarcity_active — boolean flag set by SupplyDisruptionEvent (DD-S).
   * When true, the scarcity multiplier is applied to the unit price (B4).
   * Default: false (no disruption — neutral baseline).
   */
  scarcity_active: boolean('scarcity_active').notNull().default(false),

  /**
   * disruption_event_id — uuid of the active SupplyDisruptionEvent (null if no disruption).
   * Nullable: null = no active disruption. Set by B4 (scarcity coupling).
   * Links to the world_events engine (GDD §G24, future).
   */
  disruption_event_id: uuid('disruption_event_id'),

  /**
   * disruption_start_day — game-day on which the active SupplyDisruptionEvent started.
   * Null if no active disruption. Set by B4 `onSupplyDisruption`; used to compute expiry
   * (currentDay - disruption_start_day >= supply_disruption_duration_days → clear scarcity_active).
   * Cleared (set to null) together with scarcity_active + disruption_event_id on expiry.
   */
  disruption_start_day: integer('disruption_start_day'),

  /**
   * last_inference_day — game-day of the last successful inferDailyTrend tick.
   * Idempotence guard: B3 checks dayId != last_inference_day before running inference.
   * Initialized to 0 at seed time (no inference run yet).
   */
  last_inference_day: integer('last_inference_day').notNull().default(0),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== Table 2: precursor_supplier_pressure — per player × supplier (DD-ENT / DD-SP) =====
//
// DD-ENT/DD-SP: supplier pressure is player-scoped + supplier-scoped → a SEPARATE side-table
//   (the global precursor_market_state is NOT per-player; the pressure is per-player).
//   Pattern: side-table following (player_id × supplier_id), analogous to lot_handling_vector.
//
// ⚠️ supplier_id FK NOTE (flagged for reviewer⊥):
//   No production supplier table exists yet in the schema. The supplier entity (SupplierDirectoryEntry
//   in the NestJS domain model, precursors_supply_chain.md:130) is not yet persisted as a DB table.
//   `supplier_id` is therefore an HONEST UUID identity column that the observable bucket keys off
//   (not a FK to a fabricated table). The supplier table will be added when the full supplier
//   directory is persisted; this column will become a proper FK at that time.
//   Reference: precursors_supply_chain.md:128-129 ("supplier directory").
//
// R2.2: pressure_counter is hidden server-side (analogous to reputation_risk_counter :127,256).
//   Player surface: supplier_pressure_bucket (FRESH/USED/STRAINED) via SupplierPressureService.
//   BO true-state: GET /admin/precursors/market-state.
//
// PK: composite (player_id, supplier_id) — one pressure row per (player × supplier) pair.
// FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
export const precursorSupplierPressure = pgTable(
  'precursor_supplier_pressure',
  {
    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Convention: player_id uuid FK + INDEX (schema_player.md §5.1, schema_operational_chain.md:128).
     * CASCADE: deleting a player removes all their supplier pressure rows (FK integrity).
     */
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * supplier_id — the supplier identifier (UUID identity — no FK to a supplier table yet).
     * See ⚠️ note above: no production supplier entity table exists; this is an honest UUID
     * identity column. The supplier directory (SupplierDirectoryEntry) is a NestJS domain entity.
     * Flagged for reviewer⊥: no fabricated supplier table.
     */
    supplier_id: uuid('supplier_id').notNull(),

    /**
     * pressure_counter — the observable-only pressure accumulator (hidden server-side, R2.2).
     * Analogous to reputation_risk_counter (precursors_supply_chain.md:127,256).
     * NEVER forwarded raw to the client. Player sees SupplierPressureBucket (FRESH/USED/STRAINED).
     * Default: 0 (no pressure — neutral baseline).
     * B5 will implement the accumulation logic and STRAINED threshold.
     */
    pressure_counter: integer('pressure_counter').notNull().default(0),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /**
     * PK: composite (player_id, supplier_id) — one pressure row per (player × supplier) pair.
     */
    pk: primaryKey({ columns: [table.player_id, table.supplier_id] }),

    /**
     * player_id INDEX — FK convention (schema_player.md §5.1 + schema_operational_chain.md:128).
     * Enables efficient lookup of all supplier pressure rows for a given player.
     */
    player_id_idx: index('precursor_supplier_pressure_player_id_idx').on(table.player_id),
  }),
);

// ===== Inferred Drizzle types =====
export type PrecursorMarketStateRow = typeof precursorMarketState.$inferSelect;
export type PrecursorMarketStateInsert = typeof precursorMarketState.$inferInsert;
export type PrecursorSupplierPressureRow = typeof precursorSupplierPressure.$inferSelect;
export type PrecursorSupplierPressureInsert = typeof precursorSupplierPressure.$inferInsert;

// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §10 -- P3-C C1 (mig 0125 prov.) --
//
// `supply_chain_legs` + `supply_node_pressure` — the 2 NEW core-loops tables P3-C C1 adds (design §10,
// D2/D7). The 3rd piece of this chunk's data model (the additive `route` columns, design §7.1) lives
// on `route` itself — see `operational_chain.ts`'s own header note pointing back here, and
// `schema_operational_chain.md §7.22` for the ch09 addendum.
//
// `supply_chain_legs` (Loop 5 — Mycelial Ledger, per-LEG debt): D2 (decisions §1.2, sub-décision #4
// RATIFIED) — a leg is the LOGICAL EDGE (player, origin_building, destination_building) that real
// throughput has crossed, NOT a route (many routes/versions/stances can serve the same edge) and NOT a
// corridor_debt block (different signal, geography vs network topology, OQ-DB3 no cross-signal
// contamination). `UNIQUE (player_id, origin_building_id, destination_building_id)` is I1 (design §15)
// — the C2 `LegRepository` upsert's ON CONFLICT is the SOLE arbiter of identity, never a
// SELECT-then-INSERT race. `debt_load`'s floor (>= 0) is a DB CHECK; its ceiling
// (`core_loops.mycelial_debt_cap`) is an application-layer LEAST() clamp, NOT a DB CHECK — the SAME
// deliberate asymmetry `lieutenant_flag_state.credibility_tokens` shipped (mig 0123): a DB constant
// would either block legitimate tunable raises or admit stale caps. `maintenance_mode` /
// `maintenance_completes_at_tick` pair 1:1 EXCEPT for `reroute_bypass` (a STATE, not a timed job —
// design §5.4 "durée : état, pas durée", exit is `debt_load <= bypass_resume_threshold`, never a
// deadline) — the 3-way CHECK carves that mode out explicitly (migration 0125, verbatim below).
//
// `supply_node_pressure` (Loop 3 — Backpressure Trace, per-NODE pressure): D7 (decisions §1.7) — a
// SEPARATE 1-1 table (PK `(player_id, building_id)`, the `corridor_debt` shape) rather than an ALTER of
// `building_operational_state` — ZERO ALTER of tables the in-flight 04f-B lot owns (rebase-aware).
// `backpressure_index` gets BOTH bounds as a DB CHECK (I5, design §15) — unlike `debt_load`, canon
// gives backpressure a hard ceiling of 1.0 with no tunable-raise tension, so floor AND ceiling are
// DB-enforced here. `arrow_to_building_id` is a SOFT-REF (no FK) — mirrors `corridor_debt.block_id`'s
// own soft-ref convention (mig 0076): the pointed-to building is always a REAL FK'd building elsewhere
// (via the leg it arrived through), so a second FK here would be redundant DDL, not additional safety.
import {
  pgTable,
  uuid,
  real,
  smallint,
  bigint,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';        // convention canonique FK player_id REUSE schema_player.md §5.1
import { building } from './city_state';  // FK logique building_id REUSE schema_city_state.md §2

// ===== Enum PG natif =====
// mycelial_maintenance_mode — design §5.4 verbatim, 3 membres — the Loop 5 maintenance verb's 3 canon
// modes (D-register D4): QUICK_PATCH (fast, partial clear) / STRUCTURAL_REINFORCE (slow, full clear,
// governed — code 10 catalogue) / REROUTE_BYPASS (state, decay-driven exit).
export const mycelialMaintenanceMode = pgEnum('mycelial_maintenance_mode', [
  'quick_patch',
  'structural_reinforce',
  'reroute_bypass',
]);

// ===== Table : supply_chain_legs — design §10.1 verbatim (mig 0125 prov.) =====
export const supplyChainLegRow = pgTable(
  'supply_chain_legs',
  {
    leg_id:                        uuid('leg_id').primaryKey().defaultRandom(),                                                          // design §10.1 — uuid PK
    player_id:                     uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),              // design §10.1 — FK CASCADE
    origin_building_id:            uuid('origin_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // design §10.1 — FK CASCADE
    destination_building_id:       uuid('destination_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // design §10.1 — FK CASCADE
    debt_load:                     real('debt_load').notNull().default(0),                                                                // design §10.1 — server-only R2.2. CHECK >= 0 (I2 floor); ceiling = app LEAST(core_loops.mycelial_debt_cap), NOT a DB CHECK.
    stress_streak:                 smallint('stress_streak').notNull().default(0),                                                        // design §5.5 — consecutive NIGHTLY stressed evals (Exception trigger at >= 2). CHECK >= 0 (non-negative counter).
    last_throughput_tick:          bigint('last_throughput_tick', { mode: 'number' }),                                                     // design §5.1 — game-minute of last accrual (nullable — never-throughput leg).
    last_decay_eval_tick:          bigint('last_decay_eval_tick', { mode: 'number' }),                                                     // design §5.2 — game-minute of last NIGHTLY decay eval (nullable — never-evaluated leg).
    maintenance_mode:              mycelialMaintenanceMode('maintenance_mode'),                                                            // design §5.4 — NULL = no active job. CHECK-paired with maintenance_completes_at_tick (see migration).
    maintenance_completes_at_tick: bigint('maintenance_completes_at_tick', { mode: 'number' }),                                            // design §5.4 — downtime-armed job completion tick (the 04f-A `maintenance_completes_at_day` shape). NULL for reroute_bypass (state, not timer).
    bypassed:                      boolean('bypassed').notNull().default(false),                                                           // design §5.4 — REROUTE_BYPASS active state (dispatch on this pair -> 409 LEG_RESTING).
    created_at:                    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),                                 // design §10.1 — NOT NULL DEFAULT now()
  },
  (table) => ({
    // (player_id): per-player leg listing / decay-sweep scan (mirrors corridor_debt_player_idx, mig 0076).
    player_idx: index('supply_chain_legs_player_idx').on(table.player_id),
    // Partial index on maintenance_mode IS NOT NULL — the MYCELIAL_MAINTENANCE_ADVANCE (MINUTE/27 prov.)
    // job-completion scan (design §11).
    maintenance_pending_idx: index('supply_chain_legs_maintenance_pending_idx')
      .on(table.maintenance_completes_at_tick)
      .where(sql`${table.maintenance_mode} IS NOT NULL`),
    // UNIQUE (player_id, origin_building_id, destination_building_id) — I1 (design §15): the leg
    // identity invariant, DB-enforced FROM THE START (mirrors `routine_items_dedup_unique`'s own
    // multi-column uniqueIndex convention, flag_discipline.ts). The C2 `LegRepository` upsert's ON
    // CONFLICT targets THIS exact constraint as the SOLE arbiter of identity.
    identity_unique: uniqueIndex('supply_chain_legs_identity_unique')
      .on(table.player_id, table.origin_building_id, table.destination_building_id),
  }),
);

export const supplyChainLegRelations = relations(supplyChainLegRow, ({ one }) => ({
  player: one(player, { fields: [supplyChainLegRow.player_id], references: [player.player_id] }),
  origin: one(building, { fields: [supplyChainLegRow.origin_building_id], references: [building.building_id], relationName: 'supply_chain_leg_origin' }),
  destination: one(building, { fields: [supplyChainLegRow.destination_building_id], references: [building.building_id], relationName: 'supply_chain_leg_destination' }),
}));

// ===== Table : supply_node_pressure — design §10.2 verbatim (mig 0125 prov.) =====
export const supplyNodePressureRow = pgTable(
  'supply_node_pressure',
  {
    player_id:              uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),               // design §10.2 — FK CASCADE, PK component
    building_id:             uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),         // design §10.2 — FK CASCADE, PK component
    backpressure_index:      real('backpressure_index').notNull().default(0),                                                       // design §10.2 — server-only R2.2. CHECK 0 <= x <= 1 (I5, BOTH bounds DB-enforced).
    is_blocked_output:       boolean('is_blocked_output').notNull().default(false),                                                 // design §6.1/§10.2 — this node is a diagnosed blocked-output source this tick.
    blocked_sources:         jsonb('blocked_sources').notNull().default(sql`'[]'::jsonb`),                                          // design §10.2 — active BlockedOutputSource tags (BO diagnostic).
    arrow_to_building_id:    uuid('arrow_to_building_id'),                                                                          // design §10.2 — SOFT-REF (no FK, mirrors corridor_debt.block_id mig 0076). Points toward the pressure source.
    source_distance_hops:    smallint('source_distance_hops'),                                                                      // design §10.2 — BFS hop distance from source (nullable — never-propagated node).
    last_propagation_tick:   bigint('last_propagation_tick', { mode: 'number' }),                                                    // design §10.2 — idempotence guard (I5: one propagation application per tick).
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.building_id] }),
    // Partial index on is_blocked_output — the BACKPRESSURE_UPDATE (MINUTE/26 prov.) per-tick scan
    // (design §6.2/§11): organic no-op for players with no blocked output this tick.
    blocked_idx: index('supply_node_pressure_blocked_idx')
      .on(table.player_id)
      .where(sql`${table.is_blocked_output} = true`),
  }),
);

export const supplyNodePressureRelations = relations(supplyNodePressureRow, ({ one }) => ({
  player:   one(player,   { fields: [supplyNodePressureRow.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [supplyNodePressureRow.building_id], references: [building.building_id] }),
}));

// ===== Types inférés Drizzle =====
export type SupplyChainLegRow      = typeof supplyChainLegRow.$inferSelect;
export type SupplyChainLegInsert   = typeof supplyChainLegRow.$inferInsert;
export type SupplyNodePressureRow    = typeof supplyNodePressureRow.$inferSelect;
export type SupplyNodePressureInsert = typeof supplyNodePressureRow.$inferInsert;

// ===== Enum TS mirror PG natif =====
export type MycelialMaintenanceModeEnumTs = (typeof mycelialMaintenanceMode.enumValues)[number];
// 'quick_patch' | 'structural_reinforce' | 'reroute_bypass'

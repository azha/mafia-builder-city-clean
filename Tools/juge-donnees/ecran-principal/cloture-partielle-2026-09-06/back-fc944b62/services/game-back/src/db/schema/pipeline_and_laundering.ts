// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md§2 -- session:2026-06-02 --
import { pgTable, uuid, integer, smallint, real, jsonb, timestamp, primaryKey, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';       // Task 3 — convention canonique FK player_id REUSE §5.1
import { building } from './city_state'; // Task 7 — FK logique building_id (laundering_nodes + safehouses)

// ===== Enums PG natifs (domaines fermés GDD-verbatim) =====
// raid_drain_policy — GDD L289 enum('top_down', 'random', 'bottom_up') verbatim
// (membres DB lowercase ; mapping runtime UPPERCASE `RaidDrainPolicy` REUSE 04/system_9_erlang_stash)
export const raidDrainPolicy = pgEnum('raid_drain_policy', ['top_down', 'random', 'bottom_up']);

// ===== Table 1 : laundering_nodes — GDD L261-270 verbatim =====
// PK simple node_id uuid. FK player_id NOT NULL CASCADE (override : ajouté pour invariant 1-N tightly-coupled REUSE Task 3 §5.2).
// FK building_id (Task 7 — DEFERRED post-merge migration ultérieure ou si Task 7 mergé avant).
export const launderingNode = pgTable(
  'laundering_nodes',
  {
    node_id:                  uuid('node_id').primaryKey().defaultRandom(),                                              // GDD L262 — uuid primary key (UUIDv4 day-1 cf. Task 3 §7.2)
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // GDD L263 verbatim FK
    building_id:               uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // GDD L264 + override NOT NULL (un nœud sans building n'a aucun sens) ; CASCADE depuis building (suppression d'un building → drop des nœuds qu'il porte)
    stage_index:               integer('stage_index').notNull(),                                                          // GDD L265 (override NOT NULL — index dans le pipeline jamais NULL)
    throughput_in_per_hour:    real('throughput_in_per_hour').notNull().default(0),                                       // GDD L266 — float BO-only
    dwell_time_hours:          real('dwell_time_hours').notNull().default(0),                                             // GDD L267 — float BO-only
    buffer_load:               real('buffer_load').notNull().default(0),                                                  // GDD L268 — float [0..1] BO-only
    cleanliness_at_output:     real('cleanliness_at_output').notNull().default(0),                                        // GDD L269 — float [0..1] BO-only (projeté en CleanlinessBucket)
  },
  (table) => ({
    player_idx:                index('laundering_nodes_player_idx').on(table.player_id),
    player_stage_idx:          index('laundering_nodes_player_stage_idx').on(table.player_id, table.stage_index),
    player_building_idx:       index('laundering_nodes_player_building_idx').on(table.player_id, table.building_id),
  }),
);

export const launderingNodeRelations = relations(launderingNode, ({ one, many }) => ({
  player: one(player, {
    fields: [launderingNode.player_id],
    references: [player.player_id],
  }),
  building: one(building, {
    fields: [launderingNode.building_id],
    references: [building.building_id],
  }),
  // back-refs vers les arêtes sortantes/entrantes + tail-risk
  edgesFrom: many(launderingEdge, { relationName: 'edges_from_node' }),
  edgesTo:   many(launderingEdge, { relationName: 'edges_to_node' }),
  tailRisk:  many(tailRiskEstimate),
}));

// ===== Table 2 : laundering_edges — GDD L272-277 verbatim =====
// PK simple edge_id uuid. FK player_id NOT NULL CASCADE (override §1).
// FK from_node + to_node CASCADE.
export const launderingEdge = pgTable(
  'laundering_edges',
  {
    edge_id:                   uuid('edge_id').primaryKey().defaultRandom(),                                              // GDD L273 — uuid primary key
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // override §1 — FK player_id pour invariant 1-N tightly-coupled
    from_node:                 uuid('from_node').notNull().references(() => launderingNode.node_id, { onDelete: 'cascade' }), // GDD L274 + override NOT NULL + CASCADE (arête orpheline n'a aucun sens)
    to_node:                   uuid('to_node').notNull().references(() => launderingNode.node_id, { onDelete: 'cascade' }),   // GDD L275 + override NOT NULL + CASCADE
    routing_weight:            real('routing_weight').notNull().default(0),                                               // GDD L276 — float [0..1] BO-only (projeté RoutingWeightBucket)
  },
  (table) => ({
    player_idx:                index('laundering_edges_player_idx').on(table.player_id),
    player_from_idx:           index('laundering_edges_player_from_idx').on(table.player_id, table.from_node),
    player_to_idx:             index('laundering_edges_player_to_idx').on(table.player_id, table.to_node),
  }),
);

export const launderingEdgeRelations = relations(launderingEdge, ({ one }) => ({
  player: one(player, {
    fields: [launderingEdge.player_id],
    references: [player.player_id],
  }),
  fromNode: one(launderingNode, {
    fields: [launderingEdge.from_node],
    references: [launderingNode.node_id],
    relationName: 'edges_from_node',
  }),
  toNode: one(launderingNode, {
    fields: [launderingEdge.to_node],
    references: [launderingNode.node_id],
    relationName: 'edges_to_node',
  }),
}));

// ===== Table 3 : safehouses — GDD L279-288 verbatim =====
// PK simple safehouse_id uuid. FK player_id NOT NULL CASCADE (override §1).
// FK building_id CASCADE.
// raid_drain_policy pgEnum natif (3 membres GDD L289 verbatim).
export const safehouse = pgTable(
  'safehouses',
  {
    safehouse_id:              uuid('safehouse_id').primaryKey().defaultRandom(),                                         // GDD L280 — uuid primary key
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // override §1 — FK player_id pour invariant 1-N tightly-coupled
    building_id:               uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // GDD L281 + override NOT NULL + CASCADE
    slot_count:                integer('slot_count').notNull(),                                                            // GDD L282 (override NOT NULL — un safehouse a toujours un nombre de slots défini par tier)
    slot_capacity_cents:       integer('slot_capacity_cents').notNull(),                                                   // GDD L283 (override NOT NULL — capacité par slot toujours définie)
    current_fill:              jsonb('current_fill').notNull().default('[]'),                                              // GDD L284 — array per slot (override NOT NULL + default '[]' — fill jamais NULL côté applicatif)
    arrival_rate:              real('arrival_rate').notNull().default(0),                                                  // GDD L285 — float BO-only (λ Erlang-B)
    raid_drain_policy:         raidDrainPolicy('raid_drain_policy').notNull(),                                             // GDD L286-289 verbatim enum 3 membres
  },
  (table) => ({
    player_idx:                index('safehouses_player_idx').on(table.player_id),
    player_building_idx:       index('safehouses_player_building_idx').on(table.player_id, table.building_id),
  }),
);

export const safehouseRelations = relations(safehouse, ({ one }) => ({
  player: one(player, {
    fields: [safehouse.player_id],
    references: [player.player_id],
  }),
  building: one(building, {
    fields: [safehouse.building_id],
    references: [building.building_id],
  }),
}));

// ===== Table 4 : tail_risk_estimates — GDD L290-298 verbatim =====
// PK simple node_id uuid (1-1 avec laundering_nodes — GDD-verbatim L291).
// FK player_id NOT NULL CASCADE (override §1).
// FK node_id CASCADE (1-1 strict avec laundering_nodes).
export const tailRiskEstimate = pgTable(
  'tail_risk_estimates',
  {
    node_id:                   uuid('node_id').primaryKey().references(() => launderingNode.node_id, { onDelete: 'cascade' }), // GDD L291 — node_id uuid primary key + override CASCADE (estimate sans node n'a aucun sens)
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // override §1 — FK player_id pour invariant 1-N tightly-coupled
    capacity:                  real('capacity').notNull().default(0),                                                     // GDD L292 — float BO-only
    drain_rate:                real('drain_rate').notNull().default(0),                                                   // GDD L293 — float BO-only
    current_occupancy:         real('current_occupancy').notNull().default(0),                                            // GDD L294 — float BO-only
    tail_p95_estimate:         real('tail_p95_estimate').notNull().default(0),                                            // GDD L295 — float BO-only (projeté TailP95Bucket)
    last_estimated_at:         timestamp('last_estimated_at', { withTimezone: true }),                                    // GDD L296 — timestamp (nullable — null = jamais estimé)
  },
  (table) => ({
    player_idx:                index('tail_risk_estimates_player_idx').on(table.player_id),
  }),
);

export const tailRiskEstimateRelations = relations(tailRiskEstimate, ({ one }) => ({
  player: one(player, {
    fields: [tailRiskEstimate.player_id],
    references: [player.player_id],
  }),
  node: one(launderingNode, {
    fields: [tailRiskEstimate.node_id],
    references: [launderingNode.node_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type LaunderingNodeRow       = typeof launderingNode.$inferSelect;
export type LaunderingNodeInsert    = typeof launderingNode.$inferInsert;
export type LaunderingEdgeRow       = typeof launderingEdge.$inferSelect;
export type LaunderingEdgeInsert    = typeof launderingEdge.$inferInsert;
export type SafehouseRow            = typeof safehouse.$inferSelect;
export type SafehouseInsert         = typeof safehouse.$inferInsert;
export type TailRiskEstimateRow     = typeof tailRiskEstimate.$inferSelect;
export type TailRiskEstimateInsert  = typeof tailRiskEstimate.$inferInsert;

// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md§2 -- session:2026-06-02 --
// D2 R3a (2026-06-17): ADD declaration_ledger jsonb to precinct_memory (additive, migration 0052).
//   G31 declaration-ledger ring (system_3_police_memory.md :80-84, :87-99). R9.3 backport same-commit.
// P3-E C1 (2026-07-17): ADD acquired_at_tick bigint to buildings (additive, migration 0132). Resolution
//   R11/#19 (design §4.2/§13.1) — the node-age anchor the ★#1 friction perimeter needs; NO existing
//   column covered it (audit evidence: decisions §8.5 R11). R9.3 backport same-commit
//   (schema_core_loops.md §12).
import { pgTable, uuid, integer, smallint, real, jsonb, timestamp, varchar, boolean, bigint, primaryKey, index, pgEnum, customType, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';  // Task 3 — convention canonique FK player_id REUSE §5.1

// `bytea` n'est pas exporté par drizzle-orm/pg-core 0.36 (cf. release notes). Le §2 du chunk
// `schema_city_state.md` utilise un constructeur `bytea(...)` ; on le matérialise via le
// `customType` drizzle (idiome officiel pour le type binaire PG `bytea`). Mappe sur `Buffer`
// côté TS, `bytea` côté DDL généré (drizzle-kit) — strictement équivalent au §3 DDL `bytea`.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// ===== Enums PG natifs (domaines fermés) =====
// Ownership building — GDD L243 enum('player', 'leased', 'rival', 'civilian') verbatim
export const buildingOwnership = pgEnum('building_ownership', ['player', 'leased', 'rival', 'civilian']);
// Structural state building — GDD L246 enum('operational', 'damaged', 'seized', 'demolished') verbatim
export const structuralState = pgEnum('structural_state', ['operational', 'damaged', 'seized', 'demolished']);
// investigator_type — 04e-A1 C7 (★ Substrate 2: federal investigator, design §4.2, migration 0108).
// `local` labels the EXISTING precinct_memory model (System 3 — NOT retrofitted with this column,
// additive-only discipline: precinct_memory stays byte-untouched); `federal` labels a row of the NEW
// `federal_investigators` table below (spawned by E-POL-11, C7's own reconciliation tick).
export const investigatorType = pgEnum('investigator_type', ['local', 'federal']);
// ===== Table 1 : district_cohesion — GDD L189-200 verbatim =====
// PK composite (player_id, district_id). 18 rows/player (REUSE invariant 04/system_5 + 18 districts canonique).
export const districtCohesion = pgTable(
  'district_cohesion',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L191
    district_id:                  integer('district_id').notNull(),                                                          // GDD L192
    cohesion:                     real('cohesion').notNull().default(0.7),                                                   // GDD L193 — float default 0.7
    thaw_threshold_current:       real('thaw_threshold_current').notNull().default(0.55),                                    // GDD L194
    thaw_threshold_baseline:      real('thaw_threshold_baseline').notNull().default(0.55),                                   // GDD L195
    last_thaw_event_at:           timestamp('last_thaw_event_at', { withTimezone: true }),                                   // GDD L196 — null
    active_informant_count:       integer('active_informant_count').notNull().default(0),                                    // GDD L197
    permanent_marginal_flag:      boolean('permanent_marginal_flag').notNull().default(false),                               // GDD L198
    legitimate_services_invest:   integer('legitimate_services_invest').notNull().default(0),                                // GDD L199
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.district_id] }),                                                       // GDD L200
    // Index hot path : filter par état dérivé (thaw recent). NB cohesion_raw_float jamais index isolé (P5).
    player_thaw_recent_idx: index('district_cohesion_player_thaw_recent_idx').on(table.player_id, table.last_thaw_event_at),
  }),
);

export const districtCohesionRelations = relations(districtCohesion, ({ one }) => ({
  player: one(player, {
    fields: [districtCohesion.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : precinct_memory — GDD L202-213 verbatim =====
// PK composite (player_id, precinct_id). 6 rows/player (REUSE 04/system_3 + 6 precincts canonique).
export const precinctMemory = pgTable(
  'precinct_memory',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L204
    precinct_id:                  integer('precinct_id').notNull(),                                                          // GDD L205
    suspicion_map:                bytea('suspicion_map').notNull(),                                                          // GDD L206 — 32×32 = 1024 bytes
    top_5_buildings:              jsonb('top_5_buildings').notNull().default('[]'),                                          // GDD L207
    hunch_decay_per_type:         jsonb('hunch_decay_per_type').notNull().default('{}'),                                     // GDD L208
    raid_temperature:             real('raid_temperature').notNull().default(0.7),                                           // GDD L209
    last_raid_at:                 timestamp('last_raid_at', { withTimezone: true }),                                         // GDD L210
    last_intel_purchased_at:      timestamp('last_intel_purchased_at', { withTimezone: true }),                              // GDD L211
    corruption_clerk_id:          uuid('corruption_clerk_id'),                                                               // GDD L212 — null, FK Task 6 future lieutenant
    // D2 R3a (migration 0052): G31 declaration-ledger ring (system_3_police_memory.md :80-84).
    // JSONB ring buffer (DD-BYTES). Nullable / default null = empty ring (additive, R9.3).
    // Bounded server-side by declaration_ledger_size_per_precinct + max_entries_per_building (registry).
    // [PROV-Y26Q2] scope/magnitude_bucket deferred — only severity (0-100) on each entry.
    // police_memory.service.ts UNCHANGED in R3a (subscription + Tick scoring = R3b).
    declaration_ledger:           jsonb('declaration_ledger'),                                                                 // G31 — null, DeclarationEntry[] ring (JSONB)
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.precinct_id] }),                                                       // GDD L213
  }),
);

export const precinctMemoryRelations = relations(precinctMemory, ({ one }) => ({
  player: one(player, {
    fields: [precinctMemory.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3 : patrol_observation_queues — GDD L215-222 verbatim =====
// PK composite (player_id, precinct_id). 6 rows/player. Ring buffer up to 256 entries (GDD L218 commentaire).
export const patrolObservationQueue = pgTable(
  'patrol_observation_queues',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L216
    precinct_id:                  integer('precinct_id').notNull(),                                                          // GDD L217
    entries:                      jsonb('entries').notNull().default('[]'),                                                  // GDD L218 — ring buffer up to 256 entries
    head:                         integer('head').notNull().default(0),                                                     // GDD L219
    tail:                         integer('tail').notNull().default(0),                                                     // GDD L220
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.precinct_id] }),                                                       // GDD L221
  }),
);

export const patrolObservationQueueRelations = relations(patrolObservationQueue, ({ one }) => ({
  player: one(player, {
    fields: [patrolObservationQueue.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 4 : inspection_queues — GDD L224-232 verbatim =====
// PK composite (player_id, district_id). 18 rows/player (REUSE invariant 04/system_6 « 18 instances »).
export const inspectionQueue = pgTable(
  'inspection_queues',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L225
    district_id:                  integer('district_id').notNull(),                                                          // GDD L226
    entries:                      jsonb('entries').notNull().default('[]'),                                                  // GDD L227
    length:                       integer('length').notNull().default(0),                                                   // GDD L228 (override NOT NULL + default 0 — GDD ne précise pas le default, posé ICI par discipline applicative + valeur cohérente queue vide ; cf. §3 note override)
    processing_rate_per_day:      integer('processing_rate_per_day').notNull().default(4),                                  // GDD L229
    budget_modifier:              integer('budget_modifier').notNull().default(0),                                          // GDD L230
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.district_id] }),                                                       // GDD L231
  }),
);

export const inspectionQueueRelations = relations(inspectionQueue, ({ one }) => ({
  player: one(player, {
    fields: [inspectionQueue.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 5 : buildings — GDD L234-246 verbatim =====
// PK simple (building_id uuid). FK player_id NOT NULL + INDEX. Cardinalité variable per player.
export const building = pgTable(
  'buildings',
  {
    building_id:                  uuid('building_id').primaryKey().defaultRandom(),                                          // GDD L235 — uuid primary key (UUIDv4 day-1 — promotion UUIDv7 via extension cf. Task 3 §7.2 PALIMPSEST policy si profiling justifie)
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L236
    block_id:                     integer('block_id').notNull(),                                                             // GDD L237 (override NOT NULL — GDD omis ; tranché ICI par discipline applicative cohérence non-orphan ; cf. §3 note override)
    building_type:                integer('building_type').notNull(),                                                        // GDD L238 — int (FK logique vers building_type enum REUSE 04, pas une table — calque pattern Task 4 mastery `category_id`)
    ownership:                    buildingOwnership('ownership').notNull(),                                                  // GDD L239 enum verbatim (mapping pgEnum natif `building_ownership`)
    heat:                         real('heat').notNull().default(0),                                                         // GDD L240
    last_heat_update_at:          timestamp('last_heat_update_at', { withTimezone: true }),                                  // GDD L241
    audit_pin_expires_at:         timestamp('audit_pin_expires_at', { withTimezone: true }),                                 // GDD L242 — null si pas pinned
    transaction_profile:          jsonb('transaction_profile'),                                                              // GDD L243 — only if promoted (nullable)
    structural_state:             structuralState('structural_state').notNull(),                                             // GDD L244 enum verbatim (mapping pgEnum natif `structural_state`)
    // 04e-A1 C6 (mig 0107): additive nullable timestamptz — the half-life decay ANCHOR (design §4.1).
    // Stamped `now()` on ACTIVATE/RE-ARM (unconformity.service.ts Phase D case (a)); read back on every
    // subsequent HOLD tick to recompute audit_pin_expires_at = audit_pin_activated_at + pinHalfLifeDays
    // (overlay-aware, re-read fresh each tick) — so a half-life modifier shrinks/restores an ALREADY-
    // active pin's expiry, not just a newly-activated one. Cleared to null alongside audit_pin_expires_at
    // on lapse. Persisted (not in-memory-only) so the recompute survives a process restart (crash-safety
    // — mirrors why audit_pin_expires_at itself is the authoritative persisted projection, Inv 4).
    audit_pin_activated_at:       timestamp('audit_pin_activated_at', { withTimezone: true }),                               // 04e-A1 C6 mig 0107 — null if never pinned / lapsed
    // P3-E C1 (mig 0132) — additive nullable bigint, resolution R11/#19 (design §4.2/§13.1): NO existing
    // column/table covers the age of every node in the ★#1 friction perimeter (buildings has no
    // acquisition timestamp; building_operational_state.became_operational_at is NULL through setup AND
    // the row doesn't exist between purchase() and convert()). Stamped at purchase() (one-line edit,
    // real-estate.repository.ts, same commit) going forward; pre-existing rows stay NULL until the FIRST
    // N/31 lazy-stamp (D20, C2 — idempotent one-shot, never a fabricated age). Mirrors audit_pin_
    // activated_at's own single-column ADDITIVE-only precedent (mig 0107) — same "NULL = pre-migration
    // semantics unchanged" posture. Unit = game-minutes (city_sim_clock.game_minute's own unit) — the
    // ÷1440 "day" conversion happens in the C2 accrual FORMULA, not the stored anchor.
    acquired_at_tick:             bigint('acquired_at_tick', { mode: 'number' }),                                            // P3-E C1 mig 0132 — null if never stamped (pre-C2-lazy-stamp)
  },
  (table) => ({
    // Index FK player_id (REUSE convention Task 3 §5.1 — OBLIGATOIRE 1-N).
    player_idx: index('buildings_player_idx').on(table.player_id),
    // Index composite hot path : récupération buildings par (player, block) — usage promote/seize.
    player_block_idx: index('buildings_player_block_idx').on(table.player_id, table.block_id),
    // Index composite hot path : filter `WHERE player_id = $1 AND ownership = 'player' AND structural_state = 'operational'` (assets actifs joueur).
    // P3-E C1 (design §4.1 réconcilié) : ce MÊME index sert AUSSI le scan périmètre réconcilié
    // `structural_state != 'demolished'` via le préfixe d'égalité (player_id, ownership) + filtre —
    // EXPLAIN re-vérifié C1 (evidence docs/superpowers/plans/... — voir tests/e2e/core_loops/
    // demolition_compression_schema_migration.spec.ts). AUCUN index additif posé par ce chunk.
    player_owner_state_idx: index('buildings_player_owner_state_idx').on(table.player_id, table.ownership, table.structural_state),
    // P3-E C1 (mig 0132) — floor-only guard (nullable-but-bounded-when-present, the cs_executing_slot_
    // index_chk convention): a stamped tick is never negative. NULL (not-yet-stamped) is untouched.
    acquired_at_tick_chk: check('buildings_acquired_at_tick_chk', sql`${table.acquired_at_tick} IS NULL OR ${table.acquired_at_tick} >= 0`),
  }),
);

export const buildingRelations = relations(building, ({ one }) => ({
  player: one(player, {
    fields: [building.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 6 : deal_leks — GDD L248-256 verbatim =====
// PK composite (player_id, tile_id). Cardinalité variable per player (subset des tiles contestés).
export const dealLek = pgTable(
  'deal_leks',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),  // GDD L249
    tile_id:                      integer('tile_id').notNull(),                                                              // GDD L250
    lek_score:                    integer('lek_score').notNull().default(0),                                                // GDD L251 (override NOT NULL + default 0 — GDD omis ; cohérence avec uint8 décroissant `LekScore.score` REUSE 04/system_11 ; cf. §3 note override)
    controller_org_id:            integer('controller_org_id').notNull(),                                                    // GDD L252 (override NOT NULL — un lek a toujours un contrôleur, même si player_id propriétaire ≠ controller)
    deals_this_week:              integer('deals_this_week').notNull().default(0),                                           // GDD L253
    contest_pressure:             integer('contest_pressure').notNull().default(0),                                         // GDD L254
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.tile_id] }),                                                            // GDD L255
    // Index composite hot path : filter leks par contrôleur (rival vs player).
    player_controller_idx: index('deal_leks_player_controller_idx').on(table.player_id, table.controller_org_id),
  }),
);

export const dealLekRelations = relations(dealLek, ({ one }) => ({
  player: one(player, {
    fields: [dealLek.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 7 : federal_investigators — 04e-A1 C7 (migration 0108, ★ Substrate 2, design §4.2) =====
// PK simple (player_id) — 1-1 CHILD of player (mirrors false_report_ledger_summary's convention): AT
// MOST ONE federal investigator active per player at a time. Spawned/maintained/despawned by
// `PoliceMemoryService.runFederalInvestigatorReconcile` (NIGHTLY/20) reading the E-POL-11 GLOBAL
// effect-modifier SIGNAL through the overlay (`isFederalInvestigatorSignalActive`,
// police-memory-tunables.ts) — never a mock; C7's own `substrate_federal_investigator.spec.ts`
// live-fires it via the REAL `EffectModifierService.applyEvent`. `suspicion_decay_per_day` /
// `raid_temperature` are snapshotted FRESH every reconcile from the DISTINCT federal BASE tunables
// (`federalSuspicionDecayPerTilePerDay` / `federalRaidTargetTemperature`, C1) — DISTINCT from the local
// precinct_memory model's `memory_decay_per_tile_per_day` (0.04) / `raid_target_temperature` (0.7).
// `corruption_exempt` is ALWAYS true (the honest-scaffolding immunity flag, design §9 item 3 — see
// `federal-investigator.guard.ts`'s `attemptCorruptClerkMutation`).
export const federalInvestigator = pgTable(
  'federal_investigators',
  {
    player_id:                 uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
    investigator_type:         investigatorType('investigator_type').notNull().default('federal'),
    suspicion_decay_per_day:   real('suspicion_decay_per_day').notNull(),
    raid_temperature:          real('raid_temperature').notNull(),
    corruption_exempt:         boolean('corruption_exempt').notNull().default(true),
    spawned_at:                timestamp('spawned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    suspicion_decay_chk: check('fi_suspicion_decay_chk', sql`${table.suspicion_decay_per_day} BETWEEN 0 AND 1`),
    raid_temperature_chk: check('fi_raid_temperature_chk', sql`${table.raid_temperature} BETWEEN 0 AND 2.0`),
  }),
);

export const federalInvestigatorRelations = relations(federalInvestigator, ({ one }) => ({
  player: one(player, {
    fields: [federalInvestigator.player_id],
    references: [player.player_id],
  }),
}));

// ===== Note: rival_state table replaced by 04b-A C1 (migration 0081) =====
// The placeholder rival_state (3-col) from migration 0005 is DROPPED and replaced
// by the full rival_state schema in services/game-back/src/db/schema/conflict_rival.ts.
// Migration 0081 drops rival_roster + placeholder rival_state, creates the 4 new enums
// (rival_key / rival_regime / intel_mode / erosion_register_id) and the full rival_state table.
// The Drizzle TypeScript source of truth is now conflict_rival.ts (exported from index.ts).

// ===== Types inférés Drizzle =====
export type DistrictCohesionRow         = typeof districtCohesion.$inferSelect;
export type DistrictCohesionInsert      = typeof districtCohesion.$inferInsert;
export type PrecinctMemoryRow           = typeof precinctMemory.$inferSelect;
export type PrecinctMemoryInsert        = typeof precinctMemory.$inferInsert;
export type PatrolObservationQueueRow   = typeof patrolObservationQueue.$inferSelect;
export type PatrolObservationQueueInsert= typeof patrolObservationQueue.$inferInsert;
export type InspectionQueueRow          = typeof inspectionQueue.$inferSelect;
export type InspectionQueueInsert       = typeof inspectionQueue.$inferInsert;
export type BuildingRow                 = typeof building.$inferSelect;
export type BuildingInsert              = typeof building.$inferInsert;
export type DealLekRow                  = typeof dealLek.$inferSelect;
export type DealLekInsert               = typeof dealLek.$inferInsert;
export type FederalInvestigatorRow      = typeof federalInvestigator.$inferSelect;
export type FederalInvestigatorInsert   = typeof federalInvestigator.$inferInsert;
// RivalStateRow / RivalStateInsert moved to conflict_rival.ts (04b-A C1, migration 0081).

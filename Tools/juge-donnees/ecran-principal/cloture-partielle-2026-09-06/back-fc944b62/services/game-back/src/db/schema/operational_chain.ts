// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 -- session:2026-06-03 --
//             System 9 §9 Detection & Consequence C1 — 2026-06-21
//             (courier.sessions_active + caught_exception table + caught_exception_status enum)
//             System 9b C12 — DD-COLD-POWERED (courier_shift.cold_chain_powered column) — 2026-06-23
//             P3-C C1 — Loop 4 Sinuosity Debt additive `route` columns (patch_count/
//             last_rebuilt_at_tick/rebuild_completes_at_tick, mig 0125 prov.) — 2026-07-12. The 2 NEW
//             core-loops tables this same migration adds (supply_chain_legs/supply_node_pressure) live
//             in `supply_chain_loops.ts`, not here.
//
// Phase 2 / Task 0 — operational-chain M1 persistence (acquire → produce → launder → cash-out,
// substance Brindle). AUTHORED-FRESH: these tables are absent from GDD 09 (top-level entities)
// and every existing 09 chunk; modeled from docs/tech/04a_operational_systems/* (runtime entities)
// per the T0 audit (schema_operational_chain.md §1). R9.3: this matches the SQL migration 0017
// byte-for-byte; no Phase-1 table is redefined.
//
// System 9 C1 (2026-06-21) ADDITIVE — no existing column/table mutated:
//   - courier.sessions_active: reputation score, BO-only (OQ-13 — no stored bucket column).
//   - caughtExceptionStatus pgEnum: 4 lifecycle states (OQ-21 — table not columns on courier_shift).
//   - caughtException table: caught-exception side-table keyed on shift (OQ-21 — the 3-way
//     resolution entity; FK CASCADE player/shift/courier/route; bigint ticks {mode:'bigint'}).
import { pgTable, uuid, integer, smallint, bigint, jsonb, boolean, timestamp, index, pgEnum, primaryKey, real, varchar } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';        // convention canonique FK player_id REUSE schema_player.md §5.1
import { building } from './city_state';  // FK logique building_id REUSE schema_city_state.md §2

// ===== Enums PG natifs (domaines fermés — membres 04a-verbatim, schema_operational_chain.md §2) =====
export const buildingOperationalType = pgEnum('building_operational_type', [
  'front_shop', 'cash_safehouse', 'stash', 'lab', 'grow_house', 'refinery',
  'press_house', 'distribution_hub', 'office', 'dealer_spot_front', 'money_holding',
  'specialized_lab',
]); // building_types.md §38 (11 membres) + production_secondaries.md §Ash (specialized_lab — Ash building, §7.10.2 ; appended via ALTER TYPE ADD VALUE migration 0022)
export const conversionStage = pgEnum('conversion_stage', [
  'none', 'gutting', 'installing', 'testing', 'operational',
]); // conversion_setup.md §26 (5 membres)
export const coverQuality = pgEnum('cover_quality', ['weak', 'standard', 'strong']); // conversion_setup.md §27
export const precursorType = pgEnum('precursor_type', ['pyralin', 'thalmite', 'garnet_salt', 'verdant_root_extract', 'lull_resin', 'glass_lily']); // precursors_supply_chain.md §128 (3 Brindle) + production_secondaries.md §Crick (verdant_root_extract — Crick precursor, §7.8.1) + §Hush (lull_resin — Hush precursor, §7.9.1 ; provisional name [PROV-Y26Q2]) + §Ash (glass_lily — Ash precursor, §7.10.1 ; provisional name [PROV-Y26Q2])
export const precursorOrderStatus = pgEnum('precursor_order_status', [
  'pending', 'in_transit', 'delivered', 'seized',
]); // precursors_supply_chain.md §138
export const substanceType = pgEnum('substance_type', ['brindle', 'crick', 'hush', 'ash']); // product_storage.md §54
export const cookStage = pgEnum('cook_stage', [
  'stage_1', 'stage_2', 'stage_2_intermediate', 'stage_3', 'stage_4', 'completed', 'aborted',
]); // production_brindle.md §212 (7 membres)
export const purityGrade = pgEnum('purity_grade', ['crude', 'low', 'standard', 'refined', 'pure']); // substance_brindle.md §77 (purity_grade_count=5 : Crude/Low/Standard/Refined/Pure)
export const cutPurityBucket = pgEnum('cut_purity_bucket', ['pure', 'standard', 'cheap', 'max_margin']); // production_brindle.md §347 (4 membres — Stage 4 player decision)
export const courierRoleType = pgEnum('courier_role_type', ['courier', 'runner']); // distribution_couriers_runners.md §69
export const vehicleType = pgEnum('vehicle_type', ['foot', 'bike', 'car', 'refrigerated_van']); // §70
export const courierState = pgEnum('courier_state', [
  'idle', 'in_transit', 'at_destination', 'returning', 'caught', 'compromised',
]); // distribution_couriers_runners.md §72 (6 membres)
export const shiftStatus = pgEnum('shift_status', ['in_transit', 'completed', 'caught']); // §206
export const dealerState = pgEnum('dealer_state', ['working', 'idle', 'absent', 'compromised']); // selling_dealers_leks.md §70
// Phase-2b raid/repair (schema_operational_chain.md §7.4) — DISTINCT de buildings.structural_state city-state
// (operational|damaged|seized|demolished, schema_city_state.md §2). 4 membres (04f-A C1 mig 0119 ADD VALUE
// 'failed' — D3: equipment-failure halt, additive, NEVER used by the raid RepairService which only accepts
// 'damaged'; see §7.21).
export const buildingStructuralState = pgEnum('building_structural_state', ['operational', 'damaged', 'repairing', 'failed']); // §7.4 + §7.21 (4 membres)
export const buildingRaidStatus = pgEnum('building_raid_status', ['executed', 'repairing', 'repaired']); // §7.4 (3 membres)
// 04f-A C1 (mig 0119, schema_operational_chain.md §7.21.3) — the cached D1 lapse-phase projection on
// building_operational_state.lapse_phase. Consumption sites DERIVE the phase live from days-overdue (D1) —
// this column is a transition-detection cache for the NIGHTLY tick + BO aggregate queries, NEVER the
// penalty input itself (no stale-penalty hazard).
export const buildingLapsePhase = pgEnum('building_lapse_phase', ['within_window', 'soft', 'hard', 'critical']); // §7.21.3 (4 membres)
// 04f-A C1 (mig 0119, schema_operational_chain.md §7.21.4) — the 4 equipment-failure repair options (D4/§6).
export const repairMode = pgEnum('repair_mode', ['immediate', 'slow', 'defer', 'demolish_replace']); // §7.21.4 (4 membres)
// Phase-2b substances/Ash (schema_operational_chain.md §7.10.6) — cycle de vie d'un rendez-vous Glass.
export const ashAppointmentStatus = pgEnum('ash_appointment_status', ['scheduled', 'honored', 'expired']); // §7.10.6 (3 membres — scheduled→honored|expired)
// Phase-3 grow_house (schema_operational_chain.md §7.11.1) — cycle de croissance d'une culture in-house (sibling de cook_stage).
export const growStage = pgEnum('grow_stage', ['stage_1', 'stage_2', 'stage_3', 'completed']); // §7.11.1 (4 membres — stage_1→stage_2→stage_3→completed ; le tick GROW_ADVANCE MINUTE/18 advance ; grow.stage_count=3 vit dans gdd/14)
// System 9 C1 — caught_exception_status pgEnum (OQ-21 — the 3-way resolution lifecycle).
// 4 lifecycle states: pending (default on creation) → lawyered | abandoned | silenced.
// Maps CaughtActionChoice (LAWYER_UP→lawyered, ABANDON→abandoned, VIOLENT_SILENCE→silenced).
// REUSE: 'caught' status for courier/shift reuses existing courierState/shiftStatus (NOT new here).
export const caughtExceptionStatus = pgEnum('caught_exception_status', [
  'pending', 'lawyered', 'abandoned', 'silenced',
]); // distribution_couriers_runners.md §9 caught-exception lifecycle (C1, mig 0074)

// System 9b C1 — route_stance pgEnum (DD-STANCE §3.3, mig 0075)
// 3 auto-routing stances: fastest | balanced | evasive.
// Persisted on the route so replan re-paths with the same stance (DD-PERSIST §4.1).
// [PROV-Y26Q2] weight profiles per stance in distribution-tunables.ts (C2).
// Anti-fabrication: the FORM is frozen; the weight magnitudes are sourced calibration targets (gdd/14 C2).
export const routeStance = pgEnum('route_stance', ['fastest', 'balanced', 'evasive']); // distribution_couriers_runners.md §9b (mig 0075)

// System 9b C1 — route_state pgEnum (DD-REPLAN §4.4, mig 0075)
// 4 lifecycle states: draft → active → saturated → severed; replan resets to active (same route_id).
// Deterministic threshold compare over corridor-debt derived saturation (C9 DD-SEVER).
export const routeState = pgEnum('route_state', ['draft', 'active', 'saturated', 'severed']); // distribution_couriers_runners.md §9b (mig 0075)

// ===== Table 1 : building_operational_state — conversion_setup.md §150 + §192 (1-1 avec buildings) =====
export const buildingOperationalState = pgTable(
  'building_operational_state',
  {
    building_id:            uuid('building_id').primaryKey().references(() => building.building_id, { onDelete: 'cascade' }), // PK 1-1 building
    player_id:              uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),         // §5.1
    operational_type:       buildingOperationalType('operational_type').notNull(),                                          // building_types.md §38
    conversion_stage:       conversionStage('conversion_stage').notNull().default('none'),                                  // conversion_setup.md §26
    cover_quality:          coverQuality('cover_quality').notNull().default('standard'),                                    // §27
    equipment_tier:         smallint('equipment_tier').notNull().default(1),                                               // §192 (=1 new) ; max 5 building_types.md §174
    setup_remaining_ticks:  integer('setup_remaining_ticks').notNull().default(0),                                          // §192 interne BO-only
    maintenance_due_in_days: integer('maintenance_due_in_days').notNull().default(0),                                       // §150 interne BO-only
    became_operational_at:  timestamp('became_operational_at', { withTimezone: true }),                                     // null tant que pas operational
    structural_state:       buildingStructuralState('structural_state').notNull().default('operational'),                  // Phase-2b raid/repair (§7.2) — sain/raidé/en-réparation ; DISTINCT de conversion_stage (setup)
    repair_completes_at_tick: bigint('repair_completes_at_tick', { mode: 'number' }),                                      // §7.2 — armé pendant 'repairing' uniquement ; null sinon. BO-only
    cold_storage_capable:   boolean('cold_storage_capable').notNull().default(false),                                      // Phase-2b substances/Crick (§7.8.2) — capacité cold-storage posée à la conversion ; false = stockage normal (défaut rétro-compatible). Crick OPTIMAL_COLD si true.
    lab_tier:               integer('lab_tier').notNull().default(1),                                                       // Phase-2b substances/Ash (§7.10.3) — palier d'un specialized_lab (lever joueur upgrade cash→tier++). Défaut 1 rétro-compatible. Tier supérieur ⇒ purity Ash plus haute (AshPurityService T6).
    hub_tier:               integer('hub_tier').notNull().default(1),                                                       // Phase-4 distribution_hub (§7.12.1) — palier d'un distribution_hub (lever joueur upgrade cash→tier++, cap distribution.hub_max_tier=5, CHECK bos_hub_tier_chk 1..5). Défaut 1 rétro-compatible (lab/refinery/press_house/specialized_lab/grow_house gardent hub_tier=1 inerte — LU seulement pour un distribution_hub). Tier supérieur ⇒ roster cap de couriers concurrents plus grand (HubRosterService.rosterCap T3, Tier-1=5…Tier-5=30). Distinct d'equipment_tier/lab_tier.
    equipment_tier_upgrade_remaining_ticks: integer('equipment_tier_upgrade_remaining_ticks').notNull().default(0),        // D1 C6 windowed upgrade — ticks remaining until equipment_tier++ completes. > 0 = building offline for upgrade. CHECK >= 0 (migration 0037). BO-only (R2.2 — projected as qualitative band via setup_state). Drains 1/tick by EquipmentTierUpgradeService (MINUTE/20).
    last_maintained_at_game_day: bigint('last_maintained_at_game_day', { mode: 'number' }),                                // 04f-A C1 (mig 0119, §7.21.2) — D1 anchor: the game-day maintenance was last completed (fresh window = the day a building went OPERATIONAL, or the day scheduled maintenance last completed). NULL until the building is OPERATIONAL (never set at the 'gutting' insert). days_overdue/lapse_phase are DERIVED from this + maintenance_due_in_days (REUSE, unchanged) — never a daily-decrement write. BO/internal only (R2.2 — never the raw scalar to the player; only LapsePhaseBucket + days_until_maintenance_due int).
    maintenance_completes_at_day: bigint('maintenance_completes_at_day', { mode: 'number' }),                              // 04f-A C1 (mig 0119, §7.21.2) — D13: armed while a scheduled-maintenance 1-game-day job runs (C3 arms it; the NIGHTLY tick completes it → resets last_maintained_at_game_day + clears this column). Building keeps OPERATING meanwhile (scheduling ≠ halt). NULL = no job armed.
    lapse_phase:             buildingLapsePhase('lapse_phase').notNull().default('within_window'),                        // 04f-A C1 (mig 0119, §7.21.2) — cached transition-detection projection (D1); NEVER the penalty input (consumption sites derive live from days-overdue).
  },
  (t) => ({
    player_idx:      index('building_operational_state_player_idx').on(t.player_id),
    player_type_idx: index('building_operational_state_player_type_idx').on(t.player_id, t.operational_type),
  }),
);

export const buildingOperationalStateRelations = relations(buildingOperationalState, ({ one }) => ({
  player:   one(player,   { fields: [buildingOperationalState.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [buildingOperationalState.building_id], references: [building.building_id] }),
}));

// ===== Table 2 : precursor_stock — precursors_supply_chain.md §128 =====
export const precursorStock = pgTable(
  'precursor_stock',
  {
    stock_id:        uuid('stock_id').primaryKey().defaultRandom(),
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    building_id:     uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),
    precursor_type:  precursorType('precursor_type').notNull(),                                                            // M1 = pyralin
    quantity_units:  integer('quantity_units').notNull().default(0),                                                       // interne BO-only
    updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    player_idx:               index('precursor_stock_player_idx').on(t.player_id),
    player_building_type_idx: index('precursor_stock_player_building_type_idx').on(t.player_id, t.building_id, t.precursor_type),
  }),
);

export const precursorStockRelations = relations(precursorStock, ({ one }) => ({
  player:   one(player,   { fields: [precursorStock.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [precursorStock.building_id], references: [building.building_id] }),
}));

// ===== Table 3 : precursor_order — precursors_supply_chain.md §43-49 + §138 (lead time) =====
export const precursorOrder = pgTable(
  'precursor_order',
  {
    order_id:        uuid('order_id').primaryKey().defaultRandom(),
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    building_id:     uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),
    precursor_type:  precursorType('precursor_type').notNull(),
    quantity_units:  integer('quantity_units').notNull(),
    status:          precursorOrderStatus('status').notNull().default('pending'),                                          // §138
    ordered_at_tick: bigint('ordered_at_tick', { mode: 'number' }).notNull(),
    arrives_at_tick: bigint('arrives_at_tick', { mode: 'number' }).notNull(),                                              // ordered + lead_time (tunable)
  },
  (t) => ({
    player_idx:        index('precursor_order_player_idx').on(t.player_id),
    player_status_idx: index('precursor_order_player_status_idx').on(t.player_id, t.status),
  }),
);

export const precursorOrderRelations = relations(precursorOrder, ({ one }) => ({
  player:   one(player,   { fields: [precursorOrder.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [precursorOrder.building_id], references: [building.building_id] }),
}));

// ===== Table 4 : cook_session — production_brindle.md §212 (state machine 4 stages) =====
export const cookSession = pgTable(
  'cook_session',
  {
    cook_session_id:      uuid('cook_session_id').primaryKey().defaultRandom(),
    player_id:            uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    lab_building_id:      uuid('lab_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),
    substance_type:       substanceType('substance_type').notNull().default('brindle'),                                   // M1 = brindle
    current_stage:        cookStage('current_stage').notNull().default('stage_1'),                                        // §212 (7 membres)
    started_at_tick:      bigint('started_at_tick', { mode: 'number' }).notNull(),
    stage_started_at_tick: bigint('stage_started_at_tick', { mode: 'number' }).notNull(),
    cut_purity_bucket:    cutPurityBucket('cut_purity_bucket'),                                                           // null jusqu'au Stage 4 (production_brindle.md §347)
    refining_passes:      integer('refining_passes').notNull().default(0),                                               // Phase-2b substances/Ash (§7.10.4) — passes de raffinage choisies au cook Ash (lever purity ; +passes ⇒ +purity & cook plus long). Défaut 0 ⇒ Brindle/Crick/Hush byte-identical (cook non-Ash ne le renseigne pas). CHECK >= 0.
    damaged_pauses_during_cook: integer('damaged_pauses_during_cook').notNull().default(0),                              // Phase-2b substances/Ash (§7.10.4) — nb d'interruptions DAMAGED (gate raid→DAMAGED vector #1) ; lever purity inverse (chaque pause baisse la purity). Incrémenté pour toute substance (T4) mais LU seulement par la purity Ash (behavior-preserving). Défaut 0. CHECK >= 0.
    delegated_yield_permille: integer('delegated_yield_permille'),                                                       // Phase-11b COOK tenure yield bonus (Idea #38) — le multiplicateur de rendement efficiency-bonus CAPTURÉ AU START par le binding COOK délégué, en permille (×1000) : yieldMultiplier(bonus, curve) × 1000 (FRESH ⇒ BONUS_NONE ⇒ 1.0 ⇒ 1000). NULL = cook manuel joueur OU cook non-délégué (C2 le lit comme ×1). Nullable, no default ⇒ cook manuel byte-identical. BO-only (R2.2) — JAMAIS projeté surface joueur.
  },
  (t) => ({
    player_idx:       index('cook_session_player_idx').on(t.player_id),
    player_lab_idx:   index('cook_session_player_lab_idx').on(t.player_id, t.lab_building_id),
    player_stage_idx: index('cook_session_player_stage_idx').on(t.player_id, t.current_stage),
  }),
);

export const cookSessionRelations = relations(cookSession, ({ one }) => ({
  player: one(player,   { fields: [cookSession.player_id],       references: [player.player_id] }),
  lab:    one(building, { fields: [cookSession.lab_building_id], references: [building.building_id] }),
}));

// ===== Table 5 : product_storage — product_storage.md §47-60 (agrégat building+substance) =====
export const productStorage = pgTable(
  'product_storage',
  {
    storage_id:           uuid('storage_id').primaryKey().defaultRandom(),
    player_id:            uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    building_id:          uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),  // STASH ou LAB (§53)
    substance_type:       substanceType('substance_type').notNull(),
    quantity_grams:       integer('quantity_grams').notNull().default(0),                                                // interne BO-only (§55)
    purity_grade:         purityGrade('purity_grade').notNull().default('standard'),                                    // weighted-avg (§56)
    age_in_storage_hours: integer('age_in_storage_hours').notNull().default(0),                                          // interne (§57)
    updated_at:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    player_idx:                  index('product_storage_player_idx').on(t.player_id),
    player_building_substance_idx: index('product_storage_player_building_substance_idx').on(t.player_id, t.building_id, t.substance_type),
  }),
);

export const productStorageRelations = relations(productStorage, ({ one }) => ({
  player:   one(player,   { fields: [productStorage.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [productStorage.building_id], references: [building.building_id] }),
}));

// ===== Table 6 : dealer — selling_dealers_leks.md §58-74 (NEW table, §1 décision) =====
export const dealer = pgTable(
  'dealer',
  {
    dealer_id:                uuid('dealer_id').primaryKey().defaultRandom(),
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    home_building_id:         uuid('home_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // dealer-spot (§64)
    coverage_lek_tile_id:     integer('coverage_lek_tile_id').notNull(),                                                  // soft-ref tile (§65) — pas de FK (leks = (player_id,tile_id))
    substance_specialization: substanceType('substance_specialization').notNull().default('brindle'),                    // mono (§74)
    current_state:            dealerState('current_state').notNull().default('idle'),                                     // §70
    operating_hours_start:    smallint('operating_hours_start').notNull().default(0),                                     // game-hour (§68)
    operating_hours_end:      smallint('operating_hours_end').notNull().default(23),                                      // game-hour (§69)
    float_cents:              bigint('float_cents', { mode: 'number' }).notNull().default(0),                             // cash float interne (§82)
  },
  (t) => ({
    player_idx:          index('dealer_player_idx').on(t.player_id),
    player_building_idx: index('dealer_player_building_idx').on(t.player_id, t.home_building_id),
    player_lek_idx:      index('dealer_player_lek_idx').on(t.player_id, t.coverage_lek_tile_id),
  }),
);

export const dealerRelations = relations(dealer, ({ one }) => ({
  player:   one(player,   { fields: [dealer.player_id],        references: [player.player_id] }),
  building: one(building, { fields: [dealer.home_building_id], references: [building.building_id] }),
}));

// ===== Table 7 : courier — distribution_couriers_runners.md §62-78 (NEW table, §1 décision) =====
export const courier = pgTable(
  'courier',
  {
    courier_id:           uuid('courier_id').primaryKey().defaultRandom(),
    player_id:            uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    role_type:            courierRoleType('role_type').notNull().default('courier'),                                     // §69
    vehicle_type:         vehicleType('vehicle_type').notNull().default('foot'),                                         // M1 = foot
    home_dispatch_hub_id: uuid('home_dispatch_hub_id').references(() => building.building_id, { onDelete: 'set null' }), // §73 (nullable)
    current_state:        courierState('current_state').notNull().default('idle'),                                       // §72
    current_route_id:     uuid('current_route_id'),                                                                      // FK route SET NULL — déclarée DB-side dans 0017 (forward ref)
    current_load_grams:   integer('current_load_grams').notNull().default(0),                                            // interne BO-only (§75)
    current_load_cents:   bigint('current_load_cents', { mode: 'number' }).notNull().default(0),                         // interne BO-only (§75)
    sessions_active:      integer('sessions_active').notNull().default(0),                                               // System 9 C1 (mig 0074) — reputation score: incremented per dispatch (C4), derived to CourierReputationBucket on read (OQ-13 — no stored bucket column). BO-only (R2.2).
  },
  (t) => ({
    player_idx:       index('courier_player_idx').on(t.player_id),
    player_state_idx: index('courier_player_state_idx').on(t.player_id, t.current_state),
  }),
);

export const courierRelations = relations(courier, ({ one }) => ({
  player: one(player,   { fields: [courier.player_id],            references: [player.player_id] }),
  hub:    one(building, { fields: [courier.home_dispatch_hub_id], references: [building.building_id] }),
}));

// ===== Table 8 : route — distribution_couriers_runners.md §80-97 (NEW table, §1 décision) =====
export const route = pgTable(
  'route',
  {
    route_id:                uuid('route_id').primaryKey().defaultRandom(),
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    origin_building_id:      uuid('origin_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),      // §86
    destination_building_id: uuid('destination_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // §87
    path_blocks:             jsonb('path_blocks').notNull().default('[]'),                                               // BlockId[] (§88)
    river_crossings:         integer('river_crossings').notNull().default(0),                                            // interne (§92)
    ephemeral_mode:          boolean('ephemeral_mode').notNull().default(false),                                         // §97
    // System 9b C1 — routing + persistence cols (mig 0075, DD-PERSIST §4.1 + DD-SINUOSITY §3.5 + DD-STANCE §3.3 + DD-REPLAN §4.4)
    straight_line_distance:  real('straight_line_distance').notNull().default(0),                                        // server-only R2.2 — A* geometric endpoint distance; sinuosity denominator (§3.5). Default 0 = safe for ad-hoc M1 rows.
    sinuosity_index:         real('sinuosity_index').notNull().default(1.0),                                             // server-only R2.2 — path_length/straight_line (§3.5). Default 1.0 = a straight path.
    stance:                  routeStance('stance').notNull().default('balanced'),                                         // route_stance enum (§3.3) — auto-routing stance; persisted for replan. Default 'balanced' = back-compat M1.
    vehicle_type:            vehicleType('vehicle_type').notNull().default('foot'),                                       // REUSE existing vehicleType enum (no new enum). Default 'foot' = M1 back-compat.
    route_name:              varchar('route_name', { length: 48 }),                                                      // nullable — null for ad-hoc dispatch routes (DD-PERSIST §4.1).
    is_saved:                boolean('is_saved').notNull().default(false),                                                // true = persistent reusable plan; false = ad-hoc dispatch route (DD-PERSIST §4.1).
    state:                   routeState('state').notNull().default('active'),                                             // route_state enum (§4.4 state machine). Default 'active' = M1 back-compat.
    version:                 integer('version').notNull().default(1),                                                     // replan version (DD-REPLAN §4.4). Bumps on replan; identity = route_id.
    // P3-C C1 — Loop 4 Sinuosity Debt additive cols (mig 0125 prov., design §7.1, D1). Consumed C7
    // (patch sweep + rebuild downtime-armed claim, the 04f-A `maintenance_completes_at_day` shape). See
    // schema_core_loops.md §10 (the 2 NEW core_loops tables this same migration adds) +
    // schema_operational_chain.md §7.22 (this addendum).
    patch_count:             integer('patch_count').notNull().default(0),                                                 // server-only R2.2 — NIGHTLY/26 ROUTE_PATCH_SWEEP increments this (§7.2). Default 0 = zero-regression.
    last_rebuilt_at_tick:    bigint('last_rebuilt_at_tick', { mode: 'number' }),                                           // server-only R2.2 — game-minute of last rebuild (§7.4). Nullable — never-rebuilt route.
    rebuild_completes_at_tick: bigint('rebuild_completes_at_tick', { mode: 'number' }),                                   // server-only R2.2 — downtime-armed rebuild completion tick (§7.4). Nullable outside an active rebuild; dispatch guard WHERE ... IS NULL (I7).
    // P3-C C3 — Loop 5 Mycelial Ledger additive col (mig 0126 prov., design §5.3, D4). FROZEN at
    // dispatch time by DistributionService.dispatch (BEFORE this route's own INSERT) from the leg's LIVE
    // debt_load at that moment — mirrors sinuosity_index's OWN "frozen between replans" shape (OQ-P1,
    // same table). Read back by distribution-transit.service.ts's per-tick arrival check:
    // transit_ticks = ceil(vehicleTransitTicks(...) * mycelial_transit_stress_multiplier). Default 1 =
    // zero-regression (every pre-C3 route row / unstressed dispatch is byte-identical). See
    // schema_operational_chain.md §7.23.
    mycelial_transit_stress_multiplier: real('mycelial_transit_stress_multiplier').notNull().default(1),                  // server-only R2.2 — CHECK >= 1 (never speeds up transit, only slows).
  },
  (t) => ({
    player_idx:           index('route_player_idx').on(t.player_id),
    player_origin_dest_idx: index('route_player_origin_dest_idx').on(t.player_id, t.origin_building_id, t.destination_building_id),
  }),
);

export const routeRelations = relations(route, ({ one, many }) => ({
  player:         one(player,   { fields: [route.player_id],               references: [player.player_id] }),
  origin:         one(building, { fields: [route.origin_building_id],      references: [building.building_id], relationName: 'route_origin' }),
  destination:    one(building, { fields: [route.destination_building_id], references: [building.building_id], relationName: 'route_destination' }),
  versionHistory: many(routeVersionHistory), // C9: DD-REPLAN — archived prior paths (OQ-RP1)
}));

// ===== Table 9 : courier_shift — distribution_couriers_runners.md §206 (transit tick-driven, NEW table) =====
export const courierShift = pgTable(
  'courier_shift',
  {
    shift_id:              uuid('shift_id').primaryKey().defaultRandom(),
    player_id:             uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    courier_id:            uuid('courier_id').notNull().references(() => courier.courier_id, { onDelete: 'cascade' }),    // §206
    route_id:              uuid('route_id').notNull().references(() => route.route_id, { onDelete: 'cascade' }),          // §206
    started_at_tick:       bigint('started_at_tick', { mode: 'number' }).notNull(),
    current_segment_index: integer('current_segment_index').notNull().default(0),                                        // avancé par tick (§206)
    cargo_grams:           integer('cargo_grams').notNull().default(0),                                                  // interne BO-only
    cargo_cents:           bigint('cargo_cents', { mode: 'number' }).notNull().default(0),                              // interne BO-only
    substance_type:        substanceType('substance_type').notNull().default('brindle'),                                // Phase-2b substances (§7.8.6) — la substance du cargo transporté, mémorisée du dispatch à l'arrivée. Défaut brindle = M1 rétro-compatible.
    status:                shiftStatus('status').notNull().default('in_transit'),                                        // §206
    patrol_heat:           real('patrol_heat').notNull().default(0.0),                                                  // Insurance C7 — BO-only patrol-heat signal per shift (R2.2: never exposed to clients). Mig 0065. NO writer in this lot; System 9 / distribution-depth lot (TD-123) wires it to PatrolDoctrineService.getPatrolLoadRaw(playerId, precinctId) (patrol.service.ts:~479) via route.path_blocks → block → district → precinct (patrol.service.ts:~127). Producer intentionally inert in production (threshold-gated; defaults 0.0).
    cold_chain_powered:    boolean('cold_chain_powered').notNull().default(true),                                        // System 9b C12 — DD-COLD-POWERED (Mig 0079). BO-only (R2.2). true = van alimenté (Crick préservé) ; false = chain brisée (van neutralisé → Crick dégrade). Défaut true = rétro-compatible (vans existants alimentés). Writtenfalse by neutralizeColdChain in CourierDetectionService on catch. Cold-chain degrade filter: powered van (cold_chain_powered=true) EXCLUDED from HOT regime → byte-identical to today ; un-powered van (cold_chain_powered=false) INCLUDED (OR clause) → degrades like any warm Crick.
  },
  (t) => ({
    player_idx:         index('courier_shift_player_idx').on(t.player_id),
    player_courier_idx: index('courier_shift_player_courier_idx').on(t.player_id, t.courier_id),
    player_status_idx:  index('courier_shift_player_status_idx').on(t.player_id, t.status),
  }),
);

export const courierShiftRelations = relations(courierShift, ({ one }) => ({
  player:  one(player,  { fields: [courierShift.player_id],  references: [player.player_id] }),
  courier: one(courier, { fields: [courierShift.courier_id], references: [courier.courier_id] }),
  route:   one(route,   { fields: [courierShift.route_id],   references: [route.route_id] }),
}));

// ===== Table 10 : building_raid — Phase-2b raid/repair (schema_operational_chain.md §7.3, NEW table) =====
// 1 row par bâtiment raidé. Source : system_4_patrol_doctrine.md §RaidPlan + shape RaidPlannedEvent.
export const buildingRaid = pgTable(
  'building_raid',
  {
    raid_id:         uuid('raid_id').primaryKey().defaultRandom(),
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),         // §5.1
    building_id:     uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),   // bâtiment raidé (LAB/STASH)
    district_id:     integer('district_id').notNull(),                                                               // soft-ref districts.id (RaidPlannedEvent.districtId) — pas de FK
    target_block_id: integer('target_block_id').notNull(),                                                           // soft-ref blocks.id (RaidPlannedEvent.targetBlockId) — pas de FK
    raided_at_tick:  bigint('raided_at_tick', { mode: 'number' }).notNull(),                                         // tick d'exécution (city_sim_clock.game_minute)
    grams_seized:    integer('grams_seized').notNull().default(0),                                                   // interne BO-only (R2.2 — jamais raw client)
    seized_cents:    integer('seized_cents').notNull().default(0),                                                  // centimes saisis sur ce bâtiment money_holding (cash vault leg — BO-only R2.2 ; peuplé par executeMoneyHoldingRaid ; 0 pour raids product)
    status:          buildingRaidStatus('status').notNull().default('executed'),                                    // §7.4 executed→repairing→repaired
  },
  (t) => ({
    player_idx:          index('building_raid_player_idx').on(t.player_id),
    player_building_idx: index('building_raid_player_building_idx').on(t.player_id, t.building_id),
  }),
);

export const buildingRaidRelations = relations(buildingRaid, ({ one }) => ({
  player:   one(player,   { fields: [buildingRaid.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [buildingRaid.building_id], references: [building.building_id] }),
}));

// ===== Table 11 : hush_addiction — Phase-2b substances/Hush (schema_operational_chain.md §7.9.2, NEW table) =====
// L'entité canon DealerSpotLoyalty : 1 row par dealer-spot Hush (PK composite player+building, lazy-créée au 1er deal Hush).
// loyalty_score = accumulateur entier deal-count (NEW < established < dependent — cut-points T.production.hush.addiction_loyalty_*_score)
// projeté en bande qualitative addiction_loyalty_status (LOW/STABLE/HIGH, R2.2 — JAMAIS le score raw côté client).
export const hushAddiction = pgTable(
  'hush_addiction',
  {
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),         // §5.1
    dealer_spot_building_id: uuid('dealer_spot_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // le dealer-spot Hush
    loyalty_score:           integer('loyalty_score').notNull().default(0),                                                  // interne BO-only (R2.2) — accumulateur deal-count, gardé >= 0
    last_hush_deal_tick:     bigint('last_hush_deal_tick', { mode: 'number' }),                                              // tick du dernier deal Hush (espace city_sim_clock.game_minute) ; null tant qu'aucun deal. Pilote decay/withdrawal (HUSH_ADDICTION MINUTE/16, T5)
    withdrawn:               boolean('withdrawn').notNull().default(false),                                                  // true = le spot DEPENDENT privé de Hush > withdrawal_period_ticks a withdraw (boost perdu) ; remis false au prochain deal
  },
  (t) => ({
    pk:         primaryKey({ columns: [t.player_id, t.dealer_spot_building_id] }),                                           // PK composite — 1 row par (player, dealer-spot)
    player_idx: index('hush_addiction_player_idx').on(t.player_id),
  }),
);

export const hushAddictionRelations = relations(hushAddiction, ({ one }) => ({
  player:   one(player,   { fields: [hushAddiction.player_id],               references: [player.player_id] }),
  building: one(building, { fields: [hushAddiction.dealer_spot_building_id], references: [building.building_id] }),
}));

// ===== Table 12 : batch_purity — Phase-2b substances/Ash (schema_operational_chain.md §7.10.5, NEW side-table) =====
// 1 row par product_storage row Ash portant une purity dérivée (stampée 1× à la complétion du cook Ash par AshPurityService T6).
// SIDE TABLE keyée sur storage_id (PAS une colonne sur product_storage) PAR LE CRITÈRE R9.3 byte-identical : product_storage
// garde ses 8 colonnes byte-for-byte, aucune row batch_purity n'existe pour Brindle/Crick/Hush (même esprit que hush_addiction §7.9.2).
// purity_score = entier 0..100 (BO-only, R2.2 — projeté en bande purity_band CUT/STANDARD/PURE/CRYSTALLINE, jamais le score brut).
export const batchPurity = pgTable(
  'batch_purity',
  {
    storage_id:   uuid('storage_id').primaryKey().references(() => productStorage.storage_id, { onDelete: 'cascade' }), // PK 1-1 product_storage row
    player_id:    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),              // §5.1
    purity_score: integer('purity_score').notNull(),                                                                   // interne BO-only (R2.2) — score 0..100, gardé par CHECK
    updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    player_idx: index('batch_purity_player_idx').on(t.player_id),
  }),
);

export const batchPurityRelations = relations(batchPurity, ({ one }) => ({
  player:  one(player,         { fields: [batchPurity.player_id],  references: [player.player_id] }),
  storage: one(productStorage, { fields: [batchPurity.storage_id], references: [productStorage.storage_id] }),
}));

// ===== Table 13 : ash_appointment — Phase-2b substances/Ash (schema_operational_chain.md §7.10.6, NEW table) =====
// 1 row par rendez-vous Ash réservé à un Glass venue. State machine scheduled → honored | expired. honor = la SEULE vente Ash
// (luxury-channel ; Ash ne se vend JAMAIS via DEALER_SELL). booked_at_tick / expires_at_tick en espace city_sim_clock.game_minute.
// grams_sold / payout_cents renseignés à honor uniquement (null tant que scheduled/expired). BO-only ; la projection client expose
// status (+ une bande payout qualitative), JAMAIS payout_cents/grams_sold raw (R2.2).
export const ashAppointment = pgTable(
  'ash_appointment',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),        // §5.1
    glass_venue_building_id: uuid('glass_venue_building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // le Glass venue réservé
    status:                  ashAppointmentStatus('status').notNull().default('scheduled'),                                 // §7.10.6 scheduled→honored|expired
    booked_at_tick:          bigint('booked_at_tick', { mode: 'number' }),                                                  // tick de réservation (city_sim_clock.game_minute)
    expires_at_tick:         bigint('expires_at_tick', { mode: 'number' }),                                                 // booked + appointment_window_ticks ; pilote le sweep APPOINTMENT_EXPIRE (MINUTE/17, T7)
    grams_sold:              integer('grams_sold'),                                                                         // renseigné à honor uniquement (null sinon) — interne BO-only
    payout_cents:            bigint('payout_cents', { mode: 'number' }),                                                    // renseigné à honor uniquement (null sinon) — interne BO-only (R2.2 — jamais raw client)
  },
  (t) => ({
    player_idx:        index('ash_appointment_player_idx').on(t.player_id),
    status_expiry_idx: index('ash_appointment_status_expiry_idx').on(t.status, t.expires_at_tick),                          // sweep set-based du tick APPOINTMENT_EXPIRE (T7)
  }),
);

export const ashAppointmentRelations = relations(ashAppointment, ({ one }) => ({
  player:   one(player,   { fields: [ashAppointment.player_id],               references: [player.player_id] }),
  building: one(building, { fields: [ashAppointment.glass_venue_building_id], references: [building.building_id] }),
}));

// ===== Table 14 : grow_session — Phase-3 grow_house (schema_operational_chain.md §7.11.2, NEW table) =====
// 1 row par culture in-house active sur un grow_house. Sibling de cook_session (§3 Table 4) : state-machine tick-driven
// multi-stages MAIS qui rend un PRECURSEUR dans precursor_stock (source-agnostique) plutôt qu'un produit dans product_storage.
// plant (T2) INSERT stage_1 ; le tick GROW_ADVANCE (MINUTE/18, T3) advance les stages + reset tended_in_stage ; tend (T4)
// bump tend_count + tended_in_stage (one-tend-per-stage) ; harvest (T5) dérive le yield tier (WITHERED/STANDARD/BUMPER) de
// tend_count, UPSERT les grammes dans precursor_stock, DELETE la session. tend_count = lever husbandry B (BO-only — R2.2 :
// projeté en bande husbandry_band, jamais raw). precursor_type REUSE l'enum existant (le sous-ensemble GROWABLE vit en T1).
export const growSession = pgTable(
  'grow_session',
  {
    grow_session_id:       uuid('grow_session_id').primaryKey().defaultRandom(),
    player_id:             uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),        // §5.1
    building_id:           uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // le grow_house cultivant
    precursor_type:        precursorType('precursor_type').notNull(),                                                     // ce qu'on cultive (∈ GROWABLE, validé applicatif T2)
    current_stage:         growStage('current_stage').notNull().default('stage_1'),                                      // §7.11.1 (4 membres) — avancé par GROW_ADVANCE T3
    started_at_tick:       bigint('started_at_tick', { mode: 'number' }),                                                // tick du plant (espace city_sim_clock.game_minute) ; null tant que pas planté
    stage_started_at_tick: bigint('stage_started_at_tick', { mode: 'number' }),                                          // tick d'entrée dans current_stage ; pilote l'advance (stage_started + grow.stage_duration_ticks <= currentTick)
    tend_count:            integer('tend_count').notNull().default(0),                                                   // interne BO-only (R2.2) — lever husbandry B (yield tier), gardé >= 0
    tended_in_stage:       growStage('tended_in_stage'),                                                                 // NULL ⇒ current_stage pas encore tendu (one-tend-per-stage) ; reset par GROW_ADVANCE au passage de stage
  },
  (t) => ({
    building_idx: index('grow_session_building_idx').on(t.building_id),                                                  // one active grow per building (plant verifie l'absence) + scan
    stage_idx:    index('grow_session_stage_idx').on(t.current_stage),                                                   // sweep set-based GROW_ADVANCE (T3)
  }),
);

export const growSessionRelations = relations(growSession, ({ one }) => ({
  player:   one(player,   { fields: [growSession.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [growSession.building_id], references: [building.building_id] }),
}));

// ===== Table 15 : money_holding — Phase-5 vector #5a (schema_operational_chain.md §7.13, NEW table) =====
// L'entité GDD Stage-4 clean-cash holding (déférée jusqu'ici — schema_pipeline_and_laundering.md « entité runtime stage 4
// clean cash holding — hors GDD L259-299, déféré chunk dédié futur »), maintenant créée. 1 row par money_holding bâti
// (lazy-créée à la conversion T1). held_cents = un POOL unique de cash CLEAN détenu (≠ safehouses dirty/per-slot) ; alimenté
// par deposit (wallet→held) / vidé par withdraw (held→wallet) (T3), crédité d'un yield léger lazy-accrual (T4), saigné par
// deux menaces distinctes : street-raid heat-driven (T5a, réutilise building_raid §7.3 — seize une bande de held_cents +
// DAMAGED) et audit-forfeiture value-driven télégraphiée (T5b, tick MONEY_HOLDING_AUDIT — schedule/cancel/execute via
// forfeiture_scheduled_at_tick). money_holding_tier = lever d'upgrade cash → capacité + yield (sibling de hub_tier §7.12.1 /
// lab_tier §7.10.3). held_cents bigint = MÊME mode bigint que economy_states.cash_cents (le wallet) pour que le transfer
// deposit/withdraw n'ait aucune perte de type. last_yield_tick / forfeiture_scheduled_at_tick en espace city_sim_clock.game_minute.
// held_cents / money_holding_tier sont des INPUT internes BO-only (R2.2) — JAMAIS surfacés raw client (projetés en bandes
// held_band / capacity_band / yield_band / forfeiture_band / money_holding_tier_band, T6). Les CHECK (held_cents >= 0,
// money_holding_tier ∈ [1,5]) vivent dans la migration SQL (convention établie — building_raid/lab_tier/grow_session CHECKs SQL-only).
export const moneyHolding = pgTable(
  'money_holding',
  {
    money_holding_id:             uuid('money_holding_id').primaryKey().defaultRandom(),
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),       // §5.1
    building_id:                  uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }), // le money_holding bâti
    held_cents:                   bigint('held_cents', { mode: 'bigint' }).notNull().default(0n),                                // pool clean-cash détenu (mode bigint = parité economy_states.cash_cents) ; BO-only (R2.2) ; gardé >= 0 (CHECK mh_held_cents_nonneg_chk)
    money_holding_tier:           integer('money_holding_tier').notNull().default(1),                                           // lever upgrade cash → capacité+yield (sibling hub_tier/lab_tier) ; gardé [1,5] (CHECK mh_tier_chk ; 5 = money_holding.max_tier) ; BO-only (R2.2 → money_holding_tier_band)
    last_yield_tick:              bigint('last_yield_tick', { mode: 'number' }).notNull(),                                       // anchor lazy-accrual (city_sim_clock.game_minute) — accrued = held × rate × (currentTick - this) ; mis à jour à chaque settle (T4) ; W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE, ancien DEFAULT 0 = "toute l'histoire de la ville créditée à l'inscription" sous l'époque city-global) : `$inferInsert` EXIGE la colonne à chaque `.insert()` Drizzle, `real-estate.repository.ts` la pose = citySimClock.game_minute courant. DDL SQL garde `DEFAULT 0` (13+ specs E2E en SQL brut omettent la colonne — voir C1 implementation-notes.md §Deviations).
    forfeiture_scheduled_at_tick: bigint('forfeiture_scheduled_at_tick', { mode: 'number' }),                                   // NULL = aucune forfeiture programmée ; armé par le tick MONEY_HOLDING_AUDIT (T5b) = now + money_holding.forfeiture_warning_ticks (fenêtre de télégraphe)
  },
  (t) => ({
    player_idx:          index('money_holding_player_idx').on(t.player_id),                                                     // convention §5.1
    player_building_idx: index('money_holding_player_building_idx').on(t.player_id, t.building_id),                             // lookup 1-bâtiment (deposit/withdraw/upgrade/seizure)
  }),
);

export const moneyHoldingRelations = relations(moneyHolding, ({ one }) => ({
  player:   one(player,   { fields: [moneyHolding.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [moneyHolding.building_id], references: [building.building_id] }),
}));

// ===== Table 16 : caught_exception — System 9 §9 (schema_operational_chain.md §7.14, NEW table) =====
// 1 row per caught courier shift. Keyed on shift_id (NOT columns on courier_shift — OQ-21: the
// resolution lifecycle is a distinct entity; side-table avoids bloating the hot MINUTE/9 transit row).
// Lifecycle: pending → lawyered (LAWYER_UP) | abandoned (ABANDON/auto-expire) | silenced (VIOLENT_SILENCE).
// FKs all CASCADE: player/shift/courier/route are all player-scoped → cross-spec pollution risk low.
// caught_at_tick / resolution_deadline_tick / resolved_at_tick: bigint {mode:'bigint'} — serialize as
// strings on API wire (assert '1440' not 1440 in specs). R2.2: leak_magnitude is BO-only (null while
// pending; set at resolution — NEVER exposed raw client).
// reputation_at_catch: smallint snapshot of sessions_active at catch time (for the leak model, C10).
// resolution_deadline_tick = caught_at_tick + distribution.caught_resolution_window_ticks (default 1440).
export const caughtException = pgTable(
  'caught_exception',
  {
    exception_id:             uuid('exception_id').primaryKey().defaultRandom(),                                       // PK (OQ-21)
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),       // FK player CASCADE + INDEX (player_id, status)
    shift_id:                 uuid('shift_id').notNull().references(() => courierShift.shift_id, { onDelete: 'cascade' }),   // FK courier_shift CASCADE + INDEX (shift_id)
    courier_id:               uuid('courier_id').notNull().references(() => courier.courier_id, { onDelete: 'cascade' }),    // FK courier CASCADE
    route_id:                 uuid('route_id').notNull().references(() => route.route_id, { onDelete: 'cascade' }),          // FK route CASCADE
    caught_at_tick:           bigint('caught_at_tick', { mode: 'bigint' }).notNull(),                                       // bigint string on wire (plan §Shared signatures)
    resolution_deadline_tick: bigint('resolution_deadline_tick', { mode: 'bigint' }).notNull(),                             // = caught_at_tick + window (OQ-14 default 1440)
    reputation_at_catch:      smallint('reputation_at_catch').notNull().default(0),                                        // sessions_active snapshot (leak model C10)
    status:                   caughtExceptionStatus('status').notNull().default('pending'),                                 // lifecycle state (C9 resolution)
    resolved_at_tick:         bigint('resolved_at_tick', { mode: 'bigint' }),                                               // null while pending; stamped at resolution (C9)
    leak_magnitude:           real('leak_magnitude'),                                                                      // BO-only (R2.2 — null while pending; set at resolution C10)
    // 04d-A C1 (mig 0098): additive nullable FK → legal_cases(case_id).
    // Soft ref (uuid only — no Drizzle .references() to avoid cross-file circular import; DB FK in mig 0098).
    // NULL for ABANDON/VIOLENT_SILENCE resolutions and all pre-04d-A rows (retro-compat contract, RATIFIÉ #2).
    // Stamped by the LAWYER_UP re-wire (C4) when resolveCaughtException opens a LegalCase.
    // The enum caughtExceptionStatus is UNCHANGED ('lawyered' deepens meaning to "case opened").
    legal_case_id:            uuid('legal_case_id'),                                                                       // nullable FK legal_cases(case_id) — 04d-A C1 mig 0098
  },
  (t) => ({
    player_status_idx: index('caught_exception_player_status_idx').on(t.player_id, t.status), // plan §Shared signatures INDEX (player_id, status)
    shift_idx:         index('caught_exception_shift_idx').on(t.shift_id),                    // plan §Shared signatures INDEX (shift_id)
  }),
);

export const caughtExceptionRelations = relations(caughtException, ({ one }) => ({
  player:  one(player,       { fields: [caughtException.player_id],  references: [player.player_id] }),
  shift:   one(courierShift, { fields: [caughtException.shift_id],   references: [courierShift.shift_id] }),
  courier: one(courier,      { fields: [caughtException.courier_id], references: [courier.courier_id] }),
  route:   one(route,        { fields: [caughtException.route_id],   references: [route.route_id] }),
}));

// ===== Table 17 : corridor_debt — System 9b C8 (schema_operational_chain.md §7.17, NEW table) =====
// Per-player per-block corridor-debt accumulator. DD-DEBT-SSOT (D3):
//   - SINGLE source of truth for debt (no debt column on route — verified absent from C1/C7).
//   - Accrual: each dispatch via CorridorDebtService.accrueOnDispatch adds corridorDebtAccrualPerUse
//     (default 1.0) to debt_magnitude via UPSERT (insert-or-increment).
//   - Decay: CorridorDebtService.runDecayTick (NIGHTLY/11) subtracts corridorDebtDecayPerTick
//     (default 0.05) per tick, floor 0. Game-time (ctx.gameMinute), never Date.now.
//   - block_id is a SOFT-REF to blocks.id (NOT a FK — no FK to blocks; same as threnny_edges
//     inspection_queue_district_id pattern; mig 0076 does NOT reference blocks.id).
//   - PK: (player_id, block_id) — one row per player per block.
//   - OQ-DB3: debt accrual does NOT write patrol_heat/suspicion_map (no cross-signal contamination).
//   - Zero-regression: no existing rows → debt snapshot empty → all debt terms 0 → A* paths
//     byte-identical to C7 baseline (NIGHTLY/11 is a no-op for players with no debt rows).
export const corridorDebt = pgTable(
  'corridor_debt',
  {
    player_id:         uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // FK player CASCADE
    block_id:          integer('block_id').notNull(),                                                            // soft-ref to blocks.id (NOT FK — §7.17)
    debt_magnitude:    real('debt_magnitude').notNull().default(0),                                             // current debt level; floor 0; accrual +1.0/use, decay −0.05/tick
    last_updated_tick: bigint('last_updated_tick', { mode: 'bigint' }),                                         // game-minute of last write (null = never updated; bigint mode:'bigint' → BigInt in JS)
  },
  (t) => ({
    pk:         primaryKey({ columns: [t.player_id, t.block_id] }),
    player_idx: index('corridor_debt_player_idx').on(t.player_id),
  }),
);

export const corridorDebtRelations = relations(corridorDebt, ({ one }) => ({
  player: one(player, { fields: [corridorDebt.player_id], references: [player.player_id] }),
}));

// ===== Table 17 : route_version_history — DD-REPLAN §4.4 (System 9b C9, mig 0077) =====
// Archived snapshot of a route's path_blocks BEFORE a replan.
// Each replan: old path_blocks → new row here; route row gets bumped version + state='active'.
// Route identity is preserved (same route_id). OQ-RP1: version chain on same route row.
// severed_at_tick: nullable — set if the route was severed (state='severed') before replan.
// replanned_at_tick: game-minute when replanRoute() fired (deterministic, getter-sourced).
// FK ON DELETE CASCADE: deleting a route also deletes its version history.
export const routeVersionHistory = pgTable(
  'route_version_history',
  {
    history_id:        uuid('history_id').primaryKey().defaultRandom(),
    route_id:          uuid('route_id').notNull().references(() => route.route_id, { onDelete: 'cascade' }),
    version:           integer('version').notNull(),                                                                // the route.version that was ARCHIVED (before bump)
    path_blocks:       jsonb('path_blocks').notNull().default('[]'),                                               // snapshot of path_blocks at archive time (BlockId[])
    severed_at_tick:   bigint('severed_at_tick', { mode: 'bigint' }),                                              // game-minute when state='severed' was set (null = was not severed)
    replanned_at_tick: bigint('replanned_at_tick', { mode: 'bigint' }).notNull(),                                  // game-minute when replan fired (deterministic, from ctx.gameMinute)
  },
  (t) => ({
    route_version_idx: index('route_version_history_route_version_idx').on(t.route_id, t.version),
  }),
);

export const routeVersionHistoryRelations = relations(routeVersionHistory, ({ one }) => ({
  route: one(route, { fields: [routeVersionHistory.route_id], references: [route.route_id] }),
}));

// ===== Table 18 : vehicle_inventory — DD-ROSTER §5.1 (System 9b C11, mig 0078) =====
// Per-player vehicle ownership pool. Capability-unlock model (OQ-RS1): owning count≥1 unlocks the type.
// `foot` = default-allow at dispatch (OQ-RS4) — never requires an inventory row.
// Purchase: POST /v1/operational/vehicles/purchase debits cash via debitWallet (DIV-R1 cash-only).
// NO hub-tier gating in 9b (DIV-R1; the existing hub-tier vehicle lever in distribution.controller.ts is 9c-owned).
// PK: (player_id, vehicle_type) — one row per player per vehicle type.
// GRANT: SELECT, INSERT, UPDATE, DELETE on vehicle_inventory TO app_rw (mig 0078).
export const vehicleInventory = pgTable(
  'vehicle_inventory',
  {
    player_id:    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // FK player CASCADE
    vehicle_type: vehicleType('vehicle_type').notNull(),                                                    // REUSE existing vehicleType enum
    count:        integer('count').notNull().default(0),                                                    // capability-unlock: ≥1 → type owned
  },
  (t) => ({
    pk:         primaryKey({ columns: [t.player_id, t.vehicle_type] }),
  }),
);

export const vehicleInventoryRelations = relations(vehicleInventory, ({ one }) => ({
  player: one(player, { fields: [vehicleInventory.player_id], references: [player.player_id] }),
}));

// ===== Types inférés Drizzle =====
export type BuildingOperationalStateRow    = typeof buildingOperationalState.$inferSelect;
export type BuildingOperationalStateInsert = typeof buildingOperationalState.$inferInsert;
export type PrecursorStockRow              = typeof precursorStock.$inferSelect;
export type PrecursorStockInsert           = typeof precursorStock.$inferInsert;
export type PrecursorOrderRow              = typeof precursorOrder.$inferSelect;
export type PrecursorOrderInsert           = typeof precursorOrder.$inferInsert;
export type CookSessionRow                 = typeof cookSession.$inferSelect;
export type CookSessionInsert              = typeof cookSession.$inferInsert;
export type ProductStorageRow              = typeof productStorage.$inferSelect;
export type ProductStorageInsert           = typeof productStorage.$inferInsert;
export type DealerRow                      = typeof dealer.$inferSelect;
export type DealerInsert                   = typeof dealer.$inferInsert;
export type CourierRow                     = typeof courier.$inferSelect;
export type CourierInsert                  = typeof courier.$inferInsert;
export type RouteRow                       = typeof route.$inferSelect;
export type RouteInsert                    = typeof route.$inferInsert;
export type CourierShiftRow                = typeof courierShift.$inferSelect;
export type CourierShiftInsert             = typeof courierShift.$inferInsert;
export type BuildingRaidRow                = typeof buildingRaid.$inferSelect;
export type BuildingRaidInsert             = typeof buildingRaid.$inferInsert;
export type HushAddictionRow               = typeof hushAddiction.$inferSelect;
export type HushAddictionInsert            = typeof hushAddiction.$inferInsert;
export type BatchPurityRow                 = typeof batchPurity.$inferSelect;
export type BatchPurityInsert              = typeof batchPurity.$inferInsert;
export type AshAppointmentRow              = typeof ashAppointment.$inferSelect;
export type AshAppointmentInsert           = typeof ashAppointment.$inferInsert;
export type GrowSessionRow                 = typeof growSession.$inferSelect;
export type GrowSessionInsert              = typeof growSession.$inferInsert;
export type MoneyHoldingRow                = typeof moneyHolding.$inferSelect;
export type MoneyHoldingInsert             = typeof moneyHolding.$inferInsert;
export type CaughtExceptionRow             = typeof caughtException.$inferSelect;
export type CaughtExceptionInsert          = typeof caughtException.$inferInsert;
export type CaughtExceptionStatus          = typeof caughtExceptionStatus.enumValues[number];
export type CorridorDebtRow    = typeof corridorDebt.$inferSelect;
export type CorridorDebtInsert = typeof corridorDebt.$inferInsert;
export type RouteVersionHistoryRow    = typeof routeVersionHistory.$inferSelect;
export type RouteVersionHistoryInsert = typeof routeVersionHistory.$inferInsert;
export type VehicleInventoryRow    = typeof vehicleInventory.$inferSelect;
export type VehicleInventoryInsert = typeof vehicleInventory.$inferInsert;

// ===== Table 20 : route_request — DD-ROUTE-REQUEST (System 9c C4, mig 0080) =====
// The durable signal-of-record for a shipment request enqueued by RouteRequestService.
// The bus event RouteRequestEvent (the trigger) is separate from this durable row (the receipt).
//
//   - request_id:        uuid PK — stable identity of the request.
//   - player_id:         uuid FK player CASCADE — the requesting player.
//   - hub_id:            uuid — SOFT-REF to building.building_id (the distribution_hub that owns
//                          this request). NOT a FK — same discipline as corridor_debt.block_id
//                          (mig 0076 soft-ref pattern; the hub may be replaced without orphaning reqs).
//   - target_building_id: uuid nullable — SOFT-REF to the destination building (if specified).
//                          NULL = the coordinator script picks the target via the route-selector.
//   - cargo_hint_grams:  integer nullable — optional cargo hint from the producer (getter-sourced
//                          magnitude if present; NULL lets the coordinator use its default).
//   - status:            route_request_status NOT NULL DEFAULT 'pending'
//                          3-member lifecycle: pending → fulfilled | cancelled.
//   - created_at_tick:   bigint {mode:'bigint'} NOT NULL — game-minute of enqueue (deterministic;
//                          NEVER Date.now(); used for the oldest-first drain order OQ-T3).
//
//   PK:   request_id (uuid surrogate).
//   INDEX: (player_id, hub_id, status) — the primary read pattern (pending for a hub, oldest-first).
//   GRANT: SELECT, INSERT, UPDATE, DELETE ON route_request TO app_rw (mig 0080).
//
//   Zero-regression: NEW table (no existing rows). Additive only.
//   R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit (§7.20).
//   R2.2: the raw route_request rows are server-only (the player-facing surface is banded, C9).
//   C4 (determinism): created_at_tick = ctx.gameMinute (never Date.now() or Math.random).
//   hub_id / target_building_id are soft-refs (NOT FK) — same discipline as corridor_debt.block_id.

export const routeRequestStatus = pgEnum('route_request_status', ['pending', 'fulfilled', 'cancelled']);

export const routeRequest = pgTable(
  'route_request',
  {
    request_id:          uuid('request_id').primaryKey().defaultRandom(),
    player_id:           uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // FK player CASCADE
    hub_id:              uuid('hub_id').notNull(),                                                                // soft-ref to building.building_id (NOT FK — same as corridor_debt.block_id)
    target_building_id:  uuid('target_building_id'),                                                             // soft-ref to building.building_id (nullable — script picks target if null)
    cargo_hint_grams:    integer('cargo_hint_grams'),                                                            // optional cargo hint (nullable — coordinator default used if null)
    status:              routeRequestStatus('status').notNull().default('pending'),                              // 3-member lifecycle: pending → fulfilled | cancelled
    created_at_tick:     bigint('created_at_tick', { mode: 'bigint' }).notNull(),                               // game-minute of enqueue (bigint mode:'bigint' → BigInt in JS; serializes as string on wire)
  },
  (t) => ({
    player_hub_status_idx: index('route_request_player_hub_status_idx').on(t.player_id, t.hub_id, t.status),
  }),
);

export const routeRequestRelations = relations(routeRequest, ({ one }) => ({
  player: one(player, { fields: [routeRequest.player_id], references: [player.player_id] }),
}));

export type RouteRequestRow    = typeof routeRequest.$inferSelect;
export type RouteRequestInsert = typeof routeRequest.$inferInsert;
export type RouteRequestStatus = typeof routeRequestStatus.enumValues[number];

// ===== Table 21 : equipment_failure_log — 04f-A C1 (mig 0119, schema_operational_chain.md §7.21.3) =====
// The BO/timeline + repair-audit trail for equipment-failure events (design §3, DD-M3). Live state (whether
// a building IS currently failed) lives on building_operational_state.structural_state='failed' (D3) —
// this table is the append-mostly EVENT log: one row per failure, updated once at repair-resolution.
// NEVER player-projected (R2.2 — roll_detail is BO-only diagnostics: baseline/factor/mult/seed, makes every
// fired roll auditable + every E2E assertion reconstructible, DD-M3).
//
//   - failure_id:              uuid PK — stable identity of the failure event.
//   - building_id:             uuid FK buildings CASCADE — the failed building.
//   - player_id:                uuid FK player CASCADE — the owner (+ index, BO per-player timeline).
//   - operational_type:        building_operational_type NOT NULL — REUSE (the failed building's type at
//                                failure time; no join needed for BO type-filtered queries).
//   - failed_at_game_day:      bigint NOT NULL — the D1 game-day the failure rolled (BO diagnostics).
//   - failed_at:               timestamptz NOT NULL — the real-clock instant (BO audit trail).
//   - lapse_phase_at_failure:  building_lapse_phase NOT NULL — REUSE the D1 phase enum (which phase's
//                                elevated-odds roll actually fired — balance diagnostic).
//   - roll_detail:             jsonb NOT NULL — the seeded roll trace (baseline/factor/mult/seed — D11
//                                determinism, BO-only, never player-projected).
//   - repair_mode:             repair_mode NULL until resolved — which of the 4 options (D4) the player chose.
//   - repair_cost_cents:       bigint NULL until resolved.
//   - repair_completes_at_tick: bigint NULL until resolved — REUSE the same tick-space as
//                                building_operational_state.repair_completes_at_tick (OPERATIONAL_REPAIR flip).
//   - resolved_at:             timestamptz NULL until resolved.
//
//   PK:    failure_id (uuid surrogate).
//   INDEX: (player_id, failed_at DESC) — the BO EquipmentFailureTimeline hot path (most-recent-first per player).
//   INDEX: (building_id) — per-building failure history lookup.
//   GRANT: UPDATE ON equipment_failure_log TO app_rw (SELECT/INSERT auto via 0013's ALTER DEFAULT PRIVILEGES on
//     NEW tables; UPDATE explicit because repair_mode/repair_cost_cents/repair_completes_at_tick/resolved_at are
//     stamped once at resolution — mirrors the ash_appointment precedent, mig 0022 §7.10.7: a single-resolve-
//     then-frozen row shape, NOT a revert/delete lifecycle, so NO DELETE grant — rows are a permanent BO trail).
//
//   Zero-regression: NEW table (no existing rows). Additive only.
//   R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit (§7.21.3).
export const equipmentFailureLog = pgTable(
  'equipment_failure_log',
  {
    failure_id:               uuid('failure_id').primaryKey().defaultRandom(),
    building_id:               uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    operational_type:          buildingOperationalType('operational_type').notNull(),                              // REUSE — building type at failure time
    failed_at_game_day:        bigint('failed_at_game_day', { mode: 'number' }).notNull(),                        // D1 game-day of the roll
    failed_at:                 timestamp('failed_at', { withTimezone: true }).notNull(),                          // real-clock audit instant
    lapse_phase_at_failure:    buildingLapsePhase('lapse_phase_at_failure').notNull(),                             // REUSE — which phase's odds fired
    roll_detail:               jsonb('roll_detail').notNull().default(sql`'{}'::jsonb`),                          // D11 seeded roll trace — BO-only (R2.2)
    repair_mode:                repairMode('repair_mode'),                                                         // NULL until resolved (D4 4-option pick)
    repair_cost_cents:          bigint('repair_cost_cents', { mode: 'number' }),                                  // NULL until resolved
    repair_completes_at_tick:   bigint('repair_completes_at_tick', { mode: 'number' }),                            // NULL until resolved — REUSE OPERATIONAL_REPAIR tick-space
    resolved_at:                timestamp('resolved_at', { withTimezone: true }),                                  // NULL until resolved
  },
  (t) => ({
    player_failed_at_idx: index('equipment_failure_log_player_failed_at_idx').on(t.player_id, t.failed_at.desc()),
    building_idx:          index('equipment_failure_log_building_idx').on(t.building_id),
  }),
);

export const equipmentFailureLogRelations = relations(equipmentFailureLog, ({ one }) => ({
  player:   one(player,   { fields: [equipmentFailureLog.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [equipmentFailureLog.building_id], references: [building.building_id] }),
}));

export type EquipmentFailureLogRow    = typeof equipmentFailureLog.$inferSelect;
export type EquipmentFailureLogInsert = typeof equipmentFailureLog.$inferInsert;

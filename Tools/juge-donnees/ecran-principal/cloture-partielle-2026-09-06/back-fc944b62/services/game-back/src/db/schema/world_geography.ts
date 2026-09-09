// IMPLEMENTS: docs/tech/09_data_model/schema_world_geography.md§2 -- session:2026-06-02 --
//             + 04e-A1 C8 addendum (migration 0109, ★ Substrate 3: Stack zoning gate) --
//             + 04e-A1 C9 addendum (migration 0110, ★ Substrate 4: checkpoint inspection-density) --
import { pgTable, integer, varchar, jsonb, index, pgEnum, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// World geography = GLOBAL static reference data (the immutable Brennar map). NO player_id
// anywhere — it is the same Brennar for every save (brennar_city.md §Cross-cutting:
// "La géographie est connue"). Seeded once at boot via migration 0016 (idempotent ON CONFLICT).
// This is DIFFERENT from the 7 per-player city_state tables (those carry player_id + CASCADE).

// ===== Enums PG natifs (domaines fermés) =====
// 6 profils canoniques — brennar_city.md §Unity + gdd/15 §district profile.
export const districtProfile = pgEnum('district_profile', [
  'tidewater',
  'spine',
  'lattice',
  'stack',
  'glass',
  'verge',
]);
// Rive du Threnny — brennar_city.md §NestJS bank_side: north|south + gdd/15 §bank side.
export const bankSide = pgEnum('bank_side', ['north', 'south']);
// Type de traversée — brennar_city.md §NestJS ThrennyEdge type: bridge|ferry + gdd/15 §ThrennyEdge.
export const thrennyEdgeType = pgEnum('threnny_edge_type', ['bridge', 'ferry']);

// ===== Table 1 : districts — 18 rows GLOBAUX statiques =====
// PK simple integer (= la valeur référencée par tous les `district_id integer` existants des
// city_state tables). Identité immuable = (profile, index_label) ; district_key = clé lowercase.
export const districts = pgTable(
  'districts',
  {
    id: integer('id').primaryKey(), // 1..18 — soft-ref target de district_cohesion.district_id etc.
    district_key: varchar('district_key', { length: 32 }).notNull(), // 'tidewater-1' — clé canonique lowercase (gdd/15 §Districts)
    profile: districtProfile('profile').notNull(), // enum 6 membres
    index_label: varchar('index_label', { length: 4 }).notNull(), // '1' | 'a' — suffixe profil+index
    name_canonical: varchar('name_canonical', { length: 48 }).notNull(), // 'Tidewater-1' — Title-Case display
    bank_side: bankSide('bank_side').notNull(), // north | south (split §5 D1)
    block_count: integer('block_count').notNull(), // 30..80 déterministe (§4/§5 D2) — CHECK PG §3
  },
  (table) => ({
    district_key_idx: index('districts_district_key_idx').on(table.district_key),
    bank_side_idx: index('districts_bank_side_idx').on(table.bank_side),
  }),
);

// ===== Table 2 : blocks — ~N rows GLOBAUX statiques =====
// PK simple integer global (= la valeur référencée par home_block_id / buildings.block_id existants).
// FK DB-side réelle vers districts (deux tables GLOBALES → FK légitime, RESTRICT car statique).
export const blocks = pgTable(
  'blocks',
  {
    id: integer('id').primaryKey(), // global block id (soft-ref target)
    district_id: integer('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'restrict' }), // FK globale réelle
    coordinates: jsonb('coordinates').notNull(), // {"x":int,"y":int} déterministe (§4 D3)
    // 04e-A1 C8 addendum (migration 0109, ★ Substrate 3 — design §4.3, LOCKED decision (a): "a genuine
    // Stack zoning gate … NOT a Tier cap change"). NULL for every block except the 6 LOWEST-id Stack-
    // profile blocks (the admin cap ceiling — real_estate.stack_zoning_gated_lot_count range 1..6), which
    // carry their FIXED ordinal (1 = lowest-id Stack block, …, 6 = sixth). SpecializedLabRepository.
    // isStackZoningGated reads: gated iff rank IS NOT NULL AND rank <= the CURRENT (overlay-composed)
    // stackZoningGatedLotCount. Read-only at runtime (never written by app_rw — assigned once at 0109).
    stack_zoning_rank: integer('stack_zoning_rank'),
  },
  (table) => ({
    district_idx: index('blocks_district_idx').on(table.district_id),
    stack_zoning_rank_idx: index('blocks_stack_zoning_rank_idx').on(table.stack_zoning_rank),
    stack_zoning_rank_chk: check(
      'blocks_stack_zoning_rank_chk',
      sql`${table.stack_zoning_rank} IS NULL OR ${table.stack_zoning_rank} BETWEEN 1 AND 6`,
    ),
  }),
);

// ===== Table 3 : threnny_edges — M rows GLOBAUX statiques =====
// FK DB-side réelles vers districts (×2, north & south). inspection_queue_district_id = soft-ref
// integer (district riverain dont la queue MIS PER-PLAYER traite la traversée) — JAMAIS FK vers
// inspection_queues (PK composite (player_id, district_id) = table per-player ; on ne peut pas FK
// depuis une row globale statique). Mirroir pattern soft-ref schema_sparse_citizens §2. Cf §5 D5.
//
// 04e-A1 C9 addendum (migration 0110, ★ Substrate 4: checkpoint inspection-density, design §4.4):
// `inspection_queue_district_id` IS the river-crossing-district mapping the substrate needs — no NEW
// column added (the base density is a pure tunable, `checkpoint_inspection_density_default`, C1 — no
// DB persistence; nothing per-edge varies). `InspectionQueueService.loadRiverCrossingDistrictIds()`
// reads `SELECT DISTINCT inspection_queue_district_id FROM threnny_edges` ONCE at boot (mirrors its
// existing `loadDistrictIds()` pattern) into an in-memory Set — the new index below supports that
// query (and any future per-tick re-derivation).
export const thrennyEdges = pgTable(
  'threnny_edges',
  {
    id: integer('id').primaryKey(),
    edge_type: thrennyEdgeType('edge_type').notNull(), // bridge | ferry
    north_district_id: integer('north_district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'restrict' }), // FK globale réelle (rive nord)
    south_district_id: integer('south_district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'restrict' }), // FK globale réelle (rive sud)
    inspection_queue_district_id: integer('inspection_queue_district_id').notNull(), // soft-ref (résolu runtime via (player_id, district_id))
  },
  (table) => ({
    north_idx: index('threnny_edges_north_idx').on(table.north_district_id),
    south_idx: index('threnny_edges_south_idx').on(table.south_district_id),
    // 04e-A1 C9 addendum (migration 0110) — supports the river-crossing-district-set derivation query.
    inspection_queue_district_idx: index('threnny_edges_inspection_queue_district_idx').on(
      table.inspection_queue_district_id,
    ),
  }),
);

// ===== Relations (globales — pas de player) =====
export const blocksRelations = relations(blocks, ({ one }) => ({
  district: one(districts, {
    fields: [blocks.district_id],
    references: [districts.id],
  }),
}));

export const districtsRelations = relations(districts, ({ many }) => ({
  blocks: many(blocks),
}));

// ===== Types inférés Drizzle =====
export type DistrictRow = typeof districts.$inferSelect;
export type DistrictInsert = typeof districts.$inferInsert;
export type BlockRow = typeof blocks.$inferSelect;
export type BlockInsert = typeof blocks.$inferInsert;
export type ThrennyEdgeRow = typeof thrennyEdges.$inferSelect;
export type ThrennyEdgeInsert = typeof thrennyEdges.$inferInsert;

// ===== Enums TS mirror PG natif =====
export type DistrictProfileEnumTs = (typeof districtProfile.enumValues)[number]; // 'tidewater' | ... | 'verge'
export type BankSideEnumTs = (typeof bankSide.enumValues)[number]; // 'north' | 'south'
export type ThrennyEdgeTypeEnumTs = (typeof thrennyEdgeType.enumValues)[number]; // 'bridge' | 'ferry'

// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.3 (Wear-Mark Premium)
//             docs/tech/09_data_model/schema_market_wear_mark.md §2 (R9.3 backport)
//             docs/tech/04a_operational_systems/product_storage.md §59-60 (lot_handling_vector preview hook)
//             — D1b C4 — 2026-06-16
//
// REUSE (cited): `lot_handling_vector` is the materialization of the 04a chunk 7 "preview hook"
// described in product_storage.md §59-60 and schema_operational_chain.md §deferred-note.
// The preview hook named the field; this table IS the canonical materialization.
// Pattern: side-table keyed on (player_id, storage_id), same as batch_purity (operational_chain.ts §12).
// R9.3: NO column added to product_storage (additive side-table strategy, consistent with ch09 audit).
//
// TABLES:
//   lot_handling_vector  — 6-field handling state per (player_id × storage_id).
//                          REUSE 04a chunk 7 preview hook. Mutates every distribution leg.
//   district_wear_mark_demographics — cautious_share + pristine_share per district_id.
//                          World-gen will seed via wear_demographic_invert_share fraction
//                          (canon market_mechanics.md:130); fraction-based seeding is DEFERRED
//                          (C4-F7 → C9). Test-seeded via explicit-shares upsert. Column defaults
//                          are the cautious baseline; no live fraction gate exists yet.
//
// R9.3: this file matches the SQL migration 0040_market_wear_mark.sql byte-for-byte.
//       The ch09 mirror is docs/tech/09_data_model/schema_market_wear_mark.md.

import { pgTable, uuid, integer, smallint, real, timestamp, check, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { player } from './player';
import { districts } from './world_geography';

// ===== Table 1: lot_handling_vector — per (player_id × storage_id) handling state =====
//
// Materialization of the 04a chunk 7 "preview hook" (product_storage.md §59-60).
// The `storage_id` references product_storage.storage_id conceptually (soft-ref: no FK declared
// to avoid cascade complexity when storage rows are deleted — the service handles cleanup).
// All 6 bytes as specified in market_mechanics.md:121-126.
//
// NOTE: This is a SIDE TABLE keyed on (player_id, storage_id), following the batch_purity pattern
// (operational_chain.ts §12). NO column added to product_storage (R9.3 additive, non-invasive).
//
// R2.2 HARD INVARIANT: the raw fields (hop_count, transit_days, etc.) are NEVER forwarded to the client.
// Player sees ONLY the handling-card icons + realised_price_multiplier_bucket (via MarketProjectionService).
export const lotHandlingVector = pgTable(
  'lot_handling_vector',
  {
    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Ownership: the lot belongs to the player (multi-player awareness: each player's lots are independent).
     */
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * storage_id — the product_storage.storage_id (soft-ref, no FK).
     * Soft-ref pattern (consistent with district_id soft-refs in this codebase).
     * Using uuid to match product_storage.storage_id type (operational_chain.ts §5).
     */
    storage_id: uuid('storage_id').notNull(),

    /**
     * hop_count (8 bits) — Distribution legs traversed (market_mechanics.md:121).
     * Incremented by mutateLotVectorOnDistributionLeg. Capped at 255 (uint8 semantics).
     */
    hop_count: smallint('hop_count').notNull().default(0),

    /**
     * transit_days (8 bits) — In-game days in transit (market_mechanics.md:122).
     * Accumulated across legs. Capped at 255 (uint8 semantics).
     */
    transit_days: smallint('transit_days').notNull().default(0),

    /**
     * repackaging_count (8 bits) — Number of repackaging events (market_mechanics.md:123).
     * Each repackaging adds wear (applies wear_decay_per_repackaging to pristine_flag).
     * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: wear_decay_per_repackaging = 0.40
     *   (market_mechanics.md:151 default; registry-add gdd/14 §Market — absent at C4 baseline,
     *   added by this chunk as R9.3-additive with the tech-doc default).
     */
    repackaging_count: smallint('repackaging_count').notNull().default(0),

    /**
     * courier_diversity (8 bits) — Distinct couriers involved (market_mechanics.md:124).
     * Tracked as an 8-bit count (saturates at 255).
     */
    courier_diversity: smallint('courier_diversity').notNull().default(0),

    /**
     * origin_age_days (8 bits) — Age of the lot since cooking completed (market_mechanics.md:125).
     * Accumulated on storage ticks. Capped at 255.
     */
    origin_age_days: smallint('origin_age_days').notNull().default(0),

    /**
     * wear_flag_mask (8 bits) — Bitmask of wear cues (market_mechanics.md:126).
     * Bits: 0=smudged_wrap, 1=partial_seal, 2=hand_cut_bricks, others reserved.
     * Set by mutateLotVectorOnDistributionLeg based on repackaging events.
     */
    wear_flag_mask: smallint('wear_flag_mask').notNull().default(0),

    /**
     * pristine_flag — derived view of lot handling cleanliness.
     * 1.0 = pristine (new lot, 0 repackagings, low hops, low transit). Decays per repackaging.
     * Computed and stored for the sigmoid formula:
     *   S = w1·(1/hop_count) + w2·(1/transit_days) + w3·pristine_flag (market_mechanics.md:133).
     * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: initial value 1.0 (fully pristine), decays by
     *   wear_decay_per_repackaging (= 0.40) per repackaging event.
     * Stored as real (float4) in range [0, 1].
     */
    pristine_flag: real('pristine_flag').notNull().default(1.0),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.storage_id] }),
    hop_count_chk: check(
      'lot_handling_vector_hop_count_chk',
      sql`${table.hop_count} >= 0 AND ${table.hop_count} <= 255`,
    ),
    transit_days_chk: check(
      'lot_handling_vector_transit_days_chk',
      sql`${table.transit_days} >= 0 AND ${table.transit_days} <= 255`,
    ),
    repackaging_count_chk: check(
      'lot_handling_vector_repackaging_count_chk',
      sql`${table.repackaging_count} >= 0 AND ${table.repackaging_count} <= 255`,
    ),
    pristine_flag_chk: check(
      'lot_handling_vector_pristine_flag_chk',
      sql`${table.pristine_flag} >= 0 AND ${table.pristine_flag} <= 1`,
    ),
  }),
);

// ===== Table 2: district_wear_mark_demographics — cautious_share + pristine_share per district =====
//
// World-gen seeded (or test-seeded) per district. Implements:
//   market_mechanics.md:130 — "Each district holds two demographic-segment weights: cautious_share +
//   pristine_share (sum = 1). World-gen seeds these. Tunable `invert_district_fraction` controls
//   proportion seeded with pristine_share > 0.5 (Glass-tier inversion). Default 0.25."
//
// FK → districts(id) ON DELETE CASCADE (global static table → FK legitimate).
// PK: district_id (one demographics row per district).
//
// cautious_share + pristine_share = 1.0 (enforced by CHECK).
// Glass-tier inversion: pristine_share > 0.5 — world-gen will seed this via the fraction
// (wear_demographic_invert_share = 0.25, canon market_mechanics.md:130); DEFERRED (C4-F7 → C9).
// No live fraction gate exists yet — column defaults are the cautious baseline.
export const districtWearMarkDemographics = pgTable(
  'district_wear_mark_demographics',
  {
    /**
     * district_id — FK → districts(id) ON DELETE CASCADE. PK.
     * One demographics row per district (world-gen seeded, updated by ops).
     */
    district_id: integer('district_id')
      .primaryKey()
      .references(() => districts.id, { onDelete: 'cascade' }),

    /**
     * cautious_share — fraction of the district's buyers who are "cautious" (prefer handled product).
     * cautious_share + pristine_share = 1.0 (CHECK enforced).
     * Default: 0.75 (cautious district). Glass-inverted: 0.20.
     * [DESIGN DECISION — CAUTIOUS_DEFAULT]: default cautious_share = 0.75 (cautious baseline).
     * World-gen will seed this via the inversion fraction (wear_demographic_invert_share = 0.25,
     * canon market_mechanics.md:130); that fraction-based seeding is DEFERRED (C4-F7 → C9).
     * No live fraction gate exists yet — this default is the cautious baseline.
     */
    cautious_share: real('cautious_share').notNull().default(0.75),

    /**
     * pristine_share — fraction of the district's buyers who prefer pristine product.
     * pristine_share = 1 − cautious_share.
     * Default: 0.25 (cautious district). Glass-inverted: 0.80.
     */
    pristine_share: real('pristine_share').notNull().default(0.25),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    shares_sum_chk: check(
      'district_wear_mark_demographics_shares_sum_chk',
      // cautious_share + pristine_share ≈ 1.0 (within float tolerance ±0.01).
      sql`${table.cautious_share} + ${table.pristine_share} > 0.99 AND ${table.cautious_share} + ${table.pristine_share} < 1.01`,
    ),
    cautious_share_range_chk: check(
      'district_wear_mark_demographics_cautious_share_range_chk',
      sql`${table.cautious_share} >= 0 AND ${table.cautious_share} <= 1`,
    ),
    pristine_share_range_chk: check(
      'district_wear_mark_demographics_pristine_share_range_chk',
      sql`${table.pristine_share} >= 0 AND ${table.pristine_share} <= 1`,
    ),
  }),
);

// ===== Inferred Drizzle types =====
export type LotHandlingVectorRow = typeof lotHandlingVector.$inferSelect;
export type LotHandlingVectorInsert = typeof lotHandlingVector.$inferInsert;
export type DistrictWearMarkDemographicsRow = typeof districtWearMarkDemographics.$inferSelect;
export type DistrictWearMarkDemographicsInsert = typeof districtWearMarkDemographics.$inferInsert;

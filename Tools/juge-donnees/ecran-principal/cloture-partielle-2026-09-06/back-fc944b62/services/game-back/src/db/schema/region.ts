// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1b (region substrate)
//             Plan §2.2 — region + region_country_map tables (migration 0102)
//             R9.3: backported to docs/tech/09_data_model/schema_region.md (same-commit)
//             RGPD: region_id = derived geo-region (NOT the raw IP). IP NEVER persisted (decision #b).
//             Granularity: country (decision #c — US as one bloc, no subdivision).
//             Seed: ~10 canon-analog regions [PROV-Y26Q2] + 'unknown' fallback.
//             — 04d-C C1b — 2026-07-03
//
// TABLES (2 NEW — migration 0102):
//
//   region — real-world player groupings (~10 seeded canon-analog [PROV-Y26Q2] + 'unknown').
//     PK: region_id varchar(16) — keys like 'eu-west', 'us-east', 'sea', 'latam', 'oce', etc.
//     STATIC reference table: seeded at migration time; no player FK.
//
//   region_country_map — ISO-3166-1-alpha-2 country code → region_id (FK region).
//     PK: country_code char(2) — ISO country code.
//     One country maps to exactly one region. Countries NOT in this table → fallback 'unknown'.
//
// NOTE: player.region_id (additive nullable column) is declared in player.ts (not here)
// to keep the player schema self-contained. See player.ts + migration 0102.

import { pgTable, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== `region` — real-world player groupings =====

/**
 * `region` — static reference table of real-world player groupings for the meta-market.
 *
 * Seeded once at migration time (~10 regions + 'unknown' fallback). The table is ADDITIVE-ONLY
 * in production — regions are added via migration, never deleted (no cascade concern).
 *
 * `region_id` uses hyphenated short keys (e.g. 'eu-west', 'us-east') — varchar(16) PK.
 * `active` bool: inactive regions are hidden from aggregation reads (BO-managed).
 *
 * Canon: [PROV-Y26Q2] — region set is a NEW canon-analog identity; no upstream hard-codes.
 * R2.2: region_id is a routing key (non-sensitive); display_name is a public label.
 *
 * Zero-regression: ADDITIVE ONLY. No existing tables modified.
 */
export const region = pgTable(
  'region',
  {
    /** PK — short hyphenated key (e.g. 'eu-west', 'unknown'). varchar(16). */
    region_id:    varchar('region_id', { length: 16 }).primaryKey(),
    /** Human-readable label (e.g. 'EU West'). Used in BO display and logs. */
    display_name: varchar('display_name', { length: 64 }).notNull(),
    /**
     * Whether this region is active. Inactive regions remain valid FK targets (existing player
     * rows stay valid) — no cascade, no orphaning.
     *
     * ⚠️ W6.3 C6 — MEASURED, not asserted: `MetaMarketReadService.getSignal` never joins `region`
     * and never reads this column (verified: the only occurrence of the string "active" inside
     * `operational/meta_market/` is an unrelated log message in `maxmind-geoip.service.ts`). This
     * column is currently a BO-facing flag ONLY (no reader in the read path yet) — a prior
     * comment here claimed the signal read skips inactive regions; that claim was never true of
     * the code and is not restated. If a future lot wires a read-path check on this column, this
     * docblock is the place to describe it — anchored to the call site, not to a repeated claim.
     * Default: true (all seeded regions start active).
     */
    active: boolean('active').notNull().default(true),
  },
);

export type RegionRow = typeof region.$inferSelect;
export type RegionInsert = typeof region.$inferInsert;

// ===== `region_country_map` — ISO-3166-1-alpha-2 → region_id =====

/**
 * `region_country_map` — maps an ISO-3166-1-alpha-2 country code to a `region_id`.
 *
 * PK: `country_code` char(2) — one country maps to exactly one region.
 * FK: `region_id → region(region_id)` (NOT NULL).
 *
 * Countries NOT present in this table → caller falls back to 'unknown' region.
 * Granularity: country level (decision #c — no subdivision; GeoLite2-Country edition).
 *
 * Seeded at migration time alongside the `region` rows.
 * Zero-regression: ADDITIVE ONLY. Read-only at runtime (no game logic mutates it).
 */
export const regionCountryMap = pgTable(
  'region_country_map',
  {
    /** ISO-3166-1-alpha-2 country code (e.g. 'FR', 'US', 'SE'). PK. */
    country_code: varchar('country_code', { length: 2 }).primaryKey(),
    /**
     * The region this country belongs to.
     * FK → region(region_id). NOT NULL.
     * Countries with unknown IP (private ranges, RFC1918, loopback) are NOT in this table →
     * RegionService falls back to 'unknown' (the region_id of the fallback seeded row).
     */
    region_id: varchar('region_id', { length: 16 })
      .notNull()
      .references(() => region.region_id),
  },
  (table) => ({
    /** INDEX on region_id for per-region reverse lookups (e.g. which countries are in eu-west). */
    region_id_idx: index('region_country_map_region_idx').on(table.region_id),
  }),
);

export type RegionCountryMapRow = typeof regionCountryMap.$inferSelect;
export type RegionCountryMapInsert = typeof regionCountryMap.$inferInsert;

// ===== Relations =====

export const regionRelations = relations(region, ({ many }) => ({
  countryMappings: many(regionCountryMap),
}));

export const regionCountryMapRelations = relations(regionCountryMap, ({ one }) => ({
  region: one(region, {
    fields: [regionCountryMap.region_id],
    references: [region.region_id],
  }),
}));

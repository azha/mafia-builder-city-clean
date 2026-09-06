// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C2 (schema meta-market)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §State (:50-65)
//             Plan §2.2 C2 — meta_market_signals + meta_market_contributions (contributor_hash ONLY)
//                          + meta_market_cohort_flags (REUSE substanceType + districtProfile)
//             R9.3: backported to docs/tech/09_data_model/schema_meta_market.md (same-commit)
//             R2.2/Privacy wall: meta_market_contributions has NO player_id column — only contributor_hash
//             (HMAC-SHA256 hex, 64 chars). Raw player_id is NEVER persisted (decision #2, RATIFIÉ).
//             IP is NEVER persisted (RGPD decision #b — see region.ts / C1b).
//             — 04d-C C2 — 2026-07-03
//
// TABLES (3 NEW — migrations 0103-0104):
//
//   meta_market_signals — aggregated signal per (region_id × substance × district_profile × hour bucket).
//     PK: composite (region_id, substance, district_profile, aggregated_at).
//     GLOBAL table: no player FK. Written ONLY by MetaMarketAggregationService (C5 HOURLY job).
//     sample_count: number of distinct HMAC-hashed contributors in this bucket (NEVER a player count).
//     median/p10/p90_price_cents: bigint (price in cents, unsigned semantics, PG bigint 8B).
//     Canon: async_meta_market.md :50-65 (schema verbatim, with FK additions per plan §2.2).
//     Cardinality: ~10 regions × 4 substances × 6 district profiles × 24 buckets/day × 30 days ≈ 170k rows.
//     INDEX: (region_id, substance, district_profile, aggregated_at DESC) — canon :63 lookup pattern.
//
//   meta_market_contributions — pending contribution queue (pre-aggregation).
//     PK: contribution_id uuid (generated at insert).
//     contributor_hash: varchar(64) — HMAC-SHA256 hex output of player_id (64 chars, hex-encoded).
//       NEVER stores the raw player_id. Only the hash is persisted (privacy wall, decision #2).
//       Named `contributor_hash` (not `player_id`, not `hashed_player_id`) to make the privacy
//       invariant structurally visible in the schema column name.
//     bucket_hour: timestamptz — truncated to the hour boundary (rate-limit deduplication key).
//       One contribution per (contributor_hash × substance × district_profile × bucket_hour).
//       Enforced by MetaMarketContributionService (C4); the schema does not add a UNIQUE constraint
//       to allow service-level idempotency (UPSERT pattern from C4).
//     INDEX: (region_id, substance, district_profile, bucket_hour) — aggregation lookup per bucket.
//     INDEX: (contributor_hash, substance, district_profile, bucket_hour) — rate-limit dedup.
//     Purged by MetaMarketRetentionService after aggregation (NIGHTLY C5).
//
//   meta_market_cohort_flags — anti-cheat detection flags (produced by MetaMarketAntiCheatService C6).
//     PK: flag_id uuid. No player FK (detection result, not per-player state).
//     district_profile: nullable — cohort detection may be per-region+substance (no district axis).
//     flagged_pattern: varchar(64) — detector label (e.g. 'volume_spike', 'new_account_cluster').
//     cohort_size: integer — estimated number of coordinated accounts detected.
//     detected_at: timestamptz NOT NULL DEFAULT now() — wallclock timestamp of detection.
//     INDEX: (region_id, substance, detected_at DESC) — BO lookup for ops anti-cheat dashboard.
//
// REUSE (DO NOT re-declare):
//   `substanceType` pgEnum from operational_chain.ts:36 — ['brindle','crick','hush','ash'].
//   `districtProfile` pgEnum from world_geography.ts:12 — ['tidewater','spine','lattice','stack','glass','verge'].
//   `region(region_id)` FK from region.ts — the geo-region key.
//
// Zero-regression: ADDITIVE only. No existing tables or columns are modified by migrations 0103-0104.
// Anti-fabrication: no Math.random(), no non-deterministic defaults, no inline scalar tunables.
//   All tunable references (sample_floor, trim_pct, etc.) will be injected via MetaMarketTunables (C3).

import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { substanceType } from './operational_chain';
import { districtProfile } from './world_geography';
import { region } from './region';

// ===== Table 1: meta_market_signals — aggregated signal per (region × substance × district × hour) =====
//
// Written ONLY by MetaMarketAggregationService (C5 HOURLY job).
// Read by MetaMarketReadService (C6) — returns 'insufficient_signal' when sample_count < sample_floor.
// PK is composite (region_id, substance, district_profile, aggregated_at) — canon SQL verbatim.
// FK: region_id → region(region_id). Cascades on region deletion (region rows are static; this is
//   defensive — region deletions should never happen in production, handled by admin-GC only).
// R9.3: mirrors migration 0103_meta_market_signals.sql byte-for-meaning.
export const metaMarketSignals = pgTable(
  'meta_market_signals',
  {
    /**
     * region_id — real-world player region key (e.g. 'eu-west', 'us-east').
     * FK → region(region_id). Part of composite PK.
     * Cardinality: ~10 regions × 4 substances × 6 district profiles × 24 hr/day × 30d ≈ 170k rows total.
     * Canon: async_meta_market.md :51 "region_id varchar(16)".
     */
    region_id: varchar('region_id', { length: 16 })
      .notNull()
      .references(() => region.region_id, { onDelete: 'cascade' }),

    /**
     * substance — drug substance type (REUSE substanceType from operational_chain.ts:36).
     * ['brindle', 'crick', 'hush', 'ash'] — 4 members (canon product_storage.md §54).
     * Part of composite PK.
     * Canon: async_meta_market.md :52 "substance enum".
     */
    substance: substanceType('substance').notNull(),

    /**
     * district_profile — in-game district profile (REUSE districtProfile from world_geography.ts:12).
     * ['tidewater','spine','lattice','stack','glass','verge'] — 6 members (brennar_city.md §Unity).
     * Part of composite PK. Orthogonal to region_id (geo-region vs in-game district type).
     * Canon: async_meta_market.md :53 "district_profile enum — Tidewater / Spine / Stack / Lattice / Glass / Verge".
     */
    district_profile: districtProfile('district_profile').notNull(),

    /**
     * aggregated_at — hourly bucket boundary (timestamptz, truncated to the hour by the aggregation job).
     * Part of composite PK. Unique bucket per (region, substance, district_profile, hour).
     * Used by the retention purge: DELETE WHERE aggregated_at < now() - retention_days (C5 NIGHTLY).
     * Canon: async_meta_market.md :54 "aggregated_at timestamp — bucket boundary (hourly)".
     */
    aggregated_at: timestamp('aggregated_at', { withTimezone: true }).notNull(),

    /**
     * sample_count — number of distinct HMAC-hashed contributors in this bucket.
     * NOT a per-player count: this counts hashed contributor identities (HMAC-SHA256 tokens),
     * not raw player_ids. Used by the sample-floor gate (C6): if sample_count < sample_floor (5),
     * the signal is NOT surfaced ("insufficient_signal" — prevents de-anonymization).
     * Canon: async_meta_market.md :55 "sample_count int — number of player-contributions in this bucket".
     */
    sample_count: integer('sample_count').notNull(),

    /**
     * median_price_cents — trimmed median sell price in cents (bigint, 8B — large values safe).
     * Computed by MetaMarketAggregationService: trim top/bottom 5% → compute median.
     * Canon: async_meta_market.md :56 "median_price_cents bigint".
     */
    median_price_cents: bigint('median_price_cents', { mode: 'bigint' }).notNull(),

    /**
     * p10_price_cents — 10th percentile sell price in cents (bigint, post-trim).
     * Together with p90_price_cents, forms the "90% range" displayed to the player.
     * Canon: async_meta_market.md :57 "p10_price_cents bigint".
     */
    p10_price_cents: bigint('p10_price_cents', { mode: 'bigint' }).notNull(),

    /**
     * p90_price_cents — 90th percentile sell price in cents (bigint, post-trim).
     * Canon: async_meta_market.md :58 "p90_price_cents bigint".
     */
    p90_price_cents: bigint('p90_price_cents', { mode: 'bigint' }).notNull(),
  },
  (t) => ({
    /**
     * Composite PK (region_id, substance, district_profile, aggregated_at).
     * Canon: async_meta_market.md :60 "primary key (region_id, substance, district_profile, aggregated_at)".
     * One signal row per (region × substance × district_profile × hour bucket).
     * UPSERT ON CONFLICT target in the aggregation job (C5).
     */
    pk: primaryKey({
      columns: [t.region_id, t.substance, t.district_profile, t.aggregated_at],
    }),

    /**
     * INDEX (region_id, substance, district_profile, aggregated_at DESC) — canonical lookup.
     * Canon: async_meta_market.md :63-64 "create index idx_meta_market_lookup on meta_market_signals
     *   (region_id, substance, district_profile, aggregated_at desc)".
     * Used by MetaMarketReadService (C6) to fetch recent buckets per signal key.
     * Mirrors physical index name `meta_market_signals_lookup_idx` (migration 0103).
     */
    lookup_idx: index('meta_market_signals_lookup_idx').on(
      t.region_id,
      t.substance,
      t.district_profile,
      t.aggregated_at,
    ),
  }),
);

export type MetaMarketSignalRow    = typeof metaMarketSignals.$inferSelect;
export type MetaMarketSignalInsert = typeof metaMarketSignals.$inferInsert;

// ===== Table 2: meta_market_contributions — pending contribution queue (pre-aggregation) =====
//
// Pending contributions written by MetaMarketContributionService (C4 — the additive sell-path emit).
// Consumed (aggregated + cleared) by MetaMarketAggregationService (C5 HOURLY job).
//
// PRIVACY WALL (decision #2, RATIFIÉ — R2.2 canonical form):
//   The raw `player_id` is HMAC-SHA256 hashed BEFORE any write (C4 MetaMarketHashService).
//   Only `contributor_hash` (the HMAC hex output) is stored — NEVER the raw player_id.
//   This is enforced STRUCTURALLY: there is NO `player_id` column in this table.
//   A grep-zero on `meta_market_contributions` + `player_id` (column name) = proof of this invariant.
//   The column is named `contributor_hash` (not `hashed_player_id`) to make the anonymization
//   intent visible at the schema level.
//
// Rate-limit: one contribution per (contributor_hash × substance × district_profile × bucket_hour).
//   Enforced by MetaMarketContributionService (C4 service logic, not a DB UNIQUE constraint).
//   Service uses UPSERT ON CONFLICT (contributor_hash, substance, district_profile, bucket_hour)
//   to handle concurrent submissions atomically. Index below supports this lookup.
//
// R9.3: mirrors migration 0104_meta_market_contributions_and_cohort_flags.sql byte-for-meaning.
export const metaMarketContributions = pgTable(
  'meta_market_contributions',
  {
    /**
     * contribution_id — PK uuid, generated at insert time.
     * Each contribution attempt creates one row (modulo rate-limit dedup — C4 service layer).
     */
    contribution_id: uuid('contribution_id').primaryKey().defaultRandom(),

    /**
     * contributor_hash — HMAC-SHA256 hex output of the player_id (64-char lowercase hex string).
     *
     * PRIVACY: this is the ONLY player identifier stored. The raw player_id is NEVER persisted
     * here (or in meta_market_signals). The hash is computed by MetaMarketHashService (C4)
     * using a per-region rotating secret (hmac_secret_rotation_days tunable C3).
     *
     * Named `contributor_hash` (not `player_id`) to make the anonymization invariant structurally
     * visible. Used for rate-limit dedup (one contribution per contributor per substance per
     * district per hour-bucket) and for cohort-detection (not for de-anonymization).
     *
     * varchar(64): HMAC-SHA256 produces 32 bytes = 64 lowercase hex chars.
     * Canon: async_meta_market.md :72 "player_id HMAC-SHA256 hashed ... Only price + substance +
     *   district_profile + region propagate. Original player_id never stored."
     */
    contributor_hash: varchar('contributor_hash', { length: 64 }).notNull(),

    /**
     * region_id — the player's geo-region at contribution time.
     * FK → region(region_id). Derived from player.region_id by RegionService (C1b).
     * Part of the signal key: (region_id, substance, district_profile).
     */
    region_id: varchar('region_id', { length: 16 })
      .notNull()
      .references(() => region.region_id, { onDelete: 'cascade' }),

    /**
     * substance — drug substance type (REUSE substanceType from operational_chain.ts:36).
     * The substance sold in the deal that produced this contribution.
     * Part of the signal key and the rate-limit bucket.
     */
    substance: substanceType('substance').notNull(),

    /**
     * district_profile — in-game district profile of the deal (REUSE districtProfile from world_geography.ts:12).
     * Derived from the district where the deal was executed (districts.profile).
     * Part of the signal key and the rate-limit bucket.
     */
    district_profile: districtProfile('district_profile').notNull(),

    /**
     * price_cents — the realized sell price of the deal in cents (bigint, 8B).
     * Per-deal realized price (decision #e: per-deal, not hourly average).
     * This is the raw input to the aggregation (trim + median). Visible only to the aggregation job.
     * Canon: async_meta_market.md contribution rules — "Only price + substance + district_profile + region propagate."
     */
    price_cents: bigint('price_cents', { mode: 'bigint' }).notNull(),

    /**
     * contributed_at — wallclock timestamp when this contribution was recorded (timestamptz).
     * Default now(). Used by the retention purge (NIGHTLY C5: delete old contributions after aggregation).
     * Canon: async_meta_market.md :69-76 (contribution rules — the contribution is a point in time).
     */
    contributed_at: timestamp('contributed_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * bucket_hour — the hourly aggregation bucket this contribution belongs to (timestamptz).
     * Computed by MetaMarketContributionService: date_trunc('hour', now()).
     * Rate-limit deduplication key: one contribution per (contributor_hash × substance × district_profile × bucket_hour).
     * Also used by the aggregation job to identify which bucket's contributions to aggregate (C5).
     * Canon: async_meta_market.md :71 "One point per substance × district per hour regardless of deal count
     *   (per-player contribution rate limit)."
     */
    bucket_hour: timestamp('bucket_hour', { withTimezone: true }).notNull(),
  },
  (t) => ({
    /**
     * INDEX (region_id, substance, district_profile, bucket_hour) — aggregation lookup.
     * Used by MetaMarketAggregationService (C5) to fetch all pending contributions per signal key
     * for a given hour bucket. This is the hot path of the HOURLY aggregation job.
     */
    aggregation_idx: index('meta_market_contributions_aggregation_idx').on(
      t.region_id,
      t.substance,
      t.district_profile,
      t.bucket_hour,
    ),

    /**
     * INDEX (contributor_hash, substance, district_profile, bucket_hour) — rate-limit dedup.
     * Used by MetaMarketContributionService (C4) to check/enforce the rate-limit:
     * one contribution per (contributor × substance × district × hour).
     * Also the target of the UPSERT ON CONFLICT in the service layer (C4 implementation).
     */
    rate_limit_idx: index('meta_market_contributions_rate_limit_idx').on(
      t.contributor_hash,
      t.substance,
      t.district_profile,
      t.bucket_hour,
    ),
  }),
);

export type MetaMarketContributionRow    = typeof metaMarketContributions.$inferSelect;
export type MetaMarketContributionInsert = typeof metaMarketContributions.$inferInsert;

// ===== Table 3: meta_market_cohort_flags — anti-cheat detection results =====
//
// Written by MetaMarketAntiCheatService (C6 daily detection job).
// Read by the BO ops endpoint (C8 GET /v1/admin/meta-market/anti-cheat-cluster-flags).
// Feeds gdd/13 anti-exploit system (the consumer integration is a TD per decision #3).
//
// No player FK: cohort detection operates at the region+substance level, not per-player.
// district_profile: nullable — detection may identify a region+substance cohort without isolating
//   a specific district_profile (the anti-cheat aggregates across all district_profiles in a region).
//   When set, it indicates the detection was scoped to a specific district_profile.
//
// flagged_pattern: varchar(64) — textual label for the detected pattern type.
//   Examples: 'volume_spike', 'new_account_cluster', 'price_anchoring'.
//   Extendable without migration (the set of pattern labels is a service concern, not a schema concern).
//
// cohort_size: integer — estimated number of coordinated accounts detected.
//   Set by detectCoordinatedCohort (C6) from the contribution-volume analysis.
//   The detection threshold (100 accounts, canon :38) is sourced from tunables (C3), not hardcoded.
//
// detected_at: timestamptz NOT NULL DEFAULT now() — wallclock timestamp of detection.
//   Used for BO time-filtering and for GC / retention (if added later).
//
// Canon: plan §C6 "flags a region+substance with a contribution-volume spike / geographically-clustered
//   new accounts past coordinated_cohort_detection_threshold_accounts (100) → a meta_market_cohort_flags row".
// R9.3: mirrors migration 0104_meta_market_contributions_and_cohort_flags.sql byte-for-meaning.
export const metaMarketCohortFlags = pgTable(
  'meta_market_cohort_flags',
  {
    /**
     * flag_id — PK uuid, generated at insert time by MetaMarketAntiCheatService (C6).
     * Each detected cohort event creates one row. No dedup constraint (multiple detections OK).
     */
    flag_id: uuid('flag_id').primaryKey().defaultRandom(),

    /**
     * region_id — the region where the coordinated cohort was detected.
     * FK → region(region_id). NOT NULL (detection is always region-scoped).
     * Canon: plan C6 "flags a region+substance with a contribution-volume spike".
     */
    region_id: varchar('region_id', { length: 16 })
      .notNull()
      .references(() => region.region_id, { onDelete: 'cascade' }),

    /**
     * substance — the substance type targeted by the detected cohort.
     * REUSE substanceType from operational_chain.ts:36.
     * NOT NULL: detection is substance-scoped.
     * Canon: plan C6 "region, substance, flagged_pattern, cohort_size, detected_at".
     */
    substance: substanceType('substance').notNull(),

    /**
     * district_profile — optional district scope of the detected cohort.
     * REUSE districtProfile from world_geography.ts:12.
     * NULL: detection may be at region+substance level without a district_profile axis.
     *   When set, the detection was scoped to a specific district_profile combo.
     * Canon: plan §C2 "REUSE substanceType + districtProfile" — nullable because cohort detection
     *   may aggregate across all district_profiles.
     */
    district_profile: districtProfile('district_profile'),

    /**
     * flagged_pattern — textual label for the detected coordinated pattern.
     * varchar(64). Examples: 'volume_spike', 'new_account_cluster', 'price_anchoring'.
     * No enum: the set of pattern labels is extensible at the service layer without schema change.
     * Canon: plan §C6 "flagged_pattern — detector label".
     */
    flagged_pattern: varchar('flagged_pattern', { length: 64 }).notNull(),

    /**
     * cohort_size — estimated number of coordinated accounts in this detected cluster.
     * integer NOT NULL. Set by MetaMarketAntiCheatService (C6) from contribution-volume analysis.
     * Detection threshold (100 accounts) is sourced from tunables (C3), not hardcoded here.
     * Canon: plan §C6 "cohort_size int — estimated size of the coordinated cohort".
     */
    cohort_size: integer('cohort_size').notNull(),

    /**
     * detected_at — wallclock timestamp when the flag was created (timestamptz).
     * DEFAULT now(). Used for BO time-filtering.
     * Canon: plan §C2 "region, substance, flagged_pattern, cohort_size, detected_at".
     */
    detected_at: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /**
     * INDEX (region_id, substance, detected_at DESC) — BO ops lookup.
     * Used by: BO GET /v1/admin/meta-market/anti-cheat-cluster-flags (C8) to list flags per
     * region+substance in reverse chronological order.
     */
    region_substance_idx: index('meta_market_cohort_flags_region_substance_idx').on(
      t.region_id,
      t.substance,
      t.detected_at,
    ),
  }),
);

export type MetaMarketCohortFlagRow    = typeof metaMarketCohortFlags.$inferSelect;
export type MetaMarketCohortFlagInsert = typeof metaMarketCohortFlags.$inferInsert;

// ===== Relations =====
// meta_market_signals: region relation only (FK to region, no per-player FK).
// meta_market_contributions: region relation only (no player FK — only contributor_hash).
// meta_market_cohort_flags: region relation only.

export const metaMarketSignalsRelations = relations(metaMarketSignals, ({ one }) => ({
  region: one(region, {
    fields: [metaMarketSignals.region_id],
    references: [region.region_id],
  }),
}));

export const metaMarketContributionsRelations = relations(metaMarketContributions, ({ one }) => ({
  region: one(region, {
    fields: [metaMarketContributions.region_id],
    references: [region.region_id],
  }),
}));

export const metaMarketCohortFlagsRelations = relations(metaMarketCohortFlags, ({ one }) => ({
  region: one(region, {
    fields: [metaMarketCohortFlags.region_id],
    references: [region.region_id],
  }),
}));

// ===== TypeScript enum TS types (re-exported via their source files through schema/index.ts) =====
// SubstanceTypeEnumTs: exported from operational_chain.ts (do NOT re-export here — naming conflict).
// DistrictProfileEnumTs: exported from world_geography.ts (do NOT re-export here — naming conflict).
// These types are re-exported by schema/index.ts via those source files.
// In meta_market.ts consumer files (e.g. meta-market-test.controller.ts), import them directly
// from './world_geography' or './operational_chain' if needed.

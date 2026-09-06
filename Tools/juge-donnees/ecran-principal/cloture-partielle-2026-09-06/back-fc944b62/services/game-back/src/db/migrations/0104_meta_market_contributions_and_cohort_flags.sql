-- migration 0104: meta_market_contributions + meta_market_cohort_flags (04d-C C2 — tables 2 and 3 of 3)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §State + §Contribution rules
-- Plan: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C2
-- R9.3: backported to docs/tech/09_data_model/schema_meta_market.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults, no inline tunables.
-- Zero-regression: ADDITIVE only. No existing tables or columns modified.
--
-- PRIVACY WALL (decision #2, RATIFIÉ):
--   meta_market_contributions has NO player_id column. The raw player_id is HMAC-SHA256 hashed
--   BEFORE any write (MetaMarketHashService C4). Only contributor_hash (64-char hex string) is stored.
--   This is enforced STRUCTURALLY: no player_id column exists in this table.
--   Grep-zero proof: grep 'player_id' on this migration file → 0 hits (no IP column either).
--
-- REUSE: substance_type pgEnum (from mig 0017) + district_profile pgEnum (from mig 0015).
-- FK: region_id → region(region_id) CASCADE (defensive — region rows are static reference data).

--> statement-breakpoint

-- meta_market_contributions: pending contribution queue (pre-aggregation).
-- Written by MetaMarketContributionService (C4 — the ADDITIVE sell-path emit, decision #2).
-- Consumed by MetaMarketAggregationService (C5 HOURLY job) → cleared after aggregation.
--
-- contributor_hash varchar(64): HMAC-SHA256 hex output of player_id (64 chars, hex-encoded).
--   NEVER stores the raw player_id. Only the hash is persisted (privacy wall, decision #2, RATIFIÉ).
--   Named `contributor_hash` (not `player_id`) to make the anonymization invariant structurally visible.
--
-- bucket_hour: timestamptz — truncated to the hour boundary (rate-limit deduplication key).
--   Rate-limit: one contribution per (contributor_hash × substance × district_profile × bucket_hour).
--   Enforced at the service layer (C4) via UPSERT ON CONFLICT. No DB UNIQUE constraint (service handles it).
--
-- price_cents: bigint — the realized sell price in cents (per-deal realized price, decision #e).
-- contributed_at: timestamptz — wallclock timestamp at contribution time (defaultNow).
CREATE TABLE IF NOT EXISTS "meta_market_contributions" (
  "contribution_id"    uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "contributor_hash"   varchar(64)  NOT NULL,
  "region_id"          varchar(16)  NOT NULL
    REFERENCES "region"("region_id") ON DELETE CASCADE,
  "substance"          substance_type   NOT NULL,
  "district_profile"   district_profile NOT NULL,
  "price_cents"        bigint       NOT NULL,
  "contributed_at"     timestamptz  NOT NULL DEFAULT now(),
  "bucket_hour"        timestamptz  NOT NULL
);

--> statement-breakpoint

-- INDEX (region_id, substance, district_profile, bucket_hour): aggregation lookup.
-- Hot path: MetaMarketAggregationService (C5 HOURLY) reads all pending contributions per signal key
-- for a given hour bucket.
CREATE INDEX "meta_market_contributions_aggregation_idx"
  ON "meta_market_contributions" ("region_id", "substance", "district_profile", "bucket_hour");

--> statement-breakpoint

-- INDEX (contributor_hash, substance, district_profile, bucket_hour): rate-limit dedup.
-- Used by MetaMarketContributionService (C4) to check the rate-limit before insert:
-- one contribution per (contributor × substance × district × hour).
CREATE INDEX "meta_market_contributions_rate_limit_idx"
  ON "meta_market_contributions" ("contributor_hash", "substance", "district_profile", "bucket_hour");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "meta_market_contributions" TO app_rw;

--> statement-breakpoint

-- meta_market_cohort_flags: anti-cheat detection results (produced by MetaMarketAntiCheatService C6).
-- Written by the daily coordinated-cohort detection job.
-- Read by BO ops endpoint (C8 GET /v1/admin/meta-market/anti-cheat-cluster-flags).
-- Feeds gdd/13 anti-exploit system (the consumer integration is a TD per decision #3).
--
-- No player FK: detection operates at the region+substance level, not per-player.
-- district_profile: NULLABLE — detection may be at region+substance level without a district axis.
-- flagged_pattern varchar(64): textual label (e.g. 'volume_spike', 'new_account_cluster').
-- cohort_size: estimated number of coordinated accounts detected.
-- detected_at: wallclock timestamp of detection (defaultNow).
CREATE TABLE IF NOT EXISTS "meta_market_cohort_flags" (
  "flag_id"            uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "region_id"          varchar(16)  NOT NULL
    REFERENCES "region"("region_id") ON DELETE CASCADE,
  "substance"          substance_type   NOT NULL,
  "district_profile"   district_profile,
  "flagged_pattern"    varchar(64)  NOT NULL,
  "cohort_size"        integer      NOT NULL,
  "detected_at"        timestamptz  NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (region_id, substance, detected_at DESC): BO ops lookup.
-- Used by BO endpoint (C8) to list flags per region+substance in reverse chronological order.
CREATE INDEX "meta_market_cohort_flags_region_substance_idx"
  ON "meta_market_cohort_flags" ("region_id", "substance", "detected_at" DESC);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "meta_market_cohort_flags" TO app_rw;

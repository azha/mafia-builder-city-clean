-- migration 0103: meta_market_signals table (04d-C C2 — Async Meta-Market schema, table 1 of 3)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §State (:50-65)
-- Plan: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C2
-- R9.3: backported to docs/tech/09_data_model/schema_meta_market.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults, no inline tunables.
-- Zero-regression: ADDITIVE only. No existing tables or columns modified.
-- GLOBAL table: meta_market_signals has NO player FK (server-side aggregate — no per-player rows).
-- Privacy: this table does NOT store player_id (only aggregated stats — sample_count, median, p10, p90).
--          Individual contributor identity is never persisted here. Only the HMAC hash is in contributions.
-- FK: region_id → region(region_id) CASCADE (region rows are static; CASCADE is defensive only).
-- REUSE: substance_type pgEnum (from mig 0017 / operational_chain.ts:36) and
--        district_profile pgEnum (from mig 0015 / world_geography.ts:12) — NOT re-declared here.
-- Cardinality: ~10 regions × 4 substances × 6 district profiles × 24 hr/day × 30d ≈ 170k rows total.

--> statement-breakpoint

-- meta_market_signals: aggregated signal per (region_id × substance × district_profile × hour bucket).
-- PK: composite (region_id, substance, district_profile, aggregated_at) — canon :60.
-- sample_count: number of distinct HMAC-hashed contributors in the bucket (NOT a raw player count).
-- median/p10/p90_price_cents: bigint (8B — price in cents, canonical type per canon :56-58).
-- aggregated_at: timestamptz (bucket boundary, truncated to the hour by MetaMarketAggregationService C5).
CREATE TABLE IF NOT EXISTS "meta_market_signals" (
  "region_id"            varchar(16)  NOT NULL
    REFERENCES "region"("region_id") ON DELETE CASCADE,
  "substance"            substance_type NOT NULL,
  "district_profile"     district_profile NOT NULL,
  "aggregated_at"        timestamptz  NOT NULL,
  "sample_count"         integer      NOT NULL,
  "median_price_cents"   bigint       NOT NULL,
  "p10_price_cents"      bigint       NOT NULL,
  "p90_price_cents"      bigint       NOT NULL,
  PRIMARY KEY ("region_id", "substance", "district_profile", "aggregated_at")
);

--> statement-breakpoint

-- INDEX (region_id, substance, district_profile, aggregated_at DESC) — canonical lookup pattern.
-- Canon: async_meta_market.md :63-64 "create index idx_meta_market_lookup on meta_market_signals
--   (region_id, substance, district_profile, aggregated_at desc)".
-- Used by MetaMarketReadService (C6) to fetch recent buckets per signal key (last 168h = 1 week).
-- Mirrors idx_meta_market_lookup from the canon SQL (renamed with project prefix for clarity).
CREATE INDEX "meta_market_signals_lookup_idx"
  ON "meta_market_signals" ("region_id", "substance", "district_profile", "aggregated_at" DESC);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "meta_market_signals" TO app_rw;

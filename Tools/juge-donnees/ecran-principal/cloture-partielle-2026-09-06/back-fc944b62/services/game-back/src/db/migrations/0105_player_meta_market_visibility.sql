-- migration 0105: player.meta_market_visibility_enabled (04d-C C8 — per-player visibility toggle)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 visibility toggle
-- Plan: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C8
-- R9.3: backported to docs/tech/09_data_model/schema_player.md + schema_meta_market.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults, no inline tunables.
-- Zero-regression: ADDITIVE only. One nullable BOOLEAN column added to player.
--
-- VISIBILITY TOGGLE SEMANTICS:
--   NULL  = use tunable default (meta_market.default_visibility, default 'on' → effective ON).
--   TRUE  = player explicitly opted in.
--   FALSE = player explicitly opted out.
--   The MetaMarketReadService.getSignalWithVisibility method (C8) checks this column:
--     if FALSE → skip the signal lookup and return 'insufficient_signal' (privacy wall).
--     if NULL or TRUE → proceed with normal getSignal().
--
-- P5 / R2.2: the BO endpoint returns the raw signal with sample_count regardless of this flag.
--   The toggle is a player preference gate only — it is NOT the anti-abuse sample_floor wall.
--
-- This is a nullable column — no backfill default needed. NULL = use tunable default.
-- The SQL DEFAULT is NULL (nullable column, no DEFAULT clause = PostgreSQL default of NULL).

ALTER TABLE player
  ADD COLUMN IF NOT EXISTS meta_market_visibility_enabled boolean;

-- Index: supports MetaMarketReadService future fan-out queries filtering by visibility.
-- Cost: single nullable boolean — B-tree is fine (low-cardinality index; still worth it for BO analytics).
CREATE INDEX IF NOT EXISTS player_mm_visibility_idx
  ON player (meta_market_visibility_enabled)
  WHERE meta_market_visibility_enabled IS NOT NULL;

COMMENT ON COLUMN player.meta_market_visibility_enabled IS
  'Per-player meta-market signal visibility toggle (NULL = use tunable default, TRUE = opted in, FALSE = opted out). Added 04d-C C8 mig 0105.';

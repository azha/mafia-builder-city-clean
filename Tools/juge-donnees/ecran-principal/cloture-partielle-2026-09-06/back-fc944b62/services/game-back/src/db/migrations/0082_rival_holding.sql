-- IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 5 (C5)
--             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.4
--             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :194-233 (Distributed Hold)
--             -- Rival AI Foundation C5 — 2026-06-24 —
--
-- `rival_holding` — per-player × per-rival × per-block holding set (Distributed Hold, §3.4 — Coil-primary).
--
-- PK composite: (player_id, rival_key, block_id) — one row per held block per rival per player.
-- FK: player_id → player(player_id) ON DELETE CASCADE (cleans up when player is deleted).
--
-- SOFT-REF discipline (corridor_debt.block_id precedent, migration 0076):
--   block_id  — integer bare column, NO FOREIGN KEY to blocks(id).
--   district_id — integer bare column, NO FOREIGN KEY to districts(id).
--   Reason: per-player rivalry table MUST NOT FK to the global static geography tables
--   (the same rule corridor_debt follows — additive, no implicit cascade coupling).
--   The DistributedHoldService reads blocks/districts for the route-graph without needing a DB FK.
--
-- OQ-A10: NO route_graph TABLE. The route graph is derived IN-SERVICE over rival_holding rows
--   + the live RouteFinderService.neighbors (9b block-graph). Only the holding node set is persisted.
--
-- Additivity (§1.3): this migration creates ONE NEW TABLE and GRANTS — no existing table modified.
-- R9.3: docs/tech/09_data_model/schema_conflict_rival.md backported same-commit.

CREATE TABLE IF NOT EXISTS "rival_holding" (
  "player_id"   uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"   rival_key     NOT NULL,
  "block_id"    integer       NOT NULL,
  "district_id" integer       NOT NULL,
  PRIMARY KEY ("player_id", "rival_key", "block_id")
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_holding" TO app_rw;

-- 0015_world_geography_and_clock.sql — Phase 1 / Task 0 (schema-first foundation).
-- IMPLEMENTS: docs/tech/09_data_model/schema_world_geography.md §2/§3 (GLOBAL static map:
--             districts/blocks/threnny_edges — NO player_id) + schema_city_sim_clock.md §2/§3
--             (per-save in-game clock — PK player_id seul). PALIMPSEST §3.2 (forward-only).
-- DDL ONLY here — the geography bulk seed is the separate next migration (0016), keeping
-- schema creation and data load conceptually separable (schema_world_geography.md §4).

-- ===== Enums PG natifs (CREATE TYPE) =====
CREATE TYPE "district_profile"  AS ENUM ('tidewater', 'spine', 'lattice', 'stack', 'glass', 'verge');
--> statement-breakpoint
CREATE TYPE "bank_side"         AS ENUM ('north', 'south');
--> statement-breakpoint
CREATE TYPE "threnny_edge_type" AS ENUM ('bridge', 'ferry');
--> statement-breakpoint

-- ===== Table 1 : districts — 18 rows GLOBAUX statiques (pas de player_id) =====
CREATE TABLE "districts" (
  "id"             integer          PRIMARY KEY,
  "district_key"   varchar(32)      NOT NULL,
  "profile"        district_profile NOT NULL,
  "index_label"    varchar(4)       NOT NULL,
  "name_canonical" varchar(48)      NOT NULL,
  "bank_side"      bank_side        NOT NULL,
  "block_count"    integer          NOT NULL,
  CONSTRAINT "districts_district_key_unique" UNIQUE ("district_key"),
  CONSTRAINT "districts_block_count_chk"     CHECK ("block_count" BETWEEN 30 AND 80)
);
--> statement-breakpoint
CREATE INDEX "districts_district_key_idx" ON "districts" ("district_key");
--> statement-breakpoint
CREATE INDEX "districts_bank_side_idx"    ON "districts" ("bank_side");
--> statement-breakpoint

-- ===== Table 2 : blocks — ~N rows GLOBAUX statiques (FK globale réelle vers districts) =====
CREATE TABLE "blocks" (
  "id"          integer PRIMARY KEY,
  "district_id" integer NOT NULL REFERENCES "districts"("id") ON DELETE RESTRICT,
  "coordinates" jsonb   NOT NULL
);
--> statement-breakpoint
CREATE INDEX "blocks_district_idx" ON "blocks" ("district_id");
--> statement-breakpoint

-- ===== Table 3 : threnny_edges — M rows GLOBAUX (FK globale réelle ×2 + soft-ref inspection queue) =====
-- inspection_queue_district_id = soft-ref integer (district riverain) — JAMAIS FK vers
-- inspection_queues (PK composite (player_id, district_id) = per-player). Cf schema §5 D5.
CREATE TABLE "threnny_edges" (
  "id"                           integer           PRIMARY KEY,
  "edge_type"                    threnny_edge_type NOT NULL,
  "north_district_id"            integer           NOT NULL REFERENCES "districts"("id") ON DELETE RESTRICT,
  "south_district_id"            integer           NOT NULL REFERENCES "districts"("id") ON DELETE RESTRICT,
  "inspection_queue_district_id" integer           NOT NULL
);
--> statement-breakpoint
CREATE INDEX "threnny_edges_north_idx" ON "threnny_edges" ("north_district_id");
--> statement-breakpoint
CREATE INDEX "threnny_edges_south_idx" ON "threnny_edges" ("south_district_id");
--> statement-breakpoint

-- ===== Table 4 : city_sim_clock — 1 row PAR SAVE (PK = player_id seul, per-player) =====
CREATE TABLE "city_sim_clock" (
  "player_id"         uuid        PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "game_minute"       bigint      NOT NULL DEFAULT 0,
  "last_real_tick_at" timestamptz,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "csc_game_minute_chk" CHECK ("game_minute" >= 0)
);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- 0013's ALTER DEFAULT PRIVILEGES auto-grants only SELECT+INSERT on future tables (mutable tables
-- must add UPDATE/DELETE in their OWN migration — see 0013 comment). city_sim_clock is mutated by
-- the T1 slow-tick scheduler every tick (UPDATE game_minute / last_real_tick_at — schema_city_sim_clock.md §4),
-- so it needs an explicit UPDATE grant or the first scheduler tick gets `permission denied`.
GRANT UPDATE ON "city_sim_clock" TO app_rw;
--> statement-breakpoint
-- The geography tables (districts / blocks / threnny_edges) are INTENTIONALLY left SELECT/INSERT-only
-- (the 0013 default) — they are immutable reference data, seed-once via migration 0016, never mutated
-- at runtime (schema_world_geography.md §1 "Statique"). Do NOT grant UPDATE/DELETE on them.

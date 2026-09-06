-- 0018_raid_schema_foundation.sql — schema_operational_chain.md §7 (raid/repair surface). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2b / Task 0 — police-risk consequence vector #1 (building raid). R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             2 columns on building_operational_state, 2 enums, 1 new table (building_raid). The 9 Phase-2 T0
--             tables + every Phase-1 table are otherwise UNCHANGED (git diff = empty except the 2 additions).
-- FK player_id → player (0001). FK building_id → buildings (0005). district_id/target_block_id = soft-ref (no FK).

-- ===== Enums PG natifs AJOUTÉS (CREATE TYPE — domaines fermés, §7.4) =====
-- building_structural_state : DISTINCT de buildings.structural_state city-state (operational|damaged|seized|demolished,
-- 0005). 3 membres = scope recoverable-only de la tranche (design §5) — DISTINCT de conversion_stage (setup).
CREATE TYPE "building_structural_state" AS ENUM ('operational', 'damaged', 'repairing');
--> statement-breakpoint
CREATE TYPE "building_raid_status"      AS ENUM ('executed', 'repairing', 'repaired');
--> statement-breakpoint

-- ===== building_operational_state (existant, Table 1) — 2 colonnes AJOUTÉES (§7.2) =====
-- structural_state : défaut 'operational' NOT NULL → rétro-compatible (les bâtiments déjà landés deviennent sains).
-- repair_completes_at_tick : armé pendant 'repairing' uniquement (current_tick + operational.repair.duration_ticks).
ALTER TABLE "building_operational_state"
  ADD COLUMN "structural_state"         building_structural_state NOT NULL DEFAULT 'operational',
  ADD COLUMN "repair_completes_at_tick" bigint;
--> statement-breakpoint

-- ===== Table 10 : building_raid (NEW table — journal des raids exécutés, §7.3) =====
-- 1 row par bâtiment raidé. Source : system_4_patrol_doctrine.md §RaidPlan + shape RaidPlannedEvent.
CREATE TABLE "building_raid" (
  "raid_id"          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"        uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"      uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "district_id"      integer NOT NULL,
  "target_block_id"  integer NOT NULL,
  "raided_at_tick"   bigint  NOT NULL,
  "grams_seized"     integer NOT NULL DEFAULT 0,
  "status"           building_raid_status NOT NULL DEFAULT 'executed'
);
--> statement-breakpoint
CREATE INDEX "building_raid_player_idx"          ON "building_raid" ("player_id");
--> statement-breakpoint
CREATE INDEX "building_raid_player_building_idx" ON "building_raid" ("player_id", "building_id");
--> statement-breakpoint
ALTER TABLE "building_raid" ADD CONSTRAINT "br_grams_seized_chk" CHECK (grams_seized >= 0);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- (a) building_operational_state already has GRANT UPDATE, DELETE TO app_rw (0017 §5). A table-level GRANT UPDATE
--     (no column list) covers columns ADDED later in PostgreSQL — so the 2 new columns (structural_state,
--     repair_completes_at_tick) are mutable by app_rw with NO re-grant (the OPERATIONAL_REPAIR tick + repair action
--     UPDATE them). (schema_operational_chain.md §7.6)
-- (b) building_raid is a NEW table created by `mafia`: 0013's ALTER DEFAULT PRIVILEGES auto-grants SELECT+INSERT.
--     It is MUTABLE (status executed→repairing→repaired) and NOT append-only → add an explicit UPDATE grant, else the
--     repair action / OPERATIONAL_REPAIR tick gets `permission denied`. (calque 0015 city_sim_clock / 0017.)
GRANT UPDATE ON "building_raid" TO app_rw;

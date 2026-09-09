-- 0005_city_state.sql — schema_city_state.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints + enums natifs. Pas de table parent `city` (§1).

-- ===== Enums PG natifs (CREATE TYPE) =====
CREATE TYPE "building_ownership" AS ENUM ('player', 'leased', 'rival', 'civilian');
--> statement-breakpoint
CREATE TYPE "structural_state"   AS ENUM ('operational', 'damaged', 'seized', 'demolished');
--> statement-breakpoint
CREATE TYPE "rival_roster"       AS ENUM ('coil', 'tarcum', 'iron_throat', 'saltline');
--> statement-breakpoint

-- ===== Table 1 : district_cohesion =====
CREATE TABLE "district_cohesion" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "district_id"                 integer NOT NULL,
  "cohesion"                    real    NOT NULL DEFAULT 0.7,
  "thaw_threshold_current"      real    NOT NULL DEFAULT 0.55,
  "thaw_threshold_baseline"     real    NOT NULL DEFAULT 0.55,
  "last_thaw_event_at"          timestamptz,
  "active_informant_count"      integer NOT NULL DEFAULT 0,
  "permanent_marginal_flag"     boolean NOT NULL DEFAULT false,
  "legitimate_services_invest"  integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "district_id")
);
--> statement-breakpoint
CREATE INDEX "district_cohesion_player_thaw_recent_idx" ON "district_cohesion" ("player_id", "last_thaw_event_at");
--> statement-breakpoint
ALTER TABLE "district_cohesion" ADD CONSTRAINT "dc_cohesion_chk"            CHECK (cohesion BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "district_cohesion" ADD CONSTRAINT "dc_thaw_current_chk"        CHECK (thaw_threshold_current BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "district_cohesion" ADD CONSTRAINT "dc_thaw_baseline_chk"       CHECK (thaw_threshold_baseline BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "district_cohesion" ADD CONSTRAINT "dc_informant_count_chk"     CHECK (active_informant_count >= 0);
--> statement-breakpoint
ALTER TABLE "district_cohesion" ADD CONSTRAINT "dc_legit_invest_chk"        CHECK (legitimate_services_invest >= 0);
--> statement-breakpoint

-- ===== Table 2 : precinct_memory =====
CREATE TABLE "precinct_memory" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "precinct_id"                 integer NOT NULL,
  "suspicion_map"               bytea   NOT NULL,
  "top_5_buildings"             jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "hunch_decay_per_type"        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  "raid_temperature"            real    NOT NULL DEFAULT 0.7,
  "last_raid_at"                timestamptz,
  "last_intel_purchased_at"     timestamptz,
  "corruption_clerk_id"         uuid,
  PRIMARY KEY ("player_id", "precinct_id")
);
--> statement-breakpoint
ALTER TABLE "precinct_memory" ADD CONSTRAINT "pm_suspicion_map_len_chk"     CHECK (octet_length(suspicion_map) = 1024);
--> statement-breakpoint
ALTER TABLE "precinct_memory" ADD CONSTRAINT "pm_raid_temperature_chk"      CHECK (raid_temperature BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
-- FK corruption_clerk_id REFERENCES lieutenant(lieutenant_id) ON DELETE SET NULL — DEFERRED post-merge Task 6 (0008_city_state_clerk_fk.sql)

-- ===== Table 3 : patrol_observation_queues =====
CREATE TABLE "patrol_observation_queues" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "precinct_id"                 integer NOT NULL,
  "entries"                     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "head"                        integer NOT NULL DEFAULT 0,
  "tail"                        integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "precinct_id")
);
--> statement-breakpoint
ALTER TABLE "patrol_observation_queues" ADD CONSTRAINT "poq_head_chk"       CHECK (head >= 0);
--> statement-breakpoint
ALTER TABLE "patrol_observation_queues" ADD CONSTRAINT "poq_tail_chk"       CHECK (tail >= 0);
--> statement-breakpoint

-- ===== Table 4 : inspection_queues =====
CREATE TABLE "inspection_queues" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "district_id"                 integer NOT NULL,
  "entries"                     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "length"                      integer NOT NULL DEFAULT 0,
  "processing_rate_per_day"     integer NOT NULL DEFAULT 4,
  "budget_modifier"             integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "district_id")
);
--> statement-breakpoint
ALTER TABLE "inspection_queues" ADD CONSTRAINT "iq_length_chk"              CHECK (length >= 0);
--> statement-breakpoint
ALTER TABLE "inspection_queues" ADD CONSTRAINT "iq_processing_rate_chk"     CHECK (processing_rate_per_day >= 0);
--> statement-breakpoint

-- ===== Table 5 : buildings =====
CREATE TABLE "buildings" (
  "building_id"                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "block_id"                    integer NOT NULL,
  "building_type"               integer NOT NULL,
  "ownership"                   building_ownership NOT NULL,
  "heat"                        real    NOT NULL DEFAULT 0,
  "last_heat_update_at"         timestamptz,
  "audit_pin_expires_at"        timestamptz,
  "transaction_profile"         jsonb,
  "structural_state"            structural_state NOT NULL
);
--> statement-breakpoint
CREATE INDEX "buildings_player_idx"               ON "buildings" ("player_id");
--> statement-breakpoint
CREATE INDEX "buildings_player_block_idx"         ON "buildings" ("player_id", "block_id");
--> statement-breakpoint
CREATE INDEX "buildings_player_owner_state_idx"   ON "buildings" ("player_id", "ownership", "structural_state");
--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "b_heat_chk" CHECK (heat BETWEEN 0.0 AND 1.0);
--> statement-breakpoint

-- ===== Table 6 : deal_leks =====
CREATE TABLE "deal_leks" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "tile_id"                     integer NOT NULL,
  "lek_score"                   integer NOT NULL DEFAULT 0,
  "controller_org_id"           integer NOT NULL,
  "deals_this_week"             integer NOT NULL DEFAULT 0,
  "contest_pressure"            integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "tile_id")
);
--> statement-breakpoint
CREATE INDEX "deal_leks_player_controller_idx" ON "deal_leks" ("player_id", "controller_org_id");
--> statement-breakpoint
ALTER TABLE "deal_leks" ADD CONSTRAINT "dl_lek_score_chk"          CHECK (lek_score BETWEEN 0 AND 255);
--> statement-breakpoint
ALTER TABLE "deal_leks" ADD CONSTRAINT "dl_deals_week_chk"         CHECK (deals_this_week >= 0);
--> statement-breakpoint
ALTER TABLE "deal_leks" ADD CONSTRAINT "dl_contest_pressure_chk"   CHECK (contest_pressure >= 0);
--> statement-breakpoint
ALTER TABLE "deal_leks" ADD CONSTRAINT "dl_controller_org_id_chk"  CHECK (controller_org_id BETWEEN 0 AND 4);
--> statement-breakpoint

-- ===== Table 7 : rival_state (placeholder hors GDD L187-258) =====
CREATE TABLE "rival_state" (
  "player_id"                   uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_id"                    rival_roster NOT NULL,
  "posture_raw_pressure_float"  real    NOT NULL DEFAULT 0.5,
  PRIMARY KEY ("player_id", "rival_id")
);
--> statement-breakpoint
ALTER TABLE "rival_state" ADD CONSTRAINT "rs_posture_chk" CHECK (posture_raw_pressure_float BETWEEN 0.0 AND 1.0);

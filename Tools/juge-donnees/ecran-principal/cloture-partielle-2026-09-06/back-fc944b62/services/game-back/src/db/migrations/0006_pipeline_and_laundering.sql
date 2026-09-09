-- 0006_pipeline_and_laundering.sql — schema_pipeline_and_laundering.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints. FK building_id → buildings (créée 0005). FK player_id CASCADE.

-- ===== Enum PG natif (CREATE TYPE) =====
CREATE TYPE "raid_drain_policy" AS ENUM ('top_down', 'random', 'bottom_up');
--> statement-breakpoint

-- ===== Table 1 : laundering_nodes =====
CREATE TABLE "laundering_nodes" (
  "node_id"                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                 uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"               uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "stage_index"               integer NOT NULL,
  "throughput_in_per_hour"    real    NOT NULL DEFAULT 0,
  "dwell_time_hours"          real    NOT NULL DEFAULT 0,
  "buffer_load"               real    NOT NULL DEFAULT 0,
  "cleanliness_at_output"     real    NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "laundering_nodes_player_idx"           ON "laundering_nodes" ("player_id");
--> statement-breakpoint
CREATE INDEX "laundering_nodes_player_stage_idx"     ON "laundering_nodes" ("player_id", "stage_index");
--> statement-breakpoint
CREATE INDEX "laundering_nodes_player_building_idx"  ON "laundering_nodes" ("player_id", "building_id");
--> statement-breakpoint
ALTER TABLE "laundering_nodes" ADD CONSTRAINT "ln_stage_index_chk"             CHECK (stage_index BETWEEN 0 AND 4);
--> statement-breakpoint
ALTER TABLE "laundering_nodes" ADD CONSTRAINT "ln_throughput_chk"              CHECK (throughput_in_per_hour >= 0);
--> statement-breakpoint
ALTER TABLE "laundering_nodes" ADD CONSTRAINT "ln_dwell_time_chk"              CHECK (dwell_time_hours >= 0);
--> statement-breakpoint
ALTER TABLE "laundering_nodes" ADD CONSTRAINT "ln_buffer_load_chk"             CHECK (buffer_load BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "laundering_nodes" ADD CONSTRAINT "ln_cleanliness_chk"             CHECK (cleanliness_at_output BETWEEN 0.0 AND 1.0);
--> statement-breakpoint

-- ===== Table 2 : laundering_edges =====
CREATE TABLE "laundering_edges" (
  "edge_id"                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                 uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "from_node"                 uuid    NOT NULL REFERENCES "laundering_nodes"("node_id") ON DELETE CASCADE,
  "to_node"                   uuid    NOT NULL REFERENCES "laundering_nodes"("node_id") ON DELETE CASCADE,
  "routing_weight"            real    NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "laundering_edges_player_idx"           ON "laundering_edges" ("player_id");
--> statement-breakpoint
CREATE INDEX "laundering_edges_player_from_idx"      ON "laundering_edges" ("player_id", "from_node");
--> statement-breakpoint
CREATE INDEX "laundering_edges_player_to_idx"        ON "laundering_edges" ("player_id", "to_node");
--> statement-breakpoint
ALTER TABLE "laundering_edges" ADD CONSTRAINT "le_routing_weight_chk"          CHECK (routing_weight BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "laundering_edges" ADD CONSTRAINT "le_no_self_loop_chk"            CHECK (from_node <> to_node);
--> statement-breakpoint

-- ===== Table 3 : safehouses =====
CREATE TABLE "safehouses" (
  "safehouse_id"              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                 uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"               uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "slot_count"                integer NOT NULL,
  "slot_capacity_cents"       integer NOT NULL,
  "current_fill"              jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "arrival_rate"              real    NOT NULL DEFAULT 0,
  "raid_drain_policy"         raid_drain_policy NOT NULL
);
--> statement-breakpoint
CREATE INDEX "safehouses_player_idx"                 ON "safehouses" ("player_id");
--> statement-breakpoint
CREATE INDEX "safehouses_player_building_idx"        ON "safehouses" ("player_id", "building_id");
--> statement-breakpoint
ALTER TABLE "safehouses" ADD CONSTRAINT "sh_slot_count_chk"                    CHECK (slot_count > 0);
--> statement-breakpoint
ALTER TABLE "safehouses" ADD CONSTRAINT "sh_slot_capacity_chk"                 CHECK (slot_capacity_cents > 0);
--> statement-breakpoint
ALTER TABLE "safehouses" ADD CONSTRAINT "sh_arrival_rate_chk"                  CHECK (arrival_rate >= 0);
--> statement-breakpoint

-- ===== Table 4 : tail_risk_estimates =====
CREATE TABLE "tail_risk_estimates" (
  "node_id"                   uuid    PRIMARY KEY REFERENCES "laundering_nodes"("node_id") ON DELETE CASCADE,
  "player_id"                 uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "capacity"                  real    NOT NULL DEFAULT 0,
  "drain_rate"                real    NOT NULL DEFAULT 0,
  "current_occupancy"         real    NOT NULL DEFAULT 0,
  "tail_p95_estimate"         real    NOT NULL DEFAULT 0,
  "last_estimated_at"         timestamptz
);
--> statement-breakpoint
CREATE INDEX "tail_risk_estimates_player_idx"        ON "tail_risk_estimates" ("player_id");
--> statement-breakpoint
ALTER TABLE "tail_risk_estimates" ADD CONSTRAINT "tre_capacity_chk"            CHECK (capacity >= 0);
--> statement-breakpoint
ALTER TABLE "tail_risk_estimates" ADD CONSTRAINT "tre_drain_rate_chk"          CHECK (drain_rate >= 0);
--> statement-breakpoint
ALTER TABLE "tail_risk_estimates" ADD CONSTRAINT "tre_current_occupancy_chk"   CHECK (current_occupancy >= 0);
--> statement-breakpoint
ALTER TABLE "tail_risk_estimates" ADD CONSTRAINT "tre_tail_p95_chk"            CHECK (tail_p95_estimate BETWEEN 0.0 AND 1.0);

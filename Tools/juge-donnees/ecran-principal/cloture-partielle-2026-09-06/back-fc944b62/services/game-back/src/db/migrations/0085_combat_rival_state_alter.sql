-- Migration: 0085_combat_rival_state_alter
-- 04b-B C1 — OQ-B2 ALTER: add 5 B-owned combat columns to rival_state +
--             CREATE partition_state enum + CREATE combat_operation table
--
-- This migration is ADDITIVE: only adds new columns (nullable/defaulted) to rival_state.
-- No existing A columns are dropped or renamed (byte-identical for A rows).
-- DD-RIVALSTATE-ALTER: ALTER TABLE adds the 5 B-owned columns; A rows get NULL defaults (silent).
--
-- rival_state ALTER: adds 5 B-owned columns (OQ-B2):
--   active_link_fraction           real nullable — operational network link fraction (HIDDEN)
--   operational_graph_node_count   smallint nullable — live operational node count (HIDDEN)
--   partition_state                partition_state nullable — network partition (HIDDEN)
--   cumulative_pressure_index      real nullable — CPI accumulator (HIDDEN)
--   resource_pressure              real nullable — resource depletion pressure (HIDDEN)
--
-- combat_operation table:
--   operation_id                   uuid PK defaultRandom
--   player_id                      uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key                      rival_key NOT NULL
--   base_friction_load             real NOT NULL DEFAULT 0 (HIDDEN/BO-only P6)
--   shared_friction_pool           real NOT NULL DEFAULT 0 (HIDDEN P6)
--   ephemeral_mode                 boolean NOT NULL DEFAULT false
--   state_persistence_window_ticks smallint NOT NULL DEFAULT 4
--
-- P6: all rival_state combat columns are SERVER-ONLY.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_combat.md same-commit.
-- Soft-ref discipline: no FK to blocks/deal_leks/rival_state from combat tables.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.

CREATE TYPE "partition_state" AS ENUM ('integrated', 'fragmented');

--> statement-breakpoint

ALTER TABLE "rival_state"
  ADD COLUMN "active_link_fraction"         real,
  ADD COLUMN "operational_graph_node_count" smallint,
  ADD COLUMN "partition_state"              partition_state,
  ADD COLUMN "cumulative_pressure_index"    real,
  ADD COLUMN "resource_pressure"            real;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "combat_operation" (
  "operation_id"                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  "player_id"                    uuid        NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"                    rival_key   NOT NULL,
  "base_friction_load"           real        NOT NULL DEFAULT 0,
  "shared_friction_pool"         real        NOT NULL DEFAULT 0,
  "ephemeral_mode"               boolean     NOT NULL DEFAULT false,
  "state_persistence_window_ticks" smallint  NOT NULL DEFAULT 4,
  PRIMARY KEY ("operation_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "combat_operation" TO app_rw;

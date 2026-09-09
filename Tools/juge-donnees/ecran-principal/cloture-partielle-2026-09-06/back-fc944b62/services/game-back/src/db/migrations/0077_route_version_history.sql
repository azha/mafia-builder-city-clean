-- Migration: 0077_route_version_history
-- Table: route_version_history (NEW) — DD-REPLAN §4.4 (System 9b C9)
--
-- Versioned archive of prior path_blocks when a route is replanned (OQ-RP1).
-- Each replan bumps route.version and archives the OLD path_blocks here.
-- The route keeps its route_id (identity stable — D4 "KEEPING the route's identity").
-- history_id: uuid PK (defaultRandom — one row per prior version per route).
-- route_id: FK route CASCADE (deleting a route deletes its version history).
-- severed_at_tick: nullable — the game-minute when this version's route was severed.
-- replanned_at_tick: the game-minute when the replan fired (creating this history row).
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit.
-- DD-REPLAN (D4): same route_id survives replans; this table is the history journal.
-- OQ-EP3: the ephemeral purge (C10) will DELETE ephemeral route version history rows too.

CREATE TABLE IF NOT EXISTS "route_version_history" (
  "history_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "route_id" uuid NOT NULL REFERENCES "route"("route_id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "path_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "severed_at_tick" bigint,
  "replanned_at_tick" bigint NOT NULL,
  CONSTRAINT "route_version_history_pkey" PRIMARY KEY ("history_id")
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "route_version_history_route_version_idx" ON "route_version_history" ("route_id", "version");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "route_version_history" TO app_rw;

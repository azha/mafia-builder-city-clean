-- Migration: 0087_escalation_state
-- 04b-B C1 — NEW: escalation_global_state + escalation_pair_state + oscillation_lek_state
--
-- escalation_global_state: single global row (Sandpile §4.1)
--   id                   integer PK DEFAULT 1 (single-row sentinel)
--   system_criticality   real NOT NULL DEFAULT 0 (HIDDEN server-only P6)
--   cascade_threshold    real NOT NULL DEFAULT 0
--
-- escalation_pair_state: per (player_id, rival_key) (Maladaptive/Resonant §4.2/4.3)
--   player_id            uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key            rival_key NOT NULL
--   conflict_memory_depth integer NOT NULL DEFAULT 0
--   resonance_factor     real NOT NULL DEFAULT 0
--   player_response_history jsonb NOT NULL DEFAULT '[]'
--   PK composite: (player_id, rival_key)
--
-- oscillation_lek_state: per (player_id, tile_id) contested lek only (OQ-B6; §4.4)
--   player_id            uuid NOT NULL FK player ON DELETE CASCADE
--   tile_id              integer NOT NULL — SOFT-REF (no FK to deal_leks; the 9b discipline)
--   rival_key            rival_key NOT NULL
--   extraction_rate      real NOT NULL DEFAULT 0
--   yield_state          real NOT NULL DEFAULT 0
--   oscillation_locked   boolean NOT NULL DEFAULT false
--   PK composite: (player_id, tile_id)
--
-- P6: system_criticality is SERVER-ONLY.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_escalation.md same-commit.
-- Soft-refs: oscillation_lek_state.tile_id is a SOFT-REF (no FK to deal_leks).
-- Anti-fabrication: no Math.random().
-- Zero-regression: ADDITIVE only.

CREATE TABLE IF NOT EXISTS "escalation_global_state" (
  "id"                  integer NOT NULL DEFAULT 1,
  "system_criticality"  real    NOT NULL DEFAULT 0,
  "cascade_threshold"   real    NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "escalation_pair_state" (
  "player_id"               uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"               rival_key NOT NULL,
  "conflict_memory_depth"   integer   NOT NULL DEFAULT 0,
  "resonance_factor"        real      NOT NULL DEFAULT 0,
  "player_response_history" jsonb     NOT NULL DEFAULT '[]',
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "oscillation_lek_state" (
  "player_id"        uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "tile_id"          integer   NOT NULL,
  "rival_key"        rival_key NOT NULL,
  "extraction_rate"  real      NOT NULL DEFAULT 0,
  "yield_state"      real      NOT NULL DEFAULT 0,
  "oscillation_locked" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("player_id", "tile_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "escalation_global_state" TO app_rw;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "escalation_pair_state" TO app_rw;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "oscillation_lek_state" TO app_rw;

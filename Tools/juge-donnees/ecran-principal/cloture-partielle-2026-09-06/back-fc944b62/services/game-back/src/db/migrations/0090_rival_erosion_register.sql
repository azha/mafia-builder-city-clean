-- Migration: 0090_rival_erosion_register
-- 04b-B C5 — NEW: rival_erosion_register (Erosion Register §2.4)
--
-- rival_erosion_register: per (player_id, rival_key, register_id) — one row per erosion register per rival per player.
--   player_id            uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key            rival_key NOT NULL
--   register_id          erosion_register_id NOT NULL (muscle|finance|intel|infrastructure|leadership)
--   current_value_bucket varchar NOT NULL DEFAULT 'standard'
--     Closed domain: crippled|weakened|standard|strong|dominant (RegisterValueBucket).
--     P6/R2.2 — the bucket IS the player-facing state (never a raw float).
--   PK composite: (player_id, rival_key, register_id)
--
-- Register semantics (combat_mechanics.md §2.4 :194-198):
--   5 functional registers per rival per player, each independently degradable.
--   Default 'standard' at seed (all registers at nominal capacity).
--   Degrade: dominant → strong → standard → weakened → crippled.
--   MUSCLE/INFRASTRUCTURE: REUSE the raid path (combat raid seam, DIV-B2).
--   vulnerable_axis degrade → A's recordPressure (regime shift trigger).
--   per-register attack → A's recordAttack (Adaptive Skin accrual pattern 'erosion:registerId').
--
-- P6/R2.2: current_value_bucket is the ONLY player-facing register state (the bucket derived from the server state).
--   dominance_rank + vulnerable_axis are stored on rival_state (OQ-A8) — NOT in this table.
-- Anti-fabrication: no Math.random().
-- Zero-regression: ADDITIVE only — no existing tables modified.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_rival.md §3h (follow-up fix commit).

CREATE TABLE IF NOT EXISTS "rival_erosion_register" (
  "player_id"             uuid                  NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"             rival_key             NOT NULL,
  "register_id"           erosion_register_id   NOT NULL,
  "current_value_bucket"  varchar(16)           NOT NULL DEFAULT 'standard',
  PRIMARY KEY ("player_id", "rival_key", "register_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_erosion_register" TO app_rw;

-- Migration: 0089_dead_hand_cache
-- 04b-B C1 — NEW: dead_hand_cache_state (Dead Hand Cache §6)
--
-- dead_hand_cache_state: per (player_id, rival_key)
--   player_id            uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key            rival_key NOT NULL
--   cache_script_ref     varchar NOT NULL DEFAULT '' (HIDDEN — server-side script ref P6)
--   dead_hand_reserve    real NOT NULL DEFAULT 0 (HIDDEN P6 — sequestered budget)
--   trigger_threshold    real NOT NULL DEFAULT 0 (HIDDEN P6 — per-rival canon-chiffré :34-38)
--   intelligence_revealed boolean NOT NULL DEFAULT false (the ONLY projected field :81)
--   PK composite: (player_id, rival_key)
--
-- P6: cache_script_ref / dead_hand_reserve / trigger_threshold are SERVER-ONLY.
--   intelligence_revealed is the ONLY P5-partial field exposed to the player.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_escalation.md same-commit.
-- Anti-fabrication: no Math.random().
-- Zero-regression: ADDITIVE only.

CREATE TABLE IF NOT EXISTS "dead_hand_cache_state" (
  "player_id"             uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"             rival_key NOT NULL,
  "cache_script_ref"      varchar   NOT NULL DEFAULT '',
  "dead_hand_reserve"     real      NOT NULL DEFAULT 0,
  "trigger_threshold"     real      NOT NULL DEFAULT 0,
  "intelligence_revealed" boolean   NOT NULL DEFAULT false,
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "dead_hand_cache_state" TO app_rw;

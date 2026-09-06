-- Migration: 0088_deescalation_flow_state
-- 04b-B C1 — NEW: deescalation_pair_state + conflict_flow_state + flow_regime enum
--
-- flow_regime enum: running | standing (canon de_escalation_mechanics.md :95)
--
-- deescalation_pair_state: per (player_id, rival_key) (Familiarity §5.1)
--   player_id          uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key          rival_key NOT NULL
--   familiarity_index  real NOT NULL DEFAULT 0 (HIDDEN server-only P6)
--   mutual_calibration boolean NOT NULL DEFAULT false
--   vacuum_volatility  real NOT NULL DEFAULT 0
--   PK composite: (player_id, rival_key)
--
-- conflict_flow_state: per active conflict pair (Downstream Gate §5.2)
--   player_id           uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key           rival_key NOT NULL
--   flow_regime         flow_regime NOT NULL DEFAULT 'running'
--   downstream_condition real NOT NULL DEFAULT 0 (visible-to-player band derived — P5 partial)
--   PK composite: (player_id, rival_key)
--
-- P6: familiarity_index is SERVER-ONLY. downstream_condition is server-side scalar;
--   its player-visible form is a bucket string derived by the projection service.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_escalation.md same-commit.
-- Anti-fabrication: no Math.random().
-- Zero-regression: ADDITIVE only.

CREATE TYPE "flow_regime" AS ENUM ('running', 'standing');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "deescalation_pair_state" (
  "player_id"         uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"         rival_key NOT NULL,
  "familiarity_index" real      NOT NULL DEFAULT 0,
  "mutual_calibration" boolean  NOT NULL DEFAULT false,
  "vacuum_volatility" real      NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "conflict_flow_state" (
  "player_id"            uuid        NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"            rival_key   NOT NULL,
  "flow_regime"          flow_regime NOT NULL DEFAULT 'running',
  "downstream_condition" real        NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "deescalation_pair_state" TO app_rw;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "conflict_flow_state" TO app_rw;

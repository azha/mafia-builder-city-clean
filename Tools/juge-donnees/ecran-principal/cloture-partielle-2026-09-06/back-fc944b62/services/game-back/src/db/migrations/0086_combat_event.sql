-- Migration: 0086_combat_event
-- 04b-B C1 — NEW: combat_event table + combat_event_type enum
--
-- combat_event_type enum: assault | hold | degrade_register (canon combat_mechanics.md :363)
-- combat_event table:
--   id                     uuid PK defaultRandom
--   player_id              uuid NOT NULL FK player ON DELETE CASCADE
--   type                   combat_event_type NOT NULL
--   target_rival_key       rival_key NOT NULL
--   target_block_id        integer nullable — SOFT-REF (no FK to blocks; the 9b soft-ref discipline)
--   target_register_id     erosion_register_id nullable — enum from 0081
--   lieutenant_id          uuid nullable — SOFT-REF (no FK; C3 Muscle wiring placeholder)
--   friction_consumed_bucket  varchar nullable — P6-safe bucket string
--   outcome_bucket         varchar nullable — P6-safe bucket string
--   heat_increment_bucket  varchar nullable — P6-safe bucket string
--
-- P6: base_friction_load / outcome / heat are server-only scalars derived off P6-safe buckets.
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_combat.md same-commit.
-- Anti-fabrication: no Math.random(). Soft-refs only.
-- Zero-regression: ADDITIVE only.

CREATE TYPE "combat_event_type" AS ENUM ('assault', 'hold', 'degrade_register');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "combat_event" (
  "id"                       uuid          NOT NULL DEFAULT gen_random_uuid(),
  "player_id"                uuid          NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "type"                     combat_event_type NOT NULL,
  "target_rival_key"         rival_key     NOT NULL,
  "target_block_id"          integer,
  "target_register_id"       erosion_register_id,
  "lieutenant_id"            uuid,
  "friction_consumed_bucket" varchar(64),
  "outcome_bucket"           varchar(64),
  "heat_increment_bucket"    varchar(64),
  PRIMARY KEY ("id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "combat_event" TO app_rw;

-- Migration: 0095_diplomacy_pacts
-- 04b-C C1 — NEW: 4 active-pact tables
--
-- Tables (4 NEW pact entities — §9.4):
--   shared_exposure_lock       — per-player × per-rival × per-district mutual deterrence
--   sealed_envelope_commitment — per active sealed commitment (DD-SEALED-HASH)
--   revelation_trap            — per active revelation trap offer
--   dispersal_suppression_pact — per active dispersal suppression pact
--
-- Soft-ref discipline: district_id in shared_exposure_lock is a plain integer (NO FK to districts).
--   Mirrors the corridor_debt.block_id precedent (migration 0076).
--   No FK from a per-player C table to global geography or the A/B tables.
-- P6: shared_bpd_attention is SERVER-ONLY (SharedAttentionBucket derived).
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_diplomacy.md same-commit.
-- Anti-fabrication: no Math.random(). ADDITIVE only.
-- Zero-regression: no existing tables modified.
-- GRANT: mirrors 0086/0087 pattern.

CREATE TABLE IF NOT EXISTS "shared_exposure_lock" (
  "player_id"            uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"            rival_key NOT NULL,
  "district_id"          integer   NOT NULL,
  "shared_bpd_attention" real      NOT NULL DEFAULT 0,
  "mutual_exposure_flag" boolean   NOT NULL DEFAULT false,
  "auto_truce_active"    boolean   NOT NULL DEFAULT false,
  PRIMARY KEY ("player_id", "rival_key", "district_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "shared_exposure_lock" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sealed_envelope_commitment" (
  "commitment_id"        uuid          NOT NULL DEFAULT gen_random_uuid(),
  "player_id"            uuid          NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"            rival_key     NOT NULL,
  "target_hash"          varchar(128)  NOT NULL,
  "reveal_deadline_tick" bigint        NOT NULL,
  PRIMARY KEY ("commitment_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "sealed_envelope_commitment" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "revelation_trap" (
  "trap_id"             uuid               NOT NULL DEFAULT gen_random_uuid(),
  "player_id"           uuid               NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"           rival_key          NOT NULL,
  "offer_menu"          jsonb              NOT NULL DEFAULT '[]',
  "rival_type_inferred" rival_intent_type,
  PRIMARY KEY ("trap_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "revelation_trap" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "dispersal_suppression_pact" (
  "pact_id"              uuid    NOT NULL DEFAULT gen_random_uuid(),
  "player_id"            uuid    NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"            rival_key NOT NULL,
  "suppressed_districts" jsonb   NOT NULL DEFAULT '[]',
  "joint_response_script" jsonb  NOT NULL DEFAULT '{}',
  "pact_duration_ticks"  integer NOT NULL DEFAULT 12,
  PRIMARY KEY ("pact_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "dispersal_suppression_pact" TO app_rw;

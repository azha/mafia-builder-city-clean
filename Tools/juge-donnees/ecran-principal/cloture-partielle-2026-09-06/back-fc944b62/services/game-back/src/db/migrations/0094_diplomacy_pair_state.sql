-- Migration: 0094_diplomacy_pair_state
-- 04b-C C1 — NEW: 6 enums + diplomacy_pair_state + credibility_state + public_ledger_entry
--
-- Enums (6 NEW):
--   gift_type               — resource_transfer | territory_concession | supply_route_opening
--   burn_type               — route_burn | asset_burn | intermediary_burn
--   leverage_type           — supply | personnel | financial
--   rival_intent_type       — honor_intent | defect_intent
--   interpretation_badge    — posture | preparation | ambiguous
--   public_ledger_entry_type — potlatch_gift | sealed_commitment | proof_broadcast
--
-- Tables (3 NEW core diplomacy entities):
--   diplomacy_pair_state  — per-player × per-rival diplomacy state (PK composite)
--   credibility_state     — DD-CREDIBILITY single accumulator (PK composite)
--   public_ledger_entry   — the ONE P5 exception public broadcast (PK uuid)
--
-- P6: trust_decay / skepticism_thresholds / credibility are SERVER-ONLY (never forwarded).
-- public_ledger_entry is the canon P5 exception (visible to rivals, diplomacy_mechanics.md:281).
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_diplomacy.md same-commit.
-- Soft-ref discipline: no FK from a per-player C table to global geography or the A/B tables.
-- Anti-fabrication: no Math.random(). ADDITIVE only.
-- Zero-regression: no existing tables modified.
-- GRANT: mirrors 0086/0087 pattern (table-level GRANT to app_rw).

CREATE TYPE "gift_type" AS ENUM ('resource_transfer', 'territory_concession', 'supply_route_opening');

--> statement-breakpoint

CREATE TYPE "burn_type" AS ENUM ('route_burn', 'asset_burn', 'intermediary_burn');

--> statement-breakpoint

CREATE TYPE "leverage_type" AS ENUM ('supply', 'personnel', 'financial');

--> statement-breakpoint

CREATE TYPE "rival_intent_type" AS ENUM ('honor_intent', 'defect_intent');

--> statement-breakpoint

CREATE TYPE "interpretation_badge" AS ENUM ('posture', 'preparation', 'ambiguous');

--> statement-breakpoint

CREATE TYPE "public_ledger_entry_type" AS ENUM ('potlatch_gift', 'sealed_commitment', 'proof_broadcast');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "diplomacy_pair_state" (
  "player_id"              uuid    NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"              rival_key NOT NULL,
  "commitment_ledger"      jsonb   NOT NULL DEFAULT '[]',
  "trust_decay"            real    NOT NULL DEFAULT 0,
  "display_vulnerabilities" jsonb  NOT NULL DEFAULT '[]',
  "leverage_tokens"        jsonb   NOT NULL DEFAULT '[]',
  "skepticism_thresholds"  jsonb   NOT NULL DEFAULT '{}',
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "diplomacy_pair_state" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "credibility_state" (
  "player_id"   uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"   rival_key NOT NULL,
  "credibility" real      NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "credibility_state" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "public_ledger_entry" (
  "entry_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "player_id"        uuid                     NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "entry_type"       public_ledger_entry_type NOT NULL,
  "target_rival_key" rival_key                NOT NULL,
  "gameMinute"       bigint                   NOT NULL,
  PRIMARY KEY ("entry_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "public_ledger_entry" TO app_rw;

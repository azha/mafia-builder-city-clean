-- Insurance C1: underwriter_walk_record — per-walk server-side underwriting state.
-- R9.3: Drizzle schema (insurance.ts) + ch09 mirror (schema_insurance.md) backported same-commit.
--
-- underwriter_walk_record: per-walk state accumulating findings_bitmask via daily OR (DD-WALK).
--   findings_bitmask: 64-bit mask — bigint (canon :42 "8 B — 64-bit mask of observed cues").
--   observation_depth: smallint 0-3 (how deeply underwriter inspects each leg — server-only).
--   route_id: nullable uuid (which supply-chain leg the walk follows — server-only).
--   start_tick: bigint (in-game tick at walk start; default 0 for seed rows).
--   status: walk_status (WALKING|COMPLETE, default WALKING).
--   coverage_type: which of the 4 coverage kinds (PROPERTY|STASH_LOSS|COURIER_ARREST|FENCE_DEFAULT).
--   contract_id: nullable uuid soft-ref to the contract (no DB FK — avoids circular dep).
--   PK: id (uuid, gen_random_uuid()).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (player-scoped, leçon D1c/D2).
--
-- R2.2: findings_bitmask, observation_depth, route_id = server-only. Client reads banded projection (C11).
-- Zero-regression (§0.2): does not modify any existing table or column.
-- Migration 0059 (Insurance lot Tranche B — base post-D2 last mig = 0058_forbidden_triad_pressure_real.sql).

CREATE TYPE "coverage_type" AS ENUM (
  'PROPERTY',
  'STASH_LOSS',
  'COURIER_ARREST',
  'FENCE_DEFAULT'
);

--> statement-breakpoint

CREATE TYPE "walk_status" AS ENUM (
  'WALKING',
  'COMPLETE'
);

--> statement-breakpoint

CREATE TABLE underwriter_walk_record (
  id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  contract_id         uuid,
  coverage_type       coverage_type NOT NULL,
  route_id            uuid,
  observation_depth   smallint    NOT NULL DEFAULT 0,
  findings_bitmask    bigint      NOT NULL DEFAULT 0,
  start_tick          bigint      NOT NULL DEFAULT 0,
  status              walk_status NOT NULL DEFAULT 'WALKING',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX underwriter_walk_record_player_idx
  ON underwriter_walk_record (player_id);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON underwriter_walk_record TO app_rw;

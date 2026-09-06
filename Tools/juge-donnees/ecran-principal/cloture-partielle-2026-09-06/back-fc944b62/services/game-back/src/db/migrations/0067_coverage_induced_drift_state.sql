-- Insurance Drift C1: coverage_induced_drift_state table
-- Tranche C §4.2 Coverage-Induced Drift — new player-scoped drift monitoring table.
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 1 (C1)
--             design §3.1 (the per-asset moral-hazard drift entity)
--             — Insurance Drift C1 — 2026-06-18
--
-- Migration: 0067_coverage_induced_drift_state
-- Table:     coverage_induced_drift_state (NEW — greenfield for Tranche C)
--
-- hazard_shift:               starts at 0, rises per less-cautious action (DD-LESS-CAUTIOUS, C9)
-- fingerprint_*:              4 smallint columns (DD-FINGERPRINT-COLS, canon :90) — NOT a packed blob
-- last_drift_tick:            WEEKLY idempotence guard keyed on weekId (C10)
-- player_id FK CASCADE:       player-scoped; player deletion removes all drift states
-- INDEX on player_id:         coverage_induced_drift_state_player_idx
-- INDEX on contract_id:       coverage_induced_drift_state_contract_idx (per-asset subscriber lookup)
--
-- R9.3: backported to docs/tech/09_data_model/schema_insurance.md same-commit.
-- Zero-regression: existing tables (insurance_contract / almanac_entry / etc.) NOT modified.

CREATE TABLE IF NOT EXISTS "coverage_induced_drift_state" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id"                   uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "contract_id"                 uuid,
  "asset_ref"                   uuid,
  "coverage_type"               "coverage_type" NOT NULL,
  "coverage_tier"               smallint NOT NULL DEFAULT 0,
  "premium_balance"             bigint NOT NULL DEFAULT 0,
  "hazard_shift"                smallint NOT NULL DEFAULT 0,
  "fingerprint_stash_ratio"     smallint NOT NULL DEFAULT 0,
  "fingerprint_courier_cadence" smallint NOT NULL DEFAULT 0,
  "fingerprint_marginal_deal"   smallint NOT NULL DEFAULT 0,
  "fingerprint_lookout"         smallint NOT NULL DEFAULT 0,
  "last_drift_tick"             bigint NOT NULL DEFAULT 0,
  "created_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "coverage_induced_drift_state_player_idx"
  ON "coverage_induced_drift_state" ("player_id");

CREATE INDEX IF NOT EXISTS "coverage_induced_drift_state_contract_idx"
  ON "coverage_induced_drift_state" ("contract_id");

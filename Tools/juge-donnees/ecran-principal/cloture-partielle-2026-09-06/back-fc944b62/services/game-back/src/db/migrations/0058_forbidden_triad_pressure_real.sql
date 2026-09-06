-- D2 R8b (fixup): forbidden_triad_pair_state — promote anomaly_pressure_bucket from smallint → real.
-- R9.3: Drizzle schema (reputation_state.ts) already updated to `real` in R8b same-commit.
--
-- Canon :203: `anomaly_pressure_bucket += Δ_per_week` where Δ = triad_observer_attention_share
-- (default 0.12 — a float). The smallint type from migration 0049 was insufficient for float accrual.
-- Migration 0057 added the new columns (last_eval_week, observer_interest_flag) but could not alter
-- the existing column in the same transaction on the live DB (already applied). This migration
-- promotes anomaly_pressure_bucket to real so the weekly tick accumulation is correct.
--
-- Safe: all existing values are integers (0) — USING ::real is a no-op data conversion.
-- Additive: no data is lost. app_rw retains its existing UPDATE grant.

ALTER TABLE forbidden_triad_pair_state
  ALTER COLUMN anomaly_pressure_bucket TYPE real USING anomaly_pressure_bucket::real;

--> statement-breakpoint

-- Re-assert GRANT after DDL (defensive — pg preserves grants on ALTER COLUMN TYPE for same type family).
GRANT UPDATE ON forbidden_triad_pair_state TO app_rw;

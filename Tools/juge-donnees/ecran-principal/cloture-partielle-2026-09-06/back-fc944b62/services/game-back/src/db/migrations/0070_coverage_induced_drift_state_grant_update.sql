-- Insurance Drift C4: GRANT UPDATE on coverage_induced_drift_state for app_rw
-- The 0067 migration created the table but omitted the GRANT UPDATE clause.
-- C4 adds the onStashFill subscriber which UPDATE hazard_shift + fingerprint_stash_ratio — this
-- grant enables the UPDATE path (R9.3: auth is the single source of truth for role grants).
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 4 (C4)
--             — Insurance Drift C4 — 2026-06-18
--
-- Migration: 0070_coverage_induced_drift_state_grant_update
-- No schema change — purely a GRANT to fix missing app_rw UPDATE permission.
--
-- R9.3: ch09 NOT affected (GRANT is not a schema change; already tracked via 0067 table creation).
-- Zero-regression: a GRANT is additive — only expands permissions, never restricts.

GRANT SELECT, INSERT, UPDATE ON "coverage_induced_drift_state" TO app_rw;

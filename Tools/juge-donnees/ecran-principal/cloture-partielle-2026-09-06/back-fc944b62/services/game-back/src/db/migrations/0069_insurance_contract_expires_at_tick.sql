-- Migration 0069: insurance_contract — expires_at_tick (DD-RENEWAL term)
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 2 (C2)
--             design §3.3 (DD-RENEWAL — Tranche C §4.2)
--             Insurance Drift C2 — 2026-06-18
--
-- Adds 1 NULLABLE column to `insurance_contract` (additive — no existing column mutated, R9.3):
--   expires_at_tick bigint — the in-game tick at which the contract is due for renewal (C11).
--
-- NULL = no term (Tranche B contracts have no renewal term — backward-compatible null sentinel).
-- Set at issuance by ContractService (C3): issued_tick + coverage_drift_contract_term_days × ticks_per_day.
-- Consumed by RenewalService.runWeeklyRenewalCheck (C11): expires_at_tick ≤ currentTick → re-quote.
-- The renewal lapse REUSES ContractStatus.LAPSED (no new status added — canon :146).

ALTER TABLE "insurance_contract"
  ADD COLUMN "expires_at_tick" bigint;

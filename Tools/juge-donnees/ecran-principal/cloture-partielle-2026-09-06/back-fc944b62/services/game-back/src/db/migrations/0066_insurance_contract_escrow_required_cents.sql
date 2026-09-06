-- Insurance C12: add escrow_required_cents to insurance_contract
-- Resolves the C11 escrow fig-leaf (hardcoded 0 in InsuranceProjectionService).
-- The full capital-lock (deducting from spendable balance + refunding on contract close)
-- is deferred to a wary-depth follow-up. C13 will route the TD number (TD-ESCROW-CAPITAL-LOCK).
--
-- Migration: 0066_insurance_contract_escrow_required_cents
-- Table:     insurance_contract
-- Column:    escrow_required_cents  BIGINT NOT NULL DEFAULT 0
--
-- R9.3: this migration is backported to docs/tech/09_data_model/schema_insurance.md in the same commit.
-- Zero-regression: existing rows get DEFAULT 0 (no escrow posted before C12).

ALTER TABLE "insurance_contract"
  ADD COLUMN "escrow_required_cents" bigint NOT NULL DEFAULT 0;

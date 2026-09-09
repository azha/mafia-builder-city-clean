-- D2 R4a: restraint_index_tick_scalars — derived server-only scalars for the weekly tick.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md §2 Table 3 + §3 migration 0053)
--       backported in the SAME commit as this migration (D2 R4a — 2026-06-17).
--
-- R2.2 (P5-banded): restraint_ratio / offer_terms / wary_active / collateral_amount / last_tick_week are
--   server-only scalars (never forwarded to a client route). Client sees only offer_posture + marginalia.
--
-- ADD to restraint_dispute_ring (per-counterparty):
--   restraint_ratio  real    — Σ(claimable_i − claimed_i) / Σ claimable_i ∈ [0,1] (:85-86).
--   offer_terms      real    — base_terms · (1 + δ · restraint_ratio) (:90).
--   wary_active      boolean — true when restraint_ratio < restraint_wary_threshold (:93).
--   collateral_amount real   — escrow amount demanded = offer_terms · restraint_collateral_inflation_wary (:93).
--   last_tick_week   integer — week-id of the last tick run (idempotence guard per-week).
--
-- All new columns nullable (existing rows remain valid — additive migration, R9.3).
-- Defaults NULL = "not yet computed" (tick sets them on first run).
--
-- DD-REG-NAME: δ, wary_threshold, window, escrow_inflation, and base_terms are all read from
--   the registry (no inline coefficients). See reputation-tunables.ts for the resolver getters.

ALTER TABLE restraint_dispute_ring
  ADD COLUMN IF NOT EXISTS restraint_ratio    real,
  ADD COLUMN IF NOT EXISTS offer_terms        real,
  ADD COLUMN IF NOT EXISTS wary_active        boolean,
  ADD COLUMN IF NOT EXISTS collateral_amount  real,
  ADD COLUMN IF NOT EXISTS last_tick_week     integer;

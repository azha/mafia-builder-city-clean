-- Migration 0068: almanac_entry — 5 additive §4.2 baseline_fingerprint columns
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 2 (C2)
--             design §3.2 (DD-ALMANAC-NO-FINGERPRINT RESOLVED — Tranche C §4.2)
--             Insurance Drift C2 — 2026-06-18
--
-- RESOLVES the Tranche B seam `insurance.ts:30,465`:
--   "DD-ALMANAC-NO-FINGERPRINT: NO baseline_fingerprint — that is §4.2 (Tranche C)"
--
-- Adds 5 NULLABLE columns to `almanac_entry` (additive — no existing column mutated, R9.3):
--   4 × baseline_fingerprint_* smallint — the frozen issuance BehaviourFingerprint (anti-exploit anchor C12)
--   1 × baseline_persisted_until_tick bigint — until when the persisted baseline is valid post-lapse (C12)
--
-- All columns are NULLABLE for backward-compatibility with Tranche B rows (no baseline captured).
-- Set by captureBaselineFingerprint (C3) at contract issuance.
-- Canon :90: "baseline_fingerprint (4 B) — 4-feature snapshot of pre-coverage operating policy."
-- DD-FINGERPRINT-COLS: 4 separate smallint columns (NOT a packed blob — design §3.2, canon :90).
-- DD-BASELINE-PERSIST: baseline_persisted_until_tick set on lapse; re-issue within window inherits (C12).

ALTER TABLE "almanac_entry"
  ADD COLUMN "baseline_fingerprint_stash_ratio"     smallint,
  ADD COLUMN "baseline_fingerprint_courier_cadence" smallint,
  ADD COLUMN "baseline_fingerprint_marginal_deal"   smallint,
  ADD COLUMN "baseline_fingerprint_lookout"         smallint,
  ADD COLUMN "baseline_persisted_until_tick"        bigint;

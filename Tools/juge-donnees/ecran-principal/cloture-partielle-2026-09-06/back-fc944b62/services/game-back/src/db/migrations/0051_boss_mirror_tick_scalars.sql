-- D2 R2b: boss_mirror_tick_scalars — derived server-only scalars for the weekly tick.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md §2 Table 1/2 + §3 migration 0051)
--       backported in the SAME commit as this migration (D2 R2b fixup — 2026-06-17).
--
-- R2.2 (P5-banded): violation_density / defection_tolerance / consistency_index are server-only scalars
--   (never forwarded to a client route). Client sees only a posture/band projection (R12b).
--
-- ADD to boss_mirror_violation_ring (per-lieutenant):
--   violation_density    real    — Σ (severity_i · recency_weight_i) over ring slots (:53-55).
--   defection_tolerance  real    — base_tolerance · (1 + γ · violation_density) (:56-59).
--   last_tick_week       integer — week-id of the last tick run (idempotence guard per-week).
--
-- ADD to boss_mirror_declaration_ledger (per-player):
--   consistency_index    real    — 1 − (retractions / declarations) over last 90 days (:65).
--   last_consistency_week integer — week-id of the last consistency_index computation (idempotence guard).
--
-- All new columns nullable (existing rows remain valid — additive migration, R9.3).
-- Defaults NULL = "not yet computed" (tick sets them on first run).
--
-- DD-REG-NAME: γ, recency_decay, and base_defection_tolerance are all read from the registry
--   (no inline coefficients). See reputation-tunables.ts for the resolver getters.

ALTER TABLE boss_mirror_violation_ring
  ADD COLUMN IF NOT EXISTS violation_density   real,
  ADD COLUMN IF NOT EXISTS defection_tolerance real,
  ADD COLUMN IF NOT EXISTS last_tick_week      integer;

--> statement-breakpoint

ALTER TABLE boss_mirror_declaration_ledger
  ADD COLUMN IF NOT EXISTS consistency_index     real,
  ADD COLUMN IF NOT EXISTS last_consistency_week integer;

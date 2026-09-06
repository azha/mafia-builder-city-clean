-- D2 R5a: lek_memory_cell_state — additive ALTER to add last_decay_week idempotence guard.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- last_decay_week: integer (nullable) — week-id of the last runDecayTick() run.
--   NULL until the first decay tick runs for this cell.
--   Idempotence guard: if last_decay_week == currentWeekId → skip this cell (no double-decay).
--   Pattern mirrors last_tick_week on boss_mirror_violation_ring (migration 0051).
-- R2.2/P5: server-only — never forwarded to a client route.
--
-- DD-LEK-LOC: lek_memory_cell_state is the SIBLING TABLE owner. deal_leks is BYTE-UNTOUCHED.
-- This migration is ADDITIVE ONLY (no DROP, no column rename, no data modification).

ALTER TABLE lek_memory_cell_state
  ADD COLUMN IF NOT EXISTS last_decay_week integer;

--> statement-breakpoint

-- No grant needed: UPDATE permission granted at table level (migration 0050).

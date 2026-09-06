-- D2 R7a: hidden_curriculum_norms_vector — additive ALTER for weekly review tick idempotence guard.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       updated in the SAME commit.
--
-- Adds `last_review_week` (integer, nullable) to hidden_curriculum_norms_vector.
--   Pattern mirrors last_tick_week (boss_mirror_violation_ring, migration 0051) and
--   last_decay_week (lek_memory_cell_state, migration 0054).
--
-- last_review_week: week-id of the last runWeeklyReviewTick() run (idempotence guard per-week).
--   NULL until the first weekly review tick runs.
--   Keyed on Math.floor(ctx.gameMinute / (7×24×60)).
--   Server-only (never forwarded to client — R2.2/P5).

ALTER TABLE hidden_curriculum_norms_vector
  ADD COLUMN IF NOT EXISTS last_review_week integer;

--> statement-breakpoint

GRANT UPDATE ON hidden_curriculum_norms_vector TO app_rw;

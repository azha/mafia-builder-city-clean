-- IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7)
--             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.2
--             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :285-321 (Adaptive Skin)
--             — Rival AI Foundation C7 — 2026-06-24 —
--
-- `rival_attack_pattern_resistance` — per-player × per-rival × per-pattern resistance accumulator.
--
-- PK composite: (player_id, rival_key, pattern_hash) — one row per pattern per rival per player.
-- FK: player_id → player(player_id) ON DELETE CASCADE (cleans up when player is deleted).
--
-- SOFT-REF discipline (§9.2 — mirrors rival_holding/rival_pair_pressure):
--   rival_key — uses the rival_key enum (declared in migration 0081_rival_state.sql).
--   NO FK to any global static table — per-player additivity (no global cascade coupling).
--   Only the player_id FK cascades (on player delete).
--
-- resistance:
--   The raw per-pattern resistance float (:285). HIDDEN / SERVER-ONLY (P6, :305).
--   NEVER forwarded to the player client — the player sees only the ResistanceBucket (derived).
--   Default 0 (no resistance). Incremented by adaptation_rate on each recordAttack call.
--   Decays by 0.01/daily-tick when the pattern is unused (adaptive_skin_resistance_decay_when_unused_per_tick).
--
-- last_used_tick:
--   bigint NOT NULL — game-minute of the most recent recordAttack call for this pattern.
--   Used by the daily decay to determine "idle" patterns (last_used_tick < current gameMinute).
--   Idempotence guard: a pattern seeded at tick T is idle at tick T+N for N > 0.
--
-- Additivity (§1.3): this migration creates ONE NEW TABLE and GRANTs — no existing table modified.
-- R9.3: docs/tech/09_data_model/schema_conflict_rival.md backported same-commit.

CREATE TABLE IF NOT EXISTS "rival_attack_pattern_resistance" (
  "player_id"      uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"      rival_key     NOT NULL,
  "pattern_hash"   varchar(64)   NOT NULL,
  "resistance"     real          NOT NULL DEFAULT 0,
  "last_used_tick" bigint        NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "rival_key", "pattern_hash")
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_attack_pattern_resistance" TO app_rw;

-- IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 6 (C6)
--             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.3
--             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :243-248 (Trophic Gap state)
--             — Rival AI Foundation C6 — 2026-06-24 —
--
-- `rival_pair_pressure` — per-player pairwise suppression pressure (Trophic Gap, §3.5).
--
-- PK composite: (player_id, rival_a_key, rival_b_key) — one row per directed suppression pair.
-- FK: player_id → player(player_id) ON DELETE CASCADE (cleans up when player is deleted).
--
-- SOFT-REF discipline (§9.3 — the corridor_debt.block_id precedent, migration 0076):
--   rival_a_key / rival_b_key — enum-typed using the shared rival_key enum (declared in 0081).
--   NO DB FK to any global static table — per-player additivity without global cascade coupling.
--   Only the player_id FK cascades (on player delete — clears all pair-pressure rows).
--
-- enforcement_pressure:
--   The raw PairwisePressureBucket float (:245). SERVER-ONLY / P6 — NEVER forwarded to client.
--   Default 0. Restoration increments on the 12h rebalance (C6 TrophicGapService.rebalancePressurePairs).
--
-- top_enforcer_active:
--   boolean. Default true (enforcer is active, suppression is in effect).
--   Flipped to false by removeTopEnforcer (the B/C §13 write-hook).
--   The 12h rebalance (RIVAL_REGIME_TICK) restores enforcement_pressure when false,
--   until trophic_gap_duration_ticks tick-periods elapse.
--
-- Additivity (§1.3): this migration creates ONE NEW TABLE and GRANTs — no existing table modified.
-- R9.3: docs/tech/09_data_model/schema_conflict_rival.md backported same-commit.

CREATE TABLE IF NOT EXISTS "rival_pair_pressure" (
  "player_id"            uuid       NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_a_key"          rival_key  NOT NULL,
  "rival_b_key"          rival_key  NOT NULL,
  "enforcement_pressure" real       NOT NULL DEFAULT 0,
  "top_enforcer_active"  boolean    NOT NULL DEFAULT true,
  PRIMARY KEY ("player_id", "rival_a_key", "rival_b_key")
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_pair_pressure" TO app_rw;

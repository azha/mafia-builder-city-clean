-- 0030_player_progression_taught_signals.sql — schema_player_progression_state.md §2. PALIMPSEST forward-only.
-- IMPLEMENTS: Phase-17 / DSL vocab-tier progression. R9.3: matches src/db/schema/player_progression_state.ts. ONLY ADDS —
--             1 NEW column on "player_progression_state" (taught_signals jsonb, the set of DSL signals the player has TAUGHT
--             via an ADD_RULE resolution; ProgressionService appends-if-new + reads it for the distinct-count half of the
--             Tier 1→2 dual gate). ADD COLUMN WITH DEFAULT '[]' = backfill-safe (existing rows get the empty set). NO index
--             (read per-player by PK). GRANT: "player_progression_state" already has app_rw SELECT/INSERT/UPDATE (0013) —
--             table-level grant covers the new column, no re-GRANT.
ALTER TABLE "player_progression_state"
  ADD COLUMN "taught_signals" jsonb NOT NULL DEFAULT '[]'::jsonb;

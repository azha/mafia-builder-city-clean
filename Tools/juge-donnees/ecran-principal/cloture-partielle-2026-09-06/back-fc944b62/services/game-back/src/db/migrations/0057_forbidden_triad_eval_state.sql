-- D2 R8b: forbidden_triad_pair_state — additive ALTER for weekly tick state.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       updated in the SAME commit.
--
-- 1. ALTER `anomaly_pressure_bucket` from smallint → real.
--    Canon :203: `anomaly_pressure_bucket += Δ_per_week` where Δ = triad_observer_attention_share
--    (default 0.12 — a float). The smallint type from migration 0049 is insufficient; R8b promotes
--    the column to real to accumulate the float weekly accrual correctly.
--    R2.2: server-only (never forwarded to client — player sees dashed-line thickness :208).
--
-- 2. Adds two new columns:
--
--   `last_eval_week` (integer, nullable):
--     The last week this pair was evaluated in evaluatePairs() weekly tick.
--     NULL until the first weekly tick runs for the pair.
--     Idempotence guard: evaluatePairs() skips pairs where last_eval_week = current weekId.
--     R2.2: server-only (never forwarded to client).
--
--   `observer_interest_flag` (boolean, not null, default false):
--     Whether the designated observer NPC has flipped its interest_flag for this pair.
--     Set to TRUE once anomaly_pressure_bucket >= triad_H_observer_weeks (registry, default 14).
--     One-way gate — never reset back to false.
--     R2.2: server-only (player sees observer NPC cues :208 — never this raw flag).
--
-- All changes are additive/non-breaking. The sentinel row (pair_key = player_id) has
-- these columns set to their defaults (0.0 / NULL / false) and they are ignored on sentinel.
--
-- R9.3: ch09 schema_reputation_state.md §2 Table 5 backported — D2 R8b fixup commit.

ALTER TABLE forbidden_triad_pair_state
  ADD COLUMN IF NOT EXISTS last_eval_week        integer,
  ADD COLUMN IF NOT EXISTS observer_interest_flag boolean NOT NULL DEFAULT false;

--> statement-breakpoint

GRANT UPDATE ON forbidden_triad_pair_state TO app_rw;

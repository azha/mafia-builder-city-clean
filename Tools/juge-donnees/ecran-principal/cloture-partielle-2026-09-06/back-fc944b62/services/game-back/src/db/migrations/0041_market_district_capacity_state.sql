-- D1b C5: district_capacity_state — Carrying-Capacity Haze (§2.4).
-- R9.3: Drizzle schema (market_district_capacity_state.ts) + ch09 mirror (schema_market_district_capacity_state.md)
--       backported in the SAME commit.
--
-- district_capacity_state: per-district hidden carrying capacity state (market_mechanics.md:157-161).
--   K (k_baseline + k_current): hidden throughput ceiling seeded from block_count demographics.
--   Q_total (q_total): rolling 14-day throughput sum (player + rivals).
--   T_over (t_over): consecutive daily ticks above λ=1.0.
--   has_civic_investment: flag for civic-investment hook (partial recovery).
--   K never exposed to client (P5 invariant).
--   PK: district_id. FK: district_id → districts(id) ON DELETE CASCADE.
--   k_current may be permanently lowered below k_baseline (irreversibility primitive).

CREATE TABLE IF NOT EXISTS district_capacity_state (
  district_id         integer     NOT NULL PRIMARY KEY
    REFERENCES districts(id) ON DELETE CASCADE,
  -- Hidden capacity state (market_mechanics.md:157-161 — 8 B hidden):
  k_baseline          real        NOT NULL,  -- world-gen seeded K (NEVER increased above this)
  k_current           real        NOT NULL   -- current K (≤ k_baseline; permanently damaged by overshoot)
    CONSTRAINT district_capacity_state_k_current_non_negative_chk CHECK (k_current >= 0),
  q_total             real        NOT NULL DEFAULT 0,   -- rolling 14-day throughput
  t_over              integer     NOT NULL DEFAULT 0    -- consecutive ticks above 1.0×K
    CONSTRAINT district_capacity_state_t_over_non_negative_chk CHECK (t_over >= 0),
  has_civic_investment boolean    NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Grant UPDATE for daily tick mutations.
GRANT UPDATE ON district_capacity_state TO app_rw;

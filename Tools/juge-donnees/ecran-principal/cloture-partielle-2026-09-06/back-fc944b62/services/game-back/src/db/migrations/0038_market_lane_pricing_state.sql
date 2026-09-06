-- D1b C2: lane_pricing_state — GLOBAL market lane state per (district_id × substance_type).
-- R9.3: Drizzle schema (market_lane_pricing_state.ts) + ch09 mirror (schema_market_lane_pricing_state.md)
--        backported in the SAME commit.
--
-- lane_pricing_state is NOT per-player — it is a shared global market table (like districts/blocks).
-- PK: composite (district_id, substance_type).
-- FK: district_id → districts(id) ON DELETE CASCADE (both tables are global — a real FK is legitimate).
-- REUSE: `substance_type` pgEnum already exists (migration 0019).

CREATE TABLE IF NOT EXISTS lane_pricing_state (
  district_id           integer         NOT NULL
    REFERENCES districts(id) ON DELETE CASCADE,
  substance_type        substance_type  NOT NULL,
  -- [DESIGN DECISION — MODAL_P_SEED]: p seeded at lane init from selling tunable default (=2500¢).
  p_cents               integer         NOT NULL,
  -- [DESIGN DECISION — W_SEED_FRACTION]: w = p * MARKET_LANE_HALFWIDTH_SEED_FRACTION (default 0.10).
  w_cents               integer         NOT NULL,
  -- c ∈ [0,1] — lane confidence EMA (default 0.5 = midpoint). Updated per-deal (market_mechanics.md:52-56).
  c                     real            NOT NULL DEFAULT 0.5
    CONSTRAINT lane_pricing_state_c_range_chk CHECK (c >= 0 AND c <= 1),
  -- t_refractory_minutes ≥ 0 — jam timer in in-game minutes. Armed to T_jam on off-lane collapse.
  t_refractory_minutes  integer         NOT NULL DEFAULT 0
    CONSTRAINT lane_pricing_state_t_refractory_non_negative_chk CHECK (t_refractory_minutes >= 0),
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),
  PRIMARY KEY (district_id, substance_type)
);

-- Minimal index for the HOURLY clearing tick (full-scan of lane_pricing_state is expected to be small:
-- 18 districts × 4 substances = 72 rows max; the PK covers all point-lookup paths).
-- No additional index needed day-1.
--> statement-breakpoint

-- Grant UPDATE/DELETE to app_rw (the mutable market-state table: processDealAttempt + clearing-tick write c/t_refractory/updated_at).
-- SELECT + INSERT are granted automatically via ALTER DEFAULT PRIVILEGES (migration 0013 §Future objects).
GRANT UPDATE ON lane_pricing_state TO app_rw;

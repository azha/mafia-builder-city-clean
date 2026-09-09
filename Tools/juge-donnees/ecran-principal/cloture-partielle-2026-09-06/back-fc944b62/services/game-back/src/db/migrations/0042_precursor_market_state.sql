-- D1c B2: precursor_market_state + precursor_supplier_pressure — Precursor Buy Market persistence (§7).
-- R9.3: Drizzle schemas (precursor_market_state.ts) + ch09 mirror (schema_precursor_market_state.md)
--       backported in the SAME commit.
--
-- precursor_market_state: global per-type hidden buy-market state (precursors_supply_chain.md:129).
--   price_trend: UP/STABLE/DOWN — endogenous demand-driven trend (DD-T). Server-side only (R2.2).
--   demand_accumulator: rolling order-volume accumulator (DD-T). Hidden server-side (R2.2).
--   scarcity_active: flag set by SupplyDisruptionEvent (DD-S).
--   disruption_event_id: uuid of the active SupplyDisruptionEvent (null if no disruption).
--   last_inference_day: idempotence guard for the daily inferDailyTrend tick.
--   PK: precursor_type (1 row per enum member — global, DD-ENT).
--   SEEDED: pyralin/thalmite/garnet_salt with STABLE/0/false (neutral baseline, B6 zero-regression floor).
--
-- NOTE: price_trend_type PG enum is created here. precursor_type enum already exists (0017 migration).
-- PG16 does not support CREATE TYPE IF NOT EXISTS — use DO block guard for idempotency.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_trend') THEN
    CREATE TYPE price_trend AS ENUM ('UP', 'STABLE', 'DOWN');
  END IF;
END $$;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS precursor_market_state (
  precursor_type          precursor_type  NOT NULL PRIMARY KEY,
  price_trend             price_trend     NOT NULL DEFAULT 'STABLE',
  demand_accumulator      real            NOT NULL DEFAULT 0,
  scarcity_active         boolean         NOT NULL DEFAULT false,
  disruption_event_id     uuid,
  last_inference_day      integer         NOT NULL DEFAULT 0,
  created_at              timestamptz     NOT NULL DEFAULT now(),
  updated_at              timestamptz     NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Neutral baseline seed: 1 row per Brindle precursor type (pyralin/thalmite/garnet_salt).
-- price_trend=STABLE + demand_accumulator=0 + scarcity_active=false is B6's zero-regression floor
-- ($150/unit = STABLE baseline × trend_multiplier_stable=1.0 × no scarcity).
-- Idempotent (ON CONFLICT DO NOTHING) — safe to re-run.
INSERT INTO precursor_market_state (precursor_type, price_trend, demand_accumulator, scarcity_active, last_inference_day)
VALUES
  ('pyralin',      'STABLE', 0, false, 0),
  ('thalmite',     'STABLE', 0, false, 0),
  ('garnet_salt',  'STABLE', 0, false, 0)
ON CONFLICT (precursor_type) DO NOTHING;

--> statement-breakpoint

-- Grant UPDATE for daily tick mutations (inferDailyTrend + scarcity coupling).
GRANT UPDATE ON precursor_market_state TO app_rw;

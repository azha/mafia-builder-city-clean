-- D1c B4: add disruption_start_day to precursor_market_state — scarcity expiry (DD-S).
-- R9.3: Drizzle schema (precursor_market_state.ts) + ch09 mirror (schema_precursor_market_state.md)
--       backported in the SAME commit.
--
-- disruption_start_day — game-day on which the active SupplyDisruptionEvent started.
-- Null if no active disruption (no backfill needed — null = no disruption, consistent with
-- scarcity_active=false / disruption_event_id=NULL in all seeded rows).
-- Used by inferDailyTrend to check expiry:
--   currentDay - disruption_start_day >= supply_disruption_duration_days → clear scarcity.

ALTER TABLE precursor_market_state
  ADD COLUMN IF NOT EXISTS disruption_start_day integer;

-- migration 0113: political_district_signal_state (04e-A2 C3 — state-driven trigger evaluators +
-- district signal)
-- Plan: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C3
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §6.4 (E-POL-12
--         "Restraint Index in a district has NO district axis" gap — recommendation (a): redefine
--         against a sustained per-district cohesion+heat signal that exists)
-- Decisions: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §4.2 (L1
--         redefinition, RULED: cohesion >= floor AND heat <= ceiling sustained over window_days,
--         per-district city-global) + sub-ruling (heat-ceiling = HeatBucket rank constant) + §5
--         (migration allocation)
-- Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md :166-176
--        (E-POL-12 trigger: "sustained good behavior in that district")
-- R9.3: backported to docs/tech/09_data_model/schema_political_district_signal_state.md same-commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
--
-- political_district_signal_state: the per-district E-POL-12 sustained-good-behavior window
-- accumulator (design §6.4, L1). ONE row per district (PK district_id, FK -> districts(id) ON
-- DELETE CASCADE — mirrors district_capacity_state's own "global, not per-player" posture). NOT a
-- per-player table: E-POL-12's trigger is explicitly "per-district city-global" (decisions §4.2,
-- canon invariant #5 "affect ALL active players in city").
--
-- consecutive_good_days: the running streak, incremented on a day where the observed district
-- signal is "good" (cohesion >= epol12_district_cohesion_floor AND HeatBucket <=
-- EPOL12_DISTRICT_HEAT_CEILING_BUCKET), reset to 0 the moment a day is NOT good.
--
-- last_evaluated_game_day: nullable idempotency watermark (NULL until this district's first-ever
-- evaluation) — mirrors political_calendar_state.last_evaluated_game_day exactly, so a given
-- in-game day only ever advances a district's streak once.
--
-- Rows are lazily created (ensureDistrictSignalRow, political-event.repository.ts) — unlike
-- political_calendar_state's single seeded singleton, this table has up to 18 rows (one per
-- districts row) and a row is only created the first time that district is ever evaluated.

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "political_district_signal_state" (
  "district_id"              integer     NOT NULL PRIMARY KEY REFERENCES "districts"("id") ON DELETE CASCADE,
  "consecutive_good_days"    integer     NOT NULL DEFAULT 0,
  "last_evaluated_game_day"  integer,
  "updated_at"               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "political_district_signal_state_streak_non_negative_chk" CHECK ("consecutive_good_days" >= 0)
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "political_district_signal_state" TO app_rw;

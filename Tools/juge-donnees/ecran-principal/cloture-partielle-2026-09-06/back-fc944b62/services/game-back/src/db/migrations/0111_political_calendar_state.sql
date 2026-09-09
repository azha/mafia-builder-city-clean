-- migration 0111: political_calendar_state (04e-A2 C2 — city-global NIGHTLY calendar eval tick)
-- Plan: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C2
-- Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3 (same-tick overlay
--         visibility) + §5 (migration allocation)
-- Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md invariant #5 ("Affect
--        ALL active players in city") + §Tunables NOUVEAUX (overlap_max_active/month_minutes/etc, A1-C1)
-- R9.3: backported to docs/tech/09_data_model/schema_political_calendar_state.md same-commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
--
-- political_calendar_state: a SINGLETON city-global row (id fixed = 1, CHECK-enforced — a design mirror
-- of political_event_active/effect_modifier's own "no player_id FK" city-global posture, design §5.2:
-- "the political calendar is city-global", canon invariant #5 "affect ALL active players in city"). This
-- is NOT a per-player row (unlike city_sim_clock, PK player_id) — the whole city shares ONE evaluated-day
-- watermark, because the political calendar tick (political-calendar-tick.service.ts, NIGHTLY/19.5) fires
-- once per PLAYER's own NIGHTLY boundary crossing (the city-sim engine is per-player-clocked), yet must
-- evaluate the SHARED electoral/budget calendar exactly once per in-game day city-wide — the classic
-- "per-player firing, city-global state" shape already established by IA_THRESHOLD_TICK (04d-B C4,
-- internal_affairs_targets: GLOBAL table, row-level idempotency guard) and META_MARKET_RETENTION_TICK/
-- META_MARKET_ANTICHEAT_TICK (04d-C C5/C6, city-global scans on a per-player-firing NIGHTLY slot).
--
-- last_evaluated_game_day: the city-global watermark. The tick atomically CLAIMS a game-day via a
-- SELECT ... FOR UPDATE + conditional UPDATE (political-event.repository.ts, mirrors the codebase's
-- established row-lock idiom, e.g. money-holding.repository.ts:296) — the FIRST player's NIGHTLY firing
-- for a given day wins the claim; every other player's firing for the SAME (or an earlier) day is a
-- pure no-op (idempotent — no duplicate trigger evaluation, no duplicate political_event_active row).
-- NULL until the very first tick ever runs (the bootstrap baseline — the first tick records its day as
-- the watermark WITHOUT firing any trigger, since there is no "previous day" to detect a boundary
-- crossing against; see political-calendar-tick.service.ts's own doc comment for the full rationale).
--
-- scandal_noise_accumulator: the city-global running total the E-POL-09 scandal-noise trigger compares
-- against `political_events.epol09_scandal_noise_threshold` (political.tunables.ts, A2-C1). This
-- migration only CREATES the column (a NEW city-global running-total slot) — the ACCUMULATION logic
-- itself (feeding city-event noise into it) is C3 scope (plan §C3: "accumulate city-event noise into
-- political_calendar_state.scandal_noise_accumulator"). C2 does not read or write this column.
--
-- numeric() (not real) for scandal_noise_accumulator: mirrors effect_modifier.magnitude's own
-- string-mode precision choice (design §2.3 determinism) — a running accumulator that is compared
-- against a threshold and never reset mid-comparison benefits from the same no-float-drift guarantee.

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "political_calendar_state" (
  "id"                        integer     NOT NULL PRIMARY KEY DEFAULT 1,
  "last_evaluated_game_day"   integer,
  "scandal_noise_accumulator" numeric     NOT NULL DEFAULT 0,
  CONSTRAINT "political_calendar_state_singleton_chk" CHECK ("id" = 1)
);

--> statement-breakpoint

-- Seed the ONE singleton row at migration time (never lazily created at runtime — a fixed-shape
-- city-global table always has exactly one row from the moment this migration applies).
INSERT INTO "political_calendar_state" ("id", "last_evaluated_game_day", "scandal_noise_accumulator")
VALUES (1, NULL, 0)
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "political_calendar_state" TO app_rw;

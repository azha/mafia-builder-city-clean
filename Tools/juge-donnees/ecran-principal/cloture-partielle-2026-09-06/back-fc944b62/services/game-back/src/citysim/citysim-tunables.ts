// IMPLEMENTS: docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Tunables (REUSE)
//             + composition_overview.md §Tunables référencés
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// CitySim scheduler tunables — the cadence + perf keys the multi-cadence engine needs (T1 scope ONLY;
// the 11 systems add their own tunables in T2–T13).
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values
// from `projects/mafia_city_game/gdd/14_tunable_constants.md`. They are surfaced here as env-overridable
// fallbacks so the source stays a faithful MIRROR of the registry (single source of truth). Each key cites
// its registry §section. If the registry values change, update this map in the SAME commit (R9.3
// propagation: gdd/14 ↔ code).

import { TunablesStore } from '../config/tunables-store';

/**
 * Resolved CitySim scheduler tunables (cadence + perf). Derived in-game→real conversions use the
 * master ratio `tick.real_seconds_per_game_minute` (1:30). In-game cadence boundaries (30-min, 12-h,
 * nightly, weekly) are expressed in GAME-MINUTES so the deterministic advance harness can compute,
 * for any span, exactly how many of each cadence boundary it crossed.
 */
export const citySimTunables = {
  /** tick.real_seconds_per_game_minute — master ratio (real seconds per 1 in-game minute). (DB-override > env > default — Phase-23). */
  get realSecondsPerGameMinute(): number { return TunablesStore.resolveInt('T.tick.real_seconds_per_game_minute', 'TICK_REAL_SECONDS_PER_GAME_MINUTE', 2); },
  /** clock.in_game_day_length_minutes — one full in-game day, in game-minutes. (DB-override > env > default — Phase-23). */
  get inGameDayLengthMinutes(): number { return TunablesStore.resolveInt('T.clock.in_game_day_length_minutes', 'CLOCK_IN_GAME_DAY_LENGTH_MINUTES', 1440); },
  /** perf.game.tick_max_ms — F4 compute gate for the 2 Hz tick (circuit-breaker threshold). (DB-override > env > default — Phase-23). */
  get tickMaxMs(): number { return TunablesStore.resolveInt('T.perf.game.tick_max_ms', 'PERF_GAME_TICK_MAX_MS', 50); },
  /** perf.low.ram_budget_mb — tightest device tier; the RAM watermark gates against this (critical). (DB-override > env > default — Phase-23). */
  get ramBudgetLowMb(): number { return TunablesStore.resolveInt('T.perf.low.ram_budget_mb', 'PERF_LOW_RAM_BUDGET_MB', 512); },
  /** perf.mid.ram_budget_mb — mid device tier (informational at boot). (DB-override > env > default — Phase-23). */
  get ramBudgetMidMb(): number { return TunablesStore.resolveInt('T.perf.mid.ram_budget_mb', 'PERF_MID_RAM_BUDGET_MB', 1024); },
  /** perf.high.ram_budget_mb — high device tier (informational at boot). (DB-override > env > default — Phase-23). */
  get ramBudgetHighMb(): number { return TunablesStore.resolveInt('T.perf.high.ram_budget_mb', 'PERF_HIGH_RAM_BUDGET_MB', 2048); },
  /** flow_cell_update_hz — 2 Hz cadence of System 1/11/2 (real Hz; the only real-time cadence). (DB-override > env > default — Phase-23). */
  get flowCellUpdateHz(): number { return TunablesStore.resolveFloat('T.city.flow_cell_update_hz', 'FLOW_CELL_UPDATE_HZ', 2); },
  /** rich_npc_tick_minutes — 5-in-game-minute schedule-update cadence of System 2. (DB-override > env > default — Phase-23). */
  get richNpcTickMinutes(): number { return TunablesStore.resolveInt('T.city.rich_npc_tick_minutes', 'RICH_NPC_TICK_MINUTES', 5); },
  /** precinct_review_tick_hours — 12-in-game-hour BPD precinct review cadence of System 4/6. (DB-override > env > default — Phase-23). */
  get precinctReviewTickHours(): number { return TunablesStore.resolveInt('T.city.precinct_review_tick_hours', 'PRECINCT_REVIEW_TICK_HOURS', 12); },
  // inspection_processing_per_day (MIS pulls/day, System 6) is NOT a scheduler tunable — nothing in the
  // engine reads it. It lands with System 6 (T7), which surfaces its own tunable. Dropped here to keep this
  // map honest (no resolved-but-unused config).
};

/**
 * In-game cadence boundary widths, in GAME-MINUTES. Derived from the registry tunables (NOT inline
 * magic numbers): the 30-min cadence = 30 game-minutes, the 12-h cadence = precinct_review_tick_hours×60,
 * the nightly cadence = one in-game day, the weekly cadence = 7 in-game days. The deterministic advance
 * harness uses these to count, for a span [from, to), how many of each boundary it crossed.
 *
 * The 2 Hz cadence is the only one NOT expressed in game-minutes — it is real-time (flow_cell_update_hz),
 * and is stepped a fixed number of sub-ticks PER in-game minute by the harness (deterministic stepping).
 *
 * BOOT-FROZEN (P23-T8): values are captured at module initialisation time by reading citySimTunables getters.
 * A DB-override of richNpcTickMinutes / precinctReviewTickHours / inGameDayLengthMinutes after boot will NOT
 * be reflected here until the process restarts. This is intentional: CADENCE_WIDTH_GAME_MINUTES is consumed
 * ONLY by the deterministic advance harness (tests / the tick-boundary maths), which reads this table once per
 * harness invocation. The live scheduler's cadenceWidth() method reads citySimTunables getters directly
 * (P23-T8 fix) and IS hot-reload-safe. Changing cadence widths mid-game would break DB consistency (ongoing
 * game-state rows are already keyed on the previous boundaries) so process-restart is the correct gate anyway.
 */
export const CADENCE_WIDTH_GAME_MINUTES = {
  /** Every in-game minute (System 9→8→10→Heat). */
  minute: 1,
  /** Every 5 in-game minutes (System 2 schedule update). */
  fiveMin: citySimTunables.richNpcTickMinutes,
  /** Every 30 in-game minutes (System 4 observation accumulation). */
  thirtyMin: 30,
  /** Every 12 in-game hours (System 4 precinct review → System 6 MIS pull → System 2 biographies). */
  twelveH: citySimTunables.precinctReviewTickHours * 60,
  /** Nightly / every in-game day (System 5 cohesion → System 7 unconformity). */
  nightly: citySimTunables.inGameDayLengthMinutes,
  /** Weekly (System 11 lek decay → System 10 percentile baseline reset) = 7 in-game days. */
  weekly: citySimTunables.inGameDayLengthMinutes * 7,
} as const;

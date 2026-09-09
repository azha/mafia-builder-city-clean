// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.1 ("hour_of_week
//             = (game_day % 7) * 24 + hour_of_day … dérivé de l'horloge city-sim, jamais de Date.now()")
//             Pattern: mirrors political-trigger-evaluators.ts's `deriveGameDay`/`deriveMonthIndex` — pure
//             functions of `gameMinute`, shared across C1 (constant-hum.service.ts) and the C2/C3 chunks
//             that will also need `deriveGameDay` (ambient-micro-event.service.ts / off-hours-drift.
//             detector.ts, both keyed by `game_day`).
//             — 04g-A C1 — 2026-07-13
//
// `ambient-clock.ts` — pure, deterministic derivations from `gameMinute` (the city-sim clock,
// `city_sim_scheduler.service.ts`). NO Math.random(), NO Date.now() — every function here is a total,
// pure function of its numeric input(s).

/**
 * `deriveGameDay` — the in-game DAY a `gameMinute` value falls on (integer division; the NIGHTLY cadence
 * only ever fires on an exact multiple of `inGameDayLengthMinutes`, so this is exact for tick-driven
 * calls — direct-probe calls may pass an arbitrary `gameMinute`, in which case this is a floor). Verbatim
 * mirror of `political-trigger-evaluators.ts`'s `deriveGameDay` (REUSE would create a cross-module
 * import for a two-line pure function — kept local per that file's own precedent of small self-contained
 * clock derivations per substrate).
 */
export function deriveGameDay(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

/**
 * `deriveHourOfWeek` — the Constant Hum grid's cyclic hour-of-week index (design §3.1: "hour_of_week =
 * (game_day % 7) * 24 + hour_of_day"). Because the HOURLY cadence's structural width is EXACTLY 60
 * in-game minutes (`city_sim_scheduler.service.ts`'s own `cadenceWidth(Cadence.HOURLY) === 60`) and one
 * in-game day is EXACTLY 1440 minutes = 24 hours (`clock.in_game_day_length_minutes` default), this
 * formula is arithmetically identical to `Math.floor(gameMinute / 60) % cellsPerWeek` — a single
 * absolute-hour-index modulo, avoiding a separate `hour_of_day`/`game_day` decomposition. `cellsPerWeek`
 * is ALWAYS 168 in production (`ambientTunables.constantHumCellsPerWeek`, STRUCTURAL — never overridden,
 * Scenario 1 canon) — threaded as a parameter here only so the pure function itself carries no hidden
 * registry dependency (R2.3 — getters stay at the call site, not buried inside a "pure" helper).
 */
export function deriveHourOfWeek(gameMinute: number, cellsPerWeek: number): number {
  return Math.floor(gameMinute / 60) % cellsPerWeek;
}

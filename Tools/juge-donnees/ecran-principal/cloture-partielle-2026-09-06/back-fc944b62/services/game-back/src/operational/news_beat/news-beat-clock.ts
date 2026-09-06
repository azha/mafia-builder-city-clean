// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (generator — NIGHTLY/30
//             game_day derivation) + C5 (deriveNightlyHourOfWeek — cooper_affair's "current cell")
//             Pattern: verbatim mirror of `operational/random_world/random-world-clock.ts` (itself a
//             verbatim mirror of `operational/ambient/ambient-clock.ts`'s `deriveGameDay`, itself a
//             mirror of `political-trigger-evaluators.ts`'s own copy) — "REUSE would create a
//             cross-module import for a two-line pure function — kept local per that file's own
//             precedent of small self-contained clock derivations per substrate" (ambient-clock.ts
//             header).
//             — 04g-C C2 — 2026-07-16
//             — 04g-C C5 — 2026-07-16 (deriveNightlyHourOfWeek)
//
// `news-beat-clock.ts` — pure, deterministic derivation from `gameMinute` (the city-sim clock). NO
// Math.random(), NO Date.now().

/** The in-game DAY a `gameMinute` value falls on (integer division — exact for tick-driven calls, a
 *  floor for arbitrary direct-probe `gameMinute` values). */
export function deriveGameDay(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

/**
 * `deriveNightlyHourOfWeek` — the Constant Hum grid's cyclic hour-of-week index (`ambient-clock.ts`'s
 * own `deriveHourOfWeek`) AT THE EXACT MOMENT `BRENNAR_DAILY_TICK` (NIGHTLY) fires, derived PURELY from
 * `gameDay` — no `gameMinute` needed. ★ Coder judgment call (documented): `BrennarDailyService.
 * dailyTick(gameDay)`'s established signature (C2, unchanged since — every direct-probe caller across
 * C2-C4 passes `gameDay` alone) never threads `gameMinute` through the call chain. This is safe because
 * NIGHTLY's own cadence width is `citySimTunables.inGameDayLengthMinutes`
 * (`city_sim_scheduler.service.ts`'s `cadenceWidth`, case `Cadence.NIGHTLY`) — the scheduler only ever
 * fires a NIGHTLY-cadence system when `gameMinute % inGameDayLengthMinutes === 0`, i.e. EXACTLY at
 * `hour_of_day = 0` every single time — so `gameMinute` at tick-fire time is ALWAYS `gameDay ×
 * inGameDayLengthMinutes` exactly, and `deriveHourOfWeek`'s own formula (`floor(gameMinute/60) %
 * cellsPerWeek`) reduces to a pure function of `gameDay` alone. `inGameDayLengthMinutes`/`cellsPerWeek`
 * are threaded as PARAMETERS (never hardcoded 1440/168 here) so a live registry override of either is
 * still honored — R2.3, mirrors `deriveHourOfWeek`'s own "no hidden registry dependency inside a pure
 * function" discipline.
 */
export function deriveNightlyHourOfWeek(gameDay: number, inGameDayLengthMinutes: number, cellsPerWeek: number): number {
  const gameMinuteAtNightlyFire = gameDay * inGameDayLengthMinutes;
  return Math.floor(gameMinuteAtNightlyFire / 60) % cellsPerWeek;
}

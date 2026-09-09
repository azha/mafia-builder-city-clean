// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (generator — NIGHTLY/28
//             game_day derivation)
//             Pattern: verbatim mirror of `operational/ambient/ambient-clock.ts`'s `deriveGameDay`
//             (itself a verbatim mirror of `political-trigger-evaluators.ts`'s own copy) — "REUSE would
//             create a cross-module import for a two-line pure function — kept local per that file's own
//             precedent of small self-contained clock derivations per substrate" (ambient-clock.ts header).
//             — 04g-B C2 — 2026-07-15
//
// `random-world-clock.ts` — pure, deterministic derivation from `gameMinute` (the city-sim clock). NO
// Math.random(), NO Date.now().

/** The in-game DAY a `gameMinute` value falls on (integer division — exact for tick-driven calls, a
 *  floor for arbitrary direct-probe `gameMinute` values). */
export function deriveGameDay(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

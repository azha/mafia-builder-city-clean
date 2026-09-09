// IMPLEMENTS: docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md §D8 (B-6 — engagement 1 :
//             "il fait nuit" ; ⛔ v3 MINOR W7 — "l'objet PARTAGÉ est une FONCTION, pas un jeu de valeurs")
//             -- session:2026-08-17 (W3.U2 C2) --
//
// `quarterIndexForGameMinute` — the ONE shared quarter-of-day-index function. Extracted from
// `DealLekService.dayPhaseBucket` (system_11 §enum ActivityMultiplierBucket), which computed this EXACT
// index inline before mapping it onto its own 3-value scoring domain (DUSK peak commercial weight, D8
// §"Ce que la mesure impose"). D8 v3 (MINOR W7): there are no "boundaries" to extract as VALUES — the
// quarter is a FORMULA (a floor on the minute-of-day fraction of the in-game day, ×4), and the hour
// intervals only ever lived in a comment. Duplicating the formula in a second file would be the exact
// déférence-mutuelle the DA lot already paid for on tint tables; extracting the FUNCTION avoids it.
//
// Two callers, two DOMAINS, ONE index:
//   - `DealLekService.dayPhaseBucket` maps the index onto `ActivityMultiplierBucket` (LOW/MEDIUM/HIGH) —
//     unchanged after extraction (§D8 v3 — a non-regression falsifiable on the site pins the arithmetic
//     byte-identical; see implementation-notes.md §RUNS DIFFÉRÉS).
//   - `DistrictInteriorController.dayPhase` (C2, this lot) maps the SAME index onto the district-interior
//     `DayPhase` domain (DAWN/DAY/DUSK/NIGHT) — engagement 1's 4-paliers cycle.
//
// R2.3: `citySimTunables.inGameDayLengthMinutes` is the SAME store-backed tunable both callers already
// depended on before extraction (no new tunable, no inline number here).

import { citySimTunables } from './citysim-tunables';

/** The quarter-of-day index: 0=[0%,25%) · 1=[25%,50%) · 2=[50%,75%) · 3=[75%,100%) of the in-game day. */
export type QuarterIndex = 0 | 1 | 2 | 3;

/**
 * The quarter-of-day index (0..3) for an in-game minute, modulo the CURRENT in-game day length
 * (`citySimTunables.inGameDayLengthMinutes` — read live, never cached, so a tunable change takes effect
 * immediately, the SAME contract every other `citySimTunables` getter-backed call site has). Deterministic:
 * a pure function of `gameMinute` alone at a given tunable value. Negative `gameMinute` is normalized by a
 * double-modulo (never produces a negative `minuteOfDay`) — the SAME arithmetic
 * `DealLekService.dayPhaseBucket` used inline before this extraction, byte-identical.
 */
export function quarterIndexForGameMinute(gameMinute: number): QuarterIndex {
  const dayLen = citySimTunables.inGameDayLengthMinutes;
  const minuteOfDay = ((gameMinute % dayLen) + dayLen) % dayLen;
  return Math.floor((minuteOfDay / dayLen) * 4) as QuarterIndex;
}

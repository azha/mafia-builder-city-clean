// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("Promotion Lock
//             (recall pipeline + window lifecycle)" — the unmanaged window's 7-real-day span).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §9.1 step 7
//             ("window ticks") + §9.2 (D10 — "real-days converted by the live clock convention") +
//             §17 hazard 5 ("window bounds use the SAME real-day→tick convention the live clock exposes
//             ... never a second conversion constant").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §8 R9 (the pinned
//             helper — MORE precise than the design's own "04f-A lapse-phase precedent" citation:
//             `deriveGameDay` converts ticks→IN-GAME days, a DIFFERENT axis; the correct authoritative
//             getter for REAL-time↔tick is `citySimTunables.realSecondsPerGameMinute`, the SAME ratio
//             the scheduler itself is driven by, `city_sim_scheduler.service.ts:980`).
//             Pattern: `operational/ambient/ambient-clock.ts` (`deriveGameDay`/`deriveHourOfWeek` — small,
//             parameterized, registry-free pure functions; the getter itself stays at the CALL SITE, R2.3
//             — a "pure" helper never buries a hidden tunables import).
//             — P3-F C8 — 2026-07-19
//
// `realDaysToTicks` — the ONE new pure helper C0 R9 authorized: real days → game-minute ticks, via the
// SAME `citySimTunables.realSecondsPerGameMinute` ratio the scheduler's own `setInterval` is driven by
// (`windowTicks = round(realDays * 86400 / realSecondsPerGameMinute)`). At the default ratio (2 real
// sec/tick), 1 real day = 43200 ticks (= 30 in-game days — C0's own "1:30" derivation, confirming
// decisions §4 divergence #24). NO second conversion constant — every caller passes the LIVE getter value
// in, never a re-derived/hardcoded ratio (hazard 5).
const SECONDS_PER_REAL_DAY = 86400;

export function realDaysToTicks(realDays: number, realSecondsPerGameMinute: number): number {
  return Math.round((realDays * SECONDS_PER_REAL_DAY) / realSecondsPerGameMinute);
}

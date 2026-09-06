// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C9 ("projections joueur ...
//             en BUCKETS uniquement ... TimeToCollapseBucket")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.6 ("+
//             `TimeToCollapseBucket` (canon :36) : heuristique v1 depuis la cadence de patchs récente
//             (timestamps `route_version_history`) — buckets qualitatifs (`distant|approaching|imminent|
//             na`), honnêtement grossier (TD raffinement).") + §13 (R2.2/P5 wall — no countdown, ever).
//             Pattern: `backpressure-bucket.ts` (the PURE, no-DB, getter-backed bucket derivation shape).
//             — P3-C C9 — 2026-07-13
//
// `timeToCollapseBucket` — the v1, DELIBERATELY-coarse heuristic design §7.6 explicitly sanctions
// ("honnêtement grossier (TD raffinement)"): the recent CADENCE of `route_version_history` writes (every
// patch §7.2, replan, and rebuild §7.4 archives a row there — the SAME table, no `reason` discriminator
// column exists to separate patches from replans/rebuilds; treating all 3 as "recent churn" is the
// honest simplification this v1 makes, not a lie: MORE recent churn of ANY kind on a route correlates
// with it being ACTIVELY fought over by corridor congestion, which is the real, if approximate, signal
// this bucket surfaces). `severed` (already collapsed — TTC is moot, K4) and "zero history ever" (no
// cadence signal at all — an honest `na`, never a fabricated guess) both resolve to `na`. The 2 window
// constants below are FIXED LITERALS, not tunables (mirrors the exception producers' own "fixed literals,
// not tunables" precedent for confidence/severity/priority, `backpressure-exception-producer.service.ts`'s
// own header — this is explicitly a v1 heuristic constant, not a canon-sourced balance number, and is
// TD-flagged for refinement by the design itself rather than smuggled into the tunables registry as if it
// were canon-grounded).

export type TimeToCollapseBucket = 'distant' | 'approaching' | 'imminent' | 'na';

/** v1 heuristic window (game-minutes) — "recent" churn is anything within this span of `now`. Fixed
 *  literal (see file header) — NOT a registered tunable. */
export const TIME_TO_COLLAPSE_RECENT_WINDOW_TICKS = 60;

/** v1 heuristic threshold — 2+ `route_version_history` writes inside the recent window reads as
 *  `imminent` (the route is being actively re-fought); exactly 1 reads as `approaching`; 0 (but SOME
 *  older history exists) reads as `distant`. Fixed literal (see file header) — NOT a registered tunable. */
export const TIME_TO_COLLAPSE_IMMINENT_RECENT_EVENT_COUNT = 2;

/**
 * @param state              the route's current lifecycle state.
 * @param hasAnyHistory      whether `route_version_history` has EVER recorded a row for this route
 *                           (patch, replan, or rebuild) — `false` means no cadence signal exists yet.
 * @param recentEventCount   count of `route_version_history` rows for this route whose
 *                           `replanned_at_tick` falls within `TIME_TO_COLLAPSE_RECENT_WINDOW_TICKS` of
 *                           the current game-minute (caller resolves this via a DB read; this function
 *                           is pure — no DB, no Math.random, no Date.now, D13).
 */
export function timeToCollapseBucket(
  state: 'draft' | 'active' | 'saturated' | 'severed',
  hasAnyHistory: boolean,
  recentEventCount: number,
): TimeToCollapseBucket {
  if (state === 'severed') return 'na';
  if (!hasAnyHistory) return 'na';
  if (recentEventCount >= TIME_TO_COLLAPSE_IMMINENT_RECENT_EVENT_COUNT) return 'imminent';
  if (recentEventCount >= 1) return 'approaching';
  return 'distant';
}

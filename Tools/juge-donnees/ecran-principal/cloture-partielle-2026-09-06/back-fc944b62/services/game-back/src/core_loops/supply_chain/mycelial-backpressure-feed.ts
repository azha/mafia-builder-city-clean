// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C8 (couplages bidirectionnels
//             3<->5 — the feed term + the damping/loop-breaker rule, ruling #8)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §8.2 ("backpressure_
//             feed = mycelial_backpressure_feed_coefficient (0.3, NEW) si le node DESTINATION du leg est
//             en bucket critical, sinon 0 — amorti : uniquement bucket critical, uniquement la
//             destination") + §8.3 ("un node critical UNIQUEMENT via LEG_STRESSED_ORIGIN ne déclenche PAS
//             le feed §8.2 (le flag source est porté par la propagation) — sinon stressed->critical->
//             accrual->stressed boucle").
//             Substrate: `supply-node-pressure.repository.ts`'s own C5 (⊥) MINOR-2 finding —
//             `applyRelief` clears `is_blocked_output`/`arrow_to_building_id` IMMEDIATELY but
//             DELIBERATELY leaves `blocked_sources` at its last-written value (that file's `findOne`
//             header: "a relieved node's `blockedSources` array can be STALE; reading it as a
//             'currently blocked' signal would silently resurrect a node that has already relieved").
//             This module's `isDampedOnlySource` gates on `isBlockedOutput` FIRST for exactly that
//             reason — `blockedSources` is only trustworthy as a live diagnosis when the row is CURRENTLY
//             flagged a source.
//             — P3-C C8 — 2026-07-13
//
// `mycelial-backpressure-feed.ts` — the §8.2/§8.3 coupling as TWO pure functions (no DB, no Math.random,
// no Date.now — mirrors `mycelial-stress.ts`'s own "pure derivation, every input already resolved by the
// caller" shape). `LegAccrualService.recordThroughput` is the ONE production call site (reads the
// destination building's CURRENT `supply_node_pressure` row, resolves its bucket via the EXISTING
// `backpressureBucket` getter-backed derivation, then asks THIS module whether — and how much — to feed).
//
// THE DAMPING RULE (§8.3, the anti-runaway loop-breaker, plan §C8's own falsifiable): `LEG_STRESSED_
// ORIGIN` (a node tagged blocked-output because ONE OF ITS OWN OUTBOUND legs is stressed, §6.1) is a
// DERIVED signal — not an externally-caused blockage. If a node critical SOLELY because of that derived
// signal were allowed to feed §8.2 back into ANY leg destined there, the loop would self-sustain:
// leg stressed -> its origin tagged blocked-output (half-weight, §8.3) -> given enough ticks the origin
// crosses into `critical` -> §8.2 would feed EVERY leg destined at that origin -> those legs accrue
// faster -> more legs stressed -> more blocked-output -> ... This module's `isDampedOnlySource` is the
// break: a node whose ONLY diagnosed source (this tick) is `LEG_STRESSED_ORIGIN` is excluded from the
// feed, no matter how high its bucket climbed. A node ALSO carrying a real live source (mixed tags, or
// `LEG_STRESSED_ORIGIN` absent entirely) is NEVER damped — the exclusion is narrow by design (design's
// own wording: "UNIQUEMENT via LEG_STRESSED_ORIGIN").

import type { BackpressureBucket } from './backpressure-bucket';

/** Must match `backpressure-update.service.ts`'s OWN `DAMPED_SOURCE` constant (the source tag §8.3
 *  names) — duplicated here (not imported) because that file is the tick orchestrator, this one is the
 *  accrual-side coupling; both independently anchor to the SAME literal string the detector emits
 *  (`leg-stressed-origin.detector.ts`'s own `readonly source = 'LEG_STRESSED_ORIGIN'`). */
const DAMPED_SOURCE = 'LEG_STRESSED_ORIGIN';

/**
 * `isDampedOnlySource` (§8.3 loop-breaker) — true iff this tick's diagnosis for a node is EXCLUSIVELY
 * the damped source. `isBlockedOutput` is checked FIRST (the C5 ⊥ MINOR-2 staleness gate, file header):
 * a row with `isBlockedOutput=false` is NOT currently a live accrual source (either never touched, mid-
 * propagation, or already relieved — `applyRelief`'s own header) — `blockedSources` on such a row may be
 * a STALE leftover from a PREVIOUS tick's different diagnosis, so it is never read as authoritative
 * unless the row is CURRENTLY flagged blocked. A currently-blocked node tagged with the damped source
 * PLUS any other tag (mixed) is NOT damped-only — the exclusion applies only to the single-tag case.
 */
export function isDampedOnlySource(isBlockedOutput: boolean, blockedSources: readonly string[]): boolean {
  return isBlockedOutput && blockedSources.length === 1 && blockedSources[0] === DAMPED_SOURCE;
}

/**
 * `backpressureFeedMultiplier` (§8.2, amortized) — the feed term to ADD to `(1 + …)` in the D5 accrual
 * formula: `feedCoefficient` when the leg's DESTINATION node is in the `critical` bucket AND its
 * diagnosis is not damped-only (§8.3); `0` otherwise (non-critical bucket, OR critical-but-damped-only).
 * `destinationBucket`/`isBlockedOutput`/`blockedSources` are the caller's ALREADY-resolved reads of the
 * destination's `supply_node_pressure` row (or the zero-state defaults for a building never touched by
 * backpressure — index 0, not blocked, no sources — `SupplyNodePressureRepository.findOne`'s own "a
 * missing row is a valid silent answer" convention, C6).
 */
export function backpressureFeedMultiplier(
  destinationBucket: BackpressureBucket,
  isBlockedOutput: boolean,
  blockedSources: readonly string[],
  feedCoefficient: number,
): number {
  if (destinationBucket !== 'critical') return 0;
  if (isDampedOnlySource(isBlockedOutput, blockedSources)) return 0;
  return feedCoefficient;
}

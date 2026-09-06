// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 ("deviation_score PURE
//             function (direct-importable)" — the E2E precompute floor: "generation output = the
//             PRECOMPUTED expected item set (direct-import of production enumeration + scorer)")
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 (per-generator
//             deviation score sketches) + §1 D5 (deterministic score vs tenure-modulated threshold).
//             Pattern: `tenure-inertia.ts`'s own header — "PURE composite module — deterministic, NO
//             DB/I/O/RNG/Date.now... directly unit-testable... imports NOTHING NestJS-decorated". THE
//             SAME discipline applies here for a DIFFERENT, concrete reason (not just testability in the
//             abstract): a Playwright spec importing one of these functions transitively pulls in every
//             top-level statement of the file it lives in — and esbuild (Playwright's TS transform)
//             CANNOT parse a file containing a NestJS parameter-decorated constructor (`@Inject(DB)
//             ...`), throwing "Decorators cannot be used to decorate parameters" even for an UNRELATED
//             named export. Each generator's `@Injectable()` class (in its own `*.generator.ts` file)
//             therefore IMPORTS its scorer FROM here — never the reverse — so `flag_generators.spec.ts`
//             can import this ONE decorator-free file directly.
//             — P3-B C3 — 2026-07-11
//
// The 5 v1 deviation-score functions (design §5), each a PURE function of persisted-state inputs +
// getter-sourced thresholds (never reads a getter itself — every threshold is a PARAMETER, the SAME
// "thresholds passed in" discipline `tenure-inertia.ts#bucketForStreak` establishes) — deterministic, no
// RNG, no clock, no DB. Every generator's own value-sensitivity E2E proof calls these DIRECTLY to
// precompute the expected score before comparing against the persisted `deviation_score_internal`.

import type { routeState as routeStateEnum, dealerState as dealerStateEnum } from '../../../db/schema/operational_chain';
import type { priceTrend as priceTrendEnum } from '../../../db/schema/precursor_market_state';

export type RouteStateEnumTs = (typeof routeStateEnum.enumValues)[number];
export type PriceTrendEnumTs = (typeof priceTrendEnum.enumValues)[number];
export type DealerStateEnumTs = (typeof dealerStateEnum.enumValues)[number];

/** Clamp a raw float to [0, 1] (mirrors `progression/loop10/hl-card-types.ts#clamp01` — copied here
 *  rather than imported so this module's OWN import graph never has to be re-verified decorator-free as
 *  that file changes; a one-line pure helper, zero drift risk). */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * COURIER_SCHEDULING (design §5). `routeState` DEGRADED (`saturated`|`severed`) → 0.9 (high — canon
 * "route degraded"); else `sinuosityIndex` at/above the EXISTING `sinuosityMeanderingMax` cut (the
 * 'gnarled' bucket boundary, `distribution-tunables.ts` REUSE — never re-derived) → 0.4 (moderate); else
 * the D4 floor 0.1.
 */
export function courierSchedulingDeviationScore(
  routeState: RouteStateEnumTs,
  sinuosityIndex: number,
  sinuosityMeanderingMax: number,
): number {
  if (routeState === 'saturated' || routeState === 'severed') return 0.9;
  if (sinuosityIndex >= sinuosityMeanderingMax) return 0.4;
  return 0.1;
}

/**
 * PRECURSOR_ORDER (design §5). `scarcityActive` → 0.9 (high); `priceTrend === 'UP'` → 0.5 (moderate,
 * price-spike proxy); else the D4 floor 0.1. Combined via `Math.max` (never double-counted additively).
 */
export function precursorOrderDeviationScore(scarcityActive: boolean, priceTrend: PriceTrendEnumTs): number {
  let score = 0.1;
  if (priceTrend === 'UP') score = Math.max(score, 0.5);
  if (scarcityActive) score = Math.max(score, 0.9);
  return score;
}

/**
 * FRONT_SHOP_RECONCILIATION (design §5). `bufferLoad` ([0,1], the injection-utilization signal) feeds
 * the score DIRECTLY; `auditPinActive` (the unconformity signal) → 0.9 (high), overriding a lower buffer
 * reading. Floor 0.1 (D4).
 */
export function frontShopReconciliationDeviationScore(auditPinActive: boolean, bufferLoad: number): number {
  let score = Math.max(0.1, bufferLoad);
  if (auditPinActive) score = Math.max(score, 0.9);
  return score;
}

/**
 * STASH_REORDER (design §5). `fillRatio = quantityGrams / fillPointGrams` (the getter-sourced tunable,
 * PASSED IN) feeds the fill elevation, clamped [0,1]; `heat` ([0,1]) feeds the heat-elevation signal;
 * combined via `Math.max`. Floor 0.1 (D4).
 */
export function stashReorderDeviationScore(quantityGrams: number, fillPointGrams: number, heat: number): number {
  const fillRatio = fillPointGrams > 0 ? quantityGrams / fillPointGrams : 0;
  let score = Math.max(0.1, clamp01(fillRatio));
  score = Math.max(score, clamp01(heat));
  return clamp01(score);
}

/**
 * LEK_ROTATION (design §5). `dealerState === 'compromised'` → 0.9 (high, canon-verbatim). Else, when the
 * tile HAS lek-memory history (`lambdaWeight` present): the LOWER the retained inherited weight, the more
 * the position runs on its OWN unbuffered footing (the disclosed "burn elevation" proxy) — `score = 1 -
 * lambdaWeight`, floored at 0.1. No lek-memory row yet → the D4 floor 0.1 (neutral).
 */
export function lekRotationDeviationScore(dealerState: DealerStateEnumTs, lambdaWeight: number | null): number {
  if (dealerState === 'compromised') return 0.9;
  if (lambdaWeight === null) return 0.1;
  return clamp01(Math.max(0.1, 1 - lambdaWeight));
}

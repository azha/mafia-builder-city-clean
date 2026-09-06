// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C4 (D9 basis/cost
//             formula — extracted here, C8, so the §6.1 panel preview and the §6.3(c) real debit share
//             ONE formula, zero drift) + §C8 ("DecommissionCostBucket — qualitatifs STRICTS").
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §6.3(c)
//             (D9: "decommission_cost = basis × demolition_decommission_cost_fraction_of_setup ; basis =
//             setup_cost du type si converti, sinon le prix d'acquisition du purchase") + §4.3 ("Per-node
//             : ... DecommissionCostBucket — qualitatifs STRICTS (aucun float client)").
//             Pattern: `friction-formula.ts` (the PURE, no-DB, getter-backed formula shape, reused
//             verbatim by both the runtime tx and any future reader — this file's own header cites the
//             SAME `evaluateConvergence` "formula lives in ONE place" precedent).
//             — P3-E C4 (basis/cost, extracted C8) — 2026-07-17 / 2026-07-18
//
// `decommissionBasisCents`/`decommissionCostCents` — D9's cost formula, EXTRACTED from
// `decommission.repository.ts#decommissionOwnedNode` (which now calls these, zero duplicated math) so
// the C8 player-facing panel (`GET /v1/friction/nodes/:buildingId`, a PREVIEW — no mutation, no debit) can
// compute the EXACT SAME `decommission_cost` the real tx would charge, without a 2nd copy of the D9
// basis-selection logic. `DecommissionCostBucket`/`decommissionCostBucket` — the NEW C8 qualitative wall
// over that cost (R2.2: the panel NEVER surfaces the raw cents figure, only this 4-value band).
//
// BAND CALIBRATION NOTE (C8, coder-realized — no canon numeric range given for this bucket, mirrors
// `friction-budget-bucket.ts`'s own "SCOPE NOTE" honesty convention for an identical gap): the 3
// cutpoints are chosen against this codebase's OWN REAL cost scale (`conversion-tunables.ts`
// `baseCostMinByCover`/`labCostMultiplier`/`acquisitionCostRatio` defaults) — a purchased-but-unconverted
// non-lab/refinery type's `decommission_cost` floors around $2,500 (weak cover, 0.5 fraction) and a
// converted lab/refinery at strong cover ceilings around $100,000+ — the 3 CAPS-registered cutpoints
// below span that REAL observed range, never an arbitrary/unverified guess.

import type { M1OperationalType, CoverQuality } from '../../operational/real_estate/conversion-tunables';
import { groundedConversionCostCents, acquisitionPriceCents } from '../../operational/real_estate/conversion-tunables';
import { BUILDING_TYPE_ORDER } from '../../operational/real_estate/real-estate.service';

/**
 * D9 basis (design §6.3(c), verbatim): a CONVERTED node's basis is its own type+cover's grounded
 * conversion cost (`groundedConversionCostCents`, the SAME fn `convert()`'s own debit uses); a
 * purchased-but-unconverted node (périmètre §4.1, R17 — `operationalType === null`) uses the
 * ACQUISITION price instead (`acquisitionPriceCents`, the SAME fn `purchase()`'s own debit uses),
 * derived from `buildings.building_type` via the SAME canonical `BUILDING_TYPE_ORDER` index.
 */
export function decommissionBasisCents(
  operationalType: M1OperationalType | null,
  coverQuality: CoverQuality | null,
  buildingTypeIndex: number,
): bigint {
  return operationalType
    ? groundedConversionCostCents(operationalType, coverQuality ?? 'standard')
    : acquisitionPriceCents(BUILDING_TYPE_ORDER[buildingTypeIndex] as M1OperationalType);
}

/** `decommission_cost = basis × costFraction` (design §6.3(c), verbatim) — rounded to whole cents (the
 *  SAME `Math.round` convention `decommissionOwnedNode`'s own debit statement already used). */
export function decommissionCostCents(basisCents: bigint, costFraction: number): bigint {
  return BigInt(Math.round(Number(basisCents) * costFraction));
}

export type DecommissionCostBucket = 'cheap' | 'moderate' | 'expensive' | 'very_expensive';

/**
 * Map a `decommission_cost` (cents) to its `DecommissionCostBucket` (C8, R2.2 — the panel NEVER surfaces
 * the raw cents). 4 bands → 3 cutpoints (the SAME N-1 rule `friction-budget-bucket.ts` already
 * establishes), ALWAYS getter-resolved by the caller (`coreLoopsTunables.demolitionDecommissionCostBucket
 * CheapUpperBoundCents`/`...ModerateUpperBoundCents`/`...ExpensiveUpperBoundCents`, C8) — never inlined
 * here (R2.3).
 */
export function decommissionCostBucket(
  costCents: bigint,
  cheapUpperBoundCents: number,
  moderateUpperBoundCents: number,
  expensiveUpperBoundCents: number,
): DecommissionCostBucket {
  const cost = Number(costCents);
  if (cost < cheapUpperBoundCents) return 'cheap';
  if (cost < moderateUpperBoundCents) return 'moderate';
  if (cost < expensiveUpperBoundCents) return 'expensive';
  return 'very_expensive';
}

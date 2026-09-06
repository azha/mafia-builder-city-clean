// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C5 (`ReplacementOption
//             Scorer` — candidates = 04a types constructibles sur le block libéré, rankés par efficience
//             projetée)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §7 (verbatim:
//             "candidats = types constructibles sur le block libéré, rankés par efficience projetée (output
//             projeté vs friction projetée : la friction d'un node NEUF = base × 1 × (1 + connexions
//             projetées × modifier) — formule §4.2 appliquée à age=0)") + §4.3 ("Per-node : OutputValueBucket,
//             FrictionLoadBucket ... qualitatifs STRICTS" — R2.2, never a raw scalar).
//             Decisions: ★#5 (options optionnelles/expirables — the SCORING itself, not the pick semantics).
//             Pattern: `friction-formula.ts`/`friction-budget-bucket.ts` (PURE, no-DB, getter-backed
//             derivation — no NestJS DI, unit-testable in isolation, reused verbatim by both the runtime
//             tx and the E2E spec to prevent formula drift, the `evaluateConvergence` precedent those files
//             themselves cite).
//             — P3-E C5 — 2026-07-17
//
// `ReplacementOptionScorer` — this file collectively REALIZES the design's named component (the SAME
// "conceptual name → this codebase's own file/function convention" translation C2 already did for the
// design's "FrictionBudgetService", split into `FrictionBudgetRepository`+`FrictionBudgetTickService`).
//
// THE OUTPUT-SIDE GAP (flagged, not silently invented): design §7 fully specifies the FRICTION side of
// "efficience projetée" (§4.2 applied to age=0) but names no formula for the OUTPUT side. A C0-pre-flight
// research pass (this chunk) found ZERO real per-type numeric "output/value" scalar anywhere in canon —
// `building_types.md §Propriétés per-type` states explicitly (line 55): the 3 per-type properties
// (`capacity_bucket`/`heat_baseline_bucket`/`conversion_difficulty_bucket`) "sont des **buckets**
// (high/medium/low/very_low) — jamais des scalaires" (gdd/14 mirrors this, line ~1753: "No code may consume
// these as scalars (R2.2)"). So the ONLY real, grounded, per-type differentiator this codebase's canon
// offers is `capacity_bucket` itself (building_types.md §capacity_bucket, lines 61-74) — a qualitative
// bucket, which is ALREADY R2.2-safe by construction (no float invented, no scalar smuggled). This file
// reuses it VERBATIM as the `OutputValueBucket` proxy for a candidate type's projected output — a
// CODER-REALIZED divergence, following the EXACT precedent `friction-budget-bucket.ts`'s own "SCOPE NOTE"
// already established for this identical gap ("rather than fabricated against data this chunk has no basis
// for, anti-fig-leaf").
//
// WHY RANKING REDUCES TO OUTPUT ALONE: `friction_projected` (the §4.2 formula at age=0) depends ONLY on
// `projected_connection_count` (a property of the freed BLOCK/location, not of the candidate TYPE) — it is
// therefore IDENTICAL across every candidate type at a given decommission. Since
// `efficiency(type) = output(type) / friction_projected` and the denominator is a positive constant shared
// by every candidate, ranking the top-2 by "efficiency" is mathematically EQUIVALENT to ranking the top-2
// by `output(type)` alone (a strictly monotonic transform). This file computes BOTH values (never hides
// the friction side — the design's own formula is not skipped, it's just non-differentiating here) and
// documents the reduction explicitly rather than silently dropping the friction term.

import {
  BUILDING_TYPE_ORDER,
  M1_TYPES,
  GROW_HOUSE_DISTRICT_PROFILES,
  DISTRIBUTION_HUB_DISTRICT_PROFILES,
  MONEY_HOLDING_DISTRICT_PROFILES,
  REFINERY_DISTRICT_PROFILES,
  PRESS_HOUSE_DISTRICT_PROFILES,
  CASH_SAFEHOUSE_FORBIDDEN_DISTRICT,
} from '../../operational/real_estate/real-estate.service';
import type { M1OperationalType } from '../../operational/real_estate/conversion-tunables';
import { frictionLoadForNode } from './friction-formula';
import { frictionLoadBucket, type FrictionLoadBucket } from './friction-budget-bucket';
import type { FrictionFormulaTunables } from './friction-budget.repository';

/**
 * `building_types.md §capacity_bucket` (lines 61-74) — the ONLY real per-type qualitative "output" proxy
 * canon offers (R2.2 bucket, never a scalar). Restricted to the 11 M1 types (this codebase's own
 * `M1_TYPES` — `office` is the 12th catalogue member but is NOT purchasable/convertible anywhere in this
 * codebase, YAGNI, mirrors `conversion-tunables.ts`'s own M1-subset convention). Verbatim, zero invented
 * values.
 */
export type CapacityBucket = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

const CAPACITY_BUCKET_BY_M1_TYPE: Record<M1OperationalType, CapacityBucket> = {
  front_shop: 'medium',        // building_types.md:63 — "Throughput laundering — limité par la baseline légitime."
  cash_safehouse: 'high',      // building_types.md:64 — "Cash slots discrets — capacité principale du réseau cash."
  stash: 'medium',             // building_types.md:65 — "Product storage — capacity croît avec le tier."
  lab: 'medium',               // building_types.md:66 — "Output Brindle par cook event."
  grow_house: 'low',           // building_types.md:67 — "Harvest yield par cycle de croissance."
  refinery: 'medium',          // building_types.md:68 — "Throughput Crick/Hush/Ash."
  press_house: 'medium',       // building_types.md:69 — "Throughput Hush tablet."
  distribution_hub: 'high',    // building_types.md:70 — "Routing capacity couriers — capacité réseau logistique."
  dealer_spot_front: 'low',    // building_types.md:72 — "Volume de deals par lek."
  money_holding: 'very_high',  // building_types.md:73 — "Holding clean cash — type à haute capacité par design."
  specialized_lab: 'low',      // building_types.md:74 — "Output Ash par cook event — volumes très bas."
};

/** `capacityBucketForType` — the SAME `CAPACITY_BUCKET_BY_M1_TYPE` lookup, exported for C8's
 *  `GET /v1/friction/nodes/:buildingId` panel (`output_value_bucket` — the SAME `CapacityBucket` proxy
 *  this file's own header already established, reused for an EXISTING owned node rather than a projected
 *  candidate; zero 2nd copy of the map). */
export function capacityBucketForType(type: M1OperationalType): CapacityBucket {
  return CAPACITY_BUCKET_BY_M1_TYPE[type];
}

/** Ordinal projection of `CapacityBucket` for ranking ONLY — never surfaced to the client (R2.2; the
 *  client only ever sees `CAPACITY_BUCKET_BY_M1_TYPE`'s own qualitative value, never this number). */
const CAPACITY_BUCKET_ORDINAL: Record<CapacityBucket, number> = {
  very_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

/**
 * "Constructible sur le block libéré" (design §7): a type is a genuine replacement candidate ONLY if its
 * FULL path (purchase → convert) can succeed on this block's district. `purchase()` itself does not check
 * district (`real-estate.service.ts#purchase` — M1_TYPES membership only); the SUBSTANTIVE district
 * restriction is enforced at `convert()`. Recommending a type that would 422 at convert() would be a
 * broken/misleading option (not genuinely "constructible") — so this reuses convert()'s OWN gate sets
 * (real-estate.service.ts, exported P3-E C5 additive) rather than a 2nd copy.
 */
function isConstructibleOnDistrict(type: M1OperationalType, districtProfile: string | null): boolean {
  switch (type) {
    case 'grow_house':
      return districtProfile !== null && GROW_HOUSE_DISTRICT_PROFILES.has(districtProfile);
    case 'distribution_hub':
      return districtProfile !== null && DISTRIBUTION_HUB_DISTRICT_PROFILES.has(districtProfile);
    case 'money_holding':
      return districtProfile !== null && MONEY_HOLDING_DISTRICT_PROFILES.has(districtProfile);
    case 'refinery':
      return districtProfile !== null && REFINERY_DISTRICT_PROFILES.has(districtProfile);
    case 'press_house':
      return districtProfile !== null && PRESS_HOUSE_DISTRICT_PROFILES.has(districtProfile);
    case 'cash_safehouse':
      return districtProfile !== CASH_SAFEHOUSE_FORBIDDEN_DISTRICT;
    default:
      // front_shop, stash, lab, dealer_spot_front, specialized_lab — no district restriction anywhere.
      return true;
  }
}

/** One ranked, R2.2-safe replacement candidate — everything needed to persist a `replacement_option` row. */
export interface ScoredReplacementCandidate {
  readonly candidateType: M1OperationalType;
  /** `BUILDING_TYPE_ORDER.indexOf(candidateType)` — the FK-logical index `replacement_option.candidate_
   *  building_type` stores (schema §13.1, the SAME convention `buildings.building_type` uses). */
  readonly candidateTypeIndex: number;
  readonly rank: 1 | 2;
  /** `replacement_option.projected` jsonb — qualitative buckets ONLY (R2.2), never a raw scalar/float.
   *  snake_case keys (this codebase's own wire-body convention, `real-estate.projection.service.ts`'s
   *  `BuildingOperationalProjection` precedent — `setup_state`/`cover_band`/`operational_type`, never
   *  camelCase) — this jsonb blob is surfaced VERBATIM to the GET list response, so its keys ARE the wire
   *  contract, not an internal-only shape. */
  readonly projected: {
    readonly output_value_bucket: CapacityBucket;
    readonly friction_load_bucket: FrictionLoadBucket;
  };
}

/**
 * `scoreReplacementCandidates` — design §7, the full derivation:
 *   1. `frictionProjected` = `frictionLoadForNode(..., ageDays=0, projectedConnectionCount, ...)` — the
 *      §4.2 formula applied to age=0 (verbatim), `projectedConnectionCount` being the freed location's OWN
 *      pre-existing route-topology signal (the caller passes the SAME `neighborBuildingIds.length` the
 *      decommission tx already computed pre-sever, §3.2/§6.3(a) — zero recompute, a natural REUSE of a
 *      value already proven inside the SAME tx, not a fabricated projection).
 *   2. `frictionLoadBucket` (REUSE, `friction-budget-bucket.ts` — zero new bucket logic) against the org's
 *      OWN post-decommission fair share (`frictionThresholdAfterDecommission / frictionOrgSizeAfterDecommission`,
 *      the EXACT numbers `FrictionBudgetRepository.reevaluateAndTransitionLocked` already returned inside
 *      THIS SAME decommission tx, §6.3(f)) — IDENTICAL for every candidate (see file header: ranking
 *      reduces to output alone; this bucket is an honest, non-differentiating signal, not hidden).
 *   3. Candidates = `M1_TYPES` (the REAL 04a purchase-flow catalogue) filtered by district constructibility
 *      (`isConstructibleOnDistrict`, above), ranked DESCENDING by `CAPACITY_BUCKET_ORDINAL` (canon
 *      `capacity_bucket`, the output proxy) — ties broken by `BUILDING_TYPE_ORDER`'s own ascending index
 *      (a deterministic, testable, zero-RNG tie-break; `Array.prototype.sort` is STABLE since ES2019, so
 *      iterating `BUILDING_TYPE_ORDER` in its own declared order before sorting preserves this naturally).
 *   4. Top `maxOptions` (caller clamps to `Math.min(demolitionReplacementOptionsCount, 2)` — the
 *      `replacement_option.rank` CHECK IN (1,2) hard-caps at 2 regardless of the tunable's own wider
 *      1..4 range, C1's own doc-comment on that getter already flags this) become rank 1/2.
 *
 * At least 5 M1 types (front_shop/stash/lab/dealer_spot_front/specialized_lab) are UNRESTRICTED by
 * district — every district profile therefore always yields >= 5 eligible candidates, so `maxOptions`
 * candidates are ALWAYS available (no "not enough candidates" edge case to guard against).
 */
export function scoreReplacementCandidates(params: {
  districtProfile: string | null;
  projectedConnectionCount: number;
  formula: FrictionFormulaTunables;
  frictionThresholdAfterDecommission: number;
  frictionOrgSizeAfterDecommission: number;
  maxOptions: number;
}): ScoredReplacementCandidate[] {
  const {
    districtProfile,
    projectedConnectionCount,
    formula,
    frictionThresholdAfterDecommission,
    frictionOrgSizeAfterDecommission,
    maxOptions,
  } = params;

  // Design §7 formula, verbatim, at age=0 (a brand-new node — "friction d'un node NEUF").
  const frictionProjected = frictionLoadForNode(
    formula.baseFrictionPerNode,
    formula.ageDecayFactorPerTick,
    0,
    projectedConnectionCount,
    formula.perConnectionFrictionModifier,
  );
  const fairShareOfThreshold =
    frictionOrgSizeAfterDecommission > 0 ? frictionThresholdAfterDecommission / frictionOrgSizeAfterDecommission : 0;
  const projectedFrictionLoadBucket = frictionLoadBucket(
    frictionProjected,
    fairShareOfThreshold,
    formula.bucketLightUpperBound,
    formula.bucketBalancedUpperBound,
    formula.bucketStrainedUpperBound,
  );

  const eligible = (BUILDING_TYPE_ORDER as readonly string[]).filter(
    (t): t is M1OperationalType => M1_TYPES.has(t) && isConstructibleOnDistrict(t as M1OperationalType, districtProfile),
  );

  const ranked = eligible
    .map((type) => ({
      type,
      index: BUILDING_TYPE_ORDER.indexOf(type),
      ordinal: CAPACITY_BUCKET_ORDINAL[CAPACITY_BUCKET_BY_M1_TYPE[type]],
    }))
    // DESCENDING ordinal — ties keep BUILDING_TYPE_ORDER's own ascending order (stable sort, ES2019).
    .sort((a, b) => b.ordinal - a.ordinal);

  const capped = Math.max(0, Math.min(maxOptions, 2));
  return ranked.slice(0, capped).map((candidate, i) => ({
    candidateType: candidate.type,
    candidateTypeIndex: candidate.index,
    rank: (i + 1) as 1 | 2,
    projected: {
      output_value_bucket: CAPACITY_BUCKET_BY_M1_TYPE[candidate.type],
      friction_load_bucket: projectedFrictionLoadBucket,
    },
  }));
}

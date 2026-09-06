// IMPLEMENTS: docs/tech/04a_operational_systems/conversion_setup.md §Coûts de conversion + §Durées de setup
//             totales par type × cover_quality + §Maintenance ongoing
//             + docs/tech/04a_operational_systems/real_estate.md §202 (real_estate.acquisition_cost_ratio — the M1
//               acquisition-price grounding) + §District pricing model (the DEFERRED canonical nominal model)
//             + projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — conversion +
//               §Operational chain — real estate (real_estate.acquisition_cost_ratio)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// Conversion & Setup tunables — the `conversion.*` keys this slice's OWN logic CONSUMES (the conversion-cost debit
// + the per-type×cover setup duration that seeds setup_remaining_ticks). This slice surfaces 11 operational types:
// the 5 Phase-2 M1 types (lab / stash / front-shop / cash-safehouse / dealer-spot-front) + refinery (Phase-2b
// vector #2 — Crick) + press_house (Phase-2b vector #2b — Hush) + specialized_lab (Phase-2b vector #2c — Ash) +
// grow_house (Phase-3 vector #3 — cultivation) + distribution_hub (Phase-4 vector #4 — courier hub) + money_holding
// (Phase-5 vector #5a — clean-cash holding), so ONLY those types' tunables are surfaced here (YAGNI — the last type's
// durations land when its gameplay does).
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — conversion` (cited per key, with the
// upstream 04a/conversion_setup.md source line). They are surfaced here as env-overridable fallbacks so this file
// stays a faithful MIRROR of the single source of truth. If the registry values change, update this map in the SAME
// commit (R9.3 propagation: gdd/14 ↔ code). ZERO invented values.
//
// THE CONVERSION-COST RULE (the wallet-affecting step — conversion_setup.md §Coûts de conversion):
//   conversion_cost = base_cost_for_cover_quality × conversion_cost_multiplier_by_type[target_type]
// gdd/14 carries the base cost as a MIN/MAX RANGE per cover quality (base_cost_<cover>_{min,max}). To stay
// DETERMINISTIC and invent NOTHING, we use the RANGE MIN (the exact lower-bound tunable — `base_cost_<cover>_min`).
// The per-type multiplier (`conversion_cost_multiplier_by_type`) is a `composite:`/`see table` in gdd/14 (NOT a
// resolved scalar), EXCEPT for LAB / REFINERY which carry an explicit multiplier (`lab_cost_multiplier=4.0`,
// `refinery_cost_multiplier=4.0`). So:
//   - LAB → base_cost_min × lab_cost_multiplier (both exact tunables).
//   - REFINERY (Phase-2b vector #2 — Crick refinement) → base_cost_min × refinery_cost_multiplier (both exact
//     tunables; same money convention as LAB — an industrial cover building). The full per-type tier model
//     (capacity / heat-baseline / conversion-difficulty buckets) is DEFERRED to vector #3; this slice uses a
//     REFINERY Tier-1 stub conversion grounded on the EXISTING refinery.* conversion tunables (NOT fabricated).
//   - SPECIALIZED_LAB (Phase-2b vector #2c — Ash boutique lab) → REUSES the LAB grounding (base_cost_min ×
//     lab_cost_multiplier + the lab_total_days_* setup durations): gdd/14 carries NO dedicated
//     `conversion.specialized_lab_*` key (T0 added the lab-TIER / purity / appointment tunables, not a conversion
//     duration), so a specialized_lab — a specialized LAB variant — is grounded on the EXISTING lab.* conversion
//     tunables (the closest canonical building, NOT a fabricated value; a dedicated `specialized_lab_*` conversion
//     tunable is DEFERRED `[PROV]`). This invents NO new scalar.
//   - the other M1 types (stash / front-shop / cash-safehouse / dealer-spot-front / press_house) → base_cost_min × 1.0
//     (no per-type multiplier tunable exists for them — gdd/14 carries no resolved `press_house_cost_multiplier`, only
//     a DEFERRED `conversion_difficulty_bucket` composite; the composite is unresolved → multiplier 1.0 = "the base
//     cost IS the cost", which invents nothing — it does NOT fabricate a per-type scalar).
// Costs are in `$` (dollars); economy_states.cash_cents is in CENTS, so the debit multiplies by 100 (CENTS_PER_DOLLAR
// — a unit conversion, not a balance value).

import { TunablesStore } from '../../config/tunables-store';

/**
 * The operational types this slice's conversion supports — the 5 Phase-2 M1 types + `refinery` (Phase-2b vector #2,
 * the Crick refinement building, Tier-1 stub) + `press_house` (Phase-2b vector #2b, the Hush tablet-press building,
 * Tier-1 stub) + `specialized_lab` (Phase-2b vector #2c, the Ash boutique lab, Tier-1 stub — grounded on the lab.*
 * conversion tunables) + `grow_house` (Phase-3 vector #3, the in-house cultivation building — grounded on the
 * front_shop.* residential-cover tunables) + `distribution_hub` (Phase-4 vector #4, the courier dispatch hub —
 * grounded on its OWN dedicated conversion.distribution_hub_* durations) + `money_holding` (Phase-5 vector #5a, the
 * clean-cash holding building — grounded on its OWN dedicated conversion.money_holding_* durations). A subset of the
 * 12-member building_operational_type enum (YAGNI — the other types' conversion lands when their gameplay does).
 */
export type M1OperationalType =
  | 'lab'
  | 'stash'
  | 'front_shop'
  | 'cash_safehouse'
  | 'dealer_spot_front'
  | 'refinery'
  | 'press_house'
  | 'specialized_lab'
  | 'grow_house'
  | 'distribution_hub'
  | 'money_holding';

/** The cover-quality domain (the cover_quality pg enum — conversion_setup.md §27). */
export type CoverQuality = 'weak' | 'standard' | 'strong';

/**
 * Resolved Conversion & Setup tunables. The consumed keys are REUSE from gdd/14 §Operational chain — conversion
 * (base costs + the LAB cost multiplier → the debit; the per-type×cover total-days → the setup duration; the
 * maintenance interval → the OPERATIONAL maintenance seed). ZERO genuinely-NEW tunables (R2.3).
 * DB-override > env > default (Phase-23).
 */
export const conversionTunables = {
  /**
   * conversion.base_cost_<cover>_min — the RANGE-MIN base conversion cost ($) per cover quality (deterministic).
   * gdd/14 (04a:129–131). (DB-override > env > default — Phase-23).
   */
  baseCostMinByCover: {
    get weak(): number { return TunablesStore.resolveInt('conversion.base_cost_weak_min', 'CONVERSION_BASE_COST_WEAK_MIN', 5000); },
    get standard(): number { return TunablesStore.resolveInt('conversion.base_cost_standard_min', 'CONVERSION_BASE_COST_STANDARD_MIN', 15000); },
    get strong(): number { return TunablesStore.resolveInt('conversion.base_cost_strong_min', 'CONVERSION_BASE_COST_STRONG_MIN', 50000); },
  } as Record<CoverQuality, number>,
  /**
   * conversion.lab_cost_multiplier — the resolved LAB cost multiplier vs base (the only M1 type with an explicit one).
   * gdd/14 (04a:133). Range 3.0..6.0. (DB-override > env > default — Phase-23).
   */
  get labCostMultiplier(): number {
    return TunablesStore.resolveFloat('conversion.lab_cost_multiplier', 'CONVERSION_LAB_COST_MULTIPLIER', 4.0);
  },
  /**
   * conversion.refinery_cost_multiplier — the resolved REFINERY multiplier (not M1; mirrored for completeness).
   * gdd/14 (04a:133). Range 3.0..6.0. (DB-override > env > default — Phase-23).
   */
  get refineryCostMultiplier(): number {
    return TunablesStore.resolveFloat('conversion.refinery_cost_multiplier', 'CONVERSION_REFINERY_COST_MULTIPLIER', 4.0);
  },
  /** conversion.<type>_total_days_<cover> — the total setup duration (game-days) per M1 type × cover.
   *  (DB-override > env > default — Phase-23). */
  totalDaysByTypeCover: {
    lab: {
      get weak(): number { return TunablesStore.resolveInt('conversion.lab_total_days_weak', 'CONVERSION_LAB_TOTAL_DAYS_WEAK', 5); },
      get standard(): number { return TunablesStore.resolveInt('conversion.lab_total_days_standard', 'CONVERSION_LAB_TOTAL_DAYS_STANDARD', 10); },
      get strong(): number { return TunablesStore.resolveInt('conversion.lab_total_days_strong', 'CONVERSION_LAB_TOTAL_DAYS_STRONG', 21); },
    },
    stash: {
      get weak(): number { return TunablesStore.resolveInt('conversion.stash_total_days_weak', 'CONVERSION_STASH_TOTAL_DAYS_WEAK', 1); },
      get standard(): number { return TunablesStore.resolveInt('conversion.stash_total_days_standard', 'CONVERSION_STASH_TOTAL_DAYS_STANDARD', 2); },
      get strong(): number { return TunablesStore.resolveInt('conversion.stash_total_days_strong', 'CONVERSION_STASH_TOTAL_DAYS_STRONG', 4); },
    },
    front_shop: {
      get weak(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_weak', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_WEAK', 3); },
      get standard(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_standard', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_STANDARD', 7); },
      get strong(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_strong', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_STRONG', 14); },
    },
    cash_safehouse: {
      get weak(): number { return TunablesStore.resolveInt('conversion.cash_safehouse_total_days_weak', 'CONVERSION_CASH_SAFEHOUSE_TOTAL_DAYS_WEAK', 1); },
      get standard(): number { return TunablesStore.resolveInt('conversion.cash_safehouse_total_days_standard', 'CONVERSION_CASH_SAFEHOUSE_TOTAL_DAYS_STANDARD', 3); },
      get strong(): number { return TunablesStore.resolveInt('conversion.cash_safehouse_total_days_strong', 'CONVERSION_CASH_SAFEHOUSE_TOTAL_DAYS_STRONG', 5); },
    },
    dealer_spot_front: {
      get weak(): number { return TunablesStore.resolveInt('conversion.dealer_spot_total_days_weak', 'CONVERSION_DEALER_SPOT_TOTAL_DAYS_WEAK', 2); },
      get standard(): number { return TunablesStore.resolveInt('conversion.dealer_spot_total_days_standard', 'CONVERSION_DEALER_SPOT_TOTAL_DAYS_STANDARD', 4); },
      get strong(): number { return TunablesStore.resolveInt('conversion.dealer_spot_total_days_strong', 'CONVERSION_DEALER_SPOT_TOTAL_DAYS_STRONG', 8); },
    },
    refinery: {
      // Phase-2b vector #2 (Crick refinement) — REUSE the EXISTING refinery.* conversion tunables (NOT a fabricated
      // duration). gdd/14 (04a:110).
      get weak(): number { return TunablesStore.resolveInt('conversion.refinery_total_days_weak', 'CONVERSION_REFINERY_TOTAL_DAYS_WEAK', 7); },
      get standard(): number { return TunablesStore.resolveInt('conversion.refinery_total_days_standard', 'CONVERSION_REFINERY_TOTAL_DAYS_STANDARD', 14); },
      get strong(): number { return TunablesStore.resolveInt('conversion.refinery_total_days_strong', 'CONVERSION_REFINERY_TOTAL_DAYS_STRONG', 28); },
    },
    press_house: {
      // Phase-2b vector #2b (Hush tablet press) — REUSE the EXISTING press_house.* conversion tunables (canonical,
      // NOT a fabricated duration). gdd/14:3109–3111 (04a:111).
      get weak(): number { return TunablesStore.resolveInt('conversion.press_house_total_days_weak', 'CONVERSION_PRESS_HOUSE_TOTAL_DAYS_WEAK', 4); },
      get standard(): number { return TunablesStore.resolveInt('conversion.press_house_total_days_standard', 'CONVERSION_PRESS_HOUSE_TOTAL_DAYS_STANDARD', 8); },
      get strong(): number { return TunablesStore.resolveInt('conversion.press_house_total_days_strong', 'CONVERSION_PRESS_HOUSE_TOTAL_DAYS_STRONG', 16); },
    },
    // SPECIALIZED_LAB (Phase-2b vector #2c — Ash) REUSES the lab.* setup durations + lab env vars: gdd/14 carries NO
    // dedicated conversion.specialized_lab_total_days_* (a specialized lab is a LAB variant — the closest canonical
    // building); a dedicated specialized_lab conversion tunable is DEFERRED `[PROV]`. Invents NO new scalar.
    specialized_lab: {
      get weak(): number { return TunablesStore.resolveInt('conversion.lab_total_days_weak', 'CONVERSION_LAB_TOTAL_DAYS_WEAK', 5); },
      get standard(): number { return TunablesStore.resolveInt('conversion.lab_total_days_standard', 'CONVERSION_LAB_TOTAL_DAYS_STANDARD', 10); },
      get strong(): number { return TunablesStore.resolveInt('conversion.lab_total_days_strong', 'CONVERSION_LAB_TOTAL_DAYS_STRONG', 21); },
    },
    // GROW_HOUSE (Phase-3 vector #3 — in-house cultivation) REUSES the front_shop.* setup durations + front_shop env
    // vars: a grow_house is RESIDENTIAL-cover (no dedicated conversion.grow_house_total_days_* in gdd/14). See
    // costMultiplierFor (1.0, no per-type multiplier tunable). Invents NO new scalar (`[PROV]` — dedicated tunable
    // DEFERRED, same precedent as specialized_lab→lab).
    grow_house: {
      get weak(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_weak', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_WEAK', 3); },
      get standard(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_standard', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_STANDARD', 7); },
      get strong(): number { return TunablesStore.resolveInt('conversion.front_shop_total_days_strong', 'CONVERSION_FRONT_SHOP_TOTAL_DAYS_STRONG', 14); },
    },
    // DISTRIBUTION_HUB (Phase-4 vector #4 — courier dispatch hub) wires its OWN dedicated conversion.distribution_hub_*
    // durations + dedicated env vars (canonical, NOT a sibling-borrowed value). gdd/14:3090–3092 (04a:112).
    distribution_hub: {
      get weak(): number { return TunablesStore.resolveInt('conversion.distribution_hub_total_days_weak', 'CONVERSION_DISTRIBUTION_HUB_TOTAL_DAYS_WEAK', 3); },
      get standard(): number { return TunablesStore.resolveInt('conversion.distribution_hub_total_days_standard', 'CONVERSION_DISTRIBUTION_HUB_TOTAL_DAYS_STANDARD', 6); },
      get strong(): number { return TunablesStore.resolveInt('conversion.distribution_hub_total_days_strong', 'CONVERSION_DISTRIBUTION_HUB_TOTAL_DAYS_STRONG', 12); },
    },
    // MONEY_HOLDING (Phase-5 vector #5a — clean-cash holding) wires its OWN dedicated conversion.money_holding_*
    // durations + dedicated env vars (canonical, NOT a sibling-borrowed value). gdd/14:3106–3108 (04a:115).
    money_holding: {
      get weak(): number { return TunablesStore.resolveInt('conversion.money_holding_total_days_weak', 'CONVERSION_MONEY_HOLDING_TOTAL_DAYS_WEAK', 14); },
      get standard(): number { return TunablesStore.resolveInt('conversion.money_holding_total_days_standard', 'CONVERSION_MONEY_HOLDING_TOTAL_DAYS_STANDARD', 28); },
      get strong(): number { return TunablesStore.resolveInt('conversion.money_holding_total_days_strong', 'CONVERSION_MONEY_HOLDING_TOTAL_DAYS_STRONG', 60); },
    },
  } as Record<M1OperationalType, Record<CoverQuality, number>>,
  /**
   * conversion.initial_maintenance_interval_days — maintenance_due_in_days seeded at OPERATIONAL (game-days).
   * gdd/14 (04a:150). Range 7..90. (DB-override > env > default — Phase-23).
   */
  get initialMaintenanceIntervalDays(): number {
    return TunablesStore.resolveInt('conversion.initial_maintenance_interval_days', 'CONVERSION_INITIAL_MAINTENANCE_INTERVAL_DAYS', 30);
  },
  /**
   * real_estate.acquisition_cost_ratio — the M1 acquisition price as a RATIO of the STANDARD-cover reference
   * conversion cost (the only genuinely-NEW tunable of T1; `[PROV-Y26Q2]`). Range 0..2. The canonical district-based
   * nominal pricing (base $/sqm × building_size_sqm × district multiplier — real_estate.md §District pricing) is
   * DEFERRED; the district multiplier is NOT applied in this ratio model.
   * (DB-override > env > default — Phase-23).
   */
  get acquisitionCostRatio(): number {
    return TunablesStore.resolveFloat('real_estate.acquisition_cost_ratio', 'REAL_ESTATE_ACQUISITION_COST_RATIO', 0.5);
  },
  /**
   * real_estate.base_price_per_sqm_cents — base price (cents/sqm) for the D1 canonical nominal price formula:
   *   nominal_price_cents = base_price_per_sqm_cents × building_size_sqm × district_multiplier
   * gdd/14 §Operational chain — real estate. Range 5000..50000. NEW. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get basePricePerSqmCents(): number {
    return TunablesStore.resolveInt('real_estate.base_price_per_sqm_cents', 'REAL_ESTATE_BASE_PRICE_PER_SQM_CENTS', 15000);
  },
  /**
   * real_estate.lab_size_sqm — nominal size category INDUSTRIAL-LARGE (sqm).
   * Applied to: lab, specialized_lab, refinery, press_house, distribution_hub (see nominalSizeSqmByType).
   * gdd/14 §Operational chain — real estate. Range 500..5000. NEW. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get labSizeSqm(): number {
    return TunablesStore.resolveInt('real_estate.lab_size_sqm', 'REAL_ESTATE_LAB_SIZE_SQM', 2000);
  },
  /**
   * real_estate.front_size_sqm — nominal size category COMMERCIAL-MEDIUM (sqm).
   * Applied to: front_shop, dealer_spot_front, grow_house (see nominalSizeSqmByType).
   * gdd/14 §Operational chain — real estate. Range 200..3000. NEW. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get frontSizeSqm(): number {
    return TunablesStore.resolveInt('real_estate.front_size_sqm', 'REAL_ESTATE_FRONT_SIZE_SQM', 800);
  },
  /**
   * real_estate.stash_size_sqm — nominal size category STORAGE-SMALL (sqm).
   * Applied to: stash, cash_safehouse, money_holding (see nominalSizeSqmByType).
   * gdd/14 §Operational chain — real estate. Range 100..2000. NEW. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get stashSizeSqm(): number {
    return TunablesStore.resolveInt('real_estate.stash_size_sqm', 'REAL_ESTATE_STASH_SIZE_SQM', 400);
  },
  /**
   * nominalSizeSqmByType — resolves every M1OperationalType to its nominal size (sqm) via the 3 category getters.
   * Mirrors totalDaysByTypeCover's sibling-REUSE idiom: each type maps to the closest canonical category rather than
   * declaring a dedicated per-type tunable (which would require inventing 11 un-grounded values at D1).
   *
   * INDUSTRIAL-LARGE (labSizeSqm = 2000 default):
   *   lab            — primary industrial lab.
   *   specialized_lab — LAB variant (REUSE lab — same precedent as totalDaysByTypeCover.specialized_lab).
   *   refinery       — industrial extraction building (REUSE lab — same precedent as conversion refinery).
   *   press_house    — industrial tablet-press building (REUSE lab — industrial footprint, same phase-2b tier).
   *   distribution_hub — industrial courier dispatch hub (REUSE lab — large operational footprint).
   *
   * COMMERCIAL-MEDIUM (frontSizeSqm = 800 default):
   *   front_shop         — primary commercial-cover front.
   *   dealer_spot_front  — commercial front variant (REUSE front_shop — a dealer-spot IS a commercial front).
   *   grow_house         — residential-cover cultivation building (REUSE front_shop — same precedent as
   *                        totalDaysByTypeCover.grow_house REUSES front_shop durations; medium commercial footprint).
   *
   * STORAGE-SMALL (stashSizeSqm = 400 default):
   *   stash          — primary storage building.
   *   cash_safehouse — cash storage safehouse (REUSE stash — a safehouse IS a storage building).
   *   money_holding  — clean-cash holding building (REUSE stash — holding = compact storage).
   *
   * gdd/14 §Operational chain — real estate. `[PROV-Y26Q2]`.
   */
  get nominalSizeSqmByType(): Record<M1OperationalType, number> {
    // Cache through a getter call so each access re-reads the live tunables (same as other getters).
    const labSz = this.labSizeSqm;
    const frontSz = this.frontSizeSqm;
    const stashSz = this.stashSizeSqm;
    return {
      // INDUSTRIAL-LARGE — labSizeSqm
      lab: labSz,
      specialized_lab: labSz,   // LAB variant — REUSE lab (same precedent as totalDaysByTypeCover.specialized_lab→lab)
      refinery: labSz,           // industrial extraction — REUSE lab (same industrial tier as conversion.refinery)
      press_house: labSz,        // industrial tablet-press — REUSE lab (Phase-2b industrial, same footprint tier)
      distribution_hub: labSz,   // industrial courier hub — REUSE lab (large operational footprint)
      // COMMERCIAL-MEDIUM — frontSizeSqm
      front_shop: frontSz,
      dealer_spot_front: frontSz, // commercial front variant — REUSE front_shop (a dealer-spot IS a commercial front)
      grow_house: frontSz,        // residential-cover cultivation — REUSE front_shop (same precedent as totalDaysByTypeCover.grow_house→front_shop)
      // STORAGE-SMALL — stashSizeSqm
      stash: stashSz,
      cash_safehouse: stashSz,   // cash storage safehouse — REUSE stash (a safehouse IS a storage building)
      money_holding: stashSz,    // clean-cash holding — REUSE stash (holding = compact storage)
    } as Record<M1OperationalType, number>;
  },
};

/**
 * THE single grounded conversion-cost function (in CENTS) for a (type, cover) pair — the ONE place the conversion
 * cost math lives, shared by BOTH the convert() debit (actual chosen cover) AND the purchase() acquisition price
 * (forced STANDARD cover — see acquisitionPriceCents). DRY: purchase and convert never duplicate this formula.
 * The grounded rule (conversion_setup.md §Coûts de conversion):
 *   cost($) = base_cost_min[cover] × multiplier[type]   →   cents = cost × 100
 * where multiplier = conversion.lab_cost_multiplier for LAB, conversion.refinery_cost_multiplier for REFINERY
 * (Phase-2b vector #2 — both exact gdd/14 tunables), else 1.0 (no per-type multiplier tunable exists for the other M1
 * types — the composite `conversion_cost_multiplier_by_type` is unresolved, so 1.0 = the base cost IS the cost; this
 * invents NO per-type scalar). DETERMINISTIC (range MIN, fixed multiplier). Returns a bigint (cents) for the
 * economy_states.cash_cents bigint column.
 */
const CENTS_PER_DOLLAR = 100n; // unit conversion (dollars→cents), NOT a balance value.

function costMultiplierFor(operationalType: M1OperationalType): number {
  // SPECIALIZED_LAB (Phase-2b vector #2c — Ash) REUSES the LAB cost multiplier (a specialized lab is a LAB variant —
  // the closest canonical industrial building; gdd/14 carries no dedicated specialized_lab_cost_multiplier, DEFERRED).
  if (operationalType === 'lab' || operationalType === 'specialized_lab') return conversionTunables.labCostMultiplier;
  if (operationalType === 'refinery') return conversionTunables.refineryCostMultiplier;
  // No per-type multiplier tunable for the other M1 types (stash/front_shop/cash_safehouse/dealer_spot_front/
  // press_house/grow_house/distribution_hub/money_holding) → the base cost IS the cost (press_house + distribution_hub
  // + money_holding carry only a DEFERRED conversion_difficulty_bucket composite — distribution_hub's bucket=low,
  // money_holding's bucket=very_high; grow_house is residential-cover, grounded on the base cost × 1.0 — no per-type
  // scalar invented).
  return 1.0;
}

export function groundedConversionCostCents(operationalType: M1OperationalType, cover: CoverQuality): bigint {
  const baseDollars = conversionTunables.baseCostMinByCover[cover];
  const multiplier = costMultiplierFor(operationalType);
  const costDollars = Math.round(baseDollars * multiplier); // round to whole dollars before the cents conversion.
  return BigInt(costDollars) * CENTS_PER_DOLLAR;
}

/**
 * The convert() conversion-cost DEBIT amount in CENTS for a (type, cover) pair (the wallet-affecting step). A thin
 * alias over the shared groundedConversionCostCents — convert() debits the cost at the player's ACTUAL chosen cover.
 */
export function conversionCostCents(operationalType: M1OperationalType, cover: CoverQuality): bigint {
  return groundedConversionCostCents(operationalType, cover);
}

/**
 * The purchase() ACQUISITION-PRICE DEBIT amount in CENTS for an M1 operational type (the wallet-affecting Step-1
 * acquisition). M1 grounding (real_estate.md §202): acquisition price = real_estate.acquisition_cost_ratio × the
 * STANDARD-cover REFERENCE conversion cost (the SAME shared groundedConversionCostCents, forced to 'standard'
 * regardless of the cover the player later picks at convert — a deterministic reference). `[PROV-Y26Q2]`.
 *   acquisition_price_cents = round( acquisition_cost_ratio × groundedConversionCostCents(type, 'standard') )
 * The ratio is applied to the cents amount (the reference cost is already a whole-cents bigint), then ROUNDED to a
 * whole-cents bigint for the economy_states.cash_cents bigint column. The canonical district-based nominal model
 * (base $/sqm × building_size_sqm × district multiplier — real_estate.md §District pricing) is DEFERRED; the district
 * multiplier is NOT applied here. DETERMINISTIC (the reference cost + a fixed ratio, no RNG, no cover dependence).
 */
export function acquisitionPriceCents(operationalType: M1OperationalType): bigint {
  const referenceCostCents = groundedConversionCostCents(operationalType, 'standard');
  const priceCents = Math.round(conversionTunables.acquisitionCostRatio * Number(referenceCostCents));
  return BigInt(priceCents);
}

/**
 * The 6 district profile names (the district_profile pgEnum — schema_world_geography.md §2 / world_geography.ts).
 * English canonical codenames — NOT Spanish. Used as the key type for the district multiplier map.
 */
export type DistrictProfile = 'tidewater' | 'verge' | 'stack' | 'lattice' | 'spine' | 'glass';

/**
 * District price multipliers — the 6 `real_estate.<district>_price_multiplier` tunables.
 * gdd/14 §Operational chain — real estate (lines 1414–1419). REUSE: these are the existing canonical multipliers that
 * were DEFERRED from the M1 ratio model. They are surfaced here as mirror getters (R2.3 — ZERO invented values).
 * (DB-override > env > default — Phase-23).
 */
export const districtPriceMultipliers: Record<DistrictProfile, number> = {
  /**
   * real_estate.tidewater_price_multiplier — Tidewater district multiplier (waterfront, below-nominal).
   * gdd/14 line 1414. Range 0.2..1.5. Default 0.6.
   */
  get tidewater(): number {
    return TunablesStore.resolveFloat('real_estate.tidewater_price_multiplier', 'REAL_ESTATE_TIDEWATER_PRICE_MULTIPLIER', 0.6);
  },
  /**
   * real_estate.verge_price_multiplier — Verge district multiplier (outskirts, lowest-cost).
   * gdd/14 line 1415. Range 0.1..1.0. Default 0.4.
   */
  get verge(): number {
    return TunablesStore.resolveFloat('real_estate.verge_price_multiplier', 'REAL_ESTATE_VERGE_PRICE_MULTIPLIER', 0.4);
  },
  /**
   * real_estate.stack_price_multiplier — Stack district multiplier (dense-urban industrial).
   * gdd/14 line 1416. Range 0.3..1.5. Default 0.7.
   */
  get stack(): number {
    return TunablesStore.resolveFloat('real_estate.stack_price_multiplier', 'REAL_ESTATE_STACK_PRICE_MULTIPLIER', 0.7);
  },
  /**
   * real_estate.lattice_price_multiplier — Lattice district multiplier (mid-ring commercial, nominal reference = 1.0).
   * gdd/14 line 1417. Range 0.5..2.0. Default 1.0.
   */
  get lattice(): number {
    return TunablesStore.resolveFloat('real_estate.lattice_price_multiplier', 'REAL_ESTATE_LATTICE_PRICE_MULTIPLIER', 1.0);
  },
  /**
   * real_estate.spine_price_multiplier — Spine district multiplier (premium residential).
   * gdd/14 line 1418. Range 0.8..3.0. Default 1.4.
   */
  get spine(): number {
    return TunablesStore.resolveFloat('real_estate.spine_price_multiplier', 'REAL_ESTATE_SPINE_PRICE_MULTIPLIER', 1.4);
  },
  /**
   * real_estate.glass_price_multiplier — Glass district multiplier (high-value bank/finance district, highest-cost).
   * gdd/14 line 1419. Range 2.0..6.0. Default 3.5.
   */
  get glass(): number {
    return TunablesStore.resolveFloat('real_estate.glass_price_multiplier', 'REAL_ESTATE_GLASS_PRICE_MULTIPLIER', 3.5);
  },
} as Record<DistrictProfile, number>;

/**
 * The D1 district-based acquisition price (cents) for a given operational type + district profile.
 * Formula (design §2.1, deterministic, R2.3):
 *   acquisition_price_cents = round( base_price_per_sqm_cents × nominalSizeSqmByType[type] × district_price_multiplier[district] )
 * REUSES the C1 `basePricePerSqmCents` + `nominalSizeSqmByType` getters in `conversionTunables`.
 * Returns a bigint (cents) for the economy_states.cash_cents bigint column.
 *
 * GATED: called ONLY when `use_district_pricing=true` in the purchase request. The legacy ratio path
 * (`acquisitionPriceCents`) is the DEFAULT and is kept intact (zero regression).
 */
export function districtAcquisitionPriceCents(operationalType: M1OperationalType, districtProfile: string): bigint {
  const multiplier = districtPriceMultipliers[districtProfile as DistrictProfile] ?? districtPriceMultipliers.lattice;
  const sizeSqm = conversionTunables.nominalSizeSqmByType[operationalType];
  const basePricePerSqm = conversionTunables.basePricePerSqmCents;
  const priceCents = Math.round(basePricePerSqm * sizeSqm * multiplier);
  return BigInt(priceCents);
}

/**
 * TEST-INFRA ONLY (no prod/dev behavior change). The day→minute-tick multiplier the OPERATIONAL day-based durations
 * (conversion setup + precursor lead time) use to convert game-DAYS → MINUTE ticks. By DEFAULT this is the canonical
 * city-sim clock value `clock.in_game_day_length_minutes` (passed in by the caller) — so prod/dev compute the exact
 * same durations they always have. The E2E test stack sets `OPERATIONAL_DAY_LENGTH_MINUTES` to a SMALL value (e.g. 4)
 * so a multi-day setup/lead collapses from thousands of ticks to a handful WITHOUT touching the city-sim clock or any
 * Phase-1 cadence (NIGHTLY/WEEKLY/TWELVE_H boundaries stay at the real 1440-minute day). The override is contained to
 * the operational duration math; nothing in the scheduler or the 11 Phase-1 systems reads this env var. When the env
 * var is UNSET (or blank/NaN) the default `clockInGameDayLengthMinutes` is returned verbatim → default behavior is
 * byte-for-byte unchanged.
 */
export function operationalDayLengthMinutes(clockInGameDayLengthMinutes: number): number {
  const raw = process.env['OPERATIONAL_DAY_LENGTH_MINUTES'];
  if (raw === undefined || raw.trim() === '') return clockInGameDayLengthMinutes;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? clockInGameDayLengthMinutes : parsed;
}

/**
 * The total setup duration in GAME-MINUTE TICKS for a (type, cover) pair — the value `setup_remaining_ticks` is
 * seeded to at convert(). gdd/14 carries the total as game-DAYS; the city-sim MINUTE tick (the cadence
 * ConversionSetupService runs on) is one game-MINUTE wide, so:
 *   ticks = total_days × in_game_day_length_minutes
 * `inGameDayLengthMinutes` is the canonical clock tunable (clock.in_game_day_length_minutes = 1440 = 24×60), READ
 * from the city-sim tunables (NOT hardcoded — the day→tick ratio is the same one the scheduler uses). Deterministic.
 * The caller resolves the multiplier through `operationalDayLengthMinutes()` so the E2E stack can shrink durations
 * test-only without touching the clock.
 */
export function conversionSetupTicks(
  operationalType: M1OperationalType,
  cover: CoverQuality,
  inGameDayLengthMinutes: number,
): number {
  const totalDays = conversionTunables.totalDaysByTypeCover[operationalType][cover];
  return totalDays * inGameDayLengthMinutes;
}

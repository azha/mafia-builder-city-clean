// IMPLEMENTS: docs/tech/04a_operational_systems/real_estate.md §Acquisition (Path A — legitimate purchase) +
//             §District pricing model + docs/tech/04a_operational_systems/conversion_setup.md §Workflow de
//             conversion + §Coûts de conversion + §Durées de setup totales + building_types.md §38 (the 11-member
//             BuildingTypeEnum) + docs/tech/09_data_model/schema_operational_chain.md §2/§3 (R9.3)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// `RealEstateService` (acquisition — Step 1) + `ConversionService` (conversion + setup — Step 2). The two
// player-triggered actions of the M1 real-estate slice. They own the action LOGIC; the repository owns the raw
// reads/writes (the persisted-system service/repository split).
//
// ── Step 1 — ACQUISITION (legitimate purchase, real_estate.md §Acquisition Path A): create a player-owned building
//    on a FREE block. M1 = the legitimate purchase path ONLY (Path B lease / Path C distressed / Path D coercion are
//    DEFERRED — YAGNI).
//
//    ACQUISITION PRICING (M1 — real_estate.md §202, `[PROV-Y26Q2]`). purchase() DEBITS economy_states.cash_cents by a
//    GROUNDED acquisition price = real_estate.acquisition_cost_ratio (NEW tunable, 0.5) × the STANDARD-cover REFERENCE
//    conversion cost for the target type (the SAME shared groundedConversionCostCents the convert() debit uses, forced
//    to 'standard' — a deterministic reference regardless of the cover the player later picks at convert). So
//    acquisition_price_cents = round(acquisition_cost_ratio × base_cost_standard_min × type_multiplier × 100). This
//    GROUNDS the price on real conversion.* tunables × ONE approved ratio (R2.3 — the only new value is the ratio).
//    The canonical district-based NOMINAL model (base $/sqm × building_size_sqm × district profile multiplier —
//    real_estate.md §District pricing) is genuinely UNDER-SPECIFIED: gdd/14 §Operational chain — real estate carries
//    ONLY the RELATIVE district profile multipliers (real_estate.lattice_price_multiplier=1.0, glass=3.5, …) — there
//    is NO nominal $ base and NO building_size_sqm anywhere in gdd/14. That fuller model (and its district multiplier)
//    remains DEFERRED to the real-estate/economy pass; the M1 ratio model does NOT apply a district multiplier. The
//    debit is ATOMIC + guarded (insufficient cash → no debit → 409); the building is created only if the debit
//    succeeds. The conversion cost (Step 2) is a SEPARATE later debit.
//
// ── Step 2 — CONVERSION + SETUP (conversion_setup.md §Workflow): set the operational state in
//    building_operational_state (operational_type, cover_quality, conversion_stage) and DEBIT economy_states by the
//    GROUNDED conversion cost (conversion.base_cost_<cover>_min × multiplier — conversion-tunables.ts). Setup then
//    progresses per MINUTE tick (ConversionSetupService) until conversion_stage='operational'. M1 types: lab, stash,
//    front_shop, cash_safehouse, dealer_spot_front (the 5 vertical-slice operational types).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { SUBSTANCE_CONFIG } from '../substance/substance-config';
import { RealEstateRepository } from './real-estate.repository';
import {
  acquisitionPriceCents,
  districtAcquisitionPriceCents,
  conversionCostCents,
  conversionSetupTicks,
  conversionTunables,
  operationalDayLengthMinutes,
  type CoverQuality,
  type M1OperationalType,
} from './conversion-tunables';

/**
 * The canonical 12-member building_operational_type enum ORDER (building_types.md §38 / the operational_chain.ts
 * pgEnum). buildings.building_type is an integer = the INDEX of the operational type in this list (the
 * schema_city_state.md §2 convention: building_type int = FK-logical index into the building-type enum). We derive
 * the integer from the operational type at purchase so building.building_type stays consistent with the operational
 * type the conversion sets. ORDER MUST match the pgEnum in db/schema/operational_chain.ts (verified T0).
 *
 * EXPORTED (P3-E C4, additive): `DecommissionCostBasis` (core_loops/demolition/) reads this SAME array to
 * reverse buildings.building_type (int) → its M1OperationalType string for a PURCHASED-BUT-UNCONVERTED
 * node's D9 cost basis (`acquisitionPriceCents(type)` — the SAME fn `purchase()` already uses below). No
 * new REUSE of this table exists elsewhere yet; this is the FIRST cross-module read (R9.3 — one source
 * of truth for the enum order, never a second copy).
 */
export const BUILDING_TYPE_ORDER = [
  'front_shop',
  'cash_safehouse',
  'stash',
  'lab',
  'grow_house',
  'refinery',
  'press_house',
  'distribution_hub',
  'office',
  'dealer_spot_front',
  'money_holding',
  'specialized_lab',
] as const;

/**
 * The operational types this slice's conversion/acquisition supports — the 5 Phase-2 M1 types + `refinery` (Phase-2b
 * vector #2, the Crick refinement building, Tier-1 stub) + `press_house` (Phase-2b vector #2b, the Hush tablet-press
 * building, Tier-1 stub) + `specialized_lab` (Phase-2b vector #2c, the Ash boutique lab, Tier-1 stub) + `grow_house`
 * (Phase-3 vector #3, the in-house cultivation building — Spine/Verge district-gated at convert) + `distribution_hub`
 * (Phase-4 vector #4, the courier dispatch hub — Tidewater/Stack district-gated at convert) + `money_holding`
 * (Phase-5 vector #5a, the Stage-4 clean-cash holding building — Glass district-gated at convert, lazy-creates its
 * money_holding row on convert). A subset of the 12 (YAGNI).
 *
 * EXPORTED (P3-E C5, additive): `ReplacementOptionScorer` (core_loops/demolition/) reads this SAME set to
 * enumerate "types constructibles" candidates (design §7) — the ONE source of truth for "which types this
 * codebase's purchase flow actually accepts," never a second hand-copied list.
 */
export const M1_TYPES: ReadonlySet<string> = new Set<M1OperationalType>([
  'lab',
  'stash',
  'front_shop',
  'cash_safehouse',
  'dealer_spot_front',
  'refinery',
  'press_house',
  'specialized_lab',
  'grow_house',
  'distribution_hub',
  'money_holding',
]);

/**
 * The district profiles a `grow_house` may be converted in (Phase-3 vector #3 — GDD canon). building_types.md
 * §grow_house carries the district restriction "Spine / Verge"; the `district_profile` pgEnum (schema_world_geography.md
 * §2 / world_geography.ts) carries those two profiles as the clean lowercase members 'spine' and 'verge'. A grow_house
 * convert on a building OUTSIDE these two profiles is rejected (422). Other operational types are NOT district-gated
 * (their behavior is byte-identical — the gate is scoped to operational_type='grow_house' only). A closed literal set
 * grounded on the REAL district_profile enum members (NOT a fabricated value).
 *
 * EXPORTED (P3-E C5, additive): `ReplacementOptionScorer` reuses this SAME gate to decide whether a
 * `grow_house` is a genuinely "constructible" replacement candidate on a freed block (design §7) — never a
 * 2nd copy of the district restriction.
 */
export const GROW_HOUSE_DISTRICT_PROFILES: ReadonlySet<string> = new Set<string>(['spine', 'verge']);

/**
 * The district profiles a `distribution_hub` may be converted in (Phase-4 vector #4 — GDD canon). building_types.md
 * §distribution_hub carries the district restriction "Tidewater / Stack" (the courier-logistics waterfront + dense
 * stack districts); the `district_profile` pgEnum (schema_world_geography.md §2 / world_geography.ts) carries those two
 * profiles as the clean lowercase members 'tidewater' and 'stack'. A distribution_hub convert on a building OUTSIDE
 * these two profiles is rejected (422). Other operational types are NOT district-gated by this set (their behavior is
 * byte-identical — the gate is scoped to operational_type='distribution_hub' only). A closed literal set grounded on
 * the REAL district_profile enum members (NOT a fabricated value) — the exact sibling of GROW_HOUSE_DISTRICT_PROFILES.
 *
 * EXPORTED (P3-E C5, additive) — see GROW_HOUSE_DISTRICT_PROFILES's own export note.
 */
export const DISTRIBUTION_HUB_DISTRICT_PROFILES: ReadonlySet<string> = new Set<string>(['tidewater', 'stack']);

/**
 * The district profiles a `money_holding` may be converted in (Phase-5 vector #5a — GDD canon). building_types.md
 * §money_holding carries the district restriction "Glass only" (the high-value clean-cash holding building needs the
 * Glass bank-like district); the `district_profile` pgEnum (schema_world_geography.md §2 / world_geography.ts) carries
 * that profile as the clean lowercase member 'glass'. A money_holding convert on a building OUTSIDE this profile is
 * rejected (422). Other operational types are NOT district-gated by this set (their behavior is byte-identical — the
 * gate is scoped to operational_type='money_holding' only). A closed literal set grounded on the REAL district_profile
 * enum member (NOT a fabricated value) — the exact sibling of GROW_HOUSE_/DISTRIBUTION_HUB_DISTRICT_PROFILES.
 *
 * EXPORTED (P3-E C5, additive) — see GROW_HOUSE_DISTRICT_PROFILES's own export note.
 */
export const MONEY_HOLDING_DISTRICT_PROFILES: ReadonlySet<string> = new Set<string>(['glass']);

/**
 * The district profiles a `refinery` may be converted in (lot-4 TD-026 — GDD canon: building_types.md invariant 3 /
 * catalogue §refinery "Stack only"). A refinery (the Crick refinement building, Phase-2b vector #2) is a dense-urban
 * industrial building that only fits the Stack district; the `district_profile` pgEnum carries that profile as the
 * clean lowercase member 'stack'. A refinery convert on a building OUTSIDE Stack is rejected (422). Other types are
 * NOT district-gated by this set. A closed literal set grounded on the REAL district_profile enum member (NOT a
 * fabricated value) — the exact sibling of MONEY_HOLDING_/GROW_HOUSE_/DISTRIBUTION_HUB_DISTRICT_PROFILES.
 * GRANDFATHERING: the gate is convert-path-only; already-converted refineries survive structurally (no retro-sweep).
 *
 * EXPORTED (P3-E C5, additive) — see GROW_HOUSE_DISTRICT_PROFILES's own export note.
 */
export const REFINERY_DISTRICT_PROFILES: ReadonlySet<string> = new Set<string>(['stack']);

/**
 * The district profiles a `press_house` may be converted in (lot-4 TD-026 — GDD canon: building_types.md invariant 3 /
 * catalogue §press_house "Stack"). A press_house (the Hush tablet-press building, Phase-2b vector #2b) shares the same
 * industrial-Stack restriction as the refinery; the `district_profile` pgEnum carries that profile as 'stack'. A
 * press_house convert on a building OUTSIDE Stack is rejected (422). Other types are NOT district-gated by this set.
 * A closed literal set grounded on the REAL district_profile enum member (NOT a fabricated value) — the exact sibling
 * of REFINERY_DISTRICT_PROFILES.
 * GRANDFATHERING: the gate is convert-path-only; already-converted press_houses survive structurally (no retro-sweep).
 *
 * EXPORTED (P3-E C5, additive) — see GROW_HOUSE_DISTRICT_PROFILES's own export note.
 */
export const PRESS_HOUSE_DISTRICT_PROFILES: ReadonlySet<string> = new Set<string>(['stack']);

/**
 * The FORBIDDEN district profile for a `cash_safehouse` conversion (lot-4 TD-026 — GDD canon: building_types.md
 * invariant 3 / catalogue §cash_safehouse "not Glass"). A cash_safehouse (the Phase-2 cash-stash building) must NOT
 * be located in Glass (the bank-like clean-cash district is reserved for money_holding; a cash_safehouse — which
 * holds unclean / in-transit cash — is incompatible with Glass operations). Expressed as a DENY-if-Glass rule rather
 * than an allow-set: ANY district_profile EXCEPT 'glass' is acceptable, so future districts (if added) are silently
 * allowed and ONLY Glass is rejected. A cash_safehouse convert on a Glass building is rejected (422).
 * GRANDFATHERING: the gate is convert-path-only; already-converted cash_safehouses survive structurally (no retro-sweep).
 *
 * EXPORTED (P3-E C5, additive) — see GROW_HOUSE_DISTRICT_PROFILES's own export note.
 */
export const CASH_SAFEHOUSE_FORBIDDEN_DISTRICT: string = 'glass';

/** The cover-quality domain (the cover_quality pg enum — conversion_setup.md §27). */
const COVER_QUALITIES: ReadonlySet<string> = new Set<CoverQuality>(['weak', 'standard', 'strong']);

/**
 * The operational types that are cold-storage-capable BY NATURE at conversion (Phase-2b vector #2 — substances/Crick).
 * Derived from the substance config registry: a building that hosts a cold-chain substance's production (Crick → a
 * refinery) is cold-capable by construction (Crick is produced/refined cold there — production_secondaries.md §Crick).
 * Other types (lab/stash/…) are NOT cold by nature, but a player can opt a building (e.g. a stash) into cold-capable
 * via the explicit conversion flag (cold-capable storage is the player's lever to keep Crick OPTIMAL_COLD). Computed
 * from the registry so it stays consistent if more cold substances/buildings are configured (no hardcoded list).
 */
const COLD_BY_NATURE_TYPES: ReadonlySet<string> = new Set<string>(
  Object.values(SUBSTANCE_CONFIG)
    .filter((d): d is NonNullable<typeof d> => d != null && d.coldChain)
    .map((d) => d.buildingType),
);

/** The integer index of an operational type in the canonical building_operational_type enum order. */
function buildingTypeIndexFor(operationalType: M1OperationalType): number {
  const idx = BUILDING_TYPE_ORDER.indexOf(operationalType);
  // Every M1 type is a member of the 12-member enum, so this is always ≥ 0 (defensive guard for an impossible path).
  return idx >= 0 ? idx : 0;
}

@Injectable()
export class RealEstateService {
  private readonly logger = new Logger(RealEstateService.name);

  constructor(private readonly repo: RealEstateRepository) {}

  /**
   * Step 1 — ACQUISITION (legitimate purchase, real_estate.md §Acquisition Path A). Create a player-owned building
   * (ownership='player', structural_state='operational') on a FREE block. `buildingTypeTarget` is the intended
   * operational type (an M1 type) — it sets buildings.building_type to that type's enum index so the building's type
   * is consistent with the operational conversion to come.
   *
   * ACQUISITION PRICING (M1 — real_estate.md §202, `[PROV-Y26Q2]`): DEBIT economy_states.cash_cents by the GROUNDED
   * acquisition price = real_estate.acquisition_cost_ratio × the STANDARD-cover reference conversion cost for the
   * target type (acquisitionPriceCents — the SAME shared grounded cost fn convert() uses, forced to 'standard'). The
   * debit + the building insert are ATOMIC (one DB transaction) and guarded: an insufficient balance refuses the WHOLE
   * purchase (no debit, no building, the wallet never goes negative). The district-based NOMINAL pricing model is
   * DEFERRED (no district multiplier here — see the file header). The conversion cost (Step 2) is a SEPARATE debit.
   * Returns the new building_id.
   *
   * Validation: a free block = no player-owned building already on that block (and the block must be a real seeded
   * block). A non-free block → CONFLICT; an unknown/non-M1 type → VALIDATION; no wallet → NOT_FOUND; insufficient
   * cash → CONFLICT (409).
   */
  async purchase(
    playerId: string,
    blockId: number,
    buildingTypeTarget: string,
    useDistrictPricing = false,
  ): Promise<{ buildingId: string }> {
    if (!M1_TYPES.has(buildingTypeTarget)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `buildingTypeTarget must be one of the supported operational types (lab|stash|front_shop|cash_safehouse|dealer_spot_front|refinery|press_house|specialized_lab|grow_house|distribution_hub|money_holding), got "${buildingTypeTarget}".`,
      });
    }
    if (!Number.isInteger(blockId) || blockId < 1) {
      // r4/BLOCKING-1 — details.param was missing.
      throw new ApiError('VALIDATION_FAILED', { message: `blockId must be a positive integer (got "${blockId}").`, details: { param: 'block_id' } });
    }

    const free = await this.repo.isBlockFreeForPlayer(playerId, blockId);
    if (!free) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `block ${blockId} is not free for this player (already has a building there, or is not a real block).`,
      });
    }

    const opType = buildingTypeTarget as M1OperationalType;

    // ACQUISITION PRICING (D1 C2 gate — district vs legacy ratio):
    //   - DEFAULT (useDistrictPricing=false): legacy ratio model (acquisition_cost_ratio × STANDARD-cover reference
    //     conversion cost). ZERO regression — byte-identical to M1 behavior.
    //   - GATED (useDistrictPricing=true): D1 district formula:
    //       price = round( base_price_per_sqm_cents × nominalSizeSqmByType[type] × district_multiplier[district] )
    //     The block's district_profile is resolved from blockId → blocks → districts.profile before any debit.
    //     The gate is per-request (the caller passes use_district_pricing=true in the purchase body).
    let priceCents: bigint;
    if (useDistrictPricing) {
      const districtProfile = await this.repo.getBlockDistrictProfile(blockId);
      if (districtProfile === null) {
        // The isBlockFreeForPlayer guard already confirmed the block is real; a null profile here would mean the
        // world-geography seed is missing a district link — surface a clear error rather than silently falling back.
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `block ${blockId} has no district profile (world geography seed incomplete).`,
        });
      }
      priceCents = districtAcquisitionPriceCents(opType, districtProfile);
    } else {
      priceCents = acquisitionPriceCents(opType); // legacy ratio × STANDARD-cover reference conversion cost (grounded).
    }

    const wallet = await this.repo.getWalletCents(playerId);
    if (wallet === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No economy wallet for this player.' });
    }

    const typeIndex = buildingTypeIndexFor(opType);
    const buildingId = await this.repo.debitAndInsertPlayerBuilding(playerId, blockId, typeIndex, priceCents);
    if (buildingId === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the acquisition price.',
      });
    }
    this.logger.log(
      `purchase: player=${playerId} block=${blockId} type=${buildingTypeTarget} ` +
        `districtPricing=${useDistrictPricing} → building=${buildingId}`,
    );
    return { buildingId };
  }
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(private readonly repo: RealEstateRepository) {}

  /**
   * Step 2 — CONVERSION + SETUP (conversion_setup.md §Workflow). Set the operational state on a player-owned building
   * (operational_type, cover_quality, conversion_stage='gutting') and DEBIT economy_states.cash_cents by the GROUNDED
   * conversion cost (conversion.base_cost_<cover>_min × multiplier — see conversionCostCents). Seeds
   * setup_remaining_ticks = the per-type×cover total setup duration in game-minute ticks (total_days ×
   * in_game_day_length_minutes) + maintenance_due_in_days. The debit + the operational-state insert are ATOMIC (one
   * DB transaction): an insufficient balance refuses the WHOLE conversion (the wallet never goes negative).
   *
   * Setup then progresses per MINUTE tick (ConversionSetupService) until conversion_stage='operational'.
   *
   * COLD STORAGE (Phase-2b vector #2 — substances/Crick): the new building_operational_state.cold_storage_capable
   * column is set at conversion. It is TRUE when (a) the target type is cold-capable BY NATURE (a refinery — Crick is
   * refined cold there) OR (b) the caller passes the optional `coldStorageCapable` flag (e.g. a stash opted into
   * cold-capable storage — the player's lever to keep Crick OPTIMAL_COLD). Otherwise FALSE (ordinary storage — the
   * retro-compatible default; Brindle conversions never set it, so Brindle behavior is unchanged).
   *
   * Validation: the building must be the player's OWN building; it must not already have an operational state
   * (1-1 — converting twice is rejected); type ∈ supported types, cover ∈ {weak,standard,strong}; the player must
   * have a wallet with enough cash. Returns { newBalanceCents } (the post-debit wallet — internal, the controller
   * does NOT forward the raw cents to the player; R2.2 the player surface is the projection's qualitative bands).
   */
  async convert(
    playerId: string,
    buildingId: string,
    operationalType: string,
    coverQuality: string,
    coldStorageCapable = false,
  ): Promise<{ newBalanceCents: bigint }> {
    if (!M1_TYPES.has(operationalType)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `operationalType must be one of the supported types (lab|stash|front_shop|cash_safehouse|dealer_spot_front|refinery|press_house|specialized_lab|grow_house|distribution_hub|money_holding), got "${operationalType}".`,
      });
    }
    if (!COVER_QUALITIES.has(coverQuality)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `coverQuality must be weak|standard|strong, got "${coverQuality}".`,
      });
    }

    const owned = await this.repo.getOwnedBuilding(playerId, buildingId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned building for this player.`,
      });
    }
    if (await this.repo.hasOperationalState(buildingId)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} already has an operational state (conversion cannot be restarted in M1).`,
      });
    }

    // GROW_HOUSE DISTRICT GATE (Phase-3 vector #3 — GDD canon: grow_house is buildable ONLY in Spine/Verge districts —
    // building_types.md §grow_house). Scoped to operational_type='grow_house' ONLY — every other operational type's
    // convert path is byte-identical (this branch is skipped for them). Run AFTER the ownership + already-converted
    // guards (so a non-owned building 404s first, never leaking district info) and BEFORE any debit (a rejected
    // grow_house convert in the wrong district makes NO state change). The building's district profile is resolved
    // through buildings → blocks → districts.profile (the Ash Glass-venue join pattern). 422 if not Spine/Verge.
    if (operationalType === 'grow_house') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === null || !GROW_HOUSE_DISTRICT_PROFILES.has(profile)) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a grow_house can only be converted in a Spine or Verge district (GDD canon); building ${buildingId} ` +
            `is in a "${profile ?? 'unknown'}" district.`,
        });
      }
    }

    // DISTRIBUTION_HUB DISTRICT GATE (Phase-4 vector #4 — GDD canon: distribution_hub is buildable ONLY in
    // Tidewater/Stack districts — building_types.md §distribution_hub). The EXACT sibling of the grow_house gate above,
    // scoped to operational_type='distribution_hub' ONLY (every other type's convert path is byte-identical — this
    // branch is skipped for them). Run AFTER the ownership + already-converted guards (so a non-owned building 404s
    // first, never leaking district info) and BEFORE any debit (a rejected distribution_hub convert in the wrong
    // district makes NO state change). The building's district profile is resolved through buildings → blocks →
    // districts.profile (the same join the grow_house gate uses). 422 if not Tidewater/Stack. The fresh hub_tier=1
    // comes from the schema DEFAULT (T0) — no extra code here.
    if (operationalType === 'distribution_hub') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === null || !DISTRIBUTION_HUB_DISTRICT_PROFILES.has(profile)) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a distribution_hub can only be converted in a Tidewater or Stack district (GDD canon); building ` +
            `${buildingId} is in a "${profile ?? 'unknown'}" district.`,
        });
      }
    }

    // MONEY_HOLDING DISTRICT GATE (Phase-5 vector #5a — GDD canon: money_holding is buildable ONLY in Glass districts —
    // building_types.md §money_holding "Glass only"). The EXACT sibling of the grow_house / distribution_hub gates
    // above, scoped to operational_type='money_holding' ONLY (every other type's convert path is byte-identical — this
    // branch is skipped for them). Run AFTER the ownership + already-converted guards (so a non-owned building 404s
    // first, never leaking district info) and BEFORE any debit (a rejected money_holding convert in the wrong district
    // makes NO state change — no debit, no operational row, NO money_holding row). The building's district profile is
    // resolved through buildings → blocks → districts.profile (the same join the sibling gates use). 422 if not Glass.
    if (operationalType === 'money_holding') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === null || !MONEY_HOLDING_DISTRICT_PROFILES.has(profile)) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a money_holding can only be converted in a Glass district (GDD canon); building ${buildingId} is in a ` +
            `"${profile ?? 'unknown'}" district.`,
        });
      }
    }

    // REFINERY DISTRICT GATE (lot-4 TD-026 — GDD canon: building_types.md invariant 3 + catalogue §refinery "Stack
    // only"). The EXACT sibling of the money_holding / grow_house / distribution_hub gates above, scoped to
    // operational_type='refinery' ONLY (every other type's convert path is byte-identical — this branch is skipped).
    // Run AFTER the ownership + already-converted guards and BEFORE any debit (a rejected refinery convert in the
    // wrong district makes NO state change). 422 if not Stack.
    // GRANDFATHERING: convert-path-only (no retro-scan of existing refineries — already-converted buildings are
    // structurally grandfathered; the gate only applies at conversion time, building_types.md invariant 3).
    if (operationalType === 'refinery') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === null || !REFINERY_DISTRICT_PROFILES.has(profile)) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a refinery can only be converted in a Stack district (building_types.md invariant 3 — GDD canon); ` +
            `building ${buildingId} is in a "${profile ?? 'unknown'}" district.`,
        });
      }
    }

    // PRESS_HOUSE DISTRICT GATE (lot-4 TD-026 — GDD canon: building_types.md invariant 3 + catalogue §press_house
    // "Stack"). The EXACT sibling of the refinery gate above, scoped to operational_type='press_house' ONLY.
    // Run AFTER the ownership + already-converted guards and BEFORE any debit. 422 if not Stack.
    // GRANDFATHERING: convert-path-only (no retro-scan — already-converted press_houses are structurally grandfathered).
    if (operationalType === 'press_house') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === null || !PRESS_HOUSE_DISTRICT_PROFILES.has(profile)) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a press_house can only be converted in a Stack district (building_types.md invariant 3 — GDD canon); ` +
            `building ${buildingId} is in a "${profile ?? 'unknown'}" district.`,
        });
      }
    }

    // CASH_SAFEHOUSE DISTRICT GATE (lot-4 TD-026 — GDD canon: building_types.md invariant 3 + catalogue §cash_safehouse
    // "not Glass"). The EXACT sibling of the above gates, scoped to operational_type='cash_safehouse' ONLY. Expressed
    // as a DENY-if-Glass rule (NOT an allow-set) so any future district addition is silently allowed and only Glass is
    // rejected. Run AFTER the ownership + already-converted guards and BEFORE any debit. 422 if Glass.
    // GRANDFATHERING: convert-path-only (no retro-scan — already-converted cash_safehouses are structurally grandfathered,
    // even those that were converted in Glass before this gate existed, building_types.md invariant 3).
    if (operationalType === 'cash_safehouse') {
      const profile = await this.repo.getBuildingDistrictProfile(playerId, buildingId);
      if (profile === CASH_SAFEHOUSE_FORBIDDEN_DISTRICT) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `a cash_safehouse cannot be converted in a Glass district (building_types.md invariant 3 — GDD canon); ` +
            `building ${buildingId} is in a "${profile}" district (Glass is reserved for money_holding vaults).`,
        });
      }
    }

    const opType = operationalType as M1OperationalType;
    const cover = coverQuality as CoverQuality;
    const costCents = conversionCostCents(opType, cover);
    const setupTicks = conversionSetupTicks(
      opType,
      cover,
      operationalDayLengthMinutes(citySimTunables.inGameDayLengthMinutes),
    );

    const wallet = await this.repo.getWalletCents(playerId);
    if (wallet === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No economy wallet for this player.' });
    }

    // Cold-storage capability (Phase-2b vector #2): TRUE if the type is cold-by-nature (a refinery, per the substance
    // registry) OR the caller explicitly opts in (a cold-capable stash). FALSE for ordinary buildings (Brindle path
    // never opts in → cold_storage_capable stays the retro-compatible false → Brindle behavior unchanged).
    const coldCapable = COLD_BY_NATURE_TYPES.has(opType) || coldStorageCapable;

    const result = await this.repo.debitAndCreateOperationalState({
      playerId,
      buildingId,
      operationalType: opType,
      coverQuality: cover,
      costCents,
      setupRemainingTicks: setupTicks,
      maintenanceDueInDays: conversionTunables.initialMaintenanceIntervalDays,
      coldStorageCapable: coldCapable,
      // Phase-5 vector #5a — a money_holding lazy-creates its money_holding row (held_cents=0, tier=1) in the SAME tx
      // as the operational-state insert, so a converted money_holding ALWAYS has its holding row. Other types: false.
      createMoneyHolding: opType === 'money_holding',
    });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the conversion cost.',
      });
    }

    this.logger.log(
      `convert: player=${playerId} building=${buildingId} type=${operationalType} cover=${coverQuality} ` +
        `cold=${coldCapable} → debited (setup ${setupTicks} ticks, stage gutting)`,
    );
    return result;
  }
}

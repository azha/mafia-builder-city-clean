// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Vue d'ensemble des trois substances +
//             §Crick — cold-chain stimulant + §Hush — addiction-loyalty + docs/tech/02_fictional_world/
//             substance_secondary.md §Unlock tiers + docs/tech/04a_operational_systems/building_types.md §refinery
//             (Crick refinement, Tier-1 stub) + §press_house (Hush tablet press, Tier-1 stub) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (substance_type / building_operational_type /
//             precursor_type pgEnum members — R9.3, READ never redefined)
//             -- session:2026-06-05 (Phase 2b vector #2b — Hush — T1) --
//
// `SUBSTANCE_CONFIG` — the per-substance descriptor registry: the SINGLE source the substance-generic services
// (T2 precursor / T3 production / T4 selling / T5 cold-chain) read to drive the chain off `substance_type` instead of
// the Brindle-hardcoded values scattered across the M1 modules. One descriptor per substance ties together its
// precursor, its host building type, its cook clock (stage count × per-stage duration), its per-cook yield, its
// per-batch precursor consumption, its margin multiplier vs Brindle, and whether it requires a cold chain.
//
// VALUES come from `substance-tunables.ts` (a faithful gdd/14 MIRROR — R2.3, no inline numeric literals here). The
// Brindle entry resolves to the EXACT current M1 constants (substance-tunables.ts re-reads the SAME env vars + gdd/14
// defaults production-tunables.ts uses), so encoding Brindle in the registry is BEHAVIOR-PRESERVING — the M1 cook/
// convert/sell numbers are unchanged. The registry now ships ALL FOUR substances: Brindle (M1), Crick (cold-chain,
// vector #2), Hush (addiction, vector #2b) and Ash (luxury-channel, vector #2c) — every substance_type enum member has
// a descriptor (the deferred slots filled as each substance's gameplay landed).

import { substanceTunables } from './substance-tunables';

/**
 * The substance domain — the `substance_type` pgEnum members (schema_operational_chain.md §2:
 * `['brindle','crick','hush','ash']`). READ from 09, never redefined (R9.3). All four members now ship a descriptor
 * (Ash filled the last slot at vector #2c) — SUBSTANCE_CONFIG is still typed as a PARTIAL map (it tolerates a future
 * not-yet-shipped enum member without a type error), but it is currently TOTAL over the four members.
 */
export type SubstanceType = 'brindle' | 'crick' | 'hush' | 'ash';

/**
 * The substances with a SHIPPED descriptor this slice (Brindle = M1, Crick = first secondary, Hush = vector #2b,
 * Ash = vector #2c — the luxury-channel substance).
 */
export type ConfiguredSubstanceType = 'brindle' | 'crick' | 'hush' | 'ash';

/**
 * The precursor domain — the `precursor_type` pgEnum members (schema_operational_chain.md §2:
 * `['pyralin','thalmite','garnet_salt','verdant_root_extract','lull_resin','glass_lily']`; verdant_root_extract added
 * at the Crick vector T0, lull_resin added at the Hush vector #2b T0, glass_lily added at the Ash vector #2c T0).
 * Brindle's primary M1 precursor is `pyralin`; Crick's single precursor is `verdant_root_extract`; Hush's single
 * precursor is `lull_resin` (schema §7.9.1 — provisional name `[PROV-Y26Q2]`); Ash's single precursor is `glass_lily`
 * (schema §7.10.1 — provisional name `[PROV-Y26Q2]`). (Brindle's secondary precursors thalmite/garnet_salt are
 * DEFERRED in the M1 single-precursor model — not surfaced as the descriptor precursor.)
 */
export type PrecursorType =
  | 'pyralin'
  | 'thalmite'
  | 'garnet_salt'
  | 'verdant_root_extract'
  | 'lull_resin'
  | 'glass_lily';

/**
 * The building-operational-type domain — the `building_operational_type` pgEnum members
 * (schema_operational_chain.md §2 / building_types.md §38; 12 members after the Ash vector #2c T0 appended
 * `specialized_lab` via ALTER TYPE ADD VALUE — migration 0022, §7.10.2). Brindle is cooked at a `lab`; Crick is refined
 * at a `refinery`; Hush is pressed at a `press_house`; Ash is cooked at a `specialized_lab` (building_types.md
 * §specialized_lab — the Ash boutique lab, Tier-1 stub). The full per-type tier model (capacity / heat-baseline /
 * conversion-difficulty buckets) is DEFERRED to vector #3 — this slice uses Tier-1 stubs.
 */
export type BuildingOperationalType =
  | 'front_shop'
  | 'cash_safehouse'
  | 'stash'
  | 'lab'
  | 'grow_house'
  | 'refinery'
  | 'press_house'
  | 'distribution_hub'
  | 'office'
  | 'dealer_spot_front'
  | 'money_holding'
  | 'specialized_lab';

/**
 * A per-substance descriptor — the substance-generic parameters the chain reads instead of Brindle-hardcoded values.
 * Every NUMERIC field is sourced from gdd/14 via substance-tunables.ts (R2.3). `coldChain` and `addiction` are
 * categorical substance traits (cold-chain stimulant — production_secondaries.md §Crick; addiction-loyalty —
 * production_secondaries.md §Hush), not numeric balance values.
 */
export interface SubstanceDescriptor {
  /** The precursor this substance consumes (Brindle → pyralin, Crick → verdant_root_extract). */
  precursorType: PrecursorType;
  /** The building type this substance is produced in (Brindle → lab, Crick → refinery). */
  buildingType: BuildingOperationalType;
  /** The number of FUNCTIONAL cook stages (Brindle 4 stage_1→stage_4, Crick 1 single Solvent-Refine). */
  cookStageCount: number;
  /** The per-stage duration in game-minute ticks (Brindle 30, Crick 180 ≈ 6h in-game). */
  stageDurationTicks: number;
  /** The flat per-completed-cook yield in grams (Brindle 200 Tier-1, Crick 200 [PROV-Y26Q2]). */
  yieldGrams: number;
  /** The precursor units consumed per cook batch (Brindle 2 Pyralin, Crick 2 Verdant root extract). */
  precursorUnitsPerBatch: number;
  /** The street-value margin multiplier vs Brindle/gram (Brindle 1× baseline, Crick 3×). */
  marginMultiplierVsBrindle: number;
  /** Whether this substance requires a cold chain to preserve its grams (Brindle false, Crick true). */
  coldChain: boolean;
  /**
   * Whether this substance has the addiction-loyalty trait — sticky NPC demand that ramps a per-spot loyalty bucket
   * and boosts the selling rate (Hush only; production_secondaries.md §Hush). Brindle/Crick false. NOT a numeric
   * balance value — a categorical trait, like `coldChain` (the addiction scores/boost/decay ARE numeric tunables,
   * resolved at T5 from gdd/14 §Operational chain — production `production.hush.addiction_*`).
   */
  addiction: boolean;
  /**
   * Whether this substance moves through the luxury channel — no dealer-spot / lek selling: the substance is SKIPPED
   * from DEALER_SELL and its only sale path is the appointment honor at a Glass-district venue (Ash only;
   * production_secondaries.md §Ash — "luxury-channel logistics"). Brindle/Crick/Hush false. NOT a numeric balance value
   * — a categorical trait, like `coldChain`/`addiction` (the purity/lab-tier/appointment numbers ARE numeric tunables,
   * resolved at their own tasks — gdd/14 `purity.*` / `specialized_lab.*` / `ash.appointment_window_ticks`).
   */
  luxuryChannel: boolean;
  /**
   * The per-refining-pass duration in game-minute ticks ADDED to the total cook when the player chooses N refining passes
   * at startCook (the time↔purity lever — production_secondaries.md §Ash). Total cook = stageDurationTicks × cookStageCount
   * + refiningPasses × this. Present ONLY on substances that support refining passes (Ash today; undefined for
   * Brindle/Crick/Hush — they accept no refining passes, so they have no per-pass duration). gdd/14 `production.ash.
   * refining_pass_duration_ticks`.
   */
  refiningPassDurationTicks?: number;
  /**
   * The cap on refining passes the player may request at startCook (`refiningPasses > this` ⇒ 422). Present ONLY on
   * substances that support refining passes (Ash today; undefined for Brindle/Crick/Hush — they accept ZERO passes, so a
   * non-zero refiningPasses on a non-refining substance is rejected). gdd/14 `production.ash.max_refining_passes`.
   */
  maxRefiningPasses?: number;
}

/**
 * The substance config registry. A PARTIAL map over `SubstanceType` — only the substances that SHIP this slice have a
 * descriptor (Brindle + Crick + Hush + Ash); every `SubstanceType` enum member now ships a descriptor (Ash filled the
 * last deferred slot at vector #2c).
 *
 * BOOT-FROZEN (P23-T8): numeric fields (cookStageCount / stageDurationTicks / yieldGrams / precursorUnitsPerBatch /
 * marginMultiplierVsBrindle) are captured from substanceTunables getters at module-load time. A DB override of these
 * keys will NOT be reflected until the process restarts. This is INTENTIONAL AND STRUCTURALLY REQUIRED:
 *   - ongoing cook rows in production_cooks persist `current_stage` / `stage_started_at_tick` keyed against the
 *     descriptor at cook-start; changing stageDurationTicks / cookStageCount mid-game would silently corrupt or
 *     skip in-flight cook stages (a cook at stage 3 of 4 cannot react to a live stage-count change).
 *   - marginMultiplierVsBrindle feeds the sell-value computation but is also baked into projected-income display;
 *     a live change mid-session would create inconsistency between the projected value and the settled sell event.
 *   - The categorical fields (coldChain / addiction / luxuryChannel / precursorType / buildingType) are structural
 *     substance traits — not numeric tunables — and are naturally boot-stable.
 * Hot-reloading substance parameters requires a rolling deploy + DB migration (ongoing cooks would need a
 * compensating migration). Process-restart is the correct gate for any substance-parameter change.
 *
 * BRINDLE = the CURRENT M1 constants (substanceTunables.brindle mirrors production-tunables.ts via the SAME env vars +
 * gdd/14 defaults): cookStageCount=4, stageDurationTicks=30, yieldGrams=200, precursorUnitsPerBatch=2, margin=1×, no
 * cold-chain, no addiction, no luxury-channel. Encoding Brindle here changes NO Brindle behavior — it is the existing
 * numbers, named.
 *
 * CRICK = the first secondary substance (gdd/14 §Substances + §Operational chain — production): verdant_root_extract
 * precursor, refinery building, 1 stage × 180 ticks, 200 g/cook, 2 units/batch, 3× margin, cold-chain TRUE, no
 * addiction, no luxury-channel.
 *
 * HUSH = the addiction-loyalty substance (gdd/14 §Substances + §Operational chain — production): lull_resin precursor,
 * press_house building, 2 stages × 75 ticks, 200 g/cook, 2 units/batch, 1.5× margin, no cold-chain, addiction TRUE
 * (the distinct Hush trait — sticky NPC demand + selling boost, wired at T5), no luxury-channel. NOT cold-by-nature
 * (coldChain=false), so a press_house is NOT auto-flagged cold-storage-capable at conversion.
 *
 * ASH = the luxury-channel substance (gdd/14 §Substances + §Operational chain — production): glass_lily precursor,
 * specialized_lab building, 3 stages × 3000 ticks, 200 g/cook, 2 units/batch, 20× margin (extreme), no cold-chain, no
 * addiction, luxuryChannel TRUE (the distinct Ash trait — no dealer-spot/lek selling; the Ash sale is the appointment
 * honor at a Glass venue, wired at T7/T8). Ash ALSO ships the REFINING-PASS lever (T3): the player chooses 0..max
 * refining passes at startCook, each adding refiningPassDurationTicks to the total cook (time↔purity; T6 reads the
 * recorded passes for purity) — total cook = 3 × 3000 + refiningPasses × refiningPassDurationTicks, capped at
 * maxRefiningPasses. Brindle/Crick/Hush leave refiningPassDurationTicks/maxRefiningPasses undefined → they accept zero
 * passes (a non-zero refiningPasses on them is rejected). NOT cold-by-nature (coldChain=false), so a specialized_lab is
 * NOT auto-flagged cold-storage-capable at conversion.
 */
export const SUBSTANCE_CONFIG: Partial<Record<SubstanceType, SubstanceDescriptor>> = {
  brindle: {
    precursorType: 'pyralin',
    buildingType: 'lab',
    cookStageCount: substanceTunables.brindle.cookStages,
    stageDurationTicks: substanceTunables.brindle.cookStageDurationTicks,
    yieldGrams: substanceTunables.brindle.yieldGrams,
    precursorUnitsPerBatch: substanceTunables.brindle.precursorUnitsPerBatch,
    marginMultiplierVsBrindle: substanceTunables.brindle.marginMultiplierVsBrindle,
    coldChain: false,
    addiction: false,
    luxuryChannel: false,
  },
  crick: {
    precursorType: 'verdant_root_extract',
    buildingType: 'refinery',
    cookStageCount: substanceTunables.crick.cookStages,
    stageDurationTicks: substanceTunables.crick.cookStageDurationTicks,
    yieldGrams: substanceTunables.crick.yieldGrams,
    precursorUnitsPerBatch: substanceTunables.crick.precursorUnitsPerBatch,
    marginMultiplierVsBrindle: substanceTunables.crick.marginMultiplierVsBrindle,
    coldChain: true,
    addiction: false,
    luxuryChannel: false,
  },
  hush: {
    precursorType: 'lull_resin',
    buildingType: 'press_house',
    cookStageCount: substanceTunables.hush.cookStages,
    stageDurationTicks: substanceTunables.hush.cookStageDurationTicks,
    yieldGrams: substanceTunables.hush.yieldGrams,
    precursorUnitsPerBatch: substanceTunables.hush.precursorUnitsPerBatch,
    marginMultiplierVsBrindle: substanceTunables.hush.marginMultiplierVsBrindle,
    coldChain: false,
    addiction: true,
    luxuryChannel: false,
  },
  ash: {
    precursorType: 'glass_lily',
    buildingType: 'specialized_lab',
    cookStageCount: substanceTunables.ash.cookStages,
    stageDurationTicks: substanceTunables.ash.cookStageDurationTicks,
    yieldGrams: substanceTunables.ash.yieldGrams,
    precursorUnitsPerBatch: substanceTunables.ash.precursorUnitsPerBatch,
    marginMultiplierVsBrindle: substanceTunables.ash.marginMultiplierVsBrindle,
    coldChain: false,
    addiction: false,
    luxuryChannel: true,
    refiningPassDurationTicks: substanceTunables.ash.refiningPassDurationTicks,
    maxRefiningPasses: substanceTunables.ash.maxRefiningPasses,
  },
};

/**
 * Resolve a substance's descriptor, or null when the substance has no shipped descriptor (an unknown / non-enum
 * string today — all four enum members ship a descriptor). Consumers use this to reject invalid substances cleanly.
 */
export function substanceDescriptor(substance: string): SubstanceDescriptor | null {
  return SUBSTANCE_CONFIG[substance as SubstanceType] ?? null;
}

/** Whether a substance has a shipped descriptor (Brindle / Crick / Hush / Ash — all four enum members today). */
export function isConfiguredSubstance(substance: string): substance is ConfiguredSubstanceType {
  return substanceDescriptor(substance) !== null;
}

/**
 * The set of precursor types a CONFIGURED substance consumes — the union of `descriptor.precursorType` over the
 * shipped descriptors (Brindle → pyralin, Crick → verdant_root_extract, Hush → lull_resin, Ash → glass_lily =
 * `{pyralin, verdant_root_extract, lull_resin, glass_lily}` today).
 * DERIVED from the registry, never a hardcoded literal set: the precursor-sourcing consumer (T2) accepts exactly the
 * precursors that some shipped substance actually consumes, so adding a substance descriptor automatically widens the
 * accepted precursor domain. Computed once at module load (the registry is static).
 */
const CONFIGURED_PRECURSOR_TYPES: ReadonlySet<PrecursorType> = new Set<PrecursorType>(
  Object.values(SUBSTANCE_CONFIG)
    .filter((d): d is SubstanceDescriptor => d != null)
    .map((d) => d.precursorType),
);

/**
 * The set of SECONDARY Brindle precursors that are ORDERABLE via the legitimate channel from D1 C3. These are NOT
 * consumed by a standalone substance descriptor (thalmite and garnet_salt are Brindle Stage-2 / Stage-3 inputs; the
 * Brindle descriptor only carries its PRIMARY precursor pyralin — the single-precursor M1 model). They are a CURATED
 * supplementary set, distinct from the registry-derived `CONFIGURED_PRECURSOR_TYPES`, following the same shape as
 * `GROWABLE_PRECURSOR_TYPES` (a closed ReadonlySet for an intrinsic precursor property — here: secondary-Brindle
 * orderable). The gray Thalmite / restricted Garnet salt CHANNELS (distinct markup, broker, MIS flag) are DEFERRED to
 * D1b (TD-029 — the market model): this only widens the LEGITIMATE ORDER path.
 */
const SECONDARY_ORDERABLE_PRECURSOR_TYPES: ReadonlySet<PrecursorType> = new Set<PrecursorType>([
  'thalmite',
  'garnet_salt',
]);

/**
 * Whether a precursor type is consumed by some shipped substance OR is a configured secondary orderable precursor
 * (the registry-derived accepted precursor domain UNION the D1 C3 secondary precursors). `isConfiguredPrecursor` is
 * the gate the order path uses — TRUE for pyralin / verdant_root_extract / lull_resin / glass_lily (primary, from
 * substance descriptors) and ALSO for thalmite / garnet_salt (secondary Brindle inputs, from D1 C3).
 */
export function isConfiguredPrecursor(precursorType: string): precursorType is PrecursorType {
  return (
    CONFIGURED_PRECURSOR_TYPES.has(precursorType as PrecursorType) ||
    SECONDARY_ORDERABLE_PRECURSOR_TYPES.has(precursorType as PrecursorType)
  );
}

/**
 * The PLANT-DERIVED precursors — the precursor types a `grow_house` can CULTIVATE in-house (Phase-3 vector #3 — the
 * grow_house make-vs-buy alternative to ordering). They are the three precursors of plant origin in the precursor_type
 * domain: `verdant_root_extract` (Crick), `lull_resin` (Hush) and `glass_lily` (Ash) — all named for a plant/botanical
 * source (a root extract, a resin, a lily), as opposed to the SYNTHETIC Brindle precursors (`pyralin`, `thalmite`,
 * `garnet_salt` — chemical/mineral names). spec §3: "the plant-derived precursors: verdant_root_extract, lull_resin,
 * glass_lily". A grow_house grows EXISTING precursors (the user picked grow-existing, not a new cultivation-only
 * precursor — spec §11 deferred), so this is a CURATED subset of the precursor_type enum, NOT a registry-derived union:
 * being plant-derived is an intrinsic property of the precursor (its botanical origin), not a property of which
 * substance consumes it. It is a closed, deterministic literal set over the precursor_type members. The SAME shape as
 * LUXURY_SUBSTANCE_TYPES (a ReadonlySet + a type-guard predicate). Computed once at module load (static).
 */
const GROWABLE_PRECURSOR_TYPES: ReadonlySet<PrecursorType> = new Set<PrecursorType>([
  'verdant_root_extract',
  'lull_resin',
  'glass_lily',
]);

/** The list of growable (plant-derived) precursor type strings — the grow_house cultivation domain (T2 plant gate). */
export function growablePrecursorTypes(): PrecursorType[] {
  return [...GROWABLE_PRECURSOR_TYPES];
}

/**
 * Whether a precursor type is GROWABLE in a grow_house — i.e. plant-derived (verdant_root_extract / lull_resin /
 * glass_lily TRUE; the synthetic Brindle precursors pyralin / thalmite / garnet_salt FALSE; an unknown string FALSE).
 * Mirrors the *shape* of `isLuxurySubstance` (a curated set, NOT registry-derived — plant-origin is intrinsic, no
 * per-precursor flag exists). The T2 plant action gates the chosen precursor through this (a non-growable
 * precursor → 422). DETERMINISTIC, no DB.
 */
export function isGrowablePrecursor(precursorType: string): precursorType is PrecursorType {
  return GROWABLE_PRECURSOR_TYPES.has(precursorType as PrecursorType);
}

/**
 * The set of CONFIGURED substances that require a cold chain — the substances whose descriptor has `coldChain=true`
 * (Crick today; Brindle is false → excluded). DERIVED from the registry, never a hardcoded literal set (the SAME
 * derivation pattern as CONFIGURED_PRECURSOR_TYPES): the cold-chain degrade tick (T5) targets exactly the substances
 * the registry flags as cold-chain, so a future cold-chain substance (e.g. a chilled Hush variant) is automatically
 * included when its descriptor lands, and Brindle is NEVER included. Computed once at module load (the registry is
 * static). Used by ColdChainRepository to scope the set-based degrade SQL to cold-chain substance rows only.
 */
const COLD_CHAIN_SUBSTANCE_TYPES: ReadonlySet<ConfiguredSubstanceType> = new Set<ConfiguredSubstanceType>(
  (Object.entries(SUBSTANCE_CONFIG) as [SubstanceType, SubstanceDescriptor | undefined][])
    .filter(([, d]) => d != null && d.coldChain)
    .map(([s]) => s as ConfiguredSubstanceType),
);

/** The list of cold-chain substance type strings (registry-derived — Crick today). For the degrade-tick SQL filter. */
export function coldChainSubstanceTypes(): ConfiguredSubstanceType[] {
  return [...COLD_CHAIN_SUBSTANCE_TYPES];
}

/** Whether a substance requires a cold chain (registry `coldChain` trait — Crick true, Brindle/unconfigured false). */
export function isColdChainSubstance(substance: string): substance is ConfiguredSubstanceType {
  return COLD_CHAIN_SUBSTANCE_TYPES.has(substance as ConfiguredSubstanceType);
}

/**
 * The set of CONFIGURED substances that carry the addiction-loyalty trait — the substances whose descriptor has
 * `addiction=true` (Hush today; Brindle/Crick are false → excluded). DERIVED from the registry, never a hardcoded
 * literal set (the SAME derivation pattern as COLD_CHAIN_SUBSTANCE_TYPES): the selling boost (T5) and the
 * HUSH_ADDICTION decay tick (T5) target exactly the substances the registry flags as addiction, so a future addiction
 * substance is automatically included when its descriptor lands, and Brindle/Crick are NEVER included. Computed once
 * at module load (the registry is static).
 */
const ADDICTION_SUBSTANCE_TYPES: ReadonlySet<ConfiguredSubstanceType> = new Set<ConfiguredSubstanceType>(
  (Object.entries(SUBSTANCE_CONFIG) as [SubstanceType, SubstanceDescriptor | undefined][])
    .filter(([, d]) => d != null && d.addiction)
    .map(([s]) => s as ConfiguredSubstanceType),
);

/** The list of addiction substance type strings (registry-derived — Hush today). For the T5 selling boost + decay tick. */
export function addictionSubstanceTypes(): ConfiguredSubstanceType[] {
  return [...ADDICTION_SUBSTANCE_TYPES];
}

/** Whether a substance carries the addiction-loyalty trait (registry `addiction` trait — Hush true, others false). */
export function isAddictionSubstance(substance: string): substance is ConfiguredSubstanceType {
  return ADDICTION_SUBSTANCE_TYPES.has(substance as ConfiguredSubstanceType);
}

/**
 * The set of CONFIGURED substances that move through the luxury channel — the substances whose descriptor has
 * `luxuryChannel=true` (Ash today; Brindle/Crick/Hush are false → excluded). DERIVED from the registry, never a
 * hardcoded literal set (the SAME derivation pattern as COLD_CHAIN_SUBSTANCE_TYPES / ADDICTION_SUBSTANCE_TYPES): the
 * DEALER_SELL skip (T8) and the appointment honor sale (T7/T8) target exactly the substances the registry flags as
 * luxury-channel, so a future luxury substance is automatically included when its descriptor lands, and
 * Brindle/Crick/Hush are NEVER included. Computed once at module load (the registry is static).
 */
const LUXURY_SUBSTANCE_TYPES: ReadonlySet<ConfiguredSubstanceType> = new Set<ConfiguredSubstanceType>(
  (Object.entries(SUBSTANCE_CONFIG) as [SubstanceType, SubstanceDescriptor | undefined][])
    .filter(([, d]) => d != null && d.luxuryChannel)
    .map(([s]) => s as ConfiguredSubstanceType),
);

/** The list of luxury-channel substance type strings (registry-derived — Ash today). For the T8 DEALER_SELL skip + honor sale. */
export function luxurySubstanceTypes(): ConfiguredSubstanceType[] {
  return [...LUXURY_SUBSTANCE_TYPES];
}

/** Whether a substance moves through the luxury channel (registry `luxuryChannel` trait — Ash true, others false). */
export function isLuxurySubstance(substance: string): substance is ConfiguredSubstanceType {
  return LUXURY_SUBSTANCE_TYPES.has(substance as ConfiguredSubstanceType);
}

/**
 * Resolve the precursor a building's operational TYPE sources — the substance whose `buildingType` matches the
 * building's operational type, then that substance's `precursorType` (a refinery → crick → verdant_root_extract; a
 * lab → brindle → pyralin). Returns null when no shipped substance is produced at that building type (e.g. a generic
 * stash — the caller decides the fallback). Used by the per-building precursor projection so the surfaced precursor
 * stays registry-driven (never hardcoded pyralin).
 */
export function precursorForBuildingType(buildingType: string): PrecursorType | null {
  const descriptor = Object.values(SUBSTANCE_CONFIG).find(
    (d): d is SubstanceDescriptor => d != null && d.buildingType === buildingType,
  );
  return descriptor?.precursorType ?? null;
}

/**
 * Resolve the SUBSTANCE a building's operational TYPE produces — the (unique, this slice) shipped substance whose
 * `buildingType` matches the building's operational type (a lab → brindle, a refinery → crick). Returns null when no
 * shipped substance is produced at that building type. Used by the per-building production/storage projection so the
 * surfaced substance stays registry-driven (never hardcoded brindle). Mirrors `precursorForBuildingType`.
 */
export function substanceForBuildingType(buildingType: string): ConfiguredSubstanceType | null {
  const entry = (Object.entries(SUBSTANCE_CONFIG) as [SubstanceType, SubstanceDescriptor | undefined][]).find(
    ([, d]) => d != null && d.buildingType === buildingType,
  );
  return (entry?.[0] as ConfiguredSubstanceType | undefined) ?? null;
}

/**
 * The DEFAULT substance — Brindle (the M1 substance). DERIVED, not hardcoded: it is the precursor surface a building
 * that hosts NO substance-production type (a generic stash — precursor storage is allowed there, but the type implies
 * no substance) falls back to, preserving the original M1 behavior (a stash storing Pyralin). `brindle` is the
 * canonical M1 default (the vertical-slice substance), so its precursor is the legacy default precursor.
 */
const DEFAULT_SUBSTANCE: SubstanceType = 'brindle';

/**
 * The default precursor — the default (Brindle/M1) substance's precursor (pyralin), read from the registry, NOT a
 * hardcoded literal. The per-building projection uses it for an operational building whose type hosts no shipped
 * substance (a generic stash), so such a building still surfaces a coherent precursor (the legacy M1 behavior).
 */
export function defaultPrecursorType(): PrecursorType {
  return SUBSTANCE_CONFIG[DEFAULT_SUBSTANCE]!.precursorType;
}

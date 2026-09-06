// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §Canal légitime — Pyralin
//             (lead time `precursors.pyralin_lead_time_days_{min,max}` + `precursors.pyralin_base_price_per_unit`
//             = composite:market_nominal — the UNGROUNDED money composite this file grounds) + §Dynamique de prix
//             des précurseurs (price is a P5 composite — never a raw scalar to the client)
//             + projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — precursors (registry)
//             + §Operational chain — conversion (the grounded $15000 anchor — conversion.base_cost_standard_min)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// Precursor (legitimate channel) tunables — the `precursors.*` keys THIS slice's OWN logic CONSUMES: the per-order
// cost debit + the deterministic lead time that seeds precursor_order.arrives_at_tick. The price is grounded PER
// precursor (Pyralin = Brindle's precursor, Verdant root extract = Crick's — Phase-2b vector #2), each via its own
// `precursors.<type>_unit_price_ratio`. The gray Thalmite / restricted Garnet salt channels, their markups, the
// degradation, the price-disruption events, and the anomalous-volume MIS flag are ALL DEFERRED — YAGNI.
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — precursors` (cited per key, with the
// upstream precursors_supply_chain.md source line). They are surfaced as env-overridable fallbacks so this file
// stays a faithful MIRROR of the single source of truth. If the registry values change, update this map in the
// SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE PYRALIN PRICE GROUNDING (the wallet-affecting step — precursors_supply_chain.md §Coût "prix nominal marché
//    `precursors.pyralin_base_price_per_unit`"). gdd/14 carries `precursors.pyralin_base_price_per_unit` as
//    `composite:market_nominal` — an UNGROUNDED composite (no scalar; the canonical price is the fluctuating
//    citywide-demand × supplier-reputation market state, §Dynamique de prix, which is a P5 composite by design and
//    is DEFERRED to the 04c market pass). To debit a concrete cents amount WITHOUT inventing a fresh absolute, the
//    M1 price is grounded as a RATIO of an ALREADY-GROUNDED anchor (the T1 convention): the unit price = the new
//    tunable `precursors.pyralin_unit_price_ratio` × the STANDARD-cover reference conversion cost
//    `conversion.base_cost_standard_min` ($15000 — the SAME single concrete $ anchor the operational chain uses).
//    Concretely (deterministic, no RNG, no cover dependence):
//      unit_price_cents = round(pyralin_unit_price_ratio × conversion.base_cost_standard_min × 100)
//      order_cost_cents = qty × unit_price_cents
//    The ratio default (0.01 → $150/unit anchored to $15000) makes a typical Pyralin order a SMALL fraction of a
//    building/conversion (raw material « capital): 10 units = $1500 « the $7500 reference conversion. The full
//    fluctuating `market_state` price model (§Dynamique de prix — UP/STABLE/DOWN trend, scarcity disruptions,
//    supplier-reputation pressure) is DEFERRED; the M1 model applies NO market multiplier. `precursors.pyralin_
//    unit_price_ratio` is the ONLY genuinely-NEW tunable of T2 (R2.3). `[PROV-Y26Q2]`.
//
// ── THE LEAD TIME (grounded — precursors_supply_chain.md §Canal légitime "Lead time
//    `precursors.pyralin_lead_time_days_min`–`precursors.pyralin_lead_time_days_max` game-days"). gdd/14 carries
//    min=2 / max=4 (game-days). M1 is DETERMINISTIC (no RNG), so the lead time is the RANGE MIN (the exact
//    lower-bound tunable — `precursors.pyralin_lead_time_days_min` = 2 game-days). The order arrives after
//    lead_time_days × in_game_day_length_minutes MINUTE-ticks (the day→tick conversion is the canonical clock
//    tunable clock.in_game_day_length_minutes=1440, READ from the city-sim tunables — the SAME ratio T1's setup
//    duration uses, NOT hardcoded). 2 × 1440 = 2880 minute-ticks.

import { TunablesStore } from '../../config/tunables-store';

/**
 * The precursor types this slice's sourcing accepts — the registry-derived domain (Brindle → pyralin, Crick →
 * verdant_root_extract, Hush → lull_resin, Ash → glass_lily) PLUS the Brindle secondary precursors (thalmite /
 * garnet_salt) enabled from D1 C3. `M1PrecursorType` is the type alias the repository / projection / price functions
 * consume. The gray-market Thalmite / restricted Garnet salt CHANNELS (distinct markup, anomalous-volume MIS flag,
 * broker path) remain DEFERRED to D1b (TD-029 — the market model) — only the LEGITIMATE ORDER path is widened here.
 */
export type M1PrecursorType = 'pyralin' | 'verdant_root_extract' | 'lull_resin' | 'glass_lily' | 'thalmite' | 'garnet_salt';

/**
 * Resolved precursor tunables. The consumed keys are REUSE from gdd/14 §Operational chain — precursors (the
 * Pyralin lead time → arrives_at_tick) + §Operational chain — conversion (the $15000 anchor → the price ratio).
 * The ONLY genuinely-NEW tunable is `precursors.pyralin_unit_price_ratio` (R2.3).
 * DB-override > env > default (Phase-23).
 */
export const precursorTunables = {
  /**
   * precursors.pyralin_lead_time_days_min — the RANGE-MIN Pyralin lead time (game-days; deterministic, M1).
   * gdd/14 (04a/precursors_supply_chain.md:45). Range 1..5. (DB-override > env > default — Phase-23).
   */
  get pyralinLeadTimeDaysMin(): number {
    return TunablesStore.resolveInt('precursors.pyralin_lead_time_days_min', 'PRECURSORS_PYRALIN_LEAD_TIME_DAYS_MIN', 2);
  },
  /**
   * precursors.pyralin_lead_time_days_max — the RANGE-MAX Pyralin lead time (game-days; mirrored, not consumed M1).
   * gdd/14 (04a:45). Range 2..10. (DB-override > env > default — Phase-23).
   */
  get pyralinLeadTimeDaysMax(): number {
    return TunablesStore.resolveInt('precursors.pyralin_lead_time_days_max', 'PRECURSORS_PYRALIN_LEAD_TIME_DAYS_MAX', 4);
  },
  /**
   * conversion.base_cost_standard_min — the grounded $ anchor the Pyralin unit price is a ratio OF (REUSE).
   * gdd/14 §Operational chain — conversion (04a/conversion_setup.md:130). Range 5000..50000.
   * (DB-override > env > default — Phase-23).
   */
  get baseCostStandardMin(): number {
    return TunablesStore.resolveInt('conversion.base_cost_standard_min', 'CONVERSION_BASE_COST_STANDARD_MIN', 15000);
  },
  /**
   * precursors.pyralin_unit_price_ratio — the M1 Pyralin unit price as a RATIO of the STANDARD-cover reference
   * conversion cost (the ONLY genuinely-NEW tunable of T2; `[PROV-Y26Q2]`). Default 0.01 → $150/unit. Range 0..0.5.
   * gdd/14 §Operational chain — precursors (04a:49). The fluctuating citywide `market_state` price model
   * (§Dynamique de prix) is DEFERRED; the M1 model applies NO market multiplier.
   * (DB-override > env > default — Phase-23).
   */
  get pyralinUnitPriceRatio(): number {
    return TunablesStore.resolveFloat('precursors.pyralin_unit_price_ratio', 'PRECURSORS_PYRALIN_UNIT_PRICE_RATIO', 0.01);
  },
  /**
   * precursors.verdant_root_extract_unit_price_ratio — the Crick precursor (Verdant root extract) unit price as a
   * RATIO of the STANDARD-cover reference conversion cost (Phase-2b vector #2; `[PROV-Y26Q2]`). SAME money convention
   * as pyralinUnitPriceRatio. Range 0..0.5. The fluctuating citywide `market_state` price model (§Dynamique de prix)
   * is DEFERRED. (DB-override > env > default — Phase-23).
   */
  get verdantRootExtractUnitPriceRatio(): number {
    return TunablesStore.resolveFloat('precursors.verdant_root_extract_unit_price_ratio', 'PRECURSORS_VERDANT_ROOT_EXTRACT_UNIT_PRICE_RATIO', 0.01);
  },
  /**
   * precursors.lull_resin_unit_price_ratio — the Hush precursor (Lull resin) unit price as a RATIO of the
   * STANDARD-cover reference conversion cost (Phase-2b vector #2b; `[PROV-Y26Q2]`). SAME money convention as
   * verdantRootExtractUnitPriceRatio / pyralinUnitPriceRatio. Range 0..0.5. The fluctuating citywide `market_state`
   * price model (§Dynamique de prix) is DEFERRED; the M1 model applies NO market multiplier.
   * (DB-override > env > default — Phase-23).
   */
  get lullResinUnitPriceRatio(): number {
    return TunablesStore.resolveFloat('precursors.lull_resin_unit_price_ratio', 'PRECURSORS_LULL_RESIN_UNIT_PRICE_RATIO', 0.01);
  },
  /**
   * precursors.glass_lily_unit_price_ratio — the Ash precursor (Glass lily) unit price as a RATIO of the
   * STANDARD-cover reference conversion cost (Phase-2b vector #2c; `[PROV-Y26Q2]`). SAME money convention as
   * lullResinUnitPriceRatio / verdantRootExtractUnitPriceRatio / pyralinUnitPriceRatio. Range 0..0.5. The fluctuating
   * citywide `market_state` price model (§Dynamique de prix) is DEFERRED; the M1 model applies NO market multiplier.
   * (DB-override > env > default — Phase-23).
   */
  get glassLilyUnitPriceRatio(): number {
    return TunablesStore.resolveFloat('precursors.glass_lily_unit_price_ratio', 'PRECURSORS_GLASS_LILY_UNIT_PRICE_RATIO', 0.01);
  },
  /**
   * precursors.market_trend_multiplier_up — UP trend price multiplier (≈+25% above nominal).
   * zero-regression sibling: stable=1.0 is fixed; this is the upside knob.
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range 1.05..1.50.
   * (DB-override > env > default — Phase-23).
   */
  get marketTrendMultiplierUp(): number {
    return TunablesStore.resolveFloat('precursors.market_trend_multiplier_up', 'PRECURSORS_MARKET_TREND_MULTIPLIER_UP', 1.25);
  },
  /**
   * precursors.market_trend_multiplier_stable — STABLE trend multiplier.
   * **zero-regression invariant (§0.2): MUST stay 1.0. Not a balance knob.**
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range (fixed).
   * (DB-override > env > default — Phase-23).
   */
  get marketTrendMultiplierStable(): number {
    return TunablesStore.resolveFloat('precursors.market_trend_multiplier_stable', 'PRECURSORS_MARKET_TREND_MULTIPLIER_STABLE', 1.0);
  },
  /**
   * precursors.market_trend_multiplier_down — DOWN trend price multiplier (≈−20% below nominal).
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range 0.50..0.95.
   * (DB-override > env > default — Phase-23).
   */
  get marketTrendMultiplierDown(): number {
    return TunablesStore.resolveFloat('precursors.market_trend_multiplier_down', 'PRECURSORS_MARKET_TREND_MULTIPLIER_DOWN', 0.80);
  },
  /**
   * precursors.supply_disruption_scarcity_multiplier — scarcity factor during active supply disruption.
   * Applied over the trend multiplier. Anchored "hausse temporaire" (precursors_supply_chain.md:103).
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range 1.1..2.5.
   * (DB-override > env > default — Phase-23).
   */
  get supplyDisruptionScarcityMultiplier(): number {
    return TunablesStore.resolveFloat('precursors.supply_disruption_scarcity_multiplier', 'PRECURSORS_SUPPLY_DISRUPTION_SCARCITY_MULTIPLIER', 1.5);
  },
  /**
   * precursors.supply_disruption_duration_days — integer count of NIGHTLY ticks after which scarcity_active
   * clears (DD-S expiry). Canon gives this as `composite:event_duration_bucket` (precursors_supply_chain.md:193)
   * meaning the duration varies per event type in the future world_events engine (GDD §G24 future).
   * For B4 the minimal trigger-path (BO/_test trigger) accepts an explicit durationDays param that is passed to
   * `onSupplyDisruption`; this tunable is the FALLBACK when no explicit duration is provided.
   * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range 1..30 (game-days). Default 3 game-days (a moderate disruption:
   * long enough to be observable, short enough to test expiry in one spec run).
   * (DB-override > env > default — Phase-23).
   */
  get supplyDisruptionDurationDays(): number {
    return TunablesStore.resolveInt('precursors.supply_disruption_duration_days', 'PRECURSORS_SUPPLY_DISRUPTION_DURATION_DAYS', 3);
  },
  /**
   * precursors.demand_trend_up_threshold — demand accumulator level above which price_trend → UP.
   * Calibrate at closeout (anchor = typical order volume × window_days).
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range (calibrate).
   * (DB-override > env > default — Phase-23).
   */
  get demandTrendUpThreshold(): number {
    return TunablesStore.resolveFloat('precursors.demand_trend_up_threshold', 'PRECURSORS_DEMAND_TREND_UP_THRESHOLD', 100.0);
  },
  /**
   * precursors.demand_trend_down_threshold — demand accumulator level below which price_trend → DOWN.
   * Calibrate at closeout.
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range (calibrate).
   * (DB-override > env > default — Phase-23).
   */
  get demandTrendDownThreshold(): number {
    return TunablesStore.resolveFloat('precursors.demand_trend_down_threshold', 'PRECURSORS_DEMAND_TREND_DOWN_THRESHOLD', 30.0);
  },
  /**
   * precursors.demand_accumulator_window_days — rolling order-volume window in game-days.
   * Calibrate at closeout.
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range (calibrate).
   * (DB-override > env > default — Phase-23).
   */
  get demandAccumulatorWindowDays(): number {
    return TunablesStore.resolveInt('precursors.demand_accumulator_window_days', 'PRECURSORS_DEMAND_ACCUMULATOR_WINDOW_DAYS', 7);
  },
  /**
   * precursors.demand_accumulator_decay — mean-reversion decay rate toward baseline per NIGHTLY tick.
   * Calibrate at closeout (auto-regulation factor ∈ (0,1)).
   * gdd/14 §Operational chain — precursors. [PROPOSED DEFAULT — tunable][PROV-Y26Q2]. Range (calibrate).
   * (DB-override > env > default — Phase-23).
   */
  get demandAccumulatorDecay(): number {
    return TunablesStore.resolveFloat('precursors.demand_accumulator_decay', 'PRECURSORS_DEMAND_ACCUMULATOR_DECAY', 0.85);
  },
};

const CENTS_PER_DOLLAR = 100n; // unit conversion (dollars→cents), NOT a balance value.

/**
 * Resolve the unit-price ratio for a precursor type — reads the TunablesStore getter per-call so a DB override
 * is reflected immediately without a restart. P23-T8: moved off the module-load-frozen UNIT_PRICE_RATIO_BY_PRECURSOR
 * table. The cost path is registry-driven: the price of a substance's precursor is its OWN ratio, never hardcoded
 * pyralin. All four shipped primary precursors default to 0.01 (the Crick / Hush / Ash premiums are carried by their
 * sell margins — not the matter cost), each as an INDEPENDENT env-overridable tunable so they can diverge without
 * touching the cost formula.
 *
 * SECONDARY PRECURSORS (thalmite / garnet_salt) — REUSE pyralinUnitPriceRatio (0.01): the distinct fluctuating price
 * model for the secondary-precursor market (gray-channel Thalmite markup, restricted Garnet salt channel) is DEFERRED
 * to D1b (TD-029 — the market model). Fabricating distinct `precursors.thalmite_unit_price_ratio` /
 * `garnet_salt_unit_price_ratio` tunables would invent values not in design §7 (R2.3 violation). The sibling idiom
 * `specialized_lab → lab` / `grow_house → front_shop` REUSE is the established pattern — here: secondary → pyralin.
 */
function unitPriceRatioFor(precursorType: M1PrecursorType): number {
  switch (precursorType) {
    case 'pyralin':
      return precursorTunables.pyralinUnitPriceRatio;
    case 'verdant_root_extract':
      return precursorTunables.verdantRootExtractUnitPriceRatio;
    case 'lull_resin':
      return precursorTunables.lullResinUnitPriceRatio;
    case 'glass_lily':
      return precursorTunables.glassLilyUnitPriceRatio;
    case 'thalmite':
    // REUSE pyralinUnitPriceRatio — the distinct secondary-precursor market price is DEFERRED to D1b (TD-029).
    // Falls through intentionally (same ratio as garnet_salt for the same reason).
    case 'garnet_salt':
      // REUSE pyralinUnitPriceRatio — the distinct secondary-precursor market price is DEFERRED to D1b (TD-029).
      return precursorTunables.pyralinUnitPriceRatio;
  }
}

/**
 * The grounded UNIT price in CENTS for a precursor type (the wallet-affecting per-unit cost). Registry-driven
 * grounding (precursors_supply_chain.md §Coût): unit_price = precursors.<type>_unit_price_ratio × the STANDARD-cover
 * reference conversion cost (conversion.base_cost_standard_min $), then ×100 for cents. The ratio is looked up PER
 * precursor (pyralin / verdant_root_extract / lull_resin / glass_lily), never hardcoded pyralin. DETERMINISTIC (the reference cost + a fixed
 * ratio; no RNG, no market multiplier — the fluctuating market_state model is DEFERRED). Returns a bigint (cents) for
 * the economy_states.cash_cents bigint column.
 */
export function precursorUnitPriceCents(precursorType: M1PrecursorType): bigint {
  const ratio = unitPriceRatioFor(precursorType);
  const unitDollars = Math.round(ratio * precursorTunables.baseCostStandardMin);
  return BigInt(unitDollars) * CENTS_PER_DOLLAR;
}

/**
 * The grounded ORDER cost in CENTS for a precursor type × quantity (the wallet-affecting order debit). order_cost =
 * qty × unit_price (see precursorUnitPriceCents — the per-precursor grounded unit price). DETERMINISTIC. Returns a
 * bigint (cents).
 */
export function precursorOrderCostCents(precursorType: M1PrecursorType, quantityUnits: number): bigint {
  return BigInt(quantityUnits) * precursorUnitPriceCents(precursorType);
}

/**
 * The DETERMINISTIC Pyralin lead time in GAME-MINUTE TICKS — the number of MINUTE ticks between order placement
 * (ordered_at_tick) and arrival (arrives_at_tick = ordered_at_tick + this). gdd/14 carries the lead time as
 * game-DAYS (range min..max); M1 is deterministic (NO RNG), so we use the RANGE MIN
 * (precursors.pyralin_lead_time_days_min = 2 game-days). The day→tick conversion is the canonical clock tunable
 * clock.in_game_day_length_minutes (=1440), READ from the city-sim tunables (NOT hardcoded — the same ratio T1's
 * setup duration uses). 2 × 1440 = 2880 minute-ticks. Deterministic.
 */
export function pyralinLeadTimeTicks(inGameDayLengthMinutes: number): number {
  return precursorTunables.pyralinLeadTimeDaysMin * inGameDayLengthMinutes;
}

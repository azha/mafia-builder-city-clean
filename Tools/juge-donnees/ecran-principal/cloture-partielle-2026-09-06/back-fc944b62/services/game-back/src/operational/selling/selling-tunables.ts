// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §How a deal works (under the hood)
//             ("Cash transfert vers `dealer.float_cents` (interne, increment)" + "deal_size_grams_bucket" /
//             "deals_per_hour_avg_bucket" — the UNGROUNDED composite buckets this file grounds for M1) +
//             §Dealer state (data model) (deals_per_hour_avg_bucket / avg_deal_size_grams_bucket composites) +
//             §Substance variations (Brindle = standard street price) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — selling (registry)
//             + §Operational chain — production (the grounded 200 g/cook yield + the $ chain anchors) +
//             §Operational chain — precursors / conversion (the $150 Pyralin unit / $15000 conversion anchors)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// Selling (dealer at lek — M1) tunables — the `selling.*` keys THIS slice's OWN logic CONSUMES: the per-tick SELL
// RATE (grams sold per MINUTE tick at a lek-present dealer-spot) + the BRINDLE DEAL VALUE (cents per gram — the cash
// added to dealer.float_cents per gram sold). Phase-2 M1 = a WORKING dealer at a dealer-spot whose covered lek tile
// has a lek present sells product per tick into a cash float; the runner ferries the float into a safehouse. The
// customer-loyalty depth, dealer recruitment/loyalty/fatigue, multiple dealers per spot, bust/compromise mechanics,
// lek competition, appointment dispatch (Ash), refusal-cascade pricing, and the substance-specific dealer-spot
// requirements are ALL DEFERRED — YAGNI.
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Operational chain
// — selling (cited per key, with the upstream selling_dealers_leks.md source line). They are surfaced as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry
// values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE SELL RATE GROUNDING (the per-tick volume step — selling_dealers_leks.md §How a deal works "deal_size_grams
//    _bucket" + §Dealer state "deals_per_hour_avg_bucket"/"avg_deal_size_grams_bucket"). The doc carries BOTH the
//    deal frequency (deals/hour) AND the per-deal size as QUALITATIVE composite buckets (R2.2 — no scalar; gdd/14
//    §Operational chain — selling carries no grounded deals/hour or grams/deal scalar). To SELL a concrete number of
//    grams per MINUTE tick (the COOK→DISTRIBUTE→DEAL loop must move observable product), M1 grounds the qualitative
//    deals/hour × grams/deal product as a single small-integer SELL RATE `selling.deal_grams_per_tick` (grams of
//    product the dealer sells off the dealer-spot product_storage per in-game MINUTE tick). The ONLY genuinely-NEW
//    VOLUME tunable of T5 (R2.3). `[PROV-Y26Q2]`. Default 5 g/tick (a deliberately modest street pace — a 200 g cook
//    is sold down over ~40 minute-ticks, observable but not instant; per-customer deal sizing + the deals/hour rich
//    -NPC weighting are DEFERRED). The per-tick sell is GUARDED to min(rate, available) — a dealer never oversells
//    the dealer-spot stock.
//
// ── THE BRINDLE DEAL VALUE GROUNDING (the cash step — selling_dealers_leks.md §How a deal works "Cash transfert vers
//    `dealer.float_cents` (interne, increment)"). gdd/14 §Operational chain — selling carries
//    `selling.brindle_street_price_per_gram_bucket = composite:street_price_baseline` — an UNGROUNDED composite (no
//    scalar; the canonical street price is the per-deal market-clear state, §Customer satisfaction / Refusal Cascade
//    Pricing, a P5 composite DEFERRED to the 04c market pass). To credit a concrete cents amount per gram WITHOUT a
//    fluctuating market model, M1 grounds the Brindle street price as a single CENTS-PER-GRAM deal value
//    `selling.brindle_deal_value_cents_per_gram`. Anchored NET-POSITIVE relative to the chain's existing $ anchors:
//    the raw-material cost of a gram of Brindle is ~$1.50/g (2 Pyralin units/cook × $150/unit = $300/cook ÷ 200 g/
//    cook yield — REUSE precursors.pyralin_unit_price_ratio × conversion.base_cost_standard_min and
//    production.brindle.tier_1_standard_output_g_per_cook). The M1 deal value $25/g (2500 cents) is ~16× the raw
//    cost → the loop is comfortably net-positive and observable (a 200 g cook sells for ~$5000 of float). The ONLY
//    genuinely-NEW VALUE tunable of T5 (R2.3). `[PROV-Y26Q2]`. The fluctuating market_clear price model (refusal-
//    cascade ratchet, purity premium, district clear-price) is DEFERRED; the M1 model applies NO market multiplier
//    and NO purity premium (every gram is the flat deal value).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * The original Phase-2 M1 sell substance domain (M1 = Brindle ONLY). VESTIGIAL since the substance-generic chain
 * (Crick vector #2 T4 / Hush vector #2b T4): the sell is now PRODUCT-DRIVEN — a dealer sells whatever substance its
 * dealer-spot product_storage physically holds (resolved in SellingRepository.listSellableDealers), priced by that
 * substance's registry descriptor marginMultiplierVsBrindle (Brindle 1× / Hush 1.5× / Crick 3×), NOT by this type nor
 * by dealer.substance_specialization. Kept only as documentation of the M1 starting point; not imported anywhere.
 */
export type M1SellSubstanceType = 'brindle';

/**
 * Resolved selling tunables. The two genuinely-NEW M1 keys (R2.3, both `[PROV-Y26Q2]`) are the SELL RATE (grams/tick)
 * + the BRINDLE DEAL VALUE (cents/gram). The fluctuating market_clear price model + per-customer deal sizing + the
 * deals/hour rich-NPC weighting are DEFERRED (YAGNI). DB-override > env > default (Phase-23).
 */
export const sellingTunables = {
  /**
   * selling.deal_grams_per_tick — grams of product a WORKING dealer at a lek-present dealer-spot sells off the
   * dealer-spot product_storage per in-game MINUTE tick (the DEALER_SELL tick rate; the ONLY genuinely-NEW VOLUME
   * tunable of T5; `[PROV-Y26Q2]`). The per-tick sell is GUARDED to min(rate, available). The per-customer deal
   * sizing + deals/hour weighting are DEFERRED. (DB-override > env > default — Phase-23).
   */
  get dealGramsPerTick(): number {
    return TunablesStore.resolveInt('selling.deal_grams_per_tick', 'SELLING_DEAL_GRAMS_PER_TICK', 5);
  },
  /**
   * selling.brindle_deal_value_cents_per_gram — the cents added to dealer.float_cents per gram of Brindle sold (the
   * M1 grounding of the qualitative `selling.brindle_street_price_per_gram_bucket`; the ONLY genuinely-NEW VALUE
   * tunable of T5; `[PROV-Y26Q2]`). Anchored net-positive vs the chain raw cost (~$1.50/g). The fluctuating
   * market_clear / refusal-cascade / purity-premium model is DEFERRED. (DB-override > env > default — Phase-23).
   */
  get brindleDealValueCentsPerGram(): number {
    return TunablesStore.resolveInt('selling.brindle_deal_value_cents_per_gram', 'SELLING_BRINDLE_DEAL_VALUE_CENTS_PER_GRAM', 2500);
  },
};

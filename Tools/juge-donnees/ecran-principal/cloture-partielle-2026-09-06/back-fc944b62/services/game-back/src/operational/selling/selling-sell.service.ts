// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §How a deal works (under the hood)
//             (the per-tick deal: dealer present at the lek tile → sells product → "Cash transfert vers
//             `dealer.float_cents` (interne, increment)") + §Lek control vs dealer assignment (deals happen at a
//             dealer's covered lek tile when a lek is present) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (dealer / product_storage — R9.3) +
//             docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.1 (Lane Collapse Pricing — D1b C6)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//             -- D1b C6 — 2026-06-16 (DD11 realized: selling clearing routed through dynamic lane price)
//
// `SellingSellService` — the OPERATIONAL tick-hook that ADVANCES dealer selling. It is NOT one of the 11 city-sim
// systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the registry contract). It
// mirrors DistributionTransitService's / ProductionCookAdvanceService's registration shape EXACTLY (OnApplication
// Bootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder the scheduler seeds
// at the MINUTE/10 = DEALER_SELL slot (after COURIER_TRANSIT at MINUTE/9). This is the tick-hook PATTERN T1–T5 share.
//
// THE MINUTE/10 TICK (selling_dealers_leks.md §How a deal works — a present dealer sells product into a cash float),
// per player:
//   - BATCH-READ all SELLABLE dealers (WORKING + covered lek PRESENT + dealer-spot OPERATIONAL + product available) in
//     ONE query (the Phase-1 determinism discipline: batched read, no per-row queries). The lek presence is a READ of
//     the persisted deal_leks row (System 11 CONSUMED — never recompute lek_score).
//   - For each sellable dealer, SELL min(rate, available) grams off the dealer-spot product_storage (guarded — never
//     oversell) and ADD grams_sold × the deal value to dealer.float_cents — in ONE batched, set-based transaction.
//   - No RNG: which dealers sell (the WORKING + lek-present + product gate) + how much (min(rate, available)) + the
//     cash (grams × the deal value) are FIXED functions of the persisted state + the grounded tunables.
//
// DETERMINISM (NO RNG): two players with identical dealers + identical product + identical lek presence accrue
// identical float over identical advances. Organically a no-op (no sellable dealer).
//
// COUPLING (System 11 CONSUMED): the lek presence gate is the persisted deal_leks row (read in the batched query). The
// per-tick sell rate does NOT scale with lek_score in M1 (a simple "lek present → dealer sells at the tunable rate" —
// the score-scaling deals/hour weighting is composite/ungrounded, DEFERRED per the money-grounding convention). The
// lek_score is never recomputed here.
//
// ADDICTION BOOST + ACCUMULATION (Phase-2b vector #2b — Hush, T5; gated `descriptor.addiction===true`): for the
// dealer-spots selling a Hush (addiction=true) substance, the per-tick sell rate is BOOSTED when the spot is DEPENDENT.
// Before the sell, the spots' loyalty scores are BATCH-READ (one query) + the boost computed per Hush spot
// (HushAddictionService.boostMultiplier — loyalty_boost_multiplier when DEPENDENT, else 1); rate_eff = rate × boost,
// grams_sold = min(rate_eff, available). AFTER the sell, each DISTINCT Hush spot that actually sold (grams_sold > 0)
// accumulates +addiction_loyalty_increment_per_deal on its hush_addiction row (lazy upsert, ONE set-based statement —
// one "deal event" per spot per tick). Non-addiction substances (Brindle/Crick) are UNCHANGED — no addiction read, the
// BASE rate, no row (behavior-preserving). The boost is read from the score at the START of the tick (before
// accumulation), so a spot reaching dependent THIS tick gets the boost the NEXT tick (deterministic — fine). The
// HUSH_ADDICTION/16 decay/withdrawal tick runs AFTER this DEALER_SELL/10 tick in the same minute, and the accumulation
// here stamps last_hush_deal_tick=currentTick, so a sold spot is correctly SKIPPED by the same-minute decay.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { SellingRepository, type DealerSellMutation } from './selling.repository';
import { sellingTunables } from './selling-tunables';
import { substanceDescriptor, isLuxurySubstance } from '../substance/substance-config';
import { HeatContribService } from '../heat_contrib/heat-contrib.service';
import { HushAddictionService } from '../hush/hush-addiction.service';
import { HushAddictionRepository } from '../hush/hush-addiction.repository';
import { hushAddictionTunables } from '../hush/hush-addiction-tunables';
import { LaneCollapsePricingService, type SubstanceTypeValue } from '../market/lane-collapse-pricing.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { MetaMarketContributionService } from '../meta_market/meta-market-contribution.service';

@Injectable()
export class SellingSellService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SellingSellService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: SellingRepository,
    private readonly heatContrib: HeatContribService,
    private readonly hushAddiction: HushAddictionService,
    private readonly hushAddictionRepo: HushAddictionRepository,
    // D1b C6: LaneCollapsePricingService — routes each deal through the §2.1 lane mechanic.
    // The deal price is the lane's current modal p_cents (in-lane deal → c rises). DD11 realized.
    private readonly laneCollapse: LaneCollapsePricingService,
    // Drift C6: CityEventBus — emit one aggregate DealAcceptedEvent per tick AFTER the sell commits.
    // ADDITIVE-ONLY: the sell hot-path return value (void) is BYTE-IDENTICAL. The bus is @Global() via
    // SchedulerModule (already imported by SellingModule) — no new module import needed.
    private readonly bus: CityEventBus,
    // 04d-C C4: MetaMarketContributionService — ADDITIVE per-(substance × district) contribution emit
    // AFTER applySells (decision #2, RATIFIÉ). Hot-path return (void) is byte-identical.
    // Injected by MetaMarketModule (imported by SellingModule at C4). Failures are caught + logged
    // (non-blocking — the sell path is never interrupted by a contribution emit failure).
    private readonly metaMarketContribution: MetaMarketContributionService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'SellingSellService registered at MINUTE/10 (DEALER_SELL) — each in-game minute it sells product at every ' +
        'WORKING dealer at a lek-present operational dealer-spot: decrements the dealer-spot product_storage (guarded, ' +
        'min(rate, available)) and increments dealer.float_cents by grams_sold × the dynamic LANE PRICE (D1b C6: ' +
        'LaneCollapsePricingService.processDealAttempt per district — DD11 realized; in-lane deal at p_cents; ' +
        'fallback = sellingTunables.brindleDealValueCentsPerGram when lane not yet seeded). ' +
        'CONSUMES deal_leks (System 11 — lek presence read, never recomputed). Organically a no-op (no sellable dealer).',
    );
  }

  /** Register the MINUTE/10 = DEALER_SELL slot (the SAME registerSystem path the courier-transit hook uses at MINUTE/9). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.DEALER_SELL,
      cadence: Cadence.MINUTE,
      order: 10,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/10 tick ─────────────────────────────

  /**
   * {MINUTE, order 10} — sell product at the player's sellable dealers. Batch-reads the sellable dealers (WORKING +
   * lek present + operational dealer-spot + product available); for each, sells min(rate, available) grams and credits
   * grams_sold × the deal value to the dealer's float — in ONE batched transaction. Deterministic (NO RNG). Organically
   * a no-op (no sellable dealer).
   */
  async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    // LUXURY-CHANNEL SKIP (Phase-2c vector #2c — Ash, T8): a luxuryChannel substance (Ash) is NEVER sold via DEALER_SELL
    // — its only sale path is the appointment honor at a Glass venue. ONE registry-derived guard (!isLuxurySubstance):
    // it filters OUT exactly the substances the registry flags luxuryChannel (Ash today), so Ash held at a normal
    // dealer-spot earns ZERO here. Brindle/Crick/Hush are NOT luxuryChannel → never filtered → their selling is
    // BYTE-IDENTICAL (this filter only ever drops Ash rows; for the other three `sellable` is unchanged).
    const sellable = (await this.repo.listSellableDealers(ctx.playerId)).filter(
      (d) => !isLuxurySubstance(d.substance_type),
    );
    if (sellable.length === 0) return; // no sellable dealer → clean no-op.

    const rate = Math.max(0, sellingTunables.dealGramsPerTick);
    // The BASE Brindle deal value (cents/gram) — used as the fallback when a lane is not yet seeded (LaneCollapse
    // ensureLane always seeds at this value, so the fallback is effectively never hit post-C6; kept for defensive
    // safety). D1b C6: the ACTUAL deal value per gram is the lane's current modal p_cents (dynamic), not this
    // flat constant. The flat constant remains the lane SEED (R2.3 — it is still referenced / not dead).
    const brindleBaseValuePerGram = Math.max(0, sellingTunables.brindleDealValueCentsPerGram);

    // ADDICTION BOOST (Phase-2b vector #2b — Hush, gated descriptor.addiction===true): the DISTINCT Hush dealer-spots
    // among the sellable set. BATCH-READ their loyalty scores in ONE query (no per-spot round-trip); a spot with no
    // hush_addiction row yet (never sold) → score 0 → boost 1× (the lazy row is created on its first deal below). The
    // boost is read at the START of the tick (before this tick's accumulation), so a spot crossing DEPENDENT this tick
    // gets the boost NEXT tick (deterministic). Non-addiction substances (Brindle/Crick) are NEVER in this set → no
    // addiction read → base rate (behavior-preserving).
    const hushSpotIds = [
      ...new Set(
        sellable
          .filter((d) => substanceDescriptor(d.substance_type)?.addiction === true)
          .map((d) => d.home_building_id),
      ),
    ];
    const loyaltyBySpot = new Map<string, number>();
    if (hushSpotIds.length > 0) {
      for (const row of await this.hushAddictionRepo.getLoyaltyScores(ctx.playerId, hushSpotIds)) {
        loyaltyBySpot.set(row.dealer_spot_building_id, row.loyalty_score);
      }
    }

    const mutations: DealerSellMutation[] = [];
    for (const d of sellable) {
      // Per-substance deal value: base × marginMultiplierVsBrindle from the registry descriptor (Crick 3×, Hush 1.5× →
      // base 2500 × 1.5 = 3750 cents/g, shipped at Phase-2b vector #2b T4). An unconfigured substance (no descriptor —
      // Ash DEFERRED) → skip defensively (all sold substances are configured this slice). The multiplier is the
      // registry value, never an inline literal (R2.3).
      const descriptor = substanceDescriptor(d.substance_type);
      if (descriptor === null) continue; // no shipped descriptor → cannot price → skip (defensive).

      // D1b C6 — DD11 REALIZED (C6 BLOCKING A1 fix): route the clearing price through LaneCollapsePricingService.
      //
      // TWO-STEP PER DEALER (per market_mechanics.md §2.1):
      //   Step 1: getRealisedPriceCents(district, substance, gameMinute) — the CUSTOMER-FACING price.
      //     Scatter applies ONLY in the jam / low-c zone (c < c_lo OR t_refractory > 0). In the neutral
      //     zone [c_lo, c_hi] scatter = 0 → realised = p_cents (preserves 13 selling tests).
      //     No row yet → returns modalPCentsSeed = 2500 (fresh lane guard).
      //   Step 2: getLanePriceForDeal (ensureLane + getLaneRow) → get modal p_cents for priceDealt.
      //     processDealAttempt(district, substance, p_cents) → in-lane deal → c ← c + α·(1−c) (c RISES).
      //     The lane UPDATE rule uses p_cents (not the scattered realised price).
      //
      // Per-substance price: the realised price (brindle-anchored) × marginMultiplierVsBrindle (Crick 3×, Hush 1.5×).
      //
      // DD11 garde-fou (district_clear_price_bucket ratchet) — flag: distinct from lane-confidence.
      // Counts NPC customer refusals via MarketService.recordRefusal(). Flagged D1c residual (not implemented here).
      const substanceType = d.substance_type as SubstanceTypeValue;

      // C6 BLOCKING A1 FIX: get the REALISED (scattered) price BEFORE calling processDealAttempt.
      // scatter = ±W·(1−c) via deterministic RNG (getRealisedPriceCents, C6 fix).
      // When c=1.0: scatter=0 → realised = p_cents exactly.
      // When no lane row exists yet: returns modalPCentsSeed=2500 with zero scatter (fresh lane guard —
      //   preserves the 13 selling E2E tests: float delta = DEAL_GRAMS × 2500 on fresh lanes).
      const realisedLanePriceCents = await this.laneCollapse.getRealisedPriceCents(
        d.district_id,
        substanceType,
        ctx.gameMinute,
      );

      // The priceDealt for processDealAttempt is ALWAYS the modal p_cents (in-lane deal → c rises).
      // We use getLanePriceForDeal to get p_cents; the c update uses p_cents, NOT the scattered price.
      const modalLanePriceCents = await this.getLanePriceForDeal(d.district_id, substanceType, brindleBaseValuePerGram);
      await this.laneCollapse.processDealAttempt(
        d.district_id,
        substanceType,
        modalLanePriceCents, // priceDealt = modal p_cents → in-lane → c ← c + α·(1−c)
      );

      // Realized price per gram = scattered realised price × the substance's margin multiplier.
      // C6 A1: realisedLanePriceCents replaces the flat laneRow.p_cents used before this fix.
      const lanePricePerGram = Math.max(0, realisedLanePriceCents);
      const valuePerGram = Math.max(0, Math.round(lanePricePerGram * descriptor.marginMultiplierVsBrindle));

      // ADDICTION BOOST: a Hush (addiction=true) DEPENDENT dealer-spot sells at rate × loyalty_boost_multiplier (=2);
      // below DEPENDENT (and for any non-addiction substance) the boost is 1× (the base rate — behavior-preserving).
      // The boost factor is read from the spot's score AT THE START of the tick (the Map above).
      const boost =
        descriptor.addiction === true
          ? this.hushAddiction.boostMultiplier(loyaltyBySpot.get(d.home_building_id) ?? 0)
          : 1;
      const rateEff = rate * boost;

      // GUARDED sell volume: never oversell the dealer-spot stock (min(rate_eff, available)). available_grams > 0 is
      // guaranteed by the repository filter, so grams_sold >= 1 here when rate >= 1.
      const gramsSold = Math.min(rateEff, d.available_grams);
      if (gramsSold <= 0) continue; // rate=0 (knob disabled) → no sell this tick.
      mutations.push({
        dealer_id: d.dealer_id,
        home_building_id: d.home_building_id,
        substance_type: d.substance_type,
        grams_sold: gramsSold,
        float_delta_cents: gramsSold * valuePerGram,
      });
    }
    if (mutations.length === 0) return;

    await this.repo.applySells(ctx.playerId, mutations);

    // 04d-C C4 META-MARKET CONTRIBUTION EMIT — ADDITIVE (decision #2, RATIFIÉ).
    //
    // Per-deal realized price: float_delta_cents / grams_sold = the per-gram price for this deal.
    //   float_delta_cents = grams_sold × valuePerGram (set in the mutations loop above).
    //   → float_delta_cents / grams_sold = valuePerGram (the per-gram realized sell price in cents).
    // This is the contribution value per deal (decision #e: per-deal price, rate-limited to 1/hour).
    //
    // ADDITIVE invariant: the sell result (void) is byte-identical. Failures are caught + logged
    // (never propagate — the sell path must never be blocked by a meta-market contribution failure).
    // Fire-and-forget pattern: all contributions are emitted concurrently (Promise.all), after all
    // sell DB mutations have committed (applySells awaited above).
    // 04d-C C6 FIX C4 MINOR-1 — dedup emit by (substance_type, district_id) BEFORE Promise.all.
    //
    // Problem: a player with ≥2 dealers selling the same (substance, district) in a tick produces N
    // concurrent `recordDeal` calls. Both calls pass the SELECT-guard simultaneously (race window),
    // then BOTH insert → N contribution rows for the same (contributor_hash, substance, district,
    // bucket_hour), weakening the distinct-contributor count the sample-floor relies on.
    //
    // Fix: dedup by (substance_type, district_id) first. Keep the first occurrence per unique key
    // (first-seen grams-weighted price). Only 1 `recordDeal` call per (substance, district) per tick.
    // This guarantees exactly 1 contribution per (player × substance × district) per tick,
    // making the sample-floor's distinct-contributor invariant reliable.
    //
    // (Cross-request races remain best-effort — only intra-tick is fixed here.)
    {
      // Build a dedup map: key=(substance_type:district_id) → { substance, districtId, priceCents }
      // First-seen wins (subsequent dealers for the same substance+district are skipped).
      const emitMap = new Map<string, { substance: string; districtId: number; priceCents: number }>();
      for (const m of mutations) {
        if (m.grams_sold <= 0) continue;
        const d = sellable.find((s) => s.home_building_id === m.home_building_id);
        if (!d) continue;
        const key = `${m.substance_type}:${d.district_id}`;
        if (!emitMap.has(key)) {
          emitMap.set(key, {
            substance:  m.substance_type,
            districtId: d.district_id,
            priceCents: m.float_delta_cents / m.grams_sold,
          });
        }
        // If key already present: skip — 1 contribution max per (substance × district) per tick.
      }

      const emitPromises = [...emitMap.values()].map(({ substance, districtId, priceCents }) =>
        this.metaMarketContribution
          .recordDeal(ctx.playerId, substance, districtId, priceCents, ctx.gameMinute)
          .catch((err: unknown) => {
            this.logger.warn(
              `MetaMarket contribution emit failed (non-blocking): ${String(err)} ` +
              `[substance=${substance} district=${districtId} player=${ctx.playerId}]`,
            );
          }),
      );
      await Promise.all(emitPromises);
    }

    // ADDICTION ACCUMULATION (Phase-2b vector #2b — Hush): for the DISTINCT Hush dealer-spots that actually SOLD this
    // tick (grams_sold > 0), bump their loyalty +addiction_loyalty_increment_per_deal (one "deal event" per spot per
    // tick — lazy upsert, ONE set-based statement, stamping last_hush_deal_tick=ctx.gameMinute + withdrawn=false). The
    // distinct spots de-dupe by home_building_id. Non-addiction spots are excluded (gated on descriptor.addiction).
    const soldHushSpotIds = [
      ...new Set(
        mutations
          .filter((m) => m.grams_sold > 0 && substanceDescriptor(m.substance_type)?.addiction === true)
          .map((m) => m.home_building_id),
      ),
    ];
    if (soldHushSpotIds.length > 0) {
      await this.hushAddictionRepo.accumulateOnDeal(
        ctx.playerId,
        soldHushSpotIds,
        Math.max(0, hushAddictionTunables.incrementPerDeal),
        ctx.gameMinute,
      );
    }

    // COUPLING (System Heat): each deal ADDS heat to the dealer-spot (selling_dealers_leks.md §How a deal works —
    // `+heat_per_deal_bucket`) — emit a HeatInjectionEvent per selling dealer-spot on the canonical CityEventBus seam
    // (System Heat buffers + flushes it onto buildings.heat; this service writes no heat — R9.3). The home_building_id
    // is the dealer-spot building; multiple dealers at one spot de-dupe to one injection (the service de-dupes).
    await this.heatContrib.emitDealHeat(
      ctx.playerId,
      mutations.map((m) => m.home_building_id),
      ctx.gameMinute,
    );

    // DRIFT C6: emit ONE aggregate DealAcceptedEvent per tick — ADDITIVE (after ALL mutations + heat committed).
    // ONE event per tick (not per-deal) to avoid concurrent async-subscriber races in CoverageInducedDriftService.
    // NO behavior change: the sell result (void) is unchanged. The subscriber fires async (fire-and-forget in
    // InsuranceModule). [needs reviewer⊥]: per-deal vs per-tick emission volume (plan §2.3 flag).
    //
    // Aggregate across all sold mutations:
    //   marginPermille = average realized value per gram as per-mille of brindleBase (per mutation: float_delta/grams_sold).
    //   heatLevel = MAX heat across all dealer-spot buildings (from sellable, which carries building_heat).
    // A "marginal" tick aggregate is one where marginPermille < 1000 (below brindle base) OR heatLevel > 0.
    // The 1000‰ anchor = REUSE of selling.brindle_deal_value_cents_per_gram (2500¢) as the per-mille base.
    {
      let totalMarginPermille = 0;
      let maxHeatLevel = 0;
      const representativeDealerSpotId = mutations[0]!.home_building_id;
      for (const m of mutations) {
        const d = sellable.find((s) => s.home_building_id === m.home_building_id);
        if (!d) continue;
        const realizedValuePerGram = m.grams_sold > 0 ? m.float_delta_cents / m.grams_sold : 0;
        const mPerMille = Math.round((1000 * realizedValuePerGram) / Math.max(1, brindleBaseValuePerGram));
        totalMarginPermille += mPerMille;
        maxHeatLevel = Math.max(maxHeatLevel, Math.round(d.building_heat));
      }
      const avgMarginPermille = Math.round(totalMarginPermille / mutations.length);
      this.bus.emitDealAccepted({
        type: 'deal_accepted',
        playerId: ctx.playerId,
        dealerSpotId: representativeDealerSpotId,
        marginPermille: avgMarginPermille,
        heatLevel: maxHeatLevel,
        gameMinute: ctx.gameMinute,
      });
    }
  }

  // ───────────────────────────── D1b C6 private helpers ─────────────────────────────

  /**
   * Fetch (or seed) the current modal lane price p_cents for a (districtId, substanceType) pair.
   * If no lane row exists yet, ensureLane seeds it at `fallbackCents` (= brindleDealValueCentsPerGram).
   * Returns the seeded or existing p_cents — the priceDealt that makes the selling deal IN-LANE.
   *
   * Called once per dealer per tick to determine the priceDealt for processDealAttempt, ensuring
   * the selling tick always executes an in-lane deal (c rises) against the district's modal lane price.
   *
   * D1b C6 — DD11 realized (market_mechanics.md §2.1 "route selling clearing through LaneCollapse").
   */
  private async getLanePriceForDeal(
    districtId: number,
    substanceType: SubstanceTypeValue,
    fallbackCents: number,
  ): Promise<number> {
    // Ensure the lane row exists (idempotent — seeds at fallbackCents × W_SEED_FRACTION).
    await this.laneCollapse.ensureLane(districtId, substanceType);
    // Read the current modal p_cents (the price that keeps a deal in-lane: priceDealt = p_cents → diff = 0 ≤ W).
    const row = await this.laneCollapse.getLaneRow(districtId, substanceType);
    // The ensureLane above guarantees the row exists; the fallback here is purely defensive.
    return row?.p_cents ?? fallbackCents;
  }
}

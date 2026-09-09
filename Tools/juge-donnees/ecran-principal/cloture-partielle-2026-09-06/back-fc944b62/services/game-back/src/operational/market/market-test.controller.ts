// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 1 (C1) + Task 2 (C2) + Task 3 (C3) + Task 4 (C4) + Task 5 (C5) — E2E proof obligation.
//             Pattern: services/game-back/src/citysim/scheduler/citysim-test.controller.ts (R-EC-2)
//             — D1b C1 — 2026-06-16
//             — D1b C2 — 2026-06-16 (lane-collapse routes)
//             — D1b C3 — 2026-06-16 (composition-telegraph routes)
//             — D1b C4 — 2026-06-16 (wear-mark routes)
//             — D1b C5 — 2026-06-16 (carrying-capacity routes)
//
// `MarketTestController` — TEST-ONLY probe routes for C1 + C2 + C3 E2E verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in MarketModule — same
// pattern as CitySimTestController / ProtocolTestController). In production this controller is simply
// not registered → 404. The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C1 Routes:
//   GET /v1/_test/market/projection-probe — calls MarketProjectionService.toBuckets() with query-param
//     internal scalars (c, p, w, q_inferred, s, lambda) and returns the R2.2 bucket payload.
//   GET /v1/_test/market/rng-probe — calls MarketRngService.seedFromDay(dayId, regionId) and returns the
//     deterministic draw. Calling twice with same params returns identical draw (C4 assertion in E2E).
//
// C2 Routes:
//   POST /v1/_test/market/lane-collapse/process-deal — calls LaneCollapsePricingService.processDealAttempt()
//     with { districtId, substanceType, priceDealt } body. Returns the updated lane state.
//   GET  /v1/_test/market/lane-collapse/projection  — returns MarketProjectionBuckets for a lane's current c
//     (R2.2 — ONLY lane_confidence_bucket + placeholder buckets; NO raw c/P/W/t_refractory).
//   POST /v1/_test/market/lane-collapse/init-lane   — idempotent upsert of a lane row (seed P + W defaults).
//
// C3 Routes:
//   POST /v1/_test/market/composition-telegraph/record-attribution — calls
//     CompositionTelegraphService.recordBuyerAttribution() with { playerId, regionId, buyerTier, currentTick? }.
//   POST /v1/_test/market/composition-telegraph/run-inference-tick — calls
//     CompositionTelegraphService.computeQInferredForDay() with { playerId, regionId, dayId } and returns
//     { q_inferred_bucket } (R2.2 — bucket only, NEVER raw q_inferred float).
//   GET  /v1/_test/market/composition-telegraph/roster-entries — returns the raw roster for (playerId, regionId)
//     (TEST-ONLY: exposes slot_index + buyer_tier + attributed_at_tick for E2E DB assertion). Does NOT include
//     q_inferred (server-side scalar — R2.2 P5 invariant).
//
// C4 Routes:
//   POST /v1/_test/market/wear-mark/mutate-lot-vector — calls WearMarkPremiumService.mutateLotVectorOnDistributionLeg()
//     with query params (storageId, playerId, hopsToAdd, transitDaysToAdd). Returns { ok: boolean }.
//   POST /v1/_test/market/wear-mark/seed-district-demographics — calls WearMarkPremiumService.ensureDistrictDemographics()
//     with { districtId, cautious_share, pristine_share }. Returns { ok: boolean }.
//   POST /v1/_test/market/wear-mark/compute-realised-price — calls WearMarkPremiumService.computeRealisedPrice()
//     with { storageId, playerId, districtId, basePriceCents }. Returns WearMarkResult (R2.2 buckets + handling-card).
//     NEVER the raw lot_handling_vector fields (P5 invariant).
//   GET  /v1/_test/market/wear-mark/lot-vector — returns the raw lot_handling_vector row for (storageId, playerId)
//     (TEST-ONLY: exposes raw vector for DB assertion). NOT a player-facing route.
//
// R2.2: ALL projection routes ONLY return MarketProjectionBuckets — never raw scalars.
// These routes do NOT bypass auth in production because they are not registered.

import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { MarketProjectionService, type MarketProjectionBuckets } from './market-projection.service';
import { MarketRngService } from './market-rng.service';
import { LaneCollapsePricingService, type SubstanceTypeValue } from './lane-collapse-pricing.service';
import { CompositionTelegraphService, type BuyerTier } from './composition-telegraph.service';
import { WearMarkPremiumService, type WearMarkResult, type MutateLotVectorOpts } from './wear-mark-premium.service';
import { CarryingCapacityHazeService, type CapacityHazeProjection } from './carrying-capacity-haze.service';

// ── C1 response shapes ────────────────────────────────────────────────────────────────────────────────

/** The R2.2 probe response — ONLY bucket fields (no raw scalars, P5). */
interface ProjectionProbeResponse extends MarketProjectionBuckets {
  // MarketProjectionBuckets already contains ONLY the 4 bucket fields.
  // No additional fields added here — the E2E asserts zero forbidden raw scalars.
}

/** The RNG probe response — the deterministic draw for a (dayId, regionId) pair. */
interface RngProbeResponse {
  /** The deterministic float ∈ [0, 1) drawn from (dayId, regionId) via SHA-256. */
  draw: number;
  /** Echo of the inputs for human readability in test output. */
  dayId: number;
  regionId: number;
}

// ── C2 request / response shapes ─────────────────────────────────────────────────────────────────────

/** Request body for POST /v1/_test/market/lane-collapse/process-deal. */
interface ProcessDealBody {
  districtId: number;
  substanceType: SubstanceTypeValue;
  priceDealt: number;
}

/**
 * C2 projection response — R2.2 banded output ONLY (market_mechanics.md:217 R2.2 strict).
 * NEVER raw c, P, W, or t_refractory. All 4 placeholder buckets are present (C1 projection engine).
 * Only `lane_confidence_bucket` is derived from the REAL lane state; the other 3 are placeholder
 * values (C3–C5 will fill them when those mechanics land).
 */
type LaneProjectionResponse = MarketProjectionBuckets;

// ── C3 request / response shapes ─────────────────────────────────────────────────────────────────────

/** Request body for POST /v1/_test/market/composition-telegraph/record-attribution. */
interface RecordAttributionBody {
  playerId: string;
  regionId: number;
  buyerTier: BuyerTier;
  /** Current game tick — defaults to 0 if omitted. */
  currentTick?: number;
}

/** Request body for POST /v1/_test/market/composition-telegraph/run-inference-tick. */
interface RunInferenceTickBody {
  playerId: string;
  regionId: number;
  dayId: number;
}

/**
 * C3 inference-tick response — R2.2 bucket ONLY (never raw q_inferred float).
 * The route calls computeQInferredForDay() → maps through MarketProjectionService.toBuckets() →
 * returns ONLY the bucket. This is the P5 invariant for the Composition Telegraph.
 */
interface InferenceTickResponse {
  /** R2.2 bucket for the computed q_inferred. NEVER the raw float (P5). */
  q_inferred_bucket: MarketProjectionBuckets['q_inferred_bucket'];
}

/**
 * C3 roster-entries response — raw roster for E2E DB assertion (TEST-ONLY).
 * Includes slot_index + buyer_tier + attributed_at_tick per entry.
 * Does NOT include q_inferred (server-side scalar — R2.2 P5 invariant).
 */
interface RosterEntriesResponse {
  entries: Array<{
    slot_index: number;
    buyer_tier: number;
    attributed_at_tick: number;
  }>;
}

// ── C4 request / response shapes ─────────────────────────────────────────────────────────────────

/** Request body for POST /v1/_test/market/wear-mark/seed-district-demographics. */
interface SeedDistrictDemographicsBody {
  districtId: number;
  cautious_share: number;
  pristine_share: number;
}

/** Request body for POST /v1/_test/market/wear-mark/compute-realised-price. */
interface ComputeRealisedPriceBody {
  storageId: string;
  playerId: string;
  districtId: number;
  basePriceCents: number;
}

// ── C5 request / response shapes ─────────────────────────────────────────────────────────────

/** Request body for POST /v1/_test/market/carrying-capacity/ensure-district. */
interface EnsureDistrictBody { districtId: number; }

/** Request body for POST /v1/_test/market/carrying-capacity/add-throughput. */
interface AddThroughputBody { districtId: number; amount: number; }

/** Request body for POST /v1/_test/market/carrying-capacity/apply-tick. */
interface ApplyTickBody { districtId: number; }

/** Request body for POST /v1/_test/market/carrying-capacity/civic-investment. */
interface CivicInvestmentBody { districtId: number; }

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MarketTestController {
  constructor(
    private readonly projection: MarketProjectionService,
    private readonly rng: MarketRngService,
    private readonly laneCollapse: LaneCollapsePricingService,
    private readonly compositionTelegraph: CompositionTelegraphService,
    private readonly wearMark: WearMarkPremiumService,
    private readonly carryingCapacityHaze: CarryingCapacityHazeService,
  ) {}

  // ── C1 Routes ────────────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/market/projection-probe` — TEST-ONLY.
   *
   * Accepts raw internal market scalars as query params, runs them through
   * `MarketProjectionService.toBuckets()`, and returns the R2.2 bucket payload.
   *
   * Query params (all floats):
   *   c         — lane confidence ∈ [0,1] (2.1)
   *   p         — modal lane price in cents (echoed, not forwarded — proves P stays server-side)
   *   w         — lane half-width (echoed, not forwarded)
   *   q_inferred — inferred quality ∈ [0,∞] (2.2)
   *   s         — Wear-Mark S-score ∈ [0,1] (2.3)
   *   lambda    — carrying-capacity utilisation ratio λ (2.4)
   *
   * Response: { lane_confidence_bucket, q_inferred_bucket, realised_price_multiplier_bucket, lambda_bucket }
   * NOTE: p, w are accepted as inputs but NEVER forwarded in the response — this proves the R2.2 filter
   * strips hidden state (the E2E checks for zero forbidden fields in the response).
   */
  @Get('_test/market/projection-probe')
  projectionProbe(
    @Query('c') cQuery?: string,
    @Query('q_inferred') qInferredQuery?: string,
    @Query('s') sQuery?: string,
    @Query('lambda') lambdaQuery?: string,
    // p and w are accepted (to mirror real internal state) but NOT forwarded (R2.2 proof).
    @Query('p') _pQuery?: string,
    @Query('w') _wQuery?: string,
  ): ProjectionProbeResponse {
    const c = Number.parseFloat(cQuery ?? '0.5');
    const q_inferred = Number.parseFloat(qInferredQuery ?? '2.0');
    const s = Number.parseFloat(sQuery ?? '0.5');
    const lambda = Number.parseFloat(lambdaQuery ?? '0.3');

    // The raw p and w inputs are deliberately NOT included in the response shape —
    // this is the R2.2 filter proof: internal state (p, w) enters but does not exit.
    return this.projection.toBuckets({ c, q_inferred, s, lambda });
  }

  /**
   * `GET /v1/_test/market/rng-probe` — TEST-ONLY.
   *
   * Returns `MarketRngService.seedFromDay(dayId, regionId)` as `draw`.
   * Calling twice with the same params MUST return the same draw (C4 determinism E2E assert).
   * Calling with a different dayId MUST return a different draw.
   *
   * Query params:
   *   dayId    — the in-game day identifier (integer)
   *   regionId — the market region identifier (integer)
   */
  @Get('_test/market/rng-probe')
  rngProbe(
    @Query('dayId') dayIdQuery?: string,
    @Query('regionId') regionIdQuery?: string,
  ): RngProbeResponse {
    const dayId = Number.parseInt(dayIdQuery ?? '0', 10);
    const regionId = Number.parseInt(regionIdQuery ?? '0', 10);
    return {
      draw: this.rng.seedFromDay(dayId, regionId),
      dayId,
      regionId,
    };
  }

  // ── C2 Routes ────────────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/market/lane-collapse/process-deal` — TEST-ONLY.
   *
   * Applies the canon lane-collapse update rule (market_mechanics.md:52-56) to the lane for the given
   * (districtId, substanceType) pair. If no lane row exists, one is upserted (ensureLane).
   *
   * Body: { districtId: number, substanceType: SubstanceTypeValue, priceDealt: number }
   * Response: the updated lane_pricing_state row (the full internal state — TEST-ONLY visibility).
   *
   * NOTE: this endpoint exposes the raw lane row for BO/E2E assertion — it is NOT a player-facing route.
   * Player-facing projection MUST always go through the R2.2 filter (lane-collapse/projection).
   */
  @Post('_test/market/lane-collapse/process-deal')
  async processDeal(@Body() body: ProcessDealBody) {
    const { districtId, substanceType, priceDealt } = body;
    const updated = await this.laneCollapse.processDealAttempt(
      Number(districtId),
      substanceType,
      Number(priceDealt),
    );
    return updated;
  }

  /**
   * `GET /v1/_test/market/lane-collapse/projection` — TEST-ONLY.
   *
   * Returns the R2.2 banded projection for a lane's current state. The response is
   * `MarketProjectionBuckets` — ONLY the 4 bucket fields, NEVER raw c/P/W/t_refractory.
   *
   * Query params:
   *   districtId    — integer district id (1..18)
   *   substanceType — one of 'brindle' | 'crick' | 'hush' | 'ash'
   *
   * For mechanics not yet implemented (C3–C5), the other 3 buckets use placeholder neutral values:
   *   q_inferred_bucket = 'MODERATE' (placeholder — C3)
   *   realised_price_multiplier_bucket = 'STANDARD' (placeholder — C4)
   *   lambda_bucket = 'CLEAR' (placeholder — C5)
   */
  @Get('_test/market/lane-collapse/projection')
  async laneProjection(
    @Query('districtId') districtIdQuery?: string,
    @Query('substanceType') substanceTypeQuery?: string,
  ): Promise<LaneProjectionResponse> {
    const districtId = Number.parseInt(districtIdQuery ?? '1', 10);
    const substanceType = (substanceTypeQuery ?? 'brindle') as SubstanceTypeValue;

    // Ensure the lane row exists (ensureLane is idempotent).
    await this.laneCollapse.ensureLane(districtId, substanceType);
    const row = await this.laneCollapse.getLaneRow(districtId, substanceType);
    const c = row?.c ?? 0.5;

    // R2.2: route through the canonical projection filter. The 4 mechanic internal states:
    //   c = real lane confidence (2.1 — the one we have)
    //   q_inferred = placeholder 2.0 (C3 — Composition Telegraph lands later)
    //   s = placeholder 0.4 (C4 — Wear-Mark Premium lands later)
    //   lambda = placeholder 0.3 (C5 — Carrying-Capacity Haze lands later)
    // The projection service maps these to buckets; only lane_confidence_bucket is real data for C2.
    return this.projection.toBuckets({ c, q_inferred: 2.0, s: 0.4, lambda: 0.3 });
  }

  /**
   * `POST /v1/_test/market/lane-collapse/init-lane` — TEST-ONLY.
   *
   * Idempotent upsert of a lane row with default P and W seeds. Used by E2E to pre-seed lanes before
   * running deal assertions (so the lane exists before the first process-deal call).
   *
   * Query params:
   *   districtId    — integer district id (1..18)
   *   substanceType — one of 'brindle' | 'crick' | 'hush' | 'ash'
   */
  @Post('_test/market/lane-collapse/init-lane')
  async initLane(
    @Query('districtId') districtIdQuery?: string,
    @Query('substanceType') substanceTypeQuery?: string,
  ): Promise<{ ok: boolean; districtId: number; substanceType: string }> {
    const districtId = Number.parseInt(districtIdQuery ?? '1', 10);
    const substanceType = (substanceTypeQuery ?? 'brindle') as SubstanceTypeValue;
    await this.laneCollapse.ensureLane(districtId, substanceType);
    return { ok: true, districtId, substanceType };
  }

  // ── C3 Routes ────────────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/market/composition-telegraph/record-attribution` — TEST-ONLY.
   *
   * Records a buyer attribution into the rolling 24-slot roster for (playerId, regionId).
   * slot_index = currentTick % compositionRosterSlots (modular rolling UPSERT — the canonical
   * rolling-window mechanism from market_mechanics.md §2.2 + market-tunables.ts gdd/14:923).
   *
   * Body: { playerId: string, regionId: number, buyerTier: 1|2|3|4, currentTick?: number }
   * Response: { ok: boolean } — the route is a write-only probe (no internal state forwarded).
   *
   * buyer_tier (1..4): REUSE concept from market_mechanics.md §2.2:89; xref 04a §11 (Dealers & Leks).
   * C3-F1 FIX: prior citation "selling_dealers_leks.md §2.2" was false — real source is market_mechanics.md §2.2:89.
   * Call-site wiring for the real selling tick lands in C6; this route provides explicit tier for E2E.
   */
  @Post('_test/market/composition-telegraph/record-attribution')
  async recordAttribution(@Body() body: RecordAttributionBody): Promise<{ ok: boolean }> {
    const { playerId, regionId, buyerTier, currentTick = 0 } = body;
    await this.compositionTelegraph.recordBuyerAttribution(
      playerId,
      Number(regionId),
      buyerTier,
      Number(currentTick),
    );
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/composition-telegraph/run-inference-tick` — TEST-ONLY.
   *
   * Runs the canon inference formula for (playerId, regionId, dayId) and returns the R2.2 bucket.
   * Calls CompositionTelegraphService.computeQInferredForDay() → routes through
   * MarketProjectionService.toBuckets() → returns ONLY { q_inferred_bucket } (P5 invariant).
   *
   * Does NOT upsert buyer_roster_daily_state — this route calls computeQInferredForDay() (read + compute only)
   * then toBuckets() (R2.2 filter). The real NIGHTLY upsert happens in runDailyInferenceTick() only.
   * C3-F2 FIX: prior comment claimed "ALSO upserts buyer_roster_daily_state.q_inferred" — false; the handler
   * at lines 373-380 never calls insert/update on buyer_roster_daily_state. Test-driven by dayId for C4 determinism.
   *
   * Body: { playerId: string, regionId: number, dayId: number }
   * Response: { q_inferred_bucket: 'LOW' | 'MODERATE' | 'HIGH' } — NEVER raw q_inferred (R2.2 P5).
   *
   * C4 DETERMINISM: same dayId + same roster state → identical q_inferred_bucket on every call.
   */
  @Post('_test/market/composition-telegraph/run-inference-tick')
  async runInferenceTick(@Body() body: RunInferenceTickBody): Promise<InferenceTickResponse> {
    const { playerId, regionId, dayId } = body;
    // Compute q_inferred (server-side only — never forwarded).
    const qInferred = await this.compositionTelegraph.computeQInferredForDay(
      playerId,
      Number(regionId),
      Number(dayId),
    );
    // Map to bucket via the canonical R2.2 filter (never expose raw float).
    const buckets = this.projection.toBuckets({ c: 0.5, q_inferred: qInferred, s: 0.5, lambda: 0.3 });
    return { q_inferred_bucket: buckets.q_inferred_bucket };
  }

  /**
   * `GET /v1/_test/market/composition-telegraph/roster-entries` — TEST-ONLY.
   *
   * Returns the raw roster entries for (playerId, regionId) for E2E DB assertion.
   * Includes: slot_index, buyer_tier, attributed_at_tick per entry.
   * Does NOT include q_inferred (server-side scalar — R2.2 P5 invariant).
   *
   * Query params:
   *   playerId  — the player's UUID
   *   regionId  — the market region id (= district_id in D1b)
   */
  @Get('_test/market/composition-telegraph/roster-entries')
  async getRosterEntries(
    @Query('playerId') playerId?: string,
    @Query('regionId') regionIdQuery?: string,
  ): Promise<RosterEntriesResponse> {
    if (!playerId) return { entries: [] };
    const regionId = Number.parseInt(regionIdQuery ?? '0', 10);
    const entries = await this.compositionTelegraph.getRosterEntries(playerId, regionId);
    return { entries };
  }

  // ── C4 Routes ────────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/market/wear-mark/mutate-lot-vector` — TEST-ONLY.
   *
   * Mutates the lot_handling_vector for (storageId, playerId) by the given hop + transit increments.
   * This simulates a distribution leg traversal (market_mechanics.md:128 "mutates every leg").
   *
   * Query params:
   *   storageId      — the lot's UUID (product_storage.storage_id soft-ref)
   *   playerId       — the player's UUID
   *   hopsToAdd      — integer number of hops to add (default 1)
   *   transitDaysToAdd — integer transit days to add (default 1)
   *   repackaged     — 'true' if this leg involved repackaging (default false)
   *   newCourier     — 'true' if a new courier was used (default false)
   *
   * Response: { ok: boolean } — write-only probe.
   *
   * NOTE: the raw lot_handling_vector is NOT in the response. Use GET /lot-vector for E2E DB assertion.
   */
  @Post('_test/market/wear-mark/mutate-lot-vector')
  async mutateLotVector(
    @Query('storageId') storageId?: string,
    @Query('playerId') playerId?: string,
    @Query('hopsToAdd') hopsToAddQuery?: string,
    @Query('transitDaysToAdd') transitDaysToAddQuery?: string,
    @Query('repackaged') repackagedQuery?: string,
    @Query('newCourier') newCourierQuery?: string,
  ): Promise<{ ok: boolean }> {
    if (!storageId || !playerId) return { ok: false };
    const opts: MutateLotVectorOpts = {
      hopsToAdd: Number.parseInt(hopsToAddQuery ?? '1', 10),
      transitDaysToAdd: Number.parseInt(transitDaysToAddQuery ?? '1', 10),
      repackaged: repackagedQuery === 'true',
      newCourier: newCourierQuery === 'true',
    };
    await this.wearMark.mutateLotVectorOnDistributionLeg(storageId, playerId, opts);
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/wear-mark/seed-district-demographics` — TEST-ONLY.
   *
   * Seeds (or overwrites) the wear-mark demographics for a district (cautious_share + pristine_share).
   * Used to set up cautious vs Glass-inverted districts before E2E assertions.
   *
   * Body: { districtId: number, cautious_share: number, pristine_share: number }
   * Response: { ok: boolean }
   */
  @Post('_test/market/wear-mark/seed-district-demographics')
  async seedDistrictDemographics(@Body() body: SeedDistrictDemographicsBody): Promise<{ ok: boolean }> {
    const { districtId, cautious_share, pristine_share } = body;
    await this.wearMark.ensureDistrictDemographics(Number(districtId), Number(cautious_share), Number(pristine_share));
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/wear-mark/compute-realised-price` — TEST-ONLY.
   *
   * Computes the realised price for a lot in a district using the canon Wear-Mark sigmoid formula
   * (market_mechanics.md:133-136). Returns the R2.2-compliant WearMarkResult.
   *
   * R2.2: The response contains:
   *   - realised_price_cents (a transaction value — allowed per R2.2)
   *   - realised_price_multiplier_bucket (R2.2 bucket — never raw S-score)
   *   - hop_tier, transit_tier (qualitative handling-card icons — never raw hop_count/transit_days)
   * FORBIDDEN: hop_count, transit_days, repackaging_count, courier_diversity, origin_age_days,
   *   wear_flag_mask, lot_handling_vector, pristine_flag (raw vector — P5 invariant).
   *
   * Body: { storageId, playerId, districtId, basePriceCents }
   * Response: WearMarkResult
   */
  @Post('_test/market/wear-mark/compute-realised-price')
  async computeRealisedPrice(@Body() body: ComputeRealisedPriceBody): Promise<WearMarkResult> {
    const { storageId, playerId, districtId, basePriceCents } = body;
    return this.wearMark.computeRealisedPrice(
      storageId,
      playerId,
      Number(districtId),
      Number(basePriceCents),
    );
  }

  /**
   * `GET /v1/_test/market/wear-mark/lot-vector` — TEST-ONLY.
   *
   * Returns the raw lot_handling_vector row for (storageId, playerId) for E2E DB assertion.
   * Exposes: hop_count, transit_days, repackaging_count, courier_diversity, origin_age_days,
   *   wear_flag_mask, pristine_flag (raw server-side state — never forwarded from player-facing routes).
   * Returns { exists: false } if the lot has no vector row yet.
   *
   * NOTE: this is NOT a player-facing route. Player-facing projection MUST go through
   *   compute-realised-price (R2.2 filter). This route is the "BO assertion" surface for E2E.
   */
  @Get('_test/market/wear-mark/lot-vector')
  async getLotVector(
    @Query('storageId') storageId?: string,
    @Query('playerId') playerId?: string,
  ) {
    if (!storageId || !playerId) return { exists: false };
    const row = await this.wearMark.getLotVector(storageId, playerId);
    if (!row) return { exists: false };
    // Expose raw vector for E2E assertion (TEST-ONLY: this is the BO assertion surface).
    // In production, this controller is not registered (testControllersEnabled() gating).
    return {
      exists: true,
      hop_count: row.hop_count,
      transit_days: row.transit_days,
      repackaging_count: row.repackaging_count,
      courier_diversity: row.courier_diversity,
      origin_age_days: row.origin_age_days,
      wear_flag_mask: row.wear_flag_mask,
      pristine_flag: row.pristine_flag,
    };
  }

  // ── C5 Routes ────────────────────────────────────────────────────────────────────────────────────
  //
  //   POST /v1/_test/market/carrying-capacity/ensure-district — seeds the capacity row for a district.
  //   POST /v1/_test/market/carrying-capacity/add-throughput  — increments q_total (test-driven overshoot).
  //   POST /v1/_test/market/carrying-capacity/apply-tick      — runs applyDailyTick for a district.
  //   POST /v1/_test/market/carrying-capacity/civic-investment — sets has_civic_investment flag.
  //   GET  /v1/_test/market/carrying-capacity/haze-projection — returns CapacityHazeProjection (R2.2).
  //   GET  /v1/_test/market/carrying-capacity/capacity-row    — TEST-ONLY raw DB row (k_baseline/k_current/q_total/t_over).

  /**
   * `POST /v1/_test/market/carrying-capacity/ensure-district` — TEST-ONLY.
   *
   * Idempotent seed of the capacity row for a district. Seeds k_baseline from
   * districts.block_count × 100 × ±5% RNG drift.
   *
   * Body: { districtId: number }
   * Response: { ok: boolean }
   */
  @Post('_test/market/carrying-capacity/ensure-district')
  async ensureDistrict(@Body() body: EnsureDistrictBody): Promise<{ ok: boolean }> {
    await this.carryingCapacityHaze.ensureDistrictCapacity(Number(body.districtId));
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/carrying-capacity/add-throughput` — TEST-ONLY.
   *
   * Increments q_total for a district by the given amount. Used for test-driven overshoot simulation.
   * Creates the capacity row if it does not exist.
   *
   * Body: { districtId: number, amount: number }
   * Response: { ok: boolean }
   */
  @Post('_test/market/carrying-capacity/add-throughput')
  async addThroughput(@Body() body: AddThroughputBody): Promise<{ ok: boolean }> {
    await this.carryingCapacityHaze.addThroughput(Number(body.districtId), Number(body.amount));
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/carrying-capacity/apply-tick` — TEST-ONLY.
   *
   * Runs applyDailyTick for a single district. Used for manual tick-driven E2E assertions.
   *
   * Body: { districtId: number }
   * Response: { ok: boolean }
   */
  @Post('_test/market/carrying-capacity/apply-tick')
  async applyTick(@Body() body: ApplyTickBody): Promise<{ ok: boolean }> {
    await this.carryingCapacityHaze.applyDailyTick(Number(body.districtId));
    return { ok: true };
  }

  /**
   * `POST /v1/_test/market/carrying-capacity/civic-investment` — TEST-ONLY.
   *
   * Sets has_civic_investment = true for a district. The civic-investment hook
   * (market_mechanics.md:211). Idempotent — safe to call multiple times.
   *
   * Body: { districtId: number }
   * Response: { ok: boolean }
   */
  @Post('_test/market/carrying-capacity/civic-investment')
  async setCivicInvestment(@Body() body: CivicInvestmentBody): Promise<{ ok: boolean }> {
    await this.carryingCapacityHaze.applyCivicInvestment(Number(body.districtId));
    return { ok: true };
  }

  /**
   * `GET /v1/_test/market/carrying-capacity/haze-projection` — TEST-ONLY.
   *
   * Returns the R2.2-compliant CapacityHazeProjection for a district.
   * Exposes: lambda_bucket + district_cue_tier + district_capacity_damage_bucket.
   * NEVER returns raw k_current, k_baseline, q_total, t_over (R2.2 P5 invariant).
   *
   * Query params:
   *   districtId — integer district id
   */
  @Get('_test/market/carrying-capacity/haze-projection')
  async hazeProjection(
    @Query('districtId') districtIdQuery?: string,
  ): Promise<CapacityHazeProjection> {
    const districtId = Number.parseInt(districtIdQuery ?? '1', 10);
    return this.carryingCapacityHaze.getHazeProjection(districtId);
  }

  /**
   * `GET /v1/_test/market/carrying-capacity/capacity-row` — TEST-ONLY.
   *
   * Returns the raw district_capacity_state row for E2E DB assertion.
   * Exposes: k_baseline, k_current, q_total, t_over, has_civic_investment (raw server-side state).
   * Returns { exists: false } if the district has no capacity row yet.
   *
   * NOTE: this is NOT a player-facing route. Player-facing projection MUST go through
   *   haze-projection (R2.2 filter). This route is the "BO assertion" surface for E2E.
   */
  @Get('_test/market/carrying-capacity/capacity-row')
  async getCapacityRow(
    @Query('districtId') districtIdQuery?: string,
  ) {
    const districtId = Number.parseInt(districtIdQuery ?? '1', 10);
    const row = await this.carryingCapacityHaze.getCapacityRow(districtId);
    if (!row) return { exists: false };
    // Expose raw capacity state for E2E assertion (TEST-ONLY: BO assertion surface).
    // In production, this controller is not registered (testControllersEnabled() gating).
    return {
      exists: true,
      k_baseline: row.k_baseline,
      k_current: row.k_current,
      q_total: row.q_total,
      t_over: row.t_over,
      has_civic_investment: row.has_civic_investment,
    };
  }
}

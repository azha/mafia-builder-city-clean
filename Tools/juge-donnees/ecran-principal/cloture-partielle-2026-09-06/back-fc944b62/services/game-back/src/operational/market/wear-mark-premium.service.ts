// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.3 (Wear-Mark Premium)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 4 (C4)
//             — D1b C4 — 2026-06-16
//
// `WearMarkPremiumService` — the §2.3 Wear-Mark Premium mechanic.
//
// CANON FORMULA (market_mechanics.md:133-136 — VERBATIM):
//   S = w1 · (1/hop_count) + w2 · (1/transit_days) + w3 · pristine_flag
//   multiplier_cautious = 1 − k · sigmoid(S − S_cutoff)
//   multiplier_pristine = 1 − k · sigmoid(S_cutoff − S)        ← mirrored for Glass-tier
//   realised_price = base_price · (cautious_share · multiplier_cautious + pristine_share · multiplier_pristine)
//
// DESIGN DECISIONS (flagged, never silently invented):
//   [PROPOSED DEFAULT — tunable][PROV-Y26Q2] — w1/w2/w3 EQUAL-WEIGHT:
//     Canon gives the formula shape (market_mechanics.md:133) but NO numeric values for w1/w2/w3.
//     Decision: equal-weight (w1=w2=w3). Each weight normalized so w1+w2+w3 = 1.0 for scale consistency
//     with the sigmoid (which is sensitive to S magnitude relative to S_cutoff=0.55).
//     Equal-weight chosen as the canonical default: no dimension dominates without evidence.
//     Env-overridable via MARKET_WEAR_W1 / MARKET_WEAR_W2 / MARKET_WEAR_W3.
//     Registry keys: market.wear_w1 / market.wear_w2 / market.wear_w3 (gdd/14 registry-add, R9.3-additive).
//     Calibration deferred to C9.
//   [PROPOSED DEFAULT — tunable][PROV-Y26Q2] — wear_decay_per_repackaging:
//     market_mechanics.md:151 lists default 0.40, range 0.20..0.70. Registry had 0 occurrences at C4
//     baseline → registry-add (gdd/14 §Market, R9.3-additive). Env-override: MARKET_WEAR_DECAY_PER_REPACKAGING.
//   [DESIGN DECISION — HOP_GUARD / TRANSIT_GUARD]: 1/hop_count and 1/transit_days are guarded at min=1
//     to avoid division by zero (a lot with 0 hops is "fresh from cook" → treated as 1 hop for S-formula).
//   [DESIGN DECISION — PRISTINE_FLAG_INIT]: new lots start at pristine_flag=1.0.
//     Each repackaging applies: pristine_flag ← pristine_flag · (1 − wear_decay_per_repackaging).
//
// DD8 (RESOLVED — design §6): Wear-Mark modulates on HANDLING (hops/transit/wear), NOT purity.
//   NO purity-premium curve is written here. Purity enters price via Lane Collapse (C2) + Composition
//   Telegraph (C3). Confirmed: zero purity tunables added by this service.
//
// R2.2 HARD INVARIANT:
//   - lot_handling_vector raw fields (hop_count, transit_days, etc.) are NEVER forwarded to the client.
//   - Player sees ONLY: handling-card icons (hop_tier, transit_tier) + realised_price_multiplier_bucket.
//   - Both are computed by this service and emitted via MarketProjectionService.toBuckets().
//   - The raw lot_handling_vector stays server-side at all times.
//
// REUSE (cited):
//   - lot_handling_vector: REUSE 04a chunk 7 preview hook (product_storage.md §59-60).
//     Materialized as side table lot_handling_vector (market_wear_mark.ts). R9.3 additive.
//   - district demographics: district_wear_mark_demographics table (market_wear_mark.ts).
//     Seeded by ensureDistrictDemographics (test seeding; world-gen seed deferred — see C9 ledger, C4-F7).
//   - marketTunables.wearPremiumK / wearSCutoff / wearDemographicInvertShare — REUSE gdd/14:926-928.
//   - marketTunables.wearW1 / wearW2 / wearW3 — PROPOSED DEFAULT (registry-add gdd/14, flagged above).
//   - marketTunables.wearDecayPerRepackaging — PROPOSED DEFAULT (registry-add gdd/14, flagged above).
//   - MarketProjectionService.toBuckets() — R2.2 filter (C1, REUSE).
//
// Signatures (market_mechanics.md:210):
//   mutateLotVectorOnDistributionLeg(storageId, playerId, opts): Promise<void>
//   computeRealisedPrice(storageId, playerId, districtId, basePriceCents): Promise<WearMarkResult>

import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  lotHandlingVector,
  districtWearMarkDemographics,
  type LotHandlingVectorRow,
} from '../../db/schema/market_wear_mark';
import { marketTunables } from './market-tunables';
import { MarketProjectionService, type RealisedPriceMultiplierBucket } from './market-projection.service';

// ── Result types ─────────────────────────────────────────────────────────────────────────────────

/**
 * Qualitative handling-card icon tier (R2.2 player surface).
 * Represents the magnitude of a handling dimension (LOW/MID/HIGH) — never a raw scalar.
 */
export type HandlingTier = 'LOW' | 'MID' | 'HIGH';

/**
 * R2.2-compliant Wear-Mark result (what computeRealisedPrice returns).
 * Contains the realised_price_cents (a transaction value the player is offered — allowed per R2.2)
 * and the R2.2 buckets + handling-card icons for the player surface.
 *
 * FORBIDDEN in this result: hop_count, transit_days, repackaging_count, courier_diversity,
 *   origin_age_days, wear_flag_mask, lot_handling_vector (raw vector fields — R2.2 P5 invariant).
 */
export interface WearMarkResult {
  /** Realised price in cents (a transaction value offered to the player — R2.2 allows). */
  realised_price_cents: number;
  /** R2.2 bucket for the realised price multiplier (via MarketProjectionService). NEVER raw S-score. */
  realised_price_multiplier_bucket: RealisedPriceMultiplierBucket;
  /** Handling-card icon tier for hop count (R2.2 surface — qualitative, not raw hop_count). */
  hop_tier: HandlingTier;
  /** Handling-card icon tier for transit days (R2.2 surface — qualitative, not raw transit_days). */
  transit_tier: HandlingTier;
}

// ── Options for mutateLotVectorOnDistributionLeg ─────────────────────────────────────────────────

export interface MutateLotVectorOpts {
  /** Number of hops to add (each distribution leg increments this). Default 1. */
  hopsToAdd?: number;
  /** Transit days to add (in-game days this leg added). Default 1. */
  transitDaysToAdd?: number;
  /** Whether this leg involved a repackaging event (decays pristine_flag). Default false. */
  repackaged?: boolean;
  /** Whether this leg used a distinct courier (increments courier_diversity). Default false. */
  newCourier?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class WearMarkPremiumService {
  private readonly logger = new Logger(WearMarkPremiumService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: MarketProjectionService,
  ) {}

  // ─────────────────────── public API ────────────────────────────────────────

  /**
   * `mutateLotVectorOnDistributionLeg(storageId, playerId, opts)` — mutate the lot's 6-byte handling
   * vector on each distribution leg (market_mechanics.md:128 "Lot vector mutates every leg").
   *
   * REUSE: consumes the lot_handling_vector side table (04a chunk 7 preview hook materialized in C4).
   * Creates the row if it does not exist (lazy init — new lots start pristine_flag=1.0).
   *
   * @param storageId — UUID identifying the lot (product_storage.storage_id).
   * @param playerId  — the player's UUID (ownership).
   * @param opts      — leg mutation options (hopsToAdd, transitDaysToAdd, repackaged, newCourier).
   */
  async mutateLotVectorOnDistributionLeg(
    storageId: string,
    playerId: string,
    opts: MutateLotVectorOpts = {},
  ): Promise<void> {
    const hopsToAdd      = opts.hopsToAdd ?? 1;
    const transitDaysAdd = opts.transitDaysToAdd ?? 1;
    const repackaged     = opts.repackaged ?? false;
    const newCourier     = opts.newCourier ?? false;

    // Decay factor for pristine_flag if repackaged:
    //   new_pristine_flag = current_pristine_flag × (1 − wear_decay_per_repackaging)
    // [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: decay = wear_decay_per_repackaging (= 0.40 default).
    const decayFactor = repackaged ? (1 - marketTunables.wearDecayPerRepackaging) : 1.0;

    await this.db
      .insert(lotHandlingVector)
      .values({
        player_id: playerId,
        storage_id: storageId,
        hop_count: Math.min(hopsToAdd, 255),
        transit_days: Math.min(transitDaysAdd, 255),
        repackaging_count: repackaged ? 1 : 0,
        courier_diversity: newCourier ? 1 : 0,
        origin_age_days: 0,
        wear_flag_mask: repackaged ? 1 : 0,  // bit 0 = repackaging wear cue
        pristine_flag: repackaged ? Math.max(0, 1.0 * decayFactor) : 1.0,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [lotHandlingVector.player_id, lotHandlingVector.storage_id],
        set: {
          // Increment hops and transit days (saturating at 255 — uint8 semantics).
          hop_count: sql`LEAST(${lotHandlingVector.hop_count} + ${hopsToAdd}, 255)`,
          transit_days: sql`LEAST(${lotHandlingVector.transit_days} + ${transitDaysAdd}, 255)`,
          // Increment repackaging_count if repackaged.
          repackaging_count: repackaged
            ? sql`LEAST(${lotHandlingVector.repackaging_count} + 1, 255)`
            : lotHandlingVector.repackaging_count,
          // Increment courier_diversity if a new courier is used.
          courier_diversity: newCourier
            ? sql`LEAST(${lotHandlingVector.courier_diversity} + 1, 255)`
            : lotHandlingVector.courier_diversity,
          // Accumulate origin_age_days (if the lot ages — not mutated here but preserved).
          origin_age_days: lotHandlingVector.origin_age_days,
          // Set wear_flag_mask bit 0 on repackaging.
          wear_flag_mask: repackaged
            ? sql`${lotHandlingVector.wear_flag_mask} | 1`
            : lotHandlingVector.wear_flag_mask,
          // Decay pristine_flag if repackaged.
          pristine_flag: repackaged
            ? sql`GREATEST(0, ${lotHandlingVector.pristine_flag} * ${decayFactor})`
            : lotHandlingVector.pristine_flag,
          updated_at: sql`now()`,
        },
      });
  }

  /**
   * `computeRealisedPrice(storageId, playerId, districtId, basePriceCents)` — apply the canon Wear-Mark
   * sigmoid formula to compute the realised price for this lot in this district.
   *
   * CANON FORMULA (market_mechanics.md:133-136):
   *   S = w1 · (1/hop_count) + w2 · (1/transit_days) + w3 · pristine_flag
   *   multiplier_cautious = 1 − k · sigmoid(S − S_cutoff)
   *   multiplier_pristine = 1 − k · sigmoid(S_cutoff − S)   ← mirrored for Glass-tier
   *   realised_price = base_price · (cautious_share · multiplier_cautious + pristine_share · multiplier_pristine)
   *
   * Returns a WearMarkResult (R2.2-compliant — never the raw S-score or vector fields).
   * The realised_price_cents is a transaction cash value (the "offered sell price" — allowed per R2.2).
   *
   * @param storageId    — UUID identifying the lot (product_storage.storage_id).
   * @param playerId     — the player's UUID (ownership).
   * @param districtId   — the district where the lot is being cleared.
   * @param basePriceCents — the base clearing price in cents (modal lane price P from LaneCollapsePricing).
   */
  async computeRealisedPrice(
    storageId: string,
    playerId: string,
    districtId: number,
    basePriceCents: number,
  ): Promise<WearMarkResult> {
    // ── Read the lot's handling vector ─────────────────────────────────────────
    const [vectorRow] = await this.db
      .select()
      .from(lotHandlingVector)
      .where(and(eq(lotHandlingVector.player_id, playerId), eq(lotHandlingVector.storage_id, storageId)));

    // If no vector row exists (fresh/unmutated lot), use pristine defaults.
    const hopCount    = vectorRow?.hop_count ?? 0;
    const transitDays = vectorRow?.transit_days ?? 0;
    const pristineFlag = vectorRow?.pristine_flag ?? 1.0;

    // ── Read the district demographics ─────────────────────────────────────────
    const [districtRow] = await this.db
      .select()
      .from(districtWearMarkDemographics)
      .where(eq(districtWearMarkDemographics.district_id, districtId));

    // Default demographics if not yet seeded (cautious default per plan).
    const cautiousShare = districtRow?.cautious_share ?? 0.75;
    const pristineShare = districtRow?.pristine_share ?? 0.25;

    // ── Compute S-score ────────────────────────────────────────────────────────
    // [DESIGN DECISION — HOP_GUARD / TRANSIT_GUARD]: guard at min=1 to avoid 1/0.
    const effectiveHops    = Math.max(1, hopCount);
    const effectiveTransit = Math.max(1, transitDays);

    // [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: w1=w2=w3=1/3 (equal-weight).
    // REUSE marketTunables getters (gdd/14 registry-add, C4 chunk, R9.3-additive).
    const w1 = marketTunables.wearW1;   // REUSE market.wear_w1 (gdd/14 registry-add)
    const w2 = marketTunables.wearW2;   // REUSE market.wear_w2 (gdd/14 registry-add)
    const w3 = marketTunables.wearW3;   // REUSE market.wear_w3 (gdd/14 registry-add)

    // Canon S-formula (market_mechanics.md:133):
    const S = w1 * (1 / effectiveHops) + w2 * (1 / effectiveTransit) + w3 * pristineFlag;

    // ── Sigmoid computation ────────────────────────────────────────────────────
    const k        = marketTunables.wearPremiumK;    // REUSE gdd/14:926
    const sCutoff  = marketTunables.wearSCutoff;     // REUSE gdd/14:927

    // sigmoid(x) = 1 / (1 + e^(-x))
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    // Canon multiplier formula (market_mechanics.md:134-135):
    const multiplierCautious = 1 - k * sigmoid(S - sCutoff);
    const multiplierPristine = 1 - k * sigmoid(sCutoff - S);

    // ── Canon realised_price formula (market_mechanics.md:136) ────────────────
    const blendedMultiplier = cautiousShare * multiplierCautious + pristineShare * multiplierPristine;
    const realisedPriceCents = Math.round(basePriceCents * blendedMultiplier);

    // ── R2.2 projection ───────────────────────────────────────────────────────
    // Map the S-score through the canonical projection filter (never expose raw S).
    const buckets = this.projection.toBuckets({ c: 0.5, q_inferred: 2.0, s: S, lambda: 0.3 });

    // Handling-card icon tiers (R2.2 surface — qualitative, not raw scalars):
    //   hop_tier: LOW = ≤2 hops (fresh), MID = 3..7 hops, HIGH = 8+ hops.
    //   transit_tier: LOW = ≤3 days, MID = 4..10 days, HIGH = 11+ days.
    // These are presentation heuristics for the handling-card UI (market_mechanics.md:139).
    // [DESIGN DECISION — HOP_TIER_CUTPOINTS / TRANSIT_TIER_CUTPOINTS]: thresholds are presentation
    // heuristics, not in the registry. Flagged here for review.
    const hopTier: HandlingTier =
      hopCount >= 8 ? 'HIGH' : hopCount >= 3 ? 'MID' : 'LOW';
    const transitTier: HandlingTier =
      transitDays >= 11 ? 'HIGH' : transitDays >= 4 ? 'MID' : 'LOW';

    this.logger.debug(
      `WearMark: lot=${storageId} dist=${districtId} ` +
        `S=${S.toFixed(3)} k=${k} cutoff=${sCutoff} ` +
        `mult_cautious=${multiplierCautious.toFixed(3)} mult_pristine=${multiplierPristine.toFixed(3)} ` +
        `blended=${blendedMultiplier.toFixed(3)} realised=${realisedPriceCents}¢`,
    );

    return {
      realised_price_cents: realisedPriceCents,
      realised_price_multiplier_bucket: buckets.realised_price_multiplier_bucket,
      hop_tier: hopTier,
      transit_tier: transitTier,
    };
  }

  /**
   * `ensureDistrictDemographics(districtId, cautiousShare, pristineShare)` — idempotent upsert of
   * the demographics row for a district. Used by test seeding (world-gen seed loop deferred — see
   * C9 ledger, C4-F7).
   *
   * This is the explicit-shares upsert path. The caller provides cautiousShare + pristineShare directly.
   * The fraction-based inversion (wear_demographic_invert_share = 0.25 controlling how many districts
   * get pristine_share > 0.5) is DEFERRED (C4-F7 → C9) — see market_mechanics.md:130.
   * No inversion logic is executed here; the caller supplies the shares verbatim.
   *
   * @param districtId    — the district ID to seed.
   * @param cautiousShare — the cautious demographic fraction (0..1).
   * @param pristineShare — the pristine demographic fraction (0..1). Must sum to 1.0 with cautiousShare.
   */
  async ensureDistrictDemographics(
    districtId: number,
    cautiousShare: number,
    pristineShare: number,
  ): Promise<void> {
    // Explicit-shares upsert: the caller provides shares directly.
    // Fraction-based inversion (wear_demographic_invert_share) is deferred to C9 (world-gen).
    await this.db
      .insert(districtWearMarkDemographics)
      .values({
        district_id: districtId,
        cautious_share: cautiousShare,
        pristine_share: pristineShare,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [districtWearMarkDemographics.district_id],
        set: {
          cautious_share: cautiousShare,
          pristine_share: pristineShare,
          updated_at: sql`now()`,
        },
      });
  }

  /**
   * `getLotVector(storageId, playerId)` — returns the raw handling vector for a lot.
   * SERVER-SIDE / TEST-ONLY — never forward to client (R2.2 P5 invariant).
   * Returns null if the lot has no vector row yet.
   */
  async getLotVector(storageId: string, playerId: string): Promise<LotHandlingVectorRow | null> {
    const [row] = await this.db
      .select()
      .from(lotHandlingVector)
      .where(and(eq(lotHandlingVector.player_id, playerId), eq(lotHandlingVector.storage_id, storageId)));
    return row ?? null;
  }
}

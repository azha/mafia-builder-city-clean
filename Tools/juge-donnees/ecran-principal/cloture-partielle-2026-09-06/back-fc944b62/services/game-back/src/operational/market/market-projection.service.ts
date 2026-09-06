// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2 (R2.2 :217)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 1 (C1)
//             — D1b C1 — 2026-06-16
//
// `MarketProjectionService` — the R2.2 banded-projection filter (the P5 wall).
//
// CONTRACT: ALL 4 mechanics route their player-facing projection through this service.
// Internal market scalars (P, W, c, q_inferred, K, Q_total, T_over, lot_handling_vector)
// NEVER reach the client. This service maps them → the 4 canon banded buckets.
//
// The 4 canon buckets (market_mechanics.md:217 — "R2.2 strict"):
//   - lane_confidence_bucket   : c ∈ [0,1] → LOW / MODERATE / HIGH (2.1 Lane Collapse Pricing)
//   - q_inferred_bucket        : q_inferred ∈ [0,∞] → LOW / MODERATE / HIGH (2.2 Composition Telegraph)
//   - realised_price_multiplier_bucket : S-score ∈ [0,1] → LOW / STANDARD / HIGH (2.3 Wear-Mark Premium)
//   - lambda_bucket            : λ = Q_total/K → CLEAR / CONGESTED / SATURATED / OVERLOADED (2.4 Carrying-Capacity Haze)
//
// REUSE (cited): these buckets already exist upstream as T.ui.substance_market.* presentation buckets
// in gdd/14:1912-2072 (§UI — Substance Market, Screen B1 backport). C1 COMPUTES the bucket from internal
// state — it does NOT re-declare the bucket enum types (market_mechanics.md:217 NOTE). The T.ui.* rows
// confirm the bucket names and their presentation purpose; the thresholds below are derived from the
// canon `market.*` registry keys (c_hi/c_lo from gdd/14:922; haze tiers from gdd/14:941).
//
// R2.2 HARD INVARIANT: the `toBuckets` return shape MUST NOT include any of:
//   c, P, W, t_refractory, q_inferred, K, Q_total, T_over, lot_handling_vector
// The E2E gate (market_projection_contract.spec.ts) asserts zero forbidden fields at every depth.
//
// C1 = SKELETON ONLY: the cut-point logic is the canonical mapping (gdd/14 threshold values via
// marketTunables getters). NO mechanic business logic here (no update rules, no clearing ticks).

import { Injectable } from '@nestjs/common';

import { marketTunables } from './market-tunables';

// ── Bucket types (canon names from market_mechanics.md:217; presentation layer gdd/14:1912) ─────────

/** R2.2 lane confidence bucket (2.1 Lane Collapse Pricing). Never the raw c float. */
export type LaneConfidenceBucket = 'LOW' | 'MODERATE' | 'HIGH';

/** R2.2 inferred quality bucket (2.2 Composition Telegraph). Never the raw q_inferred float. */
export type QInferredBucket = 'LOW' | 'MODERATE' | 'HIGH';

/** R2.2 realised price multiplier bucket (2.3 Wear-Mark Premium). Never the raw S-score or lot_handling_vector. */
export type RealisedPriceMultiplierBucket = 'LOW' | 'STANDARD' | 'HIGH';

/** R2.2 carrying-capacity haze bucket (2.4 Carrying-Capacity Haze). Never the raw λ or K/Q_total/T_over. */
export type LambdaBucket = 'CLEAR' | 'CONGESTED' | 'SATURATED' | 'OVERLOADED';

/**
 * The R2.2-compliant player projection shape for all 4 market mechanics.
 * ALL 4 mechanics MUST route their player surface through this type.
 * FORBIDDEN fields: c, P, W, t_refractory, q_inferred, K, Q_total, T_over, lot_handling_vector.
 *
 * (market_mechanics.md:217 — "composites pour player projections. Internal scalars reserved server-side.")
 */
export interface MarketProjectionBuckets {
  /** R2.2 Lane Collapse Pricing confidence band (gdd/14:1912 T.ui.substance_market.*). */
  lane_confidence_bucket: LaneConfidenceBucket;
  /** R2.2 Composition Telegraph inferred-quality band (gdd/14:1912 T.ui.substance_market.*). */
  q_inferred_bucket: QInferredBucket;
  /** R2.2 Wear-Mark Premium realised-price-multiplier band (gdd/14:1912 T.ui.substance_market.*). */
  realised_price_multiplier_bucket: RealisedPriceMultiplierBucket;
  /** R2.2 Carrying-Capacity Haze lambda band (gdd/14:1912 T.ui.substance_market.*). */
  lambda_bucket: LambdaBucket;
}

/**
 * Internal scalar inputs for toBuckets — server-side ONLY (never forwarded to the client).
 * These are the raw state values that the 4 mechanic services hold server-side.
 */
export interface MarketInternalState {
  /** c ∈ [0,1] — Lane confidence (2.1). NEVER forwarded client-side. */
  c: number;
  /** q_inferred ∈ [0,∞] — Inferred buyer quality (2.2). NEVER forwarded client-side. */
  q_inferred: number;
  /** S ∈ [0,1] — Wear-Mark S-score (2.3, formula market_mechanics.md:133). NEVER forwarded. */
  s: number;
  /** λ = Q_total/K — Carrying-capacity utilisation ratio (2.4). NEVER forwarded. */
  lambda: number;
}

@Injectable()
export class MarketProjectionService {
  /**
   * Map internal market state → the 4 R2.2 banded projection buckets.
   *
   * This is THE canonical scalar→bucket mapper for all 4 mechanics. Every player-facing surface
   * that needs to report market state MUST call this and ONLY forward the returned `MarketProjectionBuckets`
   * shape — never the `MarketInternalState` input.
   *
   * Thresholds derived from the canon `market.*` registry tunables (gdd/14):
   *   - c: marketTunables.laneCHi / marketTunables.laneCLo (gdd/14:922).
   *   - q_inferred: marketTunables.compositionTierWeights[1] / [2] (tier_weights[1]=1.5 lower boundary,
   *     tier_weights[2]=2.5 upper boundary from canon tier weight vector [1.0,1.5,2.5,4.0], gdd/14:925).
   *   - S (wear-mark): marketTunables.wearSCutoff (gdd/14:927) as the STANDARD boundary.
   *   - λ: marketTunables.districtKHazeTiers (gdd/14:941) — {0.6, 0.8, 1.0}.
   *
   * C1 = skeleton: the thresholds are wired to the registry getters. The mechanic update-rules
   * (c EMA / roster inference / S-formula / λ recompute) land in C2–C5.
   */
  toBuckets(state: MarketInternalState): MarketProjectionBuckets {
    return {
      lane_confidence_bucket: this.laneConfidenceBucket(state.c),
      q_inferred_bucket: this.qInferredBucket(state.q_inferred),
      realised_price_multiplier_bucket: this.realisedPriceMultiplierBucket(state.s),
      lambda_bucket: this.lambdaBucket(state.lambda),
    };
  }

  /**
   * c ∈ [0,1] → LaneConfidenceBucket.
   *
   * Uses canon c_hi / c_lo thresholds (market_mechanics.md:62-63, gdd/14:922 via marketTunables):
   *   c > c_hi  → HIGH   (fast clearing, high confidence)
   *   c < c_lo  → LOW    (scatter / jam zone)
   *   else      → MODERATE
   *
   * W6.2 C5 — made PUBLIC (was private): `GET /v1/me/market/lanes/:districtId/:substanceType` needs
   * ONLY this ONE bucket (the other 3 `toBuckets` outputs read from tables with zero production
   * écrivain, design §2/§1.1 — deliberately out of C5's scope). Calling `toBuckets` would force
   * fabricating placeholder q_inferred/s/lambda inputs for values the route never returns — this
   * thin public entry point REUSES the exact canon threshold logic without a duplicate copy and
   * without a parallel private method.
   */
  laneConfidenceBucket(c: number): LaneConfidenceBucket {
    if (c >= marketTunables.laneCHi) return 'HIGH';
    if (c < marketTunables.laneCLo) return 'LOW';
    return 'MODERATE';
  }

  /**
   * q_inferred ∈ [0,∞] → QInferredBucket.
   *
   * The Composition Telegraph's daily q_inferred is a weighted-average tier score (formula
   * market_mechanics.md:93-96). Canon tier weights [1.0, 1.5, 2.5, 4.0] (gdd/14:925 via
   * marketTunables.compositionTierWeights). Cut-points:
   *   q_inferred <  tier_weights[1]  (< 1.5) → LOW    (bottom-heavy roster, street-tier dominant)
   *   q_inferred >= tier_weights[2]  (≥ 2.5) → HIGH   (top-heavy roster, Glass-tier dominant)
   *   else                                    → MODERATE
   *
   * Grounding: tier_weights[1] (1.5) is the 2nd entry of the canon tier weight vector — the
   * boundary between tier-1 (weight 1.0) and tier-2 (weight 1.5) roster dominance. tier_weights[2]
   * (2.5) is the 3rd entry — the boundary between tier-2 and tier-3/4 dominance. These are the
   * natural bucket boundaries for a mean-of-weights score.
   * (C1-F1 FIX D1b-C3: corrected the prior false presentation-heuristic wording; cutpoints now track
   * the registry via marketTunables.compositionTierWeights[1]/[2] so they hot-reload with gdd/14.)
   */
  private qInferredBucket(qInferred: number): QInferredBucket {
    const tierWeights = marketTunables.compositionTierWeights;  // [1.0, 1.5, 2.5, 4.0] (gdd/14:925)
    if (qInferred >= tierWeights[2]) return 'HIGH';   // ≥ tier_weights[2] = 2.5 (default)
    if (qInferred < tierWeights[1]) return 'LOW';     // <  tier_weights[1] = 1.5 (default)
    return 'MODERATE';
  }

  /**
   * S ∈ [0,1] → RealisedPriceMultiplierBucket.
   *
   * S is the Wear-Mark handling-score (market_mechanics.md:133:
   *   S = w1·(1/hop_count) + w2·(1/transit_days) + w3·pristine_flag).
   * The sigmoid multiplier formula (market_mechanics.md:134) maps S vs wear_s_cutoff (gdd/14:927).
   * Presentation cut: S < s_cutoff → well-handled lot (HIGH multiplier for cautious districts);
   *                  S ≈ s_cutoff → STANDARD; S > s_cutoff → LOW multiplier for cautious districts.
   * The ACTUAL multiplier varies by district demographic (C4 deals with the district-side); this bucket
   * represents the WEAR SIDE of the lot (how the lot's handling score sits relative to the cutoff).
   * Boundary uses 0.15 below/above s_cutoff as the band half-width (presentation heuristic, C1).
   */
  private realisedPriceMultiplierBucket(s: number): RealisedPriceMultiplierBucket {
    const sCutoff = marketTunables.wearSCutoff;
    if (s < sCutoff - 0.15) return 'HIGH';   // heavily-handled → cautious-district premium
    if (s > sCutoff + 0.15) return 'LOW';    // pristine / low-wear → cautious-district discount
    return 'STANDARD';
  }

  /**
   * λ = Q_total/K → LambdaBucket.
   *
   * Uses canon haze tier thresholds (market_mechanics.md:169-171, gdd/14:941 via marketTunables):
   *   λ < tiers[0]  (< 0.6) → CLEAR
   *   λ < tiers[1]  (< 0.8) → CONGESTED
   *   λ < tiers[2]  (< 1.0) → SATURATED
   *   λ ≥ tiers[2]  (≥ 1.0) → OVERLOADED (permanent-damage zone)
   */
  private lambdaBucket(lambda: number): LambdaBucket {
    const tiers = marketTunables.districtKHazeTiers;
    if (lambda < tiers[0]) return 'CLEAR';
    if (lambda < tiers[1]) return 'CONGESTED';
    if (lambda < tiers[2]) return 'SATURATED';
    return 'OVERLOADED';
  }
}

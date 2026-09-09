// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Hush — addiction-loyalty (the per-spot
//             loyalty bucket bands NEW/ESTABLISHED/DEPENDENT + the DEPENDENT "sticky demand" selling boost) +
//             docs/superpowers/specs/2026-06-05-phase-02b-hush-addiction-design.md §3/§7 (the addiction mechanic) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the loyalty surface is a closed
//             read-time BAND LOW/STABLE/HIGH, never the raw score/cut-points)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 5) --
//
// `HushAddictionService` — the PURE band + boost derivation of a Hush dealer-spot's addiction loyalty. It is a pure
// function of the persisted integer `hush_addiction.loyalty_score` (+ the gdd/14 cut-points):
//   - bandFor(score) → an INTERNAL band (NEW / ESTABLISHED / DEPENDENT) from the two integer cut-points
//     (score < established → NEW; established ≤ score < dependent → ESTABLISHED; score ≥ dependent → DEPENDENT).
//   - loyaltyStatus(score) → the PLAYER-FACING closed band (LOW / STABLE / HIGH) — NEW→LOW, ESTABLISHED→STABLE,
//     DEPENDENT→HIGH (R2.2 — the player NEVER sees the raw score nor the cut-points, only this qualitative band).
//   - boostMultiplier(score) → the selling-rate multiplier the DEALER_SELL tick applies: loyalty_boost_multiplier
//     (=2) when DEPENDENT (the canon "sticky demand"), else 1 (base rate). The boost is read from the score at the
//     START of the tick (before accumulation), so a spot reaching dependent THIS tick gets the boost the NEXT tick
//     (deterministic — fine).
//
// R2.2: the raw cut-points (established/dependent) + the raw score are INTERNAL — never surfaced. The projection
// surfaces ONLY loyaltyStatus() (LOW/STABLE/HIGH) + the withdrawn boolean. R2.3: the cut-points + the boost multiplier
// are read ONLY from hushAddictionTunables (gdd/14 mirror); ZERO inline numeric literal here.

import { Injectable } from '@nestjs/common';

import { hushAddictionTunables } from './hush-addiction-tunables';

/** The INTERNAL loyalty band (the raw three-tier bucketing of the deal-count score — never surfaced to the client). */
export type HushLoyaltyBand = 'NEW' | 'ESTABLISHED' | 'DEPENDENT';

/** The PLAYER-FACING addiction-loyalty status — the ONLY loyalty signal exposed (R2.2; never the raw score). */
export type HushLoyaltyStatus = 'LOW' | 'STABLE' | 'HIGH';

@Injectable()
export class HushAddictionService {
  /**
   * Map the raw integer loyalty_score → the INTERNAL band (the deal-count bucketing). score < establishedScore → NEW;
   * establishedScore ≤ score < dependentScore → ESTABLISHED; score ≥ dependentScore → DEPENDENT. The cut-points are the
   * gdd/14 mirror values (R2.3 — no inline literal). INTERNAL — the player never sees this band, only loyaltyStatus().
   */
  bandFor(score: number): HushLoyaltyBand {
    if (score >= hushAddictionTunables.dependentScore) return 'DEPENDENT';
    if (score >= hushAddictionTunables.establishedScore) return 'ESTABLISHED';
    return 'NEW';
  }

  /**
   * Map the raw integer loyalty_score → the PLAYER-FACING closed band (R2.2). NEW → LOW, ESTABLISHED → STABLE,
   * DEPENDENT → HIGH. The player sees the BAND, never the raw score nor the cut-points. The dealer projection surfaces
   * exactly this (+ the withdrawn boolean) for a Hush dealer-spot.
   */
  loyaltyStatus(score: number): HushLoyaltyStatus {
    switch (this.bandFor(score)) {
      case 'DEPENDENT':
        return 'HIGH';
      case 'ESTABLISHED':
        return 'STABLE';
      default:
        return 'LOW';
    }
  }

  /**
   * The selling-rate multiplier the DEALER_SELL tick applies to a Hush dealer-spot's per-tick grams: the
   * loyalty_boost_multiplier (=2 — the canon "sticky demand") when the spot is DEPENDENT (score ≥ dependentScore),
   * else 1 (the base rate). A pure function of the score + the gdd/14 mirror values (R2.3 — no inline literal). The
   * boost is GUARDED ≥ 1 (a misconfigured <1 multiplier never SHRINKS the base rate below 1× — behavior-preserving).
   */
  boostMultiplier(score: number): number {
    if (this.bandFor(score) !== 'DEPENDENT') return 1;
    return Math.max(1, hushAddictionTunables.loyaltyBoostMultiplier);
  }
}

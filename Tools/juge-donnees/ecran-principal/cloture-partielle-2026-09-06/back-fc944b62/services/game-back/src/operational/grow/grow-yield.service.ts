// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T5/§6 (the harvest yield tier — a pure,
//             no-persistence, deterministic function of tend_count, mirroring AshPurityService / ColdChainService /
//             HushAddictionService) + §7 (the yield-tier cut-points: BUMPER = all stages tended, WITHERED = ≤
//             withered_max_tends tended, STANDARD = between) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-3 vector #3 (grow_house) T0
//             (grow.withered_max_tends / grow.stage_count / grow.yield_grams.{withered,standard,bumper} — R2.3) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the yield tier + the raw grams are
//             INTERNAL/BO-only: the harvested grams land in precursor_stock, surfaced ONLY via a band; never the raw
//             tier nor the grams nor tend_count to the client)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 5) --
//
// `GrowYieldService` — the PURE, DETERMINISTIC derivation of a grow's HARVEST yield (the husbandry payoff, lever B — the
// analog of AshPurityService's purity tier / ColdChainService's temperature_status). It is a pure function of the ONE
// recorded husbandry lever (tend_count) + the gdd/14 coefficients — NO persistence in the service, NO RNG:
//   - yieldTier(tendCount, stageCount) → the CLOSED qualitative tier (WITHERED/STANDARD/BUMPER) from tend_count:
//       * BUMPER   when tend_count === stageCount (every growth stage was tended — the full husbandry).
//       * WITHERED when tend_count <= grow.withered_max_tends (neglect — the low yield).
//       * STANDARD otherwise (between — partial husbandry).
//     Two identical (tendCount, stageCount) → an identical tier (deterministic — the SAME input always yields the SAME
//     tier; the E2E asserts identical tend patterns harvest identical grams). The BUMPER test is checked FIRST so that a
//     degenerate config (withered_max_tends >= stageCount) still classifies a fully-tended grow as BUMPER (the gdd/14
//     invariant is withered_max_tends < stageCount, so STANDARD is non-empty: with the defaults 1 < 3 → 0-1 tends =
//     WITHERED, 2 = STANDARD, 3 = BUMPER).
//   - yieldGramsFor(tier) → the harvest mass in grams (gdd/14 grow.yield_grams[tier], ascending: WITHERED 50 < STANDARD
//       120 < BUMPER 200 — the husbandry lever DISCRIMINATES; a neglected grow harvests strictly fewer grams). These
//       grams are UPSERTed into precursor_stock by the harvest (the GROW_ADVANCE completion handler, T5).
//
// THE STAMP (where this service is CALLED): at GROW COMPLETION, the GROW_ADVANCE tick (GrowAdvanceService, MINUTE/18)
// computes yieldTier() for each grow that TRANSITIONS to 'completed' in this tick from its recorded tend_count + the
// grounded stage_count, maps it to yieldGramsFor(tier), and UPSERTs the grams into precursor_stock for the grow's
// (player, building, precursor_type) — then DELETES the grow_session (finalize; the building is free to re-plant). This
// is set-based, once per completing grow, in the SAME advance transaction. This service has NO knowledge of that wiring;
// it is a pure derivation the caller invokes at completion.
//
// R2.2: the raw tier + the raw grams + tend_count are INTERNAL (BO-only) — the player surface is the qualitative
// husbandry / precursor-stock bands (T7). R2.3: the withered cut-point / stage count / per-tier grams are read ONLY from
// growYieldTunables (the gdd/14 mirror); ZERO inline numeric literal here.

import { Injectable } from '@nestjs/common';

import { growYieldTunables } from './grow-tunables';

/** The CLOSED qualitative husbandry yield tier — derived from tend_count (R2.2; the raw tier is never surfaced raw,
 *  only the husbandry_band T7 / the precursor-stock band). Ascending grams: WITHERED (neglect, low) < STANDARD (partial)
 *  < BUMPER (full husbandry — every stage tended, the highest yield). */
export type GrowYieldTier = 'WITHERED' | 'STANDARD' | 'BUMPER';

@Injectable()
export class GrowYieldService {
  /**
   * Derive a grow's HARVEST tier from the ONE husbandry lever (tend_count) + the grounded stage_count — DETERMINISTIC,
   * NO RNG. The cut-points are the gdd/14 mirror values (R2.3 — no inline literal):
   *   - BUMPER   when tendCount === stageCount (every growth stage tended — the full husbandry payoff). Checked FIRST so
   *              a fully-tended grow is BUMPER regardless of the withered cut-point (defensive against a degenerate
   *              withered_max_tends >= stageCount config; the gdd/14 invariant withered_max_tends < stageCount keeps
   *              STANDARD non-empty in practice).
   *   - WITHERED when tendCount <= grow.withered_max_tends (neglect — the low yield; default ≤ 1 with stage_count 3).
   *   - STANDARD otherwise (between the withered cut-point and full husbandry — partial husbandry, the middle yield).
   * A pure function of (tendCount, stageCount): the SAME pair always yields the SAME tier (the E2E asserts identical
   * tend patterns harvest identical grams). tendCount is the persisted lever (0..stageCount); a defensive clamp is NOT
   * needed (the tend action bounds it to one per stage by the DB guard, and the comparisons are total over any integer).
   */
  yieldTier(tendCount: number, stageCount: number): GrowYieldTier {
    // BUMPER first — a fully-tended grow is always the top tier (defensive against a degenerate withered cut-point).
    if (tendCount === stageCount) return 'BUMPER';
    // WITHERED — neglected husbandry (≤ the withered cut-point, gdd/14 grow.withered_max_tends).
    if (tendCount <= growYieldTunables.witheredMaxTends) return 'WITHERED';
    // STANDARD — partial husbandry (between the withered cut-point and full husbandry).
    return 'STANDARD';
  }

  /**
   * The HARVEST mass in grams for a tier (gdd/14 grow.yield_grams[tier], ascending — WITHERED 50 < STANDARD 120 <
   * BUMPER 200). The husbandry lever DISCRIMINATES: a neglected grow harvests strictly fewer grams than a fully-tended
   * one (the three tiers give strictly different grams — the E2E asserts the exact discriminating amounts). These grams
   * are UPSERTed into precursor_stock by the harvest (the GROW_ADVANCE completion handler, T5). A pure function of the
   * tier + the gdd/14 mirror values (R2.3 — no inline literal). Returns an integer (precursor_stock.quantity_units is an
   * integer column).
   */
  yieldGramsFor(tier: GrowYieldTier): number {
    switch (tier) {
      case 'BUMPER':
        return growYieldTunables.yieldGrams.bumper;
      case 'STANDARD':
        return growYieldTunables.yieldGrams.standard;
      default:
        return growYieldTunables.yieldGrams.withered;
    }
  }

  /**
   * Convenience: the harvest grams DIRECTLY from (tendCount, stageCount) — yieldGramsFor(yieldTier(...)). The harvest
   * handler computes this once per completing grow (the UPSERT amount into precursor_stock). Pure + deterministic.
   */
  yieldGramsForTendCount(tendCount: number, stageCount: number): number {
    return this.yieldGramsFor(this.yieldTier(tendCount, stageCount));
  }
}

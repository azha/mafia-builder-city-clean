// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (the 7 §8.2
//             sources, weighted increment + quiet-week predicate — shared by BOTH the session-close
//             subscriber AND the W/14 tick, zero duplicated formula)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.1/§8.2/§8.3
//             Pattern: `FrictionBudgetTickService.resolveFrictionFormulaTunables` (the "resolve the getters
//             ONCE, share the resolved-tunables object across every caller" shape, R2.3 — the SERVICE layer
//             resolves tunables, pure functions take plain numbers).
//             — P3-E C6 — 2026-07-17
//
// `CompressionStressReaderService` — the ONE place that reduces the 7 §8.2 sources into a `StressSignals`
// object (`CompressionSignalRepository` for the 4 B/C/D-owned sources + `FrictionBudgetRepository`,
// DemolitionModule EXPORT, for the friction-penalty source) and computes BOTH derived outputs
// (`CompressionStressSubscriber` needs the weighted increment ; `CompressionQuietDecayTickService` needs
// the quiet-week predicate) from the SAME signal read — zero drift between the 2 callers, zero 2nd copy
// of the §8.2 formula anywhere.

import { Injectable } from '@nestjs/common';

import { coreLoopsTunables } from '../core-loops-tunables';
import { FrictionBudgetRepository } from '../demolition/friction-budget.repository';
import { CompressionSignalRepository } from './compression-signal.repository';
import {
  annealingCompoundingStrainSignal,
  countBasedSignal,
  frictionPenaltyActiveSignal,
  isQuietWeek,
  stressIncrement,
  supplyChainCapacityPressureSignal,
  weightedStressSum,
  type StressSignals,
  type StressWeights,
} from './compression-stress-signal';

export interface StressReadout {
  readonly signals: StressSignals;
  readonly weightedSum: number;
  readonly quiet: boolean;
}

@Injectable()
export class CompressionStressReaderService {
  constructor(
    private readonly signalRepo: CompressionSignalRepository,
    // DemolitionModule EXPORT (app.module.ts wires DemolitionModule before CompressionModule — additive
    // cross-module read, mirrors `RealEstateModule`/`ReplacementOptionController`'s own precedent).
    private readonly frictionRepo: FrictionBudgetRepository,
  ) {}

  /** ★#3 weight tunables, resolved ONCE (R2.3). PUBLIC so the E2E floor can recompute the EXACT SAME
   *  weights the runtime used, without hand-duplicating the 7 defaults. */
  resolveWeights(): StressWeights {
    return {
      supplyChainCapacityPressure: coreLoopsTunables.compressionSupplyChainCapacityPressureWeight,
      understudyUnsync: coreLoopsTunables.compressionUnderstudyUnsyncWeight,
      lieutenantFlagUnresolved: coreLoopsTunables.compressionLieutenantFlagUnresolvedWeight,
      cueStackNonOptimal: coreLoopsTunables.compressionCueStackNonOptimalWeight,
      constraintKnotUnresolved: coreLoopsTunables.compressionConstraintKnotUnresolvedWeight,
      frictionPenaltyActive: coreLoopsTunables.compressionFrictionPenaltyWeight,
      annealingCompoundingStrain: coreLoopsTunables.compressionAnnealingStrainWeight,
    };
  }

  /**
   * Read the 7 §8.2 sources for `playerId` (2 INERT sources hardcoded to 0, traced — divergence #10) and
   * reduce to `{signals, weightedSum, quiet}`. `weightedSum` feeds the session-close increment (§8.1);
   * `quiet` feeds the W/14 decay predicate (§8.3) — BOTH callers read the SAME signals, one call.
   */
  async readStress(playerId: string): Promise<StressReadout> {
    const [supplyChainCounts, pendingFlagCount, cueStackCounts, annealingCounts, frictionRow] = await Promise.all([
      this.signalRepo.readSupplyChainSignalCounts(
        playerId,
        coreLoopsTunables.backpressureCriticalThreshold,
        coreLoopsTunables.sinuosityStressedBucketUpperBound,
        coreLoopsTunables.mycelialStressThreshold,
      ),
      this.signalRepo.countPendingFlags(playerId),
      this.signalRepo.readCueStackSignalCounts(playerId),
      this.signalRepo.readAnnealingSignalCounts(playerId),
      this.frictionRepo.getRow(playerId),
    ]);

    const countCap = coreLoopsTunables.compressionCountBasedStressSignalCap;
    const frictionTotal = frictionRow ? Number(frictionRow.friction_budget_total) : 0;
    const frictionThreshold = frictionRow
      ? frictionRow.friction_org_size * coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize
      : 0;

    const signals: StressSignals = {
      supplyChainCapacityPressure: supplyChainCapacityPressureSignal(supplyChainCounts),
      understudyUnsync: 0, // INERT (ch07 not built) — traced, never dropped (divergence #10)
      lieutenantFlagUnresolved: countBasedSignal(pendingFlagCount, countCap),
      cueStackNonOptimal: countBasedSignal(cueStackCounts.failedSlotCount + cueStackCounts.pendingCascadeCardCount, countCap),
      constraintKnotUnresolved: 0, // INERT (ch06/P3-I not built) — traced, never dropped (divergence #10)
      frictionPenaltyActive: frictionRow
        ? frictionPenaltyActiveSignal(frictionRow.efficiency_penalty_active, frictionTotal, frictionThreshold)
        : 0,
      annealingCompoundingStrain: annealingCompoundingStrainSignal(annealingCounts.compoundingCount, annealingCounts.totalNonSettledCount),
    };

    const weightedSum = weightedStressSum(signals, this.resolveWeights());
    return { signals, weightedSum, quiet: isQuietWeek(signals) };
  }

  /** §8.1 — the session-close increment (rate × weightedSum, clamped [0, increment_max]), rounded to the
   *  nearest integer (`org_stress` is a DB `integer` column — the caller writes THIS rounded value). */
  computeIncrement(weightedSum: number): number {
    const raw = stressIncrement(
      weightedSum,
      coreLoopsTunables.compressionStressAccumulationRateMultiplier,
      coreLoopsTunables.compressionPerSessionStressIncrementMax,
    );
    return Math.round(raw);
  }
}

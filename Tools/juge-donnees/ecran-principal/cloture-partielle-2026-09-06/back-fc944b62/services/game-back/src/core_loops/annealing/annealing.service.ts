// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("AnnealingService :
//             initiation/compounding UPSERT I5 ... SettlingInitiatedEvent/CompoundingStrainEvent").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.3 (I5) + §9.5
//             (SettlingBandBucket derivation) + §9.2 (the closed ChangeType registry validation).
//             — P3-D C6 — 2026-07-14
//
// `AnnealingService` — the ONE entry point every LIVE `ChangeType` subscriber calls (`annealing-initiation-
// subscriber.service.ts`) AND the SAME method `AnnealingTestController`'s direct-call test route calls
// (Lesson #3 — zero live-vs-test divergence, the `CueStackDisruptionService.disruptForBuildingEvent`
// precedent this same lot's C4 already established). Resolves the §14 tunable getters (R2.3 — the SERVICE
// layer resolves tunables, the REPOSITORY takes plain numbers, mirrors `CueStackStaleSweepService.runTick`'s
// own convention), delegates the atomic arithmetic to `AnnealingRepository.initiateOrCompound` (I5), derives
// the qualitative `SettlingBandBucket` from the RETURNED row (never re-reads `settling_ends_at` raw beyond
// this ONE derivation), and emits EXACTLY ONE of `SettlingInitiatedEvent`/`CompoundingStrainEvent` — the
// branch the repository's own `changes_during_settling===0` disambiguation already decided (see that file's
// header for why this is race-free).

import { Injectable } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core-loops-tunables';
import { AnnealingRepository } from './annealing.repository';
import { InitiatingChangeRegistry } from './initiating-change.registry';
import type { LiveChangeType } from './initiating-change.catalogue';
import { deriveSettlingBandBucket, type SettlingBandBucket } from './settling-band-bucket';
import type { AnnealingStateRow } from '../../db/schema/cue_annealing';

export interface AnnealingInitiateOrCompoundResult {
  readonly outcome: 'initiated' | 'compounded';
  readonly row: AnnealingStateRow;
  readonly band: SettlingBandBucket;
}

@Injectable()
export class AnnealingService {
  constructor(
    private readonly repo: AnnealingRepository,
    private readonly bus: CityEventBus,
    private readonly changeRegistry: InitiatingChangeRegistry,
  ) {}

  /**
   * Initiate a FRESH settling window on `(playerId, buildingId)`, or COMPOUND an ALREADY-active one (I5,
   * design §9.3) — the ONE algorithm every one of the 6 LIVE `ChangeType` subscribers (P3-D's original 5 +
   * P3-E C4's `BUILDING_DECOMMISSION` flip) + the direct `_test`
   * route call identically. `changeRegistry.require` is a defensive closed-domain guard (never reachable in
   * practice — every real caller passes a literal `LiveChangeType` member, see that class's own header).
   */
  async initiateOrCompound(
    playerId: string,
    buildingId: string,
    changeType: LiveChangeType,
    ref: string,
    gameMinute: number,
  ): Promise<AnnealingInitiateOrCompoundResult> {
    this.changeRegistry.require(changeType);

    const row = await this.repo.initiateOrCompound({
      playerId,
      buildingId,
      changeType,
      ref,
      baseSettlingMinutes: coreLoopsTunables.annealingBaseSettlingMinutes,
      compoundingMultiplier: coreLoopsTunables.annealingCompoundingMultiplier,
      throughputPenalty: coreLoopsTunables.annealingCompoundingThroughputPenalty,
    });

    const remainingMinutes = (new Date(row.settling_ends_at).getTime() - Date.now()) / 60_000;
    const band = deriveSettlingBandBucket(
      remainingMinutes,
      coreLoopsTunables.annealingBandShortUpperMinutes,
      coreLoopsTunables.annealingBandMediumUpperMinutes,
    );

    if (row.changes_during_settling === 0) {
      this.bus.emitSettlingInitiated({
        type: 'settling_initiated',
        playerId,
        buildingId,
        changeType,
        ref,
        band,
        gameMinute,
      });
      return { outcome: 'initiated', row, band };
    }

    this.bus.emitCompoundingStrain({
      type: 'compounding_strain',
      playerId,
      buildingId,
      changeType,
      ref,
      band,
      gameMinute,
    });
    return { outcome: 'compounded', row, band };
  }
}

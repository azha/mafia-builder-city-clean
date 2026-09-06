// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (finalize I8 +
//             the ★#6 teeth, orchestration)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.4.
//             — P3-E C7 — 2026-07-18
//
// `CompressionFinalizeService` — DELIBERATELY self-contained (see `CompressionFinalizeRepository`'s own
// header for the full "duplicate-provided in BOTH CompressionModule and DemolitionModule, zero cycle"
// rationale): `finalizeIfEligible(tx)` + (POST-commit) one `CompressionResidueExceptionProducer.
// raiseIfClear` call per critical-residue `problem_key` + `CompressionWeekFinalizedEvent`.

import { Injectable, Logger } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CompressionFinalizeRepository, type FinalizeOutcome } from './compression-finalize.repository';
import { CompressionResidueExceptionProducer } from './compression-residue-exception-producer.service';

@Injectable()
export class CompressionFinalizeService {
  private readonly logger = new Logger(CompressionFinalizeService.name);

  constructor(
    private readonly repo: CompressionFinalizeRepository,
    private readonly residueProducer: CompressionResidueExceptionProducer,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `minAbandonAgeTicks`: `null` for a decide-triggered finalize (budget-exhausted/all-addressed, no age
   * requirement — any 'active' row finalizes) ; a real tick-count for the N/31 abandon-sweep caller
   * (D15 — `compressionBoardAbandonHorizonGameDays` × 1440, `friction-budget-tick.service.ts`).
   */
  async finalize(playerId: string, gameMinute: number, minAbandonAgeTicks: number | null): Promise<FinalizeOutcome> {
    const outcome = await this.repo.finalizeIfEligible(
      playerId,
      gameMinute,
      coreLoopsTunables.compressionProblemDowngradePerUnaddressedTiers,
      coreLoopsTunables.compressionPostResetStress,
      coreLoopsTunables.compressionStressFloorWithCriticalResidue,
      minAbandonAgeTicks,
    );

    if (!outcome.finalized) {
      return outcome;
    }

    // POST-commit (the repository's OWN transaction already committed) — mirrors `DecommissionService`'s
    // own "tx commits BEFORE the bus event / spine card" ordering.
    for (const problemKey of outcome.criticalResidueProblemKeys) {
      const result = await this.residueProducer.raiseIfClear(
        playerId,
        problemKey,
        `A Compression Week triage problem ("${problemKey}") persisted unresolved through the full cycle — it has escalated to critical.`,
      );
      this.logger.log(`COMPRESSION_RESIDUE: player=${playerId} problem_key=${problemKey} -> ${result}.`);
    }

    this.bus.emitCompressionWeekFinalized({
      type: 'compression_week_finalized',
      playerId,
      compressionEventId: outcome.compressionEventId!,
      hasCriticalResidue: outcome.hasCriticalResidue,
      orgStressAfter: outcome.orgStressAfter!,
      gameMinute,
    });

    this.logger.log(
      `COMPRESSION_WEEK_FINALIZED: player=${playerId} event=${outcome.compressionEventId} ` +
        `hasCriticalResidue=${outcome.hasCriticalResidue} orgStressAfter=${outcome.orgStressAfter}.`,
    );

    return outcome;
  }
}

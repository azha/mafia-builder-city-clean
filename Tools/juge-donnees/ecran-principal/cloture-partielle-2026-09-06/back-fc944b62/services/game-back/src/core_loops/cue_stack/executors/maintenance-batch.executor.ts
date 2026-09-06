// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("4 LIVE executors —
//             each wrapping its REAL verb")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 table row 2 —
//             `MAINTENANCE_BATCH` → `MaintenanceService.scheduleMaintenance` (`maintenance.service.ts:86`,
//             "planifie la maintenance du building ciblé").
//             — P3-D C3 — 2026-07-14
//
// `MaintenanceBatchExecutor` — the `MAINTENANCE_BATCH` `SlotTypeExecutor`. `validateTarget` DELEGATES to
// `CueStackRepository.operationalBuildingExistsForPlayer` (the SAME method compose already calls). `execute`
// calls `MaintenanceService.scheduleMaintenance` DIRECTLY — the REAL verb, never reimplemented; `_options`
// is omitted (D10 — emergency is ALWAYS server-derived from `days_overdue`, never client input; a cue-stack
// slot carries no `emergency` field to pass through anyway). Any throw (already armed / not schedulable /
// insufficient cash — the SAME 404/409 guards the player-facing endpoint enforces) propagates UNCAUGHT —
// the tick's own catch marks `failed_executor` (D4).

import { Injectable } from '@nestjs/common';

import { MaintenanceService } from '../../../operational/maintenance/maintenance.service';
import { CueStackRepository } from '../cue-stack.repository';
import type { CueStackSlot, SlotExecutionContext, SlotOutcome, SlotTypeExecutor, TargetRef } from '../slot-type-executor.interface';

@Injectable()
export class MaintenanceBatchExecutor implements SlotTypeExecutor {
  readonly slotType = 'MAINTENANCE_BATCH' as const;

  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly cueStackRepo: CueStackRepository,
  ) {}

  async validateTarget(playerId: string, targetRef: TargetRef): Promise<boolean> {
    return this.cueStackRepo.operationalBuildingExistsForPlayer(playerId, targetRef.id);
  }

  async execute(playerId: string, slot: CueStackSlot, _ctx: SlotExecutionContext): Promise<SlotOutcome> {
    // THE VERB — MaintenanceService.scheduleMaintenance (design §5.1 table row 2, maintenance.service.ts:86).
    const result = await this.maintenance.scheduleMaintenance(playerId, slot.target_ref.id);
    return {
      status: 'scheduled',
      detail: { emergency: result.emergency, costBand: result.cost_band },
    };
  }
}

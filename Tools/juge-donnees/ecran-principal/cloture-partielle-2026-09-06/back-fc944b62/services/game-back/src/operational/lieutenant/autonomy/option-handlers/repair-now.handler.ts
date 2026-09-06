// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (REPAIR_NOW — the
//             SECURITY archetype's "act now" option: repair the assigned building, the SAME action the delegated
//             EXECUTE_DEFAULT binding takes) -- Phase-19 L1a Task 6 --
//
// REPAIR_NOW — REPLICATES SecurityBindingService.applyExecuteDefault (src/operational/lieutenant/security-binding.ts):
// RepairService.repair(playerId, assignedBuildingId) (the SAME guarded repair the player's POST /repair runs — owns the
// DAMAGED validation + the atomic cash debit + the structural-state → 'repairing' transition). A benign 409 (not damaged /
// already repairing / insufficient cash) → NOOP (the binding's benign-409 discipline). A null assigned building → NOOP.
//
// DEBT(v1.x): the repair call shape (RepairService.repair + benign-409→NOOP) is duplicated from
// SecurityBindingService.applyExecuteDefault — extract a shared pure fn once the option handlers + the binding can share
// one without a circular dep. (No amount-calc here — REPAIR is all-or-nothing.)

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { RepairService } from '../../../enforcement/repair.service';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class RepairNowHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(RepairNowHandler.name);
  readonly effectKind = 'REPAIR_NOW' as const;

  constructor(private readonly repair: RepairService) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const buildingId = ctx.assignedBuildingId;
    if (buildingId === null) return 'NOOP';

    try {
      await this.repair.repair(ctx.playerId, buildingId);
      return 'REPAIRED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `REPAIR_NOW benign no-op for lieutenant=${ctx.lieutenantId} building=${buildingId} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

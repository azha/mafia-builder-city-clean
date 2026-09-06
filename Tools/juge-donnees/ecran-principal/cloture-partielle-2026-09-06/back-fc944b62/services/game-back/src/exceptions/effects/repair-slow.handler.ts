// IMPLEMENTS: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (Slow repair — REPAIR_SLOW:
//             debit `repair_slow_cost_multiplier` (0.6) × the grounded cost → 'repairing', armed for
//             `repair_time_days_max` (7d) → outcome 'REPAIRING_SLOW'). The sibling of RepairImmediateHandler —
//             SAME grounding + tick-space, different multiplier/duration getters (D4).
//             — 04f-A C5 — 2026-07-10

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { maintenanceTunables } from '../../operational/maintenance/maintenance-tunables';
import { ExceptionsRepository } from '../exceptions.repository';
import { EquipmentFailureExceptionRepository } from '../equipment-failure-exception.repository';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** REPAIR_SLOW — `repair_slow_cost_multiplier` (0.6) × the SAME grounded estimate RepairImmediateHandler reads
 *  → guarded debit → `'failed' → 'repairing'`, armed for `repair_time_days_max` (7) game-days. */
@Injectable()
export class RepairSlowHandler implements ExceptionEffectHandler {
  readonly effectType = 'REPAIR_SLOW' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly failureRepo: EquipmentFailureExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'REPAIR_SLOW');

    const estimate = await this.failureRepo.getLatestFailureEstimate(eff.target_building_id);
    if (!estimate) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `REPAIR_SLOW: no equipment-failure record for building ${eff.target_building_id}.`,
      });
    }

    const currentTick = await this.failureRepo.getCurrentGameMinute(ctx.playerId);
    const completesAtTick = currentTick + maintenanceTunables.repairTimeDaysMax * citySimTunables.inGameDayLengthMinutes;
    const costCents = Math.round(estimate.repairCostEstimateCents * maintenanceTunables.repairSlowCostMultiplier);

    const result = await this.failureRepo.debitAndArmFailureRepair({
      playerId: ctx.playerId,
      buildingId: eff.target_building_id,
      failureId: estimate.failureId,
      costCents: BigInt(costCents),
      completesAtTick,
      repairMode: 'slow',
    });
    if (result === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'Insufficient cash to cover the slow repair cost.' });
    }

    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'REPAIR_SLOW',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'REPAIRING_SLOW';
  }
}

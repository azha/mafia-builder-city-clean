// IMPLEMENTS: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (Immediate repair —
//             REPAIR_IMMEDIATE: guarded debit FULL repair cost → structural_state='repairing',
//             repair_completes_at_tick = now + repair_time_days_min (3d) → REUSE the `OPERATIONAL_REPAIR`
//             MINUTE/14 flip → outcome 'REPAIRING') + §5 (the cost is GROUNDED on the C4 seeded
//             `roll_detail.repair_cost_estimate_cents`, never re-derived).
//             — 04f-A C5 — 2026-07-10

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { maintenanceTunables } from '../../operational/maintenance/maintenance-tunables';
import { ExceptionsRepository } from '../exceptions.repository';
import { EquipmentFailureExceptionRepository } from '../equipment-failure-exception.repository';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** REPAIR_IMMEDIATE — the FULL grounded repair cost (design §5's seeded estimate, `roll_detail.
 *  repair_cost_estimate_cents`) → guarded debit → `'failed' → 'repairing'`, armed for
 *  `repair_time_days_min` (3) game-days in the SAME tick-space the raid `OPERATIONAL_REPAIR` MINUTE/14
 *  completion tick already flips. Insufficient cash → 409, card stays pending (the BRIBE-handler precedent). */
@Injectable()
export class RepairImmediateHandler implements ExceptionEffectHandler {
  readonly effectType = 'REPAIR_IMMEDIATE' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly failureRepo: EquipmentFailureExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'REPAIR_IMMEDIATE');

    const estimate = await this.failureRepo.getLatestFailureEstimate(eff.target_building_id);
    if (!estimate) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `REPAIR_IMMEDIATE: no equipment-failure record for building ${eff.target_building_id}.`,
      });
    }

    const currentTick = await this.failureRepo.getCurrentGameMinute(ctx.playerId);
    const completesAtTick = currentTick + maintenanceTunables.repairTimeDaysMin * citySimTunables.inGameDayLengthMinutes;

    const result = await this.failureRepo.debitAndArmFailureRepair({
      playerId: ctx.playerId,
      buildingId: eff.target_building_id,
      failureId: estimate.failureId,
      costCents: BigInt(Math.round(estimate.repairCostEstimateCents)),
      completesAtTick,
      repairMode: 'immediate',
    });
    if (result === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'Insufficient cash to cover the immediate repair cost.' });
    }

    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'REPAIR_IMMEDIATE',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'REPAIRING';
  }
}

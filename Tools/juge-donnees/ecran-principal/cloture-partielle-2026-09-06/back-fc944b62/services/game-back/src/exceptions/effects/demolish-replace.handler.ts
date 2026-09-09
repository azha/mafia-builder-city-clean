// IMPLEMENTS: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (Demolish + replace —
//             DEMOLISH_REPLACE: the FIRST real demolition — buildings city-state → 'demolished', operational
//             row terminal, block freed; "replace" REUSES the EXISTING purchase/convert flow, no new build
//             endpoint. Outcome 'DEMOLISHED') + seam table row 6 (real-estate demolition — minimal, D4/
//             sub-decision #5).
//             — 04f-A C5 — 2026-07-10

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { ExceptionsRepository } from '../exceptions.repository';
import { EquipmentFailureExceptionRepository } from '../equipment-failure-exception.repository';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** DEMOLISH_REPLACE — the first real demolition write-path (`EquipmentFailureExceptionRepository.
 *  demolishAndClear`): `building_operational_state` row DELETED (terminally cleared) + `buildings.
 *  structural_state='demolished'`. No debit, no repair timer. The freed block is re-purchasable via the
 *  EXISTING `POST /v1/operational/building/purchase` (`RealEstateRepository.isBlockFreeForPlayer`'s
 *  04f-A C5 additive edit excludes a 'demolished' building from the occupancy check) — "replace" is the
 *  player's OWN follow-up purchase/convert call, not a new endpoint. */
@Injectable()
export class DemolishReplaceHandler implements ExceptionEffectHandler {
  readonly effectType = 'DEMOLISH_REPLACE' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly failureRepo: EquipmentFailureExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'DEMOLISH_REPLACE');

    const estimate = await this.failureRepo.getLatestFailureEstimate(eff.target_building_id);
    const ok = await this.failureRepo.demolishAndClear({
      playerId: ctx.playerId,
      buildingId: eff.target_building_id,
      failureId: estimate?.failureId ?? null,
    });
    if (!ok) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${eff.target_building_id} is not in a demolishable ('failed') state.`,
      });
    }

    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'DEMOLISH_REPLACE',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'DEMOLISHED';
  }
}

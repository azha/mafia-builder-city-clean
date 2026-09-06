// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T4 (BRIBE — guarded debit, then a
//             seeded chance: success → restore + heat drop; failure → heat rise [money already gone]). The ONLY randomness
//             is makeRng with a stable game-state seed (replay-safe — no Math.random). The odds/cost are tunables (R2.3).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { makeRng } from '../../common/seeded-rng';
import { ExceptionsRepository } from '../exceptions.repository';
import { RaidExceptionRepository } from '../raid-exception.repository';
import { raidExceptionTunables } from './exception-effect-tunables';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** BRIBE — pay a bribe (guarded debit; insufficient → 409, no roll), then roll the seeded outcome: SUCCESS restores the
 *  building (instant damaged→operational) + sheds heat; FAILURE leaves it damaged + RAISES heat (the money is already
 *  gone). Seed = `${playerId}:${exceptionId}:BRIBE` (stable → replay-safe → the E2E precomputes the roll). */
@Injectable()
export class BribeHandler implements ExceptionEffectHandler {
  readonly effectType = 'BRIBE' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly raidRepo: RaidExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'BRIBE');
    const t = raidExceptionTunables;

    const paid = await this.raidRepo.debitWallet(ctx.playerId, t.bribeCostCents);
    if (!paid) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'Insufficient cash to cover the bribe.' });
    }

    const success = makeRng(`${ctx.playerId}:${ctx.row.exception_id}:BRIBE`).chance(t.bribeSuccessProbability);
    if (success) {
      await this.raidRepo.restoreBuilding(ctx.playerId, eff.target_building_id);
      await this.raidRepo.adjustBuildingHeat(ctx.playerId, eff.target_building_id, -t.bribeSuccessHeatDrop);
    } else {
      await this.raidRepo.adjustBuildingHeat(ctx.playerId, eff.target_building_id, t.bribeFailureHeatRise);
    }

    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'BRIBE',
      success,
      chosen_action_id: ctx.chosenActionId,
    });
    return success ? 'BRIBE_SUCCEEDED' : 'BRIBE_FAILED';
  }
}

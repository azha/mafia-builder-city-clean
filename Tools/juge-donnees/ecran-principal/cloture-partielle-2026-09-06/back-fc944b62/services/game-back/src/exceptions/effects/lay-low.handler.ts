// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T4 (LAY_LOW — a seeded heat-reduction
//             AMOUNT; the building stays damaged). Demonstrates rng.int (vs bribe's rng.chance). Seed stable → replay-safe.

import { Injectable } from '@nestjs/common';

import { makeRng } from '../../common/seeded-rng';
import { ExceptionsRepository } from '../exceptions.repository';
import { RaidExceptionRepository } from '../raid-exception.repository';
import { raidExceptionTunables } from './exception-effect-tunables';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** LAY_LOW — go quiet to shed heat by a SEEDED amount (the building stays damaged — lay-low does not fix the structure).
 *  The amount is drawn in milli-heat ints then applied as a clamped negative delta. Seed = `${playerId}:${exceptionId}:LAY_LOW`. */
@Injectable()
export class LayLowHandler implements ExceptionEffectHandler {
  readonly effectType = 'LAY_LOW' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly raidRepo: RaidExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'LAY_LOW');
    const t = raidExceptionTunables;
    const milli = makeRng(`${ctx.playerId}:${ctx.row.exception_id}:LAY_LOW`).int(
      t.layLowHeatReductionMilliMin,
      t.layLowHeatReductionMilliMax,
    );
    await this.raidRepo.adjustBuildingHeat(ctx.playerId, eff.target_building_id, -(milli / 1000));
    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'LAY_LOW',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'LAID_LOW';
  }
}

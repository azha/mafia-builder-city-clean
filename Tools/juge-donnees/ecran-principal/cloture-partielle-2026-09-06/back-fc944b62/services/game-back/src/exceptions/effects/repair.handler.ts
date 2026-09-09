// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T4 (REPAIR — reuse RepairService.repair;
//             a RESOURCE_STATE_CONFLICT propagates → the card stays pending).

import { Injectable } from '@nestjs/common';

import { RepairService } from '../../operational/enforcement/repair.service';
import { ExceptionsRepository } from '../exceptions.repository';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** REPAIR — pay to restore the building over time (the SAME guarded action the player's POST /repair + the SECURITY
 *  EXECUTE_DEFAULT run: owns the DAMAGED validation + the atomic cash debit + damaged→repairing). A RESOURCE_STATE_CONFLICT
 *  (not damaged / insufficient cash) PROPAGATES → markResolved never runs → the card stays pending. */
@Injectable()
export class RepairHandler implements ExceptionEffectHandler {
  readonly effectType = 'REPAIR' as const;
  constructor(
    private readonly repair: RepairService,
    private readonly repo: ExceptionsRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'REPAIR');
    await this.repair.repair(ctx.playerId, eff.target_building_id); // 404/409 propagates (card stays pending on 409).
    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'REPAIR',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'REPAIRING';
  }
}

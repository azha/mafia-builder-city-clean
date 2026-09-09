// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (COOK_NOW — the
//             COOK archetype's "act now" option: run the SAME cook the delegated EXECUTE_DEFAULT would have taken)
//             -- Phase-19 L1a Task 6 --
//
// COOK_NOW — REPLICATES CookBindingService.applyExecuteDefault's cook call (src/operational/lieutenant/cook-binding.ts,
// refiningPasses=0): resolve the substance from the assigned building's operational_type (substanceForBuildingType — never
// hardcode 'brindle'), then ProductionService.startCook (the substance-generic cook action). A benign 409 (cook already
// running / no precursor) is caught → NOOP (the SAME benign-409 discipline the binding uses). A null/unresolvable building
// or unconfigured substance → NOOP. No tenure permille here (the player-resolved cook is a plain start; the delegated
// capture is the binding's own).
//
// DEBT(v1.x): the substance-resolve + startCook call shape is duplicated from CookBindingService.applyExecuteDefault —
// extract a shared pure fn once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { ProductionService } from '../../../production/production.service';
import { substanceForBuildingType } from '../../../substance/substance-config';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class CookNowHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(CookNowHandler.name);
  readonly effectKind = 'COOK_NOW' as const;

  constructor(
    private readonly production: ProductionService,
    private readonly repo: LieutenantRepository,
  ) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const buildingId = ctx.assignedBuildingId;
    if (buildingId === null) return 'NOOP';

    const buildingState = await this.repo.getAssignedBuildingState(buildingId);
    if (buildingState === null) return 'NOOP';

    const substance = substanceForBuildingType(buildingState.operational_type);
    if (substance === null) return 'NOOP'; // the building hosts no shipped substance → nothing to cook.

    try {
      await this.production.startCook(ctx.playerId, buildingId, substance, 0, {});
      return 'COOK_STARTED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `COOK_NOW benign no-op for lieutenant=${ctx.lieutenantId} building=${buildingId} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

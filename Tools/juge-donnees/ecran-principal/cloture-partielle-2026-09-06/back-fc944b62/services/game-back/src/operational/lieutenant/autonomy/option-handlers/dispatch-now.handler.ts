// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (DISPATCH_NOW — the
//             LOGISTICS archetype's "act now" option: dispatch a courier source→target) -- Phase-19 L1a Task 6 --
//
// DISPATCH_NOW — REPLICATES LogisticsBindingService.applyExecuteDefault (src/operational/lieutenant/logistics-binding.ts)
// VERBATIM: cargo = min( lieutenantTunables.logisticsDispatchCargoGrams , source total grams ), then
// DistributionService.dispatch(playerId, source=assignedBuildingId, target=targetBuildingId, cargo, 'foot') (the SAME
// guarded dispatch the player's POST /dispatch + the binding run). cargo <= 0 (empty source) → NOOP. A benign 409
// (OVER_CAPACITY / source drained / same source=dest) → NOOP (the binding's benign-409 discipline). A null source or
// target → NOOP.
//
// DEBT(v1.x): the min(tunable batch, source grams) cargo-calc is duplicated from LogisticsBindingService.applyExecuteDefault
// — extract a shared pure fn once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { DistributionService } from '../../../distribution/distribution.service';
import { LieutenantRepository } from '../../lieutenant.repository';
import { lieutenantTunables } from '../../lieutenant-tunables';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class DispatchNowHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(DispatchNowHandler.name);
  readonly effectKind = 'DISPATCH_NOW' as const;

  constructor(
    private readonly distribution: DistributionService,
    private readonly repo: LieutenantRepository,
  ) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const sourceId = ctx.assignedBuildingId;
    if (sourceId === null) return 'NOOP';

    const targetId = ctx.targetBuildingId;
    if (targetId === null) {
      // target_building_id is REQUIRED for a LOGISTICS lieutenant (validateAssignment enforced it at recruit) — defensive NOOP.
      this.logger.warn(
        `DISPATCH_NOW: lieutenant=${ctx.lieutenantId} has a null target (source=${sourceId}) — no dispatch (should not happen).`,
      );
      return 'NOOP';
    }

    // CARGO POLICY (the binding's VERBATIM min): min(tunable batch, source total grams). 0 (empty source) → NOOP.
    const sourceGrams = await this.repo.getSourceProductGrams(sourceId);
    const cargo = Math.min(lieutenantTunables.logisticsDispatchCargoGrams, sourceGrams);
    if (cargo <= 0) return 'NOOP';

    try {
      await this.distribution.dispatch(ctx.playerId, sourceId, targetId, cargo, 'foot');
      return 'DISPATCHED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `DISPATCH_NOW benign no-op for lieutenant=${ctx.lieutenantId} source=${sourceId} target=${targetId} cargo=${cargo} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

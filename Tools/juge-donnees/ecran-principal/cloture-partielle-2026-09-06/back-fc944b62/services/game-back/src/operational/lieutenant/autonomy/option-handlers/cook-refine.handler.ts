// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (COOK_REFINE — the
//             COOK archetype's "refine" option: the SAME cook as COOK_NOW but with refiningPasses=1, the time↔purity
//             lever — production_secondaries.md §Ash) -- Phase-19 L1a Task 6 --
//
// COOK_REFINE — REPLICATES the COOK cook call (CookBindingService.applyExecuteDefault, src/operational/lieutenant/
// cook-binding.ts) but with a refining pass WHERE the substance supports one (vs COOK_NOW's always-0). startCook's own
// refining-pass gate (production.service.ts) rejects a non-zero pass on a substance that does not support refining passes
// (Brindle/Crick/Hush → max 0 → a 422 VALIDATION_FAILED). Rather than catch-and-fall-back on that 422 (a fragile broad
// catch), this handler PRE-CHECKS the substance's `maxRefiningPasses` and only requests a pass when the substance actually
// supports one: refiningPasses = maxRefiningPasses >= 1 ? 1 : 0. So a Brindle lab (max 0, the slice's COOK host) cleanly
// STARTS a plain cook, while an Ash lab genuinely refines — both without ever provoking a 422. A benign 409 (cook already
// running / no precursor) → NOOP (the binding's benign-409 discipline). A null building / unconfigured substance → NOOP.
//
// DEBT(v1.x): the substance-resolve + startCook call shape is duplicated from CookBindingService.applyExecuteDefault (and
// COOK_NOW) — extract a shared pure fn once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { ProductionService } from '../../../production/production.service';
import { substanceDescriptor, substanceForBuildingType } from '../../../substance/substance-config';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class CookRefineHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(CookRefineHandler.name);
  readonly effectKind = 'COOK_REFINE' as const;

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
    if (substance === null) return 'NOOP';

    // PRE-CHECK: only request a refining pass on a substance that actually supports one (Ash → max >= 1). A non-refining
    // substance (Brindle/Crick/Hush → undefined → 0) gets a plain refiningPasses=0 cook — never provoking startCook's 422.
    const maxRefiningPasses = substanceDescriptor(substance)?.maxRefiningPasses ?? 0;
    const refiningPasses = maxRefiningPasses >= 1 ? 1 : 0;

    try {
      await this.production.startCook(ctx.playerId, buildingId, substance, refiningPasses, {});
      return refiningPasses >= 1 ? 'COOK_REFINED' : 'COOK_STARTED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `COOK_REFINE benign no-op for lieutenant=${ctx.lieutenantId} building=${buildingId} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

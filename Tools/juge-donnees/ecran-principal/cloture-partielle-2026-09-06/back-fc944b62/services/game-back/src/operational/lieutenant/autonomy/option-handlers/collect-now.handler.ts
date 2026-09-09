// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (COLLECT_NOW — the
//             DISTRIBUTION archetype's "act now" option: collect the dealer's whole float into the safehouse) -- L1a T6 --
//
// COLLECT_NOW — REPLICATES DistributionBindingService.applyExecuteDefault (src/operational/lieutenant/distribution-binding.ts)
// VERBATIM (ALL-OR-NOTHING, no amount): resolve the dealer at the assigned dealer-spot + the safehouse at the target,
// PRE-CHECK (skip a doomed call — float ≤ 0, or the whole float would not fit the headroom), then
// SellingService.collect(playerId, dealerEntityId, safehouseEntityId) (the SAME guarded runner pickup the player's
// POST /collect + the binding run — both id args are ENTITY ids, NOT building ids). A benign 409 (empty float / safehouse
// full / concurrent-sell race) → NOOP (the binding's benign-409 discipline). A null building / absent dealer / absent
// safehouse → NOOP.
//
// DEBT(v1.x): the float-fits-headroom pre-check is duplicated from DistributionBindingService.applyExecuteDefault — extract
// a shared pure fn once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { SellingService } from '../../../selling/selling.service';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class CollectNowHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(CollectNowHandler.name);
  readonly effectKind = 'COLLECT_NOW' as const;

  constructor(
    private readonly selling: SellingService,
    private readonly repo: LieutenantRepository,
  ) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const spotBuildingId = ctx.assignedBuildingId;
    if (spotBuildingId === null) return 'NOOP';
    const safehouseBuildingId = ctx.targetBuildingId;
    if (safehouseBuildingId === null) {
      this.logger.warn(
        `COLLECT_NOW: lieutenant=${ctx.lieutenantId} has a null safehouse target (dealer_spot=${spotBuildingId}) — no collect.`,
      );
      return 'NOOP';
    }

    const dealer = await this.repo.getDealerForSpotBuilding(ctx.playerId, spotBuildingId);
    if (dealer === null) return 'NOOP';
    const safehouse = await this.repo.getSafehouseForBuilding(ctx.playerId, safehouseBuildingId);
    if (safehouse === null) return 'NOOP';

    // PRE-CHECK (the binding's VERBATIM doomed-call skip): nothing to ferry, or the whole float would not fit the headroom.
    if (dealer.float_cents <= 0) return 'NOOP';
    const headroomCents = Math.max(0, safehouse.capacity_cents - safehouse.held_cents);
    if (dealer.float_cents > headroomCents) return 'NOOP';

    try {
      await this.selling.collect(ctx.playerId, dealer.dealer_id, safehouse.safehouse_id);
      return 'COLLECTED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `COLLECT_NOW benign no-op for lieutenant=${ctx.lieutenantId} dealer=${dealer.dealer_id} float=${dealer.float_cents} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (INJECT_BASELINE —
//             the LAUNDERING archetype's "act now" option: inject the full safehouse→Stage-1-node amount, accepting a
//             > baseline deviation — the AGGRESSIVE branch of LaunderingBindingService) -- Phase-19 L1a Task 6 --
//
// INJECT_BASELINE — REPLICATES LaunderingBindingService.applyExecuteDefault (src/operational/lieutenant/
// laundering-binding.ts) with respect_baseline=FALSE (aggressive — the per-tick inject is NOT capped at the front-shop's
// legitimate baseline; a > baseline inject succeeds but is flagged a deviation): amount = min( safehouseHeldCents ,
// nodeFreeCapacityCents ). Then LaunderingService.inject(playerId, frontShop=assignedBuildingId, safehouseEntityId, amount)
// (the safehouseId arg is the safehouse ENTITY id, resolved from target_building_id via getSafehouseForBuilding — the
// binding's ASYMMETRIC-id contract). amount <= 0 (empty safehouse / full node) → NOOP. A benign 409 (node hit capacity / a
// RACE) → NOOP. A null building / absent safehouse / absent node → NOOP.
//
// DEBT(v1.x): the min(held, nodeFreeCapacity[, baseline]) inject amount-calc is duplicated from
// LaunderingBindingService.applyExecuteDefault (and INJECT_CONSERVATIVE) — extract a shared pure fn (e.g. injectAmount with
// a respectBaseline flag) once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { LaunderingService } from '../../../laundering/laundering.service';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class InjectBaselineHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(InjectBaselineHandler.name);
  readonly effectKind = 'INJECT_BASELINE' as const;

  constructor(
    private readonly laundering: LaunderingService,
    private readonly repo: LieutenantRepository,
  ) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const frontShopBuildingId = ctx.assignedBuildingId;
    if (frontShopBuildingId === null) return 'NOOP';
    const safehouseBuildingId = ctx.targetBuildingId;
    if (safehouseBuildingId === null) {
      this.logger.warn(
        `INJECT_BASELINE: lieutenant=${ctx.lieutenantId} has a null safehouse target (front_shop=${frontShopBuildingId}) — no inject.`,
      );
      return 'NOOP';
    }

    const safehouse = await this.repo.getSafehouseForBuilding(ctx.playerId, safehouseBuildingId);
    if (safehouse === null) return 'NOOP';
    const node = await this.repo.getStage1NodeOccupancyForBuilding(ctx.playerId, frontShopBuildingId);
    if (node === null) return 'NOOP';

    // AGGRESSIVE amount (respect_baseline=false — NO baseline cap): min(held, node free capacity). All integer cents.
    const freeCapacityCents = Math.max(0, node.capacity_cents - node.occupancy_cents);
    const amount = Math.floor(Math.min(safehouse.held_cents, freeCapacityCents));
    if (amount <= 0) return 'NOOP';

    try {
      await this.laundering.inject(ctx.playerId, frontShopBuildingId, safehouse.safehouse_id, amount);
      return 'INJECTED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `INJECT_BASELINE benign no-op for lieutenant=${ctx.lieutenantId} front_shop=${frontShopBuildingId} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

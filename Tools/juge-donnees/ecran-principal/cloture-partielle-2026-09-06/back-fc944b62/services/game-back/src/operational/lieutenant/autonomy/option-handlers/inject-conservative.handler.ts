// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (INJECT_CONSERVATIVE
//             — the LAUNDERING archetype's conservative option: inject CAPPED at the front-shop's legitimate baseline so
//             it never trips the System-7 audit pin — the CONSERVATIVE branch of LaunderingBindingService) -- L1a T6 --
//
// INJECT_CONSERVATIVE — REPLICATES LaunderingBindingService.applyExecuteDefault (src/operational/lieutenant/
// laundering-binding.ts) with respect_baseline=TRUE (the per-tick inject is additionally capped at
// launderingTunables.frontShopLegitBaselineCents — the SAME baseline the inject's own deviation decision uses): amount =
// min( safehouseHeldCents , nodeFreeCapacityCents , frontShopLegitBaselineCents ). Then LaunderingService.inject(playerId,
// frontShop=assignedBuildingId, safehouseEntityId, amount) (the safehouseId arg is the safehouse ENTITY id from
// getSafehouseForBuilding — the binding's ASYMMETRIC-id contract). amount <= 0 → NOOP. A benign 409 → NOOP. A null
// building / absent safehouse / absent node → NOOP.
//
// DEBT(v1.x): the min(held, nodeFreeCapacity[, baseline]) inject amount-calc is duplicated from
// LaunderingBindingService.applyExecuteDefault (and INJECT_BASELINE) — extract a shared pure fn (e.g. injectAmount with a
// respectBaseline flag) once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { LaunderingService } from '../../../laundering/laundering.service';
import { launderingTunables } from '../../../laundering/laundering-tunables';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class InjectConservativeHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(InjectConservativeHandler.name);
  readonly effectKind = 'INJECT_CONSERVATIVE' as const;

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
        `INJECT_CONSERVATIVE: lieutenant=${ctx.lieutenantId} has a null safehouse target (front_shop=${frontShopBuildingId}) — no inject.`,
      );
      return 'NOOP';
    }

    const safehouse = await this.repo.getSafehouseForBuilding(ctx.playerId, safehouseBuildingId);
    if (safehouse === null) return 'NOOP';
    const node = await this.repo.getStage1NodeOccupancyForBuilding(ctx.playerId, frontShopBuildingId);
    if (node === null) return 'NOOP';

    // CONSERVATIVE amount (respect_baseline=true — capped at the legit baseline so it never trips the System-7 audit pin).
    const freeCapacityCents = Math.max(0, node.capacity_cents - node.occupancy_cents);
    let amount = Math.min(safehouse.held_cents, freeCapacityCents);
    amount = Math.min(amount, launderingTunables.frontShopLegitBaselineCents);
    amount = Math.floor(amount);
    if (amount <= 0) return 'NOOP';

    try {
      await this.laundering.inject(ctx.playerId, frontShopBuildingId, safehouse.safehouse_id, amount);
      return 'INJECTED_CONSERVATIVE';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `INJECT_CONSERVATIVE benign no-op for lieutenant=${ctx.lieutenantId} front_shop=${frontShopBuildingId} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("4 LIVE executors —
//             each wrapping its REAL verb")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 table row 1 —
//             `DISTRIBUTION_RUN` → `DistributionService.dispatch` (`distribution.service.ts:134`,
//             `savedRouteId` — "dispatch sur la saved route ciblée").
//             Pattern (cargo policy): `operational/lieutenant/autonomy/option-handlers/dispatch-now.
//             handler.ts` (`DISPATCH_NOW` — REPLICATES `LogisticsBindingService.applyExecuteDefault`
//             VERBATIM: `cargo = min(lieutenantTunables.logisticsDispatchCargoGrams, source total grams)`
//             then `DistributionService.dispatch(...)`) — the ONE existing "cargo per triggered dispatch"
//             concept in this codebase; REUSED here rather than inventing a new `cue_stack.*` tunable
//             (design §14's own table lists NO cargo-grams key for `DISTRIBUTION_RUN` — flagged for
//             reviewer/C9 reconciliation, none-silent).
//             — P3-D C3 — 2026-07-14
//
// `DistributionRunExecutor` — the `DISTRIBUTION_RUN` `SlotTypeExecutor`. `validateTarget` DELEGATES to
// `CueStackRepository.routeExistsForPlayer` (the SAME method `CueStackService.validateTargetExists` calls
// at compose — ONE implementation, never duplicated). `execute` (the firing-time verb) resolves the saved
// route's origin/destination (`RouteLifecycleRepository.readRoute`, duplicate-provided — see
// `cue-stack.module.ts`'s own header for why: `RouteLifecycleRepository` is NOT exported by
// `DistributionModule`), sizes the cargo via the `dispatch-now.handler.ts` precedent, and calls
// `DistributionService.dispatch` — the REAL production verb, never reimplemented. An empty source (cargo
// <= 0) is a legitimate no-op outcome (`status='noop_empty_source'`, the slot still fires successfully —
// there was simply nothing to move this cycle), NOT a thrown `failed_executor` (mirrors the "empty-state
// L1 skip" convention this codebase uses pervasively for "nothing to do"). Any OTHER throw from `dispatch`
// (insufficient product race, OVER_CAPACITY, a since-severed route, etc.) propagates UNCAUGHT — the tick's
// own catch marks `failed_executor` (D4 — the failure IS the honest outcome, never silently swallowed;
// unlike the AUTONOMY option-handler precedent this file's cargo policy borrows from, a player's OWN
// committed cue-stack plan failing should be VISIBLE in the slot's outcome, not vanish as a silent NOOP).

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { productStorage } from '../../../db/schema/operational_chain';
import { DistributionService } from '../../../operational/distribution/distribution.service';
import { RouteLifecycleRepository } from '../../../operational/distribution/route-lifecycle.repository';
import { lieutenantTunables } from '../../../operational/lieutenant/lieutenant-tunables';
import { CueStackRepository } from '../cue-stack.repository';
import type { CueStackSlot, SlotExecutionContext, SlotOutcome, SlotTypeExecutor, TargetRef } from '../slot-type-executor.interface';

@Injectable()
export class DistributionRunExecutor implements SlotTypeExecutor {
  readonly slotType = 'DISTRIBUTION_RUN' as const;

  constructor(
    private readonly distribution: DistributionService,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly cueStackRepo: CueStackRepository,
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  async validateTarget(playerId: string, targetRef: TargetRef): Promise<boolean> {
    return this.cueStackRepo.routeExistsForPlayer(playerId, targetRef.id);
  }

  async execute(playerId: string, slot: CueStackSlot, _ctx: SlotExecutionContext): Promise<SlotOutcome> {
    const route = await this.routeLifecycleRepo.readRoute(slot.target_ref.id);
    if (!route || route.player_id !== playerId) {
      throw new Error(
        `DISTRIBUTION_RUN executor: route ${slot.target_ref.id} no longer resolves for player ${playerId} ` +
          '(deleted/reassigned since compose) — genuine firing-time failure.',
      );
    }

    const sourceGrams = await this.getSourceProductGramsTotal(route.origin_building_id);
    const cargo = Math.min(lieutenantTunables.logisticsDispatchCargoGrams, sourceGrams);
    if (cargo <= 0) {
      return { status: 'noop_empty_source' };
    }

    // THE VERB — DistributionService.dispatch (design §5.1 table row 1, distribution.service.ts:134).
    const result = await this.distribution.dispatch(
      playerId,
      route.origin_building_id,
      route.destination_building_id,
      cargo,
      'foot',
      false,
      'balanced',
      route.route_id,
    );

    return {
      status: 'dispatched',
      detail: { courierId: result.courierId, shiftId: result.shiftId, cargoGrams: cargo },
    };
  }

  /** Total product grams the source building currently holds (all substances) — the SAME
   *  `product_storage` SUM the `LieutenantRepository.getSourceProductGrams` precedent reads, copied here
   *  (no shared extraction across repositories — this codebase's own established convention) to avoid
   *  pulling `LieutenantModule` into `CueStackModule` for a single trivial read. */
  private async getSourceProductGramsTotal(buildingId: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${productStorage.quantity_grams}), 0)::int` })
      .from(productStorage)
      .where(eq(productStorage.building_id, buildingId));
    return Number(rows[0]?.total ?? 0);
  }
}

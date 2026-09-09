// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C7 sub-task 1 (the patch
//             mechanic — unchanged by ruling B: "sous-tâches 1/3/4 identiques")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.2 (the K2 canon
//             "SI rises by patching" REALIZED GEOMETRICALLY — NIGHTLY/26 sweep + the dispatch-time light
//             check) + §7.3 (collapse, ruling-B OR-extended `evaluateAndMaybeSever`).
//             Decisions: §1.12 D12 (module layout — route domain files stay in `operational/distribution/`,
//             NOT `core_loops/supply_chain/` — RouteService/RouteFinder REUSE by injection).
//             Pattern: `route.service.ts#replanRoute` (the SAME archive-old-path → recompute A* → write-
//             new-path shape, REUSED here rather than duplicated — the ONE difference is `patch_count++`
//             instead of forcing `state='active'`, since a patch must NOT clobber a fresh collapse the
//             very same tick — see `RouteLifecycleRepository.applyPatch`'s own header) + `corridor-debt.
//             service.ts`'s own NIGHTLY OnApplicationBootstrap registration shape.
//             — P3-C C7 — 2026-07-13
//
// `RoutePatchSweepService` — registers `ROUTE_PATCH_SWEEP` at NIGHTLY/26 (confirmed free after
// MYCELIAL_DECAY_TICK/25 — nothing registered past it on this base; MINUTE/26 is a DIFFERENT cadence
// namespace, no collision with the sibling BACKPRESSURE_UPDATE). The tick loops the player's SAVED,
// non-severed, non-rebuilding routes and offers each to `maybePatchRoute` — the ONE method BOTH the
// NIGHTLY tick AND the saved-route dispatch-time light check (`DistributionService.dispatch`'s
// `savedRouteId` path, design §7.2 "check patch léger au dispatch saved") call, zero duplication.
//
// maybePatchRoute(playerId, routeId, gameMinute):
//   1. Reads the route (C7 extended columns). Skips severed/currently-rebuilding routes (a route mid-
//      rebuild is about to get a wholly NEW path anyway — patching it would race the rebuild's own
//      archive/write).
//   2. Trigger (design §7.2, D9 — the EXISTING 9b `distribution.route_saturated_warn_threshold` getter
//      READ here as a SECOND consumer, not renamed/removed from its own 9b "saturated" role, ruling B's
//      own D9 clause: "sous l'option B, les deux gardent leur rôle 9b"): does ANY block of the route's
//      FROZEN path_blocks have `corridor_debt.debt_magnitude >= that threshold`? If not → no-op (false).
//   3. Recomputes A* debt-aware (`RouteFinderService.computePath` with the CURRENT full debt snapshot —
//      the SAME call `replanRoute` makes). If the resulting path is IDENTICAL to the frozen one (JSON-
//      stable-array compare) → no-op (OQ-P1: a patch is a WRITTEN event, never silently re-derived when
//      nothing actually changes).
//   4. Archives the OLD path into `route_version_history` (REUSE `insertVersionHistory`,
//      `route.service.ts:293-299`'s own mechanism) + `RouteLifecycleRepository.applyPatch` (new path/SI/
//      version bump/patch_count++ — does NOT touch `state`).
//   5. Re-runs `RouteService.evaluateAndMaybeSever` — the ONE collapse authority (ruling-B OR-extended) —
//      so a patch that pushed SI >= collapse_threshold collapses THIS SAME tick/dispatch (I6).
//   Returns `true` iff a patch was actually written (the falsifiable "patch happened" signal for E2E).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { Inject } from '@nestjs/common';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { building } from '../../db/schema/city_state';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RouteFinderService } from './route-finder.service';
import type { RouteStance } from './route-finder.service';
import { CorridorDebtService } from './corridor-debt.service';
import { RouteService } from './route.service';
import { distributionRouteLifecycleTunables } from './distribution-tunables';

@Injectable()
export class RoutePatchSweepService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoutePatchSweepService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly routeFinder: RouteFinderService,
    private readonly corridorDebt: CorridorDebtService,
    private readonly routeService: RouteService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.ROUTE_PATCH_SWEEP,
      cadence: Cadence.NIGHTLY,
      order: 26,
      run: (ctx) => this.runTick(ctx),
    });
    this.logger.log(
      'RoutePatchSweepService registered ROUTE_PATCH_SWEEP at NIGHTLY/26 — next free after ' +
        'MYCELIAL_DECAY_TICK/25. Each in-game night, per player, every saved non-severed non-rebuilding ' +
        'route with a hot (>= warn threshold) corridor-debt block on its path gets a debt-aware A* ' +
        'recompute; a changed path is archived+written (patch_count++) then re-evaluated for collapse ' +
        '(ruling-B OR-extended evaluateAndMaybeSever). Organic no-op for a player with no hot routes.',
    );
  }

  /** {NIGHTLY, order 26} — the per-player tick body. */
  private async runTick(ctx: CitySimTickContext): Promise<void> {
    const savedRoutes = await this.routeLifecycleRepo.listSavedNonSeveredNonRebuildingRouteIds(ctx.playerId, ctx.gameMinute);
    let patchedCount = 0;
    for (const routeId of savedRoutes) {
      if (await this.maybePatchRoute(ctx.playerId, routeId, ctx.gameMinute)) {
        patchedCount++;
      }
    }
    if (patchedCount > 0) {
      this.logger.log(`ROUTE_PATCH_SWEEP: player=${ctx.playerId} gameMinute=${ctx.gameMinute} -> ${patchedCount} route(s) patched.`);
    }
  }

  /**
   * The shared patch attempt — see file header for the full 5-step walk. Called by the NIGHTLY tick
   * (looping every saved route) AND by `DistributionService.dispatch`'s saved-route path (ONE route,
   * event-driven, BEFORE the I7 claim guard — design §7.2's "check patch léger au dispatch saved").
   * Returns `true` iff a patch was actually written this call.
   */
  async maybePatchRoute(playerId: string, routeId: string, gameMinute: number): Promise<boolean> {
    const row = await this.routeLifecycleRepo.readRouteExtended(routeId);
    if (!row || row.player_id !== playerId) return false;
    if (row.state === 'severed') return false;
    if (row.rebuild_completes_at_tick !== null && row.rebuild_completes_at_tick > gameMinute) return false;

    const pathBlocks = Array.isArray(row.path_blocks) ? (row.path_blocks as number[]) : [];
    if (pathBlocks.length === 0) return false;

    // Step 2 — trigger: ANY block >= the (REUSED 9b) warn threshold.
    const warnThreshold = distributionRouteLifecycleTunables.routeSaturatedWarnThreshold;
    let hot = false;
    for (const blockId of pathBlocks) {
      if ((await this.corridorDebt.debtFor(playerId, blockId)) >= warnThreshold) {
        hot = true;
        break;
      }
    }
    if (!hot) return false;

    // Step 3 — recompute A* debt-aware (the SAME call replanRoute makes).
    const [originBuilding] = await this.db
      .select({ block_id: building.block_id })
      .from(building)
      .where(eq(building.building_id, row.origin_building_id))
      .limit(1);
    const [destBuilding] = await this.db
      .select({ block_id: building.block_id })
      .from(building)
      .where(eq(building.building_id, row.destination_building_id))
      .limit(1);
    if (!originBuilding || !destBuilding) return false;

    const debtSnapshot = await this.corridorDebt.fullDebtSnapshot(playerId);
    const pathResult = await this.routeFinder.computePath(
      playerId,
      originBuilding.block_id,
      destBuilding.block_id,
      row.vehicle_type,
      row.stance as RouteStance,
      debtSnapshot,
    );
    if (!pathResult) return false;

    const changed = JSON.stringify(pathResult.pathBlocks) !== JSON.stringify(pathBlocks);
    if (!changed) return false;

    // Step 4 — archive + write (patch_count++, version++, state UNTOUCHED).
    await this.routeLifecycleRepo.insertVersionHistory({
      route_id: routeId,
      version: row.version,
      path_blocks: pathBlocks,
      severed_at_tick: null, // this route is NOT severed (guarded above) — a patch, not a sever archive.
      replanned_at_tick: BigInt(gameMinute),
    });
    await this.routeLifecycleRepo.applyPatch(routeId, {
      path_blocks: pathResult.pathBlocks,
      straight_line_distance: pathResult.straightLineDistance,
      sinuosity_index: pathResult.sinuosityIndex,
      river_crossings: pathResult.riverCrossings,
      newVersion: row.version + 1,
    });

    // Step 5 — re-evaluate collapse (ruling-B OR-extended, I6 exactly-once).
    await this.routeService.evaluateAndMaybeSever(playerId, routeId, gameMinute);

    return true;
  }
}

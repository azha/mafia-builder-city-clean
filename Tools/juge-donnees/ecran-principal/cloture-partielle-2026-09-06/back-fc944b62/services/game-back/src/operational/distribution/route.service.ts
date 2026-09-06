// IMPLEMENTS: docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 7 (C7) + Task 9 (C9)
//             DD-PERSIST — persistent route CRUD (createRoute/listRoutes/getRoute/deleteRoute)
//             DD-SEVER — derived saturation (max-of-corridors over corridor_debt, OQ-SV1) + sever state machine
//             DD-REPLAN — versioned replan: same route_id, version bump, prior path → route_version_history (OQ-RP1)
//             System 9b C7 — 2026-06-23 | C9 — 2026-06-23
//             P3-C C7 — docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C7 — RULING B
//             (dual-drivers): the OR-extended collapse condition in `evaluateAndMaybeSever` (debt OU SI
//             >= sinuosity_collapse_threshold) + I6 exactly-once collapse (RouteCollapseExceptionProducer)
//             + I8 anti-bypass on createRoute/deleteRoute. The ruling header (plan, above §C7): "sweep
//             N/12 conservé tel quel" — `runSeverSweepTick` below is BYTE-UNTOUCHED by this chunk (its
//             own inline debt-only threshold compare stays exactly as System 9b C9 wrote it — EVERY
//             existing 9b assertion against it stays green, the ruling-B zero-churn promise). The OR
//             condition lives ONLY in `evaluateAndMaybeSever`, reached from: the pre-existing `_test`
//             seams (unaffected — SI stays at its 1.0 default in every 9b fixture, register §0 row 1's
//             own C7 re-anchor), the NEW `RoutePatchSweepService` (NIGHTLY/26 + saved-route dispatch
//             light-check), and the NEW `RouteRebuildService` (post-rebuild re-evaluation).
//
// RouteService: the persistent route CRUD + C9 sever/replan mechanics. Additive per chunk:
//   C7 (9b): createRoute / listRoutes / getRoute / deleteRoute
//   C9 (9b): deriveSaturation / evaluateAndMaybeSever / replanRoute + light sweep (OnApplicationBootstrap)
//   C7 (P3-C, ruling B): evaluateAndMaybeSever's OR-extended collapse + I6 exactly-once producer call;
//     createRoute/deleteRoute I8 anti-bypass guards.
//
// OQ-P1: a saved route's path_blocks is FROZEN until replan (no recompute on read).
// DD-DEBT-SSOT: NO debt column on route (D3 — verified absent).
// DD-SEVER: saturation is DERIVED (max-of-corridors via CorridorDebtService.debtFor, NOT stored).
// DD-REPLAN: replan keeps same route_id; bumps version; archives old path → route_version_history.
// OQ-EV1: NO RouteSeveredEvent emitted — route.state column is the durable signal (YAGNI). SUPERSEDED
//   PARTIALLY by P3-C's canon K4 (design divergence #11): a collapse now emits an EXCEPTION card (NOT a
//   generic event bus topic — DD-P2, no new event bus) via RouteCollapseExceptionProducer.
// C4: no Math.random, no Date.now.
// R2.2: straight_line_distance / sinuosity_index are server-only.

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { route } from '../../db/schema/operational_chain';
import { building } from '../../db/schema/city_state';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RouteFinderService } from './route-finder.service';
import type { RouteStance } from './route-finder.service';
import { ApiError } from '../../protocol/api-error';
import { CorridorDebtService } from './corridor-debt.service';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { distributionRouteLifecycleTunables } from './distribution-tunables';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import { RouteCollapseExceptionProducer } from '../../core_loops/supply_chain/route-collapse-exception-producer.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';

/** Route states (mirrors routeState pgEnum — kept local to avoid importing the pgEnum object). */
export type RouteState = 'draft' | 'active' | 'saturated' | 'severed';

export interface CreateRouteInput {
  originBlock: number;
  destBlock: number;
  vehicleType: string;
  stance: RouteStance;
  routeName?: string;
  waypoints?: number[];
  gameMinute: number;
}

@Injectable()
export class RouteService implements OnApplicationBootstrap {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly routeFinder: RouteFinderService,
    private readonly corridorDebt: CorridorDebtService,
    private readonly scheduler: CitySimSchedulerService,
    // P3-C C7 — the collapse producer (ruling-B, I6). Provided+exported by SupplyChainModule
    // (DistributionModule already imports it — a one-way edge, no new cycle).
    private readonly collapseProducer: RouteCollapseExceptionProducer,
    // P3-D C6 — CityEventBus (from SchedulerModule, already imported into DistributionModule — no new
    // import needed): emits ROUTE_CREATED for the annealing subscriber (design §9.2).
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    // C9 DD-SEVER — light sweep (NIGHTLY/12, next free after CORRIDOR_DEBT_DECAY NIGHTLY/11).
    // Flips saved routes to 'severed' (or 'saturated') when max-of-corridors debt meets/exceeds threshold.
    // This lets the player see the 'severed' badge BEFORE attempting a dispatch (OQ-SV3 light-sweep).
    // DERIVED read — never writes corridor_debt (DD-DEBT-SSOT D3). Deterministic. No Math.random.
    this.scheduler.registerSystem({
      id: CitySystemId.ROUTE_SEVER_SWEEP,
      cadence: Cadence.NIGHTLY,
      order: 12,
      run: (ctx) => this.runSeverSweepTick(ctx),
    });
  }

  /**
   * Create a persistent saved route for a player.
   * Runs computePath (with empty debt snapshot at C7 — C8 populates real debt),
   * persists with is_saved=true, state='active', version=1.
   * OQ-P1: path_blocks is frozen until replan (no recompute on read).
   * DD-DEBT-SSOT: NO debt column on route.
   */
  async createRoute(
    playerId: string,
    input: CreateRouteInput,
  ): Promise<{ routeId: string }> {
    // C8: real debt snapshot for A* (DD-DEBT-SSOT — player's corridor_debt rows).
    // Zero-regression: no rows → empty map → debt penalty 0.0 → path byte-identical to C7.
    const debtSnapshot = await this.corridorDebt.fullDebtSnapshot(playerId);

    // Validate waypoints before running A* (OQ-W1: reject invalid/unreachable).
    if (input.waypoints && input.waypoints.length > 0) {
      const validation = await this.routeFinder.validateWaypoints(
        playerId,
        input.waypoints,
        input.vehicleType,
      );
      if (!validation.ok) {
        throw new ApiError('VALIDATION_FAILED', {
          message: validation.reason ?? 'Invalid waypoints',
        });
      }
    }

    const pathResult = await this.routeFinder.computePath(
      playerId,
      input.originBlock,
      input.destBlock,
      input.vehicleType,
      input.stance,
      debtSnapshot,
      input.waypoints,
    );

    if (!pathResult) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No path found from block ${input.originBlock} to block ${input.destBlock} for vehicleType=${input.vehicleType}`,
      });
    }

    // Find the player's buildings at the given blocks (origin + destination).
    const [originBuilding] = await this.db
      .select({ building_id: building.building_id })
      .from(building)
      .where(
        and(
          eq(building.player_id, playerId),
          eq(building.block_id, input.originBlock),
        ),
      )
      .limit(1);

    const [destBuilding] = await this.db
      .select({ building_id: building.building_id })
      .from(building)
      .where(
        and(
          eq(building.player_id, playerId),
          eq(building.block_id, input.destBlock),
        ),
      )
      .limit(1);

    if (!originBuilding || !destBuilding) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `Player does not own buildings at blocks ${input.originBlock} and/or ${input.destBlock}`,
      });
    }

    // ── P3-C C7 — I8 anti-bypass (design §7.5): refuse a FRESH route for a (player, origin, dest)
    // triple that ALREADY has a saved, severed route. Without this guard, a player could route around
    // the rebuild cost entirely by just creating a brand-new route between the same endpoints (no
    // UNIQUE constraint blocks it — register §0 row 1) instead of ever paying to rebuild the severed
    // one. The severed route itself can never be deleted (deleteRoute's own I8 guard below), so there is
    // no race where this check could observe "no severed route" only because a concurrent delete just
    // removed it (I8 concurrency scenario, plan §C7).
    const existingSevered = await this.routeLifecycleRepo.findSavedSeveredRouteForEndpoints(
      playerId,
      originBuilding.building_id,
      destBuilding.building_id,
    );
    if (existingSevered) {
      throw new ApiError('REBUILD_REQUIRED', {
        message:
          `route ${existingSevered.route_id} between these endpoints is severed — rebuild it ` +
          `(POST /v1/operational/routes/${existingSevered.route_id}/rebuild) before creating a new one.`,
      });
    }

    const { route_id: routeId } = await this.routeLifecycleRepo.insertRoute({
      player_id: playerId,
      origin_building_id: originBuilding.building_id,
      destination_building_id: destBuilding.building_id,
      path_blocks: pathResult.pathBlocks,
      river_crossings: pathResult.riverCrossings,
      ephemeral_mode: false,
      straight_line_distance: pathResult.straightLineDistance,
      sinuosity_index: pathResult.sinuosityIndex,
      stance: input.stance,
      vehicle_type: input.vehicleType as 'foot' | 'bike' | 'car' | 'refrigerated_van',
      route_name: input.routeName ?? null,
      is_saved: true,
      state: 'active',
      version: 1,
    });

    // P3-D C6 — additive one-line emit (design §9.2): the annealing subscriber initiates/compounds
    // settling on BOTH the origin and destination buildings.
    this.bus.emitRouteCreated({
      type: 'route_created',
      playerId,
      routeId,
      originBuildingId: originBuilding.building_id,
      destinationBuildingId: destBuilding.building_id,
      gameMinute: input.gameMinute,
    });

    return { routeId };
  }

  /** List all saved routes for a player. */
  async listRoutes(playerId: string): Promise<{ routes: unknown[] }> {
    const rows = await this.db
      .select()
      .from(route)
      .where(and(eq(route.player_id, playerId), eq(route.is_saved, true)));
    return { routes: rows };
  }

  /** Get a single route by ID (ownership check). */
  async getRoute(playerId: string, routeId: string): Promise<{ route: unknown } | null> {
    const row = await this.routeLifecycleRepo.readRoute(routeId);
    if (!row || row.player_id !== playerId) return null;
    return { route: row };
  }

  /**
   * Delete a saved route (ownership check).
   *
   * P3-C C7 — I8 anti-bypass (design §7.5): a `severed` route can NEVER be deleted — the ONLY exit is
   * one of the 3 paid rebuild modes (MINIMAL_REROUTE is cheap — no dead-end joueur, design §7.5). The
   * actual delete is a CONDITIONAL `DELETE ... WHERE state != 'severed' RETURNING` (`RouteLifecycleRepository.
   * deleteRouteIfNotSevered`) — TOCTOU-zero: a route that becomes severed by a CONCURRENT collapse
   * evaluator between the ownership pre-read below and this delete still refuses (0 rows), never
   * silently deletes a route that just collapsed.
   */
  async deleteRoute(playerId: string, routeId: string): Promise<{ deleted: boolean }> {
    const row = await this.routeLifecycleRepo.readRoute(routeId);
    if (!row || row.player_id !== playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Route ${routeId} not found` });
    }
    const deleted = await this.routeLifecycleRepo.deleteRouteIfNotSevered(routeId, playerId);
    if (!deleted) {
      // The conditional DELETE matched 0 rows despite the ownership pre-read above finding the row —
      // the ONLY way that happens is state==='severed' (I8 — the anti-bypass guard).
      throw new ApiError('REBUILD_REQUIRED', {
        message:
          `route ${routeId} is severed — it cannot be deleted. Rebuild it ` +
          `(POST /v1/operational/routes/${routeId}/rebuild) first.`,
      });
    }
    return { deleted: true };
  }

  // ── C9 DD-SEVER ──────────────────────────────────────────────────────────────────────────────────

  /**
   * C9 — Derive the saturation level for a route's path_blocks (DD-SEVER, OQ-SV1 max-of-corridors).
   *
   * Returns the MAX `corridor_debt.debt_magnitude` over all blocks in `pathBlocks`.
   * This is a LIVE read over the `corridor_debt` table (NO stored route accumulator — DD-DEBT-SSOT D3).
   * Zero-regression: empty pathBlocks or no debt rows → returns 0.0 → route remains 'active'.
   *
   * C4: no Math.random, no Date.now. Pure deterministic max.
   */
  async deriveSaturation(playerId: string, pathBlocks: number[]): Promise<number> {
    if (pathBlocks.length === 0) return 0;
    // OQ-SV1: max-of-corridors (worst-case-honest, mirrors 9a OQ-7 precinct choice).
    let maxDebt = 0;
    for (const blockId of pathBlocks) {
      const debt = await this.corridorDebt.debtFor(playerId, blockId);
      if (debt > maxDebt) maxDebt = debt;
    }
    return maxDebt;
  }

  /**
   * C9 — Evaluate saturation and maybe update the route state (DD-SEVER, OQ-SV2/SV3).
   *
   * ★ RULING B (P3-C C7, dual-drivers — decisions §6.1 ruling): the collapse condition is an OR of TWO
   * independent drivers, DD-SEVER 9b PRESERVED verbatim + the NEW canon SI driver ADDED alongside it:
   *   - saturation >= route_sever_threshold (9b, UNCHANGED)             → collapse
   *   - OR sinuosity_index >= core_loops.sinuosity_collapse_threshold (NEW, canon K3) → collapse
   *   - else saturation >= route_saturated_warn_threshold → state = 'saturated' (warn band, UNCHANGED)
   *   - else → state = 'active' (UNCHANGED)
   * ZERO existing 9b assertion is affected: every 9b `_test` fixture seeds `sinuosity_index` at its
   * schema default (1.0, far below 2.4) or leaves it unset — the OR's NEW right-hand side is never true
   * for those fixtures, so the debt-only left-hand side alone still decides the outcome exactly as
   * before (9b-untouched-green, the ruling-B promise).
   *
   * The COLLAPSE transition itself is now I6 exactly-once (design §7.3/D10): an atomic `UPDATE ... WHERE
   * state != 'severed' RETURNING` (`RouteLifecycleRepository.severIfNotAlready`) — the Exception
   * (`RouteCollapseExceptionProducer`) is raised ONLY from the winning side of that RETURNING, so two
   * concurrent evaluators of the SAME route produce exactly one card (the plan §C7 concurrency
   * falsifiable). The 'saturated'/'active' branches are unaffected — a plain conditional UPDATE (no
   * Exception, no atomicity requirement beyond the existing read-then-write, matching 9b's own
   * behavior byte-for-byte).
   *
   * Ownership: if route doesn't exist or belongs to another player → throws RESOURCE_NOT_FOUND.
   *
   * C4: no Math.random, no Date.now. Pure threshold compare (getter-sourced, no inline 10.0/6.0/2.4).
   * OQ-EV1: SUPERSEDED PARTIALLY on the collapse branch only (design divergence #11) — no generic
   * RouteSeveredEvent, but the collapse now raises an Exception card (canon K4).
   */
  async evaluateAndMaybeSever(
    playerId: string,
    routeId: string,
    gameMinute: number,
  ): Promise<RouteState> {
    void gameMinute; // reserved for future severed_at_tick writes; unused in C9 per OQ-EV1 YAGNI.
    const row = await this.routeLifecycleRepo.readRoute(routeId);
    if (!row || row.player_id !== playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Route ${routeId} not found` });
    }

    const pathBlocks = Array.isArray(row.path_blocks) ? (row.path_blocks as number[]) : [];
    const saturation = await this.deriveSaturation(playerId, pathBlocks);

    const severThreshold     = distributionRouteLifecycleTunables.routeSeverThreshold;
    const warnThreshold      = distributionRouteLifecycleTunables.routeSaturatedWarnThreshold;
    const collapseThreshold  = coreLoopsTunables.sinuosityCollapseThreshold;

    // ★ RULING B — the OR condition (debt driver UNCHANGED, SI driver NEW/ADDITIVE).
    const debtDriverSevers = saturation >= severThreshold;
    const siDriverSevers   = row.sinuosity_index >= collapseThreshold;

    let newState: RouteState;
    if (debtDriverSevers || siDriverSevers) {
      newState = 'severed';
    } else if (saturation >= warnThreshold) {
      newState = 'saturated';
    } else {
      newState = 'active';
    }

    if (newState === 'severed') {
      // I6 exactly-once: only the winner of the atomic RETURNING raises the card.
      const wonTransition = await this.routeLifecycleRepo.severIfNotAlready(routeId);
      if (wonTransition) {
        await this.collapseProducer.raiseIfClear(playerId, routeId);
      }
    } else if (row.state !== newState) {
      // Unaffected 9b path — plain conditional UPDATE, no Exception, byte-identical to pre-C7 behavior.
      await this.routeLifecycleRepo.updateRouteState(routeId, newState);
    }
    return newState;
  }

  /**
   * C9 — Replan a saved route in-place (DD-REPLAN, OQ-RP1).
   *
   * Keeps the SAME route_id (identity preserved — D4).
   * Archives the CURRENT path_blocks + severed_at_tick into route_version_history.
   * Re-runs computePath with the CURRENT debt snapshot (A* avoids saturated/expensive corridors).
   * Bumps route.version += 1; sets state='active'.
   * Returns { version: newVersion } (the bumped version number).
   *
   * Ownership: if route doesn't exist or belongs to another player → throws RESOURCE_NOT_FOUND.
   * OQ-P1: the saved route's path_blocks is NOT recomputed on read — only on explicit replan.
   * C4: no Math.random, no Date.now.
   * DD-DEBT-SSOT: re-runs A* with current debt; NO new debt column written.
   */
  async replanRoute(
    playerId: string,
    routeId: string,
    gameMinute: number,
  ): Promise<{ version: number }> {
    const row = await this.routeLifecycleRepo.readRoute(routeId);
    if (!row || row.player_id !== playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Route ${routeId} not found` });
    }

    const oldPathBlocks = Array.isArray(row.path_blocks) ? (row.path_blocks as number[]) : [];
    const oldVersion    = row.version;
    const wasSevered    = row.state === 'severed';

    // Archive the OLD path_blocks into route_version_history BEFORE overwriting.
    // severed_at_tick = gameMinute if the route was severed at time of replan; null otherwise.
    await this.routeLifecycleRepo.insertVersionHistory({
      route_id: routeId,
      version: oldVersion,
      path_blocks: oldPathBlocks,
      severed_at_tick: wasSevered ? BigInt(gameMinute) : null,
      replanned_at_tick: BigInt(gameMinute),
    });

    // Re-run computePath with the CURRENT debt snapshot (A* penalizes saturated corridors).
    // Same endpoints/stance/vehicle/waypoints as the original route (D4 identity preservation).
    const debtSnapshot = await this.corridorDebt.fullDebtSnapshot(playerId);

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

    if (!originBuilding || !destBuilding) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `Origin or destination building not found for route ${routeId}`,
      });
    }

    const pathResult = await this.routeFinder.computePath(
      playerId,
      originBuilding.block_id,
      destBuilding.block_id,
      row.vehicle_type,
      row.stance as RouteStance,
      debtSnapshot,
    );

    const newPathBlocks   = pathResult?.pathBlocks ?? oldPathBlocks;
    const newVersion      = oldVersion + 1;
    const riverCrossings  = pathResult?.riverCrossings  ?? row.river_crossings;
    const sinuosityIndex  = pathResult?.sinuosityIndex  ?? row.sinuosity_index;
    const straightLineDist= pathResult?.straightLineDistance ?? row.straight_line_distance;

    // Update the route row: new path + bumped version + state='active' (identity: same route_id).
    await this.routeLifecycleRepo.updateRoutePath(routeId, {
      path_blocks: newPathBlocks,
      straight_line_distance: straightLineDist,
      sinuosity_index: sinuosityIndex,
      river_crossings: riverCrossings,
    });
    await this.routeLifecycleRepo.bumpRouteVersion(routeId, newVersion);

    return { version: newVersion };
  }

  // ── C9 Light sever sweep (NIGHTLY/12) ────────────────────────────────────────────────────────────

  /**
   * C9 — NIGHTLY/12 light sever sweep (OQ-SV3 second half).
   * Scans all SAVED routes for this player; evaluates saturation for each.
   * Flips state to 'severed' / 'saturated' / 'active' according to the threshold compare.
   * This is a DERIVED read — never writes corridor_debt (DD-DEBT-SSOT D3).
   * Deterministic: ctx.gameMinute, no Math.random, no Date.now.
   */
  private async runSeverSweepTick(ctx: CitySimTickContext): Promise<void> {
    // Load all saved routes for this player.
    const savedRoutes = await this.db
      .select({ route_id: route.route_id, path_blocks: route.path_blocks, state: route.state })
      .from(route)
      .where(and(eq(route.player_id, ctx.playerId), eq(route.is_saved, true)));

    for (const r of savedRoutes) {
      const pathBlocks = Array.isArray(r.path_blocks) ? (r.path_blocks as number[]) : [];
      const saturation = await this.deriveSaturation(ctx.playerId, pathBlocks);

      const severThreshold = distributionRouteLifecycleTunables.routeSeverThreshold;
      const warnThreshold  = distributionRouteLifecycleTunables.routeSaturatedWarnThreshold;

      let newState: RouteState;
      if (saturation >= severThreshold) {
        newState = 'severed';
      } else if (saturation >= warnThreshold) {
        newState = 'saturated';
      } else {
        newState = 'active';
      }

      if (r.state !== newState) {
        await this.routeLifecycleRepo.updateRouteState(r.route_id, newState);
      }
    }
  }
}

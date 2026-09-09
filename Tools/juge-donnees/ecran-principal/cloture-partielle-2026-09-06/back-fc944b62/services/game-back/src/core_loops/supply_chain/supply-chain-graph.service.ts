// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C9 ("projections joueur :
//             supply-chain graph view (nodes + legs + routes en BUCKETS uniquement : Backpressure/Debt/
//             SinuosityStress/TimeToCollapse + états qualitatifs) ; R2.2 wall")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §4 (le graphe — nodes
//             & legs, le modèle partagé), §6.3 ("le graph view coloré par buckets reste canon-conforme",
//             backpressure_trace.md:91 — the WHOLE-graph read this file builds is explicitly sanctioned,
//             unlike the single-hop `trace-step` verb's own deliberate "never the full path" restraint),
//             §7.6 (`SinuosityStressBucket`/`TimeToCollapseBucket`), §13 (the R2.2/P5 wall — the client
//             NEVER sees `backpressure_index`/`debt_load`/`sinuosity_index`/`straight_line_distance`/
//             `stress_streak`/`patch_count`; it sees buckets + qualitative states + refs).
//             Pattern: `BackpressureTraceService` (bucket-derivation-from-getters shape, REUSE
//             `backpressureBucket` verbatim, same C5 ⊥ MINOR-2 discipline for `is_blocked_output`) +
//             `core-loops-admin.controller.ts`'s own "direct schema read, no cross-module import" idiom
//             (`route`/`routeVersionHistory` are pure Drizzle schema objects — importing them here adds
//             ZERO NestJS module edge; `SupplyChainModule` still imports NOTHING from `DistributionModule`,
//             the one-way edge `distribution.module.ts`'s own header documents stays one-way).
//             — P3-C C9 — 2026-07-13
//
// `SupplyChainGraphService` — the PLAYER-facing graph-view combiner (design §4/§13): nodes (backpressure
// buckets), legs (debt buckets), routes (sinuosity-stress + time-to-collapse buckets), ALL bucket/ref-only
// — the single new READ this chunk's R2.2 wall is built around. Reads 3 sources directly (no write path
// here at all):
//   - `SupplyNodePressureRepository.readAllRaw` (existing, C5/C6) — nodes.
//   - `LegRepository.listLegsForPlayer` (NEW, this chunk) — legs.
//   - `route`/`routeVersionHistory` (direct schema read, this chunk) — routes + their patch/replan/rebuild
//     cadence (the `TimeToCollapseBucket` v1 heuristic's own substrate, `time-to-collapse-bucket.ts`).
//
// Only SAVED routes (`is_saved = true`) are graphed — mirrors `RouteService.listRoutes`'s own filter: an
// ad-hoc dispatch route is ephemeral and carries no player-durable identity to render as a graph node.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { route, routeVersionHistory } from '../../db/schema/operational_chain';
import { SupplyNodePressureRepository } from './supply-node-pressure.repository';
import { LegRepository } from './leg.repository';
import { backpressureBucket, type BackpressureBucket } from './backpressure-bucket';
import { debtBucket, type DebtBucket } from './debt-bucket';
import { sinuosityStressBucket, type SinuosityStressBucket } from './sinuosity-stress-bucket';
import { timeToCollapseBucket, type TimeToCollapseBucket, TIME_TO_COLLAPSE_RECENT_WINDOW_TICKS } from './time-to-collapse-bucket';
import { coreLoopsTunables } from '../core-loops-tunables';

export interface NodeGraphView {
  readonly buildingId: string;
  readonly bucket: BackpressureBucket;
  readonly hasArrow: boolean;
  readonly arrowToBuildingId: string | null;
}

export interface LegGraphView {
  readonly legId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly debtBucket: DebtBucket;
  readonly bypassed: boolean;
}

export interface RouteGraphView {
  readonly routeId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly sinuosityStressBucket: SinuosityStressBucket;
  readonly timeToCollapseBucket: TimeToCollapseBucket;
  /** Qualitative route-lifecycle state (design §7.6 buckets already fold `severed` in; `state` is
   *  surfaced alongside for `saturated` — a DISTINCT qualitative reading from the sinuosity bucket, e.g.
   *  a `pristine`-SI route can still be `saturated` via the debt driver, ruling-B dual-drivers, C7). */
  readonly state: 'draft' | 'active' | 'saturated' | 'severed';
  /** Downtime, qualitative — NEVER the raw `rebuild_completes_at_tick` countdown (design §7.4/§13). */
  readonly rebuilding: boolean;
}

export interface SupplyChainGraphView {
  readonly nodes: readonly NodeGraphView[];
  readonly legs: readonly LegGraphView[];
  readonly routes: readonly RouteGraphView[];
}

@Injectable()
export class SupplyChainGraphService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly pressureRepository: SupplyNodePressureRepository,
    private readonly legRepository: LegRepository,
  ) {}

  private backpressureBucketOf(index: number): BackpressureBucket {
    return backpressureBucket(
      index,
      coreLoopsTunables.backpressureMildThreshold,
      coreLoopsTunables.backpressureWarmThreshold,
      coreLoopsTunables.backpressureCriticalThreshold,
    );
  }

  private debtBucketOf(load: number): DebtBucket {
    return debtBucket(load, coreLoopsTunables.mycelialStressThreshold, coreLoopsTunables.mycelialDebtCap);
  }

  /** `GET /v1/supply-chain/graph` (design §4/§13) — the WHOLE bucket-only graph, one call. */
  async getGraph(playerId: string): Promise<SupplyChainGraphView> {
    const [rawNodes, rawLegs, gameMinute] = await Promise.all([
      this.pressureRepository.readAllRaw(playerId),
      this.legRepository.listLegsForPlayer(playerId),
      this.legRepository.getCurrentGameMinute(playerId),
    ]);

    const nodes: NodeGraphView[] = rawNodes.map((n) => ({
      buildingId: n.buildingId,
      bucket: this.backpressureBucketOf(n.backpressureIndex),
      // arrow_to_building_id is cleared IMMEDIATELY on relief (applyRelief, C5) — unlike blocked_sources
      // it is NEVER stale (the C5 ⊥ MINOR-2 finding this chunk's siblings all cite), so a plain
      // null-check is safe here with no extra `isBlockedOutput` gate needed.
      hasArrow: n.arrowToBuildingId != null,
      arrowToBuildingId: n.arrowToBuildingId,
    }));

    const legs: LegGraphView[] = rawLegs.map((l) => ({
      legId: l.legId,
      originBuildingId: l.originBuildingId,
      destinationBuildingId: l.destinationBuildingId,
      debtBucket: this.debtBucketOf(l.debtLoad),
      bypassed: l.bypassed,
    }));

    const routes = await this.listRouteGraphViews(playerId, gameMinute);

    return { nodes, legs, routes };
  }

  /**
   * Saved routes for this player + their `route_version_history` cadence (design §7.6, `TimeToCollapse
   * Bucket`'s own v1 heuristic substrate) — ONE route select + ONE aggregate join, merged in JS (D13:
   * routes ordered by route_id for a stable, deterministic response order).
   */
  private async listRouteGraphViews(playerId: string, gameMinute: number): Promise<RouteGraphView[]> {
    const routeRows = await this.db
      .select({
        routeId: route.route_id,
        originBuildingId: route.origin_building_id,
        destinationBuildingId: route.destination_building_id,
        sinuosityIndex: route.sinuosity_index,
        state: route.state,
        rebuildCompletesAtTick: route.rebuild_completes_at_tick,
      })
      .from(route)
      .where(and(eq(route.player_id, playerId), eq(route.is_saved, true)))
      .orderBy(route.route_id);

    if (routeRows.length === 0) return [];

    const recentCutoff = gameMinute - TIME_TO_COLLAPSE_RECENT_WINDOW_TICKS;
    const historyResult = await this.db.execute(sql`
      SELECT
        ${routeVersionHistory.route_id} AS route_id,
        count(*)::int AS total_count,
        count(*) FILTER (WHERE ${routeVersionHistory.replanned_at_tick} >= ${recentCutoff}::bigint)::int AS recent_count
      FROM ${routeVersionHistory}
      INNER JOIN ${route} ON ${route.route_id} = ${routeVersionHistory.route_id}
      WHERE ${route.player_id} = ${playerId}::uuid
      GROUP BY ${routeVersionHistory.route_id}
    `);
    const historyRows =
      (historyResult as unknown as { rows?: Array<Record<string, unknown>> }).rows ??
      (historyResult as unknown as Array<Record<string, unknown>>);
    const historyByRouteId = new Map<string, { totalCount: number; recentCount: number }>();
    for (const r of historyRows) {
      historyByRouteId.set(String(r.route_id), {
        totalCount: Number(r.total_count),
        recentCount: Number(r.recent_count),
      });
    }

    return routeRows.map((r) => {
      const history = historyByRouteId.get(r.routeId) ?? { totalCount: 0, recentCount: 0 };
      return {
        routeId: r.routeId,
        originBuildingId: r.originBuildingId,
        destinationBuildingId: r.destinationBuildingId,
        sinuosityStressBucket: sinuosityStressBucket(
          r.state,
          r.sinuosityIndex,
          coreLoopsTunables.sinuosityStressWarningThreshold,
          coreLoopsTunables.sinuosityStressedBucketUpperBound,
        ),
        timeToCollapseBucket: timeToCollapseBucket(r.state, history.totalCount > 0, history.recentCount),
        state: r.state,
        rebuilding: r.rebuildCompletesAtTick != null && r.rebuildCompletesAtTick > gameMinute,
      };
    });
  }
}

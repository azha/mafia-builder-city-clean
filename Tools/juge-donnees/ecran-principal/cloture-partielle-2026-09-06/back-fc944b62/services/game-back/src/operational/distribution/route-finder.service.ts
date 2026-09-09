// IMPLEMENTS: docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 3 (C3)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 4 (C4)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 5 (C5)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 6 (C6)
//             docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §3.1 DD-GRAPH
//             docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §3.2 DD-ASTAR-COST
//             docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §3.2bis DD-STRAIGHTLINE
//             docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §3.4 DD-WAYPOINT
//             System 9b C3 — DD-GRAPH (the seed-derived two-layer block-graph) — 2026-06-22
//             System 9b C4 — DD-ASTAR-COST (deterministic A* computePath) — 2026-06-23 (re-impl 2026-06-23)
//             System 9b C6 — DD-WAYPOINT (validate + A*-link legs) — 2026-06-23
//
// `RouteFinderService` — the A* route-finder foundation. THIS FILE scope:
//   C3: `onModuleInit()` — builds the two-layer block-graph ONCE at bootstrap (mirror
//       `PatrolDoctrineService.loadGeographyMapping`).
//       `neighbors(blockId, vehicleType)` — reads the bootstrap graph + prunes river edges the vehicle
//       cannot traverse (vehicle-gated, canon :87).
//   C4: `computePath(playerId, originBlock, destBlock, vehicleType, stance, debtSnapshot, waypoints?)` —
//       the deterministic A* over the C3 graph. DD-ASTAR-COST cost formula (5 terms, all getter-sourced):
//         edge_cost = w_dist × edge.stepCost / vehicleSpeedFor(vehicle)
//                   + w_patrol × patrolPenalty(v)          // blockRho from getPatrolLoadRaw [0,1]
//                   + w_detection × detectionPenalty(v, vehicle) // vehicleFactor × blockRhoFactor
//                   + w_debt × debtSnapshot.get(v) ?? 0    // corridor-debt (C8 populates; 0 at C4)
//       NOTE: edge.stepCost for river edges ALREADY BAKES IN astarDistrictTransitionCost +
//             thrennyTraversalCostUnits (set in C3 buildLayer2ThrennyAsync). The w_dist term uses
//             edge.stepCost as step_distance — NO separate river_penalty term (that would double-count).
//       `straightLineDistance(o, d)` — D_min(o, d) = distance-only Dijkstra minimum under d_step.
//                                      (DD-STRAIGHTLINE §3.2bis correctness fix: NOT a geometric proxy.)
//   C5: `sinuosityBucket(index): SinuosityBucket` — the direct|meandering|gnarled cut helper.
//   C6: `validateWaypoints(playerId, waypoints, vehicleType)` — validate + A*-link legs.
//       DD-WAYPOINT §3.4: validate each waypoint (real block + each leg reachable by the vehicle),
//       then A*-link the legs: A*(o→w1) ++ A*(w1→w2) ++ … ++ A*(wk→dest), de-duping shared
//       endpoints. The sinuosity_index uses the WHOLE-ROUTE D_min(origin→dest) as denominator
//       (so a manual detour reads as MORE sinuous than the auto path — sinuosity ≥ 1.0 provable).
//       An invalid/unreachable waypoint set returns { ok: false, reason } — R2.2 (qualitative,
//       never a raw exception leaked to the client).
//
// ─── DD-ASTAR-COST §3.2 + DD-STRAIGHTLINE §3.2bis (correctness fix — the 5-term cost formula) ──
//
// Per-edge cost (from the design §3.2 DD-ASTAR-COST, all weights getter-sourced — NO inline scalar):
//
//   edge_cost(u → v, stance, vehicle, debtSnapshot) =
//       w_distance(stance) × edge.stepCost / vehicleSpeedFor(vehicle)     // step_distance / speed
//     + w_patrol(stance)   × patrolPenalty(v)                             // blockRho ∈ [0,1]
//     + w_detection(stance) × detectionPenalty(v, vehicle)               // vehicleFactor × blockRhoFactor
//     + w_debt(stance)     × (debtSnapshot.get(v) ?? 0)                  // corridor-debt at v (C8: real; C4: 0)
//
// Where:
//   - `edge.stepCost` = 1.0 for intra-district grid steps; astarDistrictTransitionCost + thrennyTraversalCostUnits
//     for river edges (already baked in C3 — no double-count). The stepCost IS the step_distance(u→v) = d_step(u→v).
//   - `vehicleSpeedFor(vehicle)` = REUSE from distribution-tunables.ts (vehicleSpeedFor getter).
//   - `patrolPenalty(v)` = getPatrolLoadRaw(playerId, precinctId) → min(1, activeCount/capacity).
//   - `detectionPenalty(v, vehicle)` = vehicleFactor(vehicle) × blockRhoFactor(blockRho) — the two
//     block/vehicle-specific factors from computeDetectionProb. NOT the full computeDetectionProb (which
//     requires per-shift cargoGrams/sessionsActive — not available at routing time). This uses ONLY the
//     location-specific factors, making the A* minimize the block-specific risk exposure.
//   - `debtSnapshot.get(v) ?? 0` = corridor-debt at v (C8 will populate this from the corridor_debt table;
//     at C4 the snapshot is an empty Map → debt penalty = 0 for all blocks, correct and honest).
//
// CARRY-FORWARD obligations (reviewer⊥ WILL check):
//   CF-1. Tie-break = lowest-block-id, EXPLICIT (the comparator in the priority-queue tie-break).
//   CF-2. vehicle_speed_factor source = vehicleSpeedFor() from distribution-tunables.ts.
//   CF-3. No double-counting the river penalty: edge.stepCost already includes threnny cost.
//   CF-4. isReachable is test-only BFS — computePath uses real A* cost-weighted search.
//
// ── DD-STRAIGHTLINE §3.2bis (C4-gate correctness fix, 2026-06-23) ────────────────────────────────
//
// `straight_line_distance := D_min(origin, dest)` — the distance-ONLY graph minimum:
//   A Dijkstra run over d_step only (ignoring patrol/detection/debt/speed) gives the minimum
//   possible d_step sum from origin to dest. This is the provably valid lower bound for any route's
//   path_length (since any path's d_step sum ≥ D_min by definition).
//
// `path_length := Σ d_step(edge)` over the chosen A*-path — the SAME d_step units.
//   (This is NOT the raw block-count `pathBlocks.length - 1`, which was the original bug:
//   a cross-district edge contributes 5.0 or 7.0 d_step, not 1.)
//
// `sinuosity_index := path_length / straight_line_distance`, with an origin==dest guard → 1.0.
//   By construction path_length ≥ D_min ⇒ sinuosity_index ≥ 1.0 ALWAYS (cross-district, cross-bank
//   included). The old geometric proxy could yield < 1.0 for cross-district routes (sinuosity=0.3
//   was the gate-failing case). That bug is DELETED: `globalBlockPosition` is REMOVED.
//
// Heuristic: `h ≡ 0` (Dijkstra-on-cost) — FROZEN default. Trivially admissible (all edge costs ≥ 0).
//   Guarantees optimal path. No geometric heuristic (the source of the admissibility bug) is used.
//
// UNIT-CONSISTENCY: path_length and straight_line_distance BOTH use the d_step metric (edge.stepCost).
//   The reviewer⊥ checks that the same `edge.stepCost` field is the summed quantity in both computations.
//
// Determinism (C4): NO Math.random, NO Date.now. Same (graph, endpoints, stance, vehicle, debtSnapshot)
// → same path. The lowest-block-id tie-break guarantees a unique canonical path.
//
// Zero-regression: a 2-block A* result (adjacent origin+dest) is [origin, dest] — byte-identical to
// the M1 stub's `path_blocks: [fromBlockId, toBlockId]`. C4 does NOT wire into live dispatch (C7 does).
//
// OQ-anti-fabrication note: all w_* weights are getter-sourced via `distributionRouteLifecycleTunables.astarW*`
// (C2 registered keys). The vehicle speed uses the EXISTING `vehicleSpeedFor` (not a new scalar).
// The patrol/detection penalties REUSE `getPatrolLoadRaw`/`detectionVehicleFactor*`/`detectionBlockRhoMin*`
// from existing services — not re-implemented here.
//
// ─── DD-GRAPH §3.1 (resolves DIV-G1 — the load-bearing geography gap) ───────────────────────────
//
// The seeded geography (migration 0016) defines:
//   - 18 districts with `bank_side ∈ {north, south}` (9 north, 9 south).
//   - ~900 blocks with LOCAL per-district coordinates (x,y) and a formula-based `id`.
//   - 6 threnny_edges (cross-bank river edges, bridge|ferry type).
//
// It does NOT define: general inter-district connectivity, global block positions, or a block-graph.
//
// DD-GRAPH authors a DETERMINISTIC, SEED-DERIVED two-layer graph:
//
//   Layer 1 — Intra-district grid adjacency:
//     Within a district, a block's neighbors are its N/E/S/W local-grid neighbors. This REUSES
//     `gridNeighbourBlockIds` (exported from `flow_cells.service.ts`) — the SAME algorithm
//     `FlowCellsService.neighbourIndices()` now delegates to. ONE grid-walk implementation. DRY.
//     Intra-district step cost = 1.0 (the unit step).
//
//   Layer 2 — Inter-district connectivity:
//     (i) Same-bank district-adjacency chain (OQ-G1): for each bank (north/south), sort districts by
//         their seeded `id` and chain them in id-order (district i connects to district i+1 within the
//         same bank). This is a pure deterministic function of the seeded district ids + bank_side —
//         NO hand-baked per-row adjacency table in code. Each same-bank district-transition edge
//         connects the LOWEST-id block of each district (OQ-G2 pattern, gateway blocks). Cost =
//         `astarDistrictTransitionCost` (getter-sourced, default 5.0, OQ-G3).
//     (ii) 6 threnny_edges (cross-bank river crossings): each threnny edge (bridge|ferry) connects
//         the lowest-id block of the north district to the lowest-id block of the south district
//         (OQ-G2 — the deterministic gateway-block rule). Edge cost = `astarDistrictTransitionCost` +
//         `thrennyTraversalCostUnits` (both getter-sourced). `isRiverEdge=true`.
//
//   Vehicle-gated traversability (canon :87):
//     - `bridge` river edge: car/van only (foot/bike CANNOT cross a bridge).
//     - `ferry` river edge: all vehicle types.
//     - Intra-district + same-bank land transitions: all vehicle types.
//
// Determinism (C4): the graph is built from the STATIC seeded geography (read-only after migration 0016).
// Same seed → byte-identical graph. NO `Math.random`, NO `Date.now`, NO per-row hand-baked constants.
//
// OQ-G4 REUSE: `PatrolDoctrineService.precinctsForBlocks` is the block→precinct source of truth;
//   it is injected and used by `computePath` (C4) for the patrol penalty — NOT reimplemented here.
// OQ-G5: the graph is in-service derived (NO new geography table).
//
// DIV-G1 RESOLUTION: the same-bank adjacency (ii-a) is the ONLY authored inter-district land link.
//   It is a pure function of the seeded `districts.id` + `bank_side` — provably not a magic constant.
//   The reviewer⊥ can verify: `rg --type ts 'routerDistrictAdjacency\|northChain\|southChain'` in this
//   file returns only the deterministic sort + chain construction — no literal adjacency array.
//
// BINDING OBLIGATION met:
//   Layer-1 REUSES `gridNeighbourBlockIds` exported from `flow_cells.service.ts` (the REUSE PROOF:
//   `FlowCellsService.neighbourIndices()` also delegates to this same function — the original call site
//   at `flow_cells.service.ts:238` is byte-identical, and the flow-cells specs stay green).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { asc } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { districts, blocks, thrennyEdges } from '../../db/schema/world_geography';
import type { ThrennyEdgeTypeEnumTs } from '../../db/schema/world_geography';
import { FlowCellsService, gridNeighbourBlockIds } from '../../citysim/flow_cells/flow_cells.service';
import { PatrolDoctrineService } from '../../citysim/patrol/patrol.service';
import {
  distributionRouteLifecycleTunables,
  distributionDetectionTunables,
  vehicleSpeedFor,
} from './distribution-tunables';

// ─── Graph edge type ──────────────────────────────────────────────────────────────────────────────

/** A single edge in the block-graph (directed). `to` = neighbor block id; `stepCost` = A* edge weight;
 * `isRiverEdge` = true for threnny (cross-bank) edges. */
export interface BlockGraphEdge {
  to: number;
  stepCost: number;
  isRiverEdge: boolean;
  edgeType?: ThrennyEdgeTypeEnumTs; // only set for river edges ('bridge' | 'ferry')
}

/** Neighbor query result (the `neighbors()` method signature per plan). */
export type NeighborResult = { to: number; stepCost: number; isRiverEdge: boolean };

// ─── C4 types ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Route stance (DD-STANCE §3.3) — the auto-routing weight profile.
 * Source: `route_stance` pgEnum from C1 schema migration 0075.
 * Shared signatures (plan): `RouteStance = 'fastest' | 'balanced' | 'evasive'`.
 */
export type RouteStance = 'fastest' | 'balanced' | 'evasive';

// ─── C5 types ─────────────────────────────────────────────────────────────────────────────────────

/**
 * `SinuosityBucket` — the player-facing sinuosity telegraph (DD-SINUOSITY §3.5, C5).
 * Closed presentation domain — NEVER exposes the raw `sinuosity_index` (P5 / R2.2).
 *   direct:    sinuosity_index < sinuosityDirectMax (1.3 default) — near-straight path.
 *   meandering: sinuosityDirectMax ≤ index < sinuosityMeanderingMax (2.0 default) — winding path.
 *   gnarled:   index ≥ sinuosityMeanderingMax — highly circuitous path.
 * Cuts are getter-sourced (NO inline 1.3/2.0 — CF R2.3 anti-fabrication).
 */
export type SinuosityBucket = 'direct' | 'meandering' | 'gnarled';

/**
 * A* output (DD-ASTAR-COST §3.2, canon :314 `PathResult`).
 * Shared signatures (plan):
 *   `PathResult = { pathBlocks: number[]; straightLineDistance: number; sinuosityIndex: number; riverCrossings: number }`
 * All scalar fields are server-only (R2.2 / P5 wall — never leak raw values to clients).
 */
export interface PathResult {
  /** The ordered sequence of block ids from origin to destination (the A* path). */
  pathBlocks: number[];
  /**
   * straight_line_distance = D_min(origin, dest) — the distance-ONLY graph minimum (Dijkstra on
   * d_step, ignoring patrol/detection/debt/speed). DD-STRAIGHTLINE §3.2bis: NOT a geometric proxy.
   * Server-only (R2.2 — never leak to clients; the sinuosity denominator).
   */
  straightLineDistance: number;
  /**
   * sinuosity_index = path_length / straight_line_distance.
   * path_length = Σ d_step(edge) over the chosen path (SAME unit as straight_line_distance).
   * Always ≥ 1.0 by construction (path_length ≥ D_min). Server-only (R2.2).
   */
  sinuosityIndex: number;
  /** Number of river (threnny) edges in the path. */
  riverCrossings: number;
}

// ─── RouteFinderService ───────────────────────────────────────────────────────────────────────────

@Injectable()
export class RouteFinderService implements OnModuleInit {
  private readonly logger = new Logger(RouteFinderService.name);

  /**
   * The bootstrap block-graph: `blockId → BlockGraphEdge[]`.
   * Built ONCE in `onModuleInit`. READ-ONLY after build.
   * Deterministic: same seeded geography → same graph.
   */
  private readonly graph = new Map<number, BlockGraphEdge[]>();

  /**
   * District → the block ids it contains. Built at bootstrap from the seeded `blocks` table.
   * Used to find the gateway block (lowest id) for inter-district edges (OQ-G2).
   */
  private readonly districtBlockIds = new Map<number, number[]>();

  /**
   * Block id → district id. Built at bootstrap.
   */
  private readonly blockToDistrict = new Map<number, number>();

  /**
   * Block id → local grid coordinates {x, y}. Built at bootstrap (used by buildLayer1 for the
   * gridNeighbourBlockIds call — the Layer-1 adjacency rule from flow_cells.service.ts).
   */
  private readonly _blockCoords = new Map<number, { x: number; y: number }>();

  /**
   * District id → bank_side. Built at bootstrap.
   */
  private readonly districtBankSide = new Map<number, 'north' | 'south'>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly flowCells: FlowCellsService,
    // C4 — injected for patrol penalty (getPatrolLoadRaw) + precinct resolution (precinctForBlock).
    // PatrolDoctrineService is already provided via PatrolDoctrineModule (imported in DistributionModule C0).
    private readonly patrolDoctrineService: PatrolDoctrineService,
  ) {}

  // ─── Bootstrap ─────────────────────────────────────────────────────────────────────────────────

  /**
   * Build the two-layer block-graph ONCE at bootstrap (mirror `PatrolDoctrineService.loadGeographyMapping`).
   * The graph is deterministic and seed-derived — NO `Math.random`, NO hand-baked adjacency table.
   * After this call, `graph` is READ-ONLY; `neighbors()` is safe to call from any context.
   */
  async onModuleInit(): Promise<void> {
    await this.loadGeographyFromDb();
    this.buildGraph();
    this.logger.log(
      `RouteFinderService: block-graph built — ${this.graph.size} blocks, ` +
        `Layer-1 (intra-district REUSE neighbourIndices) + Layer-2 (same-bank id-chain + 6 threnny edges).`,
    );
  }

  // ─── Public graph API ──────────────────────────────────────────────────────────────────────────

  /**
   * The graph adjacency for `blockId`, vehicle-gated (canon :87):
   *   - A `bridge` river edge is pruned for `foot` and `bike` (those can only use `ferry`).
   *   - A `ferry` river edge is available for all vehicle types.
   *   - Intra-district and same-bank land transitions are available for all vehicle types.
   *
   * Returns `{ to, stepCost, isRiverEdge }[]` — an empty array for unknown block ids.
   * PURE read of the bootstrap graph. Deterministic. No side-effects.
   */
  neighbors(blockId: number, vehicleType: string): NeighborResult[] {
    const edges = this.graph.get(blockId) ?? [];
    return edges
      .filter((e) => {
        if (!e.isRiverEdge) return true; // intra-district / same-bank land: all vehicles OK
        if (e.edgeType === 'ferry') return true; // ferry: all vehicles OK (canon :87)
        // bridge: car/van only (foot/bike cannot cross a bridge — canon :87)
        return vehicleType === 'car' || vehicleType === 'refrigerated_van';
      })
      .map((e) => ({ to: e.to, stepCost: e.stepCost, isRiverEdge: e.isRiverEdge }));
  }

  /**
   * Whether a block id is known in the seeded geography (used by validation).
   */
  blockExists(blockId: number): boolean {
    return this.blockToDistrict.has(blockId);
  }

  /**
   * All block ids in the graph (for reachability checks).
   */
  allBlockIds(): number[] {
    return [...this.graph.keys()];
  }

  // ─── Private: geography load ────────────────────────────────────────────────────────────────────

  /**
   * Load the seeded geography from the DB:
   *   - All districts (id + bank_side).
   *   - All blocks (id + district_id), ordered by id (for deterministic gateway-block selection).
   *   - All threnny_edges (id + edge_type + north_district_id + south_district_id).
   *
   * Populates `districtBankSide`, `blockToDistrict`, `districtBlockIds`, and `_thrennyEdges` in one
   * bootstrap pass. All queries read the STATIC seeded geography (no player_id, no writes).
   */
  private async loadGeographyFromDb(): Promise<void> {
    // ── Districts ─────────────────────────────────────────────────────────────────────────────────
    const districtRows = await this.db
      .select({ id: districts.id, bank_side: districts.bank_side })
      .from(districts)
      .orderBy(asc(districts.id));

    for (const d of districtRows) {
      this.districtBankSide.set(d.id, d.bank_side);
    }

    // ── Blocks ────────────────────────────────────────────────────────────────────────────────────
    // Sorted by id (ascending) so the FIRST element of each district's block list = the lowest-id
    // block = the gateway block (OQ-G2 deterministic rule).
    const blockRows = await this.db
      .select({ id: blocks.id, district_id: blocks.district_id, coordinates: blocks.coordinates })
      .from(blocks)
      .orderBy(asc(blocks.id));

    for (const b of blockRows) {
      this.blockToDistrict.set(b.id, b.district_id);
      const list = this.districtBlockIds.get(b.district_id) ?? [];
      list.push(b.id);
      this.districtBlockIds.set(b.district_id, list);
      // Store per-block coordinates (used by buildLayer1 for gridNeighbourBlockIds).
      const coords = b.coordinates as { x: number; y: number };
      this._blockCoords.set(b.id, { x: coords.x, y: coords.y });
    }

    // ── Threnny edges ─────────────────────────────────────────────────────────────────────────────
    const thrennyRows = await this.db
      .select({
        id: thrennyEdges.id,
        edge_type: thrennyEdges.edge_type,
        north_district_id: thrennyEdges.north_district_id,
        south_district_id: thrennyEdges.south_district_id,
      })
      .from(thrennyEdges)
      .orderBy(asc(thrennyEdges.id));

    this._thrennyEdges = thrennyRows;

    this.logger.debug(
      `geometry loaded: ${blockRows.length} blocks, ${districtRows.length} districts, ` +
        `${thrennyRows.length} threnny edges`,
    );
  }

  // ─── Private: graph construction ───────────────────────────────────────────────────────────────

  /**
   * Build the two-layer graph from the loaded geography. PURE deterministic function of the seed.
   * No `Math.random`. Stable sort: block lists are already sorted ascending (by id) from the DB query.
   */
  private buildGraph(): void {
    // Initialize an empty edge-list for every known block.
    for (const blockId of this.blockToDistrict.keys()) {
      this.graph.set(blockId, []);
    }

    // Layer 1: intra-district grid adjacency (REUSE gridNeighbourBlockIds from flow_cells.service.ts).
    this.buildLayer1();

    // Layer 2a: same-bank district-adjacency id-chain.
    this.buildLayer2SameBank();

    // Layer 2b: 6 threnny_edges (cross-bank river crossings).
    this.buildLayer2ThrennyAsync();
  }

  /**
   * Layer-1: intra-district grid adjacency (THE REUSE of FlowCellsService's grid-walk algorithm).
   *
   * Calls `gridNeighbourBlockIds` (exported from `flow_cells.service.ts`) — the SAME algorithm
   * `FlowCellsService.neighbourIndices` now delegates to. There is ONE grid-walk implementation.
   *
   * We use our own loaded `_blockCoords` and `districtBlockIds` (loaded in `loadGeographyFromDb`)
   * rather than depending on `FlowCellsService`'s runtime state, avoiding the NestJS `OnApplicationBootstrap`
   * ordering issue (both services run at the same lifecycle phase; ordering not guaranteed).
   *
   * Each edge is undirected (both directions) with stepCost=1.0 (the unit intra-district step).
   * Total cost: O(N blocks × district-size scan) — acceptable at bootstrap (runs once).
   */
  private buildLayer1(): void {
    const INTRA_STEP_COST = 1.0;

    for (const [blockId, districtId] of this.blockToDistrict.entries()) {
      const coords = this._blockCoords.get(blockId);
      if (!coords) continue;

      // THE REUSE CALL: `gridNeighbourBlockIds` is exported from `flow_cells.service.ts` and is
      // the exact same grid-walk algorithm as `FlowCellsService.neighbourIndices` delegates to.
      // NOT re-implemented: there is one grid-walk algorithm in the codebase.
      const neighbours = gridNeighbourBlockIds(
        coords.x,
        coords.y,
        districtId,
        (distId) => this.districtBlockIds.get(distId),
        (bid) => this._blockCoords.get(bid),
      );

      for (const neighbourId of neighbours) {
        this.addEdge(blockId, neighbourId, INTRA_STEP_COST, false, undefined);
      }
    }
    this.logger.debug(`Layer-1 (intra-district REUSE gridNeighbourBlockIds from flow_cells.service.ts): edges added.`);
  }

  /**
   * Layer-2a: same-bank district-adjacency id-chain (OQ-G1, DIV-G1).
   *
   * DERIVATION (pure function of seeded district ids + bank_side, NO magic constants):
   *   1. Separate districts into two groups by bank_side (north / south).
   *   2. Sort each group by district id (ascending) — the seeded id order is already deterministic.
   *   3. Chain adjacent pairs in the sorted order: district[0]↔district[1], district[1]↔district[2], …
   *   4. For each chained district pair (A, B): connect the lowest-id block of A to the lowest-id block
   *      of B (OQ-G2 gateway rule). Cost = `astarDistrictTransitionCost` (getter-sourced, OQ-G3).
   *
   * This is NOT a hand-baked adjacency table. The adjacency is fully determined by the seeded district
   * id order — byte-identical for every boot. The reviewer⊥ can verify by inspecting `northChain` and
   * `southChain` below — they are sorted arrays of seeded ids, NOT a literal adjacency map.
   */
  private buildLayer2SameBank(): void {
    const transitionCost = distributionRouteLifecycleTunables.astarDistrictTransitionCost;

    // Group districts by bank_side, sort by id (ascending — deterministic).
    const northIds: number[] = [];
    const southIds: number[] = [];
    for (const [distId, bankSide] of this.districtBankSide.entries()) {
      if (bankSide === 'north') northIds.push(distId);
      else southIds.push(distId);
    }
    // Sort ascending by id — the canonical deterministic order (OQ-G1: "id-ordered chain").
    northIds.sort((a, b) => a - b);
    southIds.sort((a, b) => a - b);

    // Chain each consecutive pair within a bank.
    for (const chain of [northIds, southIds]) {
      for (let i = 0; i < chain.length - 1; i++) {
        const distA = chain[i];
        const distB = chain[i + 1];
        const gatewayA = this.lowestIdBlock(distA);
        const gatewayB = this.lowestIdBlock(distB);
        if (gatewayA === undefined || gatewayB === undefined) continue; // should not happen
        // Undirected edge: A→B and B→A.
        this.addEdge(gatewayA, gatewayB, transitionCost, false, undefined);
        this.addEdge(gatewayB, gatewayA, transitionCost, false, undefined);
      }
    }

    this.logger.debug(
      `Layer-2a (same-bank id-chain): ${northIds.length} north districts chained + ` +
        `${southIds.length} south districts chained (transitionCost=${transitionCost}).`,
    );
  }

  /**
   * Layer-2b: 6 threnny_edges (cross-bank river crossings, OQ-G2).
   *
   * For each threnny edge (north_district_id, south_district_id, edge_type):
   *   - Gateway block of the north district = lowest-id block in that district (OQ-G2).
   *   - Gateway block of the south district = lowest-id block in that district (OQ-G2).
   *   - Edge cost = `astarDistrictTransitionCost` + `thrennyTraversalCostUnits` (both getter-sourced).
   *   - `isRiverEdge=true`, `edgeType = bridge|ferry` (for vehicle gating in `neighbors()`).
   *
   * NOTE: this method is called `buildLayer2ThrennyAsync()` but runs synchronously (the threnny rows
   * were loaded in `loadGeographyFromDb()` — we re-query here for encapsulation). On bootstrap this
   * runs once; the cost is negligible.
   *
   * For correctness: we re-read the threnny edges from the DB synchronously-safe via a stored local
   * copy populated in `loadGeographyFromDb`. To avoid a second DB call, we pass the threnny data
   * inline (the 6 rows are read below in the private field `_thrennyEdges`).
   */
  private buildLayer2ThrennyAsync(): void {
    const transitionCost = distributionRouteLifecycleTunables.astarDistrictTransitionCost;
    const riverCrossingCost = distributionRouteLifecycleTunables.thrennyTraversalCostUnits;
    const totalRiverCost = transitionCost + riverCrossingCost;

    for (const edge of this._thrennyEdges) {
      const gatewayNorth = this.lowestIdBlock(edge.north_district_id);
      const gatewaySouth = this.lowestIdBlock(edge.south_district_id);
      if (gatewayNorth === undefined || gatewaySouth === undefined) continue;

      const edgeType = edge.edge_type as ThrennyEdgeTypeEnumTs;
      // Undirected river edge: north↔south.
      this.addEdge(gatewayNorth, gatewaySouth, totalRiverCost, true, edgeType);
      this.addEdge(gatewaySouth, gatewayNorth, totalRiverCost, true, edgeType);
    }

    this.logger.debug(
      `Layer-2b (threnny_edges): ${this._thrennyEdges.length} cross-bank river edges added ` +
        `(riverCost=${totalRiverCost} = ${transitionCost}+${riverCrossingCost}).`,
    );
  }

  // ─── Private helpers ───────────────────────────────────────────────────────────────────────────

  /** The lowest-id block of a district (OQ-G2 gateway-block rule). Returns undefined if no blocks. */
  private lowestIdBlock(districtId: number): number | undefined {
    const ids = this.districtBlockIds.get(districtId);
    if (!ids || ids.length === 0) return undefined;
    // The list was built from the DB query ordered by ascending block id, so ids[0] is the lowest.
    return ids[0];
  }

  /** Add a directed edge from `from` to `to`. Deduplicates by `to` to avoid duplicating bidirectional
   * edges from Layer-1 (which already adds both directions). */
  private addEdge(
    from: number,
    to: number,
    stepCost: number,
    isRiverEdge: boolean,
    edgeType: ThrennyEdgeTypeEnumTs | undefined,
  ): void {
    const edges = this.graph.get(from);
    if (!edges) return; // unknown block — skip
    // Dedup: don't add a duplicate edge to the same target (can happen if multiple inter-district
    // paths share a gateway block). Keep the LOWER cost edge if a conflict arises.
    const existing = edges.find((e) => e.to === to);
    if (existing) {
      if (stepCost < existing.stepCost) {
        existing.stepCost = stepCost;
        existing.isRiverEdge = isRiverEdge;
        existing.edgeType = edgeType;
      }
      return;
    }
    edges.push({ to, stepCost, isRiverEdge, edgeType });
  }

  /**
   * Threnny edge rows loaded at bootstrap (via the DB query in `loadGeographyFromDb`).
   * Stored here so `buildLayer2ThrennyAsync` can read them without a second DB round-trip.
   */
  private _thrennyEdges: { id: number; edge_type: string; north_district_id: number; south_district_id: number }[] = [];

  // ─── C4: DD-ASTAR-COST — the deterministic A* + straightLineDistance ─────────────────────────────

  /**
   * `computePath` — the deterministic A* (DD-ASTAR-COST §3.2 + DD-STRAIGHTLINE §3.2bis re-impl).
   *
   * Computes the minimum-cost path from `originBlock` to `destBlock` using the C3 block-graph,
   * the DD-ASTAR-COST 5-term edge-cost formula (all weights getter-sourced — NO inline scalar),
   * and the lowest-block-id tie-break (CF-1 — deterministic).
   *
   * Cost formula (design §3.2):
   *   edge_cost(u → v) =
   *       w_dist × edge.stepCost / vehicleSpeedFor(vehicle)    // CF-2: vehicleSpeedFor, not inline scalar
   *     + w_patrol × patrolPenalty(v)                          // blockRho ∈ [0,1] from getPatrolLoadRaw
   *     + w_detection × detectionPenalty(v, vehicle)           // vehicleFactor × blockRhoFactor
   *     + w_debt × (debtSnapshot.get(v) ?? 0)                 // corridor-debt (C8: real; C4: 0)
   *
   * CF-3 (no double-count): edge.stepCost for river edges ALREADY BAKES IN
   *   `astarDistrictTransitionCost + thrennyTraversalCostUnits` (set in C3 buildLayer2ThrennyAsync).
   *   The w_dist term uses edge.stepCost as step_distance — NO separate river_penalty term is added.
   *
   * CF-4: `isReachable` is test-only BFS. This method uses real A* cost-weighted search.
   *
   * Heuristic: h ≡ 0 (Dijkstra-on-cost). FROZEN default per DD-STRAIGHTLINE §3.2bis.
   *   - Trivially admissible (all edge costs ≥ 0 ⇒ h=0 never over-estimates remaining cost).
   *   - Guarantees the optimal path under the stance weights (precondition for DD-EVASIVE-CONTRACT §6).
   *   - Eliminates the inadmissibility bug: the prior geometric heuristic overestimated remaining
   *     cost for cross-district routes → non-optimal paths + sinuosity < 1.0. Removed entirely.
   *
   * Tie-break (CF-1): when two candidates have equal f-score (= g-score since h≡0), the candidate
   *   with the LOWER block-id is chosen first. Enforced by the priority queue comparator — explicit.
   *
   * Path-length tracking (DD-STRAIGHTLINE §3.2bis):
   *   - `pathStepSum[v]` = Σ d_step(edge) from origin to v (the same `edge.stepCost` values).
   *   - On goal-reached, sinuosity_index = pathStepSum[dest] / straightLineDistance(o, d).
   *   - straight_line_distance = D_min(o, d) via `straightLineDistance()` (Dijkstra on d_step only).
   *   UNIT-CONSISTENCY: path_length and straight_line_distance use the SAME d_step metric.
   *
   * Returns `null` if no path exists (unreachable — caller handles gracefully).
   *
   * @param playerId — the player id (for patrol-load lookup — same player, real patrol state).
   * @param originBlock — the start block id (graph-known).
   * @param destBlock — the destination block id (graph-known).
   * @param vehicleType — the courier vehicle type (graph edge gating + speed divisor).
   * @param stance — the A* weight profile (fastest/balanced/evasive; C5 extends — at C4 all 3 work).
   * @param debtSnapshot — corridor-debt values per block (from CorridorDebtService at C8; empty Map at C4).
   * @param waypoints — optional waypoint list (C6 DD-WAYPOINT): when provided and non-empty, the path
   *   is the A*-linked concatenation of legs: A*(o→w1) ++ A*(w1→w2) ++ … ++ A*(wk→dest).
   *   Each leg uses the same vehicle+stance+debtSnapshot for its cost function. Shared endpoints
   *   are de-duplicated (the last block of each leg = the first block of the next leg, kept once).
   *   sinuosity_index uses D_min(origin→dest) as the denominator (the WHOLE-ROUTE straight-line),
   *   so a manual waypoint detour reads as MORE sinuous than the direct auto path.
   *   If waypoints is empty or undefined, the standard single-leg A* is used (zero-regression).
   */
  async computePath(
    playerId: string,
    originBlock: number,
    destBlock: number,
    vehicleType: string,
    stance: RouteStance,
    debtSnapshot: Map<number, number>,
    waypoints?: number[],
  ): Promise<PathResult | null> {
    // C6 DD-WAYPOINT: if waypoints are provided and non-empty, delegate to the multi-leg linker.
    // An empty waypoints array is treated the same as undefined (zero-regression: no change to C5).
    if (waypoints && waypoints.length > 0) {
      return this.computePathWithWaypoints(playerId, originBlock, destBlock, vehicleType, stance, debtSnapshot, waypoints);
    }

    if (originBlock === destBlock) {
      // origin == dest: zero-length path. Sinuosity guard → 1.0 (DD-STRAIGHTLINE §3.2bis).
      return {
        pathBlocks: [originBlock],
        straightLineDistance: 0,
        sinuosityIndex: 1.0,
        riverCrossings: 0,
      };
    }

    // Dijkstra-on-cost (h ≡ 0, DD-STRAIGHTLINE §3.2bis FROZEN default).
    // gScore[v] = cost of the cheapest known path from origin to v (the full 5-term cost).
    // pathStepSum[v] = Σ d_step(edge) from origin to v (edge.stepCost sums — the d_step metric).
    // parent[v] = the predecessor block in the optimal path.
    // riverCount[v] = number of river edges used to reach v.

    const gScore = new Map<number, number>();
    const parent = new Map<number, number>();
    const riverCount = new Map<number, number>(); // Σ river edges from origin to v
    // DD-STRAIGHTLINE §3.2bis: track the d_step sum along the chosen path (unit-consistency).
    // pathStepSum[v] = Σ edge.stepCost from origin → v (NOT divided by vehicleSpeed).
    const pathStepSum = new Map<number, number>();

    const vehicleSpeed = vehicleSpeedFor(vehicleType); // CF-2: getter-sourced, not inline

    gScore.set(originBlock, 0);
    riverCount.set(originBlock, 0);
    pathStepSum.set(originBlock, 0); // zero d_step at origin

    // Priority queue: a sorted array of { blockId, gScore } (h≡0, so fScore = gScore).
    // The tie-break rule (CF-1): equal gScore → lower blockId first.
    // Implementation: a min-priority array (small graph ~900 blocks — O(N²) is fine here).

    // Closed set: blocks we have fully processed.
    const closed = new Set<number>();

    // Open set implemented as a min-priority array (h≡0, so priority = gScore).
    // Each entry: { blockId, fScore } where fScore = gScore (h≡0).
    interface PQEntry {
      blockId: number;
      fScore: number; // = gScore (h≡0)
    }
    const open: PQEntry[] = [{ blockId: originBlock, fScore: 0 }]; // h(origin) = 0

    const extractMin = (): PQEntry | undefined => {
      if (open.length === 0) return undefined;
      let minIdx = 0;
      for (let i = 1; i < open.length; i++) {
        const a = open[i];
        const b = open[minIdx];
        // CF-1: tie-break = lowest-block-id (EXPLICIT comparator — not relying on iteration order).
        if (a.fScore < b.fScore || (a.fScore === b.fScore && a.blockId < b.blockId)) {
          minIdx = i;
        }
      }
      // Swap to end and pop.
      const min = open[minIdx];
      open[minIdx] = open[open.length - 1];
      open.pop();
      return min;
    };

    while (open.length > 0) {
      const entry = extractMin();
      if (!entry) break;
      const { blockId: current } = entry;

      if (closed.has(current)) continue;
      closed.add(current);

      if (current === destBlock) {
        // Goal reached. Reconstruct the path (DD-STRAIGHTLINE §3.2bis: pass vehicleType for D_min).
        return this.reconstructPath(current, parent, riverCount, pathStepSum, vehicleType);
      }

      const currentG = gScore.get(current) ?? Infinity;
      const edges = this.neighbors(current, vehicleType); // vehicle-gated (C3 CF from plan)

      for (const edge of edges) {
        const v = edge.to;
        if (closed.has(v)) continue;

        // ── DD-ASTAR-COST edge cost (5-term weighted sum, all getter-sourced) ───────────────────
        //
        // Term 1: distance/speed (CF-2: vehicleSpeedFor, not inline).
        //   step_distance = edge.stepCost (which for river edges ALREADY includes the river cost;
        //   CF-3 no double-count). d_step(u→v) = edge.stepCost.
        const wDist = this.astarWDistance(stance);
        const distanceTerm = wDist * edge.stepCost / vehicleSpeed;

        // Term 2: patrol penalty at v (getPatrolLoadRaw → blockRho ∈ [0,1]).
        const wPatrol = this.astarWPatrol(stance);
        const patrolPenalty = await this.computePatrolPenalty(playerId, v);
        const patrolTerm = wPatrol * patrolPenalty;

        // Term 3: detection penalty at v for this vehicle (vehicleFactor × blockRhoFactor).
        const wDetection = this.astarWDetection(stance);
        const detectionPenalty = this.computeDetectionPenalty(patrolPenalty, vehicleType);
        const detectionTerm = wDetection * detectionPenalty;

        // Term 4: corridor-debt penalty at v (debtSnapshot; 0 at C4 since table doesn't exist yet).
        const wDebt = this.astarWDebt(stance);
        const debtPenalty = debtSnapshot.get(v) ?? 0;
        const debtTerm = wDebt * debtPenalty;

        // Total edge cost (5 terms; term 5 = river penalty ALREADY in edge.stepCost via distanceTerm).
        const edgeCost = distanceTerm + patrolTerm + detectionTerm + debtTerm;

        const tentativeG = currentG + edgeCost;
        const existingG = gScore.get(v) ?? Infinity;

        if (tentativeG < existingG) {
          gScore.set(v, tentativeG);
          parent.set(v, current);
          riverCount.set(v, (riverCount.get(current) ?? 0) + (edge.isRiverEdge ? 1 : 0));
          // DD-STRAIGHTLINE §3.2bis: accumulate d_step sum along the chosen path.
          // edge.stepCost is d_step(current→v) — the SAME metric as straightLineDistance().
          pathStepSum.set(v, (pathStepSum.get(current) ?? 0) + edge.stepCost);

          // h≡0: fScore = gScore (Dijkstra-on-cost, FROZEN default per §3.2bis).
          const fScoreV = tentativeG; // + h(v) where h≡0
          // Add to open (we allow duplicates; the closed-set check handles stale entries).
          open.push({ blockId: v, fScore: fScoreV });
        }
      }
    }

    // No path found (unreachable for this vehicle type).
    return null;
  }

  /**
   * `straightLineDistance` — D_min(blockA, blockB): the distance-ONLY graph minimum.
   *
   * DD-STRAIGHTLINE §3.2bis (correctness fix, 2026-06-23):
   *   `straight_line_distance := D_min(origin, dest)` = the minimum sum of d_step values over ALL
   *   origin→dest paths in the vehicle-reachable graph, computed by a Dijkstra run on d_step ONLY
   *   (ignoring patrol/detection/debt/speed penalties). This is the natural floor: any actual path
   *   has path_length = Σ d_step(edge) ≥ D_min by definition, so sinuosity_index ≥ 1.0 always.
   *
   * Why NOT a geometric proxy:
   *   - Block coordinates are LOCAL to each district (x ∈ 0..9) — no coherent global layout.
   *   - A geometric distance OVERESTIMATES inter-district graph distance (a same-bank hop has
   *     d_step=5.0; a geometric proxy can assign a larger number), producing heuristics that
   *     overestimate ⇒ inadmissible A* + sinuosity < 1.0 for cross-district routes.
   *   - The DD-GRAPH layout has no real Euclidean positions to use. D_min is the forced definition.
   *
   * Vehicle-traversability: the Dijkstra respects the same vehicle-gated `neighbors()` filtering
   *   so D_min is over the vehicle's reachable sub-graph (admissibility holds per-vehicle).
   *
   * Vehicle-speed: d_step is PURE DISTANCE only (NOT divided by vehicleSpeed). This is correct:
   *   straightLineDistance is the d_step floor (for sinuosity_index denominator), not a cost floor.
   *
   * Determinism: lowest-block-id tie-break in the Dijkstra (same as computePath). PURE function of
   *   the bootstrap graph. NO Math.random. NO DB calls.
   *
   * @param vehicleType — determines which edges are traversable (vehicle-gated per canon :87).
   *   Default = 'foot' (the most restrictive — ensures D_min is a conservative lower bound when
   *   called during sinuosity computation for a known vehicleType). Callers MUST pass vehicleType.
   */
  straightLineDistance(blockA: number, blockB: number, vehicleType = 'foot'): number {
    if (blockA === blockB) return 0;

    // Dijkstra on d_step ONLY — ignoring patrol/detection/debt/speed (the distance-only minimum).
    // dist[v] = minimum Σ d_step from blockA to v.
    const dist = new Map<number, number>();
    dist.set(blockA, 0);

    const closed = new Set<number>();

    interface DistEntry { blockId: number; d: number; }
    const open: DistEntry[] = [{ blockId: blockA, d: 0 }];

    const extractMin = (): DistEntry | undefined => {
      if (open.length === 0) return undefined;
      let minIdx = 0;
      for (let i = 1; i < open.length; i++) {
        const a = open[i];
        const b = open[minIdx];
        // CF-1: same lowest-block-id tie-break as computePath (determinism).
        if (a.d < b.d || (a.d === b.d && a.blockId < b.blockId)) {
          minIdx = i;
        }
      }
      const min = open[minIdx];
      open[minIdx] = open[open.length - 1];
      open.pop();
      return min;
    };

    while (open.length > 0) {
      const entry = extractMin();
      if (!entry) break;
      const { blockId: current, d: currentD } = entry;

      if (closed.has(current)) continue;
      closed.add(current);

      if (current === blockB) {
        return currentD; // found the minimum d_step distance
      }

      const edges = this.neighbors(current, vehicleType); // vehicle-gated (same as computePath)
      for (const edge of edges) {
        const v = edge.to;
        if (closed.has(v)) continue;
        // d_step only: edge.stepCost (NOT multiplied by any weight or speed divisor).
        const tentativeD = currentD + edge.stepCost;
        const existingD = dist.get(v) ?? Infinity;
        if (tentativeD < existingD) {
          dist.set(v, tentativeD);
          open.push({ blockId: v, d: tentativeD });
        }
      }
    }

    // blockB unreachable from blockA for this vehicleType — return Infinity so sinuosity guard
    // treats unreachable as sinuosity=1.0 (defensive; should not occur on a connected graph).
    return Infinity;
  }

  // ─── C4 private helpers ────────────────────────────────────────────────────────────────────────

  /**
   * Reconstruct the path from `destBlock` back to origin via the `parent` map.
   * Returns the `PathResult` (pathBlocks, straightLineDistance, sinuosityIndex, riverCrossings).
   *
   * DD-STRAIGHTLINE §3.2bis — unit-consistency:
   *   - `pathLength` = pathStepSum[destBlock] = Σ d_step(edge) over the path — NOT raw block count.
   *     Cross-district edges contribute 5.0; cross-bank edges contribute 7.0; intra-district = 1.0.
   *   - `sld` = straightLineDistance(origin, dest, vehicleType) = D_min via Dijkstra on d_step only.
   *   - BOTH use the same d_step metric (edge.stepCost). sinuosity_index = pathLength / sld ≥ 1.0.
   *   - origin==dest guard is handled in computePath BEFORE calling here, so sld > 0 always here.
   *
   * @param vehicleType — passed through from computePath for the D_min call (vehicle-gated).
   */
  private reconstructPath(
    destBlock: number,
    parent: Map<number, number>,
    riverCount: Map<number, number>,
    pathStepSum: Map<number, number>,
    vehicleType: string,
  ): PathResult {
    // Trace back from dest to origin.
    const pathReversed: number[] = [];
    let current = destBlock;
    while (parent.has(current)) {
      pathReversed.push(current);
      current = parent.get(current)!;
    }
    pathReversed.push(current); // push origin
    const pathBlocks = pathReversed.reverse();

    const originBlock = pathBlocks[0];

    // DD-STRAIGHTLINE §3.2bis: path_length = Σ d_step(edge) over path.
    // pathStepSum[destBlock] is the accumulated Σ edge.stepCost from origin to dest.
    // This is NOT pathBlocks.length - 1 (raw block count ignores multi-unit inter-district edges).
    const pathLength = pathStepSum.get(destBlock) ?? 0;

    // straight_line_distance = D_min(origin, dest, vehicleType) — Dijkstra on d_step only.
    // Uses the same vehicleType as the search so D_min is over the vehicle's reachable sub-graph.
    const sld = this.straightLineDistance(originBlock, destBlock, vehicleType);

    // sinuosity_index = path_length / straight_line_distance ≥ 1.0 by construction.
    // Guard: sld=0 or Infinity only if origin==dest (handled before) or unreachable (defensive).
    const sinuosityIndex = sld > 0 && isFinite(sld) ? pathLength / sld : 1.0;
    const riverCrossings = riverCount.get(destBlock) ?? 0;

    return { pathBlocks, straightLineDistance: sld, sinuosityIndex, riverCrossings };
  }

  /**
   * Compute the patrol penalty for block `v`.
   * = blockRho = min(1, activeCount / capacity) from `getPatrolLoadRaw`.
   * Returns 0.0 if no patrol queue exists (no patrol → no penalty).
   *
   * REUSE: `PatrolDoctrineService.precinctForBlock` + `getPatrolLoadRaw` (single source of truth).
   * CF: the SAME blockRho used by 9a's `runSegmentDetection` (`courier-detection.service.ts:481`).
   */
  private async computePatrolPenalty(playerId: string, blockId: number): Promise<number> {
    const precinctId = await this.patrolDoctrineService.precinctForBlock(blockId);
    if (precinctId === null) return 0.0;
    const patrolLoad = await this.patrolDoctrineService.getPatrolLoadRaw(playerId, precinctId);
    if (!patrolLoad || patrolLoad.capacity <= 0) return 0.0;
    return Math.min(1.0, patrolLoad.activeCount / patrolLoad.capacity);
  }

  /**
   * Compute the detection penalty for block `v` with the given vehicle type.
   *
   * This uses the two block/vehicle-specific factors from `computeDetectionProb`:
   *   - vehicleFactor(vehicle)  — from `distributionDetectionTunables.detectionVehicleFactor*`
   *   - blockRhoFactor(blockRho) — from the DD-BLOCK-RHO formula (min + gain × blockRho)
   *
   * NOT the full `computeDetectionProb` (which needs per-shift cargoGrams/sessionsActive/gameMinute —
   * not available at route-planning time). This captures the block/vehicle-specific risk only.
   *
   * Formula (mirrors `computeDetectionProb` partial factors, `courier-detection.service.ts:267-304`):
   *   vehicleFactor = detectionVehicleFactor* (by vehicleType, getter-sourced).
   *   blockRhoFactor = clamp(minFactor + gain × blockRho, minFactor, minFactor + gain).
   *   detectionPenalty = vehicleFactor × blockRhoFactor.
   *
   * REUSE: sources `distributionDetectionTunables` getters — NOT re-implemented here.
   * CF (§3.2 design): "the A* minimizes the very rolls 9a will fire" (the coupling that makes §6 coherent).
   *
   * @param blockRho — the patrol load ratio ∈ [0,1] (already computed by `computePatrolPenalty`).
   * @param vehicleType — the courier vehicle type.
   */
  private computeDetectionPenalty(blockRho: number, vehicleType: string): number {
    const t = distributionDetectionTunables;

    // vehicleFactor (getter-sourced, NO inline scalar — CF anti-fabrication).
    let vehicleFactor: number;
    switch (vehicleType) {
      case 'bike':
        vehicleFactor = t.detectionVehicleFactorBike;
        break;
      case 'car':
        vehicleFactor = t.detectionVehicleFactorCar;
        break;
      case 'van':
      case 'refrigerated_van':
        vehicleFactor = t.detectionVehicleFactorVan;
        break;
      case 'foot':
      default:
        vehicleFactor = t.detectionVehicleFactorFoot;
        break;
    }

    // blockRhoFactor (DD-BLOCK-RHO formula, getter-sourced — same as computeDetectionProb).
    const minFactor = t.detectionBlockRhoMinFactor; // default 0.0 (v2 patrol-gate)
    const gain = t.detectionBlockRhoGain;           // default 4.0
    const blockRhoRaw = minFactor + gain * blockRho;
    const blockRhoFactor = Math.min(minFactor + gain, Math.max(minFactor, blockRhoRaw));

    return vehicleFactor * blockRhoFactor;
  }

  /**
   * A* weight getters (stance-parameterized, getter-sourced via distributionRouteLifecycleTunables).
   * All [PROV-Y26Q2] (C2 registered). NO inline scalar.
   */
  private astarWDistance(stance: RouteStance): number {
    switch (stance) {
      case 'fastest':  return distributionRouteLifecycleTunables.astarWDistanceFastest;
      case 'balanced': return distributionRouteLifecycleTunables.astarWDistanceBalanced;
      case 'evasive':  return distributionRouteLifecycleTunables.astarWDistanceEvasive;
    }
  }
  private astarWPatrol(stance: RouteStance): number {
    switch (stance) {
      case 'fastest':  return distributionRouteLifecycleTunables.astarWPatrolFastest;
      case 'balanced': return distributionRouteLifecycleTunables.astarWPatrolBalanced;
      case 'evasive':  return distributionRouteLifecycleTunables.astarWPatrolEvasive;
    }
  }
  private astarWDetection(stance: RouteStance): number {
    switch (stance) {
      case 'fastest':  return distributionRouteLifecycleTunables.astarWDetectionFastest;
      case 'balanced': return distributionRouteLifecycleTunables.astarWDetectionBalanced;
      case 'evasive':  return distributionRouteLifecycleTunables.astarWDetectionEvasive;
    }
  }
  private astarWDebt(stance: RouteStance): number {
    switch (stance) {
      case 'fastest':  return distributionRouteLifecycleTunables.astarWDebtFastest;
      case 'balanced': return distributionRouteLifecycleTunables.astarWDebtBalanced;
      case 'evasive':  return distributionRouteLifecycleTunables.astarWDebtEvasive;
    }
  }

  // ─── Connectivity check (used by _test controller graph-connectivity probe) ──────────────────────

  /**
   * BFS reachability check: is `toBlock` reachable from `fromBlock` using the given vehicle type?
   * Used by the `_test` graph-connectivity probe (C3 E2E). NOT used in hot paths.
   * CF-4 (C4 carry-forward): this is test-only BFS — `computePath` uses real A* cost-weighted search.
   */
  isReachable(fromBlock: number, toBlock: number, vehicleType: string): boolean {
    if (fromBlock === toBlock) return true;
    if (!this.graph.has(fromBlock) || !this.graph.has(toBlock)) return false;

    const visited = new Set<number>();
    const queue: number[] = [fromBlock];
    visited.add(fromBlock);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const ns = this.neighbors(current, vehicleType);
      for (const { to } of ns) {
        if (to === toBlock) return true;
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
        }
      }
    }
    return false;
  }

  // ─── C5 — sinuosityBucket ────────────────────────────────────────────────────────────────────────

  /**
   * `sinuosityBucket` — the player-facing sinuosity telegraph (DD-SINUOSITY §3.5, C5).
   * PURE function of `sinuosityIndex` and the C2 getter-sourced cuts.
   *
   * `index < sinuosityDirectMax → 'direct'`
   * `index < sinuosityMeanderingMax → 'meandering'`
   * `index >= sinuosityMeanderingMax → 'gnarled'`
   *
   * Cuts are getter-sourced (NO inline 1.3/2.0 — CF R2.3 anti-fabrication).
   * R2.2 / P5: the raw `sinuosityIndex` is NEVER returned to clients; only this bucket.
   * Deterministic: NO Math.random.
   */
  sinuosityBucket(sinuosityIndex: number): SinuosityBucket {
    const directMax = distributionRouteLifecycleTunables.sinuosityDirectMax;
    const meanderingMax = distributionRouteLifecycleTunables.sinuosityMeanderingMax;
    if (sinuosityIndex < directMax) return 'direct';
    if (sinuosityIndex < meanderingMax) return 'meandering';
    return 'gnarled';
  }

  // ─── C6 — DD-WAYPOINT ────────────────────────────────────────────────────────────────────────────

  /**
   * Validate a waypoint list for use in a manual override path (DD-WAYPOINT §3.4, C6).
   *
   * Checks:
   *   1. Each waypoint block id exists in the seeded geography (`blockExists`).
   *   2. Each consecutive inter-waypoint leg is reachable for the given vehicle type (`isReachable`).
   *      (Origin→w1 and wk→dest reachability is checked implicitly by `computePathWithWaypoints`.)
   *
   * Returns `{ ok: true }` when all checks pass, or `{ ok: false, reason: string }` on the first
   * failure (qualitative rejection — R2.2: no raw scalars in the reason string).
   *
   * @param _playerId — reserved for future player-scoped checks; currently unused.
   * @param waypoints — the ordered list of intermediate block ids to validate.
   * @param vehicleType — the courier vehicle type (graph edge gating).
   */
  async validateWaypoints(
    _playerId: string,
    waypoints: number[],
    vehicleType: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    // Step 1: every waypoint must be a real seeded block.
    for (const wp of waypoints) {
      if (!this.blockExists(wp)) {
        return { ok: false, reason: `Waypoint block ${wp} does not exist in the seeded geography` };
      }
    }

    // Step 2: each consecutive inter-waypoint leg must be reachable by vehicle.
    // Legs: w[0]→w[1], w[1]→w[2], …, w[k-2]→w[k-1].
    // (origin→w[0] and w[k-1]→dest are checked implicitly when A* runs in computePathWithWaypoints.)
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      if (!this.isReachable(from, to, vehicleType)) {
        return {
          ok: false,
          reason: `Leg from block ${from} to block ${to} is unreachable for vehicle type ${vehicleType}`,
        };
      }
    }

    return { ok: true };
  }

  /**
   * Compute a waypoint-linked path: A*(o→w1) ++ A*(w1→w2) ++ … ++ A*(wk→dest).
   *
   * Called by `computePath` when `waypoints` is non-empty (DD-WAYPOINT §3.4, C6).
   *
   * Leg linking algorithm:
   *   - Build sequence: [originBlock, ...waypoints, destBlock].
   *   - For each consecutive pair (seq[i], seq[i+1]): run the single-leg A* via `_computeSingleLeg`.
   *   - Concatenate: append each leg's pathBlocks to the result, SKIPPING the first block of every
   *     leg after the first (it equals the last block of the previous leg — de-duplication).
   *   - Accumulate: pathStepSum += leg.pathLength (Σ d_step across all legs).
   *   - riverCrossings: sum across all legs.
   *   - straightLineDistance: D_min(origin, dest, vehicleType) — WHOLE-ROUTE, NOT per-leg sum.
   *     This ensures that a forced detour reads as MORE sinuous than the direct path.
   *   - sinuosityIndex = totalPathLength / sld.
   *
   * Returns `null` if any leg has no path (unreachable via the given vehicle type).
   */
  private async computePathWithWaypoints(
    playerId: string,
    originBlock: number,
    destBlock: number,
    vehicleType: string,
    stance: RouteStance,
    debtSnapshot: Map<number, number>,
    waypoints: number[],
  ): Promise<PathResult | null> {
    const sequence = [originBlock, ...waypoints, destBlock];

    // Concatenated path blocks (de-duplicated at shared leg endpoints).
    const allBlocks: number[] = [];
    let totalPathLength = 0; // Σ d_step across all legs (path_length numerator)
    let totalRiverCrossings = 0;

    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i];
      const to = sequence[i + 1];

      if (from === to) {
        // Zero-length leg: origin passes through a waypoint that equals the next point.
        // Include the block only when it's the very first block of the whole path.
        if (i === 0) allBlocks.push(from);
        continue;
      }

      // Single-leg A* using the same cost function (stance + debtSnapshot).
      // We re-use the existing computePath logic with NO waypoints for this leg.
      const legResult = await this._computeSingleLeg(
        playerId, from, to, vehicleType, stance, debtSnapshot,
      );
      if (legResult === null) {
        // A* found no path for this leg → the whole waypoint path is unreachable.
        return null;
      }

      if (i === 0) {
        // First leg: include ALL blocks.
        allBlocks.push(...legResult.pathBlocks);
      } else {
        // Subsequent legs: skip the first block (= last block of previous leg — de-duplicate).
        allBlocks.push(...legResult.pathBlocks.slice(1));
      }

      totalPathLength += legResult.pathLength;
      totalRiverCrossings += legResult.riverCrossings;
    }

    // sinuosity: whole-route D_min (origin→dest), NOT the sum of per-leg D_mins.
    // DD-WAYPOINT §3.4 + DD-STRAIGHTLINE §3.2bis: sinuosity denominator is ALWAYS D_min(o→d).
    const sld = this.straightLineDistance(originBlock, destBlock, vehicleType);
    const sinuosityIndex = sld > 0 && isFinite(sld) ? totalPathLength / sld : 1.0;

    return {
      pathBlocks: allBlocks,
      straightLineDistance: sld,
      sinuosityIndex,
      riverCrossings: totalRiverCrossings,
    };
  }

  /**
   * Run the single-leg A* for a (from→to) pair, returning path + Σ d_step (the raw path length).
   *
   * This is the same Dijkstra-on-cost algorithm as `computePath` (the main method), extracted
   * so that `computePathWithWaypoints` can run it per-leg and accumulate the totals.
   * The return type adds `pathLength` (Σ d_step) so the caller can accumulate without re-reading
   * pathBlocks edge-by-edge (which would require the graph again).
   *
   * Returns `null` if the destination is unreachable from the origin for this vehicleType.
   */
  private async _computeSingleLeg(
    playerId: string,
    originBlock: number,
    destBlock: number,
    vehicleType: string,
    stance: RouteStance,
    debtSnapshot: Map<number, number>,
  ): Promise<(PathResult & { pathLength: number }) | null> {
    if (originBlock === destBlock) {
      return {
        pathBlocks: [originBlock],
        straightLineDistance: 0,
        sinuosityIndex: 1.0,
        riverCrossings: 0,
        pathLength: 0,
      };
    }

    const gScore = new Map<number, number>();
    const parent = new Map<number, number>();
    const riverCount = new Map<number, number>();
    const pathStepSum = new Map<number, number>();

    const vehicleSpeed = vehicleSpeedFor(vehicleType);

    gScore.set(originBlock, 0);
    riverCount.set(originBlock, 0);
    pathStepSum.set(originBlock, 0);

    interface PQEntry {
      blockId: number;
      fScore: number;
    }
    const open: PQEntry[] = [{ blockId: originBlock, fScore: 0 }];
    const closed = new Set<number>();

    const extractMin = (): PQEntry | undefined => {
      if (open.length === 0) return undefined;
      let minIdx = 0;
      for (let i = 1; i < open.length; i++) {
        const a = open[i];
        const b = open[minIdx];
        if (a.fScore < b.fScore || (a.fScore === b.fScore && a.blockId < b.blockId)) {
          minIdx = i;
        }
      }
      const min = open[minIdx];
      open[minIdx] = open[open.length - 1];
      open.pop();
      return min;
    };

    while (open.length > 0) {
      const entry = extractMin();
      if (!entry) break;
      const { blockId: current } = entry;

      if (closed.has(current)) continue;
      closed.add(current);

      if (current === destBlock) {
        // Goal reached — reconstruct and return with pathLength attached.
        const baseResult = this.reconstructPath(current, parent, riverCount, pathStepSum, vehicleType);
        // pathLength = Σ d_step to destBlock (from pathStepSum accumulated during search).
        const pathLength = pathStepSum.get(destBlock) ?? 0;
        return { ...baseResult, pathLength };
      }

      const currentG = gScore.get(current) ?? Infinity;
      const currentD = pathStepSum.get(current) ?? 0;
      const currentRiver = riverCount.get(current) ?? 0;

      const edges = this.neighbors(current, vehicleType);

      for (const edge of edges) {
        const v = edge.to;
        if (closed.has(v)) continue;

        const patrolPenalty = await this.computePatrolPenalty(playerId, v);
        const blockRho = patrolPenalty;
        const detectionPenalty = this.computeDetectionPenalty(blockRho, vehicleType);
        const debtValue = debtSnapshot.get(v) ?? 0;

        const edgeCost =
          this.astarWDistance(stance) * (edge.stepCost / vehicleSpeed) +
          this.astarWPatrol(stance) * patrolPenalty +
          this.astarWDetection(stance) * detectionPenalty +
          this.astarWDebt(stance) * debtValue;

        const tentativeG = currentG + edgeCost;
        const existingG = gScore.get(v) ?? Infinity;

        if (tentativeG < existingG) {
          gScore.set(v, tentativeG);
          parent.set(v, current);
          riverCount.set(v, currentRiver + (edge.isRiverEdge ? 1 : 0));
          pathStepSum.set(v, currentD + edge.stepCost);
          open.push({ blockId: v, fScore: tentativeG });
        }
      }
    }

    // destBlock unreachable.
    return null;
  }
}

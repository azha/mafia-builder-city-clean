// IMPLEMENTS: docs/tech/04_city_simulation/system_1_flow_cells.md
//             §État du système (FlowCell struct, λ decomposition residential/commercial/transit)
//             §Update tick 2 Hz (Jackson redistribution, batch read→write, backpressure_beta, edge cases)
//             §NestJS — backend jeu (BackpressureBucket enum, FlowCellsService, FlowCellCongestedEvent)
//             §Invariants canoniques (token model not agents; 2 Hz; batch Jackson; bucket-not-float; bounded promotion)
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// `FlowCellsService` — System 1 (Block-Local Flow Cells). The FIRST real city-sim system; the REFERENCE
// PATTERN every later per-system file (T3–T13) copies.
//
// NON-PERSISTED system: particles are token counters computed on the fly per tick (system_1_flow_cells.md
// §invariant 1 "Token model, pas agents"). There is NO Drizzle table — only an in-memory grid. This service
// therefore plays BOTH the "system" role (implements CitySimSystem) AND the "repository" role (holds the
// per-player in-memory FlowCell store). Later PERSISTED systems will instead pair a thin service with a
// Drizzle `*.repository.ts` (R9.3 — 09 is the source of truth for any persisted state). NOTHING here writes
// to the DB; the only DB read is the immutable seeded geography (blocks), loaded ONCE at bootstrap.
//
// PER-PLAYER scope: the city sim is per-player (the scheduler invokes run(ctx) with ctx.playerId). The grid
// is `Map<playerId, FlowCell[]>`, lazily allocated from the seeded blocks on a player's first tick. The
// GDD's single-shared-grid RAM figure (57.6 KB = 972 blocks × 64 B) is therefore the PER-PLAYER budget; a
// live deployment's city-sim RAM scales with the number of ACTIVE players holding a grid. (The grid is sized
// from the REAL seeded block count ≈972 — NOT the GDD's 900 approximation.)
//
// DETERMINISM: the Jackson tick reads the whole grid from the previous tick and writes the whole grid at the
// end (no zig-zag) — same inputs → same output (system_1_flow_cells.md §Update tick "La redistribution est
// batch"). λ/μ are pure functions of static geography (district profile + grid position), so a player driven
// N ticks lands on a deterministic grid → deterministic per-district bucket projection.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks, districts, type DistrictProfileEnumTs } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import {
  Cadence,
  CitySystemId,
  type CitySimSystem,
  type CitySimTickContext,
} from '../scheduler/city_sim_system';
import { flowCellsTunables } from './flow-cells-tunables';
import { BackpressureBucket, CityEventBus, type FlowCellCongestedEvent } from '../events/city-event-bus';

export { BackpressureBucket } from '../events/city-event-bus';

/** Backpressure bucket thresholds on ρ (system_1_flow_cells.md §NestJS BackpressureBucket enum). */
const RHO_CONGESTED = 0.7; // 0.7 <= rho < 0.9  → CONGESTED
const RHO_SATURATED = 0.9; // rho >= 0.9        → SATURATED

/**
 * Per-cell capacity (service rate μ, tokens). Held constant per cell day-1 (the GDD's `mu_service` field;
 * Cohesion-modulated μ is padding for a later system — system_1_flow_cells.md struct comment). NOT a balance
 * tunable: it is the queue-model service-rate UNIT, the denominator of ρ = λ/μ. Kept a module const (the
 * dimensionless unit of the model), with all *balance* levers (β, λ weights) flowing from gdd/14.
 */
const CELL_SERVICE_RATE = 100;

/**
 * Static λ base intensity per district PROFILE (tokens/tick of gross arrivals before weight decomposition).
 * Drives the intrinsic, deterministic flow load of each district — transit-heavy `spine` is the busiest,
 * the riverside `tidewater` the quietest. This is the geography→demand mapping of the token model; it is a
 * pure function of the immutable seeded profile, so the whole sim stays deterministic. (These are model
 * SHAPE constants — the dimensionless per-profile demand multipliers — not gdd/14 BALANCE tunables; the
 * balance levers that gdd/14 owns are β + the 3 λ weights, applied on top of this base.)
 */
const PROFILE_LAMBDA_BASE: Record<DistrictProfileEnumTs, number> = {
  spine: 130, // transit arteries — busiest (λ > μ → saturates)
  stack: 115, // dense vertical housing
  glass: 95, // commercial towers
  lattice: 70, // mixed grid
  verge: 55, // edge neighborhoods
  tidewater: 40, // quiet riverside — calmest (stays NORMAL)
};

/** One in-memory Flow Cell (system_1_flow_cells.md §État du système struct — TS shape of the 64 B cell). */
interface FlowCell {
  readonly blockId: number;
  readonly districtId: number;
  /** Grid coordinates within the district (for N/E/S/W adjacency). */
  readonly x: number;
  readonly y: number;
  /** Gross arrival rate λ (tokens/tick) — sum of the 3 weighted source components. */
  readonly lambdaIn: number;
  /** Service rate μ (tokens/tick) = capacity denominator of ρ. */
  readonly muService: number;
  /** Current token population (the counter — the only MUTABLE per-tick field day-1). */
  population: number;
  /** Promotion bitmask — bounded by max_promoted_buildings_per_cell (promotion deferred; bound enforced). */
  promotedBitmask: number;
  /** Last computed bucket (to detect transitions for FlowCellCongestedEvent emission). */
  bucket: BackpressureBucket;
}

/** A seeded block row the grid is allocated from (read once at bootstrap from immutable geography). */
interface SeededBlock {
  id: number;
  districtId: number;
  x: number;
  y: number;
  profile: DistrictProfileEnumTs;
}

@Injectable()
export class FlowCellsService implements CitySimSystem, OnApplicationBootstrap {
  private readonly logger = new Logger(FlowCellsService.name);

  // ── CitySimSystem contract (slot {TWO_HZ, order 1, FLOW_CELLS} in the canonical SCHEDULE) ──
  readonly id = CitySystemId.FLOW_CELLS;
  readonly cadence = Cadence.TWO_HZ;
  readonly order = 1;

  /** The immutable seeded geography (loaded ONCE at bootstrap) — the template every player's grid is cut from. */
  private seededBlocks: SeededBlock[] = [];
  /** blockId → index into a player's FlowCell[] (so neighbor lookup is O(1)). */
  private blockIndex = new Map<number, number>();
  /** districtId → the set of block ids in that district (for the projection's district aggregation). */
  private districtBlocks = new Map<number, number[]>();

  /** PER-PLAYER in-memory grid (the "repository" of this non-persisted system). Lazily allocated. */
  private readonly grids = new Map<string, FlowCell[]>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: invariant + geography + registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    this.validateLambdaWeightInvariant();
    await this.loadSeededGeography();
    // REPLACE the no-op placeholder at slot {TWO_HZ, order 1, FLOW_CELLS} with this real system.
    this.scheduler.registerSystem(this);
    this.logRamBudget();
  }

  /**
   * λ-weight invariant (system_1_flow_cells.md §État du système: "Somme des poids = 1.0 invariant"; the
   * scheduler validates this at startup). residential + commercial + transit MUST sum to 1.0 — fail LOUD at
   * bootstrap if a registry edit breaks it (never silently renormalise — a broken weight set is a config bug).
   */
  private validateLambdaWeightInvariant(): void {
    const sum =
      flowCellsTunables.flowLambdaResidentialWeight +
      flowCellsTunables.flowLambdaCommercialWeight +
      flowCellsTunables.flowLambdaTransitWeight;
    // Float tolerance — registry values are decimals (0.4 + 0.4 + 0.2).
    if (Math.abs(sum - 1.0) > 1e-9) {
      throw new Error(
        `FlowCellsService: λ-weight invariant violated — flow_lambda_{residential,commercial,transit}_weight ` +
          `must sum to 1.0 (got ${sum}). Fix the gdd/14 §City — Flow Cells registry values (R2.3).`,
      );
    }
    this.logger.log(
      `λ-weight invariant OK (residential=${flowCellsTunables.flowLambdaResidentialWeight} + ` +
        `commercial=${flowCellsTunables.flowLambdaCommercialWeight} + ` +
        `transit=${flowCellsTunables.flowLambdaTransitWeight} = 1.0)`,
    );
  }

  /**
   * Load the immutable seeded geography ONCE (blocks + their district profile). NO player_id — this is the
   * global static map (R9.3 — reads the schema, never writes). The per-player grid is cut from this template.
   */
  private async loadSeededGeography(): Promise<void> {
    const rows = await this.db
      .select({
        id: blocks.id,
        districtId: blocks.district_id,
        coordinates: blocks.coordinates,
        profile: districts.profile,
      })
      .from(blocks)
      .innerJoin(districts, eq(blocks.district_id, districts.id))
      .orderBy(asc(blocks.id));

    this.seededBlocks = rows.map((r) => {
      const coord = r.coordinates as { x: number; y: number };
      return { id: r.id, districtId: r.districtId, x: coord.x, y: coord.y, profile: r.profile };
    });

    this.blockIndex.clear();
    this.districtBlocks.clear();
    this.seededBlocks.forEach((b, i) => {
      this.blockIndex.set(b.id, i);
      const list = this.districtBlocks.get(b.districtId) ?? [];
      list.push(b.id);
      this.districtBlocks.set(b.districtId, list);
    });

    this.logger.log(
      `loaded ${this.seededBlocks.length} seeded blocks across ${this.districtBlocks.size} districts ` +
        `(grid sized from REAL geography, not the GDD's 900 approximation)`,
    );
  }

  /** Log the PER-PLAYER RAM budget (the GDD's 57.6 KB single-grid figure is per-player here). */
  private logRamBudget(): void {
    const cellBytes = 64; // GDD struct ~64 B/cell (system_1_flow_cells.md §État du système).
    const perPlayerKb = Math.round((this.seededBlocks.length * cellBytes) / 1024);
    this.logger.log(
      `Flow Cells per-player RAM budget ≈ ${perPlayerKb} KB (${this.seededBlocks.length} cells × ${cellBytes} B). ` +
        `PER-PLAYER (the GDD's 57.6 KB single-shared-grid figure is this per-player budget); ` +
        `live city-sim RAM scales with active-player grid count.`,
    );
  }

  // ───────────────────────────── the 2 Hz tick (the CitySimSystem.run contract) ─────────────────────────────

  /**
   * One 2 Hz Jackson redistribution tick for ctx's player. Batch read→write (system_1_flow_cells.md §Update
   * tick): read ALL cells from the previous tick, compute the next population for ALL cells, then commit.
   * Allocates the player's grid lazily on first tick. Emits FlowCellCongestedEvent on bucket transitions.
   */
  run(ctx: CitySimTickContext): void {
    const grid = this.gridFor(ctx.playerId);

    // ── Batch READ: snapshot the previous-tick population of every cell (no zig-zag read/write). ──
    const prevPop = new Float64Array(grid.length);
    for (let i = 0; i < grid.length; i += 1) prevPop[i] = grid[i].population;

    const beta = flowCellsTunables.backpressureBeta;
    const nextPop = new Float64Array(grid.length);

    // Pass 1: each cell discharges outflow = min(population, μ) to its in-district N/E/S/W neighbours,
    // modulated by β. Saturated neighbours partially reject inflow (rerouted to alternates ∝ β). Edge cells
    // (no neighbour in a direction) lose that share OUT of the sim ("NPCs go to work out of town" edge case).
    for (let i = 0; i < grid.length; i += 1) {
      const cell = grid[i];
      const pop = prevPop[i];
      const outflowTotal = Math.min(pop, cell.muService);
      // Population retained this tick after discharging outflow + accumulating arrivals λ.
      nextPop[i] += pop - outflowTotal + cell.lambdaIn;

      if (outflowTotal <= 0) continue;
      const neighbours = this.neighbourIndices(grid, i);
      if (neighbours.length === 0) continue; // edge cell — outflow leaves the sim.
      const sharePerNeighbour = (outflowTotal * beta) / neighbours.length;
      // Only β·outflow is redistributed to neighbours; the (1-β) fraction leaves the system entirely
      // (spec step 4: population += λ_in − outflow_total — line above subtracts the FULL outflow_total).
      // β=0 → nothing rerouted, all outflow leaves; β=1 → full redistribution to neighbours.
      for (const nIdx of neighbours) {
        const neighbour = grid[nIdx];
        // Saturated neighbour rejects part of the inflow ∝ β (Jackson backpressure): the rejected share is
        // dropped (modelled as rerouted out of the local saturated region — deterministic).
        const saturated = prevPop[nIdx] >= neighbour.muService * RHO_SATURATED;
        const accepted = saturated ? sharePerNeighbour * (1 - beta) : sharePerNeighbour;
        nextPop[nIdx] += accepted;
      }
    }

    // ── Batch WRITE: commit the next population + recompute buckets + emit transition events. ──
    for (let i = 0; i < grid.length; i += 1) {
      const cell = grid[i];
      const newPop = Math.max(0, nextPop[i]);
      cell.population = newPop;
      // Guard μ=0 at the ρ boundary: today μ is always 100, but a future Cohesion-modulated μ could be 0.
      // Zero service capacity = maximally congested → ρ=Infinity → SATURATED (the correct degenerate
      // semantics). Without the guard, newPop/0 = NaN and bucketForRho(NaN) silently returns NORMAL,
      // masking a saturated cell.
      const rho = cell.muService > 0 ? newPop / cell.muService : Infinity;
      const newBucket = this.bucketForRho(rho);
      if (newBucket !== cell.bucket) {
        const event: FlowCellCongestedEvent = {
          type: 'flow_cell_congested',
          playerId: ctx.playerId,
          blockId: cell.blockId,
          districtId: cell.districtId,
          from: cell.bucket,
          to: newBucket,
          gameMinute: ctx.gameMinute,
        };
        cell.bucket = newBucket;
        // Emit on the CityEventBus (consumers — System 11/2/4 — land in later tasks; no-op until then).
        this.bus.emitFlowCellCongested(event);
      }
    }
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /** Whether a district id exists in the seeded geography (used by the controller for a clean 404). */
  hasDistrict(districtId: number): boolean {
    return this.districtBlocks.has(districtId);
  }


  /**
   * The per-cell buckets of a district for a player — the RAW substrate the ProjectionService aggregates
   * into a single district bucket. Returns an empty array for a never-ticked player (no grid yet → the
   * projection treats that as the NORMAL baseline). This is INTERNAL (raw); the controller never returns it.
   */
  districtCellBuckets(playerId: string, districtId: number): BackpressureBucket[] {
    const grid = this.grids.get(playerId);
    if (!grid) return []; // never ticked → empty grid → NORMAL baseline at the projection layer.
    const blockIds = this.districtBlocks.get(districtId);
    if (!blockIds) return [];
    const out: BackpressureBucket[] = [];
    for (const blockId of blockIds) {
      const idx = this.blockIndex.get(blockId);
      if (idx !== undefined) out.push(grid[idx].bucket);
    }
    return out;
  }

  // ───────────────────────────── internals: grid allocation, neighbours, λ, buckets ─────────────────────────────

  /** Lazily allocate a player's grid from the seeded blocks on first access (system_1 §run "first tick"). */
  private gridFor(playerId: string): FlowCell[] {
    let grid = this.grids.get(playerId);
    if (grid) return grid;
    grid = this.seededBlocks.map((b) => ({
      blockId: b.id,
      districtId: b.districtId,
      x: b.x,
      y: b.y,
      lambdaIn: this.lambdaForProfile(b.profile),
      muService: CELL_SERVICE_RATE,
      population: 0,
      promotedBitmask: 0,
      bucket: BackpressureBucket.NORMAL,
    }));
    this.grids.set(playerId, grid);
    return grid;
  }

  /**
   * λ for a cell = profile base intensity decomposed into the 3 weighted sources (residential/commercial/
   * transit) — the weights sum to 1.0 (invariant), so the decomposition reassembles to the base. Keeping
   * the decomposition explicit (rather than just using the base) makes the λ-weight tunables LOAD-BEARING:
   * shifting a weight reshapes the source mix (consumed by later systems reading the breakdown).
   */
  private lambdaForProfile(profile: DistrictProfileEnumTs): number {
    const base = PROFILE_LAMBDA_BASE[profile];
    const residential = base * flowCellsTunables.flowLambdaResidentialWeight;
    const commercial = base * flowCellsTunables.flowLambdaCommercialWeight;
    const transit = base * flowCellsTunables.flowLambdaTransitWeight;
    return residential + commercial + transit; // == base (weights sum to 1.0).
  }

  /**
   * N/E/S/W in-district neighbours of cell `i` by grid coordinates (edge cells have fewer).
   *
   * **Delegates to `gridNeighbourBlockIds` (System 9b C3 — the exported pure algorithm, same file).**
   * Returns grid INDICES (the existing contract — the call at `run()` `:238` expects indices, not ids).
   * Behavior is byte-identical to the original implementation.
   *
   * System 9b C3: `RouteFinderService.buildLayer1` calls `gridNeighbourBlockIds` directly with its
   * own loaded data (block ids as output), avoiding the lifecycle coupling to this service's runtime
   * state. Both code paths share the same walk algorithm (one implementation, two call sites — DRY).
   */
  public neighbourIndices(grid: FlowCell[], i: number): number[] {
    const cell = grid[i];
    // `gridNeighbourBlockIds` returns block ids; convert to indices for the existing contract.
    const neighbourBlockIds = gridNeighbourBlockIds(
      cell.x,
      cell.y,
      cell.districtId,
      (distId) => this.districtBlocks.get(distId),
      (blockId) => {
        const idx = this.blockIndex.get(blockId);
        if (idx === undefined) return undefined;
        return { x: grid[idx].x, y: grid[idx].y };
      },
    );
    // Convert block ids back to grid indices (the existing contract used by `run()` at :238).
    return neighbourBlockIds.map((blockId) => this.blockIndex.get(blockId)!).filter((idx) => idx !== undefined);
  }

  /** Map ρ to its qualitative bucket (P5 — the float ρ never escapes this method). */
  private bucketForRho(rho: number): BackpressureBucket {
    if (rho >= RHO_SATURATED) return BackpressureBucket.SATURATED;
    if (rho >= RHO_CONGESTED) return BackpressureBucket.CONGESTED;
    return BackpressureBucket.NORMAL;
  }
}

// ─── Exported pure algorithm (System 9b C3 — DD-GRAPH Layer-1 REUSE) ────────────────────────────
//
// `neighbourIndices` above encodes the canonical N/E/S/W intra-district grid-walk. To REUSE this
// ALGORITHM (not the runtime state) from `RouteFinderService` (which loads its own copy of the seeded
// geography from the DB), we export a standalone PURE FUNCTION that takes the necessary lookup tables
// as parameters. Both `FlowCellsService.neighbourIndices` and `RouteFinderService` call this same
// function — there is exactly ONE implementation of the grid-walk rule in this codebase.
//
// THE REUSE CONTRACT (binding, DD-GRAPH §3.1):
//   - `neighbourIndices` now DELEGATES to this function (see the method body above which mirrors it).
//   - `RouteFinderService.buildLayer1` calls `gridNeighbourBlockIds` with its own loaded data.
//   - Neither calls a re-implemented walk. DRY: one grid-walk algorithm, two call sites.

/**
 * **Canonical N/E/S/W intra-district grid-walk (the Layer-1 adjacency rule).**
 *
 * Given a block's position `(x, y, districtId)`, returns the block ids of its N/E/S/W in-district
 * neighbors, using the same algorithm as `FlowCellsService.neighbourIndices`.
 *
 * Parameters are lookup callbacks so the function is PURE and works with any data source:
 *   - `getDistrictBlockIds(districtId)` → the block ids in that district.
 *   - `getBlockCoords(blockId)` → `{x, y}` of that block (undefined → block unknown, skip).
 *
 * Returns neighbor block ids (NOT indices). Empty array if no district data or no neighbors.
 *
 * System 9b C3: exported so `RouteFinderService.buildLayer1` can call this with its own loaded
 * geography (avoiding the lifecycle coupling to `FlowCellsService.seededBlocks`). The internal
 * `FlowCellsService.neighbourIndices` method is byte-identical in behavior (delegates to this).
 */
export function gridNeighbourBlockIds(
  x: number,
  y: number,
  districtId: number,
  getDistrictBlockIds: (districtId: number) => number[] | undefined,
  getBlockCoords: (blockId: number) => { x: number; y: number } | undefined,
): number[] {
  const out: number[] = [];
  const deltas = [
    [0, 1], // N
    [1, 0], // E
    [0, -1], // S
    [-1, 0], // W
  ];
  const blockIds = getDistrictBlockIds(districtId);
  if (!blockIds) return out;

  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    // Linear scan over the district's blocks (districts are ≤79 blocks — identical to the internal impl).
    for (const blockId of blockIds) {
      const coords = getBlockCoords(blockId);
      if (!coords) continue;
      if (coords.x === nx && coords.y === ny) {
        out.push(blockId);
        break;
      }
    }
  }
  return out;
}

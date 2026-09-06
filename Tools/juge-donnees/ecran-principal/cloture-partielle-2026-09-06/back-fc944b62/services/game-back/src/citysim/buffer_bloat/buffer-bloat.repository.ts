// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (the EXISTING migrated
//             `tail_risk_estimates` table — 1-1 with laundering_nodes — AND `laundering_nodes` — R9.3: this READS
//             the schema, lazy-CREATEs tail_risk_estimate rows, UPDATEs their per-minute floats, and SYNCs
//             laundering_nodes.buffer_load; it NEVER redefines either table) +
//             docs/tech/04_city_simulation/system_10_buffer_bloat.md §États NodeBuffer + §Update tick
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// `BufferBloatRepository` — the persisted access layer over `tail_risk_estimates` (the System-10-OWNED table: PK
// node_id uuid 1-1 FK → laundering_nodes, player_id, capacity / drain_rate / current_occupancy / tail_p95_estimate
// real, last_estimated_at) + the `laundering_nodes.buffer_load` sync (System 10 is the WRITER of buffer_load;
// System 8 deliberately READS it — confirmed T9). Copies the persisted-system repository template
// (DwellTimeRepository / ErlangStashRepository): a thin `*.repository.ts` owning the raw Drizzle reads/writes with
// EXPLICIT column lists, paired with a thin service that holds the per-tick logic.
//
// R9.3: 09 is the source of truth for `tail_risk_estimates` + `laundering_nodes`. This file imports the EXISTING
// schemas (tailRiskEstimate, launderingNode) and never re-declares them. The runtime role app_rw has SELECT +
// INSERT + UPDATE on tail_risk_estimates AND UPDATE on laundering_nodes (migration `0013_app_role.sql` grant — the
// task confirms 0013 lists both) — this repository uses exactly those. tail_risk_estimate ROW CREATION is a
// System-10 responsibility (the lazy-create below — one row per laundering_node on its first tick), distinct from
// laundering_node creation (the P2 pipeline-build flow, never written here).
//
// OWNERSHIP (clean division, documented):
//   - System 10 OWNS tail_risk_estimates: lazy-CREATEs one row per laundering_node (capacity from
//     buffer_capacity_per_node, drain_rate from drain_rate_to_next_stage_per_hr — the tunable seed values; a
//     row pre-seeded by the E2E/P2 with explicit capacity/drain_rate/occupancy is respected, the lazy-create only
//     fills nodes that have NO tail_risk_estimate yet); then UPDATEs current_occupancy + tail_p95_estimate +
//     last_estimated_at every tick.
//   - System 10 SYNCs laundering_nodes.buffer_load = clamp(current_occupancy / capacity, 0, 1) so System 8's
//     dwell tick reflects the buffer fill. System 8 READS buffer_load, never writes it (T9); System 10 is the writer.
//   - System 10 READS laundering_nodes.throughput_in_per_hour (System 8's persisted inflow source) read-only.
//
// PHASE-1 INPUT REALITY (honest deferral — like dwell-time / erlang-stash): laundering_nodes + tail_risk_estimates
// are P2 operational entities (the player builds nodes; the dirty-cash throughput inflow comes from deals/operations
// — all P2). So `listNodes` returns [] organically — the mechanic is structural; the E2E seeds a building + a
// laundering_node (+ optionally a tail_risk_estimate) to exercise the deterministic occupancy / overflow / bucket
// recompute. The lazy-create handles the case where the E2E seeds ONLY the node (System 10 creates the estimate row).
//
// BATCHED WRITES (the template the persisted systems copy): `applyEstimates` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for the WHOLE recomputed batch — NOT a per-row await loop. `syncBufferLoad` is a
// SECOND single batched UPDATE against laundering_nodes. Both atomic, all-or-nothing. All values are PARAMETERIZED
// bind params (no string interpolation). The recomputed floats respect the migrated CHECK constraints
// (tre_current_occupancy_chk: current_occupancy >= 0; tre_tail_p95_chk: tail_p95_estimate ∈ [0,1]; ln_buffer_load_chk:
// buffer_load ∈ [0,1]) — the service computes within those bounds.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { launderingNode, tailRiskEstimate } from '../../db/schema/pipeline_and_laundering';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';

/**
 * A laundering-node buffer row the buffer-bloat tick reads (system_10 §États NodeBuffer inputs). It LEFT-JOINs the
 * 1-1 tail_risk_estimate so a node WITHOUT an estimate yet (the lazy-create target) still appears (estimate fields
 * null). throughput_in_per_hour is the inflow source (System 8's persisted column, read-only). district_id is
 * JOINed (laundering_nodes.building_id → buildings.block_id → blocks.id → blocks.district_id). The raw fields are
 * NEVER forwarded to the client (R2.2).
 */
export interface NodeBufferState {
  node_id: string;
  building_id: string;
  /** The district this node's host building's block belongs to (the per-district projection identity). */
  district_id: number;
  /** The node's pipeline position (a structural identity, not a sim scalar). */
  stage_index: number;
  /** The inbound dirty-cash flow (cash/hr) — System 8's persisted column, read-only here (the inflow source; Inv 1). */
  throughput_in_per_hour: number;
  /** Whether the 1-1 tail_risk_estimate row already exists (false = the lazy-create target for this node). */
  has_estimate: boolean;
  /** The buffer $ capacity (cents) — from the estimate row if present, else null (lazy-create stamps the tunable). */
  capacity: number | null;
  /** The fixed drain rate toward the downstream node (cents/hr) — from the estimate row if present, else null. */
  drain_rate: number | null;
  /** Current cash queued in the buffer (cents) — the INPUT the tick advances (inflow − drain). Raw float, BO-only. */
  current_occupancy: number | null;
  /** Current P95 seizure-size estimate ∈ [0,1] — the INPUT the tick RECOMPUTES. Raw float, BO-only. */
  tail_p95_estimate: number | null;
}

/**
 * A per-node tail_risk_estimate recompute the tick persists (the tick output). current_occupancy (advanced by
 * inflow − drain, capped at capacity) + tail_p95_estimate (refreshed) + last_estimated_at. capacity + drain_rate
 * are written back unchanged (passthrough — they are configuration the row carries; writing them keeps the batched
 * UPDATE column list uniform and lets a later capacity-change flow slot in without a repository change).
 */
export interface EstimateMutation {
  node_id: string;
  capacity: number;
  drain_rate: number;
  current_occupancy: number;
  tail_p95_estimate: number;
}

/** A per-node buffer_load sync (laundering_nodes.buffer_load = clamp(occupancy / capacity, 0, 1)). */
export interface BufferLoadMutation {
  node_id: string;
  buffer_load: number;
}

@Injectable()
export class BufferBloatRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Map a raw joined row → the typed NodeBufferState (estimate fields LEFT-JOINed, may be null). */
  private mapRow(r: {
    node_id: string;
    building_id: string;
    district_id: number;
    stage_index: number;
    throughput_in_per_hour: number;
    capacity: number | null;
    drain_rate: number | null;
    current_occupancy: number | null;
    tail_p95_estimate: number | null;
  }): NodeBufferState {
    return {
      node_id: r.node_id,
      building_id: r.building_id,
      district_id: r.district_id,
      stage_index: r.stage_index,
      throughput_in_per_hour: r.throughput_in_per_hour,
      has_estimate: r.capacity !== null,
      capacity: r.capacity,
      drain_rate: r.drain_rate,
      current_occupancy: r.current_occupancy,
      tail_p95_estimate: r.tail_p95_estimate,
    };
  }

  /** The SELECT column list shared by listNodes / listNodesForDistrict (node + LEFT-JOINed estimate + district). */
  private baseSelect() {
    return {
      node_id: launderingNode.node_id,
      building_id: launderingNode.building_id,
      district_id: blocks.district_id,
      stage_index: launderingNode.stage_index,
      throughput_in_per_hour: launderingNode.throughput_in_per_hour,
      capacity: tailRiskEstimate.capacity,
      drain_rate: tailRiskEstimate.drain_rate,
      current_occupancy: tailRiskEstimate.current_occupancy,
      tail_p95_estimate: tailRiskEstimate.tail_p95_estimate,
    };
  }

  /**
   * All laundering-node buffers for a player — the per-tick set. EXPLICIT column list, ordered by stage_index then
   * node_id for deterministic batching. LEFT-JOINs the 1-1 tail_risk_estimate (so a node with no estimate yet still
   * appears — the lazy-create target). JOINs buildings (node.building_id → buildings) then the global `blocks` table
   * (buildings.block_id → blocks.id) to resolve the host district. Returns [] when the player has no nodes (the
   * organic Phase-1 reality — the laundering_nodes table is empty).
   */
  async listNodes(playerId: string): Promise<NodeBufferState[]> {
    const rows = await this.db
      .select(this.baseSelect())
      .from(launderingNode)
      .leftJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .innerJoin(building, eq(building.building_id, launderingNode.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(eq(launderingNode.player_id, playerId))
      .orderBy(launderingNode.stage_index, launderingNode.node_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * All laundering-node buffers for a player IN one district (the projection read — same shape as listNodes,
   * narrowed to a district via the buildings → blocks JOIN). Returns [] for a district with no nodes (the controller
   * projects an empty per-district payload — the organic Phase-1 shape).
   */
  async listNodesForDistrict(playerId: string, districtId: number): Promise<NodeBufferState[]> {
    const rows = await this.db
      .select(this.baseSelect())
      .from(launderingNode)
      .leftJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .innerJoin(building, eq(building.building_id, launderingNode.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(launderingNode.player_id, playerId), eq(blocks.district_id, districtId)))
      .orderBy(launderingNode.stage_index, launderingNode.node_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * Lazily CREATE one tail_risk_estimate row per laundering_node that has NONE yet — race-safe, in a SINGLE durable
   * statement. System 10 OWNS this table; a node's estimate is created on its FIRST tick (the spec's lazy-create).
   * The new rows take the seed defaults: capacity = $defaultCapacity (buffer_capacity_per_node), drain_rate =
   * $defaultDrainRate (drain_rate_to_next_stage_per_hr), current_occupancy = 0, tail_p95_estimate = 0. A node that
   * already has a tail_risk_estimate (seeded by the E2E/P2 with explicit values) is left untouched (the NOT EXISTS
   * guard) — its explicit capacity/occupancy win.
   *
   * DURABLE IDEMPOTENCY (mirrors CohesionRepository.seedDistricts): two guards make this safe even if two instances
   * run a player's FIRST tick concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player lazy-create across connections.
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM tail_risk_estimates t WHERE t.node_id = n.node_id)` — the per-node
   *      all-or-nothing guard: a node already owning an estimate is skipped (never a duplicate-PK / double row).
   * One statement, parameterized (capacity/drain_rate/occupancy/tail take the seed values).
   */
  async lazyCreateEstimates(playerId: string, defaultCapacity: number, defaultDrainRate: number): Promise<void> {
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${tailRiskEstimate} (node_id, player_id, capacity, drain_rate, current_occupancy, tail_p95_estimate)
      SELECT n.node_id, n.player_id, ${defaultCapacity}::real, ${defaultDrainRate}::real, 0::real, 0::real
      FROM ${launderingNode} AS n
      WHERE n.player_id = ${playerId}::uuid
        AND NOT EXISTS (SELECT 1 FROM ${tailRiskEstimate} AS t WHERE t.node_id = n.node_id)
    `);
  }

  /**
   * Persist a batch of per-node tail_risk_estimate recomputes in ONE set-based atomic `UPDATE ... FROM (VALUES …)`
   * statement — NOT a per-row loop. Updates current_occupancy (advanced inflow − drain, capped at capacity),
   * tail_p95_estimate (refreshed), capacity + drain_rate (passthrough), and stamps last_estimated_at = now(). All
   * values are PARAMETERIZED bind params (no string interpolation). The WHERE pins the update to the player + the
   * node id (never touches another player's rows). The recomputed floats respect the migrated CHECK bounds
   * (current_occupancy >= 0; tail_p95_estimate ∈ [0,1]) — the service computes within them.
   */
  async applyEstimates(playerId: string, mutations: EstimateMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) =>
        sql`(${m.node_id}::uuid, ${m.capacity}::real, ${m.drain_rate}::real, ${m.current_occupancy}::real, ${m.tail_p95_estimate}::real)`,
    );
    await this.db.execute(sql`
      UPDATE ${tailRiskEstimate} AS t
      SET capacity = v.capacity,
          drain_rate = v.drain_rate,
          current_occupancy = v.current_occupancy,
          tail_p95_estimate = v.tail_p95_estimate,
          last_estimated_at = now()
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(node_id, capacity, drain_rate, current_occupancy, tail_p95_estimate)
      WHERE t.player_id = ${playerId}::uuid AND t.node_id = v.node_id
    `);
  }

  /**
   * SYNC laundering_nodes.buffer_load = clamp(current_occupancy / capacity, 0, 1) for a batch of nodes, in ONE
   * set-based atomic `UPDATE ... FROM (VALUES …)`. System 10 is the WRITER of buffer_load (System 8 READS it for its
   * dwell tick — T9). All values are PARAMETERIZED bind params. The WHERE pins the update to the player + node id.
   * buffer_load respects the migrated CHECK ln_buffer_load_chk (∈ [0,1]) — the service clamps before passing it here.
   */
  async syncBufferLoad(playerId: string, mutations: BufferLoadMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map((m) => sql`(${m.node_id}::uuid, ${m.buffer_load}::real)`);
    await this.db.execute(sql`
      UPDATE ${launderingNode} AS n
      SET buffer_load = v.buffer_load
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(node_id, buffer_load)
      WHERE n.player_id = ${playerId}::uuid AND n.node_id = v.node_id
    `);
  }
}

// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (the EXISTING migrated
//             `laundering_nodes` table — R9.3: this READS the schema + UPDATEs the per-minute floats; it NEVER
//             redefines the table) + docs/tech/04_city_simulation/system_8_dwell_time_tax.md §États LaunderingNode
//             + §Update tick (the per-node floats throughput_in_per_hour / dwell_time_hours / buffer_load /
//             cleanliness_at_output are recomputed every minute and persisted back)
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// `DwellTimeRepository` — the persisted access layer over `laundering_nodes` (table created in migration
// `0006_pipeline_and_laundering.sql`, already migrated; PK node_id uuid, FK player_id + building_id NOT NULL).
// Copies the persisted-system repository template (UnconformityLedgerRepository / InspectionQueueRepository): a
// thin `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin
// service that holds the per-minute tick logic.
//
// R9.3: 09 is the source of truth for `laundering_nodes`. This file imports the EXISTING schema (launderingNode)
// and never re-declares it. The runtime role app_rw has SELECT/INSERT (0006 grant) + UPDATE (`0013_app_role.sql`
// grant lists `laundering_nodes`) — this repository uses exactly SELECT + UPDATE (it never INSERTs/DELETEs nodes:
// node creation = the P2 pipeline-build flow, not a System-8 write; System 8 only recomputes + persists the floats).
//
// PHASE-1 INPUT REALITY (honest deferral — like unconformity): the laundering_nodes table is EMPTY in normal
// Phase-1 runs (nodes = P2 operational entities the player builds; the dirty-cash throughput inflow comes from
// deals/operations — all P2). So `listNodes` returns [] organically — the mechanic is structural; the E2E seeds a
// building + nodes to exercise the deterministic Little's-Law / bucket / overflow recompute. No seed method here:
// System 8 does not CREATE nodes.
//
// BATCHED WRITES (the template the persisted systems copy): `applyNodeFloats` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for the WHOLE recomputed batch — NOT a per-row await loop. Atomic, all-or-nothing.
// All values are PARAMETERIZED bind params (no string interpolation). The recomputed floats respect the migrated
// CHECK constraints (ln_dwell_time_chk: dwell >= 0; ln_cleanliness_chk + ln_buffer_load_chk: ∈ [0,1]) — the
// service computes within those bounds (buffer_load is NOT mutated here — it is an INPUT the tick reads; the
// recompute writes dwell_time_hours + cleanliness_at_output + throughput_in_per_hour passthrough).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { launderingNode } from '../../db/schema/pipeline_and_laundering';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';

/**
 * A laundering-node row the dwell-time tick reads (system_8 §États LaunderingNode inputs). The raw per-minute
 * floats live here; the service recomputes dwell_time_hours + cleanliness_at_output (Little's Law / Inv 6) and
 * writes the batch back. district_id is JOINed (laundering_nodes.building_id → buildings.block_id → blocks.id →
 * blocks.district_id) — the per-node → per-district mapping the projection uses. NEVER forwarded to the client (R2.2).
 */
export interface LaunderingNodeState {
  node_id: string;
  building_id: string;
  /** The district this node's host building's block belongs to (JOIN blocks — the per-district projection identity). */
  district_id: number;
  /** The node's pipeline position (1..pipeline_depth_stages, DB-bounded 0..4) — a structural identity, not a sim scalar. */
  stage_index: number;
  /** The inbound dirty-cash flow (cash/hr). The raw float — NEVER exposed (R2.2 — only the ThroughputBucket). */
  throughput_in_per_hour: number;
  /** Current dwell time (hrs) — the INPUT (the tick RECOMPUTES it from buffer/throughput). Raw float, BO-only. */
  dwell_time_hours: number;
  /** Normalized buffer-load RATIO in [0..1] (DB-CHECK-enforced) — buffered_cash / inventory_cap_per_node. */
  buffer_load: number;
  /** Money cleanliness at output ∈ [0,1] (Inv 6) — the INPUT (the tick RECOMPUTES it). Raw float, BO-only. */
  cleanliness_at_output: number;
}

/**
 * A per-node recompute the minute tick persists (the tick output). dwell_time_hours + cleanliness_at_output are
 * the recomputed floats; throughput_in_per_hour is written back unchanged (a passthrough — its inflow source is
 * P2, so the tick neither invents nor mutates it here, but writing it keeps the batched UPDATE column list uniform
 * and lets a later P2 inflow path slot in without a schema/repository change). buffer_load is NOT in the mutation:
 * it is the INPUT the tick consumes (the buffer feed/drain is P2), never overwritten by the recompute.
 */
export interface NodeFloatMutation {
  node_id: string;
  dwell_time_hours: number;
  cleanliness_at_output: number;
  throughput_in_per_hour: number;
}

@Injectable()
export class DwellTimeRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * All laundering nodes for a player — the per-minute recompute set. EXPLICIT column list, ordered by stage_index
   * then node_id for deterministic batching. JOINs buildings (node.building_id → buildings) then the global
   * `blocks` table (buildings.block_id → blocks.id) to resolve the host district. Returns [] when the player has
   * no nodes (the organic Phase-1 reality — the laundering_nodes table is empty).
   */
  async listNodes(playerId: string): Promise<LaunderingNodeState[]> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        building_id: launderingNode.building_id,
        district_id: blocks.district_id,
        stage_index: launderingNode.stage_index,
        throughput_in_per_hour: launderingNode.throughput_in_per_hour,
        dwell_time_hours: launderingNode.dwell_time_hours,
        buffer_load: launderingNode.buffer_load,
        cleanliness_at_output: launderingNode.cleanliness_at_output,
      })
      .from(launderingNode)
      .innerJoin(building, eq(building.building_id, launderingNode.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(eq(launderingNode.player_id, playerId))
      .orderBy(launderingNode.stage_index, launderingNode.node_id);
    return rows.map((r) => ({
      node_id: r.node_id,
      building_id: r.building_id,
      district_id: r.district_id,
      stage_index: r.stage_index,
      throughput_in_per_hour: r.throughput_in_per_hour,
      dwell_time_hours: r.dwell_time_hours,
      buffer_load: r.buffer_load,
      cleanliness_at_output: r.cleanliness_at_output,
    }));
  }

  /**
   * All laundering nodes for a player IN one district (the projection read — same shape as listNodes, narrowed to
   * a district via the buildings → blocks JOIN). Returns [] for a district with no nodes (the controller projects
   * an empty per-district payload — the organic Phase-1 shape).
   */
  async listNodesForDistrict(playerId: string, districtId: number): Promise<LaunderingNodeState[]> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        building_id: launderingNode.building_id,
        district_id: blocks.district_id,
        stage_index: launderingNode.stage_index,
        throughput_in_per_hour: launderingNode.throughput_in_per_hour,
        dwell_time_hours: launderingNode.dwell_time_hours,
        buffer_load: launderingNode.buffer_load,
        cleanliness_at_output: launderingNode.cleanliness_at_output,
      })
      .from(launderingNode)
      .innerJoin(building, eq(building.building_id, launderingNode.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(launderingNode.player_id, playerId), eq(blocks.district_id, districtId)))
      .orderBy(launderingNode.stage_index, launderingNode.node_id);
    return rows.map((r) => ({
      node_id: r.node_id,
      building_id: r.building_id,
      district_id: r.district_id,
      stage_index: r.stage_index,
      throughput_in_per_hour: r.throughput_in_per_hour,
      dwell_time_hours: r.dwell_time_hours,
      buffer_load: r.buffer_load,
      cleanliness_at_output: r.cleanliness_at_output,
    }));
  }

  /**
   * Persist a batch of per-node recomputed floats in ONE set-based atomic `UPDATE ... FROM (VALUES …)` statement —
   * NOT a per-row loop. The minute tick recomputes ≤N_nodes rows; this collapses that to a SINGLE round-trip,
   * all-or-nothing (a mid-batch failure can't leave a half-updated set). All values are PARAMETERIZED bind params
   * (no string interpolation). The WHERE pins the update to the player + the node id (never touches another
   * player's rows). The recomputed floats respect the migrated CHECK bounds (dwell >= 0; cleanliness ∈ [0,1]) — the
   * service computes within them. buffer_load is deliberately NOT written (it is the tick's INPUT — see the header).
   */
  async applyNodeFloats(playerId: string, mutations: NodeFloatMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) =>
        sql`(${m.node_id}::uuid, ${m.dwell_time_hours}::real, ${m.cleanliness_at_output}::real, ${m.throughput_in_per_hour}::real)`,
    );
    await this.db.execute(sql`
      UPDATE ${launderingNode} AS n
      SET dwell_time_hours = v.dwell_time_hours,
          cleanliness_at_output = v.cleanliness_at_output,
          throughput_in_per_hour = v.throughput_in_per_hour
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(node_id, dwell_time_hours, cleanliness_at_output, throughput_in_per_hour)
      WHERE n.player_id = ${playerId}::uuid AND n.node_id = v.node_id
    `);
  }
}

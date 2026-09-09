// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (laundering_nodes — the Stage-1 node;
//             buffer_load = the normalized [0..1] in-process buffered-cash RATIO; safehouses — System 9 Erlang slot
//             model current_fill per-slot percent + slot_capacity_cents; R9.3 — READ, never redefine) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the clean-cash
//             wallet credit; R9.3) + docs/tech/09_data_model/schema_city_state.md §2 (buildings — ownership +
//             block_id + transaction_profile, the System-7 deviation input) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state — the front-shop
//             OPERATIONAL gate) +
//             docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 1 / §Stage 2 / §Unconformity Ledger
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingRepository` — the persisted access layer for the M1 Stage-1 laundering slice. Copies the persisted-system
// repository template (SellingRepository / DwellTimeRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action / per-tick logic.
//
// R9.3: 09 is the source of truth for `laundering_nodes` (Phase-1, System 8), `safehouses` (Phase-1, System 9),
// `economy_states` (Phase-1), `buildings` (Phase-1 — ownership / transaction_profile / audit pin), and
// `building_operational_state` (T0 — the operational gate). This file IMPORTS the existing schema and NEVER
// re-declares it. The runtime role app_rw has SELECT/INSERT broadly (0013) + UPDATE on laundering_nodes / safehouses
// / economy_states / buildings (0013) — this repository uses exactly those.
//
// COUPLING DISCIPLINE (the load-bearing constraint of T6 — CONSUME, never rebuild):
//   - System 9 (Erlang Stash) is CONSUMED by reading + DRAINING the `safehouses` slot model (current_fill per-slot
//     percent, slot_capacity_cents). The inject DRAINS the slots per the existing model (the inverse of T5's deposit
//     fill); it does NOT recompute the Erlang-B blocking probability. The reconstructed cash (Σ round((pct/100)×cap))
//     is the SAME representation T5's runner deposit fills (selling.service.ts fillSlots), so the System-9 /stash
//     projection stays consistent. The service computes the post-drain current_fill; this repo only persists it.
//   - System 8 (Dwell-Time Tax) is CONSUMED by READING the per-node cleanliness_at_output (the [0,1] float System 8
//     RECOMPUTES every MINUTE/2 tick via Little's Law). The clean-output tick reads this float and releases cash once
//     it reaches the clean band; it NEVER recomputes Little's Law / dwell / cleanliness (that math lives in
//     DwellTimeService — this repo only reads the persisted float + zeroes the buffered cash on release).
//   - System 10 (Buffer Bloat) OWNS the per-node buffer occupancy: `tail_risk_estimates.current_occupancy` (the cash
//     IN the buffer, in cents) + `laundering_nodes.buffer_load` (= clamp(occupancy/capacity, 0, 1) — System 10 SYNCs
//     this every MINUTE/3 tick; System 8 reads it). So `buffer_load` is NOT a free store — System 10 clobbers it each
//     tick from `current_occupancy`. The injected cash therefore lives in `current_occupancy` (System 10's cash
//     field), and the inject SEEDS the node's tail_risk_estimate row with `drain_rate = 0` (so System 10's
//     drain-to-next-stage does NOT leak the cash — there is no next stage in M1) + a `capacity` ≥ the held cents (so
//     System 10's overflow cap never drops cash). System 10 then keeps buffer_load synced from the occupancy; this
//     repo CONSUMES System 10's occupancy/capacity fields, never recomputes its tail-risk math. (The lazy-create is
//     NOT-EXISTS guarded — buffer-bloat.repository.ts — so the inject's explicit capacity/drain_rate/occupancy win.)
//   - System 7 (Unconformity Ledgers) is CONSUMED by WRITING the front-shop's `buildings.transaction_profile` (the
//     "only if promoted" jsonb System 7's NIGHTLY tick scores). An inject > baseline writes a deviation-bearing
//     profile (a flat sample history + a spiking latest_revenue) so System 7's own z-score → CRITICAL → audit pin;
//     an inject ≤ baseline writes a within-baseline profile (NOMINAL). The deviation DECISION (z-score → bucket → pin)
//     is System 7's job — this repo only feeds the declared-revenue input it scores (the documented seam; System 7
//     has no incoming-deviation subscriber, so the feed is via the transaction_profile it already reads).
//
// THE IN-PROCESS CASH REPRESENTATION (laundering_nodes / tail_risk_estimates have NO new declared-revenue column —
// R9.3, no schema change): the injected cash lives in `tail_risk_estimates.current_occupancy` (cents — System 10's
// cash field). System 8 cleans the node over dwell regardless of the cash magnitude: an M1 node has throughput=0, so
// System 8's idle-node dwell guard sets dwell = dwell_time_per_node_hr → cleanliness = 1.0 (the cash is fully
// laundered after the next MINUTE/2 tick) — INDEPENDENT of buffer_load. The release reads `current_occupancy` for the
// exact cents (a float4 holding an integer < ~16.7M cents — exact), credits the wallet, and zeroes occupancy.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { economyState } from '../../db/schema/player_economy_state';
import { launderingNode, launderingEdge, safehouse, tailRiskEstimate } from '../../db/schema/pipeline_and_laundering';
import { buildingOperationalState } from '../../db/schema/operational_chain';

/** A player-owned OPERATIONAL front-shop (the inject target) WITH its district — the inject gate. */
export interface FrontShopRow {
  building_id: string;
  block_id: number;
}

/** A safehouse the inject DRAINS (the Erlang slot model — current_fill per-slot percent + capacity). System 9. */
export interface SafehouseSlotRow {
  safehouse_id: string;
  slot_count: number;
  slot_capacity_cents: number;
  current_fill: number[];
}

/** The Stage-1 laundering node for a front-shop (the in-process buffered cash lives in tail_risk current_occupancy). */
export interface Stage1NodeRow {
  node_id: string;
  building_id: string;
  /** The in-process buffered cash (cents) — tail_risk_estimates.current_occupancy (System 10's cash field). 0 if none. */
  occupancy_cents: number;
  /** cleanliness_at_output ∈ [0,1] — RECOMPUTED by System 8 (CONSUMED here, never recomputed). */
  cleanliness_at_output: number;
}

/** A node ready to release its cleaned cash to the wallet (cleanliness reached the band; occupancy > 0). */
export interface ReleasableNode {
  node_id: string;
  /** The cents currently buffered in-process = round(tail_risk_estimates.current_occupancy). */
  buffered_cents: number;
  /**
   * The CANONICAL stage position of this node in its pipeline (laundering_pipeline.md §Vue d'ensemble: 1=front-shop,
   * 2/3=mid-tier, 4=clean-holding terminal). CONSUMED (read from the laundering_nodes column — R9.3, no schema change).
   * Used by the release gate to guard per-stage cleanliness (lot-4 TD-023 — pipelineCleanlinessForStage(stage_index)
   * >= fullCleanThreshold prevents a Stage-1 or Stage-3 node from being released by an anomalously high System-8 float).
   */
  stage_index: number;
}

/** A player-owned OPERATIONAL building (any operational_type) WITH its district — a mid-tier stage host (Phase 2b). */
export interface OperationalBuildingRow {
  building_id: string;
  block_id: number;
}

/** A player-owned laundering node + whether it is the pipeline TAIL (has NO outgoing edge) — the addStage anchor. */
export interface PipelineNodeRow {
  node_id: string;
  building_id: string;
  stage_index: number;
  /** TRUE when the node has no outgoing laundering_edge (it is the current terminal/tail of its chain). */
  is_terminal: boolean;
}

/** A non-terminal node's cash ready to route ONE hop downstream this tick (Phase 2b — the routing input). */
export interface RoutableHop {
  from_node: string;
  to_node: string;
  /** The cents buffered at the from-node = round(tail_risk_estimates.current_occupancy). */
  buffered_cents: number;
}

/** A pipeline node for the player-facing overview projection (ordered by stage; raw floats mapped to bands upstream). */
export interface PipelineOverviewNode {
  node_id: string;
  stage_index: number;
  /** TRUE when the node has no outgoing edge (the terminal/release node of the chain). */
  is_terminal: boolean;
  /** The in-process buffered cash (cents) — used only to derive a presence flag; never surfaced raw (R2.2). */
  occupancy_cents: number;
}

/** Coerce a jsonb value into a number[] of per-slot percents (defensive — the column is a free-form jsonb array). */
function toFillArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

@Injectable()
export class LaunderingRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── inject lookups (the action guards) ─────────────────────────────

  /**
   * Read a player-owned front-shop building that is OPERATIONAL (conversion_stage='operational', operational_type
   * 'front_shop') WITH its block_id — the inject gate (laundering_pipeline.md §Stage 1: cash is injected into a
   * front-shop's declared revenue). Returns { building_id, block_id } or null (not the player's / not an operational
   * front-shop). Mirrors SellingRepository.getOwnedOperationalDealerSpot exactly (same building gate shape).
   */
  async getOwnedOperationalFrontShop(playerId: string, buildingId: string): Promise<FrontShopRow | null> {
    const rows = await this.db
      .select({ building_id: building.building_id, block_id: building.block_id })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
          eq(buildingOperationalState.operational_type, 'front_shop'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read a player-owned safehouse (the Erlang slot model — System 9 CONSUMED) WITHOUT the operational JOIN. The
   * inject DRAINS the slots; the SOURCE safehouse is gated only on ownership here (the front-shop is the operational
   * target — the deposit-side operational gate lives on the front-shop, mirroring how T5's collect gates the
   * deposit-target safehouse). Returns the slot model fields or null (not the player's).
   */
  async getOwnedSafehouse(playerId: string, safehouseId: string): Promise<SafehouseSlotRow | null> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        slot_count: safehouse.slot_count,
        slot_capacity_cents: safehouse.slot_capacity_cents,
        current_fill: safehouse.current_fill,
      })
      .from(safehouse)
      .where(and(eq(safehouse.player_id, playerId), eq(safehouse.safehouse_id, safehouseId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      safehouse_id: r.safehouse_id,
      slot_count: r.slot_count,
      slot_capacity_cents: r.slot_capacity_cents,
      current_fill: toFillArray(r.current_fill),
    };
  }

  /**
   * The Stage-1 laundering node for a (player, front-shop), or null if none exists yet (a front-shop with no node).
   * The Stage-1 node is the building's stage_index=1 node (the front-shop laundering node — laundering_pipeline.md
   * §Stage 1). occupancy_cents = tail_risk_estimates.current_occupancy (System 10's cash field — the in-process cash;
   * LEFT JOIN, 0 if no estimate row yet); cleanliness_at_output is System 8's float (the release/projection band input).
   */
  async getStage1Node(playerId: string, buildingId: string): Promise<Stage1NodeRow | null> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        building_id: launderingNode.building_id,
        occupancy_cents: sql<number>`coalesce(${tailRiskEstimate.current_occupancy}, 0)`.as('occupancy_cents'),
        cleanliness_at_output: launderingNode.cleanliness_at_output,
      })
      .from(launderingNode)
      .leftJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .where(
        and(
          eq(launderingNode.player_id, playerId),
          eq(launderingNode.building_id, buildingId),
          eq(launderingNode.stage_index, 1),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      node_id: r.node_id,
      building_id: r.building_id,
      occupancy_cents: Number(r.occupancy_cents),
      cleanliness_at_output: r.cleanliness_at_output,
    };
  }

  // ───────────────────────────── pipeline setup (Phase 2b — addStage) ─────────────────────────────

  /**
   * Read a player-owned OPERATIONAL building (any operational_type — conversion_stage='operational') WITH its
   * block_id — a mid-tier laundering-stage HOST (Phase 2b; laundering_pipeline.md §Stage 3 "Le 40%-clean cash move
   * vers un ou plusieurs mid-tier nodes"). The per-node-TYPE specialization (restaurant/bar/bookkeeper/taxi-coop) is
   * DEFERRED — any owned operational building can host a mid-tier stage (uniform gain). Returns { building_id,
   * block_id } or null (not the player's / not operational). Mirrors getOwnedOperationalFrontShop's building gate.
   */
  async getOwnedOperationalBuilding(playerId: string, buildingId: string): Promise<OperationalBuildingRow | null> {
    const rows = await this.db
      .select({ building_id: building.building_id, block_id: building.block_id })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read a player-owned laundering node by id + whether it is the pipeline TAIL (Phase 2b — the addStage anchor: a new
   * stage can only be appended to a node that has no outgoing edge yet, so a pipeline stays a LINEAR chain — parallel
   * branches are DEFERRED). `is_terminal` = the node has NO outgoing laundering_edge. Returns null when the node is not
   * the player's. NOT-EXISTS on laundering_edges keyed by from_node (the player-scoped outgoing-edge check).
   */
  async getOwnedPipelineNode(playerId: string, nodeId: string): Promise<PipelineNodeRow | null> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        building_id: launderingNode.building_id,
        stage_index: launderingNode.stage_index,
        is_terminal: sql<boolean>`NOT EXISTS (
          SELECT 1 FROM ${launderingEdge} e
          WHERE e.player_id = ${playerId}::uuid AND e.from_node = ${launderingNode.node_id}
        )`.as('is_terminal'),
      })
      .from(launderingNode)
      .where(and(eq(launderingNode.player_id, playerId), eq(launderingNode.node_id, nodeId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      node_id: r.node_id,
      building_id: r.building_id,
      stage_index: r.stage_index,
      is_terminal: Boolean(r.is_terminal),
    };
  }

  /**
   * Whether the player ALREADY has a laundering node on a building (Phase 2b — one node per building per chain; reject
   * appending a stage onto a building that already hosts a node, keeping the linear chain unambiguous). Returns the
   * node_id if one exists, else null.
   */
  async getNodeOnBuilding(playerId: string, buildingId: string): Promise<string | null> {
    const rows = await this.db
      .select({ node_id: launderingNode.node_id })
      .from(launderingNode)
      .where(and(eq(launderingNode.player_id, playerId), eq(launderingNode.building_id, buildingId)))
      .limit(1);
    return rows[0]?.node_id ?? null;
  }

  /**
   * The ATOMIC append-a-stage (Phase 2b — laundering_pipeline.md §Stage 3 / §NestJS PipelineService.addStageNode), in
   * ONE DB transaction:
   *   (a) GUARDED re-check that `from_node` is still the player's TAIL (no outgoing edge) — a concurrent addStage on
   *       the same tail must not fork the chain. If an outgoing edge already exists, the tx returns null (the caller
   *       409s — the chain already advanced).
   *   (b) INSERT a fresh laundering_node on `building_id` at stage_index = fromStageIndex + 1 (throughput=0 — no
   *       continuous inflow; System 8 cleans the idle node, System 10 leaves it stable with drain_rate 0).
   *   (c) INSERT the laundering_edge from_node → the new node (routing_weight 1 — the single linear hop; the parallel
   *       routing-weight split is DEFERRED).
   *   (d) SEED the new node's tail_risk_estimate (System 10's owned row) with capacity = capacityCents, drain_rate 0
   *       (so System 10's drain does not leak the cash), occupancy 0 (no cash yet — it arrives via the routing hop).
   * Returns the new node id, or null if the guarded tail re-check failed (a concurrent fork). NO RNG.
   */
  async addStageNode(
    playerId: string,
    params: { from_node: string; building_id: string; from_stage_index: number; capacityCents: number },
  ): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      // (a) Guarded TAIL re-check inside the tx — refuse if `from_node` already has an outgoing edge (a fork).
      const existingOut = await tx
        .select({ edge_id: launderingEdge.edge_id })
        .from(launderingEdge)
        .where(and(eq(launderingEdge.player_id, playerId), eq(launderingEdge.from_node, params.from_node)))
        .limit(1);
      if (existingOut.length > 0) return null; // the tail already advanced (a concurrent addStage) → caller 409s.

      // (b) INSERT the new stage node (stage_index = from + 1; throughput 0 — System 8 cleans the idle node).
      const [inserted] = await tx
        .insert(launderingNode)
        .values({
          player_id: playerId,
          building_id: params.building_id,
          stage_index: params.from_stage_index + 1,
          throughput_in_per_hour: 0,
          dwell_time_hours: 0,
          buffer_load: 0,
          cleanliness_at_output: 0, // System 8 recomputes this every MINUTE/2 tick (CONSUMED).
        })
        .returning({ node_id: launderingNode.node_id });
      const newNodeId = inserted.node_id;

      // (c) INSERT the linear edge from_node → new node (routing_weight 1 — single hop; parallel split DEFERRED).
      await tx.insert(launderingEdge).values({
        player_id: playerId,
        from_node: params.from_node,
        to_node: newNodeId,
        routing_weight: 1,
      });

      // (d) SEED the new node's tail_risk_estimate (System 10 owns it; drain_rate 0 + capacity ≥ routed cents so the
      // routing hop's cash is never leaked/overflowed before the next stage routes/releases it). Occupancy 0 (no cash
      // yet). System 10's lazy-create is NOT-EXISTS guarded, so this explicit row survives its ticks.
      await tx.insert(tailRiskEstimate).values({
        node_id: newNodeId,
        player_id: playerId,
        capacity: params.capacityCents,
        drain_rate: 0,
        current_occupancy: 0,
        tail_p95_estimate: 0,
      });

      return newNodeId;
    });
  }

  // ───────────────────────────── the ATOMIC inject (drain safehouse → credit node) ─────────────────────────────

  /**
   * The ATOMIC guarded INJECT (Stage-1 cash injection), in ONE DB transaction (laundering_pipeline.md §Stage 1):
   *   (a) DRAIN the safehouse: SET current_fill = the post-drain per-slot percent the SERVICE computed (System 9
   *       slot model CONSUMED — the service drained the slots; this repo only persists the resulting array). Guarded
   *       by a current_fill equality predicate so a concurrent deposit/drain that changed the fill between the read
   *       and the write does NOT lose/duplicate cash (the UPDATE affects 0 rows on a mismatch → the tx rolls back,
   *       the caller retries/refuses).
   *   (b) UPSERT the front-shop's Stage-1 node (UPDATE the existing stage_index=1 node, else INSERT a fresh one — the
   *       node-create flow; System 8 does not create nodes, the inject does). throughput=0 (no continuous inflow in
   *       M1) → System 8 cleans it via the idle-dwell guard.
   *   (c) CREDIT the node's in-process cash: UPSERT its tail_risk_estimate (System 10's owned row) with
   *       `current_occupancy += amountCents`, `capacity = capacityCents` (≥ the held cents so System 10's overflow cap
   *       never drops cash), `drain_rate = 0` (so System 10's drain-to-next-stage does not leak the cash — no next
   *       stage in M1). System 10 then keeps buffer_load synced from this occupancy (CONSUMED, never recomputed here).
   *   (d) WRITE the front-shop's transaction_profile (System 7 CONSUMED — the deviation input it scores nightly): a
   *       within-baseline or deviation-bearing `{ revenue_samples, latest_revenue }`, computed by the service.
   * Wrapped in one tx so the safehouse is never drained without the node being credited (cash conservation), and the
   * deviation profile lands with the same injection. Returns the Stage-1 node id (created or existing) on success, or
   * null if the guarded drain affected 0 rows (a concurrent fill change → caller re-reads). NO RNG.
   */
  async applyInject(
    playerId: string,
    params: {
      safehouse_id: string;
      preDrainFill: number[];
      postDrainFill: number[];
      front_shop_id: string;
      node_id: string | null;
      amountCents: number;
      capacityCents: number;
      transactionProfile: { revenue_samples: number[]; latest_revenue: number };
    },
  ): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      // (a) Guarded DRAIN of the safehouse current_fill (only if it still equals the array the service read — no lost
      // cash on a concurrent fill change). The equality is checked on the jsonb value (the System-9 slot model).
      const drained = await tx
        .update(safehouse)
        .set({ current_fill: params.postDrainFill })
        .where(
          and(
            eq(safehouse.player_id, playerId),
            eq(safehouse.safehouse_id, params.safehouse_id),
            sql`${safehouse.current_fill} = ${JSON.stringify(params.preDrainFill)}::jsonb`,
          ),
        )
        .returning({ safehouse_id: safehouse.safehouse_id });
      if (drained.length === 0) {
        // The fill changed between the service read and this write → refuse this inject (the tx rolls back).
        return null;
      }

      // (b) UPSERT the front-shop Stage-1 node (UPDATE the existing node, else INSERT a fresh one).
      let nodeId: string;
      if (params.node_id !== null) {
        nodeId = params.node_id;
      } else {
        const [inserted] = await tx
          .insert(launderingNode)
          .values({
            player_id: playerId,
            building_id: params.front_shop_id,
            stage_index: 1, // the front-shop Stage-1 laundering node (laundering_pipeline.md §Stage 1).
            throughput_in_per_hour: 0, // no continuous inflow in M1 (single inject) — System 8 cleans via idle-dwell.
            dwell_time_hours: 0, // System 8 recomputes this every MINUTE/2 tick (CONSUMED).
            buffer_load: 0, // System 10 SYNCs this from current_occupancy every MINUTE/3 tick (CONSUMED).
            cleanliness_at_output: 0, // System 8 recomputes this every MINUTE/2 tick (CONSUMED).
          })
          .returning({ node_id: launderingNode.node_id });
        nodeId = inserted.node_id;
      }

      // (c) CREDIT the node's in-process cash via System 10's tail_risk_estimate row (current_occupancy += amount).
      // UPSERT: UPDATE the existing estimate (+ occupancy; re-pin capacity high + drain_rate 0), else INSERT a fresh
      // one at the injected amount. drain_rate=0 stops System 10's drain leak; capacity ≥ held cents stops its overflow
      // cap from dropping cash. System 10 lazy-create is NOT-EXISTS guarded, so these explicit values survive its ticks.
      const bumped = await tx
        .update(tailRiskEstimate)
        .set({
          current_occupancy: sql`${tailRiskEstimate.current_occupancy} + ${params.amountCents}`,
          capacity: params.capacityCents,
          drain_rate: 0,
        })
        .where(and(eq(tailRiskEstimate.player_id, playerId), eq(tailRiskEstimate.node_id, nodeId)))
        .returning({ node_id: tailRiskEstimate.node_id });
      if (bumped.length === 0) {
        await tx.insert(tailRiskEstimate).values({
          node_id: nodeId,
          player_id: playerId,
          capacity: params.capacityCents,
          drain_rate: 0,
          current_occupancy: params.amountCents,
          tail_p95_estimate: 0,
        });
      }

      // (d) WRITE the front-shop transaction_profile (System 7 CONSUMED — the deviation input its nightly tick scores).
      await tx
        .update(building)
        .set({ transaction_profile: params.transactionProfile })
        .where(and(eq(building.player_id, playerId), eq(building.building_id, params.front_shop_id)));

      return nodeId;
    });
  }

  // ───────────────────────────── clean-output tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL of a player's TERMINAL nodes whose cleaned cash is RELEASABLE this tick (Phase 2b — the
   * terminal-vs-routing rule; laundering_pipeline.md §Stage 4 — only the final/clean-holding stage credits the
   * wallet). A node is TERMINAL when it has NO outgoing laundering_edge (it is the end of its chain). The release gate
   * is UNCHANGED from T6: occupancy (tail_risk_estimates.current_occupancy — System 10's cash field) > 0 AND
   * cleanliness_at_output (System 8's recomputed float — CONSUMED, read not recomputed) >= cleanThreshold.
   *
   * BACKWARD-COMPATIBLE: T6's lone Stage-1 node has NO outgoing edge → it is terminal → it still releases exactly as
   * before (System 8 cleans the idle node to 1.0 ≥ 0.90). A multi-stage pipeline's Stage-1/2/3 nodes each HAVE an
   * outgoing edge → NOT terminal → they ROUTE (listRoutableHops), and only Stage-4 (terminal) releases here. The
   * stage_index filter T6 used is REPLACED by the topology filter (the documented Phase-2b rule). Ordered by node_id
   * for deterministic batching. Returns [] when no terminal node is ready (then the release phase is a no-op).
   */
  async listReleasableNodes(playerId: string, cleanThreshold: number): Promise<ReleasableNode[]> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        stage_index: launderingNode.stage_index,
        buffered_cents: sql<number>`round(${tailRiskEstimate.current_occupancy})::bigint`.as('buffered_cents'),
      })
      .from(launderingNode)
      .innerJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .where(
        and(
          eq(launderingNode.player_id, playerId),
          // TERMINAL = no outgoing edge (Phase 2b — replaces T6's stage_index=1; a lone Stage-1 node is terminal).
          sql`NOT EXISTS (
            SELECT 1 FROM ${launderingEdge} e
            WHERE e.player_id = ${playerId}::uuid AND e.from_node = ${launderingNode.node_id}
          )`,
          sql`${tailRiskEstimate.current_occupancy} > 0`,
          sql`${launderingNode.cleanliness_at_output} >= ${cleanThreshold}`,
        ),
      )
      .orderBy(launderingNode.node_id);
    // lot-4 TD-023: also filter by stage-derived cleanliness (pipelineCleanlinessForStage gate applied upstream in the
    // service — the repo exposes stage_index for the service to use as the per-stage guard).
    return rows
      .map((r) => ({ node_id: r.node_id, stage_index: Number(r.stage_index), buffered_cents: Number(r.buffered_cents) }))
      .filter((r) => r.buffered_cents > 0);
  }

  /**
   * Batch-read every NON-TERMINAL node's cash ready to route ONE hop downstream this tick (Phase 2b — the routing
   * input; laundering_pipeline.md §Stage 2 "il move au stage suivant" + §Vue d'ensemble node→node). A node is
   * routable when it HAS an outgoing laundering_edge AND its in-process cash (tail_risk_estimates.current_occupancy —
   * System 10's field) > 0. The buffered cents = round(current_occupancy) (a float4 integer < ~16.7M — exact). The
   * cleanliness GAIN is implicit in the downstream node's stage_index (derived, not stored — pipelineCleanlinessForStage)
   * so this read carries only the cash to move + the edge. Ordered by from_node for deterministic batching. A linear
   * chain has at most one outgoing edge per node; if a node had several, every hop is returned (set-based, idempotent
   * per (from,to)). Returns [] when nothing is routable (then the routing phase is a no-op).
   */
  async listRoutableHops(playerId: string): Promise<RoutableHop[]> {
    const rows = await this.db
      .select({
        from_node: launderingEdge.from_node,
        to_node: launderingEdge.to_node,
        buffered_cents: sql<number>`round(${tailRiskEstimate.current_occupancy})::bigint`.as('buffered_cents'),
      })
      .from(launderingEdge)
      .innerJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingEdge.from_node))
      .where(and(eq(launderingEdge.player_id, playerId), sql`${tailRiskEstimate.current_occupancy} > 0`))
      .orderBy(launderingEdge.from_node);
    return rows
      .map((r) => ({ from_node: r.from_node, to_node: r.to_node, buffered_cents: Number(r.buffered_cents) }))
      .filter((r) => r.buffered_cents > 0);
  }

  /**
   * Apply a batch of routing hops ATOMICALLY in ONE transaction (Phase 2b — set-based, NOT a per-row loop). For each
   * hop, the from-node is DRAINED to 0 and the to-node is CREDITED by the routed cents (= buffered − the per-hop
   * dwell-tax cut), conserving cash to the cent (the cut is RETAINED — consumed, never re-credited). Both the drain
   * and the credit are in ONE tx so a node is never drained without the next stage being credited (and vice-versa) —
   * cash conservation per hop. The cleanliness GAIN is NOT written here (it is derived from the to-node's stage_index;
   * System 8 owns the cleanliness_at_output float). All values are PARAMETERIZED bind params. NO RNG.
   */
  async applyRoutes(
    playerId: string,
    hops: Array<{ from_node: string; to_node: string; routed_cents: number }>,
  ): Promise<void> {
    if (hops.length === 0) return;
    await this.db.transaction(async (tx) => {
      // (a) DRAIN every from-node to 0 (the cash left it — it is either routed onward or retained as the cut).
      const fromRows = hops.map((h) => sql`(${h.from_node}::uuid)`);
      await tx.execute(sql`
        UPDATE ${tailRiskEstimate} AS t
        SET current_occupancy = 0, tail_p95_estimate = 0
        FROM (VALUES ${sql.join(fromRows, sql`, `)}) AS v(node_id)
        WHERE t.player_id = ${playerId}::uuid AND t.node_id = v.node_id
      `);

      // (b) CREDIT every to-node by the routed cents (buffered − the per-hop cut). Set-based `UPDATE ... FROM (VALUES)`
      // adding to the existing occupancy (a to-node could legitimately already hold buffered cash from a prior tick).
      const toRows = hops.map((h) => sql`(${h.to_node}::uuid, ${h.routed_cents}::numeric)`);
      await tx.execute(sql`
        UPDATE ${tailRiskEstimate} AS t
        SET current_occupancy = t.current_occupancy + v.routed_cents
        FROM (VALUES ${sql.join(toRows, sql`, `)}) AS v(node_id, routed_cents)
        WHERE t.player_id = ${playerId}::uuid AND t.node_id = v.node_id
      `);
    });
  }

  /**
   * Apply a batch of clean-output releases ATOMICALLY in ONE transaction (the persisted-system template — set-based,
   * NOT a per-row loop):
   *   (a) CREDIT economy_states.cash_cents by the SUM of the per-node clean cents (the laundered output reaching the
   *       wallet — laundering_pipeline.md §Stage 4). ONE UPDATE on the player's wallet row.
   *   (b) ZERO each released node's in-process cash (tail_risk_estimates.current_occupancy — System 10's cash field;
   *       the buffer_load re-syncs to 0 on System 10's next tick) — ONE set-based `UPDATE ... FROM (VALUES …)` keyed by
   *       node_id. Both mutations are in ONE tx so the node is never zeroed without the wallet being credited (and
   *       vice-versa) — cash conservation. All values are PARAMETERIZED bind params. NO RNG.
   */
  async applyReleases(
    playerId: string,
    releases: Array<{ node_id: string; clean_cents: number }>,
  ): Promise<void> {
    if (releases.length === 0) return;
    const totalClean = releases.reduce((acc, r) => acc + r.clean_cents, 0);
    await this.db.transaction(async (tx) => {
      // (a) Credit the wallet by the total cleaned cents (the clean cash reaching economy_states.cash_cents).
      if (totalClean > 0) {
        await tx
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} + ${totalClean}` })
          .where(eq(economyState.player_id, playerId));
      }

      // (b) Zero each released node's in-process cash (tail_risk_estimates.current_occupancy — System 10's cash field;
      // System 10 re-syncs laundering_nodes.buffer_load to 0 on its next MINUTE/3 tick). Set-based, keyed by node_id.
      const nodeRows = releases.map((r) => sql`(${r.node_id}::uuid)`);
      await tx.execute(sql`
        UPDATE ${tailRiskEstimate} AS t
        SET current_occupancy = 0, tail_p95_estimate = 0
        FROM (VALUES ${sql.join(nodeRows, sql`, `)}) AS v(node_id)
        WHERE t.player_id = ${playerId}::uuid AND t.node_id = v.node_id
      `);
    });
  }

  // ───────────────────────────── projection reads (Step 4) ─────────────────────────────

  /**
   * The Stage-1 node identified by (player, node_id) + the host front-shop's persisted audit pin — the projection's
   * raw INPUT (mapped to BANDS by the projection, NEVER forwarded raw; R2.2). cleanliness_at_output is System 8's
   * float; audit_pin_expires_at is System 7's persisted pin (on the node's host front-shop building). Returns null
   * when the node is not the player's (or not a Stage-1 node) — the controller 404s.
   */
  async getNodeProjectionInput(
    playerId: string,
    nodeId: string,
  ): Promise<{
    node_id: string;
    buffer_load: number;
    cleanliness_at_output: number;
    audit_pin_expires_at: Date | null;
  } | null> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        buffer_load: launderingNode.buffer_load,
        cleanliness_at_output: launderingNode.cleanliness_at_output,
        audit_pin_expires_at: building.audit_pin_expires_at,
      })
      .from(launderingNode)
      .innerJoin(building, eq(building.building_id, launderingNode.building_id))
      .where(
        and(
          eq(launderingNode.player_id, playerId),
          eq(launderingNode.node_id, nodeId),
          eq(launderingNode.stage_index, 1),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The ORDERED nodes of the pipeline that contains `nodeId` (Phase 2b — the pipeline-overview projection input;
   * laundering_pipeline.md §Implications Unity "Cleanliness journey indicator — barre qualitative par-pipeline montrant
   * cleanliness_bucket du cash dans chaque stage"). Returns every node of the player's chain in stage order, each with
   * its stage_index + a terminal flag + its raw occupancy (mapped to a presence flag by the projection — NEVER
   * surfaced raw; R2.2). Walks the linear chain from the given node both upstream (follow incoming edges to the head)
   * and downstream (follow outgoing edges to the tail) via a recursive CTE over laundering_edges, player-scoped.
   * Returns [] when the node is not the player's.
   *
   * The chain is LINEAR (Phase 2b — parallel branches DEFERRED), so the recursive walk over from_node/to_node yields a
   * simple ordered list; ORDER BY stage_index makes the head→tail ordering explicit regardless of insert order.
   */
  /**
   * LOT PLANQUE C3 — ALL of the player's laundering nodes, ordered by stage_index. The RE-DISCOVERY read: `inject`
   * returns a `node_id` ONCE, and nothing replayed it — a screen reopened the next day was blind (design §2.a, B8,
   * measured at ZERO upstream routes). Player-scoped by `player_id`; returns the ids + `stage_index` + the
   * occupancy the projection turns into a presence flag. NEVER the raw cents (R2.2 — the projection derives the
   * band; this repository stays a typed read, exactly like `getPipelineNodes` above).
   */
  async listOwnedNodes(playerId: string): Promise<PipelineOverviewNode[]> {
    const rows = await this.db
      .select({
        node_id: launderingNode.node_id,
        stage_index: launderingNode.stage_index,
        occupancy_cents: sql<number>`coalesce(${tailRiskEstimate.current_occupancy}, 0)`.as('occupancy_cents'),
        outgoing: sql<number>`(SELECT count(*) FROM ${launderingEdge} WHERE ${launderingEdge.from_node} = ${launderingNode.node_id})`.as('outgoing'),
      })
      .from(launderingNode)
      .leftJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .where(eq(launderingNode.player_id, playerId))
      .orderBy(launderingNode.stage_index);
    return rows.map((r) => ({
      node_id: r.node_id,
      stage_index: r.stage_index,
      is_terminal: Number(r.outgoing) === 0,
      occupancy_cents: Number(r.occupancy_cents),
    }));
  }

  async getPipelineNodes(playerId: string, nodeId: string): Promise<PipelineOverviewNode[]> {
    // Confirm the node is the player's first (the controller 404s on null/empty).
    const anchor = await this.db
      .select({ node_id: launderingNode.node_id })
      .from(launderingNode)
      .where(and(eq(launderingNode.player_id, playerId), eq(launderingNode.node_id, nodeId)))
      .limit(1);
    if (anchor.length === 0) return [];

    // Recursive CTE: from the anchor node, walk edges in BOTH directions (downstream via from_node→to_node, upstream
    // via to_node→from_node) to collect every node of the linear chain (player-scoped). A recursive CTE allows exactly
    // ONE recursive term, so the two directions are combined into a SINGLE recursive SELECT: join chain to an edge on
    // EITHER endpoint and take the OTHER endpoint. UNION dedups; the chain is finite + acyclic (a DAG built by
    // addStage), so the recursion terminates. Then join the node rows + a terminal flag, ordered by stage_index.
    const rows = await this.db.execute<{
      node_id: string;
      stage_index: number;
      is_terminal: boolean;
      occupancy_cents: number;
    }>(sql`
      WITH RECURSIVE chain(node_id) AS (
        SELECT ${nodeId}::uuid
        UNION
        SELECT (CASE WHEN e.from_node = c.node_id THEN e.to_node ELSE e.from_node END)
          FROM ${launderingEdge} e
          JOIN chain c ON (e.from_node = c.node_id OR e.to_node = c.node_id)
          WHERE e.player_id = ${playerId}::uuid
      )
      SELECT
        ln.node_id AS node_id,
        ln.stage_index AS stage_index,
        NOT EXISTS (
          SELECT 1 FROM ${launderingEdge} oe
          WHERE oe.player_id = ${playerId}::uuid AND oe.from_node = ln.node_id
        ) AS is_terminal,
        COALESCE(round(tre.current_occupancy), 0)::bigint AS occupancy_cents
      FROM chain c
      JOIN ${launderingNode} ln ON ln.node_id = c.node_id AND ln.player_id = ${playerId}::uuid
      LEFT JOIN ${tailRiskEstimate} tre ON tre.node_id = ln.node_id
      ORDER BY ln.stage_index, ln.node_id
    `);
    const list = (rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown as unknown[]);
    return (list as Array<Record<string, unknown>>).map((r) => ({
      node_id: String(r.node_id),
      stage_index: Number(r.stage_index),
      is_terminal: Boolean(r.is_terminal),
      occupancy_cents: Number(r.occupancy_cents),
    }));
  }
}

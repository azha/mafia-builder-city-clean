// IMPLEMENTS: docs/tech/04_city_simulation/system_10_buffer_bloat.md
//             §Invariant 5 (load_pct_bucket = BufferLoadBucket enum, JAMAIS le float current_occupancy) + §Inv 7
//                          (tail_percentile_state = TailPercentileState enum, jamais le float tail_p95 brut)
//             §Inv 3 (le dashboard "moyen" reste stable pendant que le buffer grandit en silence — la projection
//                     expose le BUCKET, qui révèle la croissance silencieuse, pas la moyenne trompeuse)
//             §Player interaction surface (pipeline node badge BufferLoadBucket, tail-risk panel TailPercentileState
//                                          histogram qualitatif, overflow "cash exposé" badge ; PAS d'exposition de
//                                          current_occupancy / tail_p95 / overflow_amount / cash bruts)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// `BufferBloatProjectionService` — the player-facing projection for System 10 (the pipeline node badges + the
// tail-risk panel). Maps the RAW per-node buffer state (current_occupancy / capacity / tail_p95_estimate floats +
// the in-memory overflow flag) → a QUALITATIVE payload: a per-DISTRICT load band + tail-risk band + the
// tail-risk-panel-visible default + per-NODE { BufferLoadBucket, TailPercentileState, overflow flag, stage_index }.
//
// INV 5 / INV 7 / INV 3 / R2.2 — NO RAW OCCUPANCY / P95 FLOAT / CASH ESCAPES: the only fields are `district` (an
// identity string), `district_load_band` + `district_tail_band` (closed-domain strings), `tail_risk_panel_visible`
// + `any_overflow` (the district-summary booleans), and `nodes[]` of { stage_index (a structural pipeline-position
// IDENTITY — a small int, NOT a sim scalar, echoed like building/district), load_bucket (closed-domain string),
// tail_percentile_state (closed-domain string), overflow_active (the ONE per-node player-facing boolean — the
// "cash exposé" badge, P5) }. NEVER the raw current_occupancy / capacity / tail_p95 float, the overflow_amount
// cash, the drain_rate, or a count. The E2E scans the payload recursively and rejects ANY numeric leaf except the
// structural stage_index identity; strings + booleans (+ the stage_index int) only.
//
// INV 3 — THE DECEPTIVE-AVERAGE LESSON (surfaced): the spec's design lesson is that the player-facing "average"
// metrics stay stable while the buffer silently grows. The projection deliberately does NOT carry an average — it
// carries the BUCKET (which reveals the silent growth: a buffer creeping toward CRITICAL shows as the band climbing
// EMPTY → LOW → NOMINAL → HIGH → CRITICAL even while a hypothetical "average throughput" would look flat). So the
// projection IS the antidote to the deceptive dashboard: the band exposes what the average hides.
//
// DISTRICT-LEVEL BANDS (the high-altitude signal): district_load_band = the MAX BufferLoadBucket over the district's
// nodes (the district is as exposed as its fullest buffer); district_tail_band = the MAX TailPercentileState. any_overflow
// = the district-summary OR over the per-node overflow flags.
//
// TAIL-RISK PANEL VISIBILITY (Inv 4): tail_risk_panel_visible is the STATIC default from
// tail_risk_panel_default_visibility (off day-1 — the player learns by catastrophe; GDD §System 10 §Premise). The
// per-player sticky auto-unlock (first CRITICAL event) is P2 (no persisted panel-state column day-1 — documented in
// the tunables header); day-1 the panel-visible flag is the registry default for every player.
//
// PHASE-1 SHAPE: laundering nodes are P2 entities (the laundering_nodes table is empty organically), so a normal
// Phase-1 projection is `{ district, district_load_band: 'EMPTY', district_tail_band: 'LOW', tail_risk_panel_visible:
// false, any_overflow: false, nodes: [] }`. The E2E seeds a building + nodes to populate it.

import { Injectable } from '@nestjs/common';

import type { BufferLoadBucket, TailPercentileState } from '../events/city-event-bus';
import { bufferBloatTunables } from './buffer-bloat-tunables';
import { BufferBloatService } from './buffer-bloat.service';

/** Ordinal rank of a load bucket (for the district-level MAX aggregate — EMPTY < LOW < NOMINAL < HIGH < CRITICAL). */
const LOAD_BUCKET_RANK: Record<BufferLoadBucket, number> = {
  EMPTY: 0,
  LOW: 1,
  NOMINAL: 2,
  HIGH: 3,
  CRITICAL: 4,
};
const LOAD_BUCKET_BY_RANK: BufferLoadBucket[] = ['EMPTY', 'LOW', 'NOMINAL', 'HIGH', 'CRITICAL'];

/** Ordinal rank of a tail band (for the district-level MAX aggregate — LOW < MODERATE < HIGH < CRITICAL). */
const TAIL_STATE_RANK: Record<TailPercentileState, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};
const TAIL_STATE_BY_RANK: TailPercentileState[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

/** The per-node qualitative buffer state (the pipeline-node badge — never the raw occupancy/p95/cash float). */
export interface BufferNodeProjection {
  /**
   * The node's pipeline position (a structural identity — like the building/district identity echoes), NOT a sim
   * scalar. It is the ONE small-int leaf the projection carries so the client can order/lay-out the pipeline diagram.
   * Never a raw occupancy/cash value.
   */
  stage_index: number;
  /** The qualitative buffer-load bucket (EMPTY/LOW/NOMINAL/HIGH/CRITICAL — never the raw occupancy float; Inv 5). */
  load_bucket: BufferLoadBucket;
  /** The qualitative tail-risk band (LOW/MODERATE/HIGH/CRITICAL — never the raw tail_p95 float; Inv 7). */
  tail_percentile_state: TailPercentileState;
  /** The overflow badge (binary — the ONE per-node player-facing boolean; never the raw overflow_amount cash; Inv 1/5). */
  overflow_active: boolean;
}

/**
 * The PLAYER-FACING per-district buffer projection (the pipeline node badges + the tail-risk panel). A per-district
 * load band + tail-risk band + the tail-risk-panel-visible default + a district-summary overflow flag + per-node
 * { BufferLoadBucket, TailPercentileState, overflow } — NO raw occupancy/p95/cash float. The Unity pipeline diagram
 * + tail-risk panel map these CLIENT-SIDE.
 */
export interface DistrictBufferProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative district-level buffer-load band (the MAX over the district's node buffers — Inv 5). */
  district_load_band: BufferLoadBucket;
  /** The qualitative district-level tail-risk band (the MAX over the district's node tail states — Inv 7). */
  district_tail_band: TailPercentileState;
  /** Whether the tail-risk panel is visible (Inv 4 — the static default day-1; per-player sticky unlock is P2). */
  tail_risk_panel_visible: boolean;
  /** Whether at least one node in the district overflowed this period (the district-summary "cash exposé" flag). */
  any_overflow: boolean;
  /** The laundering-node buffers in this district + their qualitative BufferLoadBucket / TailPercentileState / overflow. */
  nodes: BufferNodeProjection[];
}

@Injectable()
export class BufferBloatProjectionService {
  constructor(private readonly buffer: BufferBloatService) {}

  /**
   * Project a player's buffer state for ONE district → a fully-qualitative payload. Reads the district's node buffers
   * from the service (the raw floats are the INPUT but NEVER forwarded — Inv 5 / Inv 7 / R2.2), derives each node's
   * BufferLoadBucket / TailPercentileState / overflow flag (from the raw floats + the in-memory overflow flag), and
   * the district-level MAX load + tail bands + the summary overflow flag + the panel-visible default. Returns the
   * payload for a VALID, EXISTING district even with no nodes (an empty per-district shape — the organic Phase-1
   * reality); the controller 404s only for a non-existent district.
   */
  async projectDistrict(playerId: string, districtId: number): Promise<DistrictBufferProjection> {
    const nodes = await this.buffer.listNodesForDistrict(playerId, districtId);

    let maxLoadRank = 0; // EMPTY — the floor for an empty district (no buffer).
    let maxTailRank = 0; // LOW — the floor for an empty district (no tail risk).
    let anyOverflow = false;

    const projectedNodes: BufferNodeProjection[] = nodes.map((n) => {
      const capacity = n.capacity ?? bufferBloatTunables.bufferCapacityPerNode;
      const occupancy = n.current_occupancy ?? 0;
      const tailP95 = n.tail_p95_estimate ?? this.buffer.tailP95Estimate(occupancy, capacity);
      const overflowed = this.buffer.overflowedThisPeriodFor(playerId, n.node_id);

      // Derive the buckets/flag from the raw floats HERE; the floats do not leave this method (R2.2).
      const loadBucket = this.buffer.loadBucket(occupancy, capacity, overflowed);
      const tailState = this.buffer.tailPercentileState(tailP95);

      const loadRank = LOAD_BUCKET_RANK[loadBucket];
      if (loadRank > maxLoadRank) maxLoadRank = loadRank;
      const tailRank = TAIL_STATE_RANK[tailState];
      if (tailRank > maxTailRank) maxTailRank = tailRank;
      if (overflowed) anyOverflow = true;

      return {
        // stage_index is a structural identity echo (the pipeline position), not a sim scalar.
        stage_index: n.stage_index,
        load_bucket: loadBucket,
        tail_percentile_state: tailState,
        overflow_active: overflowed,
      };
    });

    return {
      district: `district-${districtId}`,
      district_load_band: LOAD_BUCKET_BY_RANK[maxLoadRank],
      district_tail_band: TAIL_STATE_BY_RANK[maxTailRank],
      // Inv 4 — the static default day-1 (off = learn-by-catastrophe); per-player sticky unlock is P2 (see headers).
      tail_risk_panel_visible: bufferBloatTunables.tailRiskPanelDefaultVisibility === 'on',
      any_overflow: anyOverflow,
      nodes: projectedNodes,
    };
  }
}

// IMPLEMENTS: docs/tech/04_city_simulation/system_8_dwell_time_tax.md
//             §Invariant 5 (ThroughputBucket = enum composite, JAMAIS float exposé) + §Invariant 6
//                          (cleanliness_at_output qualitative, jamais le float [0,1] brut)
//             §Player interaction surface (pipeline diagram: input rate qualitatif UNDER/NOMINAL/OVER/OVERFLOW,
//                                          output cleanliness icône qualitative, overflow badge ; PAS d'exposition
//                                          de inventory_at_risk_global ni des floats bruts ni du raw cash)
//             §Player interaction surface §"Speed / Volume / Exposure" widget (l'exposure band qualitatif)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// `DwellTimeProjectionService` — the player-facing projection for System 8 (the "Speed / Volume / Exposure"
// widget + the pipeline diagram). Maps the RAW per-node laundering state (throughput_in_per_hour / dwell_time_hours
// / buffer_load / cleanliness_at_output floats) → a QUALITATIVE payload: a per-DISTRICT exposure band +
// network-cleanliness band + per-NODE { ThroughputBucket, CleanlinessBucket, overflow flag }.
//
// INV 5 / INV 6 / R2.2 — NO RAW THROUGHPUT / DWELL / CLEANLINESS FLOAT / RAW CASH ESCAPES: the only fields are
// `district` (an identity string), `exposure_band` + `network_cleanliness` (closed-domain strings), and `nodes[]`
// of { stage_index (a structural pipeline-position IDENTITY — a small int 1..pipeline_depth_stages, NOT a sim
// scalar, echoed like building/district), throughput_bucket (closed-domain string), cleanliness_bucket
// (closed-domain string), overflow_active (the ONE permitted boolean — the overflow badge, P5 player-facing) }.
// NEVER the raw throughput/dwell/cleanliness float, the raw buffer_load, the raw cash, inventory_at_risk_global,
// risk_signature, or a count. The E2E scans the payload recursively and rejects ANY numeric leaf except the
// structural stage_index identity; booleans + strings (+ the stage_index int) only.
//
// EXPOSURE BAND (the "Exposure" vertex of the Speed/Volume/Exposure triangle, §Player interaction surface): the
// per-district exposure band IS the qualitative inventory_at_risk_global (Inv 4 — the player never sees the raw
// scalar, only the band). It is a NETWORK-level scalar (per-player), surfaced under the district the player is
// viewing — the network the player operates is one network; the band is the same for every district view of that
// player (the spec's inventory_at_risk_global is per-network, not per-district). Documented so the per-district
// endpoint's network-level band is not mistaken for a per-district recomputation.
//
// PHASE-1 SHAPE: laundering nodes are P2 entities (the laundering_nodes table is empty organically), so a normal
// Phase-1 projection is `{ district, exposure_band: 'MINIMAL', network_cleanliness: 'CLEAN', nodes: [] }`. The E2E
// seeds a building + nodes to populate it — exercising the bucket/band surface against real persisted floats.

import { Injectable } from '@nestjs/common';

import type { ThroughputBucket, CleanlinessBucket, ExposureBand } from '../events/city-event-bus';
import { DwellTimeService } from './dwell-time.service';

/** The per-node qualitative state (the pipeline-diagram node card — never the raw throughput/dwell/cleanliness float). */
export interface ThroughputNodeProjection {
  /**
   * The node's pipeline position (1..pipeline_depth_stages — DB-bounded 0..4). A STRUCTURAL IDENTITY (like the
   * building/district identity echoes), NOT a sim scalar — it is the ONE small-int leaf the projection carries so
   * the client can order/lay-out the pipeline diagram. Never a raw throughput/cash value.
   */
  stage_index: number;
  /** The qualitative input-rate bucket (UNDER/NOMINAL/OVER/OVERFLOW — never the raw throughput float; Inv 5). */
  throughput_bucket: ThroughputBucket;
  /** The qualitative output-cleanliness bucket (DIRTY/PARTIAL/MOSTLY_CLEAN/CLEAN — never the raw [0,1] float; Inv 6). */
  cleanliness_bucket: CleanlinessBucket;
  /** The overflow badge (binary — the ONE player-facing boolean; never the raw surplus / buffer float; Inv 7). */
  overflow_active: boolean;
}

/**
 * The PLAYER-FACING per-district throughput projection (the Speed/Volume/Exposure widget + pipeline diagram). A
 * per-district network exposure band + network-cleanliness band + per-node { ThroughputBucket, CleanlinessBucket,
 * overflow } — NO raw throughput/dwell/cleanliness float, NO raw cash, NO inventory_at_risk_global. The Unity
 * pipeline diagram maps these CLIENT-SIDE.
 */
export interface DistrictThroughputProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative network exposure band (the "Exposure" vertex — the inventory_at_risk_global mapped to a band). */
  exposure_band: ExposureBand;
  /** The qualitative throughput-weighted network-cleanliness band (never the raw float). */
  network_cleanliness: CleanlinessBucket;
  /** The laundering nodes in this district + their qualitative ThroughputBucket / CleanlinessBucket / overflow. */
  nodes: ThroughputNodeProjection[];
}

@Injectable()
export class DwellTimeProjectionService {
  constructor(private readonly dwell: DwellTimeService) {}

  /**
   * Project a player's throughput/pipeline state for ONE district → a fully-qualitative payload. Reads the district's
   * laundering nodes from the service (the raw floats are the INPUT but NEVER forwarded — Inv 5 / Inv 6 / R2.2),
   * derives each node's ThroughputBucket / CleanlinessBucket / overflow flag, and the network-level exposure +
   * cleanliness bands (the per-player network aggregate). Returns the payload for a VALID, EXISTING district even
   * with no nodes (an empty per-district shape — the organic Phase-1 reality); the controller 404s only for a
   * non-existent district.
   */
  async projectDistrict(playerId: string, districtId: number): Promise<DistrictThroughputProjection> {
    const nodes = await this.dwell.listNodesForDistrict(playerId, districtId);

    const projectedNodes: ThroughputNodeProjection[] = nodes.map((n) => ({
      // stage_index is a structural identity echo (the pipeline position), not a sim scalar.
      stage_index: n.stage_index,
      // Derive the buckets/flag from the raw floats HERE; the floats do not leave this method (R2.2).
      throughput_bucket: this.dwell.throughputBucket(n.throughput_in_per_hour, n.buffer_load),
      cleanliness_bucket: this.dwell.cleanlinessBucket(n.cleanliness_at_output),
      overflow_active: this.dwell.overflowActive(n.buffer_load),
    }));

    return {
      district: `district-${districtId}`,
      // The exposure + network-cleanliness bands are NETWORK-level (per-player) — see the file header.
      exposure_band: this.dwell.exposureBandFor(playerId),
      network_cleanliness: this.dwell.networkCleanlinessBandFor(playerId),
      nodes: projectedNodes,
    };
  }
}

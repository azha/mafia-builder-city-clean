// IMPLEMENTS: docs/tech/04_city_simulation/system_1_flow_cells.md §invariant 4 (BackpressureBucket, jamais
//             float exposé) + §P5 (le joueur voit la heatmap ρ, pas λ/μ bruts)
//             + docs/tech/04b_combat_and_conflict/ui_surfaces_conflict.md §NestJS — backend jeu
//             (the `*ProjectionService` raw→bucket P5-filtering pattern)
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// `FlowCellsProjectionService` — the P5 projection layer for System 1. This is the REFERENCE PROJECTION
// PATTERN T3–T12 copy: a `*ProjectionService` that maps RAW per-block simulation state → a QUALITATIVE
// bucket the player is allowed to see (R2.2 INVERTED — the client NEVER receives raw scalars/counts/floats,
// only a closed qualitative domain; P5 information asymmetry).
//
// AGGREGATION (per-block → per-DISTRICT): the player-facing observable is a per-DISTRICT bucket (one bucket
// for the whole district), not a per-block dump. We aggregate the district's block buckets by their WORST
// (highest-pressure) bucket: a district reads SATURATED if ANY block is saturated, else CONGESTED if any is
// congested, else NORMAL. This matches the player-facing heatmap intuition (a district "feels" as congested
// as its hottest block) and — critically — leaks NO count (we do NOT report "k of n blocks congested";
// that would be a raw scalar). A never-ticked player (empty grid) → NORMAL baseline.

import { Injectable } from '@nestjs/common';

import { FlowCellsService } from './flow_cells.service';
import { BackpressureBucket } from '../events/city-event-bus';

/**
 * The PLAYER-FACING flow projection for a district (R2.2 inverted). The ONLY fields are the echoed district
 * identity + the qualitative bucket — NO ρ, NO λ/μ, NO population, NO block counts. The Unity heatmap maps
 * the bucket → one of its 4 canonical colours CLIENT-SIDE (system_1_flow_cells.md §Unity); the server emits
 * only the bucket.
 */
export interface DistrictFlowProjection {
  district_id: number;
  /** Qualitative backpressure bucket — the worst-block aggregate of the district (P5; never a float). */
  backpressure: BackpressureBucket;
}

@Injectable()
export class FlowCellsProjectionService {
  constructor(private readonly flowCells: FlowCellsService) {}

  /**
   * Project a district's flow state for a player → a single qualitative bucket. Aggregates the district's
   * per-block buckets by WORST-bucket (max pressure). Returns NORMAL for a never-ticked player / a district
   * with no accumulated flow. The caller (controller) is responsible for the unknown-district 404; this
   * method assumes a valid, seeded district id.
   */
  projectDistrictFlow(playerId: string, districtId: number): DistrictFlowProjection {
    const blockBuckets = this.flowCells.districtCellBuckets(playerId, districtId);
    return {
      district_id: districtId,
      backpressure: this.worstBucket(blockBuckets),
    };
  }

  /** WORST (highest-pressure) bucket of a set — the district "feels" as hot as its hottest block. */
  private worstBucket(buckets: BackpressureBucket[]): BackpressureBucket {
    let worst = BackpressureBucket.NORMAL;
    for (const b of buckets) {
      if (b === BackpressureBucket.SATURATED) return BackpressureBucket.SATURATED; // can't get worse.
      if (b === BackpressureBucket.CONGESTED) worst = BackpressureBucket.CONGESTED;
    }
    return worst;
  }
}

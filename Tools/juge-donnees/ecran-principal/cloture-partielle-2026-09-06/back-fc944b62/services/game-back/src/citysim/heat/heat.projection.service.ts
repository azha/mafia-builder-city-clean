// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md
//             §Invariant 1 (R2.2 STRICT — `heat` is NEVER a float scalar exposed to the player; only the HeatBucket
//                          enum COLD/WARM/HOT/BURNING overlay)
//             §Invariant 2 (heat = a cross-system SIGNAL, not an HP bar — the projection surfaces the band, the
//                          effect is mediated by other systems)
//             §Invariant 3 (per-entity 3 granularities: building / district / citywide — the projection carries all
//                          three as buckets)
//             §Invariant 7 (citywide aggregate = qualitative peak bucket, never a float sum)
//             §Player interaction surface (heat map overlay = HeatBucket badge per building + district + citywide;
//                                          NO heat_value_internal / decay_factor / threshold exposed)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatProjectionService` — the player-facing projection for System Heat (the heat map overlay). Maps the RAW
// per-building heat float (buildings.heat [0..1]) + the in-memory district/citywide aggregates → a QUALITATIVE
// payload: a per-DISTRICT HeatBucket + the citywide aggregate HeatBucket + the district escalation flag + per-BUILDING
// { HeatBucket }.
//
// INV 1 / INV 2 / INV 7 / R2.2 — NO RAW HEAT FLOAT ESCAPES: the only fields are `district` (an identity string),
// `district_bucket` + `citywide_bucket` (closed-domain HeatBucket strings), `escalated` (the district-escalation
// boolean), and `buildings[]` of { heat_bucket (closed-domain string) }. NEVER the raw buildings.heat float, the
// decay_factor, the propagation factor, or the escalation threshold. The E2E scans the payload recursively and
// rejects ANY numeric leaf at all — heat is PURELY qualitative (unlike buffer's structural stage_index, there is no
// numeric identity to allow here; a building identity would be a uuid string, not a number).
//
// THREE GRANULARITIES (Inv 3): district_bucket = the in-memory PEAK building bucket for the district (the district is
// as hot as its hottest building); citywide_bucket = the in-memory PEAK district bucket; buildings[] = the per-building
// band derived from buildings.heat HERE (the float is the INPUT but NEVER forwarded). The escalated flag is the Inv 6
// HeatEscalationEvent side-effect (a building crossed the threshold this tick).
//
// PHASE-1 SHAPE: buildings are P2 entities (the buildings table is empty organically), so a normal Phase-1 projection
// is `{ district, district_bucket: 'COLD', citywide_bucket: 'COLD', escalated: false, buildings: [] }`. The E2E seeds
// player-owned operational buildings with heat values to populate it.

import { Injectable } from '@nestjs/common';

import type { HeatBucket } from '../events/city-event-bus';
import { HeatPropagationService } from './heat-propagation.service';
import { nomDeDistrict } from '../../citysim/world/district-names';
import type { I18nRef } from '../../common/i18n-ref'; // C3 (D7) — name_i18n's type.
import { buildingNameRef, buildingTypeFromRawInt, rankByTypeAndBlock } from '../../common/fiction-names'; // C3 (D7)

/** The per-building qualitative heat state (the map overlay badge — never the raw heat float; Inv 1 / R2.2). */
export interface BuildingHeatProjection {
  /** The building identity (a uuid string — echoed for the client's overlay; NOT a sim scalar). */
  building: string;
  /** The qualitative HeatBucket (COLD/WARM/HOT/BURNING — never the raw heat float; Inv 1 / R2.2). */
  heat_bucket: HeatBucket;
  /**
   * C3 (D7, L0.5) — the derived fiction name (buildings have no `name` column). `buildingNameRef` fed by
   * `HeatPropagationService.listBuildingsForRanking` (ALL the player's non-demolished buildings in this
   * district — an UNFILTERED sibling read, so the SAME building ranks identically here and on
   * `building/:id`/`interior`, never just the heat-relevant OPERATIONAL subset this file's own `buildings[]`
   * is scoped to).
   */
  name_i18n: I18nRef;
}

/**
 * The PLAYER-FACING per-district heat projection (the heat map overlay). A per-district HeatBucket + the citywide
 * aggregate HeatBucket + the district escalation flag + per-building { HeatBucket } — NO raw heat float. The Unity
 * heat overlay maps these CLIENT-SIDE (badge + icon — F2; never colour alone).
 */
export interface DistrictHeatProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative district-level HeatBucket (the PEAK over the district's buildings — Inv 3/7). */
  district_bucket: HeatBucket;
  /** The qualitative citywide aggregate HeatBucket (the PEAK over the player's districts — Inv 7). */
  citywide_bucket: HeatBucket;
  /** Whether the district escalated on the last tick (a building ≥ threshold — the HeatEscalationEvent side-effect). */
  escalated: boolean;
  /** The OPERATIONAL buildings in this district + their qualitative HeatBucket (never the raw heat float; R2.2). */
  buildings: BuildingHeatProjection[];
}

@Injectable()
export class HeatProjectionService {
  constructor(private readonly heat: HeatPropagationService) {}

  /**
   * Project a player's heat state for ONE district → a fully-qualitative payload. Reads the district's buildings
   * from the service (the raw heat floats are the INPUT but NEVER forwarded — Inv 1 / R2.2), derives each building's
   * HeatBucket, and the district-level + citywide PEAK buckets + the escalation flag from the in-memory aggregates.
   * Returns the payload for a VALID district even with no buildings (a COLD empty per-district shape — the organic
   * Phase-1 reality).
   */
  async projectDistrict(playerId: string, districtId: number): Promise<DistrictHeatProjection> {
    const [buildings, rankingRows] = await Promise.all([
      this.heat.listBuildingsForDistrict(playerId, districtId),
      // C3 (D7) — the `rankByTypeAndBlock` INPUT (unfiltered by operational status — see
      // `listBuildingsForRanking`'s own header).
      this.heat.listBuildingsForRanking(playerId, districtId),
    ]);
    const ranks = rankByTypeAndBlock(rankingRows);

    const projectedBuildings: BuildingHeatProjection[] = buildings.map((b) => ({
      building: b.building_id,
      // Derive the bucket from the raw heat float HERE; the float does not leave this method (R2.2).
      heat_bucket: this.heat.bucketName(b.heat),
      // C3 (D7) — the derived fiction name. `ranks.get(...)` should always hit: `b` came from the SAME
      // player/district as `rankingRows`, and `listBuildingsForRanking` is a SUPERSET (unfiltered by
      // operational status) of `listBuildingsForDistrict`'s own OPERATIONAL-only scope.
      // r2-C3/m3-r2, corrected r3-C3/M1-r3 — this `?? 1` stays PLAUSIBLE (not `real-estate.projection
      // .service.ts`'s `?? 0` sentinel, M1's fix for a REACHABLE gap there): `structural_state !=
      // 'demolished'` (the ranking filter) is a strict SUPERSET of `= 'operational'` (`b`'s own source
      // query, `listBuildingsForDistrict`) — no `b` can ever be outside `rankingRows`'s population,
      // verified by the two WHERE clauses, not merely argued. That superset relationship is the ONLY
      // valid justification for leaving this `?? 1` un-hardened — it is sufficient on its own.
      //
      // r3-C3/M1-r3 — a prior version of this comment cited the r2-C3 review's mutation
      // (`const ranks = new Map()`, forcing every lookup to miss) as proof the fallback is "provably
      // unreachable". That reading is backwards: forcing the map empty makes `?? 1` FIRE for every
      // building (measured: 4/4), so the mutation demonstrates the branch CAN execute, not that it
      // can't. What the mutation actually shows — and what a future author needs to know — is that
      // NO falsifiable in this repo would notice if it fired with the wrong value: the starter kit's
      // heat-visible buildings are 4 partitions of ONE member each, and a partition of one always
      // ranks 1 regardless of which population fed it. The moteur file that dimensions a 2-member
      // partition (`l0_c3_rank_partition.engine.spec.ts`) never calls the heat route — `heat` appears
      // there exactly once, inside a comment. No test in this repo can observe a rank ≠ 1 on this
      // surface. (The earlier claim that the type system "already gives" falsifiability here was also
      // false — `Map.get` returns `number | undefined`, and `?? 1` silently absorbs the `undefined`
      // case; TypeScript enforces that the expression TYPE-CHECKS, never that `1` is the right VALUE.)
      name_i18n: buildingNameRef({
        building_type: buildingTypeFromRawInt(b.building_type),
        district_id: b.district_id,
        district_name: nomDeDistrict(b.district_id), // P4 item 2
        block_id: b.block_id,
        rank: ranks.get(b.building_id) ?? 1,
        building_id: b.building_id, // P4 item 3 — l'enseigne
      }),
    }));

    return {
      district: `district-${districtId}`,
      // The in-memory PEAK district bucket (rebuilt each tick). Fall back to the per-building peak the live read
      // shows if the aggregate has not been computed yet (e.g. a building seeded but not yet ticked) so the read is
      // never staler than the persisted heat.
      district_bucket: this.peakBucket(playerId, districtId, projectedBuildings),
      citywide_bucket: this.heat.getCitywideBucket(playerId),
      escalated: this.heat.isDistrictEscalated(playerId, districtId),
      buildings: projectedBuildings,
    };
  }

  /**
   * The district PEAK HeatBucket (Inv 3/7). Prefers the in-memory aggregate (the authoritative tick result); if the
   * district has buildings whose freshly-derived buckets exceed the cached aggregate (a seeded-not-yet-aggregated
   * edge), takes the higher — the read is never staler than the persisted heat. The qualitative peak only (R2.2).
   */
  private peakBucket(playerId: string, districtId: number, buildings: BuildingHeatProjection[]): HeatBucket {
    const order: HeatBucket[] = ['COLD', 'WARM', 'HOT', 'BURNING'];
    const rank = (b: HeatBucket): number => order.indexOf(b);
    let peak = this.heat.getDistrictPeakBucket(playerId, districtId);
    for (const b of buildings) if (rank(b.heat_bucket) > rank(peak)) peak = b.heat_bucket;
    return peak;
  }
}

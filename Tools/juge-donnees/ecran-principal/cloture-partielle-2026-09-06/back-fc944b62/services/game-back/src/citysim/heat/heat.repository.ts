// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `buildings` table —
//             buildings.heat real [0..1] CHECK b_heat_chk + last_heat_update_at — R9.3: this READS the schema and
//             UPDATEs buildings.heat; it NEVER redefines the table nor changes the schema) +
//             docs/tech/04_city_simulation/heat_propagation.md §États HeatStateBldg + §Update tick
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatRepository` — the persisted access layer over `buildings.heat` (the per-building heat float [0..1], persisted;
// district + citywide HeatState are in-memory aggregates with NO columns). Copies the persisted-system repository
// template (BufferBloatRepository / DwellTimeRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with a thin service that holds the per-tick logic.
//
// R9.3: 09 is the source of truth for `buildings`. This file imports the EXISTING schema (building, blocks) and
// never re-declares it. The runtime role app_rw has SELECT + UPDATE on buildings (migration 0013 grant — confirmed:
// the task notes app_rw HAS UPDATE on buildings, 0013) — this repository uses exactly those. NO building CREATION
// here (the player builds buildings — the P2 operational flow; the E2E seeds them via psql).
//
// PHASE-1 INPUT REALITY (honest deferral — like buffer-bloat / dwell-time): `buildings` are P2 operational entities
// (the player constructs them; the organic heat sources — cash overflow / stash open / lek deal — are P2). The only
// BUILT organic source is BufferOverflow (System 10, which needs laundering nodes = also P2). So `listBuildings`
// returns [] organically — the mechanic is structural; the E2E seeds player-owned operational buildings with heat
// values + adjacent block_ids to exercise decay / propagation / escalation deterministically.
//
// BATCHED WRITES (the template the persisted systems copy): `applyHeat` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for the WHOLE recomputed batch — NOT a per-row await loop. All values are
// PARAMETERIZED bind params (no string interpolation). The recomputed heat respects the migrated CHECK constraint
// (b_heat_chk: heat BETWEEN 0 AND 1) — the service clamps to [0,1] before passing it here.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks, districts } from '../../db/schema/world_geography';
import type { RankableBuildingInput } from '../../common/fiction-names'; // C3 (D7) — listBuildingsForRanking's return shape.

/**
 * A player-owned building the heat tick reads (heat_propagation.md §États HeatStateBldg inputs). JOINs the block
 * (buildings.block_id → blocks.id) to resolve the host district + the {x,y} tile coordinate (for the spatial
 * heat-shadow distance) + the district PROFILE (for the Stack-profile dampening, Inv 5). The raw heat float is
 * NEVER forwarded to the client (R2.2 — the projection derives the HeatBucket from it).
 */
export interface BuildingHeatState {
  building_id: string;
  /** The block the building sits on (its tile — the propagation-distance unit + the escalation block identity). */
  block_id: number;
  /** The district this building's block belongs to (the per-district projection identity). */
  district_id: number;
  /** The district PROFILE (tidewater/spine/lattice/stack/glass/verge) — drives the Stack propagation dampening. */
  district_profile: string;
  /** The block's tile X coordinate (for the Chebyshev heat-shadow distance). */
  tile_x: number;
  /** The block's tile Y coordinate (for the Chebyshev heat-shadow distance). */
  tile_y: number;
  /** The persisted heat float ∈ [0..1] (the INPUT the tick decays/propagates). Raw float, BO-only (R2.2). */
  heat: number;
  /** C3 (D6/D7) — `buildings.building_type` RAW int (set at purchase, `city_state.ts:149`). The
   *  `buildingNameRef` INPUT (via `buildingTypeFromRawInt`) — never forwarded as a raw int (R2.2). */
  building_type: number;
}

/** A per-building heat recompute the tick persists (buildings.heat = the decayed/propagated/injected value ∈ [0,1]). */
export interface HeatMutation {
  building_id: string;
  heat: number;
}

@Injectable()
export class HeatRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Map a raw joined row → the typed BuildingHeatState (extracts the {x,y} tile coordinate from the block jsonb). */
  private mapRow(r: {
    building_id: string;
    block_id: number;
    district_id: number;
    district_profile: string;
    coordinates: unknown;
    heat: number;
    building_type: number;
  }): BuildingHeatState {
    const coords = (r.coordinates ?? {}) as { x?: number; y?: number };
    return {
      building_id: r.building_id,
      block_id: r.block_id,
      district_id: r.district_id,
      district_profile: r.district_profile,
      tile_x: Number(coords.x ?? 0),
      tile_y: Number(coords.y ?? 0),
      heat: r.heat,
      building_type: r.building_type,
    };
  }

  /** The SELECT column list shared by listBuildings / listBuildingsForDistrict (building + block + district). */
  private baseSelect() {
    return {
      building_id: building.building_id,
      block_id: building.block_id,
      district_id: blocks.district_id,
      district_profile: districts.profile,
      coordinates: blocks.coordinates,
      heat: building.heat,
      building_type: building.building_type, // C3 (D6/D7) — see BuildingHeatState's own comment.
    };
  }

  /**
   * C3 (D7) — the `rankByTypeAndBlock` INPUT: ALL of the player's non-demolished buildings IN one
   * district (the SAME district-scoped-is-exhaustive reasoning `RealEstateRepository.
   * listBuildingsForRanking`'s own header explains — `block_id` is 1:1 to a district). Deliberately NOT
   * filtered to `structural_state = 'operational'` (unlike listBuildingsForDistrict above) — a building
   * still `damaged`/`repairing` is a real sibling for ranking purposes even though it is invisible to the
   * heat overlay itself; excluding it here would let the SAME building rank differently on the heat
   * screen than on `building/:id`/`interior`. Ordered `acquired_at_tick ASC NULLS LAST, building_id ASC`
   * (fiction-names.ts's own header — the stable chronological key).
   */
  async listBuildingsForRanking(playerId: string, districtId: number): Promise<RankableBuildingInput[]> {
    const rows = await this.db
      .select({ building_id: building.building_id, building_type: building.building_type, block_id: building.block_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(building.player_id, playerId), eq(blocks.district_id, districtId), ne(building.structural_state, 'demolished')))
      .orderBy(sql`${building.acquired_at_tick} ASC NULLS LAST, ${building.building_id} ASC`);
    return rows.map((r) => ({ ...r, player_id: playerId }));
  }

  /**
   * All of a player's OPERATIONAL buildings — the per-tick heat set. EXPLICIT column list, ordered by block_id then
   * building_id for deterministic batching. INNER-JOINs blocks (buildings.block_id → blocks.id) then districts
   * (blocks.district_id → districts.id) to resolve the host district + profile + tile coordinate. Only
   * `structural_state = 'operational'` buildings are heat-relevant (a seized/demolished building does not accumulate
   * heat). Returns [] when the player has no buildings (the organic Phase-1 reality — the buildings table is empty).
   */
  async listBuildings(playerId: string): Promise<BuildingHeatState[]> {
    const rows = await this.db
      .select(this.baseSelect())
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .innerJoin(districts, eq(districts.id, blocks.district_id))
      .where(sql`${building.player_id} = ${playerId}::uuid AND ${building.structural_state} = 'operational'`)
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * All of a player's OPERATIONAL buildings IN one district (the projection read — same shape as listBuildings,
   * narrowed to a district via the blocks JOIN). Returns [] for a district with no buildings (the controller
   * projects a COLD empty per-district payload — the organic Phase-1 shape).
   */
  async listBuildingsForDistrict(playerId: string, districtId: number): Promise<BuildingHeatState[]> {
    const rows = await this.db
      .select(this.baseSelect())
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .innerJoin(districts, eq(districts.id, blocks.district_id))
      .where(
        sql`${building.player_id} = ${playerId}::uuid AND ${building.structural_state} = 'operational' AND ${blocks.district_id} = ${districtId}`,
      )
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * Persist a batch of per-building heat recomputes in ONE set-based atomic `UPDATE ... FROM (VALUES …)` statement
   * — NOT a per-row loop. Updates buildings.heat (the decayed/propagated/injected value) + stamps
   * last_heat_update_at = now(). All values are PARAMETERIZED bind params (no string interpolation). The WHERE pins
   * the update to the player + the building id (never touches another player's rows). The recomputed heat respects
   * the migrated CHECK bound (b_heat_chk: heat BETWEEN 0 AND 1) — the service clamps to [0,1] before passing it here.
   */
  async applyHeat(playerId: string, mutations: HeatMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map((m) => sql`(${m.building_id}::uuid, ${m.heat}::real)`);
    await this.db.execute(sql`
      UPDATE ${building} AS b
      SET heat = v.heat,
          last_heat_update_at = now()
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, heat)
      WHERE b.player_id = ${playerId}::uuid AND b.building_id = v.building_id
    `);
  }
}

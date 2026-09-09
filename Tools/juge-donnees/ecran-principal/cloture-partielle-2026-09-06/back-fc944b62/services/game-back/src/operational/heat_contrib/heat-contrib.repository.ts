// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the seam carries
//             the exposed building's district identity — resolved here building.block_id → blocks.district_id) +
//             docs/tech/09_data_model/schema_operational_chain.md §3 (product_storage — R9.3: this READS the schema,
//             never redefines it) + docs/tech/09_data_model/schema_city_state.md §2 (buildings.block_id) +
//             docs/tech/09_data_model/schema_world_geography (blocks.district_id)
//             -- session:2026-06-04 (Phase 2 Task 7) --
//
// `HeatContribRepository` — the read-only access layer the operational-heat contributions need: (a) resolve a batch of
// building_ids → their host district_id (the HeatInjectionEvent carries the district the exposed building belongs to),
// and (b) the per-tick storage read (all of a player's product-holding buildings with their stored grams, joined to the
// host district). It performs ZERO writes — the contribution path emits a HeatInjectionEvent on the CityEventBus; the
// Phase-1 Heat system OWNS the buildings.heat write (R9.3 "consume, don't reimplement"). Copies the persisted-system
// repository template (HeatRepository / ProductionRepository): a thin repo with EXPLICIT column lists + batched,
// set-based reads (the Phase-1 determinism discipline — no per-row queries).
//
// R9.3 — 09 is the source of truth for buildings / blocks / product_storage. This file imports the EXISTING schema
// (building, blocks, productStorage) and never re-declares it. It is READ-ONLY (the runtime role's SELECT grant).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import { buildingOperationalState, productStorage } from '../../db/schema/operational_chain';

/** A building resolved to its host district (the HeatInjectionEvent identity — buildingId + districtId). */
export interface BuildingDistrict {
  building_id: string;
  district_id: number;
}

/** A player's product-holding building (the per-tick storage-heat input — building + host district + held grams). */
export interface StorageHoldingBuilding {
  building_id: string;
  district_id: number;
  /** The total stored grams across the building's product_storage rows (the presence gate INPUT — never surfaced). */
  total_grams: number;
}

@Injectable()
export class HeatContribRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Resolve a batch of building_ids → their host district_id (buildings.block_id → blocks.district_id), pinned to the
   * player. ONE batched query (the Phase-1 determinism discipline — no per-row lookups). Buildings whose block does not
   * resolve to a seeded district are omitted. Used by the cook-complete / deal point-contributions to attach the
   * district to each HeatInjectionEvent. Returns [] for an empty input.
   */
  async resolveDistricts(playerId: string, buildingIds: readonly string[]): Promise<BuildingDistrict[]> {
    if (buildingIds.length === 0) return [];
    const rows = await this.db
      .select({ building_id: building.building_id, district_id: blocks.district_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(building.player_id, playerId), inArray(building.building_id, [...buildingIds])))
      .orderBy(building.building_id);
    return rows.map((r) => ({ building_id: r.building_id, district_id: Number(r.district_id) }));
  }

  /**
   * All of a player's product-HOLDING buildings (a SUM of product_storage.quantity_grams per building > 0), joined to
   * the host district (buildings.block_id → blocks.district_id). ONE batched set-based query (no per-row lookups). The
   * grams are read only to GATE the per-tick storage contribution (hold product → background heat); they are NEVER
   * surfaced (R2.2). Ordered by building_id for deterministic batching. Returns [] when the player stores nothing.
   *
   * OPERATIONAL GATE (Phase-2b T2 — product_storage.md §Storage heat: a building holding product radiates passive
   * heat, but only while it is a live operational asset): a building whose building_operational_state.structural_state
   * is 'damaged'/'repairing' (a raided holder — T1) is EXCLUDED, so the OPERATIONAL_HEAT_CONTRIB (MINUTE/12) tick
   * accrues NO new passive storage heat for it until repaired (T3). Implemented as a LEFT JOIN + a NULL-tolerant
   * predicate (structural_state IS NULL OR != 'damaged'/'repairing'): this is STRICTLY behavior-PRESERVING — it
   * removes ONLY explicitly damaged/repairing holders from the set; a holder with no building_operational_state row
   * (every real product-holder has one — created at conversion — but a directly-seeded building may not) still
   * radiates exactly as before T2. (INNER JOIN would have silently dropped BO-state-less holders — a wider behavior
   * change than the gate intends.)
   */
  async listStorageHoldings(playerId: string): Promise<StorageHoldingBuilding[]> {
    const rows = await this.db
      .select({
        building_id: productStorage.building_id,
        district_id: blocks.district_id,
        total_grams: sql<number>`coalesce(sum(${productStorage.quantity_grams}), 0)::int`,
      })
      .from(productStorage)
      .innerJoin(building, eq(building.building_id, productStorage.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      // The holding building must NOT be structurally damaged/repairing (Phase-2b raid gate) — a damaged holder accrues
      // no heat. LEFT JOIN so a holder with no operational-state row keeps its pre-T2 behavior (only damaged/repairing
      // are removed).
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, productStorage.building_id))
      .where(
        and(
          eq(productStorage.player_id, playerId),
          // positive form fails safe: a future non-operational structural_state is excluded by default; IS NULL tolerates BO-state-less (test-seeded) holders that can never be raided
          or(
            isNull(buildingOperationalState.structural_state),
            eq(buildingOperationalState.structural_state, 'operational'),
          ),
        ),
      )
      .groupBy(productStorage.building_id, blocks.district_id)
      .orderBy(productStorage.building_id);
    return rows
      .map((r) => ({
        building_id: r.building_id,
        district_id: Number(r.district_id),
        total_grams: Number(r.total_grams),
      }))
      .filter((r) => r.total_grams > 0);
  }
}

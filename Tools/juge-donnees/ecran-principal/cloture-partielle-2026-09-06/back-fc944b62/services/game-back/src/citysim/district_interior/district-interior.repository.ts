// IMPLEMENTS: docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md §C1 (B-1 — la lecture
//             batchée) + §D1 (une projection "intérieur de district", 4 requêtes à cardinalité FIXE,
//             indépendantes du nombre de bâtiments) + §D2 (les clés de la projection) + §1.1a/§1.1b
//             (les deux colonnes structural_state homonymes + les 3 liens d'activité indexés)
//             -- session:2026-08-17 (W3.U2 C1) --
//
// `DistrictInteriorRepository` — the raw Drizzle read layer for the "district interior" diorama screen.
// 5 batched queries (D10/§C2-bis added the 5th), EACH with a cardinality independent of the number of
// buildings in the district (D1 — ⛔ interdit explicite : jamais `projectBuilding` en boucle) :
//   1. `listBlocks`              — the district's blocks (the grid), READ-only static geography.
//   2. `listPlayerBuildings`     — the player's non-demolished buildings in this district, INNER JOINed
//                                  to `blocks` (host district) and LEFT JOINed to
//                                  `building_operational_state` (a not-yet-converted building has none).
//   3. `listActivityLinks`       — the 3 activity-link tables (cook_session/grow_session/dealer),
//                                  `building_id IN (…)`, as 3 separate reads (the design explicitly
//                                  allows either a single UNION ALL or 3 reads — cardinality is what's
//                                  fixed, not the exact SQL shape).
//   4. `listMoneyHoldingHeldCents` — the money_holding rows for the buildings concerned.
//   5. `listLieutenantAssignments` — D10/§C2-bis (B-7): the player's `lieutenant` rows whose
//                                  `assigned_building_id` is one of the buildings concerned.
//
// R9.3: this file imports the EXISTING schema (buildings/blocks/building_operational_state/
// cook_session/grow_session/dealer/money_holding) and never redefines it.
//
// District METADATA (profile/name_canonical/bank_side) is deliberately NOT read here — C2 (route +
// wiring) assembles the response header; this repository's job is the district CONTENT (the grid +
// the per-building rows the 5 resolvers consume).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, ne, notInArray } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building, structuralState } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import {
  buildingOperationalState,
  buildingOperationalType,
  buildingStructuralState,
  cookSession,
  growSession,
  dealer,
  moneyHolding,
} from '../../db/schema/operational_chain';
// D10/§C2-bis (B-7) — the lieutenant assignment read (query 5/5, `lieutenant_assigned_building_idx`).
import { lieutenant } from '../../db/schema/lieutenant';

/** The city-state `buildings.structural_state` domain (operational|damaged|seized|demolished — §1.1a). */
export type BuildingCityStructuralStateEnumTs = (typeof structuralState.enumValues)[number];

/** The operational-chain `building_operational_state.structural_state` domain (§1.1a — the raid/repair/failure column). */
export type BuildingOperationalStructuralStateEnumTs = (typeof buildingStructuralState.enumValues)[number];

/** The 12-member `building_operational_type` domain (D2 — the closed enum every conversion picks from). */
export type BuildingOperationalTypeEnumTs = (typeof buildingOperationalType.enumValues)[number];

/** One block of the district's grid — {block_id, x, y} — pure static geography (D2, D1 §1.4 — hors P5). */
export interface DistrictBlockRow {
  block_id: number;
  x: number;
  y: number;
}

/**
 * One player-owned, non-demolished building in the district — the RAW row the 5 resolvers of C1 consume
 * (D2's `buildings[]` keys, minus the maintenance/day_phase fields C2 adds). `operational_type` /
 * `conversion_stage` / `op_structural_state` are coalesced to their "not yet converted" defaults (the
 * SAME convention `RealEstateRepository.getBuildingOperationalState` uses) when the LEFT JOIN finds no
 * `building_operational_state` row.
 */
export interface DistrictBuildingRow {
  building_id: string;
  block_id: number;
  /** `buildings.structural_state` (the CITY-STATE column — feeds `shell_state`; §1.1a). */
  structural_state: BuildingCityStructuralStateEnumTs;
  /** `building_operational_state.operational_type`, or `''` when not yet converted (D2). */
  operational_type: BuildingOperationalTypeEnumTs | '';
  /** `building_operational_state.conversion_stage`, or `'none'` when not yet converted. */
  conversion_stage: string;
  /** `building_operational_state.structural_state` (the OPERATIONAL-CHAIN column — feeds `condition_band`; §1.1a), or `'operational'` when not yet converted. */
  op_structural_state: BuildingOperationalStructuralStateEnumTs;
  /** C3 (D6/D7) — `buildings.building_type` RAW int (set at purchase — populated EVEN before conversion,
   *  unlike `operational_type` above). The `buildingNameRef` INPUT (via `buildingTypeFromRawInt`). */
  building_type: number;
  /** C3 (D7) — `buildings.acquired_at_tick` (P3-E C1 mig 0132, nullable). RANKING-ONLY (never projected
   *  raw): `rankByTypeAndBlock` needs the STABLE chronological order (fiction-names.ts's own header) —
   *  the existing `.orderBy(block_id, building_id)` below stays UNCHANGED (the visible `buildings[]`
   *  order is an out-of-scope behavior this chunk does not touch), so ranks are computed from a
   *  SEPARATELY re-sorted copy of these same rows (see `DistrictInteriorProjectionService`). */
  acquired_at_tick: number | null;
}

/**
 * The 3 activity-link sets a district's buildings may belong to (D2 v2 MAJOR R4 — the `activity_band`
 * rule table), as building-id membership sets — O(1) lookups, no per-building query.
 */
export interface DistrictActivityLinks {
  /** Building ids with a `cook_session` whose `current_stage` is NOT terminal (not completed/aborted). */
  activeCookBuildingIds: Set<string>;
  /** Building ids with a `grow_session` whose `current_stage` is NOT `completed`. */
  activeGrowBuildingIds: Set<string>;
  /** Building ids with at least one attached `dealer` in the `working` state. */
  workingDealerBuildingIds: Set<string>;
}

@Injectable()
export class DistrictInteriorRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Query 1/5 — the district's blocks (the grid), `blocks WHERE district_id = ?` (index
   * `blocks_district_idx`). GLOBAL static geography — no `player_id` (D1 §1.4 — hors P5, la géographie
   * est publique). Returns `[]` for a district id with no blocks (an invalid id — the caller 404s).
   */
  async listBlocks(districtId: number): Promise<DistrictBlockRow[]> {
    const rows = await this.db
      .select({ id: blocks.id, coordinates: blocks.coordinates })
      .from(blocks)
      .where(eq(blocks.district_id, districtId))
      .orderBy(blocks.id);
    return rows.map((r) => {
      const coords = (r.coordinates ?? {}) as { x?: number; y?: number };
      return { block_id: r.id, x: Number(coords.x ?? 0), y: Number(coords.y ?? 0) };
    });
  }

  /**
   * Query 2/5 — the player's non-demolished buildings in this district (D1's filter —
   * `structural_state != 'demolished'`, NOT `= 'operational'`: a raided/damaged/seized building stays
   * visible, only a demolished one leaves the grid — §1.1a). INNER JOINs `blocks` to scope by district
   * (buildings.block_id is NOT NULL — D1); LEFT JOINs `building_operational_state` (a not-yet-converted
   * building has none — the SAME LEFT JOIN + coalesce convention `RealEstateRepository` uses).
   */
  async listPlayerBuildings(playerId: string, districtId: number): Promise<DistrictBuildingRow[]> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        block_id: building.block_id,
        structural_state: building.structural_state,
        operational_type: buildingOperationalState.operational_type,
        conversion_stage: buildingOperationalState.conversion_stage,
        op_structural_state: buildingOperationalState.structural_state,
        building_type: building.building_type, // C3 (D6/D7)
        acquired_at_tick: building.acquired_at_tick, // C3 (D7) — ranking-only, see DistrictBuildingRow's own comment.
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.player_id, playerId),
          eq(blocks.district_id, districtId),
          ne(building.structural_state, 'demolished'),
        ),
      )
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      block_id: r.block_id,
      structural_state: r.structural_state,
      operational_type: (r.operational_type ?? '') as BuildingOperationalTypeEnumTs | '',
      conversion_stage: r.conversion_stage ?? 'none',
      op_structural_state: r.op_structural_state ?? 'operational',
      building_type: r.building_type,
      acquired_at_tick: r.acquired_at_tick,
    }));
  }

  /**
   * Query 3/5 — the 3 activity links, `building_id IN (…)` (§1.1b — all 3 columns are indexed:
   * `cook_session_player_lab_idx`, `grow_session_building_idx`, `dealer_player_building_idx`). 3 reads
   * (the design allows either form — cardinality FIXED is what matters, not the exact SQL shape).
   * Returns empty sets for an empty `buildingIds` (no round-trip — the district has no buildings).
   */
  async listActivityLinks(playerId: string, buildingIds: string[]): Promise<DistrictActivityLinks> {
    if (buildingIds.length === 0) {
      return { activeCookBuildingIds: new Set(), activeGrowBuildingIds: new Set(), workingDealerBuildingIds: new Set() };
    }
    const [cookRows, growRows, dealerRows] = await Promise.all([
      this.db
        .select({ lab_building_id: cookSession.lab_building_id })
        .from(cookSession)
        .where(
          and(
            eq(cookSession.player_id, playerId),
            inArray(cookSession.lab_building_id, buildingIds),
            // "non terminée" (D2 v2 MAJOR R4) — cook_stage has no boolean; 'completed'/'aborted' are the
            // 2 terminal members of the 7-member enum (operational_chain.ts).
            notInArray(cookSession.current_stage, ['completed', 'aborted']),
          ),
        ),
      this.db
        .select({ building_id: growSession.building_id })
        .from(growSession)
        .where(
          and(
            eq(growSession.player_id, playerId),
            inArray(growSession.building_id, buildingIds),
            ne(growSession.current_stage, 'completed'),
          ),
        ),
      this.db
        .select({ home_building_id: dealer.home_building_id })
        .from(dealer)
        .where(
          and(
            eq(dealer.player_id, playerId),
            inArray(dealer.home_building_id, buildingIds),
            eq(dealer.current_state, 'working'),
          ),
        ),
    ]);
    return {
      activeCookBuildingIds: new Set(cookRows.map((r) => r.lab_building_id)),
      activeGrowBuildingIds: new Set(growRows.map((r) => r.building_id)),
      workingDealerBuildingIds: new Set(dealerRows.map((r) => r.home_building_id)),
    };
  }

  /**
   * Query 4/5 — the money_holding rows for the buildings concerned, `building_id IN (…)` (index
   * `money_holding_player_building_idx`). Returns a `building_id → held_cents` map (only buildings with
   * a row — a non-`money_holding` building never has one). `held_cents` is the RAW bigint — the caller
   * (the `revenue_band` resolver) only ever compares it to 0; it is NEVER forwarded to the client (R2.2).
   */
  async listMoneyHoldingHeldCents(playerId: string, buildingIds: string[]): Promise<Map<string, bigint>> {
    if (buildingIds.length === 0) return new Map();
    const rows = await this.db
      .select({ building_id: moneyHolding.building_id, held_cents: moneyHolding.held_cents })
      .from(moneyHolding)
      .where(and(eq(moneyHolding.player_id, playerId), inArray(moneyHolding.building_id, buildingIds)));
    return new Map(rows.map((r) => [r.building_id, r.held_cents]));
  }

  /**
   * Query 5/5 — D10/§C2-bis (B-7): the player's `lieutenant` rows whose `assigned_building_id` is one of
   * the buildings concerned, `assigned_building_id IN (…)` (index `lieutenant_assigned_building_idx`).
   * Preserves D1's fixed-cardinality property (4→5 queries, still independent of building count).
   * C3 (D7, L0.5) — `+1 colonne lieutenant.name` on this SAME query (no 6th round-trip): every row
   * already IS one lieutenant, uniquely, so the flat `assigned` list needs no dedup. Returns:
   *   - `byBuilding`: `building_id → lieutenant_ids[]`, each array SORTED by `lieutenant_id` (⛔ ordre
   *     stable exigé — D10: without it, two identical reads could render two different orders and turn
   *     an equality assertion intermittent on a rationed CI slot). A building with no assigned
   *     lieutenant is simply absent — the caller defaults to `[]` (D10: never `null`).
   *   - `assigned`: the SAME rows, flat, `{lieutenant_id, name}` — the top-level `interior.lieutenants[]`
   *     source (D7 registry: `DistrictInteriorBuildingContent (+ lieutenants[])`). SORTED by
   *     `lieutenant_id` (the SAME `.orderBy` — D10's stability requirement applies here too).
   */
  async listLieutenantAssignments(playerId: string, buildingIds: string[]): Promise<DistrictLieutenantAssignments> {
    if (buildingIds.length === 0) return { byBuilding: new Map(), assigned: [] };
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, name: lieutenant.name, assigned_building_id: lieutenant.assigned_building_id })
      .from(lieutenant)
      .where(and(eq(lieutenant.player_id, playerId), inArray(lieutenant.assigned_building_id, buildingIds)))
      .orderBy(lieutenant.lieutenant_id);
    const byBuilding = new Map<string, string[]>();
    for (const r of rows) {
      // NOT NULL here — the inArray filter above only matches rows whose assigned_building_id is one of
      // the (non-null) buildingIds passed in.
      const buildingId = r.assigned_building_id as string;
      const existing = byBuilding.get(buildingId);
      if (existing) existing.push(r.lieutenant_id);
      else byBuilding.set(buildingId, [r.lieutenant_id]);
    }
    return { byBuilding, assigned: rows.map((r) => ({ lieutenant_id: r.lieutenant_id, name: r.name })) };
  }

  /**
   * TD-534 — SŒUR de `listPlayerBuildings` (query 2/5 ci-dessus) : le MÊME filtre (joueur,
   * `structural_state != 'demolished'`, §1.1a) SANS le filtre `blocks.district_id = ?`. INNER JOINs
   * `blocks` quand même (`buildings.block_id` NOT NULL, D1) — plus pour porter `district_id` (que
   * l'appelant ne peut plus déduire d'un seul id de route) que pour scoper. LEFT JOINs
   * `building_operational_state` pour `operational_type`, coalescé à `''` (même convention que la
   * sœur). N'existait avant ce chunk que sous la forme scopée à un district — `listPlayerBuildings`
   * elle-même reste inchangée, ses appelants aussi (D1's fixed-cardinality 5-query system, intact).
   * Retourne `[]` pour un joueur sans bâtiment (pas d'erreur — même convention que la sœur).
   */
  async listPlayerBuildingsAllDistricts(playerId: string): Promise<PlayerBuildingAcrossDistrictsRow[]> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        block_id: building.block_id,
        district_id: blocks.district_id,
        operational_type: buildingOperationalState.operational_type,
        building_type: building.building_type,
        acquired_at_tick: building.acquired_at_tick,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(and(eq(building.player_id, playerId), ne(building.structural_state, 'demolished')))
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      block_id: r.block_id,
      district_id: r.district_id,
      operational_type: (r.operational_type ?? '') as BuildingOperationalTypeEnumTs | '',
      building_type: r.building_type,
      acquired_at_tick: r.acquired_at_tick,
    }));
  }
}

/** C3 (D7) — `listLieutenantAssignments`'s return shape (see that method's own header). */
export interface DistrictLieutenantAssignments {
  byBuilding: Map<string, string[]>;
  assigned: Array<{ lieutenant_id: string; name: string }>;
}

// ===================================================================================================
// TD-534 — `PlayerBuildingsController` (`player-buildings.controller.ts`, GET /v1/me/buildings): the
// ONLY player-facing route that lists a player's buildings ACROSS every district was, until this
// chunk, missing — the two existing `@Get(…buildings…)` handlers are both ADMIN
// (`maintenance-admin.controller.ts:139,200`). Measured: to find a single building today, a screen
// must call `GET /v1/world/districts` (18 districts) then `GET /v1/city/district/:id/interior` on
// each. `listPlayerBuildingsAllDistricts` below is a SISTER of `listPlayerBuildings` (query 2/5
// above) — same player + non-demolished filter (§1.1a), the district_id filter DROPPED, district_id
// itself ADDED to the row (the caller can no longer infer it from a single route param). Does NOT
// touch `listPlayerBuildings` — its existing callers (C1's 5-query system) are unchanged. Outside
// that system's fixed-cardinality invariant (this is a 6th, INDEPENDENT read, not a 6th member of
// the 5).
// ===================================================================================================

/** TD-534 — one player-owned, non-demolished building across ALL districts (the sister of
 *  `DistrictBuildingRow`, above — minus its district scoping, plus `district_id`). Carries only the
 *  columns `PlayerBuildingsController` actually projects (`operational_type`/`name_i18n` inputs/
 *  `block_id`/`district_id`) — NOT `structural_state`/`conversion_stage`/`op_structural_state`,
 *  which no consumer of this route needs (unlike the 5-resolver district-interior screen). */
export interface PlayerBuildingAcrossDistrictsRow {
  building_id: string;
  block_id: number;
  district_id: number;
  /** `building_operational_state.operational_type`, or `''` when not yet converted (same convention
   *  as `DistrictBuildingRow.operational_type`). */
  operational_type: BuildingOperationalTypeEnumTs | '';
  /** `buildings.building_type` RAW int — the `buildingNameRef` input (C3's own convention). */
  building_type: number;
  /** Ranking-only (never projected raw) — see `DistrictBuildingRow.acquired_at_tick`'s own comment;
   *  the SAME stable-chronological-order contract `rankByTypeAndBlock` needs. */
  acquired_at_tick: number | null;
}

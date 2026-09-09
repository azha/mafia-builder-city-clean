// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 8 (C8) — countInTransitShiftsByType (DD-FLEET-CAP)
// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 (courier / route / courier_shift /
//             product_storage — T0; building_operational_state — the OPERATIONAL gate) +
//             docs/tech/09_data_model/schema_city_state.md §2 (buildings — ownership + block_id) +
//             docs/tech/09_data_model/schema_world_geography.md §2 (blocks.coordinates — the route geometry) +
//             docs/tech/09_data_model/schema_city_sim_clock.md §2 (city_sim_clock.game_minute — started_at_tick) +
//             docs/tech/04a_operational_systems/distribution_couriers_runners.md §`Courier`/§`Route` entity (foot
//             courier + path_blocks) + §Data model `Shift` (the transit shift advanced per tick)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//
// `DistributionRepository` — the persisted access layer for the M1 foot-courier distribution slice. Copies the
// persisted-system repository template (ProductionRepository / PrecursorsRepository): a thin `*.repository.ts` owning
// the raw Drizzle reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action /
// per-tick logic.
//
// R9.3: 09 is the source of truth for `courier` / `route` / `courier_shift` / `product_storage` (T0),
// `building_operational_state` (T0), `buildings` (Phase 1 — block_id), `blocks` (Phase 1 — coordinates), and
// `city_sim_clock` (Phase 1). This file IMPORTS the existing schema and NEVER re-declares it. The runtime role app_rw
// has SELECT+INSERT broadly (0013) + UPDATE/DELETE on the mutable operational tables incl. route/courier/
// courier_shift (0017) — this repository uses exactly those.
//
// BATCHED WRITES (the determinism template): the scheduler-facing transit tick reads ALL in-transit courier_shifts for
// a player in ONE query and applies the whole segment-advance / arrival batch set-based — NEVER a per-row await loop
// (the Phase-1 determinism discipline). All values are PARAMETERIZED bind params. NO RNG.

import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import {
  buildingOperationalState,
  courier,
  courierShift,
  productStorage,
  route,
} from '../../db/schema/operational_chain';
import type { SubstanceType } from '../substance/substance-config';
import { citySimClock } from '../../db/schema/city_sim_clock';

/**
 * P3-C C7 — the I7 saved-route dispatch guard's sentinel (design §7.5). Thrown INSIDE
 * `dispatchOnSavedRoute`'s transaction (never returned) so the enclosing `db.transaction` genuinely
 * ROLLS BACK the earlier guarded source-storage decrement — a returned sentinel would NOT undo that
 * write (Drizzle only rolls back on a thrown error). `DistributionService.dispatch` catches this and
 * maps it to the correct `ApiError` (409 `REBUILD_REQUIRED` for `severed`, 409 `ROUTE_REBUILDING` for
 * `rebuilding`, 404 `RESOURCE_NOT_FOUND` for `not_found` — a route deleted concurrently, structurally
 * unreachable once ownership was already confirmed pre-tx but defensive belt-and-braces).
 */
export class RouteNotDispatchableError extends Error {
  constructor(public readonly reason: 'severed' | 'rebuilding' | 'not_found') {
    super(`route not dispatchable: ${reason}`);
    this.name = 'RouteNotDispatchableError';
  }
}

/** A player-owned OPERATIONAL building with its block (the dispatch source/dest gate + the route geometry input). */
export interface OwnedOperationalBuilding {
  building_id: string;
  block_id: number;
}

/** An in-transit courier_shift the transit tick advances (status='in_transit'). */
export interface InTransitShift {
  shift_id: string;
  courier_id: string;
  route_id: string;
  destination_building_id: string;
  started_at_tick: number;
  current_segment_index: number;
  cargo_grams: number;
  /** The substance the cargo is — persisted on the shift at dispatch; the arrival deposits THIS substance (T4). */
  substance_type: string;
  /** The courier's vehicle_type (foot/bike/car/refrigerated_van) — the PER-VEHICLE transit-speed input (T5). */
  vehicle_type: string;
  /** The number of BlockId stops on the route (path_blocks.length) — the last segment index for progress. */
  path_block_count: number;
  /** The Manhattan block distance between the route's origin and destination blocks (the transit-duration input). */
  block_distance: number;
  /**
   * C10 — DD-EPHEMERAL: whether the route was created with ephemeral_mode=true.
   * When true, the post-execution purge deletes the player's operation trail (shift record +
   * route↔shift history + route_version_history). ADDITIVE — false for all existing shifts.
   */
  ephemeral_mode: boolean;
  /**
   * P3-C C2 — the route's origin_building_id (design §4.2 leg identity's origin endpoint) — the
   * `LegAccrualService.recordThroughput` arrival hook's leg-identity input. ADDITIVE (unused by any
   * pre-P3-C consumer of this interface).
   */
  origin_building_id: string;
  /**
   * P3-C C2 — the DELIVERING route's `sinuosity_index` at arrival time (design §5.1 D5 formula's
   * `SI_route` term — ad-hoc or saved, read identically, D6). ADDITIVE.
   */
  route_sinuosity_index: number;
  /**
   * P3-C C3 — the route's `mycelial_transit_stress_multiplier` (migration 0126, design §5.3/D4) — FROZEN
   * at dispatch time by `DistributionService.dispatch` from the leg's LIVE `debt_load` at that moment.
   * `1.0` for every pre-C3 route (zero-regression) or a dispatch onto an unstressed leg. The transit
   * tick multiplies `vehicleTransitTicks(...)` by THIS value — never re-derives stress live (that would
   * violate "frozen at dispatch" — see the migration's own header). ADDITIVE.
   */
  mycelial_transit_stress_multiplier: number;
}

/** The player's BEST operational distribution_hub — the lever-A roster-cap input (hub_tier) + the vehicle-gate / courier
 *  home_dispatch_hub_id input (building_id). `null` when the player owns NO operational distribution_hub. */
export interface OwnedOperationalHub {
  /** The hub's building_id — set on a dispatched courier's home_dispatch_hub_id (T5). */
  buildingId: string;
  /** The hub's hub_tier (1..5) — the lever-A roster-cap scale (HubRosterService.effectiveCap, T4). */
  hubTier: number;
}

/** The minimal courier+shift row for the projection (its qualitative state input). */
export interface CourierStateRow {
  courier_id: string;
  current_state: string;
  /** The active shift's status (null when the courier has no active shift). */
  shift_status: string | null;
  /** The courier's vehicle_type (foot/bike/car/refrigerated_van — drives the FOOT/… vehicle band + the cold-chain). */
  vehicle_type: string;
  /** The most-recent shift's cargo substance (null when the courier has no shift) — the cold-chain INPUT (Crick?). */
  shift_substance_type: string | null;
}

@Injectable()
export class DistributionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── dispatch (Step 1) ─────────────────────────────

  /**
   * Read a player-owned building that is OPERATIONAL (conversion_stage='operational') WITH its block_id — the dispatch
   * source/destination gate (a courier moves product between two of the player's operational buildings) + the route
   * geometry input (the building's block is the route endpoint). Returns { building_id, block_id } or null (not the
   * player's / not operational).
   */
  async getOwnedOperationalBuilding(playerId: string, buildingId: string): Promise<OwnedOperationalBuilding | null> {
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
   * The player's BEST OPERATIONAL distribution_hub — { buildingId, hubTier } — or `null` when the player owns NO
   * operational distribution_hub. The SINGLE owns-hub read the dispatch hot path needs: it serves THREE consumers
   * (Phase-4 vector #4) so the dispatch never double-reads —
   *   - the ROSTER CAP (T4): HubRosterService.effectiveCap(hub?.hubTier ?? null) — null → noHubCap; else rosterCap(tier).
   *   - the VEHICLE GATE (T5): hub !== null → bike/car unlocked (else only foot allowed).
   *   - the courier home_dispatch_hub_id (T5): hub?.buildingId ?? null on the dispatched courier.
   * Set-based, ONE query, no RNG. Uses the SAME "operational" predicate as getOwnedOperationalBuilding (building
   * ownership='player' + player_id ⋈ building_operational_state with conversion_stage='operational'), narrowed to
   * operational_type='distribution_hub', and ORDERed `hub_tier DESC, building_id` LIMIT 1 — so a player with several hubs
   * gets their BEST one (highest tier; building_id tiebreak makes the pick DETERMINISTIC). This returns the SAME max
   * hub_tier the prior getOwnedOperationalHubMaxTier returned (the top row's tier = MAX(hub_tier)), so T4's cap is
   * unchanged; it ADDITIONALLY carries the building_id (the courier's home_dispatch_hub_id, T5).
   *
   * DEFERRED (out of scope — the plan/spec don't address it): whether a DAMAGED distribution_hub
   * (building_operational_state.structural_state='damaged') still counts. We use the SAME operational definition as the
   * existing dispatch building check (conversion_stage='operational'), which does NOT filter on structural_state — so a
   * damaged-but-converted hub currently counts. If the DAMAGED nuance becomes load-bearing, narrow the predicate then.
   */
  async getOwnedOperationalHub(playerId: string): Promise<OwnedOperationalHub | null> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        hub_tier: buildingOperationalState.hub_tier,
      })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
          eq(buildingOperationalState.operational_type, 'distribution_hub'),
        ),
      )
      // BEST hub first (highest tier; building_id tiebreak → deterministic pick over equal-tier hubs).
      .orderBy(desc(buildingOperationalState.hub_tier), building.building_id)
      .limit(1);
    const row = rows[0];
    if (!row || row.hub_tier === null || row.hub_tier === undefined) return null;
    return { buildingId: row.building_id, hubTier: Number(row.hub_tier) };
  }

  /**
   * COUNT the player's CURRENTLY in-transit courier_shifts (status='in_transit') — the roster-cap gate's occupancy
   * input (Phase-4 vector #4 T4, lever A). The dispatch gate compares THIS count against HubRosterService.effectiveCap
   * (the no-hub / per-tier roster cap) and refuses a new dispatch at/over the cap (409 OVER_CAPACITY). "In-transit" is
   * the exact slot a roster slot is occupied: a shift becomes 'completed' on arrival (applyArrival) and stops counting,
   * so an arrival frees a slot. Set-based — ONE COUNT(*) query, no per-row read, no RNG. A pure read (no state change),
   * so it never alters the byte-identical dispatch path; it only decides whether the dispatch proceeds.
   */
  async countInTransitShifts(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ in_transit: count() })
      .from(courierShift)
      .where(and(eq(courierShift.player_id, playerId), eq(courierShift.status, 'in_transit')));
    // count() always returns exactly one row; coalesce defensively to 0 if a driver ever yields an empty set.
    return Number(rows[0]?.in_transit ?? 0);
  }

  /**
   * System 9c C8 — DD-FLEET-CAP: COUNT the player's CURRENTLY in-transit courier_shifts for a SPECIFIC
   * vehicle_type. A per-type variant of `countInTransitShifts` — JOINs `courier_shift` → `courier` on
   * `courier_id` to filter by `courier.vehicle_type` (vehicle_type lives on the `courier` row, not the shift).
   *
   * Used by `DistributionService.dispatch` for the second gate (the per-type fleet-cap gate, after the global
   * roster-cap gate). PURE read — no state change. Deterministic — no RNG (C4 / DIV-F1).
   *
   * The JOIN strategy mirrors the schema: `courier_shift.courier_id` → FK `courier.courier_id`, and
   * `courier.vehicle_type` is the vehicle_type column (mig 0017). ONE COUNT(*) query (set-based, no per-row
   * loop). Coalesces to 0 defensively.
   */
  async countInTransitShiftsByType(playerId: string, vehicleType: string): Promise<number> {
    const rows = await this.db
      .select({ in_transit: count() })
      .from(courierShift)
      .innerJoin(courier, eq(courierShift.courier_id, courier.courier_id))
      .where(
        and(
          eq(courierShift.player_id, playerId),
          eq(courierShift.status, 'in_transit'),
          eq(courier.vehicle_type, vehicleType as any),
        ),
      );
    // count() always returns exactly one row; coalesce defensively to 0.
    return Number(rows[0]?.in_transit ?? 0);
  }

  /**
   * Resolve the substance a SOURCE building's product_storage holds with ENOUGH stock for the cargo (the dispatch
   * picks up whatever substance the source building physically holds — T4 substance-generic). Reads the source
   * product_storage rows for (player, building) with quantity_grams >= cargoGrams; picks ONE deterministically
   * (ordered by substance_type — a dealer-spot/lab/stash holds one substance in M1, so this is unambiguous; the
   * order makes a hypothetical multi-substance source deterministic, no RNG). Returns the substance string, or null
   * when NO single substance row at the source has enough stock (→ the service refuses 409 with no decrement). This
   * keeps the source filter substance-driven (was hardcoded 'brindle') and works for a generic stash source too
   * (which substanceForBuildingType cannot resolve — a stash hosts no production type but can hold any product).
   */
  async resolveSourceSubstance(playerId: string, buildingId: string, cargoGrams: number): Promise<string | null> {
    const rows = await this.db
      .select({ substance_type: productStorage.substance_type })
      .from(productStorage)
      .where(
        and(
          eq(productStorage.player_id, playerId),
          eq(productStorage.building_id, buildingId),
          sql`${productStorage.quantity_grams} >= ${cargoGrams}`,
        ),
      )
      .orderBy(productStorage.substance_type)
      .limit(1);
    return rows[0]?.substance_type ?? null;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the shift's started_at_tick. Returns 0 when the
   * player has no clock row yet (the deterministic advance harness lazy-creates it on first advance). NOT a write —
   * the clock row is owned by the scheduler.
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * The ATOMIC guarded DISPATCH (Step 1), in ONE DB transaction:
   *   (a) GUARDED DECREMENT of the SOURCE product_storage by the cargo (quantity_grams >= cargo predicate IN the
   *       UPDATE so an insufficient stock NEVER goes negative — the UPDATE affects 0 rows, nothing else runs, the tx
   *       rolls back, the caller rejects 409). The cargo is sourced from the resolved substance's product_storage at the `from` building (T4 substance-generic).
   *   (b) INSERT the route (origin/destination buildings + the deterministic M1 path_blocks = [origin_block,
   *       dest_block]).
   *   (c) INSERT the courier (vehicle_type = the CHOSEN vehicle (T5 — was hardcoded 'foot'; the service validated it
   *       against the player's allowed set), home_dispatch_hub_id = the player's owned hub building_id or null (T5),
   *       current_state='in_transit', current_route_id = the new route). The vehicle drives the COURIER_TRANSIT speed.
   *   (d) INSERT the courier_shift (status='in_transit', cargo_grams = the cargo carried ON the courier between
   *       dispatch and arrival, started_at_tick, current_segment_index=0). The cargo lives on courier_shift.cargo_grams
   *       (T0 column) — NOT in any product_storage between dispatch and arrival (it is "on the courier").
   * Returns the new ids (or null if the guarded source decrement was refused → 409). DETERMINISTIC (no RNG).
   */
  async decrementSourceAndDispatch(params: {
    playerId: string;
    fromBuildingId: string;
    toBuildingId: string;
    fromBlockId: number;
    toBlockId: number;
    cargoGrams: number;
    substanceType: SubstanceType;
    startedAtTick: number;
    /** The CHOSEN vehicle_type (foot/bike/car) — validated against the allowed set by the service (T5). */
    vehicleType: string;
    /** The player's owned hub building_id (the courier's home_dispatch_hub_id) or null when no hub (T5). */
    homeDispatchHubId: string | null;
    /**
     * System 9 C4 — Layer-1 patrol_heat computed by DistributionService BEFORE the tx.
     * Written onto the courier_shift INSERT in the same atomic tx (additive; the rest of the
     * INSERT shape is UNCHANGED — the return `{ courierId, routeId, shiftId }` is byte-identical).
     * Default 0.0 (the prior constant) if not supplied (backward-compatible — existing callers
     * not yet updated will get 0.0, which is the zero-regression value).
     */
    patrolHeat?: number;
    /**
     * System 9b C7 — A* path computed by DistributionService BEFORE the tx (DD-PERSIST dispatch rewire).
     * Replaces the M1 stub `[fromBlockId, toBlockId]` with the real A* path.
     * ADDITIVE: the return `{ courierId, routeId, shiftId }` is BYTE-IDENTICAL.
     * Default: [fromBlockId, toBlockId] if not supplied (backward-compatible — adjacent blocks
     * yield [from, to] which is byte-identical to the M1 stub).
     */
    computedPathBlocks?: number[];
    /** C7: optional stance to persist on the auto-dispatch route. */
    stance?: string;
    /** C7: optional straight_line_distance to persist on the auto-dispatch route. */
    straight_line_distance?: number;
    /** C7: optional sinuosity_index to persist on the auto-dispatch route. */
    sinuosity_index?: number;
    /** C7: optional river_crossings to persist on the auto-dispatch route. */
    river_crossings?: number;
    /**
     * C10 — DD-EPHEMERAL: whether to mark the created route with ephemeral_mode=true.
     * The surcharge is debited BEFORE this tx (in DistributionService.dispatch, above).
     * ADDITIVE: default false = byte-identical to pre-C10 behavior.
     */
    ephemeralMode?: boolean;
    /**
     * P3-C C3 — the FROZEN transit-slowdown multiplier (design §5.3/D4, migration 0126), computed by
     * `DistributionService.dispatch` BEFORE this tx from the leg's LIVE `debt_load` at THIS dispatch
     * moment (`LegRepository.findLegState` — renamed/extended P3-C C4 to also answer the `LEG_RESTING`
     * gate — + `mycelial-stress.ts`'s `transitStressMultiplier`).
     * Default 1.0 if not supplied (backward-compatible — byte-identical to every pre-C3 dispatch).
     */
    mycelialTransitStressMultiplier?: number;
  }): Promise<{ courierId: string; routeId: string; shiftId: string } | null> {
    return this.db.transaction(async (tx) => {
      // (a) Guarded decrement of the SOURCE product_storage for THIS substance (never go negative). The substance is
      // resolved by the service from the source building's holdings (T4 substance-generic — was hardcoded 'brindle').
      const debited = await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`${productStorage.quantity_grams} - ${params.cargoGrams}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(productStorage.player_id, params.playerId),
            eq(productStorage.building_id, params.fromBuildingId),
            eq(productStorage.substance_type, params.substanceType),
            sql`${productStorage.quantity_grams} >= ${params.cargoGrams}`,
          ),
        )
        .returning({ storage_id: productStorage.storage_id });
      if (debited.length === 0) {
        // Insufficient source product (or no storage row) → refuse the whole dispatch (the tx rolls back the no-op).
        return null;
      }

      // (b) The route — System 9b C7: use the A* computedPathBlocks (dispatch rewire).
      //     For adjacent blocks the A* returns [from, to] — byte-identical to the M1 stub.
      //     The route is is_saved=false (auto-dispatch routes are not persistent saved routes).
      const pathBlocks = params.computedPathBlocks ?? [params.fromBlockId, params.toBlockId];
      const [routeRow] = await tx
        .insert(route)
        .values({
          player_id: params.playerId,
          origin_building_id: params.fromBuildingId,
          destination_building_id: params.toBuildingId,
          path_blocks: pathBlocks,
          is_saved: false,
          // C10 — DD-EPHEMERAL: persist the ephemeral flag on the auto-dispatch route.
          // ADDITIVE: params.ephemeralMode defaults to undefined → boolean spread omits it → DB default false.
          ...(params.ephemeralMode !== undefined && { ephemeral_mode: params.ephemeralMode }),
          ...(params.stance !== undefined && { stance: params.stance as 'fastest' | 'balanced' | 'evasive' }),
          ...(params.straight_line_distance !== undefined && { straight_line_distance: params.straight_line_distance }),
          ...(params.sinuosity_index !== undefined && { sinuosity_index: params.sinuosity_index }),
          ...(params.river_crossings !== undefined && { river_crossings: params.river_crossings }),
          // P3-C C3 — persist the FROZEN transit-slowdown multiplier (design §5.3/D4, migration 0126).
          // ADDITIVE: params.mycelialTransitStressMultiplier defaults to undefined → spread omits it →
          // DB default 1 (zero-regression, byte-identical to every pre-C3 dispatch).
          ...(params.mycelialTransitStressMultiplier !== undefined && {
            mycelial_transit_stress_multiplier: params.mycelialTransitStressMultiplier,
          }),
        })
        .returning({ route_id: route.route_id });

      // (c) The courier — the CHOSEN vehicle (T5; was hardcoded 'foot'), in_transit, bound to the new route, and
      // home_dispatch_hub_id = the player's owned hub (or null). The vehicle_type drives the COURIER_TRANSIT speed.
      // System 9 C4 (ADDITIVE): sessions_active starts at 1 (this dispatch is the first session; default 0 is the
      // pre-C4 value → ADDITIVE: existing couriers unaffected until their first C4-era dispatch).
      const [courierRow] = await tx
        .insert(courier)
        .values({
          player_id: params.playerId,
          role_type: 'courier',
          vehicle_type: params.vehicleType as (typeof courier.vehicle_type.enumValues)[number],
          home_dispatch_hub_id: params.homeDispatchHubId,
          current_state: 'in_transit',
          current_route_id: routeRow.route_id,
          current_load_grams: params.cargoGrams,
          // System 9 C4: sessions_active=1 on the NEW courier INSERT (each dispatch creates a fresh courier in M1;
          // the reputation counter starts at 1 for the first dispatch — additive, no schema change needed).
          sessions_active: 1,
        })
        .returning({ courier_id: courier.courier_id });

      // (d) The shift — carries the cargo ON the courier between dispatch and arrival (cargo_grams).
      // System 9 C4 (ADDITIVE): patrol_heat is written in the same atomic tx — computed by DistributionService
      // from the route's path_blocks → precinctsForBlocks → getPatrolLoadRaw → clamp01(heaviest).
      // The `patrol_heat` column was added in migration 0065 (Insurance C7) with DEFAULT 0.0; this C4 write
      // upgrades it from the constant 0.0 to the computed [0,1] value. The INSERT shape is UNCHANGED.
      const [shiftRow] = await tx
        .insert(courierShift)
        .values({
          player_id: params.playerId,
          courier_id: courierRow.courier_id,
          route_id: routeRow.route_id,
          started_at_tick: params.startedAtTick,
          current_segment_index: 0,
          cargo_grams: params.cargoGrams,
          substance_type: params.substanceType, // the cargo's substance — read back at arrival (T4 substance-generic).
          status: 'in_transit',
          patrol_heat: params.patrolHeat ?? 0.0, // System 9 C4 — written here, ADDITIVE; defaults to 0.0 if not provided.
          cold_chain_powered: true, // C12 — DD-COLD-POWERED: explicit true on every dispatch (additive; default already true — makes intent clear).
        })
        .returning({ shift_id: courierShift.shift_id });

      return { courierId: courierRow.courier_id, routeId: routeRow.route_id, shiftId: shiftRow.shift_id };
    });
  }

  /**
   * P3-C C7 — the SAVED-ROUTE dispatch (design §7.5's "dents"): consumes the path of an EXISTING saved
   * route (no fresh A*, OQ-P1 frozen-until-replan/patch) instead of creating a NEW ad-hoc route. In ONE
   * DB transaction:
   *   (a) the SAME guarded source-storage decrement `decrementSourceAndDispatch` makes.
   *   (b) I7 — the atomic dispatch guard, INSIDE this SAME tx (TOCTOU-zero — a plain SELECT-then-INSERT
   *       would let a concurrent sever/rebuild-claim slip in between the check and the shift INSERT):
   *       `UPDATE route SET <no-op touch> WHERE route_id=$id AND player_id=$me AND state IN
   *       ('active','saturated') AND (rebuild_completes_at_tick IS NULL OR <= gameMinute) RETURNING`.
   *       The SET clause is a harmless self-touch (`version = version`) — this guard does not RESERVE
   *       exclusive dispatch use of the route (unlike I3's maintenance claim; multiple couriers MAY
   *       share one saved route concurrently, design §7.5 never says otherwise), it only DENIES dispatch
   *       while severed/rebuilding. When the predicate matches because the downtime window has ALREADY
   *       elapsed, the SAME UPDATE also self-heals the stale `rebuild_completes_at_tick` marker back to
   *       NULL (the SAME judgment call `RouteLifecycleRepository.claimRebuild`'s own header documents —
   *       design §7.5's literal "IS NULL" would otherwise leave a route permanently stuck rebuilding;
   *       no NEW scheduler slot exists to clear it, and "MINIMAL is cheap — pas de dead-end joueur" is an
   *       explicit design concern). 0 rows → throws `RouteNotDispatchableError` (severed/rebuilding/
   *       not_found, distinguished by a follow-up read WITHIN the SAME tx) — the transaction rolls back
   *       the (a) decrement (a THROW, never a returned sentinel, is what triggers a real rollback).
   *   (c)/(d) courier + courier_shift INSERT bound to the EXISTING `params.routeId` (no new route row).
   * Returns `{ courierId, shiftId }` (routeId is already known to the caller) or `null` for insufficient
   * source product (the SAME sentinel `decrementSourceAndDispatch` returns for that case).
   */
  async dispatchOnSavedRoute(params: {
    playerId: string;
    routeId: string;
    fromBuildingId: string;
    toBuildingId: string;
    cargoGrams: number;
    substanceType: SubstanceType;
    startedAtTick: number;
    vehicleType: string;
    homeDispatchHubId: string | null;
    patrolHeat?: number;
    mycelialTransitStressMultiplier?: number;
  }): Promise<{ courierId: string; shiftId: string } | null> {
    return this.db.transaction(async (tx) => {
      // (a) Guarded decrement — byte-identical shape to decrementSourceAndDispatch's own step (a).
      const debited = await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`${productStorage.quantity_grams} - ${params.cargoGrams}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(productStorage.player_id, params.playerId),
            eq(productStorage.building_id, params.fromBuildingId),
            eq(productStorage.substance_type, params.substanceType),
            sql`${productStorage.quantity_grams} >= ${params.cargoGrams}`,
          ),
        )
        .returning({ storage_id: productStorage.storage_id });
      if (debited.length === 0) {
        return null;
      }

      // (b) I7 — the atomic dispatch guard, INSIDE this SAME tx (see method header for the no-op-touch
      // + self-healing rationale).
      const claimed = await tx
        .update(route)
        .set({
          // The ONE SET target (Drizzle requires >=1) — a self-heal-or-no-op CASE (see header): resolves
          // to the CURRENT value when no downtime is armed or it hasn't elapsed yet (a true no-op touch
          // that still lets RETURNING prove row-level atomicity), or clears an ELAPSED marker to NULL.
          rebuild_completes_at_tick: sql`CASE WHEN ${route.rebuild_completes_at_tick} IS NOT NULL AND ${route.rebuild_completes_at_tick} <= ${params.startedAtTick}::bigint THEN NULL ELSE ${route.rebuild_completes_at_tick} END`,
        })
        .where(
          and(
            eq(route.route_id, params.routeId),
            eq(route.player_id, params.playerId),
            sql`${route.state} IN ('active', 'saturated')`,
            sql`(${route.rebuild_completes_at_tick} IS NULL OR ${route.rebuild_completes_at_tick} <= ${params.startedAtTick}::bigint)`,
          ),
        )
        .returning({ route_id: route.route_id });

      if (claimed.length === 0) {
        const [current] = await tx
          .select({ state: route.state, rebuild_completes_at_tick: route.rebuild_completes_at_tick })
          .from(route)
          .where(eq(route.route_id, params.routeId))
          .limit(1);
        if (!current) throw new RouteNotDispatchableError('not_found');
        if (current.state === 'severed') throw new RouteNotDispatchableError('severed');
        throw new RouteNotDispatchableError('rebuilding');
      }

      // (c) The courier — bound to the EXISTING routeId (not a fresh one).
      const [courierRow] = await tx
        .insert(courier)
        .values({
          player_id: params.playerId,
          role_type: 'courier',
          vehicle_type: params.vehicleType as (typeof courier.vehicle_type.enumValues)[number],
          home_dispatch_hub_id: params.homeDispatchHubId,
          current_state: 'in_transit',
          current_route_id: params.routeId,
          current_load_grams: params.cargoGrams,
          sessions_active: 1,
        })
        .returning({ courier_id: courier.courier_id });

      // (d) The shift — bound to the EXISTING routeId.
      const [shiftRow] = await tx
        .insert(courierShift)
        .values({
          player_id: params.playerId,
          courier_id: courierRow.courier_id,
          route_id: params.routeId,
          started_at_tick: params.startedAtTick,
          current_segment_index: 0,
          cargo_grams: params.cargoGrams,
          substance_type: params.substanceType,
          status: 'in_transit',
          patrol_heat: params.patrolHeat ?? 0.0,
          cold_chain_powered: true,
        })
        .returning({ shift_id: courierShift.shift_id });

      return { courierId: courierRow.courier_id, shiftId: shiftRow.shift_id };
    });
  }

  // ───────────────────────────── transit tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL in-transit courier_shifts for a player (status='in_transit') in ONE query — the per-tick advance
   * input (the Phase-1 determinism discipline: batched read, no per-row queries). Joins the route for the destination
   * + the path block count + the DETERMINISTIC block distance (the Manhattan distance between the route's origin and
   * destination block coordinates, computed set-based in SQL so the tick stays one batched read — no per-shift
   * geometry query). The service derives transit_ticks from block_distance + the foot-speed tunable (kept service-side
   * so the tunable read stays out of the repo). Ordered by shift_id for deterministic batching. Returns [] when the
   * player has no in-transit shift (the common case — the tick is then a no-op).
   *
   * The transit duration's BASE is NOT persisted — it is re-derived each tick from the route geometry (a
   * FIXED function: same route → same block_distance → same transit_ticks). P3-C C3 adds ONE persisted
   * MULTIPLIER on top of that base (`route.mycelial_transit_stress_multiplier`, migration 0126) — FROZEN
   * at dispatch time from the leg's live stress state, because (unlike geometry) mycelial stress is NOT
   * fixed over a shift's transit window; re-reading it live at every tick would let a POST-dispatch
   * stress change retroactively alter an already-in-flight shift's duration (forbidden by design §5.3 —
   * see that migration's own header for the full reasoning).
   */
  async listInTransitShifts(playerId: string): Promise<InTransitShift[]> {
    // The M1 path_blocks is the 2-stop sequence [origin_block, dest_block]. The transit distance is the Manhattan
    // distance between the FIRST and LAST path block coordinates — computed set-based in SQL (no per-shift query). The
    // first/last block ids are read from the route.path_blocks jsonb array (->>0 and the last element via -1).
    const rows = await this.db
      .select({
        shift_id: courierShift.shift_id,
        courier_id: courierShift.courier_id,
        route_id: courierShift.route_id,
        destination_building_id: route.destination_building_id,
        // P3-C C2 — leg identity's origin endpoint + the delivering route's SI (the D5 accrual formula
        // inputs the transit hook reads at arrival). ADDITIVE selects — no existing consumer reads them.
        origin_building_id: route.origin_building_id,
        route_sinuosity_index: route.sinuosity_index,
        started_at_tick: courierShift.started_at_tick,
        current_segment_index: courierShift.current_segment_index,
        cargo_grams: courierShift.cargo_grams,
        substance_type: courierShift.substance_type,
        // The courier's vehicle_type — the PER-VEHICLE transit-speed input (T5). The service derives transit_ticks from
        // block_distance + this vehicle's speed (foot/refrigerated_van → foot speed → byte-identical; bike/car faster).
        vehicle_type: courier.vehicle_type,
        // C10 — DD-EPHEMERAL: read route.ephemeral_mode so the transit hook can trigger the purge on arrival.
        // ADDITIVE: false for all existing routes (column default false since mig 0017). No behavior change for non-ephemeral.
        ephemeral_mode: route.ephemeral_mode,
        // P3-C C3 — the FROZEN transit-slowdown multiplier (design §5.3/D4, migration 0126). ADDITIVE:
        // 1.0 for every pre-C3 route (byte-identical transit_ticks — see the service's own multiply).
        mycelial_transit_stress_multiplier: route.mycelial_transit_stress_multiplier,
        path_block_count: sql<number>`coalesce(jsonb_array_length(${route.path_blocks}), 0)::int`,
        // Manhattan distance between the route's first and last path-block coordinates (deterministic geometry; no RNG).
        // 0 if a block row is missing (defensive; the service floors transit at 1 tick).
        block_distance: sql<number>`coalesce(
          abs(bo.x - bd.x) + abs(bo.y - bd.y), 0)::int`.as('block_distance'),
      })
      .from(courierShift)
      .innerJoin(route, eq(route.route_id, courierShift.route_id))
      // Join the courier for its vehicle_type (the per-vehicle transit speed, T5). One-to-one (shift.courier_id FK).
      .innerJoin(courier, eq(courier.courier_id, courierShift.courier_id))
      // Origin block = path_blocks[0]; destination block = path_blocks[last]. Left-joined to the global blocks table
      // (a route always has ≥ 2 stops in M1, so both resolve; the LEFT join + coalesce keeps a malformed route safe).
      .leftJoin(
        sql`lateral (select (b.coordinates->>'x')::int as x, (b.coordinates->>'y')::int as y
                     from ${blocks} b where b.id = (${route.path_blocks}->>0)::int) bo`,
        sql`true`,
      )
      .leftJoin(
        sql`lateral (select (b.coordinates->>'x')::int as x, (b.coordinates->>'y')::int as y
                     from ${blocks} b
                     where b.id = (${route.path_blocks}->>(jsonb_array_length(${route.path_blocks}) - 1))::int) bd`,
        sql`true`,
      )
      .where(and(eq(courierShift.player_id, playerId), eq(courierShift.status, 'in_transit')))
      .orderBy(courierShift.shift_id);
    return rows.map((r) => ({
      shift_id: r.shift_id,
      courier_id: r.courier_id,
      route_id: r.route_id,
      destination_building_id: r.destination_building_id,
      started_at_tick: Number(r.started_at_tick),
      current_segment_index: Number(r.current_segment_index),
      cargo_grams: Number(r.cargo_grams),
      substance_type: r.substance_type,
      vehicle_type: r.vehicle_type,
      // C10 — DD-EPHEMERAL: propagate the route's ephemeral_mode flag to the transit tick.
      ephemeral_mode: Boolean(r.ephemeral_mode),
      path_block_count: Number(r.path_block_count),
      block_distance: Number(r.block_distance),
      // P3-C C2 — origin endpoint + delivering-route SI (the D5 accrual formula's inputs).
      origin_building_id: r.origin_building_id,
      route_sinuosity_index: Number(r.route_sinuosity_index),
      // P3-C C3 — the FROZEN transit-slowdown multiplier (design §5.3/D4).
      mycelial_transit_stress_multiplier: Number(r.mycelial_transit_stress_multiplier),
    }));
  }

  /**
   * ADVANCE one in-transit shift's progress WITHOUT arriving (the courier is still walking): bump
   * current_segment_index toward the last path block (clamped at path_block_count-1). ONE typed UPDATE keyed by the
   * shift id. Pure progress bookkeeping (a qualitative marker — NEVER surfaced raw); arrival is decided by the elapsed
   * vs transit_ticks check in the service, not by this index.
   */
  async advanceShiftSegment(playerId: string, shiftId: string, nextSegmentIndex: number): Promise<void> {
    await this.db
      .update(courierShift)
      .set({ current_segment_index: nextSegmentIndex })
      .where(and(eq(courierShift.player_id, playerId), eq(courierShift.shift_id, shiftId)));
  }

  /**
   * ARRIVE one shift ATOMICALLY in ONE transaction (the persisted-system template):
   *   (a) INCREMENT the DESTINATION product_storage by the cargo (upsert per (player, building, the arrival's substance_type): bump the
   *       existing row, else insert a fresh row at the cargo). product_storage has NO unique constraint on (player,
   *       building, substance), so the upsert is a guarded UPDATE-then-INSERT-if-absent (the RETURNING length is the
   *       authoritative "did a row exist" test). The purity_grade defaults to the M1 deterministic STANDARD on insert
   *       (the weighted-average mixing model is DEFERRED).
   *   (b) MARK the shift status='completed', clamp current_segment_index to the last path block (arrived at dest).
   *   (c) MARK the courier current_state='at_destination', clear its load + current_route_id (the courier is no longer
   *       carrying the cargo — it landed at the destination).
   * Wrapped in one tx so a shift never arrives without its cargo landing (and vice-versa). DETERMINISTIC (no RNG).
   */
  async applyArrival(
    playerId: string,
    arrival: {
      shift_id: string;
      courier_id: string;
      destination_building_id: string;
      cargo_grams: number;
      substance_type: SubstanceType;
      last_segment_index: number;
    },
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // (a) Upsert the cargo into the DESTINATION product_storage, for the SHIFT's substance (T4 substance-generic —
      // was hardcoded 'brindle'; the shift persisted its cargo's substance at dispatch).
      const bumped = await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`${productStorage.quantity_grams} + ${arrival.cargo_grams}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(productStorage.player_id, playerId),
            eq(productStorage.building_id, arrival.destination_building_id),
            eq(productStorage.substance_type, arrival.substance_type),
          ),
        )
        .returning({ storage_id: productStorage.storage_id });
      if (bumped.length === 0) {
        await tx.insert(productStorage).values({
          player_id: playerId,
          building_id: arrival.destination_building_id,
          substance_type: arrival.substance_type,
          quantity_grams: arrival.cargo_grams,
          purity_grade: 'standard', // the M1 deterministic default (the weighted-average mixing model is DEFERRED).
        });
      }

      // (b) Mark the shift completed (arrived at destination — current_segment_index clamped to the last block).
      await tx
        .update(courierShift)
        .set({ status: 'completed', current_segment_index: arrival.last_segment_index })
        .where(and(eq(courierShift.player_id, playerId), eq(courierShift.shift_id, arrival.shift_id)));

      // (c) Mark the courier at_destination + clear its load + route (no longer carrying the cargo).
      await tx
        .update(courier)
        .set({ current_state: 'at_destination', current_load_grams: 0, current_route_id: null })
        .where(and(eq(courier.player_id, playerId), eq(courier.courier_id, arrival.courier_id)));
    });
  }

  // ───────────────────────────── projection reads (Step 3) ─────────────────────────────

  /**
   * All of the player's couriers with their latest shift status (the projection's qualitative state INPUT — mapped to
   * a BAND by the projection, NEVER forwarded raw; R2.2). LEFT-joins the MOST-RECENT shift per courier (by
   * started_at_tick) so a courier's surfaced state reflects its current/last trip. Ordered by courier_id. Returns []
   * when the player has no couriers.
   */
  async listCourierStates(playerId: string): Promise<CourierStateRow[]> {
    const rows = await this.db
      .select({
        courier_id: courier.courier_id,
        current_state: courier.current_state,
        // The courier's vehicle_type (foot/bike/car/refrigerated_van) — the qualitative vehicle band + cold-chain input.
        vehicle_type: courier.vehicle_type,
        // The most-recent shift's status for this courier (NULL when the courier has no shift yet).
        shift_status: sql<string | null>`(
          select cs.status from ${courierShift} cs
          where cs.player_id = ${playerId} and cs.courier_id = ${courier.courier_id}
          order by cs.started_at_tick desc
          limit 1
        )`.as('shift_status'),
        // The most-recent shift's cargo substance (NULL when no shift) — the cold-chain temperature_status INPUT.
        shift_substance_type: sql<string | null>`(
          select cs.substance_type from ${courierShift} cs
          where cs.player_id = ${playerId} and cs.courier_id = ${courier.courier_id}
          order by cs.started_at_tick desc
          limit 1
        )`.as('shift_substance_type'),
      })
      .from(courier)
      .where(eq(courier.player_id, playerId))
      .orderBy(courier.courier_id);
    return rows.map((r) => ({
      ...r,
      shift_status: r.shift_status ?? null,
      shift_substance_type: r.shift_substance_type ?? null,
    }));
  }
}

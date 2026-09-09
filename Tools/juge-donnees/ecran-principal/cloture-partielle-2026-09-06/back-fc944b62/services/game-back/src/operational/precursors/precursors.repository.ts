// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 (precursor_order + precursor_stock — T0;
//             building_operational_state — the OPERATIONAL gate) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the debit) +
//             docs/tech/09_data_model/schema_city_state.md §2 (buildings — ownership) +
//             docs/tech/09_data_model/schema_city_sim_clock.md §2 (city_sim_clock.game_minute — ordered_at_tick) +
//             docs/tech/04a_operational_systems/precursors_supply_chain.md §Canal légitime — Pyralin +
//             §Cross-cutting (a LAB/REFINERY/STASH must be OPERATIONAL before storing precursors)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorsRepository` — the persisted access layer for the M1 Pyralin sourcing slice. Copies the persisted-system
// repository template (RealEstateRepository / HeatRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action / per-tick logic.
//
// R9.3: 09 is the source of truth for `precursor_order` / `precursor_stock` (T0), `building_operational_state` (T0),
// `economy_states` (Phase 1), `buildings` (Phase 1), and `city_sim_clock` (Phase 1). This file IMPORTS the existing
// schema and NEVER re-declares it. The runtime role app_rw has SELECT+INSERT broadly (0013) + UPDATE on the mutable
// operational tables (0017) — this repository uses exactly those.
//
// BATCHED WRITES (the determinism template): the scheduler-facing arrival tick reads ALL arrived-pending orders for a
// player in ONE query and applies the whole arrival batch (mark delivered + increment stock) set-based — NEVER a
// per-row await loop (the Phase-1 determinism discipline). All values are PARAMETERIZED bind params.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { buildingOperationalState, precursorOrder, precursorStock, precursorType } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimClock } from '../../db/schema/city_sim_clock';
import type { M1PrecursorType } from './precursor-tunables';
import type { PrecursorType } from '../substance/substance-config';

/**
 * The precursor_type pgEnum value union (the 6 members — pyralin / thalmite / garnet_salt / verdant_root_extract /
 * lull_resin / glass_lily; R9.3 — derived from the schema enum, never re-declared). The precursor_stock.precursor_type
 * column accepts exactly these, so the arrival-batch writes cast the (string) order precursor_type to this DB-column type.
 */
type PrecursorTypeEnumValue = (typeof precursorType)['enumValues'][number];

/** An arrived-pending order the arrival tick delivers (status='pending' AND arrives_at_tick <= current tick). */
export interface ArrivedOrder {
  order_id: string;
  building_id: string;
  precursor_type: string;
  quantity_units: number;
}

/** One order's status for the projection (the status enum — the sole field the qualitative projection consumes). */
export interface OrderStatusRow {
  status: string;
}

@Injectable()
export class PrecursorsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── order (Step 1) ─────────────────────────────

  /**
   * Read a player-owned building that is OPERATIONAL (conversion_stage='operational') — the precursor-storage gate
   * (precursors_supply_chain.md §Cross-cutting: "un bâtiment LAB ou REFINERY doit être OPERATIONAL avant de pouvoir
   * stocker ou consommer des précurseurs"). Returns the building_id or null (not the player's / not operational).
   */
  async getOwnedOperationalBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ building_id: string; operational_type: string } | null> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        operational_type: buildingOperationalState.operational_type,
      })
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
   * Read the player's wallet balance (economy_states.cash_cents — bigint). Returns null if the player has no
   * economy_states row yet (the order debit requires a wallet; the caller surfaces a clean 404).
   */
  async getWalletCents(playerId: string): Promise<bigint | null> {
    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    return rows[0]?.cash_cents ?? null;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the order's ordered_at_tick. Returns 0 when
   * the player has no clock row yet (the deterministic advance harness lazy-creates it on first advance; an order
   * placed before any tick is anchored at tick 0, and arrives at lead_time_ticks). NOT a write — the clock row is
   * owned by the scheduler.
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
   * The ATOMIC priced order (Step 1): DEBIT the order cost from economy_states.cash_cents AND INSERT the
   * precursor_order (status='pending', ordered_at_tick, arrives_at_tick = ordered + lead_time_ticks), in ONE DB
   * transaction. The debit is GUARDED by a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance
   * NEVER goes negative — the UPDATE affects 0 rows, the order is NOT inserted, the tx rolls back, and the caller
   * rejects (409). The stock increment happens later (on ARRIVAL, the tick-hook). Returns the new order_id (or null
   * if the guarded debit was refused).
   */
  async debitAndCreateOrder(params: {
    playerId: string;
    buildingId: string;
    precursorType: M1PrecursorType;
    quantityUnits: number;
    costCents: bigint;
    orderedAtTick: number;
    arrivesAtTick: number;
  }): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      // Guarded debit: only succeeds if the wallet can cover the order cost (never go negative — anti-exploit).
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${params.costCents}` })
        .where(
          and(
            eq(economyState.player_id, params.playerId),
            sql`${economyState.cash_cents} >= ${params.costCents}`,
          ),
        )
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole order (the tx rolls back the no-op).
        return null;
      }

      const [row] = await tx
        .insert(precursorOrder)
        .values({
          player_id: params.playerId,
          building_id: params.buildingId,
          precursor_type: params.precursorType,
          quantity_units: params.quantityUnits,
          status: 'pending',
          ordered_at_tick: params.orderedAtTick,
          arrives_at_tick: params.arrivesAtTick,
        })
        .returning({ order_id: precursorOrder.order_id });
      return row.order_id;
    });
  }

  // ───────────────────────────── arrival tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL arrived-pending orders for a player at the current tick (status='pending' AND
   * arrives_at_tick <= currentTick) in ONE query — the per-tick arrival input (the Phase-1 determinism discipline:
   * batched read, no per-row queries). Ordered by order_id for deterministic batching. Returns [] when the player
   * has no order arriving this tick (the common case — the tick is then a no-op).
   */
  async listArrivedPendingOrders(playerId: string, currentTick: number): Promise<ArrivedOrder[]> {
    const rows = await this.db
      .select({
        order_id: precursorOrder.order_id,
        building_id: precursorOrder.building_id,
        precursor_type: precursorOrder.precursor_type,
        quantity_units: precursorOrder.quantity_units,
      })
      .from(precursorOrder)
      .where(
        and(
          eq(precursorOrder.player_id, playerId),
          eq(precursorOrder.status, 'pending'),
          sql`${precursorOrder.arrives_at_tick} <= ${currentTick}`,
        ),
      )
      .orderBy(precursorOrder.order_id);
    return rows;
  }

  /**
   * Apply the whole arrival batch ATOMICALLY in ONE transaction (the persisted-system template — set-based, NOT a
   * per-row loop):
   *   (a) mark the arrived orders status='delivered' (ONE set-based UPDATE keyed by the order id list), and
   *   (b) increment precursor_stock.quantity_units per (building, precursor_type) by the delivered quantities — an
   *       UPSERT (insert the stock row at the delivered quantity if none exists yet, else add to it). precursor_stock
   *       has NO unique constraint on (player,building,type), so the upsert is expressed as a guarded
   *       UPDATE-then-INSERT-if-absent per distinct (building,type) key (batched: the keys are aggregated first).
   * All values are PARAMETERIZED bind params. Wrapped in one tx so an order is never marked delivered without its
   * stock landing (and vice-versa).
   */
  async applyArrivalBatch(playerId: string, arrived: ArrivedOrder[]): Promise<void> {
    if (arrived.length === 0) return;

    // Aggregate the delivered quantities per distinct (building_id, precursor_type) key — so the stock upsert is
    // ONE write per key, not per order (deterministic, batched).
    const byKey = new Map<string, { building_id: string; precursor_type: string; qty: number }>();
    for (const o of arrived) {
      const key = `${o.building_id}::${o.precursor_type}`;
      const cur = byKey.get(key);
      if (cur) cur.qty += o.quantity_units;
      else byKey.set(key, { building_id: o.building_id, precursor_type: o.precursor_type, qty: o.quantity_units });
    }
    const orderIds = arrived.map((o) => o.order_id);

    await this.db.transaction(async (tx) => {
      // (a) Mark all arrived orders delivered — ONE set-based UPDATE over the order-id list (typed query builder).
      await tx
        .update(precursorOrder)
        .set({ status: 'delivered' })
        .where(and(eq(precursorOrder.player_id, playerId), inArray(precursorOrder.order_id, orderIds)));

      // (b) Upsert the stock per (building, type) key. precursor_stock has no unique key, so per distinct key:
      //     UPDATE the existing row (+ qty) with RETURNING; if it touched 0 rows → INSERT a fresh row at qty. The
      //     keys are few (one per building×type the player ordered this tick), so this is a small bounded set, not
      //     per-row-per-order. The RETURNING length is the authoritative "did a row exist" test (no rowCount cast).
      for (const { building_id, precursor_type, qty } of byKey.values()) {
        const bumped = await tx
          .update(precursorStock)
          .set({ quantity_units: sql`${precursorStock.quantity_units} + ${qty}`, updated_at: sql`now()` })
          .where(
            and(
              eq(precursorStock.player_id, playerId),
              eq(precursorStock.building_id, building_id),
              eq(precursorStock.precursor_type, precursor_type as PrecursorTypeEnumValue),
            ),
          )
          .returning({ stock_id: precursorStock.stock_id });
        if (bumped.length === 0) {
          // No existing stock row for this (player, building, type) → seed it at the delivered quantity.
          await tx.insert(precursorStock).values({
            player_id: playerId,
            building_id,
            precursor_type: precursor_type as PrecursorTypeEnumValue,
            quantity_units: qty,
          });
        }
      }
    });
  }

  // ───────────────────────────── projection reads (Step 3) ─────────────────────────────

  /**
   * The current Pyralin stock quantity for a (player, building) (the projection's raw INPUT — mapped to a BAND by
   * the projection, NEVER forwarded raw; R2.2). Returns 0 when no stock row exists yet. The raw quantity is read
   * here only to bucket it; the projection never surfaces it.
   *
   * Aggregates with SUM rather than reading a single row: `precursor_stock` has no DB unique constraint on
   * (player, building, type) — `applyArrivalBatch` maintains one row per key by writer discipline, but the SUM keeps
   * the band correct regardless of row count, so a future second writer (e.g. T3 consumption) can never make the
   * projection silently under-report. Matches the E2E's SUM-based read.
   */
  async getStockQuantity(playerId: string, buildingId: string, precursorType: PrecursorType): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`coalesce(sum(${precursorStock.quantity_units}), 0)::int` })
      .from(precursorStock)
      .where(
        and(
          eq(precursorStock.player_id, playerId),
          eq(precursorStock.building_id, buildingId),
          eq(precursorStock.precursor_type, precursorType),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * The statuses of a (player, building, precursor_type)'s orders — the projection's order-state INPUT (mapped to
   * qualitative pending/arrived counts; never the raw ticks). Ordered by order_id for deterministic output.
   */
  async listOrderStatuses(
    playerId: string,
    buildingId: string,
    precursorType: PrecursorType,
  ): Promise<OrderStatusRow[]> {
    const rows = await this.db
      .select({
        status: precursorOrder.status,
      })
      .from(precursorOrder)
      .where(
        and(
          eq(precursorOrder.player_id, playerId),
          eq(precursorOrder.building_id, buildingId),
          eq(precursorOrder.precursor_type, precursorType),
        ),
      )
      .orderBy(precursorOrder.order_id);
    return rows;
  }
}

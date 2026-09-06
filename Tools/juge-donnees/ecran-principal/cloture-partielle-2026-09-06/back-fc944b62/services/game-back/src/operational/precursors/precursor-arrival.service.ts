// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §Canal légitime — Pyralin
//             ("Lead time 2–4 in-game days" — the order arrives after the lead time) + §NestJS — backend jeu
//             (PrecursorService.receiveShipment "appelé par le tick-scheduler à l'expiration du lead time …
//             met à jour le stock précurseur du joueur") +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band)
//             + docs/tech/09_data_model/schema_operational_chain.md §2/§3 (precursor_order / precursor_stock — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorArrivalService` — the OPERATIONAL tick-hook that DELIVERS arrived precursor orders. It is NOT one of the
// 11 city-sim systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the registry
// contract). It mirrors ConversionSetupService's registration shape EXACTLY (OnApplicationBootstrap →
// registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder the scheduler seeds at the
// MINUTE/7 = PRECURSOR_ARRIVAL slot (after OPERATIONAL_SETUP at MINUTE/6). This is the tick-hook PATTERN T2–T6 share.
//
// THE MINUTE/7 TICK (precursors_supply_chain.md §Canal légitime — the shipment arrives after the lead time; the
// player is NOT blocked behind the timer — P1 slow-tick), per player:
//   - BATCH-READ all PENDING orders whose arrives_at_tick <= the current tick in ONE query (the Phase-1 determinism
//     discipline: batched read, no per-row queries).
//   - DELIVER the batch in ONE transaction: mark them status='delivered' (set-based UPDATE) AND increment
//     precursor_stock.quantity_units per (building, precursor_type) by the delivered quantities (a batched upsert).
//   - No RNG: arrival is purely "arrives_at_tick has passed" — a FIXED function of the persisted ticks.
//
// DETERMINISM (NO RNG): which orders arrive (arrives_at_tick <= current tick) and the stock increment (+ the
// delivered quantity) are FIXED functions of the persisted order rows + the clock. Two players with identical
// orders + identical advances land on identical stock. Organically a no-op (no arrived-pending order).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { PrecursorsRepository } from './precursors.repository';

@Injectable()
export class PrecursorArrivalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PrecursorArrivalService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: PrecursorsRepository,
    // P3-F C2 (additive) — the SUPPLY_SOURCING mastery +1 emitter (C0 §5.2 gap closure): no
    // precursor-related bus event existed before this chunk.
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'PrecursorArrivalService registered at MINUTE/7 (PRECURSOR_ARRIVAL) — delivers pending precursor_orders whose ' +
        'arrives_at_tick has passed each in-game minute; marks them delivered + increments precursor_stock. Batched ' +
        'read/write (Phase-1 determinism). Organically a no-op (no arrived-pending order).',
    );
  }

  /** Register the MINUTE/7 = PRECURSOR_ARRIVAL slot (the SAME registerSystem path the setup hook uses at MINUTE/6). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.PRECURSOR_ARRIVAL,
      cadence: Cadence.MINUTE,
      order: 7,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/7 tick ─────────────────────────────

  /**
   * {MINUTE, order 7} — deliver the player's arrived precursor orders. ctx.gameMinute is the current in-game tick
   * (the minute boundary firing). Batch-reads the pending orders whose arrives_at_tick <= the current tick, marks
   * them delivered, and increments precursor_stock per (building, precursor_type) — all in ONE transaction.
   * Deterministic (NO RNG). Organically a no-op (no arrived-pending order).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const arrived = await this.repo.listArrivedPendingOrders(ctx.playerId, ctx.gameMinute);
    if (arrived.length === 0) return; // no order arriving this tick → clean no-op.

    await this.repo.applyArrivalBatch(ctx.playerId, arrived);

    // P3-F C2 — additive one-line emit (per order) AFTER the winning `applyArrivalBatch` succeeds
    // (fulfillment — matching canon's literal "order FILLED" language, not placement; mirrors
    // `exception-queue-tick.service.ts`'s own "loop the batch, emit once per row" precedent). Never on a
    // failed/empty batch — the early return above already excludes that.
    for (const order of arrived) {
      this.bus.emitPrecursorOrderFilled({
        type: 'precursor_order_filled',
        playerId: ctx.playerId,
        orderId: order.order_id,
        buildingId: order.building_id,
        precursorType: order.precursor_type,
        quantityUnits: order.quantity_units,
        gameMinute: ctx.gameMinute,
      });
    }
  }
}

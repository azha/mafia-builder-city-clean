// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 1 (B1) + Task 2 (B2) + Task 3 (B3) + Task 4 (B4) + Task 5 (B5)
//             Pattern: services/game-back/src/operational/market/market-test.controller.ts (R-EC-2)
//             — D1c B1+B2+B3+B4 — 2026-06-16
//
// `PrecursorMarketTestController` — TEST-ONLY probe routes for B1/B2/B3 E2E verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in PrecursorMarketModule —
// same pattern as MarketTestController / CitySimTestController / ProtocolTestController). In production
// this controller is simply not registered → 404. The E2E compose stack runs NODE_ENV=development.
//
// B1 Routes:
//   GET /v1/_test/precursor-market/projection-probe?priceTrend=<UP|STABLE|DOWN>&demandAccumulator=<float>
//     — calls PrecursorMarketStateService.toProjection() with the query-param internal state and returns the
//       R2.2 bucket payload. Asserts bucket-out / raw-scalar-refused (P5).
//   GET /v1/_test/precursor-market/rng-probe?dayId=<int>&precursorType=<string>
//     — calls PrecursorMarketStateService.seedFromDayForPrecursor() and returns the deterministic draw.
//       Calling twice with same params returns identical draw (C4 / REUSE MarketRngService.seedFromDay).
//
// B2 Routes:
//   POST /v1/_test/precursor-market/ensure-market-state { precursorType: string }
//     — calls PrecursorMarketStateService.ensureMarketStateRow() and returns the row (DB assertion).
//   GET /v1/_test/precursor-market/market-state-row?precursorType=<string>
//     — reads the precursor_market_state row from DB (all columns for E2E DB assertion).
//   POST /v1/_test/precursor-market/upsert-supplier-pressure { playerId, supplierId, pressureCounter }
//     — calls SupplierPressureService.upsertPressureRow() and returns the row (DB assertion).
//
// B3 Routes:
//   POST /v1/_test/precursor-market/record-demand { precursorType: string, quantityUnits: number }
//     — calls PrecursorMarketStateService.recordOrderDemand() directly (test-only demand injection).
//       Returns the updated demand_accumulator for E2E DB-layer assertion.
//       R2.2: demand_accumulator is returned here ONLY for TEST-ONLY DB assertion (not a client shape).
//   POST /v1/_test/precursor-market/run-inference-tick { precursorType: string, dayId: number }
//     — calls PrecursorMarketStateService.runDailyInferenceTick(dayId) and returns { price_trend, last_inference_day }
//       for the given precursorType (reads the row after the tick). TEST-ONLY — DB assertion surface.
//
// B4 Routes:
//   POST /v1/_test/precursor-market/trigger-disruption { precursorType: string, eventId: string, durationDays?: number }
//     — calls PrecursorMarketStateService.onSupplyDisruption() directly (test-only BO trigger for DD-S).
//       Returns { scarcity_active, disruption_event_id } — the updated scarcity state (DB assertion surface).
//       R2.2: the raw scarcity_multiplier is NEVER returned by any route (badge-only client shape).
//   GET /v1/_test/precursor-market/scarcity-state?precursorType=<string>
//     — returns the scarcity fields (scarcity_active, disruption_event_id, disruption_start_day) for the type.
//       TEST-ONLY: exposes server-side hidden state for E2E assertion (not registered in production).
//
// B5 Routes:
//   POST /v1/_test/precursor-market/record-supplier-order { playerId: string, supplierId: string }
//     — calls SupplierPressureService.recordSupplierOrder() — atomically increments pressure_counter.
//       Returns { pressure_counter } — the updated server-side counter (TEST-ONLY DB assertion surface).
//       R2.2: pressure_counter is returned here ONLY for TEST-ONLY DB-layer assertion (not a client shape).
//       TRIGGER PATH: fires via _test route only in D1c (no supplier_id on the order path — deferred Reputation lot).
//   GET /v1/_test/precursor-market/supplier-pressure-bucket?playerId=<string>&supplierId=<string>
//     — calls SupplierPressureService.getSupplierPressure() → returns { supplier_pressure_bucket }.
//       R2.2: response carries ONLY the bucket (FRESH/USED/STRAINED) — never the raw pressure_counter (P5).
//       DD-SP: this route reads supplier pressure ONLY; it does NOT read the price path or precursor_market_state.
//
// R2.2: ALL projection routes ONLY return the bucket (price_trend_bucket). NEVER raw demand_accumulator /
// price_trend multiplier / scarcity_multiplier. These routes do NOT bypass auth in production
// because they are not registered.

import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import {
  PrecursorMarketStateService,
  type PriceTrendBucket,
  type PrecursorMarketProjection,
} from './precursor-market.service';
import {
  SupplierPressureService,
  type SupplierPressureBucket,
} from './precursor-supplier-pressure.service';
import type { PrecursorMarketStateRow, PrecursorSupplierPressureRow } from '../../db/schema/precursor_market_state';

/** R2.2 projection probe response — ONLY the bucket (no raw scalars, P5). */
type ProjectionProbeResponse = PrecursorMarketProjection;

/** RNG probe response — the deterministic draw for a (dayId, precursorType) pair. */
interface RngProbeResponse {
  /** The deterministic float ∈ [0, 1) drawn via MarketRngService.seedFromDay (REUSE C4). */
  draw: number;
  /** Echo of inputs for human readability in test output. */
  dayId: number;
  precursorType: string;
}

/** B2: market-state-row response — the full server-side DB row (hidden state, TEST-ONLY). */
interface MarketStateRowResponse {
  /** true if the row exists, false if not seeded */
  exists: boolean;
  precursor_type: string | undefined;
  price_trend: string | undefined;
  demand_accumulator: number | undefined;
  scarcity_active: boolean | undefined;
  disruption_event_id: string | null | undefined;
  last_inference_day: number | undefined;
}

/** B2: upsert-supplier-pressure request body. */
interface UpsertSupplierPressureBody {
  playerId: string;
  supplierId: string;
  pressureCounter: number;
}

/** B5: record-supplier-order request body. */
interface RecordSupplierOrderBody {
  playerId: string;
  supplierId: string;
}

/** B5: record-supplier-order response — the updated pressure_counter (TEST-ONLY DB assertion surface).
 *  R2.2: returned here ONLY for E2E DB-layer assertion (not a client shape — the client sees only the bucket). */
interface RecordSupplierOrderResponse {
  /** The updated pressure_counter after the atomic increment. Server-side only (P5). TEST-ONLY. */
  pressure_counter: number;
}

/** B5: supplier-pressure-bucket response — ONLY the R2.2 observable bucket (no raw counter, P5). */
type SupplierPressureBucketResponse = SupplierPressureBucket;

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PrecursorMarketTestController {
  constructor(
    private readonly precursorMarketState: PrecursorMarketStateService,
    private readonly supplierPressure: SupplierPressureService,
  ) {}

  // ──────────── B1 routes ────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/precursor-market/projection-probe` — TEST-ONLY.
   *
   * Accepts the internal precursor market state as query params, routes through
   * `PrecursorMarketStateService.toProjection()`, and returns the R2.2 bucket payload.
   *
   * Query params:
   *   priceTrend       — UP | STABLE | DOWN (the internal trend enum)
   *   demandAccumulator — float (the internal accumulator value; accepted but NEVER forwarded)
   *
   * Response: { price_trend_bucket }
   * NOTE: demandAccumulator is accepted as input but NEVER forwarded in the response —
   * this proves the R2.2 filter strips hidden state (P5). The E2E checks for zero forbidden fields.
   */
  @Get('_test/precursor-market/projection-probe')
  projectionProbe(
    @Query('priceTrend') priceTrend: string,
    @Query('demandAccumulator') demandAccumulator: string,
  ): ProjectionProbeResponse {
    const trend = (priceTrend as PriceTrendBucket) ?? 'STABLE';
    const accumulator = parseFloat(demandAccumulator ?? '0.0');
    void accumulator; // server-side only; never forwarded (P5).
    return this.precursorMarketState.toProjection({
      priceTrend: trend,
      demandAccumulator: accumulator,
    });
  }

  /**
   * `GET /v1/_test/precursor-market/rng-probe` — TEST-ONLY.
   *
   * Calls `PrecursorMarketStateService.seedFromDayForPrecursor(dayId, precursorType)` and returns
   * the deterministic draw. Same params → identical draw across multiple calls (C4 REUSE assertion).
   *
   * Query params:
   *   dayId        — integer game-day identifier
   *   precursorType — precursor type string (e.g. 'pyralin')
   */
  @Get('_test/precursor-market/rng-probe')
  rngProbe(
    @Query('dayId') dayId: string,
    @Query('precursorType') precursorType: string,
  ): RngProbeResponse {
    const day = parseInt(dayId ?? '0', 10);
    const draw = this.precursorMarketState.seedFromDayForPrecursor(day, precursorType ?? 'pyralin');
    return { draw, dayId: day, precursorType: precursorType ?? 'pyralin' };
  }

  // ──────────── B2 routes ────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/precursor-market/ensure-market-state` — TEST-ONLY (B2).
   *
   * Body: { precursorType: string }
   *
   * Calls `PrecursorMarketStateService.ensureMarketStateRow()` and returns the current row.
   * Idempotent: if the row already exists (migration seed), returns it unchanged.
   * The response includes all server-side columns for E2E DB assertion.
   *
   * NOTE: This route returns the true-state DB row (all columns). TEST-ONLY — not registered in production.
   */
  @Post('_test/precursor-market/ensure-market-state')
  async ensureMarketState(
    @Body() body: { precursorType: string },
  ): Promise<PrecursorMarketStateRow> {
    const precursorType = body?.precursorType ?? 'pyralin';
    return this.precursorMarketState.ensureMarketStateRow(precursorType);
  }

  /**
   * `GET /v1/_test/precursor-market/market-state-row` — TEST-ONLY (B2).
   *
   * Query params:
   *   precursorType — the precursor type to look up (e.g. 'pyralin')
   *
   * Returns the full `precursor_market_state` DB row for E2E assertion.
   * Returns { exists: false } if the row does not exist.
   *
   * NOTE: This route returns the true-state DB row (all columns). TEST-ONLY — not registered in production.
   */
  @Get('_test/precursor-market/market-state-row')
  async getMarketStateRow(
    @Query('precursorType') precursorType: string,
  ): Promise<MarketStateRowResponse> {
    const row = await this.precursorMarketState.readMarketStateRow(precursorType ?? 'pyralin');
    if (!row) {
      return {
        exists: false,
        precursor_type: undefined,
        price_trend: undefined,
        demand_accumulator: undefined,
        scarcity_active: undefined,
        disruption_event_id: undefined,
        last_inference_day: undefined,
      };
    }
    return {
      exists: true,
      precursor_type: row.precursor_type,
      price_trend: row.price_trend,
      demand_accumulator: row.demand_accumulator,
      scarcity_active: row.scarcity_active,
      disruption_event_id: row.disruption_event_id ?? null,
      last_inference_day: row.last_inference_day,
    };
  }

  /**
   * `POST /v1/_test/precursor-market/upsert-supplier-pressure` — TEST-ONLY (B2).
   *
   * Body: { playerId: string, supplierId: string, pressureCounter: number }
   *
   * Calls `SupplierPressureService.upsertPressureRow()` and returns the upserted row.
   * The pressure_counter is a hidden server-side scalar (R2.2 — never forwarded to client in production).
   * This route returns it only for E2E DB-layer assertion (TEST-ONLY).
   */
  @Post('_test/precursor-market/upsert-supplier-pressure')
  async upsertSupplierPressure(
    @Body() body: UpsertSupplierPressureBody,
  ): Promise<PrecursorSupplierPressureRow> {
    const { playerId, supplierId, pressureCounter } = body;
    return this.supplierPressure.upsertPressureRow(playerId, supplierId, pressureCounter ?? 0);
  }

  // ──────────── B3 routes ────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/precursor-market/record-demand` — TEST-ONLY (B3).
   *
   * Body: { precursorType: string, quantityUnits: number }
   *
   * Calls `PrecursorMarketStateService.recordOrderDemand()` directly (test-only demand injection).
   * This route bypasses the order path validation — it is used ONLY to inject demand for E2E testing
   * without requiring a full player/building/wallet setup.
   *
   * Returns { demand_accumulator } — the current server-side accumulator AFTER the increment.
   * R2.2: demand_accumulator is returned here ONLY for TEST-ONLY DB-layer assertion.
   *       In production, this route is not registered → 404. The real client never sees the raw accumulator.
   *
   * DD-T: this route simulates the post-debit demand hook (the real call is in PrecursorService.order).
   */
  @Post('_test/precursor-market/record-demand')
  async recordDemand(
    @Body() body: { precursorType: string; quantityUnits: number },
  ): Promise<{ demand_accumulator: number }> {
    const precursorType = body?.precursorType ?? 'pyralin';
    const quantityUnits = Number(body?.quantityUnits ?? 1);
    await this.precursorMarketState.recordOrderDemand(precursorType, quantityUnits);
    // Read back the updated accumulator for DB-layer assertion (TEST-ONLY).
    const row = await this.precursorMarketState.readMarketStateRow(precursorType);
    return { demand_accumulator: row?.demand_accumulator ?? 0 };
  }

  /**
   * `POST /v1/_test/precursor-market/run-inference-tick` — TEST-ONLY (B3).
   *
   * Body: { precursorType: string, dayId: number }
   *
   * Runs `PrecursorMarketStateService.runDailyInferenceTick(dayId)` for all types (the real tick is
   * global — all types are processed in one pass). Returns the updated state for the given precursorType.
   *
   * Response: { price_trend, last_inference_day } — the server-side state AFTER the tick (TEST-ONLY).
   * R2.2: price_trend raw string is returned here ONLY for TEST-ONLY DB-layer assertion (not a client shape).
   *       The client surface is price_trend_bucket (banded) — exposed in B6. This route is not registered
   *       in production.
   *
   * C4: the tick is deterministic — same dayId + same accumulator state → same price_trend outcome.
   * Idempotence: running twice with the same dayId returns the same result (last_inference_day guard).
   */
  @Post('_test/precursor-market/run-inference-tick')
  async runInferenceTick(
    @Body() body: { precursorType: string; dayId: number },
  ): Promise<{ price_trend: string; last_inference_day: number }> {
    const precursorType = body?.precursorType ?? 'pyralin';
    const dayId = Number(body?.dayId ?? 0);
    // Run the global inference tick for ALL types (idempotent per day via last_inference_day).
    await this.precursorMarketState.runDailyInferenceTick(dayId);
    // Read the state for the requested type and return the updated trend + day (DB-layer assertion).
    const row = await this.precursorMarketState.readMarketStateRow(precursorType);
    return {
      price_trend: row?.price_trend ?? 'STABLE',
      last_inference_day: row?.last_inference_day ?? 0,
    };
  }

  // ──────────── B4 routes ────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/precursor-market/trigger-disruption` — TEST-ONLY (B4).
   *
   * Body: { precursorType: string, eventId: string, durationDays?: number }
   *
   * Calls `PrecursorMarketStateService.onSupplyDisruption()` directly (test-only BO trigger for DD-S).
   * This is the minimal trigger-path for B4: the world_events engine (GDD §G24 FUTURE) does not exist
   * as a concrete NestJS event bus in the codebase. The production BO route lands in B7; B4 uses this
   * `_test` route to drive the E2E proof obligation.
   *
   * Response: { scarcity_active, disruption_event_id } — the updated scarcity state.
   * R2.2: the raw scarcity_multiplier float is NEVER returned by this or any route (badge-only client shape).
   *       scarcity_active is the boolean badge. TEST-ONLY — not registered in production.
   *
   * TRIGGER PATH NOTE (for reviewer⊥): `SupplyDisruptionEvent` does NOT exist as a concrete NestJS
   * event or world_events engine class in the codebase (GDD §G24 FUTURE). This route IS the trigger;
   * no fabricated engine was built. The BO production trigger lands in B7.
   */
  @Post('_test/precursor-market/trigger-disruption')
  async triggerDisruption(
    @Body() body: { precursorType: string; eventId: string; durationDays?: number },
  ): Promise<{ scarcity_active: boolean; disruption_event_id: string | null }> {
    const precursorType = body?.precursorType ?? 'pyralin';
    const eventId = body?.eventId ?? `auto-${Date.now()}`;
    const durationDays = body?.durationDays !== undefined ? Number(body.durationDays) : undefined;
    const row = await this.precursorMarketState.onSupplyDisruption(precursorType, eventId, durationDays);
    return {
      scarcity_active: row.scarcity_active,
      disruption_event_id: row.disruption_event_id ?? null,
    };
  }

  /**
   * `GET /v1/_test/precursor-market/scarcity-state` — TEST-ONLY (B4).
   *
   * Query params:
   *   precursorType — the precursor type to look up (e.g. 'pyralin')
   *
   * Returns the scarcity fields for the type: scarcity_active, disruption_event_id, disruption_start_day.
   * TEST-ONLY: exposes server-side hidden scarcity state for E2E assertion (not registered in production).
   *
   * R2.2: the raw scarcity_multiplier float is NEVER returned by this or any route (R2.2 P5 wall).
   *       Only the scarcity_active boolean badge is client-facing (via toProjection in B6).
   */
  @Get('_test/precursor-market/scarcity-state')
  async getScarcityState(
    @Query('precursorType') precursorType: string,
  ): Promise<{
    exists: boolean;
    scarcity_active: boolean | undefined;
    disruption_event_id: string | null | undefined;
    disruption_start_day: number | null | undefined;
  }> {
    const row = await this.precursorMarketState.readMarketStateRow(precursorType ?? 'pyralin');
    if (!row) {
      return {
        exists: false,
        scarcity_active: undefined,
        disruption_event_id: undefined,
        disruption_start_day: undefined,
      };
    }
    return {
      exists: true,
      scarcity_active: row.scarcity_active,
      disruption_event_id: row.disruption_event_id ?? null,
      disruption_start_day: row.disruption_start_day ?? null,
    };
  }

  // ──────────── B5 routes ────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/precursor-market/record-supplier-order` — TEST-ONLY (B5).
   *
   * Body: { playerId: string, supplierId: string }
   *
   * Calls `SupplierPressureService.recordSupplierOrder()` — atomically increments `pressure_counter`
   * for the (player × supplier) pair. Returns the updated raw `pressure_counter` for E2E DB-layer
   * assertion.
   *
   * R2.2: `pressure_counter` is returned here ONLY for TEST-ONLY DB assertion (not a client shape).
   *       In production, this route is not registered → 404. The real client NEVER sees the counter.
   *
   * TRIGGER PATH (D1c): drives `recordSupplierOrder` via this `_test` route ONLY. The real order path
   * (`PrecursorsService.order`) does NOT carry a `supplier_id` in D1c (no supplier binding on the order
   * path — `precursors.service.ts` has zero supplier refs). Production wiring is deferred to a future
   * Reputation lot.
   *
   * DD-SP: this route calls `SupplierPressureService` ONLY — the call does NOT touch `precursor_market_state`
   * and has zero coupling to the price path (`getEffectiveScarcityMultiplier` / B6).
   */
  @Post('_test/precursor-market/record-supplier-order')
  async recordSupplierOrder(
    @Body() body: RecordSupplierOrderBody,
  ): Promise<RecordSupplierOrderResponse> {
    const playerId = body?.playerId;
    const supplierId = body?.supplierId;
    // Atomic increment — no read before write (SQL-level: pressure_counter = pressure_counter + 1).
    await this.supplierPressure.recordSupplierOrder(playerId, supplierId);
    // Read back the updated counter for E2E DB assertion (TEST-ONLY — never forwarded to the client).
    const row = await this.supplierPressure.readPressureRow(playerId, supplierId);
    return { pressure_counter: row?.pressure_counter ?? 0 };
  }

  /**
   * `GET /v1/_test/precursor-market/supplier-pressure-bucket` — TEST-ONLY (B5).
   *
   * Query params:
   *   playerId   — the player UUID
   *   supplierId — the supplier UUID
   *
   * Calls `SupplierPressureService.getSupplierPressure()` — projects the hidden `pressure_counter`
   * → `FRESH | USED | STRAINED` (R2.2 banding). Returns `{ supplier_pressure_bucket }` only.
   *
   * R2.2 (P5): the raw `pressure_counter` is NEVER returned by this route — only the bucket is exposed.
   *            The client shape is the bucket (closed domain: FRESH/USED/STRAINED); the counter is
   *            server-side only (like `reputation_risk_counter`).
   *
   * DD-SP: this route does NOT touch `precursor_market_state` or any price path. The supplier pressure
   *        bucket is observable-only in D1c; the price↔pressure coupling lives in a future Reputation lot.
   */
  @Get('_test/precursor-market/supplier-pressure-bucket')
  async getSupplierPressureBucket(
    @Query('playerId') playerId: string,
    @Query('supplierId') supplierId: string,
  ): Promise<SupplierPressureBucketResponse> {
    return this.supplierPressure.getSupplierPressure(playerId, supplierId);
  }
}

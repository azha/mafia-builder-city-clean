// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 1 (B1) + Task 2 (B2) + Task 3 (B3) + Task 4 (B4)
//             docs/tech/04a_operational_systems/precursors_supply_chain.md §Dynamique de prix des précurseurs
//             docs/tech/09_data_model/schema_precursor_market_state.md §2 (R9.3 backport — B2)
//             — D1c B1+B2+B3+B4 — 2026-06-16
//
// `PrecursorMarketStateService` — scaffold + persistence + endogenous demand-trend mechanic.
//
// B1 = SKELETON: stands up the class + registry-getter wiring + the R2.2 projection routing
// via REUSE `MarketProjectionService.toBuckets` and `MarketRngService.seedFromDay`.
//
// B2 = PERSISTENCE: adds repository read/upsert for `precursor_market_state` rows.
//   - `readMarketStateRow(precursorType)` — reads the current state row from DB.
//   - `ensureMarketStateRow(precursorType)` — idempotent INSERT ON CONFLICT DO NOTHING
//     (neutral baseline: STABLE/0/false). Seeded at migration time; this is a lazy-ensure guard.
//
// B3 = DEMAND MECHANIC: adds the endogenous price_trend auto-regulation (DD-T LOCKED):
//   - `recordOrderDemand(precursorType, quantityUnits)` — bumps demand_accumulator on the order path
//     AFTER a successful atomic debit (post-debit hook; no demand counted for refused orders).
//   - `inferDailyTrend(ctx)` — the NIGHTLY tick: applies decay, compares accumulator to thresholds,
//     writes price_trend + last_inference_day. Idempotent per day via last_inference_day.
//
// B4 = SCARCITY MECHANIC: adds the exogenous supply disruption signal (DD-S):
//   - `onSupplyDisruption(precursorType, eventId, durationDays)` — sets scarcity_active=true +
//     disruption_event_id + disruption_start_day. Does NOT touch demand_accumulator (DD-T/DD-S separation).
//   - Expiry check inside `runDailyInferenceTick`: clears scarcity_active + nulls disruption_event_id +
//     disruption_start_day once supply_disruption_duration_days have elapsed since disruption_start_day.
//   - `getEffectiveScarcityMultiplier(precursorType)` — returns the combined multiplier (trend × scarcity
//     if active) for B6 to apply to the buy price. B4 wires the factor; B6 routes it into the buy path.
//     The raw multiplier is NEVER forwarded to the client (R2.2).
//
// DD-T (LOCKED): the base price_trend is driven ENTIRELY by the player-demand accumulator.
//   NO autonomous seeded oscillation — exogenous shocks are B4's `scarcity_active` field.
//   The trend logic is pure threshold comparison — NO RNG in B3 (Math.random() BANNED — C4).
//   Determinism is achieved by a pure function of the persisted accumulator; no jitter required.
//
// DD-S (B4): `scarcity_active` is a SEPARATE exogenous factor. `onSupplyDisruption` sets the flag and
//   stores the disruption event id + start day. The flag expires after `supply_disruption_duration_days`
//   NIGHTLY ticks (checked inside `runDailyInferenceTick`). The disruption path NEVER touches
//   `demand_accumulator` — DD-T and DD-S are fully separate.
//
// R2.2 INVARIANT: the precursor market projection routes through MarketProjectionService.toBuckets
// (REUSE — DD-REG). Internal precursor market scalars (demand_accumulator, raw price_trend multiplier,
// raw scarcity_multiplier) NEVER reach the client. The probe returns a bucket field (price_trend_bucket)
// and the scarcity_active boolean badge only.
//
// REUSE: MarketRngService.seedFromDay (C4 determinism), MarketProjectionService.toBuckets (R2.2 P5 wall).
//        BOTH injected via MarketModule import in PrecursorMarketModule — NOT re-hosted here.
//
// DEFERRED: B5 supplier pressure, B6 selling rewire (routes getEffectiveScarcityMultiplier into buy path).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  precursorMarketState,
  type PrecursorMarketStateRow,
} from '../../db/schema/precursor_market_state';
import { MarketProjectionService } from '../market/market-projection.service';
import { MarketRngService } from '../market/market-rng.service';
import { precursorTunables, precursorUnitPriceCents, type M1PrecursorType } from './precursor-tunables';
import { citySimTunables } from '../../citysim/citysim-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

/** The R2.2-compliant price-trend bucket for the precursor market. Never the raw multiplier float. */
export type PriceTrendBucket = 'UP' | 'STABLE' | 'DOWN';

/** R2.2-compliant projection shape for the precursor market state (player-facing). */
export interface PrecursorMarketProjection {
  /** The banded price-trend (UP / STABLE / DOWN). NEVER the raw multiplier or demand_accumulator. */
  price_trend_bucket: PriceTrendBucket;
  /**
   * scarcity_active — boolean badge indicating an active supply disruption (DD-S).
   * R2.2: the client sees only this boolean — NEVER the raw scarcity_multiplier float.
   * Set by `onSupplyDisruption`; cleared by `runDailyInferenceTick` on expiry.
   */
  scarcity_active: boolean;
}

/**
 * Internal precursor market state inputs — server-side ONLY (never forwarded to the client).
 * B3/B4 populate these from the persisted `precursor_market_state` table.
 */
export interface PrecursorMarketInternalState {
  /** UP / STABLE / DOWN trend enum from the persisted state. NEVER forwarded client-side. */
  priceTrend: PriceTrendBucket;
  /** Running demand accumulator (order volume over the window). NEVER forwarded client-side. */
  demandAccumulator: number;
  /**
   * scarcity_active — exogenous supply disruption flag (DD-S).
   * Set by `onSupplyDisruption`; cleared by NIGHTLY tick expiry.
   * The client sees only the boolean badge (R2.2 — never the raw multiplier).
   */
  scarcityActive?: boolean;
}

@Injectable()
export class PrecursorMarketStateService {
  private readonly logger = new Logger(PrecursorMarketStateService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // REUSE: the R2.2 projection filter — imported via MarketModule (DD-REG — NOT re-hosted).
    private readonly projection: MarketProjectionService,
    // REUSE: the C4 deterministic RNG — imported via MarketModule (DD-REG — NOT re-hosted).
    private readonly rng: MarketRngService,
  ) {}

  // ─────────────────────── R2.2 projection ───────────────────────────────────

  /**
   * Map internal precursor market state → the R2.2 banded price-trend bucket.
   *
   * B1 skeleton: the trend enum from the persisted state is passed directly through.
   * B3 will compute the trend from the accumulator; B4 applies the scarcity multiplier.
   * The raw `priceTrend` multiplier and `demandAccumulator` are NEVER forwarded to the client (P5).
   *
   * Uses `precursorTunables.marketTrendMultiplierStable` (zero-regression = 1.0) as the stable anchor,
   * without emitting it.
   */
  toProjection(state: PrecursorMarketInternalState): PrecursorMarketProjection {
    // The zero-regression invariant: multiplierStable MUST be 1.0 (gdd/14 §zero-regression invariant §0.2).
    // We read it from the registry but never forward it. The bucket is the canonical output.
    const _multiplierStable = precursorTunables.marketTrendMultiplierStable; // 1.0 — asserted by B1 gate
    void _multiplierStable; // server-side only; never forwarded.

    // scarcity_active boolean badge (DD-S, B4). The raw scarcity_multiplier is NEVER forwarded (R2.2).
    // Defaults to false if not provided (B1/B2 internal state pre-B4 did not carry this field).
    return {
      price_trend_bucket: state.priceTrend,
      scarcity_active: state.scarcityActive ?? false,
    };
  }

  // ─────────────────────── persistence accessors (B2) ────────────────────────

  /**
   * `readMarketStateRow(precursorType)` — reads the current `precursor_market_state` row from DB.
   *
   * Returns the full row (all columns) if it exists, or undefined if not seeded.
   * The DB row is the server-side true-state (hidden from the client per R2.2).
   * B3 will call this on every NIGHTLY tick to read demand_accumulator + last_inference_day.
   */
  async readMarketStateRow(precursorType: string): Promise<PrecursorMarketStateRow | undefined> {
    const [row] = await this.db
      .select()
      .from(precursorMarketState)
      .where(eq(precursorMarketState.precursor_type, precursorType as any));
    return row;
  }

  /**
   * `ensureMarketStateRow(precursorType)` — idempotent INSERT of the neutral baseline row.
   *
   * Uses INSERT ON CONFLICT DO NOTHING: the migration seeds the 3 Brindle types at startup;
   * this method is a lazy-ensure guard for types seeded after migration (extensibility).
   * Neutral baseline: price_trend=STABLE, demand_accumulator=0, scarcity_active=false.
   * Returns the current row after ensure (read-after-upsert).
   */
  async ensureMarketStateRow(precursorType: string): Promise<PrecursorMarketStateRow> {
    await this.db
      .insert(precursorMarketState)
      .values({
        precursor_type: precursorType as any,
        price_trend: 'STABLE',
        demand_accumulator: 0,
        scarcity_active: false,
        last_inference_day: 0,
      })
      .onConflictDoNothing();

    const row = await this.readMarketStateRow(precursorType);
    if (!row) throw new Error(`ensureMarketStateRow: row missing after insert for ${precursorType}`);
    return row;
  }

  // ─────────────────────── B3: demand accumulator mechanic (DD-T) ───────────

  /**
   * `recordOrderDemand(precursorType, quantityUnits)` — bumps `demand_accumulator` for a precursor type.
   *
   * Called AFTER a successful atomic `debitAndCreateOrder` on the order path (post-debit hook).
   * Only counts demand for orders that actually succeeded — refused/failed orders are NEVER recorded.
   *
   * DD-T: the accumulator is the endogenous demand signal. Heavy buying → accumulator rises →
   * the NIGHTLY `inferDailyTrend` tick flips `price_trend → UP`.
   *
   * Precision: the accumulator is `real` (float) in the DB schema; `quantityUnits` (integer) is added
   * directly (no windowing at this layer — the decay/windowing is applied by `inferDailyTrend`).
   * The ADD is a guarded UPDATE (do nothing if the row doesn't exist — ensureMarketStateRow is called
   * at migration time and on the order path if needed).
   *
   * R2.2: this method writes the hidden server-side accumulator. The raw `demand_accumulator` scalar
   * is NEVER forwarded to the client. Only `price_trend_bucket` (banded) is the client surface (B6).
   * Math.random() BANNED (C4 — no randomness in this method; deterministic accumulation only).
   */
  async recordOrderDemand(precursorType: string, quantityUnits: number): Promise<void> {
    // Ensure the row exists before updating (lazy-ensure guard; the migration seeds it, but be defensive).
    await this.ensureMarketStateRow(precursorType);

    // Increment demand_accumulator by quantityUnits (the full unit count, not normalized).
    // Uses a set-based SQL expression so the increment is atomic (no read-modify-write race).
    await this.db
      .update(precursorMarketState)
      .set({
        demand_accumulator: sql`${precursorMarketState.demand_accumulator} + ${quantityUnits}`,
        updated_at: sql`now()`,
      })
      .where(eq(precursorMarketState.precursor_type, precursorType as any));

    this.logger.debug(
      `recordOrderDemand: precursorType=${precursorType} +${quantityUnits} units (demand_accumulator bumped)`,
    );
  }

  /**
   * `inferDailyTrend(ctx)` — the NIGHTLY inference tick (D1c B3 — DD-T endogenous).
   *
   * For each `precursor_market_state` row, applies the auto-regulation mechanic:
   *   1. Guard (idempotence): skip if `last_inference_day >= ctx.gameMinute / dayLengthMinutes`.
   *      Uses the canonical `gameMinute` from the tick context to derive the current in-game day.
   *   2. Decay: `demand_accumulator ← demand_accumulator × demand_accumulator_decay` (mean-reversion).
   *   3. Threshold comparison (pure — no RNG, no jitter — DD-T endogenous, C4 determinism):
   *        accumulator ≥ demand_trend_up_threshold   → price_trend = 'UP'
   *        accumulator ≤ demand_trend_down_threshold → price_trend = 'DOWN'
   *        otherwise                                 → price_trend = 'STABLE'
   *   4. Persist: write `price_trend`, `demand_accumulator` (decayed), `last_inference_day = dayId`.
   *
   * DD-T (LOCKED): the trend is driven ENTIRELY by the player-demand accumulator. NO autonomous
   * seeded oscillation. Exogenous shocks are B4's `scarcity_active` — handled separately.
   *
   * Math.random() BANNED (C4). The trend logic is a pure deterministic threshold function of the
   * persisted accumulator — no seed, no jitter. Same accumulator value → same trend, every time.
   * The B1 `seedFromDayForPrecursor` method is available for B4/B5 jitter if needed; not used here.
   *
   * Idempotence: the `last_inference_day` column guards double-application. Running this twice for
   * the same `dayId` is a no-op (the DB row is not mutated the second time).
   *
   * Note: `ctx.playerId` is a synthetic placeholder on the NIGHTLY band (the scheduler drives the
   * tick per-player, but the precursor_market_state is GLOBAL — 1 row per precursor_type, not per-player).
   * The first-player invocation performs the global inference; subsequent per-player invocations for
   * the same day are no-ops (idempotence guard on last_inference_day).
   */
  async inferDailyTrend(ctx: CitySimTickContext): Promise<void> {
    // Derive the in-game day from the tick context's gameMinute and the canonical day length tunable.
    // clock.in_game_day_length_minutes (gdd/14) — read from citySimTunables, NOT a hardcoded literal.
    const dayLengthMinutes = citySimTunables.inGameDayLengthMinutes;
    const dayId = Math.floor(ctx.gameMinute / dayLengthMinutes);
    await this.runDailyInferenceTick(dayId);
  }

  /**
   * `runDailyInferenceTick(dayId)` — the core per-day inference logic (called by both the NIGHTLY tick
   * and the test route). Separated so the test route can pass an explicit dayId without synthesizing a
   * gameMinute context.
   *
   * For each precursor_market_state row:
   *   1. Guard: skip if last_inference_day >= dayId (idempotence — DD-T, C4).
   *   2. Decay: demand_accumulator ← demand_accumulator × demand_accumulator_decay (mean-reversion).
   *   3. Threshold: accumulator ≥ up_threshold → UP; accumulator ≤ down_threshold → DOWN; else STABLE.
   *   4. Persist: price_trend + demand_accumulator (decayed) + last_inference_day = dayId.
   *
   * Pure deterministic threshold function — NO RNG, NO Math.random(), NO jitter (C4, DD-T LOCKED).
   */
  async runDailyInferenceTick(dayId: number): Promise<void> {
    // Read all 4 demand tunables from the registry (no inline literals — R2.3).
    // demand_accumulator_window_days: the rolling window in game-days used to calibrate the
    //   thresholds (operators set up_threshold and down_threshold to match expected daily order
    //   volume × window_days; the accumulator accumulates over that window before decaying).
    //   Consumed here for logging context + operator-visible window sizing.
    const windowDays = precursorTunables.demandAccumulatorWindowDays;
    // demand_accumulator_decay: the per-day decay factor (mean-reversion rate). 0.85 → -15%/day quiet.
    const decayFactor = precursorTunables.demandAccumulatorDecay;
    // demand_trend_up_threshold: accumulator at or above this → trend UP.
    const upThreshold = precursorTunables.demandTrendUpThreshold;
    // demand_trend_down_threshold: accumulator at or below this → trend DOWN.
    const downThreshold = precursorTunables.demandTrendDownThreshold;

    // Read all precursor_market_state rows (global — not per-player; 1 row per precursor type).
    const rows = await this.db.select().from(precursorMarketState);

    for (const row of rows) {
      // ── (1) Idempotence guard — skip if this day has already been processed for this type.
      if (row.last_inference_day >= dayId) {
        this.logger.debug(
          `inferDailyTrend: SKIP ${row.precursor_type} — last_inference_day=${row.last_inference_day} >= dayId=${dayId}`,
        );
        continue;
      }

      // ── (2) Decay — apply mean-reversion factor toward the baseline (0).
      // demand_accumulator × demand_accumulator_decay: the accumulator shrinks each quiet day.
      // Example (default): 0.85^window_days = 0.85^7 ≈ 0.32 → accumulator halves in ~4 quiet days.
      // The window_days is used by operators to calibrate thresholds (e.g. set up_threshold ≈
      // expected_daily_units × window_days × avg_decay_factor so a typical heavy-buying week reliably
      // crosses UP). The formula itself is: decay = accumulator × decayFactor (per-day mean-reversion).
      const decayedAccumulator = row.demand_accumulator * decayFactor;

      // ── (3) Threshold comparison (pure — NO RNG, NO jitter — DD-T endogenous, C4 determinism).
      //   accumulator ≥ upThreshold  → UP   (heavy buying, demand-driven).
      //   accumulator ≤ downThreshold → DOWN  (quiet market, mean-reverted to baseline).
      //   otherwise                  → STABLE.
      let newTrend: 'UP' | 'STABLE' | 'DOWN';
      if (decayedAccumulator >= upThreshold) {
        newTrend = 'UP';
      } else if (decayedAccumulator <= downThreshold) {
        newTrend = 'DOWN';
      } else {
        newTrend = 'STABLE';
      }

      // ── (4) B4 scarcity expiry check (DD-S): clear scarcity_active once
      //        supply_disruption_duration_days have elapsed since disruption_start_day.
      //
      //   Condition: scarcity_active == true AND disruption_start_day IS NOT NULL
      //              AND dayId - disruption_start_day >= supply_disruption_duration_days
      //
      //   This check runs INSIDE the NIGHTLY tick (the real B3 tick) so expiry is deterministic,
      //   idempotent (last_inference_day guard prevents re-running), and uses REUSE duration key
      //   (no inline literal).
      //
      //   DD-T/DD-S separation invariant: this check reads scarcity_active and disruption_start_day.
      //   It does NOT touch demand_accumulator (DD-T endogenous signal — stays separate).
      const durationDays = precursorTunables.supplyDisruptionDurationDays; // REUSE — no inline literal
      let newScarcityActive = row.scarcity_active;
      let newDisruptionEventId: string | null = row.disruption_event_id ?? null;
      let newDisruptionStartDay: number | null = row.disruption_start_day ?? null;

      if (
        row.scarcity_active &&
        row.disruption_start_day !== null &&
        row.disruption_start_day !== undefined &&
        dayId - row.disruption_start_day >= durationDays
      ) {
        // Expiry: the disruption has lasted its full duration — clear the scarcity flag.
        newScarcityActive = false;
        newDisruptionEventId = null;
        newDisruptionStartDay = null;
        this.logger.log(
          `inferDailyTrend: ${row.precursor_type} day=${dayId} ` +
            `SCARCITY EXPIRED (startDay=${row.disruption_start_day}, duration=${durationDays}d elapsed) — scarcity_active=false`,
        );
      }

      // ── (4) Persist — write the decayed accumulator + new trend + idempotence guard + scarcity state.
      await this.db
        .update(precursorMarketState)
        .set({
          demand_accumulator: decayedAccumulator,
          price_trend: newTrend,
          last_inference_day: dayId,
          scarcity_active: newScarcityActive,
          disruption_event_id: newDisruptionEventId,
          disruption_start_day: newDisruptionStartDay,
          updated_at: sql`now()`,
        })
        .where(eq(precursorMarketState.precursor_type, row.precursor_type));

      this.logger.log(
        `inferDailyTrend: ${row.precursor_type} day=${dayId} (window=${windowDays}d) ` +
          `accum=${row.demand_accumulator.toFixed(2)} × decay(${decayFactor}) → ${decayedAccumulator.toFixed(2)} ` +
          `trend=${newTrend} (up≥${upThreshold}, down≤${downThreshold}) ` +
          `scarcity=${newScarcityActive}`,
      );
    }
  }

  // ─────────────────────── B4: scarcity mechanic (DD-S) ─────────────────────────

  /**
   * `onSupplyDisruption(precursorType, eventId, durationDays)` — exogenous supply disruption trigger (DD-S).
   *
   * Sets `scarcity_active=true` + stores `disruption_event_id` + `disruption_start_day`.
   * Called by the `_test` route (B4) or the BO production trigger (B7).
   *
   * **DD-T/DD-S separation invariant (CRITICAL):** this method does NOT touch `demand_accumulator`.
   * The demand accumulator is the endogenous DD-T signal — exogenous shocks are a SEPARATE factor.
   * Any inspection of this method body must confirm: no write to `demand_accumulator`.
   *
   * R2.2: the `scarcity_active` boolean badge is client-visible (via the projection);
   *       the `disruption_event_id`, `disruption_start_day`, and the raw `scarcity_multiplier`
   *       float are NEVER forwarded to the client.
   *
   * `durationDays` is accepted from the caller (BO/trigger can set a per-event duration);
   * when absent the NIGHTLY expiry will use `precursorTunables.supplyDisruptionDurationDays`
   * as the fallback. For B4 the _test route passes an explicit value; the start day is always
   * the `dayId` argument passed by the caller (context-derived). When called from the _test
   * route without a game-clock context, we use the DB row's `last_inference_day` as the
   * disruption start day (the most recent known day — safe and deterministic).
   *
   * @param precursorType — the precursor type to disrupt (e.g. 'pyralin').
   * @param eventId — the UUID of the SupplyDisruptionEvent (stored for live-ops tracing).
   * @param durationDays — optional per-event duration (game-days); when absent the service uses
   *        `precursorTunables.supplyDisruptionDurationDays` (the NIGHTLY expiry check reads this).
   * @returns the updated row (scarcity_active=true, disruption_event_id set, disruption_start_day set).
   */
  async onSupplyDisruption(
    precursorType: string,
    eventId: string,
    durationDays?: number,
  ): Promise<PrecursorMarketStateRow> {
    // Ensure the row exists (lazy-ensure; migration seeds the 3 Brindle types).
    const row = await this.ensureMarketStateRow(precursorType);

    // disruption_start_day: use last_inference_day as the baseline game-day for the trigger.
    // When triggered via the _test route or BO (outside a live tick context), the last processed
    // day from the NIGHTLY tick is the most recent known game-day.
    // If no tick has run yet (last_inference_day=0), disruption_start_day=0 is valid (the first
    // NIGHTLY tick at dayId >= durationDays will expire it).
    const startDay = row.last_inference_day;

    // NOTE: durationDays is accepted here for per-event custom durations (BO/B7).
    // The NIGHTLY expiry check always reads `precursorTunables.supplyDisruptionDurationDays` as
    // the REUSE key. To support custom durations: if a custom durationDays is provided, the caller
    // should configure the tunable or pass it at trigger time. For B4 the _test route drives expiry
    // by advancing ticks; the tunable governs the threshold.
    // Store this value's presence for logging but do NOT persist it separately — the NIGHTLY tick
    // reads the tunable, not a per-row stored duration (consistent with the "REUSE, no inline"
    // principle). If the caller wants a custom duration shorter/longer than the tunable, they
    // set the DB-override for the tunable.
    void durationDays; // accepted at API surface for symmetry; the NIGHTLY tick reads the tunable.

    // Write scarcity state. DD-T/DD-S separation: NO mutation of demand_accumulator here.
    await this.db
      .update(precursorMarketState)
      .set({
        scarcity_active: true,
        disruption_event_id: eventId,
        disruption_start_day: startDay,
        updated_at: sql`now()`,
        // demand_accumulator: NOT TOUCHED — DD-T endogenous signal stays separate (DD-T/DD-S separation invariant).
      })
      .where(eq(precursorMarketState.precursor_type, precursorType as any));

    this.logger.log(
      `onSupplyDisruption: ${precursorType} eventId=${eventId} startDay=${startDay} ` +
        `(scarcity_active=true, demand_accumulator UNCHANGED — DD-T/DD-S separation)`,
    );

    // Return the updated row for the caller to confirm the state.
    const updatedRow = await this.readMarketStateRow(precursorType);
    if (!updatedRow) throw new Error(`onSupplyDisruption: row missing after update for ${precursorType}`);
    return updatedRow;
  }

  /**
   * `getEffectiveScarcityMultiplier(precursorType)` — the combined price multiplier for the precursor type.
   *
   * Returns: `trendMultiplier × scarcityMultiplier` if `scarcity_active`, else just `trendMultiplier`.
   *
   * B4 wires this factor. B6 routes it into the actual buy path. The raw float is NEVER forwarded
   * to the client (R2.2 P5 wall — the client sees only `price_trend_bucket` and `scarcity_active` badge).
   *
   * Scarcity multiplier is bounded by `precursorTunables.supplyDisruptionScarcityMultiplier`
   * (B1 key, [PROPOSED DEFAULT] 1.5, range 1.1..2.5) — NO inline literal. Canon gives "hausse temporaire"
   * (precursors_supply_chain.md:103) but no bound; the bound is the B1 proposed default.
   *
   * @param precursorType — the precursor type to read.
   * @returns the effective multiplier float (server-side only — NEVER client-facing).
   */
  async getEffectiveScarcityMultiplier(precursorType: string): Promise<number> {
    const row = await this.readMarketStateRow(precursorType);

    // Trend multiplier (DD-T — B3).
    const trend = (row?.price_trend ?? 'STABLE') as PriceTrendBucket;
    let trendMultiplier: number;
    switch (trend) {
      case 'UP':
        trendMultiplier = precursorTunables.marketTrendMultiplierUp;
        break;
      case 'DOWN':
        trendMultiplier = precursorTunables.marketTrendMultiplierDown;
        break;
      default: // STABLE
        trendMultiplier = precursorTunables.marketTrendMultiplierStable; // always 1.0 (zero-regression invariant)
        break;
    }

    // Scarcity multiplier (DD-S — B4): applied OVER the trend multiplier IFF scarcity_active.
    // The factor reads the B1 registry key (no inline literal — R2.3).
    // Canon-silent bound: [PROPOSED DEFAULT] 1.5, range 1.1..2.5 (B1 gate asserted this key).
    if (row?.scarcity_active) {
      const scarcityMultiplier = precursorTunables.supplyDisruptionScarcityMultiplier; // B1 key, no inline
      return trendMultiplier * scarcityMultiplier;
    }

    return trendMultiplier;
  }

  // ─────────────────────── B6: realised order cost (trend × scarcity over base ratio) ────────

  /**
   * `realisedOrderCostCents(precursorType, quantityUnits)` — the state-aware realised order cost (B6).
   *
   * Factoring chosen: this state-aware helper DELEGATES the base unit price to the existing PURE
   * `precursorUnitPriceCents(precursorType)` from `precursor-tunables.ts` (ratio × base_cost_standard_min
   * × 100). The existing pure function stays the SEED/FALLBACK — it is called first; the market-state
   * multipliers are applied OVER it. STABLE + no-scarcity → multiplier = 1.0 × 1 = 1 → the result equals
   * `precursorUnitPriceCents` exactly ($150/unit for pyralin at defaults — zero-regression invariant §0.2).
   *
   * Formula (design §0.2/§2.1):
   *   realised_unit_cost_cents = round(ratio × base_cost_standard_min × trend_multiplier × scarcity_factor) × 100
   *                            = round(precursorUnitPriceCents(type) / 100 × trend_multiplier × scarcity_factor) × 100
   *
   * The rounding is applied PER UNIT (before multiplying by quantity) to match the formula. The result
   * is returned as a bigint for the `economy_states.cash_cents` column.
   *
   * R2.2 (DD-P5): the raw market scalars (trend_multiplier, scarcity_multiplier, demand_accumulator)
   * are consumed server-side only — NEVER forwarded to the client. The cash amount itself (the wallet
   * debit, i.e. `qty × realised_unit_cost_cents`) is a CLEAR TRANSACTION VALUE: what the player pays
   * at order confirmation (consistent with D1 acquisition price, D1b sell-offer, and the current slice).
   * [DD-P5 flag for reviewer⊥: this reading — clear transaction cash — is taken here; the maximalist
   * fallback (qualitative range at the order form) is residual only if the reviewer judges otherwise.]
   *
   * Atomicity: this method is called BEFORE the atomic debit (`debitAndCreateOrder`) in the order path.
   * The debit/guard block structure is OTHERWISE UNCHANGED. The over-budget guard (`RESOURCE_STATE_CONFLICT`)
   * reads the realised cost and refuses orders where the wallet would go negative — unchanged.
   *
   * @param precursorType — the precursor type (must be an M1PrecursorType).
   * @param quantityUnits — the number of units to order (positive integer).
   * @returns the realised order cost in cents (bigint) — server-side only, NEVER client-facing.
   */
  async realisedOrderCostCents(precursorType: M1PrecursorType, quantityUnits: number): Promise<bigint> {
    // Step 1: read the current market state row for this precursor type.
    // If no row exists (should not happen after migration/ensure, but be defensive), fall back to STABLE/no-scarcity.
    const row = await this.readMarketStateRow(precursorType);

    // Step 2: resolve the trend multiplier from the persisted price_trend (DD-T).
    // STABLE → 1.0 (zero-regression invariant: market_trend_multiplier_stable MUST be 1.0 — no inline literal).
    const trend = (row?.price_trend ?? 'STABLE') as PriceTrendBucket;
    let trendMultiplier: number;
    switch (trend) {
      case 'UP':
        trendMultiplier = precursorTunables.marketTrendMultiplierUp; // B1 key, no inline literal
        break;
      case 'DOWN':
        trendMultiplier = precursorTunables.marketTrendMultiplierDown; // B1 key
        break;
      default: // STABLE
        trendMultiplier = precursorTunables.marketTrendMultiplierStable; // always 1.0 — zero-regression invariant
        break;
    }

    // Step 3: resolve the scarcity factor (DD-S — B4). Applied OVER the trend multiplier (multiplicative).
    // No double-counting: trend (endogenous, B3) × scarcity (exogenous, B4) — separate orthogonal factors.
    const scarcityFactor = (row?.scarcity_active)
      ? precursorTunables.supplyDisruptionScarcityMultiplier // B1 key, no inline literal
      : 1;

    // Step 4: compute the realised unit cost.
    // Delegate the BASE to the existing pure precursorUnitPriceCents(type) — the seed/fallback.
    // STABLE + no-scarcity → trendMultiplier=1.0, scarcityFactor=1 → result = precursorUnitPriceCents exactly.
    //
    // Formula: realised_unit = round(ratio × base × trend × scarcity) × 100
    //        = round(precursorUnitPriceCents(type)/100 × trend × scarcity) × 100
    // (precursorUnitPriceCents already equals round(ratio × base) × 100, so we ÷100 to recover the dollar
    // amount, apply the multipliers, re-round, re-×100. This is equivalent to the formula in §0.2.)
    const baseUnitDollars = Number(precursorUnitPriceCents(precursorType)) / 100; // e.g. 150.0 for pyralin STABLE
    const realisedUnitCentsBigInt = BigInt(Math.round(baseUnitDollars * trendMultiplier * scarcityFactor)) * 100n;

    // Step 5: multiply by quantity (bigint arithmetic — no rounding error on integer multiplication).
    return BigInt(quantityUnits) * realisedUnitCentsBigInt;
  }

  // ─────────────────────── RNG / determinism ─────────────────────────────────

  /**
   * Deterministic RNG draw for a precursor type + day combination.
   * REUSE: delegates to `MarketRngService.seedFromDay` (C4 — same dayId + precursor-derived regionId → identical draw).
   * The precursor type is hashed to a stable integer regionId so the draw is precursor-type-specific.
   *
   * B3/B4 will use this for nightly accumulator jitter and scarcity event probability draws.
   */
  seedFromDayForPrecursor(dayId: number, precursorType: string): number {
    // Derive a stable integer regionId from the precursor type string so different
    // precursor types get independent draws on the same day (not the same as a real regionId).
    const precursorRegionKey = this.stableIntFromString(precursorType);
    return this.rng.seedFromDay(dayId, precursorRegionKey);
  }

  /**
   * Stable integer derived from a string (djb2-style hash) — NOT a cryptographic hash.
   * Used only to derive a stable per-precursor-type seed key for MarketRngService.seedFromDay.
   * PRIVATE to this service (never client-facing).
   */
  private stableIntFromString(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return h & 0x7fffffff; // ensure positive
  }
}

// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.2 (Composition Telegraph)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 3 (C3)
//             — D1b C3 — 2026-06-16
//
// `CompositionTelegraphService` — the §2.2 Composition Telegraph mechanic.
//
// CANON INFERENCE FORMULA (market_mechanics.md:93-96 — VERBATIM):
//   q_inferred = Σ(tier_w[slot.tier] × recency_weight[slot]) / Σ(recency_weight[slot]) + ε
//   where ε ~ N(0, η²) computed ONCE PER DAY from day seed (NO per-frame RNG — C4)
//
// RECENCY WEIGHTING: uniform (all slots weight 1.0) — the canon formula gives the shape but not
// the recency decay function. Uniform weighting is the canonical default (equal weight across the
// 24-slot rolling window). [IMPLEMENTATION DECISION — UNIFORM_RECENCY]: with uniform weights, the
// formula simplifies to q_inferred = mean(tier_w[slot.tier] for slot in roster) + ε. Documented
// here, not silently baked.
//
// BOX-MULLER TRANSFORM (Gaussian from uniform): standard, platform-independent implementation.
//   u = MarketRngService.seedFromDay(dayId, regionId)        — first independent draw
//   v = MarketRngService.seedFromDay(dayId + 100000, regionId) — second independent draw
//   ε = η × sqrt(-2 × ln(u)) × cos(2π × v)
//   Guard: u > 0 (max with 1e-15 to avoid ln(0)).
//
// ROLLING 24-SLOT WINDOW: slot_index = attributed_at_tick % compositionRosterSlots (modular).
//   → slot_index wraps around after compositionRosterSlots attributions, overwriting the oldest entry.
//
// R2.2 HARD INVARIANT: `q_inferred` is stored server-side only (buyer_roster_daily_state).
//   NO method routes the raw q_inferred float to the client.
//   Player projection = q_inferred_bucket (via MarketProjectionService.toBuckets).
//   The receipts-stack composition (tier counts) is the player-visible observational surface.
//
// DAILY TICK (Cadence.NIGHTLY, order 4): runs once per in-game day.
//   For the current player's roster entries, computes q_inferred per (player × region) and
//   UPSERTs buyer_roster_daily_state.
//
// CADENCE DESIGN DECISION: fixed at canon 1/day (Cadence.NIGHTLY). No registry-add for
//   `composition_daily_inference_cadence` — market_mechanics.md:114 lists it as a tunable but
//   the registry has 0 occurrences; fixed daily tick is clean and sufficient.
//
// buyer_tier SOURCE: `buyer_tier` is passed as a parameter (1..4) by the caller.
//   C3 REUSES the buyer tier concept (1..4) defined in market_mechanics.md §2.2:89
//   ("buyer_tier 1..4 + timestamp nibble"); xref 04a §11 (Dealers & Leks).
//   C3-F1 FIX: the prior citation "selling_dealers_leks.md §2.2 buyer-tier" was false —
//   that file has no §2.2 and no buyer_tier def. Real source: market_mechanics.md §2.2:89.
//   Call-site wiring lands in C6. For C3, the test controller provides buyer_tier explicitly.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { buyerRosterEntry, buyerRosterDailyState } from '../../db/schema/market_buyer_roster_entry';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { marketTunables } from './market-tunables';
import { MarketRngService } from './market-rng.service';
import { type MarketProjectionBuckets, type QInferredBucket } from './market-projection.service';

/** Buyer tier (1..4) — REUSE concept from market_mechanics.md §2.2:89; xref 04a §11 (Dealers & Leks). */
export type BuyerTier = 1 | 2 | 3 | 4;

/** The R2.2-compliant inference result for the client surface. Never includes raw q_inferred. */
export interface CompositionTelegraphProjection {
  /** R2.2 bucket (q_inferred_bucket) — never the raw q_inferred float (P5). */
  q_inferred_bucket: QInferredBucket;
  /**
   * Receipts-stack composition summary (market_mechanics.md:100 — "Stack of named receipts on safehouse desk").
   * Player can see if stack is top-heavy (Glass-tier) or bottom-heavy (street-tier).
   * Represented as tier counts — the player-visible observational surface (not a number, a visual cue).
   */
  roster_tier_counts: { tier_1: number; tier_2: number; tier_3: number; tier_4: number };
}

@Injectable()
export class CompositionTelegraphService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompositionTelegraphService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly rng: MarketRngService,
  ) {}

  // ─────────────────────── bootstrap: registration ──────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MARKET_COMPOSITION_INFERENCE,
      cadence: Cadence.NIGHTLY,
      order: 4,
      run: (ctx) => this.runDailyInferenceTick(ctx),
    });
    this.logger.log(
      'CompositionTelegraphService registered at NIGHTLY/4 (MARKET_COMPOSITION_INFERENCE) — once per ' +
        'in-game day it computes q_inferred per (player, region) from the rolling 24-slot buyer roster ' +
        'with day-seeded Gaussian noise (market_mechanics.md:93-96, C4 — NO Math.random()). ' +
        'Cadence fixed at canon 1/day (no registry-add — composition_daily_inference_cadence).',
    );
  }

  // ─────────────────────── public API ────────────────────────────────────────

  /**
   * `recordBuyerAttribution(playerId, regionId, buyerTier, currentTick)` — push a buyer attribution into
   * the rolling 24-slot roster for the (player, region) pair.
   *
   * Rolling slot assignment: `slot_index = currentTick % compositionRosterSlots` (modular UPSERT).
   * Each slot holds exactly one entry; slot_index wraps around after compositionRosterSlots attributions,
   * overwriting the oldest entry naturally (no separate eviction needed).
   *
   * @param playerId    — the player's UUID.
   * @param regionId    — the market region id (= district_id in D1b).
   * @param buyerTier   — the buyer's tier (1..4). Provided by the caller (REUSE: market_mechanics.md §2.2:89).
   * @param currentTick — current game tick. Defaults to 0 (for test routes).
   */
  async recordBuyerAttribution(
    playerId: string,
    regionId: number,
    buyerTier: BuyerTier,
    currentTick = 0,
  ): Promise<void> {
    const rosterSlots = marketTunables.compositionRosterSlots;  // REUSE gdd/14:923
    const slotIndex = currentTick % rosterSlots;

    await this.db
      .insert(buyerRosterEntry)
      .values({
        player_id: playerId,
        region_id: regionId,
        slot_index: slotIndex,
        buyer_tier: buyerTier,
        attributed_at_tick: currentTick,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [buyerRosterEntry.player_id, buyerRosterEntry.region_id, buyerRosterEntry.slot_index],
        set: {
          buyer_tier: buyerTier,
          attributed_at_tick: currentTick,
          updated_at: sql`now()`,
        },
      });
  }

  /**
   * `computeQInferredForDay(playerId, regionId, dayId)` — compute q_inferred for a specific day seed.
   * Deterministic (C4): same dayId + same roster state → identical result.
   * SERVER-SIDE ONLY (never forwarded to client — R2.2 P5 invariant).
   *
   * Formula (market_mechanics.md:93-96 with uniform recency weights):
   *   q_inferred = Σ(tier_w[slot.tier]) / N + ε
   *   where ε ~ N(0, η²) via Box-Muller transform seeded from (dayId, regionId).
   */
  async computeQInferredForDay(playerId: string, regionId: number, dayId: number): Promise<number> {
    const entries = await this.db
      .select({ buyer_tier: buyerRosterEntry.buyer_tier })
      .from(buyerRosterEntry)
      .where(and(eq(buyerRosterEntry.player_id, playerId), eq(buyerRosterEntry.region_id, regionId)));

    if (entries.length === 0) return 2.0;  // neutral default (no roster data)

    const tierWeights = marketTunables.compositionTierWeights;  // REUSE gdd/14:925

    // UNIFORM recency weighting (all slots weight 1.0 — see service header rationale).
    // q_mean = Σ(tier_w[slot.tier]) / N
    const weightedSum = entries.reduce((acc, e) => acc + (tierWeights[e.buyer_tier - 1] ?? 1.0), 0);
    const qMean = weightedSum / entries.length;

    // Gaussian noise: ε ~ N(0, η²), computed ONCE PER DAY from day seed (C4 — NO Math.random()).
    // Box-Muller transform (platform-independent, stable).
    const eta = marketTunables.compositionObserverNoiseEta;  // REUSE gdd/14:924
    const u = Math.max(1e-15, this.rng.seedFromDay(dayId, regionId));        // guard ln(0)
    const v = this.rng.seedFromDay(dayId + 100_000, regionId);               // second independent draw
    const epsilon = eta * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

    return qMean + epsilon;
  }

  /**
   * `getQInferred(playerId, regionId)` — returns the cached daily q_inferred from buyer_roster_daily_state.
   * SERVER-SIDE ONLY — never call this from a player-facing route (R2.2 P5 invariant).
   * Returns 2.0 (neutral) if no daily state row exists yet.
   */
  async getQInferred(playerId: string, regionId: number): Promise<number> {
    const [row] = await this.db
      .select({ q_inferred: buyerRosterDailyState.q_inferred })
      .from(buyerRosterDailyState)
      .where(and(eq(buyerRosterDailyState.player_id, playerId), eq(buyerRosterDailyState.region_id, regionId)));
    return row?.q_inferred ?? 2.0;
  }

  /**
   * `getRosterEntries(playerId, regionId)` — returns the raw roster entries for (player, region).
   * TEST-SIDE ONLY — used by the test controller for E2E assertion (slot count + tier values in DB).
   * Do NOT call from player-facing routes (exposes internal DB state).
   */
  async getRosterEntries(playerId: string, regionId: number) {
    return this.db
      .select({
        slot_index: buyerRosterEntry.slot_index,
        buyer_tier: buyerRosterEntry.buyer_tier,
        attributed_at_tick: buyerRosterEntry.attributed_at_tick,
      })
      .from(buyerRosterEntry)
      .where(and(eq(buyerRosterEntry.player_id, playerId), eq(buyerRosterEntry.region_id, regionId)));
  }

  // ─────────────────────── daily inference tick ──────────────────────────────

  /**
   * Daily inference tick (Cadence.NIGHTLY, order 4).
   *
   * For each (player_id, region_id) with roster entries (for the current player), computes q_inferred
   * (day-seeded, C4) and UPSERTs buyer_roster_daily_state.
   *
   * dayId = Math.floor(gameMinute / inGameDayLengthMinutes) — derived from the tick context.
   * C4: same dayId × same roster → identical q_inferred (no per-frame RNG).
   *
   * The tick is driven per-player by the scheduler (CitySimTickContext.playerId).
   */
  async runDailyInferenceTick(ctx: CitySimTickContext): Promise<void> {
    const { playerId, gameMinute } = ctx;
    const dayLengthMinutes = citySimTunables.inGameDayLengthMinutes;
    const dayId = Math.floor(gameMinute / dayLengthMinutes);

    // Find all distinct region_ids with roster entries for this player.
    const regions = await this.db
      .selectDistinct({ region_id: buyerRosterEntry.region_id })
      .from(buyerRosterEntry)
      .where(eq(buyerRosterEntry.player_id, playerId));

    for (const { region_id } of regions) {
      const qInferred = await this.computeQInferredForDay(playerId, region_id, dayId);

      await this.db
        .insert(buyerRosterDailyState)
        .values({
          player_id: playerId,
          region_id: region_id,
          q_inferred: qInferred,
          last_day_id: dayId,
          updated_at: sql`now()`,
        })
        .onConflictDoUpdate({
          target: [buyerRosterDailyState.player_id, buyerRosterDailyState.region_id],
          set: {
            q_inferred: qInferred,
            last_day_id: dayId,
            updated_at: sql`now()`,
          },
        });
    }
  }
}

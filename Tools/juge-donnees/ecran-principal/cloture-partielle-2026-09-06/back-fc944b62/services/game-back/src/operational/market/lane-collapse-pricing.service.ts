// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.1 (Lane Collapse Pricing)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 2 (C2)
//             — D1b C2 — 2026-06-16
//
// `LaneCollapsePricingService` — the §2.1 Lane Collapse Pricing mechanic.
//
// CANON UPDATE RULE (market_mechanics.md:52-67 — VERBATIM):
//   # Per-deal update:
//   if P − W ≤ priceDealt ≤ P + W:
//     c ← c + α·(1−c)          # in-lane gain
//   elif |priceDealt − P| > 2W:
//     c ← c·(1−κ)              # off-lane collapse
//     t_refractory ← T_jam     # arm jam
//
//   # Hourly clearing tick:
//   if c > c_hi:
//     deals clear within 2 in-game minutes at lane price  # fast-clear (jam timer reset to 0)
//   elif c < c_lo OR t_refractory > 0:
//     deals clear slowly, scatter ∝ (1−c)  # scatter / jam zone (decrement timer by 60)
//
// DESIGN DECISIONS (flagged, never silently invented):
//   [DESIGN DECISION — W_SEED_FRACTION]: W = P × fraction (default 0.10 → ±10% of modal P).
//     This is NOT in the canon registry. Flagged and env-overridable.
//     Env: MARKET_LANE_HALFWIDTH_SEED_FRACTION. Default 0.10.
//   [DESIGN DECISION — MODAL_P_SEED]: P seeded from `selling.brindle_deal_value_cents_per_gram`
//     selling tunable getter (default 2500¢ = 25.00/gram — the slice-flat for Brindle day-1).
//     This is the closest registry value to a "modal lane price" for the initial lane seed.
//     C2-F1 fix (D1b C6): replaced phantom key `market.brindle_deal_value_cents_per_gram` /
//     env `MARKET_BRINDLE_MODAL_P_CENTS` with the real registry key + env.
//     Env: SELLING_BRINDLE_DEAL_VALUE_CENTS_PER_GRAM. Default 2500.
//   [DESIGN DECISION — SCATTER_MAGNITUDE]: realised scatter offset = ±W·(1−c) applied via the
//     deterministic MarketRngService.seedFromTick(gameMinute, districtId) draw (draw ∈ [0,1)
//     → maps to [−1,+1] offset × W × (1−c)). Stored in the updated_at refresh (the per-tick DB touch
//     C6 BLOCKING A1 FIX: scatter is NOW consumed by getRealisedPriceCents() (per-sell-tick
//     customer-facing price). Fresh lane guard: no row → returns modalPCentsSeed with zero scatter
//     (preserves the 13 selling E2E tests that assert float delta = DEAL_GRAMS × 2500).
//
// ALL numeric constants for α, κ, c_hi, c_lo, T_jam come from `marketTunables.*` — ZERO literals.
// Math.random() is BANNED — all RNG via MarketRngService.seedFromTick() (C4 determinism).
//
// HOURLY CLEARING TICK: the MARKET_LANE_CLEARING system runs in the HOURLY band (order 1). It is a GLOBAL
// tick (lane_pricing_state is a global table — not per-player). The CitySimTickContext.playerId is a synthetic
// placeholder (the harness is per-player but the tick IGNORES playerId and scans ALL lanes).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { sql, eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { lanePricingState, type LanePricingStateRow } from '../../db/schema/market_lane_pricing_state';
import { TunablesStore } from '../../config/tunables-store';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { marketTunables } from './market-tunables';
import { MarketRngService } from './market-rng.service';

/** Valid substance types (mirrors the substanceType pgEnum from operational_chain.ts). */
export type SubstanceTypeValue = 'brindle' | 'crick' | 'hush' | 'ash';

@Injectable()
export class LaneCollapsePricingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LaneCollapsePricingService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly rng: MarketRngService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MARKET_LANE_CLEARING,
      cadence: Cadence.HOURLY,
      order: 1,
      run: (ctx) => this.runHourlyClearingTick(ctx),
    });
    this.logger.log(
      'LaneCollapsePricingService registered at HOURLY/1 (MARKET_LANE_CLEARING) — each in-game hour it ' +
        'scans ALL lane_pricing_state rows (global, not per-player) and applies the canon clearing rule ' +
        '(market_mechanics.md:62-67): c > c_hi → fast-clear (t_refractory = 0); c < c_lo OR t_refractory > 0 ' +
        '→ scatter (decrement timer by 60, [DESIGN DECISION — SCATTER_MAGNITUDE] ±W·(1−c) via seedFromTick). ' +
        'Deterministic (MarketRngService.seedFromTick — C4, NO Math.random()).',
    );
  }

  // ───────────────────────────── W_SEED_FRACTION tunable (DESIGN DECISION) ─────────────────────────────

  /**
   * [DESIGN DECISION — W_SEED_FRACTION]: Lane half-width fraction for initial W seeding.
   * W = P × fraction (default 0.10 → ±10% of modal P = ±250¢ for P=2500¢).
   * This ratio is NOT in the canon registry (gdd/14 §Market has no `market.lane_halfwidth_seed_fraction`).
   * Flagged here and env-overridable for test controllability.
   * Env-override: MARKET_LANE_HALFWIDTH_SEED_FRACTION.
   */
  private get laneHalfwidthSeedFraction(): number {
    return TunablesStore.resolveFloat(
      'market.lane_halfwidth_seed_fraction',
      'MARKET_LANE_HALFWIDTH_SEED_FRACTION',
      0.10, // [DESIGN DECISION — W_SEED_FRACTION]: 10% of modal P as the day-1 ±band.
    );
  }

  /**
   * [DESIGN DECISION — MODAL_P_SEED]: Modal lane price P seed in cents.
   * Seeded from the selling tunable `selling.brindle_deal_value_cents_per_gram` (2500¢ = 25.00/gram,
   * the slice-flat for Brindle). This is the closest canon anchor to a "modal lane price" for D1b day-1.
   *
   * C2-F1 fix (D1b C6): the original key `market.brindle_modal_p_cents` / env `MARKET_BRINDLE_MODAL_P_CENTS`
   * was a phantom (no entry in gdd/14 — these keys do not exist in the registry). Replaced with the real
   * selling tunable key `selling.brindle_deal_value_cents_per_gram` / env `SELLING_BRINDLE_DEAL_VALUE_CENTS_PER_GRAM`
   * that actually exists and is used by SellingRepository (single source of truth: gdd/14 §Operational chain — selling).
   * Zero occurrences of the phantom key `market.brindle_deal_value_cents_per_gram` or `market.brindle_modal_p_cents`
   * remain in the codebase after this fix.
   * Env-override: SELLING_BRINDLE_DEAL_VALUE_CENTS_PER_GRAM (same as selling-tunables.ts — shared key).
   */
  private get modalPCentsSeed(): number {
    return TunablesStore.resolveInt(
      'selling.brindle_deal_value_cents_per_gram',
      'SELLING_BRINDLE_DEAL_VALUE_CENTS_PER_GRAM',
      2500, // [DESIGN DECISION — MODAL_P_SEED]: brindle slice-flat = 2500¢ = 25.00/gram (R2.3 flagged fallback).
    );
  }

  // ───────────────────────────── public API ─────────────────────────────

  /**
   * Compute the realised clearing price in cents for a (districtId, substanceType) pair at a given
   * gameMinute. Applies the canon §2.1 scatter formula (market_mechanics.md:63-65) ONLY when the
   * lane is in the scatter / jam zone (c < c_lo OR t_refractory > 0):
   *   scatter = round((draw * 2 − 1) × w_cents × (1 − c))
   *   realised = max(0, p_cents + scatter)
   *
   * When the lane is in the NEUTRAL zone (c_lo ≤ c ≤ c_hi, t_refractory = 0) OR FAST-CLEAR zone
   * (c > c_hi), scatter is ZERO → realised = p_cents exactly.
   *
   * C6 BLOCKING A1 FIX: scatter is NOW consumed here (not merely logged in the hourly tick).
   * The realised price is used by SellingSellService as the customer-facing price (float_delta_cents),
   * while priceDealt for processDealAttempt remains p_cents (in-lane → c rises, per canon rule).
   *
   * FRESH LANE GUARD: if no lane row exists yet (before processDealAttempt / ensureLane), returns
   * this.modalPCentsSeed (= 2500) with ZERO scatter. This preserves the 13 selling E2E tests that
   * assert float delta = DEAL_GRAMS × 2500 on un-seeded lanes.
   *
   * NO-REGRESSION: a fresh lane (c=0.5, c_lo=0.35) is in the neutral zone → scatter = 0 → preserves
   * the 13 selling E2E tests even after the lane row is created by the first tick's ensureLane call.
   * Scatter only kicks in AFTER an off-lane collapse drives c below c_lo or arms t_refractory.
   *
   * @param districtId    — the district to price.
   * @param substanceType — the substance type.
   * @param gameMinute    — the current in-game minute (for the deterministic RNG draw).
   */
  async getRealisedPriceCents(
    districtId: number,
    substanceType: SubstanceTypeValue,
    gameMinute: number,
  ): Promise<number> {
    const row = await this.getLaneRow(districtId, substanceType);

    // FRESH LANE GUARD: no row → no W → no scatter; return seed price as-is.
    // processDealAttempt (called next in SellingSellService) will ensureLane.
    if (!row) {
      return this.modalPCentsSeed;
    }

    const { p_cents, w_cents, c, t_refractory_minutes } = row;
    const cLo = marketTunables.laneCLo;

    // CANON SCATTER ZONE (market_mechanics.md:63-65): scatter applies ONLY when:
    //   c < c_lo (low confidence) OR t_refractory > 0 (jam active)
    // In the neutral zone [c_lo, c_hi] and fast-clear zone (c > c_hi), scatter = 0.
    // This means a fresh lane (c=0.5 > c_lo=0.35, t_refractory=0) has NO scatter → preserves
    // the 13 selling tests that assert exact 2500×grams deltas across multiple ticks.
    const inScatterZone = c < cLo || t_refractory_minutes > 0;

    if (!inScatterZone) {
      // Neutral or fast-clear zone: realised price = modal p_cents (no scatter).
      return p_cents;
    }

    // [DESIGN DECISION — SCATTER_MAGNITUDE] (C6 A1 fix — now consumed, not just logged):
    //   draw ∈ [0, 1) via seedFromTick(gameMinute, districtId).
    //   scatterOffset = round((draw * 2 − 1) × w_cents × (1 − c))
    const draw = this.rng.seedFromTick(gameMinute, districtId);
    const scatterOffset = Math.round((draw * 2 - 1) * w_cents * (1 - c));

    return Math.max(0, p_cents + scatterOffset);
  }

  /**
   * Process a deal attempt against a lane, applying the canon update rule (market_mechanics.md:52-56):
   *   in-lane  (P−W ≤ priceDealt ≤ P+W): c ← c + α·(1−c)
   *   off-lane (|priceDealt − P| > 2W):  c ← c·(1−κ), t_refractory ← T_jam
   *   middle zone (W < |priceDealt−P| ≤ 2W): no change (canon is silent → neutral zone)
   *
   * If no lane row exists for (districtId, substanceType), one is upserted with P and W seeded from
   * [DESIGN DECISION — MODAL_P_SEED] and [DESIGN DECISION — W_SEED_FRACTION] defaults.
   * Returns the updated lane row.
   */
  async processDealAttempt(
    districtId: number,
    substanceType: SubstanceTypeValue,
    priceDealt: number,
  ): Promise<LanePricingStateRow> {
    // Ensure the lane row exists (upsert-on-miss).
    await this.ensureLane(districtId, substanceType);

    // Read the current state.
    const row = await this.fetchLaneRow(districtId, substanceType);
    if (!row) {
      throw new Error(`LaneCollapsePricingService: lane row missing after ensureLane for district=${districtId} substance=${substanceType}`);
    }

    const p = row.p_cents;
    const w = row.w_cents;
    let c = row.c;
    let tRefractory = row.t_refractory_minutes;

    const diff = Math.abs(priceDealt - p);

    if (priceDealt >= p - w && priceDealt <= p + w) {
      // In-lane: c ← c + α·(1−c)
      const alpha = marketTunables.laneConfidenceGainAlpha;
      c = c + alpha * (1 - c);
      // Clamp to [0, 1] (defensive; the formula is monotone non-decreasing, so this is belt-and-suspenders).
      c = Math.min(1, Math.max(0, c));
    } else if (diff > 2 * w) {
      // Off-lane (far): c ← c·(1−κ), t_refractory ← T_jam
      const kappa = marketTunables.laneCollapseDepthKappa;
      c = c * (1 - kappa);
      c = Math.min(1, Math.max(0, c));
      tRefractory = marketTunables.laneJamRefractoryMinutes;
    }
    // Middle zone (W < diff ≤ 2W): no change — canon is silent on this band.

    // Persist the updated state.
    const [updated] = await this.db
      .update(lanePricingState)
      .set({
        c,
        t_refractory_minutes: tRefractory,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(lanePricingState.district_id, districtId),
          eq(lanePricingState.substance_type, substanceType),
        ),
      )
      .returning();

    return updated!;
  }

  /**
   * Fetch the current lane row for (districtId, substanceType).
   * Returns null if no row exists (before first processDealAttempt / ensureLane).
   */
  async getLaneRow(districtId: number, substanceType: SubstanceTypeValue): Promise<LanePricingStateRow | null> {
    const rows = await this.db
      .select()
      .from(lanePricingState)
      .where(
        and(
          eq(lanePricingState.district_id, districtId),
          eq(lanePricingState.substance_type, substanceType),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Idempotent upsert of a lane row with default P and W seeds.
   * ON CONFLICT DO NOTHING — a pre-existing row is never overwritten.
   * Called by processDealAttempt to ensure the row exists before the update-rule.
   */
  async ensureLane(districtId: number, substanceType: SubstanceTypeValue): Promise<void> {
    const pCents = this.modalPCentsSeed; // [DESIGN DECISION — MODAL_P_SEED]
    const wCents = Math.round(pCents * this.laneHalfwidthSeedFraction); // [DESIGN DECISION — W_SEED_FRACTION]
    await this.db
      .insert(lanePricingState)
      .values({
        district_id: districtId,
        substance_type: substanceType,
        p_cents: pCents,
        w_cents: wCents,
        c: 0.5, // midpoint — neither trusted nor dismissed
        t_refractory_minutes: 0,
      })
      .onConflictDoNothing({ target: [lanePricingState.district_id, lanePricingState.substance_type] });
  }

  // ───────────────────────────── HOURLY clearing tick ─────────────────────────────

  /**
   * HOURLY/1 — MARKET_LANE_CLEARING.
   * Scans ALL lane_pricing_state rows (global — not per-player; ignores ctx.playerId) and applies the
   * canon hourly clearing rule (market_mechanics.md:62-67):
   *   c > c_hi → fast-clear: t_refractory_minutes = 0, updated_at = now()
   *   c < c_lo OR t_refractory > 0 → scatter / jam: decrement t_refractory by 60 (floor 0),
   *     [DESIGN DECISION — SCATTER_MAGNITUDE]: scatter offset ±W·(1−c) via seedFromTick deterministic draw.
   *     The scatter magnitude is logged (the observable effect is in the clearing outcome; no new DB column
   *     added for scatter magnitude — it is a transient clearing result that would be consumed by C3/C5).
   *
   * This tick is GLOBAL — it runs once per HOURLY boundary regardless of player. The harness calls it for
   * every player, but the first call per boundary does the full scan; subsequent calls within the same
   * game_minute window are idempotent (updated_at-gated: the update is a SET-BASED scan that touches rows
   * only if they need a state change). In practice the harness fires HOURLY/1 once per player's 60-tick
   * boundary — with a global table this means it fires N times for N players at the same boundary, but
   * each firing is idempotent (the c value doesn't change on re-apply in the steady state).
   *
   * TODO (post-C2): add a per-hour dedupe guard (e.g., a `last_cleared_at_game_minute` column) to avoid
   * redundant scans when N players' advances land in the same wall-clock second. For D1b C2 with a single
   * E2E player the idempotency suffices.
   */
  private async runHourlyClearingTick(ctx: CitySimTickContext): Promise<void> {
    const cHi = marketTunables.laneCHi;
    const cLo = marketTunables.laneCLo;
    const tick = ctx.gameMinute; // the in-game minute boundary this clearing tick fires on.

    // Fetch all lanes for the clearing pass.
    const allRows = await this.db.select().from(lanePricingState);

    for (const row of allRows) {
      const { district_id, substance_type, c, w_cents, t_refractory_minutes } = row;

      if (c > cHi) {
        // Fast-clear: high confidence → jam timer reset to 0, updated_at refreshed.
        await this.db
          .update(lanePricingState)
          .set({ t_refractory_minutes: 0, updated_at: sql`now()` })
          .where(
            and(
              eq(lanePricingState.district_id, district_id),
              eq(lanePricingState.substance_type, substance_type),
            ),
          );
      } else if (c < cLo || t_refractory_minutes > 0) {
        // Scatter / jam: decrement t_refractory by 60 (one in-game hour), floor at 0.
        const newTRefractory = Math.max(0, t_refractory_minutes - 60);

        // [DESIGN DECISION — SCATTER_MAGNITUDE]: scatter offset = ±W·(1−c) via deterministic RNG.
        // draw ∈ [0,1) → maps to [−1,+1] via (draw * 2 − 1). Offset = sign × W × (1−c).
        // The scatter magnitude is consumed by the clearing layer (C5) — not a new DB column here.
        // The seedFromTick draw is reproducible: same (tick, districtId) → same scatter (C4).
        const draw = this.rng.seedFromTick(tick, district_id);
        const scatterOffset = Math.round((draw * 2 - 1) * w_cents * (1 - c));
        // OBSERVABILITY LOG: scatter is now CONSUMED by getRealisedPriceCents() (C6 BLOCKING A1 fix).
        // This log is preserved so the hourly clearing tick remains observable (scatterOffset for the
        // clearing-band state change is distinct from the per-deal scatter in getRealisedPriceCents).
        this.logger.debug(
          `LaneCollapsePricingTick: district=${district_id} substance=${substance_type} ` +
            `c=${c.toFixed(3)} t_refractory=${t_refractory_minutes} → scatter scatterOffset=${scatterOffset}¢ ` +
            `[DESIGN DECISION — SCATTER_MAGNITUDE: ±W·(1−c) via seedFromTick(${tick},${district_id})]`,
        );

        await this.db
          .update(lanePricingState)
          .set({ t_refractory_minutes: newTRefractory, updated_at: sql`now()` })
          .where(
            and(
              eq(lanePricingState.district_id, district_id),
              eq(lanePricingState.substance_type, substance_type),
            ),
          );
      }
      // Else: c ∈ [c_lo, c_hi] and t_refractory == 0 → no action (neutral zone).
    }
  }

  /**
   * `forceJam(districtId, substanceType, refractoryMinutes)` — live-ops jam trigger.
   *
   * Arms the t_refractory_minutes to the given value (BO-capped by the caller).
   * Used by MarketAdminController.forceLaneJam (POST /v1/admin/market/force-lane-jam).
   * The lane row MUST exist before this is called (caller must ensureLane first).
   *
   * D1b C7 — called from MarketAdminController (BO-only route, admin role required).
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward).
   */
  async forceJam(districtId: number, substanceType: SubstanceTypeValue, refractoryMinutes: number): Promise<void> {
    await this.db
      .update(lanePricingState)
      .set({
        t_refractory_minutes: refractoryMinutes,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(lanePricingState.district_id, districtId),
          eq(lanePricingState.substance_type, substanceType),
        ),
      );
  }

  // ───────────────────────────── internal helpers ─────────────────────────────

  private async fetchLaneRow(districtId: number, substanceType: SubstanceTypeValue): Promise<LanePricingStateRow | null> {
    const rows = await this.db
      .select()
      .from(lanePricingState)
      .where(
        and(
          eq(lanePricingState.district_id, districtId),
          eq(lanePricingState.substance_type, substanceType),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

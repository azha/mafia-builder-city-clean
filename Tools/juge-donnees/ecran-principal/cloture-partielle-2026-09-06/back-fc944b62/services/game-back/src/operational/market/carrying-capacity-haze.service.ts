// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.4 (Carrying-Capacity Haze)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 5 (C5)
//             — D1b C5 — 2026-06-16
//
// `CarryingCapacityHazeService` — the §2.4 Carrying-Capacity Haze mechanic.
//
// CANON FORMULA (market_mechanics.md:163-176 — VERBATIM):
//   λ = Q_total / K_current
//   if λ ≥ tiers[0]: graffiti tier 1 visible
//   if λ ≥ tiers[1]: shopfronts boarding up
//   if λ ≥ tiers[2]: neighbourhood-watch notices
//   if λ > 1.0 for T_over ≥ grace:
//       K ← K × (1 − δ_K)    # permanent damage
//   Recovery: sustained λ < 0.5 for many weeks; civic-investment adds partial recovery.
//   K NEVER returns above k_baseline.
//
// DD10 NAMESPACE FLAG (report-only): 3 of the 4 carrying-capacity registry keys appear under
//   T.conflict.* in the migration-map (gdd/14:4038-4040) while district_K_overshoot_decay
//   is under T.market.* (gdd/14:4014). The authoritative rows (gdd/14:929,940-942) name them
//   district_K_* with source 04c §2.4 — they ARE market keys. The coder consumes them as
//   market 2.4 keys and flags the T.conflict.* inconsistency for closeout C9 (DD10, registry-wins).
//
// DD12 (RESOLVED): emit ONLY district_capacity_damage_bucket (R2.2-banded) as the §3.3 contract.
//   NO reputation/hostility/lek_memory field is written here. The coupling is directional 2.4→3.3.
//
// R2.2 HARD INVARIANT: k_current, q_total, t_over are NEVER forwarded to the client.
//   Player surface = district-scene art-asset cues + lambda_bucket (via MarketProjectionService.toBuckets)
//   + district_capacity_damage_bucket (§3.3 emission contract). NO K tooltip.
//
// DAILY TICK (Cadence.NIGHTLY, order 5): mirrors C3's NIGHTLY registration.
//   For each district with a capacity state row, recomputes λ, applies cues, permanent damage if
//   T_over ≥ grace, and partial civic recovery if has_civic_investment.
//
// K SEED: k_baseline = block_count × 100 × (0.95 + 0.10 × rng.seedFromDay(districtId, 0)).
//   Grounds K in the district's demographic block_count (world_geography.ts); ±5% RNG drift
//   uses MarketRngService (NO Math.random — C4 determinism rule). Never expose k_baseline.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { districtCapacityState, type DistrictCapacityStateRow } from '../../db/schema/market_district_capacity_state';
import { districts } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { marketTunables } from './market-tunables';
import { MarketRngService } from './market-rng.service';
import { MarketProjectionService, type MarketProjectionBuckets, type LambdaBucket } from './market-projection.service';

// ── Result types ─────────────────────────────────────────────────────────────────────────────────

/** R2.2-compliant Carrying-Capacity Haze result for the district-scene projection. */
export interface CapacityHazeProjection {
  /** R2.2 lambda_bucket (via MarketProjectionService.toBuckets). NEVER raw λ or K. */
  lambda_bucket: LambdaBucket;
  /**
   * Art-asset cue tier for the district scene (market_mechanics.md:169-171).
   * 'CLEAR' = no cues; 'GRAFFITI' = tier 1; 'BOARDING' = tier 2; 'NOTICES' = tier 3 (≥1.0).
   * P5: the district scene IS the dashboard (market_mechanics.md:178). No raw K tooltip.
   */
  district_cue_tier: 'CLEAR' | 'GRAFFITI' | 'BOARDING' | 'NOTICES';
  /**
   * §3.3 emission contract (DD12): downstream Lek Memory bucket (R2.2-banded).
   * The future Reputation lot consumes this. Coupling is directional: 2.4 emits, 3.3 consumes.
   * R2.2-banded: 'NONE' | 'MILD' | 'SEVERE' — never the raw λ or K values.
   * [DESIGN DECISION — DAMAGE_BUCKET_TIERS]: NONE = no permanent damage (k_current == k_baseline);
   *   MILD = 0 < damage < 10%; SEVERE = damage ≥ 10% (k_current ≤ 0.90 × k_baseline).
   */
  district_capacity_damage_bucket: 'NONE' | 'MILD' | 'SEVERE';
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CarryingCapacityHazeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CarryingCapacityHazeService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly rng: MarketRngService,
    private readonly projection: MarketProjectionService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MARKET_CARRYING_CAPACITY_HAZE,
      cadence: Cadence.NIGHTLY,
      order: 5,
      run: (ctx) => this.runDailyTick(ctx),
    });
  }

  // ─────────────────────── public API ────────────────────────────────────────

  /**
   * `recomputeLambda(districtId)` — reads the capacity row, returns λ = q_total / k_current.
   * Returns 0.0 if no row exists yet (district not yet seeded).
   */
  async recomputeLambda(districtId: number): Promise<number> {
    const [row] = await this.db
      .select()
      .from(districtCapacityState)
      .where(eq(districtCapacityState.district_id, districtId));
    if (!row) return 0.0;
    // Guard against zero k_current (ensureDistrictCapacity sets min 0.001, but be defensive).
    const kCurrent = Math.max(0.001, row.k_current);
    return row.q_total / kCurrent;
  }

  /**
   * `getHazeProjection(districtId)` — full R2.2-compliant projection for a district.
   *
   * Reads the capacity row, computes λ, routes through MarketProjectionService.toBuckets()
   * for lambda_bucket, computes district_cue_tier from haze tiers, and computes
   * district_capacity_damage_bucket from k_current vs k_baseline (§3.3 DD12 contract).
   *
   * NEVER returns raw k_current, k_baseline, q_total, or t_over.
   */
  async getHazeProjection(districtId: number): Promise<CapacityHazeProjection> {
    const [row] = await this.db
      .select()
      .from(districtCapacityState)
      .where(eq(districtCapacityState.district_id, districtId));

    // If no row exists, return a fully-CLEAR projection (uninitialized district).
    if (!row) {
      return {
        lambda_bucket: 'CLEAR',
        district_cue_tier: 'CLEAR',
        district_capacity_damage_bucket: 'NONE',
      };
    }

    const kCurrent = Math.max(0.001, row.k_current);
    const lambda = row.q_total / kCurrent;

    // R2.2: route lambda through the canonical projection filter.
    const buckets: MarketProjectionBuckets = this.projection.toBuckets({
      c: 0.5,
      q_inferred: 2.0,
      s: 0.5,
      lambda,
    });

    // Compute district_cue_tier from the §2.4 haze tier thresholds (via marketTunables getter).
    // market_mechanics.md:169-171: graffiti ≥0.6 / boarding ≥0.8 / notices ≥1.0.
    const tiers = marketTunables.districtKHazeTiers;
    let district_cue_tier: CapacityHazeProjection['district_cue_tier'];
    if (lambda >= tiers[2]) {
      district_cue_tier = 'NOTICES';   // λ ≥ 1.0 — neighbourhood-watch notices (§2.4 tier 3)
    } else if (lambda >= tiers[1]) {
      district_cue_tier = 'BOARDING';  // λ ≥ 0.8 — shopfronts boarding up (§2.4 tier 2)
    } else if (lambda >= tiers[0]) {
      district_cue_tier = 'GRAFFITI'; // λ ≥ 0.6 — graffiti visible (§2.4 tier 1)
    } else {
      district_cue_tier = 'CLEAR';    // λ < 0.6 — no visible cues
    }

    // Compute district_capacity_damage_bucket (§3.3 DD12 emission contract, R2.2-banded).
    // [DESIGN DECISION — DAMAGE_BUCKET_TIERS]:
    //   NONE   = k_current == k_baseline (no permanent damage occurred)
    //   MILD   = 0 < damage < 10% (k_current > 0.90 × k_baseline)
    //   SEVERE = damage ≥ 10% (k_current ≤ 0.90 × k_baseline)
    const damageFraction = (row.k_baseline - row.k_current) / Math.max(0.001, row.k_baseline);
    let district_capacity_damage_bucket: CapacityHazeProjection['district_capacity_damage_bucket'];
    if (damageFraction <= 0) {
      district_capacity_damage_bucket = 'NONE';
    } else if (damageFraction < 0.10) {
      district_capacity_damage_bucket = 'MILD';
    } else {
      district_capacity_damage_bucket = 'SEVERE';
    }

    this.logger.debug(
      `HazeProjection: dist=${districtId} λ=${lambda.toFixed(3)} ` +
        `cue=${district_cue_tier} damage=${district_capacity_damage_bucket} ` +
        `lambda_bucket=${buckets.lambda_bucket}`,
    );

    return {
      lambda_bucket: buckets.lambda_bucket,
      district_cue_tier,
      district_capacity_damage_bucket,
    };
  }

  /**
   * `ensureDistrictCapacity(districtId)` — idempotent seed of the capacity row.
   *
   * Seeds k_baseline from districts.block_count × 100 × (0.95 + 0.10 × rng.seedFromDay(districtId, 0)).
   * Uses INSERT ... ON CONFLICT DO NOTHING (idempotent — safe to call repeatedly).
   * k_current is initialized to k_baseline at seed time (no damage yet).
   */
  async ensureDistrictCapacity(districtId: number): Promise<void> {
    // Read the district's block_count to seed k_baseline.
    const [districtRow] = await this.db
      .select({ block_count: districts.block_count })
      .from(districts)
      .where(eq(districts.id, districtId));

    // Default block_count if district row not found (should not happen in a seeded world).
    const blockCount = districtRow?.block_count ?? 50;

    // K seed: block_count × 100 × (0.95 + 0.10 × rng.seedFromDay(districtId, 0)).
    // rng.seedFromDay(districtId, 0) returns ∈ [0,1) — deterministic from (districtId, seed=0).
    // The ±5% multiplier: 0.95 + 0.10 × rng → maps [0,1) to [0.95, 1.05).
    const rngDraw = this.rng.seedFromDay(districtId, 0);
    const kBaseline = blockCount * 100 * (0.95 + 0.10 * rngDraw);

    await this.db
      .insert(districtCapacityState)
      .values({
        district_id: districtId,
        k_baseline: kBaseline,
        k_current: kBaseline,
        q_total: 0,
        t_over: 0,
        has_civic_investment: false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflictDoNothing();
  }

  /**
   * `addThroughput(districtId, amount)` — increments q_total for the district.
   *
   * Used by test controller and later C6 sell integration.
   * UPSERT: creates the row if it does not exist (calls ensureDistrictCapacity first).
   */
  async addThroughput(districtId: number, amount: number): Promise<void> {
    // Ensure the row exists before incrementing.
    await this.ensureDistrictCapacity(districtId);

    await this.db
      .update(districtCapacityState)
      .set({
        q_total: sql`${districtCapacityState.q_total} + ${amount}`,
        updated_at: sql`now()`,
      })
      .where(eq(districtCapacityState.district_id, districtId));
  }

  /**
   * `applyDailyTick(districtId)` — the per-district daily tick logic.
   *
   * Per the §2.4 canon (market_mechanics.md:163-176):
   *   1. Ensure row exists.
   *   2. Read k_baseline, k_current, q_total, t_over, has_civic_investment.
   *   3. Compute λ = q_total / k_current.
   *   4. if λ > 1.0: t_over += 1; else: t_over = 0 (reset on non-overshoot day).
   *   5. if t_over >= grace AND λ > 1.0: permanent K-damage (k_current ← k_current × (1 − δ_K)).
   *   6. if λ < 0.5 AND has_civic_investment: partial K-recovery; clear flag.
   *   7. Update DB.
   *
   * k_current guard: max(0.001, result) to avoid division by zero on next tick.
   * K never returns above k_baseline (irreversibility hard invariant).
   */
  async applyDailyTick(districtId: number): Promise<void> {
    // Ensure the row exists (idempotent).
    await this.ensureDistrictCapacity(districtId);

    // Read current state.
    const [row] = await this.db
      .select()
      .from(districtCapacityState)
      .where(eq(districtCapacityState.district_id, districtId));

    if (!row) return;  // should not happen (ensureDistrictCapacity just ran)

    const kBaseline = row.k_baseline;
    let kCurrent    = Math.max(0.001, row.k_current);  // guard against zero
    const qTotal    = row.q_total;
    let tOver       = row.t_over;
    const hasCivic  = row.has_civic_investment;

    // Step 3: compute λ.
    const lambda = qTotal / kCurrent;

    // Step 4: t_over update (λ > 1.0 → increment; else reset).
    if (lambda > 1.0) {
      tOver += 1;
    } else {
      tOver = 0;
    }

    // Step 5: permanent K-damage when T_over ≥ grace AND λ > 1.0 (market_mechanics.md:173).
    const grace   = marketTunables.districtKOvershootGraceDays;  // REUSE: market.district_K_overshoot_grace_days
    const deltaK  = marketTunables.districtKOvershootDecay;      // REUSE: market.district_K_overshoot_decay
    if (tOver >= grace && lambda > 1.0) {
      // Permanent damage: K ← K × (1 − δ_K). Guard at 0.001 to avoid div/0.
      kCurrent = Math.max(0.001, kCurrent * (1 - deltaK));
    }

    // Step 6: partial K-recovery when λ < 0.5 AND has_civic_investment (market_mechanics.md:176).
    const civicRecoveryRate = marketTunables.districtKCivicRecoveryRate;  // REUSE: market.district_K_civic_recovery_rate
    let hasCivicAfter = hasCivic;
    if (lambda < 0.5 && hasCivic) {
      // Partial recovery: K ← min(K + k_baseline × recovery_rate, k_baseline).
      // K NEVER returns above k_baseline (irreversibility hard invariant).
      kCurrent = Math.min(kCurrent + kBaseline * civicRecoveryRate, kBaseline);
      hasCivicAfter = false;  // clear the flag after applying recovery
    }

    // Step 7: persist updated state.
    await this.db
      .update(districtCapacityState)
      .set({
        k_current: kCurrent,
        t_over: tOver,
        has_civic_investment: hasCivicAfter,
        updated_at: sql`now()`,
      })
      .where(eq(districtCapacityState.district_id, districtId));

    this.logger.debug(
      `DailyTick: dist=${districtId} λ=${lambda.toFixed(3)} t_over=${tOver} ` +
        `k_current=${kCurrent.toFixed(2)} civic=${hasCivic}→${hasCivicAfter}`,
    );
  }

  /**
   * `applyCivicInvestment(districtId)` — sets has_civic_investment = true for the district.
   *
   * The civic-investment hook (market_mechanics.md:211). Idempotent.
   * The flag is consumed (and cleared) on the next applyDailyTick call when λ < 0.5.
   */
  async applyCivicInvestment(districtId: number): Promise<void> {
    // Ensure the row exists (idempotent).
    await this.ensureDistrictCapacity(districtId);

    await this.db
      .update(districtCapacityState)
      .set({
        has_civic_investment: true,
        updated_at: sql`now()`,
      })
      .where(eq(districtCapacityState.district_id, districtId));
  }

  /**
   * `runDailyTick(ctx)` — runs once per in-game day for ALL districts with a capacity row.
   *
   * The tick is district-global (same as lane_pricing_state — not per-player).
   * The CitySimTickContext.playerId is a synthetic placeholder (the harness still drives
   * it per-player, but the tick ignores playerId and scans the full table).
   *
   * Runs applyDailyTick for each district that has a capacity_state row.
   */
  async runDailyTick(_ctx: CitySimTickContext): Promise<void> {
    // Scan all district_capacity_state rows for global district IDs.
    const rows = await this.db
      .select({ district_id: districtCapacityState.district_id })
      .from(districtCapacityState);

    for (const { district_id } of rows) {
      await this.applyDailyTick(district_id);
    }
  }

  /**
   * `getCapacityRow(districtId)` — TEST-ONLY: returns the raw DB row for a district.
   *
   * Used by test controller for DB assertions (k_baseline, k_current, q_total, t_over).
   * This is the BO assertion surface for E2E — NOT a player-facing route.
   * Returns null if no row exists.
   */
  async getCapacityRow(districtId: number): Promise<DistrictCapacityStateRow | null> {
    const [row] = await this.db
      .select()
      .from(districtCapacityState)
      .where(eq(districtCapacityState.district_id, districtId));
    return row ?? null;
  }
}

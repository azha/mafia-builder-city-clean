// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C5 (aggregation)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 (aggregation)
//             Plan §C5 — runHourlyAggregation (trim 5% + median/p10/p90 → meta_market_signals) + L1 skip
//             R2.3: trimPct via metaMarketTunables.trimPct (never inlined).
//             R9.3: mirrors schema meta_market_signals + meta_market_contributions (migrations 0103-0104).
//             Determinism: NO Math.random(), NO non-deterministic state. aggregated_at = current UTC hour boundary.
//             Zero-regression: purely ADDITIVE (no existing table/service modified).
//             — 04d-C C5 — 2026-07-03
//
// `MetaMarketAggregationService` — HOURLY aggregation job for the meta-market.
//
// `runHourlyAggregation()`:
//   Called by `MetaMarketTickService` on `META_MARKET_AGGREGATION_TICK` (HOURLY/4).
//
//   1. L1 empty-state skip: if no pending contributions exist, return immediately (ZERO writes).
//      Determinism: the skip is a pure count check, not a random gate.
//
//   2. Compute `aggregated_at` = current UTC hour boundary (floor(Date.now() / 3600000) × 3600000).
//      This is the bucket key for the signal row. Pure: same wall-clock hour → same bucket.
//
//   3. Fetch distinct `(region_id, substance, district_profile)` groups from pending contributions.
//
//   4. For each group:
//      a. Fetch all `price_cents` values for that group.
//      b. Compute `trimCount = floor(N × trimPct / 100)` and trim top/bottom `trimCount` values.
//      c. Compute `median`, `p10`, `p90` from the trimmed array (floor-based nearest-rank, deterministic).
//      d. `sample_count` = total number of contributions in the group (pre-trim — represents the
//         number of distinct contributors who participated, regardless of trim status).
//      e. UPSERT one `meta_market_signals` row (PK: region_id, substance, district_profile, aggregated_at).
//         ON CONFLICT → update stats (the bucket may have been partially aggregated in a prior run).
//
//   5. DELETE all consumed `meta_market_contributions` rows (the pending queue is cleared per group).
//
//   Idempotent per-bucket: re-running with the same `aggregated_at` → UPSERT merges correctly.
//   2× back-to-back (same contributions, same hour) → identical signal output.
//
// Privacy: NO `player_id` is ever read or written here. The only identifier in contributions is
//   `contributor_hash` (HMAC-SHA256, C4). The signal rows carry NO contributor identifier at all —
//   only the aggregate stats (`sample_count`, `median_price_cents`, `p10_price_cents`, `p90_price_cents`).
//
// `computeStats(prices, trimPct)` — pure statistical function:
//   Given N prices and trimPct:
//   - Sort ascending.
//   - trimCount = floor(N × trimPct / 100). Trim `trimCount` from each end.
//   - If trimming removes all values (degenerate), fall back to the full sorted array.
//   - floor-based nearest-rank percentile: p(k) = arr[floor((arr.length − 1) × k)].
//   - Returns { median, p10, p90, sampleCount } where sampleCount = N (pre-trim count).
//
// Collision proof (HOURLY/4): MARKET_LANE_CLEARING=HOURLY/1, RIVAL_SATURATION_TICK=HOURLY/2,
//   DEAD_HAND_TICK=HOURLY/3 → HOURLY/4 is the next free slot. The SCHEDULE entry enforces this.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { metaMarketContributions, metaMarketSignals } from '../../db/schema/meta_market';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { MetaMarketTunables } from './meta-market.tunables';

// Type aliases for enum casts (avoids re-importing pgEnum from drizzle-orm/pg-core here).
type SubstanceEnumVal      = (typeof metaMarketContributions.substance.enumValues)[number];
type DistrictProfileEnumVal = (typeof metaMarketContributions.district_profile.enumValues)[number];

/** Result of the pure computeStats function. Exported for E2E test-route probe use. */
export interface AggregationStats {
  readonly median:      number;
  readonly p10:         number;
  readonly p90:         number;
  /** Pre-trim count: the total number of contributions in the bucket (= distinct contributors). */
  readonly sampleCount: number;
}

@Injectable()
export class MetaMarketAggregationService {
  private readonly logger = new Logger(MetaMarketAggregationService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: MetaMarketTunables,
  ) {}

  /**
   * `runHourlyAggregation` — the HOURLY aggregation job body.
   *
   * Registered on `META_MARKET_AGGREGATION_TICK` (HOURLY/4) by `MetaMarketTickService`.
   * Called once per in-game hour.
   *
   * L1 empty-state skip: when no pending contributions exist → ZERO writes, logs a debug skip.
   *
   * @param _ctx — CitySimTickContext (gameMinute, etc.; unused here — aggregation is real-time-bucketed,
   *               not game-time-bucketed. The bucket key is the UTC wall-clock hour, per canon §1.2).
   */
  async runHourlyAggregation(_ctx?: CitySimTickContext): Promise<void> {
    // ── L1 empty-state skip ────────────────────────────────────────────────────────────────────────
    // If no pending contributions exist at all, return immediately (ZERO DB writes).
    // This prevents a no-op UPSERT scan and keeps the HOURLY tick cheap for the common case.
    const pendingCountResult = await this.db.execute(
      sql`SELECT COUNT(*) AS cnt FROM meta_market_contributions`,
    );
    const rows = (pendingCountResult as { rows: Array<Record<string, unknown>> }).rows;
    const pendingCount = Number(rows[0]?.['cnt'] ?? 0);

    if (pendingCount === 0) {
      this.logger.debug(
        'META_MARKET_AGGREGATION_TICK: L1 skip — no pending contributions (ZERO writes).',
      );
      return;
    }

    this.logger.log(
      `META_MARKET_AGGREGATION_TICK: ${pendingCount} pending contributions → aggregating…`,
    );

    // ── Aggregated_at: current UTC hour boundary ───────────────────────────────────────────────────
    // Pure: same wall-clock hour → same bucket. No game-time dependency (real-hour cadence, canon §1.2).
    const aggregatedAt = this.currentAggregationBucket();

    // ── Fetch distinct (region_id, substance, district_profile) groups ─────────────────────────────
    const distinctBuckets = await this.db.execute(
      sql`SELECT DISTINCT region_id, substance::text, district_profile::text
          FROM meta_market_contributions`,
    );
    const bucketRows = (distinctBuckets as { rows: Array<Record<string, unknown>> }).rows;

    this.logger.log(
      `META_MARKET_AGGREGATION_TICK: ${bucketRows.length} distinct (region × substance × district_profile) buckets.`,
    );

    let totalUpserted = 0;
    let totalCleared = 0;

    // ── Per-bucket aggregation ─────────────────────────────────────────────────────────────────────
    for (const bucket of bucketRows) {
      const regionId        = String(bucket['region_id'] ?? '');
      const substance       = String(bucket['substance'] ?? '');
      const districtProfile = String(bucket['district_profile'] ?? '');

      try {
        // Fetch all price_cents values for this (region, substance, district_profile) group.
        // No bucket_hour filter: aggregate ALL pending contributions for this signal key.
        const priceResult = await this.db
          .select({ price_cents: metaMarketContributions.price_cents })
          .from(metaMarketContributions)
          .where(
            and(
              eq(metaMarketContributions.region_id,        regionId),
              eq(metaMarketContributions.substance,        substance as SubstanceEnumVal),
              eq(metaMarketContributions.district_profile, districtProfile as DistrictProfileEnumVal),
            ),
          );

        if (priceResult.length === 0) continue; // defensive (should not happen given the distinct query)

        const prices = priceResult.map((r) => Number(r.price_cents));
        const stats  = this.computeStats(prices, this.tunables.trimPct);

        // UPSERT meta_market_signals (ON CONFLICT on composite PK → update stats).
        // PK: (region_id, substance, district_profile, aggregated_at).
        await this.db
          .insert(metaMarketSignals)
          .values({
            region_id:           regionId,
            substance:           substance as SubstanceEnumVal,
            district_profile:    districtProfile as DistrictProfileEnumVal,
            aggregated_at:       aggregatedAt,
            sample_count:        stats.sampleCount,
            median_price_cents:  BigInt(Math.round(stats.median)),
            p10_price_cents:     BigInt(Math.round(stats.p10)),
            p90_price_cents:     BigInt(Math.round(stats.p90)),
          })
          .onConflictDoUpdate({
            target: [
              metaMarketSignals.region_id,
              metaMarketSignals.substance,
              metaMarketSignals.district_profile,
              metaMarketSignals.aggregated_at,
            ],
            set: {
              sample_count:       stats.sampleCount,
              median_price_cents: BigInt(Math.round(stats.median)),
              p10_price_cents:    BigInt(Math.round(stats.p10)),
              p90_price_cents:    BigInt(Math.round(stats.p90)),
            },
          });

        // DELETE consumed contributions for this group.
        await this.db
          .delete(metaMarketContributions)
          .where(
            and(
              eq(metaMarketContributions.region_id,        regionId),
              eq(metaMarketContributions.substance,        substance as SubstanceEnumVal),
              eq(metaMarketContributions.district_profile, districtProfile as DistrictProfileEnumVal),
            ),
          );

        totalUpserted++;
        totalCleared += prices.length;

        this.logger.debug(
          `  bucket (${regionId} × ${substance} × ${districtProfile}): ` +
          `N=${stats.sampleCount} → median=${stats.median}¢ p10=${stats.p10}¢ p90=${stats.p90}¢ ` +
          `aggregated_at=${aggregatedAt.toISOString()} — ${prices.length} contributions cleared.`,
        );
      } catch (err) {
        // Per-bucket try/catch: a fault on one bucket does not abort the others.
        this.logger.error(
          `META_MARKET_AGGREGATION_TICK: error on bucket (${regionId} × ${substance} × ${districtProfile}): ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `META_MARKET_AGGREGATION_TICK: done — ${totalUpserted} signals upserted, ${totalCleared} contributions cleared.`,
    );
  }

  /**
   * `computeStats` — pure statistical function (no RNG, no side effects).
   *
   * Given N price values and a trim percentage:
   *   1. Sort ascending.
   *   2. trimCount = floor(N × trimPct / 100). Trim `trimCount` from each end.
   *   3. If the trimmed array is empty (degenerate — e.g. N=1 with trimPct=50), fall back to full sorted array.
   *   4. Compute percentiles via floor-based nearest-rank:
   *      `p(k) = arr[floor((arr.length − 1) × k)]`.
   *
   * Exported so the test controller can expose a direct probe for falsifiable unit-level testing.
   *
   * @param prices   — array of raw price values (cents, integers). May be empty (defensively handled).
   * @param trimPct  — trim percentage (0..100). From metaMarketTunables.trimPct (default 5).
   * @returns AggregationStats — { median, p10, p90, sampleCount }.
   *   sampleCount = `prices.length` (pre-trim total contributor count).
   */
  computeStats(prices: number[], trimPct: number): AggregationStats {
    if (prices.length === 0) {
      return { median: 0, p10: 0, p90: 0, sampleCount: 0 };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const n      = sorted.length;

    // trimCount: how many values to remove from EACH end (top and bottom).
    // For N=20 and trimPct=5: trimCount = floor(20 × 5 / 100) = floor(1) = 1.
    // Removes 1 from bottom + 1 from top → 18 values remain.
    const trimCount = Math.floor(n * trimPct / 100);

    // Trimmed array: slice off trimCount from each end.
    // Guard: if trimming would remove all values (2×trimCount >= N), fall back to full sorted array.
    const trimmed = (trimCount > 0 && 2 * trimCount < n)
      ? sorted.slice(trimCount, n - trimCount)
      : sorted;

    // Floor-based nearest-rank percentile:
    // p(k) = arr[floor((arr.length − 1) × k)]
    // This is deterministic: same array → same result, independent of run order.
    const len = trimmed.length;
    const pct = (k: number): number => trimmed[Math.floor((len - 1) * k)]!;

    return {
      median:      pct(0.5),
      p10:         pct(0.1),
      p90:         pct(0.9),
      // sampleCount = pre-trim contributor count (represents total participants in this bucket).
      sampleCount: n,
    };
  }

  /**
   * Returns the start of the current UTC hour as a Date (the `aggregated_at` bucket key).
   *
   * Pure: floor(Date.now() / 3600000) × 3600000. Same call within the same UTC hour = same result.
   * No Math.random(). Wall-clock only (real-hour aggregation cadence, per canon §1.2).
   */
  currentAggregationBucket(): Date {
    const nowMs = Date.now();
    return new Date(Math.floor(nowMs / (1000 * 60 * 60)) * (1000 * 60 * 60));
  }
}

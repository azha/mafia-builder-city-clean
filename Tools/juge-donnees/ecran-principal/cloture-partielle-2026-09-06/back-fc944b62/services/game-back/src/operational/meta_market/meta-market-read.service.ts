// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C6 (read API + sample-floor)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C8 (visibility toggle integration)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 (getSignal, sample_floor)
//             Plan §C6 — MetaMarketReadService.getSignal (clear aggregate OR 'insufficient_signal' < sample_floor)
//               + trend computation from 7-day window (2+ rows: oldest vs latest median).
//             Plan §C8 — getSignalWithVisibility: per-player visibility toggle gate (mig 0105).
//               NULL = use tunable default (effective ON) → proceed with getSignal.
//               FALSE = opted out → return 'insufficient_signal' immediately (privacy wall).
//               TRUE = opted in → proceed with getSignal.
//             R2.3: sample_floor via MetaMarketTunables.sampleFloor (never inlined).
//             R2.2/P5: raw sample_count is NEVER exposed to the caller; only the aggregate OR 'insufficient_signal'.
//             Determinism: NO Math.random(), NO Date.now() in the mechanic (7d window uses DB NOW()).
//             Zero-regression: purely ADDITIVE — reads only meta_market_signals + player; no writes.
//             — 04d-C C6 — 2026-07-03
//             — 04d-C C8 — 2026-07-03 (getSignalWithVisibility added)
//
// `MetaMarketReadService` — the public read API for the async meta-market signal.
//
// `getSignal(regionId, substance, districtProfile)`:
//   1. Query `meta_market_signals` for the most recent row matching the key (ORDER BY aggregated_at DESC LIMIT 1).
//   2. If no row → return 'insufficient_signal'.
//   3. If `sample_count < sample_floor` (default 5) → return 'insufficient_signal'.
//      R2.2: NEVER surface partial data; the sample_floor is the privacy wall.
//   4. Otherwise: compute the trend from the 7-day window (oldest vs latest median).
//      7d window: raw SQL SELECT median_price_cents FROM meta_market_signals WHERE key AND aggregated_at >= NOW()-7d
//               ORDER BY aggregated_at ASC.
//      - <2 rows → 'stable'
//      - latest.median > oldest.median → 'up'
//      - latest.median < oldest.median → 'down'
//      - otherwise → 'stable'
//   5. Return MetaMarketSignalView (medianCents, p10Cents, p90Cents, sampleCount, lastAggregatedAt, trend).
//
// Privacy note: MetaMarketSignalView includes sampleCount (an aggregate count) for internal/BO use.
//   C7 (privacy wall) will gate what is exposed to untrusted callers. C6 is the internal read API.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { metaMarketSignals } from '../../db/schema/meta_market';
import { player } from '../../db/schema/player';
import { MetaMarketTunables } from './meta-market.tunables';
import { isMetaMarketVisible } from './meta-market-visibility';

/** The resolved signal view returned by MetaMarketReadService.getSignal when the sample floor is met. */
export interface MetaMarketSignalView {
  /** Trimmed median sell price in cents (bigint — matches DB column type). */
  readonly medianCents: bigint;
  /** 10th percentile sell price in cents (bigint). */
  readonly p10Cents: bigint;
  /** 90th percentile sell price in cents (bigint). */
  readonly p90Cents: bigint;
  /** Number of distinct contributors in the bucket (= sample_count from DB; BO-visible only). */
  readonly sampleCount: number;
  /** Timestamp of the most recent aggregation bucket for this signal key. */
  readonly lastAggregatedAt: Date;
  /**
   * Trend direction over the last 7 days, comparing the oldest bucket in the window to the latest.
   * - 'up'    — latest median > oldest median
   * - 'down'  — latest median < oldest median
   * - 'stable' — <2 rows in window, or medians equal
   */
  readonly trend: 'up' | 'stable' | 'down';
}

@Injectable()
export class MetaMarketReadService {
  private readonly logger = new Logger(MetaMarketReadService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: MetaMarketTunables,
  ) {}

  /**
   * Resolve the most recent signal for a given (regionId, substance, districtProfile) key.
   *
   * Returns `'insufficient_signal'` when:
   *   - No signal row exists for the key.
   *   - The most recent signal has `sample_count < sampleFloor` (privacy wall, R2.3 via tunables).
   *
   * Otherwise returns a `MetaMarketSignalView` with the aggregate + 7-day trend.
   *
   * Determinism: no Math.random(), no Date.now(). The 7d window uses DB NOW() in raw SQL (pure).
   * R2.3: sample_floor is read from `this.tunables.sampleFloor` (never inlined as a literal).
   *
   * @param regionId        — geo-region key (e.g. 'eu-west', 'us-east')
   * @param substance       — substance type (e.g. 'brindle', 'crick', 'hush', 'ash')
   * @param districtProfile — in-game district profile (e.g. 'tidewater', 'spine', 'lattice', ...)
   */
  async getSignal(
    regionId: string,
    substance: string,
    districtProfile: string,
  ): Promise<MetaMarketSignalView | 'insufficient_signal'> {
    // ── Step 1: fetch the most recent signal row for this key ────────────────────────────────────
    const rows = await this.db
      .select()
      .from(metaMarketSignals)
      .where(
        and(
          eq(metaMarketSignals.region_id, regionId),
          eq(metaMarketSignals.substance, substance as (typeof metaMarketSignals.substance.enumValues)[number]),
          eq(metaMarketSignals.district_profile, districtProfile as (typeof metaMarketSignals.district_profile.enumValues)[number]),
        ),
      )
      .orderBy(desc(metaMarketSignals.aggregated_at))
      .limit(1);

    // ── Step 2: no row → insufficient_signal ────────────────────────────────────────────────────
    if (rows.length === 0) {
      this.logger.debug(
        `getSignal(${regionId}, ${substance}, ${districtProfile}): no signal row → insufficient_signal`,
      );
      return 'insufficient_signal';
    }

    const latest = rows[0]!;

    // ── Step 3: sample_floor gate (privacy wall) ─────────────────────────────────────────────────
    // R2.3: read the floor from tunables (never inline the literal 5).
    // R2.2/P5: NEVER surface partial data — if below floor, return insufficient_signal.
    const floor = this.tunables.sampleFloor;
    if (latest.sample_count < floor) {
      this.logger.debug(
        `getSignal(${regionId}, ${substance}, ${districtProfile}): ` +
        `sample_count=${latest.sample_count} < floor=${floor} → insufficient_signal`,
      );
      return 'insufficient_signal';
    }

    // ── Step 4: compute trend from the 7-day window ──────────────────────────────────────────────
    // Use raw SQL with DB NOW() — deterministic given same DB state, no Date.now() in code.
    // Query all buckets in the window ordered ASC (oldest first). Compare oldest vs latest median.
    const trendResult = await this.db.execute<{ median_price_cents: string }>(sql`
      SELECT median_price_cents
      FROM meta_market_signals
      WHERE region_id = ${regionId}
        AND substance = ${substance}::substance_type
        AND district_profile = ${districtProfile}::district_profile
        AND aggregated_at >= NOW() - INTERVAL '7 days'
      ORDER BY aggregated_at ASC
    `);

    const trendRows = trendResult.rows ?? (trendResult as unknown as { median_price_cents: string }[]);
    const trend = this._computeTrend(trendRows as { median_price_cents: string }[]);

    // ── Step 5: return MetaMarketSignalView ──────────────────────────────────────────────────────
    return {
      medianCents:      latest.median_price_cents,
      p10Cents:         latest.p10_price_cents,
      p90Cents:         latest.p90_price_cents,
      sampleCount:      latest.sample_count,
      lastAggregatedAt: latest.aggregated_at,
      trend,
    };
  }

  /**
   * Compute the trend direction from an ordered (ASC by aggregated_at) list of signal rows.
   *
   * - <2 rows → 'stable' (not enough history)
   * - latest.median > oldest.median → 'up'
   * - latest.median < oldest.median → 'down'
   * - otherwise → 'stable'
   *
   * Pure function — no side effects, no RNG.
   */
  private _computeTrend(rows: { median_price_cents: string }[]): 'up' | 'stable' | 'down' {
    if (rows.length < 2) return 'stable';

    // oldest is rows[0] (ASC order), latest is rows[rows.length - 1].
    const oldest = BigInt(rows[0]!.median_price_cents);
    const latestVal = BigInt(rows[rows.length - 1]!.median_price_cents);

    if (latestVal > oldest) return 'up';
    if (latestVal < oldest) return 'down';
    return 'stable';
  }

  /**
   * Per-player visibility-gated signal read (C8 — mig 0105 toggle integration).
   *
   * Checks `player.meta_market_visibility_enabled` for the given playerId:
   *   - FALSE (explicitly opted out)   → return 'insufficient_signal' immediately (privacy wall).
   *   - NULL  (use tunable default)    → effective ON → proceed with getSignal().
   *   - TRUE  (explicitly opted in)    → proceed with getSignal().
   *   - player not found               → proceed with getSignal() (defensive fallback, no block).
   *
   * BO endpoints (MetaMarketAdminController) bypass this method and call getSignal() directly —
   * the P5 inversion shows raw signals to ops regardless of player preference.
   *
   * Determinism: no Math.random(), no Date.now(). DB NOW() used in underlying getSignal().
   * Zero-regression: ADDITIVE — adds a single nullable-boolean read before existing logic.
   *
   * @param playerId        — UUID of the player (used to look up visibility preference)
   * @param regionId        — geo-region key
   * @param substance       — substance type
   * @param districtProfile — in-game district profile
   */
  async getSignalWithVisibility(
    playerId: string,
    regionId: string,
    substance: string,
    districtProfile: string,
  ): Promise<MetaMarketSignalView | 'insufficient_signal'> {
    // ── Step 1: read per-player visibility toggle from DB ─────────────────────────────────────────
    const playerRows = await this.db
      .select({ meta_market_visibility_enabled: player.meta_market_visibility_enabled })
      .from(player)
      .where(eq(player.player_id, playerId))
      .limit(1);

    if (playerRows.length > 0) {
      const visibilityEnabled = playerRows[0]!.meta_market_visibility_enabled;
      // Only block if explicitly FALSE (opted out). NULL = use default (ON). TRUE = opted in.
      // La règle vit dans `meta-market-visibility.ts` (PRODUCTEUR UNIQUE) pour que la projection
      // `GET /v1/me` affiche exactement ce que ce lecteur applique.
      if (!isMetaMarketVisible(visibilityEnabled)) {
        this.logger.debug(
          `getSignalWithVisibility(playerId=${playerId}): visibility_enabled=false → insufficient_signal (privacy wall)`,
        );
        return 'insufficient_signal';
      }
    }
    // player not found or NULL/TRUE → proceed with the underlying signal read

    // ── Step 2: delegate to the normal signal read ────────────────────────────────────────────────
    return this.getSignal(regionId, substance, districtProfile);
  }
}

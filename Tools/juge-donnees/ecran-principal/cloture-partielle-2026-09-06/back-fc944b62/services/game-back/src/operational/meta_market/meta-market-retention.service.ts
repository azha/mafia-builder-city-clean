// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C5 (retention purge)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 (retention)
//             Plan §C5 — MetaMarketRetentionService.purgeOlderThan (NIGHTLY) — delete signals + contributions
//                        older than retention_days.
//             R2.3: retentionDays sourced via MetaMarketTunables.retentionDays (gdd/14, never inlined).
//             Determinism: NO Math.random(), NO game-time dependency. Cutoff = NOW() − retentionDays × 24h.
//             Idempotent: re-running with the same cutoff time → identical outcome (DELETE WHERE is idempotent).
//             Zero-regression: ADDITIVE only — only deletes rows in meta_market_* tables (no existing tables).
//             — 04d-C C5 — 2026-07-03
//
// `MetaMarketRetentionService` — NIGHTLY retention purge for the meta-market.
//
// `purgeOlderThan(retentionDays)`:
//   Called by `MetaMarketTickService` on `META_MARKET_RETENTION_TICK` (NIGHTLY/18).
//
//   Purges:
//     1. `meta_market_signals` rows where `aggregated_at < NOW() − retentionDays`.
//        These are aggregated signal rows that have aged past the retention window.
//        Canon: async_meta_market.md §1 retention (30-day default).
//     2. `meta_market_contributions` rows where `contributed_at < NOW() − retentionDays`.
//        These are stale pending contributions that were NOT aggregated (e.g. from an aborted hour).
//        Defensive: normally contributions are cleared by the aggregation job (C5). The NIGHTLY
//        retention purge is a belt-and-suspenders for orphaned rows.
//
//   L1 variant: if both DELETE operations affect 0 rows, that's the natural empty-state no-op
//   (no explicit L1 check needed — DELETE WHERE with no matching rows = 0 writes, zero cost).
//
//   Idempotent: same cutoff time → same DELETE (already-deleted rows don't exist, so re-running is
//   a no-op). Verified by the E2E: run purge twice → both produce the same DB state.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { lt } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { metaMarketSignals, metaMarketContributions } from '../../db/schema/meta_market';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

@Injectable()
export class MetaMarketRetentionService {
  private readonly logger = new Logger(MetaMarketRetentionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `purgeOlderThan` — the NIGHTLY retention purge body.
   *
   * Registered on `META_MARKET_RETENTION_TICK` (NIGHTLY/18) by `MetaMarketTickService`.
   * Called once per in-game night (1440 game-minutes).
   *
   * Deletes:
   *   - `meta_market_signals` where `aggregated_at < cutoff` (aged signal rows).
   *   - `meta_market_contributions` where `contributed_at < cutoff` (orphaned pending rows).
   *
   * Idempotent: re-running with the same `retentionDays` → same outcome (DELETE WHERE is pure).
   * L1 natural: if no rows are older than cutoff, ZERO writes (the WHERE filters all rows out).
   *
   * @param retentionDays — from MetaMarketTunables.retentionDays (default 30).
   *   The number of real days to retain. Sourced from gdd/14 registry (R2.3, never inlined).
   * @param _ctx          — CitySimTickContext (unused here — purge is real-time-based, not game-time).
   */
  async purgeOlderThan(retentionDays: number, _ctx?: CitySimTickContext): Promise<{ signalsDeleted: number; contributionsDeleted: number }> {
    // Cutoff timestamp = NOW() − retentionDays × 24h.
    // Pure: same retentionDays → same cutoff within the same UTC second.
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const cutoff   = new Date(cutoffMs);

    this.logger.debug(
      `META_MARKET_RETENTION_TICK: purge cutoff = ${cutoff.toISOString()} (retentionDays=${retentionDays}).`,
    );

    // ── Purge aged signal rows ─────────────────────────────────────────────────────────────────────
    // meta_market_signals WHERE aggregated_at < cutoff.
    // These are finalized aggregation buckets whose retention window has expired.
    const signalsResult = await this.db
      .delete(metaMarketSignals)
      .where(lt(metaMarketSignals.aggregated_at, cutoff))
      .returning({ region_id: metaMarketSignals.region_id });

    const signalsDeleted = signalsResult.length;

    // ── Purge orphaned contribution rows ───────────────────────────────────────────────────────────
    // meta_market_contributions WHERE contributed_at < cutoff.
    // Belt-and-suspenders: the aggregation job (C5) should have cleared these, but if an hour
    // was missed (e.g. server restart), the retention purge catches them.
    const contribResult = await this.db
      .delete(metaMarketContributions)
      .where(lt(metaMarketContributions.contributed_at, cutoff))
      .returning({ contribution_id: metaMarketContributions.contribution_id });

    const contributionsDeleted = contribResult.length;

    this.logger.log(
      `META_MARKET_RETENTION_TICK: done — ` +
      `${signalsDeleted} signals deleted, ${contributionsDeleted} contributions deleted ` +
      `(cutoff=${cutoff.toISOString()}, retentionDays=${retentionDays}).`,
    );

    return { signalsDeleted, contributionsDeleted };
  }
}

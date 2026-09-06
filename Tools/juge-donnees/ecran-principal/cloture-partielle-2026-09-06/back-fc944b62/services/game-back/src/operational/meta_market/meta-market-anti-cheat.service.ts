// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C6 (anti-cheat cohort detection)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1.10 + plan §C6
//             Plan §C6 — detectCoordinatedCohort: scan meta_market_contributions (last 24h) for contribution
//               spikes (distinct contributor_hash per region+substance >= threshold) → insert cohort flags.
//             R2.3: detection threshold via MetaMarketTunables.coordinatedCohortDetectionThresholdAccounts (never inlined).
//             Determinism: NO Math.random() — detection is pure SQL COUNT DISTINCT (no RNG).
//             Zero-regression: purely ADDITIVE — reads meta_market_contributions, writes meta_market_cohort_flags ONLY.
//             L1 natural: no contributions in last 24h → 0 rows queried → 0 flags (zero-writes).
//             — 04d-C C6 — 2026-07-03
//
// `MetaMarketAntiCheatService` — daily cohort-detection job for the async meta-market.
//
// `detectCoordinatedCohort()`:
//   1. Query `meta_market_contributions` for distinct contributor_hash counts per (region_id, substance)
//      in the last 24 hours.
//   2. For each group where `distinct_contributors >= coordinatedCohortDetectionThresholdAccounts` (default 100):
//      Insert one `meta_market_cohort_flags` row with:
//        - flagged_pattern: 'volume_spike'
//        - cohort_size: the distinct_contributors count
//        - district_profile: NULL (region+substance level detection, no district axis)
//        - detected_at: DB default now()
//   3. Return the total count of flags written.
//
// Registered on `META_MARKET_ANTICHEAT_TICK` (NIGHTLY/19) by MetaMarketTickService (C6).
// BO-visible: flags are read by C8 GET /v1/admin/meta-market/anti-cheat-cluster-flags (gdd/13 consumer, TD).
//
// Idempotent: multiple runs over the same 24h window insert additional flag rows (by design — no dedup
//   on the flags table). Ops can timestamp-filter to see detection events over time.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { metaMarketCohortFlags } from '../../db/schema/meta_market';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { MetaMarketTunables } from './meta-market.tunables';

/** One row from the contribution-volume aggregation query. */
interface ContributionCountRow {
  region_id: string;
  substance: string;
  distinct_contributors: string; // PG COUNT returns bigint → string in drizzle raw SQL
}

@Injectable()
export class MetaMarketAntiCheatService {
  private readonly logger = new Logger(MetaMarketAntiCheatService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: MetaMarketTunables,
  ) {}

  /**
   * Detect coordinated contribution cohorts by scanning `meta_market_contributions` for the last 24h.
   *
   * For each (region_id, substance) pair where the distinct contributor count equals or exceeds
   * `coordinatedCohortDetectionThresholdAccounts` (default 100, gdd/14 registry, R2.3 via tunables),
   * inserts one `meta_market_cohort_flags` row (flagged_pattern='volume_spike').
   *
   * L1 natural: no contributions in the last 24h → 0 rows → 0 flags (ZERO writes).
   * Deterministic: pure SQL COUNT DISTINCT — no Math.random(), no Date.now() in the mechanic.
   *
   * @param _ctx — CitySimTickContext (unused; detection is wall-clock 24h window via DB NOW()).
   * @returns total number of flags written.
   */
  async detectCoordinatedCohort(_ctx?: CitySimTickContext): Promise<number> {
    // ── Step 1: aggregate distinct contributor counts per (region_id, substance) in last 24h ─────
    // Use raw SQL with DB NOW() — deterministic given same DB state, no Date.now() in code.
    // Canon SQL (plan §C6):
    //   SELECT region_id, substance::text, COUNT(DISTINCT contributor_hash) AS distinct_contributors
    //   FROM meta_market_contributions
    //   WHERE contributed_at >= NOW() - INTERVAL '24 hours'
    //   GROUP BY region_id, substance
    const countResult = await this.db.execute<Record<string, unknown>>(sql`
      SELECT region_id, substance::text, COUNT(DISTINCT contributor_hash) AS distinct_contributors
      FROM meta_market_contributions
      WHERE contributed_at >= NOW() - INTERVAL '24 hours'
      GROUP BY region_id, substance
    `);

    const countRows: ContributionCountRow[] = ((countResult.rows ?? countResult) as unknown[]) as ContributionCountRow[];

    if (countRows.length === 0) {
      this.logger.debug('detectCoordinatedCohort: no contributions in last 24h → 0 flags (L1 natural skip)');
      return 0;
    }

    // ── Step 2: R2.3 read threshold from tunables (never inline 100) ─────────────────────────────
    const threshold = this.tunables.coordinatedCohortDetectionThresholdAccounts;

    // ── Step 3: for each group above threshold, insert a cohort flag ──────────────────────────────
    let flagsWritten = 0;

    for (const row of countRows) {
      const distinctCount = Number(row.distinct_contributors);
      if (distinctCount < threshold) continue;

      // Insert one meta_market_cohort_flags row for this (region_id, substance) pair.
      // district_profile: NULL — cohort detection at region+substance level (no district axis, per plan §C6).
      // flagged_pattern: 'volume_spike' — the detected pattern type.
      // cohort_size: the distinct_contributors count (from the aggregation query).
      // detected_at: DB default now() (wallclock timestamp of detection).
      await this.db.insert(metaMarketCohortFlags).values({
        region_id:       row.region_id,
        substance:       row.substance as (typeof metaMarketCohortFlags.substance.enumValues)[number],
        district_profile: null,
        flagged_pattern: 'volume_spike',
        cohort_size:     distinctCount,
        // detected_at: DB default now() (not set here — the schema .defaultNow() handles it)
      });

      flagsWritten += 1;
      this.logger.log(
        `detectCoordinatedCohort: flagged (region=${row.region_id}, substance=${row.substance}) ` +
        `distinct_contributors=${distinctCount} >= threshold=${threshold} → volume_spike flag written`,
      );
    }

    this.logger.log(
      `detectCoordinatedCohort: scanned ${countRows.length} (region, substance) pairs → ${flagsWritten} flags written`,
    );

    return flagsWritten;
  }
}

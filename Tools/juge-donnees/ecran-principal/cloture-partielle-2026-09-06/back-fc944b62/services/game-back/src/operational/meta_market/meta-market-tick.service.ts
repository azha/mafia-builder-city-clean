// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C5 (tick registration)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C6 (anti-cheat tick registration)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 (HOURLY + NIGHTLY)
//             Plan §C5 — MetaMarketTickService registers META_MARKET_AGGREGATION_TICK (HOURLY/4)
//                        and META_MARKET_RETENTION_TICK (NIGHTLY/18).
//             Plan §C6 — MetaMarketTickService registers META_MARKET_ANTICHEAT_TICK (NIGHTLY/19).
//             REUSE: CitySimSchedulerService.registerSystem (same pattern as LaneCollapsePricingService C1,
//                    IATickService C4/C6, etc. — precedent onApplicationBootstrap pattern).
//             Collision check: HOURLY/1=MARKET_LANE_CLEARING, HOURLY/2=RIVAL_SATURATION_TICK,
//                              HOURLY/3=DEAD_HAND_TICK → HOURLY/4 is the next FREE slot.
//                              NIGHTLY/17=IA_THRESHOLD_TICK → NIGHTLY/18 is the next FREE slot.
//                              NIGHTLY/18=META_MARKET_RETENTION_TICK → NIGHTLY/19 is the next FREE slot (C6).
//             Determinism: NO Math.random(), NO Date.now() in the registration. The run callbacks
//               (runHourlyAggregation / purgeOlderThan / detectCoordinatedCohort) own their own determinism guarantees.
//             Zero-regression: ADDITIVE — registers NEW slots; no existing slot is touched.
//             — 04d-C C5 — 2026-07-03
//             — 04d-C C6 — 2026-07-03 (META_MARKET_ANTICHEAT_TICK NIGHTLY/19 added)
//
// `MetaMarketTickService` — NestJS OnApplicationBootstrap that registers the 2 NEW CitySimSystems
// for the meta-market:
//
//   META_MARKET_AGGREGATION_TICK — HOURLY/4 (next free after DEAD_HAND_TICK/3).
//     Runs `MetaMarketAggregationService.runHourlyAggregation` each in-game hour.
//     L1 skip when no pending contributions (empty-state zero-regression).
//
//   META_MARKET_RETENTION_TICK — NIGHTLY/18 (next free after IA_THRESHOLD_TICK/17).
//     Runs `MetaMarketRetentionService.purgeOlderThan` each in-game night.
//     Purges `meta_market_signals` + `meta_market_contributions` older than `retention_days`.
//
// Both registrations use `registerSystem` which throws at startup if the slot is not declared in
// `SCHEDULE` — this is the canonical collision guard (no two systems can occupy the same slot).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { MetaMarketAggregationService } from './meta-market-aggregation.service';
import { MetaMarketRetentionService } from './meta-market-retention.service';
import { MetaMarketAntiCheatService } from './meta-market-anti-cheat.service';
import { MetaMarketTunables } from './meta-market.tunables';

@Injectable()
export class MetaMarketTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetaMarketTickService.name);

  constructor(
    private readonly scheduler:        CitySimSchedulerService,
    private readonly aggregation:      MetaMarketAggregationService,
    private readonly retention:        MetaMarketRetentionService,
    private readonly antiCheat:        MetaMarketAntiCheatService,
    private readonly tunables:         MetaMarketTunables,
  ) {}

  /**
   * Register the 2 meta-market CitySimSystems on the shared scheduler at application bootstrap.
   *
   * Both slots are declared in `CitySimSchedulerService.SCHEDULE` and `CitySystemId` (C5 additions).
   * `registerSystem` throws if the slot is not in SCHEDULE — the startup check is the collision guard.
   */
  onApplicationBootstrap(): void {
    // ── META_MARKET_AGGREGATION_TICK — HOURLY/4 ─────────────────────────────────────────────────
    // Runs MetaMarketAggregationService.runHourlyAggregation each in-game hour.
    // Slot: HOURLY/4 (next free after DEAD_HAND_TICK=HOURLY/3). Declared in SCHEDULE + CitySystemId.
    // L1 skip: if no pending contributions → ZERO writes (zero-regression invariant).
    // Deterministic: no Math.random(), no Date.now() in the scheduler callback itself.
    this.scheduler.registerSystem({
      id:     CitySystemId.META_MARKET_AGGREGATION_TICK,
      cadence: Cadence.HOURLY,
      order:  4,
      run:    (ctx) => this.aggregation.runHourlyAggregation(ctx),
    });
    this.logger.log(
      'MetaMarketTickService: registered META_MARKET_AGGREGATION_TICK at HOURLY/4 — ' +
      'each in-game hour aggregates pending meta_market_contributions → upserts meta_market_signals ' +
      '(trim 5% + median/p10/p90). L1 skip when empty. Collision-free (HOURLY/4 = next free after DEAD_HAND_TICK/3).',
    );

    // ── META_MARKET_RETENTION_TICK — NIGHTLY/18 ─────────────────────────────────────────────────
    // Runs MetaMarketRetentionService.purgeOlderThan each in-game night.
    // Slot: NIGHTLY/18 (next free after IA_THRESHOLD_TICK=NIGHTLY/17). Declared in SCHEDULE + CitySystemId.
    // Idempotent: DELETE WHERE is pure — re-running with the same cutoff produces the same DB state.
    // Purges: meta_market_signals (aggregated_at < cutoff) + meta_market_contributions (contributed_at < cutoff).
    this.scheduler.registerSystem({
      id:     CitySystemId.META_MARKET_RETENTION_TICK,
      cadence: Cadence.NIGHTLY,
      order:  18,
      run:    async (ctx) => { await this.retention.purgeOlderThan(this.tunables.retentionDays, ctx); },
    });
    this.logger.log(
      'MetaMarketTickService: registered META_MARKET_RETENTION_TICK at NIGHTLY/18 — ' +
      'each in-game night purges meta_market_signals + meta_market_contributions older than ' +
      `retentionDays (default=${this.tunables.retentionDays}). Idempotent. ` +
      'Collision-free (NIGHTLY/18 = next free after IA_THRESHOLD_TICK/17).',
    );

    // ── META_MARKET_ANTICHEAT_TICK — NIGHTLY/19 ─────────────────────────────────────────────────
    // Runs MetaMarketAntiCheatService.detectCoordinatedCohort each in-game night.
    // Slot: NIGHTLY/19 (next free after META_MARKET_RETENTION_TICK=NIGHTLY/18). Declared in SCHEDULE + CitySystemId.
    // L1 natural: if no contributions in last 24h → ZERO writes (zero-regression invariant).
    // Deterministic: no Math.random() — detection is pure SQL COUNT DISTINCT.
    // BO-visible: flags are read by C8 GET /v1/admin/meta-market/anti-cheat-cluster-flags (gdd/13 consumer, TD).
    this.scheduler.registerSystem({
      id:     CitySystemId.META_MARKET_ANTICHEAT_TICK,
      cadence: Cadence.NIGHTLY,
      order:  19,
      run:    async (ctx) => { await this.antiCheat.detectCoordinatedCohort(ctx); },
    });
    this.logger.log(
      'MetaMarketTickService: registered META_MARKET_ANTICHEAT_TICK at NIGHTLY/19 — ' +
      'each in-game night scans meta_market_contributions (last 24h) for coordinated cohorts ' +
      `(threshold=${this.tunables.coordinatedCohortDetectionThresholdAccounts}). ` +
      'L1 natural: 0 contributions → 0 flags. Deterministic (SQL COUNT DISTINCT). ' +
      'Collision-free (NIGHTLY/19 = next free after META_MARKET_RETENTION_TICK/18).',
    );
  }
}

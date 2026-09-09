// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C0 (DI shell)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1 (MaxMindGeoIpService wired)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1b (RegionService wired)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C4 (MetaMarketHashService + MetaMarketContributionService wired)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C5 (MetaMarketAggregationService + MetaMarketRetentionService + MetaMarketTickService wired)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C6 (MetaMarketReadService + MetaMarketAntiCheatService wired)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1
//             Architecture mirror: services/game-back/src/operational/insurance/insurance.module.ts
//             — 04d-C C0 — 2026-07-03
//             — 04d-C C1 — 2026-07-03 (MaxMindGeoIpService added to providers; MetaMarketTestController C1 routes)
//             — 04d-C C4 — 2026-07-03 (MetaMarketHashService + MetaMarketContributionService added)
// `MetaMarketModule` — the NestJS module for the §1 Async Meta-Market mechanics (04d-C, G4).
//
// C0 = EMPTY SCAFFOLD. providers [MetaMarketStubService (DI anchor stub)], no schema, no migration,
// no tick. Only MetaMarketTestController (test-only ping probe /v1/_test/meta-market/ping, R-EC-2)
// is conditionally mounted to prove module wiring. The DI seams are anchored so TypeScript resolution
// failures surface at C0 rather than at the first consuming chunk.
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (C5 META_MARKET_AGGREGATION_TICK
//     HOURLY + META_MARKET_RETENTION_TICK NIGHTLY — precedent MARKET_LANE_CLEARING HOURLY/1
//     city_sim_scheduler.service.ts:275 + lane-collapse-pricing.service.ts:75). Also provides
//     CityEventBus (scheduler.module.ts exports it).
//   NEW (C1): MaxMindGeoIpService — in-process GeoLite2 .mmdb reader (IP → country, decision #1,
//     zero external runtime call, ch21/22 self-hosted posture).
//   NEW (C1b): RegionService — assignRegionFromIp / getRegion. Tables: region + region_country_map +
//     additive player.region_id (mig 0102, ch09 schema_region.md).
//   NEW (C2): MetaMarketRepository + meta_market_signals + meta_market_contributions
//     (contributor_hash ONLY — HMAC-SHA256, privacy wall) + meta_market_cohort_flags (mig 0103-0104, ch09 schema_meta_market.md).
//   NEW (C3): MetaMarketTunables — 9 canon meta_market.* keys (sample_floor=5, trim_pct=5,
//     bucket_duration_minutes=60, retention_days=30, default_visibility=on,
//     aggregation_worker_count=1, contribution_rate_limit_per_player_per_hour=1,
//     hmac_secret_rotation_days=30, coordinated_cohort_detection_threshold_accounts=100) +
//     2 perf_budget.* keys + region keys [PROV-Y26Q2].
//   NEW (C4): MetaMarketContributionService.recordDeal + MetaMarketHashService (HMAC-SHA256).
//     The ADDITIVE sell-path emit (decision #2, RATIFIÉ — see meta-market-stub.service.ts §RE-ANCHOR).
//   NEW (C5): MetaMarketAggregationService (runHourlyAggregation, trim/median/p10/p90) +
//     MetaMarketRetentionService (purgeOlderThan, NIGHTLY retention) +
//     MetaMarketTickService (registers META_MARKET_AGGREGATION_TICK HOURLY/4 + META_MARKET_RETENTION_TICK NIGHTLY/18).
//   NEW (C6): MetaMarketReadService.getSignal (clear aggregate OR 'insufficient_signal' < sample_floor) +
//     MetaMarketAntiCheatService.detectCoordinatedCohort → meta_market_cohort_flags.
//   NEW (C7): Privacy wall enforcement (grep-zero player_id + sample-floor server-side).
//   NEW (C8): MetaMarketAdminController (5 endpoints requireStaffRole, F3 mutators) + visibility
//     toggle + determinism sweep + ch09/gdd14/gdd15 reconcile + DIRS wire + merge-gate. CLOSES ch04d.
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path
// is touched.
//
// EXPORTS: (nothing exported at C0 — C4+ expose MetaMarketContributionService to SellingModule seam).

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { MetaMarketStubService } from './meta-market-stub.service';
import { MaxMindGeoIpService } from './maxmind-geoip.service';
import { RegionService } from './region.service';
import { MetaMarketTunables } from './meta-market.tunables';
import { MetaMarketHashService } from './meta-market-hash.service';
import { MetaMarketContributionService } from './meta-market-contribution.service';
import { MetaMarketAggregationService } from './meta-market-aggregation.service';
import { MetaMarketRetentionService } from './meta-market-retention.service';
import { MetaMarketReadService } from './meta-market-read.service';
import { MetaMarketAntiCheatService } from './meta-market-anti-cheat.service';
import { MetaMarketTickService } from './meta-market-tick.service';
import { MetaMarketTestController } from './meta-market-test.controller';
import { MetaMarketAdminController } from './meta-market-admin.controller';
import { MetaMarketController } from './meta-market.controller';

// MetaMarketAdminController: BO production routes (C8 — always-on, 5 endpoints requireStaffRole).
// W6.3 C5: MetaMarketController is ALWAYS-ON (production PLAYER routes, `me/meta-market/*`).
// MetaMarketTestController: test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  MetaMarketAdminController,                                            // C8: always-on BO routes (requireStaffRole — non-spoofable JWT).
  MetaMarketController,                                                 // W6.3 C5: always-on PLAYER routes
  ...(testControllersEnabled() ? [MetaMarketTestController] : []),     // test-only probe routes
];

@Module({
  imports: [
    SchedulerModule, // C5: CitySimSchedulerService (META_MARKET_AGGREGATION_TICK HOURLY + META_MARKET_RETENTION_TICK NIGHTLY).
                     // Also provides CityEventBus (scheduler.module.ts exports it).
                     // C1b: DB + REDIS injection is provided by @Global() DbModule (imported by AppModule root).
  ],
  controllers,
  providers: [
    MetaMarketStubService,             // C0: DI anchor stub — replaced by real services in C1+.
    MaxMindGeoIpService,               // C1: in-process GeoLite2 .mmdb reader (IP → country, decision #1, zero external runtime call).
    RegionService,                      // C1b: IP → country → region_id → UPDATE player.region_id (derive-then-discard, decision #b).
    MetaMarketTunables,                // C3: 9 canon meta_market.* + 2 perf_budget.* + 2 region keys [PROV-Y26Q2].
    MetaMarketHashService,             // C4: HMAC-SHA256 hasher (player_id → contributor_hash, NEVER stored raw).
    MetaMarketContributionService,     // C4: additive sell-path contribution recorder (recordDeal, rate-limit SELECT-guard).
    MetaMarketAggregationService,      // C5: HOURLY aggregation (runHourlyAggregation: trim 5% + median/p10/p90 → meta_market_signals).
    MetaMarketRetentionService,        // C5: NIGHTLY retention purge (purgeOlderThan: delete signals + contributions > retention_days).
    MetaMarketReadService,             // C6: getSignal read API (clear aggregate OR 'insufficient_signal' < sample_floor) + 7d trend.
    MetaMarketAntiCheatService,        // C6: detectCoordinatedCohort → meta_market_cohort_flags (NIGHTLY/19, SQL COUNT DISTINCT).
    MetaMarketTickService,             // C5+C6: registers META_MARKET_AGGREGATION_TICK HOURLY/4 + META_MARKET_RETENTION_TICK NIGHTLY/18 + META_MARKET_ANTICHEAT_TICK NIGHTLY/19.
  ],
  exports: [
    MaxMindGeoIpService,               // C1: exported — consumed by RegionService (C1b) for IP → country → region_id resolution.
    RegionService,                      // C1b: exported — consumed by MetaMarketContributionService (C4) for playerId → region_id.
    MetaMarketTunables,                // C3: exported — consumed by C4+ services (MetaMarketContributionService, etc.).
    MetaMarketHashService,             // C4: exported — consumed by MetaMarketContributionService (C4) for HMAC-SHA256.
    MetaMarketContributionService,     // C4: exported — consumed by SellingModule (SellingSellService additive emit).
    MetaMarketReadService,             // C6: exported — consumed by MetaMarketTestController (C6 routes) + BO C8.
  ],
})
export class MetaMarketModule {}

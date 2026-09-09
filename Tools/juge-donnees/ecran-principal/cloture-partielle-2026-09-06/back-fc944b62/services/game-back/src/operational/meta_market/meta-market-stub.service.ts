// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C0 (DI shell)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1
//             Architecture mirror: services/game-back/src/operational/insurance/insurance.module.ts
//             — 04d-C C0 — 2026-07-03
//
// `MetaMarketStubService` — C0 DI anchor stub.
//
// C0 = EMPTY SCAFFOLD. No logic, no schema, no migration. Injected by MetaMarketModule to prove
// DI resolution at boot. C1+ chunks will ADD the concrete services (MaxMindGeoIpService,
// RegionService, MetaMarketContributionService, MetaMarketHashService, MetaMarketAggregationService,
// MetaMarketRetentionService, MetaMarketReadService, MetaMarketAntiCheatService, MetaMarketTickService,
// MetaMarketTunables, MetaMarketAdminController, MetaMarketRepository).
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (C5 META_MARKET_AGGREGATION_TICK
//     HOURLY + META_MARKET_RETENTION_TICK NIGHTLY — precedent MARKET_LANE_CLEARING HOURLY/1
//     city_sim_scheduler.service.ts:275 + lane-collapse-pricing.service.ts:75).
//   REUSE: node:crypto (HMAC-SHA256, C4) — available (market-rng.service.ts / forbidden-triad.service.ts).
//   NEW (C1): MaxMindGeoIpService — in-process GeoLite2 .mmdb reader (IP → country, decision #1).
//   NEW (C1b): RegionService — IP → country → region_id → UPDATE player.region_id (derive-then-discard,
//     decision #1 RGPD). Tables: region + region_country_map + additive player.region_id (mig 0102).
//   NEW (C2): db/schema/meta_market.ts — meta_market_signals + meta_market_contributions
//     (contributor_hash ONLY — HMAC-SHA256, privacy wall C7) + meta_market_cohort_flags (mig 0103-0104).
//   NEW (C3): MetaMarketTunables — 9 canon meta_market.* keys + 2 perf_budget.* + region keys [PROV-Y26Q2].
//   NEW (C4): MetaMarketContributionService.recordDeal — ADDITIVE emit on sell-commit path
//     (SellingSellService.runMinuteTick, see sell-path re-anchor comment below). HMAC-SHA256 via
//     MetaMarketHashService. Rate-limit 1/player/substance/district/hour.
//   NEW (C5): MetaMarketTickService — registers META_MARKET_AGGREGATION_TICK (HOURLY, L1 skip)
//     + META_MARKET_RETENTION_TICK (NIGHTLY purge). MetaMarketAggregationService + MetaMarketRetentionService.
//   NEW (C6): MetaMarketReadService.getSignal (clear aggregate OR 'insufficient_signal' < sample_floor) +
//     MetaMarketAntiCheatService.detectCoordinatedCohort → meta_market_cohort_flags.
//   NEW (C7): Privacy wall — HMAC enforcement (no raw player_id ever persisted) + sample-floor server-side.
//   NEW (C8): MetaMarketAdminController (5 BO endpoints requireStaffRole) + visibility toggle +
//     determinism sweep + ch09/gdd14/gdd15 reconcile + merge-gate full suite. CLOSES ch04d.
//
// Sell-path RE-ANCHOR (decision #2, RATIFIÉ — C4 will emit here):
//   The sell-commit path = SellingSellService.runMinuteTick (MINUTE/10 = DEALER_SELL).
//   Player schema file for region_id column = services/game-back/src/db/schema/player.ts.
//   Located by reading:
//     services/game-back/src/operational/selling/selling-sell.service.ts  (the tick at MINUTE/10)
//   The contribution emit in C4 will be ADDITIVE after `await this.repo.applySells(ctx.playerId, mutations)`
//   (line ~224), carrying `{ playerId, substance_type, district_id, realizedPriceCents, gameMinute }`
//   per-mutation — hot-path return void is byte-identical (DealAcceptedEvent ADDITIVE precedent).
//   The `districtId` is available from `sellable[].district_id`; `substance_type` from `mutations[].substance_type`;
//   `realizedPriceCents` = mutations[].float_delta_cents / mutations[].grams_sold
  //     = the per-gram realized sell price (float_delta_cents = grams_sold × valuePerGram, so the
  //       ratio yields valuePerGram). Per-deal contribution value (decision #e: per-deal price, not hourly avg).
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path
// is touched. The sell-path emit (decision #2) lands at C4 as the scoped ADDITIVE seam.

import { Injectable } from '@nestjs/common';

/**
 * C0 DI anchor stub for MetaMarketModule.
 *
 * Holds no logic. Its sole purpose is to be resolvable by the DI graph at C0, proving the module
 * shell is correctly wired. Real services (RegionService, MetaMarketContributionService, etc.)
 * are added in C1–C8.
 */
@Injectable()
export class MetaMarketStubService {}

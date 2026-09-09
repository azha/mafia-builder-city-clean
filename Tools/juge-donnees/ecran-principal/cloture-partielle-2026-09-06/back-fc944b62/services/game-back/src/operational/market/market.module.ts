// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2 (MarketModule backbone)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 1 (C1) + Task 2 (C2) + Task 3 (C3) + Task 4 (C4) + Task 5 (C5)
//             — D1b C1 — 2026-06-16
//             — D1b C2 — 2026-06-16 (LaneCollapsePricingService + HOURLY tick)
//             — D1b C3 — 2026-06-16 (CompositionTelegraphService + NIGHTLY tick)
//             — D1b C4 — 2026-06-16 (WearMarkPremiumService + lot_handling_vector REUSE + district demographics)
//             — D1b C5 — 2026-06-16 (CarryingCapacityHazeService + district_capacity_state + permanent-damage daily-tick)
//
// `MarketModule` — the NestJS module for the §2 market mechanics (D1b).
//
// C1 wires:
//   - MarketProjectionService (the R2.2 banded-projection filter — the P5 wall for all 4 mechanics)
//   - MarketRngService (deterministic day/tick-seeded RNG — C4)
//   - MarketTestController (test-only probe: /v1/_test/market/projection-probe + /rng-probe)
//     mounted ONLY when NODE_ENV !== 'production' (R-EC-2, same pattern as ProtocolTestController,
//     CitySimTestController, HeatModule, DealLekModule — see testControllersEnabled()).
//
// C2 adds:
//   - LaneCollapsePricingService (§2.1 Lane Collapse Pricing update-rule + HOURLY clearing-tick)
//     registered at HOURLY/1 = MARKET_LANE_CLEARING in onApplicationBootstrap.
//   - Additional test routes on MarketTestController:
//     POST /v1/_test/market/lane-collapse/process-deal
//     GET  /v1/_test/market/lane-collapse/projection
//     POST /v1/_test/market/lane-collapse/init-lane
//
// C3 adds:
//   - CompositionTelegraphService (§2.2 Composition Telegraph roster + daily inference tick)
//     registered at NIGHTLY/4 = MARKET_COMPOSITION_INFERENCE in onApplicationBootstrap.
//   - Additional test routes on MarketTestController:
//     POST /v1/_test/market/composition-telegraph/record-attribution
//     POST /v1/_test/market/composition-telegraph/run-inference-tick
//     GET  /v1/_test/market/composition-telegraph/roster-entries
//
// C4 adds:
//   - WearMarkPremiumService (§2.3 Wear-Mark Premium — lot_handling_vector REUSE + district demographics)
//     NO tick (Wear-Mark is event-driven per distribution leg, not tick-driven).
//   - Additional test routes on MarketTestController:
//     POST /v1/_test/market/wear-mark/mutate-lot-vector
//     POST /v1/_test/market/wear-mark/seed-district-demographics
//     POST /v1/_test/market/wear-mark/compute-realised-price
//     GET  /v1/_test/market/wear-mark/lot-vector
//
// C5 adds:
//   - CarryingCapacityHazeService (§2.4 Carrying-Capacity Haze — permanent K-damage daily-tick + §3.3 emission contract)
//     registered at NIGHTLY/5 = MARKET_CARRYING_CAPACITY_HAZE in onApplicationBootstrap.
//   - Additional test routes on MarketTestController:
//     POST /v1/_test/market/carrying-capacity/ensure-district
//     POST /v1/_test/market/carrying-capacity/add-throughput
//     POST /v1/_test/market/carrying-capacity/apply-tick
//     POST /v1/_test/market/carrying-capacity/civic-investment
//     GET  /v1/_test/market/carrying-capacity/haze-projection
//     GET  /v1/_test/market/carrying-capacity/capacity-row
//
// Later chunks (C6–C7) add the selling integration and BO controller.
// This module is ADDITIVE — no existing module is modified by C5 except this file.
//
// IMPORTS:
//   - SchedulerModule (CitySimSchedulerService — needed for HOURLY + NIGHTLY tick registration)
//   - DB (the Drizzle client — lane_pricing_state + buyer_roster_entry + lot_handling_vector upserts)
//
// EXPORTS: MarketProjectionService (consumed by C2–C7 to route ALL player projections through the R2.2 filter)
//          MarketRngService (consumed by C3 Composition Telegraph and C2 scatter).
//          LaneCollapsePricingService (consumed by test controller and later BO routes).
//          CompositionTelegraphService (consumed by test controller and later BO routes + C6 opening-price coupling).
//          WearMarkPremiumService (consumed by test controller and later C6 selling integration).
//          CarryingCapacityHazeService (consumed by test controller and later C6 selling integration + BO routes).

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { MarketProjectionService } from './market-projection.service';
import { MarketRngService } from './market-rng.service';
import { LaneCollapsePricingService } from './lane-collapse-pricing.service';
import { CompositionTelegraphService } from './composition-telegraph.service';
import { WearMarkPremiumService } from './wear-mark-premium.service';
import { CarryingCapacityHazeService } from './carrying-capacity-haze.service';
import { MarketTestController } from './market-test.controller';
import { MarketAdminController } from './market-admin.controller';
import { MarketController } from './market.controller';

// MarketTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// MarketAdminController: production BO routes (ops/admin staff) — always registered (C7).
// MarketController: W6.2 C5 — always-on player route (mirrors InsuranceController/ReputationController).
const controllers = [
  ...(testControllersEnabled() ? [MarketTestController] : []),
  MarketAdminController,
  MarketController,
];

@Module({
  imports: [SchedulerModule], // DbModule is @Global() — no explicit import needed.
  controllers,
  providers: [MarketProjectionService, MarketRngService, LaneCollapsePricingService, CompositionTelegraphService, WearMarkPremiumService, CarryingCapacityHazeService],
  exports: [MarketProjectionService, MarketRngService, LaneCollapsePricingService, CompositionTelegraphService, WearMarkPremiumService, CarryingCapacityHazeService],
})
export class MarketModule {}

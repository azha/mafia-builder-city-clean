// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 1 (B1) + Task 3 (B3)
//             docs/tech/04a_operational_systems/precursors_supply_chain.md §Dynamique de prix des précurseurs
//             — D1c B1+B3 — 2026-06-16
//
// `PrecursorMarketModule` — NestJS module for the D1c precursor buy-market mechanics.
//
// B1 wires:
//   - PrecursorMarketStateService (the R2.2 projection scaffold + registry-getter wiring)
//   - SupplierPressureService (observable-only empty shell; B5 fills the logic)
//   - PrecursorMarketTestController (test-only probe: /v1/_test/precursor-market/projection-probe + /rng-probe)
//     mounted ONLY when NODE_ENV !== 'production' (R-EC-2, same pattern as MarketTestController).
//
// B3 wires:
//   - The NIGHTLY inference tick: `PrecursorMarketModule.onApplicationBootstrap()` registers
//     `PrecursorMarketStateService.inferDailyTrend` at `Cadence.NIGHTLY / order=6`
//     (`CitySystemId.PRECURSOR_MARKET_INFERENCE`). Mirrors `CompositionTelegraphService:86-91`.
//
// DD-REG REUSE: imports `MarketModule` to get the exported `MarketRngService` and
// `MarketProjectionService` — does NOT re-host or duplicate them. The two REUSE services
// are injected from the imported module's providers.
//
// EXPORTS: PrecursorMarketStateService (consumed by later D1c chunks + future selling/BO integration).
//          SupplierPressureService (consumed by B5+ + later selling integration).

import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { MarketModule } from '../market/market.module';
import { PrecursorMarketStateService } from './precursor-market.service';
import { SupplierPressureService } from './precursor-supplier-pressure.service';
import { PrecursorMarketTestController } from './precursor-market-test.controller';
import { PrecursorMarketAdminController } from './precursor-market-admin.controller';

// PrecursorMarketTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// PrecursorMarketAdminController: always-on BO true-state routes (role-guarded, not test-gated).
//   Pattern mirrors MarketAdminController registration in MarketModule (market.module.ts:85 —
//   NOT conditional on NODE_ENV; these are real production BO routes).
const controllers = [
  PrecursorMarketAdminController, // always-on BO (role-guarded, not test-gated)
  ...(testControllersEnabled() ? [PrecursorMarketTestController] : []),
];

@Module({
  imports: [MarketModule, SchedulerModule], // DbModule is @Global() — no explicit import needed.
  controllers,
  providers: [PrecursorMarketStateService, SupplierPressureService],
  exports: [PrecursorMarketStateService, SupplierPressureService],
})
export class PrecursorMarketModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(PrecursorMarketModule.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly svc: PrecursorMarketStateService,
  ) {}

  onApplicationBootstrap(): void {
    // Register the NIGHTLY demand-accumulator inference tick (D1c B3 — DD-T endogenous).
    // Pattern mirrors CompositionTelegraphService:86-91 (same scheduler + cadence API).
    // Order 6 = next free NIGHTLY slot after MARKET_CARRYING_CAPACITY_HAZE/5.
    this.scheduler.registerSystem({
      id: CitySystemId.PRECURSOR_MARKET_INFERENCE,
      cadence: Cadence.NIGHTLY,
      order: 6,
      run: (ctx: CitySimTickContext) => this.svc.inferDailyTrend(ctx),
    });
    this.logger.log(
      'PrecursorMarketModule registered PRECURSOR_MARKET_INFERENCE at NIGHTLY/6 — ' +
        'each in-game day: decay demand_accumulator × demand_accumulator_decay, ' +
        'then compare to demand_trend_up/down_threshold → writes price_trend + last_inference_day. ' +
        'DD-T endogenous (no autonomous cycle), idempotent per day (last_inference_day guard). ' +
        'Math.random() BANNED (C4) — pure threshold function of the persisted accumulator.',
    );
  }
}

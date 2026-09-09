// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §NestJS — backend jeu (SellingService
//             in-process in game-back) + §How a deal works / §Lek control vs dealer assignment +
//             composition_overview.md §Cross-cutting (the city-sim scheduler is the shared tick engine the
//             operational sell-advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// `SellingModule` — wires the Phase-2 M1 dealer-at-lek selling slice (assign → tick-driven sell → runner collect →
// safehouse) into the game-back modular monolith. Copies the persisted-system module template (DistributionModule):
//   - the player ACTIONS: SellingService.assignDealer (Step 1 — create a WORKING Brindle dealer at an operational
//     dealer-spot covering a lek tile) + SellingService.collect (Step 2 — the runner pickup: ferry the dealer's whole
//     float into a player-owned safehouse, depositing into the Erlang slot model, guarded/atomic).
//   - the DEALER-SELL TICK-HOOK: SellingSellService registers into the CitySimScheduler at the slot {MINUTE/10
//     DEALER_SELL} at boot (after COURIER_TRANSIT/9), REPLACING the no-op placeholder there — each in-game minute it
//     sells product at every WORKING dealer at a lek-present operational dealer-spot (decrement product_storage
//     guarded, increment dealer.float_cents), in batched set-based SQL. This is the operational tick-hook PATTERN
//     T1–T5 share (same registerSystem path the setup/arrival/cook/transit hooks use at MINUTE/6, /7, /8, /9).
//   - the REPOSITORY (SellingRepository) owns the raw Drizzle reads/writes against dealer + product_storage (T0) +
//     building_operational_state (the operational gate, T0) + buildings (Phase-1 — ownership) + deal_leks (Phase-1,
//     System 11 — the lek presence READ, never recomputed) + safehouses (Phase-1, System 9 — the Erlang slot model
//     the deposit fills) (R9.3 — it READS the schema, never redefines it).
//   - the PROJECTION (SellingProjectionService) maps the raw dealer state + float → a qualitative activity band +
//     cash band (R2.2, no raw cents/tile/grams).
//   - the player-facing CONTROLLER (SellingController) exposes the assign + collect actions + the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the sell tick-hook calls registerSystem on it) +
// AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution) + ErlangStashModule (EXPORTS
// ErlangStashService — the read-only coupling the collect uses to interpret the safehouse occupation/blocking; System
// 9 is CONSUMED, never reimplemented — the patrol→police_memory read-only coupling precedent). System 11 (Deal Lek)
// is consumed by READING the persisted deal_leks row in the batched sell query (a persisted-row SELECT, never a
// lek_score recompute), so no DealLekModule import is needed (the lek presence is the row, not a service call).
// Depends on the @Global() DbModule (the repository/controller inject the DB provider). EXPORTS the service +
// projection so later operational modules (T6 laundering, which consumes the safehouse cash) can inject them if needed.
//
// Phase 2b vector #2b (Hush addiction-loyalty, T5): imports HushModule (EXPORTS HushAddictionService +
// HushAddictionRepository) so the substance-aware DEALER_SELL tick (SellingSellService) reads the DEPENDENT selling
// boost + accumulates the per-spot loyalty on a Hush deal, and the dealer projection (SellingProjectionService)
// surfaces a Hush spot's addiction_loyalty_status (LOW/STABLE/HIGH) + withdrawn (R2.2). Brindle/Crick (addiction=false)
// are behavior-preserving — gated on descriptor.addiction===true, no addiction read.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { ErlangStashModule } from '../../citysim/erlang_stash/erlang-stash.module';
import { HeatContribModule } from '../heat_contrib/heat-contrib.module';
import { HushModule } from '../hush/hush.module';
import { MarketModule } from '../market/market.module';
import { MetaMarketModule } from '../meta_market/meta-market.module';
import { SellingRepository } from './selling.repository';
import { SellingService } from './selling.service';
import { SellingSellService } from './selling-sell.service';
import { SellingProjectionService } from './selling.projection.service';
import { SellingController } from './selling.controller';

// D1b C6: import MarketModule (EXPORTS LaneCollapsePricingService — needed by SellingSellService to route
// the DEALER_SELL tick clearing through the §2.1 Lane Collapse Pricing mechanic — DD11 realized).
// 04d-C C4: import MetaMarketModule (EXPORTS MetaMarketContributionService — needed by SellingSellService
// for the additive sell-path contribution emit, decision #2 RATIFIÉ).
@Module({
  imports: [SchedulerModule, AuthModule, ErlangStashModule, HeatContribModule, HushModule, MarketModule, MetaMarketModule],
  controllers: [SellingController],
  providers: [SellingRepository, SellingService, SellingSellService, SellingProjectionService],
  // Drift C6: export SellingSellService so InsuranceTestController (InsuranceModule) can inject it
  // for the sell-tick-probe route (the real runMinuteTick call in the C6 E2E test).
  exports: [SellingService, SellingProjectionService, SellingSellService],
})
export class SellingModule {}

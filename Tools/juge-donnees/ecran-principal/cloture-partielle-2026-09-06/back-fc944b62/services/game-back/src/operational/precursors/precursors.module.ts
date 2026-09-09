// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §NestJS — backend jeu (PrecursorService
//             in-process in game-back) + §Canal légitime — Pyralin + composition_overview.md §Cross-cutting (the
//             city-sim scheduler is the shared tick engine the operational arrival-advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorsModule` — wires the Phase-2 M1 Pyralin sourcing slice (order → lead-time arrival → stock) into the
// game-back modular monolith. Copies the persisted-system module template (RealEstateModule):
//   - the player ACTION: PrecursorService.order (Step 1 — legitimate Pyralin order, debits the grounded order cost
//     = qty × pyralin_unit_price_ratio × the STANDARD-cover reference conversion cost; creates a pending
//     precursor_order that arrives after the deterministic Pyralin lead time).
//   - the ARRIVAL TICK-HOOK: PrecursorArrivalService registers into the CitySimScheduler at the slot {MINUTE/7
//     PRECURSOR_ARRIVAL} at boot (after OPERATIONAL_SETUP/6), REPLACING the no-op placeholder there — each in-game
//     minute it delivers pending orders whose arrives_at_tick has passed (marks delivered + increments
//     precursor_stock). This is the operational tick-hook PATTERN T2–T6 share (same registerSystem path the setup
//     hook uses at MINUTE/6).
//   - the REPOSITORY (PrecursorsRepository) owns the raw Drizzle reads/writes against precursor_order +
//     precursor_stock (T0) + building_operational_state (the operational gate, T0) + economy_states (Phase-1) +
//     city_sim_clock (the ordered_at_tick read, Phase-1) (R9.3 — it READS the schema, never redefines it).
//   - the PROJECTION (PrecursorsProjectionService) maps the raw stock quantity + order statuses → qualitative bands
//     (stock band / order-state booleans — R2.2, no raw count/price/ticks).
//   - the player-facing CONTROLLER (PrecursorsController) exposes the order action + the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the arrival tick-hook calls registerSystem on it) +
// AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution). Depends on the @Global() DbModule (the
// repository/controller inject the DB provider). EXPORTS the service + projection so later operational modules
// (T3 production, which consumes precursor stock) can inject them if needed.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { PrecursorsRepository } from './precursors.repository';
import { PrecursorService } from './precursors.service';
import { PrecursorArrivalService } from './precursor-arrival.service';
import { PrecursorsProjectionService } from './precursors.projection.service';
import { PrecursorsController } from './precursors.controller';
// B3: import PrecursorMarketModule to inject PrecursorMarketStateService into PrecursorService
// (for the post-debit recordOrderDemand hook — DD-T endogenous demand signal).
import { PrecursorMarketModule } from './precursor-market.module';
// P3-F C6 — CategoryDelegationGuardModule EXPORTS CategoryDelegationGuard (PrecursorsController's
// SUPPLY_SOURCING guard site). A pure leaf — no circular dependency.
import { CategoryDelegationGuardModule } from '../../meta_progression/category-delegation-guard.module';

@Module({
  imports: [SchedulerModule, AuthModule, PrecursorMarketModule, CategoryDelegationGuardModule],
  controllers: [PrecursorsController],
  providers: [
    PrecursorsRepository,
    PrecursorService,
    PrecursorArrivalService,
    PrecursorsProjectionService,
  ],
  exports: [PrecursorService, PrecursorsProjectionService],
})
export class PrecursorsModule {}

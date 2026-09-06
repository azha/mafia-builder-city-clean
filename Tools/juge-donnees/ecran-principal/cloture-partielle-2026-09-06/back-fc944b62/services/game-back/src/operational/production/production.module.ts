// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §NestJS — backend jeu (ProductionBrindleService
//             in-process in game-back) + §Vue d'ensemble du pipeline 4-stage + composition_overview.md §Cross-cutting
//             (the city-sim scheduler is the shared tick engine the operational cook-advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 3) --
//
// `ProductionModule` — wires the Phase-2 M1 Brindle production slice (startCook → tick-advance cook cycle → product
// yield) into the game-back modular monolith. Copies the persisted-system module template (PrecursorsModule):
//   - the player ACTION: ProductionService.startCook (Step 1 — consumes ONE batch of Pyralin from precursor_stock,
//     guarded; creates a cook_session at current_stage='stage_1' on a player-owned OPERATIONAL LAB).
//   - the COOK-ADVANCE TICK-HOOK: ProductionCookAdvanceService registers into the CitySimScheduler at the slot
//     {MINUTE/8 COOK_ADVANCE} at boot (after PRECURSOR_ARRIVAL/7), REPLACING the no-op placeholder there — each in-game
//     minute it advances in-progress cook_sessions one functional stage per elapsed uniform stage duration and, on
//     stage_4 completion, yields the flat Tier-1 Brindle output into product_storage. This is the operational tick-hook
//     PATTERN T1–T3 share (same registerSystem path the setup/arrival hooks use at MINUTE/6 and MINUTE/7).
//   - the REPOSITORY (ProductionRepository) owns the raw Drizzle reads/writes against cook_session + product_storage
//     (T0) + precursor_stock (T2/T0 — the consumed Pyralin) + building_operational_state (the operational LAB gate,
//     T0) + buildings (Phase-1 ownership) + city_sim_clock (the started_at_tick read, Phase-1) (R9.3 — it READS the
//     schema, never redefines it).
//   - the PROJECTION (ProductionProjectionService) maps the raw cook stage + product grams → qualitative bands
//     (cook-stage band / product band — R2.2, no raw grams/purity/stage-clock).
//   - the player-facing CONTROLLER (ProductionController) exposes the start-cook action + the projections under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the cook-advance tick-hook calls registerSystem on it) +
// AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution). Depends on the @Global() DbModule (the
// repository/controller inject the DB provider). EXPORTS the service + projection so later operational modules (T4
// distribution, which moves the produced Brindle) can inject them if needed.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { HeatContribModule } from '../heat_contrib/heat-contrib.module';
import { ColdChainModule } from '../coldchain/coldchain.module';
import { AshModule } from '../ash/ash.module';
import { ForensicSignalingModule } from '../forensic/forensic.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { DemolitionModule } from '../../core_loops/demolition/demolition.module';
import { ProductionRepository } from './production.repository';
import { ProductionService } from './production.service';
import { ProductionCookAdvanceService } from './production-cook-advance.service';
import { ProductionProjectionService } from './production.projection.service';
import { ProductionController } from './production.controller';

@Module({
  // ColdChainModule (Phase-2b vector #2) EXPORTS ColdChainService + ColdChainRepository — the storage projection injects
  // them to surface the cold-chain temperature_status band + degrading flag for a Crick holding (R2.2).
  // AshModule (Phase-2c vector #2c, T6) EXPORTS AshPurityService — the cook-advance tick injects it to derive + stamp an
  // Ash batch's deterministic purity_score at completion (the distinct Ash mechanic; non-Ash cooks never call it).
  // ForensicSignalingModule (C12 — §5.2 Forensic Signaling) EXPORTS EffluentStoichiometryService — the cook-advance
  // tick injects it to record per-workshop throughput AFTER completeCookWithYield (ADDITIVE, byte-identical).
  // ONE-DIRECTIONAL: ProductionModule → ForensicSignalingModule, NOT the reverse — no circular dependency.
  //
  // MaintenanceModule (04f-A C2) EXPORTS MaintenancePhaseService — the cook-advance tick injects it to fold the
  // D5 output multiplier (maintenanceOutputMultiplier(days_overdue)) into a completing cook's yield. ONE-WAY:
  // MaintenanceModule does NOT import ProductionModule — no cycle.
  //
  // DemolitionModule (P3-E C3, ★#2) EXPORTS FrictionBudgetRepository — the cook-advance tick injects it to read
  // the player-keyed `efficiency_penalty_active` flag and fold `demolitionEfficiencyPenaltyMultiplierBaseline`
  // into the SAME completing cook's yield (Site 1 of the 2 R13-frozen output sites). ONE-WAY: DemolitionModule
  // imports only DbModule/SchedulerModule — no cycle.
  imports: [
    SchedulerModule,
    AuthModule,
    HeatContribModule,
    ColdChainModule,
    AshModule,
    ForensicSignalingModule,
    MaintenanceModule,
    DemolitionModule,
  ],
  controllers: [ProductionController],
  providers: [
    ProductionRepository,
    ProductionService,
    ProductionCookAdvanceService,
    ProductionProjectionService,
  ],
  exports: [ProductionService, ProductionProjectionService],
})
export class ProductionModule {}

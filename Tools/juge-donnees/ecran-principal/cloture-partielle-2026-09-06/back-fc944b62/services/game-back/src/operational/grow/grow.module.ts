// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T2/§6 (the grow_house cultivation
//             slice — a sibling of the production / cold-chain / ash operational modules) +
//             composition_overview.md §Cross-cutting (the operational modular monolith wiring)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 2) --
//
// `GrowModule` — wires the Phase-3 vector #3 grow_house cultivation slice into the game-back modular monolith.
//   - T2 ships the PLANT action (GrowController + GrowService + GrowRepository): POST
//     /v1/operational/grow-house/:id/plant — validate the player-owned grow_house + growable precursor + no active grow →
//     atomic guarded seed-cost debit → INSERT a stage_1 grow_session.
//   - T3 ADDS the GROW_ADVANCE grow-cycle TICK-HOOK (GrowAdvanceService): registers into the CitySimScheduler at
//     {MINUTE/18 GROW_ADVANCE} at boot (after APPOINTMENT_EXPIRE/17, the next free slot), REPLACING the no-op placeholder
//     there — each in-game minute it advances every in-progress grow_session whose stage clock has elapsed ONE grow stage
//     (stage_1→stage_2→stage_3→completed), set-based (ONE UPDATE), clearing tended_in_stage (the new stage is tendable
//     again). A grow reaching completed STOPS advancing (it waits for T5 harvest). Sibling of the COOK_ADVANCE tick.
//   - T5 ADDS the HARVEST + yield tier (GrowYieldService — a PURE deterministic tend_count → WITHERED/STANDARD/BUMPER →
//     grams derivation, the sibling of AshPurityService) wired into the GROW_ADVANCE tick: when a grow TRANSITIONS to
//     'completed' this tick, the tick derives its yield grams from tend_count and the repo UPSERTs them into
//     precursor_stock (source-agnostic — feeds the existing Crick/Hush/Ash chains) then DELETES the grow_session
//     (finalize — the building is free to re-plant). Set-based, once per completing grow, atomic.
//   - T7 ADDS the player-facing band PROJECTION (GrowProjectionService + GET /v1/operational/grow-session/:id): the
//     grow_stage_band (EARLY/MID/LATE/DONE) + the husbandry_band trajectory (WITHERED/ON_TRACK/THRIVING, derived from
//     tend_count via the REUSED GrowYieldService.yieldTier) + the tend_due flag — R2.2 qualitative bands only, additive
//     read-only (NO schema change). The building's raid-risk band is REUSED from the building projection (vector #1), not
//     re-derived here.
//   heat + raid (T6) extend this module.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the GROW_ADVANCE tick-hook calls registerSystem on it; the
// SAME import the cold-chain/hush/appointment ticks use) + AuthModule (EXPORTS JwtAuthGuard — the controller's player
// resolution). Depends on the @Global() DbModule (the repository/controller inject the DB provider).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { HeatContribModule } from '../heat_contrib/heat-contrib.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { GrowController } from './grow.controller';
import { GrowService } from './grow.service';
import { GrowRepository } from './grow.repository';
import { GrowAdvanceService } from './grow-advance.service';
import { GrowYieldService } from './grow-yield.service';
import { GrowProjectionService } from './grow.projection.service';

@Module({
  // T6 imports HeatContribModule (EXPORTS HeatContribService — the GROW_ADVANCE tick emits GROW_HEAT for active grows via
  // it; the SAME reuse ProductionModule/SellingModule make for cook/deal heat) — the A-stakes heat coupling, no new logic.
  // MaintenanceModule (04f-A C2) EXPORTS MaintenanceRepository + MaintenancePhaseService — the GROW_ADVANCE harvest fold
  // injects both (the batched D1-anchor lookup + the D5 output multiplier). ONE-WAY: MaintenanceModule does NOT import
  // GrowModule — no cycle.
  imports: [SchedulerModule, AuthModule, HeatContribModule, MaintenanceModule],
  controllers: [GrowController],
  providers: [GrowService, GrowRepository, GrowAdvanceService, GrowYieldService, GrowProjectionService],
  exports: [GrowService],
})
export class GrowModule {}

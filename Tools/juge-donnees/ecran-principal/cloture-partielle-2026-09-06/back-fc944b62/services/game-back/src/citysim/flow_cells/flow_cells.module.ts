// IMPLEMENTS: docs/tech/04_city_simulation/system_1_flow_cells.md §NestJS — backend jeu (FlowCellsService
//             in-process in game-back) + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// `FlowCellsModule` — wires System 1 (Block-Local Flow Cells) into the game-back modular monolith. This is
// the REFERENCE MODULE TEMPLATE T3–T13 copy:
//   - the SYSTEM service (FlowCellsService) implements CitySimSystem + registers into the scheduler at boot;
//   - the PROJECTION service (FlowCellsProjectionService) maps raw→bucket (P5);
//   - the player-facing CONTROLLER (FlowCellsController) exposes the projection under /v1.
//
// Imports SchedulerModule (which EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (which EXPORTS
// JwtAuthGuard). Depends on the @Global() DbModule (the service reads seeded geography; the controller
// resolves player_id).
//
// The CityEventBus has GRADUATED to the shared SchedulerModule (the CitySim core every system already
// imports). FlowCellsService injects it from there — emitting onto a singleton bus consumer modules
// (T3/T4/T12) reach via the SchedulerModule import they already hold, WITHOUT importing this module. So
// this module no longer provides/exports the bus.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { FlowCellsService } from './flow_cells.service';
import { FlowCellsProjectionService } from './flow_cells.projection.service';
import { FlowCellsController } from './flow_cells.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [FlowCellsController],
  providers: [FlowCellsService, FlowCellsProjectionService],
  // Export the system + projection so later consumer modules can inject them. (The CityEventBus is exported
  // by SchedulerModule, not here — consumers reach the bus via their existing SchedulerModule import.)
  exports: [FlowCellsService, FlowCellsProjectionService],
})
export class FlowCellsModule {}

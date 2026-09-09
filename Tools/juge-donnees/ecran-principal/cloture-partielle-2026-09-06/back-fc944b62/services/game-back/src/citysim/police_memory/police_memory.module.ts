// IMPLEMENTS: docs/tech/04_city_simulation/system_3_police_memory.md §NestJS — backend jeu (PoliceMemoryService
//             in-process in game-back, "Pas de service séparé … Identique au pattern FlowCellsService") +
//             composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-02 (Phase 1 Task 4) --
//
// `PoliceMemoryModule` — wires System 3 (Asymmetric Police Memory) into the game-back modular monolith. Copies
// the SparseCitizens persisted-system module template:
//   - the SYSTEM service (PoliceMemoryService) subscribes to the CityEventBus (Tick 1 observation) + registers
//     into the scheduler at slots {ON_EVENT/1, MINUTE/5 flush, TWELVE_H/4 review, NIGHTLY/3 decay} at boot;
//   - the REPOSITORY (PoliceMemoryRepository) owns the raw Drizzle reads/writes against precinct_memory (bytea
//     suspicion_map Buffer handling + batched writes);
//   - the PROJECTION service (PoliceMemoryProjectionService) maps raw per-precinct belief → a qualitative band (P5);
//   - the player-facing CONTROLLER (PoliceMemoryController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus
// is exported by SchedulerModule (System 3 SUBSCRIBES to FlowCell/Whisper events + emits Raid/Undercover events
// on that singleton bus).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { PoliceMemoryService } from './police_memory.service';
import { PoliceMemoryRepository } from './police_memory.repository';
import { PoliceMemoryProjectionService } from './police_memory.projection.service';
import { PoliceMemoryController } from './police_memory.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [PoliceMemoryController],
  providers: [PoliceMemoryService, PoliceMemoryRepository, PoliceMemoryProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. System 4 Patrol Doctrine
  // getTopTargets() consumption, BO suspicion-map inspect surface).
  exports: [PoliceMemoryService, PoliceMemoryProjectionService],
})
export class PoliceMemoryModule {}

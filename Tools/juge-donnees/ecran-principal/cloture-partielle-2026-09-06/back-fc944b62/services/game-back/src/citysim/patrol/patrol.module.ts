// IMPLEMENTS: docs/tech/04_city_simulation/system_4_patrol_doctrine.md §NestJS — backend jeu
//             (PatrolDoctrineService in-process in game-back, "Pas de service séparé … in-process dans game-back,
//             sans frontière réseau. Identique au pattern PoliceMemoryService") + composition_overview.md
//             §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-02 (Phase 1 Task 5) --
//
// `PatrolDoctrineModule` — wires System 4 (Delayed-Response Patrol Doctrine) into the game-back modular
// monolith. Copies the PoliceMemory persisted-system module template:
//   - the SYSTEM service (PatrolDoctrineService) subscribes to the CityEventBus (FlowCellCongested → 30-min
//     observation source) + registers into the scheduler at slots {THIRTY_MIN/1 accumulation, TWELVE_H/1 review}
//     at boot; emits PatrolObservationEvent (System 3 handoff) + RaidPlanned/UndercoverDispatched (canonical owner);
//   - the REPOSITORY (PatrolDoctrineRepository) owns the raw Drizzle reads/writes against patrol_observation_queues
//     (jsonb ring-buffer entries/head/tail + batched writes + race-safe seed of 6 rows);
//   - the PROJECTION service (PatrolDoctrineProjectionService) maps raw queue load → a qualitative patrol-heat band (P5);
//   - the player-facing CONTROLLER (PatrolDoctrineController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard) +
// PoliceMemoryModule (EXPORTS PoliceMemoryService — the INV 6 READ-ONLY getTopTargets() consumption: System 4
// reads System 3's top targets to enrich raid targeting, never mutating precinct_memory). Depends on the
// @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus is exported by
// SchedulerModule (System 4 emits PatrolObservation/Raid/Undercover + subscribes to FlowCellCongested on that
// singleton bus — no sibling-system module import for events; only PoliceMemoryModule for the read-only service call).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { PoliceMemoryModule } from '../police_memory/police_memory.module';
import { PatrolDoctrineService } from './patrol.service';
import { PatrolDoctrineRepository } from './patrol.repository';
import { PatrolDoctrineProjectionService } from './patrol.projection.service';
import { PatrolDoctrineController } from './patrol.controller';

@Module({
  imports: [SchedulerModule, AuthModule, PoliceMemoryModule],
  controllers: [PatrolDoctrineController],
  providers: [PatrolDoctrineService, PatrolDoctrineRepository, PatrolDoctrineProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. System 9 ErlangStash raid
  // drain, BO patrol-inspect surface).
  exports: [PatrolDoctrineService, PatrolDoctrineProjectionService],
})
export class PatrolDoctrineModule {}

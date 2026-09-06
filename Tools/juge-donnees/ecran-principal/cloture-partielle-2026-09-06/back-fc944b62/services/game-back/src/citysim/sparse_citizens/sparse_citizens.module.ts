// IMPLEMENTS: docs/tech/04_city_simulation/system_2_sparse_citizens.md §NestJS — backend jeu (SparseNPCService
//             in-process in game-back, "Pas de service séparé … Identique au pattern FlowCellsService") +
//             composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// `SparseCitizensModule` — wires System 2 (Sparse Citizens) into the game-back modular monolith. Copies the
// Flow Cells module template, with the PERSISTED-system addition of a Drizzle `*.repository.ts`:
//   - the SYSTEM service (SparseCitizensService) implements CitySimSystem ×3 + registers into the scheduler
//     at slots {TWO_HZ/3, FIVE_MIN/1, TWELVE_H/3} at boot;
//   - the REPOSITORY (SparseCitizensRepository) owns the raw Drizzle reads/writes against rich_citizens;
//   - the PROJECTION service (SparseCitizensProjectionService) maps raw aggregate → qualitative buckets (P5);
//   - the player-facing CONTROLLER (SparseCitizensController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller inject the DB provider). The CityEventBus is
// exported by SchedulerModule (the WhisperActivatedEvent producer emits onto that singleton bus).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { SparseCitizensService } from './sparse_citizens.service';
import { SparseCitizensRepository } from './sparse_citizens.repository';
import { SparseCitizensProjectionService } from './sparse_citizens.projection.service';
import { SparseCitizensController } from './sparse_citizens.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [SparseCitizensController],
  providers: [SparseCitizensService, SparseCitizensRepository, SparseCitizensProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. promotion path, BO inspect).
  exports: [SparseCitizensService, SparseCitizensProjectionService],
})
export class SparseCitizensModule {}

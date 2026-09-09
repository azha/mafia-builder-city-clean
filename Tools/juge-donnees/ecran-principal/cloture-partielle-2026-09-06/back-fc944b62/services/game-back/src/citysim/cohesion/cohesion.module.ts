// IMPLEMENTS: docs/tech/04_city_simulation/system_5_cohesion_permafrost.md §NestJS — backend jeu
//             (CohesionPermafrostService in-process in game-back, "Pas de service séparé … in-process dans
//              game-back, sans frontière réseau. Identique au pattern FlowCellsService / PoliceMemoryService /
//              PatrolDoctrineService") + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// `CohesionPermafrostModule` — wires System 5 (Cohesion Permafrost) into the game-back modular monolith. Copies
// the PatrolDoctrine persisted-system module template:
//   - the SYSTEM service (CohesionPermafrostService) registers into the scheduler at slot {NIGHTLY/1
//     cohesion permafrost} at boot; reads System 4 patrol presence READ-ONLY (Inv 6); emits the 3 cohesion
//     events (CohesionStateChanged / CohesionFactorUpdated / WhisperIndexUpdated) on the CityEventBus;
//   - the REPOSITORY (CohesionPermafrostRepository) owns the raw Drizzle reads/writes against district_cohesion
//     (batched writes + race-safe seed of 18 rows);
//   - the PROJECTION service (CohesionPermafrostProjectionService) maps the raw struct → the qualitative
//     CohesionState band + the permanent_marginal flag (Inv 7 reconciled with R2.2 — no raw float);
//   - the player-facing CONTROLLER (CohesionPermafrostController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard) +
// PatrolDoctrineModule (EXPORTS PatrolDoctrineService — the INV 6 READ-ONLY getPatrolPresenceForPrecincts()
// consumption: System 5 reads System 4's per-district patrol presence in ONE batched listQueues call to weight
// the police-presence delta, never mutating patrol_observation_queues). Depends on the @Global() DbModule (the repository/controller/
// service inject the DB provider). The CityEventBus is exported by SchedulerModule (System 5 emits the 3
// cohesion events onto that singleton bus — no sibling-system module import for events; only
// PatrolDoctrineModule for the read-only service call).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { PatrolDoctrineModule } from '../patrol/patrol.module';
import { CohesionPermafrostService } from './cohesion.service';
import { CohesionPermafrostRepository } from './cohesion.repository';
import { CohesionPermafrostProjectionService } from './cohesion.projection.service';
import { CohesionPermafrostController } from './cohesion.controller';

@Module({
  imports: [SchedulerModule, AuthModule, PatrolDoctrineModule],
  controllers: [CohesionPermafrostController],
  providers: [
    CohesionPermafrostService,
    CohesionPermafrostRepository,
    CohesionPermafrostProjectionService,
  ],
  // Export the system + projection so later consumer modules can inject them (e.g. System 6 inspection
  // amplification, System 11 lek decay, BO cohesion-inspect surface). 04g-A C2 (S4 ruling,
  // `2026-07-13-04g-A-C0-reanchor.md` §2): ALSO export the repository — `AmbientAttendService` calls
  // `CohesionPermafrostRepository.applyMutations` directly (the service exposes no public "apply this
  // delta" entry point; the repo IS the persisted-write seam the service's own nightly tick reuses).
  // Purely additive (one more class in this array) — zero behavior change to System 5 itself.
  exports: [CohesionPermafrostService, CohesionPermafrostProjectionService, CohesionPermafrostRepository],
})
export class CohesionPermafrostModule {}

// IMPLEMENTS: docs/tech/04_city_simulation/system_8_dwell_time_tax.md §NestJS — backend jeu
//             (PipelineService in-process in game-back, "Pas de service séparé … in-process dans game-back, sans
//              frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// `DwellTimeModule` — wires System 8 (Dwell-Time Tax / Throughput Trilemma) into the game-back modular monolith.
// Copies the Unconformity/Cohesion persisted-system module template:
//   - the SYSTEM service (DwellTimeService) registers into the scheduler at slot {MINUTE/2 throughput trilemma} at
//     boot (runs after System 9 Erlang Stash at MINUTE/1, before System 10 / Heat); recomputes the per-node
//     Little's-Law floats every in-game minute; persists laundering_nodes.{dwell_time_hours, cleanliness_at_output,
//     throughput_in_per_hour}; holds the in-memory PipelineNetwork aggregate; EMITS PipelineMinuteSnapshot on the
//     CityEventBus (emit-only day-1 — BO observability consumer wires later);
//   - the REPOSITORY (DwellTimeRepository) owns the raw Drizzle reads/writes against `laundering_nodes` (reads
//     nodes via the buildings → blocks JOIN; batched UPDATE of the per-minute floats);
//   - the PROJECTION service (DwellTimeProjectionService) maps the raw node state → the per-district exposure band +
//     network-cleanliness band + per-node ThroughputBucket / CleanlinessBucket / overflow (Inv 5 / Inv 6 / R2.2 —
//     no raw floats / cash);
//   - the player-facing CONTROLLER (DwellTimeController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus
// is exported by SchedulerModule (System 8 emits PipelineMinuteSnapshot on that singleton bus — no sibling-system
// module import for events). NO System 7 / System 9 module import: System 8 reads nothing from a sibling system
// day-1 (the System 7 throughput-baseline cap + the System 9 safehouse cap are DEFERRED — the cross-system
// inflow-gating consumer is unbuilt, independent of whether `safehouses` has rows; see the service header). The
// getInventoryAtRisk read accessor (the System 3/4/6
// consumer seam) is EXPORTED for when those consumers wire to it (P2).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { DwellTimeService } from './dwell-time.service';
import { DwellTimeRepository } from './dwell-time.repository';
import { DwellTimeProjectionService } from './dwell-time.projection.service';
import { DwellTimeController } from './dwell-time.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [DwellTimeController],
  providers: [DwellTimeService, DwellTimeRepository, DwellTimeProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. System 3/4/6 reading
  // getInventoryAtRisk for seizure size / patrol focus when P2 routes dirty-cash inflow; BO pipeline surface).
  exports: [DwellTimeService, DwellTimeProjectionService],
})
export class DwellTimeModule {}

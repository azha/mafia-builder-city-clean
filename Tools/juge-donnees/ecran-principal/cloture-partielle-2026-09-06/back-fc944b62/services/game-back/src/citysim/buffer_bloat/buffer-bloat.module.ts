// IMPLEMENTS: docs/tech/04_city_simulation/system_10_buffer_bloat.md §NestJS — backend jeu
//             (BufferBloatService in-process in game-back, "Pas de service séparé … in-process dans game-back, sans
//              frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// `BufferBloatModule` — wires System 10 (Buffer Bloat Laundering) into the game-back modular monolith. Copies the
// Dwell-Time / Erlang-Stash persisted-system module template:
//   - the SYSTEM service (BufferBloatService) registers into the scheduler at TWO slots {MINUTE/3 BUFFER_BLOAT} +
//     {WEEKLY/2 BUFFER_BLOAT} at boot (the MINUTE tick runs AFTER System 8 Throughput Trilemma at MINUTE/2 and
//     before Heat at MINUTE/4 — the canonical DAG System 9 → System 8 → System 10 → Heat; the WEEKLY tick runs
//     after System 11 Deal Lek at WEEKLY/1). The MINUTE tick advances per-node buffer occupancy (inflow from
//     System 8's throughput − drain), detects overflow + caps hard + emits BufferOverflowEvent, refreshes the
//     tail_p95_estimate (∝ occupancy — Inv 2), persists tail_risk_estimates (it OWNS the table — lazy-creates a row
//     per node), and SYNCs laundering_nodes.buffer_load (System 8 READS it — T9). The WEEKLY tick resets the
//     percentile baseline + the per-period overflow flags.
//   - the REPOSITORY (BufferBloatRepository) owns the raw Drizzle reads/writes against `tail_risk_estimates` (reads
//     nodes + the 1-1 estimate via the buildings → blocks JOIN; race-safe lazy-create; batched UPDATE of the
//     estimate floats) + the batched UPDATE of `laundering_nodes.buffer_load` (the System-8 sync);
//   - the PROJECTION service (BufferBloatProjectionService) maps the raw node-buffer state → the per-district load
//     band + tail-risk band + the panel-visible default + per-node BufferLoadBucket / TailPercentileState / overflow
//     (Inv 3/5/7 / R2.2 — no raw occupancy / p95 / cash);
//   - the player-facing CONTROLLER (BufferBloatController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus is
// exported by SchedulerModule (System 10 emits BufferOverflow on that singleton bus — no sibling-system module
// import for events). NO System 8 module import: System 10 reads System 8's throughput_in_per_hour from the
// PERSISTED laundering_nodes column (the repository's listNodes selects it), not from the System-8 service — a
// read-through-the-row seam, so no module coupling. It EXPORTS BufferBloatService + the projection so later consumer
// modules can inject them (BO buffer-network observability; a future back-pressure read from System 8). Heat (T13)
// subscribes to BufferOverflow on the bus (no module import — the event-bus decoupling).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { BufferBloatService } from './buffer-bloat.service';
import { BufferBloatRepository } from './buffer-bloat.repository';
import { BufferBloatProjectionService } from './buffer-bloat.projection.service';
import { BufferBloatController } from './buffer-bloat.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [BufferBloatController],
  providers: [BufferBloatService, BufferBloatRepository, BufferBloatProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. BO buffer-network observability;
  // a future System 8 back-pressure read; Heat consumes BufferOverflow via the bus, not via an injected service).
  exports: [BufferBloatService, BufferBloatProjectionService],
})
export class BufferBloatModule {}

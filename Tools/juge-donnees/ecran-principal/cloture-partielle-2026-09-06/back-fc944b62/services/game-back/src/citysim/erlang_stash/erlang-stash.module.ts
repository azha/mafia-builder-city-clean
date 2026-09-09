// IMPLEMENTS: docs/tech/04_city_simulation/system_9_erlang_stash.md §NestJS — backend jeu
//             (StashService in-process in game-back, "Pas de service séparé … in-process dans game-back, sans
//              frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// `ErlangStashModule` — wires System 9 (Erlang Stash Capacity) into the game-back modular monolith. Copies the
// Dwell-Time persisted-system module template:
//   - the SYSTEM service (ErlangStashService) registers into the scheduler at slot {MINUTE/1 ERLANG_STASH} at boot
//     (runs FIRST in the minute band, before System 8 Throughput Trilemma at MINUTE/2 — the canonical DAG System 9
//     → System 8 → System 10 → Heat); recomputes the per-safehouse Erlang-B blocking_probability every in-game
//     minute (HARD numerically-stable recursion, A = λ/μ with μ=1.0); holds the in-memory per-safehouse blocking
//     working state (no persisted blocking column); EMITS StashHighBlockingAlert on the CityEventBus when blocking
//     exceeds stash.blocking_alert_threshold (emit-only day-1 — Unity notification / BO blocking-risk consumer
//     wires later);
//   - the REPOSITORY (ErlangStashRepository) owns the raw Drizzle reads/writes against `safehouses` (reads via the
//     buildings → blocks JOIN; batched UPDATE of current_fill ONLY on a raid drain — Inv 6, P2);
//   - the PROJECTION service (ErlangStashProjectionService) maps the raw safehouse state → the per-district
//     blocking band + district-summary alert flag + per-safehouse StashLoadBucket / StashBlockingBand / alert
//     (Inv 1/2/5 / R2.2 — no raw blocking float / fill / cash);
//   - the player-facing CONTROLLER (ErlangStashController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus is
// exported by SchedulerModule (System 9 emits StashHighBlockingAlert on that singleton bus — no sibling-system
// module import for events). NO System 8 module import: System 9 reads NOTHING from a sibling system day-1; instead
// it EXPORTS ErlangStashService so System 8 can inject it later for the getBlockingProbability cross-system read
// (the throughput-cap seam System 8 DEFERRED — wired when P2 routes the throughput inflow). The 5-sec cash-arrivals
// tick + raids are DEFERRED Phase 1 (no P2 producer — see the service header).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { ErlangStashService } from './erlang-stash.service';
import { ErlangStashRepository } from './erlang-stash.repository';
import { ErlangStashProjectionService } from './erlang-stash.projection.service';
import { ErlangStashController } from './erlang-stash.controller';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [ErlangStashController],
  providers: [ErlangStashService, ErlangStashRepository, ErlangStashProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. System 8 Dwell-Time reading
  // getBlockingProbability for the safehouse-node throughput cap when P2 routes the throughput inflow; BO stash
  // observability surface).
  exports: [ErlangStashService, ErlangStashProjectionService],
})
export class ErlangStashModule {}

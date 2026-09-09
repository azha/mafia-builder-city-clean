// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md §NestJS — backend jeu
//             (DealLekService in-process in game-back, "Pas de service séparé … in-process dans game-back, sans
//              frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekModule` — wires System 11 (Deal Lek) into the game-back modular monolith. Copies the BufferBloat /
// Inspection persisted-system module template:
//   - the SYSTEM service (DealLekService) registers into the scheduler at slots {TWO_HZ/2 deal lek} + {WEEKLY/1
//     deal lek} at boot; SUBSCRIBES to FlowCellCongestedEvent (System 1 → System 11 — the organic Flow→Lek
//     driver) + CohesionStateChangedEvent THAWED (System 5 → System 11 — the aggravated decay modifier); EMITS
//     LekDeathEvent (System 11 → bus — Inv 5 lek death; emit-only day-1, Unity marker retirement wires T14/P2);
//   - the REPOSITORY (DealLekRepository) owns the raw Drizzle reads/writes against deal_leks (sparse lazy-create
//     ON CONFLICT DO UPDATE bounded by lek_tile_count, batched weekly UPDATE);
//   - the PROJECTION service (DealLekProjectionService) maps the raw leks → LekControlState + score/contest bands
//     + presence buckets (Inv 6/7 / R2.2 — no raw lek_score/contest_pressure int);
//   - the player-facing CONTROLLER (DealLekController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus
// is exported by SchedulerModule (System 11 subscribes FlowCellCongested + CohesionStateChanged + emits LekDeath on
// that singleton bus — NO sibling-system module import: the Flow→Lek input (System 1) + the cohesion modifier
// (System 5) flow via the bus, not a direct module import).

import { Module, type Type } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { DealLekService } from './deal-lek.service';
import { DealLekRepository } from './deal-lek.repository';
import { DealLekProjectionService } from './deal-lek.projection.service';
import { DealLekController } from './deal-lek.controller';
import { DealLekTestController } from './deal-lek-test.controller';

/**
 * The TEST-ONLY WEEKLY-tick driver (`/v1/_test/citysim/lek-weekly`) is mounted ONLY when NODE_ENV != 'production'
 * (the same production-gating as scheduler/scheduler.module.ts). In NODE_ENV=production the controller is not in
 * `controllers[]` → the route is never registered → 404. The deal_lek E2E (decay/death) drives the weekly tick
 * through this harness in isolation from the always-on flow band (see deal-lek-test.controller.ts).
 */
const controllers: Array<Type<unknown>> =
  process.env.NODE_ENV === 'production' ? [DealLekController] : [DealLekController, DealLekTestController];

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers,
  providers: [DealLekService, DealLekRepository, DealLekProjectionService],
  // Export the system + projection so later consumer modules can inject them (e.g. BO lek-control surface / Unity).
  exports: [DealLekService, DealLekProjectionService],
})
export class DealLekModule {}

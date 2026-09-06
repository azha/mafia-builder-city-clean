// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §NestJS — backend jeu
//             (HeatPropagationService in-process in game-back, "Pas de service séparé … in-process dans game-back,
//              sans frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatModule` — wires System Heat (Heat Propagation — the cross-system signal capstone) into the game-back modular
// monolith. Copies the BufferBloat / DealLek persisted-system module template:
//   - the SYSTEM service (HeatPropagationService) registers into the scheduler at the slot {MINUTE/4 HEAT} at boot
//     (the canonical DAG System 9 → 8 → 10 → Heat — Heat runs LAST in the minute band, after Buffer at MINUTE/3),
//     REPLACING the no-op placeholder there; SUBSCRIBES to BufferOverflowEvent (System 10 → heat injection — the one
//     wired organic source) + HeatInjectionEvent (the canonical seam — the test hook + deferred P2 producers) +
//     CohesionStateChangedEvent (STABLE → propagation SUPPRESSED modifier); EMITS HeatEscalationEvent (→ System 4
//     Patrol Doctrine, the wired cross-system influence). The MINUTE/4 tick flushes buffered injections, decays
//     (half-life), propagates (spatial heat shadow + Stack/Cohesion damping), escalates, and aggregates
//     (district/citywide peak buckets), persisting buildings.heat.
//   - the REPOSITORY (HeatRepository) owns the raw Drizzle reads/writes against `buildings` (reads operational
//     buildings + block coordinate + district profile via the buildings → blocks → districts JOIN; batched UPDATE of
//     buildings.heat);
//   - the PROJECTION service (HeatProjectionService) maps the raw building heat + in-memory aggregates → the
//     per-district HeatBucket + citywide aggregate + escalation flag + per-building HeatBucket (Inv 1/2/7 / R2.2 —
//     no raw heat float);
//   - the player-facing CONTROLLER (HeatController) exposes the projection under /v1.
//   - the TEST-ONLY CONTROLLER (HeatTestController) emits a HeatInjectionEvent on the canonical seam (mounted only
//     when NODE_ENV != 'production' — the deal-lek-test / citysim-test precedent).
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller inject the DB provider). The CityEventBus is exported
// by SchedulerModule (Heat subscribes BufferOverflow/HeatInjection/CohesionStateChanged + emits HeatEscalation on
// that singleton bus — NO sibling-system module import for events; the cross-system wiring flows via the bus, not a
// direct module import — so no module cycle with System 4/10). It EXPORTS HeatPropagationService + the projection so
// later consumer modules can inject the read-only heat accessor (BO heat-inspect surface; a System 3/7 synchronous
// heat read).

import { Module, type Type } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { HeatPropagationService } from './heat-propagation.service';
import { HeatRepository } from './heat.repository';
import { HeatProjectionService } from './heat.projection.service';
import { HeatController } from './heat.controller';
import { HeatTestController } from './heat-test.controller';

/**
 * The TEST-ONLY HeatInjectionEvent emitter (`/v1/_test/citysim/heat-inject`) is mounted ONLY when NODE_ENV !=
 * 'production' (the same production-gating as scheduler/scheduler.module.ts + deal-lek.module.ts). In
 * NODE_ENV=production the controller is not in `controllers[]` → the route is never registered → 404. The heat E2E
 * exercises the injection seam through this harness in isolation (the one built organic source, BufferOverflow,
 * needs P2 laundering nodes — see heat-test.controller.ts).
 */
const controllers: Array<Type<unknown>> =
  process.env.NODE_ENV === 'production' ? [HeatController] : [HeatController, HeatTestController];

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers,
  providers: [HeatPropagationService, HeatRepository, HeatProjectionService],
  // Export the system + projection so later consumer modules can inject the read-only heat accessor (e.g. BO
  // heat-inspect surface; a System 3/7 synchronous heat read). System 4 consumes HeatEscalation via the bus, not
  // via an injected service (the event-bus decoupling — no module cycle).
  exports: [HeatPropagationService, HeatProjectionService],
})
export class HeatModule {}

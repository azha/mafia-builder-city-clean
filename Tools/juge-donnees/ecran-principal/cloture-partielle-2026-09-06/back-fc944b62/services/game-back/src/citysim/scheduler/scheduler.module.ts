// IMPLEMENTS: docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §NestJS — backend jeu
//             + composition_overview.md §NestJS — backend jeu (scheduler in-process, game-back)
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// `SchedulerModule` — wires the CitySim multi-cadence engine + the geography map API into the game-back
// modular monolith. Registered ONCE in AppModule.imports[]. Depends on the @Global() DbModule (the
// scheduler + repository inject the DB provider). The CitySimSchedulerService is EXPORTED so the 11
// system modules (T2–T13) can inject it and `registerSystem(...)` at their cadence + DAG order.
//
// CityEventBus is ALSO provided + exported HERE — the shared CitySim core. Every system module already
// imports SchedulerModule (for registerSystem); providing the loosely-coupled event bus from the same
// shared module means a consumer (T3 Sparse Citizens, T4 Police Memory, T5 Patrol, …) reaches the bus by
// the import it already has, WITHOUT importing a sibling system's module (no creeping coupling). This is
// the singleton seam producers emit onto + consumers subscribe to (composition_overview.md §Cross-cutting:
// "les systèmes sont loosely coupled via le bus — un système n'importe pas directement un autre système").

import { Module, type Provider, type Type } from '@nestjs/common';

import { CitySimSchedulerService } from './city_sim_scheduler.service';
import { CitySimTestController } from './citysim-test.controller';
import { CitySimAdminController } from './citysim-admin.controller';
import { CityEventBus } from '../events/city-event-bus';
import { WorldController } from '../world/world.controller';
import { WorldGeographyRepository } from '../world/world-geography.repository';
import { OperationalStateGuardService } from './operational-state-guard.service';
import { CITYSIM_CLOCK, PinnedCitySimClock, RealCitySimClock } from './city-sim-clock.port';

/**
 * The deterministic clock-advance harness (`/v1/_test/citysim/advance`) is mounted on a production-gated
 * `/v1/_test/*` route — present ONLY when NODE_ENV != 'production'. In NODE_ENV=production the controller is
 * not in `controllers[]` → the route is never registered → 404. (This is stricter than protocol.controller.ts's
 * own `/v1/_test/*` routes, which are NOT production-gated — this harness deliberately is.) Every downstream
 * system E2E (T2–T13) drives the sim through this harness against the real dockerized stack (NODE_ENV=test/dev).
 */
// W1.1-d C6 — CitySimAdminController is a REAL production BO route (role-gated via `requireStaffRole`,
// never NODE_ENV-gated) — ALWAYS in `controllers[]`, the SAME posture `WorldController` already has. This
// is what makes the pilot's own observability "detectable en production" (design §C6) rather than living
// behind the `_test/citysim/*` gate `CitySimTestController` sits behind, below.
const controllers: Array<Type<unknown>> =
  process.env.NODE_ENV === 'production'
    ? [WorldController, CitySimAdminController]
    : [WorldController, CitySimAdminController, CitySimTestController];

// W1.1-d C2 — CITYSIM_CLOCK binding (the token-override proof, `live-ops-clock.port.ts`'s LIVE_OPS_CLOCK
// shape applied here with an INVERTED discriminant per design §5.2: `CITYSIM_CONTINUOUS_LOOPS=1`, NEVER
// NODE_ENV/testControllersEnabled() — §5.1's whole point is that NODE_ENV would leave the pilot+clock OFF
// in every environment this repo can configure, including staging (§5.3 explicitly SETS this flag there).
// `PinnedCitySimClock` is ALWAYS registered under its own class token (below, in `providers`) — even when
// the flag is on and `RealCitySimClock` is what's actually bound to CITYSIM_CLOCK — so
// `CitySimTestController`'s constructor injection of the concrete class always resolves; the instance just
// sits unused in that case (no HTTP path in a real deployment ever reaches its mutation methods, since
// CitySimTestController itself is NODE_ENV-gated above, independent of this flag).
const citySimClockBinding: Provider =
  process.env.CITYSIM_CONTINUOUS_LOOPS === '1'
    ? { provide: CITYSIM_CLOCK, useClass: RealCitySimClock }
    : { provide: CITYSIM_CLOCK, useExisting: PinnedCitySimClock };

@Module({
  controllers,
  providers: [
    CitySimSchedulerService,
    WorldGeographyRepository,
    CityEventBus,
    OperationalStateGuardService,
    PinnedCitySimClock, // registers the class itself — CitySimTestController injects it DIRECTLY to
                        // mutate the frozen instant (advanceByMs/reset), the SAME "token-override proof"
                        // shape LiveOpsModule's FakeLiveOpsClock uses (live-ops.module.ts:132-139).
    citySimClockBinding,
  ],
  exports: [CitySimSchedulerService, CityEventBus, OperationalStateGuardService, CITYSIM_CLOCK],
})
export class SchedulerModule {}

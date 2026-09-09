// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3 (architecture)
//             Architecture mirror: services/game-back/src/operational/political/political.module.ts
//             — 04g-A C1 — 2026-07-13
//
// `AmbientModule` — the Constant Hum substrate (G-loved keystone, 04g-A). C1 shipped the 168-cell weekly
// heat grid: `db/schema/ambient_world.ts` (3 tables + 3 enums, migration 0127) + `ambient.tunables.ts`
// (12 registry-first getters) + `constant-hum.service.ts`/`constant-hum.repository.ts`
// (`CONSTANT_HUM_CELL_TICK`, HOURLY/6).
//
// C2 (this chunk) ships: `ambient-micro-event.service.ts` + repository (`AMBIENT_DAILY_TICK`, NIGHTLY/27
// phase 1 — decay sweep + Poisson-seeded generation) + `ambient-attend.service.ts` (the attend loop, S4
// cohesion residue) + `ambient.projection.service.ts` + `ambient.controller.ts` (`GET /v1/ambient/feed` +
// `POST /v1/ambient/attend/:id`).
//
// C3 (this chunk) adds: `off-hours-drift.detector.ts` + `off-hours-drift.repository.ts`
// (`AMBIENT_DAILY_TICK` phase 2, wired into `AmbientMicroEventService`'s SAME `run(ctx)` callback) +
// `ambient-drift-exception-producer.service.ts` (S5 pattern, `CityEventBus.onOffHoursDriftDetected`) +
// `ambient-admin.controller.ts` (3 GET ops-diagnostic endpoints, S8).
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched.
// SchedulerModule is imported for `CitySimSchedulerService` + `CityEventBus` (the HOURLY/6 + NIGHTLY/27
// registrations AND the C3 `OffHoursDriftDetectedEvent` bus, both exported by SchedulerModule — the SAME
// REUSE precedent every prior tick-registering module follows). `CohesionPermafrostModule` is imported C2
// for the S4 ruling (`AmbientAttendService` injects BOTH `CohesionPermafrostService.getCohesionRaw` (read)
// AND the now-exported `CohesionPermafrostRepository.applyMutations` (write) —
// `2026-07-13-04g-A-C0-reanchor.md` §2). `AuthModule` is imported C2 for `JwtAuthGuard` (`AmbientController`'s
// player-facing routes) — the SAME REUSE precedent `CohesionPermafrostModule`/`ExceptionsModule` follow.
// `ExceptionsModule` is imported C3 for `ExceptionsRepository` (S5 pattern) — `AmbientDriftExceptionProducerService`
// consumes ONLY its exported `ExceptionsRepository`; `ExceptionsModule`'s own import graph
// (LieutenantModule/EnforcementModule/ProgressionModule/SessionModule, none of which reference
// AmbientModule) creates no cycle.
//
// 04g-B C2 addendum: `ConstantHumRepository` is now ALSO exported (additive — one more class in the
// `exports` array, zero behavior change to AmbientModule itself). `RandomWorldEventGeneratorService`
// (`operational/random_world/`) imports `AmbientModule` for `ConstantHumRepository.
// aggregateAvgHeatByDistrict()` — the design §2 S13 seam (`halgren_tannery_hailstorm`'s hum-weighted
// district-selection trigger, READ-only, D7) — mirrors the CohesionPermafrostModule precedent above
// (a sibling chunk exporting one more already-`@Injectable()` repository so a later module can inject
// it, never a re-implementation of the aggregate query).
//
// 04g-B C3 addendum: `OffHoursDriftRepository` is now ALSO exported (SAME additive shape as the C2
// addendum above). `RandomWorldEventGeneratorService` injects it for the P2 TightCouplingPair
// (`offhours_hum__bpd_attention`) freshness-window predicate (design §3.6) — READ-only, no new write
// path into `off_hours_drift_detection`.

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { CohesionPermafrostModule } from '../../citysim/cohesion/cohesion.module';
import { ExceptionsModule } from '../../exceptions/exceptions.module';
import { ConstantHumService } from './constant-hum.service';
import { ConstantHumRepository } from './constant-hum.repository';
import { AmbientMicroEventRepository } from './ambient-micro-event.repository';
import { AmbientMicroEventService } from './ambient-micro-event.service';
import { AmbientAttendService } from './ambient-attend.service';
import { AmbientProjectionService } from './ambient.projection.service';
import { AmbientController } from './ambient.controller';
import { AmbientTestController } from './ambient-test.controller';
import { OffHoursDriftRepository } from './off-hours-drift.repository';
import { OffHoursDriftDetectorService } from './off-hours-drift.detector';
import { AmbientDriftExceptionProducerService } from './ambient-drift-exception-producer.service';
import { AmbientAdminController } from './ambient-admin.controller';

// AmbientTestController: test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  AmbientController, // C2: player-facing GET /v1/ambient/feed + POST /v1/ambient/attend/:id.
  AmbientAdminController, // C3: 3 GET ops-diagnostic endpoints (S8, role gm ≡ ops) — always-on, NOT test-gated.
  ...(testControllersEnabled() ? [AmbientTestController] : []),
];

@Module({
  imports: [
    SchedulerModule,          // CitySimSchedulerService DI anchor — HOURLY/6 (C1) + NIGHTLY/27 (C2/C3)
                               // registrations + CityEventBus (C3). DB injection is provided by @Global() DbModule.
    AuthModule,                // C2: JwtAuthGuard for AmbientController's player routes.
    CohesionPermafrostModule,  // C2: CohesionPermafrostService (read) + CohesionPermafrostRepository
                               // (write) — the S4 ruling's exact seam for the attend loop's cohesion residue.
    ExceptionsModule,          // C3: ExceptionsRepository (S5 pattern) — AmbientDriftExceptionProducerService.
  ],
  controllers,
  providers: [
    ConstantHumRepository,      // C1: constant_hum_cell reads/writes + the AVG(heat) cross-district aggregate.
    ConstantHumService,         // C1: registers CONSTANT_HUM_CELL_TICK at HOURLY/6 (onApplicationBootstrap).
    AmbientMicroEventRepository, // C2: ambient_micro_event reads/writes + the attend claim + feed reads.
    AmbientMicroEventService,   // C2: registers AMBIENT_DAILY_TICK at NIGHTLY/27 (decay + Poisson generation).
    AmbientAttendService,       // C2: the attend loop (diminishing-returns cohesion residue, S4).
    AmbientProjectionService,   // C2: P5 — feed/attend qualitative projections (R2.2).
    OffHoursDriftRepository,           // C3: off_hours_drift_detection reads/writes + district→players lookup.
    OffHoursDriftDetectorService,      // C3: AMBIENT_DAILY_TICK phase 2 — drift detection + per-player event fan-out.
    AmbientDriftExceptionProducerService, // C3: S5 pattern — OffHoursDriftDetectedEvent → Exception card.
  ],
  // 04g-B C2: ConstantHumRepository exported so RandomWorldModule can inject it (S13 READ-only seam).
  // 04g-B C3: OffHoursDriftRepository ALSO exported (additive — one more class in this array, zero
  // behavior change to AmbientModule itself, SAME precedent as the C2 addition above) — the P2
  // TightCouplingPair predicate (`offhours_hum__bpd_attention`) reads `listLatestPriorDetectionForEveryDistrict`
  // (the ALREADY-BATCHED ★F4 read, off-hours-drift.repository.ts) for its freshness-window eligibility
  // check — never a re-implementation of that query.
  exports: [ConstantHumRepository, OffHoursDriftRepository],
})
export class AmbientModule {}

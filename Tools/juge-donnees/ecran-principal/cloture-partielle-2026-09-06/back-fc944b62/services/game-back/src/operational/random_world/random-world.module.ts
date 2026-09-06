// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1 (DI shell) + C2
//             (generator/repository/projection/controllers)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3 (architecture —
//             module operational/random_world/)
//             Architecture mirror: services/game-back/src/operational/ambient/ambient.module.ts
//             — 04g-B C1 — 2026-07-15
//             — 04g-B C2 — 2026-07-15 (generator core + NIGHTLY/28 + projection + controllers)
//
// `RandomWorldModule` — the RANDOM-WORLD runtime module (G24, structural mirror of
// `operational/ambient/` 04g-A). C1 shipped NO NestJS providers: `random-world.tunables.ts`
// (`randomWorldTunables`) and `random-world-template-registry.ts`
// (`RANDOM_WORLD_TEMPLATE_REGISTRY`/`randomWorldTemplateById`) are plain exported consts/functions
// (mirrors `ambient.tunables.ts`/`political-event-catalogue.ts` — neither is Nest-injectable), and
// `recovery-curve.ts` is a zero-I/O pure-function module. The 3 new tables land this SAME commit
// (migration 0128, `db/schema/random_world.ts`) but had no repository/service consumer yet — C1's
// E2E floor exercised the new `EffectModifierService.applyRandomWorldEvent`/`revertRandomWorldEvent`/
// `reapplyRandomWorldEvent` siblings directly through `EffectEngineModule`'s existing DI graph.
//
// C2 (this chunk) fills in: `random-world-event.repository.ts` (the 3-table Drizzle access layer) +
// `random-world-event-generator.service.ts` (`RANDOM_WORLD_DAILY_TICK`, NIGHTLY/28 — the daily tick,
// `halgren_tannery_hailstorm` + `permanent_residue` LIVE) + `random-world.projection.service.ts` (P5
// player bands, R2.2) + `random-world.controller.ts` (`GET /v1/random-world/active`) +
// `random-world-test.controller.ts` (DEV-gated direct-probe routes, R-EC-2). `scar-polygon.ts` +
// `district-hum-weighting.ts` + `random-world-clock.ts` are zero-I/O pure-function modules (no DI
// registration needed — imported directly, mirrors `recovery-curve.ts`'s own C1 posture).
//
// Imports SchedulerModule (EXPORTS `CitySimSchedulerService` — the NIGHTLY/28 registration) + AuthModule
// (EXPORTS `JwtAuthGuard` — `RandomWorldController`'s player-facing route) + AmbientModule (EXPORTS
// `ConstantHumRepository` since C2's own additive export, `2026-07-15` — the S13 hum-weighted
// district-selection READ-only seam, D7) + EffectEngineModule (EXPORTS `EffectModifierService` — the
// DD-RW1 siblings `applyRandomWorldEvent`/`revertRandomWorldEvent`/`reapplyRandomWorldEvent`, C1).
// Depends on the `@Global()` DbModule (the repository/controller/service inject the DB provider).
//
// C3 (this chunk) adds: `tight-coupling-pairs.ts` (pure registry, no DI) + `district-adjacency.ts` (pure
// module, no DI) + `random-world-coupling.service.ts` (the cap/exposure gate) +
// `random-world-exception-producer.service.ts` (S14 — Exception card on cascade admission) — the
// `sideways_failure` keystone. Imports `ErlangStashModule` (EXPORTS `ErlangStashService` — the S8
// stash-FULL predicate seam, `listDistrictsWithFullBand`, C3-additive) and `ExceptionsModule` (EXPORTS
// `ExceptionsRepository` — the S14 producer pattern, SAME REUSE precedent `AmbientModule` follows for
// its own C3). `AmbientModule` now ALSO exports `OffHoursDriftRepository` (C3-additive) for the P2
// TightCouplingPair (`offhours_hum__bpd_attention`) freshness predicate.
//
// C4 (this chunk) adds: the 3 cohesion-curve templates — `hollow_at_the_corner` (fork closure + funeral
// attendance) / `apparent_recovery` (3-phase curve successor + plateau amplifier) /
// `quorum_on_stadler_row` (rolling adoption + state-driven flip/cascade/hysteresis) — plus
// `random-world-cohesion.service.ts` (the S17 mutation seam these 2 templates share) and the
// `CohesionPermafrostModule` import (EXPORTS `CohesionPermafrostService` + `CohesionPermafrostRepository`
// — the read/write halves of the S17 seam). `quorum-adoption.ts` is a zero-I/O pure-function module (no
// DI registration needed — imported directly, mirrors `recovery-curve.ts`'s own C1 posture).
//
// C5 (this chunk) adds: `random-world-admin.controller.ts` (4 BO endpoints, §6.2 — 3 GET role `gm` +
// `POST force-template` role `admin`, F3 DEFERRED TD-107 JOIN) — NOT test-gated, always registered
// (mirrors `AmbientAdminController`'s own always-on posture). No new provider needed: the admin
// controller injects the SAME `RandomWorldEventRepository`/`RandomWorldEventGeneratorService` already
// registered below.
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched.

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { AmbientModule } from '../ambient/ambient.module';
import { EffectEngineModule } from '../effect_engine/effect-engine.module';
import { ErlangStashModule } from '../../citysim/erlang_stash/erlang-stash.module';
import { ExceptionsModule } from '../../exceptions/exceptions.module';
import { CohesionPermafrostModule } from '../../citysim/cohesion/cohesion.module';
import { RandomWorldEventRepository } from './random-world-event.repository';
import { RandomWorldEventGeneratorService } from './random-world-event-generator.service';
import { RandomWorldCouplingService } from './random-world-coupling.service';
import { RandomWorldExceptionProducerService } from './random-world-exception-producer.service';
import { RandomWorldCohesionMutationService } from './random-world-cohesion.service';
import { RandomWorldProjectionService } from './random-world.projection.service';
import { RandomWorldController } from './random-world.controller';
import { RandomWorldAdminController } from './random-world-admin.controller';
import { RandomWorldTestController } from './random-world-test.controller';

// RandomWorldTestController: test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  RandomWorldController, // C2: player-facing GET /v1/random-world/active.
  RandomWorldAdminController, // C5: BO ops-diagnostic + force-template (§6.2), always registered.
  ...(testControllersEnabled() ? [RandomWorldTestController] : []),
];

@Module({
  imports: [
    SchedulerModule,   // CitySimSchedulerService DI anchor — NIGHTLY/28 registration (C2) + CityEventBus (C3).
    AuthModule,        // C2: JwtAuthGuard for RandomWorldController's player routes.
    AmbientModule,     // C2: ConstantHumRepository (S13 hum-weighted district pick) + C3: OffHoursDriftRepository (P2 predicate).
    EffectEngineModule, // C2: EffectModifierService (DD-RW1 siblings, C1) — the apply/revert/reapply engine.
    ErlangStashModule, // C3: ErlangStashService (S8 stash-FULL predicate seam, P1).
    ExceptionsModule,  // C3: ExceptionsRepository (S14 pattern) — RandomWorldExceptionProducerService.
    CohesionPermafrostModule, // C4: CohesionPermafrostService (read) + CohesionPermafrostRepository (S17 write seam).
  ],
  controllers,
  providers: [
    RandomWorldEventRepository,       // C2: the 3-table Drizzle access layer. C3 extends it (coupling + adjacency reads). C4 adds funeral claim + apparent_recovery eligibility.
    RandomWorldEventGeneratorService, // C2: registers RANDOM_WORLD_DAILY_TICK at NIGHTLY/28. C3 wires phase 3c/4 (sideways_failure). C4 wires the cohesion-curve family.
    RandomWorldProjectionService,     // C2: P5 — active-events qualitative projection (R2.2). C3 adds known-couplings.
    RandomWorldCouplingService,       // C3: applyCouplingDiscovery — cap gate + exposure UNIQUE + card fan-out.
    RandomWorldExceptionProducerService, // C3: S14 pattern — CouplingDiscoveryExposedEvent → Exception card.
    RandomWorldCohesionMutationService, // C4: the S17 cohesion mutation seam — hollow drop/restore, apparent_recovery residue.
  ],
  exports: [],
})
export class RandomWorldModule {}

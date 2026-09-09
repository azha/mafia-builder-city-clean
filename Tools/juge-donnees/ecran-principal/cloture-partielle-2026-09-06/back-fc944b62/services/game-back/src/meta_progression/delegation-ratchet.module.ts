// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (`DelegationRatchetModule`
//             scaffold — module + repositories, NO runtime logic yet) + C2 ("TaskCategory catalogue +
//             mastery accumulator (activation of mastery_score)").
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md (ch06
//             MÈRE — a BRAND-NEW domain, not an extension of `core_loops`/`progression`).
//             Architecture mirror: `core-loops.module.ts` (P3-A C1 — "C1 = tunables-only shell", the SAME
//             posture for a genuinely new domain's first chunk).
//             C2 boot check mirror: `loop10.module.ts` (`onApplicationBootstrap` running the D7 closed-
//             world strict-mode validator against the REAL production catalogue — the SAME "loud
//             misconfiguration fails boot" convention, now for DD-F2's TaskCategory catalogue).
//             — P3-F C1 — 2026-07-18 / C2 — 2026-07-18
//
// `DelegationRatchetModule` — the ch06 Delegation Ratchet runtime home (Graduated Retirement / Promotion
// Lock / Recall Debt). C1 = the scaffold: the 3 mig-0135 repositories (DI-ready, zero methods — see each
// repository's own header for why) + the test-only tunables probe controller. Standalone leaf module
// (mirrors `DemolitionModule`/`CompressionModule`/`CueStackModule` — registered directly in `app.module.ts`).
//
// C2 ADDS: `MasteryScoreRepository` (the ACTIVATED `mastery_score` write path) + `MasteryAccumulatorService`
// (subscribes to `CityEventBus` — needs `SchedulerModule`, newly imported here) + the DD-F2 boot strict-
// check (`TASK_CATEGORY_CATALOGUE` — every LIVE row's 4 bindings present, every RESERVED row's 4 bindings
// empty; a violation fails NestJS boot). `MasteryAccumulatorService` is EXPORTED so `ExceptionsModule` can
// inject it for the R6 resolve-hook sibling call (`exceptions.module.ts`, additive import).
//
// C3 ADDS: `MetaProgressionProjectionService` (design §11 — the org-overview projection, reading
// `mastery_score` + the 3 mig-0135 tables via their C3-added read-only methods) + `MetaProgressionController`
// (`GET /v1/meta/task-categories`, ALWAYS registered — a real player-facing route, unlike the gated test
// controller).
//
// C4 ADDS: `CategoryDecisionLogRepository` (the R3/R6 decision-log extractor over `structural_decisions_
// audit` + `exception_queue`) + `GraduationSeedMapper` (the C7-seam THIRD consumer — decisions + category
// + archetype → a compiled DSL seed script, `script_seed_hash` = SHA-256 of the IR). Pure pipeline, NO
// attach/state-write consumer yet (C5's job) — `DslModule` is newly imported here so `GraduationSeedMapper`
// can inject the REAL `DslParserService`/`DslCompilerService` (the SAME pipeline `attachScript`/
// `RecruitmentQuestOutcomeMapper` compile through, never a re-implementation).
//
// C5 ADDS `GraduationService` (the `POST /v1/meta/graduation` mutateFn — validate → C4 pipeline →
// service-level attachScript → the atomic mastery_score winner-gate → graduation_events + successor
// install → post-commit `GraduationCommittedEvent`) + `GraduationLieutenantFaultInjector` (TEST-ONLY,
// the induced-mid-tx-failure proof seam, mirrors `HlCardFaultInjector`/`CueStackExecutorFaultInjector`).
// `MetaProgressionController` is EXTENDED (not replaced) with the `graduate` route, injecting
// `StructuralDecisionGovernorService` (NEW — `Loop10Module` import) to wrap `GraduationService.
// executeGraduation` in `governor.commit(TASK_RETIREMENT, ...)`, the SAME shape every other structural
// site's controller uses. `LieutenantModule` is a NEW import (EXPORTS `LieutenantService`/
// `LieutenantRepository` — the service-level attach REUSE + the SAME ownership query the guarded attach
// path enforces, design §8.2 step 1 "REUSE its validation, never a parallel one"). Both imports are
// ONE-WAY (neither `Loop10Module` nor `LieutenantModule` imports `DelegationRatchetModule` — no cycle;
// `LieutenantModule` ALREADY imports `Loop10Module` itself, confirming the shape is safe).
//
// C7 ADDS `PlayerProficiencySeeder` (← `GraduationCommittedEvent`, D8 freeze) + `RecallDebtSessionSubscriber`
// (← `SessionClosedEvent`, D9 accrual/recovery) — both `OnApplicationBootstrap` bus subscribers, mirroring
// `MasteryAccumulatorService`'s own C2 wiring shape. Both exported so `DelegationRatchetTestController` can
// inject the subscriber's direct-invocation seam (Lesson #3 — the SAME method the real bus path calls).
//
// C8 ADDS `PromotionLockService` (the `POST /v1/meta/recall` mutateFn + the `GET /v1/meta/recall-preview/
// :categoryId` read — design §9 governed tx + §11 preview) + `PromotionLockTickService` (`PROMOTION_LOCK_
// TICK` HOURLY/7, `OnApplicationBootstrap` scheduler registration, mirrors `MasteryAccumulatorService`'s
// own C2 wiring shape one level up — a SCHEDULER registration, not a bus subscriber) +
// `RecallFaultInjector` (TEST-ONLY, the induced-mid-tx-failure proof seam at the recall site, mirrors
// `GraduationLieutenantFaultInjector`). `ReputationModule` is a NEW import (EXPORTS
// `RestraintIndexService`/`BossMirrorService` — the §9.3 accord-coupling REUSE, C0 R1 DEFINITIVE LIVE
// branch); ONE-WAY (`ReputationModule` imports `SchedulerModule`/`MarketModule` only — no cycle).
// `MetaProgressionController` is EXTENDED (not replaced) with the `recall`/`recallPreview` routes.
//
// C9 ADDS `DegradedCategoryPressureProducer` (design §10.4/D11 — the ONE new additive `SessionOpenedEvent`
// producer, seam §2 row 6). `ExceptionsRepository` is DUPLICATE-PROVIDED directly here (NOT an
// `ExceptionsModule` import — `ExceptionsModule` already imports `DelegationRatchetModule` for the C2
// resolve-hook, so importing back would cycle; mirrors `FrictionThresholdExceptionProducer`/
// `CompressionResidueExceptionProducer`'s own established "stateless DB-only class, harmless second
// instance" precedent, P3-E). Zero `src/exceptions/` file touched (D3 wall).
//
// C10 ADDS `MetaProgressionAdminController` (design §12 — the 7 production BO routes: `players/:id/
// task-categories` P5-inverted GET, `graduation-events`/`promotion-locks`/`mastery-distribution`/
// `recall-metrics` GETs, `force-close-window/:lockId` POST, `tunables/meta-progression` PUT) + its
// `AdminAuditLogService` REUSE (mirrors `CoreLoopsModule`'s own C8 addition verbatim — no new audit path).
// ALWAYS registered (real GM/admin surface, never gated by `testControllersEnabled()`).

import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { DslModule } from '../dsl/dsl.module';
import { LieutenantModule } from '../operational/lieutenant/lieutenant.module';
import { Loop10Module } from '../progression/loop10/loop10.module';
import { ReputationModule } from '../operational/reputation/reputation.module';
import { testControllersEnabled } from '../protocol/test-routes-gate';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import { GraduationEventsRepository } from './graduation-events.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { MasteryScoreRepository } from './mastery-score.repository';
import { MasteryAccumulatorService } from './mastery-accumulator.service';
import { TASK_CATEGORY_CATALOGUE, validateTaskCategoryCatalogueStrictMode } from './task-category-catalogue';
import { DelegationRatchetTestController } from './delegation-ratchet-test.controller';
import { MetaProgressionProjectionService } from './meta-progression.projection.service';
import { MetaProgressionController } from './meta-progression.controller';
import { CategoryDecisionLogRepository } from './category-decision-log.repository';
import { GraduationSeedMapper } from './graduation-seed-mapper';
import { GraduationService } from './graduation.service';
import { GraduationLieutenantFaultInjector } from './graduation-lieutenant-fault-injector';
import { PlayerProficiencySeeder } from './player-proficiency-seeder.service';
import { RecallDebtSessionSubscriber } from './recall-debt-session-subscriber.service';
import { PromotionLockService } from './promotion-lock.service';
import { PromotionLockTickService } from './promotion-lock-tick.service';
import { RecallFaultInjector } from './recall-fault-injector';
import { DegradedCategoryPressureProducer } from './degraded-category-pressure-producer.service';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { MetaProgressionAdminController } from './meta-progression-admin.controller';

@Module({
  // SchedulerModule (C2, additive) — EXPORTS `CityEventBus`, which `MasteryAccumulatorService` subscribes
  // through (mirrors `core-loops.module.ts`'s own direct import for the same reason — neither
  // `DbModule` nor any other import here re-exports the bus). DslModule (C4, additive) — EXPORTS
  // `DslParserService`/`DslCompilerService`, which `GraduationSeedMapper` injects (mirrors
  // `recruitment.module.ts`'s own `DslModule` import for the SAME reason). LieutenantModule + Loop10Module
  // (C5, additive) — see the file header above. ReputationModule (C8, additive) — see the file header.
  imports: [DbModule, SchedulerModule, DslModule, LieutenantModule, Loop10Module, ReputationModule],
  controllers: [
    // C3/C5/C8 — MetaProgressionController: the REAL player-facing `GET /v1/meta/task-categories` +
    // `POST /v1/meta/graduation` + `POST /v1/meta/recall` + `GET /v1/meta/recall-preview/:categoryId`
    // routes, always registered (unlike the gated test controller below).
    MetaProgressionController,
    // C10 — MetaProgressionAdminController: the 7 production BO routes (design §12), always registered
    // (real GM/admin surface, NOT conditional on NODE_ENV — mirrors CoreLoopsAdminController's own posture).
    MetaProgressionAdminController,
    // DelegationRatchetTestController: test-only probe routes (R-EC-2) — NOT registered in production.
    ...(testControllersEnabled() ? [DelegationRatchetTestController] : []),
  ],
  providers: [
    GraduationEventsRepository,
    PromotionLocksRepository,
    PlayerProficiencyRepository,
    MasteryScoreRepository,
    MasteryAccumulatorService,
    // C3 — the org-overview projection (GET /v1/meta/task-categories).
    MetaProgressionProjectionService,
    // C4 — the seed pipeline (pure, no attach/state-write consumer yet — C5 injects both directly WITHIN
    // this same module, so neither is exported below; the graduation site lands in this module too).
    CategoryDecisionLogRepository,
    GraduationSeedMapper,
    // C5 — the graduation mutateFn + its TEST-ONLY fault injector (harmless no-op unless a spec arms it
    // via the gated test route, `delegation-ratchet-test.controller.ts`).
    GraduationService,
    GraduationLieutenantFaultInjector,
    // C7 — the D8 freeze subscriber + the D9 accrual/recovery subscriber (both OnApplicationBootstrap bus
    // wirings, mirrors MasteryAccumulatorService's own C2 shape).
    PlayerProficiencySeeder,
    RecallDebtSessionSubscriber,
    // C8 — the recall mutateFn/preview + the HOURLY window-close tick + its TEST-ONLY fault injector
    // (harmless no-op unless a spec arms it via the gated test route).
    PromotionLockService,
    PromotionLockTickService,
    RecallFaultInjector,
    // C9 — the additive SessionOpenedEvent pressure producer + its duplicate-provided ExceptionsRepository
    // (see the file header D3-wall / cycle-avoidance note).
    ExceptionsRepository,
    DegradedCategoryPressureProducer,
    // C10 — the BO surface's audit-log writer (REUSE, R9.3 — never a parallel audit path; mirrors
    // CoreLoopsModule's own C8 providers-list addition verbatim).
    AdminAuditLogService,
  ],
  exports: [
    GraduationEventsRepository,
    PromotionLocksRepository,
    PlayerProficiencyRepository,
    MasteryScoreRepository,
    // C2 — consumed by `ExceptionsModule` (the R6 resolve-hook sibling injection, `exceptions.service.ts`).
    MasteryAccumulatorService,
    // C3 — exported for symmetry with the module's other services (no external consumer yet).
    MetaProgressionProjectionService,
    // C7 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    PlayerProficiencySeeder,
    RecallDebtSessionSubscriber,
    // C8 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    PromotionLockService,
    PromotionLockTickService,
    // C9 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    DegradedCategoryPressureProducer,
  ],
})
export class DelegationRatchetModule implements OnApplicationBootstrap {
  // C2 — DD-F2 closed-world boot check: every LIVE `TASK_CATEGORY_CATALOGUE` row's 4 bindings present,
  // every RESERVED row's 4 bindings empty. Unconditional (no tunable gate — DD-F2 names no such knob;
  // unlike Loop10Module's D7 check, this catalogue's closed-world guarantee is not something a later
  // chunk needs to selectively relax). A violation throws, failing NestJS boot (the SAME "loud
  // misconfiguration" convention `validateStructuralDecisionCatalogueStrictMode`/`BindingRegistry` use).
  onApplicationBootstrap(): void {
    validateTaskCategoryCatalogueStrictMode(TASK_CATEGORY_CATALOGUE);
  }
}

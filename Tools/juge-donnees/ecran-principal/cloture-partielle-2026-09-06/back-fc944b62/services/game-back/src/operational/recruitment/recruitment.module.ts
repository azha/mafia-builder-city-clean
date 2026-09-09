// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C1 (DI shell — the tunables
//             registry-first chunk) + C2 (quest machine + Saltline pool — `RecruitmentRepository` /
//             `SaltlineRecruitmentService` / `RecruitmentQuestService` / `RecruitmentController`)
//             Architecture mirror: services/game-back/src/operational/maintenance/maintenance.module.ts
//             (the C1 pure-DI-shell + conditional-test-controller-mount pattern, extended C2/C3 the same
//             way this file is — itself mirroring services/game-back/src/operational/liveops/live-ops.
//             module.ts's own C0 empty-scaffold)
//             — 04f-B C1 — 2026-07-11 | C2 extension — 2026-07-11
//
// `RecruitmentModule` — the 04f-B Lieutenant Recruitment Quests slice (G11). This is the 2nd and FINAL
// 04f sub-lot (`A → B`, A = maintenance/decay/equipment-failure, SHIPPED/sealed — not re-touched here).
//
// C1 shipped the data-model + tunables foundation (providers: [], only the read-tunables test probe).
//
// C2 ADDS the quest machine + the Saltline pool:
//   - RecruitmentRepository (the persisted access layer — clock reads, roster-cap pre-check, candidate
//     surface, the atomic start/advance/abandon transactions) — EXPORTED so C3 (`finalizeHire`) and C4 (the
//     NIGHTLY/23 tick) can inject it directly rather than re-querying.
//   - SaltlineRecruitmentService (the code-owned step table, DD-R2 + deterministic candidate generation +
//     the TrialAxisBucket reveal) — EXPORTED for the SAME C3/C4 forward reuse.
//   - RecruitmentQuestService (startQuest/advanceStep/abandon — the D2 session gate) — EXPORTED so C3's
//     `finalizeHire` endpoint can read a quest's gated-completion state through the SAME service.
//   - RecruitmentController — the player-facing endpoints (GET candidates/quests, POST quests/advance/
//     abandon), registered UNCONDITIONALLY. `POST .../hire` is NOT here — C3's endpoint.
//   - RecruitmentTestController EXTENDED with `replenish-saltline` (DD-R4 — drives the REAL
//     SaltlineRecruitmentService/RecruitmentRepository methods, the C4 tick's own future call).
//
// C3 ADDS the mapper + finalizeHire (the ★ C7 seam consumer):
//   - RecruitmentQuestOutcomeMapper (D3 — decisions → seeded behavior-script, the ABSENCE-CONTRACT-obeying
//     per-archetype vocabulary table; DI: DslParserService/DslCompilerService, imported via DslModule) —
//     EXPORTED for C5/C6 (defector/civilian finalizeHire reuse the SAME mapper instance).
//   - `RecruitmentQuestService.finalizeHire` — the D4 additive extension of `LieutenantService.recruit`
//     (imports LieutenantModule for `LieutenantService`) + the D11 couples (imports ReputationModule for
//     `HiddenCurriculumService`/`ForbiddenTriadDetectionService`, the R10-reserved exports).
//   - `POST /v1/recruitment/quests/:id/hire` (RecruitmentController).
//
// C4 ADDS the availability tick (NIGHTLY/23 — see the SCHEDULE anti-collision comment):
//   - DefectorRecruitmentService / CivilianRecruitmentService (the D8/D7 candidate-content builders,
//     C5/C6 EXTEND these with the pool-specific step flows) — EXPORTED for that forward reuse.
//   - RecruitmentAvailabilityTickService (registers RECRUITMENT_AVAILABILITY_TICK on bootstrap) —
//     EXPORTED so the test controller's `run-availability-tick` route can drive it directly.
//
// C7 ADDS the BO surface (D14): `RecruitmentAdminController` (5 game-back admin endpoints — REUSE the
// DD-C6/R12b BO topology `MaintenanceAdminController` established: `requireStaffRole` + `f3_deferred`
// markers + `AdminAuditLogService.emit` on every mutation), registered UNCONDITIONALLY (real production BO
// routes, mirrors `RecruitmentController`'s own always-on registration), injecting
// `RecruitmentRepository`/`DefectorRecruitmentService`/`CivilianRecruitmentService` (all ALREADY providers
// here) PLUS the NEW `AdminAuditLogService` provider (the SAME `db/admin-audit-log.service.ts` singleton
// every sibling BO controller registers locally — @Global() DbModule makes this safe, no cross-module
// import).
//
// C8 ADDS the F4 memory profiler (TD-191 delivery): `MaintenanceRecruitmentLayerMemoryProfiler`
// (`memory-budget-profiler.service.ts` — REAL per-player counts, REUSING `RecruitmentRepository`'s
// existing `countLieutenants`/`listQuests`/`listAllCandidatesForPlayer` verbatim + a direct read-only
// `building_operational_state` COUNT, no MaintenanceModule import, no MaintenanceRepository edit) +
// `MemoryBudgetAdminController` (`GET /v1/admin/04f/memory-budget/:id`, role `gm`, registered
// UNCONDITIONALLY — a real production BO route, mirrors `RecruitmentAdminController`'s own always-on
// registration). No new module import: the profiler reads `building_operational_state` directly
// (imports the schema table, not `MaintenanceModule`) — RecruitmentModule's import list is unchanged.
import { Module } from '@nestjs/common';

import { DslModule } from '../../dsl/dsl.module';
import { LieutenantModule } from '../lieutenant/lieutenant.module';
import { ReputationModule } from '../reputation/reputation.module';
// C5 — InternalAffairsModule EXPORTS IATargetService (the D13 corrupt-clerk couple, `recordCorruptUse`
// 'clerk' first activation). CombatModule EXPORTS MaladaptiveMemoryService + CombatRepository (the D10
// onboarding band-read over `escalation_pair_state.conflict_memory_depth`). Neither imports
// RecruitmentModule back (verified — no cycle).
import { InternalAffairsModule } from '../internal_affairs/internal-affairs.module';
import { CombatModule } from '../conflict/combat/combat.module';
// C4 — SchedulerModule EXPORTS CitySimSchedulerService (RecruitmentAvailabilityTickService.
// onApplicationBootstrap needs it to registerSystem RECRUITMENT_AVAILABILITY_TICK at NIGHTLY/23; the
// MaintenanceModule/MaintenancePhaseTickService precedent — SchedulerModule is NOT @Global()).
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
// C7 (D14) — the FIRST-consumer ch09 admin_audit_log wrapper in THIS module (04f-A C8 precedent) —
// registered locally here exactly like every sibling BO controller's own module (MaintenanceModule,
// LiveOpsModule, PoliticalModule).
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { RecruitmentTestController } from './recruitment-test.controller';
import { RecruitmentAdminController } from './recruitment-admin.controller';
import { MemoryBudgetAdminController } from './memory-budget-admin.controller';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentRepository } from './recruitment.repository';
import { SaltlineRecruitmentService } from './saltline-recruitment.service';
import { DefectorRecruitmentService } from './defector-recruitment.service';
import { CivilianRecruitmentService } from './civilian-recruitment.service';
import { RecruitmentQuestService } from './recruitment-quest.service';
import { RecruitmentQuestOutcomeMapper } from './recruitment-quest-outcome-mapper';
import { RecruitmentAvailabilityTickService } from './recruitment-availability-tick.service';
import { MaintenanceRecruitmentLayerMemoryProfiler } from './memory-budget-profiler.service';
// P3-F C6 — CategoryDelegationGuardModule EXPORTS CategoryDelegationGuard (RecruitmentController's
// quest-hire LIEUTENANT_HIRING guard site). A pure leaf — no circular dependency.
import { CategoryDelegationGuardModule } from '../../meta_progression/category-delegation-guard.module';

// RecruitmentController/RecruitmentAdminController/MemoryBudgetAdminController: always-on routes (real
// production surface, player / BO / BO-TD-191 respectively). RecruitmentTestController: test-only probe
// routes (R-EC-2) — NOT registered in production.
const controllers = [
  RecruitmentController,
  RecruitmentAdminController,
  MemoryBudgetAdminController,
  ...(testControllersEnabled() ? [RecruitmentTestController] : []),
];

@Module({
  // C3: imports LieutenantModule (LieutenantService — the C7 seam; ALSO exports LieutenantRepository,
  // consumed C5 for the D10 settling-arm write) + ReputationModule (the D11 couples; ALSO exports
  // BossMirrorService, consumed C5 for the D13 rep-bucket resolution) + DslModule (the mapper's
  // parse/compile pipeline). C4: imports SchedulerModule (CitySimSchedulerService — the NIGHTLY/23
  // registration seam). C5: imports InternalAffairsModule (IATargetService, D13) + CombatModule
  // (MaladaptiveMemoryService + CombatRepository, D10). RecruitmentModule is registered LAST in
  // app.module.ts (after all of these) — one-directional, no cycle (none of them imports
  // RecruitmentModule back).
  imports: [LieutenantModule, ReputationModule, DslModule, SchedulerModule, InternalAffairsModule, CombatModule, CategoryDelegationGuardModule],
  controllers,
  providers: [
    RecruitmentRepository,
    SaltlineRecruitmentService,
    DefectorRecruitmentService,
    CivilianRecruitmentService,
    RecruitmentQuestOutcomeMapper,
    RecruitmentQuestService,
    RecruitmentAvailabilityTickService,
    // C7 (D14) — RecruitmentAdminController's audit-log dependency.
    AdminAuditLogService,
    // C8 (TD-191) — MemoryBudgetAdminController's dependency. Injects RecruitmentRepository (already a
    // provider above) + reads building_operational_state directly (DB is @Global(), no new import).
    MaintenanceRecruitmentLayerMemoryProfiler,
  ],
  // EXPORTED for cross-chunk reuse (C5/C6 defector/civilian depth) — one-directional: RecruitmentModule
  // imports LieutenantModule/ReputationModule/DslModule but nothing imports IT back yet.
  exports: [
    RecruitmentRepository,
    SaltlineRecruitmentService,
    DefectorRecruitmentService,
    CivilianRecruitmentService,
    RecruitmentQuestOutcomeMapper,
    RecruitmentQuestService,
    RecruitmentAvailabilityTickService,
  ],
})
export class RecruitmentModule {}

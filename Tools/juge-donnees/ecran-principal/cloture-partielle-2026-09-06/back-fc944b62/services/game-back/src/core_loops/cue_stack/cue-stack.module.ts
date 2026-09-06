// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (module skeleton) + §C3
//             (executor registry + tick wiring) + §C4 (cascade producer + heat/raid disruption subscriber)
//             + §C5 (Named Sequences — save/list/apply, cap-5 I4)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §2 (seam map) + §5.1
//             (the 4 LIVE executors, each wired to its REAL verb) + §6.2/§6.3/§7 (C4) + §8 (C5).
//             Decisions: §1.12 D12 (module layout — `core_loops/cue_stack/`, mirrors
//             `core_loops/supply_chain/`: repository + service + controller + module).
//             — P3-D C2 — 2026-07-14 / C3 — 2026-07-14 / C4 — 2026-07-14 / C5 — 2026-07-14
//
// C5 ADDS `NamedSequenceRepository`/`NamedSequenceService`/`NamedSequenceController` (SAME module — the
// D12 layout precedent, one module per lot-owned data area, not per verb-group). The unlock gate (ruling
// #2(a)) needs `ProgressionRepository` (already exported by the already-imported `ProgressionModule`,
// C3's own `ExceptionsService.onResolution` need) + `ProgressionProjectionService` — NOT exported by
// `ProgressionModule` (only `[ProgressionService, ProgressionRepository]` are), so it is duplicate-provided
// here (zero-dependency stateless class — the SAME `ExceptionsProjectionService`/`LieutenantRepository`
// "stateless class from an unexported module" precedent this file's own C3 header already establishes).
//
// `CueStackModule` — C2 was a LEAF module (`CueStackRepository` + `ExceptionsRepository` duplicate-
// provided only). C3 ADDS the executor registry + the 2 tick services, which need REAL production verbs
// from 4 DIFFERENT owning modules:
//
//   - `DistributionModule` EXPORTS `DistributionService` (dispatch) — imported directly.
//   - `MaintenanceModule` EXPORTS `MaintenanceService` (scheduleMaintenance) — imported directly.
//   - `RecruitmentModule` EXPORTS `RecruitmentQuestService` (startQuest) — imported directly. (Registered
//     LAST in `app.module.ts`, same as `CueStackModule` itself — one-directional, no cycle: neither
//     imports the other back.)
//   - `ExceptionsService` (resolve) is NOT exported by `ExceptionsModule` (D3 forbids editing that
//     file to add the export) — and `ExceptionsService`'s OWN dependency graph (`ExceptionEffectRegistry`
//     + its 10 handlers, several needing `LieutenantService`/`RepairService`/`RaidExceptionRepository`)
//     is FAR too heavy to duplicate-provide in full (unlike the SIMPLE stateless-DB-only-class precedent
//     this file's own C2 header established for `ExceptionsRepository`). Since `ExceptionBatchResolution
//     Executor` ONLY EVER calls `resolve(...,'ONE_TIME',...)` (divergence #9's own narrowing — ESCALATE/
//     ADD_RULE/REPAIR/etc. are NEVER reached), a NARROWED duplicate `ExceptionsService` is wired here
//     instead: its OWN `ExceptionEffectRegistry` holds ONLY `OneTimeHandler` (which itself needs only
//     `ExceptionsRepository`, already duplicate-provided). `ExceptionsProjectionService` (zero-dep) and
//     `LieutenantRepository` (DB-only) are ALSO duplicate-provided (the SAME "stateless class from an
//     unexported module" precedent `DistributionModule`/`MaintenanceModule` already establish elsewhere
//     in this codebase for the SAME reason). `ProgressionService` (resolve()'s OWN unconditional
//     `progression.onResolution` call) and `SessionService` (resolve()'s OWN `sessions.
//     recordExceptionResolved` call) are the REAL SHARED SINGLETONS — `ProgressionModule` (NEW import,
//     trivial: `ProgressionModule` imports only `[DbModule, AuthModule]`, no cycle risk) and
//     `SessionModule` (already imported since C2) both EXPORT them, so this narrowed `ExceptionsService`
//     instance behaves identically to production's for every side-effect OUTSIDE the registry dispatch
//     itself. Zero edit anywhere inside `src/exceptions/` (D3 — confirmed: every file this header cites
//     is IMPORTED, never modified).
//     P3-G C7 (additive) — `ExceptionsService`'s constructor gained an 8th param, `IsostaticDebtService`
//     (the R8 resolve-hook sibling seam), so THIS module's own narrowed duplicate-provided `ExceptionsService`
//     instance needs it too. Mirrors the 7th-param precedent immediately above: `BudgetsHorizonModule`
//     (NEW import) EXPORTS `IsostaticDebtService`; its own import set (`DbModule`/`ProgressionModule`/
//     `DelegationRatchetModule`/`SchedulerModule`/`Loop10Module`) is ALREADY fully present in this
//     module's graph (directly or transitively via `DistributionModule`/`MaintenanceModule`) — zero new
//     cycle risk, and `BudgetsHorizonModule` never imports `CueStackModule` back.
//     W1.1-a C6 (additive) — `ExceptionsService`'s constructor gained a 9th param,
//     `OnboardingFunnelRepository` (the funnel-state resolve-hook sibling seam, design D3/IM-2), so THIS
//     module's own narrowed duplicate-provided `ExceptionsService` instance needs it too — the SAME
//     boot-time DI failure this file's OWN header already documents for the 7th/8th params
//     (measured empirically: `Nest can't resolve dependencies of the ExceptionsService (…) — the
//     argument OnboardingFunnelRepository at index [8] is available in the CueStackModule context`).
//     Duplicate-provided directly (mirrors `LieutenantRepository`/`ExceptionsRepository` below —
//     `OnboardingFunnelRepository` is `@Inject(DB)`-only, trivially cycle-safe, no dedicated module, its
//     own file's header), NOT a new module import.
//   - `RouteLifecycleRepository` (the saved route's origin/destination, `DistributionRunExecutor`'s own
//     need) is NOT exported by `DistributionModule` either — duplicate-provided (DB-only, the SAME
//     `ExceptionsRepository` precedent).
//
// `CueStackRepository` needs only the injected DB client + `ExceptionsRepository` (duplicate-provided,
// C2). `CueStackService` needs `CueStackRepository` (same-module) + `CityEventBus` (`SchedulerModule`) +
// `SessionService` (`SessionModule`). Registered directly in `AppModule.imports[]` (LAST — no consumer
// imports THIS module).

import { Module } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { SessionModule } from '../../session/session.module';
import { ProgressionModule } from '../../progression/progression.module';
import { ProgressionProjectionService } from '../../progression/progression.projection.service';
import { DistributionModule } from '../../operational/distribution/distribution.module';
import { RouteLifecycleRepository } from '../../operational/distribution/route-lifecycle.repository';
import { MaintenanceModule } from '../../operational/maintenance/maintenance.module';
import { RecruitmentModule } from '../../operational/recruitment/recruitment.module';
import { LieutenantRepository } from '../../operational/lieutenant/lieutenant.repository';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import { ExceptionsProjectionService } from '../../exceptions/exceptions.projection.service';
import { ExceptionEffectRegistry } from '../../exceptions/effects/exception-effect-registry.service';
import { OneTimeHandler } from '../../exceptions/effects/one-time.handler';
import { ExceptionsService } from '../../exceptions/exceptions.service';
// P3-F C2 (additive) — `ExceptionsService`'s constructor gained a 7th param, `MasteryAccumulatorService`
// (the R6 resolve-hook sibling seam), so THIS module's own narrowed duplicate-provided `ExceptionsService`
// instance (see file header — NOT via `ExceptionsModule` import) now needs it too. `DelegationRatchetModule`
// imports only `[DbModule, SchedulerModule]` — trivial, no cycle risk (the SAME "trivial new import" class
// as `ProgressionModule`'s own C3 addition, header above).
import { DelegationRatchetModule } from '../../meta_progression/delegation-ratchet.module';
// P3-G C7 (additive) — `IsostaticDebtService`, the 8th `ExceptionsService` ctor param (see import note
// above). `BudgetsHorizonModule` exports it; its own imports are already fully covered by this module's
// existing graph.
import { BudgetsHorizonModule } from '../../meta_progression/budgets-horizon.module';
// W1.1-a C6 (additive) — `OnboardingFunnelRepository`, the 9th `ExceptionsService` ctor param (see
// import note above). `@Inject(DB)`-only, trivially cycle-safe — duplicate-provided directly, NOT a new
// module import (no dedicated module exports it, `onboarding-funnel.repository.ts`'s own header).
import { OnboardingFunnelRepository } from '../../onboarding/onboarding-funnel.repository';
// C8 — the 3 annealing BO concerns (`GET annealing-state`/`annealing-compounding-events` +
// `force-settling-end`) need ONLY `AnnealingRepository` (exported by `AnnealingModule`, imported here —
// LEAF-SAFE: neither module imports the other back, `annealing.module.ts`'s own header).
import { AnnealingModule } from '../annealing/annealing.module';
import { CueStackRepository } from './cue-stack.repository';
import { CueStackExecutionRepository } from './cue-stack-execution.repository';
import { CueStackService } from './cue-stack.service';
import { CueStackExecutorFaultInjector } from './cue-stack-executor-fault-injector';
import { CueCascadeExceptionProducer } from './cue-cascade-exception-producer.service';
import { CueStackDisruptionService } from './cue-stack-disruption.service';
import { CueStackExecutionTickService } from './cue-stack-execution-tick.service';
import { CueStackStaleSweepService } from './cue-stack-stale-sweep.service';
import { SlotTypeExecutorRegistry } from './slot-type-executor.registry';
import { DistributionRunExecutor } from './executors/distribution-run.executor';
import { MaintenanceBatchExecutor } from './executors/maintenance-batch.executor';
import { RecruitmentStepExecutor } from './executors/recruitment-step.executor';
import { ExceptionBatchResolutionExecutor } from './executors/exception-batch-resolution.executor';
import { CueStackController } from './cue-stack.controller';
import { CueStackTestController } from './cue-stack-test.controller';
import { NamedSequenceRepository } from './named-sequence.repository';
import { NamedSequenceService } from './named-sequence.service';
import { NamedSequenceController } from './named-sequence.controller';
import { CueAnnealingAdminController } from './cue-annealing-admin.controller';

@Module({
  imports: [
    DbModule,
    SchedulerModule,
    SessionModule,
    ProgressionModule,
    DistributionModule,
    MaintenanceModule,
    RecruitmentModule,
    AnnealingModule,
    // P3-F C2 (additive) — `MasteryAccumulatorService`, the 7th `ExceptionsService` ctor param (see
    // import note above).
    DelegationRatchetModule,
    // P3-G C7 (additive) — `IsostaticDebtService`, the 8th `ExceptionsService` ctor param (see import
    // note above).
    BudgetsHorizonModule,
  ],
  controllers: [
    CueStackController,
    // C5 — the 3 Named Sequences routes (save/list/apply, gated by rule_vocabulary_tier >= 2).
    NamedSequenceController,
    // C8 — the BO surface: 5 grouped endpoints + 2 forces (design §17). Always-on (a real production BO
    // controller, never test-gated).
    CueAnnealingAdminController,
    // C2 — CueStackTestController: in-memory `StackCommittedEvent` capture probe + (C3) execution-tick /
    // stale-sweep / fault-injector test routes. Mounted only in non-production envs
    // (testControllersEnabled(), the SupplyChainTestController precedent).
    ...(testControllersEnabled() ? [CueStackTestController] : []),
  ],
  providers: [
    // C8 — REUSE, never a second audit mechanism (D5/R9.3 — the SAME service every sibling BO controller
    // duplicate-provides, e.g. `supply-chain.module.ts`).
    AdminAuditLogService,
    // Duplicate-provided directly (NOT via ExceptionsModule import — see header note above).
    ExceptionsRepository,
    ExceptionsProjectionService,
    OneTimeHandler,
    LieutenantRepository,
    // W1.1-a C6 (additive) — the 9th ExceptionsService ctor param (see file header + import note above).
    OnboardingFunnelRepository,
    {
      provide: ExceptionEffectRegistry,
      useFactory: (oneTime: OneTimeHandler) => new ExceptionEffectRegistry([oneTime]),
      inject: [OneTimeHandler],
    },
    ExceptionsService,
    // Duplicate-provided directly (NOT via DistributionModule import — RouteLifecycleRepository is not
    // exported there either — see header note above).
    RouteLifecycleRepository,
    CueStackRepository,
    CueStackExecutionRepository,
    CueStackService,
    CueStackExecutorFaultInjector,
    // C3 — the 4 LIVE SlotTypeExecutors + the closed registry built from them (mirrors
    // ExceptionEffectRegistry's own useFactory shape above).
    DistributionRunExecutor,
    MaintenanceBatchExecutor,
    RecruitmentStepExecutor,
    ExceptionBatchResolutionExecutor,
    {
      provide: SlotTypeExecutorRegistry,
      useFactory: (
        distributionRun: DistributionRunExecutor,
        maintenanceBatch: MaintenanceBatchExecutor,
        recruitmentStep: RecruitmentStepExecutor,
        exceptionBatchResolution: ExceptionBatchResolutionExecutor,
      ) =>
        new SlotTypeExecutorRegistry([distributionRun, maintenanceBatch, recruitmentStep, exceptionBatchResolution]),
      inject: [DistributionRunExecutor, MaintenanceBatchExecutor, RecruitmentStepExecutor, ExceptionBatchResolutionExecutor],
    },
    // C4 — the cascade-card producer (§6.2/§6.3, D3: a NEW caller of the ALREADY duplicate-provided
    // ExceptionsRepository/ExceptionsService above, zero `src/exceptions/` edit) + the heat/raid disruption
    // subscriber (§7) that calls it. Both injected into CueStackExecutionTickService above (recovery
    // lookup + in-line failed_collision cascade raise) — Nest resolves the constructor param from THIS
    // provider entry.
    CueCascadeExceptionProducer,
    CueStackDisruptionService,
    CueStackExecutionTickService,
    CueStackStaleSweepService,
    // C5 — Named Sequences (save/list/apply, I4 cap). `ProgressionProjectionService` duplicate-provided
    // (zero-dep, NOT exported by ProgressionModule — see file header). `ProgressionRepository` needs NO
    // duplicate entry — it IS exported by the already-imported `ProgressionModule` (C3's own need).
    ProgressionProjectionService,
    NamedSequenceRepository,
    NamedSequenceService,
  ],
  exports: [CueStackRepository, CueStackService],
})
export class CueStackModule {}

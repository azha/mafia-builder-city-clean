// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C2 (module skeleton — leaf
//             module)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md DD-P2 (§2.2 —
//             module layout) + §12 hazard 1 (the module-cycle wall — `FlagDisciplineModule` is a LEAF:
//             it imports Lieutenant/Exceptions/Session/Scheduler; NOTHING imports it except
//             `CoreLoopsModule` [for the `_test` routes] and `AppModule` [production]).
//             — P3-B C2 — 2026-07-11
//
// `FlagDisciplineModule` — the ch05 Loop 2 leaf module. Imports (all one-directional, zero cycle risk —
// verified against every imported module's OWN `imports:` array this chunk, C0/C2 re-anchor):
//   - `DbModule` — the @Global() DB provider (repository).
//   - `AuthModule` — `JwtAuthGuard` (the player controller's identity bridge, `exceptions.controller.ts`
//     precedent).
//   - `SchedulerModule` — `CityEventBus` (EXPORTED here; `FlagRaisedEvent`/`FlagVerdictEvent` this chunk,
//     the C4 `FLAG_DISCIPLINE_TICK` registration later — pre-wired now, zero import-graph churn at C4).
//   - `LieutenantModule` — pre-wired per the design's DD-P2 module shape; C3 (this chunk) is the FIRST
//     real consumer: every generator injects the EXPORTED `LieutenantRepository` for role resolution
//     (`findRoleHolderForPlayer`, added this chunk) — read-only, `lieutenant` table NEVER ALTERed (D2).
//   - `ExceptionsModule` — pre-wired per DD-P2 (the C4 exhaustion-fallback insert seam; unused by this
//     chunk's own code, added now for the SAME zero-churn reason).
//   - `SessionModule` — NOT in the design's own DD-P2 module-layout sketch verbatim, but REQUIRED to
//     fulfil this SAME chunk's explicit `decisions_made` requirement (D10/sub-decision #6): `SessionService.
//     recordAdvisoryDecision` (session.service.ts:184, the SAME generic single-site seam the HL-card
//     advisory path already uses) is exported by `SessionModule`, not re-exported by `ExceptionsModule` —
//     so this module imports it directly, mirroring `ExceptionsModule`'s OWN identical import (exceptions.
//     module.ts already imports SessionModule for its resolve-path counter seam). SessionModule imports
//     NEITHER Lieutenant/Exceptions/FlagDiscipline (its own header/`session.module.ts` — the C7 module-
//     cycle wall this file's own header preserves) — so this edge is safe, one-directional, zero cycle.
//
// P3-B C3 — the 5 generator services + `RoutineItemGeneratorRegistry` (assembled by a `useFactory`
// provider, the SAME shape `Loop10Module`'s `HlCardProviderRegistry` wiring uses — a duplicate
// `generator` code throws at boot) + `RoutineItemGenerationService` (the generation entry-point,
// EXPORTED so `CoreLoopsModule`'s test controller can drive it directly — the C4 NIGHTLY tick becomes
// the 2nd caller, same method).
//
// P3-B C7 (D14) — registers `FlagDisciplineAdminController` (the 5 production BO routes, ALWAYS-ON,
// plan §C7's literal file path lands it in THIS module — unlike P3-A/04f-A, whose own admin controllers
// sit in their chapter's cross-cutting `core_loops/`/`maintenance/` home) + the NEW local
// `AdminAuditLogService` provider (mirrors `MaintenanceModule`'s OWN "registered locally exactly like
// every sibling BO controller's own module" precedent — the service only needs the `@Global()` `DB`
// token, no extra import). No new module import: `FlagDisciplineAdminController` reads `exception_queue`
// DIRECTLY via the injected `DB` client (the SAME "read the schema table, don't reach for a heavier
// cross-module service" discipline `core-loops-admin.controller.ts` already establishes).
import { Module, type Provider } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { AuthModule } from '../../auth/auth.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { LieutenantModule } from '../../operational/lieutenant/lieutenant.module';
import { ExceptionsModule } from '../../exceptions/exceptions.module';
import { SessionModule } from '../../session/session.module';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { FlagDisciplineService } from './flag-discipline.service';
import { FlagDisciplineController } from './flag-discipline.controller';
import { FlagDisciplineAdminController } from './flag-discipline-admin.controller';
import { RoutineItemGeneratorRegistry, type RoutineItemGenerator } from './generators/routine-item-generator';
import { CourierSchedulingGenerator } from './generators/courier-scheduling.generator';
import { PrecursorOrderGenerator } from './generators/precursor-order.generator';
import { FrontShopReconciliationGenerator } from './generators/front-shop-reconciliation.generator';
import { StashReorderGenerator } from './generators/stash-reorder.generator';
import { LekRotationGenerator } from './generators/lek-rotation.generator';
import { RoutineItemGenerationService } from './routine-item-generation.service';
import { RoutineItemAutoConfirmService } from './routine-item-auto-confirm.service';
import { FlagExhaustionFallbackService } from './flag-exhaustion-fallback.service';
import { FlagDisciplineTickService } from './flag-discipline-tick.service';
import { FlagWeeklyResetTickService } from './flag-weekly-reset-tick.service';
import { FlagConvergenceService } from './flag-convergence.service';

// The generator-registry provider (P3-B C3) — mirrors `Loop10Module`'s `HlCardProviderRegistry` /
// `LieutenantModule`'s `BindingRegistry` `useFactory` convention EXACTLY: inject each of the 5 concrete
// generator services, assemble the closed array, construct the registry (duplicate-code throw at boot).
const ROUTINE_ITEM_GENERATOR_REGISTRY_PROVIDER: Provider = {
  provide: RoutineItemGeneratorRegistry,
  useFactory: (
    courierScheduling: CourierSchedulingGenerator,
    precursorOrder: PrecursorOrderGenerator,
    frontShopReconciliation: FrontShopReconciliationGenerator,
    stashReorder: StashReorderGenerator,
    lekRotation: LekRotationGenerator,
  ): RoutineItemGeneratorRegistry =>
    new RoutineItemGeneratorRegistry([
      courierScheduling,
      precursorOrder,
      frontShopReconciliation,
      stashReorder,
      lekRotation,
    ] as RoutineItemGenerator[]),
  inject: [
    CourierSchedulingGenerator,
    PrecursorOrderGenerator,
    FrontShopReconciliationGenerator,
    StashReorderGenerator,
    LekRotationGenerator,
  ],
};

// FlagDisciplineAdminController (C7, D14): ALWAYS-ON BO routes (real production surface — mirrors
// `MaintenanceAdminController`/`CoreLoopsAdminController`, never conditional on `testControllersEnabled()`).
const controllers = [FlagDisciplineController, FlagDisciplineAdminController];

@Module({
  imports: [DbModule, AuthModule, SchedulerModule, LieutenantModule, ExceptionsModule, SessionModule],
  controllers,
  providers: [
    FlagDisciplineRepository,
    FlagDisciplineService,
    CourierSchedulingGenerator,
    PrecursorOrderGenerator,
    FrontShopReconciliationGenerator,
    StashReorderGenerator,
    LekRotationGenerator,
    ROUTINE_ITEM_GENERATOR_REGISTRY_PROVIDER,
    RoutineItemGenerationService,
    // P3-B C4 (D7/D9) — the NIGHTLY tick's 3 remaining collaborators + the orchestrator itself.
    // `FlagExhaustionFallbackService` is what actually USES the pre-wired `ExceptionsModule` import
    // above (unused by C2/C3's own code — see this module's header note on why it was wired early).
    RoutineItemAutoConfirmService,
    FlagExhaustionFallbackService,
    FlagDisciplineTickService,
    // P3-B C5 (D8 weekly reset + D12 convergence/frequency-band computation).
    FlagWeeklyResetTickService,
    FlagConvergenceService,
    // P3-B C7 (D14) — the ch09 `admin_audit_log` wrapper (FIRST wired by 04e-B C8, `admin-audit-log.
    // service.ts`'s own header), registered locally in THIS module exactly like every sibling BO
    // controller's own module (MaintenanceModule/LiveOpsModule precedent — the service only needs the
    // `@Global()` DB token).
    AdminAuditLogService,
  ],
  exports: [
    FlagDisciplineRepository,
    FlagDisciplineService,
    RoutineItemGenerationService,
    FlagDisciplineTickService,
    FlagWeeklyResetTickService,
    FlagConvergenceService,
  ],
})
export class FlagDisciplineModule {}

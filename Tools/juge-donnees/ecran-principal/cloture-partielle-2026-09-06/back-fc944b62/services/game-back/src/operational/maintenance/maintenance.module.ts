// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C1 (DI shell — the tunables
//             registry-first chunk) + C2 (Phase-progression engine — MAINTENANCE_PHASE_TICK NIGHTLY/21 +
//             the pure D5 output-fold service + the repository + the anchor-set/run-phase-tick test seam)
//             + C3 (Player actions — MaintenanceService + MaintenanceController)
//             Architecture mirror: services/game-back/src/operational/liveops/live-ops.module.ts (the C0
//             empty-scaffold + conditional-test-controller-mount pattern) +
//             services/game-back/src/operational/internal_affairs/internal-affairs.module.ts (the
//             SchedulerModule import + tick-service provider shape C2 extends) +
//             services/game-back/src/operational/enforcement/enforcement.module.ts (the
//             RepairController/RepairService provider+controller shape C3 mirrors)
//             — 04f-A C1 — 2026-07-10 | C2 extension — 2026-07-10 | C3 extension — 2026-07-10
//
// `MaintenanceModule` — the 04f-A Building Maintenance & Decay slice (G10+G20+G26). This is the 1st of two
// 04f sub-lots (`A → B`, B = recruitment quests G11, out of scope here).
//
// C1 shipped the data-model + tunables foundation. C2 ADDED the phase-progression engine:
//   - MaintenancePhaseService (pure D1/D5/D10 derivation — the sibling of AshPurityService/GrowYieldService,
//     NO DB access) — EXPORTED so ProductionModule/GrowModule can inject it at their own yield-fold sites
//     (production-cook-advance.service.ts:178 + the grow-harvest equivalent) and RealEstateModule can
//     inject it for the R2.2 LapsePhaseBucket projection; C3's MaintenanceService also injects it (the D10
//     pricing call site — maintenanceScheduleCostCents).
//   - MaintenanceRepository (the D1 anchor reads/writes — the NIGHTLY/21 batch input + the write-only-on-
//     change persistence + D13 job completion) — EXPORTED so GrowModule's yield-fold site (which does not
//     already JOIN building_operational_state, unlike cook-advance) can batch-read anchors (mirrors
//     EnforcementModule exporting RaidRepository for RealEstateProjectionService's own cross-module read).
//   - MaintenancePhaseTickService — registers MAINTENANCE_PHASE_TICK at NIGHTLY/21 at boot (imports
//     SchedulerModule for CitySimSchedulerService.registerSystem + CityEventBus, the SAME import
//     IATickService uses).
//   - MaintenanceTestController EXTENDED with anchor-set / run-phase-tick (DD-M4 — drives the REAL
//     registered tick method with a constructed ctx, the insurance `run-nightly-tick` precedent).
//
// C3 ADDS the player schedule/emergency/mass-schedule actions:
//   - MaintenanceService (scheduleMaintenance / applyMassSchedule — validate → D10 price → guarded debit →
//     arm 1-day job → event → the global IdempotencyInterceptor REUSE, the RepairService shape) —
//     EXPORTED so a later chunk (C7's `FacilityManagerBinding`, design §8 — the auto-schedule DSL action)
//     can call the SAME guarded action the player endpoint runs, never re-implementing the debit/arm.
//   - MaintenanceController — the 2 player-facing endpoints (POST .../schedule-maintenance +
//     POST .../mass-schedule-maintenance), registered UNCONDITIONALLY (unlike MaintenanceTestController).
//
// C4 ADDS the equipment-failure rolls (D11):
//   - EquipmentFailureService (rollWeeklyForPlayer / rollCriticalDailyForBuildings + the atomic-5 minus the
//     card) — EXPORTED so the future Exception producer (C5) can subscribe to `CityEventBus.
//     onEquipmentFailed` without needing this service directly (event-decoupled, the raid-exception
//     precedent), but exported anyway for BO/admin (C8) to drive `force-failure`.
//   - EquipmentFailureWeeklyTickService — registers EQUIPMENT_FAILURE_WEEKLY_TICK at WEEKLY/11 at boot.
//   - MaintenancePhaseTickService (NIGHTLY/21) now ALSO injects EquipmentFailureService (the critical-daily
//     roll wired into the SAME tick, design §4 step 4 — not a new tick).
//   - MaintenanceTestController EXTENDED with run-weekly-roll / force-week-epoch (DD-M4).
//
// C5 ADDS the exception-card producer + 4 repair handlers (they live in `exceptions/`, ADDITIVE — see
// exceptions.module.ts) + the D4 periodic re-emission call MaintenancePhaseTickService now makes each NIGHTLY
// tick. That call needs `EquipmentFailureCardService` — DUPLICATE-REGISTERED here (+ its 2 DB-only
// dependencies: `ExceptionsRepository` + `EquipmentFailureExceptionRepository`) rather than imported via
// `ExceptionsModule`: `ExceptionsModule` imports `LieutenantModule`, which imports `ProductionModule`, which
// imports `MaintenanceModule` (for `MaintenancePhaseService` — see the C2 export note above) — so
// `MaintenanceModule` importing `ExceptionsModule` would CLOSE that cycle. All 3 duplicate-registered providers
// depend ONLY on the globally-available DB provider (@Global() DbModule), so a second instance in THIS
// module's own DI container is harmless (stateless — no `OnModuleInit` side effect, unlike
// `EquipmentFailureExceptionProducerService`, which stays SINGLY-registered in `ExceptionsModule` to avoid a
// double bus-subscription). This is the EXACT `ExceptionsRepository`/TD-031 precedent
// (`lieutenant.module.ts:311-314` — "ExceptionsModule already imports LieutenantModule, so importing
// ExceptionsModule here would create a circular dep... injected DIRECTLY"), one hop further down the graph.
//
// C5 also EDITS `real-estate.repository.ts`'s `isBlockFreeForPlayer` (ADDITIVE — excludes a 'demolished'
// building from the block-occupancy check, the DEMOLISH_REPLACE "block freed" contract) — that file lives
// outside this module and needed no DI wiring change.
//
// C8 ADDS the BO surface (D12): `MaintenanceAdminController` (5 game-back admin endpoints — REUSE the
// DD-C6/R12b BO topology `LiveOpsAdminController`/`PoliticalAdminController` established: `requireStaffRole`
// + `f3_deferred` markers + `AdminAuditLogService.emit` on every mutation) — registered UNCONDITIONALLY
// (real production BO routes, mirrors `MaintenanceController`'s own always-on registration), injecting
// `MaintenanceRepository`/`MaintenancePhaseService`/`EquipmentFailureService` (all ALREADY providers here)
// PLUS the NEW `AdminAuditLogService` provider (the SAME `db/admin-audit-log.service.ts` singleton every
// sibling BO controller registers locally — @Global() DbModule makes this safe, no cross-module import).
import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import { EquipmentFailureExceptionRepository } from '../../exceptions/equipment-failure-exception.repository';
import { EquipmentFailureCardService } from '../../exceptions/equipment-failure-card.service';
// 04f-A C6 (D7) — HeatContribModule EXPORTS HeatContribService (the emitMaintenanceNeglectHeat/
// emitEquipmentRepairHeat wrappers MaintenanceHeatService calls). One-directional: HeatContribModule only
// imports SchedulerModule — no cycle back to MaintenanceModule.
import { HeatContribModule } from '../heat_contrib/heat-contrib.module';
// 04f-A C8 (D12) — the FIRST-consumer ch09 admin_audit_log wrapper (04e-B C8 precedent) — registered
// locally here exactly like every sibling BO controller's own module (LiveOpsModule, PoliticalModule).
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { MaintenanceTestController } from './maintenance-test.controller';
import { MaintenanceAdminController } from './maintenance-admin.controller';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceService } from './maintenance.service';
import { MaintenancePhaseService } from './maintenance-phase.service';
import { MaintenancePhaseTickService } from './maintenance-phase-tick.service';
import { EquipmentFailureService } from './equipment-failure.service';
import { EquipmentFailureWeeklyTickService } from './equipment-failure-weekly-tick.service';
import { MaintenanceHeatService } from './maintenance-heat.service';

// MaintenanceAdminController (C8): always-on BO routes (real production surface, D12). MaintenanceTestController:
// test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  MaintenanceController,
  MaintenanceAdminController,
  ...(testControllersEnabled() ? [MaintenanceTestController] : []),
];

@Module({
  // SchedulerModule EXPORTS CitySimSchedulerService (MaintenancePhaseTickService/
  // EquipmentFailureWeeklyTickService.registerSystem at NIGHTLY/21 + WEEKLY/11) + CityEventBus
  // (emitMaintenancePhaseChanged / emitMaintenanceScheduled / emitEquipmentFailed) — the SAME import every
  // tick-hook / event-producer module uses.
  imports: [SchedulerModule, HeatContribModule],
  controllers,
  providers: [
    MaintenanceRepository,
    MaintenancePhaseService,
    MaintenancePhaseTickService,
    MaintenanceService,
    EquipmentFailureService,
    EquipmentFailureWeeklyTickService,
    // 04f-A C6 (D7) — the heat-coupling orchestration MaintenancePhaseTickService (nightly repair spike) +
    // EquipmentFailureWeeklyTickService (weekly neglect additive) both inject.
    MaintenanceHeatService,
    // 04f-A C5 (D4) — duplicate-registered to avoid the ExceptionsModule circular-dependency (see the header
    // comment above). MaintenancePhaseTickService injects EquipmentFailureCardService for the re-emission call.
    ExceptionsRepository,
    EquipmentFailureExceptionRepository,
    EquipmentFailureCardService,
    // 04f-A C8 (D12) — MaintenanceAdminController's audit-log dependency.
    AdminAuditLogService,
  ],
  // EXPORTED for cross-module consumers (C2): ProductionModule/GrowModule inject MaintenancePhaseService
  // at their yield-fold sites; GrowModule ALSO injects MaintenanceRepository (the batched anchor lookup,
  // since GROW_ADVANCE's stage-walk UPDATE does not already JOIN building_operational_state);
  // RealEstateModule injects MaintenancePhaseService for the R2.2 projection fields. (C3) MaintenanceService
  // EXPORTED for the future FacilityManagerBinding (C7) to REUSE the SAME guarded schedule action. (C4)
  // EquipmentFailureService EXPORTED for the future admin controller (C8, force-failure). One-directional:
  // MaintenanceModule does NOT import any of these back → no cycle.
  exports: [MaintenanceRepository, MaintenancePhaseService, MaintenanceService, EquipmentFailureService],
})
export class MaintenanceModule {}

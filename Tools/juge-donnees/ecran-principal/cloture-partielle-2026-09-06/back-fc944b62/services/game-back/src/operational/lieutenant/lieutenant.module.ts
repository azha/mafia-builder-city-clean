// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T4/§6 (the lieutenant
//             entity module — recruit/attach/validate; imports the DSL engine + auth) +
//             composition_overview.md §Cross-cutting (the operational modular-monolith wiring)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// `LieutenantModule` — wires the Phase-6 vector #6 slice-1 lieutenant entity into the game-back modular monolith.
//   - T4 ships the recruit / attach-script / validate actions (LieutenantController + LieutenantService +
//     LieutenantRepository): POST /v1/lieutenants [recruit a COOK lieutenant], POST /v1/lieutenants/:id/behavior-script
//     [attach DSL source → parse+compile+store], POST .../validate [dry-run].
//   - T5 (COOK binding) ships CookBindingService — the per-archetype adapter (resolve the cook_idle/heat signals + map
//     EXECUTE_DEFAULT → ProductionService.startCook).
//   - T6 (the LIEUTENANT_TICK delegation tick) ships LieutenantTickService — the vector's ONE new tick, registered into
//     the CitySimScheduler at {MINUTE/19} at boot (LAST in the minute band, after GROW_ADVANCE/18), REPLACING the no-op
//     placeholder there. Each minute it selects the player's delegated valid-script lieutenants and, per-lieutenant
//     (isolated try/catch), builds the snapshot (the COOK binding T5), resolves the stored IR (the DSL executor T3), and
//     applies the token (delegation_paused mirrors PAUSE_OPS, written on transition; EXECUTE_DEFAULT restarts the cook).
//     Organically a no-op for a player with no delegated lieutenant (byte-identical no-regression).
//   - T7 (the band projection + GET endpoint) ships LieutenantProjectionService + GET /v1/lieutenants/:id — the
//     player-facing qualitative band surface (R2.2 inverted — archetype/granted_role/mode + op_state_band/rule_count_band
//     bands + the player-authored script_source; NO raw scalars). EXPORTED so a future roster/detail surface can reuse it.
//
// Imports DslModule (EXPORTS DslParserService + DslCompilerService — the attach/validate parse+compile pipeline; T6 ALSO
// consumes DslExecutorService.resolve from it for the delegation tick) + AuthModule (EXPORTS JwtAuthGuard — the
// controller's player resolution, the SAME import the money_holding / grow / distribution controllers use) +
// ProductionModule (T5 — EXPORTS ProductionService: the COOK binding resolves cook_idle via
// ProductionService.hasCookInProgress + restarts the cook via ProductionService.startCook; the repository stays
// module-private, so the binding consumes the SERVICE boundary, not a duplicated cook-session query) + SchedulerModule
// (T6 — EXPORTS CitySimSchedulerService: the delegation tick-hook calls registerSystem on it at boot; the SAME import the
// money_holding / grow / distribution modules use for their tick-hooks). Depends on the @Global() DbModule (the
// repository/controller inject the DB provider).
// Idempotency is handled by the global IdempotencyInterceptor (REUSE — registered in AppModule). R9.3: 09 = source of
// truth (no schema change — T0 landed the lieutenant + behavior_script delegation/DSL subset, migration 0026).
//
// EXPORTS LieutenantService so T6's delegation tick (which selects + drives the player's delegated lieutenants) can
// consume it. The owned-operational-building gate lives in LieutenantRepository (the SAME join ProductionRepository uses)
// rather than a cross-module inject — the module owns its own reads (the money_holding precedent).

import { Module, type Provider } from '@nestjs/common';

import { DslModule } from '../../dsl/dsl.module';
import { AuthModule } from '../../auth/auth.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { ProductionModule } from '../production/production.module';
import { EnforcementModule } from '../enforcement/enforcement.module';
import { MoneyHoldingModule } from '../money_holding/money-holding.module';
import { DistributionModule } from '../distribution/distribution.module';
import { LaunderingModule } from '../laundering/laundering.module';
import { SellingModule } from '../selling/selling.module';
import { ReputationModule } from '../reputation/reputation.module';
import { LieutenantController } from './lieutenant.controller';
import { LieutenantService } from './lieutenant.service';
import { LieutenantRepository } from './lieutenant.repository';
import { LieutenantProjectionService } from './lieutenant.projection.service';
import { CookBindingService } from './cook-binding';
import { SecurityBindingService } from './security-binding';
import { BookkeeperBindingService } from './bookkeeper-binding';
import { LogisticsBindingService } from './logistics-binding';
import { LaunderingBindingService } from './laundering-binding';
import { DistributionBindingService } from './distribution-binding';
// 04b-B C3 DD-MUSCLE: MuscleBindingService + CombatModule (exports CombatService) + RivalAiModule
// (exports RegimeSwitchingService). LieutenantModule → CombatModule → RivalAiModule: no circular dep.
import { MuscleBindingService } from './muscle-binding';
import { CombatModule } from '../conflict/combat/combat.module';
import { RivalAiModule } from '../conflict/rival/rival-ai.module';
// 04b-C C3 DD-INTEL: IntelligenceBindingService + InformationWarfareModule (exports InfoWarTunables).
// RivalProjectionService is exported by RivalAiModule (already imported above). No circular dep:
// LieutenantModule → RivalAiModule → no LieutenantModule in that chain.
import { IntelligenceBindingService } from './intelligence-binding';
import { InformationWarfareModule } from '../conflict/infowar/infowar.module';
// 04f-A C7 DD8: FacilityManagerBindingService + MaintenanceModule (exports MaintenanceRepository +
// MaintenancePhaseService + MaintenanceService — the C3 guarded schedule action this binding REUSEs, D9).
// MaintenanceModule imports ONLY SchedulerModule + HeatContribModule (no LieutenantModule/ProductionModule in
// its own import graph) — LieutenantModule → MaintenanceModule is strictly one-directional, no circular dep.
import { FacilityManagerBindingService } from './facility-manager-binding';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { LieutenantTickService } from './lieutenant-tick.service';
import { BindingRegistry } from './binding-registry.service';
// P3-A C5 (D7/D8) — Loop10Module EXPORTS StructuralDecisionGovernorService: recruit / reassign /
// attachScript(wholesale) / autonomyDecision(raise_ceiling) are 4 of the 6 LIVE structural sites
// (LieutenantController wraps them via governor.commit). ONE-WAY: Loop10Module imports
// SessionModule/ProgressionModule only — no cycle back to LieutenantModule.
import { Loop10Module } from '../../progression/loop10/loop10.module';
// P3-F C6 — CategoryDelegationGuardModule EXPORTS CategoryDelegationGuard (LieutenantController's
// LIEUTENANT_HIRING recruit/reassign guard sites). A pure leaf (imports only the @Global() DbModule) — no
// circular dependency (DelegationRatchetModule already imports LieutenantModule for attachScript REUSE;
// importing DelegationRatchetModule itself back HERE would cycle — this leaf sidesteps that entirely).
import { CategoryDelegationGuardModule } from '../../meta_progression/category-delegation-guard.module';
import { AutonomyCeilingRepository } from './autonomy/autonomy-ceiling.repository';
import { AutonomyCeilingService } from './autonomy/autonomy-ceiling.service';
import { AutonomyReportRepository } from './autonomy/autonomy-report.repository';
import { AutonomyReportProducer } from './autonomy/autonomy-report.producer';
import { AutonomyReportsService } from './autonomy/autonomy-reports.service';
import { AutonomyReportsController } from './autonomy/autonomy-reports.controller';
import { SignalDriftRepository } from './signal-drift/signal-drift.repository';
import { SignalDriftService } from './signal-drift/signal-drift.service';
import { StandingOrderRepository } from './standing-order/standing-order.repository';
import { StandingOrderService } from './standing-order/standing-order.service';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
// P3-B C6 (D12) — FlagDisciplineRepository + FlagConvergenceService injected DIRECTLY (NOT via
// FlagDisciplineModule — FlagDisciplineModule already imports LieutenantModule, so importing it HERE
// would create a circular dep, mirroring the ExceptionsRepository precedent immediately above). Both
// classes have a trivial, cycle-free dependency shape (FlagDisciplineRepository needs only @Inject(DB);
// FlagConvergenceService needs only FlagDisciplineRepository) — consumed by LieutenantProjectionService
// for the +trust_budget_bucket/+flag_frequency_band bands (design §7/§8 D12).
import { FlagDisciplineRepository } from '../../core_loops/flag_discipline/flag-discipline.repository';
import { FlagConvergenceService } from '../../core_loops/flag_discipline/flag-convergence.service';
import {
  AutonomyOptionRegistry,
  type AutonomyOptionHandler,
} from './autonomy/option-handlers/autonomy-option-handler';
import { CookNowHandler } from './autonomy/option-handlers/cook-now.handler';
import { CookRefineHandler } from './autonomy/option-handlers/cook-refine.handler';
import { RepairNowHandler } from './autonomy/option-handlers/repair-now.handler';
import { DepositMaxHandler } from './autonomy/option-handlers/deposit-max.handler';
import { DepositReserveHandler } from './autonomy/option-handlers/deposit-reserve.handler';
import { DispatchNowHandler } from './autonomy/option-handlers/dispatch-now.handler';
import { InjectBaselineHandler } from './autonomy/option-handlers/inject-baseline.handler';
import { InjectConservativeHandler } from './autonomy/option-handlers/inject-conservative.handler';
import { CollectNowHandler } from './autonomy/option-handlers/collect-now.handler';
import { DeferHandler } from './autonomy/option-handlers/defer.handler';
import { HoldHandler } from './autonomy/option-handlers/hold.handler';
import { LetRideHandler } from './autonomy/option-handlers/let-ride.handler';
import type { ArchetypeBinding } from './archetype-binding';

// The per-archetype binding registry provider — assembled by a FACTORY that injects every archetype binding service and
// passes them to the BindingRegistry as an ArchetypeBinding[]. This is the SINGLE place a new binding is wired: T2–T4 add
// their binding to BOTH the module `providers` (so it is constructed) AND this factory's `inject` list + lambda arg (so it
// joins the array) — one line each. (NestJS 10.4.x has NO multi-provider support — a `multi: true` token is silently
// ignored — so the array is assembled explicitly here; the injected services are the SAME singletons the bindings are, so
// there is no duplicate instance.) The registry throws at boot on a duplicate archetype (a loud misconfiguration).
const BINDING_REGISTRY_PROVIDER: Provider = {
  provide: BindingRegistry,
  useFactory: (
    cook: CookBindingService,
    security: SecurityBindingService,
    bookkeeper: BookkeeperBindingService,
    logistics: LogisticsBindingService,
    laundering: LaunderingBindingService,
    distribution: DistributionBindingService,
    // 04b-B C3 DD-MUSCLE: the 7th archetype binding (the SINGLE wiring point — one line each).
    muscle: MuscleBindingService,
    // 04b-C C3 DD-INTEL: the 8th archetype binding (the SINGLE wiring point — one line each).
    intelligence: IntelligenceBindingService,
    // 04f-A C7 DD8: the 9th archetype binding (the SINGLE wiring point — one line each).
    facilityManager: FacilityManagerBindingService,
  ): BindingRegistry =>
    new BindingRegistry([
      cook,
      security,
      bookkeeper,
      logistics,
      laundering,
      distribution,
      muscle, // 04b-B C3 DD-MUSCLE: registered on the live registry (registry throws on duplicate at boot)
      intelligence, // 04b-C C3 DD-INTEL: registered on the live registry (registry throws on duplicate at boot)
      facilityManager, // 04f-A C7 DD8: registered on the live registry (registry throws on duplicate at boot)
    ] as ArchetypeBinding[]),
  inject: [
    CookBindingService,
    SecurityBindingService,
    BookkeeperBindingService,
    LogisticsBindingService,
    LaunderingBindingService,
    DistributionBindingService,
    MuscleBindingService, // 04b-B C3 DD-MUSCLE: injected alongside the other 6 bindings
    IntelligenceBindingService, // 04b-C C3 DD-INTEL: injected as the 8th binding
    FacilityManagerBindingService, // 04f-A C7 DD8: injected as the 9th binding
  ],
};

// PHASE-19 L1a T6 — the per-EffectKind autonomy option-handler registry provider. MIRRORS BINDING_REGISTRY_PROVIDER (and
// the exceptions.module.ts ExceptionEffectRegistry useFactory): a FACTORY injects every option handler and passes them to
// AutonomyOptionRegistry as an AutonomyOptionHandler[] (NestJS 10.4.x has no multi-provider support — the array is
// assembled explicitly here; the injected services are the SAME singletons, no duplicate instance). The registry throws at
// boot on a duplicate effectKind (a loud misconfiguration); resolve dispatches the picked option's effect_kind through it.
const AUTONOMY_OPTION_REGISTRY_PROVIDER: Provider = {
  provide: AutonomyOptionRegistry,
  useFactory: (
    cookNow: CookNowHandler,
    cookRefine: CookRefineHandler,
    repairNow: RepairNowHandler,
    depositMax: DepositMaxHandler,
    depositReserve: DepositReserveHandler,
    dispatchNow: DispatchNowHandler,
    injectBaseline: InjectBaselineHandler,
    injectConservative: InjectConservativeHandler,
    collectNow: CollectNowHandler,
    defer: DeferHandler,
    hold: HoldHandler,
    letRide: LetRideHandler,
  ): AutonomyOptionRegistry =>
    new AutonomyOptionRegistry([
      cookNow,
      cookRefine,
      repairNow,
      depositMax,
      depositReserve,
      dispatchNow,
      injectBaseline,
      injectConservative,
      collectNow,
      defer,
      hold,
      letRide,
    ] as AutonomyOptionHandler[]),
  inject: [
    CookNowHandler,
    CookRefineHandler,
    RepairNowHandler,
    DepositMaxHandler,
    DepositReserveHandler,
    DispatchNowHandler,
    InjectBaselineHandler,
    InjectConservativeHandler,
    CollectNowHandler,
    DeferHandler,
    HoldHandler,
    LetRideHandler,
  ],
};

@Module({
  // EnforcementModule (T2 — EXPORTS RepairService: the SECURITY binding maps EXECUTE_DEFAULT → RepairService.repair, the
  // SAME guarded repair action the player's POST /repair runs; consumed at the SERVICE boundary, never re-implemented).
  // MoneyHoldingModule (T3 — EXPORTS MoneyHoldingService: the BOOKKEEPER binding maps EXECUTE_DEFAULT →
  // MoneyHoldingService.deposit, the SAME guarded wallet→held transfer the player's POST /deposit-cash runs; consumed at
  // the SERVICE boundary, never re-implemented — capacityCentsForTier is imported from money-holding-tunables directly).
  // DistributionModule (T4 — EXPORTS DistributionService: the LOGISTICS binding maps EXECUTE_DEFAULT →
  // DistributionService.dispatch, the SAME guarded source→target courier dispatch the player's POST /dispatch runs;
  // consumed at the SERVICE boundary, never re-implemented — the roster-cap/vehicle gates + the source decrement are the
  // dispatch's own, an over-capacity dispatch surfaces a benign 409 the binding catches).
  // LaunderingModule (Phase-8 T1 — EXPORTS LaunderingService: the LAUNDERING binding maps EXECUTE_DEFAULT →
  // LaunderingService.inject, the SAME guarded safehouse→front-shop-Stage-1-node injection the player's POST /inject runs;
  // consumed at the SERVICE boundary, never re-implemented — the System-9 slot drain + the node capacity guard + the
  // System-7 deviation feed are the inject's own, a node-full / fill-changed conflict surfaces a benign 409 the binding
  // catches. frontShopLegitBaselineCents is imported from laundering-tunables directly for the conservative cap).
  // SellingModule (Phase-8 T2 — EXPORTS SellingService: the DISTRIBUTION binding maps EXECUTE_DEFAULT →
  // SellingService.collect, the SAME guarded dealer-float→safehouse runner pickup the player's POST
  // /v1/operational/dealer/:id/collect runs; consumed at the SERVICE boundary, never re-implemented — the empty-float
  // guard + the System-9 exact-headroom saturation guard + the atomic float-zero are the collect's own (all-or-nothing,
  // NO amount), so an empty-float / safehouse-full / concurrent-sell-race conflict surfaces a benign 409 the binding catches).
  // ReputationModule (D2 R6 — EXPORTS LekMemoryService: the DISTRIBUTION binding reads
  // LekMemoryService.getPositionMemoryAggregate for the dealer's lek tile to apply the Lek↔lieutenant performance
  // multiplier (strong corner → over-performs; stigmatized → under-performs; neutral/no-Lek → 1.0 exactly).
  // ONE-DIRECTIONAL: LieutenantModule imports ReputationModule, NOT the reverse — no circular dep, no forwardRef.
  // reputation_mechanics.md:135 "lieutenant inheriting a strong corner outperforms baseline; on stigmatised corner
  // underperforms").
  imports: [
    DslModule,
    AuthModule,
    ProductionModule,
    SchedulerModule,
    EnforcementModule,
    MoneyHoldingModule,
    DistributionModule,
    LaunderingModule,
    SellingModule,
    ReputationModule,
    // 04b-B C3 DD-MUSCLE: CombatModule exports CombatService (requestAssault) consumed by
    // MuscleBindingService. RivalAiModule is imported separately to make RegimeSwitchingService
    // (§13 band read) available in this module. No circular dependency:
    // LieutenantModule → CombatModule → RivalAiModule (no LieutenantModule in that chain).
    CombatModule,
    // RivalAiModule (exports RegimeSwitchingService — consumed by MuscleBindingService.buildSnapshot
    // for the §13 getRegimePressureBand server↔server read, P6 safe).
    // Also exports RivalProjectionService (consumed by IntelligenceBindingService.buildSnapshot
    // for the §13 toClientView server↔server read — the P6 wall: INTELLIGENCE reads the BANDED
    // output of toClientView, NOT rival_state directly).
    // ONE-DIRECTIONAL: RivalAiModule does NOT import LieutenantModule — no circular dep.
    RivalAiModule,
    // InformationWarfareModule (exports InfoWarTunables — consumed by IntelligenceBindingService
    // for OQ-C2 seed prefix reads via getter. NEVER inlined. C3 reads the prefix to confirm
    // injection works; C9 uses it to seed the surveillance-op detection draw).
    // No circular dependency: InformationWarfareModule does NOT import LieutenantModule.
    InformationWarfareModule,
    // MaintenanceModule (04f-A C7 DD8 — EXPORTS MaintenanceRepository + MaintenancePhaseService +
    // MaintenanceService: FacilityManagerBindingService reads the D1 anchor batch + derives days-until-due +
    // calls the SAME guarded scheduleMaintenance the player's own POST endpoint runs, C3 REUSE).
    MaintenanceModule,
    Loop10Module,
    CategoryDelegationGuardModule,
  ],
  controllers: [LieutenantController, AutonomyReportsController],
  providers: [
    LieutenantService,
    LieutenantRepository,
    LieutenantProjectionService,
    CookBindingService,
    SecurityBindingService,
    BookkeeperBindingService,
    LogisticsBindingService,
    LaunderingBindingService,
    DistributionBindingService,
    // 04b-B C3 DD-MUSCLE: the 7th archetype binding (the single wiring point — provider + inject + array, one line each).
    MuscleBindingService,
    // 04b-C C3 DD-INTEL: the 8th archetype binding (the single wiring point — provider + inject + array, one line each).
    IntelligenceBindingService,
    // 04f-A C7 DD8: the 9th archetype binding (the single wiring point — provider + inject + array, one line each).
    FacilityManagerBindingService,
    // The per-archetype binding registry (Phase-7 generalization — the tick + recruit dispatch through it). Assembled by a
    // factory that injects each binding service (see BINDING_REGISTRY_PROVIDER above). Phase-7 registered COOK + SECURITY +
    // BOOKKEEPER + LOGISTICS; Phase-8 T1 added LAUNDERING; Phase-8 T2 added DISTRIBUTION; 04b-B C3 added MUSCLE (the 7th);
    // 04b-C C3 added INTELLIGENCE (the 8th); 04f-A C7 added FACILITY_MANAGER (the 9th). Registry now accepts
    // COOK|...|MUSCLE|INTELLIGENCE|FACILITY_MANAGER + 422s garbage archetypes.
    BINDING_REGISTRY_PROVIDER,
    LieutenantTickService,
    // PHASE-19 L1a (Autonomy Ceiling) — the per-lieutenant delegation budget state (repository + the gate service the
    // LIEUTENANT_TICK consults: refreshIfDue + checkAndConsume + refund). AutonomyCeilingService is EXPORTED below so the
    // L1a T5/T6 report producer + resolve surface (and the T7 projection) can reuse it. The repository stays module-private.
    AutonomyCeilingRepository,
    AutonomyCeilingService,
    // PHASE-19 L1a T5 — the decoupled refusal → autonomy_reports producer (subscribes to AutonomyCeilingRefusalEvent on the
    // CityEventBus, dedups per (cycle, category), appends an issue with the per-archetype A/B options) + its dedicated
    // autonomy_reports repository (kept SEPARATE from the ceiling-state repo — one-responsibility-per-file). The producer is
    // a pure subscriber (OnModuleInit) — NOT exported (nothing injects it); the repository stays module-private.
    AutonomyReportRepository,
    AutonomyReportProducer,
    // PHASE-19 L1a T6 — the player-facing resolve surface: the 12 per-EffectKind option handlers (each runs the SAME
    // operational action its matching archetype binding's applyExecuteDefault takes), the AutonomyOptionRegistry that
    // dispatches the picked option's effect_kind to its handler (assembled by AUTONOMY_OPTION_REGISTRY_PROVIDER above),
    // and the AutonomyReportsService the AutonomyReportsController calls. The operational services the handlers consume are
    // available via the already-imported Production/Enforcement/MoneyHolding/Distribution/Laundering/Selling modules.
    CookNowHandler,
    CookRefineHandler,
    RepairNowHandler,
    DepositMaxHandler,
    DepositReserveHandler,
    DispatchNowHandler,
    InjectBaselineHandler,
    InjectConservativeHandler,
    CollectNowHandler,
    DeferHandler,
    HoldHandler,
    LetRideHandler,
    AUTONOMY_OPTION_REGISTRY_PROVIDER,
    AutonomyReportsService,
    // PHASE-22 L2a (Signal Drift) — the per-lieutenant cue-reliability state (repository + the measurement service the
    // LIEUTENANT_TICK consults: observeOutcome after each acting EXECUTE_DEFAULT). SignalDriftService is EXPORTED below so
    // the L2a T4 cue-band projection (and the T5 decision surface) can reuse it. The repository stays module-private.
    SignalDriftRepository,
    SignalDriftService,
    // PHASE-25 L3 (Standing Order Expiry) — the standing-order runtime injection surface (repository + the service the
    // LIEUTENANT_TICK consults: getActiveRule on the acting path before the executor resolves, + the POST endpoint's issue).
    // StandingOrderService is EXPORTED below so the T3 evaluate-lifecycle + the T5 projection can reuse it. The repository
    // stays module-private. StandingOrderService consumes the DSL parser/compiler (DslModule, already imported for attach).
    StandingOrderRepository,
    StandingOrderService,
    // D1 C7 — TD-031 REQUEST_PLAYER_INPUT sink: ExceptionsRepository injected DIRECTLY (NOT via ExceptionsModule —
    // ExceptionsModule already imports LieutenantModule, so importing ExceptionsModule here would create a circular dep).
    // ExceptionsRepository only needs the DB provider which is available globally via @Global() DbModule. NO import added.
    ExceptionsRepository,
    // P3-B C6 (D12) — see the import-site comment above: re-provided directly, zero new module import.
    FlagDisciplineRepository,
    FlagConvergenceService,
  ],
  // EXPORTS LieutenantService (T6's tick consumer) + LieutenantProjectionService (Phase-6 vector #6 T7) so a FUTURE
  // surface (e.g. a roster/detail screen, or a building-card that wants the assigned lieutenant's bands) can reuse the
  // band projection (R2.2 — qualitative bands only). The SAME export-for-reuse shape MoneyHoldingModule uses for its
  // projection service.
  // NEW (Phase-14 Exception Queue T4) — EXPORTS LieutenantRepository so the ExceptionsModule (which IMPORTS this module)
  // can inject it to read the lieutenant's current behavior_script.source for the ADD_RULE append (getBehaviorScriptSource),
  // then re-attach via the exported LieutenantService.attachScript. The dependency is STRICTLY one-way (exceptions →
  // lieutenant); this module imports NOTHING from exceptions (the producer reaches the queue via the CityEventBus seam, T3)
  // — so no circular module dependency.
  exports: [LieutenantService, LieutenantProjectionService, LieutenantRepository, AutonomyCeilingService, SignalDriftService, StandingOrderService],
})
export class LieutenantModule {}

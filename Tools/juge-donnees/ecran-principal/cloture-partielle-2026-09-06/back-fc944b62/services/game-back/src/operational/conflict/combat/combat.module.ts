// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 0 (C0) Step 8
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §0-§2
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §7 (CombatModule)
//             — Combat & Escalation B C0 — 2026-06-25 —
//
// `CombatModule` — the NestJS module for the §2 combat + escalation + de-escalation +
// retaliation mechanics (lot 04b-B).
//
// C0 = EMPTY DI-WIRING SHELL.
//   - Imports `RivalAiModule` (A's §13 contract: the 7 mechanic services + RivalProjectionService
//     — all exported by RivalAiModule; B NEVER reads rival_state directly).
//   - Imports `SchedulerModule` (CitySimSchedulerService + CityEventBus — C-esc/deesc/cas register
//     ESCALATION_TICK TWELVE_H / COMBAT_DAILY_TICK NIGHTLY / DEAD_HAND_TICK modulo-8-HOURLY).
//   - Imports `DistributionModule` (RouteFinderService.neighbors() — Oxbow Severance zones, C-cls).
//   - Imports `HeatContribModule` (emitCookHeat / emitForBuildings pattern — combat heat-producer, C-cls).
//   - Imports `EnforcementModule` (executeRaid + BuildingRaidedEvent — DIV-B2 seam, C-cls).
//   - Imports `ReputationModule` (ReputationHubService.projectReputationHub — Cumulative Attrition
//     READ, C-cls).
//   - No service provided yet — they land per-chunk (C1 entities+repository; C2 tunables;
//     C3 MUSCLE archetype + REQUEST_ASSAULT DSL action; C4 Percolation+Friction; C5 Ephemeral+
//     Erosion; C-esc Sandpile+Maladaptive+Resonant+Oscillation; C-deesc Familiarity+Downstream;
//     C-cas Dead Hand + cascade orchestration + RivalElimination).
//   - No CitySimSystem registered yet (ESCALATION_TICK / COMBAT_DAILY_TICK / DEAD_HAND_TICK land
//     at their respective chunks).
//   - No table, no migration, no tunable, no enum member, no archetype, no DSL action added.
//   - The module compiles and wires cleanly → the health probe returns OK (C0 boot spec).
//
// R9.3 (source-of-truth): docs/tech/09_data_model/schema_conflict_combat.md lands at C1 (same-commit).
//
// Architecture: mirrors `conflict/rival/rival-ai.module.ts` (A's C0 scaffold pattern):
//   - SchedulerModule → CitySimSchedulerService + CityEventBus (the shared singleton seams).
//   - RivalAiModule  → the §13 read/write API (the 8 read methods + 5 write hooks + toClientView).
//   - DistributionModule → RouteFinderService (the live 9b block-graph — Oxbow zone queries).
//   - HeatContribModule → the heat-producer seam (combat NEW producer, C-cls).
//   - EnforcementModule → executeRaid + BuildingRaidedEvent (DIV-B2 — Erosion Register coupling).
//   - ReputationModule  → ReputationHubService.projectReputationHub (Cumulative Attrition READ).
//   The remaining REUSE seams (makeRng / LekMemoryService / district_cohesion / db.transaction) are
//   DI-injected directly into the individual mechanic services at C1+ (not module-level).
//
// DD-CADENCE map (B's cadence binding, resolved here for DD-CADENCE):
//   Sandpile 12h     → Cadence.TWELVE_H  (ESCALATION_TICK, next-free after RIVAL_REGIME_TICK/TWELVE_H/6)
//   Daily decays     → Cadence.NIGHTLY   (COMBAT_DAILY_TICK — Maladaptive/Familiarity/Ephemeral-purge/CPI-decay)
//   Dead-Hand 8-tick → Cadence.HOURLY + gameMinute % (8 × tickMinutes) == 0 guard (DEAD_HAND_TICK)
//   Percolation 6h   → ON_EVENT + gameMinute % 360 == 0 guard (inline, no new system ID)
//   Cascade          → ON_EVENT (assault/elimination event, no hot tick)
// All cadences are deterministic game-time modulos. No Date.now(). No Math.random().
//
// DD-MUSCLE map (B's archetype wiring, resolved here for DD-MUSCLE):
//   - The `'MUSCLE'` union member lands at C3 in `lieutenant-archetype.ts` LieutenantArchetype.
//   - The MUSCLE_ROLE_ID (next-free after existing 10 roles in the 04a 14-role catalogue) lands at C3.
//   - OQ-B8 = option (ii): the Muscle resolves `EXECUTE_DEFAULT`; there is no dedicated assault
//     action. `REQUEST_ASSAULT` is removed as dead (DD-MUSCLE-P4-LEGIBLE §8.1.5).
//   - The MuscleBindingService (implements ArchetypeBinding) plugs into `BINDING_REGISTRY_PROVIDER`
//     in `lieutenant.module.ts` — the single wiring point (no other change to LieutenantModule).
//
// DD-CASCADE map (B's atomic cascade, resolved here for DD-CASCADE):
//   - `ConflictOrchestratorService.recordAssaultCascade` orchestrates the 5-layer §9.1 cascade
//     (Percolation → Friction → Erosion → Sandpile → Dead-Hand) in ONE db.transaction at
//     SERIALIZABLE, idempotent on `assaultEventId`, budget 5000ms (F4 canon limit).
//   - `RivalEliminationService.executeElimination` applies the 4-penalty §9.2 cascade.
//   - Both are ON_EVENT (not hot-tick), triggered by `requestAssault` via the Muscle DSL.
//
// Determinism invariant: NO Math.random(), NO Date.now() anywhere in this directory.
// Additivity invariant: B adds NEW tables + NEW services; the only live mutations are the
//   A-reserved rival_state combat columns (dominance_rank / vulnerable_axis, no add-migration
//   needed) + the B-added columns (C1 adds active_link_fraction / partition_state / etc.).

import { Module, forwardRef } from '@nestjs/common';

import { SchedulerModule } from '../../../citysim/scheduler/scheduler.module';
import { RivalAiModule } from '../rival/rival-ai.module';
import { DistributionModule } from '../../distribution/distribution.module';
import { HeatContribModule } from '../../heat_contrib/heat-contrib.module';
import { EnforcementModule } from '../../enforcement/enforcement.module';
import { ReputationModule } from '../../reputation/reputation.module';
import { DslModule } from '../../../dsl/dsl.module';
// C5 DD-CREDIBILITY circular-dep resolution:
// DiplomacyModule exports CredibilityAccumulatorService (the DD-CREDIBILITY single source of truth).
// CombatModule needs it for ConflictOrchestratorService (§9.1 cascade layer-5 forward slot).
// CombatModule ↔ DiplomacyModule bidirectional — resolved via forwardRef (no extracted module needed).
// DiplomacyModule uses forwardRef(() => CombatModule) on its side; we mirror here.
// Boot verified clean: /health 200, no "Nest can't resolve dependencies".
import { DiplomacyModule } from '../diplomacy/diplomacy.module';
import { testControllersEnabled } from '../../../protocol/test-routes-gate';
import { CombatRepository } from './combat.repository';
import { CombatTestController } from './combat-test.controller';
import { CombatTunables } from './combat-tunables';
// C3 DD-MUSCLE: CombatService (requestAssault — the Muscle DSL entry, P4).
import { CombatService } from './combat.service';
// C4 DD-FRICTION: FrictionBudgetService (the anti-dice Friction Budget — deterministic divergence lookup).
import { FrictionBudgetService } from './friction-budget.service';
// W6.1 C2: CombatResolutionTickService — registers COMBAT_RESOLUTION_TICK (NIGHTLY / order 13.5).
// Resolves every pending assault (outcome_bucket IS NULL) via Friction Budget (C4) → the §9.1
// cascade (ConflictOrchestratorService, C-cas) → the guarded UPDATE, in that crash-safe order
// (design §1 D6). Injected: CitySimSchedulerService (SchedulerModule) + CombatRepository +
// FrictionBudgetService + ConflictOrchestratorService — all already providers/imports of THIS
// module; no new module import, no new circular-dep risk.
import { CombatResolutionTickService } from './combat-resolution-tick.service';
// C5 DD-PERCOLATION: PercolationService (§2.1 applyAssault — DIV-B2 reuses executeRaid).
import { PercolationService } from './percolation.service';
// C5 DD-EROSION: ErosionRegisterService (§2.4 degradeRegister — 5-register P6 strip).
import { ErosionRegisterService } from './erosion-register.service';
// C6 DD-EPHEMERAL-REUSE: EphemeralOperationService (§2.3 ephemeral purge — player trail only, DIV-E1).
import { EphemeralOperationService } from './ephemeral-operation.service';
// C6 DD-OXBOW-ZONE: OxbowSeveranceService (§2.5 neck detection over live 9b block-graph + rival_holding).
import { OxbowSeveranceService } from './oxbow-severance.service';
// C7 DD-DEADHAND-FIRE: DeadHandCacheService (§6 RetaliationModule — pre-committed retaliation;
//   refreshCache / checkTriggerCondition / fireCache / applyIntelligenceDiscovery /
//   negotiateDeactivation stub [C forward slot]).
//   Injected: CombatRepository + CombatTunables + CityEventBus (from SchedulerModule).
//   makeRng is a plain function (not @Injectable — imported directly in the service).
import { DeadHandCacheService } from './dead-hand-cache.service';
// C8 DD-ATTRITION-REPUTATION: CumulativeAttritionService (§3.6 the pacifist counterpart —
//   incrementCPI / decayCPIDaily / computeResourcePressure).
//   Injected: DB + CombatRepository + CombatTunables + RegimeSwitchingService (from RivalAiModule,
//   §13 recordPressure) + TrophicGapService (from RivalAiModule, §13 removeTopEnforcer) +
//   ReputationHubService (from ReputationModule, DD-ATTRITION-REPUTATION READ-only, OQ-B3).
//   NO reputation WRITE (no double-count). CPI lives on rival_state (SSOT, no parallel table).
import { CumulativeAttritionService } from './cumulative-attrition.service';
// C-esc DD-SANDPILE: SandpileStateService (§4.1 SOC criticality + seeded cascade draw).
import { SandpileStateService } from './sandpile-state.service';
// C-esc DD-MALADAPTIVE: MaladaptiveMemoryService (§4.2 per-pair conflict_memory_depth).
import { MaladaptiveMemoryService } from './maladaptive-memory.service';
// C-esc DD-RESONANCE-GAMETIME: ResonantCadenceService (§4.3 game-time player_response_history, OQ-B5).
import { ResonantCadenceService } from './resonant-cadence.service';
// C-esc DD-OSCILLATION: OscillationTrapService (§4.4 Lotka-Volterra per-contested-lek, OQ-B6).
import { OscillationTrapService } from './oscillation-trap.service';
// C-esc: EscalationTickService — registers ESCALATION_TICK (TWELVE_H / order 7, next-free).
import { EscalationTickService } from './escalation-tick.service';
// C-deesc §5.1: FamiliarityDiscountService (dear-enemy familiarity accrual / resetOnElimination).
import { FamiliarityDiscountService } from './familiarity-discount.service';
// C-deesc §5.2: DownstreamGateService (hydraulic-jump RUNNING→STANDING + ConflictFlowRegimeEvent OQ-B7).
import { DownstreamGateService } from './downstream-gate.service';
// C-deesc: DeEscalationTickService — registers COMBAT_DAILY_TICK (NIGHTLY / order 14, next-free).
//   Lesson #3: runCombatDailyTickForPlayer drives BOTH scheduler AND _test route.
import { DeEscalationTickService } from './deescalation-tick.service';
// C-cas: ConflictOrchestratorService — §9.1 5-layer atomic cascade + DEAD_HAND_TICK (HOURLY/3).
//   Lesson #3: runDeadHandTickForPlayer drives BOTH scheduler AND _test route.
import { ConflictOrchestratorService } from './conflict-orchestrator.service';
// C-cas: RivalEliminationService — §9.2 4-penalty atomic elimination.
import { RivalEliminationService } from './rival-elimination.service';
// C-proj: CombatProjectionService + CombatAdminController.
import { CombatProjectionService } from './combat-projection.service';
import { CombatAdminController } from './combat-admin.controller';

@Module({
  imports: [
    // SchedulerModule: provides CitySimSchedulerService (registerSystem at C-esc/C-deesc/C-cas)
    // + CityEventBus (combat events — ConflictFlowRegimeEvent / CascadeTriggeredEvent /
    // DeadHandFiredEvent — emitted at their respective chunks). The shared singleton seam.
    SchedulerModule,
    // RivalAiModule: the §13 read/write API B consumes — the 7 mechanic services
    // (RegimeSwitchingService / SaturationBlindnessService / TempoExposureService /
    // AdaptiveSkinService / DistributedHoldService / TrophicGapService /
    // ReconnaissanceRegimeClassifierService) + RivalProjectionService + RivalAiTunables.
    // B NEVER reads rival_state directly: all reads go through A's exported services.
    // No circular dependency: RivalAiModule does NOT import CombatModule.
    RivalAiModule,
    // DistributionModule: RouteFinderService.neighbors() READ-only seam for Oxbow Severance
    // (C-cls — querying the live 9b block-graph for zone topology).
    DistributionModule,
    // HeatContribModule: the heat-producer seam — combat is a NEW heat producer (C-cls emits
    // HeatInjectionEvent via the existing emitForBuildings pattern; NO heat mechanic reimplemented).
    HeatContribModule,
    // EnforcementModule: executeRaid + BuildingRaidedEvent — the DIV-B2 seam (C-cls Erosion
    // Register couples to the raid pathway READ-only; the cascade reads raid ledger, never
    // reimplements raid-decision logic).
    EnforcementModule,
    // ReputationModule: ReputationHubService.projectReputationHub READ-only (C-cls Cumulative
    // Attrition reads the reputation projection to compute the pacifist-voice attrition band;
    // no reputation state written by CombatModule).
    ReputationModule,
    // DslModule: exports DslExecutorService (used by CombatTestController's P4 legibility probe
    // route — DD-MUSCLE-P4-LEGIBLE §8.1.4/§8.1.6; resolveToScriptRuleRef surfaces the matched
    // player rule index for the REFUSE E2E test). Additive — no existing behavior changed.
    DslModule,
    // C5 DD-CREDIBILITY: DiplomacyModule exported CredibilityAccumulatorService (the single
    // source of truth). ConflictOrchestratorService injects it for §9.1 cascade layer-5.
    // forwardRef: DiplomacyModule ↔ CombatModule bidirectional (DiplomacyModule also uses
    // forwardRef(() => CombatModule) on its side — NestJS resolves at boot, no cycle error).
    forwardRef(() => DiplomacyModule),
  ],
  // controllers: CombatTestController (test-gated, C1) + CombatAdminController (BO, always-on, C-proj).
  controllers: [
    // CombatTestController: test-isolation routes for C1 persistence verification.
    // Gated by testControllersEnabled() — absent in production (same pattern as RivalTestController).
    ...(testControllersEnabled() ? [CombatTestController] : []),
    // CombatAdminController: BO true-state endpoints (always-on — real production BO routes).
    // GET /v1/admin/rivals/:id/combat-state (gm) + GET /v1/admin/escalation/global-state (gm)
    // + GET /v1/admin/rivals/:id/dead-hand (gm) + GET /v1/admin/conflict/interlock-state (gm)
    // + POST /v1/admin/conflict/force-hazard-shift (admin, F3-deferred)
    // + POST /v1/admin/conflict/simulate-cascade (admin, F3-deferred).
    // requireStaffRole JWT-gated (9c-C13 lesson — NOT header-spoofable).
    CombatAdminController,
  ],
  // providers: CombatRepository (C1) + CombatTunables (C2).
  providers: [
    // CombatRepository: CRUD skeleton for all 8 B-owned tables + rival_state combat-column writers.
    CombatRepository,
    // CombatTunables (C2): registry-mirrored getters for all combat/escalation/de_escalation/
    // retaliation/interlock keys + getDivergenceOutcome (DD-DIVERGENCE-TABLE registry lookup).
    CombatTunables,
    // C3 DD-MUSCLE: CombatService (requestAssault — P4 Muscle DSL entry, called by MuscleBindingService).
    // Exported so MuscleBindingService (in LieutenantModule) can inject it.
    CombatService,
    // C4 DD-FRICTION: FrictionBudgetService (the anti-dice Friction Budget — deterministic divergence lookup).
    FrictionBudgetService,
    // W6.1 C2: CombatResolutionTickService — registers COMBAT_RESOLUTION_TICK (NIGHTLY/13.5).
    // Injected: CitySimSchedulerService (SchedulerModule import) + CombatRepository +
    // FrictionBudgetService + ConflictOrchestratorService (both providers of this same module).
    // Not exported — no other module consumes it (mirrors EscalationTickService's own shape).
    CombatResolutionTickService,
    // C5 DD-PERCOLATION: PercolationService (§2.1 applyAssault — DIV-B2 reuses executeRaid + emits COMBAT_HEAT).
    // Injected: CombatRepository + RaidRepository (from EnforcementModule) + HeatContribService
    // (from HeatContribModule) + CombatTunables.
    PercolationService,
    // C5 DD-EROSION: ErosionRegisterService (§2.4 degradeRegister — 5 registers per rival per player,
    // P6 strip on getRegisters). Injected: CombatRepository + RaidRepository + RegimeSwitchingService
    // (from RivalAiModule) + AdaptiveSkinService (from RivalAiModule) + CombatTunables.
    ErosionRegisterService,
    // C6 DD-EPHEMERAL-REUSE: EphemeralOperationService (§2.3 setOperationEphemeralMode /
    // clearStateOlderThanWindow / applyAuditTrailDisable — player trail purge, DIV-E1 boundary).
    // Injected: DB (direct, no combat seam needed for a pure DB service).
    EphemeralOperationService,
    // C6 DD-OXBOW-ZONE: OxbowSeveranceService (§2.5 detectNeckZones / applyHoldAction /
    // reclassifySalientAsOrphan — neck detection over live 9b block-graph + rival_holding as zones).
    // Injected: DB + RouteFinderService (from DistributionModule) + CombatTunables.
    OxbowSeveranceService,
    // C7 DD-DEADHAND-FIRE: DeadHandCacheService (§6 RetaliationModule — pre-committed retaliation;
    // refreshCache / checkTriggerCondition / fireCache / applyIntelligenceDiscovery /
    // negotiateDeactivation stub [C forward slot]).
    // Injected: CombatRepository + CombatTunables + CityEventBus (from SchedulerModule via NestJS DI).
    // makeRng is NOT @Injectable — imported as a plain function inside the service.
    DeadHandCacheService,
    // C8 DD-ATTRITION-REPUTATION: CumulativeAttritionService (§3.6 the pacifist counterpart).
    // incrementCPI (rolling-sum accrual on rival_state SSOT) + decayCPIDaily (COMBAT_DAILY_TICK
    // at C-deesc; here via _test) + computeResourcePressure (crossing → A's recordPressure via
    // RegimeSwitchingService §13, collapse → A's removeTopEnforcer via TrophicGapService §13,
    // reputation READ-only via ReputationHubService OQ-B3 no double-count).
    // CPI lives on rival_state.cumulative_pressure_index (SSOT, no parallel table, R9.3).
    CumulativeAttritionService,
    // C-esc: SandpileStateService (§4.1 SOC), MaladaptiveMemoryService (§4.2),
    // ResonantCadenceService (§4.3 DD-RESONANCE-GAMETIME OQ-B5), OscillationTrapService (§4.4 OQ-B6).
    // EscalationTickService — registers ESCALATION_TICK (TWELVE_H / order 7, next-free).
    // Injected by EscalationTickService: CitySimSchedulerService (from SchedulerModule) + all 4 mechanic services.
    SandpileStateService,
    MaladaptiveMemoryService,
    ResonantCadenceService,
    OscillationTrapService,
    EscalationTickService,
    // C-deesc §5.1: FamiliarityDiscountService (§6.1 dear-enemy familiarity_index accrual + reset +
    //   bucket projection). Injected: DB + CombatRepository + CombatTunables.
    // Exported so DownstreamGateService and DeEscalationTickService can inject it.
    FamiliarityDiscountService,
    // C-deesc §5.2: DownstreamGateService (§6.2 hydraulic-jump RUNNING→STANDING downstream regime +
    //   ConflictFlowRegimeEvent OQ-B7 RENAME + P5-explicit flow_regime projection).
    // Injected: CombatRepository + CombatTunables + CityEventBus (from SchedulerModule via NestJS DI).
    // Exported so CombatTestController can inject it.
    DownstreamGateService,
    // C-deesc: DeEscalationTickService — registers COMBAT_DAILY_TICK (NIGHTLY / order 14).
    // Lesson #3: runCombatDailyTickForPlayer is the SAME per-entity method called by BOTH the
    // scheduler run callback AND the drive-daily-tick _test route.
    // Injected: CitySimSchedulerService (SchedulerModule) + CombatRepository + MaladaptiveMemoryService
    // + FamiliarityDiscountService + EphemeralOperationService + CumulativeAttritionService.
    // Exported so CombatTestController can inject it for the drive-daily-tick route.
    DeEscalationTickService,
    // C-cas: ConflictOrchestratorService — §9.1 5-layer atomic cascade + DEAD_HAND_TICK (HOURLY/3).
    // Registers DEAD_HAND_TICK at onApplicationBootstrap (guard: gameMinute % 480 === 0).
    // Lesson #3: runDeadHandTickForPlayer drives BOTH scheduler AND _test route.
    // Exported so CombatTestController can inject it.
    ConflictOrchestratorService,
    // C-cas: RivalEliminationService — §9.2 4-penalty atomic elimination.
    // Exported so CombatTestController can inject it for the drive-elimination route.
    RivalEliminationService,
    // C-proj: CombatProjectionService — the ONLY player-facing combat shape (P6 wall).
    // toCombatClientView returns ONLY the 8 closed bands (activeLinkBand / registers[].valueBand /
    // sandpileBand / flowRegime / conflictMemoryBand / familiarityBand /
    // deadHandIntelligenceRevealed / lastOutcomeBucket). NO raw scalar leaks (R2.2 / P6).
    // Exported so C lot can consume the player-facing combat projection.
    CombatProjectionService,
  ],
  // exports: CombatRepository + CombatTunables (C2) + CombatService (C3) + FrictionBudgetService (C4)
  //          + PercolationService (C5) + ErosionRegisterService (C5)
  //          + EphemeralOperationService (C6) + OxbowSeveranceService (C6)
  //          + DeadHandCacheService (C7) + CumulativeAttritionService (C8)
  //          + C-esc: SandpileStateService + MaladaptiveMemoryService + ResonantCadenceService +
  //            OscillationTrapService (the 4 mechanic services — EscalationTickService not exported)
  //          + C-deesc: FamiliarityDiscountService + DownstreamGateService + DeEscalationTickService.
  //          + C-cas: ConflictOrchestratorService + RivalEliminationService.
  exports: [CombatRepository, CombatTunables, CombatService, FrictionBudgetService, PercolationService, ErosionRegisterService, EphemeralOperationService, OxbowSeveranceService, DeadHandCacheService, CumulativeAttritionService, SandpileStateService, MaladaptiveMemoryService, ResonantCadenceService, OscillationTrapService, FamiliarityDiscountService, DownstreamGateService, DeEscalationTickService, ConflictOrchestratorService, RivalEliminationService, CombatProjectionService],
})
export class CombatModule {}

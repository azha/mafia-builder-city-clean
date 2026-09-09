// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 0 (C0) Step 8
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §0-§2
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §7 (InfoWarModule)
//             — Diplomacy & Information Warfare C C0 — 2026-06-26 —
//
// `InformationWarfareModule` — the NestJS module for the §4 information-warfare mechanics
// (lot 04b-C, 4 mechanics: Dead Reckoning / Dual-Use Signal / Observation-Disturbance Cost /
// Purge Trap) and the `PacifistViabilityValidator` (the brand-commitment E2E gate, §11.3).
//
// C0 = EMPTY DI-WIRING SHELL.
//   - Imports `RivalAiModule` (A's §13 contract: the read/write API C consumes — `getIntelMode` /
//     `applyDisinformation` / `getActiveDecisionPolicy` / `toClientView` — C NEVER reads
//     rival_state directly; the Pillar-5 info-asymmetry wall is enforced here).
//   - Imports `CombatModule` (B's §13.2 PRODUCES-for-C surface: `getSandpileCriticalityBand` /
//     `getEscalationDepth` / `getConflictFlowRegime` — info-warfare read context; and the 3 forward
//     slots: `degradeRegisterIntel` lands at C9 when info-warfare degrades the INTEL erosion register).
//   - Imports `SchedulerModule` (CitySimSchedulerService + CityEventBus — the INFO_LOOP_DAILY_TICK
//     NIGHTLY slot C9 registers for the daily info-loop aggregate, `mechanics_interlock.md:65-78`).
//   - Imports `PoliceMemoryModule` (PoliceMemoryService.getPrecinctBeliefRaw READ — Dual-Use Signal
//     reads the BPD as a Bayesian prior, `information_warfare_mechanics.md:78`).
//   - No service provided yet — they land per-chunk (C1 infowar schema+types; C4 Dead Reckoning;
//     C5 Dual-Use Signal; C6 Observation-Disturbance Cost; C7 Purge Trap; C8 InfoWar orchestrator
//     + projection; C9 tick + BO; C10 INTELLIGENCE binding; C11 InfoWar E2E;
//     C12 PacifistViabilityValidator E2E).
//   - No CitySimSystem registered yet — INFO_LOOP_DAILY_TICK (NIGHTLY/15 next-free) lands at C9
//     (shared with DiplomacyModule's daily sweep; ONE system, TWO modules contributing to it).
//   - No table, no migration, no tunable, no enum member, no archetype, no DSL action added.
//   - The module compiles and wires cleanly → the health probe returns OK (C0 boot spec).
//
// R9.3 (source-of-truth): docs/tech/09_data_model/schema_conflict_infowar.md lands at C1 (same-commit).
//
// Architecture: mirrors conflict/combat/combat.module.ts + DiplomacyModule (C's dual-module pattern):
//   - RivalAiModule    → A's §13 read/write API (the P6 wall — info-warfare REALIZES Pillar 5).
//   - CombatModule     → B's §13.2 surface + the degradeRegisterIntel forward slot (C9).
//   - SchedulerModule  → CitySimSchedulerService + CityEventBus (the shared singleton seams).
//   - PoliceMemoryModule → PoliceMemoryService.getPrecinctBeliefRaw READ (Dual-Use Signal BPD prior).
//   The per-mechanic seams (makeRng / db.transaction / DiplomacyModule.CredibilityAccumulatorService)
//   are DI-injected into individual mechanic services at C4+ (not module-level — the B pattern).
//
// DD-P5-REALIZATION (§11 — C IS the Pillar-5 operational realization):
//   The info-warfare layer enforces P5 and P6:
//   - Disinfo lands iff A's `getIntelMode === 'pull'` via A's `applyDisinformation`.
//   - Dead Reckoning belief is a deliberately-noisy estimate of the rival's true state (never the truth).
//   - The player NEVER sees raw credibility/trust/belief/skepticism scalars (R2.2 / P5 wall).
//   - The `public_ledger` is the ONE P5 exception (explicitly visible to rivals, §3.8).
//
// DD-BPD-WRITE-SCOPE (DIV-C3 / §6.2 — the bounded write):
//   C writes ONLY the player's own intel-op trace (`appendDeclarationEntry`, BPD bounded WRITE).
//   C never writes the player-facing `suspicion_map` (the anti-exploit boundary — DIV-C3).
//   A has NO orient-queue/injectFalseObservation hook → OQ-C7 confirmed.
//
// Determinism: NO Math.random(). NO Date.now(). All belief/skepticism/suspicion updates are
//   pure functions of (state snapshot, read-only A/B/BPD signals, game-time). Seeded draws for
//   the probability-flavoured mechanics (Observation-Disturbance detection / Purge-Trap bluff
//   discovery) use `makeRng(<mechanic>:${rivalKey}:${gameDay})` (OQ-C2).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../../citysim/scheduler/scheduler.module';
import { PoliceMemoryModule } from '../../../citysim/police_memory/police_memory.module';
import { RivalAiModule } from '../rival/rival-ai.module';
import { CombatModule } from '../combat/combat.module';
import { InfoWarTunables } from './infowar.tunables';
import { InformationWarfareRepository } from './infowar.repository';
import { DeadReckoningService } from './dead-reckoning.service';
import { DualUseSignalService } from './dual-use-signal.service';
import { ObservationDisturbanceService } from './observation-disturbance.service';
import { PurgeTrapService } from './purge-trap.service';
import { InformationWarfareOrchestratorService } from './infowar-orchestrator.service';
import { InformationWarfareProjectionService } from './infowar-projection.service';
import { InformationWarfareTestController } from './infowar-test.controller';
import { testControllersEnabled } from '../../../protocol/test-routes-gate';
// C11: InformationWarfareAdminController — production BO true-state endpoint (P5 BO inversion).
//   GET /v1/admin/players/:id/info-warfare-state (requireStaffRole('gm')).
//   Always-on (NOT gated by testControllersEnabled — real production route).
//   F3 mutator (force-rival-detection) DEFERRED (TD-107 extend).
import { InformationWarfareAdminController } from './infowar-admin.controller';
// C12: PacifistViabilityValidator — the brand-commitment gate (DD-PACIFIST-E2E).
//   runE2EScenario(playerId, gameMinute): checks 5 brand-brief invariants (pacifist_run_viability.md:76-85).
//   Failure = brand-brief violation (blocking gate). Deterministic; no Math.random(); no Date.now().
import { PacifistViabilityValidator } from './pacifist-viability-validator.service';

@Module({
  imports: [
    // SchedulerModule: provides CitySimSchedulerService (INFO_LOOP_DAILY_TICK registration at C9)
    // + CityEventBus (on-event infowar subscriptions). The shared singleton seam.
    SchedulerModule,
    // RivalAiModule: A's §13 contract — the Pillar-5 wall info-warfare ENFORCES:
    //   getIntelMode — whether disinfo lands (PULL = susceptible; PUSH = filtered).
    //   applyDisinformation — the ONLY path C writes disinformation into the rival model.
    //   getActiveDecisionPolicy — Dead Reckoning infers the rival's decision bias.
    //   toClientView — the ONLY path rival state reaches the player (C never bypasses A's wall).
    // No circular dependency: RivalAiModule does NOT import InformationWarfareModule.
    // RivalStateRepository, ReconnaissanceRegimeClassifierService, AdaptiveSkinService,
    // RegimeSwitchingService are exported by RivalAiModule and injectable here.
    RivalAiModule,
    // CombatModule: B's §13.2 PRODUCES-for-C surface info-warfare reads:
    //   getSandpileCriticalityBand — the rival escalation context informs Observation-Disturbance Cost.
    //   getEscalationDepth — the conflict memory depth informs Dead Reckoning accuracy.
    //   getConflictFlowRegime — the flow regime informs Purge Trap deception window.
    // Also provides the forward slot C9 wires:
    //   degradeRegisterIntel (ErosionRegisterService) — info-warfare degrades the INTEL erosion register.
    //   ErosionRegisterService is exported by CombatModule and injectable here.
    // No circular dependency: CombatModule does NOT import InformationWarfareModule.
    CombatModule,
    // PoliceMemoryModule: PoliceMemoryService.getPrecinctBeliefRaw READ:
    //   Dual-Use Signal (§4.2) reads the BPD as a Bayesian prior (information_warfare_mechanics.md:78)
    //   to interpret the rival's orientation signal (ORGANIC vs DISINFORMATION classification).
    // No write here: the infowar module's only BPD write is the DiplomacyModule's appendDeclarationEntry
    // (the player's own intel-op trace — shared BPD write path, bounded by DIV-C3).
    PoliceMemoryModule,
  ],
  controllers: [
    // C9: InformationWarfareTestController — gated by testControllersEnabled().
    // Absent in production (same pattern as DiplomacyTestController / CombatTestController).
    ...(testControllersEnabled() ? [InformationWarfareTestController] : []),
    // C11: InformationWarfareAdminController — production BO true-state endpoint.
    // Always-on (real production route — unlike the test controller above).
    // GET /v1/admin/players/:id/info-warfare-state (requireStaffRole('gm')).
    InformationWarfareAdminController,
  ],
  providers: [
    // C2: InfoWarTunables — registry-mirrored getters for info_warfare.* keys.
    // Every getter is TunablesStore-sourced; zero inline scalars. CAPS clamp set included.
    // REGISTRY-FIRST: all keys have gdd/14 rows preceding this registration (R2.3).
    InfoWarTunables,
    // C9: InformationWarfareRepository — the persistence layer for the 4 info-warfare tables.
    InformationWarfareRepository,
    // C9: 4 mechanic services (Dead Reckoning / Dual-Use Signal / Observation-Disturbance / Purge Trap).
    // Dependencies from RivalAiModule (RivalStateRepository, ReconnaissanceRegimeClassifierService,
    // AdaptiveSkinService, RegimeSwitchingService) and CombatModule (ErosionRegisterService)
    // are provided via their respective module exports and injected by NestJS DI.
    DeadReckoningService,
    DualUseSignalService,
    ObservationDisturbanceService,
    PurgeTrapService,
    // C9: InformationWarfareOrchestratorService — registers INFO_LOOP_DAILY_TICK (NIGHTLY/15).
    InformationWarfareOrchestratorService,
    // C10: InformationWarfareProjectionService — DD-P5 info-warfare projection wall.
    // Injected by InformationWarfareTestController for GET /v1/_test/infowar/client-view.
    // Exported so future player-facing endpoints can inject it without re-importing InformationWarfareModule.
    InformationWarfareProjectionService,
    // C12: PacifistViabilityValidator — the brand-commitment gate (DD-PACIFIST-E2E).
    // Injected by InformationWarfareTestController for POST /v1/_test/infowar/run-pacifist-scenario.
    // Exported so BO endpoints or CI test runners can inject it without re-importing this module.
    PacifistViabilityValidator,
  ],
  exports: [
    // Export InfoWarTunables so downstream modules can inject it (the shared tunable contract).
    InfoWarTunables,
    // Export repository + services so DiplomacyModule / _test routes can access them.
    InformationWarfareRepository,
    DeadReckoningService,
    DualUseSignalService,
    ObservationDisturbanceService,
    PurgeTrapService,
    InformationWarfareOrchestratorService,
    // C10: Export InformationWarfareProjectionService — the DD-P5 infowar projection wall.
    InformationWarfareProjectionService,
    // C12: Export PacifistViabilityValidator — the brand gate.
    PacifistViabilityValidator,
  ],
})
export class InformationWarfareModule {}

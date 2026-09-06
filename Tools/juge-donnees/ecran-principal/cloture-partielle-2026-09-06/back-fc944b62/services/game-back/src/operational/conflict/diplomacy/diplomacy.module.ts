// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 0 (C0) Step 8
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §0-§2
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §7 (DiplomacyModule)
//             — Diplomacy & Information Warfare C C0 — 2026-06-26 —
//
// `DiplomacyModule` — the NestJS module for the §3 diplomacy mechanics + §5 CredibilityAccumulator
// (lot 04b-C, 8 mechanics: Burn Notice / Vulnerability Display / Potlatch Bind / Proof of Leverage /
// Shared Exposure Lock / Revelation Trap / Sealed-Envelope Commitment / Dispersal Suppression Pact).
//
// C0 = EMPTY DI-WIRING SHELL.
//   - Imports `RivalAiModule` (A's §13 contract: the read/write API C consumes — `getIntelMode` /
//     `applyDisinformation` / `getActiveDecisionPolicy` / `recordPressure` / `recordAttack` /
//     `removeTopEnforcer` / `toClientView` — C NEVER reads rival_state directly).
//   - Imports `CombatModule` (B's §13.2 PRODUCES-for-C surface: `getSandpileCriticalityBand` /
//     `getEscalationDepth` / `getConflictFlowRegime`; and the 3 forward slots:
//     `recordCommitmentContradiction` / `negotiateDeactivation` / `degradeRegisterIntel`
//     — C wires these at C5/C7/C9).
//   - Imports `SchedulerModule` (CitySimSchedulerService + CityEventBus — the INFO_LOOP_DAILY_TICK
//     NIGHTLY slot C9 registers, and on-event diplomacy sweeps).
//   - Imports `PoliceMemoryModule` (PoliceMemoryService.getPrecinctBeliefRaw READ + bounded
//     `appendDeclarationEntry` WRITE — the BPD seam, DIV-C3 / DD-BPD-WRITE-SCOPE §6.2).
//   - No service provided yet — they land per-chunk (C1 schema+types; C2 repository+tunables;
//     C3 CredibilityAccumulator; C4 Burn Notice + Vulnerability Display; C5 Potlatch Bind +
//     Proof of Leverage; C6 Shared Exposure Lock; C7 Revelation Trap + Sealed-Envelope;
//     C8 Dispersal Suppression Pact + projection; C9 tick + BO; C10 INTELLIGENCE binding;
//     C11 InfoWar E2E; C12 pacifist-run E2E).
//   - No CitySimSystem registered yet — INFO_LOOP_DAILY_TICK (NIGHTLY/15 next-free) lands at C9.
//   - No table, no migration, no tunable, no enum member, no archetype, no DSL action added.
//   - The module compiles and wires cleanly → the health probe returns OK (C0 boot spec).
//
// R9.3 (source-of-truth): docs/tech/09_data_model/schema_conflict_diplomacy.md lands at C1 (same-commit).
//
// Architecture: mirrors conflict/combat/combat.module.ts (B's C0 scaffold pattern):
//   - RivalAiModule   → A's §13 read/write API (C consumes — never rival_state directly).
//   - CombatModule    → B's §13.2 surface (Sandpile/Escalation/FlowRegime reads + 3 forward slots).
//   - SchedulerModule → CitySimSchedulerService + CityEventBus (the shared singleton seams).
//   - PoliceMemoryModule → the live BPD seam (READ + bounded WRITE, DIV-C3).
//   The per-mechanic seams (makeRng / LekMemoryService / db.transaction) are DI-injected into
//   individual mechanic services at C2+ (not module-level — the B pattern).
//
// DD-INTEL map (DIV-C1, §8 — INTELLIGENCE archetype binding, C10):
//   The `INTELLIGENCE` union member + INTELLIGENCE_ROLE_ID lands in `lieutenant-archetype.ts` at C10.
//   The INTELLIGENCE binding plugs into `lieutenant.module.ts:102` `BINDING_REGISTRY_PROVIDER`
//   (the single wiring point — the MUSCLE pattern). REUSE `EXECUTE_DEFAULT` (no new DSL action — OQ-B8).
//
// DD-P5-REALIZATION (§11 — the Pillar-5 realization):
//   Disinfo lands iff A's `getIntelMode === 'pull'` via `applyDisinformation`.
//   The player's Dead-Reckoning belief ≠ the true RivalState (never the truth — the P6 wall is A's).
//
// DD-BPD-WRITE-SCOPE (DIV-C3 / §6.2 — the bounded write):
//   C writes the rival's belief into C's OWN tables + the player's own intel trace
//   (`appendDeclarationEntry`), NEVER a forged player `suspicion_map`.
//   A has NO orient-queue/injectFalseObservation hook → OQ-C7 = `applyDisinformation` + C-owned write.
//
// DD-CREDIBILITY (§5 — the CredibilityAccumulator single source of truth):
//   One `credibility_state` table; the 5 diplomacy mechanics write via the accumulator interface.
//   Canon `mechanics_interlock.md:92` — single SSOT, "a player who breaks one commitment damages all others".
//
// Determinism: NO Math.random(). NO Date.now(). All credibility/belief/skepticism updates are
//   pure functions of (state snapshot, read-only A/B/BPD signals, game-time). Seeded draws
//   only for the probability-flavoured mechanics (OQ-C2).

import { Module, forwardRef } from '@nestjs/common';

import { SchedulerModule } from '../../../citysim/scheduler/scheduler.module';
import { PoliceMemoryModule } from '../../../citysim/police_memory/police_memory.module';
import { RivalAiModule } from '../rival/rival-ai.module';
import { CombatModule } from '../combat/combat.module';
import { testControllersEnabled } from '../../../protocol/test-routes-gate';
import { DiplomacyRepository } from './diplomacy.repository';
import { DiplomacyTestController } from './diplomacy-test.controller';
import { DiplomacyTunables } from './diplomacy.tunables';
// C5 DD-CREDIBILITY: CredibilityAccumulatorService — the SINGLE source of truth.
// credibility lives in EXACTLY ONE table (credibility_state); all 5 diplomacy mechanics
// read/write via this service (never a per-mechanic credibility column).
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
// C6: Burn Notice + Vulnerability Display + Potlatch Bind (the first 3 mechanics).
import { BurnNoticeService } from './burn-notice.service';
import { VulnerabilityDisplayService } from './vulnerability-display.service';
import { PotlatchBindService } from './potlatch-bind.service';
// C7: Proof of Leverage + Shared Exposure Lock (the 4th and 5th diplomacy mechanics).
import { ProofOfLeverageService } from './proof-of-leverage.service';
import { SharedExposureLockService } from './shared-exposure-lock.service';
// C8: Revelation Trap + Sealed-Envelope Commitment + Dispersal Suppression Pact (mechanics 6-8).
import { RevelationTrapService } from './revelation-trap.service';
import { SealedEnvelopeCommitmentService } from './sealed-envelope-commitment.service';
import { DispersalSuppressionPactService } from './dispersal-suppression-pact.service';
// C10: DiplomacyProjectionService — the DD-P5 diplomacy projection wall.
//   The ONLY player-facing path from diplomacy state (credibilityBucket / trustDecayBucket /
//   sharedAttentionBucket / publicLedgerEntries). No raw scalar EVER leaves this service.
import { DiplomacyProjectionService } from './diplomacy-projection.service';
// C11: DiplomacyAdminController — production BO true-state endpoint (P5 BO inversion).
//   GET /v1/admin/players/:id/diplomacy-state (requireStaffRole('gm')).
//   Always-on (NOT gated by testControllersEnabled — real production route).
//   F3 mutator (force-credibility-adjust) DEFERRED (TD-107 extend).
import { DiplomacyAdminController } from './diplomacy-admin.controller';

@Module({
  imports: [
    // SchedulerModule: provides CitySimSchedulerService (INFO_LOOP_DAILY_TICK registration at C9)
    // + CityEventBus (on-event diplomacy sweeps). The shared singleton seam.
    SchedulerModule,
    // RivalAiModule: A's §13 contract — getIntelMode / applyDisinformation /
    // getActiveDecisionPolicy / recordPressure / recordAttack / removeTopEnforcer / toClientView.
    // C NEVER reads rival_state directly: all reads go through A's exported services.
    // No circular dependency: RivalAiModule does NOT import DiplomacyModule.
    RivalAiModule,
    // CombatModule: B's §13.2 PRODUCES-for-C surface —
    //   getSandpileCriticalityBand (SandpileStateService) — diplomacy reads escalation pressure.
    //   getEscalationDepth (MaladaptiveMemoryService) — informs Burn Notice severity.
    //   getConflictFlowRegime (DownstreamGateService) — informs Dispersal Suppression Pact.
    // Also provides the 3 forward-slot stubs C wires:
    //   recordCommitmentContradiction (ConflictOrchestratorService) — C5 wires CredibilityAccumulator.
    //   negotiateDeactivation (DeadHandCacheService) — C7 wires the truce clause.
    //   degradeRegisterIntel (ErosionRegisterService) — C9 wires info-warfare INTEL degradation.
    //
    // C5 CIRCULAR-DEPENDENCY RESOLUTION (DD-CREDIBILITY forward-slot seam):
    //   DiplomacyModule imports CombatModule (B's surface).
    //   CombatModule (at C5) also imports forwardRef(DiplomacyModule) — to inject
    //   CredibilityAccumulatorService into ConflictOrchestratorService (layer-5 forward slot).
    //   NestJS resolves this bidirectional dependency via forwardRef — boot is clean.
    //   Verified: /health 200, no "Nest can't resolve dependencies" on boot.
    forwardRef(() => CombatModule),
    // PoliceMemoryModule: the live BPD seam (DIV-C3 / DD-BPD-WRITE-SCOPE):
    //   getPrecinctBeliefRaw READ — Shared Exposure Lock reads shared BPD attention per district.
    //   appendDeclarationEntry bounded WRITE — the player's own intel-op trace (C-owned, not forged).
    // No write to the player's suspicion_map (the 9b DD-DEBT-SSOT / DIV-E1 boundary).
    PoliceMemoryModule,
  ],
  controllers: [
    // DiplomacyTestController: test-gated probe routes for C1 persistence verification.
    // Mounted ONLY when NODE_ENV !== 'production' (testControllersEnabled()).
    // In production: 404 (not registered).
    ...(testControllersEnabled() ? [DiplomacyTestController] : []),
    // C11: DiplomacyAdminController — production BO true-state endpoint.
    // Always-on (real production route — unlike the test controller above).
    // GET /v1/admin/players/:id/diplomacy-state (requireStaffRole('gm')).
    DiplomacyAdminController,
  ],
  // C1: DiplomacyRepository (persistence layer for the 7 diplomacy tables).
  // C2: DiplomacyTunables (registry-mirrored getters for all diplomacy.* + pacifist.* keys).
  // C3+: CredibilityAccumulatorService + 8 mechanic services +
  //      DiplomacyAdminController (C9) + DiplomacyProjectionService (C10).
  providers: [
    DiplomacyRepository,
    // C2: DiplomacyTunables — registry-mirrored getters for diplomacy.* + pacifist.* keys.
    // Every getter is TunablesStore-sourced; zero inline scalars. CAPS clamp set included.
    // REGISTRY-FIRST: all keys have gdd/14 rows preceding this registration (R2.3).
    DiplomacyTunables,
    // C5 DD-CREDIBILITY: CredibilityAccumulatorService — the SINGLE source of truth.
    // ONE credibility_state table; all 5 diplomacy mechanics read/write via this service.
    // Injected: DB + DiplomacyTunables (getter-sourced accrual/damage/penalty, never inline).
    // Exported so ConflictOrchestratorService (CombatModule) can inject it for layer-5.
    CredibilityAccumulatorService,
    // C6: Burn Notice + Vulnerability Display + Potlatch Bind (the first 3 mechanics).
    // BurnNoticeService: writes commitment_ledger + raises credibility via accumulator.
    // VulnerabilityDisplayService: reads credibility + seeded draw GATES deterrence (OQ-C2).
    // PotlatchBindService: validates stash floor + writes public_ledger_entry + A's pressure hook.
    BurnNoticeService,
    VulnerabilityDisplayService,
    PotlatchBindService,
    // C7: Proof of Leverage + Shared Exposure Lock (the 4th and 5th diplomacy mechanics).
    // ProofOfLeverageService: credibility-gated broadcast + seeded bluff-probe draw GATES hardening
    //   + DD-BPD-WRITE-SCOPE appendDeclarationEntry (player's OWN trace, never suspicion_map).
    // SharedExposureLockService: BPD-coupled mutual deterrence — READS getPrecinctBeliefRaw
    //   (READ-only — no BPD write; the flag lives in C's own shared_exposure_lock table).
    //   Exported so DeadHandCacheService (CombatModule) can inject it via forwardRef
    //   for B's negotiateDeactivation forward slot (the C7 truce-clause wire).
    ProofOfLeverageService,
    SharedExposureLockService,
    // C8: Revelation Trap + Sealed-Envelope Commitment + Dispersal Suppression Pact (mechanics 6-8).
    // RevelationTrapService: seeded detection draw GATES inference (OQ-C2, falsifiable both-ways).
    // SealedEnvelopeCommitmentService: DD-SEALED-HASH deterministic commit; failed reveal calls
    //   recordFailedReveal via CredibilityAccumulatorService (-0.25 getter-sourced).
    // DispersalSuppressionPactService: daily scan for new entrants; does NOT write rival_state
    //   (the HARD canon invariant — pact does NOT pause the primary rivalry).
    RevelationTrapService,
    SealedEnvelopeCommitmentService,
    DispersalSuppressionPactService,
    // C10: DiplomacyProjectionService — DD-P5 diplomacy projection wall.
    // Injected by DiplomacyTestController for the GET /v1/_test/diplomacy/client-view route.
    // Exported so future player-facing endpoints (C12+) can inject it without re-importing DiplomacyModule.
    DiplomacyProjectionService,
  ],
  exports: [
    // Export the repository so future chunks (C5+) can inject it without re-importing
    DiplomacyRepository,
    // Export DiplomacyTunables so C3+ mechanic services can inject it (the shared tunable contract).
    DiplomacyTunables,
    // C5: Export CredibilityAccumulatorService so CombatModule (ConflictOrchestratorService)
    // can inject it for the §9.1 cascade layer-5 (recordCommitmentContradiction forward slot).
    CredibilityAccumulatorService,
    // C6: Export the 3 mechanic services so the test controller can inject them.
    BurnNoticeService,
    VulnerabilityDisplayService,
    PotlatchBindService,
    // C7: Export ProofOfLeverageService + SharedExposureLockService.
    // SharedExposureLockService is exported so CombatModule's DeadHandCacheService can inject it
    // via forwardRef (the negotiateDeactivation forward slot wire).
    ProofOfLeverageService,
    SharedExposureLockService,
    // C8: Export the 3 new mechanic services.
    RevelationTrapService,
    SealedEnvelopeCommitmentService,
    DispersalSuppressionPactService,
    // C10: Export DiplomacyProjectionService — the DD-P5 diplomacy projection wall.
    DiplomacyProjectionService,
  ],
})
export class DiplomacyModule {}

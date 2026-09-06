// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 0 (C0) Step 8
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 5 (C5) (issue-1 fix)
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7) — AdaptiveSkinService
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §4.2 (DD-MODULE)
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §7 (RivalAiModule)
//             — Rival AI Foundation C0 + C5 — 2026-06-24 —
//
// `RivalAiModule` — the NestJS module for the §3 rival-AI mechanics (lot 04b-A).
//
// C0 = EMPTY DI-WIRING SHELL.
//   - Imports the READ-only seams C3-C8 use (SchedulerModule for CitySimSchedulerService +
//     CityEventBus; DistributionModule re-exported RouteFinder for C5 DD-ROUTEGRAPH-REUSE).
//   - No service provided yet — they land per-chunk (C1 entity + seed; C2 tunables; C3-C8 mechanics).
//   - No CitySimSystem registered yet — those land at C3 (RIVAL_REGIME_TICK + RIVAL_DAILY_TICK)
//     and C4 (RIVAL_SATURATION_TICK + RIVAL_DECISION_TICK).
//   - No table, no migration, no tunable, no enum member added.
//   - The module compiles and wires cleanly → the health probe returns OK (C0 boot spec).
//
// R9.3 (source-of-truth): docs/tech/09_data_model/schema_conflict_rival.md lands at C1 (same-commit).
//
// Pattern mirrors operational/reputation/reputation.module.ts (D2 R0 scaffold precedent):
//   - imports SchedulerModule (provides CitySimSchedulerService + CityEventBus — both READ-only
//     seams C3+ register against and emit onto).
//   - DistributionModule imported READ-only for RouteFinderService.neighbors (C5 DD-ROUTEGRAPH-REUSE).
//   - No test controllers yet (they land C1+ as additive, gated by testControllersEnabled()).
//
// REUSE seams DI-injected here (READ-only per the greenfield-additivity invariant §1.3):
//   - CitySimSchedulerService  — the shared scheduler C3/C4 registerSystem() onto.
//   - CityEventBus             — the in-process bus C3 emits RegimeTransitionEvent onto.
//   - RouteFinderService       — the live 9b block-graph C5 Distributed Hold reads.
//   (HeatPropagationService / district_cohesion / ReputationHubService are injected into the
//    individual mechanic services at C3-C8 — NOT here at the module level; they are imported via
//    HeatModule / CohesionPermafrostModule / ReputationModule at that point.)
//
// DD-CADENCE map resolved (DIV-A1) — recorded here, implemented at C3/C4:
//   12h  → Cadence.TWELVE_H   (RIVAL_REGIME_TICK, order TBD TWELVE_H next-free after existing/5)
//   6h   → Cadence.HOURLY + gameMinute % 360 == 0 guard (RIVAL_SATURATION_TICK, next-free after HOURLY/1)
//   daily→ Cadence.NIGHTLY    (RIVAL_DAILY_TICK, next-free after NIGHTLY/12)
//   N-ticks → gameMinute % (N × tickMinutes) == 0 modulo inside RIVAL_DECISION_TICK (HOURLY band)
//   on-event → Cadence.ON_EVENT (not used by A — no new on-event system in this lot)
// All cadences are deterministic game-time modulos. No Date.now(). No Math.random().

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../../citysim/scheduler/scheduler.module';
import { DistributionModule } from '../../distribution/distribution.module';
import { testControllersEnabled } from '../../../protocol/test-routes-gate';
import { RivalAiTunables } from './rival-ai.tunables';
import { RivalSeedService } from './rival-seed.service';
import { RivalStateRepository } from './rival-state.repository';
import { RegimeSwitchingService } from './regime-switching.service';
import { ReconnaissanceRegimeClassifierService } from './reconnaissance-regime-classifier.service';
import { TempoExposureService } from './tempo-exposure.service';
import { SaturationBlindnessService } from './saturation-blindness.service';
import { DistributedHoldService } from './distributed-hold.service';
import { TrophicGapService } from './trophic-gap.service';
import { AdaptiveSkinService } from './adaptive-skin.service';
import { RivalTickService } from './rival-tick.service';
import { RivalProjectionService } from './rival-projection.service';
import { RivalTestController } from './rival-test.controller';
import { RivalAdminController } from './rival-admin.controller';

@Module({
  imports: [
    // SchedulerModule: provides CitySimSchedulerService (registerSystem at C3/C4) + CityEventBus
    // (RegimeTransitionEvent emit at C3). The shared singleton scheduler + bus seam.
    SchedulerModule,
    // DistributionModule (C5 issue-1 fix): RouteFinderService now exported by DistributionModule so
    // DistributedHoldService can inject it READ-only for DD-ROUTEGRAPH-REUSE (Coil Distributed Hold).
    // No circular dependency: DistributionModule does NOT import RivalAiModule.
    // The injection is READ-only: DistributedHoldService calls neighbors() only; no distribution state write.
    DistributionModule,
  ],
  // C1: RivalTestController (test-only, gated by testControllersEnabled()). C9: RivalAdminController (always-on BO).
  controllers: [
    RivalAdminController,                                  // C9: BO true-state (always-on, not test-gated)
    ...(testControllersEnabled() ? [RivalTestController] : []),
  ],
  // C1: RivalSeedService (DD-RIVAL-SEED) + RivalStateRepository (read/write seam for C3+ mechanics).
  // C2: RivalAiTunables (registry-mirrored getters for all rival_ai.* keys; no Math.random).
  // C3: RegimeSwitchingService (3-source pressure + flip + RegimeTransitionEvent emit).
  //     ReconnaissanceRegimeClassifierService (PULL/PUSH intel-mode + applyDisinformation).
  //     RivalTickService (DD-MODULE: registers RIVAL_REGIME_TICK/TWELVE_H/6 + RIVAL_DAILY_TICK/NIGHTLY/13).
  providers: [
    RivalAiTunables,                           // C2: the ~29 canon REUSE + NEW [PROV-Y26Q2] getters
    RivalSeedService,                          // C1: 4-rival per-player UPSERT (static baselines, idempotent)
    RivalStateRepository,                      // C1: read/update seam (regime/saturation/intel/route-integrity)
    RegimeSwitchingService,                    // C3: regime pressure + flip (§3.1); consumes CityEventBus via SchedulerModule
    ReconnaissanceRegimeClassifierService,     // C3: PULL/PUSH intel-mode (§3.7)
    TempoExposureService,                      // C4: per-rival observe/orient/commit tempo + cohesion couple (§3.2)
    SaturationBlindnessService,               // C4: biphasic saturation register + passive decay (§3.3)
    DistributedHoldService,                    // C5: Coil-primary route-overlay + rerouteEvaluation + getRouteIntegrity (§3.4)
    TrophicGapService,                         // C6: Trophic Gap — removeTopEnforcer/applyCascade/getTrophicSuppression (§3.5)
    AdaptiveSkinService,                       // C7: Adaptive Skin — recordAttack/getPatternResistance/decayUnused (§3.6)
    RivalTickService,                          // C3+C4+C5+C6+C7: DD-MODULE scheduler registration (all 4 rival systems)
    RivalProjectionService,                    // C8: DD-P6-WALL — toClientView (the ONLY path from RivalState to player)
  ],
  exports: [
    RivalAiTunables,                           // C2: exported so C3+ mechanic services can inject cross-module
    RivalStateRepository,                      // C9: exported for C lot consumption (§13 Dead Reckoning reads true state to build belief)
    RegimeSwitchingService,                    // C3: exported for B/C lot consumption (§13 recordPressure/getActiveDecisionPolicy)
    ReconnaissanceRegimeClassifierService,     // C3: exported for C lot consumption (§13 getIntelMode/applyDisinformation)
    TempoExposureService,                      // C4: exported for B/C lot consumption (§13 getOrientLatencyWindow)
    SaturationBlindnessService,               // C4: exported for B/C lot consumption (§13 incrementSaturation/getCurrentBand)
    DistributedHoldService,                    // C5: exported for B lot consumption (§13 getRouteIntegrity — Coil Distributed Hold targeting)
    TrophicGapService,                         // C6: exported for B/C lot consumption (§13 removeTopEnforcer/getTrophicSuppression)
    AdaptiveSkinService,                       // C7: exported for B/C lot consumption (§13 recordAttack/getPatternResistance)
    RivalProjectionService,                    // C8: exported for B/C lot consumption (§13 toClientView — the player projection)
  ],
})
export class RivalAiModule {}


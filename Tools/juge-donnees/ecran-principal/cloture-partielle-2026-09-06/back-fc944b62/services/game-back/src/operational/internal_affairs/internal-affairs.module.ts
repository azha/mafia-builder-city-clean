// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C0 (DI shell)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §3
//             Architecture mirror: services/game-back/src/operational/legal/legal.module.ts
//             — 04d-B C0 — 2026-07-01
//
// `InternalAffairsModule` — the NestJS module for the §3 Internal Affairs / Corruption Discovery
// mechanics (04d-B, G9).
//
// C0 = EMPTY SCAFFOLD. providers [IATargetService (stub)], no schema, no migration, no tick.
// Only IATestController (test-only ping probe /v1/_test/ia/ping, R-EC-2) is conditionally
// mounted to prove module wiring. The DI seams are anchored so TypeScript resolution failures
// surface at C0 rather than at the first consuming chunk.
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (C4 IA_THRESHOLD_TICK NIGHTLY +
//     C6 IA_DECAY_TICK WEEKLY — precedents insurance.module.ts:139 NIGHTLY/7 + :265 WEEKLY/8).
//   REUSE: PoliceMemoryModule imported for PoliceMemoryService.appendDeclarationEntry (C5 —
//     forward-cascade BPD exposure write; the only PoliceMemory seam B touches).
//   REUSE: MarketModule imported for MarketRngService.seedFromDay (the ONLY seeded-RNG draw
//     source — no Math.random, mirroring legal.module.ts and forensic.module.ts).
//   REUSE: LawyerModule imported for LawyerService (recordTier3Use reverse-bump C3 + forceBurnLawyer
//     forward cascade C5) + LegalProjectionService (getBurnRiskBand read C3+). Both are EXPORTED
//     by LawyerModule (legal.module.ts:108-109). §13 contract surface for 04d-B.
//   REUSE: ReputationModule imported for BossMirrorService / reputation (player-profile weight —
//     the 3rd factor of the 3-factor accrual formula, C3).
//   NEW (C1): db/schema/internal_affairs.ts (4 pgEnums + internal_affairs_targets +
//             ia_investigations + ia_intel_purchases) + mig 0099-0101 + ch09 backport docs.
//   NEW (C2): ia.tunables.ts (17 canon internal_affairs.* registry keys (16 C2 + 1 C7 intel_band_cut_watching) + 8 composites [PROV-Y26Q2]
//             + 2 NEW discovery double-condition keys [PROV-Y26Q2], decision #3).
//   NEW (C3): IATargetService.recordCorruptUse — 3-factor formula + cooperators/weight_per_player
//             writes + lawyer accrual (Tier3LawyerUsedEvent → recordCorruptUse →
//             LawyerService.recordTier3Use). 4 reserved types: type-agnostic, inert (no live caller).
//   NEW (C4): IAInvestigationService — evaluateThresholdCrossing (IA_THRESHOLD_TICK NIGHTLY, L1 skip)
//             + runSurveillanceWindow (seeded detection roll → detection_events). IATickService
//             registers IA_THRESHOLD_TICK. InvestigationOpenedEvent emitted.
//   NEW (C5): IADiscoveryService.executeDiscovery — forward cascade only (decision #1 backward DEFERRED):
//             for lawyer → LawyerService.forceBurnLawyer + appendDeclarationEntry exposure;
//             reserved types → inert forward hook + IATargetDiscoveredEvent.
//   NEW (C6): IADecayService.applyWeeklySuspicionDecay (IA_DECAY_TICK WEEKLY/10, next free after
//             FORENSIC_AUDIT_TICK/9). IATickService extended with IA_DECAY_TICK registration
//             (precedent insurance.module.ts:265 WEEKLY/8). Cool-off (idle targets decay) +
//             use-spreading (inherent per-row per-actor). Idempotent per game-week
//             (last_weekly_decay_at game-epoch guard). recordCorruptUse extended to stamp
//             last_weekly_decay_at = thisWeekEpoch (cool-off guard, C6 additive C3 touch).
//   NEW (C7): IAIntelPurchaseService.buyApproxBandReveal (Fixer-mediated, ia_intel_purchases row
//             + debit, band only; R2.3 registry-sourced band cuts; burn-action DEFERRED — TD).
//   NEW (C8): IAProjectionService (★ P5 wall — IATargetSuspicionBandBucket + actor status;
//             grep-zero suspicion_level/cooperators/weight_per_player on any client endpoint).
//   NEW (C9): IAAdminController (5 endpoints requireStaffRole, F3 on force-discovery + tunables)
//             + determinism sweep + ch09/gdd14/gdd15 reconcile + merge-gate full suite.
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path
// is touched. The single additive touch to 04d-A (Tier3LawyerUsedEvent emit in issueTier3Payoff)
// lands at C3 as the scoped bus-decoupled seam (decision #2, RATIFIÉ 2026-07-01).
//
// Backward cascade DEFERRED (decision #1): the only live target is `lawyer` (per-player singleton);
// multi-cooperator backward machinery has no honest live consumer. TD routed at C9.
//
// EXPORTS: (C3+ expose services consumed via the §13 contract; nothing exported at C0.)

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { PoliceMemoryModule } from '../../citysim/police_memory/police_memory.module';
import { MarketModule } from '../market/market.module';
import { LawyerModule } from '../legal/legal.module';
import { ReputationModule } from '../reputation/reputation.module';
import { IATargetService } from './ia-target.service';
import { IAInvestigationService } from './ia-investigation.service';
import { IADiscoveryService } from './ia-discovery.service';
import { IADecayService } from './ia-decay.service';
import { IATickService } from './ia-tick.service';
import { IATunables } from './ia.tunables';
import { IAIntelPurchaseService } from './ia-intel-purchase.service';
import { IAProjectionService } from './ia-projection.service';
import { IATestController } from './ia-test.controller';
import { IAAdminController } from './ia-admin.controller';
import { InternalAffairsController } from './internal-affairs.controller';

// IAAdminController is ALWAYS-ON (production BO routes, not gated on testControllersEnabled).
// W6.3 C3/C4: InternalAffairsController is ALWAYS-ON (production PLAYER routes, `me/internal-
//   affairs/*` — the first player-reachable surface for this module).
// IATestController is TEST-ONLY (gated on testControllersEnabled()).
const controllers = [
  IAAdminController,          // C9: always-on BO routes (requireStaffRole-gated per-endpoint).
  InternalAffairsController,  // W6.3 C3-C4: always-on PLAYER routes
  ...(testControllersEnabled() ? [IATestController] : []),
];

@Module({
  imports: [
    SchedulerModule,     // C4/C6: CitySimSchedulerService (IA_THRESHOLD_TICK NIGHTLY/? + IA_DECAY_TICK WEEKLY/?).
                         //        Also provides CityEventBus (scheduler.module.ts:41 exports CityEventBus).
    PoliceMemoryModule,  // C5: PoliceMemoryService.appendDeclarationEntry (forward-cascade public-exposure write).
                         //     B does NOT touch police_memory in any other way (backward cascade DEFERRED, decision #1).
    MarketModule,        // C3/C4: MarketRngService.seedFromDay — the ONLY seeded-RNG draw source (no Math.random).
    LawyerModule,        // §13: LawyerService (recordTier3Use reverse-bump C3 + forceBurnLawyer forward C5) +
                         //      LegalProjectionService (getBurnRiskBand read). Both EXPORTED by LawyerModule.
    ReputationModule,    // C3: player-profile weight (BossMirrorService / reputation band → 3rd accrual factor).
  ],
  controllers,
  providers: [
    IATunables,              // C2+C7: registry-mirrored getters for 17 canon internal_affairs.* keys (16 C2 + 1 C7 intel_band_cut_watching).
    IAInvestigationService,  // C4: evaluateThresholdCrossing (NIGHTLY/17 scan) + runSurveillanceWindow.
                             //     Injects: DB, IATunables, CityEventBus. NOT circular (no dep on IATargetService).
    IATargetService,         // C3: recordCorruptUse (3-factor formula) + Tier3LawyerUsedEvent subscriber.
                             //     OnModuleInit: subscribes to bus → lawyer accrual chain (decision #2).
                             //     Injects: DB, IATunables, IAInvestigationService (C4), LawyerService,
                             //              BossMirrorService, CityEventBus.
    IATickService,           // C4: OnApplicationBootstrap — registers IA_THRESHOLD_TICK NIGHTLY/17.
                             //     Injects: CitySimSchedulerService, IAInvestigationService.
    IADiscoveryService,      // C5: executeDiscovery — double-condition (events >= N OR suspicion >= T).
                             //     lawyer → forceBurnLawyer + appendDeclarationEntry BPD exposure.
                             //     reserved types → inert forward hook + IATargetDiscoveredEvent.
                             //     Injects: DB, IATunables, CityEventBus, LawyerService, PoliceMemoryService.
    IADecayService,          // C6: applyWeeklySuspicionDecay — IA_DECAY_TICK WEEKLY/10 payload.
                             //     Scans idle targets (last_weekly_decay_at < thisWeekEpoch) → decay.
                             //     Idempotent per game-week. Cool-off: active targets (stamped by
                             //     recordCorruptUse) are filtered OUT. L1 skip when no idle targets.
                             //     Injects: DB, IATunables.
    IAIntelPurchaseService,  // C7: buyApproxBandReveal — Fixer-mediated intel-op (direct service,
                             //     projection-only label gap #6) + debit economy_states.cash_cents
                             //     (402 on insufficient) + insert ia_intel_purchases row.
                             //     Returns { purchaseId, band, costCents } — NEVER suspicion_level (R2.2/P5).
                             //     R2.3: ALL band cuts registry-sourced (intelBandCutWatching NEW [PROV-Y26Q2]
                             //     + openInvestigationThreshold + discoverySecondSuspicionThreshold reused).
                             //     Injects: DB, IATunables.
                             //     DEFERRED: IABurnActionService.executeBurn (kill|exile|buyout) — requires
                             //     real heat/rep seams (existing seams need building/district context for heat;
                             //     lieutenant for rep) + durable neutralize fix (discovered_at conflict with
                             //     NIGHTLY C4 re-investigation scan). TD routed — see plan §C7 + TD note.
    IAProjectionService,     // C8: ★ P5 wall — getActorStatus(playerId, targetNpcId) → ActorStatusIndicator
                             //     (steady|nervous|unavailable|gone). Derived from suspicion_level +
                             //     investigation/discovery state (server-side, no raw scalars returned).
                             //     Player isolation: checks cooperators JSONB server-side (never returned).
                             //     R2.2/P5: suspicion_level/cooperators/weight_per_player NEVER returned.
                             //     R2.3: intelBandCutWatching cut sourced from registry (IATunables getter).
                             //     Deterministic: pure function of DB state — no Math.random, no Date.now.
                             //     Injects: DB, IATunables.
    // C9+: IAAdminController (5 BO endpoints, requireStaffRole, F3 on force-discovery + tunables).
  ],
  exports: [
    IATargetService,   // C3+: consumed by C5 forward cascade (executeDiscovery) + C9 BO endpoints.
  ],
})
export class InternalAffairsModule {}

// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C0 + C1+ (shell)
//             docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 Lawyer & Legal System (G5)
//             — 04d-A C0 — 2026-06-30
//
// `LawyerModule` — the NestJS module for the §2 Lawyer & Legal System mechanics (04d-A).
//
// C0 = EMPTY SCAFFOLD. providers [LawyerService] (stub), no mechanic, no entity, no tick.
// Only the LegalTestController (test-only ping probe /v1/_test/legal/ping, R-EC-2) is
// conditionally mounted to prove module wiring. The module imports the DI seams that
// C1+ services will consume; this anchors the graph early so TypeScript resolution failures
// surface at C0 rather than at the first consuming chunk.
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (C6 LEGAL_LEAK_TICK MINUTE
//     registration + NIGHTLY resolution/burn sweep in C7-C8).
//   REUSE: PoliceMemoryModule imported for PoliceMemoryService (C6 appendDeclarationEntry
//     info-leak drip + C7 conviction final-dump — the active BPD declaration seam, NOT rebuilt).
//   REUSE: MarketModule imported for MarketRngService.seedFromDay (C3/C6 seeded-RNG draws —
//     the ONLY draw source, no Math.random, mirroring forensic.module.ts:23-24).
//   NEW (C1): db/schema/legal.ts (4 pgEnums + lawyers + legal_cases) + mig 0097
//             + ALTER caught_exception legal_case_id (mig 0098) + ch09 backport docs.
//   NEW (C2): lawyer.tunables.ts (REUSE 3 gdd/14 + ~17 NEW lawyer.* registry keys + composites
//             [PROV-Y26Q2]); LawyerTunables getter class.
//   NEW (C3): LegalCaseService.createCase + non-courier triggers (BuildingRaidedEvent lieutenant;
//             tail_subpoena MIS path — closes the deferred legal-case TD) + charge_severity
//             derivation [PROV-Y26Q2] + knowledge_set lazy-compute.
//             Declares CaseResolvedEvent + LawyerBurnedEvent on the city-event-bus.
//   NEW (C4): ★ LAWYER_UP re-wire — resolveCaughtException LAWYER_UP branch → createCase
//             + stamp caught_exception.legal_case_id. ABANDON/VIOLENT_SILENCE byte-identical.
//             Rewrites the 2 System-9 specs (spec-only retro-compat).
//   NEW (C5): LawyerService.hire / setRetainer / reassignCase + unified cost ladder (decision #7)
//             + tier effects (−40%/−80% leak, +30% duration, plea-down/dismiss probabilities).
//   NEW (C6): InfoLeakService + LawyerLegalTickService — registers LEGAL_LEAK_TICK (MINUTE) on
//             the SHARED scheduler (L1 empty-state skip) + recordLeakedItem → appendDeclarationEntry
//             (source_origin=legal_case, REUSE the active seam) + seeded knowledge-item draw.
//   NEW (C7): LegalCaseService.resolveCase (NIGHTLY) + conviction final-dump + CaseResolvedEvent
//             + acceptPleaDeal.
//   NEW (C8): LawyerService.issueTier3Payoff + evaluateBurnRisk (NIGHTLY) + LawyerBurnedEvent
//             + cancel-pending + auto-Tier-1.
//   NEW (C9): ★ P5 wall — LegalProjectionService.toLegalPanel (LeakBandBucket + roster,
//             NO raw info_leak_* / burn_risk_* scalars) + BurnRiskBucket composite (decision #6)
//             + burn-warning Exception payload. grep-zero + falsifiable band test.
//   NEW (C10): Closeout — LegalAdminController (5 BO endpoints requireStaffRole, F3 mutators)
//              + §13 contract for B + determinism sweep + ch09/gdd14/gdd15 reconcile + merge-gate.
//
// Zero-regression invariant (§Global Constraints): purely ADDITIVE at C0 — no existing table,
// service, tick, or path is touched. The only deliberate mutation (LAWYER_UP re-wire) lands at C4
// as the scoped exception ratified by the user (decision #3 2026-06-30).
//
// EXPORTS: (C3+ expose services consumed by the app graph, e.g. LegalCaseService for the
//          distribution re-wire at C4 and for IA-B's §13 hook at C10.)

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { PoliceMemoryModule } from '../../citysim/police_memory/police_memory.module';
import { MarketModule } from '../market/market.module';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import { LawyerService } from './lawyer.service';
import { LawyerTunables } from './lawyer.tunables';
import { LegalCaseRepository } from './legal-case.repository';
import { LegalCaseService } from './legal-case.service';
import { InfoLeakService } from './info-leak.service';
import { LawyerLegalTickService } from './lawyer-legal-tick.service';
import { LegalProjectionService } from './legal-projection.service';
import { LegalAdminController } from './legal-admin.controller';
import { LegalTestController } from './legal-test.controller';
import { LegalController } from './legal.controller';

// C10: LegalAdminController is ALWAYS-ON (production BO routes, not gated on testControllersEnabled).
// W6.3 C0/C1/C2: LegalController is ALWAYS-ON (production PLAYER routes, `me/legal*` — the first
//   player-reachable surface for `legal_cases`/`lawyers` beyond the LAWYER_UP courier path).
// LegalTestController is conditionally registered (test-only, E2E only).
const controllers = [
  LegalAdminController,                                            // C10: always-on BO routes
  LegalController,                                                 // W6.3 C0-C2: always-on PLAYER routes
  ...(testControllersEnabled() ? [LegalTestController] : []),
];

@Module({
  imports: [
    SchedulerModule,     // C6: CitySimSchedulerService for LEGAL_LEAK_TICK (MINUTE) + NIGHTLY resolution/burn sweep.
    PoliceMemoryModule,  // C6-C7: PoliceMemoryService.appendDeclarationEntry (the active BPD declaration seam).
    MarketModule,        // C3/C6: MarketRngService.seedFromDay — the ONLY seeded-RNG draw source (no Math.random).
    // NOTE: LieutenantModule is NOT imported here (C4 09d-A fix). At C3 import time the graph was acyclic
    // (LieutenantModule → DistributionModule, but DistributionModule did not yet import LawyerModule).
    // After C4 wired DistributionModule → LawyerModule, the chain became cyclic:
    // DistributionModule → LawyerModule → LieutenantModule → DistributionModule.
    // FIX (precedent: D1 C7 ExceptionsRepository): LieutenantRepository only injects @Inject(DB),
    // which is provided globally via @Global() DbModule — so it is listed directly in providers below,
    // exactly as ExceptionsRepository is injected in lieutenant.module.ts (lines 311-314).
    // The dependency is strictly one-way: LawyerModule uses LieutenantRepository directly; it does NOT
    // import LieutenantModule and therefore does NOT pull the full LieutenantModule graph.
  ],
  controllers,
  providers: [
    LawyerService,           // C5: hire/setRetainer/reassignCase (injects LegalCaseRepository + LawyerTunables).
                             // C8+: issueTier3Payoff / evaluateBurnRisk / LawyerBurnedEvent.
    LegalCaseRepository,     // C3: Drizzle CRUD over lawyers + legal_cases. C5: +debitCash + reassign + retainer + findLawyerById.
    LawyerTunables,          // C2: 3 REUSE + ~17 NEW lawyer.* registry getters + composites [PROV-Y26Q2]. Cost ladder unified (decision #7).
    LegalCaseService,        // C3: createCase + non-courier triggers (BuildingRaided + MIS tail_subpoena) + charge_severity + knowledge_set.
                             // C5: per-player public_defender reuse (carry-forward #4).
    InfoLeakService,         // C6: recordLeakedItem → appendDeclarationEntry (BPD seam reuse).
    // C4 (cycle-break): LieutenantRepository injected DIRECTLY — see imports comment above.
    LieutenantRepository,
    LawyerLegalTickService,   // C6: registers LEGAL_LEAK_TICK MINUTE/23.
    LegalProjectionService,   // C9: toLegalPanel (LeakBandBucket + BurnRiskBucket; P5 wall — no raw scalars).
  ],
  exports: [
    LegalCaseService,        // C3+: consumed by InspectionQueueDispatcherService (C3 tail_subpoena path) + C4 + C10.
    LegalProjectionService,  // C9+: exported for BO (C10 admin true-state) + §13 contract for B (getBurnRiskBand).
    LawyerService,           // C10+: exported for B's §13 hook (recordTier3Use) + IA module injection.
  ],
})
export class LawyerModule {}

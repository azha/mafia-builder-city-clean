// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C5 (Loop 10 governor
//             module) + §C6 (HL-card provider registry + service + controller)
//             Design DD-P2 (§2.2): `progression/loop10/` is the ratified home for the catalogue +
//             governor + (C6) HL-card provider registry — the ch05<->ch06 hinge, distinct from
//             `session/` (C2) and `core_loops/` (the C1 cross-cutting tunables/_test home).
//             — P3-A C5 — 2026-07-10 / C6 — 2026-07-10
//
// `Loop10Module` — wires `StructuralDecisionGovernorService` (D8) for the 6 LIVE retrofit sites
// (real-estate + lieutenant modules import this module) + (C6) the 5 `HlCardProvider`s →
// `HlCardProviderRegistry` (mirrors `ExceptionEffectRegistry`'s `useFactory` shape,
// `exceptions.module.ts:47-63`) → `HlCardService` (D11) + `HlCardController` (`/v1/session/hl-card/*`).
// Imports `SessionModule` (EXPORTS `SessionService` — the D9 active-session-presence read AND, since
// C6, the `recordAdvisoryDecision` HL counter seam) + `ProgressionModule` (EXPORTS
// `ProgressionRepository` — the D10 cap-check counter read) + `DbModule` (the governor repository's +
// the 5 providers' + `HlCardRepository`'s own reads/writes) + `SchedulerModule` (EXPORTS
// `CityEventBus` for the `StructuralDecisionCommittedEvent` emit — neither `SessionModule` nor
// `ProgressionModule` re-exports it, mirrors `core-loops.module.ts`'s own direct import for the SAME
// reason). No cycle beyond the ONE `SessionModule` genuinely needs (C6, `forwardRef` both sides —
// `session.module.ts`'s own header comment carries the fuller account): none of these import
// `LieutenantModule`/`RealEstateModule`.
//
// BOOT CHECK (D7 `one_decision_classification_strict_mode`, default true): `onApplicationBootstrap`
// validates the REAL `STRUCTURAL_DECISION_CATALOGUE` — every `live:true` entry has a registered `site`.
// A violation throws, failing NestJS boot (the SAME "loud misconfiguration" convention
// `BindingRegistry` uses for a duplicate archetype). The tunable-gated `if` makes this getter
// value-sensitive (flipping the tunable to false would skip the check — never exercised in this build,
// the registered catalogue is always valid).

import { Module, OnApplicationBootstrap, forwardRef } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SessionModule } from '../../session/session.module';
import { ProgressionModule } from '../progression.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import {
  STRUCTURAL_DECISION_CATALOGUE,
  validateStructuralDecisionCatalogueStrictMode,
} from './structural-decision-catalogue';
import { StructuralDecisionGovernorRepository } from './structural-decision-governor.repository';
import { StructuralDecisionGovernorService } from './structural-decision-governor.service';
import { DamagedBuildingHlCardProvider } from './providers/damaged-building.provider';
import { SeveredRouteHlCardProvider } from './providers/severed-route.provider';
import { EscalationBacklogHlCardProvider } from './providers/escalation-backlog.provider';
import { AutonomyReportsHlCardProvider } from './providers/autonomy-reports.provider';
import { LegalCaseHlCardProvider } from './providers/legal-case.provider';
// P3-C C8 (ruling #9) — the 2 new tactical advisory providers (codes 106-107).
import { BackpressureCriticalTraceHlCardProvider } from './providers/backpressure-critical-trace.provider';
import { MycelialStressedLegHlCardProvider } from './providers/mycelial-stressed-leg.provider';
// P3-D C7 (ruling #4) — 1 MORE tactical advisory provider (code 108, design §11).
import { CueCascadeFalloutHlCardProvider } from './providers/cue-cascade-fallout.provider';
import { HlCardProviderRegistry } from './hl-card-provider.registry';
import { HlCardRepository } from './hl-card.repository';
import { HlCardFaultInjector } from './hl-card-fault-injector';
import { HlCardService } from './hl-card.service';
import { HlCardController } from './hl-card.controller';
import { STRUCTURAL_DECISION_GOVERNOR } from './structural-decision-governor.token';

@Module({
  imports: [DbModule, forwardRef(() => SessionModule), ProgressionModule, SchedulerModule],
  controllers: [HlCardController],
  providers: [
    StructuralDecisionGovernorRepository,
    StructuralDecisionGovernorService,
    // P3-C C7 — a Symbol-token ALIAS for StructuralDecisionGovernorService (RouteRebuildService,
    // operational/distribution/, resolves this via ModuleRef.get WITHOUT ever importing the concrete
    // class — see structural-decision-governor.token.ts's own header for the full empirically-forced
    // account of why a direct class import from that module broke this module's OWN DI graph at boot).
    { provide: STRUCTURAL_DECISION_GOVERNOR, useExisting: StructuralDecisionGovernorService },
    // C6 — the 5 v1 LIVE HL card providers (decisions §6 RULING #4) + the registry built from them.
    DamagedBuildingHlCardProvider,
    SeveredRouteHlCardProvider,
    EscalationBacklogHlCardProvider,
    AutonomyReportsHlCardProvider,
    LegalCaseHlCardProvider,
    // P3-C C8 (ruling #9) — 2 MORE tactical advisory providers (codes 106-107, design §8.4).
    BackpressureCriticalTraceHlCardProvider,
    MycelialStressedLegHlCardProvider,
    // P3-D C7 (ruling #4) — 1 MORE tactical advisory provider (code 108, design §11).
    CueCascadeFalloutHlCardProvider,
    {
      provide: HlCardProviderRegistry,
      useFactory: (
        damagedBuilding: DamagedBuildingHlCardProvider,
        severedRoute: SeveredRouteHlCardProvider,
        escalationBacklog: EscalationBacklogHlCardProvider,
        autonomyReports: AutonomyReportsHlCardProvider,
        legalCase: LegalCaseHlCardProvider,
        backpressureCriticalTrace: BackpressureCriticalTraceHlCardProvider,
        mycelialStressedLeg: MycelialStressedLegHlCardProvider,
        cueCascadeFallout: CueCascadeFalloutHlCardProvider,
      ) =>
        new HlCardProviderRegistry([
          damagedBuilding,
          severedRoute,
          escalationBacklog,
          autonomyReports,
          legalCase,
          backpressureCriticalTrace,
          mycelialStressedLeg,
          cueCascadeFallout,
        ]),
      inject: [
        DamagedBuildingHlCardProvider,
        SeveredRouteHlCardProvider,
        EscalationBacklogHlCardProvider,
        AutonomyReportsHlCardProvider,
        LegalCaseHlCardProvider,
        BackpressureCriticalTraceHlCardProvider,
        MycelialStressedLegHlCardProvider,
        CueCascadeFalloutHlCardProvider,
      ],
    },
    HlCardRepository,
    // MINOR-2 fold (C6-fix) — TEST-ONLY fault injector (harmless no-op unless a spec arms it via the
    // gated test route, `core-loops-test.controller.ts`). Exported so `CoreLoopsModule` can reach it.
    HlCardFaultInjector,
    HlCardService,
  ],
  exports: [StructuralDecisionGovernorService, HlCardService, HlCardFaultInjector, STRUCTURAL_DECISION_GOVERNOR],
})
export class Loop10Module implements OnApplicationBootstrap {
  onApplicationBootstrap(): void {
    if (coreLoopsTunables.oneDecisionClassificationStrictMode) {
      validateStructuralDecisionCatalogueStrictMode(STRUCTURAL_DECISION_CATALOGUE);
    }
  }
}

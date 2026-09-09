// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C0 (DI shell) + C2
//             (city-global NIGHTLY/19.5 calendar eval tick + electoral/budget triggers + overlap gate)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md (companion)
//             Architecture mirror: services/game-back/src/operational/effect_engine/effect-engine.module.ts (C0 shell)
//             — 04e-A2 C0 — 2026-07-05
//             — 04e-A2 C2 — 2026-07-05 (PoliticalEventRepository + PoliticalCalendarTickService added;
//             NIGHTLY slot RESOLVED to 19.5 — see political-calendar-tick.service.ts's own doc comment)
//             — 04e-A2 C4 — 2026-07-05 (PoliticalEventLifecycleService added — the shared activate/
//             deactivate lifecycle extracted from C2's private helper; the 8 GLOBAL live-lever events
//             wired-to-FIRE, see political-calendar-tick.service.ts's own C4 doc addendum)
//             — 04e-A2 C6 — 2026-07-06 (E-POL-10's own opposition-victory-at-electoral-end trigger now
//             fires AUTONOMOUSLY inside PoliticalCalendarTickService — no longer force-activate-only —
//             plus the permanent-until-election revert lifecycle for E-POL-10/E-POL-12; HeatModule's
//             HeatPropagationService is now ALSO injected directly into PoliticalCalendarTickService, not
//             just the test controller — see that service's own C6 doc addendum)
//             — 04e-A2 C7 — 2026-07-06 (political-counter-play.ts added — the counter-play disposition
//             registry, PURE DATA, no DI/no provider, same shape as political-template-id.ts; exposed via
//             PoliticalEventTestController's new GET /_test/political/counter-play-dispositions route.
//             E-POL-10's counter_play_politician_cost end-to-end read-back is dedicated-proven this chunk
//             — political_counter_play_hooks.spec.ts. No production code touched outside operational/political.)
//             — 04e-A2 C9 — 2026-07-06 (PoliticalAdminController added — the 5 BO endpoints,
//             `requireStaffRole`, P5 raw inversion; `PoliticalEventLifecycleService.abortPermanentEvent`
//             added, TD-163 ledger-stamp resolution; `computeNextCalendarDueDays` extracted to
//             `political-trigger-evaluators.ts`, SHARED by C8's player `upcoming` + this chunk's BO
//             `forecast`; the brand grep gate ENFORCED + widened to the 5 canon docs,
//             scripts/ci/check-political-brand-gate.sh)
//
// `PoliticalModule` — the 12-event political catalogue (G7, canon `political_event_catalogue.md`),
// wired to FIRE through the A1 `EffectModifierService`/`EffectOverlayStore` engine (04e-A1, MERGED
// `c03ce16a`). This is the 2nd part of sub-lot 04e-A (A1 → A2).
//
// C0 = EMPTY SCAFFOLD. providers [PoliticalEventService (DI anchor stub — injects EffectModifierService,
// CitySimSchedulerService, DB (node-postgres-backed) seams even though catalogue/trigger/lifecycle logic
// lands at C1+)], no schema, no migration, no tick. Only PoliticalEventTestController (test-only ping probe
// /v1/_test/political/ping, R-EC-2; renamed from PoliticalTestController at C1, naming reconcile) is
// conditionally mounted to prove module wiring. The DI seams are anchored so TypeScript resolution
// failures surface at C0 rather than at the first consuming chunk.
//
// Architecture (C1+ chunks will fill providers — plan §Architecture / decisions §0):
//   REUSE: EffectEngineModule imported for EffectModifierService (04e-A2 C0 additive fix: A1 left this
//     module's `exports: []` — EXPORTS EffectModifierService now so this module can inject it via DI,
//     see effect-engine.module.ts's own C0 (04e-A2) doc addendum).
//   REUSE: SchedulerModule imported for CitySimSchedulerService (the political calendar NIGHTLY tick
//     registers at C2 — precedent MetaMarketTickService.onApplicationBootstrap). RE-ANCHOR FINDING
//     (C0-M2), RESOLVED (C2): the plan's assumed NIGHTLY/19 slot was NOT free — 04d-C's
//     META_MARKET_ANTICHEAT_TICK took it (merged before 04e-A1 on this base) and NIGHTLY/20 is the
//     federal reconcile (04e-A1 C7). `registerSystem`'s sort comparator (`a.order - b.order`,
//     city_sim_scheduler.service.ts:616) is a plain numeric compare, not integer-constrained, so C2
//     registers `PoliticalCalendarTickService` at the FRACTIONAL slot **NIGHTLY/19.5** — strictly
//     between the two, zero renumbering of any existing NIGHTLY registration. Both `SCHEDULE` and
//     `CitySystemId` were updated in the SAME commit (`city_sim_scheduler.service.ts` /
//     `city_sim_system.ts`) — see `political-calendar-tick.service.ts`'s own doc comment for the full
//     rationale (`registerSystem` throws at boot on any (cadence, order) mismatch).
//   REUSE: DB (@Inject(DB), Drizzle over the node-postgres pool — db/db.module.ts) for the C2/C3
//     political_calendar_state / rival_elimination_ledger / political_district_signal_state repository
//     reads/writes.
//   REUSE: politicalEventsTunables (effect-engine.tunables.ts, the 34 already-registered
//     `political_events.*` getters, A1-C1) — this module REUSES them, never re-registers (R2.3).
//   NEW (C1): political-event-catalogue.ts (12 static PoliticalEvent entries) + political-template-id.ts
//     (PoliticalTemplateId union, anti-pattern-2 registry) + political.tunables.ts (the small set of NEW
//     A2 [PROV-Y26Q2] getters — E-POL-11 federal magnitude, E-POL-12 district window, scandal-noise
//     threshold, counter_play_politician_cost).
//   NEW (C2): db/schema/political_calendar_state.ts (migration 0111) + political-calendar-tick.service.ts
//     (NIGHTLY/19.5 city-global eval tick, RESOLVED slot per above) + political-trigger-evaluators.ts
//     (the 2 calendar triggers — electoral, budget) + political-event.repository.ts (calendar-state
//     idempotency claim + political_event_active ledger reads/writes for the overlap_max_active gate).
//   NEW (C3): db/schema/rival_elimination_ledger.ts (migration 0112) +
//     db/schema/political_district_signal_state.ts (migration 0113) + state-driven trigger evaluators.
//   NEW (C4, LANDED): political-event-lifecycle.service.ts (activate/deactivate — extracted
//     behavior-preserving from C2's private helper) — wires the 8(6 self-fireable + 2 test-hook-proven)
//     GLOBAL live-lever events; C5 adds the substrate/DISTRICT events, C6 adds opposition-victory +
//     permanent-until-election lifecycle on top of the SAME shared service.
//   NEW (C7): counter-play backend hooks (honest-scaffolding, E-POL-10 cost read-back).
//   NEW (C8, LANDED): political-event-read.service.ts (R2.2 qualitative read model — the ONLY
//     player-facing DTO builder over `POLITICAL_EVENT_CATALOGUE`) + political.controller.ts
//     (`GET /v1/political-events/calendar`, unguarded — mirrors `WorldController`'s public, city-global,
//     qualitative-only surface; no player-scoping needed, design §5.2 "one shared active-event set").
//   NEW (C9, LANDED): political-admin.controller.ts (`PoliticalAdminController` — 5 BO endpoints,
//     `requireStaffRole`, registered ALWAYS-ON below, mirrors `PoliticalController`) + brand-gate
//     enforcement (scripts/ci/check-political-brand-gate.sh).
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path is
// touched. The ONE additive touch to A1 code is `config/effect-overlay-store.ts` (the F2-RACE token
// guard + `reloadNow()`, A2-D1/D2) and `effect-engine.module.ts` (exports fix, above) — both
// byte-identical for the empty-overlay / single-reload-in-flight path (today's only real traffic).
//
// EXPORTS: (nothing exported at C0 — no consumer needs `PoliticalEventService` outside this module yet;
// C8+ may export the read service if a future chapter needs it).

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { HeatModule } from '../../citysim/heat/heat.module';
import { EffectEngineModule } from '../effect_engine/effect-engine.module';
import { PoliticalEventService } from './political-event.service';
import { PoliticalEventRepository } from './political-event.repository';
import { PoliticalEventLifecycleService } from './political-event-lifecycle.service';
import { PoliticalCalendarTickService } from './political-calendar-tick.service';
import { PoliticalRivalEliminationLedgerService } from './political-rival-elimination-ledger.service';
import { PoliticalEventTestController } from './political-event-test.controller';
import { PoliticalEventReadService } from './political-event-read.service';
import { PoliticalController } from './political.controller';
import { PoliticalAdminController } from './political-admin.controller';

// PoliticalEventTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// RENAMED at C1 (04e-A2, 2026-07-05, naming reconcile): file/class was `political-test.controller.ts` /
// `PoliticalTestController` at C0 — reconciled with the plan's file-structure convention
// (`political-event-test.controller.ts`, plan §File structure). Route paths unchanged
// (`/v1/_test/political/...`); zero behavioral impact on `political_module_boot.spec.ts`.
//
// PoliticalController (C8, LANDED): the REAL, always-mounted player-facing calendar API — NOT gated by
// `testControllersEnabled()` (unlike the probe controller above), same as every other production
// controller in this codebase.
const controllers = [
  PoliticalController, // C8: GET /v1/political-events/calendar (R2.2 qualitative read-only surface).
  PoliticalAdminController, // C9: 5 BO endpoints (requireStaffRole gm/admin, P5 raw inversion, TD-163).
  ...(testControllersEnabled() ? [PoliticalEventTestController] : []), // test-only probe routes
];

@Module({
  imports: [
    EffectEngineModule, // C0: EffectModifierService DI anchor (04e-A2 C0 export fix, see above).
    SchedulerModule,    // C0: CitySimSchedulerService DI anchor (the political calendar NIGHTLY tick
                        // registers at C2, slot TBD — see re-anchor finding above). Also provides
                        // CityEventBus. C0: DB injection is provided by @Global() DbModule (imported
                        // by AppModule root).
    HeatModule,         // C3: exports HeatPropagationService — the REAL per-player in-memory
                        // getDistrictPeakBucket/getCitywideBucket accessor E-POL-12's district
                        // signal + E-POL-11's BPD-aggregate predicates read (design §6.4/§6.2b). The
                        // SAME singleton instance the citysim MINUTE tick uses (NestJS module-graph
                        // dedup — no 2nd HeatPropagationService instantiated).
  ],
  controllers,
  providers: [
    PoliticalEventService, // C0: DI anchor stub — injects EffectModifierService + DB (node-postgres) +
                            // CitySimSchedulerService; references politicalEventsTunables directly
                            // (plain singleton). Real catalogue/trigger/lifecycle logic lands at C1+.
    PoliticalEventRepository,   // C2/C3: political_calendar_state claim + political_event_active ledger
                                 // reads/writes + C3's rival_elimination_ledger/political_district_
                                 // signal_state/rival_state/district_cohesion/district_capacity_state reads.
    PoliticalEventLifecycleService, // C4: the shared activate/deactivate lifecycle EXTRACTED from C2's
                                     // private activateEvent helper — every political trigger source
                                     // (this tick, C5, C6, C7) builds its EventEffect[] through this.
    PoliticalCalendarTickService, // C2: registers POLITICAL_CALENDAR_TICK at NIGHTLY/19.5 (onApplicationBootstrap).
    PoliticalRivalEliminationLedgerService, // C3: onModuleInit bus subscriber — RivalEliminatedEvent ->
                                             // rival_elimination_ledger row (design §6.2a).
    PoliticalEventReadService, // C8: the R2.2 qualitative read model PoliticalController consumes.
  ],
  exports: [],
})
export class PoliticalModule {}

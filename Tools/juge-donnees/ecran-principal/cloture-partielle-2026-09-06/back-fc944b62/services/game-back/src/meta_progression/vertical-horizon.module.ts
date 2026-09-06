// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C2
//             (`ExecutionPlanService.createPlan` + the timeline GET — `ExecutionPlanController`, ALWAYS
//             registered, a real player surface).
//             Decisions: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-decisions.md DD-H1 (NEW
//             sibling leaf module, imports land at the chunk that actually needs them, one-way, no
//             import back from `BudgetsHorizonModule`/`DelegationRatchetModule`, no edit to either).
//             Architecture mirror: `budgets-horizon.module.ts` (P3-G C1 — "C1 = the scaffold", the SAME
//             posture for this ch06 sub-lot's own first chunk).
//             C0 reference: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §15 (R14 — module wiring
//             CONFIRMED FEASIBLE: `DbModule` + `SchedulerModule` [CityEventBus, the 3 event subscriptions/
//             emissions] + `BudgetsHorizonModule` [EXPORTS `CapabilityDebtsRepository`, the ★H-2 raw-bucket
//             read] — one-way, zero cycle; `Loop10Module` is NOT structurally required, R5: `structuralCap
//             ForPlayer` is a plain non-DI import, P3-H adds zero Loop10 structural code — DD-H1's own
//             listed import set is one import wider than needed, dropped here per that finding). C1 needs
//             none of the three yet.
//             — P3-H C1 — 2026-07-24
//
// `VerticalHorizonModule` — the ch06 8th sub-lot's runtime home (Vertical Horizon: Decision Horizon Lock /
// Pressure Inverse / Benchmark Drift). C1 = the scaffold: the 5 mig-0141 repositories (DI-ready, zero
// methods — see each repository's own header for why) + a test-only tunables probe controller. Standalone
// leaf module (mirrors `BudgetsHorizonModule`/`DelegationRatchetModule`/`DemolitionModule`/
// `CompressionModule`/`CueStackModule`) — registered directly in `app.module.ts`, nothing imports it back
// yet. The pressure columns on `player_progression_state` and the DORMANT `decision_horizon_tier` column
// remain untouched by any runtime this chunk — C2+ activates them.
//
// C2 ADDS (design §6.1/§10): `ExecutionPlanService` (`createPlan` + `listTimeline`) + `ExecutionPlanController`
// (`POST`/`GET /v1/meta/horizon/execution-plans`, ALWAYS registered — a real player surface, mirrors
// `HorizonFeedController`'s always-on posture). TWO imports beyond C1's bare `DbModule`:
//   - `ProgressionModule` (EXPORTS `ProgressionRepository`) — REUSE, the SAME import `BudgetsHorizonModule`
//     already takes for the SAME table (`player_progression_state`); C2 adds ONE additive getter
//     (`getDecisionHorizonTier`, C0-reanchor R6's own "single-row atomic read" pattern) to that shared
//     repository rather than re-declaring a parallel read.
//   - `StandingOrderRepository` (`operational/lieutenant/standing-order/standing-order.repository.ts`) is
//     RE-PROVIDED DIRECTLY here (added to `providers`, NOT imported via the full `LieutenantModule`) —
//     mirrors `BudgetsHorizonModule`'s own established `LieutenantRepository` re-provide precedent verbatim
//     (that file's own header: "`LieutenantRepository`'s constructor is `@Inject(DB)`-only [trivially
//     cycle-safe] ... avoid a heavy/cyclic import" — `StandingOrderRepository`'s constructor is the SAME
//     `@Inject(DB)`-only shape; importing the whole `LieutenantModule` would pull a dozen+ transitive
//     operational modules `ExecutionPlanService` needs none of). C0-reanchor R2 pinned the ONE additive
//     method this re-provided instance needed (`getByIdWithOwner` — a `standing_order` ⋈ `lieutenant` join
//     for the owning `player_id`, since `standing_order` itself carries no `player_id` column).
//
// C3 ADDS (design §6.2/§6.3/§7): `ExecutionPlanEvaluatorService`/`DeviationEvaluatorService` — needs
// `SchedulerModule` (CityEventBus, the NIGHTLY/33 tick registration + the ESCALATE spine emission) +
// `BudgetsHorizonModule` (the ★H-2 `CapabilityDebtsRepository` DI, C0-reanchor R4). Two MORE
// duplicate-provided instances (mirrors `StandingOrderRepository` above verbatim — both constructors are
// `@Inject(DB)`-only, trivially cycle-safe, avoiding a heavy/cyclic full-module import for one repository
// each): `LieutenantRepository` (the `LIEUTENANT_PRESENT` clause's own read, `operational/lieutenant/
// lieutenant.repository.ts` — never `LieutenantModule`) + `ExceptionsRepository` (the ESCALATE spine
// insert, `src/exceptions/exceptions.repository.ts` — never `ExceptionsModule`, the SAME posture
// `DegradedCategoryPressureProducer`/`FrictionThresholdExceptionProducer` already establish for a
// cross-domain producer). C3 also adds the D3/§7.2 closed-world boot check (`validateConstraintRegistry
// StrictMode`, unconditional, mirrors `BudgetsHorizonModule.onApplicationBootstrap`'s own D3 check) —
// `VerticalHorizonModule` now `implements OnApplicationBootstrap`.
//
// C4 ADDS (design §6.4/§6.6/D6): `AdaptationResolverService` (the ADAPT-mode T3 bounded re-derivation —
// REPLACES the C3 interim inside `ExecutionPlanEvaluatorService`'s own ADAPT branch; needs NOTHING new in
// `imports` — it re-provides `StandingOrderRepository` [already here since C2] and REUSES the existing
// `DeviationEvaluatorService`) + `HorizonTierAdvancementRepository`/`HorizonTierAdvancementService`/
// `HorizonTierAdvancementController` (the REAL first writer of `decision_horizon_tier`, D6 — `POST
// /v1/meta/horizon/advance-tier`, ALWAYS registered, a real player surface; needs `ProgressionRepository`
// only, already imported via `ProgressionModule` since C2). Zero NEW imports this chunk — every DI surface
// C4 needs was already wired by C2/C3.
//
// C5 ADDS (design §8/D7/D8/D9): `PressureTierService` — the ★H-1 cap-reconciliation's TWO writers
// (`onGraduation` <- `GraduationCommittedEvent`, the graduation ratchet; `onSessionStart` <-
// `SessionOpenedEvent`, the T4-observation lazy-expiry) + the `GET /v1/meta/pressure` projection
// (`PressureTierController`, ALWAYS registered — a real player surface, mirrors `HorizonTierAdvancementController`'s
// always-on posture). The ★H-1 cap MODULATION ITSELF lives OUTSIDE this module entirely — `core_loops/
// core-loops-tunables.ts`'s `structuralCapForPlayer` body + its new sibling `core_loops/pressure-cap-cache.ts`
// (a plain, non-DI, process-wide singleton — `PressureTierService` imports it directly, NO NestJS provider,
// NO module import needed for it: mirrors R5's own "zero DI wiring" finding, C0-reanchor §7). Needs
// NOTHING new in `imports` — `ProgressionRepository` (pressure columns, extended this chunk) was already
// imported via `ProgressionModule` since C2; `SchedulerModule` (CityEventBus, the 2 subscriptions) was
// already imported since C3.
//
// C6 ADDS (design §9.1/§9.2/§10 — ★H-3 2-LIVE + 1-RESERVED): `BenchmarkDriftService` — baseline init +
// `BENCHMARK_DRIFT_TICK` (NIGHTLY/32, the courtesy gap C3 reserved) + the `GET /v1/meta/benchmark`
// projection (`BenchmarkDriftController`, ALWAYS registered — a real player surface, mirrors `Pressure
// TierController`'s always-on posture). ONE new provider beyond C1-C5's set: `ErlangStashRepository`
// RE-PROVIDED DIRECTLY (`@Inject(DB)`-only constructor, trivially cycle-safe — the SAME "re-provide the
// repo, never the owning module" precedent `StandingOrderRepository`/`LieutenantRepository`/
// `ExceptionsRepository` already establish above; `ErlangStashModule` also pulls `AuthModule`/
// `SchedulerModule` transitively for its OWN controller/service, unneeded here). `metric-sources.ts`'s
// COURIER_DELIVERY_RATE reader queries `courier_shift` directly via the ALREADY-imported `@Inject(DB)`
// client — no `OperationalChainModule`/`DistributionModule` import needed for a read-only aggregate query.
// Needs NOTHING else new in `imports` — `SchedulerModule` (CityEventBus, the NIGHTLY/32 registration + the
// `BaselineAutoUpdatedEvent` emit) was already imported since C3.
//
// C7 ADDS (design §9.3/§9.4/D11/D12): `BenchmarkQuotaService` (the quota primitives — `initQuota`/
// `claimUse`/`resetIfElapsed`/`raiseMaxUsesOnHorizonAdvanced`, the D12 `HorizonTierAdvancedEvent` subscriber
// — ★ hazard-5: reads ONLY the DECISION-HORIZON tier, never `pressure_tier`) + `BenchmarkDriftService.
// reAnchor` (the SAME C6 class, extended — `POST /v1/meta/benchmark/reanchor`, folded into the EXISTING
// `BenchmarkDriftController` since it shares the identical `meta/benchmark` resource segment, mirrors
// `ExecutionPlanController`'s own "POST+GET in one file" posture — see that controller's own header). Needs
// NOTHING new in `imports` — `SchedulerModule` (CityEventBus, the `HorizonTierAdvancedEvent` subscription)
// was already imported since C3; `PlayerReanchorQuotasRepository` was already provided/exported since C1.
//
// C9 ADDS (design §11 — the BO surface): `VerticalHorizonAdminController` (the 7 NEW production BO routes,
// R14 CONFIRMED sibling controller, its OWN file) — needs NOTHING new in `imports` (every repository/
// service it consumes was already provided by C1-C7 above); ONE new provider, `AdminAuditLogService`,
// RE-PROVIDED DIRECTLY (mirrors `BudgetsHorizonModule`'s own identical re-provide, P3-G C10).

import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { ProgressionModule } from '../progression/progression.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { StandingOrderRepository } from '../operational/lieutenant/standing-order/standing-order.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import { testControllersEnabled } from '../protocol/test-routes-gate';
import { BudgetsHorizonModule } from './budgets-horizon.module';
import { ExecutionPlansRepository } from './execution-plans.repository';
import { ExecutionCycleSlotsRepository } from './execution-cycle-slots.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { PlayerMetricBenchmarksRepository } from './player-metric-benchmarks.repository';
import { PlayerReanchorQuotasRepository } from './player-reanchor-quotas.repository';
import { ExecutionPlanService } from './execution-plan.service';
import { ExecutionPlanController } from './execution-plan.controller';
import { DeviationEvaluatorService } from './deviation-evaluator.service';
import { ExecutionPlanDeviationExceptionProducer } from './execution-plan-deviation-exception-producer.service';
import { ExecutionPlanEvaluatorService } from './execution-plan-evaluator.service';
import { AdaptationResolverService } from './adaptation-resolver.service';
import { HorizonTierAdvancementRepository } from './horizon-tier-advancement.repository';
import { HorizonTierAdvancementService } from './horizon-tier-advancement.service';
import { HorizonTierAdvancementController } from './horizon-tier-advancement.controller';
import { PressureTierService } from './pressure-tier.service';
import { PressureTierController } from './pressure-tier.controller';
import { minimalExpectedConstraints } from './horizon-tier-ladder';
import { validateConstraintRegistryStrictMode } from './constraint-evaluators';
import { ErlangStashRepository } from '../citysim/erlang_stash/erlang-stash.repository';
import { BenchmarkDriftService } from './benchmark-drift.service';
import { BenchmarkDriftController } from './benchmark-drift.controller';
import { BenchmarkQuotaService } from './benchmark-quota.service';
import { LIVE_METRIC_KINDS_LIST, validateMetricRegistryStrictMode } from './metric-sources';
import { VerticalHorizonTestController } from './vertical-horizon-test.controller';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { VerticalHorizonAdminController } from './vertical-horizon-admin.controller';

@Module({
  imports: [DbModule, ProgressionModule, SchedulerModule, BudgetsHorizonModule],
  controllers: [
    // C2 — ExecutionPlanController: the REAL player-facing POST/GET /v1/meta/horizon/execution-plans
    // routes, ALWAYS registered (mirrors HorizonFeedController's own always-on posture, R7's sibling-
    // controller recommendation, C0-reanchor §15).
    ExecutionPlanController,
    // C4 — HorizonTierAdvancementController: POST /v1/meta/horizon/advance-tier, its OWN file (mirrors
    // HorizonAdoptionController's own "separate controller file per concern, even sharing a base path"
    // posture), ALWAYS registered — a real player surface.
    HorizonTierAdvancementController,
    // C5 — PressureTierController: GET /v1/meta/pressure, its OWN file (the SAME "separate controller file
    // per concern" posture), ALWAYS registered — a real player surface.
    PressureTierController,
    // C6 — BenchmarkDriftController: GET /v1/meta/benchmark, its OWN file (the SAME "separate controller
    // file per concern" posture), ALWAYS registered — a real player surface.
    BenchmarkDriftController,
    // C9 — VerticalHorizonAdminController: the 7 NEW production BO routes (design §11), a sibling admin
    // controller inside THIS module's own controllers[] (R14 CONFIRMED — never an extension of any
    // existing controller), ALWAYS registered — real BO routes.
    VerticalHorizonAdminController,
    // VerticalHorizonTestController: test-only probe routes (R-EC-2) — NOT registered in production.
    ...(testControllersEnabled() ? [VerticalHorizonTestController] : []),
  ],
  providers: [
    ExecutionPlansRepository,
    ExecutionCycleSlotsRepository,
    ScriptStabilityCountersRepository,
    PlayerMetricBenchmarksRepository,
    PlayerReanchorQuotasRepository,
    // RE-PROVIDED DIRECTLY (not via LieutenantModule/ExceptionsModule) — see this file's own header for
    // the full precedent (both constructors are @Inject(DB)-only, trivially cycle-safe).
    StandingOrderRepository,
    LieutenantRepository,
    ExceptionsRepository,
    ExecutionPlanService,
    // C3 — the DHL per-cycle evaluator + its own producer.
    DeviationEvaluatorService,
    ExecutionPlanDeviationExceptionProducer,
    ExecutionPlanEvaluatorService,
    // C4 — ADAPT resolver (replaces the C3 interim) + MANUAL tier advancement.
    AdaptationResolverService,
    HorizonTierAdvancementRepository,
    HorizonTierAdvancementService,
    // C5 — the ★H-1 cap-reconciliation's two writers + the GET /v1/meta/pressure projection.
    PressureTierService,
    // C6 — RE-PROVIDED DIRECTLY (not via ErlangStashModule — that module also pulls AuthModule/
    // SchedulerModule transitively for its own controller/service; ErlangStashRepository's constructor is
    // @Inject(DB)-only, trivially cycle-safe, the SAME "re-provide the repo, never the owning module"
    // precedent this file's own header establishes for StandingOrderRepository/LieutenantRepository/
    // ExceptionsRepository above). Read-only here — H never writes `safehouses` (writes-none proof).
    ErlangStashRepository,
    // C6 — BenchmarkDriftService: baseline init + BENCHMARK_DRIFT_TICK (NIGHTLY/32) + the GET /v1/meta/
    // benchmark projection. C7 extends the SAME class with `reAnchor` (POST .../reanchor).
    // C7 — BenchmarkQuotaService: the quota primitives + the HorizonTierAdvancedEvent subscriber (D12).
    // Registered BEFORE BenchmarkDriftService in this list only for readability — Nest's DI is
    // order-independent (BenchmarkDriftService injects BenchmarkQuotaService).
    BenchmarkQuotaService,
    BenchmarkDriftService,
    // C9 — RE-PROVIDED DIRECTLY (not via any owning module — `AdminAuditLogService`'s constructor is
    // @Inject(DB)-only, trivially cycle-safe, the SAME "re-provide the service, never import a heavier
    // module for it" precedent this file's own header establishes for StandingOrderRepository/
    // LieutenantRepository/ExceptionsRepository/ErlangStashRepository above — mirrors
    // `BudgetsHorizonModule`'s own identical `AdminAuditLogService` re-provide, P3-G C10).
    AdminAuditLogService,
  ],
  exports: [
    ExecutionPlansRepository,
    ExecutionCycleSlotsRepository,
    ScriptStabilityCountersRepository,
    PlayerMetricBenchmarksRepository,
    PlayerReanchorQuotasRepository,
    DeviationEvaluatorService,
  ],
})
export class VerticalHorizonModule implements OnApplicationBootstrap {
  // C3 — D3/§7.2 closed-world boot check: the REAL emitted constraint set
  // (`horizon-tier-ladder.ts#minimalExpectedConstraints`, the ONLY place this lot emits `expected_
  // constraints` into a slot) names ONLY LIVE `ConstraintConditionType` members. Unconditional (no
  // tunable gate — mirrors `BudgetsHorizonModule`'s own D3 check). A violation throws, failing NestJS
  // boot (the SAME "loud misconfiguration" convention `validateCapabilityCatalogueStrictMode`/
  // `validateTaskCategoryCatalogueStrictMode` use).
  //
  // C6 — design §9.1/★H-3 closed-world boot check: the REAL iterated metric set (`metric-sources.ts#
  // LIVE_METRIC_KINDS_LIST`, the ONLY list `BenchmarkDriftService.runTick` ever iterates) names ONLY LIVE
  // `MetricKind` members (never `REVENUE_PER_ROUTE`). Unconditional, the SAME "loud misconfiguration"
  // convention as the C3 check just above — trivially passes today (the list is closed-by-construction),
  // the real protection is against a FUTURE edit drifting the two lists apart.
  onApplicationBootstrap(): void {
    validateConstraintRegistryStrictMode(minimalExpectedConstraints().map((c) => c.type));
    validateMetricRegistryStrictMode(LIVE_METRIC_KINDS_LIST);
  }
}

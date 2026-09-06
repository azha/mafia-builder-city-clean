// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1 (`BudgetsHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet) + C2 ("CapabilityCatalogue +
//             predicate engine (pure evaluation)") + C5 ("Loop 10 catalogue append CAPABILITY_ADOPT(16)
//             live + site POST /v1/meta/horizon/adopt... AdoptionService per design §9").
//             Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md DD-G1 (NEW
//             sibling leaf module, imports DbModule + SchedulerModule + Loop10Module (governor) as
//             needed at their owning chunk — one-way, no import back from `DelegationRatchetModule`, no
//             edit to `delegation-ratchet.module.ts`).
//             Architecture mirror: `delegation-ratchet.module.ts` (P3-F C1 — "C1 = the scaffold", the
//             SAME posture for ch06's successor lot's own first chunk; that file's own header cites
//             `core-loops.module.ts`'s "C1 = tunables-only shell" one level up). C2 boot-check mirror:
//             `delegation-ratchet.module.ts`'s own C2 `onApplicationBootstrap` (the SAME "loud
//             misconfiguration fails boot" convention, now for D3's CapabilityCatalogue).
//             C0 reference: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §6 (R7 — module
//             wiring CONFIRMED FEASIBLE: DbModule + SchedulerModule + Loop10Module + DelegationRatchet
//             Module, one-way, no cycle) + §5 (R3 — `gameplay_sessions`/`countHandledExceptions`
//             CONFIRMED, zero new query surface) + §12 (R4 — the SCRIPTED_LIEUTENANTS_MIN gap, closed
//             additively on `lieutenant.repository.ts`).
//             — P3-G C1 — 2026-07-20 / C2 — 2026-07-20 / C5 — 2026-07-20 / C6 — 2026-07-20
//
// `BudgetsHorizonModule` — the ch06 successor-lot runtime home (Budgets & Horizon: Complexity Budget /
// Possibility Horizon / Rule Vocabulary T3-T6 / Isostatic Debt). C1 = the scaffold: the 2 mig-0137
// repositories (DI-ready, zero methods — see each repository's own header for why) + a test-only
// tunables probe controller. Standalone leaf module (mirrors `DelegationRatchetModule`/`DemolitionModule`/
// `CompressionModule`/`CueStackModule`) — registered directly in `app.module.ts`, nothing imports it back
// yet. `possibility_horizon_cards`/`player_progression_state.{complexity_budget_cap,complexity_budget_
// used,rule_vocabulary_tier}` (ch09 mig 0002/0007) remain DORMANT this chunk — C3+ activates them.
//
// C2 ADDS: `HorizonPredicateEvaluatorService` (the PURE `evaluateForPlayer` surface, no card writes — the
// P3-F C4 pure-pipeline shape) + the D3 CapabilityCatalogue boot strict-check. TWO NEW imports beyond
// R7's confirmed set: `ProgressionModule` (EXPORTS `ProgressionRepository` — `CURRENT_VOCAB_TIER_IS` +
// `EXCEPTIONS_HANDLED_MIN` REUSE, R3's own "zero new query surface" read; a trivial DbModule+AuthModule-
// only leaf, zero cycle risk) + `DelegationRatchetModule` (EXPORTS `MasteryScoreRepository` — the READ-
// ONLY #28-wall surface `DELEGATED_CATEGORIES_MIN`/`MASTERY_ELIGIBLE_MIN` need, R7's own named
// justification). `LieutenantRepository` (R4's `countScriptedByPlayer` — `SCRIPTED_LIEUTENANTS_MIN`) is
// RE-PROVIDED DIRECTLY here rather than importing the full `LieutenantModule` (which pulls in a dozen+
// transitive operational modules — Dsl/Production/Enforcement/MoneyHolding/Distribution/Laundering/
// Selling/Reputation/Combat/RivalAi/InfoWar/Maintenance/Loop10/CategoryDelegationGuard — none of which
// C2 needs): `LieutenantRepository`'s constructor is `@Inject(DB)`-only (trivially cycle-safe), mirroring
// `SessionModule`'s own established "re-provide a DB-only repository directly to avoid a heavy/cyclic
// import" precedent (`ExceptionsRepository`/`FlagDisciplineRepository`/`FrictionBudgetRepository`).
// `SessionRepository` is deliberately NOT imported/re-provided — `SESSIONS_CLOSED_MIN` reads
// `gameplay_sessions` via a raw DB query instead (R3's own "zero new query surface" finding; R7's
// confirmed import set never names `SessionModule`).
//
// C3 ADDS: `PossibilityHorizonCardsRepository` (the ONLY write path onto `possibility_horizon_cards`),
// `HorizonCardSurfacingService` (the `SessionOpenedEvent` subscriber — surfacing + regression marking,
// design §7.3), `HorizonFeedService` + `HorizonFeedController` (`GET /v1/meta/horizon-feed`, `POST
// .../defer`, `POST .../dismiss` — R7's own "sibling controller, sibling module" recommendation). ONE NEW
// import beyond C2's set: `SchedulerModule` (EXPORTS `CityEventBus` — the `SessionOpenedEvent`
// subscription `HorizonCardSurfacingService` needs; R7's own confirmed import set already names this
// module, unused until now). `HorizonFeedController` is ALWAYS registered (a real player surface, not
// gated by `testControllersEnabled()` — mirrors `MetaProgressionController`'s own always-on posture).
//
// C4 ADDS: `ComplexityBudgetRepository` (the `complexity_budget_used`/`_cap` column read/write path) +
// `BudgetRecomputeService` (D1/D2 — event-driven recompute on `GraduationCommittedEvent`/
// `RecallInitiatedEvent`/`CapabilityAdoptedEvent` (the LAST wired dormant, no emitter until C5) + the
// `GET /v1/meta/complexity-budget` read path + the §10.3 pending-opportunities projection) +
// `ComplexityBudgetController` (`GET /v1/meta/complexity-budget`, R7's own sibling-controller shape —
// mirrors `HorizonFeedController`). `HorizonFeedService` now ALSO injects `BudgetRecomputeService` (C4
// closure of the C3 `affordable` stub — no new import beyond this module's OWN providers, both services
// are siblings in the SAME module). ZERO new external module import beyond C3's confirmed set
// (`SchedulerModule` already exports `CityEventBus` for the new subscriptions).
//
// C5 ADDS: `AdoptionService` (`executeAdoption` — the winner-gate-first, #27-compensation mutateFn) +
// `AdoptionFaultInjector` (TEST-ONLY, the induced-post-gate-failure proof seam) + `HorizonAdoptionController`
// (`POST /v1/meta/horizon/adopt`, ALWAYS registered — a real player surface, mirrors `HorizonFeedController`/
// `ComplexityBudgetController`'s own always-on posture). ONE NEW import beyond C4's confirmed set:
// `Loop10Module` (EXPORTS `StructuralDecisionGovernorService` — the code-16 `CAPABILITY_ADOPT` governor
// seam, R12's own confirmed import; mirrors `DelegationRatchetModule`'s own plain, one-way import of the
// SAME module — no forwardRef needed at THIS import site, `Loop10Module` never imports `BudgetsHorizonModule`
// back). `CapabilityAdoptionsRepository`/`PossibilityHorizonCardsRepository`'s own C5 method additions
// (`insert`/`claimForAdoption`/`revertClaim`) need no new DI wiring — both were ALREADY providers/exports
// since C1/C3.
//
// C6 ADDS: `VocabTierAdvancementService` (`onCapabilityAdopted` — the D9 monotone WHERE-guarded advance
// of `rule_vocabulary_tier` for values 3-6, `VocabTierAdvancedEvent` on actual write only) +
// `VocabTierAdvancementRepository` (the SECOND, disjoint-by-value-range writer of that column — see that
// repository's own header for why it is NOT a reuse of Phase-17's `ProgressionRepository.
// setVocabularyTier`). ZERO new external module import (the SAME `SchedulerModule`-exported `CityEventBus`
// C4/C5 already wired). The keystone proof this chunk exists for: `compiler.service.ts`/`lieutenant.
// service.ts`/`progression.service.ts`/`named-sequence.service.ts` all stay REUSE-untouched — this
// service's ONLY write path is `VocabTierAdvancementRepository`, a NEW file in THIS module.
//
// C7 ADDS: `IsostaticDebtService` (`applyUpgrade` ← `CapabilityAdoptedEvent`, D10 accrual; `applyActive
// Decay` ← the `ScriptAttachedEvent` bus subscription + the ADD_RULE resolve-hook sibling, D10 active
// decay). ZERO new external module import (the SAME `SchedulerModule`-exported `CityEventBus` C4/C5/C6
// already wired; `LieutenantRepository` is the SAME C2 re-provided instance — `getCurrentGameMinute` for
// the resolve-hook's own `last_decay_tick` stamp). `CapabilityDebtsRepository`'s own C7 method additions
// (`applyUpgrade`/`applyActiveDecay`) need no new DI wiring — it has been a provider/export since C1.
//
// C8 ADDS: `IsostaticDebtService` gains a THIRD write path, `applyPassiveDecay` (`ISOSTATIC_DEBT_TICK`
// HOURLY/8, D11 — registered in the SAME `onApplicationBootstrap` as C7's bus subscriptions, colocated so
// it shares the SAME `clearedEvents` in-memory probe) + the `getDebtProjection` read path (design §12.4/
// §13) + `CapabilityDebtsController` (`GET /v1/meta/capability-debts`, ALWAYS registered — SAME posture as
// `HorizonFeedController`/`ComplexityBudgetController`/`HorizonAdoptionController`). ONE NEW import beyond
// C7's confirmed set: `CitySimSchedulerService` — ALREADY exported by the `SchedulerModule` this module
// imports since C3 (for `CityEventBus`), zero new module wiring. `CapabilityDebtsRepository`'s own C8
// method additions (`applyPassiveDecayBatch`/`listVisibleForPlayer`) need no new DI wiring — it has been a
// provider/export since C1.
//
// C9 — the lot-wide leak-scan consolidation (no new module surface; test-file-only).
//
// C10 ADDS: `BudgetsHorizonAdminController` (design §14 — the 7 NEW `/v1/admin/*` BO routes: `GET players/
// :id/horizon`, `GET players/:id/complexity-budget`, `GET meta/capability-adoptions`, `GET meta/capability-
// debts`, `GET meta/vocab-tier-distribution`, `POST meta/capability-debt/force-clear`, `PATCH players/:id/
// complexity-budget-cap` — the 8th BO route, `PUT tunables/meta-progression`, is P3-F's EXISTING route on
// `MetaProgressionAdminController`/`DelegationRatchetModule`, key-list REUSE only, zero code here — R7's own
// C0-reanchor §6 recommendation). `AdminAuditLogService` is RE-PROVIDED DIRECTLY here (mirrors `Lieutenant
// Repository`'s own C2 "re-provide a DB-only, `@Inject(DB)`-only service directly" precedent above — it has
// no module-scoped dependency beyond `DB`, already imported since C1; two separate instances across
// `DelegationRatchetModule`/`BudgetsHorizonModule` are harmless, both write the SAME `admin_audit_log`
// table, R9.3 REUSE is about the TABLE/mechanism, never about a singleton instance). ZERO new external
// module import (every repository/service the admin controller injects is ALREADY a provider/export of
// THIS module since C1-C8).

import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { testControllersEnabled } from '../protocol/test-routes-gate';
import { ProgressionModule } from '../progression/progression.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { Loop10Module } from '../progression/loop10/loop10.module';
import { DelegationRatchetModule } from './delegation-ratchet.module';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { CapabilityAdoptionsRepository } from './capability-adoptions.repository';
import { CapabilityDebtsRepository } from './capability-debts.repository';
import { CAPABILITY_CATALOGUE, validateCapabilityCatalogueStrictMode } from './capability-catalogue';
import { HorizonPredicateEvaluatorService } from './horizon-predicate-evaluator.service';
import { PossibilityHorizonCardsRepository } from './possibility-horizon-cards.repository';
import { HorizonCardSurfacingService } from './horizon-card-surfacing.service';
import { HorizonFeedService } from './horizon-feed.service';
import { HorizonFeedController } from './horizon-feed.controller';
import { ComplexityBudgetRepository } from './complexity-budget.repository';
import { BudgetRecomputeService } from './budget-recompute.service';
import { ComplexityBudgetController } from './complexity-budget.controller';
import { AdoptionFaultInjector } from './adoption-fault-injector';
import { AdoptionService } from './adoption.service';
import { HorizonAdoptionController } from './horizon-adoption.controller';
import { VocabTierAdvancementRepository } from './vocab-tier-advancement.repository';
import { VocabTierAdvancementService } from './vocab-tier-advancement.service';
import { IsostaticDebtService } from './isostatic-debt.service';
import { CapabilityDebtsController } from './capability-debts.controller';
import { BudgetsHorizonTestController } from './budgets-horizon-test.controller';
import { BudgetsHorizonAdminController } from './budgets-horizon-admin.controller';
import { AdminAuditLogService } from '../db/admin-audit-log.service';

@Module({
  // C2 (additive) — ProgressionModule (EXPORTS ProgressionRepository) + DelegationRatchetModule (EXPORTS
  // MasteryScoreRepository). C3 (additive) — SchedulerModule (EXPORTS CityEventBus). C5 (additive) —
  // Loop10Module (EXPORTS StructuralDecisionGovernorService). See the file header for the full "why these
  // four, why LieutenantRepository is re-provided instead of imported" account.
  imports: [DbModule, ProgressionModule, DelegationRatchetModule, SchedulerModule, Loop10Module],
  controllers: [
    // C3 — HorizonFeedController: the REAL player-facing `GET /v1/meta/horizon-feed` + `POST .../defer` +
    // `POST .../dismiss` routes, always registered (a real player surface — mirrors
    // `MetaProgressionController`'s own always-on posture, R7's sibling-controller recommendation).
    HorizonFeedController,
    // C4 — ComplexityBudgetController: `GET /v1/meta/complexity-budget`, ALSO always registered (SAME
    // posture as HorizonFeedController — a real player surface, R7's sibling-controller shape).
    ComplexityBudgetController,
    // C5 — HorizonAdoptionController: `POST /v1/meta/horizon/adopt`, ALSO always registered (SAME
    // posture — a real, Loop-10-governed player surface).
    HorizonAdoptionController,
    // C8 — CapabilityDebtsController: `GET /v1/meta/capability-debts`, ALSO always registered (SAME
    // posture — a real player surface, R7's sibling-controller shape).
    CapabilityDebtsController,
    // C10 — BudgetsHorizonAdminController: the 7 NEW `/v1/admin/*` BO routes (design §14), ALSO always
    // registered (real production BO routes — mirrors `MetaProgressionAdminController`'s own always-on
    // posture, R7's sibling-controller recommendation).
    BudgetsHorizonAdminController,
    // BudgetsHorizonTestController: test-only probe routes (R-EC-2) — NOT registered in production.
    ...(testControllersEnabled() ? [BudgetsHorizonTestController] : []),
  ],
  providers: [
    CapabilityAdoptionsRepository,
    CapabilityDebtsRepository,
    // C2 — re-provided directly (see file header): trivially cycle-safe (@Inject(DB)-only).
    LieutenantRepository,
    // C10 — re-provided directly (see file header): trivially cycle-safe (@Inject(DB)-only), mirrors
    // LieutenantRepository's own re-provide precedent immediately above.
    AdminAuditLogService,
    // C2 — the pure predicate-evaluation surface (no card writes; C3 consumes it for surfacing).
    HorizonPredicateEvaluatorService,
    // C3 — the possibility_horizon_cards write path + the SessionOpenedEvent surfacing/regression
    // subscriber + the player-facing feed transitions service.
    PossibilityHorizonCardsRepository,
    HorizonCardSurfacingService,
    HorizonFeedService,
    // C4 — the complexity_budget_used/_cap column path + the D1/D2 recompute engine (event-driven WRITE +
    // the GET/pending-opportunities READ paths).
    ComplexityBudgetRepository,
    BudgetRecomputeService,
    // C5 — the winner-gate-first, #27-compensation adoption mutateFn + its TEST-ONLY fault injector.
    AdoptionFaultInjector,
    AdoptionService,
    // C6 — the D9 monotone WHERE-guarded `rule_vocabulary_tier` advancement (the SECOND, disjoint-by-
    // value-range writer of that column) + its dedicated repository.
    VocabTierAdvancementRepository,
    VocabTierAdvancementService,
    // C7 — the D10 isostatic-debt accrual (CapabilityAdoptedEvent) + active decay (ScriptAttachedEvent +
    // the ADD_RULE resolve-hook sibling, injected directly into ExceptionsService). C8 — the SAME service
    // gains passive decay (ISOSTATIC_DEBT_TICK HOURLY/8) + the GET /v1/meta/capability-debts projection.
    IsostaticDebtService,
  ],
  exports: [
    CapabilityAdoptionsRepository,
    CapabilityDebtsRepository,
    // C2 — exported so C3's HorizonFeedService (this SAME module, a future provider) and any BO/test
    // consumer can inject it without a second re-provide.
    HorizonPredicateEvaluatorService,
    // C3 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    PossibilityHorizonCardsRepository,
    HorizonCardSurfacingService,
    HorizonFeedService,
    // C4 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    ComplexityBudgetRepository,
    BudgetRecomputeService,
    // C5 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    AdoptionFaultInjector,
    AdoptionService,
    // C6 — exported for symmetry (no external consumer yet; injected in-module by the test controller).
    VocabTierAdvancementRepository,
    VocabTierAdvancementService,
    // C7 — EXPORTED so `ExceptionsModule` (the R8 ADD_RULE resolve-hook site) can inject it directly into
    // `ExceptionsService` (mirrors `DelegationRatchetModule` exporting `MasteryAccumulatorService` for the
    // SAME hook point, the P3-F C2 precedent).
    IsostaticDebtService,
  ],
})
export class BudgetsHorizonModule implements OnApplicationBootstrap {
  // C2 — D3 closed-world boot check: every LIVE `CAPABILITY_CATALOGUE` row's four binding groups
  // present, every RESERVED row's four binding groups empty, and no LIVE capability wires a RESERVED
  // predicate type (§7.2). Unconditional (no tunable gate — mirrors `DelegationRatchetModule`'s own C2
  // check). A violation throws, failing NestJS boot (the SAME "loud misconfiguration" convention
  // `validateStructuralDecisionCatalogueStrictMode`/`validateTaskCategoryCatalogueStrictMode` use).
  onApplicationBootstrap(): void {
    validateCapabilityCatalogueStrictMode(CAPABILITY_CATALOGUE);
  }
}

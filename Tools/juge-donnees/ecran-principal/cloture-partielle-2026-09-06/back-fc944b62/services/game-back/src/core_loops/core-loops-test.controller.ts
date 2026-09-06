// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md (design §2.4 DD-P4 — the
//             `core-loops-test.controller.ts` test-only probe controller) + §C2 (session runtime test
//             routes — C1-reviewer-ratified home: extend this controller, don't create a parallel one).
//             Pattern: R-EC-2 test-only controller (mirrors `political-event-test.controller.ts`'s
//             progressive per-chunk route history — "C2+ chunks will add routes here as each chunk
//             adds services", same convention here).
//             — P3-A C1 — 2026-07-10 (ping + read-tunables) / C2 — 2026-07-10 (open-session-as +
//             run-session-sweep, driving the REAL SessionService — Lesson #3 anti-fabrication)
//
// `CoreLoopsTestController` — TEST-ONLY probe routes for the P3-A core-loops surface (session runtime +
// Loop 10 governor + HighestLeverageCard). Mounted ONLY when `testControllersEnabled()` (R-EC-2).
//
// C1 routes:
//   GET /v1/_test/core-loops/ping
//     -> { ok: true } — proves CoreLoopsModule is in the DI graph.
//
//   GET /v1/_test/core-loops/read-tunables
//     Returns EVERY `coreLoopsTunables.*` getter's REAL resolved value (core-loops-tunables.ts) as a
//     JSON-safe object — every getter CALLED (not echoed as a function reference), anti-fabrication:
//     reads REAL getter output, not a hardcoded echo. `structuralCapForPlayer` is also probed via a
//     `?playerId=` query param (defaults to a fixed test uuid when omitted) to prove the D8 seam
//     resolves without touching any DB. Used by `core_loops_tunables.spec.ts` to assert value-sensitive
//     defaults AND a real DB-override flip (mirrors `political_catalogue.spec.ts`'s C1-5/C1-6 pattern).
//     P3-C C1 (2026-07-12) EXTENDS this SAME response with the 38 new `core_loops.backpressure_*`/
//     `core_loops.sinuosity_*`/`core_loops.mycelial_*` getters (same `coreLoopsTunables` object — no
//     separate route, unlike flag-discipline's own `flagDisciplineTunables` which needed one). Used by
//     `supply_chain_tunables.spec.ts`.
//     P3-D C1 (2026-07-13) EXTENDS this SAME response again with the 16 new `core_loops.cue_stack_*`/
//     `core_loops.annealing_*` getters (same `coreLoopsTunables` object, same route). Used by
//     `cue_annealing_tunables.spec.ts`.
//     P3-E C1 (2026-07-17) EXTENDS this SAME response again with the 31 new `core_loops.demolition_*`/
//     `core_loops.compression_*` getters (same `coreLoopsTunables` object, same route). Used by
//     `demolition_compression_tunables.spec.ts`.
//
// C2 routes (E2E ergonomics, DD-P4):
//   POST /v1/_test/core-loops/open-session-as
//     Body { playerId, client_version? }. Calls `SessionService.open` DIRECTLY (bypasses the JWT/account
//     bridge `SessionController` requires) — used by specs that need a session opened for an arbitrary
//     seeded player without signing a JWT for every test player. Response = the SAME session-open
//     sequence payload the real endpoint returns (P3-A C7 — `{session_id, hl_card, queue, backlog_badge,
//     queue_pressure_band, structural_budget}`; was the `{ session_id }` skeleton pre-C7).
//
//   POST /v1/_test/core-loops/run-session-sweep
//     Body { playerId, gameMinute? }. Calls `SessionService.sweepStaleForPlayer` DIRECTLY — the SAME
//     method the `SESSION_SWEEP` HOURLY/5 tick calls (Lesson #3 — zero live-vs-test divergence).
//     Response `{ swept: true }` (mirrors `distribution-test.controller.ts`'s `run-resolution-sweep`).
//
// C3 routes (E2E ergonomics, DD-P4):
//   POST /v1/_test/core-loops/run-exception-tick
//     Body { playerId, gameMinute? }. Calls `ExceptionQueueTickService.runTick` DIRECTLY — the SAME
//     method the `EXCEPTION_QUEUE_TICK` NIGHTLY/22 tick calls (Lesson #3 — zero live-vs-test
//     divergence). `gameMinute` defaults to 0 (no scheduler ctx here — mirrors `run-session-sweep`'s
//     OWN `gameMinute?` param / the `SessionClosedEvent` "gameMinute=0 for the explicit HTTP path"
//     convention, `city-event-bus.ts:1493-1494`) and is stamped verbatim onto any `ExceptionAgedOutEvent`
//     this call emits (⊥ C3 MINOR-3 fold — previously hardcoded 0 regardless of caller).
//     Response `{ repriced, agedOut }` (the falsifiable proof surface — plan §C3).
//
//   POST /v1/_test/core-loops/set-emitted-at
//     Body { exceptionId, hoursAgo }. Raw test-fixture column write (mirrors `effect-engine-test.
//     controller.ts`'s `seedActiveEvent`/`seedModifier` — a direct DB write for a state NO real
//     production caller ever sets, unlike `open-session-as`/`run-*-sweep` which drive REAL services).
//     Sets `emitted_at = now() - hoursAgo hours` so a card can be aged deterministically for the
//     aged-out / re-priority falsifiable proofs. Response `{ exceptionId, emittedAt }`.
//
//   POST /v1/_test/core-loops/seed-pending-exception
//     Body { playerId, lieutenantId?, severity?, eventDescriptor?, confidence?, candidateActions?,
//     suggestedAction? }. Calls `ExceptionsRepository.insert` DIRECTLY (the REAL D5 cap-guard code
//     path) — NOT named in the plan's test-route bullet, added because the 3 EXISTING event-driven
//     producers all dedup to AT MOST ONE pending card per lieutenant BEFORE they ever reach `insert()`
//     (`hasPendingForLieutenant`/`hasPendingPlayerLevelCard`), so none of them can drive 20 SIMULTANEOUS
//     pending cards for one lieutenant — the exact state the D5 cap-guard falsifiable proof (plan §C3:
//     "20 pending seeded for one lieutenant → 21st insert refused … while the 20th succeeded") requires.
//     This route bypasses ONLY the producer-level dedup (an orthogonal, pre-existing concern) while
//     still exercising the REAL repository insert + its REAL cap guard — the SAME method the
//     resolve/producer paths call. `confidence`/`candidateActions`/`suggestedAction` (C4 addition) let
//     `escalation_log.spec.ts` seed the exact `suggested_disposition`/`script_complexity_band`
//     falsifiable states (a low-confidence card; an ADD_RULE-capable candidate) — each defaults to the
//     SAME value the column default already produced before this addition (`0` / `[]` / `{}`), so
//     existing callers that omit them are byte-identical. Response `{ exceptionId: string | null }` —
//     `null` iff the D5 guard refused the insert.
//
//   GET /v1/_test/core-loops/aged-out-events?exceptionId=
//     In-memory capture of `ExceptionAgedOutEvent`s (mirrors `IATestController`'s
//     `discovered-events` capture-probe convention — `onModuleInit` subscribes the SAME way a real
//     P3-B/E/telemetry consumer eventually would). Response `{ count, events }`, optionally filtered by
//     `exceptionId`. Used by `exception_tick_priority.spec.ts` to prove the event actually fired (not
//     merely that the DB row transitioned).
//
// C4 routes (⊥ C3 MINOR-2 fold falsifiable probes):
//   POST /v1/_test/core-loops/probe-mark-aged-out
//     Body { exceptionId }. Calls `ExceptionsRepository.markAgedOut([exceptionId])` DIRECTLY —
//     deliberately WITHOUT the fresh `listPending` re-check `runTick` always does first, simulating the
//     MINOR-2 race window (the tick selected this id as pending; a resolve raced in before the UPDATE).
//     Proves the repository's OWN `resolution_status='pending'` WHERE guard (not any caller-side
//     precondition) is what protects an already-resolved/escalated card from being clobbered to
//     `aged_out`. Response `{ updated: Array<{ id: string; lieutenantId: string | null }> }` — EMPTY iff
//     the id was no longer pending (the guard excluded it).
//
//   POST /v1/_test/core-loops/probe-update-priorities
//     Body { exceptionId, newPriority }. Calls `ExceptionsRepository.updatePriorities([{exceptionId,
//     newPriority}])` DIRECTLY — the SAME race-simulation shape as the probe above, for the milder
//     `updatePriorities` exposure (this method never touches `resolution_status`, so there is no
//     clobber-to-`aged_out` risk; the guard instead stops a stale priority write from landing on an
//     already-finalized card). Response `{ updatedCount: number }` — `0` iff the id was no longer
//     pending (the guard excluded it; the row's `priority` is left byte-unchanged).
//
// C5 routes (Loop 10 governor — D7 strict-mode boot-check falsifiable proof):
//   POST /v1/_test/core-loops/validate-catalogue
//     Body { catalogue?: Array<{code, key, live, site?}> }. Calls the REAL
//     `validateStructuralDecisionCatalogueStrictMode` DIRECTLY — the EXACT function
//     `Loop10Module.onApplicationBootstrap` runs at real boot (Lesson #3 — zero live-vs-test
//     divergence). Body omitted → validates the REAL production `STRUCTURAL_DECISION_CATALOGUE`
//     (proving the app's own catalogue is boot-valid — it must be, since the app is UP and serving this
//     very request). Body supplied → validates the CALLER's array instead — this is how the "a
//     `live:true` entry with no registered site → boot failure" falsifiable proof (plan §C5) is driven
//     WITHOUT crashing the real server under test or ever mutating the production catalogue: the bad
//     entry exists only in the spec's local request body, "removed" the instant the request completes
//     (nothing is ever written anywhere). Response `{ valid: boolean; error?: string }`.
//
// C6-fix routes (⊥ IMPORTANT-1 gate, MINOR-2 fold — the graceful-degrade falsifiable proof):
//   POST /v1/_test/core-loops/arm-hl-provider-failure
//     Body { providerType }. Calls `HlCardFaultInjector.arm` DIRECTLY — the SAME injector
//     `HlCardService#computeAndPersist` consumes before calling that EXACT provider's `getCandidates`
//     on its NEXT compute-at-open (one-shot). Lets `hl_card.spec.ts` force a provider to throw WITHOUT
//     touching any provider's real code — proving `SessionService#open`'s try/catch degrades to "no HL
//     card this cycle" instead of 500ing. Response `{ armed: true }`.
//
// P3-B C1 routes (data model + tunables foundation — mig 0123 prov.):
//   GET /v1/_test/core-loops/read-flag-tunables
//     Returns EVERY `flagDisciplineTunables.*` getter's REAL resolved value (flag_discipline/
//     flag-discipline-tunables.ts) as a JSON-safe object — mirrors `read-tunables`'s own contract
//     (anti-fabrication: reads REAL getter output, not a hardcoded echo). Registered HERE (the
//     already-wired `CoreLoopsModule`) rather than on a not-yet-built `FlagDisciplineModule` (C2 —
//     DD-P2 leaf module) so C1's floor can prove the tunables are real/value-sensitive/DB-override-
//     flippable WITHOUT pulling LieutenantModule/ExceptionsModule into the dependency graph a chunk
//     early (the module-cycle wall, design §12 hazard 1 — same reasoning `read-tunables` itself
//     followed at P3-A C1 before `SessionModule` existed on this controller's imports). Used by
//     `flag_discipline_tunables.spec.ts`.
//
// P3-B C2 routes (token & flag state machine — DD-P4):
//   POST /v1/_test/core-loops/force-flag
//     Body { routineItemId, gameMinute? }. Calls `FlagDisciplineService.flagItem` DIRECTLY — the REAL
//     flag-creation path (atomic token deduct -> INSERT flagged_items + flip routine_items.status ->
//     FlagRaisedEvent; NEVER a direct INSERT — DD-P4). Response = the REAL `FlagItemResult`
//     (`{flagged:true, flagId}` or `{flagged:false, reason}`) — the falsifiable proof surface for the
//     token-deduct/insert-race/compensation scenarios (plan §C2).
//
//   POST /v1/_test/core-loops/set-tokens
//     Body { lieutenantId, playerId, tokens }. Calls `FlagDisciplineRepository.setTokensForTest` DIRECTLY
//     — a bounded, test-only raw column write (ensures the state row exists, then sets `credibility_
//     tokens` to EXACTLY the given value — mirrors `set-emitted-at`'s raw-write convention). Response
//     `{ lieutenantId, tokens }` (the value actually stored — verifiable by the caller; a negative value
//     is rejected by the CHECK constraint, same as every other write path).
//
//   POST /v1/_test/core-loops/set-flagged-at
//     Body { flagId, hoursAgo }. Calls `FlagDisciplineRepository.setFlaggedAtForTest` DIRECTLY — the
//     `set-emitted-at` analog: ages a flag's `flagged_at` deterministically (`now() - hoursAgo hours`,
//     computed here in TS) for the C4 NIGHTLY-tick timeout falsifiable proofs (this chunk proves only the
//     write itself; the timeout CONSEQUENCE is C4's own tick). Response `{ flagId, flaggedAt }`.
//
// P3-B C3 routes (generator registry + 5 generators, DD-P4):
//   POST /v1/_test/core-loops/run-generation
//     Body { playerId, gameDay }. Calls `RoutineItemGenerationService.runGeneration` DIRECTLY — the SAME
//     entry-point the C4 NIGHTLY tick's step 4 will call (Lesson #3 — zero live-vs-test divergence): runs
//     the REAL closed 5-generator registry, persists `routine_items` (UNIQUE + ON CONFLICT DO NOTHING —
//     DB-enforced dedup, never app-checked), and flags each freshly-inserted candidate whose deviation
//     score clears the tenure-modulated threshold via the REAL `FlagDisciplineService.flagItem` path (a
//     re-run of the SAME (playerId, gameDay) is therefore a genuine zero-new-rows proof, not a skipped
//     no-op). Response = the REAL per-generator `RunGenerationResult` (candidate/inserted/flagged counts
//     per generator code) — the falsifiable proof surface for plan §C3.
//
// P3-B C4 routes (NIGHTLY tick — 5 ordered steps + exhaustion fallback, DD-P4):
//   POST /v1/_test/core-loops/run-flag-tick
//     Body { playerId, gameDay, gameMinute? }. Calls `FlagDisciplineTickService.runTick` DIRECTLY — the
//     SAME method the `FLAG_DISCIPLINE_TICK` NIGHTLY/24 scheduler slot calls (Lesson #3 — zero
//     live-vs-test divergence; the scheduler derives `gameDay` from `ctx.gameMinute`, this route takes
//     `gameDay` directly — mirrors `run-generation`'s own `gameDay`-keyed signature, design's own naming
//     `run-flag-tick(playerId, gameDay)`). Response = the REAL `FlagDisciplineTickResult` (per-step
//     counts: autoConfirmed / timedOut / regenApplied / generation / exhaustionRaised / exhaustionDeduped
//     / exhaustionCapRefused / pruned) — the falsifiable proof surface for plan §C4.
//
// P3-B C5 routes (weekly reset + convergence, DD-P4):
//   POST /v1/_test/core-loops/run-weekly-reset
//     Body { playerId, gameDay, gameMinute? }. Calls `FlagWeeklyResetTickService.runTick` DIRECTLY — the
//     SAME method the `FLAG_WEEKLY_RESET_TICK` WEEKLY/13 scheduler slot calls (Lesson #3 — zero
//     live-vs-test divergence; mirrors `run-flag-tick`'s own `gameDay`-keyed signature). Response
//     `{ resetCount }` — the D8 falsifiable proof surface (exact rows touched; zero on a same-epoch
//     re-run, plan §C5).
//
//   GET /v1/_test/core-loops/evaluate-convergence?lieutenantId=&currentGameDay=
//     Calls `FlagConvergenceService.evaluateConvergenceForLieutenant` DIRECTLY — the REAL window query +
//     tenure-bucket resolution + the PURE `evaluateConvergence` formula (design §7). Response
//     `{ bucket, sample, dismissedCount, isLowTenure }` — the falsifiable proof surface: the spec
//     independently precomputes `bucket` via a direct import of `evaluateConvergence`/`convergence.ts`
//     fed the SAME `sample`/`dismissedCount`/`isLowTenure` it seeded, and asserts equality (would FAIL
//     under formula drift, plan §C5).
//
//   GET /v1/_test/core-loops/flag-frequency-band?lieutenantId=&currentGameDay=
//     Calls `FlagConvergenceService.frequencyBandForLieutenant` DIRECTLY — the REAL last-7-game-days
//     window query + the PURE `frequencyBand` formula (design §7). Response `{ band, count }`.
//
// C6+ chunks will add routes here as each chunk adds services. No route is ever removed.

import { Body, Controller, Get, HttpCode, HttpStatus, OnModuleInit, Post, Query, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { coreLoopsTunables } from './core-loops-tunables';
import { flagDisciplineTunables } from './flag_discipline/flag-discipline-tunables';
import { FlagDisciplineService, type FlagItemResult } from './flag_discipline/flag-discipline.service';
import { FlagDisciplineRepository } from './flag_discipline/flag-discipline.repository';
import { RoutineItemGenerationService, type RunGenerationResult } from './flag_discipline/routine-item-generation.service';
import { FlagDisciplineTickService, type FlagDisciplineTickResult } from './flag_discipline/flag-discipline-tick.service';
import { FlagWeeklyResetTickService, type FlagWeeklyResetTickResult } from './flag_discipline/flag-weekly-reset-tick.service';
import { FlagConvergenceService, type ConvergenceEvaluationResult, type FrequencyBandResult } from './flag_discipline/flag-convergence.service';
import { SessionService } from '../session/session.service';
import { ExceptionQueueTickService, type ExceptionQueueTickResult } from '../exceptions/exception-queue-tick.service';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import type { CandidateActionView } from '../exceptions/exceptions.projection.service';
import { CityEventBus, type ExceptionAgedOutEvent } from '../citysim/events/city-event-bus';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { exceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import {
  STRUCTURAL_DECISION_CATALOGUE,
  validateStructuralDecisionCatalogueStrictMode,
  type StructuralDecisionCatalogueEntry,
} from '../progression/loop10/structural-decision-catalogue';
import { HlCardFaultInjector } from '../progression/loop10/hl-card-fault-injector';
import { HlCardProviderType } from '../progression/loop10/hl-card-types';
import type { SessionOpenSequencePayload } from '../session/session-open-sequence.service';

/** Fixed test-only uuid used when the caller omits `?playerId=` on `read-tunables` (the D8 seam probe). */
const DEFAULT_TEST_PLAYER_ID = '00000000-0000-0000-0000-000000000000';

/** The `ExceptionAgedOutEvent` capture shape — verbatim the event payload (R2.2/P5 — already qualitative). */
interface CapturedExceptionAgedOutEvent {
  readonly playerId: string;
  readonly exceptionId: string;
  readonly lieutenantId: string | null;
  readonly fallback: 'NO_OP';
  readonly gameMinute: number;
}

/**
 * Test-only probe controller for `CoreLoopsModule`.
 *
 * All routes live under the `/v1/_test/core-loops/` prefix.
 * Mounted conditionally by `CoreLoopsModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../protocol/test-routes-gate)
 */
@Controller()
export class CoreLoopsTestController implements OnModuleInit {
  // C3: in-memory capture of ExceptionAgedOutEvents for the E2E "event observed" falsifiable proof
  // (mirrors ia-test.controller.ts's onModuleInit capture-probe convention).
  private readonly _capturedAgedOutEvents: CapturedExceptionAgedOutEvent[] = [];

  constructor(
    private readonly sessions: SessionService,
    private readonly exceptionQueueTick: ExceptionQueueTickService,
    private readonly exceptionsRepo: ExceptionsRepository,
    private readonly bus: CityEventBus,
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly hlCardFaultInjector: HlCardFaultInjector,
    private readonly flagDiscipline: FlagDisciplineService,
    private readonly flagDisciplineRepo: FlagDisciplineRepository,
    private readonly routineItemGeneration: RoutineItemGenerationService,
    private readonly flagDisciplineTick: FlagDisciplineTickService,
    private readonly flagWeeklyResetTick: FlagWeeklyResetTickService,
    private readonly flagConvergence: FlagConvergenceService,
  ) {}

  /** C3: subscribe to ExceptionAgedOutEvent for in-memory capture (capture-only, no side effects — the
   *  tick service itself owns the DB transition; this is purely an E2E observability probe). */
  onModuleInit(): void {
    this.bus.onExceptionAgedOut((event: ExceptionAgedOutEvent) => {
      this._capturedAgedOutEvents.push({
        playerId: event.playerId,
        exceptionId: event.exceptionId,
        lieutenantId: event.lieutenantId,
        fallback: event.fallback,
        gameMinute: event.gameMinute,
      });
    });
  }

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /** C1 connectivity probe: returns { ok: true } if CoreLoopsModule is in the DI graph. */
  @Get('_test/core-loops/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * GET /v1/_test/core-loops/read-tunables?playerId=
   *
   * Returns every `coreLoopsTunables.*` getter's REAL resolved value, JSON-safe. See file header for
   * the full contract.
   */
  @Get('_test/core-loops/read-tunables')
  readTunables(@Query('playerId') playerId?: string): Record<string, unknown> {
    return {
      exceptionMaxRulesPerLieutenant: coreLoopsTunables.exceptionMaxRulesPerLieutenant,
      exceptionQueueCapPerLieutenant: coreLoopsTunables.exceptionQueueCapPerLieutenant,
      exceptionPriorityDecayPeriodHours: coreLoopsTunables.exceptionPriorityDecayPeriodHours,
      exceptionSuggestedActionConfidenceThreshold: coreLoopsTunables.exceptionSuggestedActionConfidenceThreshold,
      exceptionBacklogBadgeThreshold: coreLoopsTunables.exceptionBacklogBadgeThreshold,
      exceptionAgedOutHorizonHours: coreLoopsTunables.exceptionAgedOutHorizonHours,
      exceptionPriorityAgeMaxFactor: coreLoopsTunables.exceptionPriorityAgeMaxFactor,
      oneDecisionStructuralPerSessionCap: coreLoopsTunables.oneDecisionStructuralPerSessionCap,
      oneDecisionQueueDepthVisible: coreLoopsTunables.oneDecisionQueueDepthVisible,
      oneDecisionSkipCarryForwardPriorityDecayPct: coreLoopsTunables.oneDecisionSkipCarryForwardPriorityDecayPct,
      oneDecisionClassificationStrictMode: coreLoopsTunables.oneDecisionClassificationStrictMode,
      oneDecisionComputeAtSessionStartLatencyMsBudget: coreLoopsTunables.oneDecisionComputeAtSessionStartLatencyMsBudget,
      oneDecisionEnforceWithoutSession: coreLoopsTunables.oneDecisionEnforceWithoutSession,
      hlEscalationBacklogMin: coreLoopsTunables.hlEscalationBacklogMin,
      oneDecisionConsiderWindowSeconds: coreLoopsTunables.oneDecisionConsiderWindowSeconds,
      sessionOpenSequenceMaxLatencyMs: coreLoopsTunables.sessionOpenSequenceMaxLatencyMs,
      perfBudget05CoreLoopsMaxKbPerPlayer: coreLoopsTunables.perfBudget05CoreLoopsMaxKbPerPlayer,
      sessionStaleTimeoutRealMinutes: coreLoopsTunables.sessionStaleTimeoutRealMinutes,
      structuralCapForPlayer: coreLoopsTunables.structuralCapForPlayer(playerId ?? DEFAULT_TEST_PLAYER_ID),
      // P3-C C1 — Loop 3 Backpressure Trace (9 getters, same coreLoopsTunables object — no separate route).
      backpressurePressurePerTickWhenBlocked: coreLoopsTunables.backpressurePressurePerTickWhenBlocked,
      backpressurePropagationDecayPerHop: coreLoopsTunables.backpressurePropagationDecayPerHop,
      backpressureSensitivityCoefficient: coreLoopsTunables.backpressureSensitivityCoefficient,
      backpressureMinimumPressureFloor: coreLoopsTunables.backpressureMinimumPressureFloor,
      backpressureCriticalThreshold: coreLoopsTunables.backpressureCriticalThreshold,
      backpressureWarmThreshold: coreLoopsTunables.backpressureWarmThreshold,
      backpressureMildThreshold: coreLoopsTunables.backpressureMildThreshold,
      backpressureMaxPropagationHops: coreLoopsTunables.backpressureMaxPropagationHops,
      backpressureReliefPerTick: coreLoopsTunables.backpressureReliefPerTick,
      // P3-C C1 — Loop 4 Sinuosity Debt (12 getters).
      sinuosityCollapseThreshold: coreLoopsTunables.sinuosityCollapseThreshold,
      sinuosityPerRerouteIncrement: coreLoopsTunables.sinuosityPerRerouteIncrement,
      sinuosityStressWarningThreshold: coreLoopsTunables.sinuosityStressWarningThreshold,
      sinuosityRebuildThroughputPenaltyDurationTicks: coreLoopsTunables.sinuosityRebuildThroughputPenaltyDurationTicks,
      sinuosityMinimalRerouteCostCents: coreLoopsTunables.sinuosityMinimalRerouteCostCents,
      sinuosityModerateRestructureCostCents: coreLoopsTunables.sinuosityModerateRestructureCostCents,
      sinuosityFullGeometricResetCostCents: coreLoopsTunables.sinuosityFullGeometricResetCostCents,
      sinuosityModerateRestructureReductionPct: coreLoopsTunables.sinuosityModerateRestructureReductionPct,
      sinuosityFullGeometricResetBaselineTarget: coreLoopsTunables.sinuosityFullGeometricResetBaselineTarget,
      sinuosityPristineBucketUpperBound: coreLoopsTunables.sinuosityPristineBucketUpperBound,
      sinuosityStressedBucketUpperBound: coreLoopsTunables.sinuosityStressedBucketUpperBound,
      sinuosityCriticalBucketUpperBound: coreLoopsTunables.sinuosityCriticalBucketUpperBound,
      // P3-C C1 — Loop 5 Mycelial Ledger (17 getters).
      mycelialDebtAccrualMultiplier: coreLoopsTunables.mycelialDebtAccrualMultiplier,
      mycelialStressThreshold: coreLoopsTunables.mycelialStressThreshold,
      mycelialThroughputPenaltyAtStressPct: coreLoopsTunables.mycelialThroughputPenaltyAtStressPct,
      mycelialNaturalDecayPerMinute: coreLoopsTunables.mycelialNaturalDecayPerMinute,
      mycelialQuickPatchResidualDebt: coreLoopsTunables.mycelialQuickPatchResidualDebt,
      mycelialQuickPatchDurationTicks: coreLoopsTunables.mycelialQuickPatchDurationTicks,
      mycelialStructuralReinforceDurationTicks: coreLoopsTunables.mycelialStructuralReinforceDurationTicks,
      mycelialSinuosityDebtAccelerationCoefficient: coreLoopsTunables.mycelialSinuosityDebtAccelerationCoefficient,
      mycelialDebtAccrualExponent: coreLoopsTunables.mycelialDebtAccrualExponent,
      mycelialCoolingPeriodTicksForDecayStart: coreLoopsTunables.mycelialCoolingPeriodTicksForDecayStart,
      mycelialBypassSetupCostCents: coreLoopsTunables.mycelialBypassSetupCostCents,
      mycelialThroughputNormalizationGrams: coreLoopsTunables.mycelialThroughputNormalizationGrams,
      mycelialBackpressureFeedCoefficient: coreLoopsTunables.mycelialBackpressureFeedCoefficient,
      mycelialDebtCap: coreLoopsTunables.mycelialDebtCap,
      mycelialBypassResumeThreshold: coreLoopsTunables.mycelialBypassResumeThreshold,
      mycelialQuickPatchCostCents: coreLoopsTunables.mycelialQuickPatchCostCents,
      mycelialStructuralReinforceCostCents: coreLoopsTunables.mycelialStructuralReinforceCostCents,
      // P3-D C1 — Loop 6 Cue Stack Integrity (8 getters, same coreLoopsTunables object — no separate route).
      cueStackDepthSlotsMax: coreLoopsTunables.cueStackDepthSlotsMax,
      cueStackRecoveryCostMultiplier: coreLoopsTunables.cueStackRecoveryCostMultiplier,
      cueStackNamedSequencesMax: coreLoopsTunables.cueStackNamedSequencesMax,
      cueStackSlotMinutesDistributionRun: coreLoopsTunables.cueStackSlotMinutesDistributionRun,
      cueStackSlotMinutesMaintenanceBatch: coreLoopsTunables.cueStackSlotMinutesMaintenanceBatch,
      cueStackSlotMinutesRecruitmentStep: coreLoopsTunables.cueStackSlotMinutesRecruitmentStep,
      cueStackSlotMinutesExceptionBatch: coreLoopsTunables.cueStackSlotMinutesExceptionBatch,
      cueStackStaleExecutingHorizonHours: coreLoopsTunables.cueStackStaleExecutingHorizonHours,
      // P3-D C1 — Loop 7 Annealing Window (8 getters).
      annealingBaseSettlingMinutes: coreLoopsTunables.annealingBaseSettlingMinutes,
      annealingBandShortUpperMinutes: coreLoopsTunables.annealingBandShortUpperMinutes,
      annealingBandMediumUpperMinutes: coreLoopsTunables.annealingBandMediumUpperMinutes,
      annealingBandLongUpperMinutes: coreLoopsTunables.annealingBandLongUpperMinutes,
      annealingCompoundingMultiplier: coreLoopsTunables.annealingCompoundingMultiplier,
      annealingThroughputReductionPct: coreLoopsTunables.annealingThroughputReductionPct,
      annealingCompoundingThroughputPenalty: coreLoopsTunables.annealingCompoundingThroughputPenalty,
      annealingTouchableMinimumCount: coreLoopsTunables.annealingTouchableMinimumCount,
      // P3-E C1 — Loop 8 Demolition Mandate (12 getters, same coreLoopsTunables object — no separate route).
      demolitionFrictionBudgetThresholdMultiplierOfOrgSize: coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize,
      demolitionEfficiencyPenaltyCurve: coreLoopsTunables.demolitionEfficiencyPenaltyCurve,
      demolitionEfficiencyPenaltyMultiplierBaseline: coreLoopsTunables.demolitionEfficiencyPenaltyMultiplierBaseline,
      demolitionReplacementOptionsCount: coreLoopsTunables.demolitionReplacementOptionsCount,
      demolitionAgeDecayFactorPerTick: coreLoopsTunables.demolitionAgeDecayFactorPerTick,
      demolitionPerConnectionFrictionModifier: coreLoopsTunables.demolitionPerConnectionFrictionModifier,
      demolitionBaseFrictionPerNode: coreLoopsTunables.demolitionBaseFrictionPerNode,
      demolitionFrictionBucketLightUpperBound: coreLoopsTunables.demolitionFrictionBucketLightUpperBound,
      demolitionFrictionBucketBalancedUpperBound: coreLoopsTunables.demolitionFrictionBucketBalancedUpperBound,
      demolitionFrictionBucketStrainedUpperBound: coreLoopsTunables.demolitionFrictionBucketStrainedUpperBound,
      demolitionDecommissionCostFractionOfSetup: coreLoopsTunables.demolitionDecommissionCostFractionOfSetup,
      demolitionReplacementOptionExpiryGameDays: coreLoopsTunables.demolitionReplacementOptionExpiryGameDays,
      // P3-E C1 — Loop 9 Compression Week (19 getters).
      compressionStressAccumulationRateMultiplier: coreLoopsTunables.compressionStressAccumulationRateMultiplier,
      compressionMaxDecisionBudget: coreLoopsTunables.compressionMaxDecisionBudget,
      compressionStressThresholdTrigger: coreLoopsTunables.compressionStressThresholdTrigger,
      compressionDeferralPenaltyStress: coreLoopsTunables.compressionDeferralPenaltyStress,
      compressionProblemDowngradePerUnaddressedTiers: coreLoopsTunables.compressionProblemDowngradePerUnaddressedTiers,
      compressionSeverityMultiplierAt100Stress: coreLoopsTunables.compressionSeverityMultiplierAt100Stress,
      compressionForceEngagementThreshold: coreLoopsTunables.compressionForceEngagementThreshold,
      compressionMaxSeverityThreshold: coreLoopsTunables.compressionMaxSeverityThreshold,
      compressionPerSessionStressIncrementMax: coreLoopsTunables.compressionPerSessionStressIncrementMax,
      compressionStressDecayPerQuietWeek: coreLoopsTunables.compressionStressDecayPerQuietWeek,
      compressionSupplyChainCapacityPressureWeight: coreLoopsTunables.compressionSupplyChainCapacityPressureWeight,
      compressionUnderstudyUnsyncWeight: coreLoopsTunables.compressionUnderstudyUnsyncWeight,
      compressionLieutenantFlagUnresolvedWeight: coreLoopsTunables.compressionLieutenantFlagUnresolvedWeight,
      compressionCueStackNonOptimalWeight: coreLoopsTunables.compressionCueStackNonOptimalWeight,
      compressionConstraintKnotUnresolvedWeight: coreLoopsTunables.compressionConstraintKnotUnresolvedWeight,
      compressionFrictionPenaltyWeight: coreLoopsTunables.compressionFrictionPenaltyWeight,
      compressionAnnealingStrainWeight: coreLoopsTunables.compressionAnnealingStrainWeight,
      compressionPostResetStress: coreLoopsTunables.compressionPostResetStress,
      compressionStressFloorWithCriticalResidue: coreLoopsTunables.compressionStressFloorWithCriticalResidue,
    };
  }

  // ── C2 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/open-session-as
   *
   * Body { playerId, client_version? }. Calls `SessionService.open` DIRECTLY for the given playerId —
   * bypasses the JWT/account bridge `SessionController` requires (E2E ergonomics, DD-P4). Response =
   * the SAME session-open sequence payload the real `POST /v1/session/open` endpoint returns (P3-A C7).
   */
  @Post('_test/core-loops/open-session-as')
  @HttpCode(HttpStatus.OK)
  async openSessionAs(
    @Body() body: { playerId: string; client_version?: string },
  ): Promise<SessionOpenSequencePayload> {
    return this.sessions.open(body.playerId, body.client_version ?? 'e2e-test-client');
  }

  /**
   * POST /v1/_test/core-loops/run-session-sweep
   *
   * Body { playerId, gameMinute? }. Calls `SessionService.sweepStaleForPlayer` DIRECTLY — the SAME
   * method the `SESSION_SWEEP` HOURLY/5 tick calls (Lesson #3 — zero live-vs-test divergence). Response
   * `{ swept: true }` (mirrors `distribution-test.controller.ts`'s `run-resolution-sweep`).
   */
  @Post('_test/core-loops/run-session-sweep')
  @HttpCode(HttpStatus.OK)
  async runSessionSweep(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<{ swept: true }> {
    await this.sessions.sweepStaleForPlayer(body.playerId, body.gameMinute ?? 0);
    return { swept: true };
  }

  // ── C3 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/run-exception-tick
   *
   * Body { playerId, gameMinute? }. Calls `ExceptionQueueTickService.runTick` DIRECTLY — the SAME method
   * the `EXCEPTION_QUEUE_TICK` NIGHTLY/22 tick calls (Lesson #3 — zero live-vs-test divergence).
   * `gameMinute` (⊥ C3 MINOR-3 fold) defaults to 0 — no scheduler ctx here, mirrors
   * `run-session-sweep`'s own `gameMinute?` param above — and is stamped onto any `ExceptionAgedOutEvent`
   * this call emits. Response `{ repriced, agedOut }` — the falsifiable proof surface (plan §C3): a
   * defect that leaves the recompute flat/absent, or one that never archives past-horizon cards, is
   * directly observable here.
   */
  @Post('_test/core-loops/run-exception-tick')
  @HttpCode(HttpStatus.OK)
  async runExceptionTick(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<ExceptionQueueTickResult> {
    return this.exceptionQueueTick.runTick(body.playerId, body.gameMinute ?? 0);
  }

  /**
   * POST /v1/_test/core-loops/set-emitted-at
   *
   * Body { exceptionId, hoursAgo }. Raw test-fixture column write (mirrors `effect-engine-test.
   * controller.ts`'s `seedActiveEvent`/`seedModifier` direct-DB-write convention — this state has NO
   * real production caller, unlike `open-session-as`/`run-session-sweep`/`run-exception-tick` which
   * drive REAL services). Sets `emitted_at = now() − hoursAgo hours` (computed here in TS, ONE
   * parameterized UPDATE — no raw interval-string SQL) so a card can be aged deterministically for the
   * aged-out / re-priority falsifiable proofs (`exception_tick_priority.spec.ts`). Response
   * `{ exceptionId, emittedAt }` (the ISO timestamp actually written — verifiable by the caller).
   */
  @Post('_test/core-loops/set-emitted-at')
  @HttpCode(HttpStatus.OK)
  async setEmittedAt(
    @Body() body: { exceptionId: string; hoursAgo: number },
  ): Promise<{ exceptionId: string; emittedAt: string }> {
    const emittedAt = new Date(Date.now() - body.hoursAgo * 3_600_000);
    await this.db.update(exceptionQueueRow).set({ emitted_at: emittedAt }).where(eq(exceptionQueueRow.exception_id, body.exceptionId));
    return { exceptionId: body.exceptionId, emittedAt: emittedAt.toISOString() };
  }

  /**
   * POST /v1/_test/core-loops/seed-pending-exception
   *
   * Body { playerId, lieutenantId?, severity?, eventDescriptor?, confidence?, candidateActions?,
   * suggestedAction? }. Calls `ExceptionsRepository.insert` DIRECTLY — the REAL D5 cap-guard path (see
   * file header for why this exists: the 3 real producers all dedup to 1-pending-max before reaching
   * `insert`). The 3 new C4 params (`confidence`/`candidateActions`/`suggestedAction`) default to
   * EXACTLY the values the column defaults already produced when omitted (`0`/`[]`/`{}`) — byte-identical
   * for every existing caller. Response `{ exceptionId: string | null }` — `null` iff the cap guard
   * refused (D5, sub-decision #5).
   */
  @Post('_test/core-loops/seed-pending-exception')
  @HttpCode(HttpStatus.OK)
  async seedPendingException(
    @Body()
    body: {
      playerId: string;
      lieutenantId?: string | null;
      severity?: number;
      eventDescriptor?: string;
      confidence?: number;
      candidateActions?: CandidateActionView[];
      suggestedAction?: CandidateActionView;
    },
  ): Promise<{ exceptionId: string | null }> {
    const exceptionId = await this.exceptionsRepo.insert({
      player_id: body.playerId,
      lieutenant_id: body.lieutenantId ?? null,
      event_descriptor: body.eventDescriptor ?? 'card.test.core_loops_seed',
      severity: body.severity ?? 50,
      confidence: body.confidence ?? 0,
      candidate_actions: body.candidateActions ?? [],
      suggested_action: body.suggestedAction ?? {},
      resolution_status: 'pending',
    });
    return { exceptionId };
  }

  /**
   * GET /v1/_test/core-loops/aged-out-events?exceptionId=
   *
   * In-memory capture of `ExceptionAgedOutEvent`s (see file header). Optionally filtered by
   * `exceptionId`. Returns `{ count, events }`.
   */
  @Get('_test/core-loops/aged-out-events')
  getAgedOutEvents(
    @Query('exceptionId') exceptionId?: string,
  ): { count: number; events: CapturedExceptionAgedOutEvent[] } {
    const events = exceptionId
      ? this._capturedAgedOutEvents.filter((e) => e.exceptionId === exceptionId)
      : [...this._capturedAgedOutEvents];
    return { count: events.length, events };
  }

  // ── C4 (⊥ C3 MINOR-2 fold falsifiable probes) ─────────────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/probe-mark-aged-out
   *
   * Body { exceptionId }. Calls `ExceptionsRepository.markAgedOut([exceptionId])` DIRECTLY — see file
   * header for the race this simulates. Response `{ updated: Array<{id, lieutenantId}> }`.
   */
  @Post('_test/core-loops/probe-mark-aged-out')
  @HttpCode(HttpStatus.OK)
  async probeMarkAgedOut(
    @Body() body: { exceptionId: string },
  ): Promise<{ updated: Array<{ id: string; lieutenantId: string | null }> }> {
    const updated = await this.exceptionsRepo.markAgedOut([body.exceptionId]);
    return { updated };
  }

  /**
   * POST /v1/_test/core-loops/probe-update-priorities
   *
   * Body { exceptionId, newPriority }. Calls `ExceptionsRepository.updatePriorities([{exceptionId,
   * newPriority}])` DIRECTLY — see file header for the race this simulates. Response
   * `{ updatedCount: number }` (the repo's own return — NOT the actual affected-row count; see the
   * repo docstring: `updatePriorities` returns `updates.length` regardless of the WHERE's own filtering,
   * so the spec asserts the row's `priority` DIRECTLY via `runsql`, not this count).
   */
  @Post('_test/core-loops/probe-update-priorities')
  @HttpCode(HttpStatus.OK)
  async probeUpdatePriorities(
    @Body() body: { exceptionId: string; newPriority: number },
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await this.exceptionsRepo.updatePriorities([
      { exceptionId: body.exceptionId, newPriority: body.newPriority },
    ]);
    return { updatedCount };
  }

  // ── C5 (D7 strict-mode boot-check falsifiable probe) ──────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/validate-catalogue
   *
   * Body { catalogue?: Array<{code, key, live, site?}> }. Runs the REAL
   * `validateStructuralDecisionCatalogueStrictMode` — see file header for the full contract. Response
   * `{ valid: boolean; error?: string }`.
   */
  @Post('_test/core-loops/validate-catalogue')
  @HttpCode(HttpStatus.OK)
  validateCatalogue(
    @Body() body: { catalogue?: StructuralDecisionCatalogueEntry[] },
  ): { valid: boolean; error?: string } {
    const catalogue = body.catalogue ?? STRUCTURAL_DECISION_CATALOGUE;
    try {
      validateStructuralDecisionCatalogueStrictMode(catalogue);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── C6-fix (⊥ IMPORTANT-1 gate, MINOR-2 fold — graceful-degrade falsifiable proof) ───────────────

  /**
   * POST /v1/_test/core-loops/arm-hl-provider-failure
   *
   * Body { providerType }. Calls `HlCardFaultInjector.arm` DIRECTLY — see file header for the full
   * contract. Response `{ armed: true }`.
   */
  @Post('_test/core-loops/arm-hl-provider-failure')
  @HttpCode(HttpStatus.OK)
  armHlProviderFailure(@Body() body: { providerType: string }): { armed: true } {
    this.hlCardFaultInjector.arm(body.providerType as HlCardProviderType);
    return { armed: true };
  }

  // ── P3-B C1 (data model + tunables foundation, mig 0123 prov.) ────────────────────────────────

  /**
   * GET /v1/_test/core-loops/read-flag-tunables
   *
   * Returns every `flagDisciplineTunables.*` getter's REAL resolved value, JSON-safe (all 22 keys as of
   * C3 — see `flag-discipline-tunables.ts`'s own header for the R2.3 count reconciliation). See file
   * header for the full contract.
   */
  @Get('_test/core-loops/read-flag-tunables')
  readFlagTunables(): Record<string, unknown> {
    return {
      flagCredibilityTokensMaxPerLieutenant: flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant,
      flagTokenRegenPerDay: flagDisciplineTunables.flagTokenRegenPerDay,
      flagBatchConfirmWindowRealHours: flagDisciplineTunables.flagBatchConfirmWindowRealHours,
      flagDismissalTrustPenaltyModifier: flagDisciplineTunables.flagDismissalTrustPenaltyModifier,
      flagConvergenceEvaluationWindowDays: flagDisciplineTunables.flagConvergenceEvaluationWindowDays,
      flagLowTenureOverflagToleranceMultiplier: flagDisciplineTunables.flagLowTenureOverflagToleranceMultiplier,
      flagConvergenceMinSample: flagDisciplineTunables.flagConvergenceMinSample,
      flagConvergenceOverThreshold: flagDisciplineTunables.flagConvergenceOverThreshold,
      flagConvergenceConvergedThreshold: flagDisciplineTunables.flagConvergenceConvergedThreshold,
      flagDeviationThresholdBase: flagDisciplineTunables.flagDeviationThresholdBase,
      flagTenureConservatismFresh: flagDisciplineTunables.flagTenureConservatismFresh,
      flagTenureConservatismAcclimated: flagDisciplineTunables.flagTenureConservatismAcclimated,
      flagTenureConservatismSeasoned: flagDisciplineTunables.flagTenureConservatismSeasoned,
      flagTenureConservatismSenior: flagDisciplineTunables.flagTenureConservatismSenior,
      flagTenureConservatismEntrenched: flagDisciplineTunables.flagTenureConservatismEntrenched,
      flagExhaustionExceptionUrgencyThreshold: flagDisciplineTunables.flagExhaustionExceptionUrgencyThreshold,
      flagRoutineItemsPerGeneratorDailyCap: flagDisciplineTunables.flagRoutineItemsPerGeneratorDailyCap,
      flagRoutineItemsRetentionDays: flagDisciplineTunables.flagRoutineItemsRetentionDays,
      flagStashReorderFillPointGrams: flagDisciplineTunables.flagStashReorderFillPointGrams,
      flagTrustBudgetLowRatio: flagDisciplineTunables.flagTrustBudgetLowRatio,
      flagTrustBudgetHighRatio: flagDisciplineTunables.flagTrustBudgetHighRatio,
      flagFrequencyBandFrequentMin: flagDisciplineTunables.flagFrequencyBandFrequentMin,
      // D5 seam probe: conservatismForBucket forwards to the 5 per-bucket getters above.
      conservatismForBucketFresh: flagDisciplineTunables.conservatismForBucket('FRESH'),
      conservatismForBucketEntrenched: flagDisciplineTunables.conservatismForBucket('ENTRENCHED'),
    };
  }

  // ── P3-B C2 (token & flag state machine, DD-P4) ────────────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/force-flag
   *
   * Body { routineItemId, gameMinute? }. Calls `FlagDisciplineService.flagItem` DIRECTLY — see file
   * header for the full contract. Response = the REAL `FlagItemResult`.
   */
  @Post('_test/core-loops/force-flag')
  @HttpCode(HttpStatus.OK)
  async forceFlag(
    @Body() body: { routineItemId: string; gameMinute?: number },
  ): Promise<FlagItemResult> {
    return this.flagDiscipline.flagItem(body.routineItemId, body.gameMinute ?? 0);
  }

  /**
   * POST /v1/_test/core-loops/set-tokens
   *
   * Body { lieutenantId, playerId, tokens }. Calls `FlagDisciplineRepository.setTokensForTest` DIRECTLY
   * — see file header for the full contract. Response `{ lieutenantId, tokens }` (the value ACTUALLY
   * stored — read back, not echoed).
   */
  @Post('_test/core-loops/set-tokens')
  @HttpCode(HttpStatus.OK)
  async setTokens(
    @Body() body: { lieutenantId: string; playerId: string; tokens: number },
  ): Promise<{ lieutenantId: string; tokens: number }> {
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    const tokens = await this.flagDisciplineRepo.setTokensForTest(body.lieutenantId, body.playerId, body.tokens, maxTokens);
    return { lieutenantId: body.lieutenantId, tokens };
  }

  /**
   * POST /v1/_test/core-loops/set-flagged-at
   *
   * Body { flagId, hoursAgo }. Calls `FlagDisciplineRepository.setFlaggedAtForTest` DIRECTLY — see file
   * header for the full contract (the `set-emitted-at` analog). Response `{ flagId, flaggedAt }` (the
   * ISO timestamp actually written).
   */
  @Post('_test/core-loops/set-flagged-at')
  @HttpCode(HttpStatus.OK)
  async setFlaggedAt(
    @Body() body: { flagId: string; hoursAgo: number },
  ): Promise<{ flagId: string; flaggedAt: string }> {
    const flaggedAt = new Date(Date.now() - body.hoursAgo * 3_600_000);
    await this.flagDisciplineRepo.setFlaggedAtForTest(body.flagId, flaggedAt);
    return { flagId: body.flagId, flaggedAt: flaggedAt.toISOString() };
  }

  // ── P3-B C3 (generator registry + 5 generators, DD-P4) ─────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/run-generation
   *
   * Body { playerId, gameDay }. Calls `RoutineItemGenerationService.runGeneration` DIRECTLY — see file
   * header for the full contract. Response = the REAL `RunGenerationResult` (per-generator
   * candidate/inserted/flagged counts).
   */
  @Post('_test/core-loops/run-generation')
  @HttpCode(HttpStatus.OK)
  async runGeneration(@Body() body: { playerId: string; gameDay: number }): Promise<RunGenerationResult> {
    return this.routineItemGeneration.runGeneration(body.playerId, body.gameDay);
  }

  // ── P3-B C4 (NIGHTLY tick — 5 ordered steps + exhaustion fallback, DD-P4) ──────────────────────

  /**
   * POST /v1/_test/core-loops/run-flag-tick
   *
   * Body { playerId, gameDay, gameMinute? }. Calls `FlagDisciplineTickService.runTick` DIRECTLY — see
   * file header for the full contract. Response = the REAL `FlagDisciplineTickResult`.
   */
  @Post('_test/core-loops/run-flag-tick')
  @HttpCode(HttpStatus.OK)
  async runFlagTick(
    @Body() body: { playerId: string; gameDay: number; gameMinute?: number },
  ): Promise<FlagDisciplineTickResult> {
    return this.flagDisciplineTick.runTick(body.playerId, body.gameDay, body.gameMinute ?? 0);
  }

  // ── P3-B C5 (weekly reset + convergence, DD-P4) ────────────────────────────────────────────────

  /**
   * POST /v1/_test/core-loops/run-weekly-reset
   *
   * Body { playerId, gameDay, gameMinute? }. Calls `FlagWeeklyResetTickService.runTick` DIRECTLY — see
   * file header for the full contract. Response = the REAL `FlagWeeklyResetTickResult`.
   */
  @Post('_test/core-loops/run-weekly-reset')
  @HttpCode(HttpStatus.OK)
  async runWeeklyReset(
    @Body() body: { playerId: string; gameDay: number; gameMinute?: number },
  ): Promise<FlagWeeklyResetTickResult> {
    return this.flagWeeklyResetTick.runTick(body.playerId, body.gameDay, body.gameMinute ?? 0);
  }

  /**
   * GET /v1/_test/core-loops/evaluate-convergence?lieutenantId=&currentGameDay=
   *
   * Calls `FlagConvergenceService.evaluateConvergenceForLieutenant` DIRECTLY — see file header for the
   * full contract. Response = the REAL `ConvergenceEvaluationResult`.
   */
  @Get('_test/core-loops/evaluate-convergence')
  async evaluateConvergence(
    @Query('lieutenantId') lieutenantId: string,
    @Query('currentGameDay') currentGameDay: string,
  ): Promise<ConvergenceEvaluationResult> {
    return this.flagConvergence.evaluateConvergenceForLieutenant(lieutenantId, Number.parseInt(currentGameDay, 10));
  }

  /**
   * GET /v1/_test/core-loops/flag-frequency-band?lieutenantId=&currentGameDay=
   *
   * Calls `FlagConvergenceService.frequencyBandForLieutenant` DIRECTLY — see file header for the full
   * contract. Response = the REAL `FrequencyBandResult`.
   */
  @Get('_test/core-loops/flag-frequency-band')
  async flagFrequencyBand(
    @Query('lieutenantId') lieutenantId: string,
    @Query('currentGameDay') currentGameDay: string,
  ): Promise<FrequencyBandResult> {
    return this.flagConvergence.frequencyBandForLieutenant(lieutenantId, Number.parseInt(currentGameDay, 10));
  }
}

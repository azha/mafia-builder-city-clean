// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (tunables foundation —
//             the E2E probe route the C1 floor spec needs).
//             Pattern: R-EC-2 test-only controller (mirrors `budgets-horizon-test.controller.ts`'s own C1
//             `ping`/`read-tunables` shape — "C2+ chunks will add routes here as each chunk adds
//             services", same convention here).
//             ★ Own controller, NOT an extension of `budgets-horizon-test.controller.ts`/`delegation-
//             ratchet-test.controller.ts`: DD-H1 mandates `VerticalHorizonModule` as a NEW sibling leaf
//             (mirrors DD-G1's own "no edit to delegation-ratchet.module.ts" reasoning — P3-G C1's own
//             file header) — the ch06 successor lot's own dedicated probe controller, one per sub-lot
//             module, never a shared cross-module hub.
//             — P3-H C1 — 2026-07-24 (ping + read-tunables)
//
// `VerticalHorizonTestController` — TEST-ONLY probe routes for the P3-H Vertical Horizon surface. Mounted
// ONLY when `testControllersEnabled()` (R-EC-2).
//
// C1 routes:
//   GET /v1/_test/vertical-horizon/ping
//     -> { ok: true } — proves VerticalHorizonModule is in the DI graph.
//
//   GET /v1/_test/vertical-horizon/read-tunables
//     Returns EVERY `metaProgressionTunables.*` getter THIS LOT ADDED (the 13 NEW `meta.*` families, design
//     §12 — DD-H5: the SAME shared `meta-progression-tunables.ts` module P3-F/P3-G extended, not a fork) as
//     a JSON-safe object — every getter CALLED (not echoed as a function reference), anti-fabrication:
//     reads REAL getter output, not a hardcoded echo. Used by `vertical_horizon_tunables.spec.ts` to assert
//     value-sensitive defaults AND a real DB/env-override clamp (mirrors `budgets_horizon_tunables.spec.ts`'s
//     own C1 pattern).
//
// C2 routes:
//   POST /v1/_test/vertical-horizon/set-decision-horizon-tier
//     Body { playerId, tier }. A raw test-fixture UPSERT onto `player_progression_state.decision_horizon_
//     tier` — mirrors `delegation-ratchet-test.controller.ts#seedMasteryRow`'s own "direct DB poke, ON
//     CONFLICT DO UPDATE" shape verbatim. `decision_horizon_tier` has NO real writer until C4's
//     `HorizonTierAdvancementService` (design D6) — this fixture lets C2's own E2E specs stage a T2/T3
//     player WITHOUT waiting on C4's counter-gated advance flow (the SAME "direct test-fixture UPDATE"
//     posture C0-reanchor §6/R4 already anticipated for `extinction_state`). Every OTHER column keeps its
//     own schema DEFAULT (an insert-or-update on ONLY this one column). Response `{ playerId, tier }`.
//
// C3 routes:
//   POST /v1/_test/vertical-horizon/run-evaluator-tick
//     Body { playerId, gameMinute }. Drives `ExecutionPlanEvaluatorService.runTick` DIRECTLY — the SAME
//     Lesson #3 "one method both the scheduler and the _test route call" shape `FrictionBudgetTickService`
//     establishes. Response = the REAL `ExecutionPlanEvaluatorTickResult`.
//
//   GET /v1/_test/vertical-horizon/evaluator-events
//     Returns `{ executed: CycleExecutedOnPlanEvent[], aborted: PlanAbortedEvent[] }` — the REAL in-memory
//     test-probe arrays (`ExecutionPlanEvaluatorService.getExecutedEvents`/`getAbortedEvents`, mirrors
//     `IsostaticDebtService`'s own `clearedEvents` probe pattern), proving the bus emit genuinely fired.
//
//   POST /v1/_test/vertical-horizon/clear-evaluator-events
//     Clears both probe arrays (test isolation between specs/runs).
//
//   POST /v1/_test/vertical-horizon/validate-constraint-registry
//     Body { types?: string[] }. Runs the REAL `validateConstraintRegistryStrictMode` — see that
//     function's own header for the full contract (mirrors `budgets-horizon-test.controller.ts#
//     validateCatalogue`'s own "validate-catalogue" shape, the P3-A/P3-F/P3-G strict-mode test precedent).
//     Response `{ valid: boolean; error?: string }`.
//
// NOTE: `lieutenant.extinction_state` / `standing_order.status` test-fixture pokes (C0-reanchor §6/R4's
// own anticipated "C3's spec will set extinction_state='RESOLVED' via a direct test-fixture UPDATE")
// deliberately do NOT get a dedicated route here — the `execution_plan_creation.spec.ts` C2 precedent
// already pokes `standing_order.status` via a direct `runsql` UPDATE (no route needed); the C3 spec mirrors
// that exact convention for `lieutenant.extinction_state` too, no new controller surface required.
//
// C4 routes:
//   GET /v1/_test/vertical-horizon/evaluator-events
//     EXTENDED additively: now ALSO returns `adapted: PlanAdaptedEvent[]` (`AdaptationResolverService.
//     getAdaptedEvents`) alongside the pre-existing `executed`/`aborted` (the C3 spec never asserts the
//     FULL object with `toEqual`, only `.find`/`.some` on `executed`/`aborted` — safe to extend).
//   POST /v1/_test/vertical-horizon/clear-evaluator-events
//     EXTENDED additively: now ALSO clears the resolver's `adaptedEvents` probe.
//
//   POST /v1/_test/vertical-horizon/advance-tier-direct
//     Body { playerId, targetTier }. A RAW repository probe — calls `HorizonTierAdvancementRepository.
//     advanceTier` DIRECTLY, bypassing `HorizonTierAdvancementService`'s counter gate entirely (the
//     design's own "(test hook)" annotation on the out-of-order falsifiable, plan C4 — the REAL business
//     endpoint always derives `targetTier = currentTier + 1`, so it can never itself attempt an
//     out-of-order jump; this hook lets the E2E floor drive the monotone WHERE double-wall with an
//     ARBITRARY targetTier, proving the replay/out-of-order falsifiables independent of the counter gate,
//     mirrors this codebase's own `POST .../budgets-horizon/emit-capability-adopted` "hand-drive the
//     repository's own guard directly" precedent for `VocabTierAdvancementRepository`). Response = the REAL
//     `{advanced:true,newTier}|{advanced:false}` union.
//
//   GET /v1/_test/vertical-horizon/tier-advanced-events
//     Every `HorizonTierAdvancedEvent` fired this process (`HorizonTierAdvancementService`'s own in-memory
//     probe, mirrors `budgets-horizon-test.controller.ts#vocabTierAdvancedEvents`'s own precedent shape).
//     Response `{ events: HorizonTierAdvancedEvent[] }`.
//
//   POST /v1/_test/vertical-horizon/tier-advanced-events/clear
//     Clears the in-memory `HorizonTierAdvancedEvent` probe. Response `{ cleared: true }`.
//
// C5 routes:
//   GET /v1/_test/vertical-horizon/pressure-events
//     Returns `{ unlocked: PressureTierUnlockedEvent[], observationExpired: PressureTierObservationExpiredEvent[] }`
//     — the REAL in-memory test-probe arrays (`PressureTierService.getUnlockedEvents`/`getObservationExpiredEvents`,
//     mirrors `HorizonTierAdvancementService`'s own `tier-advanced-events` probe shape), proving the bus
//     emits genuinely fired (never inferable from DB state alone — the falsifiable floor asserts the EVENT,
//     not just the column).
//
//   POST /v1/_test/vertical-horizon/pressure-events/clear
//     Clears both in-memory probe arrays (test isolation between specs/runs).
//
// C6 routes:
//   POST /v1/_test/vertical-horizon/run-drift-tick
//     Body { playerId, gameMinute }. Drives `BenchmarkDriftService.runTick` DIRECTLY — the SAME Lesson #3
//     shape every OTHER tick service in this controller already uses. Response = the REAL
//     `BenchmarkDriftTickResult`.
//
//   GET /v1/_test/vertical-horizon/benchmark-raw?playerId=
//     Returns the REAL raw `player_metric_benchmarks` rows (`PlayerMetricBenchmarksRepository#listForPlayer`)
//     — `baseline_value`/`drift_accumulator` exact, never bucketed. The real `GET /v1/meta/benchmark` route
//     is bucket-only (P5) — this probe is what the E2E floor's own exact-value/value-sensitivity assertions
//     read instead. Response `{ rows: BenchmarkRow[] }`.
//
//   GET /v1/_test/vertical-horizon/drift-events
//     Returns `{ autoUpdated: BaselineAutoUpdatedEvent[] }` — the REAL in-memory test-probe array
//     (`BenchmarkDriftService.getAutoUpdatedEvents`), proving the bus emit genuinely fired (BO-only — never
//     inferable from the player-facing GET route).
//
//   POST /v1/_test/vertical-horizon/drift-events/clear
//     Clears the in-memory probe array (test isolation between specs/runs).
//
//   POST /v1/_test/vertical-horizon/validate-metric-registry
//     Body { types?: string[] }. Runs the REAL `validateMetricRegistryStrictMode` — see that function's own
//     header for the full contract (mirrors `validate-constraint-registry`'s own shape — the RESERVED-metric
//     boot-failure proof, exercised WITHOUT ever wiring `REVENUE_PER_ROUTE` into the real service). Response
//     `{ valid: boolean; error?: string }`.
//
// C7 routes:
//   GET /v1/_test/vertical-horizon/reanchor-quota-raw?playerId=
//     Returns the REAL raw `player_reanchor_quotas` row (`PlayerReanchorQuotasRepository#readRaw`) —
//     `uses_remaining_this_week`/`max_uses_per_week`/`week_reset_at`/`last_executed_tick`/`horizon_tier_at_
//     upgrade` exact, never bucketed (mirrors `benchmark-raw`'s own "the real GET route is P5-safe, this
//     probe is the exact-value floor" posture). `week_reset_at` serialized as ISO-8601 (JSON-safe). Response
//     `{ row: ReanchorQuotaRow | null }` (`null` = the player has never touched benchmark/reanchor, no row
//     yet — `initQuota` lazy-creates on first REAL touch).
//
//   GET /v1/_test/vertical-horizon/reanchor-events
//     Returns `{ executed: ReAnchorExecutedEvent[], laggingRevealed: LaggingIndicatorRevealedEvent[],
//     quotaUpgraded: ReAnchorQuotaUpgradedEvent[] }` — the REAL in-memory test-probe arrays
//     (`BenchmarkDriftService.getReAnchorExecutedEvents`/`getLaggingIndicatorEvents` +
//     `BenchmarkQuotaService.getUpgradedEvents`), proving the bus emits genuinely fired.
//
//   POST /v1/_test/vertical-horizon/reanchor-events/clear
//     Clears all three in-memory probe arrays (test isolation between specs/runs).
//
// C8 routes:
//   POST /v1/_test/vertical-horizon/increment-stability-counter
//     Body { playerId, lieutenantId }. Drives `ScriptStabilityCountersRepository.incrementOnStable`
//     DIRECTLY — the SAME REAL production write path `ExecutionPlanEvaluatorService`'s own EXECUTED_ON_PLAN
//     branch calls on every clean cycle (C3), exposed here so the C8 `StabilityBucketEnum` band-test spec
//     can reach an arbitrary counter value WITHOUT staging N real plans/slots/evaluator ticks (mirrors
//     `advance-tier-direct`'s own "raw repository probe, bypass the service layer, for test-hook purposes"
//     precedent). Response `{ count: number }` (the REAL post-write count `incrementOnStable` returns).
//
//   GET /v1/_test/vertical-horizon/stability-counter-raw?playerId=&lieutenantId=
//     Returns the REAL raw `script_stability_counters.consecutive_no_deviation_cycles` for a
//     `(playerId, lieutenantId)` pair (`ScriptStabilityCountersRepository.readForGate`) — mirrors
//     `benchmark-raw`/`reanchor-quota-raw`'s own "the real GET route is P5-bucket-only, this probe is the
//     exact-value floor" posture. `0` for a missing row (the SAME "missing row = zero state" convention the
//     repository's own header documents). Response `{ count: number }`.
//
// C8+ chunks will add routes here as each chunk adds services. No route is ever removed.

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { metaProgressionTunables } from './meta-progression-tunables';
import { ExecutionPlanEvaluatorService, type ExecutionPlanEvaluatorTickResult } from './execution-plan-evaluator.service';
import { AdaptationResolverService } from './adaptation-resolver.service';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { HorizonTierAdvancementRepository } from './horizon-tier-advancement.repository';
import { HorizonTierAdvancementService } from './horizon-tier-advancement.service';
import { PressureTierService } from './pressure-tier.service';
import { validateConstraintRegistryStrictMode } from './constraint-evaluators';
import type { ConstraintConditionType } from './horizon-tier-ladder';
import { BenchmarkDriftService, type BenchmarkDriftTickResult } from './benchmark-drift.service';
import { PlayerMetricBenchmarksRepository, type BenchmarkRow } from './player-metric-benchmarks.repository';
import { BenchmarkQuotaService } from './benchmark-quota.service';
import { PlayerReanchorQuotasRepository } from './player-reanchor-quotas.repository';
import { validateMetricRegistryStrictMode, type MetricKind } from './metric-sources';
import type {
  CycleExecutedOnPlanEvent,
  PlanAbortedEvent,
  PlanAdaptedEvent,
  HorizonTierAdvancedEvent,
  PressureTierUnlockedEvent,
  PressureTierObservationExpiredEvent,
  BaselineAutoUpdatedEvent,
  ReAnchorExecutedEvent,
  LaggingIndicatorRevealedEvent,
  ReAnchorQuotaUpgradedEvent,
} from '../citysim/events/city-event-bus';

/**
 * Test-only probe controller for `VerticalHorizonModule`.
 *
 * All routes live under the `/v1/_test/vertical-horizon/` prefix.
 * Mounted conditionally by `VerticalHorizonModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../protocol/test-routes-gate)
 */
@Controller()
export class VerticalHorizonTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly evaluator: ExecutionPlanEvaluatorService,
    private readonly adaptationResolver: AdaptationResolverService,
    private readonly stabilityCounterRepo: ScriptStabilityCountersRepository,
    private readonly tierAdvancementRepo: HorizonTierAdvancementRepository,
    private readonly tierAdvancement: HorizonTierAdvancementService,
    private readonly pressureTier: PressureTierService,
    private readonly benchmarkDrift: BenchmarkDriftService,
    private readonly benchmarksRepo: PlayerMetricBenchmarksRepository,
    private readonly benchmarkQuota: BenchmarkQuotaService,
    private readonly quotaRepo: PlayerReanchorQuotasRepository,
  ) {}

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /** C1 connectivity probe: returns { ok: true } if VerticalHorizonModule is in the DI graph. */
  @Get('_test/vertical-horizon/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * GET /v1/_test/vertical-horizon/read-tunables
   *
   * Returns every `meta.*` getter P3-H C1 added to the shared `metaProgressionTunables` object (design
   * §12's ~13 new key families), REAL resolved value, JSON-safe. See file header for the full contract.
   */
  @Get('_test/vertical-horizon/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // ── Decision Horizon Lock ──────────────────────────────────────────────────────────────
      cyclesPerHorizonTierT1: metaProgressionTunables.cyclesPerHorizonTierT1,
      cyclesPerHorizonTierT2: metaProgressionTunables.cyclesPerHorizonTierT2,
      cyclesPerHorizonTierT3: metaProgressionTunables.cyclesPerHorizonTierT3,
      scriptStabilityCyclesTier2: metaProgressionTunables.scriptStabilityCyclesTier2,
      scriptStabilityCyclesTier3: metaProgressionTunables.scriptStabilityCyclesTier3,
      planAbortRecoveryCostPct: metaProgressionTunables.planAbortRecoveryCostPct,
      // ── Pressure Inverse ───────────────────────────────────────────────────────────────────
      pressureTierUnlockGraduationCount: metaProgressionTunables.pressureTierUnlockGraduationCount,
      pressureTier4ObservationPhaseH: metaProgressionTunables.pressureTier4ObservationPhaseH,
      decisionsPerSessionDisplayT1: metaProgressionTunables.decisionsPerSessionDisplayT1,
      decisionsPerSessionDisplayT2: metaProgressionTunables.decisionsPerSessionDisplayT2,
      decisionsPerSessionDisplayT3: metaProgressionTunables.decisionsPerSessionDisplayT3,
      decisionsPerSessionDisplayT4: metaProgressionTunables.decisionsPerSessionDisplayT4,
      errorCascadeDepthPerTierT1: metaProgressionTunables.errorCascadeDepthPerTierT1,
      errorCascadeDepthPerTierT2: metaProgressionTunables.errorCascadeDepthPerTierT2,
      errorCascadeDepthPerTierT3: metaProgressionTunables.errorCascadeDepthPerTierT3,
      errorCascadeDepthPerTierT4: metaProgressionTunables.errorCascadeDepthPerTierT4,
      resolutionTimePerTierT1: metaProgressionTunables.resolutionTimePerTierT1,
      resolutionTimePerTierT2: metaProgressionTunables.resolutionTimePerTierT2,
      resolutionTimePerTierT3: metaProgressionTunables.resolutionTimePerTierT3,
      resolutionTimePerTierT4: metaProgressionTunables.resolutionTimePerTierT4,
      // ── Benchmark Drift ────────────────────────────────────────────────────────────────────
      driftAccumulationRatePctDay: metaProgressionTunables.driftAccumulationRatePctDay,
      reanchorUsesPerWeek: metaProgressionTunables.reanchorUsesPerWeek,
      benchmarkAutoUpdateThresholdPct: metaProgressionTunables.benchmarkAutoUpdateThresholdPct,
      metricsSimultaneousReanchor: metaProgressionTunables.metricsSimultaneousReanchor,
    };
  }

  // ── C2 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/vertical-horizon/set-decision-horizon-tier
   *
   * Body { playerId, tier }. Raw test-fixture UPSERT onto `player_progression_state.decision_horizon_
   * tier` ONLY — see file header for the full contract. Response `{ playerId, tier }`.
   */
  @Post('_test/vertical-horizon/set-decision-horizon-tier')
  @HttpCode(HttpStatus.CREATED)
  async setDecisionHorizonTier(
    @Body() body: { playerId: string; tier: number },
  ): Promise<{ playerId: string; tier: number }> {
    await this.db
      .insert(playerProgressionState)
      .values({ player_id: body.playerId, decision_horizon_tier: body.tier })
      .onConflictDoUpdate({
        target: playerProgressionState.player_id,
        set: { decision_horizon_tier: body.tier },
      });
    return { playerId: body.playerId, tier: body.tier };
  }

  // ── C3 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/vertical-horizon/run-evaluator-tick
   *
   * Body { playerId, gameMinute }. Drives `ExecutionPlanEvaluatorService.runTick` DIRECTLY — see file
   * header for the full contract. Response = the REAL `ExecutionPlanEvaluatorTickResult`.
   */
  @Post('_test/vertical-horizon/run-evaluator-tick')
  @HttpCode(HttpStatus.OK)
  async runEvaluatorTick(
    @Body() body: { playerId: string; gameMinute: number },
  ): Promise<ExecutionPlanEvaluatorTickResult> {
    return this.evaluator.runTick(body.playerId, body.gameMinute);
  }

  /**
   * GET /v1/_test/vertical-horizon/evaluator-events
   *
   * Returns the REAL in-memory `CycleExecutedOnPlanEvent`/`PlanAbortedEvent` test probes — see file header
   * for the full contract.
   */
  @Get('_test/vertical-horizon/evaluator-events')
  evaluatorEvents(): {
    executed: readonly CycleExecutedOnPlanEvent[];
    aborted: readonly PlanAbortedEvent[];
    adapted: readonly PlanAdaptedEvent[];
  } {
    return {
      executed: this.evaluator.getExecutedEvents(),
      aborted: this.evaluator.getAbortedEvents(),
      adapted: this.adaptationResolver.getAdaptedEvents(),
    };
  }

  /**
   * POST /v1/_test/vertical-horizon/clear-evaluator-events
   *
   * Clears all three in-memory event probes (test isolation) — executed/aborted (`ExecutionPlanEvaluatorService`)
   * + adapted (`AdaptationResolverService`, C4).
   */
  @Post('_test/vertical-horizon/clear-evaluator-events')
  @HttpCode(HttpStatus.OK)
  clearEvaluatorEvents(): { ok: true } {
    this.evaluator.clearEventProbes();
    this.adaptationResolver.clearAdaptedEvents();
    return { ok: true };
  }

  /**
   * POST /v1/_test/vertical-horizon/validate-constraint-registry
   *
   * Body { types?: string[] }. Runs the REAL `validateConstraintRegistryStrictMode` — see that function's
   * own header for the full contract. Response `{ valid: boolean; error?: string }`.
   */
  @Post('_test/vertical-horizon/validate-constraint-registry')
  @HttpCode(HttpStatus.OK)
  validateConstraintRegistry(@Body() body: { types?: string[] }): { valid: boolean; error?: string } {
    const types = (body.types ?? ['LIEUTENANT_PRESENT', 'STANDING_ORDER_ACTIVE', 'CAPABILITY_DEBT_BELOW']) as ConstraintConditionType[];
    try {
      validateConstraintRegistryStrictMode(types);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── C4 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/vertical-horizon/advance-tier-direct
   *
   * Body { playerId, targetTier }. A RAW `HorizonTierAdvancementRepository.advanceTier` probe — see file
   * header for the full contract (bypasses the counter gate entirely; the replay/out-of-order proof
   * surface). Response = the REAL `{advanced:true,newTier}|{advanced:false}` union.
   */
  @Post('_test/vertical-horizon/advance-tier-direct')
  @HttpCode(HttpStatus.OK)
  async advanceTierDirect(
    @Body() body: { playerId: string; targetTier: number },
  ): Promise<{ advanced: true; newTier: number } | { advanced: false }> {
    return this.tierAdvancementRepo.advanceTier(body.playerId, body.targetTier);
  }

  /**
   * GET /v1/_test/vertical-horizon/tier-advanced-events
   *
   * Every `HorizonTierAdvancedEvent` fired this process — see file header for the full contract. Response
   * `{ events: HorizonTierAdvancedEvent[] }`.
   */
  @Get('_test/vertical-horizon/tier-advanced-events')
  tierAdvancedEvents(): { events: readonly HorizonTierAdvancedEvent[] } {
    return { events: this.tierAdvancement.getAdvancedEvents() };
  }

  /**
   * POST /v1/_test/vertical-horizon/tier-advanced-events/clear
   *
   * Clears the in-memory `HorizonTierAdvancedEvent` probe. Response `{ cleared: true }`.
   */
  @Post('_test/vertical-horizon/tier-advanced-events/clear')
  @HttpCode(HttpStatus.OK)
  clearTierAdvancedEvents(): { cleared: true } {
    this.tierAdvancement.clearAdvancedEvents();
    return { cleared: true };
  }

  // ── C5 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/vertical-horizon/pressure-events
   *
   * Returns the REAL in-memory `PressureTierUnlockedEvent`/`PressureTierObservationExpiredEvent` test
   * probes (`PressureTierService.getUnlockedEvents`/`getObservationExpiredEvents`) — see file header for
   * the full contract.
   */
  @Get('_test/vertical-horizon/pressure-events')
  pressureEvents(): {
    unlocked: readonly PressureTierUnlockedEvent[];
    observationExpired: readonly PressureTierObservationExpiredEvent[];
  } {
    return {
      unlocked: this.pressureTier.getUnlockedEvents(),
      observationExpired: this.pressureTier.getObservationExpiredEvents(),
    };
  }

  /**
   * POST /v1/_test/vertical-horizon/pressure-events/clear
   *
   * Clears both in-memory `PressureTierService` event probes (test isolation). Response `{ cleared: true }`.
   */
  @Post('_test/vertical-horizon/pressure-events/clear')
  @HttpCode(HttpStatus.OK)
  clearPressureEvents(): { cleared: true } {
    this.pressureTier.clearProbeEvents();
    return { cleared: true };
  }

  // ── C6 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/vertical-horizon/run-drift-tick
   *
   * Body { playerId, gameMinute }. Drives `BenchmarkDriftService.runTick` DIRECTLY — see file header for
   * the full contract. Response = the REAL `BenchmarkDriftTickResult`.
   */
  @Post('_test/vertical-horizon/run-drift-tick')
  @HttpCode(HttpStatus.OK)
  async runDriftTick(@Body() body: { playerId: string; gameMinute: number }): Promise<BenchmarkDriftTickResult> {
    return this.benchmarkDrift.runTick(body.playerId, body.gameMinute);
  }

  /**
   * GET /v1/_test/vertical-horizon/benchmark-raw?playerId=
   *
   * The REAL raw `player_metric_benchmarks` rows for a player — see file header for the full contract
   * (never bucketed — the real `GET /v1/meta/benchmark` route is P5 bucket-only). Response `{ rows:
   * BenchmarkRow[] }`.
   */
  @Get('_test/vertical-horizon/benchmark-raw')
  async benchmarkRaw(@Query('playerId') playerId: string): Promise<{ rows: BenchmarkRow[] }> {
    return { rows: await this.benchmarksRepo.listForPlayer(playerId) };
  }

  /**
   * GET /v1/_test/vertical-horizon/drift-events
   *
   * Returns the REAL in-memory `BaselineAutoUpdatedEvent` test probe (`BenchmarkDriftService.
   * getAutoUpdatedEvents`) — see file header for the full contract.
   */
  @Get('_test/vertical-horizon/drift-events')
  driftEvents(): { autoUpdated: readonly BaselineAutoUpdatedEvent[] } {
    return { autoUpdated: this.benchmarkDrift.getAutoUpdatedEvents() };
  }

  /**
   * POST /v1/_test/vertical-horizon/drift-events/clear
   *
   * Clears the in-memory `BaselineAutoUpdatedEvent` probe (test isolation). Response `{ cleared: true }`.
   */
  @Post('_test/vertical-horizon/drift-events/clear')
  @HttpCode(HttpStatus.OK)
  clearDriftEvents(): { cleared: true } {
    this.benchmarkDrift.clearAutoUpdatedEvents();
    return { cleared: true };
  }

  /**
   * POST /v1/_test/vertical-horizon/validate-metric-registry
   *
   * Body { types?: string[] }. Runs the REAL `validateMetricRegistryStrictMode` — see that function's own
   * header for the full contract. Response `{ valid: boolean; error?: string }`.
   */
  @Post('_test/vertical-horizon/validate-metric-registry')
  @HttpCode(HttpStatus.OK)
  validateMetricRegistry(@Body() body: { types?: string[] }): { valid: boolean; error?: string } {
    const types = (body.types ?? ['SAFEHOUSE_UTILIZATION', 'COURIER_DELIVERY_RATE']) as MetricKind[];
    try {
      validateMetricRegistryStrictMode(types);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── C7 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/vertical-horizon/reanchor-quota-raw?playerId=
   *
   * The REAL raw `player_reanchor_quotas` row for a player — see file header for the full contract (never
   * bucketed — the real `GET /v1/meta/benchmark` route surfaces only `quota_remaining`/`quota_max`, P5).
   * Response `{ row: {...} | null }`, `week_reset_at` as ISO-8601 (JSON-safe).
   */
  @Get('_test/vertical-horizon/reanchor-quota-raw')
  async reanchorQuotaRaw(@Query('playerId') playerId: string): Promise<{
    row: {
      usesRemaining: number;
      maxUsesPerWeek: number;
      weekResetAt: string;
      lastExecutedTick: number | null;
      horizonTierAtUpgrade: number | null;
    } | null;
  }> {
    const row = await this.quotaRepo.readRaw(playerId);
    if (!row) return { row: null };
    return {
      row: {
        usesRemaining: row.usesRemaining,
        maxUsesPerWeek: row.maxUsesPerWeek,
        weekResetAt: row.weekResetAt.toISOString(),
        lastExecutedTick: row.lastExecutedTick,
        horizonTierAtUpgrade: row.horizonTierAtUpgrade,
      },
    };
  }

  /**
   * GET /v1/_test/vertical-horizon/reanchor-events
   *
   * Returns the REAL in-memory `ReAnchorExecutedEvent`/`LaggingIndicatorRevealedEvent`/
   * `ReAnchorQuotaUpgradedEvent` test probes — see file header for the full contract.
   */
  @Get('_test/vertical-horizon/reanchor-events')
  reanchorEvents(): {
    executed: readonly ReAnchorExecutedEvent[];
    laggingRevealed: readonly LaggingIndicatorRevealedEvent[];
    quotaUpgraded: readonly ReAnchorQuotaUpgradedEvent[];
  } {
    return {
      executed: this.benchmarkDrift.getReAnchorExecutedEvents(),
      laggingRevealed: this.benchmarkDrift.getLaggingIndicatorEvents(),
      quotaUpgraded: this.benchmarkQuota.getUpgradedEvents(),
    };
  }

  /**
   * POST /v1/_test/vertical-horizon/reanchor-events/clear
   *
   * Clears all three in-memory event probes (test isolation). Response `{ cleared: true }`.
   */
  @Post('_test/vertical-horizon/reanchor-events/clear')
  @HttpCode(HttpStatus.OK)
  clearReanchorEvents(): { cleared: true } {
    this.benchmarkDrift.clearReAnchorEvents();
    this.benchmarkQuota.clearUpgradedEvents();
    return { cleared: true };
  }

  // ── C8 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/vertical-horizon/increment-stability-counter
   *
   * Body { playerId, lieutenantId }. Drives `ScriptStabilityCountersRepository.incrementOnStable` DIRECTLY
   * — see file header for the full contract. Response `{ count: number }` (the REAL post-write count).
   */
  @Post('_test/vertical-horizon/increment-stability-counter')
  @HttpCode(HttpStatus.OK)
  async incrementStabilityCounter(@Body() body: { playerId: string; lieutenantId: string }): Promise<{ count: number }> {
    const count = await this.stabilityCounterRepo.incrementOnStable(body.playerId, body.lieutenantId);
    return { count };
  }

  /**
   * GET /v1/_test/vertical-horizon/stability-counter-raw?playerId=&lieutenantId=
   *
   * The REAL raw `consecutive_no_deviation_cycles` for a `(playerId, lieutenantId)` pair
   * (`ScriptStabilityCountersRepository.readForGate`) — see file header for the full contract (never
   * bucketed — the real `GET /v1/meta/horizon/execution-plans` timeline route is P5 bucket-only). Response
   * `{ count: number }`.
   */
  @Get('_test/vertical-horizon/stability-counter-raw')
  async stabilityCounterRaw(
    @Query('playerId') playerId: string,
    @Query('lieutenantId') lieutenantId: string,
  ): Promise<{ count: number }> {
    const count = await this.stabilityCounterRepo.readForGate(playerId, lieutenantId);
    return { count };
  }
}

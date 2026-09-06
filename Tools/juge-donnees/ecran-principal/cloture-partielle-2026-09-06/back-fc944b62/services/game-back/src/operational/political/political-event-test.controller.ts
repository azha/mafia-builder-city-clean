// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C0 (boot probe) + C1 (catalogue
//             read-back probe)
//             Pattern: R-EC-2 test-only controller (mirrors effect-engine-test.controller.ts's C0/C1 form)
//             — 04e-A2 C0 — 2026-07-05
//             — 04e-A2 C1 — 2026-07-05 (catalogue + valid-tunable-keys probe routes added; file RENAMED from
//             `political-test.controller.ts` → `political-event-test.controller.ts` + class renamed
//             `PoliticalTestController` → `PoliticalEventTestController` to reconcile with the plan's file-
//             structure naming convention, "`political-event-test.controller.ts` (C2 — gated live-fire hooks)" —
//             done at C1 per explicit instruction rather than deferred to C2. Route path unchanged
//             (`/v1/_test/political/...`) — only the source file/class name changed, zero behavioral impact on
//             `political_module_boot.spec.ts` (it only hits the HTTP route, no source-path dependency).
//
// `PoliticalEventTestController` — TEST-ONLY probe routes for `PoliticalModule`.
// Mounted ONLY when NODE_ENV !== 'production' (R-EC-2, `testControllersEnabled()` gate).
//
// C0 routes:
//   GET /v1/_test/political/ping
//     → { ok: true } — proves PoliticalModule is in the DI graph.
//
// C1 routes (12-event static catalogue read-back — plan C1):
//   GET /v1/_test/political/catalogue
//     Returns the REAL `POLITICAL_EVENT_CATALOGUE` (political-event-catalogue.ts) as a JSON-safe view: every
//     `magnitudeGetter`/`durationDaysGetter`/`costGetter` is CALLED (not echoed as a function reference) so the
//     response proves the getters are live-resolvable — anti-fabrication: reads REAL getter output, not a
//     hardcoded echo. Used by `political_catalogue.spec.ts` to assert all 12 entries present, valid
//     category/template_id, and (cross-referenced against `valid-tunable-keys` below) that every effect's
//     `tunableKey` resolves to a real registered key.
//
//   GET /v1/_test/political/valid-tunable-keys
//     Returns `POLITICAL_VALID_EFFECT_TUNABLE_KEYS` (political.tunables.ts) as a plain string array — the CLOSED
//     set of every tunable key a catalogue effect is allowed to target. The spec fetches this once and asserts
//     every `catalogue` effect's `tunableKey` is a member — the anti-fig-leaf resolve-check (falsifiable: a
//     fabricated/dangling key in the catalogue would NOT be a member and would fail the spec's assertion, even
//     though the entry compiles fine).
//
//   GET /v1/_test/political/read-new-tunables
//     Returns the 5 NEW A2-only `politicalTunables.*` getter values (political.tunables.ts) + the
//     `EPOL12_DISTRICT_HEAT_CEILING_BUCKET` code constant, as a plain object. Used by
//     `political_catalogue.spec.ts` to assert value-sensitive defaults (not a `>0` truthiness check) AND to prove
//     a DB-override flip reflects through the REAL getter (mirrors `effect_engine_tunables_bootstrap.spec.ts`'s
//     C1-3 pattern) — anti-fabrication: reads REAL getter output, not a hardcoded echo.
//
// C2 routes (calendar tick direct probe — plan C2, mirrors the codebase's established "direct probe"
// pattern for boundary-heavy NIGHTLY mechanics, e.g. ia_investigation_lifecycle.spec.ts's
// "evaluate-threshold" route — bypasses the real per-minute clock-advance harness for large day/month
// jumps, which would otherwise require firing the MINUTE cadence hundreds of thousands of times):
//
//   POST /v1/_test/political/run-calendar-tick
//     Body: { gameMinute: number }
//     Calls the REAL `PoliticalCalendarTickService.runNightlyCalendarTick(gameMinute)` directly — the
//     EXACT same tick body the real NIGHTLY/19.5 scheduler registration invokes (this is NOT a
//     re-implementation; the production `run(ctx)` callback calls this SAME method with `ctx.gameMinute`).
//     → `PoliticalCalendarTickResult` ({ evaluated, gameDay, activated, skippedOverCap }).
//
//   GET /v1/_test/political/calendar-state
//     Returns the REAL `political_calendar_state` singleton row (lastEvaluatedGameDay,
//     scandalNoiseAccumulator) via `PoliticalEventRepository.readCalendarState()` — no claim, no lock.
//
// C3 routes (state-driven trigger evaluator probes — plan C3): see each route's own JSDoc below
// (evaluate-rival-regime-weakness / evaluate-stack-utilization / increment-scandal-noise /
// evaluate-opposition-victory / rival-elimination-count / evaluate-federal-task-force /
// advance-district-signal / district-signal-state).
//
// C4 routes (shared lifecycle direct-probe — plan C4):
//   POST /v1/_test/political/force-activate
//     Body: { eventId: string, gameDay: number, scopeRef?: string | null }
//     Calls the REAL `PoliticalEventLifecycleService.activate(getPoliticalEventById(eventId), gameDay,
//     scopeRef)` directly — the SAME method the calendar tick (and every future trigger source) calls.
//     Used to live-fire-prove E-POL-10's lawyer lever (its own production trigger — opposition-victory-
//     at-electoral-end — is C6 scope) without fabricating a fake consumer.
//     → { activeEventId }
//
//   POST /v1/_test/political/force-deactivate
//     Body: { activeEventId: string }
//     Calls the REAL `PoliticalEventLifecycleService.deactivate(activeEventId)` directly — the
//     explicit-revert half of the revert guarantee, needed for PERMANENT events (E-POL-04/10, null
//     expiry) that `revertExpired` never sweeps.
//     → { deletedCount }
//
// C5 routes (the 1 remaining seeded-random trigger predicate — plan C5, E-POL-08):
//   GET /v1/_test/political/evaluate-random-seeded?seed=&probabilityPerDay=
//     Drives the REAL `evaluateRandomSeededTrigger` pure predicate (TD-162 honest gap — see its own
//     doc header). The 4 substrate + DISTRICT events' double-proof live-fire (E-POL-05/07/08/09/11/12)
//     otherwise reuses the EXISTING C4 `force-activate`/`force-deactivate` hooks above (no new route
//     needed for those — the SAME generic activate/deactivate pair drives every event).
//
// C6 (plan §C6 — opposition-victory + permanent-until-election): NO new route — `run-calendar-tick`
// (above, C2) is EXTENDED with an optional `playerId` body field (threaded to the REAL
// `PoliticalCalendarTickService.runNightlyCalendarTick`'s now-real production consumer, E-POL-10's
// opposition-victory heat reading); `force-activate`/`force-deactivate` (C4) remain the setup hooks for
// this chunk's own test floor (seed a live E-POL-10/E-POL-12 permanent to prove the election-boundary
// revert). See `political-calendar-tick.service.ts`'s own C6 doc addendum for the full trigger contract.
//
// C2+ chunks will add routes here as each chunk adds services (mirrors effect-engine-test.controller.ts's own
// progressive-route history). No route is ever removed.

import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';

import { EffectOverlayStore } from '../../config/effect-overlay-store';
import { HeatPropagationService } from '../../citysim/heat/heat-propagation.service';
import { politicalEventsTunables } from '../effect_engine/effect-engine.tunables';
import type { RivalKey } from '../conflict/rival/rival-ai.types';
import { PoliticalEventService } from './political-event.service';
import { POLITICAL_EVENT_CATALOGUE, getPoliticalEventById } from './political-event-catalogue';
import {
  POLITICAL_VALID_EFFECT_TUNABLE_KEYS,
  politicalTunables,
  EPOL12_DISTRICT_HEAT_CEILING_BUCKET,
} from './political.tunables';
import { PoliticalCalendarTickService, type PoliticalCalendarTickResult } from './political-calendar-tick.service';
import { PoliticalEventLifecycleService } from './political-event-lifecycle.service';
import {
  PoliticalEventRepository,
  type CalendarStateSnapshot,
  type DistrictSignalSnapshot,
} from './political-event.repository';
import {
  evaluateRivalRegimeWeakness,
  evaluateStackUtilizationSustained,
  evaluateScandalNoiseThresholdCrossed,
  evaluateOppositionVictoryRoll,
  evaluateFederalTaskForceTrigger,
  evaluateDistrictConditionGoodToday,
  hasSustainedGoodBehavior,
  resolveBpdAggregateTriggerRank,
  heatBucketRank,
  FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS,
  evaluateRandomSeededTrigger,
  type RivalRegimeVal,
} from './political-trigger-evaluators';
import { COUNTER_PLAY_DISPOSITIONS, type CounterPlayDispositionEntry } from './political-counter-play';

/** Valid rival keys — enum-domain guard (mirrors combat-test.controller.ts / rival-test.controller.ts). */
const VALID_RIVAL_KEYS: ReadonlySet<string> = new Set<RivalKey>(['coil', 'tarcum', 'iron_throat', 'saltline']);

/**
 * Test-only probe controller for `PoliticalModule`.
 *
 * All routes live under the `/v1/_test/political/` prefix.
 * Mounted conditionally by `PoliticalModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../../protocol/test-routes-gate)
 */
@Controller()
export class PoliticalEventTestController {
  constructor(
    // C0: DI anchor stub (will have active callers at C2+).
    private readonly politicalEventService: PoliticalEventService,
    // C2: the calendar tick direct probe + the calendar-state read-back.
    private readonly calendarTickService: PoliticalCalendarTickService,
    private readonly politicalEventRepository: PoliticalEventRepository,
    // C4: the shared activate/deactivate lifecycle direct-probe (force-activate/force-deactivate).
    private readonly lifecycle: PoliticalEventLifecycleService,
    // C3: the REAL per-player in-memory HeatBucket accessor (getDistrictPeakBucket/getCitywideBucket)
    // E-POL-11's BPD-aggregate + E-POL-12's district-signal predicates read (design §6.2b/§6.4).
    private readonly heatPropagationService: HeatPropagationService,
  ) {}

  // ── C0 ──────────────────────────────────────────────────────────────────────────────────────

  /** C0 connectivity probe: returns { ok: true } if PoliticalModule is in the DI graph. */
  @Get('_test/political/ping')
  ping(): { ok: true } {
    return this.politicalEventService.ping();
  }

  // ── C1 — 12-event static catalogue read-back ───────────────────────────────────────────────────

  /**
   * GET /v1/_test/political/catalogue
   *
   * Returns all 12 `PoliticalEvent` entries, JSON-safe (every getter CALLED, not echoed). See file header for
   * the full contract.
   */
  @Get('_test/political/catalogue')
  catalogue(): ReadonlyArray<Record<string, unknown>> {
    return POLITICAL_EVENT_CATALOGUE.map((event) => ({
      eventId: event.eventId,
      name: event.name,
      category: event.category,
      templateId: event.templateId,
      isPermanent: event.durationDaysGetter === null,
      durationDays: event.durationDaysGetter ? event.durationDaysGetter() : null,
      trigger: { kind: event.trigger.kind, description: event.trigger.description },
      effects: event.effects.map((effect) => ({
        tunableKey: effect.tunableKey,
        op: effect.op,
        magnitude: effect.magnitudeGetter(),
        scope: effect.scope,
      })),
      counterPlayActions: event.counterPlayActions.map((action) => ({
        name: action.name,
        description: action.description,
        cost: action.costGetter ? action.costGetter() : null,
      })),
      newsFeedCopy: event.newsFeedCopy,
    }));
  }

  /**
   * GET /v1/_test/political/valid-tunable-keys
   *
   * Returns the closed set of real registered tunable keys a catalogue effect may target. See file header.
   */
  @Get('_test/political/valid-tunable-keys')
  validTunableKeys(): readonly string[] {
    return Array.from(POLITICAL_VALID_EFFECT_TUNABLE_KEYS);
  }

  /**
   * GET /v1/_test/political/read-new-tunables
   *
   * Returns the 5 NEW A2-only `politicalTunables.*` getter values + the heat-ceiling code constant. See file
   * header for the full contract.
   */
  @Get('_test/political/read-new-tunables')
  readNewTunables(): Record<string, unknown> {
    return {
      epol11FederalRaidTemperatureMultiplier: politicalTunables.epol11FederalRaidTemperatureMultiplier,
      epol12DistrictCohesionFloor:            politicalTunables.epol12DistrictCohesionFloor,
      epol12DistrictSustainWindowDays:        politicalTunables.epol12DistrictSustainWindowDays,
      epol09ScandalNoiseThreshold:            politicalTunables.epol09ScandalNoiseThreshold,
      counterPlayPoliticianCost:              politicalTunables.counterPlayPoliticianCost,
      epol12DistrictHeatCeilingBucket:        EPOL12_DISTRICT_HEAT_CEILING_BUCKET,
    };
  }

  // ── C2 — calendar tick direct probe + calendar-state read-back ────────────────────────────────

  /**
   * POST /v1/_test/political/run-calendar-tick
   * Body: { gameMinute: number, playerId?: string }
   *
   * Calls the REAL `PoliticalCalendarTickService.runNightlyCalendarTick(gameMinute, playerId)` directly —
   * the SAME method the real NIGHTLY/19.5 scheduler registration invokes with `ctx.gameMinute`/
   * `ctx.playerId`. See file header for the full contract (falsifiable idempotency: calling this twice
   * with the SAME `gameMinute` returns `evaluated:false` the second time, with no duplicate
   * `political_event_active` row). `playerId` (C6, optional) is used ONLY for E-POL-10's opposition-
   * victory heat reading — omitting it (the pre-existing C2/C4 test-floor call shape) falls back to the
   * service's own documented placeholder (`DEFAULT_CALENDAR_TICK_PLAYER_ID`).
   */
  @Post('_test/political/run-calendar-tick')
  runCalendarTick(@Body() body: { gameMinute: number; playerId?: string }): Promise<PoliticalCalendarTickResult> {
    return body.playerId !== undefined
      ? this.calendarTickService.runNightlyCalendarTick(body.gameMinute, body.playerId)
      : this.calendarTickService.runNightlyCalendarTick(body.gameMinute);
  }

  /**
   * GET /v1/_test/political/calendar-state
   *
   * Returns the REAL `political_calendar_state` singleton row (no claim, no lock). See file header.
   */
  @Get('_test/political/calendar-state')
  calendarState(): Promise<CalendarStateSnapshot> {
    return this.politicalEventRepository.readCalendarState();
  }

  // ── C3 — state-driven trigger evaluator probes (plan §C3) ─────────────────────────────────────
  //
  // Each route below drives the REAL pure predicate (`political-trigger-evaluators.ts`) over REAL
  // persisted/observed state (rival_state / district_cohesion / district_capacity_state /
  // political_calendar_state / rival_elimination_ledger / political_district_signal_state /
  // HeatPropagationService's in-memory bucket) — never a synthetic/hardcoded echo. These predicates
  // are NOT yet wired into the real NIGHTLY tick (that is C4/C5 scope) — C3 proves each is real,
  // deterministic and falsifiable in isolation.

  /**
   * GET /v1/_test/political/evaluate-rival-regime-weakness?playerId=&rivalKey=&playerGainedTerritoryRecently=
   *
   * E-POL-05. Reads the REAL persisted `rival_state.regime` for (playerId, rivalKey) and combines it
   * with the caller-supplied `playerGainedTerritoryRecently` (the honest TD-156 gap — see
   * `political-trigger-evaluators.ts`'s file header) through the REAL `evaluateRivalRegimeWeakness`
   * predicate. 404 if no `rival_state` row exists for the pair (never seeded via `/v1/_test/rival/ensure`).
   */
  @Get('_test/political/evaluate-rival-regime-weakness')
  async evaluateRivalRegimeWeakness(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
    @Query('playerGainedTerritoryRecently') territoryParam: string,
  ): Promise<{ regime: RivalRegimeVal; activate: boolean }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    const regime = await this.politicalEventRepository.readRivalRegime(playerId, rivalKeyParam as RivalKey);
    if (regime === null) {
      throw new HttpException(`no rival_state row for playerId=${playerId} rivalKey=${rivalKeyParam}`, HttpStatus.NOT_FOUND);
    }
    const playerGainedTerritoryRecently = territoryParam === 'true';
    const activate = evaluateRivalRegimeWeakness(regime, playerGainedTerritoryRecently);
    return { regime, activate };
  }

  /**
   * GET /v1/_test/political/evaluate-stack-utilization?consecutiveDaysAboveThreshold=
   *
   * E-POL-07. Reads the REAL `district_capacity_state` utilization for every `districts.profile =
   * 'stack'` district and applies the REAL `epol07StackUtilizationThresholdPct` getter +
   * `evaluateStackUtilizationSustained`. `consecutiveDaysAboveThreshold` is the honest TD-157 gap
   * parameter (see `political-trigger-evaluators.ts`'s file header).
   */
  @Get('_test/political/evaluate-stack-utilization')
  async evaluateStackUtilization(
    @Query('consecutiveDaysAboveThreshold') consecutiveDaysParam: string,
  ): Promise<ReadonlyArray<{ districtId: number; utilizationPct: number; activate: boolean }>> {
    const consecutiveDaysAboveThreshold = Number.parseInt(consecutiveDaysParam ?? '0', 10);
    const thresholdPct = politicalEventsTunables.epol07StackUtilizationThresholdPct;
    const windowDays = politicalEventsTunables.epol07StackUtilizationWindowDays;
    const readings = await this.politicalEventRepository.readStackDistrictUtilization();
    return readings.map((r) => ({
      districtId: r.districtId,
      utilizationPct: r.utilizationPct,
      activate: evaluateStackUtilizationSustained(r.utilizationPct, thresholdPct, consecutiveDaysAboveThreshold, windowDays),
    }));
  }

  /**
   * POST /v1/_test/political/increment-scandal-noise
   * Body: { amount: number }
   *
   * E-POL-09. Atomically ADDs `amount` to the REAL `political_calendar_state.scandal_noise_accumulator`
   * (mig 0111) and evaluates the REAL `evaluateScandalNoiseThresholdCrossed` against the REAL
   * `epol09ScandalNoiseThreshold` getter (A2-C1).
   */
  @Post('_test/political/increment-scandal-noise')
  async incrementScandalNoise(
    @Body() body: { amount: number },
  ): Promise<{ accumulator: number; threshold: number; activate: boolean }> {
    const accumulator = await this.politicalEventRepository.incrementScandalNoise(body.amount);
    const threshold = politicalTunables.epol09ScandalNoiseThreshold;
    return { accumulator, threshold, activate: evaluateScandalNoiseThresholdCrossed(accumulator, threshold) };
  }

  /**
   * GET /v1/_test/political/evaluate-opposition-victory?playerId=&seedSuffix=
   *
   * E-POL-10. Reads the REAL per-player `HeatPropagationService.getCitywideBucket(playerId)` (COLD
   * if the player never ticked — no fabrication) + the REAL `oppositionVictoryProbabilityBase`
   * getter, derives a seed from `${playerId}:${seedSuffix}` (reproducible game state — no
   * `Math.random`), and evaluates the REAL `evaluateOppositionVictoryRoll`. Calling this twice with
   * the SAME `playerId`+`seedSuffix` MUST return the identical `activate` (the C3 determinism proof).
   */
  @Get('_test/political/evaluate-opposition-victory')
  evaluateOppositionVictory(
    @Query('playerId') playerId: string,
    @Query('seedSuffix') seedSuffix: string,
  ): { citywideBucket: string; activate: boolean } {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const citywideBucket = this.heatPropagationService.getCitywideBucket(playerId);
    const seed = `${playerId}:${seedSuffix ?? ''}:opposition_victory`;
    const activate = evaluateOppositionVictoryRoll(
      seed,
      politicalEventsTunables.oppositionVictoryProbabilityBase,
      citywideBucket,
    );
    return { citywideBucket, activate };
  }

  /**
   * GET /v1/_test/political/rival-elimination-count?playerId=&gameMinuteNow=
   *
   * E-POL-11a (ledger only). Returns the REAL rolling-window count over `rival_elimination_ledger`
   * rows (migration 0112) — the SAME window `evaluate-federal-task-force` below uses
   * (`month_minutes * FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS`). Used to poll for the ASYNC bus
   * subscriber's row (`PoliticalRivalEliminationLedgerService`) after a REAL
   * `/v1/_test/combat/drive-elimination` call.
   */
  @Get('_test/political/rival-elimination-count')
  async rivalEliminationCount(
    @Query('playerId') playerId: string,
    @Query('gameMinuteNow') gameMinuteNowParam: string,
  ): Promise<{ count: number }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const gameMinuteNow = Number.parseInt(gameMinuteNowParam ?? '0', 10);
    const windowMinutes = politicalEventsTunables.monthMinutes * FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS;
    const count = await this.politicalEventRepository.countRivalEliminationsInWindow(playerId, gameMinuteNow, windowMinutes);
    return { count };
  }

  /**
   * GET /v1/_test/political/evaluate-federal-task-force?playerId=&gameMinuteNow=
   *
   * E-POL-11 (full trigger). Combines the REAL per-player citywide HeatBucket
   * (`HeatPropagationService.getCitywideBucket`) resolved against the REAL
   * `epol11BpdMemoryAggregateTrigger` composite getter (via `resolveBpdAggregateTriggerRank`) AND the
   * REAL rolling-window elimination count (`rival_elimination_ledger`) through
   * `evaluateFederalTaskForceTrigger`.
   */
  @Get('_test/political/evaluate-federal-task-force')
  async evaluateFederalTaskForce(
    @Query('playerId') playerId: string,
    @Query('gameMinuteNow') gameMinuteNowParam: string,
  ): Promise<{ citywideBucket: string; eliminationsInWindowCount: number; activate: boolean }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const gameMinuteNow = Number.parseInt(gameMinuteNowParam ?? '0', 10);
    const citywideBucket = this.heatPropagationService.getCitywideBucket(playerId);
    const citywideBucketRank = heatBucketRank(citywideBucket);
    const aggregateTriggerRank = resolveBpdAggregateTriggerRank(politicalEventsTunables.epol11BpdMemoryAggregateTrigger);
    const windowMinutes = politicalEventsTunables.monthMinutes * FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS;
    const eliminationsInWindowCount = await this.politicalEventRepository.countRivalEliminationsInWindow(
      playerId, gameMinuteNow, windowMinutes,
    );
    const activate = evaluateFederalTaskForceTrigger(citywideBucketRank, aggregateTriggerRank, eliminationsInWindowCount);
    return { citywideBucket, eliminationsInWindowCount, activate };
  }

  /**
   * POST /v1/_test/political/advance-district-signal
   * Body: { playerId, districtId, gameDay }
   *
   * E-POL-12. Reads the REAL `district_cohesion.cohesion` (playerId, districtId) + the REAL
   * `HeatPropagationService.getDistrictPeakBucket(playerId, districtId)`, evaluates the REAL
   * `evaluateDistrictConditionGoodToday` against the REAL `epol12DistrictCohesionFloor` getter +
   * `EPOL12_DISTRICT_HEAT_CEILING_BUCKET` code-constant, advances the REAL per-district streak
   * (`political_district_signal_state`, mig 0113, day-idempotent), then evaluates
   * `hasSustainedGoodBehavior` against the REAL `epol12DistrictSustainWindowDays` getter. 404 if no
   * `district_cohesion` row exists yet for the pair.
   */
  @Post('_test/political/advance-district-signal')
  async advanceDistrictSignal(
    @Body() body: { playerId: string; districtId: number; gameDay: number },
  ): Promise<{ cohesion: number; heatBucket: string; isGoodToday: boolean; consecutiveGoodDays: number; triggered: boolean }> {
    const { playerId, districtId, gameDay } = body;
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const cohesion = await this.politicalEventRepository.readDistrictCohesion(playerId, districtId);
    if (cohesion === null) {
      throw new HttpException(`no district_cohesion row for playerId=${playerId} districtId=${districtId}`, HttpStatus.NOT_FOUND);
    }
    const heatBucket = this.heatPropagationService.getDistrictPeakBucket(playerId, districtId);
    const isGoodToday = evaluateDistrictConditionGoodToday(
      cohesion, heatBucket, politicalTunables.epol12DistrictCohesionFloor, EPOL12_DISTRICT_HEAT_CEILING_BUCKET,
    );
    const snapshot = await this.politicalEventRepository.advanceDistrictSignalDay(districtId, gameDay, isGoodToday);
    const triggered = hasSustainedGoodBehavior(snapshot.consecutiveGoodDays, politicalTunables.epol12DistrictSustainWindowDays);
    return { cohesion, heatBucket, isGoodToday, consecutiveGoodDays: snapshot.consecutiveGoodDays, triggered };
  }

  /**
   * GET /v1/_test/political/district-signal-state?districtId=
   *
   * Read-back for `political_district_signal_state` (no claim, no advance).
   */
  @Get('_test/political/district-signal-state')
  districtSignalState(@Query('districtId') districtIdParam: string): Promise<DistrictSignalSnapshot> {
    const districtId = Number.parseInt(districtIdParam, 10);
    return this.politicalEventRepository.readDistrictSignalState(districtId);
  }

  /**
   * GET /v1/_test/political/evaluate-random-seeded?seed=&probabilityPerDay=
   *
   * E-POL-08 (C5). Drives the REAL `evaluateRandomSeededTrigger` pure predicate — see its own doc
   * header (`political-trigger-evaluators.ts`, TD-162 honest gap: canon cites no probability
   * magnitude for this disjunct — `probabilityPerDay` is an explicit caller-supplied parameter,
   * never fabricated internally).
   */
  @Get('_test/political/evaluate-random-seeded')
  evaluateRandomSeeded(
    @Query('seed') seed: string,
    @Query('probabilityPerDay') probabilityPerDayParam: string,
  ): { activate: boolean } {
    const probabilityPerDay = Number.parseFloat(probabilityPerDayParam ?? '0');
    return { activate: evaluateRandomSeededTrigger(seed, probabilityPerDay) };
  }

  // ── C4 — shared lifecycle direct-probe (force-activate / force-deactivate) ────────────────────
  //
  // Both routes call the SAME `PoliticalEventLifecycleService.activate`/`deactivate` production
  // methods every real trigger source (this tick, C5, C6, C7) uses — NOT a re-implementation, NOT a
  // synthetic shortcut. They exist because some events' REAL production trigger-to-activate wiring
  // belongs to a LATER chunk than the one that must first prove their EFFECT/revert lifecycle is real
  // (E-POL-10's lawyer lever here at C4 — its own opposition-victory-at-electoral-end trigger is C6;
  // E-POL-09's audit-pin effects at C5 will use the SAME hook analogously) — mirrors the established
  // "direct-probe bypasses the not-yet-wired production trigger, exercises the REAL downstream engine"
  // idiom already set by `run-calendar-tick` (C2) and every `evaluate-*` route (C3).
  //
  // SAME-CALL overlay visibility (debt lot fix/server-transport-and-overlay-race): `lifecycle.activate`/
  // `deactivate` themselves never call `EffectOverlayStore.reloadNow()` — by design, the CALLER owns
  // that (`political-event-lifecycle.service.ts`'s own header doc: "this service does NOT itself call
  // reloadNow(); the CALLER does"). The REAL production caller, `PoliticalCalendarTickService`, honors
  // this contract — it batches a whole tick's activate/revert calls THEN awaits `reloadNow()` ONCE at
  // the end (political-calendar-tick.service.ts:471, step 5 of its own header doc). These two test-only
  // probes are EACH a standalone single-write caller (no batching), so each must award its own
  // `reloadNow()` after its own write to uphold the SAME contract — this was missing on both routes
  // (proven: an artificial 3s delay injected into `EffectOverlayStore`'s notification handler,
  // effect-overlay-store.ts:127, reproduced the exact gate RED character-for-character on an unpolled
  // read after either route, and disappeared once the route itself awaited `reloadNow()` — see the
  // spec files' own "★ Race" notes on both the activate side, e.g. political_opposition_permanent.
  // spec.ts's C6-4, and the "★ Race, SYMMETRIC half" deactivate side, e.g. political_counter_play_hooks.
  // spec.ts / political_global_events_fire.spec.ts). Scope: this is the TEST-ONLY probe pair, aligned
  // to match its own production caller's contract — NOT a fix to any production trigger source (each of
  // which already owns its own `reloadNow()` call, e.g. the calendar tick above); a DIFFERENT
  // production caller found missing this same discipline (`PoliticalAdminController`'s BO
  // `force-activate`/`abort-active` endpoints, which call `lifecycle.activate`/`abortPermanentEvent`
  // with no `reloadNow()` of their own) is a SEPARATE, out-of-scope finding — flagged, not fixed here.

  /**
   * POST /v1/_test/political/force-activate
   * Body: { eventId: string, gameDay: number, scopeRef?: string | null }
   *
   * Calls the REAL `PoliticalEventLifecycleService.activate(getPoliticalEventById(eventId), gameDay,
   * scopeRef)` directly — the SAME method the calendar tick (and every future trigger source) calls —
   * then awaits `EffectOverlayStore.reloadNow()` (same-call overlay visibility, see the C4 section doc
   * above) so a caller's very next read already observes the shift, never racing the async
   * pg_notify -> LISTEN -> reload round-trip.
   * @returns { activeEventId }
   */
  @Post('_test/political/force-activate')
  async forceActivate(
    @Body() body: { eventId: string; gameDay: number; scopeRef?: string | null },
  ): Promise<{ activeEventId: string }> {
    const { eventId, gameDay, scopeRef } = body ?? {};
    if (!eventId || gameDay === undefined) {
      throw new HttpException('eventId, gameDay required', HttpStatus.BAD_REQUEST);
    }
    const event = getPoliticalEventById(eventId);
    const activeEventId = await this.lifecycle.activate(event, gameDay, scopeRef ?? null);
    await EffectOverlayStore.reloadNow();
    return { activeEventId };
  }

  /**
   * POST /v1/_test/political/force-deactivate
   * Body: { activeEventId: string }
   *
   * Calls the REAL `PoliticalEventLifecycleService.deactivate(activeEventId)` (→
   * `EffectModifierService.revertEvent`) directly — the explicit-revert half of the revert guarantee,
   * needed for PERMANENT events (null expiry — no `revertExpired` sweep would ever touch them) — then
   * awaits `EffectOverlayStore.reloadNow()` (same-call overlay visibility, see the C4 section doc
   * above — the SYMMETRIC half of `force-activate`'s own fix, same unawaited-reload race, same
   * remedy).
   * @returns { deletedCount }
   */
  @Post('_test/political/force-deactivate')
  async forceDeactivate(@Body() body: { activeEventId: string }): Promise<{ deletedCount: number }> {
    const { activeEventId } = body ?? {};
    if (!activeEventId) {
      throw new HttpException('activeEventId required', HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.lifecycle.deactivate(activeEventId);
    await EffectOverlayStore.reloadNow();
    return { deletedCount };
  }

  // ── C7 — counter-play backend hooks: the disposition read model ───────────────────────────────

  /**
   * GET /v1/_test/political/counter-play-dispositions
   *
   * Returns the FULL `COUNTER_PLAY_DISPOSITIONS` registry (political-counter-play.ts, C7): every one of
   * the 12 events' `counterPlayActions[]`, each classified REAL_WIRED / HONEST_SCAFFOLD / NONE_NEEDED,
   * with its backing reference or TD marker. Plain static data (no getter to call) — JSON-safe as-is.
   */
  @Get('_test/political/counter-play-dispositions')
  counterPlayDispositions(): readonly CounterPlayDispositionEntry[] {
    return COUNTER_PLAY_DISPOSITIONS;
  }
}

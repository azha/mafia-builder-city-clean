// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (tunables foundation —
//             the E2E probe route the C1 floor spec needs) + C2 (TaskCategory catalogue + mastery
//             accumulator — strict-mode boot-check falsifiable proof + fixture seams).
//             Pattern: R-EC-2 test-only controller (mirrors `core-loops-test.controller.ts`'s own C1
//             `ping`/`read-tunables` shape — "C2+ chunks will add routes here as each chunk adds
//             services", same convention here; the C2 `validate-catalogue` route mirrors `core-loops-
//             test.controller.ts`'s OWN `validate-catalogue` route byte-for-byte in shape — same D7/DD-F2
//             "run the REAL validator, body-supplied catalogue overrides the production one" contract).
//             — P3-F C1 — 2026-07-18 (ping + read-tunables) / C2 — 2026-07-18 (validate-catalogue,
//             mastery-score read/seed fixture seams)
//
// `DelegationRatchetTestController` — TEST-ONLY probe routes for the P3-F Delegation Ratchet surface.
// Mounted ONLY when `testControllersEnabled()` (R-EC-2).
//
// C1 routes:
//   GET /v1/_test/meta-progression/ping
//     -> { ok: true } — proves DelegationRatchetModule is in the DI graph.
//
//   GET /v1/_test/meta-progression/read-tunables
//     Returns EVERY `metaProgressionTunables.*` getter's REAL resolved value (meta-progression-tunables.ts)
//     as a JSON-safe object — every getter CALLED (not echoed as a function reference), anti-fabrication:
//     reads REAL getter output, not a hardcoded echo. Used by `meta_progression_tunables.spec.ts` to assert
//     value-sensitive defaults AND a real DB/env-override clamp (mirrors `core_loops_tunables.spec.ts`'s
//     C1 pattern).
//
// C2 routes:
//   POST /v1/_test/meta-progression/validate-catalogue
//     Body { catalogue?: TaskCategoryCatalogueEntry[] }. Calls the REAL
//     `validateTaskCategoryCatalogueStrictMode` DIRECTLY — the EXACT function `DelegationRatchetModule.
//     onApplicationBootstrap` runs at real boot (Lesson #3 — zero live-vs-test divergence). Body omitted
//     → validates the REAL production `TASK_CATEGORY_CATALOGUE`. Body supplied → validates the CALLER's
//     array instead — the falsifiable "a spec-only catalogue clone with a LIVE entry missing a binding
//     fails boot" proof, without ever mutating the production catalogue or crashing the real server.
//     Response `{ valid: boolean; error?: string }`.
//
//   GET /v1/_test/meta-progression/mastery-score?playerId=&categoryId=
//     Calls `MasteryScoreRepository.getRow` DIRECTLY. Response `{ row: MasteryScoreRow | null }` — the
//     falsifiable-read surface for every C2 accumulator scenario (no raw SQL needed in the spec).
//
//   POST /v1/_test/meta-progression/seed-mastery-row
//     Body { playerId, categoryId, masteryScore?, delegationState? }. Raw test-fixture UPSERT (mirrors
//     `core-loops-test.controller.ts#setEmittedAt`'s raw-column-write convention — this exact state
//     combination, e.g. a DELEGATED row pre-existing BEFORE a real bus event fires, has no real production
//     writer this early in the lot: graduation/recall land at C5/C8). Lets the "delegated row receives NO
//     delta" falsifiable seed a DELEGATED row deterministically. Defaults: masteryScore=0,
//     delegationState='SELF'. Response `{ playerId, categoryId, masteryScore, delegationState }`.
//
// C4 routes:
//   POST /v1/_test/meta-progression/seed-structural-decision
//     Body { playerId, decisionType, decidedAt? }. Raw INSERT into `structural_decisions_audit` — a
//     history-volume fixture seam (mirrors `seed-mastery-row`'s raw-column-write convention) that lets a
//     spec build a MANY-decision history fast, without a real session/governor round-trip per row (the
//     governor caps 1 structural decision/session — 10+ rows via the REAL endpoint would need 10+ real
//     sessions). `decidedAt` (ISO string, optional) controls ordering determinism; defaults to now().
//     Response `{ decisionId: string }`.
//
//   POST /v1/_test/meta-progression/seed-resolved-exception
//     Body { playerId, sourceTag, method, chosenActionId?, status?, resolvedAt? }. Raw INSERT into
//     `exception_queue` already in a RESOLVED/ESCALATED terminal state (candidate_actions carries ONE
//     candidate stamped with `sourceTag`; `resolution` carries `{method, chosen_action_id}` — the exact
//     shape every real effect handler writes, `exceptions/effects/*.handler.ts`). The SAME history-volume
//     fixture seam as above, for the OTHER decision-log source. `status` defaults 'resolved' ('escalated'
//     also accepted — both are decided terminal states the C4 extractor reads). Response
//     `{ exceptionId: string }`.
//
//   GET /v1/_test/meta-progression/graduation-seed-preview?playerId=&categoryId=&archetype=
//     Calls the REAL `CategoryDecisionLogRepository.extractCategoryDecisions` (N =
//     `metaProgressionTunables.graduationScriptSeedDepth`, the REAL registered getter — never a
//     hardcoded echo) THEN the REAL `GraduationSeedMapper.mapPlayerDecisionsToSeedScript` — the "pure
//     pipeline + test-only compile surface" the C4 plan brief names (the 04f-B C3 shape: no attach, no
//     mastery_score/behavior_script write, PURE compile). Response `{ source, ruleCount,
//     ruleTriggerFields, scriptSeedHash, disposition, seedDecisionsN, decisions }` — `ruleTriggerFields`
//     is `compiled.rules.map(r => r.trigger.field)` (the vocab-membership assertion surface); `decisions`
//     is the extractor's own typed, newest-first output (ISO-stamped) — the "typed and newest-first
//     ordered" falsifiable proof, readable straight off the HTTP response.
//
// C5 routes:
//   POST /v1/_test/meta-progression/arm-lieutenant-corruption
//     Body { playerId }. Calls `GraduationLieutenantFaultInjector.arm` DIRECTLY — see that class's own
//     header for the full contract (the induced-mid-tx-failure proof seam). Response `{ armed: true }`.
//
// C7 routes:
//   POST /v1/_test/meta-progression/seed-player-proficiency
//     Body { playerId, categoryId, playerProficiency?, recallDebtTotal?, recoveryPeriodRemaining?,
//     lastAccruedSessionId? }. Raw test-fixture UPSERT into `player_proficiency` (mirrors
//     `seed-mastery-row`'s raw-column-write convention) — lets the signal-boundary falsifiable (plan C7:
//     "debt 9/30 → LOW, 10/30 → MEDIUM, 20/30 → HIGH") set an EXACT debt value no real accrual sequence
//     can hit with the registered `meta.recall_debt_accumulation_per_session` step (1..6), and lets the
//     "non-delegated category: NO row mutation" falsifiable seed a residual row on a category that is
//     no longer DELEGATED. Defaults: playerProficiency=50, recallDebtTotal=0, recoveryPeriodRemaining=0,
//     lastAccruedSessionId=null. Response `{ playerId, categoryId, playerProficiency, recallDebtTotal,
//     recoveryPeriodRemaining }`.
//
//   GET /v1/_test/meta-progression/player-proficiency?playerId=&categoryId=
//     Calls `PlayerProficiencyRepository.getRow` DIRECTLY, then derives the signal via the REAL
//     `deriveRecallDebtSignal(row.recall_debt_total, metaProgressionTunables.recallDebtMax)` — the D9
//     "TEST SURFACE suffices here, C10 formalizes the endpoint" seam (plan C7). Response
//     `{ row: PlayerProficiencyRow | null, signal: 'LOW'|'MEDIUM'|'HIGH' | null }` (`signal` is `null`
//     iff `row` is `null` — no row, no signal to derive).
//
//   POST /v1/_test/meta-progression/run-session-closed-recall-debt
//     Body { playerId, sessionId, gameMinute? }. Calls `RecallDebtSessionSubscriber.processSessionClosed`
//     DIRECTLY — the SAME method the real `SessionClosedEvent` subscription calls (Lesson #3 — zero
//     live-vs-test divergence), AWAITED (unlike the fire-and-forget bus path, so the E2E floor's REPLAY
//     and CONCURRENCY-RACE falsifiables get deterministic, immediately-readable results with no polling).
//     `gameMinute` defaults to 0 (mirrors `run-session-sweep`'s own convention). Response `{ accrued:
//     CategoryValueRow[], recovered: CategoryValueRow[] }` — the exact rows this call's own accrual/
//     recovery UPDATEs touched (empty arrays on a genuine no-op, e.g. a replay).
//
//     (The "sweep-close ‖ explicit-close race on the SAME session" concurrency falsifiable (plan C7)
//     needs no new route here — it backdates `gameplay_sessions.started_at` with a raw `runsql` call
//     directly in the spec file, mirroring `session_lifecycle.spec.ts#backdateStartedAt`'s own established
//     precedent for the EXACT same fixture need, one lot over.)
//
// C8 routes:
//   POST /v1/_test/meta-progression/arm-recall-corruption
//     Body { playerId }. Calls `RecallFaultInjector.arm` DIRECTLY — see that class's own header for the
//     full contract (the recall induced-mid-tx-failure proof seam, mirrors `arm-lieutenant-corruption`
//     above). Response `{ armed: true }`.
//
//   POST /v1/_test/meta-progression/run-promotion-lock-tick
//     Body { playerId, gameMinute }. Calls `PromotionLockTickService.runTick` DIRECTLY — the SAME method
//     the real HOURLY scheduler slot calls (Lesson #3), AWAITED. Lets the window-lifecycle floor drive an
//     EXPLICIT tick value (both directions: refused before, closed after) without needing to fast-forward
//     the real `city_sim_clock`. Response `{ closed: {categoryId, lockId}[] }`.
//
//   GET /v1/_test/meta-progression/real-days-to-ticks?days=
//     Calls the REAL `realDaysToTicks` helper DIRECTLY, with the REAL LIVE `citySimTunables.
//     realSecondsPerGameMinute` getter (C0 R9's own mandate: "assert 7-day window VIA the helper, never a
//     re-derived constant"). Response `{ ticks: number }`.
//
// C9 routes:
//   POST /v1/_test/meta-progression/run-session-opened-pressure
//     Body { playerId, sessionId, gameMinute? }. Calls `DegradedCategoryPressureProducer.
//     processSessionOpened` DIRECTLY, AWAITED — the SAME method the real `SessionOpenedEvent` subscription
//     calls (Lesson #3 — zero live-vs-test divergence). `gameMinute` defaults to 0. Response
//     `{ results: DegradedCategoryPressureItemResult[] }` — every (category, item) raise attempt this
//     call's own loop produced (raised/deduped/cap_refused), empty on a genuine no-op (no eligible
//     category, or every eligible category's real state offered zero candidates).
//
// C10 routes:
//   GET /v1/_test/meta-progression/unmanaged-window-closed-events
//     Calls `PromotionLockTickService.getClosedWindowEvents` DIRECTLY — the shared in-memory test-probe
//     capture (see that service's own header: a REAL bus subscription, populated by BOTH `runTick` AND
//     `MetaProgressionAdminController#forceCloseWindow`, C10). Response `{ events:
//     UnmanagedWindowClosedEvent[] }` — the "exactly ONE event" concurrency-race falsifiable's own
//     observation surface.
//
//   POST /v1/_test/meta-progression/clear-unmanaged-window-closed-events
//     Calls `PromotionLockTickService.clearClosedWindowEvents` DIRECTLY (test-isolation reset, mirrors
//     `clear-threshold-crossed-events`). Response `{ cleared: true }`.
//
// C11+ chunks will add routes here as each chunk adds services. No route is ever removed.

import { randomUUID } from 'node:crypto';

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { masteryScore, type MasteryScoreRow } from '../db/schema/player_progression_state';
import { structuralDecisionAuditRow } from '../db/schema/progression_structural';
import { exceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import { metaProgressionTunables } from './meta-progression-tunables';
import { citySimTunables } from '../citysim/citysim-tunables';
import {
  TASK_CATEGORY_CATALOGUE,
  validateTaskCategoryCatalogueStrictMode,
  type TaskCategoryCatalogueEntry,
} from './task-category-catalogue';
import { MasteryScoreRepository } from './mastery-score.repository';
import { MasteryAccumulatorService } from './mastery-accumulator.service';
import type { MasteryThresholdCrossedEvent } from '../citysim/events/city-event-bus';
import { CategoryDecisionLogRepository } from './category-decision-log.repository';
import { GraduationSeedMapper } from './graduation-seed-mapper';
import type { LieutenantArchetype } from '../operational/lieutenant/lieutenant-archetype';
import { GraduationLieutenantFaultInjector } from './graduation-lieutenant-fault-injector';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { RecallDebtSessionSubscriber, type SessionClosedRecallDebtResult } from './recall-debt-session-subscriber.service';
import { deriveRecallDebtSignal, type RecallDebtSignal } from './recall-debt-signal';
import { playerProficiency, type PlayerProficiencyRow } from '../db/schema/delegation_ratchet';
import { RecallFaultInjector } from './recall-fault-injector';
import { PromotionLockTickService, type PromotionLockTickResult } from './promotion-lock-tick.service';
import { realDaysToTicks } from './real-day-tick-conversion';
import { DegradedCategoryPressureProducer, type DegradedCategoryPressureItemResult } from './degraded-category-pressure-producer.service';
import type { UnmanagedWindowClosedEvent } from '../citysim/events/city-event-bus';

/**
 * Test-only probe controller for `DelegationRatchetModule`.
 *
 * All routes live under the `/v1/_test/meta-progression/` prefix.
 * Mounted conditionally by `DelegationRatchetModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../protocol/test-routes-gate)
 */
@Controller()
export class DelegationRatchetTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly masteryAccumulator: MasteryAccumulatorService,
    private readonly categoryDecisionLog: CategoryDecisionLogRepository,
    private readonly graduationSeedMapper: GraduationSeedMapper,
    private readonly graduationFaultInjector: GraduationLieutenantFaultInjector,
    private readonly playerProficiencyRepo: PlayerProficiencyRepository,
    private readonly recallDebtSubscriber: RecallDebtSessionSubscriber,
    private readonly recallFaultInjector: RecallFaultInjector,
    private readonly promotionLockTick: PromotionLockTickService,
    private readonly degradedCategoryPressure: DegradedCategoryPressureProducer,
  ) {}

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /** C1 connectivity probe: returns { ok: true } if DelegationRatchetModule is in the DI graph. */
  @Get('_test/meta-progression/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * GET /v1/_test/meta-progression/read-tunables
   *
   * Returns every `metaProgressionTunables.*` getter's REAL resolved value, JSON-safe. See file header
   * for the full contract.
   */
  @Get('_test/meta-progression/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      masteryRetirementThreshold: metaProgressionTunables.masteryRetirementThreshold,
      graduationScriptSeedDepth: metaProgressionTunables.graduationScriptSeedDepth,
      retirementLockDelayH: metaProgressionTunables.retirementLockDelayH,
      promotionLockReversalCostMultiplier: metaProgressionTunables.promotionLockReversalCostMultiplier,
      promotionLockReversalWindowDays: metaProgressionTunables.promotionLockReversalWindowDays,
      recallDebtAccumulationPerSession: metaProgressionTunables.recallDebtAccumulationPerSession,
      recallDebtMax: metaProgressionTunables.recallDebtMax,
      recoveryPeriodBaseSessions: metaProgressionTunables.recoveryPeriodBaseSessions,
      recoveryPeriodScalingPerDebt: metaProgressionTunables.recoveryPeriodScalingPerDebt,
      recoveryPressureCardsPerSession: metaProgressionTunables.recoveryPressureCardsPerSession,
      unmanagedWindowPressureCardsPerSession: metaProgressionTunables.unmanagedWindowPressureCardsPerSession,
    };
  }

  // ── C2 (DD-F2 strict-mode boot-check falsifiable probe) ───────────────────────────────────────

  /**
   * POST /v1/_test/meta-progression/validate-catalogue
   *
   * Body { catalogue?: TaskCategoryCatalogueEntry[] }. Runs the REAL
   * `validateTaskCategoryCatalogueStrictMode` — see file header for the full contract. Response
   * `{ valid: boolean; error?: string }`.
   */
  @Post('_test/meta-progression/validate-catalogue')
  @HttpCode(HttpStatus.OK)
  validateCatalogue(
    @Body() body: { catalogue?: TaskCategoryCatalogueEntry[] },
  ): { valid: boolean; error?: string } {
    const catalogue = body.catalogue ?? TASK_CATEGORY_CATALOGUE;
    try {
      validateTaskCategoryCatalogueStrictMode(catalogue);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── C2 (mastery accumulator fixture seams) ─────────────────────────────────────────────────────

  /**
   * GET /v1/_test/meta-progression/mastery-score?playerId=&categoryId=
   *
   * Calls `MasteryScoreRepository.getRow` DIRECTLY. Response `{ row: MasteryScoreRow | null }`.
   */
  @Get('_test/meta-progression/mastery-score')
  async getMasteryScore(
    @Query('playerId') playerId: string,
    @Query('categoryId') categoryId: string,
  ): Promise<{ row: MasteryScoreRow | null }> {
    const row = await this.masteryScoreRepo.getRow(playerId, Number.parseInt(categoryId, 10));
    return { row };
  }

  /**
   * POST /v1/_test/meta-progression/seed-mastery-row
   *
   * Body { playerId, categoryId, masteryScore?, delegationState?, delegatedToLieutenantId? }. Raw
   * test-fixture UPSERT — see file header for the full contract. `ms_delegated_payload_chk` (mig 0002)
   * requires `delegated_to_lieutenant_id IS NOT NULL` whenever `delegation_state='DELEGATED'` — when the
   * caller asks for DELEGATED without supplying one, default to a synthetic UUID (no enforced FK on this
   * column yet, GDD L83 "FK Task 6 future" — a synthetic id satisfies the CHECK without needing a real
   * lieutenant row). Response `{ playerId, categoryId, masteryScore, delegationState }`.
   */
  @Post('_test/meta-progression/seed-mastery-row')
  @HttpCode(HttpStatus.CREATED)
  async seedMasteryRow(
    @Body()
    body: {
      playerId: string;
      categoryId: number;
      masteryScore?: number;
      delegationState?: string;
      delegatedToLieutenantId?: string;
    },
  ): Promise<{ playerId: string; categoryId: number; masteryScore: number; delegationState: string }> {
    const score = body.masteryScore ?? 0;
    const state = body.delegationState ?? 'SELF';
    const delegatedToLieutenantId =
      state === 'DELEGATED' ? (body.delegatedToLieutenantId ?? randomUUID()) : (body.delegatedToLieutenantId ?? null);
    await this.db
      .insert(masteryScore)
      .values({
        player_id: body.playerId,
        category_id: body.categoryId,
        mastery_score: score,
        delegation_state: state,
        delegated_to_lieutenant_id: delegatedToLieutenantId,
      })
      .onConflictDoUpdate({
        target: [masteryScore.player_id, masteryScore.category_id],
        set: { mastery_score: score, delegation_state: state, delegated_to_lieutenant_id: delegatedToLieutenantId },
      });
    return { playerId: body.playerId, categoryId: body.categoryId, masteryScore: score, delegationState: state };
  }

  /**
   * GET /v1/_test/meta-progression/threshold-crossed-events
   *
   * Calls `MasteryAccumulatorService.getThresholdCrossedEvents` DIRECTLY — the in-memory test probe
   * (mirrors `insurance-test.controller.ts#readShifts`'s own `lastEvent` convention, here a full list so
   * the "exactly ONCE per crossing" falsifiable can assert a COUNT, not just presence). Response
   * `{ events: MasteryThresholdCrossedEvent[] }`.
   */
  @Get('_test/meta-progression/threshold-crossed-events')
  getThresholdCrossedEvents(): { events: readonly MasteryThresholdCrossedEvent[] } {
    return { events: this.masteryAccumulator.getThresholdCrossedEvents() };
  }

  /**
   * POST /v1/_test/meta-progression/clear-threshold-crossed-events
   *
   * Calls `MasteryAccumulatorService.clearThresholdCrossedEvents` DIRECTLY (test-isolation reset).
   * Response `{ cleared: true }`.
   */
  @Post('_test/meta-progression/clear-threshold-crossed-events')
  @HttpCode(HttpStatus.OK)
  clearThresholdCrossedEvents(): { cleared: true } {
    this.masteryAccumulator.clearThresholdCrossedEvents();
    return { cleared: true };
  }

  // ── C4 (decision-log extractor + graduation-seed-mapper history-volume fixture seams) ─────────────

  /**
   * POST /v1/_test/meta-progression/seed-structural-decision
   *
   * Body { playerId, decisionType, decidedAt? }. Raw INSERT into `structural_decisions_audit` — see file
   * header for the full contract. Response `{ decisionId: string }`.
   */
  @Post('_test/meta-progression/seed-structural-decision')
  @HttpCode(HttpStatus.CREATED)
  async seedStructuralDecision(
    @Body() body: { playerId: string; decisionType: number; decidedAt?: string },
  ): Promise<{ decisionId: string }> {
    const rows = await this.db
      .insert(structuralDecisionAuditRow)
      .values({
        player_id: body.playerId,
        decision_type: body.decisionType,
        decided_at: body.decidedAt ? new Date(body.decidedAt) : new Date(),
      })
      .returning({ decision_id: structuralDecisionAuditRow.decision_id });
    return { decisionId: rows[0]!.decision_id };
  }

  /**
   * POST /v1/_test/meta-progression/seed-resolved-exception
   *
   * Body { playerId, sourceTag, method, chosenActionId?, status?, resolvedAt? }. Raw INSERT into
   * `exception_queue` already RESOLVED/ESCALATED — see file header for the full contract. Response
   * `{ exceptionId: string }`.
   */
  @Post('_test/meta-progression/seed-resolved-exception')
  @HttpCode(HttpStatus.CREATED)
  async seedResolvedException(
    @Body()
    body: {
      playerId: string;
      sourceTag: string;
      method: string;
      chosenActionId?: string;
      status?: 'resolved' | 'escalated';
      resolvedAt?: string;
    },
  ): Promise<{ exceptionId: string }> {
    const chosenActionId = body.chosenActionId ?? 'test_fixture_action';
    const resolvedAt = body.resolvedAt ? new Date(body.resolvedAt) : new Date();
    const rows = await this.db
      .insert(exceptionQueueRow)
      .values({
        player_id: body.playerId,
        lieutenant_id: null,
        event_descriptor: 'card.test.meta_progression_seed',
        candidate_actions: [
          { id: chosenActionId, label: 'x', projected_consequence: 'x', add_rule_dsl: null, source: body.sourceTag },
        ],
        suggested_action: {},
        confidence: 0,
        priority: 0,
        severity: 0,
        resolution_status: body.status ?? 'resolved',
        resolved_at: resolvedAt,
        resolution: { method: body.method, chosen_action_id: chosenActionId },
      })
      .returning({ exception_id: exceptionQueueRow.exception_id });
    return { exceptionId: rows[0]!.exception_id };
  }

  /**
   * GET /v1/_test/meta-progression/graduation-seed-preview?playerId=&categoryId=&archetype=
   *
   * Real extractor + real mapper, ZERO write to mastery_score/behavior_script/graduation_events (C5's
   * scope) — see file header for the full contract.
   */
  @Get('_test/meta-progression/graduation-seed-preview')
  async graduationSeedPreview(
    @Query('playerId') playerId: string,
    @Query('categoryId') categoryId: string,
    @Query('archetype') archetype: string,
  ): Promise<{
    source: string;
    ruleCount: number;
    ruleTriggerFields: string[];
    scriptSeedHash: string;
    disposition: string;
    seedDecisionsN: number;
    decisions: Array<{ kind: string; occurredAt: string; provenance: number | string; chosenActionId?: string }>;
  }> {
    const categoryCode = Number.parseInt(categoryId, 10);
    const n = metaProgressionTunables.graduationScriptSeedDepth;
    const decisions = await this.categoryDecisionLog.extractCategoryDecisions(playerId, categoryCode, n);
    const seedScript = this.graduationSeedMapper.mapPlayerDecisionsToSeedScript(
      decisions,
      categoryCode,
      archetype as LieutenantArchetype,
    );
    return {
      source: seedScript.source,
      ruleCount: seedScript.compiled.rules.length,
      ruleTriggerFields: seedScript.compiled.rules.map((r) => r.trigger.field),
      scriptSeedHash: seedScript.scriptSeedHash,
      disposition: seedScript.disposition,
      seedDecisionsN: seedScript.seedDecisionsN,
      decisions: decisions.map((d) => ({
        kind: d.kind,
        occurredAt: d.occurredAt.toISOString(),
        provenance: d.provenance,
        chosenActionId: d.chosenActionId,
      })),
    };
  }

  // ── C5 (induced-mid-tx-failure proof seam) ─────────────────────────────────────────────────────

  /**
   * POST /v1/_test/meta-progression/arm-lieutenant-corruption
   *
   * Body { playerId }. Calls `GraduationLieutenantFaultInjector.arm` DIRECTLY — see that class's own
   * header for the full contract. Response `{ armed: true }`.
   */
  @Post('_test/meta-progression/arm-lieutenant-corruption')
  @HttpCode(HttpStatus.OK)
  armLieutenantCorruption(@Body() body: { playerId: string }): { armed: true } {
    this.graduationFaultInjector.arm(body.playerId);
    return { armed: true };
  }

  // ── C7 (recall-debt accrual fixture seams + direct-invocation test surface) ───────────────────────

  /**
   * POST /v1/_test/meta-progression/seed-player-proficiency
   *
   * Body { playerId, categoryId, playerProficiency?, recallDebtTotal?, recoveryPeriodRemaining?,
   * lastAccruedSessionId? }. Raw test-fixture UPSERT — see file header for the full contract.
   */
  @Post('_test/meta-progression/seed-player-proficiency')
  @HttpCode(HttpStatus.CREATED)
  async seedPlayerProficiency(
    @Body()
    body: {
      playerId: string;
      categoryId: number;
      playerProficiency?: number;
      recallDebtTotal?: number;
      recoveryPeriodRemaining?: number;
      lastAccruedSessionId?: string | null;
    },
  ): Promise<{
    playerId: string;
    categoryId: number;
    playerProficiency: number;
    recallDebtTotal: number;
    recoveryPeriodRemaining: number;
  }> {
    const proficiency = body.playerProficiency ?? 50;
    const recallDebtTotal = body.recallDebtTotal ?? 0;
    const recoveryPeriodRemaining = body.recoveryPeriodRemaining ?? 0;
    const lastAccruedSessionId = body.lastAccruedSessionId ?? null;
    await this.db
      .insert(playerProficiency)
      .values({
        player_id: body.playerId,
        category_id: body.categoryId,
        player_proficiency: proficiency,
        recall_debt_total: recallDebtTotal,
        recovery_period_remaining: recoveryPeriodRemaining,
        last_accrued_session_id: lastAccruedSessionId,
      })
      .onConflictDoUpdate({
        target: [playerProficiency.player_id, playerProficiency.category_id],
        set: {
          player_proficiency: proficiency,
          recall_debt_total: recallDebtTotal,
          recovery_period_remaining: recoveryPeriodRemaining,
          last_accrued_session_id: lastAccruedSessionId,
        },
      });
    return {
      playerId: body.playerId,
      categoryId: body.categoryId,
      playerProficiency: proficiency,
      recallDebtTotal,
      recoveryPeriodRemaining,
    };
  }

  /**
   * GET /v1/_test/meta-progression/player-proficiency?playerId=&categoryId=
   *
   * Calls `PlayerProficiencyRepository.getRow` DIRECTLY, then derives the signal via the REAL
   * `deriveRecallDebtSignal` — see file header for the full contract.
   */
  @Get('_test/meta-progression/player-proficiency')
  async getPlayerProficiency(
    @Query('playerId') playerId: string,
    @Query('categoryId') categoryId: string,
  ): Promise<{ row: PlayerProficiencyRow | null; signal: RecallDebtSignal | null }> {
    const row = await this.playerProficiencyRepo.getRow(playerId, Number.parseInt(categoryId, 10));
    if (!row) return { row: null, signal: null };
    const signal = deriveRecallDebtSignal(row.recall_debt_total, metaProgressionTunables.recallDebtMax);
    return { row, signal };
  }

  /**
   * POST /v1/_test/meta-progression/run-session-closed-recall-debt
   *
   * Body { playerId, sessionId, gameMinute? }. Calls `RecallDebtSessionSubscriber.processSessionClosed`
   * DIRECTLY, AWAITED — see file header for the full contract.
   */
  @Post('_test/meta-progression/run-session-closed-recall-debt')
  @HttpCode(HttpStatus.OK)
  async runSessionClosedRecallDebt(
    @Body() body: { playerId: string; sessionId: string; gameMinute?: number },
  ): Promise<SessionClosedRecallDebtResult> {
    return this.recallDebtSubscriber.processSessionClosed(body.playerId, body.sessionId, body.gameMinute ?? 0);
  }

  // ── C8 (recall induced-mid-tx-failure proof seam + window-lifecycle direct-invocation + clock helper probe) ──

  /**
   * POST /v1/_test/meta-progression/arm-recall-corruption
   *
   * Body { playerId }. Calls `RecallFaultInjector.arm` DIRECTLY — see that class's own header for the
   * full contract. Response `{ armed: true }`.
   */
  @Post('_test/meta-progression/arm-recall-corruption')
  @HttpCode(HttpStatus.OK)
  armRecallCorruption(@Body() body: { playerId: string }): { armed: true } {
    this.recallFaultInjector.arm(body.playerId);
    return { armed: true };
  }

  /**
   * POST /v1/_test/meta-progression/run-promotion-lock-tick
   *
   * Body { playerId, gameMinute }. Calls `PromotionLockTickService.runTick` DIRECTLY, AWAITED — see file
   * header for the full contract.
   */
  @Post('_test/meta-progression/run-promotion-lock-tick')
  @HttpCode(HttpStatus.OK)
  async runPromotionLockTick(@Body() body: { playerId: string; gameMinute: number }): Promise<PromotionLockTickResult> {
    return this.promotionLockTick.runTick(body.playerId, body.gameMinute);
  }

  /**
   * GET /v1/_test/meta-progression/real-days-to-ticks?days=
   *
   * Calls the REAL `realDaysToTicks` helper DIRECTLY with the REAL LIVE `citySimTunables.
   * realSecondsPerGameMinute` getter — see file header for the full contract. Response `{ ticks: number }`.
   */
  @Get('_test/meta-progression/real-days-to-ticks')
  realDaysToTicksProbe(@Query('days') days: string): { ticks: number } {
    const ticks = realDaysToTicks(Number.parseFloat(days), citySimTunables.realSecondsPerGameMinute);
    return { ticks };
  }

  // ── C9 (degraded-category-pressure direct-invocation test surface) ────────────────────────────────

  /**
   * POST /v1/_test/meta-progression/run-session-opened-pressure
   *
   * Body { playerId, sessionId, gameMinute? }. Calls `DegradedCategoryPressureProducer.
   * processSessionOpened` DIRECTLY, AWAITED — see file header for the full contract.
   */
  @Post('_test/meta-progression/run-session-opened-pressure')
  @HttpCode(HttpStatus.OK)
  async runSessionOpenedPressure(
    @Body() body: { playerId: string; sessionId: string; gameMinute?: number },
  ): Promise<{ results: DegradedCategoryPressureItemResult[] }> {
    const results = await this.degradedCategoryPressure.processSessionOpened(body.playerId, body.sessionId, body.gameMinute ?? 0);
    return { results };
  }

  // ── C10 (shared UnmanagedWindowClosedEvent capture probe) ────────────────────────────────────────

  /**
   * GET /v1/_test/meta-progression/unmanaged-window-closed-events
   *
   * Calls `PromotionLockTickService.getClosedWindowEvents` DIRECTLY — see file header for the full
   * contract. Response `{ events: UnmanagedWindowClosedEvent[] }`.
   */
  @Get('_test/meta-progression/unmanaged-window-closed-events')
  getUnmanagedWindowClosedEvents(): { events: readonly UnmanagedWindowClosedEvent[] } {
    return { events: this.promotionLockTick.getClosedWindowEvents() };
  }

  /**
   * POST /v1/_test/meta-progression/clear-unmanaged-window-closed-events
   *
   * Calls `PromotionLockTickService.clearClosedWindowEvents` DIRECTLY (test-isolation reset). Response
   * `{ cleared: true }`.
   */
  @Post('_test/meta-progression/clear-unmanaged-window-closed-events')
  @HttpCode(HttpStatus.OK)
  clearUnmanagedWindowClosedEvents(): { cleared: true } {
    this.promotionLockTick.clearClosedWindowEvents();
    return { cleared: true };
  }
}

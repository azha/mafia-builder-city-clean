// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C3 ("EXECUTION_PLAN_
//             EVALUATOR_TICK NIGHTLY/33 -> ExecutionPlanEvaluatorService.tick: per ACTIVE plan with a slot
//             at cycle_tick, run DeviationEvaluatorService.evaluate ... no-deviation -> EXECUTED_ON_PLAN +
//             counter +1 + CycleExecutedOnPlanEvent. Deviation -> apply the rule: ABORT (...) / ESCALATE
//             (...)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.2 (the tick) +
//             §6.3 (ABORT/ESCALATE dispositions) + §6.6 (counter) + §7 (the DeviationEvaluator registry).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §3/R1 (★ DEFINITIVE —
//             NIGHTLY = one game-day, genuinely net-new, registered exactly like BRENNAR_DAILY_TICK/
//             FRICTION_BUDGET_TICK/ISOSTATIC_DEBT_TICK).
//             Pattern (registerSystem + "ONE public runTick both the scheduler AND the `_test` route
//             call", Lesson #3; calling its own Exception producer IN-LINE after its own guarded write):
//             `friction-budget-tick.service.ts` (P3-E C2). Pattern (an in-memory test-probe array pushed
//             right where the SAME method calls `bus.emit...`, never a raw bus-tap-in-tests): `isostatic-
//             debt.service.ts`'s own `clearedEvents` probe (P3-G C7).
//             — P3-H C3 — 2026-07-24
//
// `ExecutionPlanEvaluatorService` — registers `EXECUTION_PLAN_EVALUATOR_TICK` at NIGHTLY/33 (C0-reanchor
// R1/R7 — next free after FRICTION_BUDGET_TICK/31; NIGHTLY/32 stays a courtesy gap reserved for C6's own
// BENCHMARK_DRIFT_TICK). `runTick(playerId, gameMinute)` is the ONE method BOTH the scheduler hook and the
// `_test` route call (Lesson #3): scan every `PENDING` slot due exactly at `gameMinute` for this player's
// `ACTIVE` plans (`ExecutionCycleSlotsRepository.findDueAtTick`) -> per slot, run `DeviationEvaluatorService.
// evaluate` over the slot's OWN persisted `expected_constraints[]` -> no deviation: guarded slot ->
// `EXECUTED_ON_PLAN`, `ScriptStabilityCountersRepository.incrementOnStable`, `ExecutionPlansRepository.
// completeIfAllSlotsDone`, `CycleExecutedOnPlanEvent` -> deviation: guarded slot -> `DEVIATED` (stamped
// `deviation_record`), then dispatch the plan's OWN `deviation_rule`:
//   - ABORT: guarded plan -> `ABORTED`, bulk-transition the plan's remaining PENDING slots -> `ABORTED`,
//     `ScriptStabilityCountersRepository.resetOnAbort`, `PlanAbortedEvent`.
//   - ADAPT (P3-H C4 — REPLACES the C3 interim below): `AdaptationResolverService.resolve` (design §6.4 —
//     ONE bounded re-derivation); a genuine absorption is FULLY handled inside `resolve` itself (the plan's
//     own `ADAPTED` write + the remaining-slots bulk transition + the counter +1 + `PlanAdaptedEvent` all
//     happen there, mirrors `DeviationEvaluatorService.evaluate` being a pure decision while THIS method
//     owns every OTHER disposition's write — ADAPT is the one exception, disclosed: its write is intrinsic
//     to the SAME re-derivation decision, not a separable step); `resolve`'s failure branch (`{adapted:
//     false}`) falls through to the EXACT SAME escalate() dispatch ESCALATE-mode plans use below (D4's own
//     documented "no valid adaptation -> fallback ESCALATE").
//   - ESCALATE (or the ADAPT fallback above): guarded plan -> `ESCALATED`,
//     `ExecutionPlanDeviationExceptionProducer.raise` (the Exception spine REUSE — NO bus event, design
//     §4's own event list has none for ESCALATE; the Exception insert IS the observable signal), counter
//     untouched (D5 — "frozen while ESCALATED-pending", so this branch simply never calls a counter-repo
//     method).
//
// ★ C3 ADAPT PLACEHOLDER — REPLACED THIS CHUNK (C4): the C3 landing routed EVERY `ADAPT`-mode deviation
// through the SAME ESCALATE path (no resolver existed yet, so every re-derivation attempt was trivially
// unable to adapt — D4's own documented ADAPT-failure fallback, applied honestly to "no resolver exists at
// all"). This chunk (C4) replaces that placeholder with the REAL `AdaptationResolverService.resolve` call
// below — the C3 spec's own placeholder-fallback tests (e.g. "(10) ... the C3-disclosed ADAPT-fallback ->
// ESCALATED") stay green under the REAL resolver too (see `adaptation-resolver.service.ts`'s own header
// for the "zero remaining slots -> cannot adapt" disclosed reading that keeps that exact test's outcome
// unchanged).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../citysim/scheduler/city_sim_system';
import { CityEventBus, type CycleExecutedOnPlanEvent, type PlanAbortedEvent } from '../citysim/events/city-event-bus';
import { metaProgressionTunables } from './meta-progression-tunables';
import { ExecutionPlansRepository } from './execution-plans.repository';
import { ExecutionCycleSlotsRepository } from './execution-cycle-slots.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { DeviationEvaluatorService } from './deviation-evaluator.service';
import { ExecutionPlanDeviationExceptionProducer } from './execution-plan-deviation-exception-producer.service';
import { AdaptationResolverService } from './adaptation-resolver.service';
import type { ConstraintClause, ConstraintConditionType } from './horizon-tier-ladder';
import type { ExecutionPlanRow } from '../db/schema/vertical_horizon';

/** The falsifiable proof surface `runTick` returns — every outcome's own count, never just a bare total. */
export interface ExecutionPlanEvaluatorTickResult {
  readonly dueCount: number;
  readonly executedCount: number;
  readonly abortedCount: number;
  readonly escalatedCount: number;
}

@Injectable()
export class ExecutionPlanEvaluatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExecutionPlanEvaluatorService.name);

  /** Test-probe arrays (never used in production paths) — mirrors `IsostaticDebtService`'s own
   *  `clearedEvents` shape: pushed IN-LINE right where this SAME method calls `bus.emit...`, never a raw
   *  bus subscription tap. */
  private executedEvents: CycleExecutedOnPlanEvent[] = [];
  private abortedEvents: PlanAbortedEvent[] = [];

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly plansRepo: ExecutionPlansRepository,
    private readonly slotsRepo: ExecutionCycleSlotsRepository,
    private readonly counterRepo: ScriptStabilityCountersRepository,
    private readonly deviationEvaluator: DeviationEvaluatorService,
    private readonly deviationExceptionProducer: ExecutionPlanDeviationExceptionProducer,
    private readonly adaptationResolver: AdaptationResolverService,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.EXECUTION_PLAN_EVALUATOR_TICK,
      cadence: Cadence.NIGHTLY,
      order: 33,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'ExecutionPlanEvaluatorService registered EXECUTION_PLAN_EVALUATOR_TICK at NIGHTLY/33 — next free ' +
        'after FRICTION_BUDGET_TICK/31 (32 stays a courtesy gap for BENCHMARK_DRIFT_TICK, C6). Each ' +
        'in-game night, per player: evaluate every PENDING slot due today on an ACTIVE plan against the ' +
        'closed DeviationEvaluator registry (3 LIVE incl. CAPABILITY_DEBT_BELOW per ★H-2 WIRE-LIVE, ' +
        '2 RESERVED); no deviation -> EXECUTED_ON_PLAN + counter+1; deviation -> DEVIATED then ABORT or ' +
        'ESCALATE per the plan\'s own deviation_rule. Organically a no-op for a player with no ACTIVE plans.',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/33 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 33} — the design §6.2 per-cycle evaluation for one player. Public so a `_test` route
   * can drive it directly for E2E (Lesson #3, zero live-vs-test divergence). Production: called only via
   * the scheduler registration.
   */
  async runTick(playerId: string, gameMinute: number): Promise<ExecutionPlanEvaluatorTickResult> {
    const due = await this.slotsRepo.findDueAtTick(playerId, gameMinute);
    let executedCount = 0;
    let abortedCount = 0;
    let escalatedCount = 0;

    for (const { slot, plan } of due) {
      const result = await this.deviationEvaluator.evaluate(
        playerId,
        plan.lieutenant_id,
        plan.standing_order_id,
        gameMinute,
        (slot.expected_constraints as ConstraintClause[]) ?? [],
      );

      if (!result.deviated) {
        const flippedSlot = await this.slotsRepo.markExecutedOnPlan(slot.slot_id);
        if (!flippedSlot) continue; // lost the race — another tick already processed this exact slot.

        await this.counterRepo.incrementOnStable(playerId, plan.lieutenant_id);
        await this.plansRepo.completeIfAllSlotsDone(plan.plan_id);

        const event: CycleExecutedOnPlanEvent = {
          type: 'cycle_executed_on_plan',
          playerId,
          lieutenantId: plan.lieutenant_id,
          planId: plan.plan_id,
          slotId: slot.slot_id,
          gameMinute,
        };
        this.bus.emitCycleExecutedOnPlan(event);
        this.executedEvents.push(event);
        executedCount++;
        continue;
      }

      // Deviated: the triggering slot -> DEVIATED FIRST (both ABORT and ESCALATE cases, design's own
      // falsifiable text names "slot DEVIATED" for each), THEN dispatch the plan's own deviation_rule.
      const deviationRecord = {
        failed_clauses: result.failedClauses,
        severity: result.severity,
        evaluated_at_tick: gameMinute,
      };
      const flippedSlot = await this.slotsRepo.markDeviated(slot.slot_id, deviationRecord);
      if (!flippedSlot) continue; // lost the race.

      if (plan.deviation_rule === 'ABORT') {
        const abortRecoveryCostRef = {
          recovery_pct: metaProgressionTunables.planAbortRecoveryCostPct,
          aborted_at_tick: gameMinute,
        };
        const abortedPlan = await this.plansRepo.markAborted(plan.plan_id, abortRecoveryCostRef);
        if (!abortedPlan) continue; // plan already left ACTIVE via another path — no double transition.

        await this.slotsRepo.markRemainingAborted(plan.plan_id);
        await this.counterRepo.resetOnAbort(playerId, plan.lieutenant_id, gameMinute);

        const event: PlanAbortedEvent = {
          type: 'plan_aborted',
          playerId,
          lieutenantId: plan.lieutenant_id,
          planId: plan.plan_id,
          slotId: slot.slot_id,
          failedConstraintType: result.failedClauses[0] ?? '',
          gameMinute,
        };
        this.bus.emitPlanAborted(event);
        this.abortedEvents.push(event);
        abortedCount++;
      } else if (plan.deviation_rule === 'ADAPT') {
        // P3-H C4 — the REAL bounded re-derivation (design §6.4), replacing the C3 interim. `resolve` owns
        // its OWN full write+counter+event on success (file header — the one disclosed exception to "this
        // method owns every disposition's write"); on failure it does NOTHING (no partial write), so the
        // SAME escalate() fallback ESCALATE-mode plans use below applies unchanged.
        const resolved = await this.adaptationResolver.resolve(plan, slot.slot_id, gameMinute);
        if (!resolved.adapted) {
          const didEscalate = await this.escalate(playerId, plan, result.failedClauses, gameMinute);
          if (didEscalate) escalatedCount++;
        }
        // A genuine adapt is intentionally NOT counted in dueCount's own executed/aborted/escalated
        // breakdown (ExecutionPlanEvaluatorTickResult stays additive-only — C3's own pinned `toEqual`
        // shape floor test is untouched; the ADAPTED outcome is observable via plan_status + the
        // AdaptationResolverService event probe, the SAME "DB state + probe, not a result-shape field"
        // posture every OTHER per-slot outcome ALSO remains verifiable through).
      } else {
        // ESCALATE (T2+).
        const didEscalate = await this.escalate(playerId, plan, result.failedClauses, gameMinute);
        if (didEscalate) escalatedCount++;
      }
    }

    return { dueCount: due.length, executedCount, abortedCount, escalatedCount };
  }

  /**
   * The ESCALATE disposition (design §6.3) — SHARED by both the direct ESCALATE-mode branch and the
   * ADAPT-mode fallback (D4's own documented "no valid adaptation -> fallback ESCALATE") so the two
   * callers above can never drift apart. Guarded plan -> `ESCALATED`, the Exception spine REUSE, counter
   * left UNTOUCHED (D5 — frozen while ESCALATED-pending, so this method never calls a counter-repo
   * method). Returns whether the escalation actually landed (`false` = a lost race — `markEscalated`'s own
   * guarded-UPDATE null return, the SAME defense-in-depth every other disposition writer already has).
   */
  private async escalate(
    playerId: string,
    plan: ExecutionPlanRow,
    failedClauses: readonly ConstraintConditionType[],
    gameMinute: number,
  ): Promise<boolean> {
    const escalatedPlan = await this.plansRepo.markEscalated(plan.plan_id);
    if (!escalatedPlan) return false;

    await this.deviationExceptionProducer.raise(playerId, plan.lieutenant_id, plan.plan_id, failedClauses, gameMinute);
    return true;
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `CycleExecutedOnPlanEvent` fired this process (test-probe — never used in production paths). */
  getExecutedEvents(): readonly CycleExecutedOnPlanEvent[] {
    return this.executedEvents;
  }

  /** Every `PlanAbortedEvent` fired this process (test-probe — never used in production paths). */
  getAbortedEvents(): readonly PlanAbortedEvent[] {
    return this.abortedEvents;
  }

  /** Clear both in-memory event probes (called by the test reset route). */
  clearEventProbes(): void {
    this.executedEvents = [];
    this.abortedEvents = [];
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C4 ("`AdaptationResolverService.
//             resolve` (design §6.4 — ONE bounded re-derivation -> fallback ESCALATE)"); REPLACES the C3
//             interim ("execution-plan-evaluator.service.ts currently routes ADAPT-rule deviations through
//             ESCALATE" — this service is the REAL mechanism the C3 header's own "★ ADAPT PLACEHOLDER" note
//             names as its own eventual replacement).
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.4 ("ONE
//             re-derivation attempt: re-read the still-valid standing order, re-derive the remaining slots'
//             `expected_constraints` from current state; if every remaining slot now has a satisfiable
//             constraint set -> slots ADAPTED, counter += 1 (absorption = stable, canon), PlanAdaptedEvent;
//             ANY remaining slot un-satisfiable -> fallback ESCALATE. No search, no heuristics (rich
//             adaptation = TD). Deterministic, no rng.") + D13 ④ ("a T3 ADAPT plan's bounded re-derivation
//             CANNOT clear a capability debt ... so the debt clause re-fails -> fallback ESCALATE").
//             REUSE: `StandingOrderRepository.getActiveOrInjecting` (Phase-25 T2 — "re-read the still-valid
//             standing order" IS this exact lieutenant-scoped, not order_id-scoped, active-or-injecting
//             read); `DeviationEvaluatorService.evaluate` (the SAME AND-strict/conservative-DEVIATED
//             registry C3 already built, re-run against the FRESH order); `ScriptStabilityCountersRepository.
//             incrementOnStable` (design §6.6 — "+1 on EXECUTED_ON_PLAN/ADAPTED", the SAME method, no new
//             counter-write path). ZERO new reads of `lieutenant`/`capability_debts` — both ride through
//             the REUSED evaluator.
//             ★ DISCLOSED DESIGN CHOICE — no remaining PENDING slots -> cannot adapt (fallback ESCALATE):
//             design §6.4's "every remaining slot ... satisfiable" is vacuous-true on an EMPTY remaining
//             set on its face, but the C3 spec's own test (10) (a 1-cycle T3 ADAPT plan + the ★H-2 debt
//             deviation -> ESCALATED, ⊥ APPROVED, part of THIS chunk's frozen floor) requires the OPPOSITE
//             reading for a plan with zero remaining slots: "adaptation" absorbs a deviation so the plan's
//             REMAINING committed cycles can continue: with nothing left to continue INTO, there is nothing
//             to adapt, so this resolver treats an empty remaining set as un-satisfiable, never vacuously
//             satisfiable — keeping test (10) green under the REAL resolver, not just the C3 placeholder.
//             ★ DISCLOSED DESIGN CHOICE — plan-level `ADAPTED` (not just slot-level), terminal, no further
//             ticking: mirrors ABORT/ESCALATE's OWN "the plan's active progression concludes" shape
//             (`findDueAtTick`'s `WHERE plan_status='ACTIVE'` guard already excludes ABORTED/ESCALATED
//             plans from ever being scanned again); `execution_plan_status` carries an `ADAPTED` member
//             sibling to ABORTED/ESCALATED/COMPLETED (mig 0141) — a v1 "bounded, no search" absorption
//             closes out the WHOLE plan in one shot (remaining slots bulk-`ADAPTED`, never individually
//             re-evaluated at their own future cycle_tick) rather than leaving a partially-adapted plan
//             ticking indefinitely, which "no search, no heuristics" explicitly rules out simulating.
//             — P3-H C4 — 2026-07-24

import { Injectable, Logger } from '@nestjs/common';

import { CityEventBus, type PlanAdaptedEvent } from '../citysim/events/city-event-bus';
import { StandingOrderRepository } from '../operational/lieutenant/standing-order/standing-order.repository';
import { ExecutionPlansRepository } from './execution-plans.repository';
import { ExecutionCycleSlotsRepository } from './execution-cycle-slots.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { DeviationEvaluatorService } from './deviation-evaluator.service';
import { minimalExpectedConstraints } from './horizon-tier-ladder';
import type { ExecutionPlanRow } from '../db/schema/vertical_horizon';

/** `resolve`'s outcome — the caller (`ExecutionPlanEvaluatorService.runTick`) branches on `adapted` alone;
 *  everything else (the write, the counter, the event) already happened inside this call when `true`. */
export interface AdaptationResolveResult {
  readonly adapted: boolean;
}

@Injectable()
export class AdaptationResolverService {
  private readonly logger = new Logger(AdaptationResolverService.name);

  /** In-memory test-probe array (never used in production paths) — mirrors `ExecutionPlanEvaluatorService`'s
   *  own `executedEvents`/`abortedEvents` shape: pushed IN-LINE right where THIS method calls `bus.emit...`. */
  private adaptedEvents: PlanAdaptedEvent[] = [];

  constructor(
    private readonly plansRepo: ExecutionPlansRepository,
    private readonly slotsRepo: ExecutionCycleSlotsRepository,
    private readonly counterRepo: ScriptStabilityCountersRepository,
    private readonly standingOrderRepo: StandingOrderRepository,
    private readonly deviationEvaluator: DeviationEvaluatorService,
    private readonly bus: CityEventBus,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `PlanAdaptedEvent` fired this process (test-probe — never used in production paths). */
  getAdaptedEvents(): readonly PlanAdaptedEvent[] {
    return this.adaptedEvents;
  }

  /** Clear the in-memory adapted-event probe (called by the test reset route). */
  clearAdaptedEvents(): void {
    this.adaptedEvents = [];
  }

  // ── the ADAPT disposition (design §6.4) ─────────────────────────────────────────────────────────

  /**
   * `plan`'s triggering slot (`triggeringSlotId`) has ALREADY been marked `DEVIATED` by the caller
   * (`ExecutionPlanEvaluatorService.runTick`, the SAME "slot DEVIATED first, then dispatch" ordering every
   * disposition follows) by the time this is called — it is passed through ONLY for the `PlanAdaptedEvent`
   * audit payload (mirrors `PlanAbortedEvent.slotId`), never re-read or re-evaluated here. ONE bounded
   * re-derivation attempt (design §6.4):
   *   1. `listPendingForPlan` — the plan's remaining (still-`PENDING`, future-cycle) slots. Empty ->
   *      cannot adapt (the file header's own disclosed reading).
   *   2. `getActiveOrInjecting(plan.lieutenant_id)` — "re-read the still-valid standing order", REUSE
   *      (Phase-25 T2): the lieutenant's CURRENT active-or-injecting order, which may be the SAME order_id
   *      the plan was created with (when the trigger was NOT `STANDING_ORDER_ACTIVE`) or a genuinely
   *      DIFFERENT, freshly-reissued one (when it was, and the player already re-issued). None -> cannot
   *      adapt.
   *   3. Re-run the SAME closed constraint registry (`DeviationEvaluatorService.evaluate`, REUSE) against
   *      the fresh order, for the plan's OWN minimal clause set (`minimalExpectedConstraints()` — the SAME
   *      3-clause v1 set every slot carries, design §6.5/D13). Any clause still failing (e.g.
   *      `CAPABILITY_DEBT_BELOW` — D13 ④, a player-state fact no order re-derivation can clear) -> cannot
   *      adapt.
   *   4. All satisfiable -> `markAdapted` (plan -> `ADAPTED`, re-bound to the fresh order) ->
   *      `markRemainingAdapted` (the remaining slots, bulk) -> `incrementOnStable` (design §6.6's OWN "+1
   *      on EXECUTED_ON_PLAN/ADAPTED", REUSE, no new counter-write path) -> `PlanAdaptedEvent`.
   * Deterministic, no rng, no search. Returns `{adapted:false}` on ANY of the "cannot adapt" branches
   * above (including a lost race on `markAdapted` itself — defense-in-depth, mirrors `markAborted`/
   * `markEscalated`'s own null-return convention) — the caller then runs the SAME fallback-ESCALATE path
   * ESCALATE-mode plans already use.
   */
  async resolve(plan: ExecutionPlanRow, triggeringSlotId: string, gameMinute: number): Promise<AdaptationResolveResult> {
    const remaining = await this.slotsRepo.listPendingForPlan(plan.plan_id);
    if (remaining.length === 0) {
      this.logger.log(
        `ADAPT cannot resolve (bounded v1): plan=${plan.plan_id} has ZERO remaining PENDING slots — ` +
          'nothing left to adapt into (fallback ESCALATE).',
      );
      return { adapted: false };
    }

    const freshOrder = await this.standingOrderRepo.getActiveOrInjecting(plan.lieutenant_id);
    if (freshOrder === null) {
      this.logger.log(
        `ADAPT cannot resolve: plan=${plan.plan_id} lieutenant=${plan.lieutenant_id} has NO still-valid ` +
          'standing order to re-derive from (fallback ESCALATE).',
      );
      return { adapted: false };
    }

    const rederived = await this.deviationEvaluator.evaluate(
      plan.player_id,
      plan.lieutenant_id,
      freshOrder.order_id,
      gameMinute,
      minimalExpectedConstraints(),
    );
    if (rederived.deviated) {
      this.logger.log(
        `ADAPT cannot resolve: plan=${plan.plan_id} re-derivation against the fresh order ${freshOrder.order_id} ` +
          `still fails (${rederived.failedClauses.join(', ')}) — fallback ESCALATE.`,
      );
      return { adapted: false };
    }

    const adaptedPlan = await this.plansRepo.markAdapted(plan.plan_id, freshOrder.order_id);
    if (!adaptedPlan) {
      return { adapted: false }; // lost the race — another path already left ACTIVE first.
    }
    await this.slotsRepo.markRemainingAdapted(plan.plan_id);
    await this.counterRepo.incrementOnStable(plan.player_id, plan.lieutenant_id);

    const event: PlanAdaptedEvent = {
      type: 'plan_adapted',
      playerId: plan.player_id,
      lieutenantId: plan.lieutenant_id,
      planId: plan.plan_id,
      slotId: triggeringSlotId,
      newStandingOrderId: freshOrder.order_id,
      gameMinute,
    };
    this.bus.emitPlanAdapted(event);
    this.adaptedEvents.push(event);

    this.logger.log(
      `ADAPT resolved: plan=${plan.plan_id} re-bound to standing order ${freshOrder.order_id}, counter+1.`,
    );
    return { adapted: true };
  }
}

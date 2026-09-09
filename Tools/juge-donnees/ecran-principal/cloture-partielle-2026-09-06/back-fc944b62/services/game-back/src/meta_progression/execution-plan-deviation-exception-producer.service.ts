// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C3 ("deviation -> apply the
//             rule: ... ESCALATE (T2+, plan ESCALATED, Exception into the LIVE spine, rationale
//             `execution_plan_deviation`, counter frozen)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.3 ("emit an
//             Exception (spine REUSE, rationale `execution_plan_deviation`) ... the resolution routes back
//             (cancel / modify / force) — a tactical exception decision, NOT structural").
//             Pattern (a NEW producer file, duplicate-provided `ExceptionsRepository`, calling the
//             EXISTING, unmodified `insert()` — never an ExceptionsModule import): `degraded-category-
//             pressure-producer.service.ts` (P3-F C9) / `friction-threshold-exception-producer.service.ts`
//             (P3-E C2) — the SAME "new producer file outside src/exceptions/" convention this codebase
//             uses everywhere a cross-domain tick needs to raise a card.
//             — P3-H C3 — 2026-07-24
//
// `ExecutionPlanDeviationExceptionProducer` — raises ONE Exception card into the LIVE
// `exception_queue_spine` when an `ExecutionPlan`'s ESCALATE disposition fires (design §6.3). The card
// carries the SAME generic acknowledge/escalate actions every OTHER lightweight producer in this codebase
// ships (`DegradedCategoryPressureProducer.buildActions`'s own shape, copied verbatim) — a plan-specific
// resolve action (cancel / modify / force the execution plan, design §6.3's own forward-looking prose) is
// NOT built here (it would need a NEW `ExceptionEffect` kind + resolve-handler wiring in `src/exceptions/`,
// a heavier cross-cutting change outside this chunk's stated scope — a named TD, not silently invented).
// No dedup check is needed: the caller (`ExecutionPlanEvaluatorService`) only ever calls `raise` AFTER a
// slot's OWN guarded `DEVIATED` transition has ALREADY landed (at most once per slot, ever — the
// Concurrence proof), so a duplicate raise for the SAME deviation is structurally unreachable.

import { Injectable, Logger } from '@nestjs/common';

import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import type { CandidateActionView } from '../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../exceptions/method-by-action-id';
import type { ConstraintConditionType } from './horizon-tier-ladder';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `DEGRADED_CATEGORY_PRESSURE_
 *  SOURCE`) — the design's own literal "rationale `execution_plan_deviation`" text (§6.3), realized as the
 *  SAME `candidate_actions[].source` BO-diagnostic marker convention every sibling producer uses. */
export const EXECUTION_PLAN_DEVIATION_SOURCE = 'execution_plan_deviation';

/** This producer's own candidate action — `CandidateActionView` + the `source` tag (mirrors
 *  `DegradedCategoryPressureCandidateActionView`'s own shape verbatim). */
interface ExecutionPlanDeviationCandidateActionView extends CandidateActionView {
  readonly source: typeof EXECUTION_PLAN_DEVIATION_SOURCE;
}

function buildActions(planId: string): ExecutionPlanDeviationCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the deviated execution plan',
      label_i18n: { key: 'exception.execution_plan_deviation.acknowledge.label', params: {} }, // TD-455
      projected_consequence: `Plan ${planId} stays escalated until you decide (cancel / modify / force — a future surface).`,
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: EXECUTION_PLAN_DEVIATION_SOURCE,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.execution_plan_deviation.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.execution_plan_deviation.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: EXECUTION_PLAN_DEVIATION_SOURCE,
    },
  ];
}

@Injectable()
export class ExecutionPlanDeviationExceptionProducer {
  private readonly logger = new Logger(ExecutionPlanDeviationExceptionProducer.name);

  constructor(
    // Duplicate-provided instance (VerticalHorizonModule provides this class directly, NEVER importing
    // ExceptionsModule — the SAME "stateless DB-only class, harmless second instance" precedent every
    // OTHER `src/exceptions/` producer outside that directory already follows, this file's own header).
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /**
   * Raise ONE Exception card for a deviated `ExecutionPlan`'s ESCALATE (or C3-disclosed ADAPT-fallback)
   * disposition (design §6.3). Returns the new card's id, or `null` if REFUSED by the D5 per-lieutenant
   * queue cap (`ExceptionsRepository.insert`'s own existing refuse-insert contract — logged, never
   * thrown, never retried; the plan's OWN `plan_status='ESCALATED'` transition already landed by the time
   * this is called, so a cap-refusal here does not roll it back — the plan transition is the ground truth,
   * the card is a best-effort audit/UI surface, mirrors every sibling producer's own D5-refusal posture).
   */
  async raise(
    playerId: string,
    lieutenantId: string,
    planId: string,
    failedClauses: readonly ConstraintConditionType[],
    gameMinute: number,
  ): Promise<string | null> {
    const actions = buildActions(planId);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: lieutenantId,
      event_descriptor: `Execution plan ${planId} deviated (${failedClauses.join(', ')}) and escalated for your decision.`,
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });
    if (!exceptionId) {
      this.logger.warn(
        `raise: cap-refused (D5) player=${playerId} lieutenant=${lieutenantId} plan=${planId} gameMinute=${gameMinute} — ` +
          'no card inserted (the plan ESCALATE transition itself is unaffected).',
      );
      return null;
    }
    return exceptionId;
  }
}

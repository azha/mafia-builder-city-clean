// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C3 ("per-cycle evaluator +
//             DeviationEvaluator + ABORT/ESCALATE + ScriptStabilityCounter").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.2 ("run
//             DeviationEvaluatorService.evaluate(slot)") + §7.2 (AND-strict conjunction,
//             conservative-DEVIATED-on-missing-state, `deviation_severity` = the most-critical failed
//             clause's `tolerance_bucket`).
//             Pattern (a thin DI service bundling the eval context + dispatching to the pure registry,
//             the AND-strict aggregate via Promise.all never a short-circuit): `horizon-predicate-
//             evaluator.service.ts#HorizonPredicateEvaluatorService` (the DeviationEvaluator's own sibling
//             service, P3-G C2).
//             — P3-H C3 — 2026-07-24
//
// `DeviationEvaluatorService.evaluate` — the per-slot DHL evaluation (design §6.2/§7): evaluates every
// `ConstraintClause` in a slot's `expected_constraints[]` (data-driven off whatever was PERSISTED at plan
// creation — see `horizon-tier-ladder.ts#minimalExpectedConstraints`'s own header for the 2-clause-vs-
// 3-clause resolution) against REAL org state, AND-strict (§7.2), and returns the aggregate deviation
// verdict + the most-critical failed clause's severity + every failed clause's type (for the
// `deviation_record` audit stamp `ExecutionPlanEvaluatorService` persists on the slot).

import { Injectable } from '@nestjs/common';

import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { StandingOrderRepository } from '../operational/lieutenant/standing-order/standing-order.repository';
import { CapabilityDebtsRepository } from './capability-debts.repository';
import { evaluateConstraintClause, type ConstraintEvalContext } from './constraint-evaluators';
import type { ConstraintClause, ConstraintConditionType, DeviationSeverityValue } from './horizon-tier-ladder';

/** Ascending criticality (design §7.2/§3 — the pgEnum's OWN declaration order, NEGLIGIBLE < MODERATE <
 *  SEVERE, so PG's own enum comparison operators are meaningful). Mirrors this codebase's own "closed rank
 *  map, never a comparison against the raw enum" idiom for ordinal enums elsewhere in this lot. */
const SEVERITY_RANK: Readonly<Record<DeviationSeverityValue, number>> = {
  NEGLIGIBLE: 0,
  MODERATE: 1,
  SEVERE: 2,
};

/** One slot's full evaluation outcome. `deviated=false` -> `severity=null`/`failedClauses=[]` (the clean
 *  cycle). `deviated=true` -> `severity` is the MOST-critical failed clause's `tolerance_bucket` (§7.2);
 *  `failedClauses` lists EVERY failed clause's type (never just the first — AND-strictness means more than
 *  one clause can fail on the SAME cycle, e.g. a vanished lieutenant AND a lapsed order at once). */
export interface DeviationEvalResult {
  readonly deviated: boolean;
  readonly severity: DeviationSeverityValue | null;
  readonly failedClauses: readonly ConstraintConditionType[];
}

@Injectable()
export class DeviationEvaluatorService {
  constructor(
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly standingOrderRepo: StandingOrderRepository,
    private readonly capabilityDebtsRepo: CapabilityDebtsRepository,
  ) {}

  /**
   * Evaluate every clause in `clauses` (a slot's own `expected_constraints[]`, cast by the caller — the
   * jsonb column's runtime shape) against REAL org state for `(playerId, lieutenantId, standingOrderId)`
   * at `nowGameMinute`. AND-strict + conservative-DEVIATED (§7.2): every clause is evaluated (never a
   * short-circuit on the first failure — `Promise.all`), so a single tick can genuinely report MULTIPLE
   * failed clauses for the `deviation_record` audit. Pure read, no write, no rng.
   */
  async evaluate(
    playerId: string,
    lieutenantId: string,
    standingOrderId: string,
    nowGameMinute: number,
    clauses: readonly ConstraintClause[],
  ): Promise<DeviationEvalResult> {
    const ctx: ConstraintEvalContext = {
      playerId,
      lieutenantId,
      standingOrderId,
      nowGameMinute,
      lieutenantRepo: this.lieutenantRepo,
      standingOrderRepo: this.standingOrderRepo,
      capabilityDebtsRepo: this.capabilityDebtsRepo,
    };
    const verdicts = await Promise.all(
      clauses.map(async (clause) => ({ clause, holds: await evaluateConstraintClause(ctx, clause) })),
    );
    const failed = verdicts.filter((v) => !v.holds).map((v) => v.clause);
    if (failed.length === 0) {
      return { deviated: false, severity: null, failedClauses: [] };
    }
    const severity = failed.reduce<DeviationSeverityValue>(
      (max, c) => (SEVERITY_RANK[c.tolerance_bucket] > SEVERITY_RANK[max] ? c.tolerance_bucket : max),
      'NEGLIGIBLE',
    );
    return { deviated: true, severity, failedClauses: failed.map((c) => c.type) };
  }
}

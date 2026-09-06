// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C3 ("per-cycle evaluator +
//             DeviationEvaluator + ABORT/ESCALATE + ScriptStabilityCounter").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §7 (the closed
//             `ConstraintConditionTypeEnum` registry, 3 LIVE + 2 RESERVED — `CAPABILITY_DEBT_BELOW` LIVE
//             per ★H-2 WIRE-LIVE) + D3 (AND-strict, conservative-DEVIATED on missing state) + D13 (the
//             ★H-2 debt-coupling contract, ① READ-ONLY surface / ② SEVERE trigger bucket).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §6/R4 (★ DEFINITIVE —
//             `LIEUTENANT_PRESENT` reads `extinction_state != 'RESOLVED'` via a direct test-fixture write,
//             no real producer exists yet; the ★H-2 raw-bucket read is a NEW additive
//             `CapabilityDebtsRepository` method, DI'd via `BudgetsHorizonModule`).
//             Pattern (closed map keyed by an enum, LIVE evaluators + `reservedThrows` on the RESERVED
//             members, a boot strict-check taking the emitted set as a PARAMETER): `predicate-
//             evaluators.ts` (P3-G C2 — the DeviationEvaluator's own sibling registry, same closed-world
//             discipline) + `capability-catalogue.ts#validateCapabilityCatalogueStrictMode` (the boot-check
//             shape, DD-F2/DD-G2).
//             — P3-H C3 — 2026-07-24
//
// `constraint-evaluators.ts` — the closed `ConstraintConditionType` registry (design §7.1): 3 LIVE types
// (each reads a REAL surface) + 2 RESERVED types (held, never evaluated — `validateConstraintRegistryStrictMode`
// refuses any emitted set that names one, mirroring the predicate-evaluators.ts/capability-catalogue.ts
// closed-world pair). AND-strictness + conservative-DEVIATED-on-missing-state (§7.2) both fall out of
// ordinary REUSE arithmetic below: `LIEUTENANT_PRESENT`/`STANDING_ORDER_ACTIVE` treat a null read (the
// lieutenant/order row genuinely absent) as a FAILED clause, never a throw or a silent pass —
// `evaluateConstraintClause`'s caller (`DeviationEvaluatorService`) then folds every clause with a plain
// `Promise.all` + AND-strict aggregate, never a short-circuit (so every clause's individual verdict is
// always available for the `deviation_record` audit stamp).

import type { ConstraintConditionType, ConstraintClause } from './horizon-tier-ladder';
import type { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import type { StandingOrderRepository } from '../operational/lieutenant/standing-order/standing-order.repository';
import type { CapabilityDebtsRepository } from './capability-debts.repository';
import { computePenaltyBucket } from './penalty-bucket';

/** The LIVE subset (design §7.1) — `validateConstraintRegistryStrictMode` refuses any emitted clause type
 *  outside this set (the closed-world rule, §7.2). `CAPABILITY_DEBT_BELOW` is LIVE per ★H-2 WIRE-LIVE
 *  (RATIFIED 2026-07-24 — overturning the author's DEFER default, decisions §6/D13). */
export const LIVE_CONSTRAINT_TYPES: ReadonlySet<ConstraintConditionType> = new Set([
  'LIEUTENANT_PRESENT',
  'STANDING_ORDER_ACTIVE',
  'CAPABILITY_DEBT_BELOW',
]);

/**
 * Everything a constraint evaluator needs to read, bundled once per `evaluate` call (mirrors
 * `PredicateEvalContext`'s own "bundle the repos, never a per-clause DI resolve" shape). `standingOrderId`/
 * `lieutenantId` are the PLAN's own soft-ref identity (design §3 — `execution_plans.standing_order_id`/
 * `lieutenant_id`), never re-derived per clause.
 */
export interface ConstraintEvalContext {
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly standingOrderId: string;
  /** The evaluator tick's own `ctx.gameMinute` — the SAME boundary tick the slot's `cycle_tick` matches
   *  (C0-reanchor R7: NIGHTLY fires exactly on multiples of `inGameDayLengthMinutes`), REUSED as "now" for
   *  the `STANDING_ORDER_ACTIVE` liveness comparison — never a second clock read. */
  readonly nowGameMinute: number;
  readonly lieutenantRepo: LieutenantRepository;
  readonly standingOrderRepo: StandingOrderRepository;
  readonly capabilityDebtsRepo: CapabilityDebtsRepository;
}

type ConstraintEvaluatorFn = (ctx: ConstraintEvalContext) => Promise<boolean>;

/** A RESERVED type's evaluator — never a real code path (`validateConstraintRegistryStrictMode` refuses any
 *  emitted set naming it, so reaching this throw means a slot was created with a RESERVED clause — the
 *  boot-check should have refused it). Mirrors `predicate-evaluators.ts#reservedThrows` verbatim. */
function reservedThrows(type: ConstraintConditionType): ConstraintEvaluatorFn {
  return () =>
    Promise.reject(
      new Error(
        `[constraint-evaluators] "${type}" is RESERVED (no real substrate on this base) — it must never be ` +
          'evaluated. Reaching this throw means a slot was created with a RESERVED constraint type, which ' +
          'validateConstraintRegistryStrictMode should have refused at boot.',
      ),
    );
}

const CONSTRAINT_EVALUATORS: Readonly<Record<ConstraintConditionType, ConstraintEvaluatorFn>> = {
  /**
   * `LIEUTENANT_PRESENT` (design §7.1/D3, divergence #7) — C0-reanchor §6/R4 ★ DEFINITIVE: the real
   * discriminator is `extinction_state != 'RESOLVED'`. `recruited_at IS NOT NULL` stays in the DOCUMENTED
   * clause (design's own literal text) but is NOT re-checked here at runtime: the column is `NOT NULL
   * DEFAULT now()` (`lieutenant.ts:111`), so the comparison is trivially true by schema construction on
   * EVERY row — a literal `!== null` check against a non-nullable read would be dead code (and a TS
   * strict-mode no-op), not an honest runtime discriminator. Missing row (the lieutenant genuinely does
   * not exist) -> `false` (conservative-DEVIATED, §7.2).
   */
  LIEUTENANT_PRESENT: async (ctx) => {
    const row = await ctx.lieutenantRepo.getExtinctionState(ctx.lieutenantId);
    if (row === null) return false;
    return row.extinction_state !== 'RESOLVED';
  },
  /**
   * `STANDING_ORDER_ACTIVE` (design §7.1/D3, canon `ORG_SCOPE`) — C0-reanchor §4/R2: POLL `status`/
   * `expires_at_tick` directly (never subscribe to `StandingOrderLapsedEvent` — that event fires for only
   * 1 of 3 lapse outcomes, confirmed R2). Missing row -> `false` (conservative-DEVIATED).
   */
  STANDING_ORDER_ACTIVE: async (ctx) => {
    const order = await ctx.standingOrderRepo.getByIdWithOwner(ctx.standingOrderId);
    if (order === null) return false;
    return order.status === 'active' && order.expires_at_tick > ctx.nowGameMinute;
  },
  /**
   * `CAPABILITY_DEBT_BELOW` (design §7.1/D13 — ★H-2 WIRE-LIVE) — READ-ONLY fold over the player's RAW
   * `capability_debts` rows (`CapabilityDebtsRepository.getRawBucketsForPlayer`, C0-reanchor §6/R4's own
   * additive method) via P3-G's OWNED `computePenaltyBucket` fold (never re-derives the cut points). The
   * clause FAILS (returns `false`) iff ANY held capability sits in the SEVERE bucket
   * (`structural_debt > 10`) — MODERATE/MILD/NONE all hold true (D13 ②). A player with ZERO debt rows
   * holds trivially (empty array, `.some` short-circuits false). Zero mutation of `capability_debts` —
   * this is a pure read (the #28-wall-adjacent READ-ONLY discipline D13 ① requires).
   */
  CAPABILITY_DEBT_BELOW: async (ctx) => {
    const rows = await ctx.capabilityDebtsRepo.getRawBucketsForPlayer(ctx.playerId);
    return !rows.some((r) => computePenaltyBucket(r.structuralDebt) === 'SEVERE');
  },
  // ── 2 RESERVED (design §7.1 — no real substrate on this base) ──────────────────────────────────────
  BUDGET_FLOOR: reservedThrows('BUDGET_FLOOR'),
  EXTERNAL_EVENT_ABSENT: reservedThrows('EXTERNAL_EVENT_ABSENT'),
};

/**
 * Evaluate ONE constraint clause — the closed-map dispatch (mirrors `predicate-evaluators.ts#
 * evaluatePredicateClause` verbatim). Returns `true` iff the clause HOLDS (no deviation); `false` means
 * this clause FAILED (a deviation candidate — the caller ANDs every clause's verdict, §7.2).
 */
export function evaluateConstraintClause(ctx: ConstraintEvalContext, clause: ConstraintClause): Promise<boolean> {
  return CONSTRAINT_EVALUATORS[clause.type](ctx);
}

/**
 * The closed-world boot check (design §7.2: "a RESERVED type wired into a LIVE slot = boot failure",
 * mirrors `validateCapabilityCatalogueStrictMode`/`validateTaskCategoryCatalogueStrictMode`'s own "takes
 * the catalogue as a PARAMETER, never a hardcoded read" shape — so the SAME real validator can be
 * exercised against a test-only, deliberately-broken clone WITHOUT ever mutating production code or
 * crashing the app under test). Throws on the FIRST RESERVED member found. The caller
 * (`VerticalHorizonModule.onApplicationBootstrap`) lets this propagate to fail NestJS boot for the REAL
 * emitted set (`horizon-tier-ladder.ts#minimalExpectedConstraints`'s own type list) — the SAME "loud
 * misconfiguration" convention every sibling closed-world check in this codebase uses.
 */
export function validateConstraintRegistryStrictMode(emittedTypes: readonly ConstraintConditionType[]): void {
  for (const type of emittedTypes) {
    if (!LIVE_CONSTRAINT_TYPES.has(type)) {
      throw new Error(
        `[constraint-evaluators] "${type}" is RESERVED — a slot must never emit a RESERVED constraint type ` +
          '(closed-world strict check, design §7.2).',
      );
    }
  }
}

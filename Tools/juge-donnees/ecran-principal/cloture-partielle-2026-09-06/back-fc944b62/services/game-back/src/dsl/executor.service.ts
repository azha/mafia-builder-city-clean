// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Invariant evaluation
//             ("évaluation top-down par `priority` décroissante ; première Rule dont trigger+condition matchent → fire …
//             Pas de stochastique, pas de tie-break random — égalité de priority résolue par ordre d'insertion
//             (déterministe, replay-safe)") + §Composite CompiledScript invariants ("aucune primitive n'évalue de chaîne au
//             runtime. Pas de `eval`, pas de `Function()` … Sandbox strict NestJS — l'IR est un instruction set fermé,
//             l'executor un interpréteur fini") + §Implications par couche §NestJS — game-back ("Module dsl/executor :
//             sandboxed interpreter de l'IR, par tick par lieutenant. Budget `T.dsl.execution_budget_per_tick`. Aucun
//             `eval`. Read-only sur state … write uniquement via `side_effects` déclarés") + §Tunables
//             `dsl.execution_budget_per_tick` ("Au-delà ⇒ rule en cours abandonnée, lieutenant retombe sur
//             `EXECUTE_DEFAULT`").
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 3, DSL executor) --
//
// `DslExecutorService` — the sandboxed, budgeted, deterministic interpreter of a compiled DSL script (the T3 stage of the
// `dsl/` engine). `resolve(ir, snapshot)` is a PURE function of (IR, snapshot): it reads ONLY the injected `snapshot` (no
// DB / I/O / RNG / `Date` / `Math.random` / ambient global), evaluates every rule's trigger against the snapshot, and
// returns the action of the highest-priority matched rule as a `ResolvedAction` TOKEN. It NEVER performs a side-effect
// (T6's delegation tick applies the token) and NEVER throws out of `resolve` (any unexpected fault → the safe
// `EXECUTE_DEFAULT` fallback, like the budget-exceeded case — 07 §Tunables).
//
// Determinism / replay-safety (07 §Invariant evaluation): for identical (IR, snapshot) the result is byte-identical —
// no stochastic input, the only ordering is `priority` desc then `index` asc (insertion order, the IR's load-bearing key).
// Sandbox (07 §CompiledScript invariants): no string is evaluated at runtime; the operator dispatch is a closed `switch`
// over the finite `CompareOp` set — there is no `eval` / `Function` / dynamic templating anywhere in this file.

import { Injectable } from '@nestjs/common';

import type { CompareOp } from './ast';
import type { CompiledScript, IrCondition, IrRule } from './ir';
import type { ResolvedAction, SignalSnapshot } from './signals';
import { dslTunables } from './dsl-tunables';
import type { ScriptRuleRef } from './signals';

/** The safe fallback the executor returns on budget exhaustion or any unexpected fault (07 §Tunables
 *  `dsl.execution_budget_per_tick`: "Au-delà ⇒ … lieutenant retombe sur `EXECUTE_DEFAULT`"). A frozen singleton so the
 *  fallback path allocates nothing and can never be mutated by a caller. */
const EXECUTE_DEFAULT_FALLBACK: ResolvedAction = Object.freeze({ kind: 'EXECUTE_DEFAULT' });
/** No rule's trigger matched this tick → no script-driven action. */
const NONE: ResolvedAction = Object.freeze({ kind: 'NONE' });

@Injectable()
export class DslExecutorService {
  /**
   * Resolve the compiled script against this tick's signal snapshot to a single action token.
   *
   * Algorithm (deterministic, replay-safe — 07 §Invariant evaluation):
   *   1. Walk the rules in IR order, counting each rule + each operand read against the per-tick budget
   *      (`dslTunables.executionBudgetPerTick`). A rule whose trigger matches the snapshot is a candidate.
   *   2. Keep the candidate with the highest `priority`; on equal priority keep the LOWEST `index` (the IR's insertion
   *      order — the canonical deterministic tie-break). No stochastic input, no `Date`/RNG.
   *   3. Return the winner's action token, or `{ kind: 'NONE' }` if nothing matched.
   *
   * Sandbox + safety: pure over (`ir`, `snapshot`); reads ONLY `snapshot`; performs NO side-effect; NEVER throws — the
   * whole body is wrapped so a budget overrun OR any unexpected fault yields the safe `{ kind: 'EXECUTE_DEFAULT' }`
   * fallback (07 §Tunables). The caller (T6 tick) can therefore treat `resolve` as total.
   */
  resolve(
    ir: CompiledScript,
    snapshot: SignalSnapshot,
    peerSnapshots?: ReadonlyMap<string, SignalSnapshot>,
  ): ResolvedAction {
    try {
      const budget = dslTunables.executionBudgetPerTick;
      let visits = 0;

      let winner: IrRule | undefined;
      // Hoist the charge closure once — both `visits` and `budget` are in `resolve`'s scope, so the single shared counter
      // is correct across all rules and condition trees. Avoids per-rule allocation (this file deliberately avoids per-tick
      // allocation; see the frozen EXECUTE_DEFAULT_FALLBACK / NONE singletons above).
      const charge = (): boolean => { visits++; return visits <= budget; };
      const rules = ir.rules;
      for (let i = 0; i < rules.length; i++) {
        // Charge one budget unit per rule visited, plus one per operand read below. On exhaustion → safe fallback (never
        // throw, never silently truncate to a wrong answer).
        if (++visits > budget) return EXECUTE_DEFAULT_FALLBACK;

        const rule = rules[i];
        visits++; // the operand read for this rule's trigger.
        if (visits > budget) return EXECUTE_DEFAULT_FALLBACK;

        if (!triggerMatches(rule, snapshot)) continue;

        // Tier-2 AND_IF: a rule with a condition fires only if the condition tree also evals true. Budget-charged per
        // node (a deep tree cannot silently exceed the budget); short-circuit AND/OR; absent leaf signal ⇒ false.
        if (rule.condition !== undefined) {
          const cond = evalCondition(rule.condition, snapshot, charge, peerSnapshots);
          if (cond === BUDGET_EXCEEDED) return EXECUTE_DEFAULT_FALLBACK;
          if (!cond) continue;
        }

        // Highest priority wins; tie-break = LOWEST `rule.index` (07 §Invariant "égalité de priority résolue par ordre
        // d'insertion") — read the carried IR `index` EXPLICITLY so the tie-break is correct regardless of the array's
        // physical order, rather than silently relying on `ir.rules` being stored in ascending-`index` order. Replace the
        // winner when this rule has a STRICTLY-greater priority, OR an equal priority but a strictly-lower index. (For an
        // ascending-index array this is byte-identical to the prior "first-at-max-priority wins" — but it now self-
        // documents that `index` is the load-bearing tie-break key, not array position.)
        if (
          winner === undefined ||
          rule.priority > winner.priority ||
          (rule.priority === winner.priority && rule.index < winner.index)
        ) {
          winner = rule;
        }
      }

      return winner === undefined ? NONE : actionToken(winner);
    } catch {
      // Defensive: the executor must be total (07 §sandbox / §Tunables). Any unexpected fault → safe fallback, no throw.
      return EXECUTE_DEFAULT_FALLBACK;
    }
  }

  /**
   * System 9c C6 — ADDITIVE companion to `resolve`. Returns ALL matching rules in priority-descending
   * order (tie-break: lowest `index` = insertion order, same as `resolve`). The existing `resolve` is
   * UNCHANGED (byte-identical return for the same input — DD-ADDITIVE-ENGINE §3.7).
   *
   * Purpose: the coordinator's multi-action evaluation path (C6) needs to process `SET_STANCE` /
   * `TOGGLE_EPHEMERAL` config-mutation actions BEFORE the terminal dispatch action. The tick-driven path
   * continues to call the single-action `resolve`; only the coordinator's `CoordinatorExecutionService`
   * calls `resolveAll`.
   *
   * Safety: same budget + try/catch contract as `resolve`. On budget exhaustion or any unexpected fault
   * the result is `[{ kind: 'EXECUTE_DEFAULT' }]` (the safe fallback, never throws). A script where no
   * rule matches returns `[]` (empty — no action, same intent as `resolve` returning `{ kind: 'NONE' }`).
   *
   * DETERMINISTIC, PURE: no side-effect, no `Math.random`, no `Date`, no I/O.
   */
  resolveAll(
    ir: CompiledScript,
    snapshot: SignalSnapshot,
    peerSnapshots?: ReadonlyMap<string, SignalSnapshot>,
  ): ResolvedAction[] {
    try {
      const budget = dslTunables.executionBudgetPerTick;
      let visits = 0;
      const charge = (): boolean => { visits++; return visits <= budget; };

      // Collect ALL matching rules (not just the winner).
      const matched: IrRule[] = [];
      const rules = ir.rules;
      for (let i = 0; i < rules.length; i++) {
        if (++visits > budget) return [EXECUTE_DEFAULT_FALLBACK];
        const rule = rules[i];
        visits++;
        if (visits > budget) return [EXECUTE_DEFAULT_FALLBACK];

        if (!triggerMatches(rule, snapshot)) continue;
        if (rule.condition !== undefined) {
          const cond = evalCondition(rule.condition, snapshot, charge, peerSnapshots);
          if (cond === BUDGET_EXCEEDED) return [EXECUTE_DEFAULT_FALLBACK];
          if (!cond) continue;
        }
        matched.push(rule);
      }

      if (matched.length === 0) return [];

      // Sort descending by priority, then ascending by index (same deterministic tie-break as resolve).
      matched.sort((a, b) =>
        b.priority !== a.priority ? b.priority - a.priority : a.index - b.index,
      );

      return matched.map(actionToken);
    } catch {
      return [EXECUTE_DEFAULT_FALLBACK];
    }
  }

  /**
   * 04b-B C3 DD-MUSCLE-P4-LEGIBLE §8.1.3 — ADDITIVE companion to `resolve`.
   *
   * Returns the resolved action token AND the matched winner rule's index — the P4 legibility
   * surface. The existing `resolve` and `resolveAll` are UNCHANGED (byte-identical return for the
   * same input — DD-ADDITIVE-ENGINE §3.7). Only the Muscle-refuse legibility surface calls this.
   *
   * `matchedRuleIndex` is `winner.index` (the 0-based source insertion order — the ONLY stable
   * per-rule identity in the engine, and the same key the executor's deterministic tie-break uses).
   * It is `null` when the executor returned NONE (no rule matched) OR the budget/fault fallback
   * fired. The caller (§8.1.4) maps `null` → `{ kind: 'no_matching_rule' }`.
   *
   * PURE / DETERMINISTIC / TOTAL: same no-throw + no-`Math.random` + no-`Date` contract as
   * `resolve`. A budget overrun OR any unexpected fault → `{ action: EXECUTE_DEFAULT_FALLBACK,
   * matchedRuleIndex: null }`. The winner selection is IDENTICAL to `resolve` — same algorithm,
   * same priority-desc / index-asc tie-break.
   */
  resolveWithRule(
    ir: CompiledScript,
    snapshot: SignalSnapshot,
    peerSnapshots?: ReadonlyMap<string, SignalSnapshot>,
  ): { action: ResolvedAction; matchedRuleIndex: number | null } {
    try {
      const budget = dslTunables.executionBudgetPerTick;
      let visits = 0;

      let winner: IrRule | undefined;
      const charge = (): boolean => { visits++; return visits <= budget; };
      const rules = ir.rules;
      for (let i = 0; i < rules.length; i++) {
        if (++visits > budget) return { action: EXECUTE_DEFAULT_FALLBACK, matchedRuleIndex: null };

        const rule = rules[i];
        visits++;
        if (visits > budget) return { action: EXECUTE_DEFAULT_FALLBACK, matchedRuleIndex: null };

        if (!triggerMatches(rule, snapshot)) continue;

        if (rule.condition !== undefined) {
          const cond = evalCondition(rule.condition, snapshot, charge, peerSnapshots);
          if (cond === BUDGET_EXCEEDED) return { action: EXECUTE_DEFAULT_FALLBACK, matchedRuleIndex: null };
          if (!cond) continue;
        }

        if (
          winner === undefined ||
          rule.priority > winner.priority ||
          (rule.priority === winner.priority && rule.index < winner.index)
        ) {
          winner = rule;
        }
      }

      if (winner === undefined) {
        return { action: NONE, matchedRuleIndex: null };
      }
      return { action: actionToken(winner), matchedRuleIndex: winner.index };
    } catch {
      return { action: EXECUTE_DEFAULT_FALLBACK, matchedRuleIndex: null };
    }
  }

  /**
   * Convenience wrapper: resolve and map the result to a `ScriptRuleRef` for P4 legibility.
   *
   * Called by the Muscle refuse surface (§8.1.4) to surface the matched player rule's ref:
   *   - winner action is EXECUTE_DEFAULT → `null` (the script WOULD assault — not a refuse).
   *   - winner action is anything else (blocking rule) → `{ ruleIndex: matchedRuleIndex }`.
   *   - matchedRuleIndex === null (NONE / budget fallback) → `{ kind: 'no_matching_rule' }`.
   *
   * PURE / DETERMINISTIC / TOTAL: inherits the contract of `resolveWithRule`.
   */
  resolveToScriptRuleRef(
    ir: CompiledScript,
    snapshot: SignalSnapshot,
    peerSnapshots?: ReadonlyMap<string, SignalSnapshot>,
  ): { wouldAssault: true } | { wouldAssault: false; ref: ScriptRuleRef } {
    const { action, matchedRuleIndex } = this.resolveWithRule(ir, snapshot, peerSnapshots);
    if (action.kind === 'EXECUTE_DEFAULT') {
      return { wouldAssault: true };
    }
    if (matchedRuleIndex === null) {
      return { wouldAssault: false, ref: { kind: 'no_matching_rule' } };
    }
    return { wouldAssault: false, ref: { ruleIndex: matchedRuleIndex } };
  }
}

/**
 * Does this rule's trigger match the snapshot? Reads the operand — `STATE` → `snapshot.state[field]`, `EVENT` →
 * `snapshot.events[field]` — and compares it to the rule's literal `value` with the rule's `op`. An operand ABSENT from the
 * snapshot (the binding did not populate that signal) yields `false` (a non-match), NOT a crash (07 §sandbox / replay-safe).
 */
function triggerMatches(rule: IrRule, snapshot: SignalSnapshot): boolean {
  const { kind, field, op, value } = rule.trigger;
  const source = kind === 'STATE' ? snapshot.state : snapshot.events;
  // Use `hasOwnProperty` (via Object.prototype) so an absent field — even one colliding with a prototype name like
  // `constructor` — reads as absent, not as an inherited member (sandbox: no ambient leakage through the snapshot map).
  if (!Object.prototype.hasOwnProperty.call(source, field)) return false;
  const operand = source[field];
  return compare(operand, op, value);
}

/**
 * Deterministic, total comparison of a snapshot operand against a rule literal. Both are `number | boolean | string`
 * (a `string` only ever appears for a closed-domain enum STATE field — P24 L2b `interpretation_drift`).
 *
 * Comparison rule (documented per spec — deterministic for every mixed number/boolean/string pairing):
 *   - `=` / `!=` are STRICT: equal iff same type AND same value (so `true` ≠ `1` and `false` ≠ `0`; two strings compare
 *     correctly via `typeof` + `===`, e.g. `'DRIFTING' = 'DRIFTING'`). This makes the demo bool-equality
 *     `STATE(cook_idle, =, true)` behave exactly (only an actual boolean `true` operand matches), and the enum-string
 *     `STATE(interpretation_drift, =, INCIDENTAL_LOCKED)` match exactly on the token.
 *   - ordering ops (`<`, `<=`, `>`, `>=`): a `string` operand or literal has NO order in this domain → return `false`
 *     BEFORE any numeric coercion (a string never matches an ordering op; the compiler also forbids `>`/`<`/… on the
 *     enum field, so this is a defensive guard). For number/boolean they compare NUMERICALLY: a boolean coerces
 *     `false → 0`, `true → 1` first, so the comparison is total and deterministic across any number/boolean mix (the demo
 *     numeric `EVENT(heat, >=, 5)` compares the numeric heat directly). Coercion is local arithmetic — no `eval`, no RNG.
 */
function compare(operand: number | boolean | string, op: CompareOp, value: number | boolean | string): boolean {
  // STRING DOMAIN (a closed-domain enum operand/literal — P24 L2b `interpretation_drift`): only `=` / `!=` are meaningful;
  // a symbolic enum has NO order, so every ordering op returns false here (consolidated ONCE, before the switch — replacing
  // the four copy-pasted per-op string guards). The `=`/`!=` comparisons stay STRICT via `===` (two strings of the same
  // type compare correctly, e.g. 'DRIFTING' = 'DRIFTING'). Number|boolean operands fall through to the switch UNCHANGED.
  if (typeof operand === 'string' || typeof value === 'string') {
    if (op === '=') return operand === value;
    if (op === '!=') return operand !== value;
    return false; // an ordering op on a string → never matches.
  }
  switch (op) {
    case '=':
      return typeof operand === typeof value && operand === value;
    case '!=':
      return typeof operand !== typeof value || operand !== value;
    case '<':
      return numeric(operand) < numeric(value);
    case '<=':
      return numeric(operand) <= numeric(value);
    case '>':
      return numeric(operand) > numeric(value);
    case '>=':
      return numeric(operand) >= numeric(value);
    default: {
      // `op` is the closed `CompareOp` set; an unreachable value would be a contract breach. Be total (no throw): the
      // outer try/catch already guards, but returning `false` here keeps the trigger a non-match rather than faulting.
      const _exhaustive: never = op;
      void _exhaustive;
      return false;
    }
  }
}

/** Coerce a scalar to its numeric form for ordering comparisons: `false → 0`, `true → 1`, a number unchanged. Pure local
 *  arithmetic — total and deterministic, no `eval`/RNG. */
function numeric(v: number | boolean): number {
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

/** Sentinel: the condition walk ran out of budget — the caller returns the safe EXECUTE_DEFAULT fallback. */
const BUDGET_EXCEEDED = Symbol('budget_exceeded');

/**
 * Evaluate a compiled condition tree against the snapshot. `charge()` increments + tests the per-tick budget and returns
 * false when exhausted (then this returns BUDGET_EXCEEDED, propagated by the caller to the safe fallback). MY_STATE reads
 * `snapshot.state[field]` (absent ⇒ false, per the absence contract) and reuses `compare`. AND/OR short-circuit. Pure,
 * total, no `eval`.
 */
function evalCondition(
  c: IrCondition,
  snapshot: SignalSnapshot,
  charge: () => boolean,
  peerSnapshots: ReadonlyMap<string, SignalSnapshot> | undefined,
): boolean | typeof BUDGET_EXCEEDED {
  if (!charge()) return BUDGET_EXCEEDED;
  switch (c.kind) {
    case 'MY_STATE': {
      if (!Object.prototype.hasOwnProperty.call(snapshot.state, c.field)) return false;
      return compare(snapshot.state[c.field], c.op, c.value);
    }
    case 'PEER_STATE': {
      // Read the resolved peer's snapshot (keyed `${role}@${zone}`). Absent peer / no map ⇒ false (the absent-leaf
      // semantics MY_STATE uses). The tick supplies the map; the executor stays pure (no DB/IO).
      const peer = peerSnapshots?.get(`${c.role}@${c.zone}`);
      if (peer === undefined || !Object.prototype.hasOwnProperty.call(peer.state, c.field)) return false;
      return compare(peer.state[c.field], c.op, c.value);
    }
    case 'NOT': {
      const v = evalCondition(c.operand, snapshot, charge, peerSnapshots);
      return v === BUDGET_EXCEEDED ? v : !v;
    }
    case 'AND': {
      const l = evalCondition(c.left, snapshot, charge, peerSnapshots);
      if (l === BUDGET_EXCEEDED) return l;
      if (!l) return false; // short-circuit
      return evalCondition(c.right, snapshot, charge, peerSnapshots);
    }
    case 'OR': {
      const l = evalCondition(c.left, snapshot, charge, peerSnapshots);
      if (l === BUDGET_EXCEEDED) return l;
      if (l) return true; // short-circuit
      return evalCondition(c.right, snapshot, charge, peerSnapshots);
    }
    default: {
      const _exhaustive: never = c;
      void _exhaustive;
      return false;
    }
  }
}

/** Map a fired IR rule's action kind to its `ResolvedAction` token. The IR now carries 7 kinds:
 *  EXECUTE_DEFAULT | PAUSE_OPS | REQUEST_PLAYER_INPUT (DD4-b=(b) — C7 atom-set expansion) +
 *  DISPATCH_COURIER | SET_STANCE | TOGGLE_EPHEMERAL (9c DD-COORD-GRAMMAR — arg-bearing coordinator
 *  dispatch primitives, DD-ADDITIVE-ENGINE §3.7) + SCHEDULE_MAINTENANCE (04f-A C7, D9 — the Facility-manager
 *  auto-schedule action, the SAME additive mechanism).
 *
 *  **DD-ADDITIVE-ENGINE invariant:** the 3 nullary branches (EXECUTE_DEFAULT / PAUSE_OPS /
 *  REQUEST_PLAYER_INPUT) are UNCHANGED — byte-identical tokens. The 4 arg-bearing branches
 *  extract the validated `rule.action.args` payload (compiled-time validated closed enums; no RNG
 *  / Date / IO — the executor stays PURE, C4). Any unrecognised kind → safe fallback.
 *
 *  REQUEST_PLAYER_INPUT maps to a pure token here; its side-effect (exception_queue entry) lives
 *  in the tick apply branch, not in this function. */
function actionToken(rule: IrRule): ResolvedAction {
  switch (rule.action.kind) {
    // ── Nullary branches — UNCHANGED (byte-identical, DD-ADDITIVE-ENGINE) ──────────────────────
    case 'EXECUTE_DEFAULT':
      return { kind: 'EXECUTE_DEFAULT' };
    case 'PAUSE_OPS':
      return { kind: 'PAUSE_OPS' };
    case 'REQUEST_PLAYER_INPUT':
      return { kind: 'REQUEST_PLAYER_INPUT' };
    // ── 9c arg-bearing branches — ADDITIVE (DD-COORD-GRAMMAR §3.3 / DD-ADDITIVE-ENGINE §3.7) ──
    // The args payload is compiler-validated (closed enum domain); the executor reads it as PURE
    // static IR — no mutation, no RNG, no Date, no IO. The binding (C5) applies the side effect.
    case 'DISPATCH_COURIER': {
      const args = rule.action.args;
      // Spread only the present (non-undefined) arg fields — preserves the R2.2 closed-enum guarantee
      // and ensures absent-optional fields are omitted from the token (not set to undefined).
      const token: ResolvedAction = { kind: 'DISPATCH_COURIER' };
      if (args?.route !== undefined) (token as Record<string, unknown>)['route'] = args.route;
      if (args?.vehicle !== undefined) (token as Record<string, unknown>)['vehicle'] = args.vehicle;
      if (args?.stance !== undefined) (token as Record<string, unknown>)['stance'] = args.stance;
      return token;
    }
    case 'SET_STANCE': {
      const args = rule.action.args;
      // stance is required for SET_STANCE (compiler-validated); fall through to safe fallback if absent.
      if (args?.stance === undefined) return EXECUTE_DEFAULT_FALLBACK;
      return { kind: 'SET_STANCE', stance: args.stance };
    }
    case 'TOGGLE_EPHEMERAL': {
      const args = rule.action.args;
      // value is required for TOGGLE_EPHEMERAL (compiler-validated); fall through to safe fallback if absent.
      if (args?.value === undefined) return EXECUTE_DEFAULT_FALLBACK;
      return { kind: 'TOGGLE_EPHEMERAL', value: args.value };
    }
    // 04f-A C7 (D9) — Facility-manager auto-schedule action (ADDITIVE, the SAME 9c mechanism). The selector is
    // required (compiler-validated closed domain — 'most_due' at launch); fall through to safe fallback if
    // absent (a defensive impossibility post-compile, mirrors the SET_STANCE/TOGGLE_EPHEMERAL guards above).
    case 'SCHEDULE_MAINTENANCE': {
      const args = rule.action.args;
      if (args?.maintenanceTarget === undefined) return EXECUTE_DEFAULT_FALLBACK;
      return { kind: 'SCHEDULE_MAINTENANCE', maintenanceTarget: args.maintenanceTarget };
    }
    default:
      return EXECUTE_DEFAULT_FALLBACK;
  }
}

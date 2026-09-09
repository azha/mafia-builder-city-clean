// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Composite CompiledScript (the compiler
//             produces the executable IR + diagnostics; deterministic, no `eval`, closed instruction set) + §Composites
//             BehaviorScript / Rule §Invariant "rules.length ≤ T.dsl.max_rules_per_script ... rejeté par le compiler avec
//             diagnostic explicite" + §Implications NestJS "Module dsl/compiler : AST → IR, validation invariants
//             (priority bounds, scope ≤ vocab_tier, rules.length, depth), CompiledScript retourné" +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL (the `T.dsl.*` bounds)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 2, DSL compiler/validator) --
//
// `DslCompilerService` — the second DSL engine stage (T2): a tier-tagged `BehaviorScriptAst` (from T1's parser) → the
// validated, execution-ready `CompiledScript` IR (ir.ts). PURE: no DB, no I/O, no RNG, no `eval` / `Function()` (07
// §Composite CompiledScript invariant). It NEVER throws — every validation failure is returned as a `DslDiagnostic`.
//
// Scope (T2 = COMPILER/VALIDATOR ONLY): AST → { ir } | { diagnostics }. It does NOT parse (that is T1), does NOT execute
// / resolve / evaluate signals (that is T3), does NOT touch the lieutenant entity / endpoints (T4) or the tick (T6).
//
// Validation rules (each failure → a `DslDiagnostic` at the offending node's line/col; collected per-rule, ALL returned;
// on ANY diagnostic → `{ diagnostics }`, no IR — only a fully-valid AST yields `{ ir }`):
//   - Bounds (whole-script): rules.length ≤ T.dsl.max_rules_per_script → else RULE_COUNT_EXCEEDED (one diagnostic,
//     reported at the first over-limit rule).
//   - Tier-gating (per rule, Phase-12): a rule whose effective tier > `unlockedTier` (default 1, slice-1 compat) →
//     TIER_NOT_UNLOCKED ("Tier-N primitive not available (unlocked tier is N)"). Callers pass the player's
//     `rule_vocabulary_tier`; the default (1) preserves slice-1 semantics.
//   - Executability (per rule, slice-1 executable subset = triggers STATE/EVENT + actions EXECUTE_DEFAULT/PAUSE_OPS):
//       · any trigger other than STATE/EVENT → NOT_SUPPORTED_YET;
//       · any action other than EXECUTE_DEFAULT/PAUSE_OPS → NOT_SUPPORTED_YET;
//       · a STATE/EVENT trigger whose value is not a resolvable scalar (number / true / false) → NOT_SUPPORTED_YET
//         (the executable triggers compare against a scalar; tunable-refs / symbolic enums are out of the subset).
//   - Condition clause (Phase-12 Tier-2 AND_IF, per rule): each leaf must be an executable MY_STATE atom (PEER_* /
//     EXCEPTION_FROM / CONVICTION_ABOVE → NOT_SUPPORTED_YET at the leaf's span); each MY_STATE value must be a scalar;
//     a fully-valid condition is LOWERED to an IrCondition tree (evaluated by the executor at tick time).
//   - Bounds (per rule): @priority in [T.dsl.priority_min, T.dsl.priority_max] → else PRIORITY_OUT_OF_BOUNDS.
//   - Condition depth (per rule): AND_IF AST nesting ≤ T.dsl.max_nested_condition_depth → else CONDITION_DEPTH_EXCEEDED.
//
// DETERMINISTIC (07 §Composite CompiledScript invariant): same AST + same unlockedTier → same IR / same diagnostics.
// No clock, no random.

import { Injectable } from '@nestjs/common';

import type {
  ActionExpr,
  BehaviorScriptAst,
  ConditionExpr,
  Literal,
  RuleDecl,
  SourceSpan,
  TriggerNode,
  VocabTier,
} from './ast';
import type { DslDiagnostic } from './dsl-errors';
import { dslTunables } from './dsl-tunables';
import type { CompiledScript, IrAction, IrActionArgs, IrActionKind, IrCondition, IrPeerStateAtom, IrRule, IrTrigger, MaintenanceTargetSelector, RouteSelector } from './ir';

/** The trigger node kinds executable in slice 1 (the rest are rejected NOT_SUPPORTED_YET / TIER_NOT_UNLOCKED). */
const EXECUTABLE_TRIGGER_KINDS = new Set<TriggerNode['node']>(['STATE', 'EVENT']);

/**
 * The Tier-1 action atom names executable in this build.
 * **DD-ADDITIVE-ENGINE (§3.7):** the 3 original nullary kinds keep their exact behavior unchanged.
 * The 3 NEW 9c kinds (`dispatch_courier`/`set_stance`/`toggle_ephemeral`) and the 04f-A C7 `schedule_maintenance`
 * kind are ADDITIVE — `checkActionExecutability` now PASSES them (instead of `NOT_SUPPORTED_YET`); every OTHER
 * non-whitelisted action stays rejected.
 */
const EXECUTABLE_ACTION_KINDS = new Set<string>([
  // Original 3 nullary kinds (UNCHANGED — byte-identical behavior):
  'EXECUTE_DEFAULT',
  'PAUSE_OPS',
  'REQUEST_PLAYER_INPUT',
  // 9c NEW coordinator dispatch primitives (ADDITIVE, DD-COORD-GRAMMAR):
  'dispatch_courier',
  'set_stance',
  'toggle_ephemeral',
  // 04f-A C7 (D9) NEW Facility-manager auto-schedule action (ADDITIVE, the SAME 9c mechanism):
  'schedule_maintenance',
]);

// ---------------------------------------------------------------------------------------------------------------------
// 9c: Closed-domain arg validation tables (R2.2 / P5 wall — every arg is a CLOSED enum/bucket, NEVER a raw scalar).
// The compiler validates each arg token against its closed domain; an out-of-domain token → `valid=false`.
// Mirrors the existing `COMPARE_OPS` / `ENUM_STATE_FIELDS` validation discipline.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * 9c: Map from lowercase coordinator action names (as stored in `Tier1ActionName` / `action.name`) to the
 * canonical UPPERCASE `IrActionKind` members (as defined in `ir.ts`).
 * This decouples the DSL surface (lowercase snake_case player-facing names) from the internal IR kind (SCREAMING_SNAKE).
 * The original 14 Tier-1 actions use SCREAMING_SNAKE for both name and IR kind — unchanged.
 */
const COORDINATOR_ACTION_NAME_TO_IR_KIND: Partial<Record<string, IrActionKind>> = {
  dispatch_courier: 'DISPATCH_COURIER',
  set_stance: 'SET_STANCE',
  toggle_ephemeral: 'TOGGLE_EPHEMERAL',
  // 04f-A C7 (D9) — Facility-manager auto-schedule action name→kind mapping.
  schedule_maintenance: 'SCHEDULE_MAINTENANCE',
};

/** Valid `route` arg tokens for `dispatch_courier` (OQ-A2b — named destination classes, never raw coords). */
const ROUTE_SELECTOR_DOMAIN = new Set<RouteSelector>(['to_primary_stash', 'to_dealer_spots']);

/** Valid `vehicle` arg tokens for `dispatch_courier` (REUSE 9b vehicle_type enum; R2.2 closed domain). */
const VEHICLE_TYPE_DOMAIN = new Set<string>(['foot', 'bike', 'car', 'refrigerated_van']);

/** Valid `stance` arg tokens for `dispatch_courier` / `set_stance` (REUSE 9b route_stance enum; R2.2 closed domain). */
const ROUTE_STANCE_DOMAIN = new Set<string>(['fastest', 'balanced', 'evasive']);

/**
 * 04f-A C7 (D9) — the closed domain for `schedule_maintenance`'s ONE arg (R2.2/P5 wall). `most_due` is the
 * only member at launch; a raw building uuid (or any other token) is rejected here — this is the closed-selector
 * wall the C7 falsifiable floor proves (a rule authored with a raw uuid arg → a compile DIAGNOSTIC, never IR).
 */
const MAINTENANCE_TARGET_DOMAIN = new Set<MaintenanceTargetSelector>(['most_due']);

/** Closed-domain enum STATE fields: field name → admissible symbolic values. A STATE trigger on one of these resolves
 *  its EnumLiteral token to a STRING IR value, accepts ONLY `=`/`!=`, and rejects any out-of-domain token. (P24 L2b:
 *  `interpretation_drift` exposes SignalDriftState.drift_phase to the DSL.) */
const ENUM_STATE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  // D2 reputation drift signal: `interpretation_drift` — RegimePressureBucket (3 values).
  interpretation_drift: ['DIRECT_ALIGNED', 'DRIFTING', 'INCIDENTAL_LOCKED', 'RESETTING'],
  // 04b-B C3 DD-MUSCLE: `regime_pressure_band` — RegimePressureBucket (3 values).
  // The Muscle binding exposes A's §13 RegimePressureBucket as a STATE signal for the DSL.
  // DSL rule: `WHEN STATE(regime_pressure_band,==,mounting) THEN EXECUTE_DEFAULT @100;`
  // Values: 'silent'|'mounting'|'crushing' (closed enum — §8.2 getRegimePressureBand, P6 safe).
  regime_pressure_band: ['silent', 'mounting', 'crushing'],
};

@Injectable()
export class DslCompilerService {
  /**
   * Compile a tier-tagged `BehaviorScriptAst` (from `DslParserService.parse`) into the validated, execution-ready
   * `CompiledScript` IR. PURE — no DB, no I/O, no RNG, no `eval`. NEVER throws. Returns `{ diagnostics }` if ANY
   * validation rule fails (collected per-rule, all reported); `{ ir }` only for a fully-valid AST. The IR is the object
   * stored in `behavior_script.rules` and consumed by the T3 executor.
   *
   * `unlockedTier` (Phase-12 — default 1, slice-1 compat) gates every rule whose effective tier exceeds the player's
   * unlocked vocab tier. Callers pass the player's `rule_vocabulary_tier` from `player_progression_state`; the default
   * (1) preserves slice-1 semantics for callers not yet wired (T1 only — Task 3 wires the real tier).
   */
  compile(
    ast: BehaviorScriptAst,
    unlockedTier: VocabTier = 1,
    knownPeerRoles?: ReadonlySet<string>,
  ): { ir: CompiledScript } | { diagnostics: DslDiagnostic[] } {
    const diagnostics: DslDiagnostic[] = [];

    // -- Whole-script bound: rule count ≤ T.dsl.max_rules_per_script. Report at the first over-limit rule (its span). --
    if (ast.rules.length > dslTunables.maxRulesPerScript) {
      const offending = ast.rules[dslTunables.maxRulesPerScript]; // the (max+1)th rule — guaranteed to exist here.
      diagnostics.push({
        line: offending.sourceSpan.line,
        col: offending.sourceSpan.col,
        message: `Too many rules: ${ast.rules.length} exceeds the limit of ${dslTunables.maxRulesPerScript}.`,
        kind: 'RULE_COUNT_EXCEEDED',
      });
    }

    // -- Per-rule validation (tier-gating, executability, priority bounds, condition depth). Collect ALL diagnostics. --
    const irRules: IrRule[] = [];
    ast.rules.forEach((rule, index) => {
      const ruleDiagnostics = this.validateRule(rule, unlockedTier, knownPeerRoles);
      if (ruleDiagnostics.length > 0) {
        diagnostics.push(...ruleDiagnostics);
        return; // a rejected rule is not lowered to IR.
      }
      irRules.push(this.lowerRule(rule, index));
    });

    if (diagnostics.length > 0) {
      return { diagnostics };
    }
    return { ir: { rules: irRules } };
  }

  /** Validate ONE rule against the player's `unlockedTier` + optional `knownPeerRoles`. Returns every diagnostic the rule violates (may be empty). */
  private validateRule(rule: RuleDecl, unlockedTier: VocabTier, knownPeerRoles?: ReadonlySet<string>): DslDiagnostic[] {
    const out: DslDiagnostic[] = [];

    // 1) Tier-gating — the rule's effective tier (max across its nodes) must be ≤ the player's unlocked vocab tier.
    if (rule.tier > unlockedTier) {
      out.push({
        line: rule.sourceSpan.line,
        col: rule.sourceSpan.col,
        message: `Tier-${rule.tier} primitive not available (unlocked tier is ${unlockedTier}).`,
        kind: 'TIER_NOT_UNLOCKED',
      });
    }

    // 1b) Tenure peer-scope (Phase-11 tenure inertia, canon Invariant 5 — SELF_ONLY): a PEER_* node may NOT read
    //     ANOTHER lieutenant's `tenure_*` state. Scan the TRIGGER (PEER_EVENT.eventType) + the CONDITION tree
    //     (recursively — PEER_STATE.field) for a `tenure`-prefixed name and emit a precise TENURE_PEER_SCOPE_VIOLATION
    //     at the offending node's span. This co-fires with the generic TIER_NOT_UNLOCKED above (a PEER_* node is also
    //     Tier ≥ 2) — the SAME precise+generic pattern the action-tier gate uses (a tenure-referencing PEER rule gets
    //     BOTH the dedicated scope diagnostic and the tier gate). NB PEER_PLANNED carries only an `actionKind` (no field
    //     in the current grammar) → it cannot reference a tenure field → left to the generic tier gate; if a future
    //     grammar adds a field/state arg to PEER_PLANNED, extend collectTenurePeerRefs to cover it.
    collectTenurePeerRefs(rule).forEach((node) => {
      out.push({
        line: node.span.line,
        col: node.span.col,
        message:
          'A peer reference may not read another lieutenant\'s tenure state ' +
          '(tenure is SELF_ONLY — a lieutenant cannot read a peer\'s tenure_*).',
        kind: 'TENURE_PEER_SCOPE_VIOLATION',
      });
    });

    // 2) Executability — trigger kind. Only STATE / EVENT are executable in slice 1.
    if (!EXECUTABLE_TRIGGER_KINDS.has(rule.trigger.node)) {
      out.push({
        line: rule.trigger.span.line,
        col: rule.trigger.span.col,
        message: `Trigger '${rule.trigger.node}' not supported in this build (only STATE / EVENT are executable).`,
        kind: 'NOT_SUPPORTED_YET',
      });
    } else {
      // 2b) Executability — an executable trigger's value must be a resolvable scalar (number / true / false). A
      //     tunable-ref or a non-boolean symbolic enum cannot be evaluated against the snapshot in slice 1.
      const valueDiag = this.checkTriggerValue(rule.trigger);
      if (valueDiag) out.push(valueDiag);
    }

    // 3) Executability — action kind. EXECUTE_DEFAULT / PAUSE_OPS / REQUEST_PLAYER_INPUT / dispatch_courier /
    //    set_stance / toggle_ephemeral are executable; everything else → NOT_SUPPORTED_YET.
    const actionDiag = this.checkActionExecutability(rule.action);
    if (actionDiag) out.push(actionDiag);

    // 3b) 9c: Arg-domain validation for arg-bearing coordinator actions (R2.2 / P5 wall — ADDITIVE).
    //    Only fires when action is ACTION_ATOM (outer guard above already covers non-atoms).
    //    For nullary actions, checkArgValidity returns [] (byte-identical, DD-ADDITIVE-ENGINE §3.7).
    //    For arg-bearing actions, validates each arg token against its closed enum domain.
    if (!actionDiag && rule.action.node === 'ACTION_ATOM') {
      const argDiags = this.checkArgValidity(rule.action as Extract<typeof rule.action, { node: 'ACTION_ATOM' }>);
      argDiags.forEach((d) => out.push(d));
    }

    // 4) Condition clause (Tier-2 AND_IF). Validate the depth bound + that every LEAF is an executable atom (MY_STATE
    //    or PEER_STATE — Phase-18 un-gated). Unsupported leaves (PEER_PLANNED / EXCEPTION_FROM / CONVICTION_ABOVE /
    //    IN_TIME_WINDOW) → NOT_SUPPORTED_YET. PEER_STATE role/zone/value are validated by collectPeerStateDiagnostics.
    //    The tenure SELF_ONLY guard (1b) is unchanged. A fully-valid condition is lowered to IR in lowerRule.
    if (rule.condition !== undefined) {
      const depth = conditionDepth(rule.condition);
      if (depth > dslTunables.maxNestedConditionDepth) {
        out.push({
          line: rule.condition.span.line,
          col: rule.condition.span.col,
          message: `Condition nesting depth ${depth} exceeds the limit of ${dslTunables.maxNestedConditionDepth}.`,
          kind: 'CONDITION_DEPTH_EXCEEDED',
        });
      }
      collectUnsupportedLeaves(rule.condition).forEach((leaf) => {
        out.push({
          line: leaf.span.line,
          col: leaf.span.col,
          message: `Condition leaf '${leaf.node}' not supported in this build (only MY_STATE and PEER_STATE are executable).`,
          kind: 'NOT_SUPPORTED_YET',
        });
      });
      collectNonScalarMyState(rule.condition).forEach((leaf) => {
        out.push({
          line: leaf.value.span.line,
          col: leaf.value.span.col,
          message: 'MY_STATE value must be a number or a boolean (true / false) in this build.',
          kind: 'NOT_SUPPORTED_YET',
        });
      });
      collectPeerStateDiagnostics(rule.condition, knownPeerRoles).forEach((d) => out.push(d));
    }

    // 5) Priority bounds — @priority in [T.dsl.priority_min, T.dsl.priority_max].
    if (rule.priority < dslTunables.priorityMin || rule.priority > dslTunables.priorityMax) {
      out.push({
        line: rule.sourceSpan.line,
        col: rule.sourceSpan.col,
        message:
          `Priority ${rule.priority} is out of bounds ` +
          `[${dslTunables.priorityMin}, ${dslTunables.priorityMax}].`,
        kind: 'PRIORITY_OUT_OF_BOUNDS',
      });
    }

    return out;
  }

  /** An executable STATE/EVENT trigger's value must be a resolvable scalar; else a NOT_SUPPORTED_YET diagnostic. A STATE
   *  trigger on a CLOSED-DOMAIN enum field (ENUM_STATE_FIELDS — P24 L2b `interpretation_drift`) is handled FIRST: it admits
   *  `=`/`!=` only and an in-domain symbolic token (resolved to a STRING IR value in lowerRule), rejecting an ordering op
   *  or an out-of-domain token with a precise diagnostic. All other fields stay on the existing number/boolean scalar path. */
  private checkTriggerValue(trigger: TriggerNode): DslDiagnostic | undefined {
    // Only STATE / EVENT reach here (the caller guards the trigger kind); both carry a `value: Literal`.
    if (trigger.node !== 'STATE' && trigger.node !== 'EVENT') return undefined;

    // Closed-domain enum STATE field (e.g. interpretation_drift). BEFORE the scalar check: the value is a symbolic token,
    // not a number/boolean, so it would otherwise be wrongly rejected by literalScalar. Same NOT_SUPPORTED_YET kind +
    // node-span diagnostic idiom the rest of this method uses (one diagnostic per failing check, all collected upstream).
    if (trigger.node === 'STATE') {
      const domain = ENUM_STATE_FIELDS[trigger.field];
      if (domain !== undefined) {
        if (trigger.op !== '=' && trigger.op !== '!=') {
          return {
            line: trigger.span.line,
            col: trigger.span.col,
            message: `STATE(${trigger.field}, …) admits only = / != (no ordering).`,
            kind: 'NOT_SUPPORTED_YET',
          };
        }
        const tok = trigger.value.kind === 'enum' ? trigger.value.value : undefined;
        if (tok === undefined || !domain.includes(tok)) {
          return {
            line: trigger.value.span.line,
            col: trigger.value.span.col,
            message: `${trigger.field} value must be one of ${domain.join('|')}.`,
            kind: 'NOT_SUPPORTED_YET',
          };
        }
        return undefined; // valid enum trigger — lowered to a STRING IR value in lowerRule.
      }
    }

    const scalar = literalScalar(trigger.value);
    if (scalar === undefined) {
      return {
        line: trigger.value.span.line,
        col: trigger.value.span.col,
        message:
          'Trigger value must be a number or a boolean (true / false) in this build ' +
          '(tunable references and symbolic values are not supported).',
        kind: 'NOT_SUPPORTED_YET',
      };
    }
    return undefined;
  }

  /**
   * The action must be a single executable Tier-1 atom; else a diagnostic.
   * **DD-ADDITIVE-ENGINE (§3.7):** the existing whitelist check is unchanged for the nullary actions. The 3 NEW
   * 9c kinds are now in `EXECUTABLE_ACTION_KINDS` so they PASS this check (no longer `NOT_SUPPORTED_YET`).
   */
  private checkActionExecutability(action: ActionExpr): DslDiagnostic | undefined {
    // SEQ (Tier 3) / COHORT (Tier 6) are higher-tier — already caught by the rule's tier gate; but a SEQ/COHORT is also
    // not in the executable atom set, so report NOT_SUPPORTED_YET coherently (the tier gate + this can co-fire on a
    // genuinely higher-tier action, which is the correct precise feedback).
    if (action.node !== 'ACTION_ATOM') {
      return {
        line: action.span.line,
        col: action.span.col,
        message: `Action '${action.node}' not supported in this build.`,
        kind: 'NOT_SUPPORTED_YET',
      };
    }
    if (!EXECUTABLE_ACTION_KINDS.has(action.name)) {
      return {
        line: action.span.line,
        col: action.span.col,
        message:
          `Action '${action.name}' not supported in this build ` +
          '(only EXECUTE_DEFAULT / PAUSE_OPS / REQUEST_PLAYER_INPUT / dispatch_courier / set_stance / ' +
          'toggle_ephemeral / schedule_maintenance are executable).',
        kind: 'NOT_SUPPORTED_YET',
      };
    }
    return undefined;
  }

  /**
   * 9c: Validate the arg-bearing coordinator dispatch actions against their closed enum domains (R2.2 / P5 wall).
   * Called in `validateRule` for whitelisted actions that carry `args` (the new 9c actions).
   * Returns ALL arg diagnostics (may be multiple — one per invalid arg position). Empty = all args valid.
   *
   * **DD-ADDITIVE-ENGINE (§3.7):** the nullary actions (`EXECUTE_DEFAULT`/`PAUSE_OPS`/`REQUEST_PLAYER_INPUT`) carry
   * NO `args` — this method is a no-op for them (returns `[]`), byte-identical to before.
   *
   * **Anti-fabrication (R2.2):** every arg is validated against a CLOSED domain — no `parseInt`/`Number()/parseFloat`
   * in the arg path; only enum membership checks. A raw scalar token (a number literal) in the args position
   * is caught because it would be parsed as a bare-ident, but numbers are NOT IDENT tokens — the parser fails
   * to match them as `parseBareIdent` and reports a parse error before we even reach this check. A bare-ident
   * that is not in the domain (e.g. `helicopter`) IS an IDENT but not in VEHICLE_TYPE_DOMAIN → rejected here.
   */
  private checkArgValidity(action: Extract<ActionExpr, { node: 'ACTION_ATOM' }>): DslDiagnostic[] {
    const out: DslDiagnostic[] = [];
    const args = action.args; // the positional arg lexemes (ABSENT for nullary actions)

    switch (action.name) {
      case 'dispatch_courier': {
        // Requires exactly 3 positional args: route, vehicle, stance.
        if (!args || args.length !== 3) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `dispatch_courier requires exactly 3 args (route, vehicle, stance); got ${args?.length ?? 0}.`,
            kind: 'NOT_SUPPORTED_YET',
          });
          break; // cannot validate individual args without all 3
        }
        const [route, vehicle, stance] = args as [string, string, string];
        if (!ROUTE_SELECTOR_DOMAIN.has(route as RouteSelector)) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `dispatch_courier: 'route' arg must be one of ${[...ROUTE_SELECTOR_DOMAIN].join('|')}; got '${route}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        if (!VEHICLE_TYPE_DOMAIN.has(vehicle)) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `dispatch_courier: 'vehicle' arg must be one of ${[...VEHICLE_TYPE_DOMAIN].join('|')}; got '${vehicle}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        if (!ROUTE_STANCE_DOMAIN.has(stance)) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `dispatch_courier: 'stance' arg must be one of ${[...ROUTE_STANCE_DOMAIN].join('|')}; got '${stance}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        break;
      }
      case 'set_stance': {
        // Requires exactly 1 arg: stance.
        if (!args || args.length !== 1) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `set_stance requires exactly 1 arg (stance); got ${args?.length ?? 0}.`,
            kind: 'NOT_SUPPORTED_YET',
          });
          break;
        }
        const [stance] = args as [string];
        if (!ROUTE_STANCE_DOMAIN.has(stance)) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `set_stance: 'stance' arg must be one of ${[...ROUTE_STANCE_DOMAIN].join('|')}; got '${stance}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        break;
      }
      case 'toggle_ephemeral': {
        // Requires exactly 1 arg: a boolean literal ('true' or 'false').
        if (!args || args.length !== 1) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `toggle_ephemeral requires exactly 1 arg (true|false); got ${args?.length ?? 0}.`,
            kind: 'NOT_SUPPORTED_YET',
          });
          break;
        }
        const [boolToken] = args as [string];
        if (boolToken !== 'true' && boolToken !== 'false') {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `toggle_ephemeral: arg must be 'true' or 'false'; got '${boolToken}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        break;
      }
      case 'schedule_maintenance': {
        // 04f-A C7 (D9) — requires exactly 1 arg: the closed selector (`most_due` only at launch).
        // R2.2 wall: a raw building uuid (or any out-of-domain token) is rejected HERE, never lowered to IR.
        if (!args || args.length !== 1) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message: `schedule_maintenance requires exactly 1 arg (a selector); got ${args?.length ?? 0}.`,
            kind: 'NOT_SUPPORTED_YET',
          });
          break;
        }
        const [target] = args as [string];
        if (!MAINTENANCE_TARGET_DOMAIN.has(target as MaintenanceTargetSelector)) {
          out.push({
            line: action.span.line,
            col: action.span.col,
            message:
              `schedule_maintenance: selector arg must be one of ${[...MAINTENANCE_TARGET_DOMAIN].join('|')} ` +
              `(never a raw building id); got '${target}'.`,
            kind: 'NOT_SUPPORTED_YET',
          });
        }
        break;
      }
      // Nullary and single-arg original actions: no arg validation here (args is undefined for them).
      default:
        break;
    }
    return out;
  }

  /**
   * Lower a VALIDATED rule to its execution-ready `IrRule`. Drops everything the executor does not read (spans,
   * indices, higher-tier nodes). `index` is the source insertion order (the deterministic tie-break key).
   *
   * **DD-ADDITIVE-ENGINE (§3.7):** nullary actions lower to `{ kind }` (no `args` key — byte-identical). The
   * 9c arg-bearing actions lower to `{ kind, args: IrActionArgs }` with the typed, validated arg payload.
   */
  private lowerRule(rule: RuleDecl, index: number): IrRule {
    // The trigger is STATE or EVENT (validated) with a scalar value (validated) — or, for a STATE trigger on a closed-domain
    // enum field (ENUM_STATE_FIELDS), a validated in-domain symbolic token lowered to its STRING IR value.
    const trigger = rule.trigger as Extract<TriggerNode, { node: 'STATE' | 'EVENT' }>;
    const field = trigger.node === 'STATE' ? trigger.field : trigger.eventType;
    const isEnumField = trigger.node === 'STATE' && ENUM_STATE_FIELDS[trigger.field] !== undefined;
    const irTrigger: IrTrigger = {
      kind: trigger.node,
      field,
      op: trigger.op,
      // Enum field → the symbolic token STRING (validated in-domain by checkTriggerValue); else the number/boolean scalar.
      value: isEnumField
        ? (trigger.value as Extract<Literal, { kind: 'enum' }>).value
        : (literalScalar(trigger.value) as number | boolean), // validated non-undefined.
    };
    // The action is a validated executable atom.
    const action = rule.action as Extract<ActionExpr, { node: 'ACTION_ATOM' }>;
    // 9c: build the IrActionArgs payload for arg-bearing actions; ABSENT for nullary (DD-ADDITIVE-ENGINE §3.7).
    const irActionArgs = this.lowerActionArgs(action);
    // Map from AST action.name (may be lowercase for 9c coordinator actions) to the canonical IrActionKind.
    const irKind = COORDINATOR_ACTION_NAME_TO_IR_KIND[action.name] ?? (action.name as IrActionKind);
    const irAction: IrAction = irActionArgs !== undefined
      ? { kind: irKind, args: irActionArgs }
      : { kind: irKind };
    const irRule: IrRule = { index, trigger: irTrigger, action: irAction, priority: rule.priority };
    if (rule.condition !== undefined) irRule.condition = lowerCondition(rule.condition);
    return irRule;
  }

  /**
   * 9c: Lower the validated args of an arg-bearing action to the typed `IrActionArgs` payload.
   * Returns `undefined` for nullary actions (byte-identical IR — no `args` key, DD-ADDITIVE-ENGINE).
   * Only called from `lowerRule` after `checkArgValidity` has passed (all args are valid domain tokens).
   */
  private lowerActionArgs(action: Extract<ActionExpr, { node: 'ACTION_ATOM' }>): IrActionArgs | undefined {
    const args = action.args;
    if (!args) return undefined; // nullary or single-arg-via-`arg` actions: no args payload (byte-identical)

    switch (action.name) {
      case 'dispatch_courier': {
        const [route, vehicle, stance] = args as [string, string, string];
        return { route: route as RouteSelector, vehicle, stance };
      }
      case 'set_stance': {
        const [stance] = args as [string];
        return { stance };
      }
      case 'toggle_ephemeral': {
        const [boolToken] = args as [string];
        return { value: boolToken === 'true' };
      }
      case 'schedule_maintenance': {
        // 04f-A C7 (D9) — only reached after checkArgValidity has passed (the single arg is a validated
        // in-domain MaintenanceTargetSelector token — 'most_due' at launch).
        const [target] = args as [string];
        return { maintenanceTarget: target as MaintenanceTargetSelector };
      }
      default:
        return undefined;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------------------------------

/** Resolve a `Literal` to its executable scalar — a `number` (NumberLiteral) or a `boolean` (a `true`/`false` enum). A
 *  tunable-ref or any other symbolic enum is NOT a resolvable scalar in slice 1 → `undefined`. */
function literalScalar(lit: Literal): number | boolean | undefined {
  if (lit.kind === 'number') return lit.value;
  if (lit.kind === 'enum' && typeof lit.bool === 'boolean') return lit.bool;
  return undefined;
}

/** The nesting depth of a condition AST (a flat atom = 1; each AND/OR/NOT level adds 1). Used for the depth bound. */
function conditionDepth(c: ConditionExpr): number {
  switch (c.node) {
    case 'AND':
    case 'OR':
      return 1 + Math.max(conditionDepth(c.left), conditionDepth(c.right));
    case 'NOT':
      return 1 + conditionDepth(c.operand);
    default:
      return 1; // a leaf condition atom.
  }
}

/** True when a field/event name references a `tenure_*` field (the SELF_ONLY-guarded tenure state — e.g. `tenure_months`,
 *  `tenure_bucket`, `tenure_score`). A `tenure_` prefix match (case-sensitive — the grammar lexes field names
 *  verbatim); the trailing underscore is intentional so a hypothetical future `tenured_*` field is not caught.
 *  Used by the peer-scope guard (canon Invariant 5). */
function isTenureField(name: string): boolean {
  return name.startsWith('tenure_');
}

/**
 * Collect every PEER_* node in a rule that references a `tenure_*` field of ANOTHER lieutenant (canon Invariant 5 —
 * tenure is SELF_ONLY). Scans the TRIGGER (PEER_EVENT.eventType) + the CONDITION tree recursively (PEER_STATE.field),
 * mirroring the `conditionDepth` walk. Returns the offending nodes (each carries the `span` for a precise diagnostic);
 * empty when the rule references no peer tenure field. PEER_PLANNED has only an `actionKind` (no field arg in the current
 * grammar) so it can never reference a tenure field — it is not scanned here (the generic tier gate covers it).
 */
function collectTenurePeerRefs(rule: RuleDecl): Array<{ span: SourceSpan }> {
  const offenders: Array<{ span: SourceSpan }> = [];
  // TRIGGER: PEER_EVENT carries an `eventType` (a peer-scoped event name) — a `tenure_*` event reads peer tenure state.
  if (rule.trigger.node === 'PEER_EVENT' && isTenureField(rule.trigger.eventType)) {
    offenders.push({ span: rule.trigger.span });
  }
  // CONDITION tree: collect PEER_STATE atoms whose `field` is a `tenure_*` field (recurse through AND/OR/NOT).
  if (rule.condition !== undefined) {
    collectPeerStateTenureRefs(rule.condition, offenders);
  }
  return offenders;
}

/** Recurse a condition AST collecting PEER_STATE atoms referencing a `tenure_*` field (the SELF_ONLY-guarded state). */
function collectPeerStateTenureRefs(c: ConditionExpr, out: Array<{ span: SourceSpan }>): void {
  switch (c.node) {
    case 'AND':
    case 'OR':
      collectPeerStateTenureRefs(c.left, out);
      collectPeerStateTenureRefs(c.right, out);
      return;
    case 'NOT':
      collectPeerStateTenureRefs(c.operand, out);
      return;
    case 'PEER_STATE':
      if (isTenureField(c.field)) out.push({ span: c.span });
      return;
    default:
      return; // a non-PEER_STATE leaf atom — not a peer-tenure read.
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Phase-12 (DSL Tier 2a) — condition tree helpers (leaf collection + lowering)
// ---------------------------------------------------------------------------------------------------------------------

/** Collect every condition LEAF that is NOT executable in this build (PEER_PLANNED / EXCEPTION_FROM / CONVICTION_ABOVE /
 *  IN_TIME_WINDOW). MY_STATE (Tier-1) and PEER_STATE (Tier-2b, Phase-18) ARE executable. Recurses through AND/OR/NOT.
 *  Each carries a `span`/`node` for a precise diagnostic. */
function collectUnsupportedLeaves(c: ConditionExpr): Array<{ node: string; span: SourceSpan }> {
  const out: Array<{ node: string; span: SourceSpan }> = [];
  walkConditionLeaves(c, (leaf) => {
    if (leaf.node !== 'MY_STATE' && leaf.node !== 'PEER_STATE') out.push({ node: leaf.node, span: leaf.span });
  });
  return out;
}

/** Collect a diagnostic for each PEER_STATE leaf with an invalid zone qualifier, an unknown role (when `knownPeerRoles`
 *  is given), or a non-scalar value. Recurses AND/OR/NOT. Keeps the engine archetype-agnostic — roles are validated
 *  against the passed set, NOT a hardcoded archetype list inside the compiler. */
function collectPeerStateDiagnostics(
  c: ConditionExpr,
  knownPeerRoles: ReadonlySet<string> | undefined,
): DslDiagnostic[] {
  const out: DslDiagnostic[] = [];
  walkConditionLeaves(c, (leaf) => {
    if (leaf.node !== 'PEER_STATE') return;
    const zone = leaf.zone.toLowerCase();
    if (zone !== 'same_zone' && zone !== 'same_building') {
      out.push({
        line: leaf.span.line,
        col: leaf.span.col,
        kind: 'NOT_SUPPORTED_YET',
        message: `Unknown peer zone qualifier '${leaf.zone}' (expected same_zone / same_building).`,
      });
    }
    if (knownPeerRoles !== undefined && !knownPeerRoles.has(leaf.lieutenantRef.toLowerCase())) {
      out.push({
        line: leaf.span.line,
        col: leaf.span.col,
        kind: 'NOT_SUPPORTED_YET',
        message: `Unknown peer role '${leaf.lieutenantRef}'.`,
      });
    }
    if (literalScalar(leaf.value) === undefined) {
      out.push({
        line: leaf.value.span.line,
        col: leaf.value.span.col,
        kind: 'NOT_SUPPORTED_YET',
        message: 'PEER_STATE value must be a number or a boolean (true / false) in this build.',
      });
    }
  });
  return out;
}

/** Collect every MY_STATE leaf whose value is not a resolvable scalar (a tunable-ref / non-boolean enum). */
function collectNonScalarMyState(c: ConditionExpr): Array<{ value: Literal }> {
  const out: Array<{ value: Literal }> = [];
  walkConditionLeaves(c, (leaf) => {
    if (leaf.node === 'MY_STATE' && literalScalar(leaf.value) === undefined) out.push({ value: leaf.value });
  });
  return out;
}

/** Visit every LEAF (non AND/OR/NOT) of a condition tree. */
function walkConditionLeaves(c: ConditionExpr, visit: (leaf: Exclude<ConditionExpr, { node: 'AND' | 'OR' | 'NOT' }>) => void): void {
  switch (c.node) {
    case 'AND':
    case 'OR':
      walkConditionLeaves(c.left, visit);
      walkConditionLeaves(c.right, visit);
      return;
    case 'NOT':
      walkConditionLeaves(c.operand, visit);
      return;
    default:
      visit(c);
  }
}

/** Lower a validated condition AST (all leaves are scalar MY_STATE) to its execution-ready IrCondition tree. */
function lowerCondition(c: ConditionExpr): IrCondition {
  switch (c.node) {
    case 'AND':
      return { kind: 'AND', left: lowerCondition(c.left), right: lowerCondition(c.right) };
    case 'OR':
      return { kind: 'OR', left: lowerCondition(c.left), right: lowerCondition(c.right) };
    case 'NOT':
      return { kind: 'NOT', operand: lowerCondition(c.operand) };
    case 'MY_STATE':
      return { kind: 'MY_STATE', field: c.field, op: c.op, value: literalScalar(c.value) as number | boolean };
    case 'PEER_STATE': {
      const irPeer: IrPeerStateAtom = {
        kind: 'PEER_STATE',
        role: c.lieutenantRef.toLowerCase(),
        zone: c.zone.toLowerCase() === 'same_building' ? 'SAME_BUILDING' : 'SAME_ZONE',
        field: c.field,
        op: c.op,
        value: literalScalar(c.value) as number | boolean,
      };
      return irPeer;
    }
    default:
      // INTERNAL-INVARIANT assertion — reachable only on a compiler bug (validateRule rejects every unsupported
      // condition leaf before lowerRule runs; author input never reaches here). Distinct from the compiler's general
      // discipline of "never throws on author input" — this throw guards against future refactors breaking that contract.
      throw new Error(`lowerCondition: unexpected leaf '${c.node}'`);
  }
}

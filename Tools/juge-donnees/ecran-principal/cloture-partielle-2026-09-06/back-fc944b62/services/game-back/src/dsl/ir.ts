// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Composite CompiledScript
//             (`CompiledScript { ast, ir : IrInstructionArray (linéaire, indexée), validation_status, error_diagnostics,
//             compile_hash, vocab_tier_resolved }` — the executable form produced by the compiler; "IR = intermediate
//             representation pour l'executor, linéaire, indexée") + §Composites BehaviorScript / Rule (the canonical
//             Rule = WHEN trigger [AND_IF condition] THEN action @ priority; insertion order load-bearing, tie-break =
//             lowest index) + §Composite CompiledScript invariants (deterministic, no `eval`, closed instruction set)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 2, DSL compiler/validator) --
//
// The `CompiledScript` IR — the VALIDATED, execution-ready form the compiler (T2) produces from a tier-tagged AST and
// stores in `behavior_script.rules` as `{ rules: Rule[] }` (T0 schema). It REUSES the canonical 07 §Composite
// CompiledScript notion of an `ir` = "a linear, indexed instruction array for the executor" — here, the linear array is
// the normalized `Rule[]` (one IR rule per source rule, in insertion order so the executor's deterministic tie-break
// "lowest rule index wins" holds — 07 §Invariant "égalité de priority résolue par ordre d'insertion").
//
// This is DELIBERATELY MINIMAL + EXECUTION-ORIENTED — NOT a re-export of the AST. The AST carries the full 7-tier
// grammar (every trigger/condition/action node, source spans, tunable-ref literals, …); the IR carries ONLY what the T3
// executor needs to resolve an action against a per-tick signal snapshot: per rule a normalized trigger (kind + field +
// op + a resolved scalar value), a normalized action (kind only — the slice-1 executable actions are nullary), the
// priority, and (Phase-12 Tier-2) an optional compiled `IrCondition` tree (lowered from the `AND_IF` clause, MY_STATE
// + PEER_STATE leaves in this build — Phase-18 un-gated the cross-lieutenant PEER_STATE read). Everything the executor
// does NOT read (spans, tunable-refs, indices, higher-tier nodes)
// is dropped at compile time — because the compiler has already PROVEN (T2 validation) that the AST only contains the
// slice-1 executable subset. An IR therefore can ONLY contain those primitives; a higher-tier / unsupported /
// out-of-bounds AST yields diagnostics, never an IR.
//
// PURE DATA: a plain serializable tree (no methods, no `eval`) — it is what lands in the `behavior_script.rules` jsonb
// and what `DslExecutorService.resolve` (T3) reads. NO DB, NO I/O here.

import type { CompareOp } from './ast';

/** The trigger kinds executable in this build (slice 1). The compiler rejects every other parsed trigger
 *  (`TIME` / `LIFECYCLE` / `ORDER_LIFECYCLE` / `PEER_EVENT` …) as `NOT_SUPPORTED_YET` / `TIER_NOT_UNLOCKED`. */
export type IrTriggerKind = 'STATE' | 'EVENT';

// ---------------------------------------------------------------------------------------------------------------------
// IrCondition tree — Phase-12 (DSL Tier 2a). The compiled, execution-ready condition tree lowered from the `AND_IF`
// clause of a source rule. Evaluated by the executor (T3) against the per-tick signal snapshot; a rule fires iff its
// trigger matches AND its condition (absent ⇒ true) evaluates true. PURE DATA — no `eval`, no methods.
// ---------------------------------------------------------------------------------------------------------------------

/** An executable condition LEAF (Tier-1 `MY_STATE`): reads `snapshot.state[field]` and compares it to `value` with `op`.
 *  `value` is a resolved scalar (the compiler collapses the AST literal). */
export interface IrMyStateAtom {
  kind: 'MY_STATE';
  field: string;
  op: CompareOp;
  // CONDITION-LEAF scalar (number | boolean only). No compiler path emits a STRING into a condition leaf — the enum-string
  // (interpretation_drift's DriftPhase token) is TRIGGER-only (lowerCondition casts literalScalar(...) as number|boolean).
  // The executor's `compare` accepts the wider number|boolean|string, so passing the narrower type here is sound.
  value: number | boolean;
}

/** An executable PEER condition LEAF (Tier-2b `PEER_STATE`): reads `peerSnapshot.state[field]` of the peer resolved by
 *  `role` (archetype, lowercase) + `zone` (SAME_ZONE = same district [default] / SAME_BUILDING = same building). Absent
 *  peer ⇒ false (the executor's absent-leaf semantics). `value` is a resolved scalar. */
export interface IrPeerStateAtom {
  kind: 'PEER_STATE';
  role: string;
  zone: 'SAME_ZONE' | 'SAME_BUILDING';
  field: string;
  op: CompareOp;
  // CONDITION-LEAF scalar (number | boolean only) — same rationale as IrMyStateAtom.value: no compiler path emits a string
  // into a condition leaf (the enum-string is TRIGGER-only). The executor's `compare` accepts the wider type.
  value: number | boolean;
}

/** The Tier-2 boolean combinators over conditions (07 §Grammar `ConditionExpr` AND/OR/NOT). Pure tree, no `eval`. */
export interface IrAnd { kind: 'AND'; left: IrCondition; right: IrCondition; }
export interface IrOr { kind: 'OR'; left: IrCondition; right: IrCondition; }
export interface IrNot { kind: 'NOT'; operand: IrCondition; }

/** A compiled `AND_IF` condition tree (Tier-2). Evaluated by the executor against the snapshot; a rule fires iff its
 *  trigger matches AND its condition (absent ⇒ true) evaluates true. */
export type IrCondition = IrMyStateAtom | IrPeerStateAtom | IrAnd | IrOr | IrNot;

/** The action kinds executable in this build (slice 1 + 9c coordinator + 04f-A C7 Facility manager). The compiler
 *  rejects every other parsed Tier-1 action (`REROUTE_TO`, `ALERT_PEER`, …) as `NOT_SUPPORTED_YET`, and every
 *  higher-tier action as `TIER_NOT_UNLOCKED`. The 3 9c kinds (`DISPATCH_COURIER`/`SET_STANCE`/`TOGGLE_EPHEMERAL`)
 *  and the C7 `SCHEDULE_MAINTENANCE` kind are ADDITIVE — `EXECUTE_DEFAULT`/`PAUSE_OPS`/`REQUEST_PLAYER_INPUT` keep
 *  their exact semantics (DD-ADDITIVE-ENGINE §3.7). */
export type IrActionKind =
  | 'EXECUTE_DEFAULT'
  | 'PAUSE_OPS'
  | 'REQUEST_PLAYER_INPUT'
  // 9c DD-COORD-GRAMMAR — arg-bearing coordinator dispatch primitives (ADDITIVE, DD-ADDITIVE-ENGINE):
  | 'DISPATCH_COURIER'
  | 'SET_STANCE'
  | 'TOGGLE_EPHEMERAL'
  // 04f-A C7 (D9) — the Facility-manager auto-schedule action (ADDITIVE, the SAME 9c mechanism):
  | 'SCHEDULE_MAINTENANCE';

// ---------------------------------------------------------------------------------------------------------------------
// 9c: IrActionArgs — the typed, compiler-validated arg payload for arg-bearing coordinator actions (C1).
// R2.2 / P5 wall: ALL fields are CLOSED enum/bucket values — NEVER raw scalars (no raw coords, grams, heat floats).
// The arg-bearing actions carry this payload in `IrAction.args?`; nullary actions carry NO `args` (ABSENT, not null).
// DD-ADDITIVE-ENGINE: `args` is OPTIONAL — a nullary IrAction is `{ kind }` with `args` ABSENT (byte-identical IR).
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Named destination-class enum for `dispatch_courier`'s `route` arg (OQ-A2b — never raw coords).
 * A player writes `to_primary_stash` / `to_dealer_spots`; the binding resolves to the real building at exec-time.
 * Canon: `lieutenant_role_mapping.md:93` "route assignment" — coordinator manages hub→stash / hub→dealer routes.
 */
export type RouteSelector = 'to_primary_stash' | 'to_dealer_spots';

/**
 * 04f-A C7 (D9) — the closed selector domain for `schedule_maintenance`'s ONE positional arg (R2.2/P5 wall —
 * NEVER a raw building uuid). `most_due` is the ONLY member at launch (the operational building with the
 * smallest days-until-due, resolved server-side by `FacilityManagerBinding` — deterministic tie-break by
 * building_id); the domain is intentionally left extensible (a future selector, e.g. a named building-class,
 * would ADD a member here — never widen to an opaque id).
 */
export type MaintenanceTargetSelector = 'most_due';

/**
 * The typed arg payload for an arg-bearing coordinator/facility-manager action.
 * Every field is a CLOSED enum/bucket (R2.2) — ALL fields optional to accommodate the 4 different action shapes:
 *   `dispatch_courier(route, vehicle, stance)` → `{ route, vehicle, stance }` (all 3 present, compiler-enforced).
 *   `set_stance(stance)` → `{ stance }`.
 *   `toggle_ephemeral(bool)` → `{ value }` (the boolean literal).
 *   `schedule_maintenance(most_due)` → `{ maintenanceTarget }` (04f-A C7, D9).
 * The compiler validates each field against its closed domain; an out-of-domain token → `valid=false`.
 */
export interface IrActionArgs {
  /** `dispatch_courier` route arg — a NAMED destination class (OQ-A2b); never raw coords. */
  route?: RouteSelector;
  /**
   * `dispatch_courier` vehicle arg — the `vehicle_type` enum (REUSE 9b: `foot|bike|car|refrigerated_van`).
   * A closed domain: only these 4 token strings are accepted; any other token → `valid=false`.
   */
  vehicle?: string; // 'foot' | 'bike' | 'car' | 'refrigerated_van' — closed at validation time
  /**
   * `dispatch_courier` stance arg / `set_stance` stance arg — the `route_stance` enum (REUSE 9b).
   * Closed domain: `fastest|balanced|evasive`.
   */
  stance?: string; // 'fastest' | 'balanced' | 'evasive' — closed at validation time
  /**
   * `toggle_ephemeral` bool arg — a boolean literal (`true`/`false`).
   * Canon: "ephemeral_mode toggle decision" (`:93`). The bool token is `true` or `false` (enum literal, NOT a number).
   */
  value?: boolean;
  /**
   * `schedule_maintenance` selector arg (04f-A C7, D9) — the closed `MaintenanceTargetSelector` domain
   * (`most_due` only at launch). Compiler-validated; R2.2 wall — a raw uuid / any out-of-domain token is
   * rejected with `NOT_SUPPORTED_YET` (never lowered to IR).
   */
  maintenanceTarget?: MaintenanceTargetSelector;
}

/**
 * A normalized, execution-ready trigger. The executor (T3) reads `snapshot.state[field]` (for `STATE`) or
 * `snapshot.events[field]` (for `EVENT`) and compares it to `value` with `op`. `value` is a RESOLVED scalar
 * (number | boolean) — the compiler has already collapsed the AST literal (a numeric literal or a `true`/`false` enum)
 * to its scalar form; the slice-1 executable triggers never reference a tunable-ref or a non-boolean symbolic enum
 * (those are out of the executable subset). A `string` value is ALSO admitted, but ONLY for a STATE trigger on a
 * closed-domain enum field (P24 L2b — today `interpretation_drift`, whose token resolves to one of the 4 `DriftPhase`
 * strings); such a field accepts `=` / `!=` only (a string has no order — the executor's ordering ops never match a
 * string). `field` is the bare state-field / event-type name (no index — slice-1 triggers are non-indexed; an indexed
 * trigger would not be in the executable subset).
 */
export interface IrTrigger {
  kind: IrTriggerKind;
  field: string;
  op: CompareOp;
  value: number | boolean | string;
}

/**
 * A normalized, execution-ready action. The slice-1 nullary actions carry ONLY `kind` (no `args`); the 9c
 * arg-bearing coordinator actions carry `kind` + the typed `args` payload (compiler-validated, closed enums).
 *
 * **DD-ADDITIVE-ENGINE (§3.7):** the `args` field is **OPTIONAL and ABSENT** for nullary actions — the IR for
 * `EXECUTE_DEFAULT`/`PAUSE_OPS`/`REQUEST_PLAYER_INPUT` is `{ kind }` with NO `args` key, byte-identical to before.
 * A serializer/deserializer must NOT emit `args: undefined` for nullary actions (JSON.stringify omits undefined fields
 * automatically; the existing `behavior_script.rules` JSON stored in the DB is untouched — byte-identical).
 *
 * The executor maps `kind` to a `ResolvedAction` token (T3); the binding handler (C5) applies the side effect (C6).
 */
export interface IrAction {
  kind: IrActionKind;
  /**
   * 9c: the typed, compiler-validated arg payload for arg-bearing coordinator actions (ADDITIVE — ABSENT for nullary).
   * `DISPATCH_COURIER` → `{ route, vehicle, stance }` (all 3 present).
   * `SET_STANCE` → `{ stance }`.
   * `TOGGLE_EPHEMERAL` → `{ value }` (the boolean literal).
   * `SCHEDULE_MAINTENANCE` → `{ maintenanceTarget }` (04f-A C7, D9).
   * `EXECUTE_DEFAULT`/`PAUSE_OPS`/`REQUEST_PLAYER_INPUT` → `args` ABSENT (byte-identical IR).
   */
  args?: IrActionArgs;
}

/**
 * One normalized IR rule = the executable distillation of a source `RuleDecl`. `WHEN <trigger> [AND_IF <condition>] THEN
 * <action> @ priority`. The executor evaluates `trigger` against the snapshot; if it matches (and, for Phase-12 Tier-2
 * rules, the `condition` tree evaluates true), the rule "fires" with `action` at `priority`. `index` preserves the
 * source insertion order (0-based) so ties on `priority` resolve to the lowest index (07 §Invariant, replay-safe).
 */
export interface IrRule {
  /** 0-based source insertion order — the deterministic tie-break key (lowest index wins on equal priority). */
  index: number;
  trigger: IrTrigger;
  action: IrAction;
  /** The validated `@priority` (the compiler has checked it lies in [T.dsl.priority_min, T.dsl.priority_max]). */
  priority: number;
  /** The compiled `AND_IF` condition tree, when the source rule had one (Tier-2). Absent ⇒ the rule has no condition
   *  (trigger-only — byte-identical to slice-1). */
  condition?: IrCondition;
}

/**
 * The compiled script IR — the validated, execution-ready object stored in `behavior_script.rules` and consumed by the
 * T3 executor. A linear, indexed rule list (07 §Composite CompiledScript `ir : IrInstructionArray (linéaire, indexée)`),
 * insertion-order-preserving. Slice 1 carries the rule list only; the canonical `compile_hash` / `vocab_tier_resolved`
 * metadata (07 §Composite CompiledScript) are DEFERRED (not needed by the slice-1 executor / attach contract).
 */
export interface CompiledScript {
  rules: IrRule[];
}

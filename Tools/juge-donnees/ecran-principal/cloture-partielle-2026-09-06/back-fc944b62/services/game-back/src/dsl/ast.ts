// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Grammar EBNF (the full 7-tier grammar) +
//             §Composites BehaviorScript / Rule (the canonical Rule = WHEN trigger AND_IF condition THEN action @ priority)
//             + §Composite PrimitiveDef / §GrammarPrimitiveEnum (the canonical Tier-1..6 primitive catalogue, by VocabTier)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 1, DSL parser) --
//
// The typed AST for a parsed behavior script. The grammar is REUSED VERBATIM from `behavior_script_dsl.md §Grammar EBNF`
// (never re-invented). Every Tier-1 production is a typed node; each node carries a `tier` tag (`VocabTier`) so the
// compiler (T2) can REJECT anything tagged Tier ≥ 2 (T1 only TAGS — it never gates). Higher-tier tokens that are
// grammatically RECOGNIZED (the `AND`/`OR`/`NOT` condition combinators, `SEQ` action chaining, `PEER_*` / `COHORT`
// primitives, the custom `IN_TIME_WINDOW`) are PARSED into a tier-tagged node — NEVER silently dropped (so T2 can reject
// them with a precise `TIER_NOT_UNLOCKED` diagnostic).
//
// `BehaviorScriptAst` = an ordered `RuleDecl[]` (insertion order is load-bearing — the executor's deterministic tie-break
// is lowest rule index; 07 §Invariant "égalité de priority résolue par ordre d'insertion"). The AST is a plain
// serializable tree (no methods, no `eval`) — it is the input to the compiler, and a sub-shape of it (the IR) lands in
// `behavior_script.rules` (T2). NO DB, NO I/O here — pure data.

/** Rule-Vocabulary tier (07 §GrammarPrimitiveEnum). Tier 1 = base (executable in slice 1); Tier 2..6 = vertical-unlocked
 *  (parsed + tagged here, rejected by T2). Tier 7 = bookkeeper archetype-scoped (out of slice-1 grammar scope). */
export type VocabTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Comparison operator (07 §Grammar EBNF `CompareOp`). Canonical `=` is the equality op; the parser also ACCEPTS `==`
 *  (the slice-1 demo rules author it that way) and normalizes it to `=` here. */
export type CompareOp = '<' | '<=' | '=' | '!=' | '>=' | '>';

/** A 1-based source span (the player-authored text), for diagnostics + editor highlighting (07 §DiagnosticEntry.span). */
export interface SourceSpan {
  line: number;
  col: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// Literals — `Literal ::= Number | TunableRef | EnumLiteral` (07 §Grammar EBNF)
// ---------------------------------------------------------------------------------------------------------------------

/** A numeric literal (`Number`) — e.g. `5`, `0.6`. */
export interface NumberLiteral {
  kind: 'number';
  value: number;
  span: SourceSpan;
}

/** A tunable reference (`TunableRef ::= '{{tunable:' Identifier '}}'`) — e.g. `{{tunable:dsl.priority_max}}`. The raw
 *  identifier is preserved (resolution to a value is a later concern — out of T1 scope). */
export interface TunableRefLiteral {
  kind: 'tunable_ref';
  identifier: string;
  span: SourceSpan;
}

/** An enum / symbolic literal (`EnumLiteral`) — a bare token that is not a number or tunable-ref: booleans (`true` /
 *  `false`) and symbolic values (`buyer_unavail`, `high`, `EXPIRES_SOON`, …). The lexeme is preserved verbatim; the
 *  parser does NOT interpret its domain (that is per-primitive semantics, a later concern). `bool` is set when the
 *  lexeme is exactly `true` / `false` for downstream convenience. */
export interface EnumLiteral {
  kind: 'enum';
  value: string;
  bool?: boolean;
  span: SourceSpan;
}

export type Literal = NumberLiteral | TunableRefLiteral | EnumLiteral;

// ---------------------------------------------------------------------------------------------------------------------
// Triggers — `TriggerExpr` (07 §Grammar EBNF)
// ---------------------------------------------------------------------------------------------------------------------

/** `EVENT '(' EventType ',' CompareOp ',' Literal ')'` (Tier 1). */
export interface EventTrigger {
  node: 'EVENT';
  eventType: string;
  op: CompareOp;
  value: Literal;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `STATE '(' StateField [ '[' IndexKey ']' ] ',' CompareOp ',' Literal ')'` (Tier 1; `field[idx]` indexing is Tier 1). */
export interface StateTrigger {
  node: 'STATE';
  field: string;
  index?: string;
  op: CompareOp;
  value: Literal;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `TIME '(' HourLiteral ',' HourLiteral ')'` — Tier 1 base trigger (07 lists `TIME` as a Tier-1 trigger; the EBNF's
 *  "(* Tier 5 custom *)" note applies to CUSTOM windows, which T2 distinguishes — T1 tags the base form Tier 1). */
export interface TimeTrigger {
  node: 'TIME';
  start: Literal;
  end: Literal;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `LIFECYCLE '(' LifecycleEvent ')'` (Tier 1). */
export interface LifecycleTrigger {
  node: 'LIFECYCLE';
  event: string;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `ORDER_LIFECYCLE '(' OrderRef ',' OrderEvent ')'` (Tier 1). */
export interface OrderLifecycleTrigger {
  node: 'ORDER_LIFECYCLE';
  orderRef: string;
  event: string;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `PEER_EVENT '(' LieutenantRef ',' EventType ')'` — Tier 2 (cross-lieutenant). RECOGNIZED + tier-tagged so T2 rejects;
 *  never silently dropped. */
export interface PeerEventTrigger {
  node: 'PEER_EVENT';
  lieutenantRef: string;
  eventType: string;
  tier: VocabTier; // 2
  span: SourceSpan;
}

export type TriggerNode =
  | EventTrigger
  | StateTrigger
  | TimeTrigger
  | LifecycleTrigger
  | OrderLifecycleTrigger
  | PeerEventTrigger;

// ---------------------------------------------------------------------------------------------------------------------
// Conditions — `ConditionExpr` (07 §Grammar EBNF). The AND_IF clause; optional on a Rule.
// ---------------------------------------------------------------------------------------------------------------------

/** `MY_STATE '(' StateField [ '[' IndexKey ']' ] ',' CompareOp ',' Literal ')'` (Tier 1). */
export interface MyStateCondition {
  node: 'MY_STATE';
  field: string;
  index?: string;
  op: CompareOp;
  value: Literal;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `EXCEPTION_FROM '(' ExceptionCategory ')'` (Tier 1). */
export interface ExceptionFromCondition {
  node: 'EXCEPTION_FROM';
  category: string;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `CONVICTION_ABOVE '(' Literal ')'` (Tier 1). */
export interface ConvictionAboveCondition {
  node: 'CONVICTION_ABOVE';
  value: Literal;
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `PEER_STATE '(' Role ['@' ZoneQualifier] ',' StateField ',' CompareOp ',' Literal ')'` — Tier 2 (cross-lieutenant).
 *  `lieutenantRef` is the ROLE (an archetype name, e.g. `cook`); `zone` is the raw zone qualifier (`same_zone` default,
 *  or `same_building`) — validated + uppercased by the compiler. */
export interface PeerStateCondition {
  node: 'PEER_STATE';
  lieutenantRef: string;
  zone: string;
  field: string;
  index?: string;
  op: CompareOp;
  value: Literal;
  tier: VocabTier; // 2
  span: SourceSpan;
}

/** `PEER_PLANNED '(' LieutenantRef ',' ActionKind ')'` — Tier 4. */
export interface PeerPlannedCondition {
  node: 'PEER_PLANNED';
  lieutenantRef: string;
  actionKind: string;
  tier: VocabTier; // 4
  span: SourceSpan;
}

/** `IN_TIME_WINDOW '(' HourLiteral ',' HourLiteral ')'` — Tier 5 (custom time window). */
export interface InTimeWindowCondition {
  node: 'IN_TIME_WINDOW';
  start: Literal;
  end: Literal;
  tier: VocabTier; // 5
  span: SourceSpan;
}

/** A leaf condition (a `ConditionAtom`). */
export type ConditionAtom =
  | MyStateCondition
  | ExceptionFromCondition
  | ConvictionAboveCondition
  | PeerStateCondition
  | PeerPlannedCondition
  | InTimeWindowCondition;

/** `ConditionExpr 'AND' ConditionExpr | ... 'OR' ... | 'NOT' ConditionExpr` — Tier 2 combinators. RECOGNIZED + tagged so
 *  T2 rejects; the operands are retained (never dropped). `NOT` is unary (`right` only). */
export interface ConditionBinary {
  node: 'AND' | 'OR';
  left: ConditionExpr;
  right: ConditionExpr;
  tier: VocabTier; // 2
  span: SourceSpan;
}

export interface ConditionNot {
  node: 'NOT';
  operand: ConditionExpr;
  tier: VocabTier; // 2
  span: SourceSpan;
}

export type ConditionExpr = ConditionAtom | ConditionBinary | ConditionNot;

// ---------------------------------------------------------------------------------------------------------------------
// Actions — `ActionExpr` / `ActionAtom` (07 §Grammar EBNF). The THEN clause.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The 14 canonical Tier-1 `ActionAtom` names (07 §GrammarPrimitiveEnum Tier 1) PLUS the 3 NEW arg-bearing
 * coordinator dispatch primitives added in 9c (DD-COORD-GRAMMAR, ADDITIVE — DD-ADDITIVE-ENGINE §3.7) PLUS the
 * 04f-A C7 `schedule_maintenance` Facility-manager auto-schedule action (D9 — the SAME additive registry
 * mechanism 9c established, mirroring its 1-arg `set_stance` shape exactly).
 * The lowercase names (`dispatch_courier` / `set_stance` / `toggle_ephemeral` / `schedule_maintenance`) match the
 * canonical `lieutenant_role_mapping.md:93` DSL surface — the player writes `schedule_maintenance(...)` (verb-noun
 * form), matching the existing camelCase DSL convention for positional arg actions (OQ-A2a).
 */
export type Tier1ActionName =
  | 'EXECUTE_DEFAULT'
  | 'PAUSE_OPS'
  | 'REQUEST_PLAYER_INPUT'
  | 'REROUTE_TO'
  | 'ALERT_PEER'
  | 'ABORT_CURRENT_TASK'
  | 'LOG_EVENT_AS'
  | 'ASSIGN_SUBORDINATE'
  | 'INCREMENT_DECOY_AT'
  | 'FLAG_DISSENT'
  | 'REQUEST_VETO_CLEAR'
  | 'REVERT_DEFAULT_SCRIPT'
  | 'PROMOTE_UNDERSTUDY'
  | 'ESCALATE_TO_TIER'
  // 9c DD-COORD-GRAMMAR — coordinator dispatch primitives (ADDITIVE, DD-ADDITIVE-ENGINE §3.7):
  | 'dispatch_courier'
  | 'set_stance'
  | 'toggle_ephemeral'
  // 04f-A C7 (D9) — Facility-manager auto-schedule action (ADDITIVE, the SAME 9c registry mechanism):
  | 'schedule_maintenance';

/**
 * An `ActionAtom` (Tier 1). The nullary actions (`EXECUTE_DEFAULT`, `PAUSE_OPS`, `ABORT_CURRENT_TASK`,
 * `REVERT_DEFAULT_SCRIPT`) carry `arg: undefined` and `args: undefined`; the single-arg parametric ones carry
 * their single argument lexeme in `arg`; the 9c multi-arg actions carry their positional argument lexemes in `args`.
 *
 * **DD-ADDITIVE-ENGINE (§3.7):** the `args` field is NEW and ABSENT for all pre-existing actions — the AST for
 * `EXECUTE_DEFAULT`/`PAUSE_OPS`/`REQUEST_PLAYER_INPUT` and the original 11 single-arg actions is byte-identical
 * (neither `arg` nor `args` changes for them).
 */
export interface ActionAtom {
  node: 'ACTION_ATOM';
  name: Tier1ActionName;
  /** The single parenthesized argument lexeme, when the action takes exactly one arg (e.g. `REROUTE_TO(node)`→`'node'`).
   *  ABSENT for nullary actions and for the 9c multi-arg actions (which use `args` instead). */
  arg?: string;
  /**
   * 9c: the positional argument lexemes for multi-arg actions (`dispatch_courier(route, vehicle, stance)` → `['to_primary_stash','bike','evasive']`).
   * ABSENT for nullary actions and for single-arg actions (which use `arg`).
   * The compiler validates each lexeme against its closed enum domain.
   */
  args?: string[];
  tier: VocabTier; // 1
  span: SourceSpan;
}

/** `ActionAtom 'SEQ' ActionExpr` — Tier 3 action chaining. RECOGNIZED + tagged; operands retained. */
export interface ActionSeq {
  node: 'SEQ';
  first: ActionExpr;
  rest: ActionExpr;
  tier: VocabTier; // 3
  span: SourceSpan;
}

/** `COHORT '(' RoleType ')' ':' ActionAtom` — Tier 6. RECOGNIZED + tagged; the inner action retained. */
export interface ActionCohort {
  node: 'COHORT';
  roleType: string;
  action: ActionAtom;
  tier: VocabTier; // 6
  span: SourceSpan;
}

export type ActionExpr = ActionAtom | ActionSeq | ActionCohort;

// ---------------------------------------------------------------------------------------------------------------------
// Rule + Script — `RuleDecl` / `Script` (07 §Grammar EBNF, §Composites Rule)
// ---------------------------------------------------------------------------------------------------------------------

/** `RuleDecl ::= 'WHEN' TriggerExpr [ 'AND_IF' ConditionExpr ] 'THEN' ActionExpr '@' PriorityValue ';'`.
 *  `tier` = the MAX tier of any node in this rule (the rule's effective tier — what T2 gates on). */
export interface RuleDecl {
  trigger: TriggerNode;
  condition?: ConditionExpr;
  action: ActionExpr;
  /** `@' PriorityValue` — an integer literal (bounds checked by T2 against T.dsl.priority_min/max). */
  priority: number;
  /** The effective tier of the rule = max tier across trigger/condition/action nodes (Tier 1 for a pure Tier-1 rule). */
  tier: VocabTier;
  /** The source span of the rule (its `WHEN` keyword), for diagnostics. */
  sourceSpan: SourceSpan;
}

/** `Script ::= RuleDecl { RuleDecl }` — the ordered list of rules (insertion order preserved — replay-safe tie-break). */
export interface BehaviorScriptAst {
  rules: RuleDecl[];
}

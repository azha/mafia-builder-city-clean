// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Composite CompiledScript (DiagnosticEntry —
//             code / severity / span) + §Grammar EBNF (the parser surfaces a precise span on a syntax error)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 1, DSL parser) --
//
// `DslDiagnostic` — the structured error the DSL pipeline returns INSTEAD of throwing. It mirrors the canonical
// `DiagnosticEntry { code, severity, span }` of the 07 §Composite CompiledScript: a stable `kind` (the diagnostic code),
// a `line`/`col` source span (1-based, the player-authored text), and a human-readable `message`. The compiler/executor
// (T2/T3) EXTEND the `kind` union additively — never rename an existing kind (R-EH-3 stable cross-version). The message
// is plain English here (slice 1); the canonical i18n_message_key wiring (07 §Crowdin) is DEFERRED — out of slice-1 scope.
//
// T1 (this file) only ever emits `'SYNTAX_ERROR'` — a genuine parse failure (unexpected/missing token, malformed
// production). The non-syntax kinds (tier-gating, executability, bounds) are DECLARED here so T2 can populate them, but
// T1 never produces them: parsing SUCCEEDS into a tier-tagged AST even for Tier ≥ 2 constructs (T2 decides what to
// reject). Keeping the closed union here, in one place, is the DRY home for the whole DSL diagnostic vocabulary.

/**
 * The stable diagnostic code. SCREAMING_SNAKE_CASE, cross-version stable (R-EH-3).
 *
 * - `SYNTAX_ERROR`        — T1 (parser): the source is not grammatical (unexpected/missing token, malformed production).
 * - `TIER_NOT_UNLOCKED`   — T2 (compiler): a node tagged Tier ≥ 2 in a build that only runs Tier 1.
 * - `NOT_SUPPORTED_YET`   — T2 (compiler): a primitive that parses + is Tier 1 but has no executor side-effect yet.
 * - `RULE_COUNT_EXCEEDED` — T2 (compiler): rules.length > T.dsl.max_rules_per_script.
 * - `PRIORITY_OUT_OF_BOUNDS` — T2 (compiler): an @priority outside [T.dsl.priority_min, T.dsl.priority_max].
 * - `CONDITION_DEPTH_EXCEEDED` — T2 (compiler): condition nesting > T.dsl.max_nested_condition_depth.
 * - `TENURE_PEER_SCOPE_VIOLATION` — T2 (compiler): a PEER_* node (trigger PEER_EVENT / condition PEER_STATE) reads a
 *   `tenure_*` field of ANOTHER lieutenant (Phase-11 tenure inertia, canon Invariant 5 — a peer cannot read another
 *   lieutenant's tenure state). ADDITIVE (R-EH-3 — never rename an existing kind). Co-fires with the generic
 *   `TIER_NOT_UNLOCKED` (the PEER_* node is also Tier ≥ 2), the SAME precise+generic pattern the action-tier gate uses.
 */
export type DslDiagnosticKind =
  | 'SYNTAX_ERROR'
  | 'TIER_NOT_UNLOCKED'
  | 'NOT_SUPPORTED_YET'
  | 'RULE_COUNT_EXCEEDED'
  | 'PRIORITY_OUT_OF_BOUNDS'
  | 'CONDITION_DEPTH_EXCEEDED'
  | 'TENURE_PEER_SCOPE_VIOLATION';

/**
 * A single structured diagnostic. The pipeline returns `{ diagnostics: DslDiagnostic[] }` on failure — NEVER throws a
 * raw error out of `parse` / `compile` / `resolve`.
 */
export interface DslDiagnostic {
  /** 1-based source line of the offending token (the player-authored DSL text). */
  line: number;
  /** 1-based source column of the offending token. */
  col: number;
  /** Plain-English description of what went wrong / what was expected (slice 1; i18n key DEFERRED). */
  message: string;
  /** The stable diagnostic code (see {@link DslDiagnosticKind}). */
  kind: DslDiagnosticKind;
}

/** Factory for a `SYNTAX_ERROR` diagnostic — the only kind T1 produces. */
export function syntaxError(line: number, col: number, message: string): DslDiagnostic {
  return { line, col, message, kind: 'SYNTAX_ERROR' };
}

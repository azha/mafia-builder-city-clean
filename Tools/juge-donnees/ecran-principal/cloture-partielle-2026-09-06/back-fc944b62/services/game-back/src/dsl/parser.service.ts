// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Grammar EBNF (the full 7-tier grammar, REUSED
//             VERBATIM — never re-invented) + §Composites BehaviorScript / Rule + §GrammarPrimitiveEnum (the Tier-1..6
//             primitive catalogue by VocabTier) + §Composite CompiledScript (DiagnosticEntry.span — line/col on error)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 1, DSL parser) --
//
// `DslParserService` — the Tier-1-complete DSL parser: a hand-written lexer + recursive-descent parser that turns the
// player-authored DSL `source` into a tier-tagged `BehaviorScriptAst` (ast.ts). It is PURE: no DB, no I/O, no RNG, no
// `eval` / `Function()` (07 §Composite CompiledScript invariant). `parse` NEVER throws — every genuine syntax error is
// returned as a precise `DslDiagnostic` (line/col + what was expected).
//
// Scope (T1 = PARSER ONLY): source → AST. It does NOT tier-GATE (that is T2 — here every node is just tagged with its
// `VocabTier`), does NOT validate executability/bounds (T2), does NOT compile to IR (T2) or execute (T3). Parsing
// SUCCEEDS into a tier-tagged AST EVEN for Tier ≥ 2 constructs (the `AND`/`OR`/`NOT` condition combinators, `SEQ` action
// chaining, the `PEER_*` / `COHORT` primitives, the custom `IN_TIME_WINDOW`) — they are RECOGNIZED + tagged Tier ≥ 2 so
// T2 can reject them precisely, NEVER silently dropped. Only a GENUINE syntax error (unexpected/missing token, malformed
// production) produces a diagnostic here.
//
// Grammar (07 §Grammar EBNF), implemented verbatim:
//   Script        ::= RuleDecl { RuleDecl }
//   RuleDecl      ::= 'WHEN' TriggerExpr [ 'AND_IF' ConditionExpr ] 'THEN' ActionExpr '@' PriorityValue ';'
//   TriggerExpr   ::= EVENT | STATE | TIME | LIFECYCLE | ORDER_LIFECYCLE | PEER_EVENT(Tier2)
//   ConditionExpr ::= ConditionAtom | ConditionExpr ('AND'|'OR') ConditionExpr(Tier2) | 'NOT' ConditionExpr(Tier2) | '(' ConditionExpr ')'
//   ActionExpr    ::= ActionAtom | ActionAtom 'SEQ' ActionExpr(Tier3) | 'COHORT' '(' RoleType ')' ':' ActionAtom(Tier6)
//   CompareOp     ::= '<' | '<=' | '=' | '!=' | '>=' | '>'   (also accepts '==' for '=', normalized)
//   Literal       ::= Number | TunableRef('{{tunable:' Identifier '}}') | EnumLiteral

import { Injectable } from '@nestjs/common';

import type {
  ActionAtom,
  ActionExpr,
  BehaviorScriptAst,
  CompareOp,
  ConditionAtom,
  ConditionExpr,
  Literal,
  RuleDecl,
  SourceSpan,
  Tier1ActionName,
  TriggerNode,
  VocabTier,
} from './ast';
import { DslDiagnostic, syntaxError } from './dsl-errors';

// ---------------------------------------------------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------------------------------------------------

type TokenType =
  | 'IDENT' // a keyword or identifier (WHEN, EVENT, EXECUTE_DEFAULT, cook_idle, true, EXPIRES_SOON, …)
  | 'NUMBER' // 5, 0.6, -3
  | 'TUNABLE' // {{tunable:dsl.priority_max}}
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'COLON'
  | 'AT' // @
  | 'SEMI' // ;
  | 'OP' // < <= = == != >= >
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const COMPARE_OPS = new Set(['<', '<=', '=', '==', '!=', '>=', '>']);

/** A lexer error carries a span — caught by `parse` and turned into a `SYNTAX_ERROR` diagnostic. */
class LexError extends Error {
  constructor(
    public readonly line: number,
    public readonly col: number,
    message: string,
  ) {
    super(message);
  }
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (n = 1): void => {
    for (let k = 0; k < n; k++) {
      if (source[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  while (i < source.length) {
    const ch = source[i];

    // whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // line comment: // ... (to end of line) — author convenience, not in the EBNF but harmless to strip
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // tunable ref: {{tunable:Identifier}}
    if (ch === '{' && source[i + 1] === '{') {
      const close = source.indexOf('}}', i + 2);
      if (close === -1) {
        throw new LexError(startLine, startCol, "Unterminated tunable reference (missing '}}')");
      }
      const inner = source.slice(i + 2, close).trim();
      const m = /^tunable:(.+)$/.exec(inner);
      if (!m) {
        throw new LexError(startLine, startCol, "Malformed tunable reference (expected '{{tunable:identifier}}')");
      }
      advance(close + 2 - i);
      tokens.push({ type: 'TUNABLE', value: m[1].trim(), line: startLine, col: startCol });
      continue;
    }

    // number (optionally signed, with a decimal part)
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let num = '';
      if (source[i] === '-') {
        num += '-';
        advance();
      }
      while (i < source.length && /[0-9]/.test(source[i])) {
        num += source[i];
        advance();
      }
      if (source[i] === '.') {
        num += '.';
        advance();
        while (i < source.length && /[0-9]/.test(source[i])) {
          num += source[i];
          advance();
        }
      }
      tokens.push({ type: 'NUMBER', value: num, line: startLine, col: startCol });
      continue;
    }

    // identifier / keyword
    if (isIdentStart(ch)) {
      let id = '';
      while (i < source.length && isIdentPart(source[i])) {
        id += source[i];
        advance();
      }
      tokens.push({ type: 'IDENT', value: id, line: startLine, col: startCol });
      continue;
    }

    // multi-char comparison operators first (<=, >=, !=, ==)
    const two = source.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '!=' || two === '==') {
      advance(2);
      tokens.push({ type: 'OP', value: two, line: startLine, col: startCol });
      continue;
    }

    // single-char tokens
    switch (ch) {
      case '(':
        advance();
        tokens.push({ type: 'LPAREN', value: ch, line: startLine, col: startCol });
        continue;
      case ')':
        advance();
        tokens.push({ type: 'RPAREN', value: ch, line: startLine, col: startCol });
        continue;
      case '[':
        advance();
        tokens.push({ type: 'LBRACKET', value: ch, line: startLine, col: startCol });
        continue;
      case ']':
        advance();
        tokens.push({ type: 'RBRACKET', value: ch, line: startLine, col: startCol });
        continue;
      case ',':
        advance();
        tokens.push({ type: 'COMMA', value: ch, line: startLine, col: startCol });
        continue;
      case ':':
        advance();
        tokens.push({ type: 'COLON', value: ch, line: startLine, col: startCol });
        continue;
      case '@':
        advance();
        tokens.push({ type: 'AT', value: ch, line: startLine, col: startCol });
        continue;
      case ';':
        advance();
        tokens.push({ type: 'SEMI', value: ch, line: startLine, col: startCol });
        continue;
      case '<':
      case '>':
      case '=':
        advance();
        tokens.push({ type: 'OP', value: ch, line: startLine, col: startCol });
        continue;
      default:
        throw new LexError(startLine, startCol, `Unexpected character '${ch}'`);
    }
  }

  tokens.push({ type: 'EOF', value: '', line, col });
  return tokens;
}

// ---------------------------------------------------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------------------------------------------------

/** A parse error carries a span — caught by `parse` and turned into a `SYNTAX_ERROR` diagnostic. */
class ParseError extends Error {
  constructor(
    public readonly line: number,
    public readonly col: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The canonical Tier-1 action atoms (07 §GrammarPrimitiveEnum Tier 1) and their arg spec.
 * `arg: false` → nullary (no parens); `arg: true` → single-arg `(bareIdent)` in the ORIGINAL single-arg branch;
 * `argCount: N` (N ≥ 1) → positional comma-separated `(ident, ident, ...)` in the NEW multi-arg branch (9c).
 *
 * **DD-ADDITIVE-ENGINE (§3.7):** the 14 original entries keep `{ arg: boolean }` unchanged (the zero-arg + single-arg
 * parse branches are untouched). The 3 NEW 9c entries use `{ arg: false, argCount: N }` — a NEW multi-arg branch in
 * `parseActionAtom` handles them (OQ-A2a: positional comma-separated bare-ident enum tokens).
 * The result is stored in `ActionAtom.args: string[]` (the NEW field on the AST) so the compiler can validate the
 * closed-domain lexemes per-arg, and distinguish them from the existing single-arg `arg?: string` field.
 */
const TIER1_ACTIONS: Record<Tier1ActionName, { arg: boolean; argCount?: number }> = {
  // ── Original 14 Tier-1 actions (arg-spec UNCHANGED — byte-identical parse) ────────────────────
  EXECUTE_DEFAULT: { arg: false },
  PAUSE_OPS: { arg: false },
  REQUEST_PLAYER_INPUT: { arg: false },
  REROUTE_TO: { arg: true },
  ALERT_PEER: { arg: true },
  ABORT_CURRENT_TASK: { arg: false },
  LOG_EVENT_AS: { arg: true },
  ASSIGN_SUBORDINATE: { arg: true },
  INCREMENT_DECOY_AT: { arg: true },
  FLAG_DISSENT: { arg: true },
  REQUEST_VETO_CLEAR: { arg: true },
  REVERT_DEFAULT_SCRIPT: { arg: false },
  PROMOTE_UNDERSTUDY: { arg: true },
  ESCALATE_TO_TIER: { arg: true },
  // ── 9c NEW coordinator dispatch primitives (ADDITIVE — parsed via the NEW multi-arg branch) ───
  // `dispatch_courier(route, vehicle, stance)` — 3 positional bare-ident enum tokens (OQ-A2a).
  dispatch_courier: { arg: false, argCount: 3 },
  // `set_stance(stance)` — 1 positional bare-ident (stance enum); stored in `args` not `arg`.
  set_stance: { arg: false, argCount: 1 },
  // `toggle_ephemeral(bool)` — 1 positional bare-ident (`true`/`false` enum literal); stored in `args` not `arg`.
  toggle_ephemeral: { arg: false, argCount: 1 },
  // 04f-A C7 (D9) — `schedule_maintenance(most_due)` — 1 positional bare-ident (the closed selector domain,
  // R2.2 — NEVER a raw building uuid); parsed via the SAME multi-arg branch as `set_stance` (argCount: 1).
  schedule_maintenance: { arg: false, argCount: 1 },
};

/** A recursive-descent parser over a token stream. One instance per `parse` call (no shared state — pure). */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private spanOf(t: Token): SourceSpan {
    return { line: t.line, col: t.col };
  }

  private fail(t: Token, message: string): never {
    throw new ParseError(t.line, t.col, message);
  }

  /** Consume a token of the expected type, or fail with a precise diagnostic. */
  private expect(type: TokenType, label: string): Token {
    const t = this.peek();
    if (t.type !== type) {
      this.fail(t, `Expected ${label} but found ${describe(t)}`);
    }
    return this.next();
  }

  /** Consume an IDENT whose value is exactly `kw` (a keyword), or fail. */
  private expectKeyword(kw: string): Token {
    const t = this.peek();
    if (t.type !== 'IDENT' || t.value !== kw) {
      this.fail(t, `Expected '${kw}' but found ${describe(t)}`);
    }
    return this.next();
  }

  /** True if the next token is the IDENT keyword `kw`. */
  private isKeyword(kw: string): boolean {
    const t = this.peek();
    return t.type === 'IDENT' && t.value === kw;
  }

  // -- Script ::= RuleDecl { RuleDecl } --
  parseScript(): BehaviorScriptAst {
    const rules: RuleDecl[] = [];
    while (this.peek().type !== 'EOF') {
      rules.push(this.parseRule());
    }
    return { rules };
  }

  // -- RuleDecl ::= 'WHEN' TriggerExpr [ 'AND_IF' ConditionExpr ] 'THEN' ActionExpr '@' PriorityValue ';' --
  private parseRule(): RuleDecl {
    const whenTok = this.expectKeyword('WHEN');
    const trigger = this.parseTrigger();

    let condition: ConditionExpr | undefined;
    if (this.isKeyword('AND_IF')) {
      this.next();
      condition = this.parseConditionExpr();
    }

    this.expectKeyword('THEN');
    const action = this.parseActionExpr();

    this.expect('AT', "'@'");
    const priorityTok = this.expect('NUMBER', 'an integer priority value');
    const priority = Number(priorityTok.value);
    if (!Number.isSafeInteger(priority)) {
      this.fail(priorityTok, `Priority must be an integer but found '${priorityTok.value}'`);
    }

    this.expect('SEMI', "';'");

    const tier = maxTier(
      trigger.tier,
      condition ? conditionTier(condition) : 1,
      actionTier(action),
    );

    return {
      trigger,
      condition,
      action,
      priority,
      tier,
      sourceSpan: this.spanOf(whenTok),
    };
  }

  // -- TriggerExpr --
  private parseTrigger(): TriggerNode {
    const t = this.peek();
    if (t.type !== 'IDENT') {
      this.fail(t, `Expected a trigger (EVENT / STATE / TIME / LIFECYCLE / ORDER_LIFECYCLE / PEER_EVENT) but found ${describe(t)}`);
    }
    const span = this.spanOf(t);
    switch (t.value) {
      case 'EVENT': {
        this.next();
        this.expect('LPAREN', "'('");
        const eventType = this.parseBareIdent('an event type');
        this.expect('COMMA', "','");
        const op = this.parseCompareOp();
        this.expect('COMMA', "','");
        const value = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'EVENT', eventType, op, value, tier: 1, span };
      }
      case 'STATE': {
        this.next();
        this.expect('LPAREN', "'('");
        const { field, index } = this.parseFieldWithIndex();
        this.expect('COMMA', "','");
        const op = this.parseCompareOp();
        this.expect('COMMA', "','");
        const value = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'STATE', field, index, op, value, tier: 1, span };
      }
      case 'TIME': {
        this.next();
        this.expect('LPAREN', "'('");
        const start = this.parseLiteral();
        this.expect('COMMA', "','");
        const end = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'TIME', start, end, tier: 1, span };
      }
      case 'LIFECYCLE': {
        this.next();
        this.expect('LPAREN', "'('");
        const event = this.parseBareIdent('a lifecycle event');
        this.expect('RPAREN', "')'");
        return { node: 'LIFECYCLE', event, tier: 1, span };
      }
      case 'ORDER_LIFECYCLE': {
        this.next();
        this.expect('LPAREN', "'('");
        const orderRef = this.parseBareIdent('an order reference');
        this.expect('COMMA', "','");
        const event = this.parseBareIdent('an order event');
        this.expect('RPAREN', "')'");
        return { node: 'ORDER_LIFECYCLE', orderRef, event, tier: 1, span };
      }
      case 'PEER_EVENT': {
        // Tier 2 — RECOGNIZED + tagged so T2 rejects; never silently dropped.
        this.next();
        this.expect('LPAREN', "'('");
        const lieutenantRef = this.parseBareIdent('a lieutenant reference');
        this.expect('COMMA', "','");
        const eventType = this.parseBareIdent('an event type');
        this.expect('RPAREN', "')'");
        return { node: 'PEER_EVENT', lieutenantRef, eventType, tier: 2, span };
      }
      default:
        this.fail(
          t,
          `Unknown trigger '${t.value}' (expected EVENT / STATE / TIME / LIFECYCLE / ORDER_LIFECYCLE / PEER_EVENT)`,
        );
    }
  }

  // -- ConditionExpr (with Tier-2 AND/OR/NOT combinators + parentheses). Precedence: NOT > AND > OR. --
  private parseConditionExpr(): ConditionExpr {
    return this.parseConditionOr();
  }

  private parseConditionOr(): ConditionExpr {
    let left = this.parseConditionAnd();
    while (this.isKeyword('OR')) {
      const opTok = this.next();
      const right = this.parseConditionAnd();
      left = { node: 'OR', left, right, tier: 2, span: this.spanOf(opTok) };
    }
    return left;
  }

  private parseConditionAnd(): ConditionExpr {
    let left = this.parseConditionUnary();
    while (this.isKeyword('AND')) {
      const opTok = this.next();
      const right = this.parseConditionUnary();
      left = { node: 'AND', left, right, tier: 2, span: this.spanOf(opTok) };
    }
    return left;
  }

  private parseConditionUnary(): ConditionExpr {
    if (this.isKeyword('NOT')) {
      const notTok = this.next();
      const operand = this.parseConditionUnary();
      return { node: 'NOT', operand, tier: 2, span: this.spanOf(notTok) };
    }
    return this.parseConditionPrimary();
  }

  private parseConditionPrimary(): ConditionExpr {
    if (this.peek().type === 'LPAREN') {
      this.next();
      const inner = this.parseConditionExpr();
      this.expect('RPAREN', "')'");
      return inner;
    }
    return this.parseConditionAtom();
  }

  // -- ConditionAtom --
  private parseConditionAtom(): ConditionAtom {
    const t = this.peek();
    if (t.type !== 'IDENT') {
      this.fail(
        t,
        `Expected a condition (MY_STATE / EXCEPTION_FROM / CONVICTION_ABOVE / PEER_STATE / PEER_PLANNED / IN_TIME_WINDOW) but found ${describe(t)}`,
      );
    }
    const span = this.spanOf(t);
    switch (t.value) {
      case 'MY_STATE': {
        this.next();
        this.expect('LPAREN', "'('");
        const { field, index } = this.parseFieldWithIndex();
        this.expect('COMMA', "','");
        const op = this.parseCompareOp();
        this.expect('COMMA', "','");
        const value = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'MY_STATE', field, index, op, value, tier: 1, span };
      }
      case 'EXCEPTION_FROM': {
        this.next();
        this.expect('LPAREN', "'('");
        const category = this.parseBareIdent('an exception category');
        this.expect('RPAREN', "')'");
        return { node: 'EXCEPTION_FROM', category, tier: 1, span };
      }
      case 'CONVICTION_ABOVE': {
        this.next();
        this.expect('LPAREN', "'('");
        const value = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'CONVICTION_ABOVE', value, tier: 1, span };
      }
      case 'PEER_STATE': {
        // Tier 2 — RECOGNIZED + tagged. The reference is `role [@ zoneQualifier]` (Phase-18 hybrid addressing).
        this.next();
        this.expect('LPAREN', "'('");
        const lieutenantRef = this.parseBareIdent('a lieutenant reference');
        let zone = 'same_zone'; // default — "the {role} in my zone".
        if (this.peek().type === 'AT') {
          this.next(); // consume '@'
          zone = this.parseBareIdent('a zone qualifier (same_zone / same_building)');
        }
        this.expect('COMMA', "','");
        const { field, index } = this.parseFieldWithIndex();
        this.expect('COMMA', "','");
        const op = this.parseCompareOp();
        this.expect('COMMA', "','");
        const value = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'PEER_STATE', lieutenantRef, zone, field, index, op, value, tier: 2, span };
      }
      case 'PEER_PLANNED': {
        // Tier 4 — RECOGNIZED + tagged.
        this.next();
        this.expect('LPAREN', "'('");
        const lieutenantRef = this.parseBareIdent('a lieutenant reference');
        this.expect('COMMA', "','");
        const actionKind = this.parseBareIdent('an action kind');
        this.expect('RPAREN', "')'");
        return { node: 'PEER_PLANNED', lieutenantRef, actionKind, tier: 4, span };
      }
      case 'IN_TIME_WINDOW': {
        // Tier 5 — RECOGNIZED + tagged.
        this.next();
        this.expect('LPAREN', "'('");
        const start = this.parseLiteral();
        this.expect('COMMA', "','");
        const end = this.parseLiteral();
        this.expect('RPAREN', "')'");
        return { node: 'IN_TIME_WINDOW', start, end, tier: 5, span };
      }
      default:
        this.fail(
          t,
          `Unknown condition '${t.value}' (expected MY_STATE / EXCEPTION_FROM / CONVICTION_ABOVE / PEER_STATE / PEER_PLANNED / IN_TIME_WINDOW)`,
        );
    }
  }

  // -- ActionExpr ::= ActionAtom | ActionAtom 'SEQ' ActionExpr | 'COHORT' '(' RoleType ')' ':' ActionAtom --
  private parseActionExpr(): ActionExpr {
    // COHORT(role): action — Tier 6.
    if (this.isKeyword('COHORT')) {
      const cohortTok = this.next();
      this.expect('LPAREN', "'('");
      const roleType = this.parseBareIdent('a role type');
      this.expect('RPAREN', "')'");
      this.expect('COLON', "':'");
      const action = this.parseActionAtom();
      return { node: 'COHORT', roleType, action, tier: 6, span: this.spanOf(cohortTok) };
    }

    const first = this.parseActionAtom();
    // ActionAtom 'SEQ' ActionExpr — Tier 3 (right-associative chaining). RECOGNIZED + tagged.
    if (this.isKeyword('SEQ')) {
      const seqTok = this.next();
      const rest = this.parseActionExpr();
      return { node: 'SEQ', first, rest, tier: 3, span: this.spanOf(seqTok) };
    }
    return first;
  }

  // -- ActionAtom (Tier 1) --
  private parseActionAtom(): ActionAtom {
    const t = this.peek();
    if (t.type !== 'IDENT') {
      this.fail(t, `Expected an action but found ${describe(t)}`);
    }
    const name = t.value as Tier1ActionName;
    const spec = TIER1_ACTIONS[name];
    if (!spec) {
      this.fail(t, `Unknown action '${t.value}'`);
    }
    const span = this.spanOf(t);
    this.next();

    // 9c: NEW multi-arg parse branch — positional comma-separated bare-ident enum tokens (OQ-A2a).
    // Only for actions with `argCount` set (the 3 new coordinator dispatch primitives).
    // The existing zero-arg + single-arg branches are UNCHANGED (DD-ADDITIVE-ENGINE §3.7).
    if (spec.argCount !== undefined) {
      this.expect('LPAREN', "'('");
      const args: string[] = [];
      for (let i = 0; i < spec.argCount; i++) {
        if (i > 0) {
          this.expect('COMMA', "','");
        }
        args.push(this.parseBareIdent(`argument ${i + 1} for ${name}`));
      }
      this.expect('RPAREN', "')'");
      // Store in `args` (NOT `arg`) so the compiler can validate per-position domains.
      return { node: 'ACTION_ATOM', name, args, tier: 1, span };
    }

    // Original single-arg branch (byte-identical — REROUTE_TO, ALERT_PEER, etc.).
    if (spec.arg) {
      this.expect('LPAREN', "'('");
      const arg = this.parseBareIdent(`an argument for ${name}`);
      this.expect('RPAREN', "')'");
      return { node: 'ACTION_ATOM', name, arg, tier: 1, span };
    }
    // Original zero-arg branch (byte-identical — EXECUTE_DEFAULT, PAUSE_OPS, etc.).
    return { node: 'ACTION_ATOM', name, tier: 1, span };
  }

  // -- StateField [ '[' IndexKey ']' ] --
  private parseFieldWithIndex(): { field: string; index?: string } {
    const field = this.parseBareIdent('a state field');
    let index: string | undefined;
    if (this.peek().type === 'LBRACKET') {
      this.next();
      index = this.parseBareIdent('an index key');
      this.expect('RBRACKET', "']'");
    }
    return { field, index };
  }

  // -- a bare identifier (an EventType / StateField / category / ref / event name — anything symbolic) --
  private parseBareIdent(label: string): string {
    const t = this.peek();
    if (t.type !== 'IDENT') {
      this.fail(t, `Expected ${label} but found ${describe(t)}`);
    }
    return this.next().value;
  }

  // -- CompareOp ::= '<' | '<=' | '=' | '!=' | '>=' | '>'  (also '==' → '=') --
  private parseCompareOp(): CompareOp {
    const t = this.peek();
    if (t.type !== 'OP' || !COMPARE_OPS.has(t.value)) {
      this.fail(t, `Expected a comparison operator (< <= = != >= >) but found ${describe(t)}`);
    }
    this.next();
    return (t.value === '==' ? '=' : t.value) as CompareOp;
  }

  // -- Literal ::= Number | TunableRef | EnumLiteral --
  private parseLiteral(): Literal {
    const t = this.peek();
    const span = this.spanOf(t);
    if (t.type === 'NUMBER') {
      this.next();
      return { kind: 'number', value: Number(t.value), span };
    }
    if (t.type === 'TUNABLE') {
      this.next();
      return { kind: 'tunable_ref', identifier: t.value, span };
    }
    if (t.type === 'IDENT') {
      this.next();
      const lit: Literal = { kind: 'enum', value: t.value, span };
      if (t.value === 'true') lit.bool = true;
      else if (t.value === 'false') lit.bool = false;
      return lit;
    }
    this.fail(t, `Expected a literal (number / {{tunable:...}} / enum) but found ${describe(t)}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Tier helpers (the rule's effective tier = max tier across its nodes)
// ---------------------------------------------------------------------------------------------------------------------

function maxTier(...tiers: VocabTier[]): VocabTier {
  return tiers.reduce<VocabTier>((acc, t) => (t > acc ? t : acc), 1);
}

function conditionTier(c: ConditionExpr): VocabTier {
  switch (c.node) {
    case 'AND':
    case 'OR':
      return maxTier(c.tier, conditionTier(c.left), conditionTier(c.right));
    case 'NOT':
      return maxTier(c.tier, conditionTier(c.operand));
    default:
      return c.tier;
  }
}

function actionTier(a: ActionExpr): VocabTier {
  switch (a.node) {
    case 'SEQ':
      return maxTier(a.tier, actionTier(a.first), actionTier(a.rest));
    case 'COHORT':
      return maxTier(a.tier, a.action.tier);
    default:
      return a.tier;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Token description (for diagnostic messages)
// ---------------------------------------------------------------------------------------------------------------------

function describe(t: Token): string {
  if (t.type === 'EOF') return 'end of input';
  return `'${t.value}'`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------------------------------------------------

@Injectable()
export class DslParserService {
  /**
   * Parse a player-authored DSL `source` into a tier-tagged `BehaviorScriptAst`. PURE — no DB, no I/O, no RNG, no `eval`.
   * NEVER throws: a genuine syntax error is returned as `{ diagnostics }` with a precise line/col + what was expected.
   * Tier ≥ 2 constructs parse SUCCESSFULLY into tier-tagged nodes (T2 decides what to reject).
   */
  parse(source: string): { ast: BehaviorScriptAst } | { diagnostics: DslDiagnostic[] } {
    let tokens: Token[];
    try {
      tokens = tokenize(source);
    } catch (e) {
      if (e instanceof LexError) {
        return { diagnostics: [syntaxError(e.line, e.col, e.message)] };
      }
      // Unknown lexer fault — surface as a syntax diagnostic at the start, never throw out.
      return { diagnostics: [syntaxError(1, 1, e instanceof Error ? e.message : 'Lexing failed')] };
    }

    try {
      const ast = new Parser(tokens).parseScript();
      return { ast };
    } catch (e) {
      if (e instanceof ParseError) {
        return { diagnostics: [syntaxError(e.line, e.col, e.message)] };
      }
      return { diagnostics: [syntaxError(1, 1, e instanceof Error ? e.message : 'Parsing failed')] };
    }
  }
}

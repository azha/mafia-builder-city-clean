// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C4 (★ Apply/revert engine)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2.3 (apply/revert lifecycle)
//             Schema: db/schema/effect_modifier.ts (effect_modifier table, migration 0106, C2)
//             — 04e-A1 C4 — 2026-07-04
//
// `EffectModifierInput` — the per-effect payload `EffectModifierService.applyEvent` (C4) accepts:
// one entry per `effect_modifier` row to INSERT. Mirrors the table's writable columns, EXCLUDING
// `id` (DB-generated, `defaultRandom()`) and `active_event_id` (applyEvent's own first argument —
// shared by the WHOLE batch, since one `applyEvent` call always applies the effects of ONE active
// political-event activation, design §2.3: "INSERT one effect_modifier row per effect ...").

import type { effectScope, effectModifierOp } from '../../db/schema/effect_modifier';

/** The `effect_scope` pgEnum member set, narrowed from the schema (never re-declared by hand). */
export type EffectScopeEnumVal = (typeof effectScope.enumValues)[number];

/** The `effect_modifier_op` pgEnum member set, narrowed from the schema (never re-declared by hand). */
export type EffectModifierOpEnumVal = (typeof effectModifierOp.enumValues)[number];

/**
 * One effect to apply as part of an `applyEvent` batch (design §2.3).
 *
 * `scopeRef`/`expiresAtGameDay` are nullable exactly like their schema columns: `scopeRef` is
 * omitted/null for GLOBAL (no ref needed); `expiresAtGameDay` is omitted/null for
 * "permanent-until-election" (design §3 — E-POL-04/-07/-10/-12).
 */
export interface EffectModifierInput {
  readonly scopeType: EffectScopeEnumVal;
  readonly scopeRef?: string | null;
  readonly tunableKey: string;
  readonly op: EffectModifierOpEnumVal;
  /** The compose operand. Accepts a number or a numeric string (Drizzle `numeric()` string-mode — no float rounding drift, design §2.3 determinism). */
  readonly magnitude: number | string;
  readonly appliedAtGameDay: number;
  readonly expiresAtGameDay?: number | null;
}

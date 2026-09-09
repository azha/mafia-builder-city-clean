// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL — Phase-6 vector #6 slice-1
//             (namespace `T.dsl.*`) — the `dsl.max_rules_per_script` / `dsl.compile_timeout_ms` /
//             `dsl.execution_budget_per_tick` / `dsl.priority_min` / `dsl.priority_max` / `dsl.priority_default` /
//             `dsl.max_nested_condition_depth` registry keys (NEW Phase-6 vector #6 T0, `[PROV-Y26Q2]`) +
//             docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Tunables NEW (the `T.dsl.*` semantics —
//             rule-count bound, priority bounds, condition-depth bound, the compiler timeout, the executor budget) +
//             docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §Tunables (R2.3)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 2, DSL compiler/validator) --
//
// DSL compiler/validator tunables (`T.dsl.*`) — the bounds `DslCompilerService` (T2) ENFORCES on a parsed AST, plus the
// two runtime budgets the downstream stages own (`compile_timeout_ms` for the compiler's own time guard, kept here as the
// single DSL-tunable home; `execution_budget_per_tick` consumed by the executor in T3). This is the BYTE-MIRROR of
// money-holding-tunables.ts (the same env-override + registry-default shape): each value is read from an env override
// (test-only knob), else the gdd/14 §Lieutenants + DSL default.
//
// THE BOUNDS (gdd/14 §Lieutenants + DSL, all `[PROV-Y26Q2]`):
//   - max_rules_per_script (20)        — rules.length cap; over → RULE_COUNT_EXCEEDED.
//   - priority_min / priority_max (0 / 100) — each `@priority` must lie in [min, max]; outside → PRIORITY_OUT_OF_BOUNDS.
//   - priority_default (50)            — the priority a rule with no explicit `@priority` would take (median of [min,max]);
//                                        the parser already requires an explicit `@priority`, so this is the IR/contract
//                                        default the compiler carries forward (T3 reads it, never re-derives it).
//   - max_nested_condition_depth (4)   — AND_IF condition AST nesting cap; deeper → CONDITION_DEPTH_EXCEEDED. (Mostly moot
//                                        in slice 1 — conditions are themselves rejected as NOT_SUPPORTED_YET — but the
//                                        check is implemented coherently for the IR contract / higher tiers DEFERRED.)
//   - execution_budget_per_tick (1000) — the executor's per-tick node-visit budget (T3 owns the enforcement; declared
//                                        here so the whole `T.dsl.*` namespace lives in one file). Aligned on the F4
//                                        anchor `perf.game.tick_max_ms` (REUSE).
//   - compile_timeout_ms (200)         — the compiler's own time guard (the canonical §CompiledScript invariant
//                                        `compile_timeout_ms borné par T.dsl.compile_timeout_ms`).
//
// R2.3 (NO inline numeric balance/config): every default mirrors gdd/14 §Lieutenants + DSL (cited per key). If the
// registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). All values `[PROV-Y26Q2]`
// (provisional — calibrate downstream). PURE: a static registry read, no DB / I/O / RNG.
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../config/tunables-store';

/**
 * Registry-grounded DSL tunable defaults (gdd/14 §Lieutenants + DSL — Phase-6 vector #6 slice-1, namespace `T.dsl.*`).
 * Each key + value is verbatim from the gdd/14 row (`[PROV-Y26Q2]`); the env override (`DSL_*`) is test-only.
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 */
export const dslTunables = {
  /**
   * dsl.max_rules_per_script — the rules.length cap the compiler enforces (over → RULE_COUNT_EXCEEDED). Default 20. Env
   * override: DSL_MAX_RULES_PER_SCRIPT (test-only — lets the E2E exceed the cap cheaply). Consumed by DslCompilerService.
   * (DB-override > env > default — Phase-23).
   */
  get maxRulesPerScript(): number { return TunablesStore.resolveInt('dsl.max_rules_per_script', 'DSL_MAX_RULES_PER_SCRIPT', 20); },
  /**
   * dsl.priority_min — the lower @priority bound (a priority below this → PRIORITY_OUT_OF_BOUNDS). Default 0. Env
   * override: DSL_PRIORITY_MIN (test-only). Consumed by DslCompilerService.
   * (DB-override > env > default — Phase-23).
   */
  get priorityMin(): number { return TunablesStore.resolveInt('dsl.priority_min', 'DSL_PRIORITY_MIN', 0); },
  /**
   * dsl.priority_max — the upper @priority bound (a priority above this → PRIORITY_OUT_OF_BOUNDS). Default 100. Env
   * override: DSL_PRIORITY_MAX (test-only). Consumed by DslCompilerService.
   * (DB-override > env > default — Phase-23).
   */
  get priorityMax(): number { return TunablesStore.resolveInt('dsl.priority_max', 'DSL_PRIORITY_MAX', 100); },
  /**
   * dsl.priority_default — the priority carried into the IR for a rule with no explicit @priority (median of [min,max]).
   * Default 50. Env override: DSL_PRIORITY_DEFAULT (test-only). The slice-1 parser requires an explicit @priority, so
   * this is the IR-contract default (T3 reads it; the compiler never silently substitutes it for an out-of-bounds value).
   * (DB-override > env > default — Phase-23).
   */
  get priorityDefault(): number { return TunablesStore.resolveInt('dsl.priority_default', 'DSL_PRIORITY_DEFAULT', 50); },
  /**
   * dsl.max_nested_condition_depth — the AND_IF condition AST-nesting cap (deeper → CONDITION_DEPTH_EXCEEDED). Default 4.
   * Env override: DSL_MAX_NESTED_CONDITION_DEPTH (test-only). Consumed by DslCompilerService (the depth walk).
   * (DB-override > env > default — Phase-23).
   */
  get maxNestedConditionDepth(): number { return TunablesStore.resolveInt('dsl.max_nested_condition_depth', 'DSL_MAX_NESTED_CONDITION_DEPTH', 4); },
  /**
   * dsl.execution_budget_per_tick — the executor's per-tick per-lieutenant node-visit budget (T3 enforces; over →
   * EXECUTE_DEFAULT fallback). Default 1000. Env override: DSL_EXECUTION_BUDGET_PER_TICK (test-only). Declared here so
   * the whole `T.dsl.*` namespace lives in one file; the compiler does not read it (T3 does).
   * (DB-override > env > default — Phase-23).
   */
  get executionBudgetPerTick(): number { return TunablesStore.resolveInt('dsl.execution_budget_per_tick', 'DSL_EXECUTION_BUDGET_PER_TICK', 1000); },
  /**
   * dsl.compile_timeout_ms — the compiler's own time guard (§CompiledScript invariant `compile_timeout_ms borné par
   * T.dsl.compile_timeout_ms`). Default 200 ms. Env override: DSL_COMPILE_TIMEOUT_MS (test-only). The slice-1 compiler is
   * a bounded synchronous AST walk (sub-ms), so this is the declared ceiling, not an active interrupt.
   * (DB-override > env > default — Phase-23).
   */
  get compileTimeoutMs(): number { return TunablesStore.resolveInt('dsl.compile_timeout_ms', 'DSL_COMPILE_TIMEOUT_MS', 200); },
};

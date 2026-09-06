// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Composite CompiledScript invariants
//             (the executor is a "interpréteur fini" over a closed instruction set — deterministic, replay-safe, sandbox
//             strict NestJS, no `eval`/`Function`) + §Implications par couche §NestJS — game-back ("Module dsl/executor :
//             sandboxed interpreter de l'IR, par tick par lieutenant … Read-only sur state … write uniquement via
//             `side_effects` déclarés") — the executor CONSUMES a per-tick signal snapshot and emits a resolved action
//             token; the snapshot is the engine↔binding (T5) contract surface.
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 3, DSL executor) --
//
// The engine↔binding CONTRACT types for the DSL executor (T3). These define the ONLY two values that cross the boundary
// between the per-archetype binding (T5 — the COOK binding fills the snapshot from real game state) and the pure executor
// (T3 — `DslExecutorService.resolve`): the INPUT `SignalSnapshot` (what the binding observed this tick) and the OUTPUT
// `ResolvedAction` token (what the executor decided). T3 defines the contract; T5 FILLS the snapshot (resolves
// `state.cook_idle` / `events.heat` from `ProductionRepository` + the building heat), and T6 (the tick) APPLIES the token
// as a side-effect. The executor itself touches NEITHER source nor sink — it is a pure function of (IR, snapshot).
//
// PURE DATA: plain serializable shapes (no methods, no `eval`). NO DB, NO I/O here.

// 04f-A C7 (D9) — the closed selector domain `SCHEDULE_MAINTENANCE` carries (import-only; this file stays
// archetype-agnostic, same posture as the 9c RouteSelector/vehicle/stance string fields below).
import type { MaintenanceTargetSelector } from './ir';

/**
 * The per-tick signal snapshot the binding (T5) fills and the executor (T3) reads. The ONLY input surface of the executor
 * beyond the IR — the executor reads ONLY this object (the sandbox: no ambient / global access). Two flat maps keyed by the
 * bare signal name (no index — slice-1 triggers are non-indexed):
 *   - `state[field]`  — read by a `STATE(field, op, value)` trigger (e.g. `state.cook_idle`).
 *   - `events[type]`  — read by an `EVENT(type, op, value)` trigger (e.g. `events.heat`).
 * Values are scalar `number | boolean` by default (the slice-1 executable comparison domain); a `string` is ALSO admitted,
 * but ONLY for closed-domain enum STATE fields whose value is one of a fixed symbolic set (P24 L2b — today `interpretation_drift`,
 * whose tokens are the 4 `DriftPhase` values). Such an enum field is compared with `=` / `!=` ONLY (a string has no order in
 * this domain); the compiler restricts which fields admit a string and rejects out-of-domain tokens / ordering ops. `events`
 * stays numeric/boolean (no enum events). A signal a rule references but that the binding did NOT populate is simply ABSENT from
 * the map — the executor treats an absent operand as a non-matching trigger (false), never a crash (07 §sandbox / replay-safe:
 * an unresolved signal must not throw).
 *
 * ABSENCE CONTRACT (the binding↔executor agreement — the executor's absence test is `hasOwnProperty`): "absent" means the
 * key is OMITTED from the map, NOT present-with-`undefined`. The binding (T5) MUST omit a signal it cannot resolve rather
 * than set it to `undefined` (a present `undefined` would pass `hasOwnProperty` and feed `undefined` into a comparison —
 * not the false-trigger the absence contract guarantees). Populate only the signals you genuinely resolved this tick.
 */
export interface SignalSnapshot {
  // `string` is admitted for closed-domain enum STATE fields (P24 L2b — today `interpretation_drift`); numeric/boolean
  // remain the default. `events` stays numeric/boolean (no enum events — YAGNI).
  state: Record<string, number | boolean | string>;
  events: Record<string, number | boolean>;
}

/**
 * The executor's output token (T3 → T6). The slice-1 IR can — post-T2 validation — only carry `EXECUTE_DEFAULT` /
 * `PAUSE_OPS` actions, so a fired rule resolves to one of those; `NONE` means NO rule's trigger matched this tick (the
 * lieutenant takes no script-driven action). The executor returns the token ONLY — it performs NO side-effect (07 §sandbox:
 * "l'executor un interpréteur fini" / "write uniquement via `side_effects` déclarés"); T6 (the delegation tick) maps the
 * token to the real mutation (`EXECUTE_DEFAULT` → restart the cook; `PAUSE_OPS` → pause delegation; `NONE` → resume/no-op).
 *
 * 9c DD-COORD-GRAMMAR §3.3 / DD-ADDITIVE-ENGINE §3.7 — the 3 NEW arg-bearing coordinator variants are ADDITIVE:
 * the existing 4 variants are UNCHANGED (byte-identical tokens). The binding (C5) consumes the new variants to drive
 * the real DistributionService.dispatch; the tick-driven lieutenant roles (COOK/BOOKKEEPER/SECURITY/LAUNDERING/LOGISTICS)
 * receive only the nullary variants they always have — zero regression.
 *
 * R2.2 / P5 wall: every field on the new variants is a CLOSED enum/bucket value (RouteSelector / VehicleType /
 * RouteStance / boolean) — NEVER a raw scalar, never raw coords/grams/heat. Import-only at C2; consumed by C5 binding.
 *
 * 04b-B C3 DD-MUSCLE-P4-LEGIBLE §8.1.1 / OQ-B8 = option (ii): the Muscle archetype resolves `EXECUTE_DEFAULT` (not a
 * dedicated assault token). The previously-listed `REQUEST_ASSAULT` union member is REMOVED as dead — it was never wired
 * into the parser / IR / compiler / executor / tick dispatch path. The Muscle's "default action" IS requesting an assault,
 * which is exactly `EXECUTE_DEFAULT` semantics (every archetype's applyExecuteDefault is its "do the one thing").
 */
export type ResolvedAction =
  | { kind: 'EXECUTE_DEFAULT' }
  | { kind: 'PAUSE_OPS' }
  | { kind: 'REQUEST_PLAYER_INPUT' }
  | { kind: 'NONE' }
  // 9c: arg-bearing coordinator dispatch primitives (ADDITIVE — DD-ADDITIVE-ENGINE §3.7).
  // C5's LogisticsBindingService.applyResolvedAction consumes these to call DistributionService.dispatch.
  | { kind: 'DISPATCH_COURIER'; route?: string; vehicle?: string; stance?: string }
  | { kind: 'SET_STANCE'; stance: string }
  | { kind: 'TOGGLE_EPHEMERAL'; value: boolean }
  // 04f-A C7 (D9): the Facility-manager auto-schedule action (ADDITIVE — the SAME 9c mechanism). The DSL layer
  // stays archetype-agnostic; FacilityManagerBinding.applyResolvedAction consumes this token to call
  // MaintenanceService.scheduleMaintenance on the server-resolved `most_due` building.
  | { kind: 'SCHEDULE_MAINTENANCE'; maintenanceTarget: MaintenanceTargetSelector };

/**
 * 04b-B C3 DD-MUSCLE-P4-LEGIBLE §8.1.3 — the P4 legibility ref for a refused assault.
 *
 * `ScriptRuleRef` identifies WHICH player script rule caused the Muscle lieutenant to NOT assault:
 *   - `{ ruleIndex: number }` — a rule in the player's behavior script matched (with an action that
 *     is NOT `EXECUTE_DEFAULT`). `ruleIndex` is the matched winner rule's `IrRule.index` (the
 *     0-based source insertion order — the ONLY stable per-rule identity in the engine; the same
 *     key the executor's deterministic tie-break already uses). Deterministic: same script + same
 *     state → same `ruleIndex`. NEVER a hardcoded literal — always derived from the executor.
 *   - `{ kind: 'no_matching_rule' }` — the executor returned `NONE` (no rule's trigger matched this
 *     tick). There is no blocking rule, but equally no assault rule fired.
 *
 * R2.2 / P5: a closed-shape index/sentinel — NEVER a raw pressure float or heat scalar.
 * Replaces the C3 string literals `'blockWhenRivalSilent'` / `'blockWhenNoRivalState'` (DELETED).
 */
export type ScriptRuleRef = { ruleIndex: number } | { kind: 'no_matching_rule' };

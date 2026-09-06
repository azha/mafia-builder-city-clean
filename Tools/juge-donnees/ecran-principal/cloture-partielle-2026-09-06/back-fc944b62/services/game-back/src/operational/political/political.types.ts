// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C1 (12-event static catalogue)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md (12 events, §1.2
//             event template — event_id/name/category/duration/trigger_conditions/effects/counter_play_actions/
//             news_feed_copy) + glossary (:296-310, PoliticalEvent/EventEffect/CounterPlayAction/
//             TriggerConditionEvaluator canon terms).
//             Schema reuse: db/schema/effect_modifier.ts (political_event_category/effect_scope/
//             effect_modifier_op pgEnums, A1 mig 0106 — never re-declared by hand, narrowed exactly like
//             effect-engine.types.ts's own EffectScopeEnumVal/EffectModifierOpEnumVal pattern).
//             — 04e-A2 C1 — 2026-07-05
//
// Types for the 12-event static `PoliticalEvent` catalogue (`political-event-catalogue.ts`). Pure data shapes —
// no logic here. The catalogue itself is hard-coded config (design §3: "no DB-side PoliticalEvent table — A2 owns
// the static TS config"); the REAL trigger evaluators / activate-effects wiring land at C2-C6, consuming this
// shape.
//
// R2.3 (registry-first): `EventEffect.magnitudeGetter` and `PoliticalEvent.durationDaysGetter` are always a
// reference to an ALREADY-REGISTERED getter (`politicalEventsTunables.*` from A1-C1, or the NEW A2 getters in
// `political.tunables.ts`) — NEVER an inline numeric literal. The one narrow exception is a genuine structural
// constant (not a balance magnitude) — see `political-event-catalogue.ts`'s E-POL-07 entry doc comment.

import type { effectScope, effectModifierOp, politicalEventCategory } from '../../db/schema/effect_modifier';
import type { PoliticalTemplateId } from './political-template-id';

/** The `effect_scope` pgEnum member set, narrowed from the schema (never re-declared by hand). */
export type PoliticalEffectScope = (typeof effectScope.enumValues)[number];

/** The `effect_modifier_op` pgEnum member set, narrowed from the schema (never re-declared by hand). */
export type PoliticalEffectOp = (typeof effectModifierOp.enumValues)[number];

/** The `political_event_category` pgEnum member set, narrowed from the schema (never re-declared by hand). */
export type PoliticalEventCategoryVal = (typeof politicalEventCategory.enumValues)[number];

/**
 * One effect a `PoliticalEvent` applies when active — the `EventEffect` canon composite
 * (catalogue.md glossary :305, "Parameter shift + duration"). Mirrors `EffectModifierInput`'s writable shape
 * (`effect-engine.types.ts`) MINUS the per-activation fields (`appliedAtGameDay`/`expiresAtGameDay`/`scopeRef`),
 * which the C4/C5 lifecycle service supplies at activation time (a district id / player id for a DISTRICT/PLAYER
 * scope, the current game day) — the static catalogue only knows the tunable/op/magnitude-getter/scope-AXIS, not
 * a concrete scope_ref or a concrete game day.
 *
 * `magnitudeGetter` is ALWAYS a reference to a registered tunable getter (R2.3) — the compose operand
 * (ADD delta / MULTIPLY factor / SET target value), never an inline number. Returns `number | string` to match
 * `EffectModifierInput.magnitude` (Drizzle `numeric()` string-mode compat).
 */
export interface EventEffect {
  /** The overlay-registered tunable key this effect targets (one of the 9 A1 lever keys, the 4 substrate BASE
   *  keys, or a `political_events.*` key — REUSE or NEW-this-chunk, never fabricated). */
  readonly tunableKey: string;
  /** ADD | MULTIPLY | SET (effect_modifier_op, EffectOverlayStore's fixed compose order). */
  readonly op: PoliticalEffectOp;
  /** The compose operand getter — ALWAYS a registered tunable, never an inline literal (R2.3). */
  readonly magnitudeGetter: () => number | string;
  /** GLOBAL | DISTRICT | PLAYER | COHORT (effect_scope) — GLOBAL for most events; DISTRICT for E-POL-05/08/12. */
  readonly scope: PoliticalEffectScope;
}

/**
 * One player-facing mitigation available while a `PoliticalEvent` is active — the `CounterPlayAction` canon
 * composite (catalogue.md glossary :307, "Player mitigation action available during event"). `costGetter` is
 * present only when canon ties the action to a live registered cost lever (e.g. E-POL-01's Fixer bribe IA-risk
 * cost is descriptive-only in canon — no live cost lever cited — so it stays `undefined`; E-POL-10's
 * `counter_play_politician_cost` DOES have a registered getter, honest-scaffolding, decisions §4.4).
 */
export interface CounterPlayAction {
  readonly name: string;
  readonly description: string;
  readonly costGetter?: () => number;
}

/**
 * The `TriggerConditionEvaluator` discriminator (canon glossary :309) this event's REAL predicate (built at
 * C2/C3, `political-trigger-evaluators.ts`) will dispatch on. C1 only records WHAT the trigger condition is
 * (descriptive + a stable `kind` tag); the runnable predicate function itself is out of C1's scope.
 */
export type PoliticalTriggerKind =
  | 'CALENDAR_ELECTORAL'                    // E-POL-01 — fixed schedule, electoral_cycle_in_game_months.
  | 'CALENDAR_BUDGET_INCREASE'               // E-POL-02 — fixed schedule, budget_cycle_in_game_months.
  | 'CALENDAR_BUDGET_CUT'                    // E-POL-03 — same cycle, opposite phase of the increase.
  | 'RANDOM_WEIGHTED_NOISE'                  // E-POL-04 — random, weighted by scandal_random_weight_per_event_noise.
  | 'RIVAL_REGIME_TERRITORY_GAIN'            // E-POL-05 — rival regime BLEEDING/RETRENCH + player territory gain.
  | 'RANDOM_OR_AFTER_SCANDAL'                // E-POL-06 — random OR after the scandal-category event fires.
  | 'STACK_UTILIZATION_SUSTAINED'            // E-POL-07 — Stack district utilization > threshold, sustained window.
  | 'RANDOM_SEEDED'                          // E-POL-08 — seeded-random only (L5; port-seizure coupling = TD-154).
  | 'SCANDAL_NOISE_ACCUMULATOR'              // E-POL-09 — accumulated city-event noise ≥ threshold.
  | 'OPPOSITION_VICTORY_ROLL'                // E-POL-10 — end of the electoral-category event, seeded heat-weighted roll.
  | 'FEDERAL_BPD_AGGREGATE_AND_ELIMINATIONS' // E-POL-11 — BPD memory aggregate bucket + 2+ rival eliminations/6mo.
  | 'DISTRICT_SUSTAINED_GOOD_BEHAVIOR';      // E-POL-12 — per-district cohesion floor + heat ceiling, sustained window.

/**
 * Descriptive trigger-conditions reference (catalogue.md §1.2 `trigger_conditions`). The `kind` is the stable
 * discriminator C2/C3's real evaluators dispatch on; `description` mirrors canon prose (verbatim where the
 * catalogue gives it) for BO/diagnostic readability. NOT a runnable predicate — C1 scope is the static catalogue
 * only (plan: "do not wire C2's calendar tick, do not wire C4/C5's firing logic").
 */
export interface PoliticalEventTrigger {
  readonly kind: PoliticalTriggerKind;
  readonly description: string;
}

/**
 * One static `PoliticalEvent` catalogue entry — the canon `PoliticalEvent` composite (catalogue.md glossary
 * :302, "Static config per E-POL-XX entry"). Hard-coded, no DB table (design §3). `eventId` is the SAME soft-ref
 * string `political_event_active.event_id` stores at activation (A1 mig 0106).
 */
export interface PoliticalEvent {
  /** Soft-ref id, e.g. 'E-POL-01' — matches `political_event_active.event_id` (A1, text soft-ref, no DB FK). */
  readonly eventId: string;
  /** Player-facing name (catalogue.md §1.2 `name`). */
  readonly name: string;
  /** One of the 6 canonical categories (political_event_category enum, catalogue.md:26 invariant #1). */
  readonly category: PoliticalEventCategoryVal;
  /** Anti-pattern-2 binding — the 04g structural template this event re-skins (political_templates.md:154-160). */
  readonly templateId: PoliticalTemplateId;
  /** Duration getter (in-game days). `null` = PERMANENT (E-POL-04/07/10/12 — `expires_at_game_day` stays NULL at
   *  activation, design §3; E-POL-10/12 revert only at the next election, E-POL-04/07 revert only via explicit
   *  BO abort — the C6 lifecycle distinction, out of C1 scope). */
  readonly durationDaysGetter: (() => number) | null;
  /** Trigger-conditions reference (descriptive — the real evaluator lands at C2/C3). */
  readonly trigger: PoliticalEventTrigger;
  /** The modifiers this event applies while active — REAL registered tunable keys only (no fabricated key). */
  readonly effects: readonly EventEffect[];
  /** Player mitigation actions available during the event (catalogue.md §1.2 `counter_play_actions`). */
  readonly counterPlayActions: readonly CounterPlayAction[];
  /** In-fiction news feed copy. Real canon text for E-POL-01; `[PROV-Y26Q2]` "Content pending" placeholder for
   *  E-POL-02..12 (catalogue.md invariant #7, TD-153 — a content-authoring pass, out of engineering scope). */
  readonly newsFeedCopy: string;
}

// IMPLEMENTS: docs/superpowers/specs/2026-08-25-lot0-conventions-design.md v26, D4 (Lot 0 §1 — `method` on
//             BOTH hierarchies, `METHOD_BY_ACTION_ID` a CLOSED table, `lay_low` citadin pinned, `registry.
//             require`'s 422 auto-documented) + §3 "C2 — L0.2" (53 sites stamp `method` FROM the table, never
//             a per-site literal; `projectCard` back-fills a legacy row from the SAME table).
//             — Lot 0 C2 — 2026-08-27, remediated per r1-C2 review (2026-08-27-lot0-C2-review-r1.md)

import type { EffectType } from './exceptions.projection.service';

/**
 * `METHOD_BY_ACTION_ID` — the CLOSED map every action id resolves to as an `EffectType`. ONE authored source:
 * every producer site stamps `method: METHOD_BY_ACTION_ID.<id>` (a property access, never a re-typed literal);
 * `withMethod` below re-derives it BY ID for any persisted row, fresh or pre-lot (the SAME lookup, one path —
 * D4's own "même chemin legacy/frais").
 *
 * Grouped by the EffectType it maps to, each entry citing the site(s) that FIX it:
 *   - ONE_TIME/ESCALATE ids either carry `effect: { type: 'ONE_TIME' | 'ESCALATE' }` explicitly (verified sites
 *     below) or are the byte-identical Phase-14 branch with no `effect` at all (OneTimeHandler/EscalateHandler
 *     never call `requireEffect` — ANY chosenAction resolves).
 *   - ADD_RULE ids are exactly the candidates whose `add_rule_dsl` is non-null (the ONLY handler that reads it;
 *     `logistics-binding.ts:529-530`'s own comment on `dispatch_high` names the inverse case verbatim: "ONE_TIME
 *     — the player triggers dispatch once manually ... without creating a standing rule").
 *   - The 6 raid/maintenance effect ids each carry `effect: { type: X, target_building_id }` at their one real
 *     producer site — `requireEffect` enforces the match.
 *
 * [Historical note, C2 r1 remediation — closes r1-C2/BLOCKING-1] The design's OWN count is now (v26) **53
 * sites / 20 files / 22 ids**. An earlier design draft's M8 sweep (§0.1) pinned 21 ids / 52 sites via a
 * python regex over literal `id: '...'` strings, blind to `cue-cascade-exception-producer.service.ts:66`'s
 * `id: ACKNOWLEDGE_RECOVER_ACTION_ID` (a named module constant, declared `:44` as `'acknowledge_recover'`) —
 * the SAME "indirection blind spot" class this project's own socle catalogues repeatedly (a form matched only
 * when spelled out verbatim). v26 ratified the corrected count; the derivation is no longer a one-off manual
 * re-measurement but a COMMITTED, self-checking instrument (`tests/e2e/conventions/_action-site-sweep.py`,
 * pinned by `instruments_pins.spec.ts`) that resolves all 3 id forms (literal / same-file const / imported
 * const) and re-derives 53/20/22 on every run, with two negative controls (a broken sentinel, a broken
 * const-resolution) proving it actually checks what it claims. This is NOT a new architectural call: the site
 * already carries `effect: { type: 'ONE_TIME' }` (:71), the SAME explicit tag 13 other ONE_TIME-mapped ids
 * carry, so the mapping is the SAME rule applied to a 22nd row, not a new one. The
 * table below therefore has 22 entries, and `acknowledge_recover` is marked as such everywhere it is pinned
 * (unit test, structural garde, moteur spec) — never silently folded into the "21".
 *
 * ★ Every `fichier:ligne` cited below is a SYMBOL-anchored fact re-verified on THIS commit's tree, not carried
 * forward from an earlier draft (this file itself was edited 20+ times while producer sites were stamped —
 * each edit could shift the SAME lines these comments cite, exactly the "ancre que ses propres éditions
 * cassent" class this project's own socle names). Re-check with `grep -n "id: '<id>'" <file>` before trusting
 * a number here across a future edit of any cited file.
 */
export const METHOD_BY_ACTION_ID = {
  // ── ONE_TIME — "acknowledge and do nothing" dispositions (add_rule_dsl: null, no teachable rule) ──
  acknowledge: 'ONE_TIME', // 14 sites across every citywide/lieutenant/raid producer's generic ack.
  acknowledge_and_trace: 'ONE_TIME', // backpressure-exception-producer.service.ts:91, effect stamped :96.
  acknowledge_recover: 'ONE_TIME', // cue-cascade-exception-producer.service.ts:66 (const), effect stamped :71 — 22nd id, see Deviation above.
  keep: 'ONE_TIME', // cook-binding.ts:246 — the "ignore the heat" alternative to `pause`.
  wait: 'ONE_TIME', // muscle-binding.ts:289, intelligence-binding.ts:257.
  dispatch_high: 'ONE_TIME', // logistics-binding.ts:532 — its own comment (:529-530) names ONE_TIME verbatim.
  // ── ESCALATE — archive for review (byte-identical to the Phase-14 ESCALATE branch) ──
  escalate: 'ESCALATE', // 14 sites.
  // ── ADD_RULE — every site below has a non-null add_rule_dsl (the ONLY thing AddRuleHandler reads) ──
  add_rule: 'ADD_RULE', // raid-exception-producer.service.ts:96, effect stamped :100.
  pause: 'ADD_RULE', // cook-binding.ts:239.
  pause_hard: 'ADD_RULE', // cook-binding.ts:257.
  block_when_silent: 'ADD_RULE', // muscle-binding.ts:297.
  observe_anyway: 'ADD_RULE', // intelligence-binding.ts:265.
  collect: 'ADD_RULE', // distribution-binding.ts:368.
  collect_high: 'ADD_RULE', // distribution-binding.ts:394.
  dispatch: 'ADD_RULE', // logistics-binding.ts:504.
  // ── Raid-response effects (Phase-16) — each carries effect:{type:X, target_building_id} at its producer ──
  repair: 'REPAIR', // raid-exception-producer.service.ts:72.
  bribe: 'BRIBE', // raid-exception-producer.service.ts:80.
  lay_low: 'LAY_LOW', // raid-exception-producer.service.ts:88 (carries effect) AND heat-pressure-exception-
  // producer.service.ts:84 (the CITADIN lay_low — NO effect field: D4's own named exception; resolving it
  // 422s via requireEffect, pinned not fixed — TD S6, §7 of this file's design).
  // ── 04f-A equipment-failure repair options — each carries effect:{type:X, target_building_id} ──
  repair_immediate: 'REPAIR_IMMEDIATE', // equipment-failure-card.service.ts:35.
  repair_slow: 'REPAIR_SLOW', // equipment-failure-card.service.ts:43.
  defer: 'DEFER_REPAIR', // equipment-failure-card.service.ts:51.
  demolish_replace: 'DEMOLISH_REPLACE', // equipment-failure-card.service.ts:59.
} as const satisfies Record<string, EffectType>;

/** The table's own key set — the population every unit/structural garde pins against (22, not 21 — see the
 *  Deviation above). Derived, never re-typed. */
export const KNOWN_ACTION_IDS: readonly string[] = Object.keys(METHOD_BY_ACTION_ID);

/**
 * Legacy/defensive lookup for an ARBITRARY id (unlike a producer's own `METHOD_BY_ACTION_ID.<literal>` access,
 * which is exhaustively checked at compile time). Used ONLY by `projectCard`'s read-path back-fill: a row
 * persisted before this lot carries no `method` at all, and a corrupted/unrecognized id must never 500 a GET.
 * Falls back to `'ONE_TIME'` (the most generic, side-effect-free disposition) — mirrors the existing
 * `game.i18n.legacy.text` fallback discipline (D2) and `scriptComplexityBandForLieutenant`'s own "a missing/
 * malformed row defends to the harmless default, never blocks a read" convention. `registry.require`
 * (`ExceptionEffectRegistry`, called from `ExceptionsService.resolve`) stays the SEPARATE, THROWING gate for a
 * client-submitted method on the WRITE path — this helper never throws.
 */
export function methodForActionId(id: string): EffectType {
  return (METHOD_BY_ACTION_ID as Record<string, EffectType>)[id] ?? 'ONE_TIME';
}

/**
 * Back-fill `method` on a persisted candidate action — the SAME single path for a legacy row (no `method` key
 * in its jsonb at all) and a fresh row (already stamped by its producer via the SAME table): re-derive from
 * `METHOD_BY_ACTION_ID` by `id`, preferring an already-present value (D4's "même chemin legacy/frais" — one
 * expression handles both, it does not special-case "if legacy"). `T` is left generic so both `CandidateActionView`
 * (exceptions.projection.service.ts) and `SalientCandidateAction` (archetype-binding.ts, the SAME jsonb shape by
 * a DIFFERENT, deliberately decoupled name) share this one implementation.
 */
export function withMethod<T extends { id: string; method?: EffectType }>(action: T): T & { method: EffectType } {
  return { ...action, method: action.method ?? methodForActionId(action.id) };
}

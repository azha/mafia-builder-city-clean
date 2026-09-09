// IMPLEMENTS: docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md §3.1 (the order is a single DSL
//             rule injected at a RESERVED priority — `orderRule(order)` re-stamps it) + §4 (`signatureFor(rule)` pur,
//             déterministe — la clé stable du compteur de lapse, stable à travers les ré-émissions) + §5 Invariants
//             (Déterminisme Inv 9 : `signatureFor` pur ; Ordre d'injection : la règle à STANDING_ORDER_PRIORITY >
//             priority_max gagne déterministe, tie-break index — calque l'executor existant)
//             -- Phase-25 L3 (Standing Order Expiry) Task 2 (pure standing-order rule helpers) --
//
// Pure standing-order rule helpers (PURE: no DB / I/O / RNG / Date.now / Math.random). Two functions:
//   - signatureFor(rule): the deterministic stable signature of a compiled IR rule's NORMALIZED shape (trigger + action +
//     priority + condition). A sha256 over the JSON of those four fields — `createHash` is a DETERMINISTIC hash, NOT RNG
//     (the SAME rule always yields the SAME signature). It is the stable key the lapse-pattern counter + the
//     promotion-suggestion track on (stable across re-emissions of the SAME order rule — T3/T4). We hash the four IR
//     fields the executor evaluates (NOT the source `index`, which the injection overwrites to -1), so two orders with the
//     SAME trigger/action/priority/condition share a signature regardless of where they sat in any script.
//   - orderRule(rule): the injection re-stamp — a COPY of the compiled rule with `priority` set to the RESERVED
//     STANDING_ORDER_PRIORITY and `index` set to -1. BOTH matter:
//       · the reserved priority (1000, > T.dsl.priority_max=100) outranks every normal `@priority` a player-authored rule
//         can carry (the compiler 422s @priority > priority_max), so the order rule WINS the executor's priority resolution
//         when its trigger matches;
//       · index = -1 makes the injected rule WIN the executor's tie-break (lowest index wins) EVEN IF an operator
//         override-maxed `priority_max` to 1000 so a script rule could also reach 1000 — the injected rule then ties on
//         priority but its index (-1) is strictly below any source rule's 0-based index, so it never ties-and-loses.
//     A COPY (never a mutation of the persisted `rule`) — the persisted order rule jsonb stays authored-priority; only the
//     runtime injection carries the reserved stamp (the override is a runtime injection, not a script edit — §5 Invariant).

import { createHash } from 'node:crypto';

import type { IrRule } from '../../../dsl/ir';
import { lieutenantTunables } from '../lieutenant-tunables';

/**
 * The deterministic, stable signature of a compiled IR rule (16 hex chars of a sha256 over the rule's NORMALIZED IR:
 * trigger + action + priority + condition (absent ⇒ null)). PURE — `node:crypto` `createHash` is a deterministic hash
 * (NOT RNG): the SAME rule always yields the SAME signature, and two distinct-but-equivalent rules (same trigger/action/
 * priority/condition) collide deliberately (that is the point — the lapse counter keys on the rule's behaviour, not its
 * position). `index` is EXCLUDED (the injection overwrites it to -1; a signature must be stable across re-emissions).
 */
export function signatureFor(rule: IrRule): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        trigger: rule.trigger,
        action: rule.action,
        priority: rule.priority,
        condition: rule.condition ?? null,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

/**
 * The injection re-stamp: a COPY of the compiled order rule with `priority = STANDING_ORDER_PRIORITY` (the reserved
 * injection priority, > T.dsl.priority_max) AND `index = -1`. Both are load-bearing (see file header): the reserved
 * priority outranks every authored `@priority`, and index=-1 wins the lowest-index tie-break even if an operator
 * override-maxed priority_max so a script rule could also reach the reserved value. A COPY — the persisted `rule` jsonb is
 * NEVER mutated (the override is a runtime injection). DETERMINISTIC (a pure function of the rule + the tunable).
 */
export function orderRule(rule: IrRule): IrRule {
  return {
    ...rule,
    priority: lieutenantTunables.standingOrderExpiry.standingOrderPriority,
    index: -1,
  };
}

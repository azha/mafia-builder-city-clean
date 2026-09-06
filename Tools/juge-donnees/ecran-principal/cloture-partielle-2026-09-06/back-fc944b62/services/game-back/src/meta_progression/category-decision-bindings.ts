// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C4 ("Per-category
//             decision-log extractors (audit rows + resolved cards — R3/R6 field mapping)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §6 (the
//             per-category "Decision-log extractors" column) + D5 ("Per-category decision-log extractors
//             read ONLY persisted decision records: structural_decisions_audit rows... + resolved
//             exception_queue rows... mapped to the category by the same closed registry (§7)").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §6 R6 (the jsonb
//             `candidate_actions[].source` tag is the ONLY producer/category-identifying field on
//             `exception_queue` — no first-class column) + §7 (the 4 per-category binding tables, REAL
//             symbols — `structural_decisions_audit` codes + resolved-card source tags this file copies
//             verbatim from).
//             — P3-F C4 — 2026-07-19
//
// `CATEGORY_DECISION_BINDINGS` — the closed registry mapping each `TaskCategoryKey` to the REAL
// `structural_decisions_audit.decision_type` codes and `exception_queue` `candidate_actions[].source`
// tags that count as a decision-log entry FOR THAT CATEGORY. Deliberately a SEPARATE structured table
// from `task-category-catalogue.ts`'s own `decisionExtractors` field — C2's header comment names that
// field "DOCUMENTARY string pointers this chunk does not yet wire (C4/C6's own job respectively)"; this
// file is C4's real wiring, cross-checked against the SAME C0 §7 evidence those doc strings paraphrase
// (never re-derived from the free text — every code/tag below is copied from a REAL, re-verified symbol).
//
// Every `TaskCategoryKey` (all 12 — 4 LIVE + 8 RESERVED) has an entry, mirroring every OTHER closed
// registry in this lot (`TASK_CATEGORY_CATALOGUE`, `MASTERY_EVENT_MAPPER_REGISTRY`): a RESERVED category
// carries EMPTY bindings (never a fig-leaf placeholder) — `CategoryDecisionLogRepository` never queries
// for one (C5 only ever seeds a graduation for a `live:true` category, itself re-validated server-side),
// but declaring it here keeps the `Record<TaskCategoryKey, …>` type exhaustive (a future 13th key would
// fail to compile until wired, the same closed-world discipline every sibling registry in this module
// enforces).

import { TaskCategoryKey } from './task-category-catalogue';
import { StructuralDecisionType, catalogueEntryFor } from '../progression/loop10/structural-decision-catalogue';

/** One category's decision-log source set. `structuralDecisionTypes` are `structural_decisions_audit.
 *  decision_type` int codes (resolved via `catalogueEntryFor` — never a bare magic number, the P3-A
 *  catalogue's own codes are the single source of truth). `resolvedExceptionSourceTags` are the jsonb
 *  `candidate_actions[].source` tags (verbatim string constants each producer exports — R6). */
export interface CategoryDecisionBinding {
  readonly structuralDecisionTypes: readonly number[];
  readonly resolvedExceptionSourceTags: readonly string[];
}

const EMPTY_BINDING: CategoryDecisionBinding = { structuralDecisionTypes: [], resolvedExceptionSourceTags: [] };

export const CATEGORY_DECISION_BINDINGS: Readonly<Record<TaskCategoryKey, CategoryDecisionBinding>> = {
  // ── 4 LIVE — C0-reanchor §7 per-category binding tables, "Decision-log extractors" rows ────────────
  [TaskCategoryKey.ROUTE_ASSIGNMENT]: {
    // audit rows: route structural types incl. LIVE SINUOSITY_FULL_RESET(9) (C0 §7 ROUTE_ASSIGNMENT row).
    structuralDecisionTypes: [catalogueEntryFor(StructuralDecisionType.SINUOSITY_FULL_RESET).code],
    // resolved route-category exception cards — `ROUTE_COLLAPSE_SOURCE` (`route-collapse-exception-
    // producer.service.ts:34`), the ONLY producer that stamps a route-provenance source tag on this base
    // (C0 §5.1: no route-severed BUS event exists; ROUTE_COLLAPSE stays UNBOUND to mastery v1 per that
    // finding, but it is still a REAL, resolvable route-management decision — fair game for the seed
    // pipeline, which teaches "how the player handles this category," not just "what accrues mastery").
    resolvedExceptionSourceTags: ['ROUTE_COLLAPSE'],
  },
  [TaskCategoryKey.LIEUTENANT_HIRING]: {
    // audit rows: LIEUTENANT_RECRUIT(3) + LIEUTENANT_ROLE_REASSIGN(4) (C0 §7 LIEUTENANT_HIRING row).
    structuralDecisionTypes: [
      catalogueEntryFor(StructuralDecisionType.LIEUTENANT_RECRUIT).code,
      catalogueEntryFor(StructuralDecisionType.LIEUTENANT_ROLE_REASSIGN).code,
    ],
    // No resolved-exception source — hiring has no exception-card surface (C0 §7: "audit rows" ONLY).
    resolvedExceptionSourceTags: [],
  },
  [TaskCategoryKey.SUPPLY_SOURCING]: {
    // audit rows: MYCELIAL_STRUCTURAL_REINFORCE(10) (C0 §7 SUPPLY_SOURCING row).
    structuralDecisionTypes: [catalogueEntryFor(StructuralDecisionType.MYCELIAL_STRUCTURAL_REINFORCE).code],
    // resolved supply-category exception cards — `BACKPRESSURE_CRITICAL_SOURCE` (`backpressure-exception-
    // producer.service.ts:76`) + `MYCELIAL_PERSISTENT_STRESS_SOURCE` (`mycelial-stress-exception-producer.
    // service.ts:31`), both verified real string constants this session.
    resolvedExceptionSourceTags: ['BACKPRESSURE_CRITICAL', 'MYCELIAL_PERSISTENT_STRESS'],
  },
  [TaskCategoryKey.HEAT_MANAGEMENT]: {
    // No structural audit binding — HEAT_MANAGEMENT's ONLY decision surface is the resolved exception
    // card (C0 §7 HEAT_MANAGEMENT row; §5.4: no dedicated hard-mutation endpoint exists for this category).
    structuralDecisionTypes: [],
    // `HEAT_PRESSURE_SOURCE` (`heat-pressure-exception-producer.service.ts:27`) — the SAME tag the C2
    // resolve-hook (R6) already keys mastery accrual on; the seed pipeline reads the SAME resolved rows.
    resolvedExceptionSourceTags: ['HEAT_PRESSURE'],
  },

  // ── 3 RESERVED source domains — no player-verb surface, no decision log (design §6) ─────────────────
  [TaskCategoryKey.LEK_CONTEST]: EMPTY_BINDING,
  [TaskCategoryKey.CASH_LAUNDERING]: EMPTY_BINDING,
  [TaskCategoryKey.NODE_RETOOLING]: EMPTY_BINDING,

  // ── 5 RESERVED successor domains — no runtime yet (design §15) ───────────────────────────────────────
  [TaskCategoryKey.ROUTE_NETWORK_TOPOLOGY]: EMPTY_BINDING,
  [TaskCategoryKey.DELEGATION_ARCHITECTURE]: EMPTY_BINDING,
  [TaskCategoryKey.LEK_NETWORK_DESIGN]: EMPTY_BINDING,
  [TaskCategoryKey.SUPPLY_WEB_DESIGN]: EMPTY_BINDING,
  [TaskCategoryKey.HEAT_POSTURE_DOCTRINE]: EMPTY_BINDING,
};

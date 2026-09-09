// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C8 ("projections joueur
//             finales : ... PrerequisiteSatisfactionBucket + DependencyConflictBucket").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §6.1 ("Les prérequis
//             sont SOFT ... le serveur avertit via DependencyConflictBucket au compose/reorder") + §15.1
//             ("PrerequisiteSatisfactionBucket (satisfied|at_risk|violated — dérivé de l'ordre courant),
//             DependencyConflictBucket (screen_8 REUSE)").
//             Canon: docs/tech/08_ui_screens/screen_8_cue_stack.md §Glossary — `PrerequisiteSatisfaction
//             Bucket` (struct REUSE `05/cue_stack_integrity.md l.51`, values NEW-in-chunk `SATISFIED |
//             PENDING | UNSATISFIED`) + `DependencyConflictBucket` (NEW-in-chunk `NONE | WARN | BLOCKING`)
//             — the EXACT ratified UPPERCASE member spellings (`gdd/15_glossary.md`, ch15 NORMALIZE).
//             — P3-D C8 — 2026-07-15
//
// `deriveDependencyBuckets` — the PURE (no DB) per-slot classification against its OWN stack's OTHER
// slots (design §6.1: "unsatisfied = slot.dependencies − {slots status done}", evaluated here at PROJECTION
// time against the CURRENT persisted state — the SAME predicate C3's tick evaluates AT FIRING, §6.1's own
// "jamais au compose" carve-out is about WHEN the collision is ENFORCED, not about whether the player may
// see a WARNING earlier — design: "le serveur avertit via DependencyConflictBucket au compose/reorder").
//
// ★ SURFACED JUDGMENT CALL (non-blocking): screen_8's own prose gives descriptive labels for each bucket
// member (`NONE`="aucun conflit détecté", `WARN`="conflit potentiel si un slot upstream est encore actif",
// `BLOCKING`="dépendances critiques non satisfaites → cascade certaine" / `SATISFIED`="toutes complétées
// dans l'ordre prévu", `PENDING`="non encore exécutées mais ordre correct", `UNSATISFIED`="absentes ou
// hors-ordre") but no formal algorithm. Realized here against THIS lot's REAL sequential-execution model
// (design §5.2 — strictly one slot executing at a time, in committed `drag_order`): a dependency is
// classified, per slot:
//   - `done`                                              → satisfied, contributes nothing to either bucket.
//   - a TERMINAL FAILURE status (`failed_collision`/`failed_disrupted`/`failed_executor`)
//                                                          → this dependency can NEVER become `done` — the
//                                                            depending slot is doomed to `failed_collision`
//                                                            at its own firing turn (DD-CASCADE-LAZY) → BLOCKING/UNSATISFIED.
//   - ordered AFTER the depending slot (`drag_order` greater) → a STRUCTURAL violation: sequential
//                                                            execution reaches the depending slot BEFORE
//                                                            this dependency ever gets its turn — certain
//                                                            failure by construction → BLOCKING/UNSATISFIED
//                                                            ("hors-ordre").
//   - anything else (still `pending`/`executing`, but correctly ordered BEFORE) → not yet resolved, but
//                                                            genuinely "potential" (sequential execution
//                                                            WILL reach it before the depending slot's own
//                                                            turn — but whether it lands `done` or a
//                                                            failure status is not yet known) → WARN/PENDING.
// A slot with ZERO dependencies is vacuously `SATISFIED`/`NONE` (design: "toutes dépendances complétées" —
// the empty set is trivially all-complete). The two buckets share ONE underlying classification (never two
// independently-computed passes over the SAME dependency list, DRY).
import type { CueStackSlotStatus } from './slot-type-executor.interface';

export type PrerequisiteSatisfactionBucket = 'SATISFIED' | 'PENDING' | 'UNSATISFIED';
export type DependencyConflictBucket = 'NONE' | 'WARN' | 'BLOCKING';

export interface SlotDependencyBuckets {
  readonly prerequisiteSatisfactionBucket: PrerequisiteSatisfactionBucket;
  readonly dependencyConflictBucket: DependencyConflictBucket;
}

/** The 3 statuses a dependency can NEVER recover from (`CueStackSlotStatus`'s own closed domain) — once a
 *  slot lands here it will NEVER transition to `done` (D4/DD-CASCADE-LAZY). */
const TERMINAL_FAILURE_STATUSES: ReadonlySet<CueStackSlotStatus> = new Set([
  'failed_collision',
  'failed_disrupted',
  'failed_executor',
]);

/** Minimal shape this function needs from EACH slot in the stack — the depending slot itself AND every
 *  entry in its `dependencies` array is looked up against this SAME shape (a `Map<slot_id, ...>` the
 *  caller builds once per stack, never re-queried per-dependency). */
export interface DependencyLookupEntry {
  readonly status: CueStackSlotStatus;
  readonly drag_order: number;
}

export function deriveDependencyBuckets(
  slot: { readonly dependencies: readonly string[]; readonly drag_order: number },
  slotsById: ReadonlyMap<string, DependencyLookupEntry>,
): SlotDependencyBuckets {
  if (slot.dependencies.length === 0) {
    return { prerequisiteSatisfactionBucket: 'SATISFIED', dependencyConflictBucket: 'NONE' };
  }

  let allDone = true;
  let anyCertainFailure = false; // terminal-failure OR structurally out-of-order dependency
  let anyUnresolvedOrdered = false; // still pending/executing, correctly ordered before

  for (const depId of slot.dependencies) {
    const dep = slotsById.get(depId);
    if (!dep || dep.status === 'done') {
      if (dep) continue; // done — contributes nothing.
      // Defensive — should be unreachable (compose validates every dependency references a slot_id WITHIN
      // this same stack, `cue-stack.service.ts#validateAndNormalizeSlots`). Treated as the worst case
      // (never silently "satisfied").
      allDone = false;
      anyCertainFailure = true;
      continue;
    }
    allDone = false;
    if (TERMINAL_FAILURE_STATUSES.has(dep.status) || dep.drag_order > slot.drag_order) {
      anyCertainFailure = true;
    } else {
      anyUnresolvedOrdered = true;
    }
  }

  if (allDone) {
    return { prerequisiteSatisfactionBucket: 'SATISFIED', dependencyConflictBucket: 'NONE' };
  }
  if (anyCertainFailure) {
    return { prerequisiteSatisfactionBucket: 'UNSATISFIED', dependencyConflictBucket: 'BLOCKING' };
  }
  // allDone===false, anyCertainFailure===false → anyUnresolvedOrdered MUST be true (every dependency was
  // classified into exactly one of the 3 branches above).
  void anyUnresolvedOrdered;
  return { prerequisiteSatisfactionBucket: 'PENDING', dependencyConflictBucket: 'WARN' };
}

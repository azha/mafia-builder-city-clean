// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (scorer: product
//             impact×urgency, STABLE tie-break)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("scoring
//             `score = impact_internal × urgency_internal`... stable tie-break (type code, then
//             target_ref lexical)").
//             Decisions: §1.11 D11 ("deterministic scoring... the E2E can precompute the expected top
//             card from seeded state") + §1.13 D13 (no rng, stable tie-break).
//             — P3-A C6 — 2026-07-10
//
// `hl-card-scorer.ts` — a PURE module (zero DB/NestJS dependency, D13): the production scoring +
// ranking function `hl_card.spec.ts` DIRECT-IMPORTS to precompute the expected winner from a seeded
// candidate list (the anti-fig-leaf "raid-bribe precompute pattern applied to ranking", decisions
// §1.11). No `Math.random`, no clock read — a pure function of its `candidates` argument only.

import type { HlCardCandidate } from './hl-card-types';

/** `score = impact × urgency` (design §8 — the product form, both factors already [0,1]). */
export function scoreHlCandidate(candidate: HlCardCandidate): number {
  return candidate.impact * candidate.urgency;
}

/**
 * Deterministic full ranking (descending): primary key = score DESC; ties broken by
 * `decisionTypeCode` ASC, then by `JSON.stringify(targetRef)` lexical ASC (design §8's own tie-break
 * order: "type code, then target_ref lexical"). Never mutates the input array.
 */
export function rankHlCandidates(candidates: readonly HlCardCandidate[]): HlCardCandidate[] {
  return [...candidates].sort((a, b) => {
    const scoreDelta = scoreHlCandidate(b) - scoreHlCandidate(a);
    if (scoreDelta !== 0) return scoreDelta;
    if (a.decisionTypeCode !== b.decisionTypeCode) return a.decisionTypeCode - b.decisionTypeCode;
    const aRef = JSON.stringify(a.targetRef);
    const bRef = JSON.stringify(b.targetRef);
    if (aRef === bRef) return 0;
    return aRef < bRef ? -1 : 1;
  });
}

/** The single top-scored candidate (design §8 "top-1 persisted"), or `null` for an empty list
 *  (design's honest empty-state: "No structural decision required this session"). */
export function pickTopHlCandidate(candidates: readonly HlCardCandidate[]): HlCardCandidate | null {
  const ranked = rankHlCandidates(candidates);
  return ranked[0] ?? null;
}

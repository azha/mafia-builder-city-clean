// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C9 ("projections joueur ...
//             en BUCKETS uniquement ... DebtBucket")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §13 (murs R2.2/P5 —
//             the client sees `DebtBucket (fresh|accruing|stressed|fractured)`, NEVER raw `debt_load`).
//             Pattern: `backpressure-bucket.ts` (C5 — the PURE, no-DB, getter-backed bucket derivation
//             shape) + `mycelial-stress.ts#isStressed` (the SAME strict `>` threshold convention) +
//             `leg-maintenance.service.ts`'s own `NextStressedLegBucket` (`stressed|fractured` — a
//             DELIBERATELY narrower preview this chunk's OWN header names as "not the full DebtBucket
//             player-projection wall ... that 4-value enum + its leak-scan is C9's job, plan §C9").
//             — P3-C C9 — 2026-07-13
//
// `debtBucket` — the FULL 4-value player-projection wall for a leg's `debt_load` (design §13): `fresh`
// (never accrued, or fully decayed back to zero) | `accruing` (some debt, below the stress threshold) |
// `stressed` (over the stress threshold — the SAME cut `isStressed` already derives) | `fractured` (at
// the debt cap — the SAME cut `bucketForNextStressedLeg` already derives for its own narrower preview).
// REUSES the TWO existing getter-sourced thresholds (`mycelialStressThreshold`/`mycelialDebtCap`) rather
// than inventing a NEW tunable for the fresh/accruing split — `debt_load === 0` (or, defensively, `<= 0`
// — the CHECK `>= 0` already forbids negative, so `<= 0` is equivalent to `=== 0` in practice, `<=` is
// merely the defensive form) is the ONLY unambiguous "never touched, or decayed all the way back" reading
// with no new registered key. Falsifiable (plan §C9): `debt_load` 0.5 vs 0.7 (both strictly between 0 and
// the default 0.85 stress threshold) → BYTE-IDENTICAL `'accruing'` for both.

export type DebtBucket = 'fresh' | 'accruing' | 'stressed' | 'fractured';

/**
 * Map a raw `debt_load` ∈ [0, cap] to its qualitative `DebtBucket` (design §13). Boundaries are ALWAYS
 * getter-resolved by the caller (`coreLoopsTunables.mycelialStressThreshold`/`...DebtCap`) — never
 * inlined here (R2.3). `fractured` is checked BEFORE `stressed` (a leg AT the cap is fractured, not
 * merely stressed — mirrors `bucketForNextStressedLeg`'s own `>= debtCap` precedence).
 */
export function debtBucket(debtLoad: number, stressThreshold: number, debtCap: number): DebtBucket {
  if (debtLoad <= 0) return 'fresh';
  if (debtLoad >= debtCap) return 'fractured';
  if (debtLoad > stressThreshold) return 'stressed';
  return 'accruing';
}

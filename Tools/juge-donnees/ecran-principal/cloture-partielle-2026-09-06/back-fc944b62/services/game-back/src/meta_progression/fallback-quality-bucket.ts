// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("PromotionLockService
//             per §9 ... realization §10.3 — reset-to-0 divergence #20, fallback bucket from the REAL
//             signal ...").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §9.1 step 3
//             ("`FallbackQualityBucket` = canon `computeFallbackBucket` verbatim: MINIMAL if
//             double-recall-same-category (derived from `graduation_events`); DEGRADED if `recall_debt_
//             signal == HIGH` (REAL signal — D9); else LOW. `max_nested` branch inert v1 (no nesting —
//             §0)").
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md
//             divergence #12 (`max_nested_delegations` — no substrate v1, the branch stays honestly
//             absent, never a fake runtime key) + ⟲ §10.1/#28 ("scar / re-delegation count / ×3
//             escalation MUST derive from `graduation_events`/`promotion_locks` histories, NEVER from
//             `player_proficiency` counters").
//             Pattern: `mastery-bucket.ts`/`recall-debt-signal.ts` (small, parameterized, registry-free
//             pure derivations — the SAME "no DI, no DB" posture).
//             — P3-F C8 — 2026-07-19
//
// `computeFallbackBucket` — the canon `promotion_lock.md §computeFallbackBucket` composite, PURE: the
// caller resolves the two REAL inputs (double-recall history via `GraduationEventsRepository.
// hasRecallEvent`, the debt signal via `deriveRecallDebtSignal`) and passes them in — this function never
// touches the DB itself (mirrors `deriveRecallDebtSignal`'s own "threshold/cap passed in, never read
// here"). MINIMAL takes precedence over DEGRADED (design's own step-3 ordering, verbatim): a category
// already on its SECOND+ recall cycle falls back to the WORST bucket regardless of the current debt
// signal — the org has now demonstrably failed to manage this category twice. The `max_nested` branch
// canon also names is INERT v1 (no delegation-tree substrate exists — divergence #12): this function
// takes no nesting-depth parameter at all, rather than a fake always-false one.
import type { RecallDebtSignal } from './recall-debt-signal';

export type FallbackQualityBucket = 'LOW' | 'DEGRADED' | 'MINIMAL';

export function computeFallbackBucket(hasPriorRecallForCategory: boolean, debtSignal: RecallDebtSignal): FallbackQualityBucket {
  if (hasPriorRecallForCategory) return 'MINIMAL';
  if (debtSignal === 'HIGH') return 'DEGRADED';
  return 'LOW';
}

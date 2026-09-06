// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C7 ("signal derivation:
//             read-time thirds (D9) exposed on the BO read path — a TEST SURFACE suffices here (C10
//             formalizes the endpoint)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §10.2 ("Signal
//             derived at read: `< cap/3 → LOW`, `< 2cap/3 → MEDIUM`, else `HIGH` (canon fractions)") +
//             §10 D9 ("`recall_debt_signal` is derived in SQL/service at read time from `recall_debt_
//             total` vs the cap (1/3, 2/3 fractions — canon formula verbatim) — no cached key to
//             invalidate, hot-reload of `recall_debt_max` instantly re-bands").
//             Pattern (pure, registry-free derivation, NEVER stored): `mastery-bucket.ts`
//             (`deriveMasteryBucket`/`progressBandForMasteryBucket` — the SAME "small, parameterized, no
//             DI, no DB" posture, the SAME LOW/MEDIUM/HIGH vocabulary design §10.2 explicitly REUSES from
//             `ProgressBand`).
//             — P3-F C7 — 2026-07-19
//
// `deriveRecallDebtSignal` — the canon `recall_debt_signal` composite (`recall_debt.md §Composites`),
// derived AT READ TIME from `recall_debt_total` vs the LIVE `meta.recall_debt_max` getter — never a
// stored/cached column (D9, register §5 row 4: "hot-reload of `recall_debt_max` instantly re-bands,
// strictly better than the canon Redis-key design"). Real division (never `Math.floor`) against the
// EXACT cap value passed in: at the default cap (30, an exact multiple of 3) the thirds land on integer
// boundaries (10/20) by construction — the falsifiable "9→LOW, 10→MEDIUM, 20→HIGH" proof (plan C7) is a
// direct consequence of this formula, not a special-cased boundary table.

import type { ProgressBand } from './mastery-bucket';

/** The canon `RecallDebtSignal` enum (`recall_debt.md §Composites`) — REUSES the SAME LOW/MEDIUM/HIGH
 *  vocabulary `ProgressBand` already establishes (design §10.2's own note), kept as its own named type
 *  (a distinct composite in canon prose, even though the value domain is identical). */
export type RecallDebtSignal = ProgressBand;

/**
 * `debt < cap/3` → LOW; `debt < 2*cap/3` → MEDIUM; else → HIGH (design §10.2 verbatim — the canon 1/3,
 * 2/3 fractions). `cap` is always the LIVE `metaProgressionTunables.recallDebtMax` getter value at the
 * call site (never a re-derived/cached constant) — the caller's own responsibility (this function stays
 * pure, no tunables import, mirrors `deriveMasteryBucket`'s own "threshold passed in, never read here").
 */
export function deriveRecallDebtSignal(debt: number, cap: number): RecallDebtSignal {
  if (debt < cap / 3) return 'LOW';
  if (debt < (2 * cap) / 3) return 'MEDIUM';
  return 'HIGH';
}

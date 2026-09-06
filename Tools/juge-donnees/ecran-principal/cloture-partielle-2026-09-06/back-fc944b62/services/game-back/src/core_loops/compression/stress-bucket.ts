// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 ("session-open
//             keys + BO ... EVERY player-facing leaf is a qualitative bucket/enum/id/boolean — NEVER a
//             raw scalar (org_stress int, friction float, cents, ticks)")
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15
//             ("StressBucket = calm | mounting | crushing | compression_active (canon) ; mapping N-1 : 3
//             seuils dont trigger/force (calm < 50 ≤ mounting < 85 ≤ crushing ; compression_active ssi
//             state='active')").
//             Pattern: `friction-budget-bucket.ts#frictionBudgetBucket` (the PURE, no-DB, getter-backed
//             bucket derivation shape) — `sinuosity-stress-bucket.ts`'s own precedent for this codebase.
//             — P3-E C8 — 2026-07-18
//
// `stressBucket` — the R2.2 wall over `player_progression_state.org_stress`/`compression_week_state`
// (design §15 verbatim mapping). `compression_active` is a STATE check (ssi `weekState === 'active'`),
// never a numeric cutpoint — it wins over the numeric ladder regardless of the underlying `orgStress`
// value (a board still 'active' after further accrual/decay stays `compression_active`, never falls back
// to `crushing`). The 2 numeric cutpoints:
//   - `crushingLowerBound` REUSES `coreLoopsTunables.compressionStressThresholdTrigger` (default 85,
//     `core-loops-tunables.ts` — the EXACT SAME value the design's own §15 literal "mounting < 85" names,
//     and the SAME semantic point where `compression_week_state` itself flips 'none'→'warning', §9.1) —
//     ZERO new tunable for this cutpoint, R2.3 reuse (the design's own number already lives in the
//     registry under a different name).
//   - `calmUpperBound` is the ONE genuinely NEW cutpoint (design gives the literal default 50, no
//     existing getter carries it) — `core_loops.compression_stress_bucket_calm_upper_bound` (C8).
// Called BOTH by `GET /v1/compression/state` and the session-open `compression_glance` (design §15) —
// ONE formula, zero drift risk (the `evaluateConvergence`/`frictionLoadForNode` precedent this codebase
// already established for exactly this "reused by 2+ call sites" shape).

export type StressBucket = 'calm' | 'mounting' | 'crushing' | 'compression_active';

/**
 * `orgStress` — the RAW server-only scalar (NEVER itself surfaced to a player, R2.2 — only this
 * function's OWN qualitative return value crosses to the client). `weekState` — the RAW
 * `compression_week_state` column value ('none'|'warning'|'active'); `weekState === 'active'` wins
 * unconditionally (design §15: "compression_active ssi state='active'").
 */
export function stressBucket(orgStress: number, weekState: string, calmUpperBound: number, crushingLowerBound: number): StressBucket {
  if (weekState === 'active') return 'compression_active';
  if (orgStress < calmUpperBound) return 'calm';
  if (orgStress < crushingLowerBound) return 'mounting';
  return 'crushing';
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C3 (spine tick — re-priority) +
//             design §5 (Spine completion, D4): "priority = round(severity × age_factor)" linear decay +
//             decisions §1.4 D4 (the honest transposition — no default-rule execution machine).
//             — P3-A C3 — 2026-07-10
//
// PURE decay math for the `EXCEPTION_QUEUE_TICK` re-priority half (D4). Deliberately factored OUT of
// `ExceptionQueueTickService` (which owns the DB I/O) into their OWN file with ZERO NestJS/DB
// dependencies so this is the ONE production formula both the server AND the E2E spec import directly
// (`exception_tick_priority.spec.ts` — anti-fig-leaf precompute: the spec imports THESE exact functions
// to derive its expected int, rather than re-deriving the formula independently — a defect here fails
// BOTH the server behavior and the spec's own precomputed expectation identically, which is why the
// proof is falsifiable: a flat/absent recompute in the SERVICE would diverge from the spec's
// independently-called import of THIS SAME function against the SAME (severity, ageHours) inputs).
//
// Determinism (D13): pure functions of (severity, ageHours, decayHours, maxFactor) — no Math.random, no
// hidden clock read (the caller supplies ageHours, itself derived from `now() - emitted_at` at the ONE
// call site in `ExceptionQueueTickService`).

/**
 * `age_factor` — rises LINEARLY from `1` at emission (`ageHours=0`) to `maxFactor` at the decay horizon
 * (`ageHours>=decayHours`), then STAYS at `maxFactor` beyond the horizon (a saturating ramp — canon
 * gives no behavior past the horizon; a priority that keeps growing without bound would be a hidden
 * uncapped scalar, so the ceiling is the honest reading, `core_loops.exception_priority_age_max_factor`
 * design §11/decisions §4.3). Clamped to `[1, maxFactor]` defensively (a card can never be emitted in
 * the future, so `ageHours < 0` should not occur, but the floor keeps the formula total).
 */
export function computeAgeFactor(ageHours: number, decayHours: number, maxFactor: number): number {
  const raw = 1 + (ageHours / decayHours) * (maxFactor - 1);
  return Math.max(1, Math.min(maxFactor, raw));
}

/** `priority = round(severity × age_factor)` — D4, the canon formula verbatim. */
export function computeExceptionPriority(severity: number, ageFactor: number): number {
  return Math.round(severity * ageFactor);
}

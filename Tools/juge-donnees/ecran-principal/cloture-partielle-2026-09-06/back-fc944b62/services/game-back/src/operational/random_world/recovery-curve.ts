// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1 (recovery-curve.ts)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.4 (RecoveryCurve)
//             — 04g-B C1 — 2026-07-15
//
// `RecoveryCurve` — the family of PURE recovery-dynamics functions (design §3.4, glossary
// `random_world_templates.md:270`, gdd/15:1856). Zero I/O, zero RNG, zero registry reads — every
// coefficient is an explicit parameter, so this module is directly unit-testable via
// precompute-then-observe (import the function, call with known params, assert exact values) WITHOUT
// booting a server or seeding a DB. Callers (C2+ — `RandomWorldEventGeneratorService`'s
// `applyRecoveryCurve` phase) source the coefficients from `random-world.tunables.ts` getters and pass
// them in here; this file never reads `TunablesStore`/`EffectOverlayStore` itself (R2.3 — the NUMERIC
// values live in gdd/14 via the tunables getters, never a literal here beyond the pure-math constants
// 1/2 that are the shape of the formulas themselves, design §3.4 verbatim).
//
// Only 2 of the design's 4 curve FAMILIES are continuous pure functions of a scalar axis — the other
// 2 are explicitly NOT curves (design §3.4):
//   - Fork asymétrique (hollow_at_the_corner): a single seeded draw AT window closure — no continuous
//     function of elapsed time; C4 scope (RNG-driven, not pure-math).
//   - Hysteresis (quorum_on_stadler_row): position IS the adoption state variable itself, not a
//     function of elapsed time; C4 scope (state-driven, not pure-math).
// Both belong to their own C2/C4 services, not this module.

/** Parameters for the `contamination(d)` scar-decay curve (design §3.4, `halgren_tannery_hailstorm`
 *  §3.5.1). All 4 fields are tunable-sourced by the caller (R2.3) — never hardcoded here. */
export interface ScarCurveParams {
  /** `hailstorm_diffusion_days` — contamination stays at 1.0 while `d < diffusionDays` (canon: the
   *  scar is still actively spreading, not yet decaying). */
  readonly diffusionDays: number;
  /** `hailstorm_recovery_half_life_days` — the exponential half-life once decay starts. */
  readonly halfLifeDays: number;
  /** `hailstorm_permanent_residue_magnitude` — the asymptotic floor contamination decays TOWARD but
   *  never below (structurally guaranteed by the formula shape: floor + non-negative term). */
  readonly floor: number;
  /** `recovery_curve_exponent_default` (REUSE) — `k`. Higher k ⇒ slower initial recovery (gdd/14
   *  verbatim "Higher = slower initial recovery"): for a fixed `d` past `diffusionDays`, a higher `k`
   *  produces a HIGHER `contamination(d)` (more residual damage remaining), point-for-point, than a
   *  lower `k` — design §3.4, the property C1's E2E asserts via ordering, not just a single value. */
  readonly exponentK: number;
}

/**
 * `contamination(d)` — the scar-decay curve (design §3.4):
 *   `d < diffusionDays` → `1.0` (still actively spreading).
 *   otherwise → `floor + (1 − floor) × 2^(−(d − diffusionDays) / (halfLifeDays × k))`.
 *
 * Monotone non-increasing in `d` (once past `diffusionDays`); never below `floor`; a higher `k` slows
 * the exponential decay (higher `contamination(d)` for the same `d`, design §3.4 verbatim).
 *
 * @param d in-game days elapsed since the event's `started_at_game_day`.
 */
export function contamination(d: number, params: ScarCurveParams): number {
  const { diffusionDays, halfLifeDays, floor, exponentK } = params;
  if (d < diffusionDays) return 1.0;
  const elapsedSinceDiffusion = d - diffusionDays;
  const decayExponent = -elapsedSinceDiffusion / (halfLifeDays * exponentK);
  return floor + (1 - floor) * Math.pow(2, decayExponent);
}

/** Parameters for the `threePhaseMultiplier(w)` bounce/plateau/dip curve (design §3.4,
 *  `apparent_recovery` §3.5.3). All 5 numeric fields are tunable-sourced by the caller (R2.3); the 2
 *  week-boundary fields (`bounceEndWeek`/`plateauEndWeek`) are the canon-fixed structural bounds
 *  ("bounce weeks 1-3 / plateau 4-6", `random_world_templates.md` §3.5.3 verbatim) — C2's caller
 *  sources them as documented structural constants (NOT registry tunables — no `random_world.*`
 *  gdd/14 row exists for these two, design §5's NEW table). */
export interface ThreePhaseCurveParams {
  /** Last week of the bounce phase, inclusive (canon 3 — "bounce weeks 1-3"). */
  readonly bounceEndWeek: number;
  /** Last week of the plateau phase, inclusive (canon 6 — "plateau 4-6"); the dip phase runs
   *  `(plateauEndWeek, durationWeeks]`. */
  readonly plateauEndWeek: number;
  /** `apparent_recovery_duration_weeks` — the week the curve resolves (m → 1.0 asymptotically). */
  readonly durationWeeks: number;
  /** `apparent_recovery_bounce_amplitude` — bounce multiplier = `1 + bounceAmplitude`. */
  readonly bounceAmplitude: number;
  /** `apparent_recovery_dip_amplitude` — dip multiplier's maximum depth below 1.0. */
  readonly dipAmplitude: number;
  /** `recovery_curve_exponent_default` (REUSE) — `k`, shapes the dip's approach back to 1.0. */
  readonly exponentK: number;
}

/**
 * `threePhaseMultiplier(w)` — the bounce/plateau/dip curve (design §3.4):
 *   `w ≤ bounceEndWeek`                    → `1 + bounceAmplitude` (sharp visible bounce).
 *   `bounceEndWeek < w ≤ plateauEndWeek`   → `1.0` (masking — metrics look normal).
 *   `plateauEndWeek < w ≤ durationWeeks`   → `1 − dipAmplitude × (1 − u)^(1/k)`, where
 *                                             `u = (w − plateauEndWeek) / (durationWeeks − plateauEndWeek)`
 *                                             clamped to `[0,1]` (the dip closes asymptotically to
 *                                             1.0 exactly AT `durationWeeks`, where `u = 1`).
 *
 * @param w in-game weeks elapsed since the successor event's `started_at_game_day` (1-indexed).
 */
export function threePhaseMultiplier(w: number, params: ThreePhaseCurveParams): number {
  const { bounceEndWeek, plateauEndWeek, durationWeeks, bounceAmplitude, dipAmplitude, exponentK } = params;
  if (w <= bounceEndWeek) return 1 + bounceAmplitude;
  if (w <= plateauEndWeek) return 1.0;
  const rawU = (w - plateauEndWeek) / (durationWeeks - plateauEndWeek);
  const u = Math.min(1, Math.max(0, rawU));
  return 1 - dipAmplitude * Math.pow(1 - u, 1 / exponentK);
}

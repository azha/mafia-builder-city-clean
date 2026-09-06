// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/tenure_inertia.md (Idea #38 — Lieutenant Tenure Inertia) —
//             the canonical composites (TenureInertiaBucketComposite / ActionCostComposite /
//             ReassignmentDisruptionComposite / EfficiencyBonusComposite), the streak→bucket derivation, and the
//             bucket→effect mapping (§Effects table). Phase-11 vector — Task A1.
//             -- session:2026-06-08 (Phase 11 — lieutenant tenure inertia foundation) --
//
// PURE composite module — deterministic, NO DB / I/O / RNG / Date.now, and ZERO imports from the rest of game-back, so
// it stays dependency-free and directly unit-testable (the A1 unit spec imports it straight from this file with no
// running stack). The runtime never STORES a bucket: the bucket is always DERIVED from the persisted streak via
// bucketForStreak (canon Invariant 4 — `tenure_score` / the tick columns are BO-only scalars; the bucket band is the
// ONLY thing a later projection task surfaces, and it is computed, never persisted).
//
// Canon invariants honored here:
//   (2) monotone — bucketForStreak is a monotone step function of the streak (a higher streak never yields a lower
//       bucket); the only way DOWN is a full reset of the streak (handled by the tick / reassign task, not here).
//   (3) cap at ENTRENCHED — the ENTRENCHED row is the ceiling (COST_MAX / DISRUPT_MAX / BONUS_CAP); BONUS_NONE is
//       exactly 1.0 (no change for a FRESH lieutenant), enforced by the curve default (tunables) + asserted by the spec.
//   (6) deterministic tick-aligned — every function here is a pure function of its inputs (the streak / the bucket /
//       the passed-in thresholds + curves); no clock, no RNG.

// ───────────────────────────── the 4 canonical composites (names are CANON — VERBATIM) ─────────────────────────────

/** Tenure bucket — the qualitative band derived from the uninterrupted-occupancy streak. Monotone (canon Invariant 2). */
export type TenureInertiaBucketComposite = 'FRESH' | 'ACCLIMATED' | 'SEASONED' | 'SENIOR' | 'ENTRENCHED';

/** Script-revision cost band — how expensive re-scripting a lieutenant is, growing with tenure (the inertia cost). */
export type ActionCostComposite = 'COST_1' | 'COST_2' | 'COST_3' | 'COST_MAX';

/** Reassignment-disruption band — how long the settling window is after a move, growing with tenure (the inertia drag). */
export type ReassignmentDisruptionComposite = 'DISRUPT_SHORT' | 'DISRUPT_MED' | 'DISRUPT_LONG' | 'DISRUPT_MAX';

/** Role-efficiency band — the yield bonus a tenured lieutenant earns; BONUS_NONE = no change, BONUS_CAP = the ceiling. */
export type EfficiencyBonusComposite = 'BONUS_NONE' | 'BONUS_LOW' | 'BONUS_MID' | 'BONUS_CAP';

// ───────────────────────────── the bucket-derivation (streak → bucket) ─────────────────────────────

/**
 * The streak thresholds passed in (NOT imported — keeps this module pure; the concrete defaults live in
 * lieutenant-tunables.ts, `T.lieutenant.tenure_inertia.bucket_threshold_*`). Each is the streak at/above which the
 * NEXT bucket begins. Monotone discipline (canon Invariant 2) requires acclimated ≤ seasoned ≤ senior ≤ entrenched —
 * the tunable defaults guarantee it; this function does not re-validate (the caller owns calibration).
 */
export interface TenureInertiaThresholds {
  readonly acclimated: number;
  readonly seasoned: number;
  readonly senior: number;
  readonly entrenched: number;
}

/**
 * Derive the tenure bucket from the uninterrupted-occupancy streak (canon Invariant 2 — monotone). FRESH below
 * `acclimated`; ACCLIMATED at/above `acclimated` and below `seasoned`; SEASONED at/above `seasoned` and below `senior`;
 * SENIOR at/above `senior` and below `entrenched`; ENTRENCHED at/above `entrenched` (the cap). PURE — a total function
 * of (streak, thresholds), no clock / RNG. The bucket is DERIVED here, NEVER persisted (canon Invariant 4).
 */
export function bucketForStreak(
  streak: number,
  thresholds: TenureInertiaThresholds,
): TenureInertiaBucketComposite {
  if (streak >= thresholds.entrenched) return 'ENTRENCHED';
  if (streak >= thresholds.senior) return 'SENIOR';
  if (streak >= thresholds.seasoned) return 'SEASONED';
  if (streak >= thresholds.acclimated) return 'ACCLIMATED';
  return 'FRESH';
}

// ───────────────────────────── the bucket → effect mapping (§Effects table — VERBATIM) ─────────────────────────────

/** The three effect bands a bucket resolves to (the §Effects row). */
export interface TenureInertiaEffects {
  readonly script_revision_cost: ActionCostComposite;
  readonly reassignment_disruption: ReassignmentDisruptionComposite;
  readonly role_efficiency_bonus: EfficiencyBonusComposite;
}

/**
 * The canon §Effects table (tenure_inertia.md), VERBATIM — the 5 rows. This is the single source of truth for the
 * bucket→effect mapping (no inline magic — these are categorical composites, not numbers; the numbers come from the
 * curves in tunables.ts). FRESH is inert (COST_1 / DISRUPT_SHORT / BONUS_NONE); ENTRENCHED is the ceiling
 * (COST_MAX / DISRUPT_MAX / BONUS_CAP — canon Invariant 3).
 */
const EFFECTS_BY_BUCKET: Readonly<Record<TenureInertiaBucketComposite, TenureInertiaEffects>> = {
  FRESH: { script_revision_cost: 'COST_1', reassignment_disruption: 'DISRUPT_SHORT', role_efficiency_bonus: 'BONUS_NONE' },
  ACCLIMATED: { script_revision_cost: 'COST_2', reassignment_disruption: 'DISRUPT_SHORT', role_efficiency_bonus: 'BONUS_LOW' },
  SEASONED: { script_revision_cost: 'COST_3', reassignment_disruption: 'DISRUPT_MED', role_efficiency_bonus: 'BONUS_MID' },
  SENIOR: { script_revision_cost: 'COST_3', reassignment_disruption: 'DISRUPT_LONG', role_efficiency_bonus: 'BONUS_MID' },
  ENTRENCHED: { script_revision_cost: 'COST_MAX', reassignment_disruption: 'DISRUPT_MAX', role_efficiency_bonus: 'BONUS_CAP' },
};

/** Resolve the §Effects row for a bucket (canon table — VERBATIM). PURE — a static lookup. */
export function effectsForBucket(bucket: TenureInertiaBucketComposite): TenureInertiaEffects {
  return EFFECTS_BY_BUCKET[bucket];
}

// ───────────────────────────── the composite → magnitude resolvers (curve-driven, param-passed) ─────────────────────

/** The DISRUPT_* → tick-count curve (the concrete values live in tunables.ts, `reassignment_disruption_curve`). */
export interface ReassignmentDisruptionCurve {
  readonly DISRUPT_SHORT: number;
  readonly DISRUPT_MED: number;
  readonly DISRUPT_LONG: number;
  readonly DISRUPT_MAX: number;
}

/**
 * Map a ReassignmentDisruptionComposite → the settling-window tick count via the passed-in curve (PURE — the curve is
 * a param so the module imports no tunables). The settling window is how many ticks a freshly-reassigned lieutenant
 * stays disrupted (the inertia drag); longer for higher tenure.
 */
export function disruptionTicks(
  disruption: ReassignmentDisruptionComposite,
  curve: ReassignmentDisruptionCurve,
): number {
  return curve[disruption];
}

/** The BONUS_* → yield-multiplier curve (the concrete values live in tunables.ts, `efficiency_bonus_curve`). */
export interface EfficiencyBonusCurve {
  readonly BONUS_NONE: number;
  readonly BONUS_LOW: number;
  readonly BONUS_MID: number;
  readonly BONUS_CAP: number;
}

/**
 * Map an EfficiencyBonusComposite → the role-efficiency yield multiplier via the passed-in curve (PURE). BONUS_NONE
 * MUST be exactly 1.0 (no change for a FRESH lieutenant); BONUS_CAP is the capped ceiling (canon Invariant 3). The
 * 1.0-at-BONUS_NONE guarantee is enforced by the curve default in tunables.ts (and asserted by the A1 unit spec).
 */
export function yieldMultiplier(bonus: EfficiencyBonusComposite, curve: EfficiencyBonusCurve): number {
  return curve[bonus];
}

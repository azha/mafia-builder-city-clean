// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (org_stress
//             accumulator — the §8.1 weighted-source increment formula, verbatim)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.1
//             (`increment = clamp(rate × Σ(weight × signal), 0, increment_max)`) + §8.2 (the 7 sources —
//             5 canon weights VERBATIM + 2 NEW-additif, 2 INERT traced) + §8.3 (quiet-week predicate).
//             Decisions: ★#3 (weights RATIFIÉ défaut) ; divergence #10 (understudy/knots INERT, NEVER
//             renormalized) ; divergence #6 (friction/annealing NEW-additif weights).
//             Pattern: `friction-formula.ts` (the PURE, no-DB, no-DI derivation shape — reused verbatim by
//             BOTH the real service AND the E2E spec to prevent formula drift, the `evaluateConvergence`
//             precedent that file's own header cites).
//             — P3-E C6 — 2026-07-17
//
// `compression-stress-signal.ts` — the ENTIRE §8.1/§8.2 arithmetic as PURE functions (no DB, no Nest DI).
// `CompressionStressReaderService` calls these to reduce raw B/C/D counts into the [0,1] `signal_source`
// per §8.2, then the weighted sum + clamp (§8.1). The E2E floor imports these SAME functions to
// independently recompute the EXACT expected increment from the seeded raw signals (D13 precedent,
// `deriveWeekEpoch` — no re-derivation drift between production and spec).
//
// ★ Normalization realized HERE (design §8.2 gives, per source, either an EXACT formula (friction — "ratio
// (total/threshold − 0.85)/0.15 borné") or just the RAW columns/query to scan (supply-chain/flags/cue-
// stack/annealing — C0-reserve R2/R3/R4) with NO numeric cap/denominator — the design's own literal
// instruction is that the C6 PLAN fixes the concrete formula "sur pièces" (from the concrete pieces C0
// resolved). 3 shapes, each documented at its OWN function:
//   - supply-chain (composite of 3 sub-fractions, EACH naturally bounded — no cap tunable needed);
//   - annealing (fraction of the player's OWN non-settled rows — naturally bounded, no cap tunable);
//   - flags-pending / cue-stack-failed (RAW counts with no natural denominator — `count / cap` via the
//     NEW-additif `compression_count_based_stress_signal_cap`, C6, core-loops-tunables.ts).

/** §8.2 row 1 — the 3 raw counts (+ their own totals) the supply-chain composite reduces. */
export interface SupplyChainSignalCounts {
  readonly backpressureCriticalCount: number;
  readonly backpressureTotalCount: number;
  readonly routeBadCount: number; // severed OR sinuosity >= stressedCriticalCut (SinuosityStressBucket 'critical'|'severed')
  readonly routeTotalCount: number;
  readonly legBadCount: number; // debt_load > stressThreshold (DebtBucket 'stressed'|'fractured')
  readonly legTotalCount: number;
}

/** count/total -> [0,1] fraction; 0 for an empty domain (a player with NO rows in that domain contributes
 *  no stress from it — the "org propre" clean-player case, never a divide-by-zero NaN). */
function fractionOf(bad: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, bad / total));
}

/**
 * `supply_chain_capacity_pressure` (§8.2 row 1, weight 0.30 canon VERBATIM) — the composite "part des
 * nodes en backpressure critical + routes en collapse-risk/severed + legs mycelial stressed/fractured"
 * (C0-reserve R3, decisions §8.5). Realized as the AVERAGE of the 3 domains' OWN bad/total fraction (each
 * independently bounded [0,1] by construction, so the average stays in [0,1] — no additional clamp
 * needed, unlike the count-based sources below) — a domain with zero rows contributes 0, never inflating
 * the composite for a player who simply has no legs/routes yet.
 */
export function supplyChainCapacityPressureSignal(counts: SupplyChainSignalCounts): number {
  const backpressureFraction = fractionOf(counts.backpressureCriticalCount, counts.backpressureTotalCount);
  const routeFraction = fractionOf(counts.routeBadCount, counts.routeTotalCount);
  const legFraction = fractionOf(counts.legBadCount, counts.legTotalCount);
  return (backpressureFraction + routeFraction + legFraction) / 3;
}

/**
 * `lieutenant_flag_unresolved` (§8.2 row 3, weight 0.20 canon VERBATIM) / `cue_stack_non_optimal` (§8.2
 * row 4, weight 0.15 canon VERBATIM) — BOTH realized as a RAW count with no natural denominator
 * (unlike supply-chain/annealing's own "fraction of the player's rows" shape) -> `count / saturationCap`,
 * clamped [0,1] (`compressionCountBasedStressSignalCap`, C6 NEW-additif). `saturationCap <= 0` is a
 * defensive floor-guard (never reachable via the registered CAPS min=2 — a 0-tunable would make ANY
 * non-zero count instantly saturate to 1, the honest degenerate reading rather than a divide-by-zero).
 */
export function countBasedSignal(count: number, saturationCap: number): number {
  if (count <= 0) return 0;
  if (saturationCap <= 0) return 1;
  return Math.min(1, count / saturationCap);
}

/**
 * `friction_penalty_active` (§8.2 row 6, weight 0.10 NEW-additif) — design §8.2 EXACT formula, verbatim:
 * `efficiency_penalty_active ? 1 : ratio (total/threshold − 0.85)/0.15 borné`. The 0.85/0.15 band is the
 * SAME early-warning gradient `FrictionBudgetBucket`'s own `strained` (0.85..1.0 of threshold) region
 * covers — by the time the ratio would reach 1.0, `efficiency_penalty_active` has ALREADY flipped true
 * (the SAME threshold crossing, `friction-budget.repository.ts#applyOrRevertPenalty`), so the boolean
 * branch and the ratio branch never double-count the same regime.
 */
export function frictionPenaltyActiveSignal(penaltyActive: boolean, frictionTotal: number, frictionThreshold: number): number {
  if (penaltyActive) return 1;
  if (frictionThreshold <= 0) return 0;
  const ratio = frictionTotal / frictionThreshold;
  return Math.min(1, Math.max(0, (ratio - 0.85) / 0.15));
}

/**
 * `annealing_compounding_strain` (§8.2 row 7, weight 0.10 NEW-additif) — "rows `annealing_state` non-
 * settled avec `changes_during_settling >= 1`" (C0-reserve, decisions §8 row 9) realized as a FRACTION of
 * the player's OWN non-settled rows (naturally bounded [0,1], mirrors supply-chain's own "fraction of the
 * player's rows" shape — no cap tunable needed here either) — 0 for a player with zero non-settled rows
 * (never touched annealing, or every settling window already completed).
 */
export function annealingCompoundingStrainSignal(compoundingCount: number, totalNonSettledCount: number): number {
  return fractionOf(compoundingCount, totalNonSettledCount);
}

/** The 7 §8.2 `signal_source` values, each ∈ [0,1] — `understudyUnsync`/`constraintKnotUnresolved` are
 *  ALWAYS 0 (INERT, divergence #10 — traced HERE with a comment + consumed at weight×0 below, never
 *  silently dropped from the sum). */
export interface StressSignals {
  readonly supplyChainCapacityPressure: number;
  readonly understudyUnsync: number; // INERT (ch07 not built) — always 0, traced not dropped
  readonly lieutenantFlagUnresolved: number;
  readonly cueStackNonOptimal: number;
  readonly constraintKnotUnresolved: number; // INERT (ch06/P3-I not built) — always 0, traced not dropped
  readonly frictionPenaltyActive: number;
  readonly annealingCompoundingStrain: number;
}

/** The 7 §8.2 weight tunables (★#3) — resolved by the CALLER (`coreLoopsTunables.compression*Weight`,
 *  R2.3: the SERVICE layer resolves tunables, this pure module takes plain numbers). */
export interface StressWeights {
  readonly supplyChainCapacityPressure: number;
  readonly understudyUnsync: number;
  readonly lieutenantFlagUnresolved: number;
  readonly cueStackNonOptimal: number;
  readonly constraintKnotUnresolved: number;
  readonly frictionPenaltyActive: number;
  readonly annealingCompoundingStrain: number;
}

/**
 * `Σ_source (weight_source × signal_source)` (§8.1) — the 2 INERT terms (`understudyUnsync` ×
 * `constraintKnotUnresolved`) are EXPLICIT multiplications in this sum (weight × 0 = 0), not omitted
 * lines — divergence #10's own "poids inertes tracés" requirement realized as CODE, not just a comment.
 */
export function weightedStressSum(signals: StressSignals, weights: StressWeights): number {
  return (
    weights.supplyChainCapacityPressure * signals.supplyChainCapacityPressure +
    weights.understudyUnsync * signals.understudyUnsync + // INERT — always contributes 0, traced not dropped (divergence #10)
    weights.lieutenantFlagUnresolved * signals.lieutenantFlagUnresolved +
    weights.cueStackNonOptimal * signals.cueStackNonOptimal +
    weights.constraintKnotUnresolved * signals.constraintKnotUnresolved + // INERT — always contributes 0, traced not dropped (divergence #10)
    weights.frictionPenaltyActive * signals.frictionPenaltyActive +
    weights.annealingCompoundingStrain * signals.annealingCompoundingStrain
  );
}

/** `increment = clamp(rate × weightedSum, 0, incrementMax)` (§8.1 verbatim). The CALLER rounds this to an
 *  integer before writing (`org_stress` is a DB `integer` column) — this function stays a pure float
 *  formula, never itself rounding (so the E2E floor can recompute the EXACT pre-rounding value too). */
export function stressIncrement(weightedSum: number, rateMultiplier: number, incrementMax: number): number {
  return Math.min(incrementMax, Math.max(0, rateMultiplier * weightedSum));
}

/**
 * §8.3 — a week is "quiet" iff EVERY live `signal_source` is exactly 0 (design: "tous signaux §8.2 = 0" —
 * the qualitative NOISE-FLOOR reading, not "zero raw counts": e.g. a friction total sitting at 70% of its
 * own threshold has real friction but a 0 `signal_source` — below the noise floor, still "quiet" for W/14
 * purposes). The 2 INERT signals are always 0 by construction — included here for completeness, never the
 * deciding factor.
 */
export function isQuietWeek(signals: StressSignals): boolean {
  return (
    signals.supplyChainCapacityPressure === 0 &&
    signals.understudyUnsync === 0 &&
    signals.lieutenantFlagUnresolved === 0 &&
    signals.cueStackNonOptimal === 0 &&
    signals.constraintKnotUnresolved === 0 &&
    signals.frictionPenaltyActive === 0 &&
    signals.annealingCompoundingStrain === 0
  );
}

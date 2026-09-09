// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 6 (C6)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.1 + §5 §7
//             — Forensic C6 — 2026-06-19
//
// `forensic-constants.ts` — PURE helpers for Benford's Law and dark-window determinism.
//
// C6 provides:
//   BENFORD_REFERENCE  — pre-computed array: reference[d-1] = log10(1 + 1/d) for d ∈ 1..9.
//                        The Benford's Law expected frequency for each leading digit.
//                        Pre-computed (no inline magic 0.301… scattered — the array is the
//                        single authoritative copy). Used by computeChiSquare (C7).
//
//   firstDigit(amountCents)
//                     — returns the first significant digit (1..9) of amountCents.
//                        Returns 0 for 0/negative → excluded from the histogram (plan :1049).
//                        Pure: no side effects, no Math.random.
//
//   darkWeeks(frontId, tick, min, max)
//                     — deterministic integer in [min, max] seeded from (frontId + tick).
//                        Used by triggerHardAudit (C9) to derive the front dark window.
//                        NO Math.random (banned — market-rng.service.ts:24; C4 invariant).
//                        Pure: same inputs → same output (cross-tick determinism).
//
// Anti-fabrication: NO Math.random in this file (0 occurrences — verifiable by grep).
// Zero-regression invariant (§1.3): this file is PURE (no DB, no NestJS, no side effects).
// OQ-10: BENFORD_REFERENCE is the complete reference for digits 1..9 (the χ² denominator).

/**
 * BENFORD_REFERENCE — pre-computed Benford's Law expected frequency for each leading digit d ∈ 1..9.
 *
 * BENFORD_REFERENCE[d - 1] = log10(1 + 1/d) = log10((d + 1) / d).
 *
 * Pre-computed once at module load (no inline magic `0.301…` scattered in the service layer).
 * Single source of truth for the χ² denominator in computeChiSquare (C7).
 *
 * Values (IEEE 754, 64-bit):
 *   d=1: log10(2/1) ≈ 0.30103
 *   d=2: log10(3/2) ≈ 0.17609
 *   d=3: log10(4/3) ≈ 0.12494
 *   d=4: log10(5/4) ≈ 0.09691
 *   d=5: log10(6/5) ≈ 0.07918
 *   d=6: log10(7/6) ≈ 0.06695
 *   d=7: log10(8/7) ≈ 0.05799
 *   d=8: log10(9/8) ≈ 0.05115
 *   d=9: log10(10/9) ≈ 0.04576
 *
 * Canon forensic_signaling_mechanics.md §5.1 `:24` — "leading digit Benford χ² audit";
 * the reference frequencies are the canonical Benford distribution.
 */
export const BENFORD_REFERENCE: readonly number[] = Object.freeze(
  Array.from({ length: 9 }, (_, i) => {
    const d = i + 1; // d ∈ 1..9
    return Math.log10(1 + 1 / d); // = log10((d+1)/d) = log10(1 + 1/d)
  }),
);

/**
 * firstDigit — extract the first significant digit (1..9) of an amount in cents.
 *
 * Returns 0 for amountCents ≤ 0 (excluded from the histogram, plan :1049).
 * Pure: no side effects, no Math.random, no DB.
 *
 * Algorithm: stringify the absolute integer value, find the first non-zero character.
 * e.g. firstDigit(12345) → 1; firstDigit(98700) → 9; firstDigit(41000) → 4.
 *
 * OQ-10: returns a digit 1..9, NOT the raw amount (the ring stores digits, not amounts;
 * sufficient for χ², lighter storage: 1 byte per receipt vs 4 bytes float32).
 */
export function firstDigit(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  // Take the absolute integer value (amountCents is always a positive integer in practice,
  // but guard for safety). Stringify and find the first digit character 1..9.
  const s = Math.floor(Math.abs(amountCents)).toString();
  for (const ch of s) {
    const d = parseInt(ch, 10);
    if (d >= 1) return d;
  }
  return 0; // should not reach here for a positive integer, but defensive.
}

/**
 * darkWeeks — deterministic integer in [min, max] seeded from (frontId + tick).
 *
 * Used by triggerHardAudit (C9) to derive the front dark window length in weeks.
 * Canon forensic_signaling_mechanics.md :54: "front dark 2-4 weeks".
 * Tunables: frontDarkWeeksMin (default 2) / frontDarkWeeksMax (default 4) from C4.
 *
 * NO Math.random (banned — market-rng.service.ts:24; C4 anti-stochastic invariant).
 * Deterministic: same (frontId, tick, min, max) → same result across all invocations.
 *
 * Algorithm: djb2-inspired 32-bit hash of the string `${frontId}:${tick}`, folded
 * into [min, max] via unsigned modulo. The hash is cheap, fast, and pure.
 *
 * @param frontId - the front building's uuid (the per-front seed — different fronts → different windows).
 * @param tick    - the current game tick (the per-tick seed — different ticks → different windows).
 * @param min     - the minimum dark window in weeks (inclusive; forensicTunables.frontDarkWeeksMin).
 * @param max     - the maximum dark window in weeks (inclusive; forensicTunables.frontDarkWeeksMax).
 * @returns       - an integer in [min, max] (the deterministic dark window in weeks).
 */
export function darkWeeks(frontId: string, tick: number, min: number, max: number): number {
  if (min >= max) return min; // degenerate range → always min.
  // djb2-style 32-bit hash of the combined seed string.
  const seed = `${frontId}:${tick}`;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    // hash = (hash * 33) ^ charCode, in 32-bit unsigned arithmetic.
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0; // coerce to uint32.
  }
  const range = max - min + 1;
  return min + (hash % range);
}

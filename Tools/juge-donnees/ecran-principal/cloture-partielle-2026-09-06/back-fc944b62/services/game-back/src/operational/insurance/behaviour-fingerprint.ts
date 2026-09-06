// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.2 (:92-96,:211)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3)
//             — Insurance Drift C3 — 2026-06-18
//
// `BehaviourFingerprint` — the canon 4-feature snapshot of a player's pre-coverage operating policy.
//
// Canon :211 (glossary): `BehaviourFingerprint` — 4 features:
//   - stashRatio: stash fill ratio per-mille [0..1000] (how full the money_holding is relative to capacity)
//   - courierCadence: mean game-days between courier rotations (how often couriers are rotated)
//   - marginalDeal: marginal / high-heat deal rate per-mille [0..1000] (fraction of deals that are risky)
//   - lookout: lookout assignment rate per-mille [0..1000] (fraction of operations covered by a SECURITY lieutenant)
//
// The `isLessCautiousThanBaseline` function compares a CURRENT observation against the FROZEN issuance baseline.
// DD-LESS-CAUTIOUS (design §1.3): the baseline stays FROZEN at issuance; C4-C8 compare vs the frozen baseline,
// NOT a sliding running estimate. The running-estimate fingerprint columns track current rates for reference,
// but the COMPARISON anchor is always the issuance baseline.
//
// Per-feature comparison (plan Task 3 spec — "Shared signatures"):
//   stashRatio:    current >= baseline × coverage_drift_stash_hotter_margin_factor   (hotter = less cautious)
//   courierCadence: current >= baseline + coverage_drift_courier_cadence_slower_margin_days  (longer gap = less prudent)
//   marginalDeal:  current >= baseline + coverage_drift_marginal_deal_rate_margin_permille   (more marginal = less cautious)
//   lookout:       current <= baseline − coverage_drift_lookout_rate_margin_permille          (fewer lookouts = less prudent)
//
// Anti-fabrication: all margin thresholds read from the insuranceTunables registry (C2 getters). NO inline scalars.
// Deterministic: PURE function — no DB, no Math.random, no Date.now(). All inputs are observable state.
// Zero-regression: this file has no side effects; it ONLY defines a type and pure comparison functions.

import { insuranceTunables } from './insurance-tunables';

// ===== BehaviourFingerprint type =====

/**
 * `BehaviourFingerprint` — the 4-feature in-memory shape of a player's pre-coverage operating policy.
 *
 * Canon glossary `:211`:
 *   `BehaviourFingerprint = { stashRatio; courierCadence; marginalDeal; lookout }`
 *
 * Units:
 *   - `stashRatio`: per-mille [0..1000] — stash fill ratio (heldCents / capacityCents × 1000).
 *     Computed by `stashRatioPermille(heldCents, capacityCents)`.
 *   - `courierCadence`: game-days — mean interval between courier rotations (integer).
 *     Computed from courier_shift history over the fingerprint window.
 *   - `marginalDeal`: per-mille [0..1000] — fraction of deals that are marginal / high-heat.
 *     Computed from deal state over the fingerprint window.
 *   - `lookout`: per-mille [0..1000] — fraction of operations covered by a SECURITY lieutenant.
 *     Computed from lieutenant SECURITY assignment state.
 *
 * The persisted form lives on:
 *   - `coverage_induced_drift_state`: 4 `fingerprint_*` columns (smallint — running estimate).
 *   - `almanac_entry`: 4 `baseline_fingerprint_*` columns (smallint — frozen issuance baseline, DD-BASELINE-PERSIST).
 */
export type BehaviourFingerprint = {
  readonly stashRatio: number;
  readonly courierCadence: number;
  readonly marginalDeal: number;
  readonly lookout: number;
};

// ===== Quantization helpers =====

/**
 * `stashRatioPermille(heldCents, capacityCents)` — compute the stash fill ratio in per-mille [0..1000].
 *
 * Formula: Math.round(1000 × heldCents / capacityCents)
 * Edge: if capacityCents === 0 → return 0 (avoid division by zero; empty-capacity stash = 0 fill).
 * Clamp: result is in [0..1000] (held_cents is constrained by DB to [0..capacity]).
 * Unit: per-mille (integer) — stored as smallint on both drift_state and almanac_entry.
 *
 * PURE — no DB, no Math.random.
 */
export function stashRatioPermille(heldCents: bigint | number, capacityCents: bigint | number): number {
  const held = Number(heldCents);
  const cap = Number(capacityCents);
  if (cap === 0) return 0;
  return Math.round((1000 * held) / cap);
}

/**
 * `courierCadenceDays(shiftCount, windowDays)` — estimate mean game-days between courier rotations.
 *
 * Formula: if shiftCount === 0 → return windowDays (no rotations in the window → treat as the whole window gap).
 *          else: Math.round(windowDays / shiftCount) — average interval per rotation.
 * Unit: game-days (integer smallint).
 *
 * PURE — no DB, no Math.random.
 */
export function courierCadenceDays(shiftCount: number, windowDays: number): number {
  if (shiftCount === 0) return windowDays;
  return Math.round(windowDays / shiftCount);
}

/**
 * `marginalDealRatePermille(marginalCount, totalCount)` — compute the marginal deal rate in per-mille [0..1000].
 *
 * A "marginal deal" is one where the dealer is operating at lower margin or higher heat (risk signal).
 * At C3 baseline capture, marginalCount is always 0 (no deals have been observed pre-issuance in the
 * absence of C4-C8 instrumentation). The running estimate is updated by the C6 subscriber.
 * Unit: per-mille (integer smallint).
 *
 * PURE — no DB, no Math.random.
 */
export function marginalDealRatePermille(marginalCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((1000 * marginalCount) / totalCount);
}

/**
 * `lookoutRatePermille(securityLieutenantCount, operationsCount)` — compute the lookout rate in per-mille [0..1000].
 *
 * A "lookout" = a SECURITY-archetype lieutenant assigned to an operational building (DD-LOOKOUT-MAPPING).
 * At C3 baseline capture, this is read from the live lieutenant SECURITY assignment state.
 * Unit: per-mille (integer smallint).
 *
 * PURE — no DB, no Math.random.
 */
export function lookoutRatePermille(securityLieutenantCount: number, operationsCount: number): number {
  if (operationsCount === 0) return 0;
  return Math.round((1000 * securityLieutenantCount) / operationsCount);
}

// ===== isLessCautiousThanBaseline =====

/**
 * `isLessCautiousThanBaseline(feature, current, baseline)` — per-feature "less cautious than baseline" check.
 *
 * DD-LESS-CAUTIOUS (design §1.3 / plan Shared signatures): per-feature comparison using the C2 margin tunables.
 * The baseline is the FROZEN issuance fingerprint (not the running estimate).
 *
 * Per-feature semantics:
 *   `stashRatio`:     current >= baseline × stash_hotter_margin_factor      (hotter stash = less cautious)
 *   `courierCadence`: current >= baseline + courier_cadence_slower_margin_days   (longer gap = less prudent)
 *   `marginalDeal`:   current >= baseline + marginal_deal_rate_margin_permille    (more marginal = less cautious)
 *   `lookout`:        current <= baseline − lookout_rate_margin_permille           (fewer lookouts = less prudent)
 *
 * Margin tunables consumed (all from C2 registry keys, NO inline scalars):
 *   stashRatio     → `insuranceTunables.coverageDriftStashHotterMarginFactor`        (default 2.0)
 *   courierCadence → `insuranceTunables.coverageDriftCourierCadenceSlowerMarginDays` (default 2)
 *   marginalDeal   → `insuranceTunables.coverageDriftMarginalDealRateMarginPermille`  (default 150)
 *   lookout        → `insuranceTunables.coverageDriftLookoutRateMarginPermille`       (default 150)
 *
 * PURE — no DB, no Math.random. Deterministic.
 *
 * Flagged for reviewer⊥:
 *   - The 4 margin tunables are [PROPOSED DEFAULT][PROV-Y26Q2] (design §7) — not canon-verbatim magnitudes.
 *   - The frozen-baseline-vs-running-estimate distinction is the DD-LESS-CAUTIOUS "baseline-figé" note.
 *
 * @param feature  — which feature of BehaviourFingerprint to compare.
 * @param current  — the current observed value for this feature.
 * @param baseline — the frozen issuance baseline value for this feature.
 * @returns `true` if the current value is "less cautious than the baseline by at least the margin threshold".
 */
export function isLessCautiousThanBaseline(
  feature: keyof BehaviourFingerprint,
  current: number,
  baseline: number,
): boolean {
  switch (feature) {
    case 'stashRatio': {
      // Less cautious: stash is hotter (higher ratio) than baseline by at least the factor.
      // current >= baseline × stash_hotter_margin_factor
      // [PROPOSED DEFAULT][PROV-Y26Q2] anchored on canon "stash now 2× as hot" (:98).
      const factor = insuranceTunables.coverageDriftStashHotterMarginFactor;
      return current >= baseline * factor;
    }
    case 'courierCadence': {
      // Less cautious: courier rotated LESS often (longer gap) than baseline by ≥ margin_days.
      // Polarity: a longer interval = less prudent (rotation = a safety refresh, infrequent = risky).
      // current >= baseline + courier_cadence_slower_margin_days
      // [PROPOSED DEFAULT][PROV-Y26Q2]: no magnitude in canon :94 ("mean days between rotations").
      const marginDays = insuranceTunables.coverageDriftCourierCadenceSlowerMarginDays;
      return current >= baseline + marginDays;
    }
    case 'marginalDeal': {
      // Less cautious: more marginal / high-heat deals than baseline by ≥ margin_permille.
      // current >= baseline + marginal_deal_rate_margin_permille
      // [PROPOSED DEFAULT][PROV-Y26Q2]: no margin in canon :95 ("fraction" without delta).
      const marginPermille = insuranceTunables.coverageDriftMarginalDealRateMarginPermille;
      return current >= baseline + marginPermille;
    }
    case 'lookout': {
      // Less cautious: FEWER lookouts than baseline by ≥ margin_permille.
      // Polarity: lower lookout rate = less prudent (fewer lookouts = less coverage).
      // current <= baseline − lookout_rate_margin_permille
      // [PROPOSED DEFAULT][PROV-Y26Q2]: no margin in canon :96 ("fraction" without delta).
      const marginPermille = insuranceTunables.coverageDriftLookoutRateMarginPermille;
      return current <= baseline - marginPermille;
    }
  }
}

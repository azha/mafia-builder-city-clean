// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 3 (C3) + Task 20 (C20)

import { forensicTunables } from './forensic-tunables';
//             Shared signatures (plan lines 356–362):
//               - TailRampStage (C3): matches the `tail_ramp_stage` pgEnum in forensic.ts
//               - ForensicSeverityBand (C20): ADDED in C20 (not here yet)
//               - ForensicKind (C21): ADDED in C21 (not here yet)
//
// This file is created at C3 with TailRampStage only.
// C20 adds: `ForensicSeverityBand = 'low' | 'medium' | 'high' | 'critical'` (OQ-15).
// C21 adds: `ForensicKind = 'hard_audit' | 'effluent_inspection' | 'tail_passive' | 'tail_active' | 'tail_subpoena'`.
//
// Anti-fabrication: no non-deterministic RNG. No scalar invented silently.
// The 4 members of TailRampStage match the pgEnum `tail_ramp_stage` in forensic.ts EXACTLY
// (same 4 values, same order: 'none' | 'passive' | 'tailing' | 'subpoena').
// Canon: forensic_signaling_mechanics.md :139 "sedan sprite passive → tailing → subpoena".

/**
 * TailRampStage — the progression of a standing-gap tail ramp on a lieutenant (§5.3).
 *
 * Matches the `tail_ramp_stage` pgEnum in `db/schema/forensic.ts` EXACTLY (same 4 members, same order).
 * Column `lifestyle_audit_state.tail_ramp_stage` defaults to `'none'`.
 *
 * Progression (C18 — advanceTailRamp, NIGHTLY/9):
 *   'none'      → no active tail (default; gap < threshold or not yet flagged)
 *   'passive'   → tail spawned (consecutive_flag_months ≥ standingGapConsecutiveMonths; C17)
 *   'tailing'   → active follow (after standingGapTailRampWeeks × 1/3 elapsed; C18)
 *   'subpoena'  → imminent seizure (after standingGapTailRampWeeks × 2/3 elapsed; C18)
 *
 * Canon :139: "sedan sprite passive → tailing → subpoena".
 * The `LifestyleGapFlag` event (C20) carries the rampStage at each stage transition (C18).
 * Client sees only the `LifestyleAlarmBucket` ('quiet' | 'noticed' | 'watched' | 'subpoenaed') (C24).
 *
 * R2.2: the raw `tail_ramp_stage` scalar is server-only for BO true-state (C25).
 *       The client receives the banded `LifestyleAlarmBucket` (C24) only.
 */
export type TailRampStage = 'none' | 'passive' | 'tailing' | 'subpoena';

/**
 * ForensicSeverityBand — the qualitative severity band carried by the 3 forensic bus events (C20, OQ-15).
 *
 * A 4-member closed domain. NEVER overloads `EvidenceSeverity` (city-event-bus.ts:221 = 'HIGH'|'CRITICAL').
 * The band applies only after the scalar exceeds the FLAG threshold (no event below the threshold).
 * The band→PriorityBucket mapping (low→LOW, medium→MEDIUM, high→HIGH, critical→CRITICAL) is lossless 1:1.
 *
 * Canon §5.1/:50 / §5.2/:94 fix only the FLAG thresholds (χ² > H_audit, deviation > σ).
 * Band boundaries are [PROPOSED DEFAULT][PROV-Y26Q2] — calibration TD C26.
 *
 * Members:
 *   'low'      → at the flag threshold (H ≤ chi2 < medium_mult×H  or  σ ≤ dev < medium_mult×σ).
 *   'medium'   → chi2 ≥ medium_mult×H or dev ≥ medium_mult×σ (default ≥21.0 / ≥2.0).
 *   'high'     → chi2 ≥ high_mult×H   or dev ≥ dispatchEffluentPriorityHighDeviation (default ≥35.0 / ≥2.5).
 *   'critical' → chi2 ≥ critical_mult×H or dev ≥ critical_mult×σ (default ≥56.0 / ≥3.5).
 *
 * See DD-SEVERITY-BAND in design §5 (design doc + plan Task 20 §DD-SEVERITY-BAND).
 */
export type ForensicSeverityBand = 'low' | 'medium' | 'high' | 'critical';

/**
 * bandToPriorityBucket — lossless 1:1 mapping from ForensicSeverityBand → PriorityBucket.
 *
 * Used by C22 (InspectionQueueDispatcherService) to route FORENSIC queue entries by band.
 * Mirror of the AlmanacRiskBand → priority pattern in insurance (§4.2).
 * PriorityBucket = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' (inspection.repository.ts:45).
 */
export const FORENSIC_BAND_TO_PRIORITY: Record<ForensicSeverityBand, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
  low:      'LOW',
  medium:   'MEDIUM',
  high:     'HIGH',
  critical: 'CRITICAL',
};

/**
 * bandFromChiSquare — map a χ² scalar to a ForensicSeverityBand (DD-SEVERITY-BAND A).
 *
 * PRECONDITION: called ONLY when chi2 > benfordChi2ThresholdH (soft-flag already decided).
 * PURE: no DB, no Math.random, deterministic, monotone (chi2 ↑ ⇒ band ↑ or equal).
 *
 * Boundaries (ALL sourced from getters — NO inline scalars):
 *   H        = benfordChi2ThresholdH        (default 14.0)
 *   m_med    = benfordChi2BandMediumMult    (default 1.5  → medium boundary ≥ 21.0)
 *   m_high   = benfordChi2BandHighMult      (default 2.5  → high boundary   ≥ 35.0)
 *   m_crit   = benfordChi2BandCriticalMult  (default 4.0  → critical boundary ≥ 56.0)
 *
 * if chi2 >= m_crit × H  → 'critical'
 * if chi2 >= m_high × H  → 'high'
 * if chi2 >= m_med  × H  → 'medium'
 * else                   → 'low'  (≥ H, < m_med×H)
 *
 * Anti-inline discipline: NO inline band scalars (no bare 1.5/2.5/4.0/14/21/35/56).
 * All boundaries are the getter products ONLY.
 *
 * @param chi2 - the computed χ² value (must be > H_audit; call only after flag decision).
 * @returns ForensicSeverityBand
 */
export function bandFromChiSquare(chi2: number): ForensicSeverityBand {
  // Import here avoids a circular dependency (forensic-tunables imports nothing from this file).
  // All boundary scalars are READ from the getters at call time.
  const H      = forensicTunables.benfordChi2ThresholdH;
  const mMed   = forensicTunables.benfordChi2BandMediumMult;
  const mHigh  = forensicTunables.benfordChi2BandHighMult;
  const mCrit  = forensicTunables.benfordChi2BandCriticalMult;

  if (chi2 >= mCrit * H) return 'critical';
  if (chi2 >= mHigh * H) return 'high';
  if (chi2 >= mMed  * H) return 'medium';
  return 'low';
}

/**
 * bandFromDeviation — map a deviation scalar to a ForensicSeverityBand (DD-SEVERITY-BAND B).
 *
 * PRECONDITION: called ONLY when dev > effluentSigmaInspectorThreshold (flag already decided).
 * PURE: no DB, no Math.random, deterministic, monotone (dev ↑ ⇒ band ↑ or equal).
 *
 * Boundaries (ALL sourced from getters — NO inline scalars):
 *   σ       = effluentSigmaInspectorThreshold           (default 1.5 — REUSE, flag floor)
 *   d_high  = dispatchEffluentPriorityHighDeviation      (default 2.5 — REUSE dispatcher cutoff for 'high')
 *   m_med   = effluentDeviationBandMediumMult            (default 1.33 → medium boundary ≈ 2.0)
 *   m_crit  = effluentDeviationBandCriticalMult          (default 2.33 → critical boundary ≈ 3.5)
 *
 * Cascade (order important — checks critical first, then high, then medium):
 *   if dev >= m_crit × σ  → 'critical'   (default ≥ 3.5)
 *   if dev >= d_high      → 'high'       (default ≥ 2.5 — REUSE dispatcher HIGH cutoff)
 *   if dev >= m_med  × σ  → 'medium'     (default ≥ 2.0)
 *   else                  → 'low'        (default [1.5, 2.0))
 *
 * Order invariant at defaults: σ(1.5) < m_med×σ(2.0) < d_high(2.5) < m_crit×σ(3.5) ✓
 * Defensive: if a recalibration breaks the order, the if-cascade remains monotone
 * (higher dev always maps to the same or higher band) — bands may empty, calibration TD C26.
 *
 * Anti-inline discipline: NO inline band scalars (no bare 1.33/2.33/1.5/2.5/3.5/2.0).
 * All boundaries are the getter products ONLY. `d_high` is from its own getter, not hardcoded.
 *
 * @param dev - the computed deviation value (must be > σ; call only after flag decision).
 * @returns ForensicSeverityBand
 */
export function bandFromDeviation(dev: number): ForensicSeverityBand {
  const sigma  = forensicTunables.effluentSigmaInspectorThreshold;
  const dHigh  = forensicTunables.dispatchEffluentPriorityHighDeviation;
  const mMed   = forensicTunables.effluentDeviationBandMediumMult;
  const mCrit  = forensicTunables.effluentDeviationBandCriticalMult;

  if (dev >= mCrit * sigma) return 'critical';
  if (dev >= dHigh)         return 'high';
  if (dev >= mMed  * sigma) return 'medium';
  return 'low';
}

/**
 * ForensicKind — the dispatch discriminator for FORENSIC queue entries (§5 / OQ-6, C21).
 *
 * Each FORENSIC-sourced `QueueEntry` carries a `forensic_kind` that tells the dispatcher
 * which consequence to fire at C22 (routing map §4.3). The 5 values match the 5 forensic
 * mechanics channels that produce FORENSIC entries (§5.1 Benford, §5.2 Effluent, §5.3 Tail).
 *
 *   'hard_audit'           → §5.1 Benford 3-in-60d cascade (triggerHardAudit at C22).
 *   'effluent_inspection'  → §5.2 deviation above σ threshold (inspector fine + heat bump at C22).
 *   'tail_passive'         → §5.3 tail ramp 'passive' stage (observation, no hard consequence yet).
 *   'tail_active'          → §5.3 tail ramp 'tailing' stage (heat bump + visible escalation).
 *   'tail_subpoena'        → §5.3 tail ramp 'subpoena' stage (MIS subpoena; legal hook deferred).
 *
 * The routing at C22 reads `entry.forensic_kind` when `entry.source === 'FORENSIC'`.
 * Non-FORENSIC entries do not carry this field (the `forensic_kind` field is OPTIONAL on QueueEntry).
 *
 * Canon: forensic_signaling_mechanics.md §4.3 routing map.
 * R2.2: not surfaced to the player — the dispatch consequence is server-side only.
 */
export type ForensicKind =
  | 'hard_audit'
  | 'effluent_inspection'
  | 'tail_passive'
  | 'tail_active'
  | 'tail_subpoena';

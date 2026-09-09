// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 1 (C1)
//             "Shared signatures" §Types
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §8
//             — Diplomacy & Information Warfare C C1 — 2026-06-26 —
//
// `infowar.types.ts` — the client-view types + bucket enums for the info-warfare layer.
//
// R2.2 / P6 — P5 wall:
//   Raw infowar scalars (belief_state confidence, detection_probability,
//   rival_interpretation_bias, suspected_infiltration_level) are SERVER-ONLY.
//   The player sees ONLY the soft indicators (buckets / badges) derived server-side.
//   The 6-component SideChannelSignatureComposite is the Dead-Reckoning belief vector;
//   it is a NOISY estimate (never the true RivalState — DD-P5-REALIZATION).
//
// Anti-fabrication: no Math.random(), no Date.now(). Pure type definitions.
// DD-P5-REALIZATION: the player's belief ≠ the truth. These types enforce that
//   by never exposing the rival's true intel_mode, regime, or raw pressure.
//
// Types exported here:
//   SuspectedInfiltrationBucket   — 'silent' | 'watchful' | 'alarmed' | 'purging'
//   SideChannelSignatureComposite — 6-component Dead-Reckoning vector (buckets only)
//   InfoWarClientView             — the banded info-warfare projection (no raw scalar)

// ─── Bucket types (the player-facing projections — no raw scalar) ─────────────────────────────

/**
 * `SuspectedInfiltrationBucket` — the player-facing embed-presence suspicion band.
 * Derived from the hidden `purge_trap_state.suspected_infiltration_level` float.
 * Canon: information_warfare_mechanics.md :125.
 *
 * silent:   < threshold for awareness (no purge trigger)
 * watchful: rival notices anomalies but hasn't confirmed infiltration
 * alarmed:  rival has strong evidence of infiltration (nearing purge)
 * purging:  rival has triggered internal purge (embed presence disrupted)
 */
export type SuspectedInfiltrationBucket =
  | 'silent'
  | 'watchful'
  | 'alarmed'
  | 'purging';

// ─── Dead-Reckoning belief vector (the 6-component side-channel signature) ────────────────────

/**
 * `SideChannelSignatureComposite` — the Dead-Reckoning 6-component side-channel belief vector.
 * Canon: information_warfare_mechanics.md :43 — the 6-component side-channel signature.
 *
 * Each component is a BUCKET (not a raw float) — the player never sees the hidden confidence
 * scores behind each component. This is the noisy estimate of the rival's posture.
 *
 * NOTE: This is deliberately noisy and NEVER equals the true RivalState
 * (DD-P5-REALIZATION — the player infers, not reads).
 *
 * Components (soft indicators — buckets only):
 *   operationalTempoBand:      inferred rival operational tempo (the activity rhythm).
 *   resourceMobilizationBand:  inferred resource mobilization (capital/supply movements).
 *   personnelConcentrationBand: inferred personnel concentration (hotspot indicators).
 *   communicationPatternBand:  inferred communication pattern shift (alert vs dormant).
 *   territorialReachBand:      inferred territorial reach expansion/contraction.
 *   logisticsIntensityBand:    inferred logistics intensity (supply chain signals).
 */
export interface SideChannelSignatureComposite {
  operationalTempoBand: 'low' | 'moderate' | 'high' | 'surge';
  resourceMobilizationBand: 'dormant' | 'low' | 'elevated' | 'high';
  personnelConcentrationBand: 'dispersed' | 'nominal' | 'concentrated' | 'massed';
  communicationPatternBand: 'silent' | 'routine' | 'elevated' | 'urgent';
  territorialReachBand: 'contracting' | 'stable' | 'expanding' | 'surging';
  logisticsIntensityBand: 'minimal' | 'standard' | 'heavy' | 'max';
}

// ─── Info-warfare client view (the P5 wall — no raw scalar) ───────────────────────────────────

// InterpretationBadge: closed-domain string imported from diplomacy.types.ts
// (DualUseSignal §4.2 reads BPD prior to infer how the rival reads the player's signal).
// P5-safe: interpretation_badge is 'posture'|'preparation'|'ambiguous' — never the raw
// rival_interpretation_bias float (server-only). Only the closed badge string leaks.
import type { InterpretationBadge } from '../diplomacy/diplomacy.types';
export type { InterpretationBadge };

/**
 * `InfoWarClientView` — the banded projection of the player's info-warfare state.
 * Used by `InformationWarfareProjectionService.toInfoWarClientView` (C10+C11).
 *
 * P5 wall: NO raw scalar exposed. The belief state is a NOISY estimate (never the truth).
 *   detection_probability / rival_interpretation_bias / suspected_infiltration_level
 *   are all stripped (server-only). The player sees only the buckets.
 *
 * DD-P5-REALIZATION: the Dead-Reckoning belief diverges from the true RivalState.
 *   A disinfo attack against a PULL rival shifts their decision (landed);
 *   the same attack against a PUSH rival is filtered (did not land).
 *   The player NEVER reads the rival's true intel_mode, regime, or raw pressure.
 *
 * ★ interpretationBadge (C11 carry from C10): the closed-domain read of how the rival
 *   interprets the player's last signal (DualUseSignal §4.2). The raw
 *   rival_interpretation_bias float stays server-only; only this badge string is exposed.
 *   Values: 'posture' | 'preparation' | 'ambiguous' | null (no Dual-Use state yet).
 */
export interface InfoWarClientView {
  rivalKey: string;
  /**
   * The player's Dead-Reckoning belief about the rival's posture.
   * This is a NOISY ESTIMATE — not the true RivalState.
   * 6-component soft-indicator vector derived from indirect signals.
   */
  deadReckoningBelief: SideChannelSignatureComposite | null;
  /** Inferred embed suspicion band (purge trap status) */
  suspectedInfiltrationBucket: SuspectedInfiltrationBucket;
  /** Whether an active surveillance op is running against this rival */
  surveillanceActive: boolean;
  /**
   * ★ interpretationBadge — how the rival interpreted the player's last dual-use signal.
   * Derived from dual_use_signal_state.interpretation_badge (already a closed-domain string).
   * The raw rival_interpretation_bias float (server-only) is stripped.
   * null if no Dual-Use state has been recorded for this rival yet.
   * P5-safe: 'posture' | 'preparation' | 'ambiguous' — NOT a raw scalar.
   */
  interpretationBadge: InterpretationBadge | null;
}

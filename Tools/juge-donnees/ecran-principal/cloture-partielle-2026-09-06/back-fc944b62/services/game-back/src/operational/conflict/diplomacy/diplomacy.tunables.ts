// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 2 (C2)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §10
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md (27 keys :76-253)
//                    docs/tech/04b_combat_and_conflict/pacifist_run_viability.md (3 keys :135-137)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md
//                       §Combat / conflict layer — diplomacy / §pacifist (C2 04b-C 2026-06-26)
//             — Diplomacy & Information Warfare C C2 — 2026-06-26 —
//
// `diplomacy.tunables.ts` — Registry-mirrored getters for all `diplomacy.*` + `pacifist.*` keys.
//
// R2.3 (NO inline numeric value for any diplomacy.* / pacifist.* key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults cited
// here are verbatim from gdd/14 §Combat / conflict layer — diplomacy — the single source of truth.
// If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter.
// The 30 canon keys (27 diplomacy.* + 3 pacifist.*) are REUSED at verbatim defaults.
// The 9 NEW [PROV-Y26Q2] keys are canon-silent magnitudes (OQ-C2 seeds + OQ-C4 cuts).
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
//
// Pattern: mirrors services/game-back/src/operational/conflict/rival/rival-ai.tunables.ts exactly.

import { TunablesStore } from '../../../config/tunables-store';

// ── Range constants for numeric keys (used by DIPLOMACY_TUNABLE_CAPS) ───────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by DIPLOMACY_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `DIPLOMACY_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-clamp` route and by C4+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 *
 * NOTE: composite keys have no numeric range (they are named buckets, not raw floats).
 *       Only numeric scalar keys appear here.
 */
export const DIPLOMACY_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── §4.3 Potlatch Bind (diplomacy_mechanics.md:126) ──────────────────────────────────────────
  'diplomacy.potlatch_reciprocity_deadline_ticks': { min: 4, max: 16 },

  // ── §4.4 Proof of Leverage (diplomacy_mechanics.md:154) ──────────────────────────────────────
  'diplomacy.proof_deterrence_duration_ticks': { min: 2, max: 15 },

  // ── §4.5 Shared Exposure Lock (diplomacy_mechanics.md:179) ───────────────────────────────────
  'diplomacy.shared_exposure_mutual_exposure_decay_per_tick': { min: -0.05, max: -0.01 },

  // ── §4.6 Revelation Trap (diplomacy_mechanics.md:201) ────────────────────────────────────────
  'diplomacy.revelation_offer_options_count': { min: 2, max: 5 },

  // ── §4.7 Sealed-Envelope Commitment (diplomacy_mechanics.md:226-227) ─────────────────────────
  'diplomacy.sealed_envelope_reveal_deadline_default_ticks': { min: 3, max: 12 },
  'diplomacy.sealed_envelope_target_hash_set_size': { min: 3, max: 10 },

  // ── §4.3 Potlatch Bind [PROV-Y26Q2] — Erlang-stash floor (C6) ───────────────────────────────
  'diplomacy.potlatch_minimum_gift_qty_cents': { min: 100, max: 10000 },

  // ── §4.8 Dispersal Suppression Pact (diplomacy_mechanics.md:251, 253) ────────────────────────
  'diplomacy.dispersal_suppressed_districts_max_per_pact': { min: 1, max: 6 },
  'diplomacy.dispersal_pact_duration_ticks': { min: 6, max: 30 },

  // ── §12 Pacifist (pacifist_run_viability.md:136) ─────────────────────────────────────────────
  'pacifist.e2e_test_max_real_time_days': { min: 60, max: 180 },

  // ── OQ-C4 CredibilityScoreBucket cuts [PROV-Y26Q2] ───────────────────────────────────────────
  // These are sanctioned numeric bounds — the only numbers in this file, NOT inline logic scalars.
  'diplomacy.credibility_bucket_cut_very_low_max': { min: -1.0, max: -0.01 },
  'diplomacy.credibility_bucket_cut_low_max': { min: -0.5, max: 0.5 },
  'diplomacy.credibility_bucket_cut_standard_max': { min: 0.01, max: 0.75 },
  'diplomacy.credibility_bucket_cut_high_max': { min: 0.5, max: 1.0 },
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-clamp route + C4+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 */
export function clampDiplomacyToRange(key: string, value: number): number {
  const range = DIPLOMACY_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `diplomacy.*` + `pacifist.*` keys consumed by C4+ mechanics. */
export const diplomacyTunables = {

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.1 Burn Notice — canon keys (diplomacy_mechanics.md:76-78)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.burn_trust_decay_per_failed_burn_bucket` — composite (R2.2).
   * Canon :76. Default composite:STANDARD (ref 0.25). Taux décroissance trust par burn raté.
   * VERBATIM-composite. used_by: BurnNoticeService.
   */
  get burnTrustDecayPerFailedBurnBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.burn_trust_decay_per_failed_burn_bucket',
      'DIPLOMACY_BURN_TRUST_DECAY_PER_FAILED_BURN_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.burn_threat_assessment_weight_of_committed_burn_bucket` — composite (R2.2).
   * Canon :77. Default composite:STANDARD (ref 0.40). Poids burn engagé dans threat_assessment rival.
   * VERBATIM-composite. used_by: BurnNoticeService.
   */
  get burnThreatAssessmentWeightOfCommittedBurnBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.burn_threat_assessment_weight_of_committed_burn_bucket',
      'DIPLOMACY_BURN_THREAT_ASSESSMENT_WEIGHT_OF_COMMITTED_BURN_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.burn_rival_retreat_threshold_base_bucket` — composite (R2.2).
   * Canon :78. Default composite:STANDARD (ref 0.70). Seuil retraite rival déclenché par burn.
   * VERBATIM-composite. used_by: BurnNoticeService.
   */
  get burnRivalRetreatThresholdBaseBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.burn_rival_retreat_threshold_base_bucket',
      'DIPLOMACY_BURN_RIVAL_RETREAT_THRESHOLD_BASE_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.2 Vulnerability Display — canon keys (diplomacy_mechanics.md:100-102)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.vuln_credibility_interpretation_threshold_bucket` — composite (R2.2).
   * Canon :100. Default composite:STANDARD (ref 0.55). Seuil interprétation credibilité.
   * VERBATIM-composite. used_by: VulnerabilityDisplayService.
   */
  get vulnCredibilityInterpretationThresholdBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.vuln_credibility_interpretation_threshold_bucket',
      'DIPLOMACY_VULN_CREDIBILITY_INTERPRETATION_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.vuln_credibility_accrual_per_backed_commitment_bucket` — composite (R2.2).
   * Canon :101. Default composite:STANDARD (ref 0.10). Accroissement crédibilité par commitment backed.
   * VERBATIM-composite. used_by: VulnerabilityDisplayService + CredibilityAccumulatorService.
   */
  get vulnCredibilityAccrualPerBackedCommitmentBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.vuln_credibility_accrual_per_backed_commitment_bucket',
      'DIPLOMACY_VULN_CREDIBILITY_ACCRUAL_PER_BACKED_COMMITMENT_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.vuln_probe_probability_below_threshold_bucket` — composite (R2.2).
   * Canon :102. Default composite:HIGH (ref 0.75). Probabilité sonde rival sous seuil credibilité.
   * VERBATIM-composite. used_by: VulnerabilityDisplayService.
   */
  get vulnProbeProbabilityBelowThresholdBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.vuln_probe_probability_below_threshold_bucket',
      'DIPLOMACY_VULN_PROBE_PROBABILITY_BELOW_THRESHOLD_BUCKET',
      'composite:HIGH',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.3 Potlatch Bind — canon keys (diplomacy_mechanics.md:126-129)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.potlatch_reciprocity_deadline_ticks` — scalar (integer).
   * Canon :126. Default 8, range 4..16. Délai réciprocité cadeau (ticks).
   * VERBATIM canon. used_by: PotlatchBindService.
   */
  get potlatchReciprocityDeadlineTicks(): number {
    return TunablesStore.resolveInt(
      'diplomacy.potlatch_reciprocity_deadline_ticks',
      'DIPLOMACY_POTLATCH_RECIPROCITY_DEADLINE_TICKS',
      8,
    );
  },

  /**
   * `diplomacy.potlatch_standing_penalty_full_refusal_bucket` — composite (R2.2).
   * Canon :127. Default composite:STANDARD (ref 0.20). Pénalité standing refus total.
   * VERBATIM-composite. used_by: PotlatchBindService.
   */
  get potlatchStandingPenaltyFullRefusalBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.potlatch_standing_penalty_full_refusal_bucket',
      'DIPLOMACY_POTLATCH_STANDING_PENALTY_FULL_REFUSAL_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.potlatch_standing_penalty_partial_reciprocity_bucket` — composite (R2.2).
   * Canon :128. Default composite:STANDARD (ref 0.08). Pénalité standing réciprocité partielle.
   * VERBATIM-composite. used_by: PotlatchBindService.
   */
  get potlatchStandingPenaltyPartialReciprocityBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.potlatch_standing_penalty_partial_reciprocity_bucket',
      'DIPLOMACY_POTLATCH_STANDING_PENALTY_PARTIAL_RECIPROCITY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.potlatch_tension_drop_on_full_reciprocity_bucket` — composite (R2.2).
   * Canon :129. Default composite:STANDARD (ref 0.15). Chute tension sur réciprocité complète.
   * VERBATIM-composite. used_by: PotlatchBindService.
   */
  get potlatchTensionDropOnFullReciprocityBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.potlatch_tension_drop_on_full_reciprocity_bucket',
      'DIPLOMACY_POTLATCH_TENSION_DROP_ON_FULL_RECIPROCITY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.potlatch_minimum_gift_qty_cents` [PROV-Y26Q2] — Erlang-stash floor.
   * System-9 stash floor re-anchor (system_9_erlang_stash.md L245: slot_capacity_S_cents min=1000).
   * Default 1000, range 100..10000. Min gift qty in cents. P2 no-free-action.
   * REGISTRY-FIRST: gdd/14 §4.3 Potlatch Bind row added before this getter (R2.3).
   * used_by: PotlatchBindService.
   */
  get potlatchMinimumGiftQtyCents(): number {
    return TunablesStore.resolveInt(
      'diplomacy.potlatch_minimum_gift_qty_cents',
      'DIPLOMACY_POTLATCH_MINIMUM_GIFT_QTY_CENTS',
      1000,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.4 Proof of Leverage — canon keys (diplomacy_mechanics.md:151-155)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.proof_skepticism_threshold_coil_supply_bucket` — composite (R2.2).
   * Canon :151. Default composite:STANDARD (ref 0.5). Seuil scepticisme Coil/supply.
   * VERBATIM-composite. used_by: ProofOfLeverageService.
   */
  get proofSkepticismThresholdCoilSupplyBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.proof_skepticism_threshold_coil_supply_bucket',
      'DIPLOMACY_PROOF_SKEPTICISM_THRESHOLD_COIL_SUPPLY_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.proof_skepticism_threshold_tarcum_personnel_bucket` — composite (R2.2).
   * Canon :152. Default composite:STANDARD (ref 0.45). Seuil scepticisme Tarcum/personnel.
   * VERBATIM-composite. used_by: ProofOfLeverageService.
   */
  get proofSkepticismThresholdTarcumPersonnelBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.proof_skepticism_threshold_tarcum_personnel_bucket',
      'DIPLOMACY_PROOF_SKEPTICISM_THRESHOLD_TARCUM_PERSONNEL_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.proof_skepticism_threshold_iron_throat_financial_bucket` — composite (R2.2).
   * Canon :153. Default composite:HIGH (ref 0.7). Seuil scepticisme Iron Throat/financial.
   * VERBATIM-composite. used_by: ProofOfLeverageService.
   */
  get proofSkepticismThresholdIronThroatFinancialBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.proof_skepticism_threshold_iron_throat_financial_bucket',
      'DIPLOMACY_PROOF_SKEPTICISM_THRESHOLD_IRON_THROAT_FINANCIAL_BUCKET',
      'composite:HIGH',
    );
  },

  /**
   * `diplomacy.proof_deterrence_duration_ticks` — scalar (integer).
   * Canon :154. Default 6, range 2..15. Durée deterrence après broadcast (ticks).
   * VERBATIM canon. used_by: ProofOfLeverageService.
   */
  get proofDeterrenceDurationTicks(): number {
    return TunablesStore.resolveInt(
      'diplomacy.proof_deterrence_duration_ticks',
      'DIPLOMACY_PROOF_DETERRENCE_DURATION_TICKS',
      6,
    );
  },

  /**
   * `diplomacy.proof_skepticism_hardening_per_failed_bluff_bucket` — composite (R2.2).
   * Canon :155. Default composite:STANDARD (ref 0.12). Durcissement scepticisme par bluff raté.
   * VERBATIM-composite. used_by: ProofOfLeverageService.
   */
  get proofSkepticismHardeningPerFailedBluffBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.proof_skepticism_hardening_per_failed_bluff_bucket',
      'DIPLOMACY_PROOF_SKEPTICISM_HARDENING_PER_FAILED_BLUFF_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.5 Shared Exposure Lock — canon keys (diplomacy_mechanics.md:177-179)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.shared_exposure_threshold_bucket` — composite (R2.2).
   * Canon :177. Default composite:STANDARD (ref 0.55). Seuil attention BPD partagée → auto-truce.
   * VERBATIM-composite. used_by: SharedExposureLockService.
   */
  get sharedExposureThresholdBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.shared_exposure_threshold_bucket',
      'DIPLOMACY_SHARED_EXPOSURE_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.shared_exposure_auto_truce_break_cost_bucket` — composite (R2.2).
   * Canon :178. Default composite:STANDARD (ref +0.3 BPD memory weight). Coût rupture auto-truce.
   * VERBATIM-composite. used_by: SharedExposureLockService.
   */
  get sharedExposureAutoTruceBreakCostBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.shared_exposure_auto_truce_break_cost_bucket',
      'DIPLOMACY_SHARED_EXPOSURE_AUTO_TRUCE_BREAK_COST_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.shared_exposure_mutual_exposure_decay_per_tick` — scalar (float, negative).
   * Canon :179. Default -0.02, range -0.01..-0.05. Décroissance mutual_exposure/tick.
   * VERBATIM canon. used_by: SharedExposureLockService.
   */
  get sharedExposureMutualExposureDecayPerTick(): number {
    return TunablesStore.resolveFloat(
      'diplomacy.shared_exposure_mutual_exposure_decay_per_tick',
      'DIPLOMACY_SHARED_EXPOSURE_MUTUAL_EXPOSURE_DECAY_PER_TICK',
      -0.02,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.6 Revelation Trap — canon keys (diplomacy_mechanics.md:201-203)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.revelation_offer_options_count` — scalar (integer).
   * Canon :201. Default 3, range 2..5. Nombre options offre Revelation Trap.
   * VERBATIM canon. used_by: RevelationTrapService.
   */
  get revelationOfferOptionsCount(): number {
    return TunablesStore.resolveInt(
      'diplomacy.revelation_offer_options_count',
      'DIPLOMACY_REVELATION_OFFER_OPTIONS_COUNT',
      3,
    );
  },

  /**
   * `diplomacy.revelation_inference_confidence_per_option_separation_bucket` — composite (R2.2).
   * Canon :202. Default composite:STANDARD (ref 0.7). Confiance inférence par séparation option.
   * VERBATIM-composite. used_by: RevelationTrapService.
   */
  get revelationInferenceConfidencePerOptionSeparationBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.revelation_inference_confidence_per_option_separation_bucket',
      'DIPLOMACY_REVELATION_INFERENCE_CONFIDENCE_PER_OPTION_SEPARATION_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.revelation_trap_detection_probability_iron_throat_bucket` — composite (R2.2).
   * Canon :203. Default composite:HIGH (ref 0.30). Probabilité détection piège Iron Throat.
   * Seeded draw (OQ-C2) — the seed prefix is sourced via revelationTrapDetectionSeedPrefix.
   * VERBATIM-composite. used_by: RevelationTrapService.
   */
  get revelationTrapDetectionProbabilityIronThroatBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.revelation_trap_detection_probability_iron_throat_bucket',
      'DIPLOMACY_REVELATION_TRAP_DETECTION_PROBABILITY_IRON_THROAT_BUCKET',
      'composite:HIGH',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.7 Sealed-Envelope Commitment — canon keys (diplomacy_mechanics.md:226-228)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.sealed_envelope_reveal_deadline_default_ticks` — scalar (integer).
   * Canon :226. Default 6, range 3..12. Délai reveal par défaut (ticks).
   * VERBATIM canon. used_by: SealedEnvelopeCommitmentService.
   */
  get sealedEnvelopeRevealDeadlineDefaultTicks(): number {
    return TunablesStore.resolveInt(
      'diplomacy.sealed_envelope_reveal_deadline_default_ticks',
      'DIPLOMACY_SEALED_ENVELOPE_REVEAL_DEADLINE_DEFAULT_TICKS',
      6,
    );
  },

  /**
   * `diplomacy.sealed_envelope_target_hash_set_size` — scalar (integer).
   * Canon :227. Default 5, range 3..10. Taille ensemble cibles hashées (cibles plausibles défense).
   * VERBATIM canon. used_by: SealedEnvelopeCommitmentService.
   */
  get sealedEnvelopeTargetHashSetSize(): number {
    return TunablesStore.resolveInt(
      'diplomacy.sealed_envelope_target_hash_set_size',
      'DIPLOMACY_SEALED_ENVELOPE_TARGET_HASH_SET_SIZE',
      5,
    );
  },

  /**
   * `diplomacy.sealed_envelope_failed_reveal_credibility_damage_bucket` — composite (R2.2).
   * Canon :228. Default composite:STANDARD (ref -0.25). Dommage crédibilité sur reveal raté.
   * VERBATIM-composite. used_by: SealedEnvelopeCommitmentService + CredibilityAccumulatorService.
   */
  get sealedEnvelopeFailedRevealCredibilityDamageBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.sealed_envelope_failed_reveal_credibility_damage_bucket',
      'DIPLOMACY_SEALED_ENVELOPE_FAILED_REVEAL_CREDIBILITY_DAMAGE_BUCKET',
      'composite:STANDARD',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §4.8 Dispersal Suppression Pact — canon keys (diplomacy_mechanics.md:251-253)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `diplomacy.dispersal_suppressed_districts_max_per_pact` — scalar (integer).
   * Canon :251. Default 3, range 1..6. Max districts supprimés par pact.
   * VERBATIM canon. used_by: DispersalSuppressionPactService.
   */
  get dispersalSuppressedDistrictsMaxPerPact(): number {
    return TunablesStore.resolveInt(
      'diplomacy.dispersal_suppressed_districts_max_per_pact',
      'DIPLOMACY_DISPERSAL_SUPPRESSED_DISTRICTS_MAX_PER_PACT',
      3,
    );
  },

  /**
   * `diplomacy.dispersal_joint_response_effectiveness_bucket` — composite (R2.2).
   * Canon :252. Default composite:STANDARD (ref 0.75). Efficacité réponse conjointe anti-entrant.
   * VERBATIM-composite. used_by: DispersalSuppressionPactService.
   */
  get dispersalJointResponseEffectivenessBucket(): string {
    return TunablesStore.resolveString(
      'diplomacy.dispersal_joint_response_effectiveness_bucket',
      'DIPLOMACY_DISPERSAL_JOINT_RESPONSE_EFFECTIVENESS_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `diplomacy.dispersal_pact_duration_ticks` — scalar (integer).
   * Canon :253. Default 12, range 6..30. Durée pact suppression (ticks).
   * VERBATIM canon. used_by: DispersalSuppressionPactService.
   */
  get dispersalPactDurationTicks(): number {
    return TunablesStore.resolveInt(
      'diplomacy.dispersal_pact_duration_ticks',
      'DIPLOMACY_DISPERSAL_PACT_DURATION_TICKS',
      12,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // §12 Pacifist Run Viability — canon keys (pacifist_run_viability.md:135-137)
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `pacifist.e2e_test_phase_late_threshold_bucket` — composite (R2.2).
   * Canon pacifist_run_viability.md:135. Default composite:STANDARD. Seuil phase LATE pour E2E.
   * VERBATIM-composite. used_by: PacifistViabilityValidator.
   */
  get pacifistE2eTestPhaseLateThresholdBucket(): string {
    return TunablesStore.resolveString(
      'pacifist.e2e_test_phase_late_threshold_bucket',
      'PACIFIST_E2E_TEST_PHASE_LATE_THRESHOLD_BUCKET',
      'composite:STANDARD',
    );
  },

  /**
   * `pacifist.e2e_test_max_real_time_days` — scalar (integer).
   * Canon pacifist_run_viability.md:136. Default 90, range 60..180.
   * Max real-time pour atteindre LATE en mode pacifist (jours).
   * VERBATIM canon. used_by: PacifistViabilityValidator.
   */
  get pacifistE2eTestMaxRealTimeDays(): number {
    return TunablesStore.resolveInt(
      'pacifist.e2e_test_max_real_time_days',
      'PACIFIST_E2E_TEST_MAX_REAL_TIME_DAYS',
      90,
    );
  },

  /**
   * `pacifist.violent_action_warning_modal_enabled` — boolean.
   * Canon pacifist_run_viability.md:137. Default true.
   * Toggle warning modal action violente en mode pacifist.
   * VERBATIM canon. used_by: PacifistViabilityValidator + UI.
   */
  get pacifistViolentActionWarningModalEnabled(): boolean {
    return TunablesStore.resolveBool(
      'pacifist.violent_action_warning_modal_enabled',
      'PACIFIST_VIOLENT_ACTION_WARNING_MODAL_ENABLED',
      true,
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — OQ-C2 seeded-draw seed prefixes (5 probabilistic mechanics)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Canon-silent magnitudes — sourced via TunablesStore, NEVER inlined.
  // Used as: makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`)

  /**
   * `diplomacy.vuln_display_interpretation_seed_prefix` [PROV-Y26Q2] — OQ-C2.
   * Seed prefix for Vulnerability Display probabilistic interpretation draw.
   * Default 'vuln_interp'. No Math.random(). Calibration TD.
   */
  get vulnDisplayInterpretationSeedPrefix(): string {
    return TunablesStore.resolveString(
      'diplomacy.vuln_display_interpretation_seed_prefix',
      'DIPLOMACY_VULN_DISPLAY_INTERPRETATION_SEED_PREFIX',
      'vuln_interp',
    );
  },

  /**
   * `diplomacy.proof_bluff_probe_seed_prefix` [PROV-Y26Q2] — OQ-C2.
   * Seed prefix for Proof-of-Leverage bluff-probe draw.
   * Default 'proof_bluff'. No Math.random(). Calibration TD.
   */
  get proofBluffProbeSeedPrefix(): string {
    return TunablesStore.resolveString(
      'diplomacy.proof_bluff_probe_seed_prefix',
      'DIPLOMACY_PROOF_BLUFF_PROBE_SEED_PREFIX',
      'proof_bluff',
    );
  },

  /**
   * `diplomacy.revelation_trap_detection_seed_prefix` [PROV-Y26Q2] — OQ-C2.
   * Seed prefix for Revelation-Trap detection draw.
   * Default 'reveal_trap'. No Math.random(). Calibration TD.
   */
  get revelationTrapDetectionSeedPrefix(): string {
    return TunablesStore.resolveString(
      'diplomacy.revelation_trap_detection_seed_prefix',
      'DIPLOMACY_REVELATION_TRAP_DETECTION_SEED_PREFIX',
      'reveal_trap',
    );
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // NEW [PROV-Y26Q2] keys — OQ-C4 CredibilityScoreBucket cuts (band edges on credibility float)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // The credibility float is in [-1.0, 1.0]. PROPOSED cuts = [-1.0, -0.25, 0.25, 1.0].
  // Bands: credibility <= veryLowMax → VERY_LOW; <= lowMax → LOW; <= standardMax → STANDARD; else → HIGH.

  /**
   * `diplomacy.credibility_bucket_cut_very_low_max` [PROV-Y26Q2] — OQ-C4.
   * Upper cut for VERY_LOW band on the credibility float. Default -0.25, range -1.0..-0.01.
   * The -0.25 failed-reveal hit is a natural cut (diplomacy_mechanics.md:228). Calibration TD.
   * used_by: CredibilityAccumulatorService.
   */
  get credibilityBucketCutVeryLowMax(): number {
    return TunablesStore.resolveFloat(
      'diplomacy.credibility_bucket_cut_very_low_max',
      'DIPLOMACY_CREDIBILITY_BUCKET_CUT_VERY_LOW_MAX',
      -0.25,
    );
  },

  /**
   * `diplomacy.credibility_bucket_cut_low_max` [PROV-Y26Q2] — OQ-C4.
   * Upper cut for LOW band on the credibility float. Default 0.0, range -0.5..0.5.
   * Calibration TD. used_by: CredibilityAccumulatorService.
   */
  get credibilityBucketCutLowMax(): number {
    return TunablesStore.resolveFloat(
      'diplomacy.credibility_bucket_cut_low_max',
      'DIPLOMACY_CREDIBILITY_BUCKET_CUT_LOW_MAX',
      0.0,
    );
  },

  /**
   * `diplomacy.credibility_bucket_cut_standard_max` [PROV-Y26Q2] — OQ-C4.
   * Upper cut for STANDARD band on the credibility float. Default 0.25, range 0.01..0.75.
   * Calibration TD. used_by: CredibilityAccumulatorService.
   */
  get credibilityBucketCutStandardMax(): number {
    return TunablesStore.resolveFloat(
      'diplomacy.credibility_bucket_cut_standard_max',
      'DIPLOMACY_CREDIBILITY_BUCKET_CUT_STANDARD_MAX',
      0.25,
    );
  },

  /**
   * `diplomacy.credibility_bucket_cut_high_max` [PROV-Y26Q2] — OQ-C4.
   * Upper cut for HIGH band on the credibility float (= ceiling). Default 1.0, range 0.5..1.0.
   * Calibration TD. used_by: CredibilityAccumulatorService.
   */
  get credibilityBucketCutHighMax(): number {
    return TunablesStore.resolveFloat(
      'diplomacy.credibility_bucket_cut_high_max',
      'DIPLOMACY_CREDIBILITY_BUCKET_CUT_HIGH_MAX',
      1.0,
    );
  },

};

/** Named alias used in NestJS DI (C2). */
export class DiplomacyTunables {
  // Expose all getters as instance methods so NestJS can inject the class.
  // The underlying implementation delegates to the module-level object above.

  // §4.1 Burn Notice
  get burnTrustDecayPerFailedBurnBucket() { return diplomacyTunables.burnTrustDecayPerFailedBurnBucket; }
  get burnThreatAssessmentWeightOfCommittedBurnBucket() { return diplomacyTunables.burnThreatAssessmentWeightOfCommittedBurnBucket; }
  get burnRivalRetreatThresholdBaseBucket() { return diplomacyTunables.burnRivalRetreatThresholdBaseBucket; }
  // §4.2 Vulnerability Display
  get vulnCredibilityInterpretationThresholdBucket() { return diplomacyTunables.vulnCredibilityInterpretationThresholdBucket; }
  get vulnCredibilityAccrualPerBackedCommitmentBucket() { return diplomacyTunables.vulnCredibilityAccrualPerBackedCommitmentBucket; }
  get vulnProbeProbabilityBelowThresholdBucket() { return diplomacyTunables.vulnProbeProbabilityBelowThresholdBucket; }
  // §4.3 Potlatch Bind
  get potlatchReciprocityDeadlineTicks() { return diplomacyTunables.potlatchReciprocityDeadlineTicks; }
  get potlatchStandingPenaltyFullRefusalBucket() { return diplomacyTunables.potlatchStandingPenaltyFullRefusalBucket; }
  get potlatchStandingPenaltyPartialReciprocityBucket() { return diplomacyTunables.potlatchStandingPenaltyPartialReciprocityBucket; }
  get potlatchTensionDropOnFullReciprocityBucket() { return diplomacyTunables.potlatchTensionDropOnFullReciprocityBucket; }
  get potlatchMinimumGiftQtyCents() { return diplomacyTunables.potlatchMinimumGiftQtyCents; }
  // §4.4 Proof of Leverage
  get proofSkepticismThresholdCoilSupplyBucket() { return diplomacyTunables.proofSkepticismThresholdCoilSupplyBucket; }
  get proofSkepticismThresholdTarcumPersonnelBucket() { return diplomacyTunables.proofSkepticismThresholdTarcumPersonnelBucket; }
  get proofSkepticismThresholdIronThroatFinancialBucket() { return diplomacyTunables.proofSkepticismThresholdIronThroatFinancialBucket; }
  get proofDeterrenceDurationTicks() { return diplomacyTunables.proofDeterrenceDurationTicks; }
  get proofSkepticismHardeningPerFailedBluffBucket() { return diplomacyTunables.proofSkepticismHardeningPerFailedBluffBucket; }
  // §4.5 Shared Exposure Lock
  get sharedExposureThresholdBucket() { return diplomacyTunables.sharedExposureThresholdBucket; }
  get sharedExposureAutoTruceBreakCostBucket() { return diplomacyTunables.sharedExposureAutoTruceBreakCostBucket; }
  get sharedExposureMutualExposureDecayPerTick() { return diplomacyTunables.sharedExposureMutualExposureDecayPerTick; }
  // §4.6 Revelation Trap
  get revelationOfferOptionsCount() { return diplomacyTunables.revelationOfferOptionsCount; }
  get revelationInferenceConfidencePerOptionSeparationBucket() { return diplomacyTunables.revelationInferenceConfidencePerOptionSeparationBucket; }
  get revelationTrapDetectionProbabilityIronThroatBucket() { return diplomacyTunables.revelationTrapDetectionProbabilityIronThroatBucket; }
  // §4.7 Sealed-Envelope Commitment
  get sealedEnvelopeRevealDeadlineDefaultTicks() { return diplomacyTunables.sealedEnvelopeRevealDeadlineDefaultTicks; }
  get sealedEnvelopeTargetHashSetSize() { return diplomacyTunables.sealedEnvelopeTargetHashSetSize; }
  get sealedEnvelopeFailedRevealCredibilityDamageBucket() { return diplomacyTunables.sealedEnvelopeFailedRevealCredibilityDamageBucket; }
  // §4.8 Dispersal Suppression Pact
  get dispersalSuppressedDistrictsMaxPerPact() { return diplomacyTunables.dispersalSuppressedDistrictsMaxPerPact; }
  get dispersalJointResponseEffectivenessBucket() { return diplomacyTunables.dispersalJointResponseEffectivenessBucket; }
  get dispersalPactDurationTicks() { return diplomacyTunables.dispersalPactDurationTicks; }
  // §12 Pacifist
  get pacifistE2eTestPhaseLateThresholdBucket() { return diplomacyTunables.pacifistE2eTestPhaseLateThresholdBucket; }
  get pacifistE2eTestMaxRealTimeDays() { return diplomacyTunables.pacifistE2eTestMaxRealTimeDays; }
  get pacifistViolentActionWarningModalEnabled() { return diplomacyTunables.pacifistViolentActionWarningModalEnabled; }
  // NEW [PROV-Y26Q2] OQ-C2 seeds
  get vulnDisplayInterpretationSeedPrefix() { return diplomacyTunables.vulnDisplayInterpretationSeedPrefix; }
  get proofBluffProbeSeedPrefix() { return diplomacyTunables.proofBluffProbeSeedPrefix; }
  get revelationTrapDetectionSeedPrefix() { return diplomacyTunables.revelationTrapDetectionSeedPrefix; }
  // NEW [PROV-Y26Q2] OQ-C4 cuts
  get credibilityBucketCutVeryLowMax() { return diplomacyTunables.credibilityBucketCutVeryLowMax; }
  get credibilityBucketCutLowMax() { return diplomacyTunables.credibilityBucketCutLowMax; }
  get credibilityBucketCutStandardMax() { return diplomacyTunables.credibilityBucketCutStandardMax; }
  get credibilityBucketCutHighMax() { return diplomacyTunables.credibilityBucketCutHighMax; }
}

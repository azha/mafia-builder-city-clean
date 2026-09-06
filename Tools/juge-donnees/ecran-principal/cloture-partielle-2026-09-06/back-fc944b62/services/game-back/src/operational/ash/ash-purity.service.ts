// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Ash — luxury-channel (the deterministic
//             purity grade a player builds from THREE levers: lab tier + refining passes − cook-adherence pauses) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T6/§6 (purity derivation — a pure,
//             no-persistence function, mirroring ColdChainService/HushAddictionService) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the purity surface is a closed
//             read-time BAND CUT/STANDARD/PURE/CRYSTALLINE, never the raw score nor the cut-points)
//             -- session:2026-06-06 (Phase 2c vector #2c — substances/Ash — Task 6) --
//
// `AshPurityService` — the PURE, DETERMINISTIC derivation of an Ash batch's purity (the distinct Ash mechanic, the
// analog of ColdChainService's temperature_status / HushAddictionService's loyalty band). It is a pure function of the
// THREE recorded player levers + the gdd/14 coefficients — NO persistence in the service, NO RNG, clamped to [0, 100]:
//   - purityScore(labTier, refiningPasses, damagedPauses) = tier_base[labTier] + refiningPasses × refining_pass_delta
//       − damagedPauses × damaged_pause_penalty, clamped to [0, 100]. The THREE levers, COMBINED: a higher lab tier
//       (T5 upgrade), more refining passes (T3 cook param), and fewer DAMAGED-pauses (T4 cook adherence) each raise the
//       score INDEPENDENTLY. Two identical (labTier, refiningPasses, damagedPauses) → an identical score (deterministic).
//   - purityBand(score) → the CLOSED qualitative band (CUT/STANDARD/PURE/CRYSTALLINE) from the gdd/14 ascending cut-points
//       (score < cut → CUT; cut ≤ score < standard → STANDARD; standard ≤ score < pure → PURE; score ≥ pure →
//       CRYSTALLINE). The band is the ONLY purity signal the projection surfaces (R2.2 — never the raw score / cut-points).
//   - payoutMultiplier(band) → the honor-sale margin multiplier (gdd/14 payout_multiplier[band], ascending). Consumed
//       LATER by AshAppointmentService.honor (T8 — the Ash sale); T6 only EXPOSES it (it is never applied here).
//
// THE STAMP (where this service is CALLED): at COOK COMPLETION, the substance-generic cook-advance tick (ProductionCook-
// AdvanceService, MINUTE/8) computes purityScore() for a COMPLETING ASH (luxuryChannel) cook from that cook's recorded
// refining_passes + damaged_pauses_during_cook + the lab's lab_tier, and stamps it onto the produced batch_purity row
// (set-based, once, in the SAME completion transaction). NON-luxuryChannel substances (Brindle/Crick/Hush) SKIP this
// entirely — the cook-advance gates on descriptor.luxuryChannel===true, so no batch_purity row is created and their
// completion path is byte-identical. This service has NO knowledge of that gate; it is a pure derivation the caller
// invokes only for the gated substances.
//
// R2.2: the raw score + the raw cut-points are INTERNAL (BO-only) — the projection surfaces ONLY purityBand(). R2.3: the
// tier bases / pass-delta / pause-penalty / cut-points / payout multipliers are read ONLY from ashPurityTunables (the
// gdd/14 mirror); ZERO inline numeric literal here (the clamp bounds are the documented structural 0 / scale ceiling).

import { Injectable } from '@nestjs/common';

import { ashPurityTunables, PURITY_SCORE_MIN, getPurityScoreMax } from './ash-purity-tunables';

/** The CLOSED qualitative purity band — the ONLY purity signal exposed (R2.2; never the raw score nor the cut-points).
 *  Ascending: CUT (cut, low margin) < STANDARD < PURE < CRYSTALLINE (the purest, the highest honor-sale margin). */
export type AshPurityBand = 'CUT' | 'STANDARD' | 'PURE' | 'CRYSTALLINE';

@Injectable()
export class AshPurityService {
  /**
   * Derive an Ash batch's `purity_score` (0..100) from the THREE recorded player levers — DETERMINISTIC, NO RNG, clamped:
   *   score = tier_base[labTier] + refiningPasses × refining_pass_delta − damagedPauses × damaged_pause_penalty
   * then clamped to [PURITY_SCORE_MIN, PURITY_SCORE_MAX] (= [0, the scale ceiling] — the batch_purity CHECK enforces the
   * same bound at the DB level). The THREE levers move the score INDEPENDENTLY: a higher `labTier` raises the floor
   * (tier_base ascending), more `refiningPasses` add the pass-delta, more `damagedPauses` subtract the pause-penalty.
   *
   * `labTier` resolves its base from `tierBase[labTier]`; a tier with no shipped base (e.g. an out-of-range tier beyond
   * the configured 1..3) falls back to the Tier-1 base (defensive — the upgrade-tier action caps lab_tier at
   * specialized_lab.max_tier, so this fallback is never hit in practice, but it keeps the function total). All
   * coefficients are the gdd/14 mirror values (R2.3 — no inline literal).
   */
  purityScore(labTier: number, refiningPasses: number, damagedPauses: number): number {
    const base = ashPurityTunables.tierBase[labTier] ?? ashPurityTunables.tierBase[1];
    const raw =
      base +
      refiningPasses * ashPurityTunables.refiningPassDelta -
      damagedPauses * ashPurityTunables.damagedPausePenalty;
    // Clamp to the closed [0, ceiling] interval (deterministic guard — the score never escapes the band scale, and the
    // batch_purity CHECK (0..100) would otherwise reject an out-of-range insert). P23-T8: getPurityScoreMax()
    // reads the getter per-call so a DB override of purity.band_cutpoints.crystalline is reflected immediately.
    return Math.min(getPurityScoreMax(), Math.max(PURITY_SCORE_MIN, raw));
  }

  /**
   * Map a raw `purity_score` → the CLOSED qualitative band (R2.2). The gdd/14 cut-points are ascending EXCLUSIVE upper
   * bounds: score < cut → CUT; cut ≤ score < standard → STANDARD; standard ≤ score < pure → PURE; score ≥ pure →
   * CRYSTALLINE (the open-ended top — `band_cutpoints.crystalline` documents the scale ceiling, not a live boundary).
   * The player sees the BAND, never the raw score nor the cut-points. A pure function of the score + the gdd/14 mirror
   * values (R2.3 — no inline literal).
   */
  purityBand(score: number): AshPurityBand {
    const { cut, standard, pure } = ashPurityTunables.bandCutpoints;
    if (score >= pure) return 'CRYSTALLINE';
    if (score >= standard) return 'PURE';
    if (score >= cut) return 'STANDARD';
    return 'CUT';
  }

  /**
   * The honor-sale PAYOUT MULTIPLIER for a band (gdd/14 payout_multiplier[band], ascending — CUT 1.0 < STANDARD 1.5 <
   * PURE 2.5 < CRYSTALLINE 4.0). A purer batch sells at a higher margin. CONSUMED LATER by AshAppointmentService.honor
   * (T8 — the Ash sale: street value = base × descriptor.marginMultiplierVsBrindle × this); T6 only EXPOSES it (it is
   * NEVER applied here — purity derivation is decoupled from the sale). A pure function of the band + the gdd/14 mirror
   * values (R2.3 — no inline literal).
   */
  payoutMultiplier(band: AshPurityBand): number {
    switch (band) {
      case 'CRYSTALLINE':
        return ashPurityTunables.payoutMultiplier.crystalline;
      case 'PURE':
        return ashPurityTunables.payoutMultiplier.pure;
      case 'STANDARD':
        return ashPurityTunables.payoutMultiplier.standard;
      default:
        return ashPurityTunables.payoutMultiplier.cut;
    }
  }
}

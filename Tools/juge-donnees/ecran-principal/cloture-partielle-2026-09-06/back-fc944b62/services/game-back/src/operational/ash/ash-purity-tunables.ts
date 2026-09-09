// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-2b vector #2c (Ash) T0 — the `purity.*`
//             registry keys (added Phase-2c T0): `purity.tier_base.{1,2,3}` / `purity.refining_pass_delta` /
//             `purity.damaged_pause_penalty` / `purity.band_cutpoints.{cut,standard,pure,crystalline}` /
//             `purity.payout_multiplier.{cut,standard,pure,crystalline}` +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T6 (purity derivation) + §7 (config
//             & tunables, R2.3) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the band is the surface, never the
//             raw score nor the cut-points)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 6) --
//
// Ash PURITY tunables (Phase-2c vector #2c — Ash luxury channel) — the `purity.*` keys THIS slice's AshPurityService
// (T6) CONSUMES to derive a batch's `purity_score` (0..100) from the THREE player levers, then map it to a qualitative
// band + a payout multiplier. The score is computed ONCE at cook completion (the deterministic stamp) and surfaced only
// as a band (R2.2 — never the raw score nor the cut-points). The PAYOUT MULTIPLIER is consumed LATER by the appointment
// honor sale (T8); T6 only exposes it.
//
// THE THREE LEVERS, COMBINED (spec §4/§7):
//   purity_score = tier_base[labTier] + refiningPasses × refining_pass_delta − damagedPauses × damaged_pause_penalty
//                  (clamped to [0, 100]).
//   - tier_base[labTier]   — the SPECIALIZED_LAB tier floor (Tier-1 40, Tier-2 55, Tier-3 70 — a higher lab yields purer
//                            Ash; the lab-tier lever, raised by the upgrade-tier action T5). Strictly ascending.
//   - refining_pass_delta  — the gain per refining pass chosen at startCook (+10/pass; the time↔purity lever T3 — more
//                            passes ⇒ a longer cook AND a higher score).
//   - damaged_pause_penalty— the loss per DAMAGED-pause interruption mid-cook (−15/pause; the cook-adherence lever T4 —
//                            a raid mid-cook lowers the score). The inverse lever.
//
// THE BANDS (spec §4/§7 — ascending EXCLUSIVE upper cut-points): CUT (score < cut) | STANDARD (cut ≤ score < standard) |
// PURE (standard ≤ score < pure) | CRYSTALLINE (score ≥ pure). The `crystalline` key (100) documents the scale ceiling
// (= the clamp cap); the CRYSTALLINE band is the open-ended top (score ≥ `pure`), so the band derivation reads `cut` /
// `standard` / `pure` as the three live cut-points.
//
// THE PAYOUT MULTIPLIER (spec §4/§7 — the honor-sale multiplier T8 CONSUMES, exposed here): per band, ascending
// (CUT 1.0 | STANDARD 1.5 | PURE 2.5 | CRYSTALLINE 4.0). A purer batch sells at a higher margin. NOT applied at T6 (T6
// only exposes payoutMultiplier(band)); the honor endpoint multiplies the base street value by it.
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md` §Phase-2b vector #2c (Ash) T0 (cited per key, with the
// upstream design-spec source). Surfaced as env-overridable fallbacks so this file stays a faithful MIRROR of the single
// source of truth. If the registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
// ZERO inline numeric literals in the service — it reads ONLY these resolved values. All `purity.*` keys are
// genuinely-NEW T0 keys (FLAGGED `[PROV-Y26Q2]`, calibrate downstream).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved Ash purity tunables — the per-tier base / pass-delta / pause-penalty / band cut-points / payout multipliers
 * the AshPurityService reads. All keys are gdd/14 §Phase-2b vector #2c (Ash) T0 (R2.3 — NOT inline). The score
 * coefficients + cut-points are integers; the payout multipliers are floats. Env overrides are TEST-ONLY (unset in
 * prod/dev → the registry defaults hold byte-for-byte). The tier bases are keyed by lab_tier (1/2/3); the band
 * cut-points / payout multipliers are keyed by band. DB-override > env > default (Phase-23).
 */
export const ashPurityTunables = {
  /**
   * purity.tier_base.<labTier> — the base purity_score floor of a specialized_lab at lab_tier (1/2/3), before the
   * refining-pass gain and the damaged-pause penalty. Strictly ascending (40 < 55 < 70 — a higher lab yields purer Ash).
   * Keyed by the lab_tier integer. `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  tierBase: {
    get 1(): number { return TunablesStore.resolveInt('purity.tier_base.1', 'PURITY_TIER_BASE_1', 40); },
    get 2(): number { return TunablesStore.resolveInt('purity.tier_base.2', 'PURITY_TIER_BASE_2', 55); },
    get 3(): number { return TunablesStore.resolveInt('purity.tier_base.3', 'PURITY_TIER_BASE_3', 70); },
  } as Record<number, number>,
  /**
   * purity.refining_pass_delta — the purity_score gain per refining pass chosen at startCook (the time↔purity lever T3 —
   * more passes ⇒ a higher score AND a longer cook). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  get refiningPassDelta(): number {
    return TunablesStore.resolveInt('purity.refining_pass_delta', 'PURITY_REFINING_PASS_DELTA', 10);
  },
  /**
   * purity.damaged_pause_penalty — the purity_score loss per DAMAGED-pause interruption mid-cook (the cook-adherence
   * inverse lever T4 — a raid mid-cook lowers the score). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  get damagedPausePenalty(): number {
    return TunablesStore.resolveInt('purity.damaged_pause_penalty', 'PURITY_DAMAGED_PAUSE_PENALTY', 15);
  },
  /**
   * purity.band_cutpoints.<band> — the ascending EXCLUSIVE upper cut-points of the qualitative purity bands. cut < score
   * → CUT; cut ≤ score < standard → STANDARD; standard ≤ score < pure → PURE; score ≥ pure → CRYSTALLINE. `crystalline`
   * documents the scale ceiling (= the clamp cap), not a live cut-point. `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  bandCutpoints: {
    get cut(): number { return TunablesStore.resolveInt('purity.band_cutpoints.cut', 'PURITY_BAND_CUTPOINT_CUT', 25); },
    get standard(): number { return TunablesStore.resolveInt('purity.band_cutpoints.standard', 'PURITY_BAND_CUTPOINT_STANDARD', 50); },
    get pure(): number { return TunablesStore.resolveInt('purity.band_cutpoints.pure', 'PURITY_BAND_CUTPOINT_PURE', 75); },
    get crystalline(): number { return TunablesStore.resolveInt('purity.band_cutpoints.crystalline', 'PURITY_BAND_CUTPOINT_CRYSTALLINE', 100); },
  },
  /**
   * purity.payout_multiplier.<band> — the honor-sale payout multiplier per band, ascending (CUT 1.0 < STANDARD 1.5 <
   * PURE 2.5 < CRYSTALLINE 4.0). Consumed LATER by AshAppointmentService.honor (T8 — the Ash sale margin); T6 only
   * EXPOSES it via payoutMultiplier(band). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  payoutMultiplier: {
    get cut(): number { return TunablesStore.resolveFloat('purity.payout_multiplier.cut', 'PURITY_PAYOUT_MULTIPLIER_CUT', 1.0); },
    get standard(): number { return TunablesStore.resolveFloat('purity.payout_multiplier.standard', 'PURITY_PAYOUT_MULTIPLIER_STANDARD', 1.5); },
    get pure(): number { return TunablesStore.resolveFloat('purity.payout_multiplier.pure', 'PURITY_PAYOUT_MULTIPLIER_PURE', 2.5); },
    get crystalline(): number { return TunablesStore.resolveFloat('purity.payout_multiplier.crystalline', 'PURITY_PAYOUT_MULTIPLIER_CRYSTALLINE', 4.0); },
  },
};

/** The purity-score clamp floor — structural 0 (DB CHECK enforces 0..100). */
export const PURITY_SCORE_MIN = 0;

/**
 * The purity-score clamp ceiling — derived from `band_cutpoints.crystalline` (the scale ceiling).
 * P23-T8: changed from a module-load-captured const to a getter so a DB override of
 * `purity.band_cutpoints.crystalline` is reflected at the next call without a restart.
 * NOT a separate tunable — the floor is structural 0, the cap is the documented scale ceiling.
 */
export function getPurityScoreMax(): number {
  return ashPurityTunables.bandCutpoints.crystalline;
}

// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2 (all 4 mechanics tunables)
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Market (from 04c §2) lines 915-942
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 1 (C1)
//             — D1b C1 — 2026-06-16
//
// `market-tunables.ts` — REUSE getters for the 15 registry `market.*` keys (gdd/14:919-929,940-942).
// Pattern: mirrors `selling-tunables.ts` getter pattern exactly.
//
// R2.3 (NO inline numeric value for any `market.*` key): all values route through TunablesStore.resolve*
// with the registry key name as the first arg. The defaults cited here are verbatim from gdd/14 §Market
// (the single source of truth — do NOT change them here; change gdd/14 + same-commit backport R9.3).
//
// REUSE (cited): the 4 projection buckets (lane_confidence_bucket / q_inferred_bucket /
// realised_price_multiplier_bucket / lambda_bucket) already exist upstream as T.ui.substance_market.*
// presentation buckets (gdd/14:1912-2072 §UI — Substance Market). C1 computes the bucket from internal
// state — it does NOT re-declare bucket enums (market_mechanics.md:217 NOTE: this chunk creates no new
// business bucket). The T.ui.* rows are cited in market-projection.service.ts.
//
// DD10 registry-wins: the code consumes the SHORT registry key names from gdd/14 §Market, not the long
// tech-doc names from market_mechanics.md §2 Tunables sections. The reconciliation map (17 long names →
// 15 registry keys) is documented at closeout (C9). NO value/range is rewritten here.
//
// Precedence: DB-override > env > gdd/14 default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';

/** Registry-mirrored getters for all 15 `market.*` tunable keys (gdd/14:919-929,940-942). */
export const marketTunables = {
  // ── 2.1 Lane Collapse Pricing — 5 keys (gdd/14:919-922) ──────────────────────────────────────────────

  /**
   * `market.lane_confidence_gain_alpha` — EMA confidence gain per in-lane deal.
   * c ← c + α·(1−c) (market_mechanics.md:52). Default 0.08, range 0.02..0.20 (gdd/14:919).
   * Env-override: MARKET_LANE_CONFIDENCE_GAIN_ALPHA (test-only).
   */
  get laneConfidenceGainAlpha(): number {
    return TunablesStore.resolveFloat('market.lane_confidence_gain_alpha', 'MARKET_LANE_CONFIDENCE_GAIN_ALPHA', 0.08);
  },

  /**
   * `market.lane_collapse_depth_kappa` — collapse depth per off-lane deal.
   * c ← c·(1−κ) (market_mechanics.md:55). Default 0.6, range 0.3..0.9 (gdd/14:920).
   * Env-override: MARKET_LANE_COLLAPSE_DEPTH_KAPPA (test-only).
   */
  get laneCollapseDepthKappa(): number {
    return TunablesStore.resolveFloat('market.lane_collapse_depth_kappa', 'MARKET_LANE_COLLAPSE_DEPTH_KAPPA', 0.6);
  },

  /**
   * `market.lane_jam_refractory_minutes` — jam timer duration in in-game minutes.
   * t_refractory ← T_jam on collapse (market_mechanics.md:56). Default 90, range 30..240 (gdd/14:921).
   * Env-override: MARKET_LANE_JAM_REFRACTORY_MINUTES (test-only).
   */
  get laneJamRefractoryMinutes(): number {
    return TunablesStore.resolveInt('market.lane_jam_refractory_minutes', 'MARKET_LANE_JAM_REFRACTORY_MINUTES', 90);
  },

  /**
   * `market.lane_c_hi` — high-confidence threshold; above this, deals clear fast (market_mechanics.md:62).
   * Default 0.70, range 0.50..0.90 (gdd/14:922 — combined row `lane_c_hi / lane_c_lo`).
   * Env-override: MARKET_LANE_C_HI (test-only).
   */
  get laneCHi(): number {
    return TunablesStore.resolveFloat('market.lane_c_hi', 'MARKET_LANE_C_HI', 0.70);
  },

  /**
   * `market.lane_c_lo` — low-confidence threshold; below this (or while t_refractory>0), scatter applies
   * (market_mechanics.md:63). Default 0.35, range 0.15..0.50 (gdd/14:922 — combined row).
   * Env-override: MARKET_LANE_C_LO (test-only).
   * 04e-A1 C5: GLOBAL lever (E-POL-04 substance scheduling), body-wrapped — no signature change, zero
   * call-site churn; empty overlay → base byte-identical (design §2.2).
   */
  get laneCLo(): number {
    const base = TunablesStore.resolveFloat('market.lane_c_lo', 'MARKET_LANE_C_LO', 0.35);
    return EffectOverlayStore.applyModifiers('market.lane_c_lo', base);
  },

  // ── 2.2 Composition Telegraph — 3 keys (gdd/14:923-925) ─────────────────────────────────────────────

  /**
   * `market.composition_roster_slots` — rolling roster capacity (slots per market region).
   * Default 24, range 12..48 (gdd/14:923). 2 B/slot (market_mechanics.md:89).
   * Env-override: MARKET_COMPOSITION_ROSTER_SLOTS (test-only).
   */
  get compositionRosterSlots(): number {
    return TunablesStore.resolveInt('market.composition_roster_slots', 'MARKET_COMPOSITION_ROSTER_SLOTS', 24);
  },

  /**
   * `market.composition_observer_noise_eta` — Gaussian observer noise std-dev (η).
   * ε~N(0,η²) computed once per day from day seed (market_mechanics.md:95). Default 0.30, range 0.10..0.60
   * (gdd/14:924). C4: day-seeded, no per-frame RNG.
   * Env-override: MARKET_COMPOSITION_OBSERVER_NOISE_ETA (test-only).
   */
  get compositionObserverNoiseEta(): number {
    return TunablesStore.resolveFloat('market.composition_observer_noise_eta', 'MARKET_COMPOSITION_OBSERVER_NOISE_ETA', 0.30);
  },

  /**
   * `market.composition_tier_weights` — buyer-tier weight vector [1.0, 1.5, 2.5, 4.0] (4 tiers).
   * tier_w used in q_inferred formula (market_mechanics.md:94). Default '[1.0,1.5,2.5,4.0]',
   * max tier 4 ≤ 6.0 (gdd/14:925). Stored as JSON string in the registry.
   * Env-override: MARKET_COMPOSITION_TIER_WEIGHTS (test-only).
   */
  get compositionTierWeights(): [number, number, number, number] {
    const raw = TunablesStore.resolveString(
      'market.composition_tier_weights',
      'MARKET_COMPOSITION_TIER_WEIGHTS',
      '[1.0,1.5,2.5,4.0]',
    );
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((v) => typeof v === 'number')) {
        return parsed as [number, number, number, number];
      }
    } catch {
      // fall through to default
    }
    return [1.0, 1.5, 2.5, 4.0];
  },

  // ── 2.3 Wear-Mark Premium — 3 keys (gdd/14:926-928) ─────────────────────────────────────────────────

  /**
   * `market.wear_premium_k` — sigmoid multiplier magnitude (k in multiplier formula).
   * multiplier_cautious = 1 − k·sigmoid(S − S_cutoff) (market_mechanics.md:134). Default 0.18, range
   * 0.05..0.35 (gdd/14:926).
   * Env-override: MARKET_WEAR_PREMIUM_K (test-only).
   */
  get wearPremiumK(): number {
    return TunablesStore.resolveFloat('market.wear_premium_k', 'MARKET_WEAR_PREMIUM_K', 0.18);
  },

  /**
   * `market.wear_s_cutoff` — sigmoid S-score cutoff (S_cutoff in multiplier formula).
   * (market_mechanics.md:134). Default 0.55, range 0.30..0.80 (gdd/14:927).
   * Env-override: MARKET_WEAR_S_CUTOFF (test-only).
   */
  get wearSCutoff(): number {
    return TunablesStore.resolveFloat('market.wear_s_cutoff', 'MARKET_WEAR_S_CUTOFF', 0.55);
  },

  /**
   * `market.wear_demographic_invert_share` — fraction of districts seeded with pristine_share > 0.5
   * (Glass-tier inversion, market_mechanics.md:130). Default 0.25, range 0.10..0.50 (gdd/14:928).
   * Env-override: MARKET_WEAR_DEMOGRAPHIC_INVERT_SHARE (test-only).
   */
  get wearDemographicInvertShare(): number {
    return TunablesStore.resolveFloat('market.wear_demographic_invert_share', 'MARKET_WEAR_DEMOGRAPHIC_INVERT_SHARE', 0.25);
  },

  // ── 2.3 Wear-Mark Premium — 4 NEW registry-add keys (gdd/14 C4 additive, R9.3-additive) ─────────
  // These 4 keys are NEW additions to the registry by D1b C4 (not pre-existing at baseline).
  // They are flagged [PROPOSED DEFAULT — tunable][PROV-Y26Q2] in gdd/14 §Market (registry-add).
  // Canon under-specifies them: market_mechanics.md:133 gives the formula shape but no values for
  // w1/w2/w3; market_mechanics.md:151 gives wear_decay_per_repackaging default (0.40).
  // The coder resolves the w1/w2/w3 as equal-weight (user-confirmed default per plan Task 4).

  /**
   * `market.wear_w1` — S-score weight for 1/hop_count in the Wear-Mark sigmoid formula.
   * S = w1·(1/hop) + w2·(1/transit) + w3·pristine_flag (market_mechanics.md:133).
   * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: 0.333 (equal-weight — user-confirmed default).
   *   Canon gives formula shape only; calibration deferred to C9.
   * Env-override: MARKET_WEAR_W1 (test-only).
   */
  get wearW1(): number {
    return TunablesStore.resolveFloat('market.wear_w1', 'MARKET_WEAR_W1', 0.333);
  },

  /**
   * `market.wear_w2` — S-score weight for 1/transit_days in the Wear-Mark sigmoid formula.
   * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: 0.333 (equal-weight — user-confirmed default).
   * Env-override: MARKET_WEAR_W2 (test-only).
   */
  get wearW2(): number {
    return TunablesStore.resolveFloat('market.wear_w2', 'MARKET_WEAR_W2', 0.333);
  },

  /**
   * `market.wear_w3` — S-score weight for pristine_flag in the Wear-Mark sigmoid formula.
   * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: 0.334 (equal-weight, sums to 1.0 with w1+w2).
   * Env-override: MARKET_WEAR_W3 (test-only).
   */
  get wearW3(): number {
    return TunablesStore.resolveFloat('market.wear_w3', 'MARKET_WEAR_W3', 0.334);
  },

  /**
   * `market.wear_decay_per_repackaging` — pristine_flag decay per repackaging event.
   * new_pristine_flag = current × (1 − wear_decay_per_repackaging) (market_mechanics.md:151).
   * [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: 0.40 (tech-doc default; range 0.20..0.70).
   * Registry-add: 0 occurrences at C4 baseline.
   * Env-override: MARKET_WEAR_DECAY_PER_REPACKAGING (test-only).
   */
  get wearDecayPerRepackaging(): number {
    return TunablesStore.resolveFloat('market.wear_decay_per_repackaging', 'MARKET_WEAR_DECAY_PER_REPACKAGING', 0.40);
  },

  // ── 2.4 Carrying-Capacity Haze — 4 keys (gdd/14:929,940-942) ────────────────────────────────────────
  // NOTE: 3 of these 4 keys appear under `T.conflict.*` in the migration-map (gdd/14:4034-4036) while
  // `district_K_overshoot_decay` is under `T.market.*` (gdd/14:4014). The authoritative registry rows
  // (gdd/14:929,940-942) name them `district_K_*` with source `04c §2.4` — they ARE market 2.4 keys.
  // The namespace re-route question (T.conflict.* → T.market.*?) is flagged DD10 report-only / closeout
  // (C9) — the coder does NOT reassign of own authority. The code consumes the registry short names.

  /**
   * `market.district_K_overshoot_decay` — permanent K-decay per overshoot-tick above grace (δ_K).
   * K ← K·(1−δ_K) when λ>1.0 for T_over≥grace (market_mechanics.md:173). Default 0.02, range 0.005..0.05
   * (gdd/14:929). DD10 flag: gdd/14:4014 maps this to T.market.* — consistent; the 3 others are T.conflict.*.
   * Env-override: MARKET_DISTRICT_K_OVERSHOOT_DECAY (test-only).
   */
  get districtKOvershootDecay(): number {
    return TunablesStore.resolveFloat('market.district_K_overshoot_decay', 'MARKET_DISTRICT_K_OVERSHOOT_DECAY', 0.02);
  },

  /**
   * `market.district_K_overshoot_grace_days` — consecutive overshoot ticks before permanent K-damage.
   * T_over ≥ grace → K permanently damaged (market_mechanics.md:172). Default 5, range 2..14 (gdd/14:940).
   * DD10 flag: gdd/14:4035 maps this to T.conflict.* — inconsistent with source 04c §2.4; report-only C9.
   * Env-override: MARKET_DISTRICT_K_OVERSHOOT_GRACE_DAYS (test-only).
   */
  get districtKOvershootGraceDays(): number {
    return TunablesStore.resolveInt('market.district_K_overshoot_grace_days', 'MARKET_DISTRICT_K_OVERSHOOT_GRACE_DAYS', 5);
  },

  /**
   * `market.district_K_haze_tiers` — λ thresholds for visible cues {0.6, 0.8, 1.0}.
   * graffiti ≥0.6 / boarding ≥0.8 / notices ≥1.0 (market_mechanics.md:169-171). Default '{0.6,0.8,1.0}',
   * each ±0.10 (gdd/14:941). DD10 flag: gdd/14:4036 maps this to T.conflict.* — report-only C9.
   * Env-override: MARKET_DISTRICT_K_HAZE_TIERS (test-only).
   */
  get districtKHazeTiers(): [number, number, number] {
    const raw = TunablesStore.resolveString(
      'market.district_K_haze_tiers',
      'MARKET_DISTRICT_K_HAZE_TIERS',
      '[0.6,0.8,1.0]',
    );
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((v) => typeof v === 'number')) {
        return parsed as [number, number, number];
      }
    } catch {
      // fall through to default
    }
    return [0.6, 0.8, 1.0];
  },

  /**
   * `market.district_K_civic_recovery_rate` — partial K-recovery rate per tick when λ < 0.5 +
   * civic-investment (market_mechanics.md:176). Default 0.005/tick, range 0.001..0.02 (gdd/14:942).
   * DD10 flag: gdd/14:4034 maps this to T.conflict.* — report-only C9.
   * K never returns above world-gen baseline (market_mechanics.md:176 HARD invariant).
   * Env-override: MARKET_DISTRICT_K_CIVIC_RECOVERY_RATE (test-only).
   */
  get districtKCivicRecoveryRate(): number {
    return TunablesStore.resolveFloat('market.district_K_civic_recovery_rate', 'MARKET_DISTRICT_K_CIVIC_RECOVERY_RATE', 0.005);
  },
};

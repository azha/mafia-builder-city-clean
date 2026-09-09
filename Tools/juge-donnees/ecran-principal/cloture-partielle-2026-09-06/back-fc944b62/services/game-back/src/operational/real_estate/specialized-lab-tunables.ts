// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-2b vector #2c (Ash) T0 — the
//             `specialized_lab.max_tier` + `specialized_lab.upgrade_cost_ratio.<targetTier>` registry keys (added
//             Phase-2c T0) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T5 (lab tier + upgrade action) + §7
//             (config & tunables, R2.3) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention — ratio × the STANDARD-
//             cover reference conversion cost, the SAME convention real_estate.acquisition_cost_ratio /
//             operational.repair.cost_ratio REUSE)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 5) --
//
// Specialized-lab TIER tunables (Phase-2c vector #2c — Ash luxury channel) — the `specialized_lab.*` keys THIS slice's
// SpecializedLabService (T5) CONSUMES: the TIER CAP (`max_tier` — the upgrade-tier action refuses once lab_tier reaches
// it) + the per-target-tier UPGRADE COST RATIO (the cash cost of raising a specialized_lab's lab_tier by one, as a
// ratio of the M1 conversion-cost reference). T5 = a player UPGRADE-TIER action raises a SPECIALIZED_LAB's lab_tier by
// one (cash debit, capped): debit economy_states atomically guarded `WHERE cash >= cost` → lab_tier++. A higher tier
// later yields purer Ash batches (the lab-tier lever of AshPurityService — T6; purity itself is NOT here).
//
// THE COST IS KEYED BY THE TARGET TIER (the tier the upgrade MOVES TO): upgrading lab_tier 1→2 costs
// `specialized_lab.upgrade_cost_ratio.2`; 2→3 costs `.3` (a strictly-increasing curve — gdd/14: .2=1.0 → $15000,
// .3=2.0 → $30000). There is no `.1` (tier 1 is the build default, never "upgraded to"). The cap is `max_tier` (3) — at
// lab_tier == max_tier the action 409s (nothing left to upgrade to, no cost). R2.3: the raw cents stay internal — the
// player surface is the qualitative lab_tier band on the projection (R2.2).
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Phase-2b vector #2c
// (Ash) T0 (cited per key, with the upstream design-spec source). They are surfaced as env-overridable fallbacks so
// this file stays a faithful MIRROR of the single source of truth. If the registry values change, update this map in
// the SAME commit (R9.3 propagation: gdd/14 ↔ code). All values are `[PROV-Y26Q2]` (provisional, calibrate downstream).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';
import { groundedConversionCostCents } from './conversion-tunables';

/**
 * Resolved specialized-lab tier tunables. All keys are gdd/14 §Phase-2b vector #2c (Ash) T0 (the cap → the at-cap 409;
 * the per-target-tier ratio → the guarded debit amount). R2.3 — NOT inline. The cost ratios are keyed by the TARGET
 * tier (the tier the upgrade moves TO): index 2 = the 1→2 cost, index 3 = the 2→3 cost.
 * DB-override > env > default (Phase-23).
 */
export const specializedLabTunables = {
  /**
   * specialized_lab.max_tier — the lab_tier cap. Default 3. Env override: SPECIALIZED_LAB_MAX_TIER (test-only). At
   * lab_tier == this, the upgrade-tier action refuses (409 — nothing left to upgrade to). Consumed by
   * SpecializedLabService.upgradeTier() (the at-cap guard). (DB-override > env > default — Phase-23).
   */
  get maxTier(): number {
    return TunablesStore.resolveInt('specialized_lab.max_tier', 'SPECIALIZED_LAB_MAX_TIER', 3);
  },
  /**
   * specialized_lab.upgrade_cost_ratio.<targetTier> — the upgrade cost ratio keyed by the target tier. .2 = the 1→2
   * cost ratio (default 1.0 → $15000), .3 = the 2→3 cost ratio (default 2.0 → $30000). Env overrides:
   * SPECIALIZED_LAB_UPGRADE_COST_RATIO_2 / _3 (test-only). Consumed by upgradeCostCents() (the guarded debit amount).
   * (DB-override > env > default — Phase-23).
   */
  upgradeCostRatioByTargetTier: {
    get 2(): number {
      return TunablesStore.resolveFloat('specialized_lab.upgrade_cost_ratio.2', 'SPECIALIZED_LAB_UPGRADE_COST_RATIO_2', 1.0);
    },
    get 3(): number {
      return TunablesStore.resolveFloat('specialized_lab.upgrade_cost_ratio.3', 'SPECIALIZED_LAB_UPGRADE_COST_RATIO_3', 2.0);
    },
  } as Record<number, number>,

  /**
   * real_estate.stack_zoning_gated_lot_count — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-3 BASE tunable (plan
   * docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C1 / design §4.3, locked user decision (a),
   * §9: "a genuine Stack zoning gate (spatial restriction on lab placement), NOT a Tier cap change"). The number
   * of Stack-profile lots/blocks that start ZONING-GATED (unavailable/non-constructible) by default — E-POL-07
   * relaxes the gate through the engine, bringing this many blocks "on market". Default 2, range 1..6.
   *
   * OVERLAY-AWARE as of C8 (design §4.3 — the zoning-gate model LANDS, migration 0109):
   * `SpecializedLabRepository.isStackZoningGated` reads THIS resolved value fresh on every upgrade-tier
   * attempt (the C5 GLOBAL body-wrap pattern — `EffectOverlayStore.applyModifiers(key, base)`). A block
   * is gated iff its persisted `blocks.stack_zoning_rank` (0109 — the block's FIXED ordinal among Stack-
   * profile blocks) is <= this CURRENT count. E-POL-07's real effect is a SET modifier driving this count
   * toward 0 (canon catalogue.md :121 "New Stack-profile lots come on market") — at 0, NO block is gated
   * (rank <= 0 is never true), genuinely relaxing every previously-gated lot; `revertEvent` restores the
   * base count and the SAME lots re-gate (deterministic — no persisted "gated" boolean to desync).
   * Inline-clamped BEFORE the overlay composes (C5/C6/C7 precedent — a political-event modifier MAY push
   * the composed result outside the admin-tunable [1,6] range on purpose, e.g. to 0; that IS the intended
   * temporary regime shift). Empty overlay → base byte-identical (zero-regression contract).
   */
  get stackZoningGatedLotCount(): number {
    const v = TunablesStore.resolveInt('real_estate.stack_zoning_gated_lot_count', 'REAL_ESTATE_STACK_ZONING_GATED_LOT_COUNT', 2);
    const base = Math.max(1, Math.min(6, v));
    return EffectOverlayStore.applyModifiers('real_estate.stack_zoning_gated_lot_count', base);
  },
  /**
   * real_estate.stack_zoning_gate_target_tier — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-3 BASE tunable (design §4.3).
   * WHICH `specialized_lab` tier the zoning gate restricts construction of on the gated lots (NOT a `max_tier`
   * CAP increase — the locked decision (a) explicitly rejects a tier-cap change; this is a categorical marker of
   * which tier's construction the spatial gate blocks on those specific lots). Default 3 (aligned with the
   * existing `max_tier` default), range 1..4. Inline-clamped.
   *
   * **NOT overlay-aware, intentionally** (C8, design §4.3 decision (a) — locked): this is a FIXED categorical
   * marker, never itself relaxed by a political event. Only `stackZoningGatedLotCount` above (the COUNT of
   * gated lots) is overlay-driven — the target tier the gate restricts stays constant at 3 whether the gate
   * is active or relaxed. `SpecializedLabService.upgradeTier` reads this BASE value directly (no overlay wrap).
   */
  get stackZoningGateTargetTier(): number {
    const v = TunablesStore.resolveInt('real_estate.stack_zoning_gate_target_tier', 'REAL_ESTATE_STACK_ZONING_GATE_TARGET_TIER', 3);
    return Math.max(1, Math.min(4, v));
  },
};

/**
 * The grounded UPGRADE-TIER DEBIT amount in CENTS for moving a specialized_lab's lab_tier UP to `targetTier` (the
 * wallet-affecting step of the upgrade action). M1 grounding (the SAME money convention as repairCostCents /
 * real_estate.acquisitionPriceCents): cost = specialized_lab.upgrade_cost_ratio.<targetTier> × the STANDARD-cover
 * REFERENCE conversion cost. The reference is the BASE STANDARD-cover cost with NO per-type multiplier — we pass
 * 'stash' (multiplier 1.0) so the reference = conversion.base_cost_standard_min ($15000), exactly as gdd/14 documents
 * (`ratio × conversion.base_cost_standard_min`). (Passing 'specialized_lab' would apply the LAB ×4 multiplier — NOT
 * what the registry key references; the repair cost uses 'stash' for the same reason.) cost_cents = round(ratio ×
 * reference_cents). DETERMINISTIC (the reference cost × a fixed ratio, no RNG). Returns a bigint (cents) for the
 * economy_states.cash_cents bigint column. R2.3 — the only values are the gdd/14 ratio + the REUSED conversion
 * reference (no inline literal).
 *
 * `targetTier` MUST be a key of upgradeCostRatioByTargetTier (2 or 3 at the shipped max_tier 3). The caller (the
 * service) only ever computes this for currentTier+1 after validating currentTier < max_tier, so the target is always a
 * mapped key. If a future max_tier > 3 references an unmapped target, this throws (a loud config gap, never a silent 0).
 */
export function upgradeCostCents(targetTier: number): bigint {
  const ratio = specializedLabTunables.upgradeCostRatioByTargetTier[targetTier];
  if (ratio === undefined) {
    throw new Error(
      `No specialized_lab.upgrade_cost_ratio for target tier ${targetTier} (gdd/14 §Phase-2b vector #2c T0 only ` +
        `defines .2 and .3 at max_tier 3 — a higher max_tier needs the matching ratio key added).`,
    );
  }
  // 'stash' carries NO per-type cost multiplier (only LAB/REFINERY do), so groundedConversionCostCents('stash',
  // 'standard') = conversion.base_cost_standard_min × 1.0 × 100 = the exact $15000 STANDARD-cover reference gdd/14 names
  // for the upgrade-cost ratio — the SAME reference repairCostCents() uses.
  const referenceCostCents = groundedConversionCostCents('stash', 'standard');
  const priceCents = Math.round(ratio * Number(referenceCostCents));
  return BigInt(priceCents);
}

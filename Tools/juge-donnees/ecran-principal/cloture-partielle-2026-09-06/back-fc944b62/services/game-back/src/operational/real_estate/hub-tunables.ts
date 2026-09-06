// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — distribution (Phase-4 vector
//             #4) T0 — the `distribution.hub_max_tier` + `distribution.hub_upgrade_cost_ratio.<targetTier>` registry
//             keys (NEW Phase-4 vector #4 T0) +
//             docs/superpowers/specs/2026-06-07-phase-04-distribution-hub-design.md §4/§7 (hub tier + upgrade action,
//             R2.3) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention — ratio × the STANDARD-
//             cover reference conversion cost, the SAME convention real_estate.acquisition_cost_ratio /
//             operational.repair.cost_ratio / specialized_lab.upgrade_cost_ratio REUSE)
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 2) --
//
// Distribution-hub TIER tunables (Phase-4 vector #4 — courier dispatch hub) — the `distribution.*` keys THIS slice's
// HubService (T2) CONSUMES: the TIER CAP (`hub_max_tier` — the upgrade-hub-tier action refuses once hub_tier reaches
// it) + the per-target-tier UPGRADE COST RATIO (the cash cost of raising a distribution_hub's hub_tier by one, as a
// ratio of the M1 conversion-cost reference). T2 = a player UPGRADE-HUB-TIER action raises a DISTRIBUTION_HUB's
// hub_tier by one (cash debit, capped): debit economy_states atomically guarded `WHERE cash >= cost` → hub_tier++. A
// higher tier later scales the courier roster cap (the hub-tier lever of HubRosterService — T3; the roster cap itself
// is NOT here, T2 only manages the tier value + the upgrade action). This is the BYTE-MIRROR of specialized-lab-tunables.
//
// THE COST IS KEYED BY THE TARGET TIER (the tier the upgrade MOVES TO): upgrading hub_tier 1→2 costs
// `distribution.hub_upgrade_cost_ratio.2`; 2→3 costs `.3`; 3→4 costs `.4`; 4→5 costs `.5` (a strictly-increasing curve —
// gdd/14: .2=1.0 → $15000, .3=2.0 → $30000, .4=3.5 → $52500, .5=5.0 → $75000). There is no `.1` (tier 1 is the build
// default, never "upgraded to"). The cap is `hub_max_tier` (5) — at hub_tier == hub_max_tier the action 409s (nothing
// left to upgrade to, no cost). R2.3: the raw cents stay internal — the player surface is the qualitative hub_tier band
// on the projection (R2.2).
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Operational chain —
// distribution (Phase-4 vector #4 T0 — cited per key, with the upstream design-spec source). They are surfaced as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry values
// change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). All values are `[PROV-Y26Q2]`
// (provisional, calibrate downstream).

import { groundedConversionCostCents } from './conversion-tunables';
import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved distribution-hub tier tunables. All keys are gdd/14 §Operational chain — distribution (Phase-4 vector #4 T0;
 * the cap → the at-cap 409; the per-target-tier ratio → the guarded debit amount). R2.3 — NOT inline. The cost ratios
 * are keyed by the TARGET tier (the tier the upgrade moves TO): index 2 = the 1→2 cost, …, index 5 = the 4→5 cost.
 * DB-override > env > default (Phase-23).
 */
export const hubTunables = {
  /**
   * distribution.hub_max_tier — the hub_tier cap. Default 5. Range 1..5. Env override: DISTRIBUTION_HUB_MAX_TIER
   * (test-only). At hub_tier == this, the upgrade-hub-tier action refuses (409 — nothing left to upgrade to).
   * Consumed by HubService.upgradeHubTier() (the at-cap guard). (DB-override > env > default — Phase-23).
   */
  get maxTier(): number {
    return TunablesStore.resolveInt('distribution.hub_max_tier', 'DISTRIBUTION_HUB_MAX_TIER', 5);
  },
  /**
   * distribution.hub_upgrade_cost_ratio.<targetTier> — the upgrade cost ratio keyed by the target tier. .2 = the 1→2
   * cost ratio (default 1.0 → $15000), .3 = the 2→3 cost ratio (default 2.0 → $30000), .4 = the 3→4 (default 3.5 →
   * $52500), .5 = the 4→5 (default 5.0 → $75000). Env overrides: DISTRIBUTION_HUB_UPGRADE_COST_RATIO_{2,3,4,5}
   * (test-only). Consumed by hubUpgradeCostCents() (the guarded debit amount). (DB-override > env > default — Phase-23).
   */
  upgradeCostRatioByTargetTier: {
    get 2(): number { return TunablesStore.resolveFloat('distribution.hub_upgrade_cost_ratio.2', 'DISTRIBUTION_HUB_UPGRADE_COST_RATIO_2', 1.0); },
    get 3(): number { return TunablesStore.resolveFloat('distribution.hub_upgrade_cost_ratio.3', 'DISTRIBUTION_HUB_UPGRADE_COST_RATIO_3', 2.0); },
    get 4(): number { return TunablesStore.resolveFloat('distribution.hub_upgrade_cost_ratio.4', 'DISTRIBUTION_HUB_UPGRADE_COST_RATIO_4', 3.5); },
    get 5(): number { return TunablesStore.resolveFloat('distribution.hub_upgrade_cost_ratio.5', 'DISTRIBUTION_HUB_UPGRADE_COST_RATIO_5', 5.0); },
  } as Record<number, number>,
};

/**
 * The grounded UPGRADE-HUB-TIER DEBIT amount in CENTS for moving a distribution_hub's hub_tier UP to `targetTier` (the
 * wallet-affecting step of the upgrade action). M1 grounding (the SAME money convention as repairCostCents /
 * upgradeCostCents / real_estate.acquisitionPriceCents): cost = distribution.hub_upgrade_cost_ratio.<targetTier> × the
 * STANDARD-cover REFERENCE conversion cost. The reference is the BASE STANDARD-cover cost with NO per-type multiplier —
 * we pass 'stash' (multiplier 1.0) so the reference = conversion.base_cost_standard_min ($15000), exactly as gdd/14
 * documents (`ratio × conversion.base_cost_standard_min`). (Passing 'distribution_hub' would still be ×1.0 — the bucket
 * is low, no per-type multiplier — but we mirror the specialized_lab/repair convention of forcing 'stash' so the
 * reference is unambiguously the multiplier-free base.) cost_cents = round(ratio × reference_cents). DETERMINISTIC (the
 * reference cost × a fixed ratio, no RNG). Returns a bigint (cents) for the economy_states.cash_cents bigint column.
 * R2.3 — the only values are the gdd/14 ratio + the REUSED conversion reference (no inline literal).
 *
 * `targetTier` MUST be a key of upgradeCostRatioByTargetTier (2..5 at the shipped max_tier 5). The caller (the service)
 * only ever computes this for currentTier+1 after validating currentTier < max_tier, so the target is always a mapped
 * key. If a future max_tier > 5 references an unmapped target, this throws (a loud config gap, never a silent 0).
 */
export function hubUpgradeCostCents(targetTier: number): bigint {
  const ratio = hubTunables.upgradeCostRatioByTargetTier[targetTier];
  if (ratio === undefined) {
    throw new Error(
      `No distribution.hub_upgrade_cost_ratio for target tier ${targetTier} (gdd/14 §Operational chain — distribution ` +
        `(Phase-4 vector #4 T0) only defines .2..5 at max_tier 5 — a higher max_tier needs the matching ratio key added).`,
    );
  }
  // 'stash' carries NO per-type cost multiplier (only LAB/REFINERY do), so groundedConversionCostCents('stash',
  // 'standard') = conversion.base_cost_standard_min × 1.0 × 100 = the exact $15000 STANDARD-cover reference gdd/14 names
  // for the upgrade-cost ratio — the SAME reference repairCostCents() / upgradeCostCents() use.
  const referenceCostCents = groundedConversionCostCents('stash', 'standard');
  const priceCents = Math.round(ratio * Number(referenceCostCents));
  return BigInt(priceCents);
}

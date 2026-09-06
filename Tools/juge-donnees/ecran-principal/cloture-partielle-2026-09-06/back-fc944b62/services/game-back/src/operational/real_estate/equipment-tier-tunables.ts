// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — production
//             (production.brindle.tier_N_upgrade_cost_ratio — D1 C6 NEW, the equipment_tier upgrade cost for
//             the generic Brindle/Crick/Hush lab types: lab/refinery/press_house) +
//             (production.brindle.tier_N_upgrade_days — REUSE EXISTING, D1 C6 consumed) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state — D1 C6 windowed upgrade)
//             -- session:2026-06-15 (D1 C6) --
//
// Equipment-tier UPGRADE tunables (D1 C6 — the generic equipment_tier upgrade for lab/refinery/press_house).
// MIRRORS specialized-lab-tunables.ts (swapping specialized_lab.upgrade_cost_ratio→production.brindle.tier_N_upgrade_cost_ratio,
// lab_tier→equipment_tier). The cost is keyed by TARGET TIER (the tier the upgrade moves TO): upgrading
// equipment_tier 1→2 costs `production.brindle.tier_2_upgrade_cost_ratio`; 2→3 costs `tier_3_upgrade_cost_ratio`
// (strictly increasing). No `.1` (tier 1 is the build default, never "upgraded to"). Cap = 5 (building_types.md §174).
// R2.3: values are gdd/14 mirrors. NOT inline. DB-override > env > default (Phase-23).

import { TunablesStore } from '../../config/tunables-store';
import { groundedConversionCostCents, operationalDayLengthMinutes } from './conversion-tunables';

/** The operational types eligible for the equipment_tier upgrade lever.
 *  Only lab / refinery / press_house carry the generic equipment_tier lever.
 *  specialized_lab uses lab_tier (NOT equipment_tier); distribution_hub uses hub_tier; money_holding uses money_holding_tier.
 */
export const EQUIPMENT_TIER_ELIGIBLE_TYPES = ['lab', 'refinery', 'press_house'] as const;
export type EquipmentTierEligibleType = (typeof EQUIPMENT_TIER_ELIGIBLE_TYPES)[number];

export function isEquipmentTierEligible(type: string): type is EquipmentTierEligibleType {
  return (EQUIPMENT_TIER_ELIGIBLE_TYPES as readonly string[]).includes(type);
}

/** equipment_tier cap = 5 (building_types.md §174, gdd/14). */
export const EQUIPMENT_TIER_MAX = 5;

/**
 * Resolved equipment-tier upgrade cost ratios, keyed by TARGET TIER (2..5).
 * production.brindle.tier_N_upgrade_cost_ratio — gdd/14 D1 C6. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
 * DB-override > env > default (Phase-23).
 */
export const equipmentTierUpgradeCostRatios: Record<number, number> = {
  get 2(): number {
    return TunablesStore.resolveFloat('production.brindle.tier_2_upgrade_cost_ratio', 'PRODUCTION_BRINDLE_TIER_2_UPGRADE_COST_RATIO', 1.0);
  },
  get 3(): number {
    return TunablesStore.resolveFloat('production.brindle.tier_3_upgrade_cost_ratio', 'PRODUCTION_BRINDLE_TIER_3_UPGRADE_COST_RATIO', 2.5);
  },
  get 4(): number {
    return TunablesStore.resolveFloat('production.brindle.tier_4_upgrade_cost_ratio', 'PRODUCTION_BRINDLE_TIER_4_UPGRADE_COST_RATIO', 6.0);
  },
  get 5(): number {
    return TunablesStore.resolveFloat('production.brindle.tier_5_upgrade_cost_ratio', 'PRODUCTION_BRINDLE_TIER_5_UPGRADE_COST_RATIO', 15.0);
  },
};

/**
 * The grounded UPGRADE COST in CENTS for moving equipment_tier UP to `targetTier` (2..5).
 * M1 money convention (SAME as specialized-lab-tunables): ratio × groundedConversionCostCents('stash', 'standard').
 * 'stash' = no per-type multiplier → reference = conversion.base_cost_standard_min × 100 = 1_500_000 cents.
 * Returns a bigint (cents). R2.3 — NOT inline.
 */
export function upgradeCostCents(_operationalType: EquipmentTierEligibleType, targetTier: number): bigint {
  const ratio = equipmentTierUpgradeCostRatios[targetTier];
  if (ratio === undefined) {
    throw new Error(
      `No production.brindle.tier_${targetTier}_upgrade_cost_ratio (D1 C6 only defines .2/.3/.4/.5 at max tier 5).`,
    );
  }
  const ref = groundedConversionCostCents('stash', 'standard');
  return BigInt(Math.round(ratio * Number(ref)));
}

/** Per-tier upgrade window configuration (tier_N_upgrade_days — REUSE EXISTING gdd/14 keys, NOT re-declared). */
const UPGRADE_DAYS_BY_TARGET_TIER: Record<number, { key: string; envVar: string; default: number }> = {
  2: { key: 'production.brindle.tier_2_upgrade_days', envVar: 'PRODUCTION_BRINDLE_TIER_2_UPGRADE_DAYS', default: 14 },
  3: { key: 'production.brindle.tier_3_upgrade_days', envVar: 'PRODUCTION_BRINDLE_TIER_3_UPGRADE_DAYS', default: 21 },
  4: { key: 'production.brindle.tier_4_upgrade_days', envVar: 'PRODUCTION_BRINDLE_TIER_4_UPGRADE_DAYS', default: 28 },
  5: { key: 'production.brindle.tier_5_upgrade_days', envVar: 'PRODUCTION_BRINDLE_TIER_5_UPGRADE_DAYS', default: 45 },
};

/**
 * The upgrade window duration in GAME-MINUTE TICKS for moving equipment_tier UP to `targetTier`.
 * = tier_N_upgrade_days × operationalDayLengthMinutes(clockDayLen). REUSE the E2E override mechanism.
 * Only tiers 2..5 carry upgrade windows (tier 1 is the default, never upgraded TO).
 */
export function upgradeWindowTicks(targetTier: number, clockDayLengthMinutes: number): number {
  const cfg = UPGRADE_DAYS_BY_TARGET_TIER[targetTier];
  if (!cfg) throw new Error(`No upgrade_days config for target tier ${targetTier} (D1 C6 defines tiers 2..5 only).`);
  const days = TunablesStore.resolveInt(cfg.key, cfg.envVar, cfg.default);
  return days * operationalDayLengthMinutes(clockDayLengthMinutes);
}

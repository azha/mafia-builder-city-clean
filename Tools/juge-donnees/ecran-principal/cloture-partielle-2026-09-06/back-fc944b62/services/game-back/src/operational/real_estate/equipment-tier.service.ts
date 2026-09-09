// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state — D1 C6 windowed upgrade) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (M1 money convention — REUSE)
//             -- session:2026-06-15 (D1 C6) --
//
// EquipmentTierService — the player-triggered UPGRADE-EQUIPMENT-TIER action for lab/refinery/press_house.
// MIRRORS SpecializedLabService (swapping lab_tier→equipment_tier + windowed upgrade pattern).
// Unlike the instant specialized_lab tier flip, equipment_tier upgrade has a WINDOW:
//   1) VALIDATE: building owned + operational type IN {lab/refinery/press_house} + equipment_tier < 5 + NO upgrade in
//      progress (remaining_ticks == 0). Not owned → 404; wrong type → 409 (WRONG_TYPE); at cap → 409 (AT_CAP);
//      upgrade already in progress → 409 (UPGRADE_IN_PROGRESS).
//   2) COST: upgradeCostCents(type, targetTier) (ratio × STANDARD-cover reference — REUSE conversion-tunables 'stash').
//   3) DEBIT + ARM WINDOW + ABORT COOK (atomic tx): debit cash_cents, set equipment_tier_upgrade_remaining_ticks =
//      upgradeWindowTicks(targetTier, clockDay), abort any in-progress cook on the building (lose intermediates 100%,
//      tier_upgrade_intermediate_loss_pct=100). Insufficient cash → 409 INSUFFICIENT_FUNDS (no state change).
// equipment_tier++ happens ONLY at window end (EquipmentTierUpgradeService tick — MINUTE/20).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { TunablesStore } from '../../config/tunables-store';
import { EquipmentTierRepository } from './equipment-tier.repository';
import {
  isEquipmentTierEligible,
  EQUIPMENT_TIER_MAX,
  upgradeCostCents,
  upgradeWindowTicks,
} from './equipment-tier-tunables';

@Injectable()
export class EquipmentTierService {
  private readonly logger = new Logger(EquipmentTierService.name);

  constructor(private readonly repo: EquipmentTierRepository) {}

  /**
   * Upgrade a player-owned lab/refinery/press_house's equipment_tier by one (the generic equipment-tier lever).
   * Validates ownership + eligible type + equipment_tier < 5 + no upgrade in progress.
   * Debits upgradeCostCents atomically guarded + arms the upgrade window + aborts any in-progress cook.
   * Returns { upgrading: true } (equipment_tier++ happens at window end, NOT here — R2.2; BO-only).
   */
  async upgradeEquipmentTier(playerId: string, buildingId: string): Promise<{ upgrading: true }> {
    const state = await this.repo.getUpgradeTargetState(playerId, buildingId);
    if (!state) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (!isEquipmentTierEligible(state.operational_type)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${buildingId} is a '${state.operational_type}' — equipment_tier upgrade is only available for ` +
          `lab/refinery/press_house (not specialized_lab/distribution_hub/money_holding which use their own tier lever — WRONG_TYPE).`,
      });
    }
    if (state.equipment_tier >= EQUIPMENT_TIER_MAX) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is already at the max equipment_tier (${EQUIPMENT_TIER_MAX}) — cannot upgrade further (AT_CAP).`,
      });
    }
    if (state.equipment_tier_upgrade_remaining_ticks > 0) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${buildingId} already has an upgrade in progress ` +
          `(equipment_tier_upgrade_remaining_ticks=${state.equipment_tier_upgrade_remaining_ticks}) — UPGRADE_IN_PROGRESS.`,
      });
    }

    const targetTier = state.equipment_tier + 1;
    const costCents = upgradeCostCents(state.operational_type, targetTier);

    // Read the current clock day-length to compute ticks (the E2E override mechanism — operationalDayLengthMinutes).
    const clockDayLen = TunablesStore.resolveInt('clock.in_game_day_length_minutes', 'CLOCK_IN_GAME_DAY_LENGTH_MINUTES', 1440);
    const windowTicks = upgradeWindowTicks(targetTier, clockDayLen);

    const result = await this.repo.debitAndArmUpgradeWindow({
      playerId,
      buildingId,
      fromTier: state.equipment_tier,
      costCents,
      upgradeWindowTicks: windowTicks,
    });
    if (result === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the equipment-tier upgrade cost.',
      });
    }

    this.logger.log(
      `upgrade-equipment-tier: player=${playerId} building=${buildingId} equipment_tier=${state.equipment_tier} → ` +
        `WINDOW ARMED (remaining_ticks=${result.newUpgradeRemainingTicks}, target=${targetTier}, cost=${costCents})`,
    );
    return { upgrading: true };
  }
}

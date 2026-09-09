// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state —
//             equipment_tier + equipment_tier_upgrade_remaining_ticks, D1 C6 windowed upgrade) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — guarded debit)
//             -- session:2026-06-15 (D1 C6) --
//
// EquipmentTierRepository — the persisted access layer for the D1 C6 UPGRADE-EQUIPMENT-TIER slice.
// MIRRORS SpecializedLabRepository (swapping lab_tier→equipment_tier, adding upgrade-window seeding).
// The guarded-debit discipline is REUSE of specialized-lab / hub / repair. The NEW behavior: the upgrade
// arms an upgrade window (equipment_tier_upgrade_remaining_ticks = upgradeWindowTicks) and aborts any
// in-progress cook on the building (cook → current_stage='aborted') atomically in the SAME transaction.
// The actual tier increment (equipment_tier++) happens at WINDOW END via EquipmentTierUpgradeService (tick).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState, cookSession } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { FUNCTIONAL_COOK_STAGES } from '../production/production.repository';

export interface EquipmentTierUpgradeTargetState {
  building_id: string;
  operational_type: string;
  equipment_tier: number;
  equipment_tier_upgrade_remaining_ticks: number;
}

@Injectable()
export class EquipmentTierRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getUpgradeTargetState(playerId: string, buildingId: string): Promise<EquipmentTierUpgradeTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        equipment_tier: buildingOperationalState.equipment_tier,
        equipment_tier_upgrade_remaining_ticks: buildingOperationalState.equipment_tier_upgrade_remaining_ticks,
      })
      .from(buildingOperationalState)
      .where(and(eq(buildingOperationalState.building_id, buildingId), eq(buildingOperationalState.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * ATOMIC: debit cash, arm upgrade window, abort any in-progress cook (lose intermediates 100%).
   * Returns { newUpgradeRemainingTicks } on success or null if the debit was refused (insufficient funds).
   */
  async debitAndArmUpgradeWindow(params: {
    playerId: string;
    buildingId: string;
    fromTier: number;
    costCents: bigint;
    upgradeWindowTicks: number;
  }): Promise<{ newUpgradeRemainingTicks: number } | null> {
    const { playerId, buildingId, fromTier, costCents, upgradeWindowTicks } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) return null;

      // 2) ARM UPGRADE WINDOW.
      const armed = await tx
        .update(buildingOperationalState)
        .set({ equipment_tier_upgrade_remaining_ticks: upgradeWindowTicks })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.equipment_tier, fromTier),
          ),
        )
        .returning({ equipment_tier_upgrade_remaining_ticks: buildingOperationalState.equipment_tier_upgrade_remaining_ticks });
      if (armed.length === 0) {
        throw new Error('upgrade-equipment-tier arm failed (equipment_tier moved concurrently) — rolled back.');
      }

      // 3) ABORT any in-progress cook on this building (tier_upgrade_intermediate_loss_pct = 100 — lose all intermediates).
      await tx
        .update(cookSession)
        .set({ current_stage: 'aborted' })
        .where(
          and(
            eq(cookSession.player_id, playerId),
            eq(cookSession.lab_building_id, buildingId),
            inArray(cookSession.current_stage, FUNCTIONAL_COOK_STAGES),
          ),
        );

      return { newUpgradeRemainingTicks: armed[0].equipment_tier_upgrade_remaining_ticks };
    });
  }

  /**
   * Batch-read all buildings for a player with equipment_tier_upgrade_remaining_ticks > 0.
   * Called by the MINUTE/20 upgrade-window drain tick.
   */
  async listInProgressUpgrades(playerId: string): Promise<Array<{
    building_id: string;
    equipment_tier: number;
    equipment_tier_upgrade_remaining_ticks: number;
  }>> {
    return this.db
      .select({
        building_id: buildingOperationalState.building_id,
        equipment_tier: buildingOperationalState.equipment_tier,
        equipment_tier_upgrade_remaining_ticks: buildingOperationalState.equipment_tier_upgrade_remaining_ticks,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          sql`${buildingOperationalState.equipment_tier_upgrade_remaining_ticks} > 0`,
        ),
      );
  }

  /**
   * Batched UPDATE: drain equipment_tier_upgrade_remaining_ticks by 1 per building, and for buildings
   * that reach 0 this tick, increment equipment_tier++ (capped at EQUIPMENT_TIER_MAX=5) in the SAME update.
   */
  async applyUpgradeBatch(
    playerId: string,
    mutations: Array<{
      building_id: string;
      new_remaining_ticks: number;
      increment_tier: boolean;
    }>,
  ): Promise<void> {
    if (mutations.length === 0) return;

    // Split into completing (increment_tier=true) vs draining (false).
    const completing = mutations.filter((m) => m.increment_tier);
    const draining = mutations.filter((m) => !m.increment_tier);

    if (completing.length > 0) {
      const ids = completing.map((m) => m.building_id);
      await this.db
        .update(buildingOperationalState)
        .set({
          equipment_tier_upgrade_remaining_ticks: 0,
          equipment_tier: sql`LEAST(${buildingOperationalState.equipment_tier} + 1, 5)`,
        })
        .where(
          and(
            eq(buildingOperationalState.player_id, playerId),
            inArray(buildingOperationalState.building_id, ids),
          ),
        );
    }

    if (draining.length > 0) {
      for (const m of draining) {
        await this.db
          .update(buildingOperationalState)
          .set({ equipment_tier_upgrade_remaining_ticks: m.new_remaining_ticks })
          .where(
            and(
              eq(buildingOperationalState.building_id, m.building_id),
              eq(buildingOperationalState.player_id, playerId),
            ),
          );
      }
    }
  }
}

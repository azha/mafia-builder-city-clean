// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state — D1 C6 windowed upgrade) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (MINUTE band)
//             -- session:2026-06-15 (D1 C6) --
//
// EquipmentTierUpgradeService — the MINUTE/20 tick-hook that drains equipment_tier_upgrade_remaining_ticks.
// MIRRORS ConversionSetupService (swapping setup_remaining_ticks/conversion_stage→equipment_tier_upgrade_remaining_ticks/equipment_tier).
// Each game-minute: batch-read buildings with remaining_ticks > 0; decrement by 1; on completion (remaining→0)
// increment equipment_tier++ (capped at 5) in the SAME set-based UPDATE.
// Organically a no-op (no in-progress equipment-tier upgrade — the common case).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { EquipmentTierRepository } from './equipment-tier.repository';

@Injectable()
export class EquipmentTierUpgradeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EquipmentTierUpgradeService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: EquipmentTierRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'EquipmentTierUpgradeService registered at MINUTE/20 (EQUIPMENT_TIER_UPGRADE) — drains ' +
        'equipment_tier_upgrade_remaining_ticks on in-progress equipment-tier upgrades each in-game minute; ' +
        'increments equipment_tier++ (capped 5) at 0. Batched read/write (Phase-1 determinism). ' +
        'Organically a no-op (no in-progress equipment-tier upgrade).',
    );
  }

  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.EQUIPMENT_TIER_UPGRADE,
      cadence: Cadence.MINUTE,
      order: 20,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const inProgress = await this.repo.listInProgressUpgrades(ctx.playerId);
    if (inProgress.length === 0) return;

    const mutations = inProgress.map((u) => {
      const remaining = Math.max(0, u.equipment_tier_upgrade_remaining_ticks - 1);
      return {
        building_id: u.building_id,
        new_remaining_ticks: remaining,
        increment_tier: remaining === 0,
      };
    });

    await this.repo.applyUpgradeBatch(ctx.playerId, mutations);
  }
}

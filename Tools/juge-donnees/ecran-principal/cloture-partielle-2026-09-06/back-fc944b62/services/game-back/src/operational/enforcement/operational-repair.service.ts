// IMPLEMENTS: docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (the OPERATIONAL_REPAIR tick
//             service — at a free MINUTE slot, set-based flips every 'repairing' building whose repair_completes_at_
//             tick <= current_tick back to 'operational', clearing the timer) + §2 (the recovery of the raid
//             consequence loop) +
//             docs/tech/09_data_model/schema_operational_chain.md §7 (building_operational_state.structural_state /
//             repair_completes_at_tick + building_raid.status, T0) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot)
//             -- session:2026-06-04 (Phase 2b Task 3) --
//
// `OperationalRepairService` — the OPERATIONAL_REPAIR completion tick (Phase-2b vector #1 recovery). It is an
// operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING CitySimScheduler at
// {MINUTE, order 14 = OPERATIONAL_REPAIR} (the next FREE slot after RAID_EXECUTION/13 — verified against the canonical
// SCHEDULE). Each in-game minute it DRIVES the back half of the repair loop the RepairService (the player action)
// armed:
//   - the player REPAIR action sets structural_state='repairing' + repair_completes_at_tick = current_tick + duration;
//   - this tick set-based flips every 'repairing' building whose repair_completes_at_tick <= the current tick back to
//     structural_state='operational' (NULLing repair_completes_at_tick — the repair is no longer armed) AND moves the
//     corresponding building_raid row status repairing → repaired.
// The cook/storage/deal tick-services gate on structural_state='operational' (T2), so a repaired building's ops RESUME
// from the very next tick (a frozen cook advances again — composes with the T2 gate, design §2).
//
// THE SET-BASED COMPLETION (the persisted-system determinism template — RealEstateRepository.applySetupBatch /
// RaidRepository.executeRaid precedent): the whole flip is ONE set-based UPDATE ... WHERE structural_state='repairing'
// AND repair_completes_at_tick <= currentTick (player-scoped per the per-player scheduler ctx) — NEVER a per-row await
// loop. ctx.gameMinute is the current in-game tick (the SAME authoritative read the cook-advance / raid tick use).
// Deterministic (NO RNG — a fixed function of repair_completes_at_tick vs the tick). Organically a no-op (no building
// under repair — the common case; the WHERE matches nothing).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { RepairRepository } from './repair.repository';

@Injectable()
export class OperationalRepairService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OperationalRepairService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: RepairRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'OperationalRepairService registered at MINUTE/14 (OPERATIONAL_REPAIR) — each in-game minute it set-based flips ' +
        "every 'repairing' building whose repair_completes_at_tick <= the current tick back to " +
        'structural_state=operational (NULLing the timer) + moves the corresponding building_raid row repairing → ' +
        'repaired. The cook/storage/deal ticks gate on structural_state=operational (T2), so a repaired building ' +
        'resumes ops from the next tick. Deterministic (NO RNG). Organically a no-op (no building under repair).',
    );
  }

  /** Register the MINUTE/14 = OPERATIONAL_REPAIR slot (the SAME registerSystem path the raid hook uses at MINUTE/13). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.OPERATIONAL_REPAIR,
      cadence: Cadence.MINUTE,
      order: 14,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/14 tick (repair completion) ─────────────────────────────

  /**
   * {MINUTE, order 14} — complete every DUE repair for the player set-based. ctx.gameMinute is the current in-game tick
   * (the SAME authoritative read the cook-advance / raid tick use). Delegates the set-based flip to the repository
   * (structural_state repairing → operational + repair_completes_at_tick → NULL, where due; building_raid repairing →
   * repaired for the flipped buildings). Deterministic (NO RNG). Organically a no-op (no building under repair).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const repaired = await this.repo.completeDueRepairs(ctx.playerId, ctx.gameMinute);
    if (repaired > 0) {
      this.logger.log(
        `OPERATIONAL_REPAIR: player=${ctx.playerId} tick=${ctx.gameMinute} → ${repaired} building(s) repaired ` +
          '(repairing → operational; ops resume next tick).',
      );
    }
  }
}

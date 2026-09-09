// IMPLEMENTS: docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (RepairService — guarded cash
//             debit → structural_state='repairing' + repair_completes_at_tick; the recovery action of the raid
//             consequence loop) + §2 (run hot → raid → DAMAGED → REPAIR → operational) +
//             docs/tech/09_data_model/schema_operational_chain.md §7 (raid/repair surface — building_operational_state.
//             structural_state / repair_completes_at_tick + building_raid.status, T0) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention the repair cost reuses)
//             -- session:2026-06-04 (Phase 2b Task 3) --
//
// `RepairService` — the player-triggered REPAIR action of the Phase-2b raid consequence loop (vector #1 recovery). A
// raid (T1) seizes a building's product and transitions it DAMAGED; the tick-services pause its ops (T2). REPAIR is the
// player-driven recovery: pay cash → 'repairing' for N ticks → back to 'operational' (the OPERATIONAL_REPAIR tick flips
// it; the cook then resumes — composes with the T2 gate).
//
// THE ACTION (RepairService.repair(playerId, buildingId)):
//   1) VALIDATE: read the player's building_operational_state row. Not owned / not converted (no row) → 404
//      RESOURCE_NOT_FOUND. The row exists but structural_state ≠ 'damaged' → 409 RESOURCE_STATE_CONFLICT (a building
//      that is not DAMAGED cannot be repaired — already operational, or already repairing). This matches the existing
//      operational error conventions (404 not-found/not-owned, 409 wrong-state — RealEstateService precedent).
//   2) COST: operational.repair.cost_ratio × the M1 conversion-cost reference (repairCostCents — R2.3, NOT inline; the
//      SAME money convention as the acquisition price). The raw cents stay internal — the player surface is the
//      qualitative repair_cost band on the projection (R2.2).
//   3) DEBIT + ARM (atomic, guarded — REUSE the real-estate guarded-debit pattern): debit economy_states by the cost
//      with a `cash_cents >= cost` guard IN the UPDATE. Insufficient balance → 409 RESOURCE_STATE_CONFLICT
//      (INSUFFICIENT_FUNDS — no state change, the tx rolls back). Success → structural_state='repairing' +
//      repair_completes_at_tick = current_tick + operational.repair.duration_ticks + the active building_raid row(s) →
//      status 'repairing'. The current_tick is read from the SAME authoritative source the cook-advance / raid tick
//      use (city_sim_clock.game_minute via the scheduler clock accessor).
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried repair with the
// same Idempotency-Key replays the memorized response, NO re-execution → no double-debit). This service does not
// re-implement idempotency; it just runs the guarded transaction (the interceptor wraps the handler).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { RepairRepository } from './repair.repository';
import { repairCostCents, repairTunables } from './repair-tunables';

@Injectable()
export class RepairService {
  private readonly logger = new Logger(RepairService.name);

  constructor(private readonly repo: RepairRepository) {}

  /**
   * Repair a player-owned DAMAGED building (the recovery action). Validates ownership + DAMAGED state, debits the
   * grounded repair cost atomically-guarded, and arms the repair (structural_state='repairing' + repair_completes_at_
   * tick = current_tick + duration; the active raid row → 'repairing'). The OPERATIONAL_REPAIR tick flips it back to
   * operational at the completion tick.
   *
   * Errors (the existing operational conventions): not owned / not converted (no operational row) → 404
   * RESOURCE_NOT_FOUND; not DAMAGED → 409 RESOURCE_STATE_CONFLICT (BUILDING_NOT_DAMAGED); insufficient cash → 409
   * RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS, no state change).
   */
  async repair(playerId: string, buildingId: string): Promise<{ repairing: true }> {
    const state = await this.repo.getRepairTargetState(playerId, buildingId);
    if (!state) {
      // No operational-state row for this player+building → not owned / not converted.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.structural_state !== 'damaged') {
      // Only a DAMAGED building can be repaired (operational → nothing to repair; repairing → already underway).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not DAMAGED (structural_state='${state.structural_state}') — only a damaged building can be repaired.`,
      });
    }

    const costCents = repairCostCents(); // R2.3: ratio × conversion reference (NOT inline).
    const currentTick = await this.repo.getCurrentTick(playerId);
    const completesAtTick = currentTick + repairTunables.durationTicks;

    const result = await this.repo.debitAndArmRepair({ playerId, buildingId, costCents, completesAtTick });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative). No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the repair cost.',
      });
    }

    this.logger.log(
      `repair: player=${playerId} building=${buildingId} → repairing (completes_at_tick=${completesAtTick}, ` +
        `current_tick=${currentTick}, duration=${repairTunables.durationTicks})`,
    );
    return { repairing: true };
  }
}

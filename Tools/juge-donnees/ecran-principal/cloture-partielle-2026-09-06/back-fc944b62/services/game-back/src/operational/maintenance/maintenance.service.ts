// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C3 (Player actions —
//             schedule / emergency (=same, D10) / mass-schedule)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §9 (Player actions &
//             endpoints — the validate → D10 price → guarded debit → arm 1-day job → event → idempotency
//             flow) + §4 (D13 — scheduling does NOT halt the building)
//             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.10 (D10 — one
//             pricing curve, no double-count) + §1.13 (D13 — scheduling doesn't halt; repair doesn't reset)
//             Pattern: services/game-back/src/operational/enforcement/repair.service.ts (RepairService —
//             the SAME "validate → cost → guarded debit → arm" shape; the guarded-debit + Idempotency-
//             Interceptor REUSE this file mirrors verbatim)
//             — 04f-A C3 — 2026-07-10
//
// `MaintenanceService` — the player-triggered maintenance actions (C3):
//   - scheduleMaintenance(playerId, buildingId, options?): validate owned + OPERATIONAL + not already
//     armed → D10 price (MaintenancePhaseService.maintenanceScheduleCostCents, the ONE curve — emergency is
//     ALWAYS server-derived from days_overdue > 0, NEVER from client input, R2.2 anti-exploit) → guarded
//     atomic debit + arm a 1-game-day job (MaintenanceRepository.debitAndArmSchedule) → emit
//     MaintenanceScheduledEvent → return the qualitative response. "Emergency maintenance" is NOT a separate
//     action (D10): the SAME method, the SAME endpoint — a client-supplied `options.emergency` is accepted
//     for API-shape parity with the canon "Emergency maintenance" label but is NEVER consulted for pricing
//     (the floor engages purely from server-observed days_overdue — no double-count, no client-influenced
//     price).
//   - applyMassSchedule(playerId, buildingIds): canon "single atomic transaction, all-or-nothing" — pre-
//     validates EVERY targeted building (ownership + OPERATIONAL + not already armed, batched ONE query), then
//     debits the SUM of every building's D10 cost in ONE guarded UPDATE (MaintenanceRepository.
//     debitTotalAndArmBatch) — if the wallet cannot cover the total, the WHOLE batch is refused: no building
//     is debited, none is armed.
//
// IDEMPOTENCY: the mutating POSTs are subject to the existing global IdempotencyInterceptor (REUSE — a
// retried schedule/mass-schedule with the same Idempotency-Key replays the memorized response, NO
// re-execution → no double-debit). This service does not re-implement idempotency; the interceptor wraps the
// handler (the SAME posture RepairService documents).
//
// D13: scheduling does NOT halt the building (no structural_state write here) — the building keeps operating
// while the 1-game-day job is armed; the NIGHTLY/21 tick (C2, MaintenancePhaseTickService.completeArmedJobs)
// resets the anchor + clears the job at completion.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { MaintenanceRepository, type ScheduleTargetState } from './maintenance.repository';
import { MaintenancePhaseService } from './maintenance-phase.service';

/** The qualitative D10 cost band (R2.2 — the raw cents stay internal/BO-only; the player sees this band +
 *  the exact wallet-balance delta, the raid-repair projection precedent). Derived SOLELY from the
 *  server-observed `emergency` flag (days_overdue > 0) — never from client input, never a raw multiplier. */
export type MaintenanceCostBand = 'STANDARD' | 'EMERGENCY';

function costBandFor(emergency: boolean): MaintenanceCostBand {
  return emergency ? 'EMERGENCY' : 'STANDARD';
}

export interface ScheduleMaintenanceResult {
  scheduled: true;
  emergency: boolean;
  cost_band: MaintenanceCostBand;
}

export interface MassScheduleMaintenanceResult {
  scheduled: true;
  results: Array<{ building_id: string; emergency: boolean; cost_band: MaintenanceCostBand }>;
  total_cost_band: MaintenanceCostBand;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * Schedule (or, while overdue, emergency-schedule — D10, the SAME endpoint) maintenance for a single
   * player-owned building.
   *
   * Errors (the existing operational conventions — RepairService precedent): not owned / not converted (no
   * operational row) → 404 RESOURCE_NOT_FOUND; not schedulable (`structural_state` is `'failed'` or
   * `'repairing'` — a failed building must resolve its equipment-failure card first) → 409
   * RESOURCE_STATE_CONFLICT; a job already armed → 409 RESOURCE_STATE_CONFLICT; insufficient cash → 409
   * RESOURCE_STATE_CONFLICT (no state change — the guarded debit refused the whole transaction).
   */
  async scheduleMaintenance(
    playerId: string,
    buildingId: string,
    _options?: { emergency?: boolean },
  ): Promise<ScheduleMaintenanceResult> {
    const state = await this.repo.getScheduleTargetState(playerId, buildingId);
    if (!state) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    this.assertSchedulable(state);

    const { gameMinute, currentGameDay } = await this.repo.getCurrentGameDayAndMinute(playerId);
    const daysOverdue = this.phase.deriveDaysOverdue(
      currentGameDay,
      state.last_maintained_at_game_day,
      state.maintenance_due_in_days,
    );
    const emergency = daysOverdue > 0; // D10 — server-derived ONLY, never the client-supplied options.emergency.
    const costCents = this.phase.maintenanceScheduleCostCents(daysOverdue, state.operational_type, state.cover_quality);
    const completesAtDay = currentGameDay + 1; // D13 — a 1-game-day job.

    const result = await this.repo.debitAndArmSchedule({ playerId, buildingId, costCents, completesAtDay });
    if (result === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the maintenance cost.',
      });
    }

    this.bus.emitMaintenanceScheduled({
      type: 'maintenance_scheduled',
      buildingId,
      playerId,
      emergency,
      gameMinute,
    });

    this.logger.log(
      `scheduleMaintenance: player=${playerId} building=${buildingId} daysOverdue=${daysOverdue} ` +
        `emergency=${emergency} completesAtDay=${completesAtDay}`,
    );
    return { scheduled: true, emergency, cost_band: costBandFor(emergency) };
  }

  /**
   * Canon "Mass schedule" (batch action for all TARGETED buildings; convenience) — a SINGLE atomic
   * transaction, all-or-nothing: if the wallet cannot cover the SUM of every targeted building's D10 cost (or
   * any targeted building is not owned / not schedulable), the WHOLE batch is refused — no building is
   * debited, none is armed.
   *
   * Errors: `buildingIds` empty → 422 VALIDATION_FAILED. Any building not owned / not converted → 404
   * RESOURCE_NOT_FOUND (the WHOLE batch rejected — no writes attempted, pre-validation is read-only). Any
   * building not schedulable (`'failed'`/`'repairing'`, or a job already armed) → 409 RESOURCE_STATE_CONFLICT
   * (the whole batch rejected, same reason). Insufficient TOTAL cash → 409 RESOURCE_STATE_CONFLICT (no
   * state change — the guarded debit refused the whole transaction).
   */
  async applyMassSchedule(playerId: string, buildingIds: readonly string[]): Promise<MassScheduleMaintenanceResult> {
    if (!buildingIds || buildingIds.length === 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'building_ids must be a non-empty array.' });
    }
    const uniqueIds = Array.from(new Set(buildingIds));

    const { gameMinute, currentGameDay } = await this.repo.getCurrentGameDayAndMinute(playerId);
    const stateMap = await this.repo.getScheduleTargetStatesBatch(playerId, uniqueIds);

    const items: Array<{ buildingId: string; completesAtDay: number; emergency: boolean; costCents: bigint }> = [];
    for (const buildingId of uniqueIds) {
      const state = stateMap.get(buildingId);
      if (!state) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `building ${buildingId} is not a player-owned operational building for this player.`,
        });
      }
      this.assertSchedulable(state);

      const daysOverdue = this.phase.deriveDaysOverdue(
        currentGameDay,
        state.last_maintained_at_game_day,
        state.maintenance_due_in_days,
      );
      const emergency = daysOverdue > 0;
      const costCents = this.phase.maintenanceScheduleCostCents(daysOverdue, state.operational_type, state.cover_quality);
      items.push({ buildingId, completesAtDay: currentGameDay + 1, emergency, costCents });
    }

    const totalCostCents = items.reduce((sum, i) => sum + i.costCents, 0n);
    const ok = await this.repo.debitTotalAndArmBatch(
      playerId,
      totalCostCents,
      items.map((i) => ({ buildingId: i.buildingId, completesAtDay: i.completesAtDay })),
    );
    if (!ok) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          'Insufficient cash to cover the mass-schedule total cost — the whole batch was refused (no ' +
          'building debited, none armed).',
      });
    }

    for (const item of items) {
      this.bus.emitMaintenanceScheduled({
        type: 'maintenance_scheduled',
        buildingId: item.buildingId,
        playerId,
        emergency: item.emergency,
        gameMinute,
      });
    }

    this.logger.log(
      `applyMassSchedule: player=${playerId} buildings=${items.length} totalCostCents=${totalCostCents}`,
    );
    const results = items.map((i) => ({
      building_id: i.buildingId,
      emergency: i.emergency,
      cost_band: costBandFor(i.emergency),
    }));
    return {
      scheduled: true,
      results,
      total_cost_band: costBandFor(results.some((r) => r.emergency)),
    };
  }

  /** The shared 409 guard (D13 — a failed/repairing building must resolve its card first; a job already
   *  armed cannot be re-armed). Belt-and-braces mirror of `debitAndArmSchedule`'s WHERE predicate. */
  private assertSchedulable(state: ScheduleTargetState): void {
    if (state.structural_state !== 'operational') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${state.building_id} is not schedulable (structural_state='${state.structural_state}') ` +
          '— a failed/repairing building must resolve its equipment-failure card first.',
      });
    }
    if (state.maintenance_completes_at_day !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${state.building_id} already has a scheduled-maintenance job armed.`,
      });
    }
  }
}

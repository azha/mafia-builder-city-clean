// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C4 (EQUIPMENT_FAILURE_WEEKLY_TICK
//             — WEEKLY/11 registration + orchestration)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §5 (Equipment-failure
//             model — the WEEKLY/11 roll) + §2 seam 9 (scheduler — WEEKLY 1..10 taken, next free 11)
//             Pattern: services/game-back/src/operational/maintenance/maintenance-phase-tick.service.ts
//             (the SAME onApplicationBootstrap + registerSystem + async-wrapper shape this file mirrors)
//             — 04f-A C4 — 2026-07-10
//
// `EquipmentFailureWeeklyTickService` — registers `EQUIPMENT_FAILURE_WEEKLY_TICK` at WEEKLY/11 (confirmed
// free after IA_DECAY_TICK/10 — design §2 seam 9 / C0 re-anchor). Each in-game week, per player: rolls the
// seeded weekly equipment-failure probability for every OPERATIONAL, non-critical, non-excluded building
// (`EquipmentFailureService.rollWeeklyForPlayer`). A failing roll runs the atomic-5 (structural_state→
// 'failed' + an equipment_failure_log row + EquipmentFailedEvent — minus the card, C5's job).
//
// L1 zero-write no-op: no eligible OPERATIONAL building → the tick issues ZERO writes. Idempotent per
// game-week: the roll is a PURE function of `(building_id, weekId)` — a same-week re-run reproduces the SAME
// outcome for every still-OPERATIONAL building, and a building that already failed drops out of the
// candidate set (no double-fail, no double log row, no extra "last rolled" column needed).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { citySimTunables } from '../../citysim/citysim-tunables';
// REUSE the SAME game-day derivation the phase tick / ConversionSetupService / the test controller all use.
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { EquipmentFailureService, equipmentFailureWeekId, type EquipmentFailureRollResult } from './equipment-failure.service';
// 04f-A C6 (D7) — the SAME WEEKLY/11 cadence ALSO emits the MAINTENANCE_NEGLECT heat pass (no new WEEKLY slot).
import { MaintenanceHeatService } from './maintenance-heat.service';

@Injectable()
export class EquipmentFailureWeeklyTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EquipmentFailureWeeklyTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly failure: EquipmentFailureService,
    private readonly heat: MaintenanceHeatService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.EQUIPMENT_FAILURE_WEEKLY_TICK,
      cadence: Cadence.WEEKLY,
      order: 11,
      run: async (ctx) => {
        await this.runWeeklyTick(ctx);
      },
    });
    this.logger.log(
      'EquipmentFailureWeeklyTickService registered EQUIPMENT_FAILURE_WEEKLY_TICK at WEEKLY/11 — next free ' +
        'after IA_DECAY_TICK/10 (confirmed, no slot collision). Each in-game week, per player: rolls the ' +
        'seeded weekly equipment-failure probability for every OPERATIONAL, non-critical, non-excluded ' +
        'building (D11). A failing roll: structural_state→\'failed\' + an equipment_failure_log row + ' +
        'EquipmentFailedEvent (the atomic-5 minus the card — C5). L1 empty-state skip: no eligible building ' +
        '→ ZERO writes. Idempotent per game-week (pure function of building_id+weekId).',
    );
  }

  // ───────────────────────────── the registered WEEKLY/11 tick ─────────────────────────────

  /**
   * {WEEKLY, order 11} — roll every eligible OPERATIONAL building's weekly equipment-failure probability
   * (D11, seeded `(building_id, weekId)`), THEN (04f-A C6, D7) emit the MAINTENANCE_NEGLECT weekly heat pass
   * on the SAME cadence. Deterministic (NO RNG other than `makeRng`). Organically a no-op (no eligible
   * building / no lapsed building this player). Returns the roll COUNTS plus the D7 `neglectHeatSoft`/
   * `neglectHeatHard` injection counts (the falsifiable idempotency-proof shape — the IA_DECAY_TICK
   * `apply-decay` / MAINTENANCE_PHASE_TICK `run-phase-tick` precedent).
   */
  async runWeeklyTick(
    ctx: CitySimTickContext,
  ): Promise<EquipmentFailureRollResult & { neglectHeatSoft: number; neglectHeatHard: number }> {
    const currentGameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
    const weekId = equipmentFailureWeekId(ctx.gameMinute);
    const result = await this.failure.rollWeeklyForPlayer(ctx.playerId, currentGameDay, weekId, ctx.gameMinute);

    // 04f-A C6 (D7) — the weekly MAINTENANCE_NEGLECT heat pass rides the SAME WEEKLY/11 cadence (no new slot).
    const neglectHeat = await this.heat.emitWeeklyNeglectHeat(ctx.playerId, currentGameDay, ctx.gameMinute);

    this.logger.log(
      `EQUIPMENT_FAILURE_WEEKLY_TICK: player=${ctx.playerId} weekId=${weekId} day=${currentGameDay} → ` +
        `${result.candidates} candidate(s), ${result.rolled} rolled, ${result.failed} failure(s), ` +
        `${neglectHeat.soft} soft-band + ${neglectHeat.hard} hard/critical-band MAINTENANCE_NEGLECT injection(s) (D7).`,
    );
    return { ...result, neglectHeatSoft: neglectHeat.soft, neglectHeatHard: neglectHeat.hard };
  }
}

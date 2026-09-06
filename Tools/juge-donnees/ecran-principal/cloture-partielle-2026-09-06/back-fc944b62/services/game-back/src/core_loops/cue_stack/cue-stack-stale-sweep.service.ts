// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 (`CUE_STACK_STALE_SWEEP`
//             N/29 provisional — executing > horizon getter → resolved, crash-safe).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.2 (crash-safe
//             floor note) + §14 (`cue_stack_stale_executing_horizon_hours`, C1 getter, default 48h).
//             Pattern: `MycelialMaintenanceAdvanceService`'s own `OnApplicationBootstrap` + `registerSystem`
//             + "one public runTick both the scheduler AND the `_test` route call" shape (Lesson #3).
//             — P3-D C3 — 2026-07-14
//
// `CueStackStaleSweepService` — registers `CUE_STACK_STALE_SWEEP` at NIGHTLY/29 (confirmed free, plan §18/
// C0 re-anchor). Delegates the WHOLE tick to `CueStackExecutionRepository.staleSweep` — ONE set-based
// statement per player: any `executing` stack whose CURRENT slot has sat at the SAME
// `executing_slot_started_minute` for ≥ `cue_stack_stale_executing_horizon_hours` (×60 → game-minutes,
// the HOURLY-cadence conversion convention this codebase's `cadenceWidth(HOURLY)=60` establishes) is
// force-resolved — a crash-safe floor so a stack can never permanently occupy the player's ONE
// non-terminal I1 slot. No event is emitted (plan §C3 does not ask for one — a diagnostic recovery sweep,
// not a player-facing transition).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CueStackExecutionRepository } from './cue-stack-execution.repository';

const GAME_MINUTES_PER_HOUR = 60; // structural — mirrors cadenceWidth(Cadence.HOURLY), city_sim_scheduler.service.ts.

@Injectable()
export class CueStackStaleSweepService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CueStackStaleSweepService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly execRepo: CueStackExecutionRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.CUE_STACK_STALE_SWEEP,
      cadence: Cadence.NIGHTLY,
      order: 29,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'CueStackStaleSweepService registered CUE_STACK_STALE_SWEEP at NIGHTLY/29 — renumbered 28→29 ' +
        'at the 04g-B integration (04g-B took N/28 RANDOM_WORLD_DAILY_TICK). Force-resolves any ' +
        'executing stack stuck past the crash-safe horizon; organically a no-op for a healthy player.',
    );
  }

  /** {NIGHTLY, order 29} — public so `CueStackTestController` can drive it directly for E2E (Lesson #3).
   *  Returns the count of stacks force-resolved this call (0 the common healthy case). */
  async runTick(playerId: string, gameMinute: number): Promise<number> {
    const horizonGameMinutes = coreLoopsTunables.cueStackStaleExecutingHorizonHours * GAME_MINUTES_PER_HOUR;
    const swept = await this.execRepo.staleSweep(playerId, gameMinute, horizonGameMinutes);
    if (swept > 0) {
      this.logger.log(`CUE_STACK_STALE_SWEEP: player=${playerId} gameMinute=${gameMinute} -> ${swept} stack(s) force-resolved.`);
    }
    return swept;
  }
}

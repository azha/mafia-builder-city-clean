// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C4 (`MYCELIAL_MAINTENANCE_
//             ADVANCE` MINUTE/27 provisional — job completion per mode)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.4 (completion
//             effects per mode) + §11 (scheduler slot).
//             Pattern (registration + test-seam symmetry): `MycelialDecayTickService`'s own
//             `OnApplicationBootstrap` + `registerSystem` + "one public runTick both the scheduler AND
//             the `_test` route call" shape (Lesson #3, P3-B `flag-discipline-tick.service.ts`).
//             — P3-C C4 — 2026-07-12
//
// `MycelialMaintenanceAdvanceService` — registers `MYCELIAL_MAINTENANCE_ADVANCE` at MINUTE/27 (confirmed
// free after `LIVE_OPS_REAL_CLOCK_SWEEP`/24 — MINUTE/25 courtesy-skipped for 04f-B, MINUTE/26 reserved
// for the future `BACKPRESSURE_UPDATE`, plan §11). Delegates the WHOLE tick to `LegRepository.
// completeDueMaintenanceJobs` — ONE set-based statement, no orchestration logic of its own beyond
// resolving the ONE getter-sourced tunable the completion formula needs (design §5.4):
//   - `mycelial_quick_patch_residual_debt` (0.2 default) — QUICK_PATCH's partial-clear ceiling.
// STRUCTURAL_REINFORCE's completion effect (`debt_load = 0`) needs no tunable at all (a hardcoded full
// clear, design §5.4 verbatim).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { LegRepository } from './leg.repository';
import { coreLoopsTunables } from '../core-loops-tunables';

@Injectable()
export class MycelialMaintenanceAdvanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MycelialMaintenanceAdvanceService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly legRepository: LegRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MYCELIAL_MAINTENANCE_ADVANCE,
      cadence: Cadence.MINUTE,
      order: 27,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'MycelialMaintenanceAdvanceService registered MYCELIAL_MAINTENANCE_ADVANCE at MINUTE/27 — next ' +
        'free after LIVE_OPS_REAL_CLOCK_SWEEP/24 (25/26 reserved). Each in-game minute, per player, ONE ' +
        'set-based statement completes DUE quick_patch/structural_reinforce jobs (reroute_bypass never ' +
        "matches — its own exit is decay-driven, NIGHTLY/25). Organically a no-op for a player with no " +
        'due job.',
    );
  }

  // ───────────────────────────── the registered MINUTE/27 tick ─────────────────────────────

  /**
   * {MINUTE, order 27} — the design §5.4 completion tick for one player, delegated whole to
   * `LegRepository.completeDueMaintenanceJobs` (the ONE set-based writer). Returns the count of legs
   * completed this tick — the falsifiable idempotency proof (a completed job no longer matches the
   * predicate on a later re-run).
   *
   * Visibility: public so `SupplyChainTestController` can drive it directly for E2E (the
   * `run-mycelial-maintenance-advance` test route). Production: called only via the scheduler
   * registration (MINUTE/27).
   */
  async runTick(playerId: string, gameMinute: number): Promise<number> {
    const completed = await this.legRepository.completeDueMaintenanceJobs(
      playerId,
      gameMinute,
      coreLoopsTunables.mycelialQuickPatchResidualDebt,
    );
    this.logger.log(
      `MYCELIAL_MAINTENANCE_ADVANCE: player=${playerId} gameMinute=${gameMinute} -> ${completed} job(s) completed.`,
    );
    return completed;
  }
}

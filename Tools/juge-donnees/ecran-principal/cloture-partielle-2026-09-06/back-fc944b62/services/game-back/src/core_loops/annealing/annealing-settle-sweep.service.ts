// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("`ANNEALING_SETTLE_SWEEP`
//             M/30 provisoire real-clock constatif I6 + `SettlingCompletedEvent`").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.4 ("Le sweep de
//             complétion ... UPDATE ... RETURNING — exactly-once I6 ... Le sweep ne « décrémente » RIEN —
//             il constate l'état (state, not timer). Test falsifiable : on AVANCE l'horloge de la row").
//             Pattern (GLOBAL real-clock sweep): `operational/liveops/live-ops-scheduler.service.ts`
//             (`LiveOpsSchedulerService` — MINUTE/24, `ctx.playerId` ignored, a citywide/global-table scan
//             driven by whichever player's own per-player MINUTE loop happens to fire) — the task's own
//             explicit precedent citation ("the M/24 precedent").
//             Pattern (public method BOTH the real scheduler AND a `_test` route call — Lesson #3):
//             `cue-stack-stale-sweep.service.ts`'s own `runTick` shape.
//             — P3-D C6 — 2026-07-14
//
// `AnnealingSettleSweepService` — registers `ANNEALING_SETTLE_SWEEP` at MINUTE/30 (confirmed free, plan
// §18/C0 re-anchor row 17). UNLIKE `CueStackStaleSweepService`/`CueStackExecutionTickService` (both
// PER-PLAYER — `ctx.playerId`-scoped game-minute ticks), this sweep is GLOBAL and REAL-CLOCK (mirrors
// `LiveOpsSchedulerService` exactly): `annealing_state.settling_ends_at` is a REAL timestamp (sub-décision
// #10, minutes RÉELLES) — there is no single player's "own" game-minute tick that legitimately owns
// evaluating "has this timestamp elapsed" for potentially MANY different players' rows at once, so
// `ctx.playerId` is ignored and the WHOLE table is scanned via the `annealing_state_unsettled_idx` partial
// index (mig 0129, C1 — `ON (settling_ends_at) WHERE settled=false`, purpose-built for exactly this scan).
//
// STATE, NOT TIMER (P1 strict, design §9.4): this sweep never decrements anything — it CONSTATES
// (`AnnealingRepository.sweepSettled`'s own `WHERE settling_ends_at <= now()`). The falsifiable test seam is
// `AnnealingRepository.testBackdateEndsAt` (advance the ROW, never a sleep/clock-mock) — this sweep itself
// needs no clock-port abstraction (unlike `LiveOpsSchedulerService`'s own `LiveOpsClockPort`): a plain SQL
// `now()` is enough once the test seam backdates the ROW'S OWN `settling_ends_at` past it.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { AnnealingRepository } from './annealing.repository';

export interface AnnealingSweepResult {
  readonly completedCount: number;
  readonly completed: ReadonlyArray<{ playerId: string; buildingId: string }>;
}

@Injectable()
export class AnnealingSettleSweepService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnnealingSettleSweepService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: AnnealingRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.ANNEALING_SETTLE_SWEEP,
      cadence: Cadence.MINUTE,
      order: 30,
      // GLOBAL sweep — ctx.playerId ignored (mirrors LIVE_OPS_REAL_CLOCK_SWEEP's own established
      // precedent, city_sim_system.ts / live-ops-scheduler.service.ts): the settling window is REAL-clock
      // (sub-décision #10), not game-minute — no single firing player's own tick legitimately scopes it.
      run: async () => {
        await this.runSweep();
      },
    });
    this.logger.log(
      'AnnealingSettleSweepService registered ANNEALING_SETTLE_SWEEP at MINUTE/30 — adjacent to the ' +
        'M/24 LIVE_OPS_REAL_CLOCK_SWEEP precedent. GLOBAL real-clock sweep (ctx.playerId ignored): ' +
        'constates settled=false AND settling_ends_at<=now() rows across every player, exactly-once (I6).',
    );
  }

  /** {MINUTE/30, GLOBAL} — public so `AnnealingTestController` can drive it directly for E2E (Lesson #3 —
   *  the SAME method the real scheduler slot calls, zero live-vs-test divergence). Returns the rows THIS
   *  call actually flipped (0 the common/re-sweep case — I6's own "re-sweep → 0 write" falsifiable proof). */
  async runSweep(): Promise<AnnealingSweepResult> {
    const settled = await this.repo.sweepSettled();
    for (const row of settled) {
      // I6 exactly-once: the repository's OWN RETURNING already gated this loop to ONLY the rows THIS call
      // flipped — a concurrent sweep's own UPDATE simply matches 0 rows for any row already flipped.
      // gameMinute=0 — see SettlingCompletedEvent's own header (a GLOBAL real-clock sweep has no single
      // natural per-player game-minute to stamp).
      this.bus.emitSettlingCompleted({
        type: 'settling_completed',
        playerId: row.player_id,
        buildingId: row.building_id,
        gameMinute: 0,
      });
    }
    if (settled.length > 0) {
      this.logger.log(`ANNEALING_SETTLE_SWEEP: ${settled.length} row(s) settled this sweep.`);
    }
    return {
      completedCount: settled.length,
      completed: settled.map((r) => ({ playerId: r.player_id, buildingId: r.building_id })),
    };
  }
}

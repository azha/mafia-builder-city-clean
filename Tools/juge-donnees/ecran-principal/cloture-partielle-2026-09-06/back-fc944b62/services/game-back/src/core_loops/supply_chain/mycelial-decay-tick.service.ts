// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C3 (mycelial decay + stress
//             dérivé + slowdown)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.2 (decay) + §5.3
//             (stress, D4) + §5.5 (stress_streak).
//             Pattern (registration + test-seam symmetry): `corridor-debt.service.ts`'s own
//             `OnApplicationBootstrap` + `registerSystem` NIGHTLY-decay shape (the closest same-family
//             precedent — a per-player NIGHTLY decay tick over a per-edge ledger table) + `flag-
//             discipline-tick.service.ts`'s "one public method both the scheduler AND the `_test` route
//             call" Lesson #3 shape.
//             — P3-C C3 — 2026-07-12
//
// `MycelialDecayTickService` — registers `MYCELIAL_DECAY_TICK` at NIGHTLY/25 (confirmed free after
// FLAG_DISCIPLINE_TICK/24 — nothing registered past it on this base, C0/C3 re-anchor). Delegates the
// WHOLE tick to `LegRepository.applyNightlyDecayAndStressEval` — ONE set-based statement, no orchestration
// logic of its own beyond resolving the 3 getter-sourced tunables the formula needs (design §5.2/§5.3):
//   - `mycelial_natural_decay_per_minute` (0.02 default) — the decay RATE.
//   - `mycelial_cooling_period_ticks_for_decay_start` (12 default) — the idle-minutes gate before decay
//     starts.
//   - `mycelial_stress_threshold` (0.85 default) — the `stressed` derivation boundary (D4, never stored
//     as its own column — see `mycelial-stress.ts`'s header for the SAME derivation reused at dispatch).
//
// `runTick(playerId, gameMinute)` is the ONE method BOTH the scheduler hook and the `run-mycelial-decay`
// `_test` route call (Lesson #3, zero live-vs-test divergence) — mirrors `CorridorDebtService.
// runDecayTick`'s own "ctx in, no return value needed beyond the count" shape, except this tick DOES
// return the touched-count (the falsifiable idempotency proof the C3 floor requires: a same-`gameMinute`
// re-run returns 0).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { LegRepository } from './leg.repository';
import { MycelialStressExceptionProducer } from './mycelial-stress-exception-producer.service';
import { coreLoopsTunables } from '../core-loops-tunables';

/** The `stress_streak` value design §5.5 names as the persistent-stress Exception trigger. */
const STRESS_STREAK_EXCEPTION_TRIGGER = 2;

@Injectable()
export class MycelialDecayTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MycelialDecayTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly legRepository: LegRepository,
    // P3-C C4 — the persistent-stress producer (design §5.5). Called IN-LINE after the decay tick's own
    // set-based write (DD-P2: no new event bus — this tick already holds the stress_streak transition).
    private readonly stressProducer: MycelialStressExceptionProducer,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MYCELIAL_DECAY_TICK,
      cadence: Cadence.NIGHTLY,
      order: 25,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'MycelialDecayTickService registered MYCELIAL_DECAY_TICK at NIGHTLY/25 — next free after ' +
        'FLAG_DISCIPLINE_TICK/24. Each in-game night, per player, ONE set-based statement decays IDLE ' +
        'supply_chain_legs (idle >= cooling period) + maintains stress_streak for every touched leg ' +
        '(idle or actively-accruing). Day-keyed idempotent on last_decay_eval_tick. Organically a no-op ' +
        'for a player with no legs.',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/25 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 25} — the design §5.2/§5.3/§5.5 decay+stress-streak eval for one player, delegated whole to
   * `LegRepository.applyNightlyDecayAndStressEval` (the ONE set-based writer). Returns the count of legs
   * touched — the falsifiable idempotency proof (a same-`gameMinute` re-run returns 0).
   *
   * P3-C C4 ADDITION — after the set-based write lands, every touched leg whose RESULTANT
   * `stress_streak >= 2` (design §5.5) is offered to `MycelialStressExceptionProducer` (its OWN per-leg
   * dedup decides raised/deduped/cap_refused — calling it for every touched leg above the trigger, every
   * night, is deliberately NOT gated to "exactly streak===2" here: the dedup gate is what actually
   * prevents card-spam while one is pending; a leg whose card was resolved and is STILL stressed the
   * NEXT night legitimately raises a NEW one, matching `FlagExhaustionFallbackService`'s own "fires every
   * qualifying occurrence, dedup collapses it" convention).
   *
   * Visibility: public so `SupplyChainTestController` can drive it directly for E2E (the `run-mycelial-
   * decay` test route). Production: called only via the scheduler registration (NIGHTLY/25).
   */
  async runTick(playerId: string, gameMinute: number): Promise<number> {
    const touched = await this.legRepository.applyNightlyDecayAndStressEval(
      playerId,
      gameMinute,
      coreLoopsTunables.mycelialNaturalDecayPerMinute,
      coreLoopsTunables.mycelialCoolingPeriodTicksForDecayStart,
      coreLoopsTunables.mycelialStressThreshold,
      coreLoopsTunables.mycelialBypassResumeThreshold,
    );
    this.logger.log(`MYCELIAL_DECAY_TICK: player=${playerId} gameMinute=${gameMinute} -> ${touched.length} leg(s) touched.`);

    for (const leg of touched) {
      if (leg.stressStreak >= STRESS_STREAK_EXCEPTION_TRIGGER) {
        const outcome = await this.stressProducer.raiseIfClear(playerId, leg);
        this.logger.log(
          `MYCELIAL_DECAY_TICK: player=${playerId} leg=${leg.legId} stress_streak=${leg.stressStreak} -> stress exception ${outcome}.`,
        );
      }
    }

    return touched.length;
  }
}

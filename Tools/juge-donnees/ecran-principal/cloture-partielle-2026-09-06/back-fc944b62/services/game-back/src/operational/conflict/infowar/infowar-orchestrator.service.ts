// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Pattern: services/game-back/src/operational/conflict/combat/deescalation-tick.service.ts
//                      (Lesson #3: runCombatDailyTickForPlayer — shared per-entity method)
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// InformationWarfareOrchestratorService — registers INFO_LOOP_DAILY_TICK (NIGHTLY/15).
//
// onApplicationBootstrap():
//   registerSystem({ id: INFO_LOOP_DAILY_TICK, cadence: NIGHTLY, order: 15,
//     run: (ctx) => this.runInfoLoopTick(ctx) })
//
// runInfoLoopTick(ctx): private wrapper → calls runInfoLoopTickForPlayer(ctx.playerId, ctx.gameMinute)
//
// ★ Lesson #3 — runInfoLoopTickForPlayer (the SHARED per-entity method):
//   Called by BOTH the scheduler run callback AND the _test route.
//   Zero live-vs-test divergence.
//
// L1 empty-state skip:
//   If no dead_reckoning_belief rows → no info-warfare rows → ZERO writes (no-op).
//   This keeps all pre-C9 specs byte-identical green.
//
// Per-rival loop (for each belief row):
//   1. deadReckoning.decayBeliefStatePerTick(playerId, rivalKey)
//   2. observation.runSurveillance(playerId, rivalKey, gameMinute)
//   3. purgeTrap.evalPurge(playerId, rivalKey, gameMinute)
// Per-rival try/catch (a fault on one rival never breaks others).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { InformationWarfareRepository } from './infowar.repository';
import { DeadReckoningService } from './dead-reckoning.service';
import { ObservationDisturbanceService } from './observation-disturbance.service';
import { PurgeTrapService } from './purge-trap.service';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class InformationWarfareOrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InformationWarfareOrchestratorService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: InformationWarfareRepository,
    private readonly deadReckoning: DeadReckoningService,
    private readonly observation: ObservationDisturbanceService,
    private readonly purgeTrap: PurgeTrapService,
  ) {}

  /**
   * Register INFO_LOOP_DAILY_TICK on the shared scheduler at application boot.
   * Cadence: NIGHTLY / order 15 (next-free after COMBAT_DAILY_TICK/NIGHTLY/14).
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id:      CitySystemId.INFO_LOOP_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order:   15,
      run:     (ctx) => this.runInfoLoopTick(ctx),
    });
  }

  // ─── Private scheduler entry point ────────────────────────────────────────────────────────────

  private async runInfoLoopTick(ctx: CitySimTickContext): Promise<void> {
    await this.runInfoLoopTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  // ─── ★ Shared per-entity method (Lesson #3) ───────────────────────────────────────────────────

  /**
   * `runInfoLoopTickForPlayer` — the SAME per-entity method called by BOTH the scheduler run
   * callback AND the `run-info-loop-tick` _test route.
   *
   * Lesson #3 pattern: no test-only logic duplicated; the _test route drives the SAME production
   * code path as the scheduler — guaranteeing zero live-vs-test divergence.
   *
   * L1 empty-state skip:
   *   If no dead_reckoning_belief rows exist for this player → ZERO writes (no-op).
   *   This keeps all pre-C9 specs byte-identical green.
   *
   * Per-rival execution: for each belief row, run all 3 mechanics inside a try/catch.
   * A fault on one rival is logged and contained; the tick continues for other rivals.
   *
   * The 3 mechanics (in order, same rival — game-time gameMinute):
   *   1. DeadReckoningService.decayBeliefStatePerTick(playerId, rivalKey)
   *      — applies per-tick belief decay (bands shift toward floor values)
   *   2. ObservationDisturbanceService.runSurveillance(playerId, rivalKey, gameMinute)
   *      — seeded detection draw; lands disinfo if PULL rival; degrades INTEL register
   *   3. PurgeTrapService.evalPurge(playerId, rivalKey, gameMinute)
   *      — checks purge state; capacity-drain deferred to calibration TD
   *
   * PUBLIC: called by both the scheduler AND InformationWarfareTestController (Lesson #3).
   *
   * @param playerId   - the player whose daily info-loop tick fires
   * @param gameMinute - the in-game minute (from ctx)
   */
  async runInfoLoopTickForPlayer(playerId: string, gameMinute: number): Promise<void> {
    // L1 empty-state skip — list all dead_reckoning_belief rows for this player
    const hasRows = await this.repo.hasAnyInfoWarRows(playerId);
    if (!hasRows) {
      // L1 empty-state skip — ZERO writes for pre-infowar world (byte-identical no-regression)
      return;
    }

    const beliefRows = await this.repo.listBeliefRows(playerId);

    for (const row of beliefRows) {
      const rivalKey = row.rival_key as RivalKey;

      try {
        // 1. Dead-Reckoning belief decay (bands drift toward floor on each tick)
        await this.deadReckoning.decayBeliefStatePerTick(playerId, rivalKey);

        // 2. Observation-Disturbance: seeded detection draw → disinfo + adaptive-skin + INTEL degrade
        await this.observation.runSurveillance(playerId, rivalKey, gameMinute);

        // 3. Purge-Trap eval (reads current purge state; capacity-drain deferred)
        await this.purgeTrap.evalPurge(playerId, rivalKey, gameMinute);

      } catch (err) {
        // Per-rival isolation: one bad rival never breaks the tick or other rivals
        this.logger.error(
          `InfoWarOrchestrator: tick failed for player=${playerId} rival=${rivalKey} ` +
          `at gameMinute=${gameMinute}: ${err}`,
        );
      }
    }
  }
}

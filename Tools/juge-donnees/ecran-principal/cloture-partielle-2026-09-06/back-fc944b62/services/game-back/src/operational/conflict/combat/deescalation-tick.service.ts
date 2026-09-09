// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 10 (C-deesc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §5
//             Canon: docs/tech/04b_combat_and_conflict/de_escalation_mechanics.md §6.1 + §6.2
//             — C-deesc — 2026-06-25 —
//
// `DeEscalationTickService` — registers COMBAT_DAILY_TICK (NIGHTLY / order 14) on the shared
// scheduler. Mirrors the EscalationTickService pattern (TWELVE_H / order 7).
//
// Schedule slot (city_sim_system.ts):
//   COMBAT_DAILY_TICK — Cadence.NIGHTLY / order 14
//   (next-free after RIVAL_DAILY_TICK/NIGHTLY/13).
//   Each in-game night it drives 4 per-player de-escalation / decay operations via
//   `runCombatDailyTickForPlayer` (the shared per-entity method — Lesson #3):
//     1. MaladaptiveMemoryService.decayDepthOnQuietTicks  (C-esc §4.4 — quiet-tick depth decay)
//     2. FamiliarityDiscountService.accrueFamiliarity      (C-deesc §5.1 — dear-enemy accrual)
//     3. EphemeralOperationService.clearStateOlderThanWindow (C6 — ephemeral state expiry)
//     4. CumulativeAttritionService.decayCPIDaily          (C8 — CPI daily decay)
//
// ★ Lesson #3 (shared per-entity method):
//   The scheduler's `run` callback calls `runCombatDailyTickForPlayer` — the SAME method
//   the `drive-daily-tick` _test route calls. Zero live-vs-test divergence.
//
// L1 empty-state skip (byte-identical no-regression guarantee):
//   If no deescalation_pair_state rows exist for this player,
//   the tick exits immediately with ZERO writes. This keeps all existing specs green for
//   a pre-deesc world.
//
// Per-rival try/catch (the per-rival isolation pattern from RivalTickService):
//   A fault on ONE pair is logged and contained — it never breaks the tick or another pair.
//   The 4 decays for a given rivalKey run inside the same try/catch; if any sub-call throws,
//   that rivalKey is skipped and the next one continues.
//
// Determinism: NO Math.random(). NO Date.now(). game-time via ctx.gameMinute.
// ADDITIVE: only reads/upserts deescalation + escalation pair tables. Zero-regression invariant.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { CombatRepository } from './combat.repository';
import { MaladaptiveMemoryService } from './maladaptive-memory.service';
import { FamiliarityDiscountService } from './familiarity-discount.service';
import { EphemeralOperationService } from './ephemeral-operation.service';
import { CumulativeAttritionService } from './cumulative-attrition.service';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class DeEscalationTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeEscalationTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly combatRepo: CombatRepository,
    private readonly maladaptive: MaladaptiveMemoryService,
    private readonly familiarity: FamiliarityDiscountService,
    private readonly ephemeral: EphemeralOperationService,
    private readonly cumulativeAttrition: CumulativeAttritionService,
  ) {}

  /**
   * Register COMBAT_DAILY_TICK on the shared scheduler at application boot.
   * Cadence: NIGHTLY / order 14 (next-free after RIVAL_DAILY_TICK/NIGHTLY/13).
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id:      CitySystemId.COMBAT_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order:   14,
      run:     (ctx) => this.runCombatDailyTick(ctx),
    });
  }

  // ─── Private scheduler entry point ────────────────────────────────────────────────────────────

  private async runCombatDailyTick(ctx: CitySimTickContext): Promise<void> {
    await this.runCombatDailyTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  // ─── ★ Shared per-entity method (Lesson #3) ───────────────────────────────────────────────────

  /**
   * `runCombatDailyTickForPlayer` — the SAME per-entity method called by BOTH the scheduler run
   * callback AND the `drive-daily-tick` _test route.
   *
   * Lesson #3 pattern: no test-only logic duplicated; the _test route drives the SAME production
   * code path as the scheduler — guaranteeing zero live-vs-test divergence.
   *
   * L1 empty-state skip:
   *   If no deescalation_pair_state rows exist for this player → ZERO writes (no-op).
   *   This keeps all pre-deesc specs byte-identical green.
   *
   * Per-pair execution: for each deescalation pair, run all 4 decays inside a try/catch.
   * A fault on one pair is logged and contained; the tick continues for other pairs.
   *
   * The 4 decays (in order, same pair — game-time ctx.gameMinute):
   *   1. MaladaptiveMemoryService.decayDepthOnQuietTicks(playerId, rivalKey, 1)
   *      — quiet tick count 1 (each nightly tick is 1 quiet tick; the service gates on ≥10)
   *   2. FamiliarityDiscountService.accrueFamiliarity(playerId, rivalKey)
   *      — accrues +accrualRate only when no active conflict (service checks combat_event)
   *   3. EphemeralOperationService.clearStateOlderThanWindow(playerId, rivalKey)
   *      — purges ephemeral combat_event trail if ephemeral_mode=true for this pair
   *   4. CumulativeAttritionService.decayCPIDaily(playerId, rivalKey)
   *      — applies the daily CPI decay (C8)
   *
   * @param playerId   - the player whose nightly de-escalation tick fires
   * @param gameMinute - the in-game minute (from ctx)
   */
  async runCombatDailyTickForPlayer(playerId: string, gameMinute: number): Promise<void> {
    // L1 empty-state skip — get all deescalation pair rows for this player
    const deescalationPairs = await this.combatRepo.readAllDeescalationPairsForPlayer(playerId);

    if (deescalationPairs.length === 0) {
      // L1 empty-state skip — ZERO writes for pre-deesc world (byte-identical no-regression)
      return;
    }

    // Run 4 decays per pair
    for (const pair of deescalationPairs) {
      const rivalKey = pair.rival_key as RivalKey;

      try {
        // 1. Maladaptive depth decay on quiet ticks
        //    quietTickCount=10 per daily tick: one nightly sweep represents a full 10-tick quiet window.
        //    The service gates on ≥QUIET_TICKS_WINDOW (10) — passing 10 triggers one decay window per
        //    nightly sweep. This models the game-time accumulation of 10 quiet ticks in a game-day
        //    (daily tick cadence aggregates multiple per-minute quiet sub-ticks — 10 per sweep is the
        //    canonical daily-decay quantum matching the QUIET_TICKS_WINDOW threshold).
        await this.maladaptive.decayDepthOnQuietTicks(playerId, rivalKey, 10);

        // 2. Familiarity accrual (§5.1 dear-enemy effect)
        //    Service checks for active combat_event — accrues only when no conflict
        await this.familiarity.accrueFamiliarity(playerId, rivalKey);

        // 3. Ephemeral operation purge (C6 — DIV-E1 trace cleanup)
        //    Service gates on ephemeral_mode=true; no-op otherwise
        await this.ephemeral.clearStateOlderThanWindow(playerId, rivalKey);

        // 4. CPI daily decay (C8)
        await this.cumulativeAttrition.decayCPIDaily(playerId, rivalKey);

      } catch (err) {
        // Per-pair isolation: one bad pair never breaks the tick or other pairs
        this.logger.error(
          `DeEscalationTick: decay failed for player=${playerId} rival=${rivalKey} ` +
          `at gameMinute=${gameMinute}: ${err}`,
        );
      }
    }
  }
}

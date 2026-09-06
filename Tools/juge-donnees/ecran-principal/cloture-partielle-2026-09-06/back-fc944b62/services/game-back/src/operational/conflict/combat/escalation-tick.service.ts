// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 9 (C-esc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9
//             Canon: docs/tech/04b_combat_and_conflict/tick_schedule_and_memory_budget_conflict.md
//             — C-esc — 2026-06-25 —
//
// `EscalationTickService` — registers ESCALATION_TICK (TWELVE_H / order 7) on the shared scheduler.
//
// Schedule slot (city_sim_system.ts):
//   ESCALATION_TICK — Cadence.TWELVE_H / order 7
//   (next-free after RIVAL_REGIME_TICK/TWELVE_H/6).
//   Each 12-game-hour sweep:
//     (1) L1 empty-state skip: if no escalation rows → ZERO writes (pre-B world byte-identical).
//     (2) SandpileStateService.recomputeCriticality — SOC criticality + seeded cascade draw.
//     (3) ResonantCadenceService.recomputeResonanceFactor — per-pair resonance update.
//     (4) OscillationTrapService.recomputeLekDynamics — per-contested-lek Lotka-Volterra update.
//
// ★ Lesson #3 (shared per-entity method):
//   The scheduler's `run` callback calls `runEscalationTickForPlayer` — the SAME method
//   the _test route calls. No test-only logic duplicated. Same production path drives both.
//
// L1 empty-state skip (byte-identical no-regression guarantee):
//   If no escalation_global_state row, no escalation_pair rows, and no oscillation_lek rows
//   exist for this player, the tick exits immediately with ZERO writes. This keeps all existing
//   specs green for a pre-B world.
//
// Per-pair / per-lek try/catch (the per-rival isolation pattern from RivalTickService):
//   A fault on ONE pair/lek is logged and contained — it never breaks the tick or another pair.
//
// Determinism: NO Math.random(). NO Date.now(). game-time via ctx.gameMinute.
// ADDITIVE: only reads/upserts escalation tables. Zero-regression invariant.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { CombatRepository } from './combat.repository';
import { SandpileStateService } from './sandpile-state.service';
import { MaladaptiveMemoryService } from './maladaptive-memory.service';
import { ResonantCadenceService } from './resonant-cadence.service';
import { OscillationTrapService } from './oscillation-trap.service';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class EscalationTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EscalationTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly combatRepo: CombatRepository,
    private readonly sandpile: SandpileStateService,
    private readonly maladaptive: MaladaptiveMemoryService,
    private readonly resonantCadence: ResonantCadenceService,
    private readonly oscillationTrap: OscillationTrapService,
  ) {}

  /**
   * Register ESCALATION_TICK on the shared scheduler at application boot.
   * Cadence: TWELVE_H / order 7 (next-free after RIVAL_REGIME_TICK/TWELVE_H/6).
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id:      CitySystemId.ESCALATION_TICK,
      cadence: Cadence.TWELVE_H,
      order:   7,
      run:     (ctx) => this.runEscalationTick(ctx),
    });
  }

  // ─── Private scheduler entry point ────────────────────────────────────────────────────────────

  private async runEscalationTick(ctx: CitySimTickContext): Promise<void> {
    await this.runEscalationTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  // ─── ★ Shared per-entity method (Lesson #3) ───────────────────────────────────────────────────

  /**
   * `runEscalationTickForPlayer` — the SAME per-entity method called by BOTH the scheduler run
   * callback AND the `drive-escalation-tick` _test route.
   *
   * This is the lesson #3 pattern: no test-only logic duplicated; the _test route drives the
   * SAME production code path as the scheduler.
   *
   * L1 empty-state skip: if no escalation rows exist for this player → ZERO writes (no-op).
   */
  async runEscalationTickForPlayer(playerId: string, gameMinute: number): Promise<void> {
    // L1 empty-state skip — check for any escalation rows
    const globalRow   = await this.combatRepo.readEscalationGlobal();
    const pairRows    = await this.combatRepo.readAllEscalationPairsForPlayer(playerId);
    const lekRows     = await this.combatRepo.readAllOscillationLeksForPlayer(playerId);

    if (!globalRow && pairRows.length === 0 && lekRows.length === 0) {
      // L1 empty-state skip — ZERO writes for pre-B world
      return;
    }

    // (1) Sandpile SOC: recompute criticality + seeded cascade draw
    try {
      await this.sandpile.recomputeCriticality(playerId, gameMinute);
    } catch (err) {
      this.logger.error(`EscalationTick sandpile failed for player ${playerId}: ${err}`);
    }

    // (2) Resonant Cadence: recompute resonance_factor for each active pair
    for (const pair of pairRows) {
      try {
        await this.resonantCadence.recomputeResonanceFactor(
          pair.player_id,
          pair.rival_key as RivalKey,
          gameMinute,
        );
      } catch (err) {
        this.logger.error(
          `EscalationTick resonance failed for pair (${pair.player_id}, ${pair.rival_key}): ${err}`,
        );
      }
    }

    // (3) Oscillation Trap: run Lotka-Volterra dynamics for each contested lek
    for (const lek of lekRows) {
      try {
        await this.oscillationTrap.recomputeLekDynamics(
          lek.player_id,
          lek.tile_id,
          lek.rival_key as RivalKey,
        );
      } catch (err) {
        this.logger.error(
          `EscalationTick lek dynamics failed for tile ${lek.tile_id}: ${err}`,
        );
      }
    }
  }
}

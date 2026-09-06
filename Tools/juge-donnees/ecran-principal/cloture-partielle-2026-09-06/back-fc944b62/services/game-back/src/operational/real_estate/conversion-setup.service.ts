// IMPLEMENTS: docs/tech/04a_operational_systems/conversion_setup.md §Workflow de conversion (the multi-tick
//             state machine GUTTING → INSTALLING → TESTING → OPERATIONAL) + Inv 1/2 (qualitative stages, no
//             numeric progress exposed) + docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md
//             §Full tick schedule (the MINUTE band) + docs/tech/09_data_model/schema_operational_chain.md §2
//             (building_operational_state — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// `ConversionSetupService` — the OPERATIONAL tick-hook that advances in-progress building conversions. It is NOT one
// of the 11 city-sim systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the
// registry contract). It mirrors HeatPropagationService's registration shape EXACTLY (OnApplicationBootstrap →
// registerCadence via the SAME registerSystem path Heat uses at MINUTE/4), REPLACING the no-op placeholder the
// scheduler seeds at the MINUTE/6 = OPERATIONAL_SETUP slot. This is the tick-hook PATTERN T2–T6 inherit.
//
// THE MINUTE/6 TICK (conversion_setup.md §Workflow — the slow-tick P1 setup advance; the player is NOT blocked
// behind an active timer), per player:
//   - BATCH-READ all in-progress conversions in ONE query (conversion_stage NOT IN ('none','operational')) — the
//     Phase-1 determinism discipline (batched read, no per-row queries).
//   - DECREMENT each setup_remaining_ticks by 1 (one game-minute elapsed this tick), floored at 0.
//   - When a building reaches 0 remaining ticks: flip conversion_stage → 'operational' + stamp became_operational_at.
//   - Persist the WHOLE batch in ONE set-based UPDATE (no per-row writes).
//
// CONVERSION_STAGE BAND (conversion_setup.md §Stage 1/2/3 — GUTTING → INSTALLING → TESTING): convert() seeds the
// stage to 'gutting' (the first setup stage). The per-stage split of the total duration is carried by the composite
// `_by_type_cover` tunables that are UNRESOLVED in gdd/14 (`gut/install/testing_duration_ticks = composite:by_type[_
// cover]`, no scalar split). To invent NO split scalar, this tick does NOT churn the intra-setup stage band — it
// keeps the building in 'gutting' (= "in setup") for the whole setup, and the LOAD-BEARING transition it drives is
// the qualitative GUTTING → OPERATIONAL flip at completion. The intra-setup INSTALLING/TESTING refinement is a
// documented follow-up for when the per-stage composites resolve (it needs the per-stage split this tick must not
// fabricate). The player only ever sees the qualitative stage band (R2.2 — §Stage 3: "jamais des pourcentages
// numériques exposés"); no numeric progress is exposed by this design.
//
// DETERMINISM (NO RNG): the decrement (−1/tick) + the operational flip (remaining == 0) are FIXED functions of the
// persisted setup_remaining_ticks. Two players with identical conversions + identical advances land on identical
// completion semantics. Organically a no-op (no in-progress conversion).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { RealEstateRepository, type SetupMutation } from './real-estate.repository';
// 04f-A C1 (design §3, D1) — REUSE the SAME game-day derivation the effect engine (applied_at_game_day) and
// the political calendar tick already use (political-trigger-evaluators.ts), so the maintenance anchor never
// drifts from that shared convention. `citySimTunables.inGameDayLengthMinutes` is the REAL clock day-length
// (never the test-only OPERATIONAL_DAY_LENGTH_MINUTES shrink, which only scales setup/lead TICK COUNTS, not
// the clock itself — _fast_tunables.ts's own header note).
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { citySimTunables } from '../../citysim/citysim-tunables';

@Injectable()
export class ConversionSetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConversionSetupService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: RealEstateRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'ConversionSetupService registered at MINUTE/6 (OPERATIONAL_SETUP) — drains setup_remaining_ticks on ' +
        'in-progress building conversions each in-game minute; flips conversion_stage → operational at 0. ' +
        'Batched read/write (Phase-1 determinism). Organically a no-op (no in-progress conversion).',
    );
  }

  /** Register the MINUTE/6 = OPERATIONAL_SETUP slot (the SAME registerSystem path Heat uses at MINUTE/4). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.OPERATIONAL_SETUP,
      cadence: Cadence.MINUTE,
      order: 6,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/6 tick ─────────────────────────────

  /**
   * {MINUTE, order 6} — advance the player's in-progress conversions by one game-minute. Batch-reads the in-progress
   * set, decrements each setup_remaining_ticks (floored at 0), flips conversion_stage → 'operational' (+ stamps
   * became_operational_at AND, 04f-A C1, last_maintained_at_game_day = the current game-day — D1 anchor, "fresh
   * window at OPERATIONAL") on the buildings that reach 0 this tick, and persists the whole batch in ONE UPDATE.
   * Deterministic (NO RNG). Organically a no-op (no in-progress conversion).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const inProgress = await this.repo.listInProgressConversions(ctx.playerId);
    if (inProgress.length === 0) return; // no in-progress conversion → clean no-op.

    // 04f-A C1 — the SAME game-day for every building completing THIS tick (batch-level, not per-row: all
    // completions in one MINUTE tick share ctx.gameMinute).
    const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);

    const mutations: SetupMutation[] = inProgress.map((c) => {
      const remaining = Math.max(0, c.setup_remaining_ticks - 1); // one game-minute elapsed this tick.
      const becameOperational = remaining === 0;
      return {
        building_id: c.building_id,
        setup_remaining_ticks: remaining,
        // Flip to 'operational' on completion; otherwise keep the building in its current setup stage. The repo's
        // batched UPDATE preserves the existing conversion_stage when became_operational is false (it only overwrites
        // the stage for completing buildings) — so 'gutting' (the seed) persists through setup. See the header note.
        became_operational: becameOperational,
      };
    });

    await this.repo.applySetupBatch(ctx.playerId, mutations, gameDay);
  }
}

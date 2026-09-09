// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.1
//             Scheduler seam S1: services/game-back/src/citysim/scheduler/city_sim_system.ts (CitySystemId
//             + Cadence) + city_sim_scheduler.service.ts (SCHEDULE + registerSystem) — HOURLY/6, the
//             next-free slot after SESSION_SWEEP/5 (C0 re-anchor, `2026-07-13-04g-A-C0-reanchor.md` §1 S1).
//             Pattern: mirrors political-calendar-tick.service.ts's `onApplicationBootstrap` +
//             `registerSystem` shape, and meta-market-tick.service.ts's simpler "no playerId needed"
//             HOURLY registration (META_MARKET_AGGREGATION_TICK) — this tick is ALSO a pure city-global
//             aggregation, independent of any one player's state, so `ctx.playerId` is never threaded.
//             — 04g-A C1 — 2026-07-13
//
// `ConstantHumService` — the 168-cell weekly heat baseline grid (design §3.1), registered as
// `CONSTANT_HUM_CELL_TICK` at HOURLY/6.
//
// THE TICK BODY (per-player-firing, city-global-state — SAME established shape as
// `PoliticalCalendarTickService`/`MetaMarketAggregationService`, see file header): the city-sim engine is
// per-player-clocked, so `run(ctx)` fires once per PLAYER's own HOURLY boundary crossing — yet the grid
// is explicitly city-global (design §3.1 D3/D4: "AVG(building.heat) par district cross-player"). The
// idempotency guard is NOT in a singleton watermark (unlike the political calendar) — `constant-hum.
// repository.ts`'s `foldHourlyObservation` claims idempotency PER CELL, via `last_updated_game_day`
// (see that file's own header for why this is sufficient without a separate singleton row).
//
// ORDER OF OPERATIONS (design §3.1):
//   1. derive `hourOfWeek` (0..167, `ambient-clock.ts`) + `gameDay` from `gameMinute` — NEVER `Date.now()`.
//   2. ONE set-based `AVG(buildings.heat)` GROUP BY district query (`aggregateAvgHeatByDistrict`).
//   3. for each district returned (a district with ZERO buildings returns NO row — C1 AC6 negation):
//      fold the observation into cell (district_id, hourOfWeek) via the atomic per-cell claim.
//
// Determinism: NO Math.random() anywhere in this file. The fold is a pure function of (observed rows,
// `ambientTunables.constantHumCellEmaAlpha`) — re-running the SAME tick against the SAME DB state (a
// claim already consumed) is a no-op, byte-identical (C1 AC5).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { ambientTunables } from './ambient.tunables';
import { deriveGameDay, deriveHourOfWeek } from './ambient-clock';
import { ConstantHumRepository } from './constant-hum.repository';

/** The HOURLY slot this tick registers at — next-free after SESSION_SWEEP/5 (C0 re-anchor). */
export const CONSTANT_HUM_CELL_TICK_ORDER = 6;

/** One district's fold outcome this tick — returned by the production path (logged) and the gated
 *  test-only direct-probe route (`ambient-test.controller.ts`, falsifiable assertions). */
export interface ConstantHumDistrictFoldResult {
  readonly districtId: number;
  readonly folded: boolean;
  readonly ema: number;
  readonly sampleCount: number;
}

/** Result of one `runHourlyTick` call. */
export interface ConstantHumTickResult {
  readonly gameDay: number;
  readonly hourOfWeek: number;
  readonly districts: readonly ConstantHumDistrictFoldResult[];
}

@Injectable()
export class ConstantHumService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConstantHumService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: ConstantHumRepository,
  ) {}

  /**
   * Register `CONSTANT_HUM_CELL_TICK` at HOURLY/6 on the shared scheduler at application bootstrap. The
   * slot is declared in `CitySimSchedulerService.SCHEDULE` + `CitySystemId` (C1 additions, same commit) —
   * `registerSystem` throws at boot if it is not.
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.CONSTANT_HUM_CELL_TICK,
      cadence: Cadence.HOURLY,
      order: CONSTANT_HUM_CELL_TICK_ORDER,
      // City-global aggregation — ctx.playerId is never read (mirrors META_MARKET_AGGREGATION_TICK's own
      // shape; unlike POLITICAL_CALENDAR_TICK, no per-player state is ever consulted here).
      run: async (ctx) => { await this.runHourlyTick(ctx.gameMinute); },
    });
    this.logger.log(
      `ConstantHumService: registered CONSTANT_HUM_CELL_TICK at HOURLY/${CONSTANT_HUM_CELL_TICK_ORDER} — ` +
      'each in-game hour folds AVG(buildings.heat) cross-player per district into the 168-cell weekly grid ' +
      '(per-cell idempotency claim via constant_hum_cell.last_updated_game_day).',
    );
  }

  /**
   * The tick body — a function of `gameMinute` alone (+ persisted, deterministic DB state). Called by the
   * real scheduler registration above (`ctx.gameMinute`) AND directly by the gated test-only
   * `run-constant-hum-tick` probe (`ambient-test.controller.ts`) with an explicit `gameMinute`, bypassing
   * the (expensive, per-minute) real clock-advance harness for the "same hour next week" scenario the C1
   * acceptance criteria need (the SAME direct-probe idiom `political-calendar-tick.service.ts`'s own
   * `run-calendar-tick` established for boundary-heavy NIGHTLY mechanics).
   */
  async runHourlyTick(gameMinute: number): Promise<ConstantHumTickResult> {
    const cellsPerWeek = ambientTunables.constantHumCellsPerWeek; // STRUCTURAL — always 168.
    const hourOfWeek = deriveHourOfWeek(gameMinute, cellsPerWeek);
    const gameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    const alpha = ambientTunables.constantHumCellEmaAlpha;

    const observations = await this.repo.aggregateAvgHeatByDistrict();
    const districts: ConstantHumDistrictFoldResult[] = [];
    for (const obs of observations) {
      const fold = await this.repo.foldHourlyObservation(obs.districtId, hourOfWeek, obs.avgHeat, gameDay, alpha);
      districts.push({ districtId: obs.districtId, folded: fold.folded, ema: fold.ema, sampleCount: fold.sampleCount });
    }
    return { gameDay, hourOfWeek, districts };
  }
}

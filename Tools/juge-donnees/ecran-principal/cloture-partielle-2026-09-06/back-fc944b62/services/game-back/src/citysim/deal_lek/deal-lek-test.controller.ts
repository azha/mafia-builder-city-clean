// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md §Update tick hebdomadaire (the WEEKLY decay/
//             death tick) — test-only harness on a production-gated `/v1/_test/*` route
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekTestController` — the TEST-ONLY deterministic System-11 WEEKLY-tick driver under
// `/v1/_test/citysim/lek-weekly`.
//
// GATING: this controller is mounted by DealLekModule ONLY when NODE_ENV != 'production' (see
// DealLekModule.controllers — the same production-gating as scheduler/citysim-test.controller.ts). In production
// the route is not mounted → 404.
//
// WHY A HOOK (the CitySimTestController.emitCohesionState precedent): the deterministic advance harness runs ALL
// cadences together, so a real WEEKLY decay/death is masked by the continuous FlowCellCongested deal stream
// (System 1's flow sim re-congests every tile each time its population re-crosses the congestion boundary — a
// flow-active tile never goes quiet, so it never dies and its score saturates at the cap). This hook drives the
// IDENTICAL weekly tick the scheduler fires at WEEKLY/1, in isolation from the 2 Hz flow band, so the
// deterministic decay (Inv 2) / lek death (Inv 5) E2E can observe them. It is NOT a gameplay path — the live
// weekly tick (fired by the advance harness at the weekly boundary) is the real one; this isolates it for the E2E.

import { Controller, HttpCode, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { DealLekService } from './deal-lek.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DealLekTestController {
  constructor(private readonly deals: DealLekService) {}

  /**
   * `POST /v1/_test/citysim/lek-weekly?player_id=<uuid>&times=N&game_minute=M` — TEST-ONLY: run System 11's WEEKLY
   * tick `times` (default 1) times for the player, in isolation from the 2 Hz flow band (the identical tick the
   * scheduler fires at WEEKLY/1). Each run decays every active lek (Inv 2), accrues weeks_without_deals on a lek
   * with no deals (Inv 5 — DEAD + LekDeathEvent at 4 weeks), and resets deals_this_week. Returns `{ran, playerId}`.
   * Production-gated (NODE_ENV != 'production'). The same category of test infrastructure as the advance harness.
   */
  @Post('_test/citysim/lek-weekly')
  @HttpCode(200)
  async runLekWeekly(
    @Query('player_id') playerId?: string,
    @Query('times') timesQuery?: string,
    @Query('game_minute') gameMinuteQuery?: string,
  ): Promise<{ ran: number; playerId: string }> {
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const times = Number.parseInt(timesQuery ?? '1', 10);
    if (Number.isNaN(times) || times < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'times must be a positive integer' });
    }
    const gameMinute = Number.parseInt(gameMinuteQuery ?? '0', 10);
    for (let i = 0; i < times; i += 1) {
      // Step a distinct game-minute per run (the weekly boundary in-game) so each run is a fresh weekly tick.
      await this.deals.runWeeklyTickForTest(playerId, (Number.isNaN(gameMinute) ? 0 : gameMinute) + i);
    }
    return { ran: times, playerId };
  }
}

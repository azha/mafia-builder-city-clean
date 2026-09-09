// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the
//             event-driven heat-injection seam) — test-only harness on a production-gated `/v1/_test/*` route
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatTestController` — the TEST-ONLY deterministic HeatInjectionEvent emitter under
// `/v1/_test/citysim/heat-inject`.
//
// GATING: this controller is mounted by HeatModule ONLY when NODE_ENV != 'production' (see HeatModule.controllers —
// the same production-gating as scheduler/citysim-test.controller.ts + deal-lek-test.controller.ts). In production
// the route is not mounted → 404.
//
// WHY A HOOK (the CitySimTestController.emitCohesionState / DealLekTestController.runLekWeekly precedent): the ONLY
// BUILT organic heat-injection source is System 10's BufferOverflow, which itself needs P2 laundering nodes — so the
// HeatInjectionEvent seam has no organic producer reachable through the advance harness Phase 1. This hook emits a
// HeatInjectionEvent on the canonical CityEventBus seam — the IDENTICAL path System 10's overflow (and the deferred
// P2 producers: cash overflow / stash open / lek deal / flow congestion) plug into — so the injection → buffer →
// MINUTE/4 flush onto buildings.heat path can be exercised in isolation for the deterministic E2E. It is NOT a
// gameplay path; the live injection (System 10 overflow → re-emit) is the real one. The injection is BUFFERED and
// only applied on the next MINUTE tick (the advance harness fires it) — never a per-event DB write.

import { Controller, HttpCode, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { CityEventBus, type HeatInjectionMagnitude } from '../events/city-event-bus';

const VALID_MAGNITUDES: ReadonlySet<string> = new Set(['MICRO', 'LOW', 'LOW_MEDIUM', 'MEDIUM']);

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HeatTestController {
  constructor(private readonly bus: CityEventBus) {}

  /**
   * `POST /v1/_test/citysim/heat-inject?player_id=<uuid>&building_id=<uuid>&district_id=<n>&magnitude=LOW_MEDIUM[&game_minute=M]`
   * — TEST-ONLY: emit a HeatInjectionEvent on the canonical CityEventBus seam (the identical path System 10's
   * BufferOverflow re-emit + the deferred P2 producers use). HeatPropagationService BUFFERS it; the next MINUTE tick
   * (driven by the advance harness) flushes it onto buildings.heat. Returns `{emitted, playerId, buildingId}`.
   * Production-gated (NODE_ENV != 'production'). The same category of test infrastructure as the advance harness.
   */
  @Post('_test/citysim/heat-inject')
  @HttpCode(200)
  heatInject(
    @Query('player_id') playerId?: string,
    @Query('building_id') buildingId?: string,
    @Query('district_id') districtIdQuery?: string,
    @Query('magnitude') magnitude?: string,
    @Query('game_minute') gameMinuteQuery?: string,
  ): { emitted: true; playerId: string; buildingId: string } {
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    if (!buildingId || !/^[0-9a-f-]{36}$/.test(buildingId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'building_id must be a UUID' });
    }
    const districtId = Number.parseInt(districtIdQuery ?? '', 10);
    if (Number.isNaN(districtId) || districtId < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'district_id must be a positive integer' });
    }
    const mag = (magnitude ?? 'LOW_MEDIUM').toUpperCase();
    if (!VALID_MAGNITUDES.has(mag)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'magnitude must be MICRO|LOW|LOW_MEDIUM|MEDIUM' });
    }
    const gameMinute = Number.parseInt(gameMinuteQuery ?? '0', 10);

    this.bus.emitHeatInjection({
      type: 'heat_injection',
      playerId,
      districtId,
      buildingId,
      magnitude: mag as HeatInjectionMagnitude,
      source: 'TEST_HOOK',
      gameMinute: Number.isNaN(gameMinute) ? 0 : gameMinute,
    });
    return { emitted: true, playerId, buildingId };
  }
}

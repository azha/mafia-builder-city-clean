// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
//             Pattern: R-EC-2 test-only controller (mirrors political-event-test.controller.ts's C0/C2
//             form) — mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()` gate).
//             — 04g-A C1 — 2026-07-13
//
// `AmbientTestController` — TEST-ONLY probe routes for `AmbientModule`, under `/v1/_test/ambient/`.
//
// C1 routes:
//   GET /v1/_test/ambient/ping
//     → { ok: true } — proves AmbientModule is in the DI graph.
//
//   POST /v1/_test/ambient/run-constant-hum-tick
//     Body: { gameMinute: number }
//     Calls the REAL `ConstantHumService.runHourlyTick(gameMinute)` directly — the EXACT same tick body
//     the real HOURLY/6 scheduler registration invokes (this is NOT a re-implementation; the production
//     `run(ctx)` callback calls this SAME method with `ctx.gameMinute`). Bypasses the (expensive,
//     per-minute) real clock-advance harness for the "same hour next week" scenario the C1 acceptance
//     criteria need (mirrors `political-event-test.controller.ts`'s `run-calendar-tick`).
//     → `ConstantHumTickResult` ({ gameDay, hourOfWeek, districts }).
//
//   GET /v1/_test/ambient/read-tunables
//     Returns the 12 `ambientTunables.*` getter values (3 REUSE + 9 NEW, C1) as a plain object — anti-
//     fabrication: reads REAL getter output, not a hardcoded echo (mirrors
//     `political-event-test.controller.ts`'s `read-new-tunables`).
//
// C2 routes (this chunk):
//   POST /v1/_test/ambient/run-daily-tick
//     Body: { gameMinute: number }
//     Calls the REAL `AmbientMicroEventService.runDailyTick(gameMinute)` directly — the EXACT same tick
//     body the real NIGHTLY/27 scheduler registration invokes (phase 1: decay sweep THEN Poisson-seeded
//     generation). Bypasses the (expensive, per-minute) real clock-advance harness for the exact-minute
//     decay-boundary scenario C2's acceptance criteria need (mirrors C1's `run-constant-hum-tick`).
//     → `AmbientDailyTickResult` ({ gameDay, expiredCount, districts }).
//
// C3 routes (this chunk):
//   POST /v1/_test/ambient/run-off-hours-drift-detector
//     Body: { gameDay: number }
//     Calls the REAL `OffHoursDriftDetectorService.runDetection(gameDay)` directly — the EXACT same
//     detection body the real NIGHTLY/27 phase-2 call (`ambient-micro-event.service.ts`'s `run(ctx)`
//     callback) invokes. Bypasses the (expensive, per-minute) real clock-advance harness for the exact
//     gameDay control the C3 acceptance criteria need (mirrors C1/C2's own direct-probe idiom).
//     → `OffHoursDriftDetectionResult` ({ gameDay, districts }).
//
// No route removed — this file's progressive-route history (mirrors political-event-test.controller.ts /
// effect-engine-test.controller.ts) is append-only.

import { Controller, Get, Post, Body } from '@nestjs/common';

import { ConstantHumService, type ConstantHumTickResult } from './constant-hum.service';
import { AmbientMicroEventService, type AmbientDailyTickResult } from './ambient-micro-event.service';
import { ambientTunables } from './ambient.tunables';
import { OffHoursDriftDetectorService, type OffHoursDriftDetectionResult } from './off-hours-drift.detector';

@Controller()
export class AmbientTestController {
  constructor(
    private readonly constantHumService: ConstantHumService,
    private readonly ambientMicroEventService: AmbientMicroEventService,
    private readonly offHoursDriftDetector: OffHoursDriftDetectorService,
  ) {}

  /** C1 connectivity probe: returns { ok: true } if AmbientModule is in the DI graph. */
  @Get('_test/ambient/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * POST /v1/_test/ambient/run-constant-hum-tick
   * Body: { gameMinute: number }
   *
   * Calls the REAL `ConstantHumService.runHourlyTick(gameMinute)` directly. See file header.
   */
  @Post('_test/ambient/run-constant-hum-tick')
  runConstantHumTick(@Body() body: { gameMinute: number }): Promise<ConstantHumTickResult> {
    return this.constantHumService.runHourlyTick(body.gameMinute);
  }

  /**
   * POST /v1/_test/ambient/run-daily-tick
   * Body: { gameMinute: number }
   *
   * Calls the REAL `AmbientMicroEventService.runDailyTick(gameMinute)` directly. See file header.
   */
  @Post('_test/ambient/run-daily-tick')
  runDailyTick(@Body() body: { gameMinute: number }): Promise<AmbientDailyTickResult> {
    return this.ambientMicroEventService.runDailyTick(body.gameMinute);
  }

  /**
   * POST /v1/_test/ambient/run-off-hours-drift-detector
   * Body: { gameDay: number }
   *
   * Calls the REAL `OffHoursDriftDetectorService.runDetection(gameDay)` directly. See file header.
   */
  @Post('_test/ambient/run-off-hours-drift-detector')
  runOffHoursDriftDetector(@Body() body: { gameDay: number }): Promise<OffHoursDriftDetectionResult> {
    return this.offHoursDriftDetector.runDetection(body.gameDay);
  }

  /**
   * GET /v1/_test/ambient/read-tunables
   *
   * Returns the 12 `ambientTunables.*` getter values. See file header.
   */
  @Get('_test/ambient/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      constantHumCellsPerWeek: ambientTunables.constantHumCellsPerWeek,
      constantHumCellEmaAlpha: ambientTunables.constantHumCellEmaAlpha,
      constantHumEventsPerWardPerDay: ambientTunables.constantHumEventsPerWardPerDay,
      constantHumDecayWindowHours: ambientTunables.constantHumDecayWindowHours,
      constantHumAttendedResidueMagnitude: ambientTunables.constantHumAttendedResidueMagnitude,
      constantHumChannelCount: ambientTunables.constantHumChannelCount,
      constantHumMicroEventsPerDistrictDailyClamp: ambientTunables.constantHumMicroEventsPerDistrictDailyClamp,
      constantHumAttendDiminishingFactor: ambientTunables.constantHumAttendDiminishingFactor,
      offHoursDriftDetectionWindowDays: ambientTunables.offHoursDriftDetectionWindowDays,
      offHoursDriftThresholdPct: ambientTunables.offHoursDriftThresholdPct,
      offHoursHourBandEnd: ambientTunables.offHoursHourBandEnd,
      offHoursDriftMinCells: ambientTunables.offHoursDriftMinCells,
    };
  }
}

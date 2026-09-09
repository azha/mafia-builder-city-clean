// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (generator direct-probe
//             routes)
//             Pattern: R-EC-2 test-only controller (mirrors `ambient-test.controller.ts`'s form) —
//             mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()` gate).
//             — 04g-B C2 — 2026-07-15
//
// `RandomWorldTestController` — TEST-ONLY probe routes for `RandomWorldModule`, under
// `/v1/_test/random-world/`.
//
// Deliberately MINIMAL surface: every PURE function this lot ships (`recovery-curve.ts`'s
// `contamination`/`threePhaseMultiplier`, `scar-polygon.ts`'s `drawScarPolygon`, `district-hum-
// weighting.ts`'s `districtHumWeights`/`drawWeightedDistrict`, `random-world-event-generator.service.ts`'s
// exported `buildHailstormEffectModifiers`/`drawDistinct`) is directly IMPORTABLE by an E2E spec (plain
// TS, no Nest DI — mirrors `ambient_micro_event.spec.ts`'s own direct import of `poissonDraw`/
// `generateDistrictDraw`/`ambientMicroEventSeed`) — no HTTP wrapper needed for precompute-then-observe.
// Only the STATEFUL tick body needs a live-server route.
//
// C2 routes:
//   GET /v1/_test/random-world/ping
//     → { ok: true } — proves RandomWorldModule's C2 providers are in the DI graph.
//
//   POST /v1/_test/random-world/run-daily-tick
//     Body: { gameDay: number }
//     Calls the REAL `RandomWorldEventGeneratorService.runDailyTick(gameDay)` directly — the EXACT same
//     tick body the real NIGHTLY/28 scheduler registration invokes (mirrors `AmbientMicroEventService.
//     runDailyTick`'s direct-probe idiom). Accepts an ARBITRARY `gameDay` (no monotonicity requirement —
//     `RandomWorldEventRepository.claimDay`'s own doc comment) so a spec can jump straight to any
//     `d`/`w` value a curve assertion needs, without simulating every intermediate day.
//     → `RandomWorldDailyTickResult`.
//
//   GET /v1/_test/random-world/event/:id
//     Reads back ONE `random_world_event_active` row (clean JSON — `payload` as a real object, not a
//     psql text-mangled jsonb string). 404 if unknown.
//
//   GET /v1/_test/random-world/daily-run/:gameDay
//     Reads back ONE `random_world_daily_run` row. 404 if unknown (no claim for that game_day yet).
//
//   GET /v1/_test/random-world/tunable/:key
//     TD-351 AC10a hardening (2026-08-08): read-back probe for a `randomWorldTunables` getter, keyed by
//     its RAW registry key (e.g. `random_world.max_concurrent_active_events` — the SAME string a spec's
//     own `overrideTunable` writes, never a translated slug). AC10a/AC10b/AC11 override tunables via a
//     raw `tunable_overrides` INSERT; that override reaches THIS process asynchronously (DB trigger →
//     `pg_notify` → `TunablesStore`'s dedicated LISTEN client → snapshot reload, see
//     `config/tunables-store.ts`) — never synchronously with the INSERT. A spec that only sleeps a fixed
//     delay before the tick it's asserting on is trusting that delay to always outrun the reload; this
//     route lets it instead POLL the actual resolved value and proceed once it has genuinely decanted
//     (mirrors `tunables_hot_reload.spec.ts`'s own `pollUntil`-on-an-observable-effect idiom, applied
//     here since random_world has no OTHER endpoint whose response depends on these keys outside a
//     stateful daily tick). Only the 2 keys these 3 specs actually override are wired
//     (`NUMERIC_TUNABLE_PROBES` below) — 404 on any other key, extend the map rather than widen this
//     route's own contract.

import { Controller, Get, HttpException, HttpStatus, Param, Post, Body } from '@nestjs/common';

import { RandomWorldEventGeneratorService, type RandomWorldDailyTickResult } from './random-world-event-generator.service';
import { RandomWorldEventRepository } from './random-world-event.repository';
import { randomWorldTunables } from './random-world.tunables';
import type { RandomWorldEventActiveRow, RandomWorldDailyRunRow } from '../../db/schema/random_world';
import { UuidParam } from '../../common/param-pipes'; // Lot 0 C0 (r1 M1) — VIF mechanism control, seam _test only

/** Raw registry key → live getter, for `GET /_test/random-world/tunable/:key` below. Narrow ON PURPOSE
 *  (2 entries — the exact 2 keys AC10a/AC10b/AC11 override, TD-351 AC10a hardening 2026-08-08) — a
 *  diagnostic probe map, not a generic registry browser. */
const NUMERIC_TUNABLE_PROBES: Readonly<Record<string, () => number>> = {
  'random_world.max_concurrent_active_events': () => randomWorldTunables.maxConcurrentActiveEvents,
  'random_world.hollow_activation_probability_daily': () => randomWorldTunables.hollowActivationProbabilityDaily,
};

@Controller()
export class RandomWorldTestController {
  constructor(
    private readonly generator: RandomWorldEventGeneratorService,
    private readonly repo: RandomWorldEventRepository,
  ) {}

  /** C2 connectivity probe: returns { ok: true } if RandomWorldModule's C2 providers are in the DI graph. */
  @Get('_test/random-world/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * POST /v1/_test/random-world/run-daily-tick
   * Body: { gameDay: number }
   *
   * Calls the REAL `RandomWorldEventGeneratorService.runDailyTick(gameDay)` directly. See file header.
   */
  @Post('_test/random-world/run-daily-tick')
  runDailyTick(@Body() body: { gameDay: number }): Promise<RandomWorldDailyTickResult> {
    return this.generator.runDailyTick(body.gameDay);
  }

  /**
   * GET /v1/_test/random-world/event/:id
   *
   * Reads back ONE `random_world_event_active` row (clean JSON). 404 if unknown.
   */
  // Lot 0 C0 (r1 M1) — `UuidParam` posed HERE, on this ONE `_test`-only seam (never mounted in
  // production, `testControllersEnabled()` gate), to prove the pipe→GlobalExceptionFilter→422 chain in
  // EXECUTION (not by reading the code): a seam proves the MECHANISM, never reachability — C0's own
  // mandate ("no pipe on a handler") is scoped to PRODUCTION handlers, C1 still wires the 215 real
  // entries. Falsifiable: `tests/e2e/conventions/param_pipes_mechanism.engine.spec.ts`.
  @Get('_test/random-world/event/:id')
  async readEvent(@Param('id', UuidParam) id: string): Promise<RandomWorldEventActiveRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new HttpException(`random_world_event_active '${id}' not found`, HttpStatus.NOT_FOUND);
    }
    return row;
  }

  /**
   * GET /v1/_test/random-world/daily-run/:gameDay
   *
   * Reads back ONE `random_world_daily_run` row. 404 if unknown (no claim for that game_day yet).
   */
  @Get('_test/random-world/daily-run/:gameDay')
  async readDailyRun(@Param('gameDay') gameDayParam: string): Promise<RandomWorldDailyRunRow> {
    const gameDay = Number.parseInt(gameDayParam, 10);
    const row = await this.repo.readDailyRun(gameDay);
    if (!row) {
      throw new HttpException(`random_world_daily_run for game_day=${gameDay} not found`, HttpStatus.NOT_FOUND);
    }
    return row;
  }

  /**
   * GET /v1/_test/random-world/tunable/:key
   *
   * Read-back probe for a `randomWorldTunables` getter's CURRENT resolved value in THIS process (see
   * file header + `NUMERIC_TUNABLE_PROBES`). Returns the live getter's own output — DB-override > env >
   * gdd/14 default precedence, exactly as every real call site reads it. 404 if `key` isn't wired. Never
   * a scalar surfaced to a PLAYER-facing projection (R2.2 N/A here — a `_test/` diagnostic route, mounted
   * only when `testControllersEnabled()`).
   */
  @Get('_test/random-world/tunable/:key')
  readTunable(@Param('key') key: string): { value: number } {
    const probe = NUMERIC_TUNABLE_PROBES[key];
    if (!probe) {
      throw new HttpException(`no _test probe registered for tunable '${key}'`, HttpStatus.NOT_FOUND);
    }
    return { value: probe() };
  }
}

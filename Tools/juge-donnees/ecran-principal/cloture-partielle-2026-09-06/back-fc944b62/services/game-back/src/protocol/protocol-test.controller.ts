// IMPLEMENTS: docs/tech/18_api_protocol/envelope_format.md (test-only routes exercising the envelope)
//             -- lot-1 remediation (TD-064) ; extracted from ProtocolController (Task 2) --
//             -- lot-2 (TD-060/061): POST /v1/_test/echo-fail added to exercise FAILED_REPLAYABLE. --
//             -- lot-5 (TD-058): POST /v1/_test/echo marked @Idempotent({ required: true }) to prove
//                the per-endpoint binding: missing Idempotency-Key → 428 IDEMPOTENCY_KEY_MISSING
//                (R-ID-1 / idempotency.md §Politique par endpoint). --
//             Pattern: services/game-back/src/citysim/scheduler/scheduler.module.ts:28 +
//                      CitySimTestController (R-EC-2 — test routes catalogued and gated in prod)
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CURRENT_API_MAJOR } from './versioning';
import { ApiError } from './api-error';
import { Idempotent } from './idempotent.decorator';

/**
 * `ProtocolTestController` — TEST-ONLY routes extracted from `ProtocolController` (lot-1 TD-064).
 *
 * Mounted ONLY when `NODE_ENV !== 'production'` (conditional registration in `ProtocolModule` —
 * same pattern as `CitySimTestController` in `scheduler.module.ts:32-35`). In production the
 * NestJS module never registers this controller, so these routes return 404 (no handler), not
 * a forbidden 403. This is the correct env-gate strategy (R-EC-2): routes absent from the
 * routing table, not guarded.
 *
 * `/v1/ping` is NOT here — it lives in the always-on `ProtocolController` because it is
 * a legitimate operational surface (not a test-only route).
 *
 * Routes:
 *   GET  /v1/_test/boom      — throws a raw Error to exercise GlobalExceptionFilter 500 mapping.
 *   POST /v1/_test/echo      — non-deterministic token to make idempotent replay observable.
 *   POST /v1/_test/echo-fail — throws ApiError('VALIDATION_FAILED') 422 to exercise
 *                              FAILED_REPLAYABLE idempotency state (lot-2 TD-060/061).
 */
@Controller({ version: String(CURRENT_API_MAJOR) })
export class ProtocolTestController {
  /**
   * `GET /v1/_test/boom` — TEST-ONLY route that throws a raw (non-HttpException)
   * error, to exercise the GlobalExceptionFilter → INTERNAL_ERROR 500 mapping
   * with a scrubbed message (R-EH-6 anti-disclosure). The thrown message
   * deliberately contains a fake "at Object.<anonymous>" stack-looking string;
   * the filter MUST NOT surface it.
   */
  @Get('_test/boom')
  boom(): never {
    throw new Error('boom at Object.<anonymous> (/secret/internal/path.js:42:13)');
  }

  /**
   * `POST /v1/_test/echo` — TEST-ONLY mutation that mints a NON-deterministic
   * token each call, to make idempotent replay observable: a replay with the same
   * Idempotency-Key MUST return the memorized token (not a fresh one).
   *
   * Marked `@Idempotent({ required: true })` (lot-5 TD-058): the per-endpoint
   * binding proof — a call WITHOUT an Idempotency-Key header → 428 IDEMPOTENCY_KEY_MISSING
   * (R-ID-1 / idempotency.md §Politique par endpoint). With a valid key → proceeds normally.
   */
  @Post('_test/echo')
  @Idempotent({ required: true })
  echo(@Body() body: unknown): { token: string; echoed: unknown } {
    return { token: randomUUID(), echoed: body };
  }

  /**
   * `POST /v1/_test/echo-fail` — TEST-ONLY mutation that ALWAYS throws a 422
   * ApiError (VALIDATION_FAILED). Used to exercise the FAILED_REPLAYABLE idempotency
   * state: a 4xx handler throw MUST be persisted so a replay returns the SAME 422
   * snapshot without re-executing (idempotency.md §IdempotencyStateEnum line 72).
   *
   * Env-gated (absent in production — R-EC-2). Same controller as boom/echo.
   */
  @Post('_test/echo-fail')
  @HttpCode(422)
  echoFail(): never {
    throw new ApiError('VALIDATION_FAILED', { message: 'deliberate test failure (echo-fail fixture)' });
  }
}

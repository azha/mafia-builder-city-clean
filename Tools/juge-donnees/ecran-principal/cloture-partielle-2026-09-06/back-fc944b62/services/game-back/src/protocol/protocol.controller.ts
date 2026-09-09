// IMPLEMENTS: docs/tech/18_api_protocol/envelope_format.md (demo endpoint exercising the envelope)
//             -- session:2026-06-02 (Phase 0 Task 5) --
//             -- lot-1 remediation (TD-064): test-only routes extracted to ProtocolTestController --
import { Controller, Get } from '@nestjs/common';

import { CURRENT_API_MAJOR } from './versioning';

/**
 * `ProtocolController` — always-on operational endpoints under `/v1`.
 *
 * `@Controller({ version: '1' })` (URI versioning, versioning_strategy.md
 * §Décision actée) puts these under `/v1/...`. The raw handler return values are
 * wrapped into a `ResponseEnvelope` by the global EnvelopeInterceptor — handlers
 * return plain `data`, never the envelope (separation of concerns).
 *
 * TEST-ONLY routes (boom + echo under `_test/`) have been EXTRACTED to
 * `ProtocolTestController` (lot-1 TD-064) and are mounted only when
 * `NODE_ENV !== 'production'` (see `ProtocolModule`). `/v1/ping` is NOT a test
 * route — it is a legitimate liveness surface and stays here, always mounted.
 */
@Controller({ version: String(CURRENT_API_MAJOR) })
export class ProtocolController {
  /**
   * `GET /v1/ping` — liveness of the versioned API surface. Returns `{pong:true}`
   * as the success `data`; the interceptor wraps it in a ResponseEnvelope.
   */
  @Get('ping')
  ping(): { pong: true } {
    return { pong: true };
  }
}

// IMPLEMENTS: docs/tech/18_api_protocol/* (api-protocol module — versioning_strategy.md §Implications NestJS)
//             -- session:2026-06-02 (Phase 0 Task 5) --
//             -- lot-1 remediation (TD-064): conditional mount of ProtocolTestController --
//             Pattern: scheduler.module.ts:32-35 (CitySimTestController env-gate, R-EC-2)
//             NOTE: /v1/ping lives in ProtocolController (always mounted). Only the _test/*
//             routes (boom + echo) are gated — they move to ProtocolTestController which is
//             mounted ONLY when NODE_ENV !== 'production'.
import { Module } from '@nestjs/common';

import { ProtocolController } from './protocol.controller';
import { ProtocolTestController } from './protocol-test.controller';
import { testControllersEnabled } from './test-routes-gate';

/**
 * `ProtocolModule` — the `api-protocol/` module (versioning_strategy.md
 * §Implications NestJS — back jeu). Phase 0 hosts the demo `/v1/ping` + the
 * test-only routes that exercise the envelope/error/idempotency layer.
 *
 * The EnvelopeInterceptor, GlobalExceptionFilter, and IdempotencyInterceptor are
 * registered GLOBALLY in main.ts (not here) so they wrap every controller in the
 * monolith, not just this module. The IdempotencyInterceptor depends on the
 * @Global() DbModule's REDIS provider.
 *
 * Env-gate (lot-1 TD-064): `ProtocolTestController` (_test/boom + _test/echo) is mounted
 * ONLY when `NODE_ENV !== 'production'`. `/v1/ping` (in `ProtocolController`) is ALWAYS
 * mounted regardless of environment.
 */
const controllers = testControllersEnabled()
  ? [ProtocolController, ProtocolTestController]
  : [ProtocolController];

@Module({ controllers })
export class ProtocolModule {}

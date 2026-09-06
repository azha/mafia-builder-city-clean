// IMPLEMENTS: docs/tech/18_api_protocol/idempotency.md §Politique par endpoint — IdempotencyPolicy
//             -- lot-5 TD-058: per-endpoint idempotency binding (R-ID-1 missing-key=428). --
//
// `@Idempotent` — lightweight per-endpoint decorator that binds an `IdempotencyPolicy`
// metadata key to a NestJS route handler. The `IdempotencyInterceptor` reads this via
// `Reflector` (NestJS DI) and enforces the policy: when `required: true` and no
// `Idempotency-Key` header is present → throw `ApiError('IDEMPOTENCY_KEY_MISSING')`
// → 428 Precondition Required (R-ID-1 / idempotency.md §Politique par endpoint).
//
// SCOPE NOTE (TD-058): this delivers ONLY the minimal per-endpoint binding
// (decorator + Reflector read + 428 enforcement). Full endpoint-catalogue materialization
// (openapi-v1.yaml / transport_bindings.json) is OUT OF SCOPE (TD-081, deferred).
//
// Usage:
//   @Post('some/mutation')
//   @Idempotent({ required: true })
//   doMutation() { ... }

import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_POLICY_KEY = 'idempotency_policy';

export interface IdempotencyPolicy {
  /** When true: an absent Idempotency-Key on this route → 428 IDEMPOTENCY_KEY_MISSING. */
  required: boolean;
}

/**
 * Attach an `IdempotencyPolicy` to a route handler.
 * Read by `IdempotencyInterceptor` via NestJS `Reflector`.
 */
export const Idempotent = (policy: IdempotencyPolicy) =>
  SetMetadata(IDEMPOTENCY_POLICY_KEY, policy);

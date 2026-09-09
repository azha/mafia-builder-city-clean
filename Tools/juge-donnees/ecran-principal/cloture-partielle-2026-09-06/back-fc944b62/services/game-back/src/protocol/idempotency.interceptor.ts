// IMPLEMENTS: docs/tech/18_api_protocol/idempotency.md §Concurrence et locks + §Conflits + §Stockage
//             REUSE docs/tech/09_data_model/persistence_rules.md §6 (Redis hot tier pattern)
//             -- session:2026-06-02 (Phase 0 Task 5) --
//             -- lot-2 (TD-060/061): extended state machine — FAILED_REPLAYABLE + memorized 4xx replay
//                + pending_grace re-acquisition (idempotency.md §StateEnum lines 56-74 +
//                §Concurrence lines 145-152 + R-ID-8 line 232). --
//             -- lot-5 (TD-058): per-endpoint binding via @Idempotent({ required: true }) decorator +
//                Reflector read → missing key on a required route → 428 IDEMPOTENCY_KEY_MISSING
//                (R-ID-1 / idempotency.md §Politique par endpoint). --
//
// `IdempotencyInterceptor` — minimal idempotency guard on mutations, backed by
// the REAL Redis hot tier via the DI token 'REDIS' (ioredis). NOT in-memory.
//
// Flow (idempotency.md §Concurrence et locks):
//   1. Only mutations (POST/PATCH/DELETE) are subject to the key. GET/HEAD/PUT
//      are exempt (R-ID: §2/§3 — GET/HEAD idempotent by definition, PUT replace).
//   2. No Idempotency-Key on a mutation → Phase-0 pass-through (the per-endpoint
//      IdempotencyPolicy.required binding lands with endpoint_catalogue.md /
//      auth; here a missing key on a demo route is not forced — documented).
//   3. Key present but not UUID v4 → 400 IDEMPOTENCY_KEY_FORMAT_INVALID (R-ID-2).
//   4. `SET NX EX ttl` a PENDING record (with `created_at` epoch ms) — step 1.
//      - OK   → lock acquired: run handler ONCE.
//          * Handler returns (success) → persist COMPLETED (status + snapshot), return value.
//          * Handler throws ApiError with 4xx → persist FAILED_REPLAYABLE (4xx snapshot,
//            KEEPTTL) + re-throw so GlobalExceptionFilter renders it to the caller.
//          * Handler throws 5xx / non-ApiError (non-deterministic) → DELETE the PENDING key
//            (or let it TTL-expire) + re-throw; the next request can retry fresh (canon
//            line 74: "les échecs non déterministes ne persistent pas un FAILED_REPLAYABLE").
//      - NOT OK → key already present, read it:
//          * COMPLETED + same fingerprint → replay the memorized snapshot, NO re-execution (R-ID-4).
//          * COMPLETED + different fingerprint → 409 IDEMPOTENCY_KEY_CONFLICT (R-ID-5).
//          * FAILED_REPLAYABLE + same fingerprint → return memorized 4xx snapshot (no re-exec).
//          * FAILED_REPLAYABLE + different fingerprint → 409 IDEMPOTENCY_KEY_CONFLICT.
//          * PENDING → check pending_grace_until:
//            - still within grace → 409 IDEMPOTENCY_REQUEST_IN_FLIGHT (on_conflict REJECT_409).
//            - past grace → orphaned lock: re-acquire (overwrite with fresh PENDING + run handler).
//              (Bounded double-side-effect risk per R-ID-8; outbox is the high-value mitigation,
//              DEFERRED with TD-059.)
//
// Scope key (idempotency.md §Composite IdempotencyKey + §Stockage):
//   idem:{audience}:{account_id}:{namespace}:{key_value}
// Q2-3 (Task 6): `account_id` comes from the AUTHENTICATED request — `req.account.account_id`
// populated by the JwtAuthGuard (verified JWT claims), NEVER from the body (R-ID-3). NestJS runs
// GUARDS before INTERCEPTORS, so on a guarded mutation `req.account` is already set when this
// interceptor reads it; we still read DEFENSIVELY (optional chaining) and fall back to 'anon' for
// unauthenticated mutations (e.g. the test echo route, or future public mutations). The audience
// is likewise taken from the verified principal when present (GAME_BACK default otherwise).

import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type Redis from 'ioredis';
import { Observable, from, firstValueFrom } from 'rxjs';

import { ApiError } from './api-error';
import { ERROR_CODES, type ErrorCode } from './error-codes';
import { IDEMPOTENCY_POLICY_KEY, type IdempotencyPolicy } from './idempotent.decorator';
import { REDIS } from '../db/db.module';
import type { HttpRequestLike, HttpResponseLike } from './http-types';
import { protocolTunables } from './protocol-tunables';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

interface StoredRecord {
  state: 'PENDING' | 'COMPLETED' | 'FAILED_REPLAYABLE';
  body_hash: string;
  http_status?: number;
  /** Epoch ms when the PENDING record was created (for pending_grace_until computation). */
  created_at?: number;
  /** Serialized ResponseEnvelope success/error snapshot (idempotency.md §IdempotencyOutcome). */
  snapshot?: unknown;
  /**
   * For FAILED_REPLAYABLE: stored ApiError fields so the filter can re-render with a fresh
   * response_meta on replay. This is the practical replay strategy given the architecture
   * (GlobalExceptionFilter generates timestamps — byte-equal replay would require storing
   * the fully rendered body which the interceptor cannot access; re-throwing gives logically
   * identical error content with a fresh trace, which is the observable correctness invariant).
   */
  error_code?: string;
  error_message?: string;
  error_details?: unknown;
}

/** SHA-256 of the canonicalized body (idempotency.md §Canonicalisation du body_hash). */
function bodyHash(body: unknown): string {
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

/** RFC-8785-ish canonical JSON: lexicographically-ordered keys (idempotency.md §Canonicalisation). */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();

    // GET/HEAD/PUT exempt by definition (R-ID §2/§3).
    if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
      return next.handle();
    }

    // Read per-endpoint idempotency policy (lot-5 TD-058 / idempotency.md §Politique par endpoint).
    // The @Idempotent({ required: true }) decorator sets this metadata on the handler.
    // Fallback: no metadata → policy.required = false (default pass-through preserved for unmarked routes).
    const policy = this.reflector.get<IdempotencyPolicy | undefined>(
      IDEMPOTENCY_POLICY_KEY,
      context.getHandler(),
    );

    const key = req.header('idempotency-key');
    if (!key || key.trim() === '') {
      // R-ID-1: if this endpoint is marked required, a missing key → 428 IDEMPOTENCY_KEY_MISSING.
      // Unmarked routes preserve the Phase-0 pass-through (documented seam).
      if (policy?.required) {
        throw new ApiError('IDEMPOTENCY_KEY_MISSING', {
          message: 'This endpoint requires an Idempotency-Key header (UUID v4).',
        });
      }
      // Phase 0 pass-through for unmarked routes (documented seam).
      return next.handle();
    }
    if (!UUID_V4_RE.test(key.trim())) {
      // R-ID-2: strict UUID v4 — thrown ApiError is rendered by GlobalExceptionFilter.
      throw new ApiError('IDEMPOTENCY_KEY_FORMAT_INVALID', {
        message: 'Idempotency-Key must be a UUID v4.',
      });
    }

    // `handle` resolves the (possibly replayed) value; emit it as the response.
    return from(this.handle(req, res, key.trim(), next));
  }

  private redisKey(req: HttpRequestLike, keyValue: string): string {
    // idem:{audience}:{account_id}:{namespace}:{key_value}
    // Q2-3: derive account_id (+ audience) from the authenticated principal set by JwtAuthGuard
    // (verified claims), NEVER from the body (R-ID-3). Falls back to anon/GAME_BACK for
    // unauthenticated mutations. Read defensively in case a route has no auth guard.
    const principal = req.account;
    const audience = principal?.audience ?? 'GAME_BACK';
    const accountId = principal?.account_id ?? 'anon';
    const namespace = `${req.method.toUpperCase()}:${req.path}`;
    return `idem:${audience}:${accountId}:${namespace}:${keyValue}`;
  }

  private async handle(
    req: HttpRequestLike,
    res: HttpResponseLike,
    keyValue: string,
    next: CallHandler,
  ): Promise<unknown> {
    const rkey = this.redisKey(req, keyValue);
    const fingerprint = bodyHash(req.body);
    const now = Date.now();
    const pending: StoredRecord = { state: 'PENDING', body_hash: fingerprint, created_at: now };

    // Step 1: SET NX EX ttl — acquire the PENDING lock (idempotency.md §Concurrence step 1).
    const acquired = await this.redis.set(
      rkey,
      JSON.stringify(pending),
      'EX',
      protocolTunables.idempotency.ttlSeconds,
      'NX',
    );

    if (acquired === 'OK') {
      // Lock acquired → run the handler ONCE (lot-2: with FAILED_REPLAYABLE 4xx handling).
      return this.runWithFailureHandling(rkey, fingerprint, res, next);
    }

    // Step 3: key already present — read it.
    const raw = await this.redis.get(rkey);
    if (!raw) {
      // Race: key expired between SET NX and GET → treat as a fresh run.
      return this.runWithFailureHandling(rkey, fingerprint, res, next);
    }
    const record = JSON.parse(raw) as StoredRecord;

    if (record.state === 'PENDING') {
      // Check pending_grace_until (lot-2): is the lock orphaned?
      const graceMs = protocolTunables.idempotency.pendingGraceSeconds * 1000;
      const createdAt = record.created_at ?? now; // defensive: old records without created_at
      const pendingGraceUntil = createdAt + graceMs;
      if (Date.now() > pendingGraceUntil) {
        // Orphaned PENDING: re-acquire (overwrite with fresh PENDING + run handler).
        // Bounded double-side-effect risk per R-ID-8 (idempotency.md §Concurrence line 152) —
        // the outbox pattern is the high-value mitigation for high-value namespaces (TD-059 OPEN).
        const freshPending: StoredRecord = {
          state: 'PENDING',
          body_hash: fingerprint,
          created_at: Date.now(),
        };
        await this.redis.set(rkey, JSON.stringify(freshPending), 'KEEPTTL');
        return this.runWithFailureHandling(rkey, fingerprint, res, next);
      }
      // Still within grace window → on_conflict REJECT_409 (idempotency.md §Concurrence).
      throw new ApiError('IDEMPOTENCY_REQUEST_IN_FLIGHT', {
        message: 'A request with this Idempotency-Key is already in flight.',
      });
    }

    // COMPLETED or FAILED_REPLAYABLE — verify fingerprint (R-ID-4 / R-ID-5).
    if (record.body_hash !== fingerprint) {
      throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', {
        message: 'Idempotency-Key reused with a different request body.',
        // No disclosure of the memorized payload — only the hash (R-ID-5 / R-EH-6).
        details: { conflict_fingerprint: { stored_body_hash_prefix: record.body_hash.slice(0, 12) } },
      });
    }

    if (record.state === 'FAILED_REPLAYABLE') {
      // FAILED_REPLAYABLE replay (lot-2): throw the reconstructed ApiError so GlobalExceptionFilter
      // renders the 4xx response with the same code/status/details. This is the practical replay
      // strategy: the filter generates fresh response_meta (timestamps) but the error payload
      // (code, http_status, message) is logically identical to the first response — which is the
      // observable correctness invariant (idempotency.md §StateEnum: "Le replay renvoie la même 422").
      // No re-execution of the handler occurs — the original handler result is not re-run.
      const replayCode = (record.error_code ?? 'VALIDATION_FAILED') as ErrorCode;
      throw new ApiError(replayCode, {
        message: (record.error_message as string | undefined) ?? 'replayed error',
        details: record.error_details ?? null,
      });
    }

    // COMPLETED: replay the memorized success snapshot, NO re-execution (R-ID-4).
    if (record.http_status && record.http_status !== 200) {
      res.status(record.http_status);
    }
    return record.snapshot;
  }

  /**
   * Run the handler once, handling 4xx vs 5xx errors differently.
   *
   * - Success → persist COMPLETED + return value.
   * - 4xx ApiError → persist FAILED_REPLAYABLE (memorized snapshot, KEEPTTL) + re-throw
   *   so GlobalExceptionFilter renders it to the caller.
   * - 5xx / non-ApiError → DELETE the PENDING key (non-deterministic failure must NOT
   *   persist FAILED_REPLAYABLE — idempotency.md §StateEnum line 74) + re-throw.
   */
  private async runWithFailureHandling(
    rkey: string,
    fingerprint: string,
    res: HttpResponseLike,
    next: CallHandler,
  ): Promise<unknown> {
    try {
      const value = await firstValueFrom(next.handle());
      const httpStatus = res.statusCode || 200;
      const completed: StoredRecord = {
        state: 'COMPLETED',
        body_hash: fingerprint,
        http_status: httpStatus,
        snapshot: value,
      };
      // Preserve the original TTL window (KEEPTTL) — replay window = remaining ttl.
      await this.redis.set(rkey, JSON.stringify(completed), 'KEEPTTL');
      return value;
    } catch (err: unknown) {
      // Determine if this is a deterministic 4xx failure (ApiError with 4xx status).
      const isApiError = err instanceof ApiError;
      const errStatus = isApiError
        ? (ERROR_CODES[(err as ApiError).code]?.http_status ?? 500)
        : 500;
      const is4xx = errStatus >= 400 && errStatus < 500;

      if (isApiError && is4xx) {
        // Deterministic 4xx → persist FAILED_REPLAYABLE.
        // Store the ApiError's code/message/details so replay can reconstruct the same error
        // (GlobalExceptionFilter re-renders it with a fresh response_meta on replay).
        const apiErr = err as ApiError;
        const failed: StoredRecord = {
          state: 'FAILED_REPLAYABLE',
          body_hash: fingerprint,
          http_status: errStatus,
          error_code: apiErr.code,
          error_message: apiErr.message,
          error_details: apiErr.details,
        };
        // KEEPTTL: the original TTL window is still the replay window.
        await this.redis.set(rkey, JSON.stringify(failed), 'KEEPTTL');
      } else {
        // Non-deterministic failure (5xx / non-ApiError) → delete the PENDING lock so the
        // next retry with the same key starts fresh (no orphaned PENDING).
        // (Swallow the DEL error; the key will TTL-expire anyway.)
        this.redis.del(rkey).catch(() => undefined);
      }

      // Re-throw regardless so the caller gets the actual error rendered by GlobalExceptionFilter.
      throw err;
    }
  }
}

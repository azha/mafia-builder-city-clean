// IMPLEMENTS: docs/tech/18_api_protocol/envelope_format.md §ResponseEnvelope + §RequestEnvelope
//             docs/tech/18_api_protocol/error_handling.md §ErrorObjectComposite
//             -- session:2026-06-02 (Phase 0 Task 5) --
//
// Canonical REST envelope shapes, copied VERBATIM from the spec (18). Field
// names are wire-level `snake_case` (18 §Sérialisation JSON canonique R-EF-2)
// and MUST match the chunk exactly — they are the contract every chunk 4-13 and
// every consumer (08 UI, 12 BO, Unity client) reads.
//
// Phase 0 scope: the SUCCESS profile + the ERROR profile of `ResponseEnvelope`,
// plus the `RequestMetaComposite` headers we already parse. Fields that depend
// on chunks not yet implemented (rate_limit → chunk 7 rate_limiting.md;
// server_build_ref → build pipeline; correlation_id → WS push) are typed as
// OPTIONAL so the envelope is forward-compatible (R-VS-5: consumers ignore
// unknown / absent additive fields) without inventing values we cannot source.

/**
 * `RequestMetaComposite` — the meta-traced headers carried by every request
 * (18 §RequestEnvelope). Parsed by the EnvelopeInterceptor from the inbound
 * HTTP headers and echoed into the response. `request_id` is OBLIGATOIRE
 * (client-generated UUID v4; reverse-proxy mints if absent — 18 §Conventions).
 */
export interface RequestMetaComposite {
  /** header `X-Request-Id` — UUID v4, OBLIGATOIRE (R-EF-1). */
  request_id: string;
  /** header `Idempotency-Key` — UUID v4 or null (cross-ref idempotency.md). */
  idempotency_key: string | null;
  /** derived from the `/vN/` path; mirrored on header `X-Api-Version`. */
  api_version: number;
  /** header `X-Correlation-Id` — links a 202 REST to a future WS push, or null. */
  correlation_id: string | null;
}

/**
 * `ResponseMetaComposite` — meta echoed on every REST response
 * (18 §ResponseEnvelope). `server_build_ref` + `rate_limit` are deferred
 * (build pipeline / chunk 7) and intentionally omitted here — they are additive
 * and OPTIONAL per 18, so absence is spec-conformant (R-VS-5).
 */
export interface ResponseMetaComposite {
  /** `X-Request-Id` echo (R-EF-1). */
  request_id_echo: string;
  /** `X-Server-Processed-At` — ISO-8601 UTC `Z` (R-EF-3 / §Conventions de timestamps). */
  server_processed_at: string;
  /** `X-Api-Version` — mirror of the served `/vN/` major (versioning_strategy.md). */
  api_version: number;
  /** `X-Correlation-Id` echo, or null. */
  correlation_id_echo: string | null;
}

/**
 * `ResponseSuccessPayload` — success variant of `ResponseEnvelope.payload`
 * (18 §ResponseSuccessPayload). `data` schema depends on the use-case; `meta`
 * (pagination / snapshot revision) is OPTIONAL (cross-ref pagination_and_streaming.md).
 */
export interface ResponseSuccessPayload<T = unknown> {
  data: T;
  meta?: unknown | null;
}

/**
 * `ErrorTraceComposite` — traceability block of an error
 * (18/error_handling.md §ErrorObjectComposite).
 */
export interface ErrorTraceComposite {
  request_id_echo: string;
  correlation_id: string | null;
  trace_id: string | null;
  server_emitted_at: string;
}

/**
 * `ErrorObjectComposite` — the SINGLE canonical error format, shared REST + WS
 * (18/error_handling.md §Composite ErrorObjectComposite, R-EH-1 / R-EH-8).
 * `code` is SCREAMING_SNAKE_CASE and stable cross-version (R-EH-3); `message` is
 * EN-only dev-facing and never leaks secrets/stack traces (R-EH-4 / R-EH-6);
 * the back NEVER translates — it carries `user_facing_i18n_key` + `payload_vars`
 * (R-EH-2).
 */
export interface ErrorObjectComposite {
  code: string;
  http_status: number;
  user_facing_i18n_key: string;
  payload_vars: Record<string, unknown> | null;
  details: unknown | null;
  message: string;
  trace: ErrorTraceComposite;
  retryable_class: RetryableClass;
  retry_after_s: number | null;
}

/**
 * `RetryableClassEnum` (18/error_handling.md §Retry semantics, R-EH-5) — the
 * client never invents the retry policy.
 */
export type RetryableClass =
  | 'NEVER'
  | 'AFTER_DELAY'
  | 'AFTER_REFRESH'
  | 'AFTER_USER_ACTION';

/**
 * `ErrorPayload` — error variant of `ResponseEnvelope.payload`
 * (18 §ErrorPayload).
 */
export interface ErrorPayload {
  error: ErrorObjectComposite;
}

/**
 * `ResponseEnvelope` — composite carrying EVERY REST response (18 §ResponseEnvelope).
 * `payload` is the success/error union, discriminated by HTTP status:
 *   - HTTP 2xx → ResponseSuccessPayload
 *   - HTTP 4xx/5xx → ErrorPayload
 * (18 §Règle de discrimination). The JSON body is ALWAYS an object — never a
 * bare array or string (anti-CSRF JSON hijacking, §ResponseEnvelope).
 */
export interface ResponseEnvelope<T = unknown> {
  response_meta: ResponseMetaComposite;
  payload: ResponseSuccessPayload<T> | ErrorPayload;
}

/** Type guard: is this a success ResponseEnvelope? */
export function isSuccessEnvelope<T>(
  env: ResponseEnvelope<T>,
): env is ResponseEnvelope<T> & { payload: ResponseSuccessPayload<T> } {
  return (env.payload as ErrorPayload).error === undefined;
}

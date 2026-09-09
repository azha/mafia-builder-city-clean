// IMPLEMENTS: docs/tech/18_api_protocol/error_handling.md §DomainErrorFactory (NestJS impl note)
//             -- session:2026-06-02 (Phase 0 Task 5) --
//
// `ApiError` — the throwable domain error. error_handling.md §Implications
// NestJS — back jeu calls for a `DomainErrorFactory` so services emit an error
// with a canonical `code` (+ optional payload_vars / details) directly, and the
// GlobalExceptionFilter renders it to an `ErrorObjectComposite`. The
// http_status / user_facing_i18n_key / retryable_class are NOT passed per-call
// — they are looked up from the canonical ERROR_CODES registry by `code`
// (single source of truth, R-EH-3).

import { ERROR_CODES, type ErrorCode } from './error-codes';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly payloadVars: Record<string, unknown> | null;
  readonly details: unknown | null;

  constructor(
    code: ErrorCode,
    opts: {
      /** EN-only, dev-facing technical message (never shown to players, R-EH-4). */
      message?: string;
      payloadVars?: Record<string, unknown> | null;
      details?: unknown | null;
    } = {},
  ) {
    super(opts.message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.payloadVars = opts.payloadVars ?? null;
    this.details = opts.details ?? null;
  }

  /** The registry spec (http_status, i18n key, retryable_class) for this code. */
  get spec() {
    return ERROR_CODES[this.code];
  }
}

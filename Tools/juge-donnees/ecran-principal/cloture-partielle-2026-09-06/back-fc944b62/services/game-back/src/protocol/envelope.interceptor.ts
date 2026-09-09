// IMPLEMENTS: docs/tech/18_api_protocol/envelope_format.md §ResponseEnvelope + §Implications NestJS
//             docs/tech/18_api_protocol/error_handling.md §Implications NestJS (GlobalExceptionFilter)
//             -- session:2026-06-02 (Phase 0 Task 5) --

import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiError } from './api-error';
import { codeForHttpStatus, ERROR_CODES, type ErrorCode } from './error-codes';
import type {
  ErrorObjectComposite,
  ResponseEnvelope,
  ResponseMetaComposite,
} from './envelope';
import type { HttpRequestLike, HttpResponseLike } from './http-types';
import { apiMajorFromPath } from './versioning';

/**
 * Resolve the `request_id` for this request: echo the client `X-Request-Id` if
 * present (R-EF-1: client generates, server echoes), else mint a UUID v4 (18
 * §Conventions: "Si absent, le reverse-proxy en génère un" — we mint at the app
 * edge for parity in the un-proxied local/test path). Idempotent within a request.
 */
function resolveRequestId(req: HttpRequestLike): string {
  const hdr = req.header('x-request-id');
  if (hdr && hdr.trim() !== '') {
    return hdr.trim();
  }
  // Cache on the request so the interceptor + filter agree on one value.
  if (req._requestId) {
    return req._requestId;
  }
  const minted = randomUUID();
  req._requestId = minted;
  return minted;
}

function buildResponseMeta(req: HttpRequestLike): ResponseMetaComposite {
  const correlationId = req.header('x-correlation-id') ?? null;
  return {
    request_id_echo: resolveRequestId(req),
    server_processed_at: new Date().toISOString(), // ISO-8601 UTC `Z` (R-EF-3)
    api_version: apiMajorFromPath(req.path),
    correlation_id_echo: correlationId === '' ? null : correlationId,
  };
}

/** Mirror the traceability headers onto the HTTP response (18 §Headers communs). */
function setTraceHeaders(res: HttpResponseLike, meta: ResponseMetaComposite): void {
  res.setHeader('X-Request-Id', meta.request_id_echo);
  res.setHeader('X-Api-Version', String(meta.api_version));
  res.setHeader('X-Server-Processed-At', meta.server_processed_at);
  if (meta.correlation_id_echo) {
    res.setHeader('X-Correlation-Id', meta.correlation_id_echo);
  }
}

/**
 * `EnvelopeInterceptor` — wraps EVERY successful (2xx) controller return value in
 * a `ResponseEnvelope` success profile (18 §ResponseSuccessPayload + §Implications
 * NestJS — "EnvelopeInterceptor réponse : assure request_id_echo,
 * server_processed_at, X-Api-Version"). Registered globally in main.ts. Endpoints
 * that opt out (e.g. `/health`, raw infra) are short-circuited by the
 * `isEnvelopeExempt` path check below.
 *
 * If a controller already returns a fully-formed ResponseEnvelope (has
 * `response_meta`), it is passed through untouched (idempotent wrapping).
 */
/**
 * Path prefixes that are EXEMPT from the envelope (raw passthrough). `/health` is
 * infra liveness/readiness (versioning_strategy.md §Conséquences lists
 * `GET /healthz` among the non-versioned exceptions) — the dockerized
 * healthcheck + Traefik probe only need a raw `{status}` body, never a
 * ResponseEnvelope. Health is NOT a `/v1` API resource.
 */
function isEnvelopeExempt(path: string): boolean {
  return path === '/health' || path.startsWith('/health/');
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();

    // Raw passthrough for exempt infra surfaces (e.g. /health) — no envelope,
    // no trace headers injected (keeps the probe payload minimal).
    if (isEnvelopeExempt(req.path)) {
      return next.handle();
    }

    const meta = buildResponseMeta(req);
    setTraceHeaders(res, meta);

    return next.handle().pipe(
      map((data: unknown) => {
        // Pass-through if the handler already produced an envelope.
        if (
          data &&
          typeof data === 'object' &&
          'response_meta' in (data as object) &&
          'payload' in (data as object)
        ) {
          return data;
        }
        const envelope: ResponseEnvelope = {
          response_meta: meta,
          payload: { data: data ?? null },
        };
        return envelope;
      }),
    );
  }
}

/** Render an ErrorObjectComposite from a canonical code (R-EH-1, single format). */
function renderError(
  code: ErrorCode,
  meta: ResponseMetaComposite,
  opts: {
    message: string;
    payloadVars?: Record<string, unknown> | null;
    details?: unknown | null;
  },
): ErrorObjectComposite {
  const spec = ERROR_CODES[code];
  return {
    code,
    http_status: spec.http_status,
    user_facing_i18n_key: spec.user_facing_i18n_key,
    payload_vars: opts.payloadVars ?? null,
    details: opts.details ?? null,
    message: opts.message,
    trace: {
      request_id_echo: meta.request_id_echo,
      correlation_id: meta.correlation_id_echo,
      trace_id: null,
      server_emitted_at: meta.server_processed_at,
    },
    retryable_class: spec.retryable_class,
    // Q2-1 (T5 nit): no concrete delay-hint is computed yet. error_handling.md §Retry
    // (line 51 + line 201) says `retry_after_s` is an OPTIONAL int "pour AFTER_DELAY ;
    // miroir du header Retry-After si REST" and the client falls back to bounded
    // exponential backoff (`T.api.retry_backoff_max_s`) when it is absent — "Respecter
    // retry_after_s si fourni (priorité)". The canonical example body (§ line 173) ships
    // `"retry_after_s": null` even for a retryable error. So null is spec-conformant here;
    // the real hint will be populated by the rate-limiter (429 RATE_LIMIT_EXCEEDED, chunk 7)
    // and maintenance windows (503), which DO know a concrete delay — DEFERRED to those.
    retry_after_s: null,
  };
}

/**
 * `GlobalExceptionFilter` (error_handling.md §Implications NestJS — back jeu:
 * "GlobalExceptionFilter (@Catch()) : convertit toute exception ... en
 * ErrorObjectComposite"). Maps:
 *   - `ApiError` (DomainErrorFactory) → its canonical code verbatim.
 *   - `HttpException` (incl. Nest 404 NotFoundException) → code via HTTP status
 *     (codeForHttpStatus). 404 → RESOURCE_NOT_FOUND (R-EH: générique).
 *   - anything else → INTERNAL_ERROR 500, message scrubbed (R-EH-6 anti-disclosure:
 *     never leak a stack trace in `message`).
 * The body is ALWAYS a ResponseEnvelope error profile (R-EH-1 / R-EH-8: REST=WS
 * single client code path).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<HttpRequestLike>();
    const res = ctx.getResponse<HttpResponseLike>();
    const meta = buildResponseMeta(req);
    setTraceHeaders(res, meta);

    let code: ErrorCode;
    let message: string;
    let payloadVars: Record<string, unknown> | null = null;
    let details: unknown | null = null;

    if (exception instanceof ApiError) {
      code = exception.code;
      message = exception.message;
      payloadVars = exception.payloadVars;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      code = codeForHttpStatus(status);
      // HttpException response can be a string or { message, ... }. Keep it
      // dev-facing & terse; never reflect arbitrary nested objects (anti-disclosure).
      const r = exception.getResponse();
      message =
        typeof r === 'string'
          ? r
          : ((r as { message?: unknown }).message
              ? String((r as { message?: unknown }).message)
              : exception.message);
    } else {
      // Unknown/unexpected → 500 INTERNAL_ERROR. Do NOT surface the raw error
      // message/stack (R-EH-6): a generic dev-facing string only. The real error
      // is logged server-side for observability.
      code = 'INTERNAL_ERROR';
      message = 'Unexpected internal error.';
      // eslint-disable-next-line no-console
      console.error('[game-back] unhandled exception:', exception);
    }

    const errorObject = renderError(code, meta, { message, payloadVars, details });
    const envelope: ResponseEnvelope = {
      response_meta: meta,
      payload: { error: errorObject },
    };

    // 5xx escalate, 4xx do not (error_handling.md §Logs) — minimal structured log.
    if (errorObject.http_status >= 500) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          level: 'error',
          request_id: meta.request_id_echo,
          'error.code': errorObject.code,
          http_status: errorObject.http_status,
        }),
      );
    }

    res.status(errorObject.http_status).json(envelope);
  }
}

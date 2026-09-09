// IMPLEMENTS: minimal HTTP req/res surface for the protocol layer
//             -- session:2026-06-02 (Phase 0 Task 5) --
//
// `@types/express` is not a dependency of game-back (express 4 ships no bundled
// types, and platform-express does not pull @types). Rather than add a dev-dep
// + a Docker-build install just for two interceptors, we declare the minimal
// structural surface the protocol layer touches on the underlying express
// Request/Response. NestJS hands these objects via `switchToHttp()`.

/** Minimal inbound request surface (express Request subset). */
export interface HttpRequestLike {
  /** Case-insensitive header lookup (express `req.header(name)`). */
  header(name: string): string | undefined;
  /** Request path without query string (express `req.path`). */
  path: string;
  /** HTTP method (express `req.method`). */
  method: string;
  /** Parsed JSON body (body-parser). */
  body: unknown;
  /** Scratch slot to memoize a minted request_id within a request. */
  _requestId?: string;
  /**
   * Authenticated principal set by JwtAuthGuard/StaffRoleGuard (Task 6, chapter 17), or undefined
   * for unauthenticated requests. The idempotency interceptor reads `account_id`/`audience` from
   * here (Q2-3) — NEVER from the body (R-ID-3). Typed structurally to avoid a cross-module import
   * cycle (protocol ↔ auth); shape mirrors AuthenticatedAccount.
   */
  account?: {
    account_id: string;
    audience: string;
    kind: string;
    role: string | null;
    session_id: string;
    jti: string;
  };
}

/** Minimal outbound response surface (express Response subset). */
export interface HttpResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): HttpResponseLike;
  json(body: unknown): HttpResponseLike;
  /** Current status code (express `res.statusCode`). */
  statusCode: number;
}

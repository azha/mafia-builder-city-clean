// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Rôles canoniques + §R-RBAC (fail-closed)
//             + identity_model.md §StaffAccount — REUSE staff_access.md (staff-only surfaces)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- lot-1 remediation (TD-076): added aud=GAME_BACK check (Invariant 6 ch17 §Session mgmt) --
//             -- lot-2 remediation (TD-077): per-cause AUTH_TOKEN_* codes (threaded from verifyJwt reason);
//                pre-release placeholder codes renamed to canonical AUTHZ_* (403 family). --
//             -- W0.3b C1 (2026-08-08, docs/superpowers/specs/2026-08-08-w0.3b-bo-credential-path-
//                design.md §7/C1): `assertStaff` now resolves the token HEADER FIRST (unchanged path,
//                D3), then falls back to the HttpOnly `gb_session` cookie ONLY when the header
//                produced nothing. Cookie parsing REUSEs (by reference) bo-back's raw-`Cookie`-header
//                loop (staff_role.guard.ts:55-72) via bearer.ts's extractAccountFromCookie — no
//                cookie-parser dep. Ruling §8.1 (R-SA-3 amended, borned) + §8.2 (game-back becomes the
//                cookie EMITTER, C2) are what make this fallback meaningful; C1 alone is INERT (no
//                gb_session is minted until C2 merges). ALL downstream checks (audience/kind/min-role)
//                are LITERALLY UNCHANGED regardless of where the token came from (D2 — isolation is
//                NOT relaxed). When the credential came from the cookie, a NEW same-origin check
//                (§6.3b) gates non-safe methods (CSRF — D4). JwtAuthGuard (player surface,
//                jwt-auth.guard.ts) is NOT touched — no cookie auth on a player surface. --
//
// `StaffRoleGuard` (game-back) — gates a staff-only surface. Verifies the JWT (header, or cookie
// fallback — C1) and requires BOTH:
//   - `aud == 'GAME_BACK'`  (Invariant 6 ch17 — audience isolation R-SM-3; mirrors the
//     bo-back StaffRoleGuard which requires aud == BO_BACK). A BO_BACK staff token is
//     REJECTED here with 403 (valid token, wrong audience — same semantics as bo-back:64-65).
//   - `kind == 'STAFF'`     (R-IM-4 — a player cannot authenticate a staff surface).
//
// Per-cause code mapping (error_handling.md §Catalogue, lot-2 canonical names):
//   No/invalid token (missing/expired/bad sig)       → AUTH_TOKEN_* (401)
//   Valid token, wrong audience (aud ≠ GAME_BACK)    → AUTHZ_AUDIENCE_MISMATCH (403)
//   Valid token, not STAFF                           → AUTHZ_PERMISSION_DENIED (403)
//   Valid token, STAFF but below min-role            → AUTHZ_PERMISSION_DENIED (403)
//   Cookie-sourced credential, non-safe method, no same-origin signal → AUTHZ_PERMISSION_DENIED (403)
//
// Uses the CANONICAL StaffRoleEnum (player | player_support | gm | admin | super_admin).
// Fail-closed (R-RBAC-1): no token / invalid token → 401 ; valid token but wrong audience OR
// wrong kind (or below min-role) OR failed CSRF check → 403 (generic, no detail leak).
//
// RE-ROUTE (lot-1 TD-076, Option A dual-audience): game-back staff surfaces (/health/detailed,
// /v1/telemetry/events/recent) now require a GAME_BACK-audience staff token. The dedicated STAFF
// sign-in endpoint, `POST /v1/auth/staff/signin` (W0.3b C2, 2026-08-08 — the BO SPA's own signin,
// see the header block above), issues dual-audience tokens (BO_BACK + GAME_BACK). Callers MUST use
// the `game_back_access_token` for these surfaces. NO silent aud exception anywhere (R-RBAC-1).
// /v1/admin (bo-back) stays strictly BO_BACK-only. Full RBAC machinery DEFERRED.

import { CanActivate, ExecutionContext, Injectable, mixin, Type } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { extractAccountFromAuthHeader, extractAccountFromCookie } from './bearer';
import type { ExtractFailureReason, ExtractResult } from './bearer';
import type { RequestWithAccount } from './authenticated-request';
import type { StaffRoleClaim } from './jwt';

/**
 * Cookie name for the HttpOnly `GAME_BACK`-audience staff session token (W0.3b C1/C2). Read here
 * (fallback path) and set by game-back's `POST /v1/auth/staff/signin` (C2, auth.controller.ts).
 */
export const GB_SESSION_COOKIE = 'gb_session';

/** Safe HTTP methods (RFC 9110 §9.2.1) — never mutate state, exempt from the CSRF check (§6.3b). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Canonical staff-role ordinal (authorization_rbac.md §Invariant 4 — purely nominal comparison). */
const ROLE_ORDINAL: Record<StaffRoleClaim, number> = {
  player: 0,
  player_support: 1,
  gm: 2,
  admin: 3,
  super_admin: 4,
};

/** Map a verifyJwt failure reason to the canonical AUTH_TOKEN_* error code. */
function tokenErrorCode(
  reason: ExtractFailureReason,
): 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID_SIGNATURE' {
  if (reason === 'missing') return 'AUTH_TOKEN_MISSING';
  if (reason === 'expired') return 'AUTH_TOKEN_EXPIRED';
  // malformed | bad_signature | bad_alg | bad_iss → invalid signature family
  return 'AUTH_TOKEN_INVALID_SIGNATURE';
}

/**
 * Shared check: verify the token, require aud == GAME_BACK + kind == STAFF, optionally
 * a minimum canonical role.
 * No constructor params on the guard CLASS itself (NestJS DI cannot inject a default-valued ctor
 * param — it would try to resolve `Object` and crash at boot). Min-role variants come from the
 * {@link requireStaffRole} mixin factory instead.
 *
 * W0.3b C1 (D3 — header-first, cookie-fallback-ONLY): the header path is tried first and, when it
 * produces an account, behaves EXACTLY as before this chunk — zero regression for CLI/E2E bearer
 * callers. The `gb_session` cookie is consulted ONLY when the header did not yield an account
 * (absent or invalid Authorization header). This guarantees a caller that never sends a cookie is
 * byte-for-byte on the pre-C1 code path.
 */
function assertStaff(req: RequestWithAccount, minRole: StaffRoleClaim | null): boolean {
  const headerResult = extractAccountFromAuthHeader(req.header('authorization'));
  let result: ExtractResult = headerResult;
  let fromCookie = false;
  if (!headerResult.ok) {
    const cookieResult = extractAccountFromCookie(req.header('cookie'), GB_SESSION_COOKIE);
    if (cookieResult.ok) {
      result = cookieResult;
      fromCookie = true;
    }
  }
  if (!result.ok) {
    // No / invalid token (header AND cookie fallback both failed) → 401 with per-cause code
    // (lot-2 — reason threaded from verifyJwt). Reports the HEADER's failure reason unchanged
    // when there was no cookie to try, preserving the exact pre-C1 401 for header-only callers.
    throw new ApiError(tokenErrorCode(result.reason), { message: 'Missing or invalid bearer token.' });
  }
  const acct = result.account;
  // Audience isolation (lot-1 TD-076, Invariant 6 ch17): only a GAME_BACK token may reach
  // game-back staff surfaces. A BO_BACK token is valid but wrong-audience → 403. Applies
  // IDENTICALLY regardless of whether the token came from the header or the cookie (D2 — the
  // isolation invariant is not relaxed by C1; §7/C1 test (b) is exactly this branch).
  // lot-2: AUTHZ_AUDIENCE_MISMATCH (canonical 403, pre-release rename). Mirrors bo-back guard semantics.
  if (acct.audience !== 'GAME_BACK') {
    throw new ApiError('AUTHZ_AUDIENCE_MISMATCH', { message: 'Token audience is not GAME_BACK.' });
  }
  if (acct.kind !== 'STAFF') {
    // Authenticated but not a staff account → 403 AUTHZ_PERMISSION_DENIED (lot-2 canonical rename).
    throw new ApiError('AUTHZ_PERMISSION_DENIED', { message: 'Staff-only surface.' });
  }
  if (minRole) {
    const have = acct.role ? ROLE_ORDINAL[acct.role] : -1;
    if (have < ROLE_ORDINAL[minRole]) {
      // Authenticated STAFF but below minimum role → 403 AUTHZ_PERMISSION_DENIED.
      throw new ApiError('AUTHZ_PERMISSION_DENIED', { message: 'Insufficient staff role.' });
    }
  }
  if (fromCookie) {
    // CSRF control (§6.3b) — armed ONLY for a cookie-sourced credential. A Bearer caller is never
    // CSRF-exposed (the browser never attaches an Authorization header automatically) — D3 is what
    // makes this exemption safe.
    assertSameOriginForCookieAuth(req);
  }
  req.account = acct;
  return true;
}

/**
 * W0.3b C1, §6.3b (NEW — no canonical CSRF mechanism exists in this repo, §6.2 balayage). Armed
 * only by the caller (`assertStaff`) when the credential came from the ambient `gb_session`
 * cookie. Exempts safe methods (GET/HEAD/OPTIONS — they never mutate state, §6.4's own audit
 * obligation). For a non-safe method, requires a same-origin signal:
 *   1. `Sec-Fetch-Site: same-origin` — the precise, modern Fetch-Metadata signal (§6.3b).
 *   2. Fallback (older browsers omit Fetch Metadata): `Origin` header whose host matches this
 *      request's OWN `Host` header. Self-referential by design — no production-domain allowlist
 *      is configured anywhere in this repo (§2.6.2/§8.5, open/non-blocking), so this fallback
 *      needs none: it validates "same host as the one that received the request", not "matches a
 *      hardcoded domain".
 * Anything else → 403 AUTHZ_PERMISSION_DENIED (§8.5 reco — "I know who you are, not here").
 */
function assertSameOriginForCookieAuth(req: RequestWithAccount): void {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return;
  }
  const secFetchSite = req.header('sec-fetch-site');
  if (secFetchSite) {
    if (secFetchSite.toLowerCase() === 'same-origin') {
      return;
    }
    throw new ApiError('AUTHZ_PERMISSION_DENIED', { message: 'Cross-site request rejected (CSRF).' });
  }
  const origin = req.header('origin');
  const host = req.header('host');
  if (origin && host) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost && originHost === host) {
      return;
    }
  }
  throw new ApiError('AUTHZ_PERMISSION_DENIED', { message: 'Cross-site request rejected (CSRF).' });
}

/** Default guard: any GAME_BACK+STAFF account (no minimum role). Use as `@UseGuards(StaffRoleGuard)`. */
@Injectable()
export class StaffRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return assertStaff(context.switchToHttp().getRequest<RequestWithAccount>(), null);
  }
}

/**
 * Mixin factory for a minimum-role-gated guard, e.g. `@UseGuards(requireStaffRole('admin'))`.
 * DEFERRED-adjacent: the skeleton only uses the default any-staff guard; this is provided so a
 * later phase can gate by canonical role without re-introducing a ctor-param (DI-safe).
 */
export function requireStaffRole(minRole: StaffRoleClaim): Type<CanActivate> {
  @Injectable()
  class RoleGatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      return assertStaff(context.switchToHttp().getRequest<RequestWithAccount>(), minRole);
    }
  }
  return mixin(RoleGatedGuard);
}

/**
 * `assertMinRole` (04e-C C5, DD-C5) — an IN-HANDLER minimum-role check for a route whose required
 * role depends on BODY content (e.g. `push/send`'s base guard is `gm`, but a `forceOverride:true`
 * payload requires `admin`/`super_admin`, canon `liveops_events_and_push.md §4` "Push cap
 * force-override"). A body-conditional requirement cannot be expressed by the route-level
 * `@UseGuards(requireStaffRole(...))` decorator (guards run before the body is available to a
 * per-field check) — this reuses the SAME `ROLE_ORDINAL` table + the SAME `AUTHZ_PERMISSION_DENIED`
 * code `assertStaff` itself throws for its own min-role check, rather than a second ordinal table.
 *
 * PRECONDITION: the route's own `@UseGuards` MUST already have run (so `req.account` is populated by
 * the VERIFIED JWT, never client-supplied) — this does NOT re-verify the bearer token itself.
 */
export function assertMinRole(req: RequestWithAccount, minRole: StaffRoleClaim): void {
  const have = req.account?.role ? ROLE_ORDINAL[req.account.role] : -1;
  if (have < ROLE_ORDINAL[minRole]) {
    throw new ApiError('AUTHZ_PERMISSION_DENIED', {
      message: `Insufficient staff role for this action (requires ${minRole} or above).`,
    });
  }
}

// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §JwtAuthGuard (verify + req.account)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- lot-2 remediation (TD-077): thread verifyJwt `reason` through ExtractResult so
//                the guards can emit the correct split AUTH_TOKEN_* code per cause. --
//             -- W0.3b C1 (2026-08-08): extractAccountFromToken() factored out of
//                extractAccountFromAuthHeader() so the SAME verify + principal-build path serves a
//                new `extractAccountFromCookie()` — used by StaffRoleGuard's cookie fallback
//                (gb_session). JwtAuthGuard (player surface) is UNCHANGED — it only ever calls
//                extractAccountFromAuthHeader(), never the cookie extractor. --
//
// Shared bearer-token extraction + verification → AuthenticatedAccount. Used by both
// JwtAuthGuard (audience GAME_BACK) and StaffRoleGuard. Audience is checked by the CALLER
// (each guard enforces its own audience — R-SM-3), so this returns the principal regardless
// of audience and lets the guard decide. No DB hit — the verified claims are authoritative
// for the skeleton (session-revocation lookup via DB/Redis blacklist is DEFERRED).

import { verifyJwt } from './jwt';
import type { AuthenticatedAccount } from './authenticated-request';

/** The failure reason threaded from verifyJwt (or 'missing' for absent header/cookie). */
export type ExtractFailureReason =
  | 'missing'
  | 'malformed'
  | 'bad_signature'
  | 'expired'
  | 'bad_alg'
  | 'bad_iss';

export type ExtractResult =
  | { ok: true; account: AuthenticatedAccount }
  | { ok: false; reason: ExtractFailureReason };

/** Verify a raw JWT string and build the principal. Shared by the header and cookie extractors. */
function extractAccountFromToken(token: string): ExtractResult {
  const verified = verifyJwt(token);
  if (!verified.ok) {
    // Propagate verifyJwt's discriminated reason so the guard can map to the right AUTH_TOKEN_* code.
    return { ok: false, reason: verified.reason };
  }
  const c = verified.claims;
  return {
    ok: true,
    account: {
      account_id: c.sub,
      kind: c.account_kind,
      audience: c.aud,
      role: c.role ?? null,
      session_id: c.session_id,
      jti: c.jti,
    },
  };
}

/** Pull `Authorization: Bearer <jwt>`, verify it, and build the principal. */
export function extractAccountFromAuthHeader(
  authHeader: string | undefined,
): ExtractResult {
  if (!authHeader) {
    // No Authorization header at all — 'missing' reason so the guard emits AUTH_TOKEN_MISSING.
    return { ok: false, reason: 'missing' };
  }
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!m) {
    // Non-Bearer scheme or malformed Authorization header.
    return { ok: false, reason: 'missing' };
  }
  return extractAccountFromToken(m[1].trim());
}

/**
 * W0.3b C1 — pull a named cookie's value out of the raw `Cookie` header, verify it, and build the
 * principal. REUSE (by reference) of the raw-parsing loop already proven in bo-back's
 * `staff_role.guard.ts:55-72` (no `cookie-parser` dependency) — only the parsing primitive is
 * shared; game-back's PRECEDENCE is the opposite of bo-back's (header-first here, D3), so the
 * caller decides when to invoke this, not this function.
 */
export function extractAccountFromCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): ExtractResult {
  if (!cookieHeader) {
    return { ok: false, reason: 'missing' };
  }
  for (const pair of cookieHeader.split(';')) {
    const [k, ...rest] = pair.trim().split('=');
    if (k && k.trim() === cookieName && rest.length > 0) {
      return extractAccountFromToken(rest.join('=').trim());
    }
  }
  // Cookie header present but the named cookie isn't in it — 'missing', same as no header at all.
  return { ok: false, reason: 'missing' };
}

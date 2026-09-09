// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §JwtAuthGuard (req.account)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- W0.3b C1 (2026-08-08): added `method` (additive) so StaffRoleGuard's cookie-path
//                CSRF check (§6.3b) can tell safe (GET/HEAD/OPTIONS) from non-safe methods without
//                widening to the full Express Request. --
//
// The authenticated principal the JwtAuthGuard attaches to the request as `req.account`.
// Derived ONLY from verified JWT claims — NEVER from the body (R-ID-3). Read by:
//   - GET /v1/me (projects the player),
//   - the IdempotencyInterceptor (account_id scope, Q2-3),
//   - the StaffRoleGuard (kind/role).

import type { AccountKindClaim, AudienceClaim, StaffRoleClaim } from './jwt';

/** The verified principal (a subset of TokenClaims, no secrets). */
export interface AuthenticatedAccount {
  account_id: string;
  kind: AccountKindClaim;
  audience: AudienceClaim;
  role: StaffRoleClaim | null;
  session_id: string;
  jti: string;
}

/** Request shape after the JwtAuthGuard has run (express Request + our `account` slot). */
export interface RequestWithAccount {
  header(name: string): string | undefined;
  /** HTTP method (always present on a real Express Request). W0.3b C1 — CSRF safe-method check. */
  method: string;
  /** Populated by JwtAuthGuard on success; undefined for unauthenticated requests. */
  account?: AuthenticatedAccount;
}

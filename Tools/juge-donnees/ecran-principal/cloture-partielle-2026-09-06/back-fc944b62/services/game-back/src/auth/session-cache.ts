// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §Redis hot cache (TD-001e, lot-5 T12)
//
// Shared constants and helpers for the Redis session-state hot cache.
// Extracted from jwt-auth.guard.ts / auth.service.ts to avoid cross-import coupling.
//
// Key scheme: session:{session_id} → 'ACTIVE' | 'REVOKED'
//   - Written on:  establish (ACTIVE), rotate-success (ACTIVE refresh), revoke/replay/evict (REVOKED).
//   - Read on:     every JwtAuthGuard canActivate() check (O(1) fast path).
//   - MISS:        guard falls back to PG (durable source of truth, R-SM-6).
//   - TTL:         refresh_token_ttl_d * 86400 seconds (safety net — explicit revocations always
//                  write-through before returning, so TTL-expiry is only a crash-safety mechanism).

/** Redis key for the session state hot cache (lot-5 TD-001e). */
export function sessionCacheKey(sessionId: string): string {
  return `session:${sessionId}`;
}

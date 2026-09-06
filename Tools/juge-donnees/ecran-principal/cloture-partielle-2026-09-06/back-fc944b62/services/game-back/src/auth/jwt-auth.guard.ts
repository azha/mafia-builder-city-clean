// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §JwtAuthGuard (audience GAME_BACK)
//             + §Invariant 6 / R-SM-3 (audience isolation) + identity_model.md §R-IM-4
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- lot-2 remediation (TD-077): emit per-cause AUTH_TOKEN_* code per verifyJwt reason.
//                ExtractResult now carries `reason` from verifyJwt (bearer.ts updated). --
//             -- lot-5 TD-001b: SessionRecord state check — closes the deferred JTI/revocation lookup.
//                After JWT signature + audience checks pass, the guard now loads the SessionRecord
//                from PG (DB token, globally available from @Global() DbModule) and rejects if
//                state != ACTIVE. REVOKED or EXPIRED → AUTH_TOKEN_INVALID_SIGNATURE (401, fail-closed).
//                DB is injected directly (not via AuthService) so this guard remains resolvable by
//                every module that uses @UseGuards(JwtAuthGuard) without requiring each to import
//                AuthModule — the @Global() DB + REDIS tokens are always visible. --
//             -- lot-5 TD-001e: Redis hot cache for session state (R-SM-6).
//                The per-request PG hit (TD-001b) is now front-ended by a Redis read.
//                Key: session:{session_id} → 'ACTIVE' | 'REVOKED' (absent = miss → fall through to PG).
//                On HIT: use the cached value directly (no PG round-trip).
//                On MISS: query PG (durable source of truth) and DO NOT populate the cache here
//                  (write-through on establish/rotate/revoke writes it; the guard is read-only).
//                R-SM-6: Redis is a cache, NEVER authoritative. PG remains the durable source.
//                No-stale-ACTIVE guarantee: revoke/rotate/evict MUST set the cache to 'REVOKED'
//                  (or delete) synchronously before returning (write-through invariant, enforced in
//                  AuthService — see auth.service.ts). A REVOKED cache entry is TTL-capped so a
//                  crash cannot leave a stale ACTIVE entry — TTL = refresh_token_ttl_d * 86400 s. --
//             -- W0.3b R-SA-3 bound (2026-08-09, docs/superpowers/specs/2026-08-08-w0.3b-bo-
//                credential-path-design.md §8.1/§8.8): R-SA-3 amended (ruling 2026-08-08) lets a
//                StaffAccount hold a GAME_BACK-audience token (lot-1 TD-076 dual-audience signin)
//                ONLY for game-back's STAFF surfaces (StaffRoleGuard) — NEVER for a player surface.
//                This guard is the player surface, so it now ALSO enforces `account_kind == PLAYER`
//                after the audience check. This closes a trou that PRE-DATES this chunk (lot-1
//                already hands a STAFF a GAME_BACK token; nothing rejected it here) — the ruling
//                turned "jamais pour une surface joueur" into a rule this guard must apply. --
//
// `JwtAuthGuard` (game-back) — verifies the bearer JWT signature, enforces `aud == GAME_BACK` AND
// `account_kind == PLAYER` (R-SA-3 amended — a STAFF's GAME_BACK token is valid but not FOR THIS
// SURFACE), enforces session REVOCATION (revocation check, lot-5 TD-001b),
// and populates `req.account` (AuthenticatedAccount). Missing / invalid / expired token, or a
// non-GAME_BACK audience, or a FOUND-and-non-ACTIVE session → 401 (fail-closed, R-RBAC refus par défaut).
// A GAME_BACK token that is NOT `account_kind == PLAYER` (STAFF or SERVICE) → 403 (authenticated,
// just not authorized for this surface — error_handling.md:97, §8.8).
//
// Revocation semantics (lot-5 fix): the guard enforces revocation — it rejects only when a session
// row is FOUND and in a non-ACTIVE state (REVOKED/EXPIRED/IDLE). A not-found session (null) PASSES:
// the token's signature is the trust anchor; there is no tracked session to revoke. A token with no
// session_id also passes (skips the lookup — nothing to check). This is production-equivalent: real
// tokens always have an ACTIVE session row created at signin. The revocation guarantee is preserved
// because signout/eviction/rotation set state=REVOKED (row persists as REVOKED → still caught).
//
// Per-cause code mapping (error_handling.md §Catalogue):
//   reason 'missing'            → AUTH_TOKEN_MISSING   (401)
//   reason 'expired'            → AUTH_TOKEN_EXPIRED    (401)
//   reason 'malformed'/'bad_alg'/'bad_signature'/'bad_iss' → AUTH_TOKEN_INVALID_SIGNATURE (401)
//   wrong audience (aud ≠ GAME_BACK) → AUTH_TOKEN_INVALID_SIGNATURE (401, stays 401 — "I don't
//     know who you are on THIS surface"; error_handling.md §401 vs 403)
//   valid GAME_BACK token, account_kind ≠ PLAYER (STAFF/SERVICE) → AUTHZ_PERMISSION_DENIED (403,
//     R-SA-3 bound, §8.8). NOT 401, unlike the audience-mismatch row above: audience picks the
//     wrong DOOR (a BO_BACK token carries no game-back claims worth trusting at all, so this guard
//     treats it as if unauthenticated HERE); `account_kind` is read from a token this guard has
//     ALREADY verified is GAME_BACK — the caller IS a known, authenticated principal (a real STAFF
//     account, correctly signed), just not the account CLASS this surface is for. That is exactly
//     error_handling.md:97's 403 case ("je sais qui tu es, mais tu ne peux pas"), not its 401 case
//     ("je ne sais pas qui tu es"). No new code: AUTHZ_PERMISSION_DENIED is already the canonical
//     name for "authenticated, wrong kind/role for this surface" (error-codes.ts:169-175, "Covers
//     not-STAFF + below-min-role") — this reuses it for the mirror-image mismatch (not-PLAYER),
//     the exact same code StaffRoleGuard throws for its own `kind !== 'STAFF'` branch
//     (staff-role.guard.ts:120-122). A 403 here discloses nothing about any RESOURCE (D2's
//     ressource-404 convention doesn't apply — this is an account CLASS, not an object lookup).
//   session FOUND and REVOKED/EXPIRED/IDLE → AUTH_TOKEN_INVALID_SIGNATURE (401, session revocation)
//   session not-found (null) or no session_id → PASS (no row to revoke)

import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type Redis from 'ioredis';

import { DB, REDIS } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { authSession } from '../db/schema/account';
import { ApiError } from '../protocol/api-error';
import { extractAccountFromAuthHeader } from './bearer';
import type { ExtractFailureReason } from './bearer';
import type { RequestWithAccount } from './authenticated-request';
import { sessionCacheKey } from './session-cache';

/** Map a verifyJwt failure reason to the canonical AUTH_TOKEN_* error code. */
function tokenErrorCode(
  reason: ExtractFailureReason,
): 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID_SIGNATURE' {
  if (reason === 'missing') return 'AUTH_TOKEN_MISSING';
  if (reason === 'expired') return 'AUTH_TOKEN_EXPIRED';
  // malformed | bad_signature | bad_alg | bad_iss → invalid signature family
  return 'AUTH_TOKEN_INVALID_SIGNATURE';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAccount>();
    const result = extractAccountFromAuthHeader(req.header('authorization'));
    if (!result.ok) {
      // Per-cause 401 code (lot-2 split — reason threaded from verifyJwt via bearer.ts).
      throw new ApiError(tokenErrorCode(result.reason), {
        message: 'Missing or invalid bearer token.',
      });
    }
    // Audience isolation (R-SM-3): a token minted for BO_BACK (or any non-GAME_BACK audience)
    // can NEVER authenticate on the game-back. 401 (token is not valid HERE — "I don't know who
    // you are on this surface"), not 403. error_handling.md §401 vs 403.
    if (result.account.audience !== 'GAME_BACK') {
      throw new ApiError('AUTH_TOKEN_INVALID_SIGNATURE', {
        message: 'Token audience is not GAME_BACK.',
      });
    }
    // Account-kind isolation (R-SA-3 amended, ruling 2026-08-08, §8.1/§8.8): this guard is the
    // PLAYER surface. A GAME_BACK token is otherwise valid here (lot-1 TD-076 hands a STAFF one
    // too, for game-back's STAFF surfaces via StaffRoleGuard) but a non-PLAYER account_kind is
    // authenticated, not authorized FOR THIS surface → 403, mirroring StaffRoleGuard's own
    // `kind !== 'STAFF'` branch (staff-role.guard.ts:120-122) for the opposite mismatch. See the
    // per-cause code mapping comment above the class for why this is 403, not 401.
    if (result.account.kind !== 'PLAYER') {
      throw new ApiError('AUTHZ_PERMISSION_DENIED', {
        message: 'This surface requires a PLAYER account.',
      });
    }

    // SessionRecord state check (lot-5 TD-001b/TD-001e — JTI/revocation lookup).
    // session_management.md §Révocation: "Toute requête API valide la signature ET vérifie l'absence
    // du jti dans la blacklist Redis (lookup O(1))."
    //
    // TD-001e: Redis hot cache — REVOKED-only cache design (R-SM-6 correctness invariant).
    //
    // Cache key: session:{session_id} → 'REVOKED' (only REVOKED entries are cached)
    // - HIT 'REVOKED'  → fast reject 401. Cache cannot be stale-REVOKED on a live session because
    //                    AuthService only ever writes 'REVOKED' (never transitions REVOKED→ACTIVE).
    // - MISS           → query PG (durable source of truth). ACTIVE sessions always hit PG.
    //
    // Why REVOKED-only (not ACTIVE too):
    //   R-SM-6 states PG is authoritative. Caching 'ACTIVE' would skip PG checks for sessions that
    //   may have been revoked via a direct DB path (admin kick, password reset, out-of-band tooling)
    //   that bypasses AuthService write-through. The REVOKED-only design is unconditionally correct:
    //   - REVOKED HIT  → fast reject (write-through guarantee: once REVOKED in Redis, the session IS
    //                    revoked in PG too — the inverse is not universally true without a write-back).
    //   - MISS         → PG is consulted, so any out-of-band revocation is always caught.
    //   - ACTIVE (PG)  → PG hit; the caching benefit is fast-rejection of revoked sessions (O(1))
    //                    rather than skipping PG for active ones. This is the safe trade-off.
    //
    // Redis errors: fail open to PG (swallow, PG provides correctness — R-SM-6).
    // DB is injected directly (@Global() DbModule) — never via AuthService — so this guard is
    // resolvable in ALL module contexts without requiring each to import AuthModule.
    const sessionId = result.account.session_id;
    // If the token carries a session_id, enforce revocation via Redis + PG.
    // If there is no session_id (session-less token), skip the lookup — nothing to revoke.
    // In production all tokens minted by this codebase carry session_id (auth.service.ts
    // establishSession), so this branch is exercised only by test helpers that mint bare tokens.
    if (sessionId) {
      // 1. Check Redis for a REVOKED entry (fast-reject path, O(1)).
      try {
        const cached = await this.redis.get(sessionCacheKey(sessionId));
        if (cached === 'REVOKED') {
          // Cache hit: session is REVOKED — fast-reject 401 (no PG round-trip needed).
          throw new ApiError('AUTH_TOKEN_INVALID_SIGNATURE', {
            message: 'Session is revoked or expired.',
          });
        }
        // cached === 'ACTIVE' or cached === null (MISS) → fall through to PG.
        // (ACTIVE cache entries from the write-through path are informational only — we still
        //  always check PG to guarantee correctness for out-of-band revocations. The REVOKED HIT
        //  above is the only Redis-only short-circuit path.)
      } catch (redisErr: unknown) {
        // Re-throw ApiError (the REVOKED fast-reject above) so guard correctly rejects.
        if (redisErr instanceof ApiError) throw redisErr;
        // Any other Redis error (connection failure, timeout, etc.): swallow and fall through to PG.
      }

      // 2. PG authoritative check (always reached for non-REVOKED-HIT paths).
      const rows = await this.db
        .select({ state: authSession.state })
        .from(authSession)
        .where(eq(authSession.session_id, sessionId))
        .limit(1);
      const state = rows[0]?.state ?? null;

      // Reject only when the row was FOUND and is non-ACTIVE (revocation enforcement).
      // null (session not found) → PASS: no row to revoke; signature is the trust anchor.
      // This is production-equivalent: real tokens always have an ACTIVE row (signin creates it).
      if (state !== null && state !== 'ACTIVE') {
        // REVOKED, EXPIRED, or IDLE → fail-closed.
        throw new ApiError('AUTH_TOKEN_INVALID_SIGNATURE', {
          message: 'Session is revoked or expired.',
        });
      }
    }

    req.account = result.account;
    return true;
  }
}

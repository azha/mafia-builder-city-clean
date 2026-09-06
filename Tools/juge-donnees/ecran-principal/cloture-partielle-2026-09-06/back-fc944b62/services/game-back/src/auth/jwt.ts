// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §Composites (TokenClaims)
//             + §Token pair issuance + §Signature et rotation des clés (SKELETON: HS256, ring DEFERRED)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//
// Minimal, dependency-free JWT (HS256) sign + verify using Node's built-in crypto.
//
// WHY no library: keeps the node:20-alpine image lean (no jose/jsonwebtoken dep) and the
// skeleton self-hosted. The spec TARGET is asymmetric ES256/EdDSA + a `KeyMaterialRing` +
// JWKS endpoint + `kid` header rotation (session_management.md §Signature) — that whole
// key-management apparatus is DEFERRED. The skeleton signs HS256 with a single shared
// secret from env `JWT_SIGNING_SECRET` (secret-managed, never baked into the image).
//
// CROSS-SERVICE NOTE (debt): this file is intentionally DUPLICATED into bo-back
// (services/bo-back/src/auth/jwt.ts), because no shared package exists yet. Both services
// verify with the SAME shared secret. Extract to a shared `@mafia/auth` package in a later
// phase. NOTE: bo-back is verify-only (it strips signJwt/b64url/b64urlJson, 5.1K vs 6.8K
// here) — the shared subset (verifyJwt, signingSecret, KNOWN_DEV_SECRET, TokenClaims types)
// is kept identical. [DRIFT M-ch17-AUTH-3: prior comment said "byte-identical" which is
// imprecise — the bo-back copy omits the sign-side helpers unused on the BO service.]
//
// CLAIMS (session_management.md §TokenClaims): iss, sub (=account_id), aud, jti, session_id,
// iat, exp, account_kind. SKELETON additionally embeds the staff `role` DIRECTLY (the full
// ScopeGrantSnapshot/scope_grant_ref/rbac_matrix machinery is DEFERRED — authorization_rbac.md).

import { createHmac, timingSafeEqual } from 'node:crypto';

export type AudienceClaim = 'GAME_BACK' | 'BO_BACK' | 'INTERNAL_BUS';
export type AccountKindClaim = 'PLAYER' | 'STAFF' | 'SERVICE';
export type StaffRoleClaim =
  | 'player'
  | 'player_support'
  | 'gm'
  | 'admin'
  | 'super_admin';

/** TokenClaims subset materialized by the skeleton (session_management.md §TokenClaims). */
export interface TokenClaims {
  iss: string;
  sub: string; // account_id
  aud: AudienceClaim;
  jti: string;
  session_id: string;
  iat: number; // seconds since epoch
  exp: number; // seconds since epoch
  account_kind: AccountKindClaim;
  /** SKELETON: staff role embedded directly (scope_grant_ref DEFERRED). null/absent for players. */
  role?: StaffRoleClaim | null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlJson(value: unknown): string {
  return b64url(JSON.stringify(value));
}

function hmacSha256(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

// The publicly-known dev fallback (see docker-compose.yml + .env.example). It is fine in local
// dev but MUST NOT survive into a real deploy — anyone could forge tokens with it. Kept as a
// single constant so the boot guard below and the compose default can never drift apart.
const KNOWN_DEV_SECRET = 'changeme_jwt_hs256_local_only';

/** Resolve the shared HS256 secret (secret-managed via env, never in image). */
function signingSecret(): string {
  const secret = process.env.JWT_SIGNING_SECRET;
  if (!secret || secret.trim() === '') {
    // Fail loud at sign time — a missing secret is a misconfiguration, never a silent
    // weak-key fallback. (Boot does not crash; the first signin surfaces it as a 500.)
    throw new Error('JWT_SIGNING_SECRET is not set (secret-managed env required)');
  }
  // Refuse the publicly-known dev default in any real deploy env. NODE_ENV unset/development/test
  // keeps the convenience default; anything else (staging/preprod/production) makes a forgeable
  // auth boundary, so fail loud rather than silently accept a known-weak key.
  const nodeEnv = process.env.NODE_ENV;
  const isLocal = nodeEnv === undefined || nodeEnv === 'development' || nodeEnv === 'test';
  if (secret === KNOWN_DEV_SECRET && !isLocal) {
    throw new Error(
      `JWT_SIGNING_SECRET is the publicly-known dev default in NODE_ENV=${nodeEnv} — ` +
        'refusing to boot a forgeable auth boundary (inject a real secret via the SecretStore)',
    );
  }
  return secret;
}

/**
 * Resolve the expected `iss` claim. Read here so the signer and verifier share ONE source
 * (env `JWT_ISSUER`, same default) and can never disagree (session_management.md §TokenClaims.iss).
 */
function expectedIssuer(): string {
  const iss = process.env.JWT_ISSUER;
  return iss && iss.trim() !== '' ? iss.trim() : 'mafia-clean-city';
}

/** The expected/configured `iss` claim (env `JWT_ISSUER`). Exported so the signer mirrors it. */
export function jwtIssuer(): string {
  return expectedIssuer();
}

/** Sign a JWT (HS256) over the given claims. Header is fixed `{alg:HS256, typ:JWT}`. */
export function signJwt(claims: TokenClaims, secret = signingSecret()): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(claims)}`;
  const sig = b64url(hmacSha256(signingInput, secret));
  return `${signingInput}.${sig}`;
}

export type VerifyResult =
  | { ok: true; claims: TokenClaims }
  | {
      ok: false;
      reason: 'malformed' | 'bad_signature' | 'expired' | 'bad_alg' | 'bad_iss';
    };

/**
 * Verify an HS256 JWT: structural parse → alg check → constant-time signature → exp check → iss check.
 * Returns a discriminated result (never throws on a bad token — the caller maps to 401).
 * Audience (`aud`) is NOT checked here — each guard enforces its own audience (R-SM-3).
 */
export function verifyJwt(token: string, secret = signingSecret()): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'malformed' };
  }
  const [headerB64, payloadB64, sigB64] = parts;
  let header: { alg?: string };
  let claims: TokenClaims;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf-8'));
    claims = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8')) as TokenClaims;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (header.alg !== 'HS256') {
    // Reject `alg:none` and any algorithm confusion (RS256→HS256) outright.
    return { ok: false, reason: 'bad_alg' };
  }
  const expectedSig = hmacSha256(`${headerB64}.${payloadB64}`, secret);
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return { ok: false, reason: 'bad_signature' };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < nowSec) {
    return { ok: false, reason: 'expired' };
  }
  // Reject a token whose issuer is not the one this back signs with (env JWT_ISSUER, shared source).
  if (claims.iss !== expectedIssuer()) {
    return { ok: false, reason: 'bad_iss' };
  }
  return { ok: true, claims };
}

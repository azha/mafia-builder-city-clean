// IMPLEMENTS: docs/tech/17_auth_and_accounts/authentication_flows.md §Flow — sign-in (CredentialVerifier)
//             + identity_model.md §Invariant 3 (secrets separated) — REUSE security_hardening.md (DEFERRED)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//
// `PasswordHasher` — skeleton credential verifier for PASSWORD credentials.
//
// Self-hosted, dependency-free: uses Node's built-in `crypto.scrypt` (no argon2/bcrypt
// native module to compile in the node:20-alpine image; no external SaaS — honors the
// "tout dockerisé / self-hosted" pillar). The full password policy (breach/HIBP lookup,
// argon2id, pepper rotation) is in security_hardening.md — DEFERRED.
//
// Encoded format (self-describing, so params can evolve without a schema change):
//   scrypt$N$r$p$saltB64$hashB64
// Cost params come from authTunables.password (R2.3 — never inline magic numbers).
// Verify recomputes with the STORED params (so a future param bump still verifies old
// hashes) and compares in constant time (timingSafeEqual) to avoid a timing oracle.

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

import { authTunables } from './auth-tunables';

const SCHEME = 'scrypt';

export class PasswordHasher {
  /** Hash a plaintext password → `scrypt$N$r$p$saltB64$hashB64`. */
  static hash(plain: string): string {
    const { scryptN, scryptR, scryptP, scryptKeylen } = authTunables.password;
    const salt = randomBytes(16);
    const derived = scryptSync(plain, salt, scryptKeylen, {
      N: scryptN,
      r: scryptR,
      p: scryptP,
      // scrypt memory grows with N*r*p; raise maxmem so larger N params don't throw.
      maxmem: 256 * 1024 * 1024,
    });
    return `${SCHEME}$${scryptN}$${scryptR}$${scryptP}$${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  /**
   * Constant-time verify of `plain` against a stored `scrypt$...` hash. Returns false
   * (never throws) on any malformed/unknown-scheme stored value — a malformed credential
   * must read as "wrong password", never as a server error that could leak account state.
   */
  static verify(plain: string, stored: string): boolean {
    try {
      const parts = stored.split('$');
      if (parts.length !== 6 || parts[0] !== SCHEME) {
        return false;
      }
      const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
      const N = Number.parseInt(nStr, 10);
      const r = Number.parseInt(rStr, 10);
      const p = Number.parseInt(pStr, 10);
      const salt = Buffer.from(saltB64, 'base64');
      const expected = Buffer.from(hashB64, 'base64');
      const derived = scryptSync(plain, salt, expected.length, {
        N,
        r,
        p,
        maxmem: 256 * 1024 * 1024,
      });
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
}

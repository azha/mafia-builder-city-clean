// IMPLEMENTS: docs/tech/17_auth_and_accounts/session_management.md §Tunables référencés (T.auth.*)
//             + authentication_flows.md §Tunables + identity_model.md §Tunables
//             -- session:2026-06-02 (Phase 0 Task 6) --
//
// Auth-layer tunables (`T.auth.*`).
//
// R2.3: numeric/config balance values live ONLY in the registry. BUT — exactly like
// `T.api.idempotency_ttl_h` (see protocol-tunables.ts) — the `gdd/14 §Auth` section
// is NOT YET CONSOLIDATED: every 17 chunk's §Tunables ends with
//   « REUSE: gdd/14 §Auth (section à créer lors de la consolidation) ».
// So there is no canonical default/range to mirror yet. We surface env-overridable
// PLACEHOLDER defaults (within the "defaults indicatifs" the spec lists in comments)
// so the layer is functional, and FLAG it as DEBT: when the provider decision is made
// and `gdd/14 §Auth` is consolidated with real defaults/ranges, update this map in the
// SAME commit (R9.3 propagation) and replace the placeholders with the registry values.
// (Same pattern Task 5 used for idempotency_ttl_h — do NOT edit gdd/14 from here.)
//
// SECRET vs TUNABLE: `T.auth.jwt_signing_algo` is a tunable (config). The signing KEY
// itself is a SECRET, never a tunable — injected via env `JWT_SIGNING_SECRET`
// (secret-managed, never in image), read by jwt.signer.ts, NOT here.
//
// PROVISOIRE KEYS (gdd/14 §Auth not yet backported): T.auth.jwt_signing_algo,
// T.auth.access_token_ttl_min, T.auth.refresh_token_ttl_d,
// T.auth.scrypt_n, T.auth.scrypt_r, T.auth.scrypt_p, T.auth.scrypt_keylen.
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../config/tunables-store';

export const authTunables = {
  /**
   * T.auth.jwt_signing_algo (PLACEHOLDER — not yet in gdd/14, see header).
   * Spec target is asymmetric (ES256/EdDSA) with a KeyMaterialRing + JWKS
   * (session_management.md §Signature) — DEFERRED. The SKELETON uses HS256 with a
   * single shared secret (env), which is sufficient for the modular-monolith
   * game-back + bo-back and keeps key-management out of the skeleton.
   * Env override: `JWT_SIGNING_ALGO`. (DB-override > env > default — Phase-23).
   * NOT CONSUMED — jwt.ts hardcodes HS256 (asymmetric DEFERRED); an override here changes nothing.
   */
  get jwtSigningAlgo(): string { return TunablesStore.resolveString('T.auth.jwt_signing_algo', 'JWT_SIGNING_ALGO', 'HS256'); },

  /**
   * T.auth.access_token_ttl_min (PLACEHOLDER). Short by construction
   * (session_management.md §Token pair issuance). Default 15 min.
   * Env override: `JWT_ACCESS_TTL_MIN`. (DB-override > env > default — Phase-23).
   */
  get accessTokenTtlMin(): number { return TunablesStore.resolveInt('T.auth.access_token_ttl_min', 'JWT_ACCESS_TTL_MIN', 15); },

  /**
   * T.auth.refresh_token_ttl_d (PLACEHOLDER). Long-lived refresh. Default 30 days.
   * The refresh FLOW (rotation/replay) is DEFERRED; only the TTL column is set.
   * Env override: `JWT_REFRESH_TTL_DAYS`. (DB-override > env > default — Phase-23).
   */
  get refreshTokenTtlDays(): number { return TunablesStore.resolveInt('T.auth.refresh_token_ttl_d', 'JWT_REFRESH_TTL_DAYS', 30); },

  /**
   * T.auth.refresh_token_entropy_bits (PLACEHOLDER — not yet in gdd/14, see header).
   * Spec: "chaîne aléatoire opaque (entropie T.auth.refresh_token_entropy_bits)" (session_management.md
   * §Token pair issuance). 256 bits → 32 bytes of randomBytes → 64-char hex handle.
   * Stored as BYTES so the tunable is entropy-native. MUST be a multiple of 8.
   * Env override: `AUTH_REFRESH_ENTROPY_BITS`. (DB-override > env > default — Phase-23).
   */
  get refreshTokenEntropyBits(): number { return TunablesStore.resolveInt('T.auth.refresh_token_entropy_bits', 'AUTH_REFRESH_ENTROPY_BITS', 256); },

  /**
   * T.auth.max_concurrent_sessions_player — Multi-device eviction cap (Option B, session_management.md §Multi-device).
   *
   * Maximum number of concurrent ACTIVE sessions per (account_id, audience) for PLAYER accounts.
   * On session establish (signin), if ACTIVE count would exceed this cap, the OLDEST session
   * (min established_at) is REVOKED first (FIFO eviction). R-SM-4: "player = N plafonné (Option B)".
   *
   * gdd/14 §Auth — session management (T.auth.* — chunk 17/session_management — added 2026-06-14):
   *   | `T.auth.max_concurrent_sessions_player` | `5` | `1..20` | ... | YES (policy) |
   *
   * Default 5: supports multi-device (mobile + PC Steam + tablet) while bounding server-side session
   * entropy. Env override: `AUTH_MAX_CONCURRENT_SESSIONS_PLAYER`. (DB-override > env > default).
   * STAFF always uses Option A (single active session) — R-SM-4 invariant — NOT controlled by this tunable.
   */
  get maxConcurrentSessionsPlayer(): number { return TunablesStore.resolveInt('T.auth.max_concurrent_sessions_player', 'AUTH_MAX_CONCURRENT_SESSIONS_PLAYER', 5); },

  // JWT issuer (`iss` claim, env `JWT_ISSUER`) is resolved in jwt.ts (`jwtIssuer()`), NOT here, so
  // the signer and verifier share ONE source and can never disagree (review T6 — Fix 1).

  password: {
    /**
     * scrypt cost params (skeleton PasswordHasher). The full password policy (breach
     * lookup, argon2id migration) lives in security_hardening.md — DEFERRED. These are
     * PLACEHOLDERS surfaced here so no magic numbers sit inline in the hasher (R2.3).
     * N=16384 (2^14) is the documented interactive-login scrypt default.
     * (DB-override > env > default — Phase-23).
     */
    get scryptN(): number { return TunablesStore.resolveInt('T.auth.scrypt_n', 'AUTH_SCRYPT_N', 16384); },
    get scryptR(): number { return TunablesStore.resolveInt('T.auth.scrypt_r', 'AUTH_SCRYPT_R', 8); },
    get scryptP(): number { return TunablesStore.resolveInt('T.auth.scrypt_p', 'AUTH_SCRYPT_P', 1); },
    get scryptKeylen(): number { return TunablesStore.resolveInt('T.auth.scrypt_keylen', 'AUTH_SCRYPT_KEYLEN', 32); },
  },

  /**
   * W1.2-a C2 — the 2 `T.auth.two_person_*` keys `authorization_rbac.md` §Tunables names
   * (`:225,229`). ⚠️ DELIBERATELY added HERE, not in a separate `two_person/two-person.tunables.ts`
   * file — measured: this file's OWN header already claims the ENTIRE `T.auth.*` prefix ("Auth-layer
   * tunables (T.auth.*)"), and every other `T.auth.*` key in this codebase (JWT/session/scrypt) lives
   * in this ONE object. A second file for the SAME prefix would fragment it for no reason this repo's
   * own convention supports — see `implementation-notes.md` §Deviations.
   * Defaults are the canon's own "defaults indicatifs" (`:229-236`), not invented.
   */
  twoPerson: {
    /**
     * T.auth.two_person_approval_ttl_min (`:225`) — how long an APPROVED two-person approval stays
     * usable before it expires (canon default indicatif "~30 min", `:233`).
     * Env override: `AUTH_TWO_PERSON_APPROVAL_TTL_MIN`. (DB-override > env > default — Phase-23).
     */
    get approvalTtlMin(): number {
      return TunablesStore.resolveInt('T.auth.two_person_approval_ttl_min', 'AUTH_TWO_PERSON_APPROVAL_TTL_MIN', 30);
    },
    /**
     * T.auth.two_person_max_pending_per_initiator (`:229`) — the cap on simultaneous
     * `AWAITING_SECOND` requests a single initiator may hold (canon default indicatif "~5", `:236`).
     * Not expressible as a CHECK (a per-initiator row COUNT) — enforced by
     * `TwoPersonApprovalRepository.insertRequest`'s own guarded `INSERT … WHERE count(*) < cap`.
     * Env override: `AUTH_TWO_PERSON_MAX_PENDING_PER_INITIATOR`. (DB-override > env > default).
     */
    get maxPendingPerInitiator(): number {
      return TunablesStore.resolveInt(
        'T.auth.two_person_max_pending_per_initiator',
        'AUTH_TWO_PERSON_MAX_PENDING_PER_INITIATOR',
        5,
      );
    },
  },
};

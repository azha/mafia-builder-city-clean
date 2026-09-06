// IMPLEMENTS: docs/tech/17_auth_and_accounts/authentication_flows.md §Flow — sign-in (R-AF-1/R-AF-2)
//             + identity_model.md §Composites (PlayerAccount/StaffAccount) + §NestJS PlayerAccountService
//             + session_management.md §Émission SessionService.establish (SKELETON subset)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- lot-1 remediation (TD-076): STAFF signin emits dual-audience tokens (Option A) --
//                Staff sign-in now creates TWO sessions (one BO_BACK + one GAME_BACK) and returns
//                BOTH access tokens in `SigninResult`. The GAME_BACK staff token is required to
//                authenticate game-back staff surfaces (StaffRoleGuard now requires aud=GAME_BACK,
//                Invariant 6 ch17). The BO_BACK token authenticates /admin surfaces as before.
//                NO silent aud exception — each guard enforces its own audience (R-SM-3).
//
// IN SCOPE (Phase 0 Task 6): resolve an account by email|callsign (player) / email_pro (staff),
// verify the PASSWORD credential, create an `auth_session` row (the SessionRecord), issue a JWT
// (audience GAME_BACK for players / BO_BACK for staff per `kind`). Generic failure (R-AF-1).
//
// DEFERRED (NOT here): JTI blacklist, multi-device eviction, Redis hot cache (PG-only is sufficient
// for the skeleton — Redis OPTIONAL), AuditEvent emission (R-AF-3/R-SM-7), 2FA challenge,
// AuthFlowSession state machine, rotation_chain_id (no history column — single-column policy).
//             -- lot-5 TD-006: lifecycle gating (SUSPENDED/BANNED/DELETED_TOMBSTONE) now in scope --
//                Targeted errors per authentication_flows.md §Flow sign-in step 4 (line 100).
//                R-AF-1 preserved: generic error for unknown identifier + wrong password (no enumeration).
//             -- lot-5 TD-001a: refresh handle issuance + rotation now in scope --
//                Mint opaque refresh handle at session establish; store ONLY its SHA-256 hash in DB
//                (session_management.md §Token pair issuance: "jamais stockée en clair côté serveur —
//                seul le hash est en table"). rotateRefresh() verifies the presented handle's hash,
//                bumps rotation_count, replaces refresh_handle_hash with the NEW handle's hash, and
//                mints a fresh access token (new jti). Exposes rotateRefresh() for T10 HTTP endpoint.
//             -- lot-5 TD-001b: replay detection + revocation now in scope --
//                Single-column reuse detection: if presented handle hash ≠ stored hash on a live
//                (ACTIVE, non-expired) session → REPLAY detected → set state=REVOKED, revoked_at=now,
//                reject AUTH_REFRESH_INVALID. On the access path, the caller (JwtAuthGuard) loads
//                SessionRecord from DB and rejects if state != ACTIVE (closes the deferred JTI/revocation
//                lookup — served by auth_session.state durable PG). NO new column, NO history column.
//             -- lot-5 TD-001e: Redis hot cache write-through (R-SM-6).
//                After every PG state mutation AuthService ALSO writes the new state to Redis
//                (key session:{session_id}, TTL = refresh_token_ttl_d * 86400 s) so JwtAuthGuard can
//                serve guard checks from Redis in O(1) without hitting PG on every request.
//                Write-through is SYNCHRONOUS and happens BEFORE the method returns, guaranteeing that a
//                revoked session can never be served as ACTIVE from a stale Redis entry.
//                Redis errors are swallowed (Redis is a cache — PG remains authoritative; R-SM-6). --
//             -- W0.3b C2 (2026-08-08, docs/superpowers/specs/2026-08-08-w0.3b-bo-credential-path-
//                design.md §7/C2, ruling §8.2): NEW `staffSignin()` — the BO SPA's credential path,
//                served by `POST /v1/auth/staff/signin` (auth.controller.ts). game-back becomes the
//                SOLE emitter of BOTH staff session cookies (bo-back no longer mints anything, D1c).
//                REUSEs `establishSession` INTEGRALLY (the same dual-audience pair `signin()` already
//                calls for STAFF) and the SAME `DUMMY_HASH` (R-AF-1). `resolveByIdentifier`'s staff
//                branch is EXTRACTED into `resolveStaffByEmailPro()` (R-IM-4 — `staffSignin()` never
//                touches `player`). `/v1/auth/signin` (this file's `signin()` above) is UNCHANGED. --

import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, sql, count, asc } from 'drizzle-orm';
import type Redis from 'ioredis';

import { DB, REDIS } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { sessionCacheKey } from './session-cache';
import { account, staffAccount, accountCredential, authSession } from '../db/schema/account';
import { player } from '../db/schema/player';
import { economyState } from '../db/schema/player_economy_state';
import { marksLedger } from '../db/schema/iap_ledger';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { citySimClock } from '../db/schema/city_sim_clock';
import { cityEpoch } from '../db/schema/city_epoch';
import { ApiError } from '../protocol/api-error';
import { PasswordHasher } from './password.hasher';
import { authTunables } from './auth-tunables';
import { OnboardingGrantService } from '../onboarding/onboarding-grant.service';
import {
  signJwt,
  jwtIssuer,
  type AccountKindClaim,
  type AudienceClaim,
  type StaffRoleClaim,
  type TokenClaims,
} from './jwt';
import { isMetaMarketVisible } from '../operational/meta_market/meta-market-visibility';

/**
 * What sign-in returns to the client (token + minimal session descriptor — no credential).
 *
 * For STAFF accounts (lot-1 TD-076 dual-audience, Option A): `access_token` carries the BO_BACK
 * token (for /admin surfaces) and `game_back_access_token` carries the GAME_BACK token (for
 * game-back staff surfaces: /health/detailed + /v1/telemetry/events/recent). For PLAYER accounts
 * `game_back_access_token` is absent (null — players only ever need GAME_BACK, already in
 * `access_token`). Clients MUST NOT cross-use these tokens.
 */
export interface SigninResult {
  access_token: string;
  token_type: 'Bearer';
  account_kind: AccountKindClaim;
  session_id: string;
  expires_in_s: number;
  /** STAFF ONLY (lot-1 TD-076): GAME_BACK-audience staff token for game-back staff surfaces. Null for PLAYER. */
  game_back_access_token: string | null;
  /** STAFF ONLY (lot-1 TD-076): session_id of the GAME_BACK session. Null for PLAYER. */
  game_back_session_id: string | null;
  /**
   * Opaque refresh handle (lot-5 TD-001a). Plaintext delivered to the client ONCE at session establish;
   * ONLY its SHA-256 hash is persisted in DB (session_management.md §Token pair issuance —
   * "hashée en DB, jamais stockée en clair côté serveur"). Client uses it to call POST /v1/auth/refresh.
   */
  refresh_token: string;
  /** TTL of the refresh handle in seconds. Derived from T.auth.refresh_token_ttl_d * 86400. */
  refresh_expires_in_s: number;
}

/**
 * What `staffSignin()` (W0.3b C2) returns to its controller — the two dual-audience session
 * results (`establishSession`'s own return shape, REUSE), one per audience. The controller reads
 * `access_token`/`expires_in_s` off each to set the two HttpOnly cookies; nothing here is ever
 * serialized into an HTTP response body (I2 — the route replies 204).
 */
export interface StaffSigninResult {
  bo: SigninResult;
  gb: SigninResult;
}

/**
 * What rotateRefresh() returns — the new TokenPair after a successful rotation.
 * (session_management.md §Rotation step 3: "émet un nouveau TokenPair, incrémente rotation_count".)
 */
export interface RotateResult {
  access_token: string;
  token_type: 'Bearer';
  session_id: string;
  expires_in_s: number;
  refresh_token: string;
  refresh_expires_in_s: number;
}

/**
 * Inbound sign-up payload (W1.0 — `POST /v1/auth/signup`). `callsign` is the REQUIRED public
 * identity (design 2026-08-07-w1.0-signup-design.md §1.2 — the schema's Option B: `player.email`
 * is nullable + unique, `player.callsign` is the joueur-facing handle day_1_funnel.md:124 needs).
 * `email`/`locale` are OPTIONAL; `null` means "not supplied" (locale defaults to 'en' in the
 * service — the column has no DB default, §1.2).
 */
export interface SignupParams {
  callsign: string;
  password: string;
  email: string | null;
  locale: string | null;
}

// Welcome grant (W1.0 §1.3.2) — REUSE, source cited:
// gdd/10_economy_and_monetization.md §Onboarding economy L178: "Start with $10,000 cash and
// 50 Marks (welcome grant)." Deliberately NOT tunables (day_1_funnel.md:255, explicit R9.3
// dérogation: "les montants de la dotation onboarding … ne sont PAS des tunables … owned
// gdd/10 §Onboarding economy") — these are canon constants, not config.
const WELCOME_GRANT_CASH_CENTS = 1_000_000n; // $10,000 — economy_states.cash_cents is bigint cents.
const WELCOME_GRANT_MARKS = 50;

/** Projected PlayerAccount (R2.2 inverted — client-safe facet, NEVER the raw row / credential). */
export interface PlayerAccountProjection {
  account_id: string;
  handle: string | null;
  email: string | null;
  lifecycle_state: string;
  locale: string | null;
  /** S1-b — l'id JOUEUR, auquel toutes les autres routes joueur sont scopées. */
  player_id: string | null;
  /** ㉒ L1 — la visibilité méta-marché EFFECTIVE (jamais la colonne nullable brute). */
  meta_market_visibility_enabled: boolean;
}

interface ResolvedAccount {
  accountId: string;
  kind: AccountKindClaim;
  lifecycleState: string;
  role: StaffRoleClaim | null;
  passwordHash: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly onboardingGrant: OnboardingGrantService,
  ) {}

  /**
   * Sign in with an identifier (player email|callsign / staff email_pro) + password.
   * On ANY failure (unknown identifier, wrong password, non-active lifecycle) throws the
   * SAME generic AUTH_INVALID_CREDENTIALS (R-AF-1 — never distinguish the cause to the client).
   *
   * For STAFF (lot-1 TD-076): returns dual-audience result — BO_BACK token (`access_token`)
   * for /admin surfaces AND GAME_BACK token (`game_back_access_token`) for game-back staff
   * surfaces. NO silent exception on audience — each token only works for its own audience.
   */
  async signin(identifier: string, password: string): Promise<SigninResult> {
    const resolved = await this.resolveByIdentifier(identifier);

    // R-AF-1: resolve-miss and verify-fail are INDISTINGUISHABLE. Always run a verify against a
    // dummy hash on miss to keep the timing profile similar (no user-enumeration timing oracle).
    const storedHash = resolved?.passwordHash ?? DUMMY_HASH;
    const passwordOk = PasswordHasher.verify(password, storedHash);

    if (!resolved || !passwordOk) {
      // Generic error for unknown identifier OR wrong password — never distinguish (R-AF-1).
      throw new ApiError('AUTH_INVALID_CREDENTIALS', {
        // Dev-facing message only; the client gets the generic code + i18n key (R-AF-1/R-EH-2).
        message: 'Sign-in failed.',
      });
    }

    // Account resolved + password verified. Now gate on lifecycle state
    // (authentication_flows.md §Flow — sign-in step 4, line 100).
    // R-AF-1 is preserved: this branch is ONLY reached when resolve + verify both succeeded,
    // so there is no enumeration leak — the client already authenticated the credential.
    if (resolved.lifecycleState === 'SUSPENDED') {
      throw new ApiError('ACCOUNT_SUSPENDED', {
        message: 'Account suspended.',
      });
    }
    if (resolved.lifecycleState === 'BANNED') {
      throw new ApiError('ACCOUNT_BANNED', {
        message: 'Account banned.',
      });
    }
    if (resolved.lifecycleState === 'DELETED_TOMBSTONE') {
      throw new ApiError('ACCOUNT_NOT_FOUND', {
        message: 'Account not found.',
      });
    }
    if (resolved.lifecycleState !== 'ACTIVE') {
      // Any other non-ACTIVE state (PENDING_VERIFICATION, PENDING, DORMANT, LOCKED, etc.) →
      // generic credential failure (cannot distinguish from wrong password to client).
      throw new ApiError('AUTH_INVALID_CREDENTIALS', {
        message: 'Sign-in failed (account not active).',
      });
    }

    if (resolved.kind === 'STAFF') {
      // Dual-audience staff signin (lot-1 TD-076, Option A): establish TWO sessions.
      // BO_BACK session — for /admin surfaces (unchanged from Phase 0).
      const boResult = await this.establishSession(resolved, 'BO_BACK');
      // GAME_BACK session — for game-back staff surfaces (/health/detailed, /v1/telemetry/events/recent).
      const gbResult = await this.establishSession(resolved, 'GAME_BACK');
      return {
        ...boResult,
        game_back_access_token: gbResult.access_token,
        game_back_session_id: gbResult.session_id,
      };
    }

    // Player path: GAME_BACK audience (R-SM-3 isolation). No dual-audience for players.
    const playerResult = await this.establishSession(resolved, 'GAME_BACK');
    return {
      ...playerResult,
      game_back_access_token: null,
      game_back_session_id: null,
    };
  }

  /**
   * `POST /v1/auth/staff/signin` (W0.3b C2, design §7/C2) — STAFF-only signin for the BO SPA.
   *
   * Resolves via {@link resolveStaffByEmailPro} ONLY (R-IM-4 — this route NEVER queries `player`
   * first, unlike the shared `/v1/auth/signin`'s `resolveByIdentifier`). Verifies the password
   * with the SAME R-AF-1 sequence as `signin()` above (identical DUMMY_HASH constant — no second
   * primitive), then gates on lifecycle with the SAME targeted branches `signin()` uses (design
   * §7/C2 point 4 — a SUSPENDED/BANNED staff now gets the targeted 403 the canon prescribes,
   * not bo-back's collapsed 401; duplicated inline here rather than extracted, because extracting
   * would also have to touch `signin()`'s own body — the conservative call for this chunk, see
   * implementation-notes.md § Deviations). Then establishes BOTH sessions (BO_BACK + GAME_BACK) —
   * the exact dual-audience pair `signin()` already mints for STAFF (`:209-211` above). The
   * controller sets each `access_token` as an HttpOnly cookie and returns 204 (I2 — never in the
   * body); neither `refresh_token` is used on the BO path (design §7/C2 point 7 — no BO refresh
   * route exists yet, named not maquillé).
   */
  async staffSignin(identifier: string, password: string): Promise<StaffSigninResult> {
    const resolved = await this.resolveStaffByEmailPro(identifier);

    // R-AF-1: identical sequence to signin() above — resolve-miss and verify-fail are
    // INDISTINGUISHABLE, always verify against DUMMY_HASH on miss (same constant, no duplication).
    const storedHash = resolved?.passwordHash ?? DUMMY_HASH;
    const passwordOk = PasswordHasher.verify(password, storedHash);
    if (!resolved || !passwordOk) {
      throw new ApiError('AUTH_INVALID_CREDENTIALS', { message: 'Sign-in failed.' });
    }

    // Lifecycle gating — SAME branches as signin() (authentication_flows.md §Flow sign-in step 4).
    // R-AF-1 still holds: this branch is reached only after resolve+verify both succeeded.
    if (resolved.lifecycleState === 'SUSPENDED') {
      throw new ApiError('ACCOUNT_SUSPENDED', { message: 'Account suspended.' });
    }
    if (resolved.lifecycleState === 'BANNED') {
      throw new ApiError('ACCOUNT_BANNED', { message: 'Account banned.' });
    }
    if (resolved.lifecycleState === 'DELETED_TOMBSTONE') {
      throw new ApiError('ACCOUNT_NOT_FOUND', { message: 'Account not found.' });
    }
    if (resolved.lifecycleState !== 'ACTIVE') {
      throw new ApiError('AUTH_INVALID_CREDENTIALS', { message: 'Sign-in failed (account not active).' });
    }

    // Dual-audience — REUSE, INTEGRAL: the exact establishSession pair signin() calls for STAFF.
    const boResult = await this.establishSession(resolved, 'BO_BACK');
    const gbResult = await this.establishSession(resolved, 'GAME_BACK');
    return { bo: boResult, gb: gbResult };
  }

  /**
   * Create a new PLAYER account (W1.0 — `POST /v1/auth/signup`, design
   * `docs/superpowers/specs/2026-08-07-w1.0-signup-design.md`). Writes the FIVE rows that make a
   * player usable end-to-end — `account` → `player` → `account_credential` → `economy_states` →
   * `player_progression_state` — in ONE transaction, credits the welcome grant, then reuses
   * `establishSession()` UNCHANGED (session + JWT + refresh + eviction — the exact signin path).
   *
   * §1.4.1 entorse assumée: ch17 (`authentication_flows.md:86`) asks for `PENDING_VERIFICATION`;
   * that state is a DEAD END here — no verification endpoint exists (TD-346) and
   * `signin` (above, line ~174) rejects every non-ACTIVE state generically. Created ACTIVE
   * instead — ch17's own Option C (`:89`, device-bound: "compte directement ACTIVE"). The
   * `flags.guest_origin` flag that option names has no column (`account` has exactly 4 columns,
   * `schema/account.ts:108-116`) — not set, tracked under TD-346, not maquillé as a full Option C.
   *
   * §1.3.1: `economy_states` has NO OTHER creator in production (only 4 `*-test.controller.ts`
   * insert it) — this is the write that makes `money-holding.repository.ts:426`'s "the player's
   * wallet row exists by construction" comment true instead of aspirational.
   *
   * Question 1 (design §7, arbitrage utilisateur): `callsign` is a legitimate 409 oracle — it is
   * diégétique PUBLIC (`player_search_and_detail_shell.md:129`). `email` is PII and NEVER
   * confirms its existence (R-AF-1 anti-enumeration, Invariant 2): a taken email silently drops
   * from the row (retry without it) instead of failing the request — see the `player_email_uq`
   * branch below.
   */
  async signup(params: SignupParams): Promise<SigninResult> {
    const passwordHash = PasswordHasher.hash(params.password);
    // ⛔ DÉFAUT `fr`, ET C'EST UNE RATIFICATION, PAS UN GOÛT. Ruling user du 2026-09-02 : « fr =
    // langue réelle » — tutoriels, districts, enseignes, fiction, tout est écrit en français.
    // Le défaut `'en'` faisait servir le bundle ANGLAIS à tout joueur qui n'en demande pas
    // d'autre, et il est resté invisible tant que le registre ne servait presque rien : les
    // écrans retombaient sur leur littéral français et paraissaient traduits.
    // ⇒ Mesuré le 2026-09-04, une fois le registre complété (502 clés) : ⑧ est REPASSÉ en
    //   anglais — la clé était enfin servie, dans la mauvaise langue. *Compléter un dictionnaire
    //   révèle la locale par défaut : tant qu'il est vide, le repli la masque.*
    // ⚠️ Ce défaut ne s'applique QU'À un signup qui ne fournit pas de locale. Un `locale` explicite
    //   au signup, ou un `PATCH /v1/me/locale` ultérieur, restent respectés — c'est le choix du
    //   joueur, et il prime sur la langue du jeu.
    const locale = params.locale ?? 'fr'; // §1.2 — app-level default; the column has no DB default.

    const created = await this.db.transaction(async (tx) => {
      const [acct] = await tx
        .insert(account)
        .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
        .returning({ account_id: account.account_id });
      const accountId = acct.account_id;

      // player: two attempts. First WITH the requested email; on a `player_email_uq` collision,
      // retry WITHOUT it (Question 1 — never confirm an email's existence to the caller). A
      // `player_callsign_uq` collision on EITHER attempt is the one distinguishable 409 (see the
      // helper's own header for the `.constraint` mechanics).
      //
      // Each attempt runs inside its OWN nested `tx.transaction()` (a real SAVEPOINT —
      // `NodePgTransaction.transaction()`, `drizzle-orm/node-postgres/session.js:161-177`), NOT a
      // bare `tx.insert()`. A unique-violation on a bare statement leaves the surrounding Postgres
      // transaction ABORTED (25P02 "current transaction is aborted") until an explicit ROLLBACK —
      // any further statement on the SAME `tx`, including the email-drop retry, would immediately
      // fail with 25P02 instead of the expected 23505, and `signupUniqueViolationConstraint` would
      // (correctly) read that as "not ours to translate" and rethrow it as a raw 500. The nested
      // transaction's own catch issues `ROLLBACK TO SAVEPOINT` before rethrowing, so `tx` is clean
      // again by the time THIS catch runs.
      let playerRow: { player_id: string } | undefined;
      try {
        const rows = await tx.transaction((tx2) =>
          tx2
            .insert(player)
            .values({ account_id: accountId, callsign: params.callsign, email: params.email, locale })
            .returning({ player_id: player.player_id }),
        );
        playerRow = rows[0];
      } catch (err) {
        const violated = signupUniqueViolationConstraint(err);
        if (violated === 'player_callsign_uq') {
          throw callsignTakenError(params.callsign);
        }
        if (violated !== 'player_email_uq') {
          // Not player_email_uq — either `null` (not a unique_violation at all) or
          // `player_account_id_uq` (unreachable here in practice, see this helper's own header) —
          // a genuine failure either way, not ours to translate (gate ⊥ M-1, 2026-08-08: asserted
          // explicitly rather than falling through to the email-retry branch below).
          throw err;
        }
        // player_email_uq: retry silently WITHOUT the email. NULL never re-collides (Postgres
        // UNIQUE indexes never compare NULLs), so the only surviving failure mode on retry is a
        // callsign race that landed between the two inserts — also savepoint-wrapped, same reason.
        try {
          const retryRows = await tx.transaction((tx2) =>
            tx2
              .insert(player)
              .values({ account_id: accountId, callsign: params.callsign, email: null, locale })
              .returning({ player_id: player.player_id }),
          );
          playerRow = retryRows[0];
        } catch (err2) {
          if (signupUniqueViolationConstraint(err2) === 'player_callsign_uq') {
            throw callsignTakenError(params.callsign);
          }
          throw err2;
        }
      }
      const playerId = playerRow!.player_id;

      await tx.insert(accountCredential).values({ account_id: accountId, password_hash: passwordHash });

      // Welcome grant (§1.3.2) — REUSE amounts cited at the top of this file (gdd/10 L178), NOT
      // tunables (R9.3 dérogation, day_1_funnel.md:255).
      await tx.insert(economyState).values({
        player_id: playerId,
        cash_cents: WELCOME_GRANT_CASH_CENTS,
        marks: WELCOME_GRANT_MARKS,
      });

      // W1.3-C2 (design §3-C2) — the marks_ledger invariant: "no mutation of economy_states.marks
      // without a ledger entry in the SAME transaction" (screen_c2_iap_shop.md:247). The welcome
      // grant is the FIRST such mutation for every player, so it is the first ledger row too.
      // Inlined on `tx` directly (not a MarksLedgerRepository injection) — same module-cycle
      // avoidance reasoning as the playerProgressionState insert below (a repository call would
      // need IapModule wiring into AuthModule for a single insert). reason_sku='welcome_grant' is
      // not a real catalogue sku_id (it names the GRANT, matching migration 0148's backfill label).
      await tx.insert(marksLedger).values({
        player_id: playerId,
        delta_marks: WELCOME_GRANT_MARKS,
        reason_sku: 'welcome_grant',
      });

      // player_progression_state — arbitrage utilisateur #4 ("signup crée TOUTES les lignes du
      // joueur"). Mirrors `ProgressionRepository.ensureRow`'s exact one-line idempotent shape
      // (insert + onConflictDoNothing) inline on THIS tx rather than injecting
      // ProgressionRepository: ProgressionModule already imports AuthModule (for JwtAuthGuard), so
      // AuthModule importing ProgressionModule back would open a genuine 2-way module cycle (the
      // forwardRef() idiom `session.service.ts`/`session-open-sequence.service.ts` use for their
      // own such cycles). Conservative call for a 1-line insert — see implementation-notes.md §
      // Deviations.
      await tx
        .insert(playerProgressionState)
        .values({ player_id: playerId })
        .onConflictDoNothing({ target: playerProgressionState.player_id });

      // city_sim_clock (W1.1-d C1.3) — seed this player's OWN in-game clock FROM the city-global epoch
      // (city_epoch, W1.1-d C1.1), NOT from 0. Read inside THIS same tx (consistent snapshot with the
      // rest of the signup). city_epoch always has exactly one row (seeded at migration time, 0144) —
      // the `?? 0` fallback only guards a theoretical missing-row edge case, never load-bearing in
      // practice. WHY: the ruling (design §0/§1.3) — a background pilot (C3, not this chunk) keeps
      // players' game_minute in PHASE only if they START in phase; seeding from 0 would leave a
      // late-signing-up player's game_day permanently behind the city's, starving its
      // POLITICAL_CALENDAR_TICK claim forever (design §1.3, the "per-player-firing, city-global-state"
      // family, §1). onConflictDoNothing mirrors playerProgressionState's own idempotent-insert shape
      // immediately above (defensive — signup only ever creates ONE playerId, never re-runs this insert
      // for the same row in practice).
      const [epochRow] = await tx.select({ game_minute: cityEpoch.game_minute }).from(cityEpoch).limit(1);
      await tx
        .insert(citySimClock)
        .values({ player_id: playerId, game_minute: epochRow?.game_minute ?? 0 })
        .onConflictDoNothing({ target: citySimClock.player_id });

      return { accountId, playerId };
    });

    // establishSession() is REUSE — INTEGRAL, unmodified, called AFTER commit (mirrors signin's
    // own posture, line ~220 above: it does its own writes + Redis write-through and has no
    // reason to participate in the account-creation rollback).
    const resolved: ResolvedAccount = {
      accountId: created.accountId,
      kind: 'PLAYER',
      lifecycleState: 'ACTIVE',
      role: null,
      passwordHash,
    };
    const sessionResult = await this.establishSession(resolved, 'GAME_BACK');

    // Welcome grant, assets half (W1.1-a C3, design D1/D1.1) — REUSE-INTEGRAL pattern of
    // establishSession() just above: POST-COMMIT (§0.11 — a repository cannot join THIS method's own
    // tx, already closed by the time we get here), and CONTAINED (design D1.1 pt 3 / BL-1): a grant
    // failure must NEVER turn a successful account-creation + session-establishment into a 500 on
    // `POST /v1/auth/signup` — that would reproduce exactly the failure mode Option (A) was rejected
    // for (§ D1). Mirrors `session.service.ts`'s own `hlCards.computeAndPersist` try/catch precedent
    // (`:140-150`) verbatim: log a stable, greppable marker and degrade — the account is already
    // fully usable (money + session) either way; the grant is advantageous, never necessary, to
    // return a 201 here. `WELCOME_GRANT_REPAIR_FAILED` is the SAME marker the C6 repair seam (design
    // D1.1 pt 3, `session/open`) will use — this is the FIRST attempt, C6's is a retry, both name the
    // same underlying event. ★ C3-only gap, documented (implementation-notes.md § Deviations): until
    // C6 lands the repair seam, a grant failure HERE has no retry path yet — the account stays
    // ungranted until C6 merges. Not a regression to fix in this chunk (C6 is explicitly the seam's
    // owner, design D1.1 pt 3) — named so it is never mistaken for "already handled".
    try {
      await this.onboardingGrant.grantWelcomeAssets(created.playerId);
    } catch (err) {
      this.logger.error(
        `WELCOME_GRANT_REPAIR_FAILED — grantWelcomeAssets failed for player ${created.playerId} at signup — ` +
          `account + session still created successfully, grant will be retried at the next session/open once C6 lands: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      ...sessionResult,
      game_back_access_token: null,
      game_back_session_id: null,
    };
  }

  /**
   * Load the SessionRecord state from PG for a given session_id.
   * Used by JwtAuthGuard (lot-5 TD-001b) to check state != ACTIVE (REVOKED/EXPIRED → 401).
   * This is the JTI/revocation lookup that bearer.ts deferred (served by auth_session.state,
   * durable PG — Redis JTI blacklist is still DEFERRED to T12).
   * Returns 'ACTIVE' | 'IDLE' | 'REVOKED' | 'EXPIRED' | null (null = session not found).
   */
  async getSessionState(sessionId: string): Promise<'ACTIVE' | 'IDLE' | 'REVOKED' | 'EXPIRED' | null> {
    const rows = await this.db
      .select({ state: authSession.state })
      .from(authSession)
      .where(eq(authSession.session_id, sessionId))
      .limit(1);
    return (rows[0]?.state as 'ACTIVE' | 'IDLE' | 'REVOKED' | 'EXPIRED') ?? null;
  }

  /** Resolve a PlayerAccountProjection for an authenticated account_id (used by GET /v1/me). */
  async projectPlayer(accountId: string): Promise<PlayerAccountProjection | null> {
    const rows = await this.db
      .select({
        account_id: account.account_id,
        lifecycle_state: account.lifecycle_state,
        handle: player.callsign,
        email: player.email,
        locale: player.locale,
        player_id: player.player_id,
        meta_market_visibility_enabled: player.meta_market_visibility_enabled,
      })
      .from(account)
      .leftJoin(player, eq(player.account_id, account.account_id))
      .where(and(eq(account.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    // Explicit projection — only client-safe fields, NEVER the credential/raw row (R2.2 inverted).
    return {
      account_id: row.account_id,
      handle: row.handle,
      email: row.email,
      lifecycle_state: row.lifecycle_state,
      locale: row.locale,
      // S1-b — `player_id` manquait : le client ne connaissait que son `account_id`, alors que TOUTES
      // les autres routes joueur sont scopées au `player_id`. Additif, et c'est SON id, pas celui d'un
      // autre (la requête est déjà scopée au compte du token).
      player_id: row.player_id,
      // ㉒ L1 (forme F) — la visibilité EFFECTIVE, pas la colonne brute : `null` veut dire « défaut »,
      // et le rendre tel quel donnerait un interrupteur indéterminé. Producteur unique de la règle :
      // `operational/meta_market/meta-market-visibility.ts`, que le lecteur consomme aussi.
      meta_market_visibility_enabled: isMetaMarketVisible(row.meta_market_visibility_enabled),
    };
  }

  /**
   * ⑲ S10-b (forme B) — ÉCRIRE `player.locale`. Elle était LUE (projetée par `GET /v1/me`) et écrite
   * NULLE PART après le signup : mesuré, les deux seuls sites d'écriture sont les `.values(...)` de
   * `signup`. ⇒ **la langue ne pouvait pas être changée**, ce qui rendait la moitié du travail i18n
   * inutilisable (les 189 clés servies n'ont d'intérêt que si le joueur peut basculer de locale).
   *
   * Le domaine est celui de `SUPPORTED_LOCALES` — jamais une liste réécrite à la main : une locale
   * acceptée ici mais absente du dictionnaire donnerait un bundle vide sans erreur.
   * Retourne `false` si aucune ligne joueur n'appartient à ce compte (le contrôleur en fait un 404).
   */
  async updatePlayerLocale(accountId: string, locale: string): Promise<boolean> {
    const rows = await this.db
      .update(player)
      .set({ locale })
      .where(eq(player.account_id, accountId))
      .returning({ player_id: player.player_id });
    return rows.length > 0;
  }

  /** Resolve account + role + credential by player(email|callsign) / staff(email_pro). */
  private async resolveByIdentifier(identifier: string): Promise<ResolvedAccount | null> {
    // Player path: email OR callsign on the `player` table (09 identity facet), joined to account.
    const byPlayer = await this.db
      .select({
        accountId: account.account_id,
        kind: account.kind,
        lifecycleState: account.lifecycle_state,
        passwordHash: accountCredential.password_hash,
      })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .leftJoin(accountCredential, eq(accountCredential.account_id, account.account_id))
      .where(
        and(
          eq(account.kind, 'PLAYER'),
          sql`(${player.email} = ${identifier} OR ${player.callsign} = ${identifier})`,
        ),
      )
      .limit(1);
    if (byPlayer[0]) {
      const r = byPlayer[0];
      return {
        accountId: r.accountId,
        kind: r.kind as AccountKindClaim,
        lifecycleState: r.lifecycleState,
        role: null, // player role is implicit (authorization_rbac.md §Rôles canoniques)
        passwordHash: r.passwordHash,
      };
    }

    return this.resolveStaffByEmailPro(identifier);
  }

  /**
   * Resolve account + role + credential by staff `email_pro` ONLY — NEVER touches `player`.
   *
   * W0.3b C2 (§7/C2 point 3, R-IM-4) — EXTRACTED from `resolveByIdentifier`'s staff branch (was
   * inlined there; `resolveByIdentifier` above now delegates here unchanged). This is what lets
   * `staffSignin()` (below) resolve WITHOUT ever querying `player` first: a route that resolved
   * player-first would be a credential-existence oracle on the BO origin (design §7/C2 (i.2)).
   * The staff-only clause itself (`and(eq(account.kind,'STAFF'), eq(staffAccount.email_pro, …))`)
   * used to also live in `bo-back/auth.controller.ts:117` — that copy leaves with the controller
   * D1c removes, so after this chunk it exists in exactly ONE place.
   */
  private async resolveStaffByEmailPro(identifier: string): Promise<ResolvedAccount | null> {
    const byStaff = await this.db
      .select({
        accountId: account.account_id,
        kind: account.kind,
        lifecycleState: account.lifecycle_state,
        role: staffAccount.role,
        passwordHash: accountCredential.password_hash,
      })
      .from(staffAccount)
      .innerJoin(account, eq(account.account_id, staffAccount.account_id))
      .leftJoin(accountCredential, eq(accountCredential.account_id, account.account_id))
      .where(and(eq(account.kind, 'STAFF'), eq(staffAccount.email_pro, identifier)))
      .limit(1);
    if (byStaff[0]) {
      const r = byStaff[0];
      return {
        accountId: r.accountId,
        kind: r.kind as AccountKindClaim,
        lifecycleState: r.lifecycleState,
        role: r.role as StaffRoleClaim,
        passwordHash: r.passwordHash,
      };
    }
    return null;
  }

  /** Create the auth_session row + issue the access JWT (skeleton SessionService.establish). */
  private async establishSession(
    resolved: ResolvedAccount,
    aud: AudienceClaim,
  ): Promise<SigninResult> {
    const jti = randomUUID();
    const nowSec = Math.floor(Date.now() / 1000);
    const accessTtlSec = authTunables.accessTokenTtlMin * 60;
    const refreshTtlSec = authTunables.refreshTokenTtlDays * 24 * 3600;
    const accessExpiresAt = new Date((nowSec + accessTtlSec) * 1000);
    const refreshExpiresAt = new Date((nowSec + refreshTtlSec) * 1000);

    // lot-5 TD-001a: mint the refresh handle.
    // spec: "chaîne aléatoire opaque (entropie T.auth.refresh_token_entropy_bits),
    //        hashée en DB (jamais stockée en clair côté serveur — seul le hash est en table)."
    const { plaintext: refreshHandle, hash: refreshHandleHash } = mintRefreshHandle();

    // Multi-device eviction — Option B for PLAYER, Option A for STAFF (session_management.md §Multi-device, R-SM-4).
    //
    // PLAYER (Option B): enforce T.auth.max_concurrent_sessions_player concurrent ACTIVE sessions per
    // (account_id, audience). If the current ACTIVE count >= cap, evict the OLDEST (min established_at)
    // before inserting the new session. Uses auth_session_account_state_idx (account_id, state) — cheap.
    //
    // STAFF (Option A): always single active session per (account_id, audience). Cap = 1.
    // R-SM-4: "staff = single active session par audience (invariant)".
    //
    // NOTE: lot-1 TD-076 dual-audience staff signin calls establishSession TWICE (BO_BACK + GAME_BACK).
    // Each call enforces Option A per-audience independently — one session each, correct.
    const evictionCap = resolved.kind === 'STAFF' ? 1 : authTunables.maxConcurrentSessionsPlayer;

    // Count ACTIVE sessions for this (account_id, audience).
    const [countRow] = await this.db
      .select({ n: count() })
      .from(authSession)
      .where(
        and(
          eq(authSession.account_id, resolved.accountId),
          eq(authSession.audience, aud),
          eq(authSession.state, 'ACTIVE'),
        ),
      );
    const activeCount = Number(countRow?.n ?? 0);

    if (activeCount >= evictionCap) {
      // Evict the oldest ACTIVE session(s). In the normal case (exactly at the cap) only one is evicted.
      // We evict ALL excess (activeCount - evictionCap + 1) in case of races, keeping at most cap-1 ACTIVE
      // so the new session brings the total to exactly cap.
      const excessCount = activeCount - evictionCap + 1;
      // Fetch the excess oldest session_ids ordered by established_at ASC.
      const oldestRows = await this.db
        .select({ session_id: authSession.session_id })
        .from(authSession)
        .where(
          and(
            eq(authSession.account_id, resolved.accountId),
            eq(authSession.audience, aud),
            eq(authSession.state, 'ACTIVE'),
          ),
        )
        .orderBy(asc(authSession.established_at))
        .limit(excessCount);

      if (oldestRows.length > 0) {
        const oldestIds = oldestRows.map((r) => r.session_id);
        // Revoke the oldest session(s): state=REVOKED, revoked_at=now.
        // session_management.md §Multi-device: "évince la plus ancienne en émettant un événement WebSocket
        // session.evicted" — WS event emission DEFERRED (no WS gateway yet); revocation state is set here
        // (the JwtAuthGuard's state-check closes the evicted session's access token, TD-001b/TD-001e).
        await this.db
          .update(authSession)
          .set({ state: 'REVOKED', revoked_at: new Date() })
          .where(
            and(
              eq(authSession.account_id, resolved.accountId),
              eq(authSession.audience, aud),
              eq(authSession.state, 'ACTIVE'),
              sql`${authSession.session_id} = ANY(ARRAY[${sql.join(oldestIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
            ),
          );
        // Write-through: set each evicted session to 'REVOKED' in Redis (TD-001e no-stale-ACTIVE guarantee).
        await Promise.all(oldestIds.map((id) => this.cacheSessionState(id, 'REVOKED')));
      }
    }

    // Persist the SessionRecord in PG (durable source of truth, R-SM-6).
    const inserted = await this.db
      .insert(authSession)
      .values({
        account_id: resolved.accountId,
        audience: aud,
        state: 'ACTIVE',
        access_jti: jti,
        access_expires_at: accessExpiresAt,
        refresh_expires_at: refreshExpiresAt,
        refresh_handle_hash: refreshHandleHash, // ONLY the hash — never the plaintext.
        last_active_at: new Date(),
      })
      .returning({ session_id: authSession.session_id });
    const sessionId = inserted[0].session_id;
    // NOTE (TD-001e REVOKED-only design): We do NOT write 'ACTIVE' to Redis here.
    // The guard uses a REVOKED-only cache (MISS → PG check). This ensures correctness for
    // out-of-band revocations (direct DB updates, admin kicks) that bypass write-through.
    // REVOKED entries are written by cacheSessionState('REVOKED') on revoke/replay/evict.

    const claims: TokenClaims = {
      // Single issuer source shared with verifyJwt (env JWT_ISSUER) — signer/verifier can't drift.
      iss: jwtIssuer(),
      sub: resolved.accountId,
      aud,
      jti,
      session_id: sessionId,
      iat: nowSec,
      exp: nowSec + accessTtlSec,
      account_kind: resolved.kind,
      role: resolved.role,
    };
    const accessToken = signJwt(claims);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      account_kind: resolved.kind,
      session_id: sessionId,
      // Derive the advertised TTL from the ACTUAL claim so it can never desync from `exp`.
      expires_in_s: claims.exp - nowSec,
      // Plaintext refresh handle returned to the client ONCE — NEVER stored in DB (hash only).
      refresh_token: refreshHandle,
      refresh_expires_in_s: refreshTtlSec,
      // establishSession always returns null for these — the caller (signin) fills them in for STAFF.
      game_back_access_token: null,
      game_back_session_id: null,
    };
  }

  /**
   * Write-through to Redis session-revocation cache (lot-5 TD-001e, REVOKED-only design).
   *
   * Sets key session:{sessionId} → 'REVOKED' with TTL = sessionCacheTtlSec().
   * Called synchronously AFTER every PG revocation (revokeSession, replay-revoke, eviction)
   * BEFORE the method returns to the caller.
   *
   * Design choice (R-SM-6 correctness): REVOKED-only cache.
   *   - Only 'REVOKED' entries are cached. MISS = ACTIVE (checked by PG).
   *   - This ensures out-of-band DB revocations (admin kick, direct SQL, password reset)
   *     are ALWAYS caught by the PG fallback — no stale-ACTIVE risk.
   *   - The caching benefit: fast-reject (O(1)) for REVOKED sessions on every subsequent
   *     authenticated request — no PG hit needed for known-revoked sessions.
   *
   * Redis errors are swallowed — PG is the authoritative source (R-SM-6). The guard falls back
   * to PG on MISS, so a Redis write failure is tolerated without correctness impact.
   */
  private async cacheSessionState(sessionId: string, state: 'REVOKED'): Promise<void> {
    try {
      await this.redis.set(sessionCacheKey(sessionId), state, 'EX', sessionCacheTtlSec());
    } catch {
      // Redis write failure: swallow. PG is authoritative (R-SM-6). The guard falls back to PG on MISS.
    }
  }

  /**
   * Revoke the current session (session_management.md §Révocation — "Sign-out explicite").
   *
   * Sets state=REVOKED + revoked_at=now for the given session_id. The caller (signout controller)
   * resolves the session_id from the verified JWT claims (via @UseGuards(JwtAuthGuard) +
   * req.account.session_id — never from the request body; R-ID-3).
   *
   * After revocation, the JwtAuthGuard's state-check (lot-5 TD-001b/TD-001e) will reject further
   * requests with that session's access token (state != ACTIVE). rotateRefresh() also gates on
   * state==ACTIVE, so the refresh handle is dead too.
   * Write-through: sets Redis cache to 'REVOKED' synchronously before returning (no-stale-ACTIVE guarantee).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(authSession)
      .set({
        state: 'REVOKED',
        revoked_at: new Date(),
      })
      .where(eq(authSession.session_id, sessionId));
    // Write-through: set cache to 'REVOKED' BEFORE returning so JwtAuthGuard gets a fast-reject
    // on the next request (no-stale-ACTIVE guarantee, TD-001e).
    await this.cacheSessionState(sessionId, 'REVOKED');
  }

  /**
   * Rotate a refresh handle (session_management.md §Rotation et anti-replay, steps 2-3).
   *
   * Verifies the presented handle's SHA-256 hash against the stored `refresh_handle_hash`.
   * On match: bumps `rotation_count`, replaces `refresh_handle_hash` with the NEW handle's hash,
   * mints a fresh access token (new jti). Returns the new TokenPair.
   * On mismatch (unknown, consumed, expired): throws AUTH_REFRESH_INVALID (401).
   *
   * NOTE (lot-5 TD-001a scope): consumed_at / rotation_chain_id cascade (§Rotation steps 4-5)
   * are DEFERRED to T9 (replay-guard). This method implements steps 2-3 (verify + rotate).
   */
  async rotateRefresh(presentedHandle: string, sessionId: string): Promise<RotateResult> {
    // Fetch the session record (must be ACTIVE + non-expired + have a stored hash).
    const rows = await this.db
      .select({
        session_id: authSession.session_id,
        account_id: authSession.account_id,
        audience: authSession.audience,
        state: authSession.state,
        refresh_handle_hash: authSession.refresh_handle_hash,
        refresh_expires_at: authSession.refresh_expires_at,
        rotation_count: authSession.rotation_count,
        role: sql<string | null>`null`, // role join not needed for rotation — claims carry it
      })
      .from(authSession)
      .where(eq(authSession.session_id, sessionId))
      .limit(1);

    const session = rows[0];

    // Verify: session must exist, be ACTIVE, and have a stored hash.
    if (
      !session ||
      session.state !== 'ACTIVE' ||
      !session.refresh_handle_hash
    ) {
      throw new ApiError('AUTH_REFRESH_INVALID', {
        message: 'Refresh token is invalid or session is not active.',
      });
    }

    // Verify: refresh must not be expired.
    if (session.refresh_expires_at && session.refresh_expires_at < new Date()) {
      throw new ApiError('AUTH_REFRESH_EXPIRED', {
        message: 'Refresh token has expired.',
      });
    }

    // Verify: hash the presented handle and compare with the stored hash in constant time.
    const presentedHash = hashRefreshHandle(presentedHandle);
    const storedHashBuf = Buffer.from(session.refresh_handle_hash, 'hex');
    const presentedHashBuf = Buffer.from(presentedHash, 'hex');
    const hashMatch =
      storedHashBuf.length === presentedHashBuf.length &&
      timingSafeEqual(storedHashBuf, presentedHashBuf);

    if (!hashMatch) {
      // Hash mismatch on a live (ACTIVE, non-expired) session.
      // Single-column reuse detection (lot-5 TD-001b, session_management.md §Rotation step 4 adaptation):
      // ANY non-current handle presented on a live session is by construction either a rotated-away
      // (stale) handle or a forgery. Both cases warrant chain revocation — we cannot distinguish them
      // without a consumed-handle history column (which the single-column schema deliberately omits).
      //
      // Policy (R-SM-1): "toute réutilisation déclenche révocation de la session entière + audit."
      // Set state=REVOKED, revoked_at=now → the whole chain is dead. Then reject 401.
      await this.db
        .update(authSession)
        .set({
          state: 'REVOKED',
          revoked_at: new Date(),
        })
        .where(eq(authSession.session_id, sessionId));
      // Write-through: set Redis cache to 'REVOKED' BEFORE throwing (TD-001e no-stale-ACTIVE guarantee).
      // The JwtAuthGuard on the NEXT request will see 'REVOKED' in Redis and fast-reject 401.
      await this.cacheSessionState(sessionId, 'REVOKED');

      throw new ApiError('AUTH_REFRESH_INVALID', {
        message: 'Refresh token is invalid or has already been used. Session revoked.',
      });
    }

    // Rotation: mint a new handle + new access token (§Rotation step 3).
    const { plaintext: newHandle, hash: newHash } = mintRefreshHandle();
    const newJti = randomUUID();
    const nowSec = Math.floor(Date.now() / 1000);
    const accessTtlSec = authTunables.accessTokenTtlMin * 60;
    const refreshTtlSec = authTunables.refreshTokenTtlDays * 24 * 3600;
    const newAccessExpiresAt = new Date((nowSec + accessTtlSec) * 1000);

    // We need the account kind + role to re-mint the access token. Fetch from account.
    const accountRows = await this.db
      .select({
        kind: account.kind,
        role: staffAccount.role,
      })
      .from(account)
      .leftJoin(staffAccount, eq(staffAccount.account_id, account.account_id))
      .where(eq(account.account_id, session.account_id))
      .limit(1);

    const acct = accountRows[0];
    if (!acct) {
      throw new ApiError('AUTH_REFRESH_INVALID', {
        message: 'Session account not found.',
      });
    }

    // Update the session row: new hash, incremented rotation_count, new access_jti + expiry.
    await this.db
      .update(authSession)
      .set({
        refresh_handle_hash: newHash,          // ONLY the hash — never the plaintext.
        rotation_count: session.rotation_count + 1,
        access_jti: newJti,
        access_expires_at: newAccessExpiresAt,
        last_active_at: new Date(),
      })
      .where(eq(authSession.session_id, sessionId));
    // NOTE (TD-001e REVOKED-only design): We do NOT write 'ACTIVE' to Redis here.
    // Successful rotation keeps the session ACTIVE in PG; the guard will check PG on MISS.

    // Mint the new access JWT.
    const claims: TokenClaims = {
      iss: jwtIssuer(),
      sub: session.account_id,
      aud: session.audience as AudienceClaim,
      jti: newJti,
      session_id: sessionId,
      iat: nowSec,
      exp: nowSec + accessTtlSec,
      account_kind: acct.kind as AccountKindClaim,
      role: (acct.role ?? null) as StaffRoleClaim,
    };
    const accessToken = signJwt(claims);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      session_id: sessionId,
      expires_in_s: accessTtlSec,
      refresh_token: newHandle,
      refresh_expires_in_s: refreshTtlSec,
    };
  }
}

// ===== Module-private helpers (not exported — token primitives + Redis cache) =====

/**
 * Which of `player`'s THREE unique indexes (`player_callsign_uq` / `player_email_uq` /
 * `player_account_id_uq`, `schema/player.ts:60-62`) a thrown DB error violates — `null` if the
 * error is not a Postgres unique_violation (SQLSTATE 23505) at all. Mirrors this codebase's own
 * LOCAL "each service/repository keeps its own copy" `isUniqueViolation` idiom
 * (`standing-order.service.ts`, `flag-discipline.service.ts`,
 * `degraded-category-pressure-producer.service.ts`) but goes one step further and reads
 * `.constraint` (surfaced by node-postgres on a `DatabaseError`, `pg-protocol/dist/messages.d.ts:30`)
 * because `signup` — unlike those single-index sites — inserts a row with THREE sibling unique
 * indexes and must tell them apart (design §7 Question 1: callsign is a legitimate 409 oracle,
 * email must stay silent). `player_account_id_uq` is not reachable from this call in practice
 * (`accountId` is a fresh `uuidv7()` minted moments earlier in the SAME transaction, `:257-261`
 * above) — the caller below does not assume that, though: it asserts `player_email_uq` explicitly
 * rather than falling through, so an unexpected constraint name is rethrown raw, not silently
 * treated as the email case (gate ⊥ M-1, 2026-08-08).
 */
function signupUniqueViolationConstraint(e: unknown): string | null {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } } | null;
  if (err?.code === '23505') return err.constraint ?? null;
  if (err?.cause?.code === '23505') return err.cause.constraint ?? null;
  return null;
}

/** The one distinguishable signup conflict (design §7 Question 1 — callsign is diégétique public). */
function callsignTakenError(callsign: string): ApiError {
  return new ApiError('SIGNUP_CALLSIGN_TAKEN', {
    message: `Callsign "${callsign}" is already taken.`,
    details: { validation_field_errors: [{ field_path: '/callsign', rule_violated: 'ALREADY_TAKEN' }] },
  });
}

/**
 * TTL for Redis session-state cache entries (lot-5 TD-001e).
 * Matches the refresh token TTL so a crash can never leave a stale ACTIVE entry for longer
 * than the natural session lifetime. Sessions are expected to be explicitly revoked well
 * before TTL-expiry; the TTL is a safety net. (R-SM-6 — PG re-confirms on TTL-miss.)
 */
function sessionCacheTtlSec(): number {
  return authTunables.refreshTokenTtlDays * 24 * 3600;
}

/**
 * Mint a high-entropy opaque refresh handle.
 * Returns { plaintext, hash } where:
 *   - `plaintext`: hex string to deliver to the client (NEVER stored in DB).
 *   - `hash`: SHA-256 hex digest to store in `refresh_handle_hash` (NEVER the plaintext).
 *
 * spec: "chaîne aléatoire opaque (entropie T.auth.refresh_token_entropy_bits),
 *        hashée en DB (jamais stockée en clair côté serveur — seul le hash est en table)."
 * (session_management.md §Token pair issuance)
 */
function mintRefreshHandle(): { plaintext: string; hash: string } {
  const entropyBits = authTunables.refreshTokenEntropyBits;
  const entropyBytes = Math.ceil(entropyBits / 8);
  const plain = randomBytes(entropyBytes).toString('hex');
  return { plaintext: plain, hash: hashRefreshHandle(plain) };
}

/** SHA-256 hex digest of a refresh handle plaintext. Used for store and for verify. */
function hashRefreshHandle(plain: string): string {
  return createHash('sha256').update(plain, 'utf-8').digest('hex');
}

// A fixed valid-format hash to verify against on a resolve-miss (constant-time anti-enumeration).
// It is the scrypt hash of a random throwaway string; no real password matches it.
const DUMMY_HASH = PasswordHasher.hash(randomUUID());

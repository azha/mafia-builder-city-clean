// IMPLEMENTS: docs/tech/17_auth_and_accounts/authentication_flows.md §Flow — sign-in
//             ( POST /v1/auth/signin — ch18 URI versioning, versioning_strategy.md §Décision actée )
//             + identity_model.md §NestJS — GET /v1/me projection (R2.2 inverted)
//             + session_management.md §Révocation — POST /v1/auth/signout (TD-001c lot-5 T10)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//             -- lot-2 remediation (TD-078): moved from VERSION_NEUTRAL path to
//                versioned /v1/auth/signin (version segment FIRST, ch18 §Décision actée).
//                ch17 §Cross-cutting documented the old form; that form is superseded — see
//                authentication_flows.md reconciliation note (lot-2 R9.3 additive prose). --
//             -- lot-5 TD-001c: POST /v1/auth/signout — revokes the current session
//                (state=REVOKED, revoked_at=now). Authenticated via @UseGuards(JwtAuthGuard);
//                session_id is read from req.account (verified JWT claims — never from body,
//                R-ID-3). After signout the guard's state-check + rotateRefresh() ACTIVE-check
//                both reject further use of the revoked session's tokens. --
//             -- W1.0 (2026-08-07): POST /v1/auth/signup — design
//                docs/superpowers/specs/2026-08-07-w1.0-signup-design.md. Creates account→player→
//                account_credential→economy_states→player_progression_state (AuthService.signup,
//                the actual delta) then REUSEs establishSession() unmodified. Public, Idempotency-Key
//                REQUIRED (@Idempotent), 201. TD-344 (no rate-limit), TD-345 (no CAPTCHA), TD-346
//                (PENDING_VERIFICATION unreachable → created ACTIVE), TD-347 (no non-monetary grant),
//                TD-348 (no AuditEvent) all named DIFFERRED — see the design's §1.4. --
//             -- W0.3b C2 (2026-08-08, design docs/superpowers/specs/2026-08-08-w0.3b-bo-credential-
//                path-design.md §7/C2, ruling §8.2): NEW `POST /v1/auth/staff/signin` — the BO SPA's
//                dedicated staff signin, on THIS existing controller (no new controller, no new
//                Traefik rule — `PathPrefix('/v1')` already routes here). Sets BOTH HttpOnly session
//                cookies (`bo_session` aud BO_BACK + `gb_session` aud GAME_BACK — StaffRoleGuard's
//                cookie fallback, C1) from `AuthService.staffSignin()`'s dual `establishSession`
//                result and replies 204 (I2 — neither token is ever in the body). `/v1/auth/signin`
//                above is UNCHANGED (disqualified twice for this route — 9 E2E specs read its body,
//                and its resolution is player-first, design §7/C2 point 1). `POST /v1/bo/auth/signin`
//                (bo-back) is REMOVED in the same commit (D1c) — bo-back no longer mints anything. --

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { SUPPORTED_LOCALES } from '../i18n/string_table';
import { ApiError } from '../protocol/api-error';
import { enumField, rejectUnknownFields, uuidField } from '../common/param-pipes';
import { Idempotent } from '../protocol/idempotent.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GB_SESSION_COOKIE } from './staff-role.guard';
import type { RequestWithAccount } from './authenticated-request';

/** Inbound sign-in payload. Validated manually (skeleton avoids a class-validator dep). */
interface SigninBody {
  identifier?: unknown;
  password?: unknown;
}

/**
 * Cookie name for the HttpOnly `BO_BACK`-audience staff session token (lot-5 TD-003/083). MUST
 * equal bo-back's exported `BO_SESSION_COOKIE` (`bo-back/src/auth/staff_role.guard.ts:48`) — that
 * guard is the reader, game-back is now the EMITTER (W0.3b C2, ruling §8.2). Cross-service string
 * constant, no shared package yet — same DEBT pattern `jwt.ts:13-19` already documents for the
 * verify primitive.
 */
const BO_SESSION_COOKIE = 'bo_session';

// Minimal local request/response shapes for the cookie-setting path — @types/express is not a
// devDep of game-back (transitive via @nestjs/platform-express only). REUSE of bo-back's own
// minimal-interface pattern (bo-back/auth.controller.ts:52-68) rather than adding the dep.
interface StaffSigninRequest {
  headers: Record<string, string | string[] | undefined>;
  secure?: boolean;
}
interface StaffSigninCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
  path?: string;
}
interface StaffSigninResponse {
  cookie(name: string, value: string, options?: StaffSigninCookieOptions): this;
}

/**
 * True when the request arrives over plain HTTP (no TLS) — REUSE, transplanted verbatim from
 * bo-back's `isPlainHttp` (`auth.controller.ts:81-84`, §7/C2 point 6). On HTTPS/TLS, Secure is
 * set on the cookie; on the plain-HTTP dev stack, it is omitted.
 */
function isPlainHttp(req: StaffSigninRequest): boolean {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? '';
  return proto !== 'https' && !req.secure;
}

/** Inbound sign-up payload (W1.0). Same manual-validation posture as SigninBody. */
interface SignupBody {
  callsign?: unknown;
  password?: unknown;
  email?: unknown;
  locale?: unknown;
}

/** Inbound refresh payload (lot-5 TD-001a). */
interface RefreshBody {
  refresh_token?: unknown;
  session_id?: unknown;
}

/**
 * `POST /v1/auth/signin` — versioned controller (ch18 URI versioning, versioning_strategy.md
 * §Décision actée: version segment FIRST → `/v1/auth/signin`). Public (no guard). Resolves the
 * account, verifies the password, issues a JWT. Generic failure on any cause (R-AF-1) — handled
 * inside AuthService.
 *
 * Pattern: same `version: String(CURRENT_API_MAJOR)` as MeController below and
 * protocol.controller.ts:21. With `app.enableVersioning(URI_VERSIONING)` in game-back main.ts:44,
 * `@Controller({ path: 'auth', version: '1' })` + `@Post('signin')` resolves to `POST /v1/auth/signin`.
 *
 * ch17 §Cross-cutting previously documented `/auth/v1/*`; that form is superseded by lot-2 —
 * see authentication_flows.md reconciliation note (R9.3 additive prose, lot-2 2026-06-13).
 */
@Controller({ path: 'auth', version: String(CURRENT_API_MAJOR) })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signin')
  @HttpCode(200) // sign-in is not a resource creation → 200, not 201.
  async signin(@Body() body: SigninBody) {
    // TD-451 (chantier P5, lot 4 — la surface NON AUTHENTIFIÉE, traitée à part et en dernier).
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`. Mesuré avant
    // de durcir : le client Unity envoie un SOUS-ENSEMBLE strict de cette liste sur les six branches
    // (inscription = 2 champs, connexion = 2), et aucun site du dépôt n'en sort au premier niveau.
    // Un corps ABSENT reste accepté — la garde ne rejette que les champs EN TROP, jamais l'absence.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['identifier', 'password']);

    // Manual DTO validation → throws VALIDATION_FAILED (422, semantic) directly. The skeleton has
    // NO NestJS ValidationPipe / class-validator dep (DEFERRED); this explicit check is the
    // validation. error_handling.md §Taxonomie: a well-formed-but-incomplete body is 422 (semantic),
    // not 400 (syntactic).
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (identifier === '' || password === '') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'identifier and password are required.',
        details: {
          validation_field_errors: [
            ...(identifier === ''
              ? [{ field_path: '/identifier', rule_violated: 'REQUIRED' }]
              : []),
            ...(password === ''
              ? [{ field_path: '/password', rule_violated: 'REQUIRED' }]
              : []),
          ],
        },
      });
    }
    return this.auth.signin(identifier, password);
  }

  /**
   * `POST /v1/auth/staff/signin` — W0.3b C2 (design §7/C2). The BO SPA's DEDICATED staff signin —
   * declared on THIS existing controller (`@Controller({ path: 'auth', version: '1' })` above), so
   * it resolves to `POST /v1/auth/staff/signin` with NO new controller and NO new Traefik rule
   * (`PathPrefix('/v1')` p20 already routes here; bo-back's carve-out is `PathPrefix('/v1/bo')` p30,
   * which does not match `/v1/auth/…`, §2.4).
   *
   * Public (no guard — pre-auth entry point, mirrors `signin` above and bo-back's REMOVED
   * `/v1/bo/auth/signin`, D1c). Validation is the SAME manual-DTO posture as `signin`.
   *
   * `AuthService.staffSignin()` resolves STAFF-only (R-IM-4 — never touches `player`), verifies via
   * the SAME R-AF-1 `DUMMY_HASH` sequence, and establishes BOTH sessions (BO_BACK + GAME_BACK) — a
   * REAL `auth_session` row per audience (the Invariant 1 repair, design §2.6.1/§8.2). This handler
   * sets each `access_token` as an HttpOnly cookie (REUSE of bo-back's cookie recipe — that source,
   * `bo-back/auth.controller.ts:158-165`, is REMOVED in this SAME commit, D1c; the recipe survives
   * only here now — `httpOnly`, `secure` via the transplanted `isPlainHttp`,
   * `path:'/'`, `maxAge` derived from the REAL `expires_in_s` claim, never a constant, R2.3/§2.6.4)
   * and returns 204 — NEITHER token is ever in the response body (I2, `httponly_cookie.spec.ts`).
   *
   * `SameSite`: `bo_session` stays `lax` (D4b — zero mutating routes left on bo-back after D1c,
   * so a divergence from canon would buy nothing); `gb_session` is `strict` (D4 — it authenticates
   * 60 mutating game-back admin routes, and is used ONLY by same-origin `fetch`, never a top-level
   * navigation, so `strict` costs zero UX, §6.3a).
   */
  @Post('staff/signin')
  @HttpCode(204)
  async staffSignin(
    @Body() body: SigninBody,
    @Req() req: StaffSigninRequest,
    @Res({ passthrough: true }) res: StaffSigninResponse,
  ): Promise<void> {
    // TD-451 (chantier P5, lot 4 — la surface NON AUTHENTIFIÉE, traitée à part et en dernier).
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`. Mesuré avant
    // de durcir : le client Unity envoie un SOUS-ENSEMBLE strict de cette liste sur les six branches
    // (inscription = 2 champs, connexion = 2), et aucun site du dépôt n'en sort au premier niveau.
    // Un corps ABSENT reste accepté — la garde ne rejette que les champs EN TROP, jamais l'absence.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['identifier', 'password']);

    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (identifier === '' || password === '') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'identifier and password are required.',
        details: {
          validation_field_errors: [
            ...(identifier === ''
              ? [{ field_path: '/identifier', rule_violated: 'REQUIRED' }]
              : []),
            ...(password === ''
              ? [{ field_path: '/password', rule_violated: 'REQUIRED' }]
              : []),
          ],
        },
      });
    }

    const { bo, gb } = await this.auth.staffSignin(identifier, password);

    // Secure flag: set when behind TLS (not on the plain-HTTP dev stack) — REUSE, see isPlainHttp above.
    const secure = !isPlainHttp(req);
    res.cookie(BO_SESSION_COOKIE, bo.access_token, {
      httpOnly: true,
      secure,
      sameSite: 'lax', // D4b — unchanged from bo-back's prior posture (session_management.md:108).
      maxAge: bo.expires_in_s * 1000, // derived from the REAL claim, never a constant (R2.3, §2.6.4).
      path: '/',
    });
    res.cookie(GB_SESSION_COOKIE, gb.access_token, {
      httpOnly: true,
      secure,
      sameSite: 'strict', // D4 — new cookie, fetch-only consumer, CSRF hardening (§6.3a).
      maxAge: gb.expires_in_s * 1000,
      path: '/',
    });
    // 204 No Content — I2: neither token is ever in the response body.
  }

  /**
   * `POST /v1/auth/signup` — W1.0, design `docs/superpowers/specs/2026-08-07-w1.0-signup-design.md`.
   * Creates `account`→`player`→`account_credential`→`economy_states`→`player_progression_state`
   * in one transaction, credits the welcome grant, then establishes a session (REUSE — the same
   * `establishSession()` path as `signin`). `201` (resource creation — contrast `signin`'s `200`).
   *
   * `Idempotency-Key` is REQUIRED (`@Idempotent({ required: true })`, R-AF-6 / idempotency.md):
   * missing → 428 `IDEMPOTENCY_KEY_MISSING` (`IdempotencyInterceptor`, unchanged). Design §7
   * Question 2 (ch17 "par en-tête" vs ch18 "par email"): ch17 wins — the header is the ONLY
   * mechanism already built + already proven by an E2E; ch18's "idempotent par email" is read as
   * naming the natural key, not a second concurrent mechanism.
   *
   * Public (no guard — pre-auth by construction). TD-344 (design §1.4): NO rate-limit on this
   * route; accepted as-is, not maquillé — see implementation-notes.md.
   */
  @Post('signup')
  @HttpCode(201) // sign-up IS a resource creation, unlike signin — 201 not 200.
  @Idempotent({ required: true })
  async signup(@Body() body: SignupBody) {
    // TD-451 (chantier P5, lot 4 — la surface NON AUTHENTIFIÉE, traitée à part et en dernier).
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`. Mesuré avant
    // de durcir : le client Unity envoie un SOUS-ENSEMBLE strict de cette liste sur les six branches
    // (inscription = 2 champs, connexion = 2), et aucun site du dépôt n'en sort au premier niveau.
    // Un corps ABSENT reste accepté — la garde ne rejette que les champs EN TROP, jamais l'absence.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['callsign', 'password', 'email', 'locale']);

    // Manual DTO validation — same posture as signin above (no class-validator dep, TD-010).
    const callsign = typeof body.callsign === 'string' ? body.callsign.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : '';

    const validationFieldErrors: Array<{ field_path: string; rule_violated: string }> = [];
    if (callsign === '') {
      validationFieldErrors.push({ field_path: '/callsign', rule_violated: 'REQUIRED' });
    } else if (callsign.length > 24) {
      // player.callsign is varchar(24) — schema/player.ts:34.
      validationFieldErrors.push({ field_path: '/callsign', rule_violated: 'MAX_LENGTH' });
    }
    if (password === '') {
      validationFieldErrors.push({ field_path: '/password', rule_violated: 'REQUIRED' });
    }
    if (emailRaw.length > 255) {
      // player.email is varchar(255) — schema/player.ts:35.
      validationFieldErrors.push({ field_path: '/email', rule_violated: 'MAX_LENGTH' });
    }
    if (localeRaw.length > 8) {
      // player.locale is varchar(8) — schema/player.ts:39.
      validationFieldErrors.push({ field_path: '/locale', rule_violated: 'MAX_LENGTH' });
    }
    if (validationFieldErrors.length > 0) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'callsign and password are required; callsign/email/locale must respect their max length.',
        details: { validation_field_errors: validationFieldErrors },
      });
    }

    return this.auth.signup({
      callsign,
      password,
      email: emailRaw === '' ? null : emailRaw,
      locale: localeRaw === '' ? null : localeRaw,
    });
  }

  /**
   * `POST /v1/auth/signout` — explicit sign-out: revokes the current session (lot-5 TD-001c).
   * (session_management.md §Révocation: "Sign-out explicite (un seul device ou tous)" →
   * "SessionRecord.lifecycle.state = REVOKED, revoked_at daté.")
   *
   * Protected by JwtAuthGuard (GAME_BACK audience): the access token IS the signout credential.
   * The session_id is resolved from req.account (JWT claims — R-ID-3; never from the body).
   * After this returns 200, the guard's state-check + rotateRefresh() ACTIVE-gate both reject
   * any further use of the session's access token or refresh handle.
   */
  @Post('signout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async signout(@Req() req: RequestWithAccount) {
    // req.account is populated by JwtAuthGuard from verified JWT claims (R-ID-3).
    const sessionId = req.account!.session_id;
    await this.auth.revokeSession(sessionId);
    return { signed_out: true };
  }

  /**
   * `POST /v1/auth/refresh` — refresh token rotation (lot-5 TD-001a).
   * (session_management.md §Rotation et anti-replay steps 2-3: verify hash, emit new TokenPair,
   * increment rotation_count, replace refresh_handle_hash with new handle's hash.)
   *
   * Public (no JwtAuthGuard — the refresh_token is the credential here, not an access JWT).
   * Single-use: the presented handle is invalidated on rotation; the new handle must be used next.
   * Consumed-token replay (§Rotation step 4, cascade §Rotation step 5) is DEFERRED to T9 (replay-guard).
   */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshBody) {
    // TD-451 (chantier P5, lot 4 — la surface NON AUTHENTIFIÉE, traitée à part et en dernier).
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`. Mesuré avant
    // de durcir : le client Unity envoie un SOUS-ENSEMBLE strict de cette liste sur les six branches
    // (inscription = 2 champs, connexion = 2), et aucun site du dépôt n'en sort au premier niveau.
    // Un corps ABSENT reste accepté — la garde ne rejette que les champs EN TROP, jamais l'absence.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['refresh_token', 'session_id']);

    const refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (refreshToken === '' || sessionId === '') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'refresh_token and session_id are required.',
        details: {
          validation_field_errors: [
            ...(refreshToken === ''
              ? [{ field_path: '/refresh_token', rule_violated: 'REQUIRED' }]
              : []),
            ...(sessionId === ''
              ? [{ field_path: '/session_id', rule_violated: 'REQUIRED' }]
              : []),
          ],
        },
      });
    }
    // L0.3 (D5) — session_id: uuid (auth_session.session_id) — the design's own "hors instrument
    // (r9)" residual: `{ refresh_token valide, session_id malformé }` → 500, never caught by the
    // generic single-field sweep (it needs a VALID refresh_token to reach rotateRefresh at all).
    // refresh_token stays LIBRE (an opaque handle compared by hash, never a uuid-typed column).
    uuidField({ session_id: sessionId }, 'session_id');
    return this.auth.rotateRefresh(refreshToken, sessionId);
  }
}

/**
 * `GET /v1/me` — protected by JwtAuthGuard (audience GAME_BACK). Returns the PROJECTED
 * PlayerAccount (R2.2 inverted — never the raw row, never the credential). Declared on a
 * separate controller so `/v1/me` is NOT under `/auth/v1`.
 */
@Controller({ version: String(CURRENT_API_MAJOR) })
export class MeController {
  constructor(private readonly auth: AuthService) {}

  /**
   * `PATCH /v1/me/settings` — ⑲ S10-b. Le canon réclame `GET`/`PATCH /v1/me/settings` ; ce chunk livre
   * la MOITIÉ qui débloque un défaut mesuré (la langue ne se changeait pas), pas le domaine entier :
   * `player_settings` n'existe toujours pas comme table, et les autres préférences vivent chacune sur
   * sa propre route (`PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`).
   * ⇒ **S10-a reste OUVERT** ; ce n'est pas un `SettingsService`, c'est l'écrivain manquant d'un champ.
   *
   * Corps `{ locale }`, domaine = `SUPPORTED_LOCALES` ; toute autre valeur → **422 VALIDATION_FAILED**
   * (convention Lot 0 — le 400 du canon est périmé). 200 : mutation d'une ressource existante, jamais
   * une création. Requiert un JWT JOUEUR ; le `playerId` vient du jeton vérifié, jamais du corps.
   */
  @Patch('me/settings')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async patchSettings(
    @Body() body: { locale?: unknown },
    @Req() req: RequestWithAccount,
  ): Promise<{ locale: string }> {
    // TD-451 (chantier P5, lot 4) — la garde de champs inconnus. Le corps est `{ locale }` ; ⚠️ cette
    // route est ABSENTE de la table ratifiée `body-field-classes.ts` (117 champs) alors qu'elle porte
    // un corps — l'allowlist vient donc du HANDLER seul, une seule dérivation, et le trou de la table
    // est signalé à TD-451 pour la session qui la tient.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['locale']);
    const locale = enumField(SUPPORTED_LOCALES as readonly string[], body as Record<string, unknown>, 'locale');
    const updated = await this.auth.updatePlayerLocale(req.account!.account_id, locale);
    if (!updated) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return { locale };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: RequestWithAccount) {
    // req.account is populated by JwtAuthGuard (verified claims, never the body — R-ID-3).
    const accountId = req.account!.account_id;
    const projection = await this.auth.projectPlayer(accountId);
    if (!projection) {
      // A valid GAME_BACK token whose account is not a player row (should not happen for a
      // PLAYER-kind token) → generic not-found (no enumeration detail).
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return projection;
  }
}

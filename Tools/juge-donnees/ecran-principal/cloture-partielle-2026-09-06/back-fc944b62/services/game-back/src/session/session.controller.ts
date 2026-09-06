// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C2 (session runtime — the
//             player-facing open/close endpoints) + design §4 (D1) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id, the EXACT
//             `ExceptionsController`/`ProgressionController` identity-bridge pattern).
//             — P3-A C2 — 2026-07-10
//
// `SessionController` — the PLAYER-FACING gameplay-session lifecycle API (D1):
//   - POST /v1/session/open  → idempotent open (returns the SAME active session if one is fresh; a
//                              stale one is closed then a fresh one opens). Body { client_version }.
//   - POST /v1/session/close → idempotent close (no active session → 200 no-op).
//
// PLAYER RESOLUTION: the SAME identity bridge as `ExceptionsController`/`ProgressionController` — the
// JwtAuthGuard verifies the bearer JWT (aud=GAME_BACK) and attaches `req.account` (account_id — from
// verified claims, NEVER the body, R-ID-3); we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id, filtered to PLAYER accounts).
//
// ★ P3-A C7 (design §9): `open`'s response is the FULL session-open sequence payload —
// `{session_id, hl_card, queue, backlog_badge, queue_pressure_band, structural_budget}` —
// honestly closing the C2 `{ session_id }` skeleton disclaimer this file used to carry (plan §C2 scope
// note / §C7 scope). `SessionService.open` composes it via `SessionOpenSequenceService` (REUSE — the
// exceptions C3/C4 bands, the HL C6 card projection, the governor counters).

import { Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { SessionService } from './session.service';
import type { SessionOpenSequencePayload } from './session-open-sequence.service';
import { rejectUnknownFields } from '../common/param-pipes';

/** POST /session/open body — `client_version` is schema NOT NULL (`sessions_and_audit.ts:46`): the
 *  mobile-native "client declares its build" contract (Unity opens on foreground; E2E supplies a
 *  constant, decisions §1.1 honest consequence). */
interface OpenSessionBody {
  client_version?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class SessionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly sessions: SessionService,
  ) {}

  /**
   * `POST /v1/session/open` — D1: idempotent open. Requires a PLAYER JWT (GAME_BACK audience). No token
   * → 401 (the guard). Missing/blank `client_version` → 422 (VALIDATION_FAILED — the NOT NULL schema
   * column has no sensible default).
   */
  @Post('session/open')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async open(@Body() body: OpenSessionBody, @Req() req: RequestWithAccount): Promise<SessionOpenSequencePayload> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['client_version']);

    const clientVersion = String(body?.client_version ?? '').trim();
    if (!clientVersion) {
      throw new ApiError('VALIDATION_FAILED', { message: 'client_version is required.' });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.sessions.open(playerId, clientVersion);
  }

  /** `POST /v1/session/close` — idempotent (no active session → `{ closed: false }`, still 200). */
  @Post('session/close')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async close(@Req() req: RequestWithAccount): Promise<{ closed: boolean }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.sessions.close(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). 404 if none. */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}

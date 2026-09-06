// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C2
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §6 (Player surface:
//             GET /v1/ambient/feed + POST /v1/ambient/attend/:eventId)
//             Controller pattern seam: services/game-back/src/exceptions/exceptions.controller.ts (GET
//             .../queue + POST .../:id/resolve — the SAME JwtAuthGuard → account_id → player_id bridge +
//             pagination-clamp idiom this controller mirrors verbatim).
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id).
//             — 04g-A C2 — 2026-07-13
//
// `AmbientController` — the PLAYER-FACING Constant Hum ambient-stream API:
//   - GET  /v1/ambient/feed          → the requesting player's `live` micro-events, band-projected (R2.2).
//   - POST /v1/ambient/attend/:id    → attend ONE event. Body: none (the id is the only input; the
//                                       player_id is resolved from the JWT, never the body, R-ID-3).
//
// PLAYER RESOLUTION: the SAME identity bridge as `ExceptionsController`/`CohesionPermafrostController` —
// JwtAuthGuard verifies the bearer JWT + attaches `req.account` (account_id, from verified claims); we
// resolve account_id → player_id via the 1-1 Player↔Account link (player.account_id, filtered to PLAYER
// accounts).

import { Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { AmbientAttendService } from './ambient-attend.service';
import { AmbientProjectionService, type AmbientAttendView, type AmbientFeedItemView } from './ambient.projection.service';

/** GET /ambient/feed pagination bounds (mirrors `exceptions.controller.ts`'s `escalations` clamp pattern). */
const FEED_DEFAULT_LIMIT = 20;
const FEED_MAX_LIMIT = 100;

@Controller({ version: String(CURRENT_API_MAJOR) })
export class AmbientController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly attendService: AmbientAttendService,
    private readonly projection: AmbientProjectionService,
  ) {}

  /**
   * `GET /v1/ambient/feed?limit=&offset=` — the requesting player's `live` micro-events in districts they
   * own ≥1 building in, newest first, band-projected (R2.2 — no raw scalar; design §6). A player with no
   * owned buildings → an empty list. No token → 401 (the guard). `limit` defaults to 20, clamped [1,100];
   * `offset` defaults to 0, clamped ≥0.
   */
  @Get('ambient/feed')
  @UseGuards(JwtAuthGuard)
  async feed(
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ events: AmbientFeedItemView[]; total: number; limit: number; offset: number }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);

    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isNaN(parsedLimit) ? FEED_DEFAULT_LIMIT : Math.min(Math.max(parsedLimit, 1), FEED_MAX_LIMIT);
    const parsedOffset = Number.parseInt(offsetParam ?? '', 10);
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

    const { events, total } = await this.projection.listFeed(playerId, limit, offset);
    return { events, total, limit, offset };
  }

  /**
   * `POST /v1/ambient/attend/:id` — attend ONE owned-visible-or-not `live` event (design §3.3: attend is
   * NOT gated by building ownership — any live city-shared event is attendable by id). 200 on success
   * (qualitative outcome only, R2.2). 404 unknown id / 409 already attended, expired, or lost the
   * concurrent race (`AmbientAttendService.attend`'s single conditional UPDATE).
   */
  @Post('ambient/attend/:id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async attend(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<AmbientAttendView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const outcome = await this.attendService.attend(playerId, String(id ?? ''));
    return this.projection.attendOutcomeView(outcome);
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

// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C3 ("GET /v1/meta/horizon-
//             feed per §8.1... HorizonFeedService transitions: GET marks unseen→seen; POST defer; POST
//             dismiss → 409 CAPABILITY_NOT_DISMISSIBLE on the v1 set (D8)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §8 (feed read/
//             defer/dismiss) + §13 (`POST` transitions are Idempotency-Key supported — the REUSE
//             interceptor).
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §6 (R7 — "a SIBLING
//             controller, registered in the NEW BudgetsHorizonModule's own controllers[] array — not an
//             extension of MetaProgressionController"; DD-G1's own "NEW sibling leaf module" mandate: a
//             NestJS controller lives in exactly ONE module's controllers[], and MetaProgressionController
//             physically lives inside DelegationRatchetModule, a P3-F-owned module this lot never edits).
//             Pattern (player identity bridge, `resolvePlayerId` duplicated per-controller — this
//             codebase's own established convention, NEVER a shared helper, confirmed by grep across 40+
//             controllers): `meta-progression.controller.ts#resolvePlayerId` (copied verbatim).
//             — P3-G C3 — 2026-07-20
//
// `HorizonFeedController` — the PLAYER-FACING Possibility Horizon feed API (`/v1/meta/horizon-feed*`),
// a SIBLING controller inside `BudgetsHorizonModule` (R7/DD-G1 — never an edit to
// `MetaProgressionController`/`DelegationRatchetModule`). All 3 routes require a PLAYER JWT.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { UuidParam } from '../common/param-pipes';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { HorizonFeedService, type HorizonFeedCardView } from './horizon-feed.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HorizonFeedController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly horizonFeed: HorizonFeedService,
  ) {}

  /**
   * `GET /v1/meta/horizon-feed` — the requesting player's "What's emerging" feed (design §8.1). Marks
   * every `unseen` card `seen` as a side effect of the read (ch09's own view-engagement semantic).
   * Requires a PLAYER JWT (no token → 401). RESPONSE SHAPE: `payload.data = { cards:
   * HorizonFeedCardView[] }` (a NAMED object field under the envelope's `data`, mirrors `GET /v1/meta/
   * task-categories`'s own `{ task_categories: [...] }` list-endpoint convention).
   */
  @Get('meta/horizon-feed')
  @UseGuards(JwtAuthGuard)
  async feed(@Req() req: RequestWithAccount): Promise<{ cards: HorizonFeedCardView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const cards = await this.horizonFeed.getFeed(playerId);
    return { cards };
  }

  /**
   * `POST /v1/meta/horizon-feed/:cardId/defer` — defer a non-terminal card (design §8.2). 404 if the
   * card doesn't exist or isn't owned by the requesting player; 409 `RESOURCE_STATE_CONFLICT` if it
   * exists but isn't currently `unseen`/`seen` (already deferred, adopted, or dismissed). 200 (a mutation
   * on the existing card row, not a creation — mirrors `POST /v1/meta/graduation`'s own convention).
   * Requires a PLAYER JWT. Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/horizon-feed/:cardId/defer')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async defer(@Param('cardId', UuidParam) cardId: string, @Req() req: RequestWithAccount): Promise<{ card_id: string; view_status: 'deferred' }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.horizonFeed.defer(playerId, cardId);
  }

  /**
   * `POST /v1/meta/horizon-feed/:cardId/dismiss` — dismiss a card permanently (design §8.3/D8). 404 if
   * not owned; 409 `CAPABILITY_NOT_DISMISSIBLE` if the card's capability is not `dismissible` (the ENTIRE
   * v1 LIVE set — every VOCAB_TIER_* row); 409 `RESOURCE_STATE_CONFLICT` if the (dismissible) card lost a
   * concurrent race for its own status. 200. Requires a PLAYER JWT. Idempotency-Key supported.
   */
  @Post('meta/horizon-feed/:cardId/dismiss')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async dismiss(@Param('cardId', UuidParam) cardId: string, @Req() req: RequestWithAccount): Promise<{ card_id: string; view_status: 'dismissed' }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.horizonFeed.dismiss(playerId, cardId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge —
   *  copied verbatim from `meta-progression.controller.ts`'s own established idiom, this codebase's
   *  per-controller convention, never a shared helper). 404 if none. */
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

// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 ("POST /v1/session/
//             hl-card/:id/commit" + "POST /v1/session/hl-card/:id/skip")
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 (lifecycle) +
//             decisions §2.2 DD-P2 ("hl-card provider registry + service + controller-facing endpoints
//             under session controller" — the URL NAMESPACE is `/v1/session/hl-card/*`; the CLASS lives
//             in `progression/loop10/` alongside the registry/service/scorer it fronts, mirroring
//             `AutonomyReportsController` living apart from `LieutenantController` under a related URL
//             family — this avoids a `SessionModule` ↔ `Loop10Module` cycle beyond the ONE the C5
//             governor already introduced, which `forwardRef` already resolves, `loop10.module.ts`).
//             — P3-A C6 — 2026-07-10
//
// `HlCardController` — the PLAYER-FACING commit/skip API for the computed HighestLeverageCard.
// PLAYER RESOLUTION: the SAME identity bridge as `SessionController`/`ExceptionsController` — the
// JwtAuthGuard verifies the bearer JWT (aud=GAME_BACK) and attaches `req.account`; we resolve
// account_id → player_id via the 1-1 Player↔Account link (NEVER the body, R-ID-3).

import { Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { HlCardService } from './hl-card.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HlCardController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly hlCards: HlCardService,
  ) {}

  /** `POST /v1/session/hl-card/:id/commit` — routes through the governor IFF catalogue-structural
   *  (design §8). Returns `{ committed: true, structural: bool }`. 404 not owned/found; 409 already
   *  terminal; 409 STRUCTURAL_CAP_EXHAUSTED (governor, structural branch only). */
  @Post('session/hl-card/:id/commit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async commit(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ committed: true; structural: boolean }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.hlCards.commit(playerId, id);
  }

  /** `POST /v1/session/hl-card/:id/skip` — carry semantics (design §8). Returns `{ skipped: true }`.
   *  404 not owned/found; 409 not `active` (already skipped/committed/superseded). */
  @Post('session/hl-card/:id/skip')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async skip(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ skipped: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.hlCards.skip(playerId, id);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge,
   *  VERBATIM `SessionController`/`ExceptionsController` pattern). 404 if none. */
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

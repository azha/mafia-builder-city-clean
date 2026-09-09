// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T6 (GET /v1/progression
//             — the player's vocab tier + a qualitative progress band, R2.2). Same JWT account→player bridge as the
//             exceptions/economy controllers.

import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { ProgressionRepository } from './progression.repository';
import { ProgressionProjectionService, type ProgressionView } from './progression.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ProgressionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: ProgressionRepository,
    private readonly projection: ProgressionProjectionService,
  ) {}

  /** `GET /v1/progression` — the requesting player's vocab tier + progress band (R2.2). Requires a PLAYER JWT. */
  @Get('progression')
  @UseGuards(JwtAuthGuard)
  async progression(@Req() req: RequestWithAccount): Promise<ProgressionView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.repo.ensureRow(playerId);
    const prog = await this.repo.getProgression(playerId);
    const handled = await this.repo.countHandledExceptions(playerId);
    return this.projection.project({ ...prog, handled });
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (verbatim the EconomyController bridge). 404 if none. */
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

// IMPLEMENTS: docs/tech/04_city_simulation/system_2_sparse_citizens.md §P5 (the player sees the aggregate
//             whisper distribution, never the raw whisper_pressure) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// `SparseCitizensController` — the PLAYER-FACING citizen whisper API: `GET /v1/city/citizens/whisper`.
//
// PLAYER RESOLUTION (same identity bridge as Flow Cells / GET /v1/me): the JwtAuthGuard verifies the bearer
// JWT and attaches `req.account` (account_id, kind — from verified claims, never the body — R-ID-3). The
// city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link
// (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// Handlers return plain `data`; the global EnvelopeInterceptor wraps it in a success ResponseEnvelope.

import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import {
  SparseCitizensProjectionService,
  type CitizenWhisperProjection,
} from './sparse_citizens.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class SparseCitizensController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: SparseCitizensProjectionService,
  ) {}

  /**
   * `GET /v1/city/citizens/whisper` — the requesting player's citizen whisper projection. P5 / R2.2
   * inverted: returns ONLY qualitative buckets — an overall `whisper_index` band (CALM/STIRRING/ALERT) +
   * a `whisper_state_distribution` keyed by the closed {DORMANT, ACTIVE} domain with magnitude bands —
   * NEVER raw whisper_pressure / satisfaction / counts / citizen ids. Requires a PLAYER JWT (JwtAuthGuard).
   */
  @Get('city/citizens/whisper')
  @UseGuards(JwtAuthGuard)
  async citizensWhisper(@Req() req: RequestWithAccount): Promise<CitizenWhisperProjection> {
    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return this.projection.projectWhisper(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). */
  private async resolvePlayerId(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}

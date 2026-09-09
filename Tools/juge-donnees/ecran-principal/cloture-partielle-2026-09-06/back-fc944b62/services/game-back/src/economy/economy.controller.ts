// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md §8.2 (the player wallet projection) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — bands only) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-04 (economy wallet-band projection) --
//
// `EconomyController` — the PLAYER-FACING M1 wallet API:
//   - GET /v1/economy/wallet → the player's qualitative clean-cash band (the dashboard screen_1 "encaisser" payoff).
//
// PLAYER RESOLUTION (the SAME identity bridge as the operational controllers / GET /v1/me): the JwtAuthGuard verifies
// the bearer JWT, enforces aud=GAME_BACK, and attaches `req.account` (account_id — from verified claims, never the
// body, R-ID-3). The wallet is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id, filtered to PLAYER accounts) — verbatim the PrecursorsController.resolvePlayerId bridge.
//
// The GET returns the qualitative projection (R2.2 — the band only); the global EnvelopeInterceptor wraps it in a
// success ResponseEnvelope.

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
import { EconomyProjectionService, type WalletProjection } from './economy.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class EconomyController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: EconomyProjectionService,
  ) {}

  /**
   * `GET /v1/economy/wallet` — the requesting player's wallet projection (§8.2): cash_cents (BigInt string,
   * R2.2-exempt — monetary balance is player-facing per §8.2 l.652) + the supplementary wallet_band qualitative label.
   * Requires a PLAYER JWT (GAME_BACK audience). A player with no economy_states row → RESOURCE_NOT_FOUND (404).
   * No token → 401 (the guard).
   */
  @Get('economy/wallet')
  @UseGuards(JwtAuthGuard)
  async wallet(@Req() req: RequestWithAccount): Promise<WalletProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectWallet(playerId);
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No wallet for this player.' });
    }
    return proj;
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

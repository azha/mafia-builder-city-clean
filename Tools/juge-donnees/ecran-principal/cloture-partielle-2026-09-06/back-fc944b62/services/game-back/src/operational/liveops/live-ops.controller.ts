// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C9 (R2.2 player surface)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §6 + 18 envelope/versioning
//             (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id).
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md :181,340
//             (qualitative-only, no countdown). % allowed-mention: design comment (R2.2 "no countdown" rule statement, not a countdown implementation)
//             Pattern mirror: operational/selling/selling.controller.ts (a PER-PLAYER qualitative
//             projection — JWT-resolved player_id, R2.2 bands only) — NOT
//             operational/political/political.controller.ts (that surface is CITY-GLOBAL, no player
//             resolution needed; live-ops is PLAYER-scoped by construction, D1).
//             — 04e-B C9 — 2026-07-06
//
// `LiveOpsController` — the PLAYER-FACING R2.2 read-only live-ops API:
//   GET /v1/liveops/active → the requesting player's currently-active live-ops events, qualitative
//   bands only (severity + effect direction + counter-play availability/hint — R2.2 grep-zero: no raw
//   scalar, no `ends_at`/countdown, no raw `cohort_key`, no raw `high_impact`, ever). % allowed-mention: design comment (R2.2 grep-zero rule statement, not a countdown implementation)
//
// PLAYER RESOLUTION (same identity bridge as SellingController / DistributionController / GET /v1/me):
// the JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified
// claims, never the body, R-ID-3). `LiveOpsEventReadService` is keyed by player_id, so we resolve
// account_id → player_id via the 1-1 Player↔Account link (player.account_id, filtered to PLAYER
// accounts) — unlike `PoliticalController`, this surface genuinely differs per player (D1 cohort
// targeting), so (unlike that city-global sibling) a JWT IS required here.
//
// The handler returns plain `data`; the global EnvelopeInterceptor wraps it in a ResponseEnvelope.

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
import { LiveOpsEventReadService, type LiveOpsPlayerSurfaceView } from './live-ops-read.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class LiveOpsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly readService: LiveOpsEventReadService,
  ) {}

  /**
   * `GET /v1/liveops/active` — the requesting player's currently-active live-ops events (catalogue.md
   * :181,340): `severity` (major/minor, derived from `highImpact` — NEVER the raw boolean), per-effect
   * `direction` (increases/decreases/adjusts — NEVER the raw magnitude), `counterPlayAvailable` +
   * `counterPlayHint` ("Content pending" today, D6). R2.2 grep-zero: no `ends_at`/`started_at`/
   * countdown, no raw `cohort_key`, ever. Requires a PLAYER JWT. % allowed-mention: design comment (R2.2 grep-zero rule statement, not a countdown implementation)
   */
  @Get('liveops/active')
  @UseGuards(JwtAuthGuard)
  async active(@Req() req: RequestWithAccount): Promise<LiveOpsPlayerSurfaceView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.readService.getActiveEventsForPlayer(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge,
   *  SellingController's own precedent verbatim). 404 if none. */
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

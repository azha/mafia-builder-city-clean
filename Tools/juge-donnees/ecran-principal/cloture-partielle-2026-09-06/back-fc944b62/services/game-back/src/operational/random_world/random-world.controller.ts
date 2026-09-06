// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (player controller)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §6.1
//             (GET /v1/random-world/active)
//             Controller pattern seam: `operational/ambient/ambient.controller.ts` (the SAME JwtAuthGuard
//             → account_id → player_id bridge idiom).
//             — 04g-B C2 — 2026-07-15
//
// `RandomWorldController` — the PLAYER-FACING RANDOM-WORLD API:
//   - GET /v1/random-world/active → the requesting player's `active` events, band-projected (R2.2).
//
// PLAYER RESOLUTION: the SAME identity bridge as `AmbientController`/`ExceptionsController` — JwtAuthGuard
// verifies the bearer JWT + attaches `req.account`; account_id → player_id via the 1-1 Player↔Account link.

import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import {
  RandomWorldProjectionService,
  type RandomWorldActiveEventView,
  type KnownCouplingView,
} from './random-world.projection.service';
import { RandomWorldEventRepository } from './random-world-event.repository';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RandomWorldController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: RandomWorldProjectionService,
    private readonly repo: RandomWorldEventRepository,
  ) {}

  /**
   * `GET /v1/random-world/active` — the requesting player's `active` RANDOM-WORLD events in districts
   * they own ≥1 building in, band-projected (R2.2 — no raw scalar; design §6.1). A player with no owned
   * buildings → an empty list. No token → 401 (the guard).
   */
  @Get('random-world/active')
  @UseGuards(JwtAuthGuard)
  async active(@Req() req: RequestWithAccount): Promise<{ events: RandomWorldActiveEventView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.listActive(playerId);
  }

  /**
   * `GET /v1/random-world/known-couplings` (design §6.1, C3) — the requesting player's FULL
   * "known-dependencies overlay": every `TightCouplingPair` they have EVER discovered (permanent,
   * "never forgotten" — design §4.2), band-projected (R2.2 — pair existence + recency only, never the
   * probability nor the condition). A player who has discovered nothing → an empty list.
   */
  @Get('random-world/known-couplings')
  @UseGuards(JwtAuthGuard)
  async knownCouplings(@Req() req: RequestWithAccount): Promise<{ couplings: KnownCouplingView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.listKnownCouplings(playerId);
  }

  /**
   * `POST /v1/random-world/hollow/:eventId/attend-funeral` (design §3.5.4/§6.1, C4 — S18 = the C0-
   * resolved D8 fallback: no clean day-scoped lieutenant availability seam exists — see
   * `random-world-event-generator.service.ts`'s `activateHollow`/`applyHollowClosures` for the runtime
   * side of this template). Response is QUALITATIVE ONLY (R2.2 — never the numeric bonus, never a raw
   * scalar): `{ event_id, status: 'attended' }`.
   *
   * // TD: funeral lieutenant-cost not wired (no clean day-scoped availability seam —
   * // settling_until_tick/aversion_cooldown are neighbor mechanics, D8 forbids repurposing them;
   * // C0 re-anchor §2, `2026-07-15-04g-B-C0-reanchor.md`). Ship SANS coût matériel — the bonus still
   * // BITES at fork closure (`applyHollowClosures`'s own `p = base + hollow_funeral_reweave_bonus`).
   *
   * 404 (`RESOURCE_NOT_FOUND`): the event does not exist, or is not a `hollow_at_the_corner` event.
   * 409 (`RESOURCE_STATE_CONFLICT`, a 4xx — design AC3's own "409/no-op" for the double-post AND the
   * generic "4xx" for a post on an expired/resolved event, mirrors `AmbientAttendService`'s own single
   * "already attended / expired / lost race" → 409 posture): the player already attended, OR the event
   * is no longer `active` (its 5-week window already closed).
   */
  @Post('random-world/hollow/:eventId/attend-funeral')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async attendFuneral(
    @Req() req: RequestWithAccount,
    @Param('eventId', UuidParam) eventId: string,
  ): Promise<{ event_id: string; status: 'attended' }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const claim = await this.repo.claimFuneralAttendance(eventId, playerId);
    if (claim.ok) {
      return { event_id: eventId, status: 'attended' };
    }

    const reason = await this.repo.classifyFuneralAttendanceFailure(eventId, playerId);
    if (reason === 'not_found' || reason === 'wrong_template') {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No hollow_at_the_corner event ${eventId}.` });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', {
      message:
        reason === 'already_attended'
          ? `Player already attended the funeral for event ${eventId}.`
          : `Event ${eventId} is no longer active (resolved/expired) — the funeral window is closed.`,
    });
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link. 404 if none. */
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

// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6
//             (`POST /v1/compression/defer`)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §9.2/§15.
//             Pattern: `DecommissionController`/`ReplacementOptionController` (the `resolvePlayerId`
//             account->player bridge, VERBATIM — no shared extraction across controllers).
//             — P3-E C6 — 2026-07-17
//
// `CompressionController` — `POST /v1/compression/defer` only, this chunk (`GET /v1/compression/state` +
// `POST /v1/compression/engage` + the board endpoints are C7/C8 scope, plan §C6 boundary). No governor
// wrap — deferral is Loop 9 cycle bookkeeping, not a Loop 10 structural decision (design never lists it
// among the governed verbs).

import { Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { CompressionDeferService } from './compression-defer.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CompressionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly defer: CompressionDeferService,
  ) {}

  /**
   * `POST /v1/compression/defer` (§9.2/§15) — the ★#5 single-use deferral. 404 `RESOURCE_NOT_FOUND` if no
   * non-terminal compression cycle is open for this player; 409 `DEFERRAL_EXHAUSTED` if this cycle already
   * used its one deferral; 409 `FORCED_ENGAGEMENT` if `org_stress` is at/above the force-engagement
   * threshold (no deferral possible at that point). Response `{ deferred: true }` (R2.2).
   */
  @Post('compression/defer')
  @HttpCode(200) // a state mutation on an existing cycle (not a resource creation).
  @UseGuards(JwtAuthGuard)
  async deferCycle(@Req() req: RequestWithAccount): Promise<{ deferred: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.defer.defer(playerId);
  }

  /** account_id → player_id bridge (VERBATIM every sibling controller's own per-controller helper). */
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

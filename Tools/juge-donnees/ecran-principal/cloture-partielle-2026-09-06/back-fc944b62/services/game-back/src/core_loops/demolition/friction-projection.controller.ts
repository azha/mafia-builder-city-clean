// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 (`GET /v1/
//             friction/state` + `GET /v1/friction/nodes/:buildingId` — the §15 player projections).
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15/§6.1.
//             Pattern: `DecommissionController`/`ReplacementOptionController` (the `resolvePlayerId`
//             account->player bridge, VERBATIM — no shared extraction across controllers).
//             — P3-E C8 — 2026-07-18
//
// `FrictionProjectionController` — the 2 player-facing GET routes design §15 names for Loop 8 that no
// earlier chunk realized (C2 realized `frictionLoadBucket` itself but left it UNUSED until this wire-up;
// C4/C5 own the decommission/pick verbs, not this panel).

import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
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
import { FrictionProjectionService, type FrictionNodePanelView, type FrictionStateView } from './friction-projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class FrictionProjectionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: FrictionProjectionService,
  ) {}

  /** `GET /v1/friction/state` (design §15) — the org-wide friction glance: `{friction_bucket,
   *  penalty_active, friction_node_count}` (R2.2 — never the raw total/threshold). */
  @Get('friction/state')
  @UseGuards(JwtAuthGuard)
  async getState(@Req() req: RequestWithAccount): Promise<FrictionStateView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.getState(playerId);
  }

  /** `GET /v1/friction/nodes/:buildingId` (design §6.1 step 1) — the 4 panel buckets + `neighbor_count`.
   *  404 if not this player's own §4.1 périmètre node. */
  @Get('friction/nodes/:buildingId')
  @UseGuards(JwtAuthGuard)
  async getNodePanel(@Param('buildingId', UuidParam) buildingId: string, @Req() req: RequestWithAccount): Promise<FrictionNodePanelView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.getNodePanel(playerId, buildingId);
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

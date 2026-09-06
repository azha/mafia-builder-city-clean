// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C7 ("GET /v1/annealing/
//             rolling-queue").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §10.3 + §15.2 ("GET
//             /v1/annealing/rolling-queue (§10.3). Le détail d'un node settling (tap) est DANS la réponse
//             ... pas d'endpoint par node séparé v1.").
//             Decisions: §1.13 D13 (house-style `/v1/annealing/*`, vs screen_8 `/v1/me/…`).
//             Pattern (PLAYER RESOLUTION): `cue-stack.controller.ts#resolvePlayerId` — the account_id→
//             player_id bridge VERBATIM, the SAME per-controller helper every sibling controller in this
//             codebase carries (no shared extraction).
//             — P3-D C7 — 2026-07-15
//
// `AnnealingController` — the FIRST player-facing Loop 7 route (C6 shipped ONLY the `_test` controller).
// READ-ONLY (design §10.3 — a projection, never a write).

import { Controller, Get, Inject, UseGuards, Req } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { AnnealingRollingQueueService, type RollingQueueView } from './annealing-rolling-queue.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class AnnealingController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly rollingQueue: AnnealingRollingQueueService,
  ) {}

  /**
   * `GET /v1/annealing/rolling-queue` (design §10.3/§15.2) — the unified projection: settling buildings
   * (bands + initiating change type), touchable (non-settling) buildings, and Phase-11 lieutenants
   * currently settling (bands, read-only). Never a raw scalar/timestamp (R2.2/P5 — bands only throughout).
   */
  @Get('annealing/rolling-queue')
  @UseGuards(JwtAuthGuard)
  async getRollingQueue(@Req() req: RequestWithAccount): Promise<RollingQueueView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.rollingQueue.getRollingQueue(playerId);
  }

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

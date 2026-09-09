// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C4 ("`GET /v1/meta/complexity-
//             budget` (`{cap, free_units, delegation_hints}` — design §10.2)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §10.2 (the
//             contract) + §13 (`POST`/`GET` player endpoints).
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §6 (R7 — sibling
//             controller shape; `HorizonFeedController` is C3's own precedent instance of this same
//             recommendation for a player-facing `/v1/meta/*` route).
//             Pattern (player identity bridge, `resolvePlayerId` duplicated per-controller — this
//             codebase's own established convention): `horizon-feed.controller.ts#resolvePlayerId`
//             (copied verbatim).
//             — P3-G C4 — 2026-07-20
//
// `ComplexityBudgetController` — the PLAYER-FACING Complexity Budget API (`GET /v1/meta/complexity-
// budget`), a SIBLING controller inside `BudgetsHorizonModule` (mirrors `HorizonFeedController`'s own
// C3 shape — one controller per resource domain, never an extension of `MetaProgressionController`).

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
import { BudgetRecomputeService, type ComplexityBudgetProjection } from './budget-recompute.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ComplexityBudgetController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly budgetRecompute: BudgetRecomputeService,
  ) {}

  /**
   * `GET /v1/meta/complexity-budget` — the requesting player's complexity-budget projection (design
   * §10.2). `used` is recomputed FRESH on every call (`BudgetRecomputeService.getProjection`'s own header
   * — never a stale-column read). Requires a PLAYER JWT (no token -> 401). RESPONSE SHAPE: `payload.data =
   * {cap, free_units, delegation_hints}` (a flat object, mirrors `GET /v1/meta/complexity-budget`'s own
   * design §10.2 contract verbatim — no wrapper key, unlike the list-endpoint `{cards: [...]}` convention
   * `HorizonFeedController` uses for an array payload).
   */
  @Get('meta/complexity-budget')
  @UseGuards(JwtAuthGuard)
  async budget(@Req() req: RequestWithAccount): Promise<ComplexityBudgetProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.budgetRecompute.getProjection(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (copied verbatim from
   *  `horizon-feed.controller.ts`'s own established idiom, this codebase's per-controller convention,
   *  never a shared helper). 404 if none. */
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

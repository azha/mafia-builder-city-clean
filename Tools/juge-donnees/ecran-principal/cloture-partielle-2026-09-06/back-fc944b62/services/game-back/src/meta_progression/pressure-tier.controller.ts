// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C5 ("`DecisionLoadTierComposite`
//             projection + `GET /v1/meta/pressure`").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §10 (`GET /v1/meta/
//             pressure` — "the `DecisionLoadIndicator` contract (canon-sanctioned numeric surface:
//             `decisions_remaining`, the tier chip)").
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §15/R14 ("player routes:
//             ... every `meta/*` path segment is a PER-HANDLER decorator" — the SAME convention followed
//             here).
//             Pattern (player identity bridge `resolvePlayerId`, duplicated per-controller — this
//             codebase's own established convention, NEVER a shared helper): `execution-plan.controller.ts
//             #resolvePlayerId` / `horizon-tier-advancement.controller.ts#resolvePlayerId` (copied
//             verbatim).
//             — P3-H C5 — 2026-07-24
//
// `PressureTierController` — the PLAYER-FACING `GET /v1/meta/pressure` route (design §10), a SIBLING
// controller inside `VerticalHorizonModule` (mirrors `HorizonTierAdvancementController`'s own "a DIFFERENT
// base path gets its OWN controller file" posture — this one shares the `/v1/meta/` prefix with `GET /v1/
// meta/horizon/*` but is its OWN concern, `pressure` not `horizon`). Requires a PLAYER JWT. Always
// registered (a real player surface).

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
import { PressureTierService, type PressureProjection } from './pressure-tier.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PressureTierController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly pressureTier: PressureTierService,
  ) {}

  /**
   * `GET /v1/meta/pressure` — the `DecisionLoadTierComposite` projection (design §8/§10): `{pressure_tier,
   * decisions_remaining, decisions_this_session_display, observation_remaining_h?}`. `decisions_remaining`
   * is the REAL enforced budget (cap − used, ★H-1 Option B — the T4-window-aware getter); `decisions_this_
   * session_display` is the NON-enforced 12/8/4/2 cadence for the caller's CURRENT `pressure_tier`
   * (divergence #3 — a DIFFERENT axis, never the enforced value). Requires a PLAYER JWT.
   */
  @Get('meta/pressure')
  @UseGuards(JwtAuthGuard)
  async getPressure(@Req() req: RequestWithAccount): Promise<PressureProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.pressureTier.getProjection(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (copied verbatim from
   *  `execution-plan.controller.ts`/`horizon-tier-advancement.controller.ts`'s own established idiom, this
   *  codebase's per-controller convention, never a shared helper). 404 if none. */
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

// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C8 ("`GET /v1/meta/
//             capability-debts` visibility-threshold projection (design §12.4)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.4 (bucket-only,
//             threshold-filtered) + §13 ("`GET /v1/meta/capability-debts` (§12.4) — visible buckets only").
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §6 (R7 — sibling
//             controller shape; `HorizonFeedController`/`ComplexityBudgetController` are C3/C4's own
//             precedent instances of this same recommendation for a player-facing `/v1/meta/*` route).
//             Pattern (player identity bridge, `resolvePlayerId` duplicated per-controller — this
//             codebase's own established convention): `complexity-budget.controller.ts#resolvePlayerId`
//             (copied verbatim).
//             — P3-G C8 — 2026-07-23
//
// `CapabilityDebtsController` — the PLAYER-FACING Isostatic Debt API (`GET /v1/meta/capability-debts`), a
// SIBLING controller inside `BudgetsHorizonModule` (mirrors `HorizonFeedController`/`ComplexityBudgetController`'s
// own C3/C4 shape — one controller per resource domain, never an extension of `MetaProgressionController`).

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
import { IsostaticDebtService, type CapabilityDebtProjectionRow } from './isostatic-debt.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CapabilityDebtsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly isostaticDebt: IsostaticDebtService,
  ) {}

  /**
   * `GET /v1/meta/capability-debts` — the requesting player's visible Isostatic Debt bands (design
   * §12.4/§13). Rows with `structural_debt < meta.debt_visibility_threshold` are ABSENT (sub-threshold
   * debt exists, decays, and is invisible by construction — canon P5; PRESENT in the C10 admin read).
   * Requires a PLAYER JWT (no token → 401). RESPONSE SHAPE: `payload.data = { debts:
   * CapabilityDebtProjectionRow[] }` (a NAMED object field under the envelope's `data`, mirrors `GET
   * /v1/meta/horizon-feed`'s own `{ cards: [...] }` list-endpoint convention). Each row is EXACTLY
   * `{capability_key, debt_bucket}` — bucket, never a number (ALLOWED_KEYS).
   */
  @Get('meta/capability-debts')
  @UseGuards(JwtAuthGuard)
  async debts(@Req() req: RequestWithAccount): Promise<{ debts: CapabilityDebtProjectionRow[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const debts = await this.isostaticDebt.getDebtProjection(playerId);
    return { debts };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (copied verbatim from
   *  `complexity-budget.controller.ts`'s own established idiom, this codebase's per-controller
   *  convention, never a shared helper). 404 if none. */
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

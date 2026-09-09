// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C2 (player endpoints
//             POST /v1/flag-review/:flagId/validate|dismiss)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §4/§8 (verdict
//             endpoints — R2.2 response shape bands/booleans only, no raw internals).
//             Pattern: `exceptions.controller.ts` — the SAME identity bridge (JwtAuthGuard ->
//             req.account.account_id -> player_id via the 1-1 Player<->Account link, R-ID-3), the SAME
//             global IdempotencyInterceptor pass-through (no explicit `@Idempotent` — mirrors `resolve`'s
//             own unmarked-route posture; the Idempotency-Key header is honored REGARDLESS since the
//             interceptor is registered APP_INTERCEPTOR in app.module.ts, R-ID convention REUSE).
//             — P3-B C2 — 2026-07-11
//
// `FlagDisciplineController` — the PLAYER-FACING verdict API (D10):
//   - POST /v1/flag-review/:flagId/validate  -> token returned.
//   - POST /v1/flag-review/:flagId/dismiss   -> net-token-delta penalty (sub-decision #2).
//
// Both 200 on success (the flag row is mutated in place, never created); 404 not owned; 409 already
// resolved (the `resolveFlagTransition` atomic arbiter — the concurrency gate: double-validate ->
// exactly one 200 + one 409). Response = `{ resolved: true, verdict, token_returned }` — R2.2: qualitative
// only, no raw token count ever leaves this controller.
//
// P3-B C6 ADDS the daily review surface (design §8, D11/D12):
//   - GET /v1/flag-review -> the PENDING flag cards (R2.2-projected) + the unflagged-pending summary.
//   - POST /v1/flag-review/batch-confirm -> confirms every unflagged pending item; NO reward (D13).

import { Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
  FlagDisciplineService,
  type FlagVerdictResult,
  type FlagReviewResponse,
  type BatchConfirmResult,
} from './flag-discipline.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class FlagDisciplineController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly flagDiscipline: FlagDisciplineService,
  ) {}

  /** `POST /v1/flag-review/:flagId/validate` — see file header. */
  @Post('flag-review/:flagId/validate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async validate(@Param('flagId', UuidParam) flagId: string, @Req() req: RequestWithAccount): Promise<FlagVerdictResult> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.flagDiscipline.validateFlag(playerId, String(flagId ?? ''));
  }

  /** `POST /v1/flag-review/:flagId/dismiss` — see file header. */
  @Post('flag-review/:flagId/dismiss')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async dismiss(@Param('flagId', UuidParam) flagId: string, @Req() req: RequestWithAccount): Promise<FlagVerdictResult> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.flagDiscipline.dismissFlag(playerId, String(flagId ?? ''));
  }

  /** `GET /v1/flag-review` — the daily review surface (design §8, D11/D12). See file header. */
  @Get('flag-review')
  @UseGuards(JwtAuthGuard)
  async flagReview(@Req() req: RequestWithAccount): Promise<FlagReviewResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.flagDiscipline.listReviewCards(playerId);
  }

  /** `POST /v1/flag-review/batch-confirm` — confirms every unflagged pending routine item; NO reward
   *  (D13). See file header. */
  @Post('flag-review/batch-confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async batchConfirm(@Req() req: RequestWithAccount): Promise<BatchConfirmResult> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.flagDiscipline.batchConfirm(playerId);
  }

  /** Resolve account_id -> player_id via the 1-1 Player<->Account link (the GET /v1/me / ExceptionsController
   *  identity bridge, verbatim). 404 if none. */
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

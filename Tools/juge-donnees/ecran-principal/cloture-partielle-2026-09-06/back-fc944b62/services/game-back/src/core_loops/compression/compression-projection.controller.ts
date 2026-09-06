// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 (`GET /v1/
//             compression/state` — deferred by C7's own `compression-board.controller.ts` header: "out of
//             THIS chunk's scope").
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15
//             (`GET /v1/compression/state` = `{stress_bucket, week_state, deferral_available: bool}`).
//             Pattern: `CompressionController`/`CompressionBoardController` (the SAME `resolvePlayerId`
//             account->player bridge, VERBATIM). NOT merged into either C6/C7 file — a SEPARATE
//             controller keeps this C8 endpoint additive, zero touch to either.
//             — P3-E C8 — 2026-07-18

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
import { coreLoopsTunables } from '../core-loops-tunables';
import { CompressionWeekRepository } from './compression-week.repository';
import { stressBucket, type StressBucket } from './stress-bucket';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CompressionProjectionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly compressionRepo: CompressionWeekRepository,
  ) {}

  /** `GET /v1/compression/state` (design §15) — `{stress_bucket, week_state, deferral_available}` (R2.2
   *  — never the raw `org_stress`). `week_state` is the `compression_week_state` ENUM value itself
   *  ('none'|'warning'|'active') — an already-qualitative 3-value phase marker, not a scalar (mirrors the
   *  `GET /v1/compression/board` precedent's own `tier`/`state` string surfacing). */
  @Get('compression/state')
  @UseGuards(JwtAuthGuard)
  async getState(@Req() req: RequestWithAccount): Promise<{ stress_bucket: StressBucket; week_state: string; deferral_available: boolean }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const { orgStress, weekState, deferralAvailable } = await this.compressionRepo.getStateProjection(
      playerId,
      coreLoopsTunables.compressionForceEngagementThreshold,
    );
    const bucket = stressBucket(orgStress, weekState, coreLoopsTunables.compressionStressBucketCalmUpperBound, coreLoopsTunables.compressionStressThresholdTrigger);
    return { stress_bucket: bucket, week_state: weekState, deferral_available: deferralAvailable };
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

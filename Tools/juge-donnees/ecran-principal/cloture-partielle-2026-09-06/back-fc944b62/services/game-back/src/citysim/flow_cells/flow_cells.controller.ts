// IMPLEMENTS: docs/tech/04_city_simulation/system_1_flow_cells.md §P5 (player sees the qualitative bucket,
//             never λ/μ/ρ) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account)
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// `FlowCellsController` — the PLAYER-FACING flow API: `GET /v1/city/district/:id/flow`.
//
// PLAYER RESOLUTION (documented decision): the JwtAuthGuard verifies the bearer JWT and attaches
// `req.account` (account_id, kind — derived ONLY from verified claims, never the body — R-ID-3). The city
// sim is keyed by player_id, NOT account_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id UNIQUE — schema_player.md §6). This is the SAME identity bridge GET /v1/me uses
// (auth.service.projectPlayer joins account→player); we resolve to the player_id (the city-sim key) here.
// This is the cleanest option given the existing code: the test harness identifies players by player_id, and
// authenticated player endpoints identify the caller by their JWT → account_id → player_id. T3–T12 copy this.
//
// Handlers return plain `data`; the global EnvelopeInterceptor wraps it in a success ResponseEnvelope.

import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { IntParam } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { FlowCellsService } from './flow_cells.service';
import {
  FlowCellsProjectionService,
  type DistrictFlowProjection,
} from './flow_cells.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class FlowCellsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly flowCells: FlowCellsService,
    private readonly projection: FlowCellsProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/flow` — the per-district flow backpressure bucket for the requesting player.
   * P5 / R2.2 inverted: returns ONLY the qualitative `backpressure` bucket (NORMAL/CONGESTED/SATURATED) +
   * the echoed district id — never ρ/λ/μ/population/counts. Requires a PLAYER JWT (JwtAuthGuard).
   */
  @Get('city/district/:id/flow')
  @UseGuards(JwtAuthGuard)
  async districtFlow(
    // Dv10/Dv9 (D5) — the canon's own ParseIntPipe (400 JSON_PARSE_ERROR) is REPLACED by IntParam (422
    // VALIDATION_FAILED + details.param, int4-bounded) — this is the one @Param the design names by
    // symbol as the Nest-pipe-to-house-pipe swap. Dv9: a garbage/out-of-int4 id now 422s BEFORE
    // `hasDistrict` runs, so this route's 404-on-huge-id (measured pre-C1) becomes 422 — no decision
    // ever wrote "garbage → 404" for this route (allowlist (3) does not name it).
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictFlowProjection> {
    // 404 for an unknown district BEFORE resolving the player (the projection only serves seeded geography).
    if (!this.flowCells.hasDistrict(districtId)) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such district.' });
    }
    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      // A valid GAME_BACK token whose account has no player row (should not happen for a PLAYER token).
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return this.projection.projectDistrictFlow(playerId, districtId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). */
  private async resolvePlayerId(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}

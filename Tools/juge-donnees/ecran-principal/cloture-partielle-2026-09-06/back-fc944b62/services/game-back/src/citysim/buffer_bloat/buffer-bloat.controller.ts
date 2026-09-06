// IMPLEMENTS: docs/tech/04_city_simulation/system_10_buffer_bloat.md §Player interaction surface
//             (pipeline node BufferLoadBucket badge + tail-risk panel TailPercentileState band + overflow "cash
//              exposé" badge ; jamais current_occupancy / tail_p95 / overflow_amount / cash bruts — Inv 3/5/7 /
//              R2.2) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// `BufferBloatController` — the PLAYER-FACING district-buffer API: `GET /v1/city/district/:id/buffer`.
//
// PLAYER RESOLUTION (same identity bridge as the other city-sim controllers / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body —
// R-ID-3). The city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the per-district buffer-load band +
// tail-risk band + the tail-risk-panel-visible default + a district-summary overflow flag + per-node
// BufferLoadBucket / TailPercentileState / overflow (Inv 3/5/7 / R2.2 — see the projection header) — NEVER the raw
// current_occupancy float, the tail_p95_estimate float, the overflow_amount cash, or the drain_rate.
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
import { BufferBloatService } from './buffer-bloat.service';
import {
  BufferBloatProjectionService,
  type DistrictBufferProjection,
} from './buffer-bloat.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class BufferBloatController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly buffer: BufferBloatService,
    private readonly projection: BufferBloatProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/buffer` — the requesting player's qualitative buffer/tail-risk read for a district.
   * Inv 3/5/7 / R2.2: returns the per-district buffer-load band + tail-risk band + the tail-risk-panel-visible
   * default + a district-summary overflow flag + per-node BufferLoadBucket / TailPercentileState / overflow flag —
   * NEVER the raw current_occupancy float, the tail_p95_estimate float, the overflow_amount cash, or the drain_rate.
   * Requires a PLAYER JWT (JwtAuthGuard). A district id outside 1..18 → VALIDATION error; a non-existent district →
   * RESOURCE_NOT_FOUND. A valid, existing district with no nodes returns an EMPTY per-district payload
   * ({ district_load_band: 'EMPTY', district_tail_band: 'LOW', nodes: [] }) — the organic Phase-1 shape (nodes are P2).
   */
  @Get('city/district/:id/buffer')
  @UseGuards(JwtAuthGuard)
  async districtBuffer(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictBufferProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.buffer.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    if (!(await this.buffer.districtExists(districtId))) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such district (${districtId}).` });
    }

    return this.projection.projectDistrict(playerId, districtId);
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

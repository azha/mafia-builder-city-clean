// IMPLEMENTS: docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Player interaction surface
//             (pipeline diagram: ThroughputBucket input-rate + CleanlinessBucket output + overflow badge ;
//              Speed/Volume/Exposure widget: the exposure band ; jamais les floats bruts ni le raw cash ni
//              inventory_at_risk_global — Inv 5 / Inv 6 / R2.2) + 18 envelope/versioning (/v1, ResponseEnvelope) +
//             17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// `DwellTimeController` — the PLAYER-FACING district-throughput API: `GET /v1/city/district/:id/throughput`.
//
// PLAYER RESOLUTION (same identity bridge as the other city-sim controllers / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body —
// R-ID-3). The city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the per-district network exposure
// band + network-cleanliness band + per-node ThroughputBucket / CleanlinessBucket / overflow (Inv 5 / Inv 6 /
// R2.2 — see the projection header) — NEVER the raw throughput/dwell/cleanliness floats, the raw buffer_load, the
// raw cash, or inventory_at_risk_global.
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
import { DwellTimeService } from './dwell-time.service';
import {
  DwellTimeProjectionService,
  type DistrictThroughputProjection,
} from './dwell-time.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DwellTimeController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly dwell: DwellTimeService,
    private readonly projection: DwellTimeProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/throughput` — the requesting player's qualitative throughput/pipeline read for a
   * district. Inv 5 / Inv 6 / R2.2: returns the per-district network exposure band + network-cleanliness band +
   * per-node ThroughputBucket / CleanlinessBucket / overflow flag — NEVER the raw throughput/dwell/cleanliness
   * floats, the raw cash, or inventory_at_risk_global. Requires a PLAYER JWT (JwtAuthGuard). A district id outside
   * 1..18 → VALIDATION error; a non-existent district → RESOURCE_NOT_FOUND. A valid, existing district with no
   * laundering nodes returns an EMPTY per-district payload ({ exposure_band: 'MINIMAL', nodes: [] }) — the organic
   * Phase-1 shape (laundering nodes are P2).
   */
  @Get('city/district/:id/throughput')
  @UseGuards(JwtAuthGuard)
  async districtThroughput(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictThroughputProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.dwell.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    if (!(await this.dwell.districtExists(districtId))) {
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

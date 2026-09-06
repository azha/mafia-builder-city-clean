// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Player interaction surface
//             (heat map overlay = HeatBucket badge per building + district + citywide; jamais heat_value_internal /
//              decay_factor / threshold — Inv 1/2/7 / R2.2) + 18 envelope/versioning (/v1, ResponseEnvelope) +
//             17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatController` — the PLAYER-FACING district-heat API: `GET /v1/city/district/:id/heat`.
//
// PLAYER RESOLUTION (same identity bridge as the other city-sim controllers / GET /v1/me): the JwtAuthGuard verifies
// the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body — R-ID-3). The
// city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link
// (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the per-district HeatBucket + the
// citywide aggregate HeatBucket + the district escalation flag + per-building HeatBucket (Inv 1/2/7 / R2.2 — see the
// projection header) — NEVER the raw buildings.heat float, the decay factor, the propagation factor, or the
// escalation threshold. Heat is a cross-system SIGNAL surfaced as a qualitative overlay, not an HP bar.
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
import { HeatPropagationService } from './heat-propagation.service';
import { HeatProjectionService, type DistrictHeatProjection } from './heat.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HeatController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly heat: HeatPropagationService,
    private readonly projection: HeatProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/heat` — the requesting player's qualitative heat overlay for a district. Inv 1/2/7 /
   * R2.2: returns the per-district HeatBucket + the citywide aggregate HeatBucket + the district escalation flag +
   * per-building HeatBucket — NEVER the raw buildings.heat float, the decay factor, or the escalation threshold.
   * Requires a PLAYER JWT (JwtAuthGuard). A district id outside 1..18 → VALIDATION error. A valid district with no
   * buildings returns a COLD empty per-district payload ({ district_bucket: 'COLD', buildings: [] }) — the organic
   * Phase-1 shape (buildings are P2).
   */
  @Get('city/district/:id/heat')
  @UseGuards(JwtAuthGuard)
  async districtHeat(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictHeatProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.heat.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
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

// IMPLEMENTS: docs/tech/04_city_simulation/system_5_cohesion_permafrost.md §Player interaction surface
//             (district overview: état qualitatif STABLE/FRAGILE/THAWED + flag "Permanent marginal" — Inv 7
//              player-direct read, reconciled with R2.2: the qualitative band + flag, never the raw float) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// `CohesionPermafrostController` — the PLAYER-FACING district-cohesion API: `GET /v1/city/district/:id/cohesion`.
//
// PLAYER RESOLUTION (same identity bridge as Flow Cells / Sparse Citizens / Police Memory / Patrol / GET
// /v1/me): the JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from
// verified claims, never the body — R-ID-3). The city sim is keyed by player_id, so we resolve account_id →
// player_id via the 1-1 Player↔Account link (player.account_id UNIQUE — schema_player.md §6), filtered to
// PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the qualitative CohesionState
// band + the permanent_marginal flag (Inv 7 reconciled with R2.2 — see the projection header) — NEVER the raw
// cohesion [0,1] float or the raw thaw_threshold_current.
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
import { CohesionPermafrostService } from './cohesion.service';
import {
  CohesionPermafrostProjectionService,
  type DistrictCohesionProjection,
} from './cohesion.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CohesionPermafrostController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly cohesion: CohesionPermafrostService,
    private readonly projection: CohesionPermafrostProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/cohesion` — the requesting player's qualitative cohesion state for a district.
   * Inv 7 reconciled with R2.2: returns the qualitative `cohesion_state` band (STABLE/FRAGILE/THAWED) + the
   * `permanent_marginal` boolean — NEVER the raw cohesion [0,1] float or the raw thaw_threshold_current.
   * Requires a PLAYER JWT (JwtAuthGuard). A district id outside 1..18 → VALIDATION error; a district with no
   * seeded cohesion row (player never ticked nightly) → RESOURCE_NOT_FOUND.
   */
  @Get('city/district/:id/cohesion')
  @UseGuards(JwtAuthGuard)
  async districtCohesion(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictCohesionProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.cohesion.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    const state = await this.projection.projectDistrict(playerId, districtId);
    if (state === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'No district cohesion for this player yet (the city sim has not ticked nightly).',
      });
    }
    return state;
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

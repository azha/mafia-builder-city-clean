// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md §Invariant 6/7 + §Player interaction surface
//             (LekControlState + score band + contest band + presence buckets ; jamais lek_score/contest_pressure
//             brut) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekController` — the PLAYER-FACING district-lek API: `GET /v1/city/district/:id/leks`.
//
// PLAYER RESOLUTION (same identity bridge as Flow Cells / Cohesion / Inspection / Buffer Bloat / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never
// the body — R-ID-3). The city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the district's ACTIVE leks as
// qualitative entries — LekControlState (Inv 6) + a score-intensity band + a contest-pressure band + presence
// buckets (Inv 7) — NEVER the raw lek_score / contest_pressure / deals_this_week int (R2.2). A quiet district with
// no leks projects an empty `leks` list (sparse storage — no pre-seeded rows).
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
import { DealLekService } from './deal-lek.service';
import { DealLekProjectionService, type LekDistrictProjection } from './deal-lek.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DealLekController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly deals: DealLekService,
    private readonly projection: DealLekProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/leks` — the requesting player's qualitative lek overlay for a district. Inv 6/7 /
   * R2.2: returns ONLY the active leks' LekControlState + score band + contest band + presence buckets — NEVER the
   * raw lek_score / contest_pressure / deals_this_week int. Requires a PLAYER JWT (JwtAuthGuard). A district id
   * outside 1..18 → VALIDATION error. A fresh player with no leks → an empty `leks` list (sparse storage — never a
   * 404; the district always exists, the lek set is just empty until flow congestion forms one).
   */
  @Get('city/district/:id/leks')
  @UseGuards(JwtAuthGuard)
  async districtLeks(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<LekDistrictProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.deals.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    // The district always exists (1..18); a player with no leks projects an empty list (sparse storage).
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

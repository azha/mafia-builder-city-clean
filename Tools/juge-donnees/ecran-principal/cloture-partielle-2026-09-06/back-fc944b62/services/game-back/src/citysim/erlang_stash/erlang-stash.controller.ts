// IMPLEMENTS: docs/tech/04_city_simulation/system_9_erlang_stash.md §Player interaction surface
//             (Safehouse detail screen: StashLoadBucket load indicator + Erlang-B curve widget qualitative band +
//              open-parcels warning ; jamais blocking_probability brut ni arrival_rate λ ni current_fill exact ni
//              cash — Inv 1/2/5 / R2.2) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard
//             (req.account → player_id)
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// `ErlangStashController` — the PLAYER-FACING district-stash API: `GET /v1/city/district/:id/stash`.
//
// PLAYER RESOLUTION (same identity bridge as the other city-sim controllers / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body —
// R-ID-3). The city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the per-district blocking-pressure
// band + district-summary alert flag + per-safehouse StashLoadBucket / StashBlockingBand / alert (Inv 1/2/5 /
// R2.2 — see the projection header) — NEVER the raw blocking_probability float, the per-slot current_fill, the
// arrival_rate λ, or the slot_capacity cash.
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
import { ErlangStashService } from './erlang-stash.service';
import {
  ErlangStashProjectionService,
  type DistrictStashProjection,
} from './erlang-stash.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ErlangStashController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly stash: ErlangStashService,
    private readonly projection: ErlangStashProjectionService,
  ) {}

  /**
   * `GET /v1/city/district/:id/stash` — the requesting player's qualitative stash/blocking read for a district.
   * Inv 1/2/5 / R2.2: returns the per-district blocking-pressure band + district-summary alert flag + per-safehouse
   * StashLoadBucket / StashBlockingBand / alert flag — NEVER the raw blocking_probability float, the per-slot
   * current_fill, the arrival_rate λ, or the slot_capacity cash. Requires a PLAYER JWT (JwtAuthGuard). A district id
   * outside 1..18 → VALIDATION error; a non-existent district → RESOURCE_NOT_FOUND. A valid, existing district with
   * no safehouses returns an EMPTY per-district payload ({ district_blocking_band: 'LOW', safehouses: [] }) — a
   * genuinely ongoing per-district case (a given district can host none of this player's stashes), not a claim
   * that safehouses themselves are unbuilt: LOT PLANQUE gave `safehouses` its first application writer, and a
   * fresh player's welcome grant seeds one.
   */
  @Get('city/district/:id/stash')
  @UseGuards(JwtAuthGuard)
  async districtStash(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<DistrictStashProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.stash.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    if (!(await this.stash.districtExists(districtId))) {
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

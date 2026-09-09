// IMPLEMENTS: docs/tech/04_city_simulation/system_3_police_memory.md §P5 (le joueur infère la croyance police
//             — projection qualitative, jamais la suspicion_map brute) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id)
//             -- session:2026-06-02 (Phase 1 Task 4) --
//
// `PoliceMemoryController` — the PLAYER-FACING precinct-belief API: `GET /v1/city/precinct/:id/belief`.
//
// PLAYER RESOLUTION (same identity bridge as Flow Cells / Sparse Citizens / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body
// — R-ID-3). The city sim is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id UNIQUE — schema_player.md §6), filtered to PLAYER accounts.
//
// `:id` is the precinct id (1..bpd.precinct_count). The endpoint returns ONLY the qualitative belief bucket
// for that precinct (P5 / R2.2 inverted) — never the raw suspicion_map / true_state / scalars.
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
import { PoliceMemoryService } from './police_memory.service';
import {
  PoliceMemoryProjectionService,
  type PrecinctBeliefProjection,
} from './police_memory.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PoliceMemoryController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly police: PoliceMemoryService,
    private readonly projection: PoliceMemoryProjectionService,
  ) {}

  /**
   * `GET /v1/city/precinct/:id/belief` — the requesting player's qualitative police-belief band for a precinct.
   * P5 / R2.2 inverted: returns ONLY a qualitative `belief` bucket (DORMANT/WATCHFUL/SUSPICIOUS/HUNTING) drawn
   * from the precinct's OWN lossy suspicion_map — NEVER the raw suspicion_map / true_state / tile mass /
   * raid_temperature / building ids. Requires a PLAYER JWT (JwtAuthGuard). A precinct id outside 1..6 →
   * VALIDATION error; a precinct with no seeded row (player never ticked) → RESOURCE_NOT_FOUND.
   */
  @Get('city/precinct/:id/belief')
  @UseGuards(JwtAuthGuard)
  async precinctBelief(
    @Param('id', IntParam) precinctId: number,
    @Req() req: RequestWithAccount,
  ): Promise<PrecinctBeliefProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (tunable-backed, CLAUDE.md m6-5).
    if (!this.police.isValidPrecinct(precinctId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `precinct id must be an integer in 1..6 (got "${precinctId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    const belief = await this.projection.projectPrecinct(playerId, precinctId);
    if (belief === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'No precinct memory for this player yet (the city sim has not ticked).',
      });
    }
    return belief;
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

// IMPLEMENTS: docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (RepairService + controller —
//             POST /v1/operational/building/:id/repair) + §2 (the recovery action of the raid consequence loop) +
//             docs/tech/18_api_protocol (/v1, ResponseEnvelope, Idempotency-Key) + 17 JwtAuthGuard (req.account →
//             player_id, the SAME identity bridge the RealEstateController uses)
//             -- session:2026-06-04 (Phase 2b Task 3) --
//
// `RepairController` — the PLAYER-FACING repair API:
//   - POST /v1/operational/building/:id/repair → repair a player-owned DAMAGED building (guarded cash debit → repairing).
//
// PLAYER RESOLUTION (the SAME identity bridge as the RealEstateController / city-sim controllers / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from the verified `sub` claim,
// NEVER the body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the
// 1-1 Player↔Account link (player.account_id, filtered to PLAYER accounts). The body carries NO player id — a body
// player id is NEVER trusted (the player is resolved from the JWT alone).
//
// IDEMPOTENCY (REUSE): the POST is a mutation, so the global IdempotencyInterceptor applies — a retried repair with the
// same Idempotency-Key replays the memorized response, NO re-execution (no double-debit). The controller does not
// re-implement idempotency; it just declares the mutating endpoint (the interceptor wraps it transparently, the SAME
// way the purchase/convert/order POSTs are covered).
//
// The mutating handler returns a plain `{ repairing: true }` ack (NOT the raw post-debit cents — R2.2; the player
// surface is the qualitative projection); the global EnvelopeInterceptor wraps it in a success ResponseEnvelope.

import { Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { RepairService } from './repair.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RepairController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repair: RepairService,
  ) {}

  /**
   * `POST /v1/operational/building/:id/repair` — repair the requesting player's DAMAGED building (the recovery action
   * of the raid consequence loop). DEBITS economy_states by the grounded repair cost (operational.repair.cost_ratio ×
   * the M1 conversion-cost reference) ATOMICALLY guarded (insufficient cash → 409, no state change) → transitions
   * structural_state='repairing' + repair_completes_at_tick = current_tick + operational.repair.duration_ticks + moves
   * the active building_raid row status → 'repairing'. The OPERATIONAL_REPAIR tick flips it back to 'operational' at
   * the completion tick. Returns { repairing: true } (the raw post-debit cents are NOT forwarded — R2.2). Requires a
   * PLAYER JWT (no token → 401). A building that is not the player's / not converted → 404; not DAMAGED → 409. Supports
   * Idempotency-Key (the global interceptor — a retried repair does not double-debit).
   */
  @Post('operational/building/:id/repair')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async repairBuilding(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ repairing: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.repair.repair(playerId, id);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). 404 if none. */
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

// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.2-04c-player-surface-design.md §3 C6 ("forensic :
//             GET /v1/me/forensic" — route, 1 bucket réel sur 3).
//             Canon: docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5 R2.2.
//             — W6.2 C6 — 2026-08-13
//
// `ForensicController` — the PLAYER-FACING read surface for the §5 Forensic Signaling P5 projection.
// `GET /v1/me/forensic` is the FIRST player-reachable caller of `ForensicProjectionService.
// projectForensicState` (design §1.0's own exhaustive controller sweep: 132 `*.controller.ts` files,
// `projectForensicState` consumed ONLY by `_test` before this chunk).
//
// ⚠️ 1 bucket réel sur 3 (design §3 C6): after C1 (this lot), `effluent_visibility_bucket` has a REAL
// source (`block_effluent_register`, amorcée). `audit_risk_bucket` (source: `ledger_entry_ring`,
// TD-358 — the laundering chain is dead at 4 maillons, hors périmètre de ce lot) and
// `lifestyle_alarm_bucket` (source: `lifestyle_audit_state`, forme C — ch07 surface) stay CONSTANT
// for every player. The route returns all 3 (the P5 wall's own shape — `ForensicClientProjection`
// is not narrowed here, unlike C7's reputation route, because retiring 2 of 3 fields here would leave
// a route with a SINGLE key, design's own §3 C7 "éventre la route" reasoning applied in reverse — see
// that chunk's own comment for the symmetric case). The 2 constant buckets are NEVER silently passed
// off as "live" — the anti-péremption falsifiable (the spec's own header) pins `audit_risk_bucket` to
// its "no data" value for a player who exercised the REAL production laundering chain, so the day
// TD-358 closes, THAT spec (not this file) turns red and says what to do.
//
// R2.2: the response IS `ForensicClientProjection` verbatim (3 closed-domain buckets — never a raw
// scalar; `last_chi_square`/`last_deviation`/`last_gap`/`soft_flag_count`/`tail_ramp_stage` never
// leave `ForensicProjectionService`'s own boundary, enforced by that service's own TS return type).

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
import { ForensicProjectionService, type ForensicClientProjection } from './forensic.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ForensicController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: ForensicProjectionService,
  ) {}

  /**
   * `GET /v1/me/forensic` — the requesting player's forensic-signaling projection (design §3 C6).
   * Calls `ForensicProjectionService.projectForensicState` verbatim (forme route — no new écrivain,
   * no new query beyond what the service already runs). Requires a PLAYER JWT (no token → 401).
   */
  @Get('me/forensic')
  @UseGuards(JwtAuthGuard)
  async getForensicState(@Req() req: RequestWithAccount): Promise<ForensicClientProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.projectForensicState(playerId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity
   *  bridge — duplicated verbatim, the established per-controller convention, never shared). */
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

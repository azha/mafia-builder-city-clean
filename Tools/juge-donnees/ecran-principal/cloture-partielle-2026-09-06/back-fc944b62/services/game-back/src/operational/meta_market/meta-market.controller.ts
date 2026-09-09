// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.3-04d-player-surface-design.md §3 C5
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1
//             Convention precedent: engagements.controller.ts (W6.1) — @Controller({version}),
//               `me/…` paths, JwtAuthGuard, per-controller resolvePlayerId (never a shared helper).
//             — W6.3 C5 — 2026-08-13 —
//
// `MetaMarketController` — the PLAYER-FACING routes for §1 Async Meta-Market (04d-C).
//
// `GET /v1/me/meta-market/signal?substance=&district_profile=`: calls
//   `MetaMarketReadService.getSignalWithVisibility` — NEVER the raw `getSignal` (that would skip
//   the per-player visibility privacy wall, mig 0105). `regionId` is DERIVED SERVER-SIDE from
//   `player.region_id ?? 'unknown'` (the SAME `RegionService.getRegion(...) ?? REGION_FALLBACK`
//   pattern `meta-market-contribution.service.ts:98` already uses) — NEVER a client-supplied
//   parameter (a client-chosen region would turn this into a cross-region reader, breaking canon
//   invariant 5 "NOT cross-region").
//
// `PUT /v1/me/meta-market/visibility {enabled}`: writes `player.meta_market_visibility_enabled`.
//   ⛔ Writes `true`/`false` ONLY — NEVER normalizes to `null` (the registry default 'on' is
//   distinct from an explicit `true`, and `meta-market-read.service.ts:216-217` exploits that
//   distinction — normalizing here would erase it).
//
// `sampleCount` is CONSERVED in the response — the canon shows it to the player ("Based on 247
//   player-sources", `async_meta_market.md:84,116`).
//
// D7 (same convention as engagements.controller.ts): `playerId` comes ONLY from the verified JWT.
// R2.2: bigint fields (medianCents/p10Cents/p90Cents) are serialized as strings (JSON has no
//   bigint) — mirrors `meta-market-test.controller.ts:1094-1096`.
// Zero-regression: ADDITIVE only — new controller, no existing route/service/table touched.

import { Body, Controller, Get, Inject, Put, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { MetaMarketReadService } from './meta-market-read.service';
import { RegionService, REGION_FALLBACK } from './region.service';
import { rejectUnknownFields } from '../../common/param-pipes';

/** `GET /v1/me/meta-market/signal` response — 'insufficient_signal' or the banded signal view. */
type SignalResponse =
  | { signal: 'insufficient_signal' }
  | {
      signal: {
        medianCents: string;
        p10Cents: string;
        p90Cents: string;
        sampleCount: number;
        lastAggregatedAt: string;
        trend: 'up' | 'stable' | 'down';
      };
    };

/** `PUT /v1/me/meta-market/visibility` body (C5). */
interface VisibilityBody {
  enabled?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MetaMarketController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly readService: MetaMarketReadService,
    private readonly regionService: RegionService,
  ) {}

  /**
   * `GET /v1/me/meta-market/signal?substance=&district_profile=` — the requesting player's
   * visibility-gated signal read (C5). `regionId` is derived server-side, never a query param.
   */
  @Get('me/meta-market/signal')
  @UseGuards(JwtAuthGuard)
  async readSignal(
    @Query('substance') substance: string,
    @Query('district_profile') districtProfile: string,
    @Req() req: RequestWithAccount,
  ): Promise<SignalResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (!substance || !districtProfile) {
      throw new ApiError('VALIDATION_FAILED', { message: 'substance and district_profile query params are required.' });
    }

    // Server-derived region — REUSE the SAME pattern the contribution path already uses
    // (meta-market-contribution.service.ts:98). NEVER a client-supplied regionId.
    const regionId = (await this.regionService.getRegion(playerId)) ?? REGION_FALLBACK;

    const result = await this.readService.getSignalWithVisibility(playerId, regionId, substance, districtProfile);
    if (result === 'insufficient_signal') {
      return { signal: 'insufficient_signal' };
    }
    return {
      signal: {
        medianCents:      result.medianCents.toString(),
        p10Cents:         result.p10Cents.toString(),
        p90Cents:         result.p90Cents.toString(),
        sampleCount:      result.sampleCount,
        lastAggregatedAt: result.lastAggregatedAt.toISOString(),
        trend:            result.trend,
      },
    };
  }

  /**
   * `PUT /v1/me/meta-market/visibility {enabled}` — toggle the player's meta-market visibility
   * preference (C5). Writes `true`/`false` only — `null` (registry default) remains reachable
   * only by never having toggled, never re-normalized here.
   */
  @Put('me/meta-market/visibility')
  @UseGuards(JwtAuthGuard)
  async setVisibility(
    @Body() body: VisibilityBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ visibilityEnabled: boolean }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // TD-451 — mesuré : client et 2 sites de spec n'envoient que `enabled`.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['enabled']);
    if (typeof body?.enabled !== 'boolean') {
      throw new ApiError('VALIDATION_FAILED', { message: 'enabled must be a boolean.', details: { param: 'enabled' } });
    }
    await this.db
      .update(player)
      .set({ meta_market_visibility_enabled: body.enabled })
      .where(eq(player.player_id, playerId));
    return { visibilityEnabled: body.enabled };
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

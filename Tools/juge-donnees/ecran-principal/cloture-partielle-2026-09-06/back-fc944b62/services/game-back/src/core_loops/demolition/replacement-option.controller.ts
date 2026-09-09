// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C5 (endpoints
//             list/pick — §15)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15
//             (`GET /v1/friction/replacement-options` / `POST /v1/friction/replacement-options/:id/pick`)
//             + §7 (★#5 — pick = shortcut into the EXISTING purchase flow, governed identically).
//             Pattern: `DecommissionController` (the `resolvePlayerId` account→player bridge, VERBATIM —
//             no shared extraction across controllers, this codebase's own convention) +
//             `RealEstateController#purchase` (the EXACT `governor.commit(BUILDING_ACQUISITION, ...)`
//             wrap this controller reuses for the pick's delegated purchase call).
//             — P3-E C5 — 2026-07-17
//
// `ReplacementOptionController` — GET (buckets-only list) + POST pick. The pick handler does the I9
// guarded resolve+close FIRST (`ReplacementOptionService.resolveAndClosePick` — throws 404/409 before any
// purchase-flow call), THEN delegates to `RealEstateService.purchase` wrapped in the SAME governor commit
// `RealEstateController#purchase` itself uses (zero new purchase write-path, design §7 verbatim). Ordering
// matters for I9's OWN concurrency AC: `purchase()`'s own `isBlockFreeForPlayer` guard is a plain SELECT
// (no row-level lock), so 2 concurrent picks racing the SAME freed block could BOTH pass it if the
// resolve+close guard did not run FIRST — the replacement_option-row guard (I9) is what actually
// serializes "exactly 1 of the 2 picks proceeds to purchase", not `purchase()` itself.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, IntQuery } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
import { RealEstateService } from '../../operational/real_estate/real-estate.service';
import { ReplacementOptionService, type ReplacementOptionDto } from './replacement-option.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ReplacementOptionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly options: ReplacementOptionService,
    private readonly realEstate: RealEstateService,
    // P3-E C5 (design §7) — the SAME Loop 10 governor `RealEstateController#purchase` wraps its own
    // purchase call with (BUILDING_ACQUISITION) — the pick shortcut delegates through the IDENTICAL wrap.
    private readonly governor: StructuralDecisionGovernorService,
  ) {}

  /**
   * `GET /v1/friction/replacement-options` (§15) — the player's OPEN replacement options, buckets only
   * (R2.2). Optional `?freed_block_id=` scopes to one decommission's own pair; omitted → every open option
   * across all of this player's decommissions.
   */
  @Get('friction/replacement-options')
  @UseGuards(JwtAuthGuard)
  async listOpen(
    @Query('freed_block_id', IntQuery) freedBlockId: number | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ options: ReplacementOptionDto[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const options = await this.options.listOpenOptions(playerId, freedBlockId);
    return { options };
  }

  /**
   * `POST /v1/friction/replacement-options/:id/pick` (§15/§7 ★#5) — pre-resolves `(freed_block_id,
   * candidate_building_type)` (I9 guarded close — closes the sibling option in the SAME statement) and
   * delegates to the EXISTING purchase flow (`RealEstateService.purchase`, governed identically to
   * `POST /v1/operational/building/purchase`). 404 if the option doesn't belong to this player; 409
   * `REPLACEMENT_OPTION_ALREADY_CLOSED` if it exists but is no longer open (already picked / expired /
   * closed by a concurrent sibling pick). Returns `{ picked: true, building_id }` — the NEW building the
   * purchase flow created on the freed block.
   */
  @Post('friction/replacement-options/:id/pick')
  @HttpCode(200) // a state mutation (not a resource creation of ITS OWN — the building_id is the purchase flow's).
  @UseGuards(JwtAuthGuard)
  async pick(@Param('id', UuidParam) optionId: string, @Req() req: RequestWithAccount): Promise<{ picked: true; building_id: string }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);

    // I9 FIRST — this is the guard that makes "2 concurrent picks → exactly 1 passes" hold (see file
    // header). Throws 404/409 before any purchase-flow call — zero mutation on refusal beyond this point.
    const resolved = await this.options.resolveAndClosePick(playerId, optionId);

    const { buildingId } = await this.governor.commit<{ buildingId: string }>(
      playerId,
      StructuralDecisionType.BUILDING_ACQUISITION,
      {
        before: { entity: 'replacement_option', id: optionId, freed_block_id: resolved.freedBlockId },
        after: (r: { buildingId: string }) => ({ entity: 'building', id: r.buildingId, candidate_building_type: resolved.candidateBuildingType }),
      },
      () => this.realEstate.purchase(playerId, resolved.freedBlockId, resolved.candidateBuildingType),
    );

    return { picked: true, building_id: buildingId };
  }

  /** account_id → player_id bridge (the JwtAuthGuard identity, VERBATIM every sibling controller's own
   *  per-controller helper — no shared extraction, this codebase's own convention). */
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

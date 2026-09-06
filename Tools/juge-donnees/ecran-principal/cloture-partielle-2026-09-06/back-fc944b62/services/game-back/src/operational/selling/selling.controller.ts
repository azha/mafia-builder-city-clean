// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §NestJS — backend jeu (SellingService.
//             assignDealer "Met dealer en current_state = WORKING" + the runner pickup → safehouse deposit) +
//             §Implications par couche / Unity ("Dealer-spot UI" / "Dealer float warning" — the qualitative dealer
//             surface) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) +
//             P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// `SellingController` — the PLAYER-FACING M1 dealer-at-lek selling API:
//   - POST /v1/operational/dealer/assign            → assign a WORKING dealer to an operational dealer-spot (Step 1).
//   - POST /v1/operational/dealer/:id/collect        → runner pickup: ferry the dealer float into a safehouse (Step 2).
//   - GET  /v1/operational/dealer/:id                → the qualitative per-dealer projection (Step 3, P5).
//   - GET  /v1/operational/dealers                   → the qualitative dealer-list projection (Step 3, P5).
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / DistributionController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the
// body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating handlers return plain `data` (the new dealer id / the collect ids — NOT raw cents); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The GETs return the qualitative projections (R2.2). The
// SAFEHOUSE occupation band (the runner-deposit target) is read through System 9's existing district-stash projection
// (GET /v1/city/district/:id/stash) — T5 does NOT duplicate that surface.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, intField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { SellingService } from './selling.service';
import { SellingProjectionService, type DealerProjection } from './selling.projection.service';

/** POST /dealer/assign body — the player picks an operational dealer-spot + the lek tile it covers. */
interface AssignBody {
  dealer_spot_id?: string;
  lek_tile_id?: number;
}

/** POST /dealer/:id/collect body — the player picks the safehouse the runner deposits the float into. */
interface CollectBody {
  safehouse_id?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class SellingController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly selling: SellingService,
    private readonly projection: SellingProjectionService,
  ) {}

  /**
   * `POST /v1/operational/dealer/assign` — assign a WORKING Brindle dealer to one of the player's OPERATIONAL
   * dealer-spots, covering a lek tile (Step 1). Body: { dealer_spot_id, lek_tile_id }. Non-operational dealer-spot →
   * 404; bad lek_tile_id → 422. Returns { dealer_id }. Requires a PLAYER JWT.
   */
  @Post('operational/dealer/assign')
  @HttpCode(201) // assigning creates a dealer → 201.
  @UseGuards(JwtAuthGuard)
  async assign(@Body() body: AssignBody, @Req() req: RequestWithAccount): Promise<{ dealer_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['dealer_spot_id', 'lek_tile_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — dealer_spot_id: uuid (masked in the M31 sweep by lek_tile_id's own check firing
    // first). lek_tile_id: int — `Number.isInteger(lekTileId) && >= 0` (selling.service.ts:60) has
    // no UPPER bound, same shape as real-estate's own `block_id`; NOT reproduced downstream (this
    // probe short-circuits on dealer_spot ownership before the write), so this is a preventive
    // widening on structural resemblance, consigned "non vérifié" rather than "measured".
    const dealerSpotId = uuidField(body as unknown as Record<string, unknown>, 'dealer_spot_id');
    // r3/MAJOR-2 (D5 v24) — `main` (de311e06:70) coerced via bare `Number(body.lek_tile_id)`, no type
    // check: `{"lek_tile_id":"5"}` succeeded. `acceptNumericString` restores that domain on this site.
    const lekTileId = intField(body as unknown as Record<string, unknown>, 'lek_tile_id', 'int4', { acceptNumericString: true });
    const { dealerId } = await this.selling.assignDealer(playerId, dealerSpotId, lekTileId);
    return { dealer_id: dealerId };
  }

  /**
   * `POST /v1/operational/dealer/:id/collect` — the runner pickup: ferry the dealer's whole cash float into a
   * player-owned safehouse, depositing into the Erlang slot model (Step 2). Body: { safehouse_id }. dealer/safehouse
   * not the player's → 404; nothing to collect (float 0) / safehouse full / insufficient headroom / concurrent float
   * change → 409. Returns { dealer_id, safehouse_id }. Requires a PLAYER JWT.
   */
  @Post('operational/dealer/:id/collect')
  @HttpCode(200) // a collect mutates existing entities (no new entity) → 200.
  @UseGuards(JwtAuthGuard)
  async collect(
    @Param('id', UuidParam) id: string,
    @Body() body: CollectBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ dealer_id: string; safehouse_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['safehouse_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — safehouse_id: uuid (measured 500 pre-C1, one of the 8 "non confondus").
    const safehouseIdArg = uuidField(body as unknown as Record<string, unknown>, 'safehouse_id');
    const { dealerId, safehouseId } = await this.selling.collect(playerId, id, safehouseIdArg);
    return { dealer_id: dealerId, safehouse_id: safehouseId };
  }

  /**
   * `GET /v1/operational/dealer/:id` — the requesting player's qualitative projection for ONE dealer (Step 3, P5/R2.2):
   * an activity band (WORKING / IDLE / ABSENT / COMPROMISED) + a cash band (NONE / LOW / MODERATE / HIGH / FULL) —
   * NEVER the raw float cents / covered tile / grams. dealer not the player's → 404. Requires a PLAYER JWT.
   */
  @Get('operational/dealer/:id')
  @UseGuards(JwtAuthGuard)
  async dealer(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<DealerProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const dealers = await this.projection.listDealers(playerId);
    const entry = dealers.find((d) => d.dealer === id);
    if (!entry) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `dealer ${id} is not a player-owned dealer.` });
    }
    return entry;
  }

  /**
   * `GET /v1/operational/dealers` — the requesting player's qualitative dealer-list projection (Step 3, P5/R2.2): one
   * entry per dealer with an activity band + a cash band — NEVER the raw float / tile / grams. Requires a PLAYER JWT.
   * Returns { dealers: [...] } (empty list when the player has no dealers).
   */
  @Get('operational/dealers')
  @UseGuards(JwtAuthGuard)
  async dealers(@Req() req: RequestWithAccount): Promise<{ dealers: DealerProjection[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const dealers = await this.projection.listDealers(playerId);
    return { dealers };
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

// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §Canal légitime — Pyralin
//             (PrecursorService.placeOrder — the legitimate Pyralin order) + §Implications par couche / Unity
//             (Order placement flow + the qualitative stock surface) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorsController` — the PLAYER-FACING M1 Pyralin sourcing API:
//   - POST /v1/operational/precursors/order                  → place a Pyralin order (debit + pending order) (Step 1).
//   - GET  /v1/operational/precursors?building_id=<uuid>     → the qualitative stock + order projection (Step 3, P5).
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / RealEstateController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never
// the body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating handler returns plain `data` (the new order id — NOT the raw cents); the global EnvelopeInterceptor
// wraps it in a success ResponseEnvelope. The GET returns the qualitative projection (R2.2 — bands only).

import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidQuery, intField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { PrecursorService } from './precursors.service';
import { PrecursorsProjectionService, type PrecursorProjection } from './precursors.projection.service';
// P3-F C6 — CategoryDelegationGuard (SUPPLY_SOURCING's ONE guard site, C0-reanchor §7). One-line seam.
import { CategoryDelegationGuard } from '../../meta_progression/category-delegation-guard.service';
import { TaskCategoryKey } from '../../meta_progression/task-category-catalogue';

/** POST /order body — the player chooses an OPERATIONAL building, the precursor type, and a quantity. */
interface OrderBody {
  building_id?: string;
  precursor_type?: string;
  quantity_units?: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PrecursorsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly precursors: PrecursorService,
    private readonly projection: PrecursorsProjectionService,
    // P3-F C6 — the SUPPLY_SOURCING retirement guard (design D6/§8.3).
    private readonly delegationGuard: CategoryDelegationGuard,
  ) {}

  /**
   * `POST /v1/operational/precursors/order` — place a Pyralin order for a player-owned OPERATIONAL building (Step 1,
   * legitimate channel). Body: { building_id, precursor_type, quantity_units }. DEBITS economy_states by the grounded
   * order cost (qty × the grounded Pyralin unit price — see PrecursorService.order) and creates a pending
   * precursor_order that arrives after the deterministic Pyralin lead time. Atomic + guarded (insufficient cash →
   * 409). Returns { order_id }. Requires a PLAYER JWT.
   */
  @Post('operational/precursors/order')
  @HttpCode(201) // an order is a resource creation → 201.
  @UseGuards(JwtAuthGuard)
  async order(@Body() body: OrderBody, @Req() req: RequestWithAccount): Promise<{ order_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['building_id', 'precursor_type', 'quantity_units']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.SUPPLY_SOURCING);
    // L0.3 (D5) — building_id: uuid (getOwnedOperationalBuilding reaches a uuid column, unguarded
    // before this — one of C1's 60 "non classable by single-field probe" residues, masked because
    // precursor_type's own check ran first on every probe that left it blank). quantity_units: int,
    // `precursors.service.ts:83`'s own ">= 1" business rule runs AFTER, unchanged. precursor_type:
    // enum, left on `PrecursorService`'s own `isConfiguredPrecursor` (kept, not `enumField` — that
    // check is CASE-INSENSITIVE, `precursors.service.ts:77`'s `.toLowerCase()`, and `enumField`'s
    // `.includes` is not; replacing it would 422 a legitimate mixed-case client value the service
    // accepts today — a real behavior change this additive-only lot must not make).
    const buildingId = uuidField(body as unknown as Record<string, unknown>, 'building_id');
    // r3/MAJOR-2 (D5 v24) — `main` (de311e06:70) coerced via bare `Number(body.quantity_units)`, no
    // type check: `{"quantity_units":"5"}` succeeded. `acceptNumericString` restores that domain here.
    const quantityUnits = intField(body as unknown as Record<string, unknown>, 'quantity_units', 'int4', { acceptNumericString: true });
    const { orderId } = await this.precursors.order(
      playerId,
      buildingId,
      String(body.precursor_type ?? ''),
      quantityUnits,
    );
    return { order_id: orderId };
  }

  /**
   * `GET /v1/operational/precursors?building_id=<uuid>` — the requesting player's qualitative Pyralin projection for
   * a building (Step 3, P5/R2.2): stock band + order-state booleans — NEVER the raw quantity_units / price / ticks.
   * Requires a PLAYER JWT. A building that is not the player's OPERATIONAL building → RESOURCE_NOT_FOUND.
   */
  @Get('operational/precursors')
  @UseGuards(JwtAuthGuard)
  async precursorState(
    // L0.3 (D5) — UuidQuery, REQUIRED (D5: "obligatoire quand la route refuse déjà l'absence" —
    // measured pre-C1: 500 with NO argument at all, `String(undefined)` reaching the DB as the
    // literal string "undefined"). Absence is a malformed request like any other, so it 422s here —
    // no decision anywhere names a 404-on-absence for this route.
    @Query('building_id', UuidQuery) buildingId: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<PrecursorProjection> {
    if (buildingId === undefined) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'building_id query param is required.',
        details: { param: 'building_id' },
      });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectBuilding(playerId, buildingId);
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No such operational building for this player: ${buildingId}.`,
      });
    }
    return proj;
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

// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §NestJS — backend jeu
//             (ProductionBrindleService.startCook — the player START-COOK action) + §Implications par couche / Unity
//             (the Lab cook UI + the finished-Brindle inventory display) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 3) --
//
// `ProductionController` — the PLAYER-FACING production API (substance-generic — Brindle lab / Crick refinery):
//   - POST /v1/operational/lab/:id/cook        → start a cook on a cook building (Step 1). Body { substance } picks the
//                                                substance (default 'brindle' — the legacy M1 shape, so the building id
//                                                + the descriptor decide the host type; a refinery cook passes 'crick').
//                                                Body { refining_passes } (Ash only, default 0) is the time↔purity lever
//                                                (extra refining passes lengthen the Ash cook; validated 422 by the service).
//   - GET  /v1/operational/lab/:id             → the qualitative cook-stage + substance projection (Step 3, P5).
//   - GET  /v1/operational/storage/:id         → the qualitative product band + substance projection (Step 3, P5).
//
// NOTE the route path keeps the legacy `/lab/` segment (the building id in :id is what selects the building — a lab OR
// a refinery; the descriptor validates its type). Renaming the path would break the unmodified Brindle E2E (the
// strongest non-regression proof); the substance-generic surface is achieved via the building id + the body param.
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / PrecursorsController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the
// body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating handler returns plain `data` (the new cook id — NOT raw grams/precursors); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The GETs return the qualitative projections (R2.2).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { ProductionService } from './production.service';
import { rejectUnknownFields } from '../../common/param-pipes';
import {
  ProductionProjectionService,
  type LabCookProjection,
  type ProductStorageProjection,
} from './production.projection.service';

/** POST /cook body — the optional substance to cook (default 'brindle', the legacy M1 shape). A refinery cook passes
 *  'crick'; an unconfigured substance is rejected 422 by the service. The cook BUILDING is the :id route param.
 *  `refining_passes` (Ash only, default 0 — the time↔purity lever) is the number of extra refining passes chosen at
 *  cook start; the service validates it (non-negative integer ≤ the substance's max; non-zero on a non-refining
 *  substance → 422) and persists it on the cook (Ash extends its cook by refining_passes × the per-pass duration). */
interface CookBody {
  substance?: string;
  refining_passes?: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ProductionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly production: ProductionService,
    private readonly projection: ProductionProjectionService,
  ) {}

  /**
   * `POST /v1/operational/lab/:id/cook` — start a cook on a player-owned OPERATIONAL cook building (Step 1). Body
   * { substance } (default 'brindle') picks the substance; the descriptor (substance-config.ts) decides the required
   * building type + consumed precursor (Brindle → lab/Pyralin, Crick → refinery/Verdant root extract, Ash →
   * specialized_lab/Glass lily). Body { refining_passes } (Ash only, default 0) is the time↔purity lever (extra passes
   * lengthen the Ash cook). Requires the building to hold ≥ 1 batch of that precursor; CONSUMES it and creates a
   * cook_session (current_stage='stage_1', refining_passes recorded). Atomic + guarded (unconfigured substance → 422;
   * refining_passes negative / over the substance's max / non-zero on a non-refining substance → 422; non-operational
   * building → 404; wrong building type for the substance → 409; a cook already running → 409; insufficient precursor →
   * 409). Returns { cook_session_id }. Requires a PLAYER JWT.
   */
  @Post('operational/lab/:id/cook')
  @HttpCode(201) // a cook session is a resource creation → 201.
  @UseGuards(JwtAuthGuard)
  async startCook(
    @Param('id', UuidParam) buildingId: string,
    @Body() body: CookBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ cook_session_id: string }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // TD-451 — LE PIÈGE LE PLUS COÛTEUX DE CE LOT : `substance` ABSENT vaut `'brindle'` par défaut (voir
    // le commentaire d'origine juste dessous), donc un corps portant `substances` au pluriel, ou une
    // faute de frappe, aurait lancé une cuisson de BRINDLE là où le joueur demandait de l'ASH — 201,
    // silencieux, ressources engagées. Mesuré : le client envoie `{substance, refining_passes}` ; sur
    // 5 sites de spec, 1 envoie `substance` et 4 un corps VIDE (le chemin brindle légitime, qui reste
    // accepté puisque le helper ne rejette qu'une clé PRÉSENTE hors liste).
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['substance', 'refining_passes']);
    // Default to 'brindle' when omitted — the legacy M1 body shape (so the unmodified Brindle E2E stays green); the
    // cook_session.substance_type column likewise defaults to brindle (09). A refinery cook passes { substance: 'crick' }.
    // refining_passes defaults 0 (the Ash time↔purity lever; non-Ash cooks accept only 0 — the service rejects a non-zero
    // request on a non-refining substance). The service validates the value; a non-integer body value is coerced to NaN
    // here and rejected (422) by the service's integer check.
    const { cookSessionId } = await this.production.startCook(
      playerId,
      String(buildingId ?? ''),
      String(body?.substance ?? 'brindle'),
      body?.refining_passes === undefined ? 0 : Number(body.refining_passes),
    );
    return { cook_session_id: cookSessionId };
  }

  /**
   * `GET /v1/operational/lab/:id` — the requesting player's qualitative cook projection for a cook building (Step 3,
   * P5/R2.2): the substance label + the cook-stage band (IDLE / EARLY / MID / LATE / DONE) — NEVER the raw stage clock
   * / count / grams. Requires a PLAYER JWT. A building that is not the player's OPERATIONAL cook building → RESOURCE_
   * NOT_FOUND.
   */
  @Get('operational/lab/:id')
  @UseGuards(JwtAuthGuard)
  async labState(@Param('id', UuidParam) buildingId: string, @Req() req: RequestWithAccount): Promise<LabCookProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectLab(playerId, String(buildingId ?? ''));
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No such operational cook building for this player: ${buildingId}.`,
      });
    }
    return proj;
  }

  /**
   * `GET /v1/operational/storage/:id` — the requesting player's qualitative product projection for a cook building
   * (Step 3, P5/R2.2): the substance label + the product band (NONE / LOW / MEDIUM / HIGH) — NEVER the raw
   * quantity_grams / purity. Requires a PLAYER JWT. A building that is not the player's OPERATIONAL cook building (a
   * lab or a refinery) → RESOURCE_NOT_FOUND.
   */
  @Get('operational/storage/:id')
  @UseGuards(JwtAuthGuard)
  async storageState(@Param('id', UuidParam) buildingId: string, @Req() req: RequestWithAccount): Promise<ProductStorageProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectStorage(playerId, String(buildingId ?? ''));
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

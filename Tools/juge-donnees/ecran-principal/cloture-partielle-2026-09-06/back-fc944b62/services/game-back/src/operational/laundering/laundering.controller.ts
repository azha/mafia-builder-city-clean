// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 1 — cash into front shop
//             (LaunderingService.injectCash — the player "Inject cash" action) + §Implications par couche / Unity
//             (the qualitative cleanliness bar + the deviation badge — the Stage-1 player surface) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) +
//             P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingController` — the PLAYER-FACING M1 / Phase-2b laundering API:
//   - POST /v1/operational/laundering/inject       → inject cash from a safehouse into a front-shop's Stage-1 node (Step 1).
//   - POST /v1/operational/laundering/stage         → append a downstream pipeline stage (Phase 2b — build the multi-stage
//                                                     chain: a new laundering node on a player-owned OPERATIONAL building +
//                                                     a laundering_edge from the current tail, so the cash routes one stage
//                                                     further before it can reach the wallet).
//   - GET  /v1/operational/laundering               → LOT PLANQUE C3: the player's nodes (RE-DISCOVERY — `inject`
//                                                     hands back a node_id once and nothing replayed it).
//   - GET  /v1/operational/laundering/:nodeId       → the qualitative per-node projection (Step 4, P5): cleanliness band +
//                                                     deviation flag (the front-shop AUDIT_PIN_ACTIVE — System 7's observable).
//   - GET  /v1/operational/laundering/:nodeId/pipeline → the qualitative pipeline overview (Phase 2b): the ordered stages,
//                                                     each with its cleanliness band + a terminal flag (R2.2 — bands only).
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / SellingController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the
// body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating handler returns plain `data` (the front-shop / safehouse / node ids + the qualitative deviation flag —
// NOT raw cents); the global EnvelopeInterceptor wraps it in a success ResponseEnvelope. The GET returns the
// qualitative projection (R2.2). The clean cash itself reaches the player's wallet (economy_states.cash_cents) via the
// LAUNDER_OUTPUT tick (LaunderingOutputService); the wallet balance is surfaced by the existing economy projection.

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
import { LaunderingService } from './laundering.service';
import {
  LaunderingProjectionService,
  type LaunderingNodeProjection,
  type LaunderingPipelineProjection,
  type LaunderingNodeListProjection,
} from './laundering.projection.service';

/** POST /laundering/inject body — the player picks the source safehouse + the target front-shop + the amount (cents). */
interface InjectBody {
  front_shop_id?: string;
  safehouse_id?: string;
  amount_cents?: number;
}

/** POST /laundering/stage body — append a stage AFTER `from_node_id` on the player-owned OPERATIONAL `building_id`. */
interface AddStageBody {
  from_node_id?: string;
  building_id?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class LaunderingController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly laundering: LaunderingService,
    private readonly projection: LaunderingProjectionService,
  ) {}

  /**
   * `POST /v1/operational/laundering/inject` — inject cash from a player-owned safehouse into a player-owned
   * OPERATIONAL front-shop's Stage-1 laundering node (Step 1). Body: { front_shop_id, safehouse_id, amount_cents }.
   * Drains the safehouse (System 9) into the node buffer + feeds the deviation input to System 7 if the amount exceeds
   * the legitimate baseline. front-shop/safehouse not the player's → 404; bad amount → 422; insufficient safehouse cash
   * / node at capacity → 409. Returns { front_shop_id, safehouse_id, node_id, deviation }. Requires a PLAYER JWT.
   */
  @Post('operational/laundering/inject')
  @HttpCode(200) // an inject mutates existing entities (drains a safehouse, credits a node) → 200 (no new top-level entity).
  @UseGuards(JwtAuthGuard)
  async inject(
    @Body() body: InjectBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ front_shop_id: string; safehouse_id: string; node_id: string; deviation: boolean }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['front_shop_id', 'safehouse_id', 'amount_cents']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — front_shop_id/safehouse_id: uuid (both reach a uuid column unguarded before this —
    // masked in the M31 sweep by amount_cents's own check firing first on every single-field probe).
    // amount_cents: reaches a `bigint` column downstream (same class as money-holding.controller.ts's own
    // `amount_cents` — r1/BLOCKING-1 measured this "already safe" claim FALSE: `laundering.service.ts:106`'s
    // `Number.isInteger` check admits values past Number.MAX_SAFE_INTEGER (an IEEE754 double is still an
    // "integer" arbitrarily far past 2^53), so a magnitude past bigint's own ~9.2e18 range reaches Postgres
    // and 500s (22003) instead of 422ing. intField(width='int8') BEFORE the service's own positive check.
    const frontShopId = uuidField(body as unknown as Record<string, unknown>, 'front_shop_id');
    const safehouseId = uuidField(body as unknown as Record<string, unknown>, 'safehouse_id');
    // r3/MAJOR-2 — a 7th divergence, NOT among r3's own named 6: `main` (de311e06:87) coerced via a
    // BARE `Number(body.amount_cents)` (unlike money-holding.controller.ts's `as number`, a compile-time
    // cast with NO runtime effect — the two "amount_cents" money sites are NOT the same pattern despite
    // being grouped together across 3 reviews). `{"amount_cents":"12"}` succeeded on `main` here.
    // `acceptNumericString` restores that domain; `checkIntWidthBound`'s own `Number.isSafeInteger`
    // magnitude gate (r1/BLOCKING-1's fix) still runs on the parsed value either way, so this does not
    // reopen the original 500.
    const amountCents = intField(body as unknown as Record<string, unknown>, 'amount_cents', 'int8', { acceptNumericString: true });
    const result = await this.laundering.inject(playerId, frontShopId, safehouseId, amountCents);
    return {
      front_shop_id: result.frontShopId,
      safehouse_id: result.safehouseId,
      node_id: result.nodeId,
      deviation: result.deviation,
    };
  }

  /**
   * `POST /v1/operational/laundering/stage` — append a downstream laundering stage to the pipeline (Phase 2b). Body:
   * { from_node_id, building_id }. Creates a new laundering node on a player-owned OPERATIONAL building at
   * stage_index = fromNode.stage_index + 1 + a laundering_edge from the current tail, so the cash routes one stage
   * further before it can reach the wallet (the new node becomes the pipeline TAIL — the terminal release node — until a
   * further stage is appended). The chain is LINEAR (a stage can only be appended to a tail with no outgoing edge).
   * from-node not the player's / host not a player-owned OPERATIONAL building → 404; from-node is not the tail (already
   * has a downstream stage) / the building already hosts a node → 409. Returns { from_node_id, node_id, building_id,
   * stage_index }. Requires a PLAYER JWT.
   */
  @Post('operational/laundering/stage')
  @HttpCode(201) // an addStage CREATES a new pipeline node (a new top-level entity) → 201 (mirrors the building purchase).
  @UseGuards(JwtAuthGuard)
  async addStage(
    @Body() body: AddStageBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ from_node_id: string; node_id: string; building_id: string; stage_index: number }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['from_node_id', 'building_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — from_node_id/building_id: uuid (measured 500 pre-C1, 2 of the 8 "non confondus").
    const fromNodeId = uuidField(body as unknown as Record<string, unknown>, 'from_node_id');
    const buildingId = uuidField(body as unknown as Record<string, unknown>, 'building_id');
    const result = await this.laundering.addStage(playerId, fromNodeId, buildingId);
    return {
      from_node_id: result.fromNodeId,
      node_id: result.nodeId,
      building_id: result.buildingId,
      stage_index: result.stageIndex,
    };
  }

  /**
   * `GET /v1/operational/laundering` — LOT PLANQUE C3: the requesting player's laundering nodes, ordered by stage.
   *
   * ⛔ WHY THIS ROUTE EXISTS, and it is not "a list for completeness": `POST …/laundering/inject` returns a
   * `node_id` EXACTLY ONCE, and no route replayed it (measured: ZERO upstream routes for a laundering node —
   * design §2.a link B8). A player who injected yesterday could not reach `…/:nodeId` today: the only occurrence
   * of the id had gone by in a response nobody could ask for again. This is the RE-DISCOVERY read.
   *
   * A player with no node gets an EMPTY list and a 200 — never a 404. An empty list IS a value; an absent key is a
   * hole (the same contract `GET /v1/city/district/:id/stash` already applies to safehouses).
   *
   * R2.2: ids + `stage_index` + a cleanliness BAND + two presence flags. Never a cent, never the raw float — the
   * band comes from the SAME derivation `…/:nodeId/pipeline` uses, so the two surfaces cannot drift apart.
   * Requires a PLAYER JWT; scoped to the token's player (a node of another player is simply not in the list).
   */
  @Get('operational/laundering')
  @UseGuards(JwtAuthGuard)
  async ownedNodes(@Req() req: RequestWithAccount): Promise<LaunderingNodeListProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.projectOwnedNodes(playerId);
  }

  /**
   * `GET /v1/operational/laundering/:nodeId` — the requesting player's qualitative projection for ONE Stage-1
   * laundering node (Step 4, P5/R2.2): a cleanliness band (DIRTY / PARTIAL / MOSTLY_CLEAN / CLEAN — System 8's
   * CleanlinessBucket, never the raw float) + a deviation flag (the host front-shop's AUDIT_PIN_ACTIVE — System 7's
   * observable, never the raw sigma). node not the player's → 404. Requires a PLAYER JWT.
   */
  @Get('operational/laundering/:nodeId')
  @UseGuards(JwtAuthGuard)
  async node(@Param('nodeId', UuidParam) nodeId: string, @Req() req: RequestWithAccount): Promise<LaunderingNodeProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const entry = await this.projection.projectNode(playerId, nodeId);
    if (!entry) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `laundering node ${nodeId} is not a player-owned Stage-1 laundering node.`,
      });
    }
    return entry;
  }

  /**
   * `GET /v1/operational/laundering/:nodeId/pipeline` — the requesting player's qualitative PIPELINE OVERVIEW for the
   * chain that contains `nodeId` (Phase 2b, P5/R2.2): the ordered stages (by stage_index), each with its cleanliness
   * BAND (the stage_index-derived pipeline cleanliness mapped via System 8's CleanlinessBucket — never the raw float),
   * a terminal flag, and a HAS_CASH presence flag (whether cash is buffered at that stage — never the raw cents). node
   * not the player's → 404. Requires a PLAYER JWT.
   */
  @Get('operational/laundering/:nodeId/pipeline')
  @UseGuards(JwtAuthGuard)
  async pipeline(
    @Param('nodeId', UuidParam) nodeId: string,
    @Req() req: RequestWithAccount,
  ): Promise<LaunderingPipelineProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const entry = await this.projection.projectPipeline(playerId, nodeId);
    if (!entry) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `laundering node ${nodeId} is not a player-owned laundering node.`,
      });
    }
    return entry;
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

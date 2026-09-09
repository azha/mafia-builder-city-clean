// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-14-exception-queue-design.md §4-T4 (the ExceptionsController —
//             GET /v1/exceptions/queue [the band-projected pending list] + POST /v1/exceptions/:id/resolve) +
//             docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T2 (resolve dispatches `method`
//             through the ExceptionEffectRegistry — ONE_TIME / ESCALATE / ADD_RULE / REPAIR / BRIBE / LAY_LOW; the
//             response gains a qualitative `outcome` enum) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) +
//             P5 (R2.2 — the queue surfaces only bands + player-readable text, never raw scalars)
//             -- session:2026-06-09 (Phase-14 T4 — list + resolve endpoints; Phase-16 — the effect-registry resolve) --
//
// `ExceptionsController` — the PLAYER-FACING Exception Queue API (the canonical primary verb, 05 §funnel):
//   - GET  /v1/exceptions/queue        → the requesting player's PENDING cards, R2.2 band-projected.
//   - POST /v1/exceptions/:id/resolve  → resolve ONE owned pending card. Body { method, chosen_action_id }.
//
// PLAYER RESOLUTION (the SAME identity bridge as the economy / operational controllers / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT, enforces aud=GAME_BACK, and attaches `req.account` (account_id — from verified claims, NEVER
// the body, R-ID-3). The queue is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account
// link (player.account_id, filtered to PLAYER accounts) — verbatim the EconomyController.resolvePlayerId bridge.
//
// The GET returns the band projection (R2.2 — the EnvelopeInterceptor wraps it). The POST returns
// { resolved: true, outcome } where `outcome` is a qualitative result enum (no scalar leaked); the service validates the
// method (∈ the registered effect types ONE_TIME/ESCALATE/ADD_RULE/REPAIR/BRIBE/LAY_LOW → else 422) and the
// ownership (404) / pending (409) state.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { UuidParam } from '../common/param-pipes';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { ExceptionsService, type ResolveMethod } from './exceptions.service';
import type { ExceptionCardProjection, QueuePressureBand } from './exceptions.projection.service';
import { enumField, rejectUnknownFields, stringField } from '../common/param-pipes';
import { RESOLVE_METHODS } from './exceptions.projection.service';

/** GET /exceptions/escalations pagination bounds (mirrors `telemetry.controller.ts recent`'s clamp pattern). */
const ESCALATIONS_DEFAULT_LIMIT = 20;
const ESCALATIONS_MAX_LIMIT = 100;

/** POST /resolve body — the resolution method + the chosen candidate's id. Both are coerced to strings + validated by
 *  the service (an unknown method → 422; an un-addable candidate on ADD_RULE → 422). */
interface ResolveBody {
  method?: string;
  chosen_action_id?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ExceptionsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly exceptions: ExceptionsService,
  ) {}

  /**
   * `GET /v1/exceptions/queue` — the requesting player's PENDING exception cards, R2.2 band-projected (confidence/
   * priority/severity → bands; never the raw scalars). Requires a PLAYER JWT (GAME_BACK audience). A player with no
   * pending cards → an empty list. No token → 401 (the guard).
   *
   * P3-A C3 (design §5, ADDITIVE — the `exceptions` array's own per-card shape is byte-untouched):
   * `queue_pressure_band` (the worst per-lieutenant-scope band) + `backlog_badge` (the player-wide
   * total vs threshold) ride as NEW top-level SIBLING fields alongside `exceptions` — bands/booleans
   * only (R2.2), thresholds from getters.
   */
  @Get('exceptions/queue')
  @UseGuards(JwtAuthGuard)
  async queue(
    @Req() req: RequestWithAccount,
  ): Promise<{ exceptions: ExceptionCardProjection[]; queue_pressure_band: QueuePressureBand; backlog_badge: boolean }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const { cards, queuePressureBand, backlogBadge } = await this.exceptions.listQueue(playerId);
    return { exceptions: cards, queue_pressure_band: queuePressureBand, backlog_badge: backlogBadge };
  }

  /**
   * `GET /v1/exceptions/escalations?limit=&offset=` — P3-A C4 (D6, design §5 "Escalation surface"): the
   * requesting player's `escalated` cards, R2.2 band-projected, NEWEST FIRST, paginated. This IS the
   * canon "separate Escalation log for long-session review" — a PROJECTION over the existing
   * `exception_queue` rows (`resolution_status='escalated'`); NO new table (sub-decision #2 ratified).
   * `limit` defaults to 20, clamped to [1,100]; `offset` defaults to 0, clamped to ≥0 (mirrors
   * `telemetry.controller.ts`'s `recent` clamp convention). Requires a PLAYER JWT; no token → 401.
   */
  @Get('exceptions/escalations')
  @UseGuards(JwtAuthGuard)
  async escalations(
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ escalations: ExceptionCardProjection[]; total: number; limit: number; offset: number }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);

    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isNaN(parsedLimit) ? ESCALATIONS_DEFAULT_LIMIT : Math.min(Math.max(parsedLimit, 1), ESCALATIONS_MAX_LIMIT);
    const parsedOffset = Number.parseInt(offsetParam ?? '', 10);
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

    const { escalations, total } = await this.exceptions.listEscalations(playerId, limit, offset);
    return { escalations, total, limit, offset };
  }

  /**
   * `POST /v1/exceptions/:id/resolve` — resolve ONE owned, pending card. Body { method, chosen_action_id }: ONE_TIME →
   * resolved; ESCALATE → escalated; ADD_RULE → append the chosen candidate's rule to the lieutenant's script + re-attach
   * (compile-gated; a 422 leaves the card pending). The player_id is resolved from the JWT (never the body, R-ID-3).
   * 200 on success (the card is mutated in place, not created). 404 not owned / 409 already resolved / 422 bad method or
   * un-addable candidate (the service).
   */
  @Post('exceptions/:id/resolve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async resolve(
    @Param('id', UuidParam) id: string,
    @Body() body: ResolveBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ resolved: true; outcome: string }> {
    // TD-451 — le corps est VALIDÉ avant tout effet. Mesuré : `String(body?.chosen_action_id ?? '')`
    // acceptait un corps portant `action_id`, rendait 200, n'enseignait rien et CONSOMMAIT la carte.
    // ⚠️ Portée délibérément bornée à ce que le contrat permet de resserrer sans rien casser :
    //   · champ inconnu → 422 (mesuré : le client ET les 19 specs n'envoient que ces deux champs) ;
    //   · `chosen_action_id` vide ou absent → 422 (mesuré : AUCUNE spec n'en envoie de vide) ;
    //   · ⛔ on NE vérifie PAS que l'id désigne une action candidate — 2 specs envoient sciemment un
    //     id qui ne matche rien (`'x'`, `'anything'`) pour éprouver ESCALATE/ONE_TIME. Durcir là
    //     casserait un corps légitime, ce que ce lot s'interdit.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['method', 'chosen_action_id']);
    const chosenActionId = stringField(body as unknown as Record<string, unknown>, 'chosen_action_id');
    const method = enumField(RESOLVE_METHODS, body as unknown as Record<string, unknown>, 'method') as ResolveMethod;
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const outcome = await this.exceptions.resolve(playerId, String(id ?? ''), method, chosenActionId);
    return { resolved: true, outcome };
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

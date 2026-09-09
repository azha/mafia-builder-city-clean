// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T2 (POST
//             /v1/operational/grow-house/:id/plant — the cultivation PLANT action) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 — never raw cents/grams)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 2) --
//
// `GrowController` — the PLAYER-FACING grow_house cultivation API (T2/T4/T7):
//   - POST /v1/operational/grow-house/:id/plant { precursor_type }  → plant a growable precursor (→ a stage_1 grow_session).
//   - POST /v1/operational/grow-session/:id/tend                    → tend the in-progress grow (husbandry lever B, T4).
//   - GET  /v1/operational/grow-session/:id                         → the qualitative grow projection (R2.2 bands, T7).
//
// PLAYER RESOLUTION (the SAME identity bridge as AshAppointmentController / SpecializedLabController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the
// body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating POST returns plain `data` (the new grow_session id — NOT the raw seed cents / current tick); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The plant is subject to the existing IdempotencyInterceptor
// (a retried plant with the same Idempotency-Key replays the memorized response — no double-debit, no duplicate grow).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { GrowService } from './grow.service';
import { GrowProjectionService, type GrowSessionProjection } from './grow.projection.service';

/** POST /grow-house/:id/plant body — the player chooses which growable precursor to cultivate. */
interface PlantBody {
  precursor_type?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class GrowController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly grow: GrowService,
    private readonly projection: GrowProjectionService,
  ) {}

  /**
   * `POST /v1/operational/grow-house/:id/plant` — plant a growable precursor in a player-owned grow_house (T2). Body:
   * { precursor_type }. Validates the building is the player's owned grow_house (404 not owned / 409 WRONG_TYPE if not a
   * grow_house) AND the precursor is growable (422 if not plant-derived) AND no active grow on this building (409
   * ALREADY_GROWING), then debits the grounded seed cost atomically-guarded (409 INSUFFICIENT_FUNDS if too poor — no
   * state change) and INSERTs a stage_1 grow_session in the SAME tx. Returns { grow_session_id }. Requires a PLAYER JWT
   * (no token → 401). Supports Idempotency-Key (the global interceptor — a retried plant does not double-charge / double-create).
   */
  @Post('operational/grow-house/:id/plant')
  @HttpCode(201) // a NEW resource (the grow_session) is created → 201.
  @UseGuards(JwtAuthGuard)
  async plant(
    @Param('id', UuidParam) id: string,
    @Body() body: PlantBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ grow_session_id: string }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // TD-451 — mesuré : le client n'envoie que `precursor_type` (0 site de spec avec corps littéral).
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['precursor_type']);
    return this.grow.plant(playerId, id, String(body.precursor_type ?? ''));
  }

  /**
   * `POST /v1/operational/grow-session/:id/tend` — tend a player-owned in-progress grow_session (husbandry lever B, T4).
   * Validates the grow_session is the player's (404 RESOURCE_NOT_FOUND if not found / not owned) AND not completed (409
   * — a completed grow awaits harvest) AND not already tended in the current stage (409 ALREADY_TENDED). On success the
   * atomic guarded UPDATE banks one tend (tend_count + 1, tended_in_stage = current_stage). Returns { tended: true } (no
   * raw tend_count — R2.2). Requires a PLAYER JWT (no token → 401). Supports Idempotency-Key (the global interceptor — a
   * retried tend replays the memorized response; the per-stage guard also bounds the count to one per stage on its own).
   * 200 (no NEW resource is created — an existing grow_session is mutated in place).
   */
  @Post('operational/grow-session/:id/tend')
  @HttpCode(200) // no new resource — an existing grow_session is mutated → 200.
  @UseGuards(JwtAuthGuard)
  async tend(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ tended: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.grow.tend(playerId, id);
  }

  /**
   * `GET /v1/operational/grow-session/:id` — the requesting player's qualitative grow projection (T7, P5/R2.2): the
   * grow_stage_band (EARLY / MID / LATE / DONE) + the husbandry_band trajectory (WITHERED / ON_TRACK / THRIVING) + the
   * tend_due flag (is the current stage un-tended) — NEVER the raw tend_count / stage clock / harvest grams / heat. The
   * building's raid-risk band is REUSED from the building projection (GET /v1/operational/building/:id), not re-derived
   * here. Requires a PLAYER JWT (no token → 401). A grow_session that is not the player's / does not exist → 404
   * RESOURCE_NOT_FOUND (cross-player invisible — the SAME player-scope guard the tend action uses).
   */
  @Get('operational/grow-session/:id')
  @UseGuards(JwtAuthGuard)
  async growProjection(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<GrowSessionProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectGrowSession(playerId, id);
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such grow_session for this player: ${id}.` });
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

// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C3-bis + ch09
//             `docs/tech/09_data_model/schema_anti_cheat.md §9.1` (routes REUSE — the checklist's own
//             "route joueur non spécifiée" is WRONG, §10.6 of the périmètre spec: ch09 §9.1 already
//             specifies these 3 routes; this lot follows ch09, not the checklist).
//             -- W1.2-a C3-bis — 2026-09-02 --
//
// `AppealController` — the PLAYER-FACING appeal API:
//   POST /v1/me/appeals      — submit an appeal against one of THIS player's own enforcement actions.
//   GET  /v1/me/appeals      — this player's appeals (Self projection).
//   GET  /v1/me/appeals/:id  — one appeal's detail (Self projection; 404 if not this player's own).
//
// PLAYER RESOLUTION: `resolvePlayerId` below is a VERBATIM copy of `InspectionQueueController`'s own
// private method (`inspection.controller.ts:180-189`), the closest domain neighbor — C4 of THIS SAME
// lot edits that exact file. §6 of the périmètre spec measured 2 live forms for the account_id →
// player_id bridge (`PlayerIdentityService`, 5 files, vs. this private recopied method, ~44 controllers)
// and found no established convention; this controller takes the dominant form (44 sites) AND the one
// its nearest sibling in this SAME lot already uses — see `implementation-notes.md` §Deviations
// D-C3bis-identity for why `PlayerIdentityService` (available "for free" via `AuthModule`, already
// imported here for `JwtAuthGuard`) was NOT taken instead.
//
// ⛔ Projection: `AppealStatusSelfProjection` = `{appeal_id, state, submitted_at, decided_at, outcome}`
// on ALL THREE routes, uniformly — `reason_text`/`decision_reason` NEVER leave `AppealCaseRepository`
// toward this controller (see that file's own header). This is NARROWER than ch09 §9.1's own prose for
// `GET /:id` ("Echo `reason_text` propre") — a direct instruction from this lot's brief, cited verbatim
// in `implementation-notes.md` §Deviations D-C3bis-projection, which this lot follows over the ch09 row.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { UuidParam, rejectUnknownFields, stringField, uuidField } from '../../common/param-pipes';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { AppealCaseService } from './appeal.service';
import type { AppealStatusSelfProjection } from './appeal.repository';

interface SubmitAppealBody {
  enforcement_action_id?: string;
  reason_text?: string;
}

function toJson(p: AppealStatusSelfProjection) {
  return {
    appeal_id: p.appeal_id,
    state: p.state,
    submitted_at: p.submitted_at,
    decided_at: p.decided_at,
    outcome: p.outcome,
  };
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class AppealController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly appeals: AppealCaseService,
  ) {}

  /**
   * `POST /v1/me/appeals` (ch09 §9.1). Body: `{ enforcement_action_id: uuid, reason_text: string }`.
   * 404 `RESOURCE_NOT_FOUND` if the action doesn't exist OR isn't this player's own (IDOR, §12
   * C3-bis's ⛔ — never 403). 409 `RESOURCE_STATE_CONFLICT` on a second appeal for the same action
   * (`UNIQUE(enforcement_action_id)`, migration 0011). 201 (a new `appeal_case` row is created).
   */
  @Post('me/appeals')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async submit(@Body() body: SubmitAppealBody, @Req() req: RequestWithAccount) {
    const raw = body as unknown as Record<string, unknown>;
    rejectUnknownFields(raw, ['enforcement_action_id', 'reason_text']);
    const enforcementActionId = uuidField(raw, 'enforcement_action_id');
    const reasonText = stringField(raw, 'reason_text');

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    const appeal = await this.appeals.submit(playerId, enforcementActionId, reasonText);
    return { appeal: toJson(appeal) };
  }

  /** `GET /v1/me/appeals` (ch09 §9.1) — this player's appeals, newest first, Self projection. */
  @Get('me/appeals')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount) {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    const appeals = await this.appeals.listSelf(playerId);
    return { appeals: appeals.map(toJson) };
  }

  /** `GET /v1/me/appeals/:id` (ch09 §9.1) — 404 if not this player's own (IDOR, never 403). */
  @Get('me/appeals/:id')
  @UseGuards(JwtAuthGuard)
  async getOne(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount) {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    const appeal = await this.appeals.getSelf(playerId, id);
    return { appeal: toJson(appeal) };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge).
   *  VERBATIM copy of `InspectionQueueController#resolvePlayerId` — see this file's own header. */
  private async resolvePlayerId(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}

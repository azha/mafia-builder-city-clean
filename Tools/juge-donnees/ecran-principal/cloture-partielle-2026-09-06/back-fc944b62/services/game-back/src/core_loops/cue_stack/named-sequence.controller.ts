// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C5 (endpoints
//             save/list/apply)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §15.1 —
//             `POST /v1/cue-stack/named-sequences` + `GET /v1/cue-stack/named-sequences` +
//             `POST /v1/cue-stack/named-sequences/:id/apply`.
//             Pattern (PLAYER RESOLUTION): `cue-stack.controller.ts#resolvePlayerId` — the SAME
//             per-controller account_id→player_id bridge (no shared extraction, this codebase's
//             convention).
//             — P3-D C5 — 2026-07-14
//
// `NamedSequenceController` — the 3 Loop 6 named-sequence routes, ALL gated by
// `NamedSequenceService#assertUnlocked` (403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` below tier 2).

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
import { NamedSequenceService, type NamedSequenceView } from './named-sequence.service';
import type { CueStackView } from './cue-stack.service';

interface SaveBody {
  name?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class NamedSequenceController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly namedSequences: NamedSequenceService,
  ) {}

  /**
   * `POST /v1/cue-stack/named-sequences` (design §8, D7) — snapshot the player's CURRENT
   * pending/committed stack into a NEW named template. 201 (a genuine new resource — never an upsert,
   * unlike `POST /v1/cue-stack/compose`). 409 `RESOURCE_STATE_CONFLICT` (nothing to snapshot) /
   * `NAMED_SEQUENCE_CAP_REACHED` (I4) / `NAMED_SEQUENCE_NAME_TAKEN` (D7 UNIQUE). 403
   * `NAMED_SEQUENCE_UNLOCK_REQUIRED` below tier 2.
   */
  @Post('cue-stack/named-sequences')
  @HttpCode(201) // a NEW resource (the named sequence row) is created — 201.
  @UseGuards(JwtAuthGuard)
  async save(@Body() body: SaveBody, @Req() req: RequestWithAccount): Promise<NamedSequenceView> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['name']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.namedSequences.save(playerId, body.name);
  }

  /** `GET /v1/cue-stack/named-sequences` (design §15.1) — every saved template, oldest-first. */
  @Get('cue-stack/named-sequences')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount): Promise<{ sequences: NamedSequenceView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const sequences = await this.namedSequences.list(playerId);
    return { sequences };
  }

  /**
   * `POST /v1/cue-stack/named-sequences/:id/apply` (design §8 — "one-tap auto-queue") — full re-compose
   * from the template, REVALIDATED against today's state (REUSE `CueStackService.compose` verbatim). 200
   * (an UPSERT of the player's singleton pending stack — the SAME `compose` semantics/status code, C2).
   * 404 `RESOURCE_NOT_FOUND` (unknown/foreign id). Any per-slot validation failure (vanished target,
   * reserved type, cyclic deps) surfaces the SAME 422 codes a fresh compose would (C2) — ZERO partial
   * apply (the validation pipeline throws BEFORE any row is written).
   */
  @Post('cue-stack/named-sequences/:id/apply')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async apply(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<CueStackView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.namedSequences.apply(playerId, id);
  }

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

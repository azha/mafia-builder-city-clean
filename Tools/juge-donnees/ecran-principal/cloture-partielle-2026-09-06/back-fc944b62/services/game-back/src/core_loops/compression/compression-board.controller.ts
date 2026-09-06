// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (endpoints:
//             POST /v1/compression/engage · GET /v1/compression/board ·
//             POST /v1/compression/board/problems/:id/decide)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15
//             (endpoint table).
//             Pattern: `CompressionController` (the SAME `resolvePlayerId` account->player bridge,
//             VERBATIM — no shared extraction across controllers, this codebase's own convention). NOT
//             merged into that C6 file — a SEPARATE controller keeps every C7 endpoint additive with
//             zero touch to the C6 file (`compression.controller.ts` stays byte-unchanged this chunk).
//             — P3-E C7 — 2026-07-18
//
// `CompressionBoardController` — the 3 C7 player-facing Loop 9 board routes. `GET /v1/compression/state`
// (design §15, the bucket-safe wall) is DEFERRED to C8 (design §16's own dedicated leak-scan chunk) — out
// of THIS chunk's scope.

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
import { CompressionBoardService, type BoardView, type DecideChoice, type DecideOutcome, type EngageOutcome } from './compression-board.service';

interface DecideBody {
  choice?: string;
}

const VALID_CHOICES: readonly DecideChoice[] = ['skip', 'resolve', 'dismiss'];

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CompressionBoardController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly board: CompressionBoardService,
  ) {}

  /** `POST /v1/compression/engage` (§9.2b, voluntary). 404 `RESOURCE_NOT_FOUND` if no open `'warning'`
   *  cycle exists for this player. */
  @Post('compression/engage')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async engage(@Req() req: RequestWithAccount): Promise<{ engaged: true; compression_event_id: string }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const result: EngageOutcome = await this.board.engageVoluntary(playerId);
    return { engaged: true, compression_event_id: result.compressionEventId! };
  }

  /** `GET /v1/compression/board` (§15/§10.1) — the player's OWN active-cycle entries (qualitative tier +
   *  target_ref, own-counts `decisions_used`/`decisions_remaining`). 404 if no active board. */
  @Get('compression/board')
  @UseGuards(JwtAuthGuard)
  async getBoard(@Req() req: RequestWithAccount): Promise<BoardView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.board.getBoard(playerId);
  }

  /** `POST /v1/compression/board/problems/:id/decide` (§10.2, I7). `{choice: 'skip'|'resolve'|'dismiss'}`. */
  @Post('compression/board/problems/:id/decide')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async decide(@Param('id', UuidParam) entryId: string, @Body() body: DecideBody, @Req() req: RequestWithAccount): Promise<DecideOutcome> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['choice']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const choice = body.choice;
    if (!choice || !VALID_CHOICES.includes(choice as DecideChoice)) {
      throw new ApiError('VALIDATION_FAILED', { message: `choice must be one of ${VALID_CHOICES.join(' | ')} (got "${choice}").` });
    }
    return this.board.decide(playerId, entryId, choice as DecideChoice);
  }

  /** account_id → player_id bridge (VERBATIM every sibling controller's own per-controller helper). */
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

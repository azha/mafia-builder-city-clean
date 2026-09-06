// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.6 (the resolve endpoint —
//             POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve { chosen: 'A'|'B' } → applies the chosen
//             option's effect + records the player_decision) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17
//             JwtAuthGuard (req.account → player_id) -- Phase-19 L1a Task 6 --
//
// `AutonomyReportsController` — the PLAYER-FACING autonomy-report resolve API. MIRRORS ExceptionsController's identity
// bridge EXACTLY: the JwtAuthGuard verifies the bearer JWT (aud=GAME_BACK) and attaches `req.account`; the controller
// resolves account_id → player_id via the 1-1 Player↔Account link (NEVER the body, R-ID-3), then delegates to the service.
// The POST returns { resolved: true, outcome } where `outcome` is the handler's qualitative result enum (no scalar leaked).
// 200 on success; 404 not owned / no such issue; 409 already resolved (the service).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { ApiError } from '../../../protocol/api-error';
import { UuidParam, rejectUnknownFields } from '../../../common/param-pipes';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../../auth/authenticated-request';
import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { account } from '../../../db/schema/account';
import { player } from '../../../db/schema/player';
import { AutonomyReportsService } from './autonomy-reports.service';
import type { AutonomyReportView } from './autonomy-reports.projection';

/** POST /resolve body — the chosen option side (A or B). A MISSING chosen defaults to 'A'; a PRESENT-but-garbage value
 *  (neither 'A' nor 'B') is rejected with 422 (validated below). */
interface ResolveBody {
  chosen?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class AutonomyReportsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly reports: AutonomyReportsService,
  ) {}

  /** `GET /v1/autonomy-reports` — the requesting player's OPEN reports (R2.2 — buckets/texts only). */
  @Get('autonomy-reports')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount): Promise<{ reports: AutonomyReportView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return { reports: await this.reports.listOpen(playerId) };
  }

  /**
   * `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` — resolve ONE issue on an owned report. Body
   * { chosen: 'A'|'B' } — a MISSING chosen defaults to 'A'; a PRESENT-but-invalid value (neither 'A' nor 'B') → 422
   * VALIDATION_FAILED (the repo's 422-on-bad-input convention, never a silent default). Applies the chosen option's effect
   * (the matching operational action) + records the per-issue player_decision (the report closes once every issue is
   * decided). The player_id is resolved from the JWT (never the body, R-ID-3). 200 on success / 404 not owned or no such
   * issue / 409 already resolved (the service).
   */
  @Post('autonomy-reports/:reportId/issues/:issueId/resolve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async resolve(
    @Param('reportId', UuidParam) reportId: string,
    @Param('issueId') issueId: string,
    @Body() body: ResolveBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ resolved: true; outcome: string }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // A MISSING chosen defaults to 'A' (the valid no-body path); a PRESENT-but-invalid value → 422 (never silently 'A').
    // TD-451 — un champ INCONNU ne doit pas être ignoré : ici `chosen` ABSENT vaut 'A' par contrat
    // (le chemin sans corps, 2 sites de spec l'empruntent), donc un corps portant `choice:'B'` aurait
    // choisi 'A' EN SILENCE et consommé l'issue. Mesuré : client et 7 sites de spec n'envoient que
    // `chosen` ; le corps VIDE reste accepté (le helper ne rejette qu'une clé présente hors liste).
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['chosen']);
    const raw = body?.chosen;
    if (raw !== undefined && raw !== 'A' && raw !== 'B') {
      throw new ApiError('VALIDATION_FAILED', { message: `chosen must be 'A' or 'B', got "${raw}".`, details: { param: 'chosen' } });
    }
    const chosen = raw === 'B' ? 'B' : 'A';
    const outcome = await this.reports.resolveIssue(playerId, String(reportId ?? ''), String(issueId ?? ''), chosen);
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

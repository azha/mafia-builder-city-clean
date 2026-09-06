// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C4 (endpoint
//             `POST /v1/friction/nodes/:id/decommission` routé `governor.commit` + flip catalogue code 11)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §3.1 (the
//             governor wrap — cap 1/session, STRUCTURAL_CAP_EXHAUSTED REUSE) + §6.1 (the flow, verbatim).
//             Pattern: `real-estate.controller.ts#purchase`/`#convert` (the SAME `governor.commit` wrap
//             shape — `ctx.after` a FUNCTION of the mutation's result, since `freedBlockId` is only known
//             post-mutation) + `annealing.controller.ts#resolvePlayerId` (the account_id→player_id bridge
//             VERBATIM, no shared extraction across controllers, this codebase's own convention).
//             — P3-E C4 — 2026-07-17
//
// `DecommissionController` — the FIRST (and only, this chunk) player-facing Loop 8 decommission route.
// R2.2: the response is minimal + qualitative-only (`freed_block_id` is an int block id — a soft-ref
// identity, not a scalar/cost; `neighbor_count` is a count, R2.2-safe like every OTHER count surfaced
// elsewhere in this codebase, e.g. `neighbor_count` on the design's OWN §6.1 panel spec). The raw
// `costCentsCharged`/`buildingType` NEVER leave the repository/service layer.

import { Body, Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
import { DecommissionService, type DecommissionServiceResult } from './decommission.service';

interface DecommissionBody {
  confirm?: boolean;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DecommissionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly decommission: DecommissionService,
    // P3-E C4 (design §3.1) — the Loop 10 governor: decommission is the code-11 STRUCTURAL site (cap
    // 1/session like every other structural site, mirrors `RealEstateController`'s own C5 wrap).
    private readonly governor: StructuralDecisionGovernorService,
  ) {}

  /**
   * `POST /v1/friction/nodes/:buildingId/decommission` — design §6.1 step 2. Body: `{confirm: true}`
   * (422 `DEMOLITION_CONFIRM_REQUIRED` otherwise, `DecommissionService`'s own guard). Governed by the
   * Loop 10 structural cap (409 `STRUCTURAL_CAP_EXHAUSTED` on a 2nd structural commit this session).
   * Response: `{ decommissioned: true, freed_block_id, neighbor_count }` (R2.2 — no raw cost/type).
   */
  @Post('friction/nodes/:buildingId/decommission')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) — mirrors convert()'s own 200.
  @UseGuards(JwtAuthGuard)
  async decommissionNode(
    @Param('buildingId', UuidParam) buildingId: string,
    @Body() body: DecommissionBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ decommissioned: true; freed_block_id: number; neighbor_count: number }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['confirm']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const confirm = body.confirm === true;

    const result = await this.governor.commit<DecommissionServiceResult>(
      playerId,
      StructuralDecisionType.NODE_DECOMMISSION,
      {
        before: { entity: 'building', id: buildingId },
        after: (r: DecommissionServiceResult) => ({ entity: 'building', id: r.buildingId, freed_block_id: r.freedBlockId }),
      },
      () => this.decommission.decommission(playerId, buildingId, confirm),
    );

    return { decommissioned: true, freed_block_id: result.freedBlockId, neighbor_count: result.neighborCount };
  }

  /** account_id → player_id bridge (the JwtAuthGuard identity, VERBATIM every sibling controller's own
   *  per-controller helper — no shared extraction, this codebase's own convention). */
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

// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C5 ("Loop 10 catalogue
//             append CAPABILITY_ADOPT(16) LIVE + site POST /v1/meta/horizon/adopt (R12; boot strict-
//             check green)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §9 ("POST
//             /v1/meta/horizon/adopt {card_id} → governor.commit(playerId, CAPABILITY_ADOPT(16), ctx,
//             mutateFn)").
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §10 (R12 — the code-15
//             TASK_RECALL append template, mirrored exactly at code 16; site =
//             "meta_progression/horizon-adoption.controller.ts#adopt").
//             Pattern (governor.commit wrap at the controller layer): `meta-progression.controller.ts
//             #graduate`/`#recall` — the SAME shape (site declares {before, after}, mutateFn is the SAME
//             service call the site would make anyway). Pattern (player identity bridge, `resolvePlayerId`
//             duplicated per-controller — this codebase's own established convention, NEVER a shared
//             helper): `horizon-feed.controller.ts#resolvePlayerId` (copied verbatim).
//             — P3-G C5 — 2026-07-20
//
// `HorizonAdoptionController` — the PLAYER-FACING `POST /v1/meta/horizon/adopt` route, a SIBLING
// controller inside `BudgetsHorizonModule` (mirrors `HorizonFeedController`'s own R7/DD-G1 "never an edit
// to MetaProgressionController/DelegationRatchetModule" posture — a DIFFERENT base path (`horizon/adopt`,
// not `horizon-feed/*`) gets its OWN controller file rather than an addition to `HorizonFeedController`,
// keeping each controller's own route family self-describing). Loop-10-GOVERNED (`CAPABILITY_ADOPT`,
// code 16 — ★#2 RATIFIED structural). Requires a PLAYER JWT.

import { Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { rejectUnknownFields, uuidField } from '../common/param-pipes';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { StructuralDecisionGovernorService } from '../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../progression/loop10/structural-decision-catalogue';
import { AdoptionService, type AdoptionResult } from './adoption.service';

/** POST /v1/meta/horizon/adopt body (design §9). */
interface AdoptBody {
  card_id?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HorizonAdoptionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly adoption: AdoptionService,
    private readonly governor: StructuralDecisionGovernorService,
  ) {}

  /**
   * `POST /v1/meta/horizon/adopt` — adopt an owned, adoptable horizon card (design §9). Body:
   * { card_id }. Server-re-validates EVERYTHING (never trusts the client) — unowned/unknown card (404),
   * regressed predicates (422 `PREDICATES_NO_LONGER_MET`), insufficient free_units (422
   * `VALIDATION_FAILED`), already-adopted/dismissed card or a lost race (409 — the winner gate).
   * Loop-10-GOVERNED (`CAPABILITY_ADOPT`, ★#2 RATIFIED structural) — a same-session 2nd structural
   * action 409s `STRUCTURAL_CAP_EXHAUSTED` exactly like every other structural site. Returns
   * `{ adopted: true, card_id, capability_id, capability_key }`. 200 (a mutation on the existing card
   * row, not a creation — mirrors `graduate`'s/`recall`'s own convention). Requires a PLAYER JWT.
   * Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/horizon/adopt')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async adopt(@Body() body: AdoptBody, @Req() req: RequestWithAccount): Promise<AdoptionResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['card_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — card_id: uuid (possibility_horizon_cards lookup, unguarded before this — measured
    // 500 pre-C1, one of the 8 "non confondus").
    const cardId = uuidField(body as unknown as Record<string, unknown>, 'card_id');
    return this.governor.commit(
      playerId,
      StructuralDecisionType.CAPABILITY_ADOPT,
      {
        before: { entity: 'possibility_horizon_cards', card_id: cardId },
        after: (r: AdoptionResult) => ({
          entity: 'possibility_horizon_cards',
          card_id: r.card_id,
          capability_id: r.capability_id,
          action: 'adopted',
        }),
      },
      () => this.adoption.executeAdoption(playerId, cardId),
    );
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge —
   *  copied verbatim from `horizon-feed.controller.ts`/`meta-progression.controller.ts`'s own established
   *  idiom, this codebase's per-controller convention, never a shared helper). 404 if none. */
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

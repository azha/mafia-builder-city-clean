// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C4 ("`POST /v1/meta/horizon/
//             advance-tier {lieutenant_id}` -> counter gate -> monotone UPDATE -> counter reset ->
//             `HorizonTierAdvancedEvent`").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.6/D6.
//             Pattern (a SEPARATE controller file per concern even when it shares the SAME `/v1/meta/
//             horizon/` base path — never folded into a sibling controller): `horizon-adoption.controller.ts`
//             (`POST /v1/meta/horizon/adopt`, its OWN file, distinct from `execution-plan.controller.ts`'s
//             `POST/GET /v1/meta/horizon/execution-plans` despite the shared prefix). Pattern (player
//             identity bridge `resolvePlayerId`, duplicated per-controller): `execution-plan.controller.ts
//             #resolvePlayerId` / `horizon-adoption.controller.ts#resolvePlayerId` (copied verbatim).
//             — P3-H C4 — 2026-07-24
//
// `HorizonTierAdvancementController` — the PLAYER-FACING `POST /v1/meta/horizon/advance-tier` route
// (design §6.6/D6). NOT Loop-10-governed (D6 — "NOT session-cap-gated ... the ScriptStabilityCounter IS
// the ratchet"). Requires a PLAYER JWT. Always registered (a real player surface, mirrors
// `ExecutionPlanController`'s always-on posture).

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
import { HorizonTierAdvancementService, type AdvanceTierResult } from './horizon-tier-advancement.service';

/** `POST /v1/meta/horizon/advance-tier` body (design §6.6/D6 verbatim — `{lieutenant_id}`). */
export interface AdvanceTierBody {
  lieutenant_id?: unknown;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('VALIDATION_FAILED', { message: `${field} must be a non-empty string.` });
  }
  return value;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class HorizonTierAdvancementController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly advancement: HorizonTierAdvancementService,
  ) {}

  /**
   * `POST /v1/meta/horizon/advance-tier` — advance the caller's (player-shared, D1) `decision_horizon_tier`
   * by exactly one, gated by the NAMED lieutenant's `ScriptStabilityCounter` (design §6.6/D6). Body:
   * `{lieutenant_id}`. 422 `STABILITY_COUNTER_INSUFFICIENT` (counter below threshold, no write); 409
   * `HORIZON_TIER_ALREADY_MAXIMUM` (already at tier 3); 200 `{tier}` on success (mirrors `ExecutionPlanController
   * #createPlan`'s own "a mutation, 200" convention). NOT Loop-10-governed. Requires a PLAYER JWT.
   * Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/horizon/advance-tier')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async advanceTier(
    @Body() body: AdvanceTierBody,
    @Req() req: RequestWithAccount,
  ): Promise<AdvanceTierResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['lieutenant_id']);

    // L0.3 (D5) — lieutenant_id: uuid (measured 500 pre-C1, one of the 8 "non confondus").
    const lieutenantId = uuidField(body as unknown as Record<string, unknown>, 'lieutenant_id');
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.advancement.advance(playerId, lieutenantId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (copied verbatim from
   *  `execution-plan.controller.ts`/`horizon-adoption.controller.ts`'s own established idiom, this
   *  codebase's per-controller convention, never a shared helper). 404 if none. */
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

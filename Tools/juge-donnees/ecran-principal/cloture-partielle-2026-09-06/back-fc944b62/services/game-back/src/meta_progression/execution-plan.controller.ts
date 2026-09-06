// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C2 ("Decision Horizon Lock:
//             ExecutionPlan creation + tier-column activation").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.1 (`POST
//             /v1/meta/horizon/execution-plans`) + §10 (`GET .../execution-plans?lieutenant_id=`).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §15/R14 ("player routes:
//             ... every `meta/*` path segment is a PER-HANDLER decorator" — the SAME convention followed
//             here, NOT a class-level `'meta'` prefix).
//             Pattern (player identity bridge `resolvePlayerId`, duplicated per-controller — this
//             codebase's own established convention, NEVER a shared helper): `horizon-adoption.
//             controller.ts#resolvePlayerId` (copied verbatim).
//             — P3-H C2 — 2026-07-24
//
// `ExecutionPlanController` — the PLAYER-FACING `POST /v1/meta/horizon/execution-plans` +
// `GET /v1/meta/horizon/execution-plans?lieutenant_id=` routes, a SIBLING controller inside
// `VerticalHorizonModule` (mirrors `HorizonAdoptionController`'s own "a DIFFERENT base path gets its OWN
// controller file" posture). NOT Loop-10-governed (D2/D10 — plan creation is tactical). Requires a PLAYER
// JWT. Always registered (a real player surface, mirrors `HorizonFeedController`'s always-on posture).

import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { UuidQuery, rejectUnknownFields } from '../common/param-pipes';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import {
  ExecutionPlanService,
  type CreateExecutionPlanBody,
  type ExecutionPlanProjection,
  type ExecutionPlanTimelineProjection,
} from './execution-plan.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ExecutionPlanController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly plans: ExecutionPlanService,
  ) {}

  /**
   * `POST /v1/meta/horizon/execution-plans` — create an ExecutionPlan wrapping an owned, LIVE standing
   * order (design §6.1). Body: { standing_order_id, execution_window, deviation_rule }. Server-re-validates
   * EVERYTHING: nonexistent order (404), not-owned (403 — the plan's own explicit falsifiable), not
   * active/expired (409), `execution_window` exceeding the tier's `cycles_ahead` (422
   * `EXECUTION_WINDOW_EXCEEDS_TIER`), `deviation_rule` not unlocked at the tier (422
   * `DEVIATION_MODE_NOT_AVAILABLE`). 200 on success (mirrors `HorizonAdoptionController#adopt`'s own "a
   * mutation, 200" convention — an ExecutionPlan wraps an EXISTING standing order, it does not create one).
   * NOT Loop-10-governed. Requires a PLAYER JWT. Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/horizon/execution-plans')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async createPlan(
    @Body() body: CreateExecutionPlanBody,
    @Req() req: RequestWithAccount,
  ): Promise<ExecutionPlanProjection> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['standing_order_id', 'execution_window', 'deviation_rule']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.plans.createPlan(playerId, body);
  }

  /**
   * `GET /v1/meta/horizon/execution-plans?lieutenant_id=` — the per-lieutenant timeline projection (design
   * §10/D5/D15, P3-H C8 final shape): every plan (any status) the caller holds for that lieutenant + its
   * slots (statuses only — R2.2, never the raw counter / the constraint sets / the compiled rule), PLUS the
   * `StabilityBucketEnum` (`stability_bucket`) + the "tier chip" (`decision_horizon_tier`) + its derived
   * `cycles_ahead` (design's own canon-sanctioned numerics — see `ExecutionPlanService.listTimeline`'s own
   * header for the full contract). `lieutenant_id` is REQUIRED (422 `VALIDATION_FAILED` when missing — the
   * literal `POST/GET .../execution-plans?lieutenant_id=` contract). An unowned/nonexistent `lieutenant_id`
   * returns `plans: []` + `stability_bucket: 'LOW'` (never a 404 — see the service's own header for why this
   * is the SAFER posture). Requires a PLAYER JWT.
   */
  @Get('meta/horizon/execution-plans')
  @UseGuards(JwtAuthGuard)
  async listTimeline(
    // L0.3 (D5) — UuidQuery: absent/blank -> undefined (the "required" 422 below is unchanged); a
    // PRESENT malformed value now 422s here instead of reaching listTimeline's DB read unguarded
    // (measured 500 pre-C1).
    @Query('lieutenant_id', UuidQuery) lieutenantId: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<ExecutionPlanTimelineProjection> {
    if (lieutenantId === undefined) {
      throw new ApiError('VALIDATION_FAILED', { message: 'lieutenant_id query param is required.' });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.plans.listTimeline(playerId, lieutenantId);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge —
   *  copied verbatim from `horizon-adoption.controller.ts`/`meta-progression.controller.ts`'s own
   *  established idiom, this codebase's per-controller convention, never a shared helper). 404 if none. */
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

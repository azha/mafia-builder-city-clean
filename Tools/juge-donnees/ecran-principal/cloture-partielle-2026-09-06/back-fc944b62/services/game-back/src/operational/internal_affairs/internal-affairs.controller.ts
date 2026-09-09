// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.3-04d-player-surface-design.md §3 C3/C4
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §Player observable signals (:111-117) + §Mitigations (:119-125)
//             Convention precedent: engagements.controller.ts (W6.1) — @Controller({version}),
//               `me/…` paths, JwtAuthGuard, per-controller resolvePlayerId (never a shared helper).
//             — W6.3 C3 — 2026-08-13 — / C4 — 2026-08-13 —
//
// `InternalAffairsController` — the PLAYER-FACING routes for §3 Internal Affairs (04d-B).
//
// C3 — `GET /v1/me/internal-affairs/actors` (maillon d'énumération + route): REUSE
//   `IAProjectionService.listActorStatuses(playerId)` (NEW method) — enumerates the referents the
//   player OWNS (their `lawyers` + `recruitment_candidates` rows, EXACTLY the set
//   `_hasReferentAccess` recognizes) and derives each one's 4-state `ActorStatusIndicator`.
//
// C4 — `POST /v1/me/internal-affairs/actors/:ref/intel` — Fixer-mediated intel-op
//   (`IAIntelPurchaseService.buyApproxBandReveal`, now OWNER-SCOPED — the maillon, same commit).
//   The route NEVER accepts a raw `internal_affairs_targets.target_id` from the client — only the
//   `:ref` (a referent the player names) + `actor_type`; the ownership resolution happens INSIDE
//   the service, BEFORE any debit (W6.3 §1.3.3 — THE point of sécurité).
//
// D7 (same convention as engagements.controller.ts): `playerId` comes ONLY from the verified JWT.
// R2.2/P5: `ActorSummary` carries ONLY `actorRef`/`actorType`/`status` — NO `suspicion_level`,
//   `cooperators`, `weight_per_player`, `investigation_id`, `target_id` (grep-zero, IAProjectionService).
//   `IAIntelPurchaseResult` carries ONLY `purchaseId`/`band`/`costCents` — NEVER `suspicion_level`.
// Zero-regression: ADDITIVE only — new controller, no existing route/service/table touched.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, enumField, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { IAProjectionService, type ActorSummary } from './ia-projection.service';
import { IAIntelPurchaseService, type IAIntelPurchaseResult } from './ia-intel-purchase.service';
import type { IATargetType } from './ia-target.service';
import { iaTargetType } from '../../db/schema/internal_affairs';

/** `POST /v1/me/internal-affairs/actors/:ref/intel` body (C4). */
interface BuyIntelBody {
  actor_type?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InternalAffairsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: IAProjectionService,
    private readonly intelPurchase: IAIntelPurchaseService,
  ) {}

  /**
   * `GET /v1/me/internal-affairs/actors` — the requesting player's corrupt-actor roster (C3).
   * REUSE `IAProjectionService.listActorStatuses(playerId)` verbatim. Requires a PLAYER JWT.
   */
  @Get('me/internal-affairs/actors')
  @UseGuards(JwtAuthGuard)
  async listActors(@Req() req: RequestWithAccount): Promise<{ actors: ActorSummary[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const actors = await this.projection.listActorStatuses(playerId);
    return { actors };
  }

  /**
   * `POST /v1/me/internal-affairs/actors/:ref/intel` — Fixer-mediated intel-op (C4). `:ref` is an
   * `actorRef` the player names (a `lawyer_id` or `candidate_id`) — NEVER an
   * `internal_affairs_targets.target_id` (that pivot never leaves `IATargetService`).
   * `IAIntelPurchaseService.buyApproxBandReveal` resolves ownership FIRST (`resolveOwnedTarget`,
   * same commit) — 404 before any debit if `playerId` does not own `:ref`.
   */
  @Post('me/internal-affairs/actors/:ref/intel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async buyIntel(
    @Param('ref', UuidParam) actorRef: string,
    @Body() body: BuyIntelBody,
    @Req() req: RequestWithAccount,
  ): Promise<IAIntelPurchaseResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['actor_type']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — actor_type: enum, `iaTargetType.enumValues` (DF-11) — replaces the hand-mirrored
    // `IA_TARGET_TYPES` Set, same 5-member domain (`internal_affairs.ts:103-118`).
    const actorType = enumField(iaTargetType.enumValues, body as unknown as Record<string, unknown>, 'actor_type') as IATargetType;
    return this.intelPurchase.buyApproxBandReveal(playerId, actorRef, actorType);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity
   *  bridge — duplicated verbatim, the established per-controller convention, never shared). */
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

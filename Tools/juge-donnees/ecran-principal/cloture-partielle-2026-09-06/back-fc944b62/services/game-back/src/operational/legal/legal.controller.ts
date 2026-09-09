// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.3-04d-player-surface-design.md §3 C0/C1/C2
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 (G5)
//             Convention precedent: engagements.controller.ts (W6.1) — @Controller({version}),
//               `me/…` paths, JwtAuthGuard, per-controller resolvePlayerId (never a shared helper).
//             — W6.3 C0 — 2026-08-13 — / C1 — 2026-08-13 — / C2 — 2026-08-13 —
//
// `LegalController` — the PLAYER-FACING routes for the §2 Lawyer & Legal System (04d-A). This is
// the FIRST player-reachable surface for `legal_cases` / `lawyers` beyond the LAWYER_UP courier
// path (`distribution.controller.ts:153-155,170`, already LIVE — W6.3 §0 point 1: the chain was
// never dead, only the player's 5 follow-up ACTIONS on an already-open dossier had no route).
//
// C0 — `GET /v1/me/legal` (read): calls `LegalProjectionService.toLegalPanel(playerId)` verbatim
//   — no new query, no new writer. R2.2/P5 wall already enforced there (info_leak_total →
//   LeakBandBucket, burn_risk_score NEVER in the player panel).
//
// C1 — 4 non-Tier-3 actions (forms C ×4 — W6.3 §1.2): hire / setRetainer / reassignCase /
//   acceptPleaDeal. All 4 already exist as scoped LawyerService/LegalCaseService methods (W6a
//   C3/C4 joint-read hardening — `playerId` first argument, owner-or-404) with ZERO production
//   caller before this chunk (`_test` only). This controller IS the first one.
//   ★ `acceptPleaDeal` used to `throw new Error(...)` on both guard branches (a BARE Error →
//   `GlobalExceptionFilter`'s catch-all → 500 on a player route). Fixed in `legal-case.service.ts`
//   (same commit) to `ApiError('RESOURCE_NOT_FOUND' | 'RESOURCE_STATE_CONFLICT')` — SAME message
//   text preserved (the pre-existing `_test/legal/accept-plea-deal` route pattern-matches on it).
//
// C2 — `POST /v1/me/legal/cases/:id/payoff` (Tier-3 payoff): `LawyerService.issueTier3Payoff`.
//   ★ THE maillon that makes `internal_affairs_targets.target_type='lawyer'` LIVE in production
//   (W6.3 §1.3.1) — `issueTier3Payoff` emits `Tier3LawyerUsedEvent` (`lawyer.service.ts:491-497`),
//   consumed by `IATargetService.handleTier3LawyerUsed` → `recordCorruptUse(…, 'lawyer', …)`.
//   Before this route, `issueTier3Payoff` had ZERO production caller (W6.3 §1.3.1).
//
// D7 (same convention as engagements.controller.ts): `playerId` comes ONLY from the verified JWT
//   (`resolvePlayerId`, per-controller, never shared) — NEVER `@Headers('x-player-id')`. All 4
//   underlying service methods already do the OWNER-SCOPED joint read (W6a) — a caller who names
//   another player's `lawyerId`/`caseId` gets 404 `RESOURCE_NOT_FOUND` (existence-masking), never
//   403 (adversarial-game convention, D7).
//
// R2.2: the response is the projection (`LegalPanelView`) — never a raw `info_leak_total` /
//   `burn_risk_score` scalar.
// Zero-regression: ADDITIVE only — new controller, no existing route/service/table touched.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { LegalProjectionService } from './legal-projection.service';
import type { LegalPanelView } from './legal.types';
import { LawyerService } from './lawyer.service';
import { LegalCaseService } from './legal-case.service';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';

/** `POST /v1/me/legal/lawyers` body (C1 — hire). */
interface HireBody {
  tier?: unknown;
}

/** `PUT /v1/me/legal/lawyers/:id/retainer` body (C1 — setRetainer). */
interface RetainerBody {
  active?: unknown;
}

/** `POST /v1/me/legal/cases/:id/lawyer` body (C1 — reassignCase). */
interface ReassignBody {
  lawyer_id?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class LegalController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: LegalProjectionService,
    private readonly lawyerService: LawyerService,
    private readonly legalCaseService: LegalCaseService,
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  /**
   * `GET /v1/me/legal` — the requesting player's Legal panel (C0). REUSE
   * `LegalProjectionService.toLegalPanel(playerId)` verbatim — no new query, no new writer.
   * Requires a PLAYER JWT (no token → 401).
   */
  @Get('me/legal')
  @UseGuards(JwtAuthGuard)
  async read(@Req() req: RequestWithAccount): Promise<LegalPanelView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.projection.toLegalPanel(playerId);
  }

  /**
   * `POST /v1/me/legal/lawyers` — hire a Tier-2 (`boutique`) or Tier-3 (`corruption_pipeline`)
   * lawyer (C1). Tier-1 `public_defender` is auto-assigned only (createCase) → 400 (rejected by
   * `LawyerService.hire` itself, `lawyer.service.ts:116-122`). Atomic guarded debit — insufficient
   * cash → 402 (`HttpException`, mapped by `GlobalExceptionFilter`).
   */
  @Post('me/legal/lawyers')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async hire(@Body() body: HireBody, @Req() req: RequestWithAccount): Promise<LegalPanelView> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['tier']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — tier: enum, a NARROWER business subset of the 3-member `lawyerTier` pgEnum
    // (`legal.ts:69-73` — `public_defender` excluded by design, auto-assigned only) — kept
    // hand-written rather than `enumField(lawyerTier.enumValues, ...)`, which would wrongly ADMIT
    // `public_defender` here (DF-11 applies when the pgEnum's full domain IS the business domain;
    // here it is not).
    const tier = body?.tier;
    if (tier !== 'boutique' && tier !== 'corruption_pipeline') {
      throw new ApiError('VALIDATION_FAILED', {
        message: "tier must be 'boutique' or 'corruption_pipeline'.",
        details: { param: 'tier' },
      });
    }
    await this.lawyerService.hire(playerId, tier);
    return this.projection.toLegalPanel(playerId);
  }

  /**
   * `PUT /v1/me/legal/lawyers/:id/retainer` — toggle the monthly retainer arrangement for a
   * Tier-2/3 lawyer (C1). `LawyerService.setRetainer` is already OWNER-SCOPED (W6a C4) — a
   * `lawyerId` belonging to another player → 404, before anything is toggled.
   */
  @Put('me/legal/lawyers/:id/retainer')
  @UseGuards(JwtAuthGuard)
  async setRetainer(
    @Param('id', UuidParam) lawyerId: string,
    @Body() body: RetainerBody,
    @Req() req: RequestWithAccount,
  ): Promise<LegalPanelView> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['active']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (typeof body?.active !== 'boolean') {
      throw new ApiError('VALIDATION_FAILED', { message: 'active must be a boolean.', details: { param: 'active' } });
    }
    await this.lawyerService.setRetainer(playerId, lawyerId, body.active);
    return this.projection.toLegalPanel(playerId);
  }

  /**
   * `POST /v1/me/legal/cases/:id/lawyer` — reassign an active case to a different (higher-tier)
   * lawyer (C1). `LawyerService.reassignCase` is already OWNER-SCOPED on BOTH reads (W6a C4) — a
   * `caseId` OR `lawyer_id` belonging to another player → 404.
   */
  @Post('me/legal/cases/:id/lawyer')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async reassignCase(
    @Param('id', UuidParam) caseId: string,
    @Body() body: ReassignBody,
    @Req() req: RequestWithAccount,
  ): Promise<LegalPanelView> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['lawyer_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — lawyer_id: uuid (measured 500 pre-C1).
    const lawyerId = uuidField(body as unknown as Record<string, unknown>, 'lawyer_id');
    await this.lawyerService.reassignCase(playerId, caseId, lawyerId);
    return this.projection.toLegalPanel(playerId);
  }

  /**
   * `POST /v1/me/legal/cases/:id/plea` — accept a plea deal, resolving the case early (C1).
   * `LegalCaseService.acceptPleaDeal` is already OWNER-SCOPED (W6a C4). `gameMinute` is threaded
   * via `LieutenantRepository.getCurrentGameMinute` — the SAME per-repository clock convention
   * every other player-facing mutation in this codebase reads from (never a shared helper,
   * mirrors `engagements.controller.ts:151`).
   */
  @Post('me/legal/cases/:id/plea')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async acceptPleaDeal(
    @Param('id', UuidParam) caseId: string,
    @Req() req: RequestWithAccount,
  ): Promise<LegalPanelView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const gameMinute = await this.lieutenantRepo.getCurrentGameMinute(playerId);
    await this.legalCaseService.acceptPleaDeal(playerId, caseId, gameMinute);
    return this.projection.toLegalPanel(playerId);
  }

  /**
   * `POST /v1/me/legal/cases/:id/payoff` — Tier-3 corrupt-clerk payoff to dismiss a low-severity
   * charge (C2). `LawyerService.issueTier3Payoff` is already OWNER-SCOPED (W6a C3). ★ This IS the
   * maillon that makes `internal_affairs_targets.target_type='lawyer'` LIVE in production (W6.3
   * §1.3.1) — `issueTier3Payoff` emits `Tier3LawyerUsedEvent`, consumed by
   * `IATargetService.handleTier3LawyerUsed` → `recordCorruptUse`.
   */
  @Post('me/legal/cases/:id/payoff')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async issueTier3Payoff(
    @Param('id', UuidParam) caseId: string,
    @Req() req: RequestWithAccount,
  ): Promise<LegalPanelView> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const gameMinute = await this.lieutenantRepo.getCurrentGameMinute(playerId);
    await this.lawyerService.issueTier3Payoff(playerId, caseId, gameMinute);
    return this.projection.toLegalPanel(playerId);
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

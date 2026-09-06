// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C3 ("Player projection +
//             R2.2 wall (mastery surfaces)" — `GET /v1/meta/task-categories`) + C5 ("Catalogue:
//             TASK_RETIREMENT(7) flips live:true with its site POST /v1/meta/graduation").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §11 (the
//             GET endpoint contract) + §8.1 ("POST /v1/meta/graduation {category_id, lieutenant_id} →
//             governor.commit(playerId, TASK_RETIREMENT, ctx, mutateFn)") + 18 envelope/versioning
//             (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id, the SAME
//             `SessionController`/`ExceptionsController`/`ProgressionController` identity-bridge pattern).
//             Pattern (governor.commit wrap at the controller layer): `lieutenant.controller.ts#recruit`/
//             `#attachScript`/`#reassign` — the SAME shape (site declares `{before, after}`, `mutateFn`
//             is the SAME service call the site would make anyway).
//             — P3-F C3 — 2026-07-18 / C5 — 2026-07-19
//
// `MetaProgressionController` — the PLAYER-FACING meta-progression (Delegation Ratchet) API.
//   - GET /v1/meta/task-categories → the requesting player's org-overview projection (design §11; R2.2
//     inverted — closed-domain bands only, NEVER a raw mastery score / proficiency / debt / tick). Requires
//     a PLAYER JWT (no token → 401). Always 4 rows (the 4 LIVE categories, catalogue order) — even for a
//     player with zero `mastery_score` history (never an empty/sparse response, see the projection
//     service's own header).
//   - POST /v1/meta/graduation {category_id, lieutenant_id} → `GraduationService.executeGraduation`,
//     Loop-10-GOVERNED (`TASK_RETIREMENT`, structural site #10 — the RESERVED code P3-A itself named for
//     this lot). 200 on success (a mutation on the existing `mastery_score` row, not a resource creation —
//     the SAME "existing-row mutation → 200" convention `attachScript`/`reassign` use). Requires a PLAYER
//     JWT. Idempotency-Key supported (the global interceptor).
//
// PLAYER RESOLUTION: the SAME identity bridge as `SessionController`/`ExceptionsController`/
// `ProgressionController` — the JwtAuthGuard verifies the bearer JWT (aud=GAME_BACK) and attaches
// `req.account` (account_id — from verified claims, NEVER the body, R-ID-3); resolved to player_id via the
// 1-1 Player↔Account link (player.account_id, filtered to PLAYER accounts).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { IntParam, intField, rejectUnknownFields, uuidField } from '../common/param-pipes';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import {
  MetaProgressionProjectionService,
  deriveDelegatedSummaries,
  type TaskCategoryProjectionRow,
  type DelegatedCategorySummary,
} from './meta-progression.projection.service';
import { GraduationService, type GraduationResult } from './graduation.service';
import { PromotionLockService, type RecallResult, type RecallPreview } from './promotion-lock.service';
import { StructuralDecisionGovernorService } from '../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../progression/loop10/structural-decision-catalogue';

/** POST /v1/meta/graduation body (design §8.1). */
interface GraduationBody {
  category_id?: unknown;
  lieutenant_id?: unknown;
}

/** POST /v1/meta/recall body (design §9.1). */
interface RecallBody {
  category_id?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MetaProgressionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly projection: MetaProgressionProjectionService,
    // C5 — the graduation mutateFn + the Loop 10 governor (structural site #10, TASK_RETIREMENT).
    private readonly graduation: GraduationService,
    private readonly governor: StructuralDecisionGovernorService,
    // C8 — the recall mutateFn + preview read (structural site #11, TASK_RECALL).
    private readonly promotionLock: PromotionLockService,
  ) {}

  /**
   * `GET /v1/meta/task-categories` — the requesting player's task-category org overview (design §11; R2.2
   * inverted). See `MetaProgressionProjectionService.taskCategoryProjection` for the full field contract.
   * Requires a PLAYER JWT (no token → 401). RESPONSE SHAPE: `payload.data = { task_categories:
   * TaskCategoryProjectionRow[], delegated: DelegatedCategorySummary[] }` (a NAMED object field under the
   * envelope's `data`, mirrors `GET /v1/lieutenants`'s own `{ lieutenants: RosterRow[] }` list-endpoint
   * convention — extensible, parses uniformly with a detail-shaped GET's object `data`).
   *
   * P3-F C6 (design D6) — `delegated` is an ADDITIVE sibling field: delegated categories STAY in
   * `task_categories` (C3's own already-⊥-approved byte-shape, untouched) AND surface a second time here,
   * summarized (lieutenant ref + successor `substrate:'PENDING'`), for a client-side "delegated section"
   * render. See `deriveDelegatedSummaries`'s own header for the full contract.
   */
  @Get('meta/task-categories')
  @UseGuards(JwtAuthGuard)
  async taskCategories(
    @Req() req: RequestWithAccount,
  ): Promise<{ task_categories: TaskCategoryProjectionRow[]; delegated: DelegatedCategorySummary[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const task_categories = await this.projection.taskCategoryProjection(playerId);
    return { task_categories, delegated: deriveDelegatedSummaries(task_categories) };
  }

  /**
   * `POST /v1/meta/graduation` — graduate a LIVE, ELIGIBLE task category to the given candidate lieutenant
   * (design §8.1/§8.2). Body: { category_id, lieutenant_id }. Server-re-validates EVERYTHING (never trusts
   * the client's eligibility read) — non-LIVE/unknown category, non-SELF row, NOT-ELIGIBLE raw score, an
   * unowned lieutenant, or an ACTIVE promotion lock all refuse (`GraduationService.validateGraduationEligible`'s
   * own error codes). Loop-10-GOVERNED (`TASK_RETIREMENT`) — a same-session 2nd structural action 409s
   * `STRUCTURAL_CAP_EXHAUSTED` exactly like every other structural site. Returns
   * `{ graduated: true, category_id, lieutenant_id }`. 200 (a mutation on the existing `mastery_score` row).
   * Requires a PLAYER JWT (no token → 401). Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/graduation')
  @HttpCode(200) // a mutation on the existing mastery_score row (not a creation) → 200, mirrors attachScript/reassign.
  @UseGuards(JwtAuthGuard)
  async graduate(@Body() body: GraduationBody, @Req() req: RequestWithAccount): Promise<GraduationResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['category_id', 'lieutenant_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — category_id: int (compared to TASK_CATEGORY_CATALOGUE.code, an in-process closed set —
    // no LIVE-membership bound belongs on the pipe, mirrors recall-preview's own `categoryId` @Param);
    // lieutenant_id: uuid (getOwnedLieutenant reaches a uuid column, graduation.service.ts:235 — garbage
    // here reached the DB unguarded before this helper, the reason it was among C1's "non classable"
    // residue: category_id's own error always fired first on a single-field probe).
    // r3/MAJOR-2 (D5 v24) — `main` (de311e06) coerced via bare `Number(body.category_id)`, no type
    // check at all: `{"category_id":"3"}` succeeded. `acceptNumericString` restores that domain exactly
    // (never the intField default) — dropping it would 422 a client `main` accepted.
    const categoryId = intField(body as Record<string, unknown>, 'category_id', 'int4', { acceptNumericString: true });
    const lieutenantId = uuidField(body as Record<string, unknown>, 'lieutenant_id');
    return this.governor.commit(
      playerId,
      StructuralDecisionType.TASK_RETIREMENT,
      {
        before: { entity: 'mastery_score', category_id: categoryId },
        after: (r: GraduationResult) => ({ entity: 'mastery_score', category_id: r.category_id, lieutenant_id: r.lieutenant_id, action: 'graduated' }),
      },
      () => this.graduation.executeGraduation(playerId, categoryId, lieutenantId),
    );
  }

  /**
   * `POST /v1/meta/recall` — recall a DELEGATED task category back to `SELF` (design §9.1). Body:
   * { category_id }. Server-re-validates EVERYTHING — non-LIVE/unknown category, non-DELEGATED row, or an
   * already-ACTIVE promotion lock all refuse (`PromotionLockService.requestRecall`'s own error codes).
   * Loop-10-GOVERNED (`TASK_RECALL`, structural site #11 — ★#3 ruled: recall consumes the SAME 1/session
   * structural cap as graduation) — a same-session 2nd structural action 409s `STRUCTURAL_CAP_EXHAUSTED`
   * exactly like every other structural site. The governor ctx marks `triggeredRecallDebt: true` (design
   * D7 — the audit row's FIRST honest writer of that dormant bool). Returns `{ recalled: true,
   * category_id, lieutenant_id }`. 200 (a mutation on the existing `mastery_score` row, not a creation —
   * mirrors `graduate`'s own convention). Requires a PLAYER JWT. Idempotency-Key supported.
   */
  @Post('meta/recall')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async recall(@Body() body: RecallBody, @Req() req: RequestWithAccount): Promise<RecallResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['category_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // r3/MAJOR-2 (D5 v24) — same evidence as `graduate` above: `main` coerced via bare `Number(...)`,
    // no type check — `acceptNumericString` restores that domain on this site.
    const categoryId = intField(body as Record<string, unknown>, 'category_id', 'int4', { acceptNumericString: true });
    return this.governor.commit(
      playerId,
      StructuralDecisionType.TASK_RECALL,
      {
        before: { entity: 'mastery_score', category_id: categoryId },
        after: (r: RecallResult) => ({ entity: 'mastery_score', category_id: r.category_id, lieutenant_id: r.lieutenant_id, action: 'recalled' }),
        triggeredRecallDebt: true,
      },
      () => this.promotionLock.requestRecall(playerId, categoryId),
    );
  }

  /**
   * `GET /v1/meta/recall-preview/:categoryId` — the canon pre-decision warning (design §11): CONSULTATIVE,
   * never a gate. Requires the category to be CURRENTLY DELEGATED (409 otherwise —
   * `PromotionLockService.previewRecall`'s own validation). Requires a PLAYER JWT.
   */
  @Get('meta/recall-preview/:categoryId')
  @UseGuards(JwtAuthGuard)
  async recallPreview(@Param('categoryId', IntParam) categoryId: number, @Req() req: RequestWithAccount): Promise<RecallPreview> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.promotionLock.previewRecall(playerId, categoryId);
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

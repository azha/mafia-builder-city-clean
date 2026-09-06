// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C2 (player endpoints —
//             GET candidates / GET quests / POST quests / POST :id/advance / POST :id/abandon)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §10 (player endpoints,
//             screen-15 contract transposed)
//             Pattern: services/game-back/src/operational/maintenance/maintenance.controller.ts (the
//             identity-bridge `resolvePlayerId` + Idempotency-Key posture this file mirrors verbatim)
//             — 04f-B C2 — 2026-07-11
//
// `RecruitmentController` — the PLAYER-FACING recruitment quest API (C2: Saltline pool only — `POST
// .../hire` is explicitly NOT here, C3's endpoint per the guardrails).
//
// PLAYER RESOLUTION: the SAME identity bridge as every sibling controller (JwtAuthGuard → req.account →
// player_id via the 1-1 Player↔Account link; a body player id is NEVER trusted).
//
// IDEMPOTENCY (REUSE): the mutating POSTs are subject to the global IdempotencyInterceptor transparently —
// this controller does not re-implement it.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { EnumQuery, UuidParam, enumField, optionalUuidField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { RecruitmentQuestService, type QuestProjection } from './recruitment-quest.service';
import type { RecruitmentCandidateRow } from '../../db/schema/recruitment';
import { lieutenantSourcePg } from '../../db/schema/lieutenant';
// P3-F C6 — CategoryDelegationGuard (LIEUTENANT_HIRING's quest-hire guard site, C0-reanchor §7 — UNGOVERNED
// by Loop10 but still one of the category's 3 real player-facing hire surfaces). One-line seam.
import { CategoryDelegationGuard } from '../../meta_progression/category-delegation-guard.service';
import { TaskCategoryKey } from '../../meta_progression/task-category-catalogue';

interface StartQuestBody {
  candidate_id?: string;
  quest_type?: string;
}

interface AdvanceBody {
  decision_type?: string;
  decision_value?: unknown;
}

interface HireBody {
  archetype?: string;
  assigned_building_id?: string;
  target_building_id?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RecruitmentController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly quests: RecruitmentQuestService,
    // P3-F C6 — the LIEUTENANT_HIRING retirement guard (design D6/§8.3), the quest-hire finalize site.
    private readonly delegationGuard: CategoryDelegationGuard,
  ) {}

  /** `GET /v1/recruitment/candidates?pool=` — available candidates (optionally filtered by pool). */
  @Get('recruitment/candidates')
  @UseGuards(JwtAuthGuard)
  async getCandidates(
    // L0.3 (D5) — EnumQuery(lieutenantSourcePg.enumValues), DF-11: the pgEnum's own .enumValues, never
    // a hand-written list (measured pre-C1: 500 on garbage — `lieutenant_source` reached unguarded).
    @Query('pool', EnumQuery(lieutenantSourcePg.enumValues)) pool: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ candidates: RecruitmentCandidateRow[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return { candidates: await this.quests.listCandidates(playerId, pool) };
  }

  /** `GET /v1/recruitment/quests?status=active|history` — the player's own quests (default 'active'). */
  @Get('recruitment/quests')
  @UseGuards(JwtAuthGuard)
  async getQuests(
    @Query('status') status: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ quests: QuestProjection[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const normalized: 'active' | 'history' = status === 'history' ? 'history' : 'active';
    return { quests: await this.quests.listQuests(playerId, normalized) };
  }

  /** `GET /v1/recruitment/quests/:id` — a single owned quest (404 if not owned/found). */
  @Get('recruitment/quests/:id')
  @UseGuards(JwtAuthGuard)
  async getQuest(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<QuestProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.quests.getQuest(playerId, id);
  }

  /**
   * `POST /v1/recruitment/quests` — `{ candidate_id, quest_type }` → `startQuest`. A 2nd active quest on the
   * same candidate → 409 (the C1 partial-unique proof). 201 (a resource creation).
   */
  @Post('recruitment/quests')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async postQuest(@Body() body: StartQuestBody, @Req() req: RequestWithAccount): Promise<QuestProjection> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['candidate_id', 'quest_type']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — candidate_id: uuid (getCandidateForPlayer reaches a uuid column, unguarded before
    // this). quest_type: enum, lieutenantSourcePg.enumValues (DF-11) — the SAME 3-member domain
    // `SUPPORTED_QUEST_TYPES` in recruitment-quest.service.ts:61 already hand-mirrors.
    const candidateId = uuidField(body as unknown as Record<string, unknown>, 'candidate_id');
    const questType = enumField(lieutenantSourcePg.enumValues, body as unknown as Record<string, unknown>, 'quest_type');
    return this.quests.startQuest(playerId, candidateId, questType);
  }

  /**
   * `POST /v1/recruitment/quests/:id/advance` — `{ decision_type, decision_value }` → `advanceStep`
   * (session-gated 409; closed decision domains per step, 422 on an out-of-domain value). 200 (a mutation
   * on the existing quest row).
   */
  @Post('recruitment/quests/:id/advance')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async advance(
    @Param('id', UuidParam) id: string,
    @Body() body: AdvanceBody,
    @Req() req: RequestWithAccount,
  ): Promise<QuestProjection> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['decision_type', 'decision_value']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — decision_type/decision_value: LIBRE (allowlist (1)) — the legal domain is derived
    // per-request from the quest's CURRENT gated step (recruitment-quest.service.ts:198's `spec`, one
    // of 3 pool-specific sequences), never a static closed set or a typed column; decision_value's own
    // shape depends on decision_type (a uuid in the 'affinity_source' branch, a literal elsewhere —
    // recruitment-quest.service.ts:231-232).
    if (!body?.decision_type || typeof body.decision_type !== 'string') {
      throw new ApiError('VALIDATION_FAILED', { message: 'decision_type is required.', details: { param: 'decision_type' } });
    }
    return this.quests.advanceStep(playerId, id, body.decision_type, body.decision_value);
  }

  /**
   * `POST /v1/recruitment/quests/:id/hire` — C3, the ★ C7 seam consumer. `{ archetype, assigned_building_id,
   * target_building_id? }` → `finalizeHire` (the full recruit gate chain + the D4 negotiated debit + the
   * D5/D6 composite buckets + the D11 couples). 200 (a mutation on the existing quest resource, the SAME
   * convention `advance`/`abandon` use — the LIEUTENANT creation is a side-effect of this quest-state
   * transition, not the primary resource this endpoint names).
   */
  @Post('recruitment/quests/:id/hire')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async hire(
    @Param('id', UuidParam) id: string,
    @Body() body: HireBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ quest_id: string; outcome: 'hired'; lieutenant_id: string; hire_quality_bucket: string; loyalty_seed_bucket: string }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['archetype', 'assigned_building_id', 'target_building_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — archetype: LIBRE (allowlist (1)) — no FK/pgEnum backs it (lieutenant-archetype.ts:78's
    // own comment), validated against the in-process MAPPER_KNOWN_ARCHETYPES catalogue. assigned_building_id
    // / target_building_id: uuid (the SAME pair `lieutenant.controller.ts#recruit` classifies).
    if (!body?.archetype || typeof body.archetype !== 'string') {
      throw new ApiError('VALIDATION_FAILED', { message: 'archetype is required.', details: { param: 'archetype' } });
    }
    const assignedBuildingId = uuidField(body as unknown as Record<string, unknown>, 'assigned_building_id');
    const targetBuildingId = optionalUuidField(body as unknown as Record<string, unknown>, 'target_building_id') ?? null;
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.LIEUTENANT_HIRING);
    return this.quests.finalizeHire(playerId, id, body.archetype, assignedBuildingId, targetBuildingId);
  }

  /** `POST /v1/recruitment/quests/:id/abandon` — outcome `abandoned`; candidate released back to `available`. */
  @Post('recruitment/quests/:id/abandon')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async abandon(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<{ quest_id: string; outcome: 'abandoned' }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.quests.abandon(playerId, id);
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

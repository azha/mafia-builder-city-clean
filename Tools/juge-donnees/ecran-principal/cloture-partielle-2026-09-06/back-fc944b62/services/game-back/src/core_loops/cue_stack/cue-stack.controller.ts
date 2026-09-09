// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (endpoints
//             compose/reorder/commit + `GET current`)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §15.1 (house-style
//             `/v1/cue-stack/*` endpoints — D13, divergence #10 vs screen_8's own `/v1/me/cue-stack/*`).
//             Pattern (PLAYER RESOLUTION): `supply-chain.controller.ts#resolvePlayerId` — the
//             account_id→player_id bridge VERBATIM, the SAME per-controller helper every sibling
//             controller in this codebase carries (no shared extraction).
//             — P3-D C2 — 2026-07-14
//
// `CueStackController` — the FIRST player-facing production routes this lot ships. Idempotency-Key:
// REUSE (the global interceptor covers every POST — no per-controller wiring needed).

import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { CueStackService, type CueStackView } from './cue-stack.service';
import { rejectUnknownFields } from '../../common/param-pipes';

interface ComposeBody {
  slots?: unknown;
}

interface ReorderBody {
  slots?: unknown;
}

interface CommitBody {
  /** P3-D C7 — I7 (design §10.2): the server-side "confirm" half of the anti-rapid-fire guard. Defaults
   *  to `false` (undefined/anything non-`true` — the SAME "explicit opt-in only" convention every OTHER
   *  boolean flag in this codebase's request bodies follows). A commit targeting NO settling building is
   *  byte-identical regardless of this flag (the guard never fires). */
  acknowledge_compounding?: unknown;
}

type CueStackResponse = CueStackView;

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CueStackController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly cueStack: CueStackService,
  ) {}

  /**
   * `GET /v1/cue-stack/current` (design §15.1) — the player's current cue stack, buckets-only (plan
   * §C2 — no raw scalar even before C8's full projection). No current stack → the null-shaped response.
   */
  @Get('cue-stack/current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@Req() req: RequestWithAccount): Promise<CueStackResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.cueStack.getCurrent(playerId);
  }

  /**
   * `POST /v1/cue-stack/compose` (design §4.3, D2) — validate 4-8 slots, then UPSERT the pending stack
   * (I1). 422 `VALIDATION_FAILED` (malformed payload) / `SLOT_TYPE_RESERVED` (reserved slot_type) /
   * `CUE_STACK_DEPENDENCY_CYCLE` (cyclic deps) / `CUE_STACK_SLOT_TARGET_INVALID` (bad target). 409
   * `CUE_STACK_ALREADY_ACTIVE` if the player's ONE non-terminal stack is already committed/executing.
   */
  @Post('cue-stack/compose')
  @HttpCode(200) // an UPSERT of the player's own singleton stack (not always a fresh creation) — 200.
  @UseGuards(JwtAuthGuard)
  async compose(@Body() body: ComposeBody, @Req() req: RequestWithAccount): Promise<CueStackResponse> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['slots']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.cueStack.compose(playerId, body.slots);
  }

  /**
   * `POST /v1/cue-stack/reorder` (design §4.3, D2) — full-replace `WHERE state='pending'` (never
   * creates a row). Same validation as compose. 409 (generic state conflict) if nothing is pending.
   */
  @Post('cue-stack/reorder')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async reorder(@Body() body: ReorderBody, @Req() req: RequestWithAccount): Promise<CueStackResponse> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['slots']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.cueStack.reorder(playerId, body.slots);
  }

  /**
   * `POST /v1/cue-stack/commit` (design §4.3 verbatim, I2 + P3-D C7 I7) — atomic exactly-once commit +
   * `StackCommittedEvent`. 409 (generic state conflict) on re-commit or when nothing is pending. 409
   * `SETTLING_COMPOUND_REQUIRED` (I7) when ≥1 targeted building is actively settling and the body did not
   * carry `acknowledge_compounding: true` — resend with it to proceed (compounding applied exactly once).
   */
  @Post('cue-stack/commit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async commit(@Body() body: CommitBody, @Req() req: RequestWithAccount): Promise<CueStackResponse> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['acknowledge_compounding']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.cueStack.commit(playerId, body.acknowledge_compounding === true);
  }

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

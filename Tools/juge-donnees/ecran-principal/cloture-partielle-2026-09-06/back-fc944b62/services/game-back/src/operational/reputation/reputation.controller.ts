// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.2-04c-player-surface-design.md §3 C4-bis
//             ("reputation : POST /v1/me/house-rules (declareRule)" — maillon, forme C) + §3 C7
//             ("reputation : route rescopée" — 5 groupes sur 7, LE DERNIER chunk du lot).
//             Canon: docs/tech/04c_market_reputation_insurance/reputation_mechanics.md :23
//             ("lieutenants measure player against player's own stated rules. Declared rules
//             persist until publicly retracted") + :101 ("both rings register breach") + :240
//             (P5 forbidden list).
//             — W6.2 C4-bis — 2026-08-13 — / W6.2 C7 — 2026-08-13 —
//
// `ReputationController` — the PLAYER-FACING entry into the Boss Mirror declaration ledger + the
// rescoped reputation read surface.
//
// C4-bis: `POST /v1/me/house-rules` is the FIRST player-reachable trigger of `BossMirrorService.
// declareRule` (design §1.2/§3 C4-bis: `declareRule` exists — it only lacked a route under
// `JwtAuthGuard`; NO new écrivain, the canonical repair of a forme C).
//
// ⛔ ORDONNANCEMENT OBLIGATOIRE — C4-bis DOIT venir APRÈS C4 (design §3 C4-bis) : rendre
// `recordViolation` atteignable rallume `emitRuleViolation` (boss-mirror.service.ts:348) →
// `insurance.module.ts` → `CoverageInducedDriftService.onRuleViolation`, qui incrémente
// `hazard_shift` INCONDITIONNELLEMENT sur toute ligne `coverage_induced_drift_state` ACTIVE — des
// lignes qui n'existent QU'APRÈS C4 (`captureBaselineFingerprint`, appelé depuis `issueContract`).
// C4 est déjà mergé dans ce lot (chunks strictement séquentiels) — cet ordre est respecté.
//
// FORM (design §3 C4-bis, mirror of C2/C4): `@UseGuards(JwtAuthGuard)`, playerId resolved from the
// verified JWT via `resolvePlayerId` (duplicated per-controller convention, never shared). `rule_id`
// is a free-form player-authored string (canon: "I always settle fair" — NOT a closed enum;
// `declareRule` itself only checks membership/cap, `isDeclaredRuleContradictedBy` matches by
// `.startsWith(prefix)`). A non-string/empty `rule_id` → 404 (surface-area guard, D8's own reasoning
// — never 422). `declareRule`'s own `{ok:false, reason:'AT_CAP'}` refusal is translated to 409
// `RESOURCE_STATE_CONFLICT` here (the service returns a discriminated result rather than throwing;
// this controller is the ONE place that decides the HTTP shape, mirroring how `MetaProgressionController.
// graduate` translates `GraduationService`'s thrown `ApiError`s — here it's a translated RETURN VALUE
// instead of a caught throw, same posture).
//
// R2.2 (C4-bis): the response is `{ declared: true }` — no scalar, `declared_rules` IS the public
// observable (canon :65) but this route does not echo it back — `GET /v1/me/reputation` (C7 below)
// is the read surface. Zero-regression: ADDITIVE only.
//
// C7 — `GET /v1/me/reputation`: LE DERNIER chunk du lot (ruling A1) — la seule route dont le contenu
// dépend de DEUX maillons neufs (C0 + C4-bis), écrite quand ils sont verts. Calls `ReputationHubService.
// projectReputationSurface` (REUSE, never a parallel projection) — 5 of the 7 hub groups; `lek_memory`
// and `forbidden_triad` are NEVER in the response shape at all (TD-367/TD-360, forme E / forme C — §0
// forbids shipping a permanently-constant field). `lieutenant_id` (query, REQUIRED — 2 of the 5 kept
// groups are per-lieutenant) is OWNERSHIP-VALIDATED here (a foreign/nonexistent lieutenant → 404,
// D7 "existence is intelligence" — never a silent neutral-default that would make ownership
// unverifiable from the outside). `counterparty_id` (query, OPTIONAL) — `restraint` is OMITTED
// (not neutral-defaulted) when absent, design's own D-2. Mur P5 (canon :240): no raw ratio/index/
// density ever leaves `ReputationHubService`'s own boundary — enforced by that service's return type.

import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidQuery, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
// W6.2 C7 — the `lieutenant` schema, imported DIRECTLY (mirrors `boss-mirror.service.ts#recordViolation`'s
// OWN precedent for a per-request ownership join) — NEVER LieutenantModule/LieutenantRepository:
// LieutenantModule already imports ReputationModule (for the DISTRIBUTION binding's LekMemoryService
// read + the ceiling report's HiddenCurriculumService consumption), so importing LieutenantModule BACK
// here would create a circular module dependency. A bare schema import carries no DI/module edge.
import { lieutenant } from '../../db/schema/lieutenant';
import { BossMirrorService } from './boss-mirror.service';
import { ReputationHubService, type ReputationSurfaceProjection } from './reputation-hub.service';

/** `POST /v1/me/house-rules` body — the free-form rule id to publicly declare (design §3 C4-bis). */
interface DeclareHouseRuleBody {
  rule_id?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ReputationController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bossMirror: BossMirrorService,
    private readonly hub: ReputationHubService,
  ) {}

  /**
   * `POST /v1/me/house-rules` — publicly declare a house rule (design §3 C4-bis, maillon). Body
   * `{ rule_id }` (free-form, player-authored — canon :23/:101, e.g. "settle_fair"). Calls
   * `BossMirrorService.declareRule` verbatim (forme C: poser l'appelant, jamais un écrivain de
   * plus). Idempotent for an already-declared rule (declareRule's own no-op). At the ≤4 cap →
   * 409 `RESOURCE_STATE_CONFLICT`. 201 (a resource creation — mirrors `POST /v1/me/engagements` /
   * `POST /v1/me/insurance/quotes`), `{ declared: true }`. Requires a PLAYER JWT (no token → 401).
   * Idempotency-Key supported (the global interceptor).
   */
  @Post('me/house-rules')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async declareHouseRule(
    @Body() body: DeclareHouseRuleBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ declared: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);

    // TD-451 — mesuré : client et 4 sites de spec n'envoient que `rule_id`.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['rule_id']);
    if (typeof body.rule_id !== 'string' || !body.rule_id) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'rule_id must be a non-empty string.' });
    }

    const result = await this.bossMirror.declareRule(playerId, body.rule_id);
    if (!result.ok) {
      // result.reason === 'AT_CAP' (the only refusal declareRule returns).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `House-rule declaration cap reached (${result.current}/${result.cap}) — retract a rule before declaring another.`,
      });
    }

    return { declared: true };
  }

  /**
   * `GET /v1/me/reputation` — the requesting player's rescoped reputation surface (design §3 C7,
   * LE DERNIER chunk du lot). Query: `lieutenant_id` (REQUIRED — `portrait_posture` + `uniform_tells`
   * are per-lieutenant), `counterparty_id` (OPTIONAL — `restraint` omitted when absent, D-2). A
   * `lieutenant_id` not owned by the caller → 404 (ownership validated HERE, never delegated to a
   * sub-service's own null-on-mismatch read — that would silently return neutral defaults instead of
   * refusing, making cross-player probing indistinguishable from "no data yet"). Calls
   * `ReputationHubService.projectReputationSurface` verbatim (REUSE — no parallel projection).
   * Requires a PLAYER JWT (no token → 401).
   */
  @Get('me/reputation')
  @UseGuards(JwtAuthGuard)
  async getReputation(
    // L0.3 (D5) — UuidQuery: absent/blank -> undefined (this route's own "required" business rule is
    // the 404-on-absence check just below, UNCHANGED — Dv9 does not touch it); a PRESENT malformed value
    // now 422s instead of reaching the DB unguarded (lieutenant_id measured 500 pre-C1; counterparty_id
    // measured 404 pre-C1 — Dv9's own "me/reputation?counterparty_id 404→422").
    @Query('lieutenant_id', UuidQuery) lieutenantId: string | undefined,
    @Query('counterparty_id', UuidQuery) counterpartyId: string | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<ReputationSurfaceProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);

    if (lieutenantId === undefined) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'lieutenant_id is required.' });
    }
    const owned = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id })
      .from(lieutenant)
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
      .limit(1);
    if (owned.length === 0) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `lieutenant ${lieutenantId} is not owned by this player.`,
      });
    }

    return this.hub.projectReputationSurface(playerId, lieutenantId, counterpartyId);
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

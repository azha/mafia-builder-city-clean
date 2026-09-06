// IMPLEMENTS: docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §1 D5/D7/D8, §4 C3/C4
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md :73 ("Assault plan" card
//             — player designates target_holding_id) + design_principles.md P2/P3/P4/P6
//             — W6.1 C3 — 2026-08-13 — / W6.1 C4 — 2026-08-13 —
//
// `EngagementsController` — the PLAYER-FACING routes for the Muscle assault-plan lifecycle:
// `POST /v1/me/engagements` (C3, commit) is the FIRST player-reachable entry into the combat
// production chain (design §0.0: before C3, `CombatService.requestAssault` was reachable ONLY via
// the delegated Muscle DSL tick, never directly by the player). `GET /v1/me/engagements` (C4, list)
// is its read-back sibling — §4 C4 below the commit handler.
//
// C4 — mur P6 (design §4 C4): the returned `EngagementView` (`combat.service.ts`) is a closed
// 7-key shape — `engagement_id` / `target_rival_key` / `target_rival_name_i18n` (TD-553, maillon 3,
// 2026-09-03 — ADDITIVE, the key stays, a display name sits alongside it) / `status` (derived) /
// `outcome_bucket` (narrowed via `isCombatOutcomeBucket`, §6 B-1) / `friction_consumed_bucket` /
// `heat_increment_bucket`. NO server-only field (`base_friction_load`, `shared_friction_pool`,
// `system_criticality`, `conflict_memory_depth`, `resistance`, …) and NO raw game-minute
// (`created_at_minute` — I-d: zero player-facing precedent for one anywhere in this repo) ever
// leaves `CombatService.listEngagements`.
//
// D5 — REUSE, never a parallel writer: this route calls `CombatService.requestAssault` (the SAME
// method the delegated Muscle-tick path calls, `muscle-binding.ts:197`) — never
// `ConflictOrchestratorService` / `RivalEliminationService` directly. `requestAssault` INSERTs
// one `combat_event` row (`outcome_bucket=NULL`, P3 — resolved only by COMBAT_RESOLUTION_TICK, C2)
// with a non-null `heat_increment_bucket` (P2 — never a free assault).
//
// D7 — playerId comes ONLY from the verified JWT (`resolvePlayerId`, the SAME per-controller
// convention every player route in this codebase duplicates — NEVER a shared helper,
// `horizon-feed.controller.ts` header). NEVER `@Headers('x-player-id')` — this repo already
// carries 8 production handlers that take playerId from a caller-supplied header with zero guard,
// one of which debits a wallet; this route does not become the 9th. The `lieutenant_id` in the
// body is re-resolved through `LieutenantRepository.getOwnedLieutenant` (player-scoped): NOT owned
// (or does not exist at all) → 404 `RESOURCE_NOT_FOUND`, NEVER 403 (D7 — in an adversarial game,
// existence is intelligence).
// ★ TD-553 (2026-09-03, additive, no player-facing behavior change beyond the code split): owned
// but NOT a MUSCLE archetype (`role_id !== MUSCLE_ROLE_ID`) is now `MUSCLE_LIEUTENANT_REQUIRED`
// (409), NOT `RESOURCE_NOT_FOUND` — a player who owns the lieutenant already sees its archetype
// (`GET /v1/lieutenants`), so this split names an actionable state without leaking anything D7's
// "existence is intelligence" guards against (that guard is UNCHANGED for the not-owned branch).
//
// D8 — `target_rival_key` is validated in TWO steps, BOTH ending in 404 (never 422 — a garbage
// key is a surface-area guard, not a semantic-validation error):
//   1. domain pre-filter, BEFORE any query — `isRivalKeyDomain`, a type predicate DERIVED from the
//      already-exported `rivalKey` pgEnum (`db/schema/conflict_rival.ts:66-71`), the house
//      `(typeof pgEnumVar.enumValues)[number]` convention (`player_progression_state.ts:31-33`).
//      Zero new list declared — this route does NOT add a 12th copy of the 4-key domain (DF-11).
//   2. `CombatService.requestAssault`'s own structural precondition (a `rival_state` row must
//      exist for this player × rival) — a domain-valid key with no seeded row REFUSEs
//      (`{ scheduled: false, reason: 'no_rival_state' }`), mapped here to the SAME 404. Reusing
//      `requestAssault`'s own check (rather than re-querying `rival_state` a second time in this
//      controller) avoids a duplicate read of the same row.
//   `target_holding_id` is optional and forwarded as-is; unknown body keys are silently ignored
//   (no `forbidNonWhitelisted`) so the future A7 composer can extend the body without a breaking
//   change (D8 — this route freezes schema v1 of `conflict.engagement.start`).
//
// Idempotency-Key: handled transparently by the global `IdempotencyInterceptor` (APP_INTERCEPTOR,
// `app.module.ts`) — no per-route wiring needed (the SAME convention every mutating POST in this
// codebase relies on).
//
// R2.2: the response is `{ engagement_id }` — an id, never a raw scalar.
// Zero-regression: ADDITIVE only — new controller, new module (`engagements.module.ts`); no
// existing route/service/table touched.

import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { ApiError } from '../../../protocol/api-error';
import { enumField, rejectUnknownFields, uuidField } from '../../../common/param-pipes';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../../auth/authenticated-request';
import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { account } from '../../../db/schema/account';
import { player } from '../../../db/schema/player';
import { rivalKey as rivalKeyEnum, erosionRegisterId } from '../../../db/schema/conflict_rival';
import { CombatService } from './combat.service';
import type { EngagementView } from './combat.service';
import { LieutenantRepository } from '../../lieutenant/lieutenant.repository';
import { MUSCLE_ROLE_ID } from '../../lieutenant/lieutenant-archetype';

/** `POST /v1/me/engagements` body (design §1 D8 — schema v1, extensible by the future A7 composer;
 *  unknown keys are silently ignored, no `forbidNonWhitelisted`). */
interface EngagementCommitBody {
  lieutenant_id?: unknown;
  target_rival_key?: unknown;
  target_holding_id?: unknown;
}

// D8 — the domain guard, DERIVED from the already-exported pgEnum, zero new list declared (DF-11:
// the 4-key domain is already declared 11 times in `src`; this is not a 12th). Form: the house
// `(typeof pgEnumVar.enumValues)[number]` convention, wrapped in a type predicate (the SAME shape
// as `recruitment.repository.ts:77-78`'s `isRivalKeyDomain`) so `.includes` actually narrows the
// input `string` instead of only returning a `boolean` (a bare `.includes` would force an `as` at
// the call site — the exact anti-pattern the design's D8/B-1 close elsewhere in this lot).
type RivalKeyEnum = (typeof rivalKeyEnum.enumValues)[number];

function isRivalKeyDomain(v: string): v is RivalKeyEnum {
  return (rivalKeyEnum.enumValues as readonly string[]).includes(v);
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class EngagementsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly combat: CombatService,
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  /**
   * `POST /v1/me/engagements` — commit a Muscle assault plan (design §4 C3). Validates the
   * lieutenant is player-owned + MUSCLE (404 otherwise), the `target_rival_key` against the closed
   * domain THEN against the player's own `rival_state` (404 either way — D8), then calls
   * `CombatService.requestAssault` (D5 — the SAME entry the delegated tick uses). 201,
   * `{ engagement_id }`. Requires a PLAYER JWT (no token → 401). Idempotency-Key supported (the
   * global interceptor).
   */
  @Post('me/engagements')
  @HttpCode(201) // a resource creation (BYTE-MIRROR of POST /v1/lieutenants → 201).
  @UseGuards(JwtAuthGuard)
  async commit(
    @Body() body: EngagementCommitBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ engagement_id: string }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['lieutenant_id', 'target_holding_id', 'target_rival_key']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const rawBody = body as unknown as Record<string, unknown>;

    // L0.3 (D5) — lieutenant_id: uuid (getOwnedLieutenant reaches a uuid column, unguarded before
    // this — measured 500 pre-C1, one of the 8 "non confondus").
    const lieutenantId = uuidField(rawBody, 'lieutenant_id');

    // D7 — player-owned, or 404 (never 403 — existence is intelligence). UNCHANGED for this branch:
    // an id that is not this player's (or does not exist at all) still learns nothing.
    const owned = await this.lieutenantRepo.getOwnedLieutenant(playerId, lieutenantId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No such lieutenant for this player: ${lieutenantId}.`,
      });
    }
    // TD-553 — owned but the WRONG archetype is a DISTINCT, actionable state, not "no such
    // resource": the player already owns this lieutenant and already sees its archetype
    // (`GET /v1/lieutenants`), so naming the refusal leaks nothing D7 was guarding against. A named
    // code lets the client choose its already-honest empty-state copy FROM data instead of
    // deducing it from a generic 404 (error-codes.ts's own `MUSCLE_LIEUTENANT_REQUIRED` header).
    if (owned.role_id !== MUSCLE_ROLE_ID) {
      throw new ApiError('MUSCLE_LIEUTENANT_REQUIRED', {
        message: `Lieutenant ${lieutenantId} is not a MUSCLE archetype (role_id=${owned.role_id}).`,
      });
    }

    // D8 step 1 — domain pre-filter BEFORE any query. A garbage/out-of-domain key never reaches
    // `requestAssault` / the DB. ALLOWLIST (3) — decision-written "garbage → 404, never 422"
    // (this docblock, `:40-53`) — L0.3 (D5) leaves this branch UNCHANGED, its own detector is
    // `engagements_commit.spec.ts`.
    if (typeof body.target_rival_key !== 'string' || !isRivalKeyDomain(body.target_rival_key)) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'Unknown rival key.' });
    }
    const targetRivalKey = body.target_rival_key;

    // L0.3 (D5) — target_holding_id: ENUM, not uuid despite its own name/docstring ("Optional: the
    // target holding (a building_id)", combat.service.ts:149) — it is written VERBATIM into
    // `combat_event.target_register_id` (combat.service.ts:184), a pgEnum column whose real domain
    // is the 5 erosion-capacity axes (`conflict_rival.ts:104-110`: muscle/finance/intel/
    // infrastructure/leadership — "the erosion register axis", NOT a building reference). A client
    // that follows this route's OWN documentation and sends a building uuid here has ALWAYS been
    // rejected (a uuid never matches one of the 5 short enum members) — L0.3's mandate (never 500 on
    // a malformed typed-column entry) is met by validating against the COLUMN the value actually
    // reaches; the semantic mismatch between the parameter's name/doc and its target column is a
    // pre-existing defect, ORTHOGONAL to L0.3 (a data-mapping bug, not an input-validation gap) —
    // consigned to tech_debt_inventory.md (§7), not fixed here (an additive-only lot does not
    // reassign a column). `enumField` has no optional form (only `optionalUuidField` does among the
    // 5 helpers, r4-C0/m4-1's "never a parallel helper" — this inlines the optionality instead of
    // adding a 6th).
    const targetHoldingId =
      body.target_holding_id === undefined
        ? undefined
        : (enumField(erosionRegisterId.enumValues, rawBody, 'target_holding_id') as (typeof erosionRegisterId.enumValues)[number]);

    // The current in-game minute — the SAME `getCurrentGameMinute` per-repository convention every
    // other player-facing mutation in this codebase reads its clock from (never a shared helper).
    // Load-bearing for C2's resolution ORDER and C4's projection `orderBy` (design §4 C4 / §8.1 #3)
    // — this is a NEW call site, unaffected by the delegated-tick `gameMinute` defect §8.1 #3 names
    // (that defect was in `ArchetypeBinding.applyExecuteDefault`'s missing parameter — a different
    // call chain, FIXED at W6.1 C7: the interface now REQUIRES `gameMinute`, threaded from
    // `LieutenantTickService.applyForLieutenant`'s `now` through `MuscleBindingService`; this route
    // already had the player's real clock in scope and is unchanged by that fix beyond the
    // `requestAssault` argument order below).
    const gameMinute = await this.lieutenantRepo.getCurrentGameMinute(playerId);

    // D5 — REUSE requestAssault verbatim (the SAME method the delegated Muscle-tick path calls).
    // D8 step 2 — its own structural precondition (a rival_state row must exist) is the SECOND 404
    // branch: a domain-valid key never seeded for this player REFUSEs here, never a 422.
    // Argument order matches the W6.1 C7 signature — `gameMinute` REQUIRED before the optional
    // `targetHoldingId` (combat.service.ts: no default, an omitted clock is a compile error).
    const result = await this.combat.requestAssault(
      playerId,
      targetRivalKey,
      owned.lieutenant_id,
      gameMinute,
      targetHoldingId,
    );

    if (!result.scheduled) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No rival_state row for this player and rival '${targetRivalKey}'.`,
      });
    }

    return { engagement_id: result.eventId };
  }

  /**
   * `GET /v1/me/engagements` — the requesting player's engagement list (design §4 C4, mur P6).
   * REUSE the `{ lieutenants: RosterRow[] }` list-sibling convention verbatim
   * (`lieutenant.controller.ts:317` — a NAMED object field under `data`, never a bare array, so the
   * response stays extensible and parses uniformly with any future single-engagement GET). Each row
   * is the frozen 7-key `EngagementView` (`combat.service.ts`, TD-553) — `status` derived, `outcome_bucket`
   * narrowed through `isCombatOutcomeBucket` (design §6 B-1), `created_at_minute` deliberately absent
   * (I-d). Player-scoped: `CombatService.listEngagements` → `CombatRepository.
   * listEngagementsForPlayer`'s `WHERE player_id` is the ONLY scoping — never a cross-player row.
   * Requires a PLAYER JWT (no token → 401).
   */
  @Get('me/engagements')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount): Promise<{ engagements: EngagementView[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const engagements = await this.combat.listEngagements(playerId);
    return { engagements };
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

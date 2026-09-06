// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.2-04c-player-surface-design.md §3 C2 ("insurance :
//             POST /v1/me/insurance/quotes" — maillon 1, forme C: `startWalk` exists, its production
//             caller does not).
//             Canon: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md :48 ("On
//             contract-request, walks a deterministic 3-day path").
//             — W6.2 C2 — 2026-08-13
//
// `InsuranceController` — the PLAYER-FACING entry into the insurance underwriting-walk chain.
// `POST /v1/me/insurance/quotes` is the FIRST player-reachable trigger of `UnderwritingWalkService.
// startWalk` (design §1.3: 22 écrivains, 3 prod, but ZERO production APPELANT — the walk record could
// only ever be created by `_test` seeding before this chunk).
//
// Forme C (design §3 C2): "poser l'appelant, jamais un écrivain de plus" — this route calls the
// EXISTING `startWalk` verbatim. No new écrivain, no new table, no new column.
//
// FORM (design §3 C2, mirror of EngagementsController — W6.1 C3/C4):
//   - `@UseGuards(JwtAuthGuard)`, playerId resolved from the verified JWT via `resolvePlayerId`
//     (the SAME per-controller convention every player route in this codebase duplicates — NEVER a
//     shared helper). NEVER `@Headers('x-player-id')` (the repo already carries 8 production handlers
//     that take playerId from a caller-supplied header with zero guard — this route does not become
//     the 9th).
//   - `coverage_type` domain guard DERIVED from the already-exported `coverageType` pgEnum
//     (`db/schema/insurance.ts:58`) — the SAME `(typeof pgEnumVar.enumValues)[number]` + type-predicate
//     shape `engagements.controller.ts` uses for `target_rival_key` (DF-11: zero new list declared).
//     An out-of-domain value → 404 `RESOURCE_NOT_FOUND` (never 422 — a garbage value is a surface-area
//     guard, not a semantic-validation error, mirrors D8's own reasoning).
//   - `Idempotency-Key`: handled transparently by the global `IdempotencyInterceptor`.
//
// R2.2: the response is `{ walk_id }` — an id, never a raw scalar (findings_bitmask/observation_depth
// stay server-only, R2.2 unchanged).
// Zero-regression: ADDITIVE only — new controller, new module wiring; no existing route/service/table
// touched. `startWalk`'s own signature is unchanged (this chunk is a caller, not a rewrite).

import { Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { optionalUuidField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { coverageType as coverageTypeEnum } from '../../db/schema/insurance';
import { UnderwritingWalkService } from './underwriting-walk.service';
import { ContractService } from './contract.service';
import type { CoverageType } from './findings';

/** `POST /v1/me/insurance/quotes` body — the coverage kind to walk (design §3 C2). */
interface QuoteRequestBody {
  coverage_type?: unknown;
}

/** `POST /v1/me/insurance/contracts` body — issue a contract from a COMPLETE walk (design §3 C4). */
interface IssueContractBody {
  walk_id?: unknown;
  insured_value_cents?: unknown;
  counterparty_id?: unknown;
}

// The domain guard, DERIVED from the already-exported pgEnum (zero new list declared — mirrors
// `engagements.controller.ts`'s `isRivalKeyDomain`). `CoverageType` (findings.ts) and `coverageType`'s
// `enumValues` (db/schema/insurance.ts) are the SAME 4-member domain declared in two forms (a DB enum +
// a TS union) — this predicate is what lets the pgEnum-derived check narrow to the TS union `startWalk`
// expects, without a THIRD hand-copied list.
type CoverageTypeEnum = (typeof coverageTypeEnum.enumValues)[number];

function isCoverageTypeDomain(v: string): v is CoverageTypeEnum {
  return (coverageTypeEnum.enumValues as readonly string[]).includes(v);
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InsuranceController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly walk: UnderwritingWalkService,
    private readonly contract: ContractService,
  ) {}

  /**
   * `POST /v1/me/insurance/quotes` — start a coverage-scoped underwriting walk (design §3 C2, maillon
   * 1). Body `{ coverage_type }`, validated against the closed pgEnum domain (404 on a garbage value —
   * never 422, D8's own reasoning). Calls `UnderwritingWalkService.startWalk` verbatim (forme C: poser
   * l'appelant, jamais un écrivain de plus) with `contractId=null` (the walk is created BEFORE any
   * contract — C4 sets it at issuance) and the player's REAL current game-minute (the walk's
   * `start_tick`, load-bearing for `computePremium`'s day-elapsed guard, C3). 201 (a resource creation —
   * mirrors `POST /v1/lieutenants` / `POST /v1/me/engagements`), `{ walk_id }`. Requires a PLAYER JWT
   * (no token → 401). Idempotency-Key supported (the global interceptor).
   */
  @Post('me/insurance/quotes')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async requestQuote(
    @Body() body: QuoteRequestBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ walk_id: string }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['coverage_type']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);

    if (typeof body.coverage_type !== 'string' || !isCoverageTypeDomain(body.coverage_type)) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'Unknown coverage_type.' });
    }
    const coverageType = body.coverage_type as CoverageType;

    // The player's REAL current in-game minute (the SAME per-repository `getCurrentGameMinute`
    // convention every other player-facing mutation in this codebase reads its clock from — never a
    // shared helper, `lieutenant.repository.ts:346`'s own precedent). A just-seeded player who never
    // advanced sits at tick 0 (the clock is lazy-created at 0 on the first advance).
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const gameMinute = rows[0]?.game_minute ?? 0;

    const { walkId } = await this.walk.startWalk(playerId, null, coverageType, gameMinute);
    return { walk_id: walkId };
  }

  /**
   * `POST /v1/me/insurance/contracts` — issue a contract from the player's OWN COMPLETE walk (design
   * §3 C4, maillon 3). Body `{ walk_id, insured_value_cents, counterparty_id? }`. Calls
   * `ContractService.issueContract` verbatim (the ownership join, the COMPLETE guard, and the
   * one-walk-one-ACTIVE-contract guard already live inside it — this route adds none of its own,
   * mirrors C2's forme-C posture). `insured_value_cents` is clamped INSIDE `issueContract` (W6a C5,
   * DD-MAGNITUDE-BOUND) — never re-validated here. 201, `{ contract_id, premium_cents,
   * escrow_required_cents }` (R2.2 — cash-clear values only, DD-P5; `findings_bitmask` never leaves
   * the server). Requires a PLAYER JWT (no token → 401). Idempotency-Key supported (the global
   * interceptor).
   */
  @Post('me/insurance/contracts')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async issueContract(
    @Body() body: IssueContractBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ contract_id: string; premium_cents: number; escrow_required_cents: number }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['counterparty_id', 'insured_value_cents', 'walk_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);

    // L0.3 (D5) — walk_id: uuid (measured 500 pre-C1, one of the 8 "non confondus").
    // counterparty_id: uuid, optional. insured_value_cents: LIBRE, deliberately NOT wired to
    // `intField` — `contract.service.ts:124-139` (DD-MAGNITUDE-BOUND, W6a C5, a RATIFIED, documented
    // decision predating this lot) already CLAMPS any finite value to
    // `[insuredValueCentsFloor, insuredValueCentsCeiling]` and degrades non-finite input (NaN from a
    // non-numeric string) to the floor — it NEVER 500s and NEVER rejects, by design ("a bounded,
    // successful contract is the correct response to an out-of-range value"). Wiring `intField`
    // here — even widened to `'int8'` for its `bigint` column, `insurance.ts:252` — would REJECT
    // (422) a non-integer float the clamp currently ACCEPTS (rounds it) and would reverse a shipped
    // decision (design §0: "aucune décision d'exposition ou d'équilibrage renversée"). D5's own
    // "starting list, opposable" for int8 names this field as a CANDIDATE for C1 to verify — this is
    // that verification, and its conclusion is "already safe, do not touch" (consigned to
    // implementation-notes.md).
    const walkId = uuidField(body as unknown as Record<string, unknown>, 'walk_id');
    const counterpartyId = optionalUuidField(body as unknown as Record<string, unknown>, 'counterparty_id') ?? null;
    const insuredValueCents = Number(body.insured_value_cents);

    const { contractId, premiumCents, escrowRequiredCents } = await this.contract.issueContract(
      playerId,
      walkId,
      insuredValueCents,
      counterpartyId,
    );
    return { contract_id: contractId, premium_cents: premiumCents, escrow_required_cents: escrowRequiredCents };
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

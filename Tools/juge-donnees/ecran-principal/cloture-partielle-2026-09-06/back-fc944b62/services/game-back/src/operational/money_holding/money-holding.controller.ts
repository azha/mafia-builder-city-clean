// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T2/§4-T3 (POST
//             /v1/operational/building/:id/upgrade-money-holding-tier — the clean-cash holding tier-upgrade action; POST
//             .../deposit-cash + .../withdraw-cash — the wallet↔held transfers) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 —
//             never raw cents / tier)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Tasks 2/3) --
//
// `MoneyHoldingController` — the PLAYER-FACING money_holding clean-cash vault API (T2/T3; T4/T5/T6 later extend it):
//   - POST /v1/operational/building/:id/upgrade-money-holding-tier → raise the money_holding_tier by one for cash, capped.
//   - POST /v1/operational/building/:id/deposit-cash  { amount_cents } → move clean cash wallet → held (capacity-guarded).
//   - POST /v1/operational/building/:id/withdraw-cash { amount_cents } → move clean cash held → wallet.
//
// The BYTE-MIRROR of the distribution_hub upgrade-hub-tier route (which lives on RealEstateController in the real_estate
// module); placed in its OWN controller HERE — in the money_holding module — for cohesion (T3+ deposit/withdraw/yield/
// forfeiture join it) and to avoid cross-module injection (MoneyHoldingService lives in this module).
//
// PLAYER RESOLUTION (the SAME identity bridge as RealEstateController / GrowController / GET /v1/me): the JwtAuthGuard
// verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body, R-ID-3).
// The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link
// (player.account_id, filtered to PLAYER accounts).
//
// The mutating POST returns plain `data` (an upgrade ack — NOT the raw cents / new tier, R2.2); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The upgrade is subject to the existing
// IdempotencyInterceptor (a retried upgrade with the same Idempotency-Key replays the memorized response — no
// double-debit, no double-increment).

import { Body, Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, intField, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { MoneyHoldingService } from './money-holding.service';

/** POST /deposit-cash | /withdraw-cash body — the amount of clean cash (in cents) to move. */
interface TransferCashBody {
  amount_cents?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MoneyHoldingController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly moneyHolding: MoneyHoldingService,
  ) {}

  /**
   * `POST /v1/operational/building/:id/upgrade-money-holding-tier` — raise the requesting player's money_holding
   * money_holding_tier by one (the tier lever that later scales the deposit capacity + yield, Phase-5 vector #5a T3/T4).
   * The BYTE-MIRROR of upgrade-hub-tier (the distribution_hub action). DEBITS economy_states by the grounded upgrade
   * cost (money_holding.upgrade_cost_ratio.<targetTier> × the M1 conversion reference) ATOMICALLY guarded (insufficient
   * cash → 409, no state change) → money_holding_tier++ in the SAME tx. A building that is not the player's / not
   * converted → 404; not a money_holding → 409 (WRONG_TYPE); already at money_holding.max_tier → 409 (AT_CAP). Returns
   * { upgraded: true } — the raw new money_holding_tier / post-debit cents are NOT forwarded (R2.2; the player surface is
   * the qualitative money_holding_tier band on the projection, T6). Requires a PLAYER JWT (no token → 401). Supports
   * Idempotency-Key (the global interceptor — a retried upgrade does not double-debit / double-increment).
   */
  @Post('operational/building/:id/upgrade-money-holding-tier')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async upgradeMoneyHoldingTier(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<{ upgraded: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.moneyHolding.upgradeMoneyHoldingTier(playerId, id);
  }

  /**
   * `POST /v1/operational/building/:id/deposit-cash` — move clean cash from the requesting player's wallet
   * (economy_states.cash_cents) into a player-owned money_holding's holding pool (money_holding.held_cents). Body:
   * { amount_cents } (a positive integer of cents — non-positive / non-integer → 422 VALIDATION_FAILED). Validates the
   * building is the player's owned money_holding (404 not owned / 409 WRONG_TYPE) then runs ONE atomic tx: the wallet
   * is debited atomically-guarded (insufficient → 409 INSUFFICIENT_FUNDS, no state change) and the held is credited
   * under the tier capacity guard (held + amount > capacity → 409 OVER_CAPACITY, the whole tx rolls back). Returns
   * { deposited: true } — the raw new balances are NOT forwarded (R2.2). Requires a PLAYER JWT (no token → 401).
   * Supports Idempotency-Key (the global interceptor — a retried deposit does not double-move). 200 (no new resource).
   */
  @Post('operational/building/:id/deposit-cash')
  @HttpCode(200) // a balance transfer on existing rows (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async depositCash(
    @Param('id', UuidParam) id: string,
    @Body() body: TransferCashBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ deposited: true }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['amount_cents']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5/C1 BLOCKING-1) — amount_cents reaches economy_states.cash_cents / money_holding.held_cents,
    // both `bigint` (r2/m2 fix: player_economy_state.ts:22 is cash_cents — `:79` is a DIFFERENT table's
    // `iapTransaction.amount_cents`, a homonym-field anchor error caught by r2's byte-level oracle;
    // operational_chain.ts:498-499,504) — intField(width='int8')
    // BEFORE the service's own positive-integer business check, so an out-of-int4/unsafe magnitude 422s with
    // details.param instead of reaching BigInt()/Postgres and 500ing (measured pre-fix: 1e19 -> 500 22003).
    const amountCents = intField(body as unknown as Record<string, unknown>, 'amount_cents', 'int8');
    return this.moneyHolding.deposit(playerId, id, amountCents);
  }

  /**
   * `POST /v1/operational/building/:id/withdraw-cash` — move clean cash from a player-owned money_holding's holding pool
   * (money_holding.held_cents) back into the requesting player's wallet (economy_states.cash_cents). Body:
   * { amount_cents } (positive integer of cents — else 422). Validates the building is the player's owned money_holding
   * (404 / 409 WRONG_TYPE) then runs ONE atomic tx: the held is debited atomically-guarded (held < amount → 409
   * INSUFFICIENT_HELD, no state change) and the wallet is credited. Returns { withdrawn: true } (R2.2 — no raw balances).
   * Requires a PLAYER JWT (no token → 401). Supports Idempotency-Key (a retried withdraw does not double-move). 200.
   */
  @Post('operational/building/:id/withdraw-cash')
  @HttpCode(200) // a balance transfer on existing rows → 200.
  @UseGuards(JwtAuthGuard)
  async withdrawCash(
    @Param('id', UuidParam) id: string,
    @Body() body: TransferCashBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ withdrawn: true }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['amount_cents']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5/C1 BLOCKING-1) — same class as deposit-cash above (amount_cents -> bigint columns).
    const amountCents = intField(body as unknown as Record<string, unknown>, 'amount_cents', 'int8');
    return this.moneyHolding.withdraw(playerId, id, amountCents);
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

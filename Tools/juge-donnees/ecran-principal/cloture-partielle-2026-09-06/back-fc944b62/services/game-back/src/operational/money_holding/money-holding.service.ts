// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T2/§4-T3 (MoneyHoldingService +
//             controller — POST /v1/operational/building/:id/upgrade-money-holding-tier; the money_holding_tier lever
//             scaling the deposit capacity + yield; T3 deposit/withdraw wallet↔held transfers under the tier capacity) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.13 (money_holding — money_holding_tier / held_cents /
//             last_yield_tick surface, T0, migration 0025) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention the upgrade cost reuses)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Tasks 2/3) --
//
// `MoneyHoldingService` — the player-triggered actions of the money_holding clean-cash vector. A money_holding is built
// at money_holding_tier 1 (T1).
//   - T2 UPGRADE-MONEY-HOLDING-TIER (the BYTE-MIRROR of HubService): raises money_holding_tier by one for cash, capped
//     at money_holding.max_tier.
//   - T3 DEPOSIT / WITHDRAW: move clean cash between the wallet (economy_states.cash_cents) and the holding
//     (money_holding.held_cents), atomic + guarded. The deposit refuses (409 OVER_CAPACITY) once held_cents + amount
//     would exceed capacityCentsForTier(currentTier); each mutation stamps last_yield_tick = the current tick (the T4
//     accrual anchor — for T3 it is purely the anchor, NO accrual math yet).
// This module will also host T4 yield accrual + T5a/b seizure + T6 the band projections; T3 ships ONLY deposit/withdraw
// + the capacity + the current-tick anchor read (YAGNI — no yield/raid/forfeiture/projection here).
//
// THE ACTION (MoneyHoldingService.upgradeMoneyHoldingTier(playerId, buildingId)):
//   1) VALIDATE: read the player's building_operational_state row (LEFT-JOINed to its money_holding row). Not owned /
//      not converted (no operational row) → 404 RESOURCE_NOT_FOUND. The row exists but operational_type ≠ 'money_holding'
//      → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE — only a money_holding has a money_holding_tier lever — a lab/stash/
//      front_shop cannot be tier-upgraded this way). money_holding_tier == max_tier → 409 RESOURCE_STATE_CONFLICT
//      (AT_CAP — nothing left to upgrade to). This matches the existing operational error conventions (404 not-found/
//      not-owned, 409 wrong-state — RepairService / SpecializedLabService / HubService precedent).
//   2) COST: money_holding.upgrade_cost_ratio.<targetTier> × the M1 conversion-cost reference (moneyHoldingUpgradeCostCents
//      — R2.3, NOT inline; the SAME money convention as the repair / lab-tier / hub-tier cost). targetTier = currentTier
//      + 1 (the tier moved TO). The raw cents stay internal — the player surface is the qualitative money_holding_tier
//      band on the projection (R2.2; the band lands in T6).
//   3) DEBIT + RAISE (atomic, guarded — REUSE the real-estate / repair / specialized-lab / hub guarded-debit pattern):
//      debit economy_states by the cost with a `cash_cents >= cost` guard IN the UPDATE. Insufficient balance → 409
//      RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS — no state change, the tx rolls back). Success → money_holding_tier++
//      in the SAME tx.
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried
// upgrade-money-holding-tier with the same Idempotency-Key replays the memorized response, NO re-execution → no
// double-debit / no double-increment). This service does not re-implement idempotency; it just runs the guarded
// transaction (the interceptor wraps the handler, exactly as it wraps the repair / purchase / convert / upgrade-tier /
// upgrade-hub-tier POSTs).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { MoneyHoldingOverCapacityError, MoneyHoldingRepository } from './money-holding.repository';
import {
  accruedYieldCents,
  capacityCentsForTier,
  moneyHoldingTunables,
  moneyHoldingUpgradeCostCents,
} from './money-holding-tunables';
import { CityEventBus } from '../../citysim/events/city-event-bus';

@Injectable()
export class MoneyHoldingService {
  private readonly logger = new Logger(MoneyHoldingService.name);

  constructor(
    private readonly repo: MoneyHoldingRepository,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * The PURE accrued yield (cents) a money_holding has earned on `heldCents` between `lastYieldTick` and `currentTick`
   * — a thin delegate to the module-level {@link accruedYieldCents} (the shared single source of accrual truth, also
   * used by the repository's in-tx settle step). DETERMINISTIC, FLOAT-FREE BigInt math, guarded ≥ 0. See the module
   * function's doc for the formula + the no-float-drift approach.
   */
  accruedYieldCents(heldCents: bigint, lastYieldTick: number, currentTick: number): bigint {
    return accruedYieldCents(heldCents, lastYieldTick, currentTick);
  }

  /**
   * Upgrade a player-owned money_holding's money_holding_tier by one (the money_holding_tier lever). Validates ownership
   * + the money_holding type + money_holding_tier < max_tier, debits the grounded upgrade cost atomically-guarded, and
   * raises money_holding_tier++ in the SAME tx.
   *
   * Errors (the existing operational conventions): not owned / not converted (no operational row) → 404
   * RESOURCE_NOT_FOUND; not a money_holding → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE); already at max_tier → 409
   * RESOURCE_STATE_CONFLICT (AT_CAP); insufficient cash → 409 RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS, no change).
   *
   * Returns { upgraded: true } (the raw new money_holding_tier / post-debit cents are NOT forwarded — R2.2; the player
   * surface is the qualitative money_holding_tier band on the projection, T6).
   */
  async upgradeMoneyHoldingTier(playerId: string, buildingId: string): Promise<{ upgraded: true }> {
    const state = await this.repo.getUpgradeTargetState(playerId, buildingId);
    if (!state) {
      // No operational-state row for this player+building → not owned / not converted.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.operational_type !== 'money_holding') {
      // Only a money_holding carries a money_holding_tier lever — a lab/stash/front_shop has no tier to upgrade this way.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not a money_holding (operational_type='${state.operational_type}') — only a money_holding can be money-holding-tier-upgraded.`,
      });
    }
    // A money_holding ALWAYS has its 1-1 money_holding row (created on convert, T1), so money_holding_tier is non-null
    // here; the ?? 1 is a defensive floor that can never be exercised on a well-formed money_holding.
    const currentTier = state.money_holding_tier ?? 1;
    if (currentTier >= moneyHoldingTunables.maxTier) {
      // Already at the cap → nothing left to upgrade to (no cost, no state change).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is already at the max money_holding_tier (${moneyHoldingTunables.maxTier}) — cannot upgrade further.`,
      });
    }

    const targetTier = currentTier + 1; // the tier the upgrade moves TO (the cost is keyed by this).
    const costCents = moneyHoldingUpgradeCostCents(targetTier); // R2.3: ratio.<targetTier> × conversion reference (NOT inline).

    const result = await this.repo.debitAndUpgradeMoneyHoldingTier({
      playerId,
      buildingId,
      fromTier: currentTier,
      costCents,
    });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative). No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the money-holding-tier upgrade cost.',
      });
    }

    this.logger.log(
      `upgrade-money-holding-tier: player=${playerId} building=${buildingId} → money_holding_tier ${currentTier}→${result.newTier} ` +
        `(target=${targetTier}, max=${moneyHoldingTunables.maxTier})`,
    );
    return { upgraded: true };
  }

  /**
   * DEPOSIT clean cash from the player's wallet (economy_states.cash_cents) into a player-owned money_holding's holding
   * pool (money_holding.held_cents), atomic + guarded. Validates `amount_cents` is a positive integer (422
   * VALIDATION_FAILED) BEFORE any DB work; validates the building is the player's owned money_holding (404 not owned /
   * no row; 409 RESOURCE_STATE_CONFLICT WRONG_TYPE otherwise). Then ONE tx moves the cash: the wallet is debited
   * atomically-guarded (insufficient balance → 409 INSUFFICIENT_FUNDS, no state change) and the held is credited under
   * the tier capacity guard (held + amount > capacityCentsForTier(currentTier) → 409 OVER_CAPACITY, the whole tx rolls
   * back). The held mutation also stamps last_yield_tick = the current tick (the T4 yield anchor).
   *
   * T4 SETTLE-FIRST: inside the SAME tx, BEFORE the transfer delta, the accrued yield is realized into held_cents
   * (held = min(held + accruedYieldCents(...), capacity) — overflow yield is LOST, never auto-withdrawn) and
   * last_yield_tick = currentTick. So the OVER_CAPACITY guard then checks the POST-settle held + amount. One tx,
   * deterministic, no RNG.
   *
   * Returns { deposited: true } — the raw new balances are NOT forwarded (R2.2; the held/capacity surface is the
   * qualitative band on the projection, T6).
   */
  async deposit(playerId: string, buildingId: string, amountCents: number): Promise<{ deposited: true }> {
    const amount = this.validatePositiveAmount(amountCents);
    const currentTier = await this.resolveMoneyHoldingTier(playerId, buildingId);

    const capacityCents = capacityCentsForTier(currentTier);
    const currentTick = await this.repo.getCurrentTick(playerId);

    let result: 'OK' | 'INSUFFICIENT_FUNDS';
    try {
      result = await this.repo.depositCash({ playerId, buildingId, amountCents: amount, capacityCents, currentTick });
    } catch (err) {
      if (err instanceof MoneyHoldingOverCapacityError) {
        // The held credit hit the tier capacity → the whole tx rolled back (no wallet debit, no held change).
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `deposit would exceed the money_holding capacity for building ${buildingId} (OVER_CAPACITY) — nothing was moved.`,
        });
      }
      throw err;
    }
    if (result === 'INSUFFICIENT_FUNDS') {
      // The guarded wallet debit affected 0 rows → insufficient balance. No state change (the tx rolled back).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash in the wallet to cover the deposit (INSUFFICIENT_FUNDS) — nothing was moved.',
      });
    }

    this.logger.log(`deposit-cash: player=${playerId} building=${buildingId} tier=${currentTier} tick=${currentTick} (wallet→held)`);

    // ── Drift C4 — ADDITIVE StashFillEvent emit (zero-regression: the return value below is UNCHANGED) ──────────────
    // The deposit tx has committed successfully at this point. We read the post-commit held_cents for the event payload
    // (an extra SELECT — additive-only, no change to the transfer result). readHeldCents returns null only if the row
    // vanished after the commit (unreachable in practice — defensive guard only).
    const heldCentsAfterBigInt = await this.repo.readHeldCents(playerId, buildingId);
    if (heldCentsAfterBigInt !== null) {
      this.bus.emitStashFill({
        type: 'stash_fill',
        playerId,
        buildingId,
        heldCentsAfter: Number(heldCentsAfterBigInt),
        capacityCents: Number(capacityCents),
        gameMinute: currentTick,
      });
    }

    return { deposited: true };
  }

  /**
   * WITHDRAW clean cash from a player-owned money_holding's holding pool (money_holding.held_cents) back into the
   * player's wallet (economy_states.cash_cents), atomic + guarded. Validates `amount_cents` is a positive integer (422)
   * BEFORE any DB work; validates the building is the player's owned money_holding (404 / 409 WRONG_TYPE). Then ONE tx
   * moves the cash: the held is debited atomically-guarded (held < amount → 409 INSUFFICIENT_HELD, no state change) and
   * the wallet is credited. The held mutation stamps last_yield_tick = the current tick (the T4 yield anchor).
   *
   * T4 SETTLE-FIRST: inside the SAME tx, BEFORE the held debit, the accrued yield is realized into held_cents
   * (held = min(held + accrued, capacity); last_yield_tick = currentTick), so the INSUFFICIENT_HELD guard checks the
   * POST-settle held. The withdraw needs the tier here only to resolve that settle cap. The wallet credit is hardened
   * (T3-review fold): it `.returning()`s the row and throws (rolling the held debit back) if 0 rows were affected, so
   * the held cash can never be silently lost were the wallet row ever absent.
   *
   * Returns { withdrawn: true } — the raw new balances are NOT forwarded (R2.2).
   */
  async withdraw(playerId: string, buildingId: string, amountCents: number): Promise<{ withdrawn: true }> {
    const amount = this.validatePositiveAmount(amountCents);
    // Resolve (and type-validate) the money_holding. The tier is unused as a withdraw-amount cap (no capacity on the way
    // out), but the T4 settle-first step caps the realized yield at capacityCentsForTier(tier), so we resolve it here.
    const currentTier = await this.resolveMoneyHoldingTier(playerId, buildingId);
    const capacityCents = capacityCentsForTier(currentTier);

    const currentTick = await this.repo.getCurrentTick(playerId);
    const result = await this.repo.withdrawCash({ playerId, buildingId, amountCents: amount, capacityCents, currentTick });
    if (result === 'INSUFFICIENT_HELD') {
      // The guarded held debit affected 0 rows → the holding had less than the requested amount. No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient held cash in the money_holding to cover the withdrawal (INSUFFICIENT_HELD) — nothing was moved.',
      });
    }

    this.logger.log(`withdraw-cash: player=${playerId} building=${buildingId} tick=${currentTick} (held→wallet)`);
    return { withdrawn: true };
  }

  /**
   * Validate `amount_cents` is a POSITIVE INTEGER (an amount of cents) — reject ≤ 0, non-integer, NaN, or non-finite with
   * 422 VALIDATION_FAILED. Guarded on the NUMBER (as the body delivers it) BEFORE the BigInt conversion so a fractional
   * cent never silently truncates. Returns the validated amount as a BigInt (the held_cents / cash_cents bigint columns).
   * r2/MAJOR-1 — this `typeof !== 'number'` clause is reachable ONLY because the controller's own
   * `intField(..., 'int8')` (param-pipes.ts) now rejects a STRING body value before this method ever
   * runs; a prior version of `intField` coerced a string literal to a number, which made this clause
   * dead code and silently widened the accepted body shape on this route (measured: `"12"` went from
   * 422 to accepted). Do not re-introduce string coercion in the shared body helper.
   */
  private validatePositiveAmount(amountCents: number): bigint {
    if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0) {
      // r2/m4 — details.param was missing here (the ONLY manual check on this route without it, since
      // intField's own OWN 422s already carry it) — the negative/zero case is the single most common
      // client error on this route and it rendered without field attribution.
      throw new ApiError('VALIDATION_FAILED', {
        message: `amount_cents must be a positive integer (cents), got ${JSON.stringify(amountCents)}.`,
        details: { param: 'amount_cents' },
      });
    }
    return BigInt(amountCents);
  }

  /**
   * Resolve a player-owned money_holding's CURRENT money_holding_tier — the shared ownership + WRONG_TYPE gate for the
   * deposit / withdraw actions. No operational-state row for this player+building → 404 RESOURCE_NOT_FOUND (not owned /
   * not converted). The row exists but operational_type ≠ 'money_holding' → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE). A
   * well-formed money_holding always has its 1-1 money_holding row (created on convert, T1), so money_holding_tier is
   * non-null here; the ?? 1 is a defensive floor that can never be exercised on a money_holding.
   */
  private async resolveMoneyHoldingTier(playerId: string, buildingId: string): Promise<number> {
    const state = await this.repo.getTransferTargetState(playerId, buildingId);
    if (!state) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.operational_type !== 'money_holding') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not a money_holding (operational_type='${state.operational_type}') — only a money_holding can hold cash.`,
      });
    }
    return state.money_holding_tier ?? 1;
  }
}

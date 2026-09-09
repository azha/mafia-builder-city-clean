// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (DEPOSIT_MAX — the
//             BOOKKEEPER archetype's "act now" option: sweep the WHOLE wallet into the holding) -- Phase-19 L1a Task 6 --
//
// DEPOSIT_MAX — REPLICATES BookkeeperBindingService.applyExecuteDefault's greedy deposit (src/operational/lieutenant/
// bookkeeper-binding.ts) with reserve=0 (sweep the whole wallet): amount = min( wallet_cents − 0 , capacityCentsForTier(
// tier) − held_cents ). BigInt math (parity with the bigint cents columns). amount <= 0 (nothing to sweep, or the holding
// is full) → NOOP. amount > 0 → MoneyHoldingService.deposit (the SAME guarded wallet→held transfer the player's POST
// /deposit-cash runs). A benign 409 (a RACE: OVER_CAPACITY / INSUFFICIENT_FUNDS) → NOOP (the binding's benign-409
// discipline). A null building / absent wallet / absent holding → NOOP.
//
// DEBT(v1.x): the min(wallet−reserve, capacityLeft) deposit amount-calc is duplicated from
// BookkeeperBindingService.applyExecuteDefault (and DEPOSIT_RESERVE) — extract a shared pure fn (e.g. depositAmount(wallet,
// reserve, capacityLeft)) once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { MoneyHoldingService } from '../../../money_holding/money-holding.service';
import { capacityCentsForTier } from '../../../money_holding/money-holding-tunables';
import { LieutenantRepository } from '../../lieutenant.repository';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class DepositMaxHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(DepositMaxHandler.name);
  readonly effectKind = 'DEPOSIT_MAX' as const;

  constructor(
    private readonly moneyHolding: MoneyHoldingService,
    private readonly repo: LieutenantRepository,
  ) {}

  async apply(ctx: AutonomyResolveContext): Promise<string> {
    const buildingId = ctx.assignedBuildingId;
    if (buildingId === null) return 'NOOP';

    const walletCents = await this.repo.getWalletCents(ctx.playerId);
    if (walletCents === null) return 'NOOP';

    const holding = await this.repo.getMoneyHoldingState(buildingId);
    if (holding === null) return 'NOOP';

    // GREEDY amount with reserve=0 (sweep the whole wallet) — BigInt parity with the bigint cents columns.
    const walletSurplus = walletCents; // reserve 0 → the whole wallet can spare.
    const capacityLeft = capacityCentsForTier(holding.money_holding_tier) - holding.held_cents;
    const amount = walletSurplus < capacityLeft ? walletSurplus : capacityLeft;
    if (amount <= 0n) return 'NOOP';

    try {
      await this.moneyHolding.deposit(ctx.playerId, buildingId, Number(amount));
      return 'DEPOSITED';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `DEPOSIT_MAX benign no-op for lieutenant=${ctx.lieutenantId} building=${buildingId} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

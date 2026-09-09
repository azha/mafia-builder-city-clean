// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (DEPOSIT_RESERVE —
//             the BOOKKEEPER archetype's conservative option: deposit but KEEP the wallet reserve) -- Phase-19 L1a T6 --
//
// DEPOSIT_RESERVE — REPLICATES BookkeeperBindingService.applyExecuteDefault's greedy deposit (src/operational/lieutenant/
// bookkeeper-binding.ts) VERBATIM (keeping `lieutenantTunables.bookkeeperWalletReserveCents` in the wallet — the SAME
// reserve the binding honors): amount = min( wallet_cents − reserve , capacityCentsForTier(tier) − held_cents ). BigInt
// math (parity with the bigint cents columns). amount <= 0 (nothing above the reserve, or the holding is full) → NOOP.
// amount > 0 → MoneyHoldingService.deposit (the SAME guarded transfer the binding + the player's POST /deposit-cash run).
// A benign 409 (a RACE) → NOOP. A null building / absent wallet / absent holding → NOOP.
//
// DEBT(v1.x): the min(wallet−reserve, capacityLeft) deposit amount-calc is duplicated from
// BookkeeperBindingService.applyExecuteDefault (and DEPOSIT_MAX) — extract a shared pure fn (e.g. depositAmount(wallet,
// reserve, capacityLeft)) once the option handlers + the binding can share one without a circular dep.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../../protocol/api-error';
import { MoneyHoldingService } from '../../../money_holding/money-holding.service';
import { capacityCentsForTier } from '../../../money_holding/money-holding-tunables';
import { LieutenantRepository } from '../../lieutenant.repository';
import { lieutenantTunables } from '../../lieutenant-tunables';
import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class DepositReserveHandler implements AutonomyOptionHandler {
  private readonly logger = new Logger(DepositReserveHandler.name);
  readonly effectKind = 'DEPOSIT_RESERVE' as const;

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

    // GREEDY amount keeping the wallet reserve — the VERBATIM BookkeeperBinding calc (BigInt parity with the cents columns).
    const reserveCents = BigInt(lieutenantTunables.bookkeeperWalletReserveCents);
    const walletSurplus = walletCents - reserveCents;
    const capacityLeft = capacityCentsForTier(holding.money_holding_tier) - holding.held_cents;
    const amount = walletSurplus < capacityLeft ? walletSurplus : capacityLeft;
    if (amount <= 0n) return 'NOOP';

    try {
      await this.moneyHolding.deposit(ctx.playerId, buildingId, Number(amount));
      return 'DEPOSITED_RESERVE';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        this.logger.debug(
          `DEPOSIT_RESERVE benign no-op for lieutenant=${ctx.lieutenantId} building=${buildingId} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err;
    }
  }
}

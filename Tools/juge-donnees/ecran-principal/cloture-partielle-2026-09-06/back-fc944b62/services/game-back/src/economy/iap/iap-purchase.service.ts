// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C3 (POST
//             /v1/me/iap/items/purchase — the debit-then-grant orchestration, atomic).
// -- W1.3-C3 -- 2026-08-13 --
//
// `IapPurchaseService` — orchestrates a Marks-denominated item purchase (COSMETIC/SAVE_SLOT SKUs
// only) in ONE transaction: grant the entitlement FIRST (the composite-PK guard, `IapEntitlement
// Repository.grant` — a duplicate purchase never reaches the debit at all, so it never debits),
// THEN the guarded Marks debit, THEN the ledger row. A rejected debit throws a sentinel to roll
// the WHOLE transaction back — including the entitlement insert that already ran — so "already
// owned" and "insufficient marks" both leave ZERO state change on failure.

import { Inject, Injectable } from '@nestjs/common';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { IapEntitlementRepository } from './iap-entitlement.repository';
import { MarksWalletRepository } from './marks-wallet.repository';
import { MarksLedgerRepository } from './marks-ledger.repository';

export type PurchaseItemResult = 'OK' | 'ALREADY_OWNED' | 'INSUFFICIENT_MARKS';

/** Sentinel thrown to roll the WHOLE purchase tx back when the guarded debit affects 0 rows (the
 *  entitlement insert must NOT survive an insufficient-balance rejection). Caught by the
 *  transaction's own caller, never escapes this file. */
class InsufficientMarksRollback extends Error {}

@Injectable()
export class IapPurchaseService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly entitlementRepo: IapEntitlementRepository,
    private readonly walletRepo: MarksWalletRepository,
    private readonly ledgerRepo: MarksLedgerRepository,
  ) {}

  async purchaseItemWithMarks(playerId: string, skuId: string, priceMarks: number): Promise<PurchaseItemResult> {
    try {
      return await this.db.transaction(async (tx) => {
        const granted = await this.entitlementRepo.grant(tx, playerId, skuId);
        if (!granted) {
          // The composite PK already has this (player_id, sku_id) — a duplicate purchase. No
          // debit attempted (design: re-acquisition impossible BY CONSTRAINT, checked BEFORE any
          // money moves). Returning here still commits the (empty) tx — nothing was written.
          return 'ALREADY_OWNED';
        }
        const debited = await this.walletRepo.debitGuarded(tx, playerId, priceMarks);
        if (!debited) {
          // Insufficient balance — roll the WHOLE tx back (the entitlement insert above must not
          // survive; throwing is the only way to undo it on this pool-backed db).
          throw new InsufficientMarksRollback();
        }
        await this.ledgerRepo.insert(tx, { playerId, deltaMarks: -priceMarks, reasonSku: skuId });
        return 'OK';
      });
    } catch (err) {
      if (err instanceof InsufficientMarksRollback) return 'INSUFFICIENT_MARKS';
      throw err;
    }
  }
}

// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C4 (POST
//             /v1/iap/purchase/validate — verify → record → credit, the constraint IS the
//             anti-replay) + §1.8 (fail-closed by construction: an unverified receipt reaches
//             neither `record` nor `creditUnconditional`).
// -- W1.3-C4 -- 2026-08-13 --
//
// `IapPurchaseValidateService` — orchestrates a real-money receipt validation:
//   1) `verifier.verify(platform, receipt)` — null (unknown/unverified) → REJECTED, nothing else
//      runs. This is the fail-closed gate (§1.8) — production always takes this branch (no
//      verifier is ever wired there); staging/dev take it too UNLESS a `_test` route registered
//      the exact (platform, receipt) pair first.
//   2) ONE transaction: `IapTransactionRepository.record` (the constraint-level anti-replay — a
//      duplicate receipt returns 'DUPLICATE', NEVER re-credits) → on a fresh insert, credit Marks
//      + write the ledger row. A duplicate replays the SAME success envelope WITHOUT crediting
//      again (design F-C4: "le 2e appel rend la MÊME enveloppe de succès — un rejeu idempotent,
//      pas un crash").

import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import type { IapPlatformEnumTs } from '../../db/schema/player_economy_state';
import { findIapSku } from './iap-sku-catalogue';
import { IAP_RECEIPT_VERIFIER, type IapReceiptVerifierPort } from './iap-receipt-verifier.port';
import { IapTransactionRepository } from './iap-transaction.repository';
import { MarksWalletRepository } from './marks-wallet.repository';
import { MarksLedgerRepository } from './marks-ledger.repository';

export type ValidatePurchaseResult =
  | { outcome: 'REJECTED' }
  | { outcome: 'CREDITED'; marksCredited: number; skuId: string };

@Injectable()
export class IapPurchaseValidateService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(IAP_RECEIPT_VERIFIER) private readonly verifier: IapReceiptVerifierPort,
    private readonly transactionRepo: IapTransactionRepository,
    private readonly walletRepo: MarksWalletRepository,
    private readonly ledgerRepo: MarksLedgerRepository,
  ) {}

  async validatePurchase(playerId: string, platform: IapPlatformEnumTs, receipt: string): Promise<ValidatePurchaseResult> {
    const verified = await this.verifier.verify(platform, receipt);
    if (!verified) {
      // Fail-closed (§1.8) — no fabricated success anywhere on this path. No DB write at all.
      return { outcome: 'REJECTED' };
    }
    const sku = findIapSku(verified.skuId);
    if (!sku || (sku.kind !== 'MARKS_PACK' && sku.kind !== 'SUPPORT')) {
      // Defensive — a registered receipt should always map to a real real-money SKU. Treat a
      // corrupt registration the SAME as an unverified receipt (fail-closed, no crediting).
      return { outcome: 'REJECTED' };
    }
    const marksGranted = sku.resolveMarksGranted!();
    const receiptHash = createHash('sha256').update(receipt).digest('hex');

    return this.db.transaction(async (tx) => {
      const txnId = randomUUID();
      const result = await this.transactionRepo.record(tx, {
        txnId,
        playerId,
        sku: verified.skuId,
        amountCents: verified.amountCents,
        currencyCode: verified.currencyCode,
        platform,
        platformReceipt: receipt,
        purchasedAt: new Date(),
      });
      if (result === 'DUPLICATE') {
        // The constraint caught a rejeu — the SAME success envelope, NO second credit (design
        // F-C4: "le 2e appel rend la MÊME enveloppe de succès, un rejeu idempotent, pas un
        // crash"). marksGranted is deterministic from the sku (same catalogue resolver both
        // times) — recomputing it here is NOT a second grant, it's the value already credited.
        return { outcome: 'CREDITED', marksCredited: marksGranted, skuId: verified.skuId };
      }
      await this.walletRepo.creditUnconditional(tx, playerId, marksGranted);
      await this.ledgerRepo.insert(tx, {
        playerId,
        deltaMarks: marksGranted,
        reasonSku: verified.skuId,
        receiptHash,
      });
      return { outcome: 'CREDITED', marksCredited: marksGranted, skuId: verified.skuId };
    });
  }
}

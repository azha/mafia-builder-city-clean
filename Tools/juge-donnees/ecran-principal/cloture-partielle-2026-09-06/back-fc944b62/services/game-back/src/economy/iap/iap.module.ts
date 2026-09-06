// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3 (C1→C6 — this
//             module accretes providers/controllers chunk by chunk, mirrors `LiveOpsModule`'s own
//             incremental-growth convention).
// -- W1.3-C1 -- 2026-08-13 -- (catalogue: IapCatalogueService + its boot assertion,
//    IapSkuOverrideRepository, IapController's GET /iap/catalogue, IapCatalogueAdminController's
//    PATCH /admin/iap/skus/:sku_id.)
// -- W1.3-C2 -- 2026-08-13 -- (imports EconomyModule for the shared getWalletAndMarks resolver,
//    D2; registers MarksLedgerRepository; IapController's GET /me/iap/balance.)
// -- W1.3-C3 -- 2026-08-13 -- (registers IapEntitlementRepository, MarksWalletRepository,
//    IapPurchaseService; IapController's POST /me/iap/items/purchase + GET /me/iap/entitlements.)
// -- W1.3-C4 -- 2026-08-13 -- (IAP_RECEIPT_VERIFIER token-override binding — the EXACT
//    LIVE_OPS_CLOCK/MARKETING_CONSENT pattern, live-ops.module.ts:126-155; registers
//    IapTransactionRepository, IapPurchaseValidateService; IapController's POST
//    /iap/purchase/validate; conditionally mounts IapTestController.)
// -- W1.3-C5 -- 2026-08-13 -- (registers IapEconomyAdminController — PATCH
//    /admin/players/:id/economy/marks + GET /admin/players/:id/iap-history, ALWAYS-ON, never
//    testControllersEnabled()-gated — real production BO routes.)
//
// `IapModule` — the monetization surface (ch10). Imports AuthModule (JwtAuthGuard +
// requireStaffRole's own dependency-free guard factory needs no module import, but AuthModule is
// REUSE for the player JWT guard) and EconomyModule (the shared wallet/marks resolver, D2 — this
// module injects `EconomyRepository` directly, EconomyModule exports it since C2).

import { Module, type Provider } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { AuthModule } from '../../auth/auth.module';
import { EconomyModule } from '../economy.module';
import { IapSkuOverrideRepository } from './iap-sku-override.repository';
import { IapCatalogueService } from './iap-catalogue.service';
import { IapCatalogueAdminController } from './iap-catalogue-admin.controller';
import { IapController } from './iap.controller';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { MarksLedgerRepository } from './marks-ledger.repository';
import { IapEntitlementRepository } from './iap-entitlement.repository';
import { MarksWalletRepository } from './marks-wallet.repository';
import { IapPurchaseService } from './iap-purchase.service';
import { IapTransactionRepository } from './iap-transaction.repository';
import { IapPurchaseValidateService } from './iap-purchase-validate.service';
import { IAP_RECEIPT_VERIFIER, NullIapReceiptVerifier, FakeIapReceiptVerifier } from './iap-receipt-verifier.port';
import { IapTestController } from './iap-test.controller';
import { IapEconomyAdminController } from './iap-economy-admin.controller';

// ── C4 — IAP_RECEIPT_VERIFIER binding (§1.8, the SAME token-override proof as LIVE_OPS_CLOCK /
// MARKETING_CONSENT) ────────────────────────────────────────────────────────────────────────────
// Production (`testControllersEnabled() === false`): IAP_RECEIPT_VERIFIER → NullIapReceiptVerifier
// ONLY (resolves null for EVERY receipt, unconditionally — no store adapter exists, §1.7). Every
// OTHER environment (dev/E2E, INCLUDING staging — §1.8 measured `testControllersEnabled()===true`
// there): IAP_RECEIPT_VERIFIER → the SAME FakeIapReceiptVerifier singleton `IapTestController`
// mutates via its own class token (`useExisting` — NOT a second instance) — so
// `_test/iap/receipts/*` routes register the EXACT (platform, receipt) pair
// `IapPurchaseValidateService` reads through IAP_RECEIPT_VERIFIER. FakeIapReceiptVerifier defaults
// to an EMPTY allow-list until explicitly mutated — zero behavioral difference from
// NullIapReceiptVerifier for every consumer that never touches the receipt test routes (§1.8's
// safety argument: the fake's DEFAULT is the guard, not the environment gate).
const receiptVerifierProviders: Provider[] = testControllersEnabled()
  ? [
      FakeIapReceiptVerifier, // registers the class itself — IapTestController injects it directly.
      { provide: IAP_RECEIPT_VERIFIER, useExisting: FakeIapReceiptVerifier },
    ]
  : [{ provide: IAP_RECEIPT_VERIFIER, useClass: NullIapReceiptVerifier }];

@Module({
  imports: [AuthModule, EconomyModule],
  controllers: [
    IapController,
    IapCatalogueAdminController,
    IapEconomyAdminController,
    ...(testControllersEnabled() ? [IapTestController] : []),
  ],
  providers: [
    IapSkuOverrideRepository,
    IapCatalogueService,
    AdminAuditLogService,
    MarksLedgerRepository,
    IapEntitlementRepository,
    MarksWalletRepository,
    IapPurchaseService,
    IapTransactionRepository,
    IapPurchaseValidateService,
    ...receiptVerifierProviders,
  ],
  exports: [],
})
export class IapModule {}

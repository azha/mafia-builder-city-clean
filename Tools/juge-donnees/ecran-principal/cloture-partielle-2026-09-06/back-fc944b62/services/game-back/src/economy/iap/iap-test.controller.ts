// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §1.8/§3-C4 (the
//             FakeIapReceiptVerifier token-override proof — the EXACT `_test/liveops/consent/*`
//             pattern, live-ops-test.controller.ts:719-765, applied to the receipt-verifier seam).
// -- W1.3-C4 -- 2026-08-13 --
//
// `IapTestController` — TEST-ONLY probe routes for `IapModule`. Mounted ONLY when
// `testControllersEnabled()` (never in production — `protocol/test-routes-gate.ts:25-27`).
//
//   POST /v1/_test/iap/receipts/register — Body: { platform, receipt, sku_id, amount_cents,
//     currency_code }. Registers the EXACT (platform, receipt) pair as verifiable on the SAME
//     `FakeIapReceiptVerifier` singleton `IAP_RECEIPT_VERIFIER` resolves to in every non-production
//     environment (the token-override proof — mirrors `_test/liveops/consent/set-opted-in`).
//   POST /v1/_test/iap/receipts/reset — restores the empty-allow-list default.
//
// ★ SAID EXPLICITLY (not left to be inferred): THIS controller is ALSO mounted in staging
// (`testControllersEnabled()` gates on `NODE_ENV !== 'production'`, TRUE for `staging` —
// `docker-compose.staging.yml:26`). A staging caller can therefore `register` a receipt and then
// `POST /v1/iap/purchase/validate` it for a real credit. This is NOT new exposure this chunk
// creates — other `_test` controllers already write to sensitive economy-adjacent tables under
// the SAME gate (a pre-existing, repo-wide posture, not audited exhaustively here) — but the
// design's own review flagged that leaving this unstated invites it to be discovered later as if
// it were a surprise. It isn't: `testControllersEnabled()` was never meant to be a production
// boundary substitute (§1.8's whole point), and this route is exactly as exposed as every sibling
// `_test` route in staging.

import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';

import { FakeIapReceiptVerifier } from './iap-receipt-verifier.port';
import type { IapPlatformEnumTs } from '../../db/schema/player_economy_state';

interface RegisterReceiptBody {
  platform?: IapPlatformEnumTs;
  receipt?: string;
  sku_id?: string;
  amount_cents?: string; // JSON-safe bigint-as-string (the lot-0 bigint string convention).
  currency_code?: string;
}

@Controller('_test/iap')
export class IapTestController {
  constructor(private readonly fakeVerifier: FakeIapReceiptVerifier) {}

  @Post('receipts/register')
  @HttpCode(200)
  registerReceipt(@Body() body: RegisterReceiptBody | undefined): { ok: true } {
    const { platform, receipt, sku_id: skuId, amount_cents: amountCents, currency_code: currencyCode } = body ?? {};
    if (!platform || !receipt || !skuId || amountCents === undefined || !currencyCode) {
      throw new HttpException(
        'platform, receipt, sku_id, amount_cents, currency_code all required',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.fakeVerifier.register(platform, receipt, { skuId, amountCents: BigInt(amountCents), currencyCode });
    return { ok: true };
  }

  @Post('receipts/reset')
  @HttpCode(200)
  resetReceipts(): { ok: true } {
    this.fakeVerifier.reset();
    return { ok: true };
  }
}

// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §1.8 (B1 — the
//             fail-closed receipt port; the FAKE's safety comes from its DEFAULT, never from the
//             environment gate) + §3-C4.
//             Precedent (BYTE-MIRRORED): operational/liveops/marketing-consent.port.ts
//             (FailClosedMarketingConsent / FakeMarketingConsent — production binds the fail-closed
//             class UNCONDITIONALLY true, non-production binds a fake whose allow-list is EMPTY by
//             default and only ever mutated via a `_test` route).
// -- W1.3-C4 -- 2026-08-13 --
//
// §1.8 measured that `testControllersEnabled()` is TRUE in staging (`NODE_ENV=staging`,
// docker-compose.staging.yml:26) — so a fake bound "under that gate" is production-shaped code for
// every staging request. Its safety canNOT come from the gate; it must come from the fake's OWN
// default. `FakeIapReceiptVerifier` mirrors `FakeMarketingConsent` EXACTLY: an empty map by
// default (every receipt is UNKNOWN, `verify` resolves null — IDENTICAL behavior to
// `NullIapReceiptVerifier` for every consumer that never touches the `_test/iap/receipts/*`
// routes), mutated ONLY by an explicit `_test` registration.
//
// `NullIapReceiptVerifier` (production, `testControllersEnabled() === false`) is the ONLY
// implementation ever bound in production. §1.7 measured ZERO outbound HTTP capability in this
// codebase (no axios/fetch/undici dependency, no egress) — there is NOTHING to verify against, so
// this class resolves null for EVERY receipt, unconditionally. Anti-fig-leaf boundary (mirrors
// marketing-consent.port.ts's own): there is no fabricated "verified" result anywhere in
// production code — the ONLY way a receipt is ever accepted is through the `_test` seam, gated OFF
// in production.

import { Injectable } from '@nestjs/common';

import type { IapPlatformEnumTs } from '../../db/schema/player_economy_state';

/** What a verified receipt resolves to — enough for `IapTransactionRepository.record` to insert a
 *  real `iap_transactions` row without ANY fabricated dollar amount (§1.7 — no store integration
 *  exists to source one; the `_test` registration route supplies it explicitly, mirroring what a
 *  REAL Apple/Google receipt payload would carry). */
export interface VerifiedReceipt {
  skuId: string;
  amountCents: bigint;
  currencyCode: string;
}

/**
 * The receipt-verification seam. `verify` is the ONLY sanctioned way `POST
 * /v1/iap/purchase/validate` learns whether a `(platform, receipt)` pair is genuine — never an
 * inline "trust the client" check anywhere else. Returns null for an unverified/unknown receipt —
 * NEVER throws for that case (a throw would be indistinguishable from a genuine verifier outage at
 * the call site; §1.8's F-C4 contract needs "unknown" and "verifier down" to stay distinguishable
 * for a FUTURE real adapter, D1 — this lot has none).
 */
export interface IapReceiptVerifierPort {
  verify(platform: IapPlatformEnumTs, receipt: string): Promise<VerifiedReceipt | null>;
}

/** DI token (string-token convention, mirrors `MARKETING_CONSENT`/`LIVE_OPS_CLOCK`/`DB`/`REDIS`). */
export const IAP_RECEIPT_VERIFIER = 'IAP_RECEIPT_VERIFIER';

/**
 * `NullIapReceiptVerifier` — the PRODUCTION default, and the ONLY binding ever registered in
 * production. No store adapter exists (§1.7 — zero egress capability); there is nothing to verify
 * against, so this resolves null for EVERY receipt, unconditionally. Consequence in production
 * TODAY: `POST /v1/iap/purchase/validate` is reachable (JWT, a real production controller) but
 * NEVER credits — the legally-honest outcome when no verifier is wired (design §1.8 table).
 */
@Injectable()
export class NullIapReceiptVerifier implements IapReceiptVerifierPort {
  async verify(_platform: IapPlatformEnumTs, _receipt: string): Promise<null> {
    return null;
  }
}

/**
 * `FakeIapReceiptVerifier` — the TEST-ONLY implementation, field-for-field mirror of
 * `FakeMarketingConsent`. Bound to `IAP_RECEIPT_VERIFIER` (via `useExisting`) in every
 * non-production environment, AND registered under its own class token so `IapTestController` can
 * inject the SAME singleton instance to mutate it via `_test/iap/receipts/*` routes.
 *
 * Defaults to an EMPTY allow-list — every consumer that never touches the `_test` routes (every
 * OTHER spec sharing the same E2E stack, and every production-shaped code path) observes behavior
 * IDENTICAL to `NullIapReceiptVerifier`. A test explicitly registers a receipt via `register`
 * (the load-bearing "the validate route is real" proof) before it resolves to anything.
 */
@Injectable()
export class FakeIapReceiptVerifier implements IapReceiptVerifierPort {
  private registered = new Map<string, VerifiedReceipt>();

  private key(platform: IapPlatformEnumTs, receipt: string): string {
    return `${platform}:${receipt}`;
  }

  async verify(platform: IapPlatformEnumTs, receipt: string): Promise<VerifiedReceipt | null> {
    return this.registered.get(this.key(platform, receipt)) ?? null;
  }

  /** TEST-ONLY: register a receipt as verifiable, carrying the amount/currency a REAL Apple/Google
   *  payload would (no fabricated production value — the caller supplies it explicitly). */
  register(platform: IapPlatformEnumTs, receipt: string, verified: VerifiedReceipt): void {
    this.registered.set(this.key(platform, receipt), verified);
  }

  /** TEST-ONLY: restore the empty-allow-list default — cleanup, never leaks a registered receipt
   *  into a later, unrelated spec sharing the same E2E stack. */
  reset(): void {
    this.registered.clear();
  }
}

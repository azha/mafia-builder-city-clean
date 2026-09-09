// IMPLEMENTS: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.4 (DD-B5 — C7 realizes D4
//             via a fail-CLOSED marketing-consent SEAM; the consent STORE is deferred to TD-087)
//             Plan: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C7 (sendNotifications +
//             cap/cooldown + per-event consent gate, D4) — plan `:114`/`:297` "REUSE ConsentFlagsComposite"
//             is SUPERSEDED by DD-B5 (decisions §2.4 — there is nothing in code to reuse; this seam IS
//             the realization).
//             Mirror: live-ops-clock.port.ts (LiveOpsClockPort/FakeLiveOpsClock — the EXACT
//             token-override + env-gated test-route pattern this file adapts to the consent seam).
//             In-repo consent-seam precedent: telemetry/ingestion.service.ts:19-21 ("CONSENT SEAM
//             (documented): NO account-level consent table exists day-1").
//             — 04e-B C7 — 2026-07-06
//
// `MarketingConsentPort` — the injectable marketing-consent-read seam (DD-B5 §2.4). D4 (decisions §1)
// requires MARKETING-class push notices to be gated by `marketing_optin`, fail-closed on read failure.
// NO per-player consent store exists anywhere in this codebase (DD-B5 verified by direct grep:
// `ConsentFlagsComposite`/`consent_flags`/`marketing_optin` = 0 real code hits — only a canon DOC
// composite + one forward-referencing comment; `db/schema/player.ts`/`account.ts` carry NO consent
// columns). The consent STORE itself is deferred to **TD-087** (ch26 `ConsentRecord`/`consent_flags`
// projection, `[à backporter 09]`). This port is the seam that will read the real store once TD-087
// lands — until then, the production implementation is fail-CLOSED (see `FailClosedMarketingConsent`
// below).
//
// ANTI-FIG-LEAF BOUNDARY (DD-B5, stated verbatim — the reviewer verifies this line): there is NO
// fabricated production consent read that returns `true`. `FailClosedMarketingConsent` (the ONLY
// binding in production) resolves `false` for EVERY player, unconditionally — the legally-correct
// outcome when no consent is on record (Art.6(1)(a), `consent_flows.md:4`). The MARKETING gate LOGIC
// itself is fully real and PROVEN (`LiveOpsNotificationService.sendNotifications` consults this port
// ONLY for MARKETING-class events; SERVICE bypasses it entirely, always sendable subject to cap +
// cooldown) — only the DATA SOURCE behind `isMarketingOptedIn` is deferred. The load-bearing falsifiable
// proof (`liveops_notifications.spec.ts`): a default (never-opted-in) player must NOT receive a
// MARKETING notice — an always-true stub would make that assertion fail.
//
// Token convention: this codebase injects non-class singletons via a plain STRING token (`db/db.module.ts`'s
// `DB`/`REDIS` pattern, mirrored by this file's own sibling `LIVE_OPS_CLOCK`) — NOT NestJS's
// `@Injectable()`-interface trick. `MARKETING_CONSENT` follows that exact convention.
//
// ★ THE TOKEN-OVERRIDE PROOF (mirrors live-ops-clock.port.ts's own ★ C4 note verbatim, adapted to
// consent). This codebase's E2E charte (ch27) is black-box HTTP against a REAL dockerized stack ONLY —
// there is NO `Test.createTestingModule()`/`overrideProvider()` anywhere in this repo (grepped, zero
// hits — the SAME fact C4's clock seam relied on) to swap a DI binding from OUTSIDE a running process.
// `LiveOpsModule` binds `MARKETING_CONSENT` to `FailClosedMarketingConsent` ONLY in production, and to
// `FakeMarketingConsent` (via `useExisting`, the SAME singleton instance also reachable by its own class
// token) in every non-production environment — gated by the SAME `testControllersEnabled()` predicate
// that already governs `LiveOpsTestController`'s mount and the `LIVE_OPS_CLOCK` binding
// (`live-ops.module.ts:99,110-117`). `LiveOpsTestController`'s new `_test/liveops/consent/*` routes (C7)
// mutate this SAME instance — proving the binding is genuinely swappable, real, environment-conditioned
// DI, not hardwired — the exact `LiveOpsClockPort` token-override proof, adapted to consent.
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched.
// `FailClosedMarketingConsent` remains the ONLY implementation ever bound in production.

import { Injectable } from '@nestjs/common';

/**
 * The marketing-consent-read seam. `isMarketingOptedIn` is the ONLY sanctioned way live-ops code reads a
 * player's marketing-push consent (DD-B5 §2.4) — never an inline table read anywhere else.
 */
export interface MarketingConsentPort {
  /**
   * Resolves `true` iff the given player has genuinely opted into marketing push (`Art.6(1)(a)` consent).
   * MUST be treated as fail-CLOSED by every caller: a REJECTED promise from this method is NOT a `true`
   * — `LiveOpsNotificationService.sendNotifications` collapses any rejection to `false` before deciding
   * whether to write a MARKETING-class notification row (DD-B5's "fail-closed on read failure").
   */
  isMarketingOptedIn(playerId: string): Promise<boolean>;
}

/** DI token for {@link MarketingConsentPort} (string-token convention, mirrors `LIVE_OPS_CLOCK`/`DB`/`REDIS`). */
export const MARKETING_CONSENT = 'MARKETING_CONSENT';

/**
 * `FailClosedMarketingConsent` — the PRODUCTION default (DD-B5 §2.4), and the ONLY binding ever
 * registered in production (`testControllersEnabled() === false`). No per-player consent store exists
 * yet (TD-087) — there is nothing to read, so this implementation resolves `false` for EVERY player,
 * unconditionally. Consequence in production TODAY: MARKETING-class notices are suppressed for ALL
 * players — the legally-correct outcome when no consent is on record. When TD-087's `ConsentRecord`/
 * `consent_flags` projection lands, THIS class's body is the ONLY thing that changes (swap the
 * unconditional `false` for a real per-player read) — no other C7 code (the gate order, the cap, the
 * cooldown, the ledger, the per-event class table) needs to change.
 */
@Injectable()
export class FailClosedMarketingConsent implements MarketingConsentPort {
  async isMarketingOptedIn(_playerId: string): Promise<boolean> {
    // No consent store exists (TD-087) — there is nothing to read. Fail-closed default, never a
    // fabricated `true` (DD-B5 anti-fig-leaf boundary).
    return false;
  }
}

/**
 * `FakeMarketingConsent` (C7) — the TEST-ONLY implementation, mirrors `FakeLiveOpsClock` field-for-field.
 * Bound to `MARKETING_CONSENT` (via `useExisting`) in every non-production environment (`LiveOpsModule`,
 * gated by `testControllersEnabled()` — the SAME gate governing `LiveOpsTestController`'s mount and the
 * `LIVE_OPS_CLOCK` binding), and ALSO registered under its own class token so `LiveOpsTestController` can
 * inject the SAME singleton instance directly to mutate it via the new `_test/liveops/consent/*` routes.
 *
 * Defaults to fail-CLOSED (empty opted-in set, not failing) — so every consumer that never touches the
 * `_test/liveops/consent/*` routes (every OTHER spec sharing the same E2E stack, and every
 * production-shaped code path) observes behavior IDENTICAL to `FailClosedMarketingConsent`. A test
 * explicitly opts a player in via `setOptedIn` (the load-bearing "MARKETING is real" proof), or forces
 * every call to reject via `setFailing(true)` (proving DD-B5's "fail-closed on READ FAILURE", distinct
 * from "no consent on record").
 */
@Injectable()
export class FakeMarketingConsent implements MarketingConsentPort {
  private optedIn = new Set<string>();
  private failing = false;

  async isMarketingOptedIn(playerId: string): Promise<boolean> {
    if (this.failing) {
      throw new Error('FakeMarketingConsent: simulated consent-read failure (test-only, DD-B5 §2.4 proof)');
    }
    return this.optedIn.has(playerId);
  }

  /** TEST-ONLY: mark the given player genuinely opted-in. */
  setOptedIn(playerId: string): void {
    this.optedIn.add(playerId);
  }

  /** TEST-ONLY: force every subsequent `isMarketingOptedIn` call to reject — simulates a consent-read
   *  failure so the fail-closed-on-error path (DD-B5) can be exercised deterministically. */
  setFailing(failing: boolean): void {
    this.failing = failing;
  }

  /** TEST-ONLY: restore fail-closed-default behavior — test cleanup, never leaks opted-in state or a
   *  forced failure into a later, unrelated spec sharing the same E2E stack. */
  reset(): void {
    this.optedIn.clear();
    this.failing = false;
  }
}

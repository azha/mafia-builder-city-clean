// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6-fix (MINOR-2 fold —
//             "open() must NEVER 500 because of the advisory compute"; falsifiable proof: a test seam
//             that forces one provider to throw → open still 200 with hl_card computation skipped
//             gracefully).
//             — P3-A C6-fix (⊥ IMPORTANT-1 gate, MINOR-2) — 2026-07-10
//
// `HlCardFaultInjector` — TEST-ONLY, in-memory, one-shot fault injection for the C6 compute-at-open
// path. Mirrors this codebase's OTHER in-memory test-only state (e.g. `CoreLoopsTestController`'s own
// `_capturedAgedOutEvents` capture-probe) — NOT gated behind `testControllersEnabled()` itself (the
// class always exists in the DI graph, harmless when never armed), but the ONLY way to ARM it is the
// test-only route `POST /v1/_test/core-loops/arm-hl-provider-failure` (`core-loops-test.controller.ts`,
// itself `testControllersEnabled()`-gated) — no production code path ever calls `arm`.
//
// `HlCardService#computeAndPersist` consumes this BEFORE calling a provider's `getCandidates` (one
// check per provider, per compute cycle) — armed + consumed → throws a clearly-labeled TEST-ONLY
// error, which `SessionService#open`'s own try/catch (MINOR-2's OTHER half) catches, logs, and
// degrades to "no HL card this cycle" WITHOUT ever surfacing a 500 to the caller. One-shot: `arm`
// re-arms; the FIRST `getCandidates` call for that provider after arming consumes the flag (so a
// SECOND compute-at-open in the same test run is NOT also poisoned unless re-armed).

import { Injectable } from '@nestjs/common';

import type { HlCardProviderType } from './hl-card-types';

@Injectable()
export class HlCardFaultInjector {
  private readonly armed = new Set<HlCardProviderType>();

  /** TEST-ONLY: arm the given provider to throw on its NEXT `getCandidates` call. */
  arm(type: HlCardProviderType): void {
    this.armed.add(type);
  }

  /** Consumed by `HlCardService#computeAndPersist` before invoking a provider — `true` (and clears
   *  the arm) iff this provider was armed; `false` (no-op) otherwise — the common, unarmed case. */
  consumeIfArmed(type: HlCardProviderType): boolean {
    if (this.armed.has(type)) {
      this.armed.delete(type);
      return true;
    }
    return false;
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C0 (LiveOpsClockPort seam) + DD-B3
//             + C4 (★ real consumer + FakeLiveOpsClock, the token-override proof)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §2.2 (DD-B3 reasoning)
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.2
//             — 04e-B C0 — 2026-07-06
//             — 04e-B C4 — 2026-07-06 (FakeLiveOpsClock — the deterministic test-only implementation)
//
// `LiveOpsClockPort` — the injectable real-time seam (DD-B3). Live-ops event durations are REAL days
// (`gdd/04e §2.1` "real calendar"), unlike every existing in-game-time cadence in this codebase
// (`city_sim_system.ts:21-33` MINUTE/HOURLY/NIGHTLY/WEEKLY) and unlike A1's game-day-based
// `EffectModifierService.revertExpired(currentGameDay)`. Determinism (plan §Global constraints) forbids
// an inline `Date.now()` anywhere a mechanic reads real time — so every real-clock read in live-ops MUST
// go through this port instead.
//
// C4 = the first real consumer: `LiveOpsEventService.activateLiveOpsEvent`/`deactivateLiveOpsEvent`
// write `started_at`/`ends_at` from `clock.now()`, and `LiveOpsSchedulerService`'s real-clock reconciler
// sweeps `live_ops_event_active WHERE ends_at <= clock.now()` (+ a boot reconciler, `OnApplicationBootstrap`,
// mirroring `meta-market-tick.service.ts`'s own pattern, for crash-recovery — the real-time analog of A1's
// `revertExpired` sweep). NO mechanic reads `Date.now()`/`new Date()` directly anywhere else in
// `operational/liveops/` — `clock.now()` is the ONLY sanctioned real-time read (grepped at C4).
//
// Token convention: this codebase injects non-class singletons via a plain STRING token
// (`db/db.module.ts`'s `DB`/`REDIS` pattern — `@Inject(DB) private readonly db: DrizzleClient`), NOT
// NestJS's `@Injectable()`-interface trick. `LIVE_OPS_CLOCK` follows that exact convention.
//
// ★ C4 — THE TOKEN-OVERRIDE PROOF (C0's own review flagged this must be proven at the first real
// consumer). This codebase's E2E charte (ch27) is black-box HTTP-against-a-real-dockerized-stack ONLY —
// there is NO `Test.createTestingModule()`/`overrideProvider()` anywhere in this repo (grepped, zero
// hits) to swap a DI binding from OUTSIDE a running process. The established, charte-compliant seam for
// exactly this situation is `EffectOverlayStore.dropSnapshotForTest()` + `init()`
// (`config/effect-overlay-store.ts` — a production singleton with a TEST-ONLY mutation hook reachable
// only via a gated `_test/*` route, R-EC-2). `FakeLiveOpsClock` below is that SAME pattern applied to
// this port: `LiveOpsModule` (see that file) binds the `LIVE_OPS_CLOCK` token to `FakeLiveOpsClock`
// (via `useExisting`, SAME singleton instance also reachable by its own class token) in every
// non-production environment, and to `SystemLiveOpsClock` ONLY in production — so `LIVE_OPS_CLOCK` is
// genuinely NOT hardwired to one implementation; the binding is real, swappable, environment-conditioned
// DI, proven live by `LiveOpsTestController`'s `_test/liveops/clock/*` routes (C4) mutating the SAME
// instance `LiveOpsEventService`/`LiveOpsSchedulerService` read through the token. `FakeLiveOpsClock`
// defaults to the real wall clock until a test explicitly pins it, so every OTHER spec sharing the same
// E2E stack (and every code path that never calls `clock/set-now`) observes IDENTICAL behavior to
// `SystemLiveOpsClock` — zero regression.
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched.
// `SystemLiveOpsClock` remains the ONLY implementation ever bound in production.

import { Injectable } from '@nestjs/common';

/**
 * The real-clock read seam. `now()` is the ONLY sanctioned way live-ops code reads real (wall-clock)
 * time — never an inline `Date.now()`/`new Date()` call site outside this port's own implementation.
 */
export interface LiveOpsClockPort {
  /** The current real-world instant. Production: the system clock. E2E: an injected fake. */
  now(): Date;
}

/** DI token for {@link LiveOpsClockPort} (string-token convention, mirrors `db/db.module.ts`'s `DB`/`REDIS`). */
export const LIVE_OPS_CLOCK = 'LIVE_OPS_CLOCK';

/**
 * `SystemLiveOpsClock` — the production default: reads the real system clock. Registered as the
 * `LIVE_OPS_CLOCK` provider in `LiveOpsModule`. E2E specs are expected to substitute a deterministic
 * fake bound to the same token (never mutate this class to "advance" — a fake is a SEPARATE
 * implementation of the same port, so production and test never share mutable clock state).
 */
@Injectable()
export class SystemLiveOpsClock implements LiveOpsClockPort {
  now(): Date {
    return new Date();
  }
}

/**
 * `FakeLiveOpsClock` (C4) — the TEST-ONLY deterministic implementation. Bound to `LIVE_OPS_CLOCK` (via
 * `useExisting`) in every non-production environment (`LiveOpsModule`, gated the SAME way
 * `LiveOpsTestController` already is — `testControllersEnabled()`), and ALSO registered under its own
 * class token so `LiveOpsTestController` can inject the SAME singleton instance directly to mutate it
 * (mirrors `EffectOverlayStore.dropSnapshotForTest()`'s "production singleton + gated test-only mutation
 * hook" shape — never a bespoke test-only reload/consumer path; the exact same instance the real
 * `LiveOpsEventService`/`LiveOpsSchedulerService` consume via the `LIVE_OPS_CLOCK` token is what the
 * `_test/liveops/clock/*` routes pin/advance/reset).
 *
 * Defaults to the REAL wall clock (`new Date()`) until a test explicitly pins it with `setNow` —
 * so every consumer that never touches the `_test/liveops/clock/*` routes (every OTHER spec sharing the
 * same E2E stack, and every production-shaped code path) observes behavior IDENTICAL to
 * `SystemLiveOpsClock`. Never mutated from production code — only from the gated test controller.
 */
@Injectable()
export class FakeLiveOpsClock implements LiveOpsClockPort {
  private pinned: Date | null = null;

  now(): Date {
    return this.pinned ?? new Date();
  }

  /** TEST-ONLY: pin the clock to an explicit instant — deterministic from this call forward until `reset()`. */
  setNow(date: Date): void {
    this.pinned = date;
  }

  /**
   * TEST-ONLY: advance the pinned instant by `ms` milliseconds. If never pinned yet, anchors to the
   * real current instant first (so a bare `advanceByMs` call produces a deterministic, monotonically
   * advanced instant rather than silently no-op-ing against a moving `new Date()` baseline).
   */
  advanceByMs(ms: number): void {
    this.pinned = new Date((this.pinned ?? new Date()).getTime() + ms);
  }

  /** TEST-ONLY: restore real-wall-clock behavior — test cleanup, never leaks a pinned instant into a
   *  later, unrelated spec sharing the same E2E stack. */
  reset(): void {
    this.pinned = null;
  }
}

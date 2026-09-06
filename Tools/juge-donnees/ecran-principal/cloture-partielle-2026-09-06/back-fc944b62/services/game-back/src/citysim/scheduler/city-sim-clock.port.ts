// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1d-world-turns-design.md §4.2/§4.3 (C2 — the seam,
//             fail-deterministic polarity, distinct token) + §5.2 (single positive discriminant, the SAME
//             flag commands both the pilot and the clock — scheduler.module.ts wires the binding)
//             — W1.1-d C2 — 2026-08-09 —
//
// `CITYSIM_CLOCK` — the city-sim real-clock read seam (B2/I3). REUSES `LiveOpsClockPort`'s INTERFACE
// (design §4.2 — "réutiliser l'INTERFACE, pas l'IMPLÉMENTATION... une seule notion de temps réel dans le
// dépôt"). It does NOT touch/extend `SystemLiveOpsClock`/`FakeLiveOpsClock` (`live-ops-clock.port.ts:67,89`)
// — those two are a SEPARATE singleton pair, and `FakeLiveOpsClock` defaults to the REAL wall clock until a
// test explicitly pins it (`:83-86`) — 41 specs depend on that default staying non-regressed (design §4.2
// measurement: 50 specs touch live-ops, 9 pin the clock). City-sim needs the OPPOSITE default (§4.3): a
// forgotten `CITYSIM_CONTINUOUS_LOOPS` flag must freeze the world, never let it run on the real wall clock
// under a spec that never asked for it. Two distinct singletons under two distinct tokens, one shared
// interface — that is what makes "one canonical notion of real time" true without inverting a polarity 41
// specs already rely on.
//
// Binding (`scheduler.module.ts`): `CITYSIM_CONTINUOUS_LOOPS=1` ⇒ `RealCitySimClock` (`new Date()`);
// absent ⇒ `PinnedCitySimClock` (frozen unless a test explicitly advances it). The SAME env var ALSO gates
// `CitySimSchedulerService.startContinuousLoops()` (`city_sim_scheduler.service.ts` — was `:956`) — ONE
// positive flag commands BOTH the pilot and the clock (design §4.3: this is what makes the fail-
// deterministic polarity STRUCTURAL rather than a convention two separate defaults could drift apart on;
// "pilote ON / horloge épinglée" and "pilote OFF / horloge réelle" are both unreachable by omission).

import { Injectable } from '@nestjs/common';

import type { LiveOpsClockPort } from '../../operational/liveops/live-ops-clock.port';

export type { LiveOpsClockPort } from '../../operational/liveops/live-ops-clock.port';

/** DI token for the city-sim real-clock seam (string-token convention, mirrors `LIVE_OPS_CLOCK`). */
export const CITYSIM_CLOCK = 'CITYSIM_CLOCK';

/**
 * The sentinel "never yet ticked" instant — deliberately the SAME value `PinnedCitySimClock` starts frozen
 * at (below). A player row whose `last_real_tick_at IS NULL` (every fresh signup, C1.3 — the schema's own
 * "null avant 1er tick" convention, `db/schema/city_sim_clock.ts:16`) is treated as if their last tick
 * happened at this floor: under a PRISTINE pinned clock (never advanced) this makes their first check
 * compute `elapsed = 0` — immobile, same as every other player, C2's whole point. Once the clock genuinely
 * moves forward (a test's `advanceByMs`, or `RealCitySimClock`'s real wall-clock reading in production —
 * always far past 1970), `elapsed` turns positive and their FIRST tick fires normally instead of never
 * firing at all. The alternative (falling back to the CURRENT `now()` reading instead of a fixed floor)
 * is self-defeating: comparing `now()` against itself always yields `elapsed === 0`, so a never-ticked
 * player would never tick, no matter how far the clock moved — a genuine correctness bug, not a
 * conservative default. Exported so `CitySimSchedulerService#tickIfDue` and `PinnedCitySimClock` share the
 * exact same constant rather than two independently-declared `new Date(0)` literals drifting apart.
 */
export const CITYSIM_CLOCK_EPOCH_FLOOR = new Date(0);

/**
 * `RealCitySimClock` — bound ONLY when `CITYSIM_CONTINUOUS_LOOPS=1` (an explicit, positive deployment
 * gesture — never inferred from `NODE_ENV`, design §5.1/§5.2). Reads the real system clock, exactly like
 * `SystemLiveOpsClock` — a SEPARATE implementation of the SAME interface, never sharing mutable state with
 * live-ops' own clock. No test-mutation surface (mirrors `SystemLiveOpsClock` — the production
 * implementation is never test-mutable); E2E never binds this class (§5.3 — no compose file the E2E runner
 * uses sets the flag), so it stays untouched by the deterministic-harness contract (C7).
 */
@Injectable()
export class RealCitySimClock implements LiveOpsClockPort {
  now(): Date {
    return new Date();
  }
}

/**
 * `PinnedCitySimClock` (W1.1-d C2) — the DEFAULT, fail-deterministic implementation: `now()` returns a
 * FROZEN instant that never moves on its own, regardless of how much real time elapses — the INVERSE
 * polarity of `FakeLiveOpsClock` (design §4.3). Bound whenever `CITYSIM_CONTINUOUS_LOOPS` is NOT `'1'` —
 * dev local, every E2E lane, staging-without-the-flag. A forgotten flag must produce an IMMOBILE world,
 * never one that races the real wall clock under a spec that never asked for it.
 *
 * Mirrors `FakeLiveOpsClock`'s OWN shape (mutable, test-only `advanceByMs`/`reset`, registered under its
 * own class token AND `useExisting` under `CITYSIM_CLOCK` — see `scheduler.module.ts`) — just with the
 * default flipped: `FakeLiveOpsClock` defaults to the real wall clock until pinned; this defaults to
 * `CITYSIM_CLOCK_EPOCH_FLOOR` until a test explicitly calls `advanceByMs`. Never mutated from production
 * code — only from `CitySimTestController`'s gated `_test/citysim/clock/*` routes.
 */
@Injectable()
export class PinnedCitySimClock implements LiveOpsClockPort {
  private frozen: Date = CITYSIM_CLOCK_EPOCH_FLOOR;

  now(): Date {
    return this.frozen;
  }

  /** TEST-ONLY: advance the frozen instant by `ms` milliseconds — deterministic, never reads the real
   *  wall clock. This is the ONLY way `elapsed > 0` becomes observable under the default polarity (a real
   *  wait produces NO movement — that IS the C2 falsifiable, design §C2). */
  advanceByMs(ms: number): void {
    this.frozen = new Date(this.frozen.getTime() + ms);
  }

  /** TEST-ONLY: restore the default frozen floor — test cleanup, never leaks an advanced instant into a
   *  later, unrelated spec sharing the same E2E stack (the `FakeLiveOpsClock.reset()` precedent). */
  reset(): void {
    this.frozen = CITYSIM_CLOCK_EPOCH_FLOOR;
  }
}

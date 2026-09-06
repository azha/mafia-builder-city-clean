// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C5 ("the `structuralCapForPlayer`
//             modulation ... returns 0 during an open T4 observation window, else the P3-A value BYTE-IDENTICAL").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md D7/§8.2 (★H-1
//             RATIFIED Option B) + D9 ("the getter reads the stamp atomically" — the Concurrence proof).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §7/R5 (DEFINITIVE — the
//             modulation needs ZERO DI wiring and ZERO changes to the 3 call sites; ALL THREE are plain,
//             unawaited, SYNCHRONOUS calls — `structural-decision-governor.service.ts:97`, `session-open-
//             sequence.service.ts:217`, `core-loops-test.controller.ts:322` — so the getter body cannot
//             become `async` without breaking every one of them).
//             Pattern (a process-wide, in-memory, write-through snapshot feeding a SYNCHRONOUS reader,
//             kept fresh by an ASYNC writer — the exact shape this seam needs): `config/tunables-store.ts`
//             (`TunablesStoreImpl.snapshot`, a `Map`, `resolveInt`/etc. read it synchronously; `reload()`
//             — an async DB read — keeps it current). THIS file is the SAME idiom, scoped per-player
//             instead of per-tunable-key, with no LISTEN/NOTIFY (see the file-header note below for why
//             none is needed here).
//             — P3-H C5 — 2026-07-24
//
// `pressureCapCache` — the synchronous in-memory bridge `structuralCapForPlayer` (`core-loops-tunables.ts`)
// reads to answer "is this player inside an OPEN T4 pressure-observation window RIGHT NOW", without any DB
// I/O on the hot governor/session-open path (C0-reanchor R5 DEFINITIVE — those 3 call sites stay plain sync
// calls, unchanged). Written-through by `PressureTierService` (`meta_progression/pressure-tier.service.ts`
// — the ONLY writer: `onGraduation` stamps the window opening at T4; `onSessionStart` clears it lazily on
// expiry, D8/D9) immediately AFTER each DB write actually lands — never speculatively, never before the
// write commits (mirrors this lot's own atomic-first discipline, plan §0.4).
//
// ★ DISCLOSED DESIGN CHOICE — process-local, not cross-process, no LISTEN/NOTIFY. This game-back
// deployment is a SINGLE Node process (every E2E/dev compose topology this program has ever built runs
// exactly one `game-back` container) — the cache is therefore ALWAYS written by the SAME process that
// reads it; there is no cross-process staleness window `TunablesStore`'s own LISTEN/NOTIFY exists to close.
// A cold process boot reads an EMPTY cache for EVERY player until that player's NEXT `onGraduation`/
// `onSessionStart` fires — i.e. it FAILS OPEN (the cap reverts to the P3-A value, never a false-0), the
// safe direction for a zero-regression invariant (design §16 contract). `PressureTierService.onSessionStart`
// is the natural per-session resync point (D9 — "the FIRST governor/session-open read after expiry... or
// the next `SessionOpenedEvent`") — every session-open call refreshes the acting player's cache entry from
// the DB (see that service's own header), closing the cold-start gap within one session-open.
//
// Correctness under a race (the C5 Concurrence proof — "a structural commit racing observation-expiry ->
// deterministic"): the cache stores the RAW `tier4_observation_until_tick` stamp (a `Date`, never a
// pre-computed boolean); `hasOpenObservationWindow` compares it against `Date.now()` AT READ TIME. This
// makes the getter correct purely from elapsed wall-clock time, independent of whether the DB-clearing
// write (`clearExpiredObservationWindow`) has landed yet — the SAME "remaining derives at read" discipline
// D9 itself specifies for the column.

class PressureCapCacheImpl {
  private readonly observationUntilByPlayer = new Map<string, Date | null>();

  /**
   * Write-through — called ONLY by `PressureTierService`, immediately after the corresponding DB write
   * (`recordGraduationAndMaybeAdvancePressureTier` / `clearExpiredObservationWindow` / the defensive
   * `getPressureState` resync) has actually landed. `null` clears the window (no open observation, or
   * never opened); a `Date` stamps an open window's expiry.
   */
  setObservationUntil(playerId: string, until: Date | null): void {
    this.observationUntilByPlayer.set(playerId, until);
  }

  /**
   * `structuralCapForPlayer`'s ONLY read (`core-loops-tunables.ts`). A player this process has never seen
   * a pressure write for (cache miss — `undefined`) reads as "no open window" — fails OPEN, never a
   * false-0 (see file header). Stamp comparison is wall-clock-at-read (D9), never a pre-computed flag.
   */
  hasOpenObservationWindow(playerId: string): boolean {
    const until = this.observationUntilByPlayer.get(playerId);
    return until !== undefined && until !== null && until.getTime() > Date.now();
  }

  /** Test-only reset (mirrors every OTHER in-process test-probe `clear*` this lot's services expose) —
   *  never called from a production path. */
  clearAll(): void {
    this.observationUntilByPlayer.clear();
  }
}

/** The process-wide singleton — plain module-level, NOT Nest-injectable (mirrors `TunablesStore`'s own
 *  convention, `config/tunables-store.ts:124` — "the *-tunables modules are not Nest-injectable"). */
export const pressureCapCache = new PressureCapCacheImpl();

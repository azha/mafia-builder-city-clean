// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-15-seeded-rng-design.md (the seeded, replay-safe PRNG foundation)
//             -- session:2026-06-09 (Phase-15 — gameplay randomness foundation, A of A→B) --
//
// `seeded-rng.ts` — the project's ONE source of gameplay randomness. The codebase is deterministic by hard discipline
// (the DSL executor + the CitySim scheduler forbid `Math.random`/`Date.now` because they would break resume/replay and
// make the E2E gate non-deterministic). To add chance-based gameplay (Phase-16 raid-response + every future chance
// mechanic) WITHOUT breaking that, randomness must be SEEDED: a pure function of an explicit seed the caller derives from
// reproducible game state (e.g. `${playerId}:${gameMinute}:${exceptionId}:${tag}`). It looks random to the player but is
// byte-reproducible to the engine — same seed → same sequence — so replay-safety, determinism, and testability all hold.
//
// PURE: no DB / I/O / `Date` / `Math.random` / module-global state. A plain function module (not an `@Injectable`) —
// consumers import `makeRng` directly. This is the canonical seam every chance mechanic reuses; the *probabilities* that
// feed `chance(p)` are the consumers' tunables (R2.3), NOT defined here (this is mechanism, not balance).

/**
 * cyrb53 (bryc) — a fast, well-distributed string hash producing a 53-bit number. Deterministic: the same string always
 * hashes to the same value. We use its low 32 bits as the mulberry32 seed state, so an arbitrary game-state-derived seed
 * STRING maps to a reproducible PRNG stream.
 *
 * EXPORTED (04e-B C2, additive visibility widening — function body untouched): `cohort-targeting.service.ts`'s
 * `cohortKeyFor` reuses this SAME hash directly (design §3.4 — "a deterministic hash (cyrb53 via
 * common/seeded-rng.ts) of the canonical serialization of the resolved predicate") rather than re-implementing string
 * hashing elsewhere. `makeRng` below is unaffected.
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * mulberry32 (bryc) — the canonical tiny 32-bit PRNG. Returns a closure over the 32-bit `state`; each call mutates the
 * captured state and returns a float in `[0, 1)`. Well-distributed for gameplay-scale draws. PURE (the only state is the
 * captured `state`, fully determined by the seed).
 */
function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded pseudo-random generator. STATEFUL per `makeRng` call (sequential draws advance the stream); two
 *  `makeRng(sameSeed)` instances produce identical sequences (the replay-safety guarantee). */
export interface Rng {
  /** The next float in `[0, 1)`. */
  next(): number;
  /** A uniform integer in `[minInclusive, maxInclusive]` (both ends inclusive). Bounds are swapped if reversed. */
  int(minInclusive: number, maxInclusive: number): number;
  /** True with probability `p` (clamped to `[0, 1]`): `chance(0)` is always false, `chance(1)` always true. Always
   *  consumes exactly one draw, so the stream advances uniformly regardless of `p`. */
  chance(p: number): boolean;
}

/**
 * Build a seeded, replay-safe PRNG from a seed STRING. The seed is hashed (cyrb53) to a 32-bit mulberry32 state, so the
 * entire output stream is a pure function of `seed`. The caller MUST derive `seed` from reproducible game state (never
 * wall-clock / ambient state) so a replay re-derives the identical seed → the identical rolls.
 */
export function makeRng(seed: string): Rng {
  const gen = mulberry32(cyrb53(seed) >>> 0);
  return {
    next: () => gen(),
    int: (minInclusive: number, maxInclusive: number): number => {
      const lo = Math.min(minInclusive, maxInclusive);
      const hi = Math.max(minInclusive, maxInclusive);
      return lo + Math.floor(gen() * (hi - lo + 1));
    },
    chance: (p: number): boolean => gen() < Math.max(0, Math.min(1, p)),
  };
}

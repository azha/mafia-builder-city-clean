// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2 (MarketRngService :218)
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 1 (C1)
//             — D1b C1 — 2026-06-16
//
// `MarketRngService` — deterministic day/tick-seeded pseudo-RNG for the market layer.
//
// C4 DETERMINISM (canon market_mechanics.md:218): "same observable input → identical draw".
// Observer noise for Composition Telegraph (2.2) is computed ONCE PER DAY from the day seed
// (market_mechanics.md:95 — NO per-frame RNG). All market RNG routes through this service so
// C4 compliance is centrally enforceable.
//
// Implementation: uses Node.js crypto (createHash SHA-256) to derive a deterministic float ∈ [0,1)
// from (dayId, regionId) or (tick, districtId, substanceKey). SHA-256 is seeded by the observable
// input, is platform-independent, and produces a stable float across rebuilds. This is NOT a
// cryptographically-secure stream — it is a DETERMINISTIC reproducibility guarantee (C4).
//
// API:
//   seedFromDay(dayId, regionId)     → draws ONE float per (day, region) — the Composition Telegraph
//                                      observer-noise draw (market_mechanics.md:95, C3 use-site).
//   seedFromTick(tick, districtId)   → draws ONE float per (tick, district) — reserved for lane/clearing
//                                      scatter RNG (market_mechanics.md:65-66, C2 use-site).
//   seedFromDayN(dayId, regionId, n) → draws N floats per (day, region) — for bulk inference sampling.
//
// C4 invariant: no non-deterministic RNG in this file (all draws are SHA-256 seeded).

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class MarketRngService {
  /**
   * Derive a deterministic float ∈ [0, 1) from (dayId, regionId).
   *
   * Used by Composition Telegraph (2.2) for the daily observer-noise draw ε~N(0,η²):
   * `ε = η · normalFromUniform(seedFromDay(dayId, regionId))` (Box-Muller or ratio method at call-site).
   * The canonical seeding in market_mechanics.md:95 — "NO per-frame RNG (C4)".
   *
   * C4: same (dayId, regionId) → identical result across calls, restarts, and containers.
   */
  seedFromDay(dayId: number, regionId: number): number {
    return this.deterministicFloat(`day:${dayId}:region:${regionId}`);
  }

  /**
   * Derive a deterministic float ∈ [0, 1) from (tick, districtId).
   *
   * Reserved for clearing-tick scatter RNG in Lane Collapse Pricing (2.1):
   * "realised price scatter ∝ (1−c)" (market_mechanics.md:65). A tick-level seed means scatter is
   * reproducible given the same tick + district state — still C4 (same observable input → same draw).
   *
   * C4: same (tick, districtId) → identical result.
   */
  seedFromTick(tick: number, districtId: number): number {
    return this.deterministicFloat(`tick:${tick}:district:${districtId}`);
  }

  /**
   * Derive N deterministic floats ∈ [0, 1) from (dayId, regionId).
   *
   * Used when the inference algorithm needs multiple draws per day/region (e.g. per slot
   * recency weighting). Each slot i uses a distinct sub-key so draws are independent.
   *
   * C4: same (dayId, regionId, n) → identical array.
   */
  seedFromDayN(dayId: number, regionId: number, n: number): number[] {
    return Array.from({ length: n }, (_, i) =>
      this.deterministicFloat(`day:${dayId}:region:${regionId}:slot:${i}`),
    );
  }

  /**
   * Core deterministic float derivation via SHA-256.
   *
   * Takes the first 4 bytes of the SHA-256 digest of the UTF-8-encoded `seed` string, interprets
   * them as a big-endian uint32, and divides by 2^32 to obtain a float ∈ [0, 1).
   *
   * This is stable across Node.js versions (SHA-256 is standardised), platform-independent, and
   * produces a uniform-ish distribution for the range of inputs the market layer uses. It is NOT
   * a full PRNG stream — it is a single-output keyed hash (C4: deterministic, no internal state).
   */
  private deterministicFloat(seed: string): number {
    const digest = createHash('sha256').update(seed, 'utf8').digest();
    // Read 4 bytes as big-endian uint32 (0..2^32-1) and normalise to [0, 1).
    const uint32 = ((digest[0]! << 24) | (digest[1]! << 16) | (digest[2]! << 8) | digest[3]!) >>> 0;
    return uint32 / 0x1_0000_0000; // divide by 2^32
  }
}

// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Crick — cold-chain stimulant
//             (the temperature bands MODERATE >4°C / HOT >15°C + the per-day degradation rates) +
//             docs/tech/02_fictional_world/substance_secondary.md §Vue d'ensemble ("Oui (< 4°C)" — Crick needs cold) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — production
//             (production.crick.degradation_pct_per_day_{moderate,hot} = the canon %/day rates this file grounds +
//             the NEW coldchain.crick.degrade_grams_per_tick_{moderate,hot} M1 per-tick grounding keys, T5) +
//             §Substances (substance.crick.cold_chain_{threshold,critical}_celsius = the server-only °C band
//             boundaries — NEVER exposed, R2.2)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 5) --
//
// Cold-chain tunables — the `coldchain.crick.*` keys THIS slice's OWN logic (the COLD_CHAIN degrade tick) CONSUMES:
// the PER-TICK GRAMS degradation step for a Crick holding/cargo kept too warm. Phase-2b vector #2 = the cold-chain for
// the first SECONDARY substance, Crick. Brindle (coldChain=false) is NEVER subject to this — it has no cold-chain key.
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — production` (cited per key). They are
// surfaced as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the
// registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). ZERO inline literals
// in the service — the service reads ONLY these resolved values.
//
// ── THE DEGRADATION GROUNDING (the per-tick volume step — production_secondaries.md §Crick "degradation %/game-day").
//    gdd/14 carries the canon degradation as a RATE PER GAME-DAY (production.crick.degradation_pct_per_day_moderate =
//    10 %/day in the MODERATE regime >4°C; production.crick.degradation_pct_per_day_hot = 50 %/day in the HOT/critical
//    regime >15°C). But `quantity_grams` / `cargo_grams` are INTEGERS: a per-MINUTE-tick percentage of a %/game-day
//    rate (e.g. 10 %/day ÷ 1440 ticks/day × 200 g ≈ 0.014 g/tick) FLOORS TO ZERO every tick → it would NEVER degrade
//    (silently wrong). So M1 GROUNDS the qualitative %/game-day canon into a single small-integer PER-TICK GRAMS
//    decrement, EXACTLY the convention `selling.deal_grams_per_tick` uses to ground the qualitative deals/hour ×
//    grams/deal composites into one observable per-tick integer. Two keys (one per warm regime):
//      coldchain.crick.degrade_grams_per_tick_moderate (default 2 g/tick — the MODERATE regime, a non-cold indoor
//        building / above the 4°C threshold), and
//      coldchain.crick.degrade_grams_per_tick_hot (default 10 g/tick — the HOT regime, a non-refrigerated courier in
//        transit / above the 15°C critical threshold). HOT (10) > MODERATE (2) by the SAME 5× ratio the canon carries
//        (50 %/day : 10 %/day = 5:1), so the qualitative ordering "warmer degrades faster" is preserved.
//    The decrement is deterministic (NO RNG — a fixed grams/tick), monotonic toward 0, and GUARDED ≥ 0 in the SQL
//    (greatest(quantity - rate, 0)). The two genuinely-NEW M1 keys of T5 (R2.3). `[PROV-Y26Q2]`.
//
//    HONEST M1 APPROXIMATION (DEFERRED): the flat per-tick-grams decrement is an M1 APPROXIMATION of the PROPORTIONAL
//    %/game-day canon — a 200 g and a 20 g holding both lose the SAME flat grams/tick (the proportional model would
//    have the 200 g holding lose 10×). Precise proportional fractional-accumulation (decay ∝ current mass, with a
//    fractional remainder carried tick-to-tick) needs a per-row accumulator anchor on product_storage/courier_shift,
//    which is a SCHEMA change — DEFERRED this slice (R9.3 — no schema column). The flat model satisfies the M1 goal
//    (observable, deterministic, monotonic, HOT>MODERATE, no-leak): a warm Crick holding visibly bleeds grams while a
//    cold one is preserved; the precise proportional curve lands when the per-row anchor does (vector #3+).
//
// ── THE °C BAND BOUNDARIES (server-only — substance.crick.cold_chain_{threshold,critical}_celsius). These define the
//    3 status bands (OPTIMAL_COLD / MODERATE / HOT) the cold-chain service DERIVES at read-time. They are mirrored
//    here ONLY for completeness + the band-meaning documentation; the M1 status derivation is CATEGORICAL (cold
//    building → OPTIMAL_COLD; non-cold building → MODERATE; refrigerated van → OPTIMAL_COLD; other vehicle → HOT) — it
//    does NOT compute a raw °C, so these thresholds are NOT read by the M1 logic (a continuous-temperature model is
//    DEFERRED). They are SERVER-ONLY values — NEVER exposed to the client (R2.2). Kept as resolved values so a future
//    continuous model reads them from here.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved cold-chain tunables. The two genuinely-NEW M1 keys (R2.3, both `[PROV-Y26Q2]`) are the per-tick GRAMS
 * degradation rates (MODERATE + HOT). The °C boundaries are mirrored server-only (NOT read by the M1 categorical
 * derivation; a continuous-temperature model is DEFERRED). The flat per-tick-grams model is an HONEST M1 approximation
 * of the proportional %/game-day canon (precise proportional fractional-accumulation is DEFERRED — no per-row anchor).
 * DB-override > env > default (Phase-23).
 */
export const coldChainTunables = {
  /**
   * coldchain.crick.degrade_grams_per_tick_moderate — the GRAMS a too-warm-but-not-critical Crick holding loses per
   * in-game MINUTE tick (the MODERATE regime: a non-cold indoor building, above the 4°C threshold). The M1 grounding
   * of the qualitative production.crick.degradation_pct_per_day_moderate (10 %/day); the ONLY genuinely-NEW MODERATE
   * volume tunable of T5; `[PROV-Y26Q2]`. The decrement is GUARDED ≥ 0 (greatest(qty - rate, 0)).
   * (DB-override > env > default — Phase-23).
   */
  get degradeGramsPerTickModerate(): number {
    return TunablesStore.resolveInt(
      'coldchain.crick.degrade_grams_per_tick_moderate',
      'COLDCHAIN_CRICK_DEGRADE_GRAMS_PER_TICK_MODERATE',
      2,
    );
  },
  /**
   * coldchain.crick.degrade_grams_per_tick_hot — the GRAMS a CRITICALLY-warm Crick cargo/holding loses per in-game
   * MINUTE tick (the HOT regime: a non-refrigerated courier in transit, above the 15°C critical threshold). The M1
   * grounding of production.crick.degradation_pct_per_day_hot (50 %/day); HOT > MODERATE by the canon 5× ratio; the
   * ONLY genuinely-NEW HOT volume tunable of T5; `[PROV-Y26Q2]`. The decrement is GUARDED ≥ 0.
   * (DB-override > env > default — Phase-23).
   */
  get degradeGramsPerTickHot(): number {
    return TunablesStore.resolveInt(
      'coldchain.crick.degrade_grams_per_tick_hot',
      'COLDCHAIN_CRICK_DEGRADE_GRAMS_PER_TICK_HOT',
      10,
    );
  },
  /** substance.crick.cold_chain_threshold_celsius — server-only band boundary (mirrored; NOT read by the M1 logic).
   *  (DB-override > env > default — Phase-23). */
  get coldChainThresholdCelsius(): number {
    return TunablesStore.resolveInt(
      'substance.crick.cold_chain_threshold_celsius',
      'SUBSTANCE_CRICK_COLD_CHAIN_THRESHOLD_CELSIUS',
      4,
    );
  },
  /** substance.crick.cold_chain_critical_celsius — server-only band boundary (mirrored; NOT read by the M1 logic).
   *  (DB-override > env > default — Phase-23). */
  get coldChainCriticalCelsius(): number {
    return TunablesStore.resolveInt(
      'substance.crick.cold_chain_critical_celsius',
      'SUBSTANCE_CRICK_COLD_CHAIN_CRITICAL_CELSIUS',
      15,
    );
  },
};

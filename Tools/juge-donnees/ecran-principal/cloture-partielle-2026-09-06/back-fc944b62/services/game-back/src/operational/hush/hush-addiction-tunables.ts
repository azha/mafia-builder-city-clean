// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Hush — addiction-loyalty (the sticky NPC
//             demand that ramps a per-spot loyalty bucket, boosts the selling rate when DEPENDENT, decays the
//             un-served spots, and collapses a starved DEPENDENT spot after the withdrawal window) +
//             docs/superpowers/specs/2026-06-05-phase-02b-hush-addiction-design.md §3/§7 (the addiction mechanic) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — production
//             (production.hush.addiction_loyalty_{established,dependent}_score / _increment_per_deal / _decay_per_tick
//             + production.hush.loyalty_boost_multiplier — the six addiction tunables landed at T0) +
//             §Substances (substance.hush.withdrawal_period_ticks — the pre-existing dry-window key, REUSE)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 5) --
//
// Hush addiction tunables — the `production.hush.addiction_*` / `production.hush.loyalty_boost_multiplier` /
// `substance.hush.withdrawal_period_ticks` keys the Hush addiction-loyalty slice CONSUMES: the cut-points of the
// per-spot loyalty bucket (NEW < established < dependent), the per-deal accumulation step, the per-tick decay of an
// un-served sub-DEPENDENT spot, the DEPENDENT selling-rate boost, and the dry-window after which a starved DEPENDENT
// spot collapses (withdrawal). Phase-2b vector #2b = the addiction-loyalty trait of the first such substance, Hush.
// Brindle/Crick (addiction=false) are NEVER subject to this — they have no addiction row, no boost, no decay tick.
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md` (cited per key). They are surfaced as env-overridable
// fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry values change, update
// this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). ZERO inline literals in the services — the
// service/repo/tick read ONLY these resolved values. The six `production.hush.*` keys landed in gdd/14 at T0 (FLAGGED
// `[PROV-Y26Q2]`); `substance.hush.withdrawal_period_ticks` is a PRE-EXISTING legacy key (REUSE, not authored here).
//
// ── THE LOYALTY ACCUMULATOR (an INTEGER deal-count bucket — production_secondaries.md §Hush). The `hush_addiction.
//    loyalty_score` is an integer that climbs by `addiction_loyalty_increment_per_deal` (default 1 = one deal = one
//    cran) every tick a Hush dealer-spot actually sells. Two integer cut-points band it (R2.2 — never the raw score):
//      addiction_loyalty_established_score (default 5)  → NEW (< 5) | ESTABLISHED (5 ≤ score < 10)
//      addiction_loyalty_dependent_score   (default 10) → DEPENDENT (score ≥ 10) — sticky demand + selling boost.
//    These M1 INTEGER cut-points GROUND the qualitative composite `production.hush.addiction_dependent_window_days`
//    (the canon "days of repeat purchase to become dependent" modelled as a deal-count accumulator) — EXACTLY the
//    convention `selling.deal_grams_per_tick` uses to ground a qualitative deals/hour composite into one observable
//    per-tick integer.
//
// ── THE DECAY (the per-tick drift of an un-served SUB-DEPENDENT spot — production_secondaries.md §Hush
//    "addiction-loyalty bucket décroît"). gdd/14 carries the canon decay as a RATE PER GAME-DAY
//    (production.hush.addiction_loyalty_decay_per_day = 0.005/day). But `loyalty_score` is an INTEGER deal-count: a
//    per-minute-tick fraction of a 0.005/day rate FLOORS TO ZERO every tick → it would NEVER decay (silently wrong).
//    So M1 GROUNDS that qualitative %/game-day canon into a single small-integer PER-TICK decrement
//    (addiction_loyalty_decay_per_tick, default 1 — the SAME grounding convention as coldchain.crick.degrade_grams_per_
//    tick_moderate). The decrement is deterministic (NO RNG), monotonic toward 0, and GUARDED ≥ 0 in the SQL
//    (greatest(score - rate, 0)). HONEST M1 APPROXIMATION (DEFERRED): the flat per-tick decrement is an M1
//    approximation of the proportional %/game-day canon; precise proportional fractional-accumulation needs a per-row
//    fractional accumulator (a SCHEMA change) — DEFERRED (R9.3 — no schema column). `[PROV-Y26Q2]`.
//
// ── THE BOOST (the DEPENDENT selling-rate multiplier — production_secondaries.md §Hush "sticky demand"). A DEPENDENT
//    spot (score ≥ dependent) sells `grams_sold = min(rate × loyalty_boost_multiplier, available)` (default 2× —
//    double the base deals/tick), the M1 grounding of the canon "sticky demand". Below DEPENDENT the base rate. Cash
//    conservation: the dealer float credits grams_sold × the Hush deal value (1.5× Brindle/gram, T4). `[PROV-Y26Q2]`.
//
// ── THE WITHDRAWAL WINDOW (the dry-window after which a starved DEPENDENT spot COLLAPSES — substance_secondary.md
//    "WITHDRAWAL_EVENT après withdrawal_period_ticks sans deal"). substance.hush.withdrawal_period_ticks (default 120 =
//    2h in-game) is the number of MINUTE ticks a DEPENDENT spot may go without a Hush deal before the HUSH_ADDICTION
//    tick withdraws it (collapses loyalty_score to established−1 + sets withdrawn=true, dropping the boost). A
//    PRE-EXISTING legacy gdd/14 key (REUSE — not authored at T0). The withdrawal is sharp (not gradual): a DEPENDENT
//    spot HOLDS its score (sticky) until starved past this window, then COLLAPSES one full band below ESTABLISHED. See
//    `hush-addiction.repository.ts` / `hush-addiction-advance.service.ts` for the disjoint decay-vs-withdrawal SQL.

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved Hush addiction tunables — the cut-points / increment / decay / boost / withdrawal-window the
 * HushAddictionService + HushAddictionRepository + the HUSH_ADDICTION tick + the substance-aware selling integration
 * read. The five `production.hush.*` keys are genuinely-NEW T0 keys (R2.3, all `[PROV-Y26Q2]`); withdrawalPeriodTicks
 * REUSES the pre-existing `substance.hush.withdrawal_period_ticks`. The flat per-tick decay + the sharp withdrawal
 * collapse are HONEST M1 approximations of the proportional %/game-day canon (precise proportional fractional-
 * accumulation is DEFERRED — no per-row anchor; R9.3 — no schema change).
 * DB-override > env > default (Phase-23).
 */
export const hushAddictionTunables = {
  /**
   * production.hush.addiction_loyalty_established_score — the integer deal-count cut-point a Hush dealer-spot's
   * loyalty_score crosses to become ESTABLISHED (the STABLE projected band). gdd/14:3056. `[PROV-Y26Q2]`.
   * Range 2..20. (DB-override > env > default — Phase-23).
   */
  get establishedScore(): number {
    return TunablesStore.resolveInt('production.hush.addiction_loyalty_established_score', 'PRODUCTION_HUSH_ADDICTION_LOYALTY_ESTABLISHED_SCORE', 5);
  },
  /**
   * production.hush.addiction_loyalty_dependent_score — the integer deal-count cut-point a Hush dealer-spot's
   * loyalty_score crosses to become DEPENDENT (the HIGH projected band — sticky demand + selling boost +
   * withdrawal-eligible). > establishedScore. gdd/14:3057. `[PROV-Y26Q2]`. Range 5..40.
   * (DB-override > env > default — Phase-23).
   */
  get dependentScore(): number {
    return TunablesStore.resolveInt('production.hush.addiction_loyalty_dependent_score', 'PRODUCTION_HUSH_ADDICTION_LOYALTY_DEPENDENT_SCORE', 10);
  },
  /**
   * production.hush.addiction_loyalty_increment_per_deal — the integer added to loyalty_score on each Hush deal (one
   * deal event = one cran). gdd/14:3058. `[PROV-Y26Q2]`. Range 1..5.
   * (DB-override > env > default — Phase-23).
   */
  get incrementPerDeal(): number {
    return TunablesStore.resolveInt('production.hush.addiction_loyalty_increment_per_deal', 'PRODUCTION_HUSH_ADDICTION_LOYALTY_INCREMENT_PER_DEAL', 1);
  },
  /**
   * production.hush.addiction_loyalty_decay_per_tick — the M1 per-tick integer decrement an un-served SUB-DEPENDENT
   * spot loses each HUSH_ADDICTION tick (the loyalty drifts back toward NEW). GUARDED ≥ 0. gdd/14:3059.
   * `[PROV-Y26Q2]`. Range 0..10. (DB-override > env > default — Phase-23).
   */
  get decayPerTick(): number {
    return TunablesStore.resolveInt('production.hush.addiction_loyalty_decay_per_tick', 'PRODUCTION_HUSH_ADDICTION_LOYALTY_DECAY_PER_TICK', 1);
  },
  /**
   * production.hush.loyalty_boost_multiplier — the selling-rate multiplier a DEPENDENT Hush dealer-spot gets
   * (grams_sold = min(rate × this, available)); below DEPENDENT the base rate (1×). gdd/14:3060. `[PROV-Y26Q2]`.
   * Range 1..4. (DB-override > env > default — Phase-23).
   */
  get loyaltyBoostMultiplier(): number {
    return TunablesStore.resolveInt('production.hush.loyalty_boost_multiplier', 'PRODUCTION_HUSH_LOYALTY_BOOST_MULTIPLIER', 2);
  },
  /**
   * substance.hush.withdrawal_period_ticks — the dry-window (MINUTE ticks since the last Hush deal) after which a
   * DEPENDENT spot WITHDRAWS (collapses loyalty_score to establishedScore−1 + sets withdrawn=true). REUSE — the
   * pre-existing legacy gdd/14 key (NOT authored here). gdd/14:1197. Range 30..720.
   * The HUSH_ADDICTION tick reads it; the E2E shrinks it test-only. (DB-override > env > default — Phase-23).
   */
  get withdrawalPeriodTicks(): number {
    return TunablesStore.resolveInt('substance.hush.withdrawal_period_ticks', 'SUBSTANCE_HUSH_WITHDRAWAL_PERIOD_TICKS', 120);
  },
};

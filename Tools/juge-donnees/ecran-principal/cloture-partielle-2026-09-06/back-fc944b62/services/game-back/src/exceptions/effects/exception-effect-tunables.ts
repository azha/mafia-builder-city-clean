// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T3 / §6 (the bribe/lay-low balance —
//             R2.3: centralized, never inline; PROVISIONAL [PROV-Y26Q2], calibrate downstream — the projection-cut-points
//             precedent). These are BO-only inputs to the seeded handlers; NEVER surfaced raw to the client (R2.2).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).
//
// ADAPTATION (P23-T7): the original file had no env helpers; env vars are introduced following the
// RAID_EXCEPTION_<NAME> namespace convention. Keys are PROVISIONAL [PROV-Y26Q2] — not yet consolidated in gdd/14.
// Canonical key pattern: raid_exception.<name>.

import { TunablesStore } from '../../config/tunables-store';

/** The raid-response risky-effect balance. DB-override > env > default (Phase-23). */
export const raidExceptionTunables = {
  /**
   * raid_exception.bribe_cost_cents — the flat bribe price in cents (a corrupt-official payoff — debited up-front,
   * win or lose). Default 50_000. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_BRIBE_COST_CENTS (test-only).
   * (DB-override > env > default — Phase-23).
   */
  get bribeCostCents(): number {
    return TunablesStore.resolveInt('raid_exception.bribe_cost_cents', 'RAID_EXCEPTION_BRIBE_COST_CENTS', 50_000);
  },
  /**
   * raid_exception.bribe_success_probability — the seeded success probability ∈ [0,1] (feeds rng.chance).
   * Default 0.6. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_BRIBE_SUCCESS_PROBABILITY (test-only).
   * (DB-override > env > default — Phase-23).
   */
  get bribeSuccessProbability(): number {
    return TunablesStore.resolveFloat('raid_exception.bribe_success_probability', 'RAID_EXCEPTION_BRIBE_SUCCESS_PROBABILITY', 0.6);
  },
  /**
   * raid_exception.bribe_success_heat_drop — heat shed on a SUCCESSFUL bribe (absolute heat units, the [0,1] scale).
   * Default 0.3. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_BRIBE_SUCCESS_HEAT_DROP (test-only).
   * (DB-override > env > default — Phase-23).
   */
  get bribeSuccessHeatDrop(): number {
    return TunablesStore.resolveFloat('raid_exception.bribe_success_heat_drop', 'RAID_EXCEPTION_BRIBE_SUCCESS_HEAT_DROP', 0.3);
  },
  /**
   * raid_exception.bribe_failure_heat_rise — heat ADDED on a FAILED bribe (the backfire — more police attention).
   * Default 0.2. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_BRIBE_FAILURE_HEAT_RISE (test-only).
   * (DB-override > env > default — Phase-23).
   */
  get bribeFailureHeatRise(): number {
    return TunablesStore.resolveFloat('raid_exception.bribe_failure_heat_rise', 'RAID_EXCEPTION_BRIBE_FAILURE_HEAT_RISE', 0.2);
  },
  /**
   * raid_exception.lay_low_heat_reduction_milli_min — the seeded lay-low heat-reduction MINIMUM in MILLI-heat ints
   * (200 = 0.2 heat). The handler divides by 1000 before applying (rng.int is integer-only; this keeps the seeded
   * draw an int). Default 150. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_LAY_LOW_HEAT_REDUCTION_MILLI_MIN.
   * (DB-override > env > default — Phase-23).
   */
  get layLowHeatReductionMilliMin(): number {
    return TunablesStore.resolveInt('raid_exception.lay_low_heat_reduction_milli_min', 'RAID_EXCEPTION_LAY_LOW_HEAT_REDUCTION_MILLI_MIN', 150);
  },
  /**
   * raid_exception.lay_low_heat_reduction_milli_max — the seeded lay-low heat-reduction MAXIMUM in MILLI-heat ints
   * (400 = 0.4 heat). Default 400. `[PROV-Y26Q2]`. Env override: RAID_EXCEPTION_LAY_LOW_HEAT_REDUCTION_MILLI_MAX.
   * (DB-override > env > default — Phase-23).
   */
  get layLowHeatReductionMilliMax(): number {
    return TunablesStore.resolveInt('raid_exception.lay_low_heat_reduction_milli_max', 'RAID_EXCEPTION_LAY_LOW_HEAT_REDUCTION_MILLI_MAX', 400);
  },
};

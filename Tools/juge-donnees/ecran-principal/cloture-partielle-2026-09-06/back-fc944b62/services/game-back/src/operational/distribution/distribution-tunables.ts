// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §Modes de transport — FOOT
//             (§9 Detection depth — System 9 9a C2 — 2026-06-21)
//             ("Speed : slow" — the qualitative foot speed M1 grounds to a concrete blocks-per-tick) +
//             §`Courier` entity / §`Route` entity (path_blocks BlockId[], river_crossings) + §Tableau modes de
//             transport ("FOOT | courier_foot_cargo_g 200g default | slow") +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — distribution (the registry)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 5: vehicle speeds) --
//
// Distribution (foot courier — M1) tunables — the `distribution.*` keys THIS slice's OWN logic CONSUMES: the
// per-vehicle transit SPEED (the per-tick block advance the COURIER_TRANSIT tick uses to time arrival). Phase-2 M1
// shipped FOOT couriers only; Phase-4 vector #4 T5 adds the PER-VEHICLE speed map (foot/bike/car) the distribution_hub
// unlocks — the bike/car speeds + the dispatch vehicle param land in T5 (the runner cash-carry, the A*
// RouteFinderService / sinuosity / inspection_checkpoints / detection-roll / Ephemeral Architecture / dispatch
// coordinator behavior script are STILL DEFERRED — YAGNI).
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported / authored registry value from
// gdd/14 §Operational chain — distribution (cited per key, with the upstream distribution_couriers_runners.md source
// line). They are surfaced as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of
// truth. If the registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE FOOT-COURIER SPEED GROUNDING (the transit-timing step — distribution_couriers_runners.md §Modes de
//    transport / FOOT: "Speed : slow"). The doc qualifies foot speed only as the QUALITATIVE bucket "slow" (no
//    scalar; the per-segment traversal timing is a P5 surface by design — §Tick-scheduler "processSegmentTraversal()
//    hot-tick"). To TIME a concrete transit (the number of MINUTE ticks a foot courier takes to walk a route), M1
//    grounds the qualitative "slow" as a small integer SPEED `distribution.foot_courier_blocks_per_tick` (BlockIds
//    walked per in-game minute tick). The genuinely-NEW tunable of T4 (R2.3). `[PROV-Y26Q2]`. Default 1 block/tick
//    (a deliberately slow on-foot pace — one city block per in-game minute; the fuller per-segment detection-roll +
//    sinuosity-debt + vehicle-speed differentiation are DEFERRED). The bike/car/van speeds, runner cash speeds, and
//    the detection model are DEFERRED.
//
// ── THE M1 ROUTE / TRANSIT MODEL (distribution_couriers_runners.md §`Route` entity — "path entre 2 buildings,
//    calculé avec path_blocks, straight_line_distance, …"). The A* RouteFinderService (graph search with
//    river-crossing constraints per vehicle_type) is DEFERRED (a TBD checklist item §NestJS — RouteFinderService).
//    For M1 the path is the DETERMINISTIC straight block sequence [origin_block, dest_block] (a 2-stop path), and the
//    transit DURATION is derived from the Manhattan block distance between the origin and destination block
//    coordinates (blocks.coordinates {x,y}) divided by the foot speed: transit_ticks = max(1, ceil(block_distance /
//    foot_courier_blocks_per_tick)). DETERMINISTIC (the seeded geometry + a fixed speed; no RNG, no detection roll).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/** The Phase-2 M1 cargo substance domain (M1 = the legitimate Brindle product ONLY — a subset of the 4-member enum). */
export type M1CargoSubstanceType = 'brindle';

/**
 * Resolved distribution tunables. T4 grounded `distribution.foot_courier_blocks_per_tick` (the qualitative "slow" foot
 * speed → a concrete per-tick block advance). T5 (Phase-4 vector #4) adds the PER-VEHICLE speed map
 * `distribution.vehicle_speed.{foot,bike,car}` the distribution_hub unlocks. The detection model is DEFERRED.
 * DB-override > env > default (Phase-23).
 */
export const distributionTunables = {
  /**
   * distribution.foot_courier_blocks_per_tick — the FOOT-courier transit speed in BlockIds walked per in-game minute
   * tick (T4; `[PROV-Y26Q2]`). Grounds the qualitative "slow" foot speed. The COURIER_TRANSIT tick uses it to derive a
   * route's transit duration (transit_ticks = max(1, ceil(block_distance / this))). The pre-T5 transit used THIS value
   * for every transit; T5's vehicle_speed.foot equals it by construction (the byte-identical-foot invariant below).
   * (DB-override > env > default — Phase-23).
   */
  get footCourierBlocksPerTick(): number {
    return TunablesStore.resolveInt(
      'distribution.foot_courier_blocks_per_tick',
      'DISTRIBUTION_FOOT_COURIER_BLOCKS_PER_TICK',
      1,
    );
  },

  /**
   * distribution.vehicle_speed.{foot,bike,car} — the PER-VEHICLE transit speed map (T5; gdd/14 §Operational chain —
   * distribution, all `[PROV-Y26Q2]`). BlockIds walked per MINUTE tick; the COURIER_TRANSIT tick derives
   * transit_ticks = max(1, ceil(block_distance / vehicleSpeed)). foot=1 (= foot baseline → byte-identical), bike=2,
   * car=4 (a faster vehicle arrives in strictly fewer ticks). Each env-overridable (mirror footCourierBlocksPerTick).
   * (DB-override > env > default — Phase-23).
   */
  vehicleSpeed: {
    get foot(): number {
      return TunablesStore.resolveInt('distribution.vehicle_speed.foot', 'DISTRIBUTION_VEHICLE_SPEED_FOOT', 1);
    },
    get bike(): number {
      return TunablesStore.resolveInt('distribution.vehicle_speed.bike', 'DISTRIBUTION_VEHICLE_SPEED_BIKE', 2);
    },
    get car(): number {
      return TunablesStore.resolveInt('distribution.vehicle_speed.car', 'DISTRIBUTION_VEHICLE_SPEED_CAR', 4);
    },
  },
};

/**
 * SINGLE-SOURCE-OF-FOOT-SPEED INVARIANT (T5, the RISK task). vehicle_speed.foot MUST equal foot_courier_blocks_per_tick
 * — they are the SAME physical foot pace, sourced from gdd/14's policy row (`distribution.vehicle_speed.foot` =
 * `distribution.foot_courier_blocks_per_tick`). When both default to 1 this holds trivially; pinning it as a run-time
 * assert means an accidental env-divergence (e.g. someone overrides ONLY DISTRIBUTION_VEHICLE_SPEED_FOOT) fails LOUDLY
 * at boot rather than silently drifting the foot transit timing (which the no-regression distribution.spec depends on
 * being byte-identical). This module-load assert runs once at import time.
 *
 * BOOT-FROZEN (P23-T8): the assert reads both getters directly at module load (no captured value); this is the
 * INTENTIONAL integrity-check pattern — a boot-time assert is the correct gate for an invariant that must hold
 * before any request is served. The assert is not a capture — it is a guard. No fix needed.
 */
if (distributionTunables.vehicleSpeed.foot !== distributionTunables.footCourierBlocksPerTick) {
  throw new Error(
    `distribution.vehicle_speed.foot (${distributionTunables.vehicleSpeed.foot}) MUST equal ` +
      `distribution.foot_courier_blocks_per_tick (${distributionTunables.footCourierBlocksPerTick}) — they are the ` +
      `same physical foot pace (gdd/14 §Operational chain — distribution). A divergence would break the ` +
      `byte-identical-foot transit invariant (T5).`,
  );
}

/**
 * Resolve a courier vehicle_type → its transit speed (BlockIds walked per MINUTE tick). The map is:
 *   - foot              → vehicle_speed.foot (= foot_courier_blocks_per_tick → byte-identical with the pre-T5 transit).
 *   - bike              → vehicle_speed.bike (faster — fewer transit ticks; hub-unlocked).
 *   - car               → vehicle_speed.car  (fastest; hub-unlocked).
 *   - refrigerated_van  → vehicle_speed.foot (FOOT speed — the cold-chain van is Crick's temperature lever (§11),
 *                         ORTHOGONAL to transit speed; the pre-T5 transit IGNORED vehicle_type so a refrigerated_van
 *                         already transits at foot speed. Mapping it to foot speed keeps its timing BYTE-IDENTICAL with
 *                         today — the cold_chain_crick spec's arrival math is unchanged. refrigerated_van is NOT a
 *                         dispatchable hub vehicle; this resolver entry only preserves the existing cold-chain transit.)
 *   - unknown           → vehicle_speed.foot (defensive floor — an unexpected vehicle never runs faster than foot).
 * Always ≥ 1 (the TunablesStore defaults are ≥ 1; max(1,…) belt-and-braces so a 0/negative env override never divides by 0).
 */
export function vehicleSpeedFor(vehicleType: string): number {
  const speeds = distributionTunables.vehicleSpeed;
  let speed: number;
  switch (vehicleType) {
    case 'bike':
      speed = speeds.bike;
      break;
    case 'car':
      speed = speeds.car;
      break;
    case 'foot':
    case 'refrigerated_van': // cold-chain van: transit-speed-orthogonal → foot speed (byte-identical with pre-T5).
      speed = speeds.foot;
      break;
    default:
      speed = speeds.foot; // defensive: an unknown vehicle falls back to foot speed.
      break;
  }
  return Math.max(1, speed);
}

/**
 * The DETERMINISTIC transit duration in game-minute ticks for a courier of `vehicleType` walking/riding a route of
 * `blockDistance` BlockIds (the Manhattan distance between the origin and destination block coordinates). transit_ticks
 * = max(1, ceil(block_distance / vehicleSpeedFor(vehicleType))) — at LEAST one tick (a same-block route is refused at
 * dispatch by the origin≠destination guard, so block_distance ≥ 1 in practice; the max(1,…) is defensive). No RNG. For
 * vehicleType='foot' this is IDENTICAL to footTransitTicks(blockDistance) by construction (vehicle_speed.foot =
 * foot_courier_blocks_per_tick), which is why every existing foot transit stays byte-identical (T5 byte-identical-foot).
 */
export function vehicleTransitTicks(vehicleType: string, blockDistance: number): number {
  const speed = vehicleSpeedFor(vehicleType);
  return Math.max(1, Math.ceil(Math.max(0, blockDistance) / speed));
}

/**
 * The DETERMINISTIC transit duration for a FOOT courier (kept for any caller that thinks in foot terms). DELEGATES to
 * vehicleTransitTicks('foot', …) so there is ONE transit formula — the foot RESULT is identical to the pre-T5 value
 * (vehicle_speed.foot = foot_courier_blocks_per_tick, asserted at module load). No RNG.
 */
export function footTransitTicks(blockDistance: number): number {
  return vehicleTransitTicks('foot', blockDistance);
}

// ── System 9 §9 Detection & Consequence — C6 REUSE getters ──────────────────────────────────────
//
// These keys already exist in gdd/14 §Operational chain — distribution and the tech doc
// docs/tech/04a_operational_systems/distribution_couriers_runners.md (lines :261, :263-266).
// They are NOT new PROV-Y26Q2 values — they are CANON values sourced via TunablesStore.
// C6's `computeDetectionProb` sources them via these getters (the anti-fabrication contract:
// no inline scalar; no re-inlining of canon values).
//
// REUSE keys (from distribution_couriers_runners.md §Detection tunables):
//   :261 distribution.cargo_size_high_threshold_pct = 70
//   :263 distribution.time_of_day_lowest_detection_start_hour = 2
//   :264 distribution.time_of_day_lowest_detection_end_hour = 5
//   :265 distribution.time_of_day_highest_detection_start_hour = 12
//   :266 distribution.time_of_day_highest_detection_end_hour = 14

export const distributionTimeOfDayTunables = {
  /**
   * `distribution.cargo_size_high_threshold_pct` — cargo ratio threshold (%) above which cargo
   * is considered HIGH-load for detection. Canon :261. REUSE (not PROV — already in gdd/14).
   * Default 70 (70% of vehicle capacity). `cargo_grams / capacity > threshold/100 → high cargo factor`.
   */
  get cargoSizeHighThresholdPct(): number {
    return TunablesStore.resolveInt(
      'distribution.cargo_size_high_threshold_pct',
      'DISTRIBUTION_CARGO_SIZE_HIGH_THRESHOLD_PCT',
      70,
    );
  },

  /**
   * `distribution.time_of_day_lowest_detection_start_hour` — game-hour at which the low-detection
   * window begins. Canon :263 / distribution_couriers_runners.md :263. Default 2 (02:00).
   */
  get timeOfDayLowestDetectionStartHour(): number {
    return TunablesStore.resolveInt(
      'distribution.time_of_day_lowest_detection_start_hour',
      'DISTRIBUTION_TIME_OF_DAY_LOWEST_DETECTION_START_HOUR',
      2,
    );
  },

  /**
   * `distribution.time_of_day_lowest_detection_end_hour` — game-hour at which the low-detection
   * window ends. Canon :264. Default 5 (05:00).
   */
  get timeOfDayLowestDetectionEndHour(): number {
    return TunablesStore.resolveInt(
      'distribution.time_of_day_lowest_detection_end_hour',
      'DISTRIBUTION_TIME_OF_DAY_LOWEST_DETECTION_END_HOUR',
      5,
    );
  },

  /**
   * `distribution.time_of_day_highest_detection_start_hour` — game-hour at which the high-detection
   * window begins. Canon :265. Default 12 (12:00).
   */
  get timeOfDayHighestDetectionStartHour(): number {
    return TunablesStore.resolveInt(
      'distribution.time_of_day_highest_detection_start_hour',
      'DISTRIBUTION_TIME_OF_DAY_HIGHEST_DETECTION_START_HOUR',
      12,
    );
  },

  /**
   * `distribution.time_of_day_highest_detection_end_hour` — game-hour at which the high-detection
   * window ends. Canon :266. Default 14 (14:00).
   */
  get timeOfDayHighestDetectionEndHour(): number {
    return TunablesStore.resolveInt(
      'distribution.time_of_day_highest_detection_end_hour',
      'DISTRIBUTION_TIME_OF_DAY_HIGHEST_DETECTION_END_HOUR',
      14,
    );
  },
};

/**
 * Per-vehicle cargo capacity in grams. Used by `computeDetectionProb` to derive the cargo
 * ratio `cargo_grams / capacity`. REUSE from gdd/14 §17 (courier_foot_cargo_g / _bike_g / _car_g /
 * _van_g). Defaults: foot=200, bike=500, car=5000, refrigerated_van=8000.
 *
 * NOTE: these are the CANONICAL per-vehicle cargo max values from gdd/14 §17. They are sourced
 * here as a utility map so `computeDetectionProb` does not inline numeric literals.
 */
export function vehicleCargoCapacityGrams(vehicleType: string): number {
  switch (vehicleType) {
    case 'bike':
      return TunablesStore.resolveInt('courier_bike_cargo_g', 'COURIER_BIKE_CARGO_G', 500);
    case 'car':
      return TunablesStore.resolveInt('courier_car_cargo_g', 'COURIER_CAR_CARGO_G', 5000);
    case 'van':
    case 'refrigerated_van':
      return TunablesStore.resolveInt('courier_van_cargo_g', 'COURIER_VAN_CARGO_G', 8000);
    case 'foot':
    default:
      return TunablesStore.resolveInt('courier_foot_cargo_g', 'COURIER_FOOT_CARGO_G', 200);
  }
}

// ── System 9 §9 Detection & Consequence — C2 tunables ───────────────────────────────────────────
//
// ~16 NEW `distribution.*` [PROV-Y26Q2] keys (registry-first — rows land in gdd/14 §Operational
// chain — distribution §9 detection NEW tunables C2 BEFORE this code, per the anti-fabrication
// contract). Each getter SOURCES its key via TunablesStore.resolveFloat/resolveInt — NEVER an
// inline scalar (the R2.3 / anti-fabrication invariant). Values are the frozen OQ-adjudicated
// defaults (design §12bis, 2026-06-21). Calibration TD at C13 closeout.
//
// REUSE (by getter-reference, NOT re-inlined here):
//   - distribution.lawyer_up_cost_bucket            gdd/14:3425  (composite:cost_medium)
//   - distribution.violent_silence_heat_increment   gdd/14:3426  (composite:heat_extreme)
//   - distribution.time_of_day_*_hour               canon :263-266 (sourced via distributionTunables getter per C6)
//   - distribution.cargo_size_high_threshold_pct    canon :261 (sourced via getter per C6)
//   - insurance.courier_intercept_heat_threshold    insurance-tunables.ts:222 (set positive 0.5, OQ-8)
//
// OQ-12: the canon composites `composite:duration_medium_sessions` (:273) and
//        `composite:duration_long_sessions` (:274) are MATERIALIZED as concrete integers (10, 40)
//        per the OQ-12 adjudication — sourced via getters below (NOT the composite bucket form).

/**
 * System 9 §9 detection & consequence tunables. All [PROV-Y26Q2] (frozen OQ defaults, 2026-06-21).
 * Registry-first: each key has a gdd/14 row (§Operational chain — distribution §9 detection C2).
 * Calibration TD at C13 closeout.
 */
export const distributionDetectionTunables = {
  // ── 5-factor detection model (OQ-10) ──────────────────────────────────────────────────────────

  /**
   * `distribution.detection_base_prob` — the base detection probability before multiplicative factors
   * ([PROV-Y26Q2], OQ-10). `clamp01(base × timeFactor × vehicleFactor × cargoFactor × reputationFactor)`.
   * Canon §9 :137-146 names the 5 factors directionally but is silent on magnitudes → PROV.
   * Range 0.0..0.5. Default 0.05.
   * Env-override: DISTRIBUTION_DETECTION_BASE_PROB. (DB-override > env > default — Phase-23.)
   */
  get detectionBaseProb(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_base_prob',
      'DISTRIBUTION_DETECTION_BASE_PROB',
      0.05,
    );
  },

  /**
   * `distribution.detection_time_factor_high` — detection multiplier during the high-detection window
   * (12:00–14:00, REUSE `distribution.time_of_day_highest_detection_*_hour` — not re-inlined here).
   * Canon :143 "12:00–14:00 = highest". > 1.0 (aggravates). Range 1.0..3.0. Default 1.5. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_TIME_FACTOR_HIGH.
   */
  get detectionTimeFactorHigh(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_time_factor_high',
      'DISTRIBUTION_DETECTION_TIME_FACTOR_HIGH',
      1.5,
    );
  },

  /**
   * `distribution.detection_time_factor_low` — detection multiplier during the low-detection window
   * (02:00–05:00, REUSE `distribution.time_of_day_lowest_detection_*_hour`).
   * Canon :143 "02:00–05:00 = lowest". < 1.0 (improves). Range 0.1..1.0. Default 0.5. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_TIME_FACTOR_LOW.
   */
  get detectionTimeFactorLow(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_time_factor_low',
      'DISTRIBUTION_DETECTION_TIME_FACTOR_LOW',
      0.5,
    );
  },

  /**
   * `distribution.detection_vehicle_factor_foot` — vehicle factor for FOOT couriers.
   * Canon :144 (vehicle_type influences detection). foot < bike < car < van (escalating visibility).
   * Range 0.3..2.5. Default 0.6. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_VEHICLE_FACTOR_FOOT.
   */
  get detectionVehicleFactorFoot(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_vehicle_factor_foot',
      'DISTRIBUTION_DETECTION_VEHICLE_FACTOR_FOOT',
      0.6,
    );
  },

  /**
   * `distribution.detection_vehicle_factor_bike` — vehicle factor for BIKE couriers.
   * Canon :144. foot < bike < car. Range 0.3..2.5. Default 0.8. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_VEHICLE_FACTOR_BIKE.
   */
  get detectionVehicleFactorBike(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_vehicle_factor_bike',
      'DISTRIBUTION_DETECTION_VEHICLE_FACTOR_BIKE',
      0.8,
    );
  },

  /**
   * `distribution.detection_vehicle_factor_car` — vehicle factor for CAR couriers.
   * Canon :144. > bike, < van. Range 0.3..2.5. Default 1.2. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_VEHICLE_FACTOR_CAR.
   */
  get detectionVehicleFactorCar(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_vehicle_factor_car',
      'DISTRIBUTION_DETECTION_VEHICLE_FACTOR_CAR',
      1.2,
    );
  },

  /**
   * `distribution.detection_vehicle_factor_van` — vehicle factor for refrigerated VAN couriers.
   * Canon :144. The cold-chain van is most visible (> car). Range 0.3..2.5. Default 1.5. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_VEHICLE_FACTOR_VAN.
   */
  get detectionVehicleFactorVan(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_vehicle_factor_van',
      'DISTRIBUTION_DETECTION_VEHICLE_FACTOR_VAN',
      1.5,
    );
  },

  /**
   * `distribution.detection_cargo_factor_high` — detection multiplier when cargo_grams exceeds the
   * high-threshold (REUSE `distribution.cargo_size_high_threshold_pct` = 70, canon :261).
   * Canon :145 "Heavier loads = higher detection". > 1.0 (aggravates). Range 1.0..2.5. Default 1.3. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_CARGO_FACTOR_HIGH.
   */
  get detectionCargoFactorHigh(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_cargo_factor_high',
      'DISTRIBUTION_DETECTION_CARGO_FACTOR_HIGH',
      1.3,
    );
  },

  // ── DD-BLOCK-RHO v2 (patrol-gate): block_rho 5th multiplicative factor (OQ-10) ─────────────
  //
  // Canon §9 :37/:142 names block_rho as factor (a) "PRIMARY environmental detection driver"
  // but the canon operative formula gave NO operator and the registry had NO block_rho weight.
  // DD-BLOCK-RHO freezes block_rho as the 5th MULTIPLICATIVE factor (NOT the rejected additive
  // base + block_rho):
  //   block_rho_factor = clamp(min + gain × block_rho, min, min + gain)
  //
  // DD-BLOCK-RHO v2 (patrol-gate, 2026-06-21): min_factor default changed 0.5 → 0.0.
  // At ρ=0 → factor = 0.0 → prob = 0.0 EXACTLY (TRUE multiplicative gate: zero patrol → zero detection).
  // At ρ=1 → factor = 0.0 + 4.0 = 4.0 (was 4.5 under v1's 0.5 floor — gain stays 4.0, unchanged).
  // Value-sensitive + non-saturated: HIGH (van/heavy/rookie/ρ0.95) ≈ 0.259–0.778, never clamp-to-1.0.
  // Fixes: 6 distribution-loop tests (cold_chain_crick/ash_luxury/hush_capstone/distribution_hub/
  //        crick_vertical_slice) that carry NO seeded patrol (ρ≈0) were catching couriers in transit
  //        with v1's 0.5 floor — a real cross-chapter regression now fixed AT SOURCE.
  // Canon-correct: invariant :37 / factor table :142 make block_rho the PRIMARY driver → "no patrol
  //        → no detection". Calibration TD C13.

  /**
   * `distribution.detection_block_rho_min_factor` — the floor of the block_rho multiplicative factor
   * (DD-BLOCK-RHO v2, patrol-gate, 2026-06-21). At patrol load ρ=0 the factor equals this value.
   * v2 default = 0.0 (was 0.5 in v1): zero patrol → factor 0.0 → prob 0.0 EXACTLY (TRUE gate).
   * Range 0.0..1.0. Default 0.0. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_BLOCK_RHO_MIN_FACTOR.
   */
  get detectionBlockRhoMinFactor(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_block_rho_min_factor',
      'DISTRIBUTION_DETECTION_BLOCK_RHO_MIN_FACTOR',
      0.0,
    );
  },

  /**
   * `distribution.detection_block_rho_gain` — the slope of the block_rho multiplicative factor
   * (DD-BLOCK-RHO v2). At patrol load ρ=1 the factor equals min + gain (= 4.0 when min=0.0),
   * making block_rho the dominant-but-non-totalizing driver (canon "PRIMARY" :37).
   * `gain` is UNCHANGED at 4.0 from v1 (non-saturating: HIGH max prob 0.778 < 1.0 — verified).
   * Range 0.5..8.0. Default 4.0. [PROV-Y26Q2].
   * block_rho_factor = clamp(detectionBlockRhoMinFactor + detectionBlockRhoGain × block_rho,
   *                          detectionBlockRhoMinFactor,
   *                          detectionBlockRhoMinFactor + detectionBlockRhoGain)
   * Env-override: DISTRIBUTION_DETECTION_BLOCK_RHO_GAIN.
   */
  get detectionBlockRhoGain(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_block_rho_gain',
      'DISTRIBUTION_DETECTION_BLOCK_RHO_GAIN',
      4.0,
    );
  },

  // ── Reputation factors (OQ-10 / OQ-12) ───────────────────────────────────────────────────────

  /**
   * `distribution.detection_reputation_factor_rookie` — detection multiplier for `rookie` couriers
   * (sessions_active < reputationThresholdSeasoned). Canon :146 (reputation influences detection).
   * rookie > seasoned > expert (a rookie is more detectable). Range 0.3..2.0. Default 1.4. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_REPUTATION_FACTOR_ROOKIE.
   */
  get detectionReputationFactorRookie(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_reputation_factor_rookie',
      'DISTRIBUTION_DETECTION_REPUTATION_FACTOR_ROOKIE',
      1.4,
    );
  },

  /**
   * `distribution.detection_reputation_factor_seasoned` — detection multiplier for `seasoned` couriers
   * (sessions_active in [thresholdSeasoned, thresholdExpert)). Canon :146. Neutral (baseline = 1.0).
   * Range 0.3..2.0. Default 1.0. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_REPUTATION_FACTOR_SEASONED.
   */
  get detectionReputationFactorSeasoned(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_reputation_factor_seasoned',
      'DISTRIBUTION_DETECTION_REPUTATION_FACTOR_SEASONED',
      1.0,
    );
  },

  /**
   * `distribution.detection_reputation_factor_expert` — detection multiplier for `expert` couriers
   * (sessions_active >= reputationThresholdExpert). Canon :146. < 1.0 (expert reduces detection).
   * Range 0.3..2.0. Default 0.6. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_REPUTATION_FACTOR_EXPERT.
   */
  get detectionReputationFactorExpert(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_reputation_factor_expert',
      'DISTRIBUTION_DETECTION_REPUTATION_FACTOR_EXPERT',
      0.6,
    );
  },

  // ── Caught-exception resolution (OQ-14 / OQ-16) ──────────────────────────────────────────────

  /**
   * `distribution.caught_resolution_window_ticks` — the window in game-ticks a player has to resolve
   * a `caught_exception` before it auto-abandons. OQ-14: 1 game-day = 1440 ticks (game-time, NOT
   * wall-clock). `resolution_deadline_tick = caught_at_tick + caughtResolutionWindowTicks`.
   * Range 360..4320. Default 1440. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_CAUGHT_RESOLUTION_WINDOW_TICKS.
   */
  get caughtResolutionWindowTicks(): number {
    return TunablesStore.resolveInt(
      'distribution.caught_resolution_window_ticks',
      'DISTRIBUTION_CAUGHT_RESOLUTION_WINDOW_TICKS',
      1440,
    );
  },

  /**
   * `distribution.caught_base_leak` — the base leak magnitude (0..100 server-side scale, R2.2) before
   * reputation and choice factors. `computeLeak = base × reputationFactor × choiceFactor`.
   * OQ-16 (dual channel: declaration_ledger bump + reputation/heat damage). Calibration TD C13.
   * Range 10..100. Default 50. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_CAUGHT_BASE_LEAK.
   */
  get caughtBaseLeak(): number {
    return TunablesStore.resolveInt(
      'distribution.caught_base_leak',
      'DISTRIBUTION_CAUGHT_BASE_LEAK',
      50,
    );
  },

  /**
   * `distribution.caught_leak_choice_factor_lawyer` — leak factor for `LAWYER_UP` choice.
   * Reduces leak (lawyer manages exposure). < abandon. Range 0.0..1.5. Default 0.5. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_LAWYER.
   */
  get caughtLeakChoiceFactorLawyer(): number {
    return TunablesStore.resolveFloat(
      'distribution.caught_leak_choice_factor_lawyer',
      'DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_LAWYER',
      0.5,
    );
  },

  /**
   * `distribution.caught_leak_choice_factor_abandon` — leak factor for `ABANDON` choice.
   * Full leak (neutral baseline = 1.0). Range 0.0..1.5. Default 1.0. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_ABANDON.
   */
  get caughtLeakChoiceFactorAbandon(): number {
    return TunablesStore.resolveFloat(
      'distribution.caught_leak_choice_factor_abandon',
      'DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_ABANDON',
      1.0,
    );
  },

  /**
   * `distribution.caught_leak_choice_factor_silence` — leak factor for `VIOLENT_SILENCE` choice.
   * Silence = zero leak (but heat injection via COURIER_SILENCE instead, OQ-19).
   * Range 0.0..1.5. Default 0.0. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_SILENCE.
   */
  get caughtLeakChoiceFactorSilence(): number {
    return TunablesStore.resolveFloat(
      'distribution.caught_leak_choice_factor_silence',
      'DISTRIBUTION_CAUGHT_LEAK_CHOICE_FACTOR_SILENCE',
      0.0,
    );
  },

  /**
   * `distribution.caught_lawyer_up_cost_cents` — [PROV-Y26Q2] materialization of
   * `composite:cost_medium` (distribution.lawyer_up_cost_bucket, gdd/14:3425, canon :267).
   *
   * @deprecated **RETIRÉ DU CHEMIN CAUGHT-COURIER (04d-A C2, décision #7 ratifiée 2026-06-30).**
   * Tier-1 = GRATUIT ($0) — le débit de 25 000 ¢ est supprimé de
   * `CourierDetectionService.resolveCaughtException` en C4. Ce getter reste pour backward-tolerance
   * uniquement (il ne doit PLUS être appelé depuis `resolveCaughtException`). Supersédé par le
   * ladder unifié `lawyer.*` dans `LawyerTunables` (lawyer.tunables.ts). Voir gdd/14:3426.
   *
   * Range 5000..50000. Default 25000 (= $250 — mid-game cash cost). [PROV-Y26Q2] calibration TD C13.
   * Env-override: DISTRIBUTION_CAUGHT_LAWYER_UP_COST_CENTS.
   * OQ-15: flagged — composite→cents resolution is a [PROV-Y26Q2] materialization.
   */
  get lawyerUpCostCents(): number {
    return TunablesStore.resolveInt(
      'distribution.caught_lawyer_up_cost_cents',
      'DISTRIBUTION_CAUGHT_LAWYER_UP_COST_CENTS',
      25000,
    );
  },

  // ── Reputation thresholds (OQ-12 — materialized composites) ──────────────────────────────────

  /**
   * `distribution.courier_reputation_session_threshold_seasoned` — sessions_active count to transition
   * rookie → seasoned. OQ-12: materializes the canon composite `composite:duration_medium_sessions`
   * (:273) as a concrete integer. Range 2..50. Default 10. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_REPUTATION_THRESHOLD_SEASONED.
   */
  get reputationThresholdSeasoned(): number {
    return TunablesStore.resolveInt(
      'distribution.courier_reputation_session_threshold_seasoned',
      'DISTRIBUTION_REPUTATION_THRESHOLD_SEASONED',
      10,
    );
  },

  /**
   * `distribution.courier_reputation_session_threshold_expert` — sessions_active count to transition
   * seasoned → expert. OQ-12: materializes the canon composite `composite:duration_long_sessions`
   * (:274) as a concrete integer. Range 10..200. Default 40. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_REPUTATION_THRESHOLD_EXPERT.
   */
  get reputationThresholdExpert(): number {
    return TunablesStore.resolveInt(
      'distribution.courier_reputation_session_threshold_expert',
      'DISTRIBUTION_REPUTATION_THRESHOLD_EXPERT',
      40,
    );
  },

  // ── Patrol heat band cuts (OQ-22 — DetectionRiskBucket) ──────────────────────────────────────

  /**
   * `distribution.patrol_heat_elevated_band` — lower cut for `DetectionRiskBucket` (C11 R2.2).
   * `patrol_heat >= elevated_band → 'elevated'`; below → 'silent'.
   * OQ-22: registry row (balance-relevant, not presentation-only). Range 0.0..1.0. Default 0.33. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_PATROL_HEAT_ELEVATED_BAND.
   */
  get patrolHeatBandElevated(): number {
    return TunablesStore.resolveFloat(
      'distribution.patrol_heat_elevated_band',
      'DISTRIBUTION_PATROL_HEAT_ELEVATED_BAND',
      0.33,
    );
  },

  /**
   * `distribution.patrol_heat_critical_band` — upper cut for `DetectionRiskBucket`.
   * `patrol_heat >= critical_band → 'critical'`. > elevated_band. Range 0.0..1.0. Default 0.66. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_PATROL_HEAT_CRITICAL_BAND.
   */
  get patrolHeatBandCritical(): number {
    return TunablesStore.resolveFloat(
      'distribution.patrol_heat_critical_band',
      'DISTRIBUTION_PATROL_HEAT_CRITICAL_BAND',
      0.66,
    );
  },

  // ── Detection→PatrolObservationSeverity mapping (OQ-20) ──────────────────────────────────────

  /**
   * `distribution.detection_severity_high_band` — lower cut for detection prob → PatrolObservationSeverity.
   * `detectionProb >= high_band → HIGH`; `detectionProb >= medium_band → MEDIUM`; else `LOW`.
   * OQ-20 (monotone deterministic map). Range 0.0..1.0. Default 0.33. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_SEVERITY_HIGH_BAND.
   */
  get detectionSeverityHighBand(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_severity_high_band',
      'DISTRIBUTION_DETECTION_SEVERITY_HIGH_BAND',
      0.33,
    );
  },

  /**
   * `distribution.detection_severity_medium_band` — upper cut for detection prob → PatrolObservationSeverity.
   * `detectionProb >= medium_band → MEDIUM` (below high → HIGH). > high_band.
   * Range 0.0..1.0. Default 0.66. [PROV-Y26Q2].
   * Env-override: DISTRIBUTION_DETECTION_SEVERITY_MEDIUM_BAND.
   */
  get detectionSeverityMediumBand(): number {
    return TunablesStore.resolveFloat(
      'distribution.detection_severity_medium_band',
      'DISTRIBUTION_DETECTION_SEVERITY_MEDIUM_BAND',
      0.66,
    );
  },
};

// ── DISTRIBUTION_TUNABLE_CAPS ─────────────────────────────────────────────────────────────────────
//
// Clampers for the C12 BO PUT /admin/tunables/distribution endpoint (admin-only).
// Pattern mirrors INSURANCE_TUNABLE_CAPS (insurance-admin.controller.ts:439) and
// FORENSIC_TUNABLE_CAPS (forensic-admin.controller.ts:321).
// Every NEW distribution.* key has a cap entry. Values = [min..max] per gdd/14 rows above.
// Note: REUSE composite keys (lawyer_up_cost_bucket / violent_silence_heat_increment / time_of_day_*
//       / cargo_size_high_threshold_pct) are NOT in this caps map — they are non-numeric composites
//       or unchanged canon keys. The insurance.courier_intercept_heat_threshold cap is owned by
//       INSURANCE_TUNABLE_CAPS (insurance-admin.controller.ts) — NOT duplicated here.

export const DISTRIBUTION_TUNABLE_CAPS: Record<string, (value: number) => number> = {
  // detection base prob — float range 0.0..0.5
  'distribution.detection_base_prob': (v: number) => Math.min(0.5, Math.max(0.0, Number(v))),

  // time factors — float range 1.0..3.0 / 0.1..1.0
  'distribution.detection_time_factor_high': (v: number) => Math.min(3.0, Math.max(1.0, Number(v))),
  'distribution.detection_time_factor_low': (v: number) => Math.min(1.0, Math.max(0.1, Number(v))),

  // vehicle factors — float range 0.3..2.5
  'distribution.detection_vehicle_factor_foot': (v: number) => Math.min(2.5, Math.max(0.3, Number(v))),
  'distribution.detection_vehicle_factor_bike': (v: number) => Math.min(2.5, Math.max(0.3, Number(v))),
  'distribution.detection_vehicle_factor_car': (v: number) => Math.min(2.5, Math.max(0.3, Number(v))),
  'distribution.detection_vehicle_factor_van': (v: number) => Math.min(2.5, Math.max(0.3, Number(v))),

  // cargo factor — float range 1.0..2.5
  'distribution.detection_cargo_factor_high': (v: number) => Math.min(2.5, Math.max(1.0, Number(v))),

  // DD-BLOCK-RHO: block_rho 5th multiplicative factor — float ranges 0.0..1.0 / 0.5..8.0
  'distribution.detection_block_rho_min_factor': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),
  'distribution.detection_block_rho_gain': (v: number) => Math.min(8.0, Math.max(0.5, Number(v))),

  // reputation factors — float range 0.3..2.0
  'distribution.detection_reputation_factor_rookie': (v: number) => Math.min(2.0, Math.max(0.3, Number(v))),
  'distribution.detection_reputation_factor_seasoned': (v: number) => Math.min(2.0, Math.max(0.3, Number(v))),
  'distribution.detection_reputation_factor_expert': (v: number) => Math.min(2.0, Math.max(0.3, Number(v))),

  // caught resolution window — int range 360..4320
  'distribution.caught_resolution_window_ticks': (v: number) =>
    Math.min(4320, Math.max(360, Math.round(v))),

  // caught leak — int range 10..100
  'distribution.caught_base_leak': (v: number) => Math.min(100, Math.max(10, Math.round(v))),

  // caught leak choice factors — float range 0.0..1.5
  'distribution.caught_leak_choice_factor_lawyer': (v: number) => Math.min(1.5, Math.max(0.0, Number(v))),
  'distribution.caught_leak_choice_factor_abandon': (v: number) => Math.min(1.5, Math.max(0.0, Number(v))),
  'distribution.caught_leak_choice_factor_silence': (v: number) => Math.min(1.5, Math.max(0.0, Number(v))),

  // reputation thresholds — int range 2..50 / 10..200
  'distribution.courier_reputation_session_threshold_seasoned': (v: number) =>
    Math.min(50, Math.max(2, Math.round(v))),
  'distribution.courier_reputation_session_threshold_expert': (v: number) =>
    Math.min(200, Math.max(10, Math.round(v))),

  // patrol heat band cuts — float range 0.0..1.0
  'distribution.patrol_heat_elevated_band': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),
  'distribution.patrol_heat_critical_band': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),

  // detection severity band cuts — float range 0.0..1.0
  'distribution.detection_severity_high_band': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),
  'distribution.detection_severity_medium_band': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),

  // lawyer_up cost — int range 5000..50000 (OQ-15 — composite:cost_medium materialization, [PROV-Y26Q2])
  'distribution.caught_lawyer_up_cost_cents': (v: number) =>
    Math.min(50000, Math.max(5000, Math.round(v))),

  // ── System 9b C2 — route-lifecycle tunable caps ───────────────────────────────────────────────

  // A* distance weights — float range 0.0..2.0
  'distribution.astar_w_distance_fastest': (v: number) => Math.min(2.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_distance_balanced': (v: number) => Math.min(2.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_distance_evasive': (v: number) => Math.min(2.0, Math.max(0.0, Number(v))),

  // A* patrol weights — float range 0.0..3.0
  'distribution.astar_w_patrol_fastest': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_patrol_balanced': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_patrol_evasive': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),

  // A* detection weights — float range 0.0..3.0
  'distribution.astar_w_detection_fastest': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_detection_balanced': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_detection_evasive': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),

  // A* debt weights — float range 0.0..3.0
  'distribution.astar_w_debt_fastest': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_debt_balanced': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),
  'distribution.astar_w_debt_evasive': (v: number) => Math.min(3.0, Math.max(0.0, Number(v))),

  // District transition cost — float range 1.0..20.0
  'distribution.astar_district_transition_cost': (v: number) => Math.min(20.0, Math.max(1.0, Number(v))),

  // Sinuosity cuts — float 1.0..1.6 / 1.4..3.0
  'distribution.sinuosity_direct_max': (v: number) => Math.min(1.6, Math.max(1.0, Number(v))),
  'distribution.sinuosity_meandering_max': (v: number) => Math.min(3.0, Math.max(1.4, Number(v))),

  // Corridor debt — float 0.1..5.0 / 0.0..1.0
  'distribution.corridor_debt_accrual_per_use': (v: number) => Math.min(5.0, Math.max(0.1, Number(v))),
  'distribution.corridor_debt_decay_per_tick': (v: number) => Math.min(1.0, Math.max(0.0, Number(v))),

  // Sever/warn thresholds — float 2.0..50.0 / 1.0..50.0
  'distribution.route_sever_threshold': (v: number) => Math.min(50.0, Math.max(2.0, Number(v))),
  'distribution.route_saturated_warn_threshold': (v: number) => Math.min(50.0, Math.max(1.0, Number(v))),

  // Ephemeral surcharge pct — float 0.0..0.5
  'distribution.ephemeral_surcharge_pct': (v: number) => Math.min(0.5, Math.max(0.0, Number(v))),

  // Vehicle capacity grams — int per vehicle type
  'distribution.vehicle_capacity_grams_foot': (v: number) => Math.min(1000, Math.max(50, Math.round(v))),
  'distribution.vehicle_capacity_grams_bike': (v: number) => Math.min(2000, Math.max(100, Math.round(v))),
  'distribution.vehicle_capacity_grams_car': (v: number) => Math.min(20000, Math.max(1000, Math.round(v))),
  'distribution.vehicle_capacity_grams_van': (v: number) => Math.min(50000, Math.max(2000, Math.round(v))),

  // Equipment costs in cents — int
  'distribution.equipment_cost_foot': (v: number) => Math.min(0, Math.max(0, Math.round(v))),
  'distribution.equipment_cost_bike': (v: number) => Math.min(200000, Math.max(0, Math.round(v))),
  'distribution.equipment_cost_car': (v: number) => Math.min(5000000, Math.max(0, Math.round(v))),
  'distribution.equipment_cost_van': (v: number) => Math.min(10000000, Math.max(0, Math.round(v))),

  // System 9c C3 — tier-map + fleet-cap caps
  'distribution.vehicle_purchase_required_tier_bike': (v: number) => Math.min(5, Math.max(1, Math.round(v))),
  'distribution.vehicle_purchase_required_tier_car': (v: number) => Math.min(5, Math.max(1, Math.round(v))),
  'distribution.vehicle_purchase_required_tier_van': (v: number) => Math.min(5, Math.max(1, Math.round(v))),
  'distribution.fleet_cap_in_transit_foot': (v: number) => Math.min(100, Math.max(1, Math.round(v))),
  'distribution.fleet_cap_in_transit_bike': (v: number) => Math.min(100, Math.max(1, Math.round(v))),
  'distribution.fleet_cap_in_transit_car': (v: number) => Math.min(100, Math.max(1, Math.round(v))),
  'distribution.fleet_cap_in_transit_van': (v: number) => Math.min(100, Math.max(1, Math.round(v))),
};

// ── System 9b C2 — NEW distribution.* [PROV-Y26Q2] route-lifecycle getters ──────────────────────
//
// 24 NEW keys (registry-first — rows land in gdd/14 §System 9b C2 route-lifecycle tunables BEFORE
// this code, per the anti-fabrication contract). Each getter SOURCES its key via
// TunablesStore.resolveFloat/resolveInt — NEVER an inline scalar (R2.3 / anti-fabrication).
//
// REUSE (by getter-reference, NOT re-inlined here):
//   - distribution.threnny_traversal_cost_units   (REUSE canon — cited in comments, not re-declared)
//   - distribution.ephemeral_mode_friction_cost_pct (REUSE canon — cited in comments, not re-declared)
//   - courier_*_cargo_g keys via vehicleCargoCapacityGrams() for detection (C6) — the NEW
//     distribution.vehicle_capacity_grams_* keys below are DISTINCT (route-lifecycle, OQ-VS1).
//
// OQ-VS1: the NEW `distribution.vehicle_capacity_grams_*` keys are DISTINCT from the canon
//   `courier_{foot,bike,car,van}_cargo_g` keys used by vehicleCargoCapacityGrams(). Both sets
//   default to the same values by design but are independently overridable.

/**
 * System 9b C2 route-lifecycle tunables. All [PROV-Y26Q2] (frozen OQ defaults, 2026-06-22).
 * Registry-first: each key has a gdd/14 row (§System 9b C2 route-lifecycle tunables).
 * Calibration TD at C2 closeout.
 */
export const distributionRouteLifecycleTunables = {
  // ── A* cost weights per stance (OQ-S1) ──────────────────────────────────────────────────────────

  /** `distribution.astar_w_distance_fastest` — A* distance weight for stance `fastest`. High (1.0): fastest minimizes travel distance. [PROV-Y26Q2]. */
  get astarWDistanceFastest(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_distance_fastest', 'DISTRIBUTION_ASTAR_W_DISTANCE_FASTEST', 1.0);
  },

  /** `distribution.astar_w_distance_balanced` — A* distance weight for stance `balanced`. [PROV-Y26Q2]. */
  get astarWDistanceBalanced(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_distance_balanced', 'DISTRIBUTION_ASTAR_W_DISTANCE_BALANCED', 0.6);
  },

  /** `distribution.astar_w_distance_evasive` — A* distance weight for stance `evasive`. Low (0.2): evasive deprioritizes distance. [PROV-Y26Q2]. */
  get astarWDistanceEvasive(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_distance_evasive', 'DISTRIBUTION_ASTAR_W_DISTANCE_EVASIVE', 0.2);
  },

  /** `distribution.astar_w_patrol_fastest` — A* patrol weight for stance `fastest`. Low (0.2): fastest ignores patrol. [PROV-Y26Q2]. */
  get astarWPatrolFastest(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_patrol_fastest', 'DISTRIBUTION_ASTAR_W_PATROL_FASTEST', 0.2);
  },

  /** `distribution.astar_w_patrol_balanced` — A* patrol weight for stance `balanced`. [PROV-Y26Q2]. */
  get astarWPatrolBalanced(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_patrol_balanced', 'DISTRIBUTION_ASTAR_W_PATROL_BALANCED', 0.6);
  },

  /** `distribution.astar_w_patrol_evasive` — A* patrol weight for stance `evasive`. High (1.2): evasive avoids patrol. [PROV-Y26Q2]. */
  get astarWPatrolEvasive(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_patrol_evasive', 'DISTRIBUTION_ASTAR_W_PATROL_EVASIVE', 1.2);
  },

  /** `distribution.astar_w_detection_fastest` — A* detection weight for stance `fastest`. Low (0.2). [PROV-Y26Q2]. */
  get astarWDetectionFastest(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_detection_fastest', 'DISTRIBUTION_ASTAR_W_DETECTION_FASTEST', 0.2);
  },

  /** `distribution.astar_w_detection_balanced` — A* detection weight for stance `balanced`. [PROV-Y26Q2]. */
  get astarWDetectionBalanced(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_detection_balanced', 'DISTRIBUTION_ASTAR_W_DETECTION_BALANCED', 0.6);
  },

  /** `distribution.astar_w_detection_evasive` — A* detection weight for stance `evasive`. High (1.2): evasive avoids detection. [PROV-Y26Q2]. */
  get astarWDetectionEvasive(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_detection_evasive', 'DISTRIBUTION_ASTAR_W_DETECTION_EVASIVE', 1.2);
  },

  /** `distribution.astar_w_debt_fastest` — A* corridor-debt weight for stance `fastest`. [PROV-Y26Q2]. */
  get astarWDebtFastest(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_debt_fastest', 'DISTRIBUTION_ASTAR_W_DEBT_FASTEST', 0.3);
  },

  /** `distribution.astar_w_debt_balanced` — A* corridor-debt weight for stance `balanced`. [PROV-Y26Q2]. */
  get astarWDebtBalanced(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_debt_balanced', 'DISTRIBUTION_ASTAR_W_DEBT_BALANCED', 0.5);
  },

  /** `distribution.astar_w_debt_evasive` — A* corridor-debt weight for stance `evasive`. [PROV-Y26Q2]. */
  get astarWDebtEvasive(): number {
    return TunablesStore.resolveFloat('distribution.astar_w_debt_evasive', 'DISTRIBUTION_ASTAR_W_DEBT_EVASIVE', 0.8);
  },

  // ── District transition cost (OQ-G3) ─────────────────────────────────────────────────────────────

  /**
   * `distribution.astar_district_transition_cost` — additive A* cost at each district boundary crossing.
   * [PROV-Y26Q2]. Range 1.0..20.0. Default 5.0.
   * Env-override: DISTRIBUTION_ASTAR_DISTRICT_TRANSITION_COST.
   */
  get astarDistrictTransitionCost(): number {
    return TunablesStore.resolveFloat('distribution.astar_district_transition_cost', 'DISTRIBUTION_ASTAR_DISTRICT_TRANSITION_COST', 5.0);
  },

  // ── Sinuosity bucket cuts (OQ-SN1) ──────────────────────────────────────────────────────────────

  /**
   * `distribution.sinuosity_direct_max` — upper cut for the `direct` sinuosity bucket.
   * `sinuosity_index < direct_max → direct`. [PROV-Y26Q2]. Range 1.0..1.6. Default 1.3.
   * Env-override: DISTRIBUTION_SINUOSITY_DIRECT_MAX.
   */
  get sinuosityDirectMax(): number {
    return TunablesStore.resolveFloat('distribution.sinuosity_direct_max', 'DISTRIBUTION_SINUOSITY_DIRECT_MAX', 1.3);
  },

  /**
   * `distribution.sinuosity_meandering_max` — upper cut for the `meandering` sinuosity bucket.
   * `sinuosity_index < meandering_max → meandering`; above → `gnarled`. [PROV-Y26Q2]. Range 1.4..3.0. Default 2.0.
   * Env-override: DISTRIBUTION_SINUOSITY_MEANDERING_MAX.
   */
  get sinuosityMeanderingMax(): number {
    return TunablesStore.resolveFloat('distribution.sinuosity_meandering_max', 'DISTRIBUTION_SINUOSITY_MEANDERING_MAX', 2.0);
  },

  // ── Corridor-debt accrual/decay (OQ-DB1/DB2) ─────────────────────────────────────────────────────

  /**
   * `distribution.corridor_debt_accrual_per_use` — corridor-debt increment per segment use.
   * Each transit adds this amount to the segment's `corridor_debt`. [PROV-Y26Q2]. Range 0.1..5.0. Default 1.0.
   * Env-override: DISTRIBUTION_CORRIDOR_DEBT_ACCRUAL_PER_USE.
   */
  get corridorDebtAccrualPerUse(): number {
    return TunablesStore.resolveFloat('distribution.corridor_debt_accrual_per_use', 'DISTRIBUTION_CORRIDOR_DEBT_ACCRUAL_PER_USE', 1.0);
  },

  /**
   * `distribution.corridor_debt_decay_per_tick` — corridor-debt decay per tick.
   * DISTRIBUTION_DEBT_DECAY tick subtracts this from each segment's `corridor_debt` (floor 0). [PROV-Y26Q2]. Range 0.0..1.0. Default 0.05.
   * Env-override: DISTRIBUTION_CORRIDOR_DEBT_DECAY_PER_TICK.
   */
  get corridorDebtDecayPerTick(): number {
    return TunablesStore.resolveFloat('distribution.corridor_debt_decay_per_tick', 'DISTRIBUTION_CORRIDOR_DEBT_DECAY_PER_TICK', 0.05);
  },

  // ── Sever/warn thresholds (OQ-SV2) ──────────────────────────────────────────────────────────────

  /**
   * `distribution.route_sever_threshold` — corridor_debt threshold above which a route is SEVERED.
   * `corridor_debt >= route_sever_threshold → state = severed`. [PROV-Y26Q2]. Range 2.0..50.0. Default 10.0.
   * Env-override: DISTRIBUTION_ROUTE_SEVER_THRESHOLD.
   */
  get routeSeverThreshold(): number {
    return TunablesStore.resolveFloat('distribution.route_sever_threshold', 'DISTRIBUTION_ROUTE_SEVER_THRESHOLD', 10.0);
  },

  /**
   * `distribution.route_saturated_warn_threshold` — corridor_debt saturation-warning threshold.
   * `corridor_debt >= warn_threshold → state = saturated_warn`. `< route_sever_threshold`. [PROV-Y26Q2]. Range 1.0..50.0. Default 6.0.
   * Env-override: DISTRIBUTION_ROUTE_SATURATED_WARN_THRESHOLD.
   */
  get routeSaturatedWarnThreshold(): number {
    return TunablesStore.resolveFloat('distribution.route_saturated_warn_threshold', 'DISTRIBUTION_ROUTE_SATURATED_WARN_THRESHOLD', 6.0);
  },

  // ── Ephemeral surcharge pct (OQ-EP2) ─────────────────────────────────────────────────────────────

  /**
   * `distribution.ephemeral_surcharge_pct` — proportional surcharge for ephemeral transits.
   * `payment_cents = base_payment × (1 + ephemeral_surcharge_pct)`. [PROV-Y26Q2]. Range 0.0..0.5. Default 0.15.
   * REUSE: `distribution.ephemeral_mode_friction_cost_pct` (canon) cited by reference — not re-inlined.
   * Env-override: DISTRIBUTION_EPHEMERAL_SURCHARGE_PCT.
   */
  get ephemeralSurchargePct(): number {
    return TunablesStore.resolveFloat('distribution.ephemeral_surcharge_pct', 'DISTRIBUTION_EPHEMERAL_SURCHARGE_PCT', 0.15);
  },

  // ── Vehicle capacity grams per type (OQ-VS1) ─────────────────────────────────────────────────────
  //
  // NEW `distribution.vehicle_capacity_grams_*` keys — DISTINCT from `courier_*_cargo_g` (C6 detection).
  // OQ-VS1: both sets default to the same values by design but are independently overridable.
  // REUSE: `distribution.threnny_traversal_cost_units` (canon) cited by reference — not re-inlined.

  /**
   * `distribution.vehicle_capacity_grams_{foot|bike|car|van}` — cargo capacity in grams per vehicle type.
   * Route-lifecycle context (OQ-VS1). DISTINCT from `vehicleCargoCapacityGrams()` / `courier_*_cargo_g`.
   * Defaults: foot=200 / bike=500 / car=5000 / van=8000. [PROV-Y26Q2].
   */
  vehicleCapacityGramsFor(vehicleType: string): number {
    switch (vehicleType) {
      case 'bike':
        return TunablesStore.resolveInt('distribution.vehicle_capacity_grams_bike', 'DISTRIBUTION_VEHICLE_CAPACITY_GRAMS_BIKE', 500);
      case 'car':
        return TunablesStore.resolveInt('distribution.vehicle_capacity_grams_car', 'DISTRIBUTION_VEHICLE_CAPACITY_GRAMS_CAR', 5000);
      case 'van':
      case 'refrigerated_van':
        return TunablesStore.resolveInt('distribution.vehicle_capacity_grams_van', 'DISTRIBUTION_VEHICLE_CAPACITY_GRAMS_VAN', 8000);
      case 'foot':
      default:
        return TunablesStore.resolveInt('distribution.vehicle_capacity_grams_foot', 'DISTRIBUTION_VEHICLE_CAPACITY_GRAMS_FOOT', 200);
    }
  },

  // ── Equipment cost cents per type (gdd/14:3420-3423 wired as getters) ────────────────────────────
  //
  // The existing gdd/14 rows (`:3420-3423`) document `distribution.equipment_cost_*` with DOLLAR amounts
  // (0/400/8000/25000). This getter wires them as CENTS (× 100) per OQ-VS1 plan spec:
  //   foot=0 cents / bike=40000 cents ($400) / car=800000 cents ($8000) / van=2500000 cents ($25000).

  /**
   * `distribution.equipment_cost_{foot|bike|car|van}` — equipment acquisition cost in CENTS per vehicle type.
   * Wires gdd/14:3420-3423 as getters (cents values per plan). Defaults: 0/40000/800000/2500000 cents. [PROV-Y26Q2].
   */
  equipmentCostCentsFor(vehicleType: string): number {
    switch (vehicleType) {
      case 'bike':
        return TunablesStore.resolveInt('distribution.equipment_cost_bike', 'DISTRIBUTION_EQUIPMENT_COST_BIKE', 40000);
      case 'car':
        return TunablesStore.resolveInt('distribution.equipment_cost_car', 'DISTRIBUTION_EQUIPMENT_COST_CAR', 800000);
      case 'van':
      case 'refrigerated_van':
        return TunablesStore.resolveInt('distribution.equipment_cost_van', 'DISTRIBUTION_EQUIPMENT_COST_VAN', 2500000);
      case 'foot':
      default:
        return TunablesStore.resolveInt('distribution.equipment_cost_foot', 'DISTRIBUTION_EQUIPMENT_COST_FOOT', 0);
    }
  },

  // ── Threnny traversal cost (C3 — REUSE canon `city.threnny_traversal_cost_units` = 2) ─────────────
  //
  // Per the C2 comment above (line 806), `city.threnny_traversal_cost_units` is REUSED by reference —
  // NOT re-declared with a new key. This getter resolves the EXISTING canon key so C3's RouteFinderService
  // can source the river-crossing penalty via the registry rather than inlining the scalar `2`.

  /**
   * `city.threnny_traversal_cost_units` — REUSE canon (default=2). The additive cost applied to any
   * threnny (river) edge crossing in the A* graph. Resolves the canonical key, NOT a new distribution.* key.
   * REUSE: cited in the C2 comment, not re-declared. Sources the existing gdd/14 row `n_traversal_cost_units=2`.
   */
  get thrennyTraversalCostUnits(): number {
    return TunablesStore.resolveInt('city.threnny_traversal_cost_units', 'CITY_THRENNY_TRAVERSAL_COST_UNITS', 2);
  },
};

// ── System 9c C3 — NEW distribution.* [PROV-Y26Q2] automation-hubs tunables ─────────────────────
//
// 7 NEW keys (registry-first — rows land in gdd/14 §System 9c C3 automation-hubs tunables BEFORE
// this code, per the anti-fabrication contract). Each getter SOURCES its key via
// TunablesStore.resolveInt — NEVER an inline scalar (R2.3 / anti-fabrication).
//
// REUSE (by getter-reference, NOT re-inlined here):
//   - distribution.distribution_hub_max_roster_tier_5 (REUSE canon — cap global tier-5 = 30,
//     cited in comments; hubRosterTunables.rosterCapByTier[5] surfaces the live value)
//   - distribution.equipment_cost_{foot,bike,car,van} (AND-gate with tier-gate C7 — not re-declared)
//   - lieutenant.logistics_dispatch_cargo_grams (cargo par dispatch coordinator C5/C6 — not re-declared)
//
// OQ-TM1 (DD-TIER-MAP): monotone tier ladder foot=0 (exempt) < bike=2 ≤ car=3 ≤ van=4.
//   foot is hardcoded 0 (always buyable) — no registry key needed.
//   unknown vehicle type → 0 (defensive floor, same as foot).
//
// OQ-FC2 (DD-FLEET-CAP): fleet caps INERT at default 30 (≥ global tier-5 cap 30) — never bites
//   existing specs (DIV-F1 no-regression contract). Calibration targets (8/4/2) are NOT ship-defaults.
//   unknown vehicle type → 30 (defensive max, same as inert default).

/**
 * System 9c C3 automation-hubs tunables. All [PROV-Y26Q2] (frozen OQ defaults, 2026-06-23).
 * Registry-first: each key has a gdd/14 row (§System 9c C3 automation-hubs tunables).
 * Calibration TD at Système 9 closeout.
 */
export const distributionAutomationHubsTunables = {
  // ── Vehicle purchase tier-map (OQ-TM1, DD-TIER-MAP) ─────────────────────────────────────────────

  /**
   * `distribution.vehicle_purchase_required_tier_{bike|car|van}` — minimum hub_tier to PURCHASE a
   * given vehicle type. `foot=0` (always buyable, no key). Monotone: bike ≤ car ≤ van.
   * Defaults: bike=2, car=3, van=4 (handles `refrigerated_van` too). [PROV-Y26Q2].
   */
  vehiclePurchaseRequiredTier(vehicleType: string): number {
    switch (vehicleType) {
      case 'bike':
        return TunablesStore.resolveInt('distribution.vehicle_purchase_required_tier_bike', 'DISTRIBUTION_VEHICLE_PURCHASE_REQUIRED_TIER_BIKE', 2);
      case 'car':
        return TunablesStore.resolveInt('distribution.vehicle_purchase_required_tier_car', 'DISTRIBUTION_VEHICLE_PURCHASE_REQUIRED_TIER_CAR', 3);
      case 'van':
      case 'refrigerated_van':
        return TunablesStore.resolveInt('distribution.vehicle_purchase_required_tier_van', 'DISTRIBUTION_VEHICLE_PURCHASE_REQUIRED_TIER_VAN', 4);
      case 'foot':
      default:
        return 0; // foot is always buyable (exempt) — defensive floor for unknown types
    }
  },

  // ── Per-vehicle-type in-transit fleet cap (OQ-FC2, DD-FLEET-CAP) ────────────────────────────────

  /**
   * `distribution.fleet_cap_in_transit_{foot|bike|car|van}` — per-vehicle-type in-transit occupancy
   * cap. Ships INERT: each default is 30 (≥ the global tier-5 cap of 30 — never bites existing specs).
   * `van` handles both `van` and `refrigerated_van`. unknown → 30 (defensive max). [PROV-Y26Q2].
   */
  fleetCapInTransit(vehicleType: string): number {
    switch (vehicleType) {
      case 'foot':
        return TunablesStore.resolveInt('distribution.fleet_cap_in_transit_foot', 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_FOOT', 30);
      case 'bike':
        return TunablesStore.resolveInt('distribution.fleet_cap_in_transit_bike', 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_BIKE', 30);
      case 'car':
        return TunablesStore.resolveInt('distribution.fleet_cap_in_transit_car', 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_CAR', 30);
      case 'van':
      case 'refrigerated_van':
        return TunablesStore.resolveInt('distribution.fleet_cap_in_transit_van', 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_VAN', 30);
      default:
        return 30; // defensive max — inert by design (unknown vehicle type → never bites)
    }
  },
};

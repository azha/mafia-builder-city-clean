// IMPLEMENTS: docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 5 (C5)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 6 (C6)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 7 (C7)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 8 (C8)
//             System 9 §9 Detection & Consequence C5/C6/C7/C8 — 2026-06-21
//             System 9b C12 — DD-COLD-POWERED neutralizer (neutralizeColdChain) — 2026-06-23
//             docs/tech/04a_operational_systems/distribution_couriers_runners.md §9
//
// `CourierDetectionService` — the shared idempotent caught path (DIV-1/2/3 convergence) +
// the Layer-2 5-factor per-segment detection roll (C6) + courier reputation (C7).
//
// C5 scope: markCourierCaught(playerId, shiftId, source, gameMinute) — the shared idempotent path.
// C6 scope: computeDetectionProb (PURE, 5-factor, SOURCED getters), rollSegment (seeded, DIV-5),
//           runSegmentDetection (transit seam hook).
// C7 scope: reputationBucket(sessionsActive) → CourierReputationBucket (derived, OQ-13 — no stored
//           bucket column); reputationFactor(sessionsActive) → number (maps bucket → getter, OQ-12).
//           computeDetectionProb refactored to call reputationFactor() instead of inline logic.
// C8 scope: severityFromProb(prob) → PatrolObservationSeverity (monotone, SOURCED cuts, OQ-20);
//           runSegmentDetection extended — on HIT ALSO emits PatrolObservationEvent (REUSE, OQ-11)
//           → System 3 suspicion_map bump + System 4 patrol queue (canon :148 on hit only).
//   C9 adds: resolveCaughtException, runResolutionSweep.
//   C10 adds: computeLeak (PURE, SOURCED), declaration_ledger 'courier_caught_leak' write (OQ-18),
//             VIOLENT_SILENCE → COURIER_SILENCE/MEDIUM HeatInjectionEvent (OQ-19/19b),
//             leak_magnitude persisted on caught_exception row.
//             Requires PoliceMemoryService (DI injected — PoliceMemoryModule already imported C0).
//
// IDEMPOTENT (first-fire wins):
//   Guard: read courier_shift.status → if 'caught' already → no-op (return early).
//   Else: mutate status='caught' + current_state='caught' (via DistributionDetectionRepository.markShiftCaught);
//   emit exactly ONE CourierInterceptedEvent (REUSE city-event-bus.ts:1695 — DIV-3, NO new event type);
//   create exactly ONE caught_exception row (status='pending', caught_at_tick, resolution_deadline_tick,
//   reputation_at_catch = sessions_active snapshot).
//
// `source` discriminates the call origin (layer1_interception vs layer2_segment) for logging/trace.
// No Math.random (DIV-5/C4). No resolver logic here (roll/resolution land C6/C9).
//
// R2.2/P5: emits CourierInterceptedEvent with ONLY qualitative identity — playerId, courierShiftId,
//   routeId, cargoCents, gameMinute. No raw patrol_heat/probability/sessions_active emitted.
// R9.3: reads schema only via DistributionDetectionRepository (no schema redefinition here).

import { Injectable, Logger, Inject, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { courier, courierShift, route as routeTable } from '../../db/schema/operational_chain';
import { LegalCaseService } from '../legal/legal-case.service';
import {
  CityEventBus,
  type CourierInterceptedEvent,
  type HeatInjectionEvent,
  type PatrolObservationEvent,
  type PatrolObservationSeverity,
} from '../../citysim/events/city-event-bus';
import { DistributionDetectionRepository } from './distribution-detection.repository';
// NOTE: ColdChainRepository import removed in C13 (dead injection — neutralizeColdChain uses this.db directly).
import {
  distributionDetectionTunables,
  distributionTimeOfDayTunables,
  vehicleCargoCapacityGrams,
} from './distribution-tunables';
import { PatrolDoctrineService } from '../../citysim/patrol/patrol.service';
import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';
import { MarketRngService } from '../market/market-rng.service';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import type { InTransitShift } from './distribution.repository';

export type CourierCaughtSource = 'layer1_interception' | 'layer2_segment';

/**
 * The 3-way resolution choice for a caught exception.
 *   LAWYER_UP       → status='lawyered' + opens a `LegalCase` (Tier-1 public defender, GRATUIT).
 *                     NO cash debit (lawyerUpCostCents retired, RATIFIÉ 2026-06-30 #1, 04d-A C4).
 *                     NO one-shot declaration (leak now drips per-tick C6 + conviction final-dump C7).
 *                     Sets caught_exception.legal_case_id = the new case UUID (additive FK).
 *   ABANDON         → status='abandoned' (no debit, no heat).
 *                     Declaration fires one-shot (courier_caught_leak, unchanged — byte-identical).
 *   VIOLENT_SILENCE → status='silenced' (no debit; heat injection via COURIER_SILENCE).
 *
 * Maps to the `caught_exception_status` enum members added at C1 schema time.
 * Canon: distribution_couriers_runners.md §9 :155-167. Re-wire: 04d-A C4 (RATIFIÉ 2026-06-30).
 */
export type CaughtActionChoice = 'LAWYER_UP' | 'ABANDON' | 'VIOLENT_SILENCE';

/**
 * Courier reputation bucket (C7 — OQ-13). Derived from `sessions_active` vs the frozen thresholds
 * (reputationThresholdSeasoned / reputationThresholdExpert getters, C2). Never stored as a column
 * (OQ-13 — the score is `sessions_active` alone; the bucket is derived on read).
 *
 * Canon :303 `CourierReputationBucket`. Feeds Layer-2 signature (C7) + leak model (C10).
 * Player-facing R2.2: the player sees ONLY the bucket (C11 projection), never the raw
 * `sessions_active` integer.
 */
export type CourierReputationBucket = 'rookie' | 'seasoned' | 'expert';

// ─── Layer-2 detection factor types ─────────────────────────────────────────────────────────────

/** Inputs to the 5-factor detection probability model (C6). */
export interface DetectionFactors {
  /** Patrol load at the current segment's block's precinct [0, 1]. blockRho = activeCount / capacity. */
  blockRho: number;
  /** The in-game minute (ctx.gameMinute) — used to derive the game-hour for the time-of-day factor. */
  gameMinute: number;
  /** The courier's vehicle type (foot/bike/car/van/refrigerated_van). */
  vehicleType: string;
  /** The shift's cargo in grams. */
  cargoGrams: number;
  /** The courier's vehicle cargo capacity in grams (SOURCED via vehicleCargoCapacityGrams getter). */
  cargoCapacity: number;
  /** The courier's sessions_active count (the reputation input — C7 refines to bucket, C6 uses raw). */
  sessionsActive: number;
}

@Injectable()
export class CourierDetectionService {
  private readonly logger = new Logger(CourierDetectionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly detectionRepository: DistributionDetectionRepository,
    private readonly bus: CityEventBus,
    // C6 — Layer-2 roll: patrol-load read (blockRho) + seeded PRNG.
    private readonly patrolDoctrineService: PatrolDoctrineService,
    private readonly rng: MarketRngService,
    // C10 — caught-leak BPD channel: appendDeclarationEntry 'courier_caught_leak' (OQ-18).
    private readonly policeMemoryService: PoliceMemoryService,
    // NOTE: ColdChainRepository NOT injected here (C13 cleanup — dead injection dropped).
    // neutralizeColdChain uses this.db directly; coldChainRepository was injected in C12
    // but never consumed here (the field was dead). ColdChainRepository remains in
    // distribution-test.controller.ts (degradeWarmCargo probe endpoint — actively used there).
    // 04d-A C4 — LAWYER_UP re-wire: LegalCaseService for createCase + charge_severity derivation.
    // Imported from LawyerModule (exported in legal.module.ts C3+). LawyerModule does NOT import
    // DistributionModule — no circular dependency. RATIFIÉ 2026-06-30 decision #3.
    private readonly legalCaseService: LegalCaseService,
  ) {}

  /**
   * Shared idempotent caught path (DIV-1/2/3 convergence — C5).
   *
   * IDEMPOTENT: if courier_shift.status is already 'caught', this is a no-op (first-fire wins).
   * Otherwise:
   *   1. Mark the shift caught (status='caught', current_state='caught' on courier).
   *   2. Emit exactly ONE CourierInterceptedEvent (REUSE — DIV-3; no new event type, no CourierCaughtEvent).
   *   3. Create exactly ONE caught_exception row (pending, caught_at_tick, resolution_deadline_tick, reputation_at_catch).
   *
   * `source` = 'layer1_interception' (MINUTE/21 path) | 'layer2_segment' (Layer-2 transit roll, C6).
   * `gameMinute` = ctx.gameMinute at the call site.
   *
   * NO Math.random. NO new enum member (REUSE existing 'caught' from shiftStatus/courierState).
   *
   * @param playerId — the player whose courier was caught.
   * @param shiftId — the courier_shift.shift_id being caught.
   * @param source — which detection layer caught it (for logging/trace, not a new event type).
   * @param gameMinute — the in-game minute (ctx.gameMinute at the call site).
   */
  async markCourierCaught(
    playerId: string,
    shiftId: string,
    source: CourierCaughtSource,
    gameMinute: number,
  ): Promise<void> {
    // ── Read the shift (idempotency guard + payload for the event/exception) ──────────────────────
    const [shiftRow = null] = await this.db
      .select({
        shift_id:       courierShift.shift_id,
        courier_id:     courierShift.courier_id,
        route_id:       courierShift.route_id,
        cargo_cents:    courierShift.cargo_cents,
        status:         courierShift.status,
        substance_type: courierShift.substance_type, // C12 — needed for at-catch Crick spoilage gate in neutralizeColdChain
      })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftId))
      .limit(1);

    if (!shiftRow) {
      this.logger.warn(`markCourierCaught: shift ${shiftId} not found — no-op.`);
      return;
    }

    // ── IDEMPOTENCY GUARD: first-fire wins (status='caught' → no-op) ──────────────────────────────
    if (shiftRow.status === 'caught') {
      this.logger.log(
        `markCourierCaught: shift ${shiftId} already caught — no-op (source=${source} is a duplicate fire).`,
      );
      return;
    }

    // ── 1. Mutate: status='caught' + current_state='caught' ───────────────────────────────────────
    await this.detectionRepository.markShiftCaught(shiftId, shiftRow.courier_id);

    // ── 2. Emit exactly ONE CourierInterceptedEvent (REUSE — DIV-3) ───────────────────────────────
    const event: CourierInterceptedEvent = {
      type: 'courier_intercepted',
      playerId,
      courierShiftId: shiftId,
      routeId: shiftRow.route_id,
      cargoCents: Number(shiftRow.cargo_cents),
      gameMinute,
    };
    this.bus.emitCourierIntercepted(event);

    // ── 3. Create exactly ONE caught_exception row (pending) ──────────────────────────────────────
    const caughtAtTick = BigInt(gameMinute);
    const windowTicks = distributionDetectionTunables.caughtResolutionWindowTicks;
    const resolutionDeadlineTick = caughtAtTick + BigInt(windowTicks);
    const reputationAtCatch = await this.detectionRepository.readSessionsActive(shiftRow.courier_id);

    await this.detectionRepository.insertCaughtException({
      player_id:                playerId,
      shift_id:                 shiftId,
      courier_id:               shiftRow.courier_id,
      route_id:                 shiftRow.route_id,
      caught_at_tick:           caughtAtTick,
      resolution_deadline_tick: resolutionDeadlineTick,
      reputation_at_catch:      reputationAtCatch,
    });

    this.logger.log(
      `markCourierCaught: player=${playerId} shift=${shiftId} source=${source} ` +
        `gameMinute=${gameMinute} → caught + CourierInterceptedEvent + caught_exception(pending).`,
    );

    // ── 4. C12 — cold-chain neutralizer (DIV-C1 — ADDITIVE, after existing caught path) ─────────
    // Read the courier's vehicle_type (needed for the Crick-spoilage gate in neutralizeColdChain).
    const [courierRow = null] = await this.db
      .select({ vehicle_type: courier.vehicle_type })
      .from(courier)
      .where(eq(courier.courier_id, shiftRow.courier_id))
      .limit(1);
    if (courierRow) {
      await this.neutralizeColdChain(shiftRow.shift_id, courierRow.vehicle_type, shiftRow.substance_type);
    }
  }

  /**
   * C12 — DD-COLD-POWERED neutralizer (DIV-C1): the 9a catch breaks the cold chain.
   *
   * For a caught courier_shift:
   *   1. Clear cold_chain_powered = false (the chain is broken — temperature spikes).
   *   2. If the shift is a van+Crick cargo (van caught = chain broken = at-catch spoilage),
   *      apply a deterministic at-catch spoilage: set cargo_grams = 0 (full spoilage, OQ-CC3).
   *
   * ADDITIVE: the existing caught path (status/event/exception, markShiftCaught) is UNCHANGED.
   * Deterministic: NO Math.random. The spoilage is a set-to-zero (the terminal state — the
   * cargo is forfeit, like a raid-seizure). cargo_grams=0 is guarded (≥0 trivially satisfied).
   * Called AFTER markShiftCaught (the shift is already status='caught' by this point).
   *
   * @param shiftId — the shift to neutralize.
   * @param vehicleType — the shift's courier's vehicle_type (for Crick-spoilage gate).
   * @param substanceType — the shift's substance_type (for Crick-spoilage gate).
   */
  private async neutralizeColdChain(
    shiftId: string,
    vehicleType: string,
    substanceType: string,
  ): Promise<void> {
    // 1. Clear cold_chain_powered = false (the chain is broken — DIV-C1/OQ-CC1).
    await this.db
      .update(courierShift)
      .set({ cold_chain_powered: false })
      .where(eq(courierShift.shift_id, shiftId));

    // 2. At-catch spoilage: if van+Crick, set cargo_grams=0 (full spoilage — OQ-CC3).
    //    The shift is status='caught' so the degrade tick won't process it (exits in_transit).
    //    The spoilage is realized here (deterministic set-to-zero, not a per-tick decay).
    if (vehicleType === 'refrigerated_van' && substanceType === 'crick') {
      await this.db
        .update(courierShift)
        .set({ cargo_grams: 0 })
        .where(eq(courierShift.shift_id, shiftId));
    }
  }

  // ─────────────────────────────────────── C6: Layer-2 5-factor roll ──────────────────────────────

  /**
   * C6 — PURE 6-factor detection probability computation (DD-BLOCK-RHO, frozen 2026-06-21).
   *
   * Formula (the canon 5-factor model with block_rho as the 5th MULTIPLICATIVE factor per DD-BLOCK-RHO):
   *   detection_prob = clamp01(base × timeFactor × vehicleFactor × cargoFactor × reputationFactor × blockRhoFactor)
   * where:
   *   blockRhoFactor = clamp(detectionBlockRhoMinFactor + detectionBlockRhoGain × blockRho,
   *                          detectionBlockRhoMinFactor,
   *                          detectionBlockRhoMinFactor + detectionBlockRhoGain)
   *
   * DD-BLOCK-RHO resolves the canon under-specification: canon §9 :37/:142 names block_rho factor (a)
   * "PRIMARY" but the operative formula gave NO operator and the registry had NO block_rho weight.
   * The REJECTED prior impl used an additive `base + blockRho` — that was a fig-leaf INVENTED by the
   * prior coder and is NOT used here. block_rho is the 5th MULTIPLICATIVE factor (not additive).
   *
   * Each factor is SOURCED via the distributionDetectionTunables / distributionTimeOfDayTunables
   * getters (anti-fabrication contract — NO inline scalar, NO inline 0.5/4.0). The result ∈ [0, 1].
   *
   * Factors (all SOURCED via getters):
   *   - base:           detectionBaseProb (default 0.05)
   *   - timeFactor:     High (1.5) if game-hour in [highStart, highEnd); Low (0.5) if in [lowStart, lowEnd); else 1.0
   *   - vehicleFactor:  per-vehicle multiplier (foot=0.6, bike=0.8, car=1.2, van=1.5)
   *   - cargoFactor:    if cargo_grams/capacity > cargoSizeHighThresholdPct/100 → high (1.3), else 1.0
   *   - reputationFactor: rookie (1.4) / seasoned (1.0) / expert (0.6) — SOURCED via getter
   *   - blockRhoFactor (DD-BLOCK-RHO): clamp(minFactor + gain × blockRho, minFactor, minFactor + gain)
   *       At ρ=0: factor = 0.5 (calmest block, atténuates). At ρ=1: factor = 4.5 (~9× lever, canon PRIMARY).
   *       Value-sensitive + non-saturated: HIGH (van/heavy/rookie/ρ=0.95) ≈ 0.29 (low time)..0.88 (high time).
   *
   * NO DB. NO Math.random. PURE (deterministic given the same inputs). NO additive `base + blockRho`.
   *
   * @param factors — the detection inputs (blockRho, gameMinute, vehicleType, cargoGrams, cargoCapacity, sessionsActive).
   */
  computeDetectionProb(factors: DetectionFactors): number {
    const t = distributionDetectionTunables;
    const tod = distributionTimeOfDayTunables;

    // ── base ──────────────────────────────────────────────────────────────────────────────────────
    const base = t.detectionBaseProb;  // SOURCED via getter (default 0.05)

    // ── (b) time_of_day_bucket — game-hour from gameMinute (gameMinute mod 1440 / 60) ─────────────
    const gameHour = Math.floor((factors.gameMinute % 1440) / 60);
    const loStart = tod.timeOfDayLowestDetectionStartHour;
    const loEnd = tod.timeOfDayLowestDetectionEndHour;
    const hiStart = tod.timeOfDayHighestDetectionStartHour;
    const hiEnd = tod.timeOfDayHighestDetectionEndHour;
    let timeFactor: number;
    if (gameHour >= hiStart && gameHour < hiEnd) {
      timeFactor = t.detectionTimeFactorHigh;     // SOURCED via getter
    } else if (gameHour >= loStart && gameHour < loEnd) {
      timeFactor = t.detectionTimeFactorLow;      // SOURCED via getter
    } else {
      timeFactor = 1.0;                           // neutral window
    }

    // ── (c) vehicle_type factor — SOURCED via getter ──────────────────────────────────────────────
    let vehicleFactor: number;
    switch (factors.vehicleType) {
      case 'bike':
        vehicleFactor = t.detectionVehicleFactorBike;
        break;
      case 'car':
        vehicleFactor = t.detectionVehicleFactorCar;
        break;
      case 'van':
      case 'refrigerated_van':
        vehicleFactor = t.detectionVehicleFactorVan;
        break;
      case 'foot':
      default:
        vehicleFactor = t.detectionVehicleFactorFoot;
        break;
    }

    // ── (d) cargo_size_bucket — SOURCED via getter (threshold pct) ───────────────────────────────
    const cargoRatio = factors.cargoCapacity > 0 ? factors.cargoGrams / factors.cargoCapacity : 0;
    const cargoThreshold = tod.cargoSizeHighThresholdPct / 100;  // SOURCED via getter
    const cargoFactor = cargoRatio > cargoThreshold ? t.detectionCargoFactorHigh : 1.0;

    // ── (e) courier_reputation_bucket — SOURCED via reputationFactor() helper (C7) ──────────────
    //    Anti-fabrication: thresholds + factors SOURCED via getters in reputationFactor() — never inline.
    //    C7 extracts this into named helpers (reputationBucket/reputationFactor) so the bucket
    //    computation is exposed as a testable, named method (OQ-12/13 — no stored bucket column).
    const reputationFactor = this.reputationFactor(factors.sessionsActive);

    // ── (a) DD-BLOCK-RHO: block_rho 5th MULTIPLICATIVE factor ────────────────────────────────────
    //    FROZEN formula (2026-06-21): block_rho_factor = clamp(minFactor + gain × blockRho,
    //                                                          minFactor, minFactor + gain)
    //    Sourced via the TWO getters — NO inline 0.5 or 4.0 (the rejected additive `base + blockRho`
    //    is GONE; block_rho is a MULTIPLICATIVE factor, NOT additive to the base).
    const blockRhoMinFactor = t.detectionBlockRhoMinFactor;  // SOURCED via getter (default 0.5)
    const blockRhoGain = t.detectionBlockRhoGain;             // SOURCED via getter (default 4.0)
    const blockRhoRaw = blockRhoMinFactor + blockRhoGain * factors.blockRho;
    const blockRhoFactor = Math.min(blockRhoMinFactor + blockRhoGain, Math.max(blockRhoMinFactor, blockRhoRaw));

    // ── 6-factor product + clamp01: base × time × vehicle × cargo × reputation × blockRho ────────
    //    (block_rho is the 5th multiplicative factor — NOT additive to base)
    const prob = base * timeFactor * vehicleFactor * cargoFactor * reputationFactor * blockRhoFactor;
    return Math.min(1.0, Math.max(0.0, prob)); // clamp01
  }

  /**
   * C6 — Deterministic per-segment roll ∈ [0, 1) (DIV-5: NO Math.random).
   *
   * Uses MarketRngService.seedFromDay with a segment-independent mix so successive segments roll
   * independently. The mix function is: mix(a, b) = (a + b * 2_654_435_761) % 1_000_000.
   *
   * regionInt(routeId) = parseInt(routeId.replace(/-/g,'').slice(0,8),16) % 1_000_000
   *   (mirrors courier-interception.service.ts seedForShift — the same UUID → int pattern).
   *
   * rollSegment(dayId, routeId, segmentIndex) = seedFromDay(dayId, mix(regionInt(routeId), segmentIndex))
   *
   * Hit iff rollSegment(...) < computeDetectionProb(...) — i.e. the roll falls below the probability.
   *
   * Same inputs → same output (deterministic, testable, no Math.random — DIV-5/C4).
   */
  rollSegment(dayId: number, routeId: string, segmentIndex: number): number {
    const regionInt = parseInt(routeId.replace(/-/g, '').slice(0, 8), 16) % 1_000_000;
    // mix: fold the segment index so each segment is independent (different than Layer-1 seed).
    const mixed = (regionInt + segmentIndex * 2_654_435_761) % 1_000_000;
    return this.rng.seedFromDay(dayId, mixed);
  }

  // ─────────────────────────────────────── C7: Courier reputation ─────────────────────────────────

  /**
   * C7 — Derive the courier reputation bucket from `sessions_active` (OQ-13: DERIVED, not stored).
   *
   * The bucket is computed on-read from the session count vs the two frozen thresholds:
   *   - rookie  : sessions_active < reputationThresholdSeasoned (default 10)
   *   - seasoned: sessions_active ∈ [thresholdSeasoned, thresholdExpert) (10..39)
   *   - expert  : sessions_active ≥ reputationThresholdExpert (default 40)
   *
   * OQ-12: thresholds SOURCED via the C2 `reputationThresholdSeasoned`/`reputationThresholdExpert`
   * getters (materialized from canon composites `composite:duration_medium_sessions` :273 /
   * `composite:duration_long_sessions` :274). NEVER inlined. Calibration TD C13.
   *
   * OQ-13: the `sessions_active` INTEGER is the authoritative reputation score; this bucket is a
   * DERIVED presentation band. No `reputation_bucket` column exists on `courier`. No float score.
   *
   * The player sees only the bucket (R2.2 / C11 projection), never the raw `sessions_active` count.
   *
   * @param sessionsActive — the courier.sessions_active counter value.
   * @returns the `CourierReputationBucket` for the given count.
   */
  reputationBucket(sessionsActive: number): CourierReputationBucket {
    const t = distributionDetectionTunables;
    const thresholdSeasoned = t.reputationThresholdSeasoned;  // SOURCED via getter (default 10)
    const thresholdExpert = t.reputationThresholdExpert;       // SOURCED via getter (default 40)

    if (sessionsActive >= thresholdExpert) {
      return 'expert';
    }
    if (sessionsActive >= thresholdSeasoned) {
      return 'seasoned';
    }
    return 'rookie';
  }

  /**
   * C7 — Map the courier reputation bucket → the detection reputation factor (SOURCED via getter).
   *
   * Delegates to `reputationBucket(sessionsActive)` for the bucket derivation, then maps:
   *   - rookie  → detectionReputationFactorRookie  (default 1.4 — worsens detection)
   *   - seasoned → detectionReputationFactorSeasoned (default 1.0 — neutral)
   *   - expert  → detectionReputationFactorExpert  (default 0.6 — improves detection)
   *
   * All factors SOURCED via `distributionDetectionTunables` getters (anti-fabrication contract).
   * No inline scalar (not 1.4/1.0/0.6 directly here — they flow via the tunable store).
   *
   * Consumed by `computeDetectionProb` (the (e) reputation factor) + (C10) `computeLeak`.
   *
   * @param sessionsActive — the courier.sessions_active counter value.
   * @returns the [PROV-Y26Q2] detection reputation multiplier for the bucket.
   */
  reputationFactor(sessionsActive: number): number {
    const t = distributionDetectionTunables;
    switch (this.reputationBucket(sessionsActive)) {
      case 'expert':   return t.detectionReputationFactorExpert;    // SOURCED via getter
      case 'seasoned': return t.detectionReputationFactorSeasoned;  // SOURCED via getter
      case 'rookie':
      default:         return t.detectionReputationFactorRookie;    // SOURCED via getter
    }
  }

  /**
   * C8 — Map detection probability → PatrolObservationSeverity (OQ-20, monotone deterministic).
   *
   * Higher detection probability → higher severity band (monotone property guaranteed by the band order).
   *
   * Bands (sourced via getters — no inline 0.33/0.66; OQ-20 frozen defaults [PROV-Y26Q2]):
   *   prob >= mediumBand (0.66) → 'HIGH'   (strongly detectable → BUMP_PATROL_HIGH in System 3)
   *   prob >= highBand   (0.33) → 'MEDIUM' (moderately detectable → BUMP_PATROL_MEDIUM in System 3)
   *   else               → 'LOW'   (barely detectable → no bump in System 3, canon :148 threshold)
   *
   * NOTE on tunable naming: `detectionSeverityHighBand` = the LOWER cut (threshold for MEDIUM zone);
   * `detectionSeverityMediumBand` = the HIGHER cut (threshold for HIGH zone). The names reflect
   * the SEVERITY ZONE each cut STARTS (high zone starts at mediumBand, medium zone starts at highBand).
   * Both getters are SOURCED (no inline scalar — OQ-20, anti-fabrication contract).
   *
   * R2.2/P5: the raw prob is server-only; this method emits only the qualitative band.
   */
  private severityFromProb(prob: number): PatrolObservationSeverity {
    const t = distributionDetectionTunables;
    const highCut    = t.detectionSeverityMediumBand;  // SOURCED getter — upper cut (>= → HIGH)
    const mediumCut  = t.detectionSeverityHighBand;    // SOURCED getter — lower cut (>= → MEDIUM)
    if (prob >= highCut)   return 'HIGH';
    if (prob >= mediumCut) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * C6 — Transit seam hook: compute the detection prob, roll, hit → markCourierCaught.
   * C8 EXTENDS: on hit, ALSO emit PatrolObservationEvent (REUSE, OQ-11) carrying the qualitative
   *   severity band (severityFromProb, OQ-20) → System 4 patrol queue + System 3 suspicion_map.
   *
   * Called AFTER advanceShiftSegment at the still-walking seam (distribution-transit.service.ts:118-120).
   * No-op if the shift is already caught (first-fire idempotency — Layer 1 may have already caught it).
   *
   * ADDITIVE: the arrival/segment-advance/cargo/timing logic is UNCHANGED. The roll is an additive hook.
   *
   * @param ctx — the tick context (playerId, gameMinute).
   * @param shift — the in-transit shift from listInTransitShifts.
   * @param segmentIndex — the segment index AFTER the advance (nextSegment from the still-walking branch).
   *
   * The route's path_blocks are read from the DB here (route_id → path_blocks) to avoid adding
   * a complex jsonb SELECT to listInTransitShifts (the prior approach caused a Drizzle/PG casting issue
   * when mixing jsonb column selection with the lateral block-coordinate joins).
   */
  async runSegmentDetection(
    ctx: CitySimTickContext,
    shift: InTransitShift,
    segmentIndex: number,
  ): Promise<void> {
    // Guard: no-op if already caught (idempotent — Layer 1 may have fired first).
    const [currentShift = null] = await this.db
      .select({ status: courierShift.status })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shift.shift_id))
      .limit(1);
    if (!currentShift || currentShift.status === 'caught') {
      return;
    }

    // ── Resolve pathBlocks from the route (the jsonb column — read separately to avoid lateral join issues) ──
    let pathBlocks: number[] = [];
    const [routeRow = null] = await this.db
      .select({ path_blocks: routeTable.path_blocks })
      .from(routeTable)
      .where(eq(routeTable.route_id, shift.route_id))
      .limit(1);
    if (routeRow) {
      const raw = routeRow.path_blocks;
      pathBlocks = Array.isArray(raw) ? (raw as number[]) : (JSON.parse(raw as unknown as string) as number[]);
    }

    // ── Resolve blockRho + precinctId + districtId for the current segment ───────────────────────
    //    C8: precinctId/districtId are hoisted to the outer scope so the hit path can emit the
    //    PatrolObservationEvent with the correct spatial context (the event shape requires all three).
    const currentBlock = pathBlocks[segmentIndex] ?? pathBlocks[pathBlocks.length - 1] ?? null;
    let blockRho = 0.0;
    let resolvedPrecinctId: number | null = null;
    let resolvedDistrictId: number | null = null;
    if (currentBlock !== null) {
      // Resolve precinct (patrol-load source + observation target).
      const pid = await this.patrolDoctrineService.precinctForBlock(currentBlock);
      resolvedPrecinctId = pid;
      if (pid !== null) {
        const patrolLoad = await this.patrolDoctrineService.getPatrolLoadRaw(ctx.playerId, pid);
        if (patrolLoad !== null && patrolLoad.capacity > 0) {
          blockRho = Math.min(1.0, patrolLoad.activeCount / patrolLoad.capacity);
        }
      }
      // Resolve district (C8: required for PatrolObservationEvent.districtId).
      resolvedDistrictId = this.patrolDoctrineService.districtForBlock(currentBlock);
    }

    // ── Read sessions_active for the reputation factor ────────────────────────────────────────────
    const sessionsActive = await this.detectionRepository.readSessionsActive(shift.courier_id);

    // ── Cargo capacity: SOURCED via vehicleCargoCapacityGrams getter ──────────────────────────────
    const cargoCapacity = vehicleCargoCapacityGrams(shift.vehicle_type);

    // ── Compute detection probability (PURE — anti-fabrication: no inline weight) ─────────────────
    const prob = this.computeDetectionProb({
      blockRho,
      gameMinute: ctx.gameMinute,
      vehicleType: shift.vehicle_type,
      cargoGrams: shift.cargo_grams,
      cargoCapacity,
      sessionsActive,
    });

    // ── Seeded roll (DIV-5: NO Math.random) ──────────────────────────────────────────────────────
    const dayId = Math.floor(ctx.gameMinute / 1440);
    const roll = this.rollSegment(dayId, shift.route_id, segmentIndex);

    this.logger.debug(
      `runSegmentDetection: shift=${shift.shift_id} segment=${segmentIndex} block=${currentBlock ?? 'null'} ` +
        `blockRho=${blockRho.toFixed(3)} prob=${prob.toFixed(4)} roll=${roll.toFixed(4)} ` +
        `vehicle=${shift.vehicle_type} cargo=${shift.cargo_grams}/${cargoCapacity}g sessions=${sessionsActive}`,
    );

    // ── Hit check: roll < prob → caught + Observation (the miss case is a no-op — zero-regression) ─
    if (roll < prob) {
      this.logger.log(
        `runSegmentDetection HIT: shift=${shift.shift_id} segment=${segmentIndex} ` +
          `roll=${roll.toFixed(4)} < prob=${prob.toFixed(4)} → markCourierCaught(layer2_segment) + PatrolObservationEvent`,
      );

      // 1. Shared idempotent caught path (C5 — first-fire wins; DIV-2/3 convergence).
      await this.markCourierCaught(ctx.playerId, shift.shift_id, 'layer2_segment', ctx.gameMinute);

      // 2. C8 — Emit PatrolObservationEvent (REUSE — OQ-11, no new event type; on HIT ONLY — canon :148).
      //    System 3's onPatrolObservation subscriber bumps the precinct suspicion_map tile.
      //    System 4 uses the observation for the 30-min patrol accumulation → raid targeting.
      //    Observation carries QUALITATIVE data only (severity band, not the raw prob — R2.2/P5).
      if (resolvedPrecinctId !== null && resolvedDistrictId !== null && currentBlock !== null) {
        const severity = this.severityFromProb(prob);
        const observationEvent: PatrolObservationEvent = {
          type: 'patrol_observation',
          playerId: ctx.playerId,
          precinctId: resolvedPrecinctId,
          districtId: resolvedDistrictId,
          blockId: currentBlock,
          severity,
          gameMinute: ctx.gameMinute,
        };
        this.bus.emitPatrolObservation(observationEvent);
        this.logger.log(
          `runSegmentDetection OBS: player=${ctx.playerId} precinct=${resolvedPrecinctId} ` +
            `district=${resolvedDistrictId} block=${currentBlock} severity=${severity} ` +
            `(prob=${prob.toFixed(4)} — qualitative only, R2.2)`,
        );
      } else {
        this.logger.warn(
          `runSegmentDetection HIT but no spatial context for PatrolObservationEvent ` +
            `(block=${currentBlock ?? 'null'} precinct=${resolvedPrecinctId ?? 'null'} ` +
            `district=${resolvedDistrictId ?? 'null'}) — observation skipped.`,
        );
      }
    }
    // Miss: no-op (zero-regression — the segment-advance is unchanged).
  }

  // ─────────────────────────────────────── C10: leak + couplings ──────────────────────────────────

  /**
   * C10 — Compute the reputation-modulated leak magnitude (PURE — no DB, no Math.random).
   *
   * Formula: `baseLeak × reputationFactor(sessionsActive) × choiceFactor(choice)` — all sourced.
   *   - baseLeak: SOURCED via `distributionDetectionTunables.caughtBaseLeak` (default 50).
   *   - reputationFactor: SOURCED via `reputationFactor(sessionsActive)` (rookie=1.4, seasoned=1.0, expert=0.6).
   *   - choiceFactor: SOURCED via the choice-specific getters:
   *       LAWYER_UP      → `caughtLeakChoiceFactorLawyer` (default 0.5 — reduced leak).
   *       ABANDON        → `caughtLeakChoiceFactorAbandon` (default 1.0 — full leak).
   *       VIOLENT_SILENCE → `caughtLeakChoiceFactorSilence` (default 0.0 — leak prevented).
   *
   * Uses `reputation_at_catch` snapshot (frozen at catch — a later level-up does not change a past leak).
   * R2.2: this is a server-side magnitude; never returned raw to a client surface (C11 bands it).
   *
   * @param sessionsActive — the `reputation_at_catch` snapshot from the caught_exception row.
   * @param choice — the resolution choice (CaughtActionChoice).
   */
  computeLeak(sessionsActive: number, choice: CaughtActionChoice): number {
    const baseLeak = distributionDetectionTunables.caughtBaseLeak; // SOURCED (OQ-16)
    const repFactor = this.reputationFactor(sessionsActive);        // SOURCED via getter

    let choiceFactor: number;
    switch (choice) {
      case 'LAWYER_UP':       choiceFactor = distributionDetectionTunables.caughtLeakChoiceFactorLawyer;  break;
      case 'ABANDON':         choiceFactor = distributionDetectionTunables.caughtLeakChoiceFactorAbandon; break;
      case 'VIOLENT_SILENCE': choiceFactor = distributionDetectionTunables.caughtLeakChoiceFactorSilence; break;
    }

    return baseLeak * repFactor * choiceFactor;
  }

  // ─────────────────────────────────────── C9: 3-way resolution ───────────────────────────────────

  /**
   * Resolve a caught exception with the player's chosen action (3-way: LAWYER_UP / ABANDON /
   * VIOLENT_SILENCE). Idempotent: if `status != 'pending'`, this is a no-op (first-fire wins).
   *
   * Status transitions (04d-A C4 re-wire, RATIFIÉ 2026-06-30):
   *   LAWYER_UP       → createCase (LegalCaseService) → status='lawyered' + legal_case_id stamped.
   *                     Tier-1 public defender auto-assigned. NO cash debit (lawyerUpCostCents RETIRED
   *                     from this path — RATIFIÉ #1). NO one-shot declaration (drip deferred to C6
   *                     LEGAL_LEAK_TICK + conviction final-dump at resolution C7 — RATIFIÉ #4).
   *                     The caught_exception.legal_case_id FK links to the opened LegalCase.
   *   ABANDON         → status='abandoned' (no debit, no heat).
   *                     Byte-identical: computeLeak (full) + persist leak_magnitude + write
   *                     declaration_ledger 'courier_caught_leak' entry (OQ-18 — unchanged, RATIFIÉ #2).
   *   VIOLENT_SILENCE → status='silenced' (no debit).
   *                     Byte-identical: leak_magnitude=0 (choiceFactor=0.0) + HeatInjectionEvent
   *                     (COURIER_SILENCE/MEDIUM, OQ-19/19b) on the BPD-focus building (unchanged).
   *
   * `resolved_at_tick` is stamped with `gameMinute` (BigInt) on all 3 paths.
   *
   * ABANDON / VIOLENT_SILENCE: byte-identical to pre-C4 (re-wire invariant, RATIFIÉ #2).
   * NO Math.random.
   *
   * @param playerId    — the player who owns the exception.
   * @param exceptionId — the caught_exception.exception_id.
   * @param choice      — the player's choice (CaughtActionChoice).
   * @param gameMinute  — the in-game minute at resolution (stored as resolved_at_tick).
   */
  async resolveCaughtException(
    playerId: string,
    exceptionId: string,
    choice: CaughtActionChoice,
    gameMinute: number,
  ): Promise<void> {
    // ── Idempotency guard: read status first ──────────────────────────────────────────────────────
    const existing = await this.detectionRepository.readCaughtException(exceptionId);
    if (!existing) {
      this.logger.warn(`resolveCaughtException: exception ${exceptionId} not found — no-op.`);
      return;
    }
    // ── Owner gate: exception must belong to the caller ──────────────────────────────────────────
    if (existing.player_id !== playerId) {
      throw new ForbiddenException(
        `caught_exception ${exceptionId} does not belong to player ${playerId}`,
      );
    }
    if (existing.status !== 'pending') {
      this.logger.log(
        `resolveCaughtException: exception ${exceptionId} already resolved (status=${existing.status}) — no-op (idempotent).`,
      );
      return;
    }

    // ── LAWYER_UP: open a LegalCase (Tier-1 GRATUIT, RATIFIÉ 2026-06-30 #1/#3, 04d-A C4) ────────────
    // Decision #3 (RATIFIÉ 2026-06-30): LAWYER_UP no longer resolves one-shot.
    // It opens a real LegalCase with a timeline. The caught_exception becomes the trigger record;
    // the LegalCase is the live entity (linked via the additive nullable FK legal_case_id).
    //
    // Decision #1 (RATIFIÉ 2026-06-30): NO cash debit. Tier-1 public defender = GRATUIT.
    //   lawyerUpCostCents (25000) is RETIRED from this path (see @deprecated getter, 04d-A C2).
    //   Debit only applies on a Tier-2/3 upgrade (C5 LawyerService.hire).
    //
    // Decision #4 (RATIFIÉ 2026-06-30): NO inline one-shot declaration.
    //   The 'courier_caught_leak' appendDeclarationEntry is REMOVED from LAWYER_UP here.
    //   Leak now drips per-tick (C6 LEGAL_LEAK_TICK); conviction final-dump at resolution (C7).
    //
    // ABANDON / VIOLENT_SILENCE: byte-identical (re-wire invariant, RATIFIÉ #2).
    if (choice === 'LAWYER_UP') {
      // 1. Query cargo_cents from courier_shift (to derive charge_severity — RATIFIÉ #3, [PROV-Y26Q2]).
      const [shiftRow = null] = await this.db
        .select({ cargo_cents: courierShift.cargo_cents })
        .from(courierShift)
        .where(eq(courierShift.shift_id, existing.shift_id))
        .limit(1);
      const cargoCents = shiftRow?.cargo_cents ?? 0;

      // 2. Derive charge_severity: cargo × reputation_at_catch [PROV-Y26Q2] (RATIFIÉ #3).
      //    Couriers can only reach misdemeanor/felony_low (strategic knowledge held by LTs).
      const chargeSeverity = this.legalCaseService.deriveChargeSeverityForCourier(
        cargoCents,
        existing.reputation_at_catch,
      );

      // 3. Build courier knowledge set [PROV-Y26Q2].
      //    C6 tick will draw from these items one by one as the case progresses.
      const knowledgeSet = this.legalCaseService.buildKnowledgeSetForCourier(
        existing.courier_id,
        cargoCents,
        existing.reputation_at_catch,
      );

      // 4. Create the LegalCase row (inserts lawyers + legal_cases; Tier-1 auto-assigned, status='active').
      const caseRow = await this.legalCaseService.createCase({
        playerId,
        defendantType: 'courier',
        defendantId: existing.courier_id,
        chargeSeverity,
        triggerRef: exceptionId,
        gameMinute,
        knowledgeSet,
      });

      // 5. Stamp caught_exception: status='lawyered' + resolved_at_tick + legal_case_id (additive FK).
      //    leak_magnitude stays NULL (no inline leak — drip per-tick C6; final-dump conviction C7).
      await this.detectionRepository.updateExceptionStatus(exceptionId, {
        status: 'lawyered',
        resolved_at_tick: BigInt(gameMinute),
        legal_case_id: caseRow.case_id,
        // leak_magnitude intentionally omitted (stays NULL — no inline one-shot, RATIFIÉ #4)
      });

      this.logger.log(
        `resolveCaughtException: player=${playerId} exception=${exceptionId} LAWYER_UP → ` +
          `LegalCase ${caseRow.case_id} opened (defendant=courier:${existing.courier_id} ` +
          `chargeSeverity=${chargeSeverity} cargoCents=${cargoCents} ` +
          `reputationAtCatch=${existing.reputation_at_catch}). ` +
          `Tier-1 GRATUIT (no debit). Leak drips C6 (no inline declaration). 04d-A C4 re-wire.`,
      );
      return;
    }

    // ── ABANDON / VIOLENT_SILENCE — BYTE-IDENTICAL paths (re-wire invariant, RATIFIÉ #2) ─────────
    // ONLY the LAWYER_UP branch above changed. Everything below is UNCHANGED from the pre-C4 code.
    // The VIOLENT_SILENCE heat path (:741-804 in the original) and the ABANDON declaration path
    // are untouched. legal_case_id stays NULL for these resolutions (no FK stamp, RATIFIÉ #2).

    const newStatus: 'abandoned' | 'silenced' = choice === 'ABANDON' ? 'abandoned' : 'silenced';

    // ── C10: Compute leak magnitude (PURE, all SOURCED) ──────────────────────────────────────────
    // Uses the `reputation_at_catch` snapshot (frozen at catch — a later level-up does not change
    // a past leak). choiceFactor: ABANDON=1.0, VIOLENT_SILENCE=0.0.
    const leakMagnitude = this.computeLeak(existing.reputation_at_catch, choice);

    // ── Stamp status + resolved_at_tick + leak_magnitude ─────────────────────────────────────────
    // legal_case_id NOT stamped (NULL for ABANDON/VIOLENT_SILENCE, retro-compat RATIFIÉ #2).
    await this.detectionRepository.updateExceptionStatus(exceptionId, {
      status: newStatus,
      resolved_at_tick: BigInt(gameMinute),
      leak_magnitude: leakMagnitude,
    });

    // ── C10: Per-choice consequences ──────────────────────────────────────────────────────────────

    if (choice === 'VIOLENT_SILENCE') {
      // VIOLENT_SILENCE: silence prevents the leak (leakMagnitude = 0) but emits heat (OQ-19/19b).
      // Target: the origin building of the courier's route (the "BPD focus building" — the operation
      // the police are focusing on after the violent enforcement of silence). Derive the building via
      // the route's path (route_id from caught_exception → route.origin_building_id → building).
      //
      // Resolution: JOIN caught_exception.route_id → route.origin_building_id + block_id + district.
      // patrolDoctrineService.districtForBlock(blockId) — canonical resolver (single-source geography,
      // same as C8 PatrolObservationEvent path; fallback to Math.ceil(blockId/100) if block unknown).
      // The HeatInjectionEvent uses the building and district identity (not a raw scalar — R2.2).
      //
      // REUSE: emitHeatInjection (city-event-bus.ts) — the canonical heat-injection seam. NO new event.
      // Source: 'COURIER_SILENCE' (the NEW HeatSource added C10 — additive). Magnitude: 'MEDIUM' (OQ-19).

      // Resolve the origin building from the route (to get a concrete buildingId + blockId for heat).
      const [routeRow = null] = await this.db
        .select({
          origin_building_id: routeTable.origin_building_id,
        })
        .from(routeTable)
        .where(eq(routeTable.route_id, existing.route_id))
        .limit(1);

      if (routeRow) {
        // Resolve the building's block_id to get the district/precinct for the HeatInjectionEvent.
        // The building table has `block_id`; we need it for the precinct resolution.
        const { building: buildingTable } = await import('../../db/schema/city_state');
        const [bldRow = null] = await this.db
          .select({ block_id: buildingTable.block_id })
          .from(buildingTable)
          .where(eq(buildingTable.building_id, routeRow.origin_building_id))
          .limit(1);

        if (bldRow) {
          // districtId via canonical resolver (patrolDoctrineService.districtForBlock — seeded geography,
          // single source of truth, matches declaration path ~:774 and C8 PatrolObservationEvent path ~:485).
          const districtId = this.patrolDoctrineService.districtForBlock(bldRow.block_id) ?? Math.ceil(bldRow.block_id / 100);

          const heatEvent: HeatInjectionEvent = {
            type: 'heat_injection',
            playerId,
            districtId,
            buildingId: routeRow.origin_building_id,
            magnitude: 'MEDIUM',   // OQ-19 — MEDIUM (strong police focus, not a forked EXTREME)
            source: 'COURIER_SILENCE', // OQ-19b — the NEW HeatSource (additive)
            gameMinute,
          };
          this.bus.emitHeatInjection(heatEvent);

          this.logger.log(
            `resolveCaughtException: player=${playerId} exception=${exceptionId} VIOLENT_SILENCE → ` +
              `COURIER_SILENCE/MEDIUM heat injection (buildingId=${routeRow.origin_building_id} ` +
              `districtId=${districtId}) (OQ-19/19b). leak_magnitude=0 (silence prevents leak).`,
          );
        } else {
          this.logger.warn(
            `resolveCaughtException: VIOLENT_SILENCE — origin building not found for route ${existing.route_id}; heat skipped.`,
          );
        }
      } else {
        this.logger.warn(
          `resolveCaughtException: VIOLENT_SILENCE — route ${existing.route_id} not found; heat skipped.`,
        );
      }
    } else {
      // ABANDON: write the caught-leak confession to the declaration_ledger (OQ-18).
      // The BPD records the courier exposure (confession channel — distinct from the heat channel).
      // NOTE: LAWYER_UP no longer writes here (04d-A C4 re-wire, RATIFIÉ #4). Only ABANDON does.
      //
      // Declaration severity = leakMagnitude clamped to [0, 100] integer bucket.
      // Precinct: derived from the route's origin block (the operation's home precinct).
      // REUSE: appendDeclarationEntry (police_memory.service.ts) — the EXISTING write seam.
      // DeclarationType: 'courier_caught_leak' (additive bare string — no allow-list).
      // sourceOriginId: the exception_id (the BPD's reference to the caught-courier event).

      const severity = Math.min(100, Math.max(0, Math.trunc(leakMagnitude)));

      // Resolve the route's origin block → precinct.
      const [routeRow = null] = await this.db
        .select({ origin_building_id: routeTable.origin_building_id })
        .from(routeTable)
        .where(eq(routeTable.route_id, existing.route_id))
        .limit(1);

      let precinctId = 1; // fallback precinct if resolution fails
      if (routeRow) {
        const { building: buildingTable } = await import('../../db/schema/city_state');
        const [bldRow = null] = await this.db
          .select({ block_id: buildingTable.block_id })
          .from(buildingTable)
          .where(eq(buildingTable.building_id, routeRow.origin_building_id))
          .limit(1);
        if (bldRow) {
          precinctId = (await this.patrolDoctrineService.precinctForBlock(bldRow.block_id)) ?? 1;
        }
      }

      await this.policeMemoryService.appendDeclarationEntry(
        playerId,
        precinctId,
        'courier_caught_leak',       // DeclarationType (OQ-18 — additive bare string)
        severity,                    // 0-100 band of the leak magnitude
        exceptionId,                 // sourceOriginId — the caught_exception reference
        gameMinute,
      );

      this.logger.log(
        `resolveCaughtException: player=${playerId} exception=${exceptionId} ${choice} → ` +
          `declaration_ledger 'courier_caught_leak' (precinct=${precinctId} severity=${severity}) ` +
          `leak_magnitude=${leakMagnitude} (OQ-18).`,
      );
    }

    this.logger.log(
      `resolveCaughtException: player=${playerId} exception=${exceptionId} choice=${choice} → ${newStatus} ` +
        `(resolved_at_tick=${gameMinute} leak_magnitude=${leakMagnitude}).`,
    );
  }

  /**
   * C9 — Deterministic auto-abandon sweep: for each pending exception whose
   * `resolution_deadline_tick <= BigInt(ctx.gameMinute)`, calls `resolveCaughtException` with ABANDON.
   *
   * Called from DistributionTransitService.onApplicationBootstrap's NIGHTLY/10 registration
   * (CAUGHT_EXCEPTION_SWEEP). Organically a no-op for players with no overdue pending exceptions.
   *
   * No Math.random. Deterministic (pure function of persisted deadline vs clock).
   *
   * @param ctx — the tick context (playerId, gameMinute).
   */
  async runResolutionSweep(ctx: { playerId: string; gameMinute: number }): Promise<void> {
    const overdue = await this.detectionRepository.listPendingPastDeadline(BigInt(ctx.gameMinute));
    if (overdue.length === 0) return; // no-op (zero-regression)

    for (const exc of overdue) {
      if (exc.player_id !== ctx.playerId) {
        // Per-player sweep: only process this player's exceptions (defensive guard).
        continue;
      }
      await this.resolveCaughtException(ctx.playerId, exc.exception_id, 'ABANDON', ctx.gameMinute);
    }

    this.logger.log(
      `runResolutionSweep: player=${ctx.playerId} gameMinute=${ctx.gameMinute} → auto-abandoned ${overdue.length} overdue pending exceptions.`,
    );
  }
}

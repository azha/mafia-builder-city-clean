// IMPLEMENTS: docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 7 (C7)
//             insurance_mechanics.md §4.1 (:46-56 — COURIER_ARREST coverage type)
//             DD-PRODUCERS-MINIMAL (design §4): minimal deterministic courier-arrest producer
//             — Insurance C7 — 2026-06-17
//             DD-LAYER1-PROB (design §14, lot 9a, 2026-06-22 — ADDITIVE): Layer 1 now probabilistic.
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 14 (C14)
//
// `CourierInterceptionService` — the INSURANCE courier-interception MINUTE tick (System 9 minimal).
//
// Registered at Cadence.MINUTE / order 21 (the next FREE slot after EQUIPMENT_TIER_UPGRADE/20) by
// InsuranceModule.onApplicationBootstrap().
//
// BEHAVIOUR — DD-LAYER1-PROB (lot 9a C14, 2026-06-22):
//   Layer 1 is now a seeded **probabilistic, heat-scaled, patrol-gated** interception:
//   `intercept_prob = clamp(0, courierInterceptMaxProb, courierInterceptMaxProb × patrol_heat)`
//   hit iff `layer1_roll < intercept_prob`.
//
//   The roll is a PURE function of dispatch geometry (NOT route_id):
//   `layer1RegionInt = (originBlockId × 73_856_093 XOR destBlockId × 19_349_663) mod 1_000_000`
//   `layer1_roll = seedFromDay(dayId, layer1RegionInt)`
//   This makes the MINUTE/21 tick "re-evaluate ONE fixed draw" — same geometry + dayId = same roll
//   every tick → cumulative P_catch = intercept_prob (length-independent). A miss leaves the shift
//   in_transit; the next tick recomputes the SAME seed → SAME miss (no accumulation).
//
//   Why NOT route_id: route.route_id is defaultRandom() (a fresh UUID per dispatch) — keying on it
//   makes the catch effectively-random per run (~2.6 % flaky, the C6 reviewer lesson).
//
// BEHAVIOUR (one call per in-game minute per player):
//   1. Read `courier_intercept_heat_threshold` from insuranceTunables.
//      Le défaut livré est POSITIF depuis OQ-8 (voir le getter) : ce tick n'est PAS inerte. Il ne
//      sort immédiatement que si un déploiement pose explicitement une valeur <= 0.
//   2. Query all `courier_shift` rows (JOINed with route for path_blocks) WHERE player_id = ctx.playerId
//      AND status = 'in_transit'. If none: RETURN (organic no-op).
//   3. Retain only shifts whose `patrol_heat > threshold` (above-threshold cohort — the pre-filter
//      short-circuits cold shifts BEFORE any roll; preserves the zero-regression guarantee for cold shifts).
//      If empty: RETURN (organic no-op — none above threshold).
//   4. DD-LAYER1-PROB probabilistic roll (C4 — NO Math.random()):
//      For EACH above-threshold shift INDEPENDENTLY:
//        dayId = Math.floor(ctx.gameMinute / 1440)
//        originBlockId = path_blocks[0] (from route.path_blocks — deterministic dispatch geometry)
//        destBlockId   = path_blocks[last] (from route.path_blocks)
//        layer1RegionInt = (originBlockId × 73_856_093 XOR destBlockId × 19_349_663) mod 1_000_000
//        layer1_roll     = seedFromDay(dayId, layer1RegionInt)  ∈ [0,1)
//        intercept_prob  = clamp(0, courierInterceptMaxProb, courierInterceptMaxProb × patrol_heat)
//        hit iff layer1_roll < intercept_prob → markCourierCaught (shared idempotent path)
//      NOTE: the highest-seed selector loop (the old "pick exactly one" step) is REMOVED — each
//      shift above the gate rolls its OWN independent survival (a saturated-patrol fleet is no longer
//      guaranteed to lose exactly one per tick). More honest ambient model.
//   5. On hit: delegate to CourierDetectionService.markCourierCaught (idempotent; first-fire wins;
//      sets status='caught' + emits CourierInterceptedEvent → ClaimsService COURIER_ARREST claim).
//   6. Store in-memory `lastInterceptedEvent` (test probe — cleared by test route on reset).
//
// HARD INVARIANTS (design §14.2):
//   • patrol-gate (PARITY with DD-BLOCK-RHO v2): patrol_heat = 0 → intercept_prob = 0.0 EXACTLY
//     (multiplicative gate — at heat=0 the product is 0; roll < 0 is impossible; never caught).
//   • survival cap: at patrol_heat = 1.0, intercept_prob = courierInterceptMaxProb (default 0.25 < 1.0)
//     → 75 % survival at saturated patrol. Range top 0.50 structurally guarantees < 1.0.
//   • Roll-cadence: the seed is a pure function of dispatch geometry → the SAME roll every tick
//     (cumulative P_catch = intercept_prob, NOT 1 − (1−p)^N). Length-independent.
//   • Layer-1 stream DISTINCT from Layer 2's: Layer 2 keys on `seedFromDay(dayId, mix(regionInt(routeId),
//     segmentIndex))`; Layer 1 keys on `seedFromDay(dayId, layer1RegionInt(originBlock, destBlock))`.
//     Different `regionId` arg → independent SHA-256 draw.
//
// ZERO-REGRESSION: when threshold <= 0 (override-only edge case — MINOR-4, re-revue ⊥ 2026-08-13:
//   the shipped default is 0.5, NOT a sentinel; "(sentinel)" below described the OLD default and is
//   trimmed here) → RETURN immediately (nothing touched).
//   Production shifts default patrol_heat=0.0 → always below any positive threshold (the 0.5 pre-filter).
//
// R2.2 / P5: CourierInterceptedEvent carries ONLY qualitative identity — playerId, courierShiftId,
//   routeId, cargoCents, gameMinute. The raw patrol_heat / intercept_prob / layer1_roll floats are
//   NEVER emitted on the bus (server-only, BO-only).
//
// Migration 0065: adds patrol_heat REAL NOT NULL DEFAULT 0.0 to courier_shift (BO-only signal).
//   Default 0.0 → all existing production shifts have patrol_heat=0.0 → never above threshold.

import { Injectable, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { InjectableOptions } from '@nestjs/common';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { Inject } from '@nestjs/common';
import { courierShift, route } from '../../db/schema/operational_chain';
import { CityEventBus, type CourierInterceptedEvent } from '../../citysim/events/city-event-bus';
import { MarketRngService } from '../market/market-rng.service';
import { CourierDetectionService } from '../distribution/courier-detection.service';
import { insuranceTunables } from './insurance-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

@Injectable()
export class CourierInterceptionService {
  private readonly logger = new Logger(CourierInterceptionService.name);

  /** In-memory probe: the last CourierInterceptedEvent fired (test-only). Cleared on reset. */
  private lastInterceptedEvent: CourierInterceptedEvent | null = null;

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
    private readonly rng: MarketRngService,
    private readonly detection: CourierDetectionService,
  ) {
    // Subscribe to CourierInterceptedEvent to keep the in-memory test probe up-to-date.
    // The bus emits the event from CourierDetectionService.markCourierCaught (C5 shared path).
    // This listener is always-on (no production concern — CityEventBus is in-process, zero I/O).
    this.bus.onCourierIntercepted((event) => {
      this.lastInterceptedEvent = event;
    });
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Return the last CourierInterceptedEvent fired (test-probe — never used in production paths). */
  getLastInterceptedEvent(): CourierInterceptedEvent | null {
    return this.lastInterceptedEvent;
  }

  /** Clear the in-memory last-event probe (called by the test reset route). */
  clearLastInterceptedEvent(): void {
    this.lastInterceptedEvent = null;
  }

  // ────────────────────────────────── the registered MINUTE/21 tick ─────────────────────────────

  /**
   * {MINUTE, order 21} — probe `in_transit` courier shifts; for those above the heat threshold,
   * roll a seeded probabilistic interception (DD-LAYER1-PROB, lot 9a C14, 2026-06-22).
   *
   * Organic no-op (the common case):
   *   • threshold <= 0 → RETURN immédiat. ⚠️ Ce n'est PAS le cas du défaut livré (positif depuis
   *     OQ-8) : ce chemin ne s'emprunte que sous un override explicite.
   *   • No in_transit shifts → RETURN.
   *   • No shift with patrol_heat > threshold → RETURN (the pre-filter short-circuits cold shifts).
   *
   * DD-LAYER1-PROB model (design §14.2-§14.3):
   *   For each above-threshold shift independently:
   *     intercept_prob = clamp(0, courierInterceptMaxProb, courierInterceptMaxProb × patrol_heat)
   *     layer1_roll    = seedFromDay(dayId, layer1RegionInt(originBlock, destBlock))
   *     hit iff layer1_roll < intercept_prob → markCourierCaught('layer1_interception')
   *   The seed is a PURE function of dispatch geometry (NOT route_id — route_id is defaultRandom()).
   *   Same geometry + dayId → same roll every tick → cumulative P_catch = intercept_prob (NOT 1−(1−p)^N).
   *   The highest-seed selector loop is REMOVED — each shift rolls its OWN independent survival.
   *
   * C4 determinism: dayId = Math.floor(ctx.gameMinute / 1440); NO Math.random().
   *
   * @param thresholdOverride — TEST-ONLY. When provided (including 0 for the sentinel-disabled
   *   path), overrides the insuranceTunables registry value for this call. Passing 0 exercises
   *   the `threshold <= 0` early-out (sentinel = producer disabled). Allows E2E tests to exercise
   *   any path without setting an env var. The production scheduler never passes this parameter
   *   (undefined = use registry).
   */
  async runMinuteTick(ctx: CitySimTickContext, thresholdOverride?: number): Promise<void> {
    const threshold =
      thresholdOverride !== undefined
        ? thresholdOverride
        : insuranceTunables.courierInterceptHeatThreshold;

    // Sentinel check: threshold <= 0 means the producer is DISABLED (zero-regression).
    if (threshold <= 0) return;

    // Query all in_transit shifts for this player, JOINed with route for path_blocks geometry.
    // path_blocks is a JSONB array [originBlockId, destBlockId] (the M1 2-stop route).
    // We extract path_blocks[0] (origin) and path_blocks[last] (dest) in SQL for the Layer-1 seed.
    const inTransitShifts = await this.db
      .select({
        shift_id:        courierShift.shift_id,
        route_id:        courierShift.route_id,
        cargo_cents:     courierShift.cargo_cents,
        patrol_heat:     courierShift.patrol_heat,
        // Origin block = path_blocks[0]; dest block = path_blocks[last] (length-1).
        // Both are integers stored as JSONB numbers. Fallback: 0 (should never happen in practice).
        origin_block_id: sql<number>`coalesce((${route.path_blocks}->>0)::int, 0)`,
        dest_block_id:   sql<number>`coalesce((${route.path_blocks}->>(jsonb_array_length(${route.path_blocks})-1))::int, 0)`,
      })
      .from(courierShift)
      .innerJoin(route, eq(route.route_id, courierShift.route_id))
      .where(
        and(
          eq(courierShift.player_id, ctx.playerId),
          eq(courierShift.status, 'in_transit'),
        ),
      );

    if (inTransitShifts.length === 0) return; // organic no-op

    // Pre-filter: retain only shifts above the heat threshold (the 0.5 floor short-circuits cold
    // shifts BEFORE any roll → the existing cold-dispatch test passes by construction).
    const aboveThreshold = inTransitShifts.filter((s) => s.patrol_heat > threshold);
    if (aboveThreshold.length === 0) return; // organic no-op — none above threshold

    // DD-LAYER1-PROB probabilistic roll (C4 — NO Math.random()):
    //   dayId derived from gameMinute (1440 minutes per in-game day).
    const dayId = Math.floor(ctx.gameMinute / 1440);
    const maxProb = insuranceTunables.courierInterceptMaxProb;

    for (const shift of aboveThreshold) {
      const originBlockId = Number(shift.origin_block_id);
      const destBlockId   = Number(shift.dest_block_id);

      // intercept_prob = clamp(0, max, max × patrol_heat) — patrol-gate: heat=0 → prob=0 EXACTLY.
      const interceptProb = Math.max(0, Math.min(maxProb, maxProb * shift.patrol_heat));

      // layer1RegionInt: geometry-only fold (Knuth-style hash constants from design §14.3).
      // Distinct from Layer 2's seed stream (which keys on routeId + segmentIndex).
      const layer1RegionInt = ((originBlockId * 73_856_093) ^ (destBlockId * 19_349_663)) % 1_000_000;
      const layer1Roll = this.rng.seedFromDay(dayId, layer1RegionInt);

      // Hit iff roll < intercept_prob.
      if (layer1Roll < interceptProb) {
        // Delegate to the shared idempotent caught path (C5 — DIV-1/2/3 convergence).
        // markCourierCaught:
        //   1. Guards idempotency (first-fire wins — if already 'caught', no-op).
        //   2. Mutates status='caught' + current_state='caught' on courier.
        //   3. Emits CourierInterceptedEvent (REUSE — no new event type; bus listener keeps probe).
        //   4. Inserts caught_exception row (pending, deadline, reputation_at_catch).
        await this.detection.markCourierCaught(
          ctx.playerId,
          shift.shift_id,
          'layer1_interception',
          ctx.gameMinute,
        );

        this.logger.log(
          `CourierInterceptionService MINUTE/21 DD-LAYER1-PROB: player=${ctx.playerId} ` +
            `shift=${shift.shift_id} origin=${originBlockId} dest=${destBlockId} ` +
            `heat=${shift.patrol_heat} prob=${interceptProb} roll=${layer1Roll} ` +
            `day=${dayId} → CAUGHT → markCourierCaught(layer1_interception).`,
        );
      } else {
        this.logger.debug(
          `CourierInterceptionService MINUTE/21 DD-LAYER1-PROB: player=${ctx.playerId} ` +
            `shift=${shift.shift_id} origin=${originBlockId} dest=${destBlockId} ` +
            `heat=${shift.patrol_heat} prob=${interceptProb} roll=${layer1Roll} ` +
            `day=${dayId} → SURVIVED (roll ≥ prob).`,
        );
      }
    }
  }

  // ─────────────────────────────────────── public helpers (C14 test probes) ─────────────────────

  /**
   * Compute the Layer-1 intercept probability for a given patrol_heat (DD-LAYER1-PROB, C14).
   *
   * `intercept_prob = clamp(0, courierInterceptMaxProb, courierInterceptMaxProb × patrolHeat)`
   *
   * Patrol-gate invariant: patrolHeat = 0 → prob = 0.0 EXACTLY.
   * Survival cap: patrolHeat = 1.0 → prob = courierInterceptMaxProb (default 0.25 < 1.0).
   *
   * Pure function — no DB, no async. Server-only (R2.2 — never returned to real clients).
   * Used by the `compute-intercept-prob` _test probe in DistributionTestController.
   */
  computeInterceptProb(patrolHeat: number): number {
    const maxProb = insuranceTunables.courierInterceptMaxProb;
    return Math.max(0, Math.min(maxProb, maxProb * patrolHeat));
  }

  /**
   * Compute the deterministic Layer-1 roll for the given route geometry + dayId (DD-LAYER1-PROB, C14).
   *
   * `layer1RegionInt = (originBlockId × 73_856_093 XOR destBlockId × 19_349_663) mod 1_000_000`
   * `layer1_roll     = seedFromDay(dayId, layer1RegionInt)`   ∈ [0, 1)
   *
   * This stream is DISTINCT from Layer 2's (which keys on `seedFromDay(dayId, mix(regionInt(routeId),
   * segmentIndex))`). Different `regionId` arg → independent SHA-256 draw.
   *
   * NO Math.random() (C4). Pure geometry → int fold with Knuth-style constants (design §14.3).
   * Used by the `layer1-roll` _test probe in DistributionTestController for both-ways pin verification.
   */
  computeLayer1Roll(originBlockId: number, destBlockId: number, dayId: number): number {
    const regionInt = ((originBlockId * 73_856_093) ^ (destBlockId * 19_349_663)) % 1_000_000;
    return this.rng.seedFromDay(dayId, regionInt);
  }
}

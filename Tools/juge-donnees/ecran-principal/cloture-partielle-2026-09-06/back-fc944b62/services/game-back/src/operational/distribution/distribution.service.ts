// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 8 (C8) — DD-FLEET-CAP per-type gate
// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §`Courier` entity / §`Route` entity
//             (foot courier dispatched on a route between two operational buildings) + §NestJS — backend jeu
//             (DistributionService.createRoute + assignCourierToRoute — the dispatch action) + §Data model `Shift`
//             (the transit shift carrying cargo) + docs/tech/09_data_model/schema_operational_chain.md §2/§3
//             (courier / route / courier_shift / product_storage — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//
// `DistributionService` (Step 1 — the player-triggered DISPATCH action of the M1 foot-courier distribution slice). It
// owns the action LOGIC; the repository owns the raw reads/writes (the persisted-system service/repository split).
//
// ── Step 1 — DISPATCH (distribution_couriers_runners.md §`Route`/§`Courier`):
//    dispatch(playerId, fromBuildingId, toBuildingId, cargoGrams) moves a quantity of the source's product (whatever
//    substance the `from` building holds — substance-generic since T4) from one of the
//    player's OPERATIONAL buildings to another. It SOURCES the cargo from the `from` building's product_storage
//    (guarded decrement, never negative), creates a ROUTE (the M1 deterministic 2-stop block path) + a FOOT COURIER
//    (vehicle_type='foot', state='in_transit') + a COURIER_SHIFT carrying the cargo (cargo_grams), all ATOMIC. The
//    cargo then rides ON the courier (courier_shift.cargo_grams) until the COURIER_TRANSIT tick walks the route to
//    completion and deposits it into the `to` building's product_storage. M1 = FOOT couriers carrying PRODUCT only
//    (bike/car/van, runner cash-carry, the A* RouteFinderService / detection-roll / Ephemeral Architecture / dispatch
//    coordinator behavior script are ALL DEFERRED — YAGNI).
//
//    The cargo is DEPOSITED LATER, on ARRIVAL (the COURIER_TRANSIT MINUTE tick — DistributionTransitService), not at
//    dispatch: a foot courier WALKS the route over multiple ticks (the §Modes de transport "slow" foot speed,
//    grounded to distribution.foot_courier_blocks_per_tick), exactly the §Data model `Shift` "current_segment_index
//    advanced par tick" semantics.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { DistributionRepository, RouteNotDispatchableError } from './distribution.repository';
import { HubRosterService } from './hub-roster.service';
import { isConfiguredSubstance } from '../substance/substance-config';
import type { SubstanceType } from '../substance/substance-config';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { PatrolDoctrineService } from '../../citysim/patrol/patrol.service';
import { RouteFinderService } from './route-finder.service';
import type { RouteStance } from './route-finder.service';
import { CorridorDebtService } from './corridor-debt.service';
import { distributionRouteLifecycleTunables, distributionAutomationHubsTunables } from './distribution-tunables';
import { EphemeralPurgeService } from './ephemeral-purge.service';
import { VehicleRosterService } from './vehicle-roster.service';
import { LegRepository } from '../../core_loops/supply_chain/leg.repository';
import { isStressed, transitStressMultiplier } from '../../core_loops/supply_chain/mycelial-stress';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RoutePatchSweepService } from './route-patch-sweep.service';
import { AnnealingRepository } from '../../core_loops/annealing/annealing.repository';

/** Clamp a value to [0, 1]. Pure utility — no RNG (DIV-5/C4 anti-fabrication). */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  // HubRosterService (Phase-4 vector #4 T3 — lever A): the PURE roster-cap derivation. Same-module provider; injected
  // here so the T4 dispatch gate can resolve the player's effective concurrent-shipment cap (no-hub cap vs per-tier
  // hub roster cap) and refuse an over-capacity dispatch (409 OVER_CAPACITY) before any cargo is sourced / shift created.
  // CityEventBus: injected ADDITIVELY (Drift C5) to emit CourierRotatedEvent after a successful dispatch commit.
  // The dispatch hot-path return value `{ courierId, routeId, shiftId }` is BYTE-IDENTICAL — the emit is additive.
  // PatrolDoctrineService: injected ADDITIVELY (System 9 C4) to resolve block→precinct + read patrol load for the
  //   Layer-1 patrol_heat producer. The resolution is ADDITIVE — the dispatch return is BYTE-IDENTICAL.
  // RouteFinderService: injected ADDITIVELY (System 9b C7) to compute the A* path for auto-dispatch routes.
  //   The dispatch return `{ courierId, routeId, shiftId }` is BYTE-IDENTICAL — the A* path is additive.
  //   For adjacent blocks the A* returns [from, to] — byte-identical to the prior M1 stub.
  // CorridorDebtService: injected ADDITIVELY (System 9b C8) to accrue corridor debt after a successful dispatch
  //   and to load the real debt snapshot before A* path computation. SSOT: corridor_debt table is the ONLY
  //   accumulator (DD-DEBT-SSOT D3). Does NOT write patrol_heat/suspicion_map (OQ-DB3).
  // EphemeralPurgeService: injected ADDITIVELY (System 9b C10) for the ephemeral surcharge at dispatch.
  //   For an ephemeral_mode dispatch, debits the cash surcharge BEFORE the cargo/route/shift are created.
  //   If insufficient cash, the dispatch is rejected (409 RESOURCE_STATE_CONFLICT — no state change).
  //   Non-ephemeral dispatches (ephemeralMode=false, the default) are BYTE-IDENTICAL to the pre-C10 path.
  // VehicleRosterService: injected ADDITIVELY (System 9b C11) for DD-ROSTER + DD-VEHICLE-STATS.
  //   Ownership check: ownsVehicle(playerId, vehicleType) — foot is default-allow (OQ-RS4, always true).
  //   Capacity enforcement: enforceCapacity(vehicleType, cargoGrams) — PURE (OQ-VS2).
  //   Non-foot vehicles not in vehicle_inventory → 409 RESOURCE_STATE_CONFLICT.
  //   Over-capacity cargo → 422 VALIDATION_FAILED.
  //   Placed AFTER the hub-tier vehicle gate (9c path, untouched) + BEFORE decrementSourceAndDispatch.
  // LegRepository: injected ADDITIVELY (P3-C C3) to read the (origin, destination) leg's LIVE debt_load
  //   at dispatch time — the ONE legitimate moment design §5.3/D4 sanctions a live stress read (migration
  //   0126's own header explains why the result is FROZEN onto the new route rather than re-derived at
  //   each transit tick). A pure SELECT (no state change) — dispatch return BYTE-IDENTICAL.
  // RouteLifecycleRepository / RoutePatchSweepService: injected ADDITIVELY (P3-C C7) for the `savedRouteId`
  //   dents path (design §7.5) — ownership+endpoint-consistency read + the light patch-check
  //   (`maybePatchRoute`, design §7.2 "check patch léger au dispatch saved") BEFORE the I7 claim guard.
  //   `savedRouteId` UNDEFINED (every existing caller) is byte-identical to the pre-C7 ad-hoc path.
  // AnnealingRepository: injected ADDITIVELY (P3-D C7 — Loop 7 Annealing Window, design §10.1) for the
  //   dispatch-time "is origin/destination CURRENTLY settling" read (`findActiveSettling` ×2, pure SELECTs
  //   — no state change). COMPOSED with (never replaces) the mycelial transit-stress multiplier at the
  //   SAME dispatch seam (below) — a dispatch touching no settling building stays BYTE-IDENTICAL (both
  //   reads return `null` → the composed factor is `mycelialFactor × 1 === mycelialFactor`, unchanged).
  constructor(
    private readonly repo: DistributionRepository,
    private readonly hubRoster: HubRosterService,
    private readonly bus: CityEventBus,
    private readonly patrolDoctrine: PatrolDoctrineService,
    private readonly routeFinder: RouteFinderService,
    private readonly corridorDebt: CorridorDebtService,
    private readonly ephemeralPurge: EphemeralPurgeService,
    private readonly vehicleRoster: VehicleRosterService,
    private readonly legRepository: LegRepository,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly routePatchSweep: RoutePatchSweepService,
    private readonly annealingRepo: AnnealingRepository,
  ) {}

  /**
   * Step 1 — DISPATCH (distribution_couriers_runners.md §`Route`/§`Courier`). Dispatch a FOOT courier carrying
   * `cargoGrams` of the source building's substance from `fromBuildingId` to `toBuildingId` (both must be the player's OWN OPERATIONAL
   * buildings). SOURCES the cargo from the `from` building's product_storage (guarded decrement) and creates a route +
   * a foot courier (state='in_transit') + a courier_shift carrying the cargo (cargo_grams) — ATOMIC (one DB
   * transaction) and guarded: insufficient source product refuses the WHOLE dispatch (no decrement, no route/courier/
   * shift, the stock never goes negative). The cargo arrives at the destination on the COURIER_TRANSIT tick. Returns
   * the new ids.
   *
   * Validation: cargoGrams a positive integer (else 422); source and destination must DIFFER (a same-building dispatch
   * is meaningless + the route CHECK origin≠destination would reject it → 409); both buildings must be the player's
   * OWN OPERATIONAL buildings (else 404); the source must hold ≥ cargoGrams of a single shipped substance (else 409).
   *
   * ROSTER-CAP GATE (Phase-4 vector #4 T4 — lever A): a new dispatch is also refused when the player is already at/over
   * their CONCURRENT in-transit shipment cap — count(courier_shift status='in_transit') ≥ effectiveCap → 409
   * OVER_CAPACITY. The cap is the no-hub cap (no operational distribution_hub) or the per-tier roster cap of the player's
   * BEST operational hub (HubRosterService). The gate is ATOMIC: it runs as a pre-tx read BEFORE any cargo is sourced or
   * shift created, so an over-capacity dispatch sources NO product and creates NO courier/route/shift (the count + cap
   * reads are pure SELECTs — they never change state). A dispatch UNDER the cap is byte-identical to the pre-T4 path
   * (the gate only ADDS the over-cap 409 branch; the no-hub cap of 2 ≥ the single shipment every existing dispatch path
   * sends, so no existing dispatch ever trips it).
   *
   * VEHICLE GATE (Phase-4 vector #4 T5 — lever B): `vehicleType` defaults to 'foot'. The allowed set is {foot} when the
   * player owns NO operational distribution_hub, {foot,bike,car} when one is owned (a hub UNLOCKS bike/car). A
   * vehicleType outside the allowed set → 422 VEHICLE_NOT_UNLOCKED. The chosen vehicle is persisted on the courier
   * (drives the per-vehicle COURIER_TRANSIT speed — bike/car arrive in fewer ticks) and the owned hub's building_id is
   * set as the courier's home_dispatch_hub_id. This gate REUSES the SAME owns-hub read as the roster cap (ONE read,
   * three consumers: cap, vehicle gate, home_dispatch_hub_id) so the dispatch hot path never double-reads. A default
   * `vehicleType='foot'` dispatch is byte-identical to the pre-T5 path (foot is always allowed; foot speed = the
   * pre-T5 foot speed).
   */
  async dispatch(
    playerId: string,
    fromBuildingId: string,
    toBuildingId: string,
    cargoGrams: number,
    vehicleType: string = 'foot',
    /**
     * C10 — DD-EPHEMERAL: if true, debit `ephemeralSurchargePct × cargoValueCents` from the
     * player's wallet BEFORE creating the route/courier/shift (the guarded debit — insufficient cash
     * → 409 RESOURCE_STATE_CONFLICT, no state change). ADDITIVE: false = byte-identical to pre-C10.
     */
    ephemeralMode: boolean = false,
    /**
     * C6 — DD-COORD-GRAMMAR: the route stance passed through to `computePath` and persisted on the
     * route. Defaults to `'balanced'` so ALL existing callers (LOGISTICS tick path + C5 coordinator
     * EXECUTE_DEFAULT) remain byte-identical. Only the C6 arg-bearing `DISPATCH_COURIER` and the
     * `SET_STANCE`-mutated `EXECUTE_DEFAULT` paths supply a non-default value.
     */
    stance: string = 'balanced',
    /**
     * P3-C C7 — DD-PERSIST dents (design §7.5): consume the path of an EXISTING saved route (no fresh
     * A*, OQ-P1) instead of creating a new ad-hoc route. UNDEFINED (every existing caller) is
     * byte-identical to the pre-C7 ad-hoc path. When provided, `fromBuildingId`/`toBuildingId` MUST match
     * the saved route's own origin/destination (endpoint-consistency — else 404).
     */
    savedRouteId?: string,
  ): Promise<{ courierId: string; routeId: string; shiftId: string }> {
    if (!Number.isInteger(cargoGrams) || cargoGrams < 1) {
      // r4/BLOCKING-1 — details.param was missing.
      throw new ApiError('VALIDATION_FAILED', {
        message: `cargo_grams must be a positive integer (got "${cargoGrams}").`,
        details: { param: 'cargo_grams' },
      });
    }
    if (fromBuildingId === toBuildingId) {
      // A courier from a building to itself moves nothing (and the route CHECK origin≠destination forbids it).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'from_building_id and to_building_id must differ (a courier route cannot start and end at the same building).',
      });
    }

    const from = await this.repo.getOwnedOperationalBuilding(playerId, fromBuildingId);
    if (!from) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `from_building ${fromBuildingId} is not a player-owned OPERATIONAL building for this player.`,
      });
    }
    const to = await this.repo.getOwnedOperationalBuilding(playerId, toBuildingId);
    if (!to) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `to_building ${toBuildingId} is not a player-owned OPERATIONAL building for this player.`,
      });
    }

    // ── P3-C C7 — savedRouteId ownership + endpoint-consistency (design §7.5) ─────────────────────────
    // A saved route must belong to THIS player and connect THESE exact endpoints — else 404 (the SAME
    // ownership-check convention every other saved-route method in this lot uses, route.service.ts).
    if (savedRouteId !== undefined) {
      const savedRoute = await this.routeLifecycleRepo.readRoute(savedRouteId);
      if (
        !savedRoute ||
        savedRoute.player_id !== playerId ||
        savedRoute.origin_building_id !== fromBuildingId ||
        savedRoute.destination_building_id !== toBuildingId
      ) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `Saved route ${savedRouteId} not found for player ${playerId} between ${fromBuildingId}→${toBuildingId}.`,
        });
      }
    }

    // Resolve the substance the SOURCE building holds with enough stock for the cargo (T4 substance-generic — the
    // dispatch carries whatever substance the source physically holds, was hardcoded Brindle). No substance row with
    // ≥ cargo → 409 (insufficient product, no decrement). A holdings substance is always a SHIPPED one in this slice
    // (Brindle/Crick/Hush — the only substances produced/stored); guard defensively against an unconfigured one anyway.
    const sourceSubstance = await this.repo.resolveSourceSubstance(playerId, fromBuildingId, cargoGrams);
    if (sourceSubstance === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Insufficient product at the source building to dispatch ${cargoGrams} g.`,
      });
    }
    if (!isConfiguredSubstance(sourceSubstance)) {
      // Defensive: a stored substance with no shipped descriptor cannot be dispatched this slice. All produced/stored
      // substances ship a descriptor today (Brindle/Crick/Hush; Ash is luxury-channel — it sells via the honor path,
      // not distribution), so this guard is unreachable in practice.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `substance "${sourceSubstance}" at the source building is not a shipped substance (BRINDLE | CRICK | HUSH).`,
      });
    }

    // ── P3-C C3/C4 — Loop 5 Mycelial Ledger: the (origin, destination) leg's LIVE state, read ONCE here
    // (hoisted to the EARLIEST point past the 404/409 building+substance guards — a pure SELECT, no state
    // change yet, so a fresh/unstressed dispatch stays byte-identical to every pre-C3 path). Serves TWO
    // consumers: the C4 `LEG_RESTING` gate right below (a bypassed leg must 409 BEFORE any wallet debit —
    // the C10-era ephemeral surcharge — or any A*/patrol-heat computation runs) AND the C3 dispatch-time
    // transit-slowdown multiplier (computed further down, at the SAME point C3 originally read it — no
    // second query). No leg row yet (a never-delivered pair) → debtLoad=0, bypassed=false.
    const legState = await this.legRepository.findLegState(playerId, fromBuildingId, toBuildingId);
    if (legState.bypassed) {
      // design §5.4 (REROUTE_BYPASS): "dispatch sur la paire → 409 LEG_RESTING" — a STATE description
      // (sub-décision #10, state-not-timer), never a countdown. Resolves itself once the leg's decaying
      // debt_load crosses `mycelial_bypass_resume_threshold` (LegRepository.applyNightlyDecayAndStressEval,
      // NIGHTLY/25) — no user action required to clear it (AFTER_DELAY, error-codes.ts).
      throw new ApiError('LEG_RESTING', {
        message: `leg ${fromBuildingId}→${toBuildingId} is resting (REROUTE_BYPASS) — dispatch refused until the leg's debt decays to the resume threshold.`,
      });
    }

    // ── OWNS-HUB READ (Phase-4 vector #4 T4+T5; the SINGLE owns-hub read serving THREE consumers below — the cap, the
    // vehicle gate, and the courier's home_dispatch_hub_id). A pure SELECT (no state change), so a dispatch that passes
    // both gates is byte-identical to the pre-T4/T5 path. `hub` = the player's BEST operational distribution_hub
    // ({ buildingId, hubTier }) or null (no operational hub).
    const hub = await this.repo.getOwnedOperationalHub(playerId);

    // ── ROSTER-CAP GATE (Phase-4 vector #4 T4 — lever A; the RISK change). Placed AFTER the 404 building guards and the
    // 409 substance guards (so a bad building still 404s, an insufficient-product source still 409s — the existing
    // ordering is preserved), and BEFORE decrementSourceAndDispatch (so an over-cap dispatch sources NO product and
    // creates NO courier/route/shift — the atomicity property the no-regression depends on). The reads here are pure
    // SELECTs (no state change), so a dispatch under the cap is byte-identical to the pre-T4 path.
    //   cap:        effectiveCap(hub?.hubTier ?? null) — noHubCap (null) else the per-tier roster cap (lever A by tier).
    //   inTransit:  the player's currently in-transit courier_shifts — the occupied roster slots (an arrival frees one).
    // count ≥ cap → the roster is full → refuse the NEW shipment (409 OVER_CAPACITY). The cap/count appear ONLY in the
    // dev-facing `message` string (R-EH-4) — NOT in client-facing `payload_vars`: R2.2 names the raw shift count a
    // never-surface-raw value, so the player surface is the qualitative roster_band projection (T6), never the raw count.
    // TOCTOU: this count+cap check is a pre-tx read (matching the other dispatch guards). Two truly-simultaneous
    // dispatches could both pass it and admit cap+1 — tolerated under M1's sequential player-action model (the
    // idempotency interceptor de-dupes retries); the plan's "atomic" = no writes on the 409 path (the pre-tx throw honors it).
    const maxHubTier = hub?.hubTier ?? null;
    const cap = this.hubRoster.effectiveCap(maxHubTier);
    const inTransit = await this.repo.countInTransitShifts(playerId);
    if (inTransit >= cap) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `dispatch refused: the player is at/over the concurrent in-transit shipment capacity ` +
          `(${inTransit} in transit, cap ${cap}${maxHubTier === null ? ' — no operational distribution_hub' : ` — hub_tier ${maxHubTier}`}). ` +
          `Wait for a shipment to arrive (frees a slot) or build/upgrade a distribution_hub to raise the roster cap.`,
      });
    }

    // ── FLEET-CAP GATE — System 9c C8 — DD-FLEET-CAP (ADDITIVE — dispatch return BYTE-IDENTICAL) ─────
    //
    // A SECOND gate after the global roster-cap gate and BEFORE the vehicle gate + the tx. Counts the
    // player's IN-TRANSIT shifts for ONLY the dispatched vehicle_type (countInTransitShiftsByType — a
    // per-type variant of countInTransitShifts, joining courier for vehicle_type). Compares against the
    // per-type cap getter (fleetCapInTransit(vehicleType) — getter-sourced, no inline scalar).
    //
    // **SHIPS INERT (DIV-F1 / OQ-FC2):** the default per-type cap = 30 ≥ the global tier-5 roster cap
    // (30), so this gate can NEVER fire under default tunables (the global cap fires first at 30). The
    // gate only bites when the tunable is OVERRIDDEN LOW (the calibration target: bike=8/car=4/van=2 —
    // a [PROV-Y26Q2] tension, not a ship default). The no-regression contract: all existing dispatch /
    // roster / Phase-4 specs use ≤ 30 total in-transit (well under 30 per-type default) — ZERO new 409s.
    //
    // OQ-FC1 — DISTINCT rejection: the reason message starts with "fleet full:" so the binding's benign
    // catch (logistics-binding.ts:389, ALL RESOURCE_STATE_CONFLICT → NOOP) covers it + the spec can
    // tell it apart from the global-cap reason (the global reason starts with "dispatch refused: the
    // player is at/over"). Qualitative: the message carries the per-type count + cap (BO-visible only,
    // never surfaced to the player — R2.2 / P5 wall).
    //
    // Deterministic: the count is a pure SELECT (no RNG, no Date.now — C4 / DIV-F1). The gate is placed
    // AFTER the global cap (both gates must pass — BOTH-must-pass contract) and BEFORE the tx (an
    // over-fleet-cap dispatch sources NO product, creates NO courier/route/shift — atomic).
    const fleetCap = distributionAutomationHubsTunables.fleetCapInTransit(vehicleType);
    const inTransitByType = await this.repo.countInTransitShiftsByType(playerId, vehicleType);
    if (inTransitByType >= fleetCap) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `fleet full: ${inTransitByType} ${vehicleType}s in transit, cap ${fleetCap} ` +
          `(per-type fleet cap — OQ-FC1/DD-FLEET-CAP; override via distribution.fleet_cap_in_transit_${vehicleType}).`,
      });
    }

    // ── VEHICLE GATE (Phase-4 vector #4 T5 — lever B; the RISK change). The allowed vehicle set is {foot} with NO
    // operational distribution_hub, {foot,bike,car} when one is owned (a hub UNLOCKS bike/car). refrigerated_van is NOT
    // in the hub set (it is Crick's cold-chain temperature lever §11, not a dispatchable hub speed) → it falls outside
    // the allowed set and is rejected as not-unlocked. A vehicleType outside the set → 422 VALIDATION_FAILED. Placed
    // AFTER the cap gate (so an over-cap dispatch still 409s) and BEFORE the tx (so a not-unlocked vehicle sources NO
    // product, creates NO courier/route/shift — same atomicity as the cap gate). REUSES the single `hub` read above
    // (no second owns-hub query). The DEFAULT vehicleType='foot' is ALWAYS allowed → a no-vehicle dispatch is
    // byte-identical to the pre-T5 path.
    // C12 — DD-COLD-POWERED: extend to include refrigerated_van (the van is dispatchable via vehicle_inventory ownership;
    // the hub-tier gate still gates bike/car; the van is ALWAYS in the expanded set since its ownership is the roster check,
    // not the hub-tier check — DIV-R1/OQ-RS2). A player without a hub still cannot use bike/car but CAN use van (the van
    // is cold-chain equipment, not a hub-speed vehicle — the hub-tier lever remains 9c-owned).
    // NOTE: foot is always allowed; the roster ownership check (C11 ownsVehicle) is the effective gate for van.
    const allowedVehicles = hub === null ? ['foot', 'refrigerated_van'] : ['foot', 'bike', 'car', 'refrigerated_van'];
    if (!allowedVehicles.includes(vehicleType)) {
      throw new ApiError('VALIDATION_FAILED', {
        message:
          `dispatch refused: vehicle "${vehicleType}" not unlocked (allowed: ${allowedVehicles.join(', ')}` +
          `${hub === null ? ' — a distribution_hub unlocks bike/car' : ''}).`,
      });
    }

    // ── C11 DD-ROSTER + DD-ROSTER-HUB-RECONCILE: ownership check (OR-semantics, 2026-06-23) ────────
    //
    // ownsVehicle returns true if EITHER the vehicle is in vehicle_inventory (cash-buy, C11) OR the
    // vehicle is hub-unlocked by the existing Phase-4 hub mechanism (bike/car when hub !== null).
    // The `hub` value from the OWNS-HUB READ above is passed in (DRY — no second hub query).
    // foot = default-allow (OQ-RS4) — the existing M1 dispatch is byte-identical (ownsVehicle('foot') always true).
    // Placed AFTER the hub-tier vehicle gate (9c path, untouched) + BEFORE decrementSourceAndDispatch.
    // Non-foot vehicles not in vehicle_inventory AND not hub-unlocked → 409 RESOURCE_STATE_CONFLICT.
    if (!await this.vehicleRoster.ownsVehicle(playerId, vehicleType, hub)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `dispatch refused: vehicle "${vehicleType}" not in your vehicle pool — purchase it first (POST /v1/operational/vehicles/purchase).`,
      });
    }

    // ── C11 DD-VEHICLE-STATS: capacity enforcement (ADDITIVE — OQ-VS2) ───────────────────────────────
    //
    // cargo_grams must not exceed vehicleCapacityGramsFor(vehicleType). The capacity is getter-sourced
    // (no inline scalar). A standard foot dispatch at 100g (the M1 default) is always under the 200g cap
    // → byte-identical.
    if (!this.vehicleRoster.enforceCapacity(vehicleType, cargoGrams)) {
      const capacity = distributionRouteLifecycleTunables.vehicleCapacityGramsFor(vehicleType);
      throw new ApiError('VALIDATION_FAILED', {
        message: `dispatch refused: cargo ${cargoGrams}g exceeds ${vehicleType} capacity (${capacity}g) — OQ-VS2.`,
      });
    }

    // ── C13 fix C10(b) — DD-EPHEMERAL: GUARDED cash surcharge at dispatch (moved AFTER all gates) ──────
    //
    // The surcharge debit is placed HERE — AFTER the roster-cap gate (409) and vehicle gate (422) —
    // so the player is NEVER charged if a guard throws. If the player is over-cap or the vehicle is
    // not unlocked, no surcharge is debited (no charge-without-dispatch).
    //
    // NOTE: ephemeral is NOT yet client-reachable via distribution.controller.ts (the body does not
    // accept ephemeralMode), so this risk was theoretical. Fixed here for correctness.
    // Zero-regression: ephemeralMode=false (the default) → this block is a complete no-op (byte-identical path).
    // Diegetic cash debit — NOT an IAP/premium charge (R4.1).
    if (ephemeralMode) {
      const { debited, surchargeCents } = await this.ephemeralPurge.surchargeAtDispatch(
        playerId,
        cargoGrams,
        sourceSubstance as SubstanceType,
      );
      if (!debited) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message:
            `ephemeral dispatch refused: insufficient cash for the ephemeral surcharge ` +
            `(${surchargeCents} cents required — adjust your wallet before dispatching an ephemeral route).`,
        });
      }
    }

    const startedAtTick = await this.repo.getCurrentTick(playerId);

    // ── System 9 C4: Layer-1 patrol_heat producer (ADDITIVE — dispatch return BYTE-IDENTICAL) ────
    //
    // Resolve the route's path_blocks → precincts → patrol load → patrol_heat = clamp01(heaviest).
    // OQ-7 (frozen default): heaviest-of-route-precincts = max(activeCount/capacity over all precincts
    // the route crosses). The two-block M1 route has path_blocks = [fromBlockId, toBlockId]; the
    // heaviest-of-2-precincts is the canonical multi-precinct policy (OQ-7 adjudication).
    //
    // NULL handling per plan frozen rule: if precinctForBlock returns null (unknown block — not in the
    // seeded geography), the load for that block is treated as 0 (skip it). If ALL blocks are unknown,
    // patrolHeat = 0.0 (no computed load — the shift is dispatched with heat 0.0, never above threshold).
    //
    // DETERMINISTIC: the ratio (activeCount / capacity) is a pure read — no Math.random (DIV-5/C4).
    // ADDITIVE: the `{courierId, routeId, shiftId}` return from decrementSourceAndDispatch is UNCHANGED.
    const routeBlockIds = [from.block_id, to.block_id];
    const precinctMap = await this.patrolDoctrine.precinctsForBlocks(routeBlockIds);
    let heaviest = 0;
    for (const [, precinctId] of precinctMap) {
      const load = await this.patrolDoctrine.getPatrolLoadRaw(playerId, precinctId);
      if (load === null) continue; // precinct queue not yet seeded → treat as 0 load
      const ratio = load.capacity > 0 ? load.activeCount / load.capacity : 0;
      if (ratio > heaviest) heaviest = ratio;
    }
    const patrolHeat = clamp01(heaviest);

    // ── System 9b C7+C8: A* path computation for auto-dispatch routes (ADDITIVE — dispatch return BYTE-IDENTICAL) ──
    //
    // P3-C C7 — savedRouteId SKIPS fresh A* entirely (OQ-P1 frozen-until-replan/patch): the saved
    // route's OWN path_blocks/SI are consumed as-is. The ONE mutation allowed before consuming it is the
    // light patch-check (design §7.2 "check patch léger au dispatch saved") — an EXPLICIT, WRITTEN,
    // VERSIONED event (never a silent recompute-on-read), run BEFORE the I7 claim guard so a route that
    // JUST collapsed from this patch correctly 409s below rather than dispatching stale.
    //
    // Computes the real A* path (path_blocks) before the tx — for the AD-HOC path only.
    // For adjacent blocks the A* returns [from, to] — byte-identical to the prior M1 stub.
    // For distant blocks (cross-district) the A* returns a multi-hop path.
    // C8: real debt snapshot loaded here (DD-DEBT-SSOT — player's corridor_debt rows).
    // Zero-regression: no rows → empty map → debt penalty 0.0 → path byte-identical to C7.
    // DETERMINISTIC: no Math.random, no Date.now (DIV-5).
    let pathResult: Awaited<ReturnType<RouteFinderService['computePath']>> = null;
    let computedPathBlocks: number[];
    if (savedRouteId !== undefined) {
      await this.routePatchSweep.maybePatchRoute(playerId, savedRouteId, startedAtTick);
      const frozen = await this.routeLifecycleRepo.readRoute(savedRouteId);
      if (!frozen) {
        throw new ApiError('RESOURCE_NOT_FOUND', { message: `Saved route ${savedRouteId} not found.` });
      }
      computedPathBlocks = Array.isArray(frozen.path_blocks) ? (frozen.path_blocks as number[]) : [from.block_id, to.block_id];
    } else {
      const debtSnapshot = await this.corridorDebt.fullDebtSnapshot(playerId);
      pathResult = await this.routeFinder.computePath(
        playerId,
        from.block_id,
        to.block_id,
        vehicleType,
        stance as RouteStance, // C6: caller-supplied stance (default 'balanced' — auto-dispatch / all existing callers)
        debtSnapshot,
      );
      // Fallback: if no path found (isolated blocks), use the M1 2-stop stub (never goes negative).
      computedPathBlocks = pathResult?.pathBlocks ?? [from.block_id, to.block_id];
    }

    // ── DD-DISPATCH-DEBT-SOFT: auto-dispatch is debt-SOFT (DD-DISPATCH-DEBT-SOFT, 2026-06-23) ────
    //
    // The ephemeral auto-dispatch hard gate (OQ-SV3 C9 adaptation, ex-lines 318-337) is REMOVED.
    // The corridor-debt already biases A* via the debtSnapshot (computePath above) — A* routes around
    // saturated corridors, yielding a longer/costlier path, but A LEAST-COST PATH ALWAYS EXISTS and
    // the dispatch ALWAYS proceeds (no 409 from ephemeral corridor debt).
    //
    // The hard dispatch-time 409 belongs ONLY to a saved route whose persisted state = 'severed'/
    // currently-rebuilding (the DD-SEVER state machine on saved routes, route.service.ts — UNCHANGED).
    // P3-C C7 WIRES this: dispatch() consuming a `savedRouteId` runs the I7 atomic guard below
    // (`DistributionRepository.dispatchOnSavedRoute`) — 409 REBUILD_REQUIRED (severed) / ROUTE_REBUILDING
    // (downtime). The ad-hoc path (no savedRouteId) remains debt-SOFT/UNCHANGED — no 409 from severed
    // state, since an ad-hoc dispatch never consumes a saved route at all (design §7.5's own "softening
    // honnête de K4": ad-hoc stays legal, auto-penalizing via debt+leg dents).
    //
    // Zero-regression: debtSnapshot + computedPathBlocks still used below (route INSERT additive).

    // ── P3-C C3 — Loop 5 Mycelial Ledger: dispatch-time transit-slowdown (design §5.3/D4) ────────────
    //
    // REUSES the `legState` read hoisted above (the C4 `LEG_RESTING` gate's own read) — no second query.
    // No leg row yet (a never-delivered pair) → debtLoad=0 → NOT stressed → multiplier 1.0,
    // byte-identical to every pre-C3 dispatch.
    const legStressed = isStressed(legState.debtLoad, coreLoopsTunables.mycelialStressThreshold);
    const mycelialFactor = transitStressMultiplier(legStressed, coreLoopsTunables.mycelialThroughputPenaltyAtStressPct);

    // ── P3-D C7 — Loop 7 Annealing Window: COMPOSE the annealing throughput reduction at the SAME
    // dispatch seam (design §10.1 verbatim: "origine OU destination du shift en settling → transit_ticks
    // × (1 / throughput_multiplier) ... même sémantique que le ×1/0.7 mycelial" — additive at the SAME
    // point of insertion, same freeze-at-dispatch discipline, NEVER a second point of modulation, ruling
    // #6 dispatch-only). Two pure reads (origin + destination; a non-settling building resolves `null`),
    // hoisted here (past the same 404/409 guards `legState` above already sits past) so an unsettled
    // dispatch stays byte-identical.
    //
    // ★ SURFACED JUDGMENT CALL (non-blocking): design §10.1 states the trigger disjunctively ("origine OU
    // destination") but is silent on BOTH endpoints settling AT ONCE with DIFFERENT stored multipliers —
    // this composes the MORE RESTRICTIVE (smaller) of the two `throughput_multiplier`s into the single
    // factor below, preserving "never speeds up transit, only slows" (`route_mycelial_transit_stress_
    // multiplier_chk` >= 1) either way. Flagged for reviewer attention, not silently resolved.
    const [originSettling, destSettling] = await Promise.all([
      this.annealingRepo.findActiveSettling(playerId, fromBuildingId),
      this.annealingRepo.findActiveSettling(playerId, toBuildingId),
    ]);
    let annealingThroughputMultiplier = 1.0;
    if (originSettling) annealingThroughputMultiplier = Math.min(annealingThroughputMultiplier, originSettling.throughput_multiplier);
    if (destSettling) annealingThroughputMultiplier = Math.min(annealingThroughputMultiplier, destSettling.throughput_multiplier);

    // The FROZEN, COMPOSED factor — mycelial ledger stress × annealing settling reduction. Neither
    // stressed nor settling → 1.0 × 1.0 = 1.0, byte-identical to every pre-P3-D dispatch. Persisted onto
    // the SAME `route.mycelial_transit_stress_multiplier` column (D1/decisions §0 — additive-only, ZERO
    // new column/migration): the column already means "the frozen transit slowdown factor", never
    // exclusively "the mycelial one" — P3-D extends its VALUE, not its shape.
    const mycelialTransitStressMultiplier = mycelialFactor * (1 / annealingThroughputMultiplier);

    let dispatched: { courierId: string; routeId: string; shiftId: string };
    if (savedRouteId !== undefined) {
      // P3-C C7 — the SAVED-ROUTE dispatch (design §7.5 dents): I7 atomic guard INSIDE the SAME tx as
      // the shift INSERT (TOCTOU-zero). RouteNotDispatchableError (thrown from inside the tx, see that
      // method's header) maps to the correct 409/404 here — the ONE translation point (repo stays
      // ApiError-free, the established convention every OTHER repository in this codebase follows).
      let savedResult: { courierId: string; shiftId: string } | null;
      try {
        savedResult = await this.repo.dispatchOnSavedRoute({
          playerId,
          routeId: savedRouteId,
          fromBuildingId,
          toBuildingId,
          cargoGrams,
          substanceType: sourceSubstance,
          startedAtTick,
          vehicleType,
          homeDispatchHubId: hub?.buildingId ?? null,
          patrolHeat,
          mycelialTransitStressMultiplier,
        });
      } catch (err) {
        if (err instanceof RouteNotDispatchableError) {
          if (err.reason === 'not_found') {
            throw new ApiError('RESOURCE_NOT_FOUND', { message: `Saved route ${savedRouteId} not found.` });
          }
          if (err.reason === 'severed') {
            throw new ApiError('REBUILD_REQUIRED', {
              message: `route ${savedRouteId} is severed — rebuild it before dispatching.`,
            });
          }
          throw new ApiError('ROUTE_REBUILDING', {
            message: `route ${savedRouteId} is currently rebuilding (downtime) — dispatch refused until it completes.`,
          });
        }
        throw err;
      }
      if (savedResult === null) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `Insufficient ${sourceSubstance} product at the source building to dispatch ${cargoGrams} g.`,
        });
      }
      dispatched = { courierId: savedResult.courierId, routeId: savedRouteId, shiftId: savedResult.shiftId };
    } else {
      const adhocResult = await this.repo.decrementSourceAndDispatch({
        playerId,
        fromBuildingId,
        toBuildingId,
        fromBlockId: from.block_id,
        toBlockId: to.block_id,
        cargoGrams,
        substanceType: sourceSubstance,
        startedAtTick,
        vehicleType, // the validated chosen vehicle (drives the COURIER_TRANSIT speed — T5).
        homeDispatchHubId: hub?.buildingId ?? null, // the owned hub building_id or null (T5).
        patrolHeat, // System 9 C4 — the computed heat (additive; written onto the shift in the same tx).
        computedPathBlocks, // System 9b C7 — the A* path (additive; replaces M1 2-stop stub in the route INSERT).
        // C10 — DD-EPHEMERAL: persist ephemeral_mode on the route (ADDITIVE — false = no-op, byte-identical).
        ...(ephemeralMode && { ephemeralMode: true }),
        ...(pathResult !== null && {
          stance: stance as 'fastest' | 'balanced' | 'evasive', // C6: threaded through from dispatch() param
          straight_line_distance: pathResult.straightLineDistance,
          sinuosity_index: pathResult.sinuosityIndex,
          river_crossings: pathResult.riverCrossings,
        }),
        // P3-C C3 — FROZEN at dispatch (design §5.3/D4, migration 0126). 1.0 (unstressed/no leg) is
        // byte-identical to the pre-C3 DB default, so this is unconditionally threaded through (unlike the
        // `pathResult !== null` guards above, there is no "not yet computed" case to guard against here).
        mycelialTransitStressMultiplier,
      });
      if (adhocResult === null) {
        // The guarded source decrement affected 0 rows → insufficient product (the stock would have gone negative).
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `Insufficient ${sourceSubstance} product at the source building to dispatch ${cargoGrams} g.`,
        });
      }
      dispatched = adhocResult;
    }

    this.logger.log(
      `dispatch: player=${playerId} ${fromBuildingId}→${toBuildingId} cargo=${cargoGrams}g ${sourceSubstance} ` +
        `vehicle=${vehicleType}${hub ? ` hub=${hub.buildingId}` : ''} ` +
        `→ courier=${dispatched.courierId} route=${dispatched.routeId} shift=${dispatched.shiftId} (in_transit @${startedAtTick})`,
    );

    // ── Drift C5: additive emit AFTER the shift INSERT commits (BYTE-IDENTICAL hot-path) ──────────
    // Emits CourierRotatedEvent onto the CityEventBus for the courier-cadence drift subscriber.
    // ADDITIVE: the dispatch return value `{ courierId, routeId, shiftId }` is UNCHANGED.
    // A refused dispatch (OVER_CAPACITY/insufficient product) never reaches here → no emit on failure.
    // The bus delivers synchronously (EventEmitter.emit) but listeners are fire-and-forget async.
    this.bus.emitCourierRotated({
      type: 'courier_rotated',
      playerId,
      courierId: dispatched.courierId,
      routeId: dispatched.routeId,
      courierShiftId: dispatched.shiftId,
      dispatchedAtTick: startedAtTick,
      gameMinute: startedAtTick,
    });

    // C8: accrue corridor debt for each traversed block after successful dispatch.
    // SSOT: the corridor_debt table is the ONLY accumulator (DD-DEBT-SSOT D3).
    // Does NOT write patrol_heat/suspicion_map (OQ-DB3).
    await this.corridorDebt.accrueOnDispatch(playerId, computedPathBlocks, startedAtTick);

    return dispatched;
  }

  /**
   * CHECK whether the player has a free roster slot for a new dispatch — `true` if the player's current in-transit
   * courier count is BELOW the effective concurrent cap (so a fresh dispatch would pass the roster-cap gate); `false` when
   * the cap is already reached (an attempted dispatch would 409 OVER_CAPACITY). PURE READ — no state change.
   *
   * REUSES the SAME two reads the dispatch hot path already makes (getOwnedOperationalHub + countInTransitShifts +
   * HubRosterService.effectiveCap) WITHOUT duplicating their implementation: they live in this module's own injected repo +
   * hubRoster service. Exposed as a SEPARATE named method (not inlined into dispatch) so the LOGISTICS binding's
   * buildSnapshot can surface `state.courier_available` WITHOUT calling dispatch (which mutates state) and without
   * exporting HubRosterService or DistributionRepository across the module boundary.
   *
   * Called by LogisticsBindingService.buildSnapshot (the LOGISTICS signal snapshot read — the binding reads THIS instead
   * of reconstructing the cap derivation from outside the module).
   */
  async isCourierSlotAvailable(playerId: string): Promise<boolean> {
    const hub = await this.repo.getOwnedOperationalHub(playerId);
    const cap = this.hubRoster.effectiveCap(hub?.hubTier ?? null);
    const inTransit = await this.repo.countInTransitShifts(playerId);
    return inTransit < cap;
  }
}

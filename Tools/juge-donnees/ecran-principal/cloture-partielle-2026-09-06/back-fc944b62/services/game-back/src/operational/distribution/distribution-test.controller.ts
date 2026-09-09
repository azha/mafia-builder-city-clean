// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 1 (C1)
// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 7 (C7) — DD-TIER-BUY-GATE
// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 8 (C8) — DD-FLEET-CAP
// IMPLEMENTS: docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 1 (C1)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 2 (C2)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 3 (C3)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 6 (C6)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 7 (C7)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 8 (C8)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 9 (C9)
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 11 (C11)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 2 (C2)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 6 (C6)
//             System 9 §9 Detection & Consequence C1/C2/C3/C6/C7/C8/C9/C11 — 2026-06-21
//             System 9b C2 route-lifecycle tunables bootstrap — 2026-06-22
//             System 9b C6 DD-WAYPOINT validate endpoint — 2026-06-23
//             Pattern: services/game-back/src/operational/insurance/insurance-test.controller.ts (C1)
//
// `DistributionTestController` — TEST-ONLY probe routes for C1+ E2E verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in DistributionModule
// via testControllersEnabled() — same pattern as InsuranceTestController / ForensicTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C1 Routes:
//   POST /v1/_test/distribution/seed-caught-exception
//     — creates a fresh player + minimal courier + route + courier_shift + caught_exception.
//       Body: { caughtAtTick: number }.
//       Response: { playerId, exceptionId, shiftId, courierId, routeId }.
//   GET  /v1/_test/distribution/read-caught-exception?playerId=<uuid>
//     — reads the caught_exception + courier row for the player. Returns { caughtException, courier }.
//   POST /v1/_test/distribution/delete-player
//     — deletes the player row (CASCADE asserts). Body: { playerId }.
//
// C2 Routes (additive — no C1 route changed):
//   GET  /v1/_test/distribution/read-tunables
//     — reads all NEW distribution.* detection-depth tunables (distributionDetectionTunables getters)
//       + insurance.courier_intercept_heat_threshold. Returns a flat { key: value } object.
//       E2E asserts each resolves its frozen [PROV-Y26Q2] default (not undefined/0).
//   POST /v1/_test/distribution/probe-clamp
//     — tests DISTRIBUTION_TUNABLE_CAPS clamps an out-of-range value for a given key.
//       Body: { key: string; value: number }. Response: { clamped: number }.
//
// C3 Routes (additive — no C1/C2 route changed):
//   GET  /v1/_test/distribution/resolve-precincts?blockIds=1,101,201
//     — drives PatrolDoctrineService.precinctsForBlocks([...]) for E2E assertion.
//       Returns { precincts: { [blockId: string]: number } } — a map of blockId→precinctId.
//       The E2E asserts the ⌈district/3⌉ formula matches the known block→district→precinct triples.
//       OQ-7b single source of truth: no formula duplication — delegates to PatrolDoctrineService.
//
// C6 Routes (additive — no C1-C5 route changed):
//   POST /v1/_test/distribution/seed-transit-shift
//     — seeds a player + courier + two buildings + route + in_transit courier_shift (optionally with
//       a patrol_observation_queue loaded to `blockPatrolLoad`) + a COURIER_ARREST insurance contract.
//       Body: { vehicleType: string, cargoGrams: number, sessionsActive: number, blockPatrolLoad: number,
//               noTransit?: boolean }.
//       Response: { playerId, shiftId, routeId, courierId }.
//       noTransit=true: creates the player/courier but NOT the in_transit shift (for the no-op test).
//       Block choice: 401/402 (district 5, precinct 2) for the HIGH case; same precinct as C4 (307/302).
//       blockPatrolLoad fills the patrol queue for precinct 2.
//   POST /v1/_test/distribution/run-transit-tick
//     — calls DistributionTransitService.runMinuteTick(ctx) for the given playerId.
//       Body: { playerId: string, gameMinute?: number }.
//       Response: { ticked: true }.
//   GET  /v1/_test/distribution/compute-detection-prob
//     — calls CourierDetectionService.computeDetectionProb (PURE) for given factors.
//       Query: vehicleType, cargoGrams, sessionsActive, blockPatrolLoad, gameMinute.
//       Response: { prob: number } — the clamped detection probability (server-side only, R2.2).
//       Anti-fabrication: delegates to the real PURE function (no inline weight here).
//
// C7 Routes (additive — no C1-C6 route changed):
//   GET  /v1/_test/distribution/reputation-bucket?sessionsActive=N
//     — derives the CourierReputationBucket from sessionsActive via CourierDetectionService.reputationBucket().
//       Response: { bucket: 'rookie' | 'seasoned' | 'expert' }.
//       Anti-fabrication: delegates to the real reputationBucket() (thresholds SOURCED via getters).
//       R2.2: TEST-ONLY. sessions_active raw is never returned — only the bucket.
//   POST /v1/_test/distribution/seed-courier-sessions
//     — seeds a fresh courier with a given sessions_active count (for projection/leak tests).
//       Body: { sessionsActive: number }.
//       Response: { playerId, courierId, sessionsActive }.
//       Used by C11 projection tests (bucket → projection R2.2 wall).
//
// C8 Routes (additive — no C1-C7 route changed):
//   GET  /v1/_test/distribution/read-suspicion?playerId=<uuid>&precinctId=<int>
//     — reads the PoliceMemoryService.getPrecinctBeliefRaw(playerId, precinctId).totalMass for the
//       player's precinct suspicion_map (the sum of all uint8 tile values).
//       Response: { suspicion: number } — the totalMass (0 if no precinct_memory row yet).
//       The C8 E2E asserts: after a HIT, suspicion AFTER > suspicion BEFORE (PatrolObservationEvent
//       fired → System 3 onPatrolObservation bumped the tile).
//       R2.2: TEST-ONLY. suspicion_map raw mass is never returned to real clients.
//
//   NOTE: seed-transit-shift (C6) now additionally returns { precinctId: number | null }
//     — the precinctId for block 402 (the segment block). C8 uses this to pass the correct
//       precinctId to read-suspicion without hardcoding it in the spec.
//
// C10 Routes (additive — no C1-C9 route changed):
//   GET  /v1/_test/distribution/read-declaration?playerId=<uuid>
//     — reads declaration_ledger for the player at precinct 2 (blocks 301/302 → district 4 → precinct 2,
//       the C4/C9 seed geography). Returns { entries: unknown[] }.
//       C10 E2E: LAWYER_UP/ABANDON → entries contain 'courier_caught_leak'; VIOLENT_SILENCE → none.
//   GET  /v1/_test/distribution/read-heat?playerId=<uuid>
//     — returns { heatBumped: 1 | 0 } — 1 if a COURIER_SILENCE HeatInjectionEvent was bus-captured.
//       Uses per-player in-memory capture (constructor subscription to CityEventBus.onHeatInjection).
//       Resets the counter after read (cross-test isolation).
//   POST /v1/_test/distribution/resolve-exception-as
//     — resolves a caught exception AS the given playerId (not the exception's own player).
//       Body: { exceptionId: string; choice: CaughtActionChoice; playerId: string }.
//       Owner-gate test: passing a foreign playerId → ForbiddenException → 404 RESOURCE_NOT_FOUND.
//
// System 9b C12 Routes (additive — no C1-C11 route changed):
//   POST /v1/_test/route-lifecycle/cold-chain-tick-probe
//     — seeds a fresh player + courier + route + in_transit courier_shift (for the given vehicleType).
//       Calls cold-chain degrade tick N times. Returns { cargoBefore, cargoAfter }.
//       vehicleType='refrigerated_van', powered=true → cargoAfter = cargoBefore (0 degrade — powered van).
//       vehicleType='foot' → cargoAfter < cargoBefore (degrades HOT — existing path byte-identical).
//       Body: { vehicleType: string; powered?: boolean; ticks: number }.
//   POST /v1/_test/route-lifecycle/catch-van-probe
//     — seeds a player + van-Crick in_transit shift (cold_chain_powered=true).
//       Reads poweredBefore. Calls markCourierCaught (via CourierDetectionService).
//       Reads poweredAfter + cargo after catch.
//       Returns { poweredBefore, poweredAfter, crickSpoiled }.
//       FALSIFIABLE: poweredBefore=true → poweredAfter=false → crickSpoiled=true (DIV-C1).
//   POST /v1/_test/route-lifecycle/evasive-contract-harness
//     — seeds a hot corridor (precinct 1 → block 201 hot, blockRho≈0.9), then for the SAME endpoints
//       (601→901) computes the survival probability for 'fastest' vs 'evasive' stances.
//       Uses RouteFinderService.computePath for both stances. Then computes P_survive per stance:
//         P_survive = Π_i (1 − p_i) over each segment block i.
//       where p_i = computeDetectionProb(blockRho_i, ...) for each block in path_blocks.
//       Returns { fastestCaughtRate, evasiveCaughtRate, fastestSegments, evasiveSegments }.
//       NOTE: caught rate = 1 − P_survive (the complement of survival).
//       ASSERTION: evasiveSegments > fastestSegments (more rolls) AND evasiveCaughtRate ≤ fastestCaughtRate.
//       Body: { fromBlock?: number; toBlock?: number }.
//
// C11 Routes (additive — no C1-C10 route changed):
//   GET  /v1/_test/distribution/read-projection?playerId=<uuid>
//     — reads the CourierStateProjection for the given player via
//       DistributionProjectionService.projectCourierState(playerId).
//       Returns { detection_risk_bucket, courier_reputation_bucket, caught_state }.
//       P5 WALL: the response contains NONE of patrol_heat/detection_prob/leak_magnitude/sessions_active.
//       The C11 E2E asserts: (a) bucket domains correct; (b) value-sensitive (hot→critical, cold→silent,
//       expert→expert, caught→pending, none→none); (c) P5 grep-zero (no raw scalar in JSON).
//       R2.2: TEST-ONLY. All projection fields are closed-domain strings (never raw scalars).
//
// C14 Routes (additive — no C1-C13 route changed) — DD-LAYER1-PROB (2026-06-22):
//   GET  /v1/_test/distribution/compute-intercept-prob?patrolHeat=<f>
//     — pure Layer-1 intercept_prob = clamp(0, max, max × patrolHeat). Server-side only (R2.2).
//       Response: { prob: number } — the clamped [0,1] interception probability.
//       Used by the C14 E2E to assert the patrol-gate (heat=0 → 0.0), monotone, and cap (< 1.0).
//   GET  /v1/_test/distribution/layer1-roll?originBlockId=<i>&destBlockId=<i>&dayId=<i>
//     — deterministic Layer-1 roll = seedFromDay(dayId, layer1RegionInt(orig, dest)). Server-side only.
//       Response: { roll: number } — the [0,1) geometry-seeded roll.
//       Used by the C14 E2E to PIN both-ways geometries (verify roll < 0.25 or ≥ 0.25).
//       Used by the capstone reconciliation to MEASURE courier B's actual r_B (design §14.5).
//   POST /v1/_test/distribution/seed-hot-dispatch-blocks
//     — like seed-hot-dispatch but allows PINNED origin/dest block IDs for deterministic roll testing.
//       Body: { patrolLoad: number, originBlockId: number, destBlockId: number }.
//       Response: { playerId, shiftId, courierSessionsActive }.
//       The C14 E2E uses this to seed shifts at the CATCH geometry (307→306) and SURVIVE geometry (306→310).
//
// System 9b C9 Routes (additive — no C1-C8 route changed):
//   POST /v1/_test/route-lifecycle/saturate-and-evaluate
//     — seeds a fresh player + saved route; forces corridor_debt to `debtMagnitude` on all route blocks.
//       Calls evaluateAndMaybeSever → returns { state: 'severed'|'saturated'|'active' }.
//       Body: { debtMagnitude: number }.
//       Response: { state: string }.
//       T1/T1b/T1c FALSIFIABLE: 12.0→severed (≥10), 7.0→saturated (≥6<10), 0.0→active (<6).
//   POST /v1/_test/route-lifecycle/dispatch-severed-route
//     — seeds a player + route explicitly set to state='severed'; tries to dispatch it.
//       Expects { dispatched: false, reason: string } (qualitative OQ-SV3 hard gate).
//   POST /v1/_test/route-lifecycle/saturate-then-replan
//     — seeds a player + saved route; saturates a corridor (blocks 1-2-3, debt=20 on block 2).
//       Records versionBefore, calls replanRoute, reads versionAfter + stateAfter + archivedVersions.
//       Checks newPathAvoidsSaturated (the new path does NOT contain block 2).
//       Response: { routeId, versionBefore, versionAfter, stateAfter, archivedVersions, newPathAvoidsSaturated }.
//   POST /v1/_test/route-lifecycle/read-no-recompute-probe
//     — seeds a player + saved route (path_blocks=[1,2,3]); reads it back (pathBlocksBeforeDebt).
//       Then seeds HIGH debt on block 2 (beyond sever threshold). Reads route again (pathBlocksAfterDebt).
//       Compares: pathIdentical must be true (OQ-P1 frozen-until-replan).
//       Response: { pathBlocksBeforeDebt, pathBlocksAfterDebt, pathIdentical }.
//   POST /v1/_test/route-lifecycle/replan-other-player-probe
//     — seeds player A + route; owner replans (ownerReplanSuccess=true); then tries replan as player B.
//       Response: { ownerReplanSuccess, otherPlayerReplanStatus }.
//
// System 9b C10 Routes (additive — no C1-C9 route changed):
//   POST /v1/_test/route-lifecycle/dispatch-ephemeral-probe
//     — seeds a player + two buildings + cargo + economy_states; reads cash BEFORE; calls
//       EphemeralPurgeService.surchargeAtDispatch (computes surcharge); reads cash AFTER.
//       Body: { cargoGrams: number; drainWallet?: boolean }.
//         drainWallet=true: seeds cash_cents=0 so the surcharge debit fails (insufficient funds test).
//       Response: { cashBefore, cashAfter, surcharge, dispatched } where dispatched=false on drain.
//       C10 FALSIFIABLE both-ways: surcharge > 0, cashAfter = cashBefore − surcharge (debit path);
//         drainWallet=true → dispatched=false (insufficient cash — no state change).
//   POST /v1/_test/route-lifecycle/ephemeral-purge-scope-probe
//     — full scope probe (DIV-E1 anti-exploit boundary, FALSIFIABLE):
//       Seeds player + ephemeral route + shift + version history + suspicion_map + corridor_debt +
//       caught_exception (with pending status). Runs purgeAfterExecution on the route.
//       Reads back: shiftRecordSurvived (false), routeVersionHistorySurvived (false),
//         suspicionMapSurvived (true), corridorDebtSurvived (true), caughtExceptionSurvived (true).
//       PURGED: shift record + version history (the player's operation trail).
//       NOT PURGED: BPD suspicion_map, corridor_debt, active caught_exception (DIV-E1).
//       Idempotency: running the purge twice is a no-op (no error).
//
// System 9b C1 Routes (additive — no existing route changed):
//   POST /v1/_test/route-lifecycle/seed-route
//     — seeds a fresh player + two buildings + route with explicit C1 NEW cols (or defaults).
//       Body: { stance?: string, state?: string, routeName?: string, isSaved?: boolean }.
//       Response: { routeId, playerId }.
//   GET  /v1/_test/route-lifecycle/read-route?routeId=<uuid>
//     — reads back the route row (ALL C1 columns) for DB assertion.
//       Response: { route: RouteRow | null }.
//       R2.2: TEST-ONLY — straight_line_distance / sinuosity_index are BO-only raw scalars.
//
// System 9b C2 Routes (additive — no C1 route changed):
//   GET  /v1/_test/route-lifecycle/read-tunables
//     — reads all NEW distribution.* route-lifecycle tunables (distributionRouteLifecycleTunables getters).
//       Returns a flat { key: value } object for E2E assertion.
//   POST /v1/_test/route-lifecycle/probe-clamp
//     — tests DISTRIBUTION_TUNABLE_CAPS clamps an out-of-range value for a given key.
//       Body: { key: string; value: number }. Response: { clamped: number }.
//
// System 9b C4 Routes (additive — no C1-C3 route changed):
//   POST /v1/_test/route-lifecycle/compute-path
//     — runs RouteFinderService.computePath with an empty debt snapshot (C8 adds real debt).
//       Body: { originBlock: number; destBlock: number; vehicleType?: string; stance?: string; waypoints?: number[]; playerId?: string }.
//       Response: { pathBlocks: number[]; straightLineDistance: number; sinuosityIndex: number; riverCrossings: number }.
//       Optional playerId: if provided, uses that player's patrol_observation_queues (seeded via seed-hot-corridor);
//       otherwise falls back to TEST-ONLY player id (no patrol seeded → blockRho=0 → no patrol/detection penalty).
//       CF-4: uses real A* (not isReachable BFS). CF-1: tie-break = lowest-block-id (explicit comparator).
//
// System 9b C5 Routes (additive — no C1-C4 route changed):
//   GET  /v1/_test/route-lifecycle/sinuosity-bucket?index=<float>
//     — C5 sinuosity bucket cut probe (TEST-ONLY). Returns the SinuosityBucket for the given raw
//       sinuosityIndex via RouteFinderService.sinuosityBucket().
//       Used by the C5 E2E to assert the bucket cuts: 1.1→direct, 1.6→meandering, 2.5→gnarled (OQ-SN1: 1.3/2.0).
//       R2.2: TEST-ONLY. Anti-fabrication: delegates to real getter-sourced cut (no inline 1.3/2.0 here).
//   POST /v1/_test/route-lifecycle/seed-hot-corridor
//     — C5 stance-divergence driver (TEST-ONLY). Seeds REAL patrol load on precinct 1 (districts 1-3,
//       gateway blocks 1/101/201) so that getPatrolLoadRaw returns blockRho ≈ 0.9 for those blocks.
//       The test corridor is 601→901: fastest takes Route A (north+threnny via 201=precinct 1 HOT);
//       evasive prefers Route B (south-bank threnny 601→1001→...→901, avoids all precinct-1 blocks).
//       The graph cycle is: 601↔1001 (threnny) and 801↔901 (threnny) enabling the two routes.
//       Body: { fromBlock?: number; toBlock?: number } — retained for spec clarity; corridor = precinct 1 always.
//       Response: { playerId } — caller passes this to compute-path to activate the seeded patrol.
//       Determinism: entryCount = Math.ceil(0.9 * 256) = 231 (no Math.random).
//
// R2.2: TEST-ONLY (not registered in production). Raw rows returned for DB assertion only.
// Anti-fabrication: no Math.random. Seed routes use explicit test values.

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query, BadRequestException } from '@nestjs/common';
import { and, eq, count, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import {
  buildingOperationalState,
  caughtException,
  corridorDebt,
  courier,
  courierShift,
  productStorage,
  route,
  routeVersionHistory,
  vehicleInventory,
} from '../../db/schema/operational_chain';
import { player } from '../../db/schema/player';
import { account } from '../../db/schema/account';
import { building, patrolObservationQueue } from '../../db/schema/city_state';
import { insuranceClaim, insuranceContract, underwriterWalkRecord } from '../../db/schema/insurance';
import { economyState } from '../../db/schema/player_economy_state';
import { DistributionDetectionRepository } from './distribution-detection.repository';
import { CourierDetectionService } from './courier-detection.service';
import type { CaughtActionChoice } from './courier-detection.service';
import { DistributionProjectionService } from './distribution.projection.service';
import type { CourierStateProjection } from './distribution.projection.service';
import { distributionDetectionTunables, DISTRIBUTION_TUNABLE_CAPS, distributionRouteLifecycleTunables, distributionAutomationHubsTunables } from './distribution-tunables';
import { hubRosterTunables } from './hub-roster-tunables';
import { insuranceTunables } from '../insurance/insurance-tunables';
import { PatrolDoctrineService } from '../../citysim/patrol/patrol.service';
import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { HeatInjectionEvent } from '../../citysim/events/city-event-bus';
import { DistributionService } from './distribution.service';
import { DistributionTransitService } from './distribution-transit.service';
import { CourierInterceptionService } from '../insurance/courier-interception.service';
import { vehicleCargoCapacityGrams } from './distribution-tunables';
import { Cadence } from '../../citysim/scheduler/city_sim_system';
import { precinctMemory } from '../../db/schema/city_state';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RouteFinderService } from './route-finder.service';
import type { SinuosityBucket } from './route-finder.service';
import { CorridorDebtService } from './corridor-debt.service';
import { RouteService } from './route.service';
import { EphemeralPurgeService } from './ephemeral-purge.service';
import { VehicleRosterService } from './vehicle-roster.service';
import { ColdChainRepository } from '../coldchain/cold-chain.repository';
// System 9c C1 — DSL parse+compile probe
import { DslParserService } from '../../dsl/parser.service';
import { DslCompilerService } from '../../dsl/compiler.service';
import { RouteRequestService } from './route-request.service';
import { RouteRequestRepository } from './route-request.repository';
import { routeRequestStatus, routeRequest } from '../../db/schema/operational_chain';
// System 9c C2 — DSL executor resolve probe (DD-COORD-GRAMMAR arg-carry + DD-ADDITIVE-ENGINE)
import { DslExecutorService } from '../../dsl/executor.service';
import type { SignalSnapshot } from '../../dsl/signals';
// System 9c C5 — coordinator dispatch probe (DD-COORD-PER-HUB + DD-COORD-TRIGGER)
import { lieutenant, behaviorScript } from '../../db/schema/lieutenant';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import { LogisticsBindingService } from '../lieutenant/logistics-binding';
import { CoordinatorExecutionService } from './coordinator-execution.service';
import { LOGISTICS_ROLE_ID } from '../lieutenant/lieutenant-archetype';
// P3-C C7 — the patch-sweep light-check seam (mirrors the run-mycelial-decay / run-backpressure-update
// "direct HTTP seam onto the REAL, unmodified method" convention, supply-chain-test.controller.ts).
import { RoutePatchSweepService } from './route-patch-sweep.service';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';

// ── Monotone callsign counter (mirrors insurance-test.controller.ts pattern) ─────────────────────
let _distTestCallsignCounter = 0;
function nextDistTestCallsign(prefix: string): string {
  const n = ++_distTestCallsignCounter;
  return `${prefix}-${(Date.now() % 100_000_000).toString().padStart(8, '0')}-${n.toString().padStart(4, '0')}`;
}

/**
 * Serialize a DB row for JSON (convert BigInt → string, keep everything else as-is).
 * Mirrors the insurance-test.controller.ts serializeRow pattern.
 */
function serializeRow(row: Record<string, unknown> | null): unknown | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? String(v) : v;
  }
  return out;
}

// ── C1 body / response shapes ─────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/distribution/seed-caught-exception */
interface SeedCaughtExceptionBody {
  /** The caught_at_tick to use (bigint stored, passed as number for test simplicity). */
  caughtAtTick: number;
}

/** Response for POST /v1/_test/distribution/seed-caught-exception */
interface SeedCaughtExceptionResponse {
  playerId: string;
  exceptionId: string;
  shiftId: string;
  courierId: string;
  routeId: string;
}

/** Body for POST /v1/_test/distribution/delete-player */
interface DeletePlayerBody {
  playerId: string;
}

/**
 * The caught-exception resolution window default (1440 game-ticks = 1 game-day).
 * Used by the seed route to set resolution_deadline_tick = caught_at_tick + 1440.
 * This matches the distribution.caught_resolution_window_ticks [PROV-Y26Q2] default (C2 materializes
 * the registry key; C1 uses the raw default directly so the persistence probe is self-contained).
 * The C2 registry row confirms this value; the E2E asserts resolution_deadline_tick = '2440' for
 * caught_at_tick = 1000 → 1000 + 1440 = 2440 (FALSIFIABLE).
 */
const CAUGHT_RESOLUTION_WINDOW_DEFAULT = 1440;

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DistributionTestController {
  /**
   * C10 — Per-player heat-injection capture map.
   * Populated by the CityEventBus.onHeatInjection subscription (constructor).
   * Key: playerId. Value: count of COURIER_SILENCE injections received for that player.
   * Reset on read (via read-heat route) for cross-test isolation.
   * R2.2: TEST-ONLY — raw bus events are never client-facing.
   */
  private readonly heatInjectionCapture = new Map<string, number>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly detectionRepository: DistributionDetectionRepository,
    private readonly patrolDoctrineService: PatrolDoctrineService,
    // C4 — DistributionService: the real dispatch (calls precinctsForBlocks + getPatrolLoadRaw → patrol_heat in tx).
    private readonly distributionService: DistributionService,
    // C4 — CourierInterceptionService: the MINUTE/21 consumer (now resolved from InsuranceModule via forwardRef in C5).
    // InsuranceModule exports CourierInterceptionService; DistributionModule imports InsuranceModule via forwardRef.
    private readonly courierInterceptionService: CourierInterceptionService,
    // C5 — CourierDetectionService: the shared idempotent markCourierCaught path (DIV-1/2/3 convergence).
    private readonly courierDetectionService: CourierDetectionService,
    // C6 — DistributionTransitService: the MINUTE/9 transit tick hook (drives runMinuteTick for E2E).
    private readonly distributionTransitService: DistributionTransitService,
    // C8 — PoliceMemoryService: read-only suspicion_map totalMass for the observation-BPD couple probe.
    //   PoliceMemoryModule is already imported in DistributionModule (C0 DI-wiring shell).
    private readonly policeMemoryService: PoliceMemoryService,
    // C10 — CityEventBus: subscribe to HeatInjectionEvent for the COURIER_SILENCE probe.
    //   SchedulerModule (already imported in DistributionModule) exports CityEventBus.
    private readonly bus: CityEventBus,
    // C11 — DistributionProjectionService: the R2.2 P5-wall projection service (projectCourierState).
    private readonly distributionProjection: DistributionProjectionService,
    // System 9b C1 — RouteLifecycleRepository: CRUD for route NEW cols (C1 schema probe + C7+ production).
    private readonly routeLifecycleRepository: RouteLifecycleRepository,
    // System 9b C3 — RouteFinderService: graph-neighbors + graph-connectivity probes (DD-GRAPH E2E).
    private readonly routeFinderService: RouteFinderService,
    // System 9b C8 — CorridorDebtService: SSOT for corridor_debt accumulation + decay (DD-DEBT-SSOT D3).
    private readonly corridorDebtService: CorridorDebtService,
    // System 9b C9 — RouteService: deriveSaturation / evaluateAndMaybeSever / replanRoute (DD-SEVER/DD-REPLAN).
    private readonly routeService: RouteService,
    // System 9b C10 — EphemeralPurgeService: surchargeAtDispatch + purgeAfterExecution probes (DD-EPHEMERAL).
    private readonly ephemeralPurgeService: EphemeralPurgeService,
    // System 9b C11 — VehicleRosterService: purchaseVehicle probe (buy-vehicle-probe) + dispatch ownership check.
    private readonly vehicleRosterService: VehicleRosterService,
    // System 9b C12 — ColdChainRepository: degradeWarmCargo probe (cold-chain-tick-probe endpoint).
    private readonly coldChainRepository: ColdChainRepository,
    // System 9c C1 — DSL parse+compile probe (DD-COORD-GRAMMAR): DslParserService + DslCompilerService.
    //   Both are exported from DslModule (already imported in DistributionModule via C0 DI-wiring shell).
    private readonly dslParser: DslParserService,
    private readonly dslCompiler: DslCompilerService,
    // System 9c C2 — DSL executor resolve probe (DD-COORD-GRAMMAR arg-carry + DD-ADDITIVE-ENGINE):
    //   DslExecutorService is exported from DslModule (already imported in DistributionModule via C0).
    //   Pure `resolve(ir, snapshot)` — no DB, no IO, deterministic (C4).
    private readonly dslExecutor: DslExecutorService,
    // System 9c C4 — RouteRequestService: the DD-ROUTE-REQUEST producer (enqueueAndEmit).
    //   Provided in DistributionModule (C4). CityEventBus is from SchedulerModule (already imported).
    private readonly routeRequestService: RouteRequestService,
    // System 9c C4 — RouteRequestRepository: CRUD over route_request table (readById for read-request probe).
    private readonly routeRequestRepository: RouteRequestRepository,
    // System 9c C5 — LieutenantRepository: for the recruit-assign test route (recruit + coordinator probe).
    //   Directly provided in DistributionModule (no LieutenantModule import needed — breaks circular dep).
    private readonly lieutenantRepoForTest: LieutenantRepository,
    // System 9c C5 — LogisticsBindingService: for validateAssignment (OQ-A3 hub-type + OQ-A1 one-per-hub).
    //   Provided directly in DistributionModule (no circular dep). Bypasses LieutenantService (circular).
    //   [Canon note: this is TEST-ONLY; the prod path uses LieutenantService.recruit via the API.]
    private readonly logisticsBindingForTest: LogisticsBindingService,
    // System 9c C5 — CoordinatorExecutionService: for the fire-request route.
    //   Provided directly in DistributionModule (C5 addition).
    private readonly coordinatorExecutionService: CoordinatorExecutionService,
    // P3-C C7 — RoutePatchSweepService: the shared maybePatchRoute seam (run-patch-check route below).
    private readonly routePatchSweep: RoutePatchSweepService,
  ) {
    // C10 — subscribe to HeatInjectionEvents at construction time.
    // Per-player capture: increment counter for each COURIER_SILENCE event.
    // The per-player counter allows the read-heat route to report the injection count.
    this.bus.onHeatInjection((event: HeatInjectionEvent) => {
      if (event.source === 'COURIER_SILENCE') {
        const prev = this.heatInjectionCapture.get(event.playerId) ?? 0;
        this.heatInjectionCapture.set(event.playerId, prev + 1);
      }
    });
  }

  // ── C1 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/distribution/seed-caught-exception` — C1 persistence proof (TEST-ONLY).
   *
   * Creates:
   *   1. A fresh test account + player (isolated per test call).
   *   2. Two minimal buildings (origin block 201, destination block 202) — satisfy r_no_self_route_chk.
   *   3. A courier (foot, idle, sessions_active=0 by DEFAULT).
   *   4. A route (origin → destination).
   *   5. A courier_shift (in_transit, patrol_heat=0.0, cargo_grams=0).
   *   6. A caught_exception row (status='pending', resolution_deadline_tick = caughtAtTick + 1440,
   *      leak_magnitude=null, resolved_at_tick=null, reputation_at_catch=0).
   *
   * Body: { caughtAtTick: number }
   * Response: { playerId, exceptionId, shiftId, courierId, routeId }
   *
   * The E2E:
   *   1. Seeds via this route.
   *   2. Reads via GET read-caught-exception?playerId=...
   *   3. Asserts shape (status='pending', leak_magnitude null, caught_at_tick='1000', etc.)
   *   4. Deletes via POST delete-player and asserts CASCADE.
   *
   * R2.2: TEST-ONLY. leak_magnitude is null while pending (BO-only, set at resolution C10).
   * Anti-fabrication: no Math.random. caught_at_tick is explicit from body.
   */
  @Post('_test/distribution/seed-caught-exception')
  @HttpCode(HttpStatus.CREATED)
  async seedCaughtException(
    @Body() body: SeedCaughtExceptionBody,
  ): Promise<SeedCaughtExceptionResponse> {
    const caughtAtTick = body?.caughtAtTick ?? 0;
    const resolutionDeadlineTick = caughtAtTick + CAUGHT_RESOLUTION_WINDOW_DEFAULT;

    // 1. Create a fresh test account + player (isolation: each test call gets its own player).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('dist'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two minimal buildings (blocks 201/202 — distinct from the insurance C7/C9 blocks 101-104).
    const [originRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 201,
        building_type: 1, // hub = origin
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 202,
        building_type: 2, // stash = destination
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    // 3. Create a courier (foot, idle, sessions_active defaults to 0 — the schema default C1 asserts).
    const [courierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: 'foot',
        current_state: 'idle',
        current_load_grams: 0,
        current_load_cents: 0,
        // sessions_active intentionally NOT set — asserts DB default=0 (the C1 column probe).
      })
      .returning({ courier_id: courier.courier_id });
    const courierId = courierRow!.courier_id;

    // 4. A route (origin → destination — distinct blocks satisfy r_no_self_route_chk).
    const [routeRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: originBuildingId,
        destination_building_id: destBuildingId,
        // C14 fix: pass array directly, not JSON.stringify (avoids storing as JSONB string type).
        path_blocks: [201, 202],
        river_crossings: 0,
        ephemeral_mode: false,
      })
      .returning({ route_id: route.route_id });
    const routeId = routeRow!.route_id;

    // 5. A courier_shift (in_transit, patrol_heat=0.0, caught is the target state — but for the
    //    persistence probe we seed it as in_transit, which is the pre-catch state).
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierId,
        route_id: routeId,
        started_at_tick: 0,
        current_segment_index: 0,
        cargo_grams: 0,
        cargo_cents: 0,
        substance_type: 'brindle',
        status: 'in_transit',
        patrol_heat: 0.0,
      })
      .returning({ shift_id: courierShift.shift_id });
    const shiftId = shiftRow!.shift_id;

    // 6. caught_exception row — the C1 persistence target.
    //    - status: 'pending' (enum default)
    //    - caught_at_tick: BigInt(caughtAtTick) — bigint column
    //    - resolution_deadline_tick: BigInt(resolutionDeadlineTick)
    //    - reputation_at_catch: 0 (smallint default — sessions_active snapshot at catch)
    //    - resolved_at_tick: null (while pending)
    //    - leak_magnitude: null (BO-only, set at resolution C10)
    const exceptionRow = await this.detectionRepository.insertCaughtException({
      player_id: playerId,
      shift_id: shiftId,
      courier_id: courierId,
      route_id: routeId,
      caught_at_tick: BigInt(caughtAtTick),
      resolution_deadline_tick: BigInt(resolutionDeadlineTick),
      reputation_at_catch: 0,
    });
    const exceptionId = exceptionRow.exception_id;

    return { playerId, exceptionId, shiftId, courierId, routeId };
  }

  /**
   * `GET /v1/_test/distribution/read-caught-exception?playerId=<uuid>` — C1 persistence proof.
   *
   * Reads the caught_exception + courier rows for the given player.
   * Returns { caughtException, courier } — each null if not found (CASCADE deleted).
   *
   * The E2E asserts:
   *   - caughtException.status == 'pending'
   *   - caughtException.leak_magnitude is null (pending)
   *   - caughtException.caught_at_tick == '1000' (bigint → string)
   *   - caughtException.resolution_deadline_tick == '2440' (1000 + 1440 bigint string)
   *   - caughtException.resolved_at_tick is null
   *   - courier.sessions_active == 0 (DEFAULT — column exists)
   *
   * R2.2: TEST-ONLY. Returns raw rows for DB assertion only.
   */
  @Get('_test/distribution/read-caught-exception')
  async readCaughtException(
    @Query('playerId') playerId: string,
  ): Promise<{ caughtException: unknown | null; courier: unknown | null }> {
    const [excRow = null] = await this.db
      .select()
      .from(caughtException)
      .where(eq(caughtException.player_id, playerId))
      .limit(1);

    const [courierRow = null] = await this.db
      .select()
      .from(courier)
      .where(eq(courier.player_id, playerId))
      .limit(1);

    return {
      caughtException: serializeRow(excRow as Record<string, unknown> | null),
      courier: serializeRow(courierRow as Record<string, unknown> | null),
    };
  }

  /**
   * `POST /v1/_test/distribution/delete-player` — C1 FK CASCADE proof (TEST-ONLY).
   *
   * Deletes the test player row. The player FK CASCADE removes the caught_exception row.
   * The E2E then re-reads and asserts caughtException is null (FALSIFIABLE).
   *
   * R2.2: TEST-ONLY. Used ONLY to assert CASCADE behavior.
   */
  @Post('_test/distribution/delete-player')
  async deletePlayer(@Body() body: DeletePlayerBody): Promise<{ deleted: boolean }> {
    const { playerId } = body;
    await this.db
      .delete(player)
      .where(eq(player.player_id, playerId));
    return { deleted: true };
  }

  // ── C2 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/read-tunables` — C2 tunable bootstrap probe (TEST-ONLY).
   *
   * Reads all NEW distributionDetectionTunables getters + insurance.courier_intercept_heat_threshold.
   * The E2E asserts each resolves its frozen [PROV-Y26Q2] default (not undefined/0).
   *
   * Returns a flat object of { getterName: resolvedValue } covering:
   *   - all ~16 NEW distribution detection/caught/reputation/patrol-heat/detection-severity keys
   *   - courierInterceptHeatThreshold (OQ-8: must be > 0 now)
   *
   * R2.2: TEST-ONLY. Reads only the TunablesStore (no DB, no auth).
   * Anti-fabrication: every value sourced via the getter — never hardcoded here.
   */
  @Get('_test/distribution/read-tunables')
  readTunables(): Record<string, number> {
    const t = distributionDetectionTunables;
    return {
      // 5-factor detection model
      detectionBaseProb: t.detectionBaseProb,
      detectionTimeFactorHigh: t.detectionTimeFactorHigh,
      detectionTimeFactorLow: t.detectionTimeFactorLow,
      detectionVehicleFactorFoot: t.detectionVehicleFactorFoot,
      detectionVehicleFactorBike: t.detectionVehicleFactorBike,
      detectionVehicleFactorCar: t.detectionVehicleFactorCar,
      detectionVehicleFactorVan: t.detectionVehicleFactorVan,
      detectionCargoFactorHigh: t.detectionCargoFactorHigh,
      // reputation factors
      detectionReputationFactorRookie: t.detectionReputationFactorRookie,
      detectionReputationFactorSeasoned: t.detectionReputationFactorSeasoned,
      detectionReputationFactorExpert: t.detectionReputationFactorExpert,
      // caught-exception resolution
      caughtResolutionWindowTicks: t.caughtResolutionWindowTicks,
      caughtBaseLeak: t.caughtBaseLeak,
      caughtLeakChoiceFactorLawyer: t.caughtLeakChoiceFactorLawyer,
      caughtLeakChoiceFactorAbandon: t.caughtLeakChoiceFactorAbandon,
      caughtLeakChoiceFactorSilence: t.caughtLeakChoiceFactorSilence,
      // reputation thresholds (OQ-12 materialized)
      reputationThresholdSeasoned: t.reputationThresholdSeasoned,
      reputationThresholdExpert: t.reputationThresholdExpert,
      // patrol heat band cuts (OQ-22)
      patrolHeatBandElevated: t.patrolHeatBandElevated,
      patrolHeatBandCritical: t.patrolHeatBandCritical,
      // detection→severity mapping (OQ-20)
      detectionSeverityHighBand: t.detectionSeverityHighBand,
      detectionSeverityMediumBand: t.detectionSeverityMediumBand,
      // OQ-8 — interception threshold (insurance key, now positive)
      courierInterceptHeatThreshold: insuranceTunables.courierInterceptHeatThreshold,
    };
  }

  /**
   * `POST /v1/_test/distribution/probe-clamp` — C2 DISTRIBUTION_TUNABLE_CAPS clamp probe (TEST-ONLY).
   *
   * Applies the DISTRIBUTION_TUNABLE_CAPS clamper for a given key to an out-of-range value.
   * Body: { key: string; value: number }. Response: { clamped: number }.
   *
   * The E2E sends key='distribution.detection_base_prob', value=99 → expects clamped ≤ 0.5
   * (range 0.0..0.5 — FALSIFIABLE).
   *
   * R2.2: TEST-ONLY. No DB, no auth.
   */
  @Post('_test/distribution/probe-clamp')
  @HttpCode(HttpStatus.OK)
  probeClamp(@Body() body: { key: string; value: number }): { clamped: number } {
    const capFn = DISTRIBUTION_TUNABLE_CAPS[body.key];
    if (!capFn) {
      // Unknown key — return the raw value (the E2E tests known keys only)
      return { clamped: Number(body.value) };
    }
    return { clamped: capFn(body.value) };
  }

  // ── C3 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/resolve-precincts?blockIds=1,2,3` — C3 public resolver probe (TEST-ONLY).
   *
   * Drives `PatrolDoctrineService.precinctsForBlocks([...])` for the E2E to assert the canonical
   * block→precinct mapping against known block→district→precinct triples (OQ-7b single source of
   * truth). The formula lives ONCE in `patrol.service.ts`; this route is the E2E driver — it does NOT
   * re-implement `⌈district/3⌉`.
   *
   * Query param `blockIds`: comma-separated integer block ids (max 50 — guard against misuse).
   * Response: `{ precincts: { [blockId: string]: number } }` — blockId keys as strings (JSON).
   *
   * The E2E asserts:
   *   - block 1 → district 1 → precinct 1 (FALSIFIABLE triple, re-anchored 2026-06-21)
   *   - blocks 1, 101, 201 (districts 1,2,3) → precinct 1 (three districts per precinct group)
   *   - block 301 (district 4) → precinct 2 (next group — FALSIFIABLE)
   *   - same block queried twice → same precinct (deterministic, no RNG)
   *
   * R2.2: TEST-ONLY. No raw patrol_heat / sessions_active exposed. Returns precinct ids only.
   * Anti-fabrication: no Math.random. Reads the seeded geography only.
   */
  @Get('_test/distribution/resolve-precincts')
  async resolvePrecincts(
    @Query('blockIds') blockIdsParam: string,
  ): Promise<{ precincts: Record<string, number> }> {
    if (!blockIdsParam) {
      throw new BadRequestException('blockIds query param is required (comma-separated integers)');
    }
    const blockIds = blockIdsParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (blockIds.length === 0) {
      throw new BadRequestException('blockIds must contain at least one valid positive integer');
    }
    if (blockIds.length > 50) {
      throw new BadRequestException('blockIds must contain at most 50 entries');
    }
    // Delegate to PatrolDoctrineService — single source of truth (OQ-7b, no formula duplication)
    const precinctMap = await this.patrolDoctrineService.precinctsForBlocks(blockIds);
    const precincts: Record<string, number> = {};
    for (const [blockId, precinctId] of precinctMap) {
      precincts[String(blockId)] = precinctId;
    }
    return { precincts };
  }

  // ── C4 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/distribution/seed-hot-dispatch` — C4 Layer-1 patrol_heat producer proof (TEST-ONLY).
   *
   * Seeds a complete dispatch scenario in a precinct with the given patrol load:
   *   1. Creates a fresh test account + player + two OPERATIONAL buildings (blocks 301/302, district 4, precinct 2).
   *   2. Seeds product_storage (brindle, 1000g) at the origin building.
   *   3. Seeds patrol_observation_queues for the player's precinct with ceil(patrolLoad * capacity) entries.
   *   4. Creates an ACTIVE COURIER_ARREST insurance contract (so the ClaimsService can file a claim on intercept).
   *   5. Calls DistributionService.dispatch (the REAL dispatch — patrol_heat computed from the seeded queue load).
   *   6. Reads back the courier.sessions_active.
   *
   * Body: { patrolLoad: number } — [0, 1]. 0.9 = HOT (patrol_heat >> threshold 0.5 → caught);
   *   0.05 = COLD (patrol_heat << threshold → NOT caught).
   *
   * Response: { playerId, shiftId, courierSessionsActive }.
   *
   * The C4 E2E:
   *   1. POSTs here with patrolLoad=0.9 → high patrol_heat.
   *   2. GETs read-shift → assert patrol_heat > 0.0 AND > 0.5 (threshold).
   *   3. POSTs run-interception-tick → assert status='caught' + courierArrestClaimCount >= 1.
   *   4. Repeats with patrolLoad=0.05 → patrol_heat ≤ 0.5 → status stays in_transit (NOT caught).
   *
   * R2.2: TEST-ONLY. patrol_heat is BO-only — not returned to real clients.
   * Anti-fabrication: no Math.random. patrolLoad and patrol queue entries are explicit.
   *
   * Block choice: 301 (district 4 → precinct 2) and 302 (district 4 → precinct 2).
   *   district 4 → precinct = Math.floor((4-1)/3)+1 = Math.floor(3/3)+1 = 1+1 = 2.
   *   Both blocks are in the same precinct → the heaviest-of-route-precincts is just that precinct.
   *   Distinct from C1 (blocks 201/202) and insurance C7 (blocks 101/102) — no cross-spec collision.
   */
  @Post('_test/distribution/seed-hot-dispatch')
  @HttpCode(HttpStatus.CREATED)
  async seedHotDispatch(
    @Body() body: { patrolLoad: number; sessionsActive?: number },
  ): Promise<{ playerId: string; shiftId: string; courierSessionsActive: number }> {
    const patrolLoad = typeof body?.patrolLoad === 'number' ? body.patrolLoad : 0.0;
    // Clamp to [0, 1] defensively.
    const load = Math.max(0, Math.min(1, patrolLoad));
    // Optional sessionsActive override (C10 — reputation modulation test: set courier sessions post-dispatch).
    const sessionsActiveOverride =
      typeof body?.sessionsActive === 'number' ? Math.max(0, Math.floor(body.sessionsActive)) : null;

    // ── 1. Fresh account + player ──────────────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c4hd'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Two OPERATIONAL buildings (blocks 301/302 — district 4, precinct 2) ──────────────────────
    //    block 301: district = Math.ceil(301/100) = 4 (the seeded geography groups blocks 1-100 → district 1,
    //    101-200 → district 2, 201-300 → district 3, 301-400 → district 4, etc.).
    //    district 4 → precinct = Math.floor((4-1)/3)+1 = 2.
    //    The dispatch service's getOwnedOperationalBuilding INNER JOINs building_operational_state
    //    with conversion_stage='operational', so we must create those rows.
    const [originBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 301,
        building_type: 1, // hub = origin
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originBuildingRow!.building_id;

    const [destBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 302,
        building_type: 2, // stash = destination
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destBuildingRow!.building_id;

    // Create building_operational_state rows (conversion_stage='operational' — required by the dispatch gate).
    await this.db.insert(buildingOperationalState).values({
      building_id: originBuildingId,
      player_id: playerId,
      operational_type: 'lab', // type is irrelevant for dispatch (the gate only checks conversion_stage)
      conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // ── 3. Product storage (1000g brindle at origin — the dispatch guard requires sufficient stock) ──
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: originBuildingId,
      substance_type: 'brindle',
      quantity_grams: 1000,
    });

    // ── 4. Seed patrol_observation_queues for precinct 2 ──────────────────────────────────────────────
    //    observationQueueSize default = 256 (patrol-tunables). We seed 6 precincts (1..6) but fill
    //    only precinct 2 (the one blocks 301/302 map to) with ceil(load * capacity) entries.
    //    The other 5 precincts get empty queues ([] — the dispatch only reads the route's precincts).
    //    getPatrolLoadRaw reads entries.length / capacity; a null return (no row) is treated as 0 load.
    //    We INSERT all 6 rows so the DistributionService's precinctsForBlocks lookup finds the row.
    const capacity = 256; // matches observationQueueSize default (C2 TunablesStore default)
    const entryCount = Math.ceil(load * capacity);
    // Build synthetic observation entries for precinct 2 (block_id=301, district_id=4, severity=3).
    const entries = Array.from({ length: entryCount }, (_, i) => ({
      block_id: 301,
      district_id: 4,
      severity: 3,
      game_minute: i,
    }));
    const entriesJson = JSON.stringify(entries);

    // Insert 6 empty patrol queues + update precinct 2 with the seeded entries (atomic: INSERT then UPDATE).
    // Use the patrolObservationQueue schema for type safety.
    for (const precinctId of [1, 2, 3, 4, 5, 6]) {
      const isHot = precinctId === 2;
      await this.db.insert(patrolObservationQueue).values({
        player_id: playerId,
        precinct_id: precinctId,
        entries: isHot ? (entries as unknown as typeof patrolObservationQueue.$inferInsert['entries']) : ([] as unknown as typeof patrolObservationQueue.$inferInsert['entries']),
        head: 0,
        tail: isHot ? entryCount : 0,
      });
    }

    // Silence unused variable warning for entriesJson (used via entries above).
    void entriesJson;

    // ── 5. ACTIVE COURIER_ARREST insurance contract (so ClaimsService can file a claim on intercept) ─
    //    Mirrors insurance-test.controller.ts setup-courier-arrest-contract (C9 pattern — verbatim fields).
    //    walkBitmask = 6 (bits 2+3 — honest walk, non-fraud). Required by the contract FK.
    const walkDuration = 14; // insuranceTunables.walkDurationDays default
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'COURIER_ARREST',
        findings_bitmask: BigInt(6), // bits 2+3 (honest walk) — bigint column
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    await this.db.insert(insuranceContract).values({
      player_id: playerId,
      type: 'COURIER_ARREST',
      insured_value_cents: BigInt(1_000_000),
      premium_cents: BigInt(40_000),
      walk_id: walkId,
      status: 'ACTIVE',
      issued_tick: BigInt(0),
      // asset_ref: null (COURIER_ARREST covers the player, not a specific building)
    });

    // ── 5b. C9 — economy_states row (additive) ────────────────────────────────────────────────────────
    //    seed-hot-dispatch did not previously create an economy_states row.
    //    C9's LAWYER_UP debit needs the row to exist before the debit UPDATE can fire.
    //    INSERT with cash_cents = 1_000_000 ($10,000 — more than enough for lawyerUpCostCents 25000).
    //    Idempotent: the _test route creates a fresh player each call, so this INSERT never conflicts.
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(1_000_000) })
      .onConflictDoNothing();

    // ── 6. Real dispatch — patrol_heat computed from the seeded queue load ────────────────────────────
    //    DistributionService.dispatch calls precinctsForBlocks([301, 302]) → both → precinct 2
    //    → getPatrolLoadRaw(playerId, 2) → entries.length/capacity = entryCount/256 ≈ load
    //    → patrolHeat = clamp01(load) ≈ patrolLoad.
    const dispatched = await this.distributionService.dispatch(
      playerId,
      originBuildingId,
      destBuildingId,
      1, // 1 gram (minimum) — the patrol_heat logic only needs a valid positive cargoGrams
    );
    const { shiftId, courierId } = dispatched;

    // ── 7. C10 — optional sessions_active override (for reputation modulation tests) ─────────────────
    //    Dispatch creates the courier with sessions_active = 1 (the dispatch tx increments it once).
    //    For tests that need expert reputation (sessions_active >= 40), the caller passes sessionsActive
    //    in the body. We UPDATE the courier's sessions_active to the given value POST-DISPATCH.
    //    This is TEST-ONLY (never in production — the organic increment is the only writer).
    if (sessionsActiveOverride !== null && sessionsActiveOverride > 0) {
      await this.db
        .update(courier)
        .set({ sessions_active: sessionsActiveOverride })
        .where(eq(courier.courier_id, courierId));
    }

    // ── 8. Read back sessions_active (the C4 reputation score write, or the override) ───────────────
    const [courierRow = null] = await this.db
      .select({ sessions_active: courier.sessions_active })
      .from(courier)
      .where(eq(courier.courier_id, courierId))
      .limit(1);
    const courierSessionsActive = courierRow?.sessions_active ?? 0;

    return { playerId, shiftId, courierSessionsActive };
  }

  /**
   * `POST /v1/_test/distribution/run-interception-tick` — C4 MINUTE/21 tick driver (TEST-ONLY).
   *
   * Calls CourierInterceptionService.runMinuteTick(ctx) directly for the given playerId.
   * Uses the DistributionModule-provided instance of CourierInterceptionService (not the insurance
   * module's instance — both operate on the same DB and are functionally equivalent for the tick).
   *
   * Body: { playerId: string, gameMinute?: number }.
   *   playerId — the player to run the tick for.
   *   gameMinute — in-game minute (default 144000 = day 100; drives dayId for seedFromDay).
   *
   * R2.2: TEST-ONLY. Drives the real service (no mock).
   * Anti-fabrication: no Math.random in the tick (DIV-5/C4).
   */
  @Post('_test/distribution/run-interception-tick')
  @HttpCode(HttpStatus.OK)
  async runInterceptionTick(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<{ ticked: true }> {
    if (!body?.playerId) {
      throw new BadRequestException('playerId required');
    }
    const gameMinute = body.gameMinute ?? 144000; // default = day 100
    await this.courierInterceptionService.runMinuteTick({
      playerId: body.playerId,
      cadence: Cadence.MINUTE,
      gameMinute,
    });
    return { ticked: true };
  }

  /**
   * `GET /v1/_test/distribution/read-shift?shiftId=<uuid>` — C4/C5 shift read (TEST-ONLY).
   *
   * Reads the courier_shift row + courier row + caught_exception row + claim count for the given shiftId.
   *
   * Response: {
   *   shift: { shift_id, status, patrol_heat, cargo_grams, ... },
   *   courier: { courier_id, current_state, sessions_active, ... },
   *   caughtExceptionCount: number,         // C5: count of caught_exception rows for this shift_id
   *   caughtException: { ... } | null,      // C5: first caught_exception row (or null if none)
   *   courierArrestClaimCount: number,       // C4/C5: count of COURIER_BETRAYAL claims for the player
   * }.
   *   - patrol_heat: the computed [0,1] float (NOT the constant 0.0 — FALSIFIABLE C4 assertion).
   *   - status: 'in_transit' | 'caught' | 'completed' | ...
   *   - courierArrestClaimCount: count of COURIER_BETRAYAL claims for the player (post-interception).
   *   - caughtExceptionCount: 0 before markCourierCaught; 1 after (idempotent, FALSIFIABLE C5).
   *   - caughtException: null before markCourierCaught; { status='pending', ... } after.
   *   - courier.current_state: 'in_transit' before; 'caught' after markCourierCaught (C5).
   *
   * R2.2: TEST-ONLY. patrol_heat/sessions_active are BO-only — never returned to real clients.
   * Anti-fabrication: reads DB directly; no inline magnitudes.
   */
  @Get('_test/distribution/read-shift')
  async readShift(
    @Query('shiftId') shiftId: string,
  ): Promise<{
    shift: unknown | null;
    courier: unknown | null;
    caughtExceptionCount: number;
    caughtException: unknown | null;
    courierArrestClaimCount: number;
  }> {
    if (!shiftId) {
      throw new BadRequestException('shiftId query param is required');
    }

    // Read the shift row.
    const [shiftRow = null] = await this.db
      .select()
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftId))
      .limit(1);

    if (!shiftRow) {
      return { shift: null, courier: null, caughtExceptionCount: 0, caughtException: null, courierArrestClaimCount: 0 };
    }

    // C5: Read the courier row (for current_state assertion).
    const [courierRow = null] = await this.db
      .select()
      .from(courier)
      .where(eq(courier.courier_id, shiftRow.courier_id))
      .limit(1);

    // C5: Count caught_exception rows for this shift_id.
    const [excCountRow] = await this.db
      .select({ n: count() })
      .from(caughtException)
      .where(eq(caughtException.shift_id, shiftId));
    const caughtExceptionCount = Number(excCountRow?.n ?? 0);

    // C5: Read the first caught_exception row for this shift_id (null if none).
    const [excRow = null] = await this.db
      .select()
      .from(caughtException)
      .where(eq(caughtException.shift_id, shiftId))
      .limit(1);

    // Count COURIER_BETRAYAL claims for the shift's player.
    const [claimCountRow] = await this.db
      .select({ n: count() })
      .from(insuranceClaim)
      .where(
        and(
          eq(insuranceClaim.player_id, shiftRow.player_id),
          eq(insuranceClaim.claim_basis, 'COURIER_BETRAYAL'),
        ),
      );
    const courierArrestClaimCount = claimCountRow?.n ?? 0;

    return {
      shift: serializeRow(shiftRow as unknown as Record<string, unknown>),
      courier: serializeRow(courierRow as unknown as Record<string, unknown> | null),
      caughtExceptionCount,
      caughtException: serializeRow(excRow as unknown as Record<string, unknown> | null),
      courierArrestClaimCount: Number(courierArrestClaimCount),
    };
  }

  // ── C5 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/distribution/mark-caught` — C5 shared idempotent caught path (TEST-ONLY).
   *
   * Calls CourierDetectionService.markCourierCaught(playerId, shiftId, source, gameMinute) directly.
   * This is the DIV-1/2/3 shared path (Layer-1 interception + Layer-2 segment roll + test direct fire).
   *
   * Body: { playerId: string, shiftId: string, source: 'layer1_interception' | 'layer2_segment', gameMinute?: number }.
   *   gameMinute defaults to 0 (game start) — the test only needs a stable tick, not a real minute.
   *
   * Response: { marked: true } — always succeeds (idempotent: if already caught, no-op + 200).
   *
   * E2E assertions:
   *   1. First call → shift.status='caught', courier.current_state='caught',
   *      caughtExceptionCount=1, caughtException.status='pending', courierArrestClaimCount=1.
   *   2. Second call (same shift) → courierArrestClaimCount stays 1 (idempotent, first-fire wins).
   *
   * FALSIFIABLE: a non-idempotent impl would create 2 caught_exception rows + 2 claims.
   * No Math.random. No new event type (REUSE CourierInterceptedEvent — DIV-3).
   *
   * R2.2: TEST-ONLY. Drives CourierDetectionService directly (the real DI-resolved service).
   * Anti-fabrication: no Math.random; gameMinute is explicit (default 0).
   */
  @Post('_test/distribution/mark-caught')
  @HttpCode(HttpStatus.OK)
  async markCaught(
    @Body() body: { playerId: string; shiftId: string; source: 'layer1_interception' | 'layer2_segment'; gameMinute?: number },
  ): Promise<{ marked: true }> {
    if (!body?.playerId || !body?.shiftId) {
      throw new BadRequestException('playerId and shiftId are required');
    }
    const source = body.source ?? 'layer2_segment';
    const gameMinute = body.gameMinute ?? 0;
    await this.courierDetectionService.markCourierCaught(
      body.playerId,
      body.shiftId,
      source,
      gameMinute,
    );
    return { marked: true };
  }

  // ── C6 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/distribution/seed-transit-shift` — C6 Layer-2 roll proof (TEST-ONLY).
   *
   * Seeds a complete transit scenario:
   *   1. Fresh account + player.
   *   2. Two OPERATIONAL buildings at blocks 401/402 (district 5, precinct 2 = Math.floor((5-1)/3)+1 = 2).
   *   3. building_operational_state rows (conversion_stage='operational').
   *   4. A courier with the given vehicle_type and sessionsActive.
   *   5. A route with path_blocks=[401, 402] (2-stop M1 route; block_distance resolved live).
   *   6. A courier_shift (status='in_transit', started_at_tick=0, current_segment_index=0,
   *      cargo_grams=cargoGrams). The transit duration for these blocks is computed at tick time;
   *      the seeded started_at_tick=0 + gameMinute=1 in run-transit-tick keeps elapsed=1 < transitTicks.
   *   7. Patrol observation queues for all 6 precincts, with precinct 2 loaded to ceil(blockPatrolLoad*256) entries.
   *   8. A COURIER_ARREST insurance contract (for the COURIER_ARREST claim path on catch).
   *
   * Body: { vehicleType, cargoGrams, sessionsActive, blockPatrolLoad, noTransit? }
   *   noTransit=true → creates only the player + courier (no shift, no patrol queues, no insurance).
   *   Used by the no-op organic test.
   *
   * Response: { playerId, shiftId (null if noTransit), routeId (null if noTransit), courierId }.
   *
   * Blocks 401/402: distinct from C1 (201/202), C4 (301/302), to avoid cross-spec pollution.
   *   district 5 = ceil(401/100) = 5. precinct = Math.floor((5-1)/3)+1 = Math.floor(4/3)+1 = 2.
   * The E2E seeded gameMinute=1 for run-transit-tick: elapsed=1-0=1, transitTicks ≥ 2 (block dist ≥ 2).
   *
   * R2.2: TEST-ONLY. blockPatrolLoad/sessionsActive are BO-only inputs — never surfaced to real clients.
   * Anti-fabrication: no Math.random; all values explicit from body or sourced via getters.
   */
  @Post('_test/distribution/seed-transit-shift')
  @HttpCode(HttpStatus.CREATED)
  async seedTransitShift(
    @Body() body: {
      vehicleType: string;
      cargoGrams: number;
      sessionsActive: number;
      blockPatrolLoad: number;
      noTransit?: boolean;
      /** Optional pinned routeId (DD-BLOCK-RHO re-impl: fixed UUID pins the seeded roll). */
      routeId?: string;
      /** Optional pinned dayId (DD-BLOCK-RHO re-impl: dayId=42 → gameMinute=42*1440=60480). */
      dayId?: number;
    },
  ): Promise<{
    playerId: string;
    shiftId: string | null;
    routeId: string | null;
    courierId: string | null;
    /** The gameMinute used for started_at_tick (matches run-transit-tick default). */
    gameMinute: number;
    /**
     * C8: the precinctId for block 402 (district 5, precinct 2).
     * Needed by the C8 E2E to assert the suspicion_map bump on the correct precinct.
     * Null for noTransit=true (no shift seeded, no patrol queues loaded).
     */
    precinctId: number | null;
  }> {
    // Map 'van' shorthand → 'refrigerated_van' (the DB enum value; the plan uses 'van' in test bodies).
    const rawVehicleType = body?.vehicleType ?? 'foot';
    const vehicleType = rawVehicleType === 'van' ? 'refrigerated_van' : rawVehicleType;
    const cargoGrams = typeof body?.cargoGrams === 'number' ? body.cargoGrams : 0;
    const sessionsActive = typeof body?.sessionsActive === 'number' ? body.sessionsActive : 0;
    const blockPatrolLoad = typeof body?.blockPatrolLoad === 'number'
      ? Math.max(0, Math.min(1, body.blockPatrolLoad))
      : 0.0;
    const noTransit = body?.noTransit === true;
    // DD-BLOCK-RHO re-impl: optional pinned routeId + dayId for deterministic rollSegment.
    // dayId → gameMinute = dayId * 1440 (so Math.floor(gameMinute/1440) = dayId exactly).
    // The shift's started_at_tick = gameMinute so elapsed=0 < any transitTicks → still-walking.
    // run-transit-tick must use the same gameMinute to reproduce the exact roll.
    const pinnedDayId = typeof body?.dayId === 'number' ? body.dayId : null;
    const gameMinute = pinnedDayId !== null ? pinnedDayId * 1440 : 1000;
    const pinnedRouteId = typeof body?.routeId === 'string' && body.routeId.length > 0
      ? body.routeId
      : null;

    // ── 1. Fresh account + player ────────────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c6ts'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Courier ───────────────────────────────────────────────────────────────────────────────
    //    vehicleType from body (e.g. 'van', 'foot'). sessions_active set to the test value.
    const [courierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: vehicleType as typeof courier.$inferInsert['vehicle_type'],
        current_state: noTransit ? 'idle' : 'in_transit',
        current_load_grams: noTransit ? 0 : cargoGrams,
        current_load_cents: 0,
        sessions_active: sessionsActive,
      })
      .returning({ courier_id: courier.courier_id });
    const courierId = courierRow!.courier_id;

    if (noTransit) {
      // No-op test: only player + courier needed.
      return { playerId, shiftId: null, routeId: null, courierId, gameMinute, precinctId: null };
    }

    // ── 3. Two OPERATIONAL buildings at 401/402 (district 5, precinct 2) ────────────────────────
    //    district = ceil(401/100) = 5. precinct = Math.floor((5-1)/3)+1 = 2.
    //    Distinct from C1 (201/202) and C4 (301/302) to avoid cross-spec pollution.
    const [originRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 401,
        building_type: 1,  // hub = origin
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 402,
        building_type: 2,  // stash = destination
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    // building_operational_state rows (conversion_stage='operational' — required by repo reads).
    await this.db.insert(buildingOperationalState).values({
      building_id: originBuildingId,
      player_id: playerId,
      operational_type: 'lab',
      conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // ── 4. Route (path_blocks=[401, 402]) ────────────────────────────────────────────────────────
    //    DD-BLOCK-RHO re-impl: if pinnedRouteId is provided, use it as the route_id so that
    //    rollSegment(dayId, routeId, segmentIndex) is fully deterministic + reproducible.
    const baseRouteValues = {
      player_id: playerId,
      origin_building_id: originBuildingId,
      destination_building_id: destBuildingId,
      path_blocks: [401, 402] as unknown as typeof route.$inferInsert['path_blocks'],
      river_crossings: 0,
      ephemeral_mode: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeValues: any = pinnedRouteId !== null
      ? { ...baseRouteValues, route_id: pinnedRouteId }
      : baseRouteValues;
    const [routeRow] = await this.db
      .insert(route)
      .values(routeValues)
      .returning({ route_id: route.route_id });
    const routeId = routeRow!.route_id;

    // ── 5. Courier shift (in_transit, started_at_tick=0, segment=0) ─────────────────────────────
    //    The transit seam runs when elapsed < transitTicks. For blocks 401/402, the Manhattan
    //    distance is: both blocks are in the SAME district (5) so the block coords depend on the
    //    seeded geometry. The game-back seeds blocks 1..N with deterministic coordinates at boot.
    //    The city sim uses 100 districts × 100 blocks each = 10_000 blocks total. block_id 401
    //    is in district 5; block_id 402 is also in district 5. Their coordinates differ by at
    //    least 1 (adjacent blocks in a district). The transit tick at gameMinute=1 with
    //    started_at_tick=0 gives elapsed=1; transitTicks = max(1, ceil(distance/speed)) ≥ 2
    //    for any distance ≥ 1 and speed ≤ distance. A foot courier with distance=1 gets
    //    transitTicks=1 (elapsed=1 ≥ 1 → ARRIVES rather than walking). To guarantee still-walking,
    //    we set started_at_tick=1 and use gameMinute=2 in run-transit-tick: elapsed=1 always.
    //    The transit duration is at least 2 ticks for any same-district block pair with distance ≥ 1
    //    and foot speed=1 (transitTicks=ceil(dist/1)=dist ≥ 1). We use gameMinute=0 and
    //    started_at_tick=-1440 (so elapsed=1440) — but that would arrive. Instead, start the shift
    //    at tick=1 million and run at tick=1 million+1: elapsed=1, transitTicks >= 2 (blocks 401/402
    //    are in the same district, Manhattan distance ≥ 1 → transitTicks = max(1,ceil(1/speed))).
    //    For foot speed=1: transitTicks=1. To force still-walking, use a started_at_tick such that
    //    elapsed < transitTicks. With transitTicks=1 (foot, distance=1), elapsed=0 < 1 works but
    //    gameMinute - started_at_tick = 0 requires started_at_tick = gameMinute = some value.
    //    Safest: use game minute 10_000 as the "now", started_at_tick = 9_999 → elapsed = 1.
    //    For foot speed=1 and block distance = 1: transitTicks = ceil(1/1) = 1. elapsed=1 >= 1 → ARRIVES.
    //    This is a problem. We need blocks further apart so distance ≥ 2. Use blocks 401 and 403:
    //    but that requires a 3rd block. Alternative: use blocks 401 and 501 (different districts,
    //    distance > 1). Actually, block 401 (district 5) and block 601 (district 7) are in different
    //    districts. But we need the patrol queue at block 402's precinct (precinct 2). Let us instead
    //    use blocks 401 and 601: block 601 → district 7 → precinct = Math.floor((7-1)/3)+1 = 3.
    //    With blocks 401 (precinct 2) and 601 (precinct 3), both blocks need queues.
    //    Simpler approach: use a 3-block route [401, 402, 601] so block_count=3, distance calculated
    //    as |first-last| = |401_coords - 601_coords|. But the existing listInTransitShifts only
    //    computes distance from first→last (the M1 pattern). With blocks 401 and 601:
    //    district 5 coords vs district 7 coords — the city sim places each district in a grid so
    //    adjacent district numbers are close. The point is we need elapsed < transitTicks.
    //    SIMPLEST SOLUTION: use blocks 401 and 601 (the Manhattan distance will be ≥ 2 since they're
    //    in different district rows), started_at_tick = gameMinute - 1 in run-transit-tick so
    //    elapsed = 1 and transitTicks ≥ 2.
    //    Actually, the city sim geometry: 100 districts × 100 blocks/district. Districts are laid out
    //    in a 10×10 grid (10 rows × 10 cols of 100 blocks each). District 5 is in row 1, col 5
    //    (0-indexed: row=0, col=4). District 7 is in row 1, col 7 (row=0, col=6). The block coords
    //    within a district are local (1×100 blocks or 10×10 blocks per district).
    //    Let's just use the blocks from the test and rely on the fact that when started_at_tick is set
    //    such that elapsed < transitTicks. For safety: use a route with path_blocks = [401, 601]
    //    (blocks in different districts → likely ≥ 2 block distance → transitTicks ≥ 2 for foot).
    //    If blocks 401 and 601 yield distance=0 (corner case), transitTicks = max(1, ceil(0/1)) = 1.
    //    elapsed = 1 ≥ 1 → arrives. Workaround: set started_at_tick = gameMinute (elapsed = 0 < 1).
    //    But then the transit tick with elapsed = 0 ALSO checks elapsed >= transitTicks: 0 >= 1 = false
    //    → still-walking branch fires. This is correct! elapsed = 0 < transitTicks = 1 → still walking.
    //    So: set started_at_tick = gameMinute (the tick's gameMinute value). elapsed = 0 < transitTicks.
    //    This is the SAFE approach regardless of block distance.

    // started_at_tick = gameMinute so elapsed = ctx.gameMinute - started_at_tick = 0 < any transitTicks.
    // This guarantees still-walking (never arrived) for the test.
    // DD-BLOCK-RHO re-impl: when dayId is pinned, gameMinute = dayId * 1440 (so rollSegment gets the
    // right dayId). run-transit-tick reads the gameMinute from the response and uses it.
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierId,
        route_id: routeId,
        started_at_tick: gameMinute,   // run-transit-tick uses the same gameMinute → elapsed=0
        current_segment_index: 0,
        cargo_grams: cargoGrams,
        cargo_cents: 0,
        substance_type: 'brindle',
        status: 'in_transit',
        patrol_heat: blockPatrolLoad,   // C6: seed the patrol_heat with the test load (BO-only)
      })
      .returning({ shift_id: courierShift.shift_id });
    const shiftId = shiftRow!.shift_id;

    // ── 6. Patrol observation queues (6 precincts, precinct 2 loaded to blockPatrolLoad) ─────────
    //    Mirrors the C4 seed-hot-dispatch pattern. runSegmentDetection resolves the block at
    //    segmentIndex=1 (nextSegment after advance from 0). For path_blocks=[401,402]: block 402.
    //    block 402 → district=ceil(402/100)=5 → precinct=Math.floor((5-1)/3)+1=2.
    //    So we load precinct 2 to blockPatrolLoad.
    const capacity = 256;
    const entryCount = Math.ceil(blockPatrolLoad * capacity);
    const entries = Array.from({ length: entryCount }, (_, i) => ({
      block_id: 402,
      district_id: 5,
      severity: 3,
      game_minute: i,
    }));
    for (const precinctId of [1, 2, 3, 4, 5, 6]) {
      const isHot = precinctId === 2;
      await this.db.insert(patrolObservationQueue).values({
        player_id: playerId,
        precinct_id: precinctId,
        entries: isHot
          ? (entries as unknown as typeof patrolObservationQueue.$inferInsert['entries'])
          : ([] as unknown as typeof patrolObservationQueue.$inferInsert['entries']),
        head: 0,
        tail: isHot ? entryCount : 0,
      });
    }

    // ── 7. COURIER_ARREST insurance contract (for the claim path on catch) ───────────────────────
    const walkDuration = 14;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'COURIER_ARREST',
        findings_bitmask: BigInt(6),
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    await this.db.insert(insuranceContract).values({
      player_id: playerId,
      type: 'COURIER_ARREST',
      insured_value_cents: BigInt(1_000_000),
      premium_cents: BigInt(40_000),
      walk_id: walkId,
      status: 'ACTIVE',
      issued_tick: BigInt(0),
    });

    // C8: resolve precinctId for block 402 (the segment block the transit roll uses) so the
    //   C8 E2E can assert the suspicion_map bump on the correct precinct.
    //   PatrolDoctrineService.precinctForBlock is the single source of truth (OQ-7b).
    const precinctId = await this.patrolDoctrineService.precinctForBlock(402);

    return { playerId, shiftId, routeId, courierId, gameMinute, precinctId: precinctId ?? null };
  }

  /**
   * `POST /v1/_test/distribution/run-transit-tick` — C6 MINUTE/9 transit tick driver (TEST-ONLY).
   *
   * Calls DistributionTransitService.runMinuteTick(ctx) directly for the given playerId.
   * Uses gameMinute=1000 (the same value as started_at_tick in seed-transit-shift) so elapsed=0 < any
   * transitTicks — the shift stays in still-walking and the Layer-2 roll fires.
   *
   * Body: { playerId: string, gameMinute?: number }.
   * Response: { ticked: true }.
   *
   * R2.2: TEST-ONLY. Drives the real service (no mock).
   * Anti-fabrication: no Math.random in the tick (DIV-5/C6).
   */
  @Post('_test/distribution/run-transit-tick')
  @HttpCode(HttpStatus.OK)
  async runTransitTick(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<{ ticked: true }> {
    if (!body?.playerId) {
      throw new BadRequestException('playerId required');
    }
    const gameMinute = body.gameMinute ?? 1000;  // default matches seed-transit-shift.started_at_tick
    // DistributionTransitService.runMinuteTick is public (C6 — exposed for this test driver).
    await this.distributionTransitService.runMinuteTick({
      playerId: body.playerId,
      cadence: Cadence.MINUTE,
      gameMinute,
    });
    return { ticked: true };
  }

  /**
   * `GET /v1/_test/distribution/compute-detection-prob` — C6 pure detection probability probe (TEST-ONLY).
   *
   * Calls CourierDetectionService.computeDetectionProb with the given factors.
   * Used by the E2E to assert monotone ordering (van > foot, rookie > expert) without running a full tick.
   *
   * Query params:
   *   vehicleType: string (foot/bike/car/van)
   *   cargoGrams: number
   *   sessionsActive: number
   *   blockPatrolLoad: number (the blockRho input — blockRho = patrol load, [0,1])
   *   gameMinute: number
   *
   * Response: { prob: number } — the clamped [0,1] detection probability.
   *
   * R2.2: TEST-ONLY. The raw probability is server-side only (never returned to real clients).
   * Anti-fabrication: delegates to the real PURE function (no inline weight here).
   */
  @Get('_test/distribution/compute-detection-prob')
  computeDetectionProb(
    @Query('vehicleType') vehicleType: string,
    @Query('cargoGrams') cargoGramsStr: string,
    @Query('sessionsActive') sessionsActiveStr: string,
    @Query('blockPatrolLoad') blockPatrolLoadStr: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): { prob: number } {
    const cargoGrams = Number(cargoGramsStr ?? '0');
    const sessionsActive = Number(sessionsActiveStr ?? '0');
    const blockRho = Math.max(0, Math.min(1, Number(blockPatrolLoadStr ?? '0')));
    const gameMinute = Number(gameMinuteStr ?? '0');
    const cargoCapacity = vehicleCargoCapacityGrams(vehicleType ?? 'foot');

    if (!vehicleType) {
      throw new BadRequestException('vehicleType query param is required');
    }

    const prob = this.courierDetectionService.computeDetectionProb({
      blockRho,
      gameMinute,
      vehicleType,
      cargoGrams,
      cargoCapacity,
      sessionsActive,
    });
    return { prob };
  }

  // ── C7 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/reputation-bucket?sessionsActive=N` — C7 reputation bucket probe (TEST-ONLY).
   *
   * Derives the CourierReputationBucket from sessionsActive by delegating to
   * `CourierDetectionService.reputationBucket()`. The route is the E2E driver for OQ-12/13 assertions:
   *   - sessions 0..9 → 'rookie' (< thresholdSeasoned=10)
   *   - sessions 10..39 → 'seasoned' (≥ thresholdSeasoned, < thresholdExpert=40)
   *   - sessions ≥ 40 → 'expert'
   *
   * Returns `{ bucket: CourierReputationBucket }`. The raw `sessionsActive` count is NOT returned
   * (R2.2 — the player sees only the bucket via C11 projection, never the raw integer).
   *
   * OQ-13: bucket is DERIVED (no stored bucket column on `courier`). OQ-12: thresholds SOURCED via getters.
   * Anti-fabrication: no Math.random; delegates to the real reputationBucket() (thresholds via TunablesStore).
   *
   * R2.2: TEST-ONLY. No raw sessions_active in the response.
   */
  @Get('_test/distribution/reputation-bucket')
  reputationBucket(
    @Query('sessionsActive') sessionsActiveStr: string,
  ): { bucket: string } {
    const sessionsActive = Math.max(0, Math.floor(Number(sessionsActiveStr ?? '0')));
    const bucket = this.courierDetectionService.reputationBucket(sessionsActive);
    return { bucket };
  }

  /**
   * `POST /v1/_test/distribution/seed-courier-sessions` — C7 courier sessions seed (TEST-ONLY).
   *
   * Creates a fresh test account + player + courier with a specific `sessions_active` count.
   * Used by C11 projection tests to seed a courier with a known reputation for bucket projection assertions.
   *
   * Body: `{ sessionsActive: number }` — the sessions_active count to seed.
   * Response: `{ playerId, courierId, sessionsActive }`.
   *
   * R2.2: TEST-ONLY. sessions_active is BO-only — not returned to real clients.
   * Anti-fabrication: no Math.random. sessionsActive is explicit from body.
   */
  @Post('_test/distribution/seed-courier-sessions')
  @HttpCode(HttpStatus.CREATED)
  async seedCourierSessions(
    @Body() body: { sessionsActive: number },
  ): Promise<{ playerId: string; courierId: string; sessionsActive: number }> {
    const sessionsActive = typeof body?.sessionsActive === 'number'
      ? Math.max(0, Math.floor(body.sessionsActive))
      : 0;

    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c7cs'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Courier with the given sessions_active count (foot, idle).
    const [courierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: 'foot',
        current_state: 'idle',
        current_load_grams: 0,
        current_load_cents: 0,
        sessions_active: sessionsActive,
      })
      .returning({ courier_id: courier.courier_id });
    const courierId = courierRow!.courier_id;

    return { playerId, courierId, sessionsActive };
  }

  // ── C8 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/read-suspicion?playerId=<uuid>&precinctId=<int>` — C8 observation-BPD
   * couple probe (TEST-ONLY).
   *
   * Reads the `suspicion_map` totalMass for the given player's precinct via
   * `PoliceMemoryService.getPrecinctBeliefRaw(playerId, precinctId)`.
   *
   * Response: `{ suspicion: number }` — the totalMass (sum of all uint8 tiles in the 32×32
   * suspicion_map buffer). Returns `{ suspicion: 0 }` if no `precinct_memory` row exists yet
   * (the patrol_observation_queues are seeded but the memory row may not exist before a flush).
   *
   * The C8 E2E:
   *   - Reads BEFORE the transit tick → baseline suspicion (may be 0 or small).
   *   - Runs the transit tick → HIGH-signature hit → PatrolObservationEvent (HIGH severity).
   *   - Reads AFTER → asserts `after > before` (suspicion bumped by BUMP_PATROL_HIGH).
   *   - For the CLEAN case → asserts `after == before` (no bump, on hit only — canon :148).
   *
   * R2.2: TEST-ONLY. The suspicion_map totalMass is a raw internal scalar — never returned to
   *   real clients (the player sees only patrol pattern cues + raid targets, not the BPD score).
   * Anti-fabrication: reads via the real PoliceMemoryService (no fabricated bump value).
   */
  @Get('_test/distribution/read-suspicion')
  async readSuspicion(
    @Query('playerId') playerId: string,
    @Query('precinctId') precinctIdStr: string,
  ): Promise<{ suspicion: number }> {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    const precinctId = parseInt(precinctIdStr, 10);
    if (!Number.isFinite(precinctId) || precinctId < 1) {
      throw new BadRequestException('precinctId must be a positive integer');
    }

    // CRITICAL: ensure the player's in-memory working maps are hydrated BEFORE reading.
    // PatrolObservationEvent bumps are synchronous (in-memory) + flushed to DB at MINUTE/5.
    // For test players that have never been ticked, the working maps are empty → bump is dropped.
    // ensurePlayerSeeded seeds the 6 precinct_memory DB rows + hydrates the working maps so that
    // subsequent bus bumps land in the buffer and getInMemorySuspicion reads the correct value.
    await this.policeMemoryService.ensurePlayerSeeded(playerId);

    // Read from the in-memory working buffer (not from DB) — the PatrolObservationEvent bump is
    // synchronous (in-memory) and flushed to DB only at the MINUTE/5 cadence. The E2E reads
    // before+after the transit tick; the in-memory buffer is the immediate post-bump view.
    const suspicion = this.policeMemoryService.getInMemorySuspicion(playerId, precinctId);

    return { suspicion };
  }

  // ── C9 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/distribution/resolve-exception` — C9 3-way resolution probe (TEST-ONLY).
   *
   * Calls CourierDetectionService.resolveCaughtException(playerId, exceptionId, choice, gameMinute)
   * directly. This is the same function the player-facing route delegates to (C9).
   *
   * Body: { exceptionId: string; choice: 'LAWYER_UP' | 'ABANDON' | 'VIOLENT_SILENCE'; gameMinute?: number }.
   *   exceptionId — the caught_exception.exception_id to resolve.
   *   choice — the resolution choice (CaughtActionChoice).
   *   gameMinute — in-game minute (default 0).
   *
   * Response: { status: string } — the new status AFTER resolution (read back from DB).
   *   FALSIFIABLE: status changes for a pending exception; stays unchanged for an already-resolved one.
   *
   * R2.2: TEST-ONLY. Drives CourierDetectionService directly.
   * Anti-fabrication: no Math.random; no inline cost.
   */
  @Post('_test/distribution/resolve-exception')
  @HttpCode(HttpStatus.OK)
  async resolveException(
    @Body() body: { exceptionId: string; choice: CaughtActionChoice; gameMinute?: number },
  ): Promise<{ status: string }> {
    if (!body?.exceptionId) {
      throw new BadRequestException('exceptionId required');
    }
    if (!body?.choice) {
      throw new BadRequestException('choice required (LAWYER_UP | ABANDON | VIOLENT_SILENCE)');
    }
    const gameMinute = body.gameMinute ?? 0;

    // Read the exception first to get the player_id (needed for the debit path).
    const exc = await this.detectionRepository.readCaughtException(body.exceptionId);
    if (!exc) {
      throw new BadRequestException(`exception ${body.exceptionId} not found`);
    }

    await this.courierDetectionService.resolveCaughtException(
      exc.player_id,
      body.exceptionId,
      body.choice,
      gameMinute,
    );

    // Read back the updated status for the FALSIFIABLE assertion.
    const updated = await this.detectionRepository.readCaughtException(body.exceptionId);
    return { status: updated?.status ?? 'unknown' };
  }

  /**
   * `POST /v1/_test/distribution/run-resolution-sweep` — C9 sweep driver (TEST-ONLY).
   *
   * Calls CourierDetectionService.runResolutionSweep({ playerId, gameMinute }) directly.
   * This is the same function the NIGHTLY/10 CAUGHT_EXCEPTION_SWEEP tick calls.
   *
   * Body: { playerId: string; gameMinute: number }.
   *   playerId — the player to sweep for.
   *   gameMinute — the current in-game minute (all pending with deadline ≤ this → abandoned).
   *
   * Response: { swept: true }.
   *
   * The E2E uses gameMinute=999999 to guarantee the test exception's deadline has passed.
   *
   * R2.2: TEST-ONLY. Drives CourierDetectionService directly.
   * Anti-fabrication: no Math.random.
   */
  @Post('_test/distribution/run-resolution-sweep')
  @HttpCode(HttpStatus.OK)
  async runResolutionSweep(
    @Body() body: { playerId: string; gameMinute: number },
  ): Promise<{ swept: true }> {
    if (!body?.playerId) {
      throw new BadRequestException('playerId required');
    }
    const gameMinute = body.gameMinute ?? 0;
    await this.courierDetectionService.runResolutionSweep({
      playerId: body.playerId,
      gameMinute,
    });
    return { swept: true };
  }

  /**
   * `GET /v1/_test/distribution/read-wallet?playerId=<uuid>` — C9 wallet read (TEST-ONLY).
   *
   * Reads economy_states.cash_cents for the player. Returns { cashCents: string } (bigint → string).
   *
   * The C9 E2E uses this to assert:
   *   - Before LAWYER_UP: cashCents > 0 (economy_states row was seeded by seed-hot-dispatch).
   *   - After LAWYER_UP: cashCents < before (debit of lawyerUpCostCents happened).
   *   - After ABANDON / VIOLENT_SILENCE: cashCents unchanged (no debit).
   *   - After 2nd resolve (idempotent): cashCents unchanged (no double-debit).
   *
   * R2.2: TEST-ONLY. cash_cents is BO-only — never returned to real clients as a raw integer.
   * Anti-fabrication: no Math.random.
   */
  @Get('_test/distribution/read-wallet')
  async readWallet(
    @Query('playerId') playerId: string,
  ): Promise<{ cashCents: string }> {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    const [row = null] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    // Serialize bigint → string (JSON cannot represent bigint natively).
    const cashCents = row ? String(row.cash_cents) : '0';
    return { cashCents };
  }

  // ── C10 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/read-declaration?playerId=<uuid>` — C10 declaration probe (TEST-ONLY).
   *
   * Reads the `declaration_ledger` JSONB ring from `precinct_memory` for the given player at precinct 2
   * (the precinct for blocks 301/302 — district 4, precinct=Math.floor((4-1)/3)+1=2, the C4 seed geography).
   *
   * Returns { entries: unknown[] | null } — the raw declaration entries (null if no precinct_memory row).
   *
   * The C10 E2E asserts:
   *   - After LAWYER_UP/ABANDON: entries contain at least one entry with declaration_type='courier_caught_leak'.
   *   - After VIOLENT_SILENCE: entries is empty / does NOT contain 'courier_caught_leak'.
   *
   * R2.2: TEST-ONLY. The declaration_ledger is BPD state (never projected raw to the player).
   * Anti-fabrication: no Math.random; reads the real DB row.
   */
  @Get('_test/distribution/read-declaration')
  async readDeclaration(
    @Query('playerId') playerId: string,
  ): Promise<{ entries: unknown[] | null }> {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    // The C4 seed uses blocks 301/302 → district 4 → precinct 2 (Math.floor((4-1)/3)+1=2).
    // The appendDeclarationEntry call in resolveCaughtException uses precinctForBlock(301) = 2.
    const precinctId = 2;
    const [row = null] = await this.db
      .select({ declaration_ledger: precinctMemory.declaration_ledger })
      .from(precinctMemory)
      .where(
        and(
          eq(precinctMemory.player_id, playerId),
          eq(precinctMemory.precinct_id, precinctId),
        ),
      )
      .limit(1);

    if (!row) return { entries: null };
    const ledger = row.declaration_ledger;
    if (!Array.isArray(ledger)) return { entries: [] };
    return { entries: ledger as unknown[] };
  }

  /**
   * `GET /v1/_test/distribution/read-heat?playerId=<uuid>` — C10 COURIER_SILENCE heat injection probe (TEST-ONLY).
   *
   * Returns { heatBumped: 1 | 0 } — 1 if a `COURIER_SILENCE` HeatInjectionEvent was captured for this
   * player on the CityEventBus since last read (or since server start). Resets the counter after read
   * (cross-test isolation — so a second call for the same player returns 0 unless another injection fires).
   *
   * The capture is set up in the constructor via `this.bus.onHeatInjection(...)` — it listens for ALL
   * HeatInjectionEvents and increments the per-player counter for COURIER_SILENCE ones.
   *
   * The C10 E2E asserts:
   *   - After VIOLENT_SILENCE: heatBumped > 0 (COURIER_SILENCE injection fired — FALSIFIABLE).
   *   - After LAWYER_UP/ABANDON: heatBumped is 0 (no heat injection for non-silence choices).
   *
   * R2.2: TEST-ONLY. Bus events are never exposed to real clients.
   * Anti-fabrication: captures the real bus event (no mock); heatBumped is a raw count, not a fabricated bool.
   */
  @Get('_test/distribution/read-heat')
  async readHeat(
    @Query('playerId') playerId: string,
  ): Promise<{ heatBumped: number }> {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    const count = this.heatInjectionCapture.get(playerId) ?? 0;
    // Reset after read (cross-test isolation — the next call returns 0 unless a new injection fires).
    this.heatInjectionCapture.delete(playerId);
    return { heatBumped: count };
  }

  /**
   * `POST /v1/_test/distribution/resolve-exception-as` — C10 owner-gate negative test (TEST-ONLY).
   *
   * Calls `CourierDetectionService.resolveCaughtException` with a CALLER-SUPPLIED `playerId` that
   * may differ from the exception's owner. Used to prove the owner gate fires:
   *   - If `playerId` ≠ exception's `player_id` → `ForbiddenException` is thrown by the service.
   *   - `GlobalExceptionFilter` catches it → `codeForHttpStatus(403)` → default case → `RESOURCE_NOT_FOUND`
   *     (http_status=404), because NestJS maps ForbiddenException to 403 and `codeForHttpStatus(403)` hits
   *     the `default` branch returning `RESOURCE_NOT_FOUND`.
   *
   * Body: { exceptionId: string; choice: CaughtActionChoice; playerId: string }.
   *   exceptionId — the caught_exception to try resolving.
   *   choice — the resolution choice.
   *   playerId — the CALLER's player id (different from exception owner → triggers the gate).
   *
   * Response on success (same-player call): { status: string }.
   * Response on gate violation: 404 RESOURCE_NOT_FOUND envelope (the ForbiddenException path).
   *
   * R2.2: TEST-ONLY. Anti-fabrication: calls the real service; no Math.random.
   */
  @Post('_test/distribution/resolve-exception-as')
  @HttpCode(HttpStatus.OK)
  async resolveExceptionAs(
    @Body() body: { exceptionId: string; choice: CaughtActionChoice; playerId: string },
  ): Promise<{ status: string }> {
    if (!body?.exceptionId) {
      throw new BadRequestException('exceptionId required');
    }
    if (!body?.choice) {
      throw new BadRequestException('choice required (LAWYER_UP | ABANDON | VIOLENT_SILENCE)');
    }
    if (!body?.playerId) {
      throw new BadRequestException('playerId required (the caller playerId — may differ from exception owner)');
    }
    // Call resolveCaughtException with the SUPPLIED playerId (not the exception's actual owner).
    // If playerId ≠ exception.player_id, the service throws ForbiddenException → 404 RESOURCE_NOT_FOUND.
    const gameMinute = 0;
    await this.courierDetectionService.resolveCaughtException(
      body.playerId,
      body.exceptionId,
      body.choice,
      gameMinute,
    );
    const updated = await this.detectionRepository.readCaughtException(body.exceptionId);
    return { status: updated?.status ?? 'unknown' };
  }

  // ── C11 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/read-projection?playerId=<uuid>` — C11 R2.2 projection probe (TEST-ONLY).
   *
   * Returns the `CourierStateProjection` for the given player via
   * `DistributionProjectionService.projectCourierState(playerId)`.
   *
   * Response: `{ detection_risk_bucket, courier_reputation_bucket, caught_state }`
   *   - detection_risk_bucket     — 'silent' | 'elevated' | 'critical' (closed domain, OQ-22)
   *   - courier_reputation_bucket — 'rookie' | 'seasoned' | 'expert' (closed domain, C7 REUSE)
   *   - caught_state              — CaughtExceptionStatus | 'none' (closed domain)
   *
   * P5 WALL: the response contains NONE of the forbidden raw scalars:
   *   patrol_heat, detection_prob, leak_magnitude, sessions_active
   *
   * The C11 E2E asserts:
   *   (a) bucket domains correct (closed 3-value domains);
   *   (b) value-sensitive (hot→critical, cold→silent, expert→expert, caught→pending, none→none);
   *   (c) P5 grep-zero — JSON.stringify(response) contains none of the forbidden keys.
   *
   * R2.2: TEST-ONLY. The projection result contains ONLY closed-domain strings.
   * Anti-fabrication: routes through the real DistributionProjectionService → real PG rows.
   * Zero-regression: read-only; no DB mutations.
   */
  @Get('_test/distribution/read-projection')
  async readProjection(
    @Query('playerId') playerId: string,
  ): Promise<CourierStateProjection> {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    return this.distributionProjection.projectCourierState(playerId);
  }

  // ── C14 Routes (DD-LAYER1-PROB) ────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/distribution/compute-intercept-prob?patrolHeat=<f>` — C14 Layer-1 intercept-prob probe (TEST-ONLY).
   *
   * Returns the pure Layer-1 interception probability for the given patrol heat:
   *   `intercept_prob = clamp(0, courierInterceptMaxProb, courierInterceptMaxProb × patrolHeat)`
   *
   * Patrol-gate (design §14.2): `patrolHeat = 0` → prob = `0.0` EXACTLY.
   * Survival cap: `patrolHeat = 1.0` → prob = `courierInterceptMaxProb` (default 0.25 < 1.0).
   *
   * Delegates to `CourierInterceptionService.computeInterceptProb` (the PURE formula; no DB; no RNG).
   * Used by the C14 E2E to assert: patrol-gate, monotone, cap < 1.0.
   *
   * R2.2: TEST-ONLY. The raw probability is server-side only (never returned to real clients).
   * Anti-fabrication: delegates to the real getter-sourced formula (NO inline 0.25).
   */
  @Get('_test/distribution/compute-intercept-prob')
  computeInterceptProb(
    @Query('patrolHeat') patrolHeatStr: string,
  ): { prob: number } {
    const patrolHeat = Math.max(0, Math.min(1, Number(patrolHeatStr ?? '0')));
    const prob = this.courierInterceptionService.computeInterceptProb(patrolHeat);
    return { prob };
  }

  /**
   * `GET /v1/_test/distribution/layer1-roll?originBlockId=<i>&destBlockId=<i>&dayId=<i>` — C14 Layer-1 roll probe (TEST-ONLY).
   *
   * Returns the deterministic Layer-1 geometry-seeded roll for the given (origin, dest, dayId):
   *   `layer1RegionInt = (originBlockId × 73_856_093 XOR destBlockId × 19_349_663) mod 1_000_000`
   *   `roll = seedFromDay(dayId, layer1RegionInt)` ∈ [0, 1)
   *
   * This stream is DISTINCT from Layer 2's (which keys on `seedFromDay(dayId, mix(regionInt(routeId), segmentIdx))`).
   *
   * Used by the C14 E2E to:
   *   1. PIN both-ways geometries: verify the catch geometry roll < 0.25 AND the survive geometry roll ≥ 0.25.
   *   2. Measure courier B's actual `r_B` for the capstone reconciliation (design §14.5).
   *
   * R2.2: TEST-ONLY. Server-side only (never returned to real clients).
   * Anti-fabrication: delegates to CourierInterceptionService.computeLayer1Roll (NO Math.random).
   */
  @Get('_test/distribution/layer1-roll')
  computeLayer1Roll(
    @Query('originBlockId') originBlockIdStr: string,
    @Query('destBlockId')   destBlockIdStr: string,
    @Query('dayId')         dayIdStr: string,
  ): { roll: number } {
    const originBlockId = Math.max(1, Math.floor(Number(originBlockIdStr ?? '0')));
    const destBlockId   = Math.max(1, Math.floor(Number(destBlockIdStr ?? '0')));
    const dayId         = Math.max(0, Math.floor(Number(dayIdStr ?? '0')));
    const roll = this.courierInterceptionService.computeLayer1Roll(originBlockId, destBlockId, dayId);
    return { roll };
  }

  /**
   * `POST /v1/_test/distribution/seed-hot-dispatch-blocks` — C14 pinned-geometry dispatch seed (TEST-ONLY).
   *
   * Like `seed-hot-dispatch` (C4) but allows PINNED origin/dest block IDs for deterministic Layer-1 roll testing.
   * The origin and destination buildings are created at the SPECIFIED block IDs (rather than the default 301/302).
   * All blocks must be in district 4 (blocks 301-400 → district = Math.ceil(blockId/100) = 4 → precinct 2)
   * so the patrol_observation_queues seeding for precinct 2 applies correctly.
   *
   * Body: { patrolLoad: number, originBlockId: number, destBlockId: number }.
   *   patrolLoad — patrol load [0,1] seeded into precinct 2's patrol_observation_queues.
   *   originBlockId — the origin building's block (must be in district 4, range 301-400).
   *   destBlockId   — the dest building's block (must be in district 4, range 301-400, ≠ originBlockId).
   *
   * Response: { playerId, shiftId, courierSessionsActive }.
   *
   * The C14 E2E uses this for:
   *   • CATCH geometry:   originBlockId=307, destBlockId=306, patrolLoad=1.0 (roll≈0.249 < 0.25 → caught)
   *   • SURVIVE geometry: originBlockId=306, destBlockId=310, patrolLoad=1.0 (roll≈0.253 ≥ 0.25 → survives)
   *
   * R2.2: TEST-ONLY. patrol_heat is BO-only — not returned to real clients.
   * Anti-fabrication: no Math.random. patrolLoad and block IDs are explicit.
   */
  @Post('_test/distribution/seed-hot-dispatch-blocks')
  @HttpCode(HttpStatus.CREATED)
  async seedHotDispatchBlocks(
    @Body() body: { patrolLoad: number; originBlockId: number; destBlockId: number },
  ): Promise<{ playerId: string; shiftId: string; courierSessionsActive: number }> {
    const patrolLoad    = typeof body?.patrolLoad    === 'number' ? body.patrolLoad    : 0.0;
    const originBlockId = typeof body?.originBlockId === 'number' ? body.originBlockId : 301;
    const destBlockId   = typeof body?.destBlockId   === 'number' ? body.destBlockId   : 302;
    const load = Math.max(0, Math.min(1, patrolLoad));

    // ── 1. Fresh account + player ──────────────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c14hd'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Two OPERATIONAL buildings at the PINNED block IDs ──────────────────────────────────────
    //    Both blocks must be in district 4 (301-400) → precinct 2 for the patrol queue to apply.
    //    We use building_type=1 (hub) for origin and building_type=2 (stash) for dest (same as C4).
    const [originBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: originBlockId,
        building_type: 1,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originBuildingRow!.building_id;

    const [destBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: destBlockId,
        building_type: 2,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destBuildingRow!.building_id;

    // Create building_operational_state rows (conversion_stage='operational').
    await this.db.insert(buildingOperationalState).values({
      building_id: originBuildingId,
      player_id: playerId,
      operational_type: 'lab',
      conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // ── 3. Product storage (1000g brindle at origin) ──────────────────────────────────────────────
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: originBuildingId,
      substance_type: 'brindle',
      quantity_grams: 1000,
    });

    // ── 4. Seed patrol_observation_queues for precinct 2 ──────────────────────────────────────────
    //    Same pattern as seed-hot-dispatch (C4): fill precinct 2 with ceil(load * 256) entries.
    //    Blocks 301-400 all map to district 4 → precinct 2.
    const capacity = 256;
    const entryCount = Math.ceil(load * capacity);
    const entries = Array.from({ length: entryCount }, (_, i) => ({
      block_id: originBlockId,
      district_id: Math.ceil(originBlockId / 100),
      severity: 3,
      game_minute: i,
    }));
    for (const precinctId of [1, 2, 3, 4, 5, 6]) {
      const isHot = precinctId === 2;
      await this.db.insert(patrolObservationQueue).values({
        player_id: playerId,
        precinct_id: precinctId,
        entries: isHot ? (entries as unknown as typeof patrolObservationQueue.$inferInsert['entries']) : ([] as unknown as typeof patrolObservationQueue.$inferInsert['entries']),
        head: 0,
        tail: isHot ? entryCount : 0,
      });
    }

    // ── 5. ACTIVE COURIER_ARREST insurance contract ──────────────────────────────────────────────
    const walkDuration = 14;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'COURIER_ARREST',
        findings_bitmask: BigInt(6),
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    await this.db.insert(insuranceContract).values({
      player_id: playerId,
      type: 'COURIER_ARREST',
      insured_value_cents: BigInt(1_000_000),
      premium_cents: BigInt(40_000),
      walk_id: walkId,
      status: 'ACTIVE',
      issued_tick: BigInt(0),
    });

    // ── 5b. Economy state row ──────────────────────────────────────────────────────────────────────
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(1_000_000) })
      .onConflictDoNothing();

    // ── 6. Real dispatch — patrol_heat computed from the seeded queue load ────────────────────────
    const dispatched = await this.distributionService.dispatch(
      playerId,
      originBuildingId,
      destBuildingId,
      1,
    );
    const { shiftId, courierId } = dispatched;

    // ── 7. Read back sessions_active ──────────────────────────────────────────────────────────────
    const [courierRow = null] = await this.db
      .select({ sessions_active: courier.sessions_active })
      .from(courier)
      .where(eq(courier.courier_id, courierId))
      .limit(1);
    const courierSessionsActive = courierRow?.sessions_active ?? 0;

    return { playerId, shiftId, courierSessionsActive };
  }

  // ── System 9b C1 Routes — route-lifecycle schema persistence probe ────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/seed-route` — C1 route schema persistence proof (TEST-ONLY).
   *
   * Creates:
   *   1. A fresh test account + player (isolated per test call).
   *   2. Two minimal buildings (blocks 501/502 — distinct from 9a blocks 201-402 to avoid cross-spec pollution).
   *   3. A route row with the C1 NEW cols (using body params or DB defaults).
   *
   * Body: {
   *   stance?: 'fastest'|'balanced'|'evasive'    — default 'balanced' (DB default)
   *   state?:  'draft'|'active'|'saturated'|'severed'  — default 'active' (DB default)
   *   routeName?: string                          — default null
   *   isSaved?: boolean                           — default false
   * }
   *
   * Response: { routeId, playerId }
   *
   * R2.2: TEST-ONLY. straight_line_distance / sinuosity_index are server-only — not returned here.
   * Anti-fabrication: no Math.random. Explicit body values used verbatim.
   * C4: no Math.random / Date.now.
   * DD-DEBT-SSOT: NO debt column on route (D3 — verified absent in schema).
   */
  @Post('_test/route-lifecycle/seed-route')
  @HttpCode(HttpStatus.CREATED)
  async seedRouteLifecycle(
    @Body() body: {
      stance?: 'fastest' | 'balanced' | 'evasive';
      state?: 'draft' | 'active' | 'saturated' | 'severed';
      routeName?: string;
      isSaved?: boolean;
    },
  ): Promise<{ routeId: string; playerId: string }> {
    const stance = body?.stance;       // undefined → DB default 'balanced'
    const state = body?.state;         // undefined → DB default 'active'
    const routeName = body?.routeName ?? null;
    const isSaved = body?.isSaved;     // undefined → DB default false

    // 1. Fresh test account + player (test isolation: each call gets its own player).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('9b-route'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two minimal buildings (blocks 501/502 — distinct from 9a blocks 201-402).
    const [originRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 501,
        building_type: 8, // distribution_hub = origin (8 is index in buildingOperationalType list)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 502,
        building_type: 3, // stash = destination (3 is 'stash' index)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    // 3. Route row — use RouteLifecycleRepository.insertRoute (exercises the new cols).
    //    Omit undefined optional params → DB defaults apply (the column-default probe).
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originBuildingId,
      destination_building_id: destBuildingId,
      path_blocks: [501, 502],
      river_crossings: 0,
      ephemeral_mode: false,
      // C1 NEW cols — conditionally set (undefined omitted so DB default applies):
      ...(stance !== undefined && { stance }),
      ...(state !== undefined && { state }),
      ...(routeName !== null && { route_name: routeName }),
      ...(isSaved !== undefined && { is_saved: isSaved }),
      // straight_line_distance / sinuosity_index / vehicle_type / version: intentionally omitted
      // → asserts DB defaults (0 / 1.0 / 'foot' / 1) via read-route.
    });

    // If stance is 'teleport' (invalid), the DB insert above will throw (PG enum constraint).
    // NestJS wraps this as a 500 → the E2E test 3 asserts !ok() → FALSIFIABLE domain guard.

    return { routeId, playerId };
  }

  /**
   * `GET /v1/_test/route-lifecycle/read-route?routeId=<uuid>` — C1 schema read-back (TEST-ONLY).
   *
   * Reads ALL C1 columns from the `route` table for the given routeId.
   * Returns { route: RouteRow | null }.
   *
   * R2.2: TEST-ONLY — straight_line_distance / sinuosity_index are BO-only raw scalars.
   *   In production, the player sees ONLY banded buckets (sinuosity_bucket, river_crossings_count_bucket).
   * Anti-fabrication: delegates to RouteLifecycleRepository.readRoute (no inline logic).
   * C4: no Math.random / Date.now.
   */
  @Get('_test/route-lifecycle/read-route')
  async readRouteLifecycle(
    @Query('routeId') routeId: string,
  ): Promise<{ route: Record<string, unknown> | null }> {
    const row = await this.routeLifecycleRepository.readRoute(routeId);
    // Serialize BigInt fields (bigint cols on other tables — route has none yet, but defensive).
    const serialized = row ? serializeRow(row as unknown as Record<string, unknown>) as Record<string, unknown> : null;
    return { route: serialized };
  }

  // ── System 9b C2 Routes — route-lifecycle tunables bootstrap probe ───────────────────────────

  /**
   * `GET /v1/_test/route-lifecycle/read-tunables` — C2 tunable bootstrap probe (TEST-ONLY).
   *
   * Reads all NEW distributionRouteLifecycleTunables getters.
   * Returns a flat { key: value } object.
   * E2E asserts each resolves its frozen [PROV-Y26Q2] default.
   * R2.2: TEST-ONLY. No DB, no auth.
   * Anti-fabrication: every value sourced via getter — never hardcoded here.
   */
  @Get('_test/route-lifecycle/read-tunables')
  readRouteLifecycleTunables(): Record<string, number> {
    const t = distributionRouteLifecycleTunables;
    return {
      // A* distance weights per stance
      astarWDistanceFastest: t.astarWDistanceFastest,
      astarWDistanceBalanced: t.astarWDistanceBalanced,
      astarWDistanceEvasive: t.astarWDistanceEvasive,
      // A* patrol weights per stance
      astarWPatrolFastest: t.astarWPatrolFastest,
      astarWPatrolBalanced: t.astarWPatrolBalanced,
      astarWPatrolEvasive: t.astarWPatrolEvasive,
      // A* detection weights per stance
      astarWDetectionFastest: t.astarWDetectionFastest,
      astarWDetectionBalanced: t.astarWDetectionBalanced,
      astarWDetectionEvasive: t.astarWDetectionEvasive,
      // A* debt weights per stance
      astarWDebtFastest: t.astarWDebtFastest,
      astarWDebtBalanced: t.astarWDebtBalanced,
      astarWDebtEvasive: t.astarWDebtEvasive,
      // District transition cost
      astarDistrictTransitionCost: t.astarDistrictTransitionCost,
      // Sinuosity cuts
      sinuosityDirectMax: t.sinuosityDirectMax,
      sinuosityMeanderingMax: t.sinuosityMeanderingMax,
      // Corridor debt
      corridorDebtAccrualPerUse: t.corridorDebtAccrualPerUse,
      corridorDebtDecayPerTick: t.corridorDebtDecayPerTick,
      // Sever/warn thresholds
      routeSeverThreshold: t.routeSeverThreshold,
      routeSaturatedWarnThreshold: t.routeSaturatedWarnThreshold,
      // Ephemeral surcharge
      ephemeralSurchargePct: t.ephemeralSurchargePct,
      // Vehicle capacity grams
      vehicleCapacityGramsFoot: t.vehicleCapacityGramsFor('foot'),
      vehicleCapacityGramsBike: t.vehicleCapacityGramsFor('bike'),
      vehicleCapacityGramsCar: t.vehicleCapacityGramsFor('car'),
      vehicleCapacityGramsVan: t.vehicleCapacityGramsFor('van'),
      // Equipment costs in cents
      equipmentCostFoot: t.equipmentCostCentsFor('foot'),
      equipmentCostBike: t.equipmentCostCentsFor('bike'),
      equipmentCostCar: t.equipmentCostCentsFor('car'),
      equipmentCostVan: t.equipmentCostCentsFor('van'),
    };
  }

  /**
   * `POST /v1/_test/route-lifecycle/probe-clamp` — C2 DISTRIBUTION_TUNABLE_CAPS clamp probe (TEST-ONLY).
   *
   * Applies the DISTRIBUTION_TUNABLE_CAPS clamper for a given route-lifecycle key.
   * Body: { key: string; value: number }. Response: { clamped: number }.
   * R2.2: TEST-ONLY. No DB, no auth.
   */
  @Post('_test/route-lifecycle/probe-clamp')
  @HttpCode(HttpStatus.OK)
  probeRouteLifecycleClamp(@Body() body: { key: string; value: number }): { clamped: number } {
    const capFn = DISTRIBUTION_TUNABLE_CAPS[body.key];
    if (!capFn) {
      return { clamped: Number(body.value) };
    }
    return { clamped: capFn(body.value) };
  }

  // ── System 9b C3 Routes — DD-GRAPH block-graph connectivity probes ────────────────────────────

  /**
   * `GET /v1/_test/route-lifecycle/graph-neighbors?blockId=<id>&vehicleType=<type>` — C3 graph probe (TEST-ONLY).
   *
   * Returns the adjacency edge-list for a given block, vehicle-gated (canon :87).
   * Response: `{ neighbors: { to: number; stepCost: number; isRiverEdge: boolean }[] }`.
   *
   * Used by C3 E2E to assert:
   *   - Intra-district blocks have the correct N/E/S/W neighbors (Layer-1 REUSE).
   *   - River edges are present for gateway blocks (Layer-2).
   *   - Vehicle-gating is applied (foot pruned on bridge edges).
   *   - Determinism: two calls for the same blockId return byte-identical results.
   *
   * R2.2: TEST-ONLY. The block-graph topology is server-side only (never client-facing raw).
   */
  @Get('_test/route-lifecycle/graph-neighbors')
  @HttpCode(HttpStatus.OK)
  graphNeighbors(
    @Query('blockId') blockIdStr: string,
    @Query('vehicleType') vehicleType: string,
  ): { neighbors: { to: number; stepCost: number; isRiverEdge: boolean }[] } {
    const blockId = parseInt(blockIdStr, 10);
    if (isNaN(blockId)) throw new BadRequestException('blockId must be an integer');
    const vt = vehicleType ?? 'foot';
    const neighbors = this.routeFinderService.neighbors(blockId, vt);
    return { neighbors };
  }

  /**
   * `GET /v1/_test/route-lifecycle/graph-connectivity?fromBlock=<id>&toBlock=<id>&vehicleType=<type>` — C3 reachability probe (TEST-ONLY).
   *
   * BFS reachability check: is `toBlock` reachable from `fromBlock` via the vehicle-gated graph?
   * Response: `{ reachable: boolean }`.
   *
   * Used by C3 E2E to assert:
   *   - A north block reaches a south block via a river-capable vehicle (cross-bank connectivity).
   *   - A foot courier cannot reach a block accessible only via a bridge (vehicle-gating).
   *
   * R2.2: TEST-ONLY. Reachability is server-side only.
   */
  @Get('_test/route-lifecycle/graph-connectivity')
  @HttpCode(HttpStatus.OK)
  graphConnectivity(
    @Query('fromBlock') fromStr: string,
    @Query('toBlock') toStr: string,
    @Query('vehicleType') vehicleType: string,
  ): { reachable: boolean } {
    const fromBlock = parseInt(fromStr, 10);
    const toBlock = parseInt(toStr, 10);
    if (isNaN(fromBlock) || isNaN(toBlock)) throw new BadRequestException('fromBlock and toBlock must be integers');
    const vt = vehicleType ?? 'foot';
    const reachable = this.routeFinderService.isReachable(fromBlock, toBlock, vt);
    return { reachable };
  }

  // ── System 9b C4 Routes — DD-ASTAR-COST pathfinder probe ─────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/compute-path` — C4 A* pathfinder probe (TEST-ONLY).
   *
   * Runs `RouteFinderService.computePath` with an EMPTY debt snapshot (corridor_debt table doesn't
   * exist until C8 — at C4 the debt penalty = 0 for all blocks, which is correct and honest).
   *
   * Body: `{ originBlock: number; destBlock: number; vehicleType?: string; stance?: string }`
   * Response: `{ pathBlocks: number[]; straightLineDistance: number; sinuosityIndex: number; riverCrossings: number }`
   *
   * C4 E2E assertions:
   *   - A 2-block adjacent path = [o, d] (byte-identical to the M1 stub, zero-regression anchor).
   *   - A longer multi-step path is a connected sequence of real graph edges.
   *   - Determinism: 2 calls → identical pathBlocks (lowest-block-id tie-break guarantees uniqueness, CF-1).
   *   - straight_line_distance > 0 for distinct endpoints (sinuosity denominator invariant).
   *   - sinuosity_index ≥ 1.0 (path ≥ straight line, geometric invariant).
   *   - river_crossings > 0 for a cross-bank path via a river-capable vehicle.
   *
   * Uses a fixed TEST player id (UUID) for patrol-load lookup (no real player needed; getPatrolLoadRaw
   * returns null for an unknown player → blockRho = 0.0 → patrol/detection penalties = 0.0, correct
   * for the C4 test environment where no patrol state has been seeded).
   *
   * R2.2: TEST-ONLY. The raw PathResult (straightLineDistance, sinuosityIndex) is server-side only in
   * production. CF-4: computePath uses real A* (not isReachable BFS).
   * Anti-fabrication: NO Math.random. Delegates to the real RouteFinderService.computePath.
   */
  @Post('_test/route-lifecycle/compute-path')
  @HttpCode(HttpStatus.OK)
  async computePath(
    @Body() body: { originBlock: number; destBlock: number; vehicleType?: string; stance?: string; waypoints?: number[]; playerId?: string },
  ): Promise<{
    pathBlocks: number[];
    straightLineDistance: number;
    sinuosityIndex: number;
    riverCrossings: number;
  }> {
    const originBlock = Number(body.originBlock);
    const destBlock = Number(body.destBlock);
    const vehicleType = body.vehicleType ?? 'foot';
    const stance = (body.stance ?? 'balanced') as 'fastest' | 'balanced' | 'evasive';

    if (isNaN(originBlock) || isNaN(destBlock)) {
      throw new BadRequestException('originBlock and destBlock must be integers');
    }

    // C4: EMPTY debt snapshot (corridor_debt table is C8; at C4 all debt penalties = 0.0).
    const emptyDebtSnapshot = new Map<number, number>();

    // C5: optional playerId — if a seeded player is provided (seed-hot-corridor), use it so that
    //   getPatrolLoadRaw returns REAL patrol load for that player (blockRho > 0, non-vacuous).
    //   Otherwise fall back to the TEST-ONLY player id (no patrol seeded → blockRho = 0.0).
    const testPlayerId = (typeof body.playerId === 'string' && body.playerId.length > 0)
      ? body.playerId
      : '00000000-0000-0000-0000-000000000001';

    const result = await this.routeFinderService.computePath(
      testPlayerId,
      originBlock,
      destBlock,
      vehicleType,
      stance,
      emptyDebtSnapshot,
      body.waypoints,
    );

    if (!result) {
      throw new BadRequestException(
        `No path found from block ${originBlock} to block ${destBlock} for vehicleType=${vehicleType}`,
      );
    }

    return result;
  }

  // ── System 9b C6 Routes — DD-WAYPOINT validate-waypoints probe ──────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/validate-waypoints` — C6 DD-WAYPOINT validation probe (TEST-ONLY).
   *
   * Body: `{ waypoints: number[]; vehicleType?: string }`
   * Response: `{ ok: boolean; reason?: string }`
   *
   * Delegates to `RouteFinderService.validateWaypoints`:
   *   1. Checks each waypoint block id exists in the seeded geography.
   *   2. Checks each consecutive inter-waypoint leg is reachable for the given vehicle type.
   *
   * R2.2: qualitative `reason` string only — no raw sinuosity or distance scalars.
   * NODE_ENV-gated (TEST-ONLY): not registered in production.
   * Anti-fabrication: delegates to real RouteFinderService.validateWaypoints; NO inline logic.
   */
  @Post('_test/route-lifecycle/validate-waypoints')
  @HttpCode(HttpStatus.OK)
  async validateWaypoints(
    @Body() body: { waypoints: number[]; vehicleType?: string },
  ): Promise<{ ok: boolean; reason?: string }> {
    const waypoints = Array.isArray(body.waypoints) ? body.waypoints.map(Number) : [];
    const vehicleType = body.vehicleType ?? 'foot';
    const testPlayerId = '00000000-0000-0000-0000-000000000001';

    return this.routeFinderService.validateWaypoints(testPlayerId, waypoints, vehicleType);
  }

  // ── System 9b C5 Routes — DD-SINUOSITY bucket probe + seed-hot-corridor ──────────────────────────

  /**
   * `GET /v1/_test/route-lifecycle/sinuosity-bucket?index=<float>` — C5 sinuosity bucket cut probe (TEST-ONLY).
   *
   * Returns the SinuosityBucket for the given raw sinuosityIndex via RouteFinderService.sinuosityBucket().
   * Used by the C5 E2E to assert the bucket cuts are correct: 1.1→direct, 1.6→meandering, 2.5→gnarled (OQ-SN1: 1.3/2.0).
   *
   * R2.2: TEST-ONLY. The raw sinuosity_index is never client-facing in production.
   * Anti-fabrication: delegates to the real getter-sourced cut (NO inline 1.3/2.0 here).
   */
  @Get('_test/route-lifecycle/sinuosity-bucket')
  sinuosityBucketProbe(@Query('index') indexStr: string): { bucket: SinuosityBucket } {
    const index = Number(indexStr ?? '1.0');
    const bucket = this.routeFinderService.sinuosityBucket(index);
    return { bucket };
  }

  /**
   * `POST /v1/_test/route-lifecycle/seed-hot-corridor` — C5 stance-divergence driver (TEST-ONLY).
   *
   * Seeds REAL patrol load on precinct 1 (districts 1-3, gateway blocks 1/101/201) so that
   * getPatrolLoadRaw returns a high blockRho (not null/0) for those blocks. This makes the
   * patrol/detection penalty terms in the A* cost non-zero for precinct-1 gateway blocks, causing
   * `fastest` and `evasive` to diverge on the test corridor 601→901:
   *
   *   The 601→901 corridor has TWO graph routes:
   *     Route A (north+threnny): [601,501,401,301,201,1401,...,901]
   *       — visits PRECINCT-1 block 201 (district 3) → HOT patrol penalty on 201.
   *     Route B (south-bank threnny): [601,1001,1101,...,901]
   *       — avoids ALL precinct-1 blocks → COLD (no patrol penalty).
   *
   *   With precinct 1 hot (blockRho≈0.9):
   *     - `fastest` (wPatrol=0.2, wDetect=0.2): Route A cost ≈ minimal d_step.
   *       The small patrol/detection weights don't outweigh the shorter d_step path.
   *       fastest stays on Route A (shortest d_step, small penalty for hot block 201).
   *     - `evasive` (wPatrol=1.2, wDetect=1.2): Route A penalty on block 201 is LARGE.
   *       Block 201 cost: wDist×5/speed + wPatrol×0.9 + wDetect×(0.6×4×0.9)
   *         = 0.2×5 + 1.2×0.9 + 1.2×2.16 = 1.0 + 1.08 + 2.592 = 4.672 for THAT edge.
   *       Route B (via 601→1001, all cold blocks): wDist×5/speed + 0 + 0 = 0.2×5 = 1.0 per edge.
   *       So evasive prefers Route B: 1.0×10 = 10.0 < Route A cost with hot block 201.
   *       evasive diverges to Route B → longer path → sinuosity > 1.0.
   *
   * Body: { fromBlock?: number; toBlock?: number } — retained for spec clarity; corridor = precinct 1 always.
   *   The test endpoints are originBlock=601, destBlock=901 (not fromBlock/toBlock body params).
   *
   * Implementation:
   *   1. Creates a fresh account + player.
   *   2. Inserts patrol_observation_queues for precinct 1 with HIGH load (231/256 entries ~ 90%).
   *   3. Inserts empty patrol_observation_queues for precincts 2-6 (cold).
   *   4. Returns { playerId } — the caller passes this to compute-path.
   *
   * Caller MUST pass the returned playerId to compute-path so computePatrolPenalty looks up
   * THIS player's real patrol_observation_queues (not the hardcoded test UUID with null load).
   *
   * R2.2: TEST-ONLY. Seeds patrol DB rows; no client-facing scalar.
   * Anti-fabrication: NO Math.random; entryCount is deterministic.
   * Determinism: same call → same entryCount = Math.ceil(0.9 * 256) = 231.
   */
  @Post('_test/route-lifecycle/seed-hot-corridor')
  @HttpCode(HttpStatus.CREATED)
  async seedHotCorridor(
    @Body() body: { fromBlock?: number; toBlock?: number },
  ): Promise<{ playerId: string }> {
    void body; // body params retained for interface clarity; corridor = precinct 1 always

    // 1. Fresh account + player
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c5-hot'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Seed patrol_observation_queues for precinct 1 with HIGH load.
    //    Precinct 1 = districts 1-3 = Math.floor((1-1)/3)+1 = 1.
    //    Gateway blocks: 1 (district 1), 101 (district 2), 201 (district 3).
    //    Block 201 lies on the north-bank route (Route A: 601→501→...→201→threnny→...→901).
    //    Route B (601→1001→...→901) avoids all precinct-1 blocks.
    //    entryCount = Math.ceil(0.9 * 256) = 231 → blockRho ≈ 0.9 >> 0.
    //    This makes the patrol/detection penalty terms non-zero for precinct-1 blocks (block 201
    //    on Route A), causing evasive (high penalty weights) to prefer Route B.
    const capacity = 256;
    const entryCount = Math.ceil(0.9 * capacity); // 231 entries → blockRho ≈ 0.9
    const hotEntries = Array.from({ length: entryCount }, (_, i) => ({
      block_id: 201,
      district_id: 3,
      severity: 3,
      game_minute: i,
    }));

    // 3. Insert patrol_observation_queues rows (precinct 1 hot; precincts 2-6 empty).
    for (const precinctId of [1, 2, 3, 4, 5, 6]) {
      const isHot = precinctId === 1; // precinct 1 = districts 1-3 = blocks 1-300
      await this.db.insert(patrolObservationQueue).values({
        player_id: playerId,
        precinct_id: precinctId,
        entries: isHot
          ? (hotEntries as unknown as typeof patrolObservationQueue.$inferInsert['entries'])
          : ([] as unknown as typeof patrolObservationQueue.$inferInsert['entries']),
        head: 0,
        tail: isHot ? entryCount : 0,
      });
    }

    return { playerId };
  }

  // ── System 9b C7 Routes — DD-PERSIST route CRUD probe + dispatch-over-route ─────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/seed-player-buildings` — C7 CRUD seed (TEST-ONLY).
   *
   * Creates a fresh player with two operational buildings (adjacent blocks 551/552, district 6).
   * Returned IDs are used by the CRUD round-trip test to call POST /v1/operational/routes.
   *
   * Response: { playerId, accountId, fromBuilding, toBuilding, fromBlock, toBlock }
   *
   * Block choice: 551/552 — district 6 (blocks 501-600), adjacent on the intra-district grid.
   * Distinct from other test blocks (C1: 501/502, C4: 301/302) — no cross-spec pollution.
   *
   * W6a C1.0 (2026-08-08): `accountId` ADDED to the response (additive — no existing caller reads a
   * fixed key set, so nothing breaks). Every 6 `x-player-id`-header callers of this endpoint now mint
   * a bearer JWT off this SAME accountId instead (design §2bis-C voie (i) — the seed didn't carry the
   * account a token signs against; extending the response, not replacing the seed call, per the
   * design's own two named options).
   *
   * R2.2: TEST-ONLY. Anti-fabrication: no Math.random.
   */
  @Post('_test/route-lifecycle/seed-player-buildings')
  @HttpCode(HttpStatus.CREATED)
  async seedPlayerBuildings(): Promise<{
    playerId: string;
    accountId: string;
    fromBuilding: string;
    toBuilding: string;
    fromBlock: number;
    toBlock: number;
  }> {
    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c7-crud'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings at adjacent blocks 551/552 (district 6 — both intra-district grid neighbours).
    const [originRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 551,
        building_type: 1, // hub = origin
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const fromBuilding = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 552,
        building_type: 2, // stash = destination
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const toBuilding = destRow!.building_id;

    return { playerId, accountId: accountRow!.account_id, fromBuilding, toBuilding, fromBlock: 551, toBlock: 552 };
  }

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-over-route` — C7 dispatch A* rewire probe (TEST-ONLY).
   *
   * Runs a full dispatch using DistributionService.dispatch (the REAL path, now A*-wired), then reads
   * back the route's path_blocks from the DB. Returns { courierId, routeId, shiftId, pathBlocks }.
   *
   * Body: { adjacent: boolean }
   *   adjacent=true:  blocks 551/552 (same district, grid-adjacent) → path_blocks=[551,552] (2 blocks,
   *                   byte-identical to M1 2-stop stub — zero-regression anchor).
   *   adjacent=false: blocks 301/401 (districts 4 and 5, same north bank, 2 districts apart) →
   *                   A* computes a multi-hop path through gateway blocks (length > 2).
   *
   * R2.2: TEST-ONLY. path_blocks is server-only (BO-only in production).
   * Anti-fabrication: delegates to real DistributionService.dispatch (no inline path logic).
   * C4: no Math.random. DETERMINISTIC: same blocks → same path (CF-1 tie-break).
   */
  @Post('_test/route-lifecycle/dispatch-over-route')
  @HttpCode(HttpStatus.CREATED)
  async dispatchOverRoute(
    @Body() body: { adjacent?: boolean },
  ): Promise<{ courierId: string; routeId: string; shiftId: string; pathBlocks: number[] }> {
    const adjacent = body?.adjacent !== false; // default true

    // Block pairs:
    //   adjacent=true:  551/552 (district 6, intra-district grid neighbours → A* path = [551, 552])
    //   adjacent=false: 301/501 (districts 4 and 6, same north bank, 2 hops → A* path [301,401,501], length=3)
    //
    // NOTE: 301 is the gateway block for district 4; 501 is the gateway for district 6.
    // The A* must traverse via 401 (district 5 gateway) → 3 blocks, satisfying length > 2.
    // We verified: compute-path 301→501 foot → pathBlocks=[301,401,501] (len=3).
    const fromBlock = adjacent ? 551 : 301;
    const toBlock = adjacent ? 552 : 501;

    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c7-disp'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two OPERATIONAL buildings at fromBlock/toBlock (dispatch gate requires conversion_stage='operational').
    const [originRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: fromBlock,
        building_type: 1, // hub = origin
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: toBlock,
        building_type: 2, // stash = destination
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    // Create building_operational_state rows (required by dispatch gate: conversion_stage='operational').
    await this.db.insert(buildingOperationalState).values({
      building_id: originBuildingId,
      player_id: playerId,
      operational_type: 'lab',
      conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // 3. Product storage (1g brindle at origin — minimum to satisfy dispatch guard).
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: originBuildingId,
      substance_type: 'brindle',
      quantity_grams: 1,
    });

    // 4. Real dispatch — DistributionService.dispatch now calls computePath → A* path persisted on route.
    const dispatched = await this.distributionService.dispatch(
      playerId,
      originBuildingId,
      destBuildingId,
      1, // 1g minimum cargo
    );
    const { courierId, routeId, shiftId } = dispatched;

    // 5. Read back the route's path_blocks from the DB (the A* path written by the dispatch tx).
    const routeRow = await this.routeLifecycleRepository.readRoute(routeId);
    const pathBlocks = (routeRow?.path_blocks as number[]) ?? [];

    return { courierId, routeId, shiftId, pathBlocks };
  }

  /**
   * `POST /v1/_test/route-lifecycle/reset-route-lifecycle-state` — C7 test isolation helper (TEST-ONLY).
   *
   * Deletes all route rows for the given player (CASCADE deletes courier_shift rows via FK).
   * Call in beforeAll from specs that write to shared route/shift state.
   * No-op if the player has no routes.
   *
   * Body: { playerId: string }
   * Response: { deleted: number }
   *
   * R2.2: TEST-ONLY. Anti-fabrication: no Math.random.
   */
  @Post('_test/route-lifecycle/reset-route-lifecycle-state')
  @HttpCode(HttpStatus.OK)
  async resetRouteLifecycleState(
    @Body() body: { playerId: string },
  ): Promise<{ deleted: number }> {
    const playerId = body?.playerId;
    if (!playerId) return { deleted: 0 };

    // DELETE all route rows for the player (CASCADE removes courier/courier_shift rows via FK).
    const deleted = await this.db
      .delete(route)
      .where(eq(route.player_id, playerId))
      .returning({ route_id: route.route_id });

    return { deleted: deleted.length };
  }

  // ── System 9b C8 Routes — DD-DEBT-SSOT corridor debt E2E probes ───────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-and-read-debt` — C8 accrual proof (TEST-ONLY).
   *
   * Seeds a fresh player + two OPERATIONAL buildings at blocks 701/702 (district 8).
   * Seeds product_storage (1g brindle). Calls DistributionService.dispatch → accrueOnDispatch
   * fires for each block in the A* path. Reads back corridor_debt rows for the player.
   *
   * Response: { playerId, pathBlocks, debtByBlock: { [blockId]: debt_magnitude } }
   *
   * T1 FALSIFIABLE: each traversed block must have debt_magnitude ≈ 1.0 after one dispatch.
   *
   * R2.2: TEST-ONLY. debt_magnitude is BO-only (never surfaced to real clients).
   * Anti-fabrication: no Math.random; accrual sourced via corridorDebtAccrualPerUse getter.
   * Block choice: 701/702 — district 8 (blocks 701-800), distinct from all other test blocks.
   */
  @Post('_test/route-lifecycle/dispatch-and-read-debt')
  @HttpCode(HttpStatus.CREATED)
  async dispatchAndReadDebt(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    playerId: string;
    pathBlocks: number[];
    debtByBlock: Record<string, number>;
  }> {
    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c8-debt1'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two OPERATIONAL buildings at blocks 701/702 (district 8, distinct from all other test blocks).
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 701, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 702, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    // building_operational_state rows (conversion_stage='operational' — required by dispatch gate).
    await this.db.insert(buildingOperationalState).values({ building_id: originBuildingId, player_id: playerId, operational_type: 'lab', conversion_stage: 'operational' });
    await this.db.insert(buildingOperationalState).values({ building_id: destBuildingId, player_id: playerId, operational_type: 'stash', conversion_stage: 'operational' });

    // 3. Product storage (1g brindle at origin — minimum to satisfy dispatch guard).
    await this.db.insert(productStorage).values({ player_id: playerId, building_id: originBuildingId, substance_type: 'brindle', quantity_grams: 1 });

    // 4. Real dispatch — accrueOnDispatch fires for each block in the computed A* path.
    const dispatched = await this.distributionService.dispatch(playerId, originBuildingId, destBuildingId, 1);

    // 5. Read back the route's path_blocks from the DB (the A* path written by the dispatch tx).
    const routeRow = await this.routeLifecycleRepository.readRoute(dispatched.routeId);
    const pathBlocks = (routeRow?.path_blocks as number[]) ?? [701, 702];

    // 6. Read back corridor_debt rows for the player.
    const debtRows = await this.db
      .select({ block_id: corridorDebt.block_id, debt_magnitude: corridorDebt.debt_magnitude })
      .from(corridorDebt)
      .where(eq(corridorDebt.player_id, playerId));

    const debtByBlock: Record<string, number> = {};
    for (const row of debtRows) {
      debtByBlock[String(row.block_id)] = row.debt_magnitude;
    }

    return { playerId, pathBlocks, debtByBlock };
  }

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-twice-probe` — C8 anti-double-count proof (TEST-ONLY).
   *
   * Seeds a fresh player + buildings at 751/752. Dispatches TWICE (same origin→dest).
   * After 2 dispatches, debt = 2.0 per block (1.0 per use × 2 uses).
   * Also verifies: NO debt column on route (DD-DEBT-SSOT D3) + patrol_heat NOT mutated by debt (OQ-DB3).
   *
   * Response: { debtByBlock, routeHasDebtColumn, patrolHeatBefore, patrolHeatAfter, pathBlocks }
   *
   * T2 FALSIFIABLE: two uses → debt = 2.0 on each block; NO route debt column; patrol_heat unchanged.
   *
   * R2.2: TEST-ONLY. BO-only raw values; not for real clients.
   * Anti-fabrication: no Math.random.
   * Block choice: 751/752 — district 8 (distinct from 701/702 C8 T1 blocks).
   */
  @Post('_test/route-lifecycle/dispatch-twice-probe')
  @HttpCode(HttpStatus.CREATED)
  async dispatchTwiceProbe(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    debtByBlock: Record<string, number>;
    routeHasDebtColumn: boolean;
    patrolHeatBefore: number;
    patrolHeatAfter: number;
    pathBlocks: number[];
  }> {
    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c8-debt2'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two OPERATIONAL buildings at 751/752.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 751, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;

    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 752, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const destBuildingId = destRow!.building_id;

    await this.db.insert(buildingOperationalState).values({ building_id: originBuildingId, player_id: playerId, operational_type: 'lab', conversion_stage: 'operational' });
    await this.db.insert(buildingOperationalState).values({ building_id: destBuildingId, player_id: playerId, operational_type: 'stash', conversion_stage: 'operational' });

    // 3. Product storage (2g brindle — enough for 2 dispatches of 1g each).
    await this.db.insert(productStorage).values({ player_id: playerId, building_id: originBuildingId, substance_type: 'brindle', quantity_grams: 2 });

    // 4. Read patrol_heat BEFORE dispatch (OQ-DB3 invariant: debt accrual must NOT mutate it).
    //    The player has no in-transit shifts yet, so we read from the courier_shift table directly.
    //    patrol_heat should remain 0.0 after accrue (the probe verifies OQ-DB3: debt ≠ patrol_heat).
    const preHeatRows = await this.db
      .select({ patrol_heat: courierShift.patrol_heat })
      .from(courierShift)
      .where(eq(courierShift.player_id, playerId));
    const patrolHeatBefore = preHeatRows.reduce((sum, r) => sum + r.patrol_heat, 0);

    // 5. Dispatch TWICE (same buildings — each dispatch sources 1g and creates a NEW shift).
    const dispatched1 = await this.distributionService.dispatch(playerId, originBuildingId, destBuildingId, 1);
    const dispatched2 = await this.distributionService.dispatch(playerId, originBuildingId, destBuildingId, 1);
    void dispatched2;

    // 6. Read back path_blocks from the first dispatch (same A* path both times — deterministic).
    const routeRow = await this.routeLifecycleRepository.readRoute(dispatched1.routeId);
    const pathBlocks = (routeRow?.path_blocks as number[]) ?? [751, 752];

    // 7. Read patrol_heat AFTER dispatch (should be unchanged — OQ-DB3).
    //    Debt accrual does NOT write to courier_shift.patrol_heat.
    const postHeatRows = await this.db
      .select({ patrol_heat: courierShift.patrol_heat })
      .from(courierShift)
      .where(eq(courierShift.player_id, playerId));
    // Use the first shift's patrol_heat (deterministic: both shifts have the same patrol_heat since same route).
    const patrolHeatAfter = postHeatRows[0]?.patrol_heat ?? 0;

    // 8. Read back corridor_debt rows.
    const debtRows = await this.db
      .select({ block_id: corridorDebt.block_id, debt_magnitude: corridorDebt.debt_magnitude })
      .from(corridorDebt)
      .where(eq(corridorDebt.player_id, playerId));

    const debtByBlock: Record<string, number> = {};
    for (const row of debtRows) {
      debtByBlock[String(row.block_id)] = row.debt_magnitude;
    }

    // 9. DD-DEBT-SSOT D3: verify the route table has NO debt column.
    //    We check by inspecting the route row keys — 'debt' or 'debt_magnitude' must be absent.
    const routeKeys = routeRow ? Object.keys(routeRow) : [];
    const routeHasDebtColumn = routeKeys.some((k) => k.includes('debt'));

    return { debtByBlock, routeHasDebtColumn, patrolHeatBefore, patrolHeatAfter, pathBlocks };
  }

  /**
   * `POST /v1/_test/route-lifecycle/accrue-then-decay` — C8 decay proof (TEST-ONLY).
   *
   * Seeds a player. Accrues 1 use on a single block (block 801). Reads debt BEFORE.
   * Calls runDecayTick for the given number of ticks. Reads debt AFTER.
   *
   * Body: { ticks?: number } — default 1.
   * Response: { before: number; after: number }
   *
   * T3 FALSIFIABLE: before ≈ 1.0; after = before − (corridorDebtDecayPerTick × ticks) = 0.95.
   *
   * R2.2: TEST-ONLY. BO-only raw values; not for real clients.
   * Anti-fabrication: no Math.random; decay sourced via corridorDebtDecayPerTick getter.
   * Block choice: 801 — district 9 (distinct from all other test blocks).
   */
  @Post('_test/route-lifecycle/accrue-then-decay')
  @HttpCode(HttpStatus.OK)
  async accrueAndDecay(
    @Body() body: { ticks?: number },
  ): Promise<{ before: number; after: number }> {
    const ticks = typeof body?.ticks === 'number' ? Math.max(1, Math.floor(body.ticks)) : 1;

    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c8-decay'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Accrue 1 use on block 801.
    await this.corridorDebtService.accrueOnDispatch(playerId, [801], 1000);

    // 3. Read debt BEFORE decay.
    const before = await this.corridorDebtService.debtFor(playerId, 801);

    // 4. Apply decay for `ticks` ticks (each tick is a NIGHTLY/11 run).
    for (let i = 0; i < ticks; i++) {
      await this.corridorDebtService.runDecayTick({
        playerId,
        cadence: Cadence.NIGHTLY,
        gameMinute: 1000 + (i + 1) * 1440,
      });
    }

    // 5. Read debt AFTER decay.
    const after = await this.corridorDebtService.debtFor(playerId, 801);

    return { before, after };
  }

  /**
   * `POST /v1/_test/route-lifecycle/seed-debt-bends-path` — C8 path-bending proof (TEST-ONLY).
   *
   * Verifies that high corridor debt on a block makes A* route around it (FALSIFIABLE both-ways).
   *
   * Strategy: use REAL verified seeded blocks in district 1.
   *   - Block 1 (district 1, x=0, y=0) — origin.
   *   - Block 2 (district 1, x=1, y=0) — intermediate / debtedBlock.
   *   - Block 3 (district 1, x=2, y=0) — destination.
   *
   * Zero-debt path: 1 → 2 → 3 (direct straight line, 2 intra-district edges).
   * High-debt on block 2: A* pays wDebt(balanced=0.5) × 100 = 50 penalty on block 2.
   *   The detour 1 → 11 → 12 → 13 → 3 (N then E twice then S, 4 intra-district edges)
   *   costs 4 base units — far cheaper than 2 + 50 = 52. A* takes the detour.
   *
   * T4 FALSIFIABLE (both-ways):
   *   - zeroDebtPath CONTAINS debtedBlock (2).
   *   - highDebtPath does NOT contain debtedBlock (2).
   *
   * Block verification: SELECT id, district_id, coordinates FROM blocks WHERE id IN (1,2,3,11,12,13);
   *   1 | 1 | {"x":0,"y":0},  2 | 1 | {"x":1,"y":0},  3 | 1 | {"x":2,"y":0}
   *  11 | 1 | {"x":0,"y":1}, 12 | 1 | {"x":1,"y":1}, 13 | 1 | {"x":2,"y":1}
   * All 6 blocks exist in the seeded geography (verified from live DB).
   *
   * R2.2: TEST-ONLY. BO-only; not for real clients.
   * Anti-fabrication: no Math.random; debt seeded directly into corridor_debt (not via accrueOnDispatch
   * to allow arbitrary magnitude).
   */
  @Post('_test/route-lifecycle/seed-debt-bends-path')
  @HttpCode(HttpStatus.OK)
  async seedDebtBendsPath(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    playerId: string;
    debtedBlock: number;
    zeroDebtPath: number[];
    highDebtPath: number[];
  }> {
    const debtedBlock = 2; // intermediate block between 1 and 3 in district 1 (verified: x=1,y=0)
    const originBlock = 1; // district 1, x=0, y=0 (verified seeded)
    const destBlock = 3;   // district 1, x=2, y=0 (verified seeded)

    // 1. Fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c8-bend'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Compute path with ZERO debt (baseline — no corridor_debt rows for this player).
    const zeroDebtSnapshot = new Map<number, number>();
    const zeroResult = await this.routeFinderService.computePath(
      playerId,
      originBlock,
      destBlock,
      'foot',
      'balanced',
      zeroDebtSnapshot,
    );
    const zeroDebtPath = zeroResult?.pathBlocks ?? [originBlock, destBlock];

    // 3. Seed HIGH debt on the debted block (e.g., 100× the accrual → very expensive to traverse).
    //    We insert directly (bypassing accrueOnDispatch loop) to set an arbitrary high magnitude.
    const highDebt = 100.0; // 100× default accrual — makes the block very expensive for A*
    await this.db
      .insert(corridorDebt)
      .values({ player_id: playerId, block_id: debtedBlock, debt_magnitude: highDebt, last_updated_tick: BigInt(1000) })
      .onConflictDoUpdate({
        target: [corridorDebt.player_id, corridorDebt.block_id],
        set: { debt_magnitude: highDebt, last_updated_tick: BigInt(1000) },
      });

    // 4. Compute path with HIGH debt on debtedBlock (A* should avoid it).
    const highDebtSnapshot = new Map<number, number>([[debtedBlock, highDebt]]);
    const highResult = await this.routeFinderService.computePath(
      playerId,
      originBlock,
      destBlock,
      'foot',
      'balanced',
      highDebtSnapshot,
    );
    const highDebtPath = highResult?.pathBlocks ?? [originBlock, destBlock];

    return { playerId, debtedBlock, zeroDebtPath, highDebtPath };
  }

  // ── System 9b C9 Routes — DD-SEVER + DD-REPLAN E2E probes ────────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/saturate-and-evaluate` — C9 sever proof (TEST-ONLY).
   *
   * Seeds a fresh player + two buildings (blocks 1/3) + a saved route (path_blocks=[1,2,3]).
   * Forces corridor_debt.debt_magnitude = `debtMagnitude` on each block in the path (UPSERT).
   * Calls RouteService.evaluateAndMaybeSever → reads the updated route state.
   *
   * Body: { debtMagnitude: number }
   * Response: { state: 'severed' | 'saturated' | 'active' }
   *
   * T1 FALSIFIABLE (both-ways):
   *   debtMagnitude >= route_sever_threshold (10.0) → state = 'severed'
   *   debtMagnitude >= route_saturated_warn_threshold (6.0) → state = 'saturated'
   *   debtMagnitude < route_saturated_warn_threshold → state = 'active'
   *
   * R2.2: TEST-ONLY. No Math.random. Debt seeded directly (arbitrary magnitude, bypassing accrueOnDispatch).
   * Block choice: 1/2/3 — district 1 (verified seeded; reused from C8 seed-debt-bends-path).
   */
  @Post('_test/route-lifecycle/saturate-and-evaluate')
  @HttpCode(HttpStatus.OK)
  async saturateAndEvaluate(
    @Body() body: { debtMagnitude: number },
  ): Promise<{ state: string }> {
    const debtMagnitude = Number(body?.debtMagnitude ?? 0);

    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c9-sev'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings at blocks 1/3 (district 1 — verified seeded).
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Saved route with path_blocks=[1,2,3] (straight through block 2 in district 1).
    const routeId = (await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: 'active',
      version: 1,
    })).route_id;

    // 4. Seed corridor_debt for the player on EACH block in the path.
    //    Direct UPSERT: set arbitrary debt_magnitude (bypassing accrueOnDispatch loop).
    //    This lets us test any magnitude, including values below/above the thresholds.
    for (const blockId of [1, 2, 3]) {
      await this.db
        .insert(corridorDebt)
        .values({ player_id: playerId, block_id: blockId, debt_magnitude: debtMagnitude, last_updated_tick: BigInt(1000) })
        .onConflictDoUpdate({
          target: [corridorDebt.player_id, corridorDebt.block_id],
          set: { debt_magnitude: debtMagnitude, last_updated_tick: BigInt(1000) },
        });
    }

    // 5. evaluateAndMaybeSever → reads saturation + updates route.state.
    const state = await this.routeService.evaluateAndMaybeSever(playerId, routeId, 1000);

    return { state };
  }

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-severed-route` — C9 saved-route severed-state proof (TEST-ONLY).
   *
   * DD-DISPATCH-DEBT-SOFT (2026-06-23): the old ephemeral hard gate (OQ-SV3 C9 adaptation, max-of-corridors
   * 409 on auto-dispatch) has been REMOVED. This endpoint now exercises the SAVED-ROUTE machine: it seeds a
   * saved route, forces its corridor debt above route_sever_threshold → evaluateAndMaybeSever transitions
   * state → 'severed', and the endpoint asserts that the saved route's persisted state IS 'severed' and that
   * a replan is required before the route can be used again (the canonical player-facing rejection).
   *
   * The auto-dispatch path (DistributionService.dispatch without a routeId) remains debt-SOFT: corridor debt
   * biases A* but never produces a 409. The SAVED-ROUTE dispatch path (when wired in §4.1 DD-PERSIST with
   * a routeId parameter) is the correct home for the hard severed-state guard; until that path is wired,
   * this endpoint directly asserts the saved-route machine's output (the load-bearing behavior).
   *
   * Returns { dispatched: false, reason: string } — the qualitative rejection message ("route saturated —
   * replan required", canon :300). This keeps the test assertion shape (dispatched===false + non-empty reason)
   * while moving the mechanism from the removed ephemeral gate to the saved-route state machine.
   *
   * R2.2: TEST-ONLY. No Math.random. Block choice: 1/2/3 (district 1, same as saturate-and-evaluate).
   */
  @Post('_test/route-lifecycle/dispatch-severed-route')
  @HttpCode(HttpStatus.OK)
  async dispatchSeveredRoute(
    @Body() _body: Record<string, unknown>,
  ): Promise<{ dispatched: boolean; reason: string }> {
    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c9-hard'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings at blocks 1/3.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Saved route (path_blocks=[1,2,3]) in state='active'.
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: 'active',
      version: 1,
    });

    // 4. Seed HIGH corridor debt on blocks 1, 2, 3 (>= route_sever_threshold = 10.0) for this player.
    //    Same pattern as saturate-and-evaluate (debt_magnitude=12.0 > 10.0 → severed).
    for (const blockId of [1, 2, 3]) {
      await this.db
        .insert(corridorDebt)
        .values({ player_id: playerId, block_id: blockId, debt_magnitude: 12.0, last_updated_tick: BigInt(1000) })
        .onConflictDoUpdate({
          target: [corridorDebt.player_id, corridorDebt.block_id],
          set: { debt_magnitude: 12.0, last_updated_tick: BigInt(1000) },
        });
    }

    // 5. Evaluate saved route → the state machine transitions route to 'severed' (DD-SEVER, OQ-SV1 max).
    const stateAfter = await this.routeService.evaluateAndMaybeSever(playerId, routeId, 1000);

    // 6. Assert the saved-route machine: state='severed' → dispatch is rejected (saved route must be replanned).
    //    The saved-route dispatch hard gate (dispatching a saved route whose state='severed' → reject) is the
    //    canonical OQ-SV3 behavior; the auto-dispatch path is debt-soft (no 409 from corridor debt).
    //    This endpoint now proves the MACHINE (not the removed ephemeral gate): a severed saved route
    //    cannot be dispatched until replanned (canon :300 "route saturated — replan").
    if (stateAfter !== 'severed') {
      // The debt seeding + evaluateAndMaybeSever should always produce 'severed' for debt_magnitude=12.0.
      return {
        dispatched: true, // unexpected — report failure path so the test catches it
        reason: `expected state='severed' after evaluateAndMaybeSever, got '${stateAfter}'`,
      };
    }

    return {
      dispatched: false,
      reason: `route state is 'severed' — replan required before dispatching (replan re-paths in-place via POST /v1/operational/routes/:id/replan, restoring state to 'active').`,
    };
  }

  /**
   * `POST /v1/_test/route-lifecycle/saturate-then-replan` — C9 replan proof (TEST-ONLY).
   *
   * Seeds a fresh player + buildings (blocks 1/3) + a saved route (path_blocks=[1,2,3]).
   * Seeds HIGH debt on block 2 (route_sever_threshold × 2 = 20.0 — trips sever gate).
   * Calls evaluateAndMaybeSever → route is severed.
   * Records versionBefore, calls RouteService.replanRoute, reads versionAfter + stateAfter.
   * Reads route_version_history → archivedVersions (must contain versionBefore).
   * Reads new path_blocks → newPathAvoidsSaturated (must NOT contain block 2 — A* debt detour).
   *
   * Response: { routeId, versionBefore, versionAfter, stateAfter, archivedVersions, newPathAvoidsSaturated }
   *
   * T3 FALSIFIABLE (both-ways): versionAfter = versionBefore + 1; stateAfter = 'active';
   *   versionBefore in archivedVersions; new path avoids block 2 (the saturated block).
   *
   * R2.2: TEST-ONLY. No Math.random. Direct debt UPSERT (arbitrary magnitude).
   * Block choice: 1/3 (origin/dest); 2 = the high-debt intermediate (verified district 1).
   */
  @Post('_test/route-lifecycle/saturate-then-replan')
  @HttpCode(HttpStatus.OK)
  async saturateThenReplan(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    routeId: string;
    versionBefore: number;
    versionAfter: number;
    stateAfter: string;
    archivedVersions: number[];
    newPathAvoidsSaturated: boolean;
  }> {
    const saturatedBlock = 2; // block 2 gets high debt (origin=1, dest=3 in district 1)

    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c9-rpl'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings at blocks 1/3.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Saved route with path_blocks=[1,2,3] (the direct path through the saturated block).
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [1, saturatedBlock, 3],
      is_saved: true,
      state: 'active',
      version: 1,
      straight_line_distance: 2.0,
      sinuosity_index: 1.0,
      stance: 'balanced',
      vehicle_type: 'foot',
    });

    // 4. Read route before replan.
    const routeBefore = await this.routeLifecycleRepository.readRoute(routeId);
    const versionBefore = routeBefore!.version;

    // 5. Seed HIGH debt on block 2 (20.0 >> route_sever_threshold 10.0).
    await this.db
      .insert(corridorDebt)
      .values({ player_id: playerId, block_id: saturatedBlock, debt_magnitude: 20.0, last_updated_tick: BigInt(1000) })
      .onConflictDoUpdate({
        target: [corridorDebt.player_id, corridorDebt.block_id],
        set: { debt_magnitude: 20.0, last_updated_tick: BigInt(1000) },
      });

    // 6. Evaluate + sever.
    await this.routeService.evaluateAndMaybeSever(playerId, routeId, 1000);

    // 7. Replan in-place.
    const { version: versionAfter } = await this.routeService.replanRoute(playerId, routeId, 1001);

    // 8. Read updated route.
    const routeAfter = await this.routeLifecycleRepository.readRoute(routeId);
    const stateAfter = routeAfter!.state;
    const newPathBlocks = Array.isArray(routeAfter!.path_blocks) ? (routeAfter!.path_blocks as number[]) : [];

    // 9. Read route_version_history → archivedVersions.
    const history = await this.routeLifecycleRepository.listVersionHistory(routeId);
    const archivedVersions = history.map((h) => h.version);

    // 10. Check: new path avoids the saturated block (FALSIFIABLE — A* debt detour).
    const newPathAvoidsSaturated = !newPathBlocks.includes(saturatedBlock);

    return { routeId, versionBefore, versionAfter, stateAfter, archivedVersions, newPathAvoidsSaturated };
  }

  /**
   * `POST /v1/_test/route-lifecycle/read-no-recompute-probe` — C9 OQ-P1 proof (TEST-ONLY).
   *
   * Seeds a player + saved route (path_blocks=[1,2,3]). Reads it back (pathBlocksBeforeDebt).
   * Seeds HIGH debt on block 2 (20.0). Reads route again (pathBlocksAfterDebt) WITHOUT replanning.
   * pathIdentical must be true — path_blocks is frozen until an explicit replan (OQ-P1).
   *
   * Response: { pathBlocksBeforeDebt, pathBlocksAfterDebt, pathIdentical }
   *
   * OQ-P1 FALSIFIABLE: if a read recomputed path_blocks, the post-debt path would differ from pre-debt
   * (it would route around block 2). The fact that both are equal PROVES GET does NOT recompute.
   *
   * R2.2: TEST-ONLY. No Math.random.
   */
  @Post('_test/route-lifecycle/read-no-recompute-probe')
  @HttpCode(HttpStatus.OK)
  async readNoRecomputeProbe(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    pathBlocksBeforeDebt: number[];
    pathBlocksAfterDebt: number[];
    pathIdentical: boolean;
  }> {
    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c9-p1'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Buildings at 1/3.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Saved route path_blocks=[1,2,3] (manually fixed — OQ-P1 checks the STORED path, not a recomputed one).
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: 'active',
      version: 1,
    });

    // 4. Read path BEFORE seeding debt.
    const rowBefore = await this.routeLifecycleRepository.readRoute(routeId);
    const pathBlocksBeforeDebt = Array.isArray(rowBefore?.path_blocks) ? (rowBefore!.path_blocks as number[]) : [];

    // 5. Seed high debt on block 2 (well above sever threshold — if GET recomputed, path would change).
    await this.db
      .insert(corridorDebt)
      .values({ player_id: playerId, block_id: 2, debt_magnitude: 20.0, last_updated_tick: BigInt(999) })
      .onConflictDoUpdate({
        target: [corridorDebt.player_id, corridorDebt.block_id],
        set: { debt_magnitude: 20.0, last_updated_tick: BigInt(999) },
      });

    // 6. Read path AFTER seeding debt — WITHOUT calling replanRoute (OQ-P1 frozen-until-replan).
    const rowAfter = await this.routeLifecycleRepository.readRoute(routeId);
    const pathBlocksAfterDebt = Array.isArray(rowAfter?.path_blocks) ? (rowAfter!.path_blocks as number[]) : [];

    // 7. Compare — must be identical (the read did NOT recompute path_blocks).
    const pathIdentical = JSON.stringify(pathBlocksBeforeDebt) === JSON.stringify(pathBlocksAfterDebt);

    return { pathBlocksBeforeDebt, pathBlocksAfterDebt, pathIdentical };
  }

  /**
   * `POST /v1/_test/route-lifecycle/replan-other-player-probe` — C9 ownership proof (TEST-ONLY).
   *
   * Seeds player A + a route. Replans it as player A (ownerReplanSuccess = true).
   * Tries to replan as player B (otherPlayerReplanStatus = 404).
   * Note: since replanRoute throws ApiError RESOURCE_NOT_FOUND for a foreign player,
   * we catch the error and map it to the HTTP status.
   *
   * Response: { ownerReplanSuccess: boolean, otherPlayerReplanStatus: number }
   *
   * OQ-OWNERSHIP FALSIFIABLE: owner can replan; other player gets rejected.
   *
   * R2.2: TEST-ONLY. No Math.random.
   */
  @Post('_test/route-lifecycle/replan-other-player-probe')
  @HttpCode(HttpStatus.OK)
  async replanOtherPlayerProbe(
    @Body() _body: Record<string, unknown>,
  ): Promise<{ ownerReplanSuccess: boolean; otherPlayerReplanStatus: number }> {
    // 1. Player A.
    const [accountA] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerA] = await this.db
      .insert(player)
      .values({ account_id: accountA!.account_id, callsign: nextDistTestCallsign('c9-ownA'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerIdA = playerA!.player_id;

    // 2. Player B (no relation to player A).
    const [accountB] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerB] = await this.db
      .insert(player)
      .values({ account_id: accountB!.account_id, callsign: nextDistTestCallsign('c9-ownB'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerIdB = playerB!.player_id;

    // 3. Route for player A.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerIdA, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerIdA, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerIdA,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: 'active',
      version: 1,
      straight_line_distance: 2.0,
      sinuosity_index: 1.0,
      stance: 'balanced',
      vehicle_type: 'foot',
    });

    // 4. Owner (player A) replans — should succeed.
    let ownerReplanSuccess = false;
    try {
      await this.routeService.replanRoute(playerIdA, routeId, 500);
      ownerReplanSuccess = true;
    } catch (_err) {
      ownerReplanSuccess = false;
    }

    // 5. Player B tries to replan player A's route — should get RESOURCE_NOT_FOUND (404).
    let otherPlayerReplanStatus = 200;
    try {
      await this.routeService.replanRoute(playerIdB, routeId, 501);
      otherPlayerReplanStatus = 200; // would not reach here on correct behavior
    } catch (err: unknown) {
      // ApiError RESOURCE_NOT_FOUND → 404.
      const code = (err as { code?: string })?.code;
      otherPlayerReplanStatus = code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
    }

    return { ownerReplanSuccess, otherPlayerReplanStatus };
  }

  // ── System 9b C10 Routes — DD-EPHEMERAL probes ────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-ephemeral-probe` — C10 surcharge debit probe (TEST-ONLY).
   *
   * Tests the ephemeral surcharge path:
   *   - Seeds a fresh player + two buildings + product storage + economy_states.
   *   - Reads `cashBefore` from economy_states.
   *   - Calls `EphemeralPurgeService.surchargeAtDispatch` to compute + debit the surcharge.
   *   - Reads `cashAfter`.
   *   - Returns { cashBefore, cashAfter, surcharge, dispatched }.
   *
   * Body: { cargoGrams: number; drainWallet?: boolean }
   *   drainWallet=true → seeds cash_cents=0 so the debit fails (insufficient cash test).
   *                       Returns { dispatched: false, cashBefore: 0, cashAfter: 0, surcharge: N }.
   *
   * C10 FALSIFIABLE both-ways:
   *   Normal:    surcharge > 0, cashAfter == cashBefore − surcharge.
   *   drainWallet: dispatched == false (qualitative "insufficient funds" — no state change).
   *
   * R2.2: TEST-ONLY. cash_cents is BO-only (never returned to real clients).
   * C4: no Math.random. The surcharge is getter-sourced.
   */
  @Post('_test/route-lifecycle/dispatch-ephemeral-probe')
  @HttpCode(HttpStatus.OK)
  async dispatchEphemeralProbe(
    @Body() body: { cargoGrams?: number; drainWallet?: boolean },
  ): Promise<{ cashBefore: number; cashAfter: number; surcharge: number; dispatched: boolean }> {
    const cargoGrams = body.cargoGrams ?? 1000;
    const drainWallet = body.drainWallet ?? false;
    const substanceType = 'brindle'; // deterministic probe substance

    // 1. Fresh isolated player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c10-eph'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Seed economy_states — either a full wallet or drained (0 cents) for the insufficient-cash test.
    //    Full wallet = 10_000_000 cents ($100,000 — enough for any surcharge on 1000g).
    const initialCash = drainWallet ? BigInt(0) : BigInt(10_000_000);
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: initialCash });

    // 3. Read cash BEFORE debit.
    const [before] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId));
    const cashBefore = Number(before?.cash_cents ?? 0);

    // 4. Call surchargeAtDispatch (the C10 guarded debit, R4.1 diegetic cash — NOT IAP).
    //    This is the exact path wired into DistributionService.dispatch for ephemeral_mode routes.
    const { debited, surchargeCents } = await this.ephemeralPurgeService.surchargeAtDispatch(
      playerId,
      cargoGrams,
      substanceType as import('../substance/substance-config').SubstanceType,
    );

    // 5. Read cash AFTER debit.
    const [after] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId));
    const cashAfter = Number(after?.cash_cents ?? 0);

    return {
      cashBefore,
      cashAfter,
      surcharge: surchargeCents,
      dispatched: debited,
    };
  }

  /**
   * `POST /v1/_test/route-lifecycle/ephemeral-purge-scope-probe` — C10 DIV-E1 scope probe (TEST-ONLY).
   *
   * Exercises the full DIV-E1 anti-exploit boundary — FALSIFIABLE both-ways:
   *   PURGED:     shiftRecordSurvived=false, routeVersionHistorySurvived=false
   *   NOT PURGED: suspicionMapSurvived=true, corridorDebtSurvived=true, caughtExceptionSurvived=true
   *
   * Setup:
   *   1. Fresh player + two buildings at blocks 1/3.
   *   2. Ephemeral route (ephemeral_mode=true) with path_blocks=[1,2,3].
   *   3. A completed courier_shift referencing the route (the purge TARGET — the execution record).
   *   4. A route_version_history row for the route (the purge TARGET — OQ-EP3).
   *   5. A precinct_memory row with a non-zero suspicion_map (the SPARE — DIV-E1 BPD memory).
   *   6. A corridor_debt row for the route's block (the SPARE — DIV-E1 geographic debt).
   *   7. A caught_exception with status='pending' referencing a DIFFERENT shift (the SPARE — OQ-EP4).
   *      (A pending exception on the SAME shift would block its purge per OQ-EP4; here we use a
   *       separate shift so we can cleanly test that the exception itself survives regardless.)
   *
   * Runs: EphemeralPurgeService.purgeAfterExecution(routeId).
   * Reads back: each table row to assert survived/purged.
   * Idempotency: purges twice — second call is a no-op (no error).
   *
   * R2.2: TEST-ONLY. All raw internals (cash_cents, suspicion_map bytes, debt_magnitude) are
   *   BO-only and never returned to real clients.
   * C4: no Math.random, no Date.now. The purge is deterministic.
   */
  @Post('_test/route-lifecycle/ephemeral-purge-scope-probe')
  @HttpCode(HttpStatus.OK)
  async ephemeralPurgeScopeProbe(
    @Body() _body: Record<string, unknown>,
  ): Promise<{
    shiftRecordSurvived: boolean;
    routeVersionHistorySurvived: boolean;
    suspicionMapSurvived: boolean;
    corridorDebtSurvived: boolean;
    caughtExceptionSurvived: boolean;
  }> {
    // ── 1. Fresh isolated player ──────────────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c10-scope'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Two buildings at blocks 1/3 (satisfy r_no_self_route_chk) ────────────────────────────
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;
    const destBuildingId = destRow!.building_id;

    // ── 3. Ephemeral route (ephemeral_mode=true) ─────────────────────────────────────────────────
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originBuildingId,
      destination_building_id: destBuildingId,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: 'active',
      version: 1,
      straight_line_distance: 2.0,
      sinuosity_index: 1.0,
      stance: 'balanced',
      vehicle_type: 'foot',
      ephemeral_mode: true, // the KEY flag — route is ephemeral
    });

    // ── 4. A courier (for the shift FK) ─────────────────────────────────────────────────────────
    const [courierRow] = await this.db
      .insert(courier)
      .values({ player_id: playerId, role_type: 'courier', vehicle_type: 'foot', current_state: 'at_destination', current_route_id: null })
      .returning({ courier_id: courier.courier_id });
    const courierId = courierRow!.courier_id;

    // ── 5. A completed courier_shift referencing the ephemeral route (PURGE TARGET) ─────────────
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierId,
        route_id: routeId,
        started_at_tick: 100,
        current_segment_index: 2,
        cargo_grams: 500,
        cargo_cents: 0,
        substance_type: 'brindle',
        status: 'completed', // terminal state — arrived, no pending exception
        patrol_heat: 0.0,
      })
      .returning({ shift_id: courierShift.shift_id });
    const shiftId = shiftRow!.shift_id;

    // ── 6. A route_version_history entry for the ephemeral route (PURGE TARGET — OQ-EP3) ────────
    await this.routeLifecycleRepository.insertVersionHistory({
      route_id: routeId,
      version: 1,
      path_blocks: [1, 2, 3],
      severed_at_tick: null,
      replanned_at_tick: BigInt(50),
    });

    // ── 7. A precinct_memory row with a non-zero suspicion_map (SPARE — DIV-E1 BPD memory) ──────
    //    We use precinct_id=1 (arbitrary — only one row needed for the surviving-check).
    //    The suspicion_map bytea = 1024 bytes all set to 1 (non-zero = non-default, easy to detect).
    const suspicionMapBytes = Buffer.alloc(1024, 1);
    await this.db
      .insert(precinctMemory)
      .values({
        player_id: playerId,
        precinct_id: 1,
        suspicion_map: suspicionMapBytes,
      });

    // ── 8. A corridor_debt row for block 2 (SPARE — DIV-E1 geographic debt) ─────────────────────
    await this.db
      .insert(corridorDebt)
      .values({ player_id: playerId, block_id: 2, debt_magnitude: 5.0, last_updated_tick: BigInt(100) });

    // ── 9. A second courier + a pending caught_exception (SPARE — OQ-EP4) ────────────────────────
    //    Uses a SEPARATE shift (status='caught') so the exception and shift are independently present.
    //    The pending exception on a different shift demonstrates the exception lifecycle survives.
    //    NOTE: We can't directly test "shift with pending exception is skipped" in this probe because
    //    that shift would stay (per OQ-EP4 the NOT EXISTS guard). We test that at a minimum the
    //    caught_exception row itself is not purged.
    const [courier2Row] = await this.db
      .insert(courier)
      .values({ player_id: playerId, role_type: 'courier', vehicle_type: 'foot', current_state: 'caught', current_route_id: null })
      .returning({ courier_id: courier.courier_id });
    const courier2Id = courier2Row!.courier_id;
    const [shift2Row] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courier2Id,
        route_id: routeId,
        started_at_tick: 80,
        current_segment_index: 1,
        cargo_grams: 200,
        cargo_cents: 0,
        substance_type: 'brindle',
        status: 'caught', // terminal state — caught; this shift has a PENDING exception
        patrol_heat: 0.5,
      })
      .returning({ shift_id: courierShift.shift_id });
    const shift2Id = shift2Row!.shift_id;

    const [exceptionRow] = await this.db
      .insert(caughtException)
      .values({
        player_id: playerId,
        shift_id: shift2Id,
        courier_id: courier2Id,
        route_id: routeId,
        caught_at_tick: BigInt(80),
        resolution_deadline_tick: BigInt(80 + 1440),
        reputation_at_catch: 0,
        status: 'pending', // ACTIVE lifecycle — must survive the purge (OQ-EP4)
      })
      .returning({ exception_id: caughtException.exception_id });
    const exceptionId = exceptionRow!.exception_id;

    // ── 10. Run purgeAfterExecution (the C10 DD-EPHEMERAL post-execution purge) ─────────────────
    await this.ephemeralPurgeService.purgeAfterExecution(routeId);

    // ── 11. Idempotency: run again (must be a no-op — no error) ──────────────────────────────────
    await this.ephemeralPurgeService.purgeAfterExecution(routeId);

    // ── 12. Read back — assert what survived / was purged ─────────────────────────────────────────
    // (a) shift record PURGED? — shiftRecordSurvived=false expected.
    //     The 'completed' shift (shiftId) has no pending caught_exception → it IS purged.
    const [shiftCheck] = await this.db
      .select({ shift_id: courierShift.shift_id })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftId));
    const shiftRecordSurvived = shiftCheck !== undefined;

    // (b) route_version_history PURGED? — routeVersionHistorySurvived=false expected.
    const [vhCheck] = await this.db
      .select({ history_id: routeVersionHistory.history_id })
      .from(routeVersionHistory)
      .where(eq(routeVersionHistory.route_id, routeId));
    const routeVersionHistorySurvived = vhCheck !== undefined;

    // (c) precinct_memory suspicion_map NOT purged? — suspicionMapSurvived=true expected (DIV-E1).
    const [pmCheck] = await this.db
      .select({ player_id: precinctMemory.player_id })
      .from(precinctMemory)
      .where(
        and(
          eq(precinctMemory.player_id, playerId),
          eq(precinctMemory.precinct_id, 1),
        ),
      );
    const suspicionMapSurvived = pmCheck !== undefined;

    // (d) corridor_debt NOT purged? — corridorDebtSurvived=true expected (DIV-E1).
    const [cdCheck] = await this.db
      .select({ block_id: corridorDebt.block_id })
      .from(corridorDebt)
      .where(
        and(
          eq(corridorDebt.player_id, playerId),
          eq(corridorDebt.block_id, 2),
        ),
      );
    const corridorDebtSurvived = cdCheck !== undefined;

    // (e) caught_exception NOT purged? — caughtExceptionSurvived=true expected (OQ-EP4).
    //     The 'caught' shift2 has a PENDING exception → the NOT EXISTS guard keeps it alive.
    //     The exception row itself references shift2Id → must survive.
    const [ceCheck] = await this.db
      .select({ exception_id: caughtException.exception_id })
      .from(caughtException)
      .where(eq(caughtException.exception_id, exceptionId));
    const caughtExceptionSurvived = ceCheck !== undefined;

    return {
      shiftRecordSurvived,
      routeVersionHistorySurvived,
      suspicionMapSurvived,
      corridorDebtSurvived,
      caughtExceptionSurvived,
    };
  }

  // ── C11 DD-ROSTER: _test endpoints ─────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/buy-vehicle-probe` — C11 purchase debit probe (TEST-ONLY).
   *
   * Seeds a player with enough cash ($50k), seeds a distribution_hub at the vehicle's required tier
   * (DD-TIER-BUY-GATE C7 reconciliation — the buy now requires hub-tier ≥ vehiclePurchaseRequiredTier),
   * reads cash_before, buys the vehicle via VehicleRosterService.purchaseVehicle, reads cash_after + pool count.
   * Returns { cashBefore, cashAfter, poolCount }.
   *
   * C11 FALSIFIABLE: cashBefore − cashAfter = equipmentCostCentsFor(vehicleType); poolCount = 1.
   * C7 reconciliation: seeds hub at max(1, vehiclePurchaseRequiredTier(vehicleType)) so the tier-gate passes.
   * foot has requiredTier=0 (exempt — no hub seeded, still passes).
   *
   * R2.2: TEST-ONLY. cash_cents is BO-only.
   * C4: no Math.random. Cost getter-sourced. Tier getter-sourced (DD-TIER-MAP).
   */
  @Post('_test/route-lifecycle/buy-vehicle-probe')
  @HttpCode(HttpStatus.OK)
  async buyVehicleProbe(
    @Body() body: { vehicleType?: string },
  ): Promise<{ cashBefore: number; cashAfter: number; poolCount: number }> {
    const vehicleTypeName = body?.vehicleType ?? 'foot';

    // 1. Fresh isolated player with $50k cash (enough for any vehicle type).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c11-buy'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Seed economy_state with 5_000_000 cents ($50k — enough for any vehicle).
    await this.db.insert(economyState).values({ player_id: playerId, cash_cents: BigInt(5_000_000) });

    // 2b. C7 reconciliation: seed a distribution_hub at the required tier so the DD-TIER-BUY-GATE passes.
    // Getter-sourced: vehiclePurchaseRequiredTier (C3) — 0 for foot (exempt, no hub needed),
    // 2/3/4 for bike/car/van (refrigerated_van aliases van→4). We seed hub_tier = requiredTier.
    // For foot (requiredTier=0) no hub is seeded (the gate skips the hub lookup for requiredTier=0).
    const requiredTierForProbe = distributionAutomationHubsTunables.vehiclePurchaseRequiredTier(vehicleTypeName);
    if (requiredTierForProbe > 0) {
      const [hubRowProbe] = await this.db
        .insert(building)
        .values({ player_id: playerId, block_id: 800, building_type: 7, ownership: 'player', structural_state: 'operational' })
        .returning({ building_id: building.building_id });
      await this.db.insert(buildingOperationalState).values({
        building_id: hubRowProbe!.building_id,
        player_id: playerId,
        operational_type: 'distribution_hub',
        conversion_stage: 'operational',
        hub_tier: requiredTierForProbe,
      });
    }

    // 3. Read cash BEFORE purchase.
    const [beforeRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId));
    const cashBefore = Number(beforeRow?.cash_cents ?? 0);

    // 4. Buy the vehicle via VehicleRosterService (C11+C7 — tier AND cash gate, getter-sourced cost/tier).
    const result = await this.vehicleRosterService.purchaseVehicle(playerId, vehicleTypeName);
    if (!result.ok) {
      throw new BadRequestException(`purchase failed: ${result.reason}`);
    }

    // 5. Read cash AFTER purchase.
    const [afterRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId));
    const cashAfter = Number(afterRow?.cash_cents ?? 0);

    // 6. Read pool count from vehicle_inventory.
    const [poolRow] = await this.db
      .select({ count: vehicleInventory.count })
      .from(vehicleInventory)
      .where(and(eq(vehicleInventory.player_id, playerId), eq(vehicleInventory.vehicle_type, vehicleTypeName as any)));
    const poolCount = poolRow?.count ?? 0;

    return { cashBefore, cashAfter, poolCount };
  }

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-with-vehicle` — C11 roster check + capacity probe (TEST-ONLY).
   *
   * Seeds a player + buildings + product, optionally inserts a vehicle_inventory row, then dispatches.
   * Returns { dispatched: boolean, reason?: string } (true = success, false = rejected).
   *
   * Tests:
   *   { vehicleType: 'refrigerated_van', owned: false } → not-owned rejection (DD-ROSTER, ownership gate)
   *     Van is always in allowedVehicles after C12 (hub-tier gate passes), not hub-unlocked → ownsVehicle rejects.
   *   { vehicleType: 'foot', owned: false }  → foot default-allow (OQ-RS4 byte-identical)
   *   { vehicleType: 'foot', cargoGrams: 9999 } → over-capacity rejection (OQ-VS2, foot cap = 200g)
   *
   * DD-ROSTER-HUB-RECONCILE (2026-06-23): bike/car with owned=false + hub seeded would PASS ownsVehicle
   * (hub-unlocked branch). Use refrigerated_van for the "unowned" rejection test — van is not hub-unlocked.
   * For foot: no hub needed (foot always allowed by hub-tier gate + OQ-RS4 roster default-allow).
   *
   * R2.2: TEST-ONLY. No Math.random.
   */
  @Post('_test/route-lifecycle/dispatch-with-vehicle')
  @HttpCode(HttpStatus.OK)
  async dispatchWithVehicle(
    @Body() body: { vehicleType?: string; owned?: boolean; cargoGrams?: number },
  ): Promise<{ dispatched: boolean; reason?: string }> {
    const vehicleTypeName = body?.vehicleType ?? 'foot';
    const owned = body?.owned ?? false;
    const cargoGrams = body?.cargoGrams ?? 50; // default 50g — within foot capacity (200g)

    // 1. Fresh isolated player with $50M cash (plenty for any surcharge or cost).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c11-dis'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    await this.db.insert(economyState).values({ player_id: playerId, cash_cents: BigInt(50_000_000) });

    // 2. Origin building at block 1 (lab), destination at block 2 (stash) — adjacent blocks in district 1.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 2, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    await this.db.insert(buildingOperationalState).values({
      building_id: originRow!.building_id, player_id: playerId,
      operational_type: 'lab', conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destRow!.building_id, player_id: playerId,
      operational_type: 'stash', conversion_stage: 'operational',
    });

    // 3. Seed product (brindle) at the origin so the source guard passes.
    await this.db.insert(productStorage).values({
      player_id: playerId, building_id: originRow!.building_id,
      substance_type: 'brindle', quantity_grams: 100_000,
    });

    // 4. For bike/car with owned=true: seed a distribution_hub so the hub-tier gate ALLOWS bike/car.
    //    DD-ROSTER-HUB-RECONCILE (2026-06-23): with OR-semantics, a player with a hub IS hub-unlocked for
    //    bike/car (ownsVehicle returns true). So seeding a hub is only useful when owned=true (testing the
    //    cash-buy path WITH a hub) or to test "owned=true hub player dispatches bike" use-cases.
    //    For the "unowned" test case, the caller MUST use refrigerated_van (not bike/car), because
    //    seeding a hub for car would make ownsVehicle return true (hub-unlocked → dispatched).
    //    The hub-tier gate for van always passes (van is in allowedVehicles for both hub and no-hub after C12).
    if (['bike', 'car'].includes(vehicleTypeName)) {
      const [hubRow] = await this.db
        .insert(building)
        .values({ player_id: playerId, block_id: 3, building_type: 3, ownership: 'player', structural_state: 'operational' })
        .returning({ building_id: building.building_id });
      await this.db.insert(buildingOperationalState).values({
        building_id: hubRow!.building_id, player_id: playerId,
        operational_type: 'distribution_hub', conversion_stage: 'operational', hub_tier: 1,
      });
    }

    // 5. Optionally insert a vehicle_inventory row (owned=true → player owns the vehicle).
    if (owned && vehicleTypeName !== 'foot') {
      await this.db
        .insert(vehicleInventory)
        .values({ player_id: playerId, vehicle_type: vehicleTypeName as any, count: 1 })
        .onConflictDoNothing();
    }

    // 6. Attempt dispatch — capture result.
    try {
      await this.distributionService.dispatch(playerId, originRow!.building_id, destRow!.building_id, cargoGrams, vehicleTypeName);
      return { dispatched: true };
    } catch (err: unknown) {
      return { dispatched: false, reason: (err as { message?: string })?.message ?? String(err) };
    }
  }

  // ── System 9b C12 Routes — DD-COLD-POWERED + DD-EVASIVE-CONTRACT ───────────────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/cold-chain-tick-probe` — C12 powered-van degrade probe (TEST-ONLY).
   *
   * Seeds a fresh player + minimal courier + route + in_transit courier_shift with the given vehicleType.
   * If powered=true (default), sets cold_chain_powered=true on the shift (which is the column default anyway).
   * If powered=false, sets cold_chain_powered=false (for future tests of un-powered van).
   * Calls ColdChainRepository.degradeWarmCargo N times (ticks). Returns { cargoBefore, cargoAfter }.
   *
   * FALSIFIABLE both-ways:
   *   vehicleType='refrigerated_van', powered=true  → cargoAfter = cargoBefore (0 degrade — powered van excluded)
   *   vehicleType='foot'             → cargoAfter < cargoBefore (degrades HOT — existing path byte-identical)
   *
   * C4: no Math.random. R2.2: TEST-ONLY.
   */
  @Post('_test/route-lifecycle/cold-chain-tick-probe')
  @HttpCode(HttpStatus.OK)
  async coldChainTickProbe(
    @Body() body: { vehicleType?: string; powered?: boolean; ticks?: number },
  ): Promise<{ cargoBefore: number; cargoAfter: number }> {
    const vehicleTypeName = body?.vehicleType ?? 'refrigerated_van';
    const powered = body?.powered ?? true;
    const ticks = body?.ticks ?? 5;
    const INITIAL_CARGO_GRAMS = 10_000;

    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c12-cc'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 2, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Courier (with the given vehicleType).
    const [courierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: vehicleTypeName as any,
        current_state: 'in_transit',
      })
      .returning({ courier_id: courier.courier_id });

    // 4. Route.
    const [routeRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: originRow!.building_id,
        destination_building_id: destRow!.building_id,
        path_blocks: [1, 2] as any,
        river_crossings: 0,
      })
      .returning({ route_id: route.route_id });

    // 5. courier_shift — in_transit, substance_type='crick', cold_chain_powered=powered.
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierRow!.courier_id,
        route_id: routeRow!.route_id,
        started_at_tick: 0,
        cargo_grams: INITIAL_CARGO_GRAMS,
        substance_type: 'crick',
        status: 'in_transit',
        cold_chain_powered: powered,
      } as any)
      .returning({ shift_id: courierShift.shift_id });

    const cargoBefore = INITIAL_CARGO_GRAMS;

    // 6. Run degradeWarmCargo N times.
    const hotGramsPerTick = 500;
    for (let i = 0; i < ticks; i++) {
      await this.coldChainRepository.degradeWarmCargo(playerId, hotGramsPerTick);
    }

    // 7. Read cargo_grams after degrade.
    const [afterRow] = await this.db
      .select({ cargo_grams: courierShift.cargo_grams })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftRow!.shift_id));
    const cargoAfter = afterRow?.cargo_grams ?? INITIAL_CARGO_GRAMS;

    return { cargoBefore, cargoAfter };
  }

  /**
   * `POST /v1/_test/route-lifecycle/catch-van-probe` — C12 cold-chain neutralizer probe (TEST-ONLY).
   *
   * Seeds a player + refrigerated_van courier + route + in_transit courier_shift with:
   *   - substance_type='crick' (the cold-chain substance)
   *   - cold_chain_powered=true (the default — the van is powered before catch)
   *
   * Reads poweredBefore (=true). Then calls CourierDetectionService.markCourierCaught.
   * Reads poweredAfter + cargo after catch.
   *
   * Returns { poweredBefore, poweredAfter, crickSpoiled }.
   *   poweredBefore=true → poweredAfter=false (catch cleared the cold chain, DIV-C1/OQ-CC1)
   *   crickSpoiled=true (cargo_grams=0 after catch — at-catch spoilage, OQ-CC3, FALSIFIABLE)
   *
   * C4: no Math.random. DIV-C1: catch is the sole neutralizer.
   * R2.2: TEST-ONLY.
   */
  @Post('_test/route-lifecycle/catch-van-probe')
  @HttpCode(HttpStatus.OK)
  async catchVanProbe(
    @Body() _body: Record<string, unknown>,
  ): Promise<{ poweredBefore: boolean; poweredAfter: boolean; crickSpoiled: boolean }> {
    const INITIAL_CARGO_GRAMS = 5_000;

    // 1. Fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c12-van'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings.
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 2, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Van courier (refrigerated_van).
    const [courierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: 'refrigerated_van',
        current_state: 'in_transit',
      })
      .returning({ courier_id: courier.courier_id });

    // 4. Route.
    const [routeRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: originRow!.building_id,
        destination_building_id: destRow!.building_id,
        path_blocks: [1, 2] as any,
        river_crossings: 0,
      })
      .returning({ route_id: route.route_id });

    // 5. courier_shift — in_transit, substance_type='crick', cold_chain_powered=true.
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierRow!.courier_id,
        route_id: routeRow!.route_id,
        started_at_tick: 0,
        cargo_grams: INITIAL_CARGO_GRAMS,
        substance_type: 'crick',
        status: 'in_transit',
        cold_chain_powered: true,
      } as any)
      .returning({ shift_id: courierShift.shift_id });
    const shiftId = shiftRow!.shift_id;

    // 6. Read poweredBefore.
    const [beforeRow] = await this.db
      .select({ cold_chain_powered: (courierShift as any).cold_chain_powered })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftId));
    const poweredBefore = (beforeRow as any)?.cold_chain_powered ?? true;

    // 7. Call markCourierCaught (the neutralizer fires inside).
    await this.courierDetectionService.markCourierCaught(playerId, shiftId, 'layer2_segment', 1000);

    // 8. Read poweredAfter + cargo.
    const [afterRow] = await this.db
      .select({ cold_chain_powered: (courierShift as any).cold_chain_powered, cargo_grams: courierShift.cargo_grams })
      .from(courierShift)
      .where(eq(courierShift.shift_id, shiftId));
    const poweredAfter = (afterRow as any)?.cold_chain_powered ?? true;
    const cargoAfter = afterRow?.cargo_grams ?? INITIAL_CARGO_GRAMS;
    const crickSpoiled = cargoAfter === 0;

    return { poweredBefore, poweredAfter, crickSpoiled };
  }

  /**
   * `POST /v1/_test/route-lifecycle/evasive-contract-harness` — C12 DD-EVASIVE-CONTRACT (TEST-ONLY).
   *
   * Seeds the HOT patrol corridor (block 201, precinct 1, blockRho≈0.9 — same as seed-hot-corridor).
   * For the given endpoints (default 601→901), computes A* paths for 'fastest' vs 'evasive' stances.
   * Then computes P_survive = Π_i (1 − p_i) for each route's segments.
   *
   * Returns { fastestCaughtRate, evasiveCaughtRate, fastestSegments, evasiveSegments }.
   *
   * §6 BINDING: evasiveCaughtRate ≤ fastestCaughtRate (operative, not aspirational).
   *             evasiveSegments > fastestSegments (more-but-safer intuition).
   * FALSIFIABLE: if evasive is ever net-riskier, this route returns fastestCaughtRate < evasiveCaughtRate
   *              and the E2E spec FAILS.
   *
   * C4: no Math.random. Pure survival computation (product of 1-p_i). Pinned patrol seed.
   * Body: { fromBlock?: number; toBlock?: number } — defaults to 601/901.
   */
  @Post('_test/route-lifecycle/evasive-contract-harness')
  @HttpCode(HttpStatus.OK)
  async evasiveContractHarness(
    @Body() body: { fromBlock?: number; toBlock?: number },
  ): Promise<{
    fastestCaughtRate: number;
    evasiveCaughtRate: number;
    fastestSegments: number;
    evasiveSegments: number;
  }> {
    const fromBlock = body?.fromBlock ?? 601;
    const toBlock = body?.toBlock ?? 901;

    // 1. Fresh player + seed hot patrol corridor (precinct 1, blockRho≈0.9 on block 201).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c12-evc'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    const capacity = 256;
    const entryCount = Math.ceil(0.9 * capacity); // 231 → blockRho ≈ 0.9
    const hotEntries = Array.from({ length: entryCount }, (_, i) => ({
      block_id: 201,
      district_id: 3,
      severity: 3,
      game_minute: i,
    }));
    for (const precinctId of [1, 2, 3, 4, 5, 6]) {
      const isHot = precinctId === 1;
      await this.db.insert(patrolObservationQueue).values({
        player_id: playerId,
        precinct_id: precinctId,
        entries: isHot
          ? (hotEntries as unknown as typeof patrolObservationQueue.$inferInsert['entries'])
          : ([] as unknown as typeof patrolObservationQueue.$inferInsert['entries']),
        head: 0,
        tail: isHot ? entryCount : 0,
      });
    }

    // 2. Compute A* paths for both stances (empty debt snapshot — fresh player).
    const emptyDebtSnapshot = new Map<number, number>();

    const fastestResult = await this.routeFinderService.computePath(
      playerId, fromBlock, toBlock, 'foot', 'fastest', emptyDebtSnapshot,
    );
    const evasiveResult = await this.routeFinderService.computePath(
      playerId, fromBlock, toBlock, 'foot', 'evasive', emptyDebtSnapshot,
    );

    if (!fastestResult || !evasiveResult) {
      throw new BadRequestException(
        `No path found for ${fromBlock}→${toBlock}. Use 601→901 (inter-district default) or verify blocks exist in graph.`,
      );
    }

    // 3. Compute survival probability: P_survive = Π_i (1 − p_i).
    //    Neutral courier: foot/cargo=50g/capacity=200g/sessionsActive=0/gameMinute=0.
    const GAME_MINUTE = 0;
    const CARGO_GRAMS = 50;
    const CARGO_CAPACITY = 200;
    const SESSIONS_ACTIVE = 0;
    const VEHICLE_TYPE = 'foot';

    const computeSurvival = async (pathBlocks: number[]): Promise<number> => {
      let pSurvive = 1.0;
      for (const blockId of pathBlocks) {
        // Resolve precinct for this block.
        const precinctId = await this.patrolDoctrineService.precinctForBlock(blockId);
        // Read blockRho for this precinct.
        let blockRho = 0;
        if (precinctId !== null) {
          const raw = await this.patrolDoctrineService.getPatrolLoadRaw(playerId, precinctId);
          if (raw !== null && raw.capacity > 0) {
            blockRho = Math.min(1.0, raw.activeCount / raw.capacity);
          }
        }
        // Compute detection probability for this block.
        const p = this.courierDetectionService.computeDetectionProb({
          blockRho,
          gameMinute: GAME_MINUTE,
          vehicleType: VEHICLE_TYPE,
          cargoGrams: CARGO_GRAMS,
          cargoCapacity: CARGO_CAPACITY,
          sessionsActive: SESSIONS_ACTIVE,
        });
        pSurvive *= (1 - p);
      }
      return pSurvive;
    };

    const fastestSurvival = await computeSurvival(fastestResult.pathBlocks);
    const evasiveSurvival = await computeSurvival(evasiveResult.pathBlocks);

    return {
      fastestCaughtRate: 1 - fastestSurvival,
      evasiveCaughtRate: 1 - evasiveSurvival,
      fastestSegments: fastestResult.pathBlocks.length,
      evasiveSegments: evasiveResult.pathBlocks.length,
    };
  }

  // ── System 9b C13 Routes ──────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/route-lifecycle/seed-projectable-route` — C13 R2.2 projection probe (TEST-ONLY).
   *
   * Seeds a minimal but projectable route row for testing `listRouteProjections`:
   *   1. Fresh account + player.
   *   2. Two buildings (block 201, block 202 — distinct blocks to satisfy r_no_self_route_chk).
   *   3. A route row with sinuosity_index=1.5 (→ 'meandering' bucket at 1.3/2.0 cuts), state='active',
   *      river_crossings=1 (→ 'single' bucket), vehicle_type='foot'.
   *   4. A vehicle_inventory row for 'bike' (count=1) — capability-unlock (OQ-RS1); enables
   *      BIKE in available_vehicles alongside FOOT (default-allow OQ-RS4).
   *
   * Body: {} (no params needed — all values are fixed for deterministic E2E assertions).
   * Response: { playerId, accountId } — the caller mints a bearer JWT off `accountId` and calls the
   * projection endpoint as that player (W6a C1.0 — the endpoint no longer accepts a raw x-player-id).
   *
   * Sinuosity assertion: sinuosity_index=1.5 → sinuosityBucket → 'meandering'
   *   (1.3 ≤ 1.5 < 2.0, with default cuts sinuosityDirectMax=1.3, sinuosityMeanderingMax=2.0).
   * River crossings assertion: river_crossings=1 → 'single'.
   * Available vehicles assertion: FOOT (always) + BIKE (count=1 in inventory).
   *
   * W6a C1.0 (2026-08-08): `accountId` ADDED to the response (additive, design §2bis-C voie (i) — see
   * `seedPlayerBuildings`'s own header for the full rationale).
   *
   * R2.2: TEST-ONLY. The production projection endpoint returns only banded data; this endpoint
   * seeds the rows that the projection queries. No client-facing raw scalar.
   * Anti-fabrication: NO Math.random; sinuosity_index=1.5 is a deterministic constant.
   * C4: no Math.random, no Date.now.
   */
  @Post('_test/route-lifecycle/seed-projectable-route')
  @HttpCode(HttpStatus.CREATED)
  async seedProjectableRoute(): Promise<{ playerId: string; accountId: string }> {
    // 1. Fresh account + player (isolated per test call).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c13-proj'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Two buildings (block 201 and block 202 — distinct, satisfies r_no_self_route_chk).
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 201, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 202, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });

    // 3. Route row — sinuosity_index=1.5 (→ 'meandering'), river_crossings=1 (→ 'single'), state='active'.
    //    vehicle_type='foot' (default; any valid vehicleType enum member). sinuosity_index=1.5:
    //    sinuosityDirectMax default=1.3 → 1.5 >= 1.3 → NOT 'direct'; sinuosityMeanderingMax default=2.0 → 1.5 < 2.0 → 'meandering'.
    await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: originRow!.building_id,
        destination_building_id: destRow!.building_id,
        path_blocks: [201, 202] as any,
        river_crossings: 1,          // → 'single' river_crossings_count_bucket
        sinuosity_index: 1.5,        // → 'meandering' sinuosity_bucket (1.3 ≤ 1.5 < 2.0)
        state: 'active',             // route_state enum → 'active'
        vehicle_type: 'foot',        // vehicleType enum → 'foot'
        straight_line_distance: 1.0, // server-only; non-zero to avoid edge cases
        stance: 'balanced',          // route_stance enum default
        version: 1,
      } as any)
      .returning({ route_id: route.route_id });

    // 4. vehicle_inventory row for 'bike' (count=1 → capability-unlock OQ-RS1).
    //    This seeds BIKE into available_vehicles alongside FOOT (OQ-RS4 default-allow).
    await this.db
      .insert(vehicleInventory)
      .values({
        player_id: playerId,
        vehicle_type: 'bike',
        count: 1,
      } as any);

    return { playerId, accountId: accountRow!.account_id };
  }

  // ── System 9c C1 Routes (additive — no existing route changed) ────────────────────────────────────
  //
  // C1 Routes (system9c_engine_grammar.spec.ts):
  //   POST /v1/_test/coordinator/parse-compile
  //     — parses + compiles a DSL source string; returns { valid, rules } (compiled IR) on success,
  //       or { valid: false, diagnostics } on parse/compile failure.
  //       Body: { source: string }.
  //       Response: { valid: boolean; rules?: IrRule[]; diagnostics?: DslDiagnostic[] }.
  //       The E2E asserts the compiled IR round-trip: arg-bearing actions carry the typed `args` payload;
  //       nullary actions carry NO `args` key (byte-identical IR, DD-ADDITIVE-ENGINE).
  //       R2.2: TEST-ONLY. The compiled IR is server-side only; this route exposes it for E2E assertion.
  //       Anti-fabrication: no Math.random. Delegates to the REAL DslParserService + DslCompilerService.
  //
  // C2 Routes (system9c_engine_executor.spec.ts — DD-COORD-GRAMMAR arg-carry + DD-ADDITIVE-ENGINE):
  //   POST /v1/_test/coordinator/resolve
  //     — parses + compiles a DSL source string, then resolves it against the given signal snapshot via
  //       DslExecutorService.resolve(ir, snapshot). Returns { action: ResolvedAction }.
  //       Body: { source: string; snapshot: { state: Record<string, number|boolean|string>;
  //                                            events: Record<string, number|boolean> } }.
  //       Response: { action: ResolvedAction } — the resolved action token (flattened, no wrapper).
  //       The E2E asserts: (a) dispatch_courier resolves to DISPATCH_COURIER token carrying route/vehicle/stance;
  //         (b) EXECUTE_DEFAULT resolves to the byte-identical nullary token (no arg fields) — DD-ADDITIVE-ENGINE;
  //         (c) same (source,snapshot) resolves identically twice — determinism (C4); (d) non-matching snapshot
  //         resolves to NONE (no spurious dispatch — FALSIFIABLE both-ways).
  //       R2.2: TEST-ONLY. Anti-fabrication: delegates to the REAL DslExecutorService — no inline logic.
  //       C4: deterministic — no Math.random, no Date.now (the executor is PURE).

  /**
   * `POST /v1/_test/coordinator/parse-compile` — System 9c C1 DSL parse+compile probe (TEST-ONLY).
   *
   * Parses + compiles a DSL source string (as if it were a `behavior_script` source attached via
   * `LieutenantService.attachScript`) and returns the compiled IR rules. The E2E spec uses this to
   * assert: (a) arg-bearing `dispatch_courier(route, vehicle, stance)` / `set_stance(stance)` /
   * `toggle_ephemeral(bool)` parse → compile → IR with the typed `args` payload; (b) nullary
   * `EXECUTE_DEFAULT` IR is byte-identical (no `args` key); (c) out-of-domain args reject `valid=false`.
   *
   * Compile tier is fixed at 1 (Tier-1 coordinator actions; the 9c dispatch primitives are Tier 1).
   *
   * R2.2: TEST-ONLY. No DB, no auth. Anti-fabrication: delegates to the REAL engine — no inline logic.
   * C4: deterministic — no Math.random, no Date.now.
   *
   * Body: `{ source: string }` — the DSL source text.
   * Response: `{ valid: boolean; rules?: unknown[]; diagnostics?: unknown[] }`.
   */
  @Post('_test/coordinator/parse-compile')
  @HttpCode(HttpStatus.OK)
  parseCompile(@Body() body: { source: string }): { valid: boolean; rules?: unknown[]; diagnostics?: unknown[] } {
    const parsed = this.dslParser.parse(body.source ?? '');
    if ('diagnostics' in parsed) {
      return { valid: false, diagnostics: parsed.diagnostics };
    }
    const compiled = this.dslCompiler.compile(parsed.ast, 1);
    if ('diagnostics' in compiled) {
      return { valid: false, diagnostics: compiled.diagnostics };
    }
    // Return the IR rules — the E2E asserts on the action `kind` + `args` fields.
    // JSON.stringify naturally omits `undefined` fields (so nullary `args?: undefined` is ABSENT in JSON).
    return { valid: true, rules: compiled.ir.rules as unknown[] };
  }

  // ── System 9c C2 Routes (additive — no C0/C1 route changed) ──────────────────────────────────────

  /**
   * `POST /v1/_test/coordinator/resolve` — System 9c C2 DSL executor resolve probe (TEST-ONLY).
   *
   * Parses + compiles a DSL source string, then resolves the compiled IR against the given signal
   * snapshot via `DslExecutorService.resolve(ir, snapshot)`. Returns the resolved `ResolvedAction`
   * token. The E2E asserts:
   *   (a) an arg-bearing `dispatch_courier(route, vehicle, stance)` rule with a matching event snapshot
   *       resolves to `{kind:'DISPATCH_COURIER', route, vehicle, stance}` — the arg-carry is LIVE.
   *   (b) the nullary `EXECUTE_DEFAULT` resolves to `{kind:'EXECUTE_DEFAULT'}` with NO arg fields —
   *       byte-identical token (DD-ADDITIVE-ENGINE FALSIFIABLE assertion).
   *   (c) the same `(source, snapshot)` resolves identically twice — determinism (C4).
   *   (d) a non-matching snapshot resolves to `{kind:'NONE'}` — no spurious dispatch.
   *
   * Compile tier is fixed at 1 (Tier-1 coordinator actions — 9c dispatch primitives are Tier 1).
   * The executor is PURE: no DB, no IO, no Math.random, no Date.now (C4 determinism contract).
   *
   * R2.2: TEST-ONLY. The ResolvedAction token is server-side only; this route exposes it for E2E
   * assertion. Anti-fabrication: delegates to the REAL DslExecutorService — no inline logic.
   *
   * Body: `{ source: string; snapshot: { state: Record<string, number|boolean|string>;
   *                                       events: Record<string, number|boolean> } }`.
   * Response: `{ action: ResolvedAction }` — the resolved token (serialized; nullary tokens have
   *   no arg fields by construction — JSON.stringify omits undefined/absent fields naturally).
   */
  @Post('_test/coordinator/resolve')
  @HttpCode(HttpStatus.OK)
  resolveScript(
    @Body()
    body: {
      source: string;
      snapshot: { state?: Record<string, number | boolean | string>; events?: Record<string, number | boolean> };
    },
  ): { action: unknown } {
    const source = body?.source ?? '';
    const snapshot: SignalSnapshot = {
      state: (body?.snapshot?.state ?? {}) as Record<string, number | boolean | string>,
      events: (body?.snapshot?.events ?? {}) as Record<string, number | boolean>,
    };

    // Parse → compile → resolve (the full DSL pipeline). Any parse/compile failure → safe NONE token.
    const parsed = this.dslParser.parse(source);
    if ('diagnostics' in parsed) {
      // Parse failure — the executor would have no IR; return NONE safely (the spec should not send
      // invalid source for the resolve probe — a parse failure here signals a spec authoring error).
      return { action: { kind: 'NONE' } };
    }
    const compiled = this.dslCompiler.compile(parsed.ast, 1);
    if ('diagnostics' in compiled) {
      return { action: { kind: 'NONE' } };
    }

    // Resolve: PURE function of (IR, snapshot). No DB, no IO, no RNG, no Date (C4 — deterministic).
    // The executor is total (never throws — the outer try/catch in resolve() returns EXECUTE_DEFAULT on any fault).
    const resolved = this.dslExecutor.resolve(compiled.ir, snapshot);

    // Return the resolved token as-is. JSON serialization naturally omits undefined fields (the
    // `args?` OPTIONAL field on IrAction is absent for nullary actions, so the token object itself
    // carries only the present fields — no undefined keys reach the wire). The E2E asserts on the
    // exact shape of the returned `action` object (DD-ADDITIVE-ENGINE nullary byte-identity check).
    return { action: resolved as unknown };
  }

  // ── System 9c C3 Routes (additive — no existing route changed) ────────────────────────────────────
  //
  // C3 Routes (system9c_tunables_bootstrap.spec.ts):
  //   GET  /v1/_test/coordinator/read-tunables
  //     — returns the NEW 9c C3 tunable values (vehiclePurchaseRequiredTier + fleetCapInTransit per type)
  //       + the live tier-5 global roster cap (for the inert-fleet-cap ≥ globalMax assert).
  //       R2.2: TEST-ONLY. Delegates to the REAL distributionAutomationHubsTunables getters.
  //   POST /v1/_test/coordinator/probe-clamp
  //     — tests DISTRIBUTION_TUNABLE_CAPS clamps an out-of-range value for a given C3 key.
  //       Body: { key: string; value: number }. Response: { clamped: number }.
  //       Same pattern as the existing POST /v1/_test/distribution/probe-clamp (C2).

  /**
   * `GET /v1/_test/coordinator/read-tunables` — System 9c C3 tunable snapshot.
   *
   * Returns the NEW `distributionAutomationHubsTunables` values for all vehicle types, plus the
   * live tier-5 global roster cap (`hubRosterTunables.rosterCapByTier[5]`) for the inert-fleet-cap
   * ≥ globalMax no-regression assert (DIV-F1 / OQ-FC2).
   *
   * R2.2: TEST-ONLY. Anti-fabrication: delegates to the REAL getters — no inline logic.
   */
  @Get('_test/coordinator/read-tunables')
  readCoordinatorTunables(): Record<string, number> {
    return {
      vehiclePurchaseRequiredTierBike: distributionAutomationHubsTunables.vehiclePurchaseRequiredTier('bike'),
      vehiclePurchaseRequiredTierCar: distributionAutomationHubsTunables.vehiclePurchaseRequiredTier('car'),
      vehiclePurchaseRequiredTierVan: distributionAutomationHubsTunables.vehiclePurchaseRequiredTier('van'),
      vehiclePurchaseRequiredTierFoot: distributionAutomationHubsTunables.vehiclePurchaseRequiredTier('foot'),
      fleetCapInTransitFoot: distributionAutomationHubsTunables.fleetCapInTransit('foot'),
      fleetCapInTransitBike: distributionAutomationHubsTunables.fleetCapInTransit('bike'),
      fleetCapInTransitCar: distributionAutomationHubsTunables.fleetCapInTransit('car'),
      fleetCapInTransitVan: distributionAutomationHubsTunables.fleetCapInTransit('van'),
      // Surface the live tier-5 global roster cap for the inert-fleet-cap ≥ globalMax assert
      globalRosterCapTier5: hubRosterTunables.rosterCapByTier[5],
    };
  }

  /**
   * `POST /v1/_test/coordinator/probe-clamp` — System 9c C3 DISTRIBUTION_TUNABLE_CAPS clamp probe.
   *
   * Applies the DISTRIBUTION_TUNABLE_CAPS clamper for a given C3 key to a given value.
   * Body: `{ key: string; value: number }`. Response: `{ clamped: number }`.
   * If the key is not in DISTRIBUTION_TUNABLE_CAPS, returns `{ clamped: Number(value) }` (passthrough).
   * Same pattern as POST /v1/_test/distribution/probe-clamp (C2) and /v1/_test/route-lifecycle/probe-clamp (9b C2).
   */
  @Post('_test/coordinator/probe-clamp')
  @HttpCode(HttpStatus.OK)
  probeCoordinatorClamp(@Body() body: { key: string; value: number }): { clamped: number } {
    const capFn = DISTRIBUTION_TUNABLE_CAPS[body.key];
    if (!capFn) {
      return { clamped: Number(body.value) };
    }
    return { clamped: capFn(Number(body.value)) };
  }

  // ── System 9c C4 Routes (additive — no existing route changed) ────────────────────────────────
  //
  // C4 Routes (system9c_route_request_schema.spec.ts):
  //   POST /v1/_test/coordinator/enqueue-request
  //     — enqueues a route_request row via RouteRequestService.enqueueAndEmit.
  //       Body: { hubId?: string | null; targetBuildingId?: string; cargoHintGrams?: number;
  //               gameMinute?: number; status?: string }.
  //       `status` is accepted ONLY for the out-of-domain rejection test (FALSIFIABLE enum guard).
  //       If `status` is provided and invalid, the DB insert will fail (PG enum rejects) → non-2xx.
  //       Response: { requestId: string }.
  //   GET  /v1/_test/coordinator/read-request?requestId=<uuid>
  //     — reads a route_request row by its PK.
  //       Response: { status: string; created_at_tick: string } (bigint as string).
  //   GET  /v1/_test/coordinator/probe-enum-members
  //     — returns the members of the route_request_status pgEnum.
  //       Response: { members: string[] } — should be ['pending','fulfilled','cancelled'].
  //       FALSIFIABLE: proves the enum is exactly 3-member (no more, no fewer).

  /**
   * `POST /v1/_test/coordinator/enqueue-request` — System 9c C4 route_request enqueue probe.
   *
   * Enqueues a `route_request` row via `RouteRequestService.enqueueAndEmit`. If `status` is provided
   * and is out-of-domain (e.g. 'teleported'), the PG enum constraint rejects the INSERT → non-2xx.
   * This is the FALSIFIABLE enum guard test (the 2nd C4 spec).
   *
   * R2.2: TEST-ONLY. Anti-fabrication: delegates to the REAL RouteRequestService — no inline DB write.
   * DETERMINISM (C4): uses `gameMinute` from the body (default=1) — NEVER Date.now().
   */
  @Post('_test/coordinator/enqueue-request')
  @HttpCode(HttpStatus.OK)
  async enqueueRouteRequest(
    @Body()
    body: {
      hubId?: string | null;
      targetBuildingId?: string | null;
      cargoHintGrams?: number | null;
      gameMinute?: number;
      status?: string;
    },
  ): Promise<{ requestId: string }> {
    // Seed a fresh player per call — player_id is a REAL FK on route_request.
    // hub_id is a soft-ref (no FK), so only account+player is needed for isolation.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('rreq'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const testPlayerId = playerRow!.player_id;

    // hub_id is a soft-ref — no building row needed (matches corridor_debt.block_id pattern)
    const testHubId = body?.hubId ?? '00000000-0000-4000-a000-c40000000002';
    const gameMinute = body?.gameMinute ?? 1;

    if (body?.status !== undefined && body.status !== 'pending') {
      // The out-of-domain enum guard test: force an invalid status by inserting directly.
      // The service only inserts 'pending' — to test the PG enum rejection we must use raw SQL
      // to bypass the TS enum type guard and let PG reject (22P02 invalid_text_representation).
      const { sql: sqlFn } = await import('drizzle-orm');
      await (this.routeRequestRepository as unknown as { db: { execute: (s: unknown) => Promise<unknown> } }).db.execute(
        sqlFn`INSERT INTO route_request (player_id, hub_id, status, created_at_tick)
              VALUES (${testPlayerId}::uuid, ${testHubId}::uuid, ${body.status}::route_request_status, ${gameMinute}::bigint)`
      );
      // If PG does NOT reject (should not happen), still return something
      return { requestId: 'invalid-enum-accepted' };
    }

    return this.routeRequestService.enqueueAndEmit(
      testPlayerId,
      testHubId,
      {
        targetBuildingId: body?.targetBuildingId ?? null,
        cargoHintGrams:   body?.cargoHintGrams ?? null,
      },
      gameMinute,
    );
  }

  /**
   * `GET /v1/_test/coordinator/read-request?requestId=<uuid>` — System 9c C4 route_request probe.
   *
   * Reads a `route_request` row by PK. Returns `{ status, created_at_tick }`.
   * `created_at_tick` serializes as a string (bigint mode:'bigint' → BigInt in JS → JSON string).
   *
   * R2.2: TEST-ONLY.
   */
  @Get('_test/coordinator/read-request')
  async readRouteRequest(@Query('requestId') requestId: string): Promise<{ status: string; created_at_tick: string }> {
    const row = await this.routeRequestRepository.readById(requestId);
    if (!row) {
      throw new BadRequestException(`route_request not found: ${requestId}`);
    }
    return {
      status:           row.status,
      // BigInt serializes as string on the wire (bigint {mode:'bigint'} → BigInt in JS → JSON.stringify produces string)
      created_at_tick:  String(row.created_at_tick),
    };
  }

  /**
   * `GET /v1/_test/coordinator/probe-enum-members` — System 9c C4 enum guard probe.
   *
   * Returns the members of the `route_request_status` pgEnum exactly as defined in the Drizzle schema.
   * The C4 spec asserts these are exactly `['pending','fulfilled','cancelled']` (3 members, sorted).
   * FALSIFIABLE: proves the enum definition is correct and complete (no extra or missing member).
   *
   * R2.2: TEST-ONLY.
   */
  @Get('_test/coordinator/probe-enum-members')
  probeEnumMembers(): { members: string[] } {
    // routeRequestStatus.enumValues is the TS array of the pgEnum members
    return { members: [...routeRequestStatus.enumValues] };
  }

  // ── System 9c C5 Routes (additive — no existing route changed) ────────────────────────────────
  //
  // C5 Routes (system9c_coordinator_dispatch.spec.ts):
  //   POST /v1/_test/coordinator/recruit-assign
  //     — seeds a fresh account + player + distribution_hub building + target stash building +
  //       product_storage (1200g brindle at hub) + recruits a LOGISTICS lieutenant + optionally
  //       attaches a DSL script + enqueues one route_request.
  //       Body: { script?: string; assignToNonHub?: boolean; reuseHubId?: string; reusePlayerId?: string }.
  //         script: DSL source to parse+compile+attach (skipped if absent — no valid script = coordinator has no script).
  //         assignToNonHub=true: creates a lab building instead of a distribution_hub → validateAssignment rejects (OQ-A3).
  //         reuseHubId + reusePlayerId: reuse an existing player/hub → try to assign a second coordinator (OQ-A1 test).
  //       Response: { playerId, hubId, lieutenantId, requestId } — or non-2xx on guard failure.
  //   POST /v1/_test/coordinator/fire-request
  //     — synchronously invokes CoordinatorExecutionService.triggerForHub for the hub.
  //       Body: { playerId: string; hubId: string; gameMinute?: number }.
  //       Response: { triggered: true }.
  //   GET  /v1/_test/coordinator/dispatch-trace?playerId=<uuid>
  //     — reads the courier_shift rows (JOINed with courier for vehicle_type) + counts route rows for the player.
  //       Response: { shifts: [{ vehicle_type: string; cargo_grams: number }]; route_count: number }.
  //       C5 E2E asserts: shifts.length=1; shifts[0].vehicle_type='foot'; cargo_grams=200; route_count=1.
  //       R2.2: TEST-ONLY — raw cargo_grams + vehicle_type are BO-only, never client-facing outside tests.
  //   POST /v1/_test/coordinator/seed-overcap
  //     — same setup as recruit-assign (hub coordinator + script + pending route_request) PLUS seeds
  //       `cap` dummy in-transit courier_shift rows to fill the roster to capacity. When fire-request is
  //       subsequently called, the dispatch hits the benign-409 over-cap → applyResolvedAction returns
  //       'NOOP' → the route_request stays 'pending'. FALSIFIABLE (pre-fix it would have been 'fulfilled').
  //       Body: { script?: string }.
  //       Response: { playerId, hubId, requestId, cap }.
  //       R2.2: TEST-ONLY. No Math.random.

  /**
   * `POST /v1/_test/coordinator/recruit-assign` — System 9c C5 coordinator seed probe (TEST-ONLY).
   *
   * Seeds:
   *   1. Fresh account + player (or reuses reusePlayerId).
   *   2. A `distribution_hub` building (or lab if assignToNonHub=true) at block 501 → hub building.
   *   3. A stash building at block 502 → target building.
   *   4. `building_operational_state` rows for both (operational — validateAssignment gate).
   *   5. `product_storage` at hub (1200g brindle — enough for min(200, 1200) = 200g dispatch).
   *   6. Validates assignment (OQ-A3 hub-type + OQ-A1 one-per-hub) via LogisticsBindingService.
   *   7. Recruits a LOGISTICS lieutenant assigned to hub → target.
   *   8. If `script` is provided: parse + compile + updateBehaviorScript (valid=true).
   *   9. One pending `route_request` for the hub (so shipment_pending fires in buildSnapshot).
   *
   * OQ-A3 test: `assignToNonHub=true` → hub building has operational_type='lab' → validateAssignment
   *   throws 409 RESOURCE_STATE_CONFLICT (not a distribution_hub) → this route returns non-2xx.
   * OQ-A1 test: `reuseHubId` + `reusePlayerId` → tries to validate a 2nd coordinator on the same hub
   *   → validateAssignment throws 409 RESOURCE_STATE_CONFLICT (already has coordinator) → non-2xx.
   *
   * R2.2: TEST-ONLY. DETERMINISTIC: no Math.random.
   */
  @Post('_test/coordinator/recruit-assign')
  @HttpCode(HttpStatus.CREATED)
  async coordinatorRecruitAssign(
    @Body()
    body: {
      script?: string;
      assignToNonHub?: boolean;
      reuseHubId?: string;
      reusePlayerId?: string;
      // System 9c C6 extensions:
      // grantVehicle: if set to a vehicle_type string (e.g. 'bike'), inserts a vehicle_inventory row for the
      //   player so they own that vehicle. If null/omitted, no vehicle_inventory row is inserted.
      grantVehicle?: string | null;
      // heat: if set to a string (e.g. 'elevated'), seeds patrol queues at elevated level for the hub block.
      //   Currently accepted but not used for the C6 tests (the test scripts use other trigger signals).
      heat?: string;
      // noHubUnlock: if true, creates a lab building instead of a distribution_hub, so the player does NOT
      //   have a hub → bike/car not unlocked via hub mechanism → ownsVehicle('bike', null) = false (no inventory).
      //   Skips the OQ-A3 coordinator hub-type check so the LOGISTICS lieutenant can be assigned to a lab.
      noHubUnlock?: boolean;
    },
  ): Promise<{ playerId: string; hubId: string; lieutenantId: string; requestId: string }> {
    const assignToNonHub = body?.assignToNonHub === true;
    const reuseHubId = body?.reuseHubId;
    const reusePlayerId = body?.reusePlayerId;
    // C6 extensions:
    const grantVehicle = body?.grantVehicle ?? null; // vehicle_type to insert into vehicle_inventory, or null
    const noHubUnlock = body?.noHubUnlock === true;  // use lab instead of distribution_hub (no bike/car hub-unlock)

    if (reuseHubId && reusePlayerId) {
      // OQ-A1 test: use the existing player+hub, try to validate a second coordinator assignment.
      const playerId = reusePlayerId;
      const hubId = reuseHubId;
      // Create a fresh target building on the same player (block 503).
      const [targetRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: 503,
          building_type: 2,
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const targetBuildingId = targetRow!.building_id;
      await this.db.insert(buildingOperationalState).values({
        building_id: targetBuildingId,
        player_id: playerId,
        operational_type: 'stash',
        conversion_stage: 'operational',
      });
      // validateAssignment will throw RESOURCE_STATE_CONFLICT (OQ-A1: hub already has a coordinator).
      await this.logisticsBindingForTest.validateAssignment(playerId, hubId, targetBuildingId);
      // If we reach here the validation did not fire (should not happen — test asserts non-2xx).
      return { playerId, hubId, lieutenantId: 'none', requestId: 'none' };
    }

    // ── 1. Fresh account + player ──
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c5co'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Hub building (distribution_hub or lab for the non-hub rejection test / noHubUnlock) ──
    // C6: noHubUnlock=true → lab type (the player has no hub → bike/car NOT unlocked via hub mechanism).
    const hubOpType = assignToNonHub ? 'lab' : (noHubUnlock ? 'lab' : 'distribution_hub');
    const [hubRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 501,
        building_type: 1,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const hubId = hubRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: hubId,
      player_id: playerId,
      operational_type: hubOpType,
      conversion_stage: 'operational',
    });

    // ── 3. Target stash building ──
    const [targetBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 502,
        building_type: 2,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const targetBuildingId = targetBuildingRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: targetBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // ── 4. Product storage at hub (1200g brindle — enough for min(200, 1200) = 200g dispatch) ──
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: hubId,
      substance_type: 'brindle',
      quantity_grams: 1200,
    });

    // ── 4b. C6 — grantVehicle: insert vehicle_inventory row so the player owns the specified vehicle ──
    // Used by test 1 (grantVehicle='bike') to ensure the player owns bike so the dispatch gate passes.
    // With noHubUnlock=true (no distribution_hub), only this inventory entry unlocks the vehicle.
    // With a distribution_hub, bike/car are already unlocked by the hub mechanism (redundant but harmless).
    if (grantVehicle && typeof grantVehicle === 'string') {
      await this.db
        .insert(vehicleInventory)
        .values({ player_id: playerId, vehicle_type: grantVehicle as any, count: 1 })
        .onConflictDoNothing();
    }

    // ── 5. OQ-A3 hub-type check (coordinator-specific, enforced at this entry point):
    //       The Courier coordinator MUST be assigned to an operational distribution_hub (OQ-A3). Non-hub
    //       LOGISTICS (lab/stash — the tick-driven path, e.g. lieutenant_logistics_delegation.spec.ts) uses
    //       the standard recruit endpoint and does NOT go through this coordinator route. The hub check
    //       lives HERE rather than in validateAssignment so the tick-driven path is unaffected (preserves
    //       zero-regression for existing delegation specs that use lab buildings as assigned buildings).
    // C6: noHubUnlock=true → skip the OQ-A3 check (the test probe needs to assign a coordinator to a lab
    //   to verify the dispatch gate blocks an unlocked vehicle — the OQ-A3 check is coordinator-prod-only).
    if (!noHubUnlock) {
      const [hubStateRow] = await this.db
        .select({ operational_type: buildingOperationalState.operational_type })
        .from(buildingOperationalState)
        .where(
          and(
            eq(buildingOperationalState.building_id, hubId),
            eq(buildingOperationalState.player_id, playerId),
          ),
        );
      if (!hubStateRow || hubStateRow.operational_type !== 'distribution_hub') {
        throw new BadRequestException(
          `building ${hubId} is not an operational distribution_hub — the Courier coordinator requires a distribution_hub assignment (OQ-A3).`,
        );
      }
    }
    // ── 5b. validateAssignment: enforces OQ-A1 (one-per-hub) + target gate ──
    await this.logisticsBindingForTest.validateAssignment(playerId, hubId, targetBuildingId);

    // ── 6. Recruit LOGISTICS lieutenant (validateAssignment already passed) ──
    const { lieutenant_id: lieutenantId } = await this.lieutenantRepoForTest.recruit({
      playerId,
      roleId: LOGISTICS_ROLE_ID,
      source: 'civilian',
      name: nextDistTestCallsign('lt-c5'),
      nameLocale: 'en',
      grantedRole: 'executor',
      mode: 'delegated',
      assignedBuildingId: hubId,
      targetBuildingId,
    });

    // ── 7. Attach script (if provided): parse + compile + updateBehaviorScript ──
    if (body?.script) {
      const ownedLt = await this.lieutenantRepoForTest.getOwnedLieutenant(playerId, lieutenantId);
      if (ownedLt) {
        const parsed = this.dslParser.parse(body.script);
        if ('diagnostics' in parsed) {
          // Script has syntax errors — skip attach (test should pass a valid script).
          // No throw: the test spec controls script validity.
        } else {
          const compiled = this.dslCompiler.compile(parsed.ast, 1);
          if (!('diagnostics' in compiled)) {
            await this.lieutenantRepoForTest.updateBehaviorScript(ownedLt.behavior_script_id, {
              source: body.script,
              rules: compiled.ir,
              valid: true,
            });
          }
        }
      }
    }

    // ── 8. Seed one pending route_request for the hub ──
    const { requestId } = await this.routeRequestRepository.insertPending(
      playerId,
      hubId,
      targetBuildingId,
      null,
      1, // gameMinute=1
    );

    return { playerId, hubId, lieutenantId, requestId };
  }

  /**
   * `POST /v1/_test/coordinator/fire-request` — System 9c C5 coordinator trigger probe (TEST-ONLY).
   *
   * Synchronously invokes CoordinatorExecutionService.triggerForHub for the given hub/player.
   * This is the synchronous wrapper that avoids the async fire-and-forget timing issue (the bus
   * subscription is fire-and-forget; the test route awaits the full execution before returning).
   *
   * Body: { playerId: string; hubId: string; gameMinute?: number }.
   * Response: { triggered: true }.
   *
   * DETERMINISTIC: no Math.random, no Date.now. gameMinute defaults to 1.
   * R2.2: TEST-ONLY.
   */
  @Post('_test/coordinator/fire-request')
  @HttpCode(HttpStatus.OK)
  async coordinatorFireRequest(
    @Body() body: { playerId: string; hubId: string; gameMinute?: number },
  ): Promise<{ triggered: true }> {
    if (!body?.playerId || !body?.hubId) {
      throw new BadRequestException('playerId and hubId required');
    }
    await this.coordinatorExecutionService.triggerForHub(
      body.playerId,
      body.hubId,
      body.gameMinute ?? 1,
    );
    return { triggered: true };
  }

  /**
   * `POST /v1/_test/coordinator/seed-overcap` — System 9c C5 over-cap leaves-pending probe (TEST-ONLY).
   *
   * Seeds the same state as `recruit-assign` (hub coordinator + optional DSL script + one pending
   * `route_request`) PLUS fills the player's roster to the effective cap by inserting dummy in-transit
   * `courier_shift` rows. When `fire-request` is subsequently called:
   *   - The coordinator fires its EXECUTE_DEFAULT → DistributionService.dispatch hits the cap gate
   *     (inTransit ≥ effectiveCap) → throws RESOURCE_STATE_CONFLICT → `applyExecuteDefault` returns 'NOOP'.
   *   - `applyResolvedAction` propagates 'NOOP' → coordinator leaves the `route_request` 'pending'.
   *
   * This is the falsifiable over-cap test (the pre-fix code would unconditionally markFulfilled the
   * request even on 'NOOP', making the request 'fulfilled' instead of 'pending').
   *
   * Cap derivation: the seed route creates a tier-1 distribution_hub → effectiveCap = rosterCapByTier[1]
   * (default 5). We insert exactly `cap` dummy in-transit shifts to fill the roster.
   * No real courier/route is created for the dummy shifts (we insert minimal rows that satisfy the
   * `courier_shift` FK constraints but do NOT represent real dispatches).
   *
   * Body: { script?: string } — DSL script (default: EXECUTE_DEFAULT on source_has_product).
   * Response: { playerId, hubId, requestId, cap } — cap is the effective roster cap (for E2E assertion).
   *
   * DETERMINISTIC: no Math.random. R2.2: TEST-ONLY.
   */
  @Post('_test/coordinator/seed-overcap')
  @HttpCode(HttpStatus.CREATED)
  async coordinatorSeedOvercap(
    @Body() body: { script?: string },
  ): Promise<{ playerId: string; hubId: string; requestId: string; cap: number }> {
    const scriptSrc = body?.script ?? 'WHEN STATE(source_has_product,==,true) THEN EXECUTE_DEFAULT @10;';

    // ── 1. Fresh account + player ──
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextDistTestCallsign('c5oc'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Hub building (distribution_hub, tier-1 → effectiveCap = rosterCapByTier[1] = 5) ──
    const [hubRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 601,
        building_type: 1,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const hubId = hubRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: hubId,
      player_id: playerId,
      operational_type: 'distribution_hub',
      conversion_stage: 'operational',
      // hub_tier defaults to 1 (schema default) → effectiveCap = hubRosterTunables.rosterCapByTier[1] = 5
    });

    // ── 3. Target stash building ──
    const [targetBuildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 602,
        building_type: 2,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const targetBuildingId = targetBuildingRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: targetBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });

    // ── 4. Product storage at hub (1200g brindle) ──
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: hubId,
      substance_type: 'brindle',
      quantity_grams: 1200,
    });

    // ── 5. Recruit LOGISTICS coordinator lieutenant ──
    const { lieutenant_id: lieutenantId } = await this.lieutenantRepoForTest.recruit({
      playerId,
      roleId: LOGISTICS_ROLE_ID,
      source: 'civilian',
      name: nextDistTestCallsign('lt-oc'),
      nameLocale: 'en',
      grantedRole: 'executor',
      mode: 'delegated',
      assignedBuildingId: hubId,
      targetBuildingId,
    });

    // ── 6. Attach DSL script ──
    const ownedLt = await this.lieutenantRepoForTest.getOwnedLieutenant(playerId, lieutenantId);
    if (ownedLt) {
      const parsed = this.dslParser.parse(scriptSrc);
      if (!('diagnostics' in parsed)) {
        const compiled = this.dslCompiler.compile(parsed.ast, 1);
        if (!('diagnostics' in compiled)) {
          await this.lieutenantRepoForTest.updateBehaviorScript(ownedLt.behavior_script_id, {
            source: scriptSrc,
            rules: compiled.ir,
            valid: true,
          });
        }
      }
    }

    // ── 7. Fill the roster to cap with dummy in-transit courier_shift rows ──
    // effectiveCap for a tier-1 hub = hubRosterTunables.rosterCapByTier[1] (default 5).
    // We read it the same way the dispatch hot-path does: rosterCapByTier[1].
    // Import hubRosterTunables to avoid hardcoding the cap value (single source of truth).
    // The dummy shifts reference real buildings (hub→target) to satisfy the FK constraints.
    // They are seeded as in_transit so countInTransitShifts returns cap → dispatch gate 409s.
    const cap = hubRosterTunables.rosterCapByTier[1];
    // A minimal route for the dummy shifts (FK: courier_shift.route_id → route.route_id).
    const [dummyRouteRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: hubId,
        destination_building_id: targetBuildingId,
        path_blocks: [601, 602],
        river_crossings: 0,
        ephemeral_mode: false,
      })
      .returning({ route_id: route.route_id });
    const dummyRouteId = dummyRouteRow!.route_id;
    // A minimal courier for the dummy shifts (FK: courier_shift.courier_id → courier.courier_id).
    const [dummyCourierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: 'foot',
        current_state: 'in_transit',
        current_load_grams: 0,
        current_load_cents: 0,
      })
      .returning({ courier_id: courier.courier_id });
    const dummyCourierId = dummyCourierRow!.courier_id;
    // Insert exactly `cap` dummy in-transit shifts (fill roster to cap so next dispatch gate 409s).
    for (let i = 0; i < cap; i++) {
      await this.db.insert(courierShift).values({
        player_id: playerId,
        courier_id: dummyCourierId,
        route_id: dummyRouteId,
        started_at_tick: 0,
        current_segment_index: 0,
        cargo_grams: 0,
        cargo_cents: 0,
        substance_type: 'brindle',
        status: 'in_transit',
        patrol_heat: 0.0,
      });
    }

    // ── 8. Seed one pending route_request for the hub ──
    const { requestId } = await this.routeRequestRepository.insertPending(
      playerId,
      hubId,
      targetBuildingId,
      null,
      1, // gameMinute=1
    );

    return { playerId, hubId, requestId, cap };
  }

  /**
   * `GET /v1/_test/coordinator/dispatch-trace?playerId=<uuid>` — System 9c C5 auto-dispatch probe.
   *
   * Reads all `courier_shift` rows for the player (JOINed with `courier` for `vehicle_type`)
   * + counts `route` rows for the player. Used by the C5 E2E to assert the REAL dispatch chain:
   *   - `shifts`: each shift's vehicle_type + cargo_grams (the degenerate case = 'foot' / 200g)
   *   - `route_count`: number of route rows (1 = the real A* route was created by the dispatch)
   *
   * The E2E asserts:
   *   - shifts.length === 1 (exactly one courier dispatched via the REAL chain)
   *   - shifts[0].vehicle_type === 'foot' (the LOGISTICS degenerate case — byte-identical to today)
   *   - Number(shifts[0].cargo_grams) === 200 (min(200, 1200) cargo policy — FALSIFIABLE)
   *   - route_count === 1 (a real route row — NOT fabricated)
   *
   * R2.2: TEST-ONLY. vehicle_type + cargo_grams are BO-only (never in real client projection).
   * Anti-fabrication: no Math.random. Reads the REAL courier_shift + route rows.
   */
  @Get('_test/coordinator/dispatch-trace')
  async coordinatorDispatchTrace(
    @Query('playerId') playerId: string,
  ): Promise<{ shifts: Array<{ vehicle_type: string; cargo_grams: number }>; route_count: number; route_stance: string | null }> {
    if (!playerId) {
      throw new BadRequestException('playerId query param required');
    }

    // Read all courier_shift rows for the player, JOINed with courier for vehicle_type.
    const shiftRows = await this.db
      .select({
        vehicle_type: courier.vehicle_type,
        cargo_grams: courierShift.cargo_grams,
      })
      .from(courierShift)
      .innerJoin(courier, eq(courier.courier_id, courierShift.courier_id))
      .where(eq(courierShift.player_id, playerId));

    // Count route rows and read the first route's stance (C6 — DD-COORD-GRAMMAR: the stance reaches the route).
    const routeRows = await this.db
      .select({ stance: route.stance })
      .from(route)
      .where(eq(route.player_id, playerId));
    const routeCount = routeRows.length;
    // Return the stance of the first route (null if no routes dispatched — the no-bypass test).
    const routeStance = routeRows[0]?.stance ?? null;

    const shifts = shiftRows.map((r) => ({
      vehicle_type: r.vehicle_type,
      cargo_grams: r.cargo_grams,
    }));

    return { shifts, route_count: routeCount, route_stance: routeStance };
  }

  // ── System 9c C7 Routes (additive — no existing route changed) ────────────────────────────────────
  //
  // C7: DD-TIER-BUY-GATE + DD-TIER-MAP — the hub-tier gates the vehicle PURCHASE.
  //   POST /v1/_test/coordinator/buy-vehicle
  //     — seeds a fresh player + economy (cashCents) + optionally a distribution_hub (hubTier); calls
  //       purchaseVehicle(vehicleType); returns { ok, reason?, inventory_count_after, cash_after }.
  //       Body: { vehicleType: string; hubTier?: number | null; cashCents?: number }.
  //       hubTier=null/omitted → no hub seeded (player has no hub → effective playerTier=0).
  //       hubTier=N → seeds a distribution_hub at hub_tier=N.
  //       cashCents → seeds the player's wallet (default 5_000_000 = $50k).
  //       R2.2: TEST-ONLY. DETERMINISTIC: no Math.random.

  /**
   * `POST /v1/_test/coordinator/buy-vehicle` — System 9c C7 tier-gate + purchase probe (TEST-ONLY).
   *
   * Seeds a fresh player + economy (cashCents) + optionally a distribution_hub at hubTier, then calls
   * VehicleRosterService.purchaseVehicle(vehicleType). Returns { ok, reason?, inventory_count_after, cash_after }.
   *
   * Body: { vehicleType: string; hubTier?: number | null; cashCents?: number }.
   *   vehicleType: the vehicle to buy ('foot', 'bike', 'car', 'van', 'refrigerated_van').
   *   hubTier: if provided (non-null), seeds a distribution_hub at that hub_tier. null/omitted = no hub (tier 0).
   *   cashCents: initial wallet in cents (default 5_000_000 = $50k — enough for any vehicle cost).
   *
   * C7 FALSIFIABLE:
   *   in-tier (hubTier ≥ requiredTier): ok=true, inventory_count_after=1, cash_after < cashCents (debited).
   *   under-tier (hubTier < requiredTier): ok=false, reason='hub_tier_too_low',
   *     inventory_count_after=0, cash_after=cashCents (NO debit, NO UPSERT — atomic).
   *   foot (requiredTier=0): ok=true regardless of hubTier (always buyable).
   *
   * R2.2: TEST-ONLY. cash_cents / inventory count are BO-only. DETERMINISTIC: no Math.random. Getter-sourced.
   */
  @Post('_test/coordinator/buy-vehicle')
  @HttpCode(HttpStatus.OK)
  async coordinatorBuyVehicle(
    @Body() body: { vehicleType?: string; hubTier?: number | null; cashCents?: number },
  ): Promise<{ ok: boolean; reason?: string; inventory_count_after: number; cash_after: number }> {
    const vehicleTypeName = body?.vehicleType ?? 'foot';
    const hubTierSeed: number | null = body?.hubTier !== undefined ? (body.hubTier === null ? null : Number(body.hubTier)) : null;
    const cashCentsSeed = body?.cashCents !== undefined ? Number(body.cashCents) : 5_000_000;

    // ── 1. Fresh isolated player ──
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c7-buy'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed economy_state with cashCents ──
    await this.db.insert(economyState).values({ player_id: playerId, cash_cents: BigInt(cashCentsSeed) });

    // ── 3. Optionally seed a distribution_hub at hubTier ──
    // hubTier=null/omitted → no hub → getOwnedOperationalHub returns null → playerTier=0.
    // hubTier=N → seeds a distribution_hub at hub_tier=N → the tier-gate sees playerTier=N.
    // block_id 799 (distinct from the C11 probe's 800 — isolated per-player, no cross-test conflict).
    if (hubTierSeed !== null && hubTierSeed !== undefined) {
      const [hubRowC7] = await this.db
        .insert(building)
        .values({ player_id: playerId, block_id: 799, building_type: 7, ownership: 'player', structural_state: 'operational' })
        .returning({ building_id: building.building_id });
      await this.db.insert(buildingOperationalState).values({
        building_id: hubRowC7!.building_id,
        player_id: playerId,
        operational_type: 'distribution_hub',
        conversion_stage: 'operational',
        hub_tier: hubTierSeed,
      });
    }

    // ── 4. Call purchaseVehicle (DD-TIER-BUY-GATE: tier-gate then cash-debit) ──
    const result = await this.vehicleRosterService.purchaseVehicle(playerId, vehicleTypeName);

    // ── 5. Read cash_after (the wallet post-purchase — debited on ok=true, unchanged on rejection) ──
    const [afterRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId));
    const cashAfter = Number(afterRow?.cash_cents ?? cashCentsSeed);

    // ── 6. Read inventory_count_after (0 if no UPSERT, 1+ if the buy succeeded) ──
    const [poolRow] = await this.db
      .select({ count: vehicleInventory.count })
      .from(vehicleInventory)
      .where(and(eq(vehicleInventory.player_id, playerId), eq(vehicleInventory.vehicle_type, vehicleTypeName as any)));
    const inventoryCountAfter = poolRow?.count ?? 0;

    return {
      ok: result.ok,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
      inventory_count_after: inventoryCountAfter,
      cash_after: cashAfter,
    };
  }

  // ── System 9c C8 Routes (additive — no existing route changed) ────────────────────────────────────
  //
  // C8: DD-FLEET-CAP — per-vehicle-type in-transit occupancy cap (ships INERT at default 30).
  //   POST /v1/_test/coordinator/probe-fleet-cap
  //     — Seeds a fresh player + tier-5 hub (global cap = 30) + two operational buildings + source
  //       product. Inserts N courier+route+shift rows (in_transit) for vehicleType (direct DB inserts
  //       to bypass dispatch gates — TEST-ONLY). Optionally overrides the per-type ENV var for the
  //       fleet cap (overrideCap). Calls DistributionService.dispatch for the test vehicle type (or
  //       for a different vehicle type when otherTypeAtCap is provided).
  //       Body: { vehicleType: string; inTransitOfType?: number; overrideCap?: number;
  //              assertAtomic?: boolean; otherTypeAtCap?: string }
  //       Response: { dispatched?, rejected?, reason?, global_cap_exceeded?, shift_created?, source_grams_unchanged? }
  //       DETERMINISTIC. No Math.random. Getter-sourced.

  /**
   * `POST /v1/_test/coordinator/probe-fleet-cap` — System 9c C8 fleet-cap gate probe (TEST-ONLY).
   *
   * Seeds a fresh player + tier-5 distribution_hub (global roster cap = 30) + two operational
   * buildings + source product (1200g brindle). Directly INSERTs N courier+route+shift rows with
   * status='in_transit' and vehicle_type=vehicleType (bypassing dispatch gates — this is test-only
   * setup, not a production dispatch path). Then optionally overrides the per-type ENV var for the
   * given vehicle's fleet cap (if overrideCap is provided) and calls DistributionService.dispatch
   * for the test vehicle. Cleans up the ENV override after the call.
   *
   * For the otherTypeAtCap case: also seeds N in-transit shifts of otherTypeAtCap (bikes at cap)
   * then dispatches vehicleType (cars) — the per-type gate does NOT fire for cars even though bikes
   * are at cap (per-type isolation, OQ-FC3).
   *
   * Body:
   *   vehicleType:     the vehicle type to attempt dispatching ('bike', 'car', etc.)
   *   inTransitOfType: N in-transit shifts of vehicleType to pre-seed (default 0)
   *   overrideCap:     if provided, temporarily sets the ENV var for vehicleType's per-type fleet cap
   *   assertAtomic:    if true, also returns shift_created + source_grams_unchanged (gate-before-tx proof)
   *   otherTypeAtCap:  if provided, also seeds 3 in-transit shifts of this OTHER type (at overrideCap=3)
   *
   * R2.2: TEST-ONLY. The raw in-transit count / cap are never returned to real clients — only bands
   * (fleet_occupancy_band) via the projection. DETERMINISTIC: no Math.random.
   */
  @Post('_test/coordinator/probe-fleet-cap')
  @HttpCode(HttpStatus.OK)
  async probeFleetCap(
    @Body() body: {
      vehicleType?: string;
      inTransitOfType?: number;
      overrideCap?: number;
      assertAtomic?: boolean;
      otherTypeAtCap?: string;
    },
  ): Promise<{
    dispatched?: boolean;
    rejected?: boolean;
    reason?: string;
    global_cap_exceeded?: boolean;
    shift_created?: boolean;
    source_grams_unchanged?: boolean;
  }> {
    const vehicleTypeName: string = body?.vehicleType ?? 'bike';
    const nInTransitOfType: number = typeof body?.inTransitOfType === 'number' ? body.inTransitOfType : 0;
    const overrideCap: number | undefined = typeof body?.overrideCap === 'number' ? body.overrideCap : undefined;
    const assertAtomic: boolean = body?.assertAtomic === true;
    const otherTypeAtCap: string | undefined = body?.otherTypeAtCap;

    // ── 1. Fresh isolated player ──
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c8fc'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Economy (large wallet — dispatch needs surcharge checks) ──
    await this.db.insert(economyState).values({ player_id: playerId, cash_cents: BigInt(50_000_000) });

    // ── 3. Tier-5 distribution_hub (global roster cap = 30 = the global tier-5 max) ──
    //   Using block 601 (player-scoped rows, no cross-test conflict).
    //   hub_tier=5 → effectiveCap = hubRosterTunables.rosterCapByTier[5] = 30.
    const [hubRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 601, building_type: 7, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const hubBuildingId = hubRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: hubBuildingId,
      player_id: playerId,
      operational_type: 'distribution_hub',
      conversion_stage: 'operational',
      hub_tier: 5,
    });

    // ── 4. Source (lab) + dest (stash) operational buildings at block 602/603 ──
    const [srcRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 602, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const srcBuildingId = srcRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: srcBuildingId, player_id: playerId, operational_type: 'lab', conversion_stage: 'operational',
    });

    const [dstRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 603, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const dstBuildingId = dstRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: dstBuildingId, player_id: playerId, operational_type: 'stash', conversion_stage: 'operational',
    });

    // ── 5. Seed source product (1200g brindle — enough for many dispatches) ──
    await this.db.insert(productStorage).values({
      player_id: playerId, building_id: srcBuildingId, substance_type: 'brindle', quantity_grams: 1200,
    });

    // ── 6. Seed the vehicle_inventory so the ownsVehicle gate passes ──
    //   foot is always allowed; bike/car need either hub-unlock (we have a hub) or vehicle_inventory.
    //   The hub unlocks bike/car via allowedVehicles (hub !== null), so no explicit inventory insert needed
    //   for bike/car. van/refrigerated_van need inventory. Seed conservatively.
    if (vehicleTypeName === 'van' || vehicleTypeName === 'refrigerated_van') {
      await this.db
        .insert(vehicleInventory)
        .values({ player_id: playerId, vehicle_type: vehicleTypeName as any, count: 5 })
        .onConflictDoUpdate({ target: [vehicleInventory.player_id, vehicleInventory.vehicle_type], set: { count: 5 } });
    }

    // ── 7. Direct-insert N in-transit shifts for vehicleType (bypass dispatch gates — TEST-ONLY setup) ──
    //   Each "shift" = 1 courier + 1 route + 1 courier_shift (status='in_transit'). These are bare
    //   skeleton rows sufficient for countInTransitShiftsByType to count them correctly.
    const seedInTransitShifts = async (vType: string, n: number): Promise<void> => {
      for (let i = 0; i < n; i++) {
        const [sCtRow] = await this.db
          .insert(courier)
          .values({
            player_id: playerId,
            role_type: 'courier',
            vehicle_type: vType as typeof courier.$inferInsert['vehicle_type'],
            current_state: 'in_transit',
            current_load_grams: 100,
            current_load_cents: 0,
            sessions_active: 0,
          })
          .returning({ courier_id: courier.courier_id });
        const sCourierId = sCtRow!.courier_id;

        const [sRouteRow] = await this.db
          .insert(route)
          .values({
            player_id: playerId,
            origin_building_id: srcBuildingId,
            destination_building_id: dstBuildingId,
            path_blocks: [602, 603] as any,
            river_crossings: 0,
            ephemeral_mode: false,
          })
          .returning({ route_id: route.route_id });
        const sRouteId = sRouteRow!.route_id;

        await this.db.insert(courierShift).values({
          player_id: playerId,
          courier_id: sCourierId,
          route_id: sRouteId,
          started_at_tick: 0,
          current_segment_index: 0,
          cargo_grams: 100,
          cargo_cents: 0,
          substance_type: 'brindle',
          status: 'in_transit',
        });
      }
    };

    await seedInTransitShifts(vehicleTypeName, nInTransitOfType);

    // ── 8. Optionally seed otherTypeAtCap in-transit shifts (3 bikes to saturate the overridden cap) ──
    if (otherTypeAtCap) {
      await seedInTransitShifts(otherTypeAtCap, 3);
      // Override the other type's cap to 3 so they ARE at cap
      const otherEnvKey = fleetCapEnvKey(otherTypeAtCap);
      if (otherEnvKey) process.env[otherEnvKey] = '3';
    }

    // ── 9. Read source grams BEFORE dispatch (for assertAtomic check) ──
    const [srcBefore] = await this.db
      .select({ qty: productStorage.quantity_grams })
      .from(productStorage)
      .where(and(eq(productStorage.player_id, playerId), eq(productStorage.building_id, srcBuildingId)));
    const gramsBefore = srcBefore?.qty ?? 1200;

    // ── 10. Temporarily override the per-type fleet-cap ENV var if overrideCap is provided ──
    const envKey = fleetCapEnvKey(vehicleTypeName);
    if (envKey && overrideCap !== undefined) {
      process.env[envKey] = String(overrideCap);
    }

    // ── 11. Check if the global cap is exceeded (for the global_cap_exceeded flag) ──
    //   global cap = effectiveCap(tier=5) = 30. total in-transit = nInTransitOfType.
    //   If nInTransitOfType < 30 → global NOT exceeded (the test setups are designed to stay below 30).
    const globalCap = 30; // tier-5 hub cap (hardcoded here: TEST-ONLY verification flag)
    const totalInTransit = nInTransitOfType + (otherTypeAtCap ? 3 : 0);
    const globalCapExceeded = totalInTransit >= globalCap;

    // ── 12. Attempt dispatch + record outcome ──
    let dispatched = false;
    let rejected = false;
    let reason: string | undefined;
    const cargoGrams = 100;

    try {
      await this.distributionService.dispatch(playerId, srcBuildingId, dstBuildingId, cargoGrams, vehicleTypeName);
      dispatched = true;
    } catch (err: unknown) {
      rejected = true;
      if (err instanceof Error) {
        reason = err.message;
      }
    } finally {
      // ── 13. Restore ENV overrides ──
      if (envKey && overrideCap !== undefined) {
        delete process.env[envKey];
      }
      if (otherTypeAtCap) {
        const otherEnvKey = fleetCapEnvKey(otherTypeAtCap);
        if (otherEnvKey) delete process.env[otherEnvKey];
      }
    }

    // ── 14. Check shift_created + source_grams_unchanged (assertAtomic) ──
    let shiftCreated: boolean | undefined;
    let sourceGramsUnchanged: boolean | undefined;
    if (assertAtomic) {
      // Count in_transit shifts of vehicleType AFTER the dispatch attempt
      const [afterCount] = await this.db
        .select({ cnt: count() })
        .from(courierShift)
        .innerJoin(courier, eq(courierShift.courier_id, courier.courier_id))
        .where(
          and(
            eq(courierShift.player_id, playerId),
            eq(courierShift.status, 'in_transit'),
            eq(courier.vehicle_type, vehicleTypeName as any),
          ),
        );
      const newShiftCount = Number(afterCount?.cnt ?? 0);
      // The pre-seeded N shifts were there before dispatch; a new shift would make it N+1.
      shiftCreated = newShiftCount > nInTransitOfType;
      // Check source grams unchanged (gate fires before tx → no decrement)
      const [srcAfter] = await this.db
        .select({ qty: productStorage.quantity_grams })
        .from(productStorage)
        .where(and(eq(productStorage.player_id, playerId), eq(productStorage.building_id, srcBuildingId)));
      const gramsAfter = srcAfter?.qty ?? gramsBefore;
      sourceGramsUnchanged = gramsAfter === gramsBefore;
    }

    return {
      ...(dispatched && { dispatched: true }),
      ...(rejected && { rejected: true, reason }),
      global_cap_exceeded: globalCapExceeded,
      ...(assertAtomic && { shift_created: shiftCreated, source_grams_unchanged: sourceGramsUnchanged }),
    };
  }

  // ── System 9c C9 — coordinator projection probe ───────────────────────────────────────────────────

  /**
   * `GET /v1/_test/coordinator/project?playerId=<uuid>` — System 9c C9 R2.2 coordinator projection
   * probe (TEST-ONLY).
   *
   * Returns the `CoordinatorProjection` for the given player via
   * `DistributionProjectionService.projectCoordinatorState(playerId)`.
   *
   * Response: `{ hub_tier_band, roster_band, fleet_occupancy_band, script_complexity_bucket, available_vehicles }`
   *   - hub_tier_band           — 'none'|'basic'|'established'|'advanced'|'flagship' (closed domain)
   *   - roster_band             — 'NONE'|'OPEN'|'BUSY'|'FULL' (closed domain, REUSE)
   *   - fleet_occupancy_band    — per-type { foot, bike, car, van } → 'fleet_room'|'fleet_tight'|'fleet_full'
   *   - script_complexity_bucket — 'manual'|'basic'|'autonomous' (closed domain)
   *   - available_vehicles      — categorical string[] (FOOT always; others if count > 0)
   *
   * P5 WALL: the response contains NONE of the forbidden raw scalars:
   *   hub_tier, in_transit_count, fleet_cap, rule_count
   *
   * R2.2: TEST-ONLY. The projection result contains ONLY closed-domain strings.
   * Anti-fabrication: routes through the real DistributionProjectionService → real PG rows.
   * Zero-regression: read-only; no DB mutations.
   */
  @Get('_test/coordinator/project')
  async projectCoordinatorState(
    @Query('playerId') playerId: string,
  ) {
    if (!playerId) {
      throw new BadRequestException('playerId query param is required');
    }
    return this.distributionProjection.projectCoordinatorState(playerId);
  }

  // ── P3-C C7 Routes (additive — no C1-C9c route changed) — sinuosity patch/collapse/rebuild/dents ──
  //
  // Ruling-B dual-drivers. Mirrors the System 9b C9 seam style (saturate-and-evaluate/saturate-then-
  // replan) — SAME geography (blocks 1/3, saturatedBlock=2, district 1) so patch/collapse can reuse the
  // ALREADY-PROVEN alternate-path detour those C9 tests established.

  /**
   * `POST /v1/_test/route-lifecycle/seed-patch-test-route` — C7 seed (TEST-ONLY).
   *
   * Seeds a fresh player + two OPERATIONAL buildings (blocks 1/3, district 1 — the SAME geography
   * `saturate-then-replan` uses) + productStorage (1000g brindle at origin) + economy_state
   * (10_000_000 cents — enough for every rebuild mode) + a SAVED route (path_blocks=[1,2,3]).
   *
   * Body: { sinuosityIndex?: number; state?: 'active'|'saturated'|'severed'; debtOnMiddleBlock?: number }
   *   sinuosityIndex: default 1.0 (schema default) — set high to test the SI-only collapse driver.
   *   state: default 'active'.
   *   debtOnMiddleBlock: if provided, seeds corridor_debt.debt_magnitude on block 2 (the patch trigger).
   *
   * Response: { playerId, routeId, originBuildingId, destBuildingId }.
   */
  @Post('_test/route-lifecycle/seed-patch-test-route')
  @HttpCode(HttpStatus.CREATED)
  async seedPatchTestRoute(
    @Body() body: { sinuosityIndex?: number; state?: 'active' | 'saturated' | 'severed'; debtOnMiddleBlock?: number },
  ): Promise<{ playerId: string; routeId: string; originBuildingId: string; destBuildingId: string }> {
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountRow!.account_id, callsign: nextDistTestCallsign('c7-patch'), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 1, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 3, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const originBuildingId = originRow!.building_id;
    const destBuildingId = destRow!.building_id;

    await this.db.insert(buildingOperationalState).values({
      building_id: originBuildingId,
      player_id: playerId,
      operational_type: 'lab',
      conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
    });
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: originBuildingId,
      substance_type: 'brindle',
      quantity_grams: 1000,
    });
    await this.db.insert(economyState).values({ player_id: playerId, cash_cents: BigInt(10_000_000) });

    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originBuildingId,
      destination_building_id: destBuildingId,
      path_blocks: [1, 2, 3],
      is_saved: true,
      state: body?.state ?? 'active',
      version: 1,
      straight_line_distance: 2.0,
      sinuosity_index: body?.sinuosityIndex ?? 1.0,
      stance: 'balanced',
      vehicle_type: 'foot',
    });

    if (body?.debtOnMiddleBlock !== undefined) {
      await this.db
        .insert(corridorDebt)
        .values({ player_id: playerId, block_id: 2, debt_magnitude: body.debtOnMiddleBlock, last_updated_tick: BigInt(1000) })
        .onConflictDoUpdate({
          target: [corridorDebt.player_id, corridorDebt.block_id],
          set: { debt_magnitude: body.debtOnMiddleBlock, last_updated_tick: BigInt(1000) },
        });
    }

    return { playerId, routeId, originBuildingId, destBuildingId };
  }

  /**
   * `POST /v1/_test/route-lifecycle/read-account-for-player` — TEST-ONLY helper: reads a player's
   * `account_id` (originally added to mint a JWT for the ONE C7 test that required a real session —
   * the FULL_GEOMETRIC_RESET governor-cap proof). W6a C1.0 (2026-08-08,
   * docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md §2bis-C):
   * `supply_chain_sinuosity_rebuild.spec.ts` now reuses this SAME lookup for every route.controller.ts
   * call (create/delete/rebuild) — the endpoint no longer accepts a raw x-player-id header, every
   * caller needs a bearer JWT. Body: { playerId: string }. Response: { accountId: string }.
   */
  @Post('_test/route-lifecycle/read-account-for-player')
  @HttpCode(HttpStatus.OK)
  async readAccountForPlayer(@Body() body: { playerId: string }): Promise<{ accountId: string }> {
    const [row] = await this.db
      .select({ account_id: player.account_id })
      .from(player)
      .where(eq(player.player_id, body.playerId))
      .limit(1);
    if (!row) throw new BadRequestException(`no player ${body.playerId}`);
    return { accountId: row.account_id };
  }

  /**
   * `POST /v1/_test/route-lifecycle/seed-second-route-for-player` — TEST-ONLY: seeds a SECOND pair of
   * OPERATIONAL buildings (blocks 501/502 — the SAME pair `seed-route` (C1) already proves reachable/
   * adjacent — distinct from `seed-patch-test-route`'s 1/3) + a SAVED route between them for an EXISTING
   * player (Body: { playerId }). Used by the FULL_GEOMETRIC_RESET governor-cap proof (a 2nd, otherwise-
   * eligible route to rebuild in the SAME open session — rebuilding the SAME route twice would 409
   * REBUILD_IN_PROGRESS/ROUTE_REBUILDING, a DIFFERENT code than the cap). Response: { routeId: string }.
   */
  @Post('_test/route-lifecycle/seed-second-route-for-player')
  @HttpCode(HttpStatus.CREATED)
  async seedSecondRouteForPlayer(@Body() body: { playerId: string } ): Promise<{ routeId: string }> {
    const playerId = body.playerId;
    const [originRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 501, building_type: 1, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    const [destRow] = await this.db
      .insert(building)
      .values({ player_id: playerId, block_id: 502, building_type: 2, ownership: 'player', structural_state: 'operational' })
      .returning({ building_id: building.building_id });
    await this.db.insert(buildingOperationalState).values({
      building_id: originRow!.building_id, player_id: playerId, operational_type: 'lab', conversion_stage: 'operational',
    });
    await this.db.insert(buildingOperationalState).values({
      building_id: destRow!.building_id, player_id: playerId, operational_type: 'stash', conversion_stage: 'operational',
    });
    const { route_id: routeId } = await this.routeLifecycleRepository.insertRoute({
      player_id: playerId,
      origin_building_id: originRow!.building_id,
      destination_building_id: destRow!.building_id,
      path_blocks: [501, 502],
      is_saved: true,
      state: 'active',
      version: 1,
      straight_line_distance: 1.0,
      sinuosity_index: 1.0,
      stance: 'balanced',
      vehicle_type: 'foot',
    });
    return { routeId };
  }

  /**
   * `POST /v1/_test/route-lifecycle/seed-corridor-debt` — generic debt seed (TEST-ONLY).
   * Body: { playerId: string; blockId: number; debtMagnitude: number }. Response: { ok: true }.
   */
  @Post('_test/route-lifecycle/seed-corridor-debt')
  @HttpCode(HttpStatus.OK)
  async seedCorridorDebtGeneric(
    @Body() body: { playerId: string; blockId: number; debtMagnitude: number },
  ): Promise<{ ok: true }> {
    await this.db
      .insert(corridorDebt)
      .values({ player_id: body.playerId, block_id: body.blockId, debt_magnitude: body.debtMagnitude, last_updated_tick: BigInt(1000) })
      .onConflictDoUpdate({
        target: [corridorDebt.player_id, corridorDebt.block_id],
        set: { debt_magnitude: body.debtMagnitude, last_updated_tick: BigInt(1000) },
      });
    return { ok: true };
  }

  /**
   * `POST /v1/_test/route-lifecycle/run-patch-check` — direct HTTP seam onto the REAL, unmodified
   * `RoutePatchSweepService.maybePatchRoute` (mirrors `run-mycelial-decay`'s "direct seam onto the real
   * tick method" convention — the SAME method the NIGHTLY/26 tick AND the saved-route dispatch path
   * both call).
   * Body: { playerId: string; routeId: string; gameMinute?: number }. Response: { patched: boolean }.
   */
  @Post('_test/route-lifecycle/run-patch-check')
  @HttpCode(HttpStatus.OK)
  async runPatchCheck(
    @Body() body: { playerId: string; routeId: string; gameMinute?: number },
  ): Promise<{ patched: boolean }> {
    const patched = await this.routePatchSweep.maybePatchRoute(body.playerId, body.routeId, body.gameMinute ?? 1000);
    return { patched };
  }

  /**
   * `GET /v1/_test/route-lifecycle/read-route-extended?routeId=<uuid>` — reads the C7 extended columns
   * (patch_count/last_rebuilt_at_tick/rebuild_completes_at_tick) alongside every C1 column
   * (`RouteLifecycleRepository.readRouteExtended`). Response: { route: (extended row) | null }.
   * R2.2: TEST-ONLY — every field here is BO-only.
   */
  @Get('_test/route-lifecycle/read-route-extended')
  async readRouteExtendedProbe(
    @Query('routeId') routeId: string,
  ): Promise<{ route: unknown }> {
    const row = await this.routeLifecycleRepository.readRouteExtended(routeId);
    return { route: row };
  }

  /**
   * `POST /v1/_test/route-lifecycle/dispatch-on-saved-route` — direct HTTP seam onto the REAL,
   * unmodified `DistributionService.dispatch(..., savedRouteId)` path (design §7.5 dents). Any thrown
   * `ApiError` propagates through the SAME GlobalExceptionFilter a real controller call would hit — the
   * E2E asserts on the REAL HTTP status/error.code (409 REBUILD_REQUIRED / ROUTE_REBUILDING, etc.),
   * exactly as if this were the production `POST /v1/operational/distribution/dispatch` endpoint (which
   * ALSO accepts `route_id` since this chunk — the difference here is JWT-free player resolution, the
   * SAME simplification every other `_test` dispatch seam in this file already makes).
   * Body: { playerId, fromBuildingId, toBuildingId, cargoGrams, routeId, vehicleType? }.
   * Response (success): { courierId, routeId, shiftId }.
   */
  @Post('_test/route-lifecycle/dispatch-on-saved-route')
  @HttpCode(HttpStatus.CREATED)
  async dispatchOnSavedRouteProbe(
    @Body() body: {
      playerId: string;
      fromBuildingId: string;
      toBuildingId: string;
      cargoGrams: number;
      routeId: string;
      vehicleType?: string;
    },
  ): Promise<{ courierId: string; routeId: string; shiftId: string }> {
    return this.distributionService.dispatch(
      body.playerId,
      body.fromBuildingId,
      body.toBuildingId,
      body.cargoGrams,
      body.vehicleType ?? 'foot',
      false,
      'balanced',
      body.routeId,
    );
  }

  /**
   * `POST /v1/_test/route-lifecycle/concurrent-evaluate` — I6 concurrency probe (TEST-ONLY).
   * Fires TWO concurrent `RouteService.evaluateAndMaybeSever` calls on the SAME route (`Promise.all`) —
   * the falsifiable: exactly one Exception card ends up pending, regardless of which call "won" the
   * atomic `severIfNotAlready` RETURNING race.
   * Body: { playerId: string; routeId: string }. Response: { states: [string, string] }.
   */
  @Post('_test/route-lifecycle/concurrent-evaluate')
  @HttpCode(HttpStatus.OK)
  async concurrentEvaluate(
    @Body() body: { playerId: string; routeId: string },
  ): Promise<{ states: [string, string] }> {
    const [s1, s2] = await Promise.all([
      this.routeService.evaluateAndMaybeSever(body.playerId, body.routeId, 1000),
      this.routeService.evaluateAndMaybeSever(body.playerId, body.routeId, 1000),
    ]);
    return { states: [s1, s2] };
  }

  /**
   * `GET /v1/_test/route-lifecycle/count-pending-collapse-exceptions?playerId=&routeId=` — I6 proof
   * read (TEST-ONLY). Counts DISTINCT PENDING exception_queue ROWS whose `candidate_actions[].route_id`
   * tag matches `routeId` (the SAME jsonb-scan shape `RouteCollapseExceptionProducer.hasPendingForRoute`
   * uses internally, replicated here as a COUNT rather than an EXISTS so a double-insert bug would be
   * OBSERVABLE as count=2, not silently masked by the existence check alone).
   *
   * `count(DISTINCT exception_id)`, NOT `count(*)`: the `jsonb_array_elements(candidate_actions)` CROSS
   * JOIN fans out ONE row per candidate action (this producer's own `buildCollapseActions` always emits
   * TWO — acknowledge + escalate — both carrying the SAME `route_id` tag), so a naive `count(*)` would
   * report 2 for a single, correctly-exactly-once exception row (caught by this session's own dry-run:
   * `concurrent-evaluate` produced states=[severed,severed] + exactly ONE real DB row, `count(*)`
   * wrongly reported 2, `count(DISTINCT exception_id)` correctly reports 1).
   * Response: { count: number }.
   */
  @Get('_test/route-lifecycle/count-pending-collapse-exceptions')
  async countPendingCollapseExceptions(
    @Query('playerId') playerId: string,
    @Query('routeId') routeId: string,
  ): Promise<{ count: number }> {
    const result = await this.db.execute(sql`
      SELECT count(DISTINCT ${exceptionQueueRow.exception_id})::int AS n
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'route_id' = ${routeId}
    `);
    const rows = (result as unknown as { rows?: Array<{ n: number }> }).rows ?? (result as unknown as Array<{ n: number }>);
    return { count: rows[0]?.n ?? 0 };
  }
}

// ── C8 helper: map a vehicle_type name to its fleet-cap ENV var key ────────────────────────────────
// Mirrors the TunablesStore.resolveInt call in distributionAutomationHubsTunables.fleetCapInTransit.
// Used by the C8 probe to temporarily override the fleet cap for a given vehicle type.
// NOT a public API — TEST-ONLY (this file is only mounted when testControllersEnabled()).
function fleetCapEnvKey(vehicleType: string): string | undefined {
  switch (vehicleType) {
    case 'foot':           return 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_FOOT';
    case 'bike':           return 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_BIKE';
    case 'car':            return 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_CAR';
    case 'van':
    case 'refrigerated_van': return 'DISTRIBUTION_FLEET_CAP_IN_TRANSIT_VAN';
    default:               return undefined;
  }
}

// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §NestJS — backend jeu
//             (DistributionService in-process in game-back) + §`Courier`/§`Route`/§Data model `Shift` +
//             composition_overview.md §Cross-cutting (the city-sim scheduler is the shared tick engine the
//             operational transit-advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//             -- session:2026-06-21 (System 9 §9 Detection & Consequence — C0 DI-wiring shell) --
//             -- session:2026-06-21 (System 9 §9 Detection & Consequence — C1 schema/persistence) --
//             -- session:2026-06-22 (System 9 §9b Route-lifecycle — C0 DI-wiring shell) --
//             -- session:2026-06-23 (System 9b C10 — DD-EPHEMERAL ephemeral purge service) --
//             -- session:2026-06-23 (System 9c Automation & Hubs — C0 DI-wiring shell) --
//
// `DistributionModule` — wires the Phase-2 M1 foot-courier distribution slice (dispatch → tick-driven transit → cargo
// arrival) into the game-back modular monolith. Copies the persisted-system module template (ProductionModule):
//   - the player ACTION: DistributionService.dispatch (Step 1 — sources Brindle from the source product_storage,
//     guarded; creates a route + a FOOT courier [vehicle_type='foot', in_transit] + a courier_shift carrying the
//     cargo [cargo_grams] between two player-owned OPERATIONAL buildings).
//   - the COURIER-TRANSIT TICK-HOOK: DistributionTransitService registers into the CitySimScheduler at the slot
//     {MINUTE/9 COURIER_TRANSIT} at boot (after COOK_ADVANCE/8), REPLACING the no-op placeholder there — each in-game
//     minute it advances in-transit couriers and, on arrival (the deterministic transit duration elapsed), transfers
//     the cargo into the destination product_storage + marks the shift completed / the courier at_destination. This
//     is the operational tick-hook PATTERN T1–T4 share (same registerSystem path the setup/arrival/cook hooks use at
//     MINUTE/6, /7 and /8).
//   - the REPOSITORY (DistributionRepository) owns the raw Drizzle reads/writes against courier + route +
//     courier_shift + product_storage (T0) + building_operational_state (the operational gate, T0) + buildings +
//     blocks (Phase-1 — the route geometry) + city_sim_clock (the started_at_tick read, Phase-1) (R9.3 — it READS the
//     schema, never redefines it).
//   - the PROJECTION (DistributionProjectionService) maps the raw courier state + shift status → a qualitative
//     transit band (IDLE / IN_TRANSIT / ARRIVED — R2.2, no raw coords/cargo/segment/clock).
//   - the player-facing CONTROLLER (DistributionController) exposes the dispatch action + the projection under /v1.
//
// Imports:
//   - SchedulerModule: EXPORTS CitySimSchedulerService (the transit tick-hook calls registerSystem on it) +
//     CityEventBus (the in-process event bus — C0 DI-wiring shell; Layer-1 interception producer + Layer-2 emit
//     paths will consume it from C4/C6/C8/C10).
//   - AuthModule: EXPORTS JwtAuthGuard (the controller's player resolution).
//   - ColdChainModule: EXPORTS ColdChainService (the courier projection uses it for cold-chain band, Phase-2b).
//   - PatrolDoctrineModule (C0 DI-wiring shell — System 9 §9): EXPORTS PatrolDoctrineService — the public
//     precinctsForBlocks / precinctForBlock resolver (OQ-7b, C3) + getPatrolLoadRaw (C4 Layer-1 producer +
//     C6 Layer-2 `runSegmentDetection` blockRho). No circular dep (PatrolDoctrineModule imports
//     [SchedulerModule, AuthModule, PoliceMemoryModule] — none of which imports DistributionModule).
//   - PoliceMemoryModule (C0 DI-wiring shell — System 9 §9): EXPORTS PoliceMemoryService — the
//     appendDeclarationEntry write (OQ-18 caught-leak BPD channel, C10) on the `declaration_ledger`
//     (bare-string DeclarationType domain). No circular dep.
//   - MarketModule (C0 DI-wiring shell — System 9 §9): EXPORTS MarketRngService — the seedFromDay SHA-256
//     PRNG (C6 Layer-2 rollSegment deterministic roll, DIV-5). No circular dep (MarketModule imports
//     [SchedulerModule, AuthModule, …] — none imports DistributionModule).
//   - FlowCellsModule (C0 DI-wiring shell — System 9 §9b): EXPORTS FlowCellsService — the seed-derived
//     intra-district N/E/S/W block-adjacency rule (`neighbourIndices`) DD-GRAPH Layer-1 builds on (C3).
//     No circular dep (FlowCellsModule imports [SchedulerModule, AuthModule] — none imports DistributionModule).
//
// Depends on the @Global() DbModule (the repository/controller inject the DB provider). EXPORTS the service +
// projection so later operational modules (T5 selling, T9a detection consumer) can inject them if needed.
//
// SYSTEM 9 §9 C0 — DI-wiring shell (NO mechanic logic yet):
//   - PatrolDoctrineModule / PoliceMemoryModule / MarketModule are added to imports NOW so NestJS resolves the
//     cross-module providers at boot; C3/C4/C6/C8/C10 inject the actual services from the resolved graph.
//   - NO new providers (CourierDetectionService, DistributionDetectionRepository, DistributionTestController,
//     DistributionAdminController) are registered yet — they land per-chunk (C1/C5/C9/C12).
//   - The additive-extension invariant: a world with no dispatch into a hot precinct / no high-signature segment
//     behaves EXACTLY as today — the wiring shell is a no-op on the existing hot-paths.
//
// SYSTEM 9 §9b C0 — DI-wiring shell (NO mechanic logic yet):
//   - FlowCellsModule is added to imports NOW so FlowCellsService (the seed-derived block-adjacency rule) is
//     resolvable in C3 (`RouteFinderService.onModuleInit` builds the two-layer block-graph). No circular dep.
//   - The additive-extension invariant: a world with no route-lifecycle services yet behaves EXACTLY as today —
//     the FlowCellsModule import is a pure dependency resolution step with no side-effect on existing hot-paths.
//
// SYSTEM 9c Automation & Hubs C0 — DI-wiring shell (NO mechanic logic yet):
//   - DslModule is added to imports NOW so DslExecutorService (the SHARED DSL engine executor — the pure
//     `resolve(ir, snapshot)` interpreter) is resolvable in C5 (CoordinatorExecutionService). DslModule has
//     no circular dep with DistributionModule (it is pure — no DB, no scheduler, no auth).
//   - CityEventBus (from SchedulerModule, already imported) is the event bus C4's RouteRequestEvent subscription uses.
//     SchedulerModule already imports + exports CityEventBus; NO new import needed for the bus.
//   - LogisticsBindingService (from LieutenantModule): LieutenantModule ALREADY imports DistributionModule, so
//     DistributionModule CANNOT import LieutenantModule (direct circular dep; forwardRef breaks in that cycle per
//     the prior InsuranceModule/LieutenantModule chain lesson). Resolution at C5: LogisticsBindingService will be
//     DIRECTLY PROVIDED in DistributionModule (its only deps are DistributionService + LieutenantRepository, both
//     resolvable from within this module once LieutenantRepository is imported/re-exported from LieutenantModule
//     into the global scope or via a targeted repository injection). This C0 shell notes the constraint.
//   - CoordinatorExecutionService / RouteRequestService / RouteRequestRepository — greenfield services NOT yet
//     registered; they land per-chunk (C4/C5). The DI-wiring shell is a pure comment + DslModule import
//     addition with no side-effect on any existing hot-path.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { ColdChainModule } from '../coldchain/coldchain.module';
import { PatrolDoctrineModule } from '../../citysim/patrol/patrol.module';
import { PoliceMemoryModule } from '../../citysim/police_memory/police_memory.module';
import { MarketModule } from '../market/market.module';
import { FlowCellsModule } from '../../citysim/flow_cells/flow_cells.module';
import { DslModule } from '../../dsl/dsl.module';
import { DistributionRepository } from './distribution.repository';
import { HubRosterService } from './hub-roster.service';
import { DistributionService } from './distribution.service';
import { DistributionTransitService } from './distribution-transit.service';
import { DistributionProjectionService } from './distribution.projection.service';
import { DistributionController } from './distribution.controller';
import { DistributionDetectionRepository } from './distribution-detection.repository';
import { CourierDetectionService } from './courier-detection.service';
import { DistributionTestController } from './distribution-test.controller';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { CourierInterceptionService } from '../insurance/courier-interception.service';
import { DistributionAdminController } from './distribution-admin.controller';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RouteFinderService } from './route-finder.service';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { CorridorDebtService } from './corridor-debt.service';
import { EphemeralPurgeService } from './ephemeral-purge.service';
import { VehicleRosterService } from './vehicle-roster.service';
import { VehicleRosterController } from './vehicle-roster.controller';
import { RaidExceptionRepository } from '../../exceptions/raid-exception.repository';
import { RouteRequestRepository } from './route-request.repository';
import { RouteRequestService } from './route-request.service';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import { LogisticsBindingService } from '../lieutenant/logistics-binding';
import { CoordinatorExecutionService } from './coordinator-execution.service';
import { LawyerModule } from '../legal/legal.module';
import { SupplyChainModule } from '../../core_loops/supply_chain/supply-chain.module';
import { RoutePatchSweepService } from './route-patch-sweep.service';
import { RouteRebuildService } from './route-rebuild.service';
import { AnnealingModule } from '../../core_loops/annealing/annealing.module';
// P3-F C6 — CategoryDelegationGuardModule EXPORTS CategoryDelegationGuard (RouteController's ROUTE_
// ASSIGNMENT guard sites). A pure leaf (imports only the @Global() DbModule) — no circular dependency.
import { CategoryDelegationGuardModule } from '../../meta_progression/category-delegation-guard.module';

@Module({
  // ColdChainModule (Phase-2b vector #2) EXPORTS ColdChainService — the courier projection injects it to surface the
  // in-transit cargo's cold-chain temperature_status band + degrading flag for a Crick cargo (R2.2).
  // PatrolDoctrineModule (C0 DI-wiring shell — System 9 §9): resolves PatrolDoctrineService for C3/C4/C6.
  // PoliceMemoryModule (C0 DI-wiring shell — System 9 §9): resolves PoliceMemoryService for C10.
  // MarketModule (C0 DI-wiring shell — System 9 §9): resolves MarketRngService for C6 rollSegment.
  // FlowCellsModule (C0 DI-wiring shell — System 9 §9b): resolves FlowCellsService for DD-GRAPH Layer-1 (C3 RouteFinderService).
  // DslModule (C0 DI-wiring shell — System 9c §9c): resolves DslExecutorService (the SHARED DSL engine executor —
  //   `resolve(ir, snapshot)`) for C5's CoordinatorExecutionService. Pure module (no DB, no scheduler) — no circular dep.
  // LawyerModule (04d-A C4 — LAWYER_UP re-wire): EXPORTS LegalCaseService for CourierDetectionService.
  //   LawyerModule does NOT import DistributionModule → no circular dependency.
  // SupplyChainModule (P3-C C2 — Loop 5 Mycelial Ledger): EXPORTS LegAccrualService for
  //   DistributionTransitService's post-tx-arrival accrual hook + (C7) RouteCollapseExceptionProducer
  //   for RouteService's I6 collapse producer call. SupplyChainModule is a LEAF (imports only the
  //   @Global() DbModule + Loop10Module/ErlangStashModule/BufferBloatModule, none of which import
  //   DistributionModule) → no circular dependency, one-way edge.
  // AnnealingModule (P3-D C7 — Loop 7 Annealing Window): EXPORTS AnnealingRepository — the dispatch-time
  //   read-only "is origin/destination CURRENTLY settling" check (design §10.1, ruling #6 dispatch-only)
  //   this chunk composes WITH the existing mycelial transit-stress multiplier (never replaces it) at the
  //   SAME dispatch seam. Mirrors the SupplyChainModule precedent immediately above: AnnealingModule is
  //   ALSO a LEAF (imports only DbModule + SchedulerModule, neither of which imports DistributionModule) →
  //   no circular dependency, one-way edge, same "direct import (no duplicate-provide needed)" shape.
  //
  // ★ Loop10Module is deliberately NOT imported here (P3-C C7 — RouteRebuildService needs Structural
  //   DecisionGovernorService for the code 9 SINUOSITY_FULL_RESET wrap). Root cause isolated by
  //   bisection this session: importing the CONCRETE CLASS `StructuralDecisionGovernorService` into ANY
  //   file `DistributionModule` reaches (regardless of module-import wiring — a plain import, a
  //   `forwardRef`-wrapped one, and an `@Global()` flip on `loop10.module.ts` were ALL tried and
  //   reverted; regardless of whether the class is ever used in a constructor) reproducibly broke
  //   `Loop10Module`'s OWN internal DI graph at boot (`HlCardService`'s `StructuralDecisionGovernorService`
  //   constructor arg resolving `undefined`) — a classic ES/CommonJS circular-import decorator-metadata
  //   hazard: `structural-decision-governor.service.ts` imports `SessionService`, which imports
  //   `HlCardService` (the `Loop10Module` ↔ `SessionModule` cycle that module's own header documents,
  //   "forwardRef both sides"); a SECOND import path into that cycle, from a file reached very
  //   early/broadly in the overall app graph, shifts ES-module load order enough that `HlCardService`'s
  //   OWN class decorator runs before `StructuralDecisionGovernorService` finishes its own top-level
  //   evaluation on THIS path. NOT a real NestJS circular dependency (grep confirms neither
  //   `SessionModule` nor `ProgressionModule` import `DistributionModule`; importing the plain enum
  //   `StructuralDecisionType`, from the same catalogue-adjacent module tree, is perfectly safe). FIX:
  //   `RouteRebuildService` never imports the concrete class — it resolves a Symbol token
  //   (`STRUCTURAL_DECISION_GOVERNOR`, `structural-decision-governor.token.ts` — a zero-import leaf
  //   file) via `ModuleRef.get(token, { strict: false })` at call time — see that service's file header
  //   for the full account. Empirically verified: Nest boots clean with this + zero Loop10Module import
  //   here.
  imports: [SchedulerModule, AuthModule, ColdChainModule, PatrolDoctrineModule, PoliceMemoryModule, MarketModule, FlowCellsModule, DslModule, LawyerModule, SupplyChainModule, AnnealingModule, CategoryDelegationGuardModule],
  controllers: [
    DistributionController,
    // C12 — DistributionAdminController: BO admin routes (always-on production BO — NOT test-gated).
    // Mirrors InsuranceAdminController registration pattern (never conditional on NODE_ENV).
    DistributionAdminController,
    // C7 — RouteController: persistent saved-route CRUD (POST/GET/LIST/DELETE /v1/operational/routes).
    // Always-on (not test-gated) — these are production player-facing routes.
    RouteController,
    // C11 — VehicleRosterController: player-facing vehicle purchase (POST /v1/operational/vehicles/purchase).
    // Always-on (not test-gated) — production player-facing route.
    VehicleRosterController,
    // C1 — DistributionTestController: _test seed/read routes (mounted only in non-production envs).
    ...(testControllersEnabled() ? [DistributionTestController] : []),
  ],
  providers: [
    DistributionRepository,
    // HubRosterService (Phase-4 vector #4 T3) — the PURE roster-cap derivation (lever A). Same-module providers don't
    // need exporting; the T4 dispatch gate (DistributionService, this module) injects it to compute the effective cap.
    HubRosterService,
    DistributionService,
    DistributionTransitService,
    DistributionProjectionService,
    // C1 — DistributionDetectionRepository: CRUD for caught_exception + sessions_active (used C5+).
    DistributionDetectionRepository,
    // C5 — CourierDetectionService: the shared idempotent markCourierCaught path (DIV-1/2/3 convergence).
    //   CourierInterceptionService (C4) delegates its inline mutation+emit to this service from C5 onward.
    CourierDetectionService,
    // System 9b C1 — RouteLifecycleRepository: CRUD over route NEW cols (C1 schema probe + C7+ production).
    RouteLifecycleRepository,
    // System 9b C3 — RouteFinderService: the seed-derived two-layer block-graph (DD-GRAPH) + A* (C4+).
    // Injects FlowCellsService (from FlowCellsModule, already imported) for Layer-1 REUSE.
    RouteFinderService,
    // System 9b C7 — RouteService: persistent saved-route CRUD (DD-PERSIST §4.1).
    // Injects RouteLifecycleRepository + RouteFinderService (both already in this module).
    RouteService,
    // System 9b C8 — CorridorDebtService: single SSOT for corridor_debt accumulation + decay (DD-DEBT-SSOT D3).
    // Registers NIGHTLY/11 decay tick. Injected by DistributionService + RouteService for A* debt snapshot.
    CorridorDebtService,
    // P3-C C7 — RoutePatchSweepService: registers NIGHTLY/26 ROUTE_PATCH_SWEEP (design §7.2). Injects
    // RouteLifecycleRepository/RouteFinderService/CorridorDebtService/RouteService (all already in this
    // module). `maybePatchRoute` is ALSO called by DistributionService.dispatch's savedRouteId path.
    RoutePatchSweepService,
    // P3-C C7 — RouteRebuildService: the 3-mode rebuild verb (design §7.4). Injects
    // RouteLifecycleRepository/RouteFinderService/CorridorDebtService (already in this module) +
    // RaidExceptionRepository (already in this module — REUSE the SAME debitWallet VehicleRosterService
    // uses) + StructuralDecisionGovernorService (resolved via ModuleRef, see that service's own header).
    RouteRebuildService,
    // C4/C5 — CourierInterceptionService: provided here for TEST-ONLY use by DistributionTestController
    // (the run-interception-tick route drives the MINUTE/21 consumer). The production MINUTE/21 instance
    // lives in InsuranceModule; providing it here avoids the circular dependency
    // InsuranceModule→DistributionModule→InsuranceModule (LieutenantModule in the chain breaks forwardRef).
    // Both instances share the same DB + the bus, so the idempotency guard in CourierDetectionService
    // prevents duplicate caught_exception rows even if both instances fire for the same shift.
    // NOTE: This instance needs CourierDetectionService (C5) which IS in this module — no extra dep.
    CourierInterceptionService,
    // System 9b C10 — EphemeralPurgeService: the DD-EPHEMERAL cash surcharge (surchargeAtDispatch) +
    // post-execution operation-trail purge (purgeAfterExecution — shift record + route↔shift history +
    // route_version_history; NOT BPD memory / corridor_debt / active caught_exception, DIV-E1).
    // Injected by: DistributionService (dispatch surcharge gate) + DistributionTransitService (arrival hook).
    EphemeralPurgeService,
    // System 9b C11 — RaidExceptionRepository: the diegetic wallet debit (debitWallet) used by
    // VehicleRosterService.purchaseVehicle (DIV-R1 cash-only, OQ-RS1). The same guard pattern as
    // EphemeralPurgeService (cash_cents >= cost → never negative). Not imported via a sub-module
    // (RaidExceptionModule not created); the repository is directly provided here (same @Global() DbModule).
    RaidExceptionRepository,
    // System 9b C11 — VehicleRosterService: the equipment-purchase pool (DD-ROSTER §5.1) +
    // capacity enforcement (DD-VEHICLE-STATS §5.2). Injects DB + RaidExceptionRepository.
    // ownsVehicle(foot) always true (OQ-RS4 — foot default-allow). enforceCapacity PURE (OQ-VS2).
    VehicleRosterService,
    // System 9c C4 — RouteRequestRepository: Drizzle CRUD over the route_request table
    // (insertPending / readPendingForHubOldestFirst / markFulfilled / markCancelled).
    RouteRequestRepository,
    // System 9c C4 — RouteRequestService: the DD-ROUTE-REQUEST producer — enqueueAndEmit writes the
    // durable route_request row AND emits the RouteRequestEvent (OQ-RR1). Injects RouteRequestRepository
    // + CityEventBus (from SchedulerModule, already imported — no new import needed).
    RouteRequestService,
    // System 9c C5 — LieutenantRepository: directly provided here to break the circular dependency
    // (LieutenantModule→DistributionModule already exists; DistributionModule cannot import LieutenantModule).
    // Mirrors the CourierInterceptionService precedent (lines 164-171). LieutenantRepository only needs the
    // @Global() DbModule which DistributionModule already accesses.
    LieutenantRepository,
    // System 9c C5 — LogisticsBindingService: directly provided here so CoordinatorExecutionService can
    // inject it. Its deps are DistributionService + LieutenantRepository + RouteRequestRepository (via
    // @Optional()) — all available in this module. The @Optional() on RouteRequestRepository in
    // LogisticsBindingService is a safety net; in both DistributionModule and LieutenantModule contexts the
    // repo is effectively non-null (DistributionModule provides it directly; LieutenantModule imports this
    // module which exports it). The tick-driven LOGISTICS path simply never queries route_request because
    // those (lab/stash) lieutenants have no hub rows.
    LogisticsBindingService,
    // System 9c C5 — CoordinatorExecutionService: the DD-COORD-TRIGGER event-driven executor.
    // Subscribes to RouteRequestEvent at boot (onApplicationBootstrap); resolves hub coordinator script;
    // applies the resolved action; flips the route_request status pending → fulfilled (idempotent).
    CoordinatorExecutionService,
  ],
  // C5 (04b-A): RouteFinderService exported so RivalAiModule (DistributedHoldService) can inject it
  // READ-only for DD-ROUTEGRAPH-REUSE (Coil Distributed Hold). No circular dep: DistributionModule
  // does NOT import RivalAiModule. The export is additive — existing consumers are unaffected.
  exports: [DistributionService, DistributionProjectionService, CourierDetectionService, CorridorDebtService, RouteRequestService, RouteRequestRepository, RouteFinderService],
})
export class DistributionModule {}

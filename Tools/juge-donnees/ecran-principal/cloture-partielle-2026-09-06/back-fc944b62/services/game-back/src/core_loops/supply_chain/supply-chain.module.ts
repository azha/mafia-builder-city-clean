// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C2 (legs — activation +
//             accrual d'arrivée; module skeleton)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §2 (seam map) + §10
//             (persistence) + §15 (invariants).
//             Decisions: §1.12 D12 (module layout — `src/core_loops/supply_chain/`, mirrors
//             `flag_discipline/`: legs + mycelial + backpressure + detectors + projections + controller
//             joueur + module — this chunk builds ONLY the legs slice: `LegRepository` +
//             `LegAccrualService`. No PRODUCTION controller yet — the first player/BO-facing verb lands
//             at C4 (maintain) / C6 (trace) / C9 (BO). `SupplyChainTestController` (TEST-ONLY, the I1
//             concurrency probe, gated `testControllersEnabled()`) is this chunk's own addition.
//             — P3-C C2 — 2026-07-12
//
// `SupplyChainModule` — a LEAF module: `LegRepository` needs only the injected DB client;
// `LegAccrualService` needs only `LegRepository` (same-module, resolved without an import) + the plain
// `coreLoopsTunables` object import (not a Nest provider — the SAME pattern every `*-tunables.ts` getter
// module uses across this codebase, no DI edge at all). C3 ADDS `SchedulerModule` (the ONE new import
// this chunk needs — `MycelialDecayTickService` injects `CitySimSchedulerService` for its NIGHTLY/25
// registration, the SAME edge `FlagDisciplineModule` documents for its own tick service).
//
// CONSUMER (C2): `DistributionModule` imports THIS module so `DistributionTransitService` can inject
// `LegAccrualService` for the post-tx-arrival hook (register §0 row 8), and (C3) `DistributionService`
// can inject `LegRepository` for the dispatch-time stress read (`findLegState`, migration 0126's own
// FROZEN-multiplier hook + the C4 `LEG_RESTING` gate). This is a ONE-WAY edge — `SupplyChainModule`
// imports NOTHING from `DistributionModule` (or any operational module), so there is no cycle to break
// (unlike the `LieutenantModule`⟷`DistributionModule` chain `distribution.module.ts`'s own header
// documents elsewhere).
//
// C4 ADDS: `Loop10Module` (for `StructuralDecisionGovernorService`, the `structural_reinforce` mode's
// governor wrap — a fresh one-way edge, `Loop10Module`'s own transitive closure — DbModule/SessionModule
// forwardRef/ProgressionModule/SchedulerModule — never reaches back into `DistributionModule`, so no
// cycle) + `ExceptionsRepository`/`RaidExceptionRepository` provided DIRECTLY (NOT via importing
// `ExceptionsModule` — that WOULD cycle: `ExceptionsModule → LieutenantModule → DistributionModule →
// SupplyChainModule → ExceptionsModule`. `DistributionModule` already established this exact workaround
// for `RaidExceptionRepository` — its own comment: "Not imported via a sub-module ... the repository is
// directly provided here (same @Global() DbModule)" — `SessionModule` independently re-provides BOTH
// `ExceptionsRepository`/`ExceptionsProjectionService` the SAME way for the SAME reason. Both classes are
// stateless (DB-only ctor) — a duplicate instance per module is harmless) + `SupplyChainController` (the
// FIRST player-facing production route this lot ships — always-on, NOT test-gated, mirrors
// `RouteController`/`VehicleRosterController`'s own "production player-facing route" registration).
//
// C5 ADDS (design §6.1/§6.2 — the 6 `BlockedOutputDetector`s + `BlockedOutputDetectorRegistry` +
// `BackpressureUpdateService` MINUTE/26): imports `ErlangStashModule`/`BufferBloatModule` PROPERLY (NOT
// duplicate-provided — both `ErlangStashService`/`BufferBloatService` hold IN-MEMORY tick state +
// `OnApplicationBootstrap` scheduler registrations of their OWN, so a duplicate-provided instance would be
// a DISCONNECTED shadow copy, never seeing the real MINUTE tick's in-memory blocking/overflow flags — the
// unsafe case `ExceptionsRepository`'s own precedent explicitly limits itself to STATELESS DB-only
// classes; both modules import ONLY `SchedulerModule`/`AuthModule`, so importing them here creates no
// cycle back into `SupplyChainModule`). `DistributionRepository`/`HubRosterService`/`BufferBloatRepository`
// /`MoneyHoldingRepository` ARE duplicate-provided directly (the SAME stateless-DB-only-or-pure-no-ctor
// safety test the `ExceptionsRepository` precedent applies — none of the four hold in-memory state or a
// lifecycle hook; importing their OWNING modules would either cycle (`DistributionModule` imports THIS
// module) or pull in unrelated surface for a single read).
//
// C6 ADDS (design §6.2/§6.3/§9 — the trace verb + the critical-crossing producer): `BackpressureException
// Producer` (stateless, DB-free — its ONE dependency is the already-provided `ExceptionsRepository` above,
// REUSING `hasPendingForBuilding` rather than adding any new DB-touching class) + `BackpressureTraceService`
// (stateless, its ONE dependency is the already-provided `SupplyNodePressureRepository`) + the 3 new
// `SupplyChainController` routes (`GET .../backpressure`, `POST .../trace-step`, `POST .../resolve`). No
// new module import — both new providers close entirely over dependencies this module already carries.
//
// C7 ADDS (design §7.3/§9 — the collapse producer, ruling-B): `RouteCollapseExceptionProducer` (its deps
// are the already-provided DB client + `ExceptionsRepository` — no new module import) — provided AND
// EXPORTED here (unlike its C4/C6 siblings, which are consumed only WITHIN this module) because the
// CALLER lives in `DistributionModule`'s `RouteService` (`evaluateAndMaybeSever`'s OR-extended collapse
// branch, ruling-B) — `DistributionModule` already imports `SupplyChainModule` (a ONE-WAY edge, the
// header above), so exporting this ONE additional provider adds no new cross-module edge.
//
// (RouteRebuildService, DistributionModule, ALSO needs StructuralDecisionGovernorService for the code 9
// SINUOSITY_FULL_RESET wrap — it does NOT reach it through this module. Re-exporting the class/module
// through here was tried and reverted this session: see distribution.module.ts's own header for the
// full circular-import-decorator-metadata account + the Symbol-token fix
// (`structural-decision-governor.token.ts`) that replaced it.)
//
// C9 ADDS (design §4/§13/§14 — the player graph view + the BO surface): `SupplyChainGraphService`
// (stateless, its deps — `SupplyNodePressureRepository`/`LegRepository`/`DB` — are ALL already provided
// here) + the 3 new `SupplyChainController` graph routes (no new module import — the service closes
// entirely over dependencies this module already carries) + `SupplyChainAdminController` (the BO
// surface — its ONE new dependency, `AdminAuditLogService`, is duplicate-provided below, the SAME
// stateless-DB-only precedent every sibling admin module follows, e.g. `FlagDisciplineModule`/
// `CoreLoopsModule`'s own `providers: [AdminAuditLogService]`). `route`/`route_version_history` are read
// via a DIRECT schema import inside the graph service / admin controller (pure Drizzle table objects,
// zero NestJS edge — see those files' own headers for the module-cycle reasoning this avoids).

import { Module } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { Loop10Module } from '../../progression/loop10/loop10.module';
import { ErlangStashModule } from '../../citysim/erlang_stash/erlang-stash.module';
import { BufferBloatModule } from '../../citysim/buffer_bloat/buffer-bloat.module';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import { RaidExceptionRepository } from '../../exceptions/raid-exception.repository';
import { DistributionRepository } from '../../operational/distribution/distribution.repository';
import { HubRosterService } from '../../operational/distribution/hub-roster.service';
import { ErlangStashRepository } from '../../citysim/erlang_stash/erlang-stash.repository';
import { BufferBloatRepository } from '../../citysim/buffer_bloat/buffer-bloat.repository';
import { MoneyHoldingRepository } from '../../operational/money_holding/money-holding.repository';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { LegRepository } from './leg.repository';
import { LegAccrualService } from './leg-accrual.service';
import { MycelialDecayTickService } from './mycelial-decay-tick.service';
import { MycelialMaintenanceAdvanceService } from './mycelial-maintenance-advance.service';
import { MycelialStressExceptionProducer } from './mycelial-stress-exception-producer.service';
import { LegMaintenanceRepository } from './leg-maintenance.repository';
import { LegMaintenanceService } from './leg-maintenance.service';
import { StashErlangBlockingDetector } from './detectors/stash-erlang-blocking.detector';
import { HubRosterSaturatedDetector } from './detectors/hub-roster-saturated.detector';
import { LaunderNodeOverflowDetector } from './detectors/launder-node-overflow.detector';
import { DealerUnavailableDetector } from './detectors/dealer-unavailable.detector';
import { RouteSeveredDestinationDetector } from './detectors/route-severed-destination.detector';
import { LegStressedOriginDetector } from './detectors/leg-stressed-origin.detector';
import { BlockedOutputDetectorRegistry } from './blocked-output-detector.registry';
import { SupplyNodePressureRepository } from './supply-node-pressure.repository';
import { BackpressureUpdateService } from './backpressure-update.service';
import { BackpressureExceptionProducer } from './backpressure-exception-producer.service';
import { BackpressureTraceService } from './backpressure-trace.service';
import { RouteCollapseExceptionProducer } from './route-collapse-exception-producer.service';
import { SupplyChainGraphService } from './supply-chain-graph.service';
import { SupplyChainController } from './supply-chain.controller';
import { SupplyChainAdminController } from './supply-chain-admin.controller';
import { SupplyChainTestController } from './supply-chain-test.controller';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';

@Module({
  imports: [DbModule, SchedulerModule, Loop10Module, ErlangStashModule, BufferBloatModule],
  controllers: [
    // C4 — SupplyChainController: the FIRST player-facing production route (POST .../maintain).
    // Always-on (not test-gated) — mirrors RouteController/VehicleRosterController.
    SupplyChainController,
    // C9 — SupplyChainAdminController: the BO surface (T9). Always-on (not test-gated) — mirrors every
    // sibling `*-admin.controller.ts` in this codebase.
    SupplyChainAdminController,
    // C2 — SupplyChainTestController: the I1 concurrency probe (_test/supply-chain/record-throughput) +
    // (C3) the run-mycelial-decay test seam + (C5) run-backpressure-update/read-node-pressure. Mounted
    // only in non-production envs (testControllersEnabled(), the DistributionTestController precedent).
    ...(testControllersEnabled() ? [SupplyChainTestController] : []),
  ],
  providers: [
    LegRepository,
    LegAccrualService,
    MycelialDecayTickService,
    // C4 additions:
    MycelialMaintenanceAdvanceService,
    MycelialStressExceptionProducer,
    LegMaintenanceRepository,
    LegMaintenanceService,
    // Duplicate-provided (D3/cycle-avoidance — see header comment above), NOT imported via their module.
    ExceptionsRepository,
    RaidExceptionRepository,
    // C5 additions — duplicate-provided (stateless DB-only, see header):
    DistributionRepository,
    HubRosterService,
    ErlangStashRepository,
    BufferBloatRepository,
    MoneyHoldingRepository,
    // C5 — the 6 v1 LIVE BlockedOutputDetectors (decisions §6.6 sub-décision #6) + the registry built
    // from them (mirrors Loop10Module's own HlCardProviderRegistry useFactory wiring).
    StashErlangBlockingDetector,
    HubRosterSaturatedDetector,
    LaunderNodeOverflowDetector,
    DealerUnavailableDetector,
    RouteSeveredDestinationDetector,
    LegStressedOriginDetector,
    {
      provide: BlockedOutputDetectorRegistry,
      useFactory: (
        stashErlangBlocking: StashErlangBlockingDetector,
        hubRosterSaturated: HubRosterSaturatedDetector,
        launderNodeOverflow: LaunderNodeOverflowDetector,
        dealerUnavailable: DealerUnavailableDetector,
        routeSeveredDestination: RouteSeveredDestinationDetector,
        legStressedOrigin: LegStressedOriginDetector,
      ) =>
        new BlockedOutputDetectorRegistry([
          stashErlangBlocking,
          hubRosterSaturated,
          launderNodeOverflow,
          dealerUnavailable,
          routeSeveredDestination,
          legStressedOrigin,
        ]),
      inject: [
        StashErlangBlockingDetector,
        HubRosterSaturatedDetector,
        LaunderNodeOverflowDetector,
        DealerUnavailableDetector,
        RouteSeveredDestinationDetector,
        LegStressedOriginDetector,
      ],
    },
    SupplyNodePressureRepository,
    // C6 — the critical-crossing producer (dedup REUSE via the already-provided ExceptionsRepository
    // above, D3 wall) + the trace verb service (design §6.3). Both are stateless/no-lifecycle-hook, safe
    // to register directly here alongside their sibling C4/C5 counterparts.
    BackpressureExceptionProducer,
    BackpressureTraceService,
    BackpressureUpdateService,
    // C7 — the collapse producer (ruling-B). Exported below for RouteService (DistributionModule).
    RouteCollapseExceptionProducer,
    // C9 — the player graph-view combiner (design §4/§13) + AdminAuditLogService (BO mutation audit,
    // duplicate-provided — the SAME stateless-DB-only precedent every sibling admin module follows).
    SupplyChainGraphService,
    AdminAuditLogService,
  ],
  // P3-E C7 (additive) — `LegMaintenanceService` EXPORTED so `CompressionModule`'s board-decide verb
  // dispatch ("mode maintenance mycelial", design §10.2/D12) can call the REAL `maintain()` verb for
  // `stressed_leg` board entries — zero reimplementation, zero new write-path (D12).
  exports: [LegRepository, LegAccrualService, MycelialDecayTickService, RouteCollapseExceptionProducer, LegMaintenanceService],
})
export class SupplyChainModule {}

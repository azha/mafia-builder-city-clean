// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (module skeleton
//             — session-close subscriber + W/14 tick + deferral verb)
//             Decisions: §3 (Registre de transposition — `CompressionWeekService.updateStressAccumulator
//             per session` -> subscriber session-close, D5).
//             Pattern: `DemolitionModule` (standalone leaf module, registered directly in `app.module.ts` —
//             NOT nested under a shared `CoreLoopsModule`) + its own `DemolitionModule -> RealEstateModule`
//             ONE-WAY import precedent (`FrictionBudgetRepository` EXPORT consumed here the SAME way
//             `RealEstateService` is consumed by `ReplacementOptionController`).
//             — P3-E C6 — 2026-07-17
//
// `CompressionModule` — the ch05 Loop 9 Compression Week runtime home, C6 slice: `CompressionStress
// Subscriber` (session-close, D5) + `CompressionQuietDecayTickService` (`COMPRESSION_QUIET_DECAY_TICK`
// WEEKLY/14) + `CompressionController`/`CompressionDeferService` (`POST /v1/compression/defer`, I6).
// Imports `DemolitionModule` ONE-WAY (`FrictionBudgetRepository` EXPORT — the friction-penalty §8.2
// source, verified no cycle: `DemolitionModule` imports nothing from here). ★ C6-fix: also imports
// `ProgressionModule` ONE-WAY (`ProgressionRepository` EXPORT — `CompressionWeekRepository.ensureRow`,
// see that file's own header for the correctness rationale; verified no cycle, `ProgressionModule`
// imports only `DbModule`/`AuthModule`). Standalone leaf module (mirrors `SupplyChainModule`/
// `CueStackModule`/`DemolitionModule`).
//
// ★ P3-E C7 fold — the board (`ProblemAggregator` + engage/decide/finalize + teeth): 3 MORE ONE-WAY
// module imports, each VERIFIED no-cycle the SAME way (`CompressionModule` is a pure leaf — NOTHING
// imports it back except `app.module.ts`, so importing modules that themselves import `SessionModule`/
// `Loop10Module` cannot loop back here):
//   - `DemolitionModule` NOW ALSO exports `DecommissionService` + re-exports `Loop10Module`
//     (`StructuralDecisionGovernorService`) — the "décommission → gouverneur" board verb (§10.2/§10.5).
//   - `ExceptionsModule` NOW ALSO exports `ExceptionsService` — the "resolve spine card"/"ack cascade"
//     board verbs (§10.2), REUSING the REAL `resolve()` (registry dispatch + progression/session hooks),
//     zero reimplementation.
//   - `FlagDisciplineModule` (EXPORTS `FlagDisciplineService`, already established shape) — the
//     "valider-dismiss flag" board verbs.
//   - `SupplyChainModule` NOW ALSO exports `LegMaintenanceService` — the "mode maintenance mycelial"
//     board verb.
// `CompressionResidueExceptionProducer`/`CompressionFinalizeRepository`/`CompressionFinalizeService` are
// DELIBERATELY self-contained (`@Inject(DB)` + duplicate-provided `ExceptionsRepository` only) and are
// ALSO duplicate-provided in `DemolitionModule` (the N/31 abandon-sweep, D15) — see those files' own
// headers for the full "avoids a 2nd DemolitionModule<->CompressionModule edge" rationale.
//
// ★ P3-E C8 fold — `CompressionProjectionController` (`GET /v1/compression/state`) + `DemolitionCompression
// AdminController` (the BO surface, 5 GETs + 2 forces): the latter needs `AdminAuditLogService`
// (`db/admin-audit-log.service.ts`, `@Inject(DB)`-only, stateless — duplicate-provided directly, the SAME
// `CueStackModule` precedent, rather than importing whatever module happens to own it elsewhere).

import { Module } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { DemolitionModule } from '../demolition/demolition.module';
import { ProgressionModule } from '../../progression/progression.module';
import { ExceptionsModule } from '../../exceptions/exceptions.module';
import { FlagDisciplineModule } from '../flag_discipline/flag-discipline.module';
import { SupplyChainModule } from '../supply_chain/supply-chain.module';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { CompressionSignalRepository } from './compression-signal.repository';
import { CompressionStressReaderService } from './compression-stress-reader.service';
import { CompressionWeekRepository } from './compression-week.repository';
import { CompressionStressSubscriber } from './compression-stress-subscriber.service';
import { CompressionQuietDecayTickService } from './compression-quiet-decay-tick.service';
import { CompressionDeferService } from './compression-defer.service';
import { CompressionController } from './compression.controller';
import { CompressionTestController } from './compression-test.controller';
import { ProblemAggregatorRepository } from './problem-aggregator.repository';
import { ProblemAggregatorService } from './problem-aggregator.service';
import { CompressionResidueExceptionProducer } from './compression-residue-exception-producer.service';
import { CompressionFinalizeRepository } from './compression-finalize.repository';
import { CompressionFinalizeService } from './compression-finalize.service';
import { CompressionBoardRepository } from './compression-board.repository';
import { CompressionBoardService } from './compression-board.service';
import { CompressionSessionOpenedSubscriber } from './compression-session-opened-subscriber.service';
import { CompressionBoardController } from './compression-board.controller';
import { CompressionProjectionController } from './compression-projection.controller';
import { DemolitionCompressionAdminController } from './demolition-compression-admin.controller';

@Module({
  // DemolitionModule EXPORT (FrictionBudgetRepository, DecommissionService, Loop10Module re-export) +
  // ProgressionModule EXPORT (ProgressionRepository) + ExceptionsModule EXPORT (ExceptionsService,
  // C7 additive) + FlagDisciplineModule EXPORT (FlagDisciplineService, C7 additive) + SupplyChainModule
  // EXPORT (LegMaintenanceService, C7 additive) — ALL ONE-WAY, no cycle (see file header).
  imports: [DbModule, SchedulerModule, DemolitionModule, ProgressionModule, ExceptionsModule, FlagDisciplineModule, SupplyChainModule],
  controllers: [
    // P3-E C6 — the FIRST player-facing Loop 9 route (POST /v1/compression/defer).
    CompressionController,
    // P3-E C7 — the board routes (POST engage · GET board · POST .../decide).
    CompressionBoardController,
    // P3-E C8 — GET /v1/compression/state (design §15, deferred by C7's own header note).
    CompressionProjectionController,
    // P3-E C8 — the BO surface (5 GETs + 2 f3_deferred forces, design §17).
    DemolitionCompressionAdminController,
    // C6 — CompressionTestController: TEST-ONLY direct-invocation seams. Mounted only in non-production
    // envs (testControllersEnabled(), the DemolitionTestController/SupplyChainTestController precedent).
    ...(testControllersEnabled() ? [CompressionTestController] : []),
  ],
  providers: [
    CompressionSignalRepository,
    CompressionStressReaderService,
    CompressionWeekRepository,
    CompressionStressSubscriber,
    CompressionQuietDecayTickService,
    CompressionDeferService,
    // P3-E C7 — the board.
    ProblemAggregatorRepository,
    ProblemAggregatorService,
    CompressionResidueExceptionProducer,
    CompressionFinalizeRepository,
    CompressionFinalizeService,
    CompressionBoardRepository,
    CompressionBoardService,
    CompressionSessionOpenedSubscriber,
    // P3-E C8 — the BO surface's audit REUSE (mirrors `CueStackModule`'s own direct-provide of this
    // SAME stateless, `@Inject(DB)`-only class — `admin_audit_log`, R9.3, never a parallel audit path).
    AdminAuditLogService,
  ],
  exports: [CompressionStressReaderService, CompressionWeekRepository, CompressionStressSubscriber, CompressionBoardService],
})
export class CompressionModule {}

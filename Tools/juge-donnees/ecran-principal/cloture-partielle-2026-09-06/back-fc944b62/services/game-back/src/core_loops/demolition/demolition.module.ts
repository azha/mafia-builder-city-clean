// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2 (module skeleton
//             — friction engine + N/31 tick + penalty state + spine card) + §C4 (decommission verb —
//             endpoint/service/repository + Loop 10 governor wire)
//             Decisions: §3 (Registre de transposition — "1 module core_loops/demolition/ : service +
//             repository + tick handler").
//             Pattern: `supply_chain.module.ts` (standalone leaf module, registered directly in
//             `app.module.ts` — NOT nested under `CoreLoopsModule`, avoiding that module's own documented
//             cascading-import-cycle hazard) + its own `ExceptionsRepository` duplicate-provided
//             (stateless DB-only class) precedent for the producer + `real-estate.module.ts`'s own
//             `Loop10Module` DIRECT import (the governor wrap's working default shape — the token/
//             ModuleRef indirection `structural-decision-governor.token.ts` documents is a DistributionModule-
//             SPECIFIC empirically-forced workaround, not a general requirement).
//             — P3-E C2 — 2026-07-17 / P3-E C4 (decommission verb) — 2026-07-17
//
// `DemolitionModule` — the ch05 Loop 8 Demolition Mandate runtime home. C2 = the friction engine: 1-1
// per-player `friction_budget_state` cache + `FRICTION_BUDGET_TICK` (NIGHTLY/31) + the penalty
// apply/revert transitions + `FrictionThresholdExceptionProducer` (D3: a NEW caller of the EXISTING,
// unmodified `ExceptionsRepository.insert`, zero `src/exceptions/` edit — `ExceptionsRepository` is
// duplicate-provided here directly, the SAME "stateless DB-only class" precedent
// `MycelialStressExceptionProducer`/`CueCascadeExceptionProducer` already establish, avoiding importing
// the far heavier `ExceptionsModule` dependency chain for a single leaf-safe repository).
//
// C4 = the decommission verb: `DecommissionRepository` (the design §6.3 tx) + `DecommissionService`
// (confirm guard + post-commit event emission) + `DecommissionController` (`POST /v1/friction/nodes/:id/
// decommission`, routed through the Loop 10 governor — `Loop10Module` import, EXPORTS
// `StructuralDecisionGovernorService`).
//
// Standalone leaf module (mirrors `SupplyChainModule`/`CueStackModule` — registered directly in
// `app.module.ts`, nothing imports it back): C5 (replacement options)/C8 (BO panel) will extend this SAME
// module as their own services/controllers land (this file's own doc comments will track that history,
// mirroring `supply-chain.module.ts`'s per-chunk header convention).

import { Module } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { Loop10Module } from '../../progression/loop10/loop10.module';
import { RealEstateModule } from '../../operational/real_estate/real-estate.module';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { FrictionBudgetRepository } from './friction-budget.repository';
import { FrictionThresholdExceptionProducer } from './friction-threshold-exception-producer.service';
import { FrictionBudgetTickService } from './friction-budget-tick.service';
import { DecommissionRepository } from './decommission.repository';
import { DecommissionService } from './decommission.service';
import { DecommissionController } from './decommission.controller';
import { ReplacementOptionRepository } from './replacement-option.repository';
import { ReplacementOptionService } from './replacement-option.service';
import { ReplacementOptionController } from './replacement-option.controller';
import { FrictionProjectionService } from './friction-projection.service';
import { FrictionProjectionController } from './friction-projection.controller';
import { DemolitionTestController } from './demolition-test.controller';
import { CompressionFinalizeRepository } from '../compression/compression-finalize.repository';
import { CompressionResidueExceptionProducer } from '../compression/compression-residue-exception-producer.service';
import { CompressionFinalizeService } from '../compression/compression-finalize.service';

@Module({
  // P3-E C5 (additive) — RealEstateModule EXPORTS RealEstateService: `ReplacementOptionController#pick`
  // delegates to the EXISTING purchase flow (design §7 ★#5 — zero new purchase write-path). ONE-WAY:
  // RealEstateModule does not import DemolitionModule (verified — no cycle).
  imports: [DbModule, SchedulerModule, Loop10Module, RealEstateModule],
  controllers: [
    // P3-E C4 — the FIRST player-facing Loop 8 route (POST /v1/friction/nodes/:id/decommission).
    DecommissionController,
    // P3-E C5 — replacement options list/pick (GET/POST /v1/friction/replacement-options[/:id/pick]).
    ReplacementOptionController,
    // P3-E C8 — the §15 player projections (GET /v1/friction/state, GET /v1/friction/nodes/:buildingId).
    FrictionProjectionController,
    // C2 — DemolitionTestController: TEST-ONLY direct-invocation seams (run-friction-budget-tick +
    // fixture writes). Mounted only in non-production envs (testControllersEnabled(), the
    // SupplyChainTestController/CueStackTestController precedent).
    ...(testControllersEnabled() ? [DemolitionTestController] : []),
  ],
  providers: [
    // Duplicate-provided directly (NOT via ExceptionsModule import — see file header note above).
    ExceptionsRepository,
    FrictionBudgetRepository,
    FrictionThresholdExceptionProducer,
    FrictionBudgetTickService,
    // P3-E C4 — the decommission verb.
    DecommissionRepository,
    DecommissionService,
    // P3-E C5 — replacement options (scorer is a pure module, no DI — see replacement-option-scorer.ts).
    ReplacementOptionRepository,
    ReplacementOptionService,
    // P3-E C8 — the §15 player projections service.
    FrictionProjectionService,
    // P3-E C7 (additive) — the N/31 `FRICTION_BUDGET_TICK` abandon-sweep (D15, `friction-budget-tick.
    // service.ts`) needs to finalize an abandoned `'active'` compression board — `CompressionFinalize
    // Repository`/`Service` + `CompressionResidueExceptionProducer` are DELIBERATELY self-contained
    // (`@Inject(DB)` + duplicate-provided `ExceptionsRepository` only, see those files' own headers) so
    // they can be duplicate-provided HERE (a `DemolitionModule -> CompressionModule` import would be a
    // genuine cycle: `CompressionModule` ALREADY imports `DemolitionModule` for `FrictionBudgetRepository`,
    // C6). NOT exported — internal to this module's own N/31 tick only.
    CompressionResidueExceptionProducer,
    CompressionFinalizeRepository,
    CompressionFinalizeService,
  ],
  // P3-E C7 (additive) — `DecommissionService` EXPORTED so `CompressionModule`'s board-decide
  // "décommission → gouverneur" verb (design §10.2/§10.5) can call the REAL decommission write-path —
  // `Loop10Module` RE-EXPORTED alongside it (NestJS module re-export — `CompressionModule` gains
  // `StructuralDecisionGovernorService` transitively, zero 2nd direct import needed) for the SAME call's
  // governor wrap (mirrors `DecommissionController`'s own `governor.commit(NODE_DECOMMISSION, …)` shape).
  exports: [FrictionBudgetRepository, FrictionBudgetTickService, FrictionThresholdExceptionProducer, DecommissionService, Loop10Module],
})
export class DemolitionModule {}

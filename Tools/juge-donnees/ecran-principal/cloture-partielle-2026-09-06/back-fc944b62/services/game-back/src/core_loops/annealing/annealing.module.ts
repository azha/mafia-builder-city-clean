// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 (module skeleton — D12
//             "core_loops/cue_stack/ + core_loops/annealing/", the `core_loops/supply_chain/` ONE-module-
//             per-owned-directory precedent).
//             — P3-D C6 — 2026-07-14
//
// `AnnealingModule` — the ch05 Loop 7 Annealing Window: `AnnealingRepository`/`AnnealingService` (I5
// initiation/compounding) + `AnnealingSettleSweepService` (MINUTE/30 real-clock sweep, I6) +
// `AnnealingInitiationSubscriberService` (the 6 LIVE `ChangeType` bus subscribers — P3-D's original 5 +
// P3-E C4's `BUILDING_DECOMMISSION` flip) + `InitiatingChangeRegistry`
// (closed, dup-throw boot — mirrors `CueStackModule`'s own `SlotTypeExecutorRegistry` useFactory shape).
//
// Needs ONLY `DbModule` (the annealing_state persistence + C7's own building/lieutenant/clock schema reads)
// + `SchedulerModule` (CityEventBus — the 6 subscriptions + the 3 emits — AND `CitySimSchedulerService`,
// the MINUTE/30 registration). NO import of `CueStackModule`/`LieutenantModule`/`RecruitmentModule`: this
// module never calls INTO any of those — it only LISTENS on the shared bus those modules' OWN verb sites
// additionally emit onto, OR (C7 rolling-queue) reads their schema TABLES directly (the SAME "import the
// table, never the sibling module's service" convention the HL card providers already establish, e.g.
// `mycelial-stressed-leg.provider.ts` importing `supplyChainLegRow` directly) — zero coupling either way
// (D12/decisions §0 "surfaces partagées: ADDITIF seulement").
//
// ★ P3-D C7 CORRECTION (2026-07-15) of this file's OWN C6-authored anticipation ("C7's own future
// commit-guard integration is the ONE forward exception, not built here" — since removed from this
// comment): the I7 commit guard did NOT end up importing this module. Design mandates the compounding
// write share the EXACT SAME DB transaction as the `cue_stacks` I2 commit UPDATE, and this codebase has NO
// precedent of a repository method accepting an externally-opened transaction client — so
// `CueStackRepository#commitWithSettlingGuard` instead touches `annealing_state` DIRECTLY (importing the
// schema table, not this class), inside its OWN `db.transaction`, mirroring `maintenance.repository.ts#
// debitAndArmSchedule`'s cross-table-in-one-transaction precedent. `CueStackModule` therefore does NOT
// import `AnnealingModule` at all. Surfaced honestly (the prior comment's anticipation did not pan out)
// rather than silently landing something else — see that method's own header for the full account.
//
// Registered directly in `AppModule.imports[]` (mirrors the pre-C7 positioning) — but C7 ADDS two REAL
// consumers that DO import this module (both leaf-safe, no cycle — this module imports only DbModule/
// SchedulerModule, neither of which imports either back): `DistributionModule` (dispatch-compose seam,
// design §10.1 — needs `AnnealingRepository` for the read-only settling check) and `SessionModule`
// (the `settling_glance` session-open key, design §10.3/ruling #5 — needs `AnnealingRepository` for the
// player's active-settling count). This module's OWN new `AnnealingController` (C7, `GET /v1/annealing/
// rolling-queue`) is the FIRST player-facing Loop 7 route (C6 shipped only the `_test` controller).

import { Module } from '@nestjs/common';

import { DbModule } from '../../db/db.module';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { AnnealingRepository } from './annealing.repository';
import { AnnealingService } from './annealing.service';
import { AnnealingSettleSweepService } from './annealing-settle-sweep.service';
import { AnnealingInitiationSubscriberService } from './annealing-initiation-subscriber.service';
import { InitiatingChangeRegistry } from './initiating-change.registry';
import { LIVE_CHANGE_TYPES } from './initiating-change.catalogue';
import { AnnealingTestController } from './annealing-test.controller';
import { AnnealingRollingQueueService } from './annealing-rolling-queue.service';
import { AnnealingController } from './annealing.controller';

@Module({
  imports: [DbModule, SchedulerModule],
  controllers: [
    // C7 — AnnealingController: the FIRST player-facing route, GET /v1/annealing/rolling-queue (design
    // §10.3). Always-on (not test-gated) — a production player-facing endpoint.
    AnnealingController,
    // AnnealingTestController: in-memory `SettlingInitiatedEvent`/`CompoundingStrainEvent`/
    // `SettlingCompletedEvent` capture probe + direct-call concurrency/backdate seams (Lesson #3). Mounted
    // only in non-production envs (testControllersEnabled(), the CueStackTestController precedent).
    ...(testControllersEnabled() ? [AnnealingTestController] : []),
  ],
  providers: [
    AnnealingRepository,
    // The closed, dup-throw-boot registry (mirrors SlotTypeExecutorRegistry's own useFactory shape) — built
    // from the SAME LIVE_CHANGE_TYPES list every subscriber's own literal ChangeType argument is drawn
    // from (`initiating-change.catalogue.ts`). No per-type behavior object needed (initiating-change.
    // registry.ts's own header — every ChangeType feeds the IDENTICAL AnnealingService algorithm).
    {
      provide: InitiatingChangeRegistry,
      useFactory: () => new InitiatingChangeRegistry(LIVE_CHANGE_TYPES.map((changeType) => ({ changeType }))),
    },
    AnnealingService,
    AnnealingSettleSweepService,
    AnnealingInitiationSubscriberService,
    // C7 — AnnealingRollingQueueService: the design §10.3 read-only projection (settling/touchable/
    // lieutenants_settling), backing AnnealingController above.
    AnnealingRollingQueueService,
  ],
  exports: [AnnealingRepository, AnnealingService],
})
export class AnnealingModule {}

// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md C1 (data model + tunables
//             foundation) + C2 (session runtime test routes) + DD-P2 (module layout — `progression/
//             loop10/` + `session/` land C2/C5; `core_loops/` is the coder-realized cross-cutting home
//             for artifacts the design names with a bare `core-loops-` prefix rather than scoping to
//             either — `core-loops-tunables.ts`, `core-loops-test.controller.ts`, and (C8)
//             `core-loops-admin.controller.ts`. HOW-level choice, C1-reviewer-RATIFIED at C2: "extend
//             that controller, don't create a parallel one" — session's `open-session-as`/
//             `run-session-sweep` `_test` routes land HERE, not a new `session-test.controller.ts`.)
//             Architecture mirror: services/game-back/src/operational/political/political.module.ts
//             (C0 shell pattern).
//             — P3-A C1/C2 — 2026-07-10
//
// `CoreLoopsModule` — C1 = tunables-only shell; C2 imports `SessionModule` so
// `CoreLoopsTestController` can drive `SessionService` directly for its two new C2 test routes
// (`open-session-as`, `run-session-sweep`) — the SAME real service the production `SessionController`
// and the `SESSION_SWEEP` HOURLY/5 tick call (Lesson #3, anti-fabrication).
//
// C3 imports `ExceptionsModule` (re-exported `ExceptionQueueTickService` + `ExceptionsRepository`,
// D3-additive) so `CoreLoopsTestController` can drive the NIGHTLY/22 tick directly for
// `run-exception-tick` — the SAME real service the `EXCEPTION_QUEUE_TICK` scheduler slot calls — and
// the repository directly for `seed-pending-exception` (the D5 cap-guard probe, file header). No
// cycle: `ExceptionsModule` (and its own imports — SessionModule/ProgressionModule/etc.) never imports
// `CoreLoopsModule`. Also imports `SchedulerModule` DIRECTLY (neither `SessionModule` nor
// `ExceptionsModule` re-exports it) so `CityEventBus` is injectable for the `aged-out-events`
// capture-probe (mirrors `ia-test.controller.ts`'s `onModuleInit` subscription convention).
//
// C4+ chunks will extend this module (or introduce the sibling `progression/loop10/` module per DD-P2)
// as their own services/controllers land — this file's own doc comments track that history, mirroring
// `political.module.ts`'s per-chunk header convention.
//
// C6-fix (⊥ IMPORTANT-1 gate, MINOR-2 fold) imports `Loop10Module` (re-exported `HlCardFaultInjector`)
// so `CoreLoopsTestController` can drive the new `arm-hl-provider-failure` test route — the falsifiable
// proof that a provider failure inside `HlCardService#computeAndPersist` degrades `SessionService#open`
// gracefully instead of 500ing. One-directional: `Loop10Module` never imports `CoreLoopsModule`.
//
// P3-A C7: UNCHANGED. `SessionOpenSequenceService` (the session-open payload aggregator) does NOT live
// here — a first attempt hosting it here (needing `ExceptionsService`) cascaded into an UNRELATED
// NestJS boot failure: this module's OWN pre-existing `→ ExceptionsModule → LieutenantModule →
// Loop10Module` chain, once `SessionModule` (which `Loop10Module` already forwardRefs) gained ANY new
// edge reaching back into THIS module, reopened a wider cycle `LieutenantModule`'s plain `Loop10Module`
// import was never written to survive. Reverted — `session-open-sequence.service.ts`'s own header
// carries the fuller account of where it lives instead and why.
//
// P3-A C8 (D14, DD-P2): registers `CoreLoopsAdminController` (the 6 production BO routes, ALWAYS-ON —
// unlike `CoreLoopsTestController`, never conditional on `testControllersEnabled()`) + `AdminAuditLogService`
// as a NEW local provider (mirrors `LiveOpsModule`'s own registration — the service's constructor needs
// only the `@Global()` `DB` token, no module import required beyond `DbModule`, already implicit). The
// admin controller injects `HlCardService` (already exported by `Loop10Module`, already imported above)
// for its `players/:id/hl-card` diagnostic — NO new module import: every other endpoint reads its schema
// tables (`exception_queue`/`gameplay_sessions`/`structural_decisions_audit`/`lieutenant`+
// `behavior_script`/`tunable_overrides`) DIRECTLY via the injected `DB` client, deliberately avoiding a
// `LieutenantModule`/`ExceptionsModule`-deeper import (the C7 cascading-boot-failure hazard this file's
// own header already documents once, above — `core-loops-admin.controller.ts`'s own header carries the
// fuller account for why script-rule-counts is read this way).
//
// P3-B C2 (token & flag state machine): imports `FlagDisciplineModule` (the NEW leaf module,
// `flag_discipline/flag-discipline.module.ts`) so `CoreLoopsTestController` can drive `FlagDisciplineService`
// directly for its 3 NEW test routes (`force-flag`/`set-tokens`/`set-flagged-at`) — the SAME
// zero-live-vs-test-divergence discipline every prior chunk's `_test` routes follow. One-directional:
// `FlagDisciplineModule` never imports `CoreLoopsModule` (it is a leaf — verified C0/C2, no cycle).

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../protocol/test-routes-gate';
import { SessionModule } from '../session/session.module';
import { ExceptionsModule } from '../exceptions/exceptions.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { Loop10Module } from '../progression/loop10/loop10.module';
import { FlagDisciplineModule } from './flag_discipline/flag-discipline.module';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { CoreLoopsTestController } from './core-loops-test.controller';
import { CoreLoopsAdminController } from './core-loops-admin.controller';

// CoreLoopsTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// CoreLoopsAdminController: ALWAYS-ON production BO routes (P3-A C8, D14).
const controllers = [
  CoreLoopsAdminController,
  ...(testControllersEnabled() ? [CoreLoopsTestController] : []),
];

@Module({
  imports: [SessionModule, ExceptionsModule, SchedulerModule, Loop10Module, FlagDisciplineModule],
  controllers,
  providers: [AdminAuditLogService],
  exports: [],
})
export class CoreLoopsModule {}

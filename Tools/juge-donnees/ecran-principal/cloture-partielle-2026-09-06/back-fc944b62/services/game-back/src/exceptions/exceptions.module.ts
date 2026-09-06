import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { LieutenantModule } from '../operational/lieutenant/lieutenant.module';
import { EnforcementModule } from '../operational/enforcement/enforcement.module';
import { ExceptionsRepository } from './exceptions.repository';
import { RaidExceptionRepository } from './raid-exception.repository';
import { EquipmentFailureExceptionRepository } from './equipment-failure-exception.repository';
import { ExceptionsProjectionService } from './exceptions.projection.service';
import { ExceptionProducerService } from './exception-producer.service';
import { RaidExceptionProducerService } from './raid-exception-producer.service';
import { HeatPressureExceptionProducerService } from './heat-pressure-exception-producer.service';
import { EquipmentFailureCardService } from './equipment-failure-card.service';
import { EquipmentFailureExceptionProducerService } from './equipment-failure-exception-producer.service';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';
import { ExceptionQueueTickService } from './exception-queue-tick.service';
import { ExceptionEffectRegistry } from './effects/exception-effect-registry.service';
import { OneTimeHandler } from './effects/one-time.handler';
import { EscalateHandler } from './effects/escalate.handler';
import { AddRuleHandler } from './effects/add-rule.handler';
import { RepairHandler } from './effects/repair.handler';
import { BribeHandler } from './effects/bribe.handler';
import { LayLowHandler } from './effects/lay-low.handler';
import { RepairImmediateHandler } from './effects/repair-immediate.handler';
import { RepairSlowHandler } from './effects/repair-slow.handler';
import { DeferRepairHandler } from './effects/defer-repair.handler';
import { DemolishReplaceHandler } from './effects/demolish-replace.handler';
import { ProgressionModule } from '../progression/progression.module';
import { SessionModule } from '../session/session.module';
import { DelegationRatchetModule } from '../meta_progression/delegation-ratchet.module';
import { BudgetsHorizonModule } from '../meta_progression/budgets-horizon.module';
import { OnboardingFunnelRepository } from '../onboarding/onboarding-funnel.repository';

/** The Exception Queue module (Phase-14 first slice + Phase-16 raid-response). Player-facing list/resolve, the two
 *  event-driven producers (uncovered-heat + raided-building), and the effect handler registry.
 *  P3-A C2 (D2/D3, additive): imports SessionModule for the ONE resolve-path counter seam
 *  (ExceptionsService.resolve → SessionService.recordExceptionResolved) — append-only, no existing
 *  provider/controller touched.
 *  P3-A C3 (D3/D4, additive): registers ExceptionQueueTickService (NIGHTLY/22 provisional — re-priority
 *  + aged-out) as a NEW provider + export — CoreLoopsModule imports this module for the
 *  `run-exception-tick` `_test` route (DD-P4).
 *  P3-A C7: UNCHANGED — `session-open-sequence.service.ts`'s own header explains why it deliberately does
 *  NOT import this module (a first attempt cascaded into an UNRELATED `LieutenantModule` NestJS boot
 *  failure via this module's own pre-existing `→ LieutenantModule → Loop10Module → SessionModule` chain
 *  once `SessionModule` gained ANY new edge reaching back into it) — instead, `SessionModule` re-provides
 *  `ExceptionsRepository`/`ExceptionsProjectionService` as its OWN additional providers (zero `imports`
 *  array change anywhere in `src/exceptions/`). */
@Module({
  imports: [
    DbModule,
    AuthModule,
    SchedulerModule,
    LieutenantModule,
    EnforcementModule,
    ProgressionModule,
    SessionModule,
    // P3-F C2 (additive) — the R6 resolve-hook sibling seam: `ExceptionsService` injects
    // `MasteryAccumulatorService` (mirrors the SessionModule/ProgressionModule import shape above).
    DelegationRatchetModule,
    // P3-G C7 (additive) — the R8 resolve-hook sibling seam: `ExceptionsService` injects
    // `IsostaticDebtService` (SAME shape as `DelegationRatchetModule` above — `BudgetsHorizonModule`
    // never imports `ExceptionsModule` back, zero cycle, DD-G1's own one-way-import discipline).
    BudgetsHorizonModule,
  ],
  controllers: [ExceptionsController],
  providers: [
    ExceptionsRepository,
    // W1.1-a C6 (design D3/IM-2) — the funnel-state resolve-hook sibling seam: `ExceptionsService`
    // injects `OnboardingFunnelRepository` DIRECTLY (re-provided here, mirrors the `ExceptionsRepository`
    // re-provide `SessionModule` already does the OTHER way — `OnboardingFunnelRepository` is
    // `@Inject(DB)`-only, trivially cycle-safe, no dedicated module, see that file's own header).
    OnboardingFunnelRepository,
    RaidExceptionRepository,
    // 04f-A C5 — the equipment-failure card producer + its stateless card-service + its self-contained
    // repository (ADDITIVE — the Phase-16 raid pattern verbatim). EquipmentFailureCardService is ALSO
    // duplicate-registered in MaintenanceModule (D4 periodic re-emission call site) — see that module's own
    // comment for why (a circular-dependency avoidance, the ExceptionsRepository/TD-031 precedent).
    EquipmentFailureExceptionRepository,
    EquipmentFailureCardService,
    EquipmentFailureExceptionProducerService,
    ExceptionsProjectionService,
    ExceptionProducerService,
    RaidExceptionProducerService,
    HeatPressureExceptionProducerService,
    ExceptionsService,
    ExceptionQueueTickService,
    OneTimeHandler,
    EscalateHandler,
    AddRuleHandler,
    RepairHandler,
    BribeHandler,
    LayLowHandler,
    RepairImmediateHandler,
    RepairSlowHandler,
    DeferRepairHandler,
    DemolishReplaceHandler,
    {
      provide: ExceptionEffectRegistry,
      useFactory: (
        one: OneTimeHandler,
        esc: EscalateHandler,
        add: AddRuleHandler,
        rep: RepairHandler,
        bri: BribeHandler,
        lay: LayLowHandler,
        repImm: RepairImmediateHandler,
        repSlow: RepairSlowHandler,
        defer: DeferRepairHandler,
        demolish: DemolishReplaceHandler,
      ) =>
        new ExceptionEffectRegistry([one, esc, add, rep, bri, lay, repImm, repSlow, defer, demolish]),
      inject: [
        OneTimeHandler,
        EscalateHandler,
        AddRuleHandler,
        RepairHandler,
        BribeHandler,
        LayLowHandler,
        RepairImmediateHandler,
        RepairSlowHandler,
        DeferRepairHandler,
        DemolishReplaceHandler,
      ],
    },
  ],
  // P3-E C7 (additive) — `ExceptionsService` EXPORTED so `CompressionModule`'s board-decide verb dispatch
  // ("resolve spine card"/"ack cascade", design §10.2/D12) can call the REAL `resolve()` verb (the SAME
  // ownership/pending guards + registry dispatch + progression/session hooks every OTHER caller gets) —
  // zero reimplementation of that logic. Widening this array only; no other change to this module.
  exports: [ExceptionsRepository, ExceptionsProjectionService, EquipmentFailureCardService, ExceptionQueueTickService, ExceptionsService],
})
export class ExceptionsModule {}

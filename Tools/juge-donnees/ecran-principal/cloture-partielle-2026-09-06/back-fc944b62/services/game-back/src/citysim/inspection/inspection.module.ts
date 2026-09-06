// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md §NestJS — backend jeu
//             (InspectionQueueService in-process in game-back, "Pas de service séparé … in-process dans
//              game-back, sans frontière réseau. Pattern identique à CohesionPermafrostService / FlowCellsService")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             TD-012 (lot-5 L5-T6l): FalseReportLedgerRepository + FalseReportLedgerService added to providers.
//             -- session:2026-06-03 (Phase 1 Task 7); updated 2026-06-14 (TD-012 lot-5) --
//
// `InspectionQueueModule` — wires System 6 (Inspection Cascade Queue / MIS) into the game-back modular monolith.
// Copies the CohesionPermafrost persisted-system module template:
//   - the SYSTEM service (InspectionQueueService) registers into the scheduler at slot {TWELVE_H/2 inspection
//     queue} at boot; SUBSCRIBES to CohesionStateChangedEvent (System 5 → System 6 cascade amplification, Inv 5);
//     EMITS BuildingEvidenceFoundEvent (System 6 → System 3 BPD referral, Inv 6) + InspectionCascadeTriggered;
//   - the REPOSITORY (InspectionQueueRepository) owns the raw Drizzle reads/writes against inspection_queues
//     (FIFO entries array + length, batched writes + race-safe seed of 18 rows);
//   - the PROJECTION service (InspectionQueueProjectionService) maps the raw queue → the qualitative queue-load
//     bucket + type/severity distribution (Inv 4 — the informant-fee read surface; no positions/buildings/counts);
//   - FalseReportLedgerRepository + FalseReportLedgerService: the FILE false-report action + flood backlash
//     (TD-012 — law_mis §Data model §Entité FalseReportLedger + §NestJS §173 flood detection).
//   - the player-facing CONTROLLER (InspectionQueueController) exposes the projection + report FILE under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus
// is exported by SchedulerModule (System 6 subscribes CohesionStateChangedEvent + emits BuildingEvidenceFound /
// InspectionCascadeTriggered on that singleton bus — NO sibling-system module import: the cascade input (System
// 5) + the BPD-referral output (System 3) flow via the bus, not a direct module import). System 3 (Police
// Memory) wires its OWN subscription to BuildingEvidenceFoundEvent inside PoliceMemoryModule's service.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { InspectionQueueService } from './inspection.service';
import { InspectionQueueRepository } from './inspection.repository';
import { InspectionQueueProjectionService } from './inspection.projection.service';
import { InspectionQueueController } from './inspection.controller';
// W6a C1.0 — the mis-inject-counter probe, MOVED here from InspectionQueueController (see that
// controller's own header + inspection-test.controller.ts's header for why) and gated the same way
// every other `*-test.controller.ts` in this codebase is.
import { InspectionQueueTestController } from './inspection-test.controller';
import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { FalseReportLedgerRepository } from './false-report-ledger.repository';
import { FalseReportWindowDecayService } from './false-report-window-decay.service';
import { FalseReportLedgerService } from './false-report-ledger.service';
// W1.2-a C4 — CheatFlagService (the ONE `cheat_flag` writer this lot adds, on the C1 decoy-spam
// signal). FalseReportLedgerService#fileReport is the appelant de production (best-effort — see that
// file's own edit for this chunk).
import { AntiCheatModule } from '../../anti_cheat/anti-cheat.module';

@Module({
  imports: [SchedulerModule, AuthModule, AntiCheatModule],
  controllers: [
    InspectionQueueController,
    // W6a C1.0 — TEST-ONLY mis-inject-counter probe: NOT registered in production.
    ...(testControllersEnabled() ? [InspectionQueueTestController] : []),
  ],
  providers: [
    InspectionQueueService,
    InspectionQueueRepository,
    InspectionQueueProjectionService,
    // TD-012: FalseReportLedger + FILE action + flood backlash (migration 0036).
    FalseReportLedgerRepository,
    FalseReportLedgerService,
    // TD-517 — le décai de la fenêtre (NIGHTLY/34). Enregistré à l'amorçage, comme les autres ticks
    // du module : sans provider, le `registerSystem` n'a jamais lieu et le tick n'existe pas.
    FalseReportWindowDecayService,
  ],
  // Export the system + projection so later consumer modules can inject them (e.g. BO MIS-queue inspect surface).
  // InspectionQueueRepository is exported for C15 forensic effluent → queue emission (DIV-2 REUSE applyQueues).
  exports: [InspectionQueueService, InspectionQueueProjectionService, InspectionQueueRepository],
})
export class InspectionQueueModule {}

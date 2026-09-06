// IMPLEMENTS: docs/tech/04_city_simulation/system_7_unconformity_ledgers.md §NestJS — backend jeu
//             (UnconformityLedgerService in-process in game-back, "Pas de service séparé … in-process dans
//              game-back, sans frontière réseau. Pattern identique aux autres services city-sim")
//             + composition_overview.md §Cross-cutting (CityEventBus in-process)
//             -- session:2026-06-03 (Phase 1 Task 8) --
//
// `UnconformityLedgerModule` — wires System 7 (Unconformity Ledgers) into the game-back modular monolith. Copies
// the CohesionPermafrost/Inspection persisted-system module template:
//   - the SYSTEM service (UnconformityLedgerService) registers into the scheduler at slot {NIGHTLY/2 unconformity
//     ledgers} at boot (runs after System 5 cohesion at NIGHTLY/1); maintains the two-tier in-memory model
//     (block-aggregate + promoted ledgers); writes buildings.audit_pin_expires_at; EMITS UnconformityAuditPin +
//     AuditPinObservationHint on the CityEventBus (emit-only day-1 — System 6/4 consumers wire later);
//   - the REPOSITORY (UnconformityLedgerRepository) owns the raw Drizzle reads/writes against `buildings`
//     (reads promoted buildings via the blocks JOIN; batched UPDATE of audit_pin_expires_at);
//   - the PROJECTION service (UnconformityLedgerProjectionService) maps the raw promoted state → the per-district
//     audit-pin presence band + per-building AUDIT_PIN_ACTIVE + deviation bucket (Inv 1 / R2.2 — no raw sigma);
//   - the player-facing CONTROLLER (UnconformityLedgerController) exposes the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus) + AuthModule (EXPORTS JwtAuthGuard).
// Depends on the @Global() DbModule (the repository/controller/service inject the DB provider). The CityEventBus
// is exported by SchedulerModule (System 7 emits UnconformityAuditPin + AuditPinObservationHint on that singleton
// bus — no sibling-system module import for events). NO PatrolDoctrine/Inspection module import: System 7 reads
// nothing from a sibling system day-1 (the G31 declaration-ledger amplification, the only System 3 → System 7
// read, is DEFERRED — System 3's declaration_ledger has no Phase-1 producer; see the service header). The
// mismatch_score read accessor (Inv 6 — System 6 consumer) is EXPORTED for when System 6 wires to it (P2).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
// 04f-A C6 (D6) — MaintenanceModule EXPORTS MaintenancePhaseService (pure, no DB access of its own — the
// SAME cross-module export ProductionModule/GrowModule/RealEstateModule already consume for their own D1/D5/
// D10 fold sites). One-directional: MaintenanceModule only imports SchedulerModule (+ HeatContribModule as of
// C6) — no cycle back to UnconformityLedgerModule.
import { MaintenanceModule } from '../../operational/maintenance/maintenance.module';
import { UnconformityLedgerService } from './unconformity.service';
import { UnconformityLedgerRepository } from './unconformity.repository';
import { UnconformityLedgerProjectionService } from './unconformity.projection.service';
import { UnconformityLedgerController } from './unconformity.controller';

@Module({
  imports: [SchedulerModule, AuthModule, MaintenanceModule],
  controllers: [UnconformityLedgerController],
  providers: [
    UnconformityLedgerService,
    UnconformityLedgerRepository,
    UnconformityLedgerProjectionService,
  ],
  // Export the system + projection so later consumer modules can inject them (e.g. System 6 reading
  // getMismatchScore for cascade targeting when P2 populates buildings; BO unconformity-inspect surface).
  exports: [UnconformityLedgerService, UnconformityLedgerProjectionService],
})
export class UnconformityLedgerModule {}

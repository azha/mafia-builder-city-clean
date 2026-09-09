// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §NestJS surfaces (LaunderingService in-process
//             in game-back — the inject action + the clean-output advance) + §Stage 1 / §Stage 2 / §Stage 4 +
//             composition_overview.md §Cross-cutting (the city-sim scheduler is the shared tick engine the
//             operational laundering advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingModule` — wires the Phase-2 M1 Stage-1 laundering slice (inject → front-shop Stage-1 node → System-8
// cleaning over dwell → clean cash → wallet) into the game-back modular monolith. Copies the persisted-system module
// template (SellingModule):
//   - the player ACTION: LaunderingService.inject (Step 1 — drain a safehouse into a front-shop's Stage-1 node
//     buffer, guarded/atomic; feed the deviation input to System 7 if over the legitimate baseline).
//   - the LAUNDER-OUTPUT TICK-HOOK: LaunderingOutputService registers into the CitySimScheduler at the slot
//     {MINUTE/11 LAUNDER_OUTPUT} at boot (after DEALER_SELL/10), REPLACING the no-op placeholder there — each in-game
//     minute it releases the laundered cash of every Stage-1 node whose cleanliness reached the clean band (the
//     System-8 float — CONSUMED) into economy_states.cash_cents (minus the modest dwell-tax cut) and zeroes
//     `tail_risk_estimates.current_occupancy` (buffer_load re-syncs to 0 on System 10's next tick), in batched
//     set-based SQL. This is the operational tick-hook PATTERN T1–T5 share.
//   - the REPOSITORY (LaunderingRepository) owns the raw Drizzle reads/writes against laundering_nodes (Phase-1,
//     System 8 — the Stage-1 node buffer) + safehouses (Phase-1, System 9 — the drained slot model) + economy_states
//     (Phase-1 — the wallet credit) + buildings (Phase-1 — ownership / the transaction_profile System 7 scores /
//     the audit pin it sets) + building_operational_state (T0 — the operational gate) (R9.3 — it READS the schema,
//     never redefines it).
//   - the PROJECTION (LaunderingProjectionService) maps the raw node state → a qualitative cleanliness band (REUSE
//     System 8's CleanlinessBucket) + a deviation flag (System 7's AUDIT_PIN_ACTIVE) (R2.2, no raw floats/cents/sigma).
//   - the player-facing CONTROLLER (LaunderingController) exposes the inject action + the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the output tick-hook calls registerSystem on it) +
// AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution) + DwellTimeModule (EXPORTS DwellTimeService —
// the read-only coupling the projection uses for the CleanlinessBucket mapping; System 8 is CONSUMED, never
// reimplemented — the patrol→police_memory read-only coupling precedent). System 7 (Unconformity) is CONSUMED by
// WRITING the front-shop transaction_profile in the repository (the input System 7's nightly tick already reads) +
// READING its persisted audit pin — a persisted-row coupling, NOT a service call, so no UnconformityLedgerModule
// import is needed. System 9 (Erlang Stash) is CONSUMED by filling/draining the persisted safehouse slot model
// directly (the raw row the schema owns — like T5), so no ErlangStashModule import is needed (the drain is the row
// bookkeeping, not an Erlang-B recompute). Depends on the @Global() DbModule (the repository/controller inject the DB
// provider). EXPORTS the service + projection for any later operational module that consumes the laundered output.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { DwellTimeModule } from '../../citysim/dwell_time/dwell-time.module';
import { ForensicSignalingModule } from '../forensic/forensic.module';
import { DemolitionModule } from '../../core_loops/demolition/demolition.module';
import { LaunderingRepository } from './laundering.repository';
import { LaunderingService } from './laundering.service';
import { LaunderingOutputService } from './laundering-output.service';
import { LaunderingProjectionService } from './laundering.projection.service';
import { LaunderingController } from './laundering.controller';

@Module({
  // ForensicSignalingModule: EXPORTS LeadingDigitAuditService (C6 — recordReceipt ADDITIVE
  //   on front/laundering revenue). LaunderingModule imports it so LaunderingService can
  //   inject LeadingDigitAuditService. ONE-DIRECTIONAL: LaunderingModule → ForensicSignalingModule,
  //   NOT the reverse — no circular dependency, no forwardRef needed.
  // DemolitionModule (P3-E C3, ★#2): EXPORTS FrictionBudgetRepository — LaunderingOutputService injects it to
  //   read the player-keyed `efficiency_penalty_active` flag and fold `demolitionEfficiencyPenaltyMultiplierBaseline`
  //   into the terminal release credit (Site 2 of the 2 R13-frozen output sites). ONE-WAY: DemolitionModule imports
  //   only DbModule/SchedulerModule — no cycle.
  imports: [SchedulerModule, AuthModule, DwellTimeModule, ForensicSignalingModule, DemolitionModule],
  controllers: [LaunderingController],
  providers: [LaunderingRepository, LaunderingService, LaunderingOutputService, LaunderingProjectionService],
  exports: [LaunderingService, LaunderingProjectionService],
})
export class LaunderingModule {}

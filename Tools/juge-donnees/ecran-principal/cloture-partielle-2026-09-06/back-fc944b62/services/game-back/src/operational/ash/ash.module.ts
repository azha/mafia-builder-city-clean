// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Ash — luxury-channel (the deterministic
//             purity derivation the cook-advance stamps at completion) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T6/§6 (purity = a PURE derivation
//             service, no persistence — mirrors ColdChainModule/HushModule) +
//             composition_overview.md §Cross-cutting (the operational modular monolith wiring)
//             -- session:2026-06-06 (Phase 2c vector #2c — substances/Ash — Task 6) --
//
// `AshModule` — wires the Phase-2c vector #2c ASH luxury-channel slice into the game-back modular monolith.
//   - T6 ships the PURE purity-derivation service (AshPurityService) — the analog of ColdChainModule's ColdChainService /
//     HushModule's HushAddictionService, but PURE: NO repository/tick/scheduler dependency (purity is a pure read-time
//     derivation, computed once at cook completion by the existing substance-generic cook-advance tick). It exposes
//     purityScore (the 3-lever deterministic derivation) → purityBand (the R2.2 CUT/STANDARD/PURE/CRYSTALLINE band) →
//     payoutMultiplier (the honor-sale margin, consumed LATER by T8). EXPORTED so the cook-advance tick (ProductionModule)
//     injects it to stamp the score at an Ash cook completion (and the batch projection T9 / honor T8 later).
//   - T7 ADDS the APPOINTMENT slice (the luxury channel's booking + expiry lifecycle):
//       · AshAppointmentService — the player BOOK action (validate the player-owned Glass-district venue → 404 not-owned
//         / 422 not-a-glass-venue → insert a SCHEDULED ash_appointment, booked_at_tick=currentTick, expires_at_tick=
//         currentTick + ash.appointment_window_ticks) + the minimal status projection (the formal payout_band is T9).
//       · AshAppointmentRepository — the raw Drizzle reads/writes against ash_appointment (T0) + the Glass-venue join
//         (buildings → blocks → districts.profile='glass') + city_sim_clock (the currentTick read) (R9.3 — READS the
//         schema, NO schema change: T0 landed the table/index/grant).
//       · AshAppointmentAdvanceService — the APPOINTMENT_EXPIRE expiry TICK-HOOK registers into the CitySimScheduler at
//         {MINUTE/17 APPOINTMENT_EXPIRE} at boot (after HUSH_ADDICTION/16), REPLACING the no-op placeholder there — each
//         in-game minute it flips every SCHEDULED appointment past its window to EXPIRED, ONE set-based UPDATE. This is
//         the operational tick-hook PATTERN the cold-chain/hush/precursor-arrival hooks share (same registerSystem path).
//       · AshAppointmentController — POST /v1/operational/appointment (book) + GET /v1/operational/appointment/:id (the
//         status projection) under /v1. honor (T8) + the formal payout_band projection (T9) are added later.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the expiry tick-hook calls registerSystem on it) + AuthModule
// (EXPORTS JwtAuthGuard — the controller's player resolution). Depends on the @Global() DbModule (the repository/controller
// inject the DB provider). EXPORTS AshPurityService (the cook-advance stamp) + AshAppointmentService (later T8 honor).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { HeatContribModule } from '../heat_contrib/heat-contrib.module';
import { AshPurityService } from './ash-purity.service';
import { AshAppointmentRepository } from './ash-appointment.repository';
import { AshAppointmentService } from './ash-appointment.service';
import { AshAppointmentAdvanceService } from './ash-appointment-advance.service';
import { AshAppointmentController } from './ash-appointment.controller';

@Module({
  // lot-4 TD-027: AshModule now imports HeatContribModule so that AshAppointmentService can inject
  // HeatContribService and emit the per-deal Glass-precinct heat injection on honor (production_secondaries.md:99).
  imports: [SchedulerModule, AuthModule, HeatContribModule],
  controllers: [AshAppointmentController],
  providers: [
    AshPurityService,
    AshAppointmentRepository,
    AshAppointmentService,
    AshAppointmentAdvanceService,
  ],
  exports: [AshPurityService, AshAppointmentService],
})
export class AshModule {}

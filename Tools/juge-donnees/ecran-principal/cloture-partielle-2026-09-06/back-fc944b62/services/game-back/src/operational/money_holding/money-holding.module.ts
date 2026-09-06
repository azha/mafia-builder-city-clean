// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T2/§6 (the money_holding clean-cash
//             holding slice — a sibling of the real_estate / distribution operational modules) +
//             composition_overview.md §Cross-cutting (the operational modular monolith wiring)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Task 2) --
//
// `MoneyHoldingModule` — wires the Phase-5 vector #5a money_holding clean-cash holding slice into the game-back modular
// monolith.
//   - T2 ships the TIER-UPGRADE action (MoneyHoldingController + MoneyHoldingService + MoneyHoldingRepository): POST
//     /v1/operational/building/:id/upgrade-money-holding-tier — validate the player-owned money_holding + < max_tier →
//     atomic guarded cash debit → money_holding_tier++ in one tx. The BYTE-MIRROR of the distribution_hub upgrade-hub-tier
//     slice (HubService/HubRepository on RealEstateModule), here in its OWN module for cohesion (T3+ extend it) and to
//     avoid cross-module injection.
//   - T4 (lazy-accrual yield) extended the service + repository (the settle-on-mutation step).
//   - T5b (audit-forfeiture) adds the MONEY_HOLDING_AUDIT tick-hook (MoneyHoldingAuditService) — the vector's ONE new
//     tick, registered into the CitySimScheduler at {TWELVE_H/5} at boot (after the 12-h precinct-review band), REPLACING
//     the no-op placeholder there. It runs on the SLOW 12-h band (a slow, telegraphed legal process — minute/30-min
//     granularity is unnecessary, and keeping a per-player scan off the tick-heavy minute band is the perf discipline: the
//     per-minute version timed out the tick-heavy citysim E2E, and even 30-min was insufficient). It is the value-driven,
//     telegraphed forfeiture (DISTINCT from the heat-driven street raid T5a).
//   - T6 (the band projections) adds MoneyHoldingProjectionService — the building-card money_holding bands (R2.2 — the
//     money_holding_tier / held / capacity / yield / forfeiture bands). The DIRECT sibling of
//     DistributionProjectionService.hubDispatchBands: it is EXPORTED so RealEstateModule (which imports THIS module,
//     one-way — money_holding imports Auth/Db/Scheduler, NOT real_estate → no cycle) can call moneyHoldingBands from the
//     building-card projection assembly for a money_holding card.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the audit tick-hook calls registerSystem on it at boot; the
// SAME import the laundering / distribution / grow modules use for their tick-hooks) + AuthModule (EXPORTS JwtAuthGuard —
// the controller's player resolution; the SAME import the grow/distribution controllers use). Depends on the @Global()
// DbModule (the repository/controller inject the DB provider). Idempotency is handled by the global IdempotencyInterceptor
// (REUSE — registered in AppModule). R9.3: 09 = source of truth (no schema change — T0 landed the money_holding table +
// the forfeiture_scheduled_at_tick column, migration 0025).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { MoneyHoldingController } from './money-holding.controller';
import { MoneyHoldingService } from './money-holding.service';
import { MoneyHoldingRepository } from './money-holding.repository';
import { MoneyHoldingAuditService } from './money-holding-audit.service';
import { MoneyHoldingProjectionService } from './money-holding.projection.service';

@Module({
  imports: [SchedulerModule, AuthModule],
  controllers: [MoneyHoldingController],
  providers: [MoneyHoldingService, MoneyHoldingRepository, MoneyHoldingAuditService, MoneyHoldingProjectionService],
  // EXPORTS MoneyHoldingProjectionService (Phase-5 vector #5a T6) so RealEstateModule's building-card projection can
  // call moneyHoldingBands(playerId, buildingId) for a money_holding card (R2.2 — qualitative bands only). The SAME
  // one-way import shape RealEstate→Distribution uses for the hub bands (no cycle — money_holding does not import
  // real_estate). MoneyHoldingService stays exported for the existing consumers.
  exports: [MoneyHoldingService, MoneyHoldingProjectionService],
})
export class MoneyHoldingModule {}

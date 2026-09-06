// IMPLEMENTS: docs/tech/04a_operational_systems/real_estate.md §NestJS — backend jeu (RealEstateModule in-process in
//             game-back) + conversion_setup.md §Workflow + composition_overview.md §Cross-cutting (the city-sim
//             scheduler is the shared tick engine the operational setup-advancer plugs into)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// `RealEstateModule` — wires the Phase-2 M1 real-estate slice (acquire → convert → setup) into the game-back modular
// monolith. Copies the persisted-system module template (HeatModule):
//   - the player ACTIONS: RealEstateService.purchase (Step 1 — legitimate purchase, debits the grounded acquisition
//     price = acquisition_cost_ratio × reference conversion cost at STANDARD cover; the canonical district-based
//     nominal pricing model is DEFERRED — see RealEstateService) + ConversionService.convert (Step 2 — debit the
//     grounded conversion cost + create building_operational_state, conversion_stage='gutting').
//   - the SETUP TICK-HOOK: ConversionSetupService registers into the CitySimScheduler at the slot {MINUTE/6
//     OPERATIONAL_SETUP} at boot (LAST in the minute band, after POLICE_MEMORY/5), REPLACING the no-op placeholder
//     there — it drains setup_remaining_ticks each in-game minute and flips conversion_stage → 'operational' at 0.
//     This is the operational tick-hook PATTERN T2–T6 inherit (same registerSystem path Heat uses at MINUTE/4).
//   - the REPOSITORY (RealEstateRepository) owns the raw Drizzle reads/writes against buildings (Phase-1) +
//     building_operational_state (T0) + economy_states (Phase-1) + the world geography free-block check (R9.3 — it
//     READS the schema, never redefines it).
//   - the PROJECTION (RealEstateProjectionService) maps the raw operational fields → qualitative bands (setup state /
//     cover band / operational flag — R2.2, no raw timer/tier/price).
//   - the player-facing CONTROLLER (RealEstateController) exposes purchase / convert / the projection under /v1.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the setup tick-hook calls registerSystem on it) +
// AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution). Depends on the @Global() DbModule (the
// repository/controller inject the DB provider). EXPORTS the services + projection so later operational modules
// (T2–T6) can inject the read-only building accessors if needed.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AuthModule } from '../../auth/auth.module';
import { EnforcementModule } from '../enforcement/enforcement.module';
import { DistributionModule } from '../distribution/distribution.module';
import { MoneyHoldingModule } from '../money_holding/money-holding.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { Loop10Module } from '../../progression/loop10/loop10.module';
import { RealEstateRepository } from './real-estate.repository';
import { ConversionService, RealEstateService } from './real-estate.service';
import { ConversionSetupService } from './conversion-setup.service';
import { RealEstateProjectionService } from './real-estate.projection.service';
import { SpecializedLabRepository } from './specialized-lab.repository';
import { SpecializedLabService } from './specialized-lab.service';
import { HubRepository } from './hub.repository';
import { HubService } from './hub.service';
import { EquipmentTierRepository } from './equipment-tier.repository';
import { EquipmentTierService } from './equipment-tier.service';
import { EquipmentTierUpgradeService } from './equipment-tier-upgrade.service';
import { RealEstateController } from './real-estate.controller';

@Module({
  // EnforcementModule EXPORTS RaidRepository — the building-card projection (Phase-2b) reads the latest building_raid
  // row for the recent-raid flag + the seized-amount band (R2.2). The raid CONSUMER lives in EnforcementModule; this
  // module only READS the raid ledger for the projection (no cycle — EnforcementModule does not import this module).
  //
  // DistributionModule (Phase-4 vector #4 — T6) EXPORTS DistributionProjectionService — the building-card projection
  // calls hubDispatchBands(playerId) for a distribution_hub card's roster_band + available_vehicles (R2.2 — qualitative
  // bands only). A clean ONE-WAY dependency: DistributionModule (and ColdChainModule) do NOT import RealEstateModule, so
  // RealEstateModule → DistributionModule introduces no cycle.
  //
  // MoneyHoldingModule (Phase-5 vector #5a — T6) EXPORTS MoneyHoldingProjectionService — the building-card projection
  // calls moneyHoldingBands(playerId, buildingId) for a money_holding card's tier/held/capacity/yield/forfeiture bands
  // (R2.2 — qualitative bands only). The SAME clean ONE-WAY shape: MoneyHoldingModule imports Auth/Db/Scheduler, NOT
  // RealEstateModule, so RealEstateModule → MoneyHoldingModule introduces no cycle.
  //
  // MaintenanceModule (04f-A C2) EXPORTS MaintenancePhaseService — the building-card projection calls it for the
  // R2.2 LapsePhaseBucket + days_until_maintenance_due fields. The SAME clean ONE-WAY shape: MaintenanceModule
  // imports only SchedulerModule, NOT RealEstateModule — no cycle.
  //
  // P3-A C5 (D7/D8) — Loop10Module EXPORTS StructuralDecisionGovernorService: purchase/convert are 2 of
  // the 6 LIVE structural sites (RealEstateController wraps them via governor.commit). ONE-WAY:
  // Loop10Module imports SessionModule/ProgressionModule only — no cycle back to RealEstateModule.
  imports: [
    SchedulerModule,
    AuthModule,
    EnforcementModule,
    DistributionModule,
    MoneyHoldingModule,
    MaintenanceModule,
    Loop10Module,
  ],
  controllers: [RealEstateController],
  providers: [
    RealEstateRepository,
    RealEstateService,
    ConversionService,
    ConversionSetupService,
    RealEstateProjectionService,
    // Phase-2c vector #2c (Ash — T5) — the specialized_lab lab-tier UPGRADE slice (the lab-tier lever of the Ash purity
    // chain): SpecializedLabService owns the validate-owned + specialized_lab + < max_tier → atomic guarded debit →
    // lab_tier++ action; SpecializedLabRepository owns the raw Drizzle reads/writes (the guarded economy_states debit —
    // REUSE the real-estate/repair atomic-guarded pattern — + the lab_tier increment). Idempotency is handled by the
    // global IdempotencyInterceptor (REUSE). R9.3: 09 = source of truth (no schema change — T0 landed lab_tier).
    SpecializedLabRepository,
    SpecializedLabService,
    // Phase-4 vector #4 (distribution_hub — T2) — the distribution_hub hub-tier UPGRADE slice (the hub-tier lever that
    // scales the courier roster cap, T3): HubService owns the validate-owned + distribution_hub + < max_tier → atomic
    // guarded debit → hub_tier++ action; HubRepository owns the raw Drizzle reads/writes (the guarded economy_states
    // debit — REUSE the real-estate/repair/specialized-lab atomic-guarded pattern — + the hub_tier increment). The
    // BYTE-MIRROR of SpecializedLab*. Idempotency is handled by the global IdempotencyInterceptor (REUSE). R9.3: 09 =
    // source of truth (no schema change — T0 landed hub_tier, migration 0024).
    HubRepository,
    HubService,
    // D1 C6 — equipment_tier upgrade (generic lab/refinery/press_house tier lever). Windowed upgrade:
    // EquipmentTierService validates + debits + arms the window + aborts cook; EquipmentTierUpgradeService
    // drains the window each MINUTE/20 tick and flips equipment_tier++ at 0. Mirrors SpecializedLab*/Hub*.
    EquipmentTierRepository,
    EquipmentTierService,
    EquipmentTierUpgradeService,
  ],
  exports: [RealEstateService, ConversionService, RealEstateProjectionService],
})
export class RealEstateModule {}

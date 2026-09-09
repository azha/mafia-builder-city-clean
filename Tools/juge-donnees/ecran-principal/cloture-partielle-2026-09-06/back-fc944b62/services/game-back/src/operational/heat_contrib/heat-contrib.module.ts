// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the operational
//             → System-Heat coupling — an operational producer emits HeatInjectionEvents on the CityEventBus seam) +
//             docs/tech/04a_operational_systems/production_brindle.md §Heat shadow + product_storage.md §Storage heat +
//             selling_dealers_leks.md §How a deal works + composition_overview.md §Cross-cutting (the city-sim
//             scheduler is the shared tick engine the operational heat-contrib advancer plugs into)
//             -- session:2026-06-04 (Phase 2 Task 7) --
//
// `HeatContribModule` — wires the Phase-2 M1 operational-heat coupling (cook / storage / deal → System Heat) into the
// game-back modular monolith. It is the ONE producer that turns operational activity into HeatInjectionEvents on the
// canonical CityEventBus seam; the Phase-1 HeatPropagationService (MINUTE/4) consumes them and OWNS the buildings.heat
// write (R9.3 — consume the Heat engine, never reimplement it). Copies the persisted-system module template:
//   - the COUPLING SERVICE (HeatContribService): registers the MINUTE/12 OPERATIONAL_HEAT_CONTRIB tick (per-tick
//     storage-heat emission) AND exposes emitCookHeat / emitDealHeat (point-emissions the cook + deal tick hooks call).
//   - the REPOSITORY (HeatContribRepository): the READ-ONLY building→district resolution + the per-tick storage read
//     (R9.3 — it READS buildings / blocks / product_storage, never redefines them; it WRITES nothing).
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the storage tick-hook calls registerSystem on it; AND
// CityEventBus — the seam the contributions emit on). Depends on the @Global() DbModule (the repository injects the DB
// provider). EXPORTS HeatContribService so ProductionModule (cook completion) + SellingModule (per-deal) can inject it
// to make their point-emissions. NO controller / projection — heat is surfaced ONLY via the existing Phase-1 Heat
// projection (GET /v1/city/district/:id/heat); this module adds NO new scalar + NO new endpoint (R2.2).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { HeatContribRepository } from './heat-contrib.repository';
import { HeatContribService } from './heat-contrib.service';

@Module({
  imports: [SchedulerModule],
  providers: [HeatContribRepository, HeatContribService],
  exports: [HeatContribService],
})
export class HeatContribModule {}

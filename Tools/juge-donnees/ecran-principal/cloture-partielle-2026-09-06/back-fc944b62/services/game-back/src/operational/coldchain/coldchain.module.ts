// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Crick — cold-chain stimulant (the cold
//             chain for the first SECONDARY substance — temperature_status derivation + the degrade tick) +
//             composition_overview.md §Cross-cutting (the city-sim scheduler is the shared tick engine the operational
//             cold-chain degrade advancer plugs into)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 5) --
//
// `ColdChainModule` — wires the Phase-2b vector #2 COLD-CHAIN slice (temperature_status derivation + the per-tick
// degrade of warm Crick) into the game-back modular monolith. Copies the persisted-system / operational tick-hook
// module template (EnforcementModule / DistributionModule):
//   - the DERIVATION service (ColdChainService) — the PURE read-time temperature_status band derivation (Step 1): a
//     Crick holding in a cold building → OPTIMAL_COLD, else MODERATE; a Crick cargo on a refrigerated_van → OPTIMAL_
//     COLD, else HOT; a non-cold-chain substance (Brindle) → null (no band). EXPORTED so the projections (production
//     storage / distribution transit) inject it to surface the temperature_status + degrading flag (Step 3, R2.2).
//   - the DEGRADE TICK-HOOK (ColdChainDegradeService) registers into the CitySimScheduler at the slot {MINUTE/15
//     COLD_CHAIN_DEGRADE} at boot (after OPERATIONAL_REPAIR/14), REPLACING the no-op placeholder there — each in-game
//     minute it degrades the player's warm cold-chain product set-based (warm stored holdings at the MODERATE rate;
//     warm in-transit cargo at the HOT rate), GUARDED ≥ 0, Brindle never touched. This is the operational tick-hook
//     PATTERN T1–T4 + the enforcement repair tick share (same registerSystem path).
//   - the REPOSITORY (ColdChainRepository) owns the raw Drizzle reads/writes against product_storage + courier_shift
//     (the set-based degrade UPDATEs) + building_operational_state + courier (the cold-status reads) (R9.3 — it READS/
//     mutates the schema per the 0017/0019/0020 grants; NO schema change — T0/T4 landed every column it touches).
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the degrade tick-hook calls registerSystem on it).
// Depends on the @Global() DbModule (the repository injects the DB provider). EXPORTS ColdChainService + ColdChain
// Repository so the production-storage + distribution-transit projections inject them to surface the temperature_status
// band + degrading flag (Step 3). No controller of its own — the cold-chain surface rides on the existing storage /
// courier projections (the player reads temperature_status on the building-storage / courier card, not a new endpoint).

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { ColdChainService } from './cold-chain.service';
import { ColdChainRepository } from './cold-chain.repository';
import { ColdChainDegradeService } from './cold-chain-degrade.service';

@Module({
  imports: [SchedulerModule],
  providers: [ColdChainService, ColdChainRepository, ColdChainDegradeService],
  exports: [ColdChainService, ColdChainRepository],
})
export class ColdChainModule {}

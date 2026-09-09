// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Hush — addiction-loyalty (the per-spot
//             loyalty bucket + the DEPENDENT selling boost + the decay/withdrawal tick) +
//             composition_overview.md §Cross-cutting (the city-sim scheduler is the shared tick engine the operational
//             Hush addiction advancer plugs into)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 5) --
//
// `HushModule` — wires the Phase-2b vector #2b HUSH ADDICTION-LOYALTY slice (the per-spot loyalty bucket band
// derivation + the DEPENDENT selling-rate boost + the per-tick decay/withdrawal) into the game-back modular monolith.
// Copies the operational tick-hook module template (ColdChainModule):
//   - the DERIVATION service (HushAddictionService) — the PURE band + boost derivation (bandFor → NEW/ESTABLISHED/
//     DEPENDENT; loyaltyStatus → LOW/STABLE/HIGH for the projection, R2.2; boostMultiplier → the DEPENDENT selling
//     boost). EXPORTED so the selling sell-tick + the dealer projection inject it.
//   - the DECAY/WITHDRAWAL TICK-HOOK (HushAddictionAdvanceService) registers into the CitySimScheduler at the slot
//     {MINUTE/16 HUSH_ADDICTION} at boot (after COLD_CHAIN_DEGRADE/15), REPLACING the no-op placeholder there — each
//     in-game minute it decays the player's un-served sub-dependent Hush loyalty spots toward NEW + withdraws any
//     starved DEPENDENT spot (collapse to established−1 + withdrawn=true), set-based + disjoint. This is the operational
//     tick-hook PATTERN T1–T4 + the cold-chain degrade tick share (same registerSystem path).
//   - the REPOSITORY (HushAddictionRepository) owns the raw Drizzle reads/writes against hush_addiction (the lazy-upsert
//     accumulation on a deal + the set-based decay/withdrawal UPDATEs + the projection/boost reads) (R9.3 — it READS/
//     mutates the schema per the 0021 grant; NO schema change — T0 landed the table). EXPORTED so the selling sell-tick
//     accumulates on a Hush deal + reads the boost score, and the dealer projection reads the loyalty band + withdrawn.
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService — the decay/withdrawal tick-hook calls registerSystem on it).
// Depends on the @Global() DbModule (the repository injects the DB provider). EXPORTS HushAddictionService +
// HushAddictionRepository so SellingModule (the substance-aware sell-tick + the dealer projection) injects them. No
// controller of its own — the addiction surface (addiction_loyalty_status + withdrawn) rides on the EXISTING dealer
// projection (GET /v1/operational/dealer/:id), not a new endpoint.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { HushAddictionService } from './hush-addiction.service';
import { HushAddictionRepository } from './hush-addiction.repository';
import { HushAddictionAdvanceService } from './hush-addiction-advance.service';

@Module({
  imports: [SchedulerModule],
  providers: [HushAddictionService, HushAddictionRepository, HushAddictionAdvanceService],
  exports: [HushAddictionService, HushAddictionRepository],
})
export class HushModule {}

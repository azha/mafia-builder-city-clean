// IMPLEMENTS: docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (RaidExecutionService —
//             operational/enforcement sub-module; additive listener-isolated consumer of RaidPlannedEvent) +
//             docs/tech/04_city_simulation/composition_overview.md §Cross-cutting (the CityEventBus is the shared
//             loosely-coupled seam — a consumer reaches it via SchedulerModule, never imports a sibling system module)
//             -- session:2026-06-04 (Phase 2b Task 1) --
//
// `EnforcementModule` — wires the Phase-2b police-risk ENFORCEMENT slice (consequence vector #1: building raid) into
// the game-back modular monolith. Copies the persisted-system / operational tick-hook module template (HeatModule /
// RealEstateModule):
//   - the CONSUMER service (RaidExecutionService) SUBSCRIBES to RaidPlannedEvent on the CityEventBus (the additive,
//     listener-isolated consumer — System 4 Patrol Doctrine is the canonical owner; this never reimplements raid
//     decision logic) and registers into the CitySimScheduler at the slot {MINUTE/13 RAID_EXECUTION} at boot,
//     REPLACING the no-op placeholder there — it BUFFERS each raid synchronously (no per-event DB write) and FLUSHES
//     the set-based seizures (product_storage → DAMAGED → building_raid) on its MINUTE tick (the Heat buffer/flush
//     discipline).
//   - the REPOSITORY (RaidRepository) owns the raw Drizzle reads/writes against building_operational_state +
//     product_storage + building_raid (T0 / §7) + the buildings→blocks block-targeting JOIN (R9.3 — it READS/mutates
//     the schema per the 0017/0018 grants; no schema change).
//
// Imports SchedulerModule (EXPORTS CitySimSchedulerService + CityEventBus — the consumer registers the tick-hook on the
// scheduler AND subscribes to the bus, both from the ONE shared module it already imports — no sibling-system module
// import, no module cycle with System 4). Depends on the @Global() DbModule (the repository injects the DB provider).
// EXPORTS RaidRepository so the later projection (T4 raid-risk) / RepairService (T3) can inject the read accessors.

import { Module } from '@nestjs/common';

import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { RaidExecutionService } from './raid-execution.service';
import { RaidRepository } from './raid.repository';
import { RepairController } from './repair.controller';
import { RepairRepository } from './repair.repository';
import { RepairService } from './repair.service';
import { OperationalRepairService } from './operational-repair.service';

// Phase-2b Task 3 wiring — the REPAIR slice (the recovery half of the raid consequence loop):
//   - RepairController exposes POST /v1/operational/building/:id/repair (JWT-gated; the player is resolved from the JWT
//     sub, never the body) — the player-triggered guarded cash debit → structural_state='repairing'. Idempotency is
//     handled by the global IdempotencyInterceptor (REUSE — a retried repair does not double-debit).
//   - RepairService owns the action logic (validate owned + DAMAGED → cost = operational.repair.cost_ratio × the M1
//     conversion reference → atomic guarded debit + arm repair). RepairRepository owns the raw Drizzle reads/writes
//     (the guarded economy_states debit — REUSE the real-estate atomic-guarded pattern — + the building_operational_
//     state / building_raid transitions + the city_sim_clock current-tick read). R9.3: 09 = source of truth (no schema
//     change — T0 landed it; this READS/mutates per the 0017/0018 grants).
//   - OperationalRepairService registers the OPERATIONAL_REPAIR tick at the next FREE slot {MINUTE/14} (after
//     RAID_EXECUTION/13 — verified against the canonical SCHEDULE) — set-based flips due 'repairing' buildings back to
//     'operational' (NULLing the timer) + moves building_raid repairing → repaired. The cook/storage/deal ticks gate
//     on structural_state='operational' (T2), so a repaired building's ops resume next tick (design §2).

@Module({
  imports: [SchedulerModule],
  controllers: [RepairController],
  providers: [
    RaidExecutionService,
    RaidRepository,
    RepairService,
    RepairRepository,
    OperationalRepairService,
  ],
  // EXPORTS RaidRepository (the raid-risk projection / repair reads) + RepairService (Phase-7 T2 — the SECURITY lieutenant
  // binding reuses the SAME guarded repair action the player's POST /repair runs; the binding consumes the SERVICE
  // boundary, never re-implements the debit/transition). The SAME export-for-reuse shape the other operational modules use.
  exports: [RaidRepository, RepairService],
})
export class EnforcementModule {}

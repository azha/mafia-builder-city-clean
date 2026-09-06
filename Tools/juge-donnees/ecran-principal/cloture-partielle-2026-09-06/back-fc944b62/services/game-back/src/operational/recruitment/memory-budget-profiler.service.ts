// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C8 (the F4 profiler — TD-191
//             delivery)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §13 (F4 budget + the
//             inherited TD-191 profiler)
//             Tech doc: docs/tech/04f_maintenance_decay_recruitment/memory_budget_maintenance.md
//             (§Per-component memory budget — 04f; §Implications NestJS — backend jeu:
//             `MaintenanceRecruitmentLayerMemoryProfiler` + F4 budget alerts)
//             Pattern: services/game-back/src/operational/recruitment/recruitment.repository.ts
//             (`countLieutenants` — REUSED verbatim below, no re-implementation) + `listQuests`/
//             `listAllCandidatesForPlayer` (REUSED — the SAME reads `RecruitmentAdminController` C7
//             already proved).
//             — 04f-B C8 — 2026-07-12
//
// `MaintenanceRecruitmentLayerMemoryProfiler` — TD-191's delivery (04f-A C9 routed this HERE,
// `docs_int/tech_debt_inventory.md:211`): the per-player 04f memory-budget estimate spanning BOTH
// 04f-A (maintenance/equipment-failure) and 04f-B (recruitment quests/candidates/lieutenant columns).
//
// ★ REAL MEASUREMENT, NOT A FABRICATED CONSTANT: every byte figure below is `DOCUMENTED_ROW_SIZE ×
// REAL_ROW_COUNT`, where `REAL_ROW_COUNT` is a live COUNT/list read against the player's ACTUAL rows
// (`building_operational_state`, `recruitment_quests`, `recruitment_candidates`, `lieutenant`) — never a
// hand-typed total. A fabricated "the 04f share is always ~1.2 KB" constant would NOT move when a player
// accumulates more quests/candidates/buildings; this profiler's total DOES move (falsifiable, C8 floor
// `recruitment_memory_budget.spec.ts`: seed N quests → `recruitmentBytes` scales by exactly
// `N × BYTES_PER_ACTIVE_RECRUITMENT_QUEST`).
//
// The per-row byte CONSTANTS themselves (`memory-budget-constants.ts` — split into its OWN decorator-
// free file so the E2E floor can direct-import them without tripping Playwright's esbuild TS transform
// on this file's `@Inject(...)` constructor-parameter decorators, the SAME reason every OTHER
// production file this codebase's specs direct-import is itself constructor-free or decorator-free) are
// fixed, doc-cited row-size estimates (memory_budget_maintenance.md's own §Per-component table + design
// §13's 2 honest [PROV-Y26Q2] additions for the 04f-B-only components the tech doc's table did not
// itemize) — these are NOT R2.3 gameplay tunables (they estimate storage footprint; they never move
// game BEHAVIOR), so they are plain exported constants, not registry getters. The ONE gameplay-relevant
// number here — the ALERT THRESHOLD (`perf_budget.04f_max_kb_per_player`) — IS an R2.3 tunable, and it
// is REUSED verbatim from the getter 04f-A ALREADY registered
// (`maintenanceTunables.perfBudget04fMaxKbPerPlayer`, `maintenance-tunables.ts:365-368`) — this chunk
// does NOT re-register that key.
//
// This profiler reads `building_operational_state` DIRECTLY (a plain read-only SELECT COUNT) rather
// than importing `MaintenanceModule`/`MaintenanceRepository` — the C8 plan floor's own framing ("proves
// the profiler reads maintenance state WITHOUT TOUCHING it"): zero lines changed anywhere under
// `operational/maintenance/`, zero new cross-module DI wiring, zero risk of a MaintenanceModule/
// RecruitmentModule import cycle. The recruitment-side counts REUSE `RecruitmentRepository`'s existing,
// already-proven methods verbatim (`countLieutenants`, `listQuests('active')`,
// `listAllCandidatesForPlayer`) — no new RecruitmentRepository method either.

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { maintenanceTunables } from '../maintenance/maintenance-tunables';
import { RecruitmentRepository } from './recruitment.repository';
import {
  BYTES_PER_BUILDING_MAINTENANCE_STATE,
  BYTES_PER_BUILDING_EQUIPMENT_FAILURE_STATE,
  BYTES_PER_ACTIVE_RECRUITMENT_QUEST,
  BYTES_PER_RECRUITMENT_CANDIDATE,
  BYTES_PER_LIEUTENANT_RECRUITMENT_COLUMNS,
  BYTES_PER_KB,
  type MaintenanceMemoryComponent,
  type RecruitmentMemoryComponent,
  type PlayerMemoryBudgetBreakdown,
} from './memory-budget-constants';

// Re-exported for callers that only need the constants/types (e.g. the BO controller) — the
// constants file remains the single source of truth; nothing here re-declares a value.
export {
  BYTES_PER_BUILDING_MAINTENANCE_STATE,
  BYTES_PER_BUILDING_EQUIPMENT_FAILURE_STATE,
  BYTES_PER_ACTIVE_RECRUITMENT_QUEST,
  BYTES_PER_RECRUITMENT_CANDIDATE,
  BYTES_PER_LIEUTENANT_RECRUITMENT_COLUMNS,
  BYTES_PER_KB,
};
export type { MaintenanceMemoryComponent, RecruitmentMemoryComponent, PlayerMemoryBudgetBreakdown };

@Injectable()
export class MaintenanceRecruitmentLayerMemoryProfiler {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly recruitment: RecruitmentRepository,
  ) {}

  /**
   * Compute the REAL per-player 04f memory-budget breakdown. Zero-state player (no buildings, no
   * quests, no candidates, no lieutenants) → an all-zero breakdown, `over_budget: false` (L1 honest —
   * mirrors `RecruitmentAdminController.getRecruitmentQuests`'s own "no quests → an empty list, never
   * 404" posture: a player_id with zero 04f activity is a normal, not-found-worthy state).
   */
  async computeForPlayer(playerId: string): Promise<PlayerMemoryBudgetBreakdown> {
    const [buildingCount, activeQuests, candidates, lieutenantRosterCount] = await Promise.all([
      this.countMaintenanceTrackedBuildings(playerId),
      this.recruitment.listQuests(playerId, 'active'),
      this.recruitment.listAllCandidatesForPlayer(playerId),
      this.recruitment.countLieutenants(playerId),
    ]);

    const maintenanceStateBytes = buildingCount * BYTES_PER_BUILDING_MAINTENANCE_STATE;
    const equipmentFailureStateBytes = buildingCount * BYTES_PER_BUILDING_EQUIPMENT_FAILURE_STATE;
    const maintenance: MaintenanceMemoryComponent = {
      building_count: buildingCount,
      maintenance_state_bytes: maintenanceStateBytes,
      equipment_failure_state_bytes: equipmentFailureStateBytes,
      total_bytes: maintenanceStateBytes + equipmentFailureStateBytes,
    };

    const activeQuestBytes = activeQuests.length * BYTES_PER_ACTIVE_RECRUITMENT_QUEST;
    const candidateBytes = candidates.length * BYTES_PER_RECRUITMENT_CANDIDATE;
    const lieutenantColumnBytes = lieutenantRosterCount * BYTES_PER_LIEUTENANT_RECRUITMENT_COLUMNS;
    const recruitment: RecruitmentMemoryComponent = {
      active_quest_count: activeQuests.length,
      active_quest_bytes: activeQuestBytes,
      candidate_count: candidates.length,
      candidate_bytes: candidateBytes,
      lieutenant_roster_count: lieutenantRosterCount,
      lieutenant_column_bytes: lieutenantColumnBytes,
      total_bytes: activeQuestBytes + candidateBytes + lieutenantColumnBytes,
    };

    const totalBytes = maintenance.total_bytes + recruitment.total_bytes;
    const totalKb = totalBytes / BYTES_PER_KB;
    const budgetKb = maintenanceTunables.perfBudget04fMaxKbPerPlayer; // REUSE — no re-registration.

    return {
      player_id: playerId,
      maintenance,
      recruitment,
      total_bytes: totalBytes,
      total_kb: totalKb,
      budget_kb: budgetKb,
      over_budget: totalKb > budgetKb,
    };
  }

  /**
   * REAL per-player building count driving BOTH maintenance-side components (memory_budget_
   * maintenance.md rows 1-2, both keyed to the SAME "~30 buildings" figure — a building that has gone
   * through M1 conversion carries both the maintenance anchor columns AND the equipment-tier/failure-
   * relevant column, so one COUNT drives both estimates). Read-only, no MaintenanceModule import.
   */
  private async countMaintenanceTrackedBuildings(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.player_id, playerId));
    return Number(rows[0]?.n ?? 0);
  }
}

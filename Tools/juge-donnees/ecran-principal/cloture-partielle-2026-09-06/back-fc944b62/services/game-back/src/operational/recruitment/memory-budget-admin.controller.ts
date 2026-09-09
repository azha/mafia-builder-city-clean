// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C8 (the F4 profiler — TD-191
//             delivery)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §13 (`GET
//             /v1/admin/04f/memory-budget` — breakdown per component vs the
//             `perf_budget.04f_max_kb_per_player` alert line)
//             Tech doc: docs/tech/04f_maintenance_decay_recruitment/memory_budget_maintenance.md
//             (§Implications NestJS — backend backoffice: `GET /admin/04f/memory-budget`, role `ops`)
//             Pattern: services/game-back/src/operational/recruitment/recruitment-admin.controller.ts
//             (C7 — `requireStaffRole`, the `players/:id/...` per-player transposition precedent)
//             — 04f-B C8 — 2026-07-12
//
// `MemoryBudgetAdminController` — the TD-191 BO read surface: `GET /v1/admin/04f/memory-budget/:id`.
//
// ★ HONEST PATH TRANSPOSITION (mirrors C7's OWN documented `/:regionId → per-player` move, design §11):
// the tech doc's literal route (`GET /admin/04f/memory-budget`) carries no player scope at all — but the
// budget IS inherently per-player (the `perf_budget.04f_max_kb_per_player` alert line is a PER-PLAYER
// threshold, memory_budget_maintenance.md:79). Every other 04f-A/04f-B BO GET in this codebase is
// player-scoped (`players/:id/critical-buildings`, `players/:id/recruitment-quests`,
// `players/:id/recruitment/candidate-pools`) — this chunk applies the SAME transposition: the tech doc's
// two-segment resource name (`04f/memory-budget`) stays intact, with the player id appended as the
// final path segment (`.../memory-budget/:id`), rather than prepending a `players/:id/...` prefix that
// would obscure the tech doc's own literal naming. A whole-fleet "every player" listing mode is a
// forward TD (no ops "top offenders" requirement is named anywhere in canon/design/plan for this chunk).
//
// requireStaffRole is NON-SPOOFABLE (verbatim `RecruitmentAdminController`/`MaintenanceAdminController`
// precedent — the role is extracted from the JWT bearer token via `extractAccountFromAuthHeader`,
// server-side HS256 verification; a spoofed `x-staff-role` header is never consulted).
//
// Role: `gm` — a read-only ops diagnostic (no mutation, mirrors EVERY other RAW/diagnostic GET in this
// codebase, which are all `gm`; PUT/POST mutation endpoints are `admin`. This chunk adds NO mutation —
// the ALERT THRESHOLD itself is edited via the EXISTING `PUT /v1/admin/tunables/maintenance`, REUSE, no
// new PUT route here).
//
// NOT conditional on NODE_ENV — a real production BO route (always-on), mirrors every sibling admin
// controller. Registered in RecruitmentModule.controllers (C8 ADD — see the module file header).

import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { MaintenanceRecruitmentLayerMemoryProfiler, type PlayerMemoryBudgetBreakdown } from './memory-budget-profiler.service';

@Controller('admin')
export class MemoryBudgetAdminController {
  constructor(private readonly profiler: MaintenanceRecruitmentLayerMemoryProfiler) {}

  /**
   * `GET /v1/admin/04f/memory-budget/:id`
   *
   * The REAL per-player 04f memory-budget breakdown (maintenance + recruitment shares, TD-191). Role
   * `gm`. No existence check on `:id` — a player_id with zero 04f activity returns an honest all-zero
   * breakdown (L1, mirrors `RecruitmentAdminController.getRecruitmentQuests`'s own "never 404" posture).
   */
  @Get('04f/memory-budget/:id')
  @UseGuards(requireStaffRole('gm'))
  async getMemoryBudget(@Param('id') playerId: string): Promise<PlayerMemoryBudgetBreakdown> {
    return this.profiler.computeForPlayer(playerId);
  }
}

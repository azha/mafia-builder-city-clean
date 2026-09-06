// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1d-world-turns-design.md §C6 (observability of the
//             continuous pilot). "Combien de joueurs tickés par période, durée du tour, débordements —
//             sans quoi §3.2 (le tour minute qui déborde et tue la bande 2 Hz en silence) reste
//             indétectable en production."
// Pattern: `services/game-back/src/operational/internal_affairs/ia-admin.controller.ts` (the closest
//          sibling minimal shape — `@Controller('admin')`, `requireStaffRole('gm')`, a single read-only
//          diagnostic GET, NOT NODE_ENV-gated — a real production BO route).
//          — W1.1-d C6 — 2026-08-09 —
//
// `CitySimAdminController` — ONE production BO route: `GET /v1/admin/citysim/pilot-stats`. Deliberately
// NOT the `_test/citysim/*` controller (`CitySimTestController`) — that one is NODE_ENV-gated (404 in
// production), which is EXACTLY the "indétectable en production" failure mode design §C6 exists to close.
// `CitySimSchedulerService.getStats()`/`getBudgetSnapshot()` are the pre-existing, BROADER scheduler SLI
// surface — explicitly deferred to a LATER BO pass ("the SLI surface — exposed to BO later via getStats",
// that method's own doc comment) that this chunk does not attempt; THIS route surfaces ONLY the NEW C6
// pilot-tour metric (`getPilotStats()`), scoped narrowly to what W1.1-d's own mandate covers.

import { Controller, Get, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { CitySimSchedulerService } from './city_sim_scheduler.service';

@Controller('admin')
export class CitySimAdminController {
  constructor(private readonly scheduler: CitySimSchedulerService) {}

  /**
   * `GET /v1/admin/citysim/pilot-stats`
   *
   * The C6 pilot-tour observability snapshot: `toursRun`, `lastPopulationCount` (session-fresh players the
   * MOST RECENT lock-acquiring tour fed into `tickIfDue` — the falsifiable's own cross-check target,
   * design §C6: "égale le nombre de sessions fraîches ... jamais une constante"), `lastTickedCount`
   * (players that ACTUALLY advanced — a subset, since a session-fresh player whose clock has not moved
   * since its last tick reports `ticked:false`), `lastDurationMs`/`maxDurationMs`, `periodBudgetMs` (the
   * SAME real-period the pilot's own timer is armed at), and `overruns` (tours whose OWN duration exceeded
   * their OWN period — the §3.2 defect this route exists to make detectable).
   *
   * Role: `gm` (ops diagnostic surface, no mutation — mirrors `GET /v1/admin/exception-metrics`'s own
   * posture).
   */
  @Get('citysim/pilot-stats')
  @UseGuards(requireStaffRole('gm'))
  getPilotStats() {
    return this.scheduler.getPilotStats();
  }
}

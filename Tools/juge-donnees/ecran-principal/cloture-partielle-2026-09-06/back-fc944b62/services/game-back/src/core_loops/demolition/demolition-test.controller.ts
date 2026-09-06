// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2 (friction engine
//             floor — the `FRICTION_BUDGET_TICK` direct-invocation seam) + §C4 (`NodeDecommissionedEvent`
//             capture-probe — the decommission tx's own observability surface)
//             Pattern: `supply-chain-test.controller.ts`'s `run-mycelial-decay` (TEST-ONLY HTTP entry
//             point that calls the REAL, unmodified production `runTick` directly — no mock, no stub) +
//             the `testControllersEnabled()` conditional-mount gate every sibling `*-test.controller.ts`
//             in this codebase uses.
//             — P3-E C2 — 2026-07-17 / P3-E C4 (NodeDecommissionedEvent capture) — 2026-07-17
//
// `DemolitionTestController` — a direct invocation seam for `FrictionBudgetTickService.runTick` (the
// REAL, unmodified `FRICTION_BUDGET_TICK` NIGHTLY/31 tick — Lesson #3, the SAME method the scheduler
// registration calls). Drives lazy-stamp/cache-refresh/penalty transition exactness + same-`gameMinute`
// idempotency directly, without waiting for the scheduler's own NIGHTLY cadence.
//
// Also captures `EfficiencyPenaltyAppliedEvent`/`EfficiencyPenaltyRevertedEvent`/`NodeDecommissionedEvent`
// in-memory (mirrors `CoreLoopsTestController`'s own `aged-out-events` `onModuleInit` capture-probe
// convention) — these bus events have no other observable surface from outside the process, and the
// plan's own C2/C4 floors explicitly require "penalty+ÉVÉNEMENT+carte"/"le voisinage embarqué" as
// SEPARATE falsifiable components (the REAL player-facing `POST .../decommission` endpoint is the
// mutation surface; this capture-probe is READ-ONLY observability, no side effects of its own).
//
// Everything ELSE the C2/C4 floors need (seed buildings/routes, force `structural_state`/`acquired_at_tick`
// fixture values, read `friction_budget_state`/`exception_queue`/`annealing_state`/`route` rows) is a
// plain table the E2E spec reads/writes directly via `psql` — mirrors
// `demolition_compression_schema_migration.spec.ts`'s (C1) own dominant convention (raw SQL fixture setup
// + raw SQL assertions; HTTP is used ONLY where real business logic/guards or in-process events are
// actually exercised). No extra HTTP surface just to re-expose a plain column read (DRY — this codebase's
// own "centralize the specific, don't repeat the generic" discipline).
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()`).

import { Body, Controller, Get, HttpCode, OnModuleInit, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import {
  CityEventBus,
  type EfficiencyPenaltyAppliedEvent,
  type EfficiencyPenaltyRevertedEvent,
  type NodeDecommissionedEvent,
} from '../../citysim/events/city-event-bus';
import { FrictionBudgetTickService, type FrictionBudgetTickResult } from './friction-budget-tick.service';

interface RunFrictionBudgetTickBody {
  playerId: string;
  gameMinute: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DemolitionTestController implements OnModuleInit {
  // in-memory capture of the C2/C4 bus events (capture-only, no side effects — the tick service/
  // decommission service themselves own the DB transitions; this is purely an E2E observability probe,
  // mirrors CoreLoopsTestController's own `_capturedAgedOutEvents` convention).
  private readonly _capturedApplied: EfficiencyPenaltyAppliedEvent[] = [];
  private readonly _capturedReverted: EfficiencyPenaltyRevertedEvent[] = [];
  private readonly _capturedDecommissioned: NodeDecommissionedEvent[] = [];

  constructor(
    private readonly frictionBudgetTick: FrictionBudgetTickService,
    private readonly bus: CityEventBus,
  ) {}

  onModuleInit(): void {
    this.bus.onEfficiencyPenaltyApplied((event) => this._capturedApplied.push(event));
    this.bus.onEfficiencyPenaltyReverted((event) => this._capturedReverted.push(event));
    this.bus.onNodeDecommissioned((event) => this._capturedDecommissioned.push(event));
  }

  /**
   * `POST /v1/_test/demolition/run-friction-budget-tick` — TEST-ONLY direct invocation of
   * `FrictionBudgetTickService.runTick` (the REAL, unmodified NIGHTLY/31 tick — Lesson #3, the SAME
   * method the scheduler registration calls). Used by the C2 floor: lazy-stamp one-shot idempotence,
   * exact friction-total/org-size arithmetic, penalty apply/revert exactly-once (a 2nd call with the
   * IDENTICAL `gameMinute` must return `penaltyTransitioned: false`, `stampedCount: 0`).
   *
   * Body: { playerId, gameMinute }. Response: the REAL `FrictionBudgetTickResult`.
   */
  @Post('_test/demolition/run-friction-budget-tick')
  @HttpCode(200)
  async runFrictionBudgetTick(@Body() body: RunFrictionBudgetTickBody): Promise<FrictionBudgetTickResult> {
    return this.frictionBudgetTick.runTick(body.playerId, Number(body.gameMinute));
  }

  /**
   * `GET /v1/_test/demolition/penalty-events?playerId=` — in-memory capture of every
   * `EfficiencyPenaltyAppliedEvent`/`EfficiencyPenaltyRevertedEvent` observed so far, optionally filtered
   * by `playerId`. Response `{ applied: [...], reverted: [...] }` (each entry the REAL event payload).
   */
  @Get('_test/demolition/penalty-events')
  getPenaltyEvents(
    @Query('playerId') playerId?: string,
  ): { applied: EfficiencyPenaltyAppliedEvent[]; reverted: EfficiencyPenaltyRevertedEvent[] } {
    const applied = playerId ? this._capturedApplied.filter((e) => e.playerId === playerId) : [...this._capturedApplied];
    const reverted = playerId ? this._capturedReverted.filter((e) => e.playerId === playerId) : [...this._capturedReverted];
    return { applied, reverted };
  }

  /**
   * `GET /v1/_test/demolition/decommission-events?playerId=` — P3-E C4: in-memory capture of every
   * `NodeDecommissionedEvent` observed so far, optionally filtered by `playerId`. Response
   * `{ decommissioned: [...] }` (each entry the REAL event payload, incl. the embedded `neighborBuildingIds`
   * — D16). Used by the C4 floor to prove "exactly ONE event per genuine decommission" + the neighbor list.
   */
  @Get('_test/demolition/decommission-events')
  getDecommissionEvents(@Query('playerId') playerId?: string): { decommissioned: NodeDecommissionedEvent[] } {
    const decommissioned = playerId
      ? this._capturedDecommissioned.filter((e) => e.playerId === playerId)
      : [...this._capturedDecommissioned];
    return { decommissioned };
  }
}

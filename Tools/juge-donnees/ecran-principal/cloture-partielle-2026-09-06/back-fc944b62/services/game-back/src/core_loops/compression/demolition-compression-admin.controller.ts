// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 ("BO (§17) : 5
//             GET endpoints + 2 `f3_deferred` force actions (audited via the existing admin-audit service
//             REUSE + role-gated to the ops role REUSE) + 5 Vue-BO SFCs").
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §17.
//             Pattern: `cue-annealing-admin.controller.ts` (P3-D C8 — the closest sibling: SAME 2-loop
//             BO-condensation shape, `requireStaffRole`/`f3_deferred`/`AdminAuditLogService.emit`, "drives
//             the REAL transition then calls the REAL producer" force shape) + `core-loops-admin.
//             controller.ts` (the `structural_decisions_audit` read pattern for decommission history).
//             — P3-E C8 — 2026-07-18
//
// `DemolitionCompressionAdminController` — the BO production routes for the ch05 Loops 8-9 surface.
//
// SCOPE-RECONCILE NOTE (non-silent — mirrors this codebase's own established "SCOPE NOTE" convention):
// design §17 literally names 4 GET bullets (`friction-state`, `efficiency-penalty-history`,
// `decommission-patterns`, `compression-state`) but names 5 Vue-BO SFCs (`FrictionBudgetDashboard`,
// `HoarderDetectionAnalyzer`, `ReplacementOptionsAcceptanceRate`, `CompressionEventsTimeline`,
// `StressAccumulatorDistribution`). 2 of the 5 SFCs have NO real data source among the 4 named bullets
// (`ReplacementOptionsAcceptanceRate` — no bullet aggregates `replacement_option` pick/expiry outcomes at
// all; `StressAccumulatorDistribution` — a cross-player HISTOGRAM needs a cross-player query, `compression-
// state` is per-player). Realized here (5 GET ROUTES total, per the C8 dispatch's own count) by: (a)
// EXPANDING `decommission-patterns` (already cross-player/demolition-domain) with 2 MORE sections —
// replacement-option acceptance stats AND the chronic-hoarder list (`HoarderDetectionAnalyzer`'s own
// named concept: "friction sur-seuil chronique sans décommission") — 2 SFCs consume 2 different sections
// of this ONE richer response; (b) adding ONE genuinely NEW-additive cross-player route,
// `GET /admin/compression/stress-distribution`, for `StressAccumulatorDistribution`. `friction-state` +
// `efficiency-penalty-history` stay literally as named (both feed `FrictionBudgetDashboard`, 2 API calls
// 1 SFC — mirrors `CueStackDashboard`+`CascadeOutcomeTimeline` both living in one view). `compression-
// state` stays literally as named, feeding `CompressionEventsTimeline` (a PER-PLAYER timeline, matching
// its own literal "timeline compression_events" wording).
//
//   GET  /v1/admin/players/:id/friction-state          — role gm — TRUE scalars: friction_budget_total/
//                                                          friction_org_size/friction_threshold/penalty
//                                                          state + per-node breakdown (derived on demand,
//                                                          §4.2 formula REUSE) + decommission history
//                                                          (structural_decisions_audit, code 11 REUSE).
//   GET  /v1/admin/players/:id/efficiency-penalty-history — role gm — current penalty state + every
//                                                          FRICTION_THRESHOLD-tagged card ever raised for
//                                                          this player (the genuinely queryable apply-
//                                                          moment trace — no dedicated history table this
//                                                          lot, honestly documented below).
//   GET  /v1/admin/demolition/decommission-patterns    — role gm — cross-player: building-type
//                                                          distribution of demolished buildings +
//                                                          replacement-option acceptance aggregate +
//                                                          chronic-hoarder list (SCOPE-RECONCILE above).
//   GET  /v1/admin/players/:id/compression-state       — role gm — TRUE org_stress/week_state + this
//                                                          player's OWN `compression_events` timeline.
//   GET  /v1/admin/compression/stress-distribution      — role gm — cross-player: `org_stress` histogram
//                                                          (10-wide bands, SCOPE-RECONCILE above).
//   POST /v1/admin/players/:id/force-compression-week   — role admin — f3_deferred, audited — drives the
//                                                          REAL `applyStressIncrement` (`'none'` case) THEN
//                                                          the REAL `engageVoluntary` (never a fabricated
//                                                          board) — "drives 2 REAL write-paths" precedent.
//   POST /v1/admin/players/:id/force-decommission        — role admin — f3_deferred, audited — `{buildingId}`
//                                                          body, drives the REAL `DecommissionService
//                                                          .decommission` DIRECTLY (bypassing the Loop 10
//                                                          governor's session cap — a PLAYER-facing
//                                                          constraint, not applicable to an admin override,
//                                                          mirrors `force-settling-end`'s own bypass of the
//                                                          player-facing completion path).
//
// P5 BO INVERSION (R2.2): every GET above returns the RAW server-only scalars the player-facing surfaces
//   (`FrictionProjectionService`/`CompressionProjectionController`/`GET /v1/compression/board`)
//   deliberately bucket away — `friction_budget_total`/`friction_threshold`/`org_stress`/
//   `penalty_since_tick`/`decommission_cost` cents. NEVER forwarded to any player-facing endpoint (the
//   leak-scan floor, this SAME chunk, proves the player side stays clean).
//
// F3 two-person-rule: DEFERRED (TD-107 join, the SAME honest marker every sibling admin controller in
//   this codebase carries). The 2 force endpoints are gated by `requireStaffRole('admin')` ONLY until F3
//   lands; each response carries `f3_deferred: true`.
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): each of the 2 force endpoints
//   writes exactly one `admin_audit_log` row. The 5 GET endpoints are read-only diagnostics and do NOT audit.
//
// MODULE HOME: lives in `core_loops/compression/` (registered in `CompressionModule`) — `CompressionModule`
//   ALREADY one-way imports `DemolitionModule` (C6/C7, for `FrictionBudgetRepository`/`DecommissionService`)
//   so this controller can inject BOTH domains' repositories/services with ZERO new module edge (mirrors
//   `CompressionBoardService`'s own cross-domain injection of `DecommissionService`).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { structuralDecisionAuditRow } from '../../db/schema/progression_structural';
import { playerProgressionState } from '../../db/schema/player_progression_state';
import { replacementOption, compressionEvent, frictionBudgetState } from '../../db/schema/demolition_compression';
import { coreLoopsTunables } from '../core-loops-tunables';
import { FrictionBudgetRepository } from '../demolition/friction-budget.repository';
import { ageDaysFromAcquiredAtTick, frictionLoadForNode } from '../demolition/friction-formula';
import { DecommissionService } from '../demolition/decommission.service';
import { FRICTION_THRESHOLD_SOURCE } from '../demolition/friction-threshold-exception-producer.service';
import { CompressionWeekRepository } from './compression-week.repository';
import { CompressionBoardService } from './compression-board.service';

const NODE_DECOMMISSION_CODE = 11; // structural-decision-catalogue.ts — StructuralDecisionType.NODE_DECOMMISSION.

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Controller('admin')
export class DemolitionCompressionAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly frictionRepo: FrictionBudgetRepository,
    private readonly decommission: DecommissionService,
    private readonly compressionRepo: CompressionWeekRepository,
    private readonly board: CompressionBoardService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/players/:id/friction-state — TRUE scalars + node breakdown + decommission history ────

  /**
   * `GET /v1/admin/players/:id/friction-state` (design §17) — `friction_budget_state`'s OWN row verbatim
   * (RAW `friction_budget_total`/`friction_org_size`/`efficiency_penalty_active`/`penalty_since_tick`/
   * `last_decommission_at_tick`/`last_evaluated_tick`) + `friction_threshold` (derived, the SAME §4.3
   * formula) + per-node breakdown (`FrictionBudgetRepository.fetchPerimeterNodes` REUSE — the SAME §4.2
   * formula the tick itself uses, `frictionLoadForNode`, derived on demand — never a 2nd copy) +
   * decommission history (`structural_decisions_audit` code 11, REUSE the governor's OWN audit trail).
   */
  @Get('players/:id/friction-state')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerFrictionState(@Param('id') playerId: string) {
    const [row, gameMinute, nodes, decommissions] = await Promise.all([
      this.frictionRepo.getRow(playerId),
      this.currentGameMinute(playerId),
      this.frictionRepo.fetchPerimeterNodes(playerId),
      this.db
        .select({ decisionId: structuralDecisionAuditRow.decision_id, decidedAt: structuralDecisionAuditRow.decided_at, afterState: structuralDecisionAuditRow.after_state })
        .from(structuralDecisionAuditRow)
        .where(and(eq(structuralDecisionAuditRow.player_id, playerId), eq(structuralDecisionAuditRow.decision_type, NODE_DECOMMISSION_CODE)))
        .orderBy(sql`${structuralDecisionAuditRow.decided_at} DESC`),
    ]);

    const frictionThreshold = row ? row.friction_org_size * coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize : 0;

    return {
      playerId,
      frictionBudgetTotal: row ? Number(row.friction_budget_total) : 0,
      frictionOrgSize: row?.friction_org_size ?? 0,
      frictionThreshold,
      efficiencyPenaltyActive: row?.efficiency_penalty_active ?? false,
      penaltySinceTick: row?.penalty_since_tick ?? null,
      lastDecommissionAtTick: row?.last_decommission_at_tick ?? null,
      lastEvaluatedTick: row?.last_evaluated_tick ?? 0,
      nodes: nodes.map((n) => ({
        buildingId: n.buildingId,
        acquiredAtTick: n.acquiredAtTick,
        ageDays: ageDaysFromAcquiredAtTick(gameMinute, n.acquiredAtTick ?? gameMinute),
        connectionCount: n.connectionCount,
        frictionLoad: frictionLoadForNode(
          coreLoopsTunables.demolitionBaseFrictionPerNode,
          coreLoopsTunables.demolitionAgeDecayFactorPerTick,
          ageDaysFromAcquiredAtTick(gameMinute, n.acquiredAtTick ?? gameMinute),
          n.connectionCount,
          coreLoopsTunables.demolitionPerConnectionFrictionModifier,
        ),
      })),
      decommissions: decommissions.map((d) => ({ decisionId: d.decisionId, decidedAt: d.decidedAt, afterState: d.afterState })),
    };
  }

  // ─── GET /admin/players/:id/efficiency-penalty-history — current state + FRICTION_THRESHOLD trace ─────

  /**
   * `GET /v1/admin/players/:id/efficiency-penalty-history` (design §17) — the current penalty state
   * (`friction_budget_state`) + every `FRICTION_THRESHOLD`-tagged card raised for this player
   * (`exception_queue`, `FrictionThresholdExceptionProducer`'s OWN source tag — each row IS a real "apply"
   * moment, dedup'd 1-pending/player). HONEST LIMITATION (documented, not silently absorbed): no
   * dedicated apply/revert HISTORY table exists this lot (§5.1 emits BUS events on revert, never a 2nd
   * persisted row) — `resolvedAt`/`resolutionStatus` reflect the card's OWN acknowledge/escalate lifecycle,
   * NOT necessarily the moment the penalty itself reverted.
   */
  @Get('players/:id/efficiency-penalty-history')
  @UseGuards(requireStaffRole('gm'))
  async getEfficiencyPenaltyHistory(@Param('id') playerId: string) {
    const [row, cardRows] = await Promise.all([
      this.frictionRepo.getRow(playerId),
      this.db.execute(sql`
        SELECT exception_id, emitted_at, resolution_status, resolved_at
        FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
        WHERE player_id = ${playerId}::uuid AND elem->>'source' = ${FRICTION_THRESHOLD_SOURCE}
        ORDER BY emitted_at DESC
      `),
    ]);

    return {
      playerId,
      currentState: { efficiencyPenaltyActive: row?.efficiency_penalty_active ?? false, penaltySinceTick: row?.penalty_since_tick ?? null },
      thresholdCrossings: rowsOf(cardRows).map((r) => ({
        exceptionId: String(r['exception_id']),
        emittedAt: r['emitted_at'],
        resolutionStatus: String(r['resolution_status']),
        resolvedAt: r['resolved_at'] ?? null,
      })),
    };
  }

  // ─── GET /admin/demolition/decommission-patterns — cross-player (SCOPE-RECONCILE, 3 sections) ────────

  /**
   * `GET /v1/admin/demolition/decommission-patterns` (design §17, EXPANDED — file header SCOPE-RECONCILE
   * note) — 3 cross-player sections: (1) `typeDistribution` — `building_type` counts among
   * `structural_state='demolished'` rows; (2) `replacementAcceptance` — `replacement_option` outcome
   * aggregate (total/picked/expired-unpicked/open/pickRate); (3) `chronicHoarders` — every player with
   * `efficiency_penalty_active=true`, ordered by `penalty_since_tick` ASC (longest-chronic first), each
   * carrying `decommissionedSincePenaltyActive` (`last_decommission_at_tick >= penalty_since_tick` — the
   * "friction sur-seuil chronique SANS décommission" signal `HoarderDetectionAnalyzer` validates).
   */
  @Get('demolition/decommission-patterns')
  @UseGuards(requireStaffRole('gm'))
  async getDecommissionPatterns() {
    const [typeRows, optionRows, hoarderRows] = await Promise.all([
      this.db.execute(sql`
        SELECT building_type, count(*)::int AS count FROM buildings WHERE structural_state = 'demolished'
        GROUP BY building_type ORDER BY count(*) DESC
      `),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          picked: sql<number>`count(*) FILTER (WHERE ${replacementOption.picked_at} IS NOT NULL)::int`,
          expiredUnpicked: sql<number>`count(*) FILTER (WHERE ${replacementOption.picked_at} IS NULL AND ${replacementOption.closed_at} IS NOT NULL)::int`,
          open: sql<number>`count(*) FILTER (WHERE ${replacementOption.closed_at} IS NULL)::int`,
        })
        .from(replacementOption),
      this.db
        .select({
          playerId: frictionBudgetState.player_id,
          penaltySinceTick: frictionBudgetState.penalty_since_tick,
          lastDecommissionAtTick: frictionBudgetState.last_decommission_at_tick,
        })
        .from(frictionBudgetState)
        .where(eq(frictionBudgetState.efficiency_penalty_active, true))
        .orderBy(sql`${frictionBudgetState.penalty_since_tick} ASC NULLS LAST`),
    ]);

    const typeDistribution = rowsOf(typeRows).map((r) => ({ buildingType: Number(r['building_type']), count: Number(r['count']) }));
    const agg = optionRows[0] ?? { total: 0, picked: 0, expiredUnpicked: 0, open: 0 };
    const replacementAcceptance = {
      totalOptions: agg.total,
      pickedCount: agg.picked,
      expiredUnpickedCount: agg.expiredUnpicked,
      openCount: agg.open,
      pickRate: agg.total > 0 ? agg.picked / agg.total : 0,
    };
    const chronicHoarders = hoarderRows.map((h) => ({
      playerId: h.playerId,
      penaltySinceTick: h.penaltySinceTick,
      lastDecommissionAtTick: h.lastDecommissionAtTick,
      decommissionedSincePenaltyActive: h.lastDecommissionAtTick != null && h.penaltySinceTick != null && h.lastDecommissionAtTick >= h.penaltySinceTick,
    }));

    return { typeDistribution, replacementAcceptance, chronicHoarders };
  }

  // ─── GET /admin/players/:id/compression-state — TRUE org_stress/week_state + this player's timeline ──

  /**
   * `GET /v1/admin/players/:id/compression-state` (design §17) — TRUE `org_stress`/`compression_week_
   * state` + this player's OWN `compression_events` rows (newest-first — the "timeline compression_events"
   * design's own literal wording names), RAW columns verbatim (`state`/`forced`/`severity_multiplier_
   * applied`/`stress_at_fire`/`deferral_count`/`decisions_used`/`decisions_budget`/3 tick anchors).
   */
  @Get('players/:id/compression-state')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerCompressionState(@Param('id') playerId: string) {
    const [progRows, eventRows] = await Promise.all([
      this.db
        .select({ org_stress: playerProgressionState.org_stress, compression_week_state: playerProgressionState.compression_week_state })
        .from(playerProgressionState)
        .where(eq(playerProgressionState.player_id, playerId))
        .limit(1),
      this.db.select().from(compressionEvent).where(eq(compressionEvent.player_id, playerId)).orderBy(sql`${compressionEvent.opened_at_tick} DESC`),
    ]);

    return {
      playerId,
      orgStress: progRows[0]?.org_stress ?? 0,
      weekState: progRows[0]?.compression_week_state ?? 'none',
      events: eventRows.map((e) => ({
        id: e.id,
        state: e.state,
        forced: e.forced,
        severityMultiplierApplied: e.severity_multiplier_applied,
        stressAtFire: e.stress_at_fire,
        deferralCount: e.deferral_count,
        decisionsUsed: e.decisions_used,
        decisionsBudget: e.decisions_budget,
        openedAtTick: e.opened_at_tick,
        firedAtTick: e.fired_at_tick,
        finalizedAtTick: e.finalized_at_tick,
      })),
    };
  }

  // ─── GET /admin/compression/stress-distribution — cross-player histogram (SCOPE-RECONCILE) ────────────

  /**
   * `GET /v1/admin/compression/stress-distribution` (SCOPE-RECONCILE, file header) — a cross-player
   * `org_stress` histogram, 10-wide bands `[0,10) .. [90,100]` (`width_bucket`, 10 buckets over
   * `player_progression_state`, EVERY row — a player who never accrued any stress reads bucket 1,
   * honestly, not excluded).
   */
  @Get('compression/stress-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getStressDistribution() {
    const result = await this.db.execute(sql`
      SELECT width_bucket(org_stress, 0, 101, 10) AS bucket, count(*)::int AS count
      FROM player_progression_state
      GROUP BY bucket ORDER BY bucket
    `);
    const rows = rowsOf(result);
    const byBucket = new Map<number, number>(rows.map((r) => [Number(r['bucket']), Number(r['count'])]));
    const buckets = Array.from({ length: 10 }, (_, i) => {
      const b = i + 1;
      const lower = i * 10;
      const upper = b === 10 ? 100 : lower + 9;
      return { rangeLabel: `${lower}-${upper}`, count: byBucket.get(b) ?? 0 };
    });
    const totalPlayers = buckets.reduce((sum, b) => sum + b.count, 0);
    return { totalPlayers, buckets };
  }

  // ─── POST /admin/players/:id/force-compression-week — admin override (role `admin`, F3 DEFERRED) ─────

  /**
   * `POST /v1/admin/players/:id/force-compression-week` (design §17) — already `'active'` → 409 (nothing
   * to force). `'none'` → drives the REAL `CompressionWeekRepository.applyStressIncrement` with an
   * increment EQUAL to the trigger threshold (guarantees the crossing regardless of the player's current
   * stress) — the SAME real write-path C6's own session-close subscriber uses, just admin-invoked. Then
   * (from either `'none'`-now-`'warning'` or already-`'warning'`) drives the REAL `CompressionBoardService
   * .engageVoluntary` — a genuine board, never fabricated (mirrors `force-cascade`'s own "drives the REAL
   * transition then calls the REAL producer" precedent).
   */
  @Post('players/:id/force-compression-week')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async forceCompressionWeek(@Param('id') playerId: string, @Req() req: RequestWithAccount) {
    const before = await this.compressionRepo.getStateProjection(playerId, coreLoopsTunables.compressionForceEngagementThreshold);
    if (before.weekState === 'active') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `player ${playerId} already has an active compression week.` });
    }

    if (before.weekState === 'none') {
      const triggerThreshold = coreLoopsTunables.compressionStressThresholdTrigger;
      const gameMinute = await this.currentGameMinute(playerId);
      await this.compressionRepo.applyStressIncrement(playerId, triggerThreshold, gameMinute, triggerThreshold, coreLoopsTunables.compressionMaxDecisionBudget);
    }

    const result = await this.board.engageVoluntary(playerId);
    if (!result.engaged) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `player ${playerId} has no open compression cycle to force (concurrent change?).`,
      });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'compression_events',
      targetEntityId: result.compressionEventId,
      beforeState: { weekState: before.weekState },
      afterState: { weekState: 'active', compressionEventId: result.compressionEventId },
    });

    return { playerId, compressionEventId: result.compressionEventId, engaged: true as const, f3_deferred: true as const };
  }

  // ─── POST /admin/players/:id/force-decommission — admin override (role `admin`, F3 DEFERRED) ──────────

  /**
   * `POST /v1/admin/players/:id/force-decommission` (design §17) — `{buildingId}` body. Drives the REAL
   * `DecommissionService.decommission(playerId, buildingId, true)` DIRECTLY — NOT through the Loop 10
   * governor (the 1-structural-decision-per-session cap is a PLAYER-facing session mechanic, not an admin
   * constraint — mirrors `force-settling-end`'s own bypass of the player-facing completion write-path).
   * Every genuine C4 guard (LIEUTENANT_ASSIGNED / LAST_NODE / already-demolished / insufficient cash)
   * still applies — "force" means "admin-invoked, not session-capped", never "bypasses real invariants".
   */
  @Post('players/:id/force-decommission')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async forceDecommission(@Param('id') playerId: string, @Body() body: { buildingId?: string }, @Req() req: RequestWithAccount) {
    const buildingId = body.buildingId;
    if (!buildingId) {
      throw new ApiError('VALIDATION_FAILED', { message: 'body must include buildingId.' });
    }

    const result = await this.decommission.decommission(playerId, buildingId, true);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'buildings',
      targetEntityId: buildingId,
      beforeState: { structuralState: 'operational' },
      afterState: { structuralState: 'demolished', freedBlockId: result.freedBlockId },
    });

    return { playerId, buildingId: result.buildingId, freedBlockId: result.freedBlockId, neighborCount: result.neighborCount, f3_deferred: true as const };
  }

  private async currentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}

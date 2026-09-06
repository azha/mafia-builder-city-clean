// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C8 (BO surface — 6 admin
//             endpoints, role-gated, audited, f3_deferred PUT)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §10 (D14 — BO
//             surface, game-back `/v1/admin/*`, bo-front DIRECT) + the 6-row endpoint table.
//             Decisions: §1.14 D14 (BO topology continuity — DD-C6 supersedes the ch05 docs' "NestJS —
//             backend backoffice" placement; `requireStaffRole` + `f3_deferred` + `AdminAuditLogService`
//             REUSE, never a parallel audit path).
//             Canon: docs/tech/05_player_core_loops/exception_queue_spine.md:116-121 (`GET /admin/
//             players/:id/exception-queue`, `GET /admin/exception-metrics`, `PUT /admin/tunables/
//             exception_queue`) + one_decision_per_session.md:101-105 (`GET /admin/players/:id/
//             structural-decisions-history`, `PUT /admin/tunables/one_decision`,
//             `<HighestLeverageCardSurfacing>`) — canon's role `ops` transposed to `gm` (D14, the SAME
//             04f-A D12 transposition), canon's 2 separate tunables PUTs (`exception_queue` /
//             `one_decision`) CONSOLIDATED into design §10's ONE `PUT /admin/tunables/core-loops` (the
//             registry itself is ONE file, `core-loops-tunables.ts` — a per-canon-doc split PUT would
//             fragment ONE registry across two routes for no operational benefit; every sibling admin
//             controller in this codebase PUTs its WHOLE module's tunable registry through ONE route —
//             `patchLiveOpsTunable`/`patchMetaMarketTunable`/`patchInternalAffairsTunable` — REUSE of that
//             convention, not an invented shortcut).
//             Pattern: services/game-back/src/operational/liveops/live-ops-admin.controller.ts (04e-B C8
//             — the closest sibling: `requireStaffRole`, `f3_deferred` marker, raw-listing GET shape,
//             `AdminAuditLogService.emit` convention) + .../internal_affairs/ia-admin.controller.ts (04d-B
//             C9 — the aggregate-distribution GET shape, `sql<number>\`count(*)::int\`` pattern) +
//             .../distribution/distribution-admin.controller.ts (`players/:id/...` `@Param('id')` shape).
//             — P3-A C8 — 2026-07-10
//
// `CoreLoopsAdminController` — the 6 production BO routes for the P3-A ch05 surface (D14):
//
//   GET  /v1/admin/players/:id/exception-queue    — role gm    — TRUE state: raw priority/severity/
//                                                                 confidence per card + per-lieutenant
//                                                                 pending counts + escalations subset +
//                                                                 script rule counts (canon transposed).
//   GET  /v1/admin/exception-metrics               — role gm    — cross-player aggregate: emission total,
//                                                                 resolution-status distribution,
//                                                                 aged-out rate, backlog distribution
//                                                                 (REUSE `queuePressureBand`).
//   GET  /v1/admin/players/:id/structural-decisions — role gm    — `structural_decisions_audit` rows +
//                                                                 session context (`after_state->>
//                                                                 '_session'` — session-attributed vs
//                                                                 sessionless, D9) + both-catalogue label.
//   GET  /v1/admin/players/:id/sessions             — role gm    — `gameplay_sessions` list + counters
//                                                                 (the dormant table made inspectable).
//   GET  /v1/admin/players/:id/hl-card              — role gm    — `HlCardService.getDiagnostic`: current
//                                                                 carried card + FULL provider candidate
//                                                                 list, raw impact/urgency/score (the P5
//                                                                 inversion — present HERE, absent
//                                                                 client-side).
//   PUT  /v1/admin/tunables/core-loops              — role admin, f3_deferred, audited — registry
//                                                                 read-modify-write over `core_loops.*`/
//                                                                 `session.*`/`perf_budget.05_*` keys,
//                                                                 CAPS-clamped (political/live-ops-admin
//                                                                 PUT precedent).
//
// P5 BO INVERSION (R2.2): every GET above returns the RAW server-only scalars the player-facing surfaces
//   (`ExceptionsProjectionService`/`hl-card-projection.ts`) deliberately bucket away — `priority`/
//   `severity`/`confidence` ints/floats, `impact_internal`/`urgency_internal` floats, raw pending counts.
//   These are NEVER forwarded to any player-facing endpoint (the leak-scan `ALLOWED_KEYS` allow-lists in
//   `tests/e2e/core_loops/*` prove the player side stays clean; this file is the deliberate BO-only
//   inversion of that same wall).
//
// BOTH CATALOGUES (forward-note from the C6 ruling): `highest_leverage_cards.decision_type` AND
//   `structural_decisions_audit.decision_type` are both raw ints drawn from one of TWO disjoint
//   catalogues (`HL_CARD_PROVIDER_CATALOGUE` 101-105 / `STRUCTURAL_DECISION_CATALOGUE` 1-14) — every
//   render below carries `decisionTypeKey` + `decisionTypeCatalogue` together (`decisionTypeLabelFor`,
//   `hl-card-projection.ts`, REUSE — never a bare int, never a key with no provenance, never a second
//   catalogue-lookup written here).
//
// F3 two-person-rule: DEFERRED (TD-107 join, decisions §1.14 — "the honest marker, no invented approval
//   flow"). The ONE mutation endpoint (`PUT tunables/core-loops`) is gated by `requireStaffRole('admin')`
//   ONLY until F3 lands; its response carries `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: admin` header WITHOUT a valid bearer token → 401; a valid PLAYER (or wrong-role STAFF)
//   token → 403 — even when presented ALONGSIDE a spoofed header (the header is never read).
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): the ONE mutation endpoint
//   writes exactly one `admin_audit_log` row per call (`action_type='UPDATE'`, `target_entity_type=
//   'core_loops_tunable'`) — the acting staff `account_id` from the VERIFIED JWT, never client-supplied.
//   Every GET above is a read-only diagnostic and does NOT audit (mirrors every sibling BO controller).
//
// SCRIPT RULE COUNTS (exception-queue endpoint): reads the `lieutenant`/`behavior_script` schema tables
//   DIRECTLY (mirrors `LieutenantRepository.listForPlayer`'s own join shape, schema-level REUSE — R9.3,
//   no re-declaration) rather than importing `LieutenantModule` into `CoreLoopsModule`: that module pulls
//   in a long heavy-module chain (Enforcement/MoneyHolding/Distribution/Laundering/Selling/Reputation/
//   Production/Dsl) that `session-open-sequence.service.ts`'s OWN header already documents cascading into
//   an unrelated NestJS boot failure when reached from a module in this exact cluster (C7's reverted first
//   attempt) — the SAME reasoning `LieutenantRepository` itself gives for mirroring the owned-operational-
//   building-gate join locally rather than injecting `ProductionRepository` cross-module.
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `CoreLoopsModule.controllers` (alongside the conditional `CoreLoopsTestController`).

import { Body, Controller, Get, Inject, Param, Put, Req, UseGuards } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { ApiError } from '../protocol/api-error';
import { requireStaffRole } from '../auth/staff-role.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { tunableOverrides } from '../db/schema/tunable_overrides';
import { exceptionQueueRow, exceptionQueueRefusal } from '../db/schema/queues_exceptions_cuestack';
import { gameplaySessionRow } from '../db/schema/sessions_and_audit';
import { structuralDecisionAuditRow } from '../db/schema/progression_structural';
import { lieutenant, behaviorScript } from '../db/schema/lieutenant';
import type { CompiledScript } from '../dsl/ir';
import { CORE_LOOPS_TUNABLE_CAPS, clampCoreLoopsTunableToRange, coreLoopsTunables } from './core-loops-tunables';
import { queuePressureBand } from '../exceptions/exceptions.projection.service';
import { HlCardService, type HlCardDiagnostic } from '../progression/loop10/hl-card.service';
import { decisionTypeLabelFor, type DecisionTypeCatalogueProvenance } from '../progression/loop10/hl-card-projection';

/** Player-level (non-lieutenant) queue scope sentinel — mirrors `exceptions.service.ts`'s OWN
 *  `'__player_level__'` grouping key verbatim (same semantic, kept consistent across the codebase). */
const PLAYER_LEVEL_SCOPE_KEY = '__player_level__';

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Response shapes (BO-only — raw, P5-inverted; never round-tripped through a player-facing type) ──

interface AdminExceptionCardRow {
  exceptionId: string;
  lieutenantId: string | null;
  eventDescriptor: string;
  /** RAW [0..1] float — P5 BO inversion (never surfaced to the player; `ExceptionsProjectionService` bands it there). */
  confidence: number;
  /** RAW int — P5 BO inversion. */
  priority: number;
  /** RAW int — P5 BO inversion. */
  severity: number;
  resolutionStatus: 'pending' | 'resolved' | 'escalated' | 'aged_out';
  emittedAt: Date;
  resolvedAt: Date | null;
}

interface AdminStructuralDecisionRow {
  decisionId: string;
  decisionType: number;
  decisionTypeKey: string;
  decisionTypeCatalogue: DecisionTypeCatalogueProvenance;
  decidedAt: Date;
  beforeState: unknown;
  afterState: unknown;
  sessionRef: string | null;
  sessionAttributed: boolean;
  triggeredExtinction: boolean;
  triggeredRecallDebt: boolean;
}

// ─── Controller ────────────────────────────────────────────────────────────────

/**
 * `CoreLoopsAdminController` — production BO routes for the P3-A ch05 surface (session spine +
 * Exception-Queue + Loop 10 + HighestLeverageCard, D14).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/exception-queue`, `/v1/admin/exception-metrics`,
 * `/v1/admin/players/:id/structural-decisions`, `/v1/admin/players/:id/sessions`,
 * `/v1/admin/players/:id/hl-card`, `/v1/admin/tunables/core-loops`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in `CoreLoopsModule.controllers` (alongside the conditional `CoreLoopsTestController`).
 */
@Controller('admin')
export class CoreLoopsAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly auditLog: AdminAuditLogService,
    private readonly hlCardService: HlCardService,
  ) {}

  // ─── GET /admin/players/:id/exception-queue — TRUE state (role `gm`) ─────────────────────────────

  /**
   * `GET /v1/admin/players/:id/exception-queue`
   *
   * P5 BO INVERSION: every `exception_queue` row for this player, ALL statuses, with the RAW
   * `priority`/`severity`/`confidence` scalars the player-facing `GET /v1/exceptions/queue` deliberately
   * bands away (`ExceptionsProjectionService`). PLUS: per-(lieutenant-or-player-level) PENDING counts
   * (the SAME scope grouping `ExceptionsRepository.countPendingForLieutenant`'s D5 cap guard reads),
   * the `escalated` subset (canon "queue + escalations" combined ops view), and per-lieutenant compiled
   * script rule counts (canon "script rule counts" — read via the `lieutenant`/`behavior_script` schema
   * tables directly, see file header).
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/exception-queue')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerExceptionQueue(@Param('id') playerId: string) {
    const rows = await this.db
      .select()
      .from(exceptionQueueRow)
      .where(eq(exceptionQueueRow.player_id, playerId))
      .orderBy(desc(exceptionQueueRow.priority), exceptionQueueRow.emitted_at);

    const cards: AdminExceptionCardRow[] = rows.map((r) => ({
      exceptionId: r.exception_id,
      lieutenantId: r.lieutenant_id,
      eventDescriptor: r.event_descriptor,
      confidence: r.confidence,
      priority: r.priority,
      severity: r.severity,
      resolutionStatus: r.resolution_status,
      emittedAt: r.emitted_at,
      resolvedAt: r.resolved_at,
    }));

    const perLieutenantPendingCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.resolution_status !== 'pending') continue;
      const key = r.lieutenant_id ?? PLAYER_LEVEL_SCOPE_KEY;
      perLieutenantPendingCounts.set(key, (perLieutenantPendingCounts.get(key) ?? 0) + 1);
    }

    const escalations = cards.filter((c) => c.resolutionStatus === 'escalated');

    // Script rule counts (canon transposed) — REUSE the lieutenant/behavior_script schema tables
    // directly (mirrors LieutenantRepository.listForPlayer's OWN join shape — see file header for why
    // this does NOT import LieutenantModule).
    const lieutenantRows = await this.db
      .select({ lieutenantId: lieutenant.lieutenant_id, rules: behaviorScript.rules })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(eq(lieutenant.player_id, playerId));

    const scriptRuleCounts = lieutenantRows.map((l) => {
      const compiled = l.rules as CompiledScript | null;
      return {
        lieutenantId: l.lieutenantId,
        ruleCount: Array.isArray(compiled?.rules) ? compiled!.rules.length : 0,
      };
    });

    return {
      cards,
      perLieutenantPendingCounts: Array.from(perLieutenantPendingCounts, ([lieutenantId, pendingCount]) => ({
        lieutenantId,
        pendingCount,
      })),
      escalations,
      scriptRuleCounts,
    };
  }

  // ─── GET /admin/exception-metrics — cross-player aggregate (role `gm`) ────────────────────────────

  /**
   * `GET /v1/admin/exception-metrics`
   *
   * Cross-player aggregate (canon "aggregate exception emission rates, resolution distributions across
   * players"): `emittedTotal` + a resolution-status histogram + the derived aged-out rate, PLUS a
   * backlog distribution — the count of (player, lieutenant-or-player-level) scopes per
   * `queuePressureBand` (REUSE, C3's own production banding function — never a re-derived threshold
   * here; `saturated` doubles as "scopes currently AT/ABOVE the cap").
   *
   * ★ TD-203 CLOSED (W1.1-d C5, `docs_int/tech_debt_inventory.md`) — this comment previously documented a
   * HONEST GAP: no HISTORICAL cap-refusal counter existed, only `backlogDistribution.saturated`'s
   * CURRENT-STATE proxy. `ExceptionsRepository.insert` now UPSERTs an aggregate row per (player, producer)
   * on every D5 refusal (`exception_queue_refusal`, migration 0145) — `capRefusals` below sums it, and
   * `capRefusalsByProducer` breaks it down by producer (the "combien refusées, par quel producteur"
   * design §C5 asks for). `backlogDistribution.saturated` stays — it still answers a DIFFERENT question
   * ("how many scopes are AT the cap right now" vs "how many inserts has the cap ever refused").
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('exception-metrics')
  @UseGuards(requireStaffRole('gm'))
  async getExceptionMetrics() {
    const statusRows = await this.db
      .select({
        status: exceptionQueueRow.resolution_status,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(exceptionQueueRow)
      .groupBy(exceptionQueueRow.resolution_status);

    const byResolutionStatus: Record<'pending' | 'resolved' | 'escalated' | 'aged_out', number> = {
      pending: 0,
      resolved: 0,
      escalated: 0,
      aged_out: 0,
    };
    let emittedTotal = 0;
    for (const row of statusRows) {
      byResolutionStatus[row.status] = Number(row.count);
      emittedTotal += Number(row.count);
    }
    const agedOutRate = emittedTotal > 0 ? byResolutionStatus.aged_out / emittedTotal : 0;

    // Backlog distribution — every PENDING (player, lieutenant-or-player-level) scope, banded via the
    // SAME production function the D5 cap guard / C3 projection use (queuePressureBand — REUSE).
    const scopeRows = await this.db
      .select({
        playerId: exceptionQueueRow.player_id,
        lieutenantId: exceptionQueueRow.lieutenant_id,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(exceptionQueueRow)
      .where(eq(exceptionQueueRow.resolution_status, 'pending'))
      .groupBy(exceptionQueueRow.player_id, exceptionQueueRow.lieutenant_id);

    const cap = coreLoopsTunables.exceptionQueueCapPerLieutenant;
    const warn = coreLoopsTunables.exceptionQueueWarnThresholdPerLieutenant;
    const backlogDistribution = { normal: 0, warning: 0, saturated: 0 };
    for (const row of scopeRows) {
      const band = queuePressureBand(Number(row.count), cap, warn);
      backlogDistribution[band] += 1;
    }

    // W1.1-d C5 (TD-203) — the HISTORICAL cap-refusal trace: total refused count across every (player,
    // producer) pair that has EVER hit the cap, plus the per-producer breakdown.
    const refusalRows = await this.db
      .select({
        producer: exceptionQueueRefusal.producer,
        refusedCount: sql<number>`sum(${exceptionQueueRefusal.refused_count})::int`.as('refusedCount'),
      })
      .from(exceptionQueueRefusal)
      .groupBy(exceptionQueueRefusal.producer);

    let capRefusals = 0;
    const capRefusalsByProducer: Record<string, number> = {};
    for (const row of refusalRows) {
      capRefusalsByProducer[row.producer] = Number(row.refusedCount);
      capRefusals += Number(row.refusedCount);
    }

    return { emittedTotal, byResolutionStatus, agedOutRate, backlogDistribution, capRefusals, capRefusalsByProducer };
  }

  // ─── GET /admin/players/:id/structural-decisions — audit timeline (role `gm`) ─────────────────────

  /**
   * `GET /v1/admin/players/:id/structural-decisions`
   *
   * `structural_decisions_audit` rows for this player, newest first, PLUS session context: `sessionRef`
   * is read directly from `after_state->>'_session'` (the D8/D9 convention — no separate column,
   * `structural-decision-governor.service.ts`'s own doc header) and `sessionAttributed` distinguishes a
   * session-bound commit from a sessionless pass-through-audited one (D9). Every row's `decisionType`
   * resolves through the SAME both-catalogue label (`decisionTypeLabelFor`, forward-note from the C6
   * ruling) the hl-card diagnostic below uses — this table's codes are always `STRUCTURAL` in practice
   * (only `StructuralDecisionGovernorService.commit` writes here), but reusing the SAME resolver (rather
   * than assuming that invariant) keeps the render honest if a future lot's provenance ever surprises it.
   *
   * Role: `gm` (audit timeline diagnostic, no mutation).
   */
  @Get('players/:id/structural-decisions')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerStructuralDecisions(@Param('id') playerId: string) {
    const rows = await this.db
      .select({
        decisionId: structuralDecisionAuditRow.decision_id,
        decisionType: structuralDecisionAuditRow.decision_type,
        decidedAt: structuralDecisionAuditRow.decided_at,
        beforeState: structuralDecisionAuditRow.before_state,
        afterState: structuralDecisionAuditRow.after_state,
        triggeredExtinction: structuralDecisionAuditRow.triggered_extinction,
        triggeredRecallDebt: structuralDecisionAuditRow.triggered_recall_debt,
        sessionRef: sql<string | null>`${structuralDecisionAuditRow.after_state}->>'_session'`.as('sessionRef'),
      })
      .from(structuralDecisionAuditRow)
      .where(eq(structuralDecisionAuditRow.player_id, playerId))
      .orderBy(desc(structuralDecisionAuditRow.decided_at));

    let sessionAttributedCount = 0;
    let sessionlessCount = 0;
    const decisions: AdminStructuralDecisionRow[] = rows.map((r) => {
      const label = decisionTypeLabelFor(r.decisionType);
      const sessionAttributed = r.sessionRef !== null;
      if (sessionAttributed) sessionAttributedCount += 1;
      else sessionlessCount += 1;
      return {
        decisionId: r.decisionId,
        decisionType: r.decisionType,
        decisionTypeKey: label.key,
        decisionTypeCatalogue: label.catalogue,
        decidedAt: r.decidedAt,
        beforeState: r.beforeState,
        afterState: r.afterState,
        sessionRef: r.sessionRef,
        sessionAttributed,
        triggeredExtinction: r.triggeredExtinction,
        triggeredRecallDebt: r.triggeredRecallDebt,
      };
    });

    return { decisions, sessionAttributedCount, sessionlessCount };
  }

  // ─── GET /admin/players/:id/sessions — the dormant table made inspectable (role `gm`) ─────────────

  /**
   * `GET /v1/admin/players/:id/sessions`
   *
   * Every `gameplay_sessions` row for this player (open + closed), newest first, with its 3
   * server-authoritative counters (`decisions_made`/`exceptions_resolved`/`structural_commits`) and
   * `active` (derived, `ended_at IS NULL` — mirrors `SessionRepository.findActive`'s own predicate).
   *
   * Role: `gm` (session-history diagnostic, no mutation).
   */
  @Get('players/:id/sessions')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerSessions(@Param('id') playerId: string) {
    const rows = await this.db
      .select()
      .from(gameplaySessionRow)
      .where(eq(gameplaySessionRow.player_id, playerId))
      .orderBy(desc(gameplaySessionRow.started_at));

    const sessions = rows.map((r) => ({
      sessionId: r.gameplay_session_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      decisionsMade: r.decisions_made,
      exceptionsResolved: r.exceptions_resolved,
      structuralCommits: r.structural_commits,
      clientVersion: r.client_version,
      active: r.ended_at === null,
    }));

    return { sessions };
  }

  // ─── GET /admin/players/:id/hl-card — diagnostic (role `gm`) ──────────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/hl-card`
   *
   * `HlCardService.getDiagnostic` (C8 NEW method): the currently CARRIED card RAW (impact_internal/
   * urgency_internal, never bucketed) PLUS the FULL provider candidate list — every registered
   * provider queried FRESH, ranked, with raw impact/urgency/score. THE P5 INVERSION: these raw scores
   * are asserted present HERE and absent from the player-facing session-open payload (C7's
   * `projectHlCard`) — canon `<HighestLeverageCardSurfacing>`.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/hl-card')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerHlCard(@Param('id') playerId: string): Promise<HlCardDiagnostic> {
    return this.hlCardService.getDiagnostic(playerId);
  }

  // ─── PUT /admin/tunables/core-loops — registry edit (role `admin`, F3 DEFERRED, audited) ──────────

  /**
   * `PUT /v1/admin/tunables/core-loops`
   *
   * Core-loops tunable edit: upserts a `core_loops.*`/`session.*`/`perf_budget.05_*` override into the
   * EXISTING `tunable_overrides` table (the SAME mechanism every other admin controller uses — REUSE,
   * never a new override path; `TunablesStore` auto-reloads via the `tunables_changed` LISTEN channel).
   *
   * Allowed keys: `CORE_LOOPS_TUNABLE_CAPS` (`core-loops-tunables.ts` — 18 numeric keys). The 2 boolean
   * keys (`core_loops.one_decision_classification_strict_mode` /
   * `core_loops.one_decision.enforce_without_session`) have NO CAPS entry and are NOT supported here
   * (same precedent as `LiveOpsAdminController`/`PoliticalAdminController`'s own composite/non-numeric
   * key exclusion).
   *
   * Body: { key: string, value: number }. Returns: { key, clampedValue, f3_deferred: true }.
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range
   * (`clampCoreLoopsTunableToRange`) — an out-of-range value is CLAMPED, never rejected.
   *
   * F3 two-person-rule DEFERRED (TD-107 join, decisions §1.14) — ch17 `TwoPersonApproval` does not
   * exist. Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/core-loops')
  @UseGuards(requireStaffRole('admin'))
  async patchCoreLoopsTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = CORE_LOOPS_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown core-loops tunable key: '${key}'.`,
      });
    }

    const clampedValue = clampCoreLoopsTunableToRange(key, Number(value));

    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'core-loops-admin-c8',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'core-loops-admin-c8',
        },
      });

    // ★ Audit (R9.3 REUSE) — one admin_audit_log row per mutation. No `targetEntityId` (a dotted
    // tunable key is not a uuid) — the key travels in after_state instead (mirrors
    // `patchLiveOpsTunable`/`patchMetaMarketTunable`'s own "no uuid target" precedent).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'core_loops_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    return { key, clampedValue, f3_deferred: true };
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C10 ("BO surface + program-
//             wide R2.2/P5 sweep" — `meta-progression-admin.controller.ts`: design §12's 5 GET + force-close
//             POST + tunables PUT, `requireStaffRole('gm')`/`'admin'` split, `f3_deferred`,
//             `AdminAuditLogService`).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §12 (BO surface,
//             game-back `/v1/admin/*`, bo-front DIRECT — the 7-row endpoint table verbatim) + §13 (tunables
//             registry, `META_PROGRESSION_TUNABLE_CAPS`).
//             Pattern: `core_loops/core-loops-admin.controller.ts` (P3-A C8 — the closest sibling:
//             `requireStaffRole`, `f3_deferred` marker, `AdminAuditLogService.emit` convention, the
//             CAPS-clamp tunables PUT shape, the `sql<number>\`count(*)::int\`` aggregate idiom) +
//             `core_loops/supply_chain/supply-chain-admin.controller.ts#forceRouteCollapse` (the
//             pre-read-for-404/409 + atomic-conditional-UPDATE "force" mutation shape THIS controller's own
//             force-close route mirrors, delegated to `PromotionLockTickService.forceCloseWindow`) +
//             `core_loops/cue_stack/cue-annealing-admin.controller.ts` (the `limit`/`offset` paginated
//             cross-player timeline shape, REUSED verbatim for `GET meta/graduation-events`).
//             — P3-F C10 — 2026-07-19
//
// `MetaProgressionAdminController` — the 7 production BO routes for the P3-F ch06 Delegation Ratchet
// surface (design §12):
//
//   GET  /v1/admin/players/:id/task-categories     — role gm    — ★ THE P5 INVERSION: TRUE state per LIVE
//                                                                 category — raw mastery score, delegation
//                                                                 state, frozen proficiency, RAW recall
//                                                                 debt + its derived signal, recovery ticks
//                                                                 remaining, the ACTIVE lock's raw window
//                                                                 ticks + fallback bucket, recall scar. The
//                                                                 player-facing `GET /v1/meta/task-categories`
//                                                                 (`meta-progression.controller.ts`)
//                                                                 deliberately shows ONLY buckets/bands for
//                                                                 this EXACT same row — this is the BO-only
//                                                                 inversion of that wall.
//   GET  /v1/admin/meta/graduation-events           — role gm    — paginated append-only `graduation_events`
//                                                                 log, filters `playerId`/`categoryId`/`kind`.
//   GET  /v1/admin/meta/promotion-locks             — role gm    — `promotion_locks` rows + window
//                                                                 state/ticks + fallback buckets, filters
//                                                                 `playerId`/`state` (defaults to ACTIVE-only
//                                                                 — design "filter ACTIVE"; `state=ALL` opts
//                                                                 into every row incl. CLOSED history).
//   GET  /v1/admin/meta/mastery-distribution        — role gm    — bucket histogram per LIVE category
//                                                                 (NASCENT/LEARNING/PRACTICED/ELIGIBLE),
//                                                                 REUSING the REAL `deriveMasteryBucket`
//                                                                 (never a re-derived cut-point) — the
//                                                                 canon calibration surface.
//   GET  /v1/admin/meta/recall-metrics              — role gm    — per-category graduation/recall counts +
//                                                                 recall rate, PLUS the cross-player recall-
//                                                                 debt-signal distribution (REUSING the REAL
//                                                                 `deriveRecallDebtSignal`) + recoveries in
//                                                                 flight — canon miscalibration signals.
//   POST /v1/admin/meta/force-close-window/:lockId  — role admin, f3_deferred, audited — GM override:
//                                                                 force-closes an ACTIVE `promotion_locks`
//                                                                 row BEFORE its natural `window_end_tick`
//                                                                 deadline. `:lockId` — design §12's table
//                                                                 names the route without a param slot; every
//                                                                 sibling "force-X" mutation in this codebase
//                                                                 (`force-collapse`, `force-cascade`,
//                                                                 `force-failure`) puts the target entity id
//                                                                 in the URL — mirrored here, LOUD (not a
//                                                                 redesign, filling an unspecified param
//                                                                 placement the SAME way every precedent
//                                                                 does). Delegates to `PromotionLockTickService.
//                                                                 forceCloseWindow` — emits the SAME
//                                                                 `UnmanagedWindowClosedEvent` the HOURLY tick
//                                                                 emits (design §12). NOT gated by
//                                                                 `meta.retirement_lock_delay_h` (that getter
//                                                                 guards the SEPARATE, deferred
//                                                                 override-graduation/recall TD — design §12's
//                                                                 own "Blocked… n/a" notes column, see below).
//   PUT  /v1/admin/tunables/meta-progression        — role admin, f3_deferred, audited — registry
//                                                                 read-modify-write over `meta.*` keys,
//                                                                 CAPS-clamped (`META_PROGRESSION_TUNABLE_
//                                                                 CAPS`, `meta-progression-tunables.ts`).
//
// ★ "Blocked… n/a" (design §12 force-close-window Notes column, verbatim): design's own table entry reads
//   "Canon force-close; emits the SAME UnmanagedWindowClosedEvent. Blocked… n/a (lock-delay guards the
//   graduation-override TD — see below)." — i.e. `meta.retirement_lock_delay_h` (§13: "used_by (C12/BO):
//   the force-close-window/override-adjacent BO gate") is NOT this route's own gate; it guards the
//   SEPARATE deferred `POST override-graduation` TD (design §12's own next paragraph: "canon's POST
//   override-graduation (force graduate/recall) = deferred TD ... force-close covers the support-urgent
//   case" instead). This route is therefore UNGATED by that tunable — `f3_deferred`/`requireStaffRole
//   ('admin')` are its only gates, exactly as every other force-mutation in this codebase.
//
// P5 BO INVERSION (R2.2): `task-categories` above returns the RAW server-only scalars the player-facing
//   `MetaProgressionProjectionService.taskCategoryProjection` deliberately buckets away (design §11's own
//   forbidden list: `mastery_score`, `player_proficiency`, `recall_debt_total`, `window_start_tick`/
//   `window_end_tick`) — these are NEVER forwarded to any player-facing endpoint (the leak-scan
//   `ALLOWED_KEYS` allow-lists in `tests/e2e/meta_progression/*.spec.ts` prove the player side stays clean;
//   this file is the deliberate BO-only inversion of that same wall).
//
// F3 two-person-rule: DEFERRED (TD-107 join, decisions §1.14 precedent — "the honest marker, no invented
//   approval flow"). Both mutation endpoints (`force-close-window`, `tunables/meta-progression`) are gated
//   by `requireStaffRole('admin')` ONLY until F3 lands; their responses carry `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via server-side HS256
//   verification (`auth/staff-role.guard.ts`) — an `x-staff-role` header is NEVER read.
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): every mutation endpoint writes
//   exactly ONE `admin_audit_log` row per call — the acting staff `account_id` from the VERIFIED JWT, never
//   client-supplied. Every GET above is a read-only diagnostic and does NOT audit (mirrors every sibling BO
//   controller).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `DelegationRatchetModule.controllers` (alongside the conditional `DelegationRatchetTestController`).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { ApiError } from '../protocol/api-error';
import { requireStaffRole } from '../auth/staff-role.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { tunableOverrides } from '../db/schema/tunable_overrides';
import { masteryScore } from '../db/schema/player_progression_state';
import { graduationEvent, playerProficiency, promotionLock } from '../db/schema/delegation_ratchet';
import { TASK_CATEGORY_CATALOGUE, taskCategoryCatalogueEntryForCode } from './task-category-catalogue';
import { MasteryScoreRepository } from './mastery-score.repository';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { GraduationEventsRepository } from './graduation-events.repository';
import { PromotionLockTickService } from './promotion-lock-tick.service';
import { metaProgressionTunables, META_PROGRESSION_TUNABLE_CAPS, clampMetaProgressionTunableToRange } from './meta-progression-tunables';
import { deriveMasteryBucket, type MasteryBucket } from './mastery-bucket';
import { deriveRecallDebtSignal, type RecallDebtSignal } from './recall-debt-signal';

const CROSS_PLAYER_DEFAULT_LIMIT = 20;
const CROSS_PLAYER_MAX_LIMIT = 100;

/** REUSE the cue-annealing-admin's exact clamp shape (design §12's own "paginated" mandate for
 *  `graduation-events`) — never a re-derived pagination convention. */
function clampLimit(limitParam: string | undefined): number {
  const parsed = Number.parseInt(limitParam ?? '', 10);
  return Number.isNaN(parsed) ? CROSS_PLAYER_DEFAULT_LIMIT : Math.min(Math.max(parsed, 1), CROSS_PLAYER_MAX_LIMIT);
}

function clampOffset(offsetParam: string | undefined): number {
  const parsed = Number.parseInt(offsetParam ?? '', 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Response shapes (BO-only — raw, P5-inverted; never round-tripped through a player-facing type) ────

interface AdminTaskCategoryRow {
  categoryKey: string;
  categoryId: number;
  rawScore: number;
  delegationState: string;
  delegatedLieutenantId: string | null;
  graduatedAt: Date | null;
  frozenProficiency: number | null;
  recallDebtTotal: number | null;
  recallDebtSignal: RecallDebtSignal | null;
  recoveryPeriodRemaining: number | null;
  activeLock: {
    lockId: string;
    windowStartTick: number;
    windowEndTick: number;
    fallbackQualityBucket: string;
  } | null;
  recallScar: boolean;
}

// ─── Controller ──────────────────────────────────────────────────────────────────────────────────────

/**
 * `MetaProgressionAdminController` — production BO routes for the P3-F ch06 Delegation Ratchet surface
 * (design §12).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/task-categories`, `/v1/admin/meta/graduation-events`,
 * `/v1/admin/meta/promotion-locks`, `/v1/admin/meta/mastery-distribution`,
 * `/v1/admin/meta/recall-metrics`, `/v1/admin/meta/force-close-window/:lockId`,
 * `/v1/admin/tunables/meta-progression`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in `DelegationRatchetModule.controllers` (alongside the conditional
 * `DelegationRatchetTestController`).
 */
@Controller('admin')
export class MetaProgressionAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly auditLog: AdminAuditLogService,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly playerProficiencyRepo: PlayerProficiencyRepository,
    private readonly promotionLocksRepo: PromotionLocksRepository,
    private readonly graduationEventsRepo: GraduationEventsRepository,
    private readonly promotionLockTick: PromotionLockTickService,
  ) {}

  // ─── GET /admin/players/:id/task-categories — ★ THE P5 INVERSION (role `gm`) ──────────────────────────

  /**
   * `GET /v1/admin/players/:id/task-categories`
   *
   * TRUE state for EVERY LIVE `TaskCategoryCatalogue` row, for this player: raw `mastery_score.mastery_
   * score` (never bucketed here), `delegation_state`/`delegated_to_lieutenant_id`/`graduated_at`, the
   * FROZEN `player_proficiency.player_proficiency` (design §11's own forbidden field, present HERE), the
   * RAW `recall_debt_total` PLUS its derived `recallDebtSignal` (REUSE `deriveRecallDebtSignal` — the SAME
   * function the player-facing recall-preview consults, here fed the raw number too, not just the band),
   * `recovery_period_remaining` (raw session count), the ACTIVE `promotion_locks` row's RAW
   * `window_start_tick`/`window_end_tick`/`fallback_quality_bucket` (or `null` — no ACTIVE lock), and
   * `recall_scar` (the SAME derived bool the player projection also carries — a closed-domain flag is
   * honest either side, R2.2 never forbids a BOOLEAN flag, only the raw scalars named above).
   *
   * A player with NO row for a category still gets a full row at its honest zero-state defaults (mirrors
   * `MetaProgressionProjectionService.taskCategoryProjection`'s own "never lazy-seed, never sparse"
   * discipline — a real read against the catalogue's closed, enumerable LIVE set).
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/task-categories')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerTaskCategories(@Param('id') playerId: string): Promise<{ taskCategories: AdminTaskCategoryRow[] }> {
    const liveEntries = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
    const taskCategories = await Promise.all(
      liveEntries.map(async (entry): Promise<AdminTaskCategoryRow> => {
        const masteryRow = await this.masteryScoreRepo.getRow(playerId, entry.code);
        const proficiencyRow = await this.playerProficiencyRepo.getRow(playerId, entry.code);
        const activeLock = await this.promotionLocksRepo.findActiveForCategory(playerId, entry.code);
        const recallScar = await this.graduationEventsRepo.hasRecallEvent(playerId, entry.code);

        const recallDebtTotal = proficiencyRow?.recall_debt_total ?? null;
        const recallDebtSignal =
          recallDebtTotal === null ? null : deriveRecallDebtSignal(recallDebtTotal, metaProgressionTunables.recallDebtMax);

        return {
          categoryKey: entry.key,
          categoryId: entry.code,
          rawScore: masteryRow?.mastery_score ?? 0,
          delegationState: masteryRow?.delegation_state ?? 'SELF',
          delegatedLieutenantId: masteryRow?.delegated_to_lieutenant_id ?? null,
          graduatedAt: masteryRow?.graduated_at ?? null,
          frozenProficiency: proficiencyRow?.player_proficiency ?? null,
          recallDebtTotal,
          recallDebtSignal,
          recoveryPeriodRemaining: proficiencyRow?.recovery_period_remaining ?? null,
          activeLock: activeLock
            ? {
                lockId: activeLock.lock_id,
                windowStartTick: activeLock.window_start_tick,
                windowEndTick: activeLock.window_end_tick,
                fallbackQualityBucket: activeLock.fallback_quality_bucket,
              }
            : null,
          recallScar,
        };
      }),
    );
    return { taskCategories };
  }

  // ─── GET /admin/meta/graduation-events — paginated append-only log (role `gm`) ─────────────────────────

  /**
   * `GET /v1/admin/meta/graduation-events?playerId=&categoryId=&kind=&limit=&offset=`
   *
   * The append-only `graduation_events` spine (D13, BOTH directions GRADUATION|RECALL), newest-first,
   * paginated (`limit` default 20 / max 100, `offset` default 0 — REUSE `cue-annealing-admin.controller.ts`'s
   * exact clamp shape). Every optional filter is server-validated: `kind` must be `GRADUATION` or `RECALL`
   * (422 otherwise, never silently ignored); `categoryId` must parse as an int.
   *
   * Role: `gm` (canon audit endpoint, no mutation).
   */
  @Get('meta/graduation-events')
  @UseGuards(requireStaffRole('gm'))
  async getGraduationEvents(
    @Query('playerId') playerId: string | undefined,
    @Query('categoryId') categoryIdParam: string | undefined,
    @Query('kind') kindParam: string | undefined,
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
  ) {
    if (kindParam !== undefined && kindParam !== 'GRADUATION' && kindParam !== 'RECALL') {
      throw new ApiError('VALIDATION_FAILED', { message: `kind must be 'GRADUATION' or 'RECALL' (got '${kindParam}').` });
    }
    const categoryId = categoryIdParam !== undefined ? Number.parseInt(categoryIdParam, 10) : undefined;
    if (categoryIdParam !== undefined && Number.isNaN(categoryId)) {
      throw new ApiError('VALIDATION_FAILED', { message: `categoryId must be an integer (got '${categoryIdParam}').` });
    }
    const limit = clampLimit(limitParam);
    const offset = clampOffset(offsetParam);

    const conditions = [
      playerId ? eq(graduationEvent.player_id, playerId) : undefined,
      categoryId !== undefined ? eq(graduationEvent.category_id, categoryId) : undefined,
      kindParam ? eq(graduationEvent.event_kind, kindParam) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: totalRaw }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(graduationEvent).where(where);
    const total = Number(totalRaw);

    const rows = await this.db
      .select()
      .from(graduationEvent)
      .where(where)
      .orderBy(desc(graduationEvent.created_at))
      .limit(limit)
      .offset(offset);

    return {
      events: rows.map((r) => ({
        eventId: r.event_id,
        playerId: r.player_id,
        categoryId: r.category_id,
        categoryKey: taskCategoryCatalogueEntryForCode(r.category_id).key,
        eventKind: r.event_kind,
        lieutenantId: r.lieutenant_id,
        seedDecisionsN: r.seed_decisions_n,
        scriptSeedHash: r.script_seed_hash,
        masteryAtEvent: r.mastery_at_event,
        successorCategoryId: r.successor_category_id,
        reversalCost: r.reversal_cost,
        sessionRef: r.session_ref,
        gameTick: r.game_tick,
        createdAt: r.created_at,
      })),
      total,
      limit,
      offset,
    };
  }

  // ─── GET /admin/meta/promotion-locks — locks + window state/ticks (role `gm`) ──────────────────────────

  /**
   * `GET /v1/admin/meta/promotion-locks?playerId=&state=`
   *
   * `promotion_locks` rows with their RAW `window_start_tick`/`window_end_tick`/`fallback_quality_bucket`/
   * `reversal_cost`/`accord_degradation_applied`. `state` defaults `'ACTIVE'` (design §12's own "filter
   * ACTIVE" — the operationally urgent view); `state='ALL'` opts into every row including CLOSED history;
   * `state='CLOSED'` also accepted. Any other value → 422.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta/promotion-locks')
  @UseGuards(requireStaffRole('gm'))
  async getPromotionLocks(@Query('playerId') playerId: string | undefined, @Query('state') stateParam: string | undefined) {
    const state = stateParam ?? 'ACTIVE';
    if (state !== 'ACTIVE' && state !== 'CLOSED' && state !== 'ALL') {
      throw new ApiError('VALIDATION_FAILED', { message: `state must be 'ACTIVE', 'CLOSED', or 'ALL' (got '${state}').` });
    }

    const conditions = [
      playerId ? eq(promotionLock.player_id, playerId) : undefined,
      state !== 'ALL' ? eq(promotionLock.unmanaged_window_state, state) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db.select().from(promotionLock).where(where).orderBy(desc(promotionLock.created_at));

    return {
      locks: rows.map((r) => ({
        lockId: r.lock_id,
        playerId: r.player_id,
        categoryId: r.category_id,
        categoryKey: taskCategoryCatalogueEntryForCode(r.category_id).key,
        recalledLtId: r.recalled_lt_id,
        unmanagedWindowState: r.unmanaged_window_state,
        windowStartTick: r.window_start_tick,
        windowEndTick: r.window_end_tick,
        suspendedHigherOrderCategoryId: r.suspended_higher_order_category_id,
        fallbackQualityBucket: r.fallback_quality_bucket,
        reversalCost: r.reversal_cost,
        accordDegradationApplied: r.accord_degradation_applied,
        closedAt: r.closed_at,
        createdAt: r.created_at,
      })),
    };
  }

  // ─── GET /admin/meta/mastery-distribution — bucket histogram (role `gm`) ───────────────────────────────

  /**
   * `GET /v1/admin/meta/mastery-distribution`
   *
   * For every LIVE category: a `MasteryBucket` histogram (`NASCENT`/`LEARNING`/`PRACTICED`/`ELIGIBLE`)
   * across EVERY player with a `mastery_score` row for it. Buckets are derived via the REAL
   * `deriveMasteryBucket(rawScore, threshold)` (the SAME function the player projection and
   * `GraduationService.validateGraduationEligible` both consult — never a re-derived cut-point), fed the
   * LIVE `meta.mastery_retirement_threshold` getter (hot-reload safe, mirrors `getExceptionMetrics`'s own
   * "fetch rows in bulk + bucket in JS with the REAL production function" idiom, `core-loops-admin.
   * controller.ts`). The canon "calibration" surface.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta/mastery-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getMasteryDistribution() {
    const liveEntries = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
    const threshold = metaProgressionTunables.masteryRetirementThreshold;

    const distributions = await Promise.all(
      liveEntries.map(async (entry) => {
        const rows = await this.db
          .select({ mastery_score: masteryScore.mastery_score })
          .from(masteryScore)
          .where(eq(masteryScore.category_id, entry.code));

        const histogram: Record<MasteryBucket, number> = { NASCENT: 0, LEARNING: 0, PRACTICED: 0, ELIGIBLE: 0 };
        for (const row of rows) {
          const bucket = deriveMasteryBucket(row.mastery_score, threshold);
          histogram[bucket] += 1;
        }

        return { categoryKey: entry.key, categoryId: entry.code, histogram, totalPlayers: rows.length };
      }),
    );

    return { distributions };
  }

  // ─── GET /admin/meta/recall-metrics — recall rate + debt-signal distribution (role `gm`) ──────────────

  /**
   * `GET /v1/admin/meta/recall-metrics`
   *
   * Per LIVE category: `graduationCount`/`recallCount` (from the REAL `graduation_events` append-only log,
   * `event_kind` GROUP BY) + the derived `recallRate` (`recallCount/graduationCount`, `0` when
   * `graduationCount === 0` — never a `NaN`, the honest "no graduations yet" reading). PLUS a cross-player
   * `debtSignalDistribution` (`LOW`/`MEDIUM`/`HIGH`, REUSE `deriveRecallDebtSignal` fed the LIVE `meta.
   * recall_debt_max` getter — never a re-derived fraction) and `recoveriesInFlight` (every `player_
   * proficiency` row with `recovery_period_remaining > 0`) over EVERY `player_proficiency` row — the canon
   * "recoveries in flight" miscalibration signal.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta/recall-metrics')
  @UseGuards(requireStaffRole('gm'))
  async getRecallMetrics() {
    const liveEntries = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);

    const kindRows = await this.db
      .select({ categoryId: graduationEvent.category_id, kind: graduationEvent.event_kind, count: sql<number>`count(*)::int` })
      .from(graduationEvent)
      .groupBy(graduationEvent.category_id, graduationEvent.event_kind);

    const perCategory = liveEntries.map((entry) => {
      const graduationCount = Number(kindRows.find((r) => r.categoryId === entry.code && r.kind === 'GRADUATION')?.count ?? 0);
      const recallCount = Number(kindRows.find((r) => r.categoryId === entry.code && r.kind === 'RECALL')?.count ?? 0);
      const recallRate = graduationCount > 0 ? recallCount / graduationCount : 0;
      return { categoryKey: entry.key, categoryId: entry.code, graduationCount, recallCount, recallRate };
    });

    const proficiencyRows = await this.db
      .select({ recall_debt_total: playerProficiency.recall_debt_total, recovery_period_remaining: playerProficiency.recovery_period_remaining })
      .from(playerProficiency);

    const cap = metaProgressionTunables.recallDebtMax;
    const debtSignalDistribution: Record<RecallDebtSignal, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    let recoveriesInFlight = 0;
    for (const row of proficiencyRows) {
      debtSignalDistribution[deriveRecallDebtSignal(row.recall_debt_total, cap)] += 1;
      if (row.recovery_period_remaining > 0) recoveriesInFlight += 1;
    }

    return { perCategory, debtSignalDistribution, recoveriesInFlight };
  }

  // ─── POST /admin/meta/force-close-window/:lockId — GM override (role `admin`, F3 DEFERRED, audited) ────

  /**
   * `POST /v1/admin/meta/force-close-window/:lockId`
   *
   * `:lockId` = `promotion_locks.lock_id`. Unknown lock → 404. Already `CLOSED` → 409 (nothing to force —
   * mirrors `forceRouteCollapse`'s own pre-read-then-atomic-conditional-UPDATE shape). Otherwise drives the
   * REAL winner-gate UPDATE (`PromotionLockTickService.forceCloseWindow` → `PromotionLocksRepository.
   * forceCloseLock`) and emits the SAME `UnmanagedWindowClosedEvent` the HOURLY tick emits (design §12).
   * TOCTOU-zero: a genuine concurrent transition between the pre-read and the atomic UPDATE (the HOURLY
   * tick winning the race) reports the SAME 409 the pre-read check would have given — this request did NOT
   * cause the close, so it never claims credit for (or double-audits) a transition it did not win.
   *
   * Returns: `{ lockId, playerId, categoryId, state: 'CLOSED', f3_deferred: true }`. Role: `admin`.
   */
  @Post('meta/force-close-window/:lockId')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join, decisions §1.14 precedent).
  @UseGuards(requireStaffRole('admin'))
  async forceCloseWindow(@Param('lockId') lockId: string, @Req() req: RequestWithAccount) {
    const [preRead] = await this.db
      .select({ state: promotionLock.unmanaged_window_state })
      .from(promotionLock)
      .where(eq(promotionLock.lock_id, lockId))
      .limit(1);
    if (!preRead) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such promotion lock: ${lockId}.` });
    }
    if (preRead.state !== 'ACTIVE') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `promotion lock ${lockId} is already CLOSED.` });
    }

    const closed = await this.promotionLockTick.forceCloseWindow(lockId);
    if (!closed) {
      // A concurrent transition (the HOURLY tick, or a duplicate force-close) won the race between the
      // pre-read above and the atomic UPDATE — the SAME honest 409, never a claim of credit (see header).
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `promotion lock ${lockId} is already CLOSED.` });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: closed.playerId,
      targetEntityType: 'promotion_lock',
      targetEntityId: lockId,
      beforeState: { state: 'ACTIVE' },
      afterState: { state: 'CLOSED', categoryId: closed.categoryId },
    });

    return { lockId: closed.lockId, playerId: closed.playerId, categoryId: closed.categoryId, state: 'CLOSED' as const, f3_deferred: true as const };
  }

  // ─── PUT /admin/tunables/meta-progression — registry edit (role `admin`, F3 DEFERRED, audited) ─────────

  /**
   * `PUT /v1/admin/tunables/meta-progression`
   *
   * Meta-progression tunable edit: upserts a `meta.*` override into the EXISTING `tunable_overrides` table
   * (the SAME mechanism every other admin controller uses — REUSE, never a new override path;
   * `TunablesStore` auto-reloads via the `tunables_changed` LISTEN channel). Allowed keys:
   * `META_PROGRESSION_TUNABLE_CAPS` (`meta-progression-tunables.ts` — 11 numeric keys).
   *
   * Body: `{ key: string, value: number }`. Returns: `{ key, clampedValue, f3_deferred: true }`.
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range
   * (`clampMetaProgressionTunableToRange`) — an out-of-range value is CLAMPED, never rejected (mirrors
   * `patchCoreLoopsTunable`'s exact contract).
   *
   * F3 two-person-rule DEFERRED (TD-107 join, decisions §1.14 precedent) — ch17 `TwoPersonApproval` does
   * not exist. Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/meta-progression')
  @UseGuards(requireStaffRole('admin'))
  async patchMetaProgressionTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = META_PROGRESSION_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', { message: `Unknown meta-progression tunable key: '${key}'.` });
    }

    const clampedValue = clampMetaProgressionTunableToRange(key, Number(value));

    await this.db
      .insert(tunableOverrides)
      .values({ key, value: String(clampedValue), updated_at: sql`now()`, updated_by: 'meta-progression-admin-c10' })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: { value: String(clampedValue), updated_at: sql`now()`, updated_by: 'meta-progression-admin-c10' },
      });

    // ★ Audit (R9.3 REUSE) — one admin_audit_log row per mutation. No `targetEntityId` (a dotted tunable
    // key is not a uuid) — the key travels in after_state instead (mirrors `patchCoreLoopsTunable`'s own
    // "no uuid target" precedent).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'meta_progression_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    return { key, clampedValue, f3_deferred: true };
  }
}

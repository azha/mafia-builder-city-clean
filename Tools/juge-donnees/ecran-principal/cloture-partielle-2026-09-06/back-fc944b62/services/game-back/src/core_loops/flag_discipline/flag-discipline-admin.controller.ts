// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C7 (BO surface — 5 admin
//             endpoints, role-gated, audited, f3_deferred mutations)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §9 (D14 — BO
//             surface, game-back `/v1/admin/*`, bo-front DIRECT) + the 5-row endpoint table.
//             Decisions: §1.14 D14 (BO topology continuity — DD-C6/P3-A D14/04f-A D12 all transpose the
//             ch05 doc's "NestJS — backend backoffice" placement the SAME way; a NEW, SEPARATE
//             `PUT /v1/admin/tunables/flag-discipline` — own CAPS map — rather than widening the P3-A
//             `PUT /v1/admin/tunables/core-loops` key surface, keeping the two lots' admin walls
//             independent and the 04f-B merge trivial).
//             Canon: docs/tech/05_player_core_loops/flag_discipline.md:137-143 ("NestJS — backend
//             backoffice", 5 endpoints, canon role `ops` transposed to `gm`/`admin` per D14 — the SAME
//             P3-A/04f-A transposition).
//             Pattern: services/game-back/src/core_loops/core-loops-admin.controller.ts (P3-A C8 — the
//             closest sibling: `requireStaffRole`, `f3_deferred` marker, raw-listing GET shape, both-
//             catalogue-free RAW response, `AdminAuditLogService.emit` convention, direct schema reads
//             rather than a cross-module import to dodge the SAME module-cycle hazard) +
//             .../maintenance/maintenance-admin.controller.ts (04f-A C8 — the force-mutation +
//             CAPS-clamped tunables-PUT shape, `f3_deferred` per-mutation).
//             — P3-B C7 — 2026-07-11
//
// `FlagDisciplineAdminController` — the 5 production BO routes for the ch05 Loop 2 surface (D14):
//
//   GET  /v1/admin/players/:id/flag-discipline-stats      — role gm    — per-lieutenant RAW: tokens +
//                                                                        flag/validation/dismissal rates +
//                                                                        ConvergenceBucket + tenure bucket.
//   GET  /v1/admin/lieutenants/:id/flag-history            — role gm    — full raw `flagged_items` history
//                                                                        (canon "diagnostic balance").
//   GET  /v1/admin/flag-discipline/token-exhaustion-events  — role gm    — payload-tag projection over
//                                                                        `exception_queue` (D9 — no new
//                                                                        table; `source: 'FLAG_TOKEN_
//                                                                        EXHAUSTION'`).
//   POST /v1/admin/lieutenants/:id/force-token-reset        — role admin, f3_deferred, audited — atomic
//                                                                        set-to-max (D8 statement family).
//   PUT  /v1/admin/tunables/flag-discipline                 — role admin, f3_deferred, audited — registry
//                                                                        read-modify-write, CAPS-clamped.
//
// P5 BO INVERSION (R2.2): `flag-discipline-stats`/`flag-history` return the RAW `credibility_tokens`/
//   `deviation_score_internal`/`tenure_score` scalars the player-facing surfaces (`flag-discipline.
//   controller.ts` GET /v1/flag-review, `lieutenant.projection.service.ts`) deliberately band away
//   (`TrustBudgetBucket`/qualitative flag_reason/`tenure_bucket`) — NEVER forwarded to any player-facing
//   endpoint (the `flag_review_surface.spec.ts`/`lieutenant_projection.spec.ts` leak-scan ALLOWED_KEYS
//   whitelists prove the player side stays clean; this file is the deliberate BO-only inversion of that
//   same wall — same discipline as `core-loops-admin.controller.ts`'s own header).
//
// F3 two-person-rule: DEFERRED (TD-107 join, decisions §1.14/§5 "TD-107 ext" — "+2 f3_deferred mutations
//   (force-token-reset, flag tunables PUT) join the two-person ledger", the honest marker, no invented
//   approval flow). The 2 mutation endpoints (`forceTokenReset`/`patchFlagDisciplineTunable`) are gated
//   by `requireStaffRole('admin')` ONLY until F3 lands; their responses carry `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: admin` header WITHOUT a valid bearer token → 401; a valid PLAYER (or wrong-role STAFF)
//   token → 403 — even when presented ALONGSIDE a spoofed header (the header is never read).
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): each of the 2 mutation
//   endpoints writes exactly one `admin_audit_log` row — the acting staff `account_id` from the VERIFIED
//   JWT, never client-supplied. The 3 GET endpoints are read-only diagnostics and do NOT audit (mirrors
//   every sibling BO controller).
//
// DIRECT SCHEMA READS (no cross-module import): the exhaustion-events projection reads `exception_queue`
//   (`queues_exceptions_cuestack.ts`) DIRECTLY via the injected `DB` client rather than importing
//   `ExceptionsModule`'s repository — `FlagDisciplineModule` already imports `ExceptionsModule` (the C4
//   fallback-insert seam) so no NEW module edge is introduced either way, but reading the schema table
//   directly here mirrors `core-loops-admin.controller.ts`'s OWN "read the schema table directly rather
//   than reach for a heavier cross-module service" discipline (that file's header explains the module-
//   cycle hazard this avoids).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `FlagDisciplineModule.controllers` (the file lives in THIS module per plan §C7's literal path, unlike
// P3-A's/04f-A's own admin controllers which sit in their chapter's cross-cutting `core_loops/`/
// `maintenance/` home — DD-P2 names `flag_discipline/` as this lot's own admin-controller home).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { bucketForStreak, type TenureInertiaBucketComposite } from '../../operational/lieutenant/tenure-inertia';
import { lieutenantTunables } from '../../operational/lieutenant/lieutenant-tunables';
import { ROLE_CATALOGUE_ORDER } from '../../operational/lieutenant/lieutenant-archetype';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { FlagConvergenceService } from './flag-convergence.service';
import {
  flagDisciplineTunables,
  FLAG_DISCIPLINE_TUNABLE_CAPS,
  clampFlagDisciplineTunableToRange,
} from './flag-discipline-tunables';
import { FLAG_TOKEN_EXHAUSTION_SOURCE } from './flag-exhaustion-fallback.service';

/** `role_id` (int, 04a canonical catalogue) → its human name — REUSE `ROLE_CATALOGUE_ORDER`
 *  (`lieutenant-archetype.ts`, the SAME 1-based canonical order D6/D14's own endpoint table names
 *  verbatim: "Courier coordinator" etc.) — never a bare int in this BO surface without its resolved
 *  name alongside it (the hard rule this chunk's controller/SFCs honor, mirrors `core-loops-admin.
 *  controller.ts`'s own both-catalogue-label discipline for `decision_type`). Defensive fallback for
 *  an out-of-catalogue id (should never happen — role_id is always 1..15 in this codebase).
 */
function roleNameForId(roleId: number): string {
  return ROLE_CATALOGUE_ORDER[roleId - 1] ?? `Unknown role (#${roleId})`;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Response shapes (BO-only — raw, P5-inverted; never round-tripped through a player-facing type) ──

interface AdminLieutenantFlagStatsRow {
  lieutenantId: string;
  name: string;
  roleId: number;
  /** Never rendered as a bare int in the BO surface — always alongside `roleId` (REUSE `ROLE_CATALOGUE_ORDER`). */
  roleName: string;
  tokens: number;
  maxTokens: number;
  tenureScore: number;
  tenureBucket: TenureInertiaBucketComposite;
  flagsRaisedTotal: number;
  flagsPending: number;
  flagsValidated: number;
  flagsDismissed: number;
  flagsTimedOut: number;
  routineItemsTotal: number;
  flagRate: number;
  validationRate: number;
  dismissalRate: number;
  convergenceBucket: string;
  convergenceSample: number;
  convergenceDismissedCount: number;
  /** Canon "tenure × flag frequency analysis" (`<LieutenantConvergencePatterns>`, `flag_discipline.md:148`)
   *  — the SAME last-7-game-day window `FlagConvergenceService.frequencyBandForLieutenant` already
   *  derives for the player-facing lieutenant projection (C6), re-derived here (not re-forked) for the
   *  BO diagnostic's own per-lieutenant row. */
  flagFrequencyBand: string;
  flagFrequencyCount: number;
}

interface AdminExhaustionEventRow {
  exceptionId: string;
  playerId: string;
  lieutenantId: string | null;
  eventDescriptor: string;
  confidence: number;
  severity: number;
  priority: number;
  resolutionStatus: 'pending' | 'resolved' | 'escalated' | 'aged_out';
  emittedAt: Date;
  resolvedAt: Date | null;
}

// ─── Controller ────────────────────────────────────────────────────────────────

/**
 * `FlagDisciplineAdminController` — production BO routes for the ch05 Loop 2 Flag Discipline surface
 * (D14).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/flag-discipline-stats`, `/v1/admin/lieutenants/:id/flag-history`,
 * `/v1/admin/flag-discipline/token-exhaustion-events`, `/v1/admin/lieutenants/:id/force-token-reset`,
 * `/v1/admin/tunables/flag-discipline`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in `FlagDisciplineModule.controllers`.
 */
@Controller('admin')
export class FlagDisciplineAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: FlagDisciplineRepository,
    private readonly convergence: FlagConvergenceService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/players/:id/flag-discipline-stats — per-lieutenant RAW (role `gm`) ───────────────

  /**
   * `GET /v1/admin/players/:id/flag-discipline-stats`
   *
   * P5 BO INVERSION: every lieutenant this player holds, each row carrying the RAW `credibility_tokens`
   * (never `TrustBudgetBucket`-banded here), the RAW `tenure_score` PLUS its derived `tenure_bucket`
   * (the SAME `bucketForStreak` seam the player-facing projection already surfaces the bucket name
   * through — never a NEW leak, `lieutenant.projection.service.ts`'s own header), the ALL-TIME flag
   * resolution breakdown (`flagsPending`/`flagsValidated`/`flagsDismissed`/`flagsTimedOut`) plus 3
   * derived rates (canon "flag rates + validation rates" — `flag_discipline.md:139`): `flagRate` =
   * flags raised / routine items generated (0 when no routine items exist yet — L1 honest, never a
   * division-by-zero path), `validationRate`/`dismissalRate` = validated-or-dismissed share of the
   * RESOLVED subset (excludes still-`pending` — no verdict yet to rate; 0 when nothing has resolved
   * yet), and the `ConvergenceBucket` (`FlagConvergenceService.evaluateConvergenceForLieutenant` — the
   * SAME windowed formula C5/C6 already drive, never re-derived here).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). No lieutenants for this player → `lieutenants: []`
   * (L1 honest — mirrors `getCriticalBuildings`'s own empty-fleet convention, never a 404 for a
   * player-scoped diagnostic).
   */
  @Get('players/:id/flag-discipline-stats')
  @UseGuards(requireStaffRole('gm'))
  async getFlagDisciplineStats(@Param('id') playerId: string) {
    const gameMinute = await this.repo.getCurrentTick(playerId);
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;

    const lieutenants = await this.repo.listLieutenantsForPlayer(playerId);
    const rows: AdminLieutenantFlagStatsRow[] = [];
    for (const lt of lieutenants) {
      const tokens = (await this.repo.getTokensForLieutenant(lt.lieutenant_id)) ?? maxTokens;
      const tenureBucket = bucketForStreak(lt.tenure_score, lieutenantTunables.tenureInertia.thresholds);
      const counts = await this.repo.getFlagResolutionCountsForLieutenant(lt.lieutenant_id);
      const routineItemsTotal = await this.repo.countRoutineItemsForLieutenant(lt.lieutenant_id);
      const resolvedTotal = counts.validated + counts.dismissed + counts.timedOut;
      const convergenceResult = await this.convergence.evaluateConvergenceForLieutenant(lt.lieutenant_id, currentGameDay);
      const frequencyResult = await this.convergence.frequencyBandForLieutenant(lt.lieutenant_id, currentGameDay);

      rows.push({
        lieutenantId: lt.lieutenant_id,
        name: lt.name,
        roleId: lt.role_id,
        roleName: roleNameForId(lt.role_id),
        tokens,
        maxTokens,
        tenureScore: lt.tenure_score,
        tenureBucket,
        flagsRaisedTotal: counts.total,
        flagsPending: counts.pending,
        flagsValidated: counts.validated,
        flagsDismissed: counts.dismissed,
        flagsTimedOut: counts.timedOut,
        routineItemsTotal,
        flagRate: routineItemsTotal > 0 ? counts.total / routineItemsTotal : 0,
        validationRate: resolvedTotal > 0 ? counts.validated / resolvedTotal : 0,
        dismissalRate: resolvedTotal > 0 ? counts.dismissed / resolvedTotal : 0,
        convergenceBucket: convergenceResult.bucket,
        convergenceSample: convergenceResult.sample,
        convergenceDismissedCount: convergenceResult.dismissedCount,
        flagFrequencyBand: frequencyResult.band,
        flagFrequencyCount: frequencyResult.count,
      });
    }

    return { playerId, currentGameDay, lieutenants: rows };
  }

  // ─── GET /admin/lieutenants/:id/flag-history — full raw history (role `gm`) ───────────────────────

  /**
   * `GET /v1/admin/lieutenants/:id/flag-history`
   *
   * P5 BO INVERSION: every `flagged_items` row this lieutenant ever raised, newest-flagged-first, RAW
   * `deviation_score_internal` included (canon "full flag history per lieutenant. Diagnostic balance.",
   * `flag_discipline.md:140`) — never filtered by resolution (`pending`/`validated`/`dismissed`/
   * `timed_out` all included). `generator` (the closed 5-member registry domain, e.g.
   * `'COURIER_SCHEDULING'`) is included raw — never a bare classification with no provenance (the hard
   * rule this chunk honors); `null` when the source `routine_items` row was pruned past retention (D4).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). Unknown/never-flagging lieutenant → `history: []`
   * (L1 honest — no 404; mirrors `getFlagDisciplineStats`'s own empty-diagnostic convention).
   */
  @Get('lieutenants/:id/flag-history')
  @UseGuards(requireStaffRole('gm'))
  async getLieutenantFlagHistory(@Param('id') lieutenantId: string) {
    const rows = await this.repo.listFlagHistoryForLieutenant(lieutenantId);
    const history = rows.map((r) => ({
      flagId: r.flag_id,
      playerId: r.player_id,
      routineItemId: r.routine_item_id,
      routineItemDescriptor: r.routine_item_descriptor,
      flagReason: r.flag_reason,
      generator: r.generator,
      deviationScoreInternal: r.deviation_score_internal,
      emittedTick: r.emitted_tick,
      gameDay: r.game_day,
      flaggedAt: r.flagged_at,
      resolution: r.resolution,
      tokenReturned: r.token_returned,
      resolvedAt: r.resolved_at,
      resolvedAtTick: r.resolved_at_tick,
    }));
    return { lieutenantId, history };
  }

  // ─── GET /admin/flag-discipline/token-exhaustion-events — payload-tag projection (role `gm`) ──────

  /**
   * `GET /v1/admin/flag-discipline/token-exhaustion-events`
   *
   * Recent D9 exhaustion-fallback cards (canon "recent token exhaustion fallbacks to Exception",
   * `flag_discipline.md:141`) — a PROJECTION over `exception_queue` (no new table, design §9): every row
   * whose FIRST candidate action carries `source: 'FLAG_TOKEN_EXHAUSTION'` (the payload-tag idiom
   * `flag-exhaustion-fallback.service.ts`'s own header names for THIS exact endpoint — BOTH of that
   * service's 2 candidate actions stamp the tag, so index-0 suffices, never a per-element
   * `jsonb_array_elements` scan). Cross-player (BO-wide), newest-emitted-first.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('flag-discipline/token-exhaustion-events')
  @UseGuards(requireStaffRole('gm'))
  async getTokenExhaustionEvents() {
    const rows = await this.db
      .select()
      .from(exceptionQueueRow)
      .where(sql`${exceptionQueueRow.candidate_actions} -> 0 ->> 'source' = ${FLAG_TOKEN_EXHAUSTION_SOURCE}`)
      .orderBy(desc(exceptionQueueRow.emitted_at));

    const events: AdminExhaustionEventRow[] = rows.map((r) => ({
      exceptionId: r.exception_id,
      playerId: r.player_id,
      lieutenantId: r.lieutenant_id,
      eventDescriptor: r.event_descriptor,
      confidence: r.confidence,
      severity: r.severity,
      priority: r.priority,
      resolutionStatus: r.resolution_status,
      emittedAt: r.emitted_at,
      resolvedAt: r.resolved_at,
    }));
    return { events };
  }

  // ─── POST /admin/lieutenants/:id/force-token-reset — atomic set-to-max (role `admin`, F3 DEFERRED) ─

  /**
   * `POST /v1/admin/lieutenants/:id/force-token-reset`
   *
   * Live-ops force reset (canon "live-ops force token reset (testing)", `flag_discipline.md:142`):
   * `FlagDisciplineRepository.forceResetTokensToMax` — ONE atomic UPSERT (the D8 "reset to max regardless
   * of recent burns" statement family, file header). Unknown lieutenant → 404 (checked via a SEPARATE
   * existence read BEFORE the write — mirrors `getOwnedFlag`-then-`resolveFlagTransition`'s own
   * "existence check first, atomic write second" shape).
   *
   * Returns: { lieutenantId, tokens, maxTokens, f3_deferred: true }
   * F3 two-person-rule DEFERRED (TD-107 ext, decisions §5). Role: `admin`.
   */
  @Post('lieutenants/:id/force-token-reset')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 ext carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceTokenReset(@Param('id') lieutenantId: string, @Req() req: RequestWithAccount) {
    const found = await this.repo.getLieutenantForAdmin(lieutenantId);
    if (!found) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant: ${lieutenantId}.` });
    }

    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    const tokensBefore = await this.repo.getTokensForLieutenant(lieutenantId);
    const tokens = await this.repo.forceResetTokensToMax(lieutenantId, found.player_id, maxTokens);

    // ★ D14/R9.3 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'lieutenant_flag_state',
      targetEntityId: lieutenantId,
      beforeState: { tokens: tokensBefore ?? maxTokens },
      afterState: { tokens },
    });

    return { lieutenantId, tokens, maxTokens, f3_deferred: true };
  }

  // ─── PUT /admin/tunables/flag-discipline — registry edit (role `admin`, F3 DEFERRED, audited) ─────

  /**
   * `PUT /v1/admin/tunables/flag-discipline`
   *
   * Flag-discipline tunable edit (canon `PUT /admin/tunables/flag_discipline`, `flag_discipline.md:143`):
   * upserts a `core_loops.flag_*` override into the EXISTING `tunable_overrides` table (the SAME
   * mechanism every other admin controller uses — REUSE, never a new override path; `TunablesStore`
   * auto-reloads via the `tunables_changed` LISTEN channel). A SEPARATE endpoint/CAPS map from P3-A's
   * `PUT /v1/admin/tunables/core-loops` (decisions §1.14 — keeps the two lots' admin walls independent,
   * the 04f-B merge trivial).
   *
   * Allowed keys: `FLAG_DISCIPLINE_TUNABLE_CAPS` (`flag-discipline-tunables.ts` — 22 numeric keys).
   *
   * Body: { key: string, value: number }. Returns: { key, clampedValue, f3_deferred: true }.
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range
   * (`clampFlagDisciplineTunableToRange`) — an out-of-range value is CLAMPED, never rejected.
   *
   * F3 two-person-rule DEFERRED (TD-107 ext, decisions §5 — "+2 f3_deferred mutations ... join the
   * two-person ledger"). Role: `admin`.
   */
  @Put('tunables/flag-discipline')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 ext carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchFlagDisciplineTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = FLAG_DISCIPLINE_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', { message: `Unknown flag-discipline tunable key: '${key}'.` });
    }

    const clampedValue = clampFlagDisciplineTunableToRange(key, Number(value));

    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'flag-discipline-admin-c7',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'flag-discipline-admin-c7',
        },
      });

    // ★ D14/R9.3 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'flag_discipline_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    return { key, clampedValue, f3_deferred: true };
  }
}

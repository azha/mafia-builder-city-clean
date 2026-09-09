// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C7 (D14 — the BO surface, 5
//             game-back admin endpoints `requireStaffRole` + `f3_deferred` + audit)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §11 (BO surface — the
//             5-endpoint table + the RAW read shape + the force-endpoint "not a row poke" contract)
//             Canon: docs/tech/04f_maintenance_decay_recruitment/lieutenant_recruitment_quests.md §NestJS —
//             backend backoffice (the BO surface, `/:regionId` transposed per-player, D14).
//             Pattern: services/game-back/src/operational/maintenance/maintenance-admin.controller.ts
//             (04f-A C8 — the EXACT sibling: same 5-endpoint shape, same `requireStaffRole`/`f3_deferred`/
//             `AdminAuditLogService.emit` topology) — REUSE the DD-C6/R12b BO topology verbatim (game-back
//             `/v1/admin/*`, bo-front-DIRECT).
//             — 04f-B C7 — 2026-07-12
//
// `RecruitmentAdminController` — BO production routes for the 04f-B lieutenant-recruitment-quests system
// (G11).
//
// Routes (5 endpoints — design §11 literal path shape):
//   GET  /v1/admin/players/:id/recruitment-quests            — role gm    — RAW true-state (P5 BO inversion)
//   GET  /v1/admin/players/:id/recruitment/candidate-pools    — role gm    — per-pool availability
//   POST /v1/admin/recruitment/force-defector-trigger         — role admin — F3 DEFERRED — drives the REAL
//                                                                 D8 candidate-content path
//   POST /v1/admin/recruitment/force-civilian-candidate       — role admin — F3 DEFERRED — drives the REAL
//                                                                 D7 candidate-content path
//   PUT  /v1/admin/tunables/recruitment                        — role admin — F3 DEFERRED — CAPS-clamped
//                                                                 upsert
//
// P5 BO INVERSION (R2.2): the player-facing `QuestProjection` (`RecruitmentQuestService.projectQuest`,
// C2/C5) NEVER carries `hire_quality_bucket`, `expected_outcome`, `double_agent`, or the D9 vetting
// internals (`detected`/`session_n` — stripped by `sanitizeDecisionsForProjection`). This controller's
// `getRecruitmentQuests` is the P5-inverted sibling: it returns the RAW `recruitment_quests` rows exactly
// as persisted (`RecruitmentRepository.listQuests` — the SAME rows `RecruitmentQuestService` reads before
// projecting them down) — an ops diagnostic/BO surface, never forwarded to players. This chunk touches
// NEITHER `recruitment-quest.service.ts`'s projection methods NOR `recruitment.controller.ts` (the player
// surface) — the existing D9 leak-scan floor (`recruitment_defector_depth.spec.ts`, unchanged) is the proof
// those stay masked; THIS chunk's own floor cross-checks the SAME quest through both surfaces.
//
// FORCE ENDPOINTS = "not a row poke" (design §11): `force-defector-trigger`/`force-civilian-candidate`
// call the REAL `DefectorRecruitmentService.buildCandidateRow`/`CivilianRecruitmentService.buildCandidateRow`
// — the EXACT seeded-profile-generation methods `RecruitmentAvailabilityTickService`'s own NIGHTLY/23 D8/D7
// scan calls — never a fabricated/hand-shaped row. A FORCE deliberately BYPASSES the natural D8/D7
// eligibility gate (regime ∈ {bleeding, retrench} / the affinity predicate) — that IS the point of a
// live-ops force (surface a candidate the organic tick would not have surfaced YET) — but still respects
// the SAME dedup invariant the tick enforces (one live candidate per rival/citizen, `RecruitmentRepository.
// listActiveDefectorSourceRivalKeys`/`listActiveCivilianCitizenIds`): a rival/citizen already carrying a
// non-terminal candidate → 409 (never a duplicate row), mirroring `forceFailBuilding`'s own "only an
// operational building is forceable (409 otherwise)" guarded-op idiom. The target rival/citizen must also
// be REAL (`rivalExists`/`getCitizenForPlayer` — 404 otherwise, never an arbitrary caller string surfacing
// as a candidate).
//
// F3 two-person-rule: DEFERRED (TD-107 — this route is not wired to the ch17 `TwoPersonApproval` workflow). Same precedent as
//   `MaintenanceAdminController`/`LiveOpsAdminController`/`PoliticalAdminController`. The 3 mutation
//   endpoints are gated by `requireStaffRole('admin')` ONLY until F3 lands — each response carries
//   `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: admin` header WITHOUT a valid bearer token → 401. A valid PLAYER (or wrong-role STAFF)
//   token → 403, EVEN when a spoofed `x-staff-role` header rides alongside it (role is read from the
//   VERIFIED JWT claim only — the header is never consulted anywhere in `staff-role.guard.ts`).
//
// ★ AUDIT (D14, REUSE `AdminAuditLogService.emit` — the ch09 `admin_audit_log` table): every MUTATION
//   endpoint below (`forceDefectorTrigger`/`forceCivilianCandidate`/`patchRecruitmentTunable`) writes ONE
//   `admin_audit_log` row — the acting staff account_id (from the VERIFIED JWT, never client-supplied),
//   the action type, the targeted entity, and a before/after snapshot. The 2 GET endpoints
//   (`getRecruitmentQuests`/`getCandidatePools`) are read-only diagnostics and do NOT audit (mirrors every
//   sibling BO controller: only mutations are audited).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in RecruitmentModule.controllers (alongside conditional RecruitmentTestController).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import type { RecruitmentCandidateRow } from '../../db/schema/recruitment';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { RecruitmentRepository } from './recruitment.repository';
import { DefectorRecruitmentService } from './defector-recruitment.service';
import { CivilianRecruitmentService } from './civilian-recruitment.service';
import { RECRUITMENT_TUNABLE_CAPS, clampRecruitmentTunableToRange } from './recruitment-tunables';

interface ForceDefectorBody {
  player_id?: string;
  rival_key?: string;
}

interface ForceCivilianBody {
  player_id?: string;
  citizen_id?: string;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

/** One pool's BO availability breakdown (`getCandidatePools`) — `available` mirrors the player-facing
 *  candidate shape (RAW — no R2.2 projection applies to a BO surface, P5 inversion); `status_counts` is
 *  the FULL lifecycle distribution (`available|in_quest|hired|expired|declined`), a natural byproduct of
 *  the SAME per-player candidate walk (mirrors `getCriticalBuildings`'s own `phase_distribution`). */
interface PoolBreakdown {
  available: RecruitmentCandidateRow[];
  status_counts: Record<string, number>;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `RecruitmentAdminController` — production BO routes for the lieutenant-recruitment-quests system
 * (G11, 04f-B C7).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/recruitment-quests`, `/v1/admin/players/:id/recruitment/candidate-pools`,
 * `/v1/admin/recruitment/force-defector-trigger`, `/v1/admin/recruitment/force-civilian-candidate`,
 * `/v1/admin/tunables/recruitment`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in RecruitmentModule.controllers (alongside conditional RecruitmentTestController).
 */
@Controller('admin')
export class RecruitmentAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: RecruitmentRepository,
    private readonly defector: DefectorRecruitmentService,
    private readonly civilian: CivilianRecruitmentService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/players/:id/recruitment-quests — RAW true state (role `gm`) ─────────────────────

  /**
   * `GET /v1/admin/players/:id/recruitment-quests`
   *
   * P5 BO INVERSION: EVERY quest (active + history) for the player, RAW — the exact `recruitment_quests`
   * DB rows (`decisions_made` UNMASKED, including the D9 vetting internals `detected`/`session_n` the
   * player projection strips; `expected_outcome`; the persisted `hire_quality_bucket`; `double_agent`
   * server/BO-only flag; `vetting_sessions_run`) — NEVER surfaced to players (R2.2, `QuestProjection` has
   * none of these fields at all — a stricter-than-required-by-design zero-leak boundary, unchanged here).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). No quests → an empty list (L1 honest, never 404 —
   * a player_id with zero recruitment activity is a normal, not-found-worthy state).
   */
  @Get('players/:id/recruitment-quests')
  @UseGuards(requireStaffRole('gm'))
  async getRecruitmentQuests(@Param('id') playerId: string) {
    const [active, history] = await Promise.all([
      this.repo.listQuests(playerId, 'active'),
      this.repo.listQuests(playerId, 'history'),
    ]);
    return { player_id: playerId, quests: [...active, ...history] };
  }

  // ─── GET /admin/players/:id/recruitment/candidate-pools — per-pool availability (role `gm`) ─────

  /**
   * `GET /v1/admin/players/:id/recruitment/candidate-pools`
   *
   * Current candidate availability for the player, broken out per pool (`saltline`/`defector`/`civilian`
   * — the tech doc's `/:regionId` transposed per-player, design §11: no region entity exists). Each pool
   * carries its `available` rows (RAW candidate content — BO sees the full profile, no D14 anosmia
   * inversion needed since this is already the ops surface) plus a `status_counts` distribution across
   * the FULL candidate lifecycle (`available|in_quest|hired|expired|declined`) — a natural byproduct of
   * the SAME per-player candidate walk (mirrors `getCriticalBuildings`'s own `phase_distribution`, no 6th
   * endpoint).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). No candidates for the player → all-zero counts,
   * empty `available` lists (L1 honest).
   */
  @Get('players/:id/recruitment/candidate-pools')
  @UseGuards(requireStaffRole('gm'))
  async getCandidatePools(@Param('id') playerId: string) {
    const rows = await this.repo.listAllCandidatesForPlayer(playerId);
    const pools: Record<'saltline' | 'defector' | 'civilian', PoolBreakdown> = {
      saltline: { available: [], status_counts: {} },
      defector: { available: [], status_counts: {} },
      civilian: { available: [], status_counts: {} },
    };
    for (const row of rows) {
      const bucket = pools[row.pool as 'saltline' | 'defector' | 'civilian'];
      if (!bucket) continue; // defensive — `pool` is the shipped lieutenant_source enum, always one of the 3
      bucket.status_counts[row.status] = (bucket.status_counts[row.status] ?? 0) + 1;
      if (row.status === 'available') bucket.available.push(row);
    }
    return { player_id: playerId, pools };
  }

  // ─── 3 mutation endpoints (role `admin`, F3 DEFERRED, audited) ────────────────────────────────────

  /**
   * `POST /v1/admin/recruitment/force-defector-trigger`
   *
   * Live-ops trigger: drives the REAL D8 candidate-content path (`DefectorRecruitmentService.
   * buildCandidateRow` — the SAME seeded-profile method the NIGHTLY/23 tick's regime scan calls) for a
   * given `(player_id, rival_key)`, bypassing the natural regime-eligibility gate (that IS the point of a
   * force). The target rival must be a REAL `rival_state` row (404 otherwise — "not a row poke"); a rival
   * already carrying a non-terminal defector candidate → 409 (the SAME dedup invariant the tick enforces,
   * never a duplicate row).
   *
   * Body: `{ player_id: string, rival_key: string }`.
   * Returns: `{ candidate_id, player_id, pool: 'defector', rival_key, f3_deferred: true }`.
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Post('recruitment/force-defector-trigger')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceDefectorTrigger(@Body() body: ForceDefectorBody, @Req() req: RequestWithAccount) {
    const playerId = body?.player_id;
    const rivalKey = body?.rival_key;
    if (!playerId || typeof playerId !== 'string' || !rivalKey || typeof rivalKey !== 'string') {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id and rival_key are required.' });
    }
    const exists = await this.repo.rivalExists(playerId, rivalKey);
    if (!exists) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such rival '${rivalKey}' for player ${playerId}.` });
    }
    const activeRivalKeys = await this.repo.listActiveDefectorSourceRivalKeys(playerId);
    if (activeRivalKeys.has(rivalKey)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `player ${playerId} already has a live defector candidate for rival '${rivalKey}'.`,
      });
    }
    const { currentGameDay } = await this.repo.getCurrentGameDayAndMinute(playerId);
    const row = this.defector.buildCandidateRow(playerId, rivalKey, currentGameDay);
    const [inserted] = await this.repo.insertCandidates([row]);

    // ★ D14 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetPlayerId: playerId,
      targetEntityType: 'recruitment_candidate',
      targetEntityId: inserted.candidate_id,
      beforeState: {},
      afterState: { pool: 'defector', rival_key: rivalKey, candidate_id: inserted.candidate_id },
    });

    // F3 DEFERRED marker — same precedent as MaintenanceAdminController.forceFailure.
    return {
      candidate_id: inserted.candidate_id,
      player_id: playerId,
      pool: 'defector' as const,
      rival_key: rivalKey,
      f3_deferred: true as const,
    };
  }

  /**
   * `POST /v1/admin/recruitment/force-civilian-candidate`
   *
   * Live-ops trigger: drives the REAL D7 candidate-content path (`CivilianRecruitmentService.
   * buildCandidateRow` — the SAME seeded-profile method the NIGHTLY/23 tick's affinity scan calls) for a
   * given `(player_id, citizen_id)`, bypassing the natural affinity-eligibility predicate (the force's own
   * point). The target citizen must be a REAL `rich_citizens` row owned by the player (404 otherwise); a
   * citizen already carrying a non-terminal civilian candidate → 409 (the SAME dedup invariant the tick
   * enforces, never a duplicate row).
   *
   * Body: `{ player_id: string, citizen_id: string }`.
   * Returns: `{ candidate_id, player_id, pool: 'civilian', citizen_id, f3_deferred: true }`.
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Post('recruitment/force-civilian-candidate')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceCivilianCandidate(@Body() body: ForceCivilianBody, @Req() req: RequestWithAccount) {
    const playerId = body?.player_id;
    const citizenId = body?.citizen_id;
    if (!playerId || typeof playerId !== 'string' || !citizenId || typeof citizenId !== 'string') {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id and citizen_id are required.' });
    }
    const citizen = await this.repo.getCitizenForPlayer(playerId, citizenId);
    if (!citizen) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such citizen '${citizenId}' for player ${playerId}.` });
    }
    const activeCitizenIds = await this.repo.listActiveCivilianCitizenIds(playerId);
    if (activeCitizenIds.has(citizenId)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `player ${playerId} already has a live civilian candidate for citizen '${citizenId}'.`,
      });
    }
    const { currentGameDay } = await this.repo.getCurrentGameDayAndMinute(playerId);
    const row = this.civilian.buildCandidateRow(playerId, citizen, currentGameDay);
    const [inserted] = await this.repo.insertCandidates([row]);

    // ★ D14 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetPlayerId: playerId,
      targetEntityType: 'recruitment_candidate',
      targetEntityId: inserted.candidate_id,
      beforeState: {},
      afterState: { pool: 'civilian', citizen_id: citizenId, candidate_id: inserted.candidate_id },
    });

    // F3 DEFERRED marker — same precedent as MaintenanceAdminController.forceFailure.
    return {
      candidate_id: inserted.candidate_id,
      player_id: playerId,
      pool: 'civilian' as const,
      citizen_id: citizenId,
      f3_deferred: true as const,
    };
  }

  /**
   * `PUT /v1/admin/tunables/recruitment`
   *
   * Live-ops tunable edit: upserts a `recruitment.*` tunable override into the EXISTING `tunable_overrides`
   * table (the SAME mechanism every other admin controller uses — REUSE, never a new override path). The
   * TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: `RECRUITMENT_TUNABLE_CAPS` (recruitment-tunables.ts — the 12 numeric keys). The 3
   * composite string keys (`civilian_loyalty_starting_bucket` / `civilian_affinity_threshold_for_candidacy`
   * / `maladaptive_memory_inheritance_strength_per_defector_origin_conflict`) have no numeric range and
   * are NOT supported here (same precedent as `MaintenanceAdminController`'s own composite-key exclusion).
   * Body: `{ key: string, value: number }`.
   * Returns: `{ key, clampedValue, f3_deferred: true }`.
   *
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range —
   * the stored override is ALWAYS the clamped value, never the raw input.
   *
   * REUSE pattern: MaintenanceAdminController.patchMaintenanceTunable / LiveOpsAdminController.
   * patchLiveOpsTunable.
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Put('tunables/recruitment')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchRecruitmentTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = RECRUITMENT_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', { message: `Unknown recruitment tunable key: '${key}'.` });
    }

    // Apply BO cap (clampRecruitmentTunableToRange from the tunables file — no inline literals, R2.3).
    const clampedValue = clampRecruitmentTunableToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'recruitment-admin-c7',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'recruitment-admin-c7',
        },
      });

    // ★ D14 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09). No
    // `targetEntityId` (a dotted tunable key is not a uuid) — the key travels in after_state instead.
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'recruitment_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    // F3 DEFERRED marker — same precedent as MaintenanceAdminController.patchMaintenanceTunable.
    return { key, clampedValue, f3_deferred: true };
  }
}

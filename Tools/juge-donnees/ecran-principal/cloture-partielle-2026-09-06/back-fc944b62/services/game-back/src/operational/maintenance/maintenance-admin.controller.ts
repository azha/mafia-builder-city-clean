// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C8 (D12 — BO surface, 5
//             game-back admin endpoints `requireStaffRole` + `f3_deferred` + audit)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §10 (BO surface — the
//             5-endpoint table + the RAW read shape + the force-phase=anchor-set contract)
//             Canon: docs/tech/04f_maintenance_decay_recruitment/building_maintenance_decay.md §NestJS —
//             backend backoffice (the 5 endpoints, verbatim role assignments).
//             Pattern: services/game-back/src/operational/liveops/live-ops-admin.controller.ts (04e-B C8 —
//             the closest sibling: `requireStaffRole`, `f3_deferred` markers, `AdminAuditLogService.emit`
//             on every mutation, the PUT-tunables CAPS-clamp upsert shape) — REUSE the DD-C6/R12b BO
//             topology verbatim (game-back `/v1/admin/*`, bo-front-DIRECT).
//             — 04f-A C8 — 2026-07-10
//
// `MaintenanceAdminController` — BO production routes for the 04f-A maintenance/decay/equipment-failure
// system (G10/G20/G26).
//
// Routes (5 endpoints — design §10 literal path shape):
//   GET  /v1/admin/buildings/:id/maintenance-state    — role gm    — RAW true-state (P5 BO inversion)
//   GET  /v1/admin/players/:id/critical-buildings      — role gm    — Day-91+ critical list + phase distribution
//   POST /v1/admin/buildings/:id/force-failure         — role admin — F3 DEFERRED — drives the REAL
//                                                          EquipmentFailureService.forceFailBuilding atomic-5
//   POST /v1/admin/buildings/:id/force-phase            — role admin — F3 DEFERRED — = anchor-set (drives
//                                                          the REAL D1 derivation, no direct phase poke)
//   PUT  /v1/admin/tunables/maintenance                 — role admin — F3 DEFERRED — CAPS-clamped upsert
//
// P5 BO INVERSION (R2.2): the player-facing operational-building projection
// (`real-estate.projection.service.ts`, C2) NEVER returns `days_overdue`, an effective failure
// probability, `overdue_factor`, the output multiplier, or `roll_detail` — ONLY the qualitative
// `LapsePhaseBucket` + `days_until_maintenance_due` (an already-whitelisted int, R2.2) +
// `maintenance_in_progress` (bool). This controller is the P5-inverted sibling: gm/admin staff see the
// REAL, RAW derivation — an ops calibration/incident-response surface, never forwarded to players. This
// chunk touches NEITHER `real-estate.projection.service.ts` NOR `maintenance.controller.ts` (the player
// surface) — the existing `maintenance_phases.spec.ts` R2.2 leak-scan floor (unchanged) is the proof.
//
// F3 two-person-rule: DEFERRED (TD-107 — this route is not wired to the ch17 `TwoPersonApproval` workflow). Same precedent as
//   `LiveOpsAdminController`/`PoliticalAdminController`/`MetaMarketAdminController`. The 3 mutation
//   endpoints are gated by `requireStaffRole('admin')` ONLY until F3 lands — each response carries
//   `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: admin` header WITHOUT a valid bearer token → 401. A valid PLAYER (or wrong-role STAFF)
//   token → 403, EVEN when a spoofed `x-staff-role` header rides alongside it (role is read from the
//   VERIFIED JWT claim only — the header is never consulted anywhere in `staff-role.guard.ts`).
//
// ★ AUDIT (D12, REUSE `AdminAuditLogService.emit` — the ch09 `admin_audit_log` table, FIRST wired by
//   04e-B C8): every MUTATION endpoint below (`forceFailure`/`forcePhase`/`patchMaintenanceTunable`)
//   writes ONE `admin_audit_log` row — the acting staff account_id (from the VERIFIED JWT, never
//   client-supplied), the action type, the targeted entity, and a before/after snapshot. The 2 GET
//   endpoints (`getMaintenanceState`/`getCriticalBuildings`) are read-only diagnostics and do NOT audit
//   (mirrors every sibling BO controller: only mutations are audited).
//
// force-failure = the REAL atomic-5 transaction (`EquipmentFailureService.forceFailBuilding`, C8 NEW) —
//   NOT a bare `structural_state` UPDATE: it writes a REAL `equipment_failure_log` row (grounded repair-
//   cost estimate, so REPAIR_IMMEDIATE/SLOW resolve correctly afterward) and emits the REAL
//   `EquipmentFailedEvent` on the SAME `CityEventBus` the weekly/critical-daily rolls use — the C5
//   `EquipmentFailureExceptionProducerService` (fire-and-forget, already wired, untouched by this chunk)
//   raises the SAME 4-option repair card end-to-end, exactly as a naturally-rolled failure would.
//
// force-phase = anchor-set (design §10): sets ONLY `last_maintained_at_game_day` (the D1 anchor) so the
//   LIVE derivation (`MaintenancePhaseService.deriveLapsePhase`) lands on the requested target phase —
//   NEVER a direct `building_operational_state.lapse_phase` column poke (that column is the NIGHTLY/21
//   tick's own transition-detection CACHE, C2's contract; a direct poke would desync it until the next
//   tick). `MaintenanceRepository.setAnchorForDaysOverdue` inverts the SAME linear D1 relationship
//   `MaintenanceTestController.anchorSet` (test-only) inverts — this is the PRODUCTION admin counterpart,
//   not a duplicated derivation.
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in MaintenanceModule.controllers (alongside conditional MaintenanceTestController).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenancePhaseService, type LapsePhase } from './maintenance-phase.service';
import { EquipmentFailureService, equipmentFailureOverdueFactor, equipmentFailureWeeklyProbability } from './equipment-failure.service';
import { maintenanceTunables, MAINTENANCE_TUNABLE_CAPS, clampMaintenanceTunableToRange } from './maintenance-tunables';

/** The 4-member `LapsePhase` closed domain (mirrors the pgEnum `building_lapse_phase` verbatim) — the ONLY
 *  valid `force-phase` targets (an out-of-domain string → 422, never silently coerced). */
const VALID_PHASES: ReadonlySet<string> = new Set<LapsePhase>(['within_window', 'soft', 'hard', 'critical']);

interface ForcePhaseBody {
  phase: LapsePhase;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `MaintenanceAdminController` — production BO routes for the maintenance/decay/equipment-failure system
 * (G10/G20/G26, 04f-A C8).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/buildings/:id/maintenance-state`, `/v1/admin/players/:id/critical-buildings`,
 * `/v1/admin/buildings/:id/force-failure`, `/v1/admin/buildings/:id/force-phase`,
 * `/v1/admin/tunables/maintenance`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in MaintenanceModule.controllers (alongside conditional MaintenanceTestController).
 */
@Controller('admin')
export class MaintenanceAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly failures: EquipmentFailureService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/buildings/:id/maintenance-state — RAW true state (role `gm`) ────────────────────

  /**
   * `GET /v1/admin/buildings/:id/maintenance-state`
   *
   * P5 BO INVERSION: the RAW, TRUE state of a building's maintenance/decay/equipment-failure standing —
   * `lapse_phase` LIVE-derived from the D1 anchor (`MaintenancePhaseService.deriveLapsePhase`, NOT the
   * NIGHTLY-tick CACHE column — the cache is echoed too, `cached_lapse_phase`, for ops cross-check),
   * `days_overdue` + `days_since_last_maintained` (canon "true state ... days_since_maintenance_due"),
   * the effective D11 failure probability (the weekly formula OR the flat critical-daily prob, whichever
   * the LIVE phase selects — `null` for an EXCLUDED type, design §5), `overdue_factor`, the D5 output
   * multiplier, the D1 anchor/interval, and the full `equipment_failure_log` repair history (most-recent-
   * first) — NEVER surfaced to players (R2.2, mirrors `real-estate.projection.service.ts`'s own qualitative
   * inversion, untouched by this chunk).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). Unknown building_id → 404.
   */
  @Get('buildings/:id/maintenance-state')
  @UseGuards(requireStaffRole('gm'))
  async getMaintenanceState(@Param('id') buildingId: string) {
    const row = await this.repo.getAdminMaintenanceStateRaw(buildingId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building: ${buildingId}.` });
    }

    const { currentGameDay } = await this.repo.getCurrentGameDayAndMinute(row.player_id);
    const daysOverdue = this.phase.deriveDaysOverdue(
      currentGameDay,
      row.last_maintained_at_game_day,
      row.maintenance_due_in_days,
    );
    const daysSinceLastMaintained =
      row.last_maintained_at_game_day === null ? null : currentGameDay - row.last_maintained_at_game_day;
    const livePhase = this.phase.deriveLapsePhase(daysOverdue);
    const overdueFactor = equipmentFailureOverdueFactor(daysOverdue);
    // The effective D11 failure probability: the FLAT critical-daily prob while critical (D11 — the
    // weekly formula never applies there), else the weekly formula (null for an EXCLUDED type).
    const effectiveFailureProbability =
      livePhase === 'critical'
        ? maintenanceTunables.equipmentFailureCriticalDailyProb
        : equipmentFailureWeeklyProbability(row.operational_type, row.equipment_tier, daysOverdue, livePhase);
    const outputMultiplier = this.phase.maintenanceOutputMultiplier(daysOverdue);
    const repairHistory = await this.repo.listFailureLogForBuilding(buildingId);

    return {
      building_id: row.building_id,
      player_id: row.player_id,
      operational_type: row.operational_type,
      structural_state: row.structural_state,
      lapse_phase: livePhase,
      cached_lapse_phase: row.lapse_phase,
      days_overdue: daysOverdue,
      days_since_last_maintained: daysSinceLastMaintained,
      current_game_day: currentGameDay,
      last_maintained_at_game_day: row.last_maintained_at_game_day,
      maintenance_due_in_days: row.maintenance_due_in_days,
      maintenance_completes_at_day: row.maintenance_completes_at_day,
      overdue_factor: overdueFactor,
      effective_failure_probability: effectiveFailureProbability,
      output_multiplier: outputMultiplier,
      repair_history: repairHistory,
    };
  }

  // ─── GET /admin/players/:id/critical-buildings — Day-91+ critical list (role `gm`) ──────────────

  /**
   * `GET /v1/admin/players/:id/critical-buildings`
   *
   * All Day-91+ CRITICAL buildings for the player (canon), LIVE-derived (never the tick cache — same
   * discipline as `getMaintenanceState`). A natural byproduct of the SAME per-building phase walk this
   * endpoint already performs to filter the critical subset: `phase_distribution` — the full 4-bucket
   * count across the player's OWN operational fleet (`<MaintenancePhaseDistribution>`'s data source,
   * design §10 "diagnostic balance") — computed from data already read for this SAME query, not a second
   * query, not a new endpoint (the design's literal 5-endpoint scope stays exactly 5 paths).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). No operational buildings → empty lists (L1 honest).
   */
  @Get('players/:id/critical-buildings')
  @UseGuards(requireStaffRole('gm'))
  async getCriticalBuildings(@Param('id') playerId: string) {
    const { currentGameDay } = await this.repo.getCurrentGameDayAndMinute(playerId);
    const rows = await this.repo.listOperationalBuildingsForWeeklyFailureRoll(playerId);

    const phaseDistribution: Record<LapsePhase, number> = {
      within_window: 0,
      soft: 0,
      hard: 0,
      critical: 0,
    };
    const criticalBuildings: Array<{ building_id: string; operational_type: string; days_overdue: number }> = [];

    for (const row of rows) {
      const daysOverdue = this.phase.deriveDaysOverdue(
        currentGameDay,
        row.last_maintained_at_game_day,
        row.maintenance_due_in_days,
      );
      const livePhase = this.phase.deriveLapsePhase(daysOverdue);
      phaseDistribution[livePhase]++;
      if (livePhase === 'critical') {
        criticalBuildings.push({ building_id: row.building_id, operational_type: row.operational_type, days_overdue: daysOverdue });
      }
    }

    return {
      player_id: playerId,
      current_game_day: currentGameDay,
      critical_buildings: criticalBuildings,
      phase_distribution: phaseDistribution,
    };
  }

  // ─── 3 mutation endpoints (role `admin`, F3 DEFERRED, audited) ────────────────────────────────────

  /**
   * `POST /v1/admin/buildings/:id/force-failure`
   *
   * Live-ops/test trigger — drives the REAL `EquipmentFailureService.forceFailBuilding` atomic-5 (the
   * SAME `applyEquipmentFailure` transaction + `EquipmentFailedEvent` bus emit the weekly/critical-daily
   * rolls use), NOT a state poke. Only an `operational` building is forceable (409 otherwise — mirrors
   * the atomic-5's own guarded flip). Unknown building_id → 404.
   *
   * Returns: { building_id, failure_id, lapse_phase, f3_deferred: true }
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Post('buildings/:id/force-failure')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceFailure(@Param('id') buildingId: string, @Req() req: RequestWithAccount) {
    const row = await this.repo.getAdminMaintenanceStateRaw(buildingId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building: ${buildingId}.` });
    }

    const { currentGameDay, gameMinute } = await this.repo.getCurrentGameDayAndMinute(row.player_id);
    const result = await this.failures.forceFailBuilding(row.player_id, buildingId, currentGameDay, gameMinute);
    if (!result) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not forceable (structural_state must be 'operational').`,
      });
    }

    // ★ D12 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'building_operational_state',
      targetEntityId: buildingId,
      beforeState: { structural_state: 'operational' },
      afterState: { structural_state: 'failed', failureId: result.failureId, lapsePhase: result.lapsePhase },
    });

    // F3 DEFERRED marker — same precedent as LiveOpsAdminController.forceActivate.
    return { building_id: buildingId, failure_id: result.failureId, lapse_phase: result.lapsePhase, f3_deferred: true };
  }

  /**
   * `POST /v1/admin/buildings/:id/force-phase`
   *
   * Live-ops/test trigger — SETS THE ANCHOR so the LIVE-derived phase = `body.phase` (design §10 — see the
   * file header's "force-phase = anchor-set" note). `daysOverdue` is computed from the SAME
   * `derivePhaseOffsets()` boundary the real phase derivation compares against (`within_window`→0,
   * `soft`/`hard`/`critical`→their own offset — the `>=` boundary semantics of `deriveLapsePhase` land
   * exactly on the target phase). Only an `operational` building is forceable (409 otherwise). Unknown
   * building_id → 404; an unrecognized `phase` string → 422.
   *
   * Returns: { building_id, target_phase, derived_phase, days_overdue, anchor, current_game_day,
   *   f3_deferred: true } — `derived_phase` is RE-DERIVED (not echoed) from the SAME
   * `deriveLapsePhase(daysOverdue)` the real engine uses, so a caller can verify the anchor write actually
   * landed on the requested phase.
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Post('buildings/:id/force-phase')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forcePhase(@Param('id') buildingId: string, @Body() body: ForcePhaseBody, @Req() req: RequestWithAccount) {
    const targetPhase = body?.phase;
    if (!targetPhase || !VALID_PHASES.has(targetPhase)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown phase: ${JSON.stringify(targetPhase)}. Must be one of within_window|soft|hard|critical.`,
      });
    }

    const row = await this.repo.getAdminMaintenanceStateRaw(buildingId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building: ${buildingId}.` });
    }

    const offsets = this.phase.derivePhaseOffsets();
    const daysOverdue =
      targetPhase === 'within_window' ? 0 : targetPhase === 'soft' ? offsets.soft : targetPhase === 'hard' ? offsets.hard : offsets.critical;

    const result = await this.repo.setAnchorForDaysOverdue(row.player_id, buildingId, daysOverdue);
    if (!result) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not OPERATIONAL — force-phase only applies to an operational building.`,
      });
    }
    // Re-derive from the SAME formula the real engine uses (never echo the target) — the caller's proof
    // the anchor write actually landed on the requested phase.
    const derivedPhase = this.phase.deriveLapsePhase(daysOverdue);

    // ★ D12 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'building_operational_state',
      targetEntityId: buildingId,
      beforeState: {},
      afterState: { targetPhase, daysOverdue, newAnchor: result.newAnchor },
    });

    return {
      building_id: buildingId,
      target_phase: targetPhase,
      derived_phase: derivedPhase,
      days_overdue: daysOverdue,
      anchor: result.newAnchor,
      current_game_day: result.currentGameDay,
      f3_deferred: true,
    };
  }

  /**
   * `PUT /v1/admin/tunables/maintenance`
   *
   * Live-ops tunable edit: upserts a `maintenance.*` (or `perf_budget.04f_*`) tunable override into the
   * EXISTING `tunable_overrides` table (the SAME mechanism every other admin controller uses — REUSE,
   * never a new override path). The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel
   * `tunables_changed`).
   *
   * Allowed keys: `MAINTENANCE_TUNABLE_CAPS` (maintenance-tunables.ts — 35 numeric keys). The 1 composite
   * string key (`maintenance.failure_repair_heat_magnitude_band`) has no numeric range and is NOT
   * supported here (same precedent as `LiveOpsAdminController`'s own composite-key exclusion).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range.
   *
   * REUSE pattern: LiveOpsAdminController.patchLiveOpsTunable / PoliticalAdminController.
   * patchPoliticalEventsTunable.
   * F3 two-person-rule DEFERRED (TD-107). Role: `admin`.
   */
  @Put('tunables/maintenance')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchMaintenanceTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = MAINTENANCE_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', { message: `Unknown maintenance tunable key: '${key}'.` });
    }

    // Apply BO cap (clampMaintenanceTunableToRange from tunables file — no inline literals, R2.3).
    const clampedValue = clampMaintenanceTunableToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'maintenance-admin-c8',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'maintenance-admin-c8',
        },
      });

    // ★ D12 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09). No
    // `targetEntityId` (a dotted tunable key is not a uuid) — the key travels in after_state instead.
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'maintenance_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    // F3 DEFERRED marker — same precedent as LiveOpsAdminController.patchLiveOpsTunable.
    return { key, clampedValue, f3_deferred: true };
  }
}

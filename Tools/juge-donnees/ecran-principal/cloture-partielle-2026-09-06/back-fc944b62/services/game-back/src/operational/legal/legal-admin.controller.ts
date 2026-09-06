// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C10 §BO
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §Projection + §BO
//             Pattern: services/game-back/src/operational/insurance/insurance-admin.controller.ts
//             — 04d-A C10 — 2026-06-30
//
// `LegalAdminController` — BO production routes for the Lawyer & Legal System (§2 P5 inversion).
//
// Routes (5 endpoints):
//   GET  /v1/admin/players/:id/legal-cases              — role gm  — true-state: all cases + lawyers + BurnRiskBucket
//   GET  /v1/admin/lawyers/burn-risk-distribution       — role gm  — ALL Tier-3 lawyers + burn_risk_score + band
//   POST /v1/admin/legal-cases/:id/force-resolution     — role admin — F3 DEFERRED (TD)
//   POST /v1/admin/lawyers/:id/force-burn               — role admin — F3 DEFERRED (TD)
//   PUT  /v1/admin/tunables/lawyer                      — role admin — F3 DEFERRED (TD)
//
// P5 BO inversion (R2.2): raw hidden scalars (info_leak_rate, info_leak_total, burn_risk_score)
//   are exposed here to gm/admin staff — they are NEVER forwarded to the player client (C9 wall).
//
// F3 two-person-rule: DEFERRED (TD). Same precedent as InsuranceAdminController:21-25.
//   The 3 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification). A `x-staff-role: admin`
//   header without a valid bearer token → 401.
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in LawyerModule.controllers (ALWAYS alongside LegalTestController conditional).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { lawyer as lawyerTable, legalCase as legalCaseTable } from '../../db/schema/legal';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { LAWYER_TUNABLE_CAPS, clampLawyerToRange } from './lawyer.tunables';
import { deriveBurnRiskBucket } from './legal-projection.service';
import { LegalCaseService } from './legal-case.service';
import { LawyerService } from './lawyer.service';
import { LegalProjectionService } from './legal-projection.service';
import type { BurnRiskBucket } from './legal.types';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceResolutionBody {
  outcome: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed';
  gameMinute: number;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `LegalAdminController` — production BO routes for the Lawyer & Legal System.
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/legal-cases`, `/v1/admin/lawyers/burn-risk-distribution`,
 * `/v1/admin/legal-cases/:id/force-resolution`, `/v1/admin/lawyers/:id/force-burn`,
 * `/v1/admin/tunables/lawyer`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in LawyerModule.controllers (alongside conditional LegalTestController).
 *
 * F3 two-person-rule: DEFERRED (TD). Same precedent as InsuranceAdminController:121-123.
 * The 3 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 */
@Controller('admin')
export class LegalAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly legalCaseService: LegalCaseService,
    private readonly lawyerService: LawyerService,
    private readonly projectionService: LegalProjectionService,
  ) {}

  // ─── GET true-state endpoint (role `gm`) ───────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/legal-cases`
   *
   * P5 BO INVERSION: returns the raw true state for ALL legal cases + lawyers for a player.
   * The raw hidden scalars returned here (info_leak_rate, info_leak_total, burn_risk_score)
   * are NEVER forwarded to the player (R2.2 P5 invariant). Ops staff uses this for
   * live legal-system monitoring.
   *
   * Returns:
   *   - player_id
   *   - cases: ALL legal_cases rows for the player (any status), including:
   *       info_leak_rate (SERVER-ONLY scalar — P5 BO inversion)
   *       info_leak_total (SERVER-ONLY scalar — P5 BO inversion)
   *   - lawyers: ALL lawyers rows for the player, each augmented with:
   *       burnRiskBand (BurnRiskBucket derived from burn_risk_score — §13 + BO)
   *
   * NO R2.2 banding — this is the P5 BO inversion: raw scalars for ops.
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('players/:id/legal-cases')
  @UseGuards(requireStaffRole('gm'))
  async getLegalCasesState(@Param('id') playerId: string) {
    // Load all cases (any status) and all lawyers concurrently.
    const [cases, lawyers] = await Promise.all([
      this.db
        .select()
        .from(legalCaseTable)
        .where(eq(legalCaseTable.player_id, playerId)),
      this.db
        .select()
        .from(lawyerTable)
        .where(eq(lawyerTable.player_id, playerId)),
    ]);

    // Augment each lawyer row with the BurnRiskBucket band (BO inversion: raw float + band).
    // The raw burn_risk_score is included in the lawyers row; band is an additional field.
    const lawyersWithBand = lawyers.map((l) => ({
      ...l,
      burnRiskBand: deriveBurnRiskBucket(l.burn_risk_score ?? 0, {
        tier3BurnElevatedThreshold: this.projectionService['tunables'].tier3BurnElevatedThreshold,
        tier3BurnThreshold:         this.projectionService['tunables'].tier3BurnThreshold,
      }) as BurnRiskBucket,
    }));

    return {
      player_id: playerId,
      cases,
      lawyers: lawyersWithBand,
    };
  }

  // ─── GET burn-risk distribution (role `gm`) ────────────────────────────────

  /**
   * `GET /v1/admin/lawyers/burn-risk-distribution`
   *
   * P5 BO INVERSION: returns ALL Tier-3 (`corruption_pipeline`) lawyers across ALL players
   * with their raw `burn_risk_score` + `BurnRiskBucket` band.
   *
   * Ops staff uses this for cross-player Tier-3 burn-risk monitoring and calibration.
   *
   * Returns:
   *   - lawyers: all corruption_pipeline rows, each with:
   *       all lawyers columns (including burn_risk_score — SERVER-ONLY scalar, P5 BO inversion)
   *       burnRiskBand (BurnRiskBucket derived from burn_risk_score)
   *
   * NO R2.2 banding for the raw float — this is the P5 BO inversion.
   * Role: `gm` (monitoring surface, no mutation).
   */
  @Get('lawyers/burn-risk-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getBurnRiskDistribution() {
    // Fetch ALL Tier-3 lawyers across all players (global BO view).
    const tier3Lawyers = await this.db
      .select()
      .from(lawyerTable)
      .where(eq(lawyerTable.tier, 'corruption_pipeline'));

    // Augment each with the BurnRiskBucket band.
    const lawyersWithBand = tier3Lawyers.map((l) => ({
      ...l,
      burnRiskBand: deriveBurnRiskBucket(l.burn_risk_score ?? 0, {
        tier3BurnElevatedThreshold: this.projectionService['tunables'].tier3BurnElevatedThreshold,
        tier3BurnThreshold:         this.projectionService['tunables'].tier3BurnThreshold,
      }) as BurnRiskBucket,
    }));

    return { lawyers: lawyersWithBand };
  }

  // ─── 3 action endpoints (role `admin`, F3 DEFERRED) ────────────────────────

  /**
   * `POST /v1/admin/legal-cases/:id/force-resolution`
   *
   * Live-ops action: forcibly resolve an active legal case to a specific outcome.
   * Calls `LegalCaseService.forceResolveCase(caseId, outcome, gameMinute)`.
   * If outcome='convicted', the full conviction final-dump is executed (matches organic path).
   *
   * Body: { outcome: 'acquitted'|'plea_down'|'convicted'|'dismissed', gameMinute: number }
   * Returns: { caseId, outcome, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as InsuranceAdminController:211-218.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('legal-cases/:id/force-resolution')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceResolution(
    @Param('id') caseId: string,
    @Body() body: ForceResolutionBody,
  ) {
    const { outcome, gameMinute = 0 } = body ?? {};
    const VALID_OUTCOMES = new Set<string>(['acquitted', 'plea_down', 'convicted', 'dismissed']);
    if (!outcome || !VALID_OUTCOMES.has(outcome)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `outcome must be one of: acquitted, plea_down, convicted, dismissed. Got: '${outcome}'.`,
      });
    }

    await this.legalCaseService.forceResolveCase(caseId, outcome, gameMinute);

    // F3 DEFERRED marker — same precedent as InsuranceAdminController:243-247.
    return { caseId, outcome, f3_deferred: true };
  }

  /**
   * `POST /v1/admin/lawyers/:id/force-burn`
   *
   * Live-ops action: forcibly burn a Tier-3 lawyer (bypasses the burn_risk_score threshold check).
   * Calls `LawyerService.forceBurnLawyer(lawyerId, gameMinute)`.
   * If not a Tier-3 lawyer, returns { lawyerId, burned: false, f3_deferred: true }.
   *
   * Body: none required (gameMinute defaults to 0).
   * Returns: { lawyerId, burned: boolean, casesRerouted: number, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('lawyers/:id/force-burn')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceBurn(
    @Param('id') lawyerId: string,
    @Body() body?: { gameMinute?: number },
  ) {
    const gameMinute = body?.gameMinute ?? 0;
    const result = await this.lawyerService.forceBurnLawyer(lawyerId, gameMinute);

    // F3 DEFERRED marker.
    return { lawyerId, ...result, f3_deferred: true };
  }

  /**
   * `PUT /v1/admin/tunables/lawyer`
   *
   * Live-ops tunable edit: upserts a lawyer tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see LAWYER_TUNABLE_CAPS (all numeric scalar `lawyer.*` keys).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 400/VALIDATION_FAILED.
   * Clamping: applied per LAWYER_TUNABLE_CAPS min/max range (clampLawyerToRange).
   *
   * REUSE pattern: InsuranceAdminController:267-302 (PUT tunables/insurance).
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/lawyer')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchLawyerTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body ?? {};
    const range = LAWYER_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown lawyer tunable key: '${key}'. Allowed: ${Object.keys(LAWYER_TUNABLE_CAPS).join(', ')}`,
      });
    }

    // Apply BO cap (clampLawyerToRange from tunables file — no inline literals, R2.3).
    const clampedValue = clampLawyerToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: InsuranceAdminController:283-298 upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'legal-admin-c10',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'legal-admin-c10',
        },
      });

    // F3 DEFERRED marker — same precedent as InsuranceAdminController:300-302.
    return { key, clampedValue, f3_deferred: true };
  }
}

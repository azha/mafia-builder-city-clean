// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C9 (BO admin)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §BO (:157-163)
//             Pattern: services/game-back/src/operational/legal/legal-admin.controller.ts
//             — 04d-B C9 — 2026-07-02
//
// `IAAdminController` — BO production routes for the Internal Affairs / Corruption Discovery (§3 P5 inversion).
//
// Routes (5 endpoints):
//   GET  /v1/admin/ia/targets                     — role gm  — ALL internal_affairs_targets rows (P5 BO inversion)
//   GET  /v1/admin/ia/investigations/active        — role gm  — open investigations (status='active')
//   GET  /v1/admin/ia/discovery-rate-distribution  — role gm  — per target_type discovery aggregate
//   POST /v1/admin/ia/force-discovery             — role admin — F3 DEFERRED (TD)
//   PUT  /v1/admin/tunables/internal_affairs       — role admin — F3 DEFERRED (TD)
//
// P5 BO inversion (R2.2): raw hidden scalars (suspicion_level, cooperators, weight_per_player)
//   are exposed here to gm/admin staff — they are NEVER forwarded to the player client (C8 wall).
//
// F3 two-person-rule: DEFERRED (TD). Same precedent as LegalAdminController:18-19.
//   The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification). A `x-staff-role: gm`
//   header without a valid bearer token → 401.
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in InternalAffairsModule.controllers (ALWAYS alongside IATestController conditional).

import { Body, Controller, Get, HttpCode, Inject, Post, Put, UseGuards } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { internalAffairsTarget, iaInvestigation } from '../../db/schema/internal_affairs';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { IA_TUNABLE_CAPS, clampIAToRange } from './ia.tunables';
import { IADiscoveryService } from './ia-discovery.service';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceDiscoveryBody {
  targetId: string;
  gameMinute?: number;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `IAAdminController` — production BO routes for the Internal Affairs module (§3 G9).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/ia/targets`, `/v1/admin/ia/investigations/active`,
 * `/v1/admin/ia/discovery-rate-distribution`, `/v1/admin/ia/force-discovery`,
 * `/v1/admin/tunables/internal_affairs`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in InternalAffairsModule.controllers (alongside conditional IATestController).
 *
 * P5 BO INVERSION (R2.2): raw hidden scalars exposed here to staff:
 *   - `suspicion_level` (SERVER-ONLY accumulator 0-1)
 *   - `cooperators` (JSONB list of player_ids — SERVER-ONLY)
 *   - `weight_per_player` (JSONB map { player_id → float } — SERVER-ONLY)
 * These are NEVER returned by any player-facing endpoint (C8 P5 wall).
 *
 * F3 two-person-rule: DEFERRED (TD). Same precedent as LegalAdminController:69-71.
 * The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 */
@Controller('admin')
export class IAAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly iaDiscoveryService: IADiscoveryService,
  ) {}

  // ─── GET /admin/ia/targets — true-state all targets (role `gm`) ───────────

  /**
   * `GET /v1/admin/ia/targets`
   *
   * P5 BO INVERSION: returns ALL internal_affairs_targets rows with ALL columns.
   * Includes the SERVER-ONLY scalars that are NEVER exposed to players:
   *   - `suspicion_level` (raw float 0-1)
   *   - `cooperators` (list of player_ids who contributed suspicion)
   *   - `weight_per_player` (per-player contribution weight map)
   *
   * Ops staff uses this for live IA monitoring + calibration.
   * NO R2.2 banding — this is the P5 BO inversion: raw scalars for ops.
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('ia/targets')
  @UseGuards(requireStaffRole('gm'))
  async getIATargets() {
    const targets = await this.db.select().from(internalAffairsTarget);
    return { targets };
  }

  // ─── GET /admin/ia/investigations/active — active investigations (role `gm`) ─

  /**
   * `GET /v1/admin/ia/investigations/active`
   *
   * Returns all ia_investigations rows with status='active'.
   * Ops staff uses this for live investigation monitoring.
   *
   * Role: `gm` (monitoring surface, no mutation).
   */
  @Get('ia/investigations/active')
  @UseGuards(requireStaffRole('gm'))
  async getActiveInvestigations() {
    const investigations = await this.db
      .select()
      .from(iaInvestigation)
      .where(eq(iaInvestigation.status, 'active'));
    return { investigations };
  }

  // ─── GET /admin/ia/discovery-rate-distribution — aggregate (role `gm`) ─────

  /**
   * `GET /v1/admin/ia/discovery-rate-distribution`
   *
   * Returns per-target_type discovery rate aggregate.
   * Ops staff uses this for balance diagnostics (is IA discovering at the right rate?).
   *
   * Returns:
   *   { distribution: Array<{ target_type, total, discovered, discovery_rate }> }
   *
   * Role: `gm` (diagnostic balance surface, no mutation).
   */
  @Get('ia/discovery-rate-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getDiscoveryRateDistribution() {
    const rows = await this.db
      .select({
        target_type: internalAffairsTarget.target_type,
        total: sql<number>`count(*)::int`.as('total'),
        discovered: sql<number>`count(*) FILTER (WHERE ${internalAffairsTarget.discovered_at} IS NOT NULL)::int`.as('discovered'),
      })
      .from(internalAffairsTarget)
      .groupBy(internalAffairsTarget.target_type);

    const distribution = rows.map((r) => ({
      target_type: r.target_type,
      total: Number(r.total),
      discovered: Number(r.discovered),
      discovery_rate: Number(r.total) > 0 ? Number(r.discovered) / Number(r.total) : 0,
    }));
    return { distribution };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED) ───────────────────────

  /**
   * `POST /v1/admin/ia/force-discovery`
   *
   * Live-ops action: forcibly evaluate discovery for a specific IA target.
   * Calls `IADiscoveryService.executeDiscovery(targetId, gameMinute)`.
   * The double-condition is evaluated as normal (detection_events >= N OR suspicion_level >= T).
   *
   * ⚠️ CORRIGÉ 2026-08-08 : `clerk` n'est PLUS reserved-inert (appelant de production depuis 04f-B —
   * recruitment-quest.service.ts:336). Réservés-inertes réels : port_inspector|broker|judge_aide.
   * For reserved-inert targets (port_inspector|broker|judge_aide): discovery fires
   * the inert forward hook and emits IATargetDiscoveredEvent (anti-fig-leaf proof, C9).
   * No service is burned (no substrate to cancel for reserved types).
   *
   * Body: { targetId: string, gameMinute?: number }
   * Returns: { ...result, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as LegalAdminController:186-208.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('ia/force-discovery')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceDiscovery(@Body() body: ForceDiscoveryBody) {
    const { targetId, gameMinute } = body ?? {};
    if (typeof targetId !== 'string' || !targetId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `targetId must be a non-empty string. Got: ${JSON.stringify(targetId)}`,
      });
    }

    const result = await this.iaDiscoveryService.executeDiscovery(targetId, gameMinute ?? 0);

    // F3 DEFERRED marker — same precedent as LegalAdminController:207-208.
    return { ...result, f3_deferred: true };
  }

  /**
   * `PUT /v1/admin/tunables/internal_affairs`
   *
   * Live-ops tunable edit: upserts an IA tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see IA_TUNABLE_CAPS (all numeric scalar `internal_affairs.*` keys).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 422/VALIDATION_FAILED.
   * Clamping: applied per IA_TUNABLE_CAPS min/max range (clampIAToRange).
   *
   * REUSE pattern: LegalAdminController:256-292 (PUT tunables/lawyer).
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/internal_affairs')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchIATunable(@Body() body: PatchTunableBody) {
    const { key, value } = body ?? {};
    const range = IA_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown internal_affairs tunable key: '${key}'. Allowed: ${Object.keys(IA_TUNABLE_CAPS).join(', ')}`,
      });
    }

    // Apply BO cap (clampIAToRange from tunables file — no inline literals, R2.3).
    const clampedValue = clampIAToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: LegalAdminController:273-288 upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'ia-admin-c9',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'ia-admin-c9',
        },
      });

    // F3 DEFERRED marker — same precedent as LegalAdminController:291-292.
    return { key, clampedValue, f3_deferred: true };
  }
}

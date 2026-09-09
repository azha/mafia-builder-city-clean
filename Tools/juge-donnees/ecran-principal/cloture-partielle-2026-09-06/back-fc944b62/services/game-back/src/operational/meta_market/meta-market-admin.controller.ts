// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C8 (BO admin endpoints)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md §1 (BO P5 inversion)
//             Pattern: services/game-back/src/operational/internal_affairs/ia-admin.controller.ts
//             — 04d-C C8 — 2026-07-03
//
// `MetaMarketAdminController` — BO production routes for the Async Meta-Market (§1 04d G4).
//
// Routes (5 endpoints):
//   GET  /v1/admin/meta-market/region/:regionId/signals   — role gm  — raw signals for a region (P5 BO inversion)
//   GET  /v1/admin/meta-market/anti-cheat-cluster-flags   — role gm  — all cohort flags
//   GET  /v1/admin/meta-market/storage-metrics            — role gm  — row counts + retention stats
//   POST /v1/admin/meta-market/force-purge                — role admin — F3 DEFERRED (TD)
//   PUT  /v1/admin/tunables/meta_market                   — role admin — F3 DEFERRED (TD)
//
// P5 BO INVERSION (R2.2): raw sample_count is exposed here to gm/admin staff — the normal
//   player read (getSignal / getSignalWithVisibility) hides buckets below sample_floor.
//   BO always sees the actual sample_count (ops calibration surface).
//
// F3 two-person-rule: DEFERRED (TD). Same precedent as LegalAdminController + IAAdminController.
//   The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification). A `x-staff-role: gm`
//   header without a valid bearer token → 401.
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in MetaMarketModule.controllers (alongside conditional MetaMarketTestController).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { metaMarketSignals, metaMarketCohortFlags } from '../../db/schema/meta_market';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { META_MARKET_TUNABLE_CAPS, clampMetaMarketToRange } from './meta-market.tunables';
import { MetaMarketRetentionService } from './meta-market-retention.service';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForcePurgeBody {
  retentionDays: number;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `MetaMarketAdminController` — production BO routes for the Async Meta-Market module (§1 G4 04d-C).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/meta-market/region/:regionId/signals`,
 * `/v1/admin/meta-market/anti-cheat-cluster-flags`,
 * `/v1/admin/meta-market/storage-metrics`,
 * `/v1/admin/meta-market/force-purge`,
 * `/v1/admin/tunables/meta_market`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in MetaMarketModule.controllers (alongside conditional MetaMarketTestController).
 *
 * P5 BO INVERSION (R2.2): raw sample_count is exposed here to gm/admin staff.
 *   The player-facing read (getSignal / getSignalWithVisibility) hides buckets below sample_floor.
 *   BO sees everything — this is the P5 inversion surface.
 *
 * F3 two-person-rule: DEFERRED (TD). Same precedent as IAAdminController C9 / LegalAdminController C10.
 * The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 */
@Controller('admin')
export class MetaMarketAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly retentionService: MetaMarketRetentionService,
  ) {}

  // ─── GET /admin/meta-market/region/:regionId/signals — raw signals (role `gm`) ─

  /**
   * `GET /v1/admin/meta-market/region/:regionId/signals`
   *
   * P5 BO INVERSION: returns ALL meta_market_signals rows for the given region with ALL columns.
   * Includes the raw `sample_count` (NEVER exposed to players — they only get 'insufficient_signal'
   * when below the sample_floor). Ops uses this for signal calibration + floor tuning.
   *
   * Returns: { regionId: string, signals: Array<MetaMarketSignalRow> }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta-market/region/:regionId/signals')
  @UseGuards(requireStaffRole('gm'))
  async getRegionSignals(@Param('regionId') regionId: string) {
    const rows = await this.db
      .select()
      .from(metaMarketSignals)
      .where(sql`${metaMarketSignals.region_id} = ${regionId}`)
      .orderBy(metaMarketSignals.substance, metaMarketSignals.district_profile, sql`${metaMarketSignals.aggregated_at} DESC`);

    // Serialize bigint columns (median/p10/p90_price_cents) to strings — JSON.stringify cannot
    // handle BigInt natively. BO response includes raw sample_count (P5 inversion, never hidden).
    const signals = rows.map((r) => ({
      region_id:           r.region_id,
      substance:           r.substance,
      district_profile:    r.district_profile,
      aggregated_at:       r.aggregated_at,
      sample_count:        r.sample_count,
      median_price_cents:  String(r.median_price_cents),
      p10_price_cents:     String(r.p10_price_cents),
      p90_price_cents:     String(r.p90_price_cents),
    }));

    return { regionId, signals };
  }

  // ─── GET /admin/meta-market/anti-cheat-cluster-flags — cohort flags (role `gm`) ─

  /**
   * `GET /v1/admin/meta-market/anti-cheat-cluster-flags`
   *
   * Returns all meta_market_cohort_flags rows (detection events from MetaMarketAntiCheatService).
   * Ops staff uses this to monitor coordinated price manipulation attempts.
   *
   * Returns: { flags: Array<MetaMarketCohortFlagRow> }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta-market/anti-cheat-cluster-flags')
  @UseGuards(requireStaffRole('gm'))
  async getAntiCheatClusterFlags() {
    const flags = await this.db
      .select()
      .from(metaMarketCohortFlags)
      .orderBy(sql`${metaMarketCohortFlags.detected_at} DESC`);

    return { flags };
  }

  // ─── GET /admin/meta-market/storage-metrics — row counts (role `gm`) ─────────

  /**
   * `GET /v1/admin/meta-market/storage-metrics`
   *
   * Returns current row counts for all 3 meta-market tables.
   * Ops staff uses this to monitor storage growth + plan retention runs.
   *
   * Returns:
   *   {
   *     signals_count: number,
   *     contributions_count: number,
   *     cohort_flags_count: number,
   *   }
   *
   * Role: `gm` (diagnostic balance surface, no mutation).
   */
  @Get('meta-market/storage-metrics')
  @UseGuards(requireStaffRole('gm'))
  async getStorageMetrics() {
    const [signalsRow, contributionsRow, cohortFlagsRow] = await Promise.all([
      this.db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM meta_market_signals`),
      this.db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM meta_market_contributions`),
      this.db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM meta_market_cohort_flags`),
    ]);

    const getCount = (result: { rows?: { count: string }[] } | { count: string }[]): number => {
      const rows = (result as { rows?: { count: string }[] }).rows ?? (result as { count: string }[]);
      return Number((rows as { count: string }[])[0]?.count ?? 0);
    };

    return {
      signals_count:       getCount(signalsRow as unknown as { rows?: { count: string }[] }),
      contributions_count: getCount(contributionsRow as unknown as { rows?: { count: string }[] }),
      cohort_flags_count:  getCount(cohortFlagsRow as unknown as { rows?: { count: string }[] }),
    };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED) ───────────────────────

  /**
   * `POST /v1/admin/meta-market/force-purge`
   *
   * Live-ops action: forcibly run a retention purge with a given `retentionDays` override.
   * Calls `MetaMarketRetentionService.purgeOlderThan(retentionDays)`.
   *
   * Body: { retentionDays: number } — must be 1..90.
   * Returns: { ...result, f3_deferred: true }
   *   result = { signalsDeleted: number, contributionsDeleted: number }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD precedent as IAAdminController.forceDiscovery + LegalAdminController force-burn.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('meta-market/force-purge')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forcePurge(@Body() body: ForcePurgeBody) {
    const { retentionDays } = body ?? {};
    if (typeof retentionDays !== 'number' || retentionDays < 1 || retentionDays > 90) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `retentionDays must be a number in [1, 90]. Got: ${JSON.stringify(retentionDays)}`,
      });
    }

    const result = await this.retentionService.purgeOlderThan(retentionDays);

    // F3 DEFERRED marker — same precedent as IAAdminController.forceDiscovery.
    return { ...result, f3_deferred: true };
  }

  /**
   * `PUT /v1/admin/tunables/meta_market`
   *
   * Live-ops tunable edit: upserts a meta-market tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see META_MARKET_TUNABLE_CAPS (11 numeric scalar keys).
   * String keys (default_visibility, default_region_id) are NOT supported — they have no numeric range.
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 422/VALIDATION_FAILED.
   * Clamping: applied per META_MARKET_TUNABLE_CAPS min/max range (clampMetaMarketToRange).
   *
   * REUSE pattern: IAAdminController.patchIATunable + LegalAdminController.patchLawyerTunable.
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/meta_market')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchMetaMarketTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body ?? {};
    const range = META_MARKET_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown meta_market tunable key: '${key}'. Allowed: ${Object.keys(META_MARKET_TUNABLE_CAPS).join(', ')}`,
      });
    }

    // Apply BO cap (clampMetaMarketToRange from tunables file — no inline literals, R2.3).
    const clampedValue = clampMetaMarketToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: IAAdminController.patchIATunable upsert pattern (C9).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'meta-market-admin-c8',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'meta-market-admin-c8',
        },
      });

    // F3 DEFERRED marker — same precedent as IAAdminController.patchIATunable.
    return { key, clampedValue, f3_deferred: true };
  }
}

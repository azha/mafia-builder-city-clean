// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §NestJS-BO :223-228
//             docs/superpowers/plans/2026-06-16-depth-d1b-impl-plan.md Task 7 (C7)
//             — D1b C7 — 2026-06-16
//
// `MarketAdminController` — BO true-state endpoints for the 4 market mechanics (P5 inversion: ops
// sees raw scalars; player never does — market_mechanics.md §R2.2).
//
// 4 GET true-state endpoints, role `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping):
//   GET /v1/admin/market/lane-pricing/:districtId/:substance  — true P, W, c, t_refractory
//   GET /v1/admin/market/composition-telegraph/:regionId/:playerId  — true roster + q_inferred raw
//   GET /v1/admin/market/wearmark/:storageId  — true handling vector (null if no row)
//   GET /v1/admin/market/carrying-capacity/:districtId  — true K, Q_total, T_over
//
// 2 action endpoints, role `admin`:
//   POST /v1/admin/market/force-lane-jam  — manual jam trigger (live-ops)
//   PUT  /v1/admin/tunables/market        — live-ops tunable edit; BO caps REUSE T.bo.economic.*
//
// F3 two-person-rule: DEFERRED. this route is NOT WIRED to the ch17 approval workflow present in the
// codebase (D1b C7 carry-forward). These endpoints are gated by `requireStaffRole('admin')` only.
// Wiring this to the ch17 workflow (TD-107) means replacing the admin-role-only guard with the two-person
// approval check. This MUST be noted in the reviewer⊥ gate.
//
// Note on role mapping: `ops` in market_mechanics.md:223-228 = `gm` in StaffRoleEnum
// (global_conventions_backoffice.md §Note: "placeholder `ops` (lecture étendue) est mappé à `gm`").
// `admin` in market_mechanics.md:227-228 = `admin` in StaffRoleEnum (ordinal 3).
//
// BO caps REUSE (gdd/14:2483-2486):
//   T.bo.economic.lane_confidence_max (0.5..1.0)
//   T.bo.economic.lane_price_max (0..100000)
//   T.bo.economic.lane_halfwidth_max (0..50000)
//   T.bo.economic.jam_refractory_max_minutes (0..240)
//
// TunablesStore: the `tunable_overrides` table write path uses an INSERT ... ON CONFLICT DO UPDATE
// (upsert) against the Drizzle `tunableOverrides` schema. The TunablesStore reads-back via LISTEN
// (auto-reload on NOTIFY). The write here uses the `db` DrizzleClient directly — same singleton
// used by all market services (DbModule @Global() — no explicit import needed).

import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { TunablesStore } from '../../config/tunables-store';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { LaneCollapsePricingService, type SubstanceTypeValue } from './lane-collapse-pricing.service';
import { CompositionTelegraphService } from './composition-telegraph.service';
import { WearMarkPremiumService } from './wear-mark-premium.service';
import { CarryingCapacityHazeService } from './carrying-capacity-haze.service';

// ── BO-cap allowed tunable keys and their cap functions (REUSE gdd/14:2483-2486) ──────────────────

/** Allowed tunable keys writable via PUT /v1/admin/tunables/market and their BO-cap validators. */
const MARKET_TUNABLE_CAPS: Record<string, (value: number) => number> = {
  // T.bo.economic.lane_confidence_max — range 0.5..1.0 (gdd/14:2483)
  'T.bo.economic.lane_confidence_max': (v: number) =>
    Math.min(
      TunablesStore.resolveFloat('T.bo.economic.lane_confidence_max', 'BO_ECONOMIC_LANE_CONFIDENCE_MAX', 1.0),
      Math.max(0.5, v),
    ),
  // T.bo.economic.lane_price_max — range 0..100000 (gdd/14:2484)
  'T.bo.economic.lane_price_max': (v: number) =>
    Math.min(
      TunablesStore.resolveInt('T.bo.economic.lane_price_max', 'BO_ECONOMIC_LANE_PRICE_MAX', 100000),
      Math.max(0, v),
    ),
  // T.bo.economic.lane_halfwidth_max — range 0..50000 (gdd/14:2485)
  'T.bo.economic.lane_halfwidth_max': (v: number) =>
    Math.min(
      TunablesStore.resolveInt('T.bo.economic.lane_halfwidth_max', 'BO_ECONOMIC_LANE_HALFWIDTH_MAX', 50000),
      Math.max(0, v),
    ),
  // T.bo.economic.jam_refractory_max_minutes — range 0..240 (gdd/14:2486)
  'T.bo.economic.jam_refractory_max_minutes': (v: number) =>
    Math.min(
      TunablesStore.resolveInt('T.bo.economic.jam_refractory_max_minutes', 'BO_ECONOMIC_JAM_REFRACTORY_MAX_MINUTES', 240),
      Math.max(0, v),
    ),
};

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceLaneJamBody {
  districtId: number;
  substanceType: SubstanceTypeValue;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `MarketAdminController` — production BO routes for market true-state inspection and live-ops actions.
 *
 * Path prefix: `admin/market` and `admin/tunables` — with the global `v1` prefix from main.ts
 * `app.setGlobalPrefix('v1')` → these routes are reachable at `/v1/admin/market/...`
 * and `/v1/admin/tunables/market`.
 *
 * NOT conditional on NODE_ENV (unlike MarketTestController) — these are real production BO routes
 * that must be available in production (ops and admin staff need them for live monitoring).
 *
 * Mounted as a separate controller in MarketModule.controllers alongside MarketTestController.
 */
@Controller('admin')
export class MarketAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly laneCollapse: LaneCollapsePricingService,
    private readonly compositionTelegraph: CompositionTelegraphService,
    private readonly wearMark: WearMarkPremiumService,
    private readonly carryingCapacity: CarryingCapacityHazeService,
  ) {}

  // ─── 4 GET true-state endpoints (role `gm`) ──────────────────────────────────

  /**
   * `GET /v1/admin/market/lane-pricing/:districtId/:substance`
   *
   * P5 BO INVERSION: returns raw lane scalars (p_cents, w_cents, c, t_refractory_minutes) that
   * are NEVER forwarded to the player surface. Ops staff uses this for live market monitoring.
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   * Returns null if no lane row exists yet for the given district/substance pair.
   */
  @Get('market/lane-pricing/:districtId/:substance')
  @UseGuards(requireStaffRole('gm'))
  async getLanePricing(
    @Param('districtId') districtId: string,
    @Param('substance') substance: string,
  ) {
    const row = await this.laneCollapse.getLaneRow(
      Number.parseInt(districtId, 10),
      substance as SubstanceTypeValue,
    );
    if (!row) {
      return { p_cents: null, w_cents: null, c: null, t_refractory_minutes: null };
    }
    // P5 BO inversion: expose raw scalars — this is intentional (ops sees what player never does).
    return {
      p_cents: row.p_cents,
      w_cents: row.w_cents,
      c: row.c,
      t_refractory_minutes: row.t_refractory_minutes,
    };
  }

  /**
   * `GET /v1/admin/market/composition-telegraph/:regionId/:playerId`
   *
   * P5 BO INVERSION: returns raw roster_entries array AND q_inferred float. The q_inferred float
   * is NEVER forwarded to the player (R2.2 P5 invariant) — ops uses it for buyer-quality monitoring.
   *
   * Role: `gm`.
   */
  @Get('market/composition-telegraph/:regionId/:playerId')
  @UseGuards(requireStaffRole('gm'))
  async getCompositionTelegraph(
    @Param('regionId') regionId: string,
    @Param('playerId') playerId: string,
  ) {
    const rosterEntries = await this.compositionTelegraph.getRosterEntries(
      playerId,
      Number.parseInt(regionId, 10),
    );
    const qInferred = await this.compositionTelegraph.getQInferred(
      playerId,
      Number.parseInt(regionId, 10),
    );
    // P5 BO inversion: raw roster + q_inferred exposed to ops.
    return {
      roster_entries: rosterEntries,
      q_inferred: qInferred,
    };
  }

  /**
   * `GET /v1/admin/market/wearmark/:storageId?playerId=<uuid>`
   *
   * P5 BO INVERSION: returns the raw lot_handling_vector (null if no row exists).
   * The lot handling vector is NEVER forwarded to the player (R2.2 P5 invariant).
   * Ops uses this to inspect lot-handling state for live-ops monitoring.
   *
   * Query param: `playerId` — required to identify the (player, storage_id) pair.
   * Role: `gm`.
   */
  @Get('market/wearmark/:storageId')
  @UseGuards(requireStaffRole('gm'))
  async getWearMarkVector(
    @Param('storageId') storageId: string,
    @Query('playerId') playerId: string,
  ) {
    const vector = await this.wearMark.getLotVector(storageId, playerId ?? '');
    // P5 BO inversion: raw lot_handling_vector exposed to ops (null if no row).
    return { lot_handling_vector: vector };
  }

  /**
   * `GET /v1/admin/market/carrying-capacity/:districtId`
   *
   * P5 BO INVERSION: returns raw k_current, q_total, t_over scalars. These are NEVER forwarded to
   * the player (R2.2 P5 invariant). Ops uses this for district throughput monitoring.
   *
   * Role: `gm`.
   * Returns null values if no capacity row exists yet for the district.
   */
  @Get('market/carrying-capacity/:districtId')
  @UseGuards(requireStaffRole('gm'))
  async getCarryingCapacity(@Param('districtId') districtId: string) {
    const row = await this.carryingCapacity.getCapacityRow(
      Number.parseInt(districtId, 10),
    );
    if (!row) {
      return { k_current: null, q_total: null, t_over: null };
    }
    // P5 BO inversion: raw k_current, q_total, t_over exposed to ops.
    return {
      k_current: row.k_current,
      q_total: row.q_total,
      t_over: row.t_over,
    };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED) ─────────────────────────

  /**
   * `POST /v1/admin/market/force-lane-jam`
   *
   * Live-ops action: force-arms the refractory timer on a lane (manual jam trigger).
   * Ensures the lane row exists (ensureLane), then sets t_refractory_minutes to the
   * BO-capped maximum jam duration (T.bo.economic.jam_refractory_max_minutes — gdd/14:2486).
   *
   * Body: { districtId: number, substanceType: SubstanceTypeValue }
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward).
   * Role: `admin` (only; F3 would add a second-approver check on top).
   */
  @Post('market/force-lane-jam')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceLaneJam(@Body() body: ForceLaneJamBody) {
    const { districtId, substanceType } = body;
    const dId = Number.parseInt(String(districtId), 10);
    // BO cap: jam_refractory_max_minutes (gdd/14:2486). NEVER hard-coded.
    const jamMinutes = TunablesStore.resolveInt(
      'T.bo.economic.jam_refractory_max_minutes',
      'BO_ECONOMIC_JAM_REFRACTORY_MAX_MINUTES',
      240,
    );
    // Ensure lane exists, then arm the refractory timer via LaneCollapsePricingService.
    await this.laneCollapse.ensureLane(dId, substanceType);
    await this.laneCollapse.forceJam(dId, substanceType, jamMinutes);
    return { districtId: dId, substanceType, t_refractory_minutes: jamMinutes, f3_deferred: true };
  }

  /**
   * `PUT /v1/admin/tunables/market`
   *
   * Live-ops tunable edit: upserts a market tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys (REUSE gdd/14:2483-2486):
   *   - T.bo.economic.lane_confidence_max (0.5..1.0)
   *   - T.bo.economic.lane_price_max (0..100000)
   *   - T.bo.economic.lane_halfwidth_max (0..50000)
   *   - T.bo.economic.jam_refractory_max_minutes (0..240)
   *
   * Body: { key: string, value: number }
   * Returns: { key, value } where value is the BO-capped accepted value.
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward).
   * Role: `admin` (only; F3 would add a second-approver check on top).
   */
  @Put('tunables/market')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchMarketTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = MARKET_TUNABLE_CAPS[key];
    if (!capFn) {
      // Unknown key — reject. Only the 4 BO economic keys are writable via this endpoint.
      // (A future expansion can add more keys; this is the D1b C7 scope.)
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown market tunable key: '${key}'. Allowed: ${Object.keys(MARKET_TUNABLE_CAPS).join(', ')}`,
      });
    }
    // Apply BO cap (gdd/14:2483-2486 — NEVER hard-coded, always via TunablesStore.resolve*).
    const cappedValue = capFn(Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(cappedValue),
        updated_at: sql`now()`,
        updated_by: 'market-admin-c7',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(cappedValue),
          updated_at: sql`now()`,
          updated_by: 'market-admin-c7',
        },
      });

    return { key, value: cappedValue, f3_deferred: true };
  }
}

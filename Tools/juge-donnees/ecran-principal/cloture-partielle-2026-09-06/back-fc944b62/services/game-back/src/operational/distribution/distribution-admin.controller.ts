// IMPLEMENTS: docs/superpowers/plans/2026-06-21-depth-system9-distribution-plan.md Task C12
//             Pattern: services/game-back/src/operational/insurance/insurance-admin.controller.ts
//             Pattern: services/game-back/src/operational/reputation/reputation-admin.controller.ts
//             — System 9 C12 — 2026-06-21
//
// `DistributionAdminController` — BO admin endpoints for the System 9 distribution mechanics (P5 BO inversion).
//
// Routes:
//   GET  /v1/admin/players/:id/distribution-state  — raw true-state (gm role) — C12
//   POST /v1/admin/players/:id/force-caught         — force markCourierCaught (admin + F3 DEFERRED TD-107) — C12
//   PUT  /v1/admin/tunables/distribution            — tunable override (admin + F3 DEFERRED) — C12
//
// P5 BO INVERSION (R2.2): BO ops sees raw true state including patrol_heat, sessions_active,
// leak_magnitude. These scalars are NEVER forwarded to the player projection.
//
// F3 two-person-rule: DEFERRED. Same precedent as InsuranceAdminController / ReputationAdminController (TD-107).
// The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
//
// NOT conditional on NODE_ENV (real BO routes — always-on in production).
// Registered in DistributionModule.controllers (no test-gate; same as InsuranceAdminController).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { CourierDetectionService } from './courier-detection.service';
import { courier, courierShift, caughtException, route, corridorDebt, vehicleInventory, routeRequest } from '../../db/schema/operational_chain';
import { DISTRIBUTION_TUNABLE_CAPS, distributionAutomationHubsTunables } from './distribution-tunables';
import { lieutenant, behaviorScript } from '../../db/schema/lieutenant';
import { DistributionRepository } from './distribution.repository';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceCaughtBody {
  /** The shift ID to force-catch. */
  shiftId: string;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `DistributionAdminController` — production BO routes for distribution true-state inspection
 * and live-ops actions (P5 BO inversion: ops sees raw hidden state that the player never does).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/distribution-state`,
 * `/v1/admin/players/:id/force-caught`, and `/v1/admin/tunables/distribution`.
 *
 * NOT conditional on NODE_ENV (unlike DistributionTestController) — these are real production BO routes
 * that must be available in production (ops and admin staff need them for live monitoring).
 *
 * Mounted always-on in DistributionModule.controllers (alongside the test-gated DistributionTestController).
 *
 * F3 two-person-rule: DEFERRED (TD-107). Same precedent as InsuranceAdminController.
 * The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 */
@Controller('admin')
export class DistributionAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly courierDetection: CourierDetectionService,
    // C9 — DistributionRepository: for getOwnedOperationalHub (hub-tier for vehicles endpoint).
    private readonly repo: DistributionRepository,
  ) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ───────────────────────────

  /**
   * `GET /v1/admin/players/:id/distribution-state`
   *
   * P5 BO INVERSION: returns the raw true state for all distribution entities for a player.
   * The raw hidden scalars returned here (patrol_heat, sessions_active, leak_magnitude) are
   * NEVER forwarded to the player (R2.2 P5 invariant). Ops staff uses this for live monitoring.
   *
   * Returns:
   *   - couriers: all courier rows for the player (includes sessions_active, current_state — BO-only)
   *   - shifts: all courier_shift rows (includes patrol_heat — BO-only)
   *   - caught_exceptions: all caught_exception rows (includes status, leak_magnitude — BO-only)
   *
   * NO R2.2 banding here — this is the P5 BO inversion: raw server-side state for ops.
   * patrol_heat and sessions_active are intentionally included (they are the point of the BO route).
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('players/:id/distribution-state')
  @UseGuards(requireStaffRole('gm'))
  async getDistributionState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player distribution entities.
    // patrol_heat, sessions_active, leak_magnitude are intentionally included (server-only scalars exposed to ops only).

    const couriers = await this.db
      .select()
      .from(courier)
      .where(eq(courier.player_id, playerId));

    const shifts = await this.db
      .select()
      .from(courierShift)
      .where(eq(courierShift.player_id, playerId));

    const caught_exceptions = await this.db
      .select()
      .from(caughtException)
      .where(eq(caughtException.player_id, playerId));

    // Serialize bigint fields as strings for JSON transport (JSON.stringify cannot handle bigint).
    function serializeBigints(rows: Record<string, unknown>[]): Record<string, unknown>[] {
      return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = typeof v === 'bigint' ? String(v) : v;
        }
        return out;
      });
    }

    return {
      player_id: playerId,
      couriers: serializeBigints(couriers as Record<string, unknown>[]),
      shifts: serializeBigints(shifts as Record<string, unknown>[]),
      caught_exceptions: serializeBigints(caught_exceptions as Record<string, unknown>[]),
    };
  }

  // ─── C13: GET routes endpoint (role `gm`) ────────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/routes` — C13 BO true-state: raw route data (role `gm`).
   *
   * P5 BO INVERSION: returns raw route true-state for the player — sinuosity_index,
   * straight_line_distance, path_blocks, state, version, stance, vehicle_type, route_name,
   * river_crossings, ephemeral_mode. These raw scalars are NEVER forwarded to the player
   * projection (R2.2 — player sees only banded equivalents via listRouteProjections).
   *
   * Auth: Bearer JWT with staff role `gm` (requireStaffRole — same guard as distribution-state).
   * Returns: { routes: [...] } — all route rows for the player.
   */
  @Get('players/:id/routes')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerRoutes(
    @Param('id') playerId: string,
  ): Promise<{ routes: Record<string, unknown>[] }> {
    const routes = await this.db
      .select({
        route_id: route.route_id,
        player_id: route.player_id,
        sinuosity_index: route.sinuosity_index,
        straight_line_distance: route.straight_line_distance,
        path_blocks: route.path_blocks,
        state: route.state,
        version: route.version,
        stance: route.stance,
        vehicle_type: route.vehicle_type,
        route_name: route.route_name,
        river_crossings: route.river_crossings,
        ephemeral_mode: route.ephemeral_mode,
      })
      .from(route)
      .where(eq(route.player_id, playerId));

    // Serialize bigints as strings (JSON transport).
    const serialized = routes.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
        out[k] = typeof v === 'bigint' ? String(v) : v;
      }
      return out;
    });

    return { routes: serialized };
  }

  // ─── C13: GET corridor-debt endpoint (role `gm`) ─────────────────────────────

  /**
   * `GET /v1/admin/players/:id/corridor-debt` — C13 BO true-state: raw corridor_debt (role `gm`).
   *
   * P5 BO INVERSION: returns raw corridor_debt rows for the player — debt_magnitude, block_id,
   * last_updated_tick. These raw scalars are NEVER forwarded to the player (R2.2).
   * The player's projection never exposes debt_magnitude (BO-only per DD-DEBT-SSOT D3).
   *
   * Auth: Bearer JWT with staff role `gm` (requireStaffRole — same guard as distribution-state).
   * Returns: { corridor_debt: [...] } — may be empty for a player with no dispatches yet.
   */
  @Get('players/:id/corridor-debt')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerCorridorDebt(
    @Param('id') playerId: string,
  ): Promise<{ corridor_debt: Record<string, unknown>[] }> {
    const rows = await this.db
      .select()
      .from(corridorDebt)
      .where(eq(corridorDebt.player_id, playerId));

    // Serialize bigints (last_updated_tick is bigint).
    const serialized = (rows as Record<string, unknown>[]).map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = typeof v === 'bigint' ? String(v) : v;
      }
      return out;
    });

    return { corridor_debt: serialized };
  }

  // ─── C13: GET vehicles endpoint (role `gm`) ──────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/vehicles` — C13 BO true-state: raw vehicle_inventory (role `gm`).
   * Extended in C9 to include `buyable_tier` (vehiclePurchaseRequiredTier) and `hub_tier`
   * (the player's current hub tier, for ops to see if the gate would pass at purchase time).
   *
   * P5 BO INVERSION: returns raw vehicle_inventory rows for the player — count, vehicle_type,
   * plus the C9 extensions: buyable_tier (tier required to purchase) + hub_tier (player's hub tier).
   * The raw count is NEVER forwarded to the player projection (R2.2 — player sees only the
   * categorical available_vehicles list from listRouteProjections/projectCoordinatorState).
   *
   * Auth: Bearer JWT with staff role `gm` (requireStaffRole — same guard as distribution-state).
   * Returns: { vehicles: [...], hub_tier: number|null } — all vehicle_inventory rows + hub tier.
   */
  @Get('players/:id/vehicles')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerVehicles(
    @Param('id') playerId: string,
  ): Promise<{ vehicles: Record<string, unknown>[]; hub_tier: number | null }> {
    const rows = await this.db
      .select()
      .from(vehicleInventory)
      .where(eq(vehicleInventory.player_id, playerId));

    // C9 extension: add buyable_tier (from tunables) + the player's hub_tier (for ops context).
    const hub = await this.repo.getOwnedOperationalHub(playerId);
    const rawHubTier: number | null = hub?.hubTier ?? null;

    const vehicles = (rows as Record<string, unknown>[]).map((row) => ({
      ...row,
      buyable_tier: distributionAutomationHubsTunables.vehiclePurchaseRequiredTier(row['vehicle_type'] as string),
    }));

    return { vehicles, hub_tier: rawHubTier };
  }

  // ─── C9: GET hub-coordinators endpoint (role `gm`) ───────────────────────────

  /**
   * `GET /v1/admin/players/:id/hub-coordinators` — C9 BO true-state: coordinator lieutenants (role `gm`).
   *
   * P5 BO INVERSION: returns the raw coordinator state for ops — including the raw rule-count
   * (script_complexity_bucket on the player surface) and pending route_request count (both
   * BO-only scalars, never forwarded to the player projection per R2.2).
   *
   * Queries lieutenants WHERE player_id = playerId AND role_id = 6 (LOGISTICS) AND mode = 'delegated'.
   * For each coordinator: JOIN behavior_script to get the compiled rules (→ rule_count);
   * COUNT pending route_requests for that coordinator's hub.
   *
   * Auth: Bearer JWT with staff role `gm` (requireStaffRole).
   * Returns: { coordinators: [{ lieutenant_id, hub_building_id, target_building_id, rule_count, pending_requests }] }
   */
  @Get('players/:id/hub-coordinators')
  @UseGuards(requireStaffRole('gm'))
  async getHubCoordinators(
    @Param('id') playerId: string,
  ): Promise<{ coordinators: Record<string, unknown>[] }> {
    // Query LOGISTICS (role_id=6) delegated lieutenants with their behavior_script rules.
    const ltRows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        hub_building_id: lieutenant.assigned_building_id,
        target_building_id: lieutenant.target_building_id,
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.role_id, 6), // LOGISTICS_ROLE_ID = 6 (Courier coordinator)
          eq(lieutenant.mode, 'delegated'),
        ),
      );

    // For each coordinator, derive rule_count and pending_requests.
    const coordinators: Record<string, unknown>[] = [];
    for (const lt of ltRows) {
      // rule_count: raw count from compiled IR rules (BO-only; never forwarded to player projection).
      const compiledRules = (lt.rules as { rules?: unknown[] } | null) ?? null;
      const rule_count = compiledRules?.rules?.length ?? 0;

      // pending_requests: count pending route_request rows for this hub.
      let pending_requests = 0;
      if (lt.hub_building_id !== null) {
        const [pendingRow] = await this.db
          .select({ cnt: count() })
          .from(routeRequest)
          .where(
            and(
              eq(routeRequest.player_id, playerId),
              eq(routeRequest.hub_id, lt.hub_building_id),
              eq(routeRequest.status, 'pending'),
            ),
          );
        pending_requests = Number(pendingRow?.cnt ?? 0);
      }

      coordinators.push({
        lieutenant_id: lt.lieutenant_id,
        hub_building_id: lt.hub_building_id,
        target_building_id: lt.target_building_id,
        rule_count,
        pending_requests,
      });
    }

    return { coordinators };
  }

  // ─── C9: GET fleet-occupancy endpoint (role `gm`) ────────────────────────────

  /**
   * `GET /v1/admin/players/:id/fleet-occupancy` — C9 BO true-state: per-type fleet occupancy (role `gm`).
   *
   * P5 BO INVERSION: returns the raw in-transit counts + fleet caps for each vehicle type.
   * These raw scalars are NEVER forwarded to the player projection (R2.2 — player sees only the
   * `fleet_occupancy_band` per-type band from `projectCoordinatorState`).
   *
   * For each vehicle type (foot, bike, car, van): COUNT in-transit courier_shifts + the fleet cap
   * from `distributionAutomationHubsTunables.fleetCapInTransit(type)`.
   *
   * Auth: Bearer JWT with staff role `gm` (requireStaffRole).
   * Returns: { fleet: { foot: { in_transit_count, fleet_cap }, bike: {...}, car: {...}, van: {...} } }
   */
  @Get('players/:id/fleet-occupancy')
  @UseGuards(requireStaffRole('gm'))
  async getFleetOccupancy(
    @Param('id') playerId: string,
  ): Promise<{ fleet: Record<string, { in_transit_count: number; fleet_cap: number }> }> {
    // 'van' is NOT a valid vehicle_type enum value — use 'refrigerated_van' (the actual DB enum member).
    const vehicleTypes = ['foot', 'bike', 'car', 'refrigerated_van'] as const;
    const fleet: Record<string, { in_transit_count: number; fleet_cap: number }> = {};

    for (const vtype of vehicleTypes) {
      // COUNT in-transit courier_shifts for this vehicle type (JOIN courier on vehicle_type).
      const [countRow] = await this.db
        .select({ cnt: count() })
        .from(courierShift)
        .innerJoin(courier, eq(courierShift.courier_id, courier.courier_id))
        .where(
          and(
            eq(courierShift.player_id, playerId),
            eq(courierShift.status, 'in_transit'),
            eq(courier.vehicle_type, vtype as any),
          ),
        );
      const in_transit_count = Number(countRow?.cnt ?? 0);
      const fleet_cap = distributionAutomationHubsTunables.fleetCapInTransit(vtype);
      fleet[vtype] = { in_transit_count, fleet_cap };
    }

    return { fleet };
  }

  // ─── POST force-caught endpoint (role `admin`, F3 DEFERRED — TD-107) ─────────

  /**
   * `POST /v1/admin/players/:id/force-caught`
   *
   * Live-ops action: manually mark a courier shift as caught via the shared markCourierCaught path.
   * Calls CourierDetectionService.markCourierCaught(playerId, shiftId, 'layer2_segment', 0).
   *
   * Body: { shiftId: string }
   * Returns: { playerId, shiftId, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as InsuranceAdminController.forceFraudDetection.
   * R13 closeout MUST join this to TD-107.
   *
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('players/:id/force-caught')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2/insurance).
  // F3 TwoPersonApproval: the ch17 workflow shipped in migration 0152; wiring this guard to it is TD-107.
  @UseGuards(requireStaffRole('admin'))
  async forceCaught(@Param('id') playerId: string, @Body() body: ForceCaughtBody) {
    const { shiftId } = body;

    // Delegate to the shared idempotent markCourierCaught path (DIV-1/2/3 convergence point).
    // source='layer2_segment': the force-catch is treated as a Layer-2 segment detection for audit.
    // gameMinute=0: ops-triggered, not tied to a real game tick.
    await this.courierDetection.markCourierCaught(playerId, shiftId, 'layer2_segment', 0);

    // F3 DEFERRED marker — same precedent as insurance-admin.controller.ts and reputation-admin.controller.ts.
    return {
      playerId,
      shiftId,
      f3_deferred: true,
    };
  }

  // ─── PUT tunables/distribution endpoint (role `admin`, F3 DEFERRED — TD-107) ─

  /**
   * `PUT /v1/admin/tunables/distribution`
   *
   * Live-ops tunable edit: upserts a distribution tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see DISTRIBUTION_TUNABLE_CAPS (the BO live-ops balance levers).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * REUSE pattern: insurance-admin.controller.ts (PUT tunables/insurance) / reputation-admin.controller.ts.
   * DISTRIBUTION_TUNABLE_CAPS imported from distribution-tunables.ts — NOT redeclared here.
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // Same TD-107 precedent. R13 closeout MUST join this to TD-107.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/distribution')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2/insurance).
  @UseGuards(requireStaffRole('admin'))
  async patchDistributionTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = DISTRIBUTION_TUNABLE_CAPS[key];
    if (!capFn) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown distribution tunable key: '${key}'. Allowed: ${Object.keys(DISTRIBUTION_TUNABLE_CAPS).join(', ')}`,
      });
    }
    // Apply BO cap (never inline — all magnitudes from ranges in DISTRIBUTION_TUNABLE_CAPS).
    const clampedValue = capFn(Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: insurance-admin.controller.ts upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'distribution-admin-c12',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'distribution-admin-c12',
        },
      });

    // F3 DEFERRED marker — same precedent as insurance-admin.controller.ts.
    return { key, clampedValue, f3_deferred: true };
  }
}

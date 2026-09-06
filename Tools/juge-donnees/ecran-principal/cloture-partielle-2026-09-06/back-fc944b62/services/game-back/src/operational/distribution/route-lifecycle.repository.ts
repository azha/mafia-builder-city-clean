// IMPLEMENTS: docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 1 (C1)
//             System 9 §9b Route-lifecycle — C1 route schema persistence CRUD
//             Pattern: distribution-detection.repository.ts (C1 9a — the same-chunk repo pattern)
//
// `RouteLifecycleRepository` — Drizzle CRUD over the route NEW cols (C1).
// Additive per chunk: C8 adds corridor_debt CRUD; C9 adds route_version_history CRUD;
// C11 adds vehicle_inventory CRUD; C12 adds courier_shift.cold_chain_powered read/write.
//
// R9.3: schema is defined in operational_chain.ts (no redefinition here).
// C4: no Math.random, no Date.now.
// R2.2: straight_line_distance / sinuosity_index are BO-only (never returned to player client).
//       This repo is TEST-only-driven for C1; production consumers land C7+.
//
// Anti-fabrication: no [PROV-Y26Q2] scalar inlined here — tunables land in C2.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { route, routeVersionHistory } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';

/** The NEW routing/persistence columns on `route` (C1 — mig 0075). */
export interface RouteLifecycleInsertParams {
  player_id: string;
  origin_building_id: string;
  destination_building_id: string;
  /** A* path (BlockId[]). For C1 seed, a minimal 2-stop path. */
  path_blocks?: number[];
  river_crossings?: number;
  ephemeral_mode?: boolean;
  /** NEW C1 cols — all optional (safe defaults in DB). */
  straight_line_distance?: number;
  sinuosity_index?: number;
  stance?: 'fastest' | 'balanced' | 'evasive';
  vehicle_type?: 'foot' | 'bike' | 'car' | 'refrigerated_van';
  route_name?: string | null;
  is_saved?: boolean;
  state?: 'draft' | 'active' | 'saturated' | 'severed';
  version?: number;
}

/** Minimal row shape returned by readRoute — all C1 columns. */
export interface RouteRow {
  route_id: string;
  player_id: string;
  origin_building_id: string;
  destination_building_id: string;
  path_blocks: unknown;
  river_crossings: number;
  ephemeral_mode: boolean;
  straight_line_distance: number;
  sinuosity_index: number;
  stance: string;
  vehicle_type: string;
  route_name: string | null;
  is_saved: boolean;
  state: string;
  version: number;
}

@Injectable()
export class RouteLifecycleRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Insert a route row with the C1 NEW cols.
   * Returns the `route_id` of the created row.
   *
   * Used by: DistributionTestController (C1 seed-route), RouteService (C7 createRoute).
   * C4: no Math.random, no Date.now.
   */
  async insertRoute(params: RouteLifecycleInsertParams): Promise<{ route_id: string }> {
    const [row] = await this.db
      .insert(route)
      .values({
        player_id: params.player_id,
        origin_building_id: params.origin_building_id,
        destination_building_id: params.destination_building_id,
        path_blocks: params.path_blocks ?? [0, 1],
        river_crossings: params.river_crossings ?? 0,
        ephemeral_mode: params.ephemeral_mode ?? false,
        // C1 NEW cols — DB defaults apply when not supplied.
        ...(params.straight_line_distance !== undefined && { straight_line_distance: params.straight_line_distance }),
        ...(params.sinuosity_index !== undefined && { sinuosity_index: params.sinuosity_index }),
        ...(params.stance !== undefined && { stance: params.stance }),
        ...(params.vehicle_type !== undefined && { vehicle_type: params.vehicle_type }),
        ...(params.route_name !== undefined && { route_name: params.route_name }),
        ...(params.is_saved !== undefined && { is_saved: params.is_saved }),
        ...(params.state !== undefined && { state: params.state }),
        ...(params.version !== undefined && { version: params.version }),
      })
      .returning({ route_id: route.route_id });
    if (!row) throw new Error('RouteLifecycleRepository.insertRoute: insert returned no row');
    return { route_id: row.route_id };
  }

  /**
   * Read a route row by route_id — returns all C1 columns.
   * Used by: DistributionTestController (C1 read-route), RouteService (C7).
   * R2.2: straight_line_distance / sinuosity_index are BO-only — this method is for internal/test use.
   */
  async readRoute(routeId: string): Promise<RouteRow | null> {
    const [row] = await this.db
      .select({
        route_id: route.route_id,
        player_id: route.player_id,
        origin_building_id: route.origin_building_id,
        destination_building_id: route.destination_building_id,
        path_blocks: route.path_blocks,
        river_crossings: route.river_crossings,
        ephemeral_mode: route.ephemeral_mode,
        straight_line_distance: route.straight_line_distance,
        sinuosity_index: route.sinuosity_index,
        stance: route.stance,
        vehicle_type: route.vehicle_type,
        route_name: route.route_name,
        is_saved: route.is_saved,
        state: route.state,
        version: route.version,
      })
      .from(route)
      .where(eq(route.route_id, routeId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Update the route's path + sinuosity after an A* recompute (C7/C9 replan).
   * Additive — all other cols unchanged.
   * C4: no Math.random.
   */
  async updateRoutePath(
    routeId: string,
    params: {
      path_blocks: number[];
      straight_line_distance: number;
      sinuosity_index: number;
      river_crossings: number;
    },
  ): Promise<void> {
    await this.db
      .update(route)
      .set({
        path_blocks: params.path_blocks,
        straight_line_distance: params.straight_line_distance,
        sinuosity_index: params.sinuosity_index,
        river_crossings: params.river_crossings,
      })
      .where(eq(route.route_id, routeId));
  }

  /**
   * Update the route's state (DD-SEVER §4.3 threshold compare output).
   * Deterministic — a pure threshold compare result (C9).
   */
  async updateRouteState(
    routeId: string,
    state: 'draft' | 'active' | 'saturated' | 'severed',
  ): Promise<void> {
    await this.db
      .update(route)
      .set({ state })
      .where(eq(route.route_id, routeId));
  }

  /**
   * Bump the route version on replan (DD-REPLAN §4.4).
   * Sets state back to 'active' + increments version.
   */
  async bumpRouteVersion(routeId: string, newVersion: number): Promise<void> {
    await this.db
      .update(route)
      .set({ version: newVersion, state: 'active' })
      .where(eq(route.route_id, routeId));
  }

  /**
   * Archive a prior path_blocks snapshot to route_version_history (DD-REPLAN §4.4, OQ-RP1).
   * Called by RouteService.replanRoute BEFORE overwriting the route's path_blocks + bumping version.
   * `version` = the OLD route.version (the one being archived).
   * `severed_at_tick` = null if the route was not severed; set if state='severed' at replan time.
   * `replanned_at_tick` = game-minute from ctx (deterministic, no Date.now).
   * C4: no Math.random, no Date.now.
   */
  async insertVersionHistory(params: {
    route_id: string;
    version: number;
    path_blocks: number[];
    severed_at_tick: bigint | null;
    replanned_at_tick: bigint;
  }): Promise<{ history_id: string }> {
    const [row] = await this.db
      .insert(routeVersionHistory)
      .values({
        route_id: params.route_id,
        version: params.version,
        path_blocks: params.path_blocks,
        severed_at_tick: params.severed_at_tick,
        replanned_at_tick: params.replanned_at_tick,
      })
      .returning({ history_id: routeVersionHistory.history_id });
    if (!row) throw new Error('RouteLifecycleRepository.insertVersionHistory: insert returned no row');
    return { history_id: row.history_id };
  }

  /**
   * List all archived versions for a route, ordered by version asc.
   * Used by _test endpoints to verify the version chain (OQ-RP1).
   */
  async listVersionHistory(routeId: string): Promise<Array<{
    history_id: string;
    route_id: string;
    version: number;
    path_blocks: unknown;
    severed_at_tick: string | null;  // bigint serialized as string (JSON-safe)
    replanned_at_tick: string;       // bigint serialized as string
  }>> {
    const rows = await this.db
      .select({
        history_id: routeVersionHistory.history_id,
        route_id: routeVersionHistory.route_id,
        version: routeVersionHistory.version,
        path_blocks: routeVersionHistory.path_blocks,
        severed_at_tick: routeVersionHistory.severed_at_tick,
        replanned_at_tick: routeVersionHistory.replanned_at_tick,
      })
      .from(routeVersionHistory)
      .where(eq(routeVersionHistory.route_id, routeId))
      .orderBy(routeVersionHistory.version);
    // bigint mode:'bigint' → BigInt in JS; serialize to string for JSON-safety.
    return rows.map((r) => ({
      history_id: r.history_id,
      route_id: r.route_id,
      version: r.version,
      path_blocks: r.path_blocks,
      severed_at_tick: r.severed_at_tick !== null ? String(r.severed_at_tick) : null,
      replanned_at_tick: String(r.replanned_at_tick),
    }));
  }

  // ── P3-C C7 — Loop 4 Sinuosity Debt: patch/collapse/rebuild/dents (ruling-B dual-drivers) ──────────

  /**
   * Read a route row with the C7 additive columns (`patch_count`/`last_rebuilt_at_tick`/
   * `rebuild_completes_at_tick`, migration 0125) alongside every C1 column `readRoute` already exposes.
   * Used by `RoutePatchSweepService`/`RouteRebuildService` (both need the C7 columns; `readRoute` itself
   * is left UNCHANGED — additive, no existing caller's shape shifts).
   */
  async readRouteExtended(routeId: string): Promise<(RouteRow & {
    patch_count: number;
    last_rebuilt_at_tick: number | null;
    rebuild_completes_at_tick: number | null;
  }) | null> {
    const [row] = await this.db
      .select({
        route_id: route.route_id,
        player_id: route.player_id,
        origin_building_id: route.origin_building_id,
        destination_building_id: route.destination_building_id,
        path_blocks: route.path_blocks,
        river_crossings: route.river_crossings,
        ephemeral_mode: route.ephemeral_mode,
        straight_line_distance: route.straight_line_distance,
        sinuosity_index: route.sinuosity_index,
        stance: route.stance,
        vehicle_type: route.vehicle_type,
        route_name: route.route_name,
        is_saved: route.is_saved,
        state: route.state,
        version: route.version,
        patch_count: route.patch_count,
        last_rebuilt_at_tick: route.last_rebuilt_at_tick,
        rebuild_completes_at_tick: route.rebuild_completes_at_tick,
      })
      .from(route)
      .where(eq(route.route_id, routeId))
      .limit(1);
    return row ?? null;
  }

  /**
   * `applyPatch` — design §7.2's own write: a NEW path/SI/straight_line_distance/river_crossings +
   * `version` bump + `patch_count++`, in ONE UPDATE. Deliberately does NOT touch `state` — the caller
   * (`RoutePatchSweepService.maybePatchRoute`) re-runs `RouteService.evaluateAndMaybeSever` immediately
   * after this write to derive the FRESH state (possibly `severed`, ruling-B's OR-extended threshold —
   * unlike `bumpRouteVersion`, which force-sets `state='active'`, wrong here since a patched route may
   * legitimately still be `saturated` or may have just collapsed).
   */
  async applyPatch(
    routeId: string,
    params: {
      path_blocks: number[];
      straight_line_distance: number;
      sinuosity_index: number;
      river_crossings: number;
      newVersion: number;
    },
  ): Promise<void> {
    await this.db
      .update(route)
      .set({
        path_blocks: params.path_blocks,
        straight_line_distance: params.straight_line_distance,
        sinuosity_index: params.sinuosity_index,
        river_crossings: params.river_crossings,
        version: params.newVersion,
        patch_count: sql`${route.patch_count} + 1`,
      })
      .where(eq(route.route_id, routeId));
  }

  /**
   * I6 — the exactly-once collapse transition (design §7.3/D10): `UPDATE route SET state='severed'
   * WHERE route_id=$id AND state != 'severed' RETURNING route_id`. Returns `true` iff THIS call won the
   * transition (0 rows = already severed by a concurrent winner, or the row does not exist) — the
   * caller (`RouteService.evaluateAndMaybeSever`) only invokes `RouteCollapseExceptionProducer.
   * raiseIfClear` on `true`, so the Exception is emitted exactly once even under concurrent evaluators
   * (the falsifiable concurrency scenario at plan §C7).
   */
  async severIfNotAlready(routeId: string): Promise<boolean> {
    const rows = await this.db
      .update(route)
      .set({ state: 'severed' })
      .where(and(eq(route.route_id, routeId), ne(route.state, 'severed')))
      .returning({ route_id: route.route_id });
    return rows.length > 0;
  }

  /**
   * I7 — the rebuild verb's OWN atomic claim (design §7.4 verbatim): `UPDATE route SET
   * rebuild_completes_at_tick=$completesAtTick WHERE route_id=$id AND player_id=$me AND
   * rebuild_completes_at_tick IS NULL RETURNING` — 0 rows = a rebuild is ALREADY in flight (a concurrent
   * racer, or an earlier rebuild whose downtime has not yet elapsed — this is the ONE place
   * `rebuild_completes_at_tick` is compared to `IS NULL` literally, matching the design text exactly;
   * the SELF-HEALING `<= gameMinute` comparison lives in `DistributionRepository.dispatchOnSavedRoute`'s
   * OWN in-tx guard, a DIFFERENT guard for a DIFFERENT actor — see that method's header for why it is
   * NOT composed from a shared helper here: it must run inside the SAME `db.transaction` as the shift
   * INSERT, and a cross-repository call from inside a Drizzle transaction callback does not share that
   * transaction's connection/lock scope unless the SAME `tx` client is threaded through — restructuring
   * repo boundaries to share one client parameter is out of this chunk's scope, flagged for reviewer).
   * `RouteRebuildService` treats `null` as "issue the I9
   * compensating refund, then 409 REBUILD_IN_PROGRESS".
   */
  async claimRebuild(
    routeId: string,
    playerId: string,
    completesAtTick: number,
  ): Promise<{ route_id: string } | null> {
    const [row] = await this.db
      .update(route)
      .set({ rebuild_completes_at_tick: completesAtTick })
      .where(
        and(
          eq(route.route_id, routeId),
          eq(route.player_id, playerId),
          sql`${route.rebuild_completes_at_tick} IS NULL`,
        ),
      )
      .returning({ route_id: route.route_id });
    return row ?? null;
  }

  /**
   * `applyRebuildResult` — design §7.4's own completion write: a NEW path/SI/straight_line_distance/
   * river_crossings + `version` bump + `state='active'` (a rebuild ALWAYS restores dispatchability,
   * whether it started from `severed` or a proactive rebuild of a still-`active`/`saturated` route) +
   * `last_rebuilt_at_tick=gameMinute`. Does NOT touch `rebuild_completes_at_tick` (already armed at the
   * CLAIM — `claimRebuild` above — to `gameMinute + downtimeTicks`; the downtime window is measured from
   * the CLAIM moment, not the completion-write moment, so a rebuild's A-star/version-archive work never
   * itself extends the window).
   */
  async applyRebuildResult(
    routeId: string,
    params: {
      path_blocks: number[];
      straight_line_distance: number;
      sinuosity_index: number;
      river_crossings: number;
      newVersion: number;
      lastRebuiltAtTick: number;
    },
  ): Promise<void> {
    await this.db
      .update(route)
      .set({
        path_blocks: params.path_blocks,
        straight_line_distance: params.straight_line_distance,
        sinuosity_index: params.sinuosity_index,
        river_crossings: params.river_crossings,
        version: params.newVersion,
        state: 'active',
        last_rebuilt_at_tick: params.lastRebuiltAtTick,
      })
      .where(eq(route.route_id, routeId));
  }

  /**
   * I8 — the anti-bypass DELETE guard (design §7.5): `DELETE FROM route WHERE route_id=$id AND
   * player_id=$me AND state != 'severed' RETURNING route_id`. Returns `true` iff a row was actually
   * deleted; `false` means either the route doesn't exist for this player (the caller's OWN pre-read
   * already 404s that case) OR it exists but is `severed` (the caller maps THAT case to 409
   * `REBUILD_REQUIRED` — the ONLY exit from a severed route is a paid rebuild, never a free delete+
   * recreate). Conditional-DELETE-with-RETURNING (not a read-then-delete) closes the TOCTOU a concurrent
   * collapse could otherwise open between an earlier "not severed" read and the delete itself.
   */
  async deleteRouteIfNotSevered(routeId: string, playerId: string): Promise<boolean> {
    const rows = await this.db
      .delete(route)
      .where(
        and(
          eq(route.route_id, routeId),
          eq(route.player_id, playerId),
          ne(route.state, 'severed'),
        ),
      )
      .returning({ route_id: route.route_id });
    return rows.length > 0;
  }

  /**
   * I8 — the anti-bypass CREATE guard (design §7.5): does the player already have a SAVED, `severed`
   * route for this EXACT (player, origin_building_id, destination_building_id) triple? Used by
   * `RouteService.createRoute` BEFORE inserting a new route — a fresh route between the SAME endpoints
   * would otherwise let the player route around the rebuild cost entirely (K5 would be economically
   * meaningless). Not a UNIQUE-constraint-backed guard (register §0 row 1: no UNIQUE on (player, origin,
   * dest) — multiple routes between the same pair are legal, D2/§4.2) — a plain SELECT check; see
   * `RouteService.createRoute`'s own header for why this is sufficient (deleteRoute's own unconditional
   * severed-block above means the severed row this checks against can never vanish out from under a
   * racing create).
   */
  async findSavedSeveredRouteForEndpoints(
    playerId: string,
    originBuildingId: string,
    destinationBuildingId: string,
  ): Promise<{ route_id: string } | null> {
    const [row] = await this.db
      .select({ route_id: route.route_id })
      .from(route)
      .where(
        and(
          eq(route.player_id, playerId),
          eq(route.origin_building_id, originBuildingId),
          eq(route.destination_building_id, destinationBuildingId),
          eq(route.is_saved, true),
          eq(route.state, 'severed'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * `RoutePatchSweepService`'s own NIGHTLY/26 tick input: every SAVED route id for this player that is
   * NEITHER severed (a severed route needs a REBUILD, not a patch) NOR currently INSIDE an active
   * rebuild downtime window (`rebuild_completes_at_tick IS NOT NULL AND > gameMinute` — about to get a
   * wholly new path anyway). The SAME `<= gameMinute` self-healing comparison
   * `DistributionRepository.dispatchOnSavedRoute` uses (a read-only filter here — no write) so a route
   * whose downtime elapsed but whose stale marker hasn't been cleared by a dispatch attempt yet is still
   * eligible for tonight's patch sweep.
   */
  async listSavedNonSeveredNonRebuildingRouteIds(playerId: string, gameMinute: number): Promise<string[]> {
    const rows = await this.db
      .select({ route_id: route.route_id })
      .from(route)
      .where(
        and(
          eq(route.player_id, playerId),
          eq(route.is_saved, true),
          ne(route.state, 'severed'),
          sql`(${route.rebuild_completes_at_tick} IS NULL OR ${route.rebuild_completes_at_tick} <= ${gameMinute}::bigint)`,
        ),
      );
    return rows.map((r) => r.route_id);
  }

  /**
   * I9 — the rebuild verb's compensating refund (design §7.4/§15): `cash_cents = cash_cents + cents`,
   * unconditional (a credit cannot violate the "never negative" invariant the guarded DEBIT protects).
   * Mirrors `LegMaintenanceRepository.refundWallet`'s own wallet-credit idiom (this lot's OWN sibling
   * repo for the SAME I9 shape, one domain over — leg maintenance vs route rebuild).
   */
  async refundWallet(playerId: string, cents: number): Promise<void> {
    await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} + ${cents}` })
      .where(eq(economyState.player_id, playerId));
  }
}

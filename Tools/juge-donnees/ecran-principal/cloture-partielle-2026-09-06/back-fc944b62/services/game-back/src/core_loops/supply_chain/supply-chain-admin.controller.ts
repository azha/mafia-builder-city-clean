// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C9 ("BO : 4 endpoints groupés
//             + 3 forces (`f3_deferred`) + 3 SFCs Vue (T9) — rôle ops `requireStaffRole` REUSE")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §14 (BO surface — the
//             5-bullet endpoint list, condensés depuis les 3 §BO canon, T9).
//             Decisions: §3 T9 (9 composants Vue-BO / 13 endpoints canon → 3 SFCs + 4 endpoints groupés +
//             forces + Phase-23 tunables REUSE) + §1.14-style D14 topology continuity (DD-C6 game-back
//             `/v1/admin/*`, bo-front-DIRECT — the SAME P3-A/P3-B/04f-A/04f-B precedent).
//             Pattern: `flag-discipline-admin.controller.ts` (P3-B C7 — the closest sibling: same 3-loop
//             BO-condensation shape, `requireStaffRole`/`f3_deferred`/`AdminAuditLogService.emit`) +
//             `maintenance-admin.controller.ts` (04f-A C8 — the "force-X = REAL atomic write, not a bare
//             poke where a real one exists" precedent, `force-phase`'s own "anchor-set" shape for the
//             cases where no richer atomic exists) + `core-loops-admin.controller.ts` (the "direct schema
//             read, no cross-module import" idiom this file's routes' cross-domain reads reuse verbatim).
//             — P3-C C9 — 2026-07-13
//
// `SupplyChainAdminController` — the BO production routes for the ch05 Loops 3-5 surface (T9's 4 grouped
// endpoints + 3 forces; the design §14 5th bullet, `PUT /admin/tunables/*`, is REUSE — the EXISTING P3-A
// `PUT /v1/admin/tunables/core-loops` (`core-loops-admin.controller.ts`) already reads/writes
// `CORE_LOOPS_TUNABLE_CAPS`, the SAME map C1 extended with every `core_loops.backpressure_*`/
// `sinuosity_*`/`mycelial_*` key this lot registers — NO new dedicated PUT endpoint here, DRY):
//
//   GET  /v1/admin/players/:id/supply-chain-snapshot   — role gm    — the 3 canon "true state" GETs
//                                                                     (backpressure-snapshot + routes-
//                                                                     sinuosity + mycelial-state)
//                                                                     CONDENSED into ONE: nodes+legs+
//                                                                     routes, RAW scalars (P5 inversion)
//                                                                     alongside their derived bucket.
//   GET  /v1/admin/supply-chain/critical-events         — role gm    — the 3 canon "recent X events"
//                                                                     GETs CONDENSED into ONE cross-player,
//                                                                     paginated timeline (backpressure
//                                                                     critical crossings + mycelial
//                                                                     persistent-stress + route collapses),
//                                                                     classified by producer source tag.
//   POST /v1/admin/nodes/:id/force-backpressure         — role admin — f3_deferred, audited — admin
//                                                                     override write (SupplyNodePressure
//                                                                     Repository.forceSet).
//   POST /v1/admin/legs/:id/force-stress                — role admin — f3_deferred, audited — admin
//                                                                     override write (LegRepository.
//                                                                     forceDebtLoad).
//   POST /v1/admin/routes/:id/force-collapse            — role admin — f3_deferred, audited — drives the
//                                                                     REAL I6 exactly-once transition
//                                                                     (`RouteCollapseExceptionProducer.
//                                                                     raiseIfClear` on the winning side —
//                                                                     the SAME producer C7's OWN
//                                                                     `evaluateAndMaybeSever` calls, never
//                                                                     a fabricated separate card path).
//
// ★ DEFERRED PER ⊥ RULING (controller, this chunk): `GET /admin/players/:id/trace-history` (design §14's
//   own bullet — "décisions de trace + rebuild + maintenance, P2 hook strength") is NOT built here. Root
//   cause: `BackpressureTraceService.resolve`'s own header (C6) already documents the honest gap this
//   endpoint would need to read back — "no dedicated trace-decision TABLE was authored at C1 ... a
//   durable store for C9's own GET /admin/players/:id/trace-history BO endpoint is an honest gap" (a C6 ⊥
//   review finding, confirmed still true at C9: `resolve()` logs a structured line, nothing persists).
//   Building this endpoint now would mean either (a) inventing a NEW migration/table outside this chunk's
//   declared C1-schema scope, or (b) faking a history from data that doesn't exist — neither acceptable.
//   TD allocation: C10 closeout (decisions §5's own "closeout-only" TD-routing convention). The 3rd SFC,
//   `<SupplyChainDecisionPatternsAnalyzer>`, is still built (its own file documents which 2 of its 3
//   folded canon components it CAN honestly serve from `supply-chain-snapshot` today, and flags the
//   trace-pattern third inline as the SAME deferred gap — never silently dropped, never fabricated).
//
// P5 BO INVERSION (R2.2): every GET below returns the RAW scalars the player-facing surfaces
//   (`SupplyChainGraphService`, C9's OWN new player endpoint; `LegMaintenanceService`/
//   `BackpressureTraceService`, C4/C6) deliberately bucket away — `backpressure_index`/`debt_load`/
//   `sinuosity_index`/`stress_streak`/`patch_count` raw floats/ints. NEVER forwarded to any player-facing
//   endpoint (the leak-scan floor, plan §C9, proves the player side stays clean; this file is the
//   deliberate BO-only inversion of that same wall).
//
// F3 two-person-rule: DEFERRED (TD-107 join, the SAME honest marker every sibling admin controller in
//   this codebase carries). The 3 force endpoints are gated by `requireStaffRole('admin')` ONLY until F3
//   lands; each response carries `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE — SAME as every sibling admin controller (see e.g.
//   `core-loops-admin.controller.ts`'s own header for the full JWT-verification account).
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): each of the 3 force endpoints
//   writes exactly one `admin_audit_log` row. The 2 GET endpoints are read-only diagnostics and do NOT
//   audit (mirrors every sibling BO controller).
//
// MODULE HOME (D12, "tranché au C9 par taille"): this file lives in `core_loops/supply_chain/` (not a NEW
//   `distribution-admin.controller.ts` addition) — of its 5 concerns, 3 (nodes/backpressure, legs/
//   mycelial, + 2 of 3 forces) are natively supply_chain domain, and `RouteCollapseExceptionProducer`
//   (needed for `force-collapse`) is ALREADY provided+exported by `SupplyChainModule` (C7). Route data
//   (`route`/`route_version_history`) is read via a DIRECT schema import — a pure Drizzle table object,
//   zero NestJS module edge — mirroring `core-loops-admin.controller.ts`'s own "read the schema table
//   directly rather than reach for a heavier cross-module service" discipline (that file's header
//   explains the EXACT module-cycle hazard this avoids: `SupplyChainModule` must never import
//   `DistributionModule`, which already imports `SupplyChainModule` — a one-way edge, `distribution.
//   module.ts`'s own header). The `severIfNotAlready`-equivalent write (`force-collapse`) is therefore a
//   direct Drizzle statement here, NOT a call into `RouteLifecycleRepository` (would require importing
//   that class from `operational/distribution/`, a cross-module edge this chunk does not need to add) —
//   it reproduces `RouteLifecycleRepository.severIfNotAlready`'s OWN exact WHERE-clause shape (`UPDATE
//   route SET state='severed' WHERE route_id=$id AND state != 'severed' RETURNING`), never edits that
//   file (D12's wall — 9b file edits are limited to what C4/C7 already did).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in `SupplyChainModule.controllers` (alongside the conditional `SupplyChainTestController`).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, ne, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { building } from '../../db/schema/city_state';
import { route } from '../../db/schema/operational_chain';
import { SupplyNodePressureRepository } from './supply-node-pressure.repository';
import { LegRepository } from './leg.repository';
import { RouteCollapseExceptionProducer } from './route-collapse-exception-producer.service';
import { backpressureBucket, type BackpressureBucket } from './backpressure-bucket';
import { debtBucket, type DebtBucket } from './debt-bucket';
import { sinuosityStressBucket, type SinuosityStressBucket } from './sinuosity-stress-bucket';
import { coreLoopsTunables } from '../core-loops-tunables';

const CRITICAL_EVENTS_DEFAULT_LIMIT = 20;
const CRITICAL_EVENTS_MAX_LIMIT = 100;

interface ForceBackpressureBody {
  index?: number;
}

interface ForceStressBody {
  debtLoad?: number;
}

type CriticalEventType = 'backpressure_critical' | 'mycelial_stress' | 'route_collapse';

interface AdminCriticalEventRow {
  exceptionId: string;
  playerId: string;
  eventType: CriticalEventType;
  eventDescriptor: string;
  targetRef: string | null;
  resolutionStatus: 'pending' | 'resolved' | 'escalated' | 'aged_out';
  emittedAt: Date;
  resolvedAt: Date | null;
}

// ─── Controller ────────────────────────────────────────────────────────────────

/**
 * `SupplyChainAdminController` — production BO routes for the ch05 Loops 3-5 Supply-Chain surface (T9).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/supply-chain-snapshot`, `/v1/admin/supply-chain/critical-events`,
 * `/v1/admin/nodes/:id/force-backpressure`, `/v1/admin/legs/:id/force-stress`,
 * `/v1/admin/routes/:id/force-collapse`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in `SupplyChainModule.controllers`.
 */
@Controller('admin')
export class SupplyChainAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly pressureRepository: SupplyNodePressureRepository,
    private readonly legRepository: LegRepository,
    private readonly collapseProducer: RouteCollapseExceptionProducer,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/players/:id/supply-chain-snapshot — the 3 canon "true state" GETs, condensed (role `gm`) ──

  /**
   * `GET /v1/admin/players/:id/supply-chain-snapshot`
   *
   * P5 BO INVERSION: nodes (RAW `backpressure_index` + `blocked_sources` + `arrow_to_building_id` +
   * `source_distance_hops`, PLUS the derived `BackpressureBucket` alongside), legs (RAW `debt_load` +
   * `stress_streak` + `maintenance_mode`/`maintenance_completes_at_tick` + `bypassed`, PLUS the derived
   * `DebtBucket`), routes (RAW `sinuosity_index` + `patch_count` + `state` + `rebuild_completes_at_tick`,
   * PLUS the derived `SinuosityStressBucket`) — the 3 canon "true state" endpoints
   * (`backpressure-snapshot`/`routes-sinuosity`/`mycelial-state`) condensed into ONE (design §14, T9).
   *
   * Role: `gm` (ops diagnostic surface, no mutation). No graph activity for this player yet → all 3
   * arrays empty (L1 honest — mirrors `getFlagDisciplineStats`'s own empty-diagnostic convention).
   */
  @Get('players/:id/supply-chain-snapshot')
  @UseGuards(requireStaffRole('gm'))
  async getSupplyChainSnapshot(@Param('id') playerId: string) {
    const [rawNodes, rawLegs, routeRows] = await Promise.all([
      this.pressureRepository.readAllRaw(playerId),
      this.legRepository.listLegsForPlayer(playerId),
      this.db
        .select({
          routeId: route.route_id,
          originBuildingId: route.origin_building_id,
          destinationBuildingId: route.destination_building_id,
          sinuosityIndex: route.sinuosity_index,
          patchCount: route.patch_count,
          state: route.state,
          lastRebuiltAtTick: route.last_rebuilt_at_tick,
          rebuildCompletesAtTick: route.rebuild_completes_at_tick,
        })
        .from(route)
        .where(and(eq(route.player_id, playerId), eq(route.is_saved, true)))
        .orderBy(route.route_id),
    ]);

    const nodes = rawNodes.map((n) => ({
      buildingId: n.buildingId,
      backpressureIndex: n.backpressureIndex,
      bucket: backpressureBucket(
        n.backpressureIndex,
        coreLoopsTunables.backpressureMildThreshold,
        coreLoopsTunables.backpressureWarmThreshold,
        coreLoopsTunables.backpressureCriticalThreshold,
      ) as BackpressureBucket,
      isBlockedOutput: n.isBlockedOutput,
      blockedSources: n.blockedSources,
      arrowToBuildingId: n.arrowToBuildingId,
      sourceDistanceHops: n.sourceDistanceHops,
    }));

    const legs = rawLegs.map((l) => ({
      legId: l.legId,
      originBuildingId: l.originBuildingId,
      destinationBuildingId: l.destinationBuildingId,
      debtLoad: l.debtLoad,
      debtBucket: debtBucket(l.debtLoad, coreLoopsTunables.mycelialStressThreshold, coreLoopsTunables.mycelialDebtCap) as DebtBucket,
      stressStreak: l.stressStreak,
      maintenanceMode: l.maintenanceMode,
      maintenanceCompletesAtTick: l.maintenanceCompletesAtTick,
      bypassed: l.bypassed,
    }));

    const routes = routeRows.map((r) => ({
      routeId: r.routeId,
      originBuildingId: r.originBuildingId,
      destinationBuildingId: r.destinationBuildingId,
      sinuosityIndex: r.sinuosityIndex,
      sinuosityStressBucket: sinuosityStressBucket(
        r.state,
        r.sinuosityIndex,
        coreLoopsTunables.sinuosityStressWarningThreshold,
        coreLoopsTunables.sinuosityStressedBucketUpperBound,
      ) as SinuosityStressBucket,
      patchCount: r.patchCount,
      state: r.state,
      lastRebuiltAtTick: r.lastRebuiltAtTick,
      rebuildCompletesAtTick: r.rebuildCompletesAtTick,
    }));

    return { playerId, nodes, legs, routes };
  }

  // ─── GET /admin/supply-chain/critical-events — the 3 canon "recent X events" GETs, condensed (role `gm`) ──

  /**
   * `GET /v1/admin/supply-chain/critical-events?limit=&offset=`
   *
   * Cross-player timeline of the 3 producer cards this lot's own spine integration raises (§9): backpressure
   * critical crossings, mycelial persistent-stress, route collapses — the 3 canon "recent X events" GETs
   * (`backpressure/critical-events` / `mycelial-stress-events` / `sinuosity-collapse-events`) condensed
   * into ONE (design §14, T9). Classified by the SAME structural tags each of the 3 producers' OWN
   * candidate actions carry, and ONLY those 3 explicit tags (mirrors `flag-discipline-admin.controller.
   * ts`'s own "payload-tag projection, index-0 suffices" idiom): `source: 'BACKPRESSURE_CRITICAL'` /
   * `source: 'MYCELIAL_PERSISTENT_STRESS'` / `source: 'ROUTE_COLLAPSE'` (`backpressure-exception-producer.
   * service.ts` / `mycelial-stress-exception-producer.service.ts` / `route-collapse-exception-producer.
   * service.ts`).
   *
   * ★ C9 ⊥ FOLD (2026-07-13, BLOCKING fix — replaces a prior, DISPROVEN discriminator): the ORIGINAL
   * classifier identified a backpressure-critical card by the ABSENCE of either OTHER source tag PLUS the
   * PRESENCE of `effect.target_building_id` — this OVER-MATCHED any game-wide producer's building-targeted
   * card carrying no source tag of its own, e.g. `raid-exception-producer.service.ts`'s REPAIR/BRIBE/
   * LAY_LOW candidate actions (`effect.target_building_id` set, zero `source`) — a raid-shaped card
   * incorrectly appeared here as `backpressure_critical` (⊥ empirically probed, reviewer). The prior
   * comment's "verified against all 3 producer files, this chunk" was a universal claim resting on LOCAL
   * evidence only — `exception_queue` is the SHARED, game-wide spine table every producer in the codebase
   * writes to, not a table this chunk owns. FIX: the query below matches on the 3 EXPLICIT source tags
   * ONLY (the `effect.target_building_id`-presence fallback is REMOVED entirely) — this is game-wide-safe
   * BY CONSTRUCTION: a card from ANY producer, present or future, is included here iff it carries ONE of
   * these 3 exact string tags, never inferred from the shape of its `effect`. `targetRef` surfaces
   * whichever id tag the row actually carries (building/leg/route) — a ref, never a raw scalar (R2.2 still
   * holds even on this BO-only surface: the identity travels, the internal magnitudes that triggered the
   * card do not, since none of the 3 producers embed them either).
   *
   * ★ HONEST NOTE (no data migration): a backpressure-critical card raised BEFORE this fix landed does not
   * carry the new `source` tag and will therefore no longer appear in this timeline once this ships — an
   * acceptable, disclosed gap for a BO diagnostic view (no player-facing surface reads this table; the
   * card itself, its dedup, and its resolution are entirely unaffected). Not backfilled by design (D3 —
   * this lot never edits `src/exceptions/`, and a targeted `UPDATE ... candidate_actions` backfill would be
   * exactly the kind of out-of-band data patch R9.3 reserves for a real migration, not a BO-endpoint fix).
   *
   * `limit` defaults to 20, clamped to [1,100]; `offset` defaults to 0, clamped to ≥0 (mirrors
   * `exceptions.controller.ts#escalations`'s own clamp convention). Role: `gm` (ops diagnostic, no mutation).
   */
  @Get('supply-chain/critical-events')
  @UseGuards(requireStaffRole('gm'))
  async getCriticalEvents(
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
  ): Promise<{ events: AdminCriticalEventRow[]; total: number; limit: number; offset: number }> {
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isNaN(parsedLimit) ? CRITICAL_EVENTS_DEFAULT_LIMIT : Math.min(Math.max(parsedLimit, 1), CRITICAL_EVENTS_MAX_LIMIT);
    const parsedOffset = Number.parseInt(offsetParam ?? '', 10);
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;

    // The 3-way structural discriminator (see method doc above, ⊥ fold) — index-0 candidate action
    // suffices (every producer's OWN candidate_actions[0] already carries its own tag). ONE raw SQL OR
    // expression over the 3 EXPLICIT source tags ONLY — NO `effect.target_building_id`-presence fallback
    // (that fallback is what over-matched foreign, game-wide producer cards, e.g. raid-exception-producer
    // .service.ts's building-targeted actions, which carry no source tag of their own).
    const matchesAnyProducer = sql`(
      ${exceptionQueueRow.candidate_actions}->0->>'source' = 'BACKPRESSURE_CRITICAL'
      OR ${exceptionQueueRow.candidate_actions}->0->>'source' = 'MYCELIAL_PERSISTENT_STRESS'
      OR ${exceptionQueueRow.candidate_actions}->0->>'source' = 'ROUTE_COLLAPSE'
    )`;

    const [{ count: totalRaw }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(exceptionQueueRow)
      .where(matchesAnyProducer);
    const total = Number(totalRaw);

    const rows = await this.db
      .select({
        exceptionId: exceptionQueueRow.exception_id,
        playerId: exceptionQueueRow.player_id,
        eventDescriptor: exceptionQueueRow.event_descriptor,
        candidateActions: exceptionQueueRow.candidate_actions,
        resolutionStatus: exceptionQueueRow.resolution_status,
        emittedAt: exceptionQueueRow.emitted_at,
        resolvedAt: exceptionQueueRow.resolved_at,
      })
      .from(exceptionQueueRow)
      .where(matchesAnyProducer)
      .orderBy(desc(exceptionQueueRow.emitted_at))
      .limit(limit)
      .offset(offset);

    const events: AdminCriticalEventRow[] = rows.map((r) => {
      const first = (r.candidateActions as Array<Record<string, unknown>> | null)?.[0] ?? {};
      const source = first.source as string | undefined;
      const effect = first.effect as Record<string, unknown> | undefined;
      let eventType: CriticalEventType;
      let targetRef: string | null;
      if (source === 'MYCELIAL_PERSISTENT_STRESS') {
        eventType = 'mycelial_stress';
        targetRef = (first.leg_id as string | undefined) ?? null;
      } else if (source === 'ROUTE_COLLAPSE') {
        eventType = 'route_collapse';
        targetRef = (first.route_id as string | undefined) ?? null;
      } else {
        // source === 'BACKPRESSURE_CRITICAL' — the ONLY remaining possibility: the WHERE clause above
        // admits exactly these 3 explicit tags, no 4th case reaches this map (⊥ fold — never inferred
        // from `effect`'s shape alone anymore).
        eventType = 'backpressure_critical';
        targetRef = (effect?.target_building_id as string | undefined) ?? null;
      }
      return {
        exceptionId: r.exceptionId,
        playerId: r.playerId,
        eventType,
        eventDescriptor: r.eventDescriptor,
        targetRef,
        resolutionStatus: r.resolutionStatus,
        emittedAt: r.emittedAt,
        resolvedAt: r.resolvedAt,
      };
    });

    return { events, total, limit, offset };
  }

  // ─── POST /admin/nodes/:id/force-backpressure — admin override write (role `admin`, F3 DEFERRED) ──────

  /**
   * `POST /v1/admin/nodes/:id/force-backpressure`
   *
   * Live-ops force (canon "live-ops force (testing)", backpressure_trace.md §BO): `:id` = `building_id`.
   * Body: `{ index?: number }` — clamped to `[0,1]` (the I5 DB-CHECK bound); default `1.0` (straight into
   * `critical`, the common "reproduce the escalation path" QA need) when omitted. The owning `player_id`
   * is resolved from `building.player_id` (unknown building → 404) — `SupplyNodePressureRepository.
   * forceSet` performs the ADMIN OVERRIDE write directly (`blocked_sources: ['ADMIN_FORCED']`, an
   * out-of-domain tag distinguishing this from an organic detection, see that method's own doc).
   *
   * Returns: `{ buildingId, backpressureIndex, bucket, f3_deferred: true }`. Role: `admin`.
   */
  @Post('nodes/:id/force-backpressure')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join).
  @UseGuards(requireStaffRole('admin'))
  async forceBackpressure(@Param('id') buildingId: string, @Body() body: ForceBackpressureBody, @Req() req: RequestWithAccount) {
    const [buildingRow] = await this.db
      .select({ playerId: building.player_id })
      .from(building)
      .where(eq(building.building_id, buildingId))
      .limit(1);
    if (!buildingRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building: ${buildingId}.` });
    }

    const requestedIndex = body?.index;
    const index = Math.min(Math.max(typeof requestedIndex === 'number' && !Number.isNaN(requestedIndex) ? requestedIndex : 1.0, 0), 1.0);
    const before = await this.pressureRepository.findOne(buildingRow.playerId, buildingId);
    const gameMinute = await this.legRepository.getCurrentGameMinute(buildingRow.playerId);
    const result = await this.pressureRepository.forceSet(buildingRow.playerId, buildingId, index, gameMinute);
    const bucket = backpressureBucket(
      result.backpressureIndex,
      coreLoopsTunables.backpressureMildThreshold,
      coreLoopsTunables.backpressureWarmThreshold,
      coreLoopsTunables.backpressureCriticalThreshold,
    );

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'supply_node_pressure',
      targetEntityId: buildingId,
      beforeState: { backpressureIndex: before?.backpressureIndex ?? 0 },
      afterState: { backpressureIndex: result.backpressureIndex, bucket },
    });

    return { buildingId, backpressureIndex: result.backpressureIndex, bucket, f3_deferred: true };
  }

  // ─── POST /admin/legs/:id/force-stress — admin override write (role `admin`, F3 DEFERRED) ─────────────

  /**
   * `POST /v1/admin/legs/:id/force-stress`
   *
   * Live-ops force (canon "live-ops force stress (testing)", mycelial_ledger.md §BO): `:id` = `leg_id`,
   * unknown leg → 404 (`LegRepository.findById`). Body: `{ debtLoad?: number }` — clamped to
   * `[0, core_loops.mycelial_debt_cap]`; default = the cap itself (an unambiguous, fully-`fractured`
   * forced state, the common QA need) when omitted. `LegRepository.forceDebtLoad` performs the ADMIN
   * OVERRIDE write directly (a single-column poke — never touches `last_throughput_tick`/
   * `last_decay_eval_tick`, that method's own doc).
   *
   * Returns: `{ legId, debtLoad, debtBucket, f3_deferred: true }`. Role: `admin`.
   */
  @Post('legs/:id/force-stress')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join).
  @UseGuards(requireStaffRole('admin'))
  async forceLegStress(@Param('id') legId: string, @Body() body: ForceStressBody, @Req() req: RequestWithAccount) {
    const existing = await this.legRepository.findById(legId);
    if (!existing) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such leg: ${legId}.` });
    }

    const cap = coreLoopsTunables.mycelialDebtCap;
    const requestedDebtLoad = body?.debtLoad;
    const debtLoad = Math.min(Math.max(typeof requestedDebtLoad === 'number' && !Number.isNaN(requestedDebtLoad) ? requestedDebtLoad : cap, 0), cap);
    const result = await this.legRepository.forceDebtLoad(legId, debtLoad);
    if (!result) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such leg: ${legId}.` });
    }
    const bucket = debtBucket(result.debtLoad, coreLoopsTunables.mycelialStressThreshold, cap);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'supply_chain_leg',
      targetEntityId: legId,
      beforeState: { debtLoad: existing.debtLoad },
      afterState: { debtLoad: result.debtLoad, debtBucket: bucket },
    });

    return { legId, debtLoad: result.debtLoad, debtBucket: bucket, f3_deferred: true };
  }

  // ─── POST /admin/routes/:id/force-collapse — drives the REAL I6 transition (role `admin`, F3 DEFERRED) ─

  /**
   * `POST /v1/admin/routes/:id/force-collapse`
   *
   * Live-ops force (canon "live-ops force collapse (testing)", sinuosity_debt.md §BO): `:id` = `route_id`,
   * unknown route → 404. Already `severed` → 409 (nothing to force). Otherwise drives the REAL I6
   * exactly-once transition — `UPDATE route SET state='severed' WHERE route_id=$id AND state != 'severed'
   * RETURNING` (reproduces `RouteLifecycleRepository.severIfNotAlready`'s OWN exact shape, see file
   * header for why this is a direct statement rather than a cross-module repository call) — and on the
   * winning side calls `RouteCollapseExceptionProducer.raiseIfClear` (the SAME producer `RouteService.
   * evaluateAndMaybeSever` calls, C7 — a REAL "Route X collapsed. Downstream offline." card, not a
   * fabricated separate BO-only event).
   *
   * Returns: `{ routeId, state: 'severed', f3_deferred: true }`. Role: `admin`.
   */
  @Post('routes/:id/force-collapse')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join).
  @UseGuards(requireStaffRole('admin'))
  async forceRouteCollapse(@Param('id') routeId: string, @Req() req: RequestWithAccount) {
    const [routeRow] = await this.db
      .select({ playerId: route.player_id, state: route.state })
      .from(route)
      .where(eq(route.route_id, routeId))
      .limit(1);
    if (!routeRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such route: ${routeId}.` });
    }
    if (routeRow.state === 'severed') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `route ${routeId} is already severed.` });
    }

    // I6 exactly-once (design §7.3/D10) — the SAME atomic shape `RouteLifecycleRepository.
    // severIfNotAlready` uses (direct statement here, see file header for why). A 0-row RETURNING here
    // means a CONCURRENT transition won the race between the pre-read above and this statement (natural
    // sever, or another force-collapse call) — TOCTOU-zero: this request did NOT cause the collapse, so
    // it honestly reports the SAME 409 the pre-read check above would have given it, rather than
    // silently claiming credit for (or double-auditing) a transition it did not win.
    const [won] = await this.db
      .update(route)
      .set({ state: 'severed' })
      .where(and(eq(route.route_id, routeId), ne(route.state, 'severed')))
      .returning({ routeId: route.route_id });

    if (!won) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `route ${routeId} is already severed.` });
    }
    await this.collapseProducer.raiseIfClear(routeRow.playerId, routeId);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'route',
      targetEntityId: routeId,
      beforeState: { state: routeRow.state },
      afterState: { state: 'severed' },
    });

    return { routeId, state: 'severed' as const, f3_deferred: true };
  }
}

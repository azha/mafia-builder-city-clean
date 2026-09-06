// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C4 (the player-facing
//             maintenance verb — `POST /v1/supply-chain/legs/:legId/maintain`) + §C6 (the Loop 3 trace
//             verb — `GET .../nodes/:buildingId/backpressure` + `POST .../trace-step` + `POST .../resolve`)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.4 (the maintain
//             verb) + §5.5 (P2 chain reveal, R2.2 bands/ids only) + §6.3 (the trace verb, verbatim
//             endpoint/response shapes).
//             Pattern (PLAYER RESOLUTION): `distribution.controller.ts#dispatch`'s own account_id→
//             player_id bridge (JwtAuthGuard attaches `req.account`; the operational chain is keyed by
//             player_id, resolved via the 1-1 Player↔Account link) — VERBATIM here, the SAME per-
//             controller `resolvePlayerId` helper 32 sibling controllers already carry (no shared
//             extraction — matching the established convention, not introducing a new one this chunk).
//             — P3-C C4/C6 — 2026-07-12
//
// `SupplyChainController` — the player-facing production routes P3-C ships (C2/C3 were internal hooks +
// a TEST-ONLY controller only). Idempotency-Key: REUSE (the global interceptor covers every POST — no
// per-controller wiring needed, the SAME "Idempotency-Key supported" note every mutating endpoint in this
// codebase carries). C6 ADDS the 3 Loop 3 trace routes — GET is read-only (no Idempotency-Key concern);
// the 2 POSTs (`trace-step`/`resolve`) are diagnostic, non-state-mutating verbs (design §6.3 state-not-
// theatre) so a duplicate Idempotency-Key replay is harmless either way (idempotent BY CONSTRUCTION, not
// merely by the interceptor).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { LegMaintenanceService, type NextStressedLegBucket } from './leg-maintenance.service';
import { BackpressureTraceService } from './backpressure-trace.service';
import type { BackpressureBucket } from './backpressure-bucket';
import { SupplyChainGraphService } from './supply-chain-graph.service';
import type { DebtBucket } from './debt-bucket';
import type { SinuosityStressBucket } from './sinuosity-stress-bucket';
import type { TimeToCollapseBucket } from './time-to-collapse-bucket';

interface MaintainBody {
  mode?: string;
}

interface MaintainResponse {
  leg_id: string;
  mode: string;
  maintenance_completes_at_tick: number | null;
  next_stressed_leg: {
    leg_id: string;
    origin_building_id: string;
    destination_building_id: string;
    debt_bucket: NextStressedLegBucket;
  } | null;
}

interface BackpressureViewResponse {
  bucket: BackpressureBucket;
  has_arrow: boolean;
}

interface TraceStepResponse {
  next_node_ref: string | null;
  next_bucket: BackpressureBucket;
  at_source: boolean;
}

interface ResolveBody {
  mode?: string;
}

interface ResolveResponse {
  action_ref: string;
  next_warmest_cluster: Array<{ building_id: string; bucket: BackpressureBucket }>;
}

interface GraphResponse {
  nodes: Array<{
    building_id: string;
    bucket: BackpressureBucket;
    has_arrow: boolean;
    arrow_to_building_id: string | null;
  }>;
  legs: Array<{
    leg_id: string;
    origin_building_id: string;
    destination_building_id: string;
    debt_bucket: DebtBucket;
    bypassed: boolean;
  }>;
  routes: Array<{
    route_id: string;
    origin_building_id: string;
    destination_building_id: string;
    sinuosity_stress_bucket: SinuosityStressBucket;
    time_to_collapse_bucket: TimeToCollapseBucket;
    state: 'draft' | 'active' | 'saturated' | 'severed';
    rebuilding: boolean;
  }>;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class SupplyChainController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly legMaintenance: LegMaintenanceService,
    private readonly backpressureTrace: BackpressureTraceService,
    // P3-C C9 — the graph-view combiner (design §4/§13).
    private readonly graph: SupplyChainGraphService,
  ) {}

  /**
   * `GET /v1/supply-chain/graph` — the Loop 3/4/5 graph view, BUCKETS ONLY (design §4/§13): nodes
   * (`BackpressureBucket` + arrow ref), legs (`DebtBucket`), routes (`SinuosityStressBucket` +
   * `TimeToCollapseBucket` + qualitative `state`/`rebuilding`). NEVER a raw scalar (R2.2 — no
   * `backpressure_index`/`debt_load`/`sinuosity_index`/`straight_line_distance`/`stress_streak`/
   * `patch_count`/counters/thresholds anywhere in this response — the leak-scan floor, plan §C9).
   * Requires a PLAYER JWT. A brand-new player with no graph activity yet reads as `{nodes: [], legs: [],
   * routes: []}` (organic, no fabricated placeholder rows).
   */
  @Get('supply-chain/graph')
  @UseGuards(JwtAuthGuard)
  async getGraph(@Req() req: RequestWithAccount): Promise<GraphResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const view = await this.graph.getGraph(playerId);
    return {
      nodes: view.nodes.map((n) => ({
        building_id: n.buildingId,
        bucket: n.bucket,
        has_arrow: n.hasArrow,
        arrow_to_building_id: n.arrowToBuildingId,
      })),
      legs: view.legs.map((l) => ({
        leg_id: l.legId,
        origin_building_id: l.originBuildingId,
        destination_building_id: l.destinationBuildingId,
        debt_bucket: l.debtBucket,
        bypassed: l.bypassed,
      })),
      routes: view.routes.map((r) => ({
        route_id: r.routeId,
        origin_building_id: r.originBuildingId,
        destination_building_id: r.destinationBuildingId,
        sinuosity_stress_bucket: r.sinuosityStressBucket,
        time_to_collapse_bucket: r.timeToCollapseBucket,
        state: r.state,
        rebuilding: r.rebuilding,
      })),
    };
  }

  /**
   * `POST /v1/supply-chain/legs/:legId/maintain` — the Loop 5 maintenance verb (design §5.4). Body:
   * { mode: 'quick_patch' | 'structural_reinforce' | 'reroute_bypass' }. Not the player's leg → 404.
   * Bad mode → 422. Insufficient cash → 409 RESOURCE_STATE_CONFLICT (no state mutated). The leg already
   * has an active job (or is resting) → 409 MAINTENANCE_IN_PROGRESS (the wallet debit, if any, is
   * refunded — I9). A 2nd `structural_reinforce` past the session's structural cap → 409
   * STRUCTURAL_CAP_EXHAUSTED (governor REUSE, I4). Returns { leg_id, mode, maintenance_completes_at_tick,
   * next_stressed_leg } — `next_stressed_leg` is R2.2-projected (bucket only, never the raw debt_load).
   * Requires a PLAYER JWT. Idempotency-Key supported (the global interceptor).
   */
  @Post('supply-chain/legs/:legId/maintain')
  @HttpCode(200) // a mutation on the existing leg row (not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async maintain(
    @Param('legId', UuidParam) legId: string,
    @Body() body: MaintainBody,
    @Req() req: RequestWithAccount,
  ): Promise<MaintainResponse> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['mode']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const result = await this.legMaintenance.maintain(playerId, legId, String(body.mode ?? ''));
    return {
      leg_id: result.legId,
      mode: result.mode,
      maintenance_completes_at_tick: result.maintenanceCompletesAtTick,
      next_stressed_leg: result.nextStressedLeg
        ? {
            leg_id: result.nextStressedLeg.legId,
            origin_building_id: result.nextStressedLeg.originBuildingId,
            destination_building_id: result.nextStressedLeg.destinationBuildingId,
            debt_bucket: result.nextStressedLeg.debtBucket,
          }
        : null,
    };
  }

  /**
   * `GET /v1/supply-chain/nodes/:buildingId/backpressure` — the Loop 3 diagnostic READ (design §6.3):
   * `{ bucket, has_arrow }`, NEVER the raw `backpressure_index` (R2.2). A building the player has never
   * touched (no `supply_node_pressure` row) reads as `silent`/no arrow. Requires a PLAYER JWT.
   */
  @Get('supply-chain/nodes/:buildingId/backpressure')
  @UseGuards(JwtAuthGuard)
  async getBackpressure(
    @Param('buildingId', UuidParam) buildingId: string,
    @Req() req: RequestWithAccount,
  ): Promise<BackpressureViewResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const view = await this.backpressureTrace.getBackpressureView(playerId, buildingId);
    return { bucket: view.bucket, has_arrow: view.hasArrow };
  }

  /**
   * `POST /v1/supply-chain/nodes/:buildingId/trace-step` — reveals ONE hop of the backpressure trace
   * (design §6.3, NEVER the whole path in one response): `{ next_node_ref, next_bucket, at_source }`.
   * Walking `next_node_ref` back into this SAME route as the next `:buildingId` is how a client follows
   * the chain hop-by-hop. Requires a PLAYER JWT. Idempotency-Key supported (read-only in effect — see
   * file header).
   */
  @Post('supply-chain/nodes/:buildingId/trace-step')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async traceStep(
    @Param('buildingId', UuidParam) buildingId: string,
    @Req() req: RequestWithAccount,
  ): Promise<TraceStepResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const step = await this.backpressureTrace.traceStep(playerId, buildingId);
    return { next_node_ref: step.nextNodeRef, next_bucket: step.nextBucket, at_source: step.atSource };
  }

  /**
   * `POST /v1/supply-chain/nodes/:buildingId/resolve` — the trace's honest acknowledgement verb (design
   * §6.3: "À la source"). Body: { mode: 'ADD_CAPACITY' | 'FIX_DOWNSTREAM' }. Bad mode → 422. `:buildingId`
   * is not CURRENTLY a diagnosed source → 409 TRACE_NOT_AT_SOURCE. Returns { action_ref,
   * next_warmest_cluster } — state-not-theatre: `backpressure_index`/`is_blocked_output` are NEVER written
   * here (the pressure only moves via the real `BACKPRESSURE_UPDATE` tick). Requires a PLAYER JWT.
   */
  @Post('supply-chain/nodes/:buildingId/resolve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async resolveTrace(
    @Param('buildingId', UuidParam) buildingId: string,
    @Body() body: ResolveBody,
    @Req() req: RequestWithAccount,
  ): Promise<ResolveResponse> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['mode']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const result = await this.backpressureTrace.resolve(playerId, buildingId, String(body.mode ?? ''));
    return {
      action_ref: result.actionRef,
      next_warmest_cluster: result.nextWarmestCluster.map((n) => ({ building_id: n.buildingId, bucket: n.bucket })),
    };
  }

  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}

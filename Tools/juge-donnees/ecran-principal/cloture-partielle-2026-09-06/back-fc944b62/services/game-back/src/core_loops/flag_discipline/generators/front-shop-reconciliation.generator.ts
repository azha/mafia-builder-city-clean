// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator #3 —
//             FRONT_SHOP_RECONCILIATION)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 ("one item per
//             operating front shop: 'daily revenue reconciliation'"; "injection-utilization /
//             unconformity elevation, floor 0.1") + §2 row 5.
//             Decisions §8.5(a) — the C0-CORRECTED substrate pin (design's own citation was imprecise):
//             `buildings.audit_pin_activated_at` (`db/schema/city_state.ts:159` — non-null = the building
//             is CURRENTLY flagged for audit, the "unconformity" signal, owned by `citysim/unconformity/
//             unconformity.repository.ts`) for buildings where `building_operational_state.operational_
//             type = 'front_shop'` (`operational_chain.ts:23-27` — NOT `buildings.building_type`, which
//             is a bare soft-ref int, per row 5's own re-anchor), joined to `laundering_nodes.buffer_load`
//             at `stage_index = 1` (the front-shop's OWN Stage-1 node — `pipeline_and_laundering.ts:24`,
//             float [0..1] — REUSE the SAME stage_index=1 convention `LieutenantRepository.
//             getStage1NodeOccupancyForBuilding` already establishes) for the injection-utilization
//             signal. Role: 4 (Front shop manager, LAUNDERING_ROLE_ID — LIVE, `lieutenant-archetype.ts`).
//             — P3-B C3 — 2026-07-11
//
// `FrontShopReconciliationGenerator` — one candidate per operating front-shop building for the player.
// `dedupKey` = the building_id (stable — one front-shop, one candidate identity, every day it operates).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { buildingOperationalState } from '../../../db/schema/operational_chain';
import { building } from '../../../db/schema/city_state';
import { launderingNode } from '../../../db/schema/pipeline_and_laundering';
import { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';
import { LAUNDERING_ROLE_ID } from '../../../operational/lieutenant/lieutenant-archetype';
import { clamp01 } from '../../../progression/loop10/hl-card-types';
import { resolveRoleHolder } from './role-holder';
import type { RoutineCandidate, RoutineItemGenerator } from './routine-item-generator';
import { frontShopReconciliationDeviationScore } from './deviation-scores';

// The PURE scorer now lives in `./deviation-scores` (decorator-free, direct-importable by
// `flag_generators.spec.ts` — see that file's header for the full reasoning).

@Injectable()
export class FrontShopReconciliationGenerator implements RoutineItemGenerator {
  readonly generator = 'FRONT_SHOP_RECONCILIATION' as const;
  readonly responsibleRoleId = LAUNDERING_ROLE_ID; // 4 — Front shop manager (LIVE, D6)

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenants: LieutenantRepository,
  ) {}

  async enumerate(playerId: string, _gameDay: number): Promise<RoutineCandidate[]> {
    const rows = await this.db
      .select({
        buildingId: buildingOperationalState.building_id,
        auditPinActivatedAt: building.audit_pin_activated_at,
        bufferLoad: launderingNode.buffer_load,
      })
      .from(buildingOperationalState)
      .innerJoin(building, eq(building.building_id, buildingOperationalState.building_id))
      .leftJoin(
        launderingNode,
        and(eq(launderingNode.building_id, buildingOperationalState.building_id), eq(launderingNode.stage_index, 1)),
      )
      .where(and(eq(buildingOperationalState.player_id, playerId), eq(buildingOperationalState.operational_type, 'front_shop')));

    if (rows.length === 0) return [];

    // Dedupe defensively by building_id (a front-shop has AT MOST one Stage-1 node — the LEFT JOIN
    // should never fan out — but the map keeps the enumeration robust either way).
    const byBuilding = new Map<string, { auditPinActive: boolean; bufferLoad: number }>();
    for (const r of rows) {
      if (byBuilding.has(r.buildingId)) continue;
      byBuilding.set(r.buildingId, { auditPinActive: r.auditPinActivatedAt !== null, bufferLoad: r.bufferLoad ?? 0 });
    }

    const holder = await resolveRoleHolder(this.lieutenants, playerId, this.responsibleRoleId);

    return [...byBuilding.entries()].map(([buildingId, r]) => ({
      dedupKey: buildingId,
      descriptor: {
        key: 'core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor',
        params: { building_id: buildingId },
      },
      flagReason: {
        key: 'core_loops.flag_discipline.reason.front_shop_reconciliation',
        params: { building_id: buildingId },
      },
      responsibleRoleId: this.responsibleRoleId,
      lieutenantId: holder?.lieutenantId ?? null,
      tenureScore: holder?.tenureScore ?? null,
      deviationScore: clamp01(frontShopReconciliationDeviationScore(r.auditPinActive, r.bufferLoad)),
    }));
  }
}

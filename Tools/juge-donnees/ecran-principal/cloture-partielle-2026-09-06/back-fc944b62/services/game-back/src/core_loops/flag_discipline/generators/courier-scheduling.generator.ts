// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator #1 —
//             COURIER_SCHEDULING)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 ("one item per
//             active route with assigned courier: 'tomorrow's dispatch plan'"; "high (0.9) if route
//             degraded (severed-adjacent/saturated), moderate if sinuosity elevated, floor 0.1") + §2 row
//             5 (substrate: `courierShift` + `route` + `courier`).
//             Substrate (re-anchored this chunk): `courier_shift.status` ('in_transit' — the ACTIVE
//             dispatch signal, `operational_chain.ts:317`); `route.state` (`routeState` pgEnum
//             'draft'|'active'|'saturated'|'severed', `operational_chain.ts:288`) + `route.sinuosity_
//             index` (`:283`). Role: 6 (Courier coordinator, LOGISTICS_ROLE_ID — LIVE,
//             `lieutenant-archetype.ts`). REUSE `distributionRouteLifecycleTunables.sinuosityMeanderingMax` (the
//             EXISTING 'gnarled'-bucket cut, `distribution-tunables.ts:924` — never a NEW tunable for a
//             signal this codebase already grounds).
//             — P3-B C3 — 2026-07-11
//
// `CourierSchedulingGenerator` — one candidate per DISTINCT route currently carrying an in-transit
// courier shift for the player ("active route with assigned courier"). `dedupKey` = the route_id
// (stable across game-days — the SAME route re-enumerates to the SAME row identity every day it stays
// active; the day/generator discriminators live on `routine_items`' own UNIQUE constraint).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { courierShift, route } from '../../../db/schema/operational_chain';
import { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';
import { LOGISTICS_ROLE_ID } from '../../../operational/lieutenant/lieutenant-archetype';
import { distributionRouteLifecycleTunables } from '../../../operational/distribution/distribution-tunables';
import { clamp01 } from '../../../progression/loop10/hl-card-types';
import { resolveRoleHolder } from './role-holder';
import type { RoutineCandidate, RoutineItemGenerator } from './routine-item-generator';
import { courierSchedulingDeviationScore, type RouteStateEnumTs } from './deviation-scores';

// The PURE scorer + its route-state type now live in `./deviation-scores` (decorator-free, direct-
// importable by `flag_generators.spec.ts` — esbuild/Playwright's TS transform cannot parse a file
// containing a NestJS parameter-decorated constructor, so the scorer can no longer live alongside THIS
// `@Injectable()` class; see that file's own header for the full reasoning).

@Injectable()
export class CourierSchedulingGenerator implements RoutineItemGenerator {
  readonly generator = 'COURIER_SCHEDULING' as const;
  readonly responsibleRoleId = LOGISTICS_ROLE_ID; // 6 — Courier coordinator (LIVE, D6)

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenants: LieutenantRepository,
  ) {}

  async enumerate(playerId: string, _gameDay: number): Promise<RoutineCandidate[]> {
    const rows = await this.db
      .select({ routeId: courierShift.route_id, routeState: route.state, sinuosityIndex: route.sinuosity_index })
      .from(courierShift)
      .innerJoin(route, eq(route.route_id, courierShift.route_id))
      .where(and(eq(courierShift.player_id, playerId), eq(courierShift.status, 'in_transit')));

    // Distinct by route_id (a route can host at most one genuinely active in-transit shift in practice,
    // but the dedup is defensive — the candidate identity is the ROUTE, not the shift).
    const byRoute = new Map<string, { routeState: RouteStateEnumTs; sinuosityIndex: number }>();
    for (const r of rows) {
      if (!byRoute.has(r.routeId)) byRoute.set(r.routeId, { routeState: r.routeState, sinuosityIndex: r.sinuosityIndex });
    }
    if (byRoute.size === 0) return [];

    const holder = await resolveRoleHolder(this.lieutenants, playerId, this.responsibleRoleId);
    const meanderingMax = distributionRouteLifecycleTunables.sinuosityMeanderingMax;

    return [...byRoute.entries()].map(([routeId, r]) => ({
      dedupKey: routeId,
      descriptor: {
        key: 'core_loops.flag_discipline.routine.courier_scheduling.descriptor',
        params: { route_id: routeId },
      },
      flagReason: {
        key: 'core_loops.flag_discipline.reason.courier_scheduling',
        params: { route_id: routeId },
      },
      responsibleRoleId: this.responsibleRoleId,
      lieutenantId: holder?.lieutenantId ?? null,
      tenureScore: holder?.tenureScore ?? null,
      deviationScore: clamp01(courierSchedulingDeviationScore(r.routeState, r.sinuosityIndex, meanderingMax)),
    }));
  }
}

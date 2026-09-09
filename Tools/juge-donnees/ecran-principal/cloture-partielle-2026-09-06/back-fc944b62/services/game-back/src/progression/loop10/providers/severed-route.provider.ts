// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HL provider #2 —
//             SEVERED_ROUTE_REBUILD)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("routes in
//             `state='severed'` (`route.service.ts:38` LIVE; impact ∝ downstream throughput share,
//             urgency high)") + §1 D11 ("e.g. SEVERED_ROUTE_REBUILD full-reset = structural when P3-C
//             lands, v1 minimal-reroute = tactical").
//             Substrate (verified this chunk): `route.state` (`operational_chain.ts:259-280` —
//             `routeState` pgEnum `draft|active|saturated|severed`, System 9b DD-SEVER/DD-REPLAN).
//             — P3-A C6 — 2026-07-10
//
// `SeveredRouteHlCardProvider` — ONE aggregate candidate when the player has ≥1 severed route:
//   impact  = severedCount / totalRouteCount (ratio proxy for "downstream throughput share" — this
//     codebase has no per-route throughput/volume column to derive a literal share from; the ratio of
//     the player's route network currently down is the honest, deterministic, no-new-magic-number
//     stand-in, documented rather than silently invented).
//   urgency = 0.9 (FIXED — design-§8 concretization of "urgency high"; not a ratio/formula, a
//     qualitative constant like `ESCALATION_BACKLOG_REVIEW`'s "impact moderate" below).
// v1 = TACTICAL (design's own worked example — "v1 minimal-reroute = tactical"): this candidate's
// `decisionTypeCode` is the HL-provider-local code (102), NEVER a live `StructuralDecisionType` — see
// `hl-card-types.ts` file header for the full reasoning.
// Deterministic (D13): no Math.random, no Date.now — one query, a pure ratio.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { route } from '../../../db/schema/operational_chain';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.SEVERED_ROUTE_REBUILD)!.code;

/** "urgency high" — a design-§8 concretization (qualitative constant), not a derived ratio. */
const FIXED_URGENCY_HIGH = 0.9;

@Injectable()
export class SeveredRouteHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.SEVERED_ROUTE_REBUILD;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({ routeId: route.route_id, state: route.state })
      .from(route)
      .where(eq(route.player_id, playerId));

    const total = rows.length;
    const severedIds = rows.filter((r) => r.state === 'severed').map((r) => r.routeId);
    if (total === 0 || severedIds.length === 0) return [];

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(severedIds.length / total),
        urgency: FIXED_URGENCY_HIGH,
        targetRef: { entity: 'route', route_ids: [...severedIds].sort() },
        options: [
          { label: 'hl.option.severed_route.reroute_now' },
          { label: 'hl.option.severed_route.leave_severed' },
        ],
      },
    ];
  }
}

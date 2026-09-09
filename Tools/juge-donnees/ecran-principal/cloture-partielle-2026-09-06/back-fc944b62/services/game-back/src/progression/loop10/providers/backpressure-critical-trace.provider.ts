// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C8 (HL provider #6 —
//             BACKPRESSURE_CRITICAL_TRACE, ruling #9)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §8.4 ("≥1 node
//             critical ; impact = part des nodes critical") — "même forme aggregate-1-candidate que
//             `SeveredRouteHlCardProvider` (:38-64)", verbatim.
//             Substrate: `supply_node_pressure` (Loop 3 — Backpressure Trace, C5) + the EXISTING
//             `backpressureBucket` getter-backed derivation (`backpressure-bucket.ts`, C5) — never a
//             re-derived/inlined threshold.
//             Pattern: `severed-route.provider.ts` (`SeveredRouteHlCardProvider`) — the ratio-impact/
//             fixed-urgency aggregate-1-candidate shape design §8.4 names as the template.
//             — P3-C C8 — 2026-07-13
//
// `BackpressureCriticalTraceHlCardProvider` — ONE aggregate candidate when the player has ≥1
// `supply_node_pressure` row currently in the `critical` bucket:
//   impact  = criticalCount / totalTrackedNodes (design §8.4 verbatim: "impact = part des nodes
//     critical" — the ratio of the player's currently-diagnosed backpressure nodes sitting in
//     `critical`. "Tracked nodes" = every row this player has EVER accrued/propagated to — the ONLY
//     honest population `supply_node_pressure` can report; a building never touched by backpressure
//     carries no signal at all, silent by construction, and cannot inflate/deflate this ratio either
//     way — mirrors `SeveredRouteHlCardProvider`'s OWN "ratio proxy, no new magic number" precedent,
//     severedCount/totalRouteCount).
//   urgency = 0.9 (FIXED — design §8.4 gives a formula for impact only, not urgency; mirrors
//     `SeveredRouteHlCardProvider`'s OWN fixed "urgency high" constant for the identical reason: crossing
//     into `critical` is ITSELF the qualitative trigger the Exception producer already keys off,
//     `backpressure-exception-producer.service.ts` — not a second ratio to invent).
// Deterministic (D13): no Math.random, no Date.now — one query, a pure ratio.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { supplyNodePressureRow } from '../../../db/schema/supply_chain_loops';
import { coreLoopsTunables } from '../../../core_loops/core-loops-tunables';
import { backpressureBucket } from '../../../core_loops/supply_chain/backpressure-bucket';
import {
  clamp01,
  HL_CARD_PROVIDER_CATALOGUE,
  HlCardProviderType,
  type HlCardCandidate,
  type HlCardProvider,
} from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find(
  (e) => e.key === HlCardProviderType.BACKPRESSURE_CRITICAL_TRACE,
)!.code;

/** "urgency high" — mirrors `SeveredRouteHlCardProvider`'s own fixed constant (design §8.4 concretization). */
const FIXED_URGENCY_HIGH = 0.9;

@Injectable()
export class BackpressureCriticalTraceHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.BACKPRESSURE_CRITICAL_TRACE;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({
        buildingId: supplyNodePressureRow.building_id,
        backpressureIndex: supplyNodePressureRow.backpressure_index,
      })
      .from(supplyNodePressureRow)
      .where(eq(supplyNodePressureRow.player_id, playerId));

    const total = rows.length;
    if (total === 0) return [];

    const mild = coreLoopsTunables.backpressureMildThreshold;
    const warm = coreLoopsTunables.backpressureWarmThreshold;
    const critical = coreLoopsTunables.backpressureCriticalThreshold;
    const criticalBuildingIds = rows
      .filter((r) => backpressureBucket(r.backpressureIndex, mild, warm, critical) === 'critical')
      .map((r) => r.buildingId);
    if (criticalBuildingIds.length === 0) return [];

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(criticalBuildingIds.length / total),
        urgency: FIXED_URGENCY_HIGH,
        targetRef: { entity: 'supply_node_pressure', building_ids: [...criticalBuildingIds].sort() },
        options: [
          { label: 'hl.option.backpressure_critical_trace.trace_now' },
          { label: 'hl.option.backpressure_critical_trace.leave_pending' },
        ],
      },
    ];
  }
}

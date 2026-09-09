// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C8 (HL provider #7 —
//             MYCELIAL_STRESSED_LEG, ruling #9)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §8.4 ("≥1 leg
//             stressed") — "même forme aggregate-1-candidate que `SeveredRouteHlCardProvider` (:38-64)",
//             verbatim (design gives no formula for THIS provider's impact/urgency beyond the trigger
//             condition — the ratio/fixed-urgency split below mirrors that named template by analogy,
//             flagged honestly rather than invented silently, same discipline as `hl-card-types.ts`'s
//             own decision_type-numbering note).
//             Substrate: `supply_chain_legs.debt_load` + the EXISTING `isStressed` pure derivation
//             (`mycelial-stress.ts`, D4 — the SAME comparison every OTHER stress consumer shares, never
//             re-derived).
//             — P3-C C8 — 2026-07-13
//
// `MycelialStressedLegHlCardProvider` — ONE aggregate candidate when the player has ≥1
// `supply_chain_legs` row currently `stressed` (`debt_load > mycelial_stress_threshold`, §5.3):
//   impact  = stressedCount / totalLegCount (ratio proxy — mirrors `SeveredRouteHlCardProvider`'s OWN
//     severedCount/totalRouteCount "no new magic number" precedent, applied here to the leg population
//     this player has ever accrued throughput on).
//   urgency = 0.9 (FIXED — mirrors `SeveredRouteHlCardProvider`'s OWN "urgency high" constant; a
//     chronically stressed leg is already the Loop 5 Exception producer's own trigger condition,
//     `mycelial-stress-exception-producer.service.ts` — not a second ratio to invent).
// Deterministic (D13): no Math.random, no Date.now — one query, a pure ratio + the EXISTING isStressed fn.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { supplyChainLegRow } from '../../../db/schema/supply_chain_loops';
import { coreLoopsTunables } from '../../../core_loops/core-loops-tunables';
import { isStressed } from '../../../core_loops/supply_chain/mycelial-stress';
import {
  clamp01,
  HL_CARD_PROVIDER_CATALOGUE,
  HlCardProviderType,
  type HlCardCandidate,
  type HlCardProvider,
} from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.MYCELIAL_STRESSED_LEG)!.code;

/** "urgency high" — mirrors `SeveredRouteHlCardProvider`'s own fixed constant (design §8.4 concretization). */
const FIXED_URGENCY_HIGH = 0.9;

@Injectable()
export class MycelialStressedLegHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.MYCELIAL_STRESSED_LEG;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({ legId: supplyChainLegRow.leg_id, debtLoad: supplyChainLegRow.debt_load })
      .from(supplyChainLegRow)
      .where(eq(supplyChainLegRow.player_id, playerId));

    const total = rows.length;
    if (total === 0) return [];

    const threshold = coreLoopsTunables.mycelialStressThreshold;
    const stressedLegIds = rows.filter((r) => isStressed(r.debtLoad, threshold)).map((r) => r.legId);
    if (stressedLegIds.length === 0) return [];

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(stressedLegIds.length / total),
        urgency: FIXED_URGENCY_HIGH,
        targetRef: { entity: 'supply_chain_legs', leg_ids: [...stressedLegIds].sort() },
        options: [
          { label: 'hl.option.mycelial_stressed_leg.maintain_now' },
          { label: 'hl.option.mycelial_stressed_leg.leave_stressed' },
        ],
      },
    ];
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #6 —
//             LEG_STRESSED_ORIGIN)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("leg stressed
//             (§5.3) — poids amorti (§8.3)") + §8.3 ("un leg stressed compte comme blocked-output de son
//             node ORIGIN à demi-poids (pressure_per_tick × 0.5)").
//             Substrate: `supply_chain_legs.debt_load` vs `core_loops.mycelial_stress_threshold` (§5.3,
//             D4 — the SAME derived-never-stored `isStressed` this lot's OWN `mycelial-stress.ts`
//             already exports; C3/C4 REUSE precedent).
//             — P3-C C5 — 2026-07-12
//
// `LegStressedOriginDetector` — ONE blocked node per leg whose `debt_load` is currently `stressed`
// (design §5.3's own derivation, `stressed ⇔ debt_load > threshold` — the SAME comparison `isStressed`
// exports, expressed here as a set-based SQL predicate in `LegRepository.listStressedLegOrigins` rather
// than a per-row JS call, T3). The leg's ORIGIN building is the node (design §4.2/§8.3 — a stressed leg
// constrains what its ORIGIN can push out through it). The HALF-WEIGHT this source carries at accrual
// time (§8.3) is NOT applied here (this detector only DIAGNOSES; the weighting is
// `BackpressureUpdateService`'s own per-node aggregation concern, since a building can ALSO be tagged by
// a non-damped source in the SAME tick — see that service's header for the exact rule).

import { Injectable } from '@nestjs/common';

import { LegRepository } from '../leg.repository';
import { coreLoopsTunables } from '../../core-loops-tunables';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

@Injectable()
export class LegStressedOriginDetector implements BlockedOutputDetector {
  readonly source = 'LEG_STRESSED_ORIGIN' as const;

  constructor(private readonly legRepository: LegRepository) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const legs = await this.legRepository.listStressedLegOrigins(playerId, coreLoopsTunables.mycelialStressThreshold);
    return legs.map((l) => ({ buildingId: l.originBuildingId, source: this.source }));
  }
}

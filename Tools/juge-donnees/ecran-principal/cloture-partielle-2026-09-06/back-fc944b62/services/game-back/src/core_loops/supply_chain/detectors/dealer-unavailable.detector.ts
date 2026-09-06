// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #4 —
//             DEALER_UNAVAILABLE)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("dealer
//             `absent|compromised` sur dealer_spot (dealerState pgEnum operational_chain.ts:48)").
//             Substrate (verified C0 §8 / decisions §0 row 11): `dealer.current_state` (`dealerState`
//             pgEnum `working|idle|absent|compromised`, `operational_chain.ts:52`) + `dealer.
//             home_building_id` (the dealer_spot building, `:228`).
//             Pattern: `LekRotationGenerator` (`core_loops/flag_discipline/generators/lek-rotation.
//             generator.ts`) — the PRECEDENT for reading `dealer` directly via the injected DB client (no
//             dedicated dealer service/repository exists yet in this codebase; a plain, explicit-column
//             SELECT is the established cross-domain read shape here, not a new module edge).
//             — P3-C C5 — 2026-07-12
//
// `DealerUnavailableDetector` — ONE blocked node per dealer whose `current_state` is `absent` or
// `compromised` (the SAME 2-of-4 states `lek-rotation.generator.ts` treats as its own "elevated" input,
// design §6.1's own wording — a `working`/`idle` dealer is normally operating, never blocked-output). The
// dealer's `home_building_id` (the dealer_spot the player built) is the node: it is the addressable
// building the player can act on (the dealer_spot itself, or replacing/rotating the dealer).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { dealer } from '../../../db/schema/operational_chain';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

/** design §6.1 — the 2 (of 4) `dealerState` values this detector treats as "unavailable" output. */
const UNAVAILABLE_DEALER_STATES = ['absent', 'compromised'] as const;

@Injectable()
export class DealerUnavailableDetector implements BlockedOutputDetector {
  readonly source = 'DEALER_UNAVAILABLE' as const;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const rows = await this.db
      .select({ homeBuildingId: dealer.home_building_id })
      .from(dealer)
      .where(and(eq(dealer.player_id, playerId), inArray(dealer.current_state, [...UNAVAILABLE_DEALER_STATES])));
    return rows.map((r) => ({ buildingId: r.homeBuildingId, source: this.source }));
  }
}

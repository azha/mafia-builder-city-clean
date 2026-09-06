// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #5 —
//             ROUTE_SEVERED_DESTINATION)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("toutes les
//             saved routes du leg severed (route.state, §7)") + §7.5 ("`Downstream zero` strict s'applique
//             aux saved routes ; le dispatch AD-HOC ... reste légal" — an ad-hoc-servable destination is
//             NOT blocked even if every SAVED route on that pair is severed).
//             Substrate (verified C0 §8 / decisions §0 row 1 + row 6): `route.state` (`routeState` pgEnum
//             `draft|active|saturated|severed`, `operational_chain.ts:288` — System 9b's OWN existing
//             corridor-debt-driven sever, `route.service.ts evaluateAndMaybeSever`; this detector reads
//             the RESULT of that mechanic, whichever cause produced it — the P3-C SI-driven collapse
//             (design §7.3) lands at C7, but a route CAN already be `severed` today via 9b's live debt
//             sever, so this signal is real substrate NOW, not a forward reference).
//             — P3-C C5 — 2026-07-12
//
// `RouteSeveredDestinationDetector` — ONE blocked node per (origin, destination) pair where EVERY `is_
// saved` route the player owns on that pair is `state='severed'` (design §6.1's own "toutes les saved
// routes du leg" wording — a pair with at least ONE non-severed saved route still has a working saved
// path, so it is NOT blocked; a pair with ZERO saved routes at all has nothing to be "all severed", so it
// is NOT blocked either — only ad-hoc dispatch ever serves it, §7.5's own softened-K4 carve-out). The
// DESTINATION building is the node (design's own naming — "Route X collapsed. Downstream offline.",
// design §7.3): the far end can no longer receive via any saved plan.
//
// Set-based (T3): ONE query, GROUP BY (origin, destination) with a HAVING that compares the total saved-
// route count against the severed-route count for that pair — no per-row application loop.

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { route } from '../../../db/schema/operational_chain';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

@Injectable()
export class RouteSeveredDestinationDetector implements BlockedOutputDetector {
  readonly source = 'ROUTE_SEVERED_DESTINATION' as const;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const result = await this.db.execute(sql`
      SELECT ${route.destination_building_id} AS destination_building_id
      FROM ${route}
      WHERE ${route.player_id} = ${playerId} AND ${route.is_saved} = true
      GROUP BY ${route.destination_building_id}
      HAVING COUNT(*) = COUNT(*) FILTER (WHERE ${route.state} = 'severed')
    `);
    const rows =
      (result as unknown as { rows: Array<Record<string, unknown>> }).rows ??
      (result as unknown as Array<Record<string, unknown>>);
    return rows.map((r) => ({ buildingId: String(r.destination_building_id), source: this.source }));
  }
}

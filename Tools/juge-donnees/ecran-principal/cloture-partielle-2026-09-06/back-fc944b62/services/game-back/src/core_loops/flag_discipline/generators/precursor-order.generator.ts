// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator #2 —
//             PRECURSOR_ORDER, the D6 honest-gap generator)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 ("one item per
//             (building, precursor) at/below reorder point or with an arriving order: 'supplier order'";
//             "scarcity/trend elevation of the market state row (price-spike proxy), floor 0.1") + §2
//             row 5 (substrate: `precursorOrder` + `precursorStock` + `precursorMarketState`).
//             Decisions: §1.6 D6 + §8.5(b) — role_id 9 (Procurement specialist) has NO live recruit
//             path; `roleIdForArchetype`'s closed switch never returns 9 (C0-PROVEN) — this generator's
//             `resolveRoleHolder` call ALWAYS resolves null today; it is the lot's PRIMARY honest-gap
//             proof (items generate, auto-confirm, NEVER flag, NEVER move a token).
//             — P3-B C3 — 2026-07-11
//
// `PrecursorOrderGenerator` — one candidate per DISTINCT (building, precursor_type) the player is either
// STOCKING (a `precursor_stock` row exists) or has an order IN-FLIGHT for (`precursor_order` status
// 'pending'|'in_transit') — the union covers both "ongoing supply line" and "first order, no stock yet".
// `dedupKey` = `${building_id}:${precursor_type}` (stable — the entity is the (building, type) pair, not
// the day or any one order/stock row). The deviation score reads the GLOBAL (non-per-player)
// `precursor_market_state` row for that precursor type (scarcity_active / price_trend).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { precursorOrder, precursorStock } from '../../../db/schema/operational_chain';
import { precursorMarketState } from '../../../db/schema/precursor_market_state';
import { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';
import { resolveRoleHolder } from './role-holder';
import { clamp01 } from '../../../progression/loop10/hl-card-types';
import type { RoutineCandidate, RoutineItemGenerator } from './routine-item-generator';
import { precursorOrderDeviationScore, type PriceTrendEnumTs } from './deviation-scores';

/** role_id 9 — Procurement specialist (04a canonical catalogue, `lieutenant-archetype.ts`
 *  `ROLE_CATALOGUE_ORDER` index 8). NOT one of `roleIdForArchetype`'s live outputs (C0 §8.5(b) — no
 *  recruit path exists for this role today); grounded HERE as a bare int (mirrors D6's own framing —
 *  this is a canon role_id with no code constant of its own, unlike the 6 LIVE archetype role_ids). */
const PROCUREMENT_SPECIALIST_ROLE_ID = 9;

// The PURE scorer + its price-trend type now live in `./deviation-scores` (decorator-free, direct-
// importable by `flag_generators.spec.ts` — see that file's header for the full reasoning).

@Injectable()
export class PrecursorOrderGenerator implements RoutineItemGenerator {
  readonly generator = 'PRECURSOR_ORDER' as const;
  readonly responsibleRoleId = PROCUREMENT_SPECIALIST_ROLE_ID; // 9 — no live holder (D6 honest gap)

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenants: LieutenantRepository,
  ) {}

  async enumerate(playerId: string, _gameDay: number): Promise<RoutineCandidate[]> {
    const [stockRows, orderRows, marketRows] = await Promise.all([
      this.db
        .select({ buildingId: precursorStock.building_id, precursorType: precursorStock.precursor_type })
        .from(precursorStock)
        .where(eq(precursorStock.player_id, playerId)),
      this.db
        .select({ buildingId: precursorOrder.building_id, precursorType: precursorOrder.precursor_type })
        .from(precursorOrder)
        .where(and(eq(precursorOrder.player_id, playerId), inArray(precursorOrder.status, ['pending', 'in_transit']))),
      this.db
        .select({
          precursorType: precursorMarketState.precursor_type,
          scarcityActive: precursorMarketState.scarcity_active,
          priceTrend: precursorMarketState.price_trend,
        })
        .from(precursorMarketState),
    ]);

    const byKey = new Map<string, { buildingId: string; precursorType: string }>();
    for (const r of [...stockRows, ...orderRows]) {
      const key = `${r.buildingId}:${r.precursorType}`;
      if (!byKey.has(key)) byKey.set(key, { buildingId: r.buildingId, precursorType: r.precursorType });
    }
    if (byKey.size === 0) return [];

    const marketByType = new Map<string, { scarcityActive: boolean; priceTrend: PriceTrendEnumTs }>();
    for (const m of marketRows) marketByType.set(m.precursorType, { scarcityActive: m.scarcityActive, priceTrend: m.priceTrend });

    // D6 honest gap: role_id 9 (Procurement specialist) has no live recruit path — this ALWAYS resolves
    // null today (C0 §8.5(b)). Resolved via the SAME shared seam every generator uses (no hardcoded
    // bypass) so a future canon change activates lot-free, zero code change (D6).
    const holder = await resolveRoleHolder(this.lieutenants, playerId, this.responsibleRoleId);

    return [...byKey.entries()].map(([key, entry]) => {
      const market = marketByType.get(entry.precursorType) ?? { scarcityActive: false, priceTrend: 'STABLE' as PriceTrendEnumTs };
      return {
        dedupKey: key,
        descriptor: {
          key: 'core_loops.flag_discipline.routine.precursor_order.descriptor',
          params: { building_id: entry.buildingId, precursor_type: entry.precursorType },
        },
        flagReason: {
          key: 'core_loops.flag_discipline.reason.precursor_order',
          params: { building_id: entry.buildingId, precursor_type: entry.precursorType },
        },
        responsibleRoleId: this.responsibleRoleId,
        lieutenantId: holder?.lieutenantId ?? null,
        tenureScore: holder?.tenureScore ?? null,
        deviationScore: clamp01(precursorOrderDeviationScore(market.scarcityActive, market.priceTrend)),
      };
    });
  }
}

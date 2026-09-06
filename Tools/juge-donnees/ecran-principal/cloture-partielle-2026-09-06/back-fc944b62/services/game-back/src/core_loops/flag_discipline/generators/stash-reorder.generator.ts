// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator #4 —
//             STASH_REORDER, the D6 honest-gap generator)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 ("one item per
//             stash beyond rotation fill point: 'stash quantity reorder'"; "fill ratio + building heat
//             elevation, floor 0.1") + §2 row 5.
//             Decisions §8.5(a) — the C0-CORRECTED substrate pin: `product_storage.quantity_grams`
//             (`db/schema/operational_chain.ts:202`, per (player_id, building_id, substance_type)) for
//             buildings where `building_operational_state.operational_type = 'stash'`, + `buildings.heat`
//             (`db/schema/city_state.ts:147`, `real`, [0..1] normalized — `heat-tunables.ts`'s own
//             §enum HeatBucket header confirms the bound) for the heat-elevation signal. C0's OWN
//             honest-gap note: no capacity/fill-point column exists on `product_storage`/`buildings` —
//             `flag-discipline-tunables.ts`'s header (this chunk) records why a NEW flat, tier-agnostic
//             `core_loops.flag_stash_reorder_fill_point_grams` tunable (not a per-tier capacity model)
//             grounds the fill ratio here. Role: 2 (Stash keeper — NO live recruit path, D6 honest gap;
//             `roleIdForArchetype`'s closed switch never returns 2, C0 §8.5(b)).
//             — P3-B C3 — 2026-07-11
//
// `StashReorderGenerator` — one candidate per (player, stash building, substance_type) row currently
// held in `product_storage` for a `stash`-type building. `dedupKey` = `${building_id}:${substance_type}`
// (stable — the entity is the per-substance stash slot, not the day).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { buildingOperationalState, productStorage } from '../../../db/schema/operational_chain';
import { building } from '../../../db/schema/city_state';
import { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';
import { flagDisciplineTunables } from '../flag-discipline-tunables';
import { resolveRoleHolder } from './role-holder';
import type { RoutineCandidate, RoutineItemGenerator } from './routine-item-generator';
import { stashReorderDeviationScore } from './deviation-scores';

/** role_id 2 — Stash keeper (04a canonical catalogue, `lieutenant-archetype.ts` `ROLE_CATALOGUE_ORDER`
 *  index 1). NOT one of `roleIdForArchetype`'s live outputs (C0 §8.5(b) — no recruit path exists for
 *  this role today); grounded HERE as a bare int, mirroring `PRECURSOR_ORDER`'s OWN framing. */
const STASH_KEEPER_ROLE_ID = 2;

// The PURE scorer now lives in `./deviation-scores` (decorator-free, direct-importable by
// `flag_generators.spec.ts` — see that file's header for the full reasoning).

@Injectable()
export class StashReorderGenerator implements RoutineItemGenerator {
  readonly generator = 'STASH_REORDER' as const;
  readonly responsibleRoleId = STASH_KEEPER_ROLE_ID; // 2 — no live holder (D6 honest gap)

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenants: LieutenantRepository,
  ) {}

  async enumerate(playerId: string, _gameDay: number): Promise<RoutineCandidate[]> {
    const rows = await this.db
      .select({
        buildingId: productStorage.building_id,
        substanceType: productStorage.substance_type,
        quantityGrams: productStorage.quantity_grams,
        heat: building.heat,
      })
      .from(productStorage)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, productStorage.building_id))
      .innerJoin(building, eq(building.building_id, productStorage.building_id))
      .where(and(eq(productStorage.player_id, playerId), eq(buildingOperationalState.operational_type, 'stash')));

    if (rows.length === 0) return [];

    // D6 honest gap: role_id 2 (Stash keeper) has no live recruit path — this ALWAYS resolves null today
    // (C0 §8.5(b)). Resolved via the SAME shared seam every generator uses.
    const holder = await resolveRoleHolder(this.lieutenants, playerId, this.responsibleRoleId);
    const fillPointGrams = flagDisciplineTunables.flagStashReorderFillPointGrams;

    return rows.map((r) => {
      const dedupKey = `${r.buildingId}:${r.substanceType}`;
      return {
        dedupKey,
        descriptor: {
          key: 'core_loops.flag_discipline.routine.stash_reorder.descriptor',
          params: { building_id: r.buildingId, substance_type: r.substanceType },
        },
        flagReason: {
          key: 'core_loops.flag_discipline.reason.stash_reorder',
          params: { building_id: r.buildingId, substance_type: r.substanceType },
        },
        responsibleRoleId: this.responsibleRoleId,
        lieutenantId: holder?.lieutenantId ?? null,
        tenureScore: holder?.tenureScore ?? null,
        deviationScore: stashReorderDeviationScore(r.quantityGrams, fillPointGrams, r.heat),
      };
    });
  }
}

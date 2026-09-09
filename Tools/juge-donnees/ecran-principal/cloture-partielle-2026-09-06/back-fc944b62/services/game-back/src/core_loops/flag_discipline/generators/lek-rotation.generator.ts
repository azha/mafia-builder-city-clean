// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator #5 —
//             LEK_ROTATION)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 ("one item per
//             active dealer: 'lek presence rotation'"; "dealer `compromised` (0.9) / lek-memory burn
//             elevation, floor 0.1") + §2 row 5 (substrate: `dealer` (+ `lekMemoryCellState` where
//             present)). Role: 8 (Dealer coordinator, DISTRIBUTION_ROLE_ID — LIVE, `lieutenant-
//             archetype.ts`).
//             Substrate: `dealer.current_state` (`dealerState` pgEnum 'working'|'idle'|'absent'|
//             'compromised', `operational_chain.ts:48`); `dealer.coverage_lek_tile_id` (soft-ref tile,
//             `:225`) → `lek_memory_cell_state.lambda_weight` (`reputation_state.ts:365` — the current
//             decayed inheritance weight ∈ [0,1], KEYED (player_id, tile_id), may be ABSENT for a tile
//             with no lek-memory history yet).
//             Honest simplification (disclosed, not silent — flagged for reviewer): the codebase already
//             derives a richer `LekTileReputationBucket`/perf-multiplier from lek memory
//             (`LekMemoryService.getPositionMemoryAggregate`, `reputation/` module, consumed by
//             `DistributionBindingService`); wiring that FULL service into this generator would pull
//             `ReputationModule` into `FlagDisciplineModule`'s import graph for a single scoring signal.
//             This generator instead reads `lambda_weight` DIRECTLY (design §5's own substrate pin) via a
//             simple, deterministic, disclosed formula (below) rather than the richer bucket — a v1
//             simplification consistent with D5's "deterministic score, not rich archetype heuristics".
//             — P3-B C3 — 2026-07-11
//
// `LekRotationGenerator` — one candidate per dealer row for the player ("active dealer" = every dealer
// spot the player currently operates). `dedupKey` = the dealer_id (stable).

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { dealer } from '../../../db/schema/operational_chain';
import { lekMemoryCellState } from '../../../db/schema/reputation_state';
import { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';
import { DISTRIBUTION_ROLE_ID } from '../../../operational/lieutenant/lieutenant-archetype';
import { resolveRoleHolder } from './role-holder';
import type { RoutineCandidate, RoutineItemGenerator } from './routine-item-generator';
import { lekRotationDeviationScore } from './deviation-scores';

// The PURE scorer now lives in `./deviation-scores` (decorator-free, direct-importable by
// `flag_generators.spec.ts` — see that file's header for the full reasoning).

@Injectable()
export class LekRotationGenerator implements RoutineItemGenerator {
  readonly generator = 'LEK_ROTATION' as const;
  readonly responsibleRoleId = DISTRIBUTION_ROLE_ID; // 8 — Dealer coordinator (LIVE, D6)

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenants: LieutenantRepository,
  ) {}

  async enumerate(playerId: string, _gameDay: number): Promise<RoutineCandidate[]> {
    const dealers = await this.db
      .select({
        dealerId: dealer.dealer_id,
        currentState: dealer.current_state,
        coverageLekTileId: dealer.coverage_lek_tile_id,
      })
      .from(dealer)
      .where(eq(dealer.player_id, playerId));

    if (dealers.length === 0) return [];

    const memoryRows = await this.db
      .select({ tileId: lekMemoryCellState.tile_id, lambdaWeight: lekMemoryCellState.lambda_weight })
      .from(lekMemoryCellState)
      .where(eq(lekMemoryCellState.player_id, playerId));
    const lambdaByTile = new Map<number, number>();
    for (const m of memoryRows) lambdaByTile.set(m.tileId, m.lambdaWeight);

    const holder = await resolveRoleHolder(this.lieutenants, playerId, this.responsibleRoleId);

    return dealers.map((d) => ({
      dedupKey: d.dealerId,
      descriptor: {
        key: 'core_loops.flag_discipline.routine.lek_rotation.descriptor',
        params: { dealer_id: d.dealerId },
      },
      flagReason: {
        key: 'core_loops.flag_discipline.reason.lek_rotation',
        params: { dealer_id: d.dealerId },
      },
      responsibleRoleId: this.responsibleRoleId,
      lieutenantId: holder?.lieutenantId ?? null,
      tenureScore: holder?.tenureScore ?? null,
      deviationScore: lekRotationDeviationScore(d.currentState, lambdaByTile.get(d.coverageLekTileId) ?? null),
    }));
  }
}

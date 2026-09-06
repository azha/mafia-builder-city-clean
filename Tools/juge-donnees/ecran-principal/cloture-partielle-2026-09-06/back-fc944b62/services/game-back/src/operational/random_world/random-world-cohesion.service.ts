// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C4 (S17 cohesion mutation
//             path — hollow's immediate drop/reweave-restore, apparent_recovery's resolution residue)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §2 seam S17
//             (`CohesionPermafrostRepository.applyMutations`, `cohesion.repository.ts:73,162`) + §3.5.4
//             (hollow drop/restore) + §3.5.3 (apparent_recovery residue) — D9 "même voie que l'outcome
//             attend 04g-A".
//             S17 exact path (mirrors `operational/ambient/ambient-attend.service.ts`'s own D9-ruled
//             VERBATIM path, `2026-07-13-04g-A-C0-reanchor.md` §2): read
//             `CohesionPermafrostService.getCohesionRaw(playerId, districtId)`, compute
//             `newCohesion = clamp01(current.cohesion + delta)`, write via
//             `CohesionPermafrostRepository.applyMutations(playerId, [{district_id, cohesion:
//             newCohesion, thaw_threshold_current: current.thaw_threshold_current,
//             active_informant_count: current.active_informant_count, permanent_marginal_flag:
//             current.permanent_marginal_flag, last_thaw_event_at: undefined}])`.
//             — 04g-B C4 — 2026-07-15
//
// `RandomWorldCohesionMutationService` — the ONE place C4's 2 cohesion-curve templates apply an
// immediate S17 mutation to EVERY player owning ≥1 building in a district (design D9's "ciblage
// borné", re-queried FRESH at each call — never a frozen roster from activation time): hollow's −0.18
// drop (activation) / +0.18 restore (reweave fork outcome), apparent_recovery's −0.08 residue
// (resolution). ZERO direct SQL against `district_cohesion` — every write routes through
// `CohesionPermafrostRepository.applyMutations`, the SAME seam `AmbientAttendService` (04g-A) already
// established and this lot's own C0 re-anchor confirmed live (S17). R2.2 AC10: this file IS the
// code-path proof — no `district_cohesion` UPDATE/INSERT string appears anywhere else in this lot
// (swept statically by `random_world_c4_r22_r23_sweep.spec.ts`).

import { Injectable, Logger } from '@nestjs/common';

import { CohesionPermafrostService } from '../../citysim/cohesion/cohesion.service';
import { CohesionPermafrostRepository } from '../../citysim/cohesion/cohesion.repository';
import { RandomWorldEventRepository } from './random-world-event.repository';

/** clamp v to [0,1] (mirrors `ambient-attend.service.ts`'s own `clamp01` — per-file self-containment,
 *  the established convention this codebase already follows for this exact 3-line helper). */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

@Injectable()
export class RandomWorldCohesionMutationService {
  private readonly logger = new Logger(RandomWorldCohesionMutationService.name);

  constructor(
    private readonly repo: RandomWorldEventRepository,
    private readonly cohesion: CohesionPermafrostService,
    private readonly cohesionRepo: CohesionPermafrostRepository,
  ) {}

  /**
   * Apply `delta` to `districtId`'s cohesion for EVERY player owning ≥1 building there (design AC1/AC6
   * "chaque joueur avec ≥1 building en D" — the set is re-queried fresh at call time, never cached from
   * activation). A player with NO seeded `district_cohesion` row yet is skipped (documented no-op,
   * mirrors `AmbientAttendService`'s own no-fabrication edge — never crashes, never fabricates a row;
   * this IS the AC1 negation's structural mechanism too: a player with zero buildings in `districtId`
   * never even appears in the candidate set, so their OTHER districts' cohesion stays byte-identical by
   * construction, never touched).
   * @returns the player ids that ACTUALLY received a mutation (excludes the no-row-yet skips) — tests
   *   read this back to assert "exactly N players mutated".
   */
  async applyDeltaToDistrictPlayers(districtId: number, delta: number): Promise<readonly string[]> {
    const playerIds = await this.repo.listPlayersWithBuildingInDistrict(districtId);
    const applied: string[] = [];
    for (const playerId of playerIds) {
      const current = await this.cohesion.getCohesionRaw(playerId, districtId);
      if (current === null) {
        this.logger.warn(
          `RandomWorldCohesionMutationService: no district_cohesion row for player ${playerId} district ${districtId} yet ` +
            '(player has not crossed a NIGHTLY boundary) — skipping this delta (no fabrication, no crash, mirrors AmbientAttendService).',
        );
        continue;
      }
      const newCohesion = clamp01(current.cohesion + delta);
      await this.cohesionRepo.applyMutations(playerId, [
        {
          district_id: districtId,
          cohesion: newCohesion,
          thaw_threshold_current: current.thaw_threshold_current,
          active_informant_count: current.active_informant_count,
          permanent_marginal_flag: current.permanent_marginal_flag,
          last_thaw_event_at: undefined,
        },
      ]);
      applied.push(playerId);
    }
    return applied;
  }
}

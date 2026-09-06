// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C2
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.3 (the attend
//             loop, D7/D8 diminishing returns)
//             S4 RULING (VERBATIM, follow exactly): docs/superpowers/plans/2026-07-13-04g-A-C0-reanchor.md
//             §2 — read `CohesionPermafrostService.getCohesionRaw(playerId, districtId)` (the service's
//             public read surface), compute `newCohesion = clamp01(current.cohesion + residueDelta)`
//             (replicate ONLY the `clamp01` invariant — the repo does NOT clamp itself), then call
//             `CohesionPermafrostRepository.applyMutations(playerId, [{district_id, cohesion: newCohesion,
//             thaw_threshold_current: current.thaw_threshold_current, active_informant_count:
//             current.active_informant_count, permanent_marginal_flag: current.permanent_marginal_flag,
//             last_thaw_event_at: undefined}])` — safe because the residue is ALWAYS positive (never
//             triggers a NEW thaw; Phase B only fires on a downward crossing).
//             — 04g-A C2 — 2026-07-13
//
// `AmbientAttendService` — the attend loop (design §3.3): mark ONE event `attended` + apply the cohesion
// residue outcome, with intra-day diminishing returns (D8).
//
// CONCURRENCY (design §3.3: "conflit concurrent : UPDATE conditionnel WHERE status='live', perdant →
// 409"): the ONLY state mutation gating this whole method is `AmbientMicroEventRepository.claimAttend`'s
// single conditional UPDATE — never a read-then-write. A caller that loses the claim (0 rows affected)
// returns EARLY (a 404/409 `ApiError`) BEFORE ever touching cohesion — so exactly ONE of two concurrent
// callers for the SAME event ever reaches the cohesion-mutation step (C2 AC7's "1 mutation" proof).
//
// DIMINISHING RETURNS (D8, design §3.3): the n-th attend of THIS player on THIS game_day applies
// `residue × factor^(n-1)` (1st = residue, 2nd = residue×factor, 3rd = residue×factor², …). `n` is read
// via `AmbientMicroEventRepository.countAttendsForDay` AFTER the claim wins (so it counts the just-won
// row) — this is naturally EXACT (no separate counter column, no race: the count is derived from the SAME
// `attended_by_player_id`/`attended_at_game_day` columns the claim just wrote) and naturally RESETS the
// next game_day (a fresh COUNT against a new `attended_at_game_day` value, D8 "reset next game-day").
//
// COHESION ROW MISSING (an honest, documented edge — NOT covered by a design ruling): a player who has
// NEVER crossed their own first NIGHTLY boundary has no `district_cohesion` rows yet
// (`CohesionPermafrostService`'s lazy per-player seed, `ensureSeeded`, is `private` — there is no public
// seed-on-demand entry point per the S4 ruling's own audit). `getCohesionRaw` returns `null` in that case.
// This service does NOT fabricate a row, does NOT crash, and does NOT retry a seed — it skips the cohesion
// mutation for THIS attend (the event is still marked `attended`; L1-natural, mirrors the codebase-wide
// "no row → no-op" idiom, e.g. `ConstantHumRepository`'s "district with zero buildings → no cell").

import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { CohesionPermafrostService } from '../../citysim/cohesion/cohesion.service';
import { CohesionPermafrostRepository } from '../../citysim/cohesion/cohesion.repository';
import { ambientTunables } from './ambient.tunables';
import { deriveGameDay } from './ambient-clock';
import { AmbientMicroEventRepository } from './ambient-micro-event.repository';

/** Clamp a value to the cohesion domain [0,1] (the DB CHECK is `cohesion real [0..1]`) — the ONLY
 *  `cohesion.service.ts` invariant this service replicates, per the S4 ruling (the repo does not clamp). */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** The result of one successful attend (internal — the controller/projection maps `attendTier` → a
 *  qualitative band, R2.2; the raw delta magnitude NEVER leaves this service). */
export interface AttendOutcome {
  readonly eventId: string;
  readonly districtId: number;
  /** The 1-indexed diminishing-returns tier this attend landed on (1 = full residue, 2 = ×factor, …). */
  readonly attendTier: number;
  /** Whether a cohesion mutation was actually applied (false iff the player has no seeded cohesion row
   *  for this district yet — the documented no-op edge, see file header). */
  readonly cohesionApplied: boolean;
}

@Injectable()
export class AmbientAttendService {
  private readonly logger = new Logger(AmbientAttendService.name);

  constructor(
    private readonly repo: AmbientMicroEventRepository,
    private readonly cohesion: CohesionPermafrostService,
    private readonly cohesionRepo: CohesionPermafrostRepository,
  ) {}

  /**
   * Attend ONE `live`, non-expired event. Throws `RESOURCE_NOT_FOUND` (the id never existed) or
   * `RESOURCE_STATE_CONFLICT` (409 — already attended / expired / lost the concurrent race) via the
   * repository's single conditional UPDATE (see file header). On success: applies the diminishing-returns
   * cohesion residue to `(playerId, event.district_id)` via the S4 ruling's exact repo path.
   */
  async attend(playerId: string, eventId: string): Promise<AttendOutcome> {
    const nowGameMinute = await this.repo.getCurrentGameMinute(playerId);
    const gameDay = deriveGameDay(nowGameMinute, citySimTunables.inGameDayLengthMinutes);

    const claim = await this.repo.claimAttend(eventId, playerId, gameDay, nowGameMinute);
    if (!claim.ok) {
      if (claim.reason === 'not_found') {
        throw new ApiError('RESOURCE_NOT_FOUND', { message: `No ambient micro-event ${eventId}.` });
      }
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Ambient micro-event ${eventId} is no longer live (already attended, expired, or a concurrent attend won).`,
      });
    }

    // Diminishing returns (D8): n = the count of THIS player's attends on THIS game_day, INCLUDING the row
    // the claim above just wrote (so n is exact — no separate counter, no race window).
    const attendTier = await this.repo.countAttendsForDay(playerId, gameDay);
    const residue = ambientTunables.constantHumAttendedResidueMagnitude;
    const factor = ambientTunables.constantHumAttendDiminishingFactor;
    const delta = residue * Math.pow(factor, attendTier - 1);

    const cohesionApplied = await this.applyCohesionResidue(playerId, claim.districtId, delta);

    return { eventId, districtId: claim.districtId, attendTier, cohesionApplied };
  }

  /**
   * The S4 ruling's exact mutation path (see file header): read → clamp01(current + delta) → write via
   * `CohesionPermafrostRepository.applyMutations`, threading `thaw_threshold_current` /
   * `active_informant_count` / `permanent_marginal_flag` UNCHANGED and `last_thaw_event_at: undefined`
   * (the repo's COALESCE marker preserves the prior value). Returns `false` (a documented no-op, never a
   * throw) iff the player has no seeded cohesion row for this district yet.
   */
  private async applyCohesionResidue(playerId: string, districtId: number, delta: number): Promise<boolean> {
    const current = await this.cohesion.getCohesionRaw(playerId, districtId);
    if (current === null) {
      this.logger.warn(
        `AmbientAttendService: no district_cohesion row for player ${playerId} district ${districtId} yet ` +
          '(player has not crossed a NIGHTLY boundary) — skipping the cohesion residue for this attend (no fabrication, no crash).',
      );
      return false;
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
    return true;
  }
}

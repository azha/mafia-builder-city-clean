// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C4 (RECRUITMENT_AVAILABILITY_
//             TICK — NIGHTLY/23 registration + orchestration)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §9 (availability tick
//             + candidate lifecycle)
//             Decisions: D7 (civilian affinity-derived) / D8 (defector regime-live) / D11 (seeded
//             determinism, no Math.random)
//             Pattern: services/game-back/src/operational/maintenance/maintenance-phase-tick.service.ts
//             (`MaintenancePhaseTickService` — the NIGHTLY registration + `onApplicationBootstrap` +
//             count-returning `runNightlyTick(ctx)` shape this file mirrors verbatim)
//             ★ ANTI-COLLISION: registers at NIGHTLY/23, NOT 22 — NIGHTLY/22 is CEDED to the parallel
//             P3-A session's `EXCEPTION_QUEUE_TICK` (which merges FIRST; controller ruling, 2026-07-11).
//             — 04f-B C4 — 2026-07-11
//
// `RecruitmentAvailabilityTickService` — registers `RECRUITMENT_AVAILABILITY_TICK` at NIGHTLY/23
// (confirmed free after MAINTENANCE_PHASE_TICK/21 — 22 is ceded, see the SCHEDULE comment). Each in-game
// night, per player, in order:
//   (1) Saltline replenish — tops the pool to `saltlineCandidatesPerPool` `available` rows (the SAME
//       `SaltlineRecruitmentService.buildCandidateRows` the C2 `replenish-saltline` test route already
//       drives — this tick is the REAL organic caller that route's own header comment always named).
//   (2) Defector regime scan (D8, LIVE) — `RecruitmentRepository.listQualifyingDefectorRivalKeys` reads
//       `rival_state.regime` directly; any qualifying rival (`bleeding`|`retrench`) NOT already carrying a
//       non-terminal defector candidate (the dedup gate) gets ONE seeded `DefectorRecruitmentService.
//       buildCandidateRow`.
//   (3) Civilian affinity scan (D7, DERIVED) — `resolveAffinitySatisfactionThreshold` decomposes the
//       registered `civilian_affinity_threshold_for_candidacy` composite; `RecruitmentRepository.
//       listAffinityQualifyingCitizens` reads the LIVE `rich_citizens` predicate (excluding citizens
//       already carrying a non-terminal civilian candidate), capped at the room left under the REUSED
//       `saltlineCandidatesPerPool` ceiling (★ documented REUSE, see the cap comment below — design §9
//       only says "up to a small cap" without naming a distinct registry key; C1 registered exactly 15
//       `recruitment.*` keys as the design §12 CLOSED set, and `saltlineCandidatesPerPool` is the ONLY
//       "candidates outstanding per pool" tunable that exists — inventing a 16th key here would violate
//       R2.3 registry-first outside the design's own enumerated list).
//   (4) Candidate expiry — `RecruitmentRepository.expireStaleCandidates` ages out `available` rows past
//       `expires_at_game_day`.
//
// L1 natural no-op: a player with a full Saltline pool, no qualifying rivals, no affine citizens, and no
// stale candidates → ZERO writes for all 4 steps (the "passive-player write-bound proof", plan §C4 floor).
// Idempotent BY CONSTRUCTION — no epoch-claim marker column needed (the EQUIPMENT_FAILURE_WEEKLY_TICK
// "naturally idempotent" precedent): dedup gates (source_rival_key / citizen_id) + cap-bounded topping +
// threshold-bounded expiry all converge to zero incremental writes on ANY re-run, same day or later.
// Deterministic: NO `Math.random()`, NO `Date.now()` — the ONLY draw source is `makeRng` (via the 3
// pool services' `buildCandidateRow(s)`), and the regime/affinity ELIGIBILITY gates themselves are pure
// predicates over already-persisted state (no roll needed to decide "whether" — see the handoff report's
// documented resolution of the plan's "seeded which/whether" phrasing).
//
// NOT this chunk (C5/C6's own scope, plan §C4 "C4 only SURFACES the candidates"): defector
// approach/vetting/onboarding, civilian identification-decision/courting/initiation. "Stale quest
// abandon" (design §4's prose "abandons quests stale past a long tunable window") is an honest
// documented gap — no `recruitment.*` key for a quest-staleness window exists in C1's registered set
// (design §12's own enumerated 14 NEW + 1 REUSE list does not include one); inventing one now would be
// the SAME R2.3 registry-first violation the cap comment above avoids. Routed as a forward TD (C9/closeout).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { citySimTunables } from '../../citysim/citysim-tunables';
// REUSE the SAME game-day derivation every other 04f/political consumer uses (RecruitmentRepository's own
// `getCurrentGameDayAndMinute` precedent).
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { recruitmentTunables } from './recruitment-tunables';
import { RecruitmentRepository } from './recruitment.repository';
import { SaltlineRecruitmentService } from './saltline-recruitment.service';
import { DefectorRecruitmentService } from './defector-recruitment.service';
import { CivilianRecruitmentService, resolveAffinitySatisfactionThreshold } from './civilian-recruitment.service';

@Injectable()
export class RecruitmentAvailabilityTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecruitmentAvailabilityTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: RecruitmentRepository,
    private readonly saltline: SaltlineRecruitmentService,
    private readonly defector: DefectorRecruitmentService,
    private readonly civilian: CivilianRecruitmentService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.RECRUITMENT_AVAILABILITY_TICK,
      cadence: Cadence.NIGHTLY,
      order: 23,
      run: async (ctx) => {
        await this.runNightlyTick(ctx);
      },
    });
    this.logger.log(
      'RecruitmentAvailabilityTickService registered RECRUITMENT_AVAILABILITY_TICK at NIGHTLY/23 — ' +
        '22 CEDED to the parallel P3-A EXCEPTION_QUEUE_TICK (merges first), next free after ' +
        'MAINTENANCE_PHASE_TICK/21 is 23 (confirmed, no slot collision). Each in-game night, per player: ' +
        '(1) Saltline replenish; (2) Defector regime scan (D8, LIVE, dedup-gated); (3) Civilian affinity ' +
        'scan (D7, DERIVED, dedup-gated, capped); (4) candidate expiry. L1 empty-state skip: a fully-' +
        'topped/no-qualifying/no-stale player → ZERO writes. Idempotent by construction (dedup + cap + ' +
        'threshold — no epoch-claim column needed).',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/23 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 23} — Saltline replenish + Defector regime scan (D8) + Civilian affinity scan (D7) +
   * candidate expiry, in that order, for `ctx.playerId`. Deterministic (NO Math.random — the ONLY draw
   * source is `makeRng` via the pool services). Organically a no-op for a passive player. Returns the
   * per-step insert/expiry COUNTS (the count-based idempotency-proof shape the MAINTENANCE_PHASE_TICK /
   * IA_DECAY_TICK precedent both use — a same-day re-run against an unchanged world returns all zeros).
   */
  async runNightlyTick(
    ctx: CitySimTickContext,
  ): Promise<{
    saltlineInserted: number;
    defectorInserted: number;
    civilianInserted: number;
    candidatesExpired: number;
  }> {
    const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);

    // (1) Saltline replenish — tops the pool to `saltlineCandidatesPerPool` `available` rows (the SAME
    // generation method + slot-continuation logic the C2 `replenish-saltline` test route drives).
    const saltlineBefore = await this.repo.countAvailableCandidates(ctx.playerId, 'saltline');
    const saltlineCap = recruitmentTunables.saltlineCandidatesPerPool;
    const saltlineToInsert = Math.max(0, saltlineCap - saltlineBefore);
    const saltlineRows =
      saltlineToInsert > 0
        ? this.saltline.buildCandidateRows(ctx.playerId, gameDay, saltlineBefore, saltlineToInsert)
        : [];
    const saltlineInserted = (await this.repo.insertCandidates(saltlineRows)).length;

    // (2) Defector regime scan (D8) — one seeded candidate per qualifying rival NOT already dedup-gated.
    const qualifyingRivals = await this.repo.listQualifyingDefectorRivalKeys(ctx.playerId);
    let defectorInserted = 0;
    if (qualifyingRivals.length > 0) {
      const activeRivalKeys = await this.repo.listActiveDefectorSourceRivalKeys(ctx.playerId);
      const newDefectorRows = qualifyingRivals
        .filter((rivalKey) => !activeRivalKeys.has(rivalKey))
        .map((rivalKey) => this.defector.buildCandidateRow(ctx.playerId, rivalKey, gameDay));
      if (newDefectorRows.length > 0) {
        defectorInserted = (await this.repo.insertCandidates(newDefectorRows)).length;
      }
    }

    // (3) Civilian affinity scan (D7) — up to the room left under the REUSED per-pool cap (see file
    // header note on the `saltlineCandidatesPerPool` REUSE for civilian).
    const civilianCap = recruitmentTunables.saltlineCandidatesPerPool;
    const civilianBefore = await this.repo.countAvailableCandidates(ctx.playerId, 'civilian');
    const civilianRoomLeft = Math.max(0, civilianCap - civilianBefore);
    let civilianInserted = 0;
    if (civilianRoomLeft > 0) {
      const activeCitizenIds = await this.repo.listActiveCivilianCitizenIds(ctx.playerId);
      const threshold = resolveAffinitySatisfactionThreshold(recruitmentTunables.civilianAffinityThresholdForCandidacy);
      const qualifyingCitizens = await this.repo.listAffinityQualifyingCitizens(
        ctx.playerId,
        threshold,
        [...activeCitizenIds],
        civilianRoomLeft,
      );
      const newCivilianRows = qualifyingCitizens.map((c) => this.civilian.buildCandidateRow(ctx.playerId, c, gameDay));
      if (newCivilianRows.length > 0) {
        civilianInserted = (await this.repo.insertCandidates(newCivilianRows)).length;
      }
    }

    // (4) Candidate expiry.
    const candidatesExpired = await this.repo.expireStaleCandidates(ctx.playerId, gameDay);

    this.logger.log(
      `RECRUITMENT_AVAILABILITY_TICK: player=${ctx.playerId} day=${gameDay} → ` +
        `${saltlineInserted} saltline candidate(s) replenished, ${defectorInserted} defector candidate(s) ` +
        `surfaced (D8), ${civilianInserted} civilian candidate(s) surfaced (D7), ${candidatesExpired} ` +
        `candidate(s) expired.`,
    );
    return { saltlineInserted, defectorInserted, civilianInserted, candidatesExpired };
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C1 (falsifiable tunable
//             read-back) + C2 (quest machine + Saltline pool — the `replenish-saltline` test seam, DD-R4:
//             drives the REAL `SaltlineRecruitmentService.buildCandidateRows` + `RecruitmentRepository`
//             methods, never a parallel implementation) + the plan's "Global constraints" test-seam
//             convention (`*-test.controller.ts` gated `testControllersEnabled()`)
//             Test seam precedent: services/game-back/src/operational/maintenance/maintenance-test.
//             controller.ts (`GET /_test/maintenance/read-tunables` — the SAME registry-first-chunk
//             posture: a tunables file has no consumer yet at C1, so a side-effect-free read-tunables
//             probe is the falsifiable value-sensitivity proof until a later chunk wires a real consumer)
//             — 04f-B C1 — 2026-07-11 (`read-tunables` only) | C2 extension — 2026-07-11
//             (`replenish-saltline` — the C4 NIGHTLY/23 tick will later call the SAME
//             `SaltlineRecruitmentService` method for the organic replenish; this route is the ONLY way
//             C2's own floor can surface a Saltline candidate before that tick exists)
//
// `RecruitmentTestController` — TEST-ONLY probe routes for `RecruitmentModule`. Mounted ONLY when
// `testControllersEnabled()` (NODE_ENV !== 'production').
//
// C1 routes:
//   GET /v1/_test/recruitment/read-tunables
//     Returns all 15 `recruitmentTunables.*` getter values (recruitment-tunables.ts) as a plain object —
//     a side-effect-free poll target for `recruitment_schema_tunables.spec.ts`'s value-sensitivity proof
//     (flip a `tunable_overrides` row for a `recruitment.*` key → this route's value moves → clear the
//     override → back to default). Anti-fabrication: reads REAL getter output, never a hardcoded echo.
//
// C2 routes:
//   POST /v1/_test/recruitment/replenish-saltline
//     Tops a player's Saltline pool up to `saltlineCandidatesPerPool` `available` rows for the given (or
//     current) game-day, calling the REAL `SaltlineRecruitmentService.buildCandidateRows` +
//     `RecruitmentRepository.countAvailableCandidates`/`insertCandidates` — the exact method the C4
//     NIGHTLY/23 tick calls. Deterministic: re-running for the SAME (player, game_day) with an
//     already-full pool inserts 0 NEW rows (idempotent — no duplicate slots).
//
// C4 routes:
//   POST /v1/_test/recruitment/run-availability-tick
//     Calls `RecruitmentAvailabilityTickService.runNightlyTick(ctx)` DIRECTLY for the given `player_id`
//     (bypasses the real scheduler timer — the maintenance `run-phase-tick` precedent). When
//     `game_minute` is omitted, reads the player's CURRENT `city_sim_clock.game_minute` (via
//     `RecruitmentRepository.getCurrentGameMinute`). Response surfaces the per-step insert/expiry COUNTS
//     — the falsifiable "zero writes on an unchanged re-run" idempotency proof + the "passive-player
//     write-bound" proof (plan §C4 floor). Forcing the REGIME/AFFINITY conditions themselves is NOT a
//     route here — the spec REUSES the existing `/v1/_test/rival/set-regime` seam (never a parallel
//     regime writer, plan §C4 guardrail) and seeds/updates `rich_citizens` rows directly via SQL (the
//     `sparse_citizens.spec.ts` DB_STATE fixture precedent — a plain column write, no business-rule gate
//     to bypass, unlike the guarded rival regime machine).

import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';

import { Cadence } from '../../citysim/scheduler/city_sim_system';
import { recruitmentTunables } from './recruitment-tunables';
import { RecruitmentRepository } from './recruitment.repository';
import { SaltlineRecruitmentService } from './saltline-recruitment.service';
import { RecruitmentAvailabilityTickService } from './recruitment-availability-tick.service';
import type { RecruitmentCandidateRow } from '../../db/schema/recruitment';

@Controller()
export class RecruitmentTestController {
  constructor(
    private readonly repo: RecruitmentRepository,
    private readonly saltline: SaltlineRecruitmentService,
    private readonly availabilityTick: RecruitmentAvailabilityTickService,
  ) {}

  /** GET /v1/_test/recruitment/read-tunables — all 15 recruitmentTunables.* getter values. */
  @Get('_test/recruitment/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      saltlineQuestSteps: recruitmentTunables.saltlineQuestSteps,
      defectorQuestSteps: recruitmentTunables.defectorQuestSteps,
      civilianQuestSteps: recruitmentTunables.civilianQuestSteps,
      questSessionDurationInGameHours: recruitmentTunables.questSessionDurationInGameHours,
      saltlineCandidatesPerPool: recruitmentTunables.saltlineCandidatesPerPool,
      candidateExpiryGameDays: recruitmentTunables.candidateExpiryGameDays,
      civilianLoyaltyStartingBucket: recruitmentTunables.civilianLoyaltyStartingBucket,
      defectorDoubleAgentProbabilityBase: recruitmentTunables.defectorDoubleAgentProbabilityBase,
      defectorVettingDoubleAgentDetectionProbabilityPerSession: recruitmentTunables.defectorVettingDoubleAgentDetectionProbabilityPerSession,
      defectorVettingSessions: recruitmentTunables.defectorVettingSessions,
      defectorVettingCostCents: recruitmentTunables.defectorVettingCostCents,
      civilianAffinityThresholdForCandidacy: recruitmentTunables.civilianAffinityThresholdForCandidacy,
      civilianCourtingSessions: recruitmentTunables.civilianCourtingSessions,
      maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict: recruitmentTunables.maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict,
      saltlineHireCostCents: recruitmentTunables.saltlineHireCostCents,
    };
  }

  /**
   * `POST /v1/_test/recruitment/replenish-saltline` — C2 test seam (TEST-ONLY).
   *
   * Tops the player's Saltline `available` pool up to `saltlineCandidatesPerPool`. `game_day` defaults to
   * the player's CURRENT `city_sim_clock`-derived game-day (via the repository's real
   * `getCurrentGameDayAndMinute`) when omitted. Slot numbering continues from the player's existing
   * available-count (so a partially-filled pool tops up rather than re-generating from slot 0 — the
   * regeneration-determinism proof re-runs this with the SAME game_day and expects 0 new inserts once full).
   *
   * Body: `{ player_id: string; game_day?: number }`.
   * Response: `{ playerId, gameDay, before, inserted, candidates }`.
   */
  @Post('_test/recruitment/replenish-saltline')
  async replenishSaltline(
    @Body() body: { player_id?: string; game_day?: number },
  ): Promise<{
    playerId: string;
    gameDay: number;
    before: number;
    inserted: number;
    candidates: RecruitmentCandidateRow[];
  }> {
    if (!body?.player_id) {
      throw new HttpException('player_id required', HttpStatus.BAD_REQUEST);
    }
    let gameDay = body.game_day;
    if (gameDay === undefined) {
      const clock = await this.repo.getCurrentGameDayAndMinute(body.player_id);
      gameDay = clock.currentGameDay;
    }
    const before = await this.repo.countAvailableCandidates(body.player_id, 'saltline');
    const cap = recruitmentTunables.saltlineCandidatesPerPool;
    const toInsert = Math.max(0, cap - before);
    const rows = this.saltline.buildCandidateRows(body.player_id, gameDay, before, toInsert);
    const inserted = await this.repo.insertCandidates(rows);
    return { playerId: body.player_id, gameDay, before, inserted: inserted.length, candidates: inserted };
  }

  /**
   * `POST /v1/_test/recruitment/run-availability-tick` — C4 tick driver (TEST-ONLY).
   *
   * Calls `RecruitmentAvailabilityTickService.runNightlyTick(ctx)` DIRECTLY for `player_id` — the SAME
   * body the NIGHTLY/23 scheduler slot calls, just invoked on demand (the `maintenance/run-phase-tick`
   * precedent). `game_minute` defaults to the player's CURRENT `city_sim_clock.game_minute` when omitted.
   *
   * Body: `{ player_id: string; game_minute?: number }`.
   * Response: `{ ticked: true, gameMinute, saltlineInserted, defectorInserted, civilianInserted,
   * candidatesExpired }` — the counts are the falsifiable idempotency/passive-player proof (re-running
   * against an unchanged world returns all-zero counts).
   */
  @Post('_test/recruitment/run-availability-tick')
  async runAvailabilityTick(
    @Body() body: { player_id?: string; game_minute?: number },
  ): Promise<{
    ticked: true;
    gameMinute: number;
    saltlineInserted: number;
    defectorInserted: number;
    civilianInserted: number;
    candidatesExpired: number;
  }> {
    if (!body?.player_id) {
      throw new HttpException('player_id required', HttpStatus.BAD_REQUEST);
    }
    let gameMinute = body.game_minute;
    if (gameMinute === undefined) {
      gameMinute = await this.repo.getCurrentGameMinute(body.player_id);
    }
    const result = await this.availabilityTick.runNightlyTick({
      playerId: body.player_id,
      cadence: Cadence.NIGHTLY,
      gameMinute,
    });
    return { ticked: true, gameMinute, ...result };
  }
}

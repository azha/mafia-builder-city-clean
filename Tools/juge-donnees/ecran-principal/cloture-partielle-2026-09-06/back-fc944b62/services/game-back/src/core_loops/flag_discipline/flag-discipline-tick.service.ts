// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C4 (NIGHTLY tick — the 5
//             ordered steps + exhaustion fallback, D7/D9)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §1 D7/D9 + §6
//             (Ticks) + §14 Glossary (canon term `FlagDisciplineTickService`).
//             Decisions: §1.7 D7 (ONE tick, strictly ordered, day-keyed) + §1.9 D9 (spine REUSE) + §6
//             RULING #3 (TIMED_OUT token RETURNED).
//             Pattern (registration + test-seam symmetry): `maintenance-phase-tick.service.ts`
//             (`MaintenancePhaseTickService` — the SAME `OnApplicationBootstrap` + `registerSystem` +
//             "one public method both the scheduler AND the `_test` route call" shape, Lesson #3); the
//             `run-flag-tick(playerId, gameDay)` test-seam signature (gameDay, NOT gameMinute) mirrors
//             C3's OWN `run-generation(playerId, gameDay)` precedent — flag-discipline's internal state
//             is fundamentally game-day-keyed, unlike `EXCEPTION_QUEUE_TICK`'s real-clock-only `runTick
//             (playerId, gameMinute)`.
//             — P3-B C4 — 2026-07-11
//
// `FlagDisciplineTickService` — registers `FLAG_DISCIPLINE_TICK` at NIGHTLY/24 (confirmed free after
// EXCEPTION_QUEUE_TICK/22 — 23 deliberately skipped for the in-flight 04f-B reservation, C0/C4
// re-anchor). Orchestrates the 5 STRICTLY ORDERED D7 steps for one player:
//   (1) auto-confirm yesterday's pending routine items (`RoutineItemAutoConfirmService`).
//   (2) timeout PENDING flags past the real-hours review window (the C2 `resolveFlagTransition` arbiter
//       + `creditToken` — REUSED verbatim, never duplicated; the per-row loop below is NOT the "T3
//       per-row-await-loop" anti-pattern: `flagged_items_pending_unique_idx` bounds pending flags to ONE
//       per ROUTINE ITEM (⊥ C4-fold correction — NOT one per lieutenant; a lieutenant can hold MANY
//       simultaneous pending flags, `flag-discipline.repository.ts:345`'s own header carries the fuller
//       account), so the real bound on this candidate SET is token economics (max tokens per lieutenant ×
//       lieutenant count) thinned by THIS SAME tick's own timeout cadence — the candidate SET itself is
//       found via ONE set-based indexed SELECT, `listTimedOutPendingFlags`).
//   (3) regen tokens (+`flag_token_regen_per_day`, LEAST-clamped, in-row day guard, set-based across
//       every lieutenant this player owns in ONE statement — MUST run AFTER step 2 so a flag that just
//       timed out and returned its token does not get a SECOND regen credit this same tick, and BEFORE
//       step 4 so a lieutenant who regenned at dawn can flag again today, decisions §1.7).
//   (4) generate today's routine items (REUSE `RoutineItemGenerationService.runGeneration` — the SAME
//       method the C3 `run-generation` test seam drives, never a duplicated loop) + the D9 exhaustion
//       fallback for every candidate that surfaced (`FlagExhaustionFallbackService`).
//   (5) prune terminal routine rows past retention (never a row still referenced by a PENDING flag).
//
// `runTick(playerId, gameDay, gameMinute?)` is the ONE method BOTH the scheduler hook (which derives
// `gameDay` from `ctx.gameMinute` via the SAME `deriveGameDay` convention `MaintenancePhaseTickService`
// uses) AND the `run-flag-tick` `_test` route call — Lesson #3, zero live-vs-test divergence.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { flagDisciplineTunables } from './flag-discipline-tunables';
import { RoutineItemAutoConfirmService } from './routine-item-auto-confirm.service';
import { RoutineItemGenerationService, type RunGenerationResult } from './routine-item-generation.service';
import { FlagExhaustionFallbackService } from './flag-exhaustion-fallback.service';

/** The falsifiable proof surface (plan §C4): every step's own count, independently assertable — a
 *  same-day re-run must reproduce this SAME shape with every field at 0 (except `generation`'s own
 *  per-generator `candidateCount`, which reflects the LIVE substrate scan, not a persisted write — its
 *  `insertedCount`/`flaggedCount` are the write-facing fields that go to 0). */
export interface FlagDisciplineTickResult {
  readonly autoConfirmed: number;
  readonly timedOut: number;
  readonly regenApplied: number;
  readonly generation: RunGenerationResult;
  readonly exhaustionRaised: number;
  readonly exhaustionDeduped: number;
  readonly exhaustionCapRefused: number;
  readonly pruned: number;
}

@Injectable()
export class FlagDisciplineTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FlagDisciplineTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: FlagDisciplineRepository,
    private readonly bus: CityEventBus,
    private readonly autoConfirm: RoutineItemAutoConfirmService,
    private readonly generation: RoutineItemGenerationService,
    private readonly fallback: FlagExhaustionFallbackService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.FLAG_DISCIPLINE_TICK,
      cadence: Cadence.NIGHTLY,
      order: 24,
      run: async (ctx: CitySimTickContext) => {
        const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
        await this.runTick(ctx.playerId, gameDay, ctx.gameMinute);
      },
    });
    this.logger.log(
      'FlagDisciplineTickService registered FLAG_DISCIPLINE_TICK at NIGHTLY/24 — next free after ' +
        'EXCEPTION_QUEUE_TICK/22 (23 deliberately skipped, the 04f-B in-flight reservation, D3 collision ' +
        'wall). Each in-game night, per player, 5 strictly ordered steps (D7): (1) auto-confirm yesterday\'s ' +
        'pending routine items; (2) timeout PENDING flags past the real-hours review window (token ' +
        'RETURNED, ruling #3); (3) regen tokens (LEAST-clamped, in-row day guard); (4) generate today\'s ' +
        'routine items + flag decisions + the D9 exhaustion fallback; (5) prune terminal routine rows past ' +
        'retention. Organically a no-op for a player with no lieutenants/buildings. Idempotent per game-day ' +
        '(same-day re-run across all 5 steps → zero writes).',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/24 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 24} — the 5 ordered D7 steps for one player, day-keyed. `gameMinute` defaults to 0
   * (no scheduler ctx — the `run-flag-tick` `_test` route / `SessionClosedEvent` "gameMinute=0 for the
   * explicit path" convention, `city-event-bus.ts`); stamped onto `FlagVerdictEvent`(timed_out)/
   * `FlagTokenExhaustionEvent`/`flagItem`'s own `FlagRaisedEvent`. Returns the falsifiable per-step
   * counts (`FlagDisciplineTickResult`) — the SAME count-based idempotency-proof shape
   * `MaintenancePhaseTickService.runNightlyTick`/`ExceptionQueueTickService.runTick` both return.
   */
  async runTick(playerId: string, gameDay: number, gameMinute = 0): Promise<FlagDisciplineTickResult> {
    // (1) Auto-confirm yesterday's (or any EARLIER day's) still-pending routine items.
    const autoConfirmed = await this.autoConfirm.autoConfirmYesterday(playerId, gameDay);

    // (2) Timeout PENDING flags past the real-hours review window — REUSE the C2 arbiter + creditToken,
    // per-row over a STRUCTURALLY TINY candidate set (see file header — never the T3 anti-pattern).
    const windowHours = flagDisciplineTunables.flagBatchConfirmWindowRealHours;
    const cutoff = new Date(Date.now() - windowHours * 3_600_000);
    const timedOutCandidates = await this.repo.listTimedOutPendingFlags(playerId, cutoff);
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    let timedOut = 0;
    for (const candidate of timedOutCandidates) {
      // The SAME conditional-UPDATE arbiter validate/dismiss use — a flag that raced to a different
      // resolution between the SELECT above and this UPDATE (e.g. the player validated it in the
      // interim) matches ZERO rows here and is silently skipped (never double-resolved, never a stray
      // token credit — the D3 concurrency guarantee, generalized to the tick's own candidate set).
      const updated = await this.repo.resolveFlagTransition(candidate.flag_id, 'timed_out', true, gameMinute);
      if (!updated) continue;
      await this.repo.creditToken(candidate.lieutenant_id, 1, maxTokens);
      timedOut++;
      this.bus.emitFlagVerdict({
        type: 'flag_verdict',
        playerId,
        lieutenantId: candidate.lieutenant_id,
        flagId: candidate.flag_id,
        verdict: 'timed_out',
        gameMinute,
      });
    }

    // (3) Regen — set-based across every lieutenant_flag_state row this player owns, AFTER step 2 (a
    // just-timed-out flag's token return is NOT a second regen credit) and BEFORE step 4 (decisions §1.7).
    const regenAmount = flagDisciplineTunables.flagTokenRegenPerDay;
    const regenApplied = await this.repo.regenAllForPlayer(playerId, regenAmount, maxTokens, gameDay);

    // (4) Generate today + flag decisions (REUSE runGeneration — never duplicated) + the D9 exhaustion
    // fallback for every candidate the generation pass surfaced.
    const generation = await this.generation.runGeneration(playerId, gameDay, gameMinute);
    let exhaustionRaised = 0;
    let exhaustionDeduped = 0;
    let exhaustionCapRefused = 0;
    for (const generatorResult of Object.values(generation)) {
      for (const candidate of generatorResult.exhaustionCandidates) {
        const outcome = await this.fallback.raiseIfClear(playerId, candidate, gameMinute);
        if (outcome === 'raised') exhaustionRaised++;
        else if (outcome === 'deduped') exhaustionDeduped++;
        else exhaustionCapRefused++;
      }
    }

    // (5) Prune terminal routine rows past retention (never a row referenced by a PENDING flag).
    const retentionDays = flagDisciplineTunables.flagRoutineItemsRetentionDays;
    const pruned = await this.repo.pruneTerminalRoutineItems(playerId, gameDay, retentionDays);

    this.logger.log(
      `FLAG_DISCIPLINE_TICK: player=${playerId} day=${gameDay} -> ${autoConfirmed} auto-confirmed, ` +
        `${timedOut} timed out (token returned), ${regenApplied} lieutenant(s) regenned, ` +
        `${exhaustionRaised} exhaustion card(s) raised / ${exhaustionDeduped} deduped / ` +
        `${exhaustionCapRefused} cap-refused (D9), ${pruned} routine item(s) pruned.`,
    );

    return { autoConfirmed, timedOut, regenApplied, generation, exhaustionRaised, exhaustionDeduped, exhaustionCapRefused, pruned };
  }
}

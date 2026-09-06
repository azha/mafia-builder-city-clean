// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C5 ("`CitySystemId.FLAG_
//             WEEKLY_RESET_TICK` + SCHEDULE WEEKLY/13 (re-verify free first, verbatim...) + registration.
//             ONE-statement epoch-guarded reset-to-max (the D8 shape...) + `FlagWeeklyResetEvent`")
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §1 D8 + §6 (Ticks)
//             + §14 Glossary (canon term `FlagWeeklyResetTick`).
//             Decisions: §1.8 D8 (WEEKLY cadence, day_of_week key REFUSED) + §6 RULING sub-decision #5
//             (WEEKLY cadence + `day_of_week` invariant row RATIFIED).
//             Pattern (registration + test-seam symmetry): `flag-discipline-tick.service.ts` (`FlagDiscipline
//             TickService` — the SAME `OnApplicationBootstrap` + `registerSystem` + "one public method
//             both the scheduler AND the `_test` route call" shape, Lesson #3); epoch derivation mirrors
//             `ia-decay.service.ts`'s own `IA_DECAY_TICK` `weekId = Math.floor(gameMinute / WEEKLY_MINUTES)`
//             precedent (decisions §1.8 cites it directly) — keyed off THIS lot's own `game_day` concept
//             (every other C1-C4 row in this lot is already game-day-keyed) rather than a parallel
//             gameMinute/weekMinutes constant.
//             — P3-B C5 — 2026-07-11
//
// `FlagWeeklyResetTickService` — registers `FLAG_WEEKLY_RESET_TICK` at WEEKLY/13 (confirmed free after
// EQUIPMENT_FAILURE_WEEKLY_TICK/11 — 12 deliberately skipped for the in-flight 04f-B reservation, C0/C4/C5
// re-anchor). D8's ONE-statement epoch-guarded reset-to-max: every `lieutenant_flag_state` row the
// player owns whose `last_weekly_reset_epoch` is behind the CURRENT week epoch is reset to the max token
// getter, "regardless of recent burns" (canon-verbatim) — the guard and the claim are the SAME UPDATE
// statement (D3, un-raceable). `week_epoch = Math.floor(game_day / 7)`: the scheduler's WEEKLY cadence
// already fires every 7 game-days (`city_sim_scheduler.service.ts`'s own `cadenceWidth(Cadence.WEEKLY)
// === inGameDayLengthMinutes * 7`), so this epoch advances exactly once per WEEKLY firing — the SAME
// "epoch increments cleanly at each cadence boundary" property `IA_DECAY_TICK`'s weekId relies on.
// `flag_weekly_reset_day_of_week` (canon key, default `monday`) is DELIBERATELY NOT consulted here —
// degenerate under the WEEKLY cadence (gdd/14 design-invariant row instead, ruling sub-decision #5).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { flagDisciplineTunables } from './flag-discipline-tunables';

/**
 * `deriveWeekEpoch(gameDay)` — the week-epoch a `game_day` value falls in (integer division; the WEEKLY
 * cadence only ever fires on an exact multiple of `inGameDayLengthMinutes * 7`, i.e. an exact multiple of
 * 7 game-days, so this is exact at every firing — never a lossy floor over a partial week in production,
 * the SAME `deriveGameDay` exactness argument this file's header cites). Exported so
 * `flag_weekly_convergence.spec.ts` can independently precompute the expected epoch for a given `gameDay`
 * without duplicating the arithmetic (D13 — no re-derivation drift between production and spec).
 */
export function deriveWeekEpoch(gameDay: number): number {
  return Math.floor(gameDay / 7);
}

/** The falsifiable proof surface (plan §C5): the exact count of `lieutenant_flag_state` rows the
 *  epoch-guarded reset touched — a same-epoch re-run must reproduce this SAME shape at 0. */
export interface FlagWeeklyResetTickResult {
  readonly resetCount: number;
}

@Injectable()
export class FlagWeeklyResetTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FlagWeeklyResetTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: FlagDisciplineRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.FLAG_WEEKLY_RESET_TICK,
      cadence: Cadence.WEEKLY,
      order: 13,
      run: async (ctx: CitySimTickContext) => {
        const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
        await this.runTick(ctx.playerId, gameDay, ctx.gameMinute);
      },
    });
    this.logger.log(
      'FlagWeeklyResetTickService registered FLAG_WEEKLY_RESET_TICK at WEEKLY/13 — next free after ' +
        'EQUIPMENT_FAILURE_WEEKLY_TICK/11 (12 deliberately skipped, the 04f-B in-flight reservation, D3 ' +
        'collision wall). Each in-game week, per player: ONE epoch-guarded conditional UPDATE resets ' +
        'EVERY lieutenant_flag_state row this player owns to the max token getter (D8 — "reset to max ' +
        'regardless of recent burns", canon-verbatim); idempotent per epoch (same-epoch re-run -> zero ' +
        'writes). `flag_weekly_reset_day_of_week` stays a gdd/14 design-invariant row, never a store key ' +
        '(ruling sub-decision #5).',
    );
  }

  // ───────────────────────────── the registered WEEKLY/13 tick ─────────────────────────────

  /**
   * {WEEKLY, order 13} — D8's ONE-statement epoch-guarded reset for one player, week-epoch-keyed.
   * `gameMinute` defaults to 0 (no scheduler ctx — the `run-weekly-reset` `_test` route / the
   * `SessionOpenedEvent` "gameMinute=0 for the explicit path" convention); stamped onto every
   * `FlagWeeklyResetEvent` this call emits (one per `lieutenant_flag_state` row actually touched — mirrors
   * `FlagVerdictEvent`'s own per-entity emission granularity, never one aggregate event for the batch).
   */
  async runTick(playerId: string, gameDay: number, gameMinute = 0): Promise<FlagWeeklyResetTickResult> {
    const epoch = deriveWeekEpoch(gameDay);
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    const touched = await this.repo.resetTokensToMaxForEpoch(playerId, epoch, maxTokens);

    for (const row of touched) {
      this.bus.emitFlagWeeklyReset({
        type: 'flag_weekly_reset',
        playerId,
        lieutenantId: row.lieutenant_id,
        epoch,
        gameMinute,
      });
    }

    this.logger.log(
      `FLAG_WEEKLY_RESET_TICK: player=${playerId} day=${gameDay} epoch=${epoch} -> ${touched.length} ` +
        'lieutenant(s) reset to max.',
    );

    return { resetCount: touched.length };
  }
}

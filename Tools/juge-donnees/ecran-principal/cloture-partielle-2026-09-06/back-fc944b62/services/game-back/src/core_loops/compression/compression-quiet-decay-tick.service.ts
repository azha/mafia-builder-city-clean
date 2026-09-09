// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6
//             (`COMPRESSION_QUIET_DECAY_TICK` at WEEKLY/14 provisoire — quiet decay -5 IFF signals ≡ 0,
//             0-write idempotent)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.3.
//             Pattern: `FlagWeeklyResetTickService` (WEEKLY registration + `deriveWeekEpoch` REUSE,
//             `OnApplicationBootstrap` + `registerSystem` + "one public method both the scheduler AND the
//             `_test` route call" shape, Lesson #3).
//             — P3-E C6 — 2026-07-17
//
// `CompressionQuietDecayTickService` — registers `COMPRESSION_QUIET_DECAY_TICK` at WEEKLY/14 (confirmed
// free after `FLAG_WEEKLY_RESET_TICK`/13, C0/C6 re-anchor). `runTick(playerId, gameDay, gameMinute)`:
//   1. `CompressionStressReaderService.readStress` — the SAME 7-source read the session-close subscriber
//      uses (zero 2nd copy of the §8.2 formula).
//   2. NOT quiet (≥1 live signal above its own noise floor) -> 0-write, return immediately (design §8.3:
//      "0-write si signaux non-nuls" — this tick never even touches `compression_decay_state`).
//   3. Quiet -> `CompressionWeekRepository.applyQuietDecay` (the epoch-guarded decay, idempotent per
//      `deriveWeekEpoch(gameDay)` — a 2nd call at the SAME epoch is ALSO a 0-write, the repository's own
//      guard).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { deriveWeekEpoch } from '../flag_discipline/flag-weekly-reset-tick.service';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CompressionStressReaderService } from './compression-stress-reader.service';
import { CompressionWeekRepository } from './compression-week.repository';

/** The falsifiable proof surface `runTick` returns (plan §C6 floor). */
export interface CompressionQuietDecayTickResult {
  readonly quiet: boolean;
  readonly applied: boolean;
  readonly orgStressAfter: number | null;
}

@Injectable()
export class CompressionQuietDecayTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompressionQuietDecayTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly reader: CompressionStressReaderService,
    private readonly repo: CompressionWeekRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.COMPRESSION_QUIET_DECAY_TICK,
      cadence: Cadence.WEEKLY,
      order: 14,
      run: async (ctx: CitySimTickContext) => {
        const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
        await this.runTick(ctx.playerId, gameDay, ctx.gameMinute);
      },
    });
    this.logger.log(
      'CompressionQuietDecayTickService registered COMPRESSION_QUIET_DECAY_TICK at WEEKLY/14 — next free ' +
        'after FLAG_WEEKLY_RESET_TICK/13. Each in-game week, per player: decay org_stress by ' +
        'compression_stress_decay_per_quiet_week IFF every §8.2 live signal is 0 this window (★#6 floor via ' +
        'compression_stress_floor_with_critical_residue while a critical persisted problem-entry exists); ' +
        'idempotent per week-epoch (same-epoch re-run -> zero writes); a player with ANY live signal -> ' +
        'zero writes regardless of epoch.',
    );
  }

  // ───────────────────────────── the registered WEEKLY/14 tick ─────────────────────────────

  /** {WEEKLY, order 14} — the design §8.3 quiet-decay for one player, week-epoch-keyed. Public so
   *  `CompressionTestController` can drive it directly for E2E (Lesson #3). `gameMinute` defaults to 0
   *  (no scheduler ctx — the `_test` route path, `FlagWeeklyResetTickService.runTick`'s own convention). */
  async runTick(playerId: string, gameDay: number, gameMinute = 0): Promise<CompressionQuietDecayTickResult> {
    const { quiet } = await this.reader.readStress(playerId);
    if (!quiet) {
      this.logger.log(`COMPRESSION_QUIET_DECAY_TICK: player=${playerId} day=${gameDay} -> NOT quiet, 0-write.`);
      return { quiet: false, applied: false, orgStressAfter: null };
    }

    const epoch = deriveWeekEpoch(gameDay);
    const result = await this.repo.applyQuietDecay(
      playerId,
      epoch,
      coreLoopsTunables.compressionStressDecayPerQuietWeek,
      coreLoopsTunables.compressionStressFloorWithCriticalResidue,
    );

    this.logger.log(
      `COMPRESSION_QUIET_DECAY_TICK: player=${playerId} day=${gameDay} epoch=${epoch} gameMinute=${gameMinute} ` +
        `-> quiet=true applied=${result.applied} orgStressAfter=${result.orgStressAfter ?? 'unchanged'}.`,
    );

    return { quiet: true, applied: result.applied, orgStressAfter: result.orgStressAfter };
  }
}

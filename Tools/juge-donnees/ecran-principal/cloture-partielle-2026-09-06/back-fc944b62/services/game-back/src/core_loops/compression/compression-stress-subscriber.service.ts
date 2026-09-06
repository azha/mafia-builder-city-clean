// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6
//             (`CompressionStressSubscriber` — R5/D5: `SessionClosedEvent` EXISTS, emitted by BOTH close
//             AND stale-close — subscribe ONLY, ZERO new emit)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.1 (the
//             update runs at session-CLOSE, exactly-once via I5 — "le close P3-A est déjà atomique
//             RETURNING") + §9.2 (`'none' -> 'warning'` -> `CompressionWeekTriggeredEvent`).
//             Decisions: D5 (session-close subscriber, isolated) ; D6 (gel pendant 'active') ; I5
//             (invariant table row — gated upstream, this subscriber adds NO additional locking).
//             Pattern: `AnnealingInitiationSubscriberService` (`onApplicationBootstrap` subscribe +
//             `.handle(e).catch(err => logger.error(...))`-contained async shape — belt-and-suspenders ON
//             TOP of the bus's own per-listener try/catch isolation) + `DecommissionService` (post-commit
//             event emission AFTER the repository's own transaction has already committed).
//             — P3-E C6 — 2026-07-17
//
// `CompressionStressSubscriber` — subscribes to `SessionClosedEvent` (fired by BOTH `SessionService.close`
// (explicit HTTP close) AND `closeStaleAndEmit` (`SESSION_SWEEP` HOURLY/5) — a session abandoned mid-play
// still leaves its org's state to be scored, design §8.1's own "close et stale-close comptent tous deux").
// I5 exactly-once: `SessionService.close`/`closeStaleAndEmit` only ever call `bus.emitSessionClosed` after
// THEIR OWN guarded `UPDATE ... WHERE ended_at IS NULL ... RETURNING` actually closed a row (`session.
// repository.ts#closeActiveForPlayer`/`closeStaleForPlayer`) — a 2nd concurrent close attempt on an
// ALREADY-closed session matches 0 rows there and never reaches this subscriber at all. This subscriber
// adds NO additional row-locking of its own; it relies ENTIRELY on that upstream guarantee (the plan's own
// I5 language: "gaté par la transition de close elle-même").

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type SessionClosedEvent } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CompressionStressReaderService } from './compression-stress-reader.service';
import { CompressionWeekRepository } from './compression-week.repository';
import { CompressionBoardService } from './compression-board.service';

@Injectable()
export class CompressionStressSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompressionStressSubscriber.name);

  constructor(
    private readonly reader: CompressionStressReaderService,
    private readonly repo: CompressionWeekRepository,
    private readonly bus: CityEventBus,
    // ★ P3-E C7 fold (design §9.2c, additive — the C6 §8.1 FORMULA above is UNTOUCHED, this is a NEW
    // orchestration step AFTER it): `checkFireAtMaxSeverity` — if THIS call's own increment just pushed
    // `org_stress` to the max-severity threshold WHILE still 'warning', fire the board with severity
    // (SAME-module dependency, `CompressionBoardService`, zero cycle).
    private readonly board: CompressionBoardService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onSessionClosed((event: SessionClosedEvent) => {
      this.handleSessionClosed(event).catch((err) =>
        this.logger.error(`session_closed compression-stress handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  /**
   * `updateStressAccumulator(playerId)` (canon `CompressionWeekService` method name, design §2 transposed
   * to a subscriber, decisions §3) — read the 7 §8.2 sources, compute the §8.1 increment, apply it
   * (D6-gated, I1-gated for the trigger). Public so the E2E floor can call it directly on a KNOWN
   * `playerId` too (Lesson #3 shape) IN ADDITION to the real `SessionClosedEvent` path — both call this
   * SAME method, zero live-vs-test divergence.
   */
  async updateStressAccumulator(playerId: string, gameMinute: number): Promise<void> {
    const { weightedSum } = await this.reader.readStress(playerId);
    const increment = this.reader.computeIncrement(weightedSum);

    const result = await this.repo.applyStressIncrement(
      playerId,
      increment,
      gameMinute,
      coreLoopsTunables.compressionStressThresholdTrigger,
      coreLoopsTunables.compressionMaxDecisionBudget,
    );

    if (!result.applied) {
      this.logger.log(`COMPRESSION_STRESS: player=${playerId} update SKIPPED (frozen 'active' or no progression row).`);
      return;
    }

    this.logger.log(
      `COMPRESSION_STRESS: player=${playerId} increment=${increment} -> org_stress=${result.orgStressAfter}` +
        (result.triggered ? ` -> TRIGGERED compression_events=${result.triggered.compressionEventId}` : ''),
    );

    if (result.triggered) {
      // POST-COMMIT emission (the repository's OWN transaction already committed) — mirrors
      // `DecommissionService`'s own "the tx commits BEFORE the bus event fires" ordering.
      this.bus.emitCompressionWeekTriggered({
        type: 'compression_week_triggered',
        playerId,
        compressionEventId: result.triggered.compressionEventId,
        stressAtFire: result.triggered.stressAtFire,
        gameMinute,
      });
    }

    // ★ P3-E C7 fold (design §9.2c) — a SEPARATE guarded check (its OWN transaction, `compression-board.
    // repository.ts#fireAtMaxSeverity`): did THIS SAME increment push `org_stress` to the max-severity
    // threshold while the cycle was still 'warning' (whether it JUST flipped none->warning above, or was
    // ALREADY 'warning' from an earlier session)? A no-op (`null`) in the overwhelming common case.
    await this.board.checkFireAtMaxSeverity(playerId, gameMinute);
  }

  private async handleSessionClosed(event: SessionClosedEvent): Promise<void> {
    await this.updateStressAccumulator(event.playerId, event.gameMinute);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

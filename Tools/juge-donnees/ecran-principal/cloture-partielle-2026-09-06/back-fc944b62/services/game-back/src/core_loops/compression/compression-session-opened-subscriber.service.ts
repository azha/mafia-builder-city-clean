// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (engage FORCÉ au
//             session-open ≥95)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §9.2(b) —
//             "FORCÉ : au session-open, si stress ≥ 95 → engagement automatique (la séquence session-open
//             P3-A porte déjà l'agrégation — la clé compression_glance §15 signale forced: true)".
//             Pattern: `CompressionStressSubscriber` (`SessionOpenedEvent`'s OWN sibling
//             `SessionClosedEvent` subscription shape, REPLICATED here) — `SessionOpenedEvent`'s own
//             header ALREADY anticipates this: "Consumers: NONE this lot (the additive seam P3-B/E/H/
//             telemetry subscribe to later, design DD-P3)" (city-event-bus.ts:1511) — ZERO touch to
//             `session.service.ts`/`SessionOpenedEvent`'s own emit, a pure NEW subscriber.
//             — P3-E C7 — 2026-07-18
//
// `CompressionSessionOpenedSubscriber` — subscribes to `SessionOpenedEvent` (fired by
// `SessionService.open`'s OWN fresh-open path — `session.service.ts:125`, UNTOUCHED by this lot) and
// calls `CompressionBoardService.checkForcedEngage`. ★ Timing note (honest, documented — NOT floor-
// blocking): the bus dispatch is synchronous, but each listener's OWN body is `async` — the forced-engage
// DB write therefore completes AFTER, not necessarily BEFORE, `SessionService.open`'s own HTTP response
// (built by `SessionOpenSequenceService.build`, called immediately following the emit, C8's future
// `compression_glance` key). This is the IDENTICAL eventual-consistency shape `CompressionStressSubscriber`
// already accepts for `SessionClosedEvent` (that file's own header: "adds NO additional row-locking of
// its own"). The E2E floor proves the MUTATION itself via the direct-invocation test seam (Lesson #3,
// `CompressionTestController#runSessionOpenedCheck`), sidestepping the real-bus-timing question entirely
// — exactly `CompressionStressSubscriber`'s own established testing precedent.
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type SessionOpenedEvent } from '../../citysim/events/city-event-bus';
import { CompressionBoardService } from './compression-board.service';

@Injectable()
export class CompressionSessionOpenedSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompressionSessionOpenedSubscriber.name);

  constructor(
    private readonly board: CompressionBoardService,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onSessionOpened((event: SessionOpenedEvent) => {
      this.handleSessionOpened(event).catch((err) => this.logger.error(`session_opened forced-engage check failed (contained): ${errMsg(err)}`));
    });
  }

  /** Public so `CompressionTestController` can drive it directly for E2E (Lesson #3) IN ADDITION to the
   *  real `SessionOpenedEvent` path — both call this SAME method, zero live-vs-test divergence. */
  async checkForcedEngage(playerId: string, gameMinute: number): Promise<void> {
    const result = await this.board.checkForcedEngage(playerId, gameMinute);
    if (result) {
      this.logger.log(`COMPRESSION_FORCED_ENGAGE: player=${playerId} -> compression_events=${result.compressionEventId}.`);
    }
  }

  private async handleSessionOpened(event: SessionOpenedEvent): Promise<void> {
    await this.checkForcedEngage(event.playerId, event.gameMinute);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

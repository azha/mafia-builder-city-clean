// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (the floor's
//             direct-invocation seams — `updateStressAccumulator` + `COMPRESSION_QUIET_DECAY_TICK`)
//             Pattern: `DemolitionTestController` (`run-friction-budget-tick` direct-invocation of the
//             REAL, unmodified production method — Lesson #3 — + the in-memory bus-event capture-probe
//             convention, `_capturedApplied`/`_capturedDecommissioned`).
//             — P3-E C6 — 2026-07-17
//
// `CompressionTestController` — 2 direct-invocation seams (the REAL, unmodified production methods — the
// SAME `CompressionStressSubscriber.updateStressAccumulator`/`CompressionQuietDecayTickService.runTick`
// the bus/scheduler call) + an in-memory `CompressionWeekTriggeredEvent` capture-probe (this bus event has
// no other observable surface — the floor's own "event fires exactly once" AC needs it, mirrors
// `DemolitionTestController`'s identical rationale for its own captured-events routes).
//
// Everything else the C6 floor needs (seed `flagged_items`/`supply_node_pressure`/`route`/
// `supply_chain_legs`/`cue_stacks`/`exception_queue`/`annealing_state`/`friction_budget_state` fixture
// rows, read `player_progression_state`/`compression_events`/`compression_decay_state` columns) is a
// plain table the E2E spec reads/writes directly via `psql` — mirrors `demolition_decommission.spec.ts`'s
// own dominant convention (raw SQL fixture setup + raw SQL assertions).
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()`).

import { Body, Controller, Get, HttpCode, OnModuleInit, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { CityEventBus, type CompressionWeekTriggeredEvent, type CompressionWeekFinalizedEvent } from '../../citysim/events/city-event-bus';
import { CompressionStressSubscriber } from './compression-stress-subscriber.service';
import { CompressionQuietDecayTickService, type CompressionQuietDecayTickResult } from './compression-quiet-decay-tick.service';
import { CompressionSessionOpenedSubscriber } from './compression-session-opened-subscriber.service';

interface RunStressUpdateBody {
  playerId: string;
  gameMinute: number;
}

interface RunQuietDecayTickBody {
  playerId: string;
  gameDay: number;
  gameMinute?: number;
}

interface RunSessionOpenedCheckBody {
  playerId: string;
  gameMinute?: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CompressionTestController implements OnModuleInit {
  private readonly _capturedTriggered: CompressionWeekTriggeredEvent[] = [];
  // P3-E C7 — the SAME in-memory capture-probe convention, this lot's OWN new bus event.
  private readonly _capturedFinalized: CompressionWeekFinalizedEvent[] = [];

  constructor(
    private readonly subscriber: CompressionStressSubscriber,
    private readonly quietDecayTick: CompressionQuietDecayTickService,
    private readonly bus: CityEventBus,
    // P3-E C7 — the FORCED-engage-at-session-open direct-invocation seam (Lesson #3 — sidesteps the real
    // `SessionOpenedEvent` bus-timing question entirely, see that subscriber's own header).
    private readonly sessionOpenedSubscriber: CompressionSessionOpenedSubscriber,
  ) {}

  onModuleInit(): void {
    this.bus.onCompressionWeekTriggered((event) => this._capturedTriggered.push(event));
    this.bus.onCompressionWeekFinalized((event) => this._capturedFinalized.push(event));
  }

  /**
   * `POST /v1/_test/compression/run-stress-update` — TEST-ONLY direct invocation of
   * `CompressionStressSubscriber.updateStressAccumulator` (the REAL, unmodified method the real
   * `SessionClosedEvent` subscriber calls — Lesson #3). Lets the floor drive the §8.1 update with an
   * EXPLICIT `gameMinute` (the real session-close path always fires `gameMinute=0` for an explicit
   * player-triggered close — this seam is what proves `opened_at_tick`/event `gameMinute` propagation
   * exactly, without needing a stale-sweep to get a non-zero value).
   */
  @Post('_test/compression/run-stress-update')
  @HttpCode(200)
  async runStressUpdate(@Body() body: RunStressUpdateBody): Promise<{ ran: true }> {
    await this.subscriber.updateStressAccumulator(body.playerId, Number(body.gameMinute));
    return { ran: true };
  }

  /**
   * `POST /v1/_test/compression/run-quiet-decay-tick` — TEST-ONLY direct invocation of
   * `CompressionQuietDecayTickService.runTick` (the REAL, unmodified WEEKLY/14 tick — Lesson #3).
   */
  @Post('_test/compression/run-quiet-decay-tick')
  @HttpCode(200)
  async runQuietDecayTick(@Body() body: RunQuietDecayTickBody): Promise<CompressionQuietDecayTickResult> {
    return this.quietDecayTick.runTick(body.playerId, Number(body.gameDay), body.gameMinute !== undefined ? Number(body.gameMinute) : 0);
  }

  /**
   * `GET /v1/_test/compression/triggered-events?playerId=` — in-memory capture of every
   * `CompressionWeekTriggeredEvent` observed so far, optionally filtered by `playerId`. Used by the floor
   * to prove "exactly ONE event per genuine `none -> warning` transition".
   */
  @Get('_test/compression/triggered-events')
  getTriggeredEvents(@Query('playerId') playerId?: string): { triggered: CompressionWeekTriggeredEvent[] } {
    const triggered = playerId ? this._capturedTriggered.filter((e) => e.playerId === playerId) : [...this._capturedTriggered];
    return { triggered };
  }

  /**
   * `POST /v1/_test/compression/run-session-opened-check` — TEST-ONLY direct invocation of
   * `CompressionSessionOpenedSubscriber.checkForcedEngage` (the REAL, unmodified production method the
   * real `SessionOpenedEvent` subscriber calls — Lesson #3, sidesteps the real-bus-timing question that
   * class's own header documents).
   */
  @Post('_test/compression/run-session-opened-check')
  @HttpCode(200)
  async runSessionOpenedCheck(@Body() body: RunSessionOpenedCheckBody): Promise<{ ran: true }> {
    await this.sessionOpenedSubscriber.checkForcedEngage(body.playerId, body.gameMinute !== undefined ? Number(body.gameMinute) : 0);
    return { ran: true };
  }

  /**
   * `GET /v1/_test/compression/finalized-events?playerId=` — P3-E C7, the SAME in-memory capture-probe
   * convention as `triggered-events` above, for `CompressionWeekFinalizedEvent` (I8 — proves "exactly ONE
   * event per genuine finalize", incl. the 2-concurrent-finalizes NO-double-event proof).
   */
  @Get('_test/compression/finalized-events')
  getFinalizedEvents(@Query('playerId') playerId?: string): { finalized: CompressionWeekFinalizedEvent[] } {
    const finalized = playerId ? this._capturedFinalized.filter((e) => e.playerId === playerId) : [...this._capturedFinalized];
    return { finalized };
  }
}

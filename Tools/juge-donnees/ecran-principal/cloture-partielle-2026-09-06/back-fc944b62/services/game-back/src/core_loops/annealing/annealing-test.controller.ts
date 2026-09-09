// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 (the falsifiable floor —
//             direct-call concurrency seams + the state-not-timer backdate seam + in-memory event capture).
//             Pattern: `core_loops/cue_stack/cue-stack-test.controller.ts` (in-memory bus-event capture +
//             "a direct route calling the SAME method the real subscriber calls" — Lesson #3) +
//             `operational/legal/legal-test.controller.ts#forceExpireCase` (the "directly set a column to
//             make it eligible" TEST-ONLY escape hatch idiom, for the state-not-timer backdate seam).
//             — P3-D C6 — 2026-07-14
//
// `AnnealingTestController` — TEST-ONLY (gated `testControllersEnabled()`, never mounted in production):
//   - In-memory capture of `SettlingInitiatedEvent`/`CompoundingStrainEvent`/`SettlingCompletedEvent` (the
//     falsifiable "does it actually fire, exactly once" proof — the `CueStackTestController.onModuleInit`
//     convention, copied verbatim).
//   - `POST _test/annealing/initiate-or-compound` — calls `AnnealingService.initiateOrCompound` DIRECTLY,
//     the SAME method every real subscriber calls (Lesson #3). Exists so genuinely CONCURRENT calls
//     (`Promise.all`) can be driven deterministically for the I5 concurrency proof (the SAME reasoning
//     `CueStackTestController.disruptBuilding`'s own header already documents for I8).
//   - `POST _test/annealing/run-sweep` — calls `AnnealingSettleSweepService.runSweep` DIRECTLY, for the
//     SAME reason (the I6 "2 concurrent sweeps → one event per row" concurrency proof).
//   - `POST _test/annealing/backdate-ends-at` — the state-not-timer seam (design §9.4: "le test AVANCE
//     l'horloge de la row"). A REAL write, but a test-only escape hatch (no legitimate player/BO verb ever
//     backdates a timestamp).
//   - `GET _test/annealing/state` / `_test/annealing/state-list` — plain reads for assertion.

import { Body, Controller, Get, HttpCode, HttpStatus, OnModuleInit, Post, Query } from '@nestjs/common';

import {
  CityEventBus,
  type CompoundingStrainEvent,
  type SettlingCompletedEvent,
  type SettlingInitiatedEvent,
} from '../../citysim/events/city-event-bus';
import { AnnealingService, type AnnealingInitiateOrCompoundResult } from './annealing.service';
import { AnnealingSettleSweepService, type AnnealingSweepResult } from './annealing-settle-sweep.service';
import { AnnealingRepository } from './annealing.repository';
import type { LiveChangeType } from './initiating-change.catalogue';
import type { AnnealingStateRow } from '../../db/schema/cue_annealing';

interface CapturedSettlingInitiatedEvent {
  playerId: string;
  buildingId: string;
  changeType: string;
  ref: string;
  band: string;
  gameMinute: number;
}

interface CapturedCompoundingStrainEvent {
  playerId: string;
  buildingId: string;
  changeType: string;
  ref: string;
  band: string;
  gameMinute: number;
}

interface CapturedSettlingCompletedEvent {
  playerId: string;
  buildingId: string;
  gameMinute: number;
}

@Controller()
export class AnnealingTestController implements OnModuleInit {
  private readonly _capturedInitiated: CapturedSettlingInitiatedEvent[] = [];
  private readonly _capturedCompounding: CapturedCompoundingStrainEvent[] = [];
  private readonly _capturedCompleted: CapturedSettlingCompletedEvent[] = [];

  constructor(
    private readonly bus: CityEventBus,
    private readonly annealing: AnnealingService,
    private readonly sweep: AnnealingSettleSweepService,
    private readonly repo: AnnealingRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onSettlingInitiated((event: SettlingInitiatedEvent) => {
      this._capturedInitiated.push({
        playerId: event.playerId,
        buildingId: event.buildingId,
        changeType: event.changeType,
        ref: event.ref,
        band: event.band,
        gameMinute: event.gameMinute,
      });
    });
    this.bus.onCompoundingStrain((event: CompoundingStrainEvent) => {
      this._capturedCompounding.push({
        playerId: event.playerId,
        buildingId: event.buildingId,
        changeType: event.changeType,
        ref: event.ref,
        band: event.band,
        gameMinute: event.gameMinute,
      });
    });
    this.bus.onSettlingCompleted((event: SettlingCompletedEvent) => {
      this._capturedCompleted.push({
        playerId: event.playerId,
        buildingId: event.buildingId,
        gameMinute: event.gameMinute,
      });
    });
  }

  /** GET /v1/_test/annealing/settling-initiated-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/annealing/settling-initiated-events')
  getSettlingInitiatedEvents(
    @Query('playerId') playerId?: string,
  ): { count: number; events: CapturedSettlingInitiatedEvent[] } {
    const events = playerId ? this._capturedInitiated.filter((e) => e.playerId === playerId) : [...this._capturedInitiated];
    return { count: events.length, events };
  }

  /** GET /v1/_test/annealing/compounding-strain-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/annealing/compounding-strain-events')
  getCompoundingStrainEvents(
    @Query('playerId') playerId?: string,
  ): { count: number; events: CapturedCompoundingStrainEvent[] } {
    const events = playerId ? this._capturedCompounding.filter((e) => e.playerId === playerId) : [...this._capturedCompounding];
    return { count: events.length, events };
  }

  /** GET /v1/_test/annealing/settling-completed-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/annealing/settling-completed-events')
  getSettlingCompletedEvents(
    @Query('playerId') playerId?: string,
  ): { count: number; events: CapturedSettlingCompletedEvent[] } {
    const events = playerId ? this._capturedCompleted.filter((e) => e.playerId === playerId) : [...this._capturedCompleted];
    return { count: events.length, events };
  }

  /**
   * POST /v1/_test/annealing/initiate-or-compound
   *
   * Body { playerId, buildingId, changeType, ref, gameMinute }. Calls `AnnealingService.
   * initiateOrCompound` DIRECTLY — the SAME method every real subscriber calls (Lesson #3). The direct-call
   * route needed for TRUE concurrency (`Promise.all`) — the I5 concurrency falsifiable proof.
   */
  @Post('_test/annealing/initiate-or-compound')
  @HttpCode(HttpStatus.OK)
  async initiateOrCompound(
    @Body()
    body: { playerId: string; buildingId: string; changeType: LiveChangeType; ref: string; gameMinute?: number },
  ): Promise<AnnealingInitiateOrCompoundResult> {
    return this.annealing.initiateOrCompound(body.playerId, body.buildingId, body.changeType, body.ref, body.gameMinute ?? 0);
  }

  /**
   * POST /v1/_test/annealing/run-sweep
   *
   * Calls `AnnealingSettleSweepService.runSweep` DIRECTLY — the SAME method the ANNEALING_SETTLE_SWEEP
   * MINUTE/30 scheduler slot calls. The direct-call route needed for TRUE concurrency (`Promise.all`) — the
   * I6 concurrency falsifiable proof ("2 concurrent sweeps → ONE event per row").
   */
  @Post('_test/annealing/run-sweep')
  @HttpCode(HttpStatus.OK)
  async runSweep(): Promise<AnnealingSweepResult> {
    return this.sweep.runSweep();
  }

  /**
   * POST /v1/_test/annealing/backdate-ends-at
   *
   * Body { playerId, buildingId, endsAtIso }. Directly sets `annealing_state.settling_ends_at` to the
   * given ISO timestamp — the state-not-timer falsifiable seam (design §9.4: "le test AVANCE l'horloge de
   * la row"). TEST-ONLY escape hatch (mirrors `legal-test.controller.ts#forceExpireCase`): no legitimate
   * player/BO verb ever backdates a timestamp; production code never calls this.
   */
  @Post('_test/annealing/backdate-ends-at')
  @HttpCode(HttpStatus.OK)
  async backdateEndsAt(
    @Body() body: { playerId: string; buildingId: string; endsAtIso: string },
  ): Promise<{ backdated: true }> {
    await this.repo.testBackdateEndsAt(body.playerId, body.buildingId, new Date(body.endsAtIso));
    return { backdated: true };
  }

  /** GET /v1/_test/annealing/state?playerId=&buildingId= — a REAL read (plain, no fig-leaf). */
  @Get('_test/annealing/state')
  async getState(
    @Query('playerId') playerId: string,
    @Query('buildingId') buildingId: string,
  ): Promise<{ row: AnnealingStateRow | null }> {
    return { row: await this.repo.findState(playerId, buildingId) };
  }

  /** GET /v1/_test/annealing/state-list?playerId= — every annealing row for a player. */
  @Get('_test/annealing/state-list')
  async listStates(@Query('playerId') playerId: string): Promise<{ rows: AnnealingStateRow[] }> {
    return { rows: await this.repo.listStatesForPlayer(playerId) };
  }
}

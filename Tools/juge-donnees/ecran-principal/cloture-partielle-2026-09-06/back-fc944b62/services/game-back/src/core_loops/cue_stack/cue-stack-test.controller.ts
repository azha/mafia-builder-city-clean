// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (`StackCommittedEvent` —
//             the falsifiable "does it actually fire" proof, no-fig-leaf discipline) + §C3 (execution
//             tick / stale sweep / forced-executor-throw seam — Lesson #3 zero live-vs-test divergence) +
//             §C4 (direct disruption test route — the SAME Lesson #3 shape for `CueStackDisruptionService`)
//             Pattern: `core-loops-test.controller.ts`'s own `onModuleInit` in-memory capture-probe
//             convention (`_capturedAgedOutEvents` / `GET .../aged-out-events`) — copied verbatim here for
//             `StackCommittedEvent`/`SlotExecutedEvent`/`SlotFailedEvent`, since NO real consumer
//             subscribes yet (design DD-P3 — an honest producer-only landing). Gated
//             `testControllersEnabled()` — the `SupplyChainTestController`/`CoreLoopsTestController`
//             precedent (never mounted in production).
//             — P3-D C2 — 2026-07-14 / C3 — 2026-07-14 / C4 — 2026-07-14
//
// `CueStackTestController` — test-only in-memory capture of `StackCommittedEvent`/`SlotExecutedEvent`/
// `SlotFailedEvent`s (the falsifiable "does it actually fire" proof) + (C3) direct test routes onto
// `CueStackExecutionTickService.runTick` / `CueStackStaleSweepService.runTick` / the executor
// fault-injector's `arm` + (C4) `CueStackDisruptionService.disruptForBuildingEvent` (Lesson #3 — the SAME
// methods the MINUTE/29 + NIGHTLY/29 scheduler slots / the REAL `HeatEscalationEvent`/`BuildingRaidedEvent`
// bus subscribers call, zero live-vs-test divergence — the `_test` route bypasses ONLY the bus wiring
// itself, calling the IDENTICAL disruption algorithm the real subscribers invoke).

import { Body, Controller, Get, HttpCode, HttpStatus, OnModuleInit, Post, Query } from '@nestjs/common';

import { CityEventBus, type SlotExecutedEvent, type SlotFailedEvent, type StackCommittedEvent } from '../../citysim/events/city-event-bus';
import { CueStackDisruptionService, type CueStackDisruptionResult, type CueStackDisruptionSource } from './cue-stack-disruption.service';
import { CueStackExecutionTickService, type CueStackExecutionTickResult } from './cue-stack-execution-tick.service';
import { CueStackStaleSweepService } from './cue-stack-stale-sweep.service';
import { CueStackExecutorFaultInjector } from './cue-stack-executor-fault-injector';

interface CapturedStackCommittedEvent {
  playerId: string;
  cueStackId: string;
  sessionRef: string | null;
  slotCount: number;
  gameMinute: number;
}

interface CapturedSlotExecutedEvent {
  playerId: string;
  cueStackId: string;
  slotId: string;
  slotType: string;
  gameMinute: number;
}

interface CapturedSlotFailedEvent {
  playerId: string;
  cueStackId: string;
  slotId: string;
  slotType: string;
  reason: 'failed_collision' | 'failed_executor' | 'failed_disrupted';
  gameMinute: number;
}

@Controller()
export class CueStackTestController implements OnModuleInit {
  private readonly _capturedCommittedEvents: CapturedStackCommittedEvent[] = [];
  private readonly _capturedExecutedEvents: CapturedSlotExecutedEvent[] = [];
  private readonly _capturedFailedEvents: CapturedSlotFailedEvent[] = [];

  constructor(
    private readonly bus: CityEventBus,
    private readonly executionTick: CueStackExecutionTickService,
    private readonly staleSweep: CueStackStaleSweepService,
    private readonly faultInjector: CueStackExecutorFaultInjector,
    private readonly disruption: CueStackDisruptionService,
  ) {}

  /** Subscribe to `StackCommittedEvent`/`SlotExecutedEvent`/`SlotFailedEvent` for in-memory capture
   *  (capture-only, no side effects — the `CoreLoopsTestController.onModuleInit` convention). */
  onModuleInit(): void {
    this.bus.onStackCommitted((event: StackCommittedEvent) => {
      this._capturedCommittedEvents.push({
        playerId: event.playerId,
        cueStackId: event.cueStackId,
        sessionRef: event.sessionRef,
        slotCount: event.slotCount,
        gameMinute: event.gameMinute,
      });
    });
    this.bus.onSlotExecuted((event: SlotExecutedEvent) => {
      this._capturedExecutedEvents.push({
        playerId: event.playerId,
        cueStackId: event.cueStackId,
        slotId: event.slotId,
        slotType: event.slotType,
        gameMinute: event.gameMinute,
      });
    });
    this.bus.onSlotFailed((event: SlotFailedEvent) => {
      this._capturedFailedEvents.push({
        playerId: event.playerId,
        cueStackId: event.cueStackId,
        slotId: event.slotId,
        slotType: event.slotType,
        reason: event.reason,
        gameMinute: event.gameMinute,
      });
    });
  }

  /** GET /v1/_test/cue-stack/committed-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/cue-stack/committed-events')
  getCommittedEvents(@Query('playerId') playerId?: string): { count: number; events: CapturedStackCommittedEvent[] } {
    const events = playerId
      ? this._capturedCommittedEvents.filter((e) => e.playerId === playerId)
      : [...this._capturedCommittedEvents];
    return { count: events.length, events };
  }

  /** GET /v1/_test/cue-stack/executed-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/cue-stack/executed-events')
  getExecutedEvents(@Query('playerId') playerId?: string): { count: number; events: CapturedSlotExecutedEvent[] } {
    const events = playerId
      ? this._capturedExecutedEvents.filter((e) => e.playerId === playerId)
      : [...this._capturedExecutedEvents];
    return { count: events.length, events };
  }

  /** GET /v1/_test/cue-stack/failed-events?playerId= — in-memory capture, optionally filtered. */
  @Get('_test/cue-stack/failed-events')
  getFailedEvents(@Query('playerId') playerId?: string): { count: number; events: CapturedSlotFailedEvent[] } {
    const events = playerId
      ? this._capturedFailedEvents.filter((e) => e.playerId === playerId)
      : [...this._capturedFailedEvents];
    return { count: events.length, events };
  }

  /**
   * POST /v1/_test/cue-stack/run-execution-tick
   *
   * Body { playerId, gameMinute }. Calls `CueStackExecutionTickService.runTick` DIRECTLY — the SAME
   * method the `CUE_STACK_EXECUTE` MINUTE/29 scheduler slot calls (Lesson #3 — zero live-vs-test
   * divergence). Response = the REAL `CueStackExecutionTickResult` — the falsifiable proof surface for
   * plan §C3 (exact-tick firing, failed_collision/failed_executor, the 0-write no-stack branch).
   */
  @Post('_test/cue-stack/run-execution-tick')
  @HttpCode(HttpStatus.OK)
  async runExecutionTick(@Body() body: { playerId: string; gameMinute: number }): Promise<CueStackExecutionTickResult> {
    return this.executionTick.runTick(body.playerId, body.gameMinute);
  }

  /**
   * POST /v1/_test/cue-stack/run-stale-sweep
   *
   * Body { playerId, gameMinute }. Calls `CueStackStaleSweepService.runTick` DIRECTLY — the SAME method
   * the `CUE_STACK_STALE_SWEEP` NIGHTLY/29 scheduler slot calls. Response `{ swept }` — the count of
   * stacks force-resolved this call.
   */
  @Post('_test/cue-stack/run-stale-sweep')
  @HttpCode(HttpStatus.OK)
  async runStaleSweep(@Body() body: { playerId: string; gameMinute: number }): Promise<{ swept: number }> {
    const swept = await this.staleSweep.runTick(body.playerId, body.gameMinute);
    return { swept };
  }

  /**
   * POST /v1/_test/cue-stack/arm-executor-fault
   *
   * Body { playerId }. Calls `CueStackExecutorFaultInjector.arm` DIRECTLY — see that file's own header
   * for the full contract. Response `{ armed: true }`.
   */
  @Post('_test/cue-stack/arm-executor-fault')
  @HttpCode(HttpStatus.OK)
  armExecutorFault(@Body() body: { playerId: string }): { armed: true } {
    this.faultInjector.arm(body.playerId);
    return { armed: true };
  }

  /**
   * POST /v1/_test/cue-stack/disrupt-building
   *
   * Body { playerId, buildingId, gameMinute, source }. Calls `CueStackDisruptionService.
   * disruptForBuildingEvent` DIRECTLY — the SAME method the REAL `HeatEscalationEvent`/`BuildingRaidedEvent`
   * bus subscribers call (Lesson #3 — zero live-vs-test divergence; the wiring proof itself is exercised
   * separately, via the REAL heat-tick / raid test hook, in `cue_stack_cascade.spec.ts`). This direct route
   * exists so genuinely CONCURRENT calls (`Promise.all`) can be driven deterministically for the I8
   * concurrency proof — the SAME "direct-call route needed for true concurrency" reasoning
   * `run-execution-tick`'s own I3 test already relies on. `source` must be `'heat_escalation'` or
   * `'building_raided'` (the closed 2-member discriminator `CueStackDisruptionSource`).
   */
  @Post('_test/cue-stack/disrupt-building')
  @HttpCode(HttpStatus.OK)
  async disruptBuilding(
    @Body() body: { playerId: string; buildingId: string; gameMinute: number; source: CueStackDisruptionSource },
  ): Promise<CueStackDisruptionResult> {
    return this.disruption.disruptForBuildingEvent(body.playerId, body.buildingId, body.gameMinute, body.source);
  }
}

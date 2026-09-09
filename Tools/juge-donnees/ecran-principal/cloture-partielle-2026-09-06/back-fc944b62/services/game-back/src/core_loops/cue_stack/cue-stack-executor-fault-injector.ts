// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 falsifiable ("executor
//             forcé à throw (seam test) → failed_executor + le stack CONTINUE").
//             Pattern: `progression/loop10/hl-card-fault-injector.ts` (`HlCardFaultInjector`) — TEST-ONLY,
//             in-memory, one-shot fault injection, copied verbatim (keyed by playerId here, by
//             providerType there — the SAME arm/consume shape).
//             — P3-D C3 — 2026-07-14
//
// `CueStackExecutorFaultInjector` — TEST-ONLY, in-memory, one-shot fault injection for the C3 firing path.
// `CueStackExecutionTickService.runTick` consumes this IMMEDIATELY BEFORE calling
// `SlotTypeExecutorRegistry.require(slotType).execute(...)` for a player's current slot — armed +
// consumed → throws a clearly-labeled TEST-ONLY error INSTEAD of calling the real executor, which the
// tick's own try/catch (the SAME path a genuine production throw takes) marks `failed_executor` (D4) —
// proving the tick's OWN crash-safe handling WITHOUT ever touching a real executor's code (no fig-leaf:
// the REAL executors are never modified/stubbed to support this test). One-shot: `arm` re-arms; the
// FIRST firing attempt for that player after arming consumes the flag.
//
// The ONLY way to ARM it is the test-only route `POST /v1/_test/cue-stack/arm-executor-fault`
// (`cue-stack-test.controller.ts`, itself `testControllersEnabled()`-gated) — no production code path
// ever calls `arm`.

import { Injectable } from '@nestjs/common';

@Injectable()
export class CueStackExecutorFaultInjector {
  private readonly armed = new Set<string>();

  /** TEST-ONLY: arm this player's NEXT firing attempt to throw instead of calling the real executor. */
  arm(playerId: string): void {
    this.armed.add(playerId);
  }

  /** Consumed by `CueStackExecutionTickService.runTick` right before invoking the real executor —
   *  `true` (and clears the arm) iff this player was armed; `false` (no-op) otherwise. */
  consumeIfArmed(playerId: string): boolean {
    if (this.armed.has(playerId)) {
      this.armed.delete(playerId);
      return true;
    }
    return false;
  }
}

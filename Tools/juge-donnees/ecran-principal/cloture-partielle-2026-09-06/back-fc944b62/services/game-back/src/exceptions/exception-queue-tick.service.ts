// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C3 (spine tick — NIGHTLY/22
//             re-priority + aged-out) + design §5 (Spine completion, D4/D5) + decisions §1.4 D4 /
//             §2.2 DD-P2 ("the tick service — NEW files, D3 collision wall").
//             Pattern (real-time-per-player sweep registration): `session.service.ts`'s SESSION_SWEEP
//             (OnApplicationBootstrap + registerSystem + a public method the scheduler AND the
//             `run-exception-tick` `_test` route both call — Lesson #3). Pattern (batched set-based
//             write): `selling.repository.ts applySells` (`UPDATE … FROM (VALUES …)`, the T3
//             determinism discipline — NEVER a per-row `await` loop).
//             — P3-A C3 — 2026-07-10
//
// `ExceptionQueueTickService` — the D4 NIGHTLY/22 (provisional) re-priority + aged-out tick. NEW file
// (D3 collision wall — lives IN `src/exceptions/` per DD-P2, but touches ONLY the NEW repo methods
// added this chunk; the EffectType union, the 6 handlers, the 3 producers, and the resolve endpoint
// contract are byte-untouched).
//
// ONE scan per player (`ExceptionsRepository.listPending`, already the T2 primary read — REUSE, no new
// query shape): every PENDING row is classified in-memory into EXACTLY one of:
//   (a) past the aged-out horizon (`core_loops.exception_aged_out_horizon_hours`, 48h default) → marked
//       `aged_out` (set-based, D4) — its priority is NOT also recomputed this tick (about to archive).
//   (b) still pending, priority recompute DIFFERS from the stored value → included in the batched
//       `updatePriorities` write.
//   (c) still pending, priority recompute is UNCHANGED (real-time drift too small to move the rounded
//       int, or already saturated at `age_max_factor`) → excluded from the write entirely. This IS the
//       "zero-write when unchanged" idempotency guarantee (design §5): a same-day (or, in this repo's
//       real-wall-clock domain, an immediately-repeated) re-run recomputes the IDENTICAL rounded ints
//       for every still-pending card → the updates array comes back empty → `updatePriorities` returns
//       0 WITHOUT issuing any UPDATE at all (no DB round-trip, not merely an affected-row-count of 0).
//
// Determinism (D13): `computeAgeFactor`/`computeExceptionPriority` (`exception-priority-decay.ts`) are
// PURE — no Math.random, no hidden clock read. The ONE clock read (`Date.now()`) happens HERE, once per
// tick invocation, and is reused for every row's `ageHours` + the aged-out horizon comparison — so a
// single tick call is internally consistent (no two rows see a different "now").

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus } from '../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../citysim/scheduler/city_sim_system';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import { ExceptionsRepository } from './exceptions.repository';
import { computeAgeFactor, computeExceptionPriority } from './exception-priority-decay';

/** Observable result of one `runTick` call — the falsifiable proof surface (design §5, plan §C3). */
export interface ExceptionQueueTickResult {
  /** Cards whose `priority` was ACTUALLY updated (excludes cards whose recompute was unchanged). */
  readonly repriced: number;
  /** Cards transitioned `pending` → `aged_out` this call. */
  readonly agedOut: number;
}

@Injectable()
export class ExceptionQueueTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExceptionQueueTickService.name);

  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly bus: CityEventBus,
    private readonly scheduler: CitySimSchedulerService,
  ) {}

  onApplicationBootstrap(): void {
    // P3-A C3 — EXCEPTION_QUEUE_TICK (NIGHTLY/22 provisional, re-verified free this session — 21 is
    // deliberately skipped, reserved for the in-flight 04f-A lot's own NIGHTLY claim, D3 collision
    // wall). GLOBAL per-player firing (like SESSION_SWEEP/MoneyHoldingAudit): each player's own NIGHTLY
    // tick re-prices + ages out THEIR OWN queue only. Organically a no-op for a player with nothing
    // pending (design §13 zero-regression).
    this.scheduler.registerSystem({
      id: CitySystemId.EXCEPTION_QUEUE_TICK,
      cadence: Cadence.NIGHTLY,
      order: 22,
      run: (ctx: CitySimTickContext) => this.runTick(ctx.playerId, ctx.gameMinute).then(() => undefined),
    });
  }

  /**
   * `EXCEPTION_QUEUE_TICK` (D4) — the SAME method both the NIGHTLY/22 scheduler tick AND the
   * `run-exception-tick` `_test` route call (Lesson #3 — zero live-vs-test divergence). Re-prices every
   * still-pending card (set-based, zero-write when unchanged) THEN archives every card past the
   * aged-out horizon (set-based) + emits one `ExceptionAgedOutEvent` per archived card.
   *
   * ★ (⊥ C3 MINOR-3 fold) `gameMinute` is the real in-game clock the caller supplies — the scheduler
   * passes `ctx.gameMinute` (the `SessionService`/`session.service.ts` convention: `SESSION_SWEEP`'s
   * `sweepStaleForPlayer(ctx.playerId, ctx.gameMinute)`); the `run-exception-tick` `_test` route passes
   * its OWN `gameMinute` body param (default 0 — "no scheduler ctx", the `SessionClosedEvent` doc
   * convention `city-event-bus.ts:1493-1494`). Stamped verbatim onto every `ExceptionAgedOutEvent` this
   * call emits (previously hardcoded 0 regardless of caller — a P3-B/E/telemetry consumer reading
   * `gameMinute` off this event would have seen a permanently-frozen clock).
   */
  async runTick(playerId: string, gameMinute: number): Promise<ExceptionQueueTickResult> {
    const decayHours = coreLoopsTunables.exceptionPriorityDecayPeriodHours;
    const maxFactor = coreLoopsTunables.exceptionPriorityAgeMaxFactor;
    const horizonHours = coreLoopsTunables.exceptionAgedOutHorizonHours;

    const pending = await this.repo.listPending(playerId);
    if (pending.length === 0) {
      return { repriced: 0, agedOut: 0 }; // L1 empty-state skip — organically a no-op.
    }

    const now = Date.now();
    const agedOutIds: string[] = [];
    const priorityUpdates: Array<{ exceptionId: string; newPriority: number }> = [];

    for (const row of pending) {
      const ageHours = (now - row.emitted_at.getTime()) / 3_600_000;

      // Past the horizon → archive (D4). Its priority is NOT also recomputed this tick — about to
      // become aged_out, so a re-priority write would be immediately superseded and wasted.
      if (ageHours >= horizonHours) {
        agedOutIds.push(row.exception_id);
        continue;
      }

      // The PRODUCTION formula (exception-priority-decay.ts) — the SAME function
      // `exception_tick_priority.spec.ts` direct-imports to precompute its expected int.
      const ageFactor = computeAgeFactor(ageHours, decayHours, maxFactor);
      const newPriority = computeExceptionPriority(row.severity, ageFactor);
      if (newPriority !== row.priority) {
        priorityUpdates.push({ exceptionId: row.exception_id, newPriority });
      }
      // else: recompute unchanged → excluded from the write entirely (the idempotency guarantee).
    }

    const repriced = await this.repo.updatePriorities(priorityUpdates);
    const aged = await this.repo.markAgedOut(agedOutIds);

    for (const row of aged) {
      this.bus.emitExceptionAgedOut({
        type: 'exception_aged_out',
        playerId,
        exceptionId: row.id,
        lieutenantId: row.lieutenantId,
        fallback: 'NO_OP',
        gameMinute,
      });
    }

    if (repriced > 0 || aged.length > 0) {
      this.logger.debug(
        `[ExceptionQueueTickService] playerId=${playerId} repriced=${repriced} agedOut=${aged.length} ` +
          `(decayHours=${decayHours}, maxFactor=${maxFactor}, horizonHours=${horizonHours}).`,
      );
    }

    return { repriced, agedOut: aged.length };
  }
}

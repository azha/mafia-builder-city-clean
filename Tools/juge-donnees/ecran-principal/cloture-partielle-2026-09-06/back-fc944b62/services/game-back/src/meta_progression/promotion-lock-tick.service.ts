// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("`PROMOTION_LOCK_
//             TICK` HOURLY/7: SCHEDULE row + `registerSystem`; window close -> CLOSED + `closed_at` +
//             `UnmanagedWindowClosedEvent` + SUSPENDED lifted; idempotent re-run") + C10 (BO force-close
//             "emits the SAME UnmanagedWindowClosedEvent" — the shared in-memory test-probe capture below).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §4/§9.2 (D10 —
//             "the new PROMOTION_LOCK_TICK (HOURLY) closes expired windows set-based ... Organic no-op
//             (zero writes) with no active windows") + §12 (force-close-window "emits the SAME event").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §1 (HOURLY/7 confirmed
//             free).
//             Pattern: `core_loops/compression/compression-quiet-decay-tick.service.ts` (WEEKLY
//             registration + "one public method both the scheduler AND the `_test` route call" shape,
//             Lesson #3) + `mastery-accumulator.service.ts`'s OWN `getThresholdCrossedEvents`/
//             `clearThresholdCrossedEvents` in-memory test-probe shape (C10 REUSE — same posture, here a
//             genuine BUS SUBSCRIPTION rather than a push-at-emit-site, see below for why).
//             — P3-F C8 — 2026-07-19 / C10 — 2026-07-19 (event-capture probe)
//
// `PromotionLockTickService` — registers `PROMOTION_LOCK_TICK` at HOURLY/7 (confirmed free after
// `CONSTANT_HUM_CELL_TICK`/6, C0 re-anchor). `runTick(playerId, nowTick)`: ONE set-based atomic UPDATE
// (`PromotionLocksRepository.closeExpiredWindows`) closes every ACTIVE lock of this player whose
// `window_end_tick <= nowTick`; idempotent by construction (a second call at the same/later tick matches
// zero rows — the WHERE's own `unmanaged_window_state = 'ACTIVE'` guard, no epoch/watermark column
// needed). Emits ONE `UnmanagedWindowClosedEvent` per row actually closed.
//
// ★ C10 EVENT-CAPTURE PROBE: `onApplicationBootstrap` additionally SUBSCRIBES (`bus.onUnmanagedWindowClosed`)
// rather than pushing at each of THIS service's own emit call sites (unlike `MasteryAccumulatorService`'s
// push-at-emit-site shape) — because design §12's `POST /v1/admin/meta/force-close-window`
// (`meta-progression-admin.controller.ts`, C10) ALSO emits this SAME event type, from a DIFFERENT class.
// A genuine bus subscription captures BOTH emitters' events into ONE array, in true wall-clock arrival
// order — the exact substrate the C10 concurrency falsifiable needs ("force-close racing the HOURLY tick
// on the SAME lock -> exactly ONE CLOSED transition, ONE event"): the winner's emit lands here once, the
// loser never emits at all (its own `RETURNING` is empty — see `PromotionLocksRepository.forceCloseLock`/
// `closeExpiredWindows`'s own headers for the row-level guard that makes this true).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../citysim/scheduler/city_sim_system';
import { CityEventBus, type UnmanagedWindowClosedEvent } from '../citysim/events/city-event-bus';
import { PromotionLocksRepository } from './promotion-locks.repository';

/** The falsifiable proof surface `runTick` returns (plan §C8 floor — window-lifecycle both directions +
 *  idempotent re-run). */
export interface PromotionLockTickResult {
  readonly closed: ReadonlyArray<{ categoryId: number; lockId: string }>;
}

@Injectable()
export class PromotionLockTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PromotionLockTickService.name);

  // C10 — the shared event-capture probe (see file header). Test-only observation surface, populated by
  // a REAL bus subscription — never mutated directly by any emit call site.
  private closedWindowEvents: UnmanagedWindowClosedEvent[] = [];

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly promotionLocksRepo: PromotionLocksRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.PROMOTION_LOCK_TICK,
      cadence: Cadence.HOURLY,
      order: 7,
      run: async (ctx: CitySimTickContext) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    // C10 — subscribe ONCE at boot (see file header for why this is a subscription, not a push-at-emit-
    // site): captures every `UnmanagedWindowClosedEvent`, from EITHER this service's own `runTick` OR
    // `MetaProgressionAdminController#forceCloseWindow` (C10), in true arrival order.
    this.bus.onUnmanagedWindowClosed((event) => {
      this.closedWindowEvents.push(event);
    });
    this.logger.log(
      'PromotionLockTickService registered PROMOTION_LOCK_TICK at HOURLY/7 — next free after ' +
        'CONSTANT_HUM_CELL_TICK/6. Each in-game hour, per player: closes every ACTIVE promotion_locks row ' +
        'whose window_end_tick <= now (set-based); idempotent per row (re-run at the same/later tick -> ' +
        'zero writes); a player with no ACTIVE lock -> zero writes, always.',
    );
  }

  /** C10 test-probe: every `UnmanagedWindowClosedEvent` captured since boot or the last clear (see file
   *  header) — public so `DelegationRatchetTestController` can drive the concurrency/event-shape floor. */
  getClosedWindowEvents(): readonly UnmanagedWindowClosedEvent[] {
    return this.closedWindowEvents;
  }

  /** C10 test-probe: reset the capture (test-isolation). */
  clearClosedWindowEvents(): void {
    this.closedWindowEvents = [];
  }

  // ───────────────────────────── the registered HOURLY/7 tick ─────────────────────────────

  /** {HOURLY, order 7} — the design §9.2/D10 window-close for one player, at the given tick. Public so
   *  `DelegationRatchetTestController` can drive it directly for E2E (Lesson #3). */
  async runTick(playerId: string, nowTick: number): Promise<PromotionLockTickResult> {
    const closed = await this.promotionLocksRepo.closeExpiredWindows(playerId, nowTick);

    for (const row of closed) {
      this.bus.emitUnmanagedWindowClosed({
        type: 'unmanaged_window_closed',
        playerId,
        categoryId: row.categoryId,
        lockId: row.lockId,
        gameMinute: nowTick,
      });
    }

    if (closed.length > 0) {
      this.logger.log(
        `PROMOTION_LOCK_TICK: player=${playerId} nowTick=${nowTick} -> closed ${closed.length} window(s) ` +
          `(categories: ${closed.map((c) => c.categoryId).join(',')}).`,
      );
    }

    return { closed };
  }

  // ───────────────────────────── C10: GM force-close mutateFn ─────────────────────────────

  /**
   * `POST /v1/admin/meta/force-close-window` mutateFn (design §12, `meta-progression-admin.controller.ts`).
   * Delegates the winner-gate UPDATE to `PromotionLocksRepository.forceCloseLock` (see that method's own
   * header for the shared row-level-guard concurrency account — the SAME idiom `runTick`'s own
   * `closeExpiredWindows` call above uses, keyed by `lock_id` instead of `(player_id, window_end_tick)`)
   * and, on a genuine win, emits the SAME `UnmanagedWindowClosedEvent` shape `runTick` emits above (design
   * §12's own "emits the SAME event" mandate) — colocated HERE (not in the admin controller) so this
   * service stays the ONE place an `UnmanagedWindowClosedEvent` is ever constructed. `gameMinute: 0` — a
   * GM-triggered HTTP call carries no scheduler tick context (mirrors `PromotionLockService.requestRecall`'s
   * own `emitRecallInitiated`/`emitAccordDegradation` convention for the SAME reason). Returns `null` on a
   * race loss / already-CLOSED lock — the caller (the admin controller) reports 409, never a throw.
   */
  async forceCloseWindow(lockId: string): Promise<{ playerId: string; categoryId: number; lockId: string } | null> {
    const closed = await this.promotionLocksRepo.forceCloseLock(lockId);
    if (!closed) return null;

    this.bus.emitUnmanagedWindowClosed({
      type: 'unmanaged_window_closed',
      playerId: closed.playerId,
      categoryId: closed.categoryId,
      lockId: closed.lockId,
      gameMinute: 0,
    });

    this.logger.log(
      `FORCE_CLOSE_WINDOW: lock=${lockId} player=${closed.playerId} category=${closed.categoryId} -> closed (GM override).`,
    );
    return closed;
  }
}

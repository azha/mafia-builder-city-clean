// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C2 ("MasteryAccumulator
//             Service (upsert-first, +1/−2, LEAST(100, GREATEST(0,…)), accrual only while SELF — D3/design
//             §7.3); resolve-hook sibling subscriber (R6 site); MasteryThresholdCrossedEvent both
//             directions").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §7.1-§7.3
//             (mapper registry / resolve hook / write path) + §4 (event topology — the accumulator
//             subscribes to "the category-mapped REAL emitters (§7 registry) + the resolve hook").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §6 R6 (resolve-hook +
//             mapping fields — the jsonb `candidate_actions[].source` tag, no first-class category column).
//             Pattern (bus subscribe + per-listener isolation): `annealing-initiation-subscriber.service.ts`
//             (`onApplicationBootstrap` explicit `bus.onXxx((e) => this.handle(e).catch(err => logger.
//             error(...)))` per event — the SAME belt-and-suspenders convention every subscriber in this
//             codebase follows ON TOP OF the bus's own per-listener try/catch isolation, `city-event-bus.ts
//             #dispatch`). Crossing-detection precedent: `compression-stress-subscriber.service.ts` (a
//             server-computed pre/post comparison drives a ONE-SHOT bus emit, never a client-computed flag).
//             — P3-F C2 — 2026-07-18
//
// `MasteryAccumulatorService` — turns the DORMANT `mastery_score` table into a live accumulator fed by
// REAL bus events (design D3). Two entry points:
//   1. `onApplicationBootstrap` wires 8 REAL bus-event subscriptions (the §6/C0-§7 LIVE-category emitters,
//      fire-and-forget + contained, mirrors `AnnealingInitiationSubscriberService`).
//   2. `onExceptionResolved` is a SYNCHRONOUS sibling call `ExceptionsService.resolve()` awaits directly
//      (the R6 resolve-hook — additive at the SAME hook point as the Phase-17 `progression.onResolution`
//      call, `exceptions.service.ts:190`). A structured no-op (never throws) on a card that carries no
//      recognized `source` tag — most resolved cards are not mastery-bound.
//
// Both paths funnel through the SAME `applyDelta` (upsert-first + atomic clamp + crossing detection +
// `MasteryThresholdCrossedEvent` emit) — one write path, one crossing-detection formula, zero duplication.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
  CityEventBus,
  type RouteCreatedEvent,
  type RouteRebuiltEvent,
  type CourierInterceptedEvent,
  type HireCompletedEvent,
  type DirectHireCompletedEvent,
  type PrecursorOrderFilledEvent,
  type StashHighBlockingAlertEvent,
  type BufferOverflowEvent,
  type HeatEscalationEvent,
  type MasteryThresholdCrossedEvent,
} from '../citysim/events/city-event-bus';
import { metaProgressionTunables } from './meta-progression-tunables';
import { MASTERY_EVENT_MAPPER_REGISTRY } from './mastery-event-mapper.registry';
import { MasteryScoreRepository } from './mastery-score.repository';

@Injectable()
export class MasteryAccumulatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasteryAccumulatorService.name);

  /** In-memory probe: every `MasteryThresholdCrossedEvent` fired this process, newest last (test-only —
   *  mirrors `CourierInterceptionService.lastInterceptedEvent`'s own "in-memory test probe, zero
   *  production concern, CityEventBus is in-process" posture). `MasteryThresholdCrossedEvent` has no
   *  real consumer yet (design §4 — "additive seam, org-overview/BO subscribe later"), so this is the
   *  ONLY way the C2 falsifiable floor can observe "exactly once per crossing" without a raw bus tap in
   *  the test process. Cleared by the test reset route. */
  private thresholdCrossedEvents: MasteryThresholdCrossedEvent[] = [];

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: MasteryScoreRepository,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `MasteryThresholdCrossedEvent` fired this process (test-probe — never used in production paths). */
  getThresholdCrossedEvents(): readonly MasteryThresholdCrossedEvent[] {
    return this.thresholdCrossedEvents;
  }

  /** Clear the in-memory threshold-crossed probe (called by the test reset route). */
  clearThresholdCrossedEvents(): void {
    this.thresholdCrossedEvents = [];
  }

  // ── bus wiring (8 REAL LIVE-category emitters, design §6/C0-§7) ────────────────────────────────────

  onApplicationBootstrap(): void {
    this.bus.onRouteCreated((e: RouteCreatedEvent) => {
      this.handleBusEvent('route_created', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`route_created mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onRouteRebuilt((e: RouteRebuiltEvent) => {
      this.handleBusEvent('route_rebuilt', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`route_rebuilt mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onCourierIntercepted((e: CourierInterceptedEvent) => {
      this.handleBusEvent('courier_intercepted', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`courier_intercepted mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onHireCompleted((e: HireCompletedEvent) => {
      this.handleBusEvent('hire_completed', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`hire_completed mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onDirectHireCompleted((e: DirectHireCompletedEvent) => {
      this.handleBusEvent('direct_hire_completed', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`direct_hire_completed mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onPrecursorOrderFilled((e: PrecursorOrderFilledEvent) => {
      this.handleBusEvent('precursor_order_filled', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`precursor_order_filled mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onStashHighBlockingAlert((e: StashHighBlockingAlertEvent) => {
      this.handleBusEvent('stash_high_blocking_alert', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`stash_high_blocking_alert mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onBufferOverflow((e: BufferOverflowEvent) => {
      this.handleBusEvent('buffer_overflow', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`buffer_overflow mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onHeatEscalation((e: HeatEscalationEvent) => {
      this.handleBusEvent('heat_escalation', e.playerId, e.gameMinute).catch((err) =>
        this.logger.error(`heat_escalation mastery handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  private async handleBusEvent(eventType: string, playerId: string, gameMinute: number): Promise<void> {
    const bindings = MASTERY_EVENT_MAPPER_REGISTRY.busEventBindings.get(eventType) ?? [];
    for (const b of bindings) {
      await this.applyDelta(playerId, b.categoryCode, b.outcome, gameMinute);
    }
  }

  // ── R6 resolve-hook sibling (ExceptionsService.resolve, additive, SYNCHRONOUS call) ────────────────

  /**
   * `ExceptionsService.resolve()` calls this DIRECTLY (awaited, the SAME hook point as `progression.
   * onResolution`/`sessions.recordExceptionResolved` — additive, D3-wall untouched). `candidateActions` is
   * the resolved row's `candidate_actions` jsonb (already in memory — no extra query). `gameMinute` has no
   * scheduler-tick context at a player-triggered resolve → `0` (mirrors `lieutenant.service.ts`'s own
   * `gameMinute: 0` "player-triggered" convention). A card whose `candidate_actions[0].source` carries no
   * recognized tag is a structured no-op (design §7.2 — "a card aged-out is NOT a player failure"; more
   * generally, most resolved cards are simply not mastery-bound — this is NOT an error).
   */
  async onExceptionResolved(playerId: string, candidateActions: unknown): Promise<void> {
    const first = (candidateActions as Array<Record<string, unknown>> | null)?.[0];
    const sourceTag = first?.['source'] as string | undefined;
    if (!sourceTag) return;
    const bindings = MASTERY_EVENT_MAPPER_REGISTRY.resolveHookBindings.get(sourceTag) ?? [];
    for (const b of bindings) {
      await this.applyDelta(playerId, b.categoryCode, b.outcome, 0);
    }
  }

  // ── shared write path + crossing detection (design §7.3) ───────────────────────────────────────────

  /**
   * The ONE write path every binding funnels through: `MasteryScoreRepository.applyDelta` (upsert-first +
   * row-locked atomic clamp), then crossing detection — compare pre/post vs `metaProgressionTunables.
   * masteryRetirementThreshold` BOTH directions, emit `MasteryThresholdCrossedEvent` EXACTLY ONCE per
   * crossing (a same-side pre/post pair, e.g. 40→41 while threshold=50, emits nothing — no crossing
   * occurred). `applied=false` (DELEGATED/RETIRED gate) short-circuits before any crossing check — a
   * non-accruing delta can never "cross" anything.
   */
  private async applyDelta(playerId: string, categoryCode: number, outcome: 1 | -2, gameMinute: number): Promise<void> {
    const result = await this.repo.applyDelta(playerId, categoryCode, outcome);
    if (!result.applied) return; // DELEGATED/RETIRED — no accrual (canon, design §7.3).

    const threshold = metaProgressionTunables.masteryRetirementThreshold;
    const wasEligible = result.oldScore >= threshold;
    const isEligible = result.newScore >= threshold;
    if (wasEligible === isEligible) return; // no crossing.

    const event: MasteryThresholdCrossedEvent = {
      type: 'mastery_threshold_crossed',
      playerId,
      categoryId: categoryCode,
      direction: isEligible ? 'ELIGIBLE' : 'REGRESSED',
      gameMinute,
    };
    this.bus.emitMasteryThresholdCrossed(event);
    this.thresholdCrossedEvents.push(event); // test-probe capture — see field header.
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-14-exception-queue-design.md §T3 / §5 Architecture
//             (the EVENT-DRIVEN producer — the funnel's first source; the LIEUTENANT_TICK emits a salient-uncovered
//             CityEvent, THIS service subscribes + dedups + inserts the card; one-way coupling lieutenant → bus ← exceptions)
//             -- session:2026-06-09 (Phase-14 T3 — the salient-event producer) --
//
// `ExceptionProducerService` — the Exception Queue's FIRST organic producer (Phase-14). It SUBSCRIBES (onModuleInit) to
// the `LieutenantSalientUncoveredEvent` the LIEUTENANT_TICK emits onto the shared `CityEventBus` when a delegated
// lieutenant faces a SALIENT signal its compiled script has no rule for (Phase-14: an uncovered heat spike on the COOK's
// building). The tick does the CHEAP in-memory gate (heat ≥ band AND no heat rule in the IR) and emits; THIS service —
// reached ONLY when that cheap gate passed — does the DB work: the DEDUP (at most one pending card per lieutenant,
// anti-flood while the signal persists), then synthesizes + inserts the card (incl. the candidate_actions with the baked
// `add_rule_dsl` ADD_RULE reuses).
//
// DECOUPLING (§5): the LIEUTENANT_TICK imports NOTHING from this module — it emits onto the bus and this (decoupled)
// producer subscribes. The dependency is one-way (lieutenant → bus ← exceptions). This is exactly the seam every future
// producer (other systems) will reuse to feed the same queue.
//
// CONTAINMENT: the bus already isolates each listener in its own try/catch (a throwing handler can't break the tick or a
// sibling listener — city-event-bus.ts §dispatch). On top of that, the subscriber callback is synchronous but the work is
// async — so the returned promise's rejection is caught HERE (the `.catch` on onModuleInit) and logged as a contained
// fault; an async failure (e.g. a transient DB error) never surfaces as an unhandled rejection.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type LieutenantSalientUncoveredEvent } from '../citysim/events/city-event-bus';
import { ExceptionsRepository } from './exceptions.repository';

/** Subscribes to the LIEUTENANT_TICK's salient-uncovered event and emits an Exception card (Phase-14 first producer). */
@Injectable()
export class ExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(ExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: ExceptionsRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onLieutenantSalientUncovered((e) => {
      // The bus delivers synchronously + isolates listeners; the producer's own async work is contained here so a
      // transient DB fault can never bubble out as an unhandled rejection (it is logged and the queue stays consistent).
      this.handle(e).catch((err) =>
        this.logger.error(`exception producer failed (contained): ${err instanceof Error ? err.message : String(err)}`),
      );
    });
  }

  /** DEDUP then INSERT the event's card. At most one pending card per lieutenant (anti-flood while the signal persists). */
  private async handle(e: LieutenantSalientUncoveredEvent): Promise<void> {
    if (await this.repo.hasPendingForLieutenant(e.playerId, e.lieutenantId)) return; // already pending → skip.
    await this.repo.insert({
      player_id: e.playerId,
      lieutenant_id: e.lieutenantId,
      event_descriptor: e.card.event_descriptor,
      candidate_actions: e.card.candidate_actions,
      suggested_action: e.card.suggested_action,
      confidence: e.card.confidence,
      severity: e.card.severity,
      priority: e.card.priority,
      resolution_status: 'pending',
    });
  }
}

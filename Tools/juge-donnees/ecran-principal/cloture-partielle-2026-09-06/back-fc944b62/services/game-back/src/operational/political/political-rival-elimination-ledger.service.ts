// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C3 (rival_elimination_ledger
//             subscriber — "Wire the bus subscriber that appends to the ledger")
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §6.2a ("Build a
//             small subscriber -> a rival_elimination_ledger (player_id, game_minute) and derive '2+ in
//             6 months'")
//             Bus source: services/game-back/src/citysim/events/city-event-bus.ts:1327-1334,2353
//             (`RivalEliminatedEvent`, emitted by `RivalEliminationService.executeElimination` AFTER its
//             4-penalty SERIALIZABLE tx commits, C-cas §9.2 — 04b-B).
//             Subscriber pattern REUSE: services/game-back/src/operational/internal_affairs/ia-target.service.ts
//             (`onModuleInit` bus subscription, decision #2 — `.catch()`-contained async handler).
//             — 04e-A2 C3 — 2026-07-05
//
// `PoliticalRivalEliminationLedgerService` — the C3 bus subscriber that gives E-POL-11's "2+ rival
// eliminations in past 6 months" trigger half a REAL persisted source. `RivalEliminatedEvent` already
// fires on `CityEventBus` (04b-B, C-cas §9.2) — it was simply never persisted before this chunk. This
// is the FIRST subscriber for that event (ADDITIVE — no existing emit-side/consumer touched).
//
// Chain: `RivalEliminationService.executeElimination` (A) -> commits its 4-penalty tx -> emits
// `RivalEliminatedEvent` on the bus -> THIS service (B) subscribes in `onModuleInit` -> appends ONE
// `rival_elimination_ledger` row (migration 0112) via `PoliticalEventRepository.insertRivalElimination`.
// Bus-decoupled (no import of A from B, no circular dependency) — mirrors `IATargetService.onModuleInit`
// exactly (`ia-target.service.ts:147-164`).
//
// ASYNC / CONTAINED-FAILURE (the established convention): the handler is `async`, wrapped in
// `.catch()` so a DB failure here can NEVER crash the event-emitter loop or affect
// `executeElimination`'s own (already-committed, already-returned) HTTP response. Because the bus
// dispatch is synchronous but the handler's OWN body is async, the ledger row lands shortly AFTER
// the emitting HTTP call returns — E2E assertions poll for the row (the SAME pattern
// `ia-target.service.ts`'s own header doc documents for its `Tier3LawyerUsedEvent` subscriber).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { RivalEliminatedEvent } from '../../citysim/events/city-event-bus';
import type { RivalKey } from '../conflict/rival/rival-ai.types';
import { PoliticalEventRepository } from './political-event.repository';

@Injectable()
export class PoliticalRivalEliminationLedgerService implements OnModuleInit {
  private readonly logger = new Logger(PoliticalRivalEliminationLedgerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: PoliticalEventRepository,
  ) {}

  /**
   * `onModuleInit` — subscribe to `RivalEliminatedEvent` (design §6.2a). The FIRST subscriber for
   * this event channel — ADDITIVE, no existing `onRivalEliminated` consumer exists yet.
   */
  onModuleInit(): void {
    this.bus.onRivalEliminated((event: RivalEliminatedEvent) => {
      this.handleRivalEliminated(event).catch((err: unknown) =>
        this.logger.error(
          `PoliticalRivalEliminationLedgerService RivalEliminated handler failed (contained): ` +
            `playerId=${event.playerId} rivalKey=${event.rivalKey} gameMinute=${event.gameMinute} ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'PoliticalRivalEliminationLedgerService subscribed to RivalEliminatedEvent (design §6.2a). ' +
        'Chain: RivalEliminationService.executeElimination(A) -> RivalEliminatedEvent(bus) -> ' +
        'insertRivalElimination(B) -> rival_elimination_ledger row (migration 0112, E-POL-11 ' +
        '"2+ in 6mo" trigger source). ADDITIVE — no existing subscriber modified. C3.',
    );
  }

  /**
   * `handleRivalEliminated` — bus subscriber body. Appends ONE `rival_elimination_ledger` row per
   * REAL elimination event. Idempotency is NOT required here (unlike the calendar tick's per-day
   * claim): each `RivalEliminatedEvent` fires exactly once per REAL 4-penalty tx commit
   * (`RivalEliminationService` is itself idempotent at the tx layer) — this ledger simply records
   * every one, a true append-only history (the rolling-window COUNT, not a boolean flag, is what
   * E-POL-11's predicate reads).
   *
   * @internal — called only via the `onModuleInit` bus subscription (never invoked directly by test
   * routes; the E2E proof drives the REAL emit path via `/v1/_test/combat/drive-elimination`, which
   * calls the SAME `RivalEliminationService.executeElimination` production method).
   */
  private async handleRivalEliminated(event: RivalEliminatedEvent): Promise<void> {
    // `RivalEliminatedEvent.rivalKey` is typed as a plain `string` on the bus (a deliberately wide
    // event-payload type — city-event-bus.ts:1330), but the ONLY producer (`RivalEliminationService.
    // executeElimination`, `rival-elimination.service.ts:163`) always emits a genuine `RivalKey`
    // union member (its own `EliminationInput.rivalKey: RivalKey` field) — never an arbitrary string.
    await this.repo.insertRivalElimination(
      event.playerId,
      event.rivalKey as RivalKey,
      event.gameMinute,
      event.compounding_penalty_bucket,
    );
  }
}

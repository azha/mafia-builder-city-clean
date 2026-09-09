// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C5 (the producer — subscribe
//             EquipmentFailedEvent → dedup-gate → insert the 4-candidate card via the EXISTING spine insert
//             path) + docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (Exception-card
//             integration) + seam table row 1 (the exceptions/ ADDITIVE wire-in). Mirrors
//             `raid-exception-producer.service.ts` verbatim (OnModuleInit + `CityEventBus` subscribe + the
//             `.catch`-contained async — the bus isolates listeners so a transient DB fault never bubbles as an
//             unhandled rejection).
//             — 04f-A C5 — 2026-07-10

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type EquipmentFailedEvent } from '../citysim/events/city-event-bus';
import { EquipmentFailureCardService } from './equipment-failure-card.service';

/** Subscribes to `EquipmentFailedEvent` (the C4 producer-only event) and raises the 4-option equipment-failure
 *  repair card (design §6). SINGLY-registered in `ExceptionsModule` (unlike `EquipmentFailureCardService`,
 *  which duplicate-registers safely — see that file's header comment): a SECOND `OnModuleInit` subscription
 *  here would double-fire `handle()` on every fresh failure and could double-insert a card. */
@Injectable()
export class EquipmentFailureExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(EquipmentFailureExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly cards: EquipmentFailureCardService,
  ) {}

  onModuleInit(): void {
    this.bus.onEquipmentFailed((e) => {
      // The bus delivers synchronously + isolates listeners; the producer's own async work is .catch-contained so a
      // transient DB fault can never bubble as an unhandled rejection (logged; the queue stays consistent).
      this.handle(e).catch((err) =>
        this.logger.error(
          `equipment-failure exception producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  /** Dedup-gate → insert the 4-option card for the failed building (`EquipmentFailureCardService.
   *  raiseCardIfAbsent`, the SAME method the D4 periodic re-emission sweep calls). */
  private async handle(e: EquipmentFailedEvent): Promise<void> {
    await this.cards.raiseCardIfAbsent(e.playerId, e.buildingId);
  }
}

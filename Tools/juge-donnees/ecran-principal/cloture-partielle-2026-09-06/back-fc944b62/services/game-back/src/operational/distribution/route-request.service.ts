// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 4 (C4)
//             DD-ROUTE-REQUEST — the producer: write the durable route_request row AND emit
//             RouteRequestEvent (OQ-RR1).
//             — System 9c C4 — 2026-06-23

import { Injectable } from '@nestjs/common';

import { RouteRequestRepository } from './route-request.repository';
import { CityEventBus } from '../../citysim/events/city-event-bus';

/**
 * `RouteRequestService` — the DD-ROUTE-REQUEST producer (C4).
 *
 * `enqueueAndEmit` is the **single** entry-point for enqueuing a shipment request:
 *   1. Writes the durable `route_request` row (status='pending', created_at_tick=gameMinute).
 *   2. Emits the `RouteRequestEvent` on the CityEventBus.
 *
 * The bus event triggers the C5 `CoordinatorExecutionService.onRouteRequest` subscriber, which
 * evaluates the hub's coordinator script and fulfills the request.
 *
 * **OQ-RR1** — the durable row is the receipt, the bus event is the trigger. Both are written
 * atomically in `enqueueAndEmit` (the DB write first, then the emit — so the subscriber sees
 * the row as 'pending' and can flip it).
 *
 * **DETERMINISM (C4):** no `Math.random`, no `Date.now`. `gameMinute` is always `ctx.gameMinute`
 * (the game-time scalar, not wall-clock). The emit is in-process (synchronous delivery on the bus).
 *
 * R2.2: this service is server-only. The player surface is banded (C9 projection).
 */
@Injectable()
export class RouteRequestService {
  constructor(
    private readonly routeRequestRepo: RouteRequestRepository,
    private readonly cityEventBus: CityEventBus,
  ) {}

  /**
   * Enqueue a route request: write the durable row AND emit the `RouteRequestEvent` (OQ-RR1).
   *
   * @param playerId         - The player who owns the hub.
   * @param hubId            - The distribution_hub building_id (soft-ref).
   * @param input.targetBuildingId  - Optional destination (null = coordinator picks via route-selector).
   * @param input.cargoHintGrams    - Optional cargo hint (null = coordinator uses its default).
   * @param gameMinute       - The current game-minute (ctx.gameMinute; NEVER Date.now()).
   * @returns `{ requestId }` — the enqueued request's stable identity.
   */
  async enqueueAndEmit(
    playerId: string,
    hubId: string,
    input: { targetBuildingId?: string | null; cargoHintGrams?: number | null },
    gameMinute: number,
  ): Promise<{ requestId: string }> {
    // 1. Write the durable row (the receipt)
    const { requestId } = await this.routeRequestRepo.insertPending(
      playerId,
      hubId,
      input.targetBuildingId,
      input.cargoHintGrams,
      gameMinute,
    );

    // 2. Emit the bus event (the trigger for the C5 coordinator subscriber)
    // The emit is in-process (synchronous listeners on the CityEventBus).
    // The subscriber sees the row as 'pending' (the DB write already committed above).
    this.cityEventBus.emitRouteRequest({
      type:       'route_request',
      playerId,
      hubId,
      gameMinute,
    });

    return { requestId };
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 4 (C4)
//             DD-ROUTE-REQUEST — route_request table CRUD (insertPending / readPendingForHubOldestFirst
//             / markFulfilled / markCancelled).
//             — System 9c C4 — 2026-06-23

import { Inject, Injectable } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { routeRequest } from '../../db/schema/operational_chain';
import type { RouteRequestRow } from '../../db/schema/operational_chain';

/**
 * `RouteRequestRepository` — Drizzle CRUD over the `route_request` table.
 *
 * Provides the 4 operations the DD-ROUTE-REQUEST mechanic needs (C4):
 *   - `insertPending`                 — enqueue a new request
 *   - `readPendingForHubOldestFirst`  — drain oldest-first per OQ-T3
 *   - `markFulfilled`                 — pending → fulfilled (idempotence guard for C5)
 *   - `markCancelled`                 — pending → cancelled (reserved for future sweep)
 *
 * DETERMINISM (C4): no `Math.random`, no `Date.now`. `created_at_tick` is passed in
 * from the caller's `ctx.gameMinute` (always game-time, never wall-clock).
 *
 * R2.2: this repository is server-only. The player-facing surface is banded (C9 projection).
 */
@Injectable()
export class RouteRequestRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Insert a new `route_request` row with `status='pending'`.
   *
   * @param playerId          - Player who owns the hub.
   * @param hubId             - The distribution_hub building_id (soft-ref — NOT FK).
   * @param targetBuildingId  - Optional destination building (soft-ref; null = coordinator picks).
   * @param cargoHintGrams    - Optional cargo hint in grams (null = coordinator default).
   * @param createdAtTick     - Game-minute of enqueue (ctx.gameMinute; never Date.now).
   * @returns `{ requestId }` — the new request's PK.
   */
  async insertPending(
    playerId: string,
    hubId: string,
    targetBuildingId: string | null | undefined,
    cargoHintGrams: number | null | undefined,
    createdAtTick: number,
  ): Promise<{ requestId: string }> {
    const [row] = await this.db
      .insert(routeRequest)
      .values({
        player_id:          playerId,
        hub_id:             hubId,
        target_building_id: targetBuildingId ?? null,
        cargo_hint_grams:   cargoHintGrams ?? null,
        status:             'pending',
        created_at_tick:    BigInt(createdAtTick),
      })
      .returning({ request_id: routeRequest.request_id });

    return { requestId: row.request_id };
  }

  /**
   * Read all pending `route_request` rows for a hub, oldest-first by `(created_at_tick, request_id)`.
   * This is the deterministic drain order (OQ-T3).
   *
   * @param playerId - The requesting player.
   * @param hubId    - The hub's building_id.
   * @returns An ordered list of pending rows.
   */
  async readPendingForHubOldestFirst(playerId: string, hubId: string): Promise<RouteRequestRow[]> {
    return this.db
      .select()
      .from(routeRequest)
      .where(
        and(
          eq(routeRequest.player_id, playerId),
          eq(routeRequest.hub_id, hubId),
          eq(routeRequest.status, 'pending'),
        ),
      )
      .orderBy(asc(routeRequest.created_at_tick), asc(routeRequest.request_id));
  }

  /**
   * Read a single `route_request` row by its PK (for test probe routes).
   */
  async readById(requestId: string): Promise<RouteRequestRow | null> {
    const rows = await this.db
      .select()
      .from(routeRequest)
      .where(eq(routeRequest.request_id, requestId));
    return rows[0] ?? null;
  }

  /**
   * Flip a `route_request` status `pending → fulfilled`.
   * No-op if the row is already fulfilled or cancelled (idempotence guard).
   *
   * @param requestId - The request's PK.
   */
  async markFulfilled(requestId: string): Promise<void> {
    await this.db
      .update(routeRequest)
      .set({ status: 'fulfilled' })
      .where(and(eq(routeRequest.request_id, requestId), eq(routeRequest.status, 'pending')));
  }

  /**
   * Flip a `route_request` status `pending → cancelled`.
   * No-op if the row is already fulfilled or cancelled (idempotence guard).
   *
   * @param requestId - The request's PK.
   */
  async markCancelled(requestId: string): Promise<void> {
    await this.db
      .update(routeRequest)
      .set({ status: 'cancelled' })
      .where(and(eq(routeRequest.request_id, requestId), eq(routeRequest.status, 'pending')));
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 5 (C5)
//             DD-COORD-TRIGGER — event-driven coordinator execution (RouteRequestEvent → resolve → apply).
//             System 9c C5 — 2026-06-23
//
// `CoordinatorExecutionService` — the DD-COORD-TRIGGER event-driven executor.
//
// Subscribes to RouteRequestEvent via CityEventBus.onRouteRequest (at boot via OnApplicationBootstrap).
// On receipt of a RouteRequestEvent:
//   1. Loads the hub's Courier-coordinator: the LOGISTICS lieutenant with assigned_building_id = event.hubId,
//      mode='delegated', granted_role='executor', valid script.
//   2. If no coordinator exists for the hub → no-op (logged).
//   3. Builds the signal snapshot via LogisticsBindingService.buildSnapshot.
//      (The binding populates `events.shipment_pending = true` when a pending route_request exists — the
//       RouteRequestEvent guarantees at least one pending request, so the coordinator's script can match on it.)
//   4. Resolves via DslExecutorService.resolve(ir, snapshot).
//   5. Applies via LogisticsBindingService.applyResolvedAction.
//   6. Flips ALL pending route_request rows for this hub to 'fulfilled' via RouteRequestRepository.markFulfilled.
//      (IDEMPOTENT: markFulfilled only updates pending rows — no-op if already fulfilled.)
//
// DETERMINISM (C4): NO Math.random, NO Date.now. The DSL resolution is pure (the executor is a pure function
// of (IR, snapshot); the args are static IR; the queue drains oldest-first by (created_at_tick, request_id)).
// The markFulfilled idempotence guard ensures 2× back-to-back same event → exactly one dispatch (OQ-T3).
//
// ISOLATION: each RouteRequestEvent is handled in its own async task (fire-and-forget). An error on one event
// is logged and contained — it does NOT affect the next event (per-event isolation, mirrors the tick's
// per-lieutenant isolation pattern).
//
// CIRCULAR DEP RESOLUTION (System 9c C5): LieutenantModule ALREADY imports DistributionModule, so
// DistributionModule CANNOT import LieutenantModule (circular). CoordinatorExecutionService is provided in
// DistributionModule and directly declares LieutenantRepository + LogisticsBindingService as its own providers
// (they are greenfield-direct, NOT via LieutenantModule). This mirrors the CourierInterceptionService precedent
// in DistributionModule (lines 164-171 of distribution.module.ts).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { RouteRequestEvent } from '../../citysim/events/city-event-bus';
import { DslExecutorService } from '../../dsl/executor.service';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import { LogisticsBindingService } from '../lieutenant/logistics-binding';
import { RouteRequestRepository } from './route-request.repository';
import type { DelegationLieutenant } from '../lieutenant/archetype-binding';
import { archetypeForRoleId } from '../lieutenant/lieutenant-archetype';
import type { CompiledScript } from '../../dsl/ir';

/**
 * `CoordinatorExecutionService` — the DD-COORD-TRIGGER event-driven executor (System 9c C5).
 *
 * Subscribes to `RouteRequestEvent` on boot; on receipt, loads the hub's Courier-coordinator,
 * builds its snapshot, resolves its script, applies the resolved action, and flips the pending
 * `route_request` status to 'fulfilled'. Fully deterministic + idempotent.
 */
@Injectable()
export class CoordinatorExecutionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CoordinatorExecutionService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly executor: DslExecutorService,
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly logisticsBinding: LogisticsBindingService,
    private readonly routeRequestRepo: RouteRequestRepository,
  ) {}

  /** Subscribe to RouteRequestEvent at boot. */
  onApplicationBootstrap(): void {
    this.bus.onRouteRequest((event: RouteRequestEvent) => {
      // Fire-and-forget per-event; errors are contained per-event (logged, not thrown).
      this.handleRouteRequest(event).catch((err) => {
        this.logger.error(
          `CoordinatorExecutionService: RouteRequestEvent for hub=${event.hubId} player=${event.playerId} ` +
            `gm=${event.gameMinute} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log('CoordinatorExecutionService: subscribed to RouteRequestEvent (DD-COORD-TRIGGER, System 9c C5).');
  }

  /**
   * Public trigger method — allows test routes to directly invoke the coordinator execution for a hub,
   * without having to wait for the async fire-and-forget in the bus subscriber. Used by the
   * `POST /v1/_test/coordinator/fire-request` route in DistributionTestController.
   * DETERMINISTIC. NO Math.random, NO Date.now.
   */
  async triggerForHub(playerId: string, hubId: string, gameMinute: number): Promise<void> {
    await this.handleRouteRequest({ type: 'route_request', playerId, hubId, gameMinute });
  }

  private async handleRouteRequest(event: RouteRequestEvent): Promise<void> {
    const { playerId, hubId, gameMinute } = event;

    // (1) Load the hub's coordinator lieutenant (LOGISTICS, delegated, executor, valid script).
    const lt = await this.lieutenantRepo.findDelegatedByAssignedBuilding(playerId, hubId);
    if (!lt) {
      this.logger.debug(
        `CoordinatorExecutionService: no coordinator for hub=${hubId} player=${playerId} — skipping (no-op).`,
      );
      return;
    }

    // Guard: must be LOGISTICS archetype (role_id=6 — LOGISTICS_ROLE_ID from lieutenant-archetype.ts).
    const roleArchetype = archetypeForRoleId(lt.role_id);
    if (roleArchetype !== 'LOGISTICS') {
      this.logger.debug(
        `CoordinatorExecutionService: lieutenant=${lt.lieutenant_id} for hub=${hubId} is not LOGISTICS ` +
          `(role_id=${lt.role_id}, archetype=${roleArchetype ?? 'null'}) — skipping.`,
      );
      return;
    }

    // (2) Read pending route_requests for this hub BEFORE building the snapshot.
    // This is the idempotence guard: if there are no pending requests (already fulfilled or none enqueued),
    // the event is stale — no-op. The pending→fulfilled status flip IS the guard (OQ-T3): a re-fired event
    // for an already-fulfilled request finds an empty pending queue and exits here without dispatching.
    const pending = await this.routeRequestRepo.readPendingForHubOldestFirst(playerId, hubId);
    if (pending.length === 0) {
      this.logger.debug(
        `CoordinatorExecutionService: hub=${hubId} player=${playerId} — no pending requests (already fulfilled or stale event) → no-op.`,
      );
      return;
    }

    // Build the DelegationLieutenant shape the binding expects.
    const bindingRow: DelegationLieutenant = {
      lieutenant_id: lt.lieutenant_id,
      assigned_building_id: lt.assigned_building_id,
      target_building_id: lt.target_building_id,
      role_archetype: roleArchetype,
      delegation_paused: lt.delegation_paused,
      tenure_score: lt.tenure_score,
      rules: lt.rules,
    };

    // (3) Build snapshot (populates `events.shipment_pending = true` when pending requests exist — OQ-A5).
    const snapshot = await this.logisticsBinding.buildSnapshot(playerId, bindingRow);

    // (4) System 9c C6 — multi-action evaluation (DD-COORD-GRAMMAR / DD-COORD-CONFIG):
    //   Reset the per-hub transient config BEFORE processing any rules (OQ-A6 — each fire-request
    //   evaluation starts from the canonical defaults: stance='balanced', vehicle='foot', ephemeral=false).
    //   Then resolve ALL matching rules in priority order via `resolveAll` (ADDITIVE — the tick-driven
    //   LOGISTICS path still uses the single-action `resolve`; only the coordinator path uses `resolveAll`).
    //
    //   Processing loop (C6 multi-rule semantics):
    //     - SET_STANCE / TOGGLE_EPHEMERAL: config-mutation side effects → apply (returns 'TAKEN') → continue
    //       to the next rule (these are NOT terminal dispatch actions).
    //     - EXECUTE_DEFAULT / DISPATCH_COURIER: the terminal dispatch action → apply, set finalOutcome, break.
    //     - PAUSE_OPS / REQUEST_PLAYER_INPUT / NONE: non-dispatching terminal → break (no dispatch).
    //
    //   DETERMINISTIC: resolveAll is a pure function of (IR, snapshot); the ordering is priority-desc then
    //   index-asc (same tie-break as `resolve`). NO Math.random, NO Date.now.
    this.logisticsBinding.resetHubConfig();
    const allActions = this.executor.resolveAll(lt.rules as CompiledScript, snapshot);

    // (5) Apply: iterate all matched actions in priority order.
    let finalAction = allActions[0] ?? { kind: 'NONE' as const };
    let finalOutcome: 'TAKEN' | 'NOOP' = 'NOOP';
    for (const action of allActions) {
      const outcome = await this.logisticsBinding.applyResolvedAction(playerId, bindingRow, action, gameMinute);
      if (action.kind === 'SET_STANCE' || action.kind === 'TOGGLE_EPHEMERAL') {
        // Config-mutation side effect: continue to the next rule (not terminal).
        continue;
      }
      // Terminal action: EXECUTE_DEFAULT / DISPATCH_COURIER dispatch, or PAUSE_OPS / RPI / NONE stop.
      finalAction = action;
      finalOutcome = outcome;
      break;
    }
    const outcome = finalOutcome;

    // (6) Conditionally flip pending route_requests to 'fulfilled' — ONLY when the dispatch was 'TAKEN'.
    // When outcome is 'NOOP' (over-cap / no dispatch), leave the request 'pending' for the next tick
    // (§3.4/§3.6: a benign-409 over-cap leaves the route_request pending for retry).
    // The markFulfilled idempotence guard (WHERE status='pending') ensures a re-fired event on an
    // already-fulfilled request is always a no-op — the double-event idempotence invariant is preserved
    // regardless of whether we reach this branch.
    if (outcome === 'TAKEN') {
      for (const req of pending) {
        await this.routeRequestRepo.markFulfilled(req.request_id);
      }
    }

    this.logger.debug(
      `CoordinatorExecutionService: hub=${hubId} player=${playerId} gm=${gameMinute} → ` +
        `action=${finalAction.kind} outcome=${outcome}, ${outcome === 'TAKEN' ? `fulfilled ${pending.length} request(s)` : 'left pending (NOOP)'}.`,
    );
  }
}

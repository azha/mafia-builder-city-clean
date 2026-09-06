// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("les 5 NEW events ...
//             ADDITIVE one-line emits aux sites du verbe ... + annealing subscribers, listener-isolated").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.2 (the 5 LIVE
//             `ChangeType` → subgraph table, verbatim) + §3.4 (the ★ coexist-disjoint reconciliation —
//             lieutenant-scoped changes anneal the building d'affectation, never a lieutenant column).
//             P3-E C4 flip: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §3.2
//             (BUILDING_DECOMMISSION — the decommission verb's OWN annealing trigger on EVERY
//             route-adjacent neighbor, `NodeDecommissionedEvent`'s embedded `neighborBuildingIds`; a
//             damaged/seized neighbor is annealed too — it belongs to the ★#1 friction périmètre).
//             Pattern (bus subscribe + isolation): `core_loops/cue_stack/cue-stack-disruption.service.ts`
//             (`onModuleInit` subscribe + the `.handle(e).catch(err => logger.error(...))`-contained async
//             shape — the SAME belt-and-suspenders convention every subscriber in this codebase follows,
//             ON TOP OF the bus's own `dispatch()` per-listener try/catch isolation).
//             — P3-D C6 — 2026-07-14 / P3-E C4 (NodeDecommissionedEvent handler) — 2026-07-17
//
// `AnnealingInitiationSubscriberService` — subscribes to ALL 6 LIVE `ChangeType` bus events (REUSE, zero
// producer's OWN business logic touched beyond the ONE additive emit line each verb site now carries) and
// calls `AnnealingService.initiateOrCompound` for EVERY building in that event's "affected subgraph" (design
// §9.2 table):
//   - `RouteCreatedEvent`/`RouteRebuiltEvent` → origin AND destination (2 calls each).
//   - `LieutenantReassignedEvent` → the OLD building (if non-null) AND the NEW building (§3.4 — "ancien +
//     nouveau" transposed to the real geography; a null old building, e.g. a never-before-assigned
//     lieutenant, contributes NOTHING to anneal — there was no prior subgraph).
//   - `HireCompletedEvent` → the newly-hired lieutenant's assigned building (1 call).
//   - `ScriptAttachedEvent` → the lieutenant's CURRENT building (1 call; `null` → nothing to anneal).
//   - `NodeDecommissionedEvent` (P3-E C4) → EVERY embedded `neighborBuildingIds` entry (N calls — the
//     decommission tx already computed this subgraph BEFORE severing routes, §3.2; this subscriber never
//     re-queries a state THIS SAME verb already mutated, 0-race by construction).
// Each `initiateOrCompound` call is independent (a DIFFERENT `(player_id, building_id)` PK row for the
// 2-building events, or N independent rows for the decommission's own neighbor list) — sequential `await`
// here only for deterministic ordering in logs, never for correctness (no shared lock between calls).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
  CityEventBus,
  type HireCompletedEvent,
  type LieutenantReassignedEvent,
  type NodeDecommissionedEvent,
  type RouteCreatedEvent,
  type RouteRebuiltEvent,
  type ScriptAttachedEvent,
} from '../../citysim/events/city-event-bus';
import { AnnealingService } from './annealing.service';

@Injectable()
export class AnnealingInitiationSubscriberService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnnealingInitiationSubscriberService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly annealing: AnnealingService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onRouteCreated((e: RouteCreatedEvent) => {
      this.handleRouteCreated(e).catch((err) =>
        this.logger.error(`route_created annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onRouteRebuilt((e: RouteRebuiltEvent) => {
      this.handleRouteRebuilt(e).catch((err) =>
        this.logger.error(`route_rebuilt annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onLieutenantReassigned((e: LieutenantReassignedEvent) => {
      this.handleLieutenantReassigned(e).catch((err) =>
        this.logger.error(`lieutenant_reassigned annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onHireCompleted((e: HireCompletedEvent) => {
      this.handleHireCompleted(e).catch((err) =>
        this.logger.error(`hire_completed annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onScriptAttached((e: ScriptAttachedEvent) => {
      this.handleScriptAttached(e).catch((err) =>
        this.logger.error(`script_attached annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onNodeDecommissioned((e: NodeDecommissionedEvent) => {
      this.handleNodeDecommissioned(e).catch((err) =>
        this.logger.error(`node_decommissioned annealing handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  private async handleRouteCreated(e: RouteCreatedEvent): Promise<void> {
    await this.annealing.initiateOrCompound(e.playerId, e.originBuildingId, 'ROUTE_CREATED', e.routeId, e.gameMinute);
    await this.annealing.initiateOrCompound(e.playerId, e.destinationBuildingId, 'ROUTE_CREATED', e.routeId, e.gameMinute);
  }

  private async handleRouteRebuilt(e: RouteRebuiltEvent): Promise<void> {
    await this.annealing.initiateOrCompound(e.playerId, e.originBuildingId, 'ROUTE_REBUILT', e.routeId, e.gameMinute);
    await this.annealing.initiateOrCompound(e.playerId, e.destinationBuildingId, 'ROUTE_REBUILT', e.routeId, e.gameMinute);
  }

  private async handleLieutenantReassigned(e: LieutenantReassignedEvent): Promise<void> {
    if (e.oldBuildingId) {
      await this.annealing.initiateOrCompound(e.playerId, e.oldBuildingId, 'LIEUTENANT_REASSIGNED', e.lieutenantId, e.gameMinute);
    }
    await this.annealing.initiateOrCompound(e.playerId, e.newBuildingId, 'LIEUTENANT_REASSIGNED', e.lieutenantId, e.gameMinute);
  }

  private async handleHireCompleted(e: HireCompletedEvent): Promise<void> {
    await this.annealing.initiateOrCompound(e.playerId, e.assignedBuildingId, 'NEW_HIRE', e.lieutenantId, e.gameMinute);
  }

  private async handleScriptAttached(e: ScriptAttachedEvent): Promise<void> {
    if (!e.buildingId) return; // an unassigned lieutenant — nothing to anneal.
    await this.annealing.initiateOrCompound(e.playerId, e.buildingId, 'MAJOR_SCRIPT_EDIT', e.lieutenantId, e.gameMinute);
  }

  /**
   * P3-E C4 (design §3.2) — anneal EVERY route-adjacent neighbor of the decommissioned node. The subgraph
   * is EMBEDDED on the event (computed inside the decommission tx, before its routes were severed) — a
   * damaged/seized neighbor is annealed too (it is still a member of the ★#1 friction périmètre, ruling
   * ★#1); a 'demolished' neighbor is impossible by construction (its OWN routes were retired at ITS OWN
   * decommission, design §3.2). `ref` = the decommissioned building's id (mirrors `RouteCreatedEvent`'s
   * own "the causing entity's id" convention — `e.routeId`/`e.lieutenantId` there, `e.buildingId` here).
   */
  private async handleNodeDecommissioned(e: NodeDecommissionedEvent): Promise<void> {
    for (const neighborBuildingId of e.neighborBuildingIds) {
      await this.annealing.initiateOrCompound(e.playerId, neighborBuildingId, 'BUILDING_DECOMMISSION', e.buildingId, e.gameMinute);
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C4 ("souscriptions bus
//             HeatEscalationEvent+BuildingRaidedEvent → slots ciblant le building → failed_disrupted I8 +
//             cascade idem").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §7 ("Souscriptions bus
//             (REUSE, aucun producer modifié): HeatEscalationEvent + BuildingRaidedEvent. Pendant qu'un
//             stack est executing: un événement sur le building B → tous les slots NON-done dont target_ref
//             résout vers B (directement, ou via la route dont B est origine/destination pour
//             DISTRIBUTION_RUN) passent failed_disrupted exactly-once I8 ; leurs dépendants échouent en
//             cascade au fil des firings (§6.2) ; cartes cascade next-session idem. Déterministe.").
//             Decisions: §1.6 D6 (disruption heat déterministe, exactly-once, sur signaux discrets — jamais
//             l'injection bufferisée `HeatInjectionEvent`).
//             Pattern (bus subscribe + isolation): `exceptions/heat-pressure-exception-producer.service.ts` /
//             `exceptions/raid-exception-producer.service.ts` (`onModuleInit` subscribe + the
//             `.handle(e).catch(err => logger.error(...))`-contained async shape — the bus's OWN
//             `dispatch()` isolates each listener too, this is the belt-and-suspenders convention every
//             subscriber in this codebase follows).
//             Pattern (public method BOTH the real subscriber AND a `_test` route call — Lesson #3):
//             `cue-stack-execution-tick.service.ts`'s own `runTick` / `maintenance-advance.service.ts`'s own
//             `OnApplicationBootstrap` + one public tick method shape — `disruptForBuildingEvent` below is
//             called identically by the REAL `onHeatEscalation`/`onBuildingRaided` bus handlers and by
//             `CueStackTestController`'s `_test/cue-stack/disrupt-building` route (zero live-vs-test
//             divergence — the SAME method, never a parallel test-only reimplementation).
//             — P3-D C4 — 2026-07-14
//
// `CueStackDisruptionService` — subscribes to `HeatEscalationEvent`/`BuildingRaidedEvent` (REUSE, zero
// producer touched — both are ALREADY emitted by System Heat / RaidExecutionService for entirely different
// reasons; this is a THIRD, independent, isolated consumer of each). `disruptForBuildingEvent(playerId,
// buildingId, gameMinute, source)` is the WHOLE algorithm (design §7):
//   1. The player's ONE non-terminal stack (I1) — if absent, or not `state='executing'` ("pendant qu'un
//      stack est executing", design §7 — a `committed`-but-not-yet-promoted stack is UNAFFECTED), 0-op.
//   2. Every slot whose `status` is STILL `'pending'` (not yet fired — "NON-done" realized as pre-firing in
//      this schema, DD-SLOT-JSONB: a slot only ever leaves 'pending' AT its own firing) whose `target_ref`
//      resolves to `buildingId`: DIRECTLY (`target_ref.kind==='building'`) or, for `DISTRIBUTION_RUN`
//      (`target_ref.kind==='route'`), via `RouteLifecycleRepository.readRoute` — origin OR destination
//      matching `buildingId`. A building NOT targeted by any pending slot → the candidate list is empty →
//      the atomic UPDATE below is skipped entirely (0 write) — the "escalation on a NON-targeted building →
//      ZERO effect" determinism proof (design §7/plan §C4 falsifiable).
//   3. `CueStackExecutionRepository.disruptSlots` — a `SELECT ... FOR UPDATE`-then-`UPDATE` atomic
//      statement (I8: see that method's own header) that ALSO reports `newlyDisruptedSlotIds` — the
//      SUBSET of candidates THIS SPECIFIC call flipped (true serialization: a genuinely concurrent second
//      caller's own row-lock wait means it observes the FIRST caller's write and computes an EMPTY
//      `newlyDisruptedSlotIds` of its own).
//   4. For each `slotId` in `newlyDisruptedSlotIds` ONLY (never "is the final status failed_disrupted",
//      which would be true for every concurrent caller alike): emit `SlotFailedEvent` (reason
//      `'failed_disrupted'`) + raise the cascade card (`CueCascadeExceptionProducer.raiseIfClear` — its OWN
//      dedup is the SEPARATE "double tick → one cascade card" backstop, independent of this list). The
//      tick's OWN dependency check (§6.1, unchanged since C3) is what makes the KNOCK-ON cascade to this
//      slot's dependents "au fil des firings" — nothing extra is needed here (DD-CASCADE-LAZY, the SAME
//      "falls out for free" property C3's own header documents for the `failed_collision` path).

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type BuildingRaidedEvent, type HeatEscalationEvent } from '../../citysim/events/city-event-bus';
import { RouteLifecycleRepository } from '../../operational/distribution/route-lifecycle.repository';
import { CueCascadeExceptionProducer } from './cue-cascade-exception-producer.service';
import { CueStackExecutionRepository } from './cue-stack-execution.repository';
import type { CueStackSlot, SlotOutcome } from './slot-type-executor.interface';

export type CueStackDisruptionSource = 'heat_escalation' | 'building_raided';

export interface CueStackDisruptionResult {
  readonly disruptedSlotIds: readonly string[];
}

@Injectable()
export class CueStackDisruptionService implements OnModuleInit {
  private readonly logger = new Logger(CueStackDisruptionService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly execRepo: CueStackExecutionRepository,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly cascadeProducer: CueCascadeExceptionProducer,
  ) {}

  onModuleInit(): void {
    this.bus.onHeatEscalation((e: HeatEscalationEvent) => {
      this.disruptForBuildingEvent(e.playerId, e.buildingId, e.gameMinute, 'heat_escalation').catch((err) =>
        this.logger.error(
          `heat-escalation disruption handler failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.bus.onBuildingRaided((e: BuildingRaidedEvent) => {
      this.disruptForBuildingEvent(e.playerId, e.buildingId, e.gameMinute, 'building_raided').catch((err) =>
        this.logger.error(
          `building-raided disruption handler failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  /**
   * The whole algorithm (see file header). Public so BOTH the real bus handlers above AND
   * `CueStackTestController`'s `_test/cue-stack/disrupt-building` route call the EXACT same method
   * (Lesson #3 — zero live-vs-test divergence; the ONLY thing the test route bypasses is the bus itself,
   * never the disruption logic).
   */
  async disruptForBuildingEvent(
    playerId: string,
    buildingId: string,
    gameMinute: number,
    source: CueStackDisruptionSource,
  ): Promise<CueStackDisruptionResult> {
    const row = await this.execRepo.findExecutableStack(playerId);
    if (!row || row.state !== 'executing') {
      return { disruptedSlotIds: [] }; // design §7: only "pendant qu'un stack est executing".
    }

    const slots = (row.slots as unknown as CueStackSlot[]) ?? [];
    const candidateIds: string[] = [];
    for (const slot of slots) {
      if (slot.status !== 'pending') continue; // already fired (done/failed_*) — never re-touched.
      if (await this.targetsBuilding(slot, buildingId)) {
        candidateIds.push(slot.slot_id);
      }
    }
    if (candidateIds.length === 0) {
      return { disruptedSlotIds: [] }; // determinism: a non-targeted building has ZERO effect.
    }

    const outcome: SlotOutcome = { status: 'failed_disrupted', detail: { disruptedBy: source, buildingId } };
    const written = await this.execRepo.disruptSlots(row.cue_stack_id, candidateIds, JSON.stringify(outcome));
    if (!written) {
      return { disruptedSlotIds: [] }; // race: no longer executing by the time the write ran.
    }

    // I8 — emit/raise ONLY for slot_ids THIS call itself flipped (`newlyDisruptedSlotIds`), never merely
    // "is the final status failed_disrupted" (which would be true for EVERY concurrent caller alike — see
    // `disruptSlots`'s own header for why that distinction matters).
    for (const slotId of written.newlyDisruptedSlotIds) {
      const after = written.slots.find((s) => s.slot_id === slotId);
      if (!after) continue; // defensive — should be unreachable (the slot_id came FROM this same slots array).
      this.bus.emitSlotFailed({
        type: 'slot_failed',
        playerId,
        cueStackId: row.cue_stack_id,
        slotId: after.slot_id,
        slotType: after.slot_type,
        reason: 'failed_disrupted',
        gameMinute,
      });
      await this.cascadeProducer.raiseIfClear(playerId, after);
    }
    return { disruptedSlotIds: written.newlyDisruptedSlotIds };
  }

  /** Does `slot.target_ref` resolve to `buildingId` — directly (`kind==='building'`), or via the route's
   *  own origin/destination for `DISTRIBUTION_RUN` (`kind==='route'`, design §7's own parenthetical)? Any
   *  OTHER `target_ref.kind` (`candidate` — `RECRUITMENT_STEP`) never resolves to a building at all. */
  private async targetsBuilding(slot: Pick<CueStackSlot, 'target_ref'>, buildingId: string): Promise<boolean> {
    if (slot.target_ref.kind === 'building') {
      return slot.target_ref.id === buildingId;
    }
    if (slot.target_ref.kind === 'route') {
      const route = await this.routeLifecycleRepo.readRoute(slot.target_ref.id);
      if (!route) return false; // the route was since deleted — same "no longer resolves" honesty the executor itself carries.
      return route.origin_building_id === buildingId || route.destination_building_id === buildingId;
    }
    return false;
  }
}

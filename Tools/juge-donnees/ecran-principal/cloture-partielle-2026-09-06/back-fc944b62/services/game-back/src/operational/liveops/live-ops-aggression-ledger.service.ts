// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C6 (the producer audit + bus
//             subscriber that gives E-LO-06's "4+ violent ops in 7 days" targeting half a REAL
//             persisted source)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.6
//             Bus source: services/game-back/src/citysim/events/city-event-bus.ts (`AssaultCascadeCompletedEvent`,
//             emitted by `ConflictOrchestratorService.recordAssaultCascade` AFTER its 5-layer
//             SERIALIZABLE §9.1 cascade tx commits, 04b-B C-cas).
//             Subscriber pattern REUSE: services/game-back/src/operational/political/political-rival-
//             elimination-ledger.service.ts (`onModuleInit` bus subscription, `.catch()`-contained
//             async handler — the 04e-A2 C3 precedent this file mirrors verbatim).
//             — 04e-B C6 — 2026-07-06
//
// `LiveOpsAggressionLedgerService` — the C6 bus subscriber that gives E-LO-06's "high recent
// aggression score (4+ violent ops in 7 days)" targeting half (catalogue.md :111) a REAL persisted
// source.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PRODUCER AUDIT (the C6 honesty call — decided, not fig-leafed)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Audited `services/game-back/src/citysim/events/city-event-bus.ts` for a real violent-ops signal on
// the shared city-event bus. Two candidates exist:
//   - `AssaultEvent` (`emitAssault`/`onAssault`) — grepped: `emitAssault(` is declared but NEVER CALLED
//     anywhere in the codebase. A dead channel — not a real producer.
//   - `AssaultCascadeCompletedEvent` (`emitAssaultCascadeCompleted`/`onAssaultCascadeCompleted`) — IS
//     emitted, by `ConflictOrchestratorService.recordAssaultCascade` (`conflict-orchestrator.service.ts`,
//     04b-B C-cas §9.1), a REAL production method: the genuine 5-layer SERIALIZABLE atomic cascade tx
//     (dedup + sandpile + maladaptive memory + adaptive skin + the C forward-slot), not a stub built for
//     this chunk.
//
// ⚠️ ANTI-PÉREMPTION (W6.1 C6, design §6 row 1): this paragraph used to assert that a `_test`-only
// route was `recordAssaultCascade`'s SOLE caller. That is no longer true, and a standing prose claim
// about "the only caller" is exactly the shape that goes stale — so this is written to name the
// concrete producer instead of re-asserting an absolute.
//
// `recordAssaultCascade` now has a genuine PRODUCTION caller: `CombatResolutionTickService`
// (NIGHTLY/13.5, `combat-resolution-tick.service.ts`, W6.1 C2) invokes it once per pending assault
// during the nightly resolution sweep — that is the real trigger the ledger row below now rides on
// in production. `POST /v1/_test/combat/drive-cascade` still exists (it backs
// `combat_cascade_atomic.spec.ts`'s own falsifiable and this file's own C6 E2E proof, run as the
// DIRECT-neighbor zero-regression check) but it is no longer the only path.
//
// `RivalEliminationService.executeElimination` is a SEPARATE method with its own, independently
// tracked wiring status. This file makes NO standing claim about it either way: whether it has a
// production caller is exactly what `combat_deferred_detectors.spec.ts`'s DF-1 detector asserts, on
// every run, against the live source — the detector cannot go stale the way a prose sentence just did.
//
// Chain: `ConflictOrchestratorService.recordAssaultCascade` (A, 04b-B) -> commits its 5-layer tx ->
// emits `AssaultCascadeCompletedEvent` on the bus -> THIS service (B) subscribes in `onModuleInit` ->
// appends ONE `live_ops_aggression_ledger` row (migration 0116). Bus-decoupled (no import of A from B,
// no circular dependency) — mirrors `PoliticalRivalEliminationLedgerService.onModuleInit` exactly.
//
// ASYNC / CONTAINED-FAILURE (the established convention): the handler is `async`, wrapped in `.catch()`
// so a DB failure here can NEVER crash the event-emitter loop or affect `recordAssaultCascade`'s own
// (already-committed, already-returned) HTTP response. The ledger row lands shortly AFTER the emitting
// HTTP call returns — E2E assertions poll for the row (the SAME pattern
// `political-rival-elimination-ledger.service.ts` documents for its own subscriber).
//
// `occurred_at` — written from `LiveOpsClockPort.now()` (DD-B3), NEVER an inline `Date.now()`.
// `AssaultCascadeCompletedEvent` itself carries only an in-game `gameMinute` (no real-world instant) —
// `occurred_at` is the REAL instant THIS subscriber received/processed the event, exactly mirroring how
// `live_ops_event_active.started_at` is written from the SAME clock port at INSERT time (migration 0114).

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { AssaultCascadeCompletedEvent } from '../../citysim/events/city-event-bus';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { liveOpsAggressionLedger } from '../../db/schema/live_ops_aggression_ledger';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';

@Injectable()
export class LiveOpsAggressionLedgerService implements OnModuleInit {
  private readonly logger = new Logger(LiveOpsAggressionLedgerService.name);

  constructor(
    private readonly bus: CityEventBus,
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * `onModuleInit` — subscribe to `AssaultCascadeCompletedEvent` (design §3.6). ADDITIVE — no existing
   * subscriber for this event channel is modified (other consumers of the SAME event, if any land
   * later, subscribe independently — `CityEventBus` supports multiple listeners per channel).
   */
  onModuleInit(): void {
    this.bus.onAssaultCascadeCompleted((event: AssaultCascadeCompletedEvent) => {
      this.handleAssaultCascadeCompleted(event).catch((err: unknown) =>
        this.logger.error(
          `LiveOpsAggressionLedgerService AssaultCascadeCompleted handler failed (contained): ` +
            `playerId=${event.playerId} rivalKey=${event.rivalKey} assaultEventId=${event.assaultEventId} ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'LiveOpsAggressionLedgerService subscribed to AssaultCascadeCompletedEvent (design §3.6). ' +
        'Chain: ConflictOrchestratorService.recordAssaultCascade(04b-B C-cas) -> AssaultCascadeCompletedEvent(bus) ' +
        '-> live_ops_aggression_ledger row (migration 0116, E-LO-06 "4+ violent ops/7d" AggressionScoreBucket ' +
        'source). ADDITIVE — no existing subscriber modified. C6.',
    );
  }

  /**
   * `handleAssaultCascadeCompleted` — bus subscriber body. Appends ONE `live_ops_aggression_ledger`
   * row per REAL `AssaultCascadeCompletedEvent`. Idempotency is NOT required here (mirrors
   * `PoliticalRivalEliminationLedgerService`'s own reasoning): the cascade's OWN Layer-0 dedup
   * (`assault_cascade_dedup`, keyed on `assaultEventId`) already guarantees the bus event fires at most
   * once per real assault — this ledger simply records every one, a true append-only history.
   *
   * @internal — called only via the `onModuleInit` bus subscription (never invoked directly by test
   * routes; the E2E proof drives the REAL emit path via `/v1/_test/combat/drive-cascade`, which calls
   * the SAME `ConflictOrchestratorService.recordAssaultCascade` production method).
   */
  private async handleAssaultCascadeCompleted(event: AssaultCascadeCompletedEvent): Promise<void> {
    await this.db.insert(liveOpsAggressionLedger).values({
      player_id: event.playerId,
      occurred_at: this.clock.now(), // DD-B3 — never an inline Date.now()/new Date().
    });
  }
}

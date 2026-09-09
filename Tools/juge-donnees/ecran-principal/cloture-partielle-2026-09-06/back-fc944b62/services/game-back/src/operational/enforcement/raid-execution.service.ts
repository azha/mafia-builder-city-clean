// IMPLEMENTS: docs/tech/04_city_simulation/system_4_patrol_doctrine.md §RaidPlan (block-level raid targeting — the
//             RaidPlannedEvent this service CONSUMES; System 4 is the canonical owner) +
//             docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the buffer-on-
//             event + flush-on-tick discipline this service mirrors — HeatPropagationService precedent) +
//             docs/tech/09_data_model/schema_operational_chain.md §7 (raid/repair surface — building_raid +
//             building_operational_state.structural_state, product_storage seizure) +
//             docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4/§6 (RaidExecutionService —
//             additive listener-isolated consumer of RaidPlannedEvent; couplings consumed, never reimplemented)
//             -- session:2026-06-04 (Phase 2b Task 1) --
//
// `RaidExecutionService` — the FIRST police-risk CONSEQUENCE vector (Phase-2b vector #1: building raid). It is an
// ADDITIVE, LISTENER-ISOLATED CONSUMER of the existing `RaidPlannedEvent` (emitted by System 4 Patrol Doctrine at the
// 12h precinct review — Phase 1). It does NOT roll raids itself / touch System 3/4 police-decision logic — it SUBSCRIBES
// to the event and applies the consequence (seize product + DAMAGED). Listener isolation is provided by the bus's
// per-listener try/catch in `dispatch` (city-event-bus.ts:630-641) — this handler is NOT re-wrapped (R: consume the
// guarantee, don't duplicate it).
//
// THE BUFFER-ON-EVENT + FLUSH-ON-TICK DISCIPLINE (the HeatPropagationService precedent — the critical determinism
// point): `CityEventBus.dispatch` invokes listeners SYNCHRONOUSLY and does NOT await them. If `onRaidPlanned` did
// `await db...` directly, the promise would FLOAT — the emitting tick wouldn't wait, and the E2E couldn't
// deterministically know when the raid finished (flaky). So:
//   - `onRaidPlanned` (the handler) is SYNCHRONOUS — it just BUFFERS the event in an in-memory per-player queue
//     (never a per-event DB write — the System-10/12 event-storm lesson Heat documents).
//   - This service registers as a `CitySimSystem` at {MINUTE, order 13 = RAID_EXECUTION} (a FREE slot after the
//     Phase-2 operational hooks at MINUTE/6..12 — checked against the SCHEDULE). Its `run()` DRAINS the buffer and
//     executes the seizures SET-BASED in a transaction.
//   - The E2E fires the raid test hook → advances 1 tick → the flush runs → asserts. (Exactly the heat-inject-hook →
//     advance → assert pattern.)
// This keeps a SINGLE code path (the test hook emits onto the bus, same as production System 4 would), deterministic,
// and consistent with the buffer/flush discipline.
//
// THE FLUSH (per player, each MINUTE tick): drain the buffered RaidPlannedEvents; for each, RESOLVE the player's
// operational PRODUCT-HOLDING buildings (lab/stash, structural_state='operational') on the raided block. No match →
// DRY RAID = no-op total (no building_raid row, no side-effect — the precinct's lossy belief targeted a block with
// nothing to seize). Match → EXECUTE the raid set-based in a transaction (seize product_storage → DAMAGED → insert
// building_raid, raided_at_tick = the current tick = ctx.gameMinute). Deterministic (NO RNG).
//
// IN-MEMORY STATE KEYED BY PLAYERID (the Heat/T10/T11 lesson — NOT entity-keyed): the buffered events are keyed by
// playerId; the queue is DRAINED each tick (consumed, never accumulating dead state). Server-truth working state
// (rebuilt empty on restart — the buffer/flush precedent; the PERSISTED truth is product_storage / building_raid).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus, type RaidPlannedEvent, type BuildingRaidedEvent } from '../../citysim/events/city-event-bus';
import { RaidRepository } from './raid.repository';
import { raidTunables } from './raid-tunables';

/** A buffered raid (the §Consommation accumulation — executed once at the next MINUTE flush, never per-event). */
interface BufferedRaid {
  districtId: number;
  targetBlockId: number;
}

@Injectable()
export class RaidExecutionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RaidExecutionService.name);

  /**
   * Per-player buffered RaidPlannedEvents, keyed by playerId (the Heat/T10/T11 lesson — NOT keyed by building/block at
   * the top level). DRAINED each MINUTE tick (the queue is consumed). Server-truth working state (rebuilt empty on
   * restart — the buffer/flush precedent; the PERSISTED truth is product_storage / building_raid).
   */
  private readonly buffered = new Map<string, BufferedRaid[]>();

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: RaidRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: subscription + registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.subscribeToRaidPlanned();
    this.registerCadence();
    this.logger.log(
      'RaidExecutionService registered at MINUTE/13 (RAID_EXECUTION) — SUBSCRIBES RaidPlannedEvent (System 4, ' +
        'additive listener-isolated consumer), BUFFERS each event synchronously (no per-event DB write — the Heat ' +
        'buffer/flush precedent), and on its MINUTE tick DRAINS the buffer + executes the seizures set-based: for the ' +
        "player's operational product-holding buildings (lab/stash) on each raided block, seizes product_storage → " +
        'structural_state=damaged → inserts a building_raid row. ADDITIVELY, on the SAME tick, it also seizes a band of ' +
        'held_cents from any operational money_holding on the block (Phase-5 vector #5a T5a — held drop + DAMAGED + a ' +
        'building_raid row, grams_seized=0; an independent leg, NO new tick). Dry raid (neither on the block) = no-op. ' +
        'CONSUMES System 4 (never reimplements raid-decision logic). Deterministic (NO RNG).',
    );
  }

  /**
   * Subscribe to RaidPlannedEvent (city-event-bus.ts onRaidPlanned). The handler is SYNCHRONOUS — it BUFFERS the event
   * in the per-player queue (never an awaited DB write — the floating-promise / event-storm hazard the service header
   * documents). The bus's per-listener try/catch already isolates this consumer (NOT re-wrapped here).
   */
  private subscribeToRaidPlanned(): void {
    this.bus.onRaidPlanned((e) => this.onRaidPlanned(e));
  }

  /** Register the MINUTE/13 = RAID_EXECUTION slot (the SAME registerSystem path Heat uses at MINUTE/4). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.RAID_EXECUTION,
      cadence: Cadence.MINUTE,
      order: 13,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the event handler (synchronous; BUFFER, never per-event DB write) ─────────────────

  /**
   * Buffer a RaidPlannedEvent for the next MINUTE flush (the §Consommation accumulation — SYNCHRONOUS, never an awaited
   * DB write). Carries only the qualitative identity (district + target block); the seizure is computed at flush time
   * against the freshest persisted state. The handler must NOT throw (the bus isolates it, but a clean buffer keeps
   * delivery to sibling consumers unaffected).
   */
  private onRaidPlanned(e: RaidPlannedEvent): void {
    const queue = this.buffered.get(e.playerId) ?? [];
    queue.push({ districtId: e.districtId, targetBlockId: e.targetBlockId });
    this.buffered.set(e.playerId, queue);
  }

  // ───────────────────────────── the registered MINUTE/13 tick ─────────────────────────────

  /**
   * {MINUTE, order 13} — DRAIN the player's buffered raids and EXECUTE each. ctx.gameMinute is the current in-game tick
   * (the raided_at_tick stamp — the same authoritative read the cook-advance/arrival hooks use). For each buffered raid:
   * resolve the player's operational product-holding buildings (lab/stash) on the raided block; no match → DRY RAID
   * (no-op total — no building_raid row, no side-effect); match → execute the seizure set-based in a transaction
   * (seize product_storage → DAMAGED → insert building_raid). Deterministic (NO RNG). Organically a no-op (no buffered
   * raid — the common case; the buffer fills only when System 4 plans a raid or the test hook emits one).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const drained = this.buffered.get(ctx.playerId);
    if (!drained || drained.length === 0) return; // no buffered raid → clean no-op.
    this.buffered.set(ctx.playerId, []); // DRAIN the buffer (consume the queue — never accumulate dead state).

    for (const raid of drained) {
      // PRODUCT-HOLDER LEG (vector #1): seize → DAMAGED → building_raid for the player's operational product-holders on
      // the block. Capture the buildings that ACTUALLY flipped operational→damaged (executeRaid's return) and emit a
      // BuildingRaidedEvent per one (Phase-16 — the raid-response producer seam; AFTER the seizure tx so the building is
      // genuinely damaged when the producer reads it).
      const targets = await this.repo.resolveTargetsOnBlock(ctx.playerId, raid.targetBlockId);
      if (targets.length > 0) {
        const raided = await this.repo.executeRaid({
          playerId: ctx.playerId,
          districtId: raid.districtId,
          targetBlockId: raid.targetBlockId,
          raidedAtTick: ctx.gameMinute,
          seizureFraction: raidTunables.seizureFraction,
          targets,
        });
        for (const r of raided) {
          this.bus.emitBuildingRaided({
            type: 'building_raided',
            playerId: ctx.playerId,
            buildingId: r.building_id,
            districtId: raid.districtId,
            blockId: raid.targetBlockId,
            gameMinute: ctx.gameMinute,
          });
        }
      }

      // MONEY_HOLDING LEG (Phase-5 vector #5a — INDEPENDENT): seize cash → DAMAGED → building_raid for the block's
      // money_holdings. Same producer seam — emit a BuildingRaidedEvent per damaged vault (the producer raises a card only
      // when a delegated lieutenant guards it, so a vault with no lieutenant simply produces no card).
      const moneyTargets = await this.repo.resolveMoneyHoldingTargetsOnBlock(ctx.playerId, raid.targetBlockId);
      if (moneyTargets.length > 0) {
        const raidedMoney = await this.repo.executeMoneyHoldingRaid({
          playerId: ctx.playerId,
          districtId: raid.districtId,
          targetBlockId: raid.targetBlockId,
          raidedAtTick: ctx.gameMinute,
          targets: moneyTargets,
        });
        for (const r of raidedMoney) {
          this.bus.emitBuildingRaided({
            type: 'building_raided',
            playerId: ctx.playerId,
            buildingId: r.building_id,
            districtId: raid.districtId,
            blockId: raid.targetBlockId,
            gameMinute: ctx.gameMinute,
          });
        }
      }
    }
  }
}

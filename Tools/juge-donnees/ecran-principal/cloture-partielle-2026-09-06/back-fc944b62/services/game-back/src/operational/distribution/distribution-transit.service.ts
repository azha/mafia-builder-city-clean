// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §NestJS — backend jeu
//             docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 6 (C6)
//             (DistributionService.processSegmentTraversal "appelée par le tick-scheduler à chaque segment" + §Data
//             model `Shift` "current_segment_index advanced par tick" — the courier walks the route per tick, on
//             arrival the cargo lands) + §Tick-scheduler integration (processSegmentTraversal hot-tick) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (courier_shift / product_storage — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//
// `DistributionTransitService` — the OPERATIONAL tick-hook that ADVANCES in-transit foot couriers. It is NOT one of
// the 11 city-sim systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the registry
// contract). It mirrors ProductionCookAdvanceService's / PrecursorArrivalService's registration shape EXACTLY
// (OnApplicationBootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder the
// scheduler seeds at the MINUTE/9 = COURIER_TRANSIT slot (after COOK_ADVANCE at MINUTE/8). This is the tick-hook
// PATTERN T1–T4 share.
//
// THE MINUTE/9 TICK (distribution_couriers_runners.md §Data model `Shift` — the courier walks the route in the
// background, P1 slow-tick; the player is NOT blocked behind the transit timer), per player:
//   - BATCH-READ all in-transit courier_shifts (status='in_transit') in ONE query (the Phase-1 determinism discipline:
//     batched read, no per-row queries).
//   - For each shift, compute the elapsed ticks since started_at_tick + the DETERMINISTIC transit duration (from the
//     route's block distance ÷ the foot speed). If the transit duration has FULLY elapsed:
//       * ARRIVE — transfer the cargo from the courier (courier_shift.cargo_grams) into the DESTINATION
//         product_storage, mark the shift 'completed' + the courier 'at_destination', in ONE transaction.
//     Else:
//       * the courier is still walking — advance current_segment_index toward the last path block (a qualitative
//         progress marker; NEVER surfaced raw).
//   - No RNG: which shifts arrive (elapsed >= transit_ticks) + the cargo amount (the persisted cargo_grams) are FIXED
//     functions of the persisted started_at_tick + the route geometry + the clock + the grounded foot-speed tunable.
//
// DETERMINISM (NO RNG): two players with identical dispatches + identical advances land on identical product at the
// destination. Organically a no-op (no in-transit shift).
//
// LIGHT-DETECTION COUPLING (M1 = DOCUMENTED SEAM, emit-only deferred). distribution_couriers_runners.md couples
// transit to System 1 flow-cells / System 4 patrol via processSegmentTraversal → computeDetectionPerSegment → (on a
// hit) emits an ObservationEvent consumed by BPD memory (System 3). M1 keeps this MINIMAL: the per-segment advance
// below is the SEAM where a future `CourierObservedEvent` (carrying ONLY qualitative info — block bucket + vehicle
// type + time-of-day bucket, NEVER raw coords/cargo grams) would be emitted onto the CityEventBus. M1 implements NO
// detection roll, NO interception, NO raid, NO CityEventBus emission — the detection depth is DEFERRED (later task).
// The seam is marked at `advanceShiftSegment` below.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { DistributionRepository } from './distribution.repository';
import { vehicleTransitTicks } from './distribution-tunables';
import type { SubstanceType } from '../substance/substance-config';
import { CourierDetectionService } from './courier-detection.service';
import { EphemeralPurgeService } from './ephemeral-purge.service';
import { LegAccrualService } from '../../core_loops/supply_chain/leg-accrual.service';

@Injectable()
export class DistributionTransitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DistributionTransitService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: DistributionRepository,
    // C6 — Layer-2 detection roll: injected here to call runSegmentDetection at the still-walking seam.
    private readonly detection: CourierDetectionService,
    // C10 — DD-EPHEMERAL: post-execution purge hook (ADDITIVE; no-op for non-ephemeral routes).
    private readonly ephemeralPurge: EphemeralPurgeService,
    // P3-C C2 — Loop 5 Mycelial Ledger: the post-tx-arrival accrual hook (ADDITIVE; design §5.1/D6,
    // register §0 row 8). Fires ONLY on real arrival — never at dispatch, never for a caught courier
    // (whose shift status flips away from 'in_transit' before this branch is ever reached again).
    private readonly legAccrual: LegAccrualService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.registerSweepCadence();
    this.logger.log(
      'DistributionTransitService registered at MINUTE/9 (COURIER_TRANSIT) — advances in-transit foot couriers each ' +
        'in-game minute; on arrival (transit duration elapsed) transfers the cargo into the destination ' +
        'product_storage + marks the shift completed / the courier at_destination. Batched read/write (Phase-1 ' +
        'determinism). Organically a no-op (no in-transit shift). Light-detection coupling = documented seam (deferred).\n' +
        'Also registered CAUGHT_EXCEPTION_SWEEP at NIGHTLY/10 — auto-abandons overdue pending caught_exceptions ' +
        '(OQ-14 window expiry). Organically a no-op when no exceptions are overdue (zero-regression).',
    );
  }

  /** Register the MINUTE/9 = COURIER_TRANSIT slot (the SAME registerSystem path the cook-advance hook uses at MINUTE/8). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.COURIER_TRANSIT,
      cadence: Cadence.MINUTE,
      order: 9,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  /**
   * C9 — Register the NIGHTLY/10 = CAUGHT_EXCEPTION_SWEEP slot (next free after FORENSIC_INSPECTOR_SCAN/9).
   * Each in-game night it scans all `caught_exception` rows with `status = 'pending'` whose
   * `resolution_deadline_tick <= gameMinute` for the player and auto-resolves them to `abandoned`
   * (the deterministic default, OQ-14). Organically a no-op when no exceptions are overdue (zero-regression).
   */
  private registerSweepCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.CAUGHT_EXCEPTION_SWEEP,
      cadence: Cadence.NIGHTLY,
      order: 10,
      run: (ctx) => this.detection.runResolutionSweep(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/9 tick ─────────────────────────────

  /**
   * {MINUTE, order 9} — advance the player's in-transit foot couriers. ctx.gameMinute is the current in-game tick (the
   * minute boundary firing). Batch-reads the in-transit shifts; for each whose deterministic transit duration has
   * elapsed, ARRIVES it (cargo → destination product_storage); else advances its segment index (still walking) and
   * runs the Layer-2 detection roll (C6 — additive hook AFTER advanceShiftSegment).
   * Deterministic (NO Math.random — DIV-5). Organically a no-op (no in-transit shift).
   *
   * Visibility: public so DistributionTestController can drive it directly for E2E (C6 test route).
   * Production: called only via the scheduler registration (MINUTE/9).
   */
  async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const inTransit = await this.repo.listInTransitShifts(ctx.playerId);
    if (inTransit.length === 0) return; // no courier in transit → clean no-op.

    for (const shift of inTransit) {
      // The route's block geometry + the courier's VEHICLE → the deterministic transit duration. M1 path is
      // [origin_block, dest_block]; the batched read already returned the Manhattan block_distance between the two block
      // coordinates AND the courier's vehicle_type (no per-shift query — set-based, no persisted duration column, R9.3).
      // The per-vehicle speed tunable read stays HERE (service-side): transit_ticks = max(1, ceil(block_distance /
      // vehicle_speed[vehicle])). For a FOOT (or refrigerated_van) courier this is BYTE-IDENTICAL to the pre-T5 value
      // (vehicle_speed.foot = foot_courier_blocks_per_tick; refrigerated_van maps to foot speed — transit-orthogonal
      // cold-chain), so every existing foot/van transit's arrival tick is unchanged; bike/car arrive in fewer ticks.
      // path_block_count is the path_blocks length (the last segment index = count-1).
      const baseTransitTicks = vehicleTransitTicks(shift.vehicle_type, shift.block_distance);
      // P3-C C3 — Loop 5 Mycelial Ledger transit slowdown (design §5.3/D4, migration 0126): the route's
      // OWN `mycelial_transit_stress_multiplier`, FROZEN at dispatch time (never re-read live here — a
      // leg's CURRENT stress is irrelevant to an already-in-flight shift, only the value the leg held AT
      // DISPATCH matters — see that migration's header). 1.0 for every pre-C3 route or an unstressed
      // dispatch → byte-identical `transitTicks` to the pre-C3 value.
      const transitTicks = Math.ceil(baseTransitTicks * shift.mycelial_transit_stress_multiplier);
      const elapsed = ctx.gameMinute - shift.started_at_tick;
      const lastSegmentIndex = Math.max(0, shift.path_block_count - 1);

      if (elapsed >= transitTicks) {
        // ARRIVE — the foot courier has walked the whole route → deposit the cargo at the destination (one tx).
        await this.repo.applyArrival(ctx.playerId, {
          shift_id: shift.shift_id,
          courier_id: shift.courier_id,
          destination_building_id: shift.destination_building_id,
          cargo_grams: shift.cargo_grams,
          substance_type: shift.substance_type as SubstanceType, // the shift's persisted cargo substance (T4).
          last_segment_index: lastSegmentIndex,
        });
        // ⊥ C2 MINOR fold (P3-C C3, reviewer-sanctioned): the DD-EPHEMERAL purge now runs BEFORE the
        // advisory recordThroughput call — REORDERED from C2's original purge-after-accrual sequence.
        // Why: the accrual below reads ONLY in-memory `shift.*` fields already resolved by the batched
        // select above (never a fresh DB read of the row the purge deletes) — ordering the purge FIRST
        // is safe. It also closes the C2 MINOR the reviewer flagged: an accrual throw (e.g. a DB error
        // inside `recordThroughput`) must NEVER orphan an ephemeral trail — with accrual first, a throw
        // there would abort this iteration BEFORE the purge ever ran, leaving the just-completed
        // ephemeral shift's operation trail un-purged. Purge-first means a purge failure still risks
        // orphaning nothing accrual-side (the leg's own upsert is unconditional and idempotent — a
        // never-purged shift row does not block a later accrual), while an accrual throw AFTER a
        // successful purge no longer skips anything DD-EPHEMERAL cares about.
        //
        // C10 — DD-EPHEMERAL: post-execution purge (ADDITIVE — no-op for non-ephemeral routes).
        // After the shift reaches its terminal state (arrival/completion), if the route is ephemeral,
        // delete the player's operation trail (shift execution record + route↔shift history +
        // route_version_history — NOT BPD memory / corridor_debt / active caught_exception, DIV-E1).
        // Deterministic DELETE (no Math.random / Date.now). Byte-identical for non-ephemeral routes.
        if (shift.ephemeral_mode) {
          await this.ephemeralPurge.purgeAfterExecution(shift.route_id);
        }
        // P3-C C2 — Loop 5 Mycelial Ledger: post-tx-arrival accrual (ADDITIVE, design §5.1/D6, register
        // §0 row 8). Real throughput just landed (applyArrival's tx above already committed) — accrue the
        // leg (player, origin, dest) debt via the D5 formula. Ad-hoc AND saved routes accrue identically
        // (SI_route is whatever `route.sinuosity_index` currently holds — read by the batched select
        // above, not re-queried here). A courier CAUGHT mid-transit never reaches this branch (its shift
        // status flips away from 'in_transit' before any future tick's batched read would see it again —
        // "unrewarded ≠ failed", D6/plan §C2).
        await this.legAccrual.recordThroughput(
          ctx.playerId,
          shift.origin_building_id,
          shift.destination_building_id,
          shift.cargo_grams,
          shift.route_sinuosity_index,
          ctx.gameMinute,
        );
      } else {
        // STILL WALKING — advance the qualitative progress marker toward the last block (clamped).
        // C6 LAYER-2 DETECTION SEAM: AFTER advanceShiftSegment, call runSegmentDetection (additive).
        // The arrival branch (:103-114) + cargo + timing are UNCHANGED. The roll is an additive hook:
        // a no-detection segment is byte-identical (miss → no-op); only a hit mutates the shift status.
        const nextSegment = Math.min(lastSegmentIndex, shift.current_segment_index + 1);
        if (nextSegment !== shift.current_segment_index) {
          await this.repo.advanceShiftSegment(ctx.playerId, shift.shift_id, nextSegment);
          // C6 — Layer-2 roll AFTER the advance (additive, per the plan's DIV-5 seam requirement).
          // runSegmentDetection reads path_blocks from the DB internally (avoids listInTransitShifts extension).
          await this.detection.runSegmentDetection(ctx, shift, nextSegment);
        }
      }
    }
  }
}

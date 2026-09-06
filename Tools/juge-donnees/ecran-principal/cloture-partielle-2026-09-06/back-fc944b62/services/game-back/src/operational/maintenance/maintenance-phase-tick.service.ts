// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C2 (MAINTENANCE_PHASE_TICK —
//             NIGHTLY/21 registration + orchestration)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §4 (Phase-progression
//             engine — the numbered tick steps 1-3, C2 scope; steps 4-5 are C4/C5, HONEST PARTIAL here)
//             Pattern: services/game-back/src/operational/internal_affairs/ia-tick.service.ts
//             (`IATickService` — the NIGHTLY/WEEKLY registration + `onApplicationBootstrap` shape this
//             file mirrors verbatim)
//             — 04f-A C2 — 2026-07-10
//
// `MaintenancePhaseTickService` — registers `MAINTENANCE_PHASE_TICK` at NIGHTLY/21 (confirmed free after
// POLICE_MEMORY/20 — design §2 seam 9 / C0 re-anchor). Each in-game night, per player:
//   (1) batch-read every OPERATIONAL building's D1 anchor (MaintenanceRepository.
//       listOperationalBuildingsForPhaseTick) → derive days_overdue (MaintenancePhaseService.
//       deriveDaysOverdue) → derive the phase (deriveLapsePhase) → persist ONLY the buildings whose phase
//       CHANGED (write-only-on-change, set-based) → emit MaintenancePhaseChangedEvent per transition.
//   (2) D13 — complete every ARMED scheduled-maintenance job whose `maintenance_completes_at_day` has
//       arrived (MaintenanceRepository.completeArmedJobs — resets the anchor to today, clears the job,
//       phase back to within_window).
//   (3) 04f-A C4 — the critical-phase DAILY failure roll (D11, flat 8% `(building_id, game_day)` seeded):
//       every building whose (post-transition, post-job-completion) derived phase is 'critical' THIS tick is
//       rolled via `EquipmentFailureService.rollCriticalDailyForBuildings` (NOT a new tick — wired directly
//       into this one, design §4 step 4). A building whose job completed THIS SAME tick (→ within_window) is
//       excluded from the critical set (it is no longer critical). A failing roll runs the atomic-5 (minus
//       the card — C5's job).
//
// 04f-A C5 (D4): step (4) — the periodic Exception re-emission for buildings STILL `structural_state='failed'`
// (e.g. after a DEFER_REPAIR resolution — the honest wrinkle: the exception spine has no native scheduled-
// resurface mechanism) — `EquipmentFailureCardService.reemitForFailedBuildings`, dedup-gated (a building whose
// card is still pending is skipped). Runs FIRST/UNCONDITIONALLY, BEFORE the L1 zero-operational-buildings
// early-return below: a player whose ONLY building is 'failed' has ZERO rows in the OPERATIONAL set (a failed
// building is, by definition, not operational) and would otherwise never reach this step if it were placed
// after that early-return — placing it first is what makes the re-emission actually fire for exactly that case.
//
// L1 zero-write no-op: no OPERATIONAL building for a player (or none whose phase changed / whose job
// completed / whose derived phase is critical) → the tick returns having issued ZERO writes (the C2
// zero-regression contract, design §13). Idempotent per game-day: re-running on the SAME day recomputes the
// SAME phases (and the SAME seeded critical roll outcome) for every row → zero writes on the re-run (the
// IA_DECAY_TICK / ConversionSetupService precedent).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { citySimTunables } from '../../citysim/citysim-tunables';
// 04f-A C1/C2 — REUSE the SAME game-day derivation the effect engine (applied_at_game_day) and the
// political calendar already use, so the D1 anchor never drifts from that shared convention (the SAME
// import ConversionSetupService uses to stamp the anchor at conversion-complete).
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenancePhaseService, type LapsePhase } from './maintenance-phase.service';
import { EquipmentFailureService } from './equipment-failure.service';
// 04f-A C5 (D4) — the periodic Exception re-emission call. EquipmentFailureCardService is DUPLICATE-REGISTERED
// in this module (see maintenance.module.ts's own comment) rather than imported via ExceptionsModule, which
// would close a circular dependency (ExceptionsModule → LieutenantModule → ProductionModule → MaintenanceModule).
import { EquipmentFailureCardService } from '../../exceptions/equipment-failure-card.service';
// 04f-A C6 (D7) — the SAME NIGHTLY/21 cadence ALSO emits the EQUIPMENT_REPAIR nightly repair-window spike.
import { MaintenanceHeatService } from './maintenance-heat.service';

@Injectable()
export class MaintenancePhaseTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaintenancePhaseTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly bus: CityEventBus,
    private readonly failure: EquipmentFailureService,
    private readonly equipmentFailureCards: EquipmentFailureCardService,
    private readonly heat: MaintenanceHeatService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MAINTENANCE_PHASE_TICK,
      cadence: Cadence.NIGHTLY,
      order: 21,
      // Async wrapper (not a direct `run: (ctx) => this.runNightlyTick(ctx)` point-free pass-through):
      // runNightlyTick RETURNS { transitions, jobsCompleted } (the count-based idempotency-proof shape the
      // `run-phase-tick` test route + IA_DECAY_TICK precedent both use) — the scheduler's CitySimSystem.run
      // contract is Promise<void>, so this awaits + discards the count, the SAME pattern every other
      // count-returning tick service uses at its own registerSystem call.
      run: async (ctx) => {
        await this.runNightlyTick(ctx);
      },
    });
    this.logger.log(
      'MaintenancePhaseTickService registered MAINTENANCE_PHASE_TICK at NIGHTLY/21 — next free after ' +
        'POLICE_MEMORY/20 (confirmed, no slot collision). Each in-game night, per player: (1) recompute the ' +
        'D1 lapse_phase for every OPERATIONAL building (write-only-on-change, set-based) + emit ' +
        'MaintenancePhaseChangedEvent per transition; (2) complete armed scheduled-maintenance jobs (D13); ' +
        '(3) roll the critical-phase DAILY failure roll (D11, flat 8%, seeded) for every building whose ' +
        'derived phase is critical THIS tick (04f-A C4); (4) dedup-gated periodic Exception re-emission for ' +
        'every STILL-failed building (04f-A C5, D4). L1 empty-state skip: no operational buildings → ZERO ' +
        'writes for steps (1)-(3) (step (4) is independent of the operational set). Idempotent per game-day ' +
        '(same-day re-run → zero writes).',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/21 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 21} — recompute + persist the D1 lapse_phase for the player's operational buildings,
   * emit transition events, complete armed scheduled-maintenance jobs (D13), and roll the critical-phase
   * DAILY failure roll (D11, C4) for every building whose derived phase is critical THIS tick. Deterministic
   * (NO Math.random — the ONLY draw source is `EquipmentFailureService`'s `makeRng`). Organically a no-op
   * (no operational buildings, or nothing changed/completed/critical this run). Returns the transition +
   * completion + critical-roll COUNTS (the count-based idempotency-proof shape — the IA_DECAY_TICK
   * `apply-decay` precedent: a same-day re-run returns the SAME counts for the parts that changed nothing
   * this run, the falsifiable "zero writes" proof the C2/C4 E2E floors assert on).
   */
  async runNightlyTick(
    ctx: CitySimTickContext,
  ): Promise<{
    transitions: number;
    jobsCompleted: number;
    criticalRolled: number;
    criticalFailed: number;
    reemitted: number;
    repairHeatSpiked: number;
  }> {
    // (4) 04f-A C5 (D4) — UNCONDITIONAL, runs even for a player with ZERO operational buildings (see the
    // comment above this method) — the periodic re-emission for buildings STILL 'failed'.
    const reemitted = await this.equipmentFailureCards.reemitForFailedBuildings(ctx.playerId);

    // (5) 04f-A C6 (D7) — ALSO UNCONDITIONAL, for the SAME reason as (4): a player whose ONLY building is
    // 'failed'/'repairing' has ZERO rows in the OPERATIONAL set (a failed building is, by definition, not
    // operational) and would never reach this step if it were placed after the L1 early-return below.
    const repairHeatSpiked = await this.heat.emitNightlyRepairSpike(ctx.playerId, ctx.gameMinute);

    const rows = await this.repo.listOperationalBuildingsForPhaseTick(ctx.playerId);
    if (rows.length === 0) {
      return { transitions: 0, jobsCompleted: 0, criticalRolled: 0, criticalFailed: 0, reemitted, repairHeatSpiked }; // L1 — no operational buildings → clean no-op for steps (1)-(3).
    }

    const currentGameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);

    // (1) Recompute + persist ONLY the transitions (write-only-on-change — idempotent same-day re-run).
    // Also track EVERY row's derived phase this tick (not just the ones that changed) — the critical-roll
    // step (3) below needs the FULL post-derivation critical set, not just today's transitions-into-critical
    // (a building already cached 'critical' from a prior night must keep rolling daily too).
    const transitions: Array<{ building_id: string; previousPhase: LapsePhase; newPhase: LapsePhase }> = [];
    const derivedPhaseByBuilding = new Map<string, LapsePhase>();
    for (const row of rows) {
      const daysOverdue = this.phase.deriveDaysOverdue(
        currentGameDay,
        row.last_maintained_at_game_day,
        row.maintenance_due_in_days,
      );
      const newPhase = this.phase.deriveLapsePhase(daysOverdue);
      derivedPhaseByBuilding.set(row.building_id, newPhase);
      if (newPhase !== row.lapse_phase) {
        transitions.push({ building_id: row.building_id, previousPhase: row.lapse_phase, newPhase });
      }
    }
    if (transitions.length > 0) {
      await this.repo.persistPhaseTransitions(
        ctx.playerId,
        transitions.map((t) => ({ building_id: t.building_id, newPhase: t.newPhase })),
      );
      for (const t of transitions) {
        this.bus.emitMaintenancePhaseChanged({
          type: 'maintenance_phase_changed',
          buildingId: t.building_id,
          playerId: ctx.playerId,
          previousPhase: t.previousPhase,
          newPhase: t.newPhase,
          gameMinute: ctx.gameMinute,
        });
      }
    }

    // (2) D13 — complete every ARMED scheduled-maintenance job whose completion day has arrived.
    const completed = await this.repo.completeArmedJobs(ctx.playerId, currentGameDay);
    const completedIds = new Set(completed);

    // (3) 04f-A C4 — the critical-phase DAILY failure roll (D11): every building whose DERIVED phase is
    // 'critical' THIS tick, EXCLUDING any building whose scheduled-maintenance job ALSO completed this same
    // tick (step 2 just reset it to within_window — no longer critical).
    const criticalBuildingIds = rows
      .map((r) => r.building_id)
      .filter((id) => derivedPhaseByBuilding.get(id) === 'critical' && !completedIds.has(id));
    const criticalRoll = await this.failure.rollCriticalDailyForBuildings(
      ctx.playerId,
      criticalBuildingIds,
      currentGameDay,
      ctx.gameMinute,
    );

    this.logger.log(
      `MAINTENANCE_PHASE_TICK: player=${ctx.playerId} day=${currentGameDay} → ` +
        `${transitions.length} phase transition(s), ${completed.length} scheduled-maintenance job(s) ` +
        `completed (D13), ${criticalRoll.rolled} critical-daily roll(s) / ${criticalRoll.failed} failure(s) ` +
        `(D11, C4), ${reemitted} exception card(s) re-emitted (D4, C5), ${repairHeatSpiked} EQUIPMENT_REPAIR ` +
        `heat spike(s) (D7, C6).`,
    );
    return {
      transitions: transitions.length,
      jobsCompleted: completed.length,
      criticalRolled: criticalRoll.rolled,
      criticalFailed: criticalRoll.failed,
      reemitted,
      repairHeatSpiked,
    };
  }
}

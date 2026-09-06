// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C1 (falsifiable tunable read-back)
//             + C2 (anchor-set / run-phase-tick — the D13 job-completion + zero-regression + exact-gram
//             fold test seams) + DD-M4 (decisions §2.4 — the `maintenance-test.controller.ts` test seam,
//             gated `testControllersEnabled()`, the forensic/live-ops precedent: drives REAL registered
//             services/getters, never a parallel implementation)
//             Test seam precedent: services/game-back/src/operational/liveops/live-ops-test.controller.ts
//             (`GET /_test/liveops/read-tunables` — created its OWN C1, the SAME registry-first-chunk
//             posture) + services/game-back/src/operational/insurance/insurance-test.controller.ts
//             (`POST /_test/insurance/run-nightly-tick` — the "call the REAL tick method directly with a
//             constructed ctx, bypassing the scheduler timer" pattern `run-phase-tick` mirrors verbatim)
//             — 04f-A C1 — 2026-07-10 (`read-tunables` only) | C2 extension — 2026-07-10 (anchor-set +
//             run-phase-tick; `run-weekly-roll` is C4's own scope, not added here)
//
// `MaintenanceTestController` — TEST-ONLY probe routes for `MaintenanceModule`. Mounted ONLY when
// `testControllersEnabled()` (NODE_ENV !== 'production').
//
// C1 routes:
//   GET /v1/_test/maintenance/read-tunables
//     Returns all 36 `maintenanceTunables.*` getter values (maintenance-tunables.ts) as a plain object — a
//     side-effect-free poll target for `maintenance_schema_tunables.spec.ts`'s value-sensitivity proof
//     (flip a `tunable_overrides` row for a `maintenance.*` key → this route's value moves → clear the
//     override → back to default). Anti-fabrication: reads REAL getter output, never a hardcoded echo.
//
// C2 routes:
//   POST /v1/_test/maintenance/anchor-set
//     Force a building's D1 anchor so it is EXACTLY `days_overdue` game-days overdue AS OF RIGHT NOW (the
//     player's current `city_sim_clock.game_minute`, read + converted via the REAL `deriveGameDay`).
//     Optionally ALSO arms a scheduled-maintenance job (`maintenance_completes_at_day`, D13) — the ONLY way
//     C2's own floor can seed an armed job (C3, the real scheduling endpoint, is a later chunk). This
//     inverts the ONE linear D1 relationship algebraically to solve for the anchor to WRITE — it does NOT
//     duplicate the phase/multiplier derivation itself (DD-M4).
//   POST /v1/_test/maintenance/run-phase-tick
//     Calls `MaintenancePhaseTickService.runNightlyTick(ctx)` DIRECTLY (bypasses the scheduler timer — the
//     insurance `run-nightly-tick` precedent). Defaults `gameMinute` to the player's current clock reading
//     so it agrees with whatever "today" `anchor-set` most recently computed. C4 EXTENDED: the response now
//     also surfaces `criticalRolled`/`criticalFailed` (the tick's own new step 3, D11).
//
// C4 routes:
//   POST /v1/_test/maintenance/force-week-epoch
//     Directly SETS the player's `city_sim_clock.game_minute` to `week_id × EQUIPMENT_FAILURE_WEEKLY_MINUTES`
//     (upsert — lazily creates the clock row) — precise game-WEEK control for the D11 weekly-roll precompute
//     proof, without physically simulating thousands of MINUTE ticks (the `anchor-set` "force = directly set
//     the input state" posture, extended to the clock).
//   POST /v1/_test/maintenance/run-weekly-roll
//     Calls `EquipmentFailureWeeklyTickService.runWeeklyTick(ctx)` DIRECTLY (bypasses the scheduler timer —
//     the `run-phase-tick` precedent). Echoes back the `weekId` it actually used (never re-derived by the
//     caller) so the E2E precompute never drifts.

import { Body, Controller, Get, HttpException, HttpStatus, Inject, Post } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { Cadence } from '../../citysim/scheduler/city_sim_system';
// 04f-A C2 — REUSE the SAME game-day derivation the real tick / ConversionSetupService use, so a test-seeded
// anchor never drifts from the production convention.
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { maintenanceTunables } from './maintenance-tunables';
import { MaintenancePhaseTickService } from './maintenance-phase-tick.service';
import { EquipmentFailureWeeklyTickService } from './equipment-failure-weekly-tick.service';
import { EQUIPMENT_FAILURE_WEEKLY_MINUTES, equipmentFailureWeekId } from './equipment-failure.service';
import { CITYSIM_CLOCK, type LiveOpsClockPort } from '../../citysim/scheduler/city-sim-clock.port';

@Controller()
export class MaintenanceTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tick: MaintenancePhaseTickService,
    private readonly weeklyTick: EquipmentFailureWeeklyTickService,
    // W1.1-d C2 (design §4.1 site 3) — the SAME real-clock seam `advancePlayer`/`ensureClock` now write
    // through (city_sim_scheduler.service.ts), so this test-only clock-force route never diverges onto
    // its own `new Date()` read. Resolvable here because MaintenanceModule already imports SchedulerModule
    // (for MaintenancePhaseTickService.registerSystem), which now exports CITYSIM_CLOCK.
    @Inject(CITYSIM_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * GET /v1/_test/maintenance/read-tunables
   *
   * Returns all 36 `maintenanceTunables.*` getter values, PLUS `equipmentFailureBaselineLabTierPerWeek(1..5)`
   * (the parametrized per-tier accessor, echoed as an array so the E2E can assert it delegates to the SAME
   * 5 individual getters — no re-implementation).
   */
  @Get('_test/maintenance/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      lapseSoftDegradationStartDay: maintenanceTunables.lapseSoftDegradationStartDay,
      lapseHardDegradationStartDay: maintenanceTunables.lapseHardDegradationStartDay,
      lapseCriticalStartDay: maintenanceTunables.lapseCriticalStartDay,
      repairCostCurveExponent: maintenanceTunables.repairCostCurveExponent,
      outputReductionSoftPctPerWeek: maintenanceTunables.outputReductionSoftPctPerWeek,
      outputReductionHardPctPerWeek: maintenanceTunables.outputReductionHardPctPerWeek,
      outputCeilingCriticalPct: maintenanceTunables.outputCeilingCriticalPct,
      heatAdditiveSoftPerWeek: maintenanceTunables.heatAdditiveSoftPerWeek,
      heatAdditiveHardPerWeek: maintenanceTunables.heatAdditiveHardPerWeek,
      auditPinProbabilityHardPct: maintenanceTunables.auditPinProbabilityHardPct,
      equipmentFailureMultiplierSoft: maintenanceTunables.equipmentFailureMultiplierSoft,
      equipmentFailureMultiplierHard: maintenanceTunables.equipmentFailureMultiplierHard,
      equipmentFailureCriticalDailyProb: maintenanceTunables.equipmentFailureCriticalDailyProb,
      equipmentFailureBaselineLabTier1PerWeek: maintenanceTunables.equipmentFailureBaselineLabTier1PerWeek,
      equipmentFailureBaselineLabTier2PerWeek: maintenanceTunables.equipmentFailureBaselineLabTier2PerWeek,
      equipmentFailureBaselineLabTier3PerWeek: maintenanceTunables.equipmentFailureBaselineLabTier3PerWeek,
      equipmentFailureBaselineLabTier4PerWeek: maintenanceTunables.equipmentFailureBaselineLabTier4PerWeek,
      equipmentFailureBaselineLabTier5PerWeek: maintenanceTunables.equipmentFailureBaselineLabTier5PerWeek,
      equipmentFailureBaselineLabTierParametrized: [1, 2, 3, 4, 5].map((t) =>
        maintenanceTunables.equipmentFailureBaselineLabTierPerWeek(t as 1 | 2 | 3 | 4 | 5),
      ),
      equipmentFailureBaselineFrontShopPerWeek: maintenanceTunables.equipmentFailureBaselineFrontShopPerWeek,
      equipmentFailureBaselineCashSafehousePerWeek: maintenanceTunables.equipmentFailureBaselineCashSafehousePerWeek,
      equipmentFailureBaselineStashPerWeek: maintenanceTunables.equipmentFailureBaselineStashPerWeek,
      equipmentFailureBaselineRefineryPerWeek: maintenanceTunables.equipmentFailureBaselineRefineryPerWeek,
      equipmentFailureBaselinePressHousePerWeek: maintenanceTunables.equipmentFailureBaselinePressHousePerWeek,
      equipmentFailureBaselineDistributionHubPerWeek: maintenanceTunables.equipmentFailureBaselineDistributionHubPerWeek,
      equipmentFailureBaselineOfficePerWeek: maintenanceTunables.equipmentFailureBaselineOfficePerWeek,
      equipmentFailureBaselineMoneyHoldingPerWeek: maintenanceTunables.equipmentFailureBaselineMoneyHoldingPerWeek,
      autoScheduleWindowBeforeDueDays: maintenanceTunables.autoScheduleWindowBeforeDueDays,
      repairCostPctOfSetupMin: maintenanceTunables.repairCostPctOfSetupMin,
      repairCostPctOfSetupMax: maintenanceTunables.repairCostPctOfSetupMax,
      repairTimeDaysMin: maintenanceTunables.repairTimeDaysMin,
      repairTimeDaysMax: maintenanceTunables.repairTimeDaysMax,
      repairSlowCostMultiplier: maintenanceTunables.repairSlowCostMultiplier,
      emergencyMaintenanceCostMultiplier: maintenanceTunables.emergencyMaintenanceCostMultiplier,
      scheduleCostPctOfSetup: maintenanceTunables.scheduleCostPctOfSetup,
      failureRepairHeatMagnitudeBand: maintenanceTunables.failureRepairHeatMagnitudeBand,
      perfBudget04fMaxKbPerPlayer: maintenanceTunables.perfBudget04fMaxKbPerPlayer,
    };
  }

  /**
   * `POST /v1/_test/maintenance/anchor-set` — C2 test seam (DD-M4, TEST-ONLY).
   *
   * Force a building's D1 anchor (`last_maintained_at_game_day`) so it is EXACTLY `days_overdue` game-days
   * overdue AS OF RIGHT NOW (the building's owner's CURRENT `city_sim_clock.game_minute`, read + converted
   * via the REAL `deriveGameDay` derivation — never a fabricated "today"). Optionally ALSO arms a
   * scheduled-maintenance job (`maintenance_completes_at_day`, D13) `arm_job_completes_in_days` game-days
   * from now (may be `<= 0` to seed an ALREADY-due job — the D13 completion-test seam; C3, which lands the
   * REAL scheduling endpoint, is a later chunk, so this is the ONLY way C2's own floor can arm a job).
   * Omitting `arm_job_completes_in_days` CLEARS any armed job (a clean baseline per call).
   *
   * This does NOT duplicate the D1 derivation formula — it inverts the ONE linear relationship
   * (`days_overdue = currentGameDay - anchor - maintenanceDueInDays`) algebraically to solve for the anchor
   * to WRITE; the tick under test (`run-phase-tick`) is the ONLY code path that ever DERIVES a phase/
   * multiplier from the written anchor (DD-M4 — "E2E never mocks the tick, never duplicates the formula").
   *
   * Body: `{ building_id: string; days_overdue: number; arm_job_completes_in_days?: number }`.
   * R2.2: TEST-ONLY — never registered in production.
   */
  @Post('_test/maintenance/anchor-set')
  async anchorSet(
    @Body() body: { building_id: string; days_overdue: number; arm_job_completes_in_days?: number },
  ): Promise<{
    building_id: string;
    current_game_day: number;
    last_maintained_at_game_day: number;
    maintenance_completes_at_day: number | null;
  }> {
    if (!body?.building_id || typeof body.days_overdue !== 'number') {
      throw new HttpException('building_id + days_overdue required', HttpStatus.BAD_REQUEST);
    }
    const bosRows = await this.db
      .select({
        player_id: buildingOperationalState.player_id,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, body.building_id))
      .limit(1);
    const bos = bosRows[0];
    if (!bos) {
      throw new HttpException(`No such building_operational_state: ${body.building_id}`, HttpStatus.NOT_FOUND);
    }
    const clockRows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, bos.player_id))
      .limit(1);
    const gameMinute = clockRows[0]?.game_minute ?? 0;
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    const newAnchor = currentGameDay - bos.maintenance_due_in_days - body.days_overdue;
    const newCompletesAtDay =
      body.arm_job_completes_in_days !== undefined ? currentGameDay + body.arm_job_completes_in_days : null;
    await this.db
      .update(buildingOperationalState)
      .set({ last_maintained_at_game_day: newAnchor, maintenance_completes_at_day: newCompletesAtDay })
      .where(eq(buildingOperationalState.building_id, body.building_id));
    return {
      building_id: body.building_id,
      current_game_day: currentGameDay,
      last_maintained_at_game_day: newAnchor,
      maintenance_completes_at_day: newCompletesAtDay,
    };
  }

  /**
   * `POST /v1/_test/maintenance/run-phase-tick` — C2 tick driver (DD-M4, TEST-ONLY); C4 EXTENDED to surface
   * the critical-daily-roll counts (the tick now also runs step (3), design §4).
   *
   * Calls `MaintenancePhaseTickService.runNightlyTick(ctx)` DIRECTLY for the given `playerId` (bypasses the
   * real scheduler timer — the test drives the tick, the insurance `run-nightly-tick` precedent). When
   * `gameMinute` is omitted, reads the player's CURRENT `city_sim_clock.game_minute` so `run-phase-tick`
   * agrees with whatever "today" `anchor-set` most recently computed, without the caller re-deriving it.
   *
   * Body: `{ playerId: string; gameMinute?: number }`.
   * Response: `{ ticked: true, gameMinute, transitions, jobsCompleted, criticalRolled, criticalFailed,
   * reemitted }` — the counts are the falsifiable "zero writes on same-day re-run" idempotency proof (the
   * IA_DECAY_TICK `apply-decay` response-count precedent). `reemitted` is the 04f-A C5 (D4) periodic
   * Exception re-emission count (§4 step 4/5) — 0 in the common case.
   * R2.2: TEST-ONLY. Drives the real service (no mock, no duplicated formula).
   */
  @Post('_test/maintenance/run-phase-tick')
  async runPhaseTick(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<{
    ticked: true;
    gameMinute: number;
    transitions: number;
    jobsCompleted: number;
    criticalRolled: number;
    criticalFailed: number;
    reemitted: number;
    repairHeatSpiked: number;
  }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    let gameMinute = body.gameMinute;
    if (gameMinute === undefined) {
      const clockRows = await this.db
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, body.playerId))
        .limit(1);
      gameMinute = clockRows[0]?.game_minute ?? 0;
    }
    const result = await this.tick.runNightlyTick({ playerId: body.playerId, cadence: Cadence.NIGHTLY, gameMinute });
    return {
      ticked: true,
      gameMinute,
      transitions: result.transitions,
      jobsCompleted: result.jobsCompleted,
      criticalRolled: result.criticalRolled,
      criticalFailed: result.criticalFailed,
      reemitted: result.reemitted,
      // 04f-A C6 (D7) — the SAME NIGHTLY/21 tick's EQUIPMENT_REPAIR repair-window-spike count.
      repairHeatSpiked: result.repairHeatSpiked,
    };
  }

  /**
   * `POST /v1/_test/maintenance/force-week-epoch` — C4 test seam (DD-M4, TEST-ONLY).
   *
   * Directly SETS the player's `city_sim_clock.game_minute` to the FIRST minute of the given `week_id`
   * (`week_id × EQUIPMENT_FAILURE_WEEKLY_MINUTES`) — lazily creates the clock row if none exists yet
   * (upsert, `ON CONFLICT DO UPDATE`, the `CitySimSchedulerService.ensureClock` precedent). This gives the
   * E2E precise game-WEEK control (the `equipmentFailureWeeklySeed(buildingId, weekId)` precompute proof)
   * without physically simulating thousands of MINUTE ticks via `/v1/_test/citysim/advance` — the SAME
   * "force = directly set the input state" posture `anchor-set` already established (this file's own C2
   * seam). Does NOT touch `building_operational_state` (orthogonal to `anchor-set`).
   *
   * Body: `{ playerId: string; week_id: number }`.
   * Response: `{ playerId, weekId, gameMinute }`.
   * R2.2: TEST-ONLY — never registered in production.
   */
  @Post('_test/maintenance/force-week-epoch')
  async forceWeekEpoch(
    @Body() body: { playerId: string; week_id: number },
  ): Promise<{ playerId: string; weekId: number; gameMinute: number }> {
    if (!body?.playerId || typeof body.week_id !== 'number') {
      throw new HttpException('playerId + week_id required', HttpStatus.BAD_REQUEST);
    }
    const gameMinute = body.week_id * EQUIPMENT_FAILURE_WEEKLY_MINUTES;
    await this.db
      .insert(citySimClock)
      .values({ player_id: body.playerId, game_minute: gameMinute, last_real_tick_at: this.clock.now() })
      .onConflictDoUpdate({ target: citySimClock.player_id, set: { game_minute: gameMinute } });
    return { playerId: body.playerId, weekId: body.week_id, gameMinute };
  }

  /**
   * `POST /v1/_test/maintenance/run-weekly-roll` — C4 tick driver (DD-M4, TEST-ONLY).
   *
   * Calls `EquipmentFailureWeeklyTickService.runWeeklyTick(ctx)` DIRECTLY for the given `playerId` (bypasses
   * the real scheduler timer — the `run-phase-tick` precedent). When `gameMinute` is omitted, reads the
   * player's CURRENT `city_sim_clock.game_minute` (whatever `force-week-epoch` — or the default 0 — most
   * recently set), so the caller need not re-derive it.
   *
   * Body: `{ playerId: string; gameMinute?: number }`.
   * Response: `{ ticked: true, gameMinute, weekId, candidates, rolled, failed }` — `weekId` is ECHOED BACK
   * (never re-derived by the caller) so the E2E's precompute (`equipmentFailureWeeklySeed(buildingId,
   * weekId)`) always uses the EXACT weekId the tick itself used — zero drift risk. The counts are the
   * falsifiable "zero new rolls on same-epoch re-run" idempotency proof.
   * R2.2: TEST-ONLY. Drives the real service (no mock, no duplicated formula).
   */
  @Post('_test/maintenance/run-weekly-roll')
  async runWeeklyRoll(
    @Body() body: { playerId: string; gameMinute?: number },
  ): Promise<{
    ticked: true;
    gameMinute: number;
    weekId: number;
    candidates: number;
    rolled: number;
    failed: number;
    neglectHeatSoft: number;
    neglectHeatHard: number;
  }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    let gameMinute = body.gameMinute;
    if (gameMinute === undefined) {
      const clockRows = await this.db
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, body.playerId))
        .limit(1);
      gameMinute = clockRows[0]?.game_minute ?? 0;
    }
    const result = await this.weeklyTick.runWeeklyTick({ playerId: body.playerId, cadence: Cadence.WEEKLY, gameMinute });
    return {
      ticked: true,
      gameMinute,
      weekId: equipmentFailureWeekId(gameMinute),
      candidates: result.candidates,
      rolled: result.rolled,
      failed: result.failed,
      // 04f-A C6 (D7) — the SAME WEEKLY/11 tick's MAINTENANCE_NEGLECT heat-pass counts.
      neglectHeatSoft: result.neglectHeatSoft,
      neglectHeatHard: result.neglectHeatHard,
    };
  }
}

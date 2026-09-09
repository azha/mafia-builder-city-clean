// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C4 (Equipment-failure rolls —
//             WEEKLY/11 seeded rolls + the critical-daily roll wired into the C2 NIGHTLY tick + the
//             'failed' transition + the atomic-5, minus the card)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §5 (Equipment-failure
//             model — the per-type baseline table, the lab→equipment_tier mapping, the 3 EXCLUDED types,
//             the WEEKLY roll formula, the critical-daily flat 8%, the atomic-5)
//             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.11 (D11 —
//             seeded determinism + the critical-roll canon contradiction ruled 8%-daily) + §2.3 (DD-M3 —
//             equipment_failure_log as the BO/timeline surface) + §8 sub-decision #2 (canon-10 live, 3
//             types EXCLUDED via an explicit skip-list — RULED)
//             Seed precedent: raid-bribe (`makeRng`, E2E-provable by direct-import precompute —
//             raid_exception.spec.ts:437) + System-9 Layer-2 5-factor seeded roll.
//             — 04f-A C4 — 2026-07-10
//
// `EquipmentFailureService` — the D11 seeded equipment-failure roll (weekly + critical-daily) + the
// atomic-5 failure transaction (structural_state→'failed' + equipment_failure_log row + EquipmentFailedEvent
// — minus the 4-option card, C5's job). Several pure exports (`equipmentFailureBaselinePerWeek` /
// `equipmentFailureOverdueFactor` / `equipmentFailureWeeklyProbability` / the 2 seed-key builders) mirror
// the `MaintenancePhaseService` "no DB, no RNG-hiding" discipline — direct-importable by the E2E precompute
// proof (DD-M4, the raid-bribe pattern) so the spec's expected roll outcome is computed by the SAME code the
// server runs, never a hand-typed boolean.

import { Injectable, Logger } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { makeRng } from '../../common/seeded-rng';
import {
  conversionTunables,
  groundedConversionCostCents,
  type M1OperationalType,
} from '../real_estate/conversion-tunables';
import { maintenanceTunables, type LabEquipmentTier } from './maintenance-tunables';
import { MaintenancePhaseService, type LapsePhase } from './maintenance-phase.service';
import {
  MaintenanceRepository,
  type FailureRollWeeklyCandidateRow,
  type FailureRollDailyCandidateRow,
} from './maintenance.repository';

/**
 * ★ THE 3 EXCLUDED TYPES (sub-decision #2, RULED canon-10-live): `grow_house`, `dealer_spot_front`,
 * `specialized_lab` carry NO canon failure baseline (design §5 — the tech doc's 10-type table has no row for
 * them). This is an EXPLICIT skip-list constant with this comment — they are NEVER rolled (not weekly, not
 * critical-daily), and NO log row is ever written for them. This is an honest gap (TD routed at C9 + a
 * gdd/04f-edit pointer), NOT a zero-probability value disguised as coverage: there is no
 * `equipmentFailureBaseline*PerWeek` getter for these 3 types AT ALL (grep-verifiable) — the skip happens
 * BEFORE any probability is even computed, not via a baseline of 0.
 *
 * TD (C9): no canon baseline for these 3 real building types — excluded from ALL equipment-failure rolls
 * (weekly AND critical-daily), not zero-coverage. Routes a gdd/04f edit (sub-decision #2/#4).
 */
export const EQUIPMENT_FAILURE_EXCLUDED_TYPES: ReadonlySet<M1OperationalType> = new Set<M1OperationalType>([
  'grow_house',
  'dealer_spot_front',
  'specialized_lab',
]);

/** Game-minutes per in-game week (7 × 24 × 60 = 10080) — mirrors `IA_WEEKLY_MINUTES` / `reputation.module.ts`
 *  / `insurance.module.ts` (each module owns its own copy of this constant, the established convention). */
export const EQUIPMENT_FAILURE_WEEKLY_MINUTES = 7 * 24 * 60;

/** The game-week id (D11 "week_epoch") for a given gameMinute — `Math.floor(gameMinute / WEEKLY_MINUTES)`. */
export function equipmentFailureWeekId(gameMinute: number): number {
  return Math.floor(gameMinute / EQUIPMENT_FAILURE_WEEKLY_MINUTES);
}

/**
 * D11 — the seeded-rng key for the WEEKLY roll: `(building_id, week_epoch)`. A namespaced tag prefix (mirrors
 * `ia-surveil:${investigationId}:${gameDay}`) avoids collision with any OTHER system's seed space.
 */
export function equipmentFailureWeeklySeed(buildingId: string, weekId: number): string {
  return `equipment-failure-weekly:${buildingId}:${weekId}`;
}

/**
 * D11 — the seeded-rng key for the CRITICAL-DAILY roll: `(building_id, game_day)`.
 */
export function equipmentFailureCriticalDailySeed(buildingId: string, gameDay: number): string {
  return `equipment-failure-critical-daily:${buildingId}:${gameDay}`;
}

/**
 * The per-type/per-tier `maintenance.equipment_failure_baseline_*_per_week` getter for `operationalType`
 * (design §5 — 9 real M1 types via `lab`→`equipment_tier` 1..5 for `lab` itself). Returns `null` for the 3
 * EXCLUDED types (the skip-list above — checked FIRST, before any getter is even consulted).
 */
export function equipmentFailureBaselinePerWeek(operationalType: M1OperationalType, equipmentTier: number): number | null {
  if (EQUIPMENT_FAILURE_EXCLUDED_TYPES.has(operationalType)) return null;
  switch (operationalType) {
    case 'lab': {
      const tier = Math.min(5, Math.max(1, Math.trunc(equipmentTier))) as LabEquipmentTier;
      return maintenanceTunables.equipmentFailureBaselineLabTierPerWeek(tier);
    }
    case 'stash':
      return maintenanceTunables.equipmentFailureBaselineStashPerWeek;
    case 'front_shop':
      return maintenanceTunables.equipmentFailureBaselineFrontShopPerWeek;
    case 'cash_safehouse':
      return maintenanceTunables.equipmentFailureBaselineCashSafehousePerWeek;
    case 'refinery':
      return maintenanceTunables.equipmentFailureBaselineRefineryPerWeek;
    case 'press_house':
      return maintenanceTunables.equipmentFailureBaselinePressHousePerWeek;
    case 'distribution_hub':
      return maintenanceTunables.equipmentFailureBaselineDistributionHubPerWeek;
    case 'money_holding':
      return maintenanceTunables.equipmentFailureBaselineMoneyHoldingPerWeek;
    // EXCLUDED types (guarded above — kept here ONLY for TS exhaustiveness, never reached).
    case 'grow_house':
    case 'dealer_spot_front':
    case 'specialized_lab':
      return null;
  }
}

/**
 * D11/§5 — `overdue_factor = max(0, (days_overdue / interval)^exponent)`. `interval` = REUSE
 * `conversion.initialMaintenanceIntervalDays` (DD-M2 — NEVER a raw literal 30); `exponent` =
 * `maintenance.repairCostCurveExponent` — the SAME exponent D10's cost curve uses ("canon uses ONE
 * exponent for both curves", design §5).
 */
export function equipmentFailureOverdueFactor(daysOverdue: number): number {
  const interval = conversionTunables.initialMaintenanceIntervalDays;
  const exponent = maintenanceTunables.repairCostCurveExponent;
  return Math.max(0, Math.pow(daysOverdue / interval, exponent));
}

/**
 * D11/§5 — the WEEKLY roll's effective failure probability: `baseline(type[,tier]) × (1 + overdue_factor) ×
 * phase_mult`, clamped ≤0.95 (the sanity cap, BO-visible). `phase_mult` = 1 for `within_window`,
 * `equipmentFailureMultiplierSoft` (1.5) for `soft`, `equipmentFailureMultiplierHard` (3.0) for `hard`.
 * Returns `null` for an EXCLUDED type OR a `critical`-phase building (critical rolls DAILY instead, at a
 * FLAT `equipmentFailureCriticalDailyProb` — NOT this formula, D11).
 */
export function equipmentFailureWeeklyProbability(
  operationalType: M1OperationalType,
  equipmentTier: number,
  daysOverdue: number,
  lapsePhase: LapsePhase,
): number | null {
  if (lapsePhase === 'critical') return null; // handled by the daily roll instead (D11).
  const baseline = equipmentFailureBaselinePerWeek(operationalType, equipmentTier);
  if (baseline === null) return null; // EXCLUDED type — not rolled.
  const overdueFactor = equipmentFailureOverdueFactor(daysOverdue);
  const phaseMult =
    lapsePhase === 'hard'
      ? maintenanceTunables.equipmentFailureMultiplierHard
      : lapsePhase === 'soft'
        ? maintenanceTunables.equipmentFailureMultiplierSoft
        : 1;
  const p = baseline * (1 + overdueFactor) * phaseMult;
  return Math.min(0.95, p);
}

/** The result shape both roll orchestration methods return — the falsifiable idempotency-proof counts. */
export interface EquipmentFailureRollResult {
  /** How many buildings were READ as eligible OPERATIONAL candidates (before the skip-list/critical filter). */
  readonly candidates: number;
  /** How many candidates actually had a probability computed + an rng draw consumed (excludes skipped types / critical-for-weekly). */
  readonly rolled: number;
  /** How many draws FAILED → the atomic-5 fired (structural_state→'failed', a log row, an EquipmentFailedEvent). */
  readonly failed: number;
}

@Injectable()
export class EquipmentFailureService {
  private readonly logger = new Logger(EquipmentFailureService.name);

  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `EQUIPMENT_FAILURE_WEEKLY_TICK` (WEEKLY/11) — roll every OPERATIONAL, non-critical, non-excluded
   * building's weekly failure probability, seeded `(building_id, weekId)`. L1 natural: no eligible building
   * → `{candidates:0, rolled:0, failed:0}`, zero writes. Idempotent per game-week (design §4 seam-9 note):
   * the roll is a PURE function of `(building_id, weekId)`, and a building that fails on an earlier call
   * drops out of the OPERATIONAL candidate set on any later same-week call — no double-fail, no double log
   * row, without needing a stored "last rolled" column.
   */
  async rollWeeklyForPlayer(playerId: string, currentGameDay: number, weekId: number, gameMinute: number): Promise<EquipmentFailureRollResult> {
    const rows = await this.repo.listOperationalBuildingsForWeeklyFailureRoll(playerId);
    if (rows.length === 0) return { candidates: 0, rolled: 0, failed: 0 };

    let rolled = 0;
    let failed = 0;
    for (const row of rows) {
      const daysOverdue = this.phase.deriveDaysOverdue(currentGameDay, row.last_maintained_at_game_day, row.maintenance_due_in_days);
      const lapsePhase = this.phase.deriveLapsePhase(daysOverdue);
      const probability = equipmentFailureWeeklyProbability(row.operational_type, row.equipment_tier, daysOverdue, lapsePhase);
      if (probability === null) continue; // EXCLUDED type OR live-critical (the daily roll's job) — NOT rolled.

      rolled++;
      const seed = equipmentFailureWeeklySeed(row.building_id, weekId);
      const rng = makeRng(seed);
      const fails = rng.chance(probability);
      if (!fails) continue;

      const rollDetail = this.buildRollDetail({
        kind: 'weekly',
        seed,
        row,
        probability,
        daysOverdue,
        lapsePhase,
        rng,
      });
      const applied = await this.repo.applyEquipmentFailure({
        playerId,
        buildingId: row.building_id,
        operationalType: row.operational_type,
        failedAtGameDay: currentGameDay,
        lapsePhaseAtFailure: lapsePhase,
        rollDetail,
      });
      if (applied) {
        failed++;
        this.bus.emitEquipmentFailed({ type: 'equipment_failed', buildingId: row.building_id, playerId, gameMinute });
        this.logger.log(
          `rollWeeklyForPlayer: player=${playerId} building=${row.building_id} weekId=${weekId} FAILED ` +
            `(p=${probability.toFixed(4)}, phase=${lapsePhase}) → failure_id=${applied.failureId}`,
        );
      }
    }
    return { candidates: rows.length, rolled, failed };
  }

  /**
   * Wired into `MAINTENANCE_PHASE_TICK` (NIGHTLY/21, C2's tick — D11): rolls the FLAT
   * `equipmentFailureCriticalDailyProb` (8%) for every building_id the caller has ALREADY determined is
   * critical THIS tick (post phase-transition, post job-completion), seeded `(building_id, gameDay)`. Skips
   * the 3 EXCLUDED types (they are NEVER rolled, regardless of phase). `buildingIds` empty → zero-cost no-op.
   */
  async rollCriticalDailyForBuildings(
    playerId: string,
    buildingIds: readonly string[],
    currentGameDay: number,
    gameMinute: number,
  ): Promise<EquipmentFailureRollResult> {
    if (buildingIds.length === 0) return { candidates: 0, rolled: 0, failed: 0 };
    const candidates = await this.repo.getFailureRollCandidates(buildingIds);

    let rolled = 0;
    let failed = 0;
    for (const buildingId of buildingIds) {
      const row = candidates.get(buildingId);
      if (!row) continue; // defensive — building vanished between the caller's snapshot and this read.
      if (row.structural_state !== 'operational') continue; // belt-and-braces (e.g. a same-tick job completion raced it away).
      if (EQUIPMENT_FAILURE_EXCLUDED_TYPES.has(row.operational_type)) continue; // skip-list — NEVER rolled.

      rolled++;
      const probability = maintenanceTunables.equipmentFailureCriticalDailyProb; // FLAT 8% — NOT the weekly formula (D11).
      const seed = equipmentFailureCriticalDailySeed(buildingId, currentGameDay);
      const rng = makeRng(seed);
      const fails = rng.chance(probability);
      if (!fails) continue;

      const rollDetail = this.buildRollDetail({
        kind: 'critical_daily',
        seed,
        row,
        probability,
        daysOverdue: null,
        lapsePhase: 'critical',
        rng,
      });
      const applied = await this.repo.applyEquipmentFailure({
        playerId,
        buildingId,
        operationalType: row.operational_type,
        failedAtGameDay: currentGameDay,
        lapsePhaseAtFailure: 'critical',
        rollDetail,
      });
      if (applied) {
        failed++;
        this.bus.emitEquipmentFailed({ type: 'equipment_failed', buildingId, playerId, gameMinute });
        this.logger.log(
          `rollCriticalDailyForBuildings: player=${playerId} building=${buildingId} gameDay=${currentGameDay} ` +
            `FAILED (p=${probability.toFixed(4)}) → failure_id=${applied.failureId}`,
        );
      }
    }
    return { candidates: buildingIds.length, rolled, failed };
  }

  /**
   * BO/live-ops FORCE (C8, D12, design §10) — drives the REAL atomic failure transaction
   * (`MaintenanceRepository.applyEquipmentFailure`, the SAME "guarded flip + `equipment_failure_log`
   * INSERT" atomic-5 the weekly/critical rolls use) for an admin-chosen building, REGARDLESS of the D11
   * probability roll — an operator override, not a probabilistic draw ("not a state poke", design §10).
   * The seeded rng draws ONLY the repair-cost-estimate sub-roll (the SAME chained-draw shape
   * `buildRollDetail` uses for a natural roll, seeded `(buildingId, currentGameDay)` — D11, no
   * `Math.random`), so the resulting card is resolvable via REPAIR_IMMEDIATE/REPAIR_SLOW exactly like a
   * naturally-rolled failure (`EquipmentFailureExceptionRepository.getLatestFailureEstimate` reads
   * `roll_detail.repair_cost_estimate_cents` — a forced failure that omitted it would silently break
   * those 2 repair options, the ONE reason this reuses the SAME estimate-computation shape rather than a
   * bare log row).
   *
   * Guard: the building must exist for this player AND currently be `structural_state='operational'`
   * (mirrors the atomic-5's own guarded flip — an already-failed/converting/demolished building is
   * refused, NOT silently re-flipped). Returns null when the guard fails (caller 409s).
   */
  async forceFailBuilding(
    playerId: string,
    buildingId: string,
    currentGameDay: number,
    gameMinute: number,
  ): Promise<{ failureId: string; lapsePhase: LapsePhase } | null> {
    const target = await this.repo.getScheduleTargetState(playerId, buildingId);
    if (!target || target.structural_state !== 'operational') return null;

    const daysOverdue = this.phase.deriveDaysOverdue(
      currentGameDay,
      target.last_maintained_at_game_day,
      target.maintenance_due_in_days,
    );
    const lapsePhase = this.phase.deriveLapsePhase(daysOverdue);

    const seed = `equipment-failure-force-admin:${buildingId}:${currentGameDay}`;
    const rng = makeRng(seed);
    const costPct = rng.int(maintenanceTunables.repairCostPctOfSetupMin, maintenanceTunables.repairCostPctOfSetupMax);
    const referenceCents = groundedConversionCostCents(target.operational_type, target.cover_quality);
    const repairCostEstimateCents = Math.round(Number(referenceCents) * (costPct / 100));
    const rollDetail: Record<string, unknown> = {
      kind: 'force_admin',
      seed,
      forced_by_admin: true,
      operational_type: target.operational_type,
      lapse_phase: lapsePhase,
      days_overdue: daysOverdue,
      repair_cost_estimate_pct_of_setup: costPct,
      repair_cost_estimate_cents: repairCostEstimateCents,
      repair_time_days_min: maintenanceTunables.repairTimeDaysMin,
      repair_time_days_max: maintenanceTunables.repairTimeDaysMax,
    };

    const applied = await this.repo.applyEquipmentFailure({
      playerId,
      buildingId,
      operationalType: target.operational_type,
      failedAtGameDay: currentGameDay,
      lapsePhaseAtFailure: lapsePhase,
      rollDetail,
    });
    if (!applied) return null; // race-guard no-op (already non-operational) — caller 409s.

    this.bus.emitEquipmentFailed({ type: 'equipment_failed', buildingId, playerId, gameMinute });
    this.logger.log(
      `forceFailBuilding: player=${playerId} building=${buildingId} FORCED (admin, C8) → failure_id=${applied.failureId}`,
    );
    return { failureId: applied.failureId, lapsePhase };
  }

  /**
   * The `equipment_failure_log.roll_detail` trace (DD-M3 — BO-only diagnostics, R2.2 grep-zero
   * player-facing): baseline/factor/mult/probability/seed (the D11 determinism trace) PLUS a seeded
   * repair-cost ESTIMATE (`repair_cost_pct_of_setup_min..max`, drawn from the SAME rng stream — a chained
   * second draw, `.int()` after the `.chance()` that already fired — deterministic + reproducible from the
   * SAME seed) and the repair-TIME getters echoed verbatim (`repair_time_days_min/max` — the IMMEDIATE/SLOW
   * option durations, no roll needed since canon fixes them). The dedicated `repair_cost_cents`/
   * `repair_mode`/`repair_completes_at_tick` COLUMNS stay NULL until C5's resolve (the schema's own "NULL
   * until resolved" contract) — this estimate is diagnostics + the number C5's IMMEDIATE/SLOW handlers will
   * ground their actual debit on, not a premature commitment.
   */
  private buildRollDetail(params: {
    kind: 'weekly' | 'critical_daily';
    seed: string;
    row: FailureRollWeeklyCandidateRow | FailureRollDailyCandidateRow;
    probability: number;
    daysOverdue: number | null;
    lapsePhase: LapsePhase;
    rng: ReturnType<typeof makeRng>;
  }): Record<string, unknown> {
    const { kind, seed, row, probability, daysOverdue, lapsePhase, rng } = params;
    const costPct = rng.int(maintenanceTunables.repairCostPctOfSetupMin, maintenanceTunables.repairCostPctOfSetupMax);
    const referenceCents = groundedConversionCostCents(row.operational_type, row.cover_quality);
    const repairCostEstimateCents = Math.round(Number(referenceCents) * (costPct / 100));
    const baseline = equipmentFailureBaselinePerWeek(row.operational_type, row.equipment_tier);
    return {
      kind,
      seed,
      operational_type: row.operational_type,
      equipment_tier: row.equipment_tier,
      lapse_phase: lapsePhase,
      baseline_per_week: baseline,
      days_overdue: daysOverdue,
      overdue_factor: daysOverdue === null ? null : equipmentFailureOverdueFactor(daysOverdue),
      probability,
      repair_cost_estimate_pct_of_setup: costPct,
      repair_cost_estimate_cents: repairCostEstimateCents,
      repair_time_days_min: maintenanceTunables.repairTimeDaysMin,
      repair_time_days_max: maintenanceTunables.repairTimeDaysMax,
    };
  }
}

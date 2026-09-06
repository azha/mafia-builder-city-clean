// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C6 (Heat + Audit-pin couples —
//             the heat half: MAINTENANCE_NEGLECT weekly additive + EQUIPMENT_REPAIR nightly spike)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §7 (Heat + Audit-Pin
//             couples, D6/D7 — the failed-building write-path note this file's header resolves empirically)
//             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.7 (D7)
//             Pattern: services/game-back/src/operational/heat_contrib/heat-contrib.service.ts
//             (`emitGrowHeat` — the caller-resolves-the-magnitude-band shape this file's two emit methods
//             delegate to verbatim)
//             — 04f-A C6 — 2026-07-10
//
// `MaintenanceHeatService` — the D7 heat-coupling orchestration: reads the maintenance candidate sets (via
// `MaintenanceRepository`, REUSE — no new repository method for the weekly pass) and calls the EXISTING
// `HeatContribService.emitMaintenanceNeglectHeat`/`emitEquipmentRepairHeat` (C6's own two NEW thin wrappers
// over the canonical `CityEventBus.emitHeatInjection` pipe). This file WRITES NO HEAT ITSELF (R9.3 — consume
// the Heat engine, never reimplement decay/propagation/escalation) and does NOT touch
// `HeatPropagationService`'s internal delta map.
//
// ★ THE NEAREST-BAND MAPPING (D7): the HeatInjection pipe only ever carries ONE of the 4 PUBLISHED
// `HeatInjectionMagnitude` bands (MICRO=0.02/LOW=0.05/LOW_MEDIUM=0.12/MEDIUM=0.25 — heat-propagation.
// service.ts:123-128, mirrored below, NEVER imported: that map is a private module constant, and R9.3
// forbids touching it or inventing a 5th band). `maintenance.heat_additive_soft/hard_per_week` are registered
// NUMERIC getters (R2.3) whose shipped DEFAULTS (0.02/0.05) land EXACTLY on MICRO/LOW — `nearestHeatInjection
// Magnitude` maps ANY getter value onto its CLOSEST existing band, so the weekly heat pass stays getter-driven
// (not hardcoded — flipping a tunable across a band midpoint genuinely moves the emitted delta, the C6
// value-sensitivity proof) while never inventing a scalar the pipe cannot carry.
//
// ★ THE EMPIRICALLY-RESOLVED FAILED-BUILDING WRITE PATH (design §7 note, C6's own resolution): a source-level
// audit of every `.update(building)...set({ structural_state: ... })` call site (the CITY-STATE column,
// `db/schema/city_state.ts`'s `structuralState` pgEnum) found EXACTLY ONE write — DEMOLISH_REPLACE's
// `'demolished'` flip (`exceptions/equipment-failure-exception.repository.ts:189`). No code path EVER writes
// this column to 'damaged'/'failed'/'repairing' — those states live ONLY on the DISTINCT `building_operational
// _state.structural_state` column (the operational-chain column equipment-failure/raid flips). `HeatRepository
// .listBuildings` (heat.repository.ts:105), which gates the MINUTE/4 flush's candidate set, filters on the
// CITY-STATE column — so a failed/repairing building's CITY-STATE row stays 'operational' and REMAINS in the
// flush's candidate set. CONCLUSION: the EQUIPMENT_REPAIR spike lands DIRECTLY on the failed/repairing
// building's own building_id — no district-redirect is needed (the design §7 note's "if it can't" branch does
// not apply; the E2E floor (`maintenance_heat_auditpin.spec.ts` test (2)) asserts this OBSERVABLE outcome via
// a direct read of BOTH columns, then the landed heat delta — no silent drop, no unproven assumption).

import { Injectable, Logger } from '@nestjs/common';

import type { HeatInjectionMagnitude } from '../../citysim/events/city-event-bus';
import { HeatContribService } from '../heat_contrib/heat-contrib.service';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenancePhaseService, type LapsePhase } from './maintenance-phase.service';
import { maintenanceTunables } from './maintenance-tunables';

/** The 4 fixed deltas `HeatPropagationService`'s private `INJECTION_DELTA` map applies per band
 *  (heat-propagation.service.ts:123-128) — MIRRORED here (never imported — that map is module-private, and
 *  this file never touches decay/propagation internals, R9.3) so `nearestHeatInjectionMagnitude` can select
 *  the closest EXISTING band to a getter-driven raw per-week delta. Exported so the E2E can assert against
 *  the SAME table the production nearest-match function reads (DD-M4 — never a hand-typed constant). */
export const HEAT_INJECTION_BAND_DELTAS_FOR_TEST: Record<HeatInjectionMagnitude, number> = {
  MICRO: 0.02,
  LOW: 0.05,
  LOW_MEDIUM: 0.12,
  MEDIUM: 0.25,
};

/**
 * 04f-A C6 (D7) — nearest-match a getter-driven raw per-week heat delta onto the closed
 * `HeatInjectionMagnitude` band vocabulary (see the file header's ★ note). GETTER-DRIVEN, not hardcoded: at
 * the shipped defaults (`heat_additive_soft_per_week`=0.02 / `_hard_per_week`=0.05) this lands EXACTLY on
 * MICRO/LOW; flipping either tunable across a band midpoint moves the emitted delta (the C6 value-sensitivity
 * proof). Exported so the E2E precompute-proof imports the SAME function the server runs (DD-M4 — never a
 * hand-typed band).
 */
export function nearestHeatInjectionMagnitude(delta: number): HeatInjectionMagnitude {
  let best: HeatInjectionMagnitude = 'MICRO';
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const band of Object.keys(HEAT_INJECTION_BAND_DELTAS_FOR_TEST) as HeatInjectionMagnitude[]) {
    const diff = Math.abs(HEAT_INJECTION_BAND_DELTAS_FOR_TEST[band] - delta);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = band;
    }
  }
  return best;
}

/** The closed `HeatInjectionMagnitude` vocabulary as a Set, for validating a raw band-string tunable. */
const VALID_MAGNITUDE_BANDS = new Set<string>(Object.keys(HEAT_INJECTION_BAND_DELTAS_FOR_TEST));

@Injectable()
export class MaintenanceHeatService {
  private readonly logger = new Logger(MaintenanceHeatService.name);

  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly heatContrib: HeatContribService,
  ) {}

  /**
   * 04f-A C6 (D7) — weekly MAINTENANCE_NEGLECT heat: for every OPERATIONAL building whose LIVE-derived lapse
   * phase (the D1 anchor pair — NEVER the cached `lapse_phase` column: this tick's own cadence (WEEKLY/11) is
   * separately scheduled from `MAINTENANCE_PHASE_TICK` (NIGHTLY/21), which owns that cache, so trusting it
   * here would risk a one-tick lag on any test/scenario that drives this tick without ALSO having run the
   * nightly one first — the SAME "derive live" discipline the D5 output-multiplier fold + the D11
   * equipment-failure roll already apply) is SOFT or HARD/CRITICAL, emit ONE MAINTENANCE_NEGLECT injection at
   * the nearest-band `heat_additive_soft_per_week` (SOFT) / `heat_additive_hard_per_week` (HARD+CRITICAL)
   * delta. Called from `EquipmentFailureWeeklyTickService.runWeeklyTick` (WEEKLY/11 — the ONE existing WEEKLY
   * cadence slot; D7 registers NO new one). REUSES the SAME batched candidate read the weekly failure roll
   * already performs (`MaintenanceRepository.listOperationalBuildingsForWeeklyFailureRoll`) — no per-row
   * query, no new repository method. Returns the per-band injection counts (the falsifiable "soft vs hard
   * differ" proof + the idempotency-inspection shape every other tick method returns). Organically a no-op
   * for a fully-maintained fleet (byte-identical — zero injections, the §13 contract).
   */
  async emitWeeklyNeglectHeat(playerId: string, currentGameDay: number, gameMinute: number): Promise<{ soft: number; hard: number }> {
    const candidates = await this.repo.listOperationalBuildingsForWeeklyFailureRoll(playerId);
    const softIds: string[] = [];
    const hardIds: string[] = [];
    for (const c of candidates) {
      const daysOverdue = this.phase.deriveDaysOverdue(currentGameDay, c.last_maintained_at_game_day, c.maintenance_due_in_days);
      const lapsePhase: LapsePhase = this.phase.deriveLapsePhase(daysOverdue);
      if (lapsePhase === 'soft') softIds.push(c.building_id);
      else if (lapsePhase === 'hard' || lapsePhase === 'critical') hardIds.push(c.building_id);
    }
    if (softIds.length > 0) {
      await this.heatContrib.emitMaintenanceNeglectHeat(
        playerId,
        softIds,
        nearestHeatInjectionMagnitude(maintenanceTunables.heatAdditiveSoftPerWeek),
        gameMinute,
      );
    }
    if (hardIds.length > 0) {
      await this.heatContrib.emitMaintenanceNeglectHeat(
        playerId,
        hardIds,
        nearestHeatInjectionMagnitude(maintenanceTunables.heatAdditiveHardPerWeek),
        gameMinute,
      );
    }
    this.logger.log(
      `MAINTENANCE_NEGLECT weekly heat: player=${playerId} day=${currentGameDay} → ${softIds.length} soft-band + ` +
        `${hardIds.length} hard/critical-band injection(s) (D7).`,
    );
    return { soft: softIds.length, hard: hardIds.length };
  }

  /**
   * 04f-A C6 (D7) — nightly EQUIPMENT_REPAIR repair-window spike: for every building currently
   * `structural_state ∈ {'failed','repairing'}`, emit ONE EQUIPMENT_REPAIR injection at the
   * `maintenance.failure_repair_heat_magnitude_band` getter (a direct band-string tunable, [PROV-Y26Q2] — no
   * nearest-match needed). Called from `MaintenancePhaseTickService.runNightlyTick` (NIGHTLY/21 — the ONE
   * existing NIGHTLY cadence slot; D7 registers NO new one). The file header's ★ note documents the
   * empirically-resolved write path: the spike lands DIRECTLY on the failed/repairing building's own
   * building_id (no district-redirect). Returns the injection count (the idempotency-inspection shape).
   * Organically a no-op (no failure/repair in flight — the §13 contract). NOT dedup-gated per game-day (unlike
   * the C5 exception re-emission): a building under repair for N days is INTENDED to keep drawing attention
   * each night it stays failed/repairing (design §7 — "repair-window injections while failed/repairing"), the
   * SAME continuous-accrual shape `emitCookHeat`'s STORAGE sibling already uses per-MINUTE.
   */
  async emitNightlyRepairSpike(playerId: string, gameMinute: number): Promise<number> {
    const buildingIds = await this.repo.listFailedOrRepairingBuildingIds(playerId);
    if (buildingIds.length === 0) return 0;
    const magnitude = this.repairSpikeMagnitude();
    await this.heatContrib.emitEquipmentRepairHeat(playerId, buildingIds, magnitude, gameMinute);
    this.logger.log(
      `EQUIPMENT_REPAIR nightly spike: player=${playerId} → ${buildingIds.length} failed/repairing building(s) injected (D7, band=${magnitude}).`,
    );
    return buildingIds.length;
  }

  /**
   * Validate `maintenance.failure_repair_heat_magnitude_band` against the closed `HeatInjectionMagnitude`
   * vocabulary (defense-in-depth against a bad DB override — `TunablesStore.resolveString` has no CAPS-map
   * clamp for a string key, mirrors the `MAINTENANCE_TUNABLE_CAPS` exclusion note in maintenance-tunables.ts).
   * Falls back to 'MEDIUM' (the registered default) for anything outside the 4-member closed domain.
   */
  private repairSpikeMagnitude(): HeatInjectionMagnitude {
    const raw = maintenanceTunables.failureRepairHeatMagnitudeBand;
    return VALID_MAGNITUDE_BANDS.has(raw) ? (raw as HeatInjectionMagnitude) : 'MEDIUM';
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C2 (Phase-progression engine, D5
//             output fold) + C3 (Player actions — D10 one-curve pricing)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §4 (Phase-progression
//             engine — the derivation formula + the overdue-offset thresholds + the D5 output-multiplier
//             closed-form + the day-91≈31.5% worked example) + §9 (Player actions & endpoints — D10)
//             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.5 (D5 —
//             multiplicative weekly compounding, the additive-vs-multiplicative reading argument) + §2.2
//             (DD-M2 — the phase thresholds in overdue-offset form) + §1.10 (D10 — the one pricing curve)
//             — 04f-A C2 — 2026-07-10 | C3 extension — 2026-07-10 (maintenanceScheduleCostCents, D10)
//
// `MaintenancePhaseService` — the PURE, DETERMINISTIC D1/D5/D10 derivation (the sibling of AshPurityService /
// GrowYieldService: no persistence, no RNG, reads ONLY the maintenance/conversion tunable registries). Four
// pure functions:
//   - deriveDaysOverdue(currentGameDay, lastMaintainedAtGameDay, maintenanceDueInDays) — D1: how many
//     game-days PAST the per-building due date (0 = on-time / early — "overdue" has no negative meaning).
//   - deriveLapsePhase(daysOverdue) — the 4-phase bucket (within_window/soft/hard/critical), compared
//     against the OVERDUE-OFFSET thresholds (DD-M2: the canon absolute-day thresholds minus the REGISTERED
//     baseline maintenance window, so a tuned per-building interval still lapses coherently).
//   - maintenanceOutputMultiplier(daysOverdue) — D5: the multiplicative weekly-compounding output-yield
//     factor (soft_mult^w_soft × hard_mult^w_hard, pro-rata CONTINUOUS weeks — no day-boundary cliffs);
//     critical phase = the FIXED `output_ceiling_critical_pct` ceiling (NOT the — lower — compounding
//     value: canon "drops to 30% output ceiling" reads as a clamp the curve settles onto, not a floor it
//     keeps falling past — decisions §1.5's day-91≈31.5% worked example land ABOVE the 30% ceiling, so the
//     fixed clamp is what actually bites). Exactly 1.0 at daysOverdue < the soft offset (within_window) —
//     the C2 zero-regression contract every fold site relies on.
//   - maintenanceScheduleCostCents(daysOverdue, operationalType, coverQuality) — D10 (C3): the ONE
//     scheduled/emergency maintenance pricing curve, floored at the emergency multiplier while overdue (no
//     separate emergency branch — "one curve, no double-count").
//
// Consumed by: MaintenancePhaseTickService (the NIGHTLY/21 tick — phase persistence, C2),
// ProductionCookAdvanceService (the output fold at production-cook-advance.service.ts:178, C2),
// GrowAdvanceService (the grow-harvest fold, C2), RealEstateProjectionService (the R2.2 LapsePhaseBucket +
// days_until_maintenance_due projection, C2), MaintenanceService (scheduleMaintenance / applyMassSchedule —
// the D10 pricing call site, C3). Every consumer reads the SAME derivation functions — no site
// re-implements the formula (the 04e-A1 "mur C5" discipline: ONE formula, many fold sites, all provably
// identical — the anti-fig-leaf mandate).

import { Injectable } from '@nestjs/common';

import { maintenanceTunables } from './maintenance-tunables';
import {
  conversionTunables,
  groundedConversionCostCents,
  type CoverQuality,
  type M1OperationalType,
} from '../real_estate/conversion-tunables';

/** The 4-phase lapse bucket (D1) — mirrors the `building_lapse_phase` pgEnum values verbatim (R9.3). */
export type LapsePhase = 'within_window' | 'soft' | 'hard' | 'critical';

/** The 3 overdue-DAY offsets (DD-M2) the phase/output derivations compare `daysOverdue` against. */
export interface PhaseOffsets {
  readonly soft: number;
  readonly hard: number;
  readonly critical: number;
}

/** Clamp `x` to `[lo, hi]` — the pro-rata band-width helper `maintenanceOutputMultiplier` uses twice. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

@Injectable()
export class MaintenancePhaseService {
  /**
   * D1 — days PAST the per-building due date (`maintenanceDueInDays` game-days after
   * `lastMaintainedAtGameDay`). Never negative ("overdue" has no negative meaning — an early/on-time
   * building is 0). `lastMaintainedAtGameDay === null` (a building with no anchor yet — defensively
   * unreachable for a genuinely OPERATIONAL building; C1 stamps the anchor at conversion-complete, and
   * every consumption site here gates on an OPERATIONAL building) is treated as "just maintained" (0
   * overdue) — the SAFE, zero-regression-preserving default; it never throws.
   */
  deriveDaysOverdue(
    currentGameDay: number,
    lastMaintainedAtGameDay: number | null,
    maintenanceDueInDays: number,
  ): number {
    if (lastMaintainedAtGameDay === null) return 0;
    const daysSince = currentGameDay - lastMaintainedAtGameDay;
    const daysUntilDue = maintenanceDueInDays - daysSince;
    return Math.max(0, -daysUntilDue);
  }

  /**
   * D1 — the SIGNED days until the per-building due date (design §4's own `days_until_due` term — negative
   * when overdue). Distinct from `deriveDaysOverdue` (which floors at 0): this is the R2.2 player-facing
   * `days_until_maintenance_due` projection field AND the future DSL auto-schedule signal (C7,
   * `STATE(days_until_maintenance_due, <=, auto_schedule_window_before_due_days)` — the comparison needs
   * the signed form so an overdue building still reads "very due", not clamped to 0).
   */
  deriveDaysUntilDue(
    currentGameDay: number,
    lastMaintainedAtGameDay: number | null,
    maintenanceDueInDays: number,
  ): number {
    if (lastMaintainedAtGameDay === null) return maintenanceDueInDays;
    const daysSince = currentGameDay - lastMaintainedAtGameDay;
    return maintenanceDueInDays - daysSince;
  }

  /**
   * DD-M2 — the overdue-day offsets the phase/output derivations compare `daysOverdue` against, converted
   * from the canon ABSOLUTE-day thresholds (`lapse_soft/hard/critical_..._start_day` — registered verbatim
   * from canon, defaults 31/46/91) by subtracting the REGISTERED baseline maintenance window
   * (`conversion.initial_maintenance_interval_days`, default 30 — "the same canon table's window row",
   * DD-M2 — NEVER a raw literal 30). At the default window this yields 1/16/61; if the window tunable is
   * ever retuned the offsets move WITH it (a 45-day-interval building still lapses 1 day after ITS OWN due
   * date, not at the canon-absolute day 31 while still inside its window — DD-M2's own worked example).
   */
  derivePhaseOffsets(): PhaseOffsets {
    const baseline = conversionTunables.initialMaintenanceIntervalDays;
    return {
      soft: maintenanceTunables.lapseSoftDegradationStartDay - baseline,
      hard: maintenanceTunables.lapseHardDegradationStartDay - baseline,
      critical: maintenanceTunables.lapseCriticalStartDay - baseline,
    };
  }

  /** D1 — the 4-phase bucket a given `daysOverdue` falls in (compared against `derivePhaseOffsets()`). */
  deriveLapsePhase(daysOverdue: number): LapsePhase {
    const { soft, hard, critical } = this.derivePhaseOffsets();
    if (daysOverdue >= critical) return 'critical';
    if (daysOverdue >= hard) return 'hard';
    if (daysOverdue >= soft) return 'soft';
    return 'within_window';
  }

  /**
   * D5 — the output-yield multiplier folded at every yield-fold site (production-cook-advance.service.ts:178
   * + the grow-harvest equivalent): multiplicative weekly compounding `soft_mult^w_soft × hard_mult^w_hard`
   * (pro-rata CONTINUOUS weeks spent in each band — decisions §1.5, "no day-boundary cliffs"); the critical
   * phase returns the FIXED `output_ceiling_critical_pct` ceiling (NOT the — lower — compounding value:
   * canon "drops to 30% output ceiling" reads as a clamp the curve settles onto, not a floor it keeps
   * falling past — at daysOverdue = the critical offset the raw compounded value is ≈31.5% > the 30%
   * ceiling, decisions §1.5's own worked example, so returning the FIXED ceiling is the strictly-lower,
   * canon-honest reading). Exactly 1.0 when daysOverdue is below the soft offset (within_window) — the C2
   * zero-regression contract every fold site relies on (§13 of the design).
   */
  maintenanceOutputMultiplier(daysOverdue: number): number {
    const { soft, hard, critical } = this.derivePhaseOffsets();
    if (daysOverdue < soft) return 1.0; // within_window — byte-identical (zero-regression contract).
    if (daysOverdue >= critical) return maintenanceTunables.outputCeilingCriticalPct / 100; // FIXED ceiling.
    const softMult = 1 + maintenanceTunables.outputReductionSoftPctPerWeek / 100; // e.g. -5 → 0.95.
    const hardMult = 1 + maintenanceTunables.outputReductionHardPctPerWeek / 100; // e.g. -15 → 0.85.
    const wSoftWeeks = (clamp(daysOverdue, soft, hard) - soft) / 7;
    const wHardWeeks = (clamp(daysOverdue, hard, critical) - hard) / 7;
    return Math.pow(softMult, wSoftWeeks) * Math.pow(hardMult, wHardWeeks);
  }

  /**
   * D10 — the ONE pricing curve for scheduled/emergency maintenance (C3), in CENTS (bigint, the
   * `economy_states.cash_cents` convention). No separate "emergency" branch (decisions §1.10 — "one curve, no
   * double-count"): `emergency` is ALWAYS derived from `daysOverdue > 0`, never from client input (R2.2 —
   * price is never client-influenced).
   *
   * `base = maintenance.schedule_cost_pct_of_setup/100 × the BUILDING'S OWN M1 setup/conversion-cost
   * reference` (`groundedConversionCostCents(operationalType, coverQuality)` — REUSE, the SAME
   * `acquisitionPriceCents`/`repairCostCents` money convention, rounded to the nearest cent).
   *
   * `cost(d) = base × max(curveMultiplier(d), d > 0 ? emergencyMultiplier : 1)` where
   * `curveMultiplier(d) = 1 + 0.5·(d / interval)^exponent` (`interval` = REUSE
   * `conversion.initialMaintenanceIntervalDays` — NEVER a raw literal 30, the DD-M2 discipline; `exponent` =
   * `maintenance.repairCostCurveExponent`, the SAME exponent D11's `overdue_factor` uses) and
   * `emergencyMultiplier` = `maintenance.emergencyMaintenanceCostMultiplier`. At `daysOverdue = 0`,
   * `curveMultiplier = 1.0` exactly → `cost = base` (the D14 baseline "$X cost", no floor — `emergency` is
   * false). At the shipped defaults (interval=30, exponent=1.5, emergencyMultiplier=1.5) this lands on the
   * exact factors `{1.0, 1.5, ≈2.4142, ≈3.5981}` at `{0, 30, 60, 90}` days overdue (decisions §1.10 — the
   * canon-derived residual vs the table `{1.0, 1.5, 2.5, 4.0}`, sub-decision #4).
   *
   * Rounds to the nearest cent (`Math.round`) — DETERMINISTIC, no RNG.
   */
  maintenanceScheduleCostCents(
    daysOverdue: number,
    operationalType: M1OperationalType,
    coverQuality: CoverQuality,
  ): bigint {
    const referenceCents = groundedConversionCostCents(operationalType, coverQuality);
    const baseCents = Math.round(Number(referenceCents) * (maintenanceTunables.scheduleCostPctOfSetup / 100));
    const interval = conversionTunables.initialMaintenanceIntervalDays; // DD-M2 — never a raw literal 30.
    const exponent = maintenanceTunables.repairCostCurveExponent;
    const curveMultiplier = 1 + 0.5 * Math.pow(daysOverdue / interval, exponent);
    const emergency = daysOverdue > 0;
    const floorMultiplier = emergency ? maintenanceTunables.emergencyMaintenanceCostMultiplier : 1;
    const costMultiplier = Math.max(curveMultiplier, floorMultiplier);
    return BigInt(Math.round(baseCents * costMultiplier));
  }
}

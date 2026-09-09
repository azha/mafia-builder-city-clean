// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — enforcement / raid
//             (the `operational.repair.*` registry keys, added Phase-2b T0) +
//             docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §7 (config & tunables, R2.3) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention — ratio × the
//             STANDARD-cover reference conversion cost, REUSE real_estate.acquisition_cost_ratio /
//             precursors.pyralin_unit_price_ratio)
//             -- session:2026-06-04 (Phase 2b Task 3) --
//
// Repair (enforcement — Phase-2b vector #1 recovery) tunables — the `operational.repair.*` keys THIS slice's
// RepairService (T3) CONSUMES: the REPAIR COST RATIO (the cash cost of repairing a DAMAGED building, as a ratio of the
// M1 conversion-cost reference) + the REPAIR DURATION in MINUTE-ticks (how long the building stays 'repairing' before
// the OPERATIONAL_REPAIR tick flips it back to 'operational'). Phase-2b T3 = a player REPAIR action returns a raided
// (DAMAGED) building to operational (cash + N ticks): debit economy_states atomically guarded → structural_state =
// 'repairing' + repair_completes_at_tick = current_tick + duration → the OPERATIONAL_REPAIR tick flips repairing →
// operational at the completion tick (cook then resumes — composes with the T2 gate).
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Operational chain —
// enforcement / raid (cited per key, with the upstream design-spec source). They are surfaced as env-overridable
// fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry values change, update
// this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). The contextual modulation (political CRACKDOWN /
// per-tier / per-district + the per-gravity scaling) is a DEFERRED documented seam (design §6/§11) — these are the
// flat global base values.
//
// ── THE REPAIR-COST GROUNDING (operational.repair.cost_ratio — gdd/14 §Operational chain — enforcement / raid). The
//    cash cost of repairing a DAMAGED building = ratio × the M1 conversion-cost REFERENCE (the SAME money convention
//    as real_estate.acquisition_cost_ratio / precursors.pyralin_unit_price_ratio): ratio × conversion.base_cost_
//    standard_min ($15000 reference STANDARD-cover). cost_cents = round(ratio × base_cost_standard_min × 100). Default
//    0.3 → $4500 (≈30% of the setup cost: a significant but recoverable penalty, NOT a total building loss). Range
//    0..2 (a ratio). `[PROV-Y26Q2]` — provisional, to calibrate downstream.
//
// ── THE REPAIR DURATION (operational.repair.duration_ticks — gdd/14 §Operational chain — enforcement / raid). The
//    number of MINUTE-ticks the building stays 'repairing' before completion: repair_completes_at_tick = current_tick
//    + this. Default 12 = aligned on the test cook cycle (COOK_STAGES × cook_stage_duration_ticks) — "about one cook
//    session" so the DAMAGED pause bites without blocking indefinitely. Range 1..1440. `[PROV-Y26Q2]`. The per-tier /
//    per-raid-gravity scaling is a DEFERRED seam. TEST-only override: OPERATIONAL_REPAIR_DURATION_TICKS (the same
//    test-only fast-knob convention OPERATIONAL_DAY_LENGTH_MINUTES / SUBSTANCE_BRINDLE_COOK_STAGE_DURATION_TICKS use —
//    NEVER the prod default; the env var is unset in prod/dev, so default behavior is byte-for-byte unchanged).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';
import { groundedConversionCostCents } from '../real_estate/conversion-tunables';

/**
 * The grounded REPAIR-COST DEBIT amount in CENTS — the wallet-affecting step of the repair action. M1 grounding
 * (the SAME money convention as real_estate.acquisitionPriceCents): cost = operational.repair.cost_ratio × the
 * STANDARD-cover REFERENCE conversion cost (groundedConversionCostCents(..., 'standard') — a deterministic reference
 * independent of the building's actual type/cover). To stay type-agnostic (a raid DAMAGES a lab/stash; the repair is a
 * flat structural-recovery cost, NOT a re-conversion) the reference is the BASE STANDARD-cover cost with NO per-type
 * multiplier — we pass 'stash' (multiplier 1.0) so the reference = conversion.base_cost_standard_min ($15000), exactly
 * as gdd/14 documents (`ratio × conversion.base_cost_standard_min`). cost_cents = round(ratio × reference_cents).
 * DETERMINISTIC (the reference cost × a fixed ratio, no RNG). Returns a bigint (cents) for the economy_states.cash_cents
 * bigint column. R2.3 — the only values are the gdd/14 ratio + the REUSED conversion reference (no inline literal).
 */
export function repairCostCents(): bigint {
  // 'stash' carries NO per-type cost multiplier (only LAB/REFINERY do), so groundedConversionCostCents('stash',
  // 'standard') = conversion.base_cost_standard_min × 1.0 × 100 = the exact $15000 STANDARD-cover reference gdd/14
  // names for the repair-cost ratio. (lab would apply the ×4 multiplier — NOT what the registry key references.)
  const referenceCostCents = groundedConversionCostCents('stash', 'standard');
  const priceCents = Math.round(repairTunables.costRatio * Number(referenceCostCents));
  return BigInt(priceCents);
}

/**
 * Resolved repair tunables. Both keys are REUSE from gdd/14 §Operational chain — enforcement / raid (the cost ratio →
 * the guarded debit; the duration → repair_completes_at_tick). R2.3 — NOT inline.
 * DB-override > env > default (Phase-23).
 */
export const repairTunables = {
  /**
   * operational.repair.cost_ratio — the repair cash cost as a ratio of the M1 conversion-cost reference (× the
   * STANDARD-cover base_cost_standard_min, the same convention as real_estate.acquisition_cost_ratio). Default 0.3
   * → $4500. Env override: OPERATIONAL_REPAIR_COST_RATIO (test-only). Consumed by RepairService.repair() (the guarded
   * economy_states debit amount, via repairCostCents()). (DB-override > env > default — Phase-23).
   */
  get costRatio(): number {
    return TunablesStore.resolveFloat('operational.repair.cost_ratio', 'OPERATIONAL_REPAIR_COST_RATIO', 0.3);
  },
  /**
   * operational.repair.duration_ticks — the repair duration in MINUTE-ticks (repair_completes_at_tick = current_tick
   * + this). Default 12 (≈ one cook cycle). Env override: OPERATIONAL_REPAIR_DURATION_TICKS (test-only fast knob —
   * NEVER the prod default; the E2E shrinks it so the repair-completion advance stays fast). Consumed by
   * RepairService.repair() + the OPERATIONAL_REPAIR tick. (DB-override > env > default — Phase-23).
   */
  get durationTicks(): number {
    return TunablesStore.resolveInt('operational.repair.duration_ticks', 'OPERATIONAL_REPAIR_DURATION_TICKS', 12);
  },
};

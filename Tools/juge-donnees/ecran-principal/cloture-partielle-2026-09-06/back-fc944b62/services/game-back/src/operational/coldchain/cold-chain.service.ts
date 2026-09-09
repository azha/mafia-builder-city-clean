// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Crick — cold-chain stimulant
//             (Crick must be kept cold; a cold building / refrigerated van preserves it, a warm building / a normal
//             courier degrades it) + docs/tech/02_fictional_world/substance_secondary.md §Vue d'ensemble
//             ("Oui (< 4°C)" — Crick is the cold-chain substance) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the temperature_status is a closed
//             read-time BAND, never a raw °C) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state.cold_storage_capable
//             + vehicle_type pgEnum 'refrigerated_van' — R9.3, READ never redefined)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 5) --
//
// `ColdChainService` — the DERIVATION of a Crick holding's / cargo's `temperature_status` (Step 1). It is a PURE
// function of (substance × where it sits): a holding in a cold_storage_capable building is OPTIMAL_COLD, in any other
// building MODERATE (ambient indoor); a cargo on a refrigerated_van courier is OPTIMAL_COLD, on any other vehicle HOT
// (in-transit exposure). The status is a CLOSED qualitative band (OPTIMAL_COLD / MODERATE / HOT — R2.2): it is DERIVED
// at read-time from the persisted cold_storage_capable flag / vehicle_type, NOT a persisted temperature column, and it
// NEVER carries a raw °C (the continuous-temperature model is DEFERRED — the M1 derivation is categorical).
//
// COLD-CHAIN APPLIES ONLY TO `coldChain=true` SUBSTANCES (the substance registry — Crick true, Brindle false). A
// Brindle holding/cargo has NO temperature_status (it is not cold-chain): the derivation returns null for it, so the
// projection surfaces null/absent rather than a band, and the degrade tick never touches it. This is the single seam
// the whole T5 slice keys off — Brindle is behavior-preserved because `coldChain=false` short-circuits everywhere.

import { Injectable } from '@nestjs/common';

import { substanceDescriptor } from '../substance/substance-config';

/** The refrigerated vehicle that keeps a Crick cargo cold in transit (vehicle_type pgEnum member — schema §2). */
export const REFRIGERATED_VEHICLE_TYPE = 'refrigerated_van';

/**
 * The closed temperature-status band — the ONLY temperature signal exposed (R2.2). OPTIMAL_COLD = kept cold (a
 * cold_storage_capable building / a refrigerated_van courier — Crick preserved); MODERATE = ambient indoor (a non-cold
 * building — Crick degrades slowly); HOT = exposed in transit (a non-refrigerated courier — Crick degrades fast). NO
 * raw °C ever escapes this band.
 */
export type TemperatureStatus = 'OPTIMAL_COLD' | 'MODERATE' | 'HOT';

@Injectable()
export class ColdChainService {
  /**
   * Whether a substance is subject to the cold chain at all (the registry's `coldChain` trait — Crick true, Brindle
   * false; an unconfigured Hush/Ash → false defensively). The single gate the whole T5 slice keys off: a non-cold-chain
   * substance has no temperature_status and is never degraded.
   */
  isColdChain(substance: string): boolean {
    return substanceDescriptor(substance)?.coldChain === true;
  }

  /**
   * Derive the temperature_status of a STORED Crick holding from its building's cold-storage capability (Step 1).
   * Returns OPTIMAL_COLD when the building is cold_storage_capable (a refinery — cold by nature — or a cold-opted
   * stash), else MODERATE (ambient indoor storage). Returns null for a NON-cold-chain substance (Brindle) — it has no
   * temperature_status. A closed band (R2.2 — no raw °C). Deterministic, categorical (no continuous temperature).
   */
  holdingTemperatureStatus(substance: string, coldStorageCapable: boolean): TemperatureStatus | null {
    if (!this.isColdChain(substance)) return null; // Brindle / non-cold-chain → no temperature_status.
    return coldStorageCapable ? 'OPTIMAL_COLD' : 'MODERATE';
  }

  /**
   * Derive the temperature_status of an IN-TRANSIT Crick cargo from its courier's vehicle_type (Step 1). Returns
   * OPTIMAL_COLD when the vehicle is a refrigerated_van (the cold-chain in transit), else HOT (an ordinary foot/bike/car
   * courier exposes the cargo — the critical regime). Returns null for a NON-cold-chain substance (Brindle). A closed
   * band (R2.2 — no raw °C). Deterministic, categorical.
   */
  cargoTemperatureStatus(substance: string, vehicleType: string): TemperatureStatus | null {
    if (!this.isColdChain(substance)) return null; // Brindle / non-cold-chain → no temperature_status.
    return vehicleType === REFRIGERATED_VEHICLE_TYPE ? 'OPTIMAL_COLD' : 'HOT';
  }

  /**
   * Whether a derived temperature_status means the holding/cargo is actively DEGRADING (the projection's `degrading`
   * flag — a boolean band, R2.2). True for MODERATE / HOT (warm — losing grams each COLD_CHAIN tick), false for
   * OPTIMAL_COLD (preserved) and for null (not a cold-chain substance — Brindle never degrades). NEVER the raw rate.
   */
  isDegrading(status: TemperatureStatus | null): boolean {
    return status === 'MODERATE' || status === 'HOT';
  }
}

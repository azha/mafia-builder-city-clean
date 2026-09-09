// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §Stage 1 — Solvent prep
//             (`production.brindle.stage_1_pyralin_liters_per_batch` = composite:precursor_qty_pyralin — the
//             UNGROUNDED precursor-quantity composite this file grounds for M1) + §Vue d'ensemble du pipeline 4-stage
//             (the 4 functional stages stage_1→stage_4) + §Per-cook output et lab tiers
//             (`production.brindle.tier_1_standard_output_g_per_cook` = 200 — the GROUNDED Tier-1 yield this file
//             REUSES) + §Note divergence GDD ↔ tunable existant (the dev-fast uniform per-stage duration) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Substances
//             (`substance.brindle.cook_stages`=4 / `substance.brindle.cook_stage_duration_ticks`=30 — REUSE) +
//             §Operational chain — production (the registry)
//             -- session:2026-06-03 (Phase 2 Task 3) --
//
// Production (Brindle cook — M1) tunables — the `production.brindle.*` + `substance.brindle.*` keys THIS slice's OWN
// logic CONSUMES: the per-batch Pyralin consumption (startCook debit on precursor_stock), the per-stage tick clock
// (the COOK_ADVANCE tick), and the per-cook product yield. Phase-2 M1 = the LEGITIMATE 4-stage Brindle cook ONLY,
// consuming ONLY Pyralin (Thalmite Stage 2 / Garnet salt Stage 3 sourcing is NOT yet implemented — T2 sourced only
// Pyralin; the secondary-precursor consumption, the stage knobs [solvent/reaction temp, ventilation, disposal], the
// stage_2_intermediate decay window, equipment-tier upgrade mechanics, byproducts / Discard Signature, the cut-margin
// economic model, and the Operator behavior script are ALL DEFERRED — YAGNI).
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from gdd/14 (cited
// per key, with the upstream production_brindle.md / substance_brindle.md source line). They are surfaced as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry
// values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE PYRALIN-PER-BATCH GROUNDING (the precursor-consuming step — production_brindle.md §Stage 1: "Pyralin
//    (`production.brindle.stage_1_pyralin_liters_per_batch` L par batch)"). gdd/14 carries
//    `production.brindle.stage_1_pyralin_liters_per_batch` as `composite:precursor_qty_pyralin` — an UNGROUNDED
//    composite (no scalar; the full per-batch input model is a P5 composite by design). To CONSUME a concrete integer
//    quantity from precursor_stock.quantity_units (the T2 unit), the M1 batch size is grounded as a small integer
//    `production.brindle.pyralin_units_per_batch` (the SAME "units" the T2 Pyralin order/stock uses, NOT liters — M1
//    keeps a single discrete unit). "1 batch" in startCook = this many Pyralin units consumed. The genuinely-NEW
//    tunable of T3 (R2.3). `[PROV-Y26Q2]`. Default 2 units/batch (a small whole batch the T2 sourcing comfortably
//    covers). The liters↔units reconciliation + the secondary precursors are DEFERRED.
//
// ── THE YIELD (GROUNDED — production_brindle.md §Per-cook output: "Output nominal Tier-1, cut STANDARD:
//    `production.brindle.tier_1_standard_output_g_per_cook` g"). gdd/14 carries
//    `production.brindle.tier_1_standard_output_g_per_cook` = 200 (g) — a GROUNDED scalar. M1 yields this FLAT Tier-1
//    output per completed cook (the equipment-tier upgrade model that scales the yield Tier-1→Tier-5 is DEFERRED —
//    YAGNI; M1 treats every lab as Tier-1). No NEW yield tunable (REUSE).
//
// ── THE STAGE CLOCK (GROUNDED — substance_brindle.md / gdd/14 §Substances). `substance.brindle.cook_stages` = 4 (the
//    4 functional stages stage_1→stage_4). `substance.brindle.cook_stage_duration_ticks` = 30 (the dev-fast UNIFORM
//    per-stage duration in game-minute ticks — production_brindle.md §Note divergence adopts this uniform value as
//    the dev-fast default; the per-stage prose durations [Stage 1=4h, …] are the fuller model, DEFERRED). Total cook
//    cycle = cook_stages × cook_stage_duration_ticks = 4 × 30 = 120 game-minute ticks. No NEW tunable (REUSE).

import { TunablesStore } from '../../config/tunables-store';

/** The Phase-2 M1 substance domain (M1 = the legitimate Brindle cook ONLY — a subset of the 4-member enum). */
export type M1SubstanceType = 'brindle';

/**
 * The M1 DETERMINISTIC output quality defaults (production_brindle.md §Stage 4 / §Per-cook output). M1 picks fixed
 * defaults for determinism (NO RNG): the cook yields STANDARD purity_grade at the STANDARD cut bucket. The full
 * purity model (precursor-purity × equipment-tier ceiling × stage knobs) and the player per-batch cut decision
 * (PURE | STANDARD | CHEAP | MAX_MARGIN) are DEFERRED — YAGNI. These are schema enum members (purity_grade /
 * cut_purity_bucket), NOT numeric balance scalars (R2.3 — no value authored, only a default enum choice).
 */
export const M1_DEFAULT_PURITY_GRADE = 'standard' as const; // purity_grade enum member — substance.brindle §Substances
export const M1_DEFAULT_CUT_PURITY_BUCKET = 'standard' as const; // cut_purity_bucket enum member — production_brindle §Stage 4

/**
 * Resolved production tunables. The consumed keys are REUSE from gdd/14 §Substances (the 4-stage uniform clock) +
 * §Operational chain — production (the grounded Tier-1 yield). The ONLY genuinely-NEW tunable is
 * `production.brindle.pyralin_units_per_batch` (R2.3). DB-override > env > default (Phase-23).
 */
export const productionTunables = {
  /**
   * substance.brindle.cook_stages — the number of FUNCTIONAL cook stages (=4: stage_1→stage_4). REUSE.
   * gdd/14 §Substances (substance_brindle.md / gdd/14:1184). Range 3..6. (DB-override > env > default — Phase-23).
   */
  get cookStages(): number {
    return TunablesStore.resolveInt('substance.brindle.cook_stages', 'SUBSTANCE_BRINDLE_COOK_STAGES', 4);
  },
  /**
   * substance.brindle.cook_stage_duration_ticks — the UNIFORM per-stage duration in game-minute ticks (=30). REUSE.
   * gdd/14 §Substances (substance_brindle.md / gdd/14:1185). Range 10..120. Total cycle = 4 × 30 = 120.
   * (DB-override > env > default — Phase-23).
   */
  get cookStageDurationTicks(): number {
    return TunablesStore.resolveInt('substance.brindle.cook_stage_duration_ticks', 'SUBSTANCE_BRINDLE_COOK_STAGE_DURATION_TICKS', 30);
  },
  /**
   * production.brindle.tier_1_standard_output_g_per_cook — the FLAT Tier-1 per-cook yield in grams (=200). REUSE.
   * gdd/14 §Operational chain — production (04a/production_brindle.md:297). Range 100..400.
   * The tier model is DEFERRED; M1 yields this flat Tier-1 output per completed cook.
   * (DB-override > env > default — Phase-23).
   */
  get tier1StandardOutputGramsPerCook(): number {
    return TunablesStore.resolveInt('production.brindle.tier_1_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_1_STANDARD_OUTPUT_G_PER_COOK', 200);
  },
  /**
   * production.brindle.pyralin_units_per_batch — the M1 Pyralin units consumed per cook batch (the ONLY genuinely-NEW
   * tunable of T3; `[PROV-Y26Q2]`). Grounds the ungrounded `composite:precursor_qty_pyralin`. "1 batch" = this many
   * units consumed from precursor_stock.quantity_units (the T2 unit). Range 1..10.
   * gdd/14 §Operational chain — production (04a:270). The liters↔units reconciliation + the secondary precursors
   * (Thalmite / Garnet salt) — DECLARED C3, CONSUMED at cook C4. (DB-override > env > default — Phase-23).
   */
  get pyralinUnitsPerBatch(): number {
    return TunablesStore.resolveInt('production.brindle.pyralin_units_per_batch', 'PRODUCTION_BRINDLE_PYRALIN_UNITS_PER_BATCH', 2);
  },
  /**
   * production.brindle.thalmite_units_per_batch — the Thalmite (Stage-2 secondary precursor) units consumed per cook
   * batch. D1 C3: DECLARED here (grounds `composite:precursor_qty_thalmite` from `stage_2_thalmite_grams_per_batch`);
   * CONSUMED at cook C4 by `ProductionService.startCook` (Stage-2 debit on precursor_stock). Range 1..10.
   * gdd/14 §Operational chain — production (04a:278). `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get thalmiteUnitsPerBatch(): number {
    return TunablesStore.resolveInt('production.brindle.thalmite_units_per_batch', 'PRODUCTION_BRINDLE_THALMITE_UNITS_PER_BATCH', 2);
  },
  /**
   * production.brindle.garnet_salt_units_per_batch — the Garnet salt (Stage-3 secondary precursor) units consumed per
   * cook batch. D1 C3: DECLARED here (grounds `composite:precursor_qty_garnet` from `stage_3_garnet_salt_grams_per_batch`);
   * CONSUMED at cook C4 by `ProductionService.startCook` (Stage-3 debit on precursor_stock). Range 1..10.
   * gdd/14 §Operational chain — production (04a:286). `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get garnetSaltUnitsPerBatch(): number {
    return TunablesStore.resolveInt('production.brindle.garnet_salt_units_per_batch', 'PRODUCTION_BRINDLE_GARNET_SALT_UNITS_PER_BATCH', 2);
  },
  /**
   * production.brindle.liters_per_unit — the liters-per-unit conversion factor for the precursor stock DISPLAY LABEL
   * (label-only — PRESENTATION only, D1 C5; 1 T2 unit ↔ 1 L displayed in the projection). Introduces NO inventory
   * mechanic. Range 1..10. gdd/14 §Operational chain — production. `[PROPOSED DEFAULT — label-only]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get litersPerUnit(): number {
    return TunablesStore.resolveInt('production.brindle.liters_per_unit', 'PRODUCTION_BRINDLE_LITERS_PER_UNIT', 1);
  },
  /**
   * production.brindle.tier_2_standard_output_g_per_cook — Tier-2 per-cook yield in grams (=400). D1 C6. NEW.
   * gdd/14 §Operational chain — production. Range 200..800. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get tier2StandardOutputGramsPerCook(): number {
    return TunablesStore.resolveInt('production.brindle.tier_2_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_2_STANDARD_OUTPUT_G_PER_COOK', 400);
  },
  /**
   * production.brindle.tier_3_standard_output_g_per_cook — Tier-3 per-cook yield in grams (=800). D1 C6. NEW.
   * gdd/14 §Operational chain — production. Range 400..1500. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get tier3StandardOutputGramsPerCook(): number {
    return TunablesStore.resolveInt('production.brindle.tier_3_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_3_STANDARD_OUTPUT_G_PER_COOK', 800);
  },
  /**
   * production.brindle.tier_4_standard_output_g_per_cook — Tier-4 per-cook yield in grams (=1200). D1 C6. NEW.
   * gdd/14 §Operational chain — production. Range 800..2000. `[PROPOSED DEFAULT — tunable]` `[PROV-Y26Q2]`.
   * (DB-override > env > default — Phase-23).
   */
  get tier4StandardOutputGramsPerCook(): number {
    return TunablesStore.resolveInt('production.brindle.tier_4_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_4_STANDARD_OUTPUT_G_PER_COOK', 1200);
  },
  /**
   * production.brindle.tier_5_standard_output_g_per_cook — Tier-5 per-cook yield in grams (=2000). D1 C6 REUSE.
   * gdd/14 §Operational chain — production (04a/production_brindle.md:298). Range 1500..3000.
   * (DB-override > env > default — Phase-23).
   */
  get tier5StandardOutputGramsPerCook(): number {
    return TunablesStore.resolveInt('production.brindle.tier_5_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_5_STANDARD_OUTPUT_G_PER_COOK', 2000);
  },
};

/**
 * The total cook-cycle length in game-minute ticks (DETERMINISTIC) = cook_stages × cook_stage_duration_ticks
 * (= 4 × 30 = 120 ticks). The cook advances one functional stage every `cookStageDurationTicks` ticks; the product
 * yields on completion of stage_4. No RNG.
 */
export function totalCookCycleTicks(): number {
  return productionTunables.cookStages * productionTunables.cookStageDurationTicks;
}

/**
 * The per-cook yield in grams for the given equipment_tier (1..5). The tier lever for Brindle yield scaling (D1 C6).
 * REUSE: tier_1 is the existing tier1StandardOutputGramsPerCook (200). Tiers 2-5 use the NEW tunables.
 * Called by ProductionCookAdvanceService at cook completion (replaces the flat tier-1 yield for Brindle cooks).
 * R2.3 — NOT inline. Deterministic (NO RNG — a fixed function of equipment_tier + the gdd/14 tunables).
 */
export function yieldGramsForEquipmentTier(equipmentTier: number): number {
  switch (equipmentTier) {
    case 1: return productionTunables.tier1StandardOutputGramsPerCook;
    case 2: return productionTunables.tier2StandardOutputGramsPerCook;
    case 3: return productionTunables.tier3StandardOutputGramsPerCook;
    case 4: return productionTunables.tier4StandardOutputGramsPerCook;
    case 5: return productionTunables.tier5StandardOutputGramsPerCook;
    default: return productionTunables.tier1StandardOutputGramsPerCook; // safe fallback to tier-1 if invalid.
  }
}

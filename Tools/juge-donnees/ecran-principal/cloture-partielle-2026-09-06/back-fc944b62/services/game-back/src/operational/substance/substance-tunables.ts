// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Vue d'ensemble des trois substances +
//             §Crick — cold-chain stimulant + §Hush — addiction-loyalty +
//             docs/tech/02_fictional_world/substance_secondary.md §Unlock tiers +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Substances (substance.crick.* / substance.hush.*) +
//             §Operational chain — production (production.crick.* / production.hush.margin_multiplier_vs_brindle)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 1) --
//
// Substance tunables — the per-substance `substance.*` / `production.*` keys the substance config registry
// (`substance-config.ts`) CONSUMES. Phase-2b vector #2 added the shared substance foundation + the first SECONDARY
// substance, Crick; vector #2b adds Hush (the addiction-loyalty substance). So this file surfaces the substances the
// registry encodes: Brindle (the M1 substance, REUSE its existing constants verbatim so behavior is unchanged), Crick
// (the cold-chain secondary), and Hush (the addiction-loyalty secondary — its gdd/14 keys).
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the backported registry value from
// `projects/mafia_city_game/gdd/14_tunable_constants.md` (cited per key, with the upstream 04a/02 source). They are
// surfaced as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the
// registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). ZERO invented values.
//
// ── BRINDLE values are MIRRORED, NOT re-authored. The Brindle cook clock + yield + Pyralin/batch already live in
//    `../production/production-tunables.ts` (the M1 source) and are env-overridable under the SAME env-var names
//    (SUBSTANCE_BRINDLE_COOK_STAGES, SUBSTANCE_BRINDLE_COOK_STAGE_DURATION_TICKS,
//    PRODUCTION_BRINDLE_TIER_1_STANDARD_OUTPUT_G_PER_COOK, PRODUCTION_BRINDLE_PYRALIN_UNITS_PER_BATCH). This file
//    re-reads those SAME env vars with the SAME gdd/14 defaults so the registry's Brindle entry resolves to the EXACT
//    SAME numbers production-tunables.ts does (behavior-preserving — a single source value, two read sites that agree
//    by construction). Brindle has NO margin multiplier (it IS the 1× baseline) and NO cold-chain.
//
// ── CRICK values from gdd/14 §Substances + §Operational chain — production:
//      substance.crick.cook_stages = 1 (single Solvent-Refine stage — production_secondaries.md §Crick)
//      substance.crick.cook_stage_duration_ticks = 180 (~6h in-game)
//      substance.crick.yield_grams = 200 ([PROV-Y26Q2] — anchored on Brindle's 200 g/cook; NEW T0)
//      substance.crick.verdant_root_extract_units_per_batch = 2 ([PROV-Y26Q2] — calque pyralin_units_per_batch; NEW T0)
//      production.crick.margin_multiplier_vs_brindle = 3 ([PROV-Y26Q2] — Crick street value = 3× Brindle/gram; NEW T0)
//    Crick coldChain = true is NOT a numeric tunable — it is a categorical substance trait (cold-chain stimulant,
//    production_secondaries.md §Crick + substance_secondary.md §Vue d'ensemble "Oui (< 4°C)"); encoded as a boolean
//    in the descriptor (R2.3 governs NUMERIC balance values, not categorical type traits).
//
// ── HUSH values from gdd/14 §Substances + §Operational chain — production:
//      substance.hush.cook_stages = 2 (Chemical Synthesis + Tablet Press — production_secondaries.md §Hush)
//      substance.hush.cook_stage_duration_ticks = 75 (2.5h in-game; 2 × 75 = 150 min total cook cycle)
//      substance.hush.yield_grams = 200 ([PROV-Y26Q2] — calque substance.crick.yield_grams; grams M1 grounding of the
//        tablet yield, the literal tablet-unit model DEFERRED; the "regular" volume is carried by the 1.5× margin +
//        the T5 addiction selling boost, NOT an artificially-reduced yield)
//      substance.hush.lull_resin_units_per_batch = 2 ([PROV-Y26Q2] — calque verdant_root_extract/pyralin; NEW T0)
//      production.hush.margin_multiplier_vs_brindle = 1.5 ([PROV-Y26Q2] — Hush street value = 1.5× Brindle/gram; NEW T0)
//    Hush addiction = true is NOT a numeric tunable — it is a categorical substance trait (addiction-loyalty,
//    production_secondaries.md §Hush); encoded as a boolean in the descriptor (the addiction scores/boost/decay ARE
//    numeric tunables — production.hush.addiction_* — resolved at T5, not here). R2.3 governs NUMERIC values, not
//    categorical type traits.
//
// ── ASH values from gdd/14 §Substances + §Operational chain — production (Phase-2b vector #2c — luxury channel):
//      substance.ash.cook_stages = 3 (3-stage Specialized lab boutique cycle — production_secondaries.md §Ash). gdd/14:1194.
//      substance.ash.cook_stage_duration_ticks = 3000 (~50h in-game; 3 × 3000 = 9000 min ≈ multi-week canon). gdd/14:1195.
//      substance.ash.yield_grams = 200 ([PROV-Y26Q2] — calque substance.hush/crick.yield_grams; the "very low" Ash
//        volume canon is carried by the 20× margin + the luxury appointment channel, NOT a reduced yield). gdd/14:1208.
//      precursors.glass_lily_units_per_batch = 2 ([PROV-Y26Q2] — calque lull_resin/verdant_root_extract/pyralin). gdd/14:3163.
//      production.ash.margin_multiplier_vs_brindle = 20 (Ash street value = 20× Brindle/gram, GDD "extreme margin").
//        REUSE (backport ch16 — already in gdd/14, used_by widened to the honor sale T8). gdd/14:2985.
//    Ash luxuryChannel = true is NOT a numeric tunable — it is a categorical substance trait (luxury-channel logistics:
//    no dealer-spot / lek selling, the Ash sale is the appointment honor path — production_secondaries.md §Ash);
//    encoded as a boolean in the descriptor (like coldChain / addiction). The purity / lab-tier / appointment numeric
//    tunables (purity.* / specialized_lab.* / ash.appointment_window_ticks) are resolved at their own tasks (T5–T8),
//    not here. R2.3 governs NUMERIC balance values, not categorical type traits.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved substance tunables — the per-substance cook clock / yield / per-batch precursor quantity / margin the
 * config registry (`substance-config.ts`) reads. Brindle keys re-read the EXACT SAME env vars (with the SAME gdd/14
 * defaults) production-tunables.ts uses, so the registry's Brindle entry equals the M1 constants by construction
 * (behavior-preserving). ZERO genuinely-NEW tunables HERE — the NEW Crick keys were authored in gdd/14 at T0 (R2.3).
 * DB-override > env > default (Phase-23).
 */
export const substanceTunables = {
  brindle: {
    /** substance.brindle.cook_stages — the FUNCTIONAL cook-stage count (=4; SAME env var as production-tunables.ts). (DB-override > env > default — Phase-23). */
    get cookStages(): number { return TunablesStore.resolveInt('substance.brindle.cook_stages', 'SUBSTANCE_BRINDLE_COOK_STAGES', 4); },
    /** substance.brindle.cook_stage_duration_ticks — the UNIFORM per-stage duration in ticks (=30; SAME env var). (DB-override > env > default — Phase-23). */
    get cookStageDurationTicks(): number {
      return TunablesStore.resolveInt('substance.brindle.cook_stage_duration_ticks', 'SUBSTANCE_BRINDLE_COOK_STAGE_DURATION_TICKS', 30);
    },
    /** production.brindle.tier_1_standard_output_g_per_cook — the FLAT Tier-1 per-cook yield (=200; SAME env var). (DB-override > env > default — Phase-23). */
    get yieldGrams(): number {
      return TunablesStore.resolveInt('production.brindle.tier_1_standard_output_g_per_cook', 'PRODUCTION_BRINDLE_TIER_1_STANDARD_OUTPUT_G_PER_COOK', 200);
    },
    /** production.brindle.pyralin_units_per_batch — the Pyralin units consumed per cook batch (=2; SAME env var). (DB-override > env > default — Phase-23). */
    get precursorUnitsPerBatch(): number {
      return TunablesStore.resolveInt('production.brindle.pyralin_units_per_batch', 'PRODUCTION_BRINDLE_PYRALIN_UNITS_PER_BATCH', 2);
    },
    /** Brindle IS the 1× baseline (production.crick/ash margin multipliers are expressed VS Brindle) — fixed 1. */
    marginMultiplierVsBrindle: 1,
  },
  crick: {
    /** substance.crick.cook_stages — the single Solvent-Refine stage (=1). gdd/14 §Substances. (DB-override > env > default — Phase-23). */
    get cookStages(): number { return TunablesStore.resolveInt('substance.crick.cook_stages', 'SUBSTANCE_CRICK_COOK_STAGES', 1); },
    /** substance.crick.cook_stage_duration_ticks — the per-stage duration in ticks (=180, ~6h in-game). (DB-override > env > default — Phase-23). */
    get cookStageDurationTicks(): number {
      return TunablesStore.resolveInt('substance.crick.cook_stage_duration_ticks', 'SUBSTANCE_CRICK_COOK_STAGE_DURATION_TICKS', 180);
    },
    /** substance.crick.yield_grams — the per-batch Crick yield in grams (=200; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get yieldGrams(): number { return TunablesStore.resolveInt('substance.crick.yield_grams', 'SUBSTANCE_CRICK_YIELD_GRAMS', 200); },
    /** substance.crick.verdant_root_extract_units_per_batch — Verdant root extract units per batch (=2; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get precursorUnitsPerBatch(): number {
      return TunablesStore.resolveInt('substance.crick.verdant_root_extract_units_per_batch', 'SUBSTANCE_CRICK_VERDANT_ROOT_EXTRACT_UNITS_PER_BATCH', 2);
    },
    /** production.crick.margin_multiplier_vs_brindle — Crick street value = this × Brindle/gram (=3; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get marginMultiplierVsBrindle(): number {
      return TunablesStore.resolveFloat('production.crick.margin_multiplier_vs_brindle', 'PRODUCTION_CRICK_MARGIN_MULTIPLIER_VS_BRINDLE', 3);
    },
  },
  hush: {
    /** substance.hush.cook_stages — the 2-stage Press house cook (Chemical Synthesis + Tablet Press) (=2). gdd/14 §Substances. (DB-override > env > default — Phase-23). */
    get cookStages(): number { return TunablesStore.resolveInt('substance.hush.cook_stages', 'SUBSTANCE_HUSH_COOK_STAGES', 2); },
    /** substance.hush.cook_stage_duration_ticks — the per-stage duration in ticks (=75, 2.5h in-game). (DB-override > env > default — Phase-23). */
    get cookStageDurationTicks(): number {
      return TunablesStore.resolveInt('substance.hush.cook_stage_duration_ticks', 'SUBSTANCE_HUSH_COOK_STAGE_DURATION_TICKS', 75);
    },
    /** substance.hush.yield_grams — the per-batch Hush yield in grams (=200; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get yieldGrams(): number { return TunablesStore.resolveInt('substance.hush.yield_grams', 'SUBSTANCE_HUSH_YIELD_GRAMS', 200); },
    /** substance.hush.lull_resin_units_per_batch — Lull resin units per batch (=2; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get precursorUnitsPerBatch(): number {
      return TunablesStore.resolveInt('substance.hush.lull_resin_units_per_batch', 'SUBSTANCE_HUSH_LULL_RESIN_UNITS_PER_BATCH', 2);
    },
    /** production.hush.margin_multiplier_vs_brindle — Hush street value = this × Brindle/gram (=1.5; [PROV-Y26Q2]). (DB-override > env > default — Phase-23). */
    get marginMultiplierVsBrindle(): number {
      return TunablesStore.resolveFloat('production.hush.margin_multiplier_vs_brindle', 'PRODUCTION_HUSH_MARGIN_MULTIPLIER_VS_BRINDLE', 1.5);
    },
  },
  ash: {
    /** substance.ash.cook_stages — the 3-stage Specialized lab cook (=3). gdd/14:1194 §Substances. (DB-override > env > default — Phase-23). */
    get cookStages(): number { return TunablesStore.resolveInt('substance.ash.cook_stages', 'SUBSTANCE_ASH_COOK_STAGES', 3); },
    /** substance.ash.cook_stage_duration_ticks — the per-stage duration in ticks (=3000, ~50h in-game). gdd/14:1195. (DB-override > env > default — Phase-23). */
    get cookStageDurationTicks(): number {
      return TunablesStore.resolveInt('substance.ash.cook_stage_duration_ticks', 'SUBSTANCE_ASH_COOK_STAGE_DURATION_TICKS', 3000);
    },
    /** substance.ash.yield_grams — the per-batch Ash yield in grams (=200; [PROV-Y26Q2]). gdd/14:1208. (DB-override > env > default — Phase-23). */
    get yieldGrams(): number { return TunablesStore.resolveInt('substance.ash.yield_grams', 'SUBSTANCE_ASH_YIELD_GRAMS', 200); },
    /** precursors.glass_lily_units_per_batch — Glass lily units per batch (=2; [PROV-Y26Q2]). gdd/14:3163. (DB-override > env > default — Phase-23). */
    get precursorUnitsPerBatch(): number {
      return TunablesStore.resolveInt('precursors.glass_lily_units_per_batch', 'PRECURSORS_GLASS_LILY_UNITS_PER_BATCH', 2);
    },
    /** production.ash.margin_multiplier_vs_brindle — Ash street value = this × Brindle/gram (=20; extreme margin). gdd/14:2985. (DB-override > env > default — Phase-23). */
    get marginMultiplierVsBrindle(): number {
      return TunablesStore.resolveFloat('production.ash.margin_multiplier_vs_brindle', 'PRODUCTION_ASH_MARGIN_MULTIPLIER_VS_BRINDLE', 20);
    },
    /** production.ash.refining_pass_duration_ticks — ticks added to the total Ash cook per chosen refining pass (=60; ~1h
     *  in-game per pass). The time↔purity lever: total = cookStageDurationTicks × cookStages + refiningPasses × this.
     *  Test-only shrinkable via PRODUCTION_ASH_REFINING_PASS_DURATION_TICKS (prod default 60 unchanged). gdd/14:2986. (DB-override > env > default — Phase-23). */
    get refiningPassDurationTicks(): number {
      return TunablesStore.resolveInt('production.ash.refining_pass_duration_ticks', 'PRODUCTION_ASH_REFINING_PASS_DURATION_TICKS', 60);
    },
    /** production.ash.max_refining_passes — the cap on refining passes accepted at startCook (> this ⇒ 422) (=3). gdd/14:2987. (DB-override > env > default — Phase-23). */
    get maxRefiningPasses(): number {
      return TunablesStore.resolveInt('production.ash.max_refining_passes', 'PRODUCTION_ASH_MAX_REFINING_PASSES', 3);
    },
  },
};

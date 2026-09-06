// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-3 vector #3 (grow_house) T0 — the `grow.*`
//             registry keys (grow.seed_cost_ratio, grow.stage_count, grow.stage_duration_ticks; all `[PROV-Y26Q2]`) +
//             docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T2/§7 (the seed-cost debit grounding) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention — ratio × the STANDARD-
//             cover reference conversion cost, the SAME convention specialized_lab.upgrade_cost_ratio /
//             precursors.<type>_unit_price_ratio / real_estate.acquisition_cost_ratio REUSE)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 2) --
//
// Grow_house cultivation tunables (Phase-3 vector #3) — the `grow.*` keys this slice's logic CONSUMES. T2 (the PLANT
// action) consumes `grow.seed_cost_ratio` (the seed cash cost of starting a grow). The GROW_ADVANCE tick (T3) reads
// `grow.stage_duration_ticks`. T5 (the HARVEST yield tier — GrowYieldService) reads `grow.stage_count` (the BUMPER
// cut-point = all stages tended) + `grow.withered_max_tends` (the WITHERED cut-point) + `grow.yield_grams.{withered,
// standard,bumper}` (the per-tier harvest grams) — exposed via `growYieldTunables` below. The file is the single MIRROR
// of the grow.* registry; values change → update this map in the SAME commit (R9.3 propagation gdd/14 ↔ code).
//
// THE SEED-COST GROUNDING (the wallet-affecting step of PLANT — spec §4-T2): the seed cost is deliberately well below
// the equivalent precursor ORDER cost (the make-vs-buy saving — grow cheap-but-slow-and-hot, order fast-but-dear). M1
// grounding (the SAME money convention as specialized_lab.upgradeCostCents / precursorUnitPriceCents): cost =
// grow.seed_cost_ratio × the STANDARD-cover REFERENCE conversion cost. The reference is the BASE STANDARD-cover cost
// with NO per-type multiplier — we pass 'stash' (multiplier 1.0) so the reference = conversion.base_cost_standard_min
// ($15000), exactly as gdd/14 documents (`ratio × conversion.base_cost_standard_min`). cost_cents = round(ratio ×
// reference_cents). DETERMINISTIC (the reference cost × a fixed ratio, no RNG). Returns a bigint (cents) for the
// economy_states.cash_cents bigint column. R2.3 — the only values are the gdd/14 ratio + the REUSED conversion
// reference (no inline literal). All values are `[PROV-Y26Q2]` (provisional, calibrate downstream).
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Phase-3 vector #3
// (grow_house) T0 (cited per key, with the upstream design-spec source). They are surfaced as env-overridable fallbacks
// so this file stays a faithful MIRROR of the single source of truth. If the registry values change, update this map in
// the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import type { HeatInjectionMagnitude } from '../../citysim/events/city-event-bus';
import { TunablesStore } from '../../config/tunables-store';
import { groundedConversionCostCents } from '../real_estate/conversion-tunables';

/** The closed magnitude-band domain (mirror of HeatInjectionMagnitude — heat_propagation.md §Event consumers). The grow
 *  heat emission carries one of these qualitative bands on the canonical HeatInjection seam (R2.2 — never a raw scalar). */
const VALID_MAGNITUDES: ReadonlySet<string> = new Set(['MICRO', 'LOW', 'LOW_MEDIUM', 'MEDIUM']);

/**
 * Resolved grow tunables. All keys are gdd/14 §Phase-3 vector #3 (grow_house) T0. R2.3 — NOT inline. The seed-cost ratio
 * → the guarded plant debit amount (T2); the stage count → the grow machine + yield tier (T3/T5); the stage duration →
 * the GROW_ADVANCE tick cadence (T3). DB-override > env > default (Phase-23).
 */
export const growTunables = {
  /**
   * grow.seed_cost_ratio — the seed (plant) cost ratio. Default 0.02. Env override: GROW_SEED_COST_RATIO (test-only).
   * Consumed by seedCostCents() (the guarded plant debit amount). (DB-override > env > default — Phase-23).
   */
  get seedCostRatio(): number {
    return TunablesStore.resolveFloat('grow.seed_cost_ratio', 'GROW_SEED_COST_RATIO', 0.02);
  },
  /**
   * grow.stage_count — the number of growth stages before completion. Default 3. Env override: GROW_STAGE_COUNT
   * (test-only). Consumed by the GROW_ADVANCE tick (T3) + GrowYieldService (T5).
   * (DB-override > env > default — Phase-23).
   */
  get stageCount(): number {
    return TunablesStore.resolveInt('grow.stage_count', 'GROW_STAGE_COUNT', 3);
  },
  /**
   * grow.stage_duration_ticks — the per-stage growth duration in MINUTE ticks. Default 1800. Env override:
   * GROW_STAGE_DURATION_TICKS (the test-stack fast knob, _fast_tunables.ts). Consumed by the GROW_ADVANCE tick (T3).
   * (DB-override > env > default — Phase-23).
   */
  get stageDurationTicks(): number {
    return TunablesStore.resolveInt('grow.stage_duration_ticks', 'GROW_STAGE_DURATION_TICKS', 1800);
  },
  /**
   * grow.heat_magnitude — the qualitative HeatInjection band a grow_house emits per GROW_ADVANCE tick while a grow is
   * ACTIVE (the make-vs-buy A stakes — an active grow is "hot"). Default MEDIUM (the R2.2-clean band materialization of
   * the `grow.heat_per_tick_active` "baseline medium" composite). Env override: GROW_HEAT_MAGNITUDE (test-only). Consumed
   * by GrowAdvanceService (T6) → emitted on the canonical HeatInjection seam via the REUSED HeatContribService.
   * (DB-override > env > default — Phase-23).
   */
  get heatMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('grow.heat_magnitude', 'GROW_HEAT_MAGNITUDE', 'MEDIUM');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'MEDIUM') as HeatInjectionMagnitude;
  },
};

/**
 * The grounded SEED-COST DEBIT amount in CENTS for the PLANT action (the wallet-affecting step). M1 grounding (the SAME
 * money convention as specialized_lab.upgradeCostCents / precursorUnitPriceCents): cost = grow.seed_cost_ratio × the
 * STANDARD-cover REFERENCE conversion cost. The reference is the BASE STANDARD-cover cost with NO per-type multiplier —
 * we pass 'stash' (multiplier 1.0) so the reference = conversion.base_cost_standard_min ($15000), exactly as gdd/14
 * documents (`ratio × conversion.base_cost_standard_min`). (Passing 'grow_house' would also give × 1.0 — grow_house is
 * residential-cover with no multiplier — but 'stash' is the canonical reference the repair / upgrade costs use, so we
 * reuse it verbatim.) cost_cents = round(ratio × reference_cents). DETERMINISTIC (no RNG). Returns a bigint (cents) for
 * the economy_states.cash_cents bigint column. R2.3 — the only values are the gdd/14 ratio + the REUSED conversion
 * reference (no inline literal). Default 0.02 × $15000 = $300 → 30_000 cents — deliberately << the equivalent precursor
 * order cost (the make-vs-buy saving).
 */
export function seedCostCents(): bigint {
  // 'stash' carries NO per-type cost multiplier (only LAB/REFINERY do), so groundedConversionCostCents('stash',
  // 'standard') = conversion.base_cost_standard_min × 1.0 × 100 = the exact $15000 STANDARD-cover reference gdd/14 names
  // for the seed-cost ratio — the SAME reference repairCostCents() / upgradeCostCents() use.
  const referenceCostCents = groundedConversionCostCents('stash', 'standard');
  const priceCents = Math.round(growTunables.seedCostRatio * Number(referenceCostCents));
  return BigInt(priceCents);
}

// ───────────────────────────── HARVEST / YIELD-TIER tunables (T5) ─────────────────────────────

/**
 * Resolved grow YIELD tunables — the `grow.withered_max_tends` + `grow.yield_grams.{withered,standard,bumper}` keys the
 * pure GrowYieldService (T5) reads to derive a grow's harvest tier (WITHERED/STANDARD/BUMPER) from tend_count, then the
 * harvest grams per tier. All keys are gdd/14 §Phase-3 vector #3 (grow_house) T0 (R2.3 — NOT inline). The cut-point +
 * the per-tier grams are integers (precursor_stock.quantity_units is an integer column). The per-tier grams are strictly
 * ascending (50 < 120 < 200 — the husbandry lever discriminates). `grow.stage_count` (the BUMPER cut-point = all stages
 * tended) lives on `growTunables.stageCount` above (shared with the GROW_ADVANCE tick T3). Env overrides are TEST-ONLY
 * (unset in prod/dev → the registry defaults hold byte-for-byte). The yield tier + the raw grams are BO-only (R2.2 —
 * surfaced via the husbandry_band / precursor-stock band T7, never the raw tier nor the grams nor tend_count).
 * DB-override > env > default (Phase-23).
 */
export const growYieldTunables = {
  /**
   * grow.withered_max_tends — the INCLUSIVE high cut-point of the WITHERED tier (yieldTier = WITHERED if
   * tend_count <= this). Default 1. < grow.stage_count (else STANDARD is empty). Env override: GROW_WITHERED_MAX_TENDS
   * (test-only). Consumed by GrowYieldService.yieldTier (T5). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  get witheredMaxTends(): number {
    return TunablesStore.resolveInt('grow.withered_max_tends', 'GROW_WITHERED_MAX_TENDS', 1);
  },
  /**
   * grow.yield_grams.<tier> — the harvest grams per husbandry tier, strictly ascending (withered 50 < standard 120 <
   * bumper 200 — the lever discriminates). UPSERTed into precursor_stock at harvest (T5). Env overrides:
   * GROW_YIELD_GRAMS_{WITHERED,STANDARD,BUMPER} (test-only). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  yieldGrams: {
    get withered(): number { return TunablesStore.resolveInt('grow.yield_grams.withered', 'GROW_YIELD_GRAMS_WITHERED', 50); },
    get standard(): number { return TunablesStore.resolveInt('grow.yield_grams.standard', 'GROW_YIELD_GRAMS_STANDARD', 120); },
    get bumper(): number { return TunablesStore.resolveInt('grow.yield_grams.bumper', 'GROW_YIELD_GRAMS_BUMPER', 200); },
  },
};

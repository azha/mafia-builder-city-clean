// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 1 — cash into front shop
//             (the injection lands in the front-shop's declared revenue stream — "Amount ajouté à
//              front.actual_weekly_cents[hourSlot]") + §Contrainte fondamentale Unconformity ("injection ≤
//              front.expected_weekly_cents[slot] sinon deviation_score_bucket spike" — the legit baseline ceiling) +
//             §Stage 2 — front shop output ("cash absorbé par le front (recorded as legitimate revenue) … move au
//              stage suivant avec cleanliness = STAGE_1_CLEAN_40_PCT default") +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — laundering (registry) +
//             docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Update tick (the cleanliness/dwell the
//              node already models — CONSUMED, never recomputed here)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// Laundering (Stage 1 — M1) tunables — the `laundering.*` keys THIS slice's OWN logic CONSUMES: the front-shop
// LEGITIMATE BASELINE (the legit declared-revenue ceiling above which an injection becomes a deviation → System 7),
// the CLEAN-OUTPUT cleanliness GATE (the cleanliness_at_output band — produced by System 8 — at which the laundered
// cash is released to the wallet), and the DWELL-TAX RATE (the modest cut the laundering takes — the loop stays
// net-positive). Phase-2 M1 = a single inject → front-shop Stage-1 node → System-8 cleaning over dwell → clean cash
// credited to economy_states.cash_cents. The 24-hour-slot baseline profile, the standing-transfer DSL, Stages 2-4,
// parallel pipelines, the cleanliness-improvement palier (cover_quality / maintenance), the structuring/smurfing
// depth, and the full Throughput-Trilemma optimization are ALL DEFERRED — YAGNI.
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Operational chain
// — laundering (cited per key, with the upstream laundering_pipeline.md source line). They are surfaced as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry
// values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE LEGITIMATE BASELINE GROUNDING (the deviation trigger — laundering_pipeline.md §Contrainte fondamentale
//    Unconformity: "injection_amount_per_hour_slot ≤ front.expected_weekly_cents[hour_slot] sinon deviation_score
//    spike"). The doc carries the per-slot baseline as a QUALITATIVE composite (`transaction_profile_composite` /
//    `expected_weekly_cents[slot]` — R2.2, no scalar; gdd/14 §Operational chain — laundering carries no grounded
//    legit-revenue scalar). To DECIDE deviation-vs-conforming for a concrete inject (the M1 Stage-1 single-inject
//    model, no 24-slot profile), M1 grounds the per-inject legitimate ceiling as a single CENTS baseline
//    `laundering.front_shop_legit_baseline_cents` — an inject AT or BELOW this is within the front-shop's plausible
//    declared revenue (no deviation); an inject ABOVE it is a suspicious spike (deviation → System 7 audit pin). The
//    ONLY genuinely-NEW VALUE tunable of T6 (R2.3). `[PROV-Y26Q2]`. Default 250000 cents ($2500) — HALF the
//    System-8 node CENTS cap (inventory_cap_per_node $5000 = 500000 cents), so a front-shop can launder up to ~half
//    its node buffer CONFORMINGLY and a larger single inject (still within the node cap) is a deviation — both the
//    conforming AND the deviating amounts fit the node (the deviation does not require overflowing the buffer; it is a
//    declared-revenue plausibility test, decoupled from the buffer capacity). The 24-slot per-business-type baseline
//    + the district modifier are DEFERRED.
//
// ── THE CLEAN-OUTPUT CLEANLINESS GATE (the release threshold — laundering_pipeline.md §Stage 4 "cash atteint
//    cleanliness ≥ {{tunable:laundering_full_clean_threshold}} (0.9 default, REUSE GDD §17)"). The clean cash is
//    released to the wallet once the node's cleanliness_at_output (the [0,1] float SYSTEM 8 COMPUTES per minute —
//    CONSUMED, never recomputed here) reaches this band. M1 REUSES the canonical full-clean threshold as
//    `laundering.full_clean_threshold` (0.9). REUSE (not NEW): it is the documented Stage-4 holdable threshold.
//
// ── THE DWELL-TAX RATE GROUNDING (the modest laundering cut — the "no free lunch" of the Throughput Trilemma /
//    laundering_pipeline.md §Throughput Trilemma "pay en dwell + exposure"). Laundering is never free: a modest
//    fraction of the injected cash is consumed as the cost of cleaning it (lawyer/cover/skim overhead). M1 grounds
//    this as a single fractional rate `laundering.dwell_tax_rate` — the fraction RETAINED (consumed) at output; the
//    wallet receives `injected × (1 - rate)`. The ONLY genuinely-NEW RATE tunable of T6 (R2.3). `[PROV-Y26Q2]`.
//    Default 0.10 (a modest 10% cut — the loop stays comfortably net-positive: a $5000 injection nets $4500 clean).
//    For EXACT cash conservation in the capstone, the cut is a deterministic integer-cents floor of the injected
//    amount (the wallet credit + the retained cut sum to exactly the injected cents — no cash created/lost; see
//    laundering.service.ts). The progressive cover_quality-driven cleanliness-improvement palier is DEFERRED.

// ── THE PER-STAGE CLEANLINESS PROGRESSION (Phase 2b — the multi-stage pipeline; laundering_pipeline.md §Vue
//    d'ensemble + §Stage 3: "STAGE_1_CLEAN_40_PCT → +15..25% per mid-tier hop → STAGE_3_CLEAN_90_PCT+"). The
//    pipeline cleanliness is a DETERMINISTIC FUNCTION of a node's stage_index (an existing column — R9.3), NOT a
//    per-node stored float: Stage 1 starts at the STAGE-1 BASE; each subsequent stage adds the PER-STAGE GAIN, capped
//    at 1.0. WHY NOT the node's cleanliness_at_output float: System 8's MINUTE/2 dwell tick RECOMPUTES that float for
//    every node every minute (idle nodes → 1.0), so it cannot carry a progressive per-stage value — it would be
//    clobbered. Deriving the pipeline cleanliness from stage_index sidesteps System 8 entirely for the GAIN mechanic
//    (System 8 stays the per-node DWELL model the projection still consumes for the terminal release gate, T6-compat).
//    With base 0.40 + gain 0.25: Stage1=0.40, Stage2=0.65, Stage3=0.90 (≥ 0.90 → RELEASE), Stage4=1.00 (cap 1.0). The
//    borne haute (25%) of the canon 15-25% band, chosen so a canonical 3-stage pipeline reaches STAGE_3_CLEAN_90_PCT+
//    (inv.4 + inv.11 — front + 2 mid-tier + money holding). The per-node-TYPE specialization (restaurant/bar/bookkeeper/
//    taxi-coop distinct gains) is DEFERRED — uniform gain.

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';

/**
 * Resolved laundering (Stage 1 — M1) tunables. The two genuinely-NEW M1 keys (R2.3, both `[PROV-Y26Q2]`) are the
 * LEGIT BASELINE (cents — the deviation ceiling) + the DWELL-TAX RATE (fraction retained at output). The CLEAN-OUTPUT
 * cleanliness GATE is a REUSE of the canonical Stage-4 full-clean threshold (laundering.full_clean_threshold = 0.9).
 * The 24-slot per-business baseline + the standing-transfer DSL + the cleanliness-improvement palier are DEFERRED.
 * DB-override > env > default (Phase-23).
 */
export const launderingTunables = {
  /**
   * laundering.front_shop_legit_baseline_cents — the per-inject legitimate declared-revenue ceiling (cents) above
   * which an injection is a suspicious spike → a deviation fed to System 7 (the audit-pin nightly job). An inject AT
   * or BELOW this is conforming (no deviation). The ONLY genuinely-NEW VALUE tunable of T6; `[PROV-Y26Q2]`.
   * Range 50000..5000000. gdd/14 (04a/laundering_pipeline.md:89). The 24-slot per-business-type baseline + the
   * district modifier are DEFERRED. (DB-override > env > default — Phase-23).
   * 04e-A1 C5: GLOBAL lever, body-wrapped — no signature change, zero call-site churn; empty overlay → base
   * byte-identical (design §2.2).
   */
  get frontShopLegitBaselineCents(): number {
    const base = TunablesStore.resolveInt('laundering.front_shop_legit_baseline_cents', 'LAUNDERING_FRONT_SHOP_LEGIT_BASELINE_CENTS', 250000);
    return EffectOverlayStore.applyModifiers('laundering.front_shop_legit_baseline_cents', base);
  },
  /**
   * laundering.dwell_tax_rate — the fraction of the injected cash RETAINED (consumed) at output — the modest
   * laundering cut (the "no free lunch" of the Trilemma). The wallet receives `injected × (1 - rate)`. The ONLY
   * genuinely-NEW RATE tunable of T6; `[PROV-Y26Q2]`. Default 0.10 (the loop stays net-positive). Range 0.0..0.5.
   * gdd/14 (04a/laundering_pipeline.md:140). The progressive cover_quality-driven cleanliness-improvement palier is
   * DEFERRED. (DB-override > env > default — Phase-23).
   */
  get dwellTaxRate(): number {
    return TunablesStore.resolveFloat('laundering.dwell_tax_rate', 'LAUNDERING_DWELL_TAX_RATE', 0.1);
  },
  /**
   * laundering.full_clean_threshold — the cleanliness_at_output band (SYSTEM 8 computes the [0,1] float per minute —
   * CONSUMED, never recomputed) at which the laundered cash is released to the wallet. REUSE of the canonical
   * Stage-4 holdable threshold (laundering_pipeline.md §Stage 4 — 0.9, REUSE GDD §17). Not NEW. Range 0.5..1.0.
   * gdd/14 (04a/laundering_pipeline.md:134). (DB-override > env > default — Phase-23).
   */
  get fullCleanThreshold(): number {
    return TunablesStore.resolveFloat('laundering.full_clean_threshold', 'LAUNDERING_FULL_CLEAN_THRESHOLD', 0.9);
  },
  /**
   * laundering.stage1_cleanliness_base — the pipeline cleanliness a Stage-1 front-shop node produces (Phase 2b;
   * laundering_pipeline.md §Stage 2 STAGE_1_CLEAN_40_PCT). The base the per-stage gain accrues from. `[PROV-Y26Q2]`.
   * Default 0.40. Range 0.2..0.6. gdd/14 (04a/laundering_pipeline.md:100). This is the PIPELINE cleanliness model
   * (stage_index-derived) — distinct from the node's cleanliness_at_output float (System 8's per-node dwell model,
   * which the terminal release gate still consumes). (DB-override > env > default — Phase-23).
   */
  get stage1CleanlinessBase(): number {
    return TunablesStore.resolveFloat('laundering.stage1_cleanliness_base', 'LAUNDERING_STAGE1_CLEANLINESS_BASE', 0.4);
  },
  /**
   * laundering.node_cleanliness_gain_pct — the cleanliness each mid-tier hop adds to the pipeline cleanliness
   * (Phase 2b; laundering_pipeline.md §Stage 3 "+15-25% per node"). Uniform across node types (the per-node-TYPE
   * specialization is DEFERRED — YAGNI). `[PROV-Y26Q2]`. Default 0.25 — borne haute de la bande canon 15-25% (Option A
   * calibration 2026-06-14 : recalibré 0.20→0.25 pour honorer inv.4 + inv.11 : Stage1=0.40, Stage2=0.65,
   * Stage3=0.90 (≥ seuil 0.90 → RELEASE), Stage4=1.00 (cap 1.0) — le pipeline 3-stages canonique est désormais viable).
   * Range 0.1..0.25. gdd/14 (04a/laundering_pipeline.md:122). (DB-override > env > default — Phase-23).
   */
  get nodeCleanlinessGainPct(): number {
    return TunablesStore.resolveFloat('laundering.node_cleanliness_gain_pct', 'LAUNDERING_NODE_CLEANLINESS_GAIN_PCT', 0.25);
  },
};

/**
 * The PIPELINE cleanliness a node at `stageIndex` produces (Phase 2b — laundering_pipeline.md §Vue d'ensemble /
 * §Stage 3): the Stage-1 base + (stageIndex − 1) × the per-stage gain, clamped to [0,1]. A DETERMINISTIC function of
 * the node's stage_index (an existing column — R9.3) + the grounded tunables, NOT a stored float (System 8 would
 * clobber `cleanliness_at_output`). Stage 1 → base (0.40); each subsequent stage adds the gain (0.25, borne haute
 * canon 15-25% — Option A 2026-06-14): 0.40 / 0.65 / 0.90 (≥ seuil → RELEASE) / 1.00 (cap). The 3-stage pipeline
 * canonique atteint STAGE_3_CLEAN_90_PCT+ (inv.4 + inv.11). The PROJECTED progression along the pipeline + (for a
 * multi-stage pipeline) the band the player sees rise per stage. The terminal-node RELEASE gate uses System 8's
 * cleanliness_at_output (T6-compat — see the output service); this function feeds the per-node PROJECTION band +
 * documents the canonical progression.
 */
export function pipelineCleanlinessForStage(stageIndex: number): number {
  const base = launderingTunables.stage1CleanlinessBase;
  const gain = launderingTunables.nodeCleanlinessGainPct;
  const stage = Number.isFinite(stageIndex) ? Math.max(1, Math.floor(stageIndex)) : 1;
  const c = base + (stage - 1) * gain;
  if (c <= 0) return 0;
  return c >= 1 ? 1 : c;
}

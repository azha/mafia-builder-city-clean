// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (~11 `meta.*` getters,
//             registry-first)
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §13 (the
//             tunables catalogue, defaults/ranges verbatim).
//             Canon: docs/tech/06_meta_progression/graduated_retirement_pivot.md §Tunables +
//             promotion_lock.md §Tunables + recall_debt.md §Tunables.
//             Registry: gdd/14_tunable_constants.md §"Meta — Graduated Retirement / Promotion Lock" +
//             §"Meta — Recall Debt" (NORMALIZED same commit — R2.3: the legacy unprefixed flat-table rows
//             AND the satellite `### Meta — Graduated Retirement (namespace T.meta.*...)` sub-table are
//             folded into ONE canonical `meta.*`-prefixed table per section; `T.meta.*` kept as an alias
//             note per row, never a second store key — the C0 R5 reserve's corrected line numbers,
//             `2026-07-18-p3-F-C0-reanchor.md §6`, anchor the exact pre-normalization content this file's
//             defaults are copied from verbatim).
//             Pattern: mirrors `live-ops.tunables.ts` (CAPS map + clamp function) / `core-loops-tunables.ts`
//             (the SAME shape, P3-A/P3-C/P3-D/P3-E precedent) — the closest same-shape precedent for a
//             BRAND-NEW domain module (mirrors `core-loops.module.ts`'s own P3-A C1 "tunables-only shell"
//             posture, not an extension of a pre-existing tunables file).
//             — P3-F C1 — 2026-07-18
//
// EXTENDED P3-G C1 (2026-07-20, DD-G5): + 8 NEW `meta.*` getters (design
// `2026-07-19-p3-G-budgets-horizon-design.md` §15 — Budgets & Horizon: Complexity Budget / Possibility
// Horizon / Isostatic Debt). DD-G5 — "Tunables extend the EXISTING `meta-progression-tunables.ts` (same
// CAPS/clamp/frozen-getter conventions, same admin PUT)": the `meta.*` namespace stays single-homed
// across BOTH ch06 sub-lots (P3-F's `DelegationRatchetModule` + P3-G's sibling `BudgetsHorizonModule`,
// DD-G1) — the shared P3-F PUT `tunables/meta-progression` endpoint's key list grows purely additively
// (seam §2 row 8, C0 re-anchor §6: "zero code change needed there, driven entirely by
// META_PROGRESSION_TUNABLE_CAPS[key] lookup"). Registry: gdd/14_tunable_constants.md §"Meta — Complexity
// Budget & Possibility Horizon" + §"Meta — Isostatic Debt" (NORMALIZED same commit — the pre-existing
// `T.meta.*` rows for the 4 P3-G-created keys in each section are renamed to their `meta.*` canonical
// form, `T.meta.*` kept as an alias note per row; the honest NOT-created rows stay `T.meta.*`-only with
// an INERT/alias note added, never deleted).
//
// EXTENDED P3-H C1 (2026-07-24, DD-H5): + 13 NEW `meta.*` key FAMILIES (24 literal getters — several
// families expand to per-tier sub-keys `_t1.._t4`, design `2026-07-24-p3-H-vertical-horizon-design.md`
// §12 — Vertical Horizon: Decision Horizon Lock / Pressure Inverse / Benchmark Drift). DD-H5 — "Tunables
// extend the EXISTING `meta-progression-tunables.ts`" — the `meta.*` namespace stays single-homed across
// ALL THREE ch06 sub-lots now (P3-F/P3-G/P3-H's own sibling `VerticalHorizonModule`). Registry: gdd/14_
// tunable_constants.md §"Meta — Decision Horizon Lock" + §"Meta — Pressure Inverse" + §"Meta — Benchmark
// Drift" (NORMALIZED same commit — the pre-existing unprefixed `T.meta.*` rows in all 3 sections are
// renamed to their `meta.*` canonical form, `T.meta.*` kept as an alias note per row). `resolution_time_
// per_tier_t{1-4}` are STRING getters (`resolveString`, no CAPS-map clamp — mirrors `auth.jwt_signing_
// algo`'s own established convention) — canon itself: "Non-enforced serveur (charge réelle)", divergence
// #9, display-only. `error_cascade_depth_per_tier_t{1-4}` are RESERVED-consumer knobs (divergence #8, no
// propagation system exists v1) — registered, never a fake runtime EFFECT.
//
// `meta-progression-tunables.ts` — registry-mirrored getters for the `meta.*` store keys the ch06
// Delegation Ratchet + Budgets & Horizon + Vertical Horizon lots need (P3-F design §13 + P3-G design §15
// + P3-H design §12). R2.3 (NO inline numeric balance/config): every default below is verbatim from
// gdd/14 §Meta (normalized R2.3, same commit) — the single source of truth. If a registry value changes,
// update gdd/14 + this file in the SAME commit (R9.3).
//
// NOT registered as store keys here (P3-F design §13 "NOT created — honest non-knobs", gdd/14
// invariant/inert rows instead, same-commit normalization): mastery deltas `+1`/`−2` and bucket bounds
// `20`/`40` (GDD-verbatim mechanics constants, L45 — a knob here would let a DB override silently
// rebalance a fixed GDD number, never the intent); `meta.max_nested_delegations` (no delegation-tree
// substrate v1 — no nesting depth exists to bound, a fake runtime key would be pure fig-leaf, decisions
// R5 anchor); the 2 canon client cache/poll TTLs `recall_debt_proficiency_cache_ttl_s`/`recall_debt_bo_
// poll_interval_s` (Unity/BO-front deferred — zero code reader this lot, gdd/14 rows stay `T.meta.*`-only,
// UNCHANGED). P3-G design §15's OWN 7 honest non-knobs (`complexity_budget_cap` — D1, the ch09 column IS
// the cap; `suspension_behavior` — ★#3 DEFERRED; `predicate_eval_frequency` — D5 per-session architectural
// v1; `capability_adoption_cost` — per-capability catalogue constants, ★#4 invariant family;
// `max_script_depth` — ALREADY LIVE as `dsl.max_nested_condition_depth`, divergence #9 alias;
// `primitive_unlock_pacing`/`primitive_complexity_caps_per_tier` — architectural invariant / no substrate
// v1) get NO getter here either — same discipline, gdd/14 rows annotated, never a fake runtime key.
// P3-H design §12's OWN honest non-knob: `one_decision_structural_per_session_cap` (the P3-A key IS the
// enforced cap — REUSE unchanged, ★H-1; the getter that consumes it is modulated at C5, not this key).
//
// Every created getter is value-sensitive (a flip moves observable behavior, E2E-proven at its owning
// chunk — C2+ for P3-F's 11, C2+/C7+/C8+ for P3-G's 8, C2+/C3+/C4+/C5+/C6+/C7+ for P3-H's 13 families).
// C1's OWN floor proves only that every getter RESOLVES its exact default and CLAMPS an out-of-range
// override (`meta_progression_tunables.spec.ts` + `budgets_horizon_tunables.spec.ts` +
// `vertical_horizon_tunables.spec.ts`) — no consumer exists yet for the P3-H 13 families at this chunk.

import { TunablesStore } from '../config/tunables-store';

/** Min/max clamp range per key (mirrors `LIVE_OPS_TUNABLE_CAPS`'s shape). */
export interface MetaProgressionTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `META_PROGRESSION_TUNABLE_CAPS` — the per-key allowed range for DB/env overrides, verbatim from the
 * gdd/14 §Meta Range column (design §13). Used internally by every numeric getter below (defense-in-depth:
 * the getter itself never returns an out-of-bounds value even if a raw override was written out of range).
 */
export const META_PROGRESSION_TUNABLE_CAPS: Record<string, MetaProgressionTunableRange> = {
  // ── Graduated Retirement (graduated_retirement_pivot.md §Tunables) ─────────────────────────────
  'meta.mastery_retirement_threshold':                  { min: 30,  max: 80 },
  'meta.graduation_script_seed_depth':                  { min: 10,  max: 40 },
  // ── Promotion Lock (promotion_lock.md §Tunables) ────────────────────────────────────────────────
  'meta.retirement_lock_delay_h':                       { min: 0,   max: 4  },
  'meta.promotion_lock_reversal_cost_multiplier':       { min: 1,   max: 10 },
  'meta.promotion_lock_reversal_window_days':           { min: 1,   max: 30 },
  // ── Recall Debt (recall_debt.md §Tunables) ──────────────────────────────────────────────────────
  'meta.recall_debt_accumulation_per_session':          { min: 1,   max: 6  },
  'meta.recall_debt_max':                               { min: 20,  max: 50 },
  'meta.recovery_period_base_sessions':                 { min: 1,   max: 5  },
  'meta.recovery_period_scaling_per_debt':               { min: 0.5, max: 2  },
  // ── Recall Debt / D11 [PROV-Y26Q2] additions — canon names the behavior with no number ──────────
  'meta.recovery_pressure_cards_per_session':            { min: 0,   max: 3  },
  'meta.unmanaged_window_pressure_cards_per_session':    { min: 0,   max: 3  },
  // ── P3-G C1 — Complexity Budget (complexity_budget.md §Tunables) ───────────────────────────────
  'meta.base_cost_unscripted_task':                      { min: 5,   max: 20 },
  'meta.residual_cost_delegated_task':                   { min: 1,   max: 5  },
  // ── P3-G C1 — Possibility Horizon (possibility_horizon.md §Tunables) ───────────────────────────
  'meta.horizon_feed_capacity':                          { min: 3,   max: 10 },
  'meta.visible_predicates_shown':                       { min: 0,   max: 3  },
  // ── P3-G C1 — Isostatic Debt (isostatic_debt.md §Mechanic §Tunables) ───────────────────────────
  'meta.structural_debt_ratio_per_upgrade':              { min: 0.1, max: 0.6 },
  'meta.active_debt_reduction_per_decision':             { min: 1,   max: 5  },
  'meta.passive_decay_rate':                             { min: 0.5, max: 3  },
  'meta.debt_visibility_threshold':                      { min: 0,   max: 50 },
  // ── P3-H C1 — Decision Horizon Lock (decision_horizon_lock.md §Mechanic §Tunables) ─────────────
  // cycles_per_horizon_tier ships as 3 sub-keys (_t1/_t2/_t3, design §12 "stored as _t1/_t2/_t3").
  // Canon range = "±1 cycle par tier" (gdd/14 §Meta — Decision Horizon Lock) — realized here as
  // default±1, FLOORED at 1 (a 0-cycle execution window is not a coherent plan, canon's own "T1 = 1
  // cycle" floor) — a coder judgment call on the RANGE ENDPOINTS only, disclosed, no default changed.
  'meta.cycles_per_horizon_tier_t1':                     { min: 1,   max: 2  },
  'meta.cycles_per_horizon_tier_t2':                     { min: 2,   max: 4  },
  'meta.cycles_per_horizon_tier_t3':                     { min: 5,   max: 7  },
  'meta.script_stability_cycles_tier2':                  { min: 5,   max: 20 },
  'meta.script_stability_cycles_tier3':                  { min: 15,  max: 40 },
  'meta.plan_abort_recovery_cost_pct':                   { min: 30,  max: 70 },
  // ── P3-H C1 — Pressure Inverse (pressure_inverse.md §Mechanic §Tunables) ────────────────────────
  'meta.pressure_tier_unlock_graduation_count':          { min: 2,   max: 5  },
  'meta.pressure_tier4_observation_phase_h':             { min: 12,  max: 72 },
  // decisions_per_session_display_t{1-4} — DISPLAY only (D7/divergence #3, the enforced axis stays the
  // P3-A cap — ★H-1). Per-tier ranges verbatim gdd/14 §Meta — Pressure Inverse.
  'meta.decisions_per_session_display_t1':               { min: 8,   max: 15 },
  'meta.decisions_per_session_display_t2':               { min: 5,   max: 10 },
  'meta.decisions_per_session_display_t3':               { min: 3,   max: 6  },
  'meta.decisions_per_session_display_t4':               { min: 1,   max: 3  },
  // error_cascade_depth_per_tier_t{1-4} — RESERVED consumer (divergence #8, no propagation system
  // exists v1; the knob is registered, the consumer is a named TD). Canon range "0..3 hops par tier"
  // applied per-tier (gdd/14 §Meta — Pressure Inverse).
  'meta.error_cascade_depth_per_tier_t1':                { min: 0,   max: 3  },
  'meta.error_cascade_depth_per_tier_t2':                { min: 0,   max: 3  },
  'meta.error_cascade_depth_per_tier_t3':                { min: 0,   max: 3  },
  'meta.error_cascade_depth_per_tier_t4':                { min: 0,   max: 3  },
  // resolution_time_per_tier_t{1-4} — STRING getters (duration-range values, e.g. "5-10s"), NO numeric
  // clamp entry (mirrors `dsl.jwt_signing_algo`/`maintenance.failure_repair_heat_magnitude_band`'s own
  // established "resolveString, no CAPS-map" convention elsewhere in this codebase) — display-only,
  // non-enforced (canon: "Non-enforced serveur (charge réelle)", divergence #9).
  // ── P3-H C1 — Benchmark Drift (benchmark_drift.md §Tunables) ────────────────────────────────────
  'meta.drift_accumulation_rate_pct_day':                { min: 0.5, max: 5  },
  'meta.reanchor_uses_per_week':                         { min: 1,   max: 3  },
  'meta.benchmark_auto_update_threshold_pct':            { min: 10,  max: 40 },
  'meta.metrics_simultaneous_reanchor':                  { min: 1,   max: 6  },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors `clampLiveOpsTunableToRange`).
 * Used internally by every numeric getter below. Returns the value unchanged if no range is registered.
 */
export function clampMetaProgressionTunableToRange(key: string, value: number): number {
  const range = META_PROGRESSION_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `meta.*` tunable keys: P3-F C1's original 11 + P3-G C1's 8 (DD-G5) + P3-H C1's 24 (13 families, DD-H5, EXTENDED — 43 total literal getters). */
export const metaProgressionTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Graduated Retirement (graduated_retirement_pivot.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.mastery_retirement_threshold` — the `raw_score` threshold `ELIGIBLE` is derived FROM (never
   * stored — D1). Default 50, range 30..80 (gdd/14 §Meta — Graduated Retirement, alias `T.meta.mastery_
   * retirement_threshold`). used_by (C2+): `MasteryAccumulatorService` crossing detection,
   * `GraduationService.validateGraduationEligible` (server-side re-derivation, never trusted from client).
   */
  get masteryRetirementThreshold(): number {
    return clampMetaProgressionTunableToRange('meta.mastery_retirement_threshold',
      TunablesStore.resolveInt('meta.mastery_retirement_threshold', 'META_MASTERY_RETIREMENT_THRESHOLD', 50));
  },

  /**
   * `meta.graduation_script_seed_depth` — N: the last-N REAL decisions the graduation seed pipeline
   * extracts (D5). Default 20, range 10..40 (gdd/14 §Meta — Graduated Retirement, alias `T.meta.
   * graduation_script_seed_depth`). used_by (C4+): the per-category decision-log extractors.
   */
  get graduationScriptSeedDepth(): number {
    return clampMetaProgressionTunableToRange('meta.graduation_script_seed_depth',
      TunablesStore.resolveInt('meta.graduation_script_seed_depth', 'META_GRADUATION_SCRIPT_SEED_DEPTH', 20));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Promotion Lock (promotion_lock.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.retirement_lock_delay_h` — real hours of post-graduation lock before a BO override is allowed
   * for the category (D4 — checked in the BO endpoint, no timer process). Default 1, range 0..4 (gdd/14
   * §Meta — Graduated Retirement, alias `T.meta.retirement_lock_delay_h`).
   * used_by: NONE in production v1 (C11 correction, ⊥ C10 MINOR-C10-1) — `force-close-window` (C10) is
   * ungated by this delay (design §12 "Blocked… n/a (lock-delay guards the graduation-override TD)"; the
   * ONLY call site is the test-echo `delegation-ratchet-test.controller.ts`). The delay's real intended
   * consumer is the deferred `POST override-graduation` endpoint (TD-304) — this getter is honestly ahead
   * of its own consumer, not a dead knob (gdd/14 §Meta carries the same corrected note).
   */
  get retirementLockDelayH(): number {
    return clampMetaProgressionTunableToRange('meta.retirement_lock_delay_h',
      TunablesStore.resolveInt('meta.retirement_lock_delay_h', 'META_RETIREMENT_LOCK_DELAY_H', 1));
  },

  /**
   * `meta.promotion_lock_reversal_cost_multiplier` — the canon "re-delegation capped 3×" COST multiplier
   * (★#2 ruled — NOT a count cap, D12). Default 3, range 1..10 (gdd/14 §Meta — Graduated Retirement, alias
   * `T.meta.promotion_lock_reversal_cost_multiplier`). used_by (C8): `PromotionLockService.
   * applyReversalDamage` — multiplies `SEVERANCE_WEIGHT[severance_bucket]` (the numeric cost surface fed
   * into the REAL 04c accord ring) on a re-delegation recall ONLY (`hasPriorLock`), per canon
   * `promotion_lock.md` §Transform step 7 ("le coût ... est multiplié par" this tunable) — ⊥ IMPORTANT-C8-1
   * fix, 2026-07-19 (`.review-c8/VERDICT.md`; the ORIGINAL "computeReversalCost's severance band
   * escalation" phrasing here was FALSE — the getter was never actually read anywhere pre-fix). The
   * qualitative severance-BAND escalation (LOW->MEDIUM etc.) is a SEPARATE, ALREADY-consumed mechanism
   * (`severance-bucket.ts#escalateSeveranceBucket`, a fixed +1 step, not driven by this getter's value).
   */
  get promotionLockReversalCostMultiplier(): number {
    return clampMetaProgressionTunableToRange('meta.promotion_lock_reversal_cost_multiplier',
      TunablesStore.resolveInt('meta.promotion_lock_reversal_cost_multiplier', 'META_PROMOTION_LOCK_REVERSAL_COST_MULTIPLIER', 3));
  },

  /**
   * `meta.promotion_lock_reversal_window_days` — the unmanaged window's duration in REAL days (D10). C8's
   * `windowTicks = round(days * 86400 / citySimTunables.realSecondsPerGameMinute)` helper (C0 R9-pinned)
   * consumes this getter, never a re-derived constant. Default 7, range 1..30 (gdd/14 §Meta — Graduated
   * Retirement, alias `T.meta.promotion_lock_reversal_window_days`). used_by (C8+): `initiateRecall` +
   * `PROMOTION_LOCK_TICK`.
   */
  get promotionLockReversalWindowDays(): number {
    return clampMetaProgressionTunableToRange('meta.promotion_lock_reversal_window_days',
      TunablesStore.resolveInt('meta.promotion_lock_reversal_window_days', 'META_PROMOTION_LOCK_REVERSAL_WINDOW_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Recall Debt (recall_debt.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.recall_debt_accumulation_per_session` — the accrual amount added to `recall_debt_total` per REAL
   * closed session while DELEGATED (D9). Default 3, range 1..6 (gdd/14 §Meta — Recall Debt, alias `T.meta.
   * recall_debt_accumulation_per_session`). used_by (C7+): `RecallDebtSessionSubscriber`.
   */
  get recallDebtAccumulationPerSession(): number {
    return clampMetaProgressionTunableToRange('meta.recall_debt_accumulation_per_session',
      TunablesStore.resolveInt('meta.recall_debt_accumulation_per_session', 'META_RECALL_DEBT_ACCUMULATION_PER_SESSION', 3));
  },

  /**
   * `meta.recall_debt_max` — the cap `recall_debt_total` clamps to (`LEAST(cap, …)`, D9). Also the
   * denominator for the LOW/MEDIUM/HIGH signal thirds (§10.2). Default 30, range 20..50 (gdd/14 §Meta —
   * Recall Debt, alias `T.meta.recall_debt_max`). used_by (C7+): the accrual UPDATE + signal derivation.
   */
  get recallDebtMax(): number {
    return clampMetaProgressionTunableToRange('meta.recall_debt_max',
      TunablesStore.resolveInt('meta.recall_debt_max', 'META_RECALL_DEBT_MAX', 30));
  },

  /**
   * `meta.recovery_period_base_sessions` — the `base` term in `recovery_period_remaining = base +
   * floor(debt/10) × scaling` (design §10.3 verbatim). Default 2, range 1..5 (gdd/14 §Meta — Recall Debt,
   * alias `T.meta.recovery_period_base_sessions`). used_by (C8+): the recall-tx realization step.
   */
  get recoveryPeriodBaseSessions(): number {
    return clampMetaProgressionTunableToRange('meta.recovery_period_base_sessions',
      TunablesStore.resolveInt('meta.recovery_period_base_sessions', 'META_RECOVERY_PERIOD_BASE_SESSIONS', 2));
  },

  /**
   * `meta.recovery_period_scaling_per_debt` — the `scaling` term in the SAME formula (sessions per 10
   * debt). Default 1, range 0.5..2 (gdd/14 §Meta — Recall Debt, alias `T.meta.recovery_period_scaling_per_
   * debt`). used_by (C8+): the recall-tx realization step.
   */
  get recoveryPeriodScalingPerDebt(): number {
    return clampMetaProgressionTunableToRange('meta.recovery_period_scaling_per_debt',
      TunablesStore.resolveFloat('meta.recovery_period_scaling_per_debt', 'META_RECOVERY_PERIOD_SCALING_PER_DEBT', 1));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Recall Debt / D11 — 2 [PROV-Y26Q2] additions (canon names the behavior, gives no number)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.recovery_pressure_cards_per_session` — per-session ceiling on `DegradedCategoryPressureProducer`
   * candidate cards while `recovery_period_remaining > 0` (D11 — a ceiling, never a target; the category's
   * REAL current state may offer fewer, or zero). `[PROV-Y26Q2]`. Default 1, range 0..3 (gdd/14 §Meta —
   * Recall Debt, NEW row this lot — R9.3 same commit). used_by (C9+): `DegradedCategoryPressureProducer`.
   */
  get recoveryPressureCardsPerSession(): number {
    return clampMetaProgressionTunableToRange('meta.recovery_pressure_cards_per_session',
      TunablesStore.resolveInt('meta.recovery_pressure_cards_per_session', 'META_RECOVERY_PRESSURE_CARDS_PER_SESSION', 1));
  },

  /**
   * `meta.unmanaged_window_pressure_cards_per_session` — the SAME per-session ceiling, for categories
   * under an ACTIVE unmanaged window instead of (or in addition to) recovery (D11). `[PROV-Y26Q2]`.
   * Default 1, range 0..3 (gdd/14 §Meta — Recall Debt, NEW row this lot — R9.3 same commit). used_by
   * (C9+): `DegradedCategoryPressureProducer`.
   */
  get unmanagedWindowPressureCardsPerSession(): number {
    return clampMetaProgressionTunableToRange('meta.unmanaged_window_pressure_cards_per_session',
      TunablesStore.resolveInt('meta.unmanaged_window_pressure_cards_per_session', 'META_UNMANAGED_WINDOW_PRESSURE_CARDS_PER_SESSION', 1));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-G C1 — Complexity Budget (complexity_budget.md §Tunables, design §15)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.base_cost_unscripted_task` — the per-category complexity-unit cost for a SELF or unassigned
   * task category (D2 — `computeUsed`'s per-category weight). Default 10, range 5..20 (gdd/14 §Meta —
   * Complexity Budget & Possibility Horizon, alias `T.meta.base_cost_unscripted_task`). used_by (C4+):
   * `BudgetRecomputeService.computeUsed`.
   */
  get baseCostUnscriptedTask(): number {
    return clampMetaProgressionTunableToRange('meta.base_cost_unscripted_task',
      TunablesStore.resolveInt('meta.base_cost_unscripted_task', 'META_BASE_COST_UNSCRIPTED_TASK', 10));
  },

  /**
   * `meta.residual_cost_delegated_task` — the RESIDUAL per-category cost once a category is DELEGATED
   * (D2 — the budget never reaches zero cost, delegation frees the DIFFERENCE, never the whole weight).
   * Default 2, range 1..5 (gdd/14 §Meta — Complexity Budget & Possibility Horizon, alias `T.meta.
   * residual_cost_delegated_task`). used_by (C4+): `BudgetRecomputeService.computeUsed`.
   */
  get residualCostDelegatedTask(): number {
    return clampMetaProgressionTunableToRange('meta.residual_cost_delegated_task',
      TunablesStore.resolveInt('meta.residual_cost_delegated_task', 'META_RESIDUAL_COST_DELEGATED_TASK', 2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-G C1 — Possibility Horizon (possibility_horizon.md §Tunables, design §15)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.horizon_feed_capacity` — the max simultaneous `unseen|seen|deferred` cards per player (D5 —
   * a satisfied capability past capacity re-surfaces at the NEXT session open once a slot frees, no
   * queue store). Default 5, range 3..10 (gdd/14 §Meta — Complexity Budget & Possibility Horizon, alias
   * `T.meta.horizon_feed_capacity`). used_by (C3+): `HorizonFeedService` surfacing capacity check.
   */
  get horizonFeedCapacity(): number {
    return clampMetaProgressionTunableToRange('meta.horizon_feed_capacity',
      TunablesStore.resolveInt('meta.horizon_feed_capacity', 'META_HORIZON_FEED_CAPACITY', 5));
  },

  /**
   * `meta.visible_predicates_shown` — how many predicate clauses render on a horizon card (§13 P5
   * selection rule — most-recently-true first). `0` = full mystery mode, `3` ≡ canon "all" (the LIVE
   * capabilities carry ≤ 3 clauses). Default 1, range 0..3 (gdd/14 §Meta — Complexity Budget &
   * Possibility Horizon, alias `T.meta.visible_predicates_shown`). used_by (C9+): the horizon feed card
   * projection.
   */
  get visiblePredicatesShown(): number {
    return clampMetaProgressionTunableToRange('meta.visible_predicates_shown',
      TunablesStore.resolveInt('meta.visible_predicates_shown', 'META_VISIBLE_PREDICATES_SHOWN', 1));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-G C1 — Isostatic Debt (isostatic_debt.md §Mechanic §Tunables, design §15)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.structural_debt_ratio_per_upgrade` — the fraction of `capacity_units_granted` (the ★#4
   * invariant, 40) added to `structural_debt` on each capability adoption (D10 — `applyUpgrade`).
   * Default 0.3, range 0.1..0.6 (gdd/14 §Meta — Isostatic Debt, alias `T.meta.structural_debt_ratio_per_
   * upgrade`). used_by (C7+): `IsostaticDebtService.applyUpgrade`.
   */
  get structuralDebtRatioPerUpgrade(): number {
    return clampMetaProgressionTunableToRange('meta.structural_debt_ratio_per_upgrade',
      TunablesStore.resolveFloat('meta.structural_debt_ratio_per_upgrade', 'META_STRUCTURAL_DEBT_RATIO_PER_UPGRADE', 0.3));
  },

  /**
   * `meta.active_debt_reduction_per_decision` — the POSITIVE magnitude subtracted from `structural_debt`
   * per correct-decision active-decay event (`ScriptAttachedEvent` revision + the ADD_RULE resolve-hook
   * sibling, D10 — canon's negative sign is presentation, stored/applied as a decrement here). Default 2,
   * range 1..5 (gdd/14 §Meta — Isostatic Debt, alias `T.meta.active_debt_reduction_per_decision`).
   * used_by (C7+): `IsostaticDebtService.applyActiveDecay`.
   */
  get activeDebtReductionPerDecision(): number {
    return clampMetaProgressionTunableToRange('meta.active_debt_reduction_per_decision',
      TunablesStore.resolveInt('meta.active_debt_reduction_per_decision', 'META_ACTIVE_DEBT_REDUCTION_PER_DECISION', 2));
  },

  /**
   * `meta.passive_decay_rate` — the POSITIVE magnitude subtracted from `structural_debt` per ELAPSED
   * in-game hour (D11 — the HOURLY/8 tick's own elapsed-based derivation, `(nowGameMinute −
   * last_decay_tick) / 60`, never a second real-time ratio, C0 R9-pinned). Default 1, range 0.5..3
   * (gdd/14 §Meta — Isostatic Debt, alias `T.meta.passive_decay_rate`). used_by (C8+):
   * `ISOSTATIC_DEBT_TICK`.
   */
  get passiveDecayRate(): number {
    return clampMetaProgressionTunableToRange('meta.passive_decay_rate',
      TunablesStore.resolveFloat('meta.passive_decay_rate', 'META_PASSIVE_DECAY_RATE', 1));
  },

  /**
   * `meta.debt_visibility_threshold` — the minimum `structural_debt` for the debt bucket/badge to
   * surface to the player (sub-threshold rows stay ABSENT from the player payload, P5, while PRESENT in
   * the C10 admin read). Default 10, range 0..50 (gdd/14 §Meta — Isostatic Debt, alias `T.meta.debt_
   * visibility_threshold`). used_by (C8+/C9+): the debt projection.
   */
  get debtVisibilityThreshold(): number {
    return clampMetaProgressionTunableToRange('meta.debt_visibility_threshold',
      TunablesStore.resolveInt('meta.debt_visibility_threshold', 'META_DEBT_VISIBILITY_THRESHOLD', 10));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-H C1 — Decision Horizon Lock (decision_horizon_lock.md §Mechanic §Tunables, design §12)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.cycles_per_horizon_tier_t1` — T1's own execution-window bound (design §6.1 — T1 = 1 cycle,
   * ABORT-only). Default 1, range 1..2 (canon "±1 cycle par tier", floored at 1 — see the CAPS map's own
   * note; gdd/14 §Meta — Decision Horizon Lock, alias `T.meta.cycles_per_horizon_tier`). used_by (C2+):
   * `ExecutionPlanService.createPlan` (`execution_window <= cycles_ahead(tier)`).
   */
  get cyclesPerHorizonTierT1(): number {
    return clampMetaProgressionTunableToRange('meta.cycles_per_horizon_tier_t1',
      TunablesStore.resolveInt('meta.cycles_per_horizon_tier_t1', 'META_CYCLES_PER_HORIZON_TIER_T1', 1));
  },

  /**
   * `meta.cycles_per_horizon_tier_t2` — T2's own execution-window bound. Default 3, range 2..4 (canon
   * "±1 cycle par tier"; gdd/14 §Meta — Decision Horizon Lock, alias `T.meta.cycles_per_horizon_tier`).
   * used_by (C2+): `ExecutionPlanService.createPlan`.
   */
  get cyclesPerHorizonTierT2(): number {
    return clampMetaProgressionTunableToRange('meta.cycles_per_horizon_tier_t2',
      TunablesStore.resolveInt('meta.cycles_per_horizon_tier_t2', 'META_CYCLES_PER_HORIZON_TIER_T2', 3));
  },

  /**
   * `meta.cycles_per_horizon_tier_t3` — T3's own execution-window bound. Default 6, range 5..7 (canon
   * "±1 cycle par tier"; gdd/14 §Meta — Decision Horizon Lock, alias `T.meta.cycles_per_horizon_tier`).
   * used_by (C2+): `ExecutionPlanService.createPlan`.
   */
  get cyclesPerHorizonTierT3(): number {
    return clampMetaProgressionTunableToRange('meta.cycles_per_horizon_tier_t3',
      TunablesStore.resolveInt('meta.cycles_per_horizon_tier_t3', 'META_CYCLES_PER_HORIZON_TIER_T3', 6));
  },

  /**
   * `meta.script_stability_cycles_tier2` — consecutive no-deviation cycles required for T1→T2 advancement
   * (D6). Default 10, range 5..20 (gdd/14 §Meta — Decision Horizon Lock, alias `T.meta.script_stability_
   * cycles_tier2`). used_by (C4+): `HorizonTierAdvancementService.advance`, `ScriptStabilityCounter.
   * tier_target`.
   */
  get scriptStabilityCyclesTier2(): number {
    return clampMetaProgressionTunableToRange('meta.script_stability_cycles_tier2',
      TunablesStore.resolveInt('meta.script_stability_cycles_tier2', 'META_SCRIPT_STABILITY_CYCLES_TIER2', 10));
  },

  /**
   * `meta.script_stability_cycles_tier3` — consecutive no-deviation cycles required for T2→T3 advancement
   * (D6). Default 25, range 15..40 (gdd/14 §Meta — Decision Horizon Lock, alias `T.meta.script_stability_
   * cycles_tier3`). used_by (C4+): `HorizonTierAdvancementService.advance`, `ScriptStabilityCounter.
   * tier_target`.
   */
  get scriptStabilityCyclesTier3(): number {
    return clampMetaProgressionTunableToRange('meta.script_stability_cycles_tier3',
      TunablesStore.resolveInt('meta.script_stability_cycles_tier3', 'META_SCRIPT_STABILITY_CYCLES_TIER3', 25));
  },

  /**
   * `meta.plan_abort_recovery_cost_pct` — percentage (0-100) of the resource engaged by unexecuted slots
   * that is recovered after ABORT (100 − pct = lost cost, D4). Default 50, range 30..70 (gdd/14 §Meta —
   * Decision Horizon Lock, alias `T.meta.plan_abort_recovery_cost_pct`). used_by (C3+):
   * `ExecutionPlanEvaluatorService.applyAbort`.
   */
  get planAbortRecoveryCostPct(): number {
    return clampMetaProgressionTunableToRange('meta.plan_abort_recovery_cost_pct',
      TunablesStore.resolveInt('meta.plan_abort_recovery_cost_pct', 'META_PLAN_ABORT_RECOVERY_COST_PCT', 50));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-H C1 — Pressure Inverse (pressure_inverse.md §Mechanic §Tunables, design §12)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.pressure_tier_unlock_graduation_count` — graduations needed to advance `pressure_tier` (D8).
   * Default 3, range 2..5 (gdd/14 §Meta — Pressure Inverse, alias `T.meta.pressure_tier_unlock_graduation_
   * count`). used_by (C5+): `PressureTierService.onGraduation`.
   */
  get pressureTierUnlockGraduationCount(): number {
    return clampMetaProgressionTunableToRange('meta.pressure_tier_unlock_graduation_count',
      TunablesStore.resolveInt('meta.pressure_tier_unlock_graduation_count', 'META_PRESSURE_TIER_UNLOCK_GRADUATION_COUNT', 3));
  },

  /**
   * `meta.pressure_tier4_observation_phase_h` — real-time hours of the T4 observation window before the
   * cap returns to normal (D9). Default 24, range 12..72 (gdd/14 §Meta — Pressure Inverse, alias `T.meta.
   * pressure_tier4_observation_phase_h`). used_by (C5+): `PressureTierService.onGraduation` (stamp),
   * `structuralCapForPlayer` (the ★H-1 cap-reconciliation getter, C5).
   */
  get pressureTier4ObservationPhaseH(): number {
    return clampMetaProgressionTunableToRange('meta.pressure_tier4_observation_phase_h',
      TunablesStore.resolveInt('meta.pressure_tier4_observation_phase_h', 'META_PRESSURE_TIER4_OBSERVATION_PHASE_H', 24));
  },

  /**
   * `meta.decisions_per_session_display_t1` — the T1 `DecisionLoadIndicator` DISPLAY cadence (D7/
   * divergence #3 — NON-enforced; the ENFORCED axis stays the P3-A `structuralCapForPlayer` value, ★H-1).
   * Default 12, range 8..15 (gdd/14 §Meta — Pressure Inverse, alias `T.meta.decisions_per_session_per_
   * tier`). used_by (C8+): the `DecisionLoadTierComposite` display projection.
   */
  get decisionsPerSessionDisplayT1(): number {
    return clampMetaProgressionTunableToRange('meta.decisions_per_session_display_t1',
      TunablesStore.resolveInt('meta.decisions_per_session_display_t1', 'META_DECISIONS_PER_SESSION_DISPLAY_T1', 12));
  },

  /**
   * `meta.decisions_per_session_display_t2` — the T2 DISPLAY cadence (D7/divergence #3). Default 8, range
   * 5..10 (gdd/14 §Meta — Pressure Inverse). used_by (C8+): the `DecisionLoadTierComposite` display
   * projection.
   */
  get decisionsPerSessionDisplayT2(): number {
    return clampMetaProgressionTunableToRange('meta.decisions_per_session_display_t2',
      TunablesStore.resolveInt('meta.decisions_per_session_display_t2', 'META_DECISIONS_PER_SESSION_DISPLAY_T2', 8));
  },

  /**
   * `meta.decisions_per_session_display_t3` — the T3 DISPLAY cadence (D7/divergence #3). Default 4, range
   * 3..6 (gdd/14 §Meta — Pressure Inverse). used_by (C8+): the `DecisionLoadTierComposite` display
   * projection.
   */
  get decisionsPerSessionDisplayT3(): number {
    return clampMetaProgressionTunableToRange('meta.decisions_per_session_display_t3',
      TunablesStore.resolveInt('meta.decisions_per_session_display_t3', 'META_DECISIONS_PER_SESSION_DISPLAY_T3', 4));
  },

  /**
   * `meta.decisions_per_session_display_t4` — the T4 DISPLAY cadence (D7/divergence #3). Default 2, range
   * 1..3 (gdd/14 §Meta — Pressure Inverse). used_by (C8+): the `DecisionLoadTierComposite` display
   * projection.
   */
  get decisionsPerSessionDisplayT4(): number {
    return clampMetaProgressionTunableToRange('meta.decisions_per_session_display_t4',
      TunablesStore.resolveInt('meta.decisions_per_session_display_t4', 'META_DECISIONS_PER_SESSION_DISPLAY_T4', 2));
  },

  /**
   * `meta.error_cascade_depth_per_tier_t1` — T1's error-cascade hop bound. RESERVED consumer (divergence
   * #8 — no downstream-error-propagation system exists v1; the knob is registered, the consumer is a
   * named TD). Default 0, range 0..3 (gdd/14 §Meta — Pressure Inverse, alias `T.meta.error_cascade_depth_
   * per_tier`). used_by : none v1 (RESERVED-inert).
   */
  get errorCascadeDepthPerTierT1(): number {
    return clampMetaProgressionTunableToRange('meta.error_cascade_depth_per_tier_t1',
      TunablesStore.resolveInt('meta.error_cascade_depth_per_tier_t1', 'META_ERROR_CASCADE_DEPTH_PER_TIER_T1', 0));
  },

  /**
   * `meta.error_cascade_depth_per_tier_t2` — T2's error-cascade hop bound. RESERVED consumer (divergence
   * #8). Default 1, range 0..3 (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (RESERVED-inert).
   */
  get errorCascadeDepthPerTierT2(): number {
    return clampMetaProgressionTunableToRange('meta.error_cascade_depth_per_tier_t2',
      TunablesStore.resolveInt('meta.error_cascade_depth_per_tier_t2', 'META_ERROR_CASCADE_DEPTH_PER_TIER_T2', 1));
  },

  /**
   * `meta.error_cascade_depth_per_tier_t3` — T3's error-cascade hop bound. RESERVED consumer (divergence
   * #8). Default 2, range 0..3 (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (RESERVED-inert).
   */
  get errorCascadeDepthPerTierT3(): number {
    return clampMetaProgressionTunableToRange('meta.error_cascade_depth_per_tier_t3',
      TunablesStore.resolveInt('meta.error_cascade_depth_per_tier_t3', 'META_ERROR_CASCADE_DEPTH_PER_TIER_T3', 2));
  },

  /**
   * `meta.error_cascade_depth_per_tier_t4` — T4's error-cascade hop bound. RESERVED consumer (divergence
   * #8). Default 3, range 0..3 (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (RESERVED-inert).
   */
  get errorCascadeDepthPerTierT4(): number {
    return clampMetaProgressionTunableToRange('meta.error_cascade_depth_per_tier_t4',
      TunablesStore.resolveInt('meta.error_cascade_depth_per_tier_t4', 'META_ERROR_CASCADE_DEPTH_PER_TIER_T4', 3));
  },

  /**
   * `meta.resolution_time_per_tier_t1` — T1's indicative resolution-time DISPLAY range (canon itself:
   * "Non-enforced serveur (charge réelle)", divergence #9 — a STRING duration-range, never a numeric
   * clamp; `resolveString`, no CAPS-map entry, mirrors `auth.jwt_signing_algo`/`maintenance.failure_
   * repair_heat_magnitude_band`'s own established convention). Default "5-10s" (gdd/14 §Meta — Pressure
   * Inverse, alias `T.meta.resolution_time_per_tier`). used_by : none v1 (display-only, non-enforced).
   */
  get resolutionTimePerTierT1(): string {
    return TunablesStore.resolveString('meta.resolution_time_per_tier_t1', 'META_RESOLUTION_TIME_PER_TIER_T1', '5-10s');
  },

  /**
   * `meta.resolution_time_per_tier_t2` — T2's indicative resolution-time DISPLAY range. Default "30-60s"
   * (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (display-only, non-enforced).
   */
  get resolutionTimePerTierT2(): string {
    return TunablesStore.resolveString('meta.resolution_time_per_tier_t2', 'META_RESOLUTION_TIME_PER_TIER_T2', '30-60s');
  },

  /**
   * `meta.resolution_time_per_tier_t3` — T3's indicative resolution-time DISPLAY range. Default "2-4min"
   * (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (display-only, non-enforced).
   */
  get resolutionTimePerTierT3(): string {
    return TunablesStore.resolveString('meta.resolution_time_per_tier_t3', 'META_RESOLUTION_TIME_PER_TIER_T3', '2-4min');
  },

  /**
   * `meta.resolution_time_per_tier_t4` — T4's indicative resolution-time DISPLAY range. Default "5-10min"
   * (gdd/14 §Meta — Pressure Inverse). used_by : none v1 (display-only, non-enforced).
   */
  get resolutionTimePerTierT4(): string {
    return TunablesStore.resolveString('meta.resolution_time_per_tier_t4', 'META_RESOLUTION_TIME_PER_TIER_T4', '5-10min');
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-H C1 — Benchmark Drift (benchmark_drift.md §Tunables, design §12)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta.drift_accumulation_rate_pct_day` — the per-LIVE-metric per-game-day drift accumulation rate
   * (D11). Default 2, range 0.5..5 (gdd/14 §Meta — Benchmark Drift, alias `T.meta.drift_accumulation_
   * rate_pct_day`). used_by (C6+): `BenchmarkDriftService.accumulateDrift` (NIGHTLY/32).
   */
  get driftAccumulationRatePctDay(): number {
    return clampMetaProgressionTunableToRange('meta.drift_accumulation_rate_pct_day',
      TunablesStore.resolveFloat('meta.drift_accumulation_rate_pct_day', 'META_DRIFT_ACCUMULATION_RATE_PCT_DAY', 2));
  },

  /**
   * `meta.reanchor_uses_per_week` — initial re-anchor uses per real week, upgradeable via
   * `HorizonTierAdvancedEvent` (D11/D12). Default 1, range 1..3 (gdd/14 §Meta — Benchmark Drift, alias
   * `T.meta.reanchor_uses_per_week`). used_by (C7+): `BenchmarkQuotaService.onHorizonAdvanced`, the
   * elapsed-at-read weekly reset.
   */
  get reanchorUsesPerWeek(): number {
    return clampMetaProgressionTunableToRange('meta.reanchor_uses_per_week',
      TunablesStore.resolveInt('meta.reanchor_uses_per_week', 'META_REANCHOR_USES_PER_WEEK', 1));
  },

  /**
   * `meta.benchmark_auto_update_threshold_pct` — the drift-accumulator threshold triggering the silent
   * baseline auto-update (D11). Default 20, range 10..40 (gdd/14 §Meta — Benchmark Drift, alias `T.meta.
   * benchmark_auto_update_threshold_pct`). used_by (C6+): `BenchmarkDriftService.accumulateDrift`.
   */
  get benchmarkAutoUpdateThresholdPct(): number {
    return clampMetaProgressionTunableToRange('meta.benchmark_auto_update_threshold_pct',
      TunablesStore.resolveInt('meta.benchmark_auto_update_threshold_pct', 'META_BENCHMARK_AUTO_UPDATE_THRESHOLD_PCT', 20));
  },

  /**
   * `meta.metrics_simultaneous_reanchor` — max metrics re-anchored per single re-anchor action (design
   * §9.3). Default 3, range 1..6 (gdd/14 §Meta — Benchmark Drift, alias `T.meta.metrics_simultaneous_
   * reanchor`). used_by (C7+): `BenchmarkDriftService.reAnchor` (`|metric_kinds| <= ...` gate).
   */
  get metricsSimultaneousReanchor(): number {
    return clampMetaProgressionTunableToRange('meta.metrics_simultaneous_reanchor',
      TunablesStore.resolveInt('meta.metrics_simultaneous_reanchor', 'META_METRICS_SIMULTANEOUS_REANCHOR', 3));
  },
};

// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md C1 (~18 `core_loops.*`/
//             `session.*`/`perf_budget.05_*` getters, registry-first)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §11 (the tunables
//             catalogue) + §1 D8 (`structuralCapForPlayer` — the governor's cap-by-getter seam).
//             Canon: docs/tech/05_player_core_loops/exception_queue_spine.md §Tunables +
//             one_decision_per_session.md §Tunables + loops_interlock_and_antipatterns.md §Tunables.
//             Registry: gdd/14_tunable_constants.md §"Core loops — Exception Queue" +
//             §"Core loops — One Decision Per Session" + §"Core loops — Session Spine + Loop 10 +
//             HighestLeverageCard [P3-A]" (this chunk, same commit — R2.3 registry-FIRST; the 4 legacy
//             `gdd/14:207-210`/`:293-298` rows are NORMALIZED to the prefixed canonical form here, not
//             duplicated).
//             Pattern: mirrors `live-ops.tunables.ts` (CAPS map + clamp function) /
//             `progression-tunables.ts` (plain getters) — the closest same-shape precedents.
//             — P3-A C1 — 2026-07-10
//
// P3-C C1 ADDITION (2026-07-12) — docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md C1
//             (~35 `core_loops.backpressure_*`/`core_loops.sinuosity_*`/`core_loops.mycelial_*` getters
//             design §12 rounds to — the SAME "prose rounds down" pattern P3-B's own
//             `flag-discipline-tunables.ts` header documents; counted verbatim below the catalogue is
//             **38 physical keys**: 9 backpressure (8 canon `backpressure_trace.md:146-155` + 1 NEW
//             `backpressure_relief_per_tick`, D8 divergence #8) + 12 sinuosity (`sinuosity_debt.
//             md:140-153`, 3 of which are cash-plate transpositions of canon composite rows, D11) + 17
//             mycelial (11 canon `mycelial_ledger.md:141-153` incl. 1 cash-plate transposition + 6 NEW:
//             `throughput_normalization_grams`/`backpressure_feed_coefficient`/`debt_cap`/
//             `bypass_resume_threshold` + 2 maintenance cash-plate costs, D11/divergence #4/#8/#9).
//             Canon: docs/tech/05_player_core_loops/backpressure_trace.md §Tunables +
//             sinuosity_debt.md §Tunables + mycelial_ledger.md §Tunables.
//             Registry: gdd/14_tunable_constants.md §"Core loops — Backpressure" / §"— Sinuosity" /
//             §"— Mycelial Ledger" (NORMALIZED same commit — the pre-existing unprefixed legacy rows in
//             all 3 sections are replaced by their canonical `core_loops.*` form here, R9.3; no
//             duplicate value/range definition remains).
//             REUSE, deliberately NOT re-registered here (D9 — repurposed as patch/sever triggers, the
//             keys are contracts, renaming refused): `distribution.sinuosity_direct_max`/
//             `distribution.sinuosity_meandering_max`/`distribution.corridor_debt_*`/
//             `distribution.route_sever_threshold`/`distribution.route_saturated_warn_threshold`
//             (`distribution-tunables.ts`, System 9b — untouched).
//
// P3-D C1 ADDITION (2026-07-13) — docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md C1
//             (16 `core_loops.cue_stack_*`/`core_loops.annealing_*` getters — design §14's own table
//             lists exactly 16 rows; the plan/design prose rounds this to "~17", the SAME "prose rounds"
//             reconciliation this file's own P3-C header above documents for 35→38): 8 cue_stack (3
//             canon `cue_stack_integrity.md:162-171` renamed/repurposed + 4 NEW slot-duration-by-type
//             impl keys + 1 NEW stale-executing-horizon impl key) + 8 annealing (7 canon `annealing_
//             window.md:150-161` + 1 canon-adjacent `base_settling_minutes` sourced from GDD L283 prose,
//             not the tech-doc's own tunables table).
//             Canon: docs/tech/05_player_core_loops/cue_stack_integrity.md §Tunables +
//             annealing_window.md §Tunables + GDD 05_player_core_loops.md L283.
//             Registry: gdd/14_tunable_constants.md §"Core loops — Cue Stack & Annealing [P3-D]"
//             (NORMALIZED same commit — the 8 pre-existing legacy rows across `§Core loops — Cue Stack` /
//             `§Core loops — Annealing` are replaced for the 6 keys that map 1:1 to a new canonical row;
//             the 2 NOT-ported divergences — `cue_stack_dependency_strictness_bits` / `settling_display_
//             granularity` — stay `KEEP-référençable` legacy, unmigrated, R2.3 — decisions §4 divergence
//             #11/#8: v1 realizes both as hardcoded structural behavior, never a store key).
//             NOT registered as store keys (design §14 "NON portés v1", divergences #4/#5/#8/#11):
//             `cue_stack_dependency_strictness_bits` (v1 = hardcoded bits=2-equivalent: soft-warn at
//             compose + time-penalty at firing) / `heat_event_disruption_probability_per_slot`
//             (determinism, D6/D13 reconduced — no RNG anywhere in P3-D) /
//             `named_sequence_unlock_meta_progression_threshold` (composite, never numerically defined —
//             realized instead via the LIVE `rule_vocabulary` tier gate, sub-décision #2) /
//             `annealing.display_granularity` (qualitative EN DUR client-side — P1/P5 strict, a tunable
//             capable of leaking exact minutes to the player would be a P5-hole; BO-only "exact" is
//             structural, not a knob).
//
// `core-loops-tunables.ts` — registry-mirrored getters for the P3-A ch05 tunable catalogue: Exception-
// Queue spine completion (re-priority/aged-out/cap/backlog/confidence/complexity) + Loop 10 governor
// (structural cap/queue-depth/skip-carry/strict-mode/latency budgets) + session lifecycle (stale
// timeout) + HL card (escalation-backlog provider threshold) + F4 perf budget. R2.3 (NO inline numeric
// balance/config): every default below is verbatim from the ch05 tech docs (or, for the 5
// `[PROV-Y26Q2]` honest-gap additions, from the P3-A design's own divergence register §4) — the single
// source of truth is gdd/14. If a registry value changes, update gdd/14 + this file in the SAME commit
// (R9.3).
//
// ★ `one_decision_consider_window_seconds` (last getter below) is a REAL canon tunable
// (`one_decision_per_session.md:123`) that NONE of the 3 P3-A authoring docs (plan/design/decisions)
// enumerate — neither as a key to create nor as a "NOT created" invariant row alongside its 2 sisters
// (`one_decision_tactical_rate_limit`/`one_decision_impact_estimate_accuracy`). Found by exhaustive
// grep of the ch05 tech docs' own `§Tunables` sections during this implementation; registered here for
// R2.3 completeness (it carries a canon-verbatim default/range, so this is not an invented value) —
// flagged for reviewer/C9 reconciliation.
//
// Not registered as store keys (design §11, decisions §4.4 — "design invariant" rows instead, gdd/14
// §"Core loops — Session Spine…" bottom 2 rows): `one_decision_tactical_rate_limit` (canon "none" — a
// degenerate always-"none" knob) and `one_decision_impact_estimate_accuracy` (canon
// "order_of_magnitude" — encoded by the `ImpactEstimateBucket`/`UrgencyBucket` projection itself, C7).
//
// P3-E C1 ADDITION (2026-07-17) — docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md
//             C1 (~29 `core_loops.demolition_*`/`core_loops.compression_*` getters design §14's own
//             prose rounds to — the SAME "prose rounds down" reconciliation this file's own P3-C/P3-D
//             headers already document): design §14's table is 8 demolition + 15 compression canon rows
//             + 6 NEW-additifs = 29 rows exactly; the realized count is **31 physical keys** because ONE
//             composite row (`demolition_friction_budget_bucket_thresholds`) expands into 3 physical
//             threshold getters (design §4.3 "3 seuils 0.5/0.85/1.0" — the SAME expansion shape
//             `sinuosity_*_bucket_upper_bound`/`backpressure_*_threshold` already established, P3-C):
//             10 demolition (6 canon 1:1 + `base_friction_per_node` scalar + 3 bucket thresholds) + 2
//             demolition NEW-additifs + 15 compression (1:1, incl. `severity_multiplier_at_100_stress`
//             realized as a tier-bump amount not a literal multiplier) + 4 compression NEW-additifs.
//             Canon: docs/tech/05_player_core_loops/demolition_mandate.md §Tunables +
//             compression_week.md §Tunables.
//             Registry: gdd/14_tunable_constants.md §"Core loops — Demolition" (2 legacy rows, BOTH
//             migrated in-place) + §"Core loops — Compression Week" (5 legacy rows, ALL migrated
//             in-place) — full clean replacement, NO bracket-tagged satellite section needed (mirrors
//             P3-C's own Backpressure/Sinuosity/Mycelial in-place-replacement pattern, not P3-D's
//             Cue-Stack/Annealing satellite-section pattern — there is no unported leftover row here).
//             NEW-additifs (divergences #5/#6, decisions §4): `demolition_decommission_cost_fraction_of_
//             setup`, `demolition_replacement_option_expiry_game_days`, `compression_friction_penalty_
//             weight`, `compression_annealing_strain_weight`, `compression_post_reset_stress`,
//             `compression_stress_floor_with_critical_residue`.
//             ★ Ruling #1 note: `demolition_friction_budget_threshold_multiplier_of_org_size` KEEPS its
//             canon name (never a rename of a canon key) even though its multiplicande is now
//             `friction_org_size` (the ★#1 all-owned périmètre), not the canon-active `org_size` used
//             elsewhere (divergence #15) — noted inline on the getter + gdd/14 row.
//             2 of the 5 canon compression stress-source weights (`understudy_unsync_weight`/
//             `constraint_knot_unresolved_weight`) stay INERT dormant v1 (ch06/ch07 not built,
//             divergence #10) — registered per R2.3 (a canon tunables-table row always gets a getter,
//             consumed-or-not), NEVER renormalized.

import { TunablesStore } from '../config/tunables-store';
import { pressureCapCache } from './pressure-cap-cache';

/** Min/max clamp range per key (mirrors `LIVE_OPS_TUNABLE_CAPS`'s shape). */
export interface CoreLoopsTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `CORE_LOOPS_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the ch05 tech
 * docs' Range column where one exists numerically. Used internally by every numeric getter below
 * (defense-in-depth: the getter itself never returns an out-of-bounds value even if a raw DB override
 * was written out of range). Boolean keys (`oneDecisionClassificationStrictMode`,
 * `oneDecisionEnforceWithoutSession`) have no CAPS entry (mirrors `LIVE_OPS_TUNABLE_CAPS`'s own
 * exclusion of its 1 composite-string key).
 */
export const CORE_LOOPS_TUNABLE_CAPS: Record<string, CoreLoopsTunableRange> = {
  // ── Exception-Queue spine (canonicalized gdd/14 §"Core loops — Exception Queue") ──────────────────
  'core_loops.exception_max_rules_per_lieutenant':                      { min: 4,    max: 30   },
  // Range NOT numerically given by canon (gdd/14 legacy Range column literally read "composite" —
  // paired with the soft-warning-at-15 semantics, not a numeric bound). Coder-realized bound
  // `[PROV-Y26Q2]` — wide enough to keep 20 (default) and 15 (warn constant) both comfortably interior.
  'core_loops.exception_queue_cap_per_lieutenant':                      { min: 5,    max: 50   },
  'core_loops.exception_priority_decay_period_hours':                   { min: 1,    max: 168  },
  'core_loops.exception_suggested_action_confidence_threshold':         { min: 0.3,  max: 0.95 },
  'core_loops.exception_backlog_badge_threshold':                       { min: 4,    max: 30   },
  'core_loops.exception_aged_out_horizon_hours':                        { min: 24,   max: 336  },
  'core_loops.exception_priority_age_max_factor':                       { min: 1.2,  max: 4.0  },
  // ── Loop 10 / One Decision Per Session (canonicalized gdd/14 §"Core loops — One Decision…") ────────
  'core_loops.one_decision_structural_per_session_cap':                 { min: 1,    max: 2    },
  'core_loops.one_decision_queue_depth_visible':                        { min: 1,    max: 5    },
  'core_loops.one_decision_skip_carry_forward_priority_decay_pct':      { min: 0,    max: 20   },
  'core_loops.one_decision_compute_at_session_start_latency_ms_budget': { min: 100,  max: 500  },
  'core_loops.hl_escalation_backlog_min':                               { min: 1,    max: 10   },
  'core_loops.one_decision_consider_window_seconds':                    { min: 0,    max: 300  },
  // ── HL card provider normalization (C6 — canon gives NO numbers for these 2; [PROV-Y26Q2],
  //    honest-gap additions mirroring the `one_decision_consider_window_seconds` precedent above) ──
  'core_loops.hl_damaged_building_urgency_horizon_days':                { min: 1,    max: 30   },
  'core_loops.hl_autonomy_report_urgency_horizon_hours':                { min: 6,    max: 336  },
  // ── Session lifecycle + F4 perf budget ──────────────────────────────────────────────────────────
  'core_loops.session_open_sequence_max_latency_ms':                    { min: 50,   max: 500  },
  'perf_budget.05_core_loops_max_kb_per_player':                        { min: 10,   max: 40   },
  'session.stale_timeout_real_minutes':                                 { min: 60,   max: 1440 },

  // ── P3-C C1 — Loop 3 Backpressure Trace (backpressure_trace.md:146-155 + D8) ────────────────────
  'core_loops.backpressure_pressure_per_tick_when_blocked':             { min: 0.02, max: 0.2  },
  'core_loops.backpressure_propagation_decay_per_hop':                  { min: 0.4,  max: 0.95 },
  'core_loops.backpressure_sensitivity_coefficient':                    { min: 0.2,  max: 1.0  },
  'core_loops.backpressure_minimum_pressure_floor':                     { min: 0.0,  max: 0.15 },
  'core_loops.backpressure_critical_threshold':                        { min: 0.6,  max: 0.95 },
  'core_loops.backpressure_warm_threshold':                             { min: 0.25, max: 0.60 },
  'core_loops.backpressure_mild_threshold':                             { min: 0.05, max: 0.25 },
  'core_loops.backpressure_max_propagation_hops':                       { min: 3,    max: 8    },
  // NEW, D8/divergence #8 (canon is silent on relief) — default mirrors pressure_per_tick (symmetric
  // rise/fall, "what climbs in ~11 ticks descends in ~11").
  'core_loops.backpressure_relief_per_tick':                            { min: 0.02, max: 0.2  },

  // ── P3-C C1 — Loop 4 Sinuosity Debt (sinuosity_debt.md:140-153, D11 cash-plate transpositions) ──
  'core_loops.sinuosity_collapse_threshold':                            { min: 1.8,  max: 3.5  },
  'core_loops.sinuosity_per_reroute_increment':                         { min: 0.05, max: 0.4  },
  'core_loops.sinuosity_stress_warning_threshold':                      { min: 1.5,  max: 2.8  },
  'core_loops.sinuosity_rebuild_throughput_penalty_duration_ticks':     { min: 4,    max: 30   },
  // 3 cash-plate transpositions of canon's composite cost rows (D11, `[PROV-Y26Q2]` — no route-setup
  // cost substrate exists live, divergence #4). Cents, ordered cheap < mid < expensive per canon §Rebuild.
  'core_loops.sinuosity_minimal_reroute_cost_cents':                    { min: 2000,   max: 50000  },
  'core_loops.sinuosity_moderate_restructure_cost_cents':               { min: 10000,  max: 150000 },
  'core_loops.sinuosity_full_geometric_reset_cost_cents':               { min: 30000,  max: 300000 },
  'core_loops.sinuosity_moderate_restructure_reduction_pct':            { min: 30,   max: 70   },
  'core_loops.sinuosity_full_geometric_reset_baseline_target':          { min: 1.0,  max: 1.5  },
  'core_loops.sinuosity_pristine_bucket_upper_bound':                   { min: 1.3,  max: 1.8  },
  'core_loops.sinuosity_stressed_bucket_upper_bound':                   { min: 2.0,  max: 2.8  },
  'core_loops.sinuosity_critical_bucket_upper_bound':                   { min: 2.5,  max: 3.5  },

  // ── P3-C C1 — Loop 5 Mycelial Ledger (mycelial_ledger.md:141-153 + §5/§8.2 NEW) ──────────────────
  'core_loops.mycelial_debt_accrual_multiplier':                        { min: 0.5,  max: 3.0  },
  'core_loops.mycelial_stress_threshold':                               { min: 0.6,  max: 0.95 },
  'core_loops.mycelial_throughput_penalty_at_stress_pct':               { min: 10,   max: 60   },
  'core_loops.mycelial_natural_decay_per_minute':                       { min: 0.005, max: 0.1 },
  'core_loops.mycelial_quick_patch_residual_debt':                      { min: 0.05, max: 0.4  },
  'core_loops.mycelial_quick_patch_duration_ticks':                     { min: 1,    max: 4    },
  'core_loops.mycelial_structural_reinforce_duration_ticks':            { min: 3,    max: 10   },
  'core_loops.mycelial_sinuosity_debt_acceleration_coefficient':        { min: 0.1,  max: 0.8  },
  'core_loops.mycelial_debt_accrual_exponent':                          { min: 1.0,  max: 2.5  },
  'core_loops.mycelial_cooling_period_ticks_for_decay_start':           { min: 4,    max: 24   },
  // Cash-plate transposition of canon's 1 composite row (`reroute_bypass_setup_cost_multiplier`, D11).
  'core_loops.mycelial_bypass_setup_cost_cents':                        { min: 1000, max: 20000  },
  // NEW — divergence #9 (canon silent on the throughput unit; D5 accrual assiette).
  'core_loops.mycelial_throughput_normalization_grams':                 { min: 100,  max: 2000 },
  // NEW — §8.2 (backpressure→mycelial coupling, amortized to critical-bucket destinations only).
  'core_loops.mycelial_backpressure_feed_coefficient':                  { min: 0.1,  max: 0.6  },
  // NEW — the LEAST() ceiling I2's app-layer half clamps against (no DB CHECK upper bound, mig 0125 —
  // same deliberate asymmetry as `lieutenant_flag_state.credibility_tokens`, mig 0123).
  'core_loops.mycelial_debt_cap':                                       { min: 1.0,  max: 5.0  },
  // NEW, sub-décision #10 RATIFIED (state-not-timer bypass exit) — `[PROV-Y26Q2]`, no canon/design
  // number given; a principled default below stress_threshold (0.85) with headroom above
  // quick_patch_residual_debt (0.2), flagged for reviewer/C4 reconciliation.
  'core_loops.mycelial_bypass_resume_threshold':                        { min: 0.1,  max: 0.6  },
  // 2 NEW maintenance cash-plate costs (D11 — canon gives only qualitative "low"/"mid" text, no
  // numbers, for these 2 modes; the 3rd mode's cost — REROUTE_BYPASS setup — IS one of the 11 canon
  // rows above, `mycelial_bypass_setup_cost_cents`).
  'core_loops.mycelial_quick_patch_cost_cents':                         { min: 1000,  max: 20000  },
  'core_loops.mycelial_structural_reinforce_cost_cents':                { min: 10000, max: 100000 },

  // ── P3-D C1 — Loop 6 Cue Stack Integrity (cue_stack_integrity.md:162-171 + NEW impl) ────────────
  // Renamed/repurposed from canon `cue_stack.depth_slots` (default 5, range 3..8) — the CHECK DB wins
  // (GDD-verbatim "4-8 slots", mig 0007 cs_slots_length_chk) — the canon "3" is an internal
  // inconsistency, not reproduced (design divergence #2). This key is the compose-time VALIDATION
  // CEILING (default = the DB ceiling itself, clampable down to the DB floor), not a "typical depth"
  // suggestion.
  'core_loops.cue_stack_depth_slots_max':                               { min: 4,    max: 8    },
  'core_loops.cue_stack_recovery_cost_multiplier':                      { min: 1.0,  max: 3.0  },
  // Renamed from canon `cue_stack.player_defined_named_sequences_max` (range 3..10 — the legacy gdd/14
  // row's own range, 0..10, was itself stale vs this real canon citation; corrected here).
  'core_loops.cue_stack_named_sequences_max':                           { min: 3,    max: 10   },
  // 4 NEW impl keys (design §5.3/§14 — no canon numeric magnitude; the durations by slot-type executor).
  'core_loops.cue_stack_slot_minutes_distribution_run':                 { min: 5,    max: 60   },
  'core_loops.cue_stack_slot_minutes_maintenance_batch':                { min: 5,    max: 60   },
  'core_loops.cue_stack_slot_minutes_recruitment_step':                 { min: 5,    max: 60   },
  'core_loops.cue_stack_slot_minutes_exception_batch':                  { min: 5,    max: 60   },
  // NEW impl key — the CUE_STACK_STALE_SWEEP (NIGHTLY/29 provisional, C3) crash-safe horizon.
  'core_loops.cue_stack_stale_executing_horizon_hours':                 { min: 12,   max: 96   },

  // ── P3-D C1 — Loop 7 Annealing Window (annealing_window.md:150-161 + GDD L283) ───────────────────
  // Canon-adjacent (GDD L283 prose "20-40 real minutes" → the documented midpoint 30) — NOT the tech-doc's
  // own §Tunables table (which carries no `base_settling_minutes` row at all).
  'core_loops.annealing_base_settling_minutes':                         { min: 10,   max: 120  },
  'core_loops.annealing_band_short_upper_minutes':                      { min: 5,    max: 30   },
  'core_loops.annealing_band_medium_upper_minutes':                     { min: 15,   max: 60   },
  'core_loops.annealing_band_long_upper_minutes':                      { min: 45,   max: 180  },
  'core_loops.annealing_compounding_multiplier':                        { min: 1.1,  max: 2.5  },
  // Renamed from canon `annealing.throughput_reduction_during_settling_pct` — a PERCENTAGE (10), unit-
  // corrected vs the legacy gdd/14 row's own FRACTION (0.10) — the same unit-correction precedent
  // `mycelial_throughput_penalty_at_stress_pct` (mig 0125) established.
  'core_loops.annealing_throughput_reduction_pct':                      { min: 5,    max: 25   },
  'core_loops.annealing_compounding_throughput_penalty':                { min: 0.02, max: 0.15 },
  'core_loops.annealing_touchable_minimum_count':                       { min: 1,    max: 6    },

  // ── P3-E C1 — Loop 8 Demolition Mandate (demolition_mandate.md §Tunables + D9/★#5 NEW-additifs) ────
  // Canon 05 GAGNE vs legacy gdd/14 range 1.0..2.0 (divergence #4) — the ruling ★#1 node-set widens the
  // SET the multiplier scales, not the multiplier's own range; `friction_org_size` (not canon org_size)
  // is the multiplicande, divergence #15 (comment kept on the getter below, not here).
  'core_loops.demolition_friction_budget_threshold_multiplier_of_org_size': { min: 1.1,  max: 2.0  },
  // No CAPS entry: `demolition_efficiency_penalty_curve` is a registry string ('linear'|'quadratic'),
  // resolved via `resolveString` (mirrors `lieutenant.signal_drift.cue_generation_strategy`'s own no-CAPS
  // string-key convention) — 'quadratic' is registry-only v1, never wired (TD #2, divergence #8).
  'core_loops.demolition_efficiency_penalty_multiplier_baseline':       { min: 0.7,  max: 0.95 },
  'core_loops.demolition_replacement_options_count':                    { min: 1,    max: 4    },
  'core_loops.demolition_age_decay_factor_per_tick':                    { min: 0.0005, max: 0.005 },
  'core_loops.demolition_per_connection_friction_modifier':             { min: 0.05, max: 0.25 },
  // [PROV-Y26Q2] — the composite `demolition_base_friction_per_node` (canon `composite:friction_
  // baseline`) realized v1 as a scalar (divergence #3, TD #1 — the per-class table is a v1 gap).
  'core_loops.demolition_base_friction_per_node':                       { min: 0.5,  max: 3.0  },
  // [PROV-Y26Q2] — the composite `demolition_friction_budget_bucket_thresholds` realized v1 as 3
  // physical threshold keys (design §4.3: "3 seuils 0.5 / 0.85 / 1.0 du ratio total/threshold" — the
  // exact canon-given defaults; ranges are coder-realized bands, no canon numeric range given).
  'core_loops.demolition_friction_bucket_light_upper_bound':            { min: 0.3,  max: 0.7  },
  'core_loops.demolition_friction_bucket_balanced_upper_bound':         { min: 0.6,  max: 0.95 },
  'core_loops.demolition_friction_bucket_strained_upper_bound':         { min: 0.85, max: 1.2  },
  // NEW-additif (D9, divergence #5 — canon renvoie aux cost tables 04a comme BASIS mais ne donne aucune
  // fraction numérique ; v1 = fraction uniforme, TD per-type). `[PROV-Y26Q2]`.
  'core_loops.demolition_decommission_cost_fraction_of_setup':          { min: 0.2,  max: 0.8  },
  // NEW-additif (★#5 ratifié — "expirables (7 j in-game)").
  'core_loops.demolition_replacement_option_expiry_game_days':          { min: 3,    max: 14   },

  // ── P3-E C1 — Loop 9 Compression Week (compression_week.md §Tunables + ★#3/★#6 NEW-additifs) ───────
  'core_loops.compression_stress_accumulation_rate_multiplier':         { min: 0.5,  max: 2.0  },
  'core_loops.compression_max_decision_budget':                         { min: 3,    max: 8    },
  'core_loops.compression_stress_threshold_trigger':                    { min: 70,   max: 95   },
  'core_loops.compression_deferral_penalty_stress':                     { min: 5,    max: 20   },
  'core_loops.compression_problem_downgrade_per_unaddressed_tiers':     { min: 1,    max: 2    },
  // [PROV-Y26Q2] — the composite `compression_severity_multiplier_at_100_stress` (canon `composite:
  // severity_high`) realized v1 as a tier-bump AMOUNT (design §9.2/§10.1: "Severity ≥ 100 : tier initial
  // +1 cran") — same [1..2] band as `compression_problem_downgrade_per_unaddressed_tiers` above (the
  // sibling "+N tiers" mechanic).
  'core_loops.compression_severity_multiplier_at_100_stress':           { min: 1,    max: 2    },
  'core_loops.compression_force_engagement_threshold':                  { min: 85,   max: 98   },
  // Canon "fixed" — the severity ceiling org_stress/severity itself clamps to (D17). CAPS min==max: the
  // clamp is a documented no-op, kept as a real getter (R2.3 registry-first — every canon tunables-table
  // row gets a getter, not silently dropped) rather than a hardcoded literal.
  'core_loops.compression_max_severity_threshold':                      { min: 100,  max: 100  },
  'core_loops.compression_per_session_stress_increment_max':            { min: 5,    max: 20   },
  'core_loops.compression_stress_decay_per_quiet_week':                 { min: 2,    max: 10   },
  // 5 canon stress-source weights (★#3 ratifié défaut — VERBATIM 0.30/0.20/0.20/0.15/0.15). 2 of the 5
  // (understudy/constraint-knot) stay INERT dormant (ch06/ch07 not built — divergence #10, poids
  // inertes tracés, NEVER renormalized) but are registered here per R2.3 (a canon tunables-table row
  // always gets a getter, consumed-or-not).
  'core_loops.compression_supply_chain_capacity_pressure_weight':       { min: 0.10, max: 0.50 },
  'core_loops.compression_understudy_unsync_weight':                    { min: 0.10, max: 0.40 },
  'core_loops.compression_lieutenant_flag_unresolved_weight':           { min: 0.10, max: 0.40 },
  'core_loops.compression_cue_stack_non_optimal_weight':                { min: 0.05, max: 0.30 },
  'core_loops.compression_constraint_knot_unresolved_weight':           { min: 0.05, max: 0.30 },
  // 2 NEW-additif stress-source weights (★#3 ratifié — friction-penalty-active + annealing-compounding-
  // strain "contribute stress", canon cross-refs give no numbers — divergence #6). Default 0.10 each,
  // same band as their canon weight-row siblings.
  'core_loops.compression_friction_penalty_weight':                     { min: 0.05, max: 0.30 },
  'core_loops.compression_annealing_strain_weight':                     { min: 0.05, max: 0.30 },
  // 2 NEW-additif downgrade-anti-fig-leaf values (★#6 ratifié — divergence #14, canon silent on the
  // after-cycle reset/floor).
  'core_loops.compression_post_reset_stress':                           { min: 10,   max: 30   },
  'core_loops.compression_stress_floor_with_critical_residue':          { min: 30,   max: 60   },
  // NEW-additif (P3-E C6 — design §8.2 gives the RAW count each of these 2 sources scans (`flagged_items`
  // pending / cue-stack failed slots + CUE_CASCADE pending cards) but no numeric normalization "cap" —
  // "formule figée au plan C6 sur pièces" (the design's own literal instruction that THIS chunk fixes the
  // concrete formula from the concrete columns C0 resolved, R2/R4). `[PROV-Y26Q2]`: count/cap clamped to
  // [0,1] — a count at/above this cap saturates that source's own `signal_source` to 1.0.
  'core_loops.compression_count_based_stress_signal_cap':               { min: 2,    max: 10   },
  // NEW-additif (P3-E C7 — D15: "Board abandonné → auto-finalize (housekeeping N/31) après N jours
  // in-game (tunable interne, défaut 14)" — the design NAMES the default but never registers a key;
  // registered here per R2.3 (every numeric magnitude a getter, never inlined), consumed by the N/31
  // `FRICTION_BUDGET_TICK`'s own abandon-sweep (`friction-budget-tick.service.ts`).
  'core_loops.compression_board_abandon_horizon_game_days':             { min: 7,    max: 30   },

  // ── P3-E C8 — Murs R2.2/P5 (design §15/§16, "chunk-mur dédié C8") — the NEW bucket cutpoints the
  // player-facing projections need, on top of the C1-registered ones REUSED verbatim (§15's own "mounting
  // < 85" IS `compression_stress_threshold_trigger`'s own default — zero 2nd tunable for that boundary,
  // R2.3). ────────────────────────────────────────────────────────────────────────────────────────────
  // `StressBucket` calm/mounting split (design §15 literal: "calm < 50"). NEW-additif — no existing
  // getter carries this number (the trigger/force thresholds are semantically DIFFERENT points, §9.1).
  'core_loops.compression_stress_bucket_calm_upper_bound':              { min: 30,   max: 70   },
  // `DecommissionCostBucket` 3 cutpoints (cents) — coder-realized (decommission-cost.ts's own header:
  // calibrated against this codebase's REAL `conversion-tunables.ts` cost scale, `[PROV-Y26Q2]`).
  'core_loops.demolition_decommission_cost_bucket_cheap_upper_bound_cents':      { min: 200000,  max: 1000000 },
  'core_loops.demolition_decommission_cost_bucket_moderate_upper_bound_cents':   { min: 800000,  max: 3000000 },
  'core_loops.demolition_decommission_cost_bucket_expensive_upper_bound_cents':  { min: 2000000, max: 8000000 },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors
 * `clampLiveOpsTunableToRange`). Returns the value unchanged if no range is registered for the key
 * (boolean keys).
 */
export function clampCoreLoopsTunableToRange(key: string, value: number): number {
  const range = CORE_LOOPS_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for the P3-A ch05 `core_loops.*`/`session.*`/`perf_budget.05_*` catalogue. */
export const coreLoopsTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Exception-Queue spine completion (D4/D5, canon exception_queue_spine.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** exception_max_rules_per_lieutenant — script-complexity warning threshold (warn-only, never blocks ADD_RULE). Default 12, 4..30. */
  get exceptionMaxRulesPerLieutenant(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_max_rules_per_lieutenant',
      TunablesStore.resolveInt('core_loops.exception_max_rules_per_lieutenant', 'CORE_LOOPS_EXCEPTION_MAX_RULES_PER_LIEUTENANT', 12));
  },

  /** exception_queue_cap_per_lieutenant — insert-refuse cap (D5), soft warning at 15 (band, not a 2nd key). Default 20, 5..50 [PROV-Y26Q2 range — canon gives no numeric bound]. */
  get exceptionQueueCapPerLieutenant(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_queue_cap_per_lieutenant',
      TunablesStore.resolveInt('core_loops.exception_queue_cap_per_lieutenant', 'CORE_LOOPS_EXCEPTION_QUEUE_CAP_PER_LIEUTENANT', 20));
  },

  /**
   * exception_queue_warn_threshold_per_lieutenant — the C3 `queue_pressure_band` warning boundary.
   * ★ NOT a store key (gdd/14:217/:1697 + gdd/05_player_core_loops.md:62 are explicit: "Soft warning
   * badge à 15 ... NOT a second tunable" / "Exception queue cap (per lieutenant) | 20 | soft warning at
   * 15") — canon pairs cap=20/warn=15 as ONE ratio (15/20 = 0.75), so the boundary is DERIVED from the
   * cap getter above rather than a second registered key. This is what makes the boundary
   * value-sensitive (R2.3): flipping `core_loops.exception_queue_cap_per_lieutenant` via a DB override
   * moves BOTH the cap AND the warn boundary together, exactly as the single canon relationship
   * prescribes — a second independent tunable could drift out of the 20/15 pairing across an override.
   */
  get exceptionQueueWarnThresholdPerLieutenant(): number {
    return Math.round(coreLoopsTunables.exceptionQueueCapPerLieutenant * 0.75);
  },

  /** exception_priority_decay_period_hours — linear decay horizon for the re-priority formula (D4). Default 24, 1..168. */
  get exceptionPriorityDecayPeriodHours(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_priority_decay_period_hours',
      TunablesStore.resolveInt('core_loops.exception_priority_decay_period_hours', 'CORE_LOOPS_EXCEPTION_PRIORITY_DECAY_PERIOD_HOURS', 24));
  },

  /** exception_suggested_action_confidence_threshold — below this, `suggested_disposition='ESCALATE'`. Default 0.6, 0.3..0.95. */
  get exceptionSuggestedActionConfidenceThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_suggested_action_confidence_threshold',
      TunablesStore.resolveFloat('core_loops.exception_suggested_action_confidence_threshold', 'CORE_LOOPS_EXCEPTION_SUGGESTED_ACTION_CONFIDENCE_THRESHOLD', 0.6));
  },

  /** exception_backlog_badge_threshold — pending-count threshold for the soft `backlog_badge`. Default 10, 4..30 [PROV-Y26Q2 — canon composite:count_medium concretized]. */
  get exceptionBacklogBadgeThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_backlog_badge_threshold',
      TunablesStore.resolveInt('core_loops.exception_backlog_badge_threshold', 'CORE_LOOPS_EXCEPTION_BACKLOG_BADGE_THRESHOLD', 10));
  },

  /** exception_aged_out_horizon_hours — PENDING cards older than this transition to `aged_out` (D4). Default 48, 24..336 [PROV-Y26Q2 — canon gives no number]. */
  get exceptionAgedOutHorizonHours(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_aged_out_horizon_hours',
      TunablesStore.resolveInt('core_loops.exception_aged_out_horizon_hours', 'CORE_LOOPS_EXCEPTION_AGED_OUT_HORIZON_HOURS', 48));
  },

  /** exception_priority_age_max_factor — the linear-decay ceiling multiplier the re-priority formula reaches at the decay horizon. Default 2.0, 1.2..4.0 [PROV-Y26Q2]. */
  get exceptionPriorityAgeMaxFactor(): number {
    return clampCoreLoopsTunableToRange('core_loops.exception_priority_age_max_factor',
      TunablesStore.resolveFloat('core_loops.exception_priority_age_max_factor', 'CORE_LOOPS_EXCEPTION_PRIORITY_AGE_MAX_FACTOR', 2.0));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Loop 10 — One Decision Per Session (D7/D8/D9/D11, canon one_decision_per_session.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * one_decision_structural_per_session_cap — the RAW registry cap (1, 1..2 — canon "unlockable to 2").
   * `StructuralDecisionGovernorService.commit` (C5) NEVER reads this getter directly — it calls
   * `structuralCapForPlayer(playerId)` below (the D8 seam), which currently just forwards to this
   * value but is the ONE place P3-H will later modulate by pressure tier.
   */
  get oneDecisionStructuralPerSessionCap(): number {
    return clampCoreLoopsTunableToRange('core_loops.one_decision_structural_per_session_cap',
      TunablesStore.resolveInt('core_loops.one_decision_structural_per_session_cap', 'CORE_LOOPS_ONE_DECISION_STRUCTURAL_PER_SESSION_CAP', 1));
  },

  /** one_decision_queue_depth_visible — top-N exception cards visible at session open (canon top-3). Default 3, 1..5. */
  get oneDecisionQueueDepthVisible(): number {
    return clampCoreLoopsTunableToRange('core_loops.one_decision_queue_depth_visible',
      TunablesStore.resolveInt('core_loops.one_decision_queue_depth_visible', 'CORE_LOOPS_ONE_DECISION_QUEUE_DEPTH_VISIBLE', 3));
  },

  /** one_decision_skip_carry_forward_priority_decay_pct — decay applied to a skipped HL card's priority when it carries (0 = canon-exact "SAME priority"). Default 0, 0..20. */
  get oneDecisionSkipCarryForwardPriorityDecayPct(): number {
    return clampCoreLoopsTunableToRange('core_loops.one_decision_skip_carry_forward_priority_decay_pct',
      TunablesStore.resolveInt('core_loops.one_decision_skip_carry_forward_priority_decay_pct', 'CORE_LOOPS_ONE_DECISION_SKIP_CARRY_FORWARD_PRIORITY_DECAY_PCT', 0));
  },

  /** one_decision_classification_strict_mode — boot-time validator rejects ambiguous decision-type tags (D7). Default true. Boolean — no CAPS entry. */
  get oneDecisionClassificationStrictMode(): boolean {
    return TunablesStore.resolveBool('core_loops.one_decision_classification_strict_mode', 'CORE_LOOPS_ONE_DECISION_CLASSIFICATION_STRICT_MODE', true);
  },

  /** one_decision_compute_at_session_start_latency_ms_budget — F4 test-time perf budget (NOT a runtime gate). Default 200, 100..500. */
  get oneDecisionComputeAtSessionStartLatencyMsBudget(): number {
    return clampCoreLoopsTunableToRange('core_loops.one_decision_compute_at_session_start_latency_ms_budget',
      TunablesStore.resolveInt('core_loops.one_decision_compute_at_session_start_latency_ms_budget', 'CORE_LOOPS_ONE_DECISION_COMPUTE_AT_SESSION_START_LATENCY_MS_BUDGET', 200));
  },

  /** core_loops.one_decision.enforce_without_session — D9: false = session-scoped enforcement (sessionless commits pass-through + audited); flips to global-strict later. Default false. Boolean — no CAPS entry. */
  get oneDecisionEnforceWithoutSession(): boolean {
    return TunablesStore.resolveBool('core_loops.one_decision.enforce_without_session', 'CORE_LOOPS_ONE_DECISION_ENFORCE_WITHOUT_SESSION', false);
  },

  /** hl_escalation_backlog_min — the ESCALATION_BACKLOG_REVIEW HL provider's minimum pending-escalated-card trigger count (sub-décision #4). Default 3, 1..10 [PROV-Y26Q2]. */
  get hlEscalationBacklogMin(): number {
    return clampCoreLoopsTunableToRange('core_loops.hl_escalation_backlog_min',
      TunablesStore.resolveInt('core_loops.hl_escalation_backlog_min', 'CORE_LOOPS_HL_ESCALATION_BACKLOG_MIN', 3));
  },

  /**
   * one_decision_consider_window_seconds — time spent in the Consider view (analytics only — no
   * penalty). ★ Canon-real key (`one_decision_per_session.md:123`) not enumerated by any of the 3 P3-A
   * authoring docs — registered here for R2.3 completeness (see file header). No consumer this lot
   * (analytics-only; forward TD ch20 telemetry). Default 0, 0..300.
   */
  get oneDecisionConsiderWindowSeconds(): number {
    return clampCoreLoopsTunableToRange('core_loops.one_decision_consider_window_seconds',
      TunablesStore.resolveInt('core_loops.one_decision_consider_window_seconds', 'CORE_LOOPS_ONE_DECISION_CONSIDER_WINDOW_SECONDS', 0));
  },

  /**
   * hl_damaged_building_urgency_horizon_days — C6 `DAMAGED_BUILDING_REPAIR` HL provider: the
   * days-damaged normalization ceiling (`urgency = clamp(daysDamaged / horizon, 0, 1)`). Canon gives
   * "urgency ∝ days damaged" with NO number (design §8) — `[PROV-Y26Q2]`, mirrors the
   * `exception_aged_out_horizon_hours` honesty precedent (a canon-gestured-but-unnumbered horizon).
   * Default 7, 1..30.
   */
  get hlDamagedBuildingUrgencyHorizonDays(): number {
    return clampCoreLoopsTunableToRange('core_loops.hl_damaged_building_urgency_horizon_days',
      TunablesStore.resolveInt('core_loops.hl_damaged_building_urgency_horizon_days', 'CORE_LOOPS_HL_DAMAGED_BUILDING_URGENCY_HORIZON_DAYS', 7));
  },

  /**
   * hl_autonomy_report_urgency_horizon_hours — C6 `AUTONOMY_REPORTS_PENDING` HL provider: the
   * oldest-unresolved-report-age normalization ceiling (`urgency = clamp(ageHours / horizon, 0, 1)`).
   * Canon gives "urgency ∝ oldest report age" with NO number (design §8) — `[PROV-Y26Q2]`. Default 48
   * (matches the exception aged-out horizon's own default for cross-provider consistency), 6..336.
   */
  get hlAutonomyReportUrgencyHorizonHours(): number {
    return clampCoreLoopsTunableToRange('core_loops.hl_autonomy_report_urgency_horizon_hours',
      TunablesStore.resolveInt('core_loops.hl_autonomy_report_urgency_horizon_hours', 'CORE_LOOPS_HL_AUTONOMY_REPORT_URGENCY_HORIZON_HOURS', 48));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Session lifecycle (D1) + F4 perf budget (loops_interlock_and_antipatterns.md §Tunables)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** session_open_sequence_max_latency_ms — F4 test-time budget for the session-open payload aggregation (C7). Default 200, 50..500. */
  get sessionOpenSequenceMaxLatencyMs(): number {
    return clampCoreLoopsTunableToRange('core_loops.session_open_sequence_max_latency_ms',
      TunablesStore.resolveInt('core_loops.session_open_sequence_max_latency_ms', 'CORE_LOOPS_SESSION_OPEN_SEQUENCE_MAX_LATENCY_MS', 200));
  },

  /** perf_budget.05_core_loops_max_kb_per_player — F4 alert threshold (16 KB current + headroom). Default 20, 10..40. Deferred consumer: `CoreLoopsMemoryProfiler` (P3-E closeout). */
  get perfBudget05CoreLoopsMaxKbPerPlayer(): number {
    return clampCoreLoopsTunableToRange('perf_budget.05_core_loops_max_kb_per_player',
      TunablesStore.resolveInt('perf_budget.05_core_loops_max_kb_per_player', 'CORE_LOOPS_PERF_BUDGET_05_MAX_KB_PER_PLAYER', 20));
  },

  /** session.stale_timeout_real_minutes — `SESSION_SWEEP` (HOURLY/5 provisional, C2) closes sessions inactive past this bound (v1 `started_at`-based, honest — activity-column refinement = TD). Default 240, 60..1440 [PROV-Y26Q2]. */
  get sessionStaleTimeoutRealMinutes(): number {
    return clampCoreLoopsTunableToRange('session.stale_timeout_real_minutes',
      TunablesStore.resolveInt('session.stale_timeout_real_minutes', 'CORE_LOOPS_SESSION_STALE_TIMEOUT_REAL_MINUTES', 240));
  },

  /**
   * The D8 governor cap-by-getter seam: `structuralCapForPlayer(playerId)`.
   *
   * ★H-1 Option B — RATIFIED 2026-07-24 (P3-H C5, design D7/§8.2, DD-H2 "modulated in place, never
   * forked"): reads `playerId`'s T4 pressure-observation window via `pressureCapCache` (a synchronous,
   * write-through, per-player in-memory snapshot — `pressure-cap-cache.ts`'s own header carries the full
   * "why not async" account: all 3 call sites below are plain, UNAWAITED, synchronous calls —
   * `structural-decision-governor.service.ts:97`, `session-open-sequence.service.ts:217`, `core-loops-
   * test.controller.ts:322` — C0-reanchor R5 DEFINITIVE confirmed this getter can NEVER become `async`
   * without breaking all three). Returns `0` while an observation window is open (the felt T4 gate,
   * design §8.3's "the ONLY value below 1 is 0"); otherwise UNCHANGED — forwards to `oneDecisionStructural
   * PerSessionCap` exactly as before P3-H. Every existing (T1, no observation) caller therefore reads the
   * BYTE-IDENTICAL value pre-P3-H (the zero-regression proof, C5 floor) — a fresh/never-graduated player
   * is a cache MISS, which reads as "no open window" (fails OPEN, see `pressure-cap-cache.ts`'s own
   * header). The 3 call sites, the governor's atomic claim SQL, and the P3-A tunable key/range (1..2) are
   * ALL untouched — "one counter, one seam, one getter" (design §6/decisions D8) still holds; ONLY this
   * function's OWN body changed.
   */
  structuralCapForPlayer(playerId: string): number {
    if (pressureCapCache.hasOpenObservationWindow(playerId)) return 0;
    return coreLoopsTunables.oneDecisionStructuralPerSessionCap;
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-C C1 — Loop 3 Backpressure Trace (backpressure_trace.md §Tunables, D7/D8)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** backpressure_pressure_per_tick_when_blocked — per-tick accrual at a blocked-output source node (§6.2). Default 0.08, 0.02..0.2. */
  get backpressurePressurePerTickWhenBlocked(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_pressure_per_tick_when_blocked',
      TunablesStore.resolveFloat('core_loops.backpressure_pressure_per_tick_when_blocked', 'CORE_LOOPS_BACKPRESSURE_PRESSURE_PER_TICK_WHEN_BLOCKED', 0.08));
  },

  /** backpressure_propagation_decay_per_hop — BFS upstream attenuation per hop (§6.2/§4.3). Default 0.7, 0.4..0.95. */
  get backpressurePropagationDecayPerHop(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_propagation_decay_per_hop',
      TunablesStore.resolveFloat('core_loops.backpressure_propagation_decay_per_hop', 'CORE_LOOPS_BACKPRESSURE_PROPAGATION_DECAY_PER_HOP', 0.7));
  },

  /** backpressure_sensitivity_coefficient — canon-registered, no C1 consumer yet (forward TD). Default 0.6, 0.2..1.0. */
  get backpressureSensitivityCoefficient(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_sensitivity_coefficient',
      TunablesStore.resolveFloat('core_loops.backpressure_sensitivity_coefficient', 'CORE_LOOPS_BACKPRESSURE_SENSITIVITY_COEFFICIENT', 0.6));
  },

  /** backpressure_minimum_pressure_floor — floor applied to any non-zero propagated pressure (§6.2). Default 0.05, 0.0..0.15. */
  get backpressureMinimumPressureFloor(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_minimum_pressure_floor',
      TunablesStore.resolveFloat('core_loops.backpressure_minimum_pressure_floor', 'CORE_LOOPS_BACKPRESSURE_MINIMUM_PRESSURE_FLOOR', 0.05));
  },

  /** backpressure_critical_threshold — entry into the `critical` bucket (§6.2, Exception producer trigger). Default 0.85, 0.6..0.95. */
  get backpressureCriticalThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_critical_threshold',
      TunablesStore.resolveFloat('core_loops.backpressure_critical_threshold', 'CORE_LOOPS_BACKPRESSURE_CRITICAL_THRESHOLD', 0.85));
  },

  /** backpressure_warm_threshold — entry into the `warm` bucket (§6.2). Default 0.40, 0.25..0.60. */
  get backpressureWarmThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_warm_threshold',
      TunablesStore.resolveFloat('core_loops.backpressure_warm_threshold', 'CORE_LOOPS_BACKPRESSURE_WARM_THRESHOLD', 0.40));
  },

  /** backpressure_mild_threshold — entry into the `mild` bucket (§6.2). Default 0.10, 0.05..0.25. */
  get backpressureMildThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_mild_threshold',
      TunablesStore.resolveFloat('core_loops.backpressure_mild_threshold', 'CORE_LOOPS_BACKPRESSURE_MILD_THRESHOLD', 0.10));
  },

  /** backpressure_max_propagation_hops — BFS upstream cascade limit (§4.3/§6.2). Default 5, 3..8. */
  get backpressureMaxPropagationHops(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_max_propagation_hops',
      TunablesStore.resolveInt('core_loops.backpressure_max_propagation_hops', 'CORE_LOOPS_BACKPRESSURE_MAX_PROPAGATION_HOPS', 5));
  },

  /** backpressure_relief_per_tick — NEW (D8, divergence #8 — canon silent on redescent): per-tick relief for nodes not reached this tick (§6.2 step 3). Default 0.08 (= pressure_per_tick, symmetric rise/fall), 0.02..0.2. */
  get backpressureReliefPerTick(): number {
    return clampCoreLoopsTunableToRange('core_loops.backpressure_relief_per_tick',
      TunablesStore.resolveFloat('core_loops.backpressure_relief_per_tick', 'CORE_LOOPS_BACKPRESSURE_RELIEF_PER_TICK', 0.08));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-C C1 — Loop 4 Sinuosity Debt (sinuosity_debt.md §Tunables, D9/D11)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** sinuosity_collapse_threshold — SI >= this severs the route atomically (§7.3, I6). Default 2.4, 1.8..3.5. */
  get sinuosityCollapseThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_collapse_threshold',
      TunablesStore.resolveFloat('core_loops.sinuosity_collapse_threshold', 'CORE_LOOPS_SINUOSITY_COLLAPSE_THRESHOLD', 2.4));
  },

  /** sinuosity_per_reroute_increment — the K2 calibration expectation for a local patch detour (test tolerance, §7.2 — SI moves by GEOMETRY, not this arithmetic write). Default 0.15, 0.05..0.4. */
  get sinuosityPerRerouteIncrement(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_per_reroute_increment',
      TunablesStore.resolveFloat('core_loops.sinuosity_per_reroute_increment', 'CORE_LOOPS_SINUOSITY_PER_REROUTE_INCREMENT', 0.15));
  },

  /** sinuosity_stress_warning_threshold — the ROUTE_PATCH_SWEEP trigger repurposing target `distribution.routeSaturatedWarnThreshold` calibrates against (§7.2/§7.6) — also the `SinuosityStressBucket.stressed` lower bound. Default 2.0, 1.5..2.8. */
  get sinuosityStressWarningThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_stress_warning_threshold',
      TunablesStore.resolveFloat('core_loops.sinuosity_stress_warning_threshold', 'CORE_LOOPS_SINUOSITY_STRESS_WARNING_THRESHOLD', 2.0));
  },

  /** sinuosity_rebuild_throughput_penalty_duration_ticks — downtime (game-minutes) after any rebuild before dispatch resumes on that route (§7.4, I7). Default 12, 4..30. */
  get sinuosityRebuildThroughputPenaltyDurationTicks(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_rebuild_throughput_penalty_duration_ticks',
      TunablesStore.resolveInt('core_loops.sinuosity_rebuild_throughput_penalty_duration_ticks', 'CORE_LOOPS_SINUOSITY_REBUILD_THROUGHPUT_PENALTY_DURATION_TICKS', 12));
  },

  /** sinuosity_minimal_reroute_cost_cents — MINIMAL_REROUTE cash cost (§7.4, D11 cash-plate transposition of canon's composite `minimal_reroute_cost_multiplier_of_route_setup` — no route-setup cost substrate exists live, divergence #4). Default 10000 ($100) `[PROV-Y26Q2]`, 2000..50000. */
  get sinuosityMinimalRerouteCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_minimal_reroute_cost_cents',
      TunablesStore.resolveInt('core_loops.sinuosity_minimal_reroute_cost_cents', 'CORE_LOOPS_SINUOSITY_MINIMAL_REROUTE_COST_CENTS', 10000));
  },

  /** sinuosity_moderate_restructure_cost_cents — MODERATE_RESTRUCTURE cash cost (§7.4, D11 cash-plate transposition). Default 40000 ($400) `[PROV-Y26Q2]`, 10000..150000. */
  get sinuosityModerateRestructureCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_moderate_restructure_cost_cents',
      TunablesStore.resolveInt('core_loops.sinuosity_moderate_restructure_cost_cents', 'CORE_LOOPS_SINUOSITY_MODERATE_RESTRUCTURE_COST_CENTS', 40000));
  },

  /** sinuosity_full_geometric_reset_cost_cents — FULL_GEOMETRIC_RESET cash cost (§7.4, D11 cash-plate transposition — the STRUCTURAL mode, `governor.commit(SINUOSITY_FULL_RESET)`). Default 100000 ($1000) `[PROV-Y26Q2]`, 30000..300000. */
  get sinuosityFullGeometricResetCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_full_geometric_reset_cost_cents',
      TunablesStore.resolveInt('core_loops.sinuosity_full_geometric_reset_cost_cents', 'CORE_LOOPS_SINUOSITY_FULL_GEOMETRIC_RESET_COST_CENTS', 100000));
  },

  /** sinuosity_moderate_restructure_reduction_pct — MODERATE_RESTRUCTURE's expected SI reduction (§7.4 — calibration tolerance, divergence #3). Default 50, 30..70. */
  get sinuosityModerateRestructureReductionPct(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_moderate_restructure_reduction_pct',
      TunablesStore.resolveInt('core_loops.sinuosity_moderate_restructure_reduction_pct', 'CORE_LOOPS_SINUOSITY_MODERATE_RESTRUCTURE_REDUCTION_PCT', 50));
  },

  /** sinuosity_full_geometric_reset_baseline_target — FULL_GEOMETRIC_RESET's expected post-reset SI (§7.4 — geometry-pure re-path, ≈minimum; calibration tolerance). Default 1.2, 1.0..1.5. */
  get sinuosityFullGeometricResetBaselineTarget(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_full_geometric_reset_baseline_target',
      TunablesStore.resolveFloat('core_loops.sinuosity_full_geometric_reset_baseline_target', 'CORE_LOOPS_SINUOSITY_FULL_GEOMETRIC_RESET_BASELINE_TARGET', 1.2));
  },

  /** sinuosity_pristine_bucket_upper_bound — `SinuosityStressBucket.pristine` upper bound (§7.6 — the canon 1.5-2.0 gap absorbed into pristine, divergence #2). Default 1.5, 1.3..1.8. */
  get sinuosityPristineBucketUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_pristine_bucket_upper_bound',
      TunablesStore.resolveFloat('core_loops.sinuosity_pristine_bucket_upper_bound', 'CORE_LOOPS_SINUOSITY_PRISTINE_BUCKET_UPPER_BOUND', 1.5));
  },

  /** sinuosity_stressed_bucket_upper_bound — `SinuosityStressBucket.stressed` upper bound (§7.6 — = collapse_threshold by canon construction). Default 2.4, 2.0..2.8. */
  get sinuosityStressedBucketUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_stressed_bucket_upper_bound',
      TunablesStore.resolveFloat('core_loops.sinuosity_stressed_bucket_upper_bound', 'CORE_LOOPS_SINUOSITY_STRESSED_BUCKET_UPPER_BOUND', 2.4));
  },

  /** sinuosity_critical_bucket_upper_bound — `SinuosityStressBucket.critical` upper bound (§7.6, transitory — a route past this is severed by construction). Default 3.0, 2.5..3.5. */
  get sinuosityCriticalBucketUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.sinuosity_critical_bucket_upper_bound',
      TunablesStore.resolveFloat('core_loops.sinuosity_critical_bucket_upper_bound', 'CORE_LOOPS_SINUOSITY_CRITICAL_BUCKET_UPPER_BOUND', 3.0));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-C C1 — Loop 5 Mycelial Ledger (mycelial_ledger.md §Tunables, D5/D6/D11)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** mycelial_debt_accrual_multiplier — the D5 accrual formula's base multiplier applied to normalized throughput before the exponent (§5.1). Default 1.0, 0.5..3.0. */
  get mycelialDebtAccrualMultiplier(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_debt_accrual_multiplier',
      TunablesStore.resolveFloat('core_loops.mycelial_debt_accrual_multiplier', 'CORE_LOOPS_MYCELIAL_DEBT_ACCRUAL_MULTIPLIER', 1.0));
  },

  /** mycelial_stress_threshold — debt_load above this = `stressed` (§5.3, derived-never-stored, D4). Default 0.85, 0.6..0.95. */
  get mycelialStressThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_stress_threshold',
      TunablesStore.resolveFloat('core_loops.mycelial_stress_threshold', 'CORE_LOOPS_MYCELIAL_STRESS_THRESHOLD', 0.85));
  },

  /** mycelial_throughput_penalty_at_stress_pct — the T5 transit-slowdown transposition of canon's "-30% capacity" (§5.3: `transit_ticks = ceil(base / (1 - pct/100))`). Default 30, 10..60. */
  get mycelialThroughputPenaltyAtStressPct(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_throughput_penalty_at_stress_pct',
      TunablesStore.resolveInt('core_loops.mycelial_throughput_penalty_at_stress_pct', 'CORE_LOOPS_MYCELIAL_THROUGHPUT_PENALTY_AT_STRESS_PCT', 30));
  },

  /** mycelial_natural_decay_per_minute — idle-leg decay rate applied per idle game-minute past the cooling period (§5.2). Default 0.02, 0.005..0.1. */
  get mycelialNaturalDecayPerMinute(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_natural_decay_per_minute',
      TunablesStore.resolveFloat('core_loops.mycelial_natural_decay_per_minute', 'CORE_LOOPS_MYCELIAL_NATURAL_DECAY_PER_MINUTE', 0.02));
  },

  /** mycelial_quick_patch_residual_debt — QUICK_PATCH's partial-clear residual (§5.4: `debt_load = min(debt_load, this)`). Default 0.2, 0.05..0.4. */
  get mycelialQuickPatchResidualDebt(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_quick_patch_residual_debt',
      TunablesStore.resolveFloat('core_loops.mycelial_quick_patch_residual_debt', 'CORE_LOOPS_MYCELIAL_QUICK_PATCH_RESIDUAL_DEBT', 0.2));
  },

  /** mycelial_quick_patch_duration_ticks — QUICK_PATCH job duration, game-minutes (§5.4). Default 2, 1..4. */
  get mycelialQuickPatchDurationTicks(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_quick_patch_duration_ticks',
      TunablesStore.resolveInt('core_loops.mycelial_quick_patch_duration_ticks', 'CORE_LOOPS_MYCELIAL_QUICK_PATCH_DURATION_TICKS', 2));
  },

  /** mycelial_structural_reinforce_duration_ticks — STRUCTURAL_REINFORCE job duration, game-minutes (§5.4, the STRUCTURAL mode — `governor.commit(MYCELIAL_STRUCTURAL_REINFORCE)`). Default 6, 3..10. */
  get mycelialStructuralReinforceDurationTicks(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_structural_reinforce_duration_ticks',
      TunablesStore.resolveInt('core_loops.mycelial_structural_reinforce_duration_ticks', 'CORE_LOOPS_MYCELIAL_STRUCTURAL_REINFORCE_DURATION_TICKS', 6));
  },

  /** mycelial_sinuosity_debt_acceleration_coefficient — §8.1 coupling: `sinuosity_factor = max(0, SI-1) × this` applied to the accrual increment (Loop 4 → Loop 5). Default 0.4, 0.1..0.8. */
  get mycelialSinuosityDebtAccelerationCoefficient(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_sinuosity_debt_acceleration_coefficient',
      TunablesStore.resolveFloat('core_loops.mycelial_sinuosity_debt_acceleration_coefficient', 'CORE_LOOPS_MYCELIAL_SINUOSITY_DEBT_ACCELERATION_COEFFICIENT', 0.4));
  },

  /** mycelial_debt_accrual_exponent — the D5 nonlinear accrual exponent applied to the normalized×multiplier term (§5.1). Default 1.5, 1.0..2.5. */
  get mycelialDebtAccrualExponent(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_debt_accrual_exponent',
      TunablesStore.resolveFloat('core_loops.mycelial_debt_accrual_exponent', 'CORE_LOOPS_MYCELIAL_DEBT_ACCRUAL_EXPONENT', 1.5));
  },

  /** mycelial_cooling_period_ticks_for_decay_start — idle game-minutes before natural decay begins (§5.2). Default 12, 4..24. */
  get mycelialCoolingPeriodTicksForDecayStart(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_cooling_period_ticks_for_decay_start',
      TunablesStore.resolveInt('core_loops.mycelial_cooling_period_ticks_for_decay_start', 'CORE_LOOPS_MYCELIAL_COOLING_PERIOD_TICKS_FOR_DECAY_START', 12));
  },

  /** mycelial_bypass_setup_cost_cents — REROUTE_BYPASS setup cash cost (§5.4, D11 cash-plate transposition of canon's composite `reroute_bypass_setup_cost_multiplier` — one of the 11 canon mycelial rows). Default 5000 ($50) `[PROV-Y26Q2]`, 1000..20000. */
  get mycelialBypassSetupCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_bypass_setup_cost_cents',
      TunablesStore.resolveInt('core_loops.mycelial_bypass_setup_cost_cents', 'CORE_LOOPS_MYCELIAL_BYPASS_SETUP_COST_CENTS', 5000));
  },

  /** mycelial_throughput_normalization_grams — the D5 accrual assiette's grams-to-unitless normalization (§5.1: `normalized = cargo_grams / this`). NEW, divergence #9 (canon silent on the throughput unit). Default 500, 100..2000. */
  get mycelialThroughputNormalizationGrams(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_throughput_normalization_grams',
      TunablesStore.resolveInt('core_loops.mycelial_throughput_normalization_grams', 'CORE_LOOPS_MYCELIAL_THROUGHPUT_NORMALIZATION_GRAMS', 500));
  },

  /** mycelial_backpressure_feed_coefficient — §8.2 coupling: applied to the accrual increment when the leg's destination node is in `critical` bucket (Loop 3 → Loop 5, amortized). NEW. Default 0.3, 0.1..0.6. */
  get mycelialBackpressureFeedCoefficient(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_backpressure_feed_coefficient',
      TunablesStore.resolveFloat('core_loops.mycelial_backpressure_feed_coefficient', 'CORE_LOOPS_MYCELIAL_BACKPRESSURE_FEED_COEFFICIENT', 0.3));
  },

  /** mycelial_debt_cap — I2's ceiling half: the C2 upsert's `LEAST(debt_load + increment, this)` clamp. NOT a DB CHECK (deliberate asymmetry, mig 0125 — mirrors `lieutenant_flag_state.credibility_tokens`, mig 0123). NEW. Default 2.0, 1.0..5.0. */
  get mycelialDebtCap(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_debt_cap',
      TunablesStore.resolveFloat('core_loops.mycelial_debt_cap', 'CORE_LOOPS_MYCELIAL_DEBT_CAP', 2.0));
  },

  /**
   * mycelial_bypass_resume_threshold — REROUTE_BYPASS's state-not-timer exit condition (§5.4: dispatch
   * on the bypassed pair resumes once `debt_load <= this`, sub-décision #10 RATIFIED). NEW — `
   * [PROV-Y26Q2]`, no canon/design numeric given anywhere in the authoring docs (flagged honestly, not
   * silently invented): a principled default below `mycelial_stress_threshold` (0.85) with headroom
   * above `mycelial_quick_patch_residual_debt` (0.2) — "rested enough to resume, not merely patched".
   * Default 0.3, 0.1..0.6.
   *
   * ★ C4 CONFIRMATION (the C1 reviewer's own reconciliation request): 0.3 fits the C4 implementation —
   * `LegRepository.applyNightlyDecayAndStressEval`'s bypass resume-exit compares the SAME getter against
   * the SAME `debt_load` column the stress derivation reads, and 0.3 sits strictly BETWEEN
   * `mycelial_quick_patch_residual_debt` (0.2, the QUICK_PATCH floor a leg could otherwise sit at
   * forever without ever resuming) and `mycelial_stress_threshold` (0.85, the value a leg must be BELOW
   * to not immediately re-qualify as `stressed` the moment it resumes) — a bypassed leg genuinely rests
   * past "merely patched" before dispatch reopens, and never resumes still-stressed. No calibration
   * conflict found against any other C1-C4 getter; range 0.1..0.6 left unchanged.
   */
  get mycelialBypassResumeThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_bypass_resume_threshold',
      TunablesStore.resolveFloat('core_loops.mycelial_bypass_resume_threshold', 'CORE_LOOPS_MYCELIAL_BYPASS_RESUME_THRESHOLD', 0.3));
  },

  /** mycelial_quick_patch_cost_cents — QUICK_PATCH cash cost (§5.4, D11 — canon gives only qualitative "low" text). Default 5000 ($50) `[PROV-Y26Q2]`, 1000..20000. */
  get mycelialQuickPatchCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_quick_patch_cost_cents',
      TunablesStore.resolveInt('core_loops.mycelial_quick_patch_cost_cents', 'CORE_LOOPS_MYCELIAL_QUICK_PATCH_COST_CENTS', 5000));
  },

  /** mycelial_structural_reinforce_cost_cents — STRUCTURAL_REINFORCE cash cost (§5.4, D11 — canon gives only qualitative "mid" text; the STRUCTURAL mode). Default 30000 ($300) `[PROV-Y26Q2]`, 10000..100000. */
  get mycelialStructuralReinforceCostCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.mycelial_structural_reinforce_cost_cents',
      TunablesStore.resolveInt('core_loops.mycelial_structural_reinforce_cost_cents', 'CORE_LOOPS_MYCELIAL_STRUCTURAL_REINFORCE_COST_CENTS', 30000));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-D C1 — Loop 6 Cue Stack Integrity (cue_stack_integrity.md §Tunables, D1/D7)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** cue_stack_depth_slots_max — compose-time validation ceiling on stack length (design §4.1/§14 — renamed/repurposed from canon `cue_stack.depth_slots`, divergence #2: the DB CHECK 4..8 wins over canon's own inconsistent 3..8). Default 8, 4..8. */
  get cueStackDepthSlotsMax(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_depth_slots_max',
      TunablesStore.resolveInt('core_loops.cue_stack_depth_slots_max', 'CORE_LOOPS_CUE_STACK_DEPTH_SLOTS_MAX', 8));
  },

  /** cue_stack_recovery_cost_multiplier — the out-of-order recovery time multiplier (§6.3, D5 — realized temporally, universal across the 4 v1 executors). Default 1.5, 1.0..3.0. */
  get cueStackRecoveryCostMultiplier(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_recovery_cost_multiplier',
      TunablesStore.resolveFloat('core_loops.cue_stack_recovery_cost_multiplier', 'CORE_LOOPS_CUE_STACK_RECOVERY_COST_MULTIPLIER', 1.5));
  },

  /** cue_stack_named_sequences_max — the I4 DB-atomic cap on saved sequences per player (§8/C5 — renamed from canon `cue_stack.player_defined_named_sequences_max`; range 3..10 corrects the legacy gdd/14 row's own stale 0..10). Default 5, 3..10. */
  get cueStackNamedSequencesMax(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_named_sequences_max',
      TunablesStore.resolveInt('core_loops.cue_stack_named_sequences_max', 'CORE_LOOPS_CUE_STACK_NAMED_SEQUENCES_MAX', 5));
  },

  /** cue_stack_slot_minutes_distribution_run — DISTRIBUTION_RUN slot firing duration, game-minutes (§5.3, NEW impl — no canon numeric magnitude). Default 15, 5..60. */
  get cueStackSlotMinutesDistributionRun(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_slot_minutes_distribution_run',
      TunablesStore.resolveInt('core_loops.cue_stack_slot_minutes_distribution_run', 'CORE_LOOPS_CUE_STACK_SLOT_MINUTES_DISTRIBUTION_RUN', 15));
  },

  /** cue_stack_slot_minutes_maintenance_batch — MAINTENANCE_BATCH slot firing duration, game-minutes (§5.3, NEW impl). Default 20, 5..60. */
  get cueStackSlotMinutesMaintenanceBatch(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_slot_minutes_maintenance_batch',
      TunablesStore.resolveInt('core_loops.cue_stack_slot_minutes_maintenance_batch', 'CORE_LOOPS_CUE_STACK_SLOT_MINUTES_MAINTENANCE_BATCH', 20));
  },

  /** cue_stack_slot_minutes_recruitment_step — RECRUITMENT_STEP slot firing duration, game-minutes (§5.3, NEW impl). Default 25, 5..60. */
  get cueStackSlotMinutesRecruitmentStep(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_slot_minutes_recruitment_step',
      TunablesStore.resolveInt('core_loops.cue_stack_slot_minutes_recruitment_step', 'CORE_LOOPS_CUE_STACK_SLOT_MINUTES_RECRUITMENT_STEP', 25));
  },

  /** cue_stack_slot_minutes_exception_batch — EXCEPTION_BATCH_RESOLUTION slot firing duration, game-minutes (§5.3, NEW impl). Default 10, 5..60. */
  get cueStackSlotMinutesExceptionBatch(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_slot_minutes_exception_batch',
      TunablesStore.resolveInt('core_loops.cue_stack_slot_minutes_exception_batch', 'CORE_LOOPS_CUE_STACK_SLOT_MINUTES_EXCEPTION_BATCH', 10));
  },

  /** cue_stack_stale_executing_horizon_hours — CUE_STACK_STALE_SWEEP (NIGHTLY/29 provisional, C3) crash-safe horizon: an `executing` stack past this age is force-resolved. NEW impl. Default 48, 12..96. */
  get cueStackStaleExecutingHorizonHours(): number {
    return clampCoreLoopsTunableToRange('core_loops.cue_stack_stale_executing_horizon_hours',
      TunablesStore.resolveInt('core_loops.cue_stack_stale_executing_horizon_hours', 'CORE_LOOPS_CUE_STACK_STALE_EXECUTING_HORIZON_HOURS', 48));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-D C1 — Loop 7 Annealing Window (annealing_window.md §Tunables, D8/D9/D10)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** annealing_base_settling_minutes — the settling window at initiation (§9.3 — GDD L283 "20-40 real minutes" prose, midpoint documented). Default 30, 10..120. */
  get annealingBaseSettlingMinutes(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_base_settling_minutes',
      TunablesStore.resolveInt('core_loops.annealing_base_settling_minutes', 'CORE_LOOPS_ANNEALING_BASE_SETTLING_MINUTES', 30));
  },

  /** annealing_band_short_upper_minutes — `SettlingBandBucket.short` upper bound, real minutes (§9.5). Default 10, 5..30. */
  get annealingBandShortUpperMinutes(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_band_short_upper_minutes',
      TunablesStore.resolveInt('core_loops.annealing_band_short_upper_minutes', 'CORE_LOOPS_ANNEALING_BAND_SHORT_UPPER_MINUTES', 10));
  },

  /** annealing_band_medium_upper_minutes — `SettlingBandBucket.medium` upper bound, real minutes (§9.5). Default 30, 15..60. */
  get annealingBandMediumUpperMinutes(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_band_medium_upper_minutes',
      TunablesStore.resolveInt('core_loops.annealing_band_medium_upper_minutes', 'CORE_LOOPS_ANNEALING_BAND_MEDIUM_UPPER_MINUTES', 30));
  },

  /** annealing_band_long_upper_minutes — `SettlingBandBucket.long` upper bound, real minutes (§9.5). Default 120, 45..180. */
  get annealingBandLongUpperMinutes(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_band_long_upper_minutes',
      TunablesStore.resolveInt('core_loops.annealing_band_long_upper_minutes', 'CORE_LOOPS_ANNEALING_BAND_LONG_UPPER_MINUTES', 120));
  },

  /** annealing_compounding_multiplier — the I5 compounding extension factor applied to remaining settling time (§9.3). Default 1.5, 1.1..2.5. */
  get annealingCompoundingMultiplier(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_compounding_multiplier',
      TunablesStore.resolveFloat('core_loops.annealing_compounding_multiplier', 'CORE_LOOPS_ANNEALING_COMPOUNDING_MULTIPLIER', 1.5));
  },

  /** annealing_throughput_reduction_pct — the §10.1 dispatch throughput-reduction magnitude, PERCENTAGE (renamed from canon `annealing.throughput_reduction_during_settling_pct` — unit-corrects the legacy gdd/14 row's own FRACTION 0.10, the SAME unit-correction precedent `mycelial_throughput_penalty_at_stress_pct` mig 0125 established). Default 10, 5..25. */
  get annealingThroughputReductionPct(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_throughput_reduction_pct',
      TunablesStore.resolveInt('core_loops.annealing_throughput_reduction_pct', 'CORE_LOOPS_ANNEALING_THROUGHPUT_REDUCTION_PCT', 10));
  },

  /** annealing_compounding_throughput_penalty — per-compounding-change throughput multiplier shrinkage (§9.3: `throughput_multiplier *= (1 - this)`). Default 0.05, 0.02..0.15. */
  get annealingCompoundingThroughputPenalty(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_compounding_throughput_penalty',
      TunablesStore.resolveFloat('core_loops.annealing_compounding_throughput_penalty', 'CORE_LOOPS_ANNEALING_COMPOUNDING_THROUGHPUT_PENALTY', 0.05));
  },

  /** annealing_touchable_minimum_count — the rolling-decision-queue's minimum `touchable` node count (§10.3). Default 3, 1..6. */
  get annealingTouchableMinimumCount(): number {
    return clampCoreLoopsTunableToRange('core_loops.annealing_touchable_minimum_count',
      TunablesStore.resolveInt('core_loops.annealing_touchable_minimum_count', 'CORE_LOOPS_ANNEALING_TOUCHABLE_MINIMUM_COUNT', 3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-E C1 — Loop 8 Demolition Mandate (demolition_mandate.md §Tunables, D9/★#5/divergences #3/#4/#15)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * demolition_friction_budget_threshold_multiplier_of_org_size — the friction seuil multiplier
   * (`friction_threshold = friction_org_size × this`, §4.3). Canon KEEPS its name (ruling ★#1 — never a
   * rename of a canon key) even though its multiplicande is `friction_org_size` (the ★#1 all-owned
   * périmètre, divergence #15), NOT the canon-active `org_size` used elsewhere. Range canon 05 GAGNE vs
   * legacy gdd/14 `1.0..2.0` (divergence #4). Default 1.4, 1.1..2.0.
   */
  get demolitionFrictionBudgetThresholdMultiplierOfOrgSize(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_friction_budget_threshold_multiplier_of_org_size',
      TunablesStore.resolveFloat('core_loops.demolition_friction_budget_threshold_multiplier_of_org_size', 'CORE_LOOPS_DEMOLITION_FRICTION_BUDGET_THRESHOLD_MULTIPLIER_OF_ORG_SIZE', 1.4));
  },

  /** demolition_efficiency_penalty_curve — registry string (`linear`|`quadratic`, TD #2/divergence #8 — only `linear` is wired v1). No CAPS entry (string key, mirrors `lieutenant.signal_drift.cue_generation_strategy`'s own convention). Default 'linear'. */
  get demolitionEfficiencyPenaltyCurve(): string {
    return TunablesStore.resolveString('core_loops.demolition_efficiency_penalty_curve', 'CORE_LOOPS_DEMOLITION_EFFICIENCY_PENALTY_CURVE', 'linear');
  },

  /** demolition_efficiency_penalty_multiplier_baseline — the ★#2 direct-multiplication factor at the 2 output sites (C3) when `efficiency_penalty_active`. Default 0.85 (-15%), 0.7..0.95. */
  get demolitionEfficiencyPenaltyMultiplierBaseline(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_efficiency_penalty_multiplier_baseline',
      TunablesStore.resolveFloat('core_loops.demolition_efficiency_penalty_multiplier_baseline', 'CORE_LOOPS_DEMOLITION_EFFICIENCY_PENALTY_MULTIPLIER_BASELINE', 0.85));
  },

  /** demolition_replacement_options_count — the ★#5 max ranked candidates per decommissioned node (`replacement_option.rank` CHECK IN (1,2) matches this default). Default 2, 1..4. */
  get demolitionReplacementOptionsCount(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_replacement_options_count',
      TunablesStore.resolveInt('core_loops.demolition_replacement_options_count', 'CORE_LOOPS_DEMOLITION_REPLACEMENT_OPTIONS_COUNT', 2));
  },

  /** demolition_age_decay_factor_per_tick — the §4.2 accrual formula's age term coefficient (`1 + this × age_ticks`, age_ticks in JOURS in-game, D20). Default 0.001, 0.0005..0.005. */
  get demolitionAgeDecayFactorPerTick(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_age_decay_factor_per_tick',
      TunablesStore.resolveFloat('core_loops.demolition_age_decay_factor_per_tick', 'CORE_LOOPS_DEMOLITION_AGE_DECAY_FACTOR_PER_TICK', 0.001));
  },

  /** demolition_per_connection_friction_modifier — the §4.2 accrual formula's connection-count term coefficient (`1 + connection_count × this`). Default 0.1, 0.05..0.25. */
  get demolitionPerConnectionFrictionModifier(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_per_connection_friction_modifier',
      TunablesStore.resolveFloat('core_loops.demolition_per_connection_friction_modifier', 'CORE_LOOPS_DEMOLITION_PER_CONNECTION_FRICTION_MODIFIER', 0.1));
  },

  /** demolition_base_friction_per_node — the §4.2 accrual formula's per-node base scalar (composite `composite:friction_baseline` realized v1 as a scalar, divergence #3, TD #1 per-class table). `[PROV-Y26Q2]`. Default 1.0, 0.5..3.0. */
  get demolitionBaseFrictionPerNode(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_base_friction_per_node',
      TunablesStore.resolveFloat('core_loops.demolition_base_friction_per_node', 'CORE_LOOPS_DEMOLITION_BASE_FRICTION_PER_NODE', 1.0));
  },

  /** demolition_friction_bucket_light_upper_bound — `FrictionBudgetBucket.light` upper bound, fraction of `total/threshold` (§4.3, 1 of 3 physical thresholds realizing the composite `demolition_friction_budget_bucket_thresholds`). Default 0.5, 0.3..0.7. */
  get demolitionFrictionBucketLightUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_friction_bucket_light_upper_bound',
      TunablesStore.resolveFloat('core_loops.demolition_friction_bucket_light_upper_bound', 'CORE_LOOPS_DEMOLITION_FRICTION_BUCKET_LIGHT_UPPER_BOUND', 0.5));
  },

  /** demolition_friction_bucket_balanced_upper_bound — `FrictionBudgetBucket.balanced` upper bound (§4.3, 2 of 3). Default 0.85, 0.6..0.95. */
  get demolitionFrictionBucketBalancedUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_friction_bucket_balanced_upper_bound',
      TunablesStore.resolveFloat('core_loops.demolition_friction_bucket_balanced_upper_bound', 'CORE_LOOPS_DEMOLITION_FRICTION_BUCKET_BALANCED_UPPER_BOUND', 0.85));
  },

  /** demolition_friction_bucket_strained_upper_bound — `FrictionBudgetBucket.strained` upper bound; at/above this the bucket is `overloaded` (§4.3, 3 of 3). Default 1.0, 0.85..1.2. */
  get demolitionFrictionBucketStrainedUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_friction_bucket_strained_upper_bound',
      TunablesStore.resolveFloat('core_loops.demolition_friction_bucket_strained_upper_bound', 'CORE_LOOPS_DEMOLITION_FRICTION_BUCKET_STRAINED_UPPER_BOUND', 1.0));
  },

  /** demolition_decommission_cost_fraction_of_setup — D9: the decommission debit fraction × basis (setup_cost type if converted, else acquisition price, C0 reconciliation). NEW-additif (divergence #5, canon defers to 04a cost tables as BASIS with no fraction number, TD per-type). `[PROV-Y26Q2]`. Default 0.5, 0.2..0.8. */
  get demolitionDecommissionCostFractionOfSetup(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_decommission_cost_fraction_of_setup',
      TunablesStore.resolveFloat('core_loops.demolition_decommission_cost_fraction_of_setup', 'CORE_LOOPS_DEMOLITION_DECOMMISSION_COST_FRACTION_OF_SETUP', 0.5));
  },

  /** demolition_replacement_option_expiry_game_days — ★#5 ratifié: replacement options expire this many in-game days after creation. NEW-additif. Default 7, 3..14. */
  get demolitionReplacementOptionExpiryGameDays(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_replacement_option_expiry_game_days',
      TunablesStore.resolveInt('core_loops.demolition_replacement_option_expiry_game_days', 'CORE_LOOPS_DEMOLITION_REPLACEMENT_OPTION_EXPIRY_GAME_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-E C1 — Loop 9 Compression Week (compression_week.md §Tunables, D15/★#3/★#6/divergences #6/#7/#14)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** compression_stress_accumulation_rate_multiplier — global multiplier applied to the §8.2 weighted-source stress accrual formula. Default 1.0, 0.5..2.0. */
  get compressionStressAccumulationRateMultiplier(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_stress_accumulation_rate_multiplier',
      TunablesStore.resolveFloat('core_loops.compression_stress_accumulation_rate_multiplier', 'CORE_LOOPS_COMPRESSION_STRESS_ACCUMULATION_RATE_MULTIPLIER', 1.0));
  },

  /** compression_max_decision_budget — I7 DB-atomic cap on `compression_events.decisions_used` (§10.2). Default 5, 3..8. */
  get compressionMaxDecisionBudget(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_max_decision_budget',
      TunablesStore.resolveInt('core_loops.compression_max_decision_budget', 'CORE_LOOPS_COMPRESSION_MAX_DECISION_BUDGET', 5));
  },

  /** compression_stress_threshold_trigger — `org_stress` at/above this transitions `compression_week_state` 'none'→'warning' (§9.2). Default 85, 70..95. */
  get compressionStressThresholdTrigger(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_stress_threshold_trigger',
      TunablesStore.resolveInt('core_loops.compression_stress_threshold_trigger', 'CORE_LOOPS_COMPRESSION_STRESS_THRESHOLD_TRIGGER', 85));
  },

  /** compression_deferral_penalty_stress — stress added by the ★#5 single-use deferral (§9.2). Default 10, 5..20. */
  get compressionDeferralPenaltyStress(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_deferral_penalty_stress',
      TunablesStore.resolveInt('core_loops.compression_deferral_penalty_stress', 'CORE_LOOPS_COMPRESSION_DEFERRAL_PENALTY_STRESS', 10));
  },

  /** compression_problem_downgrade_per_unaddressed_tiers — ★#6 downgrade tooth (i): tier-cranks applied to non-addressed entries at finalize (§10.4). Default 1, 1..2. */
  get compressionProblemDowngradePerUnaddressedTiers(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_problem_downgrade_per_unaddressed_tiers',
      TunablesStore.resolveInt('core_loops.compression_problem_downgrade_per_unaddressed_tiers', 'CORE_LOOPS_COMPRESSION_PROBLEM_DOWNGRADE_PER_UNADDRESSED_TIERS', 1));
  },

  /**
   * compression_severity_multiplier_at_100_stress — the composite `composite:severity_high` realized v1
   * as a tier-bump AMOUNT (§9.2/§10.1: severity ≥ 100 at seed → initial tier +this crank), not a literal
   * multiplier (the composite has no defined numeric form, divergence #7). Default 1, 1..2.
   */
  get compressionSeverityMultiplierAt100Stress(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_severity_multiplier_at_100_stress',
      TunablesStore.resolveInt('core_loops.compression_severity_multiplier_at_100_stress', 'CORE_LOOPS_COMPRESSION_SEVERITY_MULTIPLIER_AT_100_STRESS', 1));
  },

  /** compression_force_engagement_threshold — `org_stress` at/above this forces `compression_week_state`→'active' (no deferral possible, §9.2). Default 95, 85..98. */
  get compressionForceEngagementThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_force_engagement_threshold',
      TunablesStore.resolveInt('core_loops.compression_force_engagement_threshold', 'CORE_LOOPS_COMPRESSION_FORCE_ENGAGEMENT_THRESHOLD', 95));
  },

  /** compression_max_severity_threshold — the severity ceiling `org_stress` clamps to (D17, canon "fixed"). CAPS min==max (documented no-op clamp — a real getter per R2.3, not a hardcoded literal). Default 100. */
  get compressionMaxSeverityThreshold(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_max_severity_threshold',
      TunablesStore.resolveInt('core_loops.compression_max_severity_threshold', 'CORE_LOOPS_COMPRESSION_MAX_SEVERITY_THRESHOLD', 100));
  },

  /** compression_per_session_stress_increment_max — the §8.1 per-session-close accrual cap (bounds a single session's stress contribution). Default 12, 5..20. */
  get compressionPerSessionStressIncrementMax(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_per_session_stress_increment_max',
      TunablesStore.resolveInt('core_loops.compression_per_session_stress_increment_max', 'CORE_LOOPS_COMPRESSION_PER_SESSION_STRESS_INCREMENT_MAX', 12));
  },

  /** compression_stress_decay_per_quiet_week — the §8.3 W/14 "quiet week" decay magnitude (no new problems + at least 1 resolved). Default 5, 2..10. */
  get compressionStressDecayPerQuietWeek(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_stress_decay_per_quiet_week',
      TunablesStore.resolveInt('core_loops.compression_stress_decay_per_quiet_week', 'CORE_LOOPS_COMPRESSION_STRESS_DECAY_PER_QUIET_WEEK', 5));
  },

  /** compression_supply_chain_capacity_pressure_weight — ★#3 canon weight (VERBATIM 0.30, largest of the 5) for the §8.2 weighted stress-source sum. Default 0.30, 0.10..0.50. */
  get compressionSupplyChainCapacityPressureWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_supply_chain_capacity_pressure_weight',
      TunablesStore.resolveFloat('core_loops.compression_supply_chain_capacity_pressure_weight', 'CORE_LOOPS_COMPRESSION_SUPPLY_CHAIN_CAPACITY_PRESSURE_WEIGHT', 0.30));
  },

  /** compression_understudy_unsync_weight — ★#3 canon weight (VERBATIM 0.20). INERT dormant v1 (ch07 lieutenants_and_behavior not built, divergence #10 — poids tracé, NEVER renormalized). Default 0.20, 0.10..0.40. */
  get compressionUnderstudyUnsyncWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_understudy_unsync_weight',
      TunablesStore.resolveFloat('core_loops.compression_understudy_unsync_weight', 'CORE_LOOPS_COMPRESSION_UNDERSTUDY_UNSYNC_WEIGHT', 0.20));
  },

  /** compression_lieutenant_flag_unresolved_weight — ★#3 canon weight (VERBATIM 0.20) for P3-B unresolved `flagged_items`. Default 0.20, 0.10..0.40. */
  get compressionLieutenantFlagUnresolvedWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_lieutenant_flag_unresolved_weight',
      TunablesStore.resolveFloat('core_loops.compression_lieutenant_flag_unresolved_weight', 'CORE_LOOPS_COMPRESSION_LIEUTENANT_FLAG_UNRESOLVED_WEIGHT', 0.20));
  },

  /** compression_cue_stack_non_optimal_weight — ★#3 canon weight (VERBATIM 0.15) for P3-D failed/cascading cue-stack slots. Default 0.15, 0.05..0.30. */
  get compressionCueStackNonOptimalWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_cue_stack_non_optimal_weight',
      TunablesStore.resolveFloat('core_loops.compression_cue_stack_non_optimal_weight', 'CORE_LOOPS_COMPRESSION_CUE_STACK_NON_OPTIMAL_WEIGHT', 0.15));
  },

  /** compression_constraint_knot_unresolved_weight — ★#3 canon weight (VERBATIM 0.15). INERT dormant v1 (ch06 meta_progression constraint knots not built, divergence #10 — poids tracé, NEVER renormalized). Default 0.15, 0.05..0.30. */
  get compressionConstraintKnotUnresolvedWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_constraint_knot_unresolved_weight',
      TunablesStore.resolveFloat('core_loops.compression_constraint_knot_unresolved_weight', 'CORE_LOOPS_COMPRESSION_CONSTRAINT_KNOT_UNRESOLVED_WEIGHT', 0.15));
  },

  /** compression_friction_penalty_weight — NEW-additif (★#3 ratifié, divergence #6): Loop 8 efficiency-penalty-active as a stress source (canon cross-ref "contributes stress" gives no number). Default 0.10, 0.05..0.30. */
  get compressionFrictionPenaltyWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_friction_penalty_weight',
      TunablesStore.resolveFloat('core_loops.compression_friction_penalty_weight', 'CORE_LOOPS_COMPRESSION_FRICTION_PENALTY_WEIGHT', 0.10));
  },

  /** compression_annealing_strain_weight — NEW-additif (★#3 ratifié, divergence #6): P3-D annealing compounding-strain as a stress source. Default 0.10, 0.05..0.30. */
  get compressionAnnealingStrainWeight(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_annealing_strain_weight',
      TunablesStore.resolveFloat('core_loops.compression_annealing_strain_weight', 'CORE_LOOPS_COMPRESSION_ANNEALING_STRAIN_WEIGHT', 0.10));
  },

  /** compression_post_reset_stress — ★#6 downgrade tooth (iii): the finalize reset floor (`org_stress := max(this, plancher applicable)`, §10.4). NEW-additif (divergence #14). Default 20, 10..30. */
  get compressionPostResetStress(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_post_reset_stress',
      TunablesStore.resolveInt('core_loops.compression_post_reset_stress', 'CORE_LOOPS_COMPRESSION_POST_RESET_STRESS', 20));
  },

  /** compression_stress_floor_with_critical_residue — ★#6 downgrade tooth (iii): `org_stress` cannot decay below this while ≥1 critical problem-entry persists unresolved (§10.4). NEW-additif (divergence #14). Default 40, 30..60. */
  get compressionStressFloorWithCriticalResidue(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_stress_floor_with_critical_residue',
      TunablesStore.resolveInt('core_loops.compression_stress_floor_with_critical_residue', 'CORE_LOOPS_COMPRESSION_STRESS_FLOOR_WITH_CRITICAL_RESIDUE', 40));
  },

  /**
   * compression_count_based_stress_signal_cap — P3-E C6 (design §8.2, "formule figée au plan C6 sur
   * pièces"): the 2 §8.2 sources realized as a raw COUNT (not a fraction-of-total like supply-chain, not a
   * ratio-of-threshold like friction) — `flagged_items` pending (`compression_lieutenant_flag_unresolved_
   * weight`'s own live signal) and cue-stack failed slots + CUE_CASCADE pending cards
   * (`compression_cue_stack_non_optimal_weight`'s own live signal) — need SOME numeric normalization to
   * land in [0,1]; the design's own tables give the RAW column/query (C0-reserve R2/R4, decisions §8.5)
   * but no cap number. NEW-additif, `[PROV-Y26Q2]`. `signal = min(1, count / this)`. Default 5, 2..10.
   */
  get compressionCountBasedStressSignalCap(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_count_based_stress_signal_cap',
      TunablesStore.resolveInt('core_loops.compression_count_based_stress_signal_cap', 'CORE_LOOPS_COMPRESSION_COUNT_BASED_STRESS_SIGNAL_CAP', 5));
  },

  /** compression_board_abandon_horizon_game_days — P3-E C7 (D15): a board `'active'` this many in-game days
   *  since fire (`fired_at_tick`, the only timestamp anchor `compression_events` carries) without reaching
   *  a natural finalize (budget-exhausted/all-addressed) auto-finalizes via the N/31 abandon-sweep. NEW-
   *  additif (design names the default, registers no key). Default 14, 7..30. */
  get compressionBoardAbandonHorizonGameDays(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_board_abandon_horizon_game_days',
      TunablesStore.resolveInt('core_loops.compression_board_abandon_horizon_game_days', 'CORE_LOOPS_COMPRESSION_BOARD_ABANDON_HORIZON_GAME_DAYS', 14));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // P3-E C8 — Murs R2.2/P5 (design §15/§16) — the projection-layer bucket cutpoints
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** compression_stress_bucket_calm_upper_bound — `StressBucket.calm` upper bound (design §15 literal:
   *  "calm < 50"). `mounting`'s own upper bound REUSES `compressionStressThresholdTrigger` (85 default) —
   *  zero 2nd tunable for that boundary (R2.3). Default 50, 30..70. */
  get compressionStressBucketCalmUpperBound(): number {
    return clampCoreLoopsTunableToRange('core_loops.compression_stress_bucket_calm_upper_bound',
      TunablesStore.resolveInt('core_loops.compression_stress_bucket_calm_upper_bound', 'CORE_LOOPS_COMPRESSION_STRESS_BUCKET_CALM_UPPER_BOUND', 50));
  },

  /** demolition_decommission_cost_bucket_cheap_upper_bound_cents — `DecommissionCostBucket.cheap` upper
   *  bound, cents (C8, coder-realized — `decommission-cost.ts`'s own calibration note). Default 500000
   *  ($5,000), 200000..1000000. */
  get demolitionDecommissionCostBucketCheapUpperBoundCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_decommission_cost_bucket_cheap_upper_bound_cents',
      TunablesStore.resolveInt('core_loops.demolition_decommission_cost_bucket_cheap_upper_bound_cents', 'CORE_LOOPS_DEMOLITION_DECOMMISSION_COST_BUCKET_CHEAP_UPPER_BOUND_CENTS', 500000));
  },

  /** demolition_decommission_cost_bucket_moderate_upper_bound_cents — `DecommissionCostBucket.moderate`
   *  upper bound, cents. Default 1500000 ($15,000), 800000..3000000. */
  get demolitionDecommissionCostBucketModerateUpperBoundCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_decommission_cost_bucket_moderate_upper_bound_cents',
      TunablesStore.resolveInt('core_loops.demolition_decommission_cost_bucket_moderate_upper_bound_cents', 'CORE_LOOPS_DEMOLITION_DECOMMISSION_COST_BUCKET_MODERATE_UPPER_BOUND_CENTS', 1500000));
  },

  /** demolition_decommission_cost_bucket_expensive_upper_bound_cents — `DecommissionCostBucket.expensive`
   *  upper bound, cents; at/above this the bucket is `very_expensive`. Default 4000000 ($40,000),
   *  2000000..8000000. */
  get demolitionDecommissionCostBucketExpensiveUpperBoundCents(): number {
    return clampCoreLoopsTunableToRange('core_loops.demolition_decommission_cost_bucket_expensive_upper_bound_cents',
      TunablesStore.resolveInt('core_loops.demolition_decommission_cost_bucket_expensive_upper_bound_cents', 'CORE_LOOPS_DEMOLITION_DECOMMISSION_COST_BUCKET_EXPENSIVE_UPPER_BOUND_CENTS', 4000000));
  },
};

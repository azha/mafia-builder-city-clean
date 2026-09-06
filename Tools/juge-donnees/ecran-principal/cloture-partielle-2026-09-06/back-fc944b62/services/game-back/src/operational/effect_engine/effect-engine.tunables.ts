// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C1 (Tunables — registry-first)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §5.1 (MONTH_MINUTES) + §12
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md §Tunables référencés
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Political events catalogue (:3543-3591 —
//             post-C1, was :3543-3572/30 keys pre-C1) + §Political events (:1177, legacy reconcile).
//             Pattern: mirrors services/game-back/src/operational/meta_market/meta-market.tunables.ts (CAPS map +
//             clamp function) — the most recent same-era precedent (04d-C, 2026-07-03).
//             — 04e-A1 C1 — 2026-07-04
//
// `effect-engine.tunables.ts` — Registry-mirrored getters for ALL `political_events.*` tunable keys (the 12-event
// launch catalogue's durations/shifts/multipliers/thresholds, R2.3 registry-first). C1 is a DEDICATED tunables
// chunk that precedes every mechanic chunk (C2 schema, C3 overlay, C4 apply/revert, C5 lever wiring, C6-C9
// substrates, A2 catalogue+triggers): every political_events.* key this initiative will ever need is registered
// and mirrored HERE first, so later chunks only ever READ a getter — never inline a magnitude.
//
// R2.3 (NO inline numeric balance/config): every default below is verbatim from gdd/14 §Political events catalogue
// (the single source of truth). If a registry value changes, update gdd/14 + this file in the SAME commit (R9.3).
//
// Keys shipped at C1 (34 total):
//   30 keys ALREADY present pre-C1 (backported ch16, gdd/14 :3543-3572) — durations, shifts, multipliers per
//     E-POL-01..12, `opposition_victory_probability_base`, and the composite `epol11_bpd_memory_aggregate_trigger`
//     (R2.2 bucket, never a raw scalar).
//   3 NEW keys ADDED at C1 (were in the catalogue source doc's "NOUVEAUX" table but excluded from the ch16
//     backport pass — gdd/14 :3574 note): `budget_cycle_in_game_months`, `scandal_random_weight_per_event_noise`,
//     `overlap_max_active`.
//   1 NEW `[PROV-Y26Q2]` engine derivation: `month_minutes` (design §5.1 — the in-game calendar MONTH boundary
//     width, `30 × clock.in_game_day_length_minutes`; consumed by A2's calendar arithmetic, `monthIndex =
//     floor(gameMinute / month_minutes)`).
//
// LEGACY RECONCILE (R2.3, plan §12 / design §12): the pre-ch16 legacy key `political_event_overlap_max_active`
// (gdd/14 :1177, §Political events, no-dot legacy name) is SUPERSEDED by this file's `overlapMaxActive` getter
// (canonical dotted key `political_events.overlap_max_active`). The legacy row stays documented in gdd/14
// (KEEP-référençable — a rename would break any doc still citing the old name) but is annotated SUPERSEDED there;
// no NEW code should ever read the legacy no-dot key. This file mirrors ONLY the canonical dotted key.
//
// MIS CANON→LIVE MAPPING NOTE (design §6.1, [PROV-Y26Q2]): canon phrases 5 of these events' effects as
// "MIS inspection_processing_per_day × N" (E-POL-01/02/03/05) or "inspection density × N" (E-POL-08/12) — but
// `citysim/inspection/inspection-tunables.ts:58` (`inspectionProcessingPerDay`) has NO in-src consumer (a dead
// getter — anti-fig-leaf). The LIVE, consumed MIS intensity levers are `inspectionQueueCap`
// (inspection-tunables.ts:56, read inspection.service.ts:620,767,778) and `priorityDecayPerDay`
// (inspection-tunables.ts:68, read inspection.service.ts:669). C5 (live-lever overlay wiring) and C9 (checkpoint
// inspection-density substrate, DISTRICT scope) wire every one of these 5 canon "MIS ×N" effects onto
// `inspectionQueueCap`/`priorityDecayPerDay` — NEVER onto the dead `inspectionProcessingPerDay` getter. No code
// change to any consumer lands in C1 (this chunk is tunables-only) — this note is the registry-side record of the
// mapping decision the user ruled on 2026-07-04, so C5/C9 wire the correct getter without re-deriving the decision.
//
// CAPS: only numeric scalar keys (no cap for the 1 composite string key `epol11_bpd_memory_aggregate_trigger`).
//   33 numeric keys appear in POLITICAL_EVENTS_TUNABLE_CAPS.
//
// Consumption timeline (honest — no resolved-but-unused pretense): the 4 substrate-multiplier keys
// (`epol07_stack_utilization_*`, `epol08_inspection_density_multiplier`, `epol09_audit_pin_half_life_multiplier`,
// `epol09_audit_pin_emergence_multiplier`) get a REAL near-term consumer at C6-C9 (each substrate's live-fire
// applies a SYNTHETIC modifier whose magnitude IS this getter's value, through the real engine — plan §C6-C9).
// Every other key (durations, thresholds, remaining shifts/multipliers) is consumed when A2 builds the political
// event catalogue + wires `applyEvent`/trigger evaluators. Mirroring all 34 now (registry-first, R2.3) means A2
// never inlines a magnitude — it only ever reads a getter that already exists.

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key. Used by POLITICAL_EVENTS_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `POLITICAL_EVENTS_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the gdd/14 Range
 * column. Used internally by every numeric getter below (defense-in-depth: the getter itself never returns an
 * out-of-bounds value even if a raw DB override was written out of range) AND exposed to the `_test` `probe-clamp`
 * route for the falsifiable clamp proof.
 *
 * The 1 composite string key (`epol11_bpd_memory_aggregate_trigger`) has no numeric range — excluded (meta-market
 * precedent: string keys excluded from CAPS).
 */
export const POLITICAL_EVENTS_TUNABLE_CAPS: Record<string, TunableRange> = {
  'political_events.electoral_cycle_in_game_months':                    { min: 3,     max: 12   },
  'political_events.epol01_electoral_duration_days':                    { min: 30,    max: 120  },
  'political_events.epol01_bpd_raid_target_temperature_shift':          { min: 0.1,   max: 0.8  },
  'political_events.epol01_mis_processing_multiplier':                  { min: 1.2,   max: 2.0  },
  'political_events.epol01_cohesion_marginal_shift':                    { min: -0.10, max: -0.02 },
  'political_events.epol02_budget_increase_duration_days':              { min: 15,    max: 60   },
  'political_events.epol02_bpd_budget_multiplier':                      { min: 1.1,   max: 1.5  },
  'political_events.epol02_patrol_cluster_threshold':                   { min: 2,     max: 5    },
  'political_events.epol03_budget_cut_duration_days':                   { min: 15,    max: 60   },
  'political_events.epol03_mis_processing_multiplier':                  { min: 0.5,   max: 0.85 },
  'political_events.epol03_bpd_review_tick_multiplier':                 { min: 1.2,   max: 2.0  },
  'political_events.epol04_market_c_lo_shift':                          { min: 0.05,  max: 0.25 },
  'political_events.epol05_lobbying_duration_days':                     { min: 21,    max: 90   },
  'political_events.epol05_mis_target_player_multiplier':               { min: 1.2,   max: 2.0  },
  'political_events.epol06_anti_corruption_duration_days':              { min: 14,    max: 60   },
  'political_events.epol06_ia_threshold_shift':                         { min: -0.30, max: -0.05 },
  'political_events.epol07_stack_utilization_threshold_pct':            { min: 70,    max: 90   },
  'political_events.epol07_stack_utilization_window_days':              { min: 30,    max: 120  },
  'political_events.epol08_riverfront_crackdown_duration_days':         { min: 7,     max: 45   },
  'political_events.epol08_inspection_density_multiplier':              { min: 1.3,   max: 2.0  },
  'political_events.epol09_scandal_duration_days':                      { min: 7,     max: 30   },
  'political_events.epol09_audit_pin_half_life_multiplier':             { min: 0.4,   max: 0.85 },
  'political_events.epol09_audit_pin_emergence_multiplier':             { min: 1.1,   max: 2.0  },
  'political_events.epol10_counter_play_cost_multiplier':               { min: 0.5,   max: 0.9  },
  'political_events.epol10_lawyer_tier3_cost_multiplier':                { min: 1.05,  max: 1.4  },
  'political_events.epol11_federal_task_force_duration_days':           { min: 45,    max: 180  },
  'political_events.epol12_mis_inspection_multiplier':                  { min: 0.4,   max: 0.8  },
  'political_events.epol12_cohesion_recovery_multiplier':               { min: 1.2,   max: 2.0  },
  'political_events.opposition_victory_probability_base':               { min: 0.20,  max: 0.55 },
  'political_events.budget_cycle_in_game_months':                       { min: 1,     max: 6    },
  'political_events.scandal_random_weight_per_event_noise':             { min: 0.02,  max: 0.15 },
  'political_events.overlap_max_active':                                { min: 1,     max: 5    },
  'political_events.month_minutes':                                     { min: 20160, max: 64800 },
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used internally by every getter below + the `_test` probe-clamp route. Returns the value unchanged if no
 * range is registered for the key (e.g. the composite string key).
 */
export function clampPoliticalEventsToRange(key: string, value: number): number {
  const range = POLITICAL_EVENTS_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `political_events.*` tunable keys (C1, 34 total). */
export const politicalEventsTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-01 — Electoral campaign season (gdd/14 :3543-3547; catalogue.md :56-61)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** electoral_cycle_in_game_months — E-POL-01 trigger period (in-game months). Default 6, range 3..12. A2 trigger consumer. */
  get electoralCycleInGameMonths(): number {
    return clampPoliticalEventsToRange('political_events.electoral_cycle_in_game_months',
      TunablesStore.resolveInt('political_events.electoral_cycle_in_game_months', 'POLITICAL_EVENTS_ELECTORAL_CYCLE_IN_GAME_MONTHS', 6));
  },
  /** epol01_electoral_duration_days — E-POL-01 campaign duration (in-game days). Default 60, range 30..120. */
  get epol01ElectoralDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol01_electoral_duration_days',
      TunablesStore.resolveInt('political_events.epol01_electoral_duration_days', 'POLITICAL_EVENTS_EPOL01_ELECTORAL_DURATION_DAYS', 60));
  },
  /** epol01_bpd_raid_target_temperature_shift — BPD raid_target_temperature additive shift. Default +0.4, range 0.1..0.8. */
  get epol01BpdRaidTargetTemperatureShift(): number {
    return clampPoliticalEventsToRange('political_events.epol01_bpd_raid_target_temperature_shift',
      TunablesStore.resolveFloat('political_events.epol01_bpd_raid_target_temperature_shift', 'POLITICAL_EVENTS_EPOL01_BPD_RAID_TARGET_TEMPERATURE_SHIFT', 0.4));
  },
  /** epol01_mis_processing_multiplier — MIS "processing" ×1.5 (see MIS canon→live mapping note, header). Default 1.5, range 1.2..2.0. */
  get epol01MisProcessingMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol01_mis_processing_multiplier',
      TunablesStore.resolveFloat('political_events.epol01_mis_processing_multiplier', 'POLITICAL_EVENTS_EPOL01_MIS_PROCESSING_MULTIPLIER', 1.5));
  },
  /** epol01_cohesion_marginal_shift — cohesion permanent_marginal_threshold additive shift. Default -0.05, range -0.10..-0.02. */
  get epol01CohesionMarginalShift(): number {
    return clampPoliticalEventsToRange('political_events.epol01_cohesion_marginal_shift',
      TunablesStore.resolveFloat('political_events.epol01_cohesion_marginal_shift', 'POLITICAL_EVENTS_EPOL01_COHESION_MARGINAL_SHIFT', -0.05));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-02 — Budget cycle: enforcement increase (gdd/14 :3548-3550; catalogue.md :70-74)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol02_budget_increase_duration_days — duration (in-game days). Default 30, range 15..60. */
  get epol02BudgetIncreaseDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol02_budget_increase_duration_days',
      TunablesStore.resolveInt('political_events.epol02_budget_increase_duration_days', 'POLITICAL_EVENTS_EPOL02_BUDGET_INCREASE_DURATION_DAYS', 30));
  },
  /** epol02_bpd_budget_multiplier — BPD precinct budget ×1.25. Default 1.25, range 1.1..1.5. */
  get epol02BpdBudgetMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol02_bpd_budget_multiplier',
      TunablesStore.resolveFloat('political_events.epol02_bpd_budget_multiplier', 'POLITICAL_EVENTS_EPOL02_BPD_BUDGET_MULTIPLIER', 1.25));
  },
  /** epol02_patrol_cluster_threshold — Patrol Doctrine cluster threshold lowered to 3 (was 5). Default 3, range 2..5. */
  get epol02PatrolClusterThreshold(): number {
    return clampPoliticalEventsToRange('political_events.epol02_patrol_cluster_threshold',
      TunablesStore.resolveInt('political_events.epol02_patrol_cluster_threshold', 'POLITICAL_EVENTS_EPOL02_PATROL_CLUSTER_THRESHOLD', 3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-03 — Budget cycle: enforcement cut (gdd/14 :3551-3553; catalogue.md :81-85)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol03_budget_cut_duration_days — duration (in-game days). Default 30, range 15..60. */
  get epol03BudgetCutDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol03_budget_cut_duration_days',
      TunablesStore.resolveInt('political_events.epol03_budget_cut_duration_days', 'POLITICAL_EVENTS_EPOL03_BUDGET_CUT_DURATION_DAYS', 30));
  },
  /** epol03_mis_processing_multiplier — MIS "processing" ×0.7 (see MIS canon→live mapping note, header). Default 0.7, range 0.5..0.85. */
  get epol03MisProcessingMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol03_mis_processing_multiplier',
      TunablesStore.resolveFloat('political_events.epol03_mis_processing_multiplier', 'POLITICAL_EVENTS_EPOL03_MIS_PROCESSING_MULTIPLIER', 0.7));
  },
  /** epol03_bpd_review_tick_multiplier — BPD precinct review tick ×1.5 (slower). Default 1.5, range 1.2..2.0. */
  get epol03BpdReviewTickMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol03_bpd_review_tick_multiplier',
      TunablesStore.resolveFloat('political_events.epol03_bpd_review_tick_multiplier', 'POLITICAL_EVENTS_EPOL03_BPD_REVIEW_TICK_MULTIPLIER', 1.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-04 — Substance scheduling change / ordinance (gdd/14 :3554; catalogue.md :94, permanent)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol04_market_c_lo_shift — market lane c_lo additive shift (easier collapse). Default +0.1, range 0.05..0.25. */
  get epol04MarketCLoShift(): number {
    return clampPoliticalEventsToRange('political_events.epol04_market_c_lo_shift',
      TunablesStore.resolveFloat('political_events.epol04_market_c_lo_shift', 'POLITICAL_EVENTS_EPOL04_MARKET_C_LO_SHIFT', 0.1));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-05 — Lobbying campaign by rival (gdd/14 :3555-3556; catalogue.md :101-103)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol05_lobbying_duration_days — duration (in-game days). Default 45, range 21..90. */
  get epol05LobbyingDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol05_lobbying_duration_days',
      TunablesStore.resolveInt('political_events.epol05_lobbying_duration_days', 'POLITICAL_EVENTS_EPOL05_LOBBYING_DURATION_DAYS', 45));
  },
  /** epol05_mis_target_player_multiplier — MIS player-district inspection-density ×1.5 (PER-PLAYER scope, D2). Default 1.5, range 1.2..2.0. */
  get epol05MisTargetPlayerMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol05_mis_target_player_multiplier',
      TunablesStore.resolveFloat('political_events.epol05_mis_target_player_multiplier', 'POLITICAL_EVENTS_EPOL05_MIS_TARGET_PLAYER_MULTIPLIER', 1.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-06 — Anti-corruption initiative (gdd/14 :3557-3558; catalogue.md :110-112)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol06_anti_corruption_duration_days — duration (in-game days). Default 30, range 14..60. */
  get epol06AntiCorruptionDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol06_anti_corruption_duration_days',
      TunablesStore.resolveInt('political_events.epol06_anti_corruption_duration_days', 'POLITICAL_EVENTS_EPOL06_ANTI_CORRUPTION_DURATION_DAYS', 30));
  },
  /** epol06_ia_threshold_shift — IA open_investigation_threshold additive shift. Default -0.15, range -0.30..-0.05. */
  get epol06IaThresholdShift(): number {
    return clampPoliticalEventsToRange('political_events.epol06_ia_threshold_shift',
      TunablesStore.resolveFloat('political_events.epol06_ia_threshold_shift', 'POLITICAL_EVENTS_EPOL06_IA_THRESHOLD_SHIFT', -0.15));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-07 — Zoning relaxation / Stack lots (gdd/14 :3559-3560; catalogue.md :120) — C8 substrate consumer
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol07_stack_utilization_threshold_pct — Stack district utilization trigger threshold (pct). Default 80, range 70..90. */
  get epol07StackUtilizationThresholdPct(): number {
    return clampPoliticalEventsToRange('political_events.epol07_stack_utilization_threshold_pct',
      TunablesStore.resolveInt('political_events.epol07_stack_utilization_threshold_pct', 'POLITICAL_EVENTS_EPOL07_STACK_UTILIZATION_THRESHOLD_PCT', 80));
  },
  /** epol07_stack_utilization_window_days — sustained-utilization window before trigger (in-game days). Default 60, range 30..120. */
  get epol07StackUtilizationWindowDays(): number {
    return clampPoliticalEventsToRange('political_events.epol07_stack_utilization_window_days',
      TunablesStore.resolveInt('political_events.epol07_stack_utilization_window_days', 'POLITICAL_EVENTS_EPOL07_STACK_UTILIZATION_WINDOW_DAYS', 60));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-08 — Riverfront crackdown / checkpoint density (gdd/14 :3561-3562; catalogue.md :128-130) — C9 substrate consumer
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol08_riverfront_crackdown_duration_days — duration (in-game days). Default 21, range 7..45. */
  get epol08RiverfrontCrackdownDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol08_riverfront_crackdown_duration_days',
      TunablesStore.resolveInt('political_events.epol08_riverfront_crackdown_duration_days', 'POLITICAL_EVENTS_EPOL08_RIVERFRONT_CRACKDOWN_DURATION_DAYS', 21));
  },
  /**
   * epol08_inspection_density_multiplier — bridge/ferry checkpoint inspection_density ×1.6 (DISTRICT scope, C9
   * substrate — the multiplier applied on top of the `checkpoint_inspection_density_default` BASE key,
   * inspection-tunables.ts). Default 1.6, range 1.3..2.0.
   */
  get epol08InspectionDensityMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol08_inspection_density_multiplier',
      TunablesStore.resolveFloat('political_events.epol08_inspection_density_multiplier', 'POLITICAL_EVENTS_EPOL08_INSPECTION_DENSITY_MULTIPLIER', 1.6));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-09 — City Hall scandal / audit-pin half-life (gdd/14 :3563-3565; catalogue.md :137-142) — C6 substrate consumer
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol09_scandal_duration_days — duration (in-game days). Default 14, range 7..30. */
  get epol09ScandalDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol09_scandal_duration_days',
      TunablesStore.resolveInt('political_events.epol09_scandal_duration_days', 'POLITICAL_EVENTS_EPOL09_SCANDAL_DURATION_DAYS', 14));
  },
  /**
   * epol09_audit_pin_half_life_multiplier — `forensic.audit_pin_half_life_days` BASE ×0.6 (faster decay, C6
   * substrate — the multiplier applied on top of the BASE key, unconformity-tunables.ts). Default 0.6, range 0.4..0.85.
   */
  get epol09AuditPinHalfLifeMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol09_audit_pin_half_life_multiplier',
      TunablesStore.resolveFloat('political_events.epol09_audit_pin_half_life_multiplier', 'POLITICAL_EVENTS_EPOL09_AUDIT_PIN_HALF_LIFE_MULTIPLIER', 0.6));
  },
  /**
   * epol09_audit_pin_emergence_multiplier — `forensic.audit_pin_emergence_rate` BASE ×1.4 (more pins, C6
   * substrate). Default 1.4, range 1.1..2.0.
   */
  get epol09AuditPinEmergenceMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol09_audit_pin_emergence_multiplier',
      TunablesStore.resolveFloat('political_events.epol09_audit_pin_emergence_multiplier', 'POLITICAL_EVENTS_EPOL09_AUDIT_PIN_EMERGENCE_MULTIPLIER', 1.4));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-10 — Reform package / counter-play + opposition (gdd/14 :3566-3567,3572; catalogue.md :150-153)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol10_counter_play_cost_multiplier — politician counter-play action cost ×0.7 (-30%). Default 0.7, range 0.5..0.9. */
  get epol10CounterPlayCostMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol10_counter_play_cost_multiplier',
      TunablesStore.resolveFloat('political_events.epol10_counter_play_cost_multiplier', 'POLITICAL_EVENTS_EPOL10_COUNTER_PLAY_COST_MULTIPLIER', 0.7));
  },
  /** epol10_lawyer_tier3_cost_multiplier — Lawyer Tier 3 cost ×1.2 (+20%). Default 1.2, range 1.05..1.4. */
  get epol10LawyerTier3CostMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol10_lawyer_tier3_cost_multiplier',
      TunablesStore.resolveFloat('political_events.epol10_lawyer_tier3_cost_multiplier', 'POLITICAL_EVENTS_EPOL10_LAWYER_TIER3_COST_MULTIPLIER', 1.2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-11 — Federal task force (gdd/14 :3568-3569; catalogue.md :160-161) — C7 substrate consumer
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol11_federal_task_force_duration_days — duration (in-game days). Default 90, range 45..180. */
  get epol11FederalTaskForceDurationDays(): number {
    return clampPoliticalEventsToRange('political_events.epol11_federal_task_force_duration_days',
      TunablesStore.resolveInt('political_events.epol11_federal_task_force_duration_days', 'POLITICAL_EVENTS_EPOL11_FEDERAL_TASK_FORCE_DURATION_DAYS', 90));
  },
  /**
   * epol11_bpd_memory_aggregate_trigger — citywide BPD memory aggregate trigger. COMPOSITE bucket (R2.2 — never
   * a raw scalar), `[PROV-Y26Q2]`. Default `'composite:aggregate_high'`. NO numeric cap (excluded from
   * POLITICAL_EVENTS_TUNABLE_CAPS — string key, meta-market precedent).
   */
  get epol11BpdMemoryAggregateTrigger(): string {
    return TunablesStore.resolveString('political_events.epol11_bpd_memory_aggregate_trigger', 'POLITICAL_EVENTS_EPOL11_BPD_MEMORY_AGGREGATE_TRIGGER', 'composite:aggregate_high');
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-12 — District good-behavior / cohesion recovery (gdd/14 :3570-3571; catalogue.md :172-173, DISTRICT scope D2 exemplar)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** epol12_mis_inspection_multiplier — in-district MIS inspection ×0.6 (-40%). Default 0.6, range 0.4..0.8. */
  get epol12MisInspectionMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol12_mis_inspection_multiplier',
      TunablesStore.resolveFloat('political_events.epol12_mis_inspection_multiplier', 'POLITICAL_EVENTS_EPOL12_MIS_INSPECTION_MULTIPLIER', 0.6));
  },
  /** epol12_cohesion_recovery_multiplier — cohesion recovery_rate_per_day ×1.5 (DISTRICT scope). Default 1.5, range 1.2..2.0. */
  get epol12CohesionRecoveryMultiplier(): number {
    return clampPoliticalEventsToRange('political_events.epol12_cohesion_recovery_multiplier',
      TunablesStore.resolveFloat('political_events.epol12_cohesion_recovery_multiplier', 'POLITICAL_EVENTS_EPOL12_COHESION_RECOVERY_MULTIPLIER', 1.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Reform package — opposition victory (gdd/14 :3572; catalogue.md :150, E-POL-10 sub-mechanic)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** opposition_victory_probability_base — E-POL-10 opposition victory base probability (weighted by city heat, A2). Default 0.35, range 0.20..0.55. */
  get oppositionVictoryProbabilityBase(): number {
    return clampPoliticalEventsToRange('political_events.opposition_victory_probability_base',
      TunablesStore.resolveFloat('political_events.opposition_victory_probability_base', 'POLITICAL_EVENTS_OPPOSITION_VICTORY_PROBABILITY_BASE', 0.35));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW C1 keys — the 3 catalogue keys missing from the ch16 backport (plan §12 / design §12)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * budget_cycle_in_game_months — E-POL-02/03 quarterly trigger period (in-game months). Canon
   * `political_event_catalogue.md:71,82` ("Quarterly (variable, `political_events.budget_cycle_in_game_months`)"),
   * §Tunables NOUVEAUX :252. Default 3, range 1..6. MISSING from the ch16 backport pass (gdd/14 :3574 note) —
   * ADDED at C1.
   */
  get budgetCycleInGameMonths(): number {
    return clampPoliticalEventsToRange('political_events.budget_cycle_in_game_months',
      TunablesStore.resolveInt('political_events.budget_cycle_in_game_months', 'POLITICAL_EVENTS_BUDGET_CYCLE_IN_GAME_MONTHS', 3));
  },
  /**
   * scandal_random_weight_per_event_noise — E-POL-04 random-trigger weighting (recent substance demand spike
   * noise). Canon `political_event_catalogue.md:93`, §Tunables NOUVEAUX :253. Default 0.05, range 0.02..0.15.
   * MISSING from the ch16 backport pass — ADDED at C1.
   */
  get scandalRandomWeightPerEventNoise(): number {
    return clampPoliticalEventsToRange('political_events.scandal_random_weight_per_event_noise',
      TunablesStore.resolveFloat('political_events.scandal_random_weight_per_event_noise', 'POLITICAL_EVENTS_SCANDAL_RANDOM_WEIGHT_PER_EVENT_NOISE', 0.05));
  },
  /**
   * overlap_max_active — max simultaneous active political events. Canon `political_event_catalogue.md:47`
   * ("Max 3 simultaneous active"), §Tunables NOUVEAUX :255. Default 3, range 1..5. MISSING from the ch16 backport
   * pass — ADDED at C1. SUPERSEDES the legacy no-dot `political_event_overlap_max_active` (gdd/14 :1177,
   * annotated superseded there — see file header "LEGACY RECONCILE"). A2's calendar tick (§5.2) reads THIS getter,
   * never the legacy key.
   */
  get overlapMaxActive(): number {
    return clampPoliticalEventsToRange('political_events.overlap_max_active',
      TunablesStore.resolveInt('political_events.overlap_max_active', 'POLITICAL_EVENTS_OVERLAP_MAX_ACTIVE', 3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW `[PROV-Y26Q2]` engine derivation — the in-game calendar MONTH boundary (design §5.1)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * month_minutes — the in-game MONTH boundary width, in game-minutes. `[PROV-Y26Q2]` (design §5.1): no calendar/
   * month/date service exists pre-04e; this is the NEW derivation `30 × clock.in_game_day_length_minutes`
   * (30 × 1440 = 43200 at the default day length). A2's calendar arithmetic derives `monthIndex =
   * floor(gameMinute / month_minutes)`; electoral/budget cycle triggers compare `monthIndex` against
   * `electoral_cycle_in_game_months` / `budget_cycle_in_game_months`. Default 43200 (30 days), range
   * 20160..64800 (14..45 days) — kept a plain registry scalar (not re-derived from `citysim-tunables.ts` at
   * read-time) so a DB override can recalibrate the month length independently of the day length for testing/
   * live-ops, without perturbing the day-length tunable other systems depend on.
   */
  get monthMinutes(): number {
    return clampPoliticalEventsToRange('political_events.month_minutes',
      TunablesStore.resolveInt('political_events.month_minutes', 'POLITICAL_EVENTS_MONTH_MINUTES', 43200));
  },
};

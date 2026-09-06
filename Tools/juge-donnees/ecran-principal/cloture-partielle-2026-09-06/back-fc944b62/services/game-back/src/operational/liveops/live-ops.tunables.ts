// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C1 (29 NEW liveops.* getters, registry-first)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md §Tunables référencés
//             (29 NEW `:241-273`, 8 REUSE substrate `:275-286`) + gdd/04e_political_events_and_liveops.md §2.6.
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §"Live-ops catalogue" (23 keys
//             backported ch16, 2026-06-02) + "Note 04e-B C1 (2026-07-06)" (the 6 keys this chunk ADDS, SAME
//             commit — R2.3 registry-FIRST).
//             Pattern: mirrors services/game-back/src/operational/effect_engine/effect-engine.tunables.ts (CAPS
//             map + clamp function; the "34 keys, mostly pre-registered by ch16" precedent) — the closest
//             same-shape precedent: MOST of these 29 keys were ALSO already gdd/14 registry rows (23/29, ch16
//             backport, 2026-06-02) before any code existed to consume them; this file is the FIRST code to read
//             them (no earlier live-ops chunk built a getter) — unlike political.tunables.ts's split (A1 built
//             one getter file, A2 added a second), there is only ONE getter file here (C1 is the only tunables
//             chunk in scope of `operational/liveops/`).
//             — 04e-B C1 — 2026-07-06
//             — 04e-B C7 — 2026-07-06 (★ `liveOpsBoPushTunables.pushDailyCapPerPlayer` ADDED — REUSE of
//             the PRE-EXISTING `T.bo.push.daily_cap_per_player` gdd/14 row, ch12 2026-05-29; this chunk is
//             its FIRST code reader, decisions.md §2.4 DD-B5. NOT one of the 29 NEW `liveops.*` keys below
//             — a separate BO-owned namespace, kept in its own small export.)
//             — 04e-C C1 — 2026-07-09 (★ `liveOpsBoComposerTunables.{eventDurationCapDays,
//             estimatedAffectedRefreshSec}` ADDED — REUSE of the PRE-EXISTING `T.bo.liveops.*` gdd/14 rows
//             (`§Backoffice — Live ops & Push`, ch12 `liveops_events_and_push.md §11`, registered
//             2026-06-01); this chunk is their FIRST code reader (0 code hits before this chunk, R2.3
//             registry-first, plan §C1). NOT part of the 29 NEW `liveops.*` keys above, nor of
//             `liveOpsBoPushTunables` (distinct `T.bo.liveops.*` Event-Composer namespace, distinct from
//             `T.bo.push.*`) — kept in its OWN small export, mirroring the `liveOpsBoPushTunables`
//             precedent exactly. `T.bo.twoperson.mass_cohort_threshold` (also gdd/14-registered, chunk 2
//             §9) is STILL MISSING a getter anywhere in the codebase — deferred to C4 (plan §C1/§C4), NOT
//             added here.)
//             — 04e-C C4 — 2026-07-09 (★ `liveOpsBoTwoPersonTunables.massCohortThreshold` ADDED — REUSE
//             of the PRE-EXISTING `T.bo.twoperson.mass_cohort_threshold` gdd/14 row (chunk 2 §9); this
//             chunk is its FIRST code reader, R2.3 registry-first. Drives the D2 informational
//             `two_person_required` response marker on `live-ops-admin.controller.ts`'s `schedule`/
//             `deactivate-early`/`push/send` — NEVER an enforced block, TD-107.)
//
// `live-ops.tunables.ts` — registry-mirrored getters for ALL 29 NEW `liveops.*` tunable keys the 10-event launch
// catalogue needs (durations/multipliers/thresholds/cadence-caps + the 1 composite bucket-tag). R2.3 (NO inline
// numeric balance/config): every default below is verbatim from gdd/14 §"Live-ops catalogue" (the single source
// of truth). If a registry value changes, update gdd/14 + this file in the SAME commit (R9.3).
//
// Keys shipped at C1 (29 total):
//   23 keys ALREADY present pre-C1 (backported ch16, gdd/14 — 9 `*_duration_real_days` + 12 `*_multiplier` + 2
//     `compression_prep_*`) — this chunk is their FIRST real TS consumer.
//   6 NEW keys ADDED at C1 (gdd/14 "Note 04e-B C1", SAME commit): `max_active_simultaneous`,
//     `max_high_impact_per_week`, `notification_cooldown_hours`, `elo06_aggression_threshold_violent_ops_count`,
//     `elo06_aggression_threshold_window_days`, `aggression_score_bucket_thresholds` (composite string, mirrors
//     `politicalEventsTunables.epol11BpdMemoryAggregateTrigger`'s treatment — no numeric CAPS entry).
//
// CAPS: only numeric scalar keys (no cap for the 1 composite string key `aggression_score_bucket_thresholds`,
//   mirrors `POLITICAL_EVENTS_TUNABLE_CAPS`'s own exclusion of `epol11_bpd_memory_aggregate_trigger`).
//   28 numeric keys appear in LIVE_OPS_TUNABLE_CAPS.
//
// REUSE — the 8 A1 substrate getters the 10-event catalogue's `effects[]` target (`live-ops-event-catalogue.ts`)
// are NEVER re-registered here (R2.3 anti-duplication) — they are consumed by IMPORTING the REAL getter from its
// OWNING module, exactly as `political-event-catalogue.ts` does:
//   `T.city.raid_target_temperature`         — citysim/police_memory/police-memory-tunables.ts:128 (scoped)
//   `T.city.inspection_queue_cap`             — citysim/inspection/inspection-tunables.ts:72 (scoped)
//   `T.city.cohesion_recovery_rate_per_day`   — citysim/cohesion/cohesion-tunables.ts:85 (scoped)
//   `forensic.audit_pin_half_life_days`       — citysim/unconformity/unconformity-tunables.ts:131
//   `forensic.audit_pin_emergence_rate`       — citysim/unconformity/unconformity-tunables.ts:148
//   `laundering.front_shop_legit_baseline_cents` — operational/laundering/laundering-tunables.ts:92 (GLOBAL-only)
//   `market.lane_c_lo`                        — operational/market/market-tunables.ts:77
// (7 physical getters cited by design §12 as "the LiveOpsEventEffect targets that ARE live today"; the canon
// tech-doc's own "REUSE" table (`liveops_event_catalogue.md:275-286`) additionally cites `clock.day_phase_*` +
// `city.tick_duration_minutes` (scheduler substrate, C4's real-clock reconciler concern, not an effect target —
// isolated behind `LiveOpsClockPort` instead, DD-B3) and `core_loops.compression_*` (E-LO-09's trigger-predicate
// substrate — grepped, confirmed ABSENT from the codebase today, ch05 Compression Week is doc-only; E-LO-09 has
// NO effects regardless, canon "no state change" — so this gap does not block C1). 7 + 1 (clock, cited not
// wrapped) = 8 canon rows; `rival.retaliation_aggressiveness_multiplier` (the canon REUSE table's 8th
// effect-shaped row) was grepped and confirmed NOT to exist anywhere in the codebase (E-LO-06 — routed
// honest-TD in the catalogue, D2/C3 territory, not fabricated here).
//
// Consumption timeline (honest — no resolved-but-unused pretense): every duration/multiplier getter below IS
// referenced by `live-ops-event-catalogue.ts` (either as a `durationRealDaysGetter` or an
// `effects[].magnitudeGetter`) EXCEPT the 8 multipliers whose target lever the C3 audit (`live-ops-lever-
// audit.ts`) TD'd — no real base getter/producer exists, or a real getter cannot be honestly scoped to the
// canon effect (`elo03_coil_lek_contest_rate_multiplier`, `elo03_coil_regime_pressure_multiplier`,
// `elo04_substance_demand_shift_multiplier`, `elo05_glass_laundering_yield_multiplier`,
// `elo05_glass_audit_pin_half_life_multiplier` — ★ C3: E-LO-05's audit-pin sub-effect was REMOVED from
// `effects[]` at C3, downgrading E-LO-05 from C1's "partially wired" to fully TD (Tier-3+ targeting cannot be
// honored by the GLOBAL-only `pinHalfLifeDays` getter without a production-service change — see
// `live-ops-lever-audit.ts` TD-LO-05-audit-pin-tier-scope), `elo06_retaliation_aggressiveness_multiplier`,
// `elo08_saltline_pool_multiplier`, `elo08_saltline_recruitment_cost_multiplier`) — all 8 STAY registered
// (registry-first, R2.3) so a future chunk's wire-or-TD-reconsideration only ever reads a getter that already
// exists, exactly mirroring A1-C1's own "mirror all 34 now" discipline for political_events.*.

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `POLITICAL_EVENTS_TUNABLE_CAPS`'s shape). */
export interface LiveOpsTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `LIVE_OPS_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the gdd/14 Range column.
 * Used internally by every numeric getter below (defense-in-depth: the getter itself never returns an
 * out-of-bounds value even if a raw DB override was written out of range).
 */
export const LIVE_OPS_TUNABLE_CAPS: Record<string, LiveOpsTunableRange> = {
  // ── cadence + notification caps (6 keys, 3 REUSE-existing-row + 3 NEW C1) ──────────────────────
  'liveops.max_active_simultaneous':                          { min: 1,    max: 5    },
  'liveops.max_high_impact_per_week':                         { min: 1,    max: 3    },
  'liveops.notification_cooldown_hours':                      { min: 12,   max: 48   },
  'liveops.compression_prep_threshold':                       { min: 60,   max: 80   },
  'liveops.compression_prep_exit_threshold':                  { min: 75,   max: 95   },
  // ── E-LO-01 Citywide crackdown ──────────────────────────────────────────────────────────────────
  'liveops.elo01_crackdown_duration_real_days':               { min: 3,    max: 14   },
  'liveops.elo01_crackdown_bpd_multiplier':                   { min: 1.2,  max: 2.0  },
  'liveops.elo01_crackdown_mis_multiplier':                   { min: 1.2,  max: 1.8  },
  // ── E-LO-02 Tidewater dock strike ───────────────────────────────────────────────────────────────
  'liveops.elo02_dock_strike_duration_real_days':              { min: 2,    max: 10   },
  'liveops.elo02_dock_strike_baseline_multiplier':            { min: 0.4,  max: 0.85 },
  // ── E-LO-03 Coil aggressive expansion campaign ──────────────────────────────────────────────────
  'liveops.elo03_coil_campaign_duration_real_days':            { min: 7,    max: 30   },
  'liveops.elo03_coil_lek_contest_rate_multiplier':            { min: 1.2,  max: 2.0  },
  'liveops.elo03_coil_regime_pressure_multiplier':             { min: 0.5,  max: 0.9  },
  // ── E-LO-04 Substance market anomaly ────────────────────────────────────────────────────────────
  'liveops.elo04_market_anomaly_duration_real_days':           { min: 1,    max: 7    },
  'liveops.elo04_substance_demand_shift_multiplier':           { min: 1.15, max: 1.5  },
  // ── E-LO-05 Glass district investor day ─────────────────────────────────────────────────────────
  'liveops.elo05_glass_investor_day_duration_real_days':       { min: 2,    max: 10   },
  'liveops.elo05_glass_laundering_yield_multiplier':           { min: 1.05, max: 1.3  },
  'liveops.elo05_glass_audit_pin_half_life_multiplier':        { min: 0.5,  max: 0.85 },
  // ── E-LO-06 Rival counter-operation ─────────────────────────────────────────────────────────────
  'liveops.elo06_rival_counter_op_duration_real_days':         { min: 5,    max: 21   },
  'liveops.elo06_retaliation_aggressiveness_multiplier':       { min: 1.2,  max: 1.8  },
  'liveops.elo06_aggression_threshold_violent_ops_count':      { min: 2,    max: 8    },
  'liveops.elo06_aggression_threshold_window_days':            { min: 3,    max: 14   },
  // ── E-LO-07 Cohesion thaw alert ──────────────────────────────────────────────────────────────────
  'liveops.elo07_cohesion_thaw_duration_real_days':            { min: 2,    max: 10   },
  'liveops.elo07_cohesion_recovery_multiplier':                { min: 0.4,  max: 0.8  },
  // ── E-LO-08 Saltline labor surplus ──────────────────────────────────────────────────────────────
  'liveops.elo08_saltline_surplus_duration_real_days':         { min: 7,    max: 30   },
  'liveops.elo08_saltline_pool_multiplier':                    { min: 1.2,  max: 2.0  },
  'liveops.elo08_saltline_recruitment_cost_multiplier':        { min: 0.5,  max: 0.9  },
  // ── E-LO-10 Annual structural audit window ──────────────────────────────────────────────────────
  'liveops.elo10_structural_audit_duration_real_days':         { min: 3,    max: 14   },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors `clampPoliticalEventsToRange`). Used
 * internally by every numeric getter below. Returns the value unchanged if no range is registered for the key.
 */
export function clampLiveOpsTunableToRange(key: string, value: number): number {
  const range = LIVE_OPS_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all 29 NEW `liveops.*` tunable keys (C1). */
export const liveOpsTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Cadence + notification caps (gdd/04e §2.6 / §2.5)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** max_active_simultaneous — max live-ops events active at once (cadence rule, C5 consumer). Default 3, 1..5. */
  get maxActiveSimultaneous(): number {
    return clampLiveOpsTunableToRange('liveops.max_active_simultaneous',
      TunablesStore.resolveInt('liveops.max_active_simultaneous', 'LIVEOPS_MAX_ACTIVE_SIMULTANEOUS', 3));
  },

  /** max_high_impact_per_week — max 1 high-impact event (E-LO-01/04/06) per real-time week (C5 consumer). Default 1, 1..3. */
  get maxHighImpactPerWeek(): number {
    return clampLiveOpsTunableToRange('liveops.max_high_impact_per_week',
      TunablesStore.resolveInt('liveops.max_high_impact_per_week', 'LIVEOPS_MAX_HIGH_IMPACT_PER_WEEK', 1));
  },

  /** notification_cooldown_hours — per-player push cooldown, real-time hours (C7 consumer). Default 24, 12..48. */
  get notificationCooldownHours(): number {
    return clampLiveOpsTunableToRange('liveops.notification_cooldown_hours',
      TunablesStore.resolveInt('liveops.notification_cooldown_hours', 'LIVEOPS_NOTIFICATION_COOLDOWN_HOURS', 24));
  },

  /** compression_prep_threshold — E-LO-09 entry threshold (stress_accumulator ≥ this). Default 70, 60..80. */
  get compressionPrepThreshold(): number {
    return clampLiveOpsTunableToRange('liveops.compression_prep_threshold',
      TunablesStore.resolveInt('liveops.compression_prep_threshold', 'LIVEOPS_COMPRESSION_PREP_THRESHOLD', 70));
  },

  /** compression_prep_exit_threshold — E-LO-09 exit threshold (stress_accumulator ≥ this ends the prep window). Default 85, 75..95. */
  get compressionPrepExitThreshold(): number {
    return clampLiveOpsTunableToRange('liveops.compression_prep_exit_threshold',
      TunablesStore.resolveInt('liveops.compression_prep_exit_threshold', 'LIVEOPS_COMPRESSION_PREP_EXIT_THRESHOLD', 85));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-01 — Citywide crackdown
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo01CrackdownDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo01_crackdown_duration_real_days',
      TunablesStore.resolveInt('liveops.elo01_crackdown_duration_real_days', 'LIVEOPS_ELO01_CRACKDOWN_DURATION_REAL_DAYS', 7));
  },
  /** elo01_crackdown_bpd_multiplier — BPD `T.city.raid_target_temperature` × multiplier. Default 1.5, 1.2..2.0. */
  get elo01CrackdownBpdMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo01_crackdown_bpd_multiplier',
      TunablesStore.resolveFloat('liveops.elo01_crackdown_bpd_multiplier', 'LIVEOPS_ELO01_CRACKDOWN_BPD_MULTIPLIER', 1.5));
  },
  /** elo01_crackdown_mis_multiplier — MIS `T.city.inspection_queue_cap` × multiplier. Default 1.4, 1.2..1.8. */
  get elo01CrackdownMisMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo01_crackdown_mis_multiplier',
      TunablesStore.resolveFloat('liveops.elo01_crackdown_mis_multiplier', 'LIVEOPS_ELO01_CRACKDOWN_MIS_MULTIPLIER', 1.4));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-02 — Tidewater dock strike
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo02DockStrikeDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo02_dock_strike_duration_real_days',
      TunablesStore.resolveInt('liveops.elo02_dock_strike_duration_real_days', 'LIVEOPS_ELO02_DOCK_STRIKE_DURATION_REAL_DAYS', 5));
  },
  /** elo02_dock_strike_baseline_multiplier — `laundering.front_shop_legit_baseline_cents` × multiplier (-35%). Default 0.65, 0.4..0.85. */
  get elo02DockStrikeBaselineMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo02_dock_strike_baseline_multiplier',
      TunablesStore.resolveFloat('liveops.elo02_dock_strike_baseline_multiplier', 'LIVEOPS_ELO02_DOCK_STRIKE_BASELINE_MULTIPLIER', 0.65));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-03 — Coil aggressive expansion campaign (levers NOT WIRED — no real 04b rival getter, D2/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo03CoilCampaignDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo03_coil_campaign_duration_real_days',
      TunablesStore.resolveInt('liveops.elo03_coil_campaign_duration_real_days', 'LIVEOPS_ELO03_COIL_CAMPAIGN_DURATION_REAL_DAYS', 14));
  },
  /** elo03_coil_lek_contest_rate_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 1.5, 1.2..2.0. */
  get elo03CoilLekContestRateMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo03_coil_lek_contest_rate_multiplier',
      TunablesStore.resolveFloat('liveops.elo03_coil_lek_contest_rate_multiplier', 'LIVEOPS_ELO03_COIL_LEK_CONTEST_RATE_MULTIPLIER', 1.5));
  },
  /** elo03_coil_regime_pressure_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 0.7, 0.5..0.9. */
  get elo03CoilRegimePressureMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo03_coil_regime_pressure_multiplier',
      TunablesStore.resolveFloat('liveops.elo03_coil_regime_pressure_multiplier', 'LIVEOPS_ELO03_COIL_REGIME_PRESSURE_MULTIPLIER', 0.7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-04 — Substance market anomaly (lever NOT WIRED — market.lane_c_lo is a lane price, not
  // substance demand; a real substance-demand getter does not exist, D2/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo04MarketAnomalyDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo04_market_anomaly_duration_real_days',
      TunablesStore.resolveInt('liveops.elo04_market_anomaly_duration_real_days', 'LIVEOPS_ELO04_MARKET_ANOMALY_DURATION_REAL_DAYS', 3));
  },
  /** elo04_substance_demand_shift_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 1.3, 1.15..1.5. */
  get elo04SubstanceDemandShiftMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo04_substance_demand_shift_multiplier',
      TunablesStore.resolveFloat('liveops.elo04_substance_demand_shift_multiplier', 'LIVEOPS_ELO04_SUBSTANCE_DEMAND_SHIFT_MULTIPLIER', 1.3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-05 — Glass district investor day
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo05GlassInvestorDayDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo05_glass_investor_day_duration_real_days',
      TunablesStore.resolveInt('liveops.elo05_glass_investor_day_duration_real_days', 'LIVEOPS_ELO05_GLASS_INVESTOR_DAY_DURATION_REAL_DAYS', 5));
  },
  /** elo05_glass_laundering_yield_multiplier — registered (registry-first); NO real laundering-yield lever wired yet (C3 audits). Default 1.15, 1.05..1.3. */
  get elo05GlassLaunderingYieldMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo05_glass_laundering_yield_multiplier',
      TunablesStore.resolveFloat('liveops.elo05_glass_laundering_yield_multiplier', 'LIVEOPS_ELO05_GLASS_LAUNDERING_YIELD_MULTIPLIER', 1.15));
  },
  /** elo05_glass_audit_pin_half_life_multiplier — `forensic.audit_pin_half_life_days` × multiplier (shortened). Default 0.7, 0.5..0.85. */
  get elo05GlassAuditPinHalfLifeMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo05_glass_audit_pin_half_life_multiplier',
      TunablesStore.resolveFloat('liveops.elo05_glass_audit_pin_half_life_multiplier', 'LIVEOPS_ELO05_GLASS_AUDIT_PIN_HALF_LIFE_MULTIPLIER', 0.7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-06 — Rival counter-operation (retaliation lever NOT WIRED — no real 04b rival getter, D2/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo06RivalCounterOpDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo06_rival_counter_op_duration_real_days',
      TunablesStore.resolveInt('liveops.elo06_rival_counter_op_duration_real_days', 'LIVEOPS_ELO06_RIVAL_COUNTER_OP_DURATION_REAL_DAYS', 10));
  },
  /** elo06_retaliation_aggressiveness_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 1.4, 1.2..1.8. */
  get elo06RetaliationAggressivenessMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo06_retaliation_aggressiveness_multiplier',
      TunablesStore.resolveFloat('liveops.elo06_retaliation_aggressiveness_multiplier', 'LIVEOPS_ELO06_RETALIATION_AGGRESSIVENESS_MULTIPLIER', 1.4));
  },
  /** elo06_aggression_threshold_violent_ops_count — E-LO-06 targeting predicate count half ("4+ violent ops"). C6 consumer. Default 4, 2..8. */
  get elo06AggressionThresholdViolentOpsCount(): number {
    return clampLiveOpsTunableToRange('liveops.elo06_aggression_threshold_violent_ops_count',
      TunablesStore.resolveInt('liveops.elo06_aggression_threshold_violent_ops_count', 'LIVEOPS_ELO06_AGGRESSION_THRESHOLD_VIOLENT_OPS_COUNT', 4));
  },
  /** elo06_aggression_threshold_window_days — E-LO-06 targeting predicate window half ("in 7 days"). C6 consumer. Default 7, 3..14. */
  get elo06AggressionThresholdWindowDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo06_aggression_threshold_window_days',
      TunablesStore.resolveInt('liveops.elo06_aggression_threshold_window_days', 'LIVEOPS_ELO06_AGGRESSION_THRESHOLD_WINDOW_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-07 — Cohesion thaw alert (city-wide)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo07CohesionThawDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo07_cohesion_thaw_duration_real_days',
      TunablesStore.resolveInt('liveops.elo07_cohesion_thaw_duration_real_days', 'LIVEOPS_ELO07_COHESION_THAW_DURATION_REAL_DAYS', 5));
  },
  /** elo07_cohesion_recovery_multiplier — `T.city.cohesion_recovery_rate_per_day` × multiplier (-40%). Default 0.6, 0.4..0.8. */
  get elo07CohesionRecoveryMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo07_cohesion_recovery_multiplier',
      TunablesStore.resolveFloat('liveops.elo07_cohesion_recovery_multiplier', 'LIVEOPS_ELO07_COHESION_RECOVERY_MULTIPLIER', 0.6));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-08 — Saltline labor surplus (levers NOT WIRED — no real Saltline pool / recruitment-cost getter, D2/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo08SaltlineSurplusDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo08_saltline_surplus_duration_real_days',
      TunablesStore.resolveInt('liveops.elo08_saltline_surplus_duration_real_days', 'LIVEOPS_ELO08_SALTLINE_SURPLUS_DURATION_REAL_DAYS', 14));
  },
  /** elo08_saltline_pool_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 1.4, 1.2..2.0. */
  get elo08SaltlinePoolMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo08_saltline_pool_multiplier',
      TunablesStore.resolveFloat('liveops.elo08_saltline_pool_multiplier', 'LIVEOPS_ELO08_SALTLINE_POOL_MULTIPLIER', 1.4));
  },
  /** elo08_saltline_recruitment_cost_multiplier — registered (registry-first); NO real lever wired yet (C3 audits). Default 0.75, 0.5..0.9. */
  get elo08SaltlineRecruitmentCostMultiplier(): number {
    return clampLiveOpsTunableToRange('liveops.elo08_saltline_recruitment_cost_multiplier',
      TunablesStore.resolveFloat('liveops.elo08_saltline_recruitment_cost_multiplier', 'LIVEOPS_ELO08_SALTLINE_RECRUITMENT_COST_MULTIPLIER', 0.75));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-10 — Annual structural audit window (grant NOT a lever — honest-scaffolding/TD, D2/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  get elo10StructuralAuditDurationRealDays(): number {
    return clampLiveOpsTunableToRange('liveops.elo10_structural_audit_duration_real_days',
      TunablesStore.resolveInt('liveops.elo10_structural_audit_duration_real_days', 'LIVEOPS_ELO10_STRUCTURAL_AUDIT_DURATION_REAL_DAYS', 7));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-LO-06 composite (D6) — the 1 non-numeric key, mirrors epol11BpdMemoryAggregateTrigger's treatment
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * aggression_score_bucket_thresholds — the `AggressionScoreBucket` (`peaceful|active|aggressive|violent_spree`)
   * bucket-boundary COMPOSITE tag (R2.2 — never a raw scalar). String getter (no numeric CAPS entry — mirrors
   * `politicalEventsTunables.epol11BpdMemoryAggregateTrigger`). C1 registers the key; the actual bucket-boundary
   * RESOLUTION (composite string → concrete boundaries) is a C6 `AggressionScoreBucketService` consumer, exactly
   * as `resolveBpdAggregateTriggerRank` consumes `epol11BpdMemoryAggregateTrigger` at A2. Default
   * `'composite:scaled'` (gdd/14, canon `liveops_event_catalogue.md:273`).
   */
  get aggressionScoreBucketThresholds(): string {
    return TunablesStore.resolveString('liveops.aggression_score_bucket_thresholds', 'LIVEOPS_AGGRESSION_SCORE_BUCKET_THRESHOLDS', 'composite:scaled');
  },
};

// ══════════════════════════════════════════════════════════════════════════════════════════════
// C7 — REUSE T.bo.push.* (BO-owned namespace, NOT one of the 29 NEW liveops.* keys above)
// ══════════════════════════════════════════════════════════════════════════════════════════════
//
// `T.bo.push.daily_cap_per_player` is a PRE-EXISTING gdd/14 registry row (`§"Backoffice — Live ops &
// Push"`, registered by ch12 `liveops_events_and_push.md §11`, 2026-05-29) — default 2, range 1..10,
// "used_by : <PushComposer> + bo.liveops.push.send" (the 04e-C composer's forward reference, not yet
// built). `LiveOpsNotificationService.sendNotifications` (C7, this chunk) is the FIRST code anywhere to
// actually READ this key (0 code hits before this chunk, DD-B5 §2.4) — R2.3 registry-first: the row
// already exists, so this is REUSE, not a 30th NEW `liveops.*` key. Kept in its OWN small export (not
// merged into `liveOpsTunables` above) so that object's "29 NEW liveops.* getters" framing stays
// accurate. Canon note: "BO décide le cap journalier, 04e décide le cooldown" (`liveops_events_and_push.md
// :346`) — this cap is DISTINCT from (and never a second source of truth for) `liveOpsTunables.
// notificationCooldownHours` above.
export const LIVE_OPS_BO_PUSH_TUNABLE_CAPS: Record<string, LiveOpsTunableRange> = {
  'T.bo.push.daily_cap_per_player': { min: 1, max: 10 },
};

/** REUSE `T.bo.push.*` getters (BO-owned namespace) `LiveOpsNotificationService` reads directly. */
export const liveOpsBoPushTunables = {
  /**
   * `T.bo.push.daily_cap_per_player` — BO-owned per-player daily push cap (C7 `sendNotifications` gate).
   * Default 2, range 1..10 (gdd/14 §"Backoffice — Live ops & Push", ch12 2026-05-29 — REUSE; C7 is the
   * first code reader). "Daily" is realized as a ROLLING 24h window from `LiveOpsClockPort.now()`
   * (mirrors `LiveOpsCadenceController`'s own rolling-7-real-day-week convention for its rule (b) — no
   * calendar-day/timezone-boundary ambiguity). Applies REGARDLESS of consent class (SERVICE + MARKETING
   * share the SAME per-player daily budget — canon "cap journalier per-player", not per-class).
   */
  get pushDailyCapPerPlayer(): number {
    const range = LIVE_OPS_BO_PUSH_TUNABLE_CAPS['T.bo.push.daily_cap_per_player']!;
    const raw = TunablesStore.resolveInt('T.bo.push.daily_cap_per_player', 'BO_PUSH_DAILY_CAP_PER_PLAYER', 2);
    return Math.min(range.max, Math.max(range.min, raw));
  },
};

// ══════════════════════════════════════════════════════════════════════════════════════════════
// 04e-C C1 — REUSE T.bo.liveops.* (Event Composer, BO-owned namespace — mirrors T.bo.push.* above)
// ══════════════════════════════════════════════════════════════════════════════════════════════
//
// `T.bo.liveops.event_duration_cap_days` + `T.bo.liveops.estimated_affected_refresh_sec` are
// PRE-EXISTING gdd/14 registry rows (`§Backoffice — Live ops & Push`, ch12
// `liveops_events_and_push.md §11`, registered 2026-06-01) — this chunk (04e-C C1) is the FIRST code
// anywhere to actually READ them (0 code hits before this chunk, R2.3 registry-first). Kept in their
// OWN small export (not merged into `liveOpsTunables` above, and not into `liveOpsBoPushTunables`
// either — a distinct `T.bo.liveops.*` Event-Composer namespace) so the "29 NEW liveops.*" / "T.bo.push.*"
// framings above both stay accurate. `T.bo.twoperson.mass_cohort_threshold` (also gdd/14-registered,
// chunk 2 §9) had NO getter anywhere in the codebase as of C1 — ADDED below (C4, `liveOpsBoTwoPersonTunables`).
export const LIVE_OPS_BO_COMPOSER_TUNABLE_CAPS: Record<string, LiveOpsTunableRange> = {
  'T.bo.liveops.event_duration_cap_days': { min: 1, max: 90 },
  'T.bo.liveops.estimated_affected_refresh_sec': { min: 1, max: 30 },
};

/** REUSE `T.bo.liveops.*` getters (BO-owned Event-Composer namespace) `<EventComposer>` reads (C2+). */
export const liveOpsBoComposerTunables = {
  /**
   * `T.bo.liveops.event_duration_cap_days` — the `<EventComposer>` Duration field's server+client
   * validation ceiling (gdd/14 §"Backoffice — Live ops & Push", ch12 2026-06-01 — REUSE; C1 is the
   * first code reader). Default 30, range 1..90.
   */
  get eventDurationCapDays(): number {
    const range = LIVE_OPS_BO_COMPOSER_TUNABLE_CAPS['T.bo.liveops.event_duration_cap_days']!;
    const raw = TunablesStore.resolveInt('T.bo.liveops.event_duration_cap_days', 'BO_LIVEOPS_EVENT_DURATION_CAP_DAYS', 30);
    return Math.min(range.max, Math.max(range.min, raw));
  },

  /**
   * `T.bo.liveops.estimated_affected_refresh_sec` — the `<EventComposer>` estimated-affected-count
   * recompute debounce (gdd/14 §"Backoffice — Live ops & Push", ch12 2026-06-01 — REUSE; C1 is the
   * first code reader). Default 3, range 1..30.
   */
  get estimatedAffectedRefreshSec(): number {
    const range = LIVE_OPS_BO_COMPOSER_TUNABLE_CAPS['T.bo.liveops.estimated_affected_refresh_sec']!;
    const raw = TunablesStore.resolveInt('T.bo.liveops.estimated_affected_refresh_sec', 'BO_LIVEOPS_ESTIMATED_AFFECTED_REFRESH_SEC', 3);
    return Math.min(range.max, Math.max(range.min, raw));
  },
};

// ══════════════════════════════════════════════════════════════════════════════════════════════
// 04e-C C4 — REUSE T.bo.twoperson.* (D2 honest TD-107 join — informational mass-cohort marker)
// ══════════════════════════════════════════════════════════════════════════════════════════════
//
// `T.bo.twoperson.mass_cohort_threshold` is a PRE-EXISTING gdd/14 registry row (chunk 2 §9,
// `rbac_roles_and_permissions.md §4 + §9`, registered pre-04e; default 1000, range 100..100000) —
// REUSE (R2.3): this chunk (04e-C C4) is the FIRST code anywhere to actually READ it (0 code hits
// before this chunk, per the C1 header note above). D2 (decisions §4, ratified): the value drives an
// INFORMATIONAL `two_person_required` response marker on `live-ops-admin.controller.ts`'s
// `schedule`/`deactivate-early`/`push/send` — NEVER an enforced block (ch17 `TwoPersonApproval` does
// not exist, TD-107). Kept in its OWN small export (mirrors the `liveOpsBoPushTunables`/
// `liveOpsBoComposerTunables` precedent exactly) — a distinct `T.bo.twoperson.*` namespace, not
// merged into either.
export const LIVE_OPS_BO_TWO_PERSON_TUNABLE_CAPS: Record<string, LiveOpsTunableRange> = {
  'T.bo.twoperson.mass_cohort_threshold': { min: 100, max: 100000 },
};

/** REUSE `T.bo.twoperson.*` getters (BO-owned namespace) the composer's D2 informational marker reads. */
export const liveOpsBoTwoPersonTunables = {
  /**
   * `T.bo.twoperson.mass_cohort_threshold` — the informational `two_person_required` marker's boundary
   * (gdd/14 §"Backoffice — RBAC & Two-person", chunk 2 §9 — REUSE; 04e-C C4 is the first code reader).
   * Default 1000, range 100..100000. D2: crossing this boundary sets an ADVISORY flag on the
   * mutation's own response — it never blocks the mutation (TD-107, ch17 `TwoPersonApproval` absent).
   */
  get massCohortThreshold(): number {
    const range = LIVE_OPS_BO_TWO_PERSON_TUNABLE_CAPS['T.bo.twoperson.mass_cohort_threshold']!;
    const raw = TunablesStore.resolveInt('T.bo.twoperson.mass_cohort_threshold', 'BO_TWOPERSON_MASS_COHORT_THRESHOLD', 1000);
    return Math.min(range.max, Math.max(range.min, raw));
  },
};

/**
 * `LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS` — the CLOSED set of every REUSE A1 substrate key a `LiveOpsEventEffect.
 * tunableKey` (`live-ops-event-catalogue.ts`) is ALLOWED to target — mirrors `POLITICAL_VALID_EFFECT_TUNABLE_KEYS`
 * (political.tunables.ts). C1 populated 5 keys; ★ C3 (`live-ops-lever-audit.ts`) re-scoped 2 of them GLOBAL
 * (`T.city.inspection_queue_cap`, `laundering.front_shop_legit_baseline_cents` — were PLAYER-declared but
 * silently inert, see the catalogue's own header) and REMOVED E-LO-05's catalogue use of
 * `forensic.audit_pin_half_life_days` (downgraded to TD — its Tier-3+ targeting cannot be honestly honored by
 * this GLOBAL-only getter). The key STAYS in this set (a real, valid A1 substrate key regardless of whether
 * any CURRENT catalogue effect targets it — C3 extends this set, never shrinks it, per the file's own
 * convention) even though no `effects[]` entry currently resolves to it; a future chunk may re-wire E-LO-05
 * onto it if the underlying consumer gains scope-threading. 3 events (E-LO-01 ×2, E-LO-02, E-LO-07) currently
 * target these 4 keys — every OTHER canon-named lever (E-LO-03/04/05/06/08/10) has NO real base getter it can
 * honestly target today and is therefore left OUT of the catalogue's `effects[]` entirely (D2, honest — never
 * a fabricated key).
 *
 * This is the anti-fig-leaf resolve-check surface `liveops_catalogue.spec.ts` (C1 test floor) uses: every
 * catalogue effect's `tunableKey` MUST be a member of this set — a fabricated/dangling key fails the check even
 * though the entry's `magnitudeGetter` still compiles fine (mirrors political's own defense-in-depth rationale).
 */
export const LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS: ReadonlySet<string> = new Set<string>([
  'T.city.raid_target_temperature',             // police-memory-tunables.ts:128 (scoped) — E-LO-01
  'T.city.inspection_queue_cap',                // inspection-tunables.ts:72 (scoped) — E-LO-01 (C3: now GLOBAL)
  'laundering.front_shop_legit_baseline_cents', // laundering-tunables.ts:92 (GLOBAL-only) — E-LO-02 (C3: now GLOBAL)
  'forensic.audit_pin_half_life_days',          // unconformity-tunables.ts:131 — real A1 key; UNUSED by any
                                                 // current catalogue effect since C3 TD'd E-LO-05's use of it
  'T.city.cohesion_recovery_rate_per_day',      // cohesion-tunables.ts:85 (scoped) — E-LO-07
]);

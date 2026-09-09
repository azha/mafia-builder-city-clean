// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL — Phase-6 vector #6 slice-1
//             (the `T.lieutenant.max_count_per_player` registry key, NEW Phase-6 vector #6 T0, `[PROV-Y26Q2]`) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Roster panel
//             ("Compteur count / T.lieutenant.max_count_per_player") +
//             docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §7 (R2.3 — the roster cap)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// Lieutenant tunables (`T.lieutenant.*`) — the keys THIS slice's LieutenantService CONSUMES. Slice 1 is just the ROSTER
// CAP (`max_count_per_player` — the recruit action refuses once the player's lieutenant count reaches it). The BYTE-MIRROR
// of money-holding-tunables.ts / dsl-tunables.ts (the same env-override + registry-default shape): the value is read from
// an env override (test-only knob), else the gdd/14 §Lieutenants + DSL default.
//
// R2.3 (NO inline numeric balance/config): the default mirrors gdd/14 §Lieutenants + DSL (cited per key). If the registry
// value changes, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). `[PROV-Y26Q2]` (provisional —
// calibrate downstream). PURE: a static registry read, no DB / I/O / RNG.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved lieutenant tunables (`T.lieutenant.*`). All keys are gdd/14 §Lieutenants + DSL — Phase-6 vector #6 T0
 * (`[PROV-Y26Q2]`). R2.3 — NOT inline. Env overrides (`LIEUTENANT_*`, test-only) mirror the money-holding env-var
 * convention (`<NAMESPACE>_<KEY>` uppercased: `lieutenant.max_count_per_player` → `LIEUTENANT_MAX_COUNT_PER_PLAYER`).
 * DB-override > env > default (Phase-23).
 */
export const lieutenantTunables = {
  /**
   * lieutenant.max_count_per_player — the roster cap the recruit action enforces (count ≥ cap → 409). Default 5. Env
   * override: LIEUTENANT_MAX_COUNT_PER_PLAYER (test-only — lets the E2E reach the cap cheaply). Consumed by
   * LieutenantService.recruit (the at-cap guard). (DB-override > env > default — Phase-23).
   */
  get maxCountPerPlayer(): number {
    return TunablesStore.resolveInt('lieutenant.max_count_per_player', 'LIEUTENANT_MAX_COUNT_PER_PLAYER', 5);
  },
  /**
   * lieutenant.bookkeeper_wallet_reserve_cents — the cash floor the delegated BOOKKEEPER lieutenant KEEPS in the wallet
   * when it greedily auto-deposits clean cash into its money_holding (Phase-7 T3). Default 0 (sweep the whole wallet). Env
   * override: LIEUTENANT_BOOKKEEPER_WALLET_RESERVE_CENTS (test-only — lets the E2E set a non-zero reserve to prove the
   * floor is honored). Consumed by BookkeeperBindingService.applyExecuteDefault — the greedy deposit amount is
   * min(wallet_cents − THIS, capacityCentsForTier(tier) − held_cents). (DB-override > env > default — Phase-23).
   */
  get bookkeeperWalletReserveCents(): number {
    return TunablesStore.resolveInt('lieutenant.bookkeeper_wallet_reserve_cents', 'LIEUTENANT_BOOKKEEPER_WALLET_RESERVE_CENTS', 0);
  },
  /**
   * lieutenant.logistics_dispatch_cargo_grams — the cargo per-dispatch the delegated LOGISTICS lieutenant sends from its
   * source building to its target (Phase-7 T4). Default 200 (a foot-courier load). Env override:
   * LIEUTENANT_LOGISTICS_DISPATCH_CARGO_GRAMS (test-only — lets the E2E set a smaller/larger batch to prove the min vs the
   * source stock). Consumed by LogisticsBindingService.applyExecuteDefault — the dispatched cargo is
   * min(THIS, source available grams) on 'foot' (so it never dispatches more than the source holds; also a per-dispatch cap).
   * (DB-override > env > default — Phase-23).
   */
  get logisticsDispatchCargoGrams(): number {
    return TunablesStore.resolveInt('lieutenant.logistics_dispatch_cargo_grams', 'LIEUTENANT_LOGISTICS_DISPATCH_CARGO_GRAMS', 200);
  },
  /**
   * lieutenant.laundering_respect_baseline — the CONSERVATIVE-mode flag for the delegated LAUNDERING lieutenant (Phase-8
   * T1). When true (the default), each per-tick safehouse→Stage-1-node inject is additionally capped at the front-shop's
   * legitimate baseline (launderingTunables.frontShopLegitBaselineCents — REUSED, never redefined) so the lieutenant never
   * trips the System-7 audit pin by over-injecting; when false (aggressive), the cap is dropped (a > baseline inject
   * succeeds but is flagged a deviation). Default true. Env override: LIEUTENANT_LAUNDERING_RESPECT_BASELINE (a 0/1 int,
   * test-only — lets the E2E flip to aggressive to prove the cap is what holds the per-tick inject at the baseline).
   * Consumed by LaunderingBindingService.applyExecuteDefault — the amount = min(held, node-free-capacity, [baseline]).
   * (DB-override > env > default — Phase-23).
   */
  get launderingRespectBaseline(): boolean {
    return TunablesStore.resolveBool('lieutenant.laundering_respect_baseline', 'LIEUTENANT_LAUNDERING_RESPECT_BASELINE', true);
  },

  /**
   * lieutenant.cook_heat_high_band — the heat band the COOK binding uses to derive `state.heat_high` (Phase-12 T3). When
   * `buildingState.heat >= cookHeatHighBand`, the binding sets `state.heat_high = true` in the SignalSnapshot (a qualitative
   * band for Tier-2 MY_STATE conditions — NOT the raw scalar, R2.2-aligned). Default 0.5 (mirrors the slice-1 demo PAUSE
   * band). Env override: LIEUTENANT_COOK_HEAT_HIGH_BAND (test-only). Consumed by CookBindingService.buildSnapshot.
   * (DB-override > env > default — Phase-23).
   */
  get cookHeatHighBand(): number {
    return TunablesStore.resolveFloat('lieutenant.cook_heat_high_band', 'LIEUTENANT_COOK_HEAT_HIGH_BAND', 0.5);
  },

  /** PHASE-17 — the dealer float at/above which a DISTRIBUTION lieutenant with no collect rule raises a salient card
   *  (uncollected float). PROVISIONAL [PROV-Y26Q2] — calibrate downstream. In cents.
   *  Canonical key: lieutenant.distribution_float_salient_band (not yet consolidated in gdd/14; env var:
   *  LIEUTENANT_DISTRIBUTION_FLOAT_SALIENT_BAND). (DB-override > env > default — Phase-23). */
  get distributionFloatSalientBand(): number {
    return TunablesStore.resolveInt('lieutenant.distribution_float_salient_band', 'LIEUTENANT_DISTRIBUTION_FLOAT_SALIENT_BAND', 5000);
  },

  /**
   * lieutenant.tenure_inertia.* (Phase-11 — Idea #38). The tenure-inertia tunables the slice consumes, shaped EXACTLY as
   * the pure `tenure-inertia.ts` resolvers expect (so the call site passes these straight in — the module stays pure /
   * param-driven and imports no tunables). `[PROV-Y26Q2]`.
   *   - thresholds          → TenureInertiaThresholds for `bucketForStreak`.
   *   - reassignmentDisruptionCurve → ReassignmentDisruptionCurve for `disruptionTicks`.
   *   - efficiencyBonusCurve → EfficiencyBonusCurve for `yieldMultiplier` (BONUS_NONE = 1.0, canon Invariant 3).
   * Each value is env-overridable test-only (`LIEUTENANT_TENURE_INERTIA_*`) so a later E2E reaches each bucket / a short
   * settling window cheaply (mirror the max_count_per_player override). Consumed by the tick / reassign / projection
   * (A2/A4/A5) — A1 only materializes the registry values here. (DB-override > env > default — Phase-23).
   */
  tenureInertia: {
    /** Streak thresholds for `bucketForStreak` (TenureInertiaThresholds). Monotone acclimated < seasoned < senior < entrenched. */
    thresholds: {
      get acclimated(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.bucket_threshold_acclimated', 'LIEUTENANT_TENURE_INERTIA_BUCKET_THRESHOLD_ACCLIMATED', 3);
      },
      get seasoned(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.bucket_threshold_seasoned', 'LIEUTENANT_TENURE_INERTIA_BUCKET_THRESHOLD_SEASONED', 6);
      },
      get senior(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.bucket_threshold_senior', 'LIEUTENANT_TENURE_INERTIA_BUCKET_THRESHOLD_SENIOR', 9);
      },
      get entrenched(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.bucket_threshold_entrenched', 'LIEUTENANT_TENURE_INERTIA_BUCKET_THRESHOLD_ENTRENCHED', 12);
      },
    },
    /** DISRUPT_* → settling-window tick counts (ReassignmentDisruptionCurve) for `disruptionTicks`. */
    reassignmentDisruptionCurve: {
      get DISRUPT_SHORT(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.reassignment_disruption_curve.disrupt_short', 'LIEUTENANT_TENURE_INERTIA_DISRUPTION_SHORT_TICKS', 2);
      },
      get DISRUPT_MED(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.reassignment_disruption_curve.disrupt_med', 'LIEUTENANT_TENURE_INERTIA_DISRUPTION_MED_TICKS', 4);
      },
      get DISRUPT_LONG(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.reassignment_disruption_curve.disrupt_long', 'LIEUTENANT_TENURE_INERTIA_DISRUPTION_LONG_TICKS', 6);
      },
      get DISRUPT_MAX(): number {
        return TunablesStore.resolveInt('lieutenant.tenure_inertia.reassignment_disruption_curve.disrupt_max', 'LIEUTENANT_TENURE_INERTIA_DISRUPTION_MAX_TICKS', 8);
      },
    },
    /** BONUS_* → yield multipliers (EfficiencyBonusCurve) for `yieldMultiplier`. BONUS_NONE = 1.0 (canon Invariant 3). */
    efficiencyBonusCurve: {
      get BONUS_NONE(): number {
        return TunablesStore.resolveFloat('lieutenant.tenure_inertia.efficiency_bonus_curve.bonus_none', 'LIEUTENANT_TENURE_INERTIA_BONUS_NONE_MULT', 1.0);
      },
      get BONUS_LOW(): number {
        return TunablesStore.resolveFloat('lieutenant.tenure_inertia.efficiency_bonus_curve.bonus_low', 'LIEUTENANT_TENURE_INERTIA_BONUS_LOW_MULT', 1.05);
      },
      get BONUS_MID(): number {
        return TunablesStore.resolveFloat('lieutenant.tenure_inertia.efficiency_bonus_curve.bonus_mid', 'LIEUTENANT_TENURE_INERTIA_BONUS_MID_MULT', 1.1);
      },
      get BONUS_CAP(): number {
        return TunablesStore.resolveFloat('lieutenant.tenure_inertia.efficiency_bonus_curve.bonus_cap', 'LIEUTENANT_TENURE_INERTIA_BONUS_CAP_MULT', 1.2);
      },
    },
    /** decision_cooldown — ticks before the same lieutenant may be reassigned again (canon TenureInertiaDecision). (DB-override > env > default — Phase-23). */
    get decisionCooldown(): number {
      return TunablesStore.resolveInt('lieutenant.tenure_inertia.decision_cooldown', 'LIEUTENANT_TENURE_INERTIA_DECISION_COOLDOWN', 10);
    },
  },

  /**
   * lieutenant.autonomy_ceiling.* (Phase-19 — Idea #36). The autonomy-ceiling tunables the slice consumes, shaped as
   * `autonomy-category.ts` expects (capFor/seedBudget use `perArchetypeCap` / `globalDefaultCap` directly). All values are
   * env-overridable test-only (`LIEUTENANT_AUTONOMY_CEILING_*`) so a later E2E can probe boundary behaviour cheaply.
   * `[PROV-Y26Q2]`. (R9.3: gdd/14 §Lieutenants behavior — Autonomy Ceiling is the source of truth — same commit.)
   * (DB-override > env > default — Phase-23).
   */
  autonomyCeiling: {
    /** per_archetype_cap — ceiling for an archetype's PRIMARY category (high, specialised). Default 8. (DB-override > env > default — Phase-23). */
    get perArchetypeCap(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.per_archetype_cap', 'LIEUTENANT_AUTONOMY_CEILING_PER_ARCHETYPE_CAP', 8);
    },
    /** global_default_cap — fallback cap for cross-category (non-primary) entries. Default 4. (DB-override > env > default — Phase-23). */
    get globalDefaultCap(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.global_default_cap', 'LIEUTENANT_AUTONOMY_CEILING_GLOBAL_DEFAULT_CAP', 4);
    },
    /** refresh_window_ticks — tick cadence for autonomy counter regeneration. Default 30. (DB-override > env > default — Phase-23). */
    get refreshWindowTicks(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.refresh_window_ticks', 'LIEUTENANT_AUTONOMY_CEILING_REFRESH_WINDOW_TICKS', 30);
    },
    /** raise_cap_max — hard ceiling a player may raise to via raise_ceiling decision. Default 12. (DB-override > env > default — Phase-23). */
    get raiseCapMax(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.raise_cap_max', 'LIEUTENANT_AUTONOMY_CEILING_RAISE_CAP_MAX', 12);
    },
    /** decision_cooldown_ticks — ticks before the same (lieutenant, kind) decision may be re-applied (L1a keys on the
     *  decision kind only; the category is implicit per archetype, so it is not part of the cooldown key). Default 10.
     *  (DB-override > env > default — Phase-23). */
    get decisionCooldownTicks(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.decision_cooldown_ticks', 'LIEUTENANT_AUTONOMY_CEILING_DECISION_COOLDOWN_TICKS', 10);
    },
    /** report_issues_max — max report-issue actions queued before forced-default routing. Default 5. (DB-override > env > default — Phase-23). */
    get reportIssuesMax(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.report_issues_max', 'LIEUTENANT_AUTONOMY_CEILING_REPORT_ISSUES_MAX', 5);
    },
    /** backlog_cap_cycles — cycles a backlog entry may wait before forcing the default option. Default 3. (DB-override > env > default — Phase-23). */
    get backlogCapCycles(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.backlog_cap_cycles', 'LIEUTENANT_AUTONOMY_CEILING_BACKLOG_CAP_CYCLES', 3);
    },
    /** default_option — fallback option index (1-based) if no player decision resolves the backlog. Default 1. (DB-override > env > default — Phase-23). */
    get defaultOption(): number {
      return TunablesStore.resolveInt('lieutenant.autonomy_ceiling.default_option', 'LIEUTENANT_AUTONOMY_CEILING_DEFAULT_OPTION', 1);
    },
  },

  /**
   * lieutenant.signal_drift.* (Phase-22 L2a — Signal Drift). The signal-drift tunables the slice consumes, shaped as
   * `signal-drift-cues.ts` expects (bucketForRatio reads the reliability cuts directly; seedRegistry reads cuesTrackedMax
   * + cueGenerationStrategy; the service reads observationWindowTicks / primacyMarginMin / driftGraceTicks /
   * decisionCooldownTicks). All values are env-overridable test-only (`LIEUTENANT_SIGNAL_DRIFT_*`) so a later E2E can drive
   * a window slide / a primacy flip / a decision cooldown cheaply. `[PROV-Y26Q2]`. (R9.3: gdd/14 §Lieutenants behavior —
   * Signal Drift is the source of truth — same commit.) (DB-override > env > default — Phase-23).
   */
  signalDrift: {
    /** observation_window_ticks — the sliding-window span (ticks) over which a cue's hits/misses accumulate. Default 40. (DB-override > env > default — Phase-23). */
    get observationWindowTicks(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.observation_window_ticks', 'LIEUTENANT_SIGNAL_DRIFT_OBSERVATION_WINDOW_TICKS', 40);
    },
    /** cues_tracked_max — the cardinality of the SEEDED CueReliabilityRegistry (the 5 CueKindEnum members). Default 5. (DB-override > env > default — Phase-23). */
    get cuesTrackedMax(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.cues_tracked_max', 'LIEUTENANT_SIGNAL_DRIFT_CUES_TRACKED_MAX', 5);
    },
    /** primacy_margin_min — the bucket-rank gap DIRECT_ORDER must trail the best incidental by to lock incidental. Default 2. (DB-override > env > default — Phase-23). */
    get primacyMarginMin(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.primacy_margin_min', 'LIEUTENANT_SIGNAL_DRIFT_PRIMACY_MARGIN_MIN', 2);
    },
    /** drift_grace_ticks — the grace window (ticks) a drifting primacy must persist before a transition commits. Default 8. (DB-override > env > default — Phase-23). */
    get driftGraceTicks(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.drift_grace_ticks', 'LIEUTENANT_SIGNAL_DRIFT_DRIFT_GRACE_TICKS', 8);
    },
    /** decision_cooldown_ticks — ticks before the same (lieutenant, kind, target_cue) decision may be re-applied. Default 10. (DB-override > env > default — Phase-23). */
    get decisionCooldownTicks(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.decision_cooldown_ticks', 'LIEUTENANT_SIGNAL_DRIFT_DECISION_COOLDOWN_TICKS', 10);
    },
    /** reliability_cut_low — percent cut at/above which a cue classifies as `partial` (else `dormant`). Default 25. (DB-override > env > default — Phase-23). */
    get reliabilityCutLow(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.reliability_cut_low', 'LIEUTENANT_SIGNAL_DRIFT_RELIABILITY_CUT_LOW', 25);
    },
    /** reliability_cut_mid — percent cut at/above which a cue classifies as `reliable`. Default 50. (DB-override > env > default — Phase-23). */
    get reliabilityCutMid(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.reliability_cut_mid', 'LIEUTENANT_SIGNAL_DRIFT_RELIABILITY_CUT_MID', 50);
    },
    /** reliability_cut_high — percent cut at/above which a cue classifies as `dominant`. Default 75 (monotone low<mid<high). (DB-override > env > default — Phase-23). */
    get reliabilityCutHigh(): number {
      return TunablesStore.resolveInt('lieutenant.signal_drift.reliability_cut_high', 'LIEUTENANT_SIGNAL_DRIFT_RELIABILITY_CUT_HIGH', 75);
    },
    /** cue_generation_strategy — the initial registry seeding strategy. Default 'SEEDED' (5 cues, DIRECT_ORDER=reliable).
     *  Type: 'SEEDED' | 'OBSERVED' (CueRegistry.generation_strategy). Closed-domain guard: garbage degrades to the
     *  default member 'SEEDED' rather than propagating an unsafe cast. (DB-override > env > default — Phase-23). */
    get cueGenerationStrategy(): 'SEEDED' | 'OBSERVED' {
      // closed-domain guard — garbage degrades to the default member.
      const v = TunablesStore.resolveString('lieutenant.signal_drift.cue_generation_strategy', 'LIEUTENANT_SIGNAL_DRIFT_CUE_GENERATION_STRATEGY', 'SEEDED');
      return v === 'OBSERVED' ? 'OBSERVED' : 'SEEDED';
    },
  },

  /**
   * lieutenant.standing_order_expiry.* (Phase-25 L3 — Standing Order Expiry). The standing-order tunables the slice
   * consumes: `durationStandardTicks` sets the order TTL at emit (`expires_at = now + duration`), `expiresSoonWindowTicks`
   * is the lead-time band the lifecycle surfaces EXPIRES_SOON, `patternFlagThreshold` is the consecutive_lapse_count that
   * raises `promotion_suggested`, `decisionCooldownTicks` is the per-kind RENEW/REVOKE/PROMOTE cooldown, and
   * `standingOrderPriority` is the RESERVED injection priority the order's rule is re-stamped to so it deterministically
   * wins over every script rule. All values are env-overridable test-only (`LIEUTENANT_STANDING_ORDER_*`) so a later E2E
   * can drive an expiry / a lapse-pattern / a decision cooldown cheaply. `[PROV-Y26Q2]`. (R9.3: gdd/14 §Lieutenants
   * behavior — Standing Order Expiry is the source of truth — same commit.) (DB-override > env > default — Phase-23).
   */
  standingOrderExpiry: {
    /** duration_standard_ticks — the standard order TTL (ticks game-back) applied at emit (`expires_at = now + this`). Default 40. (DB-override > env > default — Phase-23). */
    get durationStandardTicks(): number {
      return TunablesStore.resolveInt('lieutenant.standing_order_expiry.duration_standard_ticks', 'LIEUTENANT_STANDING_ORDER_DURATION_STANDARD_TICKS', 40);
    },
    /** expires_soon_window_ticks — the lead-time (ticks) before expires_at within which the lifecycle surfaces the EXPIRES_SOON band. Default 8. (DB-override > env > default — Phase-23). */
    get expiresSoonWindowTicks(): number {
      return TunablesStore.resolveInt('lieutenant.standing_order_expiry.expires_soon_window_ticks', 'LIEUTENANT_STANDING_ORDER_EXPIRES_SOON_WINDOW_TICKS', 8);
    },
    /** pattern_flag_threshold — the consecutive_lapse_count (per signature) at/above which promotion_suggested flips true. Default 3. (DB-override > env > default — Phase-23). */
    get patternFlagThreshold(): number {
      return TunablesStore.resolveInt('lieutenant.standing_order_expiry.pattern_flag_threshold', 'LIEUTENANT_STANDING_ORDER_PATTERN_FLAG_THRESHOLD', 3);
    },
    /** decision_cooldown_ticks — ticks before the same (lieutenant, kind) RENEW/REVOKE/PROMOTE decision may be re-applied. Default 10. (DB-override > env > default — Phase-23). */
    get decisionCooldownTicks(): number {
      return TunablesStore.resolveInt('lieutenant.standing_order_expiry.decision_cooldown_ticks', 'LIEUTENANT_STANDING_ORDER_DECISION_COOLDOWN_TICKS', 10);
    },
    /** standing_order_priority — the RESERVED injection priority the order's rule is re-stamped to at the executor tick so
     *  it deterministically WINS over every script rule. MUST exceed `T.dsl.priority_max` (the upper @priority bound,
     *  default 100, range 100..1000 in gdd/14 §DSL) — a rule above priority_max can only originate from this reserved
     *  injection, never from a player-authored script (the compiler 422s @priority > priority_max). Default 1000. (DB-override > env > default — Phase-23). */
    get standingOrderPriority(): number {
      return TunablesStore.resolveInt('lieutenant.standing_order_expiry.standing_order_priority', 'LIEUTENANT_STANDING_ORDER_PRIORITY', 1000);
    },
  },
};

// IMPLEMENTS: docs/tech/04_city_simulation/system_5_cohesion_permafrost.md §Tunables — REUSE
//             (gdd/14 §City — Cohesion Permafrost, lines 121–127; NO NEW tunables — all 7 keys this system
//             consumes are EXISTING registry keys owned by System 5 / Cohesion Permafrost).
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// System 5 (Cohesion Permafrost) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Cohesion Permafrost` (lines 121–127). They are
// surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of
// truth (the registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the flow-cells/sparse-citizens/police-memory/patrol
// precedent): the resolved `cohesionTunables` object surfaces ONLY the 6 keys System 5's day-1 logic CONSUMES
// at runtime, ALL from §City — Cohesion Permafrost (gdd/14 L121–127). The 7th registry key in this section,
// `cohesion_thaw_threshold_baseline`, is documented below but NOT resolved (nothing consumes it — see the
// NOTE on the cohesionTunables object):
//   - `cohesion_thaw_threshold_baseline` (L121, 0.55) — initial per-district thaw threshold (before any ratchet).
//     This is the migrated `district_cohesion.thaw_threshold_baseline`/`thaw_threshold_current` COLUMN DEFAULT
//     (0.55 — R9.3: 09 owns the schema default). The seed leaves the column defaults and the service reads the
//     persisted column, so there is NO runtime key to resolve — surfacing one would be silently dead config
//     (a false expectation). It is recorded here (and in COHESION_TUNABLE_DEFAULTS) as the column default the
//     registry tracks, NOT a consumed runtime key (like the deferred crime-event magnitudes below).
//   - `cohesion_recovery_rate_per_day` (L122, 0.005) — passive daily recovery when no crime in the last 24h.
//   - `cohesion_hysteresis_step` (L123, 0.03) — irreversible per-thaw-event threshold decrement (Inv 3 ratchet).
//   - `informant_yield_exponent` (L124, 2.0) — exponent of the non-linear informant-yield power (Inv 5).
//   - `cohesion_delta_per_police_hour` (L125, −0.002) — SIGNED (negative) cohesion delta per patrol-hour observed
//     (police presence erodes cohesion). The registry value is negative; the Phase A delta ADDS it (so it lowers
//     cohesion). Range is `(unbounded — design)` per the registry note (a signed delta).
//   - `legitimate_service_effectiveness` (L126, +0.002/unit) — recovery per unit of `legitimate_services_invest`
//     (the player upkeep slider). The slider INPUT path (a player action) is NOT built in Phase 1, so the
//     migrated `district_cohesion.legitimate_services_invest` column stays at its default 0 → this term
//     contributes 0 day-1 (HONEST: the tunable IS consumed by the delta formula; the input that drives it is
//     deferred — the term is wired, the slider that feeds it is not).
//   - `permanent_marginal_threshold` (L127, 0.30) — threshold below which `permanent_marginal_flag` latches true
//     (Inv 4 one-way gate).
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069 / `T.db.city_state.district_count` L2103)
// is the district_cohesion row cardinality the lazy seed creates. It is surfaced here (the same count System 6's
// inspection queues will mirror) because System 5's seed CONSUMES it (one place per system — the precedent:
// System 3/4 mirror their own precinctCount).
//
// DEFERRED INPUT TERMS (NOT a tunable gap — the input EVENTS are not built in Phase 1, documented in the
// service header): crime events (player violent actions / expulsions / OD deaths / visible crime) carry the
// FIXED magnitudes in the spec §Update tick Phase A (−0.05/−0.10/−0.02/−0.003 etc.); those are NOT tunable
// registry keys (they are spec-fixed deltas) AND their source events are not produced in Phase 1, so they are
// deferred wholesale (no resolved-but-unused config — there is nothing to mirror for them).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore, type EffectScopeContext } from '../../config/effect-overlay-store';

/**
 * Resolved System 5 Cohesion Permafrost tunables. The 6 consumed keys are REUSE from gdd/14 §City — Cohesion
 * Permafrost AND consumed by the nightly tick day-1 (cohesion_delta_per_police_hour drives the wired
 * police-presence delta; legitimate_service_effectiveness drives the wired-but-zero-by-default upkeep recovery
 * term — see the file header for the HONEST deferral of the slider INPUT that feeds it). The district count is
 * the seed cardinality. cohesion_thaw_threshold_baseline is NOT resolved here (it is the DB column default, not
 * a consumed runtime key — see the NOTE below + the file header).
 *
 * 04e-A1 C5 (plan docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C5 / design §2.2): the
 * `permanentMarginalThreshold` GLOBAL lever below is BODY-WRAPPED with `EffectOverlayStore.applyModifiers`
 * (no signature change). `cohesionRecoveryRatePerDay` is the E-POL-12 DISTRICT lever — the plain getter stays
 * UNCHANGED (byte-identical for any un-scoped caller); the NEW `cohesionRecoveryRatePerDayFor(districtId)`
 * scoped variant is what `cohesion.service.ts:206` calls instead, threading `s.district_id`.
 */
export const cohesionTunables = {
  // NOTE — cohesion_thaw_threshold_baseline (0.55) is documented in the file header
  // but is DELIBERATELY NOT resolved here: nothing consumes it at runtime. The seed leaves the
  // `district_cohesion.thaw_threshold_baseline`/`thaw_threshold_current` COLUMN DEFAULTS (R9.3: 09 owns the
  // 0.55 schema default) and the service reads the persisted column, so an env override of a resolved key
  // would be silently dead. It is the column default the registry tracks, NOT a consumed runtime key — exactly
  // like the deferred crime-event magnitudes (documented, not surfaced as a live tunable). HONEST TUNABLES.
  /** cohesion_recovery_rate_per_day — passive daily recovery when no crime in the last 24h (Inv 2 slow-up). (DB-override > env > default — Phase-23). */
  get cohesionRecoveryRatePerDay(): number { return TunablesStore.resolveFloat('T.city.cohesion_recovery_rate_per_day', 'COHESION_RECOVERY_RATE_PER_DAY', 0.005); },
  /**
   * cohesion_recovery_rate_per_day — DISTRICT-scoped variant (04e-A1 C5, E-POL-12 lever, design §2.2 "DISTRICT
   * / PLAYER levers"). Additive overlay read: composes any GLOBAL or DISTRICT `effect_modifier` row on this key
   * on top of the SAME base as the plain getter above, then returns it — empty overlay → base byte-identical
   * (zero-regression contract). `cohesion.service.ts:206` threads its own per-district `s.district_id` here so a
   * DISTRICT modifier shifts recovery ONLY in its own district.
   */
  cohesionRecoveryRatePerDayFor(districtId: number): number {
    const base = TunablesStore.resolveFloat('T.city.cohesion_recovery_rate_per_day', 'COHESION_RECOVERY_RATE_PER_DAY', 0.005);
    const scope: EffectScopeContext = { districtId: String(districtId) };
    return EffectOverlayStore.applyModifiers('T.city.cohesion_recovery_rate_per_day', base, scope);
  },
  /** cohesion_hysteresis_step — irreversible per-thaw-event threshold decrement (Inv 3 ratchet). (DB-override > env > default — Phase-23). */
  get cohesionHysteresisStep(): number { return TunablesStore.resolveFloat('T.city.cohesion_hysteresis_step', 'COHESION_HYSTERESIS_STEP', 0.03); },
  /** informant_yield_exponent — exponent of the non-linear informant-yield power formula (Inv 5). (DB-override > env > default — Phase-23). */
  get informantYieldExponent(): number { return TunablesStore.resolveFloat('T.city.informant_yield_exponent', 'INFORMANT_YIELD_EXPONENT', 2.0); },
  /** cohesion_delta_per_police_hour — SIGNED (negative) cohesion delta per patrol-hour (police presence erodes). (DB-override > env > default — Phase-23). */
  get cohesionDeltaPerPoliceHour(): number { return TunablesStore.resolveFloat('T.city.cohesion_delta_per_police_hour', 'COHESION_DELTA_PER_POLICE_HOUR', -0.002); },
  /** legitimate_service_effectiveness — recovery per unit of legitimate_services_invest (slider INPUT deferred). (DB-override > env > default — Phase-23). */
  get legitimateServiceEffectiveness(): number { return TunablesStore.resolveFloat('T.city.legitimate_service_effectiveness', 'LEGITIMATE_SERVICE_EFFECTIVENESS', 0.002); },
  /**
   * permanent_marginal_threshold — threshold below which permanent_marginal_flag latches true (Inv 4 gate).
   * (DB-override > env > default — Phase-23). 04e-A1 C5: GLOBAL lever, body-wrapped — no signature change,
   * zero call-site churn; empty overlay → base byte-identical (design §2.2).
   */
  get permanentMarginalThreshold(): number {
    const base = TunablesStore.resolveFloat('T.city.permanent_marginal_threshold', 'PERMANENT_MARGINAL_THRESHOLD', 0.3);
    return EffectOverlayStore.applyModifiers('T.city.permanent_marginal_threshold', base);
  },
  /** city.district_count — the number of district_cohesion rows the lazy seed creates per player. (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};

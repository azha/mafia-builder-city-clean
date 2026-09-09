// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (news-beat.tunables.ts,
//             registry-first getters, R2.3)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §5 (tunables)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D11 (composite
//             resolutions)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §"Ambient World Event
//             Templates — News-beat" (8 REUSE keys pre-registered 2026-05-23, [PROV-Y26Q2] flags LIFTED
//             same-commit for 7 of the 8 — this chunk is their FIRST code reader — + the 28 NEW keys this
//             chunk ADDS, SAME commit — R2.3 registry-FIRST).
//             Pattern: mirrors services/game-back/src/operational/random_world/random-world.tunables.ts
//             (CAPS map + clamp function; ALL getters for the whole 04g-C design built upfront at C1,
//             even though most are not consumed until C2-C6 — the SAME "N getters at C1, consumers land
//             later" precedent 04g-A/04g-B/04e-B C1 established).
//             — 04g-C C1 — 2026-07-16
//
// `newsBeatTunables` — registry-mirrored getters for every `news_beats.*` key this lot's whole design
// needs (35 getters — 7 numeric/string REUSE + 28 NEW; `documented_moment_artifact_severity_threshold`
// is the 8th REUSE key and deliberately has NO getter here, see note below). R2.3 (NO inline numeric
// balance/config in services): every default below is verbatim from gdd/14 §"Ambient World Event
// Templates — News-beat". If a registry value changes, update gdd/14 + this file in the SAME commit
// (R9.3).
//
// Namespace `news_beats.*` (matches gdd/14's existing REUSE rows).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// `documented_moment_artifact_severity_threshold` — INTENTIONALLY has NO getter in this file. Per
// decisions D11: "documented_moment_artifact_severity_threshold → PAS résolu (registry-only D2) — la row
// garde son [PROV] avec note explicite. Honnête : ne pas résoudre un composite que personne ne lit."
// `documented_moment` is `registry_only` (news-beat-template-registry.ts) — no code path ever evaluates
// this composite, so adding a getter would be a decorative no-op, not R2.3 compliance. This is the ONE
// of the 8 REUSE keys whose `[PROV-Y26Q2]` flag stays UNLIFTED (gdd/14 row carries the explicit note).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ★ Boot guard — the keystone-probability mutex (design §3.2 phase 4a, matrice `news_beat_templates.md`
// "keystone gate" row: "Cumul probabilités keystones bounded à 0.30 (0.15+0.10+15% marge inversions)").
// `cooper_affair_framing_only_no_incident_probability` (0.15) + `sourceless_beat_pseudo_event_
// probability` (0.10) must NEVER sum above `KEYSTONE_PROBABILITY_MUTEX_CEILING` (0.30) — above it,
// "starvation des autres templates" (the matrix's own wording). `NewsBeatBootGuardService`
// (news-beat.module.ts) calls `assertKeystoneProbabilityMutexBudget` at `onModuleInit` with the LIVE
// registry-first values, so a bad DB override crashes the module at real boot — not a decorative check.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import { TunablesStore } from '../../config/tunables-store';
import { PRESS_OUTLET_REGISTRY } from './press-registry';

/** Min/max clamp range per key (mirrors `RANDOM_WORLD_TUNABLE_CAPS`'s shape). */
interface NewsBeatTunableRange { readonly min: number; readonly max: number; }

export const NEWS_BEAT_TUNABLE_CAPS: Record<string, NewsBeatTunableRange> = {
  // ── REUSE numeric (5, gdd/14:1697-1704 pre-registered) ────────────────────────────────────────────
  'news_beats.brennar_daily_beats_per_day_baseline':          { min: 2,    max: 15 },
  'news_beats.beat_persistence_in_feed_hours':                { min: 24,   max: 168 },
  'news_beats.cooper_affair_framing_only_no_incident_probability': { min: 0.05, max: 0.30 },
  'news_beats.sourceless_beat_pseudo_event_probability':      { min: 0.03, max: 0.20 },
  'news_beats.wire_day_homogenization_count':                 { min: 2,    max: 8 },
  // ── NEW — cross-cutting fodder scan (§5) ───────────────────────────────────────────────────────────
  'news_beats.digest_fodder_lookback_days':                   { min: 1,    max: 3 },
  'news_beats.digest_fodder_scan_cap':                        { min: 20,   max: 200 },
  // ── NEW — cooper_affair (§3.5.1) ────────────────────────────────────────────────────────────────────
  'news_beats.cooper_residue_over_ambient_margin':             { min: 0.05, max: 0.6 },
  'news_beats.cooper_frame_half_life_days':                    { min: 7,    max: 35 },
  'news_beats.cooper_max_reframes':                            { min: 2,    max: 5 },
  'news_beats.cooper_reframe_resistance_growth':                { min: 0.1,  max: 0.5 },
  'news_beats.cooper_journalist_cohesion_threshold':            { min: 0.3,  max: 0.8 },
  // ── NEW — sourceless_beat (§3.5.2) ──────────────────────────────────────────────────────────────────
  'news_beats.sourceless_framing_readiness_threshold':          { min: 0.5,  max: 0.9 },
  'news_beats.sourceless_city_mood_receptiveness_floor':        { min: 0.2,  max: 0.7 },
  'news_beats.sourceless_arc_decay_per_silent_week':             { min: 0.1,  max: 0.8 },
  'news_beats.journalist_idle_readiness_days':                  { min: 5,    max: 30 },
  // ── NEW — folded_page (§3.5.5) ──────────────────────────────────────────────────────────────────────
  'news_beats.folded_page_suppression_threshold_severity':      { min: 0.3,  max: 0.9 },
  'news_beats.folded_page_outlet_count_tracked':                { min: 3,    max: 3 }, // structural (D3)
  // ── NEW — three_outlet_storm (§3.5.4) ───────────────────────────────────────────────────────────────
  'news_beats.storm_lock_margin':                                { min: 1.1,  max: 3.0 },
  'news_beats.storm_contest_window_days':                       { min: 7,    max: 28 },
  'news_beats.storm_contested_persistence_weeks':               { min: 4,    max: 16 },
  // ── NEW — slow_page (§3.5.6) ────────────────────────────────────────────────────────────────────────
  'news_beats.slow_page_installments_default':                  { min: 5,    max: 12 },
  'news_beats.slow_page_interest_accumulation_rate':            { min: 0.005, max: 0.08 },
  'news_beats.slow_page_interest_threshold':                    { min: 0.5,  max: 1.0 },
  'news_beats.slow_page_saturation_weeks':                      { min: 8,    max: 20 },
  // ── NEW — hindsight (§3.5.3) ────────────────────────────────────────────────────────────────────────
  'news_beats.hindsight_arc_probability':                       { min: 0.1,  max: 1.0 },
  'news_beats.hindsight_arc_delay_weeks_min':                   { min: 1,    max: 2 },
  'news_beats.hindsight_arc_delay_weeks_max':                   { min: 2,    max: 5 },
  'news_beats.hindsight_indicator_count':                       { min: 3,    max: 5 },
  'news_beats.hindsight_total_publications':                    { min: 4,    max: 8 },
  'news_beats.hindsight_publication_weeks':                     { min: 2,    max: 4 },
  // ── NEW — wire_day (§3.5.7) ─────────────────────────────────────────────────────────────────────────
  'news_beats.wire_day_base_frequency_per_days':                { min: 7,    max: 30 },
  'news_beats.wire_low_production_threshold':                   { min: 4,    max: 40 },
};

/** Clamp a numeric value to the registered range for the given key. Used internally by every numeric
 *  getter below. Returns the value unchanged if no range is registered (defensive — every numeric key
 *  above IS registered, so this branch is dead in practice, mirrors `clampRandomWorldTunableToRange`). */
export function clampNewsBeatTunableToRange(key: string, value: number): number {
  const range = NEWS_BEAT_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** The structural ceiling on the SUM of the 2 keystone probabilities (matrice "keystone gate" row —
 *  see file header). NOT a registry key itself (mirrors `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_
 *  THRESHOLD`'s own "resolved constant, not a TunablesStore key" precedent, ambient.tunables.ts) — the 2
 *  summed values ARE registry keys (cooper/sourceless probabilities above); this ceiling is the
 *  structural invariant the boot guard enforces over their sum. */
export const KEYSTONE_PROBABILITY_MUTEX_CEILING = 0.30;

/**
 * Boot-time invariant (design §3.2 phase 4a, decisions D2/matrice "keystone gate" row): the cooper +
 * sourceless probabilities, summed, must never exceed `KEYSTONE_PROBABILITY_MUTEX_CEILING`. Throws
 * (never silently clamps) — a violated budget is a configuration error the app should refuse to boot
 * with, not silently paper over. Called by `NewsBeatBootGuardService.onModuleInit` with the LIVE
 * registry-first values (news-beat.module.ts) — a bad `tunable_overrides` row crashes the real module
 * init, not just a decorative check. Exported standalone (pure, zero I/O) so it is ALSO directly
 * falsifiable via a plain TS import (mirrors the repo's own "direct pure-module import" test precedent,
 * e.g. `random_world_template_registry.spec.ts`).
 */
export function assertKeystoneProbabilityMutexBudget(cooperProbability: number, sourcelessProbability: number): void {
  const sum = cooperProbability + sourcelessProbability;
  if (sum > KEYSTONE_PROBABILITY_MUTEX_CEILING) {
    throw new Error(
      `NewsBeat keystone probability budget exceeded: cooper_affair_framing_only_no_incident_probability ` +
      `(${cooperProbability}) + sourceless_beat_pseudo_event_probability (${sourcelessProbability}) = ${sum} ` +
      `> ${KEYSTONE_PROBABILITY_MUTEX_CEILING} (matrice "keystone gate" row, news_beat_templates.md — ` +
      `"above it, starvation of the other templates"). Lower one or both overrides in tunable_overrides.`,
    );
  }
}

/** Registry-mirrored getters for every `news_beats.*` key this lot's design needs (35 total — 7
 *  REUSE numeric/string + 28 NEW, C1). */
export const newsBeatTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // REUSE (7 with a getter; the 8th, documented_moment_artifact_severity_threshold, deliberately has
  // NONE — see file header) — gdd/14:1697-1704 pre-registered 2026-05-23, this chunk is their FIRST
  // code reader, [PROV-Y26Q2] flags LIFTED same-commit for the 7 below.
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** brennar_daily_beats_per_day_baseline — the daily plancher (Scénario 1 canon). Default 5, 2..15. */
  get brennarDailyBeatsPerDayBaseline(): number {
    return clampNewsBeatTunableToRange('news_beats.brennar_daily_beats_per_day_baseline',
      TunablesStore.resolveInt('news_beats.brennar_daily_beats_per_day_baseline', 'NEWS_BEATS_BRENNAR_DAILY_BEATS_PER_DAY_BASELINE', 5));
  },

  /** beat_persistence_in_feed_hours — REAL-time feed persistence window (decisions D5 — a query
   *  predicate on `created_at`, never a sweep). Default 48, 24..168. */
  get beatPersistenceInFeedHours(): number {
    return clampNewsBeatTunableToRange('news_beats.beat_persistence_in_feed_hours',
      TunablesStore.resolveInt('news_beats.beat_persistence_in_feed_hours', 'NEWS_BEATS_BEAT_PERSISTENCE_IN_FEED_HOURS', 48));
  },

  /** cooper_affair_framing_only_no_incident_probability — the ❤️ keystone's daily roll. Default 0.15,
   *  0.05..0.30. Bounded TOGETHER with `sourcelessBeatPseudoEventProbability` — see boot guard above. */
  get cooperFrameOnlyNoIncidentProbability(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_affair_framing_only_no_incident_probability',
      TunablesStore.resolveFloat('news_beats.cooper_affair_framing_only_no_incident_probability', 'NEWS_BEATS_COOPER_AFFAIR_FRAMING_ONLY_NO_INCIDENT_PROBABILITY', 0.15));
  },

  /** sourceless_beat_pseudo_event_probability — the ❤️ keystone's daily roll (the pure-inversion
   *  template — zero fodder). Default 0.10, 0.03..0.20. Bounded TOGETHER with
   *  `cooperFrameOnlyNoIncidentProbability` — see boot guard above. */
  get sourcelessBeatPseudoEventProbability(): number {
    return clampNewsBeatTunableToRange('news_beats.sourceless_beat_pseudo_event_probability',
      TunablesStore.resolveFloat('news_beats.sourceless_beat_pseudo_event_probability', 'NEWS_BEATS_SOURCELESS_BEAT_PSEUDO_EVENT_PROBABILITY', 0.10));
  },

  /** spiral_of_silence_omission_threshold — REUSE composite `composite:omission_threshold`. This getter
   *  returns the RAW composite string (BO diagnostic / registry parity) — the RESOLVED trigger (decisions
   *  D11) is: fodder `severityBand === 'high'` AND suppressor `selfCensorCoefficient ≥
   *  foldedPageSuppressionThresholdSeverity` AND ≥2 covering outlets remain — applicative logic (C4+),
   *  never a 2nd numeric tunable (mirrors `offHoursDriftThresholdPct`'s own "raw composite string"
   *  precedent, ambient.tunables.ts). */
  get spiralOfSilenceOmissionThreshold(): string {
    return TunablesStore.resolveString('news_beats.spiral_of_silence_omission_threshold', 'NEWS_BEATS_SPIRAL_OF_SILENCE_OMISSION_THRESHOLD', 'composite:omission_threshold');
  },

  /** wire_day_homogenization_count — REUSE, the N beats a wire day composes (design §3.5.7). Default 4,
   *  2..8. */
  get wireDayHomogenizationCount(): number {
    return clampNewsBeatTunableToRange('news_beats.wire_day_homogenization_count',
      TunablesStore.resolveInt('news_beats.wire_day_homogenization_count', 'NEWS_BEATS_WIRE_DAY_HOMOGENIZATION_COUNT', 4));
  },

  /** three_outlet_storm_framing_divergence_threshold — REUSE composite
   *  `composite:divergence_significant`. This getter returns the RAW composite string (BO diagnostic /
   *  registry parity) — the RESOLVED trigger (decisions D11) is STRUCTURAL: 3 distinct frames drawn
   *  without replacement = significant divergence by construction (C4+ applicative logic, never a 2nd
   *  numeric tunable). */
  get threeOutletStormFramingDivergenceThreshold(): string {
    return TunablesStore.resolveString('news_beats.three_outlet_storm_framing_divergence_threshold', 'NEWS_BEATS_THREE_OUTLET_STORM_FRAMING_DIVERGENCE_THRESHOLD', 'composite:divergence_significant');
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — cross-cutting fodder scan (§5, C2 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** digest_fodder_lookback_days — the nightly digest narrates the SAME game-day's fodder.
   *  [PROV-Y26Q3]. Default 1, 1..3. */
  get digestFodderLookbackDays(): number {
    return clampNewsBeatTunableToRange('news_beats.digest_fodder_lookback_days',
      TunablesStore.resolveInt('news_beats.digest_fodder_lookback_days', 'NEWS_BEATS_DIGEST_FODDER_LOOKBACK_DAYS', 1));
  },

  /** digest_fodder_scan_cap — F4 guard bounding the phase-1 fodder scan. [PROV-Y26Q3]. Default 60,
   *  20..200. */
  get digestFodderScanCap(): number {
    return clampNewsBeatTunableToRange('news_beats.digest_fodder_scan_cap',
      TunablesStore.resolveInt('news_beats.digest_fodder_scan_cap', 'NEWS_BEATS_DIGEST_FODDER_SCAN_CAP', 60));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — cooper_affair (§3.5.1, C5 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** cooper_residue_over_ambient_margin — the "residue above ambient noise" relative-excess margin
   *  (decisions D6 — district heat vs the Constant Hum cell's `baseline_heat_ema`). [PROV-Y26Q3].
   *  Default 0.25, 0.05..0.6. */
  get cooperResidueOverAmbientMargin(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_residue_over_ambient_margin',
      TunablesStore.resolveFloat('news_beats.cooper_residue_over_ambient_margin', 'NEWS_BEATS_COOPER_RESIDUE_OVER_AMBIENT_MARGIN', 0.25));
  },

  /** cooper_frame_half_life_days — CATALOGUE_REPORT.md :296 verbatim ("frame half-life days (default
   *  18)"). Default 18, 7..35. */
  get cooperFrameHalfLifeDays(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_frame_half_life_days',
      TunablesStore.resolveInt('news_beats.cooper_frame_half_life_days', 'NEWS_BEATS_COOPER_FRAME_HALF_LIFE_DAYS', 18));
  },

  /** cooper_max_reframes — CATALOGUE_REPORT.md :296 verbatim ("max reframes (default 3)"). Default 3,
   *  2..5. */
  get cooperMaxReframes(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_max_reframes',
      TunablesStore.resolveInt('news_beats.cooper_max_reframes', 'NEWS_BEATS_COOPER_MAX_REFRAMES', 3));
  },

  /** cooper_reframe_resistance_growth — CATALOGUE_REPORT.md :296 verbatim ("reframe resistance growth
   *  (default 0.3 per reframe)"). Default 0.3, 0.1..0.5. */
  get cooperReframeResistanceGrowth(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_reframe_resistance_growth',
      TunablesStore.resolveFloat('news_beats.cooper_reframe_resistance_growth', 'NEWS_BEATS_COOPER_REFRAME_RESISTANCE_GROWTH', 0.3));
  },

  /** cooper_journalist_cohesion_threshold — CATALOGUE_REPORT.md :296 verbatim ("journalist cohesion
   *  threshold (default 0.5)"). Default 0.5, 0.3..0.8. */
  get cooperJournalistCohesionThreshold(): number {
    return clampNewsBeatTunableToRange('news_beats.cooper_journalist_cohesion_threshold',
      TunablesStore.resolveFloat('news_beats.cooper_journalist_cohesion_threshold', 'NEWS_BEATS_COOPER_JOURNALIST_COHESION_THRESHOLD', 0.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — sourceless_beat (§3.5.2, C5 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** sourceless_framing_readiness_threshold — CATALOGUE_REPORT.md :318 verbatim ("framing-readiness
   *  threshold (default 0.7)"). Default 0.7, 0.5..0.9. */
  get sourcelessFramingReadinessThreshold(): number {
    return clampNewsBeatTunableToRange('news_beats.sourceless_framing_readiness_threshold',
      TunablesStore.resolveFloat('news_beats.sourceless_framing_readiness_threshold', 'NEWS_BEATS_SOURCELESS_FRAMING_READINESS_THRESHOLD', 0.7));
  },

  /** sourceless_city_mood_receptiveness_floor — CATALOGUE_REPORT.md :318 verbatim ("city-mood
   *  receptiveness floor (default 0.4)"). Default 0.4, 0.2..0.7. */
  get sourcelessCityMoodReceptivenessFloor(): number {
    return clampNewsBeatTunableToRange('news_beats.sourceless_city_mood_receptiveness_floor',
      TunablesStore.resolveFloat('news_beats.sourceless_city_mood_receptiveness_floor', 'NEWS_BEATS_SOURCELESS_CITY_MOOD_RECEPTIVENESS_FLOOR', 0.4));
  },

  /** sourceless_arc_decay_per_silent_week — CATALOGUE_REPORT.md :318 verbatim ("arc decay per silent
   *  week (default 0.4)"). Default 0.4, 0.1..0.8. */
  get sourcelessArcDecayPerSilentWeek(): number {
    return clampNewsBeatTunableToRange('news_beats.sourceless_arc_decay_per_silent_week',
      TunablesStore.resolveFloat('news_beats.sourceless_arc_decay_per_silent_week', 'NEWS_BEATS_SOURCELESS_ARC_DECAY_PER_SILENT_WEEK', 0.4));
  },

  /** journalist_idle_readiness_days — the readiness derivation denominator (decisions D7:
   *  `min(1, days_since_last_byline / this)`). [PROV-Y26Q3]. Default 14, 5..30. */
  get journalistIdleReadinessDays(): number {
    return clampNewsBeatTunableToRange('news_beats.journalist_idle_readiness_days',
      TunablesStore.resolveInt('news_beats.journalist_idle_readiness_days', 'NEWS_BEATS_JOURNALIST_IDLE_READINESS_DAYS', 14));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — folded_page (§3.5.5, C4 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** folded_page_suppression_threshold_severity — CATALOGUE_REPORT.md :340 verbatim ("suppression
   *  threshold severity (default 0.6)") — the omission-composite resolution's outlet-side half
   *  (decisions D11). Default 0.6, 0.3..0.9. */
  get foldedPageSuppressionThresholdSeverity(): number {
    return clampNewsBeatTunableToRange('news_beats.folded_page_suppression_threshold_severity',
      TunablesStore.resolveFloat('news_beats.folded_page_suppression_threshold_severity', 'NEWS_BEATS_FOLDED_PAGE_SUPPRESSION_THRESHOLD_SEVERITY', 0.6));
  },

  /** folded_page_outlet_count_tracked — CATALOGUE_REPORT.md :340 verbatim ("outlet count tracked
   *  (default 3)") — STRUCTURAL (tied to `PRESS_OUTLET_REGISTRY`'s own fixed 3-entry size, D3). ALWAYS
   *  3 — the day-1 press registry has exactly 3 outlets; this getter reads the registry's own length
   *  rather than a hardcoded restatement (R2.3 — never drifts from the actual registry). */
  get foldedPageOutletCountTracked(): number {
    // Deliberately NOT `TunablesStore`-driven: the registry's length IS the value (structural, mirrors
    // `structuralInt`'s "never honors an override" posture in ambient.tunables.ts, but derived from the
    // actual press registry rather than a bare literal — see press-registry.ts).
    return PRESS_OUTLET_REGISTRY.length;
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — three_outlet_storm (§3.5.4, C4 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** storm_lock_margin — CATALOGUE_REPORT.md :406 verbatim ("lock margin (default 1.5x)"). Default 1.5,
   *  1.1..3.0. */
  get stormLockMargin(): number {
    return clampNewsBeatTunableToRange('news_beats.storm_lock_margin',
      TunablesStore.resolveFloat('news_beats.storm_lock_margin', 'NEWS_BEATS_STORM_LOCK_MARGIN', 1.5));
  },

  /** storm_contest_window_days — CATALOGUE_REPORT.md :394 ("after two weeks"). Default 14, 7..28. */
  get stormContestWindowDays(): number {
    return clampNewsBeatTunableToRange('news_beats.storm_contest_window_days',
      TunablesStore.resolveInt('news_beats.storm_contest_window_days', 'NEWS_BEATS_STORM_CONTEST_WINDOW_DAYS', 14));
  },

  /** storm_contested_persistence_weeks — CATALOGUE_REPORT.md :406 verbatim ("contested-state
   *  persistence (default 8 weeks)"). Default 8, 4..16. */
  get stormContestedPersistenceWeeks(): number {
    return clampNewsBeatTunableToRange('news_beats.storm_contested_persistence_weeks',
      TunablesStore.resolveInt('news_beats.storm_contested_persistence_weeks', 'NEWS_BEATS_STORM_CONTESTED_PERSISTENCE_WEEKS', 8));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — slow_page (§3.5.6, C6 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** slow_page_installments_default — CATALOGUE_REPORT.md :362 verbatim ("installments (default 8)",
   *  range canon 5-12). Default 8, 5..12. */
  get slowPageInstallmentsDefault(): number {
    return clampNewsBeatTunableToRange('news_beats.slow_page_installments_default',
      TunablesStore.resolveInt('news_beats.slow_page_installments_default', 'NEWS_BEATS_SLOW_PAGE_INSTALLMENTS_DEFAULT', 8));
  },

  /** slow_page_interest_accumulation_rate — the interest counter's per-day accumulation rate (decisions
   *  D9, mirrors `random_world.quorum_adoption_accumulation_rate`). [PROV-Y26Q3]. Default 0.02,
   *  0.005..0.08. */
  get slowPageInterestAccumulationRate(): number {
    return clampNewsBeatTunableToRange('news_beats.slow_page_interest_accumulation_rate',
      TunablesStore.resolveFloat('news_beats.slow_page_interest_accumulation_rate', 'NEWS_BEATS_SLOW_PAGE_INTEREST_ACCUMULATION_RATE', 0.02));
  },

  /** slow_page_interest_threshold — the normalized (0..1 clamp) interest counter's series-trigger
   *  threshold. [PROV-Y26Q3]. Default 1.0, 0.5..1.0. */
  get slowPageInterestThreshold(): number {
    return clampNewsBeatTunableToRange('news_beats.slow_page_interest_threshold',
      TunablesStore.resolveFloat('news_beats.slow_page_interest_threshold', 'NEWS_BEATS_SLOW_PAGE_INTEREST_THRESHOLD', 1.0));
  },

  /** slow_page_saturation_weeks — CATALOGUE_REPORT.md :362 verbatim ("saturation threshold (default 12
   *  weeks)"). Default 12, 8..20. */
  get slowPageSaturationWeeks(): number {
    return clampNewsBeatTunableToRange('news_beats.slow_page_saturation_weeks',
      TunablesStore.resolveInt('news_beats.slow_page_saturation_weeks', 'NEWS_BEATS_SLOW_PAGE_SATURATION_WEEKS', 12));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — hindsight (§3.5.3, C3 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** hindsight_arc_probability — per-eligible-resolution roll gating the canon "fires automatically"
   *  (decisions D8, F4 anti-cluster guard — 1.0 restores canon automatic). [PROV-Y26Q3]. Default 0.5,
   *  0.1..1.0. */
  get hindsightArcProbability(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_arc_probability',
      TunablesStore.resolveFloat('news_beats.hindsight_arc_probability', 'NEWS_BEATS_HINDSIGHT_ARC_PROBABILITY', 0.5));
  },

  /** hindsight_arc_delay_weeks_min — CATALOGUE_REPORT.md :420 ("1-3 weeks after resolution"). Default 1,
   *  1..2. */
  get hindsightArcDelayWeeksMin(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_arc_delay_weeks_min',
      TunablesStore.resolveInt('news_beats.hindsight_arc_delay_weeks_min', 'NEWS_BEATS_HINDSIGHT_ARC_DELAY_WEEKS_MIN', 1));
  },

  /** hindsight_arc_delay_weeks_max — CATALOGUE_REPORT.md :420 ("1-3 weeks after resolution"). Default 3,
   *  2..5. */
  get hindsightArcDelayWeeksMax(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_arc_delay_weeks_max',
      TunablesStore.resolveInt('news_beats.hindsight_arc_delay_weeks_max', 'NEWS_BEATS_HINDSIGHT_ARC_DELAY_WEEKS_MAX', 3));
  },

  /** hindsight_indicator_count — CATALOGUE_REPORT.md :428 verbatim ("indicator count (default 4)").
   *  Default 4, 3..5. */
  get hindsightIndicatorCount(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_indicator_count',
      TunablesStore.resolveInt('news_beats.hindsight_indicator_count', 'NEWS_BEATS_HINDSIGHT_INDICATOR_COUNT', 4));
  },

  /** hindsight_total_publications — CATALOGUE_REPORT.md :420 ("op-eds + follow-ups", 4-8 total, Flow
   *  7). Default 5, 4..8. */
  get hindsightTotalPublications(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_total_publications',
      TunablesStore.resolveInt('news_beats.hindsight_total_publications', 'NEWS_BEATS_HINDSIGHT_TOTAL_PUBLICATIONS', 5));
  },

  /** hindsight_publication_weeks — CATALOGUE_REPORT.md :420 ("across 2-4 weeks"). Default 3, 2..4. */
  get hindsightPublicationWeeks(): number {
    return clampNewsBeatTunableToRange('news_beats.hindsight_publication_weeks',
      TunablesStore.resolveInt('news_beats.hindsight_publication_weeks', 'NEWS_BEATS_HINDSIGHT_PUBLICATION_WEEKS', 3));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // NEW — wire_day (§3.5.7, C3 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** wire_day_base_frequency_per_days — CATALOGUE_REPORT.md :538 verbatim ("wire_frequency_base
   *  (default 1/14 days)"). Default 14, 7..30. */
  get wireDayBaseFrequencyPerDays(): number {
    return clampNewsBeatTunableToRange('news_beats.wire_day_base_frequency_per_days',
      TunablesStore.resolveInt('news_beats.wire_day_base_frequency_per_days', 'NEWS_BEATS_WIRE_DAY_BASE_FREQUENCY_PER_DAYS', 14));
  },

  /** wire_low_production_threshold — the per-run `fodder_counts` floor below which the Wire Day roll
   *  weight increases ("weighted higher in periods of low original-story production", CATALOGUE :526).
   *  [PROV-Y26Q3]. Default 12, 4..40. */
  get wireLowProductionThreshold(): number {
    return clampNewsBeatTunableToRange('news_beats.wire_low_production_threshold',
      TunablesStore.resolveInt('news_beats.wire_low_production_threshold', 'NEWS_BEATS_WIRE_LOW_PRODUCTION_THRESHOLD', 12));
  },
};

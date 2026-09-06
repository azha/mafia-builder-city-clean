// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C5 (sourceless_beat — readiness
//             derivation + city-mood formula + the chain-refusal shape guard + arc decay + copy)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.2 (sourceless_beat)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D7 (readiness +
//             mood DÉRIVÉS, "formule exacte figée au chunk C5")
//             — 04g-C C5 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `cooper-affair.ts`/`wire-day.ts`'s own posture): the readiness
// derivation, the city-mood formula (D7 — "figée au chunk C5", THIS file is that fixing), the arc-decay
// step, the chain-refusal shape guard, and the copy catalogue `NewsBeatGeneratorService.
// composeSourcelessBeat` / `NewsBeatRepository.insertSourcelessThreadAtomic` /
// `BrennarDailyService.advanceSourcelessBeatThread` need. The caller owns all I/O and all `Rng`
// instantiation (S7).

import type { SourceAttribution } from './news-beat.types';
import { type OutletVoiced } from './outlet-voice';

/** The 18 real district ids (`db/schema/world_geography.ts`, migration 0016 seed) — `claimed_subject`
 *  (design §3.5.2 "district tiré seedé") draws uniformly over this closed range. Mirrors the codebase's
 *  own convention of citing "18 districts (1..18)" inline rather than a shared numeric constant (e.g.
 *  `tempo-exposure.service.ts`'s own header comment) — no dedicated `TOTAL_DISTRICTS` export exists
 *  elsewhere to reuse. */
export const SOURCELESS_TOTAL_DISTRICTS = 18;

/**
 * `journalistFramingReadiness` (decisions D7 verbatim): `min(1, days_since_last_byline /
 * journalist_idle_readiness_days)` — a PURE ledger derivation, zero stored scalar. `daysSinceLastByline`
 * may legitimately be `Number.POSITIVE_INFINITY` (a journalist with NO byline ever, `news-beat.
 * repository.ts`'s `lastBylineGameDayByJournalist` returns no entry for them) — JS's own IEEE-754
 * arithmetic already handles this correctly (`Infinity / N === Infinity`, `Math.min(1, Infinity) === 1`),
 * no special-casing needed: a journalist who has NEVER published is maximally "idle" = maximally ready,
 * the honest edge case (design "publier une byline remet la readiness à 0" — the INVERSE is equally
 * true: no byline ever is the MOST idle state possible).
 */
export function computeJournalistFramingReadiness(daysSinceLastByline: number, idleReadinessDays: number): number {
  return Math.min(1, daysSinceLastByline / idleReadinessDays);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ★ Coder judgment call (documented — decisions D7 explicitly defers this: "Formule exacte figée au
// chunk C5 (documentée dans la row gdd/14 du floor)"). Canon verbatim (CATALOGUE_REPORT.md :310): "city
// mood (an aggregate over cohesion deltas and recent news densities)". No dedicated `news_beats.*`
// tunable names the PIVOT or the per-signal WEIGHTS (only the floor `sourceless_city_mood_
// receptiveness_floor` = 0.4 is registered) — this is the SAME "formula-shape constant, not a registered
// balance knob" class `wire-day.ts`'s own `WIRE_DAY_LOW_PRODUCTION_WEIGHT_MULTIPLIER` and
// `three-outlet-storm.ts`'s own tier-scaled salience formula already establish.
//
// Direction argued (a defensible, NOT canon-mandated, reading — flagged for reviewer attention):
//   (a) LOWER cross-player cohesion (a city already under strain, below the schema's own neutral
//       default `district_cohesion.cohesion = 0.7`, GDD L193) → HIGHER receptiveness. A city already
//       anxious is more fertile ground for a manufactured framing to "stick" — the Boorstin pseudo-event
//       needs an audience primed to believe it.
//   (b) LOWER recent news density (a quiet news cycle, below `brennar_daily_beats_per_day_baseline`) →
//       HIGHER receptiveness — the SAME "a news vacuum invites manufactured content" logic `wire_day`'s
//       own "low original-story production raises its own trigger weight" formula already encodes for a
//       DIFFERENT template; reused here as the same real-world journalism dynamic, not re-derived from
//       scratch.
// Both signals clamp to [0,1] BEFORE combining (never letting one runaway signal dominate unclamped),
// combined with EQUAL 0.5/0.5 weight (no canon or tunable basis to weight one over the other — the
// simplest defensible split), then clamped again. Missing signal data (empty `district_cohesion` table,
// or zero prior `news_daily_run` history) NEVER fabricates a non-zero contribution — see the 2 callers
// in `brennar-daily.service.ts` (avgCohesion === null short-circuits the WHOLE trigger; an empty recent-
// runs history falls back to the NEUTRAL baseline, contributing exactly 0 to the density signal — the
// SAME "missing data is never a false positive" discipline `wire-day.ts`'s `isLowProduction` already
// established).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const SOURCELESS_MOOD_COHESION_PIVOT = 0.7; // GDD L193 `district_cohesion.cohesion` schema default.
export const SOURCELESS_MOOD_COHESION_WEIGHT = 0.5;
export const SOURCELESS_MOOD_DENSITY_WEIGHT = 0.5;
export const SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS = 7; // "fenêtre 7j" canon verbatim (design §3.5.2).

export function computeCityMoodReceptiveness(avgCrossPlayerCohesion: number, recentAvgBeatsPerDay: number, baselineBeatsPerDay: number): number {
  const cohesionSignal = clamp01((SOURCELESS_MOOD_COHESION_PIVOT - avgCrossPlayerCohesion) / SOURCELESS_MOOD_COHESION_PIVOT);
  const densitySignal =
    baselineBeatsPerDay > 0 ? clamp01((baselineBeatsPerDay - recentAvgBeatsPerDay) / baselineBeatsPerDay) : 0;
  return clamp01(SOURCELESS_MOOD_COHESION_WEIGHT * cohesionSignal + SOURCELESS_MOOD_DENSITY_WEIGHT * densitySignal);
}

/** The arc's starting index (design §3.5.2 "framing-arc index" state, CATALOGUE :310 — canon names the
 *  STATE but not a numeric default; 1.0 mirrors `StormThreadPayload`'s own "salience init 1" precedent:
 *  a fresh, fully-alive story). */
export const SOURCELESS_ARC_INITIAL_INDEX = 1.0;

/** One silent-week decay step (design §3.5.2 "décroissance sourceless_arc_decay_per_silent_week (0.4) →
 *  clôture quand l'arc index tombe < seuil structurel 0"). Rounded the SAME IEEE-754-stable way
 *  `cooper-affair.ts`'s `roundToStableDecimal` fixes cooper's resistance accumulation (repeated `-=`
 *  drifts by the identical few-ULP class of error). */
export function decaySourcelessArcIndex(currentIndex: number, decayPerWeek: number): number {
  return Number((currentIndex - decayPerWeek).toFixed(10));
}

/**
 * ★ The "forbidden to chain" shape guard (design §3.5.2 verbatim: "le shape refuse les champs de
 * chain") — THROWS (never silently strips) if a caller attempts to insert a `sourceless_beat`
 * `SourceAttribution` carrying ANY chain field (`outletKey`, `journalistKey`, or a non-null
 * `hedgeLevel`). Called by `NewsBeatRepository.insertSourcelessThreadAtomic` BEFORE any INSERT executes
 * — the "unit-level repo guard" the E2E floor's chain-refusal proof targets (a DEV-only test probe,
 * `news-test.controller.ts`, calls the repository method directly with a deliberately-poisoned
 * attribution to prove this throws).
 */
export function assertSourcelessAttributionShape(attribution: SourceAttribution): void {
  if (attribution.sourceless !== true) {
    throw new Error('sourceless_beat SourceAttribution must carry sourceless:true (design §3.5.2).');
  }
  if (attribution.outletKey !== undefined) {
    throw new Error('sourceless_beat SourceAttribution forbids outletKey — "forbidden to chain" (design §3.5.2, news_beat_templates.md :136).');
  }
  if (attribution.journalistKey !== undefined) {
    throw new Error('sourceless_beat SourceAttribution forbids journalistKey — "forbidden to chain" (design §3.5.2, news_beat_templates.md :136).');
  }
  if (attribution.hedgeLevel !== null) {
    throw new Error('sourceless_beat SourceAttribution requires hedgeLevel: null (never a laundering-chain-eligible 0.0) — design §3.5.2.');
  }
}

/** The ONE copy entry (design §3.7 D12 — real EN copy authored HERE; sourceless has no frame concept,
 *  mirrors `WIRE_DAY_COPY`'s own single-shared-entry shape). Deliberately NEUTRAL/observational language
 *  — no urgency/FOMO framing (R4.1 grep-gate). % allowed-mention: design comment (R4.1 self-clearance stating the copy is deliberately NOT urgency/FOMO framed), not narrative usage */
export interface SourcelessBeatCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** The ONE copy entry, now `OutletVoiced` (Brennar-voice design §2.1/§7.7 — ★ the C-2 R2.2 token ban is
 *  tightest here): the pre-lot neutral string is demoted byte-identical to `default` (§2.2 REUSE).
 *  Each outlet manufactures its own in-voice pattern-claim, citing nothing (`fodder_refs: []` is the
 *  falsifiable contract, generator) — `{district}`-only, no `{outlet}` interpolation (DV-5). */
export const SOURCELESS_BEAT_COPY: OutletVoiced<SourcelessBeatCopyEntry> = {
  default: {
    headlineI18nKey: 'news_beat.sourceless_beat.headline',
    headlineEn: 'A pattern, {outlet} says, in {district}',
    bodyI18nKey: 'news_beat.sourceless_beat.body',
    bodyEn: '{outlet} describes a pattern taking shape in {district} — no single incident is cited.',
  },
  brennar_daily_star: {
    headlineI18nKey: 'news_beat.sourceless_beat.brennar_daily_star.headline',
    headlineEn: 'A pattern would appear to be emerging in {district}',
    bodyI18nKey: 'news_beat.sourceless_beat.brennar_daily_star.body',
    bodyEn:
      'Taken together, recent impressions from {district} would appear to describe a pattern, though no single occurrence need be cited to establish it. Observers of the area are said to share this assessment. Further examination would seem warranted.',
  },
  tilbey_weekly: {
    headlineI18nKey: 'news_beat.sourceless_beat.tilbey_weekly.headline',
    headlineEn: 'Something is off in {district}, and people feel it',
    bodyI18nKey: 'news_beat.sourceless_beat.tilbey_weekly.body',
    bodyEn:
      'Nobody can point to one thing, but ask around {district} — over the counter, at the bus stop — and the feeling is the same: something has shifted. Nothing you could report, exactly. Everything you can sense.',
  },
  free_weekly: {
    headlineI18nKey: 'news_beat.sourceless_beat.free_weekly.headline',
    headlineEn: "Something's up in {district}. Ask anyone",
    bodyI18nKey: 'news_beat.sourceless_beat.free_weekly.body',
    bodyEn:
      "No incident to point at, no name, no address. Just a mood on the block — and the block is never wrong. Or so we're told. Take it for what it's worth; that's what we did.",
  },
};

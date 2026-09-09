// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C3 (wire day trigger weighting +
//             composition helpers)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.7 (wire_day) +
//             §3.2.3 (mutual exclusion with storm, gate flag consumed C4)
//             — 04g-C C3 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `news-beat-digest.ts`/`hindsight-arc.ts`'s own posture): the low-
// production signal, the probability weighting formula, and the deterministic composition helpers
// `NewsBeatGeneratorService.composeWireDayBeats` needs. The caller (`brennar-daily.service.ts`) owns the
// SINGLE `Rng` instance for the whole phase (trigger chance THEN frame pick, design §8 fixed order) and
// all DB I/O (`NewsBeatRepository.getRecentFodderCountTotals`).

import type { Rng } from '../../common/seeded-rng';
import type { FodderItem, NewsBeatCategoryValue } from './news-beat.types';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ★ Coder judgment call (documented, not a registry tunable — R2.3 classification): the design's own
// tunables table (§5) names ONLY `wire_day_base_frequency_per_days` and `wire_low_production_threshold`
// for this template — no key for "how many prior runs form the low-production lookback window" or "how
// much the roll weights up". These 2 constants are the SAME class of documented structural literal
// `apparentRecoveryCurveParams`'s `bounceEndWeek`/`plateauEndWeek` already established in
// `random-world-event-generator.service.ts` (04g-B C4) — a formula-shape constant, not a gameplay balance
// knob a designer would tune independently of the 2 REAL tunables above. `LOOKBACK_RUNS = 7` mirrors the
// design's OWN "seed low fodder_counts sur 7 runs" acceptance wording (plan §C3) — one calendar week, the
// SAME cadence "the evening journal narrates the day" (digest_fodder_lookback_days) reasoning extended to
// a rolling window. `WEIGHT_MULTIPLIER = 3` is [PROV-Y26Q3] — CATALOGUE_REPORT.md :526 says "weighted
// higher" with no exact factor; 3x turns the default base (1/14 ≈ 0.071) into ≈0.214 when production is
// low, high enough for a brute-force day-search (this codebase's own established precompute-then-observe
// idiom, e.g. `random_world_sideways_p1_activation.spec.ts`'s `findP1HitDay`) to find a hit quickly.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const WIRE_DAY_LOW_PRODUCTION_LOOKBACK_RUNS = 7;
export const WIRE_DAY_LOW_PRODUCTION_WEIGHT_MULTIPLIER = 3;

/** `fodder_counts` of the last N runs < `wire_low_production_threshold` (design §3.5.7 — "la disette de
 *  fodder est mesurée, pas simulée"). `recentTotals` = one entry per prior `news_daily_run`, each the SUM
 *  of that run's per-sourceKind `fodder_counts`. Empty history (early game — no prior runs yet) is NEVER
 *  treated as "low production": there is no data to measure a disette from (anti-fabrication). */
export function isLowProduction(recentTotals: readonly number[], threshold: number): boolean {
  if (recentTotals.length === 0) return false;
  const avg = recentTotals.reduce((sum, n) => sum + n, 0) / recentTotals.length;
  return avg < threshold;
}

/** Base frequency `1/wireDayBaseFrequencyPerDays`, weighted UP by `WIRE_DAY_LOW_PRODUCTION_WEIGHT_
 *  MULTIPLIER` when `lowProduction` (clamped to a legal probability). */
export function computeWireDayProbability(baseFrequencyPerDays: number, lowProduction: boolean): number {
  const base = 1 / baseFrequencyPerDays;
  return lowProduction ? Math.min(1, base * WIRE_DAY_LOW_PRODUCTION_WEIGHT_MULTIPLIER) : base;
}

/** The 4 canon frames (design §3.5.4's own closed union, reused here — CATALOGUE_REPORT.md :528 "uniform
 *  frame" for wire day names no dedicated frame vocabulary of its own). */
const WIRE_DAY_FRAMES = ['episodic', 'thematic', 'scandal', 'human_interest'] as const;
export type WireDayFrame = (typeof WIRE_DAY_FRAMES)[number];

/** ONE seeded draw — "frame uniforme" (design §3.5.7): every wire beat this day shares this SAME value. */
export function pickWireDayFrame(rng: Rng): WireDayFrame {
  return WIRE_DAY_FRAMES[rng.int(0, WIRE_DAY_FRAMES.length - 1)]!;
}

/** "Catégories réparties" (design §3.5.7): deterministic cycling — NO rng draw needed for a fixed,
 *  order-stable assignment (the SAME reasoning `pickWireDayTopFodder`'s tie-break below documents: a
 *  structural assignment doesn't need to consume the shared rng stream). */
const WIRE_DAY_CATEGORY_CYCLE: readonly NewsBeatCategoryValue[] = ['national', 'brennar_local', 'business', 'arts', 'sports'];
export function wireDayCategoryForIndex(index: number): NewsBeatCategoryValue {
  return WIRE_DAY_CATEGORY_CYCLE[index % WIRE_DAY_CATEGORY_CYCLE.length]!;
}

/** "Le fodder top du jour" (design §3.5.7): severity desc, then recency desc, then a deterministic
 *  lexicographic `refId` tie-break — NO rng consumed (a single well-defined maximum never needs a random
 *  tie-break; the shared `Rng` stream is reserved SOLELY for the trigger-chance + frame draws, keeping
 *  the "ordre de tirage FIXE" design §8 discipline simple: exactly 2 draws per wire-day evaluation,
 *  always). `null` (never fabricated) when the day's fodder scan is empty — the caller falls back to the
 *  neutral `constant_hum` subject (design §3.5.7 "sujet neutre … si aucun"). */
const SEVERITY_RANK: Readonly<Record<FodderItem['severityBand'], number>> = { high: 2, noticeable: 1, low: 0 };
export function pickWireDayTopFodder(items: readonly FodderItem[]): FodderItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    if (SEVERITY_RANK[a.severityBand] !== SEVERITY_RANK[b.severityBand]) return SEVERITY_RANK[b.severityBand] - SEVERITY_RANK[a.severityBand];
    if (a.occurredAtGameDay !== b.occurredAtGameDay) return b.occurredAtGameDay - a.occurredAtGameDay;
    return a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0;
  })[0]!;
}

/** The neutral subject i18n key (design §3.5.7 "sujet neutre `constant_hum` si aucun" — a real fodder-less
 *  day, never fabricated fodder to fill it). */
export const WIRE_DAY_NEUTRAL_SUBJECT_I18N_KEY = 'news_beat.wire_day.subject_neutral';

/** One shared copy entry (design §3.7 D12 — real EN copy, all `wireDayHomogenizationCount` beats reuse
 *  it verbatim, params vary only by `{outlet}`/`{subject}`/`{frame}` — the homogenization IS the point). */
export interface WireDayCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

export const WIRE_DAY_COPY: WireDayCopyEntry = {
  headlineI18nKey: 'news_beat.wire_day.headline',
  headlineEn: '{outlet} runs the wire report: {subject}',
  bodyI18nKey: 'news_beat.wire_day.body',
  bodyEn: 'The same wire report reaches {outlet} this morning, unchanged from the other outlets: {subject}.',
};

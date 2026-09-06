// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C6 (slow_page — the interest-
//             counter signal/accumulation formula [mirror of quorum_adoption 04g-B D10] + the seeded
//             installments-total draw + copy)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.6 (slow_page)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D9 (interest
//             counter = accumulation d'excès hum, miroir quorum_adoption 04g-B)
//             Mirror precedent: operational/random_world/quorum-adoption.ts (`districtAdoptionSignal`/
//             `nextAdoption`, 04g-B C4) — the SAME formula SHAPE, deliberately NOT cross-imported (see
//             below).
//             — 04g-C C6 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `cooper-affair.ts`/`sourceless-beat.ts`'s own posture): the interest-
// counter signal + accumulation step (D9 — the EXACT mirror of `quorum-adoption.ts`'s own
// `districtAdoptionSignal`/`nextAdoption`, RE-DERIVED here rather than imported from the sibling
// `operational/random_world/` module — a news-beat lot importing FROM a different gameplay chapter's
// module would be a genuine cross-chapter coupling this codebase's own module boundaries avoid; the
// FORMULA is mirrored, not the file — mirrors `quorum-adoption.ts`'s OWN header precedent of duplicating
// `DistrictHumObservation`/`medianOf`-shaped helpers rather than importing across an even narrower
// boundary), the seeded installments-total draw, and the 2-variant (opening/continuing) copy catalogue
// `NewsBeatGeneratorService.composeSlowPageSeries`/`composeSlowPageInstallmentBeat` and
// `BrennarDailyService.evaluateSlowPageTrigger`/`advanceSlowPageThread` need. The caller owns all I/O
// (`ConstantHumRepository.aggregateAvgHeatByDistrict`, `NewsBeatRepository.readPreviousJournalistInterest`)
// and all `Rng` instantiation (S7).

import type { Rng } from '../../common/seeded-rng';
import { type OutletVoiced } from './outlet-voice';

/** clamp v to [0,1] — the interest-counter domain (mirrors `quorum-adoption.ts`'s own `clamp01`,
 *  per-file self-containment, this codebase's established convention for this exact 3-line helper). */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Verbatim copy of `district-hum-weighting.ts`'s own `medianOf` (also already duplicated by
 *  `quorum-adoption.ts`) — kept local per that file's OWN "zero cross-import coupling beyond what a
 *  formula genuinely needs" precedent, extended one module boundary further here (news_beat never
 *  imports FROM random_world). */
function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** One district's heat observation — decoupled input shape (mirrors `quorum-adoption.ts`'s own
 *  `DistrictHumObservation`, duplicated here per that file's own "zero cross-import coupling"
 *  precedent). */
export interface DistrictHeatObservation {
  readonly districtId: number;
  readonly avgHeat: number;
}

/**
 * The interest-counter "signal" (design §3.5.6/D9: "alimenté par l'excès normalisé du hum … le résidu
 * cumulatif que les players produisent EST l'excès de heat soutenu" — mirror of `quorum-adoption.ts`'s
 * `districtAdoptionSignal`): `districtId`'s own observed heat MINUS the median heat across every
 * district `observations` reports THIS run — a raw difference (never a ratio, which degenerates on a
 * median of 0, the common freshly-seeded-world case — the SAME shape the quorum mirror establishes).
 * SIGNED: a below-median district produces a NEGATIVE signal ("décroît … quand l'excès est négatif" —
 * the interest counter must be able to fall, not just rise).
 *
 * ★ coder judgment call (documented — a narrower scope than quorum's own `allDistrictIds`-defensive
 * signature, `random-world-event-generator.service.ts`'s `applyQuorumAdoptionAndFlips`): computed ONLY
 * over districts `observations` itself reports. A district with zero buildings contributes no
 * observation and is simply never evaluated here — its interest counter stays whatever it last was,
 * carried forward unchanged by the caller (`BrennarDailyService.evaluateSlowPageTrigger`), never
 * fabricated as `0` the way quorum's broader all-18-district loop would. This is legitimate: unlike
 * quorum (which tracks EVERY district's own event-activation eligibility, so a defensive `0` for an
 * unobserved district matters structurally), slow_page's interest is a per-district "this district
 * produces sustained heat" residue — a building-less district genuinely has no residue to accumulate.
 */
export function districtInterestSignal(observations: readonly DistrictHeatObservation[], districtId: number): number {
  const heatByDistrict = new Map(observations.map((o) => [o.districtId, o.avgHeat]));
  const median = medianOf(observations.map((o) => o.avgHeat));
  const heat = heatByDistrict.get(districtId) ?? 0;
  return heat - median;
}

/**
 * One day's interest update (design §3.5.6: "interest += slow_page_interest_accumulation_rate × excès
 * normalisé du hum … décroît symétriquement ; clamp 0..1" — mirrors `quorum-adoption.ts`'s own
 * `nextAdoption` verbatim shape).
 */
export function nextInterest(prevInterest: number, accumulationRate: number, signal: number): number {
  return clamp01(prevInterest + accumulationRate * signal);
}

/**
 * ★ coder judgment call (documented — design §3.5.6/CATALOGUE_REPORT.md :362 "installments (default 8)",
 * range canon 5-12" reads as a genuine per-series DRAW over the closed canon range, NOT a fixed read of
 * the registered `slow_page_installments_default` tunable's point value — CONTRAST
 * `hindsight_total_publications`, which `composeRetrospectiveArc` consumes DIRECTLY with zero draw at
 * all. Design §8's own seed-purpose list names "installments" explicitly as a per-thread seeded draw
 * purpose, confirming genuine variability is intended here). `min`/`max` are supplied by the CALLER from
 * `NEWS_BEAT_TUNABLE_CAPS['news_beats.slow_page_installments_default']` (the ALREADY-REGISTERED clamp
 * range, R2.3 — never a fresh hardcoded 5/12 literal in THIS file). Consumes exactly 1 `rng.int` draw.
 */
export function drawInstallmentsTotal(rng: Rng, min: number, max: number): number {
  return rng.int(min, max);
}

/**
 * The installment cadence (design §3.5.6 "installment dû EXACTEMENT tous les 7 game-days" / "jour fixe
 * hebdomadaire — le weekday du 1er installment"). ★ coder judgment call (documented): UNLIKE hindsight's
 * own per-entry SEEDED schedule (`computeHindsightPublicationSchedule`, jittered within a multi-week
 * window), slow_page's cadence is DETERMINISTIC — no seed purpose named for a "schedule" or "weekday"
 * draw in design §8's own list (only "installments" is named). The 1st installment falls due EXACTLY 7
 * game-days after the thread opens (`openedAtGameDay + 7`); every later installment follows at a FIXED
 * +7-day cadence from there (`openedAtGameDay + 7*(installmentIndex+1)`, 0-based index) — this alone
 * guarantees "same weekday every time" as an EMERGENT property of a fixed 7-day period, with no separate
 * weekday draw needed.
 */
export function slowPageInstallmentDueDay(openedAtGameDay: number, installmentIndex: number): number {
  return openedAtGameDay + 7 * (installmentIndex + 1);
}

/** 2-variant copy (design §3.7 D12 — real EN copy authored HERE; mirrors `HINDSIGHT_COPY`'s own
 *  opening/follow-up 2-entry shape): `opening` = the 1st installment (canon "lands in the ticker on a
 *  fixed day"), `continuing` = every later installment (Flow 6 "series-shared" ongoing coverage). ★
 *  coder judgment call (documented): NO numeric "part N of M" interpolation — a deliberate
 *  simplification mirroring `HINDSIGHT_COPY`'s own "closed static-copy-variant, never a numeric-scalar
 *  param" posture for its own op-ed/follow-up split. Plain neutral journalistic language — no
 *  urgency/FOMO framing (R4.1 grep-gate). % allowed-mention: design comment (R4.1 self-clearance stating the copy is deliberately NOT urgency/FOMO framed), not narrative usage */
export interface SlowPageCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** 2-variant copy, each now `OutletVoiced` (Brennar-voice design §2.1/§7.5): the pre-lot neutral
 *  string is demoted byte-identical to `default` (§2.2 REUSE). Per the shipped catalogue's own posture
 *  (no "part N of M" numeric interpolation), voiced copy keeps that closed-variant discipline and
 *  binds `{district}` only. */
export const SLOW_PAGE_COPY: Readonly<{ opening: OutletVoiced<SlowPageCopyEntry>; continuing: OutletVoiced<SlowPageCopyEntry> }> = {
  opening: {
    default: {
      headlineI18nKey: 'news_beat.slow_page.opening.headline',
      headlineEn: 'The slow page: a running story takes shape in {district}',
      bodyI18nKey: 'news_beat.slow_page.opening.body',
      bodyEn: '{outlet} opens a running series on conditions in {district}, with further installments to follow in the weeks ahead.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.slow_page.opening.brennar_daily_star.headline',
      headlineEn: 'A standing examination of conditions in {district} commences',
      bodyI18nKey: 'news_beat.slow_page.opening.brennar_daily_star.body',
      bodyEn:
        'This paper commences today a standing examination of conditions in {district}, which would appear, on the available indications, to merit sustained attention. Installments will follow at weekly intervals, as the material warrants.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.slow_page.opening.tilbey_weekly.headline',
      headlineEn: '{district}, week one: we are going to keep looking',
      bodyI18nKey: 'news_beat.slow_page.opening.tilbey_weekly.body',
      bodyEn:
        'Starting this week, {district} gets a running page of its own: the shops, the doorsteps, the things that keep not getting fixed. Not because one big thing happened — because a lot of small things keep happening to the same people. Same page, every week.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.slow_page.opening.free_weekly.headline',
      headlineEn: '{district} gets a running page. It earned one',
      bodyI18nKey: 'news_beat.slow_page.opening.free_weekly.body',
      bodyEn:
        'New running page on {district}. Why: because it keeps earning one. We will keep it going as long as {district} keeps supplying material, and {district} shows no sign of stopping.',
    },
  },
  continuing: {
    default: {
      headlineI18nKey: 'news_beat.slow_page.continuing.headline',
      headlineEn: 'The slow page continues: {district}',
      bodyI18nKey: 'news_beat.slow_page.continuing.body',
      bodyEn: '{outlet} continues its running series on {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.slow_page.continuing.brennar_daily_star.headline',
      headlineEn: 'Conditions in {district}: the examination continues',
      bodyI18nKey: 'news_beat.slow_page.continuing.brennar_daily_star.body',
      bodyEn:
        "This paper's standing examination of conditions in {district} continues. The pattern previously noted would appear to persist; the offices to which it has been referred have yet to respond. The file, in the meantime, grows.",
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.slow_page.continuing.tilbey_weekly.headline',
      headlineEn: '{district}, another week on the same page',
      bodyI18nKey: 'news_beat.slow_page.continuing.tilbey_weekly.body',
      bodyEn:
        'Another week in {district}, another entry on the running page: same corners, same complaints, a few new names on the same old list. People stop us in the street now to add to it. We write it all down.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.slow_page.continuing.free_weekly.headline',
      headlineEn: '{district}, still at it',
      bodyI18nKey: 'news_beat.slow_page.continuing.free_weekly.body',
      bodyEn: 'The running page runs on. {district} keeps producing; we keep printing. Somebody official reads this, presumably. See you next week.',
    },
  },
};

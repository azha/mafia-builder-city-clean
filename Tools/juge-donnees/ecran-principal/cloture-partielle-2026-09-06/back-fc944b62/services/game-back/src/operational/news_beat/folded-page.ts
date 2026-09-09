// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C4 (folded_page — suppressor
//             qualification + copy)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.5 (folded_page) +
//             decisions D11 (spiral_of_silence_omission_threshold composite resolution) + §8
//             (determinism)
//             — 04g-C C4 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `three-outlet-storm.ts`/`hindsight-arc.ts`/`wire-day.ts`'s own posture):
// the suppressor-qualification predicate + the hollow beat's own copy. `NewsBeatGeneratorService.
// applySpiralOfSilenceOmission` owns all I/O (the 2 covering-digest inserts + the hollow-beat insert,
// atomically) and the seeded suppressor draw itself (`news:{fodderItem.refId}:suppressor` — see that
// method's own doc comment for why the seed keys off the fodder item's id rather than a thread id: this
// template is one-shot, no thread exists to key off, design §3.5.5 "pas de thread").

import { type OutletVoiced } from './outlet-voice';

/**
 * The trigger's OWN outlet-side half (decisions D11: "l'outlet suppressor tiré seedé a
 * selfCensorCoefficient ≥ folded_page_suppression_threshold_severity"). Pure — the caller already drew
 * WHICH outlet is the candidate suppressor (a seeded uniform pick over `PRESS_OUTLET_REGISTRY`); this
 * just checks whether that DRAWN outlet's OWN static `selfCensorCoefficient` clears the tunable
 * threshold. `false` is a legitimate, NON-fabricated non-fire (the drawn outlet simply doesn't
 * self-censor enough THIS draw) — distinct from the severity-band negation (Scénario 3's own "omission
 * sub-clinique" falsifiable case, gated by the caller BEFORE this check ever runs).
 */
export function foldedPageSuppressorQualifies(selfCensorCoefficient: number, suppressionThresholdSeverity: number): boolean {
  return selfCensorCoefficient >= suppressionThresholdSeverity;
}

/** The hollow beat's own copy (design §3.7 D12 — real EN copy authored HERE, at the chunk that ships
 *  folded_page). Deliberately NEUTRAL/observational — the beat itself is about an ABSENCE, never framed
 *  as urgent or as an accusation (R4.1 grep-gate #4, no urgency/FOMO copy). % allowed-mention: design comment (R4.1 self-clearance stating the copy is deliberately NOT urgency/FOMO framed), not narrative usage */
export interface FoldedPageCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** The ONE hollow-marker copy, now `OutletVoiced` (Brennar-voice design §2.1/§7.6, DV-6 as amended):
 *  the pre-lot neutral string is demoted byte-identical to `default` (§2.2 REUSE). Each per-outlet
 *  variant is selected on the beat's OWN `outletKey` — the SUPPRESSOR (generator
 *  `applySpiralOfSilenceOmission`) — registering THAT outlet's characteristic silence as observational
 *  meta-prose (`journalistKey` stays `null` regardless). `{district}`-only, no `{outlet}` interpolation
 *  (DV-5) — the outlet is named by registry-kind descriptor in the prose itself. The covering beats
 *  (the 2 other outlets) need no folded_page copy of their own: they consume `NEWS_BEAT_DIGEST_COPY`,
 *  selected on the COVERING outlet's key (DV-6). */
export const FOLDED_PAGE_COPY: OutletVoiced<FoldedPageCopyEntry> = {
  default: {
    headlineI18nKey: 'news_beat.folded_page.headline',
    headlineEn: 'What {outlet} left uncovered in {district}',
    bodyI18nKey: 'news_beat.folded_page.body',
    bodyEn: 'Two other outlets reported on {subject} in {district}; {outlet} did not run the story.',
  },
  brennar_daily_star: {
    headlineI18nKey: 'news_beat.folded_page.brennar_daily_star.headline',
    headlineEn: 'The folded page: {district} goes unmentioned in the broadsheet',
    bodyI18nKey: 'news_beat.folded_page.brennar_daily_star.body',
    bodyEn:
      "Two papers carried the story out of {district} this week. The city's broadsheet was not one of them. No explanation was offered — and none, presumably, is on file.",
  },
  tilbey_weekly: {
    headlineI18nKey: 'news_beat.folded_page.tilbey_weekly.headline',
    headlineEn: "The folded page: {district}'s own weekly looks away",
    bodyI18nKey: 'news_beat.folded_page.tilbey_weekly.body',
    bodyEn:
      'The story out of {district} ran in two papers this week — just not in the one closest to home. The neighborhood weekly kept its pages for other things. Doorsteps notice that kind of quiet.',
  },
  free_weekly: {
    headlineI18nKey: 'news_beat.folded_page.free_weekly.headline',
    headlineEn: 'The folded page: even the free paper skips {district}',
    bodyI18nKey: 'news_beat.folded_page.free_weekly.body',
    bodyEn:
      'Two outlets ran the story out of {district}. The free paper — the one that prints nearly everything — did not. When that page goes quiet, the quiet is the story.',
  },
};

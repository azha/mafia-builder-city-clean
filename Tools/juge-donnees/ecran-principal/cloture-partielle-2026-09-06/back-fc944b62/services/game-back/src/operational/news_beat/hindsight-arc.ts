// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C3 (composeRetrospectiveArc —
//             the cherry-pick draw + the publication schedule)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.3 (hindsight)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D8 (cherry-pick
//             in the REAL fodder + probability-of-guard)
//             — 04g-C C3 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `news-beat-digest.ts`'s own "pure module, caller supplies the `Rng`,
// caller owns all I/O" posture): the 2 per-thread seeded draws `NewsBeatGeneratorService.
// composeRetrospectiveArc` needs — the cherry-picked indicator draw (design §8 seed purpose
// `indicators`) and the publication schedule spread (design §8 seed purpose `schedule`). Both consume
// their OWN dedicated `Rng` instance (`news:{thread_id}:indicators` / `news:{thread_id}:schedule`) —
// the caller (news-beat-generator.service.ts) owns seeding, this file only consumes draws in a FIXED
// order per function (design §8 "ordre de tirage FIXE").

import type { Rng } from '../../common/seeded-rng';
import { type OutletVoiced } from './outlet-voice';

/**
 * `cherry_picked_indicators` (design §3.5.3/D8): a seeded draw-WITH-replacement of `count` entries from
 * `pool` (the REAL micro-event `kind` strings observed in the district before resolution, S3 — see
 * `NewsFodderReader.scanMicroEventKindsBeforeResolution`). WITH replacement, deliberately: the Perrow
 * "warning signs" cherry-pick is a journalist's narrative choice over a SMALL real pool (6 canon kinds,
 * design §3 S3) — citing the same real kind twice ("two more corner fights that week") is legitimate
 * narrative texture, never a fabricated indicator (every entry, repeats included, is a kind that
 * GENUINELY occurred — the join-falsifiable contract the E2E floor proves). Empty `pool` (a degenerate
 * "nothing happened before this resolution, not even citywide" case — not expected in practice given the
 * ambient tick runs NIGHTLY/27 every day, but never fabricated to paper over it) returns `[]` honestly
 * rather than inventing an indicator. Consumes exactly `count` `rng.int` draws when `pool` is non-empty
 * (0 otherwise) — the FIXED order this function's own single loop guarantees.
 */
export function drawCherryPickedIndicators(pool: readonly string[], count: number, rng: Rng): string[] {
  if (pool.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[rng.int(0, pool.length - 1)]!);
  }
  return out;
}

/**
 * `publication_schedule_game_days` (design §3.5.3): `totalPublications` STRICTLY INCREASING absolute
 * `game_day` values within `(gameDay, gameDay + publicationWeeks*7]` — index 0 is the op-ed (canon "1
 * op-ed + (total-1) follow-ups"), the rest are follow-ups. Deliberately NEVER `gameDay` itself: phase 2
 * (thread advance) runs BEFORE phase 4d (the trigger) in the SAME tick (design §3.2's fixed phase
 * order), so a same-day entry could never be seen as "due" until the tick that just opened the thread
 * has already finished — the op-ed is only ever due starting the NEXT tick that evaluates this thread,
 * hence `gameDay + 1` is the earliest legal slot.
 *
 * Algorithm (documented so the E2E floor's precompute-then-observe proof can reproduce it exactly):
 * walk forward from `cursor = gameDay`, drawing each next day uniformly from
 * `[cursor+1, endDay - remainingAfterThis]` (leaving exactly one day of headroom per still-unscheduled
 * entry so the LAST entry can never be pushed past `endDay`), one `rng.int` draw per entry (index 0
 * included — the op-ed's OWN day is ALSO seeded, not hardcoded to `gameDay+1`, so "1-3 weeks after
 * resolution" full-window texture applies to the very first publication too). Consumes exactly
 * `totalPublications` `rng.int` draws, in ascending index order (design §8 "ordre de tirage FIXE").
 */
export function computeHindsightPublicationSchedule(
  gameDay: number,
  totalPublications: number,
  publicationWeeks: number,
  rng: Rng,
): number[] {
  const endDay = gameDay + publicationWeeks * 7;
  const schedule: number[] = [];
  let cursor = gameDay;
  for (let i = 0; i < totalPublications; i++) {
    const remainingAfterThis = totalPublications - i - 1;
    const minDay = cursor + 1;
    const maxDay = Math.max(minDay, endDay - remainingAfterThis);
    cursor = rng.int(minDay, maxDay);
    schedule.push(cursor);
  }
  return schedule;
}

/** One digest-style copy entry (mirrors `NewsBeatDigestCopyEntry`, design §3.7 D12 — real EN copy
 *  authored HERE, at the chunk that ships the hindsight lifecycle). */
export interface HindsightCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** Op-ed (tier 2, the arc's opening publication) vs follow-up (tier 1) copy (design §3.5.3 Flow 7
 *  "mixte tier journaliste op-ed"), each now `OutletVoiced` (Brennar-voice design §2.1/§7.4): the
 *  pre-lot neutral string is demoted byte-identical to `default` (§2.2 REUSE). Hindsight's
 *  `district_id` is nullable and its defaults already avoid `{district}` — voiced copy binds NO param
 *  at all (design §7.9), the retrospective voice is self-standing. */
export const HINDSIGHT_COPY: Readonly<{ opEd: OutletVoiced<HindsightCopyEntry>; followUp: OutletVoiced<HindsightCopyEntry> }> = {
  opEd: {
    default: {
      headlineI18nKey: 'news_beat.hindsight.op_ed.headline',
      headlineEn: 'Looking back: the warning signs before {subject}',
      bodyI18nKey: 'news_beat.hindsight.op_ed.body',
      bodyEn: '{outlet} opens a retrospective on {subject}, tracing prior indicators the paper says were there all along.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.hindsight.op_ed.brennar_daily_star.headline',
      headlineEn: 'In retrospect: indications said to have preceded the matter',
      bodyI18nKey: 'news_beat.hindsight.op_ed.brennar_daily_star.body',
      bodyEn:
        'With the matter now concluded, a review of the preceding months suggests a number of indications which, it would appear, were available at the time. Whether they could reasonably have been acted upon is a question this paper does not presume to settle. A fuller accounting would be desirable; whether one will be undertaken remains to be established.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.hindsight.op_ed.tilbey_weekly.headline',
      headlineEn: 'Everyone noticed something. Nobody was asked',
      bodyI18nKey: 'news_beat.hindsight.op_ed.tilbey_weekly.body',
      bodyEn:
        'Looking back, the signs were sitting in plain sight: the small troubles, the odd quiet, the complaints over the counter that never went anywhere. Everyone here remembers noticing something. Nobody remembers being asked. This series is the neighborhood adding it up — late, but on the record.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.hindsight.op_ed.free_weekly.headline',
      headlineEn: 'The warnings were there. So was everybody ignoring them',
      bodyI18nKey: 'news_beat.hindsight.op_ed.free_weekly.body',
      bodyEn:
        'Now that it is over, suddenly everyone can read the signs. Funny how that works. The signs were on the corner the whole time — ask anyone who stands there. Nobody upstairs asked then. They will now: in reports, in the past tense, with no names in them.',
    },
  },
  followUp: {
    default: {
      headlineI18nKey: 'news_beat.hindsight.follow_up.headline',
      headlineEn: 'More on {subject}: the retrospective continues',
      bodyI18nKey: 'news_beat.hindsight.follow_up.body',
      bodyEn: '{outlet} continues its retrospective series on {subject}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.hindsight.follow_up.brennar_daily_star.headline',
      headlineEn: 'Further notes on a matter previously examined',
      bodyI18nKey: 'news_beat.hindsight.follow_up.brennar_daily_star.body',
      bodyEn:
        'Continuing its review, this paper records further particulars of the period preceding the event. As before, their significance would appear clearer in retrospect than it can have been at the time. The examination continues.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.hindsight.follow_up.tilbey_weekly.headline',
      headlineEn: 'More of what the neighborhood remembers',
      bodyI18nKey: 'news_beat.hindsight.follow_up.tilbey_weekly.body',
      bodyEn:
        'The series continues, and so do the doorstep conversations: another neighbor, another small thing noticed at the time and set aside. Piece by piece it adds up to a picture. We keep collecting.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.hindsight.follow_up.free_weekly.headline',
      headlineEn: 'More warnings. Still no takers',
      bodyI18nKey: 'news_beat.hindsight.follow_up.free_weekly.body',
      bodyEn:
        'The look-back continues. More signs, same shape: seen on the street, missed upstairs. You could set your watch by it — if anything around here ran on time.',
    },
  },
};

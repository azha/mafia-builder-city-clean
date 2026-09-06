// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C4 (three_outlet_storm — the
//             frame draw + category mapping + daily salience increment + lock resolution + copy)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.4 (three_outlet_
//             storm) + §3.2 phase 4c + §8 (determinism)
//             — 04g-C C4 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `hindsight-arc.ts`/`wire-day.ts`'s own "pure module, caller supplies the
// `Rng`, caller owns all I/O" posture): the 3-distinct-frames draw, the frame→category mapping, the daily
// salience-increment formula, the lock-margin resolution check, and the per-frame copy catalogue
// `NewsBeatGeneratorService.composeThreeOutletStormBeats`/`BrennarDailyService.advanceThreeOutletStormThread`
// need.

import type { Rng } from '../../common/seeded-rng';
import type { NewsBeatCategoryValue } from './news-beat.types';
import { type OutletVoiced } from './outlet-voice';

/**
 * The 4 canon frames (design §3.5.4/CATALOGUE_REPORT.md :394-412 "episodic / thematic / scandal /
 * human-interest"). `wire-day.ts`'s own `WIRE_DAY_FRAMES` is a SEPARATE, deliberately-duplicated local
 * copy of this exact same 4-value domain (that file's own header: "no dedicated frame vocabulary of its
 * own" — it BORROWS storm's canon vocabulary) — kept local here too rather than a cross-module import,
 * mirroring the SAME "small closed lookup table duplicated per-file" precedent `SEVERITY_RANK` already
 * establishes across `news-beat-digest.ts`/`wire-day.ts` (each declares its own copy rather than sharing
 * one for 4-5 literal strings).
 */
const STORM_FRAMES = ['episodic', 'thematic', 'scandal', 'human_interest'] as const;
export type StormFrame = (typeof STORM_FRAMES)[number];

/**
 * 3 DISTINCT frames drawn seeded WITHOUT replacement from the 4-frame pool (design §3.5.4 "frames
 * DISTINCTS tirés seedé sans remise"). Mirrors `news-beat-digest.ts`'s own `drawAllSeeded` full-shuffle
 * idiom, bounded to `count` rather than the whole pool — consumes exactly `count` `rng.int` draws, one
 * per output position, in that FIXED order (design §8). `count` is REQUIRED (never a bare literal
 * default here, R2.3) — every real caller passes `PRESS_OUTLET_REGISTRY.length` explicitly (1 beat per
 * outlet, design §3.5.4).
 */
export function drawDistinctStormFrames(rng: Rng, count: number): StormFrame[] {
  const pool: StormFrame[] = [...STORM_FRAMES];
  const out: StormFrame[] = [];
  for (let i = 0; i < count; i++) {
    out.push(...pool.splice(rng.int(0, pool.length - 1), 1));
  }
  return out;
}

/** Flow 5 verbatim (design §3.5.4/news_beat_templates.md :161): scandal/episodic → brennar_local,
 *  thematic → national, human_interest → arts. */
export function beatCategoryForStormFrame(frame: StormFrame): NewsBeatCategoryValue {
  if (frame === 'scandal' || frame === 'episodic') return 'brennar_local';
  if (frame === 'thematic') return 'national';
  return 'arts'; // human_interest
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ★ Coder judgment call (documented — design §3.5.4's own formula is terse: "incréments de salience
// seedés pondérés par (a) tier de l'outlet, (b) recurrence de fodder même-district ce jour"). Concrete
// resolution: `rng.int(1, outletTier)` — a seeded draw whose CEILING scales with the producing outlet's
// own registry tier (1..3, `press-registry.ts`), so a higher-tier (larger/more institutional) outlet's
// frame accrues salience faster on average — plus a REAL bonus (`+outletTier`, itself tier-scaled, never
// fabricated) on any day `thread.district_id` genuinely has same-district fodder recurrence (design "le
// contest reste couplé au réel"). ★ Mathematical note (verified, not merely asserted): because the 3
// outlets' tiers are EXACTLY {1, 2, 3} (D3 — the day-1 press registry size), this SYMMETRIC per-day
// formula can NEVER, by itself, produce `max > 1.5×Σ(others)` within the contest window — the maximum
// tier (3) can at best TIE the other two's combined tiers (1+2=3), never strictly exceed them, with or
// without the (equally tier-scaled) recurrence bonus. This is NOT a bug: canon's own player-influence
// lever ("feed quotes/documents to one outlet to tip the framing race", CATALOGUE_REPORT.md :402) is the
// mechanism that would ACTUALLY tip a real race off this symmetric baseline — and no player action exists
// day-1 (decisions D15, TD §11.2 "player decision surface … feed quotes … AUCUN seam"). Absent that lever,
// every storm racing purely on this formula is EXPECTED to settle `contested_persistent` at the 8-week
// horizon — exactly the canon "sinon contested-state maintenu" default outcome. The `frame_locked` path
// is therefore exercised by the E2E floor via a HAND-CRAFTED starting salience skew (mirrors
// `news_beat_hindsight_c3.spec.ts`'s OWN "Crash-safety" test's hand-inserted-payload precedent) rather
// than by waiting on this formula to spontaneously diverge — the RESOLUTION logic under test
// (`evaluateStormLock` below) is identical either way.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export function computeStormDailySalienceIncrement(outletTier: 1 | 2 | 3, sameDistrictRecurrenceToday: boolean, rng: Rng): number {
  const drawn = rng.int(1, outletTier);
  return sameDistrictRecurrenceToday ? drawn + outletTier : drawn;
}

/** The contest-window resolution check (design §3.5.4 "à l'horizon du contest window … si
 *  max(salience) > storm_lock_margin × Σ(autres) → FrameLock"). Pure — takes the ALREADY-accumulated
 *  salience vector, returns the winning frame + ratio regardless of outcome (the caller decides whether
 *  `locked` gates a `FrameLock` persist vs a `contested_persistent` conclusion). `sumOthers === 0`
 *  (structurally impossible once all 3 frames start at salience 1, defensive anyway) never locks. */
export function evaluateStormLock(
  salience: Readonly<Record<string, number>>,
  lockMargin: number,
): { winningFrame: string; salienceRatio: number; locked: boolean } {
  const entries = Object.entries(salience);
  const [winningFrame, winningSalience] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  const sumOthers = entries.reduce((sum, [frame, value]) => (frame === winningFrame ? sum : sum + value), 0);
  const salienceRatio = sumOthers > 0 ? winningSalience / sumOthers : winningSalience;
  return { winningFrame, salienceRatio, locked: sumOthers > 0 && winningSalience > lockMargin * sumOthers };
}

/** One per-frame copy entry (design §3.7 D12 — real EN copy authored HERE, at the chunk that ships the
 *  storm lifecycle). Plain neutral journalistic framing language per frame — no urgency/FOMO copy (R4.1 % allowed-mention: design comment stating the copy is NOT urgency/FOMO framed (R4.1 self-clearance), not narrative usage
 *  grep-gate #4). */
export interface StormCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** 4 entries — one per `StormFrame` (only 3 of the 4 are ever used on a given storm, design §3.5.4 "3
 *  DISTINCTS … sans remise"), each now `OutletVoiced` (Brennar-voice design §2.1/§7.2): the pre-lot
 *  neutral meta-narration ("{outlet} centers its coverage…") is demoted byte-identical to `default`
 *  (§2.2 REUSE), and each of the 3 canon outlets gets its OWN front-page prose ACTUALLY writing its
 *  assigned frame — `{district}`-only (DV-2 as amended, no `{subject}`). */
export const STORM_COPY: Readonly<Record<StormFrame, OutletVoiced<StormCopyEntry>>> = {
  episodic: {
    default: {
      headlineI18nKey: 'news_beat.three_outlet_storm.episodic.headline',
      headlineEn: 'One family, one story: {subject} in {district}',
      bodyI18nKey: 'news_beat.three_outlet_storm.episodic.body',
      bodyEn: '{outlet} centers its coverage of {subject} on the people directly affected in {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.three_outlet_storm.episodic.brennar_daily_star.headline',
      headlineEn: 'An account of the incident in {district}',
      bodyI18nKey: 'news_beat.three_outlet_storm.episodic.brennar_daily_star.body',
      bodyEn:
        'A reconstruction of the incident in {district}, insofar as the available accounts permit one, would describe a discrete occurrence; any wider significance would be premature to assess. The relevant offices have been approached for comment.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.episodic.tilbey_weekly.headline',
      headlineEn: 'One door in {district}: what the incident left behind',
      bodyI18nKey: 'news_beat.three_outlet_storm.episodic.tilbey_weekly.body',
      bodyEn:
        'Behind one door in {district}, a family is putting a week back together. The neighbors brought bread and took the children for an afternoon. "You manage," the mother says — the way people say it when they have had to before.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.episodic.free_weekly.headline',
      headlineEn: 'One more for {district}',
      bodyI18nKey: 'news_beat.three_outlet_storm.episodic.free_weekly.body',
      bodyEn:
        "One family, one mess, one incident — that's the whole story, they say. No pattern, no context, no questions upstairs. The block will file it with all the other one-offs.",
    },
  },
  thematic: {
    default: {
      headlineI18nKey: 'news_beat.three_outlet_storm.thematic.headline',
      headlineEn: 'A citywide pattern behind {subject}',
      bodyI18nKey: 'news_beat.three_outlet_storm.thematic.body',
      bodyEn: '{outlet} places {subject} in a broader citywide context, not an isolated incident.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.three_outlet_storm.thematic.brennar_daily_star.headline',
      headlineEn: 'Incident in {district} said to be consistent with wider trends',
      bodyI18nKey: 'news_beat.three_outlet_storm.thematic.brennar_daily_star.body',
      bodyEn:
        'Placed against comparable occurrences elsewhere in Brennar, the incident in {district} would appear consistent with a broader pattern, the parameters of which remain to be defined. A citywide assessment would seem warranted; none has been announced.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.thematic.tilbey_weekly.headline',
      headlineEn: '{district} is not the only one — ask one neighborhood over',
      bodyI18nKey: 'news_beat.three_outlet_storm.thematic.tilbey_weekly.body',
      bodyEn:
        'What happened in {district} has happened, in its own way, a few bus stops down the line. Same complaints over the counter, same letters, same waiting. People compare notes at the market now, and the notes agree.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.thematic.free_weekly.headline',
      headlineEn: '{district} today. Somewhere else tomorrow',
      bodyI18nKey: 'news_beat.three_outlet_storm.thematic.free_weekly.body',
      bodyEn:
        'Same story all over town, different address each week. Call it a pattern and someone official will call you dramatic. Fine. The block calls it Tuesday.',
    },
  },
  scandal: {
    default: {
      headlineI18nKey: 'news_beat.three_outlet_storm.scandal.headline',
      headlineEn: 'Who is accountable: {subject}',
      bodyI18nKey: 'news_beat.three_outlet_storm.scandal.body',
      bodyEn: '{outlet} frames {subject} as a question of who is responsible.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.three_outlet_storm.scandal.brennar_daily_star.headline',
      headlineEn: 'Questions of accountability said to remain open in {district}',
      bodyI18nKey: 'news_beat.three_outlet_storm.scandal.brennar_daily_star.body',
      bodyEn:
        'The incident in {district} has given rise to questions of accountability which, it would appear, remain open. Which office bears responsibility could not be established by the time of going to press. Requests for clarification are said to be receiving attention.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.scandal.tilbey_weekly.headline',
      headlineEn: 'Somebody signed off on this — {district} would like a word',
      bodyI18nKey: 'news_beat.three_outlet_storm.scandal.tilbey_weekly.body',
      bodyEn:
        'Somebody approved it, somebody signed it, and nobody in {district} can get either name. The shopkeepers have started keeping a list of everyone they have asked. The list is getting long, and it is all questions.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.scandal.free_weekly.headline',
      headlineEn: 'Who signed? {district} asked. Nobody, apparently',
      bodyI18nKey: 'news_beat.three_outlet_storm.scandal.free_weekly.body',
      bodyEn:
        "Somebody is responsible. Somebody always is, and it is never anybody. Ask upstairs and it's the process; ask about the process and it's upstairs. Round and round. The block is left holding the bag either way.",
    },
  },
  human_interest: {
    default: {
      headlineI18nKey: 'news_beat.three_outlet_storm.human_interest.headline',
      headlineEn: 'A neighborhood story: {subject}',
      bodyI18nKey: 'news_beat.three_outlet_storm.human_interest.body',
      bodyEn: '{outlet} follows the people closest to {subject} in {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.three_outlet_storm.human_interest.brennar_daily_star.headline',
      headlineEn: 'Residents of {district} adjust to altered circumstances',
      bodyI18nKey: 'news_beat.three_outlet_storm.human_interest.brennar_daily_star.body',
      bodyEn:
        'For residents of {district}, the aftermath has entailed a series of practical adjustments, described to this paper as considerable. Support measures are understood to be under consideration by the appropriate services.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.human_interest.tilbey_weekly.headline',
      headlineEn: 'The kettle stays on in {district}',
      bodyI18nKey: 'news_beat.three_outlet_storm.human_interest.tilbey_weekly.body',
      bodyEn:
        'In {district} this week, doors stayed open a little longer than usual. The baker set aside the unsold loaves, a retired neighbor walks the children to school, and nobody calls any of it help. "You just do it," she says. That is the whole quote, and it is enough.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.three_outlet_storm.human_interest.free_weekly.headline',
      headlineEn: 'People in {district} manage. They always do',
      bodyI18nKey: 'news_beat.three_outlet_storm.human_interest.free_weekly.body',
      bodyEn:
        'No committee, no plan, no statement. Just neighbors doing what neighbors do while everyone official stays busy being unavailable. Somebody ought to write that down. Nobody official will.',
    },
  },
};

// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C5 (cooper_affair — the frame
//             draw + the reframe daily-probability formula + the resistance rounding + copy)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.5.1 (cooper_affair)
//             + §3.2 phase 4a + §8 (determinism, "IEEE-754 stable" resistance sequence)
//             — 04g-C C5 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `three-outlet-storm.ts`/`hindsight-arc.ts`/`wire-day.ts`'s own posture):
// the 4-frame draw, the reframe daily-probability formula, the IEEE-754-stable resistance rounding, and
// the per-frame copy catalogue `NewsBeatGeneratorService.composeCooperAffairThread`/
// `composeCooperReframeBeat` and `BrennarDailyService.advanceCooperAffairThread` need. The caller owns
// all I/O (repository reads/writes) and all `Rng` instantiation (S7) — this file only consumes draws
// from an ALREADY-SEEDED `Rng` in a FIXED order per function (design §8).

import type { Rng } from '../../common/seeded-rng';
import type { NewsBeatCategoryValue } from './news-beat.types';
import { type OutletVoiced } from './outlet-voice';

/**
 * The 4 canon frames (design §3.5.1/CATALOGUE_REPORT.md :288 "corruption, accident, organized-crime,
 * neighborhood-failure"). A SEPARATE closed union from `three-outlet-storm.ts`'s own `StormFrame` (a
 * DIFFERENT 4-value vocabulary — storm's frames are narrative-STANCE [episodic/thematic/scandal/
 * human_interest], cooper's are causal-EXPLANATION [what caused it] — never conflated, mirrors the
 * codebase's own "small closed lookup table duplicated per-file" precedent already established across
 * `news-beat-digest.ts`/`wire-day.ts`/`three-outlet-storm.ts`).
 */
const COOPER_FRAMES = ['corruption', 'accident', 'organized_crime', 'neighborhood_failure'] as const;
export type CooperFrame = (typeof COOPER_FRAMES)[number];

/** The initial frame draw at OPEN time (design §3.5.1 "frame_id tiré seedé ∈ {4 frames}") — uniform over
 *  all 4, nothing to exclude yet. Consumes exactly 1 `rng.int` draw. */
export function drawInitialCooperFrame(rng: Rng): CooperFrame {
  return COOPER_FRAMES[rng.int(0, COOPER_FRAMES.length - 1)]!;
}

/** A reframe's NEW frame (design §3.5.1 "chaque reframe … applique … new [frame]" — Scénario 2 canon
 *  "frames successifs distincts"): uniform over the 3 OTHER frames, excluding `currentFrame`. Consumes
 *  exactly 1 `rng.int` draw. */
export function drawDistinctCooperFrame(currentFrame: CooperFrame, rng: Rng): CooperFrame {
  const pool = COOPER_FRAMES.filter((f) => f !== currentFrame);
  return pool[rng.int(0, pool.length - 1)]!;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ★ Coder judgment call (documented — design §3.5.1's own formula is terse: "chaque outlet RIVAL peut
// reframer à probabilité décroissante (seedé ; décroissance = la resistance courante)"). No dedicated
// `news_beats.*` tunable names a reframe ATTEMPT probability (only the resistance GROWTH per reframe,
// `cooperReframeResistanceGrowth`, is registered) — this is the SAME class of documented, undocumented-
// by-a-tunable structural constant `wire-day.ts`'s own `WIRE_DAY_LOW_PRODUCTION_WEIGHT_MULTIPLIER`
// precedent establishes: a formula-SHAPE constant, not a gameplay balance knob a designer would tune
// independently.
//
// `COOPER_REFRAME_DAILY_BASE_PROBABILITY = 0.15`: the daily attempt probability PER rival outlet, at
// `reframeResistance = 0.0` (the story's freshest, most reframeable state); the ACTUAL probability decays
// as `base × (1 − reframeResistance)` (below) — the "décroissance = la resistance courante" canon phrase
// realized literally. 0.15 was chosen (not e.g. 0.5) so that a brute-force search for an 18-game-day
// window with ZERO reframes across BOTH rivals (the half-life-path E2E floor scenario) stays FINDABLE
// within a reasonable candidate-id search space: with 2 rivals/day, P(a day has ≥1 pass) = 1 −
// (1−0.15)² ≈ 0.2775, so P(zero passes across 18 days) ≈ 0.7225¹⁸ ≈ 0.29% — findable within a few
// hundred brute-forced candidate thread-ids (mirrors `news_beat_storm_folded_page_c4.spec.ts`'s own
// `synthesizeCandidateUuid` brute-force precedent). The SAME 0.15 base still keeps the POSITIVE
// 3-reframe Scénario-2 path fast to find via a plain sequential day-scan (expected ~4, ~5, ~9 days per
// successive reframe as resistance grows — see the decay formula below).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
export const COOPER_REFRAME_DAILY_BASE_PROBABILITY = 0.15;

/** The reframe attempt probability for ONE rival outlet on a given day, given the thread's CURRENT
 *  `reframeResistance` (design §3.5.1 "décroissance = la resistance courante" — realized as a direct
 *  linear damping of the base rate; clamped ≥0, defensive against a resistance > 1 which never occurs in
 *  practice since `cooperMaxReframes` closes the thread before resistance could exceed 1.0 at the
 *  canon 0.3/reframe growth). */
export function computeCooperReframeProbability(reframeResistance: number): number {
  return Math.max(0, COOPER_REFRAME_DAILY_BASE_PROBABILITY * (1 - reframeResistance));
}

/**
 * IEEE-754-stable rounding (design §8 "la séquence reframe_resistance doit être IEEE-754 stable — 0.3
 * increments"): plain repeated `+=` accumulation of a double like `0.3` drifts by a few ULPs (the classic
 * `0.1 + 0.2 !== 0.3` class of error — concretely, `0.6 + 0.3 → 0.8999999999999999` in JS, NOT the
 * literal `0.9` an E2E `toBe(0.9)` assertion expects). Rounding through a fixed-precision decimal string
 * forces the result back to the SAME double bit pattern a plain numeric literal at that precision would
 * produce. 10 decimals is comfortably above the ~1e-16 magnitude of the accumulation error while still
 * supporting an arbitrarily-precise `cooperReframeResistanceGrowth` override (never hardcoding an
 * assumption of exactly 1 decimal digit, which the DEFAULT 0.3 happens to have but a future override
 * might not).
 */
export function roundToStableDecimal(value: number, decimals = 10): number {
  return Number(value.toFixed(decimals));
}

/** One per-frame copy entry (design §3.7 D12 — real EN copy authored HERE, at the chunk that ships the
 *  cooper_affair lifecycle). Plain neutral journalistic framing language per frame — no urgency/FOMO % allowed-mention: design comment stating the copy is NOT urgency/FOMO framed (R4.1 self-clearance), not narrative usage
 *  copy (R4.1 grep-gate). Reframe beats reuse the SAME per-frame entries (the frame changes, the copy
 *  SHAPE per frame does not — mirrors `STORM_COPY`'s own per-frame reuse across the storm's 3
 *  simultaneous beats). */
export interface CooperCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** 4 entries — one per `CooperFrame` (design §3.5.1 "frame_id tiré seedé ∈ les 4 frames canon"), each
 *  now `OutletVoiced` (Brennar-voice design §2.1/§7.1, SUPERSEDES the Phase-1 §4.1 reference): the
 *  pre-lot neutral string is demoted byte-identical to `default` (§2.2 REUSE — zero key churn), and the
 *  3 canon outlets each get their own sharpened §3.5-register variant, `{district}`-only (DV-2/F-1 —
 *  cooper binds no `subject`, so voiced copy never references one). */
export const COOPER_COPY: Readonly<Record<CooperFrame, OutletVoiced<CooperCopyEntry>>> = {
  corruption: {
    default: {
      headlineI18nKey: 'news_beat.cooper_affair.corruption.headline',
      headlineEn: 'Questions of influence follow {subject} in {district}',
      bodyI18nKey: 'news_beat.cooper_affair.corruption.body',
      bodyEn: '{outlet} frames {subject} in {district} as a matter of who benefited, and how.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.cooper_affair.corruption.brennar_daily_star.headline',
      headlineEn: 'Questions relating to {district} said to warrant review',
      bodyI18nKey: 'news_beat.cooper_affair.corruption.brennar_daily_star.body',
      bodyEn:
        'Questions relating to the matter in {district} are said to warrant review; it remains to be established to whom the situation may have proven advantageous. A monitoring framework would be under consideration. The relevant offices, when approached, did not respond.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.corruption.tilbey_weekly.headline',
      headlineEn: 'From the baker to the bus stop, {district} has the same question',
      bodyI18nKey: 'news_beat.cooper_affair.corruption.tilbey_weekly.body',
      bodyEn:
        'Ask around {district} and it is the same from the baker to the bus stop: money moved, and someone did well by it. "We weren\'t born yesterday," one resident says. People wrote letters asking about it; the letters, so far, have not been answered.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.corruption.free_weekly.headline',
      headlineEn: 'Clean hands in {district}? Sure',
      bodyI18nKey: 'news_beat.cooper_affair.corruption.free_weekly.body',
      bodyEn:
        'Money moved, favors moved with it, and the block gets the bill. Case opened, case closed: nothing found. They looked, they say. Sure they did.',
    },
  },
  accident: {
    default: {
      headlineI18nKey: 'news_beat.cooper_affair.accident.headline',
      headlineEn: 'What went wrong: {subject} in {district}',
      bodyI18nKey: 'news_beat.cooper_affair.accident.body',
      bodyEn: '{outlet} treats {subject} in {district} as an unfortunate, unintended failure.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.cooper_affair.accident.brennar_daily_star.headline',
      headlineEn: 'A sequence of circumstances in {district}, currently under study',
      bodyI18nKey: 'news_beat.cooper_affair.accident.brennar_daily_star.body',
      bodyEn:
        'The incident in {district} would appear to have resulted from a sequence of circumstances currently under study. No intent has been established, nor, it is suggested, should any be inferred. It would seem appropriate for a review to be undertaken in due course; no timetable has been communicated.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.accident.tilbey_weekly.headline',
      headlineEn: 'Bad luck in {district} — the kind that picks its address',
      bodyI18nKey: 'news_beat.cooper_affair.accident.tilbey_weekly.body',
      bodyEn:
        'People in {district} are still sweeping up and still asking how. At the bakery and at the bus stop the word is the same: bad luck, the kind that always lands on the same doorsteps. "You patch up and you wait for the next one," one shopkeeper says.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.accident.free_weekly.headline',
      headlineEn: 'An accident. In {district}. Another one',
      bodyI18nKey: 'news_beat.cooper_affair.accident.free_weekly.body',
      bodyEn:
        "Nobody's fault, nothing to see, moving on — that's the official version, anyway. The block keeps its own count, and the count says: another one, same place as ever. You don't say.",
    },
  },
  organized_crime: {
    default: {
      headlineI18nKey: 'news_beat.cooper_affair.organized_crime.headline',
      headlineEn: 'A familiar hand behind {subject} in {district}',
      bodyI18nKey: 'news_beat.cooper_affair.organized_crime.body',
      bodyEn: '{outlet} reads {subject} in {district} as the mark of an organized operation.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.cooper_affair.organized_crime.brennar_daily_star.headline',
      headlineEn: 'Indications of coordination in {district} said to be under assessment',
      bodyI18nKey: 'news_beat.cooper_affair.organized_crime.brennar_daily_star.body',
      bodyEn:
        'Certain aspects of the incident in {district} are said to suggest a degree of coordination; any such assessment would remain preliminary. This paper has not independently confirmed the accounts on which it rests, and the relevant offices declined to elaborate.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.organized_crime.tilbey_weekly.headline',
      headlineEn: 'Too tidy, too quick: {district} draws its own conclusions',
      bodyI18nKey: 'news_beat.cooper_affair.organized_crime.tilbey_weekly.body',
      bodyEn:
        'More than one neighbor in {district} says the same thing on the doorstep: too tidy and too quick to be chance. "Work like that gets planned," one shopkeeper says, and lowers his voice to say it. Others keep the door shut — which says its own thing.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.organized_crime.free_weekly.headline',
      headlineEn: 'Planned? In {district}? You don\'t say',
      bodyI18nKey: 'news_beat.cooper_affair.organized_crime.free_weekly.body',
      bodyEn:
        "Somebody set this up and the whole block knows it. The only ones still calling it a mystery are paid to call it a mystery. There's an inquiry, they say. Ongoing, they say. Sure.",
    },
  },
  neighborhood_failure: {
    default: {
      headlineI18nKey: 'news_beat.cooper_affair.neighborhood_failure.headline',
      headlineEn: '{district} left to its own devices, again',
      bodyI18nKey: 'news_beat.cooper_affair.neighborhood_failure.body',
      bodyEn: '{outlet} places {subject} inside a longer pattern of neglect in {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.headline',
      headlineEn: 'Conditions in {district} said to predate the incident by some years',
      bodyI18nKey: 'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.body',
      bodyEn:
        'The incident in {district} would appear attributable to difficulties said to predate it by some years. The maintenance of services in the area has been the subject of previous reviews, the conclusions of which were not made public. A further review would be under consideration.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.headline',
      headlineEn: '{district} saw it coming — and said so, in writing',
      bodyI18nKey: 'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.body',
      bodyEn:
        'The story in {district} is older than the incident: bus lines cut, letters unanswered, promises that moved on. People here asked, twice, in writing, and kept the copies. This week the bill came due, and it came here.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.cooper_affair.neighborhood_failure.free_weekly.headline',
      headlineEn: '{district}, left to itself. As usual',
      bodyI18nKey: 'news_beat.cooper_affair.neighborhood_failure.free_weekly.body',
      bodyEn:
        "Same block, same neglect, new headline. They'll come take pictures, then it's back to normal — and normal around here means nothing works. Same page again next time.",
    },
  },
};

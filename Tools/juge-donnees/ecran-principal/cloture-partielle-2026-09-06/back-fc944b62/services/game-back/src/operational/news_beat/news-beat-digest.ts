// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (phase 5 digest fill — pure
//             ranking + copy catalogue)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.2 phase 5 (ranking:
//             severity → recency → seeded tie-break) + §3.7 (copy & i18n, D12 — real EN copy authored
//             inline, per sourceKind for digests)
//             — 04g-C C2 — 2026-07-16
//
// Pure, zero-I/O module (mirrors `recovery-curve.ts`/`district-hum-weighting.ts`'s own "pure module, no
// DI registration needed" posture): the digest ranking algorithm + the digest copy catalogue.
// `BrennarDailyService` (the ONLY consumer) owns all I/O (repository reads/writes); this file never
// touches the DB / RNG-seeds-itself — the caller supplies the `Rng` instance (S7).

import type { Rng } from '../../common/seeded-rng';
import type { FodderItem, FodderSeverityBand, FodderSourceKind } from './news-beat.types';
import { type OutletVoiced } from './outlet-voice';

const SEVERITY_RANK: Readonly<Record<FodderSeverityBand, number>> = { high: 2, noticeable: 1, low: 0 };

/**
 * Phase 5 ranking (design §3.2: "ranking fodder rankée (sévérité puis récence puis tie-break seedé)").
 * Groups items sharing the identical (severity, occurredAtGameDay) key — genuine ties — and resolves
 * EACH group with a seeded draw-without-replacement (mirrors `random-world-event-generator.service.ts`'s
 * own `drawDistinct` seeded-pick idiom; kept local here per `ambient-clock.ts`/`random-world-clock.ts`'s
 * own "REUSE would create a cross-module import for a small self-contained helper" precedent). Consumes
 * exactly `items.length` `rng.int` draws total, group by group in severity-desc/recency-desc order — the
 * FIXED draw order design §8 requires.
 */
export function rankFodderForDigest(items: readonly FodderItem[], rng: Rng): FodderItem[] {
  const groups = new Map<string, FodderItem[]>();
  for (const item of items) {
    const key = `${SEVERITY_RANK[item.severityBand]}:${item.occurredAtGameDay}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    const [aSeverity, aDay] = a.split(':').map(Number) as [number, number];
    const [bSeverity, bDay] = b.split(':').map(Number) as [number, number];
    if (aSeverity !== bSeverity) return bSeverity - aSeverity; // severity desc
    return bDay - aDay; // recency desc
  });
  const ranked: FodderItem[] = [];
  for (const key of orderedKeys) {
    ranked.push(...drawAllSeeded(groups.get(key)!, rng));
  }
  return ranked;
}

/** Seeded draw-without-replacement of the WHOLE array (a full shuffle within one tie-group) — consumes
 *  exactly `items.length` `rng.int` draws. */
function drawAllSeeded<T>(items: readonly T[], rng: Rng): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length > 0) {
    out.push(...pool.splice(rng.int(0, pool.length - 1), 1));
  }
  return out;
}

/** The falsifiable dedup key (design §3.3: "un fodder ref déjà cité … n'est pas re-cité"). */
export function fodderRefKey(sourceKind: FodderSourceKind, refId: string): string {
  return `${sourceKind}:${refId}`;
}

/** One digest copy entry (design §3.7 D12 — real EN copy authored HERE, at the chunk that ships the
 *  digest, per `FodderSourceKind` — narrative structure, not lorem; params `{district}`/`{subject}`/
 *  `{outlet}`). NOT registered in `i18n/string_table.ts` (that registry is a cross-cutting skeleton,
 *  DEFERRED full catalogue — mirrors `political-event-catalogue.ts`'s `newsFeedCopy` /
 *  `live-ops-event-catalogue.ts`'s `noticeCopy` OWN-module-inline convention, confirmed C0 §4: "no
 *  separate bundle files — the real EN copy lives inline in the catalogue TS files themselves"). */
export interface NewsBeatDigestCopyEntry {
  readonly headlineI18nKey: string;
  readonly headlineEn: string;
  readonly bodyI18nKey: string;
  readonly bodyEn: string;
}

/** 4 entries — one per `FodderSourceKind` (design §3.7: "clés par … (sourceKind × kind) pour les
 *  digests" — C2 keys per sourceKind only; splitting further per ambient `kind` is not required by any
 *  C2 acceptance criterion and would be premature granularity without a consumer that reads it). Plain
 *  neutral journalistic language — no urgency framing, no ticking-clock copy (R4.2 anosmia, brand
 *  % allowed-mention: design comment naming the invariant, not narrative usage — grep-gate S13). */
/** 4 entries — one per `FodderSourceKind`, each now `OutletVoiced` (Brennar-voice design §2.1/§7.3):
 *  the pre-lot neutral string is demoted byte-identical to `default` (§2.2 REUSE). `random_world`/
 *  `ambient_micro` voiced copy binds `{district}`; `political`/`live_ops` are citywide (`districtId`
 *  null) and bind NO param at all, mirroring the defaults' own per-kind usage (design §7.9). This same
 *  catalogue is also selected on the COVERING outlet's key for `folded_page`'s covering beats (DV-6,
 *  generator `applySpiralOfSilenceOmission`) — no folded_page-specific digest copy exists. */
export const NEWS_BEAT_DIGEST_COPY: Readonly<Record<FodderSourceKind, OutletVoiced<NewsBeatDigestCopyEntry>>> = {
  random_world: {
    default: {
      headlineI18nKey: 'news_beat.digest.random_world.headline',
      headlineEn: 'Unrest reported in {district}',
      bodyI18nKey: 'news_beat.digest.random_world.body',
      bodyEn: '{outlet} notes an unresolved disturbance tied to {subject} in {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.digest.random_world.brennar_daily_star.headline',
      headlineEn: 'Disturbance in {district} noted',
      bodyI18nKey: 'news_beat.digest.random_world.brennar_daily_star.body',
      bodyEn:
        'A disturbance in {district} remains, it would appear, unresolved. The circumstances are said to be under review by the appropriate services; no timetable has been communicated.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.digest.random_world.tilbey_weekly.headline',
      headlineEn: 'The trouble in {district} has not settled, neighbors say',
      bodyI18nKey: 'news_beat.digest.random_world.tilbey_weekly.body',
      bodyEn:
        'Word over the counter in {district} is that the trouble has not settled. People are keeping an eye out for one another and waiting, again, for someone to say something official.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.digest.random_world.free_weekly.headline',
      headlineEn: 'Still going, in {district}',
      bodyI18nKey: 'news_beat.digest.random_world.free_weekly.body',
      bodyEn: 'The thing in {district}? Still happening. Nobody upstairs has said a word. The block was not expecting one.',
    },
  },
  political: {
    default: {
      headlineI18nKey: 'news_beat.digest.political.headline',
      headlineEn: "City Hall's business, briefly",
      bodyI18nKey: 'news_beat.digest.political.body',
      bodyEn: '{outlet} covers a political development: {subject}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.digest.political.brennar_daily_star.headline',
      headlineEn: 'Deliberations understood to continue at City Hall',
      bodyI18nKey: 'news_beat.digest.political.brennar_daily_star.body',
      bodyEn:
        'Proceedings at City Hall are understood to be continuing; a communiqué would be expected in due course. The offices concerned declined to anticipate its contents.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.digest.political.tilbey_weekly.headline',
      headlineEn: 'City Hall stirs; the neighborhoods take note',
      bodyI18nKey: 'news_beat.digest.political.tilbey_weekly.body',
      bodyEn:
        'Something is moving at City Hall, and people here have learned to read that the way sailors read weather. Whatever lands, it lands on streets like these first.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.digest.political.free_weekly.headline',
      headlineEn: 'City Hall did a thing',
      bodyI18nKey: 'news_beat.digest.political.free_weekly.body',
      bodyEn: 'Meetings, statements, the usual weather out of City Hall. What it means for the block: wait and see. What the block expects: not much.',
    },
  },
  live_ops: {
    default: {
      headlineI18nKey: 'news_beat.digest.live_ops.headline',
      headlineEn: 'A citywide notice circulates',
      bodyI18nKey: 'news_beat.digest.live_ops.body',
      bodyEn: '{outlet} reports a citywide development: {subject}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.digest.live_ops.brennar_daily_star.headline',
      headlineEn: 'A notice of general application circulates',
      bodyI18nKey: 'news_beat.digest.live_ops.brennar_daily_star.body',
      bodyEn:
        'A notice of general application is in circulation citywide. Its practical effects, insofar as they can be assessed at this stage, would appear to vary; residents are advised to consult the notice itself.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.digest.live_ops.tilbey_weekly.headline',
      headlineEn: 'A citywide notice, and what it means on our streets',
      bodyI18nKey: 'news_beat.digest.live_ops.tilbey_weekly.body',
      bodyEn:
        'There is a new notice going around town. What it means depends, as ever, on which street you live on. People here are already comparing notes over the counter.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.digest.live_ops.free_weekly.headline',
      headlineEn: 'New notice. Whole city. Noted',
      bodyI18nKey: 'news_beat.digest.live_ops.free_weekly.body',
      bodyEn: "Another notice for all of Brennar. Everyone is covered; nobody was asked. It's on every wall by now.",
    },
  },
  ambient_micro: {
    default: {
      headlineI18nKey: 'news_beat.digest.ambient_micro.headline',
      headlineEn: 'Small stories from {district}',
      bodyI18nKey: 'news_beat.digest.ambient_micro.body',
      bodyEn: '{outlet} catches a street-level note: {subject}, {district}.',
    },
    brennar_daily_star: {
      headlineI18nKey: 'news_beat.digest.ambient_micro.brennar_daily_star.headline',
      headlineEn: 'Minor occurrences in {district} recorded',
      bodyI18nKey: 'news_beat.digest.ambient_micro.brennar_daily_star.body',
      bodyEn:
        'A number of minor occurrences in {district} have been recorded this week. None would appear, at this stage, to warrant further examination. The record is retained.',
    },
    tilbey_weekly: {
      headlineI18nKey: 'news_beat.digest.ambient_micro.tilbey_weekly.headline',
      headlineEn: 'Small news from {district}, which is still news',
      bodyI18nKey: 'news_beat.digest.ambient_micro.tilbey_weekly.body',
      bodyEn:
        'The small stuff from {district} this week — the kind of thing that never makes a front page and is all anyone actually talks about over the counter.',
    },
    free_weekly: {
      headlineI18nKey: 'news_beat.digest.ambient_micro.free_weekly.headline',
      headlineEn: 'Meanwhile, in {district}',
      bodyI18nKey: 'news_beat.digest.ambient_micro.free_weekly.body',
      bodyEn: 'Little things. Corner things. The stuff nobody official counts and everybody local notices. Noted here, then, since somebody has to.',
    },
  },
};

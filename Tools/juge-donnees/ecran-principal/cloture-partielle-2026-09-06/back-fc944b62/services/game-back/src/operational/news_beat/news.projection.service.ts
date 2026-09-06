// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C6 (news.projection.service.ts —
//             the player feed/detail projection)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §6.1 (Player surface —
//             P5 projection qualitative, R2.2, pull-only)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D5 (persistence
//             window = read-only query predicate, zero sweep) + D14 (feed is city-wide, no per-player
//             building scoping — deliberate contrast with `/v1/random-world/active`)
//             P5 pattern seam: `operational/random_world/random-world.projection.service.ts` (the SAME
//             "raw row → qualitative bands + i18n keys, NEVER a raw scalar" template applied here).
//             — 04g-C C6 — 2026-07-16
//
// `NewsProjectionService` (canon gdd/15 — NEVER `NewsService` plain, glossary interdit `News` nu, D18).
// Maps RAW `news_beat` rows → QUALITATIVE payloads: i18n keys + a closed-domain `recency_band`, NEVER a
// raw scalar (R2.2 — no `resistance`, no `salience`, no `interest`, no `readiness`, no `half_life`, no
// `probability` — grep-zero at the floor, mirrors `RandomWorldProjectionService`'s own R2.2 posture).
//
// ★ D14 — the feed is the SAME for EVERY player (the city's paper — deliberate contrast with
// `/v1/random-world/active`'s per-player building-district scoping): `listFeed`/`getBeatDetail` take NO
// `playerId` parameter at all — there is nothing to scope BY.
//
// BAND DERIVATION (design leaves the exact cut-points to "bandes serveur" — the SAME judgment-call class
// `RandomWorldProjectionService`'s own header documents): `recency_band` is derived from REAL-clock
// elapsed hours since `created_at` (the feed's ENTIRE temporal axis is real-time, decisions D5 — UNLIKE
// `RandomWorldActiveEventView.recency_band`, which is game-day-based): <6h → 'fresh'; <24h → 'settling';
// else (up to the 48h persistence-window edge) → 'fading'.

import { Injectable } from '@nestjs/common';

import type { NewsBeatCategoryValue } from './news-beat.types';
import type { NewsBeatRow } from '../../db/schema/news_beat';
import { NewsBeatRepository } from './news-beat.repository';
import { newsBeatTunables } from './news-beat.tunables';
import { journalistByKey, pressOutletByKey } from './press-registry';

export type NewsFeedRecencyBand = 'fresh' | 'settling' | 'fading';

/**
 * `frame_tag` labels (design §6.1 "headline and frame tag", D12 — real EN copy authored HERE, the first
 * chunk to expose `news_beat.frame` to a player at all). The 8 possible `beat.frame` values across every
 * frame-carrying template (cooper_affair's 4 causal-explanation frames + the 4 narrative-stance frames
 * `three_outlet_storm`/`wire_day` share, `cooper-affair.ts`/`three-outlet-storm.ts`'s own closed unions) —
 * a single flat i18n namespace suffices since the 2 vocabularies never overlap (disjoint string sets).
 * Plain neutral qualitative labels — no urgency/FOMO framing (R4.1 grep-gate). % allowed-mention: design comment (R4.1 self-clearance stating the labels are deliberately NOT urgency/FOMO framed), not narrative usage
 */
const FRAME_TAG_LABELS_EN: Readonly<Record<string, string>> = {
  corruption: 'Corruption angle',
  accident: 'Accident angle',
  organized_crime: 'Organized-crime angle',
  neighborhood_failure: 'Neighborhood-failure angle',
  episodic: 'Episodic angle',
  thematic: 'Thematic angle',
  scandal: 'Scandal angle',
  human_interest: 'Human-interest angle',
};

/** `news_beat.frame_tag.<frame>` — `null` when the beat has no frame concept (design §4.1 schema
 *  comment). An UNKNOWN frame string (should never occur — every producer draws from a closed union)
 *  still yields a well-formed key rather than throwing; `FRAME_TAG_LABELS_EN` above documents the
 *  EXPECTED 8 values for the i18n bundle author, it is not itself a validation gate. */
function frameTagI18nKey(frame: string | null): string | null {
  return frame ? `news_beat.frame_tag.${frame}` : null;
}

// Maillon 3 (chantier "les maillons back des écrans neufs", 2026-09-03, front.md ㊳ — no TD number was
// pre-assigned for this one, unlike TD-530/TD-556) — `headline_params`
// (below, on BOTH views) is a free-keys `Record<string, unknown>`: `JsonUtility` (Unity's client-side
// deserializer) cannot read it — it only binds DECLARED fields (front.md ㊳'s own finding: "⛔
// `headline_params` est un objet libre : le titre est un gabarit à trous, et sans le texte on ignore
// même combien de trous").
//
// MEASURED first (per brief): `news_beat.params`'s ONLY writer is `news-beat-generator.service.ts` (9
// call sites — `insertTemplateBeat`/`insertOneShotBeat`-equivalent literals across cooper_affair, wire_
// day, three_outlet_storm, digest, folded_page, hindsight, sourceless_beat, slow_page) and every single
// one draws EXCLUSIVELY from the SAME 4-key set: `district`, `subject`, `outlet`, `frame` — confirmed by
// the schema's own doc comment (`db/schema/news_beat.ts:180`: "i18n interpolation params: {district},
// {subject}, {frame}, {outlet} (decisions D12)") and re-confirmed live against `GET /v1/news/feed`
// (implementation-notes.md). The domain is CLOSED and SMALL — no producer has ever emitted a 5th key —
// so a generic `{key,value}[]` array would be unneeded complication (the brief's own framing): declaring
// the 4 fields directly is the right shape for a Unity DTO.
//
// `headline_params` STAYS untouched (additive-only) — this is a NEW sibling field, never a replacement.
export interface NewsHeadlineParams {
  /** `district-${id}` slug, or `null` for a national/citywide beat — SAME value as the view's own
   *  top-level `district` field (both derive from `row.district_id`); still needed HERE because the ICU
   *  headline template substitutes on the PARAM NAME `district`, not on the view's sibling field. */
  readonly district?: string | null;
  /** An i18n key naming the beat's subject (design §6.1 "jamais les refIds bruts") — present on
   *  digest/hindsight/wire_day/three_outlet_storm/folded_page beats, absent on cooper_affair/
   *  sourceless_beat/slow_page (per-template composition, see `NewsBeatDetailView.subject_i18n_key`'s
   *  own header for the exact split). */
  readonly subject?: string;
  /** The outlet's i18n name key — SAME value as the view's own `outlet_i18n_key` (both derive from
   *  `pressOutletByKey(row.outlet_key).nameI18nKey`); present on every beat (every template sets it). */
  readonly outlet?: string;
  /** The RAW frame id (e.g. `'corruption'`) — NOT the same value as `frame_tag_i18n_key` (which prefixes
   *  it into a resolvable key, `news_beat.frame_tag.<frame>`); `null`/absent for a template with no
   *  frame concept (digest/hindsight/folded_page/sourceless/slow_page). */
  readonly frame?: string | null;
}

/** Picks the closed 4-key domain out of a raw `news_beat.params` jsonb blob — never throws, drops any
 *  unexpected key/type silently (mirrors `buildingTypeFromRawInt`/`rivalNameRef`'s "never crash the
 *  whole response on an out-of-domain value" posture): a future 5th param a producer might add reaches
 *  the client via `headline_params` regardless (untouched), just not via this declared sibling until a
 *  future lot widens it. */
function toDeclaredHeadlineParams(params: Readonly<Record<string, unknown>>): NewsHeadlineParams {
  const pickString = (key: string): string | undefined => (typeof params[key] === 'string' ? (params[key] as string) : undefined);
  const district = params['district'];
  return {
    district: district === null ? null : typeof district === 'string' ? district : undefined,
    subject: pickString('subject'),
    outlet: pickString('outlet'),
    frame: params['frame'] === null ? null : pickString('frame'),
  };
}

/** ONE feed beat, player-facing (R2.2 grep-zero: no numeric leaf anywhere, design §6.1). */
export interface NewsFeedBeatView {
  readonly beat_id: string;
  readonly headline_i18n_key: string;
  readonly headline_params: Readonly<Record<string, unknown>>;
  /** Maillon 3 (2026-09-03) — ADDITIVE, `NewsHeadlineParams`'s own header. */
  readonly headline_params_fields: NewsHeadlineParams;
  readonly category: NewsBeatCategoryValue;
  readonly outlet_i18n_key: string;
  /** `null` for a template with no frame concept (digest/hindsight/folded_page/sourceless/slow_page —
   *  design §4.1 schema comment). */
  readonly frame_tag_i18n_key: string | null;
  /** `district-${id}` slug (mirrors `RandomWorldActiveEventView.district`'s own i18n-interpolatable
   *  convention) — `null` for a national/citywide beat. */
  readonly district: string | null;
  readonly recency_band: NewsFeedRecencyBand;
}

/** The beat detail view (design §6.1: "body i18n + source_attribution PROJETÉE qualitative … + le sujet
 *  fodder en i18n — jamais les refIds bruts ni les compteurs"). */
export interface NewsBeatDetailView {
  readonly beat_id: string;
  readonly headline_i18n_key: string;
  readonly headline_params: Readonly<Record<string, unknown>>;
  /** Maillon 3 (2026-09-03) — ADDITIVE, `NewsHeadlineParams`'s own header. Same field NAME as the feed
   *  view's own sibling above (the SAME underlying `row.params`, same producer) — a direct neighbor of
   *  the named finding, not a separate class. */
  readonly headline_params_fields: NewsHeadlineParams;
  readonly body_i18n_key: string;
  readonly body_params: Readonly<Record<string, unknown>>;
  readonly category: NewsBeatCategoryValue;
  readonly frame_tag_i18n_key: string | null;
  readonly district: string | null;
  readonly outlet_i18n_key: string;
  /** `null` for wire copy (no local byline) AND for sourceless_beat (canon "Page-Three Item with no
   *  source" — the DB row DOES carry a real `journalist_key`, design D7's own readiness-reset
   *  derivation, but the detail view deliberately suppresses it here in favor of `sourceless_badge`
   *  below — a documented projection choice, never a raw leak of the internal bookkeeping column). */
  readonly byline_i18n_key: string | null;
  /** `source_attribution.sourceless === true` (canon "no cited source" badge, design §6.1). */
  readonly sourceless_badge: boolean;
  /** `source_attribution.wireSourceId !== undefined` (canon "wire copy" badge, design §6.1). */
  readonly wire_badge: boolean;
  /** `params.subject` WHEN the composing template set one (digest/hindsight/wire_day/three_outlet_storm/
   *  folded_page beats always do; cooper_affair/sourceless_beat/slow_page do not, design's own
   *  per-template composition — see e.g. `composeCooperAffairThread`'s own doc comment) — `null`
   *  otherwise. ★ F-2 fix (Brennar-voice design §2.6/§7.0, comment-only, no behavior change): this
   *  comment previously listed three_outlet_storm/folded_page alongside cooper_affair/sourceless_beat/
   *  slow_page as NOT binding `params.subject` — the generator has always bound it for BOTH
   *  (`composeThreeOutletStormBeats`, `applySpiralOfSilenceOmission`'s covering + hollow beats), a
   *  comment-vs-code drift the copy design flagged; corrected here to match the code. Already an i18n
   *  key by construction at EVERY producer, never a raw refId (design §6.1 "jamais les refIds bruts"). */
  readonly subject_i18n_key: string | null;
}

const FEED_PAGE_SIZE_DEFAULT = 20;
const FEED_PAGE_SIZE_MAX = 100;

interface FeedCursor {
  readonly createdAt: Date;
  readonly id: string;
}

/** Opaque base64 cursor (design §6.1 "pagination cursor" — a keyset cursor over `(created_at, id)`,
 *  never an offset: stable under concurrent inserts, the acceptance floor's own "cursor pagination
 *  stable" requirement). */
function encodeCursor(row: NewsBeatRow): string {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at.toISOString(), id: row.id }), 'utf-8').toString('base64url');
}

function decodeCursor(raw: string | undefined): FeedCursor | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as { createdAt: string; id: string };
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || typeof parsed.id !== 'string') return undefined;
    return { createdAt, id: parsed.id };
  } catch {
    return undefined; // a malformed/tampered cursor is treated as "no cursor" (first page) — never crashes.
  }
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set(['national', 'brennar_local', 'business', 'arts', 'sports']);

function normalizeCategory(raw: string | undefined): NewsBeatCategoryValue | undefined {
  return raw && VALID_CATEGORIES.has(raw) ? (raw as NewsBeatCategoryValue) : undefined;
}

@Injectable()
export class NewsProjectionService {
  constructor(private readonly repo: NewsBeatRepository) {}

  /**
   * `GET /v1/news/feed?category=&cursor=&limit=` projection (design §6.1): every beat within the
   * REAL-clock persistence window, city-wide (D14 — NO player scoping), optionally narrowed to ONE
   * category, newest-first, keyset-paginated. An invalid/absent `category` is simply NOT filtered
   * (never throws on a bad query param); an invalid/absent `cursor` is treated as the first page.
   */
  async listFeed(rawCategory: string | undefined, rawCursor: string | undefined, rawLimit: number | undefined): Promise<{
    beats: NewsFeedBeatView[];
    nextCursor: string | null;
  }> {
    const category = normalizeCategory(rawCategory);
    const cursor = decodeCursor(rawCursor);
    const limit = Number.isFinite(rawLimit) && rawLimit! > 0 ? Math.min(Math.floor(rawLimit!), FEED_PAGE_SIZE_MAX) : FEED_PAGE_SIZE_DEFAULT;

    const { rows, hasMore } = await this.repo.listFeedBeats(newsBeatTunables.beatPersistenceInFeedHours, limit, category, cursor);
    const nowMs = Date.now();
    const beats = rows.map((row) => this.toFeedView(row, nowMs));
    const nextCursor = hasMore && rows.length > 0 ? encodeCursor(rows[rows.length - 1]!) : null;
    return { beats, nextCursor };
  }

  /**
   * `GET /v1/news/beats/:id` detail (design §6.1). `undefined` if unknown (the controller maps this to
   * 404) — no persistence-window filter (a direct id lookup, `NewsBeatRepository.getBeatById`'s own doc
   * comment).
   */
  async getBeatDetail(id: string): Promise<NewsBeatDetailView | undefined> {
    const row = await this.repo.getBeatById(id);
    if (!row) return undefined;
    return this.toDetailView(row);
  }

  private toFeedView(row: NewsBeatRow, nowMs: number): NewsFeedBeatView {
    const params = (row.params ?? {}) as Record<string, unknown>;
    return {
      beat_id: row.id,
      headline_i18n_key: row.headline_i18n_key,
      headline_params: params,
      headline_params_fields: toDeclaredHeadlineParams(params),
      category: row.beat_category,
      outlet_i18n_key: pressOutletByKey(row.outlet_key).nameI18nKey,
      frame_tag_i18n_key: frameTagI18nKey(row.frame),
      district: row.district_id !== null ? `district-${row.district_id}` : null,
      recency_band: this.recencyBandFor(nowMs, row.created_at),
    };
  }

  private toDetailView(row: NewsBeatRow): NewsBeatDetailView {
    const attribution = (row.source_attribution ?? {}) as { sourceless?: boolean; wireSourceId?: string };
    const sourcelessBadge = attribution.sourceless === true;
    const params = (row.params ?? {}) as Record<string, unknown>;
    const subjectRaw = params['subject'];
    return {
      beat_id: row.id,
      headline_i18n_key: row.headline_i18n_key,
      headline_params: params,
      headline_params_fields: toDeclaredHeadlineParams(params),
      body_i18n_key: row.body_i18n_key,
      body_params: params,
      category: row.beat_category,
      frame_tag_i18n_key: frameTagI18nKey(row.frame),
      district: row.district_id !== null ? `district-${row.district_id}` : null,
      outlet_i18n_key: pressOutletByKey(row.outlet_key).nameI18nKey,
      byline_i18n_key: !sourcelessBadge && row.journalist_key ? journalistByKey(row.journalist_key).nameI18nKey : null,
      sourceless_badge: sourcelessBadge,
      wire_badge: attribution.wireSourceId !== undefined,
      subject_i18n_key: typeof subjectRaw === 'string' ? subjectRaw : null,
    };
  }

  private recencyBandFor(nowMs: number, createdAt: Date): NewsFeedRecencyBand {
    const elapsedHours = (nowMs - createdAt.getTime()) / (60 * 60 * 1000);
    if (elapsedHours < 6) return 'fresh';
    if (elapsedHours < 24) return 'settling';
    return 'fading';
  }
}

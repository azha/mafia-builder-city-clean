// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (news-beat-template-
//             registry.ts, 12 entries)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.1 (the 12-template
//             registry — 7 LIVE / 5 registry-only, D2)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §NEWS-BEAT (:280-546, 12
//             templates, canonical order + verbatim flag/score — freshly re-grepped 2026-07-16,
//             per-entry `catalogueRef` cites the EXACT heading-to-next-heading line range)
//             docs/tech/04g_ambient_world_events_templates/news_beat_templates.md :34-49 (the 12-row
//             summary table this file mirrors structurally — "canonical CATALOGUE_REPORT order")
//             — 04g-C C1 — 2026-07-16
//
// `NewsBeatTemplateRegistry` (glossary gdd/15:1840) — the static 12-entry catalogue, form mirrors
// `RANDOM_WORLD_TEMPLATE_REGISTRY` (04g-B) / `POLITICAL_EVENT_CATALOGUE` precedent: a hard-coded TS
// array, NO DB-side NewsBeatTemplate table (`news_beat.template_id` / `news_thread.template_id` are
// soft-ref text columns, design §4). `NewsBeatTemplateId` (gdd/15 §chapter_map :299, canon chapter_map
// entry) is the canon string union — NEVER `template_id: int`.
//
// <!-- LOVED: cooper_affair (4.70 ❤️) + sourceless_beat (4.60 ❤️) — the 2 keystone entries below carry
//      the ❤️ flag (Goffman framing-as-event / Boorstin pseudo-event, design §0). -->
//
// D2 (design §3.1, ruling — miroir exact 04g-B D1 "the 6 Flows R3.11"): the LIVE/registry-only split is
// the EXACT frontier of the 8 Flows the tech-doc adapter documents (`news_beat_templates.md §R3.11
// :119-187`) MINUS Documented Moment (Flow 4 — the ONLY flow not retained: its trigger needs an ARCHIVES
// substrate that exists nowhere, and it is ALREADY consumed as the re-skin source for the shipped
// E-POL-09 launch event, `template_launch_event_mapping.md :56` — the identical structural reasoning
// 04g-B applied to exclude `festival_misread`). The 7 LIVE entries cover 100% of the 4 canon composites
// (`SourceAttribution`/`OmissionRecord`/`FrameLock`/`RetrospectiveArc`, glossary :298-302) — the 5
// registry-only entries add no new composite (design §3.1's own "100% composite coverage" argument).
// `registryOnlyReason` is REQUIRED (non-empty) for every `registry_only` entry — never a silent omission
// of why it isn't live (anti-fig-leaf, precedent "04e-B 6/10 honest TD" / "04g-B 6/14"). `tdRef` is
// intentionally `undefined` at C1 — TD numbers are allocated at the C7 closeout (design §11), never
// fabricated ahead of the actual routing (mirrors `RANDOM_WORLD_TEMPLATE_REGISTRY`'s own C1 posture).

/**
 * The 8 canon `NewsBeatTemplateId` strings (gdd/15 §chapter_map :299 — snake_case, verbatim glossary
 * identity) + 4 [PROV] snake_case ids derived from the same naming pattern for the 4 ○ templates with no
 * explicit canon id in the glossary (design §3.1 — `source_laundering`, `photo_desk_mismatch`,
 * `below_the_fold`, `burned_source`). This union is the closed domain `newsBeatTemplateById` validates
 * against — any id outside this set is rejected, never silently accepted.
 */
export type NewsBeatTemplateId =
  // ── 8 canon ids (glossary :299) ──────────────────────────────────────────────────────────────────
  | 'cooper_affair'
  | 'sourceless_beat'
  | 'folded_page'
  | 'slow_page'
  | 'documented_moment'
  | 'three_outlet_storm'
  | 'hindsight'
  | 'wire_day'
  // ── 4 [PROV] snake_case ids (design §3.1, D2) ───────────────────────────────────────────────────
  | 'source_laundering'
  | 'photo_desk_mismatch'
  | 'below_the_fold'
  | 'burned_source';

/** The 3 canon LOVED/LIKE/neutral flags (design §3.1: "flag (loved|liked|neutral)"). */
export type NewsBeatTemplateFlag = 'loved' | 'liked' | 'neutral';

/** One static catalogue entry (design §3.1 shape: `{ templateId, name, catalogueRef, flag, score,
 *  runtime, registryOnlyReason?, tdRef? }`). */
export interface NewsBeatTemplateEntry {
  readonly templateId: NewsBeatTemplateId;
  /** Canon display name (`CATALOGUE_REPORT.md` heading, minus the flag/score bracket). */
  readonly name: string;
  /** `CATALOGUE_REPORT.md:<start>-<end>` — the exact heading-to-next-heading line range (freshly
   *  re-grepped 2026-07-16, C1). */
  readonly catalogueRef: string;
  readonly flag: NewsBeatTemplateFlag;
  /** The canon LOVED-ideas score (`CATALOGUE_REPORT.md` bracket, e.g. `[4.70]`). */
  readonly score: number;
  /** 'live' = this lot builds a real runtime trigger/composition/lifecycle for it (the 7, design §3.5).
   *  'registry_only' = catalogue entry + BO visibility ONLY, zero code-path (D2, the 5). */
  readonly runtime: 'live' | 'registry_only';
  /** The per-entry honesty note (design §3.1's own reasoning column) — REQUIRED for every
   *  `registry_only` entry (never a silent omission of why it isn't live), absent for `live` entries. */
  readonly registryOnlyReason?: string;
  /** Allocated at the C7 closeout (design §11) — was intentionally `undefined` at C1 (a registry_only
   *  entry without a `tdRef` yet is NOT a fig-leaf, it is simply not-yet-routed; routing happens once, at
   *  closeout, never fabricated ahead of time — precedent `RANDOM_WORLD_TEMPLATE_REGISTRY`'s own C1).
   *  ★ C7 — filled in: all 5 `registry_only` entries now carry `tdRef: 'TD-263'` (the one shared TD
   *  enumerating all 5, `docs_int/tech_debt_inventory.md`, pattern TD-246 04g-B). */
  readonly tdRef?: string;
}

/**
 * The 12-entry static registry, CATALOGUE_REPORT.md canonical order (matches
 * `news_beat_templates.md:34-49`'s own "canonical CATALOGUE_REPORT order" framing — NOT the design §3.1
 * table's own by-score groupings for readability, mirrors `RANDOM_WORLD_TEMPLATE_REGISTRY`'s own
 * catalogue-order convention).
 */
export const NEWS_BEAT_TEMPLATE_REGISTRY: readonly NewsBeatTemplateEntry[] = [
  {
    templateId: 'cooper_affair',
    name: 'The Cooper Affair',
    catalogueRef: 'CATALOGUE_REPORT.md:284-305',
    flag: 'loved',
    score: 4.70,
    runtime: 'live',
  },
  {
    templateId: 'sourceless_beat',
    name: 'The Sourceless Beat / The Page-Three Item',
    catalogueRef: 'CATALOGUE_REPORT.md:306-327',
    flag: 'loved',
    score: 4.60,
    runtime: 'live',
  },
  {
    templateId: 'folded_page',
    name: 'The Folded Page / What He Did Not Say',
    catalogueRef: 'CATALOGUE_REPORT.md:328-349',
    flag: 'liked',
    score: 4.50,
    runtime: 'live',
  },
  {
    templateId: 'slow_page',
    name: 'The Slow Page / The Tannery Notice',
    catalogueRef: 'CATALOGUE_REPORT.md:350-371',
    flag: 'liked',
    score: 4.45,
    runtime: 'live',
  },
  {
    templateId: 'documented_moment',
    name: 'The Documented Moment',
    catalogueRef: 'CATALOGUE_REPORT.md:372-393',
    flag: 'liked',
    score: 4.40,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires a quarterly ARCHIVE-RELEASE substrate (batches of transactional artifacts with a per-actor consequential payload, CATALOGUE_REPORT.md :376) that exists nowhere in this codebase; already CONSUMED as the re-skin source for the shipped E-POL-09 launch event (template_launch_event_mapping.md :56) — the identical structural reasoning 04g-B applied to exclude festival_misread ("already consumed … premature before news-beat").',
    tdRef: 'TD-263', // ★ C7 closeout — the 5 registry-only entries, one shared TD (design §11 item 1, pattern TD-246 04g-B).
  },
  {
    templateId: 'three_outlet_storm',
    name: 'The Three-Outlet Storm / Three Voices on the Same Block',
    catalogueRef: 'CATALOGUE_REPORT.md:394-415',
    flag: 'liked',
    score: 4.35,
    runtime: 'live',
  },
  {
    templateId: 'hindsight',
    name: 'Hindsight / Warning Signs Missed',
    catalogueRef: 'CATALOGUE_REPORT.md:416-437',
    flag: 'liked',
    score: 4.35,
    runtime: 'live',
  },
  {
    templateId: 'source_laundering',
    name: 'Source Laundering / Citation Chain',
    catalogueRef: 'CATALOGUE_REPORT.md:438-459',
    flag: 'neutral',
    score: 4.60,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires a 5-tier outlet hierarchy + a 6-12h sub-day propagation cadence the NIGHTLY-only Brennar Daily tick cannot express (D18 — same reasoning that excluded triage_night 04g-B); the day-1 press registry is exactly 3 outlets (D3). Forward with its own runtime: cross-ref forensic Benford chi-square → Source Laundering trigger (news_beat_templates.md :67).',
    tdRef: 'TD-263',
  },
  {
    templateId: 'photo_desk_mismatch',
    name: 'The Photo Desk Mismatch',
    catalogueRef: 'CATALOGUE_REPORT.md:460-481',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires a photo pipeline (aesthetic codes, image assets) that does not exist; the canon `photo_id` column is itself OMITTED day-1 (decisions D13, anti-dead-column) — this entry carries that omission\'s TD (design §11.9).',
    tdRef: 'TD-263',
  },
  {
    templateId: 'below_the_fold',
    name: 'Below The Fold',
    catalogueRef: 'CATALOGUE_REPORT.md:482-503',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires a per-district "depth-read coefficient" that would be a fabricated scalar (R2.2 — the identical reasoning that excluded trough_cycle 04g-B) plus a lede/buried-facts content model this lot does not author.',
    tdRef: 'TD-263',
  },
  {
    templateId: 'burned_source',
    name: 'The Burned Source',
    catalogueRef: 'CATALOGUE_REPORT.md:504-525',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'The producer — "any player action that publicly compromises a reporter\'s source" — does not exist: no source-reporter relationship is modeled in code, no player exposure action is queryable (decisions D15, no press-contact/lieutenant seam day-1).',
    tdRef: 'TD-263',
  },
  {
    templateId: 'wire_day',
    name: 'Wire Day / Wire Copy',
    catalogueRef: 'CATALOGUE_REPORT.md:526-551',
    flag: 'neutral',
    score: 4.40,
    runtime: 'live',
  },
];

const REGISTRY_BY_ID: ReadonlyMap<NewsBeatTemplateId, NewsBeatTemplateEntry> = new Map(
  NEWS_BEAT_TEMPLATE_REGISTRY.map((entry) => [entry.templateId, entry]),
);

/**
 * Look up a template by id. Rejects (throws) any id outside the 12-entry closed domain — the single
 * validation gate every caller (generator, BO force-generate, projection) MUST route through (mirrors
 * `randomWorldTemplateById`'s own AC7 posture).
 */
export function newsBeatTemplateById(id: string): NewsBeatTemplateEntry {
  const entry = REGISTRY_BY_ID.get(id as NewsBeatTemplateId);
  if (!entry) {
    // Derived from the registry's own length (never a hardcoded restatement of it, R2.3 — the count
    // would silently drift out of sync with the array the moment an entry is added/removed).
    throw new Error(
      `Unknown NewsBeatTemplateId '${id}' — not one of the ${NEWS_BEAT_TEMPLATE_REGISTRY.length} entries in NEWS_BEAT_TEMPLATE_REGISTRY.`,
    );
  }
  return entry;
}

/** The 7 `runtime: 'live'` entries (design §3.1). */
export function liveNewsBeatTemplates(): readonly NewsBeatTemplateEntry[] {
  return NEWS_BEAT_TEMPLATE_REGISTRY.filter((entry) => entry.runtime === 'live');
}

/** The 5 `runtime: 'registry_only'` entries (design §3.1, D2) — the BO
 *  `<UnmappedNewsBeatTemplatesOpportunity>` (C7) data source. */
export function registryOnlyNewsBeatTemplates(): readonly NewsBeatTemplateEntry[] {
  return NEWS_BEAT_TEMPLATE_REGISTRY.filter((entry) => entry.runtime === 'registry_only');
}

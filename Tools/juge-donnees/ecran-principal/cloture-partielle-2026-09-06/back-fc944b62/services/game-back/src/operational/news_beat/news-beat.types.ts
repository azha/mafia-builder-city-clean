// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (shared TS composite shapes) +
//             C3 (RetrospectiveArc) + C4 (FrameLock, OmissionRecord, SourceAttribution.outletTier/
//             omissionRecord) + C5 (SourceAttribution.outletKey widened optional — sourceless_beat's
//             chain-refusal shape)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.4 (SourceAttribution
//             composite, canon `news_beat_templates.md:298`; RetrospectiveArc canon :302; FrameLock canon
//             :300; OmissionRecord canon :301) + §3.3 (FodderItem shape) + §4.1 (news_beat.fodder_refs) +
//             §3.5.3 (hindsight, RetrospectiveArc consumer) + §3.5.4 (three_outlet_storm, FrameLock +
//             SourceAttribution.outlet_tier consumer) + §3.5.5 (folded_page, OmissionRecord consumer) +
//             §3.5.2 (sourceless_beat, "forbidden to chain" — the shape refuses outletKey/journalistKey)
//             — 04g-C C2 — 2026-07-16
//             — 04g-C C3 — 2026-07-16 (RetrospectiveArc)
//             — 04g-C C4 — 2026-07-16 (FrameLock, OmissionRecord, SourceAttribution.outletTier/
//               omissionRecord)
//             — 04g-C C5 — 2026-07-16 (outletKey widened optional — see below)
//
// Shared, zero-I/O TS shapes for the news_beat runtime (mirrors `political.types.ts`/`live-ops.types.ts`'s
// own dedicated `*.types.ts` convention — pure data shapes, no logic). `SourceAttribution` is the ONE
// canon composite C2 needs (digest beats never absent it, design §4.1); `RetrospectiveArc` (design §3.4)
// landed C3 (`hindsight`'s own composite, its first and only producer). `FrameLock`/`OmissionRecord` land
// THIS chunk, with the templates that actually produce them (`three_outlet_storm`/`folded_page`
// respectively) — NOT scaffolded ahead of a real producer (contrast the tunables-getter "N getters at C1"
// precedent: a composite TYPE with zero producer is dead weight a reviewer would rightly flag; a
// registered tunable getter with zero consumer is a documented, honest balance knob — different risk
// profile).

import { newsBeatCategory } from '../../db/schema/news_beat';

/** The 5 canon `news_beat_category` enum members (design §4.1), narrowed from the schema (never
 *  re-declared by hand — mirrors `effect-engine.types.ts`'s `EffectScopeEnumVal` pattern). */
export type NewsBeatCategoryValue = (typeof newsBeatCategory.enumValues)[number];

/** The 4 upstream fodder sources (design §3.3). */
export type FodderSourceKind = 'random_world' | 'political' | 'live_ops' | 'ambient_micro';

/** The 3-band qualitative severity (design §3.3, D14 mapping table) — never a raw numeric score, the P5
 *  qualitative-band discipline extended to this internal reader contract. */
export type FodderSeverityBand = 'low' | 'noticeable' | 'high';

/** `activated` (S2/S4/S5 fresh activations — the ONLY transition `NewsFodderReader` scans THIS chunk,
 *  C2 digest fodder) | `resolved` (S2/S4 resolutions feeding Hindsight, C3 scope — NOT produced yet) |
 *  `ongoing` (S3 ambient micro-events — no activation/resolution duality, ★ coder judgment call, see
 *  `news-fodder-reader.service.ts`'s own header). */
export type FodderTransition = 'activated' | 'resolved' | 'ongoing';

/**
 * `FodderItem` (design §3.3) — the normalized shape `NewsFodderReader` returns for every upstream row,
 * READ-only (never mutates its source table — the ★ falsifiable contract, design §0).
 */
export interface FodderItem {
  readonly sourceKind: FodderSourceKind;
  /** The source row's OWN uuid PK — the join target the E2E floor's "resolves to a real row" proof
   *  targets (design §4.1 `fodder_refs[].refId`). */
  readonly refId: string;
  /** Soft-ref upstream identity: `template_id` (random_world) / `event_id` (political, live_ops) /
   *  `kind` (ambient_micro). */
  readonly templateOrEventId: string;
  readonly districtId: number | null;
  readonly severityBand: FodderSeverityBand;
  readonly occurredAtGameDay: number;
  readonly transition: FodderTransition;
  /** The upstream system's OWN dotted i18n key for this item's subject (design §3.7 params `{subject}`)
   *  — REUSES each source's own existing convention where one already exists (random_world's
   *  `template_i18n_key`, `random-world.projection.service.ts:122`; ambient's `descriptor_i18n_key`,
   *  `ambient.projection.service.ts:89`), and extends the SAME dotted-key shape for political/live_ops
   *  (neither had one yet — `news-fodder-reader.service.ts` mints `political.event.*`/`live_ops.event.*`). */
  readonly subjectI18nKey: string;
}

/** The ★ falsifiable fodder-citation shape (design §4.1 `news_beat.fodder_refs`): `[{sourceKind,
 *  refId}]`. `[]` is LEGAL for `cooper_affair` + `slow_page` + `sourceless_beat` (★ C7 amendment, ⊥
 *  review I-1/I-B — the ORIGINAL wording here said "ONLY sourceless_beat", STALE by C5/C6: all 3
 *  templates trigger on an aggregate/ambient signal, never a single discrete fodder row).
 *  `sourceless_beat` is distinguished from the other two by `source_attribution.sourceless === true`,
 *  NEVER by an empty `fodder_refs` (no longer a unique tell) — every OTHER live template MUST still
 *  cite ≥1 real fodder row (invariant tested, C2+). */
export interface FodderRefCitation {
  readonly sourceKind: FodderSourceKind;
  readonly refId: string;
}

/**
 * `SourceAttribution` (canon `news_beat_templates.md:298`, glossary gdd/15:1838-1845) — carried on
 * EVERY beat's `source_attribution` jsonb column, NEVER absent (design §4.1, grep-gate design §9 check
 * #1). C2 (digest beats) only ever sets `tier`/`hedgeLevel`/`outletKey`/`journalistKey` — the other
 * fields (`sourceless`/`omissionObservedInOutlets`/`wireSourceId`/`seriesId`) are per-template additions
 * C3-C5 land (`sourceless_beat`/`folded_page`/`wire_day`/`slow_page` respectively).
 */
export interface SourceAttribution {
  /** 1 = direct/unlaundered (every C2 digest beat). 2/3 = laundered chain — no LIVE template produces
   *  those yet (`source_laundering` is registry-only, D2). */
  readonly tier: 1 | 2 | 3;
  /** 0.0 = no hedging (every C2 digest beat: plain direct reporting). `null` reserved for
   *  `sourceless_beat` (C5 — "forbidden to chain", design §3.5.2). */
  readonly hedgeLevel: number | null;
  /** Soft-ref to `press-registry.ts`'s `PressOutletKey`. ★ C5 — widened OPTIONAL (was required through
   *  C4): design §3.5.2 composition line enumerates `sourceless_beat`'s OWN attribution as EXACTLY
   *  `{tier:1, hedgeLevel:null, sourceless:true}` — no `outletKey` in that list at all. This is the
   *  literal "the shape REFUSES chain fields" (news_beat_templates.md :136) — `outletKey` is itself a
   *  CHAIN field (which outlet is citable as the source), so a sourceless beat's `source_attribution`
   *  omits it entirely (`NewsBeatRepository.assertSourcelessAttributionShape`,
   *  `sourceless-beat.ts`, THROWS if it's present). The `news_beat.outlet_key`/`journalist_key` DB
   *  COLUMNS (a SEPARATE, structurally NOT-NULL/nullable pair — "who technically ran the copy",
   *  needed for BO grouping + the readiness-reset derivation, design D7) still carry REAL values; only
   *  THIS jsonb composite field omits the citable reference. Every OTHER template (digest/hindsight/
   *  wire_day/storm/folded_page) still ALWAYS sets it — widening to optional does not relax any of
   *  THEIR call sites (none of them stop passing it). */
  readonly outletKey?: string;
  /** Soft-ref to `press-registry.ts`'s `JournalistKey`. Omitted = no covering journalist byline (a
   *  district not on the drawn outlet's own beat roster, or no district at all — national/business/
   *  arts digest beats). */
  readonly journalistKey?: string;
  /** `sourceless_beat` only (C5) — never set by a digest beat. */
  readonly sourceless?: boolean;
  /** `folded_page` only (C4) — the 2 covering outlet keys (canon `omission_observed_in_outlets`,
   *  news_beat_templates.md :161/:209 verbatim field name). */
  readonly omissionObservedInOutlets?: readonly string[];
  /** `three_outlet_storm` only (C4) — the PRODUCING outlet's OWN registry tier (1..3,
   *  `press-registry.ts`'s `PressOutletEntry.tier`, canon `SourceAttribution{outlet_tier}` verbatim,
   *  news_beat_templates.md :161-162 "chacun avec sa `SourceAttribution{outlet_tier}` distincte").
   *  ★ Deliberately DISTINCT from `tier` above (`press-registry.ts`'s own header comment: "CITATION-CHAIN
   *  tier semantics are DISTINCT from this field ... never this outlet-size tier") — `tier` stays `1` on
   *  every storm beat (direct, unlaundered reporting, no template produces a laundered storm beat)
   *  while `outletTier` carries the OUTLET's own institutional size (1..3), naturally distinct across the
   *  3 simultaneous beats since storm composition uses each of the 3 `PRESS_OUTLET_REGISTRY` entries
   *  exactly once — this ALSO feeds the phase-2 lifecycle's own "incréments … pondérés par (a) tier de
   *  l'outlet" (design §3.5.4). */
  readonly outletTier?: 1 | 2 | 3;
  /** `wire_day` only (C3). */
  readonly wireSourceId?: string;
  /** `slow_page` only (C6). */
  readonly seriesId?: string;
  /** `folded_page` only (C4) — the FULLER canon `OmissionRecord` composite (design §3.4/§3.5.5).
   *  ★ coder judgment call (documented): `folded_page` is ONE-SHOT (design §3.5.5 "pas de thread") so
   *  there is no `news_thread.payload` to carry this composite the way `RetrospectiveArc`/`FrameLock`
   *  ride in a thread's payload — `source_attribution` (this same jsonb column, already carrying
   *  `omissionObservedInOutlets` above) is the ONLY per-beat extra-data container a one-shot beat has,
   *  so `OmissionRecord` nests here instead. */
  readonly omissionRecord?: OmissionRecord;
}

/**
 * `OmissionRecord` (canon `news_beat_templates.md:301`/:367, design §3.4/§3.5.5) — `folded_page`'s own
 * composite (the FIRST and ONLY producer, C4): the fuller record of WHO suppressed the fodder item and
 * WHO covered it instead, nested inside the hollow beat's `source_attribution` (see that field's own
 * doc comment above for why — no thread exists for a one-shot template).
 */
export interface OmissionRecord {
  /** Soft-ref to `press-registry.ts`'s `PressOutletKey` — the outlet whose `selfCensorCoefficient`
   *  cleared `foldedPageSuppressionThresholdSeverity` (D11) and stayed silent. */
  readonly suppressingOutletKey: string;
  /** The `foldedPageOutletCountTracked - 1` outlets that DID cover the fodder (canon
   *  `covering_outlets[]`) — the SAME keys `SourceAttribution.omissionObservedInOutlets` carries. */
  readonly coveringOutlets: readonly string[];
  /** The suppressed fodder item's own citation (canon `suppressed_fodder_ref`) — the ★ falsifiable join
   *  target (the E2E floor's "OmissionRecord.suppressedFodderRef === the seeded incident" proof). */
  readonly suppressedFodderRef: FodderRefCitation;
}

/**
 * `FrameLock` (canon `news_beat_templates.md:300`/:161, design §3.4/§3.5.4) — `three_outlet_storm`'s own
 * composite (the FIRST and ONLY producer, C4): persisted into the winning thread's `payload.frameLock`
 * once the contest-window resolution (design §3.5.4 "à l'horizon du contest window") finds
 * `max(salience) > stormLockMargin × Σ(others)`. Absent (`undefined`) while the thread is `open` and
 * un-resolved, OR if the resolution instead settles into `contested_persistent` (no lock ever occurs for
 * that outcome — design "sinon contested-state maintenu").
 */
export interface FrameLock {
  /** Canon `winning_frame` — the frame whose cumulative salience crossed the lock margin. */
  readonly winningFrame: string;
  /** Canon `salience_ratio` — `winningSalience / sum(otherFrames' salience)` at the moment of lock (the
   *  EXACT value the E2E floor's precomputed-scenario proof asserts, `≥ stormLockMargin`). */
  readonly salienceRatio: number;
  /** Canon `locked_at_game_day` (adapted from the tech-doc's own `locked_at_tick` — this codebase's
   *  determinism axis is `game_day`, never a raw tick, mirrors every other `*_at_game_day` field in this
   *  module). */
  readonly lockedAtGameDay: number;
}

/**
 * `RetrospectiveArc` (canon `news_beat_templates.md:302`, design §3.4/§3.5.3) — the `hindsight` thread's
 * OWN composite, carried inside `news_thread.payload.retrospectiveArc` (a sibling field,
 * `subjectI18nKey`, rides alongside it in the SAME payload for publication copy — see
 * `NewsBeatGeneratorService`'s own `HindsightThreadPayload`; that sibling is NOT part of this canon
 * shape). The 3 canon fields, camelCase (mirrors `SourceAttribution`'s own TS-casing convention of the
 * snake_case glossary names):
 */
export interface RetrospectiveArc {
  /** The triggering resolved event's citation (design §4.1 `FodderRefCitation` shape) — canon
   *  `event_resolved_ref`. */
  readonly eventResolvedRef: FodderRefCitation;
  /** Canon `cherry_picked_indicators` — `hindsight_indicator_count` (default 4) REAL micro-event `kind`
   *  strings observed in the district before resolution (D8) — join-falsifiable, never fabricated. */
  readonly cherryPickedIndicators: readonly string[];
  /** Canon `publication_schedule_game_days` — absolute `game_day` values, STRICTLY ascending, index 0 =
   *  the op-ed, the rest follow-ups (design §3.5.3, `hindsight-arc.ts`'s own scheduling algorithm). */
  readonly publicationScheduleGameDays: readonly number[];
}

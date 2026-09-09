// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C3 (news-beat-generator.service.ts
//             — composeRetrospectiveArc + the hindsight publication/wire-day beat composition helpers) +
//             C4 (composeThreeOutletStormBeats + applySpiralOfSilenceOmission) + C5 (composeCooperAffairThread
//             + composeCooperReframeBeat + composeSourcelessBeat — the 2 ❤️ keystones) + C6
//             (composeSlowPageSeries + composeSlowPageInstallmentBeat)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3 (architecture — the
//             file was named but not yet created at C2) + §3.5.3 (hindsight) + §3.5.7 (wire_day) +
//             §3.5.4 (three_outlet_storm) + §3.5.5 (folded_page) + §3.5.1 (cooper_affair) + §3.5.2
//             (sourceless_beat) + §3.5.6 (slow_page)
//             — 04g-C C3 — 2026-07-16
//             — 04g-C C4 — 2026-07-16 (composeThreeOutletStormBeats, applySpiralOfSilenceOmission)
//             — 04g-C C5 — 2026-07-16 (composeCooperAffairThread, composeCooperReframeBeat,
//               composeSourcelessBeat — the keystone ❤️ pair, the LOVED heart of the lot)
//             — 04g-C C6 — 2026-07-16 (composeSlowPageSeries — the atomic bare open, NO beat, mirrors
//               composeRetrospectiveArc's own "no beat at open" shape; composeSlowPageInstallmentBeat —
//               BUILDS only, mirrors composeCooperReframeBeat's own post-I-2 "no insert" shape, applied
//               proactively FROM THE START rather than discovered via a 2nd review)
//             — 04g-C C7 — 2026-07-16 (BO force-generate dispatch: `ForceableNewsBeatTemplateId`/
//               `isForceableNewsBeatTemplateId`/`forceGenerate` — mirrors `RandomWorldEventGeneratorService.
//               forceActivate`'s IDENTICAL restrictive-forceable-set posture, 04g-B C5)
//             — ★ I-2 fix (review gate IMPORTANT-2, post-merge): `composeCooperReframeBeat` no longer
//               inserts its own beat — it now ONLY builds the beat's full input (returns
//               `Omit<NewTemplateBeatInput, 'threadId'>`, no DB write). `BrennarDailyService.
//               advanceCooperAffairThread` collects every reframe this produces across its own day-loop
//               and hands the batch to `NewsBeatRepository.advanceCooperAffairThreadAtomic`, which inserts
//               them ALL + the cursor update atomically (see that method's own doc comment) — closing the
//               SAME "un-transactioned insert-then-cursor-update" crash window C3's own BLOCKING-1 fix
//               closed for hindsight's OPEN.
//
// `NewsBeatGeneratorService` — the composer runtime (design §3 preamble: "NewsBeatGenerator = le composer
// runtime … ; BrennarDailyService = le consumer qui drive le daily tick, consume NewsBeatGenerator
// output"). C3 shipped `composeRetrospectiveArc` (the ONE canon method C3's own task list named
// explicitly, `news_beat_templates.md:84-88`/gdd/15:1840-1844) plus the 2 beat-producing helpers phase 2
// (hindsight publications) and phase 3 (wire day) need. THIS chunk ships the other 2 canon composition
// methods the WHOLE lot's interface names: `composeThreeOutletStormBeats` (storm's own OPEN composition —
// `composeBeat(eventId, "three_outlet_storm")` in the tech-doc's generic-dispatch phrasing, design §3.2
// "Interface publique") and `applySpiralOfSilenceOmission(fodderItem)` (folded_page's canon method name
// VERBATIM, news_beat_templates.md :208/:222) — the SAME "a composite/method with zero producer is dead
// weight" posture `news-beat.types.ts`'s own C2 header established for `FrameLock`/`OmissionRecord`,
// which land THIS chunk too (their first real producers).
//
// ★ Coder judgment call (documented): `composeRetrospectiveArc`'s thread `id` is DB-generated
// (`defaultRandom()`) — it cannot seed the per-thread `indicators`/`schedule` draws (design §8) BEFORE the
// row exists. This mirrors `random-world-event-generator.service.ts`'s own `${event.id}:fork` precedent
// (04g-B C4 — a seed drawn from an ALREADY-PERSISTED row's own id, at a LATER tick): here the 2 steps
// happen within the SAME call instead of 2 ticks, but the shape is identical — insert a bare row, read its
// `id` back, THEN seed off it. `composeThreeOutletStormBeats` (THIS chunk) has the IDENTICAL shape (its
// `news:{thread_id}:frame` draw also needs the DB-generated thread id) and is built atomically FROM THE
// START (`NewsBeatRepository.insertThreeOutletStormThreadAtomic`) — proactively applying the lesson below
// rather than discovering the same gap via a 2nd review.
//
// ★ C3 fix (review gate BLOCKING-1, post-merge): the 2 steps ORIGINALLY ran as 2 separate
// un-transactioned statements — the reviewer found a crash window (a throw between them, e.g. a transient
// connection drop on the intervening indicator-pool read, or SIGTERM/OOM) left a committed "open" thread
// with an empty `payload.retrospectiveArc` that `NewsFodderReader.scanResolutionsForHindsight`'s own
// `NOT EXISTS` + the mig-0130 UNIQUE-PARTIAL then excluded PERMANENTLY, and that
// `advanceHindsightThread`'s own `payload.retrospectiveArc.publicationScheduleGameDays` read then
// TypeError'd on EVERY subsequent tick — silently bricking the whole Brennar Daily subsystem (violating
// design §8 "un tick mort ne bloque pas le lendemain"). Fix: both steps now run inside ONE
// `NewsBeatRepository.insertHindsightThreadAtomic` transaction (see that method's own doc comment) — a
// throw anywhere in the callback below (the read, the RNG draws, or the test-only `forceThrowAfterInsert`
// fault-injection) rolls the WHOLE transaction back, so no thread is EVER committed with an incomplete
// payload. The seed strings/draw order are UNCHANGED (still `news:{thread_id}:indicators` then
// `news:{thread_id}:schedule`, design §8 "ordre de tirage FIXE"). `advanceHindsightThread`
// (`brennar-daily.service.ts`) ALSO gained a defensive guard (belt-and-suspenders) so a payload-less/
// malformed legacy row — should one ever exist — skips instead of crashing the tick.

import { Injectable } from '@nestjs/common';

import { makeRng, type Rng } from '../../common/seeded-rng';
import type { NewsBeatRow, NewsThreadRow } from '../../db/schema/news_beat';
import { NewsBeatRepository, type NewTemplateBeatInput } from './news-beat.repository';
import { NewsFodderReader, newsBeatCategoryForFodderItem } from './news-fodder-reader.service';
import { newsBeatTunables, NEWS_BEAT_TUNABLE_CAPS } from './news-beat.tunables';
import { journalistByKey, journalistsCoveringDistrict, journalistsForOutlet, PRESS_OUTLET_REGISTRY, pressOutletByKey } from './press-registry';
import { HINDSIGHT_COPY, computeHindsightPublicationSchedule, drawCherryPickedIndicators } from './hindsight-arc';
import { WIRE_DAY_COPY, WIRE_DAY_NEUTRAL_SUBJECT_I18N_KEY, pickWireDayFrame, pickWireDayTopFodder, wireDayCategoryForIndex } from './wire-day';
import { STORM_COPY, beatCategoryForStormFrame, drawDistinctStormFrames, type StormFrame } from './three-outlet-storm';
import { FOLDED_PAGE_COPY, foldedPageSuppressorQualifies } from './folded-page';
import { NEWS_BEAT_DIGEST_COPY } from './news-beat-digest';
import { COOPER_COPY, drawInitialCooperFrame, type CooperFrame } from './cooper-affair';
import { SOURCELESS_ARC_INITIAL_INDEX, SOURCELESS_BEAT_COPY, SOURCELESS_TOTAL_DISTRICTS } from './sourceless-beat';
import { SLOW_PAGE_COPY, drawInstallmentsTotal } from './slow-page';
import { copyForOutlet } from './outlet-voice';
import type { FodderItem, FodderRefCitation, FrameLock, OmissionRecord, RetrospectiveArc, SourceAttribution } from './news-beat.types';

/** `news_thread.payload` shape for a `hindsight` thread (design §3.4/§3.5.3) — `retrospectiveArc` is the
 *  canon composite (`news-beat.types.ts`); `subjectI18nKey` is a SIBLING field (NOT part of the canon
 *  3-field shape) carrying the resolved event's own i18n subject so publication copy never needs a
 *  re-query of the (possibly long-gone) fodder row at publication time. */
export interface HindsightThreadPayload {
  readonly retrospectiveArc: RetrospectiveArc;
  readonly subjectI18nKey: string;
}

/** `news_thread.payload` shape for a `three_outlet_storm` thread (design §3.4/§3.5.4). `frames` +
 *  `outletKeysByFrame` are materialized at OPEN time (the seeded `news:{thread_id}:frame` draw,
 *  `composeThreeOutletStormBeats` below) and never change afterward; `salience`/
 *  `salienceAdvancedThroughGameDay` are the phase-2 daily advance's OWN mutable state
 *  (`BrennarDailyService.advanceThreeOutletStormThread`); `frameLock` is ABSENT until the contest-window
 *  resolution actually locks (design §3.4 `FrameLock`, `news-beat.types.ts`). */
export interface StormThreadPayload {
  /** The 3 DISTINCT frames drawn without replacement (design §3.5.4), in NO particular meaningful order
   *  beyond "the 3 that were drawn" — `outletKeysByFrame` is the authoritative frame→outlet mapping, this
   *  array is kept only as the ORIGINAL draw record. */
  readonly frames: readonly string[];
  /** frame → the outlet whose beat carries it (design §3.5.4 "1 beat par outlet") — the phase-2 advance's
   *  own per-frame outlet-TIER lookup (`pressOutletByKey(outletKeysByFrame[frame]).tier`, design
   *  "incréments … pondérés par tier de l'outlet"). */
  readonly outletKeysByFrame: Readonly<Record<string, string>>;
  /** frame → cumulative salience count, init `1` each at OPEN (design §3.5.4 "salience vector {frame →
   *  count} init 1 chacun"). */
  readonly salience: Readonly<Record<string, number>>;
  /** ★ the existence-guard cursor the phase-2 daily advance needs (mirrors hindsight's own
   *  `countBeatsForThread`-derived cursor — salience has no natural "count of things published" to derive
   *  a cursor from, so it is stored EXPLICITLY here): the last `game_day` salience was advanced THROUGH.
   *  Starts at `opened_at_game_day` (no increments yet). */
  readonly salienceAdvancedThroughGameDay: number;
  /** Absent while `open`/un-resolved. Set ONCE, at the contest-window resolution, iff `max(salience) >
   *  stormLockMargin × Σ(others)` (design §3.5.4). */
  readonly frameLock?: FrameLock;
}

/** `news_thread.payload` shape for a `cooper_affair` thread (design §3.4/§3.5.1). `halfLifeDays` is a
 *  SNAPSHOT of `cooperFrameHalfLifeDays` taken at OPEN time (design "half_life = cooper_frame_half_life_
 *  days" is listed as part of COMPOSITION, unlike storm's own contest-window/persistence-week constants
 *  which `advanceThreeOutletStormThread` re-reads LIVE from the tunable every call — a documented,
 *  deliberate difference: a thread's own half-life clock, once started, should not silently lengthen or
 *  shorten mid-arc if the tunable is overridden later). `reframeResistance`/`reframeCount`/`frameId`/
 *  `currentOutletKey`/`currentJournalistKey` are the phase-2 daily advance's OWN mutable state
 *  (`BrennarDailyService.advanceCooperAffairThread`); `advancedThroughGameDay` is the SAME "existence-
 *  guard cursor" shape `StormThreadPayload.salienceAdvancedThroughGameDay` already establishes (no
 *  natural "count of things published" to derive a cursor from — reframes may be 0). */
export interface CooperAffairThreadPayload {
  /** design §3.5.1 "frame_id tiré seedé" — the CURRENT frame (mutates on each reframe). */
  readonly frameId: CooperFrame;
  /** Snapshot of `cooperFrameHalfLifeDays` at open time — see doc comment above. */
  readonly halfLifeDays: number;
  /** design §3.5.1 "reframe_resistance = 0.0" initially, `+= cooperReframeResistanceGrowth` per reframe
   *  (IEEE-754-stable rounded, `cooper-affair.ts`'s `roundToStableDecimal` — design §8). */
  readonly reframeResistance: number;
  /** How many reframes have fired so far — `cooperMaxReframes` (3) closes the thread `saturated`. */
  readonly reframeCount: number;
  /** The outlet CURRENTLY holding the frame (the originating outlet at open; a winning rival's key after
   *  each reframe) — the next day's "rival outlets" exclusion set (design "chaque outlet RIVAL (≠
   *  current)"). */
  readonly currentOutletKey: string;
  /** The covering journalist for `currentOutletKey` in `thread.district_id`, if one exists (design
   *  §3.5.1's own gate only requires ONE qualifying journalist at OPEN time — a REFRAME's rival outlet
   *  may have no journalist covering THIS SPECIFIC district, an honest non-fabricated omission, mirrors
   *  the digest beat's own optional-journalist pattern). */
  readonly currentJournalistKey?: string;
  readonly advancedThroughGameDay: number;
}

/** `news_thread.payload` shape for a `sourceless_beat` thread (design §3.4/§3.5.2). `arcIndex` starts at
 *  `SOURCELESS_ARC_INITIAL_INDEX` (1.0, `sourceless-beat.ts`) and decays by `sourcelessArcDecayPerSilentWeek`
 *  per silent week (`BrennarDailyService.advanceSourcelessBeatThread`) — closing (REUSING the closest
 *  existing outcome value, `half_life_expired` — the closed union has no dedicated "decayed" value, a
 *  documented judgment call, see that method's own doc comment) once the index drops below 0. The ONLY
 *  OTHER closure is displacement (`NewsBeatRepository.displaceOpenSourcelessThreadsInDistrict`) — design
 *  "counter-evidence does not retract", so nothing else in this payload ever triggers a conclusion. */
export interface SourcelessBeatThreadPayload {
  readonly arcIndex: number;
  /** The existence-guard cursor (mirrors `StormThreadPayload.salienceAdvancedThroughGameDay`'s own
   *  shape): how many FULL silent weeks have already been decayed through. */
  readonly decayedThroughWeek: number;
}

/** `news_thread.payload` shape for a `slow_page` thread (design §3.4/§3.5.6). UNLIKE every OTHER
 *  multi-publication template's payload, this one carries EXACTLY one field: `installmentsTotal` is
 *  fixed at OPEN time (the seeded `news:{thread_id}:installments` draw, `composeSlowPageSeries` below)
 *  and NEVER changes afterward. No cursor field is needed here (unlike storm's
 *  `salienceAdvancedThroughGameDay` / cooper's `advancedThroughGameDay`): the phase-2 advance's own
 *  due-installment count is derived FRESH from `NewsBeatRepository.countBeatsForThread` every call
 *  (mirrors hindsight's OWN count-derived-cursor shape, `HindsightThreadPayload`'s sibling schedule
 *  array — slow_page's own "schedule" is a pure formula of `opened_at_game_day` + the installment index,
 *  `slow-page.ts`'s `slowPageInstallmentDueDay`, so no schedule array needs materializing either). The
 *  series' shared `SourceAttribution.seriesId` (design "PARTAGÉE") is simply the thread's OWN `id` — no
 *  separate field needed for that either (mirrors `wire_day`'s own `wire_source_id = wire:{gameDay}`
 *  pattern of deriving the shared id rather than storing a redundant copy). */
export interface SlowPageThreadPayload {
  readonly installmentsTotal: number;
}

/** ★ C7 — the ONE LIVE template `NewsAdminController`'s `POST force-generate` (design §6.2) can drive:
 *  the ONLY template whose real composition (`composeThreeOutletStormBeats`) is a self-contained
 *  function of `(gameDay, FodderItem)` alone, with NO internal severity/threshold re-check of its own
 *  (the trigger's OWN gate lives in `BrennarDailyService.evaluateThreeOutletStormTrigger` — "force" means
 *  bypassing THAT gate's severity/wire-day-exclusion/duplicate-inhibition checks, never bypassing the
 *  composition itself). See `forceGenerate`'s own doc comment for why the other 6 LIVE templates are
 *  excluded (mirrors `ForceableRandomWorldTemplateId`'s IDENTICAL restrictive posture, 04g-B C5). */
export type ForceableNewsBeatTemplateId = 'three_outlet_storm';

/** Runtime guard for {@link ForceableNewsBeatTemplateId} — `NewsAdminController`'s own gate BEFORE
 *  calling `forceGenerate` (a `live` template outside this set gets its own explicit 422, never a silent
 *  fall-through — mirrors `isForceableRandomWorldTemplateId`'s identical shape). */
export function isForceableNewsBeatTemplateId(id: string): id is ForceableNewsBeatTemplateId {
  return id === 'three_outlet_storm';
}

@Injectable()
export class NewsBeatGeneratorService {
  constructor(
    private readonly repo: NewsBeatRepository,
    private readonly fodderReader: NewsFodderReader,
  ) {}

  // ───────────────────────────── phase 4d: hindsight trigger composition ─────────────────────────────

  /**
   * `composeRetrospectiveArc(resolvedEventRef)` — the canon method (design §3.2 "Interface publique").
   * Opens a NEW `hindsight` thread for `resolvedItem` (a `FodderItem` with `transition: 'resolved'`, from
   * `NewsFodderReader.scanResolutionsForHindsight`): ATOMIC insert-then-augment (★ C3 fix — see file
   * header + `NewsBeatRepository.insertHindsightThreadAtomic`'s own doc comment), the 2 seeded per-thread
   * draws (`news:{thread_id}:indicators` / `news:{thread_id}:schedule`, design §8), in that FIXED order.
   *
   * @param forceThrowAfterInsert TEST-ONLY (★ C3 fix, atomicity proof): when `true`, throws immediately
   *   after the bare insert — before the indicator-pool read / RNG draws / payload update — to prove the
   *   WHOLE transaction rolls back (mirrors `RivalEliminationService.executeElimination`'s own
   *   `failAtLayer` forced-throw precedent, 04b-B C-cas). NEVER set outside the E2E atomicity test
   *   (`news-test.controller.ts`'s dedicated DEV-gated probe) — defaults to `false` for every real caller.
   */
  async composeRetrospectiveArc(
    resolvedItem: FodderItem,
    gameDay: number,
    forceThrowAfterInsert = false,
  ): Promise<NewsThreadRow> {
    const sourceFodderRef: FodderRefCitation = { sourceKind: resolvedItem.sourceKind, refId: resolvedItem.refId };
    const journalist = resolvedItem.districtId !== null ? journalistsCoveringDistrict(resolvedItem.districtId)[0] : undefined;

    return this.repo.insertHindsightThreadAtomic(
      {
        templateId: 'hindsight',
        journalistKey: journalist?.journalistKey ?? null,
        districtId: resolvedItem.districtId,
        openedAtGameDay: gameDay,
        sourceFodderRef,
      },
      async (threadId) => {
        if (forceThrowAfterInsert) {
          throw new Error('[C3 test] forced rollback after bare hindsight-thread insert (atomicity proof)');
        }

        const indicatorPool = await this.fodderReader.scanMicroEventKindsBeforeResolution(
          resolvedItem.districtId,
          resolvedItem.occurredAtGameDay,
        );
        const indicatorsRng = makeRng(`news:${threadId}:indicators`);
        const cherryPickedIndicators = drawCherryPickedIndicators(
          indicatorPool,
          newsBeatTunables.hindsightIndicatorCount,
          indicatorsRng,
        );

        const scheduleRng = makeRng(`news:${threadId}:schedule`);
        const publicationScheduleGameDays = computeHindsightPublicationSchedule(
          gameDay,
          newsBeatTunables.hindsightTotalPublications,
          newsBeatTunables.hindsightPublicationWeeks,
          scheduleRng,
        );

        const retrospectiveArc: RetrospectiveArc = {
          eventResolvedRef: sourceFodderRef,
          cherryPickedIndicators,
          publicationScheduleGameDays,
        };
        const payload: HindsightThreadPayload = { retrospectiveArc, subjectI18nKey: resolvedItem.subjectI18nKey };
        return payload as unknown as Record<string, unknown>;
      },
    );
  }

  // ───────────────────────────── phase 2: hindsight publication (op-ed / follow-up) ──────────────────────

  /**
   * ONE due publication beat for an OPEN `hindsight` thread — index 0 is the op-ed (tier 2), every other
   * index a follow-up (tier 1, design §3.5.3 "mixte tier journaliste op-ed"). `fodder_refs` keeps citing
   * the SAME originally-resolved event on EVERY publication (the arc's whole premise is repeatedly
   * re-narrating that one resolution, never a fresh citation).
   */
  async composeHindsightPublicationBeat(thread: NewsThreadRow, publicationIndex: number, gameDay: number): Promise<NewsBeatRow> {
    const payload = thread.payload as unknown as HindsightThreadPayload;
    const isOpEd = publicationIndex === 0;
    const outlet = thread.journalist_key ? pressOutletByKey(journalistByKey(thread.journalist_key).outletKey) : PRESS_OUTLET_REGISTRY[0]!;
    const copy = copyForOutlet(isOpEd ? HINDSIGHT_COPY.opEd : HINDSIGHT_COPY.followUp, outlet.outletKey);

    const sourceAttribution: SourceAttribution = {
      tier: isOpEd ? 2 : 1,
      hedgeLevel: 0.0,
      outletKey: outlet.outletKey,
      ...(thread.journalist_key ? { journalistKey: thread.journalist_key } : {}),
    };

    return this.repo.insertTemplateBeat({
      gameDay,
      threadId: thread.id,
      templateId: 'hindsight',
      districtId: thread.district_id,
      beatCategory: thread.district_id !== null ? 'brennar_local' : 'national',
      frame: null, // hindsight has no frame concept (design §4.1 schema comment).
      outletKey: outlet.outletKey,
      journalistKey: thread.journalist_key,
      headlineI18nKey: copy.headlineI18nKey,
      bodyI18nKey: copy.bodyI18nKey,
      params: {
        district: thread.district_id !== null ? `district-${thread.district_id}` : null,
        subject: payload.subjectI18nKey,
        outlet: outlet.nameI18nKey,
      },
      sourceAttribution,
      fodderRefs: [payload.retrospectiveArc.eventResolvedRef],
    });
  }

  // ───────────────────────────── phase 3: wire day composition ───────────────────────────────────────────

  /**
   * `wireDayHomogenizationCount` one-shot beats sharing ONE `wire_source_id` (design §3.5.7) — `rng` is
   * the SAME instance the caller (`BrennarDailyService.evaluateAndComposeWireDay`) already drew the
   * trigger-chance roll from (design §8 "ONE rng stream for the whole phase" — this call consumes exactly
   * 1 more draw, the shared frame, before the deterministic per-beat loop below).
   */
  async composeWireDayBeats(gameDay: number, fodderItems: readonly FodderItem[], rng: Rng): Promise<NewsBeatRow[]> {
    const count = newsBeatTunables.wireDayHomogenizationCount;
    const wireSourceId = `wire:${gameDay}`;
    const topFodder = pickWireDayTopFodder(fodderItems);
    const frame = pickWireDayFrame(rng);
    const subjectI18nKey = topFodder?.subjectI18nKey ?? WIRE_DAY_NEUTRAL_SUBJECT_I18N_KEY;
    const fodderRefs: FodderRefCitation[] = topFodder ? [{ sourceKind: topFodder.sourceKind, refId: topFodder.refId }] : [];

    const beats: NewsBeatRow[] = [];
    for (let i = 0; i < count; i++) {
      const outlet = PRESS_OUTLET_REGISTRY[i % PRESS_OUTLET_REGISTRY.length]!;
      const sourceAttribution: SourceAttribution = {
        tier: 1,
        hedgeLevel: 0.0,
        outletKey: outlet.outletKey,
        wireSourceId,
      };
      beats.push(
        await this.repo.insertTemplateBeat({
          gameDay,
          threadId: null, // wire_day is one-shot — no news_thread row (design §4.2's own 5-template list excludes it).
          templateId: 'wire_day',
          districtId: topFodder?.districtId ?? null,
          beatCategory: wireDayCategoryForIndex(i),
          frame,
          outletKey: outlet.outletKey,
          journalistKey: null, // wire copy carries no local byline (design §3.5.7).
          headlineI18nKey: WIRE_DAY_COPY.headlineI18nKey,
          bodyI18nKey: WIRE_DAY_COPY.bodyI18nKey,
          params: { subject: subjectI18nKey, outlet: outlet.nameI18nKey, frame },
          sourceAttribution,
          fodderRefs,
        }),
      );
    }
    return beats;
  }

  // ───────────────────────────── phase 4c: three_outlet_storm composition (C4) ────────────────────────

  /**
   * `composeThreeOutletStormBeats` (design §3.5.4) — opens a NEW `three_outlet_storm` thread for
   * `triggerItem` (a `FodderItem` with `severityBand === 'high'`, evaluated by `BrennarDailyService.
   * evaluateThreeOutletStormTrigger`): ATOMIC insert-then-augment (`NewsBeatRepository.
   * insertThreeOutletStormThreadAtomic`, built atomic from the start — see file header), the seeded
   * `news:{thread_id}:frame` draw (3 DISTINCT frames without replacement, design §8), and the 3
   * simultaneous beats — 1 PER `PRESS_OUTLET_REGISTRY` entry, index-aligned to the drawn frames.
   */
  async composeThreeOutletStormBeats(gameDay: number, triggerItem: FodderItem): Promise<NewsThreadRow> {
    const sourceFodderRef: FodderRefCitation = { sourceKind: triggerItem.sourceKind, refId: triggerItem.refId };
    const journalist = triggerItem.districtId !== null ? journalistsCoveringDistrict(triggerItem.districtId)[0] : undefined;

    return this.repo.insertThreeOutletStormThreadAtomic(
      {
        templateId: 'three_outlet_storm',
        journalistKey: journalist?.journalistKey ?? null,
        districtId: triggerItem.districtId,
        openedAtGameDay: gameDay,
        sourceFodderRef,
      },
      async (threadId) => {
        const frameRng = makeRng(`news:${threadId}:frame`);
        const frames = drawDistinctStormFrames(frameRng, PRESS_OUTLET_REGISTRY.length);

        const salience: Record<string, number> = {};
        const outletKeysByFrame: Record<string, string> = {};
        const beats: Omit<NewTemplateBeatInput, 'threadId'>[] = [];

        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i]! as StormFrame;
          const outlet = PRESS_OUTLET_REGISTRY[i]!;
          salience[frame] = 1; // design §3.5.4 "salience vector {frame -> count} init 1 chacun".
          outletKeysByFrame[frame] = outlet.outletKey;
          const copy = copyForOutlet(STORM_COPY[frame], outlet.outletKey);
          const sourceAttribution: SourceAttribution = {
            tier: 1, // direct, unlaundered reporting — see news-beat.types.ts's own outletTier doc comment.
            hedgeLevel: 0.0,
            outletKey: outlet.outletKey,
            outletTier: outlet.tier,
            ...(journalist ? { journalistKey: journalist.journalistKey } : {}),
          };
          beats.push({
            gameDay,
            templateId: 'three_outlet_storm',
            districtId: triggerItem.districtId,
            beatCategory: beatCategoryForStormFrame(frame),
            frame,
            outletKey: outlet.outletKey,
            journalistKey: journalist?.journalistKey ?? null,
            headlineI18nKey: copy.headlineI18nKey,
            bodyI18nKey: copy.bodyI18nKey,
            params: {
              district: triggerItem.districtId !== null ? `district-${triggerItem.districtId}` : null,
              subject: triggerItem.subjectI18nKey,
              outlet: outlet.nameI18nKey,
              frame,
            },
            sourceAttribution,
            fodderRefs: [sourceFodderRef],
          });
        }

        const payload: StormThreadPayload = {
          frames,
          outletKeysByFrame,
          salience,
          salienceAdvancedThroughGameDay: gameDay,
        };
        return { payload: payload as unknown as Record<string, unknown>, beats };
      },
    );
  }

  // ───────────────────────────── C7: BO force-generate dispatch (design §6.2) ────────────────────────────

  /**
   * `forceGenerate` (design §6.2 `POST force-generate` — "force UNE évaluation template par le MÊME
   * code-path que le tick, jamais un bypass INSERT"): dispatches `templateId` to the EXACT SAME
   * composition method `BrennarDailyService`'s own tick calls — for `three_outlet_storm`,
   * `composeThreeOutletStormBeats` above, producing an IDENTICAL structural shape (1 thread + 3 beats,
   * design §3.5.4) whether it fires from a real tick trigger or this admin dispatch (the E2E floor's own
   * "beats/thread IDENTICAL in shape" anti-fig-leaf proof). Restricted to
   * {@link ForceableNewsBeatTemplateId} — `NewsAdminController` MUST have already validated `templateId`
   * against {@link isForceableNewsBeatTemplateId} before calling this (a template outside that set
   * reaching here is a controller-side bug, not a defensive re-check — mirrors
   * `RandomWorldEventGeneratorService.forceActivate`'s own posture, 04g-B C5).
   *
   * The other 6 LIVE templates are deliberately excluded from this generic (templateId+fodderRef)
   * dispatch (D2/design §11, TD routed at this closeout):
   *   - `cooper_affair`/`sourceless_beat`/`slow_page`: continuous ambient-residue/mood/interest-SIGNAL-
   *     driven triggers (D6/D7/D9) — no single `fodderRef` expresses "force this one now"; their OWN
   *     trigger state (ambient residue excess, journalist readiness, per-district interest counter) is
   *     not a parameter this endpoint's shape can carry.
   *   - `hindsight`: needs the FULL resolution-scan + cherry-picked-indicator-pool orchestration
   *     (`composeRetrospectiveArc`'s own multi-step contract, itself already keyed off a RESOLVED
   *     `FodderItem` from a dedicated scan) — not a single fodderRef→beat call this generic shape covers.
   *   - `wire_day`: a CITYWIDE roll over the day's aggregate low-production signal (`fodder_counts`
   *     history) — no per-fodderRef semantics exist for it at all.
   *   - `folded_page`: `applySpiralOfSilenceOmission` internally RE-CHECKS the severity/self-censor gate
   *     and may legitimately return `null` (a documented non-fire) — a "force" that could silently no-op
   *     would be a confusing admin UX, unlike `three_outlet_storm`'s unconditional compose.
   */
  async forceGenerate(templateId: ForceableNewsBeatTemplateId, fodderItem: FodderItem, gameDay: number): Promise<NewsThreadRow> {
    switch (templateId) {
      case 'three_outlet_storm':
        return this.composeThreeOutletStormBeats(gameDay, fodderItem);
    }
  }

  // ───────────────────────────── phase 4b: folded_page composition (C4) ──────────────────────────────────

  /**
   * `applySpiralOfSilenceOmission(fodderItem)` — canon method name VERBATIM (news_beat_templates.md
   * :208/:222). Design §3.5.5/decisions D11: internally re-checks the severity-band gate (never assumes
   * the caller pre-filtered — the composite's own "magnitude" half), draws ONE seeded candidate suppressor
   * outlet (`news:{fodderItem.refId}:suppressor`, design §8 "suppressor" purpose — keyed off the FODDER
   * ITEM's own id rather than a thread id: `folded_page` is one-shot, design §3.5.5 "pas de thread", so no
   * thread id exists to key off), and checks whether that DRAWN outlet's own `selfCensorCoefficient`
   * clears `foldedPageSuppressionThresholdSeverity` (0.6). Returns `null` (a legitimate non-fire, NEVER a
   * fabricated beat) when: severity doesn't qualify, the drawn outlet doesn't clear the threshold, or
   * fewer than 2 outlets remain to cover (structurally unreachable today, D3's 3-outlet registry, but
   * checked explicitly — "falsifiable if the registry shrinks", mirrors storm's own outlet-count guard).
   * On a pass: the `foldedPageOutletCountTracked - 1` covering outlets each get a normal digest-style
   * citation (`NEWS_BEAT_DIGEST_COPY`, REUSE — design "citations normales") PLUS the ONE hollow beat
   * (`template_id: 'folded_page'`), all inserted atomically (`NewsBeatRepository.
   * insertFoldedPageBeatsAtomic`).
   */
  async applySpiralOfSilenceOmission(fodderItem: FodderItem, gameDay: number): Promise<NewsBeatRow | null> {
    if (fodderItem.severityBand !== 'high') return null; // Scénario 3's own falsifiable negation half.

    const rng = makeRng(`news:${fodderItem.refId}:suppressor`);
    const suppressorIndex = rng.int(0, PRESS_OUTLET_REGISTRY.length - 1);
    const suppressor = PRESS_OUTLET_REGISTRY[suppressorIndex]!;
    if (!foldedPageSuppressorQualifies(suppressor.selfCensorCoefficient, newsBeatTunables.foldedPageSuppressionThresholdSeverity)) {
      return null; // this draw's candidate doesn't self-censor enough — a legitimate non-fire (design §3.5.5).
    }
    const covering = PRESS_OUTLET_REGISTRY.filter((_, i) => i !== suppressorIndex);
    if (covering.length < 2) return null; // "≥2 outlets restants couvrent" — structural guard (falsifiable if the registry shrinks).

    const suppressedFodderRef: FodderRefCitation = { sourceKind: fodderItem.sourceKind, refId: fodderItem.refId };
    const districtParam = fodderItem.districtId !== null ? `district-${fodderItem.districtId}` : null;

    const coveringBeatInputs = covering.map((outlet) => {
      const journalist =
        fodderItem.districtId !== null
          ? journalistsForOutlet(outlet.outletKey).find((j) => j.beatDistrictIds.includes(fodderItem.districtId!))
          : undefined;
      // ★ voiced on the COVERING outlet's own key (Brennar-voice design DV-6) — each covering outlet
      // gets ITS OWN voice on the digest catalogue, never the suppressor's.
      const digestCopy = copyForOutlet(NEWS_BEAT_DIGEST_COPY[fodderItem.sourceKind], outlet.outletKey);
      const sourceAttribution: SourceAttribution = {
        tier: 1,
        hedgeLevel: 0.0,
        outletKey: outlet.outletKey,
        ...(journalist ? { journalistKey: journalist.journalistKey } : {}),
      };
      return {
        gameDay,
        districtId: fodderItem.districtId,
        beatCategory: newsBeatCategoryForFodderItem(fodderItem),
        outletKey: outlet.outletKey,
        journalistKey: journalist?.journalistKey ?? null,
        headlineI18nKey: digestCopy.headlineI18nKey,
        bodyI18nKey: digestCopy.bodyI18nKey,
        params: { district: districtParam, subject: fodderItem.subjectI18nKey, outlet: outlet.nameI18nKey },
        sourceAttribution,
        fodderRefs: [suppressedFodderRef],
      };
    });

    const omissionRecord: OmissionRecord = {
      suppressingOutletKey: suppressor.outletKey,
      coveringOutlets: covering.map((o) => o.outletKey),
      suppressedFodderRef,
    };
    const hollowSourceAttribution: SourceAttribution = {
      tier: 1,
      hedgeLevel: 0.0,
      outletKey: suppressor.outletKey,
      omissionObservedInOutlets: covering.map((o) => o.outletKey),
      omissionRecord,
    };
    // ★ voiced on the SUPPRESSOR's own key (Brennar-voice design DV-6) — the hollow marker registers
    // THAT outlet's characteristic silence, never the covering outlets' voice.
    const hollowCopy = copyForOutlet(FOLDED_PAGE_COPY, suppressor.outletKey);
    const hollowBeatInput: NewTemplateBeatInput = {
      gameDay,
      threadId: null, // one-shot — no news_thread row (design §3.5.5 "pas de thread").
      templateId: 'folded_page',
      districtId: fodderItem.districtId,
      beatCategory: 'brennar_local', // design §3.5.5 verbatim — hardcoded regardless of fodderItem's own D14 mapping.
      frame: null, // folded_page has no frame concept (mirrors hindsight's own schema comment).
      outletKey: suppressor.outletKey,
      journalistKey: null,
      headlineI18nKey: hollowCopy.headlineI18nKey,
      bodyI18nKey: hollowCopy.bodyI18nKey,
      params: { district: districtParam, subject: fodderItem.subjectI18nKey, outlet: suppressor.nameI18nKey },
      sourceAttribution: hollowSourceAttribution,
      fodderRefs: [suppressedFodderRef],
    };

    const { hollowBeat } = await this.repo.insertFoldedPageBeatsAtomic(coveringBeatInputs, hollowBeatInput);
    return hollowBeat;
  }

  // ───────────────────────────── phase 4a: cooper_affair composition (C5 ❤️) ──────────────────────────

  /**
   * `cooper_affair`'s OWN open composition (design §3.5.1) — called by `BrennarDailyService.
   * evaluateCooperAffairTrigger` ONLY after the residue-vs-hum-baseline margin AND the covering-journalist
   * cohesion gate have BOTH passed AND the seeded roll fired (`cooperFrameOnlyNoIncidentProbability`).
   * `journalistKey` is the ELIGIBLE covering journalist the trigger found — OPTIONAL here purely so the
   * DEV-only test probe (`news-test.controller.ts`'s `compose-cooper-affair-thread`, the displacement
   * proof's OWN bypass of the residue/journalist gates) can open a thread on an ARBITRARY district
   * without needing a real qualifying journalist; every REAL production caller always supplies one (the
   * trigger's OWN eligibility scan never calls this without one). ATOMIC (`NewsBeatRepository.
   * insertCooperAffairThreadAtomic`, built atomic from the start, mirrors storm's own C4 precedent) — the
   * seeded `news:{thread_id}:frame` draw needs the DB-generated thread id, so the 2-step insert-then-
   * augment shape is unavoidable (SAME reasoning `composeThreeOutletStormBeats`'s own header documents).
   * `fodder_refs`: cites the SAME-day/SAME-district `ambient_micro_event` rows, if any exist — see
   * `NewsBeatRepository.ambientMicroEventRefsForDistrictOnDay`'s own doc comment for the FULL reasoning
   * (a documented, argued divergence, flagged for reviewer attention).
   *
   * ★ Displacement side-effect (design §3.5.2, THIS keystone's own asymmetric half — see
   * `NewsBeatRepository.displaceOpenSourcelessThreadsInDistrict`'s own doc comment): every cooper open
   * closes an EXISTING open `sourceless_beat` thread on the SAME district, unconditionally.
   */
  async composeCooperAffairThread(gameDay: number, districtId: number, journalistKey?: string): Promise<NewsThreadRow> {
    const outletKey = journalistKey ? journalistByKey(journalistKey).outletKey : PRESS_OUTLET_REGISTRY[0]!.outletKey;
    const outlet = pressOutletByKey(outletKey);
    const fodderRefs = await this.repo.ambientMicroEventRefsForDistrictOnDay(districtId, gameDay);

    const thread = await this.repo.insertCooperAffairThreadAtomic(
      { templateId: 'cooper_affair', journalistKey: journalistKey ?? null, districtId, openedAtGameDay: gameDay, sourceFodderRef: null },
      async (threadId) => {
        const frameRng = makeRng(`news:${threadId}:frame`);
        const frameId = drawInitialCooperFrame(frameRng);
        const copy = copyForOutlet(COOPER_COPY[frameId], outletKey);
        const sourceAttribution: SourceAttribution = {
          tier: 1,
          hedgeLevel: 0.0,
          outletKey,
          ...(journalistKey ? { journalistKey } : {}),
        };
        const beat: Omit<NewTemplateBeatInput, 'threadId'> = {
          gameDay,
          templateId: 'cooper_affair',
          districtId,
          beatCategory: 'brennar_local',
          frame: frameId,
          outletKey,
          journalistKey: journalistKey ?? null,
          headlineI18nKey: copy.headlineI18nKey,
          bodyI18nKey: copy.bodyI18nKey,
          params: { district: `district-${districtId}`, outlet: outlet.nameI18nKey, frame: frameId },
          sourceAttribution,
          fodderRefs,
        };
        const payload: CooperAffairThreadPayload = {
          frameId,
          halfLifeDays: newsBeatTunables.cooperFrameHalfLifeDays,
          reframeResistance: 0.0,
          reframeCount: 0,
          currentOutletKey: outletKey,
          ...(journalistKey ? { currentJournalistKey: journalistKey } : {}),
          advancedThroughGameDay: gameDay,
        };
        return { payload: payload as unknown as Record<string, unknown>, beat };
      },
    );

    await this.repo.displaceOpenSourcelessThreadsInDistrict(districtId);
    return thread;
  }

  /**
   * Builds (but does NOT insert) ONE reframe beat's full input for an OPEN `cooper_affair` thread (design
   * §3.5.1 lifecycle: "sur reframe : beat de reframe (nouveau frame, rival outlet)") — called by
   * `BrennarDailyService.advanceCooperAffairThread`'s own daily catch-up loop, once per successful reframe
   * roll. `rivalJournalistKey` is OPTIONAL: the rival outlet does not necessarily have a journalist
   * covering THIS SPECIFIC district (design §3.6 — beats partition the 18 districts, so a rival outlet's
   * own 2 journalists may cover neither half of a given district; an honest omission, never fabricated —
   * mirrors the digest beat's own optional-journalist pattern).
   *
   * ★ I-2 fix (review gate IMPORTANT-2, post-merge): this method used to INSERT its own beat immediately
   * (autocommit, un-transactioned) — the caller's own SEPARATE, LATER cursor-update write left a crash
   * window (a throw between the two) that could double-publish a reframe beat on re-run: the reframe roll
   * is seeded `news:{thread_id}:reframe:{day}` (design §8, deterministic) — a stale cursor re-derives the
   * IDENTICAL winning outcome for the SAME day, so the re-run genuinely re-composes the SAME beat rather
   * than merely a different one. Fix: this method now ONLY BUILDS the beat's full input (the SAME
   * fodder-ref read + attribution/copy logic as before) and returns it WITHOUT inserting —
   * `advanceCooperAffairThread` collects every call's return value across its whole day-loop and hands the
   * WHOLE batch to `NewsBeatRepository.advanceCooperAffairThreadAtomic`, which inserts them ALL + the
   * cursor update (+ terminal conclude) inside ONE `db.transaction` (see that method's own doc comment for
   * the full mechanism — mirrors C3's `insertHindsightThreadAtomic`).
   */
  async composeCooperReframeBeat(
    thread: NewsThreadRow,
    newFrame: CooperFrame,
    rivalOutletKey: string,
    rivalJournalistKey: string | undefined,
    gameDay: number,
  ): Promise<Omit<NewTemplateBeatInput, 'threadId'>> {
    const outlet = pressOutletByKey(rivalOutletKey);
    const copy = copyForOutlet(COOPER_COPY[newFrame], rivalOutletKey);
    const fodderRefs = thread.district_id !== null ? await this.repo.ambientMicroEventRefsForDistrictOnDay(thread.district_id, gameDay) : [];
    const sourceAttribution: SourceAttribution = {
      tier: 1,
      hedgeLevel: 0.0,
      outletKey: rivalOutletKey,
      ...(rivalJournalistKey ? { journalistKey: rivalJournalistKey } : {}),
    };
    return {
      gameDay,
      templateId: 'cooper_affair',
      districtId: thread.district_id,
      beatCategory: 'brennar_local',
      frame: newFrame,
      outletKey: rivalOutletKey,
      journalistKey: rivalJournalistKey ?? null,
      headlineI18nKey: copy.headlineI18nKey,
      bodyI18nKey: copy.bodyI18nKey,
      params: {
        district: thread.district_id !== null ? `district-${thread.district_id}` : null,
        outlet: outlet.nameI18nKey,
        frame: newFrame,
      },
      sourceAttribution,
      fodderRefs,
    };
  }

  // ───────────────────────────── phase 4a: sourceless_beat composition (C5 ❤️, the INVERSION) ──────────

  /**
   * `sourceless_beat`'s OWN open composition (design §3.5.2 — the canon `composeBeat(null, "sourceless_
   * beat")` inversion: NO `triggeringEventRef`, `fodder_refs = []`). Called by `BrennarDailyService.
   * evaluateSourcelessBeatTrigger` ONLY after readiness + city-mood + the seeded roll ALL pass. `rng` is
   * the SAME shared instance the caller already drew the trigger-chance roll from (design §8 "ordre de
   * tirage FIXE" — this call consumes exactly 1 more draw, `claimed_subject`, mirrors `evaluateAndCompose
   * WireDay`'s own "one stream for the whole phase" precedent).
   *
   * ★ `forcePoisonedAttribution` — TEST-ONLY (mirrors `composeRetrospectiveArc`'s own
   * `forceThrowAfterInsert` fault-injection precedent): when `true`, builds a DELIBERATELY chain-
   * violating `SourceAttribution` (carrying `outletKey` + a non-null `hedgeLevel` alongside
   * `sourceless:true`) to prove `NewsBeatRepository.insertSourcelessThreadAtomic`'s own
   * `assertSourcelessAttributionShape` guard throws BEFORE any row commits — the "unit-level repo guard"
   * the E2E floor's chain-refusal proof targets (`news-test.controller.ts`'s dedicated DEV-gated probe).
   * NEVER set outside that probe — defaults to `false` for every real caller, which always produces the
   * canon-shaped `{tier:1, hedgeLevel:null, sourceless:true}` (design §3.5.2, ★ "forbidden to chain" —
   * NO `outletKey`/`journalistKey` in the composite, see `news-beat.types.ts`'s own doc comment on
   * `SourceAttribution.outletKey`).
   */
  async composeSourcelessBeat(gameDay: number, journalistKey: string, rng: Rng, forcePoisonedAttribution = false): Promise<NewsThreadRow> {
    const claimedDistrictId = rng.int(1, SOURCELESS_TOTAL_DISTRICTS); // design §3.5.2 "district tiré seedé" — uniform over the 18 real districts.
    const journalist = journalistByKey(journalistKey);
    const outlet = pressOutletByKey(journalist.outletKey);

    return this.repo.insertSourcelessThreadAtomic(
      { templateId: 'sourceless_beat', journalistKey, districtId: claimedDistrictId, openedAtGameDay: gameDay, sourceFodderRef: null },
      async () => {
        const sourceAttribution: SourceAttribution = forcePoisonedAttribution
          ? { tier: 1, hedgeLevel: 0.0, outletKey: outlet.outletKey, sourceless: true } // ★ TEST-ONLY poisoned shape.
          : { tier: 1, hedgeLevel: null, sourceless: true };
        const copy = copyForOutlet(SOURCELESS_BEAT_COPY, outlet.outletKey);
        const beat: Omit<NewTemplateBeatInput, 'threadId'> = {
          gameDay,
          templateId: 'sourceless_beat',
          districtId: claimedDistrictId,
          beatCategory: 'national',
          frame: null,
          outletKey: outlet.outletKey, // row-level column (structural NOT NULL, "who technically ran the copy") — NOT echoed inside source_attribution above (design §3.5.2, see news-beat.types.ts).
          journalistKey, // row-level column (readiness-reset derivation, D7) — likewise not echoed inside source_attribution.
          headlineI18nKey: copy.headlineI18nKey,
          bodyI18nKey: copy.bodyI18nKey,
          params: { district: `district-${claimedDistrictId}`, outlet: outlet.nameI18nKey },
          sourceAttribution,
          fodderRefs: [], // ★ the falsifiable contract — sourceless cites NOTHING (design §4.1).
        };
        const payload: SourcelessBeatThreadPayload = { arcIndex: SOURCELESS_ARC_INITIAL_INDEX, decayedThroughWeek: 0 };
        return { payload: payload as unknown as Record<string, unknown>, beat };
      },
    );
  }

  // ───────────────────────────── phase 4d: slow_page composition (C6) ────────────────────────────────

  /**
   * `slow_page`'s OWN open composition (design §3.5.6) — called by `BrennarDailyService.
   * evaluateSlowPageTrigger` ONLY after the interest-counter crossing (D9) + a covering journalist for
   * `districtId` have BOTH been found AND the keystone-style duplicate-inhibition gate has cleared.
   * ATOMIC (`NewsBeatRepository.insertSlowPageThreadAtomic`, mirrors `insertHindsightThreadAtomic`'s own
   * "bare insert, THEN a DB-generated-id-seeded draw, THEN the payload update, all in one transaction"
   * shape) — the seeded `news:{thread_id}:installments` draw needs the DB-generated thread id, so the
   * 2-step insert-then-augment shape is unavoidable (SAME reasoning `composeThreeOutletStormBeats`'s own
   * header documents). Produces NO beat (mirrors `composeRetrospectiveArc`'s own "the trigger itself
   * produces zero beats" shape — the 1st installment is only ever due 7 game-days later, phase 2).
   */
  async composeSlowPageSeries(gameDay: number, districtId: number, journalistKey: string): Promise<NewsThreadRow> {
    return this.repo.insertSlowPageThreadAtomic(
      { templateId: 'slow_page', journalistKey, districtId, openedAtGameDay: gameDay, sourceFodderRef: null },
      async (threadId) => {
        const installmentsRng = makeRng(`news:${threadId}:installments`);
        const range = NEWS_BEAT_TUNABLE_CAPS['news_beats.slow_page_installments_default']!;
        const installmentsTotal = drawInstallmentsTotal(installmentsRng, range.min, range.max);
        const payload: SlowPageThreadPayload = { installmentsTotal };
        return payload as unknown as Record<string, unknown>;
      },
    );
  }

  /**
   * Builds (but does NOT insert — mirrors `composeCooperReframeBeat`'s post-I-2 shape, applied
   * PROACTIVELY here from the start) ONE due installment beat's full input for an OPEN `slow_page`
   * thread (design §3.5.6 lifecycle: "installment dû → beat"). `installmentIndex` is 0-based (0 = the
   * opening installment, `SLOW_PAGE_COPY.opening`; every later index, `SLOW_PAGE_COPY.continuing` —
   * mirrors hindsight's own op-ed/follow-up split). `SourceAttribution.seriesId` = the thread's OWN `id`
   * (design "PARTAGÉE" — shared across every installment of the SAME series, `SlowPageThreadPayload`'s
   * own doc comment). `fodder_refs`: cites the SAME-day/SAME-district `ambient_micro_event` rows if any
   * exist (★ coder judgment call, documented — the SAME divergence `composeCooperAffairThread`'s own doc
   * comment already argues for cooper: slow_page's trigger is genuinely aggregate/ambient, no single
   * discrete fodder row, so a legitimate `[]` here is NOT a violation of the schema's "ONLY sourceless"
   * wording — an ARGUED divergence, not a silent gap).
   */
  async composeSlowPageInstallmentBeat(thread: NewsThreadRow, installmentIndex: number, gameDay: number): Promise<Omit<NewTemplateBeatInput, 'threadId'>> {
    const journalistKey = thread.journalist_key;
    const outletKey = journalistKey ? journalistByKey(journalistKey).outletKey : PRESS_OUTLET_REGISTRY[0]!.outletKey;
    const outlet = pressOutletByKey(outletKey);
    const copy = copyForOutlet(installmentIndex === 0 ? SLOW_PAGE_COPY.opening : SLOW_PAGE_COPY.continuing, outletKey);
    const fodderRefs = thread.district_id !== null ? await this.repo.ambientMicroEventRefsForDistrictOnDay(thread.district_id, gameDay) : [];
    const sourceAttribution: SourceAttribution = {
      tier: 1,
      hedgeLevel: 0.0,
      outletKey,
      ...(journalistKey ? { journalistKey } : {}),
      seriesId: thread.id,
    };
    return {
      gameDay,
      templateId: 'slow_page',
      districtId: thread.district_id,
      beatCategory: 'brennar_local',
      frame: null, // slow_page has no frame concept (design §4.1 schema comment).
      outletKey,
      journalistKey,
      headlineI18nKey: copy.headlineI18nKey,
      bodyI18nKey: copy.bodyI18nKey,
      params: {
        district: thread.district_id !== null ? `district-${thread.district_id}` : null,
        outlet: outlet.nameI18nKey,
      },
      sourceAttribution,
      fodderRefs,
    };
  }
}

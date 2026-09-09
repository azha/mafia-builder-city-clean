// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (BrennarDailyService —
//             NIGHTLY/30 daily tick, phases 0/1/5/6) + C3 (phase 2 generic thread advance, phase 3 wire
//             day, phase 4d hindsight trigger) + C4 (phase 4b folded_page, phase 4c three_outlet_storm +
//             its OWN phase-2 daily salience advance + the wire↔storm exclusion wiring) + C6 (phase 4d
//             slow_page trigger [the interest-counter accumulation + crossing, D9] + its OWN phase-2
//             installment advance)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.2 (the tick, fixed
//             phase ordering) + §3.2.3 (wire↔storm mutual exclusion) + §3.5.4 (three_outlet_storm) +
//             §3.5.5 (folded_page) + §3.5.6 (slow_page) + §12 (numbering)
//             Scheduler seam S1: NIGHTLY/30 (`CitySystemId.BRENNAR_DAILY_TICK`, city_sim_system.ts +
//             city_sim_scheduler.service.ts, 2-step registration added C2).
//             Pattern: mirrors `RandomWorldEventGeneratorService`/`AmbientMicroEventService`'s own
//             claim + direct-probe tick-body idiom.
//             — 04g-C C2 — 2026-07-16
//             — 04g-C C3 — 2026-07-16 (phases 2/3/4d go live; 4a/4b/4c stay placeholders, C4/C5 scope)
//             — ★ C3 fix (review gate BLOCKING-1, post-merge): `advanceHindsightThread` (phase 2) gained
//               a defensive guard against a payload-less/malformed hindsight thread's own TypeError —
//               belt-and-suspenders alongside the atomic-write fix in `news-beat-generator.service.ts`/
//               `news-beat.repository.ts` (design §8 "un tick mort ne bloque pas le lendemain").
//             — 04g-C C4 — 2026-07-16 (phase 4b `evaluateFoldedPageTrigger` + phase 4c
//               `evaluateThreeOutletStormTrigger` go live; `advanceOpenThreads` dispatches
//               `three_outlet_storm` to its own `advanceThreeOutletStormThread`; 4a (keystones) and
//               `slow_page` STAY documented no-op placeholders, C5/C6 scope)
//             — 04g-C C5 — 2026-07-16 (phase 4a `evaluateCooperAffairTrigger` + `evaluateSourcelessBeat
//               Trigger` go live, THE ❤️ keystone pair; `advanceOpenThreads` dispatches `cooper_affair` to
//               `advanceCooperAffairThread` [reframe lifecycle] and `sourceless_beat` to
//               `advanceSourcelessBeatThread` [silent-week decay] — `slow_page` STAYS a documented no-op
//               placeholder, C6 scope)
//             — ★ I-2 fix (review gate IMPORTANT-2, post-merge): `advanceCooperAffairThread`'s own reframe
//               beat insert(s) + cursor `payload` update (+ terminal conclude) now run inside ONE
//               transaction (`NewsBeatRepository.advanceCooperAffairThreadAtomic`) — a throw between a
//               committed reframe beat and the cursor write let a deterministic seeded re-run double-
//               publish the identical beat (the SAME anti-pattern C3's BLOCKING-1 fix closed for
//               hindsight's OPEN, applied here to cooper's own daily ADVANCE). `advanceOpenThreads` gained
//               an optional `forceThrowAfterReframeBeat` TEST-ONLY param, threaded through to prove the
//               rollback (`news-test.controller.ts`'s `advance-threads` probe). `advanceSourcelessBeatThread`
//               was checked for the SAME defect class and does NOT have it — see that method's own doc
//               comment (no beat insert in its advance at all; its terminal conclude is unconditionally
//               re-derived from the persisted `arcIndex` every call, so it already self-heals).
//             — 04g-C C6 — 2026-07-16: phase 4d `evaluateSlowPageTrigger` goes live (the LAST LIVE
//               template, design §3.5.6/D9) — the interest-counter accumulation (mirror
//               `quorum_adoption`, computed for EVERY heat-observed district every tick regardless of
//               whether a NEW series can open) + the crossing-gated, GLOBALLY duplicate-inhibited series
//               open; `advanceOpenThreads` dispatches `slow_page` to its own `advanceSlowPageThread`
//               (installment publication, atomic from the start — proactively mirroring the I-2 lesson,
//               `advanceSlowPageThreadAtomic`). `advanceOpenThreads` ALSO now returns PER-TEMPLATE
//               published counts (`hindsightPublished`/`cooperReframesPublished`/
//               `slowPageInstallmentsPublished`, alongside the pre-existing summed `publishedCount` the
//               phase-5 slot math still consumes unchanged) — a direct, motivated byproduct of adding
//               slow_page as a 3RD contributor to that SAME aggregate: the phase-6 `templateCounts`
//               block below was already mislabeling cooper's OWN reframe count under the `hindsight`
//               bucket (`threadAdvance.publishedCount` summed BOTH), an existing imprecision this chunk's
//               own 3rd contributor would have made strictly worse left unfixed — corrected here as a
//               natural consequence of the same touch, not a gratuitous refactor.
//
// `BrennarDailyService` — the daily tick (design §3.2, canon name gdd/15:1852, Scénario 1 :194 names
// `dailyTick` verbatim). PER-PLAYER-FIRING, CITY-GLOBAL-STATE (S6): `dailyTick(gameDay)` fires once per
// player's own NIGHTLY boundary crossing; phase 0's claim (`news_daily_run` PK `game_day`) dedups so
// only the FIRST firing for a `game_day` evaluates anything — every other/later firing is a pure no-op.
//
// PHASES (fixed order, design §3.2 — ★ C4 lights up phases 4b/4c; 4a (keystones) and `slow_page` STAY
// documented no-op placeholders, C5/C6 scope — the SAME "N getters at C1, consumers land later"
// honest-scaffolding precedent `RandomWorldEventGeneratorService`'s own file header established for its
// own phase 3 template loop):
//   0. claim the game_day (repo.claimDay) — abort (no-op) if lost.
//   1. `NewsFodderReader.scanFodder` — the day's normalized fodder (design §3.3).
//   2. thread advance (`advanceOpenThreads`): generic dispatch over EVERY `open` thread by `template_id`
//      — `hindsight` (C3) publishes due op-ed/follow-ups + closes on schedule exhaustion (design §3.5.3);
//      `three_outlet_storm` (THIS chunk) advances its daily salience race + resolves at the contest
//      horizon/persistence horizon (design §3.5.4). `cooper_affair`/`slow_page` are C5/C6 scope: the
//      dispatcher's `default` branch is a genuine no-op (no thread of those templates can exist yet,
//      zero writer before those chunks), not a stub hiding missing behavior.
//   3. wire-day determination + composition (`evaluateAndComposeWireDay`, C3, design §3.5.7): seeded
//      roll (weighted up on low recent fodder production) → if fired, compose
//      `wire_day_homogenization_count` beats + set the `wireDay` gate flag. ★ Mutual exclusion (design
//      §3.2.3, THIS chunk wires the CONSUMING half): `wireDay` (in-memory `wireDayEval.fired`, ALSO
//      threaded into phase 6's `news_daily_run.wire_day` column) is the flag phase 4c's
//      `evaluateThreeOutletStormTrigger` reads to skip itself this SAME game_day. Reciprocal (per-day,
//      falsifiable both ways): a storm OPEN yesterday never blocks TODAY's wire-day roll — nothing in
//      `evaluateAndComposeWireDay` reads storm state at all, structurally one-directional.
//   4. template evaluations (design §3.2 phase-4 preamble: each gated by ITS OWN persistence/duplicate
//      inhibition): 4a (keystones, THIS chunk, design §3.5.1/§3.5.2 — the ❤️ mutex pair, cooper_affair
//      THEN sourceless_beat, each independently GLOBAL-mutex'd via `isKeystoneInhibited`
//      [`hasOpenThreadOfTemplate` OR `hasRecentBeatOfTemplate` within `beatPersistenceInFeedHours`]):
//      `evaluateCooperAffairTrigger` scans every district's residue-vs-hum-baseline excess (S3,
//      decisions D6) + covering-journalist cohesion gate, ONE seeded roll PER eligible district (ascending
//      district_id) until a pass opens the ONLY cooper thread this run may open; `evaluateSourcelessBeat
//      Trigger` scans journalist readiness (D7, pure ledger derivation) + city-mood receptiveness (D7,
//      cross-player cohesion + recent news density) + a seeded roll — the canon INVERSION, zero fodder,
//      `composeSourcelessBeat` draws its OWN `claimed_subject` district. 4b (`folded_page` TRIGGER,
//      C4, design §3.5.5): per `severityBand='high'` fodder item this day, a seeded suppressor
//      draw (`applySpiralOfSilenceOmission`) — a pass composes the 2 covering digest beats + the 1 hollow
//      beat. 4c (`three_outlet_storm` TRIGGER, C4, design §3.5.4 — NEVER on a wire day, the
//      exclusion above): the FIRST `severityBand='high'` fodder item this day, IF no `three_outlet_storm`
//      thread is already `open` (duplicate-inhibition, `repo.hasOpenThreadOfTemplate`) — structurally
//      satisfied (no probability roll: severity + ≥3 active outlets, D3), `composeThreeOutletStormBeats`
//      on a qualifying day. 4d (`hindsight` TRIGGER, C3, design §3.5.3): scan resolutions at delay-window
//      maturity, seeded roll PER eligible candidate. Independent of `wireDay` (the mutual exclusion is
//      wire↔storm ONLY, never wire↔folded_page/wire↔hindsight/wire↔keystones).
//   5. digest fill (design §3.2.5/D4): rank the day's uncited fodder (severity → recency → seeded
//      tie-break, `news-beat-digest.ts`), fill up to `brennar_daily_beats_per_day_baseline` template-less
//      beats MINUS the slots phases 2/3/4b/4c already consumed THIS run (D4 "les publications de threads
//      … CONSOMMENT les slots" / "wire … ABSORBE le plancher" — storm's 3 simultaneous beats and
//      folded_page's 3 one-shot beats are the SAME class of slot-consumer) — never negative
//      (`Math.max(0, …)`). Anti-fig-leaf: if fewer real fodder items exist than remaining slots,
//      `beatsGeneratedCount` is honestly `< baseline` — NEVER a fabricated beat.
//   6. `news_daily_run` counters (beats_generated_count/template_counts/fodder_counts/wire_day).
//
// Determinism: NO `Math.random()` anywhere in this file — draw sources are `makeRng`, seeded
// `news:{game_day}:digest` / `news:{game_day}:hindsight` / `news:{game_day}:wire_day` (design §8); the
// hindsight PUBLICATION composition's own per-thread seeds (`news:{thread_id}:indicators`/`:schedule`)
// and the storm composition's own `news:{thread_id}:frame` live in `news-beat-generator.service.ts`; the
// folded_page suppressor draw's own `news:{fodderItem.refId}:suppressor` lives THERE too. THIS file's own
// NEW C4 seed is the storm daily-advance's `news:{thread_id}:salience:{game_day}` (`advanceThreeOutletStormThread`
// below — a documented, deliberate 3-part extension of design §8's 2-part `news:{thread_id}:{purpose}`
// scheme: no OTHER per-thread mechanic in this lot draws once PER CALENDAR DAY rather than once per
// thread-lifetime, so the day axis is folded into the seed string itself). The `Date.now()` reads in this
// module (F4 wall-clock duration log below; `NewsFodderReader`'s live-ops freshness window;
// `NewsBeatRepository`'s persistence-window dedup) are READ-time filters / diagnostics, never an RNG seed
// and never gameplay-branched — the SAME category as `live-ops-admin.controller.ts`'s own `sql\`now()\``
// read filters (design §3.3/D5's own "filtre de lecture, jamais un sweep").

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { makeRng, type Rng } from '../../common/seeded-rng';
import type { NewsBeatRow, NewsThreadRow } from '../../db/schema/news_beat';
import { ConstantHumRepository } from '../ambient/constant-hum.repository';
import { ambientTunables } from '../ambient/ambient.tunables';
import { deriveGameDay, deriveNightlyHourOfWeek } from './news-beat-clock';
import { newsBeatTunables } from './news-beat.tunables';
import { NewsFodderReader, newsBeatCategoryForFodderItem } from './news-fodder-reader.service';
import { NewsBeatRepository, type NewTemplateBeatInput } from './news-beat.repository';
import {
  NewsBeatGeneratorService,
  type CooperAffairThreadPayload,
  type HindsightThreadPayload,
  type SourcelessBeatThreadPayload,
  type StormThreadPayload,
  type SlowPageThreadPayload,
} from './news-beat-generator.service';
import { rankFodderForDigest, fodderRefKey, NEWS_BEAT_DIGEST_COPY } from './news-beat-digest';
import { copyForOutlet } from './outlet-voice';
import {
  JOURNALIST_REGISTRY,
  PRESS_OUTLET_REGISTRY,
  journalistsCoveringDistrict,
  journalistsForOutlet,
  pressOutletByKey,
  type PressOutletKey,
} from './press-registry';
import { WIRE_DAY_LOW_PRODUCTION_LOOKBACK_RUNS, computeWireDayProbability, isLowProduction } from './wire-day';
import { computeStormDailySalienceIncrement, evaluateStormLock } from './three-outlet-storm';
import { computeCooperReframeProbability, drawDistinctCooperFrame, roundToStableDecimal } from './cooper-affair';
import { computeCityMoodReceptiveness, computeJournalistFramingReadiness, decaySourcelessArcIndex, SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS } from './sourceless-beat';
import { districtInterestSignal, nextInterest, slowPageInstallmentDueDay } from './slow-page';
import type { FodderItem, FodderSourceKind, SourceAttribution } from './news-beat.types';

/** The NIGHTLY slot this tick registers at (S1) — MUST match the SCHEDULE entry
 *  (city_sim_scheduler.service.ts) or `registerSystem` throws at boot. RENUMBERED 29→30 at the
 *  04g-C integration: authored at the then-next-free N/29 (after `RANDOM_WORLD_DAILY_TICK`/28);
 *  P3-D merged first and took N/29 (`CUE_STACK_STALE_SWEEP`), so this tick moved to the
 *  next-free 30. */
export const BRENNAR_DAILY_TICK_ORDER = 30;

export interface BrennarDailyTickResult {
  readonly gameDay: number;
  readonly claimed: boolean;
  /** Phase 1 — total normalized fodder items scanned this run (all 4 sources, F4-capped). */
  readonly fodderScannedCount: number;
  /** Phase 5 — digest beats actually inserted this run (`< baseline` is an honest, legal outcome —
   *  design §3.2.5 anti-fig-leaf). */
  readonly digestBeatsCount: number;
  /** Phase 6 — total beats this run produced: digest + phase-2 thread publications + phase-3 wire-day
   *  beats (C3 folds these 2 NEW sources in; C4/C5 will fold in their own). */
  readonly beatsGeneratedCount: number;
  /** Phase 2 (C3) — due thread publications this run produced (`hindsight` op-ed/follow-ups only, this
   *  chunk). */
  readonly threadPublishedCount: number;
  /** Phase 2 (C3) — threads this run concluded (`series_completed` on schedule exhaustion). */
  readonly threadConcludedCount: number;
  /** Phase 3 (C3) — whether the wire-day roll fired this run (mirrors `news_daily_run.wire_day`). */
  readonly wireDay: boolean;
  /** Phase 3 (C3) — wire-day beats inserted this run (`0` when `wireDay` is `false`). */
  readonly wireDayBeatsCount: number;
  /** Phase 4d (C3) — hindsight arcs (NEW `news_thread` rows) opened this run. */
  readonly hindsightArcsOpenedCount: number;
  /** Phase 4b (C4) — `folded_page` beats composed this run (1 hollow + 2 covering PER fired instance —
   *  this counts ONLY the hollow beats, i.e. the number of times `applySpiralOfSilenceOmission` fired). */
  readonly foldedPageFiredCount: number;
  /** Phase 4c (C4) — `three_outlet_storm` threads (NEW `news_thread` rows) opened this run (0 or 1 — the
   *  duplicate-inhibition guard bounds this to at most 1 whole-city concurrent storm). */
  readonly stormArcsOpenedCount: number;
  /** Phase 4c (C4) — ★ the exclusion's OWN observability counter (design §3.2.3): `true` iff the storm
   *  trigger's OTHER conditions (severity + outlet-count) were ALL satisfied this run — i.e. a storm
   *  WOULD have opened — but the evaluation was refused SOLELY because `wireDayEval.fired` this SAME
   *  game_day. `false` both when no wire day fired AND when a wire day fired but no qualifying fodder
   *  existed anyway (a refusal needs something real to have refused) — the E2E floor's "evaluated, not
   *  merely absent" proof reads this field. */
  readonly stormEvaluationRefusedForWireDay: boolean;
  /** Phase 4a (C5 ❤️) — `1` iff `cooper_affair`'s trigger opened a NEW thread this run (`0` otherwise —
   *  the keystone's OWN global duplicate-inhibition bounds this to at most 1 concurrent thread
   *  city-wide). */
  readonly cooperAffairArcsOpenedCount: number;
  /** Phase 4a (C5 ❤️) — `1` iff `sourceless_beat`'s trigger opened a NEW thread this run (SAME bound as
   *  above, independent mutex namespace). */
  readonly sourcelessBeatArcsOpenedCount: number;
  /** Phase 4d (C6) — `1` iff `slow_page`'s trigger opened a NEW series this run (0 otherwise — the
   *  template's OWN GLOBAL duplicate-inhibition bounds this to at most 1 concurrent series city-wide). */
  readonly slowPageArcsOpenedCount: number;
  /** Phase 2 (C6) — `slow_page` installment beats this run's `advanceOpenThreads` published (0 on a day
   *  with no due installment — the common case). */
  readonly slowPageInstallmentsPublishedCount: number;
  /** F4 — wall-clock duration of this run, milliseconds (diagnostic log/response only — never
   *  gameplay-branched, never persisted; design §8 "budget mesuré au floor C2"). */
  readonly durationMs: number;
}

@Injectable()
export class BrennarDailyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BrennarDailyService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: NewsBeatRepository,
    private readonly fodderReader: NewsFodderReader,
    private readonly generator: NewsBeatGeneratorService,
    private readonly constantHum: ConstantHumRepository, // C5 — cooper_affair's OWN residue-vs-hum-baseline read (S3).
  ) {}

  /** Register `BRENNAR_DAILY_TICK` at NIGHTLY/30 (S1, 2-step registration — the SCHEDULE entry +
   *  CitySystemId member land in the SAME commit, see city_sim_system.ts /
   *  city_sim_scheduler.service.ts). */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.BRENNAR_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order: BRENNAR_DAILY_TICK_ORDER,
      // City-global journal — ctx.playerId is never read (mirrors AMBIENT_DAILY_TICK/RANDOM_WORLD_DAILY_TICK's own shape).
      run: async (ctx) => {
        const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
        await this.dailyTick(gameDay);
      },
    });
    this.logger.log(`BrennarDailyService: registered BRENNAR_DAILY_TICK at NIGHTLY/${BRENNAR_DAILY_TICK_ORDER}.`);
  }

  /**
   * The tick body — a function of `gameDay` alone (+ persisted, deterministic DB state). Called by the
   * real scheduler registration above AND directly by the gated test-only `run-daily-tick` probe
   * (`news-test.controller.ts`), the SAME direct-probe idiom `RandomWorldEventGeneratorService.
   * runDailyTick`/`AmbientMicroEventService.runDailyTick` established.
   */
  async dailyTick(gameDay: number): Promise<BrennarDailyTickResult> {
    const startedAtMs = Date.now(); // F4 wall-clock instrumentation ONLY — never an RNG seed, never persisted/branched on.

    const claim = await this.repo.claimDay(gameDay);
    if (!claim.claimed) {
      return {
        gameDay,
        claimed: false,
        fodderScannedCount: 0,
        digestBeatsCount: 0,
        beatsGeneratedCount: 0,
        threadPublishedCount: 0,
        threadConcludedCount: 0,
        wireDay: false,
        wireDayBeatsCount: 0,
        hindsightArcsOpenedCount: 0,
        foldedPageFiredCount: 0,
        stormArcsOpenedCount: 0,
        stormEvaluationRefusedForWireDay: false,
        cooperAffairArcsOpenedCount: 0,
        sourcelessBeatArcsOpenedCount: 0,
        slowPageArcsOpenedCount: 0,
        slowPageInstallmentsPublishedCount: 0,
        durationMs: Date.now() - startedAtMs,
      };
    }

    // Phase 1 — fodder scan (design §3.3).
    const fodderItems = await this.fodderReader.scanFodder(gameDay);

    // Phase 2 — generic thread advance (design §3.2 phase 2 — see file header phase list; C3 hindsight,
    // C4 three_outlet_storm).
    const threadAdvance = await this.advanceOpenThreads(gameDay);

    // Phase 3 — wire-day determination + composition (C3, design §3.5.7/§3.2.3).
    const wireDayEval = await this.evaluateAndComposeWireDay(gameDay, fodderItems);

    // Phase 4a — keystones (C5 ❤️, design §3.2 phase 4a mutex pair: cooper_affair THEN sourceless_beat).
    const cooperTrigger = await this.evaluateCooperAffairTrigger(gameDay);
    const sourcelessTrigger = await this.evaluateSourcelessBeatTrigger(gameDay);
    // Phase 4b — folded_page TRIGGER (THIS chunk, design §3.5.5).
    const foldedPageTrigger = await this.evaluateFoldedPageTrigger(gameDay, fodderItems);
    // Phase 4c — three_outlet_storm TRIGGER (THIS chunk, design §3.5.4/§3.2.3 — the exclusion consumer).
    const stormTrigger = await this.evaluateThreeOutletStormTrigger(gameDay, fodderItems, wireDayEval.fired);
    // Phase 4d — series triggers (design §3.5's own phase-4 ordering "d. series: slow_page ; hindsight"):
    // slow_page (C6, design §3.5.6/D9) THEN hindsight (C3, design §3.5.3). Both independent of
    // `wireDayEval.fired` — the mutual exclusion (design §3.2.3) is wire↔storm ONLY.
    const slowPageTrigger = await this.evaluateSlowPageTrigger(gameDay);
    const hindsightTrigger = await this.evaluateHindsightTrigger(gameDay);

    // Phase 5 — digest fill (design §3.2.5). Phases 2/3/4b/4c already consumed slots this run (D4 "les
    // publications de threads … CONSOMMENT" / "wire … ABSORBE le plancher" — storm's 3 simultaneous
    // beats + folded_page's 3 one-shot beats [1 hollow + 2 covering PER fired instance] are the SAME
    // class of slot-consumer) — phase 4d's TRIGGER itself produces ZERO beats (a freshly-opened arc's
    // first publication is only ever due on a LATER tick, `hindsight-arc.ts`'s own schedule doc comment),
    // so it consumes no slot here.
    const baseline = newsBeatTunables.brennarDailyBeatsPerDayBaseline;
    const foldedPageBeatsCount = foldedPageTrigger.firedCount * 3; // 1 hollow + 2 covering, per fired instance.
    const stormBeatsCount = stormTrigger.opened * PRESS_OUTLET_REGISTRY.length; // 1 beat per outlet, per opened storm.
    const cooperBeatsCount = cooperTrigger.opened; // 1 initial beat per opened cooper thread (C5).
    const sourcelessBeatsCount = sourcelessTrigger.opened; // 1 beat per opened sourceless thread (C5).
    const consumedSlots =
      threadAdvance.publishedCount + wireDayEval.beats.length + foldedPageBeatsCount + stormBeatsCount + cooperBeatsCount + sourcelessBeatsCount;
    const remainingSlots = Math.max(0, baseline - consumedSlots);
    const alreadyCited = await this.repo.listRecentlyCitedFodderRefs(newsBeatTunables.beatPersistenceInFeedHours);
    const uncitedFodder = fodderItems.filter((item) => !alreadyCited.has(fodderRefKey(item.sourceKind, item.refId)));
    // ONE rng stream for the WHOLE digest phase: tie-break shuffle draws first (ranking), then one
    // outlet-pick draw per selected beat in selection order (design §8 "ordre de tirage FIXE").
    const digestRng = makeRng(`news:${gameDay}:digest`);
    const ranked = rankFodderForDigest(uncitedFodder, digestRng);
    const selected = ranked.slice(0, remainingSlots);

    const insertedBeats: NewsBeatRow[] = [];
    for (const item of selected) {
      insertedBeats.push(await this.composeAndInsertDigestBeat(gameDay, item, digestRng));
    }

    // Phase 6 — counters.
    const fodderCounts = countBySourceKind(fodderItems);
    const templateCounts: Record<string, number> = { digest: insertedBeats.length }; // template-less — 'digest' is a diagnostic bucket, never a real templateId (D4).
    // ★ C6 — per-template attribution (fixes a pre-existing imprecision: `threadAdvance.publishedCount`
    // sums hindsight publications AND cooper reframes AND [now] slow_page installments; the bucket below
    // used to unconditionally label the WHOLE sum 'hindsight' — a direct, motivated fix, see file header).
    if (threadAdvance.hindsightPublished > 0) templateCounts['hindsight'] = threadAdvance.hindsightPublished;
    if (threadAdvance.cooperReframesPublished > 0) {
      templateCounts['cooper_affair'] = (templateCounts['cooper_affair'] ?? 0) + threadAdvance.cooperReframesPublished;
    }
    if (threadAdvance.slowPageInstallmentsPublished > 0) {
      templateCounts['slow_page'] = (templateCounts['slow_page'] ?? 0) + threadAdvance.slowPageInstallmentsPublished;
    }
    if (wireDayEval.beats.length > 0) templateCounts['wire_day'] = wireDayEval.beats.length;
    if (foldedPageBeatsCount > 0) templateCounts['folded_page'] = foldedPageTrigger.firedCount; // count of HOLLOW beats (1/instance) — mirrors the E2E floor's own "exactly N folded_page beats" framing, not the 3x total row count.
    if (stormBeatsCount > 0) templateCounts['three_outlet_storm'] = stormBeatsCount;
    if (cooperBeatsCount > 0) templateCounts['cooper_affair'] = (templateCounts['cooper_affair'] ?? 0) + cooperBeatsCount; // + the initial beat (C5's own OPEN beat, distinct from reframes above).
    if (sourcelessBeatsCount > 0) templateCounts['sourceless_beat'] = sourcelessBeatsCount;
    const beatsGeneratedCount =
      insertedBeats.length +
      threadAdvance.publishedCount +
      wireDayEval.beats.length +
      foldedPageBeatsCount +
      stormBeatsCount +
      cooperBeatsCount +
      sourcelessBeatsCount;
    await this.repo.finalizeDailyRun(gameDay, {
      beatsGeneratedCount,
      templateCounts,
      wireDay: wireDayEval.fired,
      fodderCounts,
      journalistInterest: slowPageTrigger.journalistInterest,
    });

    const durationMs = Date.now() - startedAtMs;
    this.logger.log(
      `BrennarDailyService.dailyTick(gameDay=${gameDay}): claimed, ${fodderItems.length} fodder scanned, ` +
        `${threadAdvance.publishedCount} thread beats (${threadAdvance.concludedCount} concluded), ` +
        `wireDay=${wireDayEval.fired} (${wireDayEval.beats.length} beats), ` +
        `foldedPage=${foldedPageTrigger.firedCount} fired, ` +
        `storm opened=${stormTrigger.opened} (refusedForWireDay=${stormTrigger.refusedForWireDay}), ` +
        `cooper opened=${cooperTrigger.opened}, sourceless opened=${sourcelessTrigger.opened}, ` +
        `slowPage opened=${slowPageTrigger.opened} (${threadAdvance.slowPageInstallmentsPublished} installments), ` +
        `${hindsightTrigger.arcsOpened} hindsight arc(s) opened, ` +
        `${insertedBeats.length}/${remainingSlots} digest beats, ${durationMs}ms (F4 budget note).`,
    );

    return {
      gameDay,
      claimed: true,
      fodderScannedCount: fodderItems.length,
      digestBeatsCount: insertedBeats.length,
      beatsGeneratedCount,
      threadPublishedCount: threadAdvance.publishedCount,
      threadConcludedCount: threadAdvance.concludedCount,
      wireDay: wireDayEval.fired,
      wireDayBeatsCount: wireDayEval.beats.length,
      hindsightArcsOpenedCount: hindsightTrigger.arcsOpened,
      foldedPageFiredCount: foldedPageTrigger.firedCount,
      stormArcsOpenedCount: stormTrigger.opened,
      stormEvaluationRefusedForWireDay: stormTrigger.refusedForWireDay,
      cooperAffairArcsOpenedCount: cooperTrigger.opened,
      sourcelessBeatArcsOpenedCount: sourcelessTrigger.opened,
      slowPageArcsOpenedCount: slowPageTrigger.opened,
      slowPageInstallmentsPublishedCount: threadAdvance.slowPageInstallmentsPublished,
      durationMs,
    };
  }

  // ───────────────────────────── phase 2: generic thread advance (C3 hindsight, C4 storm) ───────────────

  /**
   * Phase 2 (design §3.2/§3.4): due publications + closures across EVERY `open` thread, dispatched by
   * `template_id`. `hindsight` (C3) publishes due op-ed/follow-ups; `three_outlet_storm` (C4) advances its
   * daily salience race and resolves at the contest/persistence horizon; `cooper_affair` (C5 ❤️) advances
   * its daily reframe race (a rival outlet may seize the frame, growing `reframe_resistance`) and resolves
   * at saturation/half-life; `sourceless_beat` (C5 ❤️) decays its arc index per silent week and resolves
   * below the structural 0 floor (displacement is a SEPARATE side-effect of a NEW cooper open, not this
   * phase — `NewsBeatRepository.displaceOpenSourcelessThreadsInDistrict`). `slow_page` is C6 scope; the
   * `default` case is a genuine no-op (no thread of that template can exist yet, zero writer before that
   * chunk).
   *
   * ★ PUBLIC + directly callable by the test-only `POST /_test/news/advance-threads` probe
   * (`news-test.controller.ts`), bypassing the day-level claim entirely — the crash-safety floor's "kill
   * the tick after phase 2" scenario invokes THIS method twice in a row for the SAME `gameDay`,
   * independent of `dailyTick`'s phase-0 claim, to prove the per-publication EXISTENCE GUARD
   * (`repo.countBeatsForThread`, below) is what makes a re-run safe — not merely the day-level claim
   * (design §8: "phase 2 re-runnable … idempotent par guard d'existence").
   *
   * @param forceThrowAfterReframeBeat ★ I-2 fix (review gate IMPORTANT-2) — TEST-ONLY, threaded straight
   *   through to `advanceCooperAffairThread` (the keystone-shared duplicate-inhibition gate bounds ≤1
   *   concurrent `cooper_affair` thread city-wide, so this never ambiguously targets more than one).
   *   Defaults to `false` for every real caller (the real scheduler's own `dailyTick` call below never
   *   passes it). See `NewsBeatRepository.advanceCooperAffairThreadAtomic`'s own doc comment.
   * @param forceThrowAfterInstallmentBeat C6 — TEST-ONLY, mirrors `forceThrowAfterReframeBeat` above,
   *   threaded straight through to `advanceSlowPageThread` (slow_page's OWN GLOBAL duplicate-inhibition
   *   bounds ≤1 concurrent series city-wide). See `NewsBeatRepository.advanceSlowPageThreadAtomic`'s own
   *   doc comment.
   *
   * ★ C6 — returns PER-TEMPLATE published counts (`hindsightPublished`/`cooperReframesPublished`/
   *   `slowPageInstallmentsPublished`) ALONGSIDE the pre-existing summed `publishedCount` (which phase-5's
   *   slot math still consumes unchanged, design D4 "les publications de threads CONSOMMENT le
   *   plancher" — the substitutive count is correct regardless of WHICH template published). The
   *   per-template breakdown exists so phase 6's `templateCounts` diagnostic (below) can attribute each
   *   publication to its OWN template — see this file's own header note on the pre-existing `hindsight`-
   *   bucket mislabeling this chunk's 3rd contributor would otherwise have made worse.
   */
  async advanceOpenThreads(
    gameDay: number,
    forceThrowAfterReframeBeat = false,
    forceThrowAfterInstallmentBeat = false,
  ): Promise<{
    publishedCount: number;
    concludedCount: number;
    hindsightPublished: number;
    cooperReframesPublished: number;
    slowPageInstallmentsPublished: number;
  }> {
    const openThreads = await this.repo.findOpenThreads();
    let publishedCount = 0;
    let concludedCount = 0;
    let hindsightPublished = 0;
    let cooperReframesPublished = 0;
    let slowPageInstallmentsPublished = 0;
    for (const thread of openThreads) {
      if (thread.template_id === 'hindsight') {
        const result = await this.advanceHindsightThread(thread, gameDay);
        publishedCount += result.published;
        hindsightPublished += result.published;
        if (result.concluded) concludedCount += 1;
      } else if (thread.template_id === 'three_outlet_storm') {
        const result = await this.advanceThreeOutletStormThread(thread, gameDay);
        if (result.concluded) concludedCount += 1;
      } else if (thread.template_id === 'cooper_affair') {
        const result = await this.advanceCooperAffairThread(thread, gameDay, forceThrowAfterReframeBeat);
        publishedCount += result.published;
        cooperReframesPublished += result.published;
        if (result.concluded) concludedCount += 1;
      } else if (thread.template_id === 'sourceless_beat') {
        const result = await this.advanceSourcelessBeatThread(thread, gameDay);
        if (result.concluded) concludedCount += 1;
      } else if (thread.template_id === 'slow_page') {
        const result = await this.advanceSlowPageThread(thread, gameDay, forceThrowAfterInstallmentBeat);
        publishedCount += result.published;
        slowPageInstallmentsPublished += result.published;
        if (result.concluded) concludedCount += 1;
      }
    }
    return { publishedCount, concludedCount, hindsightPublished, cooperReframesPublished, slowPageInstallmentsPublished };
  }

  /** ONE `hindsight` thread's due publications (design §3.5.3 lifecycle): `alreadyPublished` (the
   *  ★ existence guard, `repo.countBeatsForThread`) is the next schedule index to consider — publish
   *  every schedule entry `≤ gameDay` in ascending order (the schedule is itself strictly ascending, so
   *  the FIRST not-yet-due entry means every later one isn't due either); conclude
   *  `series_completed` once the whole schedule has been published. Re-invocable for the SAME `gameDay`
   *  (or any later one) without duplicating a publication — `alreadyPublished` is re-derived from the DB
   *  every call, never a cached/in-memory cursor.
   *
   *  ★ C3 fix (review gate BLOCKING-1) — defensive guard: `composeRetrospectiveArc`'s insert is now
   *  ATOMIC (`NewsBeatRepository.insertHindsightThreadAtomic`), so a payload-less/malformed `open`
   *  hindsight thread should be structurally unreachable from THIS codebase's own production path.
   *  Belt-and-suspenders anyway (design §8 "un tick mort ne bloque pas le lendemain") — a legacy row, a
   *  hand-edited row, or any future writer's own bug must never TypeError the WHOLE daily tick over ONE
   *  poisoned thread: skip it (log + move on), never crash. */
  private async advanceHindsightThread(thread: NewsThreadRow, gameDay: number): Promise<{ published: number; concluded: boolean }> {
    const payload = thread.payload as unknown as HindsightThreadPayload;
    const schedule = payload.retrospectiveArc?.publicationScheduleGameDays;
    if (!schedule || schedule.length === 0) {
      this.logger.warn(
        `hindsight thread ${thread.id} has no retrospectiveArc.publicationScheduleGameDays (payload-less/malformed) — skipping, not crashing the tick`,
      );
      return { published: 0, concluded: false };
    }
    const alreadyPublished = await this.repo.countBeatsForThread(thread.id);
    let published = 0;
    for (let i = alreadyPublished; i < schedule.length; i++) {
      if (schedule[i]! > gameDay) break;
      await this.generator.composeHindsightPublicationBeat(thread, i, gameDay);
      published += 1;
    }
    const concluded = alreadyPublished + published >= schedule.length;
    if (concluded) {
      await this.repo.concludeThread(thread.id, 'series_completed');
    }
    return { published, concluded };
  }

  /**
   * ONE `three_outlet_storm` thread's daily salience advance + resolution (design §3.5.4 lifecycle):
   * catches up EVERY day from `payload.salienceAdvancedThroughGameDay + 1` through
   * `min(gameDay, contestHorizonDay)` — increments STOP for good once the contest horizon is reached
   * (design "à l'horizon du contest window" is checked once salience has caught up TO it, never
   * re-incremented past it) — then: (a) if not yet locked and caught up to the horizon, the lock-margin
   * check (`evaluateStormLock`); a pass persists `FrameLock` + concludes `frame_locked`; (b) regardless
   * of (a)'s outcome, if `gameDay ≥ openedAtGameDay + stormContestedPersistenceWeeks*7` and STILL open →
   * concludes `contested_persistent` (design "sinon contested-state maintenu … → contested_persistent").
   * Re-invocable for the SAME/any later `gameDay` without double-incrementing —
   * `salienceAdvancedThroughGameDay` is the ★ existence-guard cursor `StormThreadPayload`'s own doc
   * comment explains (salience has no natural "count of things" to derive a cursor from, unlike
   * hindsight's `countBeatsForThread`).
   *
   * ★ defensive guard (mirrors `advanceHindsightThread`'s own belt-and-suspenders, design §8 "un tick
   * mort ne bloque pas le lendemain"): a payload-less/malformed storm thread is skipped, never crashes
   * the tick.
   */
  private async advanceThreeOutletStormThread(thread: NewsThreadRow, gameDay: number): Promise<{ concluded: boolean }> {
    const payload = thread.payload as unknown as StormThreadPayload;
    if (!payload.frames || payload.frames.length === 0 || !payload.salience || !payload.outletKeysByFrame) {
      this.logger.warn(
        `three_outlet_storm thread ${thread.id} has no frames/salience/outletKeysByFrame (payload-less/malformed) — skipping, not crashing the tick`,
      );
      return { concluded: false };
    }

    const contestHorizonDay = thread.opened_at_game_day + newsBeatTunables.stormContestWindowDays;
    const persistenceHorizonDay = thread.opened_at_game_day + newsBeatTunables.stormContestedPersistenceWeeks * 7;
    const targetAdvanceDay = Math.min(gameDay, contestHorizonDay);

    const salience: Record<string, number> = { ...payload.salience };
    let advancedThrough = payload.salienceAdvancedThroughGameDay;
    let mutated = false;

    if (advancedThrough < targetAdvanceDay) {
      // ONE batched recurrence-signal read for the WHOLE catch-up range (F4 — never 1 query/day, design §8).
      const recurrenceDays =
        thread.district_id !== null
          ? await this.repo.ambientMicroEventDaysWithActivityInDistrict(thread.district_id, advancedThrough + 1, targetAdvanceDay)
          : new Set<number>();
      for (let day = advancedThrough + 1; day <= targetAdvanceDay; day++) {
        const recurrenceToday = recurrenceDays.has(day);
        // ONE rng instance PER DAY (design §8's own "news:{thread_id}:{purpose}" scheme, extended with the
        // day axis — see file header) — consumes 1 draw per frame, in `payload.frames`'s own FIXED order.
        const dayRng = makeRng(`news:${thread.id}:salience:${day}`);
        for (const frame of payload.frames) {
          const tier = pressOutletByKey(payload.outletKeysByFrame[frame]!).tier;
          salience[frame] = (salience[frame] ?? 0) + computeStormDailySalienceIncrement(tier, recurrenceToday, dayRng);
        }
      }
      advancedThrough = targetAdvanceDay;
      mutated = true;
    }

    let concluded = false;
    let outcome: string | null = null;
    let frameLock = payload.frameLock;

    if (!frameLock && advancedThrough >= contestHorizonDay) {
      const lockCheck = evaluateStormLock(salience, newsBeatTunables.stormLockMargin);
      if (lockCheck.locked) {
        frameLock = { winningFrame: lockCheck.winningFrame, salienceRatio: lockCheck.salienceRatio, lockedAtGameDay: gameDay };
        concluded = true;
        outcome = 'frame_locked';
        mutated = true;
      }
    }
    if (!concluded && !frameLock && gameDay >= persistenceHorizonDay) {
      concluded = true;
      outcome = 'contested_persistent';
    }

    if (mutated || concluded) {
      const newPayload: StormThreadPayload = {
        frames: payload.frames,
        outletKeysByFrame: payload.outletKeysByFrame,
        salience,
        salienceAdvancedThroughGameDay: advancedThrough,
        ...(frameLock ? { frameLock } : {}),
      };
      await this.repo.updateThreadPayload(thread.id, newPayload as unknown as Record<string, unknown>);
    }
    if (concluded) {
      await this.repo.concludeThread(thread.id, outcome!);
    }
    return { concluded };
  }

  /**
   * ONE `cooper_affair` thread's daily reframe race + resolution (design §3.5.1 lifecycle, C5 ❤️): catches
   * up EVERY day from `payload.advancedThroughGameDay + 1` through `min(gameDay, halfLifeDay)` —
   * `halfLifeDay = thread.opened_at_game_day + payload.halfLifeDays` (the SNAPSHOT taken at open time,
   * `CooperAffairThreadPayload`'s own doc comment). Each day: EVERY rival outlet (≠ `currentOutletKey`,
   * `PRESS_OUTLET_REGISTRY` order, 2 of the 3) gets its OWN `dayRng.chance(reframeProbability)` draw —
   * consumed regardless of outcome (design §8 fixed draw order) — the FIRST rival whose draw passes wins
   * (only 1 reframe per day, Scénario 2 canon spacing is days apart, never same-day). On a win: a NEW
   * frame is drawn (`drawDistinctCooperFrame`, excluding the CURRENT frame, consuming the SAME day-rng's
   * next draw), a reframe beat composes, `reframeResistance` grows by `cooperReframeResistanceGrowth`
   * (IEEE-754-stable rounded, `roundToStableDecimal` — design §8 "séquence EXACTE 0.0→0.3→0.6→0.9"), and
   * `reframeCount` increments. Resolution (whichever fires first — a documented "OR" reading of canon
   * "resolves when half_life decays OR three reframes saturate", see file header): `reframeCount ≥
   * cooperMaxReframes` → `concluded/saturated` (checked immediately after EACH reframe, may fire before
   * `halfLifeDay`); else, once caught up THROUGH `halfLifeDay`, `concluded/half_life_expired` regardless
   * of how many (0, 1, or 2) reframes have fired so far. Re-invocable for the SAME/any later `gameDay`
   * without double-rolling ALREADY-caught-up days — `advancedThroughGameDay` is the ★ existence-guard
   * cursor (mirrors `StormThreadPayload`'s own shape: reframes have no natural "count of things published"
   * to derive a cursor from independent of this field, since 0 reframes is a legal, common outcome).
   *
   * ★ defensive guard (mirrors `advanceHindsightThread`/`advanceThreeOutletStormThread`'s own
   * belt-and-suspenders, design §8 "un tick mort ne bloque pas le lendemain"): a payload-less/malformed
   * cooper thread is skipped, never crashes the tick.
   *
   * ★ I-2 fix (review gate IMPORTANT-2, post-merge): every reframe beat this call's day-loop produces is
   * now only BUILT (`NewsBeatGeneratorService.composeCooperReframeBeat`, no longer inserts — see that
   * method's own doc comment) and collected into `reframeBeatInputs`; the ACTUAL inserts + the cursor
   * `payload` update (+ terminal conclude) all happen in ONE transaction at the end
   * (`NewsBeatRepository.advanceCooperAffairThreadAtomic`) — closing the crash window where a throw
   * between a committed reframe beat and the (previously separate) cursor write let a deterministic
   * seeded re-run double-publish the identical beat. See that method's own doc comment for the full
   * mechanism (mirrors C3's BLOCKING-1 `insertHindsightThreadAtomic` fix).
   */
  private async advanceCooperAffairThread(
    thread: NewsThreadRow,
    gameDay: number,
    forceThrowAfterReframeBeat = false,
  ): Promise<{ published: number; concluded: boolean }> {
    const payload = thread.payload as unknown as CooperAffairThreadPayload;
    if (payload.halfLifeDays === undefined || payload.frameId === undefined || payload.currentOutletKey === undefined) {
      this.logger.warn(
        `cooper_affair thread ${thread.id} has no halfLifeDays/frameId/currentOutletKey (payload-less/malformed) — skipping, not crashing the tick`,
      );
      return { published: 0, concluded: false };
    }

    const halfLifeDay = thread.opened_at_game_day + payload.halfLifeDays;
    const targetAdvanceDay = Math.min(gameDay, halfLifeDay);

    let frameId = payload.frameId;
    let currentOutletKey = payload.currentOutletKey;
    let currentJournalistKey = payload.currentJournalistKey;
    let reframeResistance = payload.reframeResistance;
    let reframeCount = payload.reframeCount;
    let advancedThrough = payload.advancedThroughGameDay;
    let mutated = false;
    let concluded = false;
    let outcome: string | null = null;
    // ★ I-2 fix — collected, NOT inserted yet: `advanceCooperAffairThreadAtomic` inserts the WHOLE batch
    // (below) inside the SAME transaction as the cursor update.
    const reframeBeatInputs: Omit<NewTemplateBeatInput, 'threadId'>[] = [];

    for (let day = advancedThrough + 1; day <= targetAdvanceDay && !concluded; day++) {
      const dayRng = makeRng(`news:${thread.id}:reframe:${day}`);
      const rivalOutlets = PRESS_OUTLET_REGISTRY.filter((o) => o.outletKey !== currentOutletKey);
      const reframeProbability = computeCooperReframeProbability(reframeResistance);
      let winningRivalOutletKey: PressOutletKey | undefined;
      for (const rival of rivalOutlets) {
        const passed = dayRng.chance(reframeProbability); // consumed regardless of outcome (design §8 fixed draw order) — first pass wins.
        if (passed && !winningRivalOutletKey) winningRivalOutletKey = rival.outletKey;
      }
      advancedThrough = day;
      mutated = true;

      if (winningRivalOutletKey) {
        const newFrame = drawDistinctCooperFrame(frameId, dayRng);
        const rivalJournalist =
          thread.district_id !== null
            ? journalistsForOutlet(winningRivalOutletKey).find((j) => j.beatDistrictIds.includes(thread.district_id!))
            : undefined;
        reframeBeatInputs.push(
          await this.generator.composeCooperReframeBeat(thread, newFrame, winningRivalOutletKey, rivalJournalist?.journalistKey, day),
        );
        frameId = newFrame;
        currentOutletKey = winningRivalOutletKey;
        currentJournalistKey = rivalJournalist?.journalistKey;
        reframeResistance = roundToStableDecimal(reframeResistance + newsBeatTunables.cooperReframeResistanceGrowth);
        reframeCount += 1;
        if (reframeCount >= newsBeatTunables.cooperMaxReframes) {
          concluded = true;
          outcome = 'saturated';
        }
      }
    }
    if (!concluded && gameDay >= halfLifeDay) {
      concluded = true;
      outcome = 'half_life_expired';
    }

    if (mutated || concluded) {
      const newPayload: CooperAffairThreadPayload = {
        frameId,
        halfLifeDays: payload.halfLifeDays,
        reframeResistance,
        reframeCount,
        currentOutletKey,
        ...(currentJournalistKey ? { currentJournalistKey } : {}),
        advancedThroughGameDay: advancedThrough,
      };
      // ★ I-2 fix — ONE transaction: the reframeBeatInputs collected above + the cursor update + the
      // terminal conclude (if any) — see `NewsBeatRepository.advanceCooperAffairThreadAtomic`'s own doc
      // comment.
      await this.repo.advanceCooperAffairThreadAtomic(
        thread.id,
        reframeBeatInputs,
        newPayload as unknown as Record<string, unknown>,
        concluded ? outcome : null,
        forceThrowAfterReframeBeat,
      );
    }
    return { published: reframeBeatInputs.length, concluded };
  }

  /**
   * ONE `sourceless_beat` thread's daily silent-week decay + resolution (design §3.5.2 lifecycle, C5 ❤️):
   * catches up EVERY FULL silent week elapsed since open (`Math.floor((gameDay - opened_at_game_day) /
   * 7)`), decrementing `arcIndex` by `sourcelessArcDecayPerSilentWeek` per week (`decaySourcelessArcIndex`,
   * IEEE-754-stable rounded — the SAME class of accumulation drift `cooper-affair.ts`'s
   * `roundToStableDecimal` fixes, applied to repeated subtraction instead of addition). Concludes
   * `half_life_expired` (REUSING the closest existing closed-union value — see
   * `SourcelessBeatThreadPayload`'s own doc comment for why no dedicated "decayed" outcome exists) once
   * `arcIndex < 0` (design "clôture quand l'arc index tombe < seuil structurel 0"). ★ "Counter-evidence
   * does not retract" (canon :310) is structural HERE: nothing in this method ever reads fodder — ONLY
   * silent-week decay and (via the SEPARATE `NewsBeatRepository.displaceOpenSourcelessThreadsInDistrict`
   * side-effect, fired from `NewsBeatGeneratorService.composeCooperAffairThread`'s own open path) the
   * displacement outcome can ever close this thread — a counter-fodder row seeded in the SAME district
   * afterward is simply never read by this method, so it structurally cannot retract anything.
   *
   * ★ defensive guard (mirrors the other 3 advance methods' own belt-and-suspenders).
   *
   * ★ I-2 fix — consistency check (review gate IMPORTANT-2 explicitly asked whether THIS method shares
   * `advanceCooperAffairThread`'s pre-fix non-atomic insert+cursor defect): it does NOT. This method never
   * inserts a beat during its advance at all (decay is a PURE payload mutation — the only beat this
   * template ever gets is the ONE composed at OPEN, `NewsBeatGeneratorService.composeSourcelessBeat`,
   * already atomic via `insertSourcelessThreadAtomic`), so there is no "committed beat + stale cursor"
   * double-publish risk to begin with. Its 2 writes below (`updateThreadPayload` then `concludeThread`)
   * are ALREADY self-healing even un-transactioned: `concluded` is recomputed FRESH from the persisted
   * `arcIndex` on EVERY call (never from an in-memory-only flag), and the `concludeThread` write below runs
   * UNCONDITIONALLY whenever `concluded` is true — regardless of whether `mutated` fired THIS call. So a
   * crash between the 2 writes leaves the thread `open` with an already-decayed payload, and the VERY NEXT
   * advance call re-derives `concluded=true` from that SAME persisted `arcIndex` and retries `concludeThread`
   * on its own — no atomic wrap needed, left unchanged.
   */
  private async advanceSourcelessBeatThread(thread: NewsThreadRow, gameDay: number): Promise<{ concluded: boolean }> {
    const payload = thread.payload as unknown as SourcelessBeatThreadPayload;
    if (payload.arcIndex === undefined || payload.decayedThroughWeek === undefined) {
      this.logger.warn(
        `sourceless_beat thread ${thread.id} has no arcIndex/decayedThroughWeek (payload-less/malformed) — skipping, not crashing the tick`,
      );
      return { concluded: false };
    }

    const decayPerWeek = newsBeatTunables.sourcelessArcDecayPerSilentWeek;
    const weeksElapsed = Math.floor((gameDay - thread.opened_at_game_day) / 7);
    let arcIndex = payload.arcIndex;
    let decayedThroughWeek = payload.decayedThroughWeek;
    let mutated = false;

    for (let week = decayedThroughWeek + 1; week <= weeksElapsed; week++) {
      arcIndex = decaySourcelessArcIndex(arcIndex, decayPerWeek);
      decayedThroughWeek = week;
      mutated = true;
    }

    const concluded = arcIndex < 0;
    if (mutated) {
      const newPayload: SourcelessBeatThreadPayload = { arcIndex, decayedThroughWeek };
      await this.repo.updateThreadPayload(thread.id, newPayload as unknown as Record<string, unknown>);
    }
    if (concluded) {
      await this.repo.concludeThread(thread.id, 'half_life_expired');
    }
    return { concluded };
  }

  /**
   * ONE `slow_page` thread's due installment(s) + resolution (design §3.5.6 lifecycle, C6): catches up
   * EVERY due installment from `alreadyPublished` (the ★ existence guard, `repo.countBeatsForThread` —
   * mirrors `advanceHindsightThread`'s own count-derived-cursor shape EXACTLY, see `SlowPageThreadPayload`'s
   * own doc comment for why no separate cursor field is needed) through `payload.installmentsTotal`,
   * publishing every installment whose `slowPageInstallmentDueDay(opened_at_game_day, index) ≤ gameDay`
   * in ascending index order (the due-day formula is itself strictly ascending — a fixed +7-day cadence
   * — so the FIRST not-yet-due entry means every later one isn't due either, mirrors hindsight's own
   * early-break). Resolution: `publishedCount ≥ installmentsTotal` (installments exhausted) OR
   * `gameDay ≥ opened_at_game_day + slowPageSaturationWeeks*7` (design "saturation … MÊME si
   * installments restants" — checked regardless of how many installments have actually published) →
   * `concluded/series_completed`. Re-invocable for the SAME/any later `gameDay` without duplicating a
   * publication (the count-derived guard, same as hindsight).
   *
   * ★ defensive guard (mirrors the other 3 advance methods' own belt-and-suspenders, design §8 "un tick
   * mort ne bloque pas le lendemain"): a payload-less/malformed slow_page thread is skipped, never
   * crashes the tick.
   *
   * ★ C6 — built ATOMIC from the start (`NewsBeatRepository.advanceSlowPageThreadAtomic`), proactively
   * mirroring the C5 I-2 lesson even though this template's OWN count-derived guard (unlike cooper's
   * stale-persisted-cursor shape) is already self-healing on its own — matching the standard this branch
   * now holds for every multi-write in this module (see that method's own doc comment).
   */
  private async advanceSlowPageThread(
    thread: NewsThreadRow,
    gameDay: number,
    forceThrowAfterInstallmentBeat = false,
  ): Promise<{ published: number; concluded: boolean }> {
    const payload = thread.payload as unknown as SlowPageThreadPayload;
    if (payload.installmentsTotal === undefined) {
      this.logger.warn(
        `slow_page thread ${thread.id} has no installmentsTotal (payload-less/malformed) — skipping, not crashing the tick`,
      );
      return { published: 0, concluded: false };
    }

    const alreadyPublished = await this.repo.countBeatsForThread(thread.id);
    const installmentBeatInputs: Omit<NewTemplateBeatInput, 'threadId'>[] = [];
    for (let index = alreadyPublished; index < payload.installmentsTotal; index++) {
      const dueDay = slowPageInstallmentDueDay(thread.opened_at_game_day, index);
      if (dueDay > gameDay) break;
      installmentBeatInputs.push(await this.generator.composeSlowPageInstallmentBeat(thread, index, dueDay));
    }

    const totalPublishedNow = alreadyPublished + installmentBeatInputs.length;
    const saturationDay = thread.opened_at_game_day + newsBeatTunables.slowPageSaturationWeeks * 7;
    const concluded = totalPublishedNow >= payload.installmentsTotal || gameDay >= saturationDay;

    if (installmentBeatInputs.length > 0 || concluded) {
      await this.repo.advanceSlowPageThreadAtomic(
        thread.id,
        installmentBeatInputs,
        concluded ? 'series_completed' : null,
        forceThrowAfterInstallmentBeat,
      );
    }
    return { published: installmentBeatInputs.length, concluded };
  }

  // ───────────────────────────── phase 3: wire day (C3) ────────────────────────────────────────────────

  /**
   * Phase 3 (design §3.5.7): ONE `Rng` instance for the WHOLE evaluation — draw 1 = the trigger-chance
   * roll, draw 2 = the shared uniform frame (`NewsBeatGeneratorService.composeWireDayBeats`, consumed
   * ONLY if the trigger fires) — design §8's fixed draw order, mirrors phase 5's own documented "ONE rng
   * stream for the whole digest phase" precedent.
   */
  private async evaluateAndComposeWireDay(
    gameDay: number,
    fodderItems: readonly FodderItem[],
  ): Promise<{ fired: boolean; beats: NewsBeatRow[] }> {
    const recentTotals = await this.repo.getRecentFodderCountTotals(gameDay, WIRE_DAY_LOW_PRODUCTION_LOOKBACK_RUNS);
    const lowProduction = isLowProduction(recentTotals, newsBeatTunables.wireLowProductionThreshold);
    const probability = computeWireDayProbability(newsBeatTunables.wireDayBaseFrequencyPerDays, lowProduction);
    const rng = makeRng(`news:${gameDay}:wire_day`);
    const fired = rng.chance(probability);
    if (!fired) return { fired: false, beats: [] };
    const beats = await this.generator.composeWireDayBeats(gameDay, fodderItems, rng);
    return { fired: true, beats };
  }

  // ───────────────────────────── phase 4a: keystone duplicate-inhibition (C5 ❤️) ─────────────────────────

  /**
   * The keystone-shared duplicate-inhibition gate (design §3.2 phase 4 preamble, matrice :254 "un Cooper
   * Affair en feed inhibe un second Cooper jusqu'à scroll-off"): a template is inhibited if EITHER an
   * `open` thread of it already exists (`hasOpenThreadOfTemplate`) OR a beat of it is still inside the
   * REAL-clock persistence window (`hasRecentBeatOfTemplate`, `beatPersistenceInFeedHours` — "en feed",
   * NOT thread status: a saturated/half-life-expired thread's beats STILL inhibit while on-feed). Shared
   * by BOTH keystones (each its OWN independent mutex namespace — cooper opening never inhibits
   * sourceless or vice versa).
   */
  private async isKeystoneInhibited(templateId: string): Promise<boolean> {
    if (await this.repo.hasOpenThreadOfTemplate(templateId)) return true;
    return this.repo.hasRecentBeatOfTemplate(templateId, newsBeatTunables.beatPersistenceInFeedHours);
  }

  /**
   * Phase 4a, keystone 1 of 2 (design §3.5.1, C5 ❤️ — "residue above ambient noise"/decisions D6): per
   * district (ascending `district_id`, design §8 "ordre de tirage FIXE"), the district's OWN observed-day
   * heat (`ConstantHumRepository.aggregateAvgHeatByDistrict`, S3, ONE cross-player query) vs the "current
   * cell"'s `baseline_heat_ema` (`listCellsForDistrict`, THIS exact `hour_of_week` —
   * `deriveNightlyHourOfWeek`, `news-beat-clock.ts` — the grid IS "ambient noise", D6) — relative excess
   * `≥ cooperResidueOverAmbientMargin`. A district with NO cell yet for this exact hour (the grid has not
   * matured there yet) is honestly non-eligible, never fabricated. AND a covering journalist
   * (`journalistsCoveringDistrict`) with `cohesionWithBeat ≥ cooperJournalistCohesionThreshold`. Gated
   * FIRST by `isKeystoneInhibited` (skips the WHOLE scan — F4 — when a cooper thread is already
   * open/recent). ONE seeded roll PER eligible district (`news:{game_day}:cooper_affair` — extends the
   * design §8 2-part per-day-per-template scheme, mirrors `evaluateHindsightTrigger`'s own "one rng, one
   * draw per eligible candidate, in fixed order" idiom) — the FIRST pass opens the ONLY cooper thread this
   * run may open (the keystone's OWN duplicate-inhibition already bounds ≤1 concurrent thread city-wide,
   * so there is no need to cap the scan itself beyond `aggregateAvgHeatByDistrict`'s OWN structural ≤18
   * district ceiling).
   */
  private async evaluateCooperAffairTrigger(gameDay: number): Promise<{ opened: number }> {
    if (await this.isKeystoneInhibited('cooper_affair')) return { opened: 0 };

    const hourOfWeek = deriveNightlyHourOfWeek(gameDay, citySimTunables.inGameDayLengthMinutes, ambientTunables.constantHumCellsPerWeek);
    const margin = newsBeatTunables.cooperResidueOverAmbientMargin;
    const cohesionThreshold = newsBeatTunables.cooperJournalistCohesionThreshold;
    const heatByDistrict = await this.constantHum.aggregateAvgHeatByDistrict(); // ordered by district_id (S3).

    const eligible: { districtId: number; journalistKey: string }[] = [];
    for (const obs of heatByDistrict) {
      const cells = await this.constantHum.listCellsForDistrict(obs.districtId);
      const cell = cells.find((c) => c.hourOfWeek === hourOfWeek);
      if (!cell || cell.baselineHeatEma <= 0) continue; // no mature baseline for THIS exact hour yet — honestly non-eligible (never fabricated).
      const relativeExcess = (obs.avgHeat - cell.baselineHeatEma) / cell.baselineHeatEma;
      if (relativeExcess < margin) continue;
      const journalist = journalistsCoveringDistrict(obs.districtId).find((j) => j.cohesionWithBeat >= cohesionThreshold);
      if (!journalist) continue;
      eligible.push({ districtId: obs.districtId, journalistKey: journalist.journalistKey });
    }
    if (eligible.length === 0) return { opened: 0 };

    const rng = makeRng(`news:${gameDay}:cooper_affair`);
    for (const candidate of eligible) {
      if (rng.chance(newsBeatTunables.cooperFrameOnlyNoIncidentProbability)) {
        await this.generator.composeCooperAffairThread(gameDay, candidate.districtId, candidate.journalistKey);
        return { opened: 1 };
      }
    }
    return { opened: 0 };
  }

  /**
   * Phase 4a, keystone 2 of 2 (design §3.5.2, C5 ❤️ — the INVERSION, decisions D7). Gated FIRST by
   * `isKeystoneInhibited` (its OWN independent `sourceless_beat` mutex namespace). Readiness: scans
   * `JOURNALIST_REGISTRY` (fixed order, F4 — 6 entries, ONE batched ledger read for ALL of them,
   * `NewsBeatRepository.lastBylineGameDayByJournalist`) for the FIRST journalist whose
   * `computeJournalistFramingReadiness` clears `sourcelessFramingReadinessThreshold`. Mood: cross-player
   * `avgDistrictCohesionCrossPlayer` (`null` short-circuits — no signal, never fabricated) combined with
   * the recent-density signal (`recentBeatsGeneratedCounts`, `sourcelessCityMoodDensityLookbackRuns`
   * runs — an EMPTY history falls back to the NEUTRAL baseline, contributing 0, mirrors `wire-day.ts`'s
   * own "missing data is never a false positive" discipline) via `computeCityMoodReceptiveness`
   * (`sourceless-beat.ts`, D7's own "formule figée au chunk C5"). A pass on BOTH gates draws ONE seeded
   * roll (`news:{game_day}:sourceless_beat`) — the SAME `Rng` instance is then handed to
   * `composeSourcelessBeat` for its OWN `claimed_subject` draw (design §8 "ONE rng stream for the whole
   * phase", mirrors `evaluateAndComposeWireDay`'s own precedent).
   */
  private async evaluateSourcelessBeatTrigger(gameDay: number): Promise<{ opened: number }> {
    if (await this.isKeystoneInhibited('sourceless_beat')) return { opened: 0 };

    const lastByline = await this.repo.lastBylineGameDayByJournalist();
    const idleDays = newsBeatTunables.journalistIdleReadinessDays;
    const readinessThreshold = newsBeatTunables.sourcelessFramingReadinessThreshold;
    let eligibleJournalistKey: string | undefined;
    for (const journalist of JOURNALIST_REGISTRY) {
      const lastGameDay = lastByline.get(journalist.journalistKey);
      const daysSinceLastByline = lastGameDay === undefined ? Number.POSITIVE_INFINITY : gameDay - lastGameDay;
      if (computeJournalistFramingReadiness(daysSinceLastByline, idleDays) >= readinessThreshold) {
        eligibleJournalistKey = journalist.journalistKey;
        break;
      }
    }
    if (!eligibleJournalistKey) return { opened: 0 };

    const avgCohesion = await this.repo.avgDistrictCohesionCrossPlayer();
    if (avgCohesion === null) return { opened: 0 }; // no cross-player signal yet — never fabricated (design §0).

    const recentCounts = await this.repo.recentBeatsGeneratedCounts(gameDay, SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS);
    const baseline = newsBeatTunables.brennarDailyBeatsPerDayBaseline;
    const recentAvg = recentCounts.length > 0 ? recentCounts.reduce((sum, n) => sum + n, 0) / recentCounts.length : baseline;
    const mood = computeCityMoodReceptiveness(avgCohesion, recentAvg, baseline);
    if (mood < newsBeatTunables.sourcelessCityMoodReceptivenessFloor) return { opened: 0 };

    const rng = makeRng(`news:${gameDay}:sourceless_beat`);
    if (!rng.chance(newsBeatTunables.sourcelessBeatPseudoEventProbability)) return { opened: 0 };

    await this.generator.composeSourcelessBeat(gameDay, eligibleJournalistKey, rng);
    return { opened: 1 };
  }

  // ───────────────────────────── phase 4b: folded_page trigger (C4) ───────────────────────────────────

  /**
   * Phase 4b (design §3.5.5): every `severityBand='high'` fodder item this day gets its OWN
   * `applySpiralOfSilenceOmission` call — that method OWNS its own seeded suppressor draw (keyed off the
   * fodder item's OWN id, `news:{fodderItem.refId}:suppressor`, design §8 — NOT a shared rng stream here,
   * unlike phase 3/phase 5's "one stream for the whole phase" precedent, because each item's draw must
   * be independently reproducible from that item's OWN persistent identity, not from iteration order).
   * Returns `null` per item on a legitimate non-fire (severity qualifies but the drawn suppressor
   * doesn't clear the threshold) — never a fabricated beat.
   */
  private async evaluateFoldedPageTrigger(gameDay: number, fodderItems: readonly FodderItem[]): Promise<{ firedCount: number }> {
    const highFodder = fodderItems.filter((item) => item.severityBand === 'high');
    let firedCount = 0;
    for (const item of highFodder) {
      const beat = await this.generator.applySpiralOfSilenceOmission(item, gameDay);
      if (beat) firedCount += 1;
    }
    return { firedCount };
  }

  // ───────────────────────────── phase 4c: three_outlet_storm trigger (C4) ────────────────────────────

  /**
   * Phase 4c (design §3.5.4/§3.2.3): NEVER on a wire day — the exclusion, `wireDayFired` read from THIS
   * SAME run's in-memory phase-3 result (`wireDayEval.fired`, `dailyTick` above). Otherwise: the FIRST
   * `severityBand='high'` fodder item this day (fixed scan order, design §8 — no seeded pick needed, the
   * trigger is "structurally satisfied": no probability roll gates it, only severity + outlet-count),
   * IF no `three_outlet_storm` thread is already `open` (duplicate-inhibition, `repo.
   * hasOpenThreadOfTemplate`) AND the press registry still has ≥3 outlets (falsifiable if it shrinks, D3)
   * → `composeThreeOutletStormBeats`. `refusedForWireDay` is `true` ONLY when the OTHER conditions were
   * ALL satisfied but the SOLE reason nothing opened is the wire-day exclusion — the E2E floor's
   * "evaluated-and-refused, not merely absent" proof reads THIS field, never merely `wireDayFired` (which
   * would also be `true`, misleadingly, on a fodder-less wire day with nothing to refuse).
   */
  private async evaluateThreeOutletStormTrigger(
    gameDay: number,
    fodderItems: readonly FodderItem[],
    wireDayFired: boolean,
  ): Promise<{ opened: number; refusedForWireDay: boolean }> {
    const outletCountSufficient = PRESS_OUTLET_REGISTRY.length >= 3; // D3 — falsifiable if the registry shrinks.
    const highFodder = fodderItems.filter((item) => item.severityBand === 'high');
    const wouldQualifyOtherwise = outletCountSufficient && highFodder.length > 0;

    if (wireDayFired) {
      if (wouldQualifyOtherwise) {
        this.logger.log(
          `BrennarDailyService.dailyTick(gameDay=${gameDay}): three_outlet_storm trigger evaluated-and-refused ` +
            `— wire day fired this game_day (design §3.2.3 mutual exclusion).`,
        );
      }
      return { opened: 0, refusedForWireDay: wouldQualifyOtherwise };
    }
    if (!wouldQualifyOtherwise) return { opened: 0, refusedForWireDay: false };

    const alreadyOpen = await this.repo.hasOpenThreadOfTemplate('three_outlet_storm');
    if (alreadyOpen) return { opened: 0, refusedForWireDay: false };

    await this.generator.composeThreeOutletStormBeats(gameDay, highFodder[0]!);
    return { opened: 1, refusedForWireDay: false };
  }

  // ───────────────────────────── phase 4d: slow_page trigger (C6) ─────────────────────────────────────

  /**
   * Phase 4d, series 1 of 2 (design §3.5.6/decisions D9, C6): (A) accumulate EVERY heat-observed
   * district's interest from YESTERDAY's persisted `news_daily_run.journalist_interest`
   * (`repo.readPreviousJournalistInterest`) + TODAY's hum signal (S3, `ConstantHumRepository.
   * aggregateAvgHeatByDistrict` — the SAME cross-player read `evaluateCooperAffairTrigger` already uses,
   * a fresh call here since that evaluator may have returned early on its OWN inhibition check) —
   * UNCONDITIONALLY, regardless of whether a NEW series is even eligible to open this run (mirrors
   * `applyQuorumAdoptionAndFlips`'s own "step A" unconditional-accumulation shape, 04g-B — the counter is
   * a real ongoing signal, not merely a trigger-arming mechanism); (B) determine TODAY's crossing
   * districts (interest was `< slowPageInterestThreshold` YESTERDAY, is `≥` TODAY — a genuine crossing,
   * never a district that has simply stayed above threshold since an earlier day, ascending
   * `district_id` for deterministic order); (C) IF the template-GLOBAL duplicate-inhibition gate is
   * clear (design §3.2 phase 4 preamble — mirrors `evaluateThreeOutletStormTrigger`'s own inline
   * `hasOpenThreadOfTemplate`/`hasRecentBeatOfTemplate` shape, NOT `isKeystoneInhibited` — slow_page is
   * not a keystone, kept as its own inline check for that reason) AND a covering journalist exists for
   * the FIRST crossing district (`journalistsCoveringDistrict` — structurally always non-empty given the
   * 6-journalist/18-district partition, checked defensively anyway) → `composeSlowPageSeries` opens the
   * ONLY series this run may open (the gate bounds ≤1 concurrent series city-wide, SAME shape as
   * storm's own single-contest-at-a-time mutex); (D) the updated interest map is returned for phase 6 to
   * persist (`news_daily_run.journalist_interest`) — the NEXT day's tick reads THIS run's own persisted
   * value back as "yesterday" (design "compteur roulant … miroir exact du quorum_adoption").
   */
  private async evaluateSlowPageTrigger(gameDay: number): Promise<{ opened: number; journalistInterest: Record<string, number> }> {
    const rate = newsBeatTunables.slowPageInterestAccumulationRate;
    const threshold = newsBeatTunables.slowPageInterestThreshold;
    const prevInterestRaw = await this.repo.readPreviousJournalistInterest(gameDay);
    const heatByDistrict = await this.constantHum.aggregateAvgHeatByDistrict(); // ordered by district_id (S3).

    const journalistInterest: Record<string, number> = {};
    const crossedDistrictIds: number[] = [];
    for (const obs of heatByDistrict) {
      const prev = prevInterestRaw[obs.districtId] ?? prevInterestRaw[String(obs.districtId)] ?? 0;
      const signal = districtInterestSignal(heatByDistrict, obs.districtId);
      const next = nextInterest(prev, rate, signal);
      journalistInterest[String(obs.districtId)] = next;
      if (prev < threshold && next >= threshold) crossedDistrictIds.push(obs.districtId);
    }

    if (crossedDistrictIds.length === 0) return { opened: 0, journalistInterest };

    const alreadyOpen = await this.repo.hasOpenThreadOfTemplate('slow_page');
    const alreadyRecent = !alreadyOpen && (await this.repo.hasRecentBeatOfTemplate('slow_page', newsBeatTunables.beatPersistenceInFeedHours));
    if (alreadyOpen || alreadyRecent) return { opened: 0, journalistInterest };

    for (const districtId of crossedDistrictIds) {
      const journalist = journalistsCoveringDistrict(districtId)[0];
      if (!journalist) continue; // structurally unreachable (the 6-journalist/18-district partition covers every district), never fabricated.
      await this.generator.composeSlowPageSeries(gameDay, districtId, journalist.journalistKey);
      return { opened: 1, journalistInterest };
    }
    return { opened: 0, journalistInterest };
  }

  // ───────────────────────────── phase 4d: hindsight trigger (C3) ──────────────────────────────────────

  /**
   * Phase 4d (design §3.5.3): every eligible resolution (`NewsFodderReader.scanResolutionsForHindsight`
   * — already delay-window-filtered + UNIQUE-partial pre-filtered) gets ONE seeded roll, in the reader's
   * OWN fixed source order (random_world → political, each `ORDER BY id`, design §8). A pass opens a NEW
   * arc (`composeRetrospectiveArc`) — its FIRST publication is only ever due on a LATER tick (see
   * `hindsight-arc.ts`'s scheduling doc comment), so this phase itself never produces a beat.
   */
  private async evaluateHindsightTrigger(gameDay: number): Promise<{ arcsOpened: number }> {
    const eligible = await this.fodderReader.scanResolutionsForHindsight(gameDay);
    const probability = newsBeatTunables.hindsightArcProbability;
    const rng = makeRng(`news:${gameDay}:hindsight`);
    let arcsOpened = 0;
    for (const item of eligible) {
      if (rng.chance(probability)) {
        await this.generator.composeRetrospectiveArc(item, gameDay);
        arcsOpened += 1;
      }
    }
    return { arcsOpened };
  }

  /** One digest beat: seeded outlet pick (design §3.2.5 "outlet assigné seedé") → covering-journalist
   *  lookup (deterministic, NO RNG — district → the drawn outlet's own journalist roster) → insert. */
  private async composeAndInsertDigestBeat(gameDay: number, item: FodderItem, rng: Rng): Promise<NewsBeatRow> {
    const outlet = PRESS_OUTLET_REGISTRY[rng.int(0, PRESS_OUTLET_REGISTRY.length - 1)]!;
    const journalist =
      item.districtId !== null
        ? journalistsForOutlet(outlet.outletKey).find((j) => j.beatDistrictIds.includes(item.districtId!))
        : undefined;
    const copy = copyForOutlet(NEWS_BEAT_DIGEST_COPY[item.sourceKind], outlet.outletKey);
    const sourceAttribution: SourceAttribution = {
      tier: 1,
      hedgeLevel: 0.0,
      outletKey: outlet.outletKey,
      ...(journalist ? { journalistKey: journalist.journalistKey } : {}),
    };
    return this.repo.insertDigestBeat({
      gameDay,
      districtId: item.districtId,
      beatCategory: newsBeatCategoryForFodderItem(item),
      outletKey: outlet.outletKey,
      journalistKey: journalist?.journalistKey ?? null,
      headlineI18nKey: copy.headlineI18nKey,
      bodyI18nKey: copy.bodyI18nKey,
      params: {
        district: item.districtId !== null ? `district-${item.districtId}` : null,
        subject: item.subjectI18nKey,
        outlet: outlet.nameI18nKey,
      },
      sourceAttribution,
      fodderRefs: [{ sourceKind: item.sourceKind, refId: item.refId }],
    });
  }
}

function countBySourceKind(items: readonly FodderItem[]): Record<FodderSourceKind, number> {
  const counts: Record<FodderSourceKind, number> = { random_world: 0, political: 0, live_ops: 0, ambient_micro: 0 };
  for (const item of items) counts[item.sourceKind] += 1;
  return counts;
}

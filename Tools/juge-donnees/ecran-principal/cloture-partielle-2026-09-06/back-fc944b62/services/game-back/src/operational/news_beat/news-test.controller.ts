// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 + C2 + C3 + C5
//             Pattern: R-EC-2 test-only controller (mirrors ambient-test.controller.ts's C1 form /
//             live-ops-test.controller.ts's own C1 "catalogue + read-tunables probe routes" precedent)
//             — mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()` gate).
//             — 04g-C C1 — 2026-07-16
//             — 04g-C C2 — 2026-07-16 (run-daily-tick direct-probe + daily-run read-back)
//             — 04g-C C3 — 2026-07-16 (advance-threads direct-probe, the crash-safety floor's own
//               phase-2-only invocation)
//             — 04g-C C5 — 2026-07-16 (compose-cooper-affair-thread + compose-sourceless-beat [chain-
//               refusal proof] + threads-by-journalist read)
//
// `NewsTestController` — TEST-ONLY probe routes for `NewsBeatModule`, under `/v1/_test/news/`.
//
// C1 routes:
//   GET /v1/_test/news/ping
//     → { ok: true } — proves NewsBeatModule is in the DI graph.
//
//   GET /v1/_test/news/read-tunables
//     Returns the 35 `newsBeatTunables.*` getter values (7 REUSE numeric/string + 28 NEW, C1) as a plain
//     object — anti-fabrication: reads REAL getter output, not a hardcoded echo (mirrors
//     `ambient-test.controller.ts`/`live-ops-test.controller.ts`'s own `read-tunables` precedent). The
//     registry-first LISTEN/NOTIFY hot-reload proof (04e-B/04e-C C1 pattern) polls this route after a
//     `tunable_overrides` INSERT.
//
// C2 routes:
//   POST /v1/_test/news/run-daily-tick
//     Body: { gameDay: number }
//     Calls the REAL `BrennarDailyService.dailyTick(gameDay)` directly — the EXACT same tick body the
//     real NIGHTLY/30 scheduler registration invokes (mirrors `RandomWorldEventGeneratorService.
//     runDailyTick`/`AmbientMicroEventService.runDailyTick`'s own direct-probe idiom). Accepts an
//     ARBITRARY `gameDay` (no monotonicity requirement — `NewsBeatRepository.claimDay`'s own doc
//     comment) so a spec can jump straight to any day a scenario needs.
//     → `BrennarDailyTickResult`.
//
//   GET /v1/_test/news/daily-run/:gameDay
//     Reads back ONE `news_daily_run` row (clean JSON — jsonb columns as real objects, not
//     psql-text-mangled strings). 404 if unknown (no claim for that game_day yet).
//
// C3 routes:
//   POST /v1/_test/news/advance-threads
//     Body: { gameDay: number }
//     Calls `BrennarDailyService.advanceOpenThreads(gameDay)` DIRECTLY — phase 2 ONLY, bypassing the
//     day-level claim (`dailyTick`'s phase 0) entirely. The crash-safety floor's OWN mechanism: invoking
//     THIS route twice in a row for the SAME `gameDay` proves the per-publication EXISTENCE GUARD
//     (`NewsBeatRepository.countBeatsForThread`) — not the day-claim — is what makes a re-run safe
//     (design §8 "phase 2 re-runnable … idempotent par guard d'existence").
//     → `{ publishedCount: number; concludedCount: number }`.
//
//   POST /v1/_test/news/compose-retrospective-arc
//     Body: { resolvedItem: FodderItem; gameDay: number; forceThrowAfterInsert?: boolean }
//     ★ C3 fix (review gate BLOCKING-1) — calls `NewsBeatGeneratorService.composeRetrospectiveArc`
//     DIRECTLY, bypassing the phase 4d trigger roll entirely. `forceThrowAfterInsert: true` is the E2E
//     atomicity proof's own fault-injection knob (mirrors `RivalEliminationService.executeElimination`'s
//     `failAtLayer` precedent) — the call rejects (500) AFTER the bare thread insert but BEFORE the
//     payload augment, proving `NewsBeatRepository.insertHindsightThreadAtomic`'s whole transaction
//     rolls back (no orphan `open`/payload-less thread committed).
//     → `NewsThreadRow` on success; throws (500) when `forceThrowAfterInsert` is set.
//
// C5 routes:
//   POST /v1/_test/news/compose-cooper-affair-thread
//     Body: { gameDay: number; districtId: number; journalistKey?: string }
//     Calls `NewsBeatGeneratorService.composeCooperAffairThread` DIRECTLY — bypasses the phase 4a
//     residue-vs-hum-baseline/journalist-cohesion gates entirely (the ★ displacement E2E proof's own
//     tool: opens a cooper thread on an ARBITRARY district, on demand, to exercise
//     `NewsBeatRepository.displaceOpenSourcelessThreadsInDistrict`'s side-effect without needing to
//     coordinate 2 independent natural triggers onto the SAME district).
//     → `NewsThreadRow`.
//
//   POST /v1/_test/news/compose-sourceless-beat
//     Body: { gameDay: number; journalistKey: string; forcePoisonedAttribution?: boolean }
//     Calls `NewsBeatGeneratorService.composeSourcelessBeat` DIRECTLY — bypasses the phase 4a readiness/
//     mood/roll gates entirely, using a FRESH `makeRng('news:{gameDay}:sourceless_beat')` (the SAME seed
//     the real trigger would also draw from for that `gameDay` — deterministic, no divergence).
//     `forcePoisonedAttribution: true` is the ★ chain-refusal proof's own fault-injection knob (mirrors
//     `compose-retrospective-arc`'s `forceThrowAfterInsert` precedent): the call rejects (500) from
//     `NewsBeatRepository.insertSourcelessThreadAtomic`'s own `assertSourcelessAttributionShape` guard,
//     proving NO row commits for a chain-violating sourceless attribution.
//     → `NewsThreadRow` on success; throws (500) when `forcePoisonedAttribution` is set.
//
//   GET /v1/_test/news/threads-by-journalist/:journalistKey
//     The "framing track record" query-derived read (design §3.6/Scénario 2) — `NewsBeatRepository.
//     findThreadsByJournalist` directly, ordered `opened_at_game_day` ascending.
//     → `NewsThreadRow[]`.
//
// ★ I-2 fix (review gate IMPORTANT-2, C5, post-merge):
//   POST /v1/_test/news/advance-threads gained an optional `forceThrowAfterReframeBeat` body field — see
//   that route's own doc comment below (the cooper_affair atomic-advance fault-injection knob).
//
// ★ chore/gate-orphan-coverage fix (2026-08-05, Determinism co-tenancy, 3rd pass):
//   GET /v1/_test/news/phase4a-premise/:gameDay
//   `news_beat_brennar_daily_c2.spec.ts`'s own "re-run the SAME game_day" determinism test needs to tell
//   apart "the 2 runs saw the SAME global state" from "a co-tenant wrote global state BETWEEN the 2
//   runs" — the SAME distinction `isKeystoneInhibited`/`evaluateCooperAffairTrigger`/
//   `evaluateSourcelessBeatTrigger` (brennar-daily.service.ts) branch on internally. THIS route calls
//   those EXACT SAME repository/service methods DIRECTLY (never a hand-rolled SQL re-derivation in the
//   spec file — the spec's own header now documents why that would drift) so a caller can snapshot the
//   premise BEFORE each run and diff the 2 snapshots — see that route's own doc comment below.
//
// ★ TD-340-closeout fix (2026-08-06, ⊥ gate finding — `news_beat_brennar_daily_c2.spec.ts:570` FAILED
//   despite an "established" premise): the 3-pass premise above snapshotted every GLOBAL, UNSCOPED DB
//   READ phase 4a's triggers make, but missed a DIFFERENT class of global input that phase 4a ALSO
//   branches on — the 9 `newsBeatTunables.*` getters those same trigger functions read, each itself a
//   read against `tunable_overrides` (`TunablesStore.resolveInt`/`resolveFloat`) that merely LOOKS like
//   a constant because of its `.` call syntax. `Phase4aPremiseSnapshot.tunables`'s own doc comment below
//   has the full per-key attribution to `brennar-daily.service.ts`.

import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';

import { makeRng } from '../../common/seeded-rng';
import { newsBeatTunables } from './news-beat.tunables';
import { BrennarDailyService, type BrennarDailyTickResult } from './brennar-daily.service';
import { NewsBeatRepository } from './news-beat.repository';
import { NewsBeatGeneratorService } from './news-beat-generator.service';
import { NewsFodderReader } from './news-fodder-reader.service';
import { ConstantHumRepository, type DistrictHeatObservation } from '../ambient/constant-hum.repository';
import { SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS } from './sourceless-beat';
import type { NewsDailyRunRow, NewsThreadRow } from '../../db/schema/news_beat';
import type { FodderItem } from './news-beat.types';

/**
 * The result shape of `GET /v1/_test/news/phase4a-premise/:gameDay` — see that route's own doc comment.
 * Every field is the RAW, unmodified return value of a real repository/service call (never re-derived/
 * summarized here) — 2 snapshots are byte-comparable (JSON) iff the 2 underlying reads were.
 */
export interface Phase4aPremiseSnapshot {
  /** `isKeystoneInhibited('cooper_affair')`'s own 2 reads (brennar-daily.service.ts:887-890). */
  readonly cooperInhibited: { readonly hasOpenThread: boolean; readonly hasRecentBeat: boolean };
  /** `isKeystoneInhibited('sourceless_beat')`'s own 2 reads (SAME method, other mutex namespace). */
  readonly sourcelessInhibited: { readonly hasOpenThread: boolean; readonly hasRecentBeat: boolean };
  /** `ConstantHumRepository.aggregateAvgHeatByDistrict()` — `evaluateCooperAffairTrigger`'s own
   *  cross-player residue read (:915). */
  readonly heatByDistrict: readonly DistrictHeatObservation[];
  /** `ConstantHumRepository.listCellsForDistrict(districtId)`, ONE call PER district `heatByDistrict`
   *  returned (:919, the SAME loop the real trigger runs) — keyed by `districtId`. */
  readonly cellsByDistrict: Record<number, unknown>;
  /** `NewsBeatRepository.lastBylineGameDayByJournalist()` — `evaluateSourcelessBeatTrigger`'s own
   *  readiness read (:958), `Map` flattened to a plain object for JSON transport. */
  readonly lastByline: Record<string, number>;
  /** `NewsBeatRepository.avgDistrictCohesionCrossPlayer()` — the SAME trigger's own mood read (:972). */
  readonly avgCohesion: number | null;
  /** `NewsBeatRepository.recentBeatsGeneratedCounts(gameDay, SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS)` —
   *  the SAME trigger's own recent-density read (:975). */
  readonly recentBeatsGeneratedCounts: readonly number[];
  /** `NewsFodderReader.scanFodder(gameDay)` — phase 5's OWN candidate pool the digest ranks against
   *  (news-beat.service.ts phase list item 5): 3 of its 4 sources use a LOOKBACK WINDOW (design §3.3),
   *  so a co-tenant's OWN activation inside that window can change this even though `ambient_micro_event`
   *  (exact-`gameDay`-scoped) never does. */
  readonly fodderPool: readonly FodderItem[];
  /**
   * ★ TD-340-closeout fix (2026-08-06, ⊥ gate finding — the premise capture missed a whole CLASS of
   * input): every value above is a DB READ; `newsBeatTunables` is ALSO a DB read
   * (`TunablesStore.resolveInt`/`resolveFloat` against `tunable_overrides`, `news-beat.tunables.ts`) —
   * it merely LOOKS like a constant because it is called with `.` syntax, not `await repo.select(...)`.
   * The lesson this closes: when capturing an input snapshot, the inventory is by DATA ORIGIN, not by
   * the syntactic shape of the call site. A co-tenant admin `PUT`-ing a `tunable_overrides` row between
   * 2 premise captures changes phase 4a's branching WITHOUT touching any of the 7 fields above, so the
   * old (7-field) snapshot could — and did (`news_beat_brennar_daily_c2.spec.ts:570`, `digestBeatsCount`
   * 4 vs 5) — read byte-identical across 2 runs that actually branched differently.
   *
   * These 9 values are EVERY `newsBeatTunables.*` getter phase 4a's own trigger-evaluation functions
   * read, established by READING `brennar-daily.service.ts`, never guessed (no other getter appears
   * inside `isKeystoneInhibited`/`evaluateCooperAffairTrigger`/`evaluateSourcelessBeatTrigger`):
   *   - `beatPersistenceInFeedHours` — `isKeystoneInhibited`'s own inhibition window, BOTH keystones
   *     (brennar-daily.service.ts:889).
   *   - `cooperResidueOverAmbientMargin` — `evaluateCooperAffairTrigger`'s residue-vs-baseline margin (:913).
   *   - `cooperJournalistCohesionThreshold` — same trigger's covering-journalist gate (:914).
   *   - `cooperFrameOnlyNoIncidentProbability` — same trigger's own seeded roll (:932).
   *   - `journalistIdleReadinessDays` — `evaluateSourcelessBeatTrigger`'s readiness denominator (:959).
   *   - `sourcelessFramingReadinessThreshold` — same trigger's readiness gate (:960).
   *   - `brennarDailyBeatsPerDayBaseline` — same trigger's `recentAvg` empty-history fallback (:976) —
   *     ALSO phase 5's digest-fill baseline (`remainingSlots = baseline − consumedSlots`, :312 — the
   *     EXACT value behind `digestBeatsCount`, the field the determinism test's own failure named).
   *   - `sourcelessCityMoodReceptivenessFloor` — same trigger's mood gate (:979).
   *   - `sourcelessBeatPseudoEventProbability` — same trigger's own seeded roll (:982).
   * Read directly off the SAME `newsBeatTunables` getters the real triggers call (never re-derived/
   * hardcoded here) — a plain in-process property read against `TunablesStore`'s own already-live
   * snapshot (no extra SQL round-trip; `TunablesStore.init()` already ran at boot), so adding these 9
   * costs nothing measurable on top of the 7 DB reads already above.
   */
  readonly tunables: {
    readonly beatPersistenceInFeedHours: number;
    readonly cooperResidueOverAmbientMargin: number;
    readonly cooperJournalistCohesionThreshold: number;
    readonly cooperFrameOnlyNoIncidentProbability: number;
    readonly journalistIdleReadinessDays: number;
    readonly sourcelessFramingReadinessThreshold: number;
    readonly brennarDailyBeatsPerDayBaseline: number;
    readonly sourcelessCityMoodReceptivenessFloor: number;
    readonly sourcelessBeatPseudoEventProbability: number;
  };
}

@Controller()
export class NewsTestController {
  constructor(
    private readonly brennarDaily: BrennarDailyService,
    private readonly repo: NewsBeatRepository,
    private readonly generator: NewsBeatGeneratorService,
    // ★ chore/gate-orphan-coverage — phase4a-premise's own reads (see that route's doc comment + file
    // header). Both are ALREADY in this module's DI graph (`NewsFodderReader`: this module's own C2
    // provider ; `ConstantHumRepository`: `AmbientModule`'s C5 export, `news-beat.module.ts`'s own
    // import) — no module-graph change, purely a 2nd/3rd consumer.
    private readonly fodderReader: NewsFodderReader,
    private readonly constantHum: ConstantHumRepository,
  ) {}

  /**
   * POST /v1/_test/news/compose-cooper-affair-thread
   * Body: { gameDay: number; districtId: number; journalistKey?: string }
   *
   * Calls `NewsBeatGeneratorService.composeCooperAffairThread` DIRECTLY. See file header (C5 routes).
   */
  @Post('_test/news/compose-cooper-affair-thread')
  composeCooperAffairThread(@Body() body: { gameDay: number; districtId: number; journalistKey?: string }): Promise<NewsThreadRow> {
    return this.generator.composeCooperAffairThread(body.gameDay, body.districtId, body.journalistKey);
  }

  /**
   * POST /v1/_test/news/compose-sourceless-beat
   * Body: { gameDay: number; journalistKey: string; forcePoisonedAttribution?: boolean }
   *
   * Calls `NewsBeatGeneratorService.composeSourcelessBeat` DIRECTLY. See file header (★ C5 chain-refusal
   * proof route).
   */
  @Post('_test/news/compose-sourceless-beat')
  composeSourcelessBeat(
    @Body() body: { gameDay: number; journalistKey: string; forcePoisonedAttribution?: boolean },
  ): Promise<NewsThreadRow> {
    const rng = makeRng(`news:${body.gameDay}:sourceless_beat`);
    return this.generator.composeSourcelessBeat(body.gameDay, body.journalistKey, rng, body.forcePoisonedAttribution ?? false);
  }

  /**
   * GET /v1/_test/news/threads-by-journalist/:journalistKey
   *
   * Calls `NewsBeatRepository.findThreadsByJournalist` DIRECTLY. See file header (C5 routes).
   */
  @Get('_test/news/threads-by-journalist/:journalistKey')
  threadsByJournalist(@Param('journalistKey') journalistKey: string): Promise<NewsThreadRow[]> {
    return this.repo.findThreadsByJournalist(journalistKey);
  }

  /** C1 connectivity probe: returns { ok: true } if NewsBeatModule is in the DI graph. */
  @Get('_test/news/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * POST /v1/_test/news/run-daily-tick
   * Body: { gameDay: number }
   *
   * Calls the REAL `BrennarDailyService.dailyTick(gameDay)` directly. See file header.
   */
  @Post('_test/news/run-daily-tick')
  runDailyTick(@Body() body: { gameDay: number }): Promise<BrennarDailyTickResult> {
    return this.brennarDaily.dailyTick(body.gameDay);
  }

  /**
   * POST /v1/_test/news/advance-threads
   * Body: { gameDay: number; forceThrowAfterReframeBeat?: boolean; forceThrowAfterInstallmentBeat?: boolean }
   *
   * Calls `BrennarDailyService.advanceOpenThreads(gameDay)` DIRECTLY — phase 2 ONLY, bypassing the
   * day-level claim. See file header (C3 routes). ★ I-2 fix (review gate IMPORTANT-2, C5, post-merge):
   * `forceThrowAfterReframeBeat: true` is the E2E atomicity proof's own fault-injection knob (mirrors
   * `compose-retrospective-arc`'s `forceThrowAfterInsert` precedent) — threaded straight through to
   * `advanceCooperAffairThread`; the call rejects (500) AFTER the reframe beat insert(s) but BEFORE the
   * cursor `payload` update, proving `NewsBeatRepository.advanceCooperAffairThreadAtomic`'s whole
   * transaction rolls back (no orphan reframe beat committed with a stale cursor). ★ C6 —
   * `forceThrowAfterInstallmentBeat: true` is the SAME class of fault-injection knob, threaded through to
   * `advanceSlowPageThread`/`NewsBeatRepository.advanceSlowPageThreadAtomic` (the slow_page installment-
   * advance atomicity proof).
   */
  @Post('_test/news/advance-threads')
  advanceThreads(
    @Body() body: { gameDay: number; forceThrowAfterReframeBeat?: boolean; forceThrowAfterInstallmentBeat?: boolean },
  ): Promise<{
    publishedCount: number;
    concludedCount: number;
    hindsightPublished: number;
    cooperReframesPublished: number;
    slowPageInstallmentsPublished: number;
  }> {
    return this.brennarDaily.advanceOpenThreads(
      body.gameDay,
      body.forceThrowAfterReframeBeat ?? false,
      body.forceThrowAfterInstallmentBeat ?? false,
    );
  }

  /**
   * POST /v1/_test/news/compose-retrospective-arc
   * Body: { resolvedItem: FodderItem; gameDay: number; forceThrowAfterInsert?: boolean }
   *
   * Calls `NewsBeatGeneratorService.composeRetrospectiveArc` DIRECTLY. See file header (★ C3 fix,
   * atomicity proof route).
   */
  @Post('_test/news/compose-retrospective-arc')
  composeRetrospectiveArc(
    @Body() body: { resolvedItem: FodderItem; gameDay: number; forceThrowAfterInsert?: boolean },
  ): Promise<NewsThreadRow> {
    return this.generator.composeRetrospectiveArc(body.resolvedItem, body.gameDay, body.forceThrowAfterInsert ?? false);
  }

  /**
   * GET /v1/_test/news/daily-run/:gameDay
   *
   * Reads back ONE `news_daily_run` row. 404 if unknown (no claim for that game_day yet).
   */
  @Get('_test/news/daily-run/:gameDay')
  async readDailyRun(@Param('gameDay') gameDayParam: string): Promise<NewsDailyRunRow> {
    const gameDay = Number.parseInt(gameDayParam, 10);
    const row = await this.repo.readDailyRun(gameDay);
    if (!row) {
      throw new HttpException(`news_daily_run for game_day=${gameDay} not found`, HttpStatus.NOT_FOUND);
    }
    return row;
  }

  /**
   * GET /v1/_test/news/read-tunables
   *
   * Returns the 35 `newsBeatTunables.*` getter values. See file header.
   */
  @Get('_test/news/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // REUSE (7 with a getter — documented_moment_artifact_severity_threshold deliberately has none).
      brennarDailyBeatsPerDayBaseline: newsBeatTunables.brennarDailyBeatsPerDayBaseline,
      beatPersistenceInFeedHours: newsBeatTunables.beatPersistenceInFeedHours,
      cooperFrameOnlyNoIncidentProbability: newsBeatTunables.cooperFrameOnlyNoIncidentProbability,
      sourcelessBeatPseudoEventProbability: newsBeatTunables.sourcelessBeatPseudoEventProbability,
      spiralOfSilenceOmissionThreshold: newsBeatTunables.spiralOfSilenceOmissionThreshold,
      wireDayHomogenizationCount: newsBeatTunables.wireDayHomogenizationCount,
      threeOutletStormFramingDivergenceThreshold: newsBeatTunables.threeOutletStormFramingDivergenceThreshold,
      // NEW — cross-cutting fodder scan.
      digestFodderLookbackDays: newsBeatTunables.digestFodderLookbackDays,
      digestFodderScanCap: newsBeatTunables.digestFodderScanCap,
      // NEW — cooper_affair.
      cooperResidueOverAmbientMargin: newsBeatTunables.cooperResidueOverAmbientMargin,
      cooperFrameHalfLifeDays: newsBeatTunables.cooperFrameHalfLifeDays,
      cooperMaxReframes: newsBeatTunables.cooperMaxReframes,
      cooperReframeResistanceGrowth: newsBeatTunables.cooperReframeResistanceGrowth,
      cooperJournalistCohesionThreshold: newsBeatTunables.cooperJournalistCohesionThreshold,
      // NEW — sourceless_beat.
      sourcelessFramingReadinessThreshold: newsBeatTunables.sourcelessFramingReadinessThreshold,
      sourcelessCityMoodReceptivenessFloor: newsBeatTunables.sourcelessCityMoodReceptivenessFloor,
      sourcelessArcDecayPerSilentWeek: newsBeatTunables.sourcelessArcDecayPerSilentWeek,
      journalistIdleReadinessDays: newsBeatTunables.journalistIdleReadinessDays,
      // NEW — folded_page.
      foldedPageSuppressionThresholdSeverity: newsBeatTunables.foldedPageSuppressionThresholdSeverity,
      foldedPageOutletCountTracked: newsBeatTunables.foldedPageOutletCountTracked,
      // NEW — three_outlet_storm.
      stormLockMargin: newsBeatTunables.stormLockMargin,
      stormContestWindowDays: newsBeatTunables.stormContestWindowDays,
      stormContestedPersistenceWeeks: newsBeatTunables.stormContestedPersistenceWeeks,
      // NEW — slow_page.
      slowPageInstallmentsDefault: newsBeatTunables.slowPageInstallmentsDefault,
      slowPageInterestAccumulationRate: newsBeatTunables.slowPageInterestAccumulationRate,
      slowPageInterestThreshold: newsBeatTunables.slowPageInterestThreshold,
      slowPageSaturationWeeks: newsBeatTunables.slowPageSaturationWeeks,
      // NEW — hindsight.
      hindsightArcProbability: newsBeatTunables.hindsightArcProbability,
      hindsightArcDelayWeeksMin: newsBeatTunables.hindsightArcDelayWeeksMin,
      hindsightArcDelayWeeksMax: newsBeatTunables.hindsightArcDelayWeeksMax,
      hindsightIndicatorCount: newsBeatTunables.hindsightIndicatorCount,
      hindsightTotalPublications: newsBeatTunables.hindsightTotalPublications,
      hindsightPublicationWeeks: newsBeatTunables.hindsightPublicationWeeks,
      // NEW — wire_day.
      wireDayBaseFrequencyPerDays: newsBeatTunables.wireDayBaseFrequencyPerDays,
      wireLowProductionThreshold: newsBeatTunables.wireLowProductionThreshold,
    };
  }

  /**
   * GET /v1/_test/news/phase4a-premise/:gameDay
   *
   * ★ chore/gate-orphan-coverage (2026-08-05) — see file header. Calls, in THIS exact order, the SAME
   * repository/service methods `isKeystoneInhibited` / `evaluateCooperAffairTrigger` /
   * `evaluateSourcelessBeatTrigger` (brennar-daily.service.ts) and `NewsFodderReader.scanFodder` use
   * internally — a plain pass-through snapshot, never a re-derivation, so it can never itself drift from
   * what the real tick reads. Every read here is READ-only (each already independently proven so: the
   * fodder reader's own class-level contract, `constant-hum.repository.ts`'s own plain `SELECT`s,
   * `news-beat.repository.ts`'s own plain `SELECT`s) — safe to call any number of times with zero side
   * effect, including twice per test as the determinism spec does.
   *
   * ★ TD-340-closeout fix (2026-08-06) — ALSO snapshots the 9 `newsBeatTunables.*` getters phase 4a's
   * own trigger functions read (`Phase4aPremiseSnapshot.tunables`'s own doc comment has the full
   * per-key attribution). Same READ-only, zero-side-effect posture — plain in-process property reads
   * against `TunablesStore`'s own already-live snapshot, no extra SQL.
   *
   * `gameDay` is used ONLY where the real triggers themselves use it (`recentBeatsGeneratedCounts`'s
   * own `beforeGameDay` bound, `scanFodder`'s own lookback-window anchor) — never to scope/filter the
   * OTHER reads, which are exactly as GLOBAL/unscoped here as they are in the real triggers (that global
   * scope is the whole reason this route exists).
   */
  @Get('_test/news/phase4a-premise/:gameDay')
  async phase4aPremiseSnapshot(@Param('gameDay') gameDayParam: string): Promise<Phase4aPremiseSnapshot> {
    const gameDay = Number.parseInt(gameDayParam, 10);

    // `isKeystoneInhibited('cooper_affair')` / `('sourceless_beat')` (brennar-daily.service.ts:887-890).
    const cooperInhibited = {
      hasOpenThread: await this.repo.hasOpenThreadOfTemplate('cooper_affair'),
      hasRecentBeat: await this.repo.hasRecentBeatOfTemplate('cooper_affair', newsBeatTunables.beatPersistenceInFeedHours),
    };
    const sourcelessInhibited = {
      hasOpenThread: await this.repo.hasOpenThreadOfTemplate('sourceless_beat'),
      hasRecentBeat: await this.repo.hasRecentBeatOfTemplate('sourceless_beat', newsBeatTunables.beatPersistenceInFeedHours),
    };

    // `evaluateCooperAffairTrigger`'s own residue-vs-hum-baseline read (:915/:919 — ONE `listCellsForDistrict`
    // call PER district `aggregateAvgHeatByDistrict` returned, the SAME loop the real trigger runs).
    const heatByDistrict = await this.constantHum.aggregateAvgHeatByDistrict();
    const cellsByDistrict: Record<number, unknown> = {};
    for (const obs of heatByDistrict) {
      cellsByDistrict[obs.districtId] = await this.constantHum.listCellsForDistrict(obs.districtId);
    }

    // `evaluateSourcelessBeatTrigger`'s own readiness/mood reads (:958/:972/:975).
    const lastByline = Object.fromEntries(await this.repo.lastBylineGameDayByJournalist());
    const avgCohesion = await this.repo.avgDistrictCohesionCrossPlayer();
    const recentBeatsGeneratedCounts = await this.repo.recentBeatsGeneratedCounts(gameDay, SOURCELESS_MOOD_DENSITY_LOOKBACK_RUNS);

    // Phase 5's own candidate pool (see `Phase4aPremiseSnapshot.fodderPool`'s own doc comment above).
    const fodderPool = await this.fodderReader.scanFodder(gameDay);

    // ★ TD-340-closeout fix — the 9 store-backed tunables phase 4a branches on (see
    // `Phase4aPremiseSnapshot.tunables`'s own doc comment for the exact per-key attribution to
    // `brennar-daily.service.ts`). Plain getter reads — `TunablesStore`'s own already-live in-memory
    // snapshot, zero extra SQL.
    const tunables = {
      beatPersistenceInFeedHours: newsBeatTunables.beatPersistenceInFeedHours,
      cooperResidueOverAmbientMargin: newsBeatTunables.cooperResidueOverAmbientMargin,
      cooperJournalistCohesionThreshold: newsBeatTunables.cooperJournalistCohesionThreshold,
      cooperFrameOnlyNoIncidentProbability: newsBeatTunables.cooperFrameOnlyNoIncidentProbability,
      journalistIdleReadinessDays: newsBeatTunables.journalistIdleReadinessDays,
      sourcelessFramingReadinessThreshold: newsBeatTunables.sourcelessFramingReadinessThreshold,
      brennarDailyBeatsPerDayBaseline: newsBeatTunables.brennarDailyBeatsPerDayBaseline,
      sourcelessCityMoodReceptivenessFloor: newsBeatTunables.sourcelessCityMoodReceptivenessFloor,
      sourcelessBeatPseudoEventProbability: newsBeatTunables.sourcelessBeatPseudoEventProbability,
    };

    return { cooperInhibited, sourcelessInhibited, heatByDistrict, cellsByDistrict, lastByline, avgCohesion, recentBeatsGeneratedCounts, fodderPool, tunables };
  }
}

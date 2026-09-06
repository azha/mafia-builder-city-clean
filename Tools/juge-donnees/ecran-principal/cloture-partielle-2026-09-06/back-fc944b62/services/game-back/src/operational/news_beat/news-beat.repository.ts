// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (news-beat.repository.ts —
//             claim + digest insert + counters) + C3 (news_thread CRUD + template-beat insert + the
//             wire-day low-production history read) + C4 (duplicate-inhibition guard + the storm/
//             folded_page atomic multi-write helpers + the recurrence-signal read) + C5 (keystone
//             duplicate-inhibition persistence-window read + the cooper/sourceless atomic opens +
//             sourceless's chain-refusal guard + displacement + the readiness/mood signal reads) + C6
//             (slow_page's atomic open/advance + the rolling journalist_interest read + the player feed's
//             own persistence-window + detail reads)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §4.3 (news_daily_run)
//             + §4.1 (news_beat columns a digest beat fills) + §3.2 phases 0/2/3/5/6 + §4.2 (news_thread)
//             + §3.5.4 (three_outlet_storm) + §3.5.5 (folded_page) + §3.5.1 (cooper_affair) + §3.5.2
//             (sourceless_beat) + §3.5.6 (slow_page) + §6.1 (player feed/detail — P5, R2.2)
//             Pattern: mirrors `random-world-event.repository.ts`'s `claimDay`/`finalizeDailyRun` shape
//             (S6/S10 twin — "the claim IS the row", `game_day` PK, `INSERT ... ON CONFLICT DO NOTHING`).
//             — 04g-C C2 — 2026-07-16
//             — 04g-C C3 — 2026-07-16 (news_thread CRUD + insertTemplateBeat + getRecentFodderCountTotals)
//             — 04g-C C4 — 2026-07-16 (hasOpenThreadOfTemplate + insertThreeOutletStormThreadAtomic +
//               insertFoldedPageBeatsAtomic + ambientMicroEventDaysWithActivityInDistrict)
//             — 04g-C C5 — 2026-07-16 (hasRecentBeatOfTemplate + insertCooperAffairThreadAtomic +
//               insertSourcelessThreadAtomic [chain-refusal guard] + displaceOpenSourcelessThreadsInDistrict
//               + lastBylineGameDayByJournalist + avgDistrictCohesionCrossPlayer +
//               recentBeatsGeneratedCounts + findThreadsByJournalist + ambientMicroEventRefsForDistrictOnDay)
//             — 04g-C C6 — 2026-07-16 (readPreviousJournalistInterest + FinalizeDailyRunCounters.
//               journalistInterest + insertSlowPageThreadAtomic + advanceSlowPageThreadAtomic
//               [proactive atomic-advance, mirrors the C5 I-2 fix] + listFeedBeats + getBeatById)
//             — 04g-C C7 — 2026-07-16 (BO reads: readLatestDailyRun/listDailyRuns/listActiveBeatsRaw/
//               listThreadsByIds/listThreadsByStatus/listBeatsByThreadId — design §6.2, mirrors
//               `RandomWorldEventRepository`'s OWN C5 BO-reads shape)
//
// `NewsBeatRepository` — the persisted access layer over `news_beat`/`news_thread`/`news_daily_run`
// (migration 0130, C1 schema). C3 adds the `news_thread` CRUD, `insertTemplateBeat` (the non-digest
// sibling of `insertDigestBeat` — thread_id/template_id/frame all non-null-capable), and
// `getRecentFodderCountTotals` (the wire-day low-production signal, design §3.5.7). C4 adds THE SAME
// "wrap the whole multi-write in ONE `db.transaction`" discipline C3's own BLOCKING-1 fix established,
// applied PROACTIVELY this time (never separately-committed steps to begin with) — `three_outlet_storm`
// opens 1 thread + 3 beats atomically, `folded_page` inserts 2 covering beats + 1 hollow beat atomically.
// Matches this codebase's OWN convention (grepped across `equipment-failure-exception.repository.ts`/
// `maintenance.repository.ts`/`political-event.repository.ts`/etc.): every multi-write transaction
// INLINES its own `tx.insert(...)` calls rather than parameterizing a shared executor over
// `insertDigestBeat`/`insertTemplateBeat` — a small, deliberate duplication, not an oversight.
//
// C5 adds the 2 keystone atomic opens (SAME "built atomic from the start" discipline C4's
// `insertThreeOutletStormThreadAtomic` established) PLUS 5 new READ-only methods this module's OWN
// tables (`news_beat`/`news_thread`/`news_daily_run`) and ONE cross-player READ against the SHARED core
// schema `district_cohesion` table (`db/schema/city_state.ts`) — a cross-player AVG read, mirroring
// `ConstantHumRepository.aggregateAvgHeatByDistrict`'s OWN "own query against an upstream shared table,
// never edit the owning module" precedent (design §0/§8 "READ-only … jamais un fig-leaf sur une table
// amont"). `district_cohesion` has no dedicated cross-player-aggregate repository method anywhere in the
// codebase yet (`political-event.repository.ts`'s own `readDistrictCohesion` is PER-PLAYER) — this file
// adds the FIRST one, scoped narrowly to what `sourceless_beat`'s own city-mood signal needs.
//
// ★ I-2 fix (review gate IMPORTANT-2, C5, post-merge): `advanceCooperAffairThreadAtomic` below wraps
// `BrennarDailyService.advanceCooperAffairThread`'s own per-call writes (0+ reframe-beat inserts + the
// cursor `payload` update + the optional terminal conclude) in ONE `db.transaction` — the SAME "un-
// transactioned insert-then-cursor-update crash window" shape C3's own BLOCKING-1 fix closed for
// hindsight's OPEN, applied here to cooper_affair's own daily ADVANCE (milder — self-healing/non-
// bricking, since nothing downstream TypeErrors on the stale cursor — but the SAME anti-pattern: a throw
// between the beat insert and the cursor write let a deterministic seeded re-run double-publish the
// identical reframe beat). See that method's own doc comment for the full mechanism.
//
// ★ C6 — `slow_page`'s OWN atomic open (`insertSlowPageThreadAtomic`, mirrors `insertCooperAffairThreadAtomic`'s
// 2-step shape minus the beat — slow_page's OPEN produces ZERO beat, its first installment is only ever
// due 7 game-days later via phase 2) AND its atomic ADVANCE (`advanceSlowPageThreadAtomic`, mirrors
// `advanceCooperAffairThreadAtomic`'s "0+ beat inserts + terminal conclude, ALL in one transaction" shape
// — proactively applying the SAME I-2 lesson from the start, rather than shipping the un-transactioned
// insert-then-conclude shape the review already flagged once for cooper's own advance). `readPreviousJournalistInterest`
// is the rolling per-district signal's OWN "yesterday" read (design §3.5.6/D9, mirrors `getRecentFodderCountTotals`'s
// shape). `listFeedBeats`/`getBeatById` are the player projection's OWN reads (design §6.1, P5/R2.2) — the
// feed's ENTIRE persistence window is realized as THIS query's `created_at` predicate (decisions D5 —
// "le filtre EST la persistence, zéro sweep"), never a background job.
//
// ★ C3 fix (review gate BLOCKING-1, post-merge): `insertBareThread`/`updateThreadPayload` below were
// ORIGINALLY the 2 steps of composeRetrospectiveArc's own insert-then-augment (mirrors
// `random-world-event-generator.service.ts`'s own `${event.id}:fork` 2-step precedent — a thread's id is
// DB-generated so nothing can seed off it before the first INSERT returns), run as 2 SEPARATE
// un-transactioned statements. The reviewer found this left a crash window: a throw between them (a
// transient connection drop on the intervening indicator-pool read, or SIGTERM/OOM) committed an "open"
// hindsight thread with `payload = {}` that `scanResolutionsForHindsight`'s own `NOT EXISTS` + the
// mig-0130 UNIQUE-PARTIAL then excluded PERMANENTLY (no later tick could ever repair it), and that
// `advanceHindsightThread` (`brennar-daily.service.ts`) then TypeError'd on every subsequent tick,
// silently bricking the whole Brennar Daily subsystem. Fix: `insertHindsightThreadAtomic` below wraps
// BOTH writes (and the caller's intervening read) in ONE `db.transaction` — this is now the ONLY
// production path composeRetrospectiveArc calls. `insertBareThread`/`updateThreadPayload` stay public
// (unused by production code) — the falsifying E2E test uses `insertBareThread` ALONE (no augment) to
// seed the exact pre-fix poisoned-row shape, proving `advanceHindsightThread`'s new defensive guard.

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, inArray, isNotNull, lt, lte, or, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import {
  newsBeat,
  newsDailyRun,
  newsThread,
  type NewsBeatRow,
  type NewsDailyRunRow,
  type NewsThreadRow,
} from '../../db/schema/news_beat';
import { ambientMicroEvent } from '../../db/schema/ambient_world';
import { districtCohesion } from '../../db/schema/city_state';
import { fodderRefKey } from './news-beat-digest';
import { assertSourcelessAttributionShape } from './sourceless-beat';
import type { FodderRefCitation, NewsBeatCategoryValue, SourceAttribution } from './news-beat.types';

/** Fields `insertDigestBeat` writes (design §4.1 — `thread_id`/`template_id`/`frame` are all NULL for a
 *  digest beat, decisions D4). */
export interface NewDigestBeatInput {
  readonly gameDay: number;
  readonly districtId: number | null;
  readonly beatCategory: NewsBeatCategoryValue;
  readonly outletKey: string;
  readonly journalistKey: string | null;
  readonly headlineI18nKey: string;
  readonly bodyI18nKey: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly sourceAttribution: SourceAttribution;
  readonly fodderRefs: readonly FodderRefCitation[];
}

/** Phase 6 counters (design §4.3). ★ C6 — `journalistInterest` is the rolling per-district slow_page
 *  signal (design §3.5.6/D9, mirrors `random_world_daily_run.quorum_adoption`'s own "computed once during
 *  the tick, persisted at the SAME phase-6 counters write" shape — never a separate mid-tick write). */
export interface FinalizeDailyRunCounters {
  readonly beatsGeneratedCount: number;
  readonly templateCounts: Readonly<Record<string, number>>;
  readonly wireDay: boolean;
  readonly fodderCounts: Readonly<Record<string, number>>;
  readonly journalistInterest: Readonly<Record<string, number>>;
}

/** Fields `insertTemplateBeat` writes (design §4.1) — the non-digest sibling of `NewDigestBeatInput`:
 *  `thread_id`/`template_id`/`frame` are all writable (NULL still legal per-field — e.g. `wire_day`'s
 *  `thread_id` stays NULL, `hindsight`'s `frame` stays NULL — design §4.1/§3.4). */
export interface NewTemplateBeatInput {
  readonly gameDay: number;
  readonly threadId: string | null;
  readonly templateId: string;
  readonly districtId: number | null;
  readonly beatCategory: NewsBeatCategoryValue;
  readonly frame: string | null;
  readonly outletKey: string;
  readonly journalistKey: string | null;
  readonly headlineI18nKey: string;
  readonly bodyI18nKey: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly sourceAttribution: SourceAttribution;
  readonly fodderRefs: readonly FodderRefCitation[];
}

/** Fields `insertBareThread` writes (design §4.2, C3) — `payload`/`source_fodder_ref`'s FULL composite
 *  state (e.g. the `RetrospectiveArc`) is NOT known before the row exists (its `id` seeds the per-thread
 *  draws, `hindsight-arc.ts`'s own header). ALSO the input shape `insertHindsightThreadAtomic` (below,
 *  ★ C3 fix) takes for its own transactional step 1 — see that method's doc comment. ★ C5 —
 *  `sourceFodderRef` widened to accept `null`: `cooper_affair` (ambient-residue trigger, no single
 *  fodder row) and `sourceless_beat` (zero fodder by definition) both open with `source_fodder_ref:
 *  NULL` (design §4.2 schema comment: "NULL for cooper_affair … and sourceless_beat"). */
export interface NewBareThreadInput {
  readonly templateId: string;
  readonly journalistKey: string | null;
  readonly districtId: number | null;
  readonly openedAtGameDay: number;
  readonly sourceFodderRef: FodderRefCitation | null;
}

@Injectable()
export class NewsBeatRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── phase 0: claim ─────────────────────────────

  /** The per-game_day claim IS the row (design §4.3, S6 twin). Returns `claimed: false` iff a row for
   *  this `game_day` already existed (a 2nd/later firing for the same day — a pure no-op). */
  async claimDay(gameDay: number): Promise<{ claimed: boolean }> {
    const inserted = await this.db
      .insert(newsDailyRun)
      .values({ game_day: gameDay })
      .onConflictDoNothing({ target: newsDailyRun.game_day })
      .returning({ game_day: newsDailyRun.game_day });
    return { claimed: inserted.length > 0 };
  }

  /** Read-back the daily_run row as-is (test/BO diagnostic — no claim). */
  async readDailyRun(gameDay: number): Promise<NewsDailyRunRow | undefined> {
    const rows = await this.db.select().from(newsDailyRun).where(eq(newsDailyRun.game_day, gameDay)).limit(1);
    return rows[0];
  }

  // ───────────────────────────── phase 5: digest fill ─────────────────────────────

  /**
   * Phase 5 dedup gate (design §3.3: "un fodder ref déjà cité dans la fenêtre de persistence n'est pas
   * re-cité"): the set of `sourceKind:refId` keys already cited by ANY `news_beat` row whose
   * `created_at` is within `persistenceHours` real-clock (D5 — a query predicate, never a sweep;
   * mirrors the future feed's OWN persistence-window filter, C6 forward-seam).
   */
  async listRecentlyCitedFodderRefs(persistenceHours: number): Promise<ReadonlySet<string>> {
    const cutoff = new Date(Date.now() - persistenceHours * 60 * 60 * 1000);
    const rows = await this.db
      .select({ fodderRefs: newsBeat.fodder_refs })
      .from(newsBeat)
      .where(gt(newsBeat.created_at, cutoff));
    const cited = new Set<string>();
    for (const row of rows) {
      const refs = (row.fodderRefs ?? []) as FodderRefCitation[];
      for (const ref of refs) cited.add(fodderRefKey(ref.sourceKind, ref.refId));
    }
    return cited;
  }

  /** One digest beat insert (design §4.1 — `thread_id: null`, `template_id: null`, `frame: null`, D4). */
  async insertDigestBeat(input: NewDigestBeatInput): Promise<NewsBeatRow> {
    const rows = await this.db
      .insert(newsBeat)
      .values({
        game_day: input.gameDay,
        thread_id: null,
        template_id: null,
        outlet_key: input.outletKey,
        journalist_key: input.journalistKey,
        district_id: input.districtId,
        beat_category: input.beatCategory,
        frame: null,
        headline_i18n_key: input.headlineI18nKey,
        body_i18n_key: input.bodyI18nKey,
        params: input.params,
        source_attribution: input.sourceAttribution,
        fodder_refs: input.fodderRefs,
      })
      .returning();
    return rows[0]!;
  }

  // ───────────────────────────── C3 — phase 2/4d: news_thread CRUD ─────────────────────────────

  /** Step 1 of the (now test-only, ★ C3 fix — see file header) insert-then-augment 2-step — `payload`
   *  starts at the schema default `{}`. Retained for the falsifying test's own use: called ALONE (never
   *  followed by `updateThreadPayload`), it seeds the EXACT pre-fix poisoned-row shape (a committed
   *  `open` thread whose payload is `{}`) `advanceHindsightThread`'s defensive guard now has to survive. */
  async insertBareThread(input: NewBareThreadInput): Promise<NewsThreadRow> {
    const rows = await this.db
      .insert(newsThread)
      .values({
        template_id: input.templateId,
        journalist_key: input.journalistKey,
        district_id: input.districtId,
        opened_at_game_day: input.openedAtGameDay,
        source_fodder_ref: input.sourceFodderRef,
      })
      .returning();
    return rows[0]!;
  }

  /** Step 2 of the (test-only for hindsight, ★ C3 fix) insert-then-augment 2-step — overwrites `payload`
   *  wholesale. `composeRetrospectiveArc`'s production path no longer calls this directly
   *  (`insertHindsightThreadAtomic` folds the same UPDATE into its own transaction) — retained as a
   *  building block a test MAY use to hand-construct a fully-formed legacy row without going through the
   *  atomic path. ★ C4 — THIS method GAINS a genuine production caller: `BrennarDailyService.
   *  advanceThreeOutletStormThread`'s own daily salience-advance write (design §3.5.4 phase 2) — a
   *  single-row payload overwrite with no "read something back first" risk, so no dedicated atomic
   *  wrapper is warranted the way `three_outlet_storm`'s OWN open composition needed one. */
  async updateThreadPayload(threadId: string, payload: Readonly<Record<string, unknown>>): Promise<void> {
    await this.db.update(newsThread).set({ payload }).where(eq(newsThread.id, threadId));
  }

  /**
   * ★ C3 fix (review gate BLOCKING-1) — the ATOMIC replacement for the insert-then-augment 2-step above:
   * step 1 (bare insert), the caller-supplied `computePayload` (which performs
   * `NewsBeatGeneratorService.composeRetrospectiveArc`'s own indicator-pool read + the 2 seeded
   * per-thread draws — `news:{thread_id}:indicators` / `news:{thread_id}:schedule`, design §8, FIXED
   * order, UNCHANGED by this fix), and step 2 (payload update) all run inside ONE `db.transaction`.
   *
   * If `computePayload` throws — a transient connection drop on its own read, the E2E atomicity test's
   * forced throw, or anything else — Drizzle rolls the WHOLE transaction back: the bare-insert row is
   * NEVER committed without its fully-formed payload. This closes the crash window the reviewer found:
   * pre-fix, a throw between the 2 separate statements left a committed `open` thread with
   * `payload = {}` that `NewsFodderReader.scanResolutionsForHindsight`'s own `NOT EXISTS` (+ the mig-0130
   * `news_thread_hindsight_source_fodder_ref_unique` partial index) then excluded PERMANENTLY — no later
   * tick could ever retry that resolution. Post-fix, a throw here leaves ZERO rows for this
   * `source_fodder_ref` — the resolution stays scan-eligible and the NEXT tick opens a clean, complete
   * arc for it (design §8 "un tick mort ne bloque pas le lendemain").
   */
  async insertHindsightThreadAtomic(
    input: NewBareThreadInput,
    computePayload: (threadId: string) => Promise<Readonly<Record<string, unknown>>>,
  ): Promise<NewsThreadRow> {
    return this.db.transaction(async (tx) => {
      const bareRows = await tx
        .insert(newsThread)
        .values({
          template_id: input.templateId,
          journalist_key: input.journalistKey,
          district_id: input.districtId,
          opened_at_game_day: input.openedAtGameDay,
          source_fodder_ref: input.sourceFodderRef,
        })
        .returning();
      const bare = bareRows[0]!;
      const payload = await computePayload(bare.id);
      const updatedRows = await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, bare.id)).returning();
      return updatedRows[0]!;
    });
  }

  /**
   * ★ C4 — `three_outlet_storm`'s OWN atomic open: bare thread insert, the caller-supplied
   * `buildBeatsAndPayload` (which performs `NewsBeatGeneratorService.composeThreeOutletStormBeats`'s own
   * `news:{thread_id}:frame` seeded draw — the thread's `id` is DB-generated, so nothing can seed off it
   * before the bare insert returns, the SAME 2-step shape `insertHindsightThreadAtomic` above documents),
   * the 3 simultaneous beats, and the payload update — ALL inside ONE `db.transaction`. Built atomic FROM
   * THE START (proactively applying C3's own BLOCKING-1 lesson: a throw anywhere in `buildBeatsAndPayload`
   * — the frame draw, a beat insert, anything — rolls the WHOLE transaction back, so `three_outlet_storm`
   * can NEVER commit an open thread with fewer than its 3 beats, or a beat without its parent thread).
   */
  async insertThreeOutletStormThreadAtomic(
    input: NewBareThreadInput,
    buildBeatsAndPayload: (threadId: string) => Promise<{
      readonly payload: Readonly<Record<string, unknown>>;
      readonly beats: readonly Omit<NewTemplateBeatInput, 'threadId'>[];
    }>,
  ): Promise<NewsThreadRow> {
    return this.db.transaction(async (tx) => {
      const bareRows = await tx
        .insert(newsThread)
        .values({
          template_id: input.templateId,
          journalist_key: input.journalistKey,
          district_id: input.districtId,
          opened_at_game_day: input.openedAtGameDay,
          source_fodder_ref: input.sourceFodderRef,
        })
        .returning();
      const bare = bareRows[0]!;
      const { payload, beats } = await buildBeatsAndPayload(bare.id);
      for (const beat of beats) {
        await tx.insert(newsBeat).values({
          game_day: beat.gameDay,
          thread_id: bare.id,
          template_id: beat.templateId,
          outlet_key: beat.outletKey,
          journalist_key: beat.journalistKey,
          district_id: beat.districtId,
          beat_category: beat.beatCategory,
          frame: beat.frame,
          headline_i18n_key: beat.headlineI18nKey,
          body_i18n_key: beat.bodyI18nKey,
          params: beat.params,
          source_attribution: beat.sourceAttribution,
          fodder_refs: beat.fodderRefs,
        });
      }
      const updatedRows = await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, bare.id)).returning();
      return updatedRows[0]!;
    });
  }

  /**
   * ★ C4 — `folded_page`'s OWN atomic composition: the 2 covering digest-style beats + the 1 hollow beat,
   * ALL inside ONE `db.transaction` (design §3.5.5 "les 2 outlets couvrants produisent leurs beats digest
   * … LE beat folded_page est le beat en creux" — 3 rows that are one indivisible composition; a crash
   * partway through must never leave a hollow beat without its covering beats, or vice versa). No
   * "insert-then-augment" risk here (unlike hindsight/storm, nothing downstream needs to READ a
   * generated id back before finishing) — wrapped anyway, matching this file's OWN C4 discipline note
   * above (atomicity applied proactively, not only after a review finds the gap).
   */
  async insertFoldedPageBeatsAtomic(
    coveringBeats: readonly NewDigestBeatInput[],
    hollowBeat: NewTemplateBeatInput,
  ): Promise<{ coveringBeats: NewsBeatRow[]; hollowBeat: NewsBeatRow }> {
    return this.db.transaction(async (tx) => {
      const insertedCovering: NewsBeatRow[] = [];
      for (const beat of coveringBeats) {
        const rows = await tx
          .insert(newsBeat)
          .values({
            game_day: beat.gameDay,
            thread_id: null,
            template_id: null,
            outlet_key: beat.outletKey,
            journalist_key: beat.journalistKey,
            district_id: beat.districtId,
            beat_category: beat.beatCategory,
            frame: null,
            headline_i18n_key: beat.headlineI18nKey,
            body_i18n_key: beat.bodyI18nKey,
            params: beat.params,
            source_attribution: beat.sourceAttribution,
            fodder_refs: beat.fodderRefs,
          })
          .returning();
        insertedCovering.push(rows[0]!);
      }
      const hollowRows = await tx
        .insert(newsBeat)
        .values({
          game_day: hollowBeat.gameDay,
          thread_id: null,
          template_id: hollowBeat.templateId,
          outlet_key: hollowBeat.outletKey,
          journalist_key: hollowBeat.journalistKey,
          district_id: hollowBeat.districtId,
          beat_category: hollowBeat.beatCategory,
          frame: hollowBeat.frame,
          headline_i18n_key: hollowBeat.headlineI18nKey,
          body_i18n_key: hollowBeat.bodyI18nKey,
          params: hollowBeat.params,
          source_attribution: hollowBeat.sourceAttribution,
          fodder_refs: hollowBeat.fodderRefs,
        })
        .returning();
      return { coveringBeats: insertedCovering, hollowBeat: hollowRows[0]! };
    });
  }

  /**
   * ★ C5 — `cooper_affair`'s OWN atomic open: bare thread insert (`source_fodder_ref: NULL` — the
   * ambient-residue trigger cites no single fodder row, design §4.2), the caller-supplied
   * `buildBeatAndPayload` (which performs `NewsBeatGeneratorService.composeCooperAffairThread`'s own
   * `news:{thread_id}:frame` seeded draw — SAME 2-step shape `insertThreeOutletStormThreadAtomic`
   * documents), the ONE initial beat, and the payload update — ALL inside ONE `db.transaction`. Built
   * atomic FROM THE START (mirrors C4's own proactive-atomicity discipline).
   */
  async insertCooperAffairThreadAtomic(
    input: NewBareThreadInput,
    buildBeatAndPayload: (threadId: string) => Promise<{
      readonly payload: Readonly<Record<string, unknown>>;
      readonly beat: Omit<NewTemplateBeatInput, 'threadId'>;
    }>,
  ): Promise<NewsThreadRow> {
    return this.db.transaction(async (tx) => {
      const bareRows = await tx
        .insert(newsThread)
        .values({
          template_id: input.templateId,
          journalist_key: input.journalistKey,
          district_id: input.districtId,
          opened_at_game_day: input.openedAtGameDay,
          source_fodder_ref: input.sourceFodderRef,
        })
        .returning();
      const bare = bareRows[0]!;
      const { payload, beat } = await buildBeatAndPayload(bare.id);
      await tx.insert(newsBeat).values({
        game_day: beat.gameDay,
        thread_id: bare.id,
        template_id: beat.templateId,
        outlet_key: beat.outletKey,
        journalist_key: beat.journalistKey,
        district_id: beat.districtId,
        beat_category: beat.beatCategory,
        frame: beat.frame,
        headline_i18n_key: beat.headlineI18nKey,
        body_i18n_key: beat.bodyI18nKey,
        params: beat.params,
        source_attribution: beat.sourceAttribution,
        fodder_refs: beat.fodderRefs,
      });
      const updatedRows = await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, bare.id)).returning();
      return updatedRows[0]!;
    });
  }

  /**
   * ★ I-2 fix (review gate IMPORTANT-2, post-merge) — the ATOMIC replacement for `BrennarDailyService.
   * advanceCooperAffairThread`'s own per-call writes. Pre-fix, that method called `NewsBeatGeneratorService.
   * composeCooperReframeBeat` (which inserted its OWN reframe beat immediately, autocommit) INSIDE its
   * day-catch-up loop, THEN — AFTER the whole loop — wrote the cursor `payload` update (`advancedThroughGameDay`)
   * as a SEPARATE un-transactioned statement. A throw between the two (a transient connection drop, SIGTERM/
   * OOM) left a committed reframe beat with a STALE cursor: because the reframe roll is seeded
   * `news:{thread_id}:reframe:{day}` (design §8 — deterministic, not random), a re-run from the stale
   * cursor re-derives the IDENTICAL winning outcome for that SAME day and composes the SAME reframe beat
   * AGAIN — a genuine double-insert (unlike storm/hindsight's own single-write-per-call shape, this is the
   * SAME crash-window SHAPE C3's own BLOCKING-1 finding described, just milder — self-healing/non-bricking,
   * since the day-claim/existence-guard idiom elsewhere in this module never touches this path).
   *
   * Fix: EVERY reframe beat ONE call to `advanceCooperAffairThread` produces (0, 1, or more — one per
   * winning day in its catch-up range, already fully built by `NewsBeatGeneratorService.
   * composeCooperReframeBeat`, which no longer inserts anything itself — see that method's own doc
   * comment), THEN the cursor `payload` update, THEN (iff concluded) the terminal status/outcome write —
   * ALL run inside ONE `db.transaction` here. A throw ANYWHERE (a beat insert, the test-only forced fault
   * below, anything else) rolls the WHOLE transaction back: no beat is EVER committed without its cursor
   * advance, and vice versa. The re-run then restarts from the OLD (un-advanced) cursor, re-derives the
   * SAME seeded outcome for the SAME day(s) (seed strings/draw order UNCHANGED), and reproduces the EXACT
   * SAME beat(s) — never a duplicate (design §8 "phase 2 re-runnable … idempotent").
   *
   * @param forceThrowAfterReframeBeat TEST-ONLY (mirrors `insertHindsightThreadAtomic`'s own
   *   `forceThrowAfterInsert` fault-injection precedent, C3): when `true` AND at least 1 reframe beat was
   *   produced this call, throws immediately after the LAST reframe-beat insert — before the cursor
   *   `payload` update — to prove the WHOLE transaction rolls back. NEVER set outside the E2E atomicity
   *   test (`news-test.controller.ts`'s dedicated DEV-gated `advance-threads` probe) — defaults to `false`
   *   for every real caller.
   */
  async advanceCooperAffairThreadAtomic(
    threadId: string,
    reframeBeats: readonly Omit<NewTemplateBeatInput, 'threadId'>[],
    payload: Readonly<Record<string, unknown>>,
    concludeOutcome: string | null,
    forceThrowAfterReframeBeat = false,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const beat of reframeBeats) {
        await tx.insert(newsBeat).values({
          game_day: beat.gameDay,
          thread_id: threadId,
          template_id: beat.templateId,
          outlet_key: beat.outletKey,
          journalist_key: beat.journalistKey,
          district_id: beat.districtId,
          beat_category: beat.beatCategory,
          frame: beat.frame,
          headline_i18n_key: beat.headlineI18nKey,
          body_i18n_key: beat.bodyI18nKey,
          params: beat.params,
          source_attribution: beat.sourceAttribution,
          fodder_refs: beat.fodderRefs,
        });
      }
      if (forceThrowAfterReframeBeat && reframeBeats.length > 0) {
        throw new Error('[I-2 test] forced rollback after reframe beat insert, before cursor update (atomicity proof)');
      }
      await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, threadId));
      if (concludeOutcome) {
        await tx.update(newsThread).set({ status: 'concluded', outcome: concludeOutcome }).where(eq(newsThread.id, threadId));
      }
    });
  }

  /**
   * ★ C5 — `sourceless_beat`'s OWN atomic open. SAME 2-step shape as `insertCooperAffairThreadAtomic`
   * above, PLUS the ★ "forbidden to chain" shape guard (`assertSourcelessAttributionShape`,
   * `sourceless-beat.ts`, design §3.5.2): called on `beat.sourceAttribution` BEFORE the `tx.insert(
   * newsBeat, …)` executes — a poisoned attribution (carrying `outletKey`/`journalistKey`/a non-null
   * `hedgeLevel`) throws INSIDE the transaction, rolling back the bare thread insert too (nothing is
   * EVER committed with a chain-violating sourceless attribution — the "unit-level repo guard" the E2E
   * floor's chain-refusal proof targets, exercised via a DEV-only test probe,
   * `news-test.controller.ts`).
   */
  async insertSourcelessThreadAtomic(
    input: NewBareThreadInput,
    buildBeatAndPayload: (threadId: string) => Promise<{
      readonly payload: Readonly<Record<string, unknown>>;
      readonly beat: Omit<NewTemplateBeatInput, 'threadId'>;
    }>,
  ): Promise<NewsThreadRow> {
    return this.db.transaction(async (tx) => {
      const bareRows = await tx
        .insert(newsThread)
        .values({
          template_id: input.templateId,
          journalist_key: input.journalistKey,
          district_id: input.districtId,
          opened_at_game_day: input.openedAtGameDay,
          source_fodder_ref: input.sourceFodderRef,
        })
        .returning();
      const bare = bareRows[0]!;
      const { payload, beat } = await buildBeatAndPayload(bare.id);
      assertSourcelessAttributionShape(beat.sourceAttribution); // ★ THROWS here rolls back the WHOLE transaction (bare insert included).
      await tx.insert(newsBeat).values({
        game_day: beat.gameDay,
        thread_id: bare.id,
        template_id: beat.templateId,
        outlet_key: beat.outletKey,
        journalist_key: beat.journalistKey,
        district_id: beat.districtId,
        beat_category: beat.beatCategory,
        frame: beat.frame,
        headline_i18n_key: beat.headlineI18nKey,
        body_i18n_key: beat.bodyI18nKey,
        params: beat.params,
        source_attribution: beat.sourceAttribution,
        fodder_refs: beat.fodderRefs,
      });
      const updatedRows = await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, bare.id)).returning();
      return updatedRows[0]!;
    });
  }

  /**
   * ★ C5 — the displacement mechanic (design §3.5.2 "seule la displacement clôt : un AUTRE thread
   * KEYSTONE ouvert sur le même district → concluded/displaced"). ★ Coder judgment call (documented):
   * ASYMMETRIC — only `sourceless_beat` threads are ever displaced. §3.5.1's own closed `outcome` union
   * for `cooper_affair` never names `displaced` (only `saturated`/`half_life_expired`); `sourceless_beat`
   * is the ONLY template whose §3.5.2 lifecycle names it. The only REALIZABLE "2nd keystone on the same
   * district" collision, given each keystone's own GLOBAL (city-wide, not per-district) duplicate-
   * inhibition, is a NEW `cooper_affair` opening while an OLDER `sourceless_beat` is still open on that
   * SAME district (2 concurrent `sourceless_beat` threads can never coexist to begin with) — called ONLY
   * from `NewsBeatGeneratorService.composeCooperAffairThread`'s own open path, never the reverse.
   */
  async displaceOpenSourcelessThreadsInDistrict(districtId: number): Promise<number> {
    const rows = await this.db
      .update(newsThread)
      .set({ status: 'concluded', outcome: 'displaced' })
      .where(and(eq(newsThread.template_id, 'sourceless_beat'), eq(newsThread.status, 'open'), eq(newsThread.district_id, districtId)))
      .returning({ id: newsThread.id });
    return rows.length;
  }

  /**
   * ★ C5 — the sourceless readiness signal's OWN ledger read (decisions D7: `journalistFramingReadiness
   * = min(1, days_since_last_byline / journalist_idle_readiness_days)` — "dérivation pure du ledger
   * news_beat"). ONE batched query for ALL 6 journalists (F4 — never 1 query per journalist): the LAST
   * `game_day` each journalist was ever credited a byline on, across EVERY beat (digest, hindsight,
   * wire_day never sets a journalist, storm, folded_page, cooper_affair — any). A journalist absent from
   * the returned map has NEVER published (`sourceless-beat.ts`'s `computeJournalistFramingReadiness` own
   * doc comment explains why `undefined` correctly maps to `Number.POSITIVE_INFINITY` idle days at the
   * call site, `brennar-daily.service.ts`).
   */
  async lastBylineGameDayByJournalist(): Promise<ReadonlyMap<string, number>> {
    const rows = await this.db
      .select({ journalistKey: newsBeat.journalist_key, lastGameDay: sql<number>`max(${newsBeat.game_day})` })
      .from(newsBeat)
      .where(isNotNull(newsBeat.journalist_key))
      .groupBy(newsBeat.journalist_key);
    const out = new Map<string, number>();
    for (const row of rows) {
      if (row.journalistKey) out.set(row.journalistKey, Number(row.lastGameDay));
    }
    return out;
  }

  /**
   * ★ C5 — the sourceless city-mood signal's OWN cross-player cohesion read (decisions D7 (a): "AVG
   * cross-player districtCohesion"). Cross-player AVG over the ENTIRE `district_cohesion` table (every
   * player, every district — "city mood" is citywide, not per-district; the CLAIMED district is drawn
   * seeded only at COMPOSITION time, design §3.5.2, AFTER this gate) — mirrors `ConstantHumRepository.
   * aggregateAvgHeatByDistrict`'s own "own query against a shared upstream table" precedent, applied to
   * a city-WIDE scalar instead of a per-district vector. `null` iff the table is genuinely empty (no
   * player has ever been seeded a `district_cohesion` row yet) — the caller treats this as "no signal",
   * NEVER a fabricated mood value (design §0 anti-fabrication).
   */
  async avgDistrictCohesionCrossPlayer(): Promise<number | null> {
    const rows = await this.db.select({ avgCohesion: sql<number | null>`avg(${districtCohesion.cohesion})` }).from(districtCohesion);
    const value = rows[0]?.avgCohesion;
    return value === null || value === undefined ? null : Number(value);
  }

  /**
   * ★ C5 — the sourceless city-mood signal's OWN recent-density read (decisions D7 (b): "densité de
   * beats récente (news_daily_run.beats_generated_count fenêtre 7j vs baseline)"). SAME shape as
   * `getRecentFodderCountTotals` (C3) — the last `limit` COMPLETED runs strictly BEFORE `beforeGameDay` —
   * reading a DIFFERENT column (`beats_generated_count` instead of `fodder_counts`). Deliberately NOT
   * parameterized into one shared executor (mirrors THIS FILE'S OWN documented convention, file header:
   * "a small, deliberate duplication, not an oversight").
   */
  async recentBeatsGeneratedCounts(beforeGameDay: number, limit: number): Promise<number[]> {
    const rows = await this.db
      .select({ beatsGeneratedCount: newsDailyRun.beats_generated_count })
      .from(newsDailyRun)
      .where(lt(newsDailyRun.game_day, beforeGameDay))
      .orderBy(desc(newsDailyRun.game_day))
      .limit(limit);
    return rows.map((row) => row.beatsGeneratedCount);
  }

  /**
   * ★ C5 — the "framing track record" query-derived read (design §3.6 "l'historique de ses threads",
   * Scénario 2 "queryable par `<NewsBeatsDashboard>`"). Every `cooper_affair`/`sourceless_beat` thread
   * (or ANY template — `journalistKey` is the sole filter, matching the design's own "track record = the
   * journalist's thread history" framing, not template-scoped) a journalist has ever authored, ordered
   * `opened_at_game_day` ascending. Zero new table — entirely query-derived over `news_thread` (D3 "zéro
   * table journaliste, zéro scalaire stocké").
   */
  async findThreadsByJournalist(journalistKey: string): Promise<NewsThreadRow[]> {
    return this.db
      .select()
      .from(newsThread)
      .where(eq(newsThread.journalist_key, journalistKey))
      .orderBy(newsThread.opened_at_game_day);
  }

  /**
   * ★ C5 — cooper_affair's OWN `fodder_refs` citation source (design §4.1 "[] LÉGAL UNIQUEMENT pour
   * sourceless_beat" — every OTHER template must cite ≥1 real row). Cooper's trigger is genuinely
   * aggregate/ambient (heat vs hum baseline, no single discrete fodder row, design §3.5.1) — ★ coder
   * judgment call (documented, flagged for reviewer attention): the SAME-day, SAME-district
   * `ambient_micro_event` rows are cited as the observable texture behind the residue (a REAL,
   * join-falsifiable set — mirrors hindsight's OWN "cite real micro-events" precedent, D8) rather than
   * fabricating a citation. When NONE occurred that day in that district (heat can persist from EARLIER
   * ticks' lingering influence with zero same-day ambient texture) this legitimately returns `[]` — a
   * documented, ARGUED divergence from the schema comment's literal "ONLY sourceless" wording, not a
   * silent gap (flagged to the reviewer in the C5 report).
   */
  async ambientMicroEventRefsForDistrictOnDay(districtId: number, gameDay: number): Promise<FodderRefCitation[]> {
    const rows = await this.db
      .select({ id: ambientMicroEvent.id })
      .from(ambientMicroEvent)
      .where(and(eq(ambientMicroEvent.district_id, districtId), eq(ambientMicroEvent.game_day, gameDay)))
      .orderBy(ambientMicroEvent.id);
    return rows.map((row) => ({ sourceKind: 'ambient_micro' as const, refId: row.id }));
  }

  /** Terminal write — `status: 'concluded'` + the closed-TS-union `outcome` (design §3.4). */
  async concludeThread(threadId: string, outcome: string): Promise<void> {
    await this.db.update(newsThread).set({ status: 'concluded', outcome }).where(eq(newsThread.id, threadId));
  }

  /** Every `open` thread, any template — the phase-2 generic advance's own scan (design §3.2 phase 2).
   *  `ORDER BY id` — deterministic per-run iteration (mirrors `findResolvedHailstormParentsNeedingSuccessor`'s
   *  own convention, 04g-B). */
  async findOpenThreads(): Promise<NewsThreadRow[]> {
    return this.db.select().from(newsThread).where(eq(newsThread.status, 'open')).orderBy(newsThread.id);
  }

  /** ★ C4 — the duplicate-inhibition guard (design §3.2 phase 4 preamble: "skip si un thread OPEN du
   *  même template existe") `three_outlet_storm`'s trigger reads BEFORE composing a new one — mirrors the
   *  matrice :254 "un Cooper Affair en feed inhibe un second Cooper" invariant C5's own keystones will
   *  wire for real; storm needs this NOW (C4) since only ONE contest should race at a time. */
  async hasOpenThreadOfTemplate(templateId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: newsThread.id })
      .from(newsThread)
      .where(and(eq(newsThread.template_id, templateId), eq(newsThread.status, 'open')))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * ★ C5 — the OTHER half of the phase-4 duplicate-inhibition gate (design §3.2 phase 4 preamble: "…OU un
   * beat du même template est encore dans la fenêtre de persistence"): does ANY `news_beat` row of
   * `templateId` have `created_at` within `persistenceHours` REAL-clock — REGARDLESS of whether its
   * parent thread has since CONCLUDED (a keystone that already saturated/half-life-expired still
   * inhibits a fresh one while its OWN beats are still on-feed, "un Cooper Affair en feed inhibe un
   * second Cooper jusqu'à scroll-off", matrice :254 — "en feed" is the persistence window, not thread
   * status). `cooper_affair`'s/`sourceless_beat`'s OWN triggers call THIS alongside `hasOpenThreadOfTemplate`
   * (`isKeystoneInhibited`, `brennar-daily.service.ts`). Cutoff computed the SAME JS-`Date.now()`-minus-
   * hours way `listRecentlyCitedFodderRefs` already does (never a DB-side `now()`, consistent within this
   * file).
   */
  async hasRecentBeatOfTemplate(templateId: string, persistenceHours: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - persistenceHours * 60 * 60 * 1000);
    const rows = await this.db
      .select({ id: newsBeat.id })
      .from(newsBeat)
      .where(and(eq(newsBeat.template_id, templateId), gt(newsBeat.created_at, cutoff)))
      .limit(1);
    return rows.length > 0;
  }

  /** ★ C4 — the recurrence signal `three_outlet_storm`'s daily salience advance reads (design §3.5.4
   *  "(b) recurrence de fodder même-district ce jour … le contest reste couplé au réel"): ONE batched
   *  query returning the SET of `game_day`s (within `[fromDay, toDay]`) that have ≥1 `ambient_micro_event`
   *  row in `districtId` — F4-friendly (1 query per advance call, however many days it catches up in one
   *  pass, never 1-query-per-day). Ambient (S3, the densest real per-day/per-district signal this module
   *  reads) is the chosen recurrence source — a coder judgment call, documented on the pure formula
   *  itself (`three-outlet-storm.ts`'s own header). */
  async ambientMicroEventDaysWithActivityInDistrict(districtId: number, fromDay: number, toDay: number): Promise<ReadonlySet<number>> {
    if (fromDay > toDay) return new Set();
    const rows = await this.db
      .selectDistinct({ gameDay: ambientMicroEvent.game_day })
      .from(ambientMicroEvent)
      .where(and(eq(ambientMicroEvent.district_id, districtId), gte(ambientMicroEvent.game_day, fromDay), lte(ambientMicroEvent.game_day, toDay)));
    return new Set(rows.map((r) => r.gameDay));
  }

  /** The ★ existence guard (design §8 "phase 2 re-runnable … idempotent par guard d'existence"): how many
   *  beats THIS thread has published so far — the phase-2 advance's own due-publication cursor (index
   *  `alreadyPublished` into the schedule array is always the NEXT one to consider). */
  async countBeatsForThread(threadId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(newsBeat)
      .where(eq(newsBeat.thread_id, threadId));
    return rows[0]?.n ?? 0;
  }

  /** The non-digest beat insert (design §4.1) — `thread_id`/`template_id`/`frame` are writable (still
   *  legally NULL per-field, see `NewTemplateBeatInput`'s own doc comment). */
  async insertTemplateBeat(input: NewTemplateBeatInput): Promise<NewsBeatRow> {
    const rows = await this.db
      .insert(newsBeat)
      .values({
        game_day: input.gameDay,
        thread_id: input.threadId,
        template_id: input.templateId,
        outlet_key: input.outletKey,
        journalist_key: input.journalistKey,
        district_id: input.districtId,
        beat_category: input.beatCategory,
        frame: input.frame,
        headline_i18n_key: input.headlineI18nKey,
        body_i18n_key: input.bodyI18nKey,
        params: input.params,
        source_attribution: input.sourceAttribution,
        fodder_refs: input.fodderRefs,
      })
      .returning();
    return rows[0]!;
  }

  // ───────────────────────────── C3 — phase 3: wire-day low-production history ─────────────────────────

  /**
   * The wire-day trigger's OWN low-production signal (design §3.5.7): the total fodder count (summed
   * across all `FodderSourceKind`s) of each of the last `limit` COMPLETED `news_daily_run` rows strictly
   * BEFORE `beforeGameDay` (never including the CURRENT, not-yet-finalized run — `phase 6` writes
   * `fodder_counts` only at the END of a run). `ORDER BY game_day DESC LIMIT limit` — the most recent
   * `limit` runs, oldest-history-that-doesn't-exist-yet naturally yields fewer than `limit` entries early
   * in a campaign (never fabricated — `wire-day.ts`'s own `isLowProduction` treats an empty result as "not
   * low production", never a false positive from missing data).
   */
  async getRecentFodderCountTotals(beforeGameDay: number, limit: number): Promise<number[]> {
    const rows = await this.db
      .select({ fodderCounts: newsDailyRun.fodder_counts })
      .from(newsDailyRun)
      .where(lt(newsDailyRun.game_day, beforeGameDay))
      .orderBy(desc(newsDailyRun.game_day))
      .limit(limit);
    return rows.map((row) => {
      const counts = (row.fodderCounts ?? {}) as Record<string, number>;
      return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
    });
  }

  // ───────────────────────────── phase 6: counters ─────────────────────────────

  /** Phase 6 counters (design §4.3 — mirrors `random-world-event.repository.ts`'s own
   *  `finalizeDailyRun` UPDATE shape). */
  async finalizeDailyRun(gameDay: number, counters: FinalizeDailyRunCounters): Promise<void> {
    await this.db
      .update(newsDailyRun)
      .set({
        beats_generated_count: counters.beatsGeneratedCount,
        template_counts: counters.templateCounts,
        wire_day: counters.wireDay,
        fodder_counts: counters.fodderCounts,
        journalist_interest: counters.journalistInterest,
      })
      .where(eq(newsDailyRun.game_day, gameDay));
  }

  // ───────────────────────────── C6 — phase 4d: slow_page interest signal (D9) ───────────────────────

  /**
   * ★ C6 — the interest-counter's OWN "yesterday" read (design §3.5.6/D9, mirrors
   * `getRecentFodderCountTotals`'s exact shape): the `journalist_interest` jsonb of the MOST RECENT
   * `news_daily_run` row strictly BEFORE `beforeGameDay`. `{}` (never fabricated) when no prior run
   * exists — a fresh campaign / a district never yet observed starts at interest `0` (the caller's own
   * `?? 0` fallback per-district, mirrors `applyQuorumAdoptionAndFlips`'s own `prevAdoptionRaw[...] ?? 0`
   * idiom, 04g-B).
   */
  async readPreviousJournalistInterest(beforeGameDay: number): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ journalistInterest: newsDailyRun.journalist_interest })
      .from(newsDailyRun)
      .where(lt(newsDailyRun.game_day, beforeGameDay))
      .orderBy(desc(newsDailyRun.game_day))
      .limit(1);
    return (rows[0]?.journalistInterest ?? {}) as Record<string, number>;
  }

  // ───────────────────────────── C6 — slow_page atomic open/advance ─────────────────────────────────

  /**
   * ★ C6 — `slow_page`'s OWN atomic open: bare thread insert (`source_fodder_ref: NULL` — the ambient-
   * interest trigger cites no single fodder row, mirrors `cooper_affair`'s OWN NULL, design §4.2), the
   * caller-supplied `computePayload` (which performs `NewsBeatGeneratorService.composeSlowPageSeries`'s
   * own `news:{thread_id}:installments` seeded draw — the thread's `id` is DB-generated, so nothing can
   * seed off it before the bare insert returns, the SAME 2-step shape `insertHindsightThreadAtomic`
   * documents), and the payload update — ALL inside ONE `db.transaction`. UNLIKE cooper/storm's own
   * atomic opens, this one inserts NO beat (mirrors `insertHindsightThreadAtomic` exactly in THIS
   * respect — slow_page's first installment is only ever due 7 game-days later via phase 2, design
   * §3.5.6). Built atomic FROM THE START (mirrors C4/C5's own proactive-atomicity discipline).
   */
  async insertSlowPageThreadAtomic(
    input: NewBareThreadInput,
    computePayload: (threadId: string) => Promise<Readonly<Record<string, unknown>>>,
  ): Promise<NewsThreadRow> {
    return this.db.transaction(async (tx) => {
      const bareRows = await tx
        .insert(newsThread)
        .values({
          template_id: input.templateId,
          journalist_key: input.journalistKey,
          district_id: input.districtId,
          opened_at_game_day: input.openedAtGameDay,
          source_fodder_ref: input.sourceFodderRef,
        })
        .returning();
      const bare = bareRows[0]!;
      const payload = await computePayload(bare.id);
      const updatedRows = await tx.update(newsThread).set({ payload }).where(eq(newsThread.id, bare.id)).returning();
      return updatedRows[0]!;
    });
  }

  /**
   * ★ C6 — `slow_page`'s OWN atomic ADVANCE: the 0+ installment beats `BrennarDailyService.
   * advanceSlowPageThread`'s day-loop built (never inserted directly — mirrors `composeCooperReframeBeat`'s
   * own "builds, does not insert" C5 I-2 shape) + the terminal conclude (`series_completed`, on
   * installment exhaustion OR saturation, design §3.5.6), ALL inside ONE `db.transaction`. UNLIKE
   * cooper's own atomic advance, slow_page's payload (`{installmentsTotal}`) never CHANGES after open —
   * so there is no cursor `payload` UPDATE to fold in here; the existence guard
   * (`NewsBeatRepository.countBeatsForThread`, already generic) is derived FRESH from the DB every call,
   * making a crash between 2 installment-beat inserts self-healing on its own (mirrors
   * `advanceHindsightThread`'s own count-derived-cursor shape, NOT cooper's stale-persisted-cursor
   * shape). This method is still built ATOMIC proactively — matching the standard this branch now holds
   * (C4/C5's own "wrap every multi-write, even where the specific crash-window risk is milder or
   * absent" discipline, e.g. `insertFoldedPageBeatsAtomic`'s own header note) — a throw between 2
   * installment-beat inserts in the SAME call must never leave a partially-published day AND a stray
   * terminal conclude uncommitted together.
   *
   * @param forceThrowAfterInstallmentBeat TEST-ONLY (mirrors `advanceCooperAffairThreadAtomic`'s own
   *   `forceThrowAfterReframeBeat` fault-injection precedent): when `true` AND at least 1 installment beat
   *   was produced this call, throws immediately after the LAST installment-beat insert — before the
   *   terminal conclude write — to prove the WHOLE transaction rolls back. NEVER set outside the E2E
   *   atomicity test (`news-test.controller.ts`'s dedicated DEV-gated probe) — defaults to `false` for
   *   every real caller.
   */
  async advanceSlowPageThreadAtomic(
    threadId: string,
    installmentBeats: readonly Omit<NewTemplateBeatInput, 'threadId'>[],
    concludeOutcome: string | null,
    forceThrowAfterInstallmentBeat = false,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const beat of installmentBeats) {
        await tx.insert(newsBeat).values({
          game_day: beat.gameDay,
          thread_id: threadId,
          template_id: beat.templateId,
          outlet_key: beat.outletKey,
          journalist_key: beat.journalistKey,
          district_id: beat.districtId,
          beat_category: beat.beatCategory,
          frame: beat.frame,
          headline_i18n_key: beat.headlineI18nKey,
          body_i18n_key: beat.bodyI18nKey,
          params: beat.params,
          source_attribution: beat.sourceAttribution,
          fodder_refs: beat.fodderRefs,
        });
      }
      if (forceThrowAfterInstallmentBeat && installmentBeats.length > 0) {
        throw new Error('[C6 test] forced rollback after installment beat insert, before terminal conclude (atomicity proof)');
      }
      if (concludeOutcome) {
        await tx.update(newsThread).set({ status: 'concluded', outcome: concludeOutcome }).where(eq(newsThread.id, threadId));
      }
    });
  }

  // ───────────────────────────── C6 — player feed / detail (design §6.1, P5/R2.2) ────────────────────

  /**
   * ★ C6 — `GET /v1/news/feed`'s OWN read (design §6.1/decisions D5): beats within the REAL-clock
   * persistence window (`created_at > now() − persistenceHours` — the SAME cutoff shape
   * `listRecentlyCitedFodderRefs`/`hasRecentBeatOfTemplate` already establish, D5 "le filtre EST la
   * persistence"), optionally narrowed to ONE `beat_category`, newest-first, keyset-paginated (`cursor`
   * = the last-returned row's OWN `(created_at, id)` tuple — stable regardless of concurrent inserts,
   * NEVER an offset). Fetches `limit + 1` rows to detect `hasMore` without a 2nd COUNT query (F4).
   */
  async listFeedBeats(
    persistenceHours: number,
    limit: number,
    category?: NewsBeatCategoryValue,
    cursor?: { createdAt: Date; id: string },
  ): Promise<{ rows: NewsBeatRow[]; hasMore: boolean }> {
    const windowCutoff = new Date(Date.now() - persistenceHours * 60 * 60 * 1000);
    const conditions = [gt(newsBeat.created_at, windowCutoff)];
    if (category) conditions.push(eq(newsBeat.beat_category, category));
    if (cursor) {
      conditions.push(
        or(
          lt(newsBeat.created_at, cursor.createdAt),
          and(eq(newsBeat.created_at, cursor.createdAt), lt(newsBeat.id, cursor.id)),
        )!,
      );
    }
    const rows = await this.db
      .select()
      .from(newsBeat)
      .where(and(...conditions))
      .orderBy(desc(newsBeat.created_at), desc(newsBeat.id))
      .limit(limit + 1);
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  /** ★ C6 — `GET /v1/news/beats/:id`'s OWN read: a single beat by id, NO persistence-window filter (the
   *  detail view is a direct id lookup — rows are NEVER deleted, design D5 "les rows restent"; a beat
   *  that has scrolled off the LIST no longer appears in `listFeedBeats` but a client that already has
   *  its id — e.g. from an earlier feed page — can still resolve its detail). `undefined` if unknown. */
  async getBeatById(id: string): Promise<NewsBeatRow | undefined> {
    const rows = await this.db.select().from(newsBeat).where(eq(newsBeat.id, id)).limit(1);
    return rows[0];
  }

  // ───────────────────────────── C7 — BO reads (design §6.2, P5 INVERSION: ops sees RAW rows) ──────────

  /** ★ C7 — `POST force-generate`'s own "REAL watermark, never client-supplied" read (mirrors
   *  `RandomWorldEventRepository.readLatestDailyRun`'s IDENTICAL shape/reasoning, design §6.2): the most
   *  recent claimed `news_daily_run.game_day`. `undefined` before the very first tick has ever claimed a
   *  day (a boot-time edge case — the caller falls back to `0`, same as the random-world precedent). */
  async readLatestDailyRun(): Promise<NewsDailyRunRow | undefined> {
    const rows = await this.db.select().from(newsDailyRun).orderBy(desc(newsDailyRun.game_day)).limit(1);
    return rows[0];
  }

  /** ★ C7 — `GET /v1/admin/news-beats/daily-runs?fromGameDay=` + `GET .../template-usage?fromGameDay=`'s
   *  SHARED data source (design §6.2 "claims + fodder_counts + wire days" / "aggregate template_counts"):
   *  every `news_daily_run` row with `game_day >= fromGameDay` (default 0 — every claimed day),
   *  ascending, capped at `limit` — mirrors `RandomWorldEventRepository.listDailyRuns`'s IDENTICAL shape. */
  async listDailyRuns(fromGameDay: number, limit: number): Promise<NewsDailyRunRow[]> {
    return this.db
      .select()
      .from(newsDailyRun)
      .where(gte(newsDailyRun.game_day, fromGameDay))
      .orderBy(newsDailyRun.game_day)
      .limit(limit);
  }

  /**
   * ★ C7 — `GET /v1/admin/news-beats/active`'s own read (design §6.2 "beats en fenêtre + raw"): every
   * `news_beat` row within the REAL-clock persistence window (the SAME `created_at` cutoff shape
   * `listFeedBeats` uses, D5), newest-first, RAW (no i18n/band projection — P5 BO INVERSION, the ops
   * surface sees the full row: `fodder_refs`, `source_attribution`, `frame`, everything). Capped at
   * `limit` (F4 — BO listing caps, mirrors `RandomWorldAdminController`'s own `CASCADES_LIST_LIMIT` idiom
   * at the controller layer).
   */
  async listActiveBeatsRaw(persistenceHours: number, limit: number): Promise<NewsBeatRow[]> {
    const windowCutoff = new Date(Date.now() - persistenceHours * 60 * 60 * 1000);
    return this.db
      .select()
      .from(newsBeat)
      .where(gt(newsBeat.created_at, windowCutoff))
      .orderBy(desc(newsBeat.created_at), desc(newsBeat.id))
      .limit(limit);
  }

  /** ★ C7 — the "threads liés" half of `GET /v1/admin/news-beats/active` (design §6.2): every
   *  `news_thread` row whose id is in the given set (the DISTINCT non-null `thread_id`s the active-beats
   *  read above just returned) — `ORDER BY id` for stable output, mirrors `findOpenThreads`'s own
   *  convention. Empty input → empty output (never queries with an empty `IN ()`). */
  async listThreadsByIds(ids: readonly string[]): Promise<NewsThreadRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(newsThread).where(inArray(newsThread.id, [...ids])).orderBy(newsThread.id);
  }

  /** ★ C7 — `GET /v1/admin/news-beats/threads?status=`'s own read (design §6.2 "threads + payloads raw —
   *  le reframe-resistance accumulator … visible enough, côté ops"): every `news_thread` row, optionally
   *  narrowed to ONE `status` ('open'|'concluded'), newest-first, capped at `limit`. An absent/invalid
   *  `status` is simply NOT filtered (mirrors `NewsProjectionService`'s own "never throws on a bad query
   *  param" posture) — RAW `payload` (salience/reframe_resistance/schedules), never band-projected. */
  async listThreadsByStatus(status: 'open' | 'concluded' | undefined, limit: number): Promise<NewsThreadRow[]> {
    const query = this.db.select().from(newsThread);
    const rows = status
      ? await query.where(eq(newsThread.status, status)).orderBy(desc(newsThread.created_at)).limit(limit)
      : await query.orderBy(desc(newsThread.created_at)).limit(limit);
    return rows;
  }

  /** ★ C7 — `POST force-generate`'s own "prove the SAME shape as the tick" read (design §6.2 anti-fig-
   *  leaf both-ways): every `news_beat` row for `threadId`, ascending `game_day` (mirrors
   *  `countBeatsForThread`'s own `thread_id` predicate, but returning full rows instead of a count) — the
   *  force-generate response hands these back so the E2E floor can structurally compare them against a
   *  real tick's own output shape. */
  async listBeatsByThreadId(threadId: string): Promise<NewsBeatRow[]> {
    return this.db.select().from(newsBeat).where(eq(newsBeat.thread_id, threadId)).orderBy(newsBeat.game_day);
  }
}

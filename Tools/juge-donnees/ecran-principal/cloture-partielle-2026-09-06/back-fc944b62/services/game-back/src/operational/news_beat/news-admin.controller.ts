// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C7 (news-admin.controller.ts —
//             the 5 BO endpoints)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §6.2 (BO surfaces)
//             Pattern: services/game-back/src/operational/random_world/random-world-admin.controller.ts
//             (the SAME `requireStaffRole` role-split GET/POST shape, F3-deferred marker, real-watermark
//             gameDay — never client-supplied — AND the restrictive-forceable-set 422 posture) +
//             services/game-back/src/operational/ambient/ambient-admin.controller.ts (raw
//             ops-diagnostic payloads, P5 BO inversion posture).
//             — 04g-C C7 — 2026-07-16
//
// `NewsAdminController` — 5 ops-diagnostic/action endpoints for the NEWS-BEAT runtime (G23, role `gm`
// (design's own "ops") for the 4 GETs, role `admin` for the 1 POST):
//
//   GET  /v1/admin/news-beats/active                — role gm    — beats in-window + RAW + linked threads
//   GET  /v1/admin/news-beats/template-usage         — role gm    — aggregate template_counts (per-run)
//   GET  /v1/admin/news-beats/threads?status=        — role gm    — threads + RAW payloads
//   GET  /v1/admin/news-beats/daily-runs?fromGameDay= — role gm   — claims + fodder_counts + wire days
//   POST /v1/admin/news-beats/force-generate          — role admin — SAME code-path as the tick, 422 registry-only
//
// P5 BO INVERSION (R2.2 does NOT apply here): every GET below returns RAW persisted rows — full jsonb
// `source_attribution`/`fodder_refs`, raw `frame`, raw `payload` (salience/reframe_resistance/schedules —
// the "reframe-resistance accumulator … visible enough" of the design's own Challenge citation, §6.2) —
// an ops-diagnostic surface never forwarded to a player (the player surface is `NewsProjectionService`/
// `NewsController`, i18n/band-projected, §6.1). Mirrors `RandomWorldAdminController`'s own "ops sees raw,
// player never does" posture.
//
// D2 (registry-only refusal) + the FORCEABLE-set restriction (see `NewsBeatGeneratorService.forceGenerate`'s
// own doc comment for the full per-template reasoning): `force-generate` validates `templateId` against
// the SAME 12-entry static registry every other caller routes through (`NEWS_BEAT_TEMPLATE_REGISTRY`)
// BEFORE ever touching the generator — an unknown id, a `registry_only` id, or a `live` id outside the
// 1-template forceable set (`three_outlet_storm`) is REJECTED 422 with an explicit reason, never a silent
// no-op or a fabricated beat. A request that clears all 3 checks resolves the REAL upstream fodder row
// named by `fodderRef` (`NewsFodderReader.readOneBySourceKindAndRefId` — 404 if it doesn't exist, never a
// fabricated item) and calls `NewsBeatGeneratorService.forceGenerate` — which dispatches to the EXACT same
// private composition method (`composeThreeOutletStormBeats`) the real NIGHTLY/30 tick's own phase-4c
// trigger calls — never a direct `repo.insert*` from this controller (anti-fig-leaf: the thread AND its 3
// beats exist, identical structural shape to the tick's own C4 flow).
//
// F3 two-person-rule: DEFERRED (TD-107 JOINT — same precedent as every other `force-*`/`tunables/*` admin
// action in this codebase). `force-generate`'s response carries `f3_deferred: true`. `PUT
// /admin/tunables/news_beats` (design §6.2 canon :97) is NOT shipped — same TD-107 residual, never
// duplicated (design §11.5).
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token server-side
// (`auth/staff-role.guard.ts`) — a player token or a `gm` token on the `admin`-only force-generate route
// → 403 (AUTHZ_PERMISSION_DENIED); no token → 401.
//
// NOT test-gated — real production BO routes, always registered (mirrors `RandomWorldAdminController`'s
// own "NOT conditional on NODE_ENV" posture).

import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { ApiError } from '../../protocol/api-error';
import type { NewsBeatRow, NewsDailyRunRow, NewsThreadRow } from '../../db/schema/news_beat';
import { NEWS_BEAT_TEMPLATE_REGISTRY } from './news-beat-template-registry';
import { NewsBeatGeneratorService, isForceableNewsBeatTemplateId } from './news-beat-generator.service';
import { NewsBeatRepository } from './news-beat.repository';
import { NewsFodderReader } from './news-fodder-reader.service';
import { newsBeatTunables } from './news-beat.tunables';
import type { FodderSourceKind } from './news-beat.types';

/** BO diagnostic listing caps (query params NEVER unbounded — mirrors `RandomWorldAdminController`'s own
 *  `CASCADES_LIST_LIMIT`/`DAILY_RUNS_LIST_LIMIT` idiom). */
const ACTIVE_BEATS_LIST_LIMIT = 200;
const THREADS_LIST_LIMIT = 200;
const DAILY_RUNS_LIST_LIMIT = 200;

const VALID_FODDER_SOURCE_KINDS: ReadonlySet<string> = new Set(['random_world', 'political', 'live_ops', 'ambient_micro']);

function isValidFodderSourceKind(value: unknown): value is FodderSourceKind {
  return typeof value === 'string' && VALID_FODDER_SOURCE_KINDS.has(value);
}

function parseFromGameDay(raw: string | undefined): number {
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface ForceGenerateBody {
  templateId: string;
  fodderRef: { sourceKind: string; refId: string };
}

@Controller('admin')
export class NewsAdminController {
  constructor(
    private readonly repo: NewsBeatRepository,
    private readonly fodderReader: NewsFodderReader,
    private readonly generator: NewsBeatGeneratorService,
  ) {}

  // ─── GET /admin/news-beats/active — beats in-window + RAW + linked threads (role gm) ──────────────────

  /**
   * `GET /v1/admin/news-beats/active`
   *
   * Every `news_beat` row within the REAL-clock persistence window (the SAME `created_at` cutoff
   * `NewsProjectionService.listFeed` uses, D5), RAW (design §6.2 "fodder_refs, attribution complète,
   * threads liés" — diagnostic, never i18n/band-projected), PLUS every `news_thread` row those beats
   * reference (the "threads liés" half).
   *
   * Returns: { gameDay, beats: NewsBeatRow[], threads: NewsThreadRow[] }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('news-beats/active')
  @UseGuards(requireStaffRole('gm'))
  async active(): Promise<{ gameDay: number; beats: NewsBeatRow[]; threads: NewsThreadRow[] }> {
    const [latestRun, beats] = await Promise.all([
      this.repo.readLatestDailyRun(),
      this.repo.listActiveBeatsRaw(newsBeatTunables.beatPersistenceInFeedHours, ACTIVE_BEATS_LIST_LIMIT),
    ]);
    const threadIds = [...new Set(beats.map((b) => b.thread_id).filter((id): id is string => id !== null))];
    const threads = await this.repo.listThreadsByIds(threadIds);
    return { gameDay: latestRun?.game_day ?? 0, beats, threads };
  }

  // ─── GET /admin/news-beats/template-usage?fromGameDay= — aggregate template_counts (role gm) ──────────

  /**
   * `GET /v1/admin/news-beats/template-usage?fromGameDay=`
   *
   * Aggregate `template_counts` across every `news_daily_run` row with `game_day >= fromGameDay` (design
   * §6.2 canon :95 "aggregate which templates produced beats over period. Diagnostic balance") — summed
   * per templateId (`'digest'` included, the phase-6 diagnostic bucket for template-less beats, design
   * D4). ALSO returns the per-run breakdown itself (`runs`) — the aggregate is fully derivable from it
   * (per-run invariants, never a hidden global-only total, mirrors §0's own test-robustness discipline).
   *
   * Returns: { fromGameDay, templateCounts: Record<string, number>, runs: Array<{gameDay, templateCounts}> }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('news-beats/template-usage')
  @UseGuards(requireStaffRole('gm'))
  async templateUsage(@Query('fromGameDay') fromGameDayParam: string | undefined): Promise<{
    fromGameDay: number;
    templateCounts: Record<string, number>;
    runs: Array<{ gameDay: number; templateCounts: Record<string, number> }>;
  }> {
    const fromGameDay = parseFromGameDay(fromGameDayParam);
    const runs = await this.repo.listDailyRuns(fromGameDay, DAILY_RUNS_LIST_LIMIT);
    const templateCounts: Record<string, number> = {};
    for (const run of runs) {
      const counts = (run.template_counts ?? {}) as Record<string, number>;
      for (const [templateId, count] of Object.entries(counts)) {
        templateCounts[templateId] = (templateCounts[templateId] ?? 0) + count;
      }
    }
    return {
      fromGameDay,
      templateCounts,
      runs: runs.map((r) => ({ gameDay: r.game_day, templateCounts: r.template_counts as Record<string, number> })),
    };
  }

  // ─── GET /admin/news-beats/threads?status= — threads + RAW payloads (role gm) ──────────────────────────

  /**
   * `GET /v1/admin/news-beats/threads?status=`
   *
   * Every `news_thread` row, optionally narrowed to ONE `status` (`open`|`concluded`), RAW `payload`
   * (design §6.2 canon :96 "salience, resistance, schedules — le reframe-resistance accumulator … visible
   * enough" — côté ops). An invalid/absent `status` is simply NOT filtered (never throws on a bad query
   * param, mirrors `NewsProjectionService`'s own posture).
   *
   * Returns: { threads: NewsThreadRow[] }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('news-beats/threads')
  @UseGuards(requireStaffRole('gm'))
  async threads(@Query('status') statusParam: string | undefined): Promise<{ threads: NewsThreadRow[] }> {
    const status = statusParam === 'open' || statusParam === 'concluded' ? statusParam : undefined;
    const threads = await this.repo.listThreadsByStatus(status, THREADS_LIST_LIMIT);
    return { threads };
  }

  // ─── GET /admin/news-beats/daily-runs?fromGameDay= — claims + counts (role gm) ─────────────────────────

  /**
   * `GET /v1/admin/news-beats/daily-runs?fromGameDay=`
   *
   * Every `news_daily_run` row (the tick's own per-day claim, design §4.3) with `game_day >= fromGameDay`
   * (default 0 — every claimed day), ascending, ≤ {@link DAILY_RUNS_LIST_LIMIT} — the batch-observability
   * surface (design §6.2 "claims + fodder_counts + wire days", mirrors `RandomWorldAdminController`'s own
   * `daily-runs` endpoint).
   *
   * Returns: { runs: NewsDailyRunRow[] }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('news-beats/daily-runs')
  @UseGuards(requireStaffRole('gm'))
  async dailyRuns(@Query('fromGameDay') fromGameDayParam: string | undefined): Promise<{ runs: NewsDailyRunRow[] }> {
    const fromGameDay = parseFromGameDay(fromGameDayParam);
    const runs = await this.repo.listDailyRuns(fromGameDay, DAILY_RUNS_LIST_LIMIT);
    return { runs };
  }

  // ─── POST /admin/news-beats/force-generate — SAME code-path as the tick (role admin, F3 DEFERRED) ─────

  /**
   * `POST /v1/admin/news-beats/force-generate`
   *
   * Force-generate a LIVE template TODAY (the REAL `news_daily_run` watermark — see
   * `NewsBeatRepository.readLatestDailyRun`'s own doc comment — never a client-supplied `gameDay`; an
   * admin cannot backdate/future-date a beat). Resolves the REAL upstream fodder row named by `fodderRef`
   * (`NewsFodderReader.readOneBySourceKindAndRefId` — never a fabricated item) and calls
   * `NewsBeatGeneratorService.forceGenerate` — the SAME code-path the real tick's own phase-4c trigger
   * uses (design §6.2 anti-fig-leaf: the thread AND its beats exist, identical structural shape to the
   * tick's own flow — never a bypass INSERT).
   *
   * Validation (in order, each its own explicit error — D2, anti-fig-leaf):
   *   1. Unknown `templateId` (outside the 12-entry registry) → 422.
   *   2. `templateId` is one of the 5 `registry_only` entries → 422 (D2: "the BO cannot force-generate a
   *      template with no runtime" — a fabricated beat would be an administrative fig-leaf).
   *   3. `templateId` is `live` but outside the 1-template forceable set (`three_outlet_storm` — the
   *      other 6 are successor/signal-driven, no "generate from this one fodderRef" standalone semantics,
   *      see `NewsBeatGeneratorService.forceGenerate`'s own doc comment) → 422, explicit reason.
   *   4. `fodderRef` missing/malformed, OR names a row that doesn't exist → 422/404, never fabricated.
   *
   * Body: { templateId: string, fodderRef: { sourceKind: string, refId: string } }
   * Returns: { threadId, templateId, gameDay, beats: NewsBeatRow[], f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 JOINT, same
   * precedent as `RandomWorldAdminController.forceTemplate` and every other `force-*` admin action).
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('news-beats/force-generate')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 JOINT).
  @UseGuards(requireStaffRole('admin'))
  async forceGenerate(@Body() body: Partial<ForceGenerateBody>): Promise<{
    threadId: string;
    templateId: string;
    gameDay: number;
    beats: NewsBeatRow[];
    f3_deferred: true;
  }> {
    const { templateId, fodderRef } = body ?? {};

    const entry = NEWS_BEAT_TEMPLATE_REGISTRY.find((e) => e.templateId === templateId);
    if (!entry) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown NewsBeatTemplateId: ${JSON.stringify(templateId)}. Must be one of the ${NEWS_BEAT_TEMPLATE_REGISTRY.length} registry entries.`,
      });
    }
    if (entry.runtime === 'registry_only') {
      throw new ApiError('VALIDATION_FAILED', {
        message: `'${templateId}' is registry-only (D2) — zero runtime code-path exists (${entry.registryOnlyReason ?? 'no reason recorded'}). The BO cannot force-generate a template with no runtime (anti-fig-leaf).`,
      });
    }
    if (!templateId || !isForceableNewsBeatTemplateId(templateId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `'${templateId}' is LIVE but not force-generatable via this generic (templateId+fodderRef) endpoint — see NewsBeatGeneratorService.forceGenerate's own doc comment for the per-template reasoning. Force-generatable LIVE templates: 'three_outlet_storm'.`,
      });
    }

    if (!fodderRef || !isValidFodderSourceKind(fodderRef.sourceKind) || typeof fodderRef.refId !== 'string' || fodderRef.refId.length === 0) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `force-generate requires a real fodderRef: { sourceKind: 'random_world'|'political'|'live_ops'|'ambient_micro', refId: string }.`,
      });
    }

    const latestRun = await this.repo.readLatestDailyRun();
    const gameDay = latestRun?.game_day ?? 0;

    const fodderItem = await this.fodderReader.readOneBySourceKindAndRefId(fodderRef.sourceKind, fodderRef.refId, gameDay);
    if (!fodderItem) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No ${fodderRef.sourceKind} row with id ${fodderRef.refId} — force-generate never fabricates a fodder item.`,
      });
    }

    const thread = await this.generator.forceGenerate(templateId, fodderItem, gameDay);
    const beats = await this.repo.listBeatsByThreadId(thread.id);

    // F3 DEFERRED marker — same precedent as RandomWorldAdminController.forceTemplate.
    return { threadId: thread.id, templateId, gameDay, beats, f3_deferred: true };
  }
}

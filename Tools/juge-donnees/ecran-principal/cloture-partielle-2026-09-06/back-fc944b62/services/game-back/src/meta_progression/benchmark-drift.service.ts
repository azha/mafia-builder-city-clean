// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C6 ("`BenchmarkDriftService`
//             baseline init (per LIVE metric, real snapshot value via `MetricValueRef` indirection — NO
//             copy) + `BENCHMARK_DRIFT_TICK` NIGHTLY/32 ... `GET /v1/meta/benchmark` (drift buckets only)")
//             + C7 ("`BenchmarkDriftService.reAnchor` ... `POST /v1/meta/benchmark/reanchor {metric_kinds[]}`
//             — quota gate ... -> per-metric snapshot + accumulator->0 + lagging compare ... -> decrement
//             quota -> `ReAnchorExecutedEvent` (+ `LaggingIndicatorRevealedEvent` when the baseline was
//             stale)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §9.1 (metric
//             sources, ★H-3) + §9.2 (drift accrual + silent auto-update, D11) + §9.3 (re-anchor + lagging,
//             D11) + §10 (the GET .../benchmark contract — bucket-only + quota fields, P5).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §9/R7 (NIGHTLY/32 — the
//             courtesy gap RESERVED at C3, filled HERE) + §11/R9 (elapsed real-time — n/a here, this tick
//             uses `deriveGameDay`-shaped IN-GAME elapsed days, R1's own "cycle = one game-day" finding).
//             Pattern (registerSystem + "ONE public runTick both the scheduler AND the `_test` route call",
//             Lesson #3; an in-memory test-probe array pushed right where THIS method calls `bus.emit...`):
//             `execution-plan-evaluator.service.ts` (C3) / `pressure-tier.service.ts` (C5).
//             Pattern (per-substrate local `getCurrentGameMinute` copy, NEVER a shared helper — C7 needs the
//             player's CURRENT tick for a player-initiated `POST`, unlike `runTick`'s scheduler/test-route
//             PARAMETER): `horizon-tier-advancement.repository.ts#getCurrentGameMinute`.
//             — P3-H C6 — 2026-07-24 (baseline init + drift tick + GET projection) / C7 — 2026-07-24
//             (reAnchor + the quota-extended GET projection)

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../citysim/scheduler/city_sim_system';
import { CityEventBus, type BaselineAutoUpdatedEvent, type LaggingIndicatorRevealedEvent, type ReAnchorExecutedEvent } from '../citysim/events/city-event-bus';
import { citySimTunables } from '../citysim/citysim-tunables';
import { citySimClock } from '../db/schema/city_sim_clock';
import { ErlangStashRepository } from '../citysim/erlang_stash/erlang-stash.repository';
import { ApiError } from '../protocol/api-error';
import { metaProgressionTunables } from './meta-progression-tunables';
import { PlayerMetricBenchmarksRepository } from './player-metric-benchmarks.repository';
import { BenchmarkQuotaService } from './benchmark-quota.service';
import { LIVE_METRIC_KINDS, LIVE_METRIC_KINDS_LIST, readLiveMetricValue, type MetricReadContext, type LiveMetricKind, type MetricKind } from './metric-sources';
import { driftBucketFor, type DriftBucket } from './drift-bucket';

/** design §9.3 — the closed `LaggingIndicatorSignalEnum` (never surfaced player — P5, BO/event-only). `null`
 *  means no PRIOR baseline existed (nothing to compare against — never a fabricated signal). */
export type LaggingDirection = 'ABOVE_ACTUAL' | 'BELOW_ACTUAL' | 'AT_ACTUAL' | null;

/**
 * design §9.3's own "compare old vs new baseline" — a PURE, disclosed realization (no tunable/tolerance
 * exists for "how close counts as AT_ACTUAL" — design/canon name the axis and the ABOVE_ACTUAL trigger
 * condition literally ["si l'ancien benchmark était au-dessus de la performance réelle courante"] but no
 * numeric tolerance): a strict numeric compare. `oldValue > newValue` -> `ABOVE_ACTUAL` (the stale "good"
 * threshold was masking a decline — the ONLY branch `reAnchor` below emits `LaggingIndicatorRevealedEvent`
 * for, per canon's own literal step-3 wording); `oldValue < newValue` -> `BELOW_ACTUAL` (the org improved
 * silently); equal -> `AT_ACTUAL` (no lagging). `oldValue === null` (no prior row) -> `null` (no signal
 * possible, never a fabricated direction).
 */
export function laggingDirectionFor(oldValue: number | null, newValue: number): LaggingDirection {
  if (oldValue === null) return null;
  if (oldValue > newValue) return 'ABOVE_ACTUAL';
  if (oldValue < newValue) return 'BELOW_ACTUAL';
  return 'AT_ACTUAL';
}

/** The falsifiable proof surface `runTick` returns — every outcome's own count, mirrors `ExecutionPlan
 *  EvaluatorTickResult`'s own "every outcome, never just a bare total" shape. */
export interface BenchmarkDriftTickResult {
  readonly initializedCount: number;
  readonly accumulatedCount: number;
  readonly autoUpdatedCount: number;
}

/** `GET /v1/meta/benchmark`'s per-metric row (design §10 — `{metric_key, drift_bucket}`, never the raw pct). */
export interface BenchmarkMetricProjection {
  readonly metric_key: string;
  readonly drift_bucket: DriftBucket;
}

/** `GET /v1/meta/benchmark`'s response shape (design §9.2/§10): drift buckets + the C7 quota fields
 *  (`quota_remaining`/`quota_max` — the design §10 canon-sanctioned numerics, P5: never `week_reset_at`).
 *  Empty `metrics` for a player who has never been ticked yet (dormant-by-data, organic — no fabricated
 *  bucket for a non-existent row); `quota_remaining`/`quota_max` are ALWAYS present (lazy-initialized on
 *  first read — `BenchmarkQuotaService.getProjection`'s own `initQuota`). */
export interface BenchmarkProjection {
  readonly metrics: readonly BenchmarkMetricProjection[];
  readonly quota_remaining: number;
  readonly quota_max: number;
}

/** `POST /v1/meta/benchmark/reanchor`'s response shape (design §9.3) — `metric_kinds`/`lagging_revealed`
 *  are INDEX-CORRELATED (canon's own `ReAnchorExecutedEvent.lagging_revealed: bool[]` shape); the POST-claim
 *  quota state (never the raw baseline/accumulator — P5). */
export interface ReAnchorResult {
  readonly metric_kinds: readonly string[];
  readonly lagging_revealed: readonly boolean[];
  readonly quota_remaining: number;
  readonly quota_max: number;
}

@Injectable()
export class BenchmarkDriftService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BenchmarkDriftService.name);

  /** In-memory test-probe arrays (never used in production paths) — mirrors `PressureTierService`'s own
   *  `unlockedEvents` shape: pushed IN-LINE right where THIS class calls `bus.emit...`. */
  private autoUpdatedEvents: BaselineAutoUpdatedEvent[] = [];
  private laggingIndicatorEvents: LaggingIndicatorRevealedEvent[] = [];
  private reAnchorExecutedEvents: ReAnchorExecutedEvent[] = [];

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: PlayerMetricBenchmarksRepository,
    private readonly erlangStashRepo: ErlangStashRepository,
    private readonly bus: CityEventBus,
    private readonly quotaService: BenchmarkQuotaService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.BENCHMARK_DRIFT_TICK,
      cadence: Cadence.NIGHTLY,
      order: 32,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'BenchmarkDriftService registered BENCHMARK_DRIFT_TICK at NIGHTLY/32 — the courtesy gap C3 reserved ' +
        '(next free after FRICTION_BUDGET_TICK/31, before EXECUTION_PLAN_EVALUATOR_TICK/33). Each in-game ' +
        'night, per player, per LIVE metric (SAFEHOUSE_UTILIZATION, COURIER_DELIVERY_RATE — ★H-3 2-LIVE): ' +
        'lazy-init the baseline on first touch, else accumulate elapsed-day drift and silently auto-update ' +
        'on threshold cross (BO-only event, never surfaced player). A no-op for a player with no ' +
        'substrate for either metric (courier history in particular — LOT PLANQUE gave a fresh player a ' +
        'safehouse from the welcome grant, so that half is no longer organically empty).',
    );
  }

  /**
   * {NIGHTLY, order 32} — the design §9.2 per-metric drift accumulate for one player. Public so a `_test`
   * route can drive it directly for E2E (Lesson #3, zero live-vs-test divergence). Production: called only
   * via the scheduler registration.
   */
  async runTick(playerId: string, gameMinute: number): Promise<BenchmarkDriftTickResult> {
    const ctx: MetricReadContext = { db: this.db, erlangStashRepo: this.erlangStashRepo };
    const dayLen = citySimTunables.inGameDayLengthMinutes;
    const rate = metaProgressionTunables.driftAccumulationRatePctDay;
    const threshold = metaProgressionTunables.benchmarkAutoUpdateThresholdPct;

    let initializedCount = 0;
    let accumulatedCount = 0;
    let autoUpdatedCount = 0;

    for (const metricKind of LIVE_METRIC_KINDS_LIST) {
      const realValue = await readLiveMetricValue(ctx, metricKind, playerId);

      const created = await this.repo.ensureBaseline(playerId, metricKind, realValue, gameMinute);
      if (created) {
        initializedCount++;
        continue; // the freshly-created row starts at drift_accumulator=0 — no accumulate step the SAME tick it was born.
      }

      const result = await this.repo.accumulateAndMaybeAutoUpdate(playerId, metricKind, gameMinute, dayLen, rate, threshold, realValue);
      if (!result.touched) continue; // the idempotency guard blocked a same-game-day repeat past a crossing — a true zero-write.
      accumulatedCount++;

      if (result.crossed) {
        autoUpdatedCount++;
        const event: BaselineAutoUpdatedEvent = {
          type: 'baseline_auto_updated',
          playerId,
          metricKind,
          newBaselineValue: realValue,
          gameMinute,
        };
        this.bus.emitBaselineAutoUpdated(event);
        this.autoUpdatedEvents.push(event);
        this.logger.log(`BASELINE_AUTO_UPDATED (BO-only): player=${playerId} metric=${metricKind} newBaseline=${realValue.toFixed(2)}`);
      }
    }

    return { initializedCount, accumulatedCount, autoUpdatedCount };
  }

  /**
   * `GET /v1/meta/benchmark` (design §9.2/§9.4/§10) — per LIVE metric this player has a benchmark row for,
   * `{metric_key, drift_bucket}` (P5 — `drift_accumulator`/`baseline_value` never leave `player-metric-
   * benchmarks.repository.ts#listForPlayer`'s own raw shape into this projection) PLUS the C7 quota fields
   * (`quota_remaining`/`quota_max` — `BenchmarkQuotaService.getProjection`, elapsed-at-read: a stale
   * `week_reset_at` is resolved on THIS read too, design §9.4's own "on ANY quota read"). A player with no
   * benchmark rows yet (never ticked) reads `{metrics: []}` — organic, dormant-by-data; the quota fields are
   * ALWAYS present (lazy-initialized on first read).
   */
  async getProjection(playerId: string): Promise<BenchmarkProjection> {
    const [rows, quota] = await Promise.all([this.repo.listForPlayer(playerId), this.quotaService.getProjection(playerId)]);
    const threshold = metaProgressionTunables.benchmarkAutoUpdateThresholdPct;
    return {
      metrics: rows.map((r) => ({
        metric_key: r.metricKind,
        drift_bucket: driftBucketFor(r.driftAccumulator, threshold),
      })),
      quota_remaining: quota.usesRemaining,
      quota_max: quota.maxUsesPerWeek,
    };
  }

  // ── the design §9.3 re-anchor + lagging reveal (P3-H C7) ────────────────────────────────────────

  /**
   * `POST /v1/meta/benchmark/reanchor {metric_kinds[]}` (design §9.3). Validation gates (BOTH BEFORE any
   * write — no partial re-anchor is ever observable): (1) every requested kind must be LIVE (`VALIDATION_
   * FAILED` — a RESERVED/unknown kind is refused outright, mirrors the closed-registry discipline `metric-
   * sources.ts#validateMetricRegistryStrictMode` establishes for the boot-time set); (2) `|metric_kinds| <=
   * metrics_simultaneous_reanchor` (422 `METRICS_SIMULTANEOUS_REANCHOR_EXCEEDED`, value-sensitive). THEN the
   * quota gate: `BenchmarkQuotaService.claimReAnchorUse` — a failed claim (409 `REANCHOR_QUOTA_EXHAUSTED`)
   * happens BEFORE any metric is read/snapshotted (the concurrency falsifiable's own "loser 409, no double
   * snapshot" — the losing side of a race never reaches the loop below). On a genuine claim: per metric,
   * read the REAL current value (`readLiveMetricValue`, the SAME `MetricValueRef` indirection `runTick`
   * uses) -> `PlayerMetricBenchmarksRepository#reAnchorMetric` (the atomic old-vs-new snapshot) ->
   * `laggingDirectionFor` -> `LaggingIndicatorRevealedEvent` ONLY on `ABOVE_ACTUAL` (design §9.3's own
   * literal "si l'ancien benchmark était au-dessus ... émettre" — never BELOW_ACTUAL/AT_ACTUAL/null). Ends
   * with ONE `ReAnchorExecutedEvent` for the whole batch (canon's own index-correlated `metric_kinds[]`/
   * `lagging_revealed[]` payload shape).
   */
  async reAnchor(playerId: string, metricKinds: readonly string[]): Promise<ReAnchorResult> {
    if (metricKinds.length === 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'metric_kinds must be a non-empty array.' });
    }
    for (const mk of metricKinds) {
      if (!LIVE_METRIC_KINDS.has(mk as MetricKind)) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `"${mk}" is not a LIVE metric kind (design §9.1, ★H-3 2-LIVE + 1-RESERVED).`,
        });
      }
    }
    const maxSimultaneous = metaProgressionTunables.metricsSimultaneousReanchor;
    if (metricKinds.length > maxSimultaneous) {
      throw new ApiError('METRICS_SIMULTANEOUS_REANCHOR_EXCEEDED', {
        message: `${metricKinds.length} metrics requested exceeds the tier limit (${maxSimultaneous}).`,
        payloadVars: { requested: metricKinds.length, max: maxSimultaneous },
      });
    }

    const gameMinute = await this.getCurrentGameMinute(playerId);

    const claim = await this.quotaService.claimReAnchorUse(playerId, gameMinute);
    if (!claim.claimed) {
      throw new ApiError('REANCHOR_QUOTA_EXHAUSTED', {
        message: `player ${playerId} has 0 re-anchor uses remaining this week.`,
        payloadVars: { uses_remaining: claim.usesRemaining, max_uses_per_week: claim.maxUsesPerWeek },
      });
    }

    const ctx: MetricReadContext = { db: this.db, erlangStashRepo: this.erlangStashRepo };
    const laggingRevealed: boolean[] = [];
    for (const metricKind of metricKinds as LiveMetricKind[]) {
      const realValue = await readLiveMetricValue(ctx, metricKind, playerId);
      const { oldBaselineValue, newBaselineValue } = await this.repo.reAnchorMetric(playerId, metricKind, gameMinute, realValue);
      const direction = laggingDirectionFor(oldBaselineValue, newBaselineValue);
      const revealed = direction === 'ABOVE_ACTUAL';
      laggingRevealed.push(revealed);

      if (revealed) {
        const laggingEvent: LaggingIndicatorRevealedEvent = {
          type: 'lagging_indicator_revealed',
          playerId,
          metricKind,
          oldBaselineValue: oldBaselineValue as number,
          newBaselineValue,
          gameMinute,
        };
        this.bus.emitLaggingIndicatorRevealed(laggingEvent);
        this.laggingIndicatorEvents.push(laggingEvent);
        this.logger.log(`LAGGING_INDICATOR_REVEALED: player=${playerId} metric=${metricKind} old=${(oldBaselineValue as number).toFixed(2)} new=${newBaselineValue.toFixed(2)}`);
      }
    }

    const executedEvent: ReAnchorExecutedEvent = {
      type: 'reanchor_executed',
      playerId,
      metricKinds,
      laggingRevealed,
      usesRemaining: claim.usesRemaining,
      gameMinute,
    };
    this.bus.emitReAnchorExecuted(executedEvent);
    this.reAnchorExecutedEvents.push(executedEvent);

    return {
      metric_kinds: metricKinds,
      lagging_revealed: laggingRevealed,
      quota_remaining: claim.usesRemaining,
      quota_max: claim.maxUsesPerWeek,
    };
  }

  /**
   * The player's CURRENT in-game tick (`city_sim_clock.game_minute`) — a per-substrate LOCAL copy of the
   * established `getCurrentGameMinute` convention (this codebase deliberately never shares this read across
   * repositories/services — see `horizon-tier-advancement.repository.ts`'s own header). Returns 0 when the
   * player has no clock row yet (never a crash — the SAME defensive-zero posture that method establishes). A
   * READ — no state change. Needed ONLY by `reAnchor` (a player-initiated `POST`, unlike `runTick`, which
   * receives `gameMinute` as a scheduler/test-route PARAMETER).
   */
  private async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `BaselineAutoUpdatedEvent` fired this process (test-probe — never used in production paths). */
  getAutoUpdatedEvents(): readonly BaselineAutoUpdatedEvent[] {
    return this.autoUpdatedEvents;
  }

  /** Clear the in-memory event probe (called by the test reset route). */
  clearAutoUpdatedEvents(): void {
    this.autoUpdatedEvents = [];
  }

  /** Every `LaggingIndicatorRevealedEvent` fired this process (test-probe — never used in production paths). */
  getLaggingIndicatorEvents(): readonly LaggingIndicatorRevealedEvent[] {
    return this.laggingIndicatorEvents;
  }

  /** Every `ReAnchorExecutedEvent` fired this process (test-probe — never used in production paths). */
  getReAnchorExecutedEvents(): readonly ReAnchorExecutedEvent[] {
    return this.reAnchorExecutedEvents;
  }

  /** Clear the in-memory `reAnchor` event probes (called by the test reset route). */
  clearReAnchorEvents(): void {
    this.laggingIndicatorEvents = [];
    this.reAnchorExecutedEvents = [];
  }
}

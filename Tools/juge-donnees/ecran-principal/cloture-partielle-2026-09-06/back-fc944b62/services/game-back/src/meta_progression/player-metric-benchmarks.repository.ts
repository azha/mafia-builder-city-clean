// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C6
//             ("`BenchmarkDriftService` baseline init ... + `BENCHMARK_DRIFT_TICK` (NIGHTLY/32): per LIVE
//             metric per active player `drift_accumulator += drift_accumulation_rate_pct_day`; at `>=
//             benchmark_auto_update_threshold_pct` -> snapshot the REAL current value ... + accumulator->0
//             + `BaselineAutoUpdatedEvent`").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (`player_
//             metric_benchmarks` — per-(player,metric_kind) baseline ledger, D10) + §9.1/§9.2 (metric
//             sources / drift accrual + silent auto-update).
//             ★ Realization note (coder-disclosed — the "elapsed-guard/idempotent accumulator" idiom the
//             plan's own concurrency line names, REUSE of the `ISOSTATIC_DEBT_TICK` elapsed-since-marker
//             shape, `city_sim_system.ts`'s own doc comment for that tick): `drift_accumulator` is NOT a
//             literal running `+=` counter mutated on every tick call (that shape needs its OWN "already
//             ticked today" marker column, which no migration this chunk is authorized to add). Instead it
//             is RECOMPUTED, idempotently, as `elapsed_game_days_since(baseline_snapshot_tick) *
//             drift_accumulation_rate_pct_day` — `baseline_snapshot_tick` doubles as BOTH the baseline's own
//             provenance stamp AND the drift-elapsed anchor, which is not a hack but a genuinely coherent
//             single-purpose column: drift IS "how much has diverged since the last snapshot", so "since
//             when has drift been accumulating" and "when was the baseline last snapshotted" are the SAME
//             instant by definition. `accumulateAndMaybeAutoUpdate`'s own header carries the full
//             concurrency proof (the `WHERE baseline_snapshot_tick < gameMinute` guard — a same-game-day
//             repeat call is either an idempotent recompute of the IDENTICAL value, or (post-crossing) a
//             true zero-write, never a double accumulation and never a double `BaselineAutoUpdatedEvent`).
//             — P3-H C1 — 2026-07-24 (scaffold) / C6 — 2026-07-24 (ensureBaseline/accumulateAndMaybeAutoUpdate/listForPlayer)

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import type { LiveMetricKind } from './metric-sources';

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom — never
 *  a shared extraction across repositories, see `capability-debts.repository.ts#rowsOf`). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** One `player_metric_benchmarks` row, JS-typed (numeric() columns come back as strings from Drizzle's
 *  string-mode — converted here ONCE, at the repository boundary, so every caller works with real numbers). */
export interface BenchmarkRow {
  readonly metricKind: string;
  readonly baselineValue: number;
  readonly baselineSnapshotTick: number;
  readonly baselineSource: string;
  readonly driftAccumulator: number;
  readonly lastAutoUpdateTick: number | null;
  readonly createdAtTick: number;
}

/** `accumulateAndMaybeAutoUpdate`'s result — `touched=false` means the idempotency guard blocked this call
 *  (a same-game-day repeat AFTER this exact row already crossed this same game-day — a true zero-write, see
 *  this file's own header); `crossed=true` means THIS call's own CASE branch performed the silent
 *  auto-update (the caller emits `BaselineAutoUpdatedEvent` exactly once for this transition). */
export interface AccumulateResult {
  readonly touched: boolean;
  readonly driftAccumulator: number;
  readonly crossed: boolean;
}

/** `reAnchorMetric`'s result (P3-H C7) — `oldBaselineValue=null` means the player had NO prior benchmark row
 *  for this metric (never ticked/re-anchored before THIS call — no lagging signal is possible, see this
 *  method's own header). `newBaselineValue` is the REAL current value THIS call just snapshotted to. */
export interface ReAnchorMetricResult {
  readonly oldBaselineValue: number | null;
  readonly newBaselineValue: number;
}

@Injectable()
export class PlayerMetricBenchmarksRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-H C6 (design §9.1 — "Init a player's benchmarks -> 2 LIVE rows ... with real snapshot values"). ONE
   * `INSERT ... ON CONFLICT (player_id, metric_kind) DO NOTHING RETURNING player_id` — the SAME "lazy
   * create on first touch" idiom `ScriptStabilityCountersRepository#incrementOnStable` establishes for this
   * lot's sibling table. `drift_accumulator` starts at its schema DEFAULT `0` (the day of a snapshot has, by
   * definition, zero elapsed drift since itself — no accumulate step runs on the SAME call that creates the
   * row, see `BenchmarkDriftService.runTick`'s own per-metric branch). Returns whether THIS call actually
   * created the row (`true`) vs. the row already existed (`false`, a conflict — the caller then proceeds to
   * `accumulateAndMaybeAutoUpdate` instead).
   */
  async ensureBaseline(playerId: string, metricKind: LiveMetricKind, realValue: number, gameMinute: number): Promise<boolean> {
    const result = await this.db.execute(sql`
      INSERT INTO player_metric_benchmarks
        (player_id, metric_kind, baseline_value, baseline_snapshot_tick, baseline_source, drift_accumulator, created_at_tick)
      VALUES
        (${playerId}::uuid, ${metricKind}::metric_kind, ${realValue}::numeric, ${gameMinute}::bigint, 'INITIAL', 0, ${gameMinute}::bigint)
      ON CONFLICT (player_id, metric_kind) DO NOTHING
      RETURNING player_id
    `);
    return rowsOf(result).length > 0;
  }

  /**
   * P3-H C6 (design §9.2 — the daily drift accumulate + silent auto-update, in ONE atomic single-statement
   * conditional UPDATE, 0.4 atomic-first). `elapsedDays = FLOOR(gameMinute/dayLen) - FLOOR(baseline_snapshot_
   * tick/dayLen)` (Postgres integer `/` on bigint operands truncates — the SQL-side mirror of `ambient-
   * clock.ts#deriveGameDay`'s own `Math.floor`, computed entirely SQL-side so the whole read+decide+write
   * stays ONE statement, never a read-then-write). `elapsedDays * ratePerDay >= thresholdPct` is repeated
   * verbatim across every SET clause's CASE (the SAME "duplicate the WHEN-condition" idiom `progression.
   * repository.ts#recordGraduationAndMaybeAdvancePressureTier` already establishes for this lot) — every
   * clause reads the row's PRE-update values consistently (standard single-UPDATE-statement SQL semantics),
   * so there is no TOCTOU window between "decide" and "write".
   *
   * ★ THE GUARD (`WHERE ... baseline_snapshot_tick < gameMinute`) is the concurrency proof (plan's own
   * "Double drift tick same game-day (elapsed-guard/idempotent accumulator) -> single increment"): a
   * same-game-day repeat call for a row that has NOT yet crossed this tick still passes the guard (baseline_
   * snapshot_tick is unchanged, still < gameMinute) and RECOMPUTES the IDENTICAL `elapsedDays * rate` value
   * (idempotent — no drift, no double-count, since the inputs are unchanged). A same-game-day repeat call
   * for a row that HAS already crossed THIS tick fails the guard (the crossing branch just set `baseline_
   * snapshot_tick = gameMinute`, so `gameMinute < gameMinute` is false) -> ZERO ROWS matched -> a TRUE
   * zero-write, `touched:false` -> the caller never re-emits `BaselineAutoUpdatedEvent` for the same
   * transition. `crossed` is detected via `last_auto_update_tick === gameMinute` in the RETURNING row: given
   * the guard already excluded any row whose `baseline_snapshot_tick` was already `gameMinute` PRE-update,
   * the ONLY way `last_auto_update_tick` can read back as EXACTLY `gameMinute` post-update is if THIS
   * statement's own crossing branch just set it (a value it could not already hold coming in) — a precise,
   * single-call-scoped signal, safe for every subsequent crossing too (unlike checking `baseline_source ===
   * 'AUTO_UPDATE'` alone, which stays true forever after the FIRST crossing and would misfire on every
   * later non-crossing accumulate call).
   */
  async accumulateAndMaybeAutoUpdate(
    playerId: string,
    metricKind: LiveMetricKind,
    gameMinute: number,
    dayLengthMinutes: number,
    ratePerDay: number,
    thresholdPct: number,
    realValue: number,
  ): Promise<AccumulateResult> {
    const crossedExpr = sql`
      ((${gameMinute}::bigint / ${dayLengthMinutes}::bigint) - (baseline_snapshot_tick / ${dayLengthMinutes}::bigint))
      * ${ratePerDay}::numeric >= ${thresholdPct}::numeric
    `;
    const elapsedAccumExpr = sql`
      ((${gameMinute}::bigint / ${dayLengthMinutes}::bigint) - (baseline_snapshot_tick / ${dayLengthMinutes}::bigint))
      * ${ratePerDay}::numeric
    `;
    const result = await this.db.execute(sql`
      UPDATE player_metric_benchmarks
      SET
        drift_accumulator = CASE WHEN ${crossedExpr} THEN 0 ELSE ${elapsedAccumExpr} END,
        baseline_value = CASE WHEN ${crossedExpr} THEN ${realValue}::numeric ELSE baseline_value END,
        baseline_snapshot_tick = CASE WHEN ${crossedExpr} THEN ${gameMinute}::bigint ELSE baseline_snapshot_tick END,
        baseline_source = CASE WHEN ${crossedExpr} THEN 'AUTO_UPDATE'::snapshot_source ELSE baseline_source END,
        last_auto_update_tick = CASE WHEN ${crossedExpr} THEN ${gameMinute}::bigint ELSE last_auto_update_tick END
      WHERE player_id = ${playerId}::uuid AND metric_kind = ${metricKind}::metric_kind
        AND baseline_snapshot_tick < ${gameMinute}::bigint
      RETURNING drift_accumulator, last_auto_update_tick
    `);
    const row = rowsOf(result)[0];
    if (!row) return { touched: false, driftAccumulator: 0, crossed: false };
    const driftAccumulator = Number(row.drift_accumulator);
    const crossed = row.last_auto_update_tick !== null && Number(row.last_auto_update_tick) === gameMinute;
    return { touched: true, driftAccumulator, crossed };
  }

  /**
   * P3-H C7 (design §9.3 — "per metric: snapshot the real value (source `PLAYER_REANCHOR`), `drift_
   * accumulator` -> 0, compare old vs new baseline"). ONE `WITH old_row AS (SELECT baseline_value ...) INSERT
   * ... ON CONFLICT (player_id, metric_kind) DO UPDATE ... RETURNING` — a single statement (0.4 atomic-first)
   * that captures the PRE-re-anchor baseline (`old_row`, MVCC-consistent as of this statement's start — the
   * standard "capture old + write new in one UPSERT" idiom) AND performs the snapshot in the SAME round-trip.
   * `ON CONFLICT DO UPDATE` (never a bare UPDATE) — a metric the player has NEVER had ticked (no prior
   * `player_metric_benchmarks` row at all) still succeeds, reading back `oldBaselineValue: null` (the
   * caller's own `laggingDirectionFor` treats `null` as "no lagging signal possible", never a crash — the
   * SAME organic-empty-state posture `ensureBaseline`'s own "no fabricated value" discipline establishes).
   * `last_auto_update_tick` is DELIBERATELY untouched (NOT set here) — that column tracks ONLY `AUTO_UPDATE`
   * crossings (this table's own schema comment); a `PLAYER_REANCHOR` snapshot is a DIFFERENT provenance,
   * never conflated with the silent auto-update's own tracking column.
   */
  async reAnchorMetric(playerId: string, metricKind: LiveMetricKind, gameMinute: number, realValue: number): Promise<ReAnchorMetricResult> {
    const result = await this.db.execute(sql`
      WITH old_row AS (
        SELECT baseline_value FROM player_metric_benchmarks
        WHERE player_id = ${playerId}::uuid AND metric_kind = ${metricKind}::metric_kind
      )
      INSERT INTO player_metric_benchmarks
        (player_id, metric_kind, baseline_value, baseline_snapshot_tick, baseline_source, drift_accumulator, created_at_tick)
      VALUES
        (${playerId}::uuid, ${metricKind}::metric_kind, ${realValue}::numeric, ${gameMinute}::bigint, 'PLAYER_REANCHOR', 0, ${gameMinute}::bigint)
      ON CONFLICT (player_id, metric_kind) DO UPDATE SET
        baseline_value = ${realValue}::numeric,
        baseline_snapshot_tick = ${gameMinute}::bigint,
        baseline_source = 'PLAYER_REANCHOR',
        drift_accumulator = 0
      RETURNING baseline_value AS new_baseline_value, (SELECT baseline_value FROM old_row) AS old_baseline_value
    `);
    const row = rowsOf(result)[0];
    if (!row) {
      throw new Error(`reAnchorMetric: no row returned for player=${playerId} metric=${metricKind} (unexpected — INSERT..ON CONFLICT always returns exactly one row).`);
    }
    return {
      oldBaselineValue: row.old_baseline_value === null ? null : Number(row.old_baseline_value),
      newBaselineValue: Number(row.new_baseline_value),
    };
  }

  /**
   * P3-H C6 — every `player_metric_benchmarks` row this player holds (0..2 in practice, LIVE-only per
   * ★H-3 — `REVENUE_PER_ROUTE` never gets a row, `BenchmarkDriftService.runTick` only ever iterates
   * `LIVE_METRIC_KINDS_LIST`). Used by BOTH `BenchmarkDriftService.getProjection` (the `GET /v1/meta/
   * benchmark` bucket-only projection, design §9.2/§10) AND the `_test` raw-probe route (the E2E floor's
   * own exact-value assertions — `drift_accumulator`/`baseline_value` are BO/test-only, never player-
   * surfaced, P5). Ordered by `metric_kind` for deterministic iteration.
   */
  async listForPlayer(playerId: string): Promise<BenchmarkRow[]> {
    const result = await this.db.execute(sql`
      SELECT metric_kind, baseline_value, baseline_snapshot_tick, baseline_source, drift_accumulator, last_auto_update_tick, created_at_tick
      FROM player_metric_benchmarks
      WHERE player_id = ${playerId}::uuid
      ORDER BY metric_kind
    `);
    return rowsOf(result).map((r) => ({
      metricKind: String(r.metric_kind),
      baselineValue: Number(r.baseline_value),
      baselineSnapshotTick: Number(r.baseline_snapshot_tick),
      baselineSource: String(r.baseline_source),
      driftAccumulator: Number(r.drift_accumulator),
      lastAutoUpdateTick: r.last_auto_update_tick === null ? null : Number(r.last_auto_update_tick),
      createdAtTick: Number(r.created_at_tick),
    }));
  }
}

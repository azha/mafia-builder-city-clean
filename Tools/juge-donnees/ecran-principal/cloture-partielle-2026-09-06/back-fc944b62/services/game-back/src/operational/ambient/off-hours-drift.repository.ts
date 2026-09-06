// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C3
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.4 (drift
//             detector) + §4 (off_hours_drift_detection schema)
//             R9.3: docs/tech/09_data_model/schema_ambient_world.md — this READS the schema and
//             INSERTs off_hours_drift_detection; it NEVER redefines the table.
//             Seam: services/game-back/src/db/schema/city_state.ts (buildings.player_id/block_id) +
//             world_geography.ts (blocks.district_id → districts.id) — the SAME buildings→blocks→
//             districts idiom ambient-micro-event.repository.ts's own `listPlayerDistrictIds` uses,
//             here inverted (district → owning players, the card fan-out set).
//             — 04g-A C3 — 2026-07-13
//
// `OffHoursDriftRepository` — the persisted access layer over `off_hours_drift_detection` +
// `constant_hum_cell` (read-only here — this repository never writes constant_hum_cell). Copies the
// persisted-projection repository template (`constant-hum.repository.ts` / `ambient-micro-event.repository.ts`).
//
// `listMatureOffHoursCells` — the D10 maturity gate + D12 off-hours band, read together: a cell is
// "off-hours" iff `hour_of_week % 24 <= hourBandEnd` (D12, default band_end=5 ⇒ hourOfDay 0..5, 6 hours ×
// 7 days = 42 cells/district) AND "mature" iff `sample_count >= OFF_HOURS_DRIFT_MATURITY_MIN_SAMPLES`
// (design §4: "cells sample_count < 4 gate de maturité" — a fixed characteristic of the composite
// `drift_significant`, NOT itself a registry tunable, mirrors `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_
// THRESHOLD`'s own "resolved composite half, not a TunablesStore key" precedent in `ambient.tunables.ts`).
//
// `getLatestPriorDetection` / `insertDetection` — see `off-hours-drift.detector.ts`'s own file header for
// the FULL D10 "baseline snapshot" mechanics resolution (coder C3, flagged `[needs reviewer⊥]`) this
// repository's two methods implement the persistence half of.
//
// `listPlayersWithBuildingInDistrict` — the card fan-out set (design §3.4: "chaque joueur ayant ≥ 1
// building dans le district drifté"). Mirrors `ambient-micro-event.repository.ts`'s `listPlayerDistrictIds`
// INVERTED (district → players, not player → districts).
//
// ★ F4 (design §8: "détection sur ≤ 42×18 cells lues en 1 query"): `listAllMatureOffHoursCellsGroupedByDistrict`
// + `listLatestPriorDetectionForEveryDistrict` are the BATCHED, ALL-DISTRICTS-AT-ONCE reads the detector
// uses per pass (2 queries total, not 2×18) — the per-district single-district methods above
// (`listMatureOffHoursCells`/`getLatestPriorDetection`) remain for the E2E direct-probe / BO admin
// call sites (a single district lookup), but `off-hours-drift.detector.ts`'s `runDetection` (the REAL
// NIGHTLY/27 phase-2 hot path, fired on EVERY player's NIGHTLY boundary crossing) uses the batched pair
// exclusively — the original N-districts × 2-queries-per-district shape measurably slowed every NIGHTLY
// firing in the C3 E2E floor (an F4 regression against the design's own 1-query budget, caught during the
// floor run and fixed same-commit).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import { constantHumCell } from '../../db/schema/ambient_world';
import { offHoursDriftDetection, type OffHoursDriftDetectionRow } from '../../db/schema/ambient_world';

/** `off_hours_drift_detection`'s cell-count gate — the composite `drift_significant`'s maturity component
 *  (design §4: "sample_count < 4 gate de maturité"). A fixed design characteristic, not a registry key —
 *  mirrors `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD` (`ambient.tunables.ts`). */
export const OFF_HOURS_DRIFT_MATURITY_MIN_SAMPLES = 4;

/** One mature off-hours cell, as read for the drift comparison. */
export interface MatureOffHoursCell {
  readonly hourOfWeek: number;
  readonly baselineHeatEma: number;
  readonly sampleCount: number;
}

/** A new `off_hours_drift_detection` row to insert (trip OR cold-start calibration — see the detector's
 *  own header). `baselineSnapshot` is a plain `{hourOfWeek: ema}` map (jsonb). */
export interface NewOffHoursDriftDetectionRow {
  readonly districtId: number;
  readonly detectedAtGameDay: number;
  readonly windowDays: number;
  readonly driftRelative: number;
  readonly cellsOverThreshold: number;
  readonly baselineSnapshot: Record<string, number>;
}

@Injectable()
export class OffHoursDriftRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Mature off-hours cells for one district (design §3.4/§4/D10/D12). `hourBandEnd` = the D12 off-hours
   * upper bound (`ambientTunables.offHoursHourBandEnd`, default 5). Ordered by `hour_of_week` for
   * deterministic iteration.
   */
  async listMatureOffHoursCells(districtId: number, hourBandEnd: number): Promise<readonly MatureOffHoursCell[]> {
    const rows = await this.db
      .select({
        hour_of_week: constantHumCell.hour_of_week,
        baseline_heat_ema: constantHumCell.baseline_heat_ema,
        sample_count: constantHumCell.sample_count,
      })
      .from(constantHumCell)
      .where(
        and(
          eq(constantHumCell.district_id, districtId),
          // D12 off-hours band: hourOfDay = hour_of_week % 24 <= hourBandEnd (default 5 ⇒ 0..5, 42
          // cells/district). No `mod()` helper in this drizzle-orm version — raw `sql` modulo, the SAME
          // idiom `exceptions.repository.ts`'s own jsonb-predicate raw-`sql` fallback uses.
          sql`(${constantHumCell.hour_of_week} % 24) <= ${hourBandEnd}`,
          gte(constantHumCell.sample_count, OFF_HOURS_DRIFT_MATURITY_MIN_SAMPLES),
        ),
      )
      .orderBy(constantHumCell.hour_of_week);
    return rows.map((r) => ({
      hourOfWeek: r.hour_of_week,
      baselineHeatEma: Number(r.baseline_heat_ema),
      sampleCount: r.sample_count,
    }));
  }

  /**
   * The MOST RECENT prior `off_hours_drift_detection` row for a district (the D10 rolling-baseline
   * reference — see `off-hours-drift.detector.ts`'s header). `null` iff this district has NEVER been
   * detected before (the honest cold-start case). Single-district lookup — the E2E direct-probe / BO
   * call sites' shape; `runDetection`'s own hot path uses the batched `listLatestPriorDetectionForEveryDistrict`.
   */
  async getLatestPriorDetection(districtId: number): Promise<OffHoursDriftDetectionRow | null> {
    const rows = await this.db
      .select()
      .from(offHoursDriftDetection)
      .where(eq(offHoursDriftDetection.district_id, districtId))
      .orderBy(desc(offHoursDriftDetection.detected_at_game_day), desc(offHoursDriftDetection.created_at))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * ★ F4 batch (see file header): ALL districts' mature off-hours cells, ONE query, grouped by
   * `district_id`. Empty map value for a district with no mature off-hours cells (never a missing key
   * vs. an empty array distinction the caller has to special-case).
   */
  async listAllMatureOffHoursCellsGroupedByDistrict(hourBandEnd: number): Promise<ReadonlyMap<number, readonly MatureOffHoursCell[]>> {
    const rows = await this.db
      .select({
        district_id: constantHumCell.district_id,
        hour_of_week: constantHumCell.hour_of_week,
        baseline_heat_ema: constantHumCell.baseline_heat_ema,
        sample_count: constantHumCell.sample_count,
      })
      .from(constantHumCell)
      .where(
        and(
          sql`(${constantHumCell.hour_of_week} % 24) <= ${hourBandEnd}`,
          gte(constantHumCell.sample_count, OFF_HOURS_DRIFT_MATURITY_MIN_SAMPLES),
        ),
      )
      .orderBy(constantHumCell.district_id, constantHumCell.hour_of_week);
    const byDistrict = new Map<number, MatureOffHoursCell[]>();
    for (const r of rows) {
      const cell: MatureOffHoursCell = {
        hourOfWeek: r.hour_of_week,
        baselineHeatEma: Number(r.baseline_heat_ema),
        sampleCount: r.sample_count,
      };
      const bucket = byDistrict.get(r.district_id);
      if (bucket) bucket.push(cell);
      else byDistrict.set(r.district_id, [cell]);
    }
    return byDistrict;
  }

  /**
   * ★ F4 batch (see file header): the MOST RECENT prior `off_hours_drift_detection` row for EVERY
   * district that has one, ONE query (`DISTINCT ON` per district, ordered newest-first). A district with
   * NO key in the returned map has never been detected before (the cold-start case — the SAME semantic
   * `getLatestPriorDetection` returning `null` carries, just batched).
   */
  async listLatestPriorDetectionForEveryDistrict(): Promise<ReadonlyMap<number, OffHoursDriftDetectionRow>> {
    const rows = await this.db.execute<OffHoursDriftDetectionRow>(sql`
      SELECT DISTINCT ON (district_id) *
      FROM off_hours_drift_detection
      ORDER BY district_id, detected_at_game_day DESC, created_at DESC
    `);
    // PG driver returns either { rows: [...] } or a bare array depending on version (the
    // exceptions.repository.ts `hasPendingForBuilding` precedent — defensively accept either shape).
    const list = (rows as unknown as { rows?: OffHoursDriftDetectionRow[] }).rows ?? (rows as unknown as OffHoursDriftDetectionRow[]);
    const byDistrict = new Map<number, OffHoursDriftDetectionRow>();
    for (const row of list) byDistrict.set(row.district_id, row);
    return byDistrict;
  }

  /** Insert one `off_hours_drift_detection` row (trip OR cold-start calibration). Returns the new row id. */
  async insertDetection(row: NewOffHoursDriftDetectionRow): Promise<string> {
    const [inserted] = await this.db
      .insert(offHoursDriftDetection)
      .values({
        district_id: row.districtId,
        detected_at_game_day: row.detectedAtGameDay,
        window_days: row.windowDays,
        drift_relative: String(row.driftRelative),
        cells_over_threshold: row.cellsOverThreshold,
        baseline_snapshot: row.baselineSnapshot,
      })
      .returning({ id: offHoursDriftDetection.id });
    return inserted!.id;
  }

  /** BO diagnostic: the N most recent detections, newest first (`ambient-admin.controller.ts`). */
  async listRecentDetections(limit: number): Promise<readonly OffHoursDriftDetectionRow[]> {
    return this.db
      .select()
      .from(offHoursDriftDetection)
      .orderBy(desc(offHoursDriftDetection.detected_at_game_day), desc(offHoursDriftDetection.created_at))
      .limit(limit);
  }

  /**
   * The card fan-out set (design §3.4): every player owning ≥1 building in `districtId`, DISTINCT.
   * Mirrors `ambient-micro-event.repository.ts`'s `listPlayerDistrictIds` (buildings → blocks → districts
   * join), inverted.
   */
  async listPlayersWithBuildingInDistrict(districtId: number): Promise<readonly string[]> {
    const rows = await this.db
      .selectDistinct({ player_id: building.player_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(blocks.district_id, districtId), eq(building.ownership, 'player')));
    return rows.map((r) => r.player_id);
  }
}

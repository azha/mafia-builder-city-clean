// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.1 (the fold
//             algorithm) + §4 (constant_hum_cell schema)
//             R9.3: docs/tech/09_data_model/schema_ambient_world.md — this READS the schema and
//             INSERT/UPDATEs constant_hum_cell; it NEVER redefines the table.
//             Seam S3: services/game-back/src/db/schema/city_state.ts:139,147 (buildings.heat, real).
//             Seam: services/game-back/src/db/schema/world_geography.ts (blocks.district_id → districts.id
//             JOIN, the SAME buildings→blocks→districts idiom heat.repository.ts's own
//             `listPlayerOperationalBuildings` uses).
//             — 04g-A C1 — 2026-07-13
//
// `ConstantHumRepository` — the persisted access layer over `constant_hum_cell` + the cross-player
// district heat aggregate. Copies the persisted-projection repository template (heat.repository.ts /
// political-event.repository.ts): a thin `*.repository.ts` owning the raw Drizzle reads/writes.
//
// `aggregateAvgHeatByDistrict` — ONE set-based SQL GROUP BY (design §3.1: "agrège AVG(building.heat) par
// district cross-player, 1 requête SQL GROUP BY, D4"). NO structural_state / ownership / player_id filter
// — every building city-wide contributes to its district's ambient hum (design does not qualify the
// aggregate; the "ambient" framing is deliberately city-wide, not scoped to any one player's operational
// state). A district with zero buildings produces NO row (Postgres GROUP BY never emits an empty group)
// — this IS the negation criterion (C1 AC6): `runHourlyTick` only folds districts this query returns.
//
// `foldHourlyObservation` — the per-cell atomic claim + EMA fold (design §3.1). Mirrors
// `political-event.repository.ts`'s `claimGameDay` idiom (a `SELECT ... FOR UPDATE` row lock + a
// conditional write inside ONE transaction) applied PER CELL instead of a city-global singleton: the
// city-sim engine is per-player-clocked (every player's own HOURLY boundary crossing fires
// CONSTANT_HUM_CELL_TICK), so this cell must fold exactly ONCE per real hour boundary even when several
// players' firings land on the SAME (district, hour_of_week) the same tick pass. `last_updated_game_day`
// is the row-local watermark: a fixed cell only recurs once per game_day (hour_of_week wraps weekly), so
// "already updated THIS game_day" == "already updated THIS exact hour" — no separate singleton table
// needed (unlike political_calendar_state, which has no natural per-row key to hang the watermark on).
//
// Determinism: the fold is a pure function of (observed heat, existing cell state, alpha) — no
// Math.random(), no Date.now() in any value written.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import { constantHumCell } from '../../db/schema/ambient_world';

/** One district's cross-player average `building.heat` this tick (design §3.1). */
export interface DistrictHeatObservation {
  readonly districtId: number;
  readonly avgHeat: number;
}

/** Result of one `foldHourlyObservation` call (see file header for the idempotency contract). */
export interface FoldResult {
  /** `false` iff this call lost the per-cell claim (a 2nd/later player's firing for the SAME exact hour
   *  — a genuine no-op, not an error). */
  readonly folded: boolean;
  readonly ema: number;
  readonly sampleCount: number;
}

@Injectable()
export class ConstantHumRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * ONE set-based query: `AVG(buildings.heat)` GROUP BY district (via the buildings → blocks → districts
   * JOIN, `heat.repository.ts`'s own idiom). Ordered by `district_id` for deterministic batching.
   */
  async aggregateAvgHeatByDistrict(): Promise<readonly DistrictHeatObservation[]> {
    const rows = await this.db
      .select({
        district_id: blocks.district_id,
        avg_heat: sql<number>`avg(${building.heat})`,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .groupBy(blocks.district_id)
      .orderBy(blocks.district_id);
    return rows.map((r) => ({ districtId: Number(r.district_id), avgHeat: Number(r.avg_heat) }));
  }

  /**
   * The per-cell atomic claim + EMA fold (see file header). First-ever fold for a cell inits the EMA AT
   * the observation (design §3.1: "premier fold (cell inexistante) → ema = observed — init à
   * l'observation, pas de warm-up contre 0"); every subsequent fold applies
   * `ema' = alpha × observed + (1 − alpha) × ema`.
   */
  async foldHourlyObservation(
    districtId: number,
    hourOfWeek: number,
    observedHeat: number,
    gameDay: number,
    alpha: number,
  ): Promise<FoldResult> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          baseline_heat_ema: constantHumCell.baseline_heat_ema,
          sample_count: constantHumCell.sample_count,
          last_updated_game_day: constantHumCell.last_updated_game_day,
        })
        .from(constantHumCell)
        .where(and(eq(constantHumCell.district_id, districtId), eq(constantHumCell.hour_of_week, hourOfWeek)))
        .for('update')
        .limit(1);
      const existing = rows[0];

      // Already folded THIS exact hour (a 2nd/later player's firing for the SAME boundary) — no-op.
      if (existing && existing.last_updated_game_day === gameDay) {
        return { folded: false, ema: Number(existing.baseline_heat_ema), sampleCount: existing.sample_count };
      }

      if (!existing) {
        await tx.insert(constantHumCell).values({
          district_id: districtId,
          hour_of_week: hourOfWeek,
          baseline_heat_ema: String(observedHeat),
          sample_count: 1,
          last_updated_game_day: gameDay,
        });
        return { folded: true, ema: observedHeat, sampleCount: 1 };
      }

      const newEma = alpha * observedHeat + (1 - alpha) * Number(existing.baseline_heat_ema);
      const newSampleCount = existing.sample_count + 1;
      await tx
        .update(constantHumCell)
        .set({
          baseline_heat_ema: String(newEma),
          sample_count: newSampleCount,
          last_updated_game_day: gameDay,
          updated_at: sql`now()`,
        })
        .where(and(eq(constantHumCell.district_id, districtId), eq(constantHumCell.hour_of_week, hourOfWeek)));
      return { folded: true, ema: newEma, sampleCount: newSampleCount };
    });
  }

  /**
   * BO diagnostic (04g-A C3, S8): every `constant_hum_cell` row for one district, ordered by
   * `hour_of_week` (≤168 entries — the structural cap, design §3.1). RAW `baseline_heat_ema` (ops
   * diagnostic — never surfaced to a player, `ambient-admin.controller.ts`).
   */
  async listCellsForDistrict(districtId: number): Promise<
    readonly { hourOfWeek: number; baselineHeatEma: number; sampleCount: number; lastUpdatedGameDay: number }[]
  > {
    const rows = await this.db
      .select({
        hour_of_week: constantHumCell.hour_of_week,
        baseline_heat_ema: constantHumCell.baseline_heat_ema,
        sample_count: constantHumCell.sample_count,
        last_updated_game_day: constantHumCell.last_updated_game_day,
      })
      .from(constantHumCell)
      .where(eq(constantHumCell.district_id, districtId))
      .orderBy(constantHumCell.hour_of_week);
    return rows.map((r) => ({
      hourOfWeek: r.hour_of_week,
      baselineHeatEma: Number(r.baseline_heat_ema),
      sampleCount: r.sample_count,
      lastUpdatedGameDay: r.last_updated_game_day,
    }));
  }
}

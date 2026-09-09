// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `deal_leks` table — R9.3:
//             this READS the schema + INSERT/UPDATE/DELETEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_11_deal_lek.md §États LekScore / §Sparse storage
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekRepository` — the persisted access layer over `deal_leks` (table created in migration `0005_city_state.sql`,
// already migrated; PK (player_id, tile_id) — Inv 1 SPARSE storage: only tiles with score>0 exist as rows, never a
// pre-seeded 600-row grid). Copies the buffer-bloat / inspection persisted-system repository template: a thin
// `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service that
// holds the per-tick logic.
//
// R9.3: 09 is the source of truth for `deal_leks`. This file imports the EXISTING schema (dealLek) and never
// re-declares it. The runtime role app_rw has SELECT/INSERT (0005 grant) + UPDATE/DELETE (`0013_app_role.sql` grant
// lists `deal_leks`) — this repository uses exactly SELECT/INSERT/UPDATE.
//
// PERSISTED COLUMNS (schema_city_state.ts deal_leks): player_id uuid, tile_id int, lek_score int (default 0),
// controller_org_id int NOT NULL, deals_this_week int (default 0), contest_pressure int (default 0). The richer
// LekScore struct fields (control_state / presence buckets / weeks_without_deals / tribute_split / day_phase_modifier)
// are NOT columns → DERIVED in-memory by the service (see deal-lek.service.ts). The repository persists ONLY what the
// table has.
//
// SPARSE LAZY-CREATE (Inv 1 — the buffer-bloat lazy-create precedent): a lek is FORMED on a congested block-tile by
// `formLeks` — a SINGLE durable, race-safe `INSERT ... ON CONFLICT DO UPDATE` that creates the row (or bumps an
// existing one) only while the player's active-lek count is under the lek_tile_count bound. NOT a per-row await loop.
//
// BATCHED WRITES (the template the persisted systems copy): `applyWeekly` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch — NOT a per-row loop. Atomic, all-or-nothing. All values
// are PARAMETERIZED bind params (no string interpolation). The recomputed ints respect the schema int columns.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { dealLek } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';

/**
 * The lek_score upper bound (system_11 §États LekScore — `uint8 score 0–100`). The DB column is a plain int, so
 * the score cap is upheld APPLICATIVELY: the lazy-create / bump clamps to LEAST(100, …) and the weekly decay
 * clamps in the service. Without the cap, the continuous flow-congestion deal stream would grow lek_score
 * unbounded (the flow sim feeds a tile every time its population re-crosses the congestion boundary). 100 = the
 * canonical uint8 score ceiling (Inv 2 — score decays from 100 toward 0).
 */
export const LEK_SCORE_MAX = 100;

/** A persisted deal_lek row (the columns the 2 Hz / weekly ticks read/write — Inv 1 sparse). */
export interface DealLekRow {
  tile_id: number;
  /** The district the tile belongs to (JOINed from blocks — the per-district projection identity). */
  district_id: number;
  /** The lek attractor score (Inv 2 — decays weekly; internal int, never exposed raw — R2.2). */
  lek_score: number;
  /** The org extracting the tribute (NOT NULL — the player-org convention 0 for organic leks; rivals 1..4). */
  controller_org_id: number;
  /** Deals accumulated since the last weekly tick (Inv 2 input; internal int, never exposed raw). */
  deals_this_week: number;
  /** Current contestation pressure 0..100 (Inv 6 — maps to CONTROLLED/CONTESTED; internal int, never exposed raw). */
  contest_pressure: number;
}

/** A per-tile lek formation/bump (the 2 Hz lazy-create input — a congested tile gains score + a deal). */
export interface LekFormation {
  tile_id: number;
  /** How much to add to lek_score for this tile this batch (the day-phase-weighted accrual). */
  score_delta: number;
  /** How many deal proxies to add to deals_this_week for this tile this batch. */
  deals_delta: number;
  /** The controller org to stamp on a NEWLY-formed lek (ignored if the row already exists — keep its controller). */
  controller_org_id: number;
}

/** A per-tile weekly mutation (the decay/death/re-rank tick output — the persisted columns it rewrites). */
export interface WeeklyMutation {
  tile_id: number;
  lek_score: number;
  deals_this_week: number;
  contest_pressure: number;
}

@Injectable()
export class DealLekRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many active deal_leks rows the player has (the sparse-row count — the lek_tile_count bound input). */
  async countLeks(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(dealLek)
      .where(eq(dealLek.player_id, playerId));
    return rows[0]?.n ?? 0;
  }

  /**
   * All of a player's active leks (the per-tick set + the WEEKLY input). EXPLICIT column list, JOINs the global
   * `blocks` table (deal_leks.tile_id → blocks.id) to resolve the host district, ordered by tile_id for
   * deterministic batching. Returns [] when the player has no leks (the organic sparse-storage shape).
   */
  async listLeks(playerId: string): Promise<DealLekRow[]> {
    const rows = await this.db
      .select({
        tile_id: dealLek.tile_id,
        district_id: blocks.district_id,
        lek_score: dealLek.lek_score,
        controller_org_id: dealLek.controller_org_id,
        deals_this_week: dealLek.deals_this_week,
        contest_pressure: dealLek.contest_pressure,
      })
      .from(dealLek)
      .innerJoin(blocks, eq(blocks.id, dealLek.tile_id))
      .where(eq(dealLek.player_id, playerId))
      .orderBy(dealLek.tile_id);
    return rows.map((r) => this.toRow(r));
  }

  /**
   * All of a player's active leks IN one district (the projection read — same shape as listLeks, narrowed to a
   * district via the blocks JOIN). Returns [] for a district with no leks (the controller projects an empty
   * per-district payload — the organic sparse-storage shape).
   */
  async listLeksForDistrict(playerId: string, districtId: number): Promise<DealLekRow[]> {
    const rows = await this.db
      .select({
        tile_id: dealLek.tile_id,
        district_id: blocks.district_id,
        lek_score: dealLek.lek_score,
        controller_org_id: dealLek.controller_org_id,
        deals_this_week: dealLek.deals_this_week,
        contest_pressure: dealLek.contest_pressure,
      })
      .from(dealLek)
      .innerJoin(blocks, eq(blocks.id, dealLek.tile_id))
      .where(and(eq(dealLek.player_id, playerId), eq(blocks.district_id, districtId)))
      .orderBy(dealLek.tile_id);
    return rows.map((r) => this.toRow(r));
  }

  /**
   * FORM/BUMP leks from congested block-tiles (Inv 1 — sparse lazy-create, bounded by lek_tile_count). A SINGLE
   * durable, race-safe `INSERT ... ON CONFLICT DO UPDATE` per batch (NOT a per-row loop): each formation either
   * creates a new row (lek_score = score_delta, controller_org_id stamped, deals_this_week = deals_delta) or bumps
   * an existing row (lek_score += score_delta, deals_this_week += deals_delta — the existing controller is KEPT).
   *
   * THE lek_tile_count BOUND (Inv 1): the caller passes only as many NEW-tile formations as fit under the bound
   * (the service caps the new-tile set before calling — it knows the current count + the bound). Formations for
   * tiles that ALREADY exist always apply (bumping an existing lek never grows the row count). The advisory lock
   * serializes the per-player form across connections so two concurrent ticks can't blow past the bound.
   */
  async formLeks(playerId: string, formations: LekFormation[]): Promise<void> {
    if (formations.length === 0) return;
    const valueRows = formations.map(
      (f) =>
        sql`(${playerId}::uuid, ${f.tile_id}::int, ${f.score_delta}::int, ${f.controller_org_id}::int, ${f.deals_delta}::int)`,
    );
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${dealLek} (player_id, tile_id, lek_score, controller_org_id, deals_this_week, contest_pressure)
      SELECT v.player_id, v.tile_id, LEAST(${LEK_SCORE_MAX}, v.score_delta), v.controller_org_id, v.deals_delta, 0
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(player_id, tile_id, score_delta, controller_org_id, deals_delta)
      ON CONFLICT (player_id, tile_id) DO UPDATE
        SET lek_score = LEAST(${LEK_SCORE_MAX}, ${dealLek.lek_score} + EXCLUDED.lek_score),
            deals_this_week = ${dealLek.deals_this_week} + EXCLUDED.deals_this_week
    `);
  }

  /**
   * Persist a batch of per-tile WEEKLY mutations (decay/death/re-rank — Inv 2/5) in ONE set-based atomic
   * `UPDATE ... FROM (VALUES …)` statement — NOT a per-row loop. Updates lek_score (decayed), deals_this_week
   * (reset to 0), contest_pressure (updated). All values are PARAMETERIZED bind params (no string interpolation).
   * The WHERE pins the update to the player + the tile id (never touches another player's rows). control_state /
   * weeks_without_deals are NOT columns (DERIVED in-memory) so they are not persisted here.
   */
  async applyWeekly(playerId: string, mutations: WeeklyMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) => sql`(${m.tile_id}::int, ${m.lek_score}::int, ${m.deals_this_week}::int, ${m.contest_pressure}::int)`,
    );
    await this.db.execute(sql`
      UPDATE ${dealLek} AS dl
      SET lek_score = v.lek_score,
          deals_this_week = v.deals_this_week,
          contest_pressure = v.contest_pressure
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(tile_id, lek_score, deals_this_week, contest_pressure)
      WHERE dl.player_id = ${playerId}::uuid AND dl.tile_id = v.tile_id
    `);
  }

  /** Map a raw selected row → the typed DealLekRow. */
  private toRow(r: {
    tile_id: number;
    district_id: number;
    lek_score: number;
    controller_org_id: number;
    deals_this_week: number;
    contest_pressure: number;
  }): DealLekRow {
    return {
      tile_id: r.tile_id,
      district_id: r.district_id,
      lek_score: r.lek_score,
      controller_org_id: r.controller_org_id,
      deals_this_week: r.deals_this_week,
      contest_pressure: r.contest_pressure,
    };
  }
}

// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `district_cohesion`
//             table — R9.3: this READS the schema + INSERT/UPDATEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_5_cohesion_permafrost.md §États DistrictCohesion
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// `CohesionPermafrostRepository` — the persisted access layer over `district_cohesion` (table created in
// migration `0005_city_state.sql`, already migrated; 18 rows/player, PK (player_id, district_id)). Copies the
// PatrolDoctrineRepository persisted-system template: a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with a thin service that holds the nightly tick logic.
//
// R9.3: 09 is the source of truth for `district_cohesion`. This file imports the EXISTING schema
// (districtCohesion) and never re-declares it. The runtime role app_rw has SELECT/INSERT (0005 grant) +
// UPDATE/DELETE (`0013_app_role.sql` grant lists `district_cohesion`) — this repository uses exactly
// SELECT/INSERT/UPDATE.
//
// COLUMN MODEL (system_5 §États DistrictCohesion struct; schema_city_state.ts): the table stores `cohesion`
// (real default 0.7), `thaw_threshold_current` + `thaw_threshold_baseline` (real default 0.55),
// `last_thaw_event_at` (timestamptz null), `active_informant_count` (int default 0), `permanent_marginal_flag`
// (bool default false), `legitimate_services_invest` (int default 0). The seed leaves ALL columns at their
// schema defaults (R9.3: 09 owns the defaults — the baseline 0.55 mirrors the cohesion_thaw_threshold_baseline
// tunable). The nightly tick reads the full row, computes the delta + thaw in JS, and writes the batch back.
//
// BATCHED WRITES (the template the persisted systems copy): every persistence call here is a SINGLE statement:
//   - `seedDistricts`  : ONE multi-row INSERT, race-safe via per-player advisory lock + NOT EXISTS guard.
//   - `applyMutations` : ONE set-based `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch (≤18 rows) —
//                        NOT a per-row await loop. Atomic, all-or-nothing. All values are PARAMETERIZED bind
//                        params (no string interpolation). last_thaw_event_at uses a NULL marker + COALESCE so a
//                        tick that does NOT thaw a district preserves its prior thaw timestamp.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { districtCohesion } from '../../db/schema/city_state';

/** A district_cohesion tick-state row — the hot-path projection (the columns the nightly tick reads/writes). */
export interface DistrictCohesionState {
  district_id: number;
  /** Current cohesion value [0,1] (the raw internal scalar — NEVER escapes the projection; P5). */
  cohesion: number;
  /** The ratcheted thaw threshold (monotonically decreasing — Inv 3 irreversible). */
  thaw_threshold_current: number;
  /** The original threshold (backoffice reference; never modified post-init). */
  thaw_threshold_baseline: number;
  /** When the last thaw crossing happened (null if never thawed). */
  last_thaw_event_at: Date | null;
  /** Informants currently active in the district. */
  active_informant_count: number;
  /** Whether the threshold has crossed permanent_marginal_threshold (Inv 4 one-way gate). */
  permanent_marginal_flag: boolean;
  /** Player upkeep allocation [0–100] (the slider INPUT path is deferred Phase 1 — stays at default 0). */
  legitimate_services_invest: number;
}

/**
 * A per-district state mutation (the nightly tick output). cohesion / thaw_threshold_current /
 * active_informant_count / permanent_marginal_flag are always written; last_thaw_event_at is written ONLY on a
 * thaw (undefined → preserve the prior value). thaw_threshold_baseline + legitimate_services_invest are NEVER
 * mutated by the tick (baseline is init-only; the slider is a player-action setter, deferred Phase 1).
 */
export interface DistrictCohesionMutation {
  district_id: number;
  cohesion: number;
  thaw_threshold_current: number;
  active_informant_count: number;
  permanent_marginal_flag: boolean;
  /** Set ONLY on a thaw event this tick; undefined → preserve the prior last_thaw_event_at. */
  last_thaw_event_at?: Date;
}

@Injectable()
export class CohesionPermafrostRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many district_cohesion rows the player already has (drives the lazy-seed decision; cheap COUNT). */
  async countDistricts(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(districtCohesion)
      .where(eq(districtCohesion.player_id, playerId));
    return rows[0]?.n ?? 0;
  }

  /**
   * Lazily seed the player's `districtCount` (18) district_cohesion rows in a SINGLE durable, race-safe
   * statement. Each row starts at its schema defaults (cohesion 0.7, thaw_threshold_current/baseline 0.55,
   * active_informant_count 0, permanent_marginal_flag false, legitimate_services_invest 0 — R9.3: 09 owns the
   * defaults; the 0.55 baseline mirrors the cohesion_thaw_threshold_baseline tunable).
   *
   * DURABLE IDEMPOTENCY (mirrors PatrolDoctrineRepository.seedSixPrecincts — the per-process Set guard in the
   * service is a fast-path only). Two guards make this safe even if two instances run a player's FIRST tick
   * concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player seed across connections.
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM district_cohesion WHERE player_id = $pid)` — the all-or-nothing guard:
   *      the loser of the race sees the winner's 18 rows committed and inserts ZERO (never 36 rows).
   * One statement, parameterized (cohesion/thresholds/flags take their schema defaults).
   */
  async seedDistricts(playerId: string, districtIds: number[]): Promise<void> {
    if (districtIds.length === 0) return;
    const valueRows = districtIds.map((did) => sql`(${playerId}::uuid, ${did}::int)`);
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${districtCohesion} (player_id, district_id)
      SELECT v.player_id, v.district_id
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(player_id, district_id)
      WHERE NOT EXISTS (SELECT 1 FROM ${districtCohesion} WHERE ${districtCohesion.player_id} = ${playerId}::uuid)
    `);
  }

  /**
   * All 18 districts' tick state for a player — EXPLICIT column list, ordered by district_id for deterministic
   * batching. The hot tick path reads this, computes deltas/thaw in JS, and writes the batch back via
   * applyMutations.
   */
  async listState(playerId: string): Promise<DistrictCohesionState[]> {
    const rows = await this.db
      .select({
        district_id: districtCohesion.district_id,
        cohesion: districtCohesion.cohesion,
        thaw_threshold_current: districtCohesion.thaw_threshold_current,
        thaw_threshold_baseline: districtCohesion.thaw_threshold_baseline,
        last_thaw_event_at: districtCohesion.last_thaw_event_at,
        active_informant_count: districtCohesion.active_informant_count,
        permanent_marginal_flag: districtCohesion.permanent_marginal_flag,
        legitimate_services_invest: districtCohesion.legitimate_services_invest,
      })
      .from(districtCohesion)
      .where(eq(districtCohesion.player_id, playerId))
      .orderBy(districtCohesion.district_id);
    return rows.map((r) => this.toState(r));
  }

  /** A single district's cohesion state (used by the projection — reads ONE district's row). */
  async getState(playerId: string, districtId: number): Promise<DistrictCohesionState | null> {
    const rows = await this.db
      .select({
        district_id: districtCohesion.district_id,
        cohesion: districtCohesion.cohesion,
        thaw_threshold_current: districtCohesion.thaw_threshold_current,
        thaw_threshold_baseline: districtCohesion.thaw_threshold_baseline,
        last_thaw_event_at: districtCohesion.last_thaw_event_at,
        active_informant_count: districtCohesion.active_informant_count,
        permanent_marginal_flag: districtCohesion.permanent_marginal_flag,
        legitimate_services_invest: districtCohesion.legitimate_services_invest,
      })
      .from(districtCohesion)
      .where(and(eq(districtCohesion.player_id, playerId), eq(districtCohesion.district_id, districtId)))
      .limit(1);
    const r = rows[0];
    return r ? this.toState(r) : null;
  }

  /**
   * Persist a batch of per-district mutations in ONE set-based atomic `UPDATE ... FROM (VALUES …)` statement —
   * NOT a per-row loop. The nightly tick mutates ≤18 rows; this collapses that to a SINGLE round-trip,
   * all-or-nothing (a mid-batch failure can't leave a half-updated district set). All values are PARAMETERIZED
   * bind params (no string interpolation). `last_thaw_event_at` uses a NULL marker + COALESCE so a district NOT
   * thawing this tick preserves its prior thaw timestamp (the tick only sets it on an actual thaw). The DB
   * CHECK `cohesion real [0..1]` is upheld by the caller (the service clamps cohesion to [0,1]).
   */
  async applyMutations(playerId: string, mutations: DistrictCohesionMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map((m) => {
      const lastThaw =
        m.last_thaw_event_at === undefined
          ? sql`NULL::timestamptz`
          : sql`${m.last_thaw_event_at.toISOString()}::timestamptz`;
      return sql`(${m.district_id}::int, ${m.cohesion}::real, ${m.thaw_threshold_current}::real, ${m.active_informant_count}::int, ${m.permanent_marginal_flag}::boolean, ${lastThaw})`;
    });
    await this.db.execute(sql`
      UPDATE ${districtCohesion} AS dc
      SET cohesion = v.cohesion,
          thaw_threshold_current = v.thaw_threshold_current,
          active_informant_count = v.active_informant_count,
          permanent_marginal_flag = v.permanent_marginal_flag,
          last_thaw_event_at = COALESCE(v.last_thaw_event_at, dc.last_thaw_event_at)
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(district_id, cohesion, thaw_threshold_current, active_informant_count, permanent_marginal_flag, last_thaw_event_at)
      WHERE dc.player_id = ${playerId}::uuid AND dc.district_id = v.district_id
    `);
  }

  /** Map a raw selected row → the DistrictCohesionState struct (numeric/bool normalization). */
  private toState(r: {
    district_id: number;
    cohesion: number;
    thaw_threshold_current: number;
    thaw_threshold_baseline: number;
    last_thaw_event_at: Date | null;
    active_informant_count: number;
    permanent_marginal_flag: boolean;
    legitimate_services_invest: number;
  }): DistrictCohesionState {
    return {
      district_id: r.district_id,
      cohesion: r.cohesion,
      thaw_threshold_current: r.thaw_threshold_current,
      thaw_threshold_baseline: r.thaw_threshold_baseline,
      last_thaw_event_at: r.last_thaw_event_at,
      active_informant_count: r.active_informant_count,
      permanent_marginal_flag: r.permanent_marginal_flag,
      legitimate_services_invest: r.legitimate_services_invest,
    };
  }
}

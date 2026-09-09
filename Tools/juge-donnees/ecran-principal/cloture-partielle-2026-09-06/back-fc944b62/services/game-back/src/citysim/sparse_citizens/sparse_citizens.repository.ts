// IMPLEMENTS: docs/tech/09_data_model/schema_sparse_citizens.md §2/§11 (the EXISTING migrated `rich_citizens`
//             table — R9.3: this READS the schema + INSERT/UPDATEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_2_sparse_citizens.md §États (RichCitizen composite)
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// `SparseCitizensRepository` — the persisted access layer over `rich_citizens` (table created in migration
// `0009_sparse_citizens.sql`, already migrated). This is the PERSISTED-SYSTEM TEMPLATE T4–T13 copy when their
// system has a Drizzle table (the counterpart to Flow Cells' in-memory store): a thin `*.repository.ts` that
// owns the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service that holds the
// tick logic.
//
// R9.3: 09 is the source of truth for `rich_citizens`. This file imports the EXISTING schema (richCitizenRow)
// and never re-declares it. The runtime role app_rw has SELECT on rich_citizens (0009 ships the table; the
// least-privilege role itself is provisioned in `0013_app_role.sql`, which GRANTs UPDATE/DELETE on
// rich_citizens to app_rw) — this repository uses exactly SELECT/INSERT/UPDATE.
//
// BATCHED WRITES (the template the 10 siblings copy): every persistence call here is a SINGLE statement —
//   - `insertMany`     : one multi-row INSERT, made race-safe via a per-player advisory lock + NOT EXISTS guard.
//   - `applyMutations` : ONE set-based `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch (NOT a per-row
//                        loop). Atomic: the 5-min tick mutates ~all 400 alive NPCs → one round-trip, all-or-nothing
//                        (a mid-batch failure can't leave a half-mutated population — upholds the determinism
//                        the service header claims). Values are PARAMETERIZED bind params (no string interpolation).
//   - `whisperStateCounts` / `listAliveTickState` / `countAlive` : single grouped/filtered reads.
//
// LAZILY-LOADED biography: the `biography` jsonb column (the JournalEntry ring buffer) is EXCLUDED from the
// tick/list column lists (system_2 §États: "Accès lazily loaded depuis biography_journal_ref"). The hot tick
// path never reads/writes it; a dedicated journal accessor (BO inspect / journal panel) would load it on
// demand — not materialised here (no consumer day-1; resolved-when-consumed, honest-no-dead-code).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { richCitizenRow, type CitizenDemographicEnumTs } from '../../db/schema/sparse_citizens';

/** A RichNPC tick-state row — the hot-path projection of `rich_citizens` (biography EXCLUDED — lazy). */
export interface RichCitizenTickState {
  citizen_id: string;
  demographic: CitizenDemographicEnumTs;
  home_block_id: number;
  work_block_id: number;
  leisure_block_id: number;
  schedule_template_id: number;
  satisfaction: number;
  whisper_pressure: number;
}

/** A new RichNPC to seed (the lazy per-player population). satisfaction/whisper_pressure use schema defaults. */
export interface RichCitizenSeed {
  player_id: string;
  demographic: CitizenDemographicEnumTs;
  home_block_id: number;
  work_block_id: number;
  leisure_block_id: number;
  schedule_template_id: number;
}

/** A per-tick state mutation for one RichNPC (satisfaction + whisper_pressure are the day-1 mutable fields). */
export interface RichCitizenMutation {
  citizen_id: string;
  satisfaction: number;
  whisper_pressure: number;
}

/**
 * Per-player whisper-state aggregate counts (BO-only raw; the projection buckets these — never exposed raw).
 * Split into the spec's canonical 3 bands at the two boundaries (==0 and ≥threshold). total == dormant +
 * pressure + active.
 */
export interface WhisperStateCounts {
  total: number;
  dormant: number; // whisper_pressure == 0
  pressure: number; // 0 < whisper_pressure < whisper_activation_threshold
  active: number; // whisper_pressure >= whisper_activation_threshold
}

@Injectable()
export class SparseCitizensRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many ALIVE RichNPCs the player already has (drives the lazy-seed decision; cheap COUNT). */
  async countAlive(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(richCitizenRow)
      .where(and(eq(richCitizenRow.player_id, playerId), eq(richCitizenRow.alive, true)));
    return rows[0]?.n ?? 0;
  }

  /**
   * Bulk-insert the lazily-seeded RichNPC population in a SINGLE durable, race-safe statement
   * (satisfaction/whisper_pressure/alive/biography all take their schema defaults).
   *
   * DURABLE IDEMPOTENCY (Fix: the per-process Set guard in the service is a fast-path only — it does NOT
   * survive multi-instance/restart). Two guards make this safe even if two instances run a player's FIRST
   * tick concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player seed across connections/
   *      instances (released automatically at end of the implicit statement transaction).
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM rich_citizens WHERE player_id = $pid)` — the all-or-nothing guard:
   *      the loser of the race sees the winner's rows committed and inserts ZERO (never 2× → 800 rows).
   * One statement, parameterized (NO string interpolation of values — every value is a bind param).
   */
  async insertMany(seeds: RichCitizenSeed[]): Promise<void> {
    if (seeds.length === 0) return;
    const playerId = seeds[0].player_id;

    // Per-row parameterized VALUES tuple (column order: player/home/work/leisure/demographic/schedule).
    const valueRows = seeds.map(
      (s) =>
        sql`(${s.player_id}::uuid, ${s.home_block_id}::int, ${s.work_block_id}::int, ${s.leisure_block_id}::int, ${s.demographic}::citizen_demographic, ${s.schedule_template_id}::int)`,
    );

    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${richCitizenRow} (player_id, home_block_id, work_block_id, leisure_block_id, demographic, schedule_template_id)
      SELECT v.player_id, v.home_block_id, v.work_block_id, v.leisure_block_id, v.demographic, v.schedule_template_id
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(player_id, home_block_id, work_block_id, leisure_block_id, demographic, schedule_template_id)
      WHERE NOT EXISTS (SELECT 1 FROM ${richCitizenRow} WHERE ${richCitizenRow.player_id} = ${playerId}::uuid)
    `);
  }

  /**
   * The ALIVE RichNPCs' tick state for a player — EXPLICIT column list, `biography` EXCLUDED (lazy-loaded).
   * This is the hot-path read the FIVE_MIN tick mutates. Ordered by citizen_id for deterministic batching.
   */
  async listAliveTickState(playerId: string): Promise<RichCitizenTickState[]> {
    return this.db
      .select({
        citizen_id: richCitizenRow.citizen_id,
        demographic: richCitizenRow.demographic,
        home_block_id: richCitizenRow.home_block_id,
        work_block_id: richCitizenRow.work_block_id,
        leisure_block_id: richCitizenRow.leisure_block_id,
        schedule_template_id: richCitizenRow.schedule_template_id,
        satisfaction: richCitizenRow.satisfaction,
        whisper_pressure: richCitizenRow.whisper_pressure,
      })
      .from(richCitizenRow)
      .where(and(eq(richCitizenRow.player_id, playerId), eq(richCitizenRow.alive, true)))
      .orderBy(richCitizenRow.citizen_id);
  }

  /**
   * Persist a batch of per-RichNPC state mutations (satisfaction + whisper_pressure) in ONE set-based atomic
   * `UPDATE ... FROM (VALUES …)` statement — NOT a per-row loop. The 5-min tick mutates ~all 400 alive NPCs
   * every tick; this collapses that to a SINGLE round-trip, all-or-nothing (a mid-batch failure can't leave a
   * half-mutated population). app_rw has UPDATE on rich_citizens (`0013_app_role.sql` grant). The CHECK
   * [0..100] constraints are upheld by the caller (the service clamps before calling). This is the BATCHED
   * write the 10 sibling persisted systems copy. Values are PARAMETERIZED bind params (no string interpolation).
   */
  async applyMutations(mutations: RichCitizenMutation[]): Promise<void> {
    if (mutations.length === 0) return;

    // Per-row parameterized VALUES tuple (citizen_id, satisfaction, whisper_pressure).
    const valueRows = mutations.map(
      (m) => sql`(${m.citizen_id}::uuid, ${m.satisfaction}::int, ${m.whisper_pressure}::int)`,
    );

    await this.db.execute(sql`
      UPDATE ${richCitizenRow} AS rc
      SET satisfaction = v.satisfaction, whisper_pressure = v.whisper_pressure
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(citizen_id, satisfaction, whisper_pressure)
      WHERE rc.citizen_id = v.citizen_id
    `);
  }

  /**
   * Per-player whisper-state aggregate (ALIVE citizens). Returns RAW counts split into the spec's canonical
   * 3 bands at the two boundaries (==0 and ≥threshold) — this is the BO-only substrate the ProjectionService
   * buckets into qualitative magnitude bands (the raw counts NEVER leave the projection layer; P5). A single
   * grouped query with FILTERed counts (no per-row round-trips):
   *   - DORMANT  = whisper_pressure == 0
   *   - PRESSURE = 0 < whisper_pressure < threshold
   *   - ACTIVE   = whisper_pressure >= threshold
   */
  async whisperStateCounts(playerId: string, threshold: number): Promise<WhisperStateCounts> {
    const rows = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        dormant: sql<number>`count(*) FILTER (WHERE ${richCitizenRow.whisper_pressure} = 0)::int`,
        pressure: sql<number>`count(*) FILTER (WHERE ${richCitizenRow.whisper_pressure} > 0 AND ${richCitizenRow.whisper_pressure} < ${threshold})::int`,
        active: sql<number>`count(*) FILTER (WHERE ${richCitizenRow.whisper_pressure} >= ${threshold})::int`,
      })
      .from(richCitizenRow)
      .where(and(eq(richCitizenRow.player_id, playerId), eq(richCitizenRow.alive, true)));
    return {
      total: rows[0]?.total ?? 0,
      dormant: rows[0]?.dormant ?? 0,
      pressure: rows[0]?.pressure ?? 0,
      active: rows[0]?.active ?? 0,
    };
  }
}

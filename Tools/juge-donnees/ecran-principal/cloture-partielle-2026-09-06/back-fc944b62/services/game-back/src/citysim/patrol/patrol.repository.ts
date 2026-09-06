// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `patrol_observation_queues`
//             table — R9.3: this READS the schema + INSERT/UPDATEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_4_patrol_doctrine.md §États ObservationQueue / Observation
//             -- session:2026-06-02 (Phase 1 Task 5) --
//
// `PatrolDoctrineRepository` — the persisted access layer over `patrol_observation_queues` (table created in
// migration `0005_city_state.sql`, already migrated; 6 rows/player). Copies the PoliceMemoryRepository
// persisted-system template: a thin `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column
// lists, paired with a thin service that holds the tick logic.
//
// R9.3: 09 is the source of truth for `patrol_observation_queues`. This file imports the EXISTING schema
// (patrolObservationQueue) and never re-declares it. The runtime role app_rw has SELECT/INSERT (0005 grant) +
// UPDATE/DELETE (`0013_app_role.sql` grant lists `patrol_observation_queues`) — this repository uses exactly
// SELECT/INSERT/UPDATE.
//
// RING BUFFER MODEL (system_4 §États ObservationQueue): the table stores `entries` (jsonb array of Observation
// objects — the ACTIVE entries currently in the ring), `head` (read pointer — total dropped/consumed entries),
// and `tail` (write pointer — total appended entries). The ACTIVE count is jsonb_array_length(entries) ==
// tail − head. The overflow policy (drop lowest-severity-first, then FIFO) + the 12h flush operate on the JS
// `entries` array in the service; the repository persists the whole array + the head/tail pointers. The
// observation_queue_size cap (256) is upheld by the SERVICE (it trims the array before writing); a CHECK PG on
// jsonb_array_length is deferred per gdd/14 T.db.city_state.patrol_obs_ring_buffer_cap (jsonb_array_length is
// expensive — validated applicatively day-1, the registry note).
//
// BATCHED WRITES (the template the persisted systems copy): every persistence call here is a SINGLE statement:
//   - `seedSixPrecincts` : ONE multi-row INSERT, race-safe via per-player advisory lock + NOT EXISTS guard.
//   - `applyQueues`      : ONE set-based `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch (≤6 rows) —
//                          NOT a per-row await loop. Atomic, all-or-nothing. entries passed as a jsonb bind param.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { patrolObservationQueue } from '../../db/schema/city_state';

/**
 * One persisted Observation entry in a precinct's ring buffer (system_4 §États Observation — the 12-byte
 * struct, modelled as a compact jsonb object day-1). Numeric severity is the raw uint8 1..5 internal scalar
 * (P5: this NEVER escapes the projection — the cross-system PatrolObservationEvent carries a qualitative band).
 */
export interface ObservationEntry {
  /** The block the patrol observed (maps to a suspicion_map tile in System 3 — the lossy belief unit). */
  block_id: number;
  /** The district the block belongs to (the precinct owns it — used for the cross-system event payload). */
  district_id: number;
  /** Observation severity 1..5 (system_4 §États Observation.severity — the raw internal scalar). */
  severity: number;
  /** The in-game minute the observation was recorded on (temporal-proximity clustering input). */
  game_minute: number;
}

/** A precinct's ring-buffer state — the persisted columns the tick reads/writes. */
export interface PatrolQueueState {
  precinct_id: number;
  /** The ACTIVE entries currently in the ring (jsonb array). length == tail − head. */
  entries: ObservationEntry[];
  /** Read pointer — total entries consumed/dropped since seed (monotone). */
  head: number;
  /** Write pointer — total entries appended since seed (monotone). */
  tail: number;
}

/** A per-precinct queue mutation (the whole active entries array + the head/tail pointers). */
export interface PatrolQueueMutation {
  precinct_id: number;
  entries: ObservationEntry[];
  head: number;
  tail: number;
}

@Injectable()
export class PatrolDoctrineRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many patrol_observation_queues rows the player already has (drives the lazy-seed decision; cheap COUNT). */
  async countPrecincts(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(patrolObservationQueue)
      .where(eq(patrolObservationQueue.player_id, playerId));
    return rows[0]?.n ?? 0;
  }

  /**
   * Lazily seed the player's `precinctCount` (6) patrol_observation_queues rows in a SINGLE durable, race-safe
   * statement. Each row starts with an empty ring (`entries` = '[]', head = 0, tail = 0 — schema defaults).
   *
   * DURABLE IDEMPOTENCY (mirrors PoliceMemoryRepository.seedSixPrecincts — the per-process Set guard in the
   * service is a fast-path only). Two guards make this safe even if two instances run a player's FIRST tick
   * concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player seed across connections/instances.
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM patrol_observation_queues WHERE player_id = $pid)` — the all-or-nothing
   *      guard: the loser of the race sees the winner's 6 rows committed and inserts ZERO (never 12 rows).
   * One statement, parameterized (entries/head/tail take their schema defaults '[]'/0/0).
   */
  async seedSixPrecincts(playerId: string, precinctIds: number[]): Promise<void> {
    if (precinctIds.length === 0) return;
    const valueRows = precinctIds.map((pid) => sql`(${playerId}::uuid, ${pid}::int)`);
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${patrolObservationQueue} (player_id, precinct_id)
      SELECT v.player_id, v.precinct_id
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(player_id, precinct_id)
      WHERE NOT EXISTS (SELECT 1 FROM ${patrolObservationQueue} WHERE ${patrolObservationQueue.player_id} = ${playerId}::uuid)
    `);
  }

  /**
   * All 6 precinct queues' ring state for a player — EXPLICIT column list, ordered by precinct_id for
   * deterministic batching. `entries` comes back as a parsed jsonb array (drizzle maps jsonb → JS value). The
   * hot tick path reads this, appends/trims in JS, and writes the batch back via applyQueues.
   */
  async listQueues(playerId: string): Promise<PatrolQueueState[]> {
    const rows = await this.db
      .select({
        precinct_id: patrolObservationQueue.precinct_id,
        entries: patrolObservationQueue.entries,
        head: patrolObservationQueue.head,
        tail: patrolObservationQueue.tail,
      })
      .from(patrolObservationQueue)
      .where(eq(patrolObservationQueue.player_id, playerId))
      .orderBy(patrolObservationQueue.precinct_id);
    return rows.map((r) => ({
      precinct_id: r.precinct_id,
      entries: Array.isArray(r.entries) ? (r.entries as ObservationEntry[]) : [],
      head: r.head,
      tail: r.tail,
    }));
  }

  /** A single precinct's ring state (used by the projection — reads ONE precinct's queue). */
  async getQueue(playerId: string, precinctId: number): Promise<PatrolQueueState | null> {
    const rows = await this.db
      .select({
        precinct_id: patrolObservationQueue.precinct_id,
        entries: patrolObservationQueue.entries,
        head: patrolObservationQueue.head,
        tail: patrolObservationQueue.tail,
      })
      .from(patrolObservationQueue)
      .where(
        and(eq(patrolObservationQueue.player_id, playerId), eq(patrolObservationQueue.precinct_id, precinctId)),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      precinct_id: r.precinct_id,
      entries: Array.isArray(r.entries) ? (r.entries as ObservationEntry[]) : [],
      head: r.head,
      tail: r.tail,
    };
  }

  /**
   * Persist a batch of per-precinct queue mutations in ONE set-based atomic `UPDATE ... FROM (VALUES …)`
   * statement — NOT a per-row loop. The 30-min accumulation / 12h review mutate ≤6 rows; this collapses that
   * to a SINGLE round-trip, all-or-nothing (a mid-batch failure can't leave a half-updated queue set). The
   * `entries` array is passed as a jsonb bind param (JSON.stringify → ::jsonb cast — never string-interpolated
   * into the SQL). head/tail are int bind params. The observation_queue_size cap is upheld by the caller (the
   * service trims `entries` before calling). Values are PARAMETERIZED bind params (no string interpolation).
   */
  async applyQueues(playerId: string, mutations: PatrolQueueMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) =>
        sql`(${m.precinct_id}::int, ${JSON.stringify(m.entries)}::jsonb, ${m.head}::int, ${m.tail}::int)`,
    );
    await this.db.execute(sql`
      UPDATE ${patrolObservationQueue} AS pq
      SET entries = v.entries, head = v.head, tail = v.tail
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(precinct_id, entries, head, tail)
      WHERE pq.player_id = ${playerId}::uuid AND pq.precinct_id = v.precinct_id
    `);
  }
}

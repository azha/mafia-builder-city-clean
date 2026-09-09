// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `inspection_queues`
//             table — R9.3: this READS the schema + INSERT/UPDATEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_6_inspection_queue.md §États InspectionQueue / QueueEntry
//             -- session:2026-06-03 (Phase 1 Task 7) --
//
// `InspectionQueueRepository` — the persisted access layer over `inspection_queues` (table created in migration
// `0005_city_state.sql`, already migrated; 18 rows/player, PK (player_id, district_id) — Inv 1 per-district,
// never global). Copies the PatrolDoctrineRepository persisted-system template: a thin `*.repository.ts` owning
// the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service that holds the tick logic.
//
// R9.3: 09 is the source of truth for `inspection_queues`. This file imports the EXISTING schema
// (inspectionQueue) and never re-declares it. The runtime role app_rw has SELECT/INSERT (0005 grant) +
// UPDATE/DELETE (`0013_app_role.sql` grant lists `inspection_queues`) — this repository uses exactly
// SELECT/INSERT/UPDATE.
//
// QUEUE MODEL (system_6 §États InspectionQueue / QueueEntry): the GDD struct is a fixed `QueueEntry entries[32]`
// ring with an explicit `head` index. The MIGRATED 09 table stores `entries` as a jsonb ARRAY + a `length` int
// (no head column — schema_city_state.ts: entries jsonb, length int default 0, processing_rate_per_day int
// default 4, budget_modifier int default 0). So `head` is MODELLED as the FRONT of the array (entries[0] = next
// to dispatch — FIFO), and `length` == entries.length (kept in sync). This matches the patrol ring model
// (entries jsonb array, head/tail pointers) but System 6's migrated table has no head/tail columns, so the
// FIFO-from-front array IS the canonical persisted representation — the cap (inspection_queue_cap=32) is upheld
// by the SERVICE (overflow drop-low-first runs in JS before the write). A jsonb_array_length CHECK is deferred
// (the patrol precedent — jsonb_array_length is expensive; validated applicatively day-1).
//
// BATCHED WRITES (the template the persisted systems copy): every persistence call here is a SINGLE statement:
//   - `seedDistricts` : ONE multi-row INSERT, race-safe via per-player advisory lock + NOT EXISTS guard.
//   - `applyQueues`   : ONE set-based `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch (≤18 rows) —
//                       NOT a per-row await loop. Atomic, all-or-nothing. entries passed as a jsonb bind param.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { inspectionQueue } from '../../db/schema/city_state';
import type { ForensicKind } from '../../operational/forensic/forensic-severity';

/**
 * Closed priority bucket domain (system_6 Inv 2 — `priority_bucket` is an enum {LOW,MEDIUM,HIGH,CRITICAL},
 * NEVER a float). The GDD `report_severity 1..5` maps to these 4 buckets internally (R2.2). The integer values
 * order the buckets (LOW=0 .. CRITICAL=3) — used for the overflow drop-low-first comparison + the priority
 * decay step (CRITICAL→HIGH→MEDIUM→LOW).
 */
export type PriorityBucket = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * The entry-source domain (system_6 §États QueueEntry.source enum). ADDITIVE at C21:
 * the original 5 members are UNCHANGED; 'FORENSIC' is the 6th member added for §5 forensic
 * signaling (OQ-6). No DB migration needed: entries is a jsonb column; source is a TS-validated
 * string — there is no pgEnum or CHECK constraint on the source field (verified C21).
 *
 * 'FORENSIC' entries carry a `forensic_kind` discriminator (see QueueEntry.forensic_kind) that
 * tells the dispatcher at C22 which §4.3 consequence to fire.
 */
export type QueueEntrySource =
  | 'SCHEDULED'
  | 'INFORMANT'
  | 'FALSE_REPORT'
  | 'GENUINE_REPORT'
  | 'CASCADE'
  | 'FORENSIC';

/**
 * One persisted QueueEntry (system_6 §États QueueEntry — the 8-byte struct, modelled as a compact jsonb object
 * day-1). `priority_bucket` is the closed enum (Inv 2 — never a float / raw report_severity). FIFO ordering is
 * by array position (entries[0] = head = next to dispatch); within a priority dispatch reads from the front.
 */
export interface QueueEntry {
  /** The targeted building (maps to a suspicion_map tile in System 3 on a BPD referral — the lossy belief unit). */
  building_id: number;
  /** Priority bucket enum (Inv 2 — LOW/MEDIUM/HIGH/CRITICAL; the report_severity 1..5 maps here internally). */
  priority_bucket: PriorityBucket;
  /** Age since submission, in 12h dispatch ticks (the temporal ordering / priority-decay input). */
  age_in_ticks: number;
  /** The entry source enum (SCHEDULED / INFORMANT / FALSE_REPORT / GENUINE_REPORT / CASCADE / FORENSIC). */
  source: QueueEntrySource;
  /**
   * Forensic dispatch discriminator (C21 — OQ-6, ADDITIVE). Present ONLY when source === 'FORENSIC'.
   * Tells the C22 dispatcher which §4.3 consequence to fire at dispatch-time. Absent on all other sources
   * (the field is optional — existing SCHEDULED/INFORMANT/FALSE_REPORT/GENUINE_REPORT/CASCADE entries are
   * UNCHANGED and never carry this field). The jsonb column stores it transparently when present.
   *
   * Values: 'hard_audit' | 'effluent_inspection' | 'tail_passive' | 'tail_active' | 'tail_subpoena'.
   */
  forensic_kind?: ForensicKind;
  /** Internal fractional priority-decay accumulator (Phase D — descends a bucket when it reaches 1.0). NOT a
   *  priority float (Inv 2): the EXPOSED priority is always the enum; this is the decay timer, never surfaced. */
  decay_accumulator: number;
}

/** A district's inspection-queue state — the persisted columns the dispatch/cascade ticks read/write. */
export interface InspectionQueueState {
  district_id: number;
  /** The ACTIVE entries (jsonb array; entries[0] = head = next to dispatch). length == entries.length. */
  entries: QueueEntry[];
  /** Active entry count (kept == entries.length on every write). */
  length: number;
  /** Current dispatch rate per in-game day (REUSE inspection_processing_per_day; schema default 4). */
  processing_rate_per_day: number;
  /** Signed delta on the dispatch rate (surge > 0 / budget-cut < 0; schema default 0; City Hall events deferred). */
  budget_modifier: number;
}

/** A per-district queue mutation (the whole entries array + length + the rate columns). */
export interface InspectionQueueMutation {
  district_id: number;
  entries: QueueEntry[];
  length: number;
  processing_rate_per_day: number;
  budget_modifier: number;
}

@Injectable()
export class InspectionQueueRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many inspection_queues rows the player already has (drives the lazy-seed decision; cheap COUNT). */
  async countDistricts(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(inspectionQueue)
      .where(eq(inspectionQueue.player_id, playerId));
    return rows[0]?.n ?? 0;
  }

  /**
   * Lazily seed the player's `districtCount` (18) inspection_queues rows in a SINGLE durable, race-safe
   * statement. Each row starts with an empty queue (`entries` = '[]', length = 0, processing_rate_per_day = 4,
   * budget_modifier = 0 — the schema defaults; R9.3: 09 owns the defaults).
   *
   * DURABLE IDEMPOTENCY (mirrors PatrolDoctrineRepository.seedSixPrecincts — the per-process Set guard in the
   * service is a fast-path only). Two guards make this safe even if two instances run a player's FIRST tick
   * concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player seed across connections.
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM inspection_queues WHERE player_id = $pid)` — the all-or-nothing guard:
   *      the loser of the race sees the winner's 18 rows committed and inserts ZERO (never 36 rows).
   * One statement, parameterized (entries/length/rate/modifier take their schema defaults).
   */
  async seedDistricts(playerId: string, districtIds: number[]): Promise<void> {
    if (districtIds.length === 0) return;
    const valueRows = districtIds.map((did) => sql`(${playerId}::uuid, ${did}::int)`);
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${inspectionQueue} (player_id, district_id)
      SELECT v.player_id, v.district_id
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(player_id, district_id)
      WHERE NOT EXISTS (SELECT 1 FROM ${inspectionQueue} WHERE ${inspectionQueue.player_id} = ${playerId}::uuid)
    `);
  }

  /**
   * All 18 districts' queue state for a player — EXPLICIT column list, ordered by district_id for deterministic
   * batching. `entries` comes back as a parsed jsonb array (drizzle maps jsonb → JS value). The hot tick path
   * reads this, dispatches/decays/overflows in JS, and writes the batch back via applyQueues.
   */
  async listQueues(playerId: string): Promise<InspectionQueueState[]> {
    const rows = await this.db
      .select({
        district_id: inspectionQueue.district_id,
        entries: inspectionQueue.entries,
        length: inspectionQueue.length,
        processing_rate_per_day: inspectionQueue.processing_rate_per_day,
        budget_modifier: inspectionQueue.budget_modifier,
      })
      .from(inspectionQueue)
      .where(eq(inspectionQueue.player_id, playerId))
      .orderBy(inspectionQueue.district_id);
    return rows.map((r) => this.toState(r));
  }

  /** A single district's queue state (used by the projection — reads ONE district's queue). */
  async getQueue(playerId: string, districtId: number): Promise<InspectionQueueState | null> {
    const rows = await this.db
      .select({
        district_id: inspectionQueue.district_id,
        entries: inspectionQueue.entries,
        length: inspectionQueue.length,
        processing_rate_per_day: inspectionQueue.processing_rate_per_day,
        budget_modifier: inspectionQueue.budget_modifier,
      })
      .from(inspectionQueue)
      .where(and(eq(inspectionQueue.player_id, playerId), eq(inspectionQueue.district_id, districtId)))
      .limit(1);
    const r = rows[0];
    return r ? this.toState(r) : null;
  }

  /**
   * Persist a batch of per-district queue mutations in ONE set-based atomic `UPDATE ... FROM (VALUES …)`
   * statement — NOT a per-row loop. The dispatch / cascade ticks mutate ≤18 rows; this collapses that to a
   * SINGLE round-trip, all-or-nothing (a mid-batch failure can't leave a half-updated queue set). The `entries`
   * array is passed as a jsonb bind param (JSON.stringify → ::jsonb cast — never string-interpolated). length /
   * processing_rate_per_day / budget_modifier are int bind params. The inspection_queue_cap is upheld by the
   * caller (the service trims `entries` via the overflow policy before calling). Values are PARAMETERIZED bind
   * params (no string interpolation).
   */
  async applyQueues(playerId: string, mutations: InspectionQueueMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) =>
        sql`(${m.district_id}::int, ${JSON.stringify(m.entries)}::jsonb, ${m.length}::int, ${m.processing_rate_per_day}::int, ${m.budget_modifier}::int)`,
    );
    await this.db.execute(sql`
      UPDATE ${inspectionQueue} AS iq
      SET entries = v.entries,
          length = v.length,
          processing_rate_per_day = v.processing_rate_per_day,
          budget_modifier = v.budget_modifier
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(district_id, entries, length, processing_rate_per_day, budget_modifier)
      WHERE iq.player_id = ${playerId}::uuid AND iq.district_id = v.district_id
    `);
  }

  /** Map a raw selected row → the InspectionQueueState struct (jsonb entries normalization). */
  private toState(r: {
    district_id: number;
    entries: unknown;
    length: number;
    processing_rate_per_day: number;
    budget_modifier: number;
  }): InspectionQueueState {
    const entries = Array.isArray(r.entries) ? (r.entries as QueueEntry[]) : [];
    return {
      district_id: r.district_id,
      entries,
      length: r.length,
      processing_rate_per_day: r.processing_rate_per_day,
      budget_modifier: r.budget_modifier,
    };
  }
}

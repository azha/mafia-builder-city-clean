// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `precinct_memory` table
//             — R9.3: this READS the schema + INSERT/UPDATEs; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_3_police_memory.md §États PrecinctMemory
//             -- session:2026-06-02 (Phase 1 Task 4) --
//             D2 R3b (2026-06-17): ADD declaration_ledger read/write methods (G31 acceptor).
//             The `declaration_ledger` column exists since R3a (migration 0052, nullable JSONB).
//             R9.3: reads the EXISTING column — no schema redefinition here.
//
// `PoliceMemoryRepository` — the persisted access layer over `precinct_memory` (table created in migration
// `0005_city_state.sql`, already migrated; 6 rows/player). Copies the SparseCitizensRepository persisted-system
// template: a thin `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired
// with a thin service that holds the tick logic.
//
// R9.3: 09 is the source of truth for `precinct_memory`. This file imports the EXISTING schema (precinctMemory)
// and never re-declares it. The runtime role app_rw has SELECT/INSERT (0005 table grant) + UPDATE/DELETE
// (`0013_app_role.sql` grant lists `precinct_memory`) — this repository uses exactly SELECT/INSERT/UPDATE.
//
// BYTEA Buffer handling: `suspicion_map` is a 1024-byte bytea (32×32 uint8 tile grid). It maps to a Node
// `Buffer` via the drizzle `customType` (schema/city_state.ts). The repository reads it as a Buffer, the
// service bumps/decays tiles IN the Buffer (get_byte semantics: tile (row,col) → byte offset row*edge+col),
// and the repository writes the WHOLE Buffer back. The DB CHECK `octet_length(suspicion_map) = 1024` is
// upheld by always writing exactly SUSPICION_MAP_BYTES-length Buffers. `raid_temperature` has a DB CHECK
// [0..1] — callers clamp before writing (the service's clampTemp).
//
// BATCHED WRITES (the template the persisted systems copy): every persistence call here is a SINGLE statement:
//   - `seedSixPrecincts` : ONE multi-row INSERT, race-safe via per-player advisory lock + NOT EXISTS guard.
//   - `applyMutations`   : ONE set-based `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch (≤6 rows) —
//                          NOT a per-row await loop. Atomic, all-or-nothing. bytea passed as a hex bind param.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { precinctMemory, federalInvestigator } from '../../db/schema/city_state';

/** A precinct_memory tick-state row — the hot-path projection (the columns the tick reads/writes). */
export interface PrecinctMemoryState {
  precinct_id: number;
  /** The 1024-byte (32×32 uint8) suspicion_map tile grid, as a Node Buffer. */
  suspicion_map: Buffer;
  /** The current top-target building ids (recomputed at the 12h precinct review). */
  top_5_buildings: number[];
  /** The persisted softmax raid temperature (DB CHECK [0..1]). */
  raid_temperature: number;
  last_raid_at: Date | null;
}

/** A per-precinct state mutation (suspicion_map Buffer + the review-tick outputs). */
export interface PrecinctMemoryMutation {
  precinct_id: number;
  suspicion_map: Buffer;
  /** Optional review-tick outputs (only set by the 12h review; observation/decay ticks omit them). */
  top_5_buildings?: number[];
  raid_temperature?: number;
  last_raid_at?: Date | null;
}

/**
 * A `federal_investigators` row (04e-A1 C7 — ★ Substrate 2, design §4.2). `investigator_type` is
 * ALWAYS 'federal' for a row this repository writes; `corruption_exempt` is ALWAYS true (the
 * honest-scaffolding immunity flag — see `federal-investigator.guard.ts`).
 */
export interface FederalInvestigatorState {
  player_id: string;
  investigator_type: 'local' | 'federal';
  suspicion_decay_per_day: number;
  raid_temperature: number;
  corruption_exempt: boolean;
  spawned_at: Date;
}

@Injectable()
export class PoliceMemoryRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** How many precinct_memory rows the player already has (drives the lazy-seed decision; cheap COUNT). */
  async countPrecincts(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(precinctMemory)
      .where(eq(precinctMemory.player_id, playerId));
    return rows[0]?.n ?? 0;
  }

  /**
   * Lazily seed the player's `precinctCount` (6) precinct_memory rows in a SINGLE durable, race-safe statement.
   * Each row starts with a zeroed suspicion_map (all tiles 0 — no belief yet), the schema-default
   * raid_temperature (0.7), and empty top_5_buildings.
   *
   * DURABLE IDEMPOTENCY (mirrors SparseCitizensRepository.insertMany — the per-process Set guard in the service
   * is a fast-path only). Two guards make this safe even if two instances run a player's FIRST tick concurrently:
   *   1. `pg_advisory_xact_lock(hashtext(player_id))` — serializes the per-player seed across connections/instances.
   *   2. `WHERE NOT EXISTS (SELECT 1 FROM precinct_memory WHERE player_id = $pid)` — the all-or-nothing guard:
   *      the loser of the race sees the winner's 6 rows committed and inserts ZERO (never 12 rows).
   * One statement, parameterized (the zeroed bytea is a single shared hex bind param).
   */
  async seedSixPrecincts(playerId: string, precinctIds: number[], zeroedMap: Buffer): Promise<void> {
    if (precinctIds.length === 0) return;
    const zeroHex = `\\x${zeroedMap.toString('hex')}`;
    // Per-row parameterized VALUES tuple (player_id, precinct_id, suspicion_map). top_5_buildings /
    // hunch_decay_per_type / raid_temperature take their schema defaults ('[]', '{}', 0.7).
    const valueRows = precinctIds.map(
      (pid) => sql`(${playerId}::uuid, ${pid}::int, ${zeroHex}::bytea)`,
    );
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId})))
      INSERT INTO ${precinctMemory} (player_id, precinct_id, suspicion_map)
      SELECT v.player_id, v.precinct_id, v.suspicion_map
      FROM (VALUES ${sql.join(valueRows, sql`, `)}) AS v(player_id, precinct_id, suspicion_map)
      WHERE NOT EXISTS (SELECT 1 FROM ${precinctMemory} WHERE ${precinctMemory.player_id} = ${playerId}::uuid)
    `);
  }

  /**
   * All 6 precinct rows' tick state for a player — EXPLICIT column list, ordered by precinct_id for
   * deterministic batching. The suspicion_map comes back as a Buffer (the drizzle customType maps bytea →
   * Buffer). top_5_buildings is a jsonb int array. The hot tick path reads this, mutates the Buffers in JS,
   * and writes the batch back via applyMutations.
   */
  async listPrecinctState(playerId: string): Promise<PrecinctMemoryState[]> {
    const rows = await this.db
      .select({
        precinct_id: precinctMemory.precinct_id,
        suspicion_map: precinctMemory.suspicion_map,
        top_5_buildings: precinctMemory.top_5_buildings,
        raid_temperature: precinctMemory.raid_temperature,
        last_raid_at: precinctMemory.last_raid_at,
      })
      .from(precinctMemory)
      .where(eq(precinctMemory.player_id, playerId))
      .orderBy(precinctMemory.precinct_id);
    return rows.map((r) => ({
      precinct_id: r.precinct_id,
      // Defensive: ensure a real Buffer (node-postgres returns Buffer for bytea; normalize just in case).
      suspicion_map: Buffer.isBuffer(r.suspicion_map) ? r.suspicion_map : Buffer.from(r.suspicion_map as Uint8Array),
      top_5_buildings: Array.isArray(r.top_5_buildings) ? (r.top_5_buildings as number[]) : [],
      raid_temperature: r.raid_temperature,
      last_raid_at: r.last_raid_at,
    }));
  }

  /** A single precinct's tick state (used by the projection — reads ONE precinct's belief). */
  async getPrecinctState(playerId: string, precinctId: number): Promise<PrecinctMemoryState | null> {
    const rows = await this.db
      .select({
        precinct_id: precinctMemory.precinct_id,
        suspicion_map: precinctMemory.suspicion_map,
        top_5_buildings: precinctMemory.top_5_buildings,
        raid_temperature: precinctMemory.raid_temperature,
        last_raid_at: precinctMemory.last_raid_at,
      })
      .from(precinctMemory)
      .where(and(eq(precinctMemory.player_id, playerId), eq(precinctMemory.precinct_id, precinctId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      precinct_id: r.precinct_id,
      suspicion_map: Buffer.isBuffer(r.suspicion_map) ? r.suspicion_map : Buffer.from(r.suspicion_map as Uint8Array),
      top_5_buildings: Array.isArray(r.top_5_buildings) ? (r.top_5_buildings as number[]) : [],
      raid_temperature: r.raid_temperature,
      last_raid_at: r.last_raid_at,
    };
  }

  /**
   * Stamp `last_raid_at` on ONE precinct (the POST-RAID memory update — System 3↔4 handoff, T5). System 4 emits
   * RaidPlannedEvent at its 12h review; System 3 consumes it and records the raid timestamp on its OWN table
   * (System 4 never mutates precinct_memory — Inv 6). A targeted single-column UPDATE — leaves suspicion_map /
   * top_5_buildings / raid_temperature untouched. app_rw has UPDATE on precinct_memory (0013 grant).
   */
  async stampLastRaid(playerId: string, precinctId: number, at: Date): Promise<void> {
    await this.db
      .update(precinctMemory)
      .set({ last_raid_at: at })
      .where(and(eq(precinctMemory.player_id, playerId), eq(precinctMemory.precinct_id, precinctId)));
  }

  // D2 R3b: declaration_ledger read/write (G31 acceptor — system_3 :144-169).

  /**
   * Read the `declaration_ledger` JSONB ring for ONE precinct (G31 Tick3 scoring + Tick2 decay sweep).
   * Returns null if the row does not exist or the column is null (no entries written yet).
   * The column exists since R3a migration 0052 (nullable JSONB default null).
   */
  async getDeclarationLedger(
    playerId: string,
    precinctId: number,
  ): Promise<unknown[] | null> {
    const rows = await this.db
      .select({ declaration_ledger: precinctMemory.declaration_ledger })
      .from(precinctMemory)
      .where(and(eq(precinctMemory.player_id, playerId), eq(precinctMemory.precinct_id, precinctId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    if (!Array.isArray(r.declaration_ledger)) return [];
    return r.declaration_ledger as unknown[];
  }

  /**
   * Persist a decayed/pruned declaration_ledger ring for ONE precinct (G31 Tick2 decay sweep).
   * A targeted single-column UPDATE — leaves suspicion_map / top_5_buildings / raid_temperature untouched.
   * Passing an empty array clears the ring (all entries decayed/retired).
   */
  async updateDeclarationLedger(
    playerId: string,
    precinctId: number,
    entries: unknown[],
  ): Promise<void> {
    await this.db
      .update(precinctMemory)
      .set({ declaration_ledger: entries.length === 0 ? null : sql`${JSON.stringify(entries)}::jsonb` })
      .where(and(eq(precinctMemory.player_id, playerId), eq(precinctMemory.precinct_id, precinctId)));
  }

  /**
   * Atomically append a single declaration entry to a precinct's ring (G31 write hook, Tick 1 subscription).
   * Respects the ring-depth bound (maxPrecinct) and per-building cap (maxPerBuilding).
   * If the precinct row does not yet exist, it is created with a zeroed suspicion_map (lazy seed).
   * Implemented as a single atomic JSONB CTE (same pattern as the R3a test controller append primitive).
   */
  async appendDeclarationEntry(
    playerId: string,
    precinctId: number,
    entry: unknown,
    maxPrecinct: number,
    maxPerBuilding: number,
  ): Promise<void> {
    const zeroHex = `\\x${'00'.repeat(1024)}`; // 1024 zero bytes (zeroed suspicion_map for lazy row creation)
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId}))),
      existing AS (
        SELECT declaration_ledger
        FROM ${precinctMemory}
        WHERE player_id = ${playerId}::uuid AND precinct_id = ${precinctId}::int
        FOR UPDATE
      )
      INSERT INTO ${precinctMemory} (player_id, precinct_id, suspicion_map, declaration_ledger)
      SELECT
        ${playerId}::uuid,
        ${precinctId}::int,
        ${zeroHex}::bytea,
        (
          SELECT jsonb_agg(e)
          FROM (
            SELECT e
            FROM (
              SELECT e,
                     row_number() OVER (PARTITION BY (e->>'building_id')::int ORDER BY (e->>'written_at')::bigint DESC) AS rn_building,
                     row_number() OVER (ORDER BY (e->>'written_at')::bigint DESC) AS rn_total
              FROM   jsonb_array_elements(
                       COALESCE((SELECT declaration_ledger FROM existing), '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb
                     ) AS e
            ) ranked
            WHERE rn_building <= ${maxPerBuilding} AND rn_total <= ${maxPrecinct}
            ORDER BY (e->>'written_at')::bigint ASC
          ) final_entries
        )
      ON CONFLICT (player_id, precinct_id) DO UPDATE
        SET declaration_ledger = EXCLUDED.declaration_ledger
    `);
  }

  /**
   * Persist a batch of per-precinct state mutations in ONE set-based atomic `UPDATE ... FROM (VALUES …)`
   * statement — NOT a per-row loop. The observation/decay/review ticks mutate ≤6 rows; this collapses that to
   * a SINGLE round-trip, all-or-nothing (a mid-batch failure can't leave a half-updated precinct set). The
   * suspicion_map Buffer is passed as a hex bytea bind param (never string-interpolated). Columns the mutation
   * leaves undefined (top_5_buildings / raid_temperature / last_raid_at on a pure-observation tick) are
   * preserved via COALESCE on a NULL marker, so an observation tick never clobbers the review-tick outputs.
   * The DB CHECKs (octet_length=1024, raid_temperature [0..1]) are upheld by the caller (1024-byte Buffers,
   * clamped temps). Values are PARAMETERIZED bind params (no string interpolation).
   */
  async applyMutations(playerId: string, mutations: PrecinctMemoryMutation[]): Promise<void> {
    if (mutations.length === 0) return;

    const valueRows = mutations.map((m) => {
      const mapHex = `\\x${m.suspicion_map.toString('hex')}`;
      // top_5_buildings: undefined → SQL NULL (preserve existing); else a jsonb int array.
      const top =
        m.top_5_buildings === undefined
          ? sql`NULL::jsonb`
          : sql`${JSON.stringify(m.top_5_buildings)}::jsonb`;
      const temp =
        m.raid_temperature === undefined ? sql`NULL::real` : sql`${m.raid_temperature}::real`;
      // last_raid_at: undefined → preserve (NULL marker + a separate boolean so an explicit null can't be
      // distinguished from "don't touch" — day-1 only the review SETS it, never clears it, so undefined=preserve).
      const lastRaid =
        m.last_raid_at === undefined || m.last_raid_at === null
          ? sql`NULL::timestamptz`
          : sql`${m.last_raid_at.toISOString()}::timestamptz`;
      return sql`(${m.precinct_id}::int, ${mapHex}::bytea, ${top}, ${temp}, ${lastRaid})`;
    });

    await this.db.execute(sql`
      UPDATE ${precinctMemory} AS pm
      SET suspicion_map  = v.suspicion_map,
          top_5_buildings = COALESCE(v.top_5_buildings, pm.top_5_buildings),
          raid_temperature = COALESCE(v.raid_temperature, pm.raid_temperature),
          last_raid_at     = COALESCE(v.last_raid_at, pm.last_raid_at)
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(precinct_id, suspicion_map, top_5_buildings, raid_temperature, last_raid_at)
      WHERE pm.player_id = ${playerId}::uuid AND pm.precinct_id = v.precinct_id
    `);
  }

  // ───────────────────────────── C7 — ★ Substrate 2: federal investigator (design §4.2) ─────────────────────────────

  /**
   * Read the CURRENT `federal_investigators` row for a player (04e-A1 C7). `null` if no federal
   * investigator is currently spawned for this player (the E-POL-11 signal is inactive, or has never
   * fired for this player).
   */
  async getFederalInvestigator(playerId: string): Promise<FederalInvestigatorState | null> {
    const rows = await this.db
      .select({
        player_id: federalInvestigator.player_id,
        investigator_type: federalInvestigator.investigator_type,
        suspicion_decay_per_day: federalInvestigator.suspicion_decay_per_day,
        raid_temperature: federalInvestigator.raid_temperature,
        corruption_exempt: federalInvestigator.corruption_exempt,
        spawned_at: federalInvestigator.spawned_at,
      })
      .from(federalInvestigator)
      .where(eq(federalInvestigator.player_id, playerId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * SPAWN/MAINTAIN (04e-A1 C7): upsert the player's `federal_investigators` row, snapshotting the
   * CURRENT overlay-composed DISTINCT suspicion parameters. `investigator_type` stays 'federal' and
   * `corruption_exempt` stays true on every call (the honest-scaffolding immunity flag never varies) —
   * only the two distinct suspicion parameters are refreshed, so a modifier magnitude change mid-active
   * window is reflected live on the NEXT nightly reconcile (mirrors C6's "recompute every tick" model).
   * `spawned_at` is left untouched on an UPDATE (only set on the first INSERT) — re-maintaining an
   * already-active investigator does not reset its spawn timestamp.
   */
  async upsertFederalInvestigator(
    playerId: string,
    params: { suspicionDecayPerDay: number; raidTemperature: number },
  ): Promise<void> {
    await this.db
      .insert(federalInvestigator)
      .values({
        player_id: playerId,
        investigator_type: 'federal',
        suspicion_decay_per_day: params.suspicionDecayPerDay,
        raid_temperature: params.raidTemperature,
        corruption_exempt: true,
      })
      .onConflictDoUpdate({
        target: federalInvestigator.player_id,
        set: {
          suspicion_decay_per_day: params.suspicionDecayPerDay,
          raid_temperature: params.raidTemperature,
        },
      });
  }

  /**
   * DESPAWN (04e-A1 C7): delete the player's `federal_investigators` row if present. Idempotent — a
   * player with no row deletes zero rows (the E-POL-11 signal was never active, or already despawned).
   */
  async despawnFederalInvestigator(playerId: string): Promise<void> {
    await this.db.delete(federalInvestigator).where(eq(federalInvestigator.player_id, playerId));
  }
}

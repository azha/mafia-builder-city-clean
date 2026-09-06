// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (the EXISTING migrated `safehouses`
//             table — R9.3: this READS the schema; it NEVER redefines the table) + the optional batched UPDATE of
//             current_fill (only when a raid drain mutates it) +
//             docs/tech/04_city_simulation/system_9_erlang_stash.md §États Safehouse + §Update tick
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// `ErlangStashRepository` — the persisted access layer over `safehouses` (table created in migration
// `0006_pipeline_and_laundering.sql`, already migrated; PK safehouse_id uuid, FK player_id + building_id NOT NULL,
// raid_drain_policy pgEnum). Copies the persisted-system repository template (DwellTimeRepository): a thin
// `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service
// that holds the per-minute tick logic.
//
// R9.3: 09 is the source of truth for `safehouses`. This file imports the EXISTING schema (safehouse) and never
// re-declares it. The runtime role app_rw has SELECT/INSERT (0006 grant) + UPDATE (`0013_app_role.sql` grant lists
// `safehouses`) — this repository uses exactly SELECT + UPDATE. It never INSERTs/DELETEs safehouses: creation is
// owned by `LaunderingPersistenceService` (LOT PLANQUE, the onboarding grant), a DIFFERENT module — System 9
// day-1 only READS (the MINUTE tick recomputes the IN-MEMORY blocking_probability — there is no persisted
// blocking column; current_fill is mutated ONLY by a raid drain, which is P2 and exercised via applyDrain below
// — wiring is optional Phase 1).
//
// SUBSTRATE (was "the table is EMPTY in normal Phase-1 runs", true only before LOT PLANQUE): `safehouses` now
// has its first application writer outside this module — the welcome grant seeds one safehouse per fresh
// player, so `listSafehouses` returns a genuinely non-empty list for a granted player. What stays true: THIS
// module still never creates a row (no seed method here — System 9 does not CREATE safehouses), and raids
// remain P2/unimplemented (0 `raid` reference anywhere in this module), so `current_fill` still only moves via
// a real deposit/collect, never a drain, today. The E2E can still seed a building + safehouses directly to
// exercise the deterministic Erlang-B / bucket / alert computation without going through the grant.
//
// BATCHED WRITES (the template the persisted systems copy): `applyDrain` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for a WHOLE drained batch — NOT a per-row await loop. Atomic, all-or-nothing. All
// values are PARAMETERIZED bind params (no string interpolation). It mutates ONLY current_fill (the per-slot
// jsonb). The MINUTE tick does NOT write (blocking is in-memory); applyDrain is the ONLY write path (a raid — P2).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { safehouse } from '../../db/schema/pipeline_and_laundering';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';

/** The raid drain policy domain (schema enum 'top_down'|'random'|'bottom_up' — runtime mapping). */
export type RaidDrainPolicy = 'top_down' | 'random' | 'bottom_up';

/**
 * A safehouse row the Erlang-stash tick reads (system_9_erlang_stash.md §États Safehouse inputs). slot_count = C
 * (the Erlang-B parameter); arrival_rate = λ; current_fill = per-slot percent-filled jsonb array. district_id is
 * JOINed (safehouses.building_id → buildings.block_id → blocks.id → blocks.district_id) — the per-safehouse →
 * per-district mapping the projection uses. The raw fields are NEVER forwarded to the client (R2.2).
 */
export interface SafehouseState {
  safehouse_id: string;
  building_id: string;
  /** The district this safehouse's host building's block belongs to (the per-district projection identity). */
  district_id: number;
  /** C — the number of active slots (1..12, DB CHECK slot_count > 0). The Erlang-B parameter + a structural identity. */
  slot_count: number;
  /** S — the $ capacity per slot (cents). The raw magnitude — NEVER exposed (R2.2 — BO-only). */
  slot_capacity_cents: number;
  /** Per-slot percent-filled (0–100) jsonb array (length ~slot_count). The raw fill — NEVER exposed (Inv 5 / R2.2). */
  current_fill: number[];
  /** λ — the cash-parcel arrival rate (parcels/min in-game). The raw float — NEVER exposed (R2.2). */
  arrival_rate: number;
  /** The configured raid drain order (Inv 6 — top_down/random/bottom_up). */
  raid_drain_policy: RaidDrainPolicy;
}

/** A per-safehouse drained-fill mutation a raid applies (the ONLY write path — current_fill after drain). */
export interface SafehouseFillMutation {
  safehouse_id: string;
  /** The post-drain per-slot percent-filled array (length unchanged; drained slots → 0 in drain order). */
  current_fill: number[];
}

/** Coerce a jsonb value into a number[] of per-slot percents (defensive — the column is a free-form jsonb array). */
function toFillArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

@Injectable()
export class ErlangStashRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Map a raw safehouse row (with JOINed district_id) → the typed SafehouseState (jsonb fill coerced). */
  private mapRow(r: {
    safehouse_id: string;
    building_id: string;
    district_id: number;
    slot_count: number;
    slot_capacity_cents: number;
    current_fill: unknown;
    arrival_rate: number;
    raid_drain_policy: RaidDrainPolicy;
  }): SafehouseState {
    return {
      safehouse_id: r.safehouse_id,
      building_id: r.building_id,
      district_id: r.district_id,
      slot_count: r.slot_count,
      slot_capacity_cents: r.slot_capacity_cents,
      current_fill: toFillArray(r.current_fill),
      arrival_rate: r.arrival_rate,
      raid_drain_policy: r.raid_drain_policy,
    };
  }

  /**
   * All safehouses for a player — the per-minute recompute set. EXPLICIT column list, ordered by slot_count then
   * safehouse_id for deterministic iteration. JOINs buildings (safehouse.building_id → buildings) then the global
   * `blocks` table (buildings.block_id → blocks.id) to resolve the host district. Returns [] when the player has
   * no safehouses — was the organic Phase-1 reality for EVERY player; LOT PLANQUE's welcome grant now seeds one
   * per fresh player, so this is the genuine edge case today (a player whose grant has not run, or none at all).
   */
  async listSafehouses(playerId: string): Promise<SafehouseState[]> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        building_id: safehouse.building_id,
        district_id: blocks.district_id,
        slot_count: safehouse.slot_count,
        slot_capacity_cents: safehouse.slot_capacity_cents,
        current_fill: safehouse.current_fill,
        arrival_rate: safehouse.arrival_rate,
        raid_drain_policy: safehouse.raid_drain_policy,
      })
      .from(safehouse)
      .innerJoin(building, eq(building.building_id, safehouse.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(eq(safehouse.player_id, playerId))
      .orderBy(safehouse.slot_count, safehouse.safehouse_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * All safehouses for a player IN one district (the projection read — same shape as listSafehouses, narrowed to
   * a district via the buildings → blocks JOIN). Returns [] for a district with no safehouses (the controller
   * projects an empty per-district payload — the organic Phase-1 shape).
   */
  async listSafehousesForDistrict(playerId: string, districtId: number): Promise<SafehouseState[]> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        building_id: safehouse.building_id,
        district_id: blocks.district_id,
        slot_count: safehouse.slot_count,
        slot_capacity_cents: safehouse.slot_capacity_cents,
        current_fill: safehouse.current_fill,
        arrival_rate: safehouse.arrival_rate,
        raid_drain_policy: safehouse.raid_drain_policy,
      })
      .from(safehouse)
      .innerJoin(building, eq(building.building_id, safehouse.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(safehouse.player_id, playerId), eq(blocks.district_id, districtId)))
      .orderBy(safehouse.slot_count, safehouse.safehouse_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * ALL safehouses CITY-WIDE (every player), district-JOINed — the 04g-B C3 S8 cross-system predicate
   * seam (`ErlangStashService.listDistrictsWithFullBand`, design §3.6 P1 pair
   * `erlang_stash__deal_lek`: "≥ 1 (player, district X) stash en band FULL"). Deliberately
   * player-UNSCOPED (the ONLY such read in this file — every other method here is per-player): the
   * `sideways_failure` primary predicate is a CITY-GLOBAL observation (ANY player's safehouse in a
   * district), not a per-player one. Ordered by district_id then safehouse_id for deterministic
   * iteration. Returns [] when no safehouses exist anywhere — was the organic Phase-1 reality (a genuinely
   * empty table, city-wide); LOT PLANQUE ended it (`safehouses` has its first application writer), so this is
   * now the theoretical case of a city with zero grants ever completed, not the norm.
   */
  async listAllSafehouses(): Promise<SafehouseState[]> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        building_id: safehouse.building_id,
        district_id: blocks.district_id,
        slot_count: safehouse.slot_count,
        slot_capacity_cents: safehouse.slot_capacity_cents,
        current_fill: safehouse.current_fill,
        arrival_rate: safehouse.arrival_rate,
        raid_drain_policy: safehouse.raid_drain_policy,
      })
      .from(safehouse)
      .innerJoin(building, eq(building.building_id, safehouse.building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .orderBy(blocks.district_id, safehouse.safehouse_id);
    return rows.map((r) => this.mapRow(r as Parameters<typeof this.mapRow>[0]));
  }

  /**
   * Persist a batch of post-drain per-safehouse current_fill arrays in ONE set-based atomic
   * `UPDATE ... FROM (VALUES …)` — NOT a per-row loop. The ONLY write path System 9 has (a raid drain — Inv 6;
   * raids are P2, so this is exercised via applyRaid in the service, wiring optional Phase 1). All values are
   * PARAMETERIZED bind params (no string interpolation). The WHERE pins the update to the player + the safehouse
   * id (never touches another player's rows). current_fill is the only mutated column (the jsonb per-slot array).
   */
  async applyDrain(playerId: string, mutations: SafehouseFillMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) => sql`(${m.safehouse_id}::uuid, ${JSON.stringify(m.current_fill)}::jsonb)`,
    );
    await this.db.execute(sql`
      UPDATE ${safehouse} AS s
      SET current_fill = v.current_fill
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(safehouse_id, current_fill)
      WHERE s.player_id = ${playerId}::uuid AND s.safehouse_id = v.safehouse_id
    `);
  }
}

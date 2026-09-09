// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `buildings` table —
//             R9.3: this READS the schema + UPDATEs audit_pin_expires_at; it NEVER redefines the table)
//             + docs/tech/04_city_simulation/system_7_unconformity_ledgers.md §États UnconformityLedger
//               (the audit pin persists on buildings.audit_pin_expires_at; transaction_profile = "only if promoted")
//             -- session:2026-06-03 (Phase 1 Task 8) --
//
// `UnconformityLedgerRepository` — the persisted access layer over `buildings` (table created in migration
// `0005_city_state.sql`, already migrated; PK building_id uuid, FK player_id). Copies the persisted-system
// repository template (CohesionPermafrostRepository / InspectionQueueRepository): a thin `*.repository.ts`
// owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service that holds the
// nightly tick logic.
//
// R9.3: 09 is the source of truth for `buildings`. This file imports the EXISTING schema (building) and never
// re-declares it. The runtime role app_rw has SELECT/INSERT (0005 grant) + UPDATE/DELETE (`0013_app_role.sql`
// grant lists `buildings`) — this repository uses exactly SELECT + UPDATE (it never INSERTs/DELETEs buildings:
// building creation/promotion is a P2 player operation, not a System-7 write; System 7 only writes the audit pin).
//
// TWO-TIER (system_7 §Compression par promotion, Inv 3 per-building not per-district): the audit pin + the
// per-building UnconformityLedger exist ONLY for PROMOTED buildings. A building is "promoted" in the Phase-1
// sense when it carries a transaction_profile (the jsonb "only if promoted" column — schema_city_state.ts L141)
// AND is operational. Non-promoted buildings (no transaction_profile) live in the in-memory block-aggregate tier
// (uint32 per block, never persisted, never pinned) — they are NOT read here. So `listPromoted` filters to
// ownership IN ('player','leased') + structural_state='operational' + transaction_profile IS NOT NULL.
//
// PHASE-1 INPUT REALITY (honest deferral — like cohesion-thaw): the buildings table is EMPTY in normal Phase-1
// runs (buildings = P2 entities the player acquires/promotes; revenue/transaction_profile = P2 operations). So
// `listPromoted` returns [] organically — the mechanic is structural; the E2E seeds promoted buildings to exercise
// the deterministic deviation → audit-pin path. No seed method here: System 7 does not CREATE buildings.
//
// BATCHED WRITES (the template the persisted systems copy): `applyAuditPins` is a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` for the WHOLE mutated batch — NOT a per-row await loop. Atomic, all-or-nothing.
// All values are PARAMETERIZED bind params (no string interpolation). audit_pin_expires_at is a NULLABLE
// timestamptz: a SET pin carries an ISO timestamp; a LAPSED/absent pin carries NULL (cleared).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
// 04f-A C6 (D6) — the D1 anchor pair LEFT-JOINed so `emergenceGateWindow()` can derive the LIVE lapse phase
// (never the cached `lapse_phase` column — see unconformity.service.ts's own header note). A promoted
// building with NO operational-chain row (never converted, or a test-seeded promoted-only row) simply reads
// both columns NULL — the D6 maintenance factor stays 1 (untouched), the zero-regression contract.
import { buildingOperationalState } from '../../db/schema/operational_chain';

/**
 * A promoted-building row the unconformity tick reads (system_7 §États UnconformityLedger inputs). The raw
 * transaction_profile + the persisted audit pin live here; the service computes the deviation in JS and writes
 * the pin batch back. district_id is JOINed from the global `blocks` table (buildings.block_id → blocks.id →
 * blocks.district_id) — the per-building → per-district mapping the projection + the events use.
 */
export interface PromotedBuildingState {
  building_id: string;
  block_id: number;
  /** The district this building's block belongs to (JOIN blocks — the per-district projection/event identity). */
  district_id: number;
  /**
   * The raw transaction profile jsonb (system_7: "only if promoted"). Shape the tick consumes:
   * `{ revenue_samples: number[], latest_revenue: number }` — the historical ring-buffer content + the freshest
   * sample. The deviation z-score is |latest - mean(samples)| / stddev(samples). Unknown/absent fields are
   * tolerated (a malformed profile yields NOMINAL — no pin). NEVER forwarded to the client (R2.2).
   */
  transaction_profile: unknown;
  /** The current persisted audit-pin expiry (null = no pin; a timestamp = pinned-until). */
  audit_pin_expires_at: Date | null;
  /**
   * 04e-A1 C6 (mig 0107): the persisted activation anchor — when the CURRENT pin last (re-)activated
   * (null = never pinned / lapsed). The nightly tick's HOLD branch recomputes audit_pin_expires_at from
   * THIS field + the current (overlay-aware) pinHalfLifeDays every tick (design §4.1).
   */
  audit_pin_activated_at: Date | null;
  /**
   * 04f-A C6 (D6) — the D1 anchor pair (LEFT JOIN `building_operational_state`), the LIVE lapse-phase
   * derivation input for the per-building HARD/CRITICAL emergence-rate factor. NULL when the promoted
   * building carries no operational-chain row (never converted — the maintenance factor stays 1, untouched).
   */
  last_maintained_at_game_day: number | null;
  /** Paired with `last_maintained_at_game_day` above (the D1 anchor's interval half) — NULL under the SAME condition. */
  maintenance_due_in_days: number | null;
}

/**
 * A per-building audit-pin mutation (the nightly tick output). audit_pin_expires_at is ALWAYS written: a SET pin
 * carries a Date (the half-life-driven expiry, C6 §4.1); a lapsed/absent pin carries null (cleared). The tick
 * writes exactly the buildings it read as promoted — never touches transaction_profile / ownership /
 * structural_state (those are P2-owned columns; System 7 only owns the audit pin projection).
 */
export interface AuditPinMutation {
  building_id: string;
  /** The new pin expiry: a Date when pinned, null when not pinned / lapsed. */
  audit_pin_expires_at: Date | null;
  /**
   * 04e-A1 C6 (mig 0107): the new activation anchor — a Date on a FRESH activate/re-arm, the UNCHANGED
   * prior anchor on a HOLD, null on lapse/unpinned. ALWAYS written alongside audit_pin_expires_at (same
   * atomic UPDATE) so the two columns never drift out of sync.
   */
  audit_pin_activated_at: Date | null;
}

@Injectable()
export class UnconformityLedgerRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * All PROMOTED buildings for a player — the two-tier promoted set (Inv 3). EXPLICIT column list, ordered by
   * block_id then building_id for deterministic batching. Filters to the promoted tier: ownership IN
   * ('player','leased') + structural_state='operational' + transaction_profile IS NOT NULL (the "only if
   * promoted" jsonb). JOINs the global `blocks` table to resolve block_id → district_id. Returns [] when the
   * player has no promoted buildings (the organic Phase-1 reality — the buildings table is empty).
   */
  async listPromoted(playerId: string): Promise<PromotedBuildingState[]> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        block_id: building.block_id,
        district_id: blocks.district_id,
        transaction_profile: building.transaction_profile,
        audit_pin_expires_at: building.audit_pin_expires_at,
        audit_pin_activated_at: building.audit_pin_activated_at,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      // 04f-A C6 (D6) — LEFT JOIN (ADDITIVE, never narrows the promoted set): a promoted building with no
      // operational-chain row simply reads both new columns NULL.
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.player_id, playerId),
          inArray(building.ownership, ['player', 'leased']),
          eq(building.structural_state, 'operational'),
          isNotNull(building.transaction_profile),
        ),
      )
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      block_id: r.block_id,
      district_id: r.district_id,
      transaction_profile: r.transaction_profile,
      audit_pin_expires_at: r.audit_pin_expires_at,
      audit_pin_activated_at: r.audit_pin_activated_at,
      last_maintained_at_game_day: r.last_maintained_at_game_day,
      maintenance_due_in_days: r.maintenance_due_in_days,
    }));
  }

  /**
   * All PROMOTED buildings for a player IN one district (the projection read — same promoted filter as
   * listPromoted, narrowed to a district via the blocks JOIN). Returns [] for a district with no promoted
   * buildings (the controller projects an empty per-district payload — the organic Phase-1 shape).
   */
  async listPromotedForDistrict(playerId: string, districtId: number): Promise<PromotedBuildingState[]> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        block_id: building.block_id,
        district_id: blocks.district_id,
        transaction_profile: building.transaction_profile,
        audit_pin_expires_at: building.audit_pin_expires_at,
        audit_pin_activated_at: building.audit_pin_activated_at,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(
        and(
          eq(building.player_id, playerId),
          eq(blocks.district_id, districtId),
          inArray(building.ownership, ['player', 'leased']),
          eq(building.structural_state, 'operational'),
          isNotNull(building.transaction_profile),
        ),
      )
      .orderBy(building.block_id, building.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      block_id: r.block_id,
      district_id: r.district_id,
      transaction_profile: r.transaction_profile,
      audit_pin_expires_at: r.audit_pin_expires_at,
      audit_pin_activated_at: r.audit_pin_activated_at,
      // 04f-A C6 (D6): this projection-only read never derives the maintenance factor (the NIGHTLY tick's
      // own `listPromoted` above does, via its LEFT JOIN) — honestly null, never a fabricated value.
      last_maintained_at_game_day: null,
      maintenance_due_in_days: null,
    }));
  }

  /**
   * Persist a batch of per-building audit-pin mutations in ONE set-based atomic `UPDATE ... FROM (VALUES …)`
   * statement — NOT a per-row loop. The nightly tick mutates ≤N_promoted rows; this collapses that to a SINGLE
   * round-trip, all-or-nothing (a mid-batch failure can't leave a half-updated set). All values are PARAMETERIZED
   * bind params (no string interpolation). audit_pin_expires_at is written DIRECTLY (no COALESCE): the tick
   * always decides the new pin state (set on activation / persist on hold / null on lapse), so every promoted
   * building's pin is authoritatively rewritten each tick. The WHERE pins the update to the player + the building
   * id (never touches another player's rows; never touches non-promoted buildings since they aren't in the batch).
   */
  async applyAuditPins(playerId: string, mutations: AuditPinMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map((m) => {
      const expiry =
        m.audit_pin_expires_at === null
          ? sql`NULL::timestamptz`
          : sql`${m.audit_pin_expires_at.toISOString()}::timestamptz`;
      // 04e-A1 C6 (mig 0107): audit_pin_activated_at is written in the SAME atomic UPDATE, never drifts
      // out of sync with audit_pin_expires_at (both null on lapse, both set together on activate/hold).
      const activatedAt =
        m.audit_pin_activated_at === null
          ? sql`NULL::timestamptz`
          : sql`${m.audit_pin_activated_at.toISOString()}::timestamptz`;
      return sql`(${m.building_id}::uuid, ${expiry}, ${activatedAt})`;
    });
    await this.db.execute(sql`
      UPDATE ${building} AS b
      SET audit_pin_expires_at = v.audit_pin_expires_at,
          audit_pin_activated_at = v.audit_pin_activated_at
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, audit_pin_expires_at, audit_pin_activated_at)
      WHERE b.player_id = ${playerId}::uuid AND b.building_id = v.building_id
    `);
  }
}

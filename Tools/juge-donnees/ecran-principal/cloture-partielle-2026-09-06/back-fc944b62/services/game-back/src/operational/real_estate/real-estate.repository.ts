// IMPLEMENTS: docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `buildings` table) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (building_operational_state — T0) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the debit) +
//             docs/tech/04a_operational_systems/real_estate.md §Acquisition (Path A legit purchase) +
//             docs/tech/04a_operational_systems/conversion_setup.md §Workflow de conversion
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// P3-E C1 (2026-07-17): `debitAndInsertPlayerBuilding` stamps `buildings.acquired_at_tick` at the SAME
//   INSERT (mig 0132, resolution R11/#19 — docs/superpowers/specs/2026-07-17-p3-E-demolition-
//   compression-design.md §4.2/§13.1). One-line additive edit: a scalar subquery against
//   `city_sim_clock.game_minute` (COALESCE to 0 if the player has no clock row yet), the ★#1 friction
//   perimeter's age anchor. No other behavior of this method changes.
//
// `RealEstateRepository` — the persisted access layer for the M1 real-estate slice. Copies the persisted-system
// repository template (HeatRepository / BufferBloatRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action / per-tick logic.
//
// R9.3: 09 is the source of truth for `buildings` (Phase 1), `building_operational_state` (T0), `economy_states`
// (Phase 1), and the world geography (`blocks`/`districts`). This file IMPORTS the existing schema and NEVER
// re-declares it. The runtime role app_rw has SELECT+INSERT broadly (0013) + UPDATE/DELETE on these mutable tables
// (0013 economy_states / 0017 building_operational_state) — this repository uses exactly those.
//
// BATCHED WRITES (the determinism template the persisted systems copy): the scheduler-facing setup tick reads ALL
// in-progress conversions for a player in ONE query and applies the whole decrement batch in ONE set-based
// `UPDATE ... FROM (VALUES …)` — NEVER a per-row await loop (the Phase-1 determinism discipline). All values are
// PARAMETERIZED bind params (no string interpolation).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { buildingOperationalState, buildingStructuralState, moneyHolding } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { blocks, districts } from '../../db/schema/world_geography';
import { citySimClock } from '../../db/schema/city_sim_clock'; // P3-E C1 — the acquired_at_tick stamp source (purchase-time game-minute read)
import type { CoverQuality, M1OperationalType } from './conversion-tunables';
import type { RankableBuildingInput } from '../../common/fiction-names'; // C3 (D7) — listBuildingsForRanking's return shape.

/**
 * The 4-member `building_operational_state.structural_state` domain (operational|damaged|repairing|failed —
 * W3.U2 C2 / D5-bis). R9.3: derived from the schema enum, never a hand-copied literal union.
 */
export type OperationalStructuralStateEnumTs = (typeof buildingStructuralState.enumValues)[number];

/** A player-owned building's operational row joined with its building/block identity (the projection read input). */
export interface OperationalBuildingState {
  building_id: string;
  block_id: number;
  district_id: number;
  /** C3 (D6/D7) — `buildings.building_type` RAW int (set at purchase, `city_state.ts:149` — unlike
   *  `operational_type` below it is populated EVEN before conversion). The `buildingNameRef` INPUT
   *  (via `buildingTypeFromRawInt`, `common/fiction-names.ts`) — never forwarded as a raw int (R2.2). */
  building_type: number;
  operational_type: string;
  conversion_stage: string;
  cover_quality: string;
  /** The CITY-STATE structural_state (buildings.structural_state — operational|damaged|seized|demolished). */
  structural_state: string;
  /**
   * The OPERATIONAL-CHAIN structural_state (building_operational_state.structural_state — operational|damaged|
   * repairing|failed; the Phase-2b raid/repair surface — DISTINCT from buildings.structural_state above).
   * 'operational' when the building has no operational row yet (acquired, conversion not started). The raid
   * (T1) / repair (T3) / equipment-failure (D5-bis) mutate THIS column; the building-card projection surfaces
   * it as the structural-state band. ⛔ W3.U2 C2 (D5-bis) — typed as the CLOSED union (not `string`): this is
   * what makes `structuralStateBand`'s exhaustive switch a compile error on a 5th member, instead of a
   * silently-accepted `default`.
   */
  op_structural_state: OperationalStructuralStateEnumTs;
  /**
   * The building's RAW heat float (buildings.heat [0..1]) — the INPUT to the Phase-2b T4 raid-risk band. R2.2: this
   * raw float is mapped to a HeatBucket INSIDE the projection (deriveRaidRiskBand) and NEVER forwarded to the client;
   * it is read here only to derive the qualitative raid_risk band. (The heat-map overlay surfaces the HeatBucket
   * separately; this is the per-building read the raid-risk telegraph consumes.)
   */
  heat: number;
  /**
   * Whether the building currently has an ACTIVE audit pin (buildings.audit_pin_expires_at > now() — System 7
   * Unconformity sets the pin; an inspector is coming). Computed in SQL so the raw timestamp NEVER leaves the
   * repository (R2.2 — the projection reads only this boolean → the raid-risk band, never the expiry timestamp).
   */
  audit_pinned: boolean;
  /**
   * Phase-2b vector #2 — whether the building is cold-storage-capable (building_operational_state.cold_storage_capable
   * — set at conversion). A boolean (already qualitative — not a raw scalar), surfaced by the projection so the client
   * knows the building can host a cold chain (Crick OPTIMAL_COLD). false when no operational row yet / ordinary storage.
   */
  cold_storage_capable: boolean;
  /**
   * Phase-2c vector #2c (Ash — T5) — the building's RAW lab_tier int (building_operational_state.lab_tier, default 1).
   * The INPUT to the lab_tier_band projection: R2.2 — this raw int is mapped to a closed qualitative band INSIDE the
   * projection (labTierBand) and NEVER forwarded to the client. Only meaningful for a specialized_lab (the tier lever);
   * 1 (the migrated default) for any other building / when no operational row yet.
   */
  lab_tier: number;
  /**
   * Phase-4 vector #4 (distribution_hub — T2) — the building's RAW hub_tier int (building_operational_state.hub_tier,
   * default 1, migration 0024). The INPUT to the hub_tier_band projection: R2.2 — this raw int is mapped to a closed
   * qualitative band INSIDE the projection (hubTierBand) and NEVER forwarded to the client. Only meaningful for a
   * distribution_hub (the tier lever scaling the courier roster cap); 1 (the migrated default) for any other building /
   * when no operational row yet.
   */
  hub_tier: number;
  /**
   * 04f-A C2 (D1) — the building's D1 maintenance anchor (building_operational_state.last_maintained_at_game_day).
   * NULL when the building has no operational row yet / conversion not complete (D1 stamps it only at
   * OPERATIONAL). The INPUT to the R2.2 LapsePhaseBucket + days_until_maintenance_due projection fields — NEVER
   * forwarded raw (R2.2).
   */
  last_maintained_at_game_day: number | null;
  /** 04f-A C2 (D1) — the per-building maintenance interval (REUSE, unchanged). Default 0 (the schema column
   *  default) when no operational row yet — paired with a null anchor the projection reads as within_window. */
  maintenance_due_in_days: number;
  /** 04f-A C2 (D13) — whether a scheduled-maintenance job is currently armed (non-null when armed). The RAW
   *  game-day is NEVER forwarded (R2.2) — only the `maintenance_in_progress` boolean the projection derives. */
  maintenance_completes_at_day: number | null;
}

/** An in-progress conversion the setup tick advances (conversion_stage NOT IN ('none','operational')). */
export interface InProgressConversion {
  building_id: string;
  setup_remaining_ticks: number;
}

/** A per-building setup-tick recompute (the new remaining ticks + the completion flip). */
export interface SetupMutation {
  building_id: string;
  setup_remaining_ticks: number;
  /**
   * true when this building reached 0 remaining ticks THIS tick → flip conversion_stage → 'operational' + stamp
   * became_operational_at. false → keep the existing conversion_stage (the setup stage is NOT churned mid-setup).
   */
  became_operational: boolean;
}

@Injectable()
export class RealEstateRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── acquisition (Step 1) ─────────────────────────────

  /**
   * Whether a block is FREE for this player — i.e. the player has NO NON-DEMOLISHED `building` row on that
   * block. (A "free block" for M1 = no player-owned live building there; the world geography block itself
   * always exists.) Returns false if the block id is not a real seeded block (a non-existent block is never
   * purchasable).
   *
   * 04f-A C5 (design §6, DEMOLISH_REPLACE "block freed" contract) — ADDITIVE: excludes a
   * `structural_state='demolished'` building from the occupancy check. Before this lot NO code path ever wrote
   * 'demolished' (`EquipmentFailureExceptionRepository.demolishAndClear` is the FIRST), so this clause is a
   * pure no-op for every pre-existing purchase/convert flow — a demolished building's row is kept (never
   * deleted — the equipment_failure_log audit trail FK-cascades on `buildings`, not on this row) purely as a
   * historical city-state fact; it no longer counts as "occupying" the block.
   */
  async isBlockFreeForPlayer(playerId: string, blockId: number): Promise<boolean> {
    const blockRows = await this.db
      .select({ id: blocks.id })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .limit(1);
    if (blockRows.length === 0) return false; // not a real block → not purchasable.

    const existing = await this.db
      .select({ building_id: building.building_id })
      .from(building)
      .where(
        and(
          eq(building.player_id, playerId),
          eq(building.block_id, blockId),
          ne(building.structural_state, 'demolished'),
        ),
      )
      .limit(1);
    return existing.length === 0;
  }

  /**
   * The ATOMIC priced acquisition (Step 1 — the legitimate purchase / Path A): DEBIT the acquisition price from
   * economy_states.cash_cents AND INSERT the player-owned building, in ONE DB transaction. Ownership is 'player',
   * structural_state 'operational' (a freshly-acquired building is structurally intact; its OPERATIONAL conversion is
   * a SEPARATE workflow — building_operational_state, Step 2). `building_type` is the integer index of the operational
   * type within the 11-member building_operational_type enum (the schema_city_state.md §2 convention:
   * buildings.building_type int = FK-logical index into the building-type enum — there is no int→enum table in code,
   * so we derive the index from the operational type to stay consistent).
   *
   * ACQUISITION PRICING (M1, real_estate.md §202 — `[PROV-Y26Q2]`): the price = real_estate.acquisition_cost_ratio ×
   * the STANDARD-cover reference conversion cost (see acquisitionPriceCents). The debit is GUARDED by a
   * `cash_cents >= price` predicate IN the UPDATE so an insufficient balance NEVER goes negative — the UPDATE affects
   * 0 rows, the building is NOT inserted, the tx rolls back, and the caller rejects (409). The CONVERSION cost is a
   * SEPARATE later debit (Step 2). Returns the new building_id (or null if the guarded debit was refused).
   */
  async debitAndInsertPlayerBuilding(
    playerId: string,
    blockId: number,
    buildingTypeIndex: number,
    acquisitionPriceCents: bigint,
  ): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      // Guarded debit: only succeeds if the wallet can cover the acquisition price (never go negative — anti-exploit).
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${acquisitionPriceCents}` })
        .where(
          and(
            eq(economyState.player_id, playerId),
            sql`${economyState.cash_cents} >= ${acquisitionPriceCents}`,
          ),
        )
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole purchase (the tx rolls back the no-op).
        return null;
      }

      const [row] = await tx
        .insert(building)
        .values({
          player_id: playerId,
          block_id: blockId,
          building_type: buildingTypeIndex,
          ownership: 'player',
          structural_state: 'operational',
          // heat defaults to 0 (the migrated default); no operational state yet (that's Step 2).
          // P3-E C1 (mig 0132, resolution R11/#19) — one-line stamp: the ★#1 friction perimeter's age
          // anchor, set to the player's CURRENT game-minute at the SAME purchase INSERT (0 if the player
          // has no city_sim_clock row yet — the SAME fallback `getCurrentGameDayAndMinute` already
          // establishes, maintenance.repository.ts). Every building acquired from this commit forward is
          // stamped; pre-existing rows stay NULL until the C2 lazy-stamp (D20).
          acquired_at_tick: sql`COALESCE((SELECT ${citySimClock.game_minute} FROM ${citySimClock} WHERE ${citySimClock.player_id} = ${playerId}), 0)`,
        })
        .returning({ building_id: building.building_id });
      return row.building_id;
    });
  }

  /** Read a player-owned building's identity (or null) — used to authorize the convert() on an owned building. */
  async getOwnedBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ building_id: string; building_type: number } | null> {
    const rows = await this.db
      .select({ building_id: building.building_id, building_type: building.building_type })
      .from(building)
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Resolve the district PROFILE of a block (D1 C2 — the district-pricing purchase gate). Resolves through the GLOBAL
   * geography graph blocks.district_id → districts.profile (the clean district attribute, the same graph edge the
   * building-level join uses). BLOCK-scoped (no ownership check — called at purchase time BEFORE a building exists on
   * the block). Returns the raw district_profile enum string (e.g. 'glass' | 'verge' | 'tidewater' | …) or null when
   * the blockId is not a real seeded block.
   */
  async getBlockDistrictProfile(blockId: number): Promise<string | null> {
    const rows = await this.db
      .select({ profile: districts.profile })
      .from(blocks)
      .innerJoin(districts, eq(districts.id, blocks.district_id))
      .where(eq(blocks.id, blockId))
      .limit(1);
    return rows[0]?.profile ?? null;
  }

  /**
   * Resolve the district PROFILE of a player-owned building (Phase-3 vector #3 — the grow_house Spine/Verge build
   * gate). Resolves through the GLOBAL geography graph buildings.block_id → blocks.district_id → districts.profile
   * (the clean district attribute — the SAME join AshAppointmentRepository.validateGlassVenue uses for the Glass-venue
   * gate). Player-scoped + ownership-scoped so a non-owned / non-existent building yields null (the caller maps that to
   * its own 404 via getOwnedBuilding — this read is only reached AFTER ownership is established). Returns the raw
   * district_profile enum string (e.g. 'spine' | 'verge' | 'glass' | …) or null when the building is not the player's.
   */
  async getBuildingDistrictProfile(playerId: string, buildingId: string): Promise<string | null> {
    const rows = await this.db
      .select({ profile: districts.profile })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .innerJoin(districts, eq(districts.id, blocks.district_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
        ),
      )
      .limit(1);
    return rows[0]?.profile ?? null;
  }

  // ───────────────────────────── conversion (Step 2) ─────────────────────────────

  /** Whether an operational-state row already exists for a building (1-1 PK) — convert() is idempotent-guarded. */
  async hasOperationalState(buildingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, buildingId))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Read the player's wallet balance (economy_states.cash_cents — bigint). Returns null if the player has no
   * economy_states row yet (the conversion debit requires a wallet; the caller surfaces a clean error).
   */
  async getWalletCents(playerId: string): Promise<bigint | null> {
    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    return rows[0]?.cash_cents ?? null;
  }

  /**
   * The ATOMIC convert transaction (Step 2): debit the conversion cost from economy_states.cash_cents AND insert the
   * building_operational_state row (operational_type, cover_quality, conversion_stage='gutting', equipment_tier=1
   * the migrated default, setup_remaining_ticks=the per-type×cover duration). Wrapped in a single DB transaction so
   * a wallet debit never lands without the matching operational row (and vice-versa). The debit is guarded by a
   * `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance does NOT go negative — the UPDATE
   * affects 0 rows and the caller rejects. Returns the new wallet balance (or null if the debit was refused).
   *
   * Phase-5 vector #5a (money_holding — T1): when `createMoneyHolding` is true (a money_holding convert), a fresh
   * `money_holding` row (held_cents=0, money_holding_tier=1, forfeiture_scheduled_at_tick=NULL — the schema DEFAULTs;
   * `last_yield_tick` is stamped to the player's CURRENT game-minute, W1.1-d C1.2 — NO LONGER a schema default, see
   * this method's own body comment) is inserted in the SAME transaction as the operational-state insert, so a
   * converted money_holding ALWAYS has its holding row (1-1, lazy-created here). Every other building type leaves
   * this false → NO money_holding row (byte-identical to before).
   */
  async debitAndCreateOperationalState(params: {
    playerId: string;
    buildingId: string;
    operationalType: M1OperationalType;
    coverQuality: CoverQuality;
    costCents: bigint;
    setupRemainingTicks: number;
    maintenanceDueInDays: number;
    /** Phase-2b vector #2 — whether the building is cold-storage-capable (set at conversion; default false). */
    coldStorageCapable: boolean;
    /** Phase-5 vector #5a — whether to lazy-create the money_holding row in the same tx (a money_holding convert). */
    createMoneyHolding: boolean;
  }): Promise<{ newBalanceCents: bigint } | null> {
    return this.db.transaction(async (tx) => {
      // Guarded debit: only succeeds if the wallet can cover the cost (never go negative — anti-exploit).
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${params.costCents}` })
        .where(
          and(
            eq(economyState.player_id, params.playerId),
            sql`${economyState.cash_cents} >= ${params.costCents}`,
          ),
        )
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole conversion (the tx rolls back the no-op).
        return null;
      }

      await tx.insert(buildingOperationalState).values({
        building_id: params.buildingId,
        player_id: params.playerId,
        operational_type: params.operationalType,
        cover_quality: params.coverQuality,
        conversion_stage: 'gutting', // the first setup stage (none → gutting → installing → testing → operational).
        setup_remaining_ticks: params.setupRemainingTicks,
        maintenance_due_in_days: params.maintenanceDueInDays,
        // Phase-2b vector #2 — cold-storage capability posed at conversion (refinery cold-by-nature / opt-in stash).
        cold_storage_capable: params.coldStorageCapable,
        // equipment_tier defaults to 1 (the migrated default — Tier-1 at install); became_operational_at stays null.
      });

      // Phase-5 vector #5a (money_holding — T1): lazy-create the 1-1 money_holding row in the SAME tx as the
      // operational-state insert. held_cents (0), money_holding_tier (1) and forfeiture_scheduled_at_tick (NULL)
      // still come from the schema DEFAULTs (T0, migration 0025). `last_yield_tick` is NO LONGER a schema default
      // (W1.1-d C1.2 — dropped `.default(0)` TS-side, ANCRE ABSOLUE): under the city-global epoch (W1.1-d C1.1) a
      // fresh money_holding sitting at `last_yield_tick=0` would be borrowed against by the FULL age of the city on
      // its first settle (`money-holding.repository.ts#settleYield`, `elapsed = currentTick - this`), not merely the
      // age of the save — the SAME `acquired_at_tick` COALESCE-subquery precedent this file already uses (`:216`
      // above) for `buildings.acquired_at_tick` (P3-E C1). 0 if the player has no city_sim_clock row yet (mirrors
      // that same fallback — unreachable in practice post-signup, W1.1-d C1.3).
      if (params.createMoneyHolding) {
        await tx.insert(moneyHolding).values({
          player_id: params.playerId,
          building_id: params.buildingId,
          last_yield_tick: sql`COALESCE((SELECT ${citySimClock.game_minute} FROM ${citySimClock} WHERE ${citySimClock.player_id} = ${params.playerId}), 0)`,
        });
      }

      return { newBalanceCents: debited[0].cash_cents };
    });
  }

  // ───────────────────────────── projection read (Step 3) ─────────────────────────────

  /**
   * Read one player-owned building's operational state for the projection (Step 3). JOINs the block to resolve the
   * host district. Returns null when the building does not exist / is not the player's; the operational fields are
   * null when the building has no building_operational_state row yet (acquired, conversion not started — stage 'none'
   * is implied). The RAW setup_remaining_ticks / equipment_tier are NEVER read here (R2.2 — the projection forwards
   * only qualitative bands; the conversion_stage enum IS a qualitative closed domain, safe to forward as a band).
   */
  async getBuildingOperationalState(
    playerId: string,
    buildingId: string,
  ): Promise<OperationalBuildingState | null> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        block_id: building.block_id,
        district_id: blocks.district_id,
        building_type: building.building_type, // C3 (D6/D7) — the raw FK-logical int, RankableBuildingInput/buildingNameRef's INPUT.
        structural_state: building.structural_state,
        op_structural_state: buildingOperationalState.structural_state,
        operational_type: buildingOperationalState.operational_type,
        conversion_stage: buildingOperationalState.conversion_stage,
        cover_quality: buildingOperationalState.cover_quality,
        // Phase-2b vector #2 — cold-storage capability (a boolean — already qualitative, safe to forward; R2.2).
        cold_storage_capable: buildingOperationalState.cold_storage_capable,
        // Phase-2c vector #2c (Ash — T5) — the RAW lab_tier int (the lab_tier_band input) — bucketed in the projection,
        // NEVER forwarded (R2.2). Only meaningful for a specialized_lab; 1 (the migrated default) otherwise.
        lab_tier: buildingOperationalState.lab_tier,
        // Phase-4 vector #4 (distribution_hub — T2) — the RAW hub_tier int (the hub_tier_band input) — bucketed in the
        // projection, NEVER forwarded (R2.2). Only meaningful for a distribution_hub; 1 (the migrated default) otherwise.
        hub_tier: buildingOperationalState.hub_tier,
        // 04f-A C2 (D1) — the D1 maintenance anchor + interval + armed-job column (the LapsePhaseBucket /
        // days_until_maintenance_due / maintenance_in_progress projection inputs) — NEVER forwarded raw (R2.2).
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
        // The RAW heat float (Phase-2b T4 raid-risk input) — bucketed in the projection, NEVER forwarded (R2.2).
        heat: building.heat,
        // Whether the audit pin is ACTIVE (System 7) — computed in SQL so the raw timestamp never leaves the repo.
        audit_pinned: sql<boolean>`(${building.audit_pin_expires_at} IS NOT NULL AND ${building.audit_pin_expires_at} > now())`,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(and(eq(building.building_id, buildingId), eq(building.player_id, playerId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      building_id: r.building_id,
      block_id: r.block_id,
      district_id: r.district_id,
      building_type: r.building_type,
      structural_state: r.structural_state,
      // No operational row yet → the building is acquired but conversion not started (stage 'none' / op-state
      // 'operational' the migrated default — never DAMAGED/REPAIRING until a raid/repair lands).
      op_structural_state: r.op_structural_state ?? 'operational',
      operational_type: r.operational_type ?? '',
      conversion_stage: r.conversion_stage ?? 'none',
      cover_quality: r.cover_quality ?? '',
      // Phase-2b vector #2 — cold-storage capability (false when no operational row yet / ordinary storage).
      cold_storage_capable: r.cold_storage_capable ?? false,
      // Phase-2c vector #2c (Ash — T5) — the raw lab_tier (default 1 = Tier-1 when no operational row yet / non-lab).
      lab_tier: r.lab_tier ?? 1,
      // Phase-4 vector #4 (distribution_hub — T2) — the raw hub_tier (default 1 = Tier-1 when no operational row yet / non-hub).
      hub_tier: r.hub_tier ?? 1,
      // 04f-A C2 (D1) — null anchor (no operational row yet) is a valid "not maintainable yet" state — the
      // projection reads it as within_window / 0 (the SAME neutral-default convention lab_tier_band/hub_tier_band
      // use for a non-applicable building).
      last_maintained_at_game_day: r.last_maintained_at_game_day ?? null,
      maintenance_due_in_days: r.maintenance_due_in_days ?? 0,
      maintenance_completes_at_day: r.maintenance_completes_at_day ?? null,
      // The raw heat float (default 0 = COLD) + the active-audit-pin boolean — the Phase-2b T4 raid-risk inputs.
      heat: r.heat ?? 0,
      audit_pinned: r.audit_pinned ?? false,
    };
  }

  /**
   * C3 (D7) — the `rankByTypeAndBlock` INPUT: ALL of the player's non-demolished buildings IN one
   * district (`block_id` is 1:1 to a district, so a district-scoped read is EXHAUSTIVE for every
   * (player, type, block) partition a building of THIS district could share — no player-global scan
   * needed; the SAME scope `DistrictInteriorRepository.listPlayerBuildings` already reads). A SEPARATE
   * read from `getBuildingOperationalState` (which returns ONE row) — ranking a building requires
   * knowing its siblings. Ordered `acquired_at_tick ASC NULLS LAST, building_id ASC` (`fiction-names.ts`'s
   * own header: the STABLE chronological key so an EXISTING building's rank never shifts when a LATER
   * one of the same (type, block) is purchased — P3-E C1 mig 0132).
   */
  async listBuildingsForRanking(playerId: string, districtId: number): Promise<RankableBuildingInput[]> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        building_type: building.building_type,
        block_id: building.block_id,
      })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(
        and(
          eq(building.player_id, playerId),
          eq(blocks.district_id, districtId),
          ne(building.structural_state, 'demolished'),
        ),
      )
      .orderBy(sql`${building.acquired_at_tick} ASC NULLS LAST, ${building.building_id} ASC`);
    return rows.map((r) => ({ ...r, player_id: playerId }));
  }

  // ───────────────────────────── scheduler setup tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL in-progress conversions for a player (conversion_stage NOT IN ('none','operational')) in ONE
   * query — the per-tick setup input (the Phase-1 determinism discipline: batched read, no per-row queries). Ordered
   * by building_id for deterministic batching. Returns [] when the player has no in-progress conversions (the common
   * case — the tick is then a no-op).
   */
  async listInProgressConversions(playerId: string): Promise<InProgressConversion[]> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        setup_remaining_ticks: buildingOperationalState.setup_remaining_ticks,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          sql`${buildingOperationalState.conversion_stage} NOT IN ('none', 'operational')`,
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows;
  }

  /**
   * Persist the whole setup-tick recompute batch in ONE set-based atomic `UPDATE ... FROM (VALUES …)` — NOT a
   * per-row loop (the persisted-system template). For each building: set setup_remaining_ticks; when it reached 0
   * this tick (became_operational) flip conversion_stage → 'operational' + stamp became_operational_at = now(),
   * otherwise PRESERVE the existing conversion_stage + became_operational_at (the setup stage is not churned
   * mid-setup — the CASE only overwrites the completing buildings). All values are PARAMETERIZED bind params. The
   * WHERE pins the update to the player + building id.
   */
  /**
   * 04f-A C1 (design §3 — "Set at convert-complete (OPERATIONAL)", D1): `gameDay` is the CALLER-derived
   * current game-day (`deriveGameDay(ctx.gameMinute, ...)`, the SAME value for every mutation in this ONE
   * MINUTE tick — a single batch-level bind param, not per-row). Newly-operational buildings (the
   * `became_operational` branch) get `last_maintained_at_game_day = gameDay` in the SAME atomic UPDATE that
   * flips conversion_stage → 'operational' — this is the ONLY site a building ever becomes OPERATIONAL (the
   * `debitAndCreateOperationalState` insert always seeds `conversion_stage: 'gutting'`, never 'operational'
   * directly), so this single write-site covers every real conversion. A building still mid-setup keeps its
   * existing anchor (NULL, matching `lapse_phase`'s "not yet a maintainable building" posture).
   */
  async applySetupBatch(playerId: string, mutations: SetupMutation[], gameDay: number): Promise<void> {
    if (mutations.length === 0) return;
    const valueRows = mutations.map(
      (m) => sql`(${m.building_id}::uuid, ${m.setup_remaining_ticks}::integer, ${m.became_operational}::boolean)`,
    );
    await this.db.execute(sql`
      UPDATE ${buildingOperationalState} AS bos
      SET setup_remaining_ticks = v.setup_remaining_ticks,
          conversion_stage = CASE WHEN v.became_operational THEN 'operational'::conversion_stage ELSE bos.conversion_stage END,
          became_operational_at = CASE WHEN v.became_operational THEN now() ELSE bos.became_operational_at END,
          last_maintained_at_game_day = CASE WHEN v.became_operational THEN ${gameDay}::bigint ELSE bos.last_maintained_at_game_day END
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, setup_remaining_ticks, became_operational)
      WHERE bos.player_id = ${playerId}::uuid AND bos.building_id = v.building_id
    `);
  }
}

// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 (product_storage.quantity_grams /
//             building_operational_state.cold_storage_capable / courier_shift.cargo_grams + .substance_type /
//             courier.vehicle_type — T0/T4; R9.3 READ never redefined) +
//             docs/tech/04a_operational_systems/production_secondaries.md §Crick — cold-chain stimulant (a warm Crick
//             holding/cargo loses grams; a cold building / refrigerated van preserves it) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 5) --
//
// `ColdChainRepository` — the persisted access layer for the Phase-2b COLD-CHAIN slice. Copies the persisted-system
// repository template (RepairRepository / DistributionRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-tick / derivation logic.
//
// R9.3: 09 is the source of truth for `product_storage` / `building_operational_state` / `courier_shift` / `courier`
// (T0/T4). This file IMPORTS the existing schema and NEVER re-declares it. The runtime role app_rw has UPDATE on
// product_storage + courier_shift (0017) — this repository uses exactly those. NO schema change (T0/T4 landed all the
// columns this reads/writes — cold_storage_capable migration 0019, substance_type migration 0020, vehicle_type 0017).
//
// THE SET-BASED DEGRADE (the persisted-system determinism template): each warm-Crick decrement is ONE set-based UPDATE
// scoped by (player, cold-chain substance, warm condition) — NEVER a per-row await loop, NO RNG. The grams floor is
// GUARDED ≥ 0 in the SQL (`greatest(quantity_grams - rate, 0)`) so a holding/cargo can NEVER go negative — it bottoms
// out at 0 (the warm Crick is fully spoiled) and stays there (a 0-row that re-runs subtracts greatest(0-rate,0)=0).
// All values are PARAMETERIZED bind params. Organically a no-op (no warm Crick — the common case: no Crick, or all
// Crick kept cold; the WHERE matches nothing).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import {
  buildingOperationalState,
  courier,
  courierShift,
  productStorage,
} from '../../db/schema/operational_chain';
import { coldChainSubstanceTypes } from '../substance/substance-config';
import { REFRIGERATED_VEHICLE_TYPE } from './cold-chain.service';

@Injectable()
export class ColdChainRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── degrade tick (the operational tick-hook) ─────────────────────────────

  /**
   * Degrade the player's WARM STORED cold-chain holdings set-based (the COLD_CHAIN tick, the MODERATE regime). ONE
   * UPDATE: for every product_storage row of a COLD-CHAIN substance (registry-derived — Crick; Brindle excluded) in a
   * building that is NOT cold_storage_capable, decrement quantity_grams by the MODERATE per-tick grams rate, GUARDED
   * ≥ 0 (`greatest(quantity_grams - rate, 0)`). Joined to building_operational_state on building_id to read the
   * cold_storage_capable flag. Returns the count of rows touched (0 = clean no-op — no warm Crick). Deterministic (NO
   * RNG; a fixed grams/tick). A cold building (cold_storage_capable=true — a refinery / cold stash) is SKIPPED →
   * preserved. Brindle is never selected (not in the cold-chain substance set).
   */
  async degradeWarmHoldings(playerId: string, moderateGramsPerTick: number): Promise<number> {
    const coldChainSubstances = coldChainSubstanceTypes();
    if (coldChainSubstances.length === 0 || moderateGramsPerTick <= 0) return 0; // nothing to degrade / knob off.

    const updated = await this.db
      .update(productStorage)
      .set({
        quantity_grams: sql`greatest(${productStorage.quantity_grams} - ${moderateGramsPerTick}, 0)`,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(productStorage.player_id, playerId),
          inArray(productStorage.substance_type, coldChainSubstances),
          gt(productStorage.quantity_grams, 0),
          // The holding's building must NOT be cold-storage-capable (a warm/ambient building) → MODERATE regime.
          // A cold building (refinery / cold-opted stash) is excluded here → its Crick is preserved.
          sql`exists (
            select 1 from ${buildingOperationalState} bos
            where bos.building_id = ${productStorage.building_id}
              and bos.player_id = ${productStorage.player_id}
              and bos.cold_storage_capable = false
          )`,
        ),
      )
      .returning({ storage_id: productStorage.storage_id });
    return updated.length;
  }

  /**
   * Degrade the player's WARM IN-TRANSIT cold-chain cargo set-based (the COLD_CHAIN tick, the HOT regime). ONE UPDATE:
   * for every in-transit courier_shift of a COLD-CHAIN substance whose courier's vehicle_type is NOT a refrigerated_van,
   * decrement cargo_grams by the HOT per-tick grams rate, GUARDED ≥ 0. Joined to courier on courier_id to read the
   * vehicle_type. Returns the count of rows touched (0 = clean no-op). Deterministic (NO RNG). A refrigerated_van cargo
   * is SKIPPED → preserved. Brindle cargo is never selected (not cold-chain).
   */
  async degradeWarmCargo(playerId: string, hotGramsPerTick: number): Promise<number> {
    const coldChainSubstances = coldChainSubstanceTypes();
    if (coldChainSubstances.length === 0 || hotGramsPerTick <= 0) return 0; // nothing to degrade / knob off.

    const updated = await this.db
      .update(courierShift)
      .set({
        cargo_grams: sql`greatest(${courierShift.cargo_grams} - ${hotGramsPerTick}, 0)`,
      })
      .where(
        and(
          eq(courierShift.player_id, playerId),
          eq(courierShift.status, 'in_transit'),
          inArray(courierShift.substance_type, coldChainSubstances),
          gt(courierShift.cargo_grams, 0),
          // DD-COLD-POWERED (C12): a powered van preserves (byte-identical to today);
          // an un-powered (neutralized) van degrades like any warm in-transit cargo (HOT regime).
          // The OR condition: degrade IF (not a van) OR (is a van but cold_chain_powered=false).
          // For a powered van: first clause false, second false → not degraded (byte-identical).
          // For a neutralized van: first clause false, second true → degraded (DIV-C1).
          sql`exists (
            select 1 from ${courier} c
            where c.courier_id = ${courierShift.courier_id}
              and c.player_id = ${courierShift.player_id}
              and (c.vehicle_type <> ${REFRIGERATED_VEHICLE_TYPE} OR ${courierShift.cold_chain_powered} = false)
          )`,
        ),
      )
      .returning({ shift_id: courierShift.shift_id });
    return updated.length;
  }

  // ───────────────────────────── projection reads (Step 3) ─────────────────────────────

  /**
   * Whether a player-owned building is cold_storage_capable (the projection's temperature_status INPUT — mapped to a
   * BAND by ColdChainService; the raw flag is never the band). Reads building_operational_state.cold_storage_capable.
   * Returns null when the building has no operational state for THIS player (the projection then surfaces no
   * temperature_status). Player-scoped (a building belonging to another player is invisible).
   */
  async getBuildingColdStorageCapable(playerId: string, buildingId: string): Promise<boolean | null> {
    const rows = await this.db
      .select({ cold_storage_capable: buildingOperationalState.cold_storage_capable })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return r.cold_storage_capable ?? false;
  }
}

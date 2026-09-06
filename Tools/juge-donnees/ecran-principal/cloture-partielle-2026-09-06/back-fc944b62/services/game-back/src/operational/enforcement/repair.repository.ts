// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7 (raid/repair surface — building_operational_state.
//             structural_state / repair_completes_at_tick + building_raid.status, T0) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the guarded debit,
//             the SAME atomic-guarded pattern RealEstateRepository.debitAndInsertPlayerBuilding uses) +
//             docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (RepairService + the
//             OPERATIONAL_REPAIR tick)
//             -- session:2026-06-04 (Phase 2b Task 3) --
//
// `RepairRepository` — the persisted access layer for the Phase-2b REPAIR slice (police-risk vector #1 recovery).
// Copies the persisted-system repository template (RealEstateRepository / RaidRepository): a thin `*.repository.ts`
// owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the per-action /
// per-tick logic.
//
// R9.3: 09 is the source of truth for `building_operational_state` + `building_raid` (operational chain — T0/§7) and
// `economy_states` (Phase-1). This file IMPORTS the existing schema and NEVER re-declares it. The runtime role app_rw
// has UPDATE on building_operational_state (0017) + economy_states (0013) + SELECT/UPDATE on building_raid (0018) —
// this repository uses exactly those. NO schema change (T0 landed it).
//
// THE GUARDED-DEBIT DISCIPLINE (REUSE — the SAME atomic pattern the real-estate purchase/convert debits use): the
// repair debit is a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance NEVER goes negative — the
// UPDATE affects 0 rows, the WHOLE repair transaction rolls back (no state change), and the caller rejects (409). The
// debit + the structural-state transition + the building_raid.status flip all run in ONE transaction (a repair never
// debits cash without arming the repair, and vice-versa). All values are PARAMETERIZED bind params (no string
// interpolation). NO RNG (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { buildingOperationalState, buildingRaid } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';

/** A player-owned building's repair-relevant operational state (the repair-action validation input). */
export interface RepairTargetState {
  building_id: string;
  /** The OPERATIONAL-chain structural_state (operational|damaged|repairing — building_operational_state). */
  structural_state: string;
}

@Injectable()
export class RepairRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read a player-owned building's repair-relevant operational state (or null). Returns null when the building has no
   * building_operational_state row for THIS player (not owned / not converted) — the caller maps that to a 404. The
   * structural_state drives the DAMAGED validation (only a 'damaged' building can be repaired). Player-scoped so a
   * building belonging to another player is invisible (404, never a cross-player leak).
   */
  async getRepairTargetState(playerId: string, buildingId: string): Promise<RepairTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        structural_state: buildingOperationalState.structural_state,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the repair's `repair_completes_at_tick` base
   * (current_tick + duration). The SAME authoritative clock-read the cook-advance / arrival actions use
   * (ProductionRepository.getCurrentTick precedent). Returns 0 when the player has no clock row yet (the deterministic
   * advance harness lazy-creates it on first advance). NOT a write — the clock row is owned by the scheduler.
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * The ATOMIC guarded repair transaction (the wallet-affecting action): in ONE DB transaction —
   *   1) GUARDED DEBIT (REUSE the real-estate atomic-guarded pattern): `UPDATE economy_states SET cash_cents =
   *      cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`. Insufficient balance → 0 rows → return null
   *      (the caller rejects 409 INSUFFICIENT_FUNDS); the tx rolls back the no-op (no state change).
   *   2) ARM REPAIR: `UPDATE building_operational_state SET structural_state = 'repairing', repair_completes_at_tick =
   *      ? WHERE building_id = ? AND player_id = ? AND structural_state = 'damaged'` (the DAMAGED predicate is
   *      belt-and-braces — the caller already validated it; it also makes a concurrent double-repair a no-op).
   *   3) FLAG THE RAID LEDGER: `UPDATE building_raid SET status = 'repairing' WHERE player_id = ? AND building_id = ?
   *      AND status = 'executed'` — the active raid row(s) for this building move to 'repairing' (status executed →
   *      repairing; later → repaired by the completion tick). A building with no executed raid row (re-damaged via a
   *      path that left no executed row) simply updates 0 raid rows — the repair still arms.
   * Returns { completesAtTick } on success, or null when the debit was refused (insufficient funds). DETERMINISTIC.
   */
  async debitAndArmRepair(params: {
    playerId: string;
    buildingId: string;
    costCents: bigint;
    completesAtTick: number;
  }): Promise<{ completesAtTick: number } | null> {
    const { playerId, buildingId, costCents, completesAtTick } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT — only succeeds if the wallet can cover the cost (never go negative — anti-exploit). REUSE the
      // exact atomic-guarded predicate the real-estate purchase/convert debits use.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole repair (the tx rolls back the no-op).
        return null;
      }

      // 2) ARM REPAIR — transition DAMAGED → repairing + stamp the completion tick.
      await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'repairing', repair_completes_at_tick: completesAtTick })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'damaged'),
          ),
        );

      // 3) FLAG THE RAID LEDGER — the active executed raid row(s) for this building → 'repairing'.
      await tx
        .update(buildingRaid)
        .set({ status: 'repairing' })
        .where(
          and(
            eq(buildingRaid.player_id, playerId),
            eq(buildingRaid.building_id, buildingId),
            eq(buildingRaid.status, 'executed'),
          ),
        );

      return { completesAtTick };
    });
  }

  /**
   * The OPERATIONAL_REPAIR completion tick (set-based — no per-row loop). For the player, in ONE transaction:
   *   1) `UPDATE building_operational_state SET structural_state = 'operational', repair_completes_at_tick = NULL
   *      WHERE player_id = ? AND structural_state = 'repairing' AND repair_completes_at_tick <= currentTick`
   *      RETURNING building_id — flips every due 'repairing' building back to operational AND NULLs the timer (the
   *      repair is no longer armed). The cook/storage/deal ticks gate on structural_state='operational' (T2), so a
   *      repaired building's ops RESUME from the next tick.
   *   2) For the buildings flipped this tick, `UPDATE building_raid SET status = 'repaired' WHERE player_id = ? AND
   *      building_id = ANY(flipped) AND status = 'repairing'` — the raid ledger moves repairing → repaired.
   * Returns the count of buildings repaired this tick (0 in the common case — a clean no-op). DETERMINISTIC (NO RNG;
   * a fixed function of repair_completes_at_tick vs the tick passed in).
   */
  async completeDueRepairs(playerId: string, currentTick: number): Promise<number> {
    return this.db.transaction(async (tx) => {
      const flipped = await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'operational', repair_completes_at_tick: null })
        .where(
          and(
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'repairing'),
            lte(buildingOperationalState.repair_completes_at_tick, currentTick),
          ),
        )
        .returning({ building_id: buildingOperationalState.building_id });

      if (flipped.length === 0) return 0; // no due repair → clean no-op (no raid-ledger update either).

      const buildingIds = flipped.map((r) => r.building_id);
      await tx
        .update(buildingRaid)
        .set({ status: 'repaired' })
        .where(
          and(
            eq(buildingRaid.player_id, playerId),
            inArray(buildingRaid.building_id, buildingIds),
            eq(buildingRaid.status, 'repairing'),
          ),
        );

      return flipped.length;
    });
  }
}

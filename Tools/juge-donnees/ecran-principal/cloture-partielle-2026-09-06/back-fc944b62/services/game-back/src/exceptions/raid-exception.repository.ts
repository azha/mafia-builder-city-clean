// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T3 (the thin write-paths the risky
//             handlers consume — a guarded wallet debit, an instant building-restore, a clamped heat adjust). R9.3: 09 owns
//             economy_states / building_operational_state / buildings; this READS the existing schema (never re-declares)
//             and uses only granted writes (app_rw UPDATE on economy_states 0013 + building_operational_state 0017 +
//             buildings 0013). The guarded debit byte-mirrors RepairRepository.debitAndArmRepair's `cash_cents >= cost`.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { economyState } from '../db/schema/player_economy_state';
import { building } from '../db/schema/city_state';
import { buildingOperationalState } from '../db/schema/operational_chain';

@Injectable()
export class RaidExceptionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * GUARDED wallet debit (the RepairRepository.debitAndArmRepair predicate): `UPDATE economy_states SET cash_cents =
   * cash_cents - cents WHERE player_id = ? AND cash_cents >= cents`. Returns false on 0 rows (insufficient balance — the
   * handler 409s; the balance can never go negative). The raw cents stay BO-only (R2.2).
   */
  async debitWallet(playerId: string, cents: number): Promise<boolean> {
    const rows = await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} - ${cents}` })
      .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${cents}`))
      .returning({ cash_cents: economyState.cash_cents });
    return rows.length > 0;
  }

  /**
   * INSTANT restore damaged→operational (the bribe-success path — the damage vanishes now, skipping the repair clock).
   * Guarded on `structural_state='damaged'` so it is idempotent + a no-op on a non-damaged building (returns false). Only
   * building_operational_state.structural_state is touched (the SAME column the raid flipped + the repair-completion tick
   * flips back — buildings.structural_state is untouched, consistent with executeRaid). The seized product/cash is NOT
   * restored — only the structural damage.
   */
  async restoreBuilding(playerId: string, buildingId: string): Promise<boolean> {
    const rows = await this.db
      .update(buildingOperationalState)
      .set({ structural_state: 'operational' })
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.structural_state, 'damaged'),
        ),
      )
      .returning({ building_id: buildingOperationalState.building_id });
    return rows.length > 0;
  }

  /** Read the player-owned building's current heat float ∈ [0,1], or null if no such building (BO-only — R2.2). */
  async getBuildingHeat(playerId: string, buildingId: string): Promise<number | null> {
    const rows = await this.db
      .select({ heat: building.heat })
      .from(building)
      .where(and(eq(building.player_id, playerId), eq(building.building_id, buildingId)))
      .limit(1);
    return rows[0]?.heat ?? null;
  }

  /**
   * CLAMPED heat adjust: read buildings.heat, write clamp(heat + delta, 0, 1) (respects the b_heat_chk CHECK) + stamp
   * last_heat_update_at. `delta < 0` sheds heat (bribe success / lay-low), `delta > 0` adds it (bribe failure). A no-op for
   * a building with no row (getBuildingHeat null). buildings.heat already has multiple writers (the heat tick, the test
   * hook); the resolve path is serial vs the tick in this slice.
   */
  async adjustBuildingHeat(playerId: string, buildingId: string, delta: number): Promise<void> {
    const current = await this.getBuildingHeat(playerId, buildingId);
    if (current === null) return;
    const next = Math.max(0, Math.min(1, current + delta));
    await this.db
      .update(building)
      .set({ heat: next, last_heat_update_at: sql`now()` })
      .where(and(eq(building.player_id, playerId), eq(building.building_id, buildingId)));
  }
}

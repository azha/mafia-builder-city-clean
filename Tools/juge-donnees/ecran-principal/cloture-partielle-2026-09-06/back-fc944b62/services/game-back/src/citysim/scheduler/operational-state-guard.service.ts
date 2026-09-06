// L1 — per-player operational-state guard (in-memory Map<playerId, boolean>).
//
// Purpose: skip orders 6-12 and 14-20 in the MINUTE band when a player has NO active
// operational state (empty-state players). Order 13 (RAID_EXECUTION) is always run — its
// trigger is exogenous (buffer filled by System 4, not by player state).
//
// Design invariants:
//   - Default: unknown player → TRUE (fail-safe — never wrongly skip).
//   - Per-minute re-check: the union-EXISTS query is run at most once per game-minute per
//     player (once-per-tick guard). Both TRUE and FALSE results expire when currentTick
//     advances — so a player who GAINS operational state between game-minutes is detected
//     correctly on the next minute without any explicit cache invalidation call.
//   - The union-EXISTS query OR-s 13 predicates in ONE round-trip to PG.

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';

@Injectable()
export class OperationalStateGuardService {
  /** cached active flag per player (true = has active operational state, false = empty-state) */
  private readonly cache = new Map<string, boolean>();

  /** tick at which each player was last checked — prevents double-query within the same tick */
  private readonly lastCheckedTick = new Map<string, number>();

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Returns true if the player HAS active operational state (conservative — unknown → TRUE).
   *
   * Per-minute re-check: if this player was already checked during the current game-minute
   * (lastCheckedTick === currentTick), the cached value (true or false) is returned immediately.
   * When currentTick has advanced past the last-checked tick, the union-EXISTS query is re-run —
   * even if the previous result was false — so a player who gains operational state between
   * game-minutes is always detected correctly on the next advance.
   */
  async isActive(playerId: string, currentTick: number): Promise<boolean> {
    // Guard: already checked this tick → return cached value (whatever it is).
    const lastChecked = this.lastCheckedTick.get(playerId) ?? -1;
    if (lastChecked === currentTick) {
      return this.cache.get(playerId) ?? true;
    }

    // Run the union-EXISTS query once per game-minute per player.
    const result = await this.runUnionExists(playerId, currentTick);
    this.cache.set(playerId, result);
    this.lastCheckedTick.set(playerId, currentTick);
    return result;
  }

  /**
   * Single union-EXISTS query — one DB round-trip that OR-s all 13 skippable-system predicates.
   * Returns true if ANY predicate matches (player has operational state), false if all miss.
   *
   * The predicates map exactly to orders 6-12 and 14-20:
   *   6  OPERATIONAL_SETUP         — building_operational_state conversion in progress
   *   7  PRECURSOR_ARRIVAL         — pending precursor_order arriving this tick
   *   8  COOK_ADVANCE              — active cook_session
   *   9  COURIER_TRANSIT           — in-transit courier_shift
   *  10  DEALER_SELL               — dealer in working state
   *  11  LAUNDER_OUTPUT            — laundering node with current_occupancy > 0
   *  12  OPERATIONAL_HEAT_CONTRIB  — product_storage with quantity_grams > 0
   *  14  OPERATIONAL_REPAIR        — building repairing
   *  15  COLD_CHAIN_DEGRADE        — product with quantity > 0 (cold) OR courier in_transit (already #9)
   *  16  HUSH_ADDICTION            — any hush_addiction row for player
   *  17  APPOINTMENT_EXPIRE        — any scheduled ash_appointment
   *  18  GROW_ADVANCE              — any active grow_session
   *  19  LIEUTENANT_TICK           — delegated executor lieutenant with valid script
   *  20  EQUIPMENT_TIER_UPGRADE    — building with equipment_tier_upgrade_remaining_ticks > 0
   *
   * Note: order 15 (COLD_CHAIN_DEGRADE) is gated on product_storage > 0 OR courier in_transit;
   * both are already covered by orders 12 and 9 respectively, so no extra predicate is needed.
   */
  private async runUnionExists(playerId: string, currentTick: number): Promise<boolean> {
    // The generic is `unknown` to allow the PG driver to return either boolean or string 't'/'f'.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.db.execute<{ has_state: unknown }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM building_operational_state
          WHERE player_id = ${playerId}
            AND conversion_stage NOT IN ('none', 'operational')
        UNION ALL
        SELECT 1 FROM precursor_order
          WHERE player_id = ${playerId}
            AND status = 'pending'
            AND arrives_at_tick <= ${currentTick}
        UNION ALL
        SELECT 1 FROM cook_session
          WHERE player_id = ${playerId}
            AND current_stage NOT IN ('completed', 'aborted')
        UNION ALL
        SELECT 1 FROM courier_shift
          WHERE player_id = ${playerId}
            AND status = 'in_transit'
        UNION ALL
        SELECT 1 FROM dealer
          WHERE player_id = ${playerId}
            AND current_state = 'working'
        UNION ALL
        SELECT 1 FROM laundering_nodes ln
          JOIN tail_risk_estimates tr ON tr.node_id = ln.node_id
          WHERE ln.player_id = ${playerId}
            AND tr.current_occupancy > 0
        UNION ALL
        SELECT 1 FROM product_storage
          WHERE player_id = ${playerId}
            AND quantity_grams > 0
        UNION ALL
        SELECT 1 FROM building_operational_state
          WHERE player_id = ${playerId}
            AND structural_state = 'repairing'
        UNION ALL
        SELECT 1 FROM hush_addiction
          WHERE player_id = ${playerId}
        UNION ALL
        SELECT 1 FROM ash_appointment
          WHERE player_id = ${playerId}
            AND status = 'scheduled'
        UNION ALL
        SELECT 1 FROM grow_session
          WHERE player_id = ${playerId}
            AND current_stage <> 'completed'
        UNION ALL
        SELECT 1 FROM lieutenant lt
          JOIN behavior_script bs ON bs.script_id = lt.behavior_script_id
          WHERE lt.player_id = ${playerId}
            AND lt.mode = 'delegated'
            AND lt.granted_role = 'executor'
            AND bs.valid = true
        UNION ALL
        SELECT 1 FROM building_operational_state
          WHERE player_id = ${playerId}
            AND equipment_tier_upgrade_remaining_ticks > 0
      ) AS has_state
    `);
    // Drizzle execute returns rows; has_state is a PG boolean (may come back as string 'true'/'false').
    const raw = (result.rows ?? result)[0]?.has_state;
    return raw === true || raw === 't' || raw === 'true';
  }
}

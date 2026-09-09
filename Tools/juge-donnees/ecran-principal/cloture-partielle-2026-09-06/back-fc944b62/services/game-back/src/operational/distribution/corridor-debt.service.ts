// IMPLEMENTS: docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 8 (C8)
//             DD-DEBT-SSOT — Single source-of-truth corridor debt accumulator (mig 0076)
//             System 9b C8 — 2026-06-23
//
// `CorridorDebtService` — the SINGLE owner of corridor_debt accumulation + decay.
//
// CONTRACT (DD-DEBT-SSOT D3 anti-double-count):
//   - Debt lives in EXACTLY ONE place: the `corridor_debt` table (per-player per-block).
//   - NO debt column on the `route` table (confirmed absent from C1/C7).
//   - NO separate route-level debt accumulator anywhere.
//   - Debt does NOT mutate patrol_heat (OQ-DB3). patrol_heat and corridor_debt are SEPARATE signals.
//   - The A* cost has BOTH a patrolTerm and a debtTerm as SEPARATE terms (route-finder.service.ts).
//
// ACCRUAL: accrueOnDispatch — UPSERT per block: debt_magnitude += corridorDebtAccrualPerUse (default 1.0).
// DECAY:   runDecayTick — NIGHTLY/11: debt_magnitude = max(0, debt_magnitude − corridorDebtDecayPerTick) (default 0.05).
// READ:    debtFor(playerId, blockId) — BO-only raw read; returns 0 if no row.
//          fullDebtSnapshot(playerId)  — all player debt rows → Map<blockId, debt_magnitude>.
//          debtSnapshotForBlocks(playerId, blockIds) — filtered snapshot (subset of blocks).
//
// Zero-regression: no corridor_debt rows → debt snapshot empty → A* debt term = 0 → byte-identical C7.
// No Math.random, no Date.now. All magnitudes via getters (no inline scalars).

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { corridorDebt } from '../../db/schema/operational_chain';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { distributionRouteLifecycleTunables } from './distribution-tunables';

@Injectable()
export class CorridorDebtService implements OnApplicationBootstrap {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
  ) {}

  onApplicationBootstrap(): void {
    // Register NIGHTLY debt decay tick (NIGHTLY/11 — next free after CAUGHT_EXCEPTION_SWEEP/10).
    // Cadence.DAILY does not exist in this scheduler; Cadence.NIGHTLY is "once per in-game day" (1440 minutes).
    this.scheduler.registerSystem({
      id: CitySystemId.CORRIDOR_DEBT_DECAY,
      cadence: Cadence.NIGHTLY,
      order: 11,
      run: (ctx) => this.runDecayTick(ctx),
    });
  }

  /**
   * Accrue corridor debt for each block in `pathBlocks` after a successful dispatch.
   * UPSERT: insert a new row with debt_magnitude = accrual, OR increment the existing row.
   * Stamps last_updated_tick = gameMinute.
   *
   * This is the ONLY accumulator for corridor debt (DD-DEBT-SSOT D3).
   * Does NOT write patrol_heat/suspicion_map (OQ-DB3).
   *
   * @param playerId  The player's uuid.
   * @param pathBlocks The A* path blocks (already computed by the dispatch — C7).
   * @param gameMinute The current game minute (from ctx.gameMinute or startedAtTick).
   */
  async accrueOnDispatch(playerId: string, pathBlocks: number[], gameMinute: number): Promise<void> {
    if (pathBlocks.length === 0) return;
    const accrual = distributionRouteLifecycleTunables.corridorDebtAccrualPerUse;
    for (const blockId of pathBlocks) {
      await this.db
        .insert(corridorDebt)
        .values({
          player_id: playerId,
          block_id: blockId,
          debt_magnitude: accrual,
          last_updated_tick: BigInt(gameMinute),
        })
        .onConflictDoUpdate({
          target: [corridorDebt.player_id, corridorDebt.block_id],
          set: {
            debt_magnitude: sql`${corridorDebt.debt_magnitude} + ${accrual}`,
            last_updated_tick: BigInt(gameMinute),
          },
        });
    }
  }

  /**
   * Decay tick — NIGHTLY/11.
   * Subtracts corridorDebtDecayPerTick (default 0.05) from every corridor_debt row for this player,
   * flooring at 0. Deterministic (no Math.random, no Date.now — uses ctx.gameMinute).
   * Organically a no-op for players with no corridor_debt rows.
   */
  async runDecayTick(ctx: CitySimTickContext): Promise<void> {
    const decay = distributionRouteLifecycleTunables.corridorDebtDecayPerTick;
    await this.db
      .update(corridorDebt)
      .set({
        debt_magnitude: sql`GREATEST(0, ${corridorDebt.debt_magnitude} - ${decay})`,
        last_updated_tick: BigInt(ctx.gameMinute),
      })
      .where(eq(corridorDebt.player_id, ctx.playerId));
  }

  /**
   * BO-only raw read for a single block's debt. Returns 0 if no row exists.
   * Never exposed to client (R2.2/P5).
   */
  async debtFor(playerId: string, blockId: number): Promise<number> {
    const [row] = await this.db
      .select({ debt_magnitude: corridorDebt.debt_magnitude })
      .from(corridorDebt)
      .where(
        and(
          eq(corridorDebt.player_id, playerId),
          eq(corridorDebt.block_id, blockId),
        ),
      )
      .limit(1);
    return row?.debt_magnitude ?? 0;
  }

  /**
   * Full player debt snapshot — loads all corridor_debt rows for a player into a Map.
   * Used before computePath so A* has real debt for all the player's blocks.
   * Returns an empty map for players with no debt rows (zero-regression invariant).
   */
  async fullDebtSnapshot(playerId: string): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ block_id: corridorDebt.block_id, debt_magnitude: corridorDebt.debt_magnitude })
      .from(corridorDebt)
      .where(eq(corridorDebt.player_id, playerId));
    const snapshot = new Map<number, number>();
    for (const row of rows) {
      snapshot.set(row.block_id, row.debt_magnitude);
    }
    return snapshot;
  }

  /**
   * Filtered debt snapshot — loads corridor_debt rows for a specific set of blocks.
   * More efficient than fullDebtSnapshot when the block set is small.
   */
  async debtSnapshotForBlocks(playerId: string, blockIds: number[]): Promise<Map<number, number>> {
    if (blockIds.length === 0) return new Map();
    const rows = await this.db
      .select({ block_id: corridorDebt.block_id, debt_magnitude: corridorDebt.debt_magnitude })
      .from(corridorDebt)
      .where(
        and(
          eq(corridorDebt.player_id, playerId),
          inArray(corridorDebt.block_id, blockIds),
        ),
      );
    const snapshot = new Map<number, number>();
    for (const row of rows) {
      snapshot.set(row.block_id, row.debt_magnitude);
    }
    return snapshot;
  }
}

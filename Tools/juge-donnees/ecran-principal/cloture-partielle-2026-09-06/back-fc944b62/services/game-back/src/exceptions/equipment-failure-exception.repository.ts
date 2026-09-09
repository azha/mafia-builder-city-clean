// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C5 (the guarded debit + demolition
//             write-paths the 4 repair handlers consume) + docs/superpowers/specs/2026-07-10-04f-A-maintenance-
//             design.md §6 (the 4-option repair semantics) + §3 (equipment_failure_log — the roll_detail
//             estimate this file grounds the IMMEDIATE/SLOW debit on, and the 4 resolution columns
//             repair_mode/repair_cost_cents/repair_completes_at_tick/resolved_at this file stamps at resolve).
//             Pattern: exceptions/raid-exception.repository.ts (the thin exceptions-local repository template —
//             imports schema DIRECTLY, mirrors the Phase-16 guarded-debit/instant-restore/clamped-adjust shape)
//             + operational/enforcement/repair.repository.ts (`debitAndArmRepair` — the guarded-debit-then-arm
//             transaction shape THIS file's `debitAndArmFailureRepair` mirrors, incl. the "guarded write first,
//             belt-and-braces writes after" posture — no mid-transaction rollback-on-null is relied upon,
//             matching the raid precedent's own risk tolerance).
//             — 04f-A C5 — 2026-07-10
//
// `EquipmentFailureExceptionRepository` — the persisted access layer the 4 repair handlers + the producer's
// periodic re-emission sweep consume. SELF-CONTAINED (imports `building_operational_state` / `buildings` /
// `economy_states` / `equipment_failure_log` / `city_sim_clock` schema DIRECTLY, exactly like
// `RaidExceptionRepository`) — deliberately NOT importing `MaintenanceRepository` (that would pull in
// `operational/maintenance`, and `MaintenanceModule` needs to consume THIS module's producer for the D4
// re-emission wiring; importing `MaintenanceModule` here would create the circular dependency the module-wiring
// comment in `maintenance.module.ts` documents). NO schema change (mig 0119 already landed every column this
// file reads/writes).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { economyState } from '../db/schema/player_economy_state';
import { building } from '../db/schema/city_state';
import { buildingOperationalState, equipmentFailureLog } from '../db/schema/operational_chain';
import { citySimClock } from '../db/schema/city_sim_clock';

/** The C4 seeded roll's repair-cost ESTIMATE (design §5 `roll_detail.repair_cost_estimate_cents`) — the ONE
 *  number the IMMEDIATE/SLOW handlers ground their debit on (never re-derived independently, DD-M3). */
export interface FailureRepairEstimate {
  failureId: string;
  repairCostEstimateCents: number;
}

@Injectable()
export class EquipmentFailureExceptionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** The player's CURRENT in-game tick (city_sim_clock.game_minute) — the SAME authoritative clock read
   *  `RepairRepository.getCurrentTick` / `MaintenanceRepository.getCurrentGameDayAndMinute` use. 0 when the
   *  player has no clock row yet (the deterministic advance harness lazy-creates it on first advance). */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * The MOST RECENT `equipment_failure_log` row for a building (design §5's `roll_detail.
   * repair_cost_estimate_cents`) — a building can only be 'failed' from ONE live failure at a time (the atomic-5
   * guarded flip only ever succeeds from 'operational'), so "most recent" IS "the live one", REGARDLESS of
   * whether a PRIOR resolution already stamped `resolved_at` on it (DEFER freezes `repair_mode='defer'` +
   * `resolved_at` on the SAME row while the building stays 'failed' — a later IMMEDIATE/SLOW/DEMOLISH_REPLACE on
   * the re-emitted card overwrites those 4 columns on the SAME row; this is a single-failure-event ledger, not a
   * per-resolve-attempt log). Returns null when no failure has EVER been logged for this building (defensive —
   * unreachable via the real resolve flow, since a card only exists after a real failure).
   */
  async getLatestFailureEstimate(buildingId: string): Promise<FailureRepairEstimate | null> {
    const rows = await this.db
      .select({ failure_id: equipmentFailureLog.failure_id, roll_detail: equipmentFailureLog.roll_detail })
      .from(equipmentFailureLog)
      .where(eq(equipmentFailureLog.building_id, buildingId))
      .orderBy(desc(equipmentFailureLog.failed_at))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const detail = (row.roll_detail ?? {}) as Record<string, unknown>;
    const cents = Number(detail.repair_cost_estimate_cents);
    if (!Number.isFinite(cents)) return null;
    return { failureId: row.failure_id, repairCostEstimateCents: cents };
  }

  /**
   * IMMEDIATE/SLOW (design §6) — the ATOMIC guarded-debit-then-arm transaction (the `RepairRepository.
   * debitAndArmRepair` shape, verbatim): in ONE DB transaction —
   *   1) GUARDED DEBIT: `cash_cents >= cost` IN the UPDATE — insufficient balance → 0 rows → return null (the
   *      caller 409s; NOTHING else is written — this is the ONLY early-return gate, mirroring the raid
   *      precedent's own risk posture: a debit that succeeds is never rolled back by a later belt-and-braces
   *      no-op, since the caller (`ExceptionsService.resolve`) already validated ownership + pending BEFORE
   *      invoking the handler).
   *   2) ARM REPAIR: `structural_state='failed' → 'repairing'` + `repair_completes_at_tick` (REUSE the field +
   *      tick-space the raid `OPERATIONAL_REPAIR` MINUTE/14 completion tick already flips — NO new tick).
   *   3) STAMP the `equipment_failure_log` row's 4 resolution columns (repair_mode/repair_cost_cents/
   *      repair_completes_at_tick/resolved_at) — the schema's "NULL until resolved" contract fires here.
   * Returns `{ completesAtTick }` on success, or null when the debit was refused. DETERMINISTIC.
   */
  async debitAndArmFailureRepair(params: {
    playerId: string;
    buildingId: string;
    failureId: string;
    costCents: bigint;
    completesAtTick: number;
    repairMode: 'immediate' | 'slow';
  }): Promise<{ completesAtTick: number } | null> {
    const { playerId, buildingId, failureId, costCents, completesAtTick, repairMode } = params;
    return this.db.transaction(async (tx) => {
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole repair (the tx rolls back the no-op).
        return null;
      }

      await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'repairing', repair_completes_at_tick: completesAtTick })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'failed'),
          ),
        );

      await tx
        .update(equipmentFailureLog)
        .set({
          repair_mode: repairMode,
          repair_cost_cents: Number(costCents),
          repair_completes_at_tick: completesAtTick,
          resolved_at: new Date(),
        })
        .where(eq(equipmentFailureLog.failure_id, failureId));

      return { completesAtTick };
    });
  }

  /**
   * DEFER (design §6) — NO debit; the building STAYS 'failed' (no `building_operational_state` write at all —
   * D13-adjacent honesty: deferring is not a job, it is a non-choice). Stamps the log row's 4 resolution columns
   * (`repair_mode='defer'`, cost/tick NULL, `resolved_at=now()`) — the single-resolve-then-frozen-until-
   * overwritten shape `getLatestFailureEstimate`'s own doc explains. A no-op if the building has no logged
   * failure yet (defensive — unreachable via the real flow).
   */
  async stampDeferred(failureId: string): Promise<void> {
    await this.db
      .update(equipmentFailureLog)
      .set({ repair_mode: 'defer', repair_cost_cents: null, repair_completes_at_tick: null, resolved_at: new Date() })
      .where(eq(equipmentFailureLog.failure_id, failureId));
  }

  /**
   * DEMOLISH_REPLACE (design §6, seam 6) — the FIRST real demolition write-path, in ONE DB transaction:
   *   1) GUARDED CLEAR: `DELETE FROM building_operational_state WHERE building_id=? AND player_id=? AND
   *      structural_state='failed' RETURNING building_id` — "the operational row terminally cleared" (the
   *      1-1 row's own DELETE grant, mig 0017). 0 rows → return false (the ONLY early-return gate — mirrors
   *      `debitAndArmFailureRepair`'s posture; nothing else is written).
   *   2) `buildings.structural_state='demolished'` (the city-state terminal enum member, mig 0013 verbatim —
   *      `structural_state` pgEnum already carries it; this is the FIRST code path to ever write it). The block
   *      is now FREED: `RealEstateRepository.isBlockFreeForPlayer` (04f-A C5 additive edit) excludes a
   *      'demolished' building from the occupancy check, so a follow-up `purchase()` on the SAME block_id
   *      succeeds — "replace" REUSES the EXISTING purchase/convert flow (no new build endpoint).
   *   3) If a `failureId` is known, stamp the log row's 4 resolution columns
   *      (`repair_mode='demolish_replace'`, cost/tick NULL — no repair ever ran, `resolved_at=now()`).
   * Returns true on success, false when the guarded clear found no 'failed' row (nothing demolished).
   */
  async demolishAndClear(params: { playerId: string; buildingId: string; failureId: string | null }): Promise<boolean> {
    const { playerId, buildingId, failureId } = params;
    return this.db.transaction(async (tx) => {
      const cleared = await tx
        .delete(buildingOperationalState)
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'failed'),
          ),
        )
        .returning({ building_id: buildingOperationalState.building_id });
      if (cleared.length === 0) {
        // Guarded — not (or no longer) a failed operational row for this player. Nothing else written.
        return false;
      }

      await tx
        .update(building)
        .set({ structural_state: 'demolished' })
        .where(and(eq(building.building_id, buildingId), eq(building.player_id, playerId)));

      if (failureId) {
        await tx
          .update(equipmentFailureLog)
          .set({
            repair_mode: 'demolish_replace',
            repair_cost_cents: null,
            repair_completes_at_tick: null,
            resolved_at: new Date(),
          })
          .where(eq(equipmentFailureLog.failure_id, failureId));
      }

      return true;
    });
  }

  /**
   * D4 — every building CURRENTLY `structural_state='failed'` for a player (the periodic re-emission sweep's
   * candidate set, `EquipmentFailureCardService.reemitForFailedBuildings`). A building leaves this set the
   * moment it is repaired/demolished (its `building_operational_state` row is either flipped to 'repairing' or
   * DELETED, design §6) — no separate bookkeeping needed. Ordered by building_id for deterministic iteration.
   */
  async listFailedBuildingIds(playerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(and(eq(buildingOperationalState.player_id, playerId), eq(buildingOperationalState.structural_state, 'failed')))
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => r.building_id);
  }
}

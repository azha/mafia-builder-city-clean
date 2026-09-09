// IMPLEMENTS: docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 1 (C1)
//             System 9 §9 Detection & Consequence C1 — 2026-06-21
//             docs/tech/04a_operational_systems/distribution_couriers_runners.md §9
//
// `DistributionDetectionRepository` — Drizzle CRUD for the caught_exception table +
// the courier.sessions_active counter. Used by CourierDetectionService (C5+).
//
// C1 scope: persistence CRUD only — no mechanic logic (markCourierCaught lands in C5,
// resolution in C9, leak in C10). The C1 _test route drives these directly for the
// persistence probe. Later chunks consume this repo via DI injection.
//
// R9.3: schema is docs/tech/09_data_model/schema_operational_chain.md §7.14 (backported C1).
// R2.2: leak_magnitude is BO-only (null while pending; never projected raw client).
// No Math.random (DIV-5/C4 — no PRNG here; C6 uses MarketRngService.seedFromDay).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lte, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import {
  caughtException,
  courier,
  courierShift,
  type CaughtExceptionInsert,
  type CaughtExceptionRow,
  type CaughtExceptionStatus,
} from '../../db/schema/operational_chain';

@Injectable()
export class DistributionDetectionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ── caught_exception CRUD ──────────────────────────────────────────────────────────────────────

  /**
   * Insert a new caught_exception row (called by markCourierCaught C5 and the _test seed route C1).
   * Returns the inserted row.
   */
  async insertCaughtException(
    values: Omit<CaughtExceptionInsert, 'exception_id' | 'status'> & { status?: CaughtExceptionStatus },
  ): Promise<CaughtExceptionRow> {
    const [row] = await this.db
      .insert(caughtException)
      .values({
        status: 'pending',
        ...values,
      })
      .returning();
    return row!;
  }

  /**
   * Read the most-recent caught_exception for a player (by player_id).
   * Returns null if none found.
   */
  async readCaughtExceptionForPlayer(playerId: string): Promise<CaughtExceptionRow | null> {
    const [row = null] = await this.db
      .select()
      .from(caughtException)
      .where(eq(caughtException.player_id, playerId))
      .limit(1);
    return row;
  }

  /**
   * Read a caught_exception by exception_id.
   * Returns null if not found.
   */
  async readCaughtException(exceptionId: string): Promise<CaughtExceptionRow | null> {
    const [row = null] = await this.db
      .select()
      .from(caughtException)
      .where(eq(caughtException.exception_id, exceptionId))
      .limit(1);
    return row;
  }

  /**
   * List all pending caught_exceptions whose resolution_deadline_tick ≤ currentTick (for the
   * auto-abandon sweep, C9). Returns [] if none.
   */
  async listPendingPastDeadline(currentTick: bigint): Promise<CaughtExceptionRow[]> {
    return this.db
      .select()
      .from(caughtException)
      .where(
        and(
          eq(caughtException.status, 'pending'),
          lte(caughtException.resolution_deadline_tick, currentTick),
        ),
      );
  }

  /**
   * Update the status (+ optional resolved_at_tick / leak_magnitude / legal_case_id) of a
   * caught_exception. Used by resolveCaughtException (C9/C4) and the auto-abandon sweep.
   *
   * C4 additive: `legal_case_id` is set ONLY by the LAWYER_UP re-wire branch (when a LegalCase
   * is opened). ABANDON / VIOLENT_SILENCE leave `legal_case_id` as NULL (retro-compat, RATIFIÉ #2).
   */
  async updateExceptionStatus(
    exceptionId: string,
    update: {
      status: CaughtExceptionStatus;
      resolved_at_tick?: bigint | null;
      leak_magnitude?: number | null;
      /** C4 (04d-A LAWYER_UP re-wire): FK to legal_cases.case_id. NULL for non-LAWYER_UP resolutions. */
      legal_case_id?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(caughtException)
      .set(update)
      .where(eq(caughtException.exception_id, exceptionId));
  }

  // ── courier.sessions_active ───────────────────────────────────────────────────────────────────

  /**
   * Increment sessions_active by 1 for the courier (called in the dispatch tx, C4).
   */
  async incrementSessionsActive(courierId: string): Promise<void> {
    await this.db
      .update(courier)
      .set({ sessions_active: sql`${courier.sessions_active} + 1` })
      .where(eq(courier.courier_id, courierId));
  }

  /**
   * Read sessions_active for a courier (for snapshot at catch time, C5/C9/C10).
   * Returns 0 if the courier does not exist.
   */
  async readSessionsActive(courierId: string): Promise<number> {
    const [row = null] = await this.db
      .select({ sessions_active: courier.sessions_active })
      .from(courier)
      .where(eq(courier.courier_id, courierId))
      .limit(1);
    return row?.sessions_active ?? 0;
  }

  // ── markCaught UPDATE (used by markCourierCaught C5 + the _test seed path) ──────────────────

  /**
   * Mark a courier shift as caught (status='caught') and the courier as caught (current_state='caught').
   * Called by markCourierCaught (C5) after the idempotency guard.
   * Returns the updated shift status for the idempotency check.
   */
  async markShiftCaught(shiftId: string, courierId: string): Promise<{ status: string } | null> {
    const [row = null] = await this.db
      .update(courierShift)
      .set({ status: 'caught' })
      .where(eq(courierShift.shift_id, shiftId))
      .returning({ status: courierShift.status });
    if (row) {
      await this.db
        .update(courier)
        .set({ current_state: 'caught' })
        .where(eq(courier.courier_id, courierId));
    }
    return row;
  }
}

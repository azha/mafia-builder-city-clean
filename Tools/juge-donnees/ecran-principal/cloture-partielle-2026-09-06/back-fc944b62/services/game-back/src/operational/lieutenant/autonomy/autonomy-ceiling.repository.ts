// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.1/§3.2/§3.3
//             (the autonomy_ceiling_state persistence — 1-1 lieutenant, the per-category delegation budget jsonb +
//             cycle_id + last_refresh_tick) -- Phase-19 L1a Task 4 (ceiling state repository) --
//
// `AutonomyCeilingRepository` — the persisted access layer for the Phase-19 L1a autonomy_ceiling_state entity (the
// per-lieutenant delegation budget). Mirrors the LieutenantRepository template EXACTLY: a thin `*.repository.ts` owning
// the raw Drizzle reads/writes with EXPLICIT columns, the `@Inject(DB)` Drizzle client, paired with the service that holds
// the gate logic. R9.3: 09's schema (autonomy_ceiling.ts — migration 0031) is the source of truth; this file IMPORTS the
// schema and NEVER re-declares it. The runtime role app_rw has SELECT/INSERT/UPDATE/DELETE on autonomy_ceiling_state
// (0013 + 0031's targeted GRANT) — this repository uses exactly those. PARAMETERIZED binds (no string interpolation),
// DETERMINISTIC (no RNG).

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { autonomyCeilingState, type AutonomyCeilingStateRow } from '../../../db/schema/autonomy_ceiling';
import type { Budget } from './autonomy-category';

@Injectable()
export class AutonomyCeilingRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read the autonomy_ceiling_state row for a lieutenant by its PK (the 1-1 lieutenant_id), or null when no row exists
   * yet (the service lazy-seeds on first access). NOT player-scoped: the tick has already resolved the player-owned
   * lieutenant, so this is an internal post-ownership read (the SAME convention LieutenantRepository's tick reads use).
   * A READ — no state change.
   */
  async getState(lieutenantId: string): Promise<AutonomyCeilingStateRow | null> {
    const rows = await this.db
      .select()
      .from(autonomyCeilingState)
      .where(eq(autonomyCeilingState.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * INSERT a fresh autonomy_ceiling_state row (the lazy-seed on first access): the lieutenant_id (PK), the archetype_key
   * (the archetype this budget was seeded from), the seeded `budget` (the T2 `Budget` object → jsonb), and the
   * lastRefreshTick anchor (so the first refresh window is measured from the seed tick, not from 0). cycle_id keeps its
   * schema DEFAULT (0). Returns the inserted row via `.returning()` (the canonical DB shape, incl. the DEFAULTed cycle_id /
   * created_at / updated_at) so the caller needs no re-read. PARAMETERIZED. DETERMINISTIC.
   */
  async insertState(
    lieutenantId: string,
    archetypeKey: string,
    budget: Budget,
    lastRefreshTick: number,
  ): Promise<AutonomyCeilingStateRow> {
    const [created] = await this.db
      .insert(autonomyCeilingState)
      .values({
        lieutenant_id: lieutenantId,
        // archetype_key is SEED-PROVENANCE / audit ONLY — the category math (capFor/projectCategory) always uses the
        // caller's `archetype` argument, NEVER state.archetype_key. It records which archetype seeded this budget.
        archetype_key: archetypeKey,
        budget,
        last_refresh_tick: lastRefreshTick,
      })
      .returning();
    return created;
  }

  /**
   * UPDATE the budget read-modify-write: set the whole `budget` jsonb (the in-place-mutated T2 `Budget` object), the
   * cycle_id, the last_refresh_tick, and bump updated_at. Keyed by lieutenant_id (the PK). This is a per-lieutenant
   * per-tick single-row write (the tick is single-threaded over a player's lieutenants), so writing the whole object is
   * safe. PARAMETERIZED. DETERMINISTIC.
   */
  async writeBudget(
    lieutenantId: string,
    budget: Budget,
    cycleId: number,
    lastRefreshTick: number | null,
  ): Promise<void> {
    await this.db
      .update(autonomyCeilingState)
      .set({
        budget,
        cycle_id: cycleId,
        last_refresh_tick: lastRefreshTick,
        updated_at: sql`now()`,
      })
      .where(eq(autonomyCeilingState.lieutenant_id, lieutenantId));
  }
}

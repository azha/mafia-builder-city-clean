// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 1 (C1) Step 6
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9
//             — Combat & Escalation B C1 — 2026-06-25 —
//
// `CombatRepository` — CRUD skeleton for all 8 B-owned tables + the rival_state combat-column writers.
//
// Methods (C1):
//   upsertCombatOperation    — INSERT or UPDATE one combat_operation row
//   readCombatOperation      — SELECT by (player_id, rival_key) (returns first match or null)
//   deleteCombatOperation    — DELETE by player_id + rival_key
//   insertCombatEvent        — INSERT one combat_event row (returns the inserted row)
//   deleteCombatEvents       — DELETE all combat_event rows for player_id (+ optional rival_key)
//
// Methods (W6.1 C2):
//   listPendingAssaults      — SELECT combat_event WHERE type='assault' AND outcome_bucket IS NULL,
//                              ordered (created_at_minute, id) ASC — CombatResolutionTickService's
//                              L1 skip + resolution loop.
//   markAssaultResolved      — the GUARDED UPDATE (WHERE id=$1 AND outcome_bucket IS NULL) that
//                              closes the resolution mutex (design §1 D6).
//
// Methods (W6.1 C4):
//   listEngagementsForPlayer — SELECT combat_event WHERE player_id=$1 AND type='assault', ordered
//                              desc(created_at_minute), desc(id) — GET /v1/me/engagements's source.
//
//   upsertEscalationGlobal   — INSERT or UPDATE the single escalation_global_state row (id=1)
//   readEscalationGlobal     — SELECT the single global row (or null)
//   upsertEscalationPair     — INSERT or UPDATE escalation_pair_state (player_id, rival_key)
//   readEscalationPair       — SELECT by (player_id, rival_key)
//   deleteEscalationPair     — DELETE by (player_id, rival_key)
//   upsertOscillationLek     — INSERT or UPDATE oscillation_lek_state (player_id, tile_id)
//   readOscillationLek       — SELECT by (player_id, tile_id)
//   deleteOscillationLek     — DELETE by (player_id, tile_id)
//   upsertDeescalationPair   — INSERT or UPDATE deescalation_pair_state (player_id, rival_key)
//   readDeescalationPair     — SELECT by (player_id, rival_key)
//   deleteDeescalationPair   — DELETE by (player_id, rival_key)
//   upsertConflictFlow       — INSERT or UPDATE conflict_flow_state (player_id, rival_key)
//   readConflictFlow         — SELECT by (player_id, rival_key)
//   deleteConflictFlow       — DELETE by (player_id, rival_key)
//   upsertDeadHand           — INSERT or UPDATE dead_hand_cache_state (player_id, rival_key)
//   readDeadHand             — SELECT by (player_id, rival_key)
//   deleteDeadHand           — DELETE by (player_id, rival_key)
//   writeRivalCombatCols     — UPDATE the 5 B-owned columns on rival_state (OQ-B2)
//
// R2.2 / P6: all raw scalar columns are server-only. No player-facing projection in this file.
// Anti-fabrication: no Math.random(). Pure deterministic CRUD.
// Zero-regression: ADDITIVE only.

import { Injectable, Inject } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import {
  combatOperation,
  combatEvent,
} from '../../../db/schema/conflict_combat';
import {
  escalationGlobalState,
  escalationPairState,
  oscillationLekState,
  deescalationPairState,
  conflictFlowState,
  deadHandCacheState,
} from '../../../db/schema/conflict_escalation';
import { rivalState, rivalHolding } from '../../../db/schema/conflict_rival';
import type {
  CombatOperationRow,
  CombatEventRow,
  EscalationGlobalRow,
  EscalationPairRow,
  OscillationLekRow,
  DeescalationPairRow,
  ConflictFlowRow,
  DeadHandCacheRow,
  PartitionState,
  FrictionBand,
} from './combat.types';
// W6.1 C2: imported straight from the module that PRODUCES the value (`getDivergenceOutcome`).
// Design §0.11/§6 B-1 (W6.1 C4): `combat.types.ts` re-exports this SAME type (no more homonym) —
// either import path now names the identical type; this one is kept as-is (no repoint needed).
// friction-budget.service.ts already imports from this same module for the same reason.
import type { CombatOutcomeBucket } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class CombatRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─── combat_operation ─────────────────────────────────────────────────────────────────────────
  // combat_operation has a standalone PK (operation_id uuid). There is no unique constraint on
  // (player_id, rival_key), so upsert uses a SELECT-then-INSERT-or-UPDATE pattern.

  async upsertCombatOperation(
    playerId: string,
    rivalKey: RivalKey,
    values: Partial<Omit<CombatOperationRow, 'operation_id' | 'player_id' | 'rival_key'>>,
  ): Promise<CombatOperationRow> {
    // Check if a row already exists for (player_id, rival_key).
    const existing = await this.readCombatOperation(playerId, rivalKey);
    if (existing) {
      // Row exists — update it.
      const [updated] = await this.db
        .update(combatOperation)
        .set(values)
        .where(
          and(
            eq(combatOperation.player_id, playerId),
            eq(combatOperation.rival_key, rivalKey),
          ),
        )
        .returning();
      return updated as CombatOperationRow;
    }
    // No row — insert.
    const [inserted] = await this.db
      .insert(combatOperation)
      .values({ player_id: playerId, rival_key: rivalKey, ...values })
      .returning();
    return inserted as CombatOperationRow;
  }

  async readCombatOperation(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<CombatOperationRow | null> {
    const rows = await this.db
      .select()
      .from(combatOperation)
      .where(
        and(
          eq(combatOperation.player_id, playerId),
          eq(combatOperation.rival_key, rivalKey),
        ),
      )
      .limit(1);
    return (rows[0] as CombatOperationRow) ?? null;
  }

  async deleteCombatOperation(playerId: string, rivalKey: RivalKey): Promise<void> {
    await this.db
      .delete(combatOperation)
      .where(
        and(
          eq(combatOperation.player_id, playerId),
          eq(combatOperation.rival_key, rivalKey),
        ),
      );
  }

  // ─── combat_event ─────────────────────────────────────────────────────────────────────────────

  async insertCombatEvent(
    values: Omit<CombatEventRow, 'id'>,
  ): Promise<CombatEventRow> {
    const [row] = await this.db
      .insert(combatEvent)
      .values(values as typeof combatEvent.$inferInsert)
      .returning();
    return row as CombatEventRow;
  }

  async deleteCombatEvents(playerId: string, rivalKey?: RivalKey): Promise<void> {
    if (rivalKey) {
      await this.db
        .delete(combatEvent)
        .where(
          and(
            eq(combatEvent.player_id, playerId),
            eq(combatEvent.target_rival_key, rivalKey),
          ),
        );
    } else {
      await this.db.delete(combatEvent).where(eq(combatEvent.player_id, playerId));
    }
  }

  /**
   * `listPendingAssaults` — W6.1 C2: all `combat_event` rows for this player with
   * `type='assault' AND outcome_bucket IS NULL`, ordered `(created_at_minute, id)` ASC (design §4
   * C2 — stable insertion order; `created_at_minute` is game-tick, `id` the tiebreak for same-minute
   * events, mirroring `combat-projection.service.ts`'s own `orderBy` on the same pair).
   * Used by CombatResolutionTickService's L1 empty-state skip (zero rows → ZERO writes) + the
   * per-event resolution loop. Pure SELECT — no side effects.
   */
  async listPendingAssaults(playerId: string): Promise<CombatEventRow[]> {
    const rows = await this.db
      .select()
      .from(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.type, 'assault'),
          isNull(combatEvent.outcome_bucket),
        ),
      )
      .orderBy(asc(combatEvent.created_at_minute), asc(combatEvent.id));
    return rows as CombatEventRow[];
  }

  /**
   * `markAssaultResolved` — W6.1 C2: the GUARDED UPDATE that closes the resolution mutex (design §1
   * D6). `WHERE id = $1 AND outcome_bucket IS NULL` — a crash-recovered re-run that reaches this
   * call a second time for an already-resolved event is a silent no-op (0 rows), never a double
   * write. Called LAST in the resolution sequence, strictly after the §9.1 cascade has committed.
   */
  async markAssaultResolved(
    eventId: string,
    outcomeBucket: CombatOutcomeBucket,
    frictionConsumedBucket: FrictionBand,
  ): Promise<CombatEventRow | null> {
    const [row] = await this.db
      .update(combatEvent)
      .set({
        outcome_bucket: outcomeBucket,
        friction_consumed_bucket: frictionConsumedBucket,
      })
      .where(
        and(
          eq(combatEvent.id, eventId),
          isNull(combatEvent.outcome_bucket),
        ),
      )
      .returning();
    return (row as CombatEventRow) ?? null;
  }

  /**
   * `listEngagementsForPlayer` — W6.1 C4 (`GET /v1/me/engagements`, design §4 C4). ALL `combat_event`
   * rows of `type='assault'` for this player, ordered `desc(created_at_minute), desc(id)` — the SAME
   * ordering `CombatProjectionService`'s own `lastOutcomeBucket` lookup already uses
   * (`combat-projection.service.ts:162`, most-recent-first; design §4 C4 names this line as the
   * precedent for C4's `orderBy`). `type='assault'` scopes the list to what `POST /v1/me/engagements`
   * can create — `hold` / `degrade_register` rows exist in this table (`oxbow-severance.service.ts`,
   * `erosion-register.service.ts`) but have no player-reachable writer in this lot, and
   * `COMBAT_RESOLUTION_TICK`'s own `listPendingAssaults` filters the SAME `type='assault'` — so a
   * `hold`/`degrade_register` row would show a permanently-`'scheduled'` status that never resolves.
   * `WHERE player_id = $1` is the ONLY scoping (co-tenance — never a cross-player row). Pure SELECT.
   */
  async listEngagementsForPlayer(playerId: string): Promise<CombatEventRow[]> {
    const rows = await this.db
      .select()
      .from(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.type, 'assault'),
        ),
      )
      .orderBy(desc(combatEvent.created_at_minute), desc(combatEvent.id));
    return rows as CombatEventRow[];
  }

  // ─── escalation_global_state ─────────────────────────────────────────────────────────────────

  async upsertEscalationGlobal(
    values: Partial<Omit<EscalationGlobalRow, 'id'>>,
  ): Promise<EscalationGlobalRow> {
    const [row] = await this.db
      .insert(escalationGlobalState)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: escalationGlobalState.id, set: values })
      .returning();
    return row as EscalationGlobalRow;
  }

  async readEscalationGlobal(): Promise<EscalationGlobalRow | null> {
    const rows = await this.db.select().from(escalationGlobalState).limit(1);
    return (rows[0] as EscalationGlobalRow) ?? null;
  }

  // ─── escalation_pair_state ───────────────────────────────────────────────────────────────────

  async upsertEscalationPair(
    playerId: string,
    rivalKey: RivalKey,
    values: Partial<Omit<EscalationPairRow, 'player_id' | 'rival_key'>>,
  ): Promise<EscalationPairRow> {
    const [row] = await this.db
      .insert(escalationPairState)
      .values({ player_id: playerId, rival_key: rivalKey, ...values })
      .onConflictDoUpdate({
        target: [escalationPairState.player_id, escalationPairState.rival_key],
        set: values,
      })
      .returning();
    return row as EscalationPairRow;
  }

  async readEscalationPair(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<EscalationPairRow | null> {
    const rows = await this.db
      .select()
      .from(escalationPairState)
      .where(
        and(
          eq(escalationPairState.player_id, playerId),
          eq(escalationPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    return (rows[0] as EscalationPairRow) ?? null;
  }

  async deleteEscalationPair(playerId: string, rivalKey: RivalKey): Promise<void> {
    await this.db
      .delete(escalationPairState)
      .where(
        and(
          eq(escalationPairState.player_id, playerId),
          eq(escalationPairState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * `readAllEscalationPairsForPlayer` — SELECT all escalation_pair_state rows for a player.
   *
   * Used by EscalationTickService.runEscalationTickForPlayer for the L1 empty-state check
   * and by SandpileStateService.recomputeCriticality for the tension-sum sweep.
   * C-esc ADDITIVE: no existing method modified.
   */
  async readAllEscalationPairsForPlayer(playerId: string): Promise<EscalationPairRow[]> {
    const rows = await this.db
      .select()
      .from(escalationPairState)
      .where(eq(escalationPairState.player_id, playerId));
    return rows as EscalationPairRow[];
  }

  // ─── oscillation_lek_state ───────────────────────────────────────────────────────────────────

  async upsertOscillationLek(
    playerId: string,
    tileId: number,
    rivalKey: RivalKey,
    values: Partial<Omit<OscillationLekRow, 'player_id' | 'tile_id' | 'rival_key'>>,
  ): Promise<OscillationLekRow> {
    // Note: Drizzle requires at least one key in `set` for onConflictDoUpdate.
    // Always include rival_key in the update payload so the set is never empty
    // (rival_key is the join axis and idempotent to re-set on conflict).
    const [row] = await this.db
      .insert(oscillationLekState)
      .values({ player_id: playerId, tile_id: tileId, rival_key: rivalKey, ...values })
      .onConflictDoUpdate({
        target: [oscillationLekState.player_id, oscillationLekState.tile_id],
        set: { rival_key: rivalKey, ...values },
      })
      .returning();
    return row as OscillationLekRow;
  }

  async readOscillationLek(
    playerId: string,
    tileId: number,
  ): Promise<OscillationLekRow | null> {
    const rows = await this.db
      .select()
      .from(oscillationLekState)
      .where(
        and(
          eq(oscillationLekState.player_id, playerId),
          eq(oscillationLekState.tile_id, tileId),
        ),
      )
      .limit(1);
    return (rows[0] as OscillationLekRow) ?? null;
  }

  async deleteOscillationLek(playerId: string, tileId: number): Promise<void> {
    await this.db
      .delete(oscillationLekState)
      .where(
        and(
          eq(oscillationLekState.player_id, playerId),
          eq(oscillationLekState.tile_id, tileId),
        ),
      );
  }

  /**
   * `readAllOscillationLeksForPlayer` — SELECT all oscillation_lek_state rows for a player.
   *
   * Used by EscalationTickService.runEscalationTickForPlayer for the L1 empty-state check
   * and for the per-contested-lek Lotka-Volterra dynamics sweep.
   * C-esc ADDITIVE: no existing method modified.
   */
  async readAllOscillationLeksForPlayer(playerId: string): Promise<OscillationLekRow[]> {
    const rows = await this.db
      .select()
      .from(oscillationLekState)
      .where(eq(oscillationLekState.player_id, playerId));
    return rows as OscillationLekRow[];
  }

  // ─── deescalation_pair_state ─────────────────────────────────────────────────────────────────

  async upsertDeescalationPair(
    playerId: string,
    rivalKey: RivalKey,
    values: Partial<Omit<DeescalationPairRow, 'player_id' | 'rival_key'>>,
  ): Promise<DeescalationPairRow> {
    const [row] = await this.db
      .insert(deescalationPairState)
      .values({ player_id: playerId, rival_key: rivalKey, ...values })
      .onConflictDoUpdate({
        target: [deescalationPairState.player_id, deescalationPairState.rival_key],
        set: values,
      })
      .returning();
    return row as DeescalationPairRow;
  }

  async readDeescalationPair(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DeescalationPairRow | null> {
    const rows = await this.db
      .select()
      .from(deescalationPairState)
      .where(
        and(
          eq(deescalationPairState.player_id, playerId),
          eq(deescalationPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    return (rows[0] as DeescalationPairRow) ?? null;
  }

  async deleteDeescalationPair(playerId: string, rivalKey: RivalKey): Promise<void> {
    await this.db
      .delete(deescalationPairState)
      .where(
        and(
          eq(deescalationPairState.player_id, playerId),
          eq(deescalationPairState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * `readAllDeescalationPairsForPlayer` — SELECT all deescalation_pair_state rows for a player.
   *
   * Used by DeEscalationTickService for the L1 empty-state skip check (COMBAT_DAILY_TICK):
   * if no rows exist, the tick exits immediately with ZERO writes (byte-identical pre-B world).
   * ADDITIVE: pure SELECT, no side effects.
   */
  async readAllDeescalationPairsForPlayer(playerId: string): Promise<DeescalationPairRow[]> {
    const rows = await this.db
      .select()
      .from(deescalationPairState)
      .where(eq(deescalationPairState.player_id, playerId));
    return rows as DeescalationPairRow[];
  }

  // ─── conflict_flow_state ─────────────────────────────────────────────────────────────────────

  async upsertConflictFlow(
    playerId: string,
    rivalKey: RivalKey,
    values: Partial<Omit<ConflictFlowRow, 'player_id' | 'rival_key'>>,
  ): Promise<ConflictFlowRow> {
    const [row] = await this.db
      .insert(conflictFlowState)
      .values({ player_id: playerId, rival_key: rivalKey, ...values })
      .onConflictDoUpdate({
        target: [conflictFlowState.player_id, conflictFlowState.rival_key],
        set: values,
      })
      .returning();
    return row as ConflictFlowRow;
  }

  async readConflictFlow(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<ConflictFlowRow | null> {
    const rows = await this.db
      .select()
      .from(conflictFlowState)
      .where(
        and(
          eq(conflictFlowState.player_id, playerId),
          eq(conflictFlowState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    return (rows[0] as ConflictFlowRow) ?? null;
  }

  async deleteConflictFlow(playerId: string, rivalKey: RivalKey): Promise<void> {
    await this.db
      .delete(conflictFlowState)
      .where(
        and(
          eq(conflictFlowState.player_id, playerId),
          eq(conflictFlowState.rival_key, rivalKey),
        ),
      );
  }

  // ─── dead_hand_cache_state ───────────────────────────────────────────────────────────────────

  async upsertDeadHand(
    playerId: string,
    rivalKey: RivalKey,
    values: Partial<Omit<DeadHandCacheRow, 'player_id' | 'rival_key'>>,
  ): Promise<DeadHandCacheRow> {
    const [row] = await this.db
      .insert(deadHandCacheState)
      .values({ player_id: playerId, rival_key: rivalKey, ...values })
      .onConflictDoUpdate({
        target: [deadHandCacheState.player_id, deadHandCacheState.rival_key],
        set: values,
      })
      .returning();
    return row as DeadHandCacheRow;
  }

  async readDeadHand(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DeadHandCacheRow | null> {
    const rows = await this.db
      .select()
      .from(deadHandCacheState)
      .where(
        and(
          eq(deadHandCacheState.player_id, playerId),
          eq(deadHandCacheState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    return (rows[0] as DeadHandCacheRow) ?? null;
  }

  async deleteDeadHand(playerId: string, rivalKey: RivalKey): Promise<void> {
    await this.db
      .delete(deadHandCacheState)
      .where(
        and(
          eq(deadHandCacheState.player_id, playerId),
          eq(deadHandCacheState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * `readDeadHandRowsForPlayer` — SELECT all dead_hand_cache_state rows for a given player.
   * Used by DEAD_HAND_TICK (C-cas) L1 skip: if empty → no refreshCache calls needed.
   */
  async readDeadHandRowsForPlayer(
    playerId: string,
  ): Promise<Array<{ rival_key: string }>> {
    return this.db
      .select({ rival_key: deadHandCacheState.rival_key })
      .from(deadHandCacheState)
      .where(eq(deadHandCacheState.player_id, playerId));
  }

  // ─── rival_state combat-column readers + writers (OQ-B2) ────────────────────────────────────────

  /**
   * OQ-B2: read the B-owned combat columns + vulnerable_axis + dominance_rank from rival_state.
   * Returns null if no row exists for (player_id, rival_key).
   * Used by PercolationService + ErosionRegisterService + CombatAdminController (SERVER-ONLY — never forwarded to client).
   * No Math.random().
   *
   * 04b-B closeout: now also selects cumulative_pressure_index, resource_pressure, dominance_rank
   * so CombatAdminController.getCombatState can return real values (not hardcoded null).
   */
  async readRivalCombatState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{
    operational_graph_node_count: number | null;
    active_link_fraction: number | null;
    partition_state: PartitionState | null;
    vulnerable_axis: 'muscle' | 'finance' | 'intel' | 'infrastructure' | 'leadership' | null;
    cumulative_pressure_index: number | null;
    resource_pressure: number | null;
    dominance_rank: number | null;
  } | null> {
    const rows = await this.db
      .select({
        operational_graph_node_count: rivalState.operational_graph_node_count,
        active_link_fraction:         rivalState.active_link_fraction,
        partition_state:              rivalState.partition_state,
        vulnerable_axis:              rivalState.vulnerable_axis,
        cumulative_pressure_index:    rivalState.cumulative_pressure_index,
        resource_pressure:            rivalState.resource_pressure,
        dominance_rank:               rivalState.dominance_rank,
      })
      .from(rivalState)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as {
      operational_graph_node_count: number | null;
      active_link_fraction: number | null;
      partition_state: PartitionState | null;
      vulnerable_axis: 'muscle' | 'finance' | 'intel' | 'infrastructure' | 'leadership' | null;
      cumulative_pressure_index: number | null;
      resource_pressure: number | null;
      dominance_rank: number | null;
    };
  }

  /**
   * `isHoldingOrphan` — check if a specific rival_holding block is marked as orphan.
   *
   * Returns true if the rival_holding row for (playerId, rivalKey, blockId) has is_orphan=true.
   * Returns false if the row doesn't exist or is_orphan=false.
   *
   * Used by PercolationService.applyAssault to suppress combat heat emission for orphan holdings.
   * [PROV-Y26Q2] orphan holdings produce zero combat heat (the canon §3.5 :263 reduced-heat
   * consequence). Zero is the conservative floor; calibration TD will refine if canon specifies
   * a non-zero partial heat multiplier (combat.oxbow_orphan_heat_multiplier).
   *
   * No Math.random(). Pure SELECT.
   */
  async isHoldingOrphan(playerId: string, rivalKey: RivalKey, blockId: number): Promise<boolean> {
    const rows = await this.db
      .select({ is_orphan: rivalHolding.is_orphan })
      .from(rivalHolding)
      .where(
        and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
          eq(rivalHolding.block_id, blockId),
        ),
      )
      .limit(1);
    return rows[0]?.is_orphan ?? false;
  }

  /**
   * Write the 5 B-owned combat columns on rival_state for (playerId, rivalKey).
   * OQ-B2: these columns were reserved by A (nullable via ALTER 0085) and are written by B.
   * All are SERVER-ONLY (P6 hidden). No Math.random().
   */
  async writeRivalCombatCols(
    playerId: string,
    rivalKey: RivalKey,
    cols: {
      active_link_fraction?: number | null;
      operational_graph_node_count?: number | null;
      partition_state?: PartitionState | null;
      cumulative_pressure_index?: number | null;
      resource_pressure?: number | null;
    },
  ): Promise<void> {
    await this.db
      .update(rivalState)
      .set(cols)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      );
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 6 (C6) Step 4
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.3
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §2.3 (Ephemeral Architecture)
//             DD-EPHEMERAL-REUSE: REUSES the 9b purge-scope discipline (DIV-E1 anti-exploit boundary).
//             — Combat & Escalation B C6 — 2026-06-25 —
//
// `EphemeralOperationService` — the §2.3 Ephemeral Architecture mechanic.
//
// setOperationEphemeralMode(operationId, ephemeral):
//   - UPDATE combat_operation SET ephemeral_mode = ephemeral WHERE operation_id = operationId.
//   - REUSES the live `TOGGLE_EPHEMERAL` DSL action token (dsl/signals.ts:73 —
//     `{ kind: 'TOGGLE_EPHEMERAL'; value: boolean }`). The `_test` drive route calls this
//     method directly (lesson #3 — live-vs-test convergence: NO parallel code path).
//   - Deterministic: no Math.random(), no Date.now().
//
// clearStateOlderThanWindow(playerId, rivalKey):
//   - The daily purge: DELETE combat_event rows for (playerId, rivalKey) pairs where the
//     associated combat_operation has ephemeral_mode=true.
//   - Scope ENUMERATED (DIV-E1 anti-exploit boundary — the 9b precedent):
//     PURGED:     `combat_event` rows for the player × rival (the PLAYER's execution trail).
//     NOT PURGED: `precinct_memory` / `suspicion_map` (BPD memory — the adversary's, DIV-E1).
//                 `boss_mirror_declaration_ledger` (adversary memory, DIV-E1).
//                 Any other adversary-memory table.
//   - Returns the count of rows deleted (idempotent: re-running on an already-purged state
//     returns 0 — no error).
//   - Deterministic: no Math.random(), no Date.now().
//
// applyAuditTrailDisable(operationId):
//   - Per design §3.3: when ephemeral_mode is true, audit_trail is NEVER written.
//   - Returns true if audit trail should be suppressed (ephemeral_mode=true). Pure DB read.
//
// PURGE-SCOPE DISCIPLINE (DD-EPHEMERAL-REUSE, DIV-E1):
//   The combat ephemeral purge is the ANALOG of the System-9b `EphemeralPurgeService.purgeAfterExecution`
//   for the distribution lot. The discipline is IDENTICAL:
//     - DELETE the PLAYER's own execution records (combat_event rows).
//     - NEVER DELETE adversary BPD / precinct-memory rows (they belong to the adversary's
//       memory model, not the player's trail).
//   This is an anti-exploit boundary: forward-secrecy means a captured lieutenant cannot
//   reconstruct the player's past operations, NOT that the BPD forgets its own surveillance data.
//
// R9.3: no new schema (uses C1's combat_operation + combat_event tables, ephemeral_mode column).
//        Migration 0091 adds `is_orphan` to rival_holding (Oxbow C6) — same-commit.
// C4: no Math.random, no Date.now.
// P6: SERVER-ONLY service. No player-facing projection in this file.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { combatOperation, combatEvent } from '../../../db/schema/conflict_combat';
import { ApiError } from '../../../protocol/api-error';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class EphemeralOperationService {
  private readonly logger = new Logger(EphemeralOperationService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * Set the ephemeral_mode flag for a combat_operation row.
   *
   * REUSES the live `TOGGLE_EPHEMERAL` DSL action token (dsl/signals.ts:73):
   *   `{ kind: 'TOGGLE_EPHEMERAL'; value: boolean }`
   * The `_test` drive route calls this method directly — the same code path the scheduler
   * would call (lesson #3: no separate test implementation).
   *
   * W6a C6 (P-B then P-A, F-C6-3) — `playerId` is now the FIRST argument (P-B: the lot-wide
   * invariant "playerId always first"). Pre-fix, this method took NO `playerId` at all: the UPDATE
   * matched on `operation_id` alone, so any caller naming ANY `operationId` could flip
   * `ephemeral_mode` on a rival's combat_operation — which then ARMS `clearStateOlderThanWindow`'s
   * daily purge (`:129`, `where(and(player_id, target_rival_key))`) to silently wipe that rival's
   * OWN combat_event trail on the next tick that scopes to the victim, corrupting their forensic
   * record without their consent. The WHERE is now joint (`operation_id = ? AND player_id = ?`,
   * single round-trip) and the affected-row count is checked: 0 rows ⇒ the operation is either
   * absent or belongs to another player — both collapse to the SAME 404 `RESOURCE_NOT_FOUND`
   * (D2 existence-masking, no new error code).
   *
   * @param playerId     The caller's player uuid. Must be the ACTUAL owner of `operationId`.
   * @param operationId  The combat_operation PK (uuid).
   * @param ephemeral    true = enable ephemeral mode; false = disable.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `operationId` is not `playerId`-owned.
   */
  async setOperationEphemeralMode(
    playerId: string,
    operationId: string,
    ephemeral: boolean,
  ): Promise<void> {
    // Apply the TOGGLE_EPHEMERAL action's value to the combat_operation row.
    // W6a C6 (F-C6-3) — joint WHERE (operation_id, player_id); 0 rows affected ⇒ 404.
    const [updated] = await this.db
      .update(combatOperation)
      .set({ ephemeral_mode: ephemeral })
      .where(
        and(
          eq(combatOperation.operation_id, operationId),
          eq(combatOperation.player_id, playerId),
        ),
      )
      .returning({ operation_id: combatOperation.operation_id });
    if (!updated) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `setOperationEphemeralMode: operation ${operationId} not found for player ${playerId}`,
      });
    }
    this.logger.debug(
      `EphemeralOperationService.setOperationEphemeralMode: player=${playerId} op=${operationId} ephemeral=${ephemeral}`,
    );
  }

  /**
   * Daily purge: DELETE combat_event rows for (playerId, rivalKey) when the operation
   * is in ephemeral_mode.
   *
   * PURGE SCOPE (DIV-E1 — the 9b anti-exploit boundary, verbatim):
   *   PURGED:     combat_event rows for (player_id, target_rival_key) — the PLAYER's trail.
   *   NOT PURGED: precinct_memory (BPD adversary memory — NEVER touched).
   *               boss_mirror_declaration_ledger (adversary memory — NEVER touched).
   *               patrol_observation_queues, caught_exception, corridor_debt — NEVER touched.
   *
   * Only runs the purge if ephemeral_mode=true for the given (playerId, rivalKey) pair.
   * Returns the number of combat_event rows deleted (0 if not ephemeral or already clean).
   * Idempotent: safe to call multiple times.
   * No Math.random(), no Date.now().
   *
   * @param playerId   The player whose execution trail is being purged.
   * @param rivalKey   The rival whose operation context to check for ephemeral_mode.
   * @returns          The number of combat_event rows deleted.
   */
  async clearStateOlderThanWindow(playerId: string, rivalKey: RivalKey): Promise<number> {
    // Step 1: Check if this player × rival operation is in ephemeral_mode.
    const opRows = await this.db
      .select({ ephemeral_mode: combatOperation.ephemeral_mode })
      .from(combatOperation)
      .where(
        and(
          eq(combatOperation.player_id, playerId),
          eq(combatOperation.rival_key, rivalKey),
        ),
      )
      .limit(1);

    const isEphemeral = opRows[0]?.ephemeral_mode ?? false;
    if (!isEphemeral) {
      // Non-ephemeral operation: purge is a no-op (the trail is retained — no DELETE).
      this.logger.debug(
        `EphemeralOperationService.clearStateOlderThanWindow: player=${playerId} rival=${rivalKey} not ephemeral — no purge`,
      );
      return 0;
    }

    // Step 2: DELETE the player's combat_event rows for this rival (the execution trail).
    // SCOPE: ONLY combat_event for (player_id, target_rival_key).
    // NEVER deletes precinct_memory, boss_mirror_declaration_ledger, or any adversary-memory table.
    const deleted = await this.db
      .delete(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.target_rival_key, rivalKey),
        ),
      )
      .returning({ id: combatEvent.id });

    this.logger.debug(
      `EphemeralOperationService.clearStateOlderThanWindow: player=${playerId} rival=${rivalKey} ephemeral=true deleted=${deleted.length} combat_event rows`,
    );
    return deleted.length;
  }

  /**
   * Audit-trail suppression gate — returns true if the audit trail should be disabled
   * for the given operation (ephemeral_mode=true).
   *
   * Per design §3.3 (canon :153): audit_trail is NEVER written when ephemeral=true.
   * Called before any audit write path.
   *
   * @param operationId  The combat_operation PK (uuid).
   * @returns            true if audit trail is suppressed; false otherwise.
   */
  async applyAuditTrailDisable(operationId: string): Promise<boolean> {
    const rows = await this.db
      .select({ ephemeral_mode: combatOperation.ephemeral_mode })
      .from(combatOperation)
      .where(eq(combatOperation.operation_id, operationId))
      .limit(1);
    const suppress = rows[0]?.ephemeral_mode ?? false;
    this.logger.debug(
      `EphemeralOperationService.applyAuditTrailDisable: op=${operationId} suppress=${suppress}`,
    );
    return suppress;
  }
}

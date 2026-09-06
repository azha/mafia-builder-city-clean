// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C5 (persistance —
//             2 rows créées dans la tx de décommission + GET list + pick-shortcut I9 + expiry N/31)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §7 (le
//             verbe replacement options, ★#5) + §13.1 (schema `replacement_option`, mig 0132 — cols/
//             UNIQUE(player_id,source_building_id,rank)/partial-open-index).
//             Decisions: I9 ("pick ≤1 replacement option par paire + expiry idempotente | `UPDATE …
//             WHERE picked_at IS NULL AND … RETURNING` (ferme la sœur même statement)").
//             Pattern: `friction-budget.repository.ts` (the `executor?: FrictionTx` optional-tx-threading
//             idiom — omitted → `this.db`, threaded → the caller's already-open tx) + `route-lifecycle.
//             repository.ts#severIfNotAlready` (guarded conditional UPDATE … RETURNING, exactly-once).
//             — P3-E C5 — 2026-07-17
//
// `ReplacementOptionRepository` — the ONLY writer/reader of `replacement_option` (mig 0132, table posed
// empty at C1). `createPair` is called from INSIDE `DecommissionRepository.decommissionOwnedNode`'s own
// tx (design §6.3(e) — additive, the SAME tx as the decommission's other mutations). `resolveAndClosePair`
// is the I9 guarded pick — ONE UPDATE statement closes BOTH options of a pair (the picked one gets
// `picked_at` stamped, the OPEN sibling gets `closed_at` only) — this is what makes "2 concurrent picks (1
// per option) → exactly 1 passes" hold: Postgres row-level locking serializes the 2 concurrent UPDATEs on
// the SAME rows, so whichever commits first closes BOTH; the loser's own WHERE `closed_at IS NULL` then
// matches ZERO rows (0-affected, its own `id` will not appear in `RETURNING`). `closeExpired` is the N/31
// sweep (design §7: "Expiry sweep : ride N/31 (0-write idempotent)") — same `closed_at IS NULL` guard.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { replacementOption, type ReplacementOptionRow } from '../../db/schema/demolition_compression';
import type { FrictionTx } from './friction-budget.repository';
import type { ScoredReplacementCandidate } from './replacement-option-scorer';

/** One OPEN option, R2.2-safe shape (buckets only — never a raw tick/cost). Used by the GET list + the
 *  E2E floor (which reads the underlying table directly for anything NOT surfaced here, same convention
 *  `demolition_decommission.spec.ts` already established for `friction_budget_state`). */
export interface OpenReplacementOptionRow {
  readonly id: string;
  readonly freedBlockId: number;
  readonly sourceBuildingId: string;
  readonly candidateBuildingTypeIndex: number;
  readonly rank: 1 | 2;
  readonly projected: Record<string, unknown>;
}

/** The resolved (block, type) pair a WINNING pick delegates to the purchase flow with. */
export interface ResolvedPick {
  readonly freedBlockId: number;
  readonly candidateBuildingTypeIndex: number;
}

function toOpenRow(row: ReplacementOptionRow): OpenReplacementOptionRow {
  return {
    id: row.id,
    freedBlockId: row.freed_block_id,
    sourceBuildingId: row.source_building_id,
    candidateBuildingTypeIndex: row.candidate_building_type,
    rank: row.rank as 1 | 2,
    projected: (row.projected ?? {}) as Record<string, unknown>,
  };
}

@Injectable()
export class ReplacementOptionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Design §6.3(e)/§7 — insert the `scored` candidates (rank 1 + rank 2, `ReplacementOptionScorer`'s own
   * output) as `replacement_option` rows, threading the CALLER's already-open `tx` (the decommission tx —
   * additive, runs at the END, after the friction re-eval §6.3(f)). `sourceBuildingId` is guaranteed FRESH
   * for these 2 rows (I2 — a building reaches 'demolished' EXACTLY once, so `(player_id,
   * source_building_id, rank)` can never conflict on a genuine decommission) — a plain insert, no
   * onConflict needed.
   */
  async createPair(
    tx: FrictionTx,
    params: {
      playerId: string;
      sourceBuildingId: string;
      freedBlockId: number;
      createdAtTick: number;
      expiresAtTick: number;
      scored: ScoredReplacementCandidate[];
    },
  ): Promise<void> {
    const { playerId, sourceBuildingId, freedBlockId, createdAtTick, expiresAtTick, scored } = params;
    if (scored.length === 0) return; // defensive — the scorer always yields >= 2 candidates (file header), never reached.
    await tx.insert(replacementOption).values(
      scored.map((c) => ({
        player_id: playerId,
        freed_block_id: freedBlockId,
        source_building_id: sourceBuildingId,
        candidate_building_type: c.candidateTypeIndex,
        projected: c.projected,
        rank: c.rank,
        created_at_tick: createdAtTick,
        expires_at_tick: expiresAtTick,
      })),
    );
  }

  /** `GET /v1/friction/replacement-options` (§15) — the player's OPEN options, optionally scoped to one
   *  `freedBlockId`. Ordered `(freed_block_id, rank)` — deterministic, rank-1-before-rank-2 per group. */
  async listOpen(playerId: string, freedBlockId?: number): Promise<OpenReplacementOptionRow[]> {
    const rows = await this.db
      .select()
      .from(replacementOption)
      .where(
        freedBlockId === undefined
          ? and(eq(replacementOption.player_id, playerId), isNull(replacementOption.closed_at))
          : and(
              eq(replacementOption.player_id, playerId),
              eq(replacementOption.freed_block_id, freedBlockId),
              isNull(replacementOption.closed_at),
            ),
      )
      .orderBy(replacementOption.freed_block_id, replacementOption.rank);
    return rows.map(toOpenRow);
  }

  /** Existence + ownership check (the 404 pre-check, mirrors `DecommissionRepository`'s own 2-step guard
   *  shape — an explicit existence check BEFORE the atomicity-guarded mutation). */
  async getForPlayer(id: string, playerId: string): Promise<ReplacementOptionRow | null> {
    const rows = await this.db
      .select()
      .from(replacementOption)
      .where(and(eq(replacementOption.id, id), eq(replacementOption.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * I9 — the guarded pick: ONE UPDATE closes the WHOLE pair sharing `(player_id, source_building_id)`
   * (both rank 1 and rank 2, whichever are still open) — `picked_at` is stamped ONLY on `optionId`'s own
   * row (the `CASE WHEN id = $optionId`), `closed_at` on BOTH. Guard: `closed_at IS NULL AND
   * expires_at_tick > $gameMinute` — an already-closed (picked/expired) row never re-matches (2nd pick →
   * 0-write; I9's own "expiry idempotente"). Returns the resolved (block, type) pair IFF `optionId`'s own
   * row appears in `RETURNING` with a freshly-stamped `picked_at` (this call's the winner) — `null`
   * otherwise (0-affected, OR affected only as the sibling-close of a DIFFERENT concurrent winner — that
   * can never include `optionId` itself since the CASE only stamps `picked_at` for the matching id, and a
   * row is only IN the returned set if the WHERE matched it in the first place).
   *
   * Concurrency (I9's own AC): 2 concurrent calls picking rank1 vs rank2 of the SAME pair both issue this
   * SAME UPDATE (same `source_building_id`, different `optionId`) — Postgres serializes the 2 UPDATEs on
   * the shared rows (row-level locking); whichever commits FIRST closes BOTH rows. The SECOND transaction's
   * `WHERE closed_at IS NULL` then matches ZERO rows (both already closed by the winner) → empty
   * `RETURNING` → this method returns `null` → the caller surfaces 409 (exactly 1 of the 2 HTTP calls
   * receives a non-null resolution).
   */
  async resolveAndClosePair(
    playerId: string,
    optionId: string,
    sourceBuildingId: string,
    gameMinute: number,
  ): Promise<ResolvedPick | null> {
    const rows = await this.db
      .update(replacementOption)
      .set({
        picked_at: sql`CASE WHEN ${replacementOption.id} = ${optionId}::uuid THEN now() ELSE ${replacementOption.picked_at} END`,
        closed_at: sql`now()`,
      })
      .where(
        and(
          eq(replacementOption.player_id, playerId),
          eq(replacementOption.source_building_id, sourceBuildingId),
          isNull(replacementOption.closed_at),
          sql`${replacementOption.expires_at_tick} > ${gameMinute}`,
        ),
      )
      .returning({
        id: replacementOption.id,
        pickedAt: replacementOption.picked_at,
        freedBlockId: replacementOption.freed_block_id,
        candidateBuildingType: replacementOption.candidate_building_type,
      });

    const won = rows.find((r) => r.id === optionId && r.pickedAt !== null);
    if (!won) return null;
    return { freedBlockId: won.freedBlockId, candidateBuildingTypeIndex: won.candidateBuildingType };
  }

  /**
   * `FRICTION_BUDGET_TICK` (N/31) expiry sweep (design §7: "Expiry sweep : ride N/31 (0-write
   * idempotent)") — closes every STILL-OPEN option past its `expires_at_tick` for this player. Guarded on
   * `closed_at IS NULL` — a 2nd call at the SAME (or a later) `gameMinute` matches zero already-closed
   * rows (0-write idempotent). Returns the count closed (0 = the common steady-state case).
   */
  async closeExpired(playerId: string, gameMinute: number): Promise<number> {
    const rows = await this.db
      .update(replacementOption)
      .set({ closed_at: sql`now()` })
      .where(
        and(
          eq(replacementOption.player_id, playerId),
          isNull(replacementOption.closed_at),
          sql`${replacementOption.expires_at_tick} <= ${gameMinute}`,
        ),
      )
      .returning({ id: replacementOption.id });
    return rows.length;
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2 (friction engine
//             persistence — lazy-stamp D20, node-set scan #18, cache refresh I4, penalty transition I4)
//             + §C4 (★ the load-bearing concurrency surface — decommission ‖ N/31 tick)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.1 (node-
//             set, périmètre réconcilié) + §4.2 (per-node inputs) + §4.3 (cache — "refresh-only-by-tick +
//             re-eval synchrone dans la tx de décommission, §6.3 ... jamais mutée ailleurs") + §4.4 (tick
//             N/31 steps) + §5.1 (penalty transitions, I4) + §6.3(f) (the decommission tx's own
//             synchronous re-eval + possible immediate revert).
//             Decisions: D20 (lazy-stamp one-shot) ; I4 (invariant table row — "transitions penalty
//             idempotentes, re-run tick = 0-write", `UPDATE … WHERE … IS DISTINCT FROM … RETURNING`).
//             Pattern: `ProgressionRepository.ensureRow` (1-1 per-player cache, idempotent upsert) +
//             `route-lifecycle.repository.ts#severIfNotAlready` (guarded conditional UPDATE … RETURNING,
//             exactly-once) + `cue-cascade-exception-producer.service.ts`'s `rowsOf` defensive dual-shape
//             raw-execute read + `money-holding.repository.ts#settleYield`/`political-event.repository.ts
//             #claimGameDay` (the `SELECT … FOR UPDATE` row-lock-THEN-recompute-THEN-write idiom, C4 REUSE
//             — the established codebase pattern for this exact race shape, incl. the local `Tx` type
//             alias `money-holding.repository.ts:46` already names).
//             — P3-E C2 — 2026-07-17 / P3-E C4 (★ locked re-eval) — 2026-07-17
//
// `FrictionBudgetRepository` — the ONLY writer of `buildings.acquired_at_tick` (lazy-stamp, D20) and
// `friction_budget_state` (the 1-1 per-player friction cache, §4.3) this chunk. `fetchPerimeterNodes` is
// the ONE set-based read of the §4.1 node-set + §4.2 raw per-node inputs (acquired_at_tick,
// connection_count) — `FrictionBudgetTickService` reduces those rows to the aggregate via the PURE
// `frictionLoadForNode` formula (`friction-formula.ts`), never a second copy of that arithmetic here.
//
// ★ C4 — `reevaluateAndTransitionLocked`/`reevaluateAndTransitionStandalone`: the N/31 tick's OWN
// recompute-then-write critical section (fetch perimeter → refresh cache → apply/revert penalty) now
// runs INSIDE one transaction that acquires an EXCLUSIVE `SELECT … FOR UPDATE` row lock on this player's
// `friction_budget_state` row FIRST — BEFORE reading the perimeter. This is what closes the "stale tick
// races a decommission-revert" hazard design §4.3's own "refresh-only-by-tick ... never mutated
// elsewhere" note flags for this chunk: a row lock acquired only AROUND the final WRITE would not be
// enough — a caller that already read STALE perimeter data before the lock existed could still issue its
// write AFTER a fresher writer released the lock, clobbering the fresh conclusion with a stale one. By
// acquiring the lock BEFORE the read, a concurrent caller of THIS SAME method (the scheduled N/31 tick,
// OR — C4 — `DecommissionRepository.decommissionOwnedNode`'s own in-tx call, sharing `tx`) BLOCKS until
// the first's ENTIRE critical section commits, and its OWN perimeter read only happens AFTER that commit
// — always fresh, never stale. "decommission ‖ tick" and "2 concurrent ticks" (C2's own I4 proof) are
// now literally the SAME race, closed by the SAME lock.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { frictionBudgetState, type FrictionBudgetStateRow } from '../../db/schema/demolition_compression';
import { building } from '../../db/schema/city_state';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { ageDaysFromAcquiredAtTick, frictionLoadForNode } from './friction-formula';
import { frictionBudgetBucket, type FrictionBudgetBucket } from './friction-budget-bucket';

/** Raw per-node inputs for the §4.2 formula — `acquiredAtTick` stays nullable defensively (see
 *  `fetchPerimeterNodes`'s own doc comment: by the time the TICK calls this, step 0 already stamped every
 *  row, but a future non-tick caller must not assume that). */
export interface PerimeterNodeRow {
  readonly buildingId: string;
  readonly acquiredAtTick: number | null;
  readonly connectionCount: number;
}

/** C8 — one perimeter node's FULL raw shape for the `GET /v1/friction/nodes/:buildingId` panel preview
 *  (`FrictionProjectionService`): the SAME `building`/`building_operational_state` join
 *  `decommission.repository.ts`'s own guard-1 SELECT already establishes (node lookup, D9 basis inputs),
 *  PLUS this node's own `connectionCount` (§4.2, the SAME route-touching-this-node count
 *  `fetchPerimeterNodes` computes set-wide) and `neighborCount` (§6.1 — DISTINCT other buildings,
 *  `decommission.repository.ts`'s own §6.3(a) precomputation, mirrored here as a READ-ONLY preview —
 *  zero mutation, zero route-sever). */
export interface SingleNodeRow {
  readonly buildingId: string;
  readonly blockId: number;
  readonly buildingType: number;
  readonly structuralState: string;
  readonly operationalType: string | null;
  readonly coverQuality: string | null;
  readonly acquiredAtTick: number | null;
  readonly connectionCount: number;
  readonly neighborCount: number;
}

/** ★ C4 — the Drizzle transaction-callback client type (verbatim `money-holding.repository.ts:46`'s own
 *  local `Tx` alias — extracted via `Parameters<...>`, never guessed, so it is ALWAYS exactly the type
 *  `this.db.transaction(async (tx) => …)` infers for `tx`). Lets `reevaluateAndTransitionLocked` be
 *  called EITHER by this repository's own `reevaluateAndTransitionStandalone` (a fresh transaction, the
 *  scheduled tick's shape) OR by `DecommissionRepository`'s ALREADY-OPEN tx (sharing its `tx` — the
 *  decommission's buildings/route/economy mutations and this friction re-eval commit or roll back
 *  TOGETHER, design §6.3's literal "UNE transaction"). */
export type FrictionTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** The 4 §4.2 formula tunables + the §4.3 threshold multiplier — resolved by the CALLER (R2.3: the
 *  SERVICE layer resolves tunables, the REPOSITORY takes plain numbers, `friction-budget-tick.service.ts`'s
 *  own header convention) so this repository never reads `coreLoopsTunables` directly. */
export interface FrictionFormulaTunables {
  readonly baseFrictionPerNode: number;
  readonly ageDecayFactorPerTick: number;
  readonly perConnectionFrictionModifier: number;
  readonly thresholdMultiplier: number;
  readonly bucketLightUpperBound: number;
  readonly bucketBalancedUpperBound: number;
  readonly bucketStrainedUpperBound: number;
}

/** The full falsifiable proof surface `reevaluateAndTransitionLocked`/`Standalone` return — mirrors
 *  `FrictionBudgetTickResult`'s own shape minus `stampedCount` (lazy-stamping stays a SEPARATE, un-locked
 *  call — it touches `buildings.acquired_at_tick`, not `friction_budget_state`, so it shares NO row with
 *  this race). */
export interface FrictionReevalResult {
  readonly frictionBudgetTotal: number;
  readonly frictionOrgSize: number;
  readonly frictionThreshold: number;
  readonly bucket: FrictionBudgetBucket;
  readonly cacheChanged: boolean;
  readonly penaltyActive: boolean;
  readonly penaltyTransitioned: boolean;
}

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories, this codebase's own
 *  convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class FrictionBudgetRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Guarantee a `friction_budget_state` row at defaults (mirrors `ProgressionRepository.ensureRow`) —
   *  idempotent, the upsert no-ops on conflict. Lazily creates the 1-1 cache row on a player's FIRST tick.
   *  `last_evaluated_tick` (W1.1-d C1.2 — dropped `.default(0)` TS-side, ANCRE ABSOLUE, the N/31 watermark)
   *  is stamped to the player's CURRENT game-minute at creation — same `acquired_at_tick` COALESCE-subquery
   *  precedent `real-estate.repository.ts:216` uses (0 if no city_sim_clock row yet). */
  async ensureRow(playerId: string): Promise<void> {
    await this.db
      .insert(frictionBudgetState)
      .values({
        player_id: playerId,
        last_evaluated_tick: sql`COALESCE((SELECT ${citySimClock.game_minute} FROM ${citySimClock} WHERE ${citySimClock.player_id} = ${playerId}), 0)`,
      })
      .onConflictDoNothing({ target: frictionBudgetState.player_id });
  }

  /** Read the player's current friction cache row (or `null` — a player never ticked yet). BO/diagnostic
   *  + `_test` read seam; the tick itself never needs this (it writes the cache, it doesn't read it back). */
  async getRow(playerId: string): Promise<FrictionBudgetStateRow | null> {
    const rows = await this.db.select().from(frictionBudgetState).where(eq(frictionBudgetState.player_id, playerId)).limit(1);
    return rows[0] ?? null;
  }

  /**
   * D20 lazy-stamp (§4.2/§13.1): any §4.1 perimeter node (`ownership='player' AND structural_state !=
   * 'demolished'`, the SAME reconciled scan `buildings_player_owner_state_idx` serves, C0/C1 EXPLAIN)
   * whose `acquired_at_tick` is STILL NULL (a pre-C2 row — real purchases have stamped it since C1) is
   * set to `gameMinute` — ONE-SHOT idempotent: every row this predicate matches is stamped by THIS call,
   * so a 2nd call (any `gameMinute`) matches ZERO rows for a player already fully stamped (design §4.2:
   * "idempotent, 0-write dès le 2e passage"). A freshly-stamped row's age is 0 days THIS tick (its
   * `acquired_at_tick` equals the very `gameMinute` computed against it one step later, §4.2 formula).
   * Returns the count stamped (0 = the common steady-state case after a player's first-ever tick).
   */
  async lazyStampAcquiredAtTick(playerId: string, gameMinute: number): Promise<number> {
    const rows = await this.db
      .update(building)
      .set({ acquired_at_tick: gameMinute })
      .where(
        and(
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          sql`${building.structural_state} != 'demolished'`,
          sql`${building.acquired_at_tick} IS NULL`,
        ),
      )
      .returning({ buildingId: building.building_id });
    return rows.length;
  }

  /**
   * The §4.1 perimeter scan (`ownership='player' AND structural_state != 'demolished'` — TOUS les nodes
   * possédés réels, y compris achetés-non-convertis, ruling ★#1/#18) joined to each node's own
   * non-severed route-connection count (§4.2 `connection_count`: routes touching the node as origin OR
   * destination, `state != 'severed'` — D10, a severed route is retired, never a raw DELETE). ONE
   * set-based query (a CTE `UNION ALL` + `GROUP BY`, no per-row round-trip) — the caller
   * (`FrictionBudgetTickService`) reduces these rows to the aggregate via the PURE `frictionLoadForNode`
   * formula; this method never computes `friction_load` itself (D4 — derivation lives in ONE place).
   */
  async fetchPerimeterNodes(playerId: string, executor?: FrictionTx): Promise<PerimeterNodeRow[]> {
    const result = await (executor ?? this.db).execute(sql`
      WITH nodes AS (
        SELECT building_id, acquired_at_tick
        FROM buildings
        WHERE player_id = ${playerId}::uuid AND ownership = 'player' AND structural_state != 'demolished'
      ),
      route_ends AS (
        SELECT origin_building_id AS building_id FROM route WHERE player_id = ${playerId}::uuid AND state != 'severed'
        UNION ALL
        SELECT destination_building_id AS building_id FROM route WHERE player_id = ${playerId}::uuid AND state != 'severed'
      ),
      conn AS (
        SELECT building_id, COUNT(*)::int AS connection_count FROM route_ends GROUP BY building_id
      )
      SELECT n.building_id AS building_id, n.acquired_at_tick AS acquired_at_tick, COALESCE(c.connection_count, 0) AS connection_count
      FROM nodes n
      LEFT JOIN conn c ON c.building_id = n.building_id
    `);
    const rows = rowsOf(result);
    return rows.map((r) => ({
      buildingId: String(r['building_id']),
      acquiredAtTick: r['acquired_at_tick'] === null || r['acquired_at_tick'] === undefined ? null : Number(r['acquired_at_tick']),
      connectionCount: Number(r['connection_count']),
    }));
  }

  /**
   * C8 — the ONE-node read behind `GET /v1/friction/nodes/:buildingId` (design §6.1 step 1). Read-only
   * PREVIEW (no lock, no mutation — unlike `reevaluateAndTransitionLocked` above): 404 (returns `null`) if
   * the node is not this player's own §4.1 périmètre member (not owned, or already 'demolished' — the
   * SAME reconciled scan `fetchPerimeterNodes` uses, scoped to ONE building_id here). Joins
   * `building_operational_state` LEFT (D9 basis inputs — `null` for a purchased-but-unconverted node,
   * R17) + a 2nd query for `connectionCount`/`neighborCount` (the SAME route-touching-this-node shapes
   * `fetchPerimeterNodes`'s own CTE / `decommission.repository.ts`'s own §6.3(a) precomputation use,
   * mirrored read-only — this method never severs a route).
   */
  async fetchSingleNode(playerId: string, buildingId: string): Promise<SingleNodeRow | null> {
    const rows = await this.db
      .select({
        buildingId: building.building_id,
        blockId: building.block_id,
        buildingType: building.building_type,
        structuralState: building.structural_state,
        acquiredAtTick: building.acquired_at_tick,
        operationalType: buildingOperationalState.operational_type,
        coverQuality: buildingOperationalState.cover_quality,
      })
      .from(building)
      .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          sql`${building.structural_state} != 'demolished'`,
        ),
      )
      .limit(1);
    const node = rows[0];
    if (!node) return null;

    const countsResult = await this.db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM route WHERE player_id = ${playerId}::uuid AND state != 'severed'
          AND (origin_building_id = ${buildingId}::uuid OR destination_building_id = ${buildingId}::uuid)) AS connection_count,
        (SELECT COUNT(DISTINCT other_building_id)::int FROM (
          SELECT destination_building_id AS other_building_id FROM route
            WHERE player_id = ${playerId}::uuid AND origin_building_id = ${buildingId}::uuid AND state != 'severed'
          UNION
          SELECT origin_building_id AS other_building_id FROM route
            WHERE player_id = ${playerId}::uuid AND destination_building_id = ${buildingId}::uuid AND state != 'severed'
        ) neighbors) AS neighbor_count
    `);
    const countsRow = rowsOf(countsResult)[0] ?? {};

    return {
      buildingId: node.buildingId,
      blockId: node.blockId,
      buildingType: node.buildingType,
      structuralState: node.structuralState,
      operationalType: node.operationalType,
      coverQuality: node.coverQuality,
      acquiredAtTick: node.acquiredAtTick,
      connectionCount: Number(countsRow['connection_count'] ?? 0),
      neighborCount: Number(countsRow['neighbor_count'] ?? 0),
    };
  }

  /**
   * Refresh the `friction_budget_state` cache (§4.3/§4.4, "recalculés chaque N/31") — single-statement,
   * I4 race-safe: the UPDATE's own `IS DISTINCT FROM` guard (cast both sides to `numeric` for the total —
   * never a string-format false-mismatch) makes a repeat call with the IDENTICAL (total, orgSize,
   * gameMinute) triple a 0-write (design §4.4: "0-write si inchangé"). Returns whether the row actually
   * changed.
   *
   * ★ C4 — `ensureRow` is now the CALLER's responsibility (`reevaluateAndTransitionLocked`/`Standalone`,
   * called BEFORE the row lock is acquired): calling it HERE, on `this.db`, while an `executor` (a `tx`
   * already holding a `FOR UPDATE` lock on this SAME row) is active would self-deadlock — the upsert's
   * OWN conflict check needs to inspect that SAME locked row on a DIFFERENT connection, which blocks
   * forever waiting for a lock this very call site never releases (it awaits this promise before its own
   * transaction can commit). `executor` optionally threads the caller's `tx` (design §6.3(f) — the
   * decommission tx's own synchronous re-eval shares ITS `tx`, so the cache write commits/rolls back
   * ATOMICALLY with the buildings/route/economy mutations); omitted → `this.db` (the standalone N/31 tick).
   * `lastDecommissionAtTick` is OPTIONAL — set ONLY by the decommission path (§4.3: "last_decommission_
   * at_tick" diagnostic column); the scheduled tick never passes it (unaffected, unchanged column).
   */
  async refreshCache(
    playerId: string,
    gameMinute: number,
    total: number,
    orgSize: number,
    executor?: FrictionTx,
    lastDecommissionAtTick?: number,
  ): Promise<boolean> {
    const totalStr = total.toFixed(6); // Drizzle numeric() string-mode — no float rounding drift (effect_modifier.magnitude precedent).
    const rows = await (executor ?? this.db)
      .update(frictionBudgetState)
      .set({
        friction_budget_total: totalStr,
        friction_org_size: orgSize,
        last_evaluated_tick: gameMinute,
        ...(lastDecommissionAtTick !== undefined ? { last_decommission_at_tick: lastDecommissionAtTick } : {}),
      })
      .where(
        and(
          eq(frictionBudgetState.player_id, playerId),
          sql`(${frictionBudgetState.friction_budget_total} IS DISTINCT FROM ${totalStr}::numeric
            OR ${frictionBudgetState.friction_org_size} IS DISTINCT FROM ${orgSize}
            OR ${frictionBudgetState.last_evaluated_tick} IS DISTINCT FROM ${gameMinute})`,
        ),
      )
      .returning({ playerId: frictionBudgetState.player_id });
    return rows.length > 0;
  }

  /**
   * The §5.1 penalty transition — single-statement, guarded on the CURRENT state (I4: the invariant
   * table's own "UPDATE … WHERE efficiency_penalty_active IS DISTINCT FROM $new RETURNING", realized as a
   * direct boolean-equality guard per direction — equivalent to `IS DISTINCT FROM` over a 2-valued NOT
   * NULL domain): `activate=true` flips ONLY a row currently `false` (and stamps `penalty_since_tick`);
   * `activate=false` flips ONLY a row currently `true` (and clears it, satisfying the
   * `friction_budget_state_penalty_coherence_chk` pairing, mig 0132). A repeat call for the SAME target
   * state is a 0-write — exactly-once transition; the caller gates the event emission + Exception card on
   * THIS method's own boolean (never on the recomputed `total > threshold` alone, which a re-tick would
   * still see as true/false regardless of whether a TRANSITION actually happened).
   *
   * ★ C4 — `executor` optionally threads the caller's `tx` (same rationale as `refreshCache` above):
   * omitted → `this.db` (the standalone N/31 tick); the decommission tx's own synchronous re-eval passes
   * ITS `tx` so this transition commits/rolls back ATOMICALLY with the rest of the decommission.
   */
  async applyOrRevertPenalty(playerId: string, activate: boolean, gameMinute: number, executor?: FrictionTx): Promise<boolean> {
    const db = executor ?? this.db;
    const rows = activate
      ? await db
          .update(frictionBudgetState)
          .set({ efficiency_penalty_active: true, penalty_since_tick: gameMinute })
          .where(and(eq(frictionBudgetState.player_id, playerId), eq(frictionBudgetState.efficiency_penalty_active, false)))
          .returning({ playerId: frictionBudgetState.player_id })
      : await db
          .update(frictionBudgetState)
          .set({ efficiency_penalty_active: false, penalty_since_tick: null })
          .where(and(eq(frictionBudgetState.player_id, playerId), eq(frictionBudgetState.efficiency_penalty_active, true)))
          .returning({ playerId: frictionBudgetState.player_id });
    return rows.length > 0;
  }

  /**
   * ★ C4 — the LOCKED critical section (design §4.3/§6.3(f), header note above): acquire an EXCLUSIVE
   * `SELECT … FOR UPDATE` row lock on this player's `friction_budget_state` row FIRST, THEN — and ONLY
   * THEN — fetch the §4.1 perimeter, reduce it via the PURE `frictionLoadForNode` formula (D4 — the SAME
   * function `FrictionBudgetTickService` already used, never a 2nd copy), refresh the cache, and
   * apply/revert the penalty — ALL on `tx` (mirrors `MoneyHoldingRepository.settleYield(tx, …)`'s own
   * "REQUIRES a tx, caller decides whose" shape). Ensures the row exists FIRST via `tx` itself (an
   * idempotent `onConflictDoNothing` upsert on the SAME connection the lock is about to be taken on —
   * safe regardless of whether `tx` is a fresh standalone transaction or a DIFFERENT caller's already-open
   * one, e.g. `DecommissionRepository`'s own tx sharing this method for a player's FIRST-ever friction
   * interaction: an `ensureRow`-style call on a SEPARATE connection — `this.db` — at THIS point would risk
   * exactly the self-deadlock this file's header warns about if it ran AFTER the lock; running it via
   * `tx` avoids the question entirely, same connection, sequential statements, never a cross-connection
   * wait).
   */
  async reevaluateAndTransitionLocked(
    tx: FrictionTx,
    playerId: string,
    gameMinute: number,
    formula: FrictionFormulaTunables,
    lastDecommissionAtTick?: number,
  ): Promise<FrictionReevalResult> {
    // last_evaluated_tick (W1.1-d C1.2 — ANCRE ABSOLUE): `gameMinute` is already this call's OWN current tick —
    // no subquery needed, stamp it directly (never leaves the row at the schema's SQL-level DEFAULT 0).
    await tx
      .insert(frictionBudgetState)
      .values({ player_id: playerId, last_evaluated_tick: gameMinute })
      .onConflictDoNothing({ target: frictionBudgetState.player_id });
    await tx
      .select({ playerId: frictionBudgetState.player_id })
      .from(frictionBudgetState)
      .where(eq(frictionBudgetState.player_id, playerId))
      .for('update');

    const nodes = await this.fetchPerimeterNodes(playerId, tx);
    let frictionBudgetTotal = 0;
    for (const node of nodes) {
      const acquiredAtTick = node.acquiredAtTick ?? gameMinute;
      const ageDays = ageDaysFromAcquiredAtTick(gameMinute, acquiredAtTick);
      frictionBudgetTotal += frictionLoadForNode(
        formula.baseFrictionPerNode,
        formula.ageDecayFactorPerTick,
        ageDays,
        node.connectionCount,
        formula.perConnectionFrictionModifier,
      );
    }
    const frictionOrgSize = nodes.length;
    const cacheChanged = await this.refreshCache(playerId, gameMinute, frictionBudgetTotal, frictionOrgSize, tx, lastDecommissionAtTick);

    const frictionThreshold = frictionOrgSize * formula.thresholdMultiplier;
    const penaltyActive = frictionBudgetTotal > frictionThreshold;
    const bucket = frictionThreshold > 0
      ? frictionBudgetBucket(
          frictionBudgetTotal / frictionThreshold,
          formula.bucketLightUpperBound,
          formula.bucketBalancedUpperBound,
          formula.bucketStrainedUpperBound,
        )
      : 'light'; // a 0-node org (frictionThreshold=0) has zero friction to carry — trivially light.
    const penaltyTransitioned = await this.applyOrRevertPenalty(playerId, penaltyActive, gameMinute, tx);

    return { frictionBudgetTotal, frictionOrgSize, frictionThreshold, bucket, cacheChanged, penaltyActive, penaltyTransitioned };
  }

  /**
   * ★ C4 — the STANDALONE wrapper (the N/31 scheduled tick's own shape): a FRESH transaction running
   * `reevaluateAndTransitionLocked` (mirrors `MoneyHoldingRepository.settleYieldForProjection`'s own
   * "wrap the private tx-taking method in its own short transaction" shape).
   */
  async reevaluateAndTransitionStandalone(
    playerId: string,
    gameMinute: number,
    formula: FrictionFormulaTunables,
  ): Promise<FrictionReevalResult> {
    return this.db.transaction((tx) => this.reevaluateAndTransitionLocked(tx, playerId, gameMinute, formula));
  }
}

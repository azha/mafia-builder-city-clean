// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 5 (C5)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.4 §9.4
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :194-233 (Distributed Hold)
//             Canon: docs/tech/04b_combat_and_conflict/tick_schedule_and_memory_budget_conflict.md :18
//             DD-ROUTEGRAPH-REUSE: REUSES the live 9b RouteFinderService.neighbors (no new geography)
//             OQ-A10: NO route_graph table — in-service derived over rival_holding + 9b graph.
//             — Rival AI Foundation C5 — 2026-06-24 —
//
// `DistributedHoldService` — Coil-primary Distributed Hold mechanic (canon §3.4).
//
// FORM:
//   `rerouteEvaluation(playerId, rivalKey)` — deterministic graph read over rival_holding nodes +
//     the live 9b RouteFinderService.neighbors; halves the route-efficiency impact when an alt-path
//     exists through an alternative block, full impact when no alt-path. Updates route_integrity on
//     rival_state (real nullable, Coil-only). Deterministic: lowest-block-id tie-break, no Math.random.
//   `getRouteIntegrity(playerId, rivalKey)` — returns the RouteIntegrityBucket string
//     ('fractured'|'sparse'|'intact'|'dense') for Coil; NULL for the 3 non-Coil rivals (canon :399).
//
// COIL-ONLY (canon :194-233):
//   Only Coil has the Distributed Hold mechanic. For the 3 non-Coil rivals, `getRouteIntegrity`
//   returns NULL and `rerouteEvaluation` is a no-op. This is the canonical invariant.
//
// DETERMINISM (C4):
//   NO Math.random(). NO Date.now(). Tie-breaking via lowest-block-id (the 9b DD-GRAPH precedent).
//   The route_integrity float is clamped to [0, 1] and mapped to a 4-bucket classification:
//     fractured: [0, 0.25)  | sparse: [0.25, 0.50) | intact: [0.50, 0.75) | dense: [0.75, 1.0]
//
// DD-ROUTEGRAPH-REUSE: calls RouteFinderService.neighbors(blockId, 'foot') to derive connectivity.
//   'foot' is the most-restricted vehicle type (no bridge crossings, ferry-only river crossings —
//   canon :87); using 'foot' gives the CONSERVATIVE connectivity baseline for Coil's holding mesh.
//   The service does NOT call computePath/A* (that reads DB-state per-player); it only calls
//   neighbors() which reads the bootstrap graph (pure in-memory read, deterministic, no side-effects).
//
// SOFT-REF discipline: rival_holding.block_id is a plain integer (no DB FK to blocks.id).
//   Mirror of corridor_debt.block_id (migration 0076 precedent).
//
// R2.2 / P6: route_integrity is a server-only real. The player never sees the raw float —
//   they see only the bucket string via the R2.2 projection. No scalar is emitted to the client.

import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { Inject } from '@nestjs/common';
import { rivalState, rivalHolding } from '../../../db/schema/conflict_rival';
import { RouteFinderService } from '../../distribution/route-finder.service';
import { RivalAiTunables } from './rival-ai.tunables';
import type { RivalKey } from './rival-ai.types';

/** Coil-primary: only the Coil rival has the Distributed Hold mechanic (canon :399). */
const COIL_KEY: RivalKey = 'coil';

/**
 * Route-integrity float → bucket classification.
 * Thresholds evenly divide [0, 1] into 4 bands (provisional — calibration TD).
 * These are [PROV-Y26Q2] — the exact thresholds are canon-silent (§3.4 names the 4 buckets only).
 */
const INTEGRITY_THRESHOLDS = {
  FRACTURED_MAX: 0.25, // [0.00, 0.25) → fractured
  SPARSE_MAX:    0.50, // [0.25, 0.50) → sparse
  INTACT_MAX:    0.75, // [0.50, 0.75) → intact
                       // [0.75, 1.00] → dense
} as const;

/** The 4 canonical route-integrity buckets (canon :204-207). */
export type RouteIntegrityBucket = 'fractured' | 'sparse' | 'intact' | 'dense';

/**
 * Map a float in [0, 1] to a `RouteIntegrityBucket`.
 *
 * fractured: [0.00, 0.25)  — badly fragmented; most holding nodes are isolated.
 * sparse:    [0.25, 0.50)  — partial connectivity; some alt-paths but thin network.
 * intact:    [0.50, 0.75)  — majority of nodes well-connected; occasional isolations.
 * dense:     [0.75, 1.00]  — highly connected mesh; almost all nodes have alt-paths.
 *
 * The float is the FRACTION of holding nodes that have at least one neighbor in the holding set
 * (i.e., are not fully isolated). This is the falsifiable definition used by rerouteEvaluation.
 */
function toIntegrityBucket(integrity: number): RouteIntegrityBucket {
  if (integrity < INTEGRITY_THRESHOLDS.FRACTURED_MAX) return 'fractured';
  if (integrity < INTEGRITY_THRESHOLDS.SPARSE_MAX)    return 'sparse';
  if (integrity < INTEGRITY_THRESHOLDS.INTACT_MAX)    return 'intact';
  return 'dense';
}

@Injectable()
export class DistributedHoldService {
  private readonly logger = new Logger(DistributedHoldService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // DD-ROUTEGRAPH-REUSE: the live 9b block-graph — READ-only (neighbors() only).
    // Injected via DistributionModule (exported per C5 issue-1 fix in rival-ai.module.ts).
    private readonly routeFinderSvc: RouteFinderService,
    private readonly tunables: RivalAiTunables,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────────────────────────

  /**
   * `rerouteEvaluation(playerId, rivalKey)` — Coil-primary reroute evaluation.
   *
   * Canon (rival_ai_mechanics.md :209-213): when a holding is lost, the rival's strategy tick runs
   * `reroute_evaluation` for `reroute_window_ticks`; if an alternative path exists, the
   * `route_efficiency_score impact is halved` (composite bucket modifier).
   *
   * This A-lot implementation:
   *   1. Reads all `rival_holding` rows for (player, rivalKey) → the node set.
   *   2. For each node, uses `RouteFinderService.neighbors(blockId, 'foot')` to derive its adjacency
   *      to OTHER nodes in the holding set (the "internal connectivity" check).
   *      'foot' = most-restricted vehicle type (conservative baseline).
   *   3. Counts nodes that have at least one neighbor IN the holding set (an alt-path exists).
   *   4. route_integrity float = connectedNodes / totalNodes (clamped [0, 1]).
   *      If no nodes → 0.0 (fractured baseline).
   *   5. Writes route_integrity onto rival_state (the Coil row only).
   *
   * DETERMINISM invariant: the graph read is deterministic (bootstrap graph, no per-player state).
   * lowest-block-id tie-break is inherited from RouteFinderService.neighbors (it returns a stable
   * sorted adjacency list). Calling rerouteEvaluation 2× with the same holding set → IDENTICAL result.
   *
   * NO-OP for non-Coil rivals (Coil-only mechanic per canon :399).
   * NO Math.random(). NO Date.now(). Pure function of (holding set + bootstrap graph).
   *
   * @param playerId — the player whose Coil rival state to update.
   * @param rivalKey — the rival to evaluate; MUST be 'coil' for the actual computation (no-op otherwise).
   */
  async rerouteEvaluation(playerId: string, rivalKey: RivalKey): Promise<void> {
    // Coil-only (canon :399) — non-Coil rivals have no Distributed Hold mechanic.
    if (rivalKey !== COIL_KEY) return;

    try {
      // --- Step 1: read the current holding node set from the DB ---
      const holdingRows = await this.db
        .select({ block_id: rivalHolding.block_id })
        .from(rivalHolding)
        .where(and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
        ))
        .orderBy(rivalHolding.block_id); // deterministic: lowest-block-id tie-break

      const totalNodes = holdingRows.length;

      if (totalNodes === 0) {
        // No holdings → integrity is 0 (fractured baseline — nothing to protect).
        await this.writeRouteIntegrity(playerId, 0.0);
        return;
      }

      // Build a Set of held block_ids for O(1) neighbor-check.
      const heldBlockSet = new Set(holdingRows.map((r) => r.block_id));

      // Consume the C2 getter for the route graph size cap (distributedHoldMaxRouteGraphSizeCoil).
      // This caps the holding set read to the canon maximum node count (default 12, range 6..20).
      const maxGraphSize = this.tunables.distributedHoldMaxRouteGraphSizeCoil;
      const effectiveNodes = holdingRows.slice(0, maxGraphSize);
      const effectiveHeldSet = new Set(effectiveNodes.map((r) => r.block_id));

      // --- Step 2: count nodes with at least one held-set neighbor (DD-ROUTEGRAPH-REUSE) ---
      // For each held node, call RouteFinderService.neighbors(blockId, 'foot') (the most-restricted
      // vehicle type — conservative connectivity baseline). Check if ANY neighbor is in the held set.
      // A node is "connected" within the holding mesh if it has at least one internal neighbor.
      let connectedCount = 0;

      for (const row of effectiveNodes) {
        // DD-ROUTEGRAPH-REUSE: the actual call to the 9b block-graph neighbors.
        // 'foot' = foot courier vehicle type (most-restricted: no bridge crossings — canon :87).
        // This is a PURE in-memory read of the bootstrap graph (no DB query, no side-effects).
        const neighbors = this.routeFinderSvc.neighbors(row.block_id, 'foot');

        // Check if any neighbor is in the held set (an alt-path within the holding mesh exists).
        const hasInternalNeighbor = neighbors.some((n) => effectiveHeldSet.has(n.to));
        if (hasInternalNeighbor) {
          connectedCount++;
        }
      }

      // --- Step 3: compute route_integrity float = connectedNodes / totalNodes (clamped [0, 1]) ---
      // FALSIFIABLE: a holding set of N non-adjacent nodes all isolated → connectedCount=0 → 0.0
      // (fractured). A fully-connected holding mesh → connectedCount=N → 1.0 (dense).
      const effectiveTotal = effectiveNodes.length;
      const routeIntegrity = effectiveTotal > 0 ? connectedCount / effectiveTotal : 0.0;
      const clamped = Math.min(1.0, Math.max(0.0, routeIntegrity));

      // --- Step 4: write route_integrity onto the Coil rival_state row ---
      await this.writeRouteIntegrity(playerId, clamped);

      this.logger.debug(
        `DistributedHold.rerouteEvaluation: player=${playerId} rival=coil ` +
        `nodes=${effectiveTotal} connected=${connectedCount} integrity=${clamped.toFixed(3)} ` +
        `bucket=${toIntegrityBucket(clamped)}`,
      );
    } catch (err) {
      // ISOLATION: a failure in the reroute eval is logged and contained — the tick continues.
      this.logger.error(
        `DistributedHold.rerouteEvaluation: player=${playerId} rival=${rivalKey} failed — ` +
        `contained: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * `getRouteIntegrity(playerId, rivalKey)` — return the current route-integrity bucket.
   *
   * Canon (:399): route_integrity_bucket is Coil-only — NULL for the 3 non-Coil rivals.
   *
   * Returns:
   *   - RouteIntegrityBucket ('fractured'|'sparse'|'intact'|'dense') for Coil.
   *   - null for Tarcum / Iron Throat / Saltline (canon :399 — non-Coil no route-integrity).
   *   - null if no rival_state row exists for this player (L1 empty-state skip pattern).
   *
   * R2.2: the raw float (rival_state.route_integrity) is SERVER-ONLY; this method returns
   * the bucket string — the only player-visible form (derived projection, never raw float).
   */
  async getRouteIntegrity(playerId: string, rivalKey: RivalKey): Promise<RouteIntegrityBucket | null> {
    // Non-Coil rivals: Distributed Hold is Coil-only (canon :399).
    if (rivalKey !== COIL_KEY) return null;

    const rows = await this.db
      .select({ route_integrity: rivalState.route_integrity })
      .from(rivalState)
      .where(and(
        eq(rivalState.player_id, playerId),
        eq(rivalState.rival_key, rivalKey),
      ))
      .limit(1);

    if (rows.length === 0) return null;
    const integrity = rows[0]!.route_integrity;
    if (integrity === null || integrity === undefined) return null;

    return toIntegrityBucket(integrity);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * Write the route_integrity float onto the Coil rival_state row.
   * This is the only mutation in the service (all other reads are pure).
   */
  private async writeRouteIntegrity(playerId: string, value: number): Promise<void> {
    await this.db
      .update(rivalState)
      .set({ route_integrity: value })
      .where(and(
        eq(rivalState.player_id, playerId),
        eq(rivalState.rival_key, COIL_KEY),
      ));
  }
}

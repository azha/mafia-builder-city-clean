// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 6 (C6) Step 4
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.5
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §2.5 (Oxbow Severance)
//             DD-OXBOW-ZONE: REUSE the 9b block-graph + rival_holding as zones; no new geography.
//             — Combat & Escalation B C6 — 2026-06-25 —
//
// `OxbowSeveranceService` — the §2.5 Oxbow Severance mechanic.
//
// detectNeckZones(playerId, rivalKey):
//   - Deterministic graph read over the 9b `RouteFinderService.neighbors` + `rival_holding` as zones.
//   - DD-OXBOW-ZONE: no new zone model. The "zone_graph" IS the live block-graph read via
//     RouteFinderService.neighbors, restricted to the rival's held blocks (rival_holding rows).
//   - A "neck" block is one that is the SOLE connector between a salient (a subset of held blocks
//     not reachable from the rival's main body without it — single-point of articulation).
//   - Algorithm: build the induced subgraph of rival-held blocks, find articulation points
//     (blocks whose removal disconnects the graph). Each articulation point is a neck block.
//   - Returns block_ids of neck blocks (deterministic — same holdings + same graph → same result).
//   - No Math.random(), no Date.now(). Pure graph read.
//
// applyHoldAction(playerId, rivalKey, zoneId, lieutenantId, gameMinute):
//   - Record that the player's lieutenant is holding the neck zone (block_id = zoneId).
//   - Inserts a combat_event of type 'hold' for the neck block.
//   - The hold must be maintained for `combat.oxbow_hold_duration_ticks` ticks before orphaning.
//   - Deterministic: no Math.random(), no Date.now(). The tick-count is getter-sourced.
//
// reclassifySalientAsOrphan(playerId, rivalKey, zoneIds):
//   - After the neck hold reaches `oxbow_hold_duration_ticks`, mark the isolated salient zones
//     as orphan_holdings: UPDATE rival_holding SET is_orphan = true (migration 0091 column).
//   - Orphan holdings have reduced heat + decaying BPD interest (design §3.5, canon :263).
//   - Deterministic: a pure UPDATE with no Math.random(), no Date.now().
//
// DD-OXBOW-ZONE (design §3.5):
//   - REUSES the live real_estate / district / block-graph (the System-9 geography + district_cohesion).
//   - A "neck" is a low-edge_width corridor (a single connecting block — the 9b block-graph connectivity).
//   - B does NOT author a new zone model — it reads the live geography + rival_holding as zones.
//   - `orphan_holdings` have reduced heat + rapidly-decaying BPD interest (a real_estate/BPD couple).
//
// Determinism (C4):
//   - Neck detection is a deterministic graph read (articulation-point algorithm, DFS-based).
//   - The hold is a deterministic tick-count. No RNG.
//   - oxbow_hold_duration_ticks is getter-sourced (no inline 4).
//
// R9.3: migration 0091 (`is_orphan` on rival_holding) — same-commit. No new geography table.
// P6: SERVER-ONLY service. No player-facing projection in this file.
// Zero-regression: ADDITIVE only — rival_holding rows updated, no other table modified.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalHolding } from '../../../db/schema/conflict_rival';
import { combatEvent } from '../../../db/schema/conflict_combat';
import { RouteFinderService } from '../../distribution/route-finder.service';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class OxbowSeveranceService {
  private readonly logger = new Logger(OxbowSeveranceService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly routeFinder: RouteFinderService,
    private readonly combatTunables: CombatTunables,
  ) {}

  /**
   * Detect neck zones in the rival's territorial footprint.
   *
   * DD-OXBOW-ZONE: REUSES the live 9b block-graph via RouteFinderService.neighbors.
   * The rival's held blocks (rival_holding rows) form the "zone" — we find articulation points
   * (blocks whose removal disconnects the induced subgraph). Each articulation point is a neck.
   *
   * Algorithm (deterministic DFS-based articulation point detection):
   *   1. Load all rival_holding block_ids for (playerId, rivalKey).
   *   2. Build the induced subgraph: for each held block, call RouteFinderService.neighbors('foot')
   *      and keep only edges where the destination is also a held block.
   *   3. Find articulation points using iterative DFS (Tarjan's algorithm subset — deterministic).
   *   4. Return the set of articulation point block_ids (neck zones).
   *
   * Falsifiable: a rival with a single contiguous holding (no branching salient) → empty.
   *              a rival with a salient connected by exactly one block → that block is returned.
   *
   * @param playerId   The player observing the rival's territory.
   * @param rivalKey   The rival whose footprint to analyse.
   * @returns          Array of block_ids that are neck (articulation point) zones.
   */
  async detectNeckZones(playerId: string, rivalKey: RivalKey): Promise<number[]> {
    // Step 1: Load all rival holding blocks.
    const holdings = await this.db
      .select({ block_id: rivalHolding.block_id })
      .from(rivalHolding)
      .where(
        and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
        ),
      );

    const heldSet = new Set(holdings.map((h) => h.block_id));
    const heldBlocks = [...heldSet];

    if (heldBlocks.length < 2) {
      // 0 or 1 block: no articulation point possible.
      return [];
    }

    // Step 2: Build the induced subgraph over held blocks.
    // For each held block, query RouteFinderService.neighbors('foot') and keep only
    // edges to other held blocks (DD-OXBOW-ZONE: pure read of the live block-graph).
    const adjacency = new Map<number, number[]>();
    for (const blockId of heldBlocks) {
      const neighbors = this.routeFinder.neighbors(blockId, 'foot');
      const heldNeighbors = neighbors
        .map((n) => n.to)
        .filter((to) => heldSet.has(to));
      adjacency.set(blockId, heldNeighbors);
    }

    // Step 3: Find articulation points using iterative DFS (Tarjan-subset, deterministic).
    // An articulation point (AP) is a vertex whose removal disconnects the graph.
    // Algorithm: DFS over the induced subgraph; track discovery-time + low-link values.
    // This is a standard undirected AP algorithm (iterative to avoid stack overflow on large graphs).
    const n = heldBlocks.length;
    const blockIdx = new Map<number, number>();
    heldBlocks.forEach((b, i) => blockIdx.set(b, i));

    const disc = new Array<number>(n).fill(-1);
    const low = new Array<number>(n).fill(-1);
    const parent = new Array<number>(n).fill(-1);
    const isAP = new Array<boolean>(n).fill(false);
    let timer = 0;

    // DFS from each unvisited node (handles disconnected graphs).
    for (let startIdx = 0; startIdx < n; startIdx++) {
      if (disc[startIdx] !== -1) continue;

      // Iterative DFS using an explicit stack.
      // Each stack frame: [nodeIdx, neighborIterPos, childCount].
      const stack: Array<{ node: number; neighborPos: number; children: number }> = [];
      stack.push({ node: startIdx, neighborPos: 0, children: 0 });
      disc[startIdx] = low[startIdx] = timer++;

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!;
        const u = frame.node;
        const blockId = heldBlocks[u]!;
        const neighbors = adjacency.get(blockId) ?? [];

        if (frame.neighborPos < neighbors.length) {
          const neighborBlockId = neighbors[frame.neighborPos]!;
          frame.neighborPos++;
          const v = blockIdx.get(neighborBlockId)!;

          if (disc[v] === -1) {
            // Tree edge: push v onto the DFS stack.
            parent[v] = u;
            frame.children++;
            disc[v] = low[v] = timer++;
            stack.push({ node: v, neighborPos: 0, children: 0 });
          } else if (v !== parent[u]) {
            // Back edge: update low[u].
            low[u] = Math.min(low[u]!, disc[v]!);
          }
        } else {
          // Finished processing node u — pop from stack and update parent's low.
          stack.pop();
          if (stack.length > 0) {
            const parentFrame = stack[stack.length - 1]!;
            const p = parentFrame.node;
            // Update parent's low value.
            low[p] = Math.min(low[p]!, low[u]!);
            // AP condition for non-root node: p is an AP if low[u] >= disc[p].
            if (parent[p] !== -1 && low[u]! >= disc[p]!) {
              isAP[p] = true;
            }
            // AP condition for root: p is an AP if it has >= 2 DFS children.
            if (parent[p] === -1 && parentFrame.children >= 2) {
              isAP[p] = true;
            }
          }
        }
      }
    }

    // Step 4: Collect articulation point block_ids.
    const neckZones: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isAP[i]) {
        neckZones.push(heldBlocks[i]!);
      }
    }

    this.logger.debug(
      `OxbowSeveranceService.detectNeckZones: player=${playerId} rival=${rivalKey} held=${heldBlocks.length} neck=${neckZones.length}`,
    );
    return neckZones;
  }

  /**
   * Record the player's lieutenant holding a neck zone (block_id = zoneId).
   *
   * Inserts a combat_event of type 'hold' for the neck block. The hold must be maintained
   * for `combat.oxbow_hold_duration_ticks` ticks before the salient can be orphaned.
   * The tick-count is getter-sourced (no inline scalar — C4).
   *
   * Deterministic: no Math.random(), no Date.now().
   *
   * @param playerId    The player applying the hold.
   * @param rivalKey    The rival whose neck zone is being held.
   * @param zoneId      The block_id of the neck zone.
   * @param lieutenantId The lieutenant holding the neck.
   * @param gameMinute  The current game-tick.
   */
  async applyHoldAction(
    playerId: string,
    rivalKey: RivalKey,
    zoneId: number,
    lieutenantId: string,
    gameMinute: number,
  ): Promise<void> {
    // Getter-sourced duration (no inline 4 — C4).
    const holdDuration = this.combatTunables.oxbowHoldDurationTicks;

    // Insert a combat_event of type 'hold' for this neck zone.
    // created_at_minute: game-minute provides stable insertion-order sorting
    // (uuid v4 id is random, NOT time-ordered — migration 0093).
    await this.db
      .insert(combatEvent)
      .values({
        player_id: playerId,
        type: 'hold',
        target_rival_key: rivalKey,
        target_block_id: zoneId,
        lieutenant_id: lieutenantId,
        // P6-safe bucket fields — null for hold events (no friction/outcome/heat consumed).
        friction_consumed_bucket: null,
        outcome_bucket: null,
        heat_increment_bucket: null,
        created_at_minute: gameMinute,
      });

    this.logger.debug(
      `OxbowSeveranceService.applyHoldAction: player=${playerId} rival=${rivalKey} zone=${zoneId} lt=${lieutenantId} gm=${gameMinute} holdDuration=${holdDuration}`,
    );
  }

  /**
   * Reclassify isolated salient zones as orphan holdings.
   *
   * After the neck has been held for `combat.oxbow_hold_duration_ticks` ticks, the isolated
   * zones (salient blocks past the neck) become `orphan_holdings`:
   *   UPDATE rival_holding SET is_orphan = true WHERE player_id = playerId
   *     AND rival_key = rivalKey AND block_id IN (zoneIds).
   *
   * Orphan holdings have:
   *   - Reduced heat (the orphaned salient is no longer fuelling the rival's patrol heat).
   *   - Decaying BPD interest (canon :263 — a real_estate / BPD couple, §13).
   * These are produced by the downstream service chain (not this method directly) — this
   * method only sets the `is_orphan` flag that drives those consequences.
   *
   * Deterministic: a pure UPDATE. No Math.random(), no Date.now().
   * Idempotent: setting is_orphan=true on already-orphaned rows is a no-op.
   *
   * @param playerId  The player whose rival's salient is being orphaned.
   * @param rivalKey  The rival faction.
   * @param zoneIds   The block_ids of the isolated salient blocks (the orphan set).
   */
  async reclassifySalientAsOrphan(
    playerId: string,
    rivalKey: RivalKey,
    zoneIds: number[],
  ): Promise<void> {
    if (zoneIds.length === 0) return;

    await this.db
      .update(rivalHolding)
      .set({ is_orphan: true })
      .where(
        and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
          inArray(rivalHolding.block_id, zoneIds),
        ),
      );

    this.logger.debug(
      `OxbowSeveranceService.reclassifySalientAsOrphan: player=${playerId} rival=${rivalKey} orphaned=${zoneIds.length} zones: [${zoneIds.join(',')}]`,
    );
  }
}

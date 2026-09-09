// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 ("BFS upstream sur legs
//             inversés (decay 0.7/hop, floor 0.05, max 5 hops, shortest-hop-wins, arrows)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §4.3 ("Ce que
//             upstream veut dire" — BFS on inverted legs, cycles marked visited, shortest hop wins) +
//             §6.2 ("received = source_pressure × 0.7^hops, floor 0.05 si >0, max 5 hops; arrow_to_
//             building_id = voisin vers la source; hop le plus court gagne").
//             Decisions: §1.7 D7 ("BFS shortest-hop-wins, déterministe") + §1.13 D13 ("BFS ordonnée — tri
//             stable des voisins par building_id").
//             — P3-C C5 — 2026-07-12
//
// `backpressure-propagation.ts` — the PURE BFS the `BACKPRESSURE_UPDATE` tick's step 2 runs (no DB, no
// Math.random, no Date.now — every input is already-resolved data/numbers; D13). Two pieces:
//   1. `bfsUpstreamFromSource` — ONE source's own upstream wave (D7: BFS on legs INVERTED — a node's
//      upstream neighbors are the ORIGINS of legs whose DESTINATION is that node, recursively). Standard
//      BFS with a `visited` set seeded at the source (hop 0, never re-emitted as a "received" candidate —
//      the source keeps its OWN step-1 accrued value, never a propagated one) — a cycle (A→B→A) can only
//      ever re-discover A at a LONGER hop count than its true shortest path, so the visited-set guard is
//      exactly what makes "hop le plus court gagne" hold for a SINGLE source's own traversal (no separate
//      bookkeeping needed: standard BFS visited-once semantics ARE the shortest-hop-wins guarantee).
//   2. `combineBySource` — MULTI-SOURCE aggregation (a player can have >1 blocked-output source in the
//      same tick): for a node reachable from more than one source, the SHORTEST hop distance wins across
//      ALL sources (design's own "hop le plus court gagne" reused at the multi-source layer); a tie in hop
//      count is broken by the HIGHEST raw received value (★ JUDGMENT CALL, flagged for reviewer — design
//      does not name a multi-source amplitude tie-break; taking the max is the same "worst-case wins"
//      convention this codebase already uses for district-level aggregate bands, e.g.
//      `ErlangStashProjectionService`/`BufferBloatProjectionService`'s own MAX-rank district aggregation).
//
// The FLOOR (design §6.2: "floor 0.05 si >0") is deliberately NOT applied inside this module — it is
// applied by the caller (`BackpressureUpdateService`) at the point the WINNING raw value is turned into
// the actual `backpressure_index` write, so this module's own output (`receivedRaw`) stays a pure,
// floor-free number a caller can test independently of the floor rule.

/** One leg edge (origin → destination) — the graph substrate `LegRepository.listLegEdges` reads. */
export interface LegEdge {
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
}

/** ONE source's propagated candidate at a reachable upstream node. */
export interface PropagationCandidate {
  readonly buildingId: string;
  readonly hops: number;
  /** `source_pressure × decayPerHop^hops` — BEFORE the design §6.2 floor (applied by the caller). */
  readonly receivedRaw: number;
  /** The neighbor ONE hop closer to the source (design §6.2 — "voisin vers la source"). */
  readonly arrowToBuildingId: string;
}

/**
 * Build the INVERTED adjacency (destination → its origins, i.e. "who feeds pressure INTO this node when
 * IT is the one propagating upstream") from the player's leg edges, with each origin list stable-sorted
 * by building_id (D13 — deterministic neighbor exploration order, independent of query/insertion order).
 */
function buildInvertedAdjacency(edges: readonly LegEdge[]): Map<string, string[]> {
  const byDestination = new Map<string, string[]>();
  for (const e of edges) {
    const origins = byDestination.get(e.destinationBuildingId) ?? [];
    origins.push(e.originBuildingId);
    byDestination.set(e.destinationBuildingId, origins);
  }
  for (const origins of byDestination.values()) origins.sort((a, b) => a.localeCompare(b));
  return byDestination;
}

/**
 * BFS upstream from ONE blocked-output source (design §4.3/§6.2). Returns every node reached within
 * `maxHops` (hop 1..maxHops — the source itself, hop 0, is NEVER included: it keeps its own step-1
 * accrued value). `receivedRaw = sourcePressure × decayPerHop^hops` (pre-floor — see header). A
 * `sourcePressure <= 0` yields `[]` immediately (nothing to propagate — organic no-op).
 */
export function bfsUpstreamFromSource(
  edges: readonly LegEdge[],
  sourceBuildingId: string,
  sourcePressure: number,
  decayPerHop: number,
  maxHops: number,
): PropagationCandidate[] {
  if (!(sourcePressure > 0) || maxHops <= 0) return [];

  const invertedAdjacency = buildInvertedAdjacency(edges);
  const visited = new Set<string>([sourceBuildingId]); // the source is visited at hop 0 — never re-emitted.
  const results: PropagationCandidate[] = [];

  // FIFO queue of [buildingId, hops] — standard BFS (D13: neighbor order is pre-sorted, so the traversal
  // itself is deterministic regardless of Map/array iteration order elsewhere).
  let frontier: string[] = [sourceBuildingId];
  let hops = 0;

  while (frontier.length > 0 && hops < maxHops) {
    hops += 1;
    const nextFrontier: string[] = [];
    for (const current of frontier) {
      const origins = invertedAdjacency.get(current) ?? [];
      for (const origin of origins) {
        if (visited.has(origin)) continue; // already reached at a shorter (or equal, first-wins) hop — skip.
        visited.add(origin);
        const receivedRaw = sourcePressure * decayPerHop ** hops;
        results.push({ buildingId: origin, hops, receivedRaw, arrowToBuildingId: current });
        nextFrontier.push(origin);
      }
    }
    frontier = nextFrontier;
  }

  return results;
}

/**
 * Combine MULTIPLE sources' independent BFS results into ONE winner per building_id: shortest hop count
 * wins (design's own multi-hop rule, reapplied across sources); a tie in hop count breaks toward the
 * HIGHEST `receivedRaw` (★ judgment call — see header). Deterministic: ties are compared by plain
 * numeric/string comparison, never by array iteration order alone (the `<`/`>` comparisons below are the
 * SAME value regardless of which source's array is processed first).
 */
export function combineBySource(
  perSourceResults: readonly (readonly PropagationCandidate[])[],
): Map<string, PropagationCandidate> {
  const best = new Map<string, PropagationCandidate>();
  for (const candidates of perSourceResults) {
    for (const c of candidates) {
      const existing = best.get(c.buildingId);
      if (
        !existing ||
        c.hops < existing.hops ||
        (c.hops === existing.hops && c.receivedRaw > existing.receivedRaw)
      ) {
        best.set(c.buildingId, c);
      }
    }
  }
  return best;
}

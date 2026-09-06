// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C3 (★ Adjacency
//             district-adjacency.ts — the D11 REVISED fix's implementation, post-C0-STOP)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.7 (adjacence
//             RÉVISÉ) — decisions §D11 (révisé)
//             C0 STOP + resolution: docs/superpowers/plans/2026-07-15-04g-B-C0-reanchor.md §3 (the
//             original Chebyshev-1 cross-district `blocks.coordinates` derivation was structurally
//             unsound — `coordinates` is a LOCAL per-district grid, degenerates to K₁₈; RESOLVED by
//             reusing the ALREADY-CANONICAL System 9b router topology instead of fabricating a NEW
//             adjacency source).
//             Cross-ref (comment ONLY — NOT a refactor, NOT an import):
//             `operational/distribution/route-finder.service.ts:441-487` (`buildLayer2SameBank()` —
//             same-bank id-ordered chain, OQ-G1) + `:506` (`buildLayer2ThrennyAsync()` — the 6
//             `threnny_edges` rows). This module is a STANDALONE pure re-derivation of the SAME
//             topology (zero shared code, zero risk to the merged router) — the equivalence is PINNED
//             by C3 AC8's exact-22-edge assertion against real migration-0016 data, not by import.
//             — 04g-B C3 — 2026-07-15
//
// `district-adjacency.ts` — the D11 (revised) adjacency derivation: two districts are adjacent iff
// (i) they are CONSECUTIVE in the id-ordered chain of their OWN `bank_side` (OQ-G1 — group the 18
// districts by bank_side, sort by `districts.id` ascending, chain consecutive pairs), OR (ii) a
// `threnny_edges` row connects them (a bridge/ferry river crossing). This is the SAME topology the
// System 9b A* router already treats as "how districts connect" — the cascade of a coupled disaster
// travels along the SAME liaisons couriers physically use (design §3.7 "zéro fabrication").
//
// PURE CORE (`buildDistrictAdjacencyGraph`): zero I/O, zero DB, zero registry reads — takes
// ALREADY-FETCHED district bank_side rows + threnny_edges rows and derives the graph. Directly
// importable by an E2E spec for precompute-then-observe (mirrors `recovery-curve.ts`/
// `district-hum-weighting.ts`'s own C1/C2 posture) — a spec can fetch the REAL rows via psql, feed them
// into this function, and assert the result against the literal 22-edge set (C3 AC8).
//
// MODULE-LEVEL CACHE (`getDistrictAdjacencyGraph`): districts/threnny_edges are GLOBAL STATIC reference
// data (seeded once at migration 0016, never mutated at runtime — `world_geography.ts`'s own header:
// "La géographie est connue" — the SAME immutability invariant `route-finder.service.ts` itself relies
// on to build its own graph ONCE at bootstrap). So the FIRST caller's fetch is cached for the life of
// the process ("dérivée AU BOOT (fonction pure, cache module)", design §3.7) — every subsequent
// generator tick reuses the same in-memory graph, zero repeat DB cost. `resetDistrictAdjacencyGraphCacheForTest`
// is a TEST-ONLY hook (never called from production code) so a spec can force a fresh fetch after
// mutating fixture data, mirrying `EffectOverlayStore.dropSnapshotForTest`'s own precedent shape.

/** One district's bank_side, as fetched from `districts` (id, bank_side) — decoupled from the Drizzle
 *  schema type so this module has ZERO import dependency on `db/schema/world_geography.ts`. */
export interface DistrictBankRow {
  readonly id: number;
  readonly bankSide: 'north' | 'south';
}

/** One `threnny_edges` row, as fetched (north_district_id, south_district_id) — decoupled likewise. */
export interface ThrennyEdgeRow {
  readonly northDistrictId: number;
  readonly southDistrictId: number;
}

/** The derived undirected adjacency graph. `edgeKeys` is the canonical `"min-max"` string set (for an
 *  exact-set assertion, C3 AC8); `adjacency` is the per-district neighbor-set map (for the generator's
 *  `adjacentDistrictIds` lookups). */
export interface DistrictAdjacencyGraph {
  readonly edgeKeys: ReadonlySet<string>;
  readonly adjacency: ReadonlyMap<number, ReadonlySet<number>>;
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * PURE — build the undirected adjacency graph from already-fetched rows (design §3.7 revised, D11
 * revised). Derivation (verbatim mirror of the ALREADY-SHIPPED router's own OQ-G1 rule, re-derived
 * standalone — never imported):
 *   1. Group the 18 districts by `bankSide`; sort each group by `id` ascending (the seeded id order is
 *      already deterministic — NOT a hand-baked table).
 *   2. Chain each CONSECUTIVE pair within a bank: district[0]↔district[1], district[1]↔district[2], …
 *   3. Add one edge per `threnny_edges` row (north_district_id ↔ south_district_id).
 * Both directions of every edge are recorded (undirected). Zero magic constants — the graph is fully
 * determined by the input rows.
 */
export function buildDistrictAdjacencyGraph(
  districtRows: readonly DistrictBankRow[],
  thrennyRows: readonly ThrennyEdgeRow[],
): DistrictAdjacencyGraph {
  const northIds = districtRows.filter((d) => d.bankSide === 'north').map((d) => d.id).sort((a, b) => a - b);
  const southIds = districtRows.filter((d) => d.bankSide === 'south').map((d) => d.id).sort((a, b) => a - b);

  const adjacency = new Map<number, Set<number>>();
  const edgeKeys = new Set<string>();

  const addUndirectedEdge = (a: number, b: number): void => {
    edgeKeys.add(edgeKey(a, b));
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for (const chain of [northIds, southIds]) {
    for (let i = 0; i < chain.length - 1; i += 1) {
      addUndirectedEdge(chain[i]!, chain[i + 1]!);
    }
  }
  for (const edge of thrennyRows) {
    addUndirectedEdge(edge.northDistrictId, edge.southDistrictId);
  }

  return { edgeKeys, adjacency };
}

/** Every district adjacent to `districtId`, sorted ascending (empty array only for an id absent from
 *  the input rows entirely — never for any of the real 18, design invariant: degree ∈ [2,3]). */
export function adjacentDistrictIds(graph: DistrictAdjacencyGraph, districtId: number): readonly number[] {
  const set = graph.adjacency.get(districtId);
  return set ? Array.from(set).sort((a, b) => a - b) : [];
}

/** `true` iff `a` and `b` are adjacent (either direction — the graph is undirected by construction). */
export function areDistrictsAdjacent(graph: DistrictAdjacencyGraph, a: number, b: number): boolean {
  return graph.adjacency.get(a)?.has(b) ?? false;
}

// ── module-level cache (the "dérivée AU BOOT" half — see file header) ────────────────────────────────

let cachedGraph: DistrictAdjacencyGraph | undefined;

/**
 * Fetch-then-cache: the FIRST call invokes `fetchSeed` (a caller-supplied DB read — kept out of this
 * module to preserve its zero-I/O purity for direct E2E import) and caches the derived graph for the
 * life of the process; every subsequent call returns the cached graph without touching `fetchSeed`
 * again (districts/threnny_edges are immutable GLOBAL static rows — see file header).
 */
export async function getDistrictAdjacencyGraph(
  fetchSeed: () => Promise<{ districts: readonly DistrictBankRow[]; threnny: readonly ThrennyEdgeRow[] }>,
): Promise<DistrictAdjacencyGraph> {
  if (cachedGraph) return cachedGraph;
  const seed = await fetchSeed();
  cachedGraph = buildDistrictAdjacencyGraph(seed.districts, seed.threnny);
  return cachedGraph;
}

/** TEST-ONLY: drop the module-level cache so the NEXT `getDistrictAdjacencyGraph` call re-fetches.
 *  Never called from any production code path (mirrors `EffectOverlayStore.dropSnapshotForTest`). */
export function resetDistrictAdjacencyGraphCacheForTest(): void {
  cachedGraph = undefined;
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (halgren_tannery_hailstorm
//             activation — ScarPolygon)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.5.1
//             ("ScarPolygon (payload jsonb): set contigu de hailstorm_scar_block_count blocks du
//             district, BFS seedé sur les coordinates réels (S12) depuis un block d'origine tiré")
//             Seam S12: db/schema/world_geography.ts (`blocks.coordinates` — a LOCAL per-district grid,
//             `schema_world_geography.md` §D3) — intra-district usage ONLY (C0 STOP §3 / design §3.7:
//             `coordinates` is NEVER sound for cross-district comparison; this module never receives
//             blocks from more than one district at a time).
//             Precedent: `heat-propagation.service.ts`'s private `tileDistance` (Chebyshev
//             block-coordinate distance, "NOT district-wide") — the SAME distance shape, re-derived here
//             as an exported pure function (the original is private + typed against a different
//             building-shaped struct, not directly reusable).
//             — 04g-B C2 — 2026-07-15
//
// `scar-polygon.ts` — the ScarPolygon draw (design §3.5.1): a deterministic BFS walk over ONE
// district's blocks (8-connectivity, Chebyshev distance 1 — the SAME adjacency shape
// `heat-propagation.service.ts` already uses intra-district) from a SEEDED origin block, collecting the
// first `targetCount` blocks visited in a FIXED, reproducible order (frontier sorted by block id
// ascending at each step — never `Math.random`, never Set/Map iteration order). PURE: zero I/O, zero
// registry reads — the caller fetches `blocks` for the target district and passes `targetCount` from
// `randomWorldTunables.hailstormScarBlockCount` (R2.3). Directly importable for precompute-then-observe
// E2E assertions (mirrors `ambient-micro-event.service.ts`'s exported `generateDistrictDraw`).
//
// Only the ORIGIN is a seeded draw (design: "depuis un block d'origine tiré") — the walk itself is a
// deterministic BFS, not a further seeded random walk. Every district's block set forms a solid
// rectangular local grid (`x = (local-1) % 10`, `y = (local-1) / 10`, `schema_world_geography.md` §D3),
// so an 8-connected BFS from any origin always reaches every block in the district — `targetCount` is
// always satisfiable (`hailstorm_scar_block_count` range 3..12, every district's `block_count` is ≥ 33).

import type { Rng } from '../../common/seeded-rng';

/** One block, LOCAL-grid coordinates (district-scoped — never compared across districts, C0 STOP §3). */
export interface ScarBlockPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/** The Chebyshev distance between two blocks' LOCAL coordinates (8-connectivity — same shape as
 *  `heat-propagation.service.ts`'s private `tileDistance`, intra-district only). */
export function chebyshevBlockDistance(a: ScarBlockPoint, b: ScarBlockPoint): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Draw a contiguous ScarPolygon: a seeded origin block, then a deterministic 8-connected BFS
 * (frontier sorted by block id ascending at each expansion) collecting up to `targetCount` block ids,
 * in visitation order. `blocks` MUST all belong to the SAME district (caller's responsibility — this
 * function has no district column to check). Returns FEWER than `targetCount` ids only if the district
 * genuinely has fewer blocks than `targetCount` (never happens in practice — see file header).
 */
export function drawScarPolygon(
  blocks: readonly ScarBlockPoint[],
  rng: Rng,
  targetCount: number,
): readonly number[] {
  if (blocks.length === 0) return [];

  const originIndex = rng.int(0, blocks.length - 1);
  const origin = blocks[originIndex]!;

  const visited = new Set<number>([origin.id]);
  const order: number[] = [origin.id];
  const queue: ScarBlockPoint[] = [origin];
  let qi = 0;

  while (order.length < targetCount && qi < queue.length) {
    const current = queue[qi]!;
    qi += 1;
    const neighbors = blocks
      .filter((b) => !visited.has(b.id) && chebyshevBlockDistance(current, b) === 1)
      .sort((a, b) => a.id - b.id);
    for (const n of neighbors) {
      if (order.length >= targetCount) break;
      visited.add(n.id);
      order.push(n.id);
      queue.push(n);
    }
  }

  return order;
}

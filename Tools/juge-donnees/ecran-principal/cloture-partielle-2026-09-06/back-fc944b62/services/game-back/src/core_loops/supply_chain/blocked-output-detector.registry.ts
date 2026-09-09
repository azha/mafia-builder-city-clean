// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 ("BlockedOutputDetectorRegistry
//             (fermé, dup-throw boot)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("Miroir
//             structurel de `RoutineItemGeneratorRegistry` (P3-B, dup-throw au boot)").
//             Pattern: `HlCardProviderRegistry` (`progression/loop10/hl-card-provider.registry.ts`) /
//             `RoutineItemGeneratorRegistry` (`core_loops/flag_discipline/generators/routine-item-
//             generator.ts`) — the SAME "closed Map<key, impl> built ONCE from a `useFactory` provider
//             list, duplicate-key throws at boot" convention this codebase uses for every registry family
//             (`ExceptionEffectRegistry` is the root precedent, `exceptions.module.ts:47-63`).
//             — P3-C C5 — 2026-07-12
//
// `BlockedOutputDetectorRegistry` — the closed set of 6 v1 LIVE `BlockedOutputDetector`s (decisions §6.6
// sub-décision #6 default). Built ONCE from `SupplyChainModule`'s `useFactory` provider list; a duplicate
// `source` throws at boot (the SAME loud-misconfiguration convention every sibling registry uses).
// `BUYER_LEK_COLD` is NEVER passed to this constructor (see `blocked-output-detector.ts`'s header) — the
// closed set stays exactly 6, matching `HlCardProviderRegistry`'s own "closed set of 5" shape.

import type { BlockedNode, BlockedOutputDetector, BlockedOutputSource } from './blocked-output-detector';

export class BlockedOutputDetectorRegistry {
  private readonly bySource = new Map<BlockedOutputSource, BlockedOutputDetector>();
  private readonly ordered: BlockedOutputDetector[] = [];

  constructor(detectors: BlockedOutputDetector[]) {
    for (const d of detectors) {
      if (this.bySource.has(d.source)) {
        throw new Error(
          `BlockedOutputDetectorRegistry: duplicate detector for source '${String(d.source)}' — register ` +
            'each exactly once in SupplyChainModule\'s useFactory provider list.',
        );
      }
      this.bySource.set(d.source, d);
      this.ordered.push(d);
    }
  }

  /** All 6 registered detectors, in registration order (deterministic — D13). */
  all(): BlockedOutputDetector[] {
    return [...this.ordered];
  }

  /**
   * Run EVERY registered detector for `playerId` + fold the results into ONE map: building_id → the SET
   * of `BlockedOutputSource` tags currently diagnosing it (a building can be blocked for more than one
   * reason at once — e.g. a distribution_hub that is ALSO the origin of a stressed leg). Deterministic
   * iteration (Map insertion order = registration order; each detector's own array order); no RNG.
   */
  async detectAll(playerId: string): Promise<Map<string, Set<BlockedOutputSource>>> {
    const byBuilding = new Map<string, Set<BlockedOutputSource>>();
    for (const detector of this.ordered) {
      const nodes: BlockedNode[] = await detector.detect(playerId);
      for (const node of nodes) {
        const set = byBuilding.get(node.buildingId) ?? new Set<BlockedOutputSource>();
        set.add(node.source);
        byBuilding.set(node.buildingId, set);
      }
    }
    return byBuilding;
  }
}

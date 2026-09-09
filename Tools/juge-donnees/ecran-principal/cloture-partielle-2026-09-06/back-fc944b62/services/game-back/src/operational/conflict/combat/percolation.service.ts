// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 5 (C5) Step 4
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.3
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §2.1 (Percolation Break)
//             — Combat & Escalation B C5 — 2026-06-25 —
//
// `PercolationService` — the §2.1 Percolation Break mechanic.
//
// applyAssault:
//   - DIV-B2: REUSES the live executeRaid path (raid.repository.ts — a combat assault IS a targeted
//     raid). NOT a parallel raid implementation.
//   - Decrements operational_graph_node_count by the tunable percolationAssaultNodeRemovalPerHit
//     (getter-sourced, NEVER inlined).
//   - Recomputes active_link_fraction = newNodeCount / initialNodeCount (clamped [0,1]).
//   - Compares to percolationThresholdFloat (0.52 for composite:STANDARD) → writes partition_state.
//   - Emits COMBAT_HEAT via HeatContribService.emitCombatHeat on each raided building.
//   - Inserts a combat_event of type 'assault'.
//
// getActiveLinkBand:
//   - Returns a qualitative band — NEVER the raw active_link_fraction float (P6).
//
// DETERMINISM: no Math.random(), no Date.now(). Getter-sourced magnitudes. Pure function of persisted state.
// P5/P6: active_link_fraction + operational_graph_node_count are SERVER-ONLY (never in player routes).
// DIV-B2: applyAssault REUSES the live raid path (NOT a parallel raid path).
// Zero-regression: ADDITIVE only. Existing executeRaid callers byte-identical.

import { Injectable, Logger } from '@nestjs/common';

import { RaidRepository } from '../../enforcement/raid.repository';
import { HeatContribService } from '../../heat_contrib/heat-contrib.service';
import { heatContribTunables } from '../../heat_contrib/heat-contrib-tunables';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';
import type { CombatEventRow, PartitionState } from './combat.types';

// ── Active-link band domain ────────────────────────────────────────────────────────────────────────

/** Closed qualitative band for the operational-graph active-link fraction (P6 — NEVER the raw float). */
export type ActiveLinkBand = 'fragmented' | 'sparse' | 'standard' | 'dense' | 'saturated';

/**
 * Map the composite bucket string to its reference float threshold.
 * Canon: combat_mechanics.md :86 "composite:STANDARD (ref 0.52)".
 * Only STANDARD is in-spec for C5; the map is extensible for future calibration.
 */
function compositeToThresholdFloat(bucket: string): number {
  const lower = bucket.toLowerCase();
  if (lower === 'composite:standard') return 0.52;
  if (lower === 'composite:high')    return 0.70;
  if (lower === 'composite:low')     return 0.35;
  if (lower === 'composite:minimal') return 0.20;
  // Unknown bucket: fall back to STANDARD ref.
  return 0.52;
}

/**
 * Map an active_link_fraction float to a qualitative ActiveLinkBand.
 * Thresholds are provisional [PROV-Y26Q2] — calibration TD.
 *   [0, 0.20)   → fragmented  (heavily disrupted — threshold already crossed)
 *   [0.20, 0.40)→ sparse
 *   [0.40, 0.60)→ standard
 *   [0.60, 0.80)→ dense
 *   [0.80, 1.0] → saturated   (fully connected)
 */
function fractionToActiveLinkBand(fraction: number): ActiveLinkBand {
  if (fraction < 0.20) return 'fragmented';
  if (fraction < 0.40) return 'sparse';
  if (fraction < 0.60) return 'standard';
  if (fraction < 0.80) return 'dense';
  return 'saturated';
}

@Injectable()
export class PercolationService {
  private readonly logger = new Logger(PercolationService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly raidRepo: RaidRepository,
    private readonly heatContribSvc: HeatContribService,
    private readonly tunables: CombatTunables,
  ) {}

  /**
   * `applyAssault` — the core §2.1 Percolation Break assault mechanic.
   *
   * DIV-B2: REUSES the live raid path (executeRaid). A combat assault IS a targeted raid on the
   * rival's territory. This is NOT a parallel implementation — we call the SAME executeRaid the
   * enforcement path calls (the raid.repository.ts:215 production method).
   *
   * Algorithm:
   *   1. Insert a combat_event of type 'assault'.
   *   2. Resolve targets on block via resolveTargetsOnBlock.
   *   3. If targets exist: execute raid (DIV-B2 REUSE) + emit COMBAT_HEAT per raided building.
   *   4. Decrement operational_graph_node_count by percolationAssaultNodeRemovalPerHit (getter-sourced).
   *   5. Recompute active_link_fraction = newCount / initialCount (clamped [0,1]).
   *   6. Compare to percolationThreshold → write partition_state.
   *   7. Write the 3 combat columns via writeRivalCombatCols.
   *
   * If no buildings on the block (dry raid): still decrement + recompute + write partition_state.
   * The node removal is independent of building presence (network degradation is structural).
   *
   * DETERMINISM: no Math.random(), no Date.now(). Getter-sourced magnitudes only.
   */
  async applyAssault(
    playerId: string,
    rivalKey: RivalKey,
    targetBlockId: number,
    districtId: number,
    gameMinute: number,
  ): Promise<CombatEventRow> {
    // 1. Insert combat_event of type 'assault'.
    // created_at_minute: game-minute provides stable insertion-order sorting
    // (uuid v4 id is random, NOT time-ordered — migration 0093).
    const event = await this.combatRepo.insertCombatEvent({
      player_id:        playerId,
      type:             'assault',
      target_rival_key: rivalKey,
      target_block_id:  targetBlockId,
      // heat_increment_bucket: the combat magnitude band (getter-sourced via heatContribTunables, NEVER inlined).
      heat_increment_bucket: heatContribTunables.combatMagnitude,
      // friction_consumed_bucket and outcome_bucket: set by the calling orchestrator; omitted here (C5 scope).
      friction_consumed_bucket: null,
      outcome_bucket: null,
      target_register_id: null,
      lieutenant_id: null,
      created_at_minute: gameMinute,
    });

    // [PROV-Y26Q2]: orphan holdings produce zero combat heat (the canon §3.5 :263 reduced-heat
    // consequence for orphaned salient blocks). Zero is the conservative floor; calibration TD
    // will refine to partial heat if canon specifies a non-zero multiplier.
    // combat.oxbow_orphan_heat_multiplier [PROV-Y26Q2] — routed to calibration TD.
    const holdingIsOrphan = await this.combatRepo.isHoldingOrphan(playerId, rivalKey, targetBlockId);

    // 2. Resolve targets on block (DIV-B2 — the SAME resolve path the enforcement patrol uses).
    const targets = await this.raidRepo.resolveTargetsOnBlock(playerId, targetBlockId);

    // 3. If targets exist: REUSE executeRaid + emit COMBAT_HEAT per raided building.
    //    Skip heat emission entirely for orphan holdings (reduced-heat = zero, conservative floor).
    if (targets.length > 0) {
      const raided = await this.raidRepo.executeRaid({
        playerId,
        districtId,
        targetBlockId,
        raidedAtTick: gameMinute,
        seizureFraction: 1.0,
        targets,
      });

      if (holdingIsOrphan) {
        // [PROV-Y26Q2] orphan holding — zero combat heat emitted (conservative floor).
        // Canon §3.5 :263 says "reduced heat" but does not specify a partial heat magnitude.
        // Calibration TD will refine if a non-zero multiplier is canon-specified.
        this.logger.debug(
          `PercolationService.applyAssault: orphan holding block=${targetBlockId} → zero combat heat (reduced-heat floor) [PROV-Y26Q2]`,
        );
      } else {
        // Emit COMBAT_HEAT for each raided building (the NEW heat producer, ADDITIVE).
        for (const r of raided) {
          await this.heatContribSvc.emitCombatHeat(playerId, districtId, r.building_id, gameMinute);
        }
      }
    } else {
      this.logger.debug(
        `PercolationService.applyAssault: dry raid — no targets on block ${targetBlockId} for player ${playerId}; ` +
          `node removal still applied (structural degradation is building-independent).`,
      );
    }

    // 4. Read current rival_state for node count + initial count computation.
    //    We read it directly from the rival state repo for the B-owned columns.
    //    CombatRepository.writeRivalCombatCols is the write; RivalStateRepository is A's read.
    //    For the percolation recompute we need the current node count → use combatRepo's db access.
    const currentState = await this.combatRepo.readRivalCombatState(playerId, rivalKey);

    const currentCount = currentState?.operational_graph_node_count ?? 20; // default 20 if not seeded
    const removalPerHit = this.tunables.percolationAssaultNodeRemovalPerHit; // getter-sourced, NEVER inlined

    const newNodeCount = Math.max(0, currentCount - removalPerHit);

    // 5. Recompute active_link_fraction = newCount / initialCount.
    //    If newCount = 0, fraction = 0. If initialCount = 0, fraction = 0.
    const initialCount = currentCount; // the pre-removal count is the denominator
    const newFraction = initialCount > 0 ? Math.min(1, Math.max(0, newNodeCount / initialCount)) : 0;

    // 6. Compare to percolation threshold → partition_state.
    const thresholdBucket = this.tunables.percolationThresholdBucket;
    const thresholdFloat = compositeToThresholdFloat(thresholdBucket);
    const partitionState: PartitionState = newFraction < thresholdFloat ? 'fragmented' : 'integrated';

    // 7. Write the 3 combat columns (OQ-B2 — the B-owned columns on rival_state).
    await this.combatRepo.writeRivalCombatCols(playerId, rivalKey, {
      operational_graph_node_count: newNodeCount,
      active_link_fraction:         newFraction,
      partition_state:              partitionState,
    });

    return event;
  }

  /**
   * `getActiveLinkBand` — returns the qualitative band for the active_link_fraction.
   *
   * P6 invariant: NEVER returns the raw active_link_fraction float or operational_graph_node_count.
   * Returns `{ band: ActiveLinkBand }` — the ONLY player-facing representation.
   */
  async getActiveLinkBand(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ band: ActiveLinkBand }> {
    const state = await this.combatRepo.readRivalCombatState(playerId, rivalKey);
    const fraction = state?.active_link_fraction ?? 1.0; // default saturated if not seeded
    const band = fractionToActiveLinkBand(fraction);
    return { band };
  }

  /** Expose the threshold float for tests (getter-sourced, never hardcoded). */
  get percolationThresholdFloat(): number {
    return compositeToThresholdFloat(this.tunables.percolationThresholdBucket);
  }

  /** Expose the combat magnitude band string for the heat_increment_bucket (getter-sourced via heatContribTunables). */
  get combatMagnitude(): string {
    return heatContribTunables.combatMagnitude;
  }
}

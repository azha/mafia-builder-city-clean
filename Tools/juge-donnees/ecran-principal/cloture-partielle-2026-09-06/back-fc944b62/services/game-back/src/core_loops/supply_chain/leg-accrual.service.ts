// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C2 (legs — activation +
//             accrual d'arrivée) + §C8 (couplages bidirectionnels 3<->5 — the feed term completion)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.1 (D5 accrual
//             formula, verbatim) + §8.1 (sinuosity→mycelial coupling) + §8.2 (backpressure→mycelial feed,
//             completed THIS chunk, see the C8 ADDITION note below) + §8.3 (damping/loop-breaker).
//             Decisions: §1.5 D5 (exponent applies to the normalized×multiplier term, not the stock — a
//             stock-exponent would runaway) + §1.6 D6 (accrual fires ONLY on real arrival — ad-hoc AND
//             saved routes accrue identically, the layer that closes Loop 4's ad-hoc escape hatch).
//             — P3-C C2 — 2026-07-12 / C8 — 2026-07-13
//
// `LegAccrualService.recordThroughput` — the D5 formula's ONLY call site this chunk. Invoked exactly
// once per real courier arrival (the post-tx-arrival hook in `distribution-transit.service.ts`,
// register §0 row 8) — NEVER at dispatch (D6: an in-flight, not-yet-delivered shift has moved no real
// throughput; a courier CAUGHT mid-transit never reaches this call at all, since its shift status flips
// away from `in_transit` before the arrival branch — "unrewarded ≠ failed", plan §C2 falsifiable).
//
// FORMULA (design §5.1 + §8.2, verbatim, C8-complete):
//   normalized       = cargo_grams / mycelial_throughput_normalization_grams
//   sinuosity_factor = max(0, SI_route - 1) × mycelial_sinuosity_debt_acceleration_coefficient
//   backpressure_feed = mycelial_backpressure_feed_coefficient IF the DESTINATION node is `critical`
//                        AND not damped-only (§8.3), ELSE 0 — `mycelial-backpressure-feed.ts`'s own
//                        `backpressureFeedMultiplier`.
//   increment        = (normalized × mycelial_debt_accrual_multiplier) ^ mycelial_debt_accrual_exponent
//                        × (1 + sinuosity_factor) × (1 + backpressure_feed)
//   debt_load        = min(debt_load + increment, mycelial_debt_cap)   — the LegRepository upsert's job.
//
// P3-C C8 ADDITION — §8.2 backpressure→mycelial feed, completing the C2 deferral note this header used
// to carry ("this chunk's formula omits the design's × (1 + backpressure_feed) term outright ... there
// is no `critical` bucket to read [until C5/C6 land the writer]"): `supply_node_pressure` now has a real
// writer (`BackpressureUpdateService`, C5) and a real bucket derivation (`backpressureBucket`, C5), so
// this service reads the DESTINATION building's CURRENT row (`SupplyNodePressureRepository.findOne` —
// the SAME "missing row = zero-state, not a 404" convention `BackpressureTraceService` already uses),
// resolves its bucket, and asks `backpressureFeedMultiplier` (§8.3's damping rule lives ENTIRELY in that
// pure module, never duplicated here) whether to apply the feed. The read is a SEPARATE query from the
// upsert (never inside the same statement) — the destination's pressure state is a READ-ONLY input to
// this formula, this service never writes `supply_node_pressure` (D3 wall, that table belongs to Loop 3).
//
// SI_route = the SI of the route that DELIVERED this throughput — ad-hoc (fresh A* each dispatch, DD-
// DISPATCH-DEBT-SOFT) or saved, identically (design §5.1: "les dispatches ad-hoc accruent la dette de leg
// pareil"). The caller (the transit hook) reads this off `route.sinuosity_index` at arrival time — the
// SAME column Loop 4 owns (frozen between replans, OQ-P1); this service takes it as a plain number, no DB
// read of its own for THAT factor (keeps the sinuosity_factor term pure + independently testable) — only
// the C8 feed term reads the DB (the destination's pressure row, described above).

import { Injectable } from '@nestjs/common';

import { LegRepository } from './leg.repository';
import { SupplyNodePressureRepository } from './supply-node-pressure.repository';
import { backpressureBucket } from './backpressure-bucket';
import { backpressureFeedMultiplier } from './mycelial-backpressure-feed';
import { coreLoopsTunables } from '../core-loops-tunables';

@Injectable()
export class LegAccrualService {
  constructor(
    private readonly legRepository: LegRepository,
    // P3-C C8 — the destination's CURRENT backpressure state (§8.2 feed read, D3 wall: read-only).
    private readonly pressureRepository: SupplyNodePressureRepository,
  ) {}

  /**
   * `recordThroughput` (design §5.1 + §8.2, C8-complete) — apply the D5 accrual formula for one real
   * arrival and upsert the leg's `debt_load` atomically (`LegRepository.upsertThroughput`, the ON
   * CONFLICT identity arbiter).
   *
   * @param playerId               the owning player.
   * @param originBuildingId       the leg's origin (design §4.2 — the logical edge's origin endpoint).
   * @param destinationBuildingId  the leg's destination — ALSO (C8) the building whose CURRENT
   *                               `supply_node_pressure` row is read for the §8.2 feed term.
   * @param cargoGrams             the SHIFT's persisted cargo (the real throughput that just arrived).
   * @param routeSinuosityIndex    the DELIVERING route's `sinuosity_index` at arrival time (ad-hoc or
   *                               saved — identical treatment, D6).
   * @param gameMinute             ctx.gameMinute (deterministic — no Date.now, D13) — stamped onto
   *                               `last_throughput_tick`.
   */
  async recordThroughput(
    playerId: string,
    originBuildingId: string,
    destinationBuildingId: string,
    cargoGrams: number,
    routeSinuosityIndex: number,
    gameMinute: number,
  ): Promise<void> {
    const normalized = cargoGrams / coreLoopsTunables.mycelialThroughputNormalizationGrams;
    const sinuosityFactor =
      Math.max(0, routeSinuosityIndex - 1) * coreLoopsTunables.mycelialSinuosityDebtAccelerationCoefficient;
    const base = normalized * coreLoopsTunables.mycelialDebtAccrualMultiplier;

    // P3-C C8 — §8.2 feed: read the DESTINATION's CURRENT pressure row (missing row = zero-state, the
    // SAME "silent, never touched" convention `SupplyNodePressureRepository.findOne`'s own header
    // documents — never a 404 here either). `backpressureFeedMultiplier` owns the ENTIRE §8.3 damping
    // decision (never re-derived inline) — this call site only resolves the destination's bucket.
    const destinationPressure = await this.pressureRepository.findOne(playerId, destinationBuildingId);
    const destinationBucket = backpressureBucket(
      destinationPressure?.backpressureIndex ?? 0,
      coreLoopsTunables.backpressureMildThreshold,
      coreLoopsTunables.backpressureWarmThreshold,
      coreLoopsTunables.backpressureCriticalThreshold,
    );
    const backpressureFeed = backpressureFeedMultiplier(
      destinationBucket,
      destinationPressure?.isBlockedOutput ?? false,
      destinationPressure?.blockedSources ?? [],
      coreLoopsTunables.mycelialBackpressureFeedCoefficient,
    );

    const increment =
      Math.pow(base, coreLoopsTunables.mycelialDebtAccrualExponent) * (1 + sinuosityFactor) * (1 + backpressureFeed);
    const cap = coreLoopsTunables.mycelialDebtCap;

    await this.legRepository.upsertThroughput(
      playerId,
      originBuildingId,
      destinationBuildingId,
      increment,
      cap,
      gameMinute,
    );
  }
}

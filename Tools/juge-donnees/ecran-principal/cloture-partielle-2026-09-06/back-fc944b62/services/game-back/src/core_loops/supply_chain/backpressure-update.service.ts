// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (`BACKPRESSURE_UPDATE`
//             MINUTE/26 provisional — the 3-step tick)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.2 (source accrual
//             → BFS propagation → relief) + §8.3 (`LEG_STRESSED_ORIGIN` half-weight) + §4.3 (BFS shape) +
//             §15 I5 (bounds + one-propagation-per-tick).
//             Pattern (registration + test-seam symmetry): `MycelialDecayTickService`'s own
//             `OnApplicationBootstrap` + `registerSystem` + "one public runTick both the scheduler AND the
//             `_test` route call" shape (Lesson #3).
//             — P3-C C5 — 2026-07-12
//
// `BackpressureUpdateService` — registers `BACKPRESSURE_UPDATE` at MINUTE/26 (confirmed free: MINUTE/25
// courtesy-skipped for 04f-B, MINUTE/26 reserved for exactly this since C4, MINUTE/27 already
// `MYCELIAL_MAINTENANCE_ADVANCE`). Orchestrates design §6.2's 3-step tick for one player:
//
//   1. DETECT — `BlockedOutputDetectorRegistry.detectAll(playerId)` folds all 6 live detectors into ONE
//      Map<building_id, Set<BlockedOutputSource>> (a building may be blocked for more than one reason).
//   2. WEIGHT + ACCRUE — design §8.3's half-weight rule: a building whose ONLY diagnosed source is
//      `LEG_STRESSED_ORIGIN` accrues at `pressure_per_tick × 0.5`; any OTHER source present (alone or
//      alongside `LEG_STRESSED_ORIGIN`) accrues at the FULL `pressure_per_tick` (★ judgment call — design
//      §8.3 names the half-weight for a leg-stressed-origin node but does not address what happens when
//      the SAME building is ALSO tagged by a stronger live signal in the SAME tick; taking the full weight
//      whenever a non-damped source is present is the conservative reading — it never UNDER-weights a
//      building that is genuinely blocked for more than the damped reason). `SupplyNodePressureRepository.
//      accrueSources` writes this + returns the POST-accrual index per source building.
//   3. PROPAGATE — BFS upstream (design §4.3) from EVERY source building (using its OWN post-accrual
//      index as `source_pressure`), combined across sources (shortest-hop-wins, `backpressure-
//      propagation.ts`), EXCLUDING any building that is ITSELF a source this tick (a source keeps its own
//      accrued value, never overwritten by a propagated one — see that module's header). The floor
//      (design §6.2: "floor 0.05 si >0") is applied HERE, at the point the winning raw value becomes the
//      actual write.
//   4. RELIEF — every OTHER existing `supply_node_pressure` row for this player (not touched by 2 or 3
//      this tick) decays via `SupplyNodePressureRepository.applyRelief` (D8).
//   5. (P3-C C6) CRITICAL-CROSSING EXCEPTION — every building steps 2/3 wrote whose resultant bucket is
//      `critical` is offered to `BackpressureExceptionProducer.raiseIfClear` (design §6.2/§9) — see that
//      file's header for the exact "fires every tick still critical, dedup collapses it" semantics.
//
// I5 (one propagation application per tick): EVERY one of the 3 repository writes is independently guarded
// on `last_propagation_tick = gameMinute` — a same-`gameMinute` re-run of this WHOLE method touches ZERO
// additional state (see `supply-node-pressure.repository.ts`'s own header for the exact mechanism).
//
// ORGANIC NO-OP (plan §C5 floor): a player with NO blocked-output source AND NO existing `supply_node_
// pressure` row at all sees all 3 repository calls match ZERO rows (accruals=[] / propagation=[] short-
// circuit immediately; relief's WHERE matches nothing) — the "tick no-op, 0 writes" falsifiable case.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { BlockedOutputDetectorRegistry } from './blocked-output-detector.registry';
import { LegRepository } from './leg.repository';
import { SupplyNodePressureRepository, type SourceAccrual, type PropagatedWrite } from './supply-node-pressure.repository';
import { bfsUpstreamFromSource, combineBySource, type LegEdge } from './backpressure-propagation';
import { backpressureBucket } from './backpressure-bucket';
import { BackpressureExceptionProducer } from './backpressure-exception-producer.service';
import { coreLoopsTunables } from '../core-loops-tunables';

/** design §8.3 — a building whose ONLY diagnosed source is the damped one accrues at half-weight.
 *  ★ C10 CLOSEOUT NOTE (decisions §4 reconcile): this literal is duplicated verbatim in
 *  `mycelial-backpressure-feed.ts`'s own `DAMPED_SOURCE` (the §8.3 loop-breaker read from the OTHER
 *  direction — mycelial's feed-into-backpressure exclusion). Both are pinned to the SAME source string
 *  the `leg-stressed-origin.detector.ts`'s `readonly source = 'LEG_STRESSED_ORIGIN'` defines — kept as 2
 *  independent literals (not a shared exported constant) DELIBERATELY: this file (backpressure domain)
 *  and that one (mycelial domain) do not otherwise import from each other, and a shared constant would
 *  introduce a cross-domain import edge for a single string neither module's own tests currently need
 *  synchronized at runtime (each file's own test suite asserts its OWN literal against its OWN detector
 *  tag, not against each other). If a THIRD site ever needs this string, extract a shared constant then. */
const DAMPED_SOURCE = 'LEG_STRESSED_ORIGIN';
const HALF_WEIGHT = 0.5;
const FULL_WEIGHT = 1.0;

@Injectable()
export class BackpressureUpdateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackpressureUpdateService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly detectorRegistry: BlockedOutputDetectorRegistry,
    private readonly legRepository: LegRepository,
    private readonly pressureRepository: SupplyNodePressureRepository,
    // P3-C C6 — the critical-crossing Exception producer (design §6.2 "Franchissement ENTRANT de
    // critical" + §9). Called IN-LINE after this tick's own accrual/propagation writes (DD-P2: no new
    // event bus) — see `backpressure-exception-producer.service.ts`'s own header for the "fires every
    // tick still critical, dedup collapses it" convention this call site realizes.
    private readonly criticalExceptionProducer: BackpressureExceptionProducer,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.BACKPRESSURE_UPDATE,
      cadence: Cadence.MINUTE,
      order: 26,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'BackpressureUpdateService registered BACKPRESSURE_UPDATE at MINUTE/26 — next free after ' +
        'LIVE_OPS_REAL_CLOCK_SWEEP/24 (MINUTE/25 courtesy-skipped for 04f-B). Each in-game minute, per ' +
        'player: detect blocked-output sources (6 live detectors) → accrue source pressure (weighted, ' +
        '§8.3) → BFS-propagate upstream on inverted legs (decay/hop, floor, max-hops, shortest-hop-wins) ' +
        '→ relieve every other existing node. Organically a no-op for a player with no blocked output and ' +
        'no prior pressure state.',
    );
  }

  // ───────────────────────────── the registered MINUTE/26 tick ─────────────────────────────

  /**
   * {MINUTE, order 26} — the design §6.2 3-step tick for one player. Returns per-step counts (the
   * falsifiable evidence the C5 floor asserts against: exact accrual counts, propagation counts, relief
   * counts, and same-`gameMinute` idempotency — a 2nd call returns the SAME counts derived from an
   * UNCHANGED underlying state, never a doubled one).
   *
   * Visibility: public so `SupplyChainTestController` can drive it directly for E2E (the `run-
   * backpressure-update` test route, Lesson #3 — the SAME method the scheduler registration calls).
   */
  async runTick(
    playerId: string,
    gameMinute: number,
  ): Promise<{ sourcesAccrued: number; nodesPropagated: number }> {
    // ── Step 1: DETECT ──────────────────────────────────────────────────────────────────────────────
    const blockedByBuilding = await this.detectorRegistry.detectAll(playerId);

    const accruals: SourceAccrual[] = [];
    for (const [buildingId, sources] of blockedByBuilding) {
      const dampedOnly = sources.size === 1 && sources.has(DAMPED_SOURCE);
      const weight = dampedOnly ? HALF_WEIGHT : FULL_WEIGHT;
      accruals.push({
        buildingId,
        delta: coreLoopsTunables.backpressurePressurePerTickWhenBlocked * weight,
        sourceTags: [...sources].sort(), // D13 — stable persisted ordering, independent of Set iteration.
      });
    }

    // ── Step 2: ACCRUE (returns the POST-accrual index per source — the BFS's own source_pressure) ────
    const accruedRows = await this.pressureRepository.accrueSources(playerId, gameMinute, accruals);
    const sourceBuildingIds = new Set(accruedRows.map((r) => r.buildingId));

    // ── Step 3: PROPAGATE (BFS upstream, combined across sources, shortest-hop-wins) ───────────────────
    let propagatedWrites: PropagatedWrite[] = [];
    if (accruedRows.length > 0) {
      const legEdges: LegEdge[] = await this.legRepository.listLegEdges(playerId);
      const decayPerHop = coreLoopsTunables.backpressurePropagationDecayPerHop;
      const maxHops = coreLoopsTunables.backpressureMaxPropagationHops;
      const floor = coreLoopsTunables.backpressureMinimumPressureFloor;

      const perSourceResults = accruedRows.map((source) =>
        bfsUpstreamFromSource(legEdges, source.buildingId, source.backpressureIndex, decayPerHop, maxHops),
      );
      const combined = combineBySource(perSourceResults);

      // A node that is ITSELF a blocked-output source this tick keeps its OWN step-1 value — it is NEVER
      // overwritten by a propagated one (design §6.2 — the BFS never revisits a source, but a DIFFERENT
      // source's own traversal could still reach it; this exclusion is the cross-source guarantee).
      for (const buildingId of sourceBuildingIds) combined.delete(buildingId);

      propagatedWrites = [...combined.values()].map((c) => ({
        buildingId: c.buildingId,
        // design §6.2 — "floor 0.05 si >0": the floor applies to any positive winning raw value.
        receivedIndex: c.receivedRaw > 0 ? Math.max(floor, c.receivedRaw) : 0,
        arrowToBuildingId: c.arrowToBuildingId,
        hops: c.hops,
      }));
    }
    await this.pressureRepository.applyPropagation(playerId, gameMinute, propagatedWrites);

    // ── Step 4: RELIEF (every other existing row — D8) ─────────────────────────────────────────────────
    const touchedBuildingIds = [...sourceBuildingIds, ...propagatedWrites.map((w) => w.buildingId)];
    await this.pressureRepository.applyRelief(
      playerId,
      gameMinute,
      coreLoopsTunables.backpressureReliefPerTick,
      touchedBuildingIds,
    );

    this.logger.log(
      `BACKPRESSURE_UPDATE: player=${playerId} gameMinute=${gameMinute} -> ${accruedRows.length} source(s) ` +
        `accrued, ${propagatedWrites.length} node(s) propagated.`,
    );

    // ── Step 5 (P3-C C6): CRITICAL-CROSSING EXCEPTION — design §6.2/§9 ─────────────────────────────────
    // Every building this tick's accrual OR propagation wrote to (relief only ever LOWERS the index, so
    // it can never newly enter `critical` — never checked here) whose resultant bucket is `critical` is
    // offered to `BackpressureExceptionProducer` — see that file's own header for the "fires every tick
    // still critical, dedup collapses it" convention. A `Set` dedupes a building appearing in BOTH lists
    // (cannot happen this tick — a source is excluded from `propagatedWrites`, see Step 3 — kept as a
    // defensive guard against exactly one call per building regardless).
    const mildThreshold = coreLoopsTunables.backpressureMildThreshold;
    const warmThreshold = coreLoopsTunables.backpressureWarmThreshold;
    const criticalThreshold = coreLoopsTunables.backpressureCriticalThreshold;

    const criticalBuildingIds = new Set<string>();
    for (const r of accruedRows) {
      if (backpressureBucket(r.backpressureIndex, mildThreshold, warmThreshold, criticalThreshold) === 'critical') {
        criticalBuildingIds.add(r.buildingId);
      }
    }
    for (const w of propagatedWrites) {
      if (backpressureBucket(w.receivedIndex, mildThreshold, warmThreshold, criticalThreshold) === 'critical') {
        criticalBuildingIds.add(w.buildingId);
      }
    }
    for (const buildingId of criticalBuildingIds) {
      const outcome = await this.criticalExceptionProducer.raiseIfClear(playerId, buildingId);
      this.logger.log(
        `BACKPRESSURE_UPDATE: player=${playerId} building=${buildingId} critical -> exception ${outcome}.`,
      );
    }

    return { sourcesAccrued: accruedRows.length, nodesPropagated: propagatedWrites.length };
  }
}

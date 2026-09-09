// IMPLEMENTS: docs/tech/04_city_simulation/system_10_buffer_bloat.md
//             §Invariants canoniques (Inv 1 buffer = cash queue between stages, inflow − drain, overflow caps hard +
//                                     drops cash; Inv 2 tail event magnitude ∝ occupancy — the cash IN the buffer IS
//                                     the exposure, the central lesson; Inv 3 deceptive average stable while the
//                                     queue silently grows — surface the BUCKET; Inv 4 tail-risk panel off by
//                                     default; Inv 5 BufferLoadBucket enum never raw occupancy; Inv 6
//                                     drain_rate_observed BO-only; Inv 7 TailPercentileState enum never raw p95)
//             §États NodeBuffer
//             §Update tick minute (Phase A inflow; Phase B drain; Phase C overflow detect + emit; Phase D
//                                  load_pct_bucket; Phase E hourly overflow-counter reset — reconciled below)
//             §Update tick hourly (tail-event recompute — reconciled: FOLDED into the minute tick; the percentile
//                                  BASELINE reset runs WEEKLY per the SCHEDULE — documented below)
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// `BufferBloatService` — System 10 (Buffer Bloat Laundering). The DUAL-cadence persisted-projection system: it
// advances the per-node buffer occupancy every in-game MINUTE (the finest cadence — Inv 1 inflow − drain, overflow
// detect, bucket + tail-p95 refresh) and resets the percentile BASELINE every in-game WEEK. It OWNS the migrated
// `tail_risk_estimates` table (lazy-creates one row per laundering_node on first tick; updates the floats every
// minute) and SYNCs `laundering_nodes.buffer_load` so System 8's dwell tick reflects the buffer fill. It copies the
// dwell-time / erlang-stash persisted-system template (repository + projection + controller + tunables) with the
// System-10-specific shape: TWO cadence slots (MINUTE/3 BUFFER_BLOAT — runs after System 8 Throughput Trilemma at
// MINUTE/2, before Heat at MINUTE/4; WEEKLY/2 BUFFER_BLOAT — runs after System 11 Deal Lek at WEEKLY/1).
//
// CADENCE RECONCILIATION (the spec's "hourly tail recompute" vs the SCHEDULE's MINUTE+WEEKLY slots): the spec
// (§Update tick) describes a MINUTE occupancy tick + an HOURLY tail-event recompute. But the canonical SCHEDULE
// (cross_system_interactions §Ordre DAG) gives System 10 ONLY a MINUTE slot (MINUTE/3) + a WEEKLY slot (WEEKLY/2) —
// there is no hourly band. So we RECONCILE: the tail_p95_estimate REFRESH (the spec's hourly Phase A/B) is FOLDED
// INTO THE MINUTE TICK (cheap — a fixed function of occupancy; recomputing it every minute is strictly fresher than
// hourly, never wrong), and the percentile BASELINE RESET (the longer-horizon recalibration the spec implies by
// recomputing the distribution periodically) runs on the WEEKLY slot. Documented so a reader does not look for an
// hourly handler that the SCHEDULE never gives this system.
//
// INFLOW FROM SYSTEM 8 (Inv 1 Phase A — read-only): the buffer inflow is the upstream node's throughput
// (throughput_in_per_hour, System 8's persisted column). System 10 READS it from the row (the repository's
// listNodes already selects it — a batched read, once before the loop; no per-node round-trip). inflow_minute =
// throughput_in_per_hour / 60. PHASE-1 REALITY: throughput_in_per_hour is P2-driven (the dirty-cash routing from
// deals) — empty in normal runs; the E2E seeds it to exercise the occupancy growth + overflow deterministically.
//
// OVERFLOW (Inv 1 Phase C): if new_occupancy > capacity → overflow_amount = new_occupancy − capacity; cap hard
// (occupancy = capacity); emit BufferOverflowEvent (HeatPropagationService consumes it — heat injection; emit-only
// day-1). The excess cash is dropped on the street (the immediate loss). The CRITICAL bucket (Inv 5) marks the
// overflowing node for the whole tick.
//
// TAIL ∝ OCCUPANCY (Inv 2 — the central lesson): the raid seizure magnitude scales with current_occupancy (the cash
// IN the buffer IS the exposure). tail_p95_estimate = (occupancy / capacity) × tailPercentileFactor, clamped to
// [0,1] (the DB CHECK tre_tail_p95_chk). So a fuller buffer → a higher tail_p95 → a higher TailPercentileState band
// (Inv 7) — the E2E asserts this monotonicity. The percentile FACTOR is DERIVED from tail_event_percentile (the
// registry tunable — see buffer-bloat-tunables.ts; 95th → ~1.8×), no invented standalone tunable.
//
// IN-MEMORY STATE KEYED BY PLAYERID (the T10 review lesson — NOT entity-keyed): the per-player working state (the
// overflow-this-week flags + the percentile baseline) is keyed BY playerId and REBUILT/REPLACED per tick (a fresh
// Map<nodeId, …> rebuilt each minute tick from the current node set), so a removed node leaves NO stale entry — the
// entire per-player entry is replaced each tick, and a player whose nodes all vanished gets an empty inner map.
// Entity-keyed top-level maps (keyed by node_id) were flagged in the T10 review for leaking stale entries on node
// removal; keying by playerId + rebuilding the inner per-node map each tick avoids that entirely.
//
// DETERMINISM (NO RNG): the occupancy advance (inflow − drain, cap), the overflow detect, the bucket map, and the
// tail_p95 recompute are FIXED functions of the persisted floats + tunables. Two players with identical seeded
// nodes + identical advances land on identical persisted floats + bands (the E2E determinism assertion).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks as blocksTable } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import { CityEventBus, type BufferLoadBucket, type TailPercentileState } from '../events/city-event-bus';
import { bufferBloatTunables, tailPercentileFactor } from './buffer-bloat-tunables';
import {
  BufferBloatRepository,
  type NodeBufferState,
  type EstimateMutation,
  type BufferLoadMutation,
} from './buffer-bloat.repository';

/**
 * The per-player in-memory buffer working state (system_10 §États — the parts NOT persisted). Keyed BY PLAYERID at
 * the top level (the T10 lesson — never entity-keyed); the inner per-node map is REBUILT/REPLACED every minute tick
 * from the current node set, so a removed node leaves no stale entry. Holds the per-node overflow-this-WEEK flag
 * (Inv 5 — CRITICAL on overflow this period; reset on the WEEKLY baseline tick — the reconciled "hourly counter")
 * and the per-node percentile baseline (recalibrated WEEKLY).
 */
interface PlayerBufferState {
  /** Per-node "did this node overflow since the last weekly baseline reset?" — forces CRITICAL bucket (Inv 5). */
  overflowedThisPeriod: Map<string, boolean>;
  /** Per-node percentile baseline (the WEEKLY-reset recalibration anchor — the reconciled "percentile reset"). */
  percentileBaseline: Map<string, number>;
}

@Injectable()
export class BufferBloatService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BufferBloatService.name);

  /**
   * Per-player in-memory buffer working state, keyed by playerId (the T10 lesson — NOT keyed by node_id at the top
   * level). The inner per-node maps are rebuilt/replaced per tick. Server-truth working state (rebuilt empty on
   * restart — the dwell-time aggregate / erlang-stash blocking precedent; the PERSISTED truth is tail_risk_estimates).
   */
  private readonly players = new Map<string, PlayerBufferState>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: BufferBloatRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Register the TWO cadence slots System 10 occupies (the registry contract — System 10 has TWO slots per the
   * SCHEDULE): MINUTE/3 (BUFFER_BLOAT — the occupancy tick, after System 8 at MINUTE/2, before Heat at MINUTE/4) and
   * WEEKLY/2 (BUFFER_BLOAT — the percentile baseline reset, after System 11 Deal Lek at WEEKLY/1). Each registration
   * REPLACES the no-op placeholder the SCHEDULE seeded for that exact slot.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.BUFFER_BLOAT,
      cadence: Cadence.MINUTE,
      order: 3,
      run: (ctx) => this.runMinuteTick(ctx),
    });
    this.scheduler.registerSystem({
      id: CitySystemId.BUFFER_BLOAT,
      cadence: Cadence.WEEKLY,
      order: 2,
      run: (ctx) => this.runWeeklyTick(ctx),
    });
  }

  /** F4 RAM budget log (system_10 §RAM budget): NodeBuffer × ≤10 nodes × N players ≈ 320 KB (N=1000). */
  private logRamBudget(): void {
    this.logger.log(
      `Buffer Bloat per-player RAM budget ≈ 320 B (NodeBuffer state PERSISTED on tail_risk_estimates, ~32 B × ≤10 ` +
        `nodes; overflow-this-period + percentile-baseline DERIVED in-memory per player). MINUTE/3 tick (occupancy ` +
        `inflow − drain, overflow detect + BufferOverflowEvent, BufferLoadBucket, tail_p95 refresh) + WEEKLY/2 ` +
        `(percentile baseline reset). Inv 2: tail magnitude ∝ occupancy (the cash IN the buffer IS the exposure). ` +
        `OWNS tail_risk_estimates (lazy-create per node); SYNCs laundering_nodes.buffer_load (System 8 reads it). ` +
        `Inflow = System 8 throughput_in_per_hour (read-only; P2-driven — empty Phase 1). Emits BufferOverflow ` +
        `(emit-only day-1 — Heat consumer wires T13/P2). Hourly tail recompute reconciled → folded into MINUTE tick.`,
    );
  }

  // ───────────────────────────── the registered MINUTE tick ─────────────────────────────

  /**
   * {MINUTE, order 3} — the buffer occupancy per-minute tick (system_10 §Update tick minute Phases A–D + the folded
   * tail recompute). Lazy-creates any missing tail_risk_estimate rows (System 10 OWNS the table), then for each node:
   * advance occupancy (inflow from System 8's throughput − drain; Phase A/B), detect overflow + emit + cap hard
   * (Phase C), refresh tail_p95 (∝ occupancy — Inv 2; folded from the spec's hourly recompute), and derive the
   * BufferLoadBucket (Phase D). Persists the recomputed estimates in ONE batched UPDATE + syncs buffer_load in a
   * second batched UPDATE (System 8 reads it). Rebuilds the per-player in-memory state fresh (the T10 lesson — no
   * stale entries). Deterministic (NO RNG). Organically a no-op (laundering_nodes empty Phase 1).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    // Ensure every node owns a tail_risk_estimate row (race-safe lazy-create; System 10 OWNS the table). Cheap
    // NOT-EXISTS guard — a no-op once every node has one.
    await this.repo.lazyCreateEstimates(
      ctx.playerId,
      bufferBloatTunables.bufferCapacityPerNode,
      bufferBloatTunables.drainRateToNextStagePerHr,
    );

    const nodes = await this.repo.listNodes(ctx.playerId);
    if (nodes.length === 0) {
      // Organic Phase-1 reality: no nodes → drop any stale per-player working state (the T10 lesson — replace, not leak).
      this.players.set(ctx.playerId, {
        overflowedThisPeriod: new Map(),
        percentileBaseline: new Map(),
      });
      return;
    }

    // TD-013 (lot-5): buffer_node_count BOUND — when the player's node count EXCEEDS the registry bound, each
    // node's effective inflow is penalised by factor = bound / node_count (proportional congestion: an oversized
    // network silently degrades per-node throughput — the "bloat penalises throughput" promise in
    // schedule/phase-01-city-sim.md:91). At or under the bound → factor = 1.0 (no penalty). This is a FIXED
    // deterministic function of the node count + the registry tunable; NO inline literal for the bound.
    const nodeCountBound = bufferBloatTunables.bufferNodeCount;
    const throughputPenaltyFactor = nodes.length > nodeCountBound ? nodeCountBound / nodes.length : 1.0;

    const prior = this.players.get(ctx.playerId);
    // REBUILD the inner per-node maps fresh from the current node set (the T10 lesson — a removed node leaves no
    // stale entry because we only carry forward keys that still exist in `nodes`).
    const overflowedThisPeriod = new Map<string, boolean>();
    const percentileBaseline = new Map<string, number>();

    const estimates: EstimateMutation[] = [];
    const bufferLoads: BufferLoadMutation[] = [];

    for (const n of nodes) {
      // The estimate row exists now (lazyCreateEstimates ran above); fall back to the tunable defaults defensively.
      const capacity = n.capacity ?? bufferBloatTunables.bufferCapacityPerNode;
      const drainRate = n.drain_rate ?? bufferBloatTunables.drainRateToNextStagePerHr;
      const occupancy0 = n.current_occupancy ?? 0;

      // ── Phase A — INFLOW from System 8 (read-only throughput_in_per_hour; per-minute share). ──
      // Apply the TD-013 buffer_node_count throughput penalty: if node count > bound, each node's effective
      // inflow is scaled by (bound / node_count) — a proportional congestion penalty. throughputPenaltyFactor
      // is 1.0 at or under the bound (no penalty). Factor is derived from bufferBloatTunables.bufferNodeCount
      // (NO inline literal).
      const inflowMinute = Math.max(0, n.throughput_in_per_hour) * throughputPenaltyFactor / 60;
      // ── Phase B — DRAIN toward the downstream node (nominal; can't drain more than is present). ──
      let occupancy = occupancy0 + inflowMinute;
      const drainMinute = Math.max(0, drainRate) / 60;
      const drainActual = Math.min(drainMinute, occupancy);
      occupancy -= drainActual;

      // ── Phase C — OVERFLOW detect: cap hard, drop the excess, emit BufferOverflowEvent (Inv 1). ──
      let overflowed = prior?.overflowedThisPeriod.get(n.node_id) ?? false; // sticky until the WEEKLY reset.
      if (capacity > 0 && occupancy > capacity) {
        occupancy = capacity; // cap hard — the excess cash is dropped on the street (the immediate loss).
        overflowed = true;
        this.bus.emitBufferOverflow({
          type: 'buffer_overflow',
          playerId: ctx.playerId,
          districtId: n.district_id,
          buildingId: n.building_id,
          nodeId: n.node_id,
          loadBucket: 'CRITICAL', // overflow always → CRITICAL (Inv 5 — never the raw occupancy/cash float).
          gameMinute: ctx.gameMinute,
        });
      }
      if (occupancy < 0) occupancy = 0; // defensive (the DB CHECK tre_current_occupancy_chk: >= 0).

      // ── tail_p95 refresh (∝ occupancy — Inv 2; folded from the spec's hourly recompute). ──
      const tailP95 = this.tailP95Estimate(occupancy, capacity);

      estimates.push({
        node_id: n.node_id,
        capacity,
        drain_rate: drainRate,
        current_occupancy: occupancy,
        tail_p95_estimate: tailP95,
      });

      // ── buffer_load SYNC (System 10 is the WRITER; System 8 reads it — T9). clamp(occupancy/capacity, 0, 1). ──
      bufferLoads.push({ node_id: n.node_id, buffer_load: this.bufferLoadRatio(occupancy, capacity) });

      // Carry the per-node working state forward (rebuilt fresh — only keys for nodes that still exist).
      overflowedThisPeriod.set(n.node_id, overflowed);
      percentileBaseline.set(n.node_id, prior?.percentileBaseline.get(n.node_id) ?? tailP95);
    }

    // Persist the WHOLE recomputed batch (estimates) + the buffer_load sync, each in ONE atomic UPDATE.
    await this.repo.applyEstimates(ctx.playerId, estimates);
    await this.repo.syncBufferLoad(ctx.playerId, bufferLoads);

    // REPLACE the per-player entry (never mutate-in-place — the T10 lesson; the inner maps are freshly rebuilt).
    this.players.set(ctx.playerId, { overflowedThisPeriod, percentileBaseline });
  }

  // ───────────────────────────── the registered WEEKLY tick ─────────────────────────────

  /**
   * {WEEKLY, order 2} — the percentile BASELINE reset (the reconciled "percentile baseline reset" — the longer-horizon
   * recalibration the SCHEDULE assigns to the weekly band). Resets the per-node overflow-this-period flag (so the
   * CRITICAL-on-overflow marker is a per-WEEK pressure indicator, not permanent) and re-anchors each node's percentile
   * baseline to its current tail_p95_estimate (the fresh distribution anchor). Reads the player's nodes to rebuild the
   * per-node maps fresh (the T10 lesson — no stale entries for removed nodes). Deterministic; organically a no-op.
   */
  private async runWeeklyTick(ctx: CitySimTickContext): Promise<void> {
    const nodes = await this.repo.listNodes(ctx.playerId);
    if (nodes.length === 0) {
      this.players.set(ctx.playerId, { overflowedThisPeriod: new Map(), percentileBaseline: new Map() });
      return;
    }
    // Rebuild the per-node maps fresh: clear the overflow flags (the weekly reset) + re-anchor the baseline to the
    // current tail_p95 (the fresh distribution anchor). Only keys for nodes that still exist (no stale entries).
    const overflowedThisPeriod = new Map<string, boolean>();
    const percentileBaseline = new Map<string, number>();
    for (const n of nodes) {
      const capacity = n.capacity ?? bufferBloatTunables.bufferCapacityPerNode;
      const occupancy = n.current_occupancy ?? 0;
      overflowedThisPeriod.set(n.node_id, false); // reset the per-period overflow marker.
      percentileBaseline.set(n.node_id, this.tailP95Estimate(occupancy, capacity)); // re-anchor the baseline.
    }
    this.players.set(ctx.playerId, { overflowedThisPeriod, percentileBaseline });
  }

  // ───────────────────────────── buffer math (deterministic, INTERNAL) ─────────────────────────────

  /**
   * The buffer-load RATIO = clamp(current_occupancy / capacity, 0, 1) (the value SYNCed to laundering_nodes.buffer_load
   * for System 8 — Inv 5 / the buffer_load DB CHECK [0,1]). A degenerate capacity (<= 0) → 0 (no buffer = no load).
   * INTERNAL — the raw ratio is never exposed (R2.2; the player sees the BufferLoadBucket).
   */
  bufferLoadRatio(currentOccupancy: number, capacity: number): number {
    if (!(capacity > 0)) return 0;
    const r = currentOccupancy / capacity;
    if (r <= 0) return 0;
    return r >= 1 ? 1 : r;
  }

  /**
   * tail_p95_estimate ∈ [0,1] (Inv 2 — tail magnitude ∝ occupancy; the cash IN the buffer IS the exposure). The P95
   * seizure-size estimate as a fraction of the buffer: (occupancy / capacity) × tailPercentileFactor (the factor
   * DERIVED from tail_event_percentile — 95th → ~1.8×), clamped to [0,1] (the DB CHECK tre_tail_p95_chk). A fuller
   * buffer → a higher tail_p95 → a higher TailPercentileState band (Inv 7 — the E2E monotonicity). INTERNAL — the raw
   * float is never exposed (R2.2; only the TailPercentileState band).
   */
  tailP95Estimate(currentOccupancy: number, capacity: number): number {
    const fillRatio = this.bufferLoadRatio(currentOccupancy, capacity);
    const factor = tailPercentileFactor(bufferBloatTunables.tailEventPercentile);
    const p95 = fillRatio * factor;
    if (p95 <= 0) return 0;
    return p95 >= 1 ? 1 : p95;
  }

  /**
   * Map a node's occupancy/capacity + its overflow-this-period flag → the closed BufferLoadBucket (Inv 5 — the raw
   * occupancy float never escapes; R2.2). §États thresholds on load_pct = occupancy / capacity: EMPTY < 5%; LOW
   * 5–30%; NOMINAL 30–70%; HIGH 70–90%; CRITICAL >= 90% OR overflowed this period (the next raid = a massive
   * seizure). overflow always wins the bucket (the saturated buffer is the most exposed state).
   */
  loadBucket(currentOccupancy: number, capacity: number, overflowedThisPeriod: boolean): BufferLoadBucket {
    if (overflowedThisPeriod) return 'CRITICAL';
    const loadPct = this.bufferLoadRatio(currentOccupancy, capacity);
    if (loadPct >= 0.9) return 'CRITICAL';
    if (loadPct >= 0.7) return 'HIGH';
    if (loadPct >= 0.3) return 'NOMINAL';
    if (loadPct >= 0.05) return 'LOW';
    return 'EMPTY';
  }

  /**
   * Map a raw tail_p95_estimate ∈ [0,1] → the closed TailPercentileState band (Inv 7 — the raw float never escapes;
   * R2.2). §États thresholds: LOW < 0.10; MODERATE 0.10–0.30; HIGH 0.30–0.60; CRITICAL > 0.60 (a single raid can
   * devastate the current period — unlocks the tail-risk panel). A higher occupancy → a higher tail_p95 → a higher
   * band (Inv 2 — the E2E asserts this monotonicity).
   */
  tailPercentileState(tailP95Estimate: number): TailPercentileState {
    if (tailP95Estimate > 0.6) return 'CRITICAL';
    if (tailP95Estimate >= 0.3) return 'HIGH';
    if (tailP95Estimate >= 0.1) return 'MODERATE';
    return 'LOW';
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * The laundering-node buffers for ONE district (the projection read). Returns the raw node buffer rows (occupancy
   * / capacity / tail_p95 floats); the projection derives the BufferLoadBucket / TailPercentileState from them +
   * the in-memory overflow flag, never forwarding the raw floats (R2.2). Empty for a district with no nodes (the
   * organic Phase-1 shape — the laundering_nodes table is empty).
   */
  async listNodesForDistrict(playerId: string, districtId: number): Promise<NodeBufferState[]> {
    return this.repo.listNodesForDistrict(playerId, districtId);
  }

  /** Whether a node overflowed since the last weekly baseline reset (the projection's CRITICAL-bucket input; Inv 5). */
  overflowedThisPeriodFor(playerId: string, nodeId: string): boolean {
    return this.players.get(playerId)?.overflowedThisPeriod.get(nodeId) ?? false;
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 422). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= bufferBloatTunables.districtCount;
  }

  /** Whether a district id exists in the seeded geography (a real district — the controller's existence guard). */
  async districtExists(districtId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: blocksTable.district_id })
      .from(blocksTable)
      .where(eq(blocksTable.district_id, districtId))
      .limit(1);
    return rows.length > 0;
  }
}

// IMPLEMENTS: docs/tech/04_city_simulation/system_8_dwell_time_tax.md
//             §Invariants canoniques (Inv 1 Little's Law HARD inventory_at_risk = throughput × dwell — never
//                                     decoupled; Inv 2 pick-2 trilemma; Inv 3 tick EVERY MINUTE — the finest
//                                     city-sim cadence; Inv 4 inventory_at_risk_global = per-network sum;
//                                     Inv 5 ThroughputBucket enum never raw float; Inv 6 cleanliness_at_output
//                                     ∈ [0,1] money cleanliness; Inv 7 no free lunch — overflow = raw cash)
//             §États LaunderingNode + PipelineNetwork
//             §Update tick EVERY MINUTE (Phase A throughput/dwell recompute; Phase B overflow detect; Phase C
//                                        risk_signature; Phase D network aggregate; Phase E snapshot emit)
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// `DwellTimeService` — System 8 (Dwell-Time Tax / Throughput Trilemma). The PERSISTED-projection PER-MINUTE
// system: it recomputes the per-node Little's-Law floats every in-game minute (the FINEST cadence of all city-sim
// systems — Inv 3) and persists them back to the migrated `laundering_nodes` table, holding a per-player network
// aggregate in memory. It copies the Unconformity/Cohesion persisted-system template (repository + projection +
// controller + tunables) with the System-8-specific shape: a SINGLE MINUTE cadence pass (registered at MINUTE/2 =
// THROUGHPUT_TRILEMMA slot — runs after System 9 Erlang Stash at MINUTE/1, before System 10 / Heat) over the
// player's laundering nodes.
//
// LITTLE'S LAW (Inv 1 — HARD, NON-NEGOTIABLE): inventory_at_risk = throughput_in_per_hour × dwell_time_hours. The
// three terms are NEVER decoupled. The per-node recompute (§Update tick Phase A step 3):
//   dwell_time_hours = buffer_load / throughput_in_per_hour       (if throughput > 0)
//   dwell_time_hours = dwell_time_per_node_hr                     (if throughput == 0 — node IDLE, §dwell guard)
// So by substitution inventory_at_risk(node) = throughput × dwell = buffer_load (when active) — the identity holds
// exactly; the engine never computes inventory_at_risk by a different path that could drift from throughput×dwell.
//
// BUFFER_LOAD UNIT RECONCILIATION (the schema-vs-spec mismatch the task flags — R9.3 = source of truth, ENFORCED
// BY A DB CHECK): the spec struct compares `overflow_active = buffer_load > inventory_cap_per_node` ($5000), but
// the migrated `laundering_nodes.buffer_load` carries a DB CHECK `ln_buffer_load_chk: buffer_load BETWEEN 0 AND 1`
// (migration 0006 — verified live via pg_get_constraintdef). The DB physically REJECTS buffer_load > 1. So we
// FOLLOW THE SCHEMA: buffer_load is a NORMALIZED load RATIO in [0..1] where 1.0 = the node is AT its
// inventory_cap_per_node ($5000). inventory_cap_per_node is the DOCUMENTED NORMALIZING FACTOR (ratio =
// buffered_cash / inventory_cap_per_node); overflow_active fires when the RATIO reaches the cap (buffer_load >= 1.0),
// never by comparing the ratio against the dollar figure directly. This reconciles the spec's overflow comparison
// to the schema's enforced unit WITHOUT any schema change. The dollar cash magnitude (buffer_load ×
// inventory_cap_per_node) is what risk_factor_normalize then scales toward inventory_at_risk.
//
// CLEANLINESS (Inv 6, §Update tick Phase A step 5): cleanliness_at_output = min(1.0, dwell_time_hours /
// dwell_time_per_node_hr) — the longer cash dwells, the more "laundered" it is, saturating at 1.0 once dwell
// reaches dwell_time_per_node_hr. Clamped to [0,1] (the DB CHECK ln_cleanliness_chk). The raw float is NEVER
// exposed — only the CleanlinessBucket (R2.2).
//
// THROUGHPUT BUCKET (Inv 5, §enum) relative to throughput_per_shop_per_hr: UNDER < 50%; NOMINAL 50–100%; OVER
// 100–150%; OVERFLOW > 150% OF the nominal OR an overflowing buffer (buffer_load ratio >= 1) — overflow always
// wins the bucket (Inv 7 — the saturated node is the most exposed state). The raw throughput float is NEVER
// exposed — only the bucket (R2.2).
//
// IN-MEMORY NETWORK AGGREGATE (system_8 §États PipelineNetwork, §Update tick Phase D): per-player, lazily
// allocated, keyed by playerId. Holds inventory_at_risk_global (sum of buffer_load × (1 - cleanliness) × cash
// magnitude × risk_factor_normalize over active nodes — Inv 4 per-network), the throughput-weighted
// network_cleanliness, and overflow_nodes_count. These are the network scalars the projection maps to qualitative
// bands (NEVER exposed raw — the player never sees inventory_at_risk_global). ~16 B core + N × ~40 B per node
// (the spec's ~1.2 KB / 30-node budget). The aggregate is server-truth working state (rebuilt empty on restart —
// the same in-memory tradeoff as the unconformity ledger / cohesion thaw caches; the PERSISTED truth is the
// laundering_nodes floats).
//
// CROSS-SYSTEM (honest deferral — like unconformity):
//   - SYSTEM 7 (Unconformity Ledgers) throughput-baseline constraint (§Cross-cutting: "throughput a building can
//     absorb is capped by its legitimate baseline"): System 7 is BUILT, but its baseline/deviation is computed on
//     PROMOTED buildings carrying a transaction_profile (a P2 input — empty Phase 1), and the throughput INFLOW
//     that the cap would bite is itself P2 (the dirty-cash routing from deals). With no Phase-1 throughput
//     producer, the cap has nothing to clamp organically (both the baseline source AND the throughput it caps are
//     P2). So the constraint is DEFERRED with this documented note (the spec calls it "a secondary refinement");
//     wiring it now would couple System 8 to an empty System-7 building set against a throughput it does not yet
//     produce — an inert coupling (the System 6 → System 7 mismatch_score precedent). It lands when P2 routes
//     dirty-cash inflow + populates promoted buildings.
//   - SYSTEM 9 (Erlang Stash) safehouse blocking curve: System 9 is NOT built Phase 1 (T10). The safehouse-node
//     throughput cap is DEFERRED to when System 9 lands; System 8 runs the trilemma on the nodes it has.
//   - DOWNSTREAM (System 3/4/6 consume inventory_at_risk → seizure size / patrol focus): inventory_at_risk_global
//     IS computed + exposed via getInventoryAtRisk (the read accessor) + the PipelineMinuteSnapshotEvent; the
//     consumers wire later (P2 — no Phase-1 raid/seizure path drives the magnitudes). The seam is real + tested.
//
// DETERMINISM (NO RNG): the per-node recompute (dwell = buffer/throughput; cleanliness = min(1, dwell/ref); bucket
// map; overflow detect; aggregate) is a FIXED function of the persisted throughput/buffer floats. Two players with
// identical seeded nodes + identical advances land on identical persisted floats (the E2E determinism assertion).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks as blocksTable } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import {
  CityEventBus,
  type ThroughputBucket,
  type CleanlinessBucket,
  type ExposureBand,
} from '../events/city-event-bus';
import { dwellTimeTunables } from './dwell-time-tunables';
import { DwellTimeRepository, type LaunderingNodeState, type NodeFloatMutation } from './dwell-time.repository';

/**
 * The in-memory per-player PipelineNetwork aggregate (system_8 §États PipelineNetwork, §Update tick Phase D). The
 * network scalars the projection maps to qualitative bands — NEVER exposed raw (the player never sees
 * inventory_at_risk_global). Lazily allocated per player; rebuilt empty on restart (server-truth working state).
 */
interface PipelineNetworkAggregate {
  /** inventory_at_risk_global (Inv 4) — sum over active nodes of buffer_load × (1-cleanliness) × cash × normalize. */
  inventoryAtRiskGlobal: number;
  /** overflow_nodes_count — how many nodes have an overflowing buffer (buffer_load ratio >= 1). */
  overflowNodesCount: number;
  /** network_cleanliness — throughput-weighted average cleanliness_at_output over nodes with throughput > 0 [0,1]. */
  networkCleanliness: number;
}

@Injectable()
export class DwellTimeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DwellTimeService.name);

  /**
   * Per-player in-memory PipelineNetwork aggregate (lazily allocated, keyed by playerId). The network-level
   * scalars (inventory_at_risk_global, network_cleanliness, overflow count) the projection bands derive from.
   * ~16 B core/player (the spec's PipelineNetwork core budget); per-node state lives in the persisted rows.
   */
  private readonly networks = new Map<string, PipelineNetworkAggregate>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: DwellTimeRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Register the single MINUTE cadence slot System 8 occupies (one CitySimSystem — the registry contract).
   * MINUTE/2 (throughput trilemma) replaces the no-op placeholder the SCHEDULE seeded for THROUGHPUT_TRILEMMA; it
   * runs AFTER System 9 Erlang Stash (MINUTE/1) and before System 10 / Heat per the canonical DAG (System 9 →
   * System 8 → System 10 → Heat).
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.THROUGHPUT_TRILEMMA,
      cadence: Cadence.MINUTE,
      order: 2,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  /** F4 RAM budget log (system_8 §RAM budget): ~16 B PipelineNetwork core + N × ~40 B LaunderingNode ≈ 1.2 KB/30 nodes. */
  private logRamBudget(): void {
    this.logger.log(
      `Dwell-Time Tax per-player RAM budget ≈ 1.2 KB (PipelineNetwork core ~16 B in-memory + LaunderingNode floats ` +
        `PERSISTED on laundering_nodes, ~40 B × ≤30 nodes). MINUTE/2 tick (Inv 3 — the finest city-sim cadence). ` +
        `Little's Law HARD: inventory_at_risk = throughput × dwell (Inv 1). buffer_load is a normalized [0..1] ratio ` +
        `(DB CHECK ln_buffer_load_chk); overflow at ratio >= 1 (= inventory_cap_per_node). Emits ` +
        `PipelineMinuteSnapshot (emit-only day-1). Throughput INFLOW (λ from deals) + the pipeline-BUILD flow + the ` +
        `System 7 baseline cap + the System 9 safehouse cap DEFERRED Phase 1 (the cross-system inflow-gating ` +
        `consumer is unbuilt — independent of \`safehouses\` now having an application writer, LOT PLANQUE).`,
    );
  }

  // ───────────────────────────── the registered MINUTE tick ─────────────────────────────

  /**
   * {MINUTE, order 2} — the dwell-time per-minute tick (system_8 §Update tick Phases A–E). For each of the
   * player's laundering nodes: recompute dwell_time_hours via Little's Law (Phase A), recompute cleanliness_at_output
   * (Inv 6), detect overflow (Phase B), compute the per-node risk contribution + the network aggregate (Phase C/D),
   * persist the recomputed floats in ONE batched UPDATE, refresh the in-memory PipelineNetwork aggregate, and emit
   * the network snapshot (Phase E). Deterministic (NO RNG — every value is a fixed function of throughput/buffer).
   * Organically a no-op (laundering_nodes empty Phase 1 — the table has no Phase-1 producer).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const nodes = await this.repo.listNodes(ctx.playerId);
    if (nodes.length === 0) {
      // Organic Phase-1 reality: no laundering nodes → reset the aggregate to empty + nothing to persist.
      this.networks.set(ctx.playerId, { inventoryAtRiskGlobal: 0, overflowNodesCount: 0, networkCleanliness: 1 });
      return;
    }

    const mutations: NodeFloatMutation[] = [];
    let inventoryAtRiskGlobal = 0;
    let overflowNodesCount = 0;
    // Throughput-weighted cleanliness accumulators (network_cleanliness = Σ(clean×tp) / Σ(tp) over active nodes).
    let weightedCleanlinessSum = 0;
    let throughputWeightSum = 0;

    for (const n of nodes) {
      // ── Phase A — LITTLE'S LAW recompute (Inv 1 — dwell = buffer_load / throughput; idle default guard). ──
      const dwell = this.dwellTimeHours(n.buffer_load, n.throughput_in_per_hour);

      // ── Phase A step 5 — CLEANLINESS (Inv 6 — saturates at 1.0 once dwell reaches dwell_time_per_node_hr). ──
      const cleanliness = this.cleanlinessAtOutput(dwell);

      mutations.push({
        node_id: n.node_id,
        dwell_time_hours: dwell,
        cleanliness_at_output: cleanliness,
        throughput_in_per_hour: n.throughput_in_per_hour, // passthrough — inflow source is P2 (see repository header).
      });

      // ── Phase B — OVERFLOW detect (reconciled: buffer_load ratio >= 1 = AT inventory_cap_per_node). ──
      if (this.overflowActive(n.buffer_load)) overflowNodesCount += 1;

      // ── Phase C/D — per-node risk contribution → inventory_at_risk_global (Inv 4 per-network sum). ──
      // risk = dirty cash still at risk = buffer_load × (1 - cleanliness) × cash-magnitude × risk_factor_normalize.
      // The cash magnitude = buffer_load × inventory_cap_per_node ($ buffered); the normalize scales it toward the
      // inventory_at_risk metric the downstream consumers read. Only the qualitative exposure band ever escapes.
      const cashMagnitude = n.buffer_load * dwellTimeTunables.inventoryCapPerNode;
      inventoryAtRiskGlobal += cashMagnitude * (1 - cleanliness) * dwellTimeTunables.riskFactorNormalize;

      if (n.throughput_in_per_hour > 0) {
        weightedCleanlinessSum += cleanliness * n.throughput_in_per_hour;
        throughputWeightSum += n.throughput_in_per_hour;
      }
    }

    // Persist the WHOLE recomputed batch in ONE atomic UPDATE (never a per-row loop).
    await this.repo.applyNodeFloats(ctx.playerId, mutations);

    // ── Phase D — refresh the in-memory PipelineNetwork aggregate (network_cleanliness throughput-weighted). ──
    const networkCleanliness = throughputWeightSum > 0 ? weightedCleanlinessSum / throughputWeightSum : 1;
    this.networks.set(ctx.playerId, { inventoryAtRiskGlobal, overflowNodesCount, networkCleanliness });

    // ── Phase E — emit the network snapshot (qualitative bands only — emit-only day-1, BO consumer wires later). ──
    this.bus.emitPipelineMinuteSnapshot({
      type: 'pipeline_minute_snapshot',
      playerId: ctx.playerId,
      networkCleanliness: this.cleanlinessBucket(networkCleanliness),
      exposureBand: this.exposureBand(inventoryAtRiskGlobal),
      overflowNodesCount,
      gameMinute: ctx.gameMinute,
    });
  }

  // ───────────────────────────── Little's-Law math (deterministic, INTERNAL) ─────────────────────────────

  /**
   * dwell_time_hours = buffer_load / throughput_in_per_hour (Inv 1 / §Update tick Phase A step 3). A throughput of
   * 0 → the node is IDLE → dwell defaults to dwell_time_per_node_hr (§dwell guard — the cash sits at rest). Clamped
   * to >= 0 (the DB CHECK ln_dwell_time_chk). INTERNAL — the raw float is never exposed (R2.2; the player sees the
   * qualitative dwell, not the hours).
   */
  dwellTimeHours(bufferLoad: number, throughputInPerHour: number): number {
    if (!(throughputInPerHour > 0)) return dwellTimeTunables.dwellTimePerNodeHr; // idle node → reference dwell.
    const dwell = bufferLoad / throughputInPerHour;
    return dwell >= 0 ? dwell : 0;
  }

  /**
   * cleanliness_at_output = min(1.0, dwell_time_hours / dwell_time_per_node_hr) (Inv 6 / §Update tick Phase A step
   * 5). Saturates at 1.0 once dwell reaches dwell_time_per_node_hr (fully laundered). Clamped to [0,1] (the DB
   * CHECK ln_cleanliness_chk). INTERNAL — the raw [0,1] float is never exposed (R2.2; only the CleanlinessBucket).
   */
  cleanlinessAtOutput(dwellTimeHours: number): number {
    const ref = dwellTimeTunables.dwellTimePerNodeHr;
    if (!(ref > 0)) return 1; // degenerate ref → treat as fully laundered (defensive; the registry default is 24).
    const c = dwellTimeHours / ref;
    if (c <= 0) return 0;
    return c >= 1 ? 1 : c;
  }

  /**
   * overflow_active — the reconciled overflow test (the buffer_load schema-unit reconciliation, see the header):
   * buffer_load is a normalized [0..1] ratio; the node is overflowing when the ratio reaches its cap
   * (buffer_load >= 1.0 = AT inventory_cap_per_node). Inv 7 — the saturated node is the most exposed (raw cash).
   */
  overflowActive(bufferLoad: number): boolean {
    return bufferLoad >= 1.0;
  }

  /**
   * Map a node's raw throughput float + overflow state → its closed ThroughputBucket (Inv 5 — the raw float never
   * escapes; R2.2). Thresholds relative to throughput_per_shop_per_hr (§enum L80-83): UNDER < 50%; NOMINAL 50–100%
   * (inclusive of 100% — the spec's "50–100%" band edge); OVER 100–150% (above 100%); OVERFLOW > 150%. An
   * OVERFLOWING buffer (ratio >= 1) ALWAYS wins the bucket (Inv 7 — the saturated node is the most exposed state,
   * regardless of throughput). The 100% boundary is NOMINAL (the spec lists NOMINAL as "50–100%" inclusive — a
   * node at exactly the nominal throughput is the balanced triangle, not yet under pressure).
   */
  throughputBucket(throughputInPerHour: number, bufferLoad: number): ThroughputBucket {
    if (this.overflowActive(bufferLoad)) return 'OVERFLOW';
    const nominal = dwellTimeTunables.throughputPerShopPerHr;
    if (!(nominal > 0)) return 'NOMINAL'; // degenerate config — defensive.
    const ratio = throughputInPerHour / nominal;
    if (ratio > 1.5) return 'OVERFLOW';
    if (ratio > 1.0) return 'OVER';
    if (ratio >= 0.5) return 'NOMINAL';
    return 'UNDER';
  }

  /**
   * Map a raw cleanliness_at_output ∈ [0,1] → its closed CleanlinessBucket (Inv 6 — the raw float never escapes;
   * R2.2). DIRTY < 0.25; PARTIAL 0.25–0.5; MOSTLY_CLEAN 0.5–0.85; CLEAN >= 0.85. Used per-node AND for the
   * throughput-weighted network_cleanliness band.
   */
  cleanlinessBucket(cleanliness: number): CleanlinessBucket {
    if (cleanliness >= 0.85) return 'CLEAN';
    if (cleanliness >= 0.5) return 'MOSTLY_CLEAN';
    if (cleanliness >= 0.25) return 'PARTIAL';
    return 'DIRTY';
  }

  /**
   * Map the network's raw inventory_at_risk_global scalar → a closed ExposureBand (Inv 4 — the player NEVER sees
   * inventory_at_risk_global; R2.2). The scalar is in normalized risk units (cash × risk_factor_normalize summed
   * over nodes). Bands: MINIMAL < 1; LOW 1–5; ELEVATED 5–20; CRITICAL >= 20. Derived from the spec's typical
   * risk_signature range (0–5000 raw → ×0.001 normalize → 0–5 per node; a few overflowing nodes push CRITICAL).
   */
  exposureBand(inventoryAtRiskGlobal: number): ExposureBand {
    if (inventoryAtRiskGlobal >= 20) return 'CRITICAL';
    if (inventoryAtRiskGlobal >= 5) return 'ELEVATED';
    if (inventoryAtRiskGlobal >= 1) return 'LOW';
    return 'MINIMAL';
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * The laundering nodes for ONE district (the projection read). Returns the raw node rows (throughput / dwell /
   * buffer / cleanliness floats); the projection derives the ThroughputBucket / CleanlinessBucket / overflow flag
   * from them, never forwarding the raw floats (R2.2). Empty for a district with no nodes (the organic Phase-1
   * shape — the laundering_nodes table is empty).
   */
  async listNodesForDistrict(playerId: string, districtId: number): Promise<LaunderingNodeState[]> {
    return this.repo.listNodesForDistrict(playerId, districtId);
  }

  /**
   * getInventoryAtRisk (the cross-system READ accessor — System 3/4/6 consume this for seizure size / patrol
   * focus, per system_8 §Player interaction surface + §Update tick Phase E). Returns the player's current
   * inventory_at_risk_global (the in-memory network aggregate's scalar). The DOWNSTREAM consumers wire later (P2 —
   * no Phase-1 raid/seizure path drives the magnitudes); the accessor is the synchronous read seam those consumers
   * use. Returns 0 for a player whose network has not been ticked yet. INTERNAL scalar — never surfaced to the
   * player (the projection maps it to the ExposureBand).
   */
  getInventoryAtRisk(playerId: string): number {
    return this.networks.get(playerId)?.inventoryAtRiskGlobal ?? 0;
  }

  /** The player's current qualitative network exposure band (the projection's district-level read). */
  exposureBandFor(playerId: string): ExposureBand {
    return this.exposureBand(this.getInventoryAtRisk(playerId));
  }

  /** The player's current qualitative network-cleanliness band (the projection's district-level read). */
  networkCleanlinessBandFor(playerId: string): CleanlinessBucket {
    return this.cleanlinessBucket(this.networks.get(playerId)?.networkCleanliness ?? 1);
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 400). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= dwellTimeTunables.districtCount;
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

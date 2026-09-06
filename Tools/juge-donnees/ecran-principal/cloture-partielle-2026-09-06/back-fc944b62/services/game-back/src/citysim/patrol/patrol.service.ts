// IMPLEMENTS: docs/tech/04_city_simulation/system_4_patrol_doctrine.md
//             §Invariants canoniques (Inv 1 per-precinct queue; Inv 2 deferred decision; Inv 3 stochastic
//                                     clustering; Inv 4 overflow low-severity-first; Inv 6 reads System 3 read-only)
//             §États ObservationQueue / Observation / RaidPlan / UndercoverDispatch
//             §Update tick (Tick 1 — 30-min accumulation; Tick 2 — 12h review: clustering + action selection +
//                           flush + aging decay)
//             + cross_system_interactions.md §Ordre DAG ([Every 30 minutes] System 4 → System 3 suspicion;
//               [Every 12 h] System 4 review → RaidPlanned/Undercover) + §Producteurs (System 4 owns
//               RaidPlannedEvent/UndercoverDispatchedEvent)
//             -- session:2026-06-02 (Phase 1 Task 5) --
//
// `PatrolDoctrineService` — System 4 (Delayed-Response Patrol Doctrine). The PERSISTED two-cadence system: it
// owns the per-player `patrol_observation_queues` (6 rows = bpd.precinct_count), one per-precinct ring buffer.
// It copies the PoliceMemory persisted-system template (repository + projection + controller + tunables) but
// with the System-4-specific shape: an event SUBSCRIBER (FlowCellCongested) that ACCUMULATES observable signals
// between 30-min boundaries, plus two cadence passes (30-min accumulation flush + 12h review).
//
// THE 2 TICKS (system_4 §Update tick):
//   - Tick 1 — OBSERVATION ACCUMULATION (THIRTY_MIN, every 30 in-game minutes): patrols generate Observation
//     entries from CURRENT city activity. The deterministic, spec-faithful observable source is FlowCell
//     BACKPRESSURE (system_4 §Update tick Tick 1 "patrol traverse une tile" + §Implications cross-ref
//     system_1 — congested/saturated blocks are patrol SIGHTINGS). System 4 SUBSCRIBES to FlowCellCongestedEvent
//     on the bus and ACCUMULATES the latest bucket per (player, block) between 30-min boundaries (mirrors the
//     Heat injection pattern: event-driven accumulation, cadenced flush — cross_system_interactions §On event
//     "L'injection est event-driven mais le flush est cadencé"). At the 30-min tick it drains the accumulator
//     into Observation entries, APPENDS them to the OWNING precinct's ring buffer (Inv 1 per-precinct, never
//     global), applies the overflow policy on a full ring (Inv 4 — drop lowest-severity first, then FIFO), and
//     EMITS a PatrolObservationEvent for each HIGH-severity observation (the System 3↔4 handoff — System 3
//     bumps its suspicion_map). Deterministic (the flow is a deterministic function of static geography).
//   - Tick 2 — PRECINCT REVIEW (TWELVE_H, every precinct_review_tick_hours=12h): for each precinct cluster the
//     active observations (phase A — spatial block-adjacency + severity-compatibility), select an action for
//     clusters of size >= cluster_correlation_threshold (phase B — deterministic SHA-gate weighted by
//     raid_prob_per_cluster / undercover_dispatch_prob; raid TARGET via softmax over System 3's getTopTargets),
//     emit RaidPlanned / UndercoverDispatched (System 4 is the CANONICAL owner — cross_system §Producteurs),
//     FLUSH the clustered entries (phase C), and AGE the orphan sub-threshold entries by
//     patrol.cluster_aging_decay_per_day (phase D — sub-0 severity entries drop). Deterministic (NO RNG).
//
// INV 6 — READS SYSTEM 3 READ-ONLY: the 12h review consumes PoliceMemoryService.getTopTargets(playerId,
// precinctId) to enrich the raid-target selection (softmax). PatrolDoctrineService LITS (reads) System 3's
// belief; it NEVER mutates precinct_memory. The post-raid memory update (stamping last_raid_at) is System 3's
// job — System 3 SUBSCRIBES to the RaidPlannedEvent this service emits (cross_system_interactions L92/134:
// System 3 consommateur de RaidPlannedEvent post-raid). So System 4 stays write-only on its OWN table.
//
// DETERMINISM (NO RNG — reproducible; the E2E asserts identical queue signatures for identically-advanced
// players): observations derive from the deterministic flow; the action gate is a deterministic hash of
// (player+precinct+gameMinute+clusterKey) vs the probability thresholds; the softmax raid-target selection is
// a deterministic argmax over the temperature-shaped weights (reusing System 3's getTopTargets ordering).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import {
  Cadence,
  CitySystemId,
  type CitySimSystem,
  type CitySimTickContext,
} from '../scheduler/city_sim_system';
import {
  BackpressureBucket,
  CityEventBus,
  type FlowCellCongestedEvent,
  type HeatEscalationEvent,
  type PatrolObservationSeverity,
} from '../events/city-event-bus';
import { PoliceMemoryService } from '../police_memory/police_memory.service';
import { patrolTunables } from './patrol-tunables';
import {
  PatrolDoctrineRepository,
  type ObservationEntry,
  type PatrolQueueMutation,
  type PatrolQueueState,
} from './patrol.repository';

/** Observation severity domain (system_4 §États Observation.severity 1..5). The qualitative bands map onto it. */
const SEVERITY_CONGESTED = 2; // a CONGESTED flow cell is a moderate patrol sighting.
const SEVERITY_SATURATED = 4; // a SATURATED flow cell is a strong patrol sighting (HIGH band → feeds System 3).

/** The severity at/above which an observation is HIGH (emits a PatrolObservationEvent → System 3 suspicion bump). */
const HIGH_SEVERITY_THRESHOLD = SEVERITY_SATURATED;
/** The severity at/above which an observation is MEDIUM (the qualitative band sent on the cross-system event). */
const MEDIUM_SEVERITY_THRESHOLD = SEVERITY_CONGESTED;

@Injectable()
export class PatrolDoctrineService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PatrolDoctrineService.name);

  /** districtId → precinctId (the contiguous-grouping mapping, mirrors System 3's; built once at bootstrap). */
  private districtToPrecinct = new Map<number, number>();
  /** blockId → districtId (seeded geography; read once at bootstrap). */
  private blockToDistrict = new Map<number, number>();

  /** The canonical precinct ids (1..precinctCount). */
  private precinctIds: number[] = [];

  /**
   * Per-player ACCUMULATOR of the latest observed congestion bucket per block (between 30-min boundaries).
   * keyed playerId → blockId → bucket. The 30-min tick drains this into Observation entries then clears it
   * (event-driven accumulation, cadenced flush). Only CONGESTED/SATURATED blocks are recorded (a sighting).
   */
  private readonly pending = new Map<string, Map<number, BackpressureBucket>>();
  /** Per-player guard so the lazy seed runs at most once per process under concurrent first ticks. */
  private readonly seededPlayers = new Set<string>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: PatrolDoctrineRepository,
    private readonly police: PoliceMemoryService,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: geography mapping + subscriptions + registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.loadGeographyMapping();
    this.subscribeToFlow();
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Build the block→district + district→precinct maps ONCE (R9.3 — reads seeded geography, never writes).
   * Precinct ↔ district = contiguous district-id grouping (3 districts/precinct): precinct = ⌈district/3⌉ —
   * IDENTICAL to System 3's mapping so an observation's owning precinct is consistent across the two systems
   * (a block hot in System 4's precinct p is the same precinct p System 3 bumps for that block).
   */
  private async loadGeographyMapping(): Promise<void> {
    const rows = await this.db
      .select({ id: blocks.id, district_id: blocks.district_id })
      .from(blocks)
      .orderBy(asc(blocks.id));
    for (const b of rows) this.blockToDistrict.set(b.id, b.district_id);

    this.precinctIds = Array.from({ length: patrolTunables.precinctCount }, (_, i) => i + 1);
    const distinctDistricts = new Set(rows.map((r) => r.district_id));
    for (const d of distinctDistricts) {
      const p = Math.min(patrolTunables.precinctCount, Math.floor((d - 1) / 3) + 1);
      this.districtToPrecinct.set(d, p);
    }
    this.logger.log(
      `loaded geography mapping: ${this.blockToDistrict.size} blocks → ${distinctDistricts.size} districts → ` +
        `${patrolTunables.precinctCount} precincts (contiguous 3-districts/precinct grouping — mirrors System 3)`,
    );
  }

  /**
   * Subscribe to the CityEventBus for the observation sources (Tick 1):
   *   - FlowCellCongestedEvent — the day-1 patrol-sighting feed (system_4 §Update tick Tick 1 + §cross-ref system_1:
   *     congested/saturated blocks are patrol observations).
   *   - HeatEscalationEvent — the CROSS-SYSTEM Heat influence (heat_propagation.md §Cross-ref system_4: heat raises
   *     observation_severity; a HOT/BURNING building escalation is a strong patrol sighting on its block). This is
   *     the Heat → Patrol → (transitively, via PatrolObservation) Police-memory chain made real (T13). Both handlers
   *     are synchronous — they record the latest bucket per block in the pending accumulator; the 30-min tick drains
   *     it. NORMAL flow transitions are NOT a sighting (only CONGESTED/SATURATED); every heat escalation IS.
   */
  private subscribeToFlow(): void {
    this.bus.onFlowCellCongested((e) => this.onFlowCellCongested(e));
    this.bus.onHeatEscalation((e) => this.onHeatEscalation(e));
  }

  /**
   * Register the two cadence slots System 4 occupies (one CitySimSystem per slot — the registry contract).
   * THIRTY_MIN/1 (observation accumulation) + TWELVE_H/1 (precinct review). Both replace the no-op placeholders
   * the SCHEDULE seeded for PATROL_DOCTRINE.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem(
      this.makeSystem(Cadence.THIRTY_MIN, 1, (ctx) => this.runObservationAccumulation(ctx)),
    );
    this.scheduler.registerSystem(this.makeSystem(Cadence.TWELVE_H, 1, (ctx) => this.runPrecinctReview(ctx)));
  }

  private makeSystem(
    cadence: Cadence,
    order: number,
    run: (ctx: CitySimTickContext) => void | Promise<void>,
  ): CitySimSystem {
    return { id: CitySystemId.PATROL_DOCTRINE, cadence, order, run };
  }

  /** F4 RAM budget log (system_4 §Docker RAM budget): observation_queue_size × ~12 B × precinct_count. */
  private logRamBudget(): void {
    const kb = Math.round((patrolTunables.observationQueueSize * 12 * patrolTunables.precinctCount) / 1024);
    this.logger.log(
      `Patrol Doctrine per-player RAM budget ≈ ${kb} KB observation queues (${patrolTunables.precinctCount} × ` +
        `${patrolTunables.observationQueueSize} entries × ~12 B, PERSISTED in patrol_observation_queues). ` +
        `Reads System 3 getTopTargets() READ-ONLY (Inv 6); emits PatrolObservation + RaidPlanned/Undercover.`,
    );
  }

  // ───────────────────────────── Tick 1 source — flow congestion accumulation (event-driven) ─────────────────────────────

  private onFlowCellCongested(e: FlowCellCongestedEvent): void {
    // Only a transition INTO a congested state is a patrol sighting (NORMAL is not observed).
    if (e.to !== BackpressureBucket.CONGESTED && e.to !== BackpressureBucket.SATURATED) return;
    const map = this.pending.get(e.playerId) ?? new Map<number, BackpressureBucket>();
    // Keep the HIGHEST bucket seen for this block since the last flush (SATURATED dominates CONGESTED).
    const prev = map.get(e.blockId);
    if (prev === BackpressureBucket.SATURATED) return; // already at the ceiling for this block this window.
    map.set(e.blockId, e.to);
    this.pending.set(e.playerId, map);
  }

  /**
   * CROSS-SYSTEM Heat influence (T13): a HeatEscalationEvent (a building crossed heat_escalation_threshold —
   * HOT/BURNING) is a STRONG patrol sighting on its block (heat raises observation_severity — heat_propagation.md
   * §Cross-ref system_4). We record it in the SAME pending accumulator as a SATURATED bucket (the ceiling — a
   * burning building is at least as observable as a saturated flow cell), so the 30-min tick drains it into a
   * HIGH-severity Observation → a PatrolObservationEvent → System 3 suspicion. This is the heat → patrol → police
   * chain. Synchronous handler (accumulate); the cadenced 30-min flush persists. Heat injects the SATURATED ceiling
   * (it never DOWN-grades a block already flagged SATURATED by flow).
   */
  private onHeatEscalation(e: HeatEscalationEvent): void {
    const map = this.pending.get(e.playerId) ?? new Map<number, BackpressureBucket>();
    map.set(e.blockId, BackpressureBucket.SATURATED); // a heat escalation = the strongest sighting band.
    this.pending.set(e.playerId, map);
  }

  // ───────────────────────────── the two registered cadence ticks ─────────────────────────────

  /**
   * {THIRTY_MIN, order 1} — OBSERVATION ACCUMULATION (Tick 1): drain the pending congestion accumulator into
   * Observation entries, append them to the OWNING precinct's ring buffer (Inv 1 per-precinct), apply the
   * overflow policy on a full ring (Inv 4), persist the dirty queues in ONE batched UPDATE, and emit a
   * PatrolObservationEvent for each HIGH-severity observation (System 3↔4 handoff → System 3 suspicion bump).
   */
  private async runObservationAccumulation(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);

    const pending = this.pending.get(ctx.playerId);
    if (!pending || pending.size === 0) return; // no sightings this window.

    // Group the drained sightings into Observation entries per owning precinct (deterministic block order).
    const byPrecinct = new Map<number, ObservationEntry[]>();
    const sortedBlocks = [...pending.keys()].sort((a, b) => a - b);
    for (const blockId of sortedBlocks) {
      const bucket = pending.get(blockId)!;
      const districtId = this.blockToDistrict.get(blockId);
      if (districtId === undefined) continue;
      const precinctId = this.districtToPrecinct.get(districtId);
      if (precinctId === undefined) continue;
      const severity = bucket === BackpressureBucket.SATURATED ? SEVERITY_SATURATED : SEVERITY_CONGESTED;
      const list = byPrecinct.get(precinctId) ?? [];
      list.push({ block_id: blockId, district_id: districtId, severity, game_minute: ctx.gameMinute });
      byPrecinct.set(precinctId, list);
    }
    this.pending.delete(ctx.playerId); // the window is drained (clear before persistence — sync handlers only).

    if (byPrecinct.size === 0) return;

    // Apply the appends + overflow policy to the current persisted queues, collect the mutations + the
    // high-severity observations to surface to System 3.
    const queues = await this.repo.listQueues(ctx.playerId);
    const byId = new Map<number, PatrolQueueState>(queues.map((q) => [q.precinct_id, q]));
    const mutations: PatrolQueueMutation[] = [];
    const highSeverity: ObservationEntry[] = [];

    for (const [precinctId, newEntries] of byPrecinct) {
      const q = byId.get(precinctId);
      if (!q) continue;
      let entries = [...q.entries, ...newEntries];
      let tail = q.tail + newEntries.length;
      let head = q.head;
      // Overflow policy (Inv 4): a full ring drops the LOWEST-severity entry first, then FIFO on ties.
      while (entries.length > patrolTunables.observationQueueSize) {
        const dropIdx = this.lowestSeverityFifoIndex(entries);
        entries.splice(dropIdx, 1);
        head += 1; // a dropped entry advances the read pointer (consumed out of the ring).
      }
      mutations.push({ precinct_id: precinctId, entries, head, tail });
      for (const e of newEntries) if (e.severity >= HIGH_SEVERITY_THRESHOLD) highSeverity.push(e);
    }

    if (mutations.length > 0) await this.repo.applyQueues(ctx.playerId, mutations);

    // System 3↔4 HANDOFF: emit a PatrolObservationEvent for each HIGH-severity observation. System 3 subscribes
    // and bumps its suspicion_map (a new suspicion SOURCE alongside FlowCellCongested/WhisperActivated). Emitted
    // AFTER the queue persist so the side-effects are ordered (observe → persist → notify).
    for (const e of highSeverity) {
      const precinctId = this.districtToPrecinct.get(e.district_id);
      if (precinctId === undefined) continue;
      this.bus.emitPatrolObservation({
        type: 'patrol_observation',
        playerId: ctx.playerId,
        precinctId,
        districtId: e.district_id,
        blockId: e.block_id,
        severity: this.severityBand(e.severity),
        gameMinute: ctx.gameMinute,
      });
    }
  }

  /**
   * {TWELVE_H, order 1} — PRECINCT REVIEW (Tick 2): for each precinct cluster the active observations (phase A),
   * select an action for qualifying clusters (phase B — deterministic gate; raid target via System 3's
   * getTopTargets softmax), emit RaidPlanned / UndercoverDispatched (System 4 is the canonical owner), FLUSH
   * the clustered entries (phase C), and AGE the orphan sub-threshold entries (phase D). Persists the queues.
   */
  private async runPrecinctReview(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);

    const queues = await this.repo.listQueues(ctx.playerId);
    if (queues.length === 0) return;

    const mutations: PatrolQueueMutation[] = [];

    for (const q of queues) {
      const { precinct_id: precinctId } = q;
      // ── Phase A — clustering (system_4 §Update tick Tick 2 phase A "clusteriser par proximité spatiale"):
      // group active entries by DISTRICT — the spatial-proximity proxy day-1 (same district = spatially close,
      // since a district is a contiguous block grid). A cluster's size is its member count; its score is the
      // severity sum; its representative target block is the cluster's hottest member (highest severity, then
      // lowest block id for a stable tie-break). Deterministic. ──
      const clusters = this.clusterByDistrict(q.entries);

      // ── Phase B — action selection for clusters of size >= cluster_correlation_threshold. ──
      const clusteredKeys = new Set<number>(); // entry indices consumed by a qualifying cluster (phase C flush).
      // System 3's top targets are loop-INVARIANT for this precinct → fetch at most once (lazily, on the first
      // raid) instead of per cluster (batch-before-loop discipline; Inv 6 read-only).
      let topTargets: Awaited<ReturnType<PoliceMemoryService['getTopTargets']>> | null = null;
      for (const cluster of clusters) {
        if (cluster.indices.length < patrolTunables.clusterCorrelationThreshold) continue;
        // The cluster qualified — it WILL be flushed (consumed) whether or not it produces an overt action.
        for (const idx of cluster.indices) clusteredKeys.add(idx);

        const gate = this.actionGate(ctx.playerId, precinctId, cluster.blockId, ctx.gameMinute);
        if (gate < patrolTunables.raidProbPerCluster) {
          // RAID — confirm the target via System 3's getTopTargets softmax (Inv 6 read-only consumption).
          if (topTargets === null) topTargets = await this.police.getTopTargets(ctx.playerId, precinctId);
          const targetBlockId = this.selectRaidTarget(topTargets, cluster.blockId);
          this.bus.emitRaidPlanned({
            type: 'raid_planned',
            playerId: ctx.playerId,
            precinctId,
            districtId: cluster.districtId, // the cluster's actual district (the observed location).
            targetBlockId,
            gameMinute: ctx.gameMinute,
          });
        } else if (gate < patrolTunables.raidProbPerCluster + patrolTunables.undercoverDispatchProb) {
          // UNDERCOVER dispatch (no raid stamp).
          this.bus.emitUndercoverDispatched({
            type: 'undercover_dispatched',
            playerId: ctx.playerId,
            precinctId,
            districtId: cluster.districtId, // the cluster's actual district (the observed location).
            targetBlockId: cluster.blockId,
            gameMinute: ctx.gameMinute,
          });
        }
        // else: patrol reinforcement — no cross-system event (the complementary probability; the cluster is
        // still flushed below).
      }

      // ── Phase C — flush: remove the clustered (actioned) entries; keep the orphans for the next review. ──
      let survivors = q.entries.filter((_, i) => !clusteredKeys.has(i));

      // ── Phase D — aging decay: orphan (sub-threshold) entries age by cluster_aging_decay_per_day scaled to
      // the severity domain; entries decayed to <1 severity drop silently (prevents zombie sub-threshold
      // clusters). The 12h review runs twice/day → a half-day decay step (rate × severity-domain / 2). ──
      // TODO(v1.x balance pass): across the gdd/14 range cluster_aging_decay_per_day ∈ [0,0.5] this expression
      // floors to a CONSTANT step of 1 (integer-severity domain + half-day scaling), so the knob is currently
      // INERT — re-tuning it has no gameplay effect. The mechanic stays safe (step≥1 prevents zombie
      // accumulation); making the knob live needs a balance redesign (fractional carry / wider step). DEFERRED.
      const step = Math.max(1, Math.round(patrolTunables.clusterAgingDecayPerDay * SEVERITY_SATURATED) / 2);
      survivors = survivors
        .map((e) => ({ ...e, severity: e.severity - step }))
        .filter((e) => e.severity >= 1);

      // head advances by the number of entries removed (flushed + aged-out); tail is unchanged (no appends here).
      const removed = q.entries.length - survivors.length;
      mutations.push({ precinct_id: precinctId, entries: survivors, head: q.head + removed, tail: q.tail });
    }

    if (mutations.length > 0) await this.repo.applyQueues(ctx.playerId, mutations);
  }

  // ───────────────────────────── review helpers (deterministic) ─────────────────────────────

  /**
   * Group active entries into clusters keyed by DISTRICT (the spatial-proximity proxy day-1 — a district is a
   * contiguous block grid, so same-district observations are spatially close per system_4 §phase A). Each
   * cluster carries its member indices (size = count, the qualifying signal vs cluster_correlation_threshold)
   * and a representative target block (the hottest member — highest severity, then lowest block id for a stable
   * tie-break — the block the raid/undercover targets). Deterministic order: by district id ascending.
   */
  private clusterByDistrict(
    entries: ObservationEntry[],
  ): { districtId: number; blockId: number; indices: number[] }[] {
    const byDistrict = new Map<number, { indices: number[]; bestBlock: number; bestSeverity: number }>();
    entries.forEach((e, i) => {
      const c = byDistrict.get(e.district_id) ?? { indices: [], bestBlock: e.block_id, bestSeverity: -1 };
      c.indices.push(i);
      // Representative target block = the cluster's hottest observed block (stable tie-break on lowest id).
      if (e.severity > c.bestSeverity || (e.severity === c.bestSeverity && e.block_id < c.bestBlock)) {
        c.bestSeverity = e.severity;
        c.bestBlock = e.block_id;
      }
      byDistrict.set(e.district_id, c);
    });
    return [...byDistrict.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([districtId, c]) => ({ districtId, blockId: c.bestBlock, indices: c.indices }));
  }

  /** A deterministic [0,1) action gate from (player, precinct, clusterBlock, gameMinute) — no RNG (Inv 3 shaped). */
  private actionGate(playerId: string, precinctId: number, clusterBlockId: number, gameMinute: number): number {
    const digest = createHash('sha256')
      .update(`${playerId}:${precinctId}:${clusterBlockId}:${gameMinute}`)
      .digest();
    return digest.readUInt32BE(0) / 0x1_0000_0000; // [0,1)
  }

  /**
   * Select the raid TARGET from System 3's pre-fetched getTopTargets softmax (Inv 6 — System 4 reads System 3
   * READ-ONLY). Given the precinct's top suspicion targets, picks the softmax argmax (the temperature-shaped top
   * target — reproducible); otherwise falls back to the cluster's own observed block. Pure (the read is hoisted
   * to once-per-precinct in runPrecinctReview — see the lazy `topTargets` cache there).
   */
  private selectRaidTarget(
    top: Awaited<ReturnType<PoliceMemoryService['getTopTargets']>>,
    clusterBlockId: number,
  ): number {
    if (top.length > 0) return top[0].blockId; // getTopTargets returns softmax-ordered targets (System 3 owns T).
    return clusterBlockId; // no System 3 belief yet → fall back to the cluster's observed block.
  }

  /** Index of the entry to drop on overflow: lowest severity, then FIFO (earliest) on ties (Inv 4). */
  private lowestSeverityFifoIndex(entries: ObservationEntry[]): number {
    let best = 0;
    for (let i = 1; i < entries.length; i += 1) {
      if (entries[i].severity < entries[best].severity) best = i;
      // ties keep the earlier index (FIFO) — no update needed (best already points earlier).
    }
    return best;
  }

  /** Map a raw severity (1..5) to its closed qualitative band (the cross-system event carries the band — P5). */
  private severityBand(severity: number): PatrolObservationSeverity {
    if (severity >= HIGH_SEVERITY_THRESHOLD) return 'HIGH';
    if (severity >= MEDIUM_SEVERITY_THRESHOLD) return 'MEDIUM';
    return 'LOW';
  }

  // ───────────────────────────── lazy seed ─────────────────────────────

  /**
   * Lazily seed the player's 6 patrol_observation_queues rows on first tick. Idempotent at THREE layers
   * (mirrors PoliceMemory): (1) the per-process Set fast-path; (2) a DB COUNT short-circuit; (3) the DURABLE
   * race-safe guard in the repository's seedSixPrecincts (advisory lock + NOT EXISTS).
   */
  private async ensureSeeded(playerId: string): Promise<void> {
    if (this.seededPlayers.has(playerId)) return;
    const existing = await this.repo.countPrecincts(playerId);
    if (existing === 0) {
      await this.repo.seedSixPrecincts(playerId, this.precinctIds);
      this.logger.log(
        `lazily seeded ${patrolTunables.precinctCount} patrol_observation_queues rows for player ${playerId}`,
      );
    }
    this.seededPlayers.add(playerId);
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * getPatrolLoadRaw — the BO-only raw read for ONE precinct's patrol load: the ACTIVE entry count + the
   * ring-buffer capacity (the substrate the projection buckets — NEVER exposed raw to the player). Reads from
   * the DB (the authoritative persisted state). null if the precinct queue row does not exist.
   */
  async getPatrolLoadRaw(
    playerId: string,
    precinctId: number,
  ): Promise<{ activeCount: number; capacity: number } | null> {
    const q = await this.repo.getQueue(playerId, precinctId);
    if (!q) return null;
    return { activeCount: q.entries.length, capacity: patrolTunables.observationQueueSize };
  }

  /** Whether a precinct id is in the canonical 1..precinctCount set (used by the controller for a clean 404). */
  isValidPrecinct(precinctId: number): boolean {
    return Number.isInteger(precinctId) && precinctId >= 1 && precinctId <= patrolTunables.precinctCount;
  }

  // ───────────────────────────── PUBLIC block→precinct resolver (OQ-7b, single source of truth) ─────────────────────────────

  /**
   * precinctsForBlocks — PUBLIC resolver: maps each blockId → precinctId via the same seeded geography
   * built in `loadGeographyMapping()` (the `⌈district/3⌉` grouping — `Math.floor((d-1)/3)+1`).
   *
   * SINGLE SOURCE OF TRUTH (OQ-7b): this is the canonical block→precinct resolver. The formula lives
   * ONCE in `loadGeographyMapping()` (private, called at bootstrap); this public method reads the
   * already-computed `blockToDistrict` + `districtToPrecinct` maps — it does NOT re-implement the
   * `⌈district/3⌉` formula. Layer 1 (C4) and Layer 2 (C6) call this instead of building their own.
   *
   * Returns a `Map<blockId, precinctId>` for the supplied block ids. Unknown block ids (not in the
   * seeded geography) are omitted from the map (callers must handle sparse returns gracefully).
   *
   * Async to match the NestJS injectable contract and allow a future DB-backed fallback without
   * changing the signature; the current implementation is synchronous (reads in-memory maps).
   */
  async precinctsForBlocks(blockIds: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    for (const blockId of blockIds) {
      const districtId = this.blockToDistrict.get(blockId);
      if (districtId === undefined) continue; // unknown block — skip
      const precinctId = this.districtToPrecinct.get(districtId);
      if (precinctId === undefined) continue; // unknown district — skip
      result.set(blockId, precinctId);
    }
    return result;
  }

  /**
   * precinctForBlock — single-block convenience wrapper (delegates to `precinctsForBlocks([blockId])`).
   *
   * Returns the precinctId for the given block, or `null` if the block is not in the seeded geography.
   * Callers that need a non-nullable result should assert after this call (the E2E uses a known block).
   */
  async precinctForBlock(blockId: number): Promise<number | null> {
    const map = await this.precinctsForBlocks([blockId]);
    return map.get(blockId) ?? null;
  }

  /**
   * districtForBlock — PUBLIC read of the block→district mapping from the seeded geography.
   *
   * C8: needed by `CourierDetectionService.runSegmentDetection` to populate the `districtId` field
   * of the emitted `PatrolObservationEvent` (the event shape requires precinctId, districtId, blockId).
   * Reads the same seeded `blockToDistrict` map built in `loadGeographyMapping()` — no formula
   * re-implementation (single source of truth). Returns `null` if the block is not in the geography.
   *
   * ADDITIVE — C8 only. No production path changed.
   */
  districtForBlock(blockId: number): number | null {
    return this.blockToDistrict.get(blockId) ?? null;
  }

  /**
   * getPatrolPresenceForPrecincts — the BATCHED READ-ONLY per-district patrol-presence signal System 5
   * (Cohesion Permafrost) consumes for its NIGHTLY police-presence delta (system_5 §Update tick Phase A
   * "présence police × patrol-hours observées dans le district"). Returns a districtId → presence map for ALL
   * of the player's districts in ONE `listQueues(playerId)` read — the batched-read discipline the persisted
   * systems follow (read once → compute in JS → write once). Replaces the former per-district read that issued
   * one SELECT per district (18 sequential SELECTs/tick though only `precinctCount` distinct queues exist).
   *
   * System 4's patrol observations are per-PRECINCT (the ObservationQueue); a precinct owns 3 contiguous
   * districts (the ⌈district/3⌉ grouping mirrored across System 3/4). The active observation count of the
   * OWNING precinct is the day-1 patrol-hours proxy for each of its districts (the three districts of a precinct
   * therefore share the same presence reading day-1 — a coarse but HONEST signal: System 4 persists no
   * per-district patrol-hour ledger, so the precinct's active observation count is the best read-only signal; a
   * finer ledger would need a System 4 schema change, deferred). System 5 READS this; it NEVER mutates
   * patrol_observation_queues (Inv 6 — System 5 reads inputs, doesn't mutate other systems). The returned map
   * carries an entry for EVERY known district (presence 0 when the owning precinct queue is unseeded/empty).
   */
  async getPatrolPresenceForPrecincts(playerId: string): Promise<Map<number, number>> {
    const queues = await this.repo.listQueues(playerId);
    const presenceByPrecinct = new Map<number, number>(queues.map((q) => [q.precinct_id, q.entries.length]));
    const presenceByDistrict = new Map<number, number>();
    for (const [districtId, precinctId] of this.districtToPrecinct) {
      presenceByDistrict.set(districtId, presenceByPrecinct.get(precinctId) ?? 0);
    }
    return presenceByDistrict;
  }
}

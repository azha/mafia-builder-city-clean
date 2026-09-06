// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md
//             §Invariants canoniques (Inv 1 queue per-district never global; Inv 2 priority_bucket enum never
//                                     float; Inv 3 overflow drop-low-first not FIFO; Inv 4 position = server
//                                     truth; Inv 5 cascade = amplification not direct inspection; Inv 6 BPD
//                                     referral = conditional output; Inv 7 cascade bounded)
//             §États InspectionQueue / QueueEntry / DispatcherRegime
//             §Update tick (12h dispatch Phases A–C + Phase D decay; cascade tick + delay; overflow)
//             + docs/tech/02_fictional_world/law_mis.md (MIS profile + DispatcherRegime — minimal enum here)
//             -- session:2026-06-03 (Phase 1 Task 7) --
//
// `InspectionQueueService` — System 6 (Inspection Cascade Queue / MIS). The PERSISTED, 12h-dispatch + event-
// subscriber system: it owns the per-player `inspection_queues` (18 rows = city.district_count, one queue PER
// DISTRICT — Inv 1, never a global MIS queue). It copies the CohesionPermafrost/PatrolDoctrine persisted-system
// template (repository + projection + controller + tunables) with the System-6-specific shape: a 12h dispatch
// tick (registered at TWELVE_H/2 = INSPECTION_QUEUE slot) PLUS a CohesionStateChangedEvent SUBSCRIBER (the
// cascade amplification, System 5 → System 6).
//
// THE 12h DISPATCH TICK (system_6 §Update tick — registered at TWELVE_H/2 = INSPECTION_QUEUE slot, runs 2×/day):
//   For each of the player's 18 districts, runDispatchCycle:
//     · QUEUE FILL (Phase 1 sources) — SCHEDULED audits: a DETERMINISTIC count derived from (gameMinute, district
//       hash) — NO RNG (Inv: reproducible). The cascade source is event-driven (see the cascade tick). The
//       unconformity-audit-pin source (System 7) is NOT built (T8) → lands later; the false-report source is a
//       player action → DEFERRED (see SCOPE).
//     · Phase A — EFFECTIVE RATE: processing_rate_effective = max(1, processing_rate_per_day + budget_modifier).
//       inspections_this_cycle = floor(processing_rate_effective / 2) (2 cycles/day). The DispatcherRegime
//       (NOMINAL/BACKLOGGED/BUDGET_CUT/SURGE) is a minimal enum derived from length/budget_modifier (law_mis
//       §DispatcherState — full DispatcherState detail DEFERRED, see SCOPE).
//     · Phase B — DISPATCH: dispatch inspections_this_cycle entries from the HEAD (entries[0], FIFO within
//       priority — see dispatchOrder). Each dispatched inspection reads the building's "outcome" (deterministic
//       hash of building_id — no RNG; real building-state coupling lands with System 7/the building lifecycle).
//       On a VIOLATION_MAJOR / CRIMINAL_EVIDENCE outcome it emits BuildingEvidenceFoundEvent (Inv 6 — a BPD
//       referral OBSERVATION, never a raid; System 3 consumes it).
//     · Phase C / D — PRIORITY DECAY: each NON-dispatched entry accrues priority_decay_per_day/2 per 12h cycle;
//       when its accumulator reaches 1.0 the priority_bucket descends one rank (CRITICAL→HIGH→MEDIUM→LOW).
//     · OVERFLOW (Inv 3): if a fill pushes length over inspection_queue_cap, drop the OLDEST LOW-bucket entry;
//       if no LOW entry exists, drop the oldest entry regardless (the player-exploitable blind spot — NOT FIFO).
//   Persists the whole 18-district batch in ONE UPDATE (the batched-write template).
//
// THE CASCADE (system_6 §Update tick Tick cascade — System 5 → System 6, Inv 5/7):
//   - SUBSCRIBE to CohesionStateChangedEvent on the bus. When a district transitions TO THAWED, schedule a
//     cascade for that (player, district): increment cascade_depth_current (bounded by cascade_depth_max —
//     Inv 7), and arm a cascade_tick gameMinute = now + cascade_propagation_delay_ticks (the propagation delay).
//   - At the next dispatch tick whose gameMinute >= the armed cascade_tick, GENERATE cascade entries: inject
//     extra CASCADE/INFORMANT entries into THAT district's queue (Inv 5 — AMPLIFICATION, not a direct inspection;
//     the entries go through the normal dispatch cycle). Bounded by cascade_depth_current (Inv 7). Emits
//     InspectionCascadeTriggeredEvent (observability). The cascade depth resets on the daily-equivalent reset
//     (folded into the dispatch tick: a STABLE/FRAGILE transition clears the active flag — see handler).
//
// SCOPE — RESOLVED (TD-012 lot-5 L5-T6l):
//   - FalseReportLedger + the false-report FILE action + flood backlash: BUILT (migration 0036 + 09 backport +
//     Drizzle mirror + FalseReportLedgerService/Repository + POST /v1/city/inspection/report). The FALSE_REPORT /
//     GENUINE_REPORT source enum members in QueueEntrySource are now produced by the FILE action path.
//     Economy CHARGE (false_report_base_cost) is logged but deferred to player economy P2 (no currency deduction
//     day-1 — noted honestly).
//   - The informant-fee CHARGE (player economy P2) → DEFERRED; the qualitative READ projection (what the fee
//     unlocks) IS built (the projection service) — the fee is the gate, the read is the surface.
//   - The full DispatcherState detail (law_mis — inspections_today / accumulator carry / inspector pool) →
//     a MINIMAL DispatcherRegime enum only (NOMINAL/BACKLOGGED/BUDGET_CUT/SURGE driven by length/budget).
//   - System 7 mismatch_score cascade targeting (system_6 cross-ref) → System 7 is NOT built (T8); cascade
//     target selection is a deterministic district-pool pick (the spec's "random selection if no score" branch).
//
// DETERMINISM (NO RNG — the E2E asserts identical queue signatures for identically-advanced players): the
// SCHEDULED audit count + the dispatch outcome + the cascade target are FIXED functions of (gameMinute,
// district/building id) via a stable integer hash. Two identically-advanced players land on identical queues.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { districts as districtsTable, thrennyEdges } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import {
  CityEventBus,
  type CohesionStateChangedEvent,
  type EvidenceSeverity,
  type ForbiddenTriadInterestFlagEvent,
  type HiddenCurriculumLeakMISEvent,
  type ForensicEntryDispatchedEvent,
} from '../events/city-event-bus';
import { inspectionTunables } from './inspection-tunables';
import {
  InspectionQueueRepository,
  type InspectionQueueMutation,
  type InspectionQueueState,
  type PriorityBucket,
  type QueueEntry,
  type QueueEntrySource,
} from './inspection.repository';

/** Minimal DispatcherRegime enum (system_6 §États DispatcherRegime — full DispatcherState detail DEFERRED). */
export type DispatcherRegime = 'NOMINAL' | 'BACKLOGGED' | 'BUDGET_CUT' | 'SURGE';

/** The closed inspection-outcome domain (system_6 §Update tick Phase B). Internal — never escapes the engine. */
type InspectionOutcome = 'CLEAN' | 'VIOLATION_MINOR' | 'VIOLATION_MAJOR' | 'CRIMINAL_EVIDENCE';

/** Priority rank order for the overflow drop-low-first comparison + decay descent (LOW=0 .. CRITICAL=3). */
const PRIORITY_RANK: Record<PriorityBucket, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
/** Bucket descent ladder (Phase D priority decay — CRITICAL→HIGH→MEDIUM→LOW). */
const PRIORITY_DESCENT: Record<PriorityBucket, PriorityBucket> = {
  CRITICAL: 'HIGH',
  HIGH: 'MEDIUM',
  MEDIUM: 'LOW',
  LOW: 'LOW',
};

/** BACKLOGGED when the queue is at/over 80% of the cap (system_6 §États DispatcherRegime). */
const BACKLOGGED_FILL_RATIO = 0.8;

/** A pending cascade armed by a THAW: at gameMinute >= fireAtGameMinute, inject `depth`-bounded cascade entries. */
interface PendingCascade {
  depth: number;
  fireAtGameMinute: number;
}

@Injectable()
export class InspectionQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InspectionQueueService.name);

  /** The canonical district ids (1..districtCount), read once from seeded geography at bootstrap. */
  private districtIds: number[] = [];

  /**
   * The river-crossing district ids (04e-A1 C9, design §4.4 — ★ Substrate 4: checkpoint inspection-
   * density), read ONCE from `threnny_edges.inspection_queue_district_id` at bootstrap (mirrors
   * `districtIds` above — R9.3 source = geography, never re-derived mid-tick). A district in this Set
   * is where a bridge/ferry checkpoint feeds that district's MIS queue — ONLY these districts consult
   * `checkpointDensityRatioFor` in `effectiveQueueCapFor` below; every other district is structurally
   * unaffected by the checkpoint-density lever regardless of any overlay modifier.
   */
  private riverCrossingDistrictIds = new Set<number>();

  /** Per-player guard so the lazy seed runs at most once per process under concurrent first ticks. */
  private readonly seededPlayers = new Set<string>();

  /** Per-player cascade depth currently latched per district (Inv 7 — reset when a district leaves THAWED). */
  private readonly cascadeDepth = new Map<string, Map<number, number>>();
  /** Per-player pending cascades armed by a THAW (keyed playerId → districtId → pending). */
  private readonly pendingCascades = new Map<string, Map<number, PendingCascade>>();

  /**
   * R9 MIS bias: per-player set of pairKeys whose ForbiddenTriadInterestFlag is currently latched.
   * The no-event path (map absent or empty) is BYTE-IDENTICAL to the original hash-deterministic
   * scheduled fill (zero-regression: the bias is ADDITIVE — only fires when a flag is present).
   */
  private readonly latchedTriadPairs = new Map<string, Set<string>>();

  /**
   * R9 MIS inject: per-player pending INFORMANT injects from HiddenCurriculumLeakMIS events.
   * Consumed at the next runDispatchTick for the matching district. If multiple leaks arrive between
   * ticks for the same district, the latest one wins (idempotent absorb by overwrite).
   */
  private readonly pendingMISLeakInjects = new Map<
    string,
    Map<number, { lieutenantId: string; gameMinute: number }>
  >();

  /**
   * R9 MIS inject counter (TEST-ONLY): per-player running count of INFORMANT injects actually applied
   * during runDispatchTick (i.e. the inject branch at :435 was reached and enqueueWithOverflow called).
   * Read via getMISInjectCount() — exposed as a _test route so E2E specs can assert the inject fired ≥1×
   * (defeats the vacuous ≥0 assertion when the queue is empty and the inject path is unreachable).
   * Not used in production logic — purely an observability counter for the test surface.
   */
  private readonly misLeakInjectCounters = new Map<string, number>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: InspectionQueueRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: district ids + subscription + registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.loadDistrictIds();
    await this.loadRiverCrossingDistrictIds();
    this.subscribeToCohesion();
    this.subscribeToMISRouting();
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Read the canonical district ids ONCE from the seeded geography (R9.3 — reads the global `districts` table,
   * never writes). The 18 districts are seeded contiguously 1..18 (T0 geography seed); the lazy seed creates one
   * inspection_queues row per district id (Inv 1 — per-district, never global).
   */
  private async loadDistrictIds(): Promise<void> {
    const rows = await this.db
      .select({ id: districtsTable.id })
      .from(districtsTable)
      .orderBy(asc(districtsTable.id));
    this.districtIds = rows.map((r) => r.id);
    if (this.districtIds.length !== inspectionTunables.districtCount) {
      this.logger.warn(
        `seeded districts (${this.districtIds.length}) != city.district_count (${inspectionTunables.districtCount}) — ` +
          `the inspection_queues seed creates one row per seeded district id (R9.3 source = geography).`,
      );
    }
    this.logger.log(
      `loaded ${this.districtIds.length} canonical district ids (inspection_queues seed cardinality = ` +
        `city.district_count ${inspectionTunables.districtCount}, Inv 1 per-district).`,
    );
  }

  /**
   * Read the river-crossing district ids ONCE from the seeded geography (04e-A1 C9, design §4.4 — R9.3:
   * reads the global `threnny_edges` table, never writes; migration 0110 adds the supporting index).
   * `inspection_queue_district_id` is the district riverain whose MIS queue the crossing feeds — the
   * DISTINCT set (today: 6 edges → up to 6 districts, some districts host more than one crossing) is
   * exactly the set `effectiveQueueCapFor` consults for the checkpoint-density boost below.
   */
  private async loadRiverCrossingDistrictIds(): Promise<void> {
    const rows = await this.db
      .selectDistinct({ id: thrennyEdges.inspection_queue_district_id })
      .from(thrennyEdges);
    this.riverCrossingDistrictIds = new Set(rows.map((r) => r.id));
    this.logger.log(
      `loaded ${this.riverCrossingDistrictIds.size} river-crossing district ids (checkpoint inspection-` +
        `density substrate, C9) from threnny_edges.inspection_queue_district_id: ` +
        `[${Array.from(this.riverCrossingDistrictIds).sort((a, b) => a - b).join(', ')}].`,
    );
  }

  /** Whether `districtId` hosts a river crossing (04e-A1 C9 — TEST-exposed + used by `effectiveQueueCapFor`). */
  isRiverCrossingDistrict(districtId: number): boolean {
    return this.riverCrossingDistrictIds.has(districtId);
  }

  /**
   * Subscribe to CohesionStateChangedEvent (System 5 → System 6 cascade seam, Inv 5). A transition TO THAWED
   * ARMS a cascade for that (player, district) after the propagation delay (Inv 7 depth-bounded); a transition
   * AWAY from THAWED clears the district's active cascade depth. Synchronous handler (the bus emits sync) — it
   * only updates the in-memory pending-cascade map; the actual entry generation runs at the next dispatch tick.
   */
  private subscribeToCohesion(): void {
    this.bus.onCohesionStateChanged((e) => this.handleCohesionStateChanged(e));
  }

  /**
   * Subscribe to R9 MIS routing events (D2 R9 — reputation_mechanics.md:216-217).
   * (1) ForbiddenTriadInterestFlagEvent — biases the dispatch tick toward the flagged pair's buildings
   *     (district-level; pairKey latched in latchedTriadPairs). The no-event path (no latched pair) is
   *     BYTE-IDENTICAL to the original hash-deterministic scheduled fill (zero-regression: additive only).
   * (2) HiddenCurriculumLeakMISEvent — queues a high-priority INFORMANT entry for the affected district;
   *     consumed on the next dispatch tick (stored in pendingMISLeakInjects).
   */
  private subscribeToMISRouting(): void {
    this.bus.onForbiddenTriadInterestFlag((e) => this.handleForbiddenTriadInterestFlag(e));
    this.bus.onHiddenCurriculumLeakMIS((e) => this.handleHiddenCurriculumLeakMIS(e));
  }

  /**
   * Handle a ForbiddenTriadInterestFlagEvent (R9 — ForbiddenTriad → MIS bias). When the observer NPC
   * flips its interest_flag for a pair, latch the pairKey in memory for the player. The NEXT dispatch
   * tick for any district biases one additional SCHEDULED entry toward the flagged pair's buildings via
   * pairKey-seeded hash variation. The no-event path (pairKey NOT latched) is byte-identical to the
   * pre-R9 hash-deterministic path (zero-regression: the bias is strictly ADDITIVE).
   *
   * TD-120: the observer-NPC actor itself (routing to a specific building) is deferred — here we
   * approximate by biasing the hash seed with the pairKey string hash (district-level targeting
   * toward the flagged pair's operational footprint). Full NPC actor routing → R13.
   */
  handleForbiddenTriadInterestFlag(e: ForbiddenTriadInterestFlagEvent): void {
    let pairs = this.latchedTriadPairs.get(e.playerId);
    if (!pairs) {
      pairs = new Set<string>();
      this.latchedTriadPairs.set(e.playerId, pairs);
    }
    pairs.add(e.pairKey);
    this.logger.log(
      `R9 MIS bias: ForbiddenTriadInterestFlag latched pairKey="${e.pairKey}" for player ${e.playerId}`,
    );
  }

  /**
   * Handle a HiddenCurriculumLeakMISEvent (R9 — HiddenCurriculum → MIS INFORMANT inject). When a
   * lieutenant with silence_at_handoffs=OFF leaks, queue a high-priority INFORMANT entry for the
   * affected district's queue (consumed at the NEXT dispatch tick — cannot await DB in a sync handler).
   *
   * The priority is bounded by mis_leak_priority_boost (≤HIGH, capped below CRITICAL — TD-021:
   * full DispatcherState deferred to R13; the bound here is a conservative applicative cap). REUSE:
   * enqueueWithOverflow (Inv 3 overflow still applies — the inject cannot push past the cap without
   * dropping an older LOW entry). Source = INFORMANT (existing QueueEntrySource member).
   *
   * Multiple leaks for the same district arriving between dispatch ticks: the latest wins (idempotent
   * absorb by overwrite — one INFORMANT entry per district per tick).
   */
  handleHiddenCurriculumLeakMIS(e: HiddenCurriculumLeakMISEvent): void {
    let injects = this.pendingMISLeakInjects.get(e.playerId);
    if (!injects) {
      injects = new Map<number, { lieutenantId: string; gameMinute: number }>();
      this.pendingMISLeakInjects.set(e.playerId, injects);
    }
    // Latest leak for the same district wins (idempotent absorb by overwrite).
    injects.set(e.districtId, { lieutenantId: e.lieutenantId, gameMinute: e.gameMinute });
    this.logger.log(
      `R9 MIS leak: HiddenCurriculumLeakMIS queued for district ${e.districtId} player ${e.playerId}` +
        ` (lieutenant=${e.lieutenantId})`,
    );
  }

  /**
   * Register the single TWELVE_H cadence slot System 6 occupies (one CitySimSystem — the registry contract).
   * TWELVE_H/2 (inspection queue) replaces the no-op placeholder the SCHEDULE seeded for INSPECTION_QUEUE.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.INSPECTION_QUEUE,
      cadence: Cadence.TWELVE_H,
      order: 2,
      run: (ctx) => this.runDispatchTick(ctx),
    });
  }

  /** F4 RAM budget log (system_6 §Docker RAM budget): ~272 B × 18 districts ≈ 4.9 KB per player (negligible). */
  private logRamBudget(): void {
    const kb = ((272 * inspectionTunables.districtCount) / 1024).toFixed(1);
    this.logger.log(
      `Inspection Queue per-player RAM budget ≈ ${kb} KB (${inspectionTunables.districtCount} districts × ~272 B ` +
        `InspectionQueue, PERSISTED in inspection_queues). Subscribes CohesionStateChangedEvent (cascade, Inv 5); ` +
        `emits BuildingEvidenceFoundEvent (BPD referral, Inv 6). FalseReportLedger BUILT (TD-012 — migration 0036). ` +
        `Informant-fee charge DEFERRED P2. System 7 mismatch targeting DEFERRED Phase 1.`,
    );
  }

  // ───────────────────────────── the cascade handler (System 5 → System 6, Inv 5/7) ─────────────────────────────

  /**
   * Handle a CohesionStateChangedEvent (Inv 5 cascade). On a transition TO THAWED: increment the district's
   * cascade depth (bounded by cascade_depth_max — Inv 7) and ARM a cascade to fire at gameMinute +
   * cascade_propagation_delay_ticks (the propagation delay). On a transition AWAY from THAWED (STABLE/FRAGILE):
   * clear the active cascade depth for the district (the daily-reset-equivalent — depth does not persist past a
   * recovery). Cascade = AMPLIFICATION (extra queue entries), NOT a direct inspection (Inv 5).
   */
  handleCohesionStateChanged(e: CohesionStateChangedEvent): void {
    if (e.to === 'THAWED') {
      const depthMap = this.depthMapFor(e.playerId);
      const current = depthMap.get(e.districtId) ?? 0;
      if (current < inspectionTunables.cascadeDepthMax) {
        const next = current + 1;
        depthMap.set(e.districtId, next);
        const pendMap = this.pendingMapFor(e.playerId);
        pendMap.set(e.districtId, {
          depth: next,
          fireAtGameMinute: e.gameMinute + inspectionTunables.cascadePropagationDelayTicks,
        });
      }
    } else {
      // Left THAWED → clear the active cascade depth + any pending cascade for this district.
      this.depthMapFor(e.playerId).delete(e.districtId);
      this.pendingMapFor(e.playerId).delete(e.districtId);
    }
  }

  private depthMapFor(playerId: string): Map<number, number> {
    let m = this.cascadeDepth.get(playerId);
    if (!m) {
      m = new Map<number, number>();
      this.cascadeDepth.set(playerId, m);
    }
    return m;
  }

  private pendingMapFor(playerId: string): Map<number, PendingCascade> {
    let m = this.pendingCascades.get(playerId);
    if (!m) {
      m = new Map<number, PendingCascade>();
      this.pendingCascades.set(playerId, m);
    }
    return m;
  }

  // ───────────────────────────── the registered 12h dispatch tick ─────────────────────────────

  /**
   * {TWELVE_H, order 2} — the inspection dispatch tick (system_6 §Update tick). For each of the player's 18
   * districts: fill from SCHEDULED audits (Phase 1) + any armed cascade (Inv 5), apply overflow (Inv 3),
   * dispatch (Phase B — FIFO within priority, emit BuildingEvidenceFoundEvent on evidence, Inv 6), decay
   * non-dispatched entries (Phase C/D). Persists the whole batch in ONE UPDATE. Deterministic (NO RNG).
   */
  private async runDispatchTick(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);

    const states = await this.repo.listQueues(ctx.playerId);
    if (states.length === 0) return;

    const pendMap = this.pendingMapFor(ctx.playerId);
    const mutations: InspectionQueueMutation[] = [];
    // Collect cross-system emissions to fire AFTER the persist (observe → persist → notify ordering).
    const emissions: Array<() => void> = [];

    for (const s of states) {
      const entries = [...s.entries];

      // ── QUEUE FILL (Phase 1 — SCHEDULED audits, deterministic; no RNG). ──
      const scheduled = this.scheduledAuditsForTick(ctx.gameMinute, s.district_id);
      for (let i = 0; i < scheduled; i += 1) {
        const buildingId = this.scheduledBuildingId(ctx.gameMinute, s.district_id, i);
        this.enqueueWithOverflow(entries, {
          building_id: buildingId,
          priority_bucket: this.scheduledPriority(ctx.gameMinute, s.district_id, i),
          age_in_ticks: 0,
          source: 'SCHEDULED',
          decay_accumulator: 0,
        }, s.district_id);
      }

      // ── R9 MIS BIAS (ForbiddenTriadInterestFlag): when a pair's interest_flag is latched for the player,
      // inject one additional SCHEDULED entry biased toward the flagged pair's buildings (pairKey-seeded hash).
      // The no-event path (no latched pair) is BYTE-IDENTICAL to the original scheduled fill (zero-regression:
      // the bias is strictly ADDITIVE — one extra entry, only when a flag is present). TD-120: the full
      // NPC-actor routing (to a specific building) is deferred to R13; here the hash seed approximates the
      // pair's operational footprint at the district level. ──
      const latchedPairsForPlayer = this.latchedTriadPairs.get(ctx.playerId);
      if (latchedPairsForPlayer && latchedPairsForPlayer.size > 0) {
        const pairBias = this.hashString(Array.from(latchedPairsForPlayer).sort().join(','));
        const biasedBuildingId = 1 + (this.hash((ctx.gameMinute + pairBias) >>> 0, s.district_id * 43, 71) % 1000);
        this.enqueueWithOverflow(entries, {
          building_id: biasedBuildingId,
          priority_bucket: this.scheduledPriority(ctx.gameMinute, s.district_id, scheduled),
          age_in_ticks: 0,
          source: 'SCHEDULED',
          decay_accumulator: 0,
        }, s.district_id);
      }

      // ── CASCADE (Inv 5 — amplification; fires when an armed cascade's propagation delay has elapsed). ──
      const pending = pendMap.get(s.district_id);
      if (pending && ctx.gameMinute >= pending.fireAtGameMinute) {
        const injected = this.generateCascadeEntries(entries, ctx.gameMinute, s.district_id, pending.depth);
        pendMap.delete(s.district_id);
        if (injected > 0) {
          const districtId = s.district_id;
          const playerId = ctx.playerId;
          const gameMinute = ctx.gameMinute;
          const depth = pending.depth;
          emissions.push(() =>
            this.bus.emitInspectionCascadeTriggered({
              type: 'inspection_cascade_triggered',
              playerId,
              districtId,
              cascadeDepth: depth,
              entriesInjected: injected,
              gameMinute,
            }),
          );
        }
      }

      // ── R9 MIS LEAK INJECT (HiddenCurriculumLeakMIS): inject a high-priority INFORMANT entry for the
      // affected district if a pending leak is queued (D2 R9, reputation_mechanics.md:174/:217).
      // Priority bounded at ≤HIGH (misLeakPriorityBoostRank ≤ 2 — TD-021 applicative cap; the inject cannot
      // reach CRITICAL, so overflow drop-low-first (Inv 3) preserves CRITICAL entries when saturated).
      // Building id biased toward the flagged pair's footprint if a latched pair exists, otherwise pure hash.
      // The inject is consumed once per tick (removed from the pending map after use). ──
      const misInjectMap = this.pendingMISLeakInjects.get(ctx.playerId);
      const misInject = misInjectMap?.get(s.district_id);
      if (misInject) {
        const boostRank = inspectionTunables.misLeakPriorityBoostRank;
        const PRIORITY_BY_RANK: PriorityBucket[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const priority: PriorityBucket = PRIORITY_BY_RANK[Math.min(boostRank, PRIORITY_BY_RANK.length - 1)] ?? 'HIGH';
        // Building id: bias toward latched pair's footprint if present, else hash-deterministic.
        const latchedPairs2 = this.latchedTriadPairs.get(ctx.playerId);
        const pairBias2 = latchedPairs2 && latchedPairs2.size > 0
          ? this.hashString(Array.from(latchedPairs2).sort().join(','))
          : 0;
        const leakBuildingId =
          1 + (this.hash((ctx.gameMinute + pairBias2) >>> 0, s.district_id * 97, 61) % 1000);
        this.enqueueWithOverflow(entries, {
          building_id: leakBuildingId,
          priority_bucket: priority,
          age_in_ticks: 0,
          source: 'INFORMANT',
          decay_accumulator: 0,
        }, s.district_id);
        misInjectMap!.delete(s.district_id);
        // Increment the per-player TEST-ONLY inject counter so E2E specs can assert the inject path ran.
        this.misLeakInjectCounters.set(
          ctx.playerId,
          (this.misLeakInjectCounters.get(ctx.playerId) ?? 0) + 1,
        );
        this.logger.log(
          `R9 MIS leak: injected INFORMANT entry (priority=${priority}) for district ${s.district_id}` +
            ` player ${ctx.playerId} (lieutenant=${misInject.lieutenantId})`,
        );
      }

      // ── Phase A — EFFECTIVE RATE + inspections this cycle (2 cycles/day → floor(rate/2)). ──
      const effectiveRate = Math.max(1, s.processing_rate_per_day + s.budget_modifier);
      const inspectionsThisCycle = Math.floor(effectiveRate / 2);

      // ── Phase B — DISPATCH (FIFO within priority): dispatch inspectionsThisCycle entries from the head. ──
      const dispatched = this.dispatch(entries, inspectionsThisCycle);
      for (const entry of dispatched) {
        // C22 DIV-2: FORENSIC entries skip the building-hash outcome and emit ForensicEntryDispatched instead.
        // DECISION (C22): a FORENSIC entry routes via the §4.3 dispatcher consequence (InspectionQueueDispatcherService)
        // and does NOT run the building-hash outcome — the forensic consequence IS the real consequence (seizure /
        // heat / observation); running the hash proxy on top would double-count. The NON-forensic dispatch path
        // (SCHEDULED/INFORMANT/FALSE_REPORT/GENUINE_REPORT/CASCADE) is BYTE-IDENTICAL to the pre-C22 code.
        if (entry.source === 'FORENSIC' && entry.forensic_kind !== undefined) {
          const districtId = s.district_id;
          const playerId = ctx.playerId;
          const gameMinute = ctx.gameMinute;
          const buildingId = entry.building_id;
          const forensicKind = entry.forensic_kind;
          const priorityBucket = entry.priority_bucket;
          // Collect the emit to fire AFTER the persist (same ordering as the non-forensic BuildingEvidenceFoundEvent).
          emissions.push(() =>
            this.bus.emitForensicEntryDispatched({
              type: 'forensic_entry_dispatched',
              playerId,
              districtId,
              buildingId,
              forensicKind,
              priorityBucket,
              gameMinute,
            } as ForensicEntryDispatchedEvent),
          );
          // FORENSIC entry: NO building-hash outcome, NO BuildingEvidenceFoundEvent.
          // The §4.3 dispatcher consequence fires via the bus subscriber (InspectionQueueDispatcherService).
          continue;
        }

        // ── NON-FORENSIC dispatch path (BYTE-IDENTICAL to pre-C22) ──
        const outcome = this.inspectionOutcome(entry.building_id, ctx.gameMinute);
        const severity = this.evidenceSeverity(outcome);
        if (severity !== null) {
          // Inv 6 — BPD referral: a conditional OBSERVATION (not a raid). System 3 consumes it.
          const districtId = s.district_id;
          const playerId = ctx.playerId;
          const gameMinute = ctx.gameMinute;
          const buildingId = entry.building_id;
          const sev = severity;
          emissions.push(() =>
            this.bus.emitBuildingEvidenceFound({
              type: 'building_evidence_found',
              playerId,
              districtId,
              buildingId,
              severity: sev,
              gameMinute,
            }),
          );
        }
      }

      // ── Phase C / D — PRIORITY DECAY: age + accrue the decay accumulator on the NON-dispatched survivors. ──
      this.applyPriorityDecay(entries, s.district_id);

      mutations.push({
        district_id: s.district_id,
        entries,
        length: entries.length,
        processing_rate_per_day: s.processing_rate_per_day,
        budget_modifier: s.budget_modifier,
      });
    }

    if (mutations.length > 0) await this.repo.applyQueues(ctx.playerId, mutations);
    // Notify AFTER the persist so consumers (System 3) observe the committed state (ordered side-effects).
    for (const emit of emissions) emit();
  }

  // ───────────────────────────── queue fill: SCHEDULED audits (deterministic) ─────────────────────────────

  /**
   * How many SCHEDULED audit entries this district receives this 12h tick (Phase 1 fill source). DETERMINISTIC
   * (no RNG): a stable hash of (gameMinute, district) → 0..2 entries. The variation across ticks/districts makes
   * the queue FILL observably over cycles while staying bounded with the dispatch rate (the E2E asserts both the
   * fill and the dispatch reduction). The unconformity-audit-pin source (System 7) + the false-report source
   * (player action) land later — see SCOPE.
   */
  private scheduledAuditsForTick(gameMinute: number, districtId: number): number {
    // 1..3 entries (avg 2 = the floor(rate/2) dispatch per cycle): busy ticks (3) exceed dispatch (2) so the
    // queue ACCUMULATES a modest backlog over cycles (the MIS-receives-more-than-it-processes shape — the
    // BACKLOGGED regime + overflow are reachable), while quiet ticks (1) let dispatch drain it. Deterministic.
    return 1 + (this.hash(gameMinute, districtId, 7) % 3);
  }

  /** A deterministic SCHEDULED target building id (no RNG — a stable hash; real building coupling lands later). */
  private scheduledBuildingId(gameMinute: number, districtId: number, i: number): number {
    return 1 + (this.hash(gameMinute, districtId * 31 + i, 13) % 1000);
  }

  /**
   * The deterministic priority bucket for a SCHEDULED audit (Inv 2 — an enum, never a float). The GDD's
   * report_severity 1..5 maps to the 4 buckets internally (R2.2); here a stable hash picks a bucket skewed to
   * LOW/MEDIUM (most scheduled audits are routine — so the overflow drop-low-first policy has LOW entries to
   * drop, the Inv 3 mechanic). Distribution: ~50% LOW, ~30% MEDIUM, ~15% HIGH, ~5% CRITICAL.
   */
  private scheduledPriority(gameMinute: number, districtId: number, i: number): PriorityBucket {
    const r = this.hash(gameMinute, districtId * 17 + i, 23) % 20; // 0..19
    if (r < 10) return 'LOW'; // 50%
    if (r < 16) return 'MEDIUM'; // 30%
    if (r < 19) return 'HIGH'; // 15%
    return 'CRITICAL'; // 5%
  }

  // ───────────────────────────── cascade entry generation (Inv 5 amplification) ─────────────────────────────

  /**
   * Generate cascade entries for a THAWED district (Inv 5 — AMPLIFICATION, not a direct inspection). The count
   * is bounded by the cascade depth (Inv 7 — cascade_entries_count = depth, each a CASCADE-source entry routed
   * through the normal dispatch cycle). Target buildings are a deterministic district-pool pick (System 7
   * mismatch_score targeting DEFERRED — the spec's "random selection if no score" branch, made deterministic).
   * Entries default to MEDIUM priority (system_6 §Update tick cascade Phase B). Overflow (Inv 3) applies if the
   * queue is saturated. Returns the number of entries actually injected.
   */
  private generateCascadeEntries(
    entries: QueueEntry[],
    gameMinute: number,
    districtId: number,
    depth: number,
  ): number {
    // cascade_entries_count = cascade_depth_current × cascade_depth_max (system_6 §Update tick cascade Phase B).
    // A single thaw (depth 1) injects cascade_depth_max entries; deeper cascades scale linearly. Bounded by
    // Inv 7 (depth ≤ cascade_depth_max), so the per-fire count ≤ cascade_depth_max² — overflow (Inv 3) caps the
    // queue regardless. The amplification is visible volume (more than the per-cycle dispatch can clear in one
    // tick), which is the point: a thaw intensifies the district's MIS pressure.
    const count = depth * inspectionTunables.cascadeDepthMax;
    let injected = 0;
    for (let i = 0; i < count; i += 1) {
      // INFORMANT vs CASCADE: the spec distinguishes them (INFORMANT = rich-NPC spawn pool, System 2; CASCADE =
      // direct generation by this service). Both are "extra INFORMANT/CASCADE entries" amplifying the thawed
      // district. Day-1 we tag them CASCADE (this service IS the direct generator); the rich-NPC INFORMANT spawn
      // path routes through System 2 (not a thaw-driven spawn Phase 1) — honest: the source is CASCADE here.
      const source: QueueEntrySource = 'CASCADE';
      const buildingId = this.scheduledBuildingId(gameMinute, districtId * 53 + i, i + 100);
      this.enqueueWithOverflow(entries, {
        building_id: buildingId,
        priority_bucket: 'MEDIUM',
        age_in_ticks: 0,
        source,
        decay_accumulator: 0,
      }, districtId);
      injected += 1;
    }
    return injected;
  }

  // ───────────────────────────── checkpoint inspection-density (04e-A1 C9, design §4.4) ─────────────────────────────

  /**
   * The EFFECTIVE MIS queue cap for `districtId` (04e-A1 C9 — ★ Substrate 4: checkpoint inspection-
   * density). Starts from the SAME C5 DISTRICT-scoped lever (`inspectionQueueCapFor`) every other MIS
   * consumer already reads, then — ONLY when `districtId` is a river-crossing district
   * (`riverCrossingDistrictIds`, boot-loaded from `threnny_edges.inspection_queue_district_id`) — folds
   * in the checkpoint-density RATIO (`checkpointDensityRatioFor`): ratio=1 at base (no active E-POL-08-
   * shaped modifier) → byte-identical to the plain C5 cap (the zero-regression contract); ratio=1.6 when
   * a DISTRICT modifier on `checkpoint_inspection_density_default` is active AT THAT district → the
   * effective cap rises (never touched at a non-crossing district, which never reaches the ratio branch
   * at all — structurally unaffected regardless of any modifier's scope_ref).
   *
   * No `districtId` (the ungated GLOBAL case — no caller today) → the plain GLOBAL-only cap, never
   * checkpoint-boosted (density is inherently district-scoped, design §4.4).
   */
  private effectiveQueueCapFor(districtId?: number): number {
    const scope = districtId !== undefined ? { districtId: String(districtId) } : undefined;
    const cap = inspectionTunables.inspectionQueueCapFor(scope);
    if (districtId === undefined || !this.riverCrossingDistrictIds.has(districtId)) return cap;
    const ratio = inspectionTunables.checkpointDensityRatioFor(scope);
    return Math.max(1, Math.round(cap * ratio));
  }

  // ───────────────────────────── overflow (Inv 3 — drop-low-first, NOT FIFO) ─────────────────────────────

  /**
   * Append an entry, applying the Inv 3 overflow policy if the queue is at cap. The policy is NOT pure FIFO:
   * when length would exceed inspection_queue_cap, drop the OLDEST LOW-bucket entry (the front-most LOW — the
   * player-exploitable blind spot: a HIGH/CRITICAL entry survives over an old LOW one). If NO LOW entry exists,
   * drop the oldest entry regardless of bucket (the dangerous case — a HIGH/CRITICAL report can be lost). Then
   * append the new entry. The queue stays bounded at inspection_queue_cap.
   *
   * `districtId` (04e-A1 C5, §6.1 live MIS-cap lever; C9 checkpoint-density boost, design §4.4) — optional,
   * threaded by every caller inside the per-district dispatch-tick loop so a DISTRICT `effect_modifier` on
   * `T.city.inspection_queue_cap` (C5) OR `checkpoint_inspection_density_default` (C9, river-crossing
   * districts only) raises/lowers the cap ONLY for its own district; a GLOBAL modifier still applies at
   * every district. Omitting it (no caller today does) would fall back to a GLOBAL-only resolution.
   */
  private enqueueWithOverflow(entries: QueueEntry[], entry: QueueEntry, districtId?: number): void {
    const cap = this.effectiveQueueCapFor(districtId);
    if (entries.length >= cap) {
      // Find the OLDEST LOW-bucket entry (entries[0] = oldest = head; scan front→back for the first LOW).
      const lowIdx = entries.findIndex((e) => e.priority_bucket === 'LOW');
      if (lowIdx >= 0) {
        entries.splice(lowIdx, 1); // drop the oldest LOW (Inv 3 drop-low-first).
      } else {
        entries.shift(); // no LOW → drop the oldest entry regardless (the dangerous HIGH/CRITICAL-loss case).
      }
    }
    entries.push(entry);
  }

  // ───────────────────────────── dispatch (Phase B — FIFO within priority) ─────────────────────────────

  /**
   * Dispatch up to `count` entries from the queue in dispatch ORDER (highest priority first, FIFO within a
   * priority — system_6 §Update tick Phase B "FIFO within priority"). Removes the dispatched entries from the
   * `entries` array IN PLACE and returns them (so the caller can emit BPD referrals for the evidence outcomes).
   * Mutates `entries` to the surviving (non-dispatched) entries, preserving their relative FIFO order.
   */
  private dispatch(entries: QueueEntry[], count: number): QueueEntry[] {
    if (count <= 0 || entries.length === 0) return [];
    // Stable index list ordered by (priority DESC, original position ASC = FIFO within a priority).
    const order = entries
      .map((e, idx) => ({ e, idx }))
      .sort((a, b) => PRIORITY_RANK[b.e.priority_bucket] - PRIORITY_RANK[a.e.priority_bucket] || a.idx - b.idx);
    const dispatchIdx = new Set(order.slice(0, count).map((o) => o.idx));
    const dispatched: QueueEntry[] = [];
    const survivors: QueueEntry[] = [];
    for (let i = 0; i < entries.length; i += 1) {
      if (dispatchIdx.has(i)) dispatched.push(entries[i]);
      else survivors.push(entries[i]);
    }
    // Rewrite `entries` in place with the survivors (preserve FIFO order of survivors).
    entries.length = 0;
    for (const s of survivors) entries.push(s);
    return dispatched;
  }

  // ───────────────────────────── priority decay (Phase C / D) ─────────────────────────────

  /**
   * Age the surviving entries one tick + accrue the priority-decay accumulator (system_6 §Update tick Phase D).
   * Per 12h cycle each entry accrues priority_decay_per_day/2 (the 12h tick fires twice/day). When the
   * accumulator reaches 1.0 the priority_bucket descends one rank (CRITICAL→HIGH→MEDIUM→LOW) and the accumulator
   * resets (carrying the remainder). The EXPOSED priority stays the enum (Inv 2 — the accumulator is an internal
   * decay timer, never a priority float and never surfaced).
   *
   * `districtId` (04e-A1 C5, §6.1 live MIS-decay lever) — optional, threaded by the dispatch tick's per-district
   * caller so a DISTRICT `effect_modifier` on `T.mis.priority_decay_per_day` shifts decay ONLY for its own
   * district; a GLOBAL modifier still applies at every district.
   */
  private applyPriorityDecay(entries: QueueEntry[], districtId?: number): void {
    const perCycle = inspectionTunables.priorityDecayPerDayFor(districtId !== undefined ? { districtId: String(districtId) } : undefined) / 2;
    for (const e of entries) {
      e.age_in_ticks += 1;
      e.decay_accumulator += perCycle;
      while (e.decay_accumulator >= 1.0) {
        e.decay_accumulator -= 1.0;
        e.priority_bucket = PRIORITY_DESCENT[e.priority_bucket];
        if (e.priority_bucket === 'LOW') {
          // LOW is the floor — stop accruing descent (no rank below LOW; clamp the accumulator).
          e.decay_accumulator = 0;
          break;
        }
      }
    }
  }

  // ───────────────────────────── deterministic outcome + helpers (NO RNG) ─────────────────────────────

  /**
   * The deterministic inspection outcome for a dispatched entry (system_6 §Update tick Phase B). A stable hash
   * of (building_id, gameMinute) → an outcome band. NO RNG. Real building-state coupling (reading the building's
   * actual structural state) lands with System 7 / the building lifecycle; day-1 this is a deterministic proxy.
   * Distribution skews CLEAN (most inspections find nothing) with a tail of evidence outcomes (the BPD referral).
   */
  private inspectionOutcome(buildingId: number, gameMinute: number): InspectionOutcome {
    const r = this.hash(buildingId, gameMinute, 41) % 100; // 0..99
    if (r < 70) return 'CLEAN'; // 70% — most inspections find nothing.
    if (r < 88) return 'VIOLATION_MINOR'; // 18% — a minor violation (no BPD referral).
    if (r < 97) return 'VIOLATION_MAJOR'; // 9% — asset freeze + BPD referral (HIGH).
    return 'CRIMINAL_EVIDENCE'; // 3% — immediate BPD referral (CRITICAL).
  }

  /** Map an inspection outcome → the BPD-referral severity band (null = no referral; Inv 6 conditional output). */
  private evidenceSeverity(outcome: InspectionOutcome): EvidenceSeverity | null {
    if (outcome === 'CRIMINAL_EVIDENCE') return 'CRITICAL';
    if (outcome === 'VIOLATION_MAJOR') return 'HIGH';
    return null; // CLEAN / VIOLATION_MINOR → no BPD referral.
  }

  /**
   * A stable non-negative integer hash of two inputs + a salt (deterministic — NO RNG). Used for the SCHEDULED
   * audit count, target building, priority bucket, dispatch outcome, and cascade target. Two identically-
   * advanced players hash identically → identical queues (the E2E determinism assertion).
   */
  private hash(a: number, b: number, salt: number): number {
    let h = (a | 0) * 73856093;
    h ^= (b | 0) * 19349663;
    h ^= (salt | 0) * 83492791;
    h = (h ^ (h >>> 13)) >>> 0; // unsigned mix.
    return h;
  }

  /**
   * Hash a string to a non-negative unsigned integer (R9 pair-bias seed — deterministic, no RNG).
   * Used to fold the sorted pairKey set into a numeric seed for the biased building-id hash.
   * Produces a stable uint32 given the same string input.
   */
  private hashString(s: string): number {
    let h = 0x811c9dc5; // FNV-1a 32-bit offset basis.
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0; // FNV prime, unsigned.
    }
    return h;
  }

  // ───────────────────────────── lazy seed ─────────────────────────────

  /**
   * Lazily seed the player's 18 inspection_queues rows on first dispatch tick. Idempotent at THREE layers
   * (mirrors CohesionPermafrost): (1) the per-process Set fast-path; (2) a DB COUNT short-circuit; (3) the
   * DURABLE race-safe guard in the repository's seedDistricts (advisory lock + NOT EXISTS).
   */
  private async ensureSeeded(playerId: string): Promise<void> {
    if (this.seededPlayers.has(playerId)) return;
    const existing = await this.repo.countDistricts(playerId);
    if (existing === 0) {
      await this.repo.seedDistricts(playerId, this.districtIds);
      this.logger.log(`lazily seeded ${this.districtIds.length} inspection_queues rows for player ${playerId}`);
    }
    this.seededPlayers.add(playerId);
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * getQueueRaw — the read for ONE district's inspection queue the projection buckets into a qualitative
   * queue-load band + a type/severity distribution. Reads from the DB (the authoritative persisted state). null
   * if the district row does not exist. The RAW positions / building ids / exact counts live here but the
   * projection NEVER forwards them (Inv 4 — the position is server truth; the projection exposes only the
   * qualitative load + the distribution shape, never positions/buildings/counts).
   */
  async getQueueRaw(playerId: string, districtId: number): Promise<InspectionQueueState | null> {
    return this.repo.getQueue(playerId, districtId);
  }

  /** The cap (used by the projection to bucket the queue load relative to capacity — Inv 4). */
  get queueCap(): number {
    return inspectionTunables.inspectionQueueCap;
  }

  /**
   * The cap for ONE district — scoped variant (04e-A1 C5, §6.1 live MIS-cap lever; C9 checkpoint-density
   * boost, design §4.4). The projection threads its own `districtId` here
   * (`inspection.projection.service.ts:112,97`) so a DISTRICT `effect_modifier` on `T.city.inspection_queue_cap`
   * (C5) OR `checkpoint_inspection_density_default` (C9, river-crossing districts only) is reflected in that
   * district's queue-load band too — the SAME `effectiveQueueCapFor` the dispatch tick itself enforces
   * (`enqueueWithOverflow`), so the projection's load-vs-capacity ratio never drifts from the real cap.
   */
  queueCapFor(districtId: number): number {
    return this.effectiveQueueCapFor(districtId);
  }

  /**
   * The minimal DispatcherRegime for a district (system_6 §États DispatcherRegime — minimal enum). Derived from
   * the queue fill ratio + the budget_modifier (full DispatcherState detail DEFERRED). NOMINAL by default;
   * BACKLOGGED at/over 80% of the cap; BUDGET_CUT / SURGE on a negative / positive budget_modifier.
   * 04e-A1 C5: `state.district_id` (already part of the `state` param — no signature change) threads the
   * scoped cap lever so a DISTRICT modifier shifts the BACKLOGGED threshold only for its own district.
   * 04e-A1 C9: the cap read is `effectiveQueueCapFor` (checkpoint-density-boosted at river-crossing districts).
   */
  dispatcherRegime(state: InspectionQueueState): DispatcherRegime {
    if (state.budget_modifier < 0) return 'BUDGET_CUT';
    if (state.budget_modifier > 0) return 'SURGE';
    const cap = this.effectiveQueueCapFor(state.district_id);
    if (state.length >= cap * BACKLOGGED_FILL_RATIO) return 'BACKLOGGED';
    return 'NOMINAL';
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 404). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= inspectionTunables.districtCount;
  }

  /**
   * R9 TEST-ONLY: returns how many times an INFORMANT inject was actually applied (enqueueWithOverflow
   * called for source=INFORMANT) for the given player since process start. Resets to 0 per fresh
   * player (the counter is keyed by playerId — fresh-UUID players start at 0). Used by
   * GET /v1/_test/reputation/mis/inject-counter to assert the inject path executed ≥1× without
   * relying on a fragile survivor-in-DB assertion (the INFORMANT entry may be dispatched in Phase B
   * the same tick). Not used in production logic.
   */
  getMISInjectCount(playerId: string): number {
    return this.misLeakInjectCounters.get(playerId) ?? 0;
  }

  /**
   * TEST-ONLY bridge — drives the private `runDispatchTick` directly for the C22 E2E.
   *
   * Exposes the real dispatch loop (Phase A/B/C) for a specific player + gameMinute without
   * waiting for the TWELVE_H/2 scheduler to fire. The `ForensicTestController.dispatchQueue` route
   * injects `InspectionQueueService` and calls this method. The real dispatch path runs — real DB,
   * real bus emit, real `InspectionQueueDispatcherService` subscriber.
   *
   * C22: used by `POST /v1/_test/forensic/dispatch-queue` to drain FORENSIC entries and route them
   * to `InspectionQueueDispatcherService.onForensicEntryDispatched` via the bus.
   *
   * @param playerId - the player UUID for whom to run the dispatch tick.
   * @param gameMinute - the game-minute to use as ctx.gameMinute (determines dispatch outcome hashes).
   * @param districtId - optional: if provided, only the seed / dispatch for this district matters
   *   (the loop still runs all 18 districts, but only the supplied district has a seeded FORENSIC
   *   entry — all others are organically no-op). Providing it is informational only (unused by
   *   the implementation below — `runDispatchTick` already iterates all districts).
   * R2.2: TEST-ONLY. Not registered in production (gated by testControllersEnabled() in
   *   ForensicSignalingModule for the controller — this method is always compiled but the route
   *   that calls it is not mounted in production).
   * No Math.random.
   */
  async runDispatchTickForTest(playerId: string, gameMinute: number): Promise<void> {
    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.TWELVE_H,
      gameMinute,
    };
    await this.runDispatchTick(ctx);
  }
}

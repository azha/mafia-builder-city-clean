// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md
//             §Invariants canoniques (Inv 1 R2.2 strict — heat NEVER a float to the player, only a HeatBucket overlay;
//                                     Inv 2 heat = cross-system SIGNAL (police attention), not an HP bar — effect always
//                                     MEDIATED by Systems 3/4/7; Inv 3 per-entity 3 granularities building/district/
//                                     citywide; Inv 4 decay = HALF-LIFE exponential — cools even without activity;
//                                     Inv 5 propagation = SPATIAL heat shadow within radius + Stack-profile dampening;
//                                     Inv 6 escalation = threshold → HeatEscalationEvent; Inv 7 citywide = qualitative
//                                     peak aggregate, never a float sum)
//             §États HeatState (building persisted buildings.heat / district in-memory / citywide in-memory)
//             §Update tick (Phase A decay half-life; Phase B spatial propagation; Phase C escalation; Phase D
//                           district + citywide aggregation) + §Consommation des HeatInjectionEvents
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// `HeatPropagationService` — the CROSS-SYSTEM Heat capstone (System Heat). Registered at the MINUTE/4 = HEAT slot
// the SCHEDULE seeds (after Erlang/1 → Throughput/2 → Buffer/3 — the canonical DAG System 9 → 8 → 10 → Heat). It
// REPLACES the no-op placeholder there. Copies the persisted-projection system template (repository + projection +
// controller + tunables) with the Heat-specific shape: buildings.heat is the PERSISTED per-building truth; district
// + citywide HeatState are IN-MEMORY aggregates rebuilt each tick (no columns).
//
// CADENCE RECONCILIATION (the spec's "tick every in-game minute" / the plan's mention of "daily"): the canonical
// SCHEDULE (cross_system_interactions §Ordre DAG / tick_schedule) gives Heat ONE slot — MINUTE/4 ("System 9 → 8 →
// 10 → Heat"). The spec §Update tick is explicit: "Tick every in-game minute — HeatPropagationService.runMinuteTick()".
// So Heat runs at MINUTE/4 (every in-game minute), NOT daily — the decay half-life (8 in-game hours) + the slow
// propagation factor (0.05/tick) make a per-minute tick the correct granularity (a daily tick would skip the
// shadow). Documented so a reader does not look for a daily handler the SCHEDULE never gives this system.
//
// THE MINUTE/4 TICK (heat_propagation.md §Update tick), per player, for the player's OPERATIONAL buildings:
//   - FLUSH buffered injections FIRST (the §Consommation event-driven accumulation, cadenced flush): heat injection
//     events (BufferOverflow re-emit + test hook) are BUFFERED in-memory between ticks and applied to the building's
//     heat ONCE here (never a per-event DB write — the System-10/12 2 Hz / event-storm lesson from T11/T12).
//   - Phase A — DECAY (Inv 4, half-life): heat ×= 0.5^(1 / (half_life_hours × 60)) per minute tick. Cools even with
//     no injection (long-absence cooling — the feature). A building below the DORMANT floor is excluded from the
//     decay compute (compute saving — Inv §DecayState DORMANT) but still re-activates on a fresh injection.
//   - Phase B — PROPAGATION (Inv 5, spatial heat shadow): a building with heat ≥ HOT propagates a fraction
//     (heat_propagation_factor_per_tick) of its heat to buildings within heat_propagation_radius_tiles tiles
//     (Chebyshev block-coordinate distance) — NOT district-wide. Stack-profile districts DAMPEN the factor by
//     stack_district_heat_propagation_dampening_pct. A district in Cohesion FROZEN (CohesionStateChanged) further
//     SUPPRESSES propagation (PropagationState.SUPPRESSED — a 50% cold-district damping, §Update tick Phase B note 7).
//   - Phase C — ESCALATION (Inv 6): a building crossing heat_escalation_threshold emits a HeatEscalationEvent
//     (the discrete cross-system signal). The WIRED Phase-1 consumer is System 4 (Patrol Doctrine — raised
//     observation severity on the escalated block); System 3/7 are the documented seam.
//   - Phase D — AGGREGATION (Inv 7): the in-memory per-district HeatBucket = the PEAK building bucket (qualitative,
//     never a float sum); the citywide aggregate = the PEAK district bucket. Stored in-memory (rebuilt each tick).
//
// IN-MEMORY STATE KEYED BY PLAYERID (the T10/T11 review lesson — NOT entity-keyed): the per-player working state
// (the buffered injections + the per-district/citywide aggregates + the suppressed-districts set) is keyed BY
// playerId. The per-building/district aggregate maps are REBUILT/REPLACED each tick from the current building set,
// so a removed building leaves NO stale entry. The buffered-injections map is drained each tick (the injection
// queue is consumed, never accumulating dead state). The PERSISTED truth is buildings.heat.
//
// CROSS-SYSTEM CONSUME (heat_propagation.md §Event consumers — the HeatInjectionEvent catalogue):
//   - BufferOverflowEvent (System 10 — BUILT) → the Heat service's BufferOverflow subscriber RE-EMITS it as a
//     HeatInjectionEvent (LOW_MEDIUM, BUFFER_OVERFLOW) on its own building → buffered → flushed. The ONE wired source.
//   - HeatInjectionEvent directly (the canonical seam) → buffered → flushed. The production-gated test hook emits
//     this to exercise injection deterministically; the P2 operational producers (CASH_OVERFLOW System 8 /
//     STASH_OPEN System 9 / LEK_DEAL System 11 / FLOW_CONGESTION System 1) are the DEFERRED sources the seam exists
//     for (documented — no organic producer Phase 1 beyond System 10's overflow).
//   - CohesionStateChangedEvent FROZEN-equivalent (THAWED↔ the band) → the SUPPRESSED propagation modifier (Inv
//     PropagationState). We treat a district whose latest CohesionState band is the cohesion-frozen end as
//     propagation-suppressed (cold social cohesion dampens the heat shadow — §Update tick Phase B note 7).
//
// CROSS-SYSTEM INFLUENCE (the "heat propagated cross-system" exit criterion — DECISION: WIRED to System 4): heat
// raises observation severity into System 4 (patrol), MEDIATED. We WIRE it cleanly via the event bus (no module
// cycle): Heat emits HeatEscalationEvent; System 4 (Patrol Doctrine) SUBSCRIBES (its existing FlowCellCongested
// accumulation pattern) and records a heat sighting on the escalated block → raised patrol observation severity at
// the 30-min accumulation. This makes the heat → patrol → police chain REAL + observable (the plan: "influence
// police memory + patrol"). System 3 (police memory) consumes patrol observations downstream (already wired T4/T5),
// so the chain reaches police memory transitively. System 7 (unconformity) consumption is the documented seam (no
// organic deviation input Phase 1). The READ-ONLY per-building/district heat accessor (getDistrictPeakBucket /
// getBuildingBucket) is exposed for any synchronous consumer (the magnitude-vs-band convention: the band for player
// surfaces, the internal value never escapes).
//
// DETERMINISM (NO RNG): the decay (a fixed power of the half-life), the propagation (a fixed fraction by tile
// distance + profile), the escalation (a fixed threshold), and the aggregation (a fixed peak) are FIXED functions
// of the persisted heat + tunables + static geography. Two players with identical seeded buildings + identical
// advances land on identical persisted heat + buckets (the E2E determinism assertion).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import {
  CityEventBus,
  type BufferOverflowEvent,
  type CohesionStateChangedEvent,
  type HeatBucket,
  type HeatInjectionEvent,
  type HeatInjectionMagnitude,
} from '../events/city-event-bus';
import { heatTunables, perMinuteDecayFactor, heatBucketRankOf } from './heat-tunables';
import { HeatRepository, type BuildingHeatState, type HeatMutation } from './heat.repository';
import type { RankableBuildingInput } from '../../common/fiction-names'; // C3 (D7) — listBuildingsForRanking's return shape.

/** A buffered heat injection (the §Consommation accumulation — applied once at the next MINUTE flush). */
interface BufferedInjection {
  buildingId: string;
  delta: number;
}

/**
 * The per-player in-memory heat working state (heat_propagation.md §États — the parts NOT persisted). Keyed BY
 * PLAYERID at the top level (the T10/T11 lesson — never entity-keyed). The aggregate maps are REBUILT/REPLACED every
 * MINUTE tick from the current building set (a removed building leaves no stale entry); the injection buffer is
 * DRAINED each tick (the queue is consumed). The DORMANT floor below = the buildings.heat truth is authoritative,
 * this is the derived per-player aggregate cache the projection reads + the suppressed-districts modifier.
 */
interface PlayerHeatState {
  /** Buffered heat injections to apply at the next MINUTE flush (§Consommation — accumulate between ticks). */
  injections: BufferedInjection[];
  /** Per-district PEAK HeatBucket (Inv 7 — the qualitative district aggregate; rebuilt each tick). */
  districtBucket: Map<number, HeatBucket>;
  /** Per-district escalation flag (at least one building escalated this tick — the HeatEscalationEvent side-effect). */
  districtEscalated: Map<number, boolean>;
  /** The citywide PEAK HeatBucket (Inv 7 — the qualitative citywide aggregate; never a float sum). */
  citywideBucket: HeatBucket;
  /** Districts whose propagation is SUPPRESSED (Cohesion-frozen — the cold-district damping modifier, Inv 5). */
  suppressedDistricts: Set<number>;
}

/** The DORMANT floor (heat_propagation.md §enum DecayState DORMANT) — below this a building is near-zero / inert. */
const DORMANT_FLOOR = 0.01; // ≈ the 0–255 spec's <10 floor, normalized to [0..1].

/** Internal-delta the injection magnitude bands map to (heat_propagation.md §Event consumers delta column). */
const INJECTION_DELTA: Record<HeatInjectionMagnitude, number> = {
  MICRO: 0.02, // +1–3 / 255 ≈ a faint signature (Flow congestion).
  LOW: 0.05, // +8–18 / 255 ≈ a stash open / a slow lek deal.
  LOW_MEDIUM: 0.12, // +10–25 / 255 ≈ a buffer overflow (the System-10 source).
  MEDIUM: 0.25, // +20–40 / 255 ≈ raw cash overflow in the open (System 8).
};

@Injectable()
export class HeatPropagationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeatPropagationService.name);

  /**
   * Per-player in-memory heat working state, keyed by playerId (the T10/T11 lesson — NOT keyed by building_id at the
   * top level). The aggregate maps are rebuilt/replaced per tick; the injection buffer is drained per tick.
   * Server-truth working state (rebuilt empty on restart — the buffer-bloat / dwell-time precedent; the PERSISTED
   * truth is buildings.heat).
   */
  private readonly players = new Map<string, PlayerHeatState>();

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: HeatRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: subscriptions + registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.subscribeToInjectionSources();
    this.registerCadence();
    this.logRamBudget();
  }

  /**
   * Subscribe to the cross-system heat-injection sources (heat_propagation.md §Event consumers). The handlers are
   * synchronous — they BUFFER the injection in the per-player queue (never a per-event DB write); the MINUTE/4 tick
   * flushes it. Phase 1 the WIRED source is BufferOverflow (System 10 — built); the direct HeatInjectionEvent seam
   * (the production-gated test hook + the deferred P2 producers) + the Cohesion-frozen suppression modifier.
   */
  private subscribeToInjectionSources(): void {
    // System 10 BufferOverflow → re-emit as a HeatInjection on the overflowing node's host building (the ONE wired
    // organic source — a buffer overflow drops cash on the street = a visible exposure → LOW_MEDIUM heat).
    this.bus.onBufferOverflow((e) => this.onBufferOverflow(e));
    // The canonical injection seam (the test hook emits this; the P2 producers will too when built).
    this.bus.onHeatInjection((e) => this.bufferInjection(e));
    // Cohesion FROZEN-equivalent → propagation SUPPRESSED modifier (the cold-district damping, Inv 5).
    this.bus.onCohesionStateChanged((e) => this.onCohesionStateChanged(e));
  }

  /** Register the MINUTE/4 = HEAT slot (the registry contract — Heat occupies exactly this slot per the SCHEDULE). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.HEAT,
      cadence: Cadence.MINUTE,
      order: 4,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  /** F4 RAM budget log (heat_propagation.md §RAM budget): HeatStateBldg ~8 B × buildings + districts + citywide. */
  private logRamBudget(): void {
    this.logger.log(
      `Heat per-player RAM budget ≈ 24 KB (HeatState building PERSISTED on buildings.heat; district + citywide ` +
        `aggregates DERIVED in-memory per player, rebuilt each tick). MINUTE/4 tick (flush injections → decay ` +
        `half-life → spatial heat-shadow propagation [Stack dampening + Cohesion-frozen suppression] → escalation ` +
        `→ district/citywide peak aggregate). Inv 1/2: heat = a cross-system SIGNAL (HeatBucket overlay), never a ` +
        `raw float to the player. Decay even without activity (long-absence cooling). CONSUMES BufferOverflow ` +
        `(System 10 — the one wired source); CASH/STASH/LEK/FLOW injections deferred P2 (the seam is defined). ` +
        `EMITS HeatEscalation → System 4 Patrol (the wired cross-system influence; System 3/7 the documented seam).`,
    );
  }

  // ───────────────────────────── injection sources (event-driven; BUFFER, never per-event DB write) ─────────────────

  /** Re-emit a System-10 BufferOverflow as a buffered HeatInjection on the overflowing node's host building. */
  private onBufferOverflow(e: BufferOverflowEvent): void {
    this.bufferInjection({
      type: 'heat_injection',
      playerId: e.playerId,
      districtId: e.districtId,
      buildingId: e.buildingId,
      magnitude: 'LOW_MEDIUM', // a buffer overflow = cash dropped on the street (the catalogue's LOW-MEDIUM delta).
      source: 'BUFFER_OVERFLOW',
      gameMinute: e.gameMinute,
    });
  }

  /** Buffer a heat injection for the next MINUTE flush (the §Consommation accumulation — never a per-event DB write). */
  private bufferInjection(e: HeatInjectionEvent): void {
    const st = this.ensurePlayer(e.playerId);
    st.injections.push({ buildingId: e.buildingId, delta: INJECTION_DELTA[e.magnitude] });
  }

  /**
   * Cohesion FROZEN-equivalent → mark the district propagation-SUPPRESSED (Inv 5 / §Update tick Phase B note 7 —
   * a high-cohesion / cold-social district dampens the heat shadow). The spec's CohesionState band whose semantics
   * are "high cohesion resists propagation" is STABLE (the cohesion-frozen end of the band — system_5: STABLE =
   * cohesion well above the thaw threshold). So a transition INTO STABLE suppresses; a transition AWAY (FRAGILE/
   * THAWED — eroded cohesion) releases the suppression (the neighbours no longer protect the district).
   */
  private onCohesionStateChanged(e: CohesionStateChangedEvent): void {
    const st = this.ensurePlayer(e.playerId);
    if (e.to === 'STABLE') st.suppressedDistricts.add(e.districtId);
    else st.suppressedDistricts.delete(e.districtId);
  }

  /** Lazily create (and return) the per-player working state (idempotent — the injection sources call this first). */
  private ensurePlayer(playerId: string): PlayerHeatState {
    let st = this.players.get(playerId);
    if (!st) {
      st = {
        injections: [],
        districtBucket: new Map(),
        districtEscalated: new Map(),
        citywideBucket: 'COLD',
        suppressedDistricts: new Set(),
      };
      this.players.set(playerId, st);
    }
    return st;
  }

  // ───────────────────────────── the registered MINUTE/4 tick ─────────────────────────────

  /**
   * {MINUTE, order 4} — the Heat tick (heat_propagation.md §Update tick Phases A–D + the §Consommation flush). For
   * the player's OPERATIONAL buildings: flush buffered injections, decay (half-life), propagate (spatial heat
   * shadow, Stack/Cohesion damping), escalate (threshold → HeatEscalationEvent), aggregate (district + citywide
   * peak buckets). Persists the recomputed heat in ONE batched UPDATE. Rebuilds the per-player aggregate maps fresh
   * (the T10/T11 lesson — no stale entries). Deterministic (NO RNG). Organically a no-op (buildings empty Phase 1).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const st = this.ensurePlayer(ctx.playerId);
    const drainedInjections = st.injections;
    st.injections = []; // DRAIN the buffer (consume the queue — never accumulate dead state).

    const buildings = await this.repo.listBuildings(ctx.playerId);
    if (buildings.length === 0) {
      // Organic Phase-1 reality: no buildings → reset the per-player aggregates (replace, not leak — the T10 lesson).
      this.players.set(ctx.playerId, {
        injections: [],
        districtBucket: new Map(),
        districtEscalated: new Map(),
        citywideBucket: 'COLD',
        suppressedDistricts: st.suppressedDistricts, // keep the suppression modifier (Cohesion is event-driven).
      });
      return;
    }

    // Working heat map (building_id → current heat), seeded from the persisted truth.
    const heat = new Map<string, number>();
    for (const b of buildings) heat.set(b.building_id, b.heat);

    // ── §Consommation FLUSH — apply the buffered injections FIRST (a DORMANT building re-activates here). ──
    for (const inj of drainedInjections) {
      if (!heat.has(inj.buildingId)) continue; // a building that vanished since the injection — drop it.
      heat.set(inj.buildingId, this.clamp01(heat.get(inj.buildingId)! + inj.delta));
    }

    // ── Phase A — DECAY (Inv 4, half-life). A building below the DORMANT floor is left inert (compute saving). ──
    const decayFactor = perMinuteDecayFactor(heatTunables.heatDecayHalfLifeHours);
    for (const b of buildings) {
      const h = heat.get(b.building_id)!;
      if (h < DORMANT_FLOOR) {
        heat.set(b.building_id, 0); // DORMANT → snap to exactly 0 (clean near-zero; re-activates on injection).
        continue;
      }
      heat.set(b.building_id, this.clamp01(h * decayFactor));
    }

    // ── Phase B — PROPAGATION (Inv 5, spatial heat shadow). Source heat is read from the POST-DECAY snapshot so the
    // propagation is a function of the settled heat this tick; deltas accumulate onto the neighbours' working heat. ──
    const postDecay = new Map(heat); // snapshot — propagate from the settled source, not the running total.
    const radius = heatTunables.heatPropagationRadiusTiles;
    const baseFactor = heatTunables.heatPropagationFactorPerTick;
    for (const src of buildings) {
      const srcHeat = postDecay.get(src.building_id)!;
      if (this.bucketOf(srcHeat) < this.rankOf('HOT')) continue; // only HOT/BURNING buildings cast a shadow.
      // Stack-profile dampening (Inv 5): a Stack district dampens its propagation factor.
      let factor = baseFactor;
      if (src.district_profile === 'stack') {
        factor *= 1 - heatTunables.stackDistrictHeatPropagationDampeningPct / 100;
      }
      // Cohesion-frozen suppression (Inv 5 / Phase B note 7): a SUPPRESSED district halves the factor.
      if (st.suppressedDistricts.has(src.district_id)) factor *= 0.5;
      if (factor <= 0) continue;
      const delta = srcHeat * factor;
      for (const dst of buildings) {
        if (dst.building_id === src.building_id) continue;
        if (this.tileDistance(src, dst) > radius) continue; // outside the heat-shadow radius (NOT district-wide).
        heat.set(dst.building_id, this.clamp01(heat.get(dst.building_id)! + delta));
      }
    }

    // ── Phase C — ESCALATION (Inv 6) + Phase D — AGGREGATION (Inv 7). One pass over the final heat. ──
    const districtPeakRank = new Map<number, number>();
    const districtEscalated = new Map<number, boolean>();
    const blockOf = new Map<string, number>();
    const districtOf = new Map<string, number>();
    for (const b of buildings) {
      blockOf.set(b.building_id, b.block_id);
      districtOf.set(b.building_id, b.district_id);
    }
    let citywidePeakRank = 0;
    const mutations: HeatMutation[] = [];

    for (const b of buildings) {
      const h = heat.get(b.building_id)!;
      mutations.push({ building_id: b.building_id, heat: h });

      // Phase C — escalation: a building at/above the threshold emits a discrete HeatEscalationEvent (Inv 6).
      if (h >= heatTunables.heatEscalationThreshold) {
        districtEscalated.set(b.district_id, true);
        this.bus.emitHeatEscalation({
          type: 'heat_escalation',
          playerId: ctx.playerId,
          districtId: b.district_id,
          buildingId: b.building_id,
          blockId: b.block_id,
          bucket: this.bucketName(h),
          gameMinute: ctx.gameMinute,
        });
      }

      // Phase D — aggregation: the district bucket = the PEAK building bucket; a building ≥ threshold forces BURNING.
      const rank = h >= heatTunables.heatEscalationThreshold ? this.rankOf('BURNING') : this.bucketOf(h);
      const prevRank = districtPeakRank.get(b.district_id) ?? 0;
      if (rank > prevRank) districtPeakRank.set(b.district_id, rank);
      if (rank > citywidePeakRank) citywidePeakRank = rank;
    }

    // Persist the WHOLE recomputed batch in ONE atomic UPDATE (the persisted-system template).
    await this.repo.applyHeat(ctx.playerId, mutations);

    // REPLACE the per-player aggregate maps (never mutate-in-place — the T10/T11 lesson; freshly rebuilt this tick).
    const districtBucket = new Map<number, HeatBucket>();
    for (const [districtId, rank] of districtPeakRank) districtBucket.set(districtId, this.bucketByRank(rank));
    this.players.set(ctx.playerId, {
      injections: st.injections, // anything buffered DURING this tick (sync handlers only — normally empty).
      districtBucket,
      districtEscalated,
      citywideBucket: this.bucketByRank(citywidePeakRank),
      suppressedDistricts: st.suppressedDistricts,
    });
  }

  // ───────────────────────────── heat math (deterministic, INTERNAL) ─────────────────────────────

  /** Clamp a heat value to the persisted [0,1] band (the DB CHECK b_heat_chk). INTERNAL — never exposed (R2.2). */
  private clamp01(h: number): number {
    if (!(h > 0)) return 0;
    return h >= 1 ? 1 : h;
  }

  /**
   * The Chebyshev tile distance between two buildings (max of |Δx|, |Δy| over their block coordinates — Inv 5). A
   * building's tile = its block's {x,y}. Same block → distance 0 (always within any radius ≥ 0). INTERNAL.
   */
  private tileDistance(a: BuildingHeatState, b: BuildingHeatState): number {
    return Math.max(Math.abs(a.tile_x - b.tile_x), Math.abs(a.tile_y - b.tile_y));
  }

  /** Ordinal rank of a HeatBucket (COLD < WARM < HOT < BURNING) — for the peak aggregate + the propagation gate. */
  private rankOf(bucket: HeatBucket): number {
    return { COLD: 0, WARM: 1, HOT: 2, BURNING: 3 }[bucket];
  }

  /** Map a rank back to its HeatBucket (the inverse of rankOf — the district/citywide aggregate name). */
  private bucketByRank(rank: number): HeatBucket {
    return (['COLD', 'WARM', 'HOT', 'BURNING'] as const)[Math.max(0, Math.min(3, rank))];
  }

  /**
   * Map a raw heat [0..1] → its HeatBucket RANK (the §enum HeatBucket thresholds: COLD < 0.2; WARM 0.2–0.5; HOT
   * 0.5–0.8; BURNING ≥ 0.8). INTERNAL — the raw float never escapes; the projection forwards only the band (R2.2).
   * Delegates to the CANONICAL heat-tunables threshold mapping (one source of truth — the raid-risk band reads the
   * SAME thresholds; Phase-2b T4).
   */
  private bucketOf(heat: number): number {
    return heatBucketRankOf(heat);
  }

  /** Map a raw heat [0..1] → its HeatBucket NAME (the §enum HeatBucket band — the only heat signal exposed; R2.2). */
  bucketName(heat: number): HeatBucket {
    return this.bucketByRank(this.bucketOf(heat));
  }

  // ───────────────────────────── projection-facing + cross-system READ accessors ─────────────────────────────

  /**
   * The player's OPERATIONAL buildings in ONE district (the projection read). Returns the raw building heat rows
   * (heat float); the projection derives the HeatBucket from them, never forwarding the raw float (R2.2). Empty for
   * a district with no buildings (the organic Phase-1 shape — the buildings table is empty).
   */
  async listBuildingsForDistrict(playerId: string, districtId: number): Promise<BuildingHeatState[]> {
    return this.repo.listBuildingsForDistrict(playerId, districtId);
  }

  /** C3 (D7) — passthrough to `HeatRepository.listBuildingsForRanking` (see that method's own header):
   *  the `rankByTypeAndBlock` INPUT, unfiltered by operational status (unlike `listBuildingsForDistrict`
   *  above), so a building's rank never drifts between the heat overlay and the building-card/interior. */
  async listBuildingsForRanking(playerId: string, districtId: number): Promise<RankableBuildingInput[]> {
    return this.repo.listBuildingsForRanking(playerId, districtId);
  }

  /**
   * READ-ONLY cross-system accessor — the qualitative PEAK HeatBucket for a district (the band consumers like
   * System 3/4 read for the player-facing surface; Inv 7). Returns the in-memory aggregate (rebuilt each tick), or
   * COLD if the district has not ticked (no buildings). The internal float NEVER escapes (R2.2 — band only).
   */
  getDistrictPeakBucket(playerId: string, districtId: number): HeatBucket {
    return this.players.get(playerId)?.districtBucket.get(districtId) ?? 'COLD';
  }

  /** READ-ONLY — whether a district escalated on the last tick (a building ≥ threshold — the HeatEscalation flag). */
  isDistrictEscalated(playerId: string, districtId: number): boolean {
    return this.players.get(playerId)?.districtEscalated.get(districtId) ?? false;
  }

  /** READ-ONLY — the citywide PEAK HeatBucket aggregate (Inv 7 — qualitative, never a float sum). */
  getCitywideBucket(playerId: string): HeatBucket {
    return this.players.get(playerId)?.citywideBucket ?? 'COLD';
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 422). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= heatTunables.districtCount;
  }
}
